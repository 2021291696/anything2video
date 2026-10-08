// 种子随机与值噪声 —— shadow-play。全库确定性：mulberry32 + 格点整数哈希，禁 Math.random/Date/网络。
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 2D 格点整数哈希 → [0,1)。刻纹抖动/布纹用（与渲染顺序无关，可 seek）。 */
export function hash2(x: number, y: number, seed: number): number {
  let h = seed >>> 0;
  h = Math.imul(h ^ Math.imul(x | 0, 0x9e3779b1), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h ^ Math.imul(y | 0, 0xc2b2ae35), 0x27d4eb2d);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function clamp(v: number, lo = 0, hi = 1): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

const sm = (t: number): number => t * t * (3 - 2 * t);

/** 时间维平滑噪声（灯焰/漂移），返回 [-1,1]，seed 分通道。 */
export function tnoise(t: number, seed: number): number {
  const i = Math.floor(t), u = sm(t - i);
  const a = hash2(i, seed, 777) * 2 - 1, b = hash2(i + 1, seed, 777) * 2 - 1;
  return a + (b - a) * u;
}

/** 步进时基：把连续秒量化到 fps（皮影操纵 10fps / 灯焰 15fps / 翅扇 12fps 各自锁死）。 */
export function stepT(t: number, fps: number): number {
  return Math.floor(t * fps) / fps;
}

/** 平滑 0→1（smoothstep）。 */
export function ease(p: number): number {
  return sm(clamp(p));
}
