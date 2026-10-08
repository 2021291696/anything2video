// 蓝屋角色（签名③④⑥）：拉长的人影（El Greco 式瘦长，0.84×1.12 绕脚轴）＋ 橘白猫（0.82×1.14）。
// 几何全部走 stretch.ts 的 R.stretch 移植（矩阵烘进 Path2D+点列+锚点，线宽不变）；
// 上色 = 单色明度映射（签名⑥ MONO_MAP：橘→中蓝/白→浅蓝/金发→最亮蓝灰比肤亮一档）；
// 下垂披肩（从头顶罩到腰下）＋长指绕杯＋垂目疏笔是「忧郁造型」的组成件（拉长+慢速在 Scene/时间层）。
// 轮廓纪律：普鲁士蓝 #0c1830「全描边→全填色」两段式（visibleLines 的近似）——先画所有部件的
// 描边、再按遮挡序填所有色，填色盖掉一切内侧线，只剩剪影外轮廓的半宽线（约 5px，笃定不沸腾）。
import {BLUE, type CanvasCtx} from './types';
import {strokes} from './brush';
import {smoothPath, stretchGeom, stretchMatrix, type Geom, type Part, type Pt} from './stretch';

export const girlPal = {
  skin: '#90a9be', hair: '#cbd8e0', dress: '#1e3a6a', sleeve: '#24457a',
  stocking: '#10223f', shoe: '#0c1830', lip: '#4a6a8c', iris: '#0c1830',
  brow: '#2a3a52', shawl: '#6b8fb6', cupBody: '#c6d4e0', cupRim: '#2d4a6e',
} as const;
export const catPal = {
  orange: '#4f719a', stripe: '#273f66', white: '#b6c8d8', eye: '#c9d6e2',
  earInner: '#6b8fb6', nose: '#4a6a8c', whisker: '#c9d6e2',
} as const;

const P = (arr: number[][]): Pt[] => arr as Pt[];
/** 上身随呼吸起伏的量（幅度约为常规编舞 2 倍、频率 0.45 倍——breathe 由 Scene 以慢相时算好传入）。 */
const up = (y: number, b: number): number => (y < 470 ? b * 130 * ((470 - y) / 95) : 0);
const sp = (pts: Pt[], closed = true): Part => smoothPath(pts, closed);

/** 端杯少女（未拉长空间）：cup 0..1 端杯进度（1.25s 慢举由 Scene 给），breathe 呼吸量。 */
export function buildGirl(cup: number, breathe: number): Geom {
  const T = (p: Pt): Pt => [p[0], p[1] + up(p[1], breathe)];
  const t = (arr: number[][]): Pt[] => P(arr).map(T);
  // 手与杯的慢举轨迹（rest 在桌上碟心 → raised 到唇边），中段带一点弧
  const hand: Pt = [716 + (764 - 716) * cup, 404 + (392 - 404) * cup - Math.sin(cup * Math.PI) * 5];
  const cupPos: Pt = [698 + (750 - 698) * cup, 393 + (376 - 393) * cup - Math.sin(cup * Math.PI) * 4];
  const elbow: Pt = [(800 + hand[0]) / 2 - 4, (432 + hand[1]) / 2 + 16];
  const parts: Record<string, Part> = {
    hairBack: sp(t([[784, 350], [796, 344], [810, 350], [816, 366], [817, 386], [812, 404], [800, 412], [790, 404], [786, 384], [782, 366]])),
    neck: sp(t([[788, 392], [800, 392], [802, 424], [786, 424]])),
    legA: sp(t([[742, 566], [754, 562], [758, 610], [748, 612]])),
    legB: sp(t([[770, 570], [782, 566], [788, 612], [776, 614]])),
    footA: sp(t([[746, 610], [762, 610], [764, 618], [740, 618]])),
    footB: sp(t([[774, 612], [790, 612], [792, 620], [768, 620]])),
    skirt: sp(t([[772, 498], [824, 498], [828, 540], [806, 570], [752, 574], [738, 552], [748, 524]])),
    torso: sp(t([[774, 420], [820, 420], [826, 462], [824, 498], [772, 498], [768, 458]])),
    face: sp(t([[772, 358], [768, 372], [772, 384], [778, 392], [788, 394], [798, 392], [806, 382], [808, 366], [804, 352], [790, 346], [778, 350]])),
    bangs: sp(t([[770, 356], [776, 346], [790, 342], [804, 346], [810, 356], [806, 362], [794, 354], [780, 354]])),
    shawl: sp(t([[780, 344], [795, 339], [816, 398], [826, 442], [836, 538], [812, 538], [807, 468], [804, 418], [797, 386], [786, 362]])),
    armUpper: sp(t([[794, 424], [812, 432], [elbow[0] + 10, elbow[1] + 8], [elbow[0] - 8, elbow[1] + 2]])),
    forearm: sp(t([[elbow[0] - 6, elbow[1] - 8], [elbow[0] + 8, elbow[1] + 2], [hand[0] + 6, hand[1] + 8], [hand[0] - 6, hand[1] - 4]])),
  };
  const A: Record<string, Pt> = {
    headTop: T([794, 342]), forehead: T([772, 352]), nape: T([818, 404]), back: T([828, 446]),
    waist: T([824, 498]), shoulder: T([802, 428]), hand, cup: cupPos, mouth: T([770, 384]),
  };
  return {parts, A};
}

/** 橘白猫（未拉长空间，朝右坐望少女）：tail 摆量（慢相时驱动），breathe 由 Scene ×1.4 传入。 */
export function buildCat(tail: number, breathe: number): Geom {
  const T = (p: Pt): Pt => [p[0], p[1] + up(p[1], breathe)];
  const t = (arr: number[][]): Pt[] => P(arr).map(T);
  const tip: Pt = [292 + tail * 8, 560 + tail * 14];
  const parts: Record<string, Part> = {
    tailBase: sp(t([[326, 596], [310, 590], [300, 576], [296, 566]]), false),
    tailTip: sp([T([298, 568]), [tip[0], tip[1]]], false),
    body: sp(t([[326, 602], [318, 570], [320, 534], [330, 510], [344, 498], [360, 494], [372, 500], [378, 514], [382, 540], [384, 572], [380, 602]])),
    chest: sp(t([[366, 522], [376, 546], [380, 584], [372, 602], [356, 602], [360, 556], [356, 530]])),
    legA: sp(t([[358, 556], [368, 554], [370, 602], [359, 602]])),
    legB: sp(t([[372, 556], [380, 554], [383, 602], [373, 602]])),
    stripe1: sp(t([[322, 530], [338, 536], [340, 546], [324, 542]])),
    stripe2: sp(t([[318, 556], [334, 562], [336, 572], [320, 568]])),
    head: sp(t([[350, 492], [354, 478], [364, 472], [374, 478], [378, 492], [372, 506], [358, 508]])),
    earL: sp(t([[350, 488], [355, 465], [367, 479]])),
    earR: sp(t([[371, 479], [380, 460], [386, 483]])),
  };
  const A: Record<string, Pt> = {eye: T([368, 494]), nose: T([376, 499]), earInA: T([358, 476]), earInB: T([376, 471])};
  return {parts, A};
}

type Drawable = {path: Path2D; fill: string; lw: number};

/** 两段式上色（visibleLines 的近似）：第一遍全部描边（线宽为可见轮廓的 2 倍，填色吃掉内半），
 * 第二遍按遮挡序全部填色——内侧线全被盖掉，只剩剪影轮廓，笃定不沸腾。 */
function paintAll(c: CanvasCtx, items: Drawable[]): void {
  c.lineJoin = 'round';
  for (const it of items) {
    if (it.lw > 0) {
      c.strokeStyle = BLUE.line;
      c.lineWidth = it.lw;
      c.stroke(it.path);
    }
  }
  for (const it of items) {
    c.fillStyle = it.fill;
    c.fill(it.path);
  }
}

const partItem = (part: Part, fill: string, lw: number): Drawable => ({path: part.path, fill, lw});
/** Path2D 椭圆（指/杯/耳内等程序形状）。 */
const ell = (x: number, y: number, rx: number, ry: number, rot = 0): Path2D => {
  const p = new Path2D();
  p.ellipse(x, y, rx, ry, rot, 0, 7);
  return p;
};

/** 少女部件表（含手/长指/杯，全走同一两段式）。 */
function girlItems(G: Geom): Drawable[] {
  const p = girlPal;
  const cup = G.A.cup;
  const fingers: Drawable[] = [0, 1, 2].map((k) => {
    const a = -2.4 + k * 0.28;
    return {path: ell(cup[0] + 2 + Math.cos(a) * 12, cup[1] + 4 + Math.sin(a) * 12, 15, 3, a), fill: p.skin, lw: 4};
  });
  const cupBody = new Path2D();
  cupBody.moveTo(cup[0] - 7, cup[1] - 6);
  cupBody.lineTo(cup[0] + 7, cup[1] - 6);
  cupBody.lineTo(cup[0] + 5, cup[1] + 5);
  cupBody.lineTo(cup[0] - 5, cup[1] + 5);
  cupBody.closePath();
  return [
    partItem(G.parts.hairBack, p.hair, 10),
    partItem(G.parts.neck, p.skin, 10),
    partItem(G.parts.legA, p.stocking, 8),
    partItem(G.parts.legB, p.stocking, 8),
    partItem(G.parts.footA, p.shoe, 6),
    partItem(G.parts.footB, p.shoe, 6),
    partItem(G.parts.skirt, p.dress, 10),
    partItem(G.parts.torso, p.dress, 10),
    partItem(G.parts.face, p.skin, 10),
    partItem(G.parts.bangs, p.hair, 8),
    partItem(G.parts.shawl, p.shawl, 10),
    partItem(G.parts.armUpper, p.sleeve, 10),
    partItem(G.parts.forearm, p.skin, 8),
    ...fingers,
    {path: cupBody, fill: p.cupBody, lw: 6},
    {path: ell(cup[0], cup[1] - 6, 7, 2.2), fill: p.cupRim, lw: 0},
  ];
}

/** 猫部件表。 */
function catItems(G: Geom): Drawable[] {
  const p = catPal;
  const tri = (a: Pt, b: Pt, d: Pt): Path2D => {
    const q = new Path2D();
    q.moveTo(a[0], a[1]);
    q.lineTo(b[0], b[1]);
    q.lineTo(d[0], d[1]);
    q.closePath();
    return q;
  };
  return [
    partItem(G.parts.body, p.orange, 10),
    partItem(G.parts.chest, p.white, 8),
    partItem(G.parts.legA, p.white, 8),
    partItem(G.parts.legB, p.white, 8),
    partItem(G.parts.stripe1, p.stripe, 0),
    partItem(G.parts.stripe2, p.stripe, 0),
    partItem(G.parts.head, p.orange, 10),
    partItem(G.parts.earL, p.orange, 8),
    partItem(G.parts.earR, p.orange, 8),
    {path: tri([G.A.earInA[0], G.A.earInA[1] + 3], [G.A.earInA[0] + 2, G.A.earInA[1] - 5], [G.A.earInA[0] + 7, G.A.earInA[1] + 2]), fill: p.earInner, lw: 0},
    {path: tri([G.A.earInB[0] - 2, G.A.earInB[1] + 4], [G.A.earInB[0] + 3, G.A.earInB[1] - 4], [G.A.earInB[0] + 6, G.A.earInB[1] + 5]), fill: p.earInner, lw: 0},
  ];
}

/** 猫尾（慢摆，开路径直接作形状）：基段橘、梢段深。 */
function paintCatTail(c: CanvasCtx, G: Geom): void {
  c.lineCap = 'round';
  c.strokeStyle = catPal.orange;
  c.lineWidth = 6;
  c.stroke(G.parts.tailBase.path);
  c.strokeStyle = catPal.stripe;
  c.stroke(G.parts.tailTip.path);
}

/** 少女五官（写意疏笔：垂目/低眉是「忧郁」造型的一部分，不画睁眼圆）。 */
function paintGirlFace(c: CanvasCtx, G: Geom): void {
  const p = girlPal;
  const m = G.A.mouth;
  c.lineCap = 'round';
  c.strokeStyle = p.iris;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(m[0] + 3, m[1] - 12);
  c.quadraticCurveTo(m[0] + 9, m[1] - 15, m[0] + 14, m[1] - 11);
  c.stroke(); // 垂目上睑
  c.strokeStyle = p.brow;
  c.lineWidth = 2.5;
  c.beginPath();
  c.moveTo(m[0] + 2, m[1] - 21);
  c.quadraticCurveTo(m[0] + 9, m[1] - 24, m[0] + 15, m[1] - 21);
  c.stroke(); // 低眉
  c.strokeStyle = p.lip;
  c.lineWidth = 2.6;
  c.beginPath();
  c.moveTo(m[0] + 1, m[1] + 1);
  c.lineTo(m[0] + 8, m[1] + 2);
  c.stroke(); // 唇
}

/** 猫脸小件（浅瞳/鼻尖/胡须）。 */
function paintCatFace(c: CanvasCtx, G: Geom): void {
  const p = catPal;
  c.fillStyle = p.eye;
  c.beginPath();
  c.arc(G.A.eye[0], G.A.eye[1], 2.2, 0, 7);
  c.fill();
  c.fillStyle = p.nose;
  c.beginPath();
  c.arc(G.A.nose[0], G.A.nose[1], 1.6, 0, 7);
  c.fill();
  c.strokeStyle = p.whisker;
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(G.A.nose[0] + 2, G.A.nose[1]);
  c.lineTo(G.A.nose[0] + 13, G.A.nose[1] - 3);
  c.moveTo(G.A.nose[0] + 2, G.A.nose[1] + 2);
  c.lineTo(G.A.nose[0] + 13, G.A.nose[1] + 5);
  c.stroke();
}

let charLayer: HTMLCanvasElement | null = null;
let shadowLayer: HTMLCanvasElement | null = null;

/** 角色合成层（drawChars 后由 Scene blit 到主画布）。 */
export function charCanvas(): HTMLCanvasElement | null {
  return charLayer;
}

/** 角色整帧：拉长后的几何 → 两段式填描 → 小笔触肌理 → 冷光渐变 → 成层；同时备好落地长影层。 */
export function drawChars(girl: Geom, cat: Geom): void {
  if (!charLayer) charLayer = document.createElement('canvas');
  if (!shadowLayer) shadowLayer = document.createElement('canvas');
  const L = charLayer;
  L.width = 1280;
  L.height = 720;
  const lg = L.getContext('2d', {willReadFrequently: true})!;
  paintCatTail(lg, cat);
  paintAll(lg, catItems(cat));
  paintCatFace(lg, cat);
  paintAll(lg, girlItems(girl));
  paintGirlFace(lg, girl);
  // 角色小笔触肌理（只在角色上，source-atop；cell7/len18/w6 的 2/3，cap butt）
  lg.save();
  lg.globalCompositeOperation = 'source-atop';
  strokes(lg, L, 1280, 720, {cell: 5, len: 12, width: 4, seed: 21, cap: 'butt', jitterCol: 8, alphaMask: true,
    angle: (x, y) => (x < 507 ? -Math.PI / 2 + 0.6 * Math.sin(y * 0.03) : -Math.PI / 2 + 0.25 * Math.sin(x * 0.045)),
    region: {x: 265, y: 430, w: 190, h: 190}});
  strokes(lg, L, 1280, 720, {cell: 5, len: 12, width: 4, seed: 22, cap: 'butt', jitterCol: 10, alphaMask: true,
    angle: (x, y) => (x < 507 ? -Math.PI / 2 + 0.6 * Math.sin(y * 0.03) : -Math.PI / 2 + 0.25 * Math.sin(x * 0.045)),
    region: {x: 690, y: 300, w: 200, h: 330}});
  // 冷光：左上来的微弱亮、右下沉暗（画在角色内）
  let vg = lg.createLinearGradient(767, 167, 987, 600);
  vg.addColorStop(0, 'rgba(190,210,230,.18)');
  vg.addColorStop(1, 'rgba(5,12,30,.45)');
  lg.fillStyle = vg;
  lg.fillRect(700, 100, 333, 547);
  vg = lg.createLinearGradient(280, 373, 467, 613);
  vg.addColorStop(0, 'rgba(190,210,230,.12)');
  vg.addColorStop(1, 'rgba(5,12,30,.4)');
  lg.fillStyle = vg;
  lg.fillRect(240, 333, 253, 280);
  lg.restore();
  // 落地长影（叙事：「影子被拉得很长很长」）——剪影层备好，合成时随 stretchAmt 压扁右移
  const S = shadowLayer;
  S.width = 1280;
  S.height = 720;
  const sg = S.getContext('2d')!;
  sg.fillStyle = '#0c1830';
  for (const k of ['hairBack', 'torso', 'skirt', 'shawl']) sg.fill(girl.parts[k].path);
}

/** 把长影合成到主画布（以脚为轴压扁翻转 + 右移 + skew，全部随 stretchAmt 0→1）。 */
export function compositeShadow(c: CanvasCtx, girl: Geom, stretchAmt: number): void {
  if (!shadowLayer || stretchAmt <= 0.001) return;
  const a = Math.min(1, stretchAmt);
  const fx = girl.parts.footB.pts[1][0], fy = girl.parts.footB.pts[1][1];
  const m = new DOMMatrix().translateSelf(fx + 250 * a, fy + 4).skewXSelf(0.5 * a).scaleSelf(1 + 0.12 * a, -0.16).translateSelf(-fx, -fy);
  c.save();
  c.globalAlpha = 0.22 * a;
  c.setTransform(m);
  c.drawImage(shadowLayer, 0, 0);
  c.restore();
}

/** 披肩褶线（clip 在拉长后的披肩内，深蓝 4px）。 */
export function shawlPleats(c: CanvasCtx, G: Geom): void {
  const ht = G.A.headTop, np = G.A.nape, bk = G.A.back;
  c.save();
  c.clip(G.parts.shawl.path);
  c.strokeStyle = 'rgba(20,40,80,.6)';
  c.lineWidth = 4;
  c.lineCap = 'round';
  ([[0, 0], [16, 10], [32, 22]] as const).forEach(([dx, dy]) => {
    c.beginPath();
    c.moveTo(ht[0] + 20 + dx, ht[1] + dy);
    c.quadraticCurveTo(np[0] + 20 + dx, np[1] + 26, bk[0] + dx * 0.3, bk[1] + 40 + dy);
    c.stroke();
  });
  c.restore();
}

/** 拉长包：给当前帧的 sx/sy 算几何（Scene 调用）。 */
export function applyStretch(g: Geom, sx: number, sy: number, ax: number, ay: number): Geom {
  if (sx === 1 && sy === 1) return g;
  return stretchGeom(g, stretchMatrix({sx, sy, ax, ay}));
}
