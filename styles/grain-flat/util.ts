// 数学工具 —— grain-flat。全库确定性：mulberry32 + 格点整数哈希，禁 Math.random/Date/网络。
// 关键帧/路径插值习惯用法借鉴 huashu-art-motion (MIT) scenes/16_2026.js，TSX 重写。

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 2D 格点整数哈希 → [0,1)。与渲染顺序无关、可 seek。 */
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

/** 段进度：f 越过 [a,b] 映射 0→1 并钳制。 */
export function seg(f: number, a: number, b: number): number {
  return clamp((f - a) / (b - a));
}

export const ease = {
  linear: (q: number): number => q,
  in: (q: number): number => q * q,
  out: (q: number): number => 1 - (1 - q) * (1 - q),
  inOut: (q: number): number => (q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2),
  /** 过冲回弹（惊呼/紧张线/音弧弹出）。 */
  outBack: (q: number): number => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(q - 1, 3) + c1 * Math.pow(q - 1, 2);
  },
};

export type EaseFn = (q: number) => number;

/** 关键帧表插值：[[帧,值],...]，段内 e(q)。 */
export function kf(f: number, tab: Array<[number, number]>, e: EaseFn = ease.inOut): number {
  if (f <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) {
    if (f <= tab[i][0]) {
      const q = (f - tab[i - 1][0]) / (tab[i][0] - tab[i - 1][0]);
      return lerp(tab[i - 1][1], tab[i][1], e(q));
    }
  }
  return tab[tab.length - 1][1];
}

export type PathTab = Array<[number, number, number]>;

/** 点表 Catmull-Rom 插值（质心/杯子轨迹每 2-3 帧一个控制点）。返回 [x,y]。 */
export function path(f: number, tab: PathTab): [number, number] {
  if (f <= tab[0][0]) return [tab[0][1], tab[0][2]];
  const n = tab.length;
  if (f >= tab[n - 1][0]) return [tab[n - 1][1], tab[n - 1][2]];
  let i = 1;
  while (tab[i][0] < f) i++;
  const p0 = tab[Math.max(0, i - 2)], p1 = tab[i - 1], p2 = tab[i], p3 = tab[Math.min(n - 1, i + 1)];
  const q = (f - p1[0]) / (p2[0] - p1[0]);
  const cr = (a: number, b: number, c: number, d: number): number =>
    0.5 * (2 * b + (-a + c) * q + (2 * a - 5 * b + 4 * c - d) * q * q + (-a + 3 * b - 3 * c + d) * q * q * q);
  return [cr(p0[1], p1[1], p2[1], p3[1]), cr(p0[2], p1[2], p2[2], p3[2])];
}

/** 平滑闭合曲线 Path2D（中点二次贝塞尔）。 */
export function smoothPath(pts: Array<[number, number]>, closed = true): Path2D {
  const p = new Path2D();
  const n = pts.length;
  if (n < 3) return p;
  const mid = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  if (closed) {
    let m = mid(pts[n - 1], pts[0]);
    p.moveTo(m[0], m[1]);
    for (let i = 0; i < n; i++) {
      const cur = pts[i], nx = pts[(i + 1) % n], mm = mid(cur, nx);
      p.quadraticCurveTo(cur[0], cur[1], mm[0], mm[1]);
    }
    p.closePath();
  } else {
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n - 1; i++) {
      const mm = mid(pts[i], pts[i + 1]);
      p.quadraticCurveTo(pts[i][0], pts[i][1], mm[0], mm[1]);
    }
    p.lineTo(pts[n - 1][0], pts[n - 1][1]);
  }
  return p;
}

/** 圆角矩形 Path2D（r 支持逐角数组）。 */
export function roundRectPath(x: number, y: number, w: number, h: number, r: number | number[]): Path2D {
  const p = new Path2D();
  p.roundRect(x, y, w, h, r);
  return p;
}

/** 锥形肢体（肩宽→爪细的四边形，软圆角）。 */
export function taper(a: [number, number], b: [number, number], wa: number, wb: number, feather = 6): Path2D {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const p = new Path2D();
  p.moveTo(a[0] + nx * wa * 0.5, a[1] + ny * wa * 0.5);
  p.lineTo(b[0] + nx * wb * 0.5 - ux * feather, b[1] + ny * wb * 0.5 - uy * feather);
  p.quadraticCurveTo(b[0] + nx * wb * 0.5, b[1] + ny * wb * 0.5, b[0] + nx * wb * 0.5 + ux * feather, b[1] + ny * wb * 0.5 + uy * feather);
  p.lineTo(a[0] - nx * wa * 0.5 + ux * feather, a[1] - ny * wa * 0.5 + uy * feather);
  p.quadraticCurveTo(a[0] - nx * wa * 0.5, a[1] - ny * wa * 0.5, a[0] + nx * wa * 0.5, a[1] + ny * wa * 0.5);
  p.closePath();
  return p;
}
