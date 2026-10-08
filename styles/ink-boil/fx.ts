// CelFX 编舞词汇移植自 mg-styles-15 demos/05-cel-boil scene.js (MIT, Vincentwei1021), TSX 重写。
// 烟 / 火花 / 速度线 / 星芒 / 爆框 / 灯池 / 余烬 —— 全部 seeded 纯函数（同帧渲两次逐像素一致）。
import type { CanvasCtx } from './types';
import { PAL, REG } from './types';
import { hs, lerp, xf, circlePts, spline, type Pt, type Key } from './engine';
import { inkStroke, inkLoop, fillShape, polyPath, type Layers } from './brush';

// ---------------------------------------------------------------- stars / sparkles
export function starPts(n: number, rOut: number, rIn: number, seed: number, rot = 0, jit = 0.25): Pt[] {
  const P: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2 + (hs(seed, i, 1) - 0.5) * (Math.PI / n) * 0.6;
    const ro = rOut * (1 - jit + jit * 2 * hs(seed, i, 2));
    P.push([Math.cos(a) * ro, Math.sin(a) * ro, 1]);
    const b = a + Math.PI / n + (hs(seed, i, 3) - 0.5) * (Math.PI / n) * 0.3;
    const ri = rIn * (0.85 + 0.3 * hs(seed, i, 4));
    P.push([Math.cos(b) * ri, Math.sin(b) * ri]);
  }
  return P;
}
export function twinklePts(R: number, seed: number, rot = 0): Pt[] {
  const P: Pt[] = [];
  for (let i = 0; i < 4; i++) {
    const a = rot + (i * Math.PI) / 2;
    const r = R * (i % 2 ? 0.78 : 1) * (0.92 + 0.16 * hs(seed, i));
    P.push([Math.cos(a) * r, Math.sin(a) * r, 1]);
    const b = a + Math.PI / 4;
    P.push([Math.cos(b) * R * 0.2, Math.sin(b) * R * 0.2]);
  }
  return P;
}
export function drawTwinkle(c: CanvasCtx, x: number, y: number, R: number, seed: number, o: { rot?: number; fill?: string; w?: number } = {}): void {
  if (R < 2) return;
  const P = xf(twinklePts(R, seed, o.rot ?? 0), { x, y });
  const d = spline(P, true, 3);
  fillShape(c, d, o.fill ?? PAL.yel, { seed, amp: 1.2, dx: REG.dx * 0.6, dy: REG.dy * 0.6 });
  inkLoop(c, d, { seed, w: o.w ?? Math.max(2.5, R * 0.09), amp: 1.2, t0: 4, t1: 8, heavy: 0.2 });
}

// 沿速度方向的泪滴火花
export function drawSpark(c: CanvasCtx, x: number, y: number, vx: number, vy: number, size: number, seed: number, o: { inkOnly?: boolean; fill?: string } = {}): void {
  const sp = Math.hypot(vx, vy) || 1, ux = vx / sp, uy = vy / sp;
  const len = size * (1.4 + Math.min(5, sp / 450));
  const r = size * 0.55;
  const ang = Math.atan2(uy, ux);
  const P: Pt[] = [[r, 0], [r * 0.7, r * 0.72], [0, r], [-len, 0, 1], [0, -r], [r * 0.7, -r * 0.72]];
  const d = spline(xf(P, { x, y, r: ang }), true, 3);
  if (o.inkOnly) { fillShape(c, d, PAL.ink, { seed, amp: 1 }); return; }
  fillShape(c, d, o.fill ?? PAL.yel, { seed, amp: 1.2, dx: REG.dx * 0.5, dy: REG.dy * 0.5 });
  inkLoop(c, d, { seed, w: Math.max(2.2, size * 0.16), amp: 1, t0: 3, t1: 10, heavy: 0.2 });
}

// ---------------------------------------------------------------- speed lines
// 平行拖尾速度线（打磨方向感）
export function speedLinesTrail(c: CanvasCtx, x0: number, y0: number, n: number, seed: number, o: { dir?: number; len?: number; w?: number; gap?: number; color?: string } = {}): void {
  const { dir = -1, len = 200, w = 4.2, gap = 17, color = PAL.hi } = o;
  for (let k = 0; k < n; k++) {
    const yy = y0 - (gap * (n - 1)) / 2 + k * gap + hs(seed, k) * 5;
    const tip = x0 - hs(seed, k, 2) * 40;
    inkStroke(c, [[tip - dir * (len + hs(seed, k, 3) * 160), yy], [tip, yy]], {
      seed: seed * 7 + k, w: w * (0.6 + 0.8 * hs(seed, k, 4)), t0: 120, t1: 8, min: 0.05, amp: 1.2, heavy: 0, color,
    });
  }
}
// 放射速度线（爆框伴生）
export function speedLinesRadial(c: CanvasCtx, cx: number, cy: number, r0: number, r1: number, n: number, seed: number, w = 7): void {
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + hs(seed, k) * 0.5;
    const aa0 = r0 * (0.9 + 0.3 * hs(seed, k, 2)), aa1 = r1 * (0.8 + 0.4 * hs(seed, k, 3));
    const P = [[cx + Math.cos(a) * aa0, cy + Math.sin(a) * aa0], [cx + Math.cos(a) * aa1, cy + Math.sin(a) * aa1]];
    inkStroke(c, P, { seed: seed * 7 + k, w: w * (0.6 + 0.8 * hs(seed, k, 4)), t0: 12, t1: 90, min: 0.05, amp: 1.5, heavy: 0 });
  }
}

// ---------------------------------------------------------------- 爆框（三层锯齿星 + 墨圈）
export function drawStarburst(c: CanvasCtx, x: number, y: number, R: number, seed: number, rot: number, o: { w?: number } = {}): void {
  const sd = seed;
  const ri = 0.52;
  const outer = spline(xf(starPts(15, R, R * ri, sd, rot, 0.28), { x, y }), true, 6);
  const mid = spline(xf(starPts(11, R * 0.66, R * 0.36, sd + 1, rot + 0.2, 0.3), { x, y }), true, 5);
  const core = spline(xf(starPts(9, R * 0.34, R * 0.2, sd + 3, rot + 0.5, 0.3), { x, y }), true, 4);
  fillShape(c, outer, PAL.yel, { seed: sd, amp: 2.5, dx: REG.dx, dy: REG.dy });
  fillShape(c, mid, PAL.red, { seed: sd + 2, amp: 2.5, dx: REG.dx, dy: REG.dy });
  fillShape(c, core, PAL.hi, { seed: sd + 4, amp: 2 });
  inkLoop(c, outer, { seed: sd + 5, w: o.w ?? 8, amp: 2.5, heavy: 0.3, splits: 2 });
}

// ---------------------------------------------------------------- 烟（云朵圈 + 烟丝）
type PuffCircle = { x: number; y: number; r: number };
// 一朵小云圈：填色 + 沸腾墨环（环在离屏层做 destination-out，防擦穿纸底）
// applyCam：把主画布当前相机变换套到离屏层（层内画世界坐标，blit 时恒等贴回屏幕像素）
export function smokeGroup(c: CanvasCtx, ly: Layers, puffs: PuffCircle[], o: { seed?: number; w?: number; fill?: string; applyCam?: (x: CanvasCtx) => void } = {}): void {
  const { seed = 1, w = 5, fill = PAL.hi, applyCam } = o;
  const L = ly.get(1);
  const ring = ly.get(2);
  if (applyCam) { L.save(); applyCam(L); ring.save(); applyCam(ring); }
  for (const [k, q] of puffs.entries()) {
    if (q.r < 1.5) continue;
    const n = Math.max(12, Math.round(q.r / 3));
    fillShape(L, circlePts(q.x, q.y, q.r, n), fill, { seed: seed + k * 31 + 3, amp: 1.6, dx: REG.dx, dy: REG.dy });
    ring.fillStyle = PAL.ink;
    const P = circlePts(q.x, q.y, q.r, n).map(([x, y]) => {
      const a = Math.atan2(y - q.y, x - q.x);
      const ww = w * (0.7 + 0.6 * Math.max(0, Math.cos(a - 0.9)));
      return [q.x + Math.cos(a) * (q.r + ww * 0.5), q.y + Math.sin(a) * (q.r + ww * 0.5)];
    });
    ring.beginPath(); polyPath(ring, P); ring.fill();
  }
  ring.globalCompositeOperation = 'destination-out';
  for (const [k, q] of puffs.entries()) {
    if (q.r < 1.5) continue;
    const n = Math.max(12, Math.round(q.r / 3));
    ring.beginPath();
    polyPath(ring, circlePts(q.x, q.y, Math.max(1, q.r - w * 0.5), n));
    ring.fill();
  }
  ring.globalCompositeOperation = 'source-over';
  if (applyCam) { ring.restore(); }
  // 环合成进填色层，再整体 blit（避免 destination-out 擦到主画布）
  L.save();
  L.setTransform(1, 0, 0, 1, 0, 0);
  if (ring.canvas) L.drawImage(ring.canvas, 0, 0);
  L.restore();
  // 体积：每朵一朵右下手排弧
  for (const [k, q] of puffs.entries()) {
    if (q.r < 14) continue;
    const P: number[][] = [];
    const a0 = 0.15 + hs(seed, k, 5) * 0.3, a1 = a0 + 1.1 + hs(seed, k, 6) * 0.5;
    for (let i = 0; i <= 10; i++) {
      const a = lerp(a0, a1, i / 10);
      P.push([q.x + Math.cos(a) * q.r * 0.66, q.y + Math.sin(a) * q.r * 0.62]);
    }
    inkStroke(L, P, { seed: seed + 40 + k, w: w * 0.75, t0: 14, t1: 20, min: 0.1, amp: 1.2, heavy: 0 });
  }
  if (applyCam) { L.restore(); }
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  if (L.canvas) c.drawImage(L.canvas, 0, 0);
  c.restore();
}

// 烟丝：一根上升摆动细线 + 顶端卷曲（ph 随张号推进）
export function drawWisp(c: CanvasCtx, x: number, y: number, ph: number, seed: number, o: { amt?: number; big?: number; color?: string } = {}): void {
  const { amt = 1, big = 0, color = PAL.ink } = o;
  if (amt <= 0) return;
  const Hh = 150 * (1 + 0.22 * big), dr = 220 * big;
  const strand = (sd: number, off: number, w: number, k: number): number[][] => {
    const P: number[][] = [];
    for (let i = 0; i <= 8; i++) {
      const u = i / 8;
      const v = u * (off ? 0.72 : 1);
      P.push([x + off * v + Math.sin(v * 5 + ph + k) * (5 + (22 + 20 * big) * v) * amt + dr * v * v * amt, y - v * Hh * amt - off * 0.3 * v]);
    }
    inkStroke(c, P, { seed: sd + Math.floor(ph * 13), w, t0: 20, t1: 40, amp: 1.2, heavy: 0, color });
    return P;
  };
  const P = strand(700, 0, 4.2, 0);
  if (big > 0) strand(710, 30 * big, 3.2, 1.7);
  // 顶端卷
  const tp = P[P.length - 1];
  const r = (14 + 20 * big) * amt;
  const cp: number[][] = [];
  for (let i = 0; i <= 12; i++) {
    const a = -Math.PI / 2 + i * 0.55 + ph;
    const rr = r * (1 - i / 16);
    cp.push([tp[0] + Math.cos(a) * rr, tp[1] - r + Math.sin(a) * rr]);
  }
  inkStroke(c, cp, { seed: 720 + Math.floor(ph * 13), w: 3.6 + big, t0: 6, t1: 20, amp: 1, heavy: 0, color });
}

// ---------------------------------------------------------------- 灯池（赛璐璐级进光，multiply 入纸）
export function drawLightPool(c: CanvasCtx, cx: number, cy: number, R: number, variant: number, o: { alpha?: number } = {}): void {
  if (R < 8) return;
  const scal = (r: number, n: number, ph: number): number[][] => {
    const P: number[][] = [];
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      const q = Math.abs(Math.sin(a * n / 2 + ph));
      P.push([cx + Math.cos(a) * r * (0.975 + 0.035 * Math.sqrt(q)), cy + Math.sin(a) * r * (0.975 + 0.035 * Math.sqrt(q))]);
    }
    return P;
  };
  c.save();
  c.globalCompositeOperation = 'multiply';
  c.globalAlpha = o.alpha ?? 0.72;
  fillShape(c, scal(R * 1.25, 22, variant * 0.7), '#fff7df', { seed: 8100 + variant, amp: 4, scale: 90 });
  fillShape(c, scal(R, 18, 1 + variant * 0.9), '#fff0b4', { seed: 8200 + variant, amp: 4, scale: 90 });
  c.restore();
}

// ---------------------------------------------------------------- 余烬粒子（结尾定帧微动效）
export function drawEmbers(c: CanvasCtx, x: number, y: number, n: number, seed: number, ph: number, o: { spread?: number; rise?: number } = {}): void {
  const { spread = 46, rise = 90 } = o;
  for (let k = 0; k < n; k++) {
    const u = (hs(seed, k, 1) + ph * (0.14 + 0.1 * hs(seed, k, 2))) % 1; // 0..1 生命周期
    const drift = Math.sin(u * 7 + k) * (6 + 10 * hs(seed, k, 3));
    const px = x + (hs(seed, k, 4) - 0.5) * spread + drift;
    const py = y - u * rise * (0.6 + 0.8 * hs(seed, k, 5));
    const R = (2.2 + 2.6 * hs(seed, k, 6)) * (1 - u * 0.55);
    const tw = Math.abs(Math.sin(u * Math.PI)) * (0.55 + 0.45 * Math.abs(Math.sin(ph * 9 + k * 2.1)));
    if (R * tw < 0.8) continue;
    const P = xf(twinklePts(R, seed * 3 + k, hs(seed, k, 7) * Math.PI), { x: px, y: py });
    const d = spline(P, true, 3);
    fillShape(c, d, k % 3 === 0 ? PAL.yel : PAL.red, { seed: seed + k, amp: 0.9 });
    if (R > 2.6) inkLoop(c, d, { seed: seed + k, w: 1.8, amp: 0.8, t0: 2, t1: 4, heavy: 0.15 });
  }
}

/** 小爆星 poof（点火/落地尘）：一次性星形 + 内圈 */
export function drawPoof(c: CanvasCtx, x: number, y: number, R: number, seed: number, rot = 0): void {
  const P = xf(starPts(8, R, R * 0.45, seed, rot, 0.3), { x, y });
  const d = spline(P, true, 4);
  fillShape(c, d, PAL.yel, { seed, amp: 1.6, dx: REG.dx * 0.6, dy: REG.dy * 0.6 });
  inkLoop(c, d, { seed, w: Math.max(3, R * 0.09), amp: 1.6, t0: 4, t1: 8, heavy: 0.25 });
}

export type { Key };
