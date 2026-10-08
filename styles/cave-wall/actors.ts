// 演员：画者（原始人形）/ 野牛群（两姿态交替奔跑）/ 题字 / 字幕。
// 技法借鉴 huashu-art-motion references/风格配方/01_cave.md 与 scenes/01_cave.js（MIT, alchaincyf），TS 重写。
// 短板修正（INDEX：人形太卡通）：画者轮廓降采样到 14 点（12-16 区间）+ 静态大手绘抖动 ±5px
//   ——验收=静帧里人形与野牛同等「原始」。野牛签名：每 7 帧换腿两姿态、头绕颈点 ±0.12rad、
//   整体上下 ±7px 交替颠簸、背脊 22px 深色晕染（拉斯科式明暗）、腿只用炭线。
import {PAL, type CanvasCtx, type Pt} from './types';
import {clamp, hash2} from './noise';
import {inkLine, poly, roughPts, shape, spray, sprayCone, spline} from './charcoal';
import {handBlocks} from './handprint';

// ---------------------------------------------------------------- 画者（14 点原始人形）
/** 画者轮廓局部坐标（原点=脚底，面向右）。14 点降采样 + 大手绘抖动 = 「太顺」短板的修正。 */
const PAINTER_PTS: Pt[] = [
  [20, -128], [38, -120], [34, -102], [20, -96], [2, -84], [-14, -58], [-20, -34],
  [-12, -16], [-24, -6], [-36, -2], [-2, 0], [16, -22], [18, -48], [10, -72],
];

/** 画者（世界空间）。blowK∈[0,1]：吹颜料手臂抬起量。 */
export function drawPainter(g: CanvasCtx, x: number, y: number, f: number, blowK: number): void {
  g.save();
  g.translate(x, y);
  const pts = roughPts(PAINTER_PTS, 71, 5); // 静态 seed：几何不动，抖动是「手绘的边」不是动画
  const body = spline(pts);
  shape(g, body, PAL.red, 5, f, 0.96);
  // 眼（原始：一道炭痕）
  inkLine(g, poly([[33, -116], [37, -113]], false), 2.6, f);
  // 吹臂：肩 (8,-84) → 手（blow 时抬向嘴前上方）
  const hx = 30 + blowK * 22, hy = -100 - blowK * 16;
  inkLine(g, spline([[8, -84], [20, -94 + blowK * 4], [hx, hy]], false), 9, f);
  // 手（含颜料团：红赭含着的一口颜料）
  shape(g, poly([[hx - 8, hy - 6], [hx + 9, hy - 8], [hx + 10, hy + 6], [hx - 7, hy + 8]]), PAL.red, 4, f);
  // 兽皮腰带（一道炭线）
  inkLine(g, poly([[-16, -44], [14, -50]], false), 4, f);
  // 吹出的气流锥（对位 SFX f88；喷向岩壁上的野牛）
  if (blowK > 0.15) {
    sprayCone(g, [hx + 12, hy], [hx + 342, hy - 130], 26, 210, '#9c3520', 901, blowK);
  }
  g.restore();
}

/** 吹颜料进度：f88-95 抬臂、f95-128 吹、f128-142 收臂。 */
export function painterBlow(f: number): number {
  if (f < 80) return 0;
  if (f < 95) return clamp((f - 80) / 15);
  if (f < 128) return 1;
  if (f < 142) return 1 - (f - 128) / 14;
  return 0;
}

// ---------------------------------------------------------------- 野牛（两姿态）
/** 野牛体（局部坐标，面向右，~250×120）。拉斯科式：巨大肩峰 + 下垂的头 + 颏须 + 低臀。 */
const BISON_BODY: Pt[] = [
  [-118, -60], [-80, -76], [-30, -84], [10, -104], [48, -118], [78, -108], [96, -88],
  [108, -70], [118, -52], [116, -30], [102, -16], [96, -2], [88, -30], [72, -6],
  [0, 12], [-60, 8], [-100, -20],
];
/** 头（下垂，绕颈点 (96,-84) 转 ±0.12rad）。 */
const BISON_HEAD: Pt[] = [[86, -96], [112, -84], [126, -60], [122, -34], [106, -18], [92, -32], [82, -60]];

/** 腿两姿态端点（伸展/收拢）：[x0,y0,x1,y1] ×4（前2后2）。 */
const LEGS_A: Array<[number, number, number, number]> = [
  [48, -6, 84, 50], [64, -2, 52, 52], [-52, -4, -92, 48], [-70, -8, -84, 50],
];
const LEGS_B: Array<[number, number, number, number]> = [
  [48, -6, 60, 50], [64, -2, 76, 46], [-52, -4, -58, 50], [-70, -8, -60, 48],
];

/**
 * 野牛。ph=floor(f/7)%2 两姿态；revealK：颜料显形（吹喷落点，f96-136）；wakeK（0=壁上颜料：半透、
 * 头不摆；1=醒了：奔跑+颠簸）。phase：牛群个体相位错开（反相纪律）。
 */
export function drawBison(
  g: CanvasCtx, x: number, y: number, s: number, f: number, phase: number, wakeK: number, revealK = 1,
): void {
  const alpha = revealK * 0.55 + wakeK * 0.4;
  if (alpha < 0.03) return;
  const ph = (Math.floor((f + phase * 7) / 7) % 2 + 2) % 2;
  // 颜料态（未醒）：贴壁半透、姿态 A；醒后：alpha 0.95 + 上下颠簸 ±7px + 前后 ±3px
  const bobX = ph ? 3 : -3, bobY = ph ? -7 : 2;
  const dx = bobX * wakeK, dy = bobY * wakeK - (1 - wakeK) * 4;
  g.save();
  g.translate(x + dx * s, y + dy * s);
  g.scale(s, s);
  // 腿（炭线，两套端点）
  const legs = ph ? LEGS_A : LEGS_B;
  legs.forEach(([x0, y0, x1, y1]) => {
    inkLine(g, spline([[x0, y0], [(x0 + x1) / 2, (y0 + y1) / 2 + 3], [x1, y1]], false), 6, f);
    const hoof = new Path2D();
    hoof.moveTo(x1 - 6, y1);
    hoof.lineTo(x1 + 7, y1 + 2);
    inkLine(g, hoof, 6, f);
  });
  // 体（头绕颈点 (96,-84) 转 ±0.12rad）
  g.save();
  g.translate(96, -84);
  g.rotate((ph ? 0.12 : -0.09) * wakeK);
  g.translate(-96, 84);
  shape(g, spline(BISON_BODY), PAL.bison, 7, f, alpha);
  // 背脊晕染（拉斯科式明暗，沿肩峰）
  g.save();
  g.clip(spline(BISON_BODY));
  g.strokeStyle = 'rgba(70,24,10,.55)';
  g.lineWidth = 22;
  g.stroke(spline([[-110, -66], [-30, -88], [20, -108], [56, -120], [86, -104]], false));
  g.restore();
  // 头（深一档）+ 角 + 眼 + 颏须
  shape(g, spline(BISON_HEAD), PAL.bisonD, 6, f, alpha);
  inkLine(g, spline([[104, -80], [122, -94], [132, -100]], false), 5, f);
  inkLine(g, spline([[94, -84], [100, -100], [108, -108]], false), 4.5, f);
  g.fillStyle = PAL.ink;
  g.globalAlpha = alpha;
  g.beginPath();
  g.arc(108, -56, 3.5, 0, Math.PI * 2);
  g.fill();
  g.restore();
  // 颏须（头外画，不跟头转）
  shape(g, poly([[98, -18], [102, 2], [92, -4], [90, -20]]), PAL.bisonD, 4, f, alpha);
  // 尾 + 尾梢
  inkLine(g, spline([[-114, -56], [-128, -32], [-122, -8]], false), 4.5, f);
  const tip = new Path2D();
  tip.moveTo(-126, -12);
  tip.lineTo(-116, -2);
  inkLine(g, tip, 5, f);
  // 肩峰鬃毛短刺
  for (let k = 0; k < 6; k++) {
    const p = poly([[16 + k * 13, -108 - hash2(k, 3, 7) * 4], [10 + k * 13, -122 - hash2(k, 5, 7) * 5]], false);
    inkLine(g, p, 3.4, f);
  }
  g.restore();
}

/** 野牛个体状态：reveal（吹显形 k）/ wake（醒来 k）。 */
export function bisonState(f: number, wakeF: number): {reveal: number; wake: number} {
  return {reveal: clamp((f - 96) / 40), wake: clamp((f - wakeF) / 10)};
}

/** 牛群（世界空间布置）：头牛 / 二牛 / 牛犊，反相相位 0/0.5/0.25。 */
export function drawHerd(g: CanvasCtx, f: number): void {
  const s1 = bisonState(f, 150);
  const s2 = bisonState(f, 196);
  const s3 = bisonState(f, 218);
  drawBison(g, 820, 410, 1.0, f, 0, s1.wake, s1.reveal);
  drawBison(g, 1170, 448, 0.86, f, 0.5, s2.wake, s2.reveal);
  drawBison(g, 1015, 486, 0.58, f, 0.25, s3.wake, s3.reveal);
}

// ---------------------------------------------------------------- 伸手按印（正手 → 负印）
/** f207-240 一只正形手从画面下方伸向印点（f240 化为负形手印——正负形转换是本片签名时刻）。 */
export function drawReachingHand(g: CanvasCtx, f: number): void {
  if (f < 207 || f >= 240) return;
  const q = (f - 207) / 33;
  const ease = q * q * (3 - 2 * q);
  const x = 1430, y = 720 - ease * 430;
  const rot = -0.28 + ease * 0.05;
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  const blocks = handBlocks(1.06);
  blocks.forEach((p) => {
    g.lineJoin = 'round';
    g.strokeStyle = `${PAL.ink}`;
    g.lineWidth = 9;
    g.stroke(p);
  });
  blocks.forEach((p) => {
    g.fillStyle = PAL.red;
    g.globalAlpha = 0.92;
    g.fill(p);
  });
  g.globalAlpha = 1;
  g.restore();
}

/** 吹颜料显形喷雾在野牛身上的落点雾（f88-150 红雾渐沉）。 */
export function drawBlowMist(g: CanvasCtx, f: number): void {
  const k = clamp((f - 88) / 12) * clamp((150 - f) / 12);
  if (k <= 0) return;
  spray(g, 800, 400, 95, 150, '#9c3520', 907, 1.2, 4, 0.08, 0.42 * k);
}
