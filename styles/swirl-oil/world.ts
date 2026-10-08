// ============================================================================
// world.ts — 《梵高的夜班》油画世界：底稿 / 三遍分区笔触 / 方向场 / 区域色板 / 亮度层
// 签名纪律（配方 09_postimp 标杆，RECON-huashu §09）：
//   ① 流场长笔触三遍分区：墙竖长 cell14/len64、地沿透视指向消失点 cell12/len46、其余 cell10/len22
//   ② 区域色板 swatch：墙 8 色蓝紫系 / 星空 6 色 / 地板 7 色暖系，mixBase 0.3–0.45
//   ③ 深色描边 outline 0.8–0.9 混 40–45% 深蓝 #141a3c
//   ⑥ 8fps boil 换种子（缓存键 = boilSeed；热帧只 drawImage）
//   ⑦ stable() 防重洗：palette 每格恰好吃 1 个随机数、永不返回 null；
//      「高光格保底稿色」的判定只用亮度（不吃随机数）——08_impressionism v2 事故的解法本体
// 性能纪律：底稿 + 三遍笔触按 boilSeed 预渲染为静态位图（StrokeCache LRU），
//   仅亮度层（漩涡带/星闪/灯晕/光束/海面波光）每帧矢量重画，时间项走 useCurrentFrame。
// ============================================================================
import {
  boilSeed, newCanvas, paintStrokes, stable, swatch, makeNoise2d,
  StrokeCache, type AngleFn, type PaletteFn, type RGB,
} from './strokes';
import {W, H} from '../common';

export const HORIZON = 452;                  // 海平线
export const SEA_BOTTOM = 512;               // 海带下缘（其下 = 地/路径）
export const VP: [number, number] = [640, 452]; // 地板透视消失点（海平线中央）
export const HERO_VORTEX: [number, number, number] = [620, 235, 125]; // hero 漩涡（卷入转场中心）
export const LAMP: [number, number] = [1005, 160]; // 灯塔灯室（灯晕中心）
export const BOIL_FPS = 8;                   // 沸腾换种子频率

// ---- 锁死色板 token（配方 09 照抄；SPEC 同步锁死）----
export const PAL_WALL = ['#7f9be6', '#5f7fd8', '#a7bbf2', '#6c6fd2', '#8ad0e6', '#c3cbf6', '#4f6cc8', '#9a8fe0'];
export const PAL_SKY = ['#22339a', '#2f4fb8', '#5c86dc', '#8fb6ee', '#1b2a78', '#3c6bd0'];
export const PAL_FLOOR = ['#c0573c', '#a8453a', '#d7774a', '#8e3b30', '#5f8f6a', '#c96a52', '#e08a5c'];
export const PAL_SEA = ['#1b2a78', '#24377e', '#2f4fb8', '#3c5cb8', '#16205f'];
export const PAL_ROOF = ['#163a22', '#1f4a2c', '#122f1b', '#275534'];
export const PAL_HALO = ['#fff2a0', '#f6d84a', '#ffe680', '#f0c040'];
export const INK_DEEP: RGB = [20, 26, 60]; // #141a3c 描边深蓝

// ---- 场景几何 ----
export const VORTICES: Array<[number, number, number]> = [HERO_VORTEX, [320, 140, 70], [965, 120, 58]];
export const VORTICES_V: Array<[number, number, number]> = [[640, 330, 290], [260, 150, 110], [1020, 540, 130]];
export const STARS_SCENE: Array<[number, number, number]> = [
  [140, 70, 12], [438, 60, 10], [540, 320, 9], [760, 90, 14], [860, 300, 10],
  [1090, 70, 11], [1210, 190, 9], [80, 250, 10], [490, 200, 8],
];
export const STARS_VORTEX: Array<[number, number, number]> = [
  [180, 120, 16], [420, 80, 12], [900, 140, 18], [1120, 320, 12],
  [140, 480, 14], [760, 560, 12], [480, 300, 9], [980, 440, 10],
];

// ---- 区域判定 ----
const towerHW = (y: number) => 27 + ((y - 190) * 13) / 350; // 塔身半宽（190 顶 27 → 540 底 40）
export const inTower = (x: number, y: number) =>
  y >= 182 && y <= 545 && Math.abs(x - 1006) <= towerHW(y) + 2;
export const inCottageWall = (x: number, y: number) => x >= 130 && x <= 380 && y >= 430 && y <= 545;
export const isWall = (x: number, y: number) => inTower(x, y) || inCottageWall(x, y);
export const isFloor = (x: number, y: number) => y > SEA_BOTTOM;
export const isSea = (x: number, y: number) => y >= HORIZON && y <= SEA_BOTTOM;
const roofTop = (x: number) => (x < 255 ? 435 - (x - 105) * 0.5 : 435 - (405 - x) * 0.5);
export const isRoof = (x: number, y: number) => x >= 105 && x <= 405 && y >= roofTop(x) - 6 && y <= 438;

// ---- 方向场（t = 沸腾窗中点的冻结秒；连续时间项在亮度层走 useCurrentFrame）----
const noise = makeNoise2d(201);
export const skyAngle = (vs: Array<[number, number, number]>): AngleFn => (x, y, t) => {
  let best: [number, number, number] | null = null;
  let bd = 1e9;
  for (const v of vs) {
    const d = Math.hypot(x - v[0], y - v[1]) / v[2];
    if (d < bd) { bd = d; best = v; }
  }
  if (best && bd < 1.6) return Math.atan2(y - best[1], x - best[0]) + Math.PI / 2 + t * 0.3;
  return 0.15 * Math.sin(x * 0.02 + t);
};
export const angleScene: AngleFn = (x, y, t) => {
  if (y < HORIZON) {
    if (isWall(x, y)) return -Math.PI / 2 + 0.26 * noise(x * 0.008 + t * 0.5, y * 0.008 + 3 - t * 0.8); // 墙竖向火苗摇曳
    if (isRoof(x, y)) return x < 255 ? -0.46 : 0.46; // 屋顶沿坡
    if (isSea(x, y)) return 0.02 + 0.06 * Math.sin(y * 0.05 + t * 1.5); // 海面近水平
    return skyAngle(VORTICES)(x, y, t); // 星空沿最近漩涡切线 + 0.3t
  }
  if (isSea(x, y)) return 0.02 + 0.06 * Math.sin(y * 0.05 + t * 1.5);
  return Math.atan2(y - VP[1], x - VP[0]) + 0.06 * Math.sin(t * 2 + x * 0.01); // 地板流向消失点
};

// ---- 区域色板路由（分发不吃随机数；swatch 抽色恰 1 个；高光判定不吃随机数）----
const SW = {
  wall: swatch(PAL_WALL, 0.45),
  sky: swatch(PAL_SKY, 0.45),
  floor: swatch(PAL_FLOOR, 0.3),
  sea: swatch(PAL_SEA, 0.35),
  roof: swatch(PAL_ROOF, 0.3),
  halo: swatch(PAL_HALO, 0.3),
};
const routeSwatch = (x: number, y: number, col: RGB, r: () => number): RGB => {
  if (Math.hypot(x - LAMP[0], y - LAMP[1]) < 95) return SW.halo(x, y, col, r);
  if (y < HORIZON) {
    if (isWall(x, y)) return SW.wall(x, y, col, r);
    if (isRoof(x, y)) return SW.roof(x, y, col, r);
    if (isSea(x, y)) return SW.sea(x, y, col, r);
    return SW.sky(x, y, col, r);
  }
  if (isSea(x, y)) return SW.sea(x, y, col, r);
  return SW.floor(x, y, col, r);
};
/** 高光保护（月亮/星/窗/灯）：colSum>520 的格子保底稿色——判定零随机数，抽取恒做（stable 契约） */
const hiKeep = (col: RGB) => col[0] + col[1] + col[2] > 520;
export const paletteScene: PaletteFn = stable((x, y, col, r) => {
  const picked = routeSwatch(x, y, col, r);
  return hiKeep(col) ? null : picked;
});
export const paletteVortex: PaletteFn = stable((x, y, col, r) => {
  const picked = SW.sky(x, y, col, r);
  return hiKeep(col) ? null : picked;
});

// ---- 底稿平涂（每 variant 一次，进程内常驻）----
function buildBase(variant: 'scene' | 'vortex'): HTMLCanvasElement {
  const c = newCanvas(W, H);
  const g = c.getContext('2d')!;
  // 夜空
  const sky = g.createLinearGradient(0, 0, 0, variant === 'vortex' ? H : HORIZON);
  sky.addColorStop(0, '#141e58');
  sky.addColorStop(1, variant === 'vortex' ? '#3a5bc0' : '#2c4aa8');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, variant === 'vortex' ? H : HORIZON);
  if (variant === 'scene') {
    // 海
    g.fillStyle = '#1b2a66';
    g.fillRect(0, HORIZON, W, SEA_BOTTOM - HORIZON);
    g.fillStyle = '#3c5cb8';
    g.fillRect(0, HORIZON, W, 3);
    // 地 + 亮路径（汇向 VP）
    g.fillStyle = '#8e3b30';
    g.fillRect(0, SEA_BOTTOM, W, H - SEA_BOTTOM);
    g.fillStyle = '#c96a52';
    g.beginPath();
    g.moveTo(604, 468); g.lineTo(676, 468); g.lineTo(800, 720); g.lineTo(470, 720);
    g.closePath(); g.fill();
    // 星空漩涡带（画进底稿：笔触会部分吃掉/保护它们 =「画进去的螺旋」）
    g.lineCap = 'round';
    VORTICES.forEach(([x, y, r], k) => {
      for (let ring = 0; ring < 3; ring++) {
        g.strokeStyle = ring % 2 ? '#8fb3ec' : '#5a82d6';
        g.lineWidth = 14 - ring * 3;
        g.beginPath();
        for (let a = 0; a < Math.PI * 3; a += 0.15) {
          const rr = r * (0.25 + a / (Math.PI * 3)) * (1 - ring * 0.12);
          const aa = a + k * 2.1;
          const px = x + Math.cos(aa) * rr;
          const py = y + Math.sin(aa) * rr * 0.8;
          if (a) g.lineTo(px, py); else g.moveTo(px, py);
        }
        g.stroke();
      }
    });
    // 灯塔：塔身（暗蓝紫，压得住夜空）+ 明暗侧
    const cx = 1006;
    g.fillStyle = '#4a5fb8';
    g.beginPath();
    g.moveTo(cx - 40, 545); g.lineTo(cx - 27, 190); g.lineTo(cx + 27, 190); g.lineTo(cx + 40, 545);
    g.closePath(); g.fill();
    g.fillStyle = '#3a4a9e';
    g.beginPath();
    g.moveTo(cx + 6, 545); g.lineTo(cx + 4, 190); g.lineTo(cx + 27, 190); g.lineTo(cx + 40, 545);
    g.closePath(); g.fill();
    // 渔舍：墙 + 屋顶（门窗/灯室/月亮等小件走道具层，禁被大笔触打碎）
    g.fillStyle = '#5a63c8'; g.fillRect(130, 430, 250, 115);
    g.fillStyle = '#163a22';
    g.beginPath(); g.moveTo(105, 436); g.lineTo(255, 360); g.lineTo(405, 436); g.closePath(); g.fill();
    // 灯晕（小而收，亮核由道具层+亮度层接管）
    const halo = g.createRadialGradient(LAMP[0], LAMP[1], 4, LAMP[0], LAMP[1], 44);
    halo.addColorStop(0, '#fff7c8'); halo.addColorStop(0.45, '#eccf52'); halo.addColorStop(1, 'rgba(120,150,220,0)');
    g.fillStyle = halo;
    g.beginPath(); g.arc(LAMP[0], LAMP[1], 44, 0, Math.PI * 2); g.fill();
  } else {
    // 漩涡特写底稿：预置螺旋色带（星/月全走亮度层，底稿保持纯天空）
    g.lineCap = 'round';
    VORTICES_V.forEach(([x, y, r], k) => {
      for (let ring = 0; ring < 3; ring++) {
        g.strokeStyle = ring % 2 ? '#8fb3ec' : '#5a82d6';
        g.lineWidth = 16 - ring * 4;
        g.globalAlpha = 0.9;
        g.beginPath();
        for (let a = 0; a < Math.PI * 3; a += 0.15) {
          const rr = r * (0.25 + a / (Math.PI * 3)) * (1 - ring * 0.12);
          const aa = a + k * 2.1;
          const px = x + Math.cos(aa) * rr;
          const py = y + Math.sin(aa) * rr * 0.8;
          if (a) g.lineTo(px, py); else g.moveTo(px, py);
        }
        g.stroke();
      }
    });
    g.globalAlpha = 1;
  }
  return c;
}

// ---- 道具层（配方纪律：小物件被大笔触打碎 → 单独画 + 单独细笔触 source-atop）----
let propsLayer: HTMLCanvasElement | null = null;
function getProps(): HTMLCanvasElement {
  if (propsLayer) return propsLayer;
  const c = newCanvas(W, H);
  const g = c.getContext('2d')!;
  // 廊台 + 灯室 + 顶（灯塔头部）
  g.fillStyle = '#2f4f9e'; g.fillRect(956, 178, 100, 16);
  g.fillStyle = '#f4d65a'; g.fillRect(980, 148, 52, 30);
  g.fillStyle = '#2f4f9e'; g.fillRect(974, 140, 64, 10);
  g.beginPath(); g.arc(1006, 140, 32, Math.PI, 0); g.fill();
  g.fillStyle = '#24408a'; g.fillRect(956, 194, 100, 6);
  // 渔舍门窗
  g.fillStyle = '#f6d84a'; g.fillRect(170, 468, 44, 54); g.fillRect(296, 468, 44, 54);
  g.fillStyle = '#c9a232'; g.fillRect(170, 468, 44, 8); g.fillRect(296, 468, 44, 8);
  g.fillStyle = '#2a2a58'; g.fillRect(236, 482, 42, 63);
  // 月亮 + 村灯 + 星（干净的点，亮核不被描边圈脏）
  g.fillStyle = '#f6d84a'; g.beginPath(); g.arc(215, 105, 40, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1d2c7c'; g.beginPath(); g.arc(201, 96, 33, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f2c94c';
  [[60, 447], [95, 444], [130, 448], [440, 446], [474, 443]].forEach(([x, y]) => g.fillRect(x, y, 7, 7));
  g.fillStyle = '#f6eeb0';
  STARS_SCENE.forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r * 0.55, 0, Math.PI * 2); g.fill(); });
  // 道具细笔触（cell7/len14，沿结构走向，只画不透明像素）
  g.save();
  g.globalCompositeOperation = 'source-atop';
  paintStrokes(g, c, {
    cell: 7, len: 14, width: 4.5, seed: 7, t: 0, boil: 0,
    outline: 0.5, outlineMix: 0.35, outlineCol: INK_DEEP, jitterCol: 34, alphaMask: true,
    angle: (x) => (x > 940 ? -Math.PI / 2 + 0.1 * Math.sin(x * 0.05) : 0.05),
  });
  g.restore();
  propsLayer = c;
  return c;
}

// ---- 沸腾缓存：底稿 + 三遍分区笔触 → 静态位图（键 = variant:boilSeed）----
let baseScene: HTMLCanvasElement | null = null;
let baseVortex: HTMLCanvasElement | null = null;
const cache = new StrokeCache(5);

export const getPainting = (variant: 'scene' | 'vortex', seedKey: number): HTMLCanvasElement => {
  const key = `${variant}:${seedKey}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (!baseScene) baseScene = buildBase('scene');
  if (!baseVortex) baseVortex = buildBase('vortex');
  const base = variant === 'scene' ? baseScene : baseVortex;
  const out = newCanvas(W, H);
  const g = out.getContext('2d')!;
  g.drawImage(base, 0, 0);
  const t = (seedKey + 0.5) / BOIL_FPS; // 方向场时间项冻结在沸腾窗中点
  if (variant === 'scene') {
    paintStrokes(g, base, {cell: 14, len: 64, width: 8, angle: angleScene, seed: 19, t, boil: 0,
      outline: 0.8, outlineMix: 0.38, outlineCol: INK_DEEP, palette: paletteScene, mask: isWall});
    paintStrokes(g, base, {cell: 12, len: 46, width: 8, angle: angleScene, seed: 29, t, boil: 0,
      outline: 0.85, outlineMix: 0.45, outlineCol: INK_DEEP, palette: paletteScene, mask: isFloor});
    paintStrokes(g, base, {cell: 10, len: 22, width: 6.5, angle: angleScene, seed: 9, t, boil: 0,
      outline: 0.9, outlineMix: 0.45, outlineCol: INK_DEEP, palette: paletteScene,
      mask: (x, y) => !isWall(x, y) && !isFloor(x, y)});
    g.drawImage(getProps(), 0, 0); // 道具层（灯室/门窗/月/星/村灯，细笔触不被大笔触打碎）
    envLines(g, t);
  } else {
    paintStrokes(g, base, {cell: 10, len: 22, width: 6.5, angle: skyAngle(VORTICES_V), seed: 9, t, boil: 0,
      outline: 0.9, outlineMix: 0.45, outlineCol: INK_DEEP, palette: paletteVortex});
  }
  cache.put(key, out);
  return out;
};

// ---- 环境线稿（深蓝 4.5px，8fps 沸腾）----
const rough = (g: CanvasRenderingContext2D, pts: number[][], seed: number, amp = 2.2) => {
  const r = (n: number) => {
    let a = (seed * 2654435761 + n * 40503) >>> 0;
    a = (a ^ 61) ^ (a >>> 16);
    a = a + (a << 3);
    a = a ^ (a >>> 4);
    a = Math.imul(a, 0x27d4eb2d);
    a = a ^ (a >>> 15);
    return ((a >>> 0) / 4294967296) as number;
  };
  g.beginPath();
  pts.forEach(([x, y], i) => {
    const px = x + (r(i * 2) - 0.5) * amp * 2;
    const py = y + (r(i * 2 + 1) - 0.5) * amp * 2;
    if (i) g.lineTo(px, py); else g.moveTo(px, py);
  });
  g.stroke();
};
function envLines(g: CanvasRenderingContext2D, t: number) {
  const sd = boilSeed(t, BOIL_FPS);
  g.save();
  g.strokeStyle = '#1c2458';
  g.lineWidth = 4.5;
  g.lineJoin = 'round';
  const S = (pts: number[][], k: number) => rough(g, pts, sd * 31 + k);
  g.lineWidth = 6;
  S([[966, 196], [982, 546]], 3);
  S([[1046, 196], [1030, 546]], 4);
  g.lineWidth = 4.5;
  S([[958, 176], [1054, 176], [1054, 196], [958, 196]], 1);
  S([[974, 136], [1038, 136]], 2);
  S([[130, 430], [380, 430], [380, 545], [130, 545], [130, 430]], 5);
  S([[105, 436], [255, 360], [405, 436]], 6);
  S([[170, 468], [214, 468], [214, 522], [170, 522], [170, 468]], 7);
  S([[296, 468], [340, 468], [340, 522], [296, 522], [296, 468]], 8);
  S([[0, HORIZON], [W, HORIZON]], 9);
  S([[604, 468], [470, 718]], 10);
  S([[676, 468], [800, 718]], 11);
  g.lineWidth = 3;
  for (let i = -3; i <= 3; i++) S([[VP[0] + i * 46, 500], [VP[0] + i * 150, 718]], 20 + i + 3);
  g.restore();
}

// ---- 漩涡带转速：分段线性速度的时间积分（连续相位，供亮度层 ribbon 旋转）----
const SPEED_TABLE: Array<[number, number]> = [
  [0, 1], [248 / 30, 1], [262 / 30, 3.0], [292 / 30, 1.6], [13.2, 1.6],
];
export const swirlPhase = (t: number): number => {
  let ph = 0;
  for (let i = 0; i < SPEED_TABLE.length - 1; i++) {
    const [t0, v0] = SPEED_TABLE[i];
    const [t1, v1] = SPEED_TABLE[i + 1];
    if (t <= t0) break;
    const dt = Math.min(t, t1) - t0;
    ph += ((v0 + (v0 + ((v1 - v0) * dt) / (t1 - t0))) / 2) * dt; // 梯形积分
    if (t <= t1) break;
  }
  return ph;
};

// ---- 亮度层：每帧矢量重画（时间项走 useCurrentFrame）----
export function drawGlow(
  g: CanvasRenderingContext2D, t: number, variant: 'scene' | 'vortex', phase: number,
): void {
  const vorts = variant === 'scene' ? VORTICES : VORTICES_V;
  const stars = variant === 'scene' ? STARS_SCENE : STARS_VORTEX;
  g.save();
  // 漩涡螺旋带（转速 = swirlPhase 积分相位；半透明=盖在已画进去的底稿螺旋上的「新笔」）
  g.lineCap = 'round';
  vorts.forEach(([x, y, r], k) => {
    for (let ring = 0; ring < 3; ring++) {
      g.strokeStyle = ring % 2 ? 'rgba(143,179,236,0.5)' : 'rgba(90,130,214,0.48)';
      g.lineWidth = 10 - ring * 2.5;
      g.beginPath();
      for (let a = 0; a < Math.PI * 3; a += 0.15) {
        const rr = r * (0.25 + a / (Math.PI * 3)) * (1 - ring * 0.12);
        const aa = a + phase * (0.9 + k * 0.2) * (k % 2 ? -1 : 1);
        const px = x + Math.cos(aa) * rr;
        const py = y + Math.sin(aa) * rr * 0.8;
        if (a) g.lineTo(px, py); else g.moveTo(px, py);
      }
      g.stroke();
    }
  });
  g.globalCompositeOperation = 'lighter';
  // 星星闪烁
  stars.forEach(([x, y, r], k) => {
    const tw = 0.75 + 0.35 * Math.sin(t * 5 + k * 1.7);
    g.fillStyle = 'rgba(251,238,160,0.5)';
    g.beginPath(); g.arc(x, y, r * 1.9 * tw, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f6d84a';
    g.beginPath(); g.arc(x, y, r * 0.75 * tw, 0, Math.PI * 2); g.fill();
  });
  if (variant === 'scene') {
    // 灯塔光束（慢扫，弱）
    const ba = Math.PI * 0.96 + 0.1 * Math.sin(t * 0.6);
    const bx = LAMP[0] + Math.cos(ba) * 780;
    const by = LAMP[1] + Math.sin(ba) * 780;
    const beam = g.createLinearGradient(LAMP[0], LAMP[1], bx, by);
    beam.addColorStop(0, 'rgba(255,246,192,0.20)');
    beam.addColorStop(1, 'rgba(255,246,192,0)');
    g.fillStyle = beam;
    g.beginPath();
    g.moveTo(LAMP[0], LAMP[1]);
    g.lineTo(LAMP[0] + Math.cos(ba - 0.05) * 800, LAMP[1] + Math.sin(ba - 0.05) * 800);
    g.lineTo(LAMP[0] + Math.cos(ba + 0.05) * 800, LAMP[1] + Math.sin(ba + 0.05) * 800);
    g.closePath(); g.fill();
    // 灯晕虚线环外扩（签名⑤）
    for (let k = 0; k < 3; k++) {
      const ph = (t * 0.9 + k / 3) % 1;
      const rr = 34 + ph * 84;
      g.strokeStyle = `rgba(255,236,140,${(0.28 * (1 - ph)).toFixed(3)})`;
      g.lineWidth = 16;
      g.setLineDash([22, 14]);
      g.lineDashOffset = -t * 60;
      g.beginPath(); g.arc(LAMP[0], LAMP[1], rr, 0, Math.PI * 2); g.stroke();
    }
    g.setLineDash([]);
    // 渔舍窗火光呼吸
    [[170, 468, 44, 54], [296, 468, 44, 54]].forEach(([x, y, w2, h2], k) => {
      const a = 0.16 + 0.08 * Math.sin(t * 3.1 + k * 2);
      const wg = g.createRadialGradient(x + w2 / 2, y + h2 / 2, 4, x + w2 / 2, y + h2 / 2, 64);
      wg.addColorStop(0, `rgba(255,220,120,${a.toFixed(3)})`);
      wg.addColorStop(1, 'rgba(255,220,120,0)');
      g.fillStyle = wg;
      g.fillRect(x - 40, y - 40, w2 + 80, h2 + 80);
    });
  }
  // 海面波光（scene）/ 漩涡流光（vortex）
  for (let i = 0; i < 6; i++) {
    const gx = ((i * 211 + t * 34) % (W + 80)) - 40;
    const gy = variant === 'scene' ? 462 + (i % 3) * 15 : 200 + ((i * 137) % 320);
    const ga = 0.22 + 0.14 * Math.sin(t * 2 + i * 1.3);
    g.strokeStyle = `rgba(143,179,238,${ga.toFixed(3)})`;
    g.lineWidth = 4;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(gx, gy);
    g.lineTo(gx + 38 + ((i * 97) % 26), gy + 2 * Math.sin(t + i));
    g.stroke();
  }
  g.restore();
}

export const FPS_N = 30;
export type WorldVariant = 'scene' | 'vortex';
