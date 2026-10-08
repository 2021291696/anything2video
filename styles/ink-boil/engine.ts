// 赛璐璐笔刷引擎移植自 mg-styles-15 demos/05-cel-boil (MIT, Vincentwei1021), TSX 重写。
// 全部纯函数：几何/噪声/沸腾位移只吃输入参数 + seed，同输入同输出（禁 Math.random/Date/网络）。

/** 点：[x, y] 或 [x, y, corner]（corner 真值 = 保角不圆滑） */
export type Pt = number[];

// ---------------------------------------------------------------- seeded randomness
export function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a 变体：任意数字串 -> [0,1) */
export function hs(...a: number[]): number {
  let h = 2166136261 >>> 0;
  for (const v of a) {
    h = Math.imul(h ^ ((Math.round(v * 997) | 0) >>> 0), 16777619) >>> 0;
    h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; h ^= h >>> 15;
  }
  return (h >>> 0) / 4294967296;
}
export const hr = (lo: number, hi: number, ...s: number[]): number => lo + (hi - lo) * hs(...s);

// ---------------------------------------------------------------- seeded 3D simplex noise
// 经典 simplex（Gustavson 算法），置换表由 mulberry32 洗出 —— boil 的世界噪声场。
export function makeNoise3D(seed: number): (x: number, y: number, z: number) => number {
  const rand = mulberry32(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  const perm = new Uint8Array(512);
  const permMod12 = new Uint8Array(512);
  for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; permMod12[i] = perm[i] % 12; }
  const G = [1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1];
  const F3 = 1 / 3, G3 = 1 / 6;
  const dot = (gi: number, x: number, y: number, z: number) => G[gi * 3] * x + G[gi * 3 + 1] * y + G[gi * 3 + 2] * z;
  return (xin: number, yin: number, zin: number): number => {
    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s), j = Math.floor(yin + s), k = Math.floor(zin + s);
    const t = (i + j + k) * G3;
    const x0 = xin - (i - t), y0 = yin - (j - t), z0 = zin - (k - t);
    let i1: number, j1: number, k1: number, i2: number, j2: number, k2: number;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }
    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;
    const ii = i & 255, jj = j & 255, kk = k & 255;
    const corn = (t0: number, gi: number, x: number, y: number, z: number) => {
      if (t0 < 0) return 0;
      const t2 = t0 * t0;
      return t2 * t2 * dot(gi, x, y, z);
    };
    const c0 = corn(0.6 - x0 * x0 - y0 * y0 - z0 * z0, permMod12[ii + perm[jj + perm[kk]]], x0, y0, z0);
    const c1 = corn(0.6 - x1 * x1 - y1 * y1 - z1 * z1, permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]], x1, y1, z1);
    const c2 = corn(0.6 - x2 * x2 - y2 * y2 - z2 * z2, permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]], x2, y2, z2);
    const c3 = corn(0.6 - x3 * x3 - y3 * y3 - z3 * z3, permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]], x3, y3, z3);
    return 32 * (c0 + c1 + c2 + c3);
  };
}
export const N3 = makeNoise3D(0x5eed1e);

/** 绘图尺度全局补偿（特写时保持「笔在纸上的大小」） */
export const GLOBAL = { ink: 1, amp: 1 };

// ---------------------------------------------------------------- math / easing
export const clamp = (x: number, a = 0, b = 1): number => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const inv = (a: number, b: number, x: number): number => clamp((x - a) / (b - a));
export const sstep = (a: number, b: number, x: number): number => { const t = inv(a, b, x); return t * t * (3 - 2 * t); };
export const E = {
  lin: (t: number) => t,
  in2: (t: number) => t * t,
  out2: (t: number) => 1 - (1 - t) * (1 - t),
  in3: (t: number) => t * t * t,
  out3: (t: number) => 1 - Math.pow(1 - t, 3),
  io2: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outBack: (t: number, s = 1.9) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
};
export type Key = [number, number, (keyof typeof E | ((u: number) => number) | undefined)?];
/** 分段关键帧插值；ease 作用于「到该关键点为止」的段 */
export function K(t: number, keys: Key[]): number {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      const u = (t - t0) / Math.max(1e-9, t1 - t0);
      const f = typeof e === 'function' ? e : E[e || 'io2'];
      return v0 + (v1 - v0) * f(u);
    }
  }
  return keys[keys.length - 1][1];
}

// ---------------------------------------------------------------- geometry
// 向心 Catmull-Rom；点 [x, y, corner?]：corner=1 时保角不圆滑
function crp(p0: number[], p1: number[], p2: number[], p3: number[], t: number): number[] {
  const d = (a: number[], b: number[]) => Math.hypot(b[0] - a[0], b[1] - a[1]) + 1e-4;
  const t0 = 0, t1 = d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
  const tt = t1 + (t2 - t1) * t;
  const L = (a: number[], b: number[], ta: number, tb: number) => {
    const w = (tt - ta) / (tb - ta);
    return [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w];
  };
  const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
  const B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
  return L(B1, B2, t1, t2);
}
export function spline(P: Pt[], closed = false, step = 5): number[][] {
  const n = P.length, out: number[][] = [];
  if (n < 2) return P.map((p) => [p[0], p[1]]);
  const segN = closed ? n : n - 1;
  for (let i = 0; i < segN; i++) {
    const p1 = P[i] as number[], p2 = P[(i + 1) % n] as number[];
    let p0 = closed ? (P[(i - 1 + n) % n] as number[]) : (i - 1 < 0 ? p1 : (P[i - 1] as number[]));
    let p3 = closed ? (P[(i + 2) % n] as number[]) : (i + 2 >= n ? p2 : (P[i + 2] as number[]));
    if (p1[2]) p0 = p1;
    if (p2[2]) p3 = p2;
    const dd = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const m = Math.max(1, Math.ceil(dd / step));
    for (let k = 0; k < m; k++) out.push(crp(p0, p1, p2, p3, k / m));
  }
  if (!closed) out.push([P[n - 1][0], P[n - 1][1]]);
  return out;
}
export function arclen(pts: ArrayLike<number[]>): number[] {
  const L = [0];
  for (let i = 1; i < pts.length; i++) {
    L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  return L;
}
export function resample(pts: number[][], step = 3.5, closed = false): number[][] {
  const src = closed ? [...pts, pts[0]] : pts;
  const L = arclen(src);
  const tot = L[L.length - 1];
  if (tot < 1e-6) return [src[0].slice(0, 2)];
  const n = Math.max(2, Math.round(tot / step));
  const out: number[][] = [];
  let j = 1;
  const N = closed ? n : n + 1;
  for (let i = 0; i < N; i++) {
    const s = (tot * i) / n;
    while (j < L.length - 1 && L[j] < s) j++;
    const a = src[j - 1], b = src[j];
    const u = (s - L[j - 1]) / Math.max(1e-9, L[j] - L[j - 1]);
    out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
  }
  return out;
}
/** 开放折线按长度比例取前缀 */
export function prefix(pts: number[][], frac: number): number[][] {
  if (frac >= 1) return pts;
  const L = arclen(pts), tot = L[L.length - 1], s = tot * Math.max(0, frac);
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (L[i] <= s) { out.push(pts[i]); continue; }
    const u = (s - L[i - 1]) / Math.max(1e-9, L[i] - L[i - 1]);
    out.push([lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)]);
    break;
  }
  return out;
}
/** 仿射：绕原点缩放 (sx,sy)、切变 kx（x += kx*-y）、旋转 r、平移 (x,y) */
export function xf(P: Pt[], o: { x?: number; y?: number; r?: number; sx?: number; sy?: number; kx?: number }): number[][] {
  const { x = 0, y = 0, r = 0, sx = 1, sy = 1, kx = 0 } = o;
  const c = Math.cos(r), s = Math.sin(r);
  return P.map((p) => {
    let px = p[0] * sx, py = p[1] * sy;
    px += kx * -py;
    return [x + px * c - py * s, y + px * s + py * c, p[2]];
  });
}
export function circlePts(cx: number, cy: number, r: number, n = 0, rx: number | null = null): number[][] {
  n = n || Math.max(10, Math.round((2 * Math.PI * r) / 5));
  const out: number[][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push([cx + (rx ?? r) * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}

// ---------------------------------------------------------------- boil（逐帧线沸腾）
// 世界空间噪声位移场；z=seed 重掷 = 重画一张 cel。
export function boil(pts: number[][], seed: number, amp = 2.4, scale = 70): number[][] {
  amp *= GLOBAL.amp;
  if (!amp) return pts.map((p) => [p[0], p[1]]);
  const z = seed * 2.371 + 0.5;
  return pts.map(([x, y]) => [
    x + amp * N3(x / scale, y / scale, z),
    y + amp * N3(x / scale + 41.3, y / scale - 17.9, z),
  ]);
}
