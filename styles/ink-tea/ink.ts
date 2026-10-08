// 笔墨共享底座：seeded 随机 / 2D 梯度噪声 / Catmull-Rom 加密 / 等弧长重采样 / 变宽带状多边形 / 关键帧。
// 笔墨引擎技法借鉴 huashu-art-motion 17_ink (MIT, alchaincyf), TSX 重写。
// 全部纯函数：同输入同输出（禁 Math.random/Date/网络）。

/** 点：[x, y] */
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

/** FNV-1a 变体散列：任意数字串 -> [0,1) */
export function hs(...a: number[]): number {
  let h = 2166136261 >>> 0;
  for (const v of a) {
    h = Math.imul(h ^ ((Math.round(v * 997) | 0) >>> 0), 16777619) >>> 0;
    h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; h ^= h >>> 15;
  }
  return (h >>> 0) / 4294967296;
}

// ---------------------------------------------------------------- easing / keyframes
export const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, q: number): number => a + (b - a) * q;
/** smoothstep：ink 笔压与 reveal 的基础缓动 */
export const ss = (a: number, b: number, v: number): number => {
  const q = clamp((v - a) / (b - a || 1e-6));
  return q * q * (3 - 2 * q);
};
export type Key = [number, number, ('in2' | 'out2' | 'io')?];
/** 关键帧插值（默认线性，'in2' 二次入 / 'out2' 二次出 / 'io' smoothstep） */
export function K(f: number, keys: Key[]): number {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [f0, v0] = keys[i], [f1, v1, e] = keys[i + 1];
    if (f <= f1) {
      let q = (f - f0) / (f1 - f0 || 1e-6);
      if (e === 'in2') q = q * q;
      else if (e === 'out2') q = 1 - (1 - q) * (1 - q);
      else if (e === 'io') q = q * q * (3 - 2 * q);
      return lerp(v0, v1, q);
    }
  }
  return keys[keys.length - 1][1];
}

// ---------------------------------------------------------------- 2D gradient noise (Perlin)
/** seeded Perlin 2D，返回约 [-1,1]。笔压抖动与飞白断裂共用一个场。 */
export function makeNoise2D(seed: number): (x: number, y: number) => number {
  const rand = mulberry32(seed);
  const p = new Uint8Array(512);
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i++) base[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = base[i]; base[i] = base[j]; base[j] = t;
  }
  for (let i = 0; i < 512; i++) p[i] = base[i & 255];
  const grad = (h: number, x: number, y: number): number => {
    switch (h & 7) {
      case 0: return x + y; case 1: return -x + y; case 2: return x - y; case 3: return -x - y;
      case 4: return x; case 5: return -x; case 6: return y; default: return -y;
    }
  };
  const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);
  return (x: number, y: number): number => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = fade(xf), v = fade(yf);
    const aa = p[p[X] + Y], ab = p[p[X] + Y + 1], ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
    const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
    return lerp(x1, x2, v) * 1.1;
  };
}

// ---------------------------------------------------------------- path geometry
/** Catmull-Rom 单段插值 */
function crSeg(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const t2 = t * t, t3 = t2 * t;
  const f = (a: number, b: number, c: number, d: number): number =>
    0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
}
/** 控制点 Catmull-Rom 加密：每段插 per 个点（毛笔的「笔肚」曲线） */
export function densify(pts: Pt[], per = 5): Pt[] {
  if (pts.length < 3) return pts.slice();
  const ext = [pts[0], ...pts, pts[pts.length - 1]];
  const out: Pt[] = [];
  for (let i = 0; i < ext.length - 3; i++) {
    for (let k = 0; k < per; k++) out.push(crSeg(ext[i], ext[i + 1], ext[i + 2], ext[i + 3], k / per));
  }
  out.push(pts[pts.length - 1]);
  return out;
}
/** 等弧长重采样：4px 步长——不重采样的话飞白噪声频率随笔画长短漂移 */
export function resample(pts: Pt[], step = 4): Pt[] {
  if (pts.length < 2) return pts.slice();
  const out: Pt[] = [pts[0]];
  let prev = pts[0], acc = 0;
  for (let i = 1; i < pts.length; i++) {
    let cur = pts[i];
    let dx = cur[0] - prev[0], dy = cur[1] - prev[1];
    let d = Math.hypot(dx, dy);
    while (acc + d >= step) {
      const need = step - acc;
      const q = need / (d || 1e-6);
      const nx = prev[0] + dx * q, ny = prev[1] + dy * q;
      out.push([nx, ny]);
      prev = [nx, ny];
      dx = cur[0] - prev[0]; dy = cur[1] - prev[1];
      d = Math.hypot(dx, dy);
      acc = 0;
    }
    acc += d;
    prev = cur;
  }
  const last = pts[pts.length - 1];
  const tail = out[out.length - 1];
  if (Math.hypot(last[0] - tail[0], last[1] - tail[1]) > step * 0.35) out.push(last);
  return out;
}
/** 变宽带状多边形：点列 + 宽度函数 -> 闭合填充形（湿笔芯 / 兰叶 / 叶片共用） */
export function ribbon(pts: Pt[], wFn: (q: number, i: number) => number): Pt[] {
  const n = pts.length;
  if (n < 2) return pts.slice();
  const left: Pt[] = [], right: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const A = pts[Math.max(0, i - 1)], B = pts[Math.min(n - 1, i + 1)];
    let dx = B[0] - A[0], dy = B[1] - A[1];
    const d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d, ny = dx / d;
    const w = wFn(i / (n - 1), i) / 2;
    left.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
    right.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  return [...left, ...right.reverse()];
}
/** 点列 -> Path2D（闭合可选） */
export function pathOf(pts: Pt[], close = false): Path2D {
  const p = new Path2D();
  pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])));
  if (close) p.closePath();
  return p;
}
/** 折线点列 Path2D（不闭合，白描线用） */
export function strokeOf(pts: Pt[]): Path2D {
  return pathOf(pts, false);
}

// ---------------------------------------------------------------- palette（墨五色 + 纸 + 一点红）
/** 墨分五色：焦/浓/重/淡/清（tone 值，huashu 17_ink 已验证档位） */
export const TONE = { jiao: 0.9, nong: 0.8, zhong: 0.6, dan: 0.35, qing: 0.15 } as const;
export const PAL = {
  paper: '#efe6d0',
  ink: [16, 14, 12] as const,
  rouge: [190, 40, 40] as const,
  seal: '#c4281e',
  sun: '#d8553f',
} as const;

/** 离屏 canvas 惰性缓存（宣纸/钤印等大件只建一次，渲染逐帧确定性不受影响） */
const cache = new Map<string, HTMLCanvasElement>();
export function cached(key: string, w: number, h: number, build: (g: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  let cv = cache.get(key);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    build(cv.getContext('2d') as CanvasRenderingContext2D);
    cache.set(key, cv);
  }
  return cv;
}
