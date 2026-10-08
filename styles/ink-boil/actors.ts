// 赛璐璐角色绘制层：火柴盒 / 火柴 / 火灵 / 擦燃特殊帧 / 字幕与题字（自 Scene.tsx 拆出，纯帧号 seeded）。
import {hs, lerp, K, xf, circlePts, spline, boil, type Key, type Pt} from './engine';
import {PAL, REG, type CanvasCtx, type DrawInfo} from './types';
import {inkStroke, inkLoop, fillShape, hatch, edge, dens} from './brush';
import {drawTwinkle, drawPoof, speedLinesTrail} from './fx';
import {bv} from './cadence';
import {BOX, boxState, STICK, BUTT_OF, TIP_OF, type MatchPose} from './state';
import {SUBS} from '../common/subs';

// ---------------------------------------------------------------- 火柴盒
export function drawBox(c: CanvasCtx, f: number, D: DrawInfo): void {
  const st = boxState(f);
  if (st.x > 550) return; // 完全出画
  const sd = 100 + bv(D);
  const T = (P: number[][]): number[][] => xf(P as Pt[], {x: BOX.px + st.x, y: BOX.py + st.y, sx: st.sx, sy: st.sy});
  const {x0, x1, y1, y2, dx, dy} = BOX;
  const a = [x0, y1], b = [x1, y1], cc = [x1 + dx, y1 + dy], d = [x0 + dx, y1 + dy];
  const e = [x0, y2], g = [x1, y2], h = [x1 + dx, y2 + dy];
  const top = T([a, b, cc, d]), front = T([a, b, g, e]), right = T([b, cc, h, g]);
  // 落定后画投影（手排线）
  if (st.x < 4) {
    const S = [x0 + 30, y2], S2 = [x1, y2], S3 = [x1 + dx, y2 + dy], S4 = [x1 + dx + 60, y2 + dy + 34], S5 = [x1 + 54, y2 + 30], S6 = [x0 + 54, y2 + 26];
    hatch(c, dens(T([S, S2, S3, S4, S5, S6]), 6), {seed: sd * 3, gap: 13, ang: -0.95, w: 2.4, amp: 1.2});
  }
  const o = (k: number) => ({seed: sd * 10 + k, amp: 1.8, dx: REG.dx, dy: REG.dy});
  fillShape(c, dens(top), PAL.red, o(1));
  fillShape(c, dens(front), PAL.yel, o(2));
  fillShape(c, dens(right), PAL.red, o(3));
  hatch(c, dens(right, 6), {seed: sd * 5, gap: 11, ang: 1.15, w: 2.0, amp: 1.0});
  // 磷面（前脸墨带）
  const band = T([[x0 + 24, y1 + 20], [x1 - 24, y1 + 20], [x1 - 24, y2 - 20], [x0 + 24, y2 - 20]]);
  fillShape(c, dens(band), PAL.ink, {seed: sd * 10 + 4, amp: 1.4});
  // 磷粒
  c.fillStyle = PAL.cream;
  for (let i = 0; i < 80; i++) {
    const px = lerp(x0 + 32, x1 - 32, hs(i, 3)), py = lerp(y1 + 26, y2 - 26, hs(i, 4));
    const [q] = boilPt(T([[px, py]]), sd, 1.0, 40);
    c.beginPath(); c.arc(q[0], q[1], 0.8 + 1.3 * hs(i, 5), 0, 7); c.fill();
  }
  // 顶面标签（贴纸印字：仿射贴进透视面）
  const LP = (u: number, v: number): number[] => [x0 + u * (x1 - x0) + v * dx, y1 + v * dy];
  const lab = T([LP(0.3, 0.24), LP(0.8, 0.24), LP(0.8, 0.78), LP(0.3, 0.78)]);
  fillShape(c, dens(lab), PAL.hi, {seed: sd * 10 + 5, amp: 1.4, dx: REG.dx * 0.6, dy: REG.dy * 0.6});
  const [O] = T([LP(0.3, 0.78)]), [X] = T([LP(0.8, 0.78)]), [Y] = T([LP(0.3, 0.24)]);
  c.save();
  c.transform((X[0] - O[0]) / 330, (X[1] - O[1]) / 330, (Y[0] - O[0]) / 88, (Y[1] - O[1]) / 88, O[0], O[1]);
  const jx = (hs(bv(D), 61) - 0.5) * 1.4, jy = (hs(bv(D), 62) - 0.5) * 1.4;
  c.translate(jx, jy);
  const fl = spline(xf(flameUnit(4, 0.08), {x: 36, y: 74, sx: 40, sy: 52}), true, 3);
  fillShape(c, fl, PAL.red, {seed: 3, amp: 0.8});
  c.fillStyle = PAL.ink;
  c.font = '700 34px "Noto Sans SC"';
  c.textBaseline = 'alphabetic';
  c.fillText('安全火柴', 78, 60);
  c.fillRect(78, 70, 210, 4);
  c.restore();
  inkLoop(c, dens(lab), {seed: sd * 10 + 6, w: 3.0, amp: 1.2, heavy: 0.2});
  // 棱线（转角出锋）
  const E9: Array<[number[], number[]]> = [[a, b], [b, cc], [cc, d], [d, a], [a, e], [e, g], [g, b], [g, h], [h, cc]];
  E9.forEach(([p, q], i) => {
    const [P2, Q2] = T([p, q]);
    edge(c, P2, Q2, sd * 20 + i, {w: 4.6});
  });
}

// ---------------------------------------------------------------- 火柴
function matchLocal(bend: number): number[][] {
  const cl: number[][] = [];
  for (let i = 0; i <= 8; i++) {
    const u = i / 8;
    cl.push([bend * Math.sin(Math.PI * u), 2 + (STICK - 2) * u]);
  }
  return cl;
}
function boilPt(P: number[][], seed: number, amp: number, scale: number): number[][] {
  return boil(P, seed, amp, scale);
}
export function drawMatch(c: CanvasCtx, s: MatchPose, D: DrawInfo, seedBase: number): void {
  const sd = seedBase + bv(D);
  const T = (P: number[][]): number[][] => xf(P as Pt[], {x: s.hx, y: s.hy, r: s.r, sy: s.sy ?? 1});
  const cl = matchLocal(s.bend);
  // 杆轮廓（左/右偏移拼合）
  const Lp: number[][] = [], Rp: number[][] = [];
  cl.forEach(([x, y], i) => {
    const u = i / 8;
    const w = 8.5 + u * 1.6;
    Lp.push([x - w, y]);
    Rp.push([x + w, y]);
  });
  const poly = T([...Lp, ...Rp.reverse()]);
  const d = dens(poly, 4);
  fillShape(c, d, PAL.hi, {seed: sd * 3, amp: 1.4, dx: REG.dx * 0.7, dy: REG.dy * 0.7});
  // 木纹线
  inkStroke(c, T(cl.slice(2, 7).map(([x, y]) => [x + 2.6, y])), {seed: sd * 3 + 1, w: 2.0, t0: 20, t1: 30, amp: 1.2, heavy: 0});
  inkLoop(c, d, {seed: sd * 3 + 2, w: 4.0, amp: 1.5, t0: 8, t1: 16, heavy: 0.3});
  // 炭化段（从头顶往下吃）
  if (s.charU > 0.005) {
    const burnt: number[][] = [];
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const u = (i / n) * s.charU;
      const y = 2 + u * STICK;
      const w = 8.5 + u * 1.6 + 1.5 * hs(sd, i, 9);
      burnt.push([-w, y]);
    }
    for (let i = n; i >= 0; i--) {
      const u = (i / n) * s.charU;
      const y = 2 + u * STICK;
      const w = 8.5 + u * 1.6 + 1.5 * hs(sd, i, 8);
      burnt.push([w, y]);
    }
    const bd = dens(T(burnt), 4);
    fillShape(c, bd, PAL.ink, {seed: sd * 7 + 3, amp: 1.3, dx: REG.dx * 0.4, dy: REG.dy * 0.4});
    // 炭头帽 + 余烬点（热段）
    const tip = T([[0, 2 + s.charU * STICK]])[0];
    c.fillStyle = PAL.ink;
    c.beginPath(); c.arc(tip[0], tip[1], 5.5, 0, 7); c.fill();
    if (s.charU < 0.5) {
      const flick = bv(D) % 2 ? 1 : 0.55;
      c.fillStyle = PAL.red;
      c.globalAlpha = flick;
      c.beginPath(); c.arc(tip[0] + 2, tip[1] - 2, 3.4, 0, 7); c.fill();
      c.globalAlpha = 1;
    }
  }
  // 火柴头（未烧时番茄红，烧后墨色）
  const headP = T(circlePts(0, -4, 19, 22, 22.5));
  const hd = dens(headP, 4);
  fillShape(c, hd, s.charU > 0.03 ? PAL.ink : PAL.red, {seed: sd * 7, amp: 1.4, dx: REG.dx * 0.8, dy: REG.dy * 0.8});
  inkLoop(c, hd, {seed: sd * 7 + 1, w: 4.6, amp: 1.4, heavy: 0.4});
  // 纸白高光
  const hl = T([[-8, -14], [-3, -19]]);
  inkStroke(c, hl, {seed: sd + 5, w: 4, t0: 3, t1: 5, color: PAL.hi, amp: 0.8, heavy: 0});
}

// ---------------------------------------------------------------- 火灵（flame spirit）
function flameUnit(seed: number, wild = 0.15): Pt[] {
  const j = (k: number, a: number): number => (hs(seed, k) - 0.5) * 2 * a;
  const hr_ = 0.66 + j(1, 0.06 + wild * 0.3);
  const hl_ = 0.76 + j(2, 0.06 + wild * 0.3);
  const tipx = j(3, 0.04 + wild * 0.2), tipy = -1.0 + j(4, 0.03 + wild * 0.12);
  return [
    [0, 0.0], [0.3, -0.035], [0.43, -0.2], [0.415, -0.4],
    [0.3 + j(5, 0.03 + wild * 0.1), -hr_, 1],
    [0.17, -0.55 + j(6, 0.04)],
    [tipx, tipy, 1],
    [-0.15, -0.6 + j(7, 0.04)],
    [-0.34 + j(8, 0.03 + wild * 0.1), -hl_, 1],
    [-0.44, -0.46], [-0.44, -0.24], [-0.31, -0.04],
  ];
}
function innerUnit(seed: number, wild: number): Pt[] {
  const j = (k: number, a: number): number => (hs(seed, k + 20) - 0.5) * 2 * a;
  return [
    [0, 0.0], [0.24, -0.04], [0.33, -0.18], [0.3, -0.36],
    [0.02 + j(1, 0.04 + wild * 0.1), -0.66 + j(2, 0.04), 1],
    [-0.3, -0.38], [-0.34, -0.18], [-0.24, -0.04],
  ];
}
export type Spirit = {x: number; y: number; H: number; sx?: number; sy?: number; kx?: number; curl?: number; r?: number; wild?: number; seed?: number; face?: boolean; arms?: boolean; drops?: boolean};
function spiritXf(P: Pt[], s: Spirit): number[][] {
  const Hh = s.H;
  return P.map(([x, y, cr]) => {
    const up = -y;
    let X = x * Hh * (s.sx ?? 1), Y = y * Hh * (s.sy ?? 1);
    X += ((s.kx ?? 0) * up + (s.curl ?? 0) * up * up) * Hh;
    const co = Math.cos(s.r || 0), sn = Math.sin(s.r || 0);
    return [s.x + X * co - Y * sn, s.y + X * sn + Y * co, cr];
  });
}
export function drawSpirit(c: CanvasCtx, s: Spirit, D: DrawInfo): void {
  if (!s || s.H < 3) return;
  const sd = s.seed ?? (500 + D.id);
  const wild = s.wild ?? 0.12;
  const outer = spline(spiritXf(flameUnit(sd, wild), s), true, 4);
  const inner = spline(spiritXf(innerUnit(sd, wild).map(([x, y, k]) => [x, y * 0.98 - 0.02, k]), s), true, 4);
  // 火舌分离滴（舔火循环：低-高-灭）
  const dph = Math.abs(Math.round(sd)) % 3;
  if (s.drops !== false && s.H > 90 && dph !== 2) {
    const k = dph * 0.8, hx = (dph ? 0.1 : -0.12) + (hs(sd, 92) - 0.5) * 0.08;
    const up = 1.08 + k * 0.28, sz = 0.07 * (1 - k * 0.6);
    const P: Pt[] = [[0, 0.06], [0.05, 0.0], [0, -0.13, 1], [-0.05, 0.0]].map(([x, y, cr]) => [hx + (x / 0.07) * sz, -up + (y / 0.07) * sz, cr]);
    const dd = spline(spiritXf(P, s), true, 3);
    fillShape(c, dd, PAL.red, {seed: sd + 3, amp: 1, dx: REG.dx * 0.5, dy: REG.dy * 0.5});
    inkLoop(c, dd, {seed: sd + 4, w: Math.min(3.2, s.H * 0.016), amp: 1, t0: 3, t1: 6});
  }
  fillShape(c, outer, PAL.red, {seed: sd * 2, amp: 1.8, dx: REG.dx, dy: REG.dy});
  fillShape(c, inner, PAL.yel, {seed: sd * 2 + 1, amp: 1.6, dx: REG.dx, dy: REG.dy});
  if (s.H > 50) {
    const gl = spiritXf([[-0.2, -0.16], [-0.23, -0.28], [-0.19, -0.4]], s);
    inkStroke(c, gl, {seed: sd + 8, w: Math.max(3, s.H * 0.035), t0: 6, t1: 12, color: PAL.hi, amp: 1, heavy: 0});
  }
  const lw = Math.max(3.0, Math.min(6.5, s.H * 0.038));
  inkLoop(c, outer, {seed: sd * 2 + 2, w: lw, amp: 1.8, splits: 2, heavy: 0.45, t0: 10, t1: 20});
  if (s.face) {
    const eyeL = spiritXf([[-0.1, -0.36]], s)[0], eyeR = spiritXf([[0.1, -0.36]], s)[0];
    c.fillStyle = PAL.ink;
    c.beginPath(); c.arc(eyeL[0], eyeL[1], Math.max(2.2, s.H * 0.024), 0, 7); c.fill();
    c.beginPath(); c.arc(eyeR[0], eyeR[1], Math.max(2.2, s.H * 0.024), 0, 7); c.fill();
    const m = spiritXf([[-0.07, -0.22], [0, -0.18], [0.07, -0.22]], s);
    inkStroke(c, m, {seed: sd + 9, w: Math.max(2.4, s.H * 0.022), t0: 4, t1: 6, heavy: 0, amp: 0.8});
  }
  if (s.arms) {
    const sway = Math.sin(D.fq * 0.55) * 0.1;
    const armL = spiritXf([[-0.42, -0.3], [-0.62, -0.42 + sway], [-0.72, -0.62 - sway]], s);
    const armR = spiritXf([[0.42, -0.3], [0.64, -0.5 - sway], [0.78, -0.34 + sway]], s);
    inkStroke(c, armL, {seed: sd + 11, w: lw * 0.8, t0: 8, t1: 14, heavy: 0.3, amp: 1.4});
    inkStroke(c, armR, {seed: sd + 12, w: lw * 0.8, t0: 8, t1: 14, heavy: 0.3, amp: 1.4});
  }
}

// ---------------------------------------------------------------- 擦燃：smear / multiples 帧
export function drawStrikeSmear(c: CanvasCtx, cur: MatchPose, prev: MatchPose, D: DrawInfo, multiples: boolean): void {
  const f = D.fq;
  const sd = 330 + D.id;
  if (!multiples) {
    // smear：扫掠面 + 条纹 + 头沿路径拉长 ~260%
    const quad = [BUTT_OF(prev), [prev.hx, prev.hy], [cur.hx, cur.hy], BUTT_OF(cur)];
    fillShape(c, dens(quad, 5), PAL.hi, {seed: sd, amp: 1.5, dx: REG.dx, dy: REG.dy});
    for (let k = 0; k < 6; k++) {
      const u = 0.12 + k * 0.15 + hs(sd, k) * 0.05;
      const a = [lerp(prev.hx, BUTT_OF(prev)[0], u), lerp(prev.hy, BUTT_OF(prev)[1], u)];
      const b = [lerp(cur.hx, BUTT_OF(cur)[0], u), lerp(cur.hy, BUTT_OF(cur)[1], u)];
      inkStroke(c, [a, b], {seed: sd * 3 + k, w: 3, t0: 60, t1: 12, min: 0.05, amp: 1.2, heavy: 0});
    }
    drawMatch(c, {...cur, sy: 1}, D, 200);
    const dx = cur.hx - prev.hx, dy = cur.hy - prev.hy, L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L;
    const back = L * 1.1, r = 18;
    const P: Pt[] = [[r, 0], [r * 0.6, r * 0.85], [-back * 0.45, r * 0.55], [-back, 0, 1], [-back * 0.45, -r * 0.55], [r * 0.6, -r * 0.85]];
    const d = spline(xf(P, {x: cur.hx, y: cur.hy, r: Math.atan2(uy, ux)}), true, 4);
    fillShape(c, d, PAL.red, {seed: sd + 1, amp: 1.5, dx: REG.dx, dy: REG.dy});
    inkLoop(c, d, {seed: sd + 2, w: 5, amp: 1.5});
  } else {
    // multiples：前后两姿之间的三道残影
    for (let k = 0; k < 3; k++) {
      const u = 0.25 + k * 0.25;
      const e: MatchPose = {
        hx: lerp(prev.hx, cur.hx, u), hy: lerp(prev.hy, cur.hy, u), r: lerp(prev.r, cur.r, u), bend: cur.bend, charU: cur.charU,
      };
      inkStroke(c, [BUTT_OF(e), [e.hx, e.hy]], {seed: sd + 10 + k, w: 3.0, t0: 40, t1: 10, min: 0.1, amp: 1.2, heavy: 0});
      const hd = dens(xf(circlePts(0, -4, 16, 18, 19), {x: e.hx, y: e.hy, r: e.r}), 3);
      fillShape(c, hd, PAL.red, {seed: sd + 20 + k, amp: 1.2, dx: REG.dx, dy: REG.dy});
      inkLoop(c, hd, {seed: sd + 30 + k, w: 3.2, amp: 1.2});
    }
    drawMatch(c, {...cur, sy: 1}, D, 200);
  }
  // 磷面拖尾速度线
  speedLinesTrail(c, Math.min(prev.hx, cur.hx) - 24, cur.hy - 8, 4, sd, {dir: -1, len: 150, gap: 15});
}

// ---------------------------------------------------------------- 字幕 / 题字
export function drawSubs(c: CanvasCtx, f: number, D: DrawInfo): void {
  const sub = SUBS.find((s) => f >= s.from && f <= s.to);
  if (!sub) return;
  c.save();
  c.font = '700 29px "Noto Sans SC"';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const tw = c.measureText(sub.text).width;
  const cx = 640, cy = 656, bw = tw + 60, bh = 52;
  const jx = (hs(bv(D), 81) - 0.5) * 1.4, jy = (hs(bv(D), 82) - 0.5) * 1.4;
  const rect = [[cx - bw / 2, cy - bh / 2], [cx + bw / 2, cy - bh / 2], [cx + bw / 2, cy + bh / 2], [cx - bw / 2, cy + bh / 2]];
  fillShape(c, dens(rect, 6), PAL.hi, {seed: 610 + bv(D), amp: 1.4, dx: REG.dx * 0.6, dy: REG.dy * 0.6});
  inkLoop(c, dens(rect, 6), {seed: 620 + bv(D), w: 3.2, amp: 1.4, heavy: 0.25, t0: 8, t1: 12});
  c.translate(jx, jy);
  c.fillStyle = PAL.ink;
  c.fillText(sub.text, cx, cy + 1);
  c.restore();
}
export function drawTitle(c: CanvasCtx, f: number, D: DrawInfo, small: boolean): void {
  const born = small ? f - 327 : f - 12;
  if (born < 0) return;
  const sc = born === 0 ? 1.14 : born === 1 ? 1.0 : 1.0;
  const rot = born === 0 ? -0.045 : -0.022;
  const size = small ? 38 : 46;
  c.save();
  c.translate(small ? 288 : 640, small ? 92 : 118);
  c.rotate(rot);
  c.scale(sc, sc);
  const jx = (hs(bv(D), 63) - 0.5) * 1.5, jy = (hs(bv(D), 64) - 0.5) * 1.5;
  c.translate(jx, jy);
  c.font = `900 ${size}px "Noto Sans SC"`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const text = '一根火柴的一生';
  c.fillStyle = PAL.red; // 错位红版（off-register）
  c.fillText(text, REG.dx * 0.8, REG.dy * 0.8);
  c.fillStyle = PAL.ink;
  c.fillText(text, 0, 0);
  c.restore();
  // 沸腾下划线 + 角星
  const xc = small ? 288 : 640;
  const yb = (small ? 92 : 118) + size * 0.72;
  const half = size * 3.6;
  if (born >= 1) {
    inkStroke(c, [[xc - half, yb], [xc, yb + 4], [xc + half, yb]], {seed: 700 + bv(D), w: 4.4, t0: 30, t1: 30, amp: 1.6, heavy: 0.3});
    if (born >= 3 && bv(D) % 2 === 0) drawTwinkle(c, xc + half + 26, yb - 16, 13, 710 + bv(D), {rot: 0.3});
  }
}

