// 确定性工具：全库 seeded，禁 Math.random / Date / 网络。
// 惯例借鉴 huashu-art-motion (MIT) scripts/engine 的 U 工具面，TSX 重写。
export type Ctx = CanvasRenderingContext2D;

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/** 0..1 缓入缓出（原片 borderPhase 的 ease 同族） */
export const easeInOut = (t: number): number => {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
};
export const smooth = (t: number): number => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
/** 确定性伪随机（mulberry32），同 seed 同序列 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** 确定性单值散列（不建生成器时用） */
export const hash1 = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
};
export const hex = (s: string): [number, number, number] => [
  parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16),
];
export const mix3 = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [
  lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t),
];
export const rgb = (c: [number, number, number]): string => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
/** Catmull-Rom 平滑闭合近似（供轮廓控制点连成柔和形体） */
export function spline(g: Ctx, pts: Array<[number, number]>, close = true): void {
  if (pts.length < 3) return;
  const at = (i: number): [number, number] => pts[close ? (i + pts.length) % pts.length : clamp(i, 0, pts.length - 1)];
  g.moveTo(at(0)[0], at(0)[1]);
  for (let i = 0; i < (close ? pts.length : pts.length - 1); i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    g.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
      p2[0], p2[1],
    );
  }
  if (close) g.closePath();
}
