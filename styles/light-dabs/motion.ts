// ============================================================================
// motion.ts — 运动/光斑层（正片热帧每帧矢量重画的部分）
// 签名③（配方 08_impressionism）：光斑「双正弦截断」明灭 k=0.5+0.5·sin(t·sp+ph)·sin(t·sp·0.53+2ph)
//   → clamp 截断（亮灭节奏不规则）；**source-over α0.95——粉底上 screen 看不见（配方踩坑回流）**；
//   斑内每笔种子固定、只整体漂移＋明灭（活而不闪）。
// 签名⑤：笔触位置固定（烘焙态轮换只换方向场），「活」由局部运动承担——
//   光斑漂移明灭 / 罂粟摇 / 云走 / 猫尾甩 / 帘缘微光 / 茶壶热气 / 少女眨眼。
// 全确定性：种子固定 + 解析时间函数，禁 Math.random/Date。
// ============================================================================
import {mulberry32} from './strokes';
import {CAT, drawGirlFeatures} from './actors';
import {CAT_BOX, WX0} from './world';

const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const inv = (a: number, b: number, x: number) => clamp((x - a) / (b - a));
export const outC = (u: number) => 1 - Math.pow(1 - clamp(u), 3);
const hash = (i: number, j: number): number => {
  let a = (Math.floor(i) * 374761393 + Math.floor(j) * 668265263) >>> 0;
  a = (a ^ 61) ^ (a >>> 16);
  a = (a + (a << 3)) | 0;
  a = a ^ (a >>> 4);
  a = Math.imul(a, 0x27d4eb2d);
  a = a ^ (a >>> 15);
  return (a >>> 0) / 4294967296;
};
const inRect = (x: number, y: number, r: {x0: number; y0: number; x1: number; y1: number}) =>
  x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1;
const GIRL_LOW = {x0: 133, y0: 538, x1: 283, y1: 578};   // 少女裙摆落区（光斑避让）

// ---- hero 包络（f237 峰值 = 64.2%，60-75% 窗口内；光斑群齐明 + 花园全摇）----
export const HERO_RISE = 180, HERO_PEAK = 237, HERO_FALL = 285;
export const heroEnvelope = (f: number): number => {
  if (f < HERO_RISE || f > HERO_FALL) return 0;
  if (f <= HERO_PEAK) return outC(inv(HERO_RISE, HERO_PEAK, f));
  return 1 - outC(inv(HERO_PEAK, HERO_FALL, f));
};

// ---- 光斑：34 斑（7 桌面 + 27 地面），强度相位各异、缓慢横漂 ----
interface Spot { x: number; y: number; rx: number; ry: number; ph: number; sp: number; seed: number; table: boolean }
const SPOTS: Spot[] = (() => {
  const r = mulberry32(5);
  const o: Spot[] = [];
  for (let i = 0; i < 24; i++) {
    const table = i < 7;
    o.push({
      x: table ? 587 + r() * 186 : 253 + r() * 900,
      y: table ? 424 + r() * 7 : 553 + r() * 147,
      rx: table ? 33 + r() * 50 : 40 + r() * 62,
      ry: table ? 4.7 : 7 + r() * 10,
      ph: r() * 7, sp: 1.8 + r() * 1.4, seed: i, table,
    });
  }
  return o;
})();

/** 光斑层：source-over α0.95·a；斑内 40 笔亮黄白短笔，种子固定只漂移＋明灭（配方 08） */
export function drawLightPatches(g: CanvasRenderingContext2D, t: number, e: number): void {
  g.save();
  g.lineCap = 'round';
  for (let si = 0; si < SPOTS.length; si++) {
    const s = SPOTS[si];
    const k = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph) * Math.sin(t * s.sp * 0.53 + s.ph * 2);
    let a = clamp(k * 1.3 - 0.15);
    a = clamp(a * (1 + 0.35 * e));
    if (s.seed === 0) a = Math.max(a, outC(inv(2, 7, t * 30 + 1)) * (1 - inv(14, 30, t * 30 + 1))); // 钩子：第一片光斑 f2 亮起
    if (a <= 0.05) continue;
    const r = mulberry32(s.seed * 31);
    const dx = Math.sin(t * 2.6 + s.ph) * 18 * (1 + 1.2 * e);
    const dy = Math.cos(t * 2.0 + s.ph) * 3.3 * (1 + 0.8 * e);
    for (let i = 0; i < 26; i++) {
      const u = r() * 2 - 1, v = r() * 2 - 1;
      if (u * u + v * v > 1) continue;
      const x = s.x + dx + u * s.rx, y = s.y + dy + v * s.ry;
      if (inRect(x, y, CAT_BOX) || inRect(x, y, GIRL_LOW)) continue;   // 不压角色
      const L = 9.3 + r() * 10.7;
      g.strokeStyle = `rgba(255,${(244 + r() * 11) | 0},${(180 + r() * 50) | 0},${(0.95 * a).toFixed(3)})`;
      g.lineWidth = 5.3 + r() * 3.3;
      g.beginPath(); g.moveTo(x - L / 2, y + r() * 1.3); g.lineTo(x + L / 2, y - r() * 2); g.stroke();
    }
  }
  g.restore();
}

// ---- 斜射光中的墙面亮点（阳光墙区，source-over——粉底上 screen 看不见）----
function wallGlints(g: CanvasRenderingContext2D, t: number, e: number): void {
  g.save();
  g.lineCap = 'round';
  const n = 40 + Math.round(44 * e);
  for (let i = 0; i < n; i++) {
    const x = 700 + hash(i, 3) * 533, y = 13 + hash(i, 5) * 300;
    const a = Math.max(0, Math.sin(t * 3 + i * 1.7));
    if (a < 0.45) continue;
    g.strokeStyle = `rgba(255,248,200,${(0.5 * a * (1 + 0.5 * e)).toFixed(3)})`;
    g.lineWidth = 4;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 9, y - 12); g.stroke();
  }
  g.restore();
}

// ---- 云走（窗外天空，横向循环 30px/s，hero ×2.5）----
function clouds(g: CanvasRenderingContext2D, t: number, e: number): void {
  g.save();
  g.fillStyle = 'rgba(246,246,255,0.92)';
  const speed = 30 * (1 + 1.5 * e);
  for (let i = 0; i < 4; i++) {
    const [y, rx, ph] = [[130, 33, 0], [118, 27, 180], [142, 40, 350], [108, 22, 500]][i];
    const x = WX0 - 50 + ((t * speed + ph) % 590);
    g.beginPath(); g.ellipse(x, y, rx, rx * 0.35, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(x + rx * 0.55, y - rx * 0.16, rx * 0.6, rx * 0.26, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(x - rx * 0.6, y + rx * 0.1, rx * 0.45, rx * 0.2, 0, 0, 7); g.fill();
  }
  g.restore();
}

// ---- 罂粟摇（茎底不动、花头横摆；hero 摆幅 ×2）----
interface Poppy { x: number; y: number; r: number; ph: number }
const POPPIES: Poppy[] = (() => {
  const r = mulberry32(8);
  const o: Poppy[] = [];
  for (let i = 0; i < 44; i++) {
    const x = 253 + r() * 210 + (r() < 0.25 ? r() * 60 : 0);
    const y = 285 + r() * 70;
    o.push({x, y, r: 3.3 + r() * 4 + (y - 285) * 0.033, ph: r() * 7});
  }
  return o;
})();
function poppies(g: CanvasRenderingContext2D, t: number, e: number): void {
  g.save();
  for (const p of POPPIES) {
    const sw = Math.sin(t * 2.9 + p.ph + p.x * 0.03) * (6.7 + p.r * 0.53) * (1 + e);
    const hx = p.x + sw, hy = p.y - p.r * 0.6;
    g.strokeStyle = '#3e7a30'; g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(p.x, p.y + p.r * 0.93); g.quadraticCurveTo(p.x + sw * 0.3, p.y, hx, hy); g.stroke();
    g.fillStyle = '#e8281e';
    g.beginPath(); g.ellipse(hx, hy, p.r, p.r * 0.75, sw * 0.03, 0, 7); g.fill();
  }
  g.restore();
}

// ---- 帘缘微光（窗帘静置，摆动感由内缘微光摇曳承担）＋盆栽顶花摆动＋茶壶热气 ----
function softLife(g: CanvasRenderingContext2D, t: number): void {
  g.save();
  // 帘缘微光
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : 0;
    const x = side ? 543 : 236;
    const y = 120 + hash(i, 9) * 250;
    const a = 0.1 + 0.08 * Math.sin(t * 2.2 + i * 2.1);
    g.strokeStyle = `rgba(255,250,230,${a.toFixed(3)})`; g.lineWidth = 3.3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x + Math.sin(t * 1.8 + i) * 3, y); g.lineTo(x + Math.sin(t * 1.8 + i) * 3, y + 16); g.stroke();
  }
  // 盆栽顶花摆动（放射场摇曳的可视端点）
  const sw = Math.sin(t * 1.9) * 4;
  for (let i = 0; i < 5; i++) {
    const x = 1090 + i * 26 + sw * (1 + i * 0.15), y = 214 + Math.sin(t * 1.9 + i) * 3;
    g.fillStyle = i % 2 ? '#f070a8' : '#ffd0e4';
    g.beginPath(); g.arc(x, y, 5.3, 0, 7); g.fill();
  }
  // 茶壶热气（S 形两缕，白）
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3.3; g.lineCap = 'round';
  for (let s = 0; s < 2; s++) {
    g.beginPath();
    for (let q = 0; q <= 12; q++) {
      const u = q / 12;
      const x = 661 + s * 7 + Math.sin(u * 6 + t * 3 + s * 2) * 6 * u;
      const y = 378 - u * 40;
      if (q) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.stroke();
  }
  g.restore();
}

// ---- 猫：尾巴（每帧贝塞尔甩动）＋胡须＋受光侧毛尖闪光（screen——橘底上可见）----
function catMotion(g: CanvasRenderingContext2D, t: number, e: number): void {
  const [rx0, ry0] = CAT.tailRoot;
  const sw = Math.sin(t * 2.2) * 7 * (1 + 0.6 * e);
  g.save();
  g.strokeStyle = 'rgb(240,154,64)'; g.lineCap = 'round';
  g.lineWidth = 8;
  g.beginPath(); g.moveTo(rx0, ry0); g.quadraticCurveTo(rx0 - 22, ry0 - 4 + sw * 0.5, rx0 - 38, ry0 - 10 + sw); g.stroke();
  g.lineWidth = 5.3;
  g.beginPath(); g.moveTo(rx0 - 38, ry0 - 10 + sw); g.quadraticCurveTo(rx0 - 50, ry0 - 14 + sw * 1.2, rx0 - 62, ry0 - 20 + sw * 1.4); g.stroke();
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(rx0 - 62, ry0 - 20 + sw * 1.4); g.lineTo(rx0 - 72, ry0 - 24 + sw * 1.5); g.stroke();
  g.fillStyle = 'rgb(252,244,232)';
  g.beginPath(); g.arc(rx0 - 72, ry0 - 24 + sw * 1.5, 2.6, 0, 7); g.fill();
  // 胡须
  g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 0.9;
  for (const [[ax, ay], [bx, by]] of CAT.whiskers) { g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); }
  // 毛尖闪光（受光左半边；screen 在橘底上可见）
  g.globalCompositeOperation = 'screen';
  g.lineCap = 'round';
  for (let i = 0; i < 40; i++) {
    const x = CAT_BOX.x0 + 8 + hash(i, 3) * 110, y = CAT_BOX.y0 + 4 + hash(i, 5) * 62;
    const a = Math.max(0, Math.sin(t * 7 + hash(i, 77) * 30));
    if (a < 0.35 || x > 470 + (y - 612) * 0.06) continue;   // 只亮受光左半
    g.strokeStyle = `rgba(255,250,210,${(0.9 * a).toFixed(3)})`; g.lineWidth = 2.3;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4, y + 6); g.stroke();
  }
  g.restore();
}

// ---- 全画运动层调度（热帧每帧调用；t 秒，f 绝对帧 1 起）----
export function drawMotion(g: CanvasRenderingContext2D, t: number, f: number): void {
  const e = heroEnvelope(f);
  clouds(g, t, e);
  poppies(g, t, e);
  drawLightPatches(g, t, e);
  wallGlints(g, t, e);
  softLife(g, t);
  catMotion(g, t, e);
  drawGirlFeatures(g, t);       // 五官线（眨眼）——签名④「不勾轮廓只补五官」
}
