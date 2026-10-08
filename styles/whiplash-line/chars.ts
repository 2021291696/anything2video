// ============================================================================
// chars.ts — whiplash-line 角色层（少女＋猫＋光环＋热气＋头顶饰）
// 技法借鉴 huashu-art-motion（MIT）scenes/10_nouveau.js，Remotion/TSX 重写。签名：
//   ② 角色画进离屏 L（world.ts 编排）→剪影错位垫底；③ 光环双环反向旋转；
//   ④ 发团打底＋细绺 S 行波 sin(7.4q+φ−7t)·(6+20q)＋1.2 圈螺旋收尾、宽 16→2.5；
//   ⑤ S 形热气 lean 随 cup 往窗侧倒（防横穿脸）；短板修正：猫改趴卧 loaf 造型。
// ============================================================================
import type {Pt} from './prims';
import {dense, ribbonPath, swellW, taperW, spiralPts, smoothClosed, partial, twoTone, lerp} from './prims';
import {PAL, TAU, t2, HEAD, HALO_G, HALO_C, CHOREO} from './tokens';

// ---- 角色造型数据 ----
const HAIR_MASS: Pt[] = [
  [898, 268], [924, 236], [958, 240], [982, 264], [994, 300], [998, 346], [992, 398], [980, 450],
  [964, 500], [946, 540], [924, 556], [906, 536], [898, 486], [894, 432], [892, 380], [890, 330], [891, 296],
];
const LOCK_BACK: Array<[number, number, number, number, number, number, number]> = [
  [988, 336, 178, 22, 16, 0.2, 1], [1000, 372, 156, 30, 15, 1.4, -1], [992, 416, 132, 18, 16, 2.5, 1],
  [978, 300, 190, 8, 16, 3.3, -1], [964, 452, 104, 26, 14, 4.2, 1], [972, 268, 168, -12, 15, 5.0, 1], [950, 500, 84, 18, 14, 0.9, -1],
];
const LOCK_FRONT: Array<[number, number, number, number, number, number, number]> = [
  [902, 356, 96, -20, 14, 2.0, -1], [916, 366, 78, 8, 12, 3.6, 1],
];
const FACE_PTS: Pt[] = [
  [899, 262], [884, 282], [878, 296], [870, 306], [877, 313], [881, 318], [878, 324], [885, 335],
  [898, 346], [916, 352], [938, 350], [952, 334], [958, 300], [952, 266], [932, 248], [908, 250],
];
const TORSO: Pt[] = [
  [876, 384], [948, 378], [954, 420], [946, 462], [1000, 556], [968, 574], [930, 566], [890, 576], [852, 562], [838, 552], [888, 458], [884, 416],
];

// ---- 单绺发：S 行波＋螺旋收尾（签名④；禁裸细绺——发团打底见 drawGirl）----
function drawLock(g: CanvasRenderingContext2D, def: [number, number, number, number, number, number, number], u: number, t: number, headOx: number, headOy: number) {
  if (u <= 0) return;
  const [sx, sy, len, drift, w0, ph, dir] = def;
  const pts: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const q = i / 12;
    const wave = Math.sin(q * 7.4 + ph - t * 7) * (6 + 20 * q);
    pts.push([sx + headOx * (1 - q) + drift * q + wave, sy + headOy * (1 - q) + len * q]);
  }
  const e = pts[12];
  const a0 = Math.atan2(pts[12][1] - pts[11][1], pts[12][0] - pts[11][0]);
  const r = 10 + w0 * 0.5;
  const cx = e[0] + Math.cos(a0 + (dir * Math.PI) / 2) * r;
  const cy = e[1] + Math.sin(a0 + (dir * Math.PI) / 2) * r;
  const sp = spiralPts(cx, cy, r, a0 - (dir * Math.PI) / 2, 1.2, dir, 14);
  const all = partial(dense(pts.concat(sp.slice(1)), 4), u);
  const rb = ribbonPath(all, taperW(w0, 2.5));
  g.fillStyle = PAL.hairLock;
  g.fill(rb);
  g.strokeStyle = PAL.line;
  g.lineWidth = 1.8;
  g.stroke(rb);
  const mid = all.slice(3, Math.max(5, all.length - 6));
  g.fillStyle = PAL.hairHi;
  g.fill(ribbonPath(mid, (q) => 1 + 2 * (1 - q)));
  g.strokeStyle = PAL.hairDk;
  g.lineWidth = 1;
  g.beginPath();
  mid.forEach((p, i) => (i ? g.lineTo(p[0] + 2.4, p[1] + 1.6) : g.moveTo(p[0] + 2.4, p[1] + 1.6)));
  g.stroke();
}
export {drawLock, LOCK_FRONT, LOCK_BACK};

// ---- 趴卧猫（短板修正：loaf 造型＋鞭线螺旋尾，非坐姿直腿）----
export function drawCat(g: CanvasRenderingContext2D, t: number, alpha: number) {
  if (alpha <= 0) return;
  g.save();
  g.globalAlpha = alpha;
  g.translate(0, (1 - alpha) * 12);
  // 尾：鞭线尾巴＋螺旋收尾（线端呼吸）
  const tailRaw = [...[[415, 578], [440, 574], [452, 566]] as Pt[], ...spiralPts(454, 562, 18, -0.8, 1.3, 1, 18)];
  twoTone(g, dense(tailRaw, 4), (q) => 7.4 - q * 4 + Math.sin(t * 3) * 0.6, PAL.cat, PAL.line, 1.8, 4);
  // 身体（loaf 趴卧；呼吸）
  const breathe = 1 + Math.sin(t * 1.9) * 0.012;
  g.save();
  g.translate(0, 596);
  g.scale(1, breathe);
  g.translate(0, -596);
  const body = smoothClosed([[248, 588], [258, 566], [282, 554], [318, 548], [356, 548], [390, 556], [410, 568], [416, 582], [408, 592], [368, 596], [300, 596], [262, 594]]);
  g.fillStyle = PAL.cat;
  g.fill(body);
  g.strokeStyle = PAL.line;
  g.lineWidth = 2.2;
  g.stroke(body);
  g.fillStyle = PAL.catW;
  g.beginPath(); g.ellipse(272, 580, 20, 12, 0, 0, TAU); g.fill();
  // 虎斑（可变线宽）
  g.fillStyle = PAL.catStripe;
  [[[300, 552], [310, 566], [314, 580]], [[332, 550], [342, 564], [346, 578]], [[364, 552], [372, 564], [376, 576]], [[390, 558], [396, 568], [398, 578]]].forEach((pts) => {
    g.fill(ribbonPath(dense(pts as Pt[], 6), swellW(7.4, 1)));
  });
  // 头＋耳（趴卧略抬）
  g.fillStyle = PAL.cat;
  g.beginPath(); g.arc(256, 552, 24, 0, TAU); g.fill(); g.stroke();
  [[238, 536, 246, 514, 258, 534], [258, 532, 270, 512, 278, 534]].forEach(([x1, y1, x2, y2, x3, y3]) => {
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineTo(x3, y3); g.closePath();
    g.fillStyle = PAL.cat; g.fill(); g.stroke();
    g.beginPath(); g.moveTo(x1 + 5, y1 - 2); g.lineTo(x2 + 2, y2 + 7); g.lineTo(x3 - 3, y3 - 3); g.closePath();
    g.fillStyle = PAL.earIn; g.fill();
  });
  g.restore();
  // 脸（眯眼打盹）
  g.strokeStyle = PAL.line;
  g.lineWidth = 2;
  [[244, 548, 251, 552], [259, 551, 266, 547]].forEach(([x1, y1, x2, y2]) => {
    g.beginPath(); g.moveTo(x1, y1); g.quadraticCurveTo((x1 + x2) / 2, y1 + 5, x2, y2); g.stroke();
  });
  g.fillStyle = PAL.earIn;
  g.beginPath(); g.moveTo(252, 558); g.lineTo(258, 558); g.lineTo(255, 562); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(255, 562); g.quadraticCurveTo(252, 566, 249, 564); g.stroke();
  g.beginPath(); g.moveTo(255, 562); g.quadraticCurveTo(258, 566, 261, 564); g.stroke();
  g.lineWidth = 1.1;
  [[234, 556, 244, 558], [234, 562, 244, 561], [266, 556, 276, 554], [266, 562, 276, 563]].forEach(([x1, y1, x2, y2]) => {
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  });
  g.restore();
}

// ---- 少女（发团打底→背绺→躯干裙装→披帛→颈头五官→举杯手臂）；返回杯位供热气 ----
export function drawGirl(g: CanvasRenderingContext2D, f: number, t: number, alpha: number): {cupX: number; cupY: number} {
  const rest = {cupX: 818, cupY: 468};
  if (alpha <= 0) return rest;
  const cup = CHOREO.cup(f);
  const bob = Math.sin(t * 1.7) * 2.2;
  g.save();
  g.globalAlpha = alpha;
  g.translate(0, (1 - alpha) * 8 + bob * 0.4);
  // 发团（波浪外缘，签名④打底）
  const hm = CHOREO.hairMass(f);
  if (hm > 0) {
    g.save();
    g.globalAlpha = alpha * hm;
    const pts = HAIR_MASS.map(([x, y]) => {
      const wave = y > 340 ? Math.sin(t * 6 + y * 0.05) * 6 : 0;
      return [x + wave, y] as Pt;
    });
    g.fillStyle = PAL.hair;
    g.fill(smoothClosed(pts));
    g.restore();
  }
  // 背后发绺（S 行波，签名④）
  LOCK_BACK.forEach((def, i) => drawLock(g, def, CHOREO.lock(i, f), t, 0, 0));
  // 躯干裙装
  const torso = smoothClosed(TORSO.map(([x, y]) => [x, y + bob] as Pt));
  g.fillStyle = PAL.dress;
  g.fill(torso);
  g.strokeStyle = PAL.line;
  g.lineWidth = 2.2;
  g.stroke(torso);
  // 裙内褶（深粉弧带）
  g.save();
  g.clip(torso);
  g.fillStyle = PAL.shawlD;
  [[[946, 470], [924, 520], [918, 566]], [[928, 472], [908, 522], [902, 568]], [[908, 470], [888, 524], [884, 568]]].forEach((p) => {
    g.fill(ribbonPath(dense(p as Pt[], 6), swellW(5.6, 1)));
  });
  g.restore();
  // 金腰带＋胸针
  g.save();
  g.clip(torso);
  g.fillStyle = PAL.gold;
  g.fillRect(884, 450 + bob, 64, 13);
  g.restore();
  g.beginPath(); g.arc(920, 456 + bob, 6.4, 0, TAU); g.fill();
  g.strokeStyle = PAL.line; g.lineWidth = 1.8; g.stroke();
  // 粉披帛（肩后垂落）
  const sh = dense([[966, 386 + bob], [1006, 434 + bob], [1024, 492 + bob], [1014, 546 + bob]], 8);
  const shr = ribbonPath(sh, (q) => 22 + 18 * q);
  g.fillStyle = PAL.shawl;
  g.fill(shr);
  g.strokeStyle = PAL.line;
  g.lineWidth = 2;
  g.stroke(shr);
  g.fillStyle = PAL.shawlD;
  g.fill(ribbonPath(sh.slice(5), (q) => 3.4 + 4 * q));
  // 颈＋头
  g.fillStyle = PAL.skin;
  g.beginPath();
  g.moveTo(912, 342); g.lineTo(930, 342); g.lineTo(934, 372); g.lineTo(908, 372);
  g.closePath(); g.fill(); g.stroke();
  const face = smoothClosed(FACE_PTS.map(([x, y]) => [x, y + bob] as Pt));
  g.fillStyle = PAL.skin;
  g.fill(face);
  g.strokeStyle = PAL.line;
  g.lineWidth = 2.2;
  g.stroke(face);
  // 五官（写意：眉/眼/唇/腮/耳）
  g.strokeStyle = PAL.line;
  g.lineWidth = 1.9;
  g.beginPath(); g.moveTo(886, 283 + bob); g.quadraticCurveTo(895, 278 + bob, 903, 281 + bob); g.stroke();
  g.fillStyle = '#fdf6ea';
  g.beginPath(); g.ellipse(895, 297 + bob, 6, 4, -0.1, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#4a6a3a';
  g.beginPath(); g.arc(893, 297 + bob, 2.6, 0, TAU); g.fill();
  g.fillStyle = PAL.line;
  g.beginPath(); g.arc(892.6, 297 + bob, 1.2, 0, TAU); g.fill();
  g.strokeStyle = PAL.lip;
  g.lineWidth = 2.6;
  g.beginPath(); g.moveTo(880, 321 + bob); g.quadraticCurveTo(884, 324 + bob, 888, 321 + bob); g.stroke();
  g.fillStyle = 'rgba(235,130,130,.45)';
  g.beginPath(); g.ellipse(896, 315 + bob, 7, 4.4, 0, 0, TAU); g.fill();
  g.strokeStyle = PAL.line;
  g.lineWidth = 1.8;
  g.beginPath(); g.ellipse(944, 312 + bob, 4, 6, 0.2, 0, Math.PI * 1.5); g.stroke();
  // 手臂＋杯（举杯：rest→raised）
  const cupX = lerp(rest.cupX, 798, cup), cupY = lerp(rest.cupY, 408, cup) + bob * 0.6;
  const shX = 890, shY = 392 + bob;
  const mx = (shX + cupX) / 2, my = (shY + cupY) / 2 + 16;
  twoTone(g, [[shX, shY], [mx, my]], () => 17, PAL.dress, PAL.line, 2);
  twoTone(g, [[mx, my], [cupX + 10, cupY + 8]], () => 14, PAL.dress, PAL.line, 2);
  g.fillStyle = PAL.skin;
  g.beginPath(); g.arc(cupX + 10, cupY + 8, 7, 0, TAU); g.fill();
  g.strokeStyle = PAL.line; g.lineWidth = 1.8; g.stroke();
  // 杯（奶油瓷＋金带＋三点饰）
  g.fillStyle = '#f8f1e2';
  g.beginPath(); g.ellipse(cupX, cupY + 6, 14, 12, 0, 0, TAU); g.fill();
  g.strokeStyle = PAL.line; g.lineWidth = 2; g.stroke();
  g.beginPath(); g.ellipse(cupX, cupY - 4, 13, 4, 0, 0, TAU); g.stroke();
  g.fillStyle = PAL.gold;
  g.fillRect(cupX - 12, cupY + 2, 24, 4);
  ['#d07a86', '#6fa08a', '#d07a86'].forEach((c, i) => {
    g.fillStyle = c;
    g.beginPath(); g.arc(cupX - 8 + i * 8, cupY + 15, 2.2, 0, TAU); g.fill();
  });
  g.strokeStyle = PAL.line;
  g.lineWidth = 2.4;
  g.beginPath(); g.arc(cupX + 16, cupY + 5, 7, -1.1, 1.1); g.stroke();
  g.restore();
  return {cupX, cupY};
}

// ---- ⑤ S 形热气：随举杯往窗侧倒（签名⑤，防横穿脸）----
export function drawSteam(g: CanvasRenderingContext2D, f: number, cupX: number, cupY: number, alpha: number) {
  const u = CHOREO.steam(f) * alpha;
  if (u <= 0) return;
  const t = t2(f);
  const cup = CHOREO.cup(f);
  const H0 = 150 * (1 - 0.22 * cup);
  const lean = -(24 + 52 * cup);
  const defs: Array<[number, number, number, number]> = [[-5, 0, 1, 15], [14, 2.3, -1, 12], [-16, 4.2, 1, 9]];
  defs.forEach(([ox0, ph, dir, w0], k) => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 10; i++) {
      const q = i / 10;
      pts.push([
        cupX + ox0 * (1 + 1.5 * q) + Math.sin(q * 4 + ph - t * 6) * (8 + 24 * q) * dir + lean * q * q,
        cupY - 12 - q * H0 * (1 - k * 0.12),
      ]);
    }
    const e = pts[10];
    const sp = spiralPts(e[0] + dir * 16, e[1] + 3, 16, dir > 0 ? Math.PI : 0, 1.1, dir, 12);
    const all = partial(dense(pts.concat(sp.slice(1)), 5), u);
    const rb = ribbonPath(all, (q) => 2 + (w0 - 2) * Math.sin(Math.PI * Math.min(1, 0.15 + q * 1.1)));
    g.save();
    g.globalAlpha = 0.95 * alpha;
    g.fillStyle = '#fbf7ec';
    g.fill(rb);
    g.strokeStyle = PAL.steamEdge;
    g.lineWidth = 1.4;
    g.stroke(rb);
    g.strokeStyle = 'rgba(160,130,100,.6)';
    g.lineWidth = 1;
    g.beginPath();
    all.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.stroke();
    g.restore();
  });
}

// ---- 光环（双环反向旋转，签名③；画在角色层之下）----
export function drawGirlHalo(g: CanvasRenderingContext2D, f: number, alpha: number) {
  const u = CHOREO.haloG(f) * alpha;
  if (u <= 0) return;
  const t = t2(f);
  const [cx, cy, R0] = HALO_G;
  const R = R0 * (0.72 + 0.28 * u);
  g.save();
  g.globalAlpha = Math.min(1, u * 1.4);
  g.translate(cx, cy);
  g.lineWidth = 2.4;
  g.strokeStyle = PAL.line;
  g.fillStyle = PAL.gold;
  g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill(); g.stroke();
  const rot = t * 0.9;
  for (let i = 0; i < 18; i++) {
    const a = rot + (i / 18) * TAU;
    const x = Math.cos(a) * (R - 9), y = Math.sin(a) * (R - 9);
    g.fillStyle = PAL.cream;
    g.beginPath(); g.arc(x, y, 5.2, 0, TAU); g.fill();
    g.lineWidth = 1.6; g.stroke();
    g.fillStyle = PAL.haloRed;
    g.beginPath(); g.arc(x, y, 2.1, 0, TAU); g.fill();
  }
  g.lineWidth = 2.2;
  g.fillStyle = PAL.haloTeal;
  g.beginPath(); g.arc(0, 0, R - 18, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = PAL.haloPink;
  g.beginPath(); g.arc(0, 0, R - 24, 0, TAU); g.fill(); g.stroke();
  // 玫瑰窗花瓣（反向转 −0.63t）
  g.save();
  g.rotate(-rot * 0.7);
  g.strokeStyle = '#c98a86';
  g.lineWidth = 1.6;
  for (let ring = 0; ring < 2; ring++) {
    for (let i = 0; i < 16; i++) {
      g.save();
      g.rotate((i / 16) * TAU + (ring * TAU) / 32);
      const r0 = ring ? 30 : 48, r1 = ring ? 66 : 90;
      g.fillStyle = ring ? PAL.petal : PAL.petalHi;
      g.beginPath();
      g.moveTo(r0, 0);
      g.quadraticCurveTo((r0 + r1) / 2, -14 + ring * 4, r1, 0);
      g.quadraticCurveTo((r0 + r1) / 2, 14 - ring * 4, r0, 0);
      g.fill(); g.stroke();
      g.restore();
    }
  }
  g.restore();
  g.restore();
}
export function drawCatHalo(g: CanvasRenderingContext2D, f: number, alpha: number) {
  const u = CHOREO.catHalo(f) * alpha;
  if (u <= 0) return;
  const t = t2(f);
  const [cx, cy, R0] = HALO_C;
  const R = R0 * (0.7 + 0.3 * u);
  const rot = -t * 1.1;
  g.save();
  g.globalAlpha = Math.min(1, u * 1.4);
  g.translate(cx, cy);
  g.strokeStyle = PAL.line;
  g.lineWidth = 2.2;
  g.fillStyle = PAL.gold;
  g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill(); g.stroke();
  g.setLineDash([6, 5]);
  g.lineDashOffset = rot * 24;
  g.strokeStyle = PAL.goldD;
  g.lineWidth = 4;
  g.beginPath(); g.arc(0, 0, R - 5, 0, TAU); g.stroke();
  g.setLineDash([]);
  g.strokeStyle = PAL.line; g.lineWidth = 2.2;
  g.fillStyle = PAL.haloRed;
  g.beginPath(); g.arc(0, 0, R - 10, 0, TAU); g.fill(); g.stroke();
  g.rotate(rot);
  for (let i = 0; i < 8; i++) {
    g.save();
    g.rotate((i / 8) * TAU);
    g.fillStyle = '#e8924a';
    g.beginPath();
    g.moveTo(8, 0);
    g.quadraticCurveTo(27, -11, 45, 0);
    g.quadraticCurveTo(27, 11, 8, 0);
    g.fill();
    g.lineWidth = 1.6; g.stroke();
    g.restore();
  }
  g.fillStyle = '#e0b84a';
  g.beginPath(); g.arc(0, 0, 10, 0, TAU); g.fill(); g.stroke();
  g.restore();
}

// ---- 头顶小卷＋花环（主画布顶层件）----
export function drawCrownAndWreath(g: CanvasRenderingContext2D, f: number, t: number, alpha: number) {
  const cu = CHOREO.crown(f) * alpha;
  if (cu <= 0) return;
  g.save();
  g.globalAlpha = cu;
  [[-20, -52, 11, 1], [16, -50, 12, -1], [44, -32, 13, 1], [60, -2, 12, -1], [64, 28, 11, 1], [50, 50, 10, -1]].forEach(([dx, dy, r, dir], k) => {
    const cx = HEAD[0] + dx + Math.sin(t * 6 + k) * 1.6;
    const cy = HEAD[1] + dy;
    const sp = dense(spiralPts(cx, cy, r, k * 1.3 + t * 2 * dir, 1.15, dir, 14), 2);
    const rb = ribbonPath(sp, (q) => 6.4 * (1 - q) + 1.6);
    g.fillStyle = PAL.hairLock;
    g.fill(rb);
    g.strokeStyle = PAL.line;
    g.lineWidth = 1.4;
    g.stroke(rb);
  });
  // 花环：额前—头顶—后脑弧线排 5 朵粉花
  const wu = CHOREO.wreath(f) * alpha;
  g.globalAlpha = wu;
  const p0: Pt = [899, 262], p1: Pt = [938, 224], p2: Pt = [966, 262];
  const at = (q: number): Pt => [
    (1 - q) * (1 - q) * p0[0] + 2 * q * (1 - q) * p1[0] + q * q * p2[0],
    (1 - q) * (1 - q) * p0[1] + 2 * q * (1 - q) * p1[1] + q * q * p2[1],
  ];
  g.strokeStyle = PAL.gold;
  g.lineWidth = 3.6;
  g.beginPath();
  for (let i = 0; i <= 20; i++) {
    const p = at(i / 20);
    if (i) g.lineTo(p[0], p[1] + 6); else g.moveTo(p[0], p[1] + 6);
  }
  g.stroke();
  [0.22, 0.42, 0.6, 0.78, 0.95].forEach((q, k) => {
    const [x, y] = at(q);
    const r = k % 2 ? 10 : 12.6;
    const rot = t * 0.8 + k;
    g.strokeStyle = PAL.line;
    g.lineWidth = 1.4;
    g.fillStyle = '#7fa86a';
    [-1, 1].forEach((s) => {
      g.beginPath(); g.ellipse(x + s * r * 0.9, y + r * 0.5, r * 0.6, r * 0.28, s * 0.6, 0, TAU); g.fill(); g.stroke();
    });
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    for (let i = 0; i < 5; i++) {
      g.rotate(TAU / 5);
      g.fillStyle = k % 2 ? '#e7a0aa' : '#f0b4bb';
      g.beginPath(); g.ellipse(r * 0.55, 0, r * 0.55, r * 0.4, 0, 0, TAU); g.fill(); g.stroke();
    }
    g.fillStyle = '#e0b04a';
    g.beginPath(); g.arc(0, 0, r * 0.3, 0, TAU); g.fill(); g.stroke();
    g.restore();
  });
  g.restore();
}
