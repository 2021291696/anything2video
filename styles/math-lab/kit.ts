// math-lab 图元库（数学实验室：暗底发光几何 + 公式角标 + 一图一概念纪律）。
// 手法参考 prompt-motion.com「Math_files」数学可视化条目（RECON-pm-watch §2.12：手法研究、零素材搬运）；
// 辉光分层纪律机制借鉴 styles/crt-terminal phosphorGlow（白芯不糊 / 全片微呼吸 ±5%）与 neon 湿辉光思想。
// 全部 Remotion(React+TSX)+Canvas2D 重写，零整段拷贝。
// 确定性：全闭式数学（物理解 + hermite/monotone 重参数 + sin 呼吸），无随机源 / 无 Date / 无网络。
import {hermite1} from '../common/motion/hermite';
import {monotone} from '../common/motion/monotone';
import {CURVE_DONE, DROP_S, fallV, fallY, breath} from './choreo';

export type Ctx = CanvasRenderingContext2D;

// ---------------- 锁死 token（四色系统：青=几何 / 品红=曲线速度 / 琥珀=公式数量 / 紫=次级段） ----------------
export const PAL = {
  bg: '#050a16', // 近黑深蓝暗底
  cyan: '#38e1ff', // 球 / 轴 / 导引（几何）
  cyanDim: '#1d6d94',
  magenta: '#ff3d9e', // 曲线 / 速度矢量
  amber: '#ffb54d', // 公式高亮 / 数量柱
  violet: '#8f6bff', // 次级时间段
  ink: '#dfe9ff',
  dim: '#8fb0d8',
  faint: '#40628a',
  sub: '#d7e6f8',
  panel: 'rgba(8,15,30,0.74)',
  border: '#1c3a5e',
} as const;

// ---------------- 版面（1280×720） ----------------
export const TOP_Y = 90; // 释放点
export const GROUND_Y = 560; // 地面
export const PX_M = (GROUND_Y - TOP_Y) / 44.1; // 10.657 px/m（满程 44.1m）
export const X1 = 640; // SC01/02 落球轨
export const RULER_X = 598; // SC02 标尺（贴落球轨左缘，刻度与球路径同标尺）
export const X3 = 250; // SC03 左侧球板落球轨
export const OX = 650; // 曲线图原点（SC03/SC04 同坐标 → 无跳变续用）
export const OY = 520;
export const T_PX = 190; // px/s（3s → 570px，t 轴到 1220）
export const Y_PX = 390 / 44.1; // px/m（落差轴到 y=130）
export const W = 1280;
export const H = 720;

export const SERIF_I = 'italic Georgia, "Times New Roman", serif'; // 数学变量（LaTeX 观感）
export const MONO = 'Consolas, "Courier New", monospace';

// ---------------- 确定性缓动 / 光色 ----------------
export const easeInOut = hermite1([
  [0, 0],
  [1, 1],
]); // 段内平滑（端点零斜率）
/** 无过冲点亮轨（dim→lit，crt 纪律：点亮不许弹）。 */
export const litAt = (f: number, from: number, to: number): number => monotone([from, to], [0, 1])(f);
export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

const hexRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
/** 颜色插值（确定性，用于 ink→amber 点亮渐变）。 */
export function mixColor(a: string, b: string, p: number): string {
  const [r1, g1, b1] = hexRgb(a);
  const [r2, g2, b2] = hexRgb(b);
  return `rgb(${Math.round(r1 + (r2 - r1) * p)},${Math.round(g1 + (g2 - g1) * p)},${Math.round(b1 + (b2 - b1) * p)})`;
}

function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

// ---------------- 底座：暗底 / 网格弱辉光 / 暗角 ----------------
export function drawBackdrop(c: Ctx, gridP: number, b: number): void {
  c.fillStyle = PAL.bg;
  c.fillRect(0, 0, W, H);
  // 坐标网格弱辉光（呼吸 ±4%；crt 纪律：底层光只给氛围不给焦点）
  const ga = 0.1 * gridP * (0.96 + 0.08 * b);
  c.save();
  c.strokeStyle = `rgba(70,130,200,${ga.toFixed(3)})`;
  c.lineWidth = 1;
  c.shadowColor = PAL.cyanDim;
  c.shadowBlur = 4;
  c.beginPath();
  for (let x = 64; x < W; x += 64) {
    c.moveTo(x, 0);
    c.lineTo(x, H);
  }
  for (let y = 64; y < H; y += 64) {
    c.moveTo(0, y);
    c.lineTo(W, y);
  }
  c.stroke();
  c.restore();
  // 暗角（四角压暗，焦点居中——「暗室」气质）
  const vg = c.createRadialGradient(640, 330, 300, 640, 330, 800);
  vg.addColorStop(0, 'rgba(2,5,12,0)');
  vg.addColorStop(1, 'rgba(2,5,12,0.55)');
  c.fillStyle = vg;
  c.fillRect(0, 0, W, H);
  // 底部信息带渐变（HUD 面板衬底）
  const bg2 = c.createLinearGradient(0, 600, 0, 720);
  bg2.addColorStop(0, 'rgba(3,7,15,0)');
  bg2.addColorStop(1, 'rgba(3,7,15,0.5)');
  c.fillStyle = bg2;
  c.fillRect(0, 600, W, 120);
}

// ---------------- 落球：球 / 彗尾 / 释放环 / 速度矢量 ----------------
export function ballPos(t: number, x: number): {x: number; y: number} {
  return {x, y: TOP_Y + fallY(t) * PX_M};
}

export function drawBall(c: Ctx, t: number, x: number, trail = true): void {
  // 彗尾：历史位置闭式可倒推（确定性），速度快时自然拉开——「快得更多」的视觉证据
  if (trail) {
    for (let k = 12; k >= 1; k--) {
      const tk = t - k * 0.033;
      if (tk <= 0) continue;
      const p = ballPos(tk, x);
      c.fillStyle = PAL.cyan;
      c.globalAlpha = (1 - k / 13) * 0.3;
      c.beginPath();
      c.arc(p.x, p.y, Math.max(1.5, 11 * (1 - k / 16)), 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
  }
  const p = ballPos(t, x);
  c.save();
  c.shadowColor = PAL.cyan;
  c.shadowBlur = 18;
  c.fillStyle = '#f4faff'; // 白芯不糊
  c.beginPath();
  c.arc(p.x, p.y, 11, 0, Math.PI * 2);
  c.fill();
  c.restore();
  c.strokeStyle = PAL.cyan;
  c.lineWidth = 2.5;
  c.beginPath();
  c.arc(p.x, p.y, 11, 0, Math.PI * 2);
  c.stroke();
}

/** 释放环（10f 扩散消散）。 */
export function drawReleaseRing(c: Ctx, f: number, release: number, x: number): void {
  const p = (f - release) / 10;
  if (p < 0 || p > 1) return;
  c.save();
  c.strokeStyle = PAL.cyan;
  c.globalAlpha = 0.7 * (1 - p);
  c.lineWidth = 2;
  c.shadowColor = PAL.cyan;
  c.shadowBlur = 12;
  c.beginPath();
  c.arc(x, TOP_Y, 6 + 26 * p, 0, Math.PI * 2);
  c.stroke();
  c.restore();
}

/** SC02 速度矢量（品红，长度∝v；v=gt 线性生长——「每秒快得更多」）。 */
export function drawVelocityArrow(c: Ctx, t: number, x: number): void {
  if (t <= 0) return;
  const p = ballPos(t, x);
  const len = fallV(t) * 4.5;
  const ax = p.x + 34;
  c.save();
  c.strokeStyle = PAL.magenta;
  c.shadowColor = PAL.magenta;
  c.shadowBlur = 8;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(ax, p.y);
  c.lineTo(ax, p.y + len);
  c.stroke();
  c.fillStyle = PAL.magenta;
  c.beginPath();
  c.moveTo(ax, p.y + len + 9);
  c.lineTo(ax - 5.5, p.y + len - 2);
  c.lineTo(ax + 5.5, p.y + len - 2);
  c.closePath();
  c.fill();
  c.shadowBlur = 0;
  c.font = SERIF_I.replace('Georgia', '16px Georgia');
  c.fillStyle = PAL.magenta;
  c.fillText('v', ax + 12, p.y + len / 2);
  c.restore();
}

// ---------------- SC02 标尺：秒刻度 + 已落段着色（1:3:5 可见） ----------------
export function drawRuler(c: Ctx, f: number, t: number): void {
  const inP = easeInOut(clamp01((f - 82) / 10));
  c.save();
  c.globalAlpha = inP;
  // 已落段着色：[0,4.9] 青 / [4.9,19.6] 紫（次级）
  const segs: Array<{y0: number; y1: number; col: string}> = [
    {y0: 0, y1: 4.9, col: PAL.cyan},
    {y0: 4.9, y1: 19.6, col: PAL.violet},
  ];
  for (const s of segs) {
    if (t <= s.y0) continue;
    const y1 = TOP_Y + Math.min(t, s.y1) * PX_M;
    const y0 = TOP_Y + s.y0 * PX_M;
    c.fillStyle = s.col;
    c.globalAlpha = inP * 0.3;
    c.fillRect(RULER_X - 3, y0, 6, y1 - y0);
    c.globalAlpha = inP;
  }
  // 标尺基线（全高弱光=量具）+ 已量段（亮）：秒刻度 t=1s（4.9m）f112 起 / t=2s（19.6m）f142 起
  c.strokeStyle = PAL.cyanDim;
  c.globalAlpha = inP * 0.4;
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(RULER_X, TOP_Y);
  c.lineTo(RULER_X, GROUND_Y);
  c.stroke();
  c.globalAlpha = inP;
  c.strokeStyle = PAL.cyan;
  c.lineWidth = 2.5;
  c.shadowColor = PAL.cyan;
  c.shadowBlur = 6;
  c.beginPath();
  c.moveTo(RULER_X, TOP_Y);
  c.lineTo(RULER_X, TOP_Y + Math.min(t, 44.1) * PX_M);
  c.moveTo(RULER_X - 10, GROUND_Y);
  c.lineTo(RULER_X + 10, GROUND_Y);
  c.stroke();
  c.shadowBlur = 0;
  // 秒刻度：t=1s（4.9m）f112 起 / t=2s（19.6m）f142 起
  const ticks = [
    {m: 4.9, at: 112, label: '4.9 m'},
    {m: 19.6, at: 142, label: '19.6 m'},
  ];
  for (const tk of ticks) {
    const pop = litAt(f, tk.at, tk.at + 6);
    if (pop <= 0) continue;
    const y = TOP_Y + tk.m * PX_M;
    c.globalAlpha = inP * pop;
    c.strokeStyle = PAL.amber;
    c.lineWidth = 2;
    c.shadowColor = PAL.amber;
    c.shadowBlur = 8;
    c.beginPath();
    c.moveTo(RULER_X - 12, y);
    c.lineTo(RULER_X + 12, y);
    c.stroke();
    c.shadowBlur = 0;
    c.font = `13px ${MONO}`;
    c.textAlign = 'right';
    c.fillStyle = PAL.amber;
    c.fillText(tk.label, RULER_X - 18, y + 4);
    c.textAlign = 'left';
  }
  c.restore();
}

// ---------------- 曲线图：轴 / 描线 / 导引联动 ----------------
export const curvePt = (t: number): {x: number; y: number} => ({x: OX + t * T_PX, y: OY - fallY(t) * Y_PX});

export function drawAxes(c: Ctx, p: number): void {
  if (p <= 0) return;
  c.save();
  c.strokeStyle = PAL.cyanDim;
  c.lineWidth = 2;
  c.shadowColor = PAL.cyanDim;
  c.shadowBlur = 6;
  // t 轴（向右）与落差轴（向上），按进度画出
  c.beginPath();
  c.moveTo(OX, OY);
  c.lineTo(OX + 570 * p + (p >= 1 ? 8 : 0), OY);
  c.moveTo(OX, OY);
  c.lineTo(OX, OY - 390 * p - (p >= 1 ? 8 : 0));
  c.stroke();
  c.shadowBlur = 0;
  if (p >= 1) {
    c.font = `13px ${MONO}`;
    c.fillStyle = PAL.dim;
    c.textAlign = 'center';
    for (let k = 1; k <= 3; k++) {
      const x = OX + k * 190;
      c.strokeStyle = PAL.faint;
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(x, OY - 5);
      c.lineTo(x, OY + 5);
      c.stroke();
      c.fillText(String(k), x, OY + 22);
    }
    c.fillStyle = PAL.faint;
    c.textAlign = 'left';
    c.fillText('t/s', OX + 578, OY + 4);
    c.font = '13px "Noto Sans SC"';
    c.fillText('落差 y/m', OX + 8, OY - 396);
  }
  c.restore();
}

/** 发光曲线描线：0→tNow 实时生长（描线书写感；呼吸 ±12% 辉光）。 */
export function drawCurve(c: Ctx, tNow: number, b: number, extraGlow = 0): void {
  if (tNow <= 0) return;
  c.save();
  c.strokeStyle = PAL.magenta;
  c.lineWidth = 3.5;
  c.lineCap = 'round';
  c.shadowColor = PAL.magenta;
  c.shadowBlur = 14 + 6 * b + extraGlow;
  c.globalAlpha = 0.85 + 0.15 * b;
  c.beginPath();
  const STEPS = 90;
  for (let i = 0; i <= STEPS; i++) {
    const tt = (tNow * i) / STEPS;
    const p = curvePt(tt);
    if (i === 0) c.moveTo(p.x, p.y);
    else c.lineTo(p.x, p.y);
  }
  c.stroke();
  c.restore();
}

/** SC03 三重联动导引：球 ↔ 曲线点 ↔ 轴刻度（虚线青）。 */
export function drawGuides(c: Ctx, t: number, ballX: number): void {
  if (t <= 0 || t >= DROP_S) return;
  const bp = ballPos(t, ballX);
  const cp = curvePt(t);
  c.save();
  c.strokeStyle = PAL.cyan;
  c.globalAlpha = 0.5;
  c.lineWidth = 1.5;
  c.setLineDash([5, 6]);
  c.beginPath();
  c.moveTo(bp.x, bp.y);
  c.lineTo(cp.x, cp.y);
  c.moveTo(cp.x, cp.y);
  c.lineTo(cp.x, OY);
  c.moveTo(cp.x, cp.y);
  c.lineTo(OX, cp.y);
  c.stroke();
  c.setLineDash([]);
  // 曲线点标记（青环）
  c.shadowColor = PAL.cyan;
  c.shadowBlur = 10;
  c.strokeStyle = PAL.cyan;
  c.lineWidth = 2;
  c.beginPath();
  c.arc(cp.x, cp.y, 5, 0, Math.PI * 2);
  c.stroke();
  c.restore();
}

/** 能量点沿曲线巡行（SC04 常驻；冻结段即合法微动效）。 */
export function drawEnergyDot(c: Ctx, f: number, from: number): void {
  if (f < from) return;
  const td = (((f - from) / 30 + 0.6) % DROP_S);
  for (const [dt, a] of [
    [0, 1],
    [0.06, 0.45],
    [0.12, 0.2],
  ] as const) {
    const tt = td - dt;
    if (tt < 0) continue;
    const p = curvePt(tt);
    c.save();
    c.globalAlpha = a;
    c.shadowColor = PAL.amber;
    c.shadowBlur = 16;
    c.fillStyle = dt === 0 ? '#fff3df' : PAL.amber;
    c.beginPath();
    c.arc(p.x, p.y, dt === 0 ? 4.5 : 3, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
}

// ---------------- SC04 数量柱（×1/×4/×9）+ ∝t² 括式 ----------------
export function drawColumns(c: Ctx, f: number): void {
  const cols = [
    {k: 1, at: 250},
    {k: 2, at: 262},
    {k: 3, at: 274},
  ];
  for (const col of cols) {
    const rise = easeInOut(clamp01((f - col.at) / 10));
    if (rise <= 0) continue;
    const x = OX + col.k * 190;
    const top = curvePt(col.k).y;
    const yTop = OY - (OY - top) * rise;
    c.save();
    c.fillStyle = 'rgba(255,181,77,0.16)';
    c.strokeStyle = PAL.amber;
    c.lineWidth = 2;
    c.shadowColor = PAL.amber;
    c.shadowBlur = 10;
    c.fillRect(x - 13, yTop, 26, OY - yTop);
    c.strokeRect(x - 13, yTop, 26, OY - yTop);
    c.shadowBlur = 0;
    c.globalAlpha = rise;
    c.font = `700 18px ${MONO}`;
    c.textAlign = 'center';
    c.fillStyle = PAL.amber;
    c.fillText(`×${col.k * col.k}`, x, yTop - 14);
    c.font = SERIF_I.replace('Georgia', '15px Georgia');
    c.fillStyle = PAL.dim;
    c.fillText(col.k === 1 ? 't' : `${col.k}t`, x, OY + 44);
    c.restore();
  }
}

/** 「y ∝ t²」括式（琥珀，随 S04b「这就是…规律」点亮，呼吸辉光）。 */
export function drawBracket(c: Ctx, f: number, b: number): void {
  const p = litAt(f, 284, 290);
  if (p <= 0) return;
  c.save();
  c.globalAlpha = p * (0.85 + 0.15 * b);
  c.font = SERIF_I.replace('Georgia', '27px Georgia');
  c.textAlign = 'center';
  c.fillStyle = PAL.amber;
  c.shadowColor = PAL.amber;
  c.shadowBlur = 12 + 5 * b;
  c.fillText('y ∝ t²', OX + 380, 96);
  c.restore();
}

// ---------------- HUD：品牌 / 幕概念 / 公式角标 / t 时码 / 字幕 ----------------
export function drawHud(c: Ctx, f: number, concept: string, conceptPrev: string, fadeP: number): void {
  c.save();
  // 品牌（左上）
  c.fillStyle = PAL.cyan;
  c.globalAlpha = 0.85;
  c.fillRect(28, 32, 8, 8);
  try {
    (c as unknown as {letterSpacing: string}).letterSpacing = '3px';
  } catch {
    /* 旧内核忽略 */
  }
  c.font = `700 14px ${MONO}`;
  c.fillStyle = PAL.cyanDim;
  c.textAlign = 'left';
  c.fillText('MATH·LAB', 44, 41);
  try {
    (c as unknown as {letterSpacing: string}).letterSpacing = '0px';
  } catch {
    /* 同上 */
  }
  // 右上角标
  c.font = `12px ${MONO}`;
  c.fillStyle = PAL.faint;
  c.textAlign = 'right';
  c.fillText('FREE FALL · g = 9.8 m/s²', 1252, 41);
  // 幕概念标签（一图一概念；换幕 8f 交叉淡化）
  c.font = '20px "Noto Sans SC"';
  c.textAlign = 'left';
  if (fadeP < 1 && conceptPrev) {
    c.globalAlpha = 1 - fadeP;
    c.fillStyle = PAL.dim;
    c.fillText(conceptPrev, 28, 68);
  }
  c.globalAlpha = fadeP;
  c.fillStyle = PAL.ink;
  c.fillText(concept, 28, 68);
  c.restore();
}

/** 公式角标（左下）：LaTeX 观感（衬线斜体变量 + 堆叠分数 + 真上标），随讲逐字点亮，t² 于曲线完成时转琥珀。 */
export function drawFormula(c: Ctx, f: number, readout: string, b: number): void {
  const x0 = 24;
  const y0 = 632;
  const w = 336;
  const h = 68;
  c.save();
  // 面板（点亮后面框转琥珀微呼吸）
  const lit = litAt(f, CURVE_DONE, CURVE_DONE + 8);
  c.fillStyle = PAL.panel;
  rr(c, x0, y0, w, h, 8);
  c.fill();
  c.strokeStyle = lit > 0 ? mixColor(PAL.border, PAL.amber, 0.35 + 0.3 * b) : PAL.border;
  c.lineWidth = 1.5;
  rr(c, x0, y0, w, h, 8);
  c.stroke();
  // 公式行：y = ½ g t²（7 个排版单元逐字点亮 f31-72）
  const units = 7;
  const shown = Math.ceil(litAt(f, 31, 72) * units);
  if (shown <= 0) {
    c.restore();
    return;
  }
  let x = x0 + 22;
  const cy = y0 + 22; // 公式行基线（上移，给读出行留净空）
  const tCol = mixColor(PAL.ink, PAL.amber, lit);
  const vis = (i: number): boolean => shown >= i;
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  if (vis(1)) {
    c.font = SERIF_I.replace('Georgia', '29px Georgia');
    c.fillStyle = PAL.ink;
    c.shadowColor = PAL.cyan;
    c.shadowBlur = 6;
    c.fillText('y', x, cy + 8);
    x += c.measureText('y').width + 10;
  }
  c.shadowBlur = 0;
  if (vis(2)) {
    c.font = `22px ${MONO}`;
    c.fillStyle = PAL.dim;
    c.fillText('=', x, cy + 6);
    x += 24;
  }
  if (vis(3)) {
    // 堆叠分数 ½
    c.font = `13px ${MONO}`;
    c.fillStyle = PAL.ink;
    c.textAlign = 'center';
    c.fillText('1', x + 7, cy - 3);
    c.fillText('2', x + 7, cy + 15);
    c.strokeStyle = PAL.ink;
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(x - 2, cy + 1);
    c.lineTo(x + 16, cy + 1);
    c.stroke();
    c.textAlign = 'left';
    x += 26;
  }
  if (vis(4)) {
    c.font = SERIF_I.replace('Georgia', '26px Georgia');
    c.fillStyle = PAL.ink;
    c.fillText('g', x, cy + 8);
    x += c.measureText('g').width + 8;
  }
  if (vis(5)) {
    c.font = `20px ${MONO}`;
    c.fillStyle = PAL.dim;
    c.fillText('·', x, cy + 6);
    x += 14;
  }
  if (vis(6)) {
    c.font = SERIF_I.replace('Georgia', '28px Georgia');
    c.fillStyle = tCol;
    c.shadowColor = PAL.amber;
    c.shadowBlur = lit * 10;
    c.fillText('t', x, cy + 8);
    x += c.measureText('t').width;
  }
  if (vis(7)) {
    c.font = SERIF_I.replace('Georgia', '17px Georgia');
    c.fillStyle = tCol;
    c.fillText('2', x + 1, cy - 6);
  }
  c.shadowBlur = 0;
  // 数值联动读出（琥珀等宽；球↔曲线↔公式的「量」同一帧对上）
  c.font = `13px ${MONO}`;
  c.fillStyle = PAL.amber;
  c.globalAlpha = 0.92;
  c.fillText(readout, x0 + 22, y0 + 54);
  c.restore();
}

/** t 时码（右下；实验时钟贯穿全片）。 */
export function drawTimecode(c: Ctx, t: number): void {
  const x = 1112;
  const y = 632;
  const w = 144;
  const h = 68;
  c.save();
  c.fillStyle = PAL.panel;
  rr(c, x, y, w, h, 8);
  c.fill();
  c.strokeStyle = PAL.border;
  c.lineWidth = 1.5;
  rr(c, x, y, w, h, 8);
  c.stroke();
  c.font = `600 24px ${MONO}`;
  c.fillStyle = PAL.ink;
  c.textAlign = 'center';
  c.fillText(`t = ${t.toFixed(2)}`, x + w / 2 - 6, y + 32);
  c.font = `13px ${MONO}`;
  c.fillStyle = PAL.faint;
  c.fillText('s', x + w - 20, y + 32);
  c.font = `11px ${MONO}`;
  c.fillStyle = PAL.faint;
  c.fillText('实验时钟', x + w / 2, y + 54);
  c.restore();
}

/** 字幕（底部居中，实验室 HUD 风：细影不描边；headless 下 Noto 只用 400 防合成粗体烂字形）。 */
export function drawSubs(c: Ctx, f: number, subs: Array<{from: number; to: number; text: string}>): void {
  const sub = subs.find((s) => f >= s.from && f <= s.to);
  if (!sub) return;
  c.save();
  c.font = '400 26px "Noto Sans SC"';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.shadowColor = 'rgba(0,0,0,0.85)';
  c.shadowBlur = 7;
  c.fillStyle = PAL.sub;
  c.fillText(sub.text, 640, 668);
  c.restore();
}

/** 地面线（SC01/02 落球轨下）。 */
export function drawGround(c: Ctx, x: number): void {
  c.save();
  c.strokeStyle = 'rgba(56,225,255,0.25)';
  c.lineWidth = 2;
  c.shadowColor = PAL.cyanDim;
  c.shadowBlur = 5;
  c.beginPath();
  c.moveTo(x - 170, GROUND_Y);
  c.lineTo(x + 170, GROUND_Y);
  c.stroke();
  c.restore();
}
