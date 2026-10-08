// ============================================================================
// world.ts — 《一声尖叫的形状》蒙克表现主义世界（战役 4 批次④ scream-warp）
// 签名纪律（RECON-huashu §19 + 配方 19_munch，源分辨率 1920×1080 参数 1:1）：
//   ① 长弯流线笔 flowLines（与梵高刻意分化：无描边 / 步数 26–42 / 一根 200–300px / 薄涂半透明）
//   ② 24px 抖动网格种子≈3854，分区参数 天[32,7,10,.78] 峡湾[26,6,9,.78] 山丘[12,6,8,.8]
//      墙[42,7,13,.5] 地[32,8,12,.55]，沿 angle 场积分越区即停（区域边界干净）
//   ③ 方向场：天 0.55sin(x.011+y.018−2.4t)｜峡湾绕心切线｜墙竖向 ±0.5 扭｜地指向消失点
//   ④ 整幅按行/列正弦 warp（世界在流动），margin 14/8 ≥ 最大位移 13/6 防露缝
//   ⑤ 血色天空：种子按波浪化 y yy=y+22sin(x.014−2.2t) 决定 28px 色带、血红 7 色循环
//   ⑥ screamWarp 转场：旧画按行扭曲、波浪前沿压 4 道 26px 色带（kit.tsx）
// 性能纪律：底稿 + flowLines + 桥景按 boilSeed(8fps) 预烘焙为静态位图（Bake 合成 → PNG，
//   见 bake.tsx / scripts/bake_paint.mjs）；热帧只 drawImage + 尖叫者/流光/声波环矢量重画
//   + warp 行列 blit。逐帧确定性：mulberry32 + 解析时间函数，禁 Math.random/Date。
// ============================================================================
import {
  boilSeed, hex2rgb, mixRGB, newCanvas, StrokeCache, type RGB,
} from './strokes';
import {flowLines, flowSeeds, warpCols, warpRows, type FlowAngleFn, type FlowColorFn, type FlowParams} from './flow';

/** 画布（源分辨率：24px 网格≈3854 种子、28px 色带、一根笔 200–300px 全部按源卡口径锁死） */
export const PW = 1920;
export const PH = 1080;
export const BOIL_FPS = 8;
export const BAKE_N = 8;

// ---- 锁死色板 token（配方 19 照抄，禁改色值）----
export const PAL_SKY = ['#e2541c', '#f08a24', '#f4c03a', '#c8301e', '#e8743a', '#f6a63a', '#b82a1e']; // 血红 7 色
export const PAL_FJORD = ['#1d3a6a', '#2c5a8a', '#3a4a7a', '#14243e', '#4a6aa0']; // 峡湾蓝
export const PAL_HILL = ['#2a4a2a', '#1e3a3a', '#43603a', '#5a6a2a'];
export const PAL_WALL = ['#8a2e1c', '#a8441e', '#6a2418', '#b8562a', '#7a3020', '#c86a2a', '#3a2a4a'];
export const PAL_FLOOR = ['#8a5a2a', '#a8703a', '#6a3a1e', '#c88a42', '#4a2a1a'];
/** 墙底渐变（锁死 token：#a8401e→#5a1a14，笔缝露同色不是黑） */
export const WALL_TOP = '#a8401e';
export const WALL_BOTTOM = '#5a1a14';
/** screamWarp 前沿 4 道色带（签名⑥） */
export const BAND_COLORS = ['#b82a1e', '#e2541c', '#f08a24', '#f4c03a'];
export const BAND_W = 26;

// ---- 场景几何（源分辨率 px）----
export const shoreY = (x: number) => 430 + 60 * Math.sin(x * 0.006 + 1.2);   // 天空下缘
export const waterY = (x: number) => shoreY(x) + 150 + 25 * Math.sin(x * 0.005 + 3); // 峡湾下缘
export const deckY = (x: number) => 700 + x * 0.10;                          // 桥面（地上缘）
export const hillEdge = (y: number) => 230 + 130 * Math.sin(y * 0.0042 + 5.0); // 左岸山丘楔
export const FJORD_C: [number, number] = [960, 585];                          // 峡湾绕行中心
export const VP: [number, number] = [1180, 770];                              // 桥面消失点
export const SCREAMER_X = 730;                                                // 尖叫者站位
export const SCREAMER_Y = deckY(SCREAMER_X);                                  // 脚底 = 桥面线

// ---- 区域判定（分发不吃随机数）----
export const regionOf = (x: number, y: number, _t: number): string => {
  if (y < shoreY(x)) return 'sky';
  if (y < waterY(x)) return 'fjord';
  if (x < hillEdge(y) && y < deckY(x)) return 'hill';
  if (y < deckY(x)) return 'wall';
  return 'floor';
};

// ---- 方向场（签名③，配方 19 锁死公式）----
export const angleOf: FlowAngleFn = (x, y, t, reg) => {
  switch (reg) {
    case 'sky':
      return 0.55 * Math.sin(x * 0.011 + y * 0.018 - t * 2.4) + 0.15 * Math.sin(y * 0.05 + t * 3);
    case 'fjord': {
      const a = Math.atan2(y - FJORD_C[1], x - FJORD_C[0]);
      return a + Math.PI / 2 + 0.3 * Math.sin(t * 2 + a * 2);
    }
    case 'hill':
      return -0.9 + 0.4 * Math.sin(y * 0.03 + t * 2);
    case 'wall': // 竖向 ±0.5 扭（源卡默认分支）
      return -Math.PI / 2 + 0.5 * Math.sin(y * 0.011 + x * 0.005 + t * 2.4) + 0.2 * Math.sin(x * 0.03 - t * 3);
    default: // floor：指向消失点
      return Math.atan2(y - VP[1], x - VP[0]) + 0.18 * Math.sin(x * 0.01 + t * 2.6);
  }
};

// ---- 分区笔参数（签名②，配方 19 锁死；山丘沿用源卡 hill 档）----
export const FLOW_PARAMS: FlowParams = {
  sky: [32, 7, 10, 0.78],
  fjord: [26, 6, 9, 0.78],
  hill: [12, 6, 8, 0.8],
  wall: [42, 7, 13, 0.5],
  floor: [32, 8, 12, 0.55],
};
/** 种子网格：24px 抖动网格 ≈3854 枚（源卡「种子≈3600」同口径） */
export const SEEDS = flowSeeds(PW, PH, 24, 5);

// ---- 血色天空取色（签名⑤）：种子按「波浪化的 y」决定 28px 色带、7 色循环 ----
export const SKY_BAND = 28;
export const skyBandColor = (sx: number, sy: number, r1: number, t: number): RGB => {
  const yy = sy + 22 * Math.sin(sx * 0.014 - t * 2.2) + 8 * Math.sin(sx * 0.05 + t * 3);
  const band = Math.floor(yy / SKY_BAND + r1 * 0.6);
  return hex2rgb(PAL_SKY[((band % 7) + 7) % 7]);
};

const pick = (pal: string[], r1: number): RGB => hex2rgb(pal[(r1 * pal.length) | 0]);
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
/** 流线取色：天 = 色带；墙 = 区域色混暗（深度越深越暗，源卡同参）；其余区域直抽 */
export const flowColorOf: FlowColorFn = (reg, sx, sy, r1, t) => {
  if (reg === 'sky') return skyBandColor(sx, sy, r1, t);
  if (reg === 'wall') {
    const col = pick(PAL_WALL, r1);
    return mixRGB(col, [30, 12, 10], clamp01((sy - 300) / 900) * 0.4);
  }
  if (reg === 'fjord') return pick(PAL_FJORD, r1);
  if (reg === 'hill') return pick(PAL_HILL, r1);
  return pick(PAL_FLOOR, r1);
};

// ---- 区域底色（笔缝里露出来的是同色系，不是黑）----
export function baseFill(g: CanvasRenderingContext2D): void {
  // 墙（岸坡）底：锁死渐变 #a8401e→#5a1a14
  const wg = g.createLinearGradient(0, 420, 0, 920);
  wg.addColorStop(0, WALL_TOP);
  wg.addColorStop(1, WALL_BOTTOM);
  g.fillStyle = wg;
  g.fillRect(0, 0, PW, PH);
  // 地（桥面/路）：deckY 以下
  const fg = g.createLinearGradient(0, 700, 0, PH);
  fg.addColorStop(0, '#7a4a22');
  fg.addColorStop(1, '#4a2614');
  g.fillStyle = fg;
  g.beginPath();
  g.moveTo(0, deckY(0));
  g.lineTo(PW, deckY(PW));
  g.lineTo(PW, PH);
  g.lineTo(0, PH);
  g.closePath();
  g.fill();
  // 峡湾：shore→water 蓝-绿带
  const og = g.createLinearGradient(0, 460, 0, 740);
  og.addColorStop(0, '#2c5a8a');
  og.addColorStop(0.55, '#1d3a6a');
  og.addColorStop(1, '#14243e');
  g.fillStyle = og;
  g.beginPath();
  for (let x = 0; x <= PW; x += 32) {
    const y = shoreY(x);
    if (x) g.lineTo(x, y); else g.moveTo(0, y);
  }
  for (let x = PW; x >= 0; x -= 32) g.lineTo(x, waterY(x));
  g.closePath();
  g.fill();
  // 天：血色渐变（色带的底）
  const sg = g.createLinearGradient(0, 0, 0, 460);
  sg.addColorStop(0, '#f08a24');
  sg.addColorStop(0.45, '#e2541c');
  sg.addColorStop(0.8, '#c8301e');
  sg.addColorStop(1, '#9a2830');
  g.fillStyle = sg;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(PW, 0);
  for (let x = PW; x >= 0; x -= 32) g.lineTo(x, shoreY(x));
  g.closePath();
  g.fill();
  // 左岸山丘深绿楔
  g.fillStyle = '#24382a';
  g.beginPath();
  g.moveTo(0, waterY(0));
  for (let y = waterY(0); y <= deckY(0); y += 20) g.lineTo(hillEdge(y), y);
  g.lineTo(0, deckY(0));
  g.closePath();
  g.fill();
}

// ---- 桥景（烘焙层）：三条扭动栏杆 + 立柱 + 桥板缝 + 远处两个戴帽人影 ----
export function bridge(g: CanvasRenderingContext2D, t: number): void {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  // 三条栏杆（随世界扭的波浪线）
  const railCols = ['#3a1e14', '#2a140e', '#1a0c08'];
  for (let k = 0; k < 3; k++) {
    g.strokeStyle = railCols[k];
    g.lineWidth = 9 - k * 2;
    g.beginPath();
    for (let x = -20; x <= PW + 20; x += 48) {
      const y = deckY(x) - 26 - k * 24 + Math.sin(x * 0.008 + t * 3 + k * 1.3) * 7;
      if (x > -20) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.stroke();
  }
  // 立柱
  g.strokeStyle = '#2a140e';
  g.lineWidth = 7;
  for (let x = 40; x < PW; x += 96) {
    const yr = deckY(x) - 26 + Math.sin(x * 0.008 + t * 3) * 7;
    g.beginPath();
    g.moveTo(x + 3, yr);
    g.lineTo(x, deckY(x) + 14);
    g.stroke();
  }
  // 桥板缝
  g.strokeStyle = 'rgba(30,14,10,0.5)';
  g.lineWidth = 4;
  for (let k = 1; k <= 6; k++) {
    g.beginPath();
    for (let x = -20; x <= PW + 20; x += 64) {
      const y = deckY(x) + k * 30 + Math.sin(x * 0.006 + t * 2.4 + k) * 5;
      if (x > -20) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.stroke();
  }
  // 远处两个戴帽人影（桥远端，站在桥面线上）
  [400, 452].forEach((x, k) => {
    const y = deckY(x) - 27;
    g.fillStyle = '#171018';
    g.beginPath();
    g.ellipse(x, y, 9, 26, 0.04 * Math.sin(t * 2 + k), 0, Math.PI * 2);
    g.fill();
    g.fillRect(x - 11, y - 30, 22, 5);
    g.fillRect(x - 6, y - 38, 12, 8);
  });
}

// ---- 尖叫者（动态层，签名母题）：骷髅脸、双手捂颊、嘴张合 7+2sin(9t)、身体摆 sin(3.2t)·0.12 ----
export function screamer(g: CanvasRenderingContext2D, t: number, intensity = 1): void {
  const sway = Math.sin(t * 3.2) * 0.12;
  g.save();
  g.translate(SCREAMER_X, SCREAMER_Y);
  g.rotate(sway);
  // 黑袍（一道扭动的钟形）
  g.fillStyle = '#221826';
  g.beginPath();
  g.moveTo(-34, 0);
  g.bezierCurveTo(-46, -46, -16, -56, -22, -98);
  g.lineTo(22, -98);
  g.bezierCurveTo(16, -56, 48, -38, 38, 0);
  g.closePath();
  g.fill();
  // 头（微微后仰 = 尖叫强度）
  g.translate(0, -118);
  g.rotate(-sway * 0.6 - 0.05 * intensity);
  g.fillStyle = '#d8c890';
  g.beginPath();
  g.ellipse(0, 0, 23, 30, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#3a2a20';
  g.lineWidth = 2.5;
  g.stroke();
  // 空洞眼
  g.fillStyle = '#2a1e2e';
  g.beginPath();
  g.ellipse(-9, -7, 5.5, 7.5, 0, 0, Math.PI * 2);
  g.ellipse(9, -7, 5.5, 7.5, 0, 0, Math.PI * 2);
  g.fill();
  // 嘴（张合 7+2sin(9t)，hero 放大）
  const mo = (7 + Math.sin(t * 9) * 2) * intensity;
  g.beginPath();
  g.ellipse(0, 13, 5.5, mo, 0, 0, Math.PI * 2);
  g.fill();
  // 双手捂颊
  g.fillStyle = '#c8b480';
  [-1, 1].forEach((s) => {
    g.beginPath();
    g.ellipse(s * 24, 4, 7.5, 16, -s * 0.25, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  });
  // 手臂
  g.strokeStyle = '#221826';
  g.lineWidth = 10;
  [-1, 1].forEach((s) => {
    g.beginPath();
    g.moveTo(s * 24, 15);
    g.quadraticCurveTo(s * 33, 54, s * 22, 78);
    g.stroke();
  });
  g.restore();
}

// ---- 尖叫声波环（动态层）：从嘴部扩散的扁椭圆，随世界一起被 warp ----
export function screamRings(g: CanvasRenderingContext2D, t: number, u: number): void {
  if (u <= 0) return;
  const cx = SCREAMER_X;
  const cy = SCREAMER_Y - 105;
  for (let k = 0; k < 3; k++) {
    const ph = (t * 0.85 + k / 3) % 1;
    const r = 30 + ph * 300;
    g.strokeStyle = `rgba(244,192,58,${(0.42 * u * (1 - ph)).toFixed(3)})`;
    g.lineWidth = 5.5 - ph * 3.5;
    g.beginPath();
    g.ellipse(cx, cy, r, r * 0.6, 0, 0, Math.PI * 2);
    g.stroke();
  }
}

// ---- 血色天空流光（动态层，连续时间项）：骑在色带波前上的长波线，让「天空在流」连续可感 ----
export function skyGlow(g: CanvasRenderingContext2D, t: number, u: number): void {
  if (u <= 0) return;
  g.save();
  g.lineCap = 'round';
  for (let k = 0; k < 4; k++) {
    const yb = 90 + k * 92;
    g.strokeStyle = k % 2 ? `rgba(244,192,58,${(0.3 * u).toFixed(3)})` : `rgba(240,138,36,${(0.32 * u).toFixed(3)})`;
    g.lineWidth = 3.5;
    g.beginPath();
    for (let x = 0; x <= PW; x += 40) {
      const y = yb + 18 * Math.sin(x * 0.011 - t * 1.4 + k * 1.8) + 8 * Math.sin(x * 0.027 + t * 2.2 + k);
      if (x) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.stroke();
  }
  g.restore();
}

// ---- 整幅 warp 公式（签名④，源卡锁死：行 9sin+4sin、列 6sin；margin 14/8 ≥ 最大位移 13/6）----
export const rowDisp = (y: number, t: number, amp: number) =>
  amp * (9 * Math.sin(y * 0.012 + t * 4.2) + 4 * Math.sin(y * 0.031 - t * 6));
export const colDisp = (x: number, t: number, amp: number) =>
  amp * 6 * Math.sin(x * 0.009 - t * 3.6);
export const WARP_MARGIN_ROW = 14;
export const WARP_MARGIN_COL = 8;
export const BACKDROP = '#3a1410'; // warp 裸边由暗底接住（源卡同色）

// ---- 烘焙位图访问（Bake 合成预渲染 → public/assets/scream-warp/paint/wide-<i>.png）----
const imgCache = new Map<string, HTMLImageElement>();
export const paintUrl = (i: number) => `assets/scream-warp/paint/wide-${i}.png`;
/** 正片侧注册（kit.tsx 用 staticFile 载入后登记；本文件不 import remotion，保持可独立复用） */
export const registerPaintImg = (i: number, img: HTMLImageElement): void => {
  imgCache.set(paintUrl(i), img);
};
/** 进程内直绘（Bake 合成 / Bench 用）：底稿 + flowLines + 桥景，种子键 = boilSeed */
const cache = new StrokeCache(3);
export const getPainting = (seedKey: number): HTMLCanvasElement => {
  const key = `wide:${seedKey}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const out = newCanvas(PW, PH);
  const g = out.getContext('2d')!;
  g.fillStyle = BACKDROP;
  g.fillRect(0, 0, PW, PH);
  baseFill(g);
  const t = (seedKey + 0.5) / BOIL_FPS; // 方向场/色带时间项冻结在沸腾窗中点
  flowLines(g, SEEDS, {t, region: regionOf, angle: angleOf, color: flowColorOf, params: FLOW_PARAMS, extraSteps: 8});
  bridge(g, t);
  cache.put(key, out);
  return out;
};

// ---- 模块级草稿画布（单线程渲染，跨帧复用）----
const mk = () => {
  const c = newCanvas(PW, PH);
  return {cv: c, g: c.getContext('2d')!};
};
let scratch: {paint: ReturnType<typeof mk>; warp: ReturnType<typeof mk>} | null = null;
let scratchOld: {paint: ReturnType<typeof mk>; warp: ReturnType<typeof mk>} | null = null;
const ensure = (s: {paint: ReturnType<typeof mk>; warp: ReturnType<typeof mk>}) => {
  s.paint.g.clearRect(0, 0, PW, PH);
  s.warp.g.clearRect(0, 0, PW, PH);
  s.warp.g.fillStyle = BACKDROP;
  s.warp.g.fillRect(0, 0, PW, PH);
  return s;
};

export interface WorldDrawOpts {
  /** 连续时间秒（warp/流光/声波环相位） */
  t: number;
  /** 沸腾种子键（→ 烘焙位图下标） */
  boilKey: number;
  /** warp 幅度系数 0..1（1 = 源卡满幅：行 ±13px、列 ±6px） */
  amp: number;
  /** 尖叫声波环强度 0..1 */
  rings: number;
  /** 天空流光强度 0..1 */
  glow: number;
  /** 尖叫者强度（嘴部张合/头部后仰放大，hero=1.35） */
  mouth?: number;
  /** 跳过 warp（screamWarp 转场内层自己按行扭曲时置 true） */
  noWarp?: boolean;
}

/** 未 warp 的一帧世界：烘焙位图 + 尖叫者 + 声波环 + 天空流光 */
export const paintWorldFrame = (s: {paint: ReturnType<typeof mk>}, o: WorldDrawOpts): void => {
  const g = s.paint.g;
  g.clearRect(0, 0, PW, PH);
  const idx = ((Math.floor(o.boilKey) % BAKE_N) + BAKE_N) % BAKE_N;
  const img = imgCache.get(paintUrl(idx));
  if (img && img.complete && img.naturalWidth > 0) {
    g.drawImage(img, 0, 0, PW, PH);
  } else {
    // 兜底：进程内直绘（Bake 前的预览 / 图未就绪），与烘焙同码同参
    g.drawImage(getPainting(100 + idx * 57), 0, 0);
  }
  skyGlow(g, o.t, o.glow);
  screamRings(g, o.t, o.rings);
  screamer(g, o.t, o.mouth ?? 1);
};

/** 成帧：paint（已由 paintWorldFrame 画好）→ 行 warp → 列 warp → dst（暗底接裸边）。
 *  注意：这里只清 warp 草稿——paint 草稿清场是 paintWorldFrame 自己的职责（先清后画）。 */
export const presentWorld = (dst: CanvasRenderingContext2D, s: {paint: ReturnType<typeof mk>; warp: ReturnType<typeof mk>}, o: WorldDrawOpts): {paint: ReturnType<typeof mk>; warp: ReturnType<typeof mk>} => {
  s.warp.g.clearRect(0, 0, PW, PH);
  s.warp.g.fillStyle = BACKDROP;
  s.warp.g.fillRect(0, 0, PW, PH);
  if (o.noWarp) {
    dst.clearRect(0, 0, PW, PH);
    dst.drawImage(s.paint.cv, 0, 0);
    return s;
  }
  warpRows(s.warp.g, s.paint.cv, (y) => rowDisp(y, o.t, o.amp), 8, WARP_MARGIN_ROW);
  dst.clearRect(0, 0, PW, PH);
  dst.fillStyle = BACKDROP;
  dst.fillRect(0, 0, PW, PH);
  warpCols(dst, s.warp.cv, (x) => colDisp(x, o.t, o.amp), 8, WARP_MARGIN_COL);
  return s;
};

/** 正片热帧：完整一帧世界（含 warp）画进 dst */
export const drawWorld = (dst: CanvasRenderingContext2D, o: WorldDrawOpts): void => {
  if (!scratch) scratch = {paint: mk(), warp: mk()};
  paintWorldFrame(scratch, o);
  presentWorld(dst, scratch, o);
};

/** screamWarp 转场素材：旧画按行扭曲（幅度随 e 增，源卡 70e·sin+20e·sin、margin 92e），返回扭曲后画布 */
export const oldWarpedForTransition = (o: WorldDrawOpts, e: number, ph: number): HTMLCanvasElement => {
  if (!scratchOld) scratchOld = {paint: mk(), warp: mk()};
  const s = ensure(scratchOld);
  paintWorldFrame(s, o);
  warpRows(s.warp.g, s.paint.cv, (y) => 70 * e * Math.sin(y * 0.014 + ph) + 20 * e * Math.sin(y * 0.05 - ph), 6, 92 * e);
  return s.warp.cv;
};

/** screamWarp 转场素材：新画按行扭曲（幅度随 e 减，源卡 60(1−e)·sin、margin 62(1−e)），返回扭曲后画布 */
export const newWarpedForTransition = (o: WorldDrawOpts, e: number, ph: number): HTMLCanvasElement => {
  if (!scratch) scratch = {paint: mk(), warp: mk()};
  const s = ensure(scratch);
  paintWorldFrame(s, o);
  warpRows(s.warp.g, s.paint.cv, (y) => 60 * (1 - e) * Math.sin(y * 0.013 - ph), 6, 62 * (1 - e));
  return s.warp.cv;
};

/** boil 下标（正片按 t 换图） */
export const boilIndexOf = (t: number): number => boilSeed(t, BOIL_FPS);
