// 赛璐璐笔刷移植自 mg-styles-15 demos/05-cel-boil (MIT, Vincentwei1021), TSX 重写。
// 变宽笔刷（inkW 手绘墨宽剖面）+ 沸腾位移 -> 轮廓多边形填充；填色与描线独立 boil + dx/dy 错位（off-register）。
import type { CanvasCtx } from './types';
import { PAL, REG } from './types';
import { N3, hs, clamp, lerp, sstep, spline, arclen, resample, xf, boil } from './engine';
import type { Pt } from './engine';

export { PAL, REG };

// ---------------------------------------------------------------- polygon helpers
export function polyPath(c: CanvasCtx, poly: number[][], close = true): void {
  if (!poly.length) return;
  c.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) c.lineTo(poly[i][0], poly[i][1]);
  if (close) c.closePath();
}
export function fillPoly(c: CanvasCtx, poly: number[][], color: string, rule: CanvasFillRule = 'nonzero'): void {
  c.beginPath(); polyPath(c, poly); c.fillStyle = color; c.fill(rule);
}

// ---------------------------------------------------------------- 变宽笔刷：中轴 + 法线偏移 -> 轮廓多边形（圆头端帽）
export function outline(pts: number[][], wfn: (u: number, s: number, i: number, tx: number, ty: number) => number, caps = true): number[][] {
  const n = pts.length;
  if (n < 2) return [];
  const L = arclen(pts), tot = L[n - 1] || 1;
  const Lp: number[][] = [], Rp: number[][] = [];
  let w0 = 0, wN = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const w = Math.max(0, wfn(L[i] / tot, L[i], i, tx, ty)) / 2;
    if (i === 0) w0 = w;
    if (i === n - 1) wN = w;
    Lp.push([pts[i][0] - ty * w, pts[i][1] + tx * w]);
    Rp.push([pts[i][0] + ty * w, pts[i][1] - tx * w]);
  }
  const poly = [...Lp];
  const cap = (c: number[], a0: number, w: number, into: number[][]) => {
    if (w < 0.6 || !caps) return;
    for (let k = 1; k < 8; k++) {
      const a = a0 - (Math.PI * k) / 8;
      into.push([c[0] + Math.cos(a) * w, c[1] + Math.sin(a) * w]);
    }
  };
  { // 末端帽：从 L 侧绕过笔尖扫到 R 侧
    const a = pts[n - 2], b = pts[n - 1];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    cap(b, ang + Math.PI / 2, wN, poly);
  }
  for (let i = n - 1; i >= 0; i--) poly.push(Rp[i]);
  { // 起端帽
    const a = pts[0], b = pts[1];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    cap(a, ang - Math.PI / 2, w0, poly);
  }
  return poly;
}

// 手绘墨宽剖面：两端锥形 + 压力噪声 ±35% + 背光侧加粗（法线与光向点积）
export function inkW(o: {
  w?: number; seed?: number; t0?: number; t1?: number; jit?: number; min?: number;
  heavy?: number; lx?: number; ly?: number; tot?: number | null; taper?: boolean;
}): (u: number, s: number, i: number, tx: number, ty: number) => number {
  const { w = 6, seed = 1, t0 = 14, t1 = 26, jit = 0.35, min = 0.25, heavy = 0.35, lx = 0.55, ly = 0.83, tot = null, taper = true } = o;
  return (u: number, s: number, i: number, tx: number, ty: number): number => {
    let k = 1 + jit * N3(s / 60, seed * 1.37, 3.1);
    // 背光侧加粗：外法线 ~ (ty,-tx)；取 |点积| 使两种绕向都压亮右下边
    const nx = ty, ny = -tx;
    k *= 1 + heavy * Math.max(0, nx * lx + ny * ly);
    if (taper && tot) {
      const a = sstep(0, t0, s), b = sstep(0, t1, tot - s);
      k *= min + (1 - min) * Math.min(a, b);
    }
    return w * k;
  };
}

// 开放墨线：控制点 -> 样条 -> 重采样 -> 沸腾 -> 变宽轮廓 -> 填充
export function inkStroke(c: CanvasCtx, P: Array<number[] | Pt>, o: {
  seed?: number; amp?: number; scale?: number; step?: number; color?: string; dense?: boolean; caps?: boolean;
  w?: number; t0?: number; t1?: number; jit?: number; min?: number; heavy?: number; lx?: number; ly?: number; taper?: boolean;
  wfn?: (tot: number) => (u: number, s: number, i: number, tx: number, ty: number) => number;
} = {}): number[][] {
  const { seed = 1, amp = 2.2, scale = 70, step = 5, color = PAL.ink, dense = false } = o;
  let pts = dense ? (P as number[][]) : spline(P as Pt[], false, step);
  pts = resample(pts, 3.2);
  pts = boil(pts, seed, amp, scale);
  const L = arclen(pts);
  const tot = L[L.length - 1];
  const wf = o.wfn ? o.wfn(tot) : inkW({ ...o, tot });
  const poly = outline(pts, wf, o.caps ?? true);
  fillPoly(c, poly, color);
  return pts;
}

// 闭合墨圈：拆 1-2 笔重叠描（出锋 overshoot），自动判绕向统一「重边」朝向
export function inkLoop(c: CanvasCtx, dense: number[][], o: {
  seed?: number; amp?: number; scale?: number; color?: string; splits?: number; overlap?: number; overshoot?: number;
  w?: number; t0?: number; t1?: number; jit?: number; min?: number; heavy?: number; taper?: boolean;
} = {}): number[][] {
  const { seed = 1, amp = 2.2, scale = 70, color = PAL.ink, splits = 1, overlap = 0.05, overshoot = 2.5 } = o;
  let pts = boil(resample(dense, 3.2, true), seed, amp, scale);
  const n = pts.length;
  if (n < 6) return pts;
  // 绕向 -> 外法线符号（canvas y 向下：A>0 = 屏幕顺时针）
  let A = 0;
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    A += p[0] * q[1] - q[0] * p[1];
  }
  const sgn = A > 0 ? 1 : -1;
  const s0 = Math.floor(hs(seed, 7) * n);
  const cuts: number[] = [];
  for (let k = 0; k < splits; k++) cuts.push(Math.floor(s0 + (n * k) / splits + (hs(seed, 9, k) - 0.5) * n * 0.15));
  for (let k = 0; k < splits; k++) {
    const a = cuts[k], b = k + 1 < splits ? cuts[k + 1] : cuts[0] + n;
    const ext = Math.max(2, Math.floor(n * overlap));
    const seg: number[][] = [];
    for (let j = a; j <= b + ext; j++) {
      const p = pts[((j % n) + n) % n];
      if (j > b) { // 出锋：沿切线法向推出 overshoot
        const q = pts[(((j + 1) % n) + n) % n], r0 = pts[(((j - 1) % n) + n) % n];
        let tx = q[0] - r0[0], ty = q[1] - r0[1];
        const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        const off = ((j - b) / ext) * overshoot * sgn;
        seg.push([p[0] - ty * off, p[1] + tx * off]);
      } else seg.push(p);
    }
    const tot = arclen(seg)[seg.length - 1];
    const wf = inkW({ ...o, seed: seed + k * 13, tot, t0: o.t0 ?? 10, t1: o.t1 ?? 22 });
    // 统一重边：逆时针圈翻转法线
    const wf2 = sgn > 0 ? wf : (u: number, s: number, i: number, tx: number, ty: number) => wf(u, s, i, -tx, -ty);
    fillPoly(c, outline(seg, wf2), color);
  }
  return pts;
}

// 平涂闭合形：独立 boil + dx/dy 错位（off-register 手上色）
export function fillShape(c: CanvasCtx, dense: number[][], color: string, o: { seed?: number; amp?: number; scale?: number; dx?: number; dy?: number } = {}): number[][] {
  const { seed = 1, amp = 2.2, scale = 70, dx = 0, dy = 0 } = o;
  let pts = boil(dense, seed + 0.5, amp, scale);
  if (dx || dy) pts = pts.map((p) => [p[0] + dx, p[1] + dy]);
  fillPoly(c, pts, color);
  return pts;
}

// 手排线阴影：gap 间距、ang 角度、逐线抖动，clip 到多边形内
export function hatch(c: CanvasCtx, clipPoly: number[][], o: {
  seed?: number; gap?: number; ang?: number; w?: number; color?: string; amp?: number; jitter?: number;
} = {}): void {
  const { seed = 1, gap = 14, ang = -0.9, w = 2.2, color = PAL.ink, amp = 1.6, jitter = 0.35 } = o;
  c.save();
  c.beginPath(); polyPath(c, clipPoly); c.clip();
  const cos = Math.cos(ang), sin = Math.sin(ang);
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const p of clipPoly) {
    bx0 = Math.min(bx0, p[0]); by0 = Math.min(by0, p[1]);
    bx1 = Math.max(bx1, p[0]); by1 = Math.max(by1, p[1]);
  }
  const R = Math.hypot(bx1 - bx0, by1 - by0) / 2 + 10, mx = (bx0 + bx1) / 2, my = (by0 + by1) / 2;
  let k = 0;
  for (let d = -R; d <= R; d += gap, k++) {
    const off = d + (hs(seed, k) - 0.5) * gap * jitter;
    const px = mx - sin * off, py = my + cos * off;
    const a = [px - cos * R * 1.1, py - sin * R * 1.1], b = [px + cos * R * 1.1, py + sin * R * 1.1];
    inkStroke(c, [a, b], { seed: seed * 31 + k, amp, w: w * (0.8 + 0.4 * hs(seed, k, 2)), t0: 8, t1: 8, jit: 0.3, heavy: 0, color });
  }
  c.restore();
}

// 手绘直边（转角出锋）：用于盒子的棱线
export function edge(c: CanvasCtx, a: number[], b: number[], seed: number, o: { w?: number; over?: number; amp?: number } = {}): void {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
  const e0 = o.over ?? 7, e1 = o.over ?? 7;
  const s0 = e0 * (0.4 + hs(seed, 1)), s1 = e1 * (0.4 + hs(seed, 2));
  const A = [a[0] - ux * s0, a[1] - uy * s0], B = [b[0] + ux * s1, b[1] + uy * s1];
  const M = [lerp(A[0], B[0], 0.5) + (hs(seed, 3) - 0.5) * 2.5 * -uy * (L / 300), lerp(A[1], B[1], 0.5) + (hs(seed, 3) - 0.5) * 2.5 * ux * (L / 300)];
  inkStroke(c, [A, M, B], { seed, w: o.w ?? 6, t0: 12, t1: 16, jit: 0.3, heavy: 0, amp: o.amp ?? 1.8, min: 0.2 });
}

/** 闭合形重采样（供 fillShape/inkLoop 的 dense 输入） */
export const dens = (poly: number[][], step = 4): number[][] => resample(poly, step, true);

// 离屏层池（烟圈等需要 destination-out 的元素）
export class Layers {
  private pool: CanvasCtx[] = [];
  constructor(private W: number, private H: number) {}
  get(i: number): CanvasCtx {
    if (!this.pool[i]) {
      const cv = document.createElement('canvas');
      cv.width = this.W; cv.height = this.H;
      this.pool[i] = cv.getContext('2d') as CanvasCtx;
    }
    const x = this.pool[i];
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = 'source-over';
    x.globalAlpha = 1;
    x.clearRect(0, 0, this.W, this.H);
    return x;
  }
  canvas(i: number): HTMLCanvasElement | null {
    const x = this.pool[i];
    return x ? x.canvas : null;
  }
}
export function blit(c: CanvasCtx, layer: CanvasCtx, alpha = 1): void {
  if (!layer.canvas) return;
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = alpha;
  c.drawImage(layer.canvas, 0, 0);
  c.restore();
}

export { clamp, lerp, sstep, xf, spline, resample, boil };
