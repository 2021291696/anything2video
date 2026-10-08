// 核心图元：体积填色 vol / 静态层缓存 cached / 颗粒 grain / 剪切仿射长影子 castShadow / 软钟 softMap+softClock。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）references/风格配方/23_dali.md 与
// scripts/engine/lib/render.js P.vol/P.castShadow、scenes/23_dali.js softMap/softClock
// （MIT）——机制与参数级借鉴，Remotion(React+TSX)+Canvas2D 重写，几何按 1280×720 重设计，零整段拷贝。
import {CLOCK, SHADOW_CLIP_Y, W, H, type CanvasCtx} from './types';
import {mulberry32, clamp} from './noise';

const cacheStore = new Map<string, HTMLCanvasElement>();

/** 静态层缓存：同名只画一次（底版拆层纪律——影子必须夹在 bg 与前景层之间）。 */
export function cached(key: string, draw: (g: CanvasCtx) => void): HTMLCanvasElement {
  let cv = cacheStore.get(key);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const g = cv.getContext('2d')!;
    draw(g);
    cacheStore.set(key, cv);
  }
  return cv;
}

/** 复用型草稿层（每帧 clear 重画）。 */
const scratchStore = new Map<string, HTMLCanvasElement>();
function scratch(key: string): HTMLCanvasElement {
  let cv = scratchStore.get(key);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    scratchStore.set(key, cv);
  }
  return cv;
}

/** 画布颗粒（一次性生成，seeded）。 */
export function grain(key: string, alpha: number, tint: [number, number, number], strength: number): HTMLCanvasElement {
  return cached(`grain:${key}:${alpha}:${strength}`, (g) => {
    const r = mulberry32(20261110);
    const img = g.createImageData(W, H);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (r() - 0.5) * 2;
      img.data[i] = clamp(tint[0] + n * 60, 0, 255);
      img.data[i + 1] = clamp(tint[1] + n * 45, 0, 255);
      img.data[i + 2] = clamp(tint[2] + n * 30, 0, 255);
      img.data[i + 3] = Math.round(alpha * 255 * (0.4 + 0.6 * r()));
    }
    g.putImageData(img, 0, 0);
    void strength;
  });
}

/**
 * 体积填色：线性渐变填充＋clip 内 shadowBlur 描一圈暗边（内阴影）。
 * 全片无勾线——学院派的圆润感全靠这个（签名②）。
 */
export function vol(c: CanvasCtx, path: Path2D, x0: number, y0: number, x1: number, y1: number,
  a: string, b: string, occl = 'rgba(40,20,10,.45)', blur = 14): void {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  c.fillStyle = g;
  c.fill(path);
  if (occl) {
    c.save();
    c.clip(path);
    c.shadowColor = occl;
    c.shadowBlur = blur;
    c.strokeStyle = occl;
    c.lineWidth = blur * 0.6;
    c.stroke(path);
    c.restore();
  }
}

/**
 * 剪切仿射长影子（签名③）：剪影用 setTransform(1,0,−kx,ky,kx·yg,yg(1−ky)) 投到地面。
 * y′=yg−ky·(yg−y)：太阳在左前方低空，影子往右后方躺（ky>0 往观众投会被画框底边吃掉——配方坑）；
 * kx 变大 = 影子变长（下午时间流逝旋钮）。剪影先进离屏纯黑再整体 α0.55 blur1.5 叠，重叠处不加深；
 * clip 只留地面。
 */
export function castShadow(c: CanvasCtx, layers: Array<[yg: number, fn: (g: CanvasCtx) => void]>,
  opt: {kx: number; ky?: number; clipY?: number; alpha?: number; blur?: number}): void {
  const {kx, ky = 0.22, clipY = SHADOW_CLIP_Y, alpha = 0.55, blur = 1.5} = opt;
  const S = scratch('castShadow');
  const g = S.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#000';
  g.strokeStyle = '#000';
  for (const [yg, fn] of layers) {
    g.setTransform(1, 0, -kx, ky, kx * yg, yg * (1 - ky));
    fn(g);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  c.save();
  c.beginPath();
  c.rect(0, clipY, W, H - clipY);
  c.clip();
  c.globalAlpha = alpha;
  c.filter = `blur(${blur}px)`;
  c.drawImage(S, 0, 0);
  c.restore();
}

// ---------- 软钟（签名①）：圆盘局部坐标 (u,v)∈半径 R → 屏幕 ----------
export type SoftOpts = {cx: number; cy: number; R: number; fold: number; top?: number; flare?: number; drip?: number};

/**
 * softMap 参数化映射：v≤fold 躺在台面上（y 压缩到 top≈0.28-0.32）；
 * v>fold 垂下——flare=−0.12 让垂下部分像软布一样往外摊开（下缘圆而不是尖；正值会收成冰淇淋筒），
 * 叠加中央高斯下垂（随 sag 加深）＋sin 波纹（带 t 相位：sag 到 1.4 后仍持续在淌，定帧微动效的底料）。
 * 外框/刻度/指针/高光全部走同一映射。
 */
export function softMap(o: SoftOpts, sag: number, t = 0): (u: number, v: number) => [number, number] {
  const {cx, cy, R, fold, top = 0.32, flare = -0.12, drip = 0.18} = o;
  const sagLive = sag * (1 + 0.05 * Math.sin(t * 2.1));
  return (u: number, v: number): [number, number] => {
    if (v <= fold) return [cx + u, cy + v * top + Math.sin(u * 0.05 + t * 0.9) * 2];
    const d = v - fold;
    const q = d / R;
    return [
      cx + u * (1 - flare * q) + Math.sin(q * 3 + t * 1.3) * 5 * sagLive,
      cy + fold * top + d * (0.62 + 0.3 * sagLive)
        + sagLive * R * drip * Math.exp(-Math.pow((u + R * 0.2) / (R * 0.6), 2)) * q * q
        + Math.sin(u * 0.06 + 1) * 6 * q,
    ];
  };
}

function softPath(pts: Array<[number, number]>): Path2D {
  const p = new Path2D();
  pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])));
  p.closePath();
  return p;
}

/** 软钟绘制：外环/表盘/12 刻度/双指针/折线高光全走 softMap 同一映射；sag 驱动下垂深度与波纹幅度。 */
export function softClock(c: CanvasCtx, o: SoftOpts, sag: number, t: number, handSpeed: number): void {
  const m = softMap(o, sag, t);
  const R = o.R;
  const TAU = Math.PI * 2;
  const ring = (r: number): Array<[number, number]> => {
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= 120; i++) {
      const a = (i / 120) * TAU;
      pts.push(m(Math.cos(a) * r, Math.sin(a) * r));
    }
    return pts;
  };
  const outer = softPath(ring(R));
  const inner = softPath(ring(R * 0.86));
  // 贴表面的软投影
  c.save();
  c.translate(-5, 7);
  c.fillStyle = CLOCK.drop;
  c.filter = 'blur(4px)';
  c.fill(outer);
  c.restore();
  vol(c, outer, o.cx - R, 0, o.cx + R, 0, CLOCK.gold, CLOCK.goldD, CLOCK.edge, 6);
  const fg = c.createLinearGradient(0, o.cy - R * 0.3, 0, o.cy + R * 1.4);
  fg.addColorStop(0, CLOCK.dial);
  fg.addColorStop(0.45, CLOCK.dialM);
  fg.addColorStop(1, CLOCK.dialD);
  c.fillStyle = fg;
  c.fill(inner);
  // 12 个刻度：同一映射
  c.strokeStyle = CLOCK.tick;
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU - Math.PI / 2;
    const p0 = m(Math.cos(a) * R * 0.74, Math.sin(a) * R * 0.74);
    const p1 = m(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8);
    c.lineWidth = k % 3 ? 1.4 : 2.6;
    c.beginPath();
    c.moveTo(p0[0], p0[1]);
    c.lineTo(p1[0], p1[1]);
    c.stroke();
  }
  // 指针：沿映射采样成软线（转速各异 4.5-6.5 rad/s，负值倒走）
  const hand = (ang: number, len: number, w: number): void => {
    c.lineWidth = w;
    c.lineCap = 'round';
    c.beginPath();
    for (let i = 0; i <= 12; i++) {
      const r = (len * i) / 12;
      const q = m(Math.cos(ang) * r, Math.sin(ang) * r);
      if (i) c.lineTo(q[0], q[1]);
      else c.moveTo(q[0], q[1]);
    }
    c.stroke();
  };
  c.strokeStyle = CLOCK.hand;
  hand(t * handSpeed - 1.2, R * 0.66, 2.6);
  hand((t * handSpeed) / 12 + 0.6, R * 0.46, 4);
  const cc = m(0, 0);
  c.fillStyle = CLOCK.hand;
  c.beginPath();
  c.arc(cc[0], cc[1], 2.6, 0, TAU);
  c.fill();
  // 折线上的高光（柔软的「棱」）
  c.strokeStyle = CLOCK.hi;
  c.lineWidth = 2;
  c.beginPath();
  for (let i = 0; i <= 30; i++) {
    const u = -R * 0.9 + (i / 30) * R * 1.8;
    const q = m(u, o.fold + 2);
    if (i) c.lineTo(q[0], q[1]);
    else c.moveTo(q[0], q[1]);
  }
  c.stroke();
}

/** 结尾定帧微动效：钟面同心波纹（采样过 softMap，涟漪贴着软化几何走）。 */
export function faceRipple(c: CanvasCtx, o: SoftOpts, sag: number, f: number, from: number): void {
  const m = softMap(o, sag);
  const TAU = Math.PI * 2;
  for (let k = 0; k < 2; k++) {
    const ph = ((f - from) / 45 + k * 0.5) % 1;
    if (ph < 0) continue;
    const r = o.R * (0.18 + 0.52 * ph);
    c.strokeStyle = `rgba(58,42,24,${0.2 * (1 - ph)})`;
    c.lineWidth = 1.2;
    c.beginPath();
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * TAU;
      const q = m(Math.cos(a) * r, Math.sin(a) * r);
      if (i) c.lineTo(q[0], q[1]);
      else c.moveTo(q[0], q[1]);
    }
    c.stroke();
  }
}
