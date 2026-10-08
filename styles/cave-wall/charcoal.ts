// 签名②⑥：「颜料吃进岩石」炭笔体系 + 炭笔沸腾。
// 技法借鉴 huashu-art-motion references/风格配方/01_cave.md 与 scenes/01_cave.js（MIT, alchaincyf），TS 重写。
// 统一画法 shape()：fuzz 图案（稀疏炭点，宽 2lw+7）→ ink 图案（炭黑 + 7% 孔洞 + 噪声>0.58 大孔，宽 2lw）→ 平涂盖内半圈；
// 沸腾：两张 256 图案每 1/9s pattern.setTransform 随机平移一次——几何不动、颗粒在跳，比抖动路径省且不变形。
// 填色一律不透明平涂（靠岩面贴图「脏」掉），禁 multiply 叠颜料——白垩会被吃掉。
import {PAL, type CanvasCtx, type Pt} from './types';
import {boilSeed, hash2, mulberry32, vnoise} from './noise';

let INK_T: HTMLCanvasElement | null = null;
function inkTile(): HTMLCanvasElement {
  if (INK_T) return INK_T;
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  const g = cv.getContext('2d')!;
  const img = g.createImageData(S, S);
  const d = img.data;
  const r = mulberry32(91);
  for (let i = 0; i < S * S; i++) {
    const x = i % S, y = (i / S) | 0;
    const n = vnoise(x * 0.09, y * 0.09, 5) * 0.5 + vnoise(x * 0.3 + 9, y * 0.3, 6) * 0.5;
    const hole = r() < 0.07 || n > 0.58;
    d[i * 4] = 33; d[i * 4 + 1] = 21; d[i * 4 + 2] = 13;
    d[i * 4 + 3] = hole ? 255 * r() * 0.35 : 225 + r() * 30;
  }
  g.putImageData(img, 0, 0);
  INK_T = cv;
  return cv;
}

let FUZZ_T: HTMLCanvasElement | null = null;
function fuzzTile(): HTMLCanvasElement {
  if (FUZZ_T) return FUZZ_T;
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  const g = cv.getContext('2d')!;
  const r = mulberry32(57);
  g.fillStyle = PAL.ink;
  for (let i = 0; i < 2600; i++) {
    g.globalAlpha = 0.35 + r() * 0.6;
    g.beginPath();
    g.arc(r() * S, r() * S, 0.7 + r() * 1.5, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  FUZZ_T = cv;
  return cv;
}

const PATS = new WeakMap<CanvasRenderingContext2D, {fuzz: CanvasPattern; ink: CanvasPattern}>();

function patterns(g: CanvasCtx, f: number): {fuzz: CanvasPattern; ink: CanvasPattern} {
  let p = PATS.get(g);
  if (!p) {
    p = {fuzz: g.createPattern(fuzzTile(), 'repeat')!, ink: g.createPattern(inkTile(), 'repeat')!};
    PATS.set(g, p);
  }
  const b = boilSeed(f);
  const rf = mulberry32(b * 13 + 5), ri = mulberry32(b * 7 + 3);
  p.fuzz.setTransform(new DOMMatrix().translate(((rf() * 256) | 0), ((rf() * 256) | 0)));
  p.ink.setTransform(new DOMMatrix().translate(((ri() * 256) | 0), ((ri() * 256) | 0)));
  return p;
}

/** 颜料图形统一画法：fuzz 毛边 → ink 实心 → 平涂（盖住描边内半圈）。 */
export function shape(g: CanvasCtx, path: Path2D, fill: string | null, lw: number, f: number, alpha = 1): void {
  if (lw > 0) {
    const p = patterns(g, f);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.strokeStyle = p.fuzz;
    g.lineWidth = lw * 2 + 7;
    g.stroke(path);
    g.strokeStyle = p.ink;
    g.lineWidth = lw * 2;
    g.stroke(path);
  }
  if (fill) {
    g.globalAlpha = alpha;
    g.fillStyle = fill;
    g.fill(path);
    g.globalAlpha = 1;
  }
}

/** 炭线：宽线先垫 fuzz 毛边再 ink 实心。 */
export function inkLine(g: CanvasCtx, path: Path2D, lw: number, f: number): void {
  const p = patterns(g, f);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  if (lw > 3.5) {
    g.strokeStyle = p.fuzz;
    g.lineWidth = lw + 5;
    g.stroke(path);
  }
  g.strokeStyle = p.ink;
  g.lineWidth = lw;
  g.stroke(path);
}

/** 折线 → Path2D。 */
export function poly(pts: Pt[], closed = true): Path2D {
  const p = new Path2D();
  pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])));
  if (closed) p.closePath();
  return p;
}

/** Catmull-Rom 平滑 → Path2D（均匀参数化，端点钳制）。 */
export function spline(pts: Pt[], closed = true): Path2D {
  const n = pts.length;
  if (n < 3) return poly(pts, closed);
  const p = new Path2D();
  const at = (i: number): Pt => (closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  p.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    p.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
      p2[0], p2[1],
    );
  }
  if (closed) p.closePath();
  return p;
}

/** 高斯喷雾（手印喷绘/吹颜料/红点共用）：中心密外围疏的 alpha 点云。 */
export function spray(
  g: CanvasCtx, cx: number, cy: number, sigma: number, n: number, col: string, seed: number,
  rmin = 0.8, rmax = 3.2, amin = 0.25, amax = 0.75,
): void {
  const r = mulberry32(seed);
  g.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const rr = Math.sqrt(-2 * Math.log(1 - r() * 0.999)) * sigma;
    g.globalAlpha = amin + r() * (amax - amin);
    g.beginPath();
    g.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, rmin + r() * (rmax - rmin), 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
}

/** 定向喷锥（吹颜料）：from 嘴 to 壁，沿锥轴高斯散布。 */
export function sprayCone(
  g: CanvasCtx, from: Pt, to: Pt, spread: number, n: number, col: string, seed: number, k = 1,
): void {
  const r = mulberry32(seed);
  const dx = to[0] - from[0], dy = to[1] - from[1];
  const len = Math.hypot(dx, dy);
  const ax = dx / len, ay = dy / len;
  g.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const q = r(); // 沿锥轴分布（靠出口密）
    const d = len * q;
    const off = (r() - 0.5) * 2 * spread * (0.25 + q) * k;
    const px = from[0] + ax * d - ay * off, py = from[1] + ay * d + ax * off;
    g.globalAlpha = (0.12 + 0.5 * (1 - q)) * (0.35 + r() * 0.65) * k;
    g.beginPath();
    g.arc(px, py, 0.8 + r() * 2.4, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
}

/** 喷冲击绽开（手印拍壁瞬间）：环带 + 外溅点。 */
export function sprayBurst(g: CanvasCtx, x: number, y: number, seed: number, k: number): void {
  const r = mulberry32(seed);
  g.fillStyle = '#8e2a1a';
  const n = Math.round(140 * k);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const rr = 26 + r() * 70 * k;
    g.globalAlpha = 0.5 * (1 - rr / (96 * k + 26));
    g.beginPath();
    g.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.85, 1 + r() * 2.6, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
}

/** 手绘抖动：折线降采样后加大幅确定性位移（人形原始感专用，静态 seed——几何不动）。 */
export function roughPts(pts: Pt[], seed: number, amp: number): Pt[] {
  return pts.map(([x, y], i) => [
    x + (hash2(i * 7 + 1, seed, 901) - 0.5) * 2 * amp,
    y + (hash2(i * 7 + 2, seed, 902) - 0.5) * 2 * amp,
  ]);
}
