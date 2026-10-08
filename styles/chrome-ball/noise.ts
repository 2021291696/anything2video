// chrome-ball 确定性数学底座（战役 v4 批次④）。
// 纪律：逐帧确定性——全部动画量由帧号 f 推出；随机只走 mulberry32/格点哈希，禁 Math.random/Date/网络。
import type {Pt} from './types';

export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/** smoothstep（过渡带）。 */
export const ss = (a: number, b: number, x: number): number => {
  const t = clamp((x - a) / (b - a || 1e-9), 0, 1);
  return t * t * (3 - 2 * t);
};
/** easeOutCubic（拍入落定）。 */
export const easeOut = (t: number): number => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

/** mulberry32 seeded PRNG（确定性）。 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 格点哈希（确定性值噪声底料）。 */
export function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/** 2D 值噪声（格点插值，用于线框毛刺/微抖动）。 */
export function noise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(
    lerp(hash2(xi, yi), hash2(xi + 1, yi), u),
    lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u),
    v,
  );
}

/** Catmull-Rom 平滑闭合/开放路径（短板修正：折线身体必须先平滑再上塑料着色，否则露出棱角）。 */
export function smoothPath(pts: Pt[], closed = true): Path2D {
  const p = new Path2D();
  const n = pts.length;
  if (n < 3) return p;
  const at = (i: number): Pt => {
    if (closed) return pts[(i + n) % n];
    return pts[clamp(i, 0, n - 1)];
  };
  p.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    p.bezierCurveTo(c1x, c1y, c2x, c2y, p2[0], p2[1]);
  }
  if (closed) p.closePath();
  return p;
}
