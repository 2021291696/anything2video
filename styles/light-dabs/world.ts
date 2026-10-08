// ============================================================================
// world.ts — 《花园里的一小时》印象派光斑世界：底稿 / 两遍分区笔触 / 方向场 / 区域色板 / 烘焙
// 签名纪律（配方 08_impressionism，RECON-huashu §08）：
//   ① 两遍分区笔触：主画面粗笔 cell11/len20/w7/jitterCol26 + 窗景（《日出》同）细笔 cell6/len11/w4.5
//   ② 方向场分区：墙向右上斜（阳光区 -0.95 / 其余 -0.55 ± 0.55 噪声 + 火苗摇曳 t 项）/
//      地面近水平 / 窗帘与桌布竖向 / 盆栽从盆口放射 / 窗内天空横向
//   ⑤ 笔触位置固定（boil:0）、方向场连续摇曳——「活而不闪」：8 个烘焙态共用同一笔触种子，
//      只冻结不同方向场时间项 t（stable 契约下随机流恒定，逐格 px/py/palette/len 完全一致）
//   ⑦ stable() 防重洗为默认行为：palette 过 stable（每格恰 1 个随机数、永不 null），
//      底稿动不重洗已画格子（08_impressionism v2 频闪事故的解法本体）
// 锁死 token：粉紫墙系 + 奶黄阳光 + 玫瑰橙紫地面（配方 08 色板照抄）
// 性能纪律：底稿+两遍分区笔触+角色层按烘焙态预渲染为静态位图（scripts/bake_paint.mjs 8 态），
//   热帧只 drawImage + 运动/光斑层矢量重画；禁 Math.random/Date。
// 技法借鉴 huashu-art-motion lib/paint.js P.strokes/P.swatch + scenes/08_impressionism.js
//   (MIT, alchaincyf)，TS 重写——机制与参数级借鉴，结构/命名/API 按 Remotion/TS 惯用法重写。
// ============================================================================
import {
  makeNoise2d, mixRGB, paintStrokes, stable, swatch,
  type AngleFn, type PaletteFn, type RGB, type RawPaletteFn,
} from './strokes';
import {newCanvas} from './strokes';
import {W, H} from '../common';
import {drawActors, charStrokes} from './actors';

// ---- 场景几何（1280×720）----
export const WX0 = 248, WX1 = 527, WY0 = 88, WY1 = 365;      // 窗洞
export const PT = {x0: 625, y0: 128, x1: 792, y1: 248};       // 墙上《日出·印象》
export const FLOOR_Y = 520;                                    // 地面线
export const CURT_L = {x0: 193, x1: 240}, CURT_R = {x0: 538, x1: 592}; // 窗帘
export const CLOTH = {x0: 553, y0: 408, x1: 808, y1: 543};     // 桌布
export const PLANT = {x0: 1013, y0: 187, y1: 523, px: 1093, py1: 603, cx: 1143, cy: 533};
export const CAT_BOX = {x0: 372, y0: 612, x1: 505, y1: 688};   // 猫占位（光斑避让）
export const GIRL_FACE = {x: 200, y: 258, rx: 12.5, ry: 15};   // 脸保护（INDEX 短板修正）
export const HANDS: Array<[number, number, number]> = [[190, 468, 9], [212, 466, 9]];

export const inWin = (x: number, y: number) => x > WX0 && x < WX1 && y > WY0 && y < WY1;
export const inPainting = (x: number, y: number) => x > PT.x0 && x < PT.x1 && y > PT.y0 && y < PT.y1;
/** 细笔区 = 窗景 + 墙上《日出》（粗笔 mask 取反） */
export const fineZone = (x: number, y: number) => inWin(x, y) || inPainting(x, y);

// ---- 锁死 token（配方 08 区域色板照抄，mixBase 0.3–0.45 保明暗）----
export const PAL_WALL = ['#f3c6d2', '#e8b6dc', '#f6dcc0', '#d8c0ec', '#fbe8b0', '#f0a8c0', '#c8b8f0', '#fff2d8', '#e8c8f0'];
export const PAL_SUNNY = ['#fff0b0', '#fbe08a', '#ffe8c8', '#f8d0d8', '#fff8e0', '#f0c0d8', '#e8d0f8'];
export const PAL_FLOOR = ['#e8a090', '#d88aa0', '#f0b890', '#c890b8', '#f6c8a0', '#b0a0d8', '#e89880'];
export const PAL_SKY = ['#8ab4e8', '#a8c8f0', '#f0f4ff', '#7aa0e0', '#c0d8f8'];
export const PAL_GREEN = ['#5aa84a', '#8ac860', '#3a8a4a', '#b8d870', '#2f7a50', '#a0e080'];
export const PAL_LAV = ['#b8b0f0', '#d0c8f8', '#9890e0', '#e8e0ff', '#ffffff'];
export const PAL_CLOTH = ['#ece8fa', '#b8b0ec', '#f8f4ff', '#a49ce0', '#fff8f0', '#9a96d8'];
const WHITE_FRAME: RGB = [255, 252, 246];

// ---- 方向场（t = 烘焙态冻结的方向场时间项；正片热帧不再进这里）----
const noise = makeNoise2d(87);
export const angleField: AngleFn = (x, y, t) => {
  if (inPainting(x, y)) return 0.03 * Math.sin(y * 0.45);                        // 《日出》横向水波笔
  if (inWin(x, y)) {
    if (y < 200) return 0.05 * Math.sin(x * 0.075);                              // 窗内天空横向
    return -0.5 + 0.6 * noise(x * 0.045, y * 0.045) + 0.22 * Math.sin(t * 2.2 + x * 0.03); // 花草随风轻转
  }
  if (x > PLANT.x0 && y > PLANT.y0 && y < PLANT.y1)
    return Math.atan2(y - PLANT.cy, x - PLANT.cx) + 0.3 * noise(x * 0.03, y * 0.03) + 0.12 * Math.sin(t * 1.9); // 盆栽放射
  if (y > FLOOR_Y) return 0.12 * noise(x * 0.006, y * 0.015) - 0.05;             // 地面近水平
  if (((x > CURT_L.x0 && x < CURT_L.x1) || (x > CURT_R.x0 && x < CURT_R.x1)) && y > 60 && y < 417)
    return -Math.PI / 2 + 0.15 * noise(x * 0.03, y * 0.015);                     // 窗帘竖向
  if (x > CLOTH.x0 && x < CLOTH.x1 && y > CLOTH.y0 && y < CLOTH.y1) return -Math.PI / 2 + 0.2; // 桌布竖向
  const sunny = x > 667 && y < 347;
  return (sunny ? -0.95 : -0.55) + 0.55 * noise(x * 0.009, y * 0.009 + t * 0.35); // 墙：向右上斜（阳光区更陡）+ 火苗摇曳
};

// ---- 区域色板路由（分发不吃随机数；swatch 抽色恰 1 个；stable 兜底永不 null）----
const SW = {
  wall: swatch(PAL_WALL, 0.35),
  sunny: swatch(PAL_SUNNY, 0.3),
  floor: swatch(PAL_FLOOR, 0.4),
  sky: swatch(PAL_SKY, 0.4),
  green: swatch(PAL_GREEN, 0.4),
  lav: swatch(PAL_LAV, 0.35),
  cloth: swatch(PAL_CLOTH, 0.45),
};
const rawPalette: RawPaletteFn = (x, y, col, r) => {
  if (inWin(x, y)) {
    if (col[0] > 180 && col[1] < 90) return null;                    // 红屋顶保底稿色
    if (y < 200 && col[2] >= col[1]) return SW.sky(x, y, col, r);
    if (col[1] > col[0]) return SW.green(x, y, col, r);
    return null;                                                     // 撑伞人/花丛保底稿色
  }
  if (inPainting(x, y)) return null;                                 // 《日出》保留
  if (x > PLANT.x0 && y > PLANT.y0 && y < PLANT.y1) return col[1] > col[0] ? SW.green(x, y, col, r) : null;
  if (x > PLANT.px && y >= FLOOR_Y && y < PLANT.py1) return null;    // 白花盆保底
  if (x > 556 && x < 623 && y > 327 && y < 427) return null;         // 花瓶花束保底
  // 白窗框保白（INDEX 短板修正的配方参数：col>(240,236,225) 判定，混回白）
  if (col[0] > 240 && col[1] > 236 && col[2] > 225 && x > 218 && x < 562 && y > 70 && y < 396)
    return mixRGB(WHITE_FRAME, col, 0.3);
  if (((x > CURT_L.x0 && x < CURT_L.x1) || (x > CURT_R.x0 && x < CURT_R.x1)) && y > 60 && y < 417) return SW.lav(x, y, col, r);
  if (x > CLOTH.x0 && x < CLOTH.x1 && y > CLOTH.y0 && y < CLOTH.y1) return SW.cloth(x, y, col, r);
  if (y > FLOOR_Y) return SW.floor(x, y, col, r);
  if (x > 667 && y < 347) return SW.sunny(x, y, col, r);
  return SW.wall(x, y, col, r);
};
export const paletteScene: PaletteFn = stable(rawPalette);

// ---- 底稿平涂（进程内常驻，一次构建）----
function buildBase(): HTMLCanvasElement {
  const c = newCanvas(W, H);
  const g = c.getContext('2d')!;
  // 墙：粉紫，右上方暖黄阳光
  const wg = g.createLinearGradient(0, 0, W, 200);
  wg.addColorStop(0, '#d8bede'); wg.addColorStop(0.5, '#f0c8cc'); wg.addColorStop(1, '#f2c4d4');
  g.fillStyle = wg; g.fillRect(0, 0, W, 527);
  const sun = g.createRadialGradient(933, -67, 33, 933, -67, 600);
  sun.addColorStop(0, 'rgba(255,240,170,.85)'); sun.addColorStop(1, 'rgba(255,240,170,0)');
  g.fillStyle = sun; g.fillRect(467, 0, 813, 527);
  // 地板 + 踢脚
  const fg = g.createLinearGradient(0, 520, 0, H);
  fg.addColorStop(0, '#d9a8b0'); fg.addColorStop(1, '#d88a80');
  g.fillStyle = fg; g.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
  g.fillStyle = '#b8a8dc'; g.fillRect(0, 512, W, 12);
  // 窗外花园
  g.save(); g.beginPath(); g.rect(WX0, WY0, WX1 - WX0, WY1 - WY0); g.clip();
  const sk = g.createLinearGradient(0, WY0, 0, 200);
  sk.addColorStop(0, '#7aa6e2'); sk.addColorStop(1, '#bcd4f0');
  g.fillStyle = sk; g.fillRect(WX0, WY0, WX1 - WX0, 112);
  // 树林（噪声轮廓）
  g.fillStyle = '#3e8a46'; g.beginPath(); g.moveTo(WX0, 240);
  for (let x = WX0; x <= WX1; x += 8) g.lineTo(x, 220 - Math.abs(noise(x * 0.03, 1)) * 40 - (x > 400 && x < 480 ? 40 * Math.sin(((x - 400) / 80) * Math.PI) : 0));
  g.lineTo(WX1, 240); g.closePath(); g.fill();
  // 红顶小屋
  g.fillStyle = '#f0e6d0'; g.fillRect(303, 203, 34, 27);
  g.fillStyle = '#d0402a'; g.beginPath(); g.moveTo(299, 206); g.lineTo(320, 190); g.lineTo(341, 206); g.closePath(); g.fill();
  // 草地
  const mg = g.createLinearGradient(0, 233, 0, WY1);
  mg.addColorStop(0, '#9ccc5a'); mg.addColorStop(1, '#6aa840');
  g.fillStyle = mg; g.fillRect(WX0, 233, WX1 - WX0, WY1 - 233);
  // 撑阳伞的女子＋孩子（《罂粟田》致敬）
  const wx = 363, wy = 313;
  g.fillStyle = '#2a3a6a'; g.beginPath(); g.moveTo(wx - 8, wy + 33); g.lineTo(wx + 9, wy + 33); g.lineTo(wx + 3, wy); g.lineTo(wx - 3, wy); g.closePath(); g.fill();
  g.fillStyle = '#f6f0e8'; g.beginPath(); g.arc(wx, wy - 4, 4, 0, 7); g.fill();
  g.fillStyle = '#4aa0c8'; g.beginPath(); g.ellipse(wx - 3, wy - 15, 17, 8, -0.3, Math.PI, 0); g.fill();
  g.strokeStyle = '#2a3a6a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(wx - 3, wy - 15); g.lineTo(wx + 1, wy + 5); g.stroke();
  g.fillStyle = '#f6f0e8'; g.fillRect(337, 328, 7, 15); g.fillStyle = '#e8b040'; g.beginPath(); g.arc(340, 325, 4, 0, 7); g.fill();
  // 花丛
  g.fillStyle = '#5a9a40'; g.beginPath(); g.ellipse(490, 337, 29, 23, 0, 0, 7); g.fill();
  for (let k = 0; k < 14; k++) { g.fillStyle = k % 2 ? '#f4a0c0' : '#fff0f4'; g.beginPath(); g.arc(473 + ((k * 37) % 38), 324 + ((k * 23) % 27), 4, 0, 7); g.fill(); }
  g.fillStyle = '#c87a40'; g.fillRect(481, 353, 17, 13);
  g.restore();
  // 白窗框＋窗格＋窗台＋窗帘杆
  g.strokeStyle = '#fbf6ee'; g.lineWidth = 12; g.strokeRect(WX0 - 6, WY0 - 6, WX1 - WX0 + 12, WY1 - WY0 + 12);
  g.lineWidth = 6; g.beginPath(); g.moveTo(387, WY0); g.lineTo(387, WY1); g.moveTo(WX0, 180); g.lineTo(WX1, 180); g.moveTo(WX0, 273); g.lineTo(WX1, 273); g.stroke();
  g.fillStyle = '#fbf6ee'; g.fillRect(230, 373, 313, 13);
  g.fillStyle = '#d8b040'; g.fillRect(180, 61, 427, 6);
  // 淡紫窗帘（静置底稿；摆动由运动层帘缘微光承担）
  for (const [x0, x1] of [[CURT_L.x0, CURT_L.x1], [CURT_R.x0, CURT_R.x1]]) {
    const cg = g.createLinearGradient(x0, 0, x1, 0);
    cg.addColorStop(0, '#c4baf2'); cg.addColorStop(0.5, '#e6e0fc'); cg.addColorStop(1, '#a89ee6');
    g.fillStyle = cg; g.beginPath(); g.moveTo(x0, 65); g.lineTo(x1, 65);
    g.quadraticCurveTo(x1 + 12, 253, x1 + 3 + 15, 413); g.lineTo(x0 - 3 + 15, 413); g.closePath(); g.fill();
  }
  // 《日出·印象》
  g.fillStyle = '#e0b850'; g.fillRect(PT.x0, PT.y0, PT.x1 - PT.x0, PT.y1 - PT.y0);
  const sg = g.createLinearGradient(0, PT.y0 + 8, 0, PT.y1 - 5);
  sg.addColorStop(0, '#9aa8c8'); sg.addColorStop(1, '#5a78a8');
  g.fillStyle = sg; g.fillRect(633, 136, 146, 104);
  g.fillStyle = '#f05a28'; g.beginPath(); g.arc(728, 164, 7.3, 0, 7); g.fill();
  for (let k = 0; k < 5; k++) g.fillRect(719 + (k % 2) * 4, 180 + k * 10.6, 17 - k * 2, 4);
  g.fillStyle = '#1e2a4a'; g.beginPath(); g.moveTo(679, 212); g.lineTo(708, 212); g.lineTo(704, 219); g.lineTo(683, 219); g.closePath(); g.fill(); g.fillRect(692, 200, 2, 12);
  // 椅背
  g.fillStyle = '#8a5a40'; g.fillRect(984, 313, 9, 280);
  // 圆桌：桌腿、桌布、桌面
  g.fillStyle = '#5a4a6a'; g.fillRect(661, 527, 11, 60);
  g.beginPath(); g.moveTo(627, 595); g.lineTo(667, 579); g.lineTo(707, 595); g.lineWidth = 5.3; g.strokeStyle = '#5a4a6a'; g.stroke();
  const cl = g.createLinearGradient(560, 0, 800, 0);
  cl.addColorStop(0, '#f2eefc'); cl.addColorStop(0.6, '#d8d0f4'); cl.addColorStop(1, '#b8aee8');
  g.fillStyle = cl; g.beginPath(); g.moveTo(561, 421); g.lineTo(799, 421); g.lineTo(804, 533);
  g.quadraticCurveTo(680, 543, 557, 533); g.closePath(); g.fill();
  g.fillStyle = '#faf6ff'; g.beginPath(); g.ellipse(680, 421, 120, 12, 0, 0, 7); g.fill();
  // 花瓶＋花束＋茶壶
  g.fillStyle = '#a8d0e8'; g.beginPath(); g.moveTo(573, 420); g.quadraticCurveTo(567, 387, 583, 373); g.lineTo(603, 373);
  g.quadraticCurveTo(617, 393, 608, 420); g.closePath(); g.fill();
  const FLW = ['#f06a8a', '#ffffff', '#c88af0', '#f8c040', '#ff9ab0'];
  for (let k = 0; k < 22; k++) {
    const a = (k / 22) * Math.PI * 2, rr = 15 + ((k * 13) % 20), sw = Math.sin(k) * 2;
    g.fillStyle = FLW[k % 5]; g.beginPath(); g.arc(592 + Math.cos(a) * rr + sw, 350 + Math.sin(a) * rr * 0.8, 6, 0, 7); g.fill();
  }
  g.fillStyle = '#5a9a50';
  for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(580 + k * 5.3, 371, 3.3, 9.3, -0.6 + k * 0.25, 0, 7); g.fill(); }
  g.fillStyle = '#f4f4fc'; g.beginPath(); g.moveTo(641, 420); g.lineTo(644, 385); g.quadraticCurveTo(661, 377, 677, 385); g.lineTo(680, 420); g.closePath(); g.fill();
  g.fillStyle = '#7a8ac8'; g.fillRect(643, 400, 36, 5.3);
  g.fillStyle = '#c89878'; g.beginPath(); g.ellipse(661, 383, 16, 4.6, 0, 0, 7); g.fill();
  // 右侧盆栽：绿团＋粉花＋白盆
  g.fillStyle = '#4fa050'; g.beginPath(); g.moveTo(1040, 520);
  g.bezierCurveTo(1000, 373, 1067, 220, 1140, 200);
  g.bezierCurveTo(1220, 220, 1287, 373, 1253, 520); g.closePath(); g.fill();
  g.fillStyle = '#8acc60'; g.beginPath(); g.ellipse(1120, 320, 60, 93, -0.3, 0, 7); g.fill();
  for (let k = 0; k < 18; k++) {
    const x = 1060 + ((k * 71) % 180), y = 253 + ((k * 53) % 253);
    g.fillStyle = k % 3 ? '#f070a8' : '#ffd0e4'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill();
  }
  g.fillStyle = '#f2f4fc'; g.beginPath(); g.moveTo(1100, 520); g.lineTo(1191, 520); g.lineTo(1180, 600); g.lineTo(1111, 600); g.closePath(); g.fill();
  g.fillStyle = '#4a6ad0'; for (let k = 0; k < 6; k++) g.fillRect(1109 + k * 13.3, 537 + (k % 2) * 20, 8, 13);
  // 地面阴影（少女/猫/桌）
  g.fillStyle = 'rgba(150,100,170,.5)';
  g.beginPath(); g.ellipse(210, 600, 95, 11, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(428, 672, 90, 10, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(673, 595, 100, 9.3, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(867, 620, 140, 12, 0, 0, 7); g.fill();
  return c;
}

// ---- 角色：平涂 + source-atop 细笔触（烘焙进位图；详见 actors.ts）----
function drawCharacters(g: CanvasRenderingContext2D): void {
  const L = newCanvas(W, H);
  const lg = L.getContext('2d', {willReadFrequently: true})!;
  drawActors(lg);
  charStrokes(lg, L);
  g.drawImage(L, 0, 0);
}

// ---- 烘焙：底稿 + 两遍分区笔触 + 角色层（键 = 烘焙态 i；笔触种子恒定，只有方向场 t 变）----
let base: HTMLCanvasElement | null = null;
const cache = new Map<number, HTMLCanvasElement>();

export const getPainting = (i: number): HTMLCanvasElement => {
  const hit = cache.get(i);
  if (hit) return hit;
  if (!base) base = buildBase();
  const out = newCanvas(W, H);
  const g = out.getContext('2d')!;
  g.fillStyle = '#f2e6ee'; g.fillRect(0, 0, W, H);      // 浅色画布底，笔触缝隙里露出
  g.drawImage(base, 0, 0);
  const t = (i + 0.5) * 0.1;                            // 方向场时间项冻结点（8 态小步长：态间摆动可见且邻帧差受控）
  paintStrokes(g, base, {cell: 11, len: 20, width: 7, angle: angleField, seed: 12, t, boil: 0,
    outline: 0, jitterCol: 26, palette: paletteScene, mask: (x, y) => !fineZone(x, y)});
  paintStrokes(g, base, {cell: 6, len: 11, width: 4.5, angle: angleField, seed: 13, t, boil: 0,
    outline: 0, jitterCol: 26, palette: paletteScene, mask: fineZone});
  drawCharacters(g);
  cache.set(i, out);
  return out;
};
