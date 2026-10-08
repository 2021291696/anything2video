// ============================================================================
// world.ts — 《一页手抄本的诞生》（哥特泥金手抄本 gold-leaf，战役4 批次④ D2-1）
// 技法借鉴 huashu-art-motion 05_gothic（MIT, references/风格配方/05_gothic.md + scripts/engine/scenes/05_gothic.js），Remotion/TSX 重写。
// 签名纪律（卡 brief 七条）：
//  ①逐像素金箔 f=0.52+fbm(x·.0035)·0.42+noise(x·.004,y·.09)·0.5+受光+颗粒，三色插值
//    #9c6a1a/#d9a63a/#f8de86——打磨纹 y 频率是 x 的 22.5 倍才有横向金属拉丝。
//    预烘焙成静态纹理 PNG（RECON 建议），热帧零逐像素计算。
//  ②菱格压花：两族斜线各画两遍（暗线 + 错开 1.2px 亮线）＝刻进金里；菱心四点压印（左上亮右下暗）。
//  ③每 118×125px 一条极淡接缝＝一片片贴的金箔（brief 锁死数字）。
//  ④「金色度」遮罩高光扫：对烘焙静态层逐像素算 clamp((r-b-70)/50)·clamp((g-b-30)/40)·clamp((r-140)/40)
//    当 alpha（不用重画金色形状，凡金色自动被扫到）；920px scratch 渐变带斜率 0.45 →
//    destination-in 乘掩膜 → lighter α0.62 叠回；**必须匀速**（inOut 会提前扫出金区）；
//    经过判定 |u−sweepX|<70 出四角星。猫为动态层不进掩膜（源片同序：猫画在高光之后，橘色不被误当金）。
//  ⑤页边怪谈母题 ≥2：藤蔓常春藤摇 + 蜗牛 62px/s + 老鼠 360px/1.05s 腿 40rad/s + 小骑士。
//  ⑥羊皮纸翻页转场（kit.tsx PageTurn）。
//  ⑦人脸猫 + 拉丁文朱批（句首 Cattus/Nemo/Mus 朱红，UnifrakturMaguntia blackletter）。
// 短板修正（INDEX「金发像兜帽」）：少女金发轮廓重画——4 个波浪瓣的手绘闭合轮廓 + 4 条 S 形发绺，
//   不套默认头形；验收点 = 金发 SPARK 点 (952,405)，高光带 f248 经过时星闪。
// 锁死 token：金三阶 #9c6a1a/#d9a63a/#f8de86 + 羊皮 rgb(236,223,194) + 朱红 #c3262e + 蓝袍 #24449e。
// 逐帧确定性：mulberry32/hash + sin 解析相位，禁 Math.random/Date/网络。
// 布局：源片 1920×1080 全构图按 2/3 映射到 1280×720（X=x·2/3, Y=y·2/3）。
// ============================================================================
export const W = 1280;
export const H = 720;
export const FPS = 30;

export const INK = '#2b1a12';
export const GOLD_LO = '#9c6a1a';
export const GOLD = '#d9a63a';
export const GOLD_HI = '#f8de86';
export const PARCH = '#ecdfc0'; // rgb(236,223,194) 锁死
export const PARCH_DK = '#c9ae80';
export const RUBRIC = '#c3262e'; // 朱红朱批
export const RED = '#c3262e';
export const RED_DK = '#7e1318';
export const BLUE = '#24449e'; // 蓝袍锁死
export const BLUE_DK = '#142a6a';
export const PINK = '#e7a3aa';
export const GREEN = '#55a03c';
export const GREEN_DK = '#2f6e26';
export const WHITE = '#f8f2e2';
export const WOOD = '#8a5a2c';
export const SKIN = '#f5dcc2';
export const HAIR = '#e9b746';
export const HAIR_DK = '#9a6618';

// ---- 确定性随机（mulberry32；状态在闭包外层由调用方持有，防退化）----
export const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
export const hash2 = (a: number, b: number) => {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x165667b1, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x27d4eb2f);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerpN = (a: number, b: number, u: number) => a + (b - a) * u;
export const inv = (from: number, to: number, f: number) => clamp01((f - from) / (to - from));
export const outC = (u: number) => 1 - Math.pow(1 - u, 3);

// ---- 值噪声 + fbm（金箔底纹用；确定性）----
const perm = (() => {
  const r = mulberry32(20261096);
  const p = new Uint8Array(512);
  const base = Array.from({length: 256}, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  for (let i = 0; i < 512; i++) p[i] = base[i & 255];
  return p;
})();
const fade = (t: number) => t * t * (3 - 2 * t);
export const noise2 = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const g = (ix: number, iy: number) => {
    const h = perm[(perm[(ix & 255)] + (iy & 255)) & 511] / 255;
    return h * 2 - 1;
  };
  const u = fade(xf), v = fade(yf);
  return lerpN(lerpN(g(xi, yi), g(xi + 1, yi), u), lerpN(g(xi, yi + 1), g(xi + 1, yi + 1), u), v);
};
export const fbm = (x: number, y: number, oct: number) => {
  let s = 0, amp = 0.5, fr = 1;
  for (let i = 0; i < oct; i++) {
    s += noise2(x * fr, y * fr) * amp;
    amp *= 0.5;
    fr *= 2;
  }
  return s;
};
const hexRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16),
];
const mixRgb = (a: [number, number, number], b: [number, number, number], u: number): [number, number, number] => [
  Math.round(lerpN(a[0], b[0], u)), Math.round(lerpN(a[1], b[1], u)), Math.round(lerpN(a[2], b[2], u)),
];

// ---- 几何（源片坐标 ×2/3）----
export const PANEL_PTS: Array<[number, number]> = [
  [219, 170], [219, 137], [387, 44], [553, 137], [657, 64], [757, 137], [857, 64], [960, 137], [960, 597], [219, 597],
];
export const archPath = (g: CanvasRenderingContext2D, xl: number, xr: number, ys: number, yb: number, r: number) => {
  const mid = (xl + xr) / 2;
  const h = Math.sqrt(r * r - (r - (xr - xl) / 2) ** 2);
  const a1 = Math.atan2(-h, mid - (xl + r)), a2 = Math.atan2(-h, mid - (xr - r));
  g.moveTo(xl, yb);
  g.lineTo(xl, ys);
  g.arc(xl + r, ys, r, Math.PI, a1 + Math.PI * 2);
  g.arc(xr - r, ys, r, a2, 0);
  g.lineTo(xr, yb);
  g.closePath();
};
export const WIN = {xl: 241, xr: 532, ys: 240, yb: 360, r: 160};
export const LANCETS = [
  {xl: 261, xr: 377, ys: 276, yb: 355, r: 87},
  {xl: 397, xr: 512, ys: 276, yb: 355, r: 87},
];
export const ROSE: [number, number] = [387, 200]; // 四叶玫瑰窗心（源 580,222 → 387,148 与柳叶窗重叠，微调至 200 让位柳叶窗尖）
export const GIRL = {headC: [897, 322] as [number, number], haloC: [897, 318] as [number, number], haloR: 74}; // 女性角色锚点（正面像）
export const CAT_PAW: [number, number] = [428, 540]; // 猫抬爪拎老鼠的悬挂点
export const HAIR_SPARK: [number, number] = [952, 405]; // 短板修正验收点：金发浪瓣
// 高光经过判定点（源 11 点 ×2/3 + 金发/光环/圣杯三点点题）
export const SPARKS: Array<[number, number]> = [
  [301, 427], [507, 220], [620, 313], [727, 200], [833, 347], [467, 520], [673, 547],
  [920, 220], [373, 77], [867, 100], [1045, 240], HAIR_SPARK, [GIRL.haloC[0], GIRL.haloC[1] - 40], [897, 436],
];

// ---- 高光扫（签名④核心数学；匀速是纪律）----
export const K_SLANT = 0.45;
export const SWEEP_FROM = 208;
export const SWEEP_TO = 268;
export const sweepXAt = (f: number) => lerpN(-366, 1644, clamp01((f - SWEEP_FROM) / (SWEEP_TO - SWEEP_FROM)));
export const nearSweep = (x: number, y: number, f: number) => {
  const u = x + K_SLANT * (y - 360);
  return clamp01(1 - Math.abs(u - sweepXAt(f)) / 70);
};

// ---- 金箔纹理（逐像素，签名①；仅烘焙期执行一次）----
export function paintGoldTexture(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, seed: number) {
  const w = x1 - x0, h = y1 - y0;
  const img = g.createImageData(w, h);
  const d = img.data;
  const lo = hexRgb(GOLD_LO), mid = hexRgb(GOLD), hi = hexRgb(GOLD_HI);
  const r = mulberry32(seed);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const big = fbm(x * 0.0035, y * 0.0035 + 7, 3);
      // 打磨纹：y 频率 0.09 / x 频率 0.004 ≈ 22.5 倍 → 横向金属拉丝
      const brush = noise2(x * 0.004, y * 0.09) * 0.5 + noise2(x * 0.012, y * 0.25) * 0.3;
      const light = 0.18 - (x / w) * 0.12 - (y / h) * 0.16;
      let f = 0.52 + big * 0.42 + brush * 0.22 + light + (r() - 0.5) * 0.1;
      f = clamp01(f);
      const c = f < 0.5 ? mixRgb(lo, mid, f * 2) : mixRgb(mid, hi, (f - 0.5) * 2);
      const i = (y * w + x) * 4;
      d[i] = c[0];
      d[i + 1] = c[1];
      d[i + 2] = c[2];
      d[i + 3] = 255;
    }
  }
  g.putImageData(img, x0, y0);
}

// ---- 羊皮纸 + 做旧（烘焙静态层第一步）----
export function paintParchment(g: CanvasRenderingContext2D) {
  g.fillStyle = PARCH;
  g.fillRect(0, 0, W, H);
  const r = mulberry32(3);
  g.strokeStyle = 'rgba(180,150,100,0.35)';
  g.lineWidth = 1;
  for (let i = 0; i < 1300; i++) {
    const x = r() * W, y = r() * H, l = 2 + r() * 7;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (r() - 0.5) * l, y + (r() - 0.5) * l);
    g.stroke();
  }
  for (let i = 0; i < 26; i++) {
    const x = r() * W, y = r() * H, rad = 6 + r() * 26;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, 'rgba(160,125,70,0.14)');
    gr.addColorStop(1, 'rgba(160,125,70,0)');
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const v = g.createRadialGradient(W / 2, H / 2, 253, W / 2, H / 2, 767);
  v.addColorStop(0, 'rgba(120,80,30,0)');
  v.addColorStop(1, 'rgba(110,70,25,0.5)');
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
}

export const F = (g: CanvasRenderingContext2D, fill: string | CanvasGradient | null, stroke: string | null, lw: number, path: () => void) => {
  g.beginPath();
  path();
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = lw;
    g.stroke();
  }
};
export const dot = (g: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, line?: string, lw?: number) => {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (line) {
    g.strokeStyle = line;
    g.lineWidth = lw ?? 1.5;
    g.stroke();
  }
};
export const smooth = (g: CanvasRenderingContext2D, pts: Array<[number, number]>, close = true) => {
  g.moveTo((pts[0][0] + pts[pts.length - 1][0]) / 2, (pts[0][1] + pts[pts.length - 1][1]) / 2);
  for (let i = 0; i < pts.length - (close ? 0 : 1); i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  if (close) g.closePath();
};


export function paintGoldMask(g: CanvasRenderingContext2D, staticCanvas: HTMLCanvasElement) {
  const s = staticCanvas.getContext('2d')!.getImageData(0, 0, W, H).data;
  const img = g.createImageData(W, H);
  const d = img.data;
  for (let i = 0; i < W * H * 4; i += 4) {
    const r = s[i], gg = s[i + 1], b = s[i + 2];
    const k = clamp01((r - b - 70) / 50) * clamp01((gg - b - 30) / 40) * clamp01((r - 140) / 40);
    d[i] = 255;
    d[i + 1] = 255;
    d[i + 2] = 255;
    d[i + 3] = k * 255;
  }
  g.putImageData(img, 0, 0);
}

// ---- 做旧颗粒（确定性 speckle；烘焙成 PNG 叠加）----
export function paintGrain(g: CanvasRenderingContext2D) {
  const r = mulberry32(7);
  for (let i = 0; i < 24000; i++) {
    const x = r() * W, y = r() * H;
    g.fillStyle = `rgba(90,60,20,${(r() * 0.13).toFixed(3)})`;
    g.fillRect(x, y, 1.2, 1.2);
  }
}
