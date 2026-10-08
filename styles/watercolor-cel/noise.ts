// 种子随机与值噪声 —— watercolor-cel。全库确定性：mulberry32 + 格点整数哈希，禁 Math.random/Date/网络。
// mulberry32 一律在消费函数体内按种子重建（无闭包状态累积——CAMPAIGN-4 §5.1 跨工程 PRNG 排查项）。
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 2D 格点整数哈希 → [0,1)。逐像素颗粒/粒子相位用（与渲染顺序无关，可 seek）。 */
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

export function smoothstep(t: number): number {
  const u = clamp(t);
  return u * u * (3 - 2 * u);
}

export function easeOutCubic(t: number): number {
  const u = clamp(t);
  return 1 - Math.pow(1 - u, 3);
}

export function bump(t: number): number {
  // 中心 0.5、两端 0 的钟形包络（hero 光斑全开窗用）。
  const u = clamp(t);
  return Math.sin(Math.PI * u) ** 1.5;
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

/** 分形布朗运动（值噪声叠加），返回约 [-1,1]。 */
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

/** 单维时间平滑噪声（komorebi 漂移/热气摆），seed 分通道，返回约 [-1,1]。 */
export function tnoise(t: number, seed: number): number {
  const i = Math.floor(t), u = sm(t - i);
  const a = hash2(i, seed, 777) * 2 - 1, b = hash2(i + 1, seed, 777) * 2 - 1;
  return a + (b - a) * u;
}
