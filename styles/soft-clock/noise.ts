// 确定性工具：seeded PRNG / 缓动 / 整数格点哈希。禁 Math.random / Date / 网络。
// 纪律（§5.1 闭包排查项）：mulberry32 每次调用在函数体内新建实例（同种子同序列），
// 不允许把生成器状态存在模块级闭包里跨帧复用（会让随机序列退化为常数）。
export const clamp = (x: number, a = 0, b = 1): number => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** mulberry32：32 位种子 → [0,1) 序列。 */
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

/** 两整数格点 → [0,1) 哈希（每格独立取数，不吃顺序流）。 */
export function hash2(i: number, j: number, seed = 0): number {
  let h = (Math.imul(i | 0, 374761393) ^ Math.imul(j | 0, 668265263) ^ Math.imul(seed | 0, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export const ease = {
  inOut: (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  out: (t: number): number => 1 - Math.pow(1 - t, 3),
};

/** 区间分段：p 落在 [a,b] 内的归一化进度。 */
export const seg = (p: number, a: number, b: number): number => clamp((p - a) / (b - a));
