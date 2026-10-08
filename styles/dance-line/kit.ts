// dance-line 风格图元库（凯斯·哈林粗线涂鸦）——纯 Canvas2D 函数，逐帧确定性（mulberry32/hash2，禁 Math.random/Date）。
// 机制与参数借鉴 huashu-art-motion（MIT, alchaincyf）references/风格配方/31_haring.md + scenes/31_haring.js：
//   粗 13px 圆头等宽黑线+平涂（一切形体一套线宽）、并集轮廓（先全描 2×LW 黑再统一上色）、
//   4 姿势 8fps 硬切不插值、放射动作线（椭圆 n 短直线 8fps 换角）、光芒宝宝两帧交替+红心放射、
//   关节露洞补丁盘（RIG.limb 反向端帽坑的解法）、细线发丝不实现（违背等宽纪律）——全部 TSX/Canvas2D 重写，零整段拷贝。
import {delayRender, continueRender, staticFile} from 'remotion';
import {BPM, bounce, poseIndex, step8} from './bpm';

// ---------------- 锁死 token（纯色平涂，无渐变） ----------------
export const PAL = {
  yel: '#ffd51c', // 黄墙
  green: '#16a54a', // 绿地
  ink: '#111111', // 黑线
  red: '#e8262b', // 红
  blue: '#1f62d6', // 蓝
  pink: '#ff6fb0', // 粉
  org: '#ff8a1c', // 橙（狗/第五只）
  white: '#ffffff', // 光芒宝宝/高光
} as const;

export type CanvasCtx = CanvasRenderingContext2D;
export type Pt = [number, number];

/** 等宽线宽：一切形体一套线宽=风格的一半。 */
export const LW = 13;
export const WALL_H = 458; // 黄墙/绿地分界（14px 黑地平线）
export const TAU = Math.PI * 2;

// ---------------- 种子随机（逐帧确定性） ----------------
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
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

// ---------------- 字体（字幕/题字：Noto Sans SC，模板附带 OFL） ----------------
let FONTS: {done: () => void} | null = null;
function ensureFonts(): void {
  if (FONTS) return;
  const handle = delayRender('dance-line-fonts');
  FONTS = {done: () => continueRender(handle)};
  const ff = new FontFace('Noto Sans SC', `url(${staticFile('fonts/NotoSansSC.ttf')})`, {weight: '100 900'} as FontFaceDescriptors);
  ff.load().then(() => {
    (document.fonts as unknown as {add: (f: FontFace) => void}).add(ff);
    FONTS?.done();
  }).catch(() => FONTS?.done());
}
ensureFonts();

// ---------------- 跳舞小人：4 姿势表（局部坐标，原点=脚底中心，朝上为负）——硬切不插值 ----------------
export type Pose = {
  head: Pt; neck: Pt; hip: Pt;
  hl: Pt; hr: Pt; // 手
  kl: Pt; kr: Pt; // 膝
  fl: Pt; fr: Pt; // 脚
};
export const POSES: Pose[] = [
  {head: [0, -208], neck: [0, -166], hip: [0, -88], hl: [-96, -244], hr: [96, -244], kl: [-52, -46], kr: [52, -46], fl: [-92, 0], fr: [92, 0]}, // 展开跳
  {head: [8, -202], neck: [4, -162], hip: [0, -88], hl: [-88, -120], hr: [104, -236], kl: [-40, -48], kr: [66, -56], fl: [-52, 0], fr: [116, -30]}, // 右挥
  {head: [-8, -202], neck: [-4, -162], hip: [0, -88], hl: [-104, -236], hr: [88, -120], kl: [-66, -56], kr: [40, -48], fl: [-116, -30], fr: [52, 0]}, // 左挥
  {head: [0, -224], neck: [0, -180], hip: [0, -98], hl: [-118, -256], hr: [118, -256], kl: [-58, -60], kr: [58, -60], fl: [-104, -16], fr: [104, -16]}, // 星跳
];

export type DancerSpec = {
  x: number; y: number; // 脚底着地点（世界坐标）
  s: number; // 整体缩放
  color: string;
  flip?: 1 | -1; // 镜像
  posePhase?: number; // 姿势步相位（8fps 表错拍）
  bouncePhase?: number; // BPM 弹跳相位（拍）
  jump: number; // 弹跳高度 px
  eye?: boolean; // 眼点
  lips?: boolean; // 唇（主角）
  poseLock?: number; // 姿势锁（音乐响起前排排站：定姿势不弹）
};

/**
 * 跳舞小人：并集轮廓两遍法——
 *   pass1 全部肢体/头以（色宽+2LW）描黑 + 关节补丁黑盘（粗描边下关节露洞的补丁方案）；
 *   pass2 同路径以色宽重描 + 关节补丁色盘 + 头圆填色；最后眼点（+唇）。
 * 姿势 k=poseIndex(t·8fps) 硬切，绝不插值；dy=-jump·bounce(t,phase) 全员跟 BPM。
 */
export function drawDancer(c: CanvasCtx, d: DancerSpec, t: number): void {
  const k = d.poseLock !== undefined ? d.poseLock : poseIndex(t, 4, d.posePhase ?? 0);
  const p = POSES[k];
  const bb = d.poseLock !== undefined ? 0 : bounce(t, d.bouncePhase ?? 0);
  // 落地压扁/腾空拉长（绕脚底着地点）
  const sy = 1 - 0.05 * (1 - bb), sx = 1 + 0.04 * (1 - bb);
  const dy = -d.jump * bb;
  const T = (q: Pt): Pt => [d.x + (q[0] * d.s * (d.flip ?? 1)) * sx, d.y + dy + q[1] * d.s * sy];
  const lines: [Pt, Pt][] = [
    [T(p.neck), T(p.hip)], [T(p.neck), T(p.hl)], [T(p.neck), T(p.hr)],
    [T(p.hip), T(p.kl)], [T(p.kl), T(p.fl)], [T(p.hip), T(p.kr)], [T(p.kr), T(p.fr)],
  ];
  const headC = T(p.head);
  const headR = 34 * d.s;
  const joints: Pt[] = [T(p.neck), T(p.hip), T(p.kl), T(p.kr)];
  const limbW = Math.max(10, LW * Math.max(0.85, d.s)); // 等宽纪律：近黑一套线宽，只随主角/墙员两档
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  // pass1 黑描边（并集外轮廓）
  c.strokeStyle = PAL.ink;
  c.lineWidth = limbW + 2 * LW;
  for (const [a, b] of lines) {
    c.beginPath();
    c.moveTo(a[0], a[1]);
    c.lineTo(b[0], b[1]);
    c.stroke();
  }
  c.fillStyle = PAL.ink;
  for (const j of joints) {
    c.beginPath();
    c.arc(j[0], j[1], (limbW + 2 * LW) / 2 - 1, 0, TAU);
    c.fill();
  }
  c.beginPath();
  c.arc(headC[0], headC[1], headR + LW, 0, TAU);
  c.fill();
  // pass2 平涂
  c.strokeStyle = d.color;
  c.lineWidth = limbW;
  for (const [a, b] of lines) {
    c.beginPath();
    c.moveTo(a[0], a[1]);
    c.lineTo(b[0], b[1]);
    c.stroke();
  }
  c.fillStyle = d.color;
  for (const j of joints) {
    c.beginPath();
    c.arc(j[0], j[1], limbW / 2 - 1, 0, TAU);
    c.fill();
  }
  c.beginPath();
  c.arc(headC[0], headC[1], headR, 0, TAU);
  c.fill();
  // 五官只留眼点+唇（哈林人物本无五官；留一点为认人——INDEX 短板修正）
  if (d.eye !== false) {
    c.fillStyle = PAL.ink;
    c.beginPath();
    c.arc(headC[0] + 12 * d.s * (d.flip ?? 1), headC[1] - 4 * d.s, Math.max(3, 5.5 * d.s), 0, TAU);
    c.fill();
  }
  if (d.lips) {
    c.strokeStyle = PAL.ink;
    c.lineWidth = Math.max(5, 6 * d.s);
    c.beginPath();
    c.moveTo(headC[0] + 4 * d.s * (d.flip ?? 1), headC[1] + 14 * d.s);
    c.lineTo(headC[0] + 18 * d.s * (d.flip ?? 1), headC[1] + 12 * d.s);
    c.stroke();
  }
  c.restore();
  // 手旁动作弧（8fps 随姿势换）
  actionArcs(c, T(p.hl), T(p.hr), d.s, k, d.flip ?? 1);
}

/** 手旁动作弧：哈林小人挥动手臂的「动作线」记号，8fps 硬切换边。 */
export function actionArcs(c: CanvasCtx, hl: Pt, hr: Pt, s: number, k: number, flip: 1 | -1): void {
  c.save();
  c.strokeStyle = PAL.ink;
  c.lineWidth = Math.max(6, 8 * s);
  c.lineCap = 'round';
  const side = (k + (flip === -1 ? 1 : 0)) % 2; // 硬切换边
  const q = side === 0 ? hr : hl;
  c.beginPath();
  c.arc(q[0], q[1], 42 * s, side === 0 ? -0.7 : 2.3, side === 0 ? 0.5 : 3.5);
  c.stroke();
  c.restore();
}

// ---------------- 放射动作线：物体外围椭圆 n 根短直线，8fps 换角换长（half=true 只取上半环，避免扫腿） ----------------
export function radialLines(c: CanvasCtx, cx: number, cy: number, rx: number, ry: number, n: number, t: number, seed: number, len = 32, lw = 8, half = false): void {
  const st = step8(t);
  const r = mulberry32(seed * 97 + st * 13);
  c.save();
  c.strokeStyle = PAL.ink;
  c.lineWidth = lw;
  c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = half ? -Math.PI + (i / (n - 1)) * Math.PI : (i / n) * TAU + r() * 0.5;
    const x0 = cx + Math.cos(a) * rx, y0 = cy + Math.sin(a) * ry;
    const L = len * (0.7 + r() * 0.6);
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x0 + Math.cos(a) * L, y0 + Math.sin(a) * L);
    c.stroke();
  }
  c.restore();
}

// ---------------- 光芒宝宝（窗内）：白色并集剪影两帧交替爬 + 14 根光芒长短 8fps 交替 ----------------
export function radiantBaby(c: CanvasCtx, x: number, y: number, s: number, t: number): void {
  const st = step8(t);
  // 光芒：半圆 14 根，长短两帧交替
  c.save();
  c.strokeStyle = PAL.ink;
  c.lineWidth = 10;
  c.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const a = -Math.PI + (i / 13) * Math.PI;
    const L = (i + st) % 2 ? 40 : 66;
    c.beginPath();
    c.moveTo(x + Math.cos(a) * 120 * s, y + Math.sin(a) * 96 * s);
    c.lineTo(x + Math.cos(a) * (120 * s + L), y + Math.sin(a) * (96 * s + L));
    c.stroke();
  }
  c.restore();
  // 爬行宝宝：两帧交替（四肢前后换位），并集轮廓（黑描边 pass + 白色 pass）
  const cr = st % 2;
  const B = (q: Pt): Pt => [x + q[0] * s, y + q[1] * s];
  const lines: [Pt, Pt][] = [
    [B([-40, -10]), B([40, -20])], // 身
    [B([-34, 0]), B([-60 + cr * 14, 50])], [B([30, -8]), B([60 - cr * 14, 50])], // 腿
    [B([-30, -14]), B([-66 + cr * 10, -58])], [B([34, -18]), B([64 - cr * 10, -54])], // 臂
  ];
  const headC = B([-82, -40]);
  c.save();
  c.lineCap = 'round';
  c.strokeStyle = PAL.ink;
  c.lineWidth = 20;
  for (const [a, b] of lines) {
    c.beginPath();
    c.moveTo(a[0], a[1]);
    c.lineTo(b[0], b[1]);
    c.stroke();
  }
  c.fillStyle = PAL.ink;
  c.beginPath();
  c.arc(headC[0], headC[1], 40 * s + 10, 0, TAU);
  c.fill();
  c.strokeStyle = PAL.white;
  for (const [a, b] of lines) {
    c.beginPath();
    c.moveTo(a[0], a[1]);
    c.lineTo(b[0], b[1]);
    c.stroke();
  }
  c.fillStyle = PAL.white;
  c.beginPath();
  c.arc(headC[0], headC[1], 40 * s, 0, TAU);
  c.fill();
  c.restore();
}

// ---------------- 红心：跳动（相位 0.5）+ 放射线 ----------------
export function heart(c: CanvasCtx, x: number, y: number, s: number, t: number, beatOn: boolean, phase = 0.5): void {
  const b = beatOn ? 1 + 0.15 * bounce(t, phase) : 1;
  const p = new Path2D();
  p.moveTo(x, y + 40 * s * b);
  p.bezierCurveTo(x - 70 * s * b, y - 10 * s * b, x - 40 * s * b, y - 60 * s * b, x, y - 28 * s * b);
  p.bezierCurveTo(x + 40 * s * b, y - 60 * s * b, x + 70 * s * b, y - 10 * s * b, x, y + 40 * s * b);
  p.closePath();
  c.save();
  c.lineJoin = 'round';
  c.fillStyle = PAL.red;
  c.fill(p);
  c.strokeStyle = PAL.ink;
  c.lineWidth = LW;
  c.stroke(p);
  c.restore();
  if (beatOn) radialLines(c, x, y - 6 * s, 80 * s, 72 * s, 10, t, 5, 30, 8);
}

// ---------------- 吠犬：橙底粗线，吠叫两姿势（嘴开合 8fps）+ 尾摆，相位 0.75 跟 BPM ----------------
export function dog(c: CanvasCtx, x: number, y: number, s: number, t: number, beatOn: boolean, phase = 0.75): void {
  const bb = beatOn ? bounce(t, phase) : 0;
  const dy = -14 * s * bb;
  const sy = 1 - 0.05 * (1 - bb), sx = 1 + 0.04 * (1 - bb);
  const st = step8(t);
  const bark = st % 2 === 0; // 吠叫两姿势：嘴开/合
  const legPh = st % 2; // 四腿两姿态
  const P = (q: Pt): Pt => [x + q[0] * s * sx, y + dy + q[1] * s * sy];
  const bodyA = P([-70, -58]), bodyB = P([58, -66]); // 脊线
  const headC = P([92, -104]);
  const legs: [Pt, Pt][] = [
    [P([-52, -56]), P(legPh ? [-64, 0] : [-40, 0])],
    [P([-24, -58]), P(legPh ? [-10, 0] : [-34, 0])],
    [P([30, -62]), P(legPh ? [44, 0] : [20, 0])],
    [P([54, -64]), P(legPh ? [70, 0] : [48, 0])],
  ];
  const tail: [Pt, Pt] = [bodyB, P([96 + (legPh ? 8 : -4), -128])];
  const snoutUp = P([128, -128]);
  const jaw = P([124 + (bark ? 0 : 8), bark ? -86 : -100]);
  const parts: [Pt, Pt][] = [[bodyA, bodyB], ...legs, tail, [headC, snoutUp], [headC, jaw]];
  const w = LW + 8;
  c.save();
  c.lineCap = 'round';
  c.strokeStyle = PAL.ink;
  c.lineWidth = w + 2 * LW;
  for (const [a, b] of parts) {
    c.beginPath();
    c.moveTo(a[0], a[1]);
    c.lineTo(b[0], b[1]);
    c.stroke();
  }
  c.fillStyle = PAL.ink;
  c.beginPath();
  c.arc(headC[0], headC[1], 30 * s + LW, 0, TAU);
  c.fill();
  c.strokeStyle = PAL.org;
  c.lineWidth = w;
  for (const [a, b] of parts) {
    c.beginPath();
    c.moveTo(a[0], a[1]);
    c.lineTo(b[0], b[1]);
    c.stroke();
  }
  c.fillStyle = PAL.org;
  c.beginPath();
  c.arc(headC[0], headC[1], 30 * s, 0, TAU);
  c.fill();
  // 眼点+耳
  c.fillStyle = PAL.ink;
  c.beginPath();
  c.arc(headC[0] + 10 * s, headC[1] - 6 * s, 4.5 * s, 0, TAU);
  c.fill();
  c.strokeStyle = PAL.ink;
  c.lineWidth = 9;
  c.beginPath();
  c.moveTo(headC[0] - 12 * s, headC[1] - 24 * s);
  c.lineTo(headC[0] - 30 * s, headC[1] - (bark ? 46 : 38) * s);
  c.stroke();
  c.restore();
  if (beatOn) radialLines(c, headC[0] + 18 * s, headC[1] - 10 * s, 52 * s, 48 * s, 7, t, 7, 26, 7);
}

// ---------------- 入场硬切爆发星：一帧放射短线（小人硬切入场/跳下的记号） ----------------
export function burst(c: CanvasCtx, x: number, y: number, r: number, t: number, seed: number): void {
  radialLines(c, x, y, r, r * 0.9, 9, t, seed, r * 0.5, 9);
}

// ---------------- 地上「跳起」横线：长度随拍伸缩（哈林的跳起来标志） ----------------
export function jumpMarks(c: CanvasCtx, pts: [number, number][], t: number, beatOn: boolean): void {
  const bb = beatOn ? bounce(t, 0) : 0;
  c.save();
  c.strokeStyle = PAL.ink;
  c.lineWidth = 9;
  c.lineCap = 'round';
  for (const [x, y] of pts) {
    const L = 30 + 30 * (1 - bb);
    c.beginPath();
    c.moveTo(x - L, y);
    c.lineTo(x + L, y);
    c.stroke();
  }
  c.restore();
}

// ---------------- 题字「空墙的舞蹈」：粗马克笔黑字 + 红色粗下划线，8fps 微跳 ----------------
export function markerTitle(c: CanvasCtx, text: string, cx: number, cy: number, size: number, k: number): void {
  if (k <= 0) return;
  c.save();
  // weight 400 + strokeText 增粗：该 NotoSansSC.ttf 在 headless-shell 下合成粗体（700/900）会烂字形（实测 f300/f367 同型损伤，字幕 400 正常）。
  c.font = `400 ${size}px "Noto Sans SC"`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const st = step8(k * 0.375); // 写出期间也按 8fps 微跳
  const chars = [...text];
  const widths = chars.map((ch) => c.measureText(ch).width);
  const gap = size * 0.14;
  const total = widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
  let x = cx - total / 2;
  chars.forEach((ch, i) => {
    // 整字硬切浮现（8fps 逐字跳入，不裁切——逐字 clip 在 headless 下会烂字形，实测同型损伤）
    const charK = clamp(k * chars.length * 1.05 - i * 0.9);
    if (charK >= 0.35) {
      const jx = (hash2(i * 7 + 1, st, 31) - 0.5) * 3;
      const jy = (hash2(i * 7 + 2, st, 31) - 0.5) * 3;
      c.lineJoin = 'round';
      c.strokeStyle = PAL.ink;
      c.lineWidth = size * 0.09;
      c.strokeText(ch, x + jx, cy + jy);
      c.fillStyle = PAL.ink;
      c.fillText(ch, x + jx, cy + jy);
    }
    x += widths[i] + gap;
  });
  // 红色粗下划线（写出完成后拉出）
  if (k > 0.82) {
    const uk = clamp((k - 0.82) / 0.18);
    c.strokeStyle = PAL.red;
    c.lineWidth = LW;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(cx - total / 2 - 8, cy + size * 0.72);
    c.lineTo(cx - total / 2 - 8 + (total + 16) * uk, cy + size * 0.72);
    c.stroke();
  }
  c.restore();
}

// ---------------- 字幕：白字黑边（马克笔），8fps 微跳 ----------------
export function drawSubs(c: CanvasCtx, f: number, subs: Array<{from: number; to: number; text: string}>): void {
  const sub = subs.find((s) => f >= s.from && f <= s.to);
  if (!sub) return;
  const st = step8((f - 1) / 30);
  const jx = (hash2(st, 81, 31) - 0.5) * 3, jy = (hash2(st, 82, 31) - 0.5) * 3;
  c.save();
  c.font = '700 30px "Noto Sans SC"';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const cx = 640 + jx, cy = 668 + jy;
  c.strokeStyle = PAL.ink;
  c.lineWidth = 8;
  c.lineJoin = 'round';
  c.strokeText(sub.text, cx, cy);
  c.fillStyle = PAL.white;
  c.fillText(sub.text, cx, cy);
  c.restore();
}

/** 窗框摇滚角（跟拍轻摇，连续项）。 */
export function windowRock(t: number, beatOn: boolean): number {
  return (beatOn ? 1 : 0.35) * Math.sin(t * (BPM / 60) * Math.PI) * 0.025;
}
