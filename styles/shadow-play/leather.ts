// 皮件体系 —— shadow-play 签名①②⑥⑧的机制本体。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）references/风格配方/34_shadowpuppet.md 与
// scripts/engine/scenes/34_shadowpuppet.js 的 P.carve/P.piece/P.stamp 机制与参数——
// Remotion(React+TSX)+Canvas2D 惯用法重写，零整段拷贝。
//
// 性能纪律（INDEX 短板「每皮件单独离屏 121ms 偏慢」的修正）：
//   ① 每块皮件（形状+刻纹不变）只预渲一次成 sprite（刻纹/镂空=alpha 洞），逐帧仅 drawImage+变换；
//   ② 每个活动主体合并到一张共享 scratch 层再整层 stamp——全帧 multiply 大合成 ≤4 次。
import {PAL, type CanvasCtx, type Pt} from './types';
import {hash2, clamp} from './noise';

// ---------- 几何 ----------

/** 平滑过点路径（中点二次贝塞尔）。 */
export function smooth(pts: Pt[]): Path2D {
  const p = new Path2D();
  if (pts.length < 2) return p;
  p.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    p.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  p.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  return p;
}

/** 锥形肢条（a→b，宽 w0→w1 的四点壳）。 */
export function taper(a: Pt, b: Pt, w0: number, w1: number): Path2D {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  const px = -dy / l, py = dx / l;
  return smooth([
    [a[0] + px * w0 / 2, a[1] + py * w0 / 2],
    [b[0] + px * w1 / 2, b[1] + py * w1 / 2],
    [b[0] - px * w1 / 2, b[1] - py * w1 / 2],
    [a[0] - px * w0 / 2, a[1] - py * w0 / 2],
  ]);
}

/** 绕点旋转（算铆钉/杆的屏上落点用）。 */
export function rotPt(p: Pt, o: Pt, a: number): Pt {
  const c = Math.cos(a), s = Math.sin(a), x = p[0] - o[0], y = p[1] - o[1];
  return [o[0] + x * c - y * s, o[1] + x * s + y * c];
}

// ---------- 皮件 sprite 缓存（签名①⑧） ----------

export type Sprite = {cv: HTMLCanvasElement; ax: number; ay: number};
const PAD = 16;
const SPRITES = new Map<string, Sprite>();
export const spriteCount = (): number => SPRITES.size;

/** 包围盒（本地坐标）。 */
export type BB = {x: number; y: number; w: number; h: number};

/**
 * 签名① 皮件管线：填色 → clip 内 destination-out 刻纹 → clip 内补皮边（2×edge 同色描边，防刻穿外轮廓）
 * → 深褐 2.6px 外轮廓。预渲成 alpha-sprite：刻纹/镂空区域即透光洞（白=镂空，签名⑧）。
 */
export function piece(key: string, path: Path2D, bb: BB, col: string, carve: ((g: CanvasCtx) => void) | null, edge = 5): Sprite {
  const hit = SPRITES.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(bb.w) + PAD * 2;
  cv.height = Math.ceil(bb.h) + PAD * 2;
  const g = cv.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, cv.width, cv.height);
  g.translate(PAD - bb.x, PAD - bb.y);
  g.fillStyle = col;
  g.fill(path);
  g.save();
  g.clip(path);
  if (carve) {
    g.save();
    g.globalCompositeOperation = 'destination-out';
    carve(g);
    g.restore();
  }
  g.lineWidth = edge * 2;
  g.strokeStyle = col;
  g.stroke(path);
  g.restore();
  g.lineWidth = 2.6;
  g.strokeStyle = PAL.edge;
  g.stroke(path);
  const sp: Sprite = {cv, ax: bb.x - PAD, ay: bb.y - PAD};
  SPRITES.set(key, sp);
  return sp;
}

/** 整块镂空（签名⑧「白=镂空」的刻法：整个子路径 destination-out，只留皮边）。 */
export function knockOut(g: CanvasCtx, path: Path2D): void {
  g.fill(path);
}

/** 自由绘制的预渲 sprite 逃生口（多步皮件如「空脸头」：刻→补边→五官一步到位），同样一次缓存。 */
export function sprite(key: string, bb: BB, draw: (g: CanvasCtx) => void): Sprite {
  const hit = SPRITES.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(bb.w) + PAD * 2;
  cv.height = Math.ceil(bb.h) + PAD * 2;
  const g = cv.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, cv.width, cv.height);
  g.translate(PAD - bb.x, PAD - bb.y);
  draw(g);
  const sp: Sprite = {cv, ax: bb.x - PAD, ay: bb.y - PAD};
  SPRITES.set(key, sp);
  return sp;
}

/** 把 sprite 画到当前变换下的层上（本地坐标轴对齐，绕关节旋转由外层 translate/rotate 完成）。 */
export function blit(g: CanvasCtx, sp: Sprite): void {
  g.drawImage(sp.cv, sp.ax, sp.ay);
}

// ---------- 刻纹库 K（签名②：鱼子/团花/云纹/方格/刻线，全部 destination-out 调用） ----------

/** 鱼子纹：错排小圆孔。 */
export function kDots(g: CanvasCtx, x0: number, y0: number, x1: number, y1: number, s = 16, r = 3, seed = 9): void {
  const cols = Math.max(1, Math.floor((x1 - x0) / s));
  const rows = Math.max(1, Math.floor((y1 - y0) / (s * 0.87)));
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const hx = hash2(i, j, seed), hy = hash2(i, j, seed + 31);
      const x = x0 + i * s + (j % 2 ? s / 2 : 0) + (hx - 0.5) * s * 0.4;
      const y = y0 + j * s * 0.87 + (hy - 0.5) * s * 0.3;
      if (x > x1 || y > y1) continue;
      g.beginPath();
      g.arc(x, y, r * (0.8 + hash2(i, j, seed + 7) * 0.4), 0, 7);
      g.fill();
    }
  }
}

/** 团花：n 瓣椭圆绕心。 */
export function kFlowers(g: CanvasCtx, x0: number, y0: number, x1: number, y1: number, s = 40, petals = 5, seed = 5): void {
  const cols = Math.max(1, Math.round((x1 - x0) / s));
  const rows = Math.max(1, Math.round((y1 - y0) / s));
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const cx = x0 + (cols ? (i / cols) * (x1 - x0) : 0), cy = y0 + (rows ? (j / rows) * (y1 - y0) : 0);
      const rr = s * (0.32 + hash2(i, j, seed) * 0.12);
      for (let k = 0; k < petals; k++) {
        const a = (k / petals) * Math.PI * 2 + hash2(i, j, seed + 3) * 0.4;
        g.beginPath();
        g.ellipse(cx + Math.cos(a) * rr * 0.62, cy + Math.sin(a) * rr * 0.62, rr * 0.46, rr * 0.28, a, 0, 7);
        g.fill();
      }
      g.beginPath();
      g.arc(cx, cy, rr * 0.24, 0, 7);
      g.fill();
    }
  }
}

/** 云纹：阿基米德小螺旋（线宽 3.4）。 */
export function kClouds(g: CanvasCtx, x0: number, y0: number, x1: number, y1: number, s = 30, seed = 3): void {
  const cols = Math.max(1, Math.round((x1 - x0) / s));
  const rows = Math.max(1, Math.round((y1 - y0) / s));
  g.lineWidth = 3.4;
  g.lineCap = 'round';
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const cx = x0 + (cols ? (i / cols) * (x1 - x0) : 0) + (hash2(i, j, seed) - 0.5) * s * 0.24;
      const cy = y0 + (rows ? (j / rows) * (y1 - y0) : 0) + (hash2(i, j, seed + 11) - 0.5) * s * 0.24;
      const turns = 2.2 + hash2(i, j, seed + 5) * 1.4;
      g.beginPath();
      for (let a = 0; a < turns * Math.PI * 2; a += 0.35) {
        const rr = 1.6 * a + 1.2;
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        if (a === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
  }
}

/** 方格（万字格底）。 */
export function kLattice(g: CanvasCtx, x0: number, y0: number, x1: number, y1: number, s = 30, w = 8): void {
  for (let x = x0; x <= x1; x += s) {
    g.fillRect(x - w / 2, y0, w, y1 - y0);
  }
  for (let y = y0; y <= y1; y += s) {
    g.fillRect(x0, y - w / 2, x1 - x0, w);
  }
}

/** 刻线（直线段组）。 */
export function kLines(g: CanvasCtx, segs: Array<[Pt, Pt]>, w = 4): void {
  g.lineWidth = w;
  g.lineCap = 'round';
  for (const [[ax, ay], [bx, by]] of segs) {
    g.beginPath();
    g.moveTo(ax, ay);
    g.lineTo(bx, by);
    g.stroke();
  }
}

// ---------- 印幕 stamp（签名⑥） ----------

/**
 * 签名⑥ 整层印幕：先 multiply α0.28 blur6 偏移 (dx,dy) 的虚影（皮没贴紧幕布），再 multiply 本体。
 * 透光 = 幕色×皮色；重叠皮件自然变深（布局纪律：重叠区避开视觉焦点）。
 */
export function stampLayer(c: CanvasCtx, cv: HTMLCanvasElement, dx = 7, dy = 5, alpha = 1): void {
  if (alpha <= 0.004) return;
  c.save();
  c.filter = 'blur(6px)';
  c.globalAlpha = 0.28 * alpha;
  c.globalCompositeOperation = 'multiply';
  c.drawImage(cv, dx, dy);
  c.restore();
  c.save();
  c.globalAlpha = alpha;
  c.globalCompositeOperation = 'multiply';
  c.drawImage(cv, 0, 0);
  c.restore();
}

// ---------- 铆钉与杆（签名③的操纵件） ----------

export function rivet(g: CanvasCtx, x: number, y: number, r = 7): void {
  g.fillStyle = PAL.rivet;
  g.beginPath();
  g.arc(x, y, r, 0, 7);
  g.fill();
  g.fillStyle = PAL.rivetLite;
  g.beginPath();
  g.arc(x - 1, y - 1, r * 0.42, 0, 7);
  g.fill();
}

/** 杆：幕后操纵杆，糊一点、multiply（从关节向下、向外走，禁横穿主体）。 */
export function rod(c: CanvasCtx, a: Pt, b: Pt): void {
  c.save();
  c.filter = 'blur(1.2px)';
  c.globalCompositeOperation = 'multiply';
  c.strokeStyle = 'rgba(60,30,12,0.85)';
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(a[0], a[1]);
  c.lineTo(b[0], b[1]);
  c.stroke();
  c.restore();
}

// ---------- 铰链链（签名⑦：4 节、鞭梢滞后） ----------

export type ChainSeg = {len: number; w0: number; w1: number; key: string; col: string};

/**
 * 签名⑦ 铰链链：每节相对上一节转 0.3·sin(7ts − 0.9i) + curl（i>0），鞭梢一节节滞后。
 * curl=0.38 为飘带锁死参数（下垂鞭捎）；上扬件（翎子）传负 curl 反向甩。
 * 节以「沿 +x 的直段」预渲 sprite（形状不变），逐帧只做 translate+rotate——角度变化不重刻纹。
 */
export function chain(g: CanvasCtx, ts: number, start: Pt, ang0: number, segs: ChainSeg[], curl = 0.38): Pt[] {
  let o = start, ang = ang0;
  const ends: Pt[] = [];
  for (let i = 0; i < segs.length; i++) {
    ang += 0.3 * Math.sin(7 * ts - 0.9 * i) + (i ? curl : 0);
    const s = segs[i];
    const wMax = Math.max(s.w0, s.w1);
    const sp = piece(s.key, taper([0, 0], [s.len, 0], s.w0, s.w1),
      {x: -4, y: -wMax / 2 - 4, w: s.len + 8, h: wMax + 8}, s.col, null, 3);
    g.save();
    g.translate(o[0], o[1]);
    g.rotate(ang);
    blit(g, sp);
    g.restore();
    const e: Pt = [o[0] + Math.cos(ang) * s.len, o[1] + Math.sin(ang) * s.len];
    ends.push(e);
    o = e;
  }
  return ends;
}
