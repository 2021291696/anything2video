// ============================================================================
// world.ts — 《一条鞭线的旅行》慕夏新艺术海报世界·环境层＋顶层编排
// （战役 4 批次④ D2-2）技法借鉴 huashu-art-motion（MIT）scenes/10_nouveau.js，
// Remotion/TSX 重写。角色/光环/热气在 chars.ts；色板/几何/编舞在 tokens.ts。
// 签名纪律：①ribbon 鞭线 ②剪影错位垫底 ⑥太阳升起+铅条随动 ⑦spiral 收尾 15%。
// 编舞时间轴（帧）：钩子 f2 → 花茎 f31-75 → 拱窗+太阳+铭牌 f82-176 →
//   藤蔓/猫/发丝/光环 f183-268 → 金框 f275-310（HERO f285=69%）→ 定帧 f379-413
// ============================================================================
import {W, H} from '../common';
import type {Pt} from './prims';
import {clamp01, inv, outC, dense, ribbonPath, swellW, spiralPts, partial, twoTone, fbm, mulberry32, taperW} from './prims';
import {PAL, TILE_COLS, TAU, t2, FRAME_R, CHOREO, STEM_CURL} from './tokens';
import {drawCat, drawGirl, drawLock, LOCK_FRONT, drawSteam, drawGirlHalo, drawCatHalo, drawCrownAndWreath} from './chars';
import {drawWindow} from './window';

// ---- 线条定义（主角鞭线的各段）----
export const STEM_PTS: Pt[] = [[120, 598], [96, 520], [148, 452], [102, 382], [138, 316], [112, 248]];
const SIDE_STEMS: Array<{pts: Pt[]; head: [number, number]; r: number; at: number}> = [
  {pts: [[64, 598], [58, 500], [84, 430], [70, 360], [80, 302]], head: [78, 296], r: 20, at: 38},
  {pts: [[176, 598], [186, 520], [168, 460], [182, 410], [172, 370]], head: [174, 366], r: 22, at: 46},
];
export const BRANCH_PTS: Pt[] = [[126, 470], [180, 462], [220, 448], [250, 434]];
const VINE_PTS: Pt[] = [[1244, 600], [1250, 520], [1242, 440], [1250, 360], [1244, 280], [1250, 200], [1246, 148]];
const VINE_CURLS: Array<{at: number; c: [number, number]; r: number}> = [
  {at: 0.22, c: [1214, 474], r: 18}, {at: 0.5, c: [1218, 356], r: 15}, {at: 0.78, c: [1216, 236], r: 20},
];
const LILIES: Array<{pts: Pt[]; head: [number, number]; r: number; ph: number}> = [
  {pts: [[1130, 598], [1122, 500], [1140, 420], [1128, 330], [1136, 268]], head: [1134, 262], r: 36, ph: 4.0},
  {pts: [[1176, 598], [1184, 520], [1168, 470], [1182, 430], [1174, 394]], head: [1176, 390], r: 26, ph: 5.1},
  {pts: [[1222, 598], [1228, 520], [1212, 468], [1226, 412], [1218, 366]], head: [1220, 360], r: 28, ph: 6.3},
];
export const FRAME_PTS: Pt[] = [
  [16, 14], [340, 11], [640, 10], [960, 11], [1264, 14], [1267, 240], [1264, 470], [1264, 706],
  [960, 709], [640, 710], [320, 709], [16, 706], [13, 480], [16, 240],
];

// ---- ① 底版（模块级缓存，构建一次）----
let bgCache: HTMLCanvasElement | null = null;
export const posterBg = (): HTMLCanvasElement => {
  if (bgCache) return bgCache;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  g.fillStyle = PAL.paper;
  g.fillRect(0, 0, W, H);
  const gr = g.createLinearGradient(0, 24, 0, 600);
  gr.addColorStop(0, PAL.green);
  gr.addColorStop(0.55, PAL.green2);
  gr.addColorStop(1, PAL.peach);
  g.fillStyle = gr;
  g.fillRect(26, 24, W - 52, 576);
  // 圆点花纹：环＋心点，菱形交错
  g.strokeStyle = PAL.dot;
  g.fillStyle = PAL.dot;
  g.lineWidth = 1.2;
  for (let j = 0, y = 52; y < 596; y += 36, j++) {
    for (let x = 46 + (j % 2) * 20; x < 1240; x += 41) {
      g.beginPath(); g.arc(x, y, 6.7, 0, TAU); g.stroke();
      g.beginPath(); g.arc(x, y, 1.7, 0, TAU); g.fill();
    }
  }
  // 石版印刷斑驳（小 fbm 图放大）
  const nz = document.createElement('canvas');
  nz.width = 320; nz.height = 180;
  const ng = nz.getContext('2d')!;
  const im = ng.createImageData(320, 180);
  for (let y = 0; y < 180; y++) {
    for (let x = 0; x < 320; x++) {
      const v = fbm(x * 0.05, y * 0.05, 4);
      const i = (y * 320 + x) * 4;
      im.data[i] = 90; im.data[i + 1] = 70; im.data[i + 2] = 40;
      im.data[i + 3] = clamp01(v * 1.4 + 0.15) * 60;
    }
  }
  ng.putImageData(im, 0, 0);
  g.globalAlpha = 0.5;
  g.drawImage(nz, 0, 0, W, H);
  g.globalAlpha = 1;
  // 马赛克地砖带
  g.fillStyle = PAL.line;
  g.fillRect(26, 598, W - 52, 30);
  for (let k = 0, x = 30; x < 1254; x += 18, k++) {
    g.fillStyle = TILE_COLS[(k * 7 + (k >> 2)) % TILE_COLS.length];
    g.fillRect(x, 603, 14, 20);
  }
  // 绿横幅＋深棕压线
  g.fillStyle = PAL.banner;
  g.fillRect(26, 630, W - 52, 74);
  g.fillStyle = PAL.line;
  g.fillRect(26, 628, W - 52, 3);
  g.fillRect(26, 704, W - 52, 3);
  // 横幅两侧鞭线卷草（左右镜像）
  const whip = (s: number) => {
    g.save();
    if (s < 0) { g.translate(W, 0); g.scale(-1, 1); }
    g.fillStyle = PAL.cream;
    g.fill(ribbonPath(dense([[70, 660], [82, 648], [98, 658], [160, 678], [236, 682]], 8), swellW(5.5, 1)));
    g.fillStyle = PAL.gold;
    g.fill(ribbonPath(dense(spiralPts(84, 652, 12, Math.PI, 0.9, 1, 16), 2), (q) => 3.6 - q * 2.2));
    g.fillStyle = '#d07a86';
    g.beginPath(); g.arc(252, 678, 6, 0, TAU); g.fill();
    g.restore();
  };
  whip(1); whip(-1);
  // 标题（海报纸上的石版字）
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const setSpacing = (v: string) => {
    try { (g as CanvasRenderingContext2D & {letterSpacing: string}).letterSpacing = v; } catch { /* 旧内核忽略 */ }
  };
  setSpacing('5px');
  g.lineJoin = 'round';
  g.font = '900 42px "Noto Serif SC", serif';
  g.strokeStyle = PAL.line;
  g.lineWidth = 5;
  g.strokeText('一条鞭线的旅行', 640, 668);
  g.fillStyle = PAL.cream;
  g.fillText('一条鞭线的旅行', 640, 668);
  setSpacing('2px');
  g.font = 'italic 15px "Fraunces", serif';
  g.globalAlpha = 0.9;
  g.fillText('LE TRAIT FOUET · 1896', 640, 694);
  g.globalAlpha = 1;
  setSpacing('0px');
  bgCache = cv;
  return cv;
};

// ---- 颗粒（石版印刷网点感；模块级缓存）----
let grainCache: HTMLCanvasElement | null = null;
export const grainTile = (): HTMLCanvasElement => {
  if (grainCache) return grainCache;
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 128;
  const g = cv.getContext('2d')!;
  const im = g.createImageData(128, 128);
  const rnd = mulberry32(20091007);
  for (let i = 0; i < 128 * 128; i++) {
    const a = rnd();
    im.data[i * 4] = 70; im.data[i * 4 + 1] = 50; im.data[i * 4 + 2] = 30;
    im.data[i * 4 + 3] = a < 0.5 ? 0 : Math.floor((a - 0.5) * 56);
  }
  g.putImageData(im, 0, 0);
  grainCache = cv;
  return cv;
};

// ---- 花头：罂粟 / 百合 ----
function poppyHead(g: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, bloom: number) {
  if (bloom <= 0) return;
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(bloom, bloom);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    g.save();
    g.rotate(a);
    g.fillStyle = i % 2 ? PAL.poppy : PAL.poppyHi;
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(r * 0.9, -r * 0.55, r * 1.12, r * 0.25, r * 0.4, r * 0.62);
    g.closePath();
    g.fill();
    g.strokeStyle = PAL.line;
    g.lineWidth = 2;
    g.stroke();
    g.restore();
  }
  g.strokeStyle = PAL.poppyD;
  g.lineWidth = 1.6;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + 0.3;
    g.beginPath();
    g.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3);
    g.lineTo(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75);
    g.stroke();
  }
  g.fillStyle = '#3f6a4a';
  g.beginPath(); g.arc(0, 0, r * 0.24, 0, TAU); g.fill();
  g.strokeStyle = PAL.line; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#e2b84a';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    g.beginPath(); g.arc(Math.cos(a) * r * 0.36, Math.sin(a) * r * 0.36, 2.2, 0, TAU); g.fill();
  }
  g.restore();
}
function lilyHead(g: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, alpha: number) {
  if (alpha <= 0) return;
  g.save();
  g.globalAlpha *= alpha;
  g.translate(x, y);
  g.rotate(rot);
  g.lineWidth = 1.8;
  g.strokeStyle = PAL.line;
  for (let i = 0; i < 6; i++) {
    g.save();
    g.rotate((i / 6) * TAU + (i % 2) * 0.1);
    const rr = i % 2 ? r * 0.85 : r;
    g.fillStyle = PAL.lily;
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(rr * 0.35, -rr * 0.28, rr, 0);
    g.quadraticCurveTo(rr * 0.35, rr * 0.28, 0, 0);
    g.fill(); g.stroke();
    g.strokeStyle = '#b9a98a'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(rr * 0.15, 0); g.lineTo(rr * 0.8, 0); g.stroke();
    g.strokeStyle = PAL.line; g.lineWidth = 1.8;
    g.restore();
  }
  g.strokeStyle = '#a07a2a';
  g.lineWidth = 1.2;
  for (let i = 0; i < 5; i++) {
    const a = -1.2 + i * 0.6;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42); g.stroke();
    g.fillStyle = '#d99a2a';
    g.beginPath(); g.arc(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42, 2, 0, TAU); g.fill();
  }
  g.restore();
}

// ---- 两侧花境（摇摆：茎只推上段）＋ 主茎鞭线（签名①）----
export function drawFlowers(g: CanvasRenderingContext2D, f: number) {
  const t = t2(f);
  const sway = (ph: number, amp = 1) => (Math.sin(t * 7.5 + ph) * 8.7 + Math.sin(t * 3.1 + ph * 2) * 3.3) * amp;
  // 副茎（深绿）
  SIDE_STEMS.forEach((s, i) => {
    const u = outC(inv(s.at, s.at + 14, f));
    if (u <= 0) return;
    const d = sway(i * 1.3 + 0.4, 0.5);
    const raw = partial(dense(s.pts, 8).map((p, j, arr) => [p[0] + d * (j / arr.length), p[1]] as Pt), u);
    twoTone(g, raw, (q) => 8 - q * 3.4, PAL.stemG, PAL.line, 2.2);
    poppyHead(g, s.head[0] + d, s.head[1] + Math.abs(d) * 0.2, s.r, d * 0.012 + i, outC(inv(s.at + 10, s.at + 22, f)));
  });
  // 主茎鞭线（签名①：swellW 粗细呼吸）
  const su = CHOREO.stem(f);
  if (su > 0) {
    const d0 = sway(0, 0.4);
    const raw = partial(dense(STEM_PTS, 8).map((p, j, arr) => [p[0] + d0 * (j / arr.length) * (j / arr.length), p[1]] as Pt), su);
    twoTone(g, raw, (q) => 11 + 4.6 * Math.sin(Math.PI * clamp01(q * 1.12)), PAL.stemG, PAL.line, 2.6);
    // 细枝：游到窗位（S02 拱窗的起笔）
    const bu = CHOREO.branch(f);
    if (bu > 0) twoTone(g, partial(dense(BRANCH_PTS, 8), bu), taperW(5.4, 3.4), PAL.gold, PAL.line, 2);
    // 顶端螺旋卷（线端呼吸：freeze 时仍在 ±0.6 呼吸）
    const cu = CHOREO.curl(f);
    if (cu > 0) twoTone(g, partial(dense(STEM_CURL, 4), cu), (q) => 3.6 - q * 2 + Math.sin(t * 3) * 0.6, PAL.gold, PAL.line, 2, 4);
    // 叶（blade）
    [[70, 0.6], [150, 1.5]].forEach(([bx, bph], i) => {
      const bu2 = outC(inv(58 + i * 4, 70 + i * 4, f));
      if (bu2 <= 0) return;
      const b = 26 + sway(bph, 0.3);
      const pts = dense([[bx, 470], [lerp2(bx, bx + (i ? -60 : 66), 0.5) + b * 0.4, 420], [bx + (i ? -78 : 86) + b, 372]], 8);
      const p = ribbonPath(pts, (q) => 22 * Math.sin(Math.PI * Math.min(1, 0.12 + q * 0.88)) * bu2 + 1);
      g.fillStyle = PAL.leaf; g.fill(p);
      g.strokeStyle = PAL.line; g.lineWidth = 2; g.stroke(p);
    });
  }
  // 主罂粟花头（旋开）
  poppyHead(g, 108 + sway(0, 0.4), 240, 30, sway(0, 0.4) * 0.012, CHOREO.poppy(f));
  // 右境百合
  const lu = CHOREO.lily(f);
  if (lu > 0) {
    LILIES.forEach((l) => {
      const d = -sway(l.ph, 0.5);
      const raw = partial(dense(l.pts, 8).map((p, j, arr) => [p[0] + d * (j / arr.length), p[1]] as Pt), lu);
      twoTone(g, raw, (q) => 7.4 - q * 3, PAL.stemG, PAL.line, 2.2);
      lilyHead(g, l.head[0] + d, l.head[1], l.r, -0.3 + d * 0.01 + l.ph, outC(inv(196, 210, f)));
    });
  }
}
const lerp2 = (a: number, b: number, u: number) => a + (b - a) * u;

// ---- 右缘藤蔓＋螺旋卷须（签名⑦）----
export function drawVine(g: CanvasRenderingContext2D, f: number) {
  const u = CHOREO.vine(f);
  if (u <= 0) return;
  const t = t2(f);
  const pts = partial(dense(VINE_PTS, 8), u);
  twoTone(g, pts, (q) => 7.4 - q * 2.6 + Math.sin(t * 2.6) * 0.5, PAL.gold, PAL.line, 2.2);
  VINE_CURLS.forEach((c, i) => {
    const cu = outC(inv(192 + i * 6, 202 + i * 6, f));
    if (cu <= 0) return;
    const raw = [...partial(dense([[VINE_PTS[0][0], VINE_PTS[0][1] - c.at * 450], [c.c[0] + 14, c.c[1] + 8]], 6), Math.min(1, cu * 1.4)), ...partial(dense(spiralPts(c.c[0], c.c[1], c.r, 0.4, 1.15, -1, 18), 3), cu)];
    twoTone(g, raw, (q) => 4.2 - q * 2 + Math.sin(t * 3 + i) * 0.5, PAL.gold, PAL.line, 1.8, 4);
    g.fillStyle = PAL.gold;
    g.beginPath(); g.arc(c.c[0], c.c[1], 2.6, 0, TAU); g.fill();
  });
}

// ---- 铭牌（粗/细/转弯）----
const LABELS: Array<{text: string; chip: [number, number]; target: [number, number]}> = [
  {text: '粗', chip: [300, 396], target: [252, 416]},
  {text: '细', chip: [520, 96], target: [474, 56]},
  {text: '转弯', chip: [586, 150], target: [500, 88]},
];
export function drawLabels(g: CanvasRenderingContext2D, f: number) {
  LABELS.forEach((l, i) => {
    const u = CHOREO.label(i, f);
    if (u <= 0) return;
    const s = 0.8 + 0.2 * u;
    g.save();
    g.globalAlpha = Math.min(1, u * 1.3);
    g.strokeStyle = PAL.line;
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(l.chip[0] + (l.target[0] > l.chip[0] ? 34 : -34), l.chip[1]);
    g.lineTo(l.target[0], l.target[1]);
    g.stroke();
    g.fillStyle = PAL.line;
    g.beginPath(); g.arc(l.target[0], l.target[1], 2.6, 0, TAU); g.fill();
    g.translate(l.chip[0], l.chip[1]);
    g.scale(s, s);
    const w = l.text.length > 1 ? 74 : 46;
    g.fillStyle = PAL.cream;
    g.globalAlpha *= 0.97;
    g.beginPath();
    g.roundRect(-w / 2, -17, w, 34, 8);
    g.fill();
    g.strokeStyle = PAL.gold;
    g.lineWidth = 2;
    g.stroke();
    g.strokeStyle = PAL.line;
    g.lineWidth = 1;
    g.beginPath();
    g.roundRect(-w / 2 + 3, -14, w - 6, 28, 6);
    g.stroke();
    g.fillStyle = PAL.line;
    g.font = '700 19px "Noto Serif SC", serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(l.text, 0, 1);
    g.restore();
  });
}

// ---- ⓪ 金框（鞭线终章）：绕海报一周＋四角小花 ----
export function drawFrameLine(g: CanvasRenderingContext2D, f: number) {
  const u = CHOREO.frame(f);
  if (u <= 0) return;
  const t = t2(f);
  const pts = partial(dense(FRAME_PTS, 6), u);
  const breathe = Math.sin(t * 2.2) * 0.7;
  twoTone(g, pts, (q) => 8.4 + 2 * Math.sin(TAU * (q * 2 - t * 0.35)) + breathe, PAL.gold, PAL.line, 2.4, 6);
  const ru = CHOREO.rosette(f);
  if (ru > 0) {
    [[FRAME_R.x0, FRAME_R.y0], [FRAME_R.x1, FRAME_R.y0], [FRAME_R.x1, FRAME_R.y1], [FRAME_R.x0, FRAME_R.y1]].forEach(([cx, cy], i) => {
      const u2 = clamp01(ru * 1.6 - i * 0.15);
      if (u2 <= 0) return;
      const sp = dense(spiralPts(cx, cy, 11, i * 1.6 + t * 0.8, 1.1, i % 2 ? -1 : 1, 14), 2);
      g.fillStyle = PAL.gold;
      g.fill(ribbonPath(sp, (q) => 3.4 * (1 - q) + 1.2));
      g.fillStyle = PAL.line;
      g.beginPath(); g.arc(cx, cy, 2.2, 0, TAU); g.fill();
    });
  }
}

// ---- 离屏层复用（同帧内两次清屏；Remotion 每帧重渲天然规避状态残留）----
const scratchStore: Record<string, HTMLCanvasElement> = {};
const scratch = (key: string): HTMLCanvasElement => {
  if (!scratchStore[key]) {
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    scratchStore[key] = cv;
  }
  return scratchStore[key];
};

// ---- 顶层编排：一帧＝整个海报世界 ----
export function drawWorld(g: CanvasRenderingContext2D, f: number) {
  const t = t2(f);
  g.drawImage(posterBg(), 0, 0);
  // 拱窗
  drawWindow(g, f, CHOREO.interior(f));
  // 花境＋藤蔓
  drawFlowers(g, f);
  drawVine(g, f);
  // 光环（角色层之下）
  drawCatHalo(g, f, CHOREO.cat(f));
  drawGirlHalo(g, f, 1);
  // 角色层 → 剪影错位垫底（签名②）
  const L = scratch('chars');
  const lg = L.getContext('2d')!;
  lg.clearRect(0, 0, W, H);
  drawCat(lg, t, CHOREO.cat(f));
  const girlA = CHOREO.girl(f);
  const cupPos = drawGirl(lg, f, t, girlA);
  const S = scratch('sil');
  const sg = S.getContext('2d')!;
  sg.clearRect(0, 0, W, H);
  sg.drawImage(L, 0, 0);
  sg.globalCompositeOperation = 'source-in';
  sg.fillStyle = PAL.line;
  sg.fillRect(0, 0, W, H);
  sg.globalCompositeOperation = 'source-over';
  const OFFS: Array<[number, number]> = [[-1, -1], [2.5, 3.5], [1.5, 1.5]];
  OFFS.forEach(([dx, dy]) => g.drawImage(S, dx, dy));
  g.drawImage(L, 0, 0);
  // 顶层：前发绺 / 头顶小卷 / 花环
  LOCK_FRONT.forEach((def) => drawLock(g, def, CHOREO.frontLock(f) * girlA, t, 0, 0));
  drawCrownAndWreath(g, f, t, girlA);
  // 热气（随举杯往窗侧倒）
  drawSteam(g, f, cupPos.cupX, cupPos.cupY, 1);
  // 铭牌（S02 段，海报完成后让位）
  drawLabels(g, f);
  // 金框（鞭线终章）
  drawFrameLine(g, f);
  // 石版颗粒
  g.save();
  g.globalAlpha = 0.13;
  const pat = g.createPattern(grainTile(), 'repeat');
  if (pat) {
    g.fillStyle = pat;
    g.fillRect(0, 0, W, H);
  }
  g.restore();
}
