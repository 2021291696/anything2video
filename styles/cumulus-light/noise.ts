// 种子随机与缓动 —— cumulus-light。全库确定性：mulberry32 + 格点整数哈希，禁 Math.random/Date/网络。
// 纪律（samples-v4 §5.1 排查项）：mulberry32 只在模块加载期消费一次（静态布局），
// 帧内变化一律走 sin/hash2——闭包内逐帧取序列会退化为常数。
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 2D 格点整数哈希 → [0,1)。粒子相位/闪烁用（与渲染顺序无关，可 seek）。 */
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

export function easeOutCubic(t: number): number {
  const u = clamp(t);
  return 1 - Math.pow(1 - u, 3);
}

export function smoothstep(t: number): number {
  const u = clamp(t);
  return u * u * (3 - 2 * u);
}

/** 钟形窗（0→1→0）：段内事件（英雄光楔/风阵）的包络。 */
export function bell(t: number, from: number, to: number): number {
  if (t <= from || t >= to) return 0;
  const u = (t - from) / (to - from);
  return Math.sin(u * Math.PI);
}
