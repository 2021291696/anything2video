// 水彩渲染引擎 —— watercolor-cel 核心图元（战役 v4 批次④）。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）lib/brush.js 的 P.deform/P.watercolor/P.cel/P.textureInside
// 与 references/风格配方/25_ghibli.md：机制与参数级借鉴，Remotion(Canvas2D+TSX) 惯用法重写，零整段拷贝。
// ① deform：中点位移——每轮每边中点沿法向推一个近似高斯量（3 均匀数相加-1.5）×min(1,len/80)，每轮 amp×0.6。
// ② wash：先 deform 3 轮得基形；每层再 deform 2 轮，multiply 低 α 填色（透明颜料叠色）＋ α=edge 描 1.6px 同色边
//    =颜料边缘沉积的「水痕边」。常用参数：大墙 layers5 α.4 amp12／色晕 layers3 α.045 amp40／木板 layers3 α.5 amp3 edge.14；
//    不透明白（窗框/云）blend 'source-over' α0.9+。坑：色晕 α 超 .05×3 层=发霉羊皮纸；矩形拼墙出硬接缝（暗部用 amp60 大变形多边形）。
// ③ cel：赛璐璐两调——填阴影色→clip 内朝光平移 (−dx,−dy) 填基色→剩背光月牙→2.4px 暖褐线。
// ④ textureInside：角色画进离屏 L，纹理层（纸纹＋色晕）destination-in 角色剪影→multiply 叠回——
//    赛璐璐平涂变「水彩填色」（INDEX 短板「背景像了人物不像」的通用解；source-atop 会盖纸色发白，禁用）。
import type {CanvasCtx, Pt} from './types';
import {mulberry32, hash2, fbm, clamp} from './noise';

/** 中点位移变形：返回新点列（约为输入 2^depth 倍点数）。 */
export function deform(pts: Pt[], depth: number, amp: number, rand: () => number): Pt[] {
  let cur: Pt[] = pts.map((p) => [p[0], p[1]] as Pt);
  let a = amp;
  for (let d = 0; d < depth; d++) {
    const out: Pt[] = [];
    for (let i = 0; i < cur.length; i++) {
      const p = cur[i], q = cur[(i + 1) % cur.length];
      const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
      const ex = q[0] - p[0], ey = q[1] - p[1];
      const len = Math.hypot(ex, ey) || 1;
      const g = (rand() + rand() + rand() - 1.5) * (2 / 3); // 近似高斯，约 [-1,1]
      const push = g * Math.min(1, len / 80) * a;
      out.push([p[0], p[1]], [mx - (ey / len) * push, my + (ex / len) * push]);
    }
    cur = out;
    a *= 0.6;
  }
  return cur;
}

export function pathPts(c: CanvasCtx, pts: Pt[]): void {
  c.beginPath();
  pts.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
  c.closePath();
}

export function rectPts(x: number, y: number, w: number, h: number): Pt[] {
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
}

export function ellipsePts(x: number, y: number, rx: number, ry: number, n: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]);
  }
  return pts;
}

export type WashOpts = {
  layers?: number;
  alpha?: number;
  amp?: number;
  seed?: number;
  edge?: number;
  blend?: GlobalCompositeOperation;
  fill?: string | CanvasGradient;
};

/** 水彩洗染：多层低 α 叠色 + 水痕边。固定种子 → 边缘不沸腾（逐帧确定性）。 */
export function wash(c: CanvasCtx, pts: Pt[], color: string, o: WashOpts = {}): void {
  const {layers = 3, alpha = 0.3, amp = 8, seed = 1, edge = 0.15, blend = 'multiply', fill} = o;
  const base = deform(pts, 3, amp, mulberry32(seed));
  const r = mulberry32(seed + 977);
  c.save();
  c.globalCompositeOperation = blend;
  for (let i = 0; i < layers; i++) {
    const layer = deform(base, 2, amp * 0.55, r);
    pathPts(c, layer);
    c.globalAlpha = alpha;
    c.fillStyle = fill ?? color;
    c.fill();
    if (edge > 0) {
      c.globalAlpha = edge;
      c.strokeStyle = color;
      c.lineWidth = 1.6;
      c.lineJoin = 'round';
      c.stroke();
    }
  }
  c.restore();
}

// ---------- 离屏缓存（跨帧复用；内容由种子决定，逐帧确定性不变） ----------
const POOL = new Map<string, HTMLCanvasElement>();

export function scratch(key: string, w: number, h: number): HTMLCanvasElement {
  let cv = POOL.get(key);
  if (!cv || cv.width !== w || cv.height !== h) {
    cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    POOL.set(key, cv);
  }
  return cv;
}

export function cached(key: string, w: number, h: number, draw: (g: CanvasCtx) => void): HTMLCanvasElement {
  const hit = POOL.get(`C:${key}`);
  if (hit) return hit;
  const cv = scratch(key, w, h);
  const g = cv.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, w, h);
  draw(g);
  POOL.set(`C:${key}`, cv);
  return cv;
}

/** 纸纹颗粒：低频 fbm 起伏 + 高频 grain 麻点，基色上做 ±amt 明度扰动（半分辨率生成，画时放大）。 */
export function paperTex(key: string, w: number, h: number, base: string, o: {scale: number; amt: number; grain: number; seed: number}): HTMLCanvasElement {
  return cached(`P:${key}:${w}x${h}`, w, h, (g) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const img = g.getImageData(0, 0, w, h);
    const d = img.data;
    const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(base);
    if (!m) return;
    const br = parseInt(m[1], 16), bg = parseInt(m[2], 16), bb = parseInt(m[3], 16);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = (fbm(x * o.scale, y * o.scale, 3, o.seed) + 1) / 2;
        const gr = hash2(x, y, o.seed + 91) - 0.5;
        const dlt = (n - 0.5) * o.amt + gr * o.grain;
        const i = (y * w + x) * 4;
        d[i] = clamp(br + dlt, 0, 255);
        d[i + 1] = clamp(bg + dlt, 0, 255);
        d[i + 2] = clamp(bb + dlt, 0, 255);
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  });
}

/** 赛璐璐两调：阴影色打底 → clip 内朝光平移填基色（剩背光月牙）→ 暖褐细线（lw=0 关线）。 */
export function cel(c: CanvasCtx, path: Path2D, base: string, shade: string, lineColor: string, lw: number, dx = 9, dy = 6): void {
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.fillStyle = shade;
  c.fill(path);
  c.save();
  c.clip(path);
  c.translate(-dx, -dy);
  c.fillStyle = base;
  c.fill(path);
  c.restore();
  if (lw > 0) {
    c.strokeStyle = lineColor;
    c.lineWidth = lw;
    c.stroke(path);
  }
}

/**
 * 角色水彩化：纹理层（纸纹 + 色晕）destination-in 角色剪影 → multiply 叠回主画布。
 * decorate 在纹理层上作画（globalAlpha 自理）。只乘在角色上——纸上别处不受影响。
 */
export function textureInside(c: CanvasCtx, charLayer: HTMLCanvasElement, key: string, decorate: (g: CanvasCtx) => void): void {
  const m = scratch(key, charLayer.width, charLayer.height);
  const g = m.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.clearRect(0, 0, m.width, m.height);
  decorate(g);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(charLayer, 0, 0);
  c.save();
  c.globalCompositeOperation = 'multiply';
  c.drawImage(m, 0, 0);
  c.restore();
}

/** 3 点二次贝塞尔平滑闭合（发梢/飘带/尾巴软形）。 */
export function smoothPath(points: Pt[]): Path2D {
  const p = new Path2D();
  const n = points.length;
  if (n < 3) {
    points.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])));
    p.closePath();
    return p;
  }
  p.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < n - 1; i++) {
    const a = points[i], b = points[i + 1];
    p.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  }
  const last = points[n - 1], first = points[0];
  p.quadraticCurveTo(last[0], last[1], (last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
  p.closePath();
  return p;
}
