// ============================================================================
// world.ts — 《池上的桥》莫奈睡莲池世界：底稿 / 四遍 boil 分档笔触 / 桥独立成层 / 烘焙
// 签名纪律（配方 28_monet，RECON-huashu §28）：
//   ① 短横笔水面：cell 9 / len 34 / w 6.5 / angle≈0±0.06 / boil 6（沸）+ 正片 160 根光斑颤动（motion.ts）
//   ② boil 分档纪律：水面 boil 6（沸）／顶冠叶幕+远岸树荫 boil 6（植物区活）／
//      岸堤 boil 0（静）／桥体结构 boil 0（笃定）——全屏 6fps 沸腾=帧差 47% 满屏噪声（08 教训在
//      「分档」上的应用）：只让水和叶沸，结构与地不沸。
//   ③ 桥独立成层：先铺深色树荫衬底 #24452a 系（远岸树荫带），桥亮线 #3f8a62/#8fdcae 才不被
//      叶色板吞掉——「主体先铺深衬底再描亮线」通用纪律。
//   ⑤ 色彩阴影：桥层 source-atop 受光侧叠暖黄 α.22 / 背光侧叠紫 α.32（印象派光色，比灰阶阴影高一档）。
//   空间语义（INDEX 短板修正）：huashu 28 的「墙=池水壁画、地=木地板」室内空间别扭——本卡改构图：
//   全画即户外睡莲池正视（顶冠叶幕→远岸树荫带→日本桥→开阔水面→左右岸堤），无室内墙面/地板。
//   烘焙：6 态 = boilSeed 0..5（正片 idx=floor((f-1)/5)%6 换图 = 恰 6fps 沸腾，与 boil:6 等价且确定性）；
//   岸/桥 boil 0 各态相同；热帧 drawImage + motion.ts 矢量层（睡莲漂/光斑/涟漪/紫藤/柳影）。
// 锁死 token：水/叶/粉/柳/岸色板照抄配方 28（mixBase 0.3–0.45 保明暗，禁改色值）。
// 技法借鉴 huashu-art-motion lib/paint.js P.strokes/P.swatch + scenes/28_monet.js
//   (MIT, alchaincyf)，TS 重写——机制与参数级借鉴，结构/命名/API 按 Remotion/TS 惯用法重写。
// ============================================================================
import {
  hex2rgb, makeNoise2d, mixRGB, paintStrokes, stable, swatch,
  type AngleFn, type PaletteFn, type RawPaletteFn,
} from './strokes';
import {newCanvas} from './strokes';

/** 确定性格点 hash（零状态纯函数，禁 Math.random） */
export const hash2 = (i: number, j: number): number => {
  let a = (Math.floor(i) * 374761393 + Math.floor(j) * 668265263) >>> 0;
  a = (a ^ 61) ^ (a >>> 16);
  a = (a + (a << 3)) | 0;
  a = a ^ (a >>> 4);
  a = Math.imul(a, 0x27d4eb2d);
  a = a ^ (a >>> 15);
  return (a >>> 0) / 4294967296;
};

// ---- 场景几何（1280×720，全画=户外睡莲池）----
export const DARK = {x0: 0, y0: 128, x1: 1280, y1: 360};          // 远岸树荫带（桥的深衬底，全宽远岸树林，边缘噪声波状）
export const BR = {x0: 110, x1: 1170, base: 352, lift: 95, cx: 640, half: 530}; // 桥几何
/** 桥面弧线：端点 y=352，顶点 y=257 */
export const deckY = (x: number): number => {
  const q = Math.min(1, Math.max(-1, (x - BR.cx) / BR.half));
  return BR.base - BR.lift * (1 - q * q);
};
export const BRIDGE_GLOW = {x0: 100, y0: 185, x1: 1180, y1: 405}; // 桥层范围（含栏杆）

const BANK_L: Array<[number, number]> = [[0, 285], [120, 295], [215, 340], [195, 430], [110, 470], [0, 480]];
const BANK_R: Array<[number, number]> = [[1280, 285], [1160, 295], [1065, 340], [1085, 430], [1170, 470], [1280, 480]];
const MOUND = [{cx: 55, cy: 712, rx: 185, ry: 50}, {cx: 1225, cy: 712, rx: 185, ry: 50}];

const inPoly = (x: number, y: number, poly: Array<[number, number]>): boolean => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const inMound = (x: number, y: number): boolean =>
  MOUND.some((m) => ((x - m.cx) / m.rx) ** 2 + ((y - m.cy) / m.ry) ** 2 < 1);

// 树荫带上下缘（噪声波状——与叶幕衔接、底缘垂舌入水，消灭矩形缝）
const DARK_TOP = (x: number): number => 128 + 26 * noise(x * 0.014, 3.3);
const DARK_BOT = (x: number): number => 318 + 38 * noise(x * 0.012, 7.7);

export const isCanopy = (x: number, y: number): boolean => y < DARK_TOP(x);
export const isDark = (x: number, y: number): boolean =>
  x > DARK.x0 && x < DARK.x1 && y >= DARK_TOP(x) && y <= DARK_BOT(x);
export const isBank = (x: number, y: number): boolean =>
  inPoly(x, y, BANK_L) || inPoly(x, y, BANK_R) || inMound(x, y);

// ---- 锁死 token（配方 28 区域色板照抄，mixBase 0.3–0.45 保明暗）----
export const PAL_WATER = ['#5b6fb5', '#7d8fd0', '#9db5e0', '#6aa0a8', '#b7a6d8', '#d9c8e8', '#8fb8a8', '#a6c4e8', '#c8b0d8'];
export const PAL_GREEN = ['#5f8f4a', '#7fae5a', '#3f6f4a', '#9cc070', '#6f9a7a', '#b4cc78'];
export const PAL_PINK = ['#f0a0b8', '#f7d0dc', '#fff2f4', '#e88aa0'];
export const PAL_WILLOW = ['#3f6a58', '#557a4a', '#2e5048', '#6a5f9a', '#4a6aa0'];
export const PAL_FLOOR = ['#c69a6a', '#b07a5a', '#d8b08a', '#9a6a7a', '#8a7aa8', '#e0bc90'];
export const PAL_LEAF = ['#4f7f3a', '#6f9a40', '#2f5a30', '#9cbf58', '#c0d070', '#3a6a5a', '#b8a0dc'];
export const PAL_WOODS = ['#2f5a30', '#3a6a5a', '#24452a', '#2e5048', '#557a4a'];
export const PAL_BRIDGE = ['#8fdcae', '#a8e8c0', '#6fc49a', '#c0f0d0', '#7fb8d8'];
export const DAB_COLORS = ['#fffbe8', '#fdf0d0', '#f8e0ec', '#e8f4ff'];
export const WISTERIA_COLORS = ['#b8a0dc', '#d6c0ee', '#9a86c8', '#e8dcf6'];

// ---- 方向场（t = 烘焙态冻结项；分区笔向是本卡的「画风骨架」）----
const noise = makeNoise2d(2828);
export const angleField: AngleFn = (x, y, t) => {
  if (isCanopy(x, y)) {
    return y < 88 ? -0.95 + 0.34 * noise(x * 0.02, y * 0.02) + 0.1 * Math.sin(t + x * 0.01)
                   : 0.05 * Math.sin(x * 0.03 + t);                                        // 上垂笔/下横笔
  }
  if (isDark(x, y)) return 0.03 * Math.sin(y * 0.03 + x * 0.004);                              // 远岸近水平
  if (isBank(x, y)) return 0.08 + 0.12 * noise(x * 0.01, y * 0.01);                            // 岸堤（配方地板场）
  return 0.04 * Math.sin(y * 0.05 + x * 0.004) + 0.03 * noise(x * 0.01, y * 0.01);             // 水面：横笔 ≈0±0.06
};

// ---- 区域色板（分发按坐标区域路由，swatch 抽色恰 1 个随机数；stable 兜底永不 null）----
const SW = {
  water: swatch(PAL_WATER, 0.5),
  leaf: swatch(PAL_LEAF, 0.35),
  woods: swatch(PAL_WOODS, 0.4),
  floor: swatch(PAL_FLOOR, 0.35),
  green: swatch(PAL_GREEN, 0.4),
};
export const paletteScene: PaletteFn = stable((x, y, col, r) => {
  if (isCanopy(x, y)) return SW.leaf(x, y, col, r);
  if (isDark(x, y)) return SW.woods(x, y, col, r);
  if (isBank(x, y)) return y < 362 ? SW.green(x, y, col, r) : SW.floor(x, y, col, r);  // 草坡上位/岸土下位
  return SW.water(x, y, col, r);
});

// ---- 底稿平涂（进程内常驻，一次构建）----
function polyPath(g: CanvasRenderingContext2D, poly: Array<[number, number]>): void {
  g.beginPath();
  poly.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
}

function buildBase(): HTMLCanvasElement {
  const c = newCanvas(1280, 720);
  const g = c.getContext('2d')!;
  // 水面：上浅下深（紫蓝绿），整画即池
  const wg = g.createLinearGradient(0, 0, 0, 720);
  wg.addColorStop(0, '#b9c7e6'); wg.addColorStop(0.35, '#8fa6d6'); wg.addColorStop(0.7, '#6c84bf'); wg.addColorStop(1, '#4f669e');
  g.fillStyle = wg; g.fillRect(0, 0, 1280, 720);
  // 远岸树荫带（桥的深衬底 #24452a 系——签名③；波状边界：上缘接叶幕、下缘垂舌入水）
  const fillWavy = (top: (x: number) => number, bot: (x: number) => number): void => {
    g.beginPath();
    for (let x = DARK.x0; x <= DARK.x1; x += 8) g.lineTo(x, top(x));
    for (let x = DARK.x1; x >= DARK.x0; x -= 8) g.lineTo(x, bot(x));
    g.closePath();
  };
  const dg = g.createLinearGradient(0, 128, 0, DARK.y1);
  dg.addColorStop(0, '#2a4a30'); dg.addColorStop(1, '#223f2a');
  g.fillStyle = dg;
  fillWavy(DARK_TOP, DARK_BOT); g.fill();
  // 顶冠叶幕：浓密树叶（70 团，配方 60 团节奏，覆盖 DARK_TOP 以上）
  for (let i = 0; i < 70; i++) {
    const h1 = hash2(i, 3), h2 = hash2(i, 5), h3 = hash2(i, 9);
    const px = h1 * 1280, py = h2 * DARK.y1 * 0.42;
    g.fillStyle = ['#4f8a3a', '#6fa040', '#2f5a30', '#9cbf58', '#3a6a5a'][i % 5];
    g.beginPath(); g.ellipse(px, py, 30 + h3 * 30, 20 + h2 * 20, 0, 0, Math.PI * 2); g.fill();
  }
  // 左右岸堤（桥 landing 的草坡，上位草绿下位岸土）
  const bg = g.createLinearGradient(0, 285, 0, 480);
  bg.addColorStop(0, '#7f9a58'); bg.addColorStop(0.5, '#b89058'); bg.addColorStop(1, '#b07a5a');
  g.fillStyle = bg;
  polyPath(g, BANK_L); g.fill();
  polyPath(g, BANK_R); g.fill();
  // 前景岸墩（左右下角）+ 芦苇
  for (const m of MOUND) {
    g.fillStyle = '#a08058';
    g.beginPath(); g.ellipse(m.cx, m.cy, m.rx, m.ry, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#6f8f4a';
    g.beginPath(); g.ellipse(m.cx, m.cy - m.ry * 0.55, m.rx * 0.9, m.ry * 0.5, 0, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 7; i++) {
      const rx = m.cx + (i - 3) * 17 + (i % 2) * 6;
      const sway = i % 2 ? 10 : -8;
      g.strokeStyle = i % 2 ? '#3a6a5a' : '#557a4a'; g.lineWidth = 4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(rx, m.cy - 26); g.quadraticCurveTo(rx + sway * 0.4, m.cy - 78, rx + sway, m.cy - 124 - (i % 3) * 12); g.stroke();
    }
  }
  return c;
}

// ---- 桥独立成层：深衬底条 → 粗线拱桥 → source-atop 细笔 → 色彩阴影（签名③⑤）----
const BR_RAW: RawPaletteFn = (_x, _y, col, r) => {
  const k = PAL_BRIDGE[(r() * PAL_BRIDGE.length) | 0];      // 恰 1 个随机数
  return col[1] > 140 && col[0] < 170 ? mixRGB(hex2rgb(k), col, 0.3) : null;  // 用不用=亮度纯函数
};
export const paletteBridge: PaletteFn = stable(BR_RAW);

function buildBridge(): HTMLCanvasElement {
  const c = newCanvas(1280, 720);
  const g = c.getContext('2d', {willReadFrequently: true})!;
  // 深衬底条（桥后一圈更深，保证亮线对比）
  g.fillStyle = 'rgba(31,56,38,0.92)';
  g.beginPath();
  for (let x = BRIDGE_GLOW.x0; x <= BRIDGE_GLOW.x1; x += 8) g.lineTo(x, deckY(x) - 58);
  for (let x = BRIDGE_GLOW.x1; x >= BRIDGE_GLOW.x0; x -= 8) g.lineTo(x, deckY(x) + 16);
  g.closePath(); g.fill();
  // 桥体：绿色粗线拱 + 亮线栏杆 + 竖栏（配方 28 桥层 1:1 参数比例）
  g.lineCap = 'round';
  const strokeArc = (dy: number, w: number, col: string): void => {
    g.strokeStyle = col; g.lineWidth = w; g.beginPath();
    for (let x = BR.x0; x <= BR.x1; x += 6) { const y = deckY(x) + dy; x === BR.x0 ? g.moveTo(x, y) : g.lineTo(x, y); }
    g.stroke();
  };
  strokeArc(0, 20, '#3f8a62');      // 桥面
  strokeArc(-46, 8, '#8fdcae');     // 扶手
  strokeArc(-24, 6, '#5fae82');     // 中栏
  g.strokeStyle = '#6fae86'; g.lineWidth = 5;
  for (let x = 122; x <= 1158; x += 30) {
    g.beginPath(); g.moveTo(x, deckY(x)); g.lineTo(x, deckY(x) - 46); g.stroke();
  }
  // source-atop 细笔（cell5/len10/w4/boil0——桥体结构笃定档）
  g.save(); g.globalCompositeOperation = 'source-atop';
  paintStrokes(g, c, {cell: 5, len: 10, width: 4, seed: 27, t: 0, boil: 0, outline: 0, jitterCol: 10,
    alphaMask: true, angle: () => 0.1, palette: paletteBridge});
  // 色彩阴影：受光侧暖黄 α.22 → 背光侧紫 α.32（source-atop，签名⑤）
  const sg = g.createLinearGradient(140, 240, 1140, 420);
  sg.addColorStop(0, 'rgba(255,236,170,0.22)'); sg.addColorStop(1, 'rgba(110,100,190,0.32)');
  g.fillStyle = sg; g.fillRect(BRIDGE_GLOW.x0, BRIDGE_GLOW.y0, BRIDGE_GLOW.x1 - BRIDGE_GLOW.x0, BRIDGE_GLOW.y1 - BRIDGE_GLOW.y0);
  g.restore();
  return c;
}

// ---- 烘焙：底稿 + 四遍 boil 分档笔触 + 桥层（键 = 烘焙态 i = boilSeed 0..5）----
export const BAKE_N = 6;
let base: HTMLCanvasElement | null = null;
let bridge: HTMLCanvasElement | null = null;
const cache = new Map<number, HTMLCanvasElement>();

export const getPainting = (i: number): HTMLCanvasElement => {
  const hit = cache.get(i);
  if (hit) return hit;
  if (!base) base = buildBase();
  if (!bridge) bridge = buildBridge();
  const out = newCanvas(1280, 720);
  const g = out.getContext('2d')!;
  g.drawImage(base, 0, 0);
  const t = i / 6;                                      // 冻结点 = boilSeed(t,6)=i（6 态恰一沸循环）
  // ① 水面短横笔（沸档）
  paintStrokes(g, base, {cell: 9, len: 34, width: 6.5, angle: angleField, seed: 21, t, boil: 6,
    outline: 0, jitterCol: 14, palette: paletteScene,
    mask: (x, y) => !isCanopy(x, y) && !isDark(x, y) && !isBank(x, y)});
  // ② 顶冠叶幕细笔（沸档，植物区活）
  paintStrokes(g, base, {cell: 6, len: 13, width: 4.5, angle: angleField, seed: 22, t, boil: 6,
    outline: 0, jitterCol: 16, palette: paletteScene, mask: isCanopy});
  // ②' 远岸树荫带（沸档——叶影在动）
  paintStrokes(g, base, {cell: 7, len: 16, width: 5, angle: angleField, seed: 23, t, boil: 6,
    outline: 0, jitterCol: 10, palette: paletteScene, mask: isDark});
  // ③ 岸堤粗笔（静档 boil 0）
  paintStrokes(g, base, {cell: 12, len: 34, width: 8, angle: angleField, seed: 24, t, boil: 0,
    outline: 0, jitterCol: 12, palette: paletteScene, mask: isBank});
  // ④ 桥层（结构笃定档 boil 0，独立成层叠加）
  g.drawImage(bridge, 0, 0);
  cache.set(i, out);
  return out;
};
