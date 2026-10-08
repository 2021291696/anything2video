// 种子随机与值噪声 —— cave-wall。全库确定性：mulberry32 + 格点整数哈希，禁 Math.random/Date/网络。
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 2D 格点整数哈希 → [0,1)。逐像素颗粒/抖动用（与渲染顺序无关，可 seek）。 */
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

/** 2D 值噪声，返回 [-1,1]。 */
export function vnoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const u = sm(x - xi), v = sm(y - yi);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}

/** 分形布朗运动（值噪声叠加），返回约 [-1,1]。oct 逐倍频程，相邻频种不同防轴向锁相。 */
export function fbm(x: number, y: number, oct: number, seed = 0): number {
  let s = 0, amp = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    s += vnoise(x, y, seed + i * 131) * amp;
    norm += amp;
    amp *= 0.5;
    x = x * 2.03 + 17.3;
    y = y * 1.97 + 9.1;
  }
  return s / norm;
}

/** 时间维噪声（火光摇曳/余烬闪烁）：一维平滑噪声，seed 分通道。 */
export function tnoise(t: number, seed: number): number {
  const i = Math.floor(t), u = sm(t - i);
  const a = hash2(i, seed, 777) * 2 - 1, b = hash2(i + 1, seed, 777) * 2 - 1;
  return a + (b - a) * u;
}

/** 炭笔沸腾节拍：9fps 换种子（每 1/9s 图案整体平移一次，几何不动颗粒在跳）。 */
export function boilSeed(f: number): number {
  return Math.floor(((f - 1) * 9) / 30);
}
