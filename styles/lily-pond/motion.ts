// ============================================================================
// motion.ts — 运动/母题层（正片热帧每帧矢量重画的部分）
// 签名④（配方 28_monet）：睡莲漂（x+sin(1.3t+φ)·7+5t）+ 柳影波动（sin(0.03y−3.2t+k)·14）
//   + 涟漪虚线椭圆外扩（ry=rx·0.22，外扩并淡出）+ 紫藤 12 串点列摆（粗线=药丸坑，必须点列）
// 签名①'：160 根水面光斑颤动——亮度 clamp(sin(t·(5..11)+φ)·sin(2.3t+i)) 截断，10fps 横向跳 ±5px，
//   source-over（浅水底上 screen 物理不可见，08 配方踩坑回流）。
// hero 包络：f207→峰值 f236（62.1%，60-75% 窗口）→f272：光斑群齐明+涟漪荡开+全园摆动加强。
// 全确定性：mulberry32/hash2 + 解析时间函数，禁 Math.random/Date。
// ============================================================================
import {mulberry32} from './strokes';
import {DAB_COLORS, WISTERIA_COLORS, deckY, hash2, isBank, isCanopy} from './world';

const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const inv = (a: number, b: number, x: number) => clamp((x - a) / (b - a));
export const outC = (u: number) => 1 - Math.pow(1 - clamp(u), 3);

// ---- hero 包络（峰值 f236 = 62.1%；RISE→PEAK→FALL）----
export const HERO_RISE = 207, HERO_PEAK = 236, HERO_FALL = 272;
export const heroEnvelope = (f: number): number => {
  if (f < HERO_RISE || f > HERO_FALL) return 0;
  if (f <= HERO_PEAK) return outC(inv(HERO_RISE, HERO_PEAK, f));
  return 1 - outC(inv(HERO_PEAK, HERO_FALL, f));
};

// ---- 睡莲：10 丛、约 100 片缺口椭圆（40% 带粉/白花），整丛随时间漂 ----
interface Pad { x: number; y: number; rx: number; ry: number; notch: number; flower: boolean; ph: number; k: number }
export const PADS: Pad[] = (() => {
  const r = mulberry32(4242);
  const clusters: Array<[number, number, number]> = [
    [150, 470, 9], [420, 560, 8], [700, 610, 7], [980, 540, 8], [1180, 470, 6],
    [240, 380, 6], [640, 420, 7], [1080, 620, 6], [860, 380, 5], [60, 560, 5],
  ];
  const o: Pad[] = [];
  clusters.forEach(([cx, cy, n], k) => {
    for (let i = 0; i < n + 3; i++) {
      o.push({
        x: cx + (r() - 0.5) * 200, y: cy + (r() - 0.5) * 62,
        rx: 30 + r() * 32, ry: 10 + r() * 7, notch: r() * Math.PI * 2,
        flower: r() < 0.4, ph: r() * Math.PI * 2, k,
      });
    }
  });
  return o;
})();

/** 睡莲漂 + 缺口椭圆 + 花 + 叶面高光（配方 pad() 1:1 参数比例，漂速 5px/s） */
function drawPads(g: CanvasRenderingContext2D, t: number, e: number): void {
  const drift = 5 * (1 + 0.8 * e);
  for (const p of PADS) {
    const x = p.x + Math.sin(t * 1.3 + p.ph) * 7 + t * drift;
    const y = p.y + Math.sin(t * 1.9 + p.ph * 1.3) * 2.5;
    if (x < -80 || x > 1360) continue;
    g.fillStyle = p.k % 2 ? '#5f8f4a' : '#7aa85a';
    g.beginPath(); g.ellipse(x, y, p.rx, p.ry, 0, p.notch + 0.35, p.notch + Math.PI * 2 - 0.35); g.lineTo(x, y); g.closePath(); g.fill();
    // 叶面高光两笔（受光上缘，笔触质感补偿——睡莲是每帧矢量层）
    g.strokeStyle = 'rgba(156,192,112,0.6)'; g.lineWidth = 2.4; g.lineCap = 'round';
    g.beginPath(); g.ellipse(x, y, p.rx * 0.72, p.ry * 0.6, 0, Math.PI * 1.08, Math.PI * 1.6); g.stroke();
    if (p.flower) {
      g.fillStyle = p.k % 3 ? '#f2a6bf' : '#fbf4f0';
      g.beginPath(); g.ellipse(x + 6, y - 7, 15, 9, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = p.k % 3 ? '#fff2f2' : '#f6d86a';
      g.beginPath(); g.ellipse(x + 6, y - 11, 7, 5, 0, 0, Math.PI * 2); g.fill();
    }
  }
}

// ---- 柳影波动：5 条竖带（配方 5 条 1:1 布局缩放），边缘 sin 横向波动 ----
const WILLOWS: Array<[number, number]> = [[62, 0.9], [118, 0.7], [1005, 0.8], [1072, 1.0], [1190, 0.7]];
function drawWillows(g: CanvasRenderingContext2D, t: number, e: number): void {
  WILLOWS.forEach(([x0, a], k) => {
    const amp = 14 * (1 + 0.5 * e);
    g.fillStyle = k % 2 ? '#3f6a58' : '#4f5f8f';
    g.globalAlpha = 0.62;
    g.beginPath();
    for (let y = 152; y <= 545; y += 20) g.lineTo(x0 + Math.sin(y * 0.03 - t * 3.2 + k) * amp, y);
    for (let y = 545; y >= 152; y -= 20) g.lineTo(x0 + 46 * a + Math.sin(y * 0.03 - t * 3.2 + k + 0.6) * amp, y);
    g.closePath(); g.fill();
    // 带内柳色横笔数根（带出笔触质感）
    g.strokeStyle = k % 2 ? 'rgba(85,122,74,0.5)' : 'rgba(106,95,154,0.45)';
    g.lineWidth = 3.4; g.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const y = 168 + ((i * 47) % 360);
      const dx = Math.sin(y * 0.03 - t * 3.2 + k) * amp;
      g.beginPath(); g.moveTo(x0 + dx + 5, y); g.lineTo(x0 + dx + 22 + (i % 3) * 6, y + (i % 2) * 2 - 1); g.stroke();
    }
  });
  g.globalAlpha = 1;
}

// ---- 天光倒影：4 片浅粉黄云影（开阔水面），缓慢横漂（配方 4 片 1:1 色值）----
const SKY_REFL: Array<[number, number, number, number, number]> = [
  [172, 425, 140, 24, 0], [1108, 442, 140, 24, 1], [352, 502, 120, 22, 0], [942, 520, 130, 24, 1],
];
function drawSkyRefl(g: CanvasRenderingContext2D, t: number): void {
  for (const [x, y, rx, ry, k] of SKY_REFL) {
    g.fillStyle = k ? '#e8d6e8' : '#f2e2c4';
    g.globalAlpha = 0.5;
    g.beginPath(); g.ellipse(x + Math.sin(t * 0.8 + k * 2) * 10, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
}

// ---- 桥的倒影（绿色弧，波动）——配方窗内倒影 1:1 参数比例放到开阔水面 ----
function drawBridgeRefl(g: CanvasRenderingContext2D, t: number): void {
  g.strokeStyle = '#4f8a6a'; g.globalAlpha = 0.5; g.lineWidth = 7; g.lineCap = 'round';
  g.beginPath();
  for (let x = 200; x <= 1080; x += 8) {
    const q = (x - 640) / 470;
    const y = 392 + 52 * (1 - q * q) + Math.sin(x * 0.08 + t * 6) * 3;
    x === 200 ? g.moveTo(x, y) : g.lineTo(x, y);
  }
  g.stroke();
  g.globalAlpha = 1;
}

// ---- 紫藤 12 串点列摆（粗线=药丸坑，必须点列——配方踩坑回流）----
function drawWisteria(g: CanvasRenderingContext2D, t: number, e: number): void {
  for (let i = 0; i < 12; i++) {
    const x = 170 + i * 85.5, sw = Math.sin(t * 2.4 + i * 0.9) * 8 * (1 + 0.5 * e), L = 44 + ((i * 37) % 50);
    for (let j = 0; j < 9; j++) {
      const q = j / 8;
      const px = x + sw * q * q + Math.sin(j * 2.1 + i) * 4, py = 152 + L * q * 1.2;
      g.fillStyle = WISTERIA_COLORS[(i + j) % 4];
      g.beginPath(); g.ellipse(px, py, 8 * (1 - q * 0.6), 6 * (1 - q * 0.5), 0.3, 0, Math.PI * 2); g.fill();
    }
  }
}

// ---- 水面光斑颤动：160 根亮色横短笔（签名①'，10fps 换位 + 双正弦截断明灭）----
interface Dab { x: number; y: number; ln: number; w: number; sp: number; ph: number }
const DABS: Dab[] = (() => {
  const r = mulberry32(7007);
  const o: Dab[] = [];
  let guard = 0;
  while (o.length < 160 && guard++ < 2000) {
    const x = r() * 1280, y = 20 + r() * 670;
    if (isCanopy(x, y) && r() < 0.6) continue;   // 叶幕里少放（树荫密处光斑稀）
    if (isBank(x, y)) continue;                  // 岸上无光斑
    o.push({x, y, ln: 14 + r() * 26, w: 4 + r() * 3, sp: 5 + r() * 6, ph: r() * Math.PI * 2});
  }
  return o;
})();
function drawLightDabs(g: CanvasRenderingContext2D, t: number, e: number): void {
  const st = Math.floor(t * 10);
  g.save(); g.lineCap = 'round';
  for (let i = 0; i < DABS.length; i++) {
    const d = DABS[i];
    const a = clamp(Math.sin(t * d.sp + d.ph) * Math.sin(t * 2.3 + i), 0, 1);
    if (a < 0.15) continue;
    const jx = (hash2(i, st) - 0.5) * 6;
    g.strokeStyle = DAB_COLORS[i % 4];
    g.globalAlpha = 0.8 * a * (1 + 0.35 * e);
    g.lineWidth = d.w;
    g.beginPath(); g.moveTo(d.x + jx, d.y); g.lineTo(d.x + jx + d.ln, d.y + (hash2(i, 3) - 0.5) * 3); g.stroke();
  }
  g.restore();
}

// ---- 涟漪：3 处同心虚线椭圆外扩（hero 加 2 处、环径加强——「涟漪荡开」）----
const RIPPLES: Array<[number, number]> = [[300, 600], [1030, 548], [625, 432]];
const RIPPLES_HERO: Array<[number, number]> = [[820, 645], [430, 395]];
function drawRipples(g: CanvasRenderingContext2D, t: number, e: number): void {
  g.save(); g.strokeStyle = '#eef4ff'; g.lineWidth = 2.7; g.setLineDash([12, 10]);
  RIPPLES.forEach(([x, y], k) => {
    for (let j = 0; j < 3; j++) {
      const q = (t * 0.9 + j / 3 + k * 0.3) % 1;
      const rx = 20 + q * (82 + 40 * e);
      g.globalAlpha = 0.48 * (1 - q);
      g.beginPath(); g.ellipse(x, y, rx, rx * 0.22, 0, 0, Math.PI * 2); g.stroke();
    }
  });
  if (e > 0.02) {
    RIPPLES_HERO.forEach(([x, y], k) => {
      for (let j = 0; j < 3; j++) {
        const q = (t * 0.9 + j / 3 + k * 0.5 + 0.17) % 1;
        const rx = 20 + q * (110 * e + 30);
        g.globalAlpha = 0.55 * (1 - q) * e;
        g.beginPath(); g.ellipse(x, y, rx, rx * 0.22, 0, 0, Math.PI * 2); g.stroke();
      }
    });
  }
  g.setLineDash([]); g.globalAlpha = 1; g.restore();
}

// ---- hero 桥面呼吸亮线（指向「光斑颤动群」的主体高光，hero 期呼吸）----
function drawBridgeGlow(g: CanvasRenderingContext2D, t: number, e: number): void {
  if (e <= 0.02) return;
  const pulse = 0.5 + 0.5 * Math.sin(t * 4.2);
  g.save(); g.lineCap = 'round';
  g.strokeStyle = `rgba(200,240,214,${(0.3 * e * (0.4 + 0.6 * pulse)).toFixed(3)})`;
  g.lineWidth = 4;
  g.beginPath();
  for (let x = 140; x <= 1140; x += 10) { const y = deckY(x) - 3; x === 140 ? g.moveTo(x, y) : g.lineTo(x, y); }
  g.stroke();
  g.restore();
}

// ---- 全画运动层调度（热帧每帧调用；t 秒，f 绝对帧 1 起）----
export function drawMotion(g: CanvasRenderingContext2D, t: number, f: number): void {
  const e = heroEnvelope(f);
  drawSkyRefl(g, t);
  drawWillows(g, t, e);
  drawBridgeRefl(g, t);
  drawPads(g, t, e);
  drawWisteria(g, t, e);
  drawLightDabs(g, t, e);
  drawRipples(g, t, e);
  drawBridgeGlow(g, t, e);
}
