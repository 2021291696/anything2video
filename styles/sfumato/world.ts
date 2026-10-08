// ============================================================================
// world.ts — sfumato 图元库·世界层（文艺复兴晕涂油画，战役 4 批次④ D5）
// 管线（配方 06_renaissance 机制移植，Remotion/TS 重写）：
//   ①静态层：暗褐抹灰墙+窗光晕 / 空气透视远景（三层山越远越蓝越淡）/ 真投影透视地砖 /
//     方桌白布+梯背椅 / 拱窗石框 —— 画完后整层 blur(1.3px) 做 sfumato（烘焙成 PNG）
//   ②罩层：暗角+黄釉 α0.07+每 3px 画布经纬+9000 笔油彩肌理（α0.022–0.028 剂量红线，
//     26000 笔 α0.05 会变梵高）+龟裂 α0.32+白线错 1px lighter 漆皮翘边 —— 以 1920×1080
//     原生剂量烘焙（锁死参数 1:1），显示时降采样到 1280×720
//   ③光柱：楔形一次性 blur(28px) 入缓存（烘焙成 PNG），每帧 screen 叠加（云过日明暗）
// 技法借鉴 huashu-art-motion scenes/06_renaissance.js + lib/paint.js（MIT, alchaincyf），
// TS 重写：机制与参数级借鉴（sfumato 两遍配比/罩层四件套剂量/真投影地砖/龟裂随机游走/）
// 零代码拷贝。全部确定性（mulberry32+解析噪声，禁 Math.random/Date）。
// ============================================================================

export const W = 1280;
export const H = 720;
export const FPS = 30;

// ---- 确定性随机 / 噪声 ----
export type Rng = () => number;
export const mulberry32 = (seed: number): Rng => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const perm = new Uint8Array(512);
{
  const r = mulberry32(1337);
  const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) {
    const j = (r() * (i + 1)) | 0;
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
}
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const grad2 = (h: number, x: number, y: number) => {
  const u = h & 1 ? x : -x;
  const v = h & 2 ? y : -y;
  return (h & 4 ? u + v * 0.5 : u * 0.5 + v);
};
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
/** Perlin 2D（约 [-1,1]） */
export const noise2 = (x: number, y: number): number => {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  const u = fade(x);
  const v = fade(y);
  const a = perm[X] + Y;
  const b = perm[X + 1] + Y;
  const m = (p: number, q: number, w: number) => p + (q - p) * w;
  return m(
    m(grad2(perm[a], x, y), grad2(perm[b], x - 1, y), u),
    m(grad2(perm[a + 1], x, y - 1), grad2(perm[b + 1], x - 1, y - 1), u),
    v,
  );
};
export const fbm = (x: number, y: number, o = 4): number => {
  let s = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < o; i++) {
    s += amp * noise2(x * f, y * f);
    amp *= 0.5;
    f *= 2;
  }
  return s;
};
export const newCanvas = (w: number, h: number): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

// ---- 几何：拱窗 / 真投影地砖 / 光柱（huashu 1080p 构图 ×2/3 到 720p）----
const archPath = (xl: number, xr: number, cy: number, yb: number): Path2D => {
  const p = new Path2D();
  const r = (xr - xl) / 2;
  p.moveTo(xl, yb);
  p.lineTo(xl, cy);
  p.arc(xl + r, cy, r, Math.PI, 0);
  p.lineTo(xr, yb);
  p.closePath();
  return p;
};
export const OUTER = archPath(240, 540, 223, 373); // 石框外缘
export const INNER = archPath(281, 533, 220, 361); // 窗洞（远景/扑翼机/飞鸟都裁剪在这里）
export const VP = {yh: 280, cx: 640, f: 686, h: 5.75}; // 地平线 280，真投影 y=yh+f·h/Z
export const proj = (X: number, Z: number): [number, number] => [
  VP.cx + (VP.f * X) / Z,
  VP.yh + (VP.f * VP.h) / Z,
];
// 银白河走向（1080p 配方点列 ×2/3）
export const RIVER: Array<[number, number]> = [
  [365, 241], [413, 248], [451, 259], [435, 269], [387, 280],
  [365, 292], [393, 305], [445, 316], [480, 328], [499, 341], [527, 356],
];
export const BEAM: Array<[number, number]> = [[312, 298], [498, 322], [667, 720], [278, 720]];

// ---- 远景（窗洞内·空气透视）：三层山越远越蓝越淡 + 湖 + 河谷 + 银河 + 柏树 + 石桥 ----
export function paintLandscape(g: CanvasRenderingContext2D): void {
  g.save();
  g.clip(INNER);
  const sky = g.createLinearGradient(0, 93, 0, 233);
  sky.addColorStop(0, '#93b0b6');
  sky.addColorStop(0.6, '#c8d4cc');
  sky.addColorStop(1, '#e4e2cf');
  g.fillStyle = sky;
  g.fillRect(267, 87, 280, 153);
  // 云：柔软横向团块
  const r = mulberry32(7);
  for (let k = 0; k < 9; k++) {
    const x = 280 + r() * 253;
    const y = 117 + r() * 60;
    const rw = 33 + r() * 47;
    const cg = g.createRadialGradient(x, y, 0, x, y, rw);
    cg.addColorStop(0, 'rgba(240,238,225,.55)');
    cg.addColorStop(1, 'rgba(240,238,225,0)');
    g.fillStyle = cg;
    g.save();
    g.translate(x, y);
    g.scale(1, 0.32);
    g.translate(-x, -y);
    g.beginPath();
    g.arc(x, y, rw, 0, 7);
    g.fill();
    g.restore();
  }
  // 层叠山（空气透视：越远越蓝越淡，fbm 轮廓）
  const ranges: Array<[number, string, number, number, number]> = [
    [200, '#9fb4b8', 0.015, 17, 3], [212, '#8aa1a6', 0.024, 15, 5], [224, '#7d9294', 0.03, 9, 9],
  ];
  for (const [base, col, f, amp, sd] of ranges) {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(273, 240);
    for (let x = 273; x <= 540; x += 3) {
      g.lineTo(x, base - Math.abs(fbm(x * f, sd, 4)) * amp * 3 - noise2(x * f * 3, sd) * amp * 0.4);
    }
    g.lineTo(540, 240);
    g.closePath();
    g.fill();
  }
  // 湖
  const lake = g.createLinearGradient(0, 227, 0, 244);
  lake.addColorStop(0, '#dfe3d6');
  lake.addColorStop(1, '#c9d2c2');
  g.fillStyle = lake;
  g.fillRect(273, 227, 267, 16);
  // 河谷：近处转暖
  const vg = g.createLinearGradient(0, 240, 0, 363);
  vg.addColorStop(0, '#93a08a');
  vg.addColorStop(0.45, '#7a8462');
  vg.addColorStop(1, '#7c7048');
  g.fillStyle = vg;
  g.beginPath();
  g.moveTo(273, 241);
  for (let x = 273; x <= 540; x += 4) g.lineTo(x, 241 + noise2(x * 0.03, 3) * 3);
  g.lineTo(540, 363);
  g.lineTo(273, 363);
  g.closePath();
  g.fill();
  // 远丘斑块（越近越大）
  for (let k = 0; k < 18; k++) {
    const x = 280 + r() * 253;
    const y = 253 + r() * 100;
    const s = 0.4 + (y - 247) / 120;
    g.fillStyle = `rgba(${90 + r() * 30},${100 + r() * 20},${60 + r() * 15},.35)`;
    g.beginPath();
    g.ellipse(x, y, 20 * s, 4 * s, 0, 0, 7);
    g.fill();
  }
  // 河：宽度随距离变大（暗底+亮面双描）
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < RIVER.length - 1; i++) {
      const a = RIVER[i];
      const b = RIVER[i + 1];
      const w = 2 + i * 0.87;
      g.strokeStyle = pass ? '#eef0e8' : 'rgba(90,100,80,.6)';
      g.lineWidth = pass ? w : w + 2;
      g.beginPath();
      g.moveTo(a[0], a[1]);
      g.lineTo(b[0], b[1]);
      g.stroke();
    }
  }
  // 小路
  g.strokeStyle = 'rgba(200,190,150,.6)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(313, 363);
  g.bezierCurveTo(333, 333, 313, 313, 340, 293);
  g.stroke();
  // 柏树（深色竖椭圆）+ 圆树
  for (let k = 0; k < 17; k++) {
    const x = 283 + r() * 247;
    const y = 263 + r() * 93;
    const s = 0.4 + (y - 253) / 100;
    if (Math.abs(x - 427) < 20 && y < 280) continue;
    g.fillStyle = r() < 0.5 ? '#3f4c30' : '#4c5a36';
    if (r() < 0.55) {
      g.beginPath();
      g.ellipse(x, y - 9 * s, 2.7 * s, 10 * s, 0, 0, 7);
      g.fill();
    } else {
      g.beginPath();
      g.arc(x, y - 4 * s, 6 * s, 0, 7);
      g.fill();
    }
  }
  // 石桥
  g.fillStyle = '#b8ad8c';
  g.fillRect(377, 301, 37, 5);
  g.fillStyle = '#6e6650';
  for (let k = 0; k < 3; k++) {
    g.beginPath();
    g.arc(385 + k * 11, 307, 3.3, Math.PI, 0);
    g.fill();
  }
  g.restore();
}

// ---- 房间（墙/地砖/家具；不含窗洞远景）----
export function paintRoom(g: CanvasRenderingContext2D): void {
  // 墙：抹灰斑驳（半分辨率 fbm ImageData）+ 窗光晕 + 顶部压暗
  const tw = 640;
  const th = 360;
  const tex = newCanvas(tw, th);
  const tg = tex.getContext('2d')!;
  const img = tg.createImageData(tw, th);
  const d = img.data;
  const base = [67, 50, 31]; // #43321f
  const dark = [34, 24, 14]; // #22180e
  const r = mulberry32(21);
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const n = fbm(x * 0.0048 + 2.1, y * 0.0048, 4);
      const gr = (r() - 0.5) * 16;
      const u = clamp01(n * 1.2 + 0.25);
      const i = (y * tw + x) * 4;
      d[i] = lerp(base[0], dark[0], u) + n * 20 + gr;
      d[i + 1] = lerp(base[1], dark[1], u) + n * 20 + gr;
      d[i + 2] = lerp(base[2], dark[2], u) + n * 16 + gr;
      d[i + 3] = 255;
    }
  }
  tg.putImageData(img, 0, 0);
  g.drawImage(tex, 0, 0, W, H);
  const top = g.createLinearGradient(0, 0, 0, 520);
  top.addColorStop(0, 'rgba(12,7,3,.45)');
  top.addColorStop(0.5, 'rgba(12,7,3,0)');
  top.addColorStop(1, 'rgba(12,7,3,.15)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 520);
  const glow = g.createRadialGradient(390, 240, 40, 390, 253, 660);
  glow.addColorStop(0, 'rgba(200,158,105,.55)');
  glow.addColorStop(0.45, 'rgba(150,110,70,.20)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
  // 墙裙阴影线
  const bb = g.createLinearGradient(0, 507, 0, 528);
  bb.addColorStop(0, 'rgba(20,12,6,0)');
  bb.addColorStop(0.7, 'rgba(20,12,6,.45)');
  bb.addColorStop(1, 'rgba(20,12,6,.7)');
  g.fillStyle = bb;
  g.fillRect(0, 507, W, 21);
  // 地砖：透视棋盘（Z 从 16 往前每块 1.4，真投影）
  const zs: number[] = [];
  for (let z = 16; z > 5; z -= 1.4) zs.push(z);
  for (let j = 0; j < zs.length; j++) {
    const z0 = zs[j];
    const z1 = z0 - 1.4;
    for (let i = -14; i < 14; i++) {
      const X0 = i * 1.4;
      const X1 = X0 + 1.4;
      const p = [proj(X0, z0), proj(X1, z0), proj(X1, z1), proj(X0, z1)];
      if (p[2][0] < -200 || p[3][0] > W + 200) continue;
      g.fillStyle = (i + j) % 2 ? '#a88c64' : '#5c2418';
      g.beginPath();
      p.forEach((q, k) => (k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(30,15,8,.35)';
      g.lineWidth = 0.8;
      g.stroke();
    }
  }
  // 地砖整体暖褐罩色（压矢量感：古典油画的棋盘不会是纯色块）+ 砖面斑驳
  g.fillStyle = 'rgba(64,38,16,.30)';
  g.fillRect(0, 505, W, 215);
  g.save();
  g.globalAlpha = 0.22;
  g.globalCompositeOperation = 'multiply';
  for (let y = 505; y < 720; y += 6) {
    g.fillStyle = `rgba(120,90,50,${0.5 + 0.5 * noise2(y * 0.11, 5.5)})`;
    g.fillRect(0, y, W, 6);
  }
  for (let x = 0; x < W; x += 9) {
    g.fillStyle = `rgba(90,60,30,${0.4 + 0.4 * noise2(x * 0.07, 8.2)})`;
    g.fillRect(x, 505, 9, 215);
  }
  g.restore();
  // 地面受光：窗光落在光池（soft-light + overlay 双层）
  g.save();
  g.globalCompositeOperation = 'soft-light';
  const lp = g.createRadialGradient(467, 633, 20, 467, 633, 347);
  lp.addColorStop(0, 'rgba(255,230,180,.95)');
  lp.addColorStop(1, 'rgba(255,230,180,0)');
  g.fillStyle = lp;
  g.fillRect(0, 505, W, 215);
  g.globalCompositeOperation = 'overlay';
  const lp2 = g.createRadialGradient(467, 640, 20, 467, 640, 300);
  lp2.addColorStop(0, 'rgba(255,214,150,.45)');
  lp2.addColorStop(1, 'rgba(255,214,150,0)');
  g.fillStyle = lp2;
  g.fillRect(0, 505, W, 215);
  g.restore();
  const fd = g.createLinearGradient(0, 527, 0, 720);
  fd.addColorStop(0, 'rgba(25,14,8,.55)');
  fd.addColorStop(0.35, 'rgba(25,14,8,.22)');
  fd.addColorStop(1, 'rgba(25,14,8,.55)');
  g.fillStyle = fd;
  g.fillRect(0, 527, W, 193);
  const fside = g.createRadialGradient(507, 640, 80, 507, 640, 733);
  fside.addColorStop(0, 'rgba(18,9,4,0)');
  fside.addColorStop(0.5, 'rgba(18,9,4,.32)');
  fside.addColorStop(1, 'rgba(18,9,4,.78)');
  g.fillStyle = fside;
  g.fillRect(0, 527, W, 193);
}

// ---- 家具：方桌白布 + 梯背椅 + 拱窗石框 + 窗台 ----
export function paintFurniture(g: CanvasRenderingContext2D): void {
  // 拱窗：石框（左侧受光）+ 窗洞远景 + 窗台
  g.save();
  g.shadowColor = 'rgba(0,0,0,.5)';
  g.shadowBlur = 20;
  g.shadowOffsetX = 7;
  g.shadowOffsetY = 9;
  const st = g.createLinearGradient(240, 0, 540, 0);
  st.addColorStop(0, '#c6b08a');
  st.addColorStop(0.5, '#a48c68');
  st.addColorStop(1, '#7c6a4e');
  g.fillStyle = st;
  g.fill(OUTER);
  g.restore();
  const lightL = g.createLinearGradient(240, 0, 287, 0);
  lightL.addColorStop(0, 'rgba(255,240,210,0)');
  lightL.addColorStop(1, 'rgba(255,240,210,.35)');
  g.fillStyle = lightL;
  g.fill(OUTER);
  paintLandscape(g);
  g.strokeStyle = 'rgba(60,40,20,.55)';
  g.lineWidth = 2;
  g.stroke(INNER);
  const sl = g.createLinearGradient(0, 371, 0, 388);
  sl.addColorStop(0, '#d8c8a4');
  sl.addColorStop(1, '#8c7a5a');
  g.fillStyle = sl;
  g.fillRect(223, 371, 327, 16);
  g.fillStyle = 'rgba(0,0,0,.35)';
  g.fillRect(230, 387, 320, 7);
  // 桌子影子
  g.fillStyle = 'rgba(15,8,4,.45)';
  g.beginPath();
  g.ellipse(667, 603, 153, 15, 0, 0, 7);
  g.fill();
  // 梯背椅（右后：双腿+靠背三横档+座面）
  const wood = (x: number, y: number, w: number, h: number) => {
    const wg = g.createLinearGradient(x, 0, x + w, 0);
    wg.addColorStop(0, '#7a4a26');
    wg.addColorStop(0.4, '#9a6234');
    wg.addColorStop(1, '#4a2c16');
    g.fillStyle = wg;
    g.fillRect(x, y, w, h);
  };
  // 靠背双腿 + 三横档
  wood(946, 320, 13, 284);
  wood(992, 320, 13, 284);
  for (let k = 0; k < 3; k++) wood(946, 336 + k * 44, 59, 9);
  // 座面 + 前腿
  wood(938, 452, 76, 12);
  wood(942, 464, 11, 140);
  wood(998, 464, 11, 140);
  g.fillStyle = 'rgba(15,8,4,.4)';
  g.beginPath();
  g.ellipse(975, 606, 62, 9, 0, 0, 7);
  g.fill();
  // 方桌：桌腿+横撑+白桌布（布褶明暗）
  wood(559, 500, 11, 103);
  wood(773, 500, 11, 103);
  wood(568, 545, 207, 6);
  wood(603, 499, 8, 80);
  const cl = new Path2D();
  cl.moveTo(543, 417);
  cl.lineTo(803, 417);
  cl.lineTo(807, 505);
  cl.lineTo(541, 507);
  cl.closePath();
  const cg = g.createLinearGradient(543, 0, 807, 0);
  cg.addColorStop(0, '#e8dcbc');
  cg.addColorStop(0.5, '#d6c8a4');
  cg.addColorStop(1, '#a8987a');
  g.fillStyle = cg;
  g.fill(cl);
  g.save();
  g.clip(cl);
  for (let x = 553; x < 807; x += 23) {
    const fg = g.createLinearGradient(x, 0, x + 23, 0);
    fg.addColorStop(0, 'rgba(255,250,235,.25)');
    fg.addColorStop(0.5, 'rgba(80,60,40,.12)');
    fg.addColorStop(1, 'rgba(255,250,235,0)');
    g.fillStyle = fg;
    g.fillRect(x, 427, 23, 80);
  }
  g.fillStyle = 'rgba(255,250,235,.55)';
  g.fillRect(543, 417, 263, 8);
  g.fillStyle = '#7f95a8';
  g.fillRect(541, 489, 267, 2);
  g.fillRect(541, 494, 267, 1.5);
  g.restore();
  g.strokeStyle = 'rgba(60,45,30,.35)';
  g.lineWidth = 1.4;
  g.stroke(cl);
  // 手稿（羊皮纸两页）+ 羽毛笔（静态）
  g.save();
  g.translate(600, 428);
  g.rotate(-0.05);
  g.fillStyle = '#e9dcc0';
  g.fillRect(0, 0, 62, 44);
  g.fillStyle = '#f4ecd8';
  g.fillRect(6, -3, 62, 44);
  g.strokeStyle = 'rgba(110,80,40,.4)';
  g.lineWidth = 1;
  for (let k = 0; k < 6; k++) {
    g.beginPath();
    g.moveTo(11, 8 + k * 6);
    g.lineTo(60, 8 + k * 6);
    g.stroke();
  }
  g.restore();
  // 羽毛笔（躺在桌布上）
  g.save();
  g.translate(668, 470);
  g.rotate(-0.22);
  g.strokeStyle = '#e8e2d0';
  g.lineWidth = 3;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(26, -6, 50, -18);
  g.stroke();
  g.fillStyle = '#cfc7b0';
  g.beginPath();
  g.moveTo(50, -18);
  g.quadraticCurveTo(66, -30, 58, -40);
  g.quadraticCurveTo(46, -30, 50, -18);
  g.fill();
  g.restore();
  // 烛台（烛焰为动态，见 actors.drawFlame）：铜盘+烛身
  g.fillStyle = '#8a6a3a';
  g.beginPath();
  g.ellipse(756, 428, 17, 4.5, 0, 0, 7);
  g.fill();
  g.fillRect(753, 396, 6, 32);
  g.beginPath();
  g.ellipse(756, 396, 8, 3, 0, 0, 7);
  g.fill();
  const wax = g.createLinearGradient(750, 0, 764, 0);
  wax.addColorStop(0, '#f0e4c8');
  wax.addColorStop(0.5, '#e6d6b2');
  wax.addColorStop(1, '#b8a682');
  g.fillStyle = wax;
  g.fillRect(751, 366, 11, 30);
  g.fillStyle = '#5a4028';
  g.fillRect(755.5, 362, 2, 6); // 烛芯
}

// ---- 静态层（烘焙帧 0）：房间+家具画完后整层 blur(1.3px) = 全画面 sfumato ----
export function bakeStatic(g: CanvasRenderingContext2D): void {
  paintRoom(g);
  paintFurniture(g);
  const raw = newCanvas(W, H);
  raw.getContext('2d')!.drawImage(g.canvas, 0, 0);
  g.clearRect(0, 0, W, H);
  g.filter = 'blur(1.3px)';
  g.drawImage(raw, 0, 0);
  g.filter = 'none';
}

// ---- 罩层（烘焙帧 1）：720p 原生剂量烘焙（1080p 锁死参数按面积等效换算：9000 笔@1080p
//      = 4000 笔@720p，4.34 笔/kpx 不变；经纬每 2px = 3px@1080p；龟裂 420 走线）----
//      注：曾试过 1920×1080 原生烘焙再降采样，3px 经纬线降采样出摩尔纹，改回原生分辨率。
export function bakeOverlay(g: CanvasRenderingContext2D): void {
  const W2 = W;
  const H2 = H;
  // 暗角
  const v = g.createRadialGradient(547, 347, 200, 600, 373, 834);
  v.addColorStop(0, 'rgba(20,10,4,0)');
  v.addColorStop(0.55, 'rgba(20,10,4,.3)');
  v.addColorStop(1, 'rgba(10,5,2,.8)');
  g.fillStyle = v;
  g.fillRect(0, 0, W2, H2);
  // 黄釉 α0.07
  g.fillStyle = 'rgba(150,110,40,.07)';
  g.fillRect(0, 0, W2, H2);
  // 画布经纬：每 2px 一条（横暗/竖亮）
  const r = mulberry32(4);
  g.lineWidth = 1;
  for (let y = 0; y < H2; y += 2) {
    g.strokeStyle = `rgba(0,0,0,${0.03 + r() * 0.04})`;
    g.beginPath();
    g.moveTo(0, y + 0.5);
    g.lineTo(W2, y + 0.5);
    g.stroke();
  }
  for (let x = 0; x < W2; x += 2) {
    g.strokeStyle = `rgba(255,240,210,${0.015 + r() * 0.03})`;
    g.beginPath();
    g.moveTo(x + 0.5, 0);
    g.lineTo(x + 0.5, H2);
    g.stroke();
  }
  // 油彩笔触肌理：4000 笔极淡短笔（面积等效 9000@1080p；剂量红线：α0.022–0.028，
  // 方向随机；26000 笔 α0.05=梵高，禁）
  g.lineCap = 'round';
  for (let k = 0; k < 4000; k++) {
    const x = r() * W2;
    const y = r() * H2;
    const a = r() * Math.PI;
    const L = 7 + r() * 11;
    g.strokeStyle = r() < 0.5 ? 'rgba(255,235,200,.022)' : 'rgba(20,10,0,.028)';
    g.lineWidth = 3.4 + r() * 3.3;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L);
    g.stroke();
  }
  // 龟裂：随机游走细裂线网（420 走线，步 4-13px=面积等效 900@1080p）
  // α0.30 暗线 + 白线错 1px lighter α0.12（漆皮翘起）
  const cracks = (rc: Rng): Path2D[] => {
    const paths: Path2D[] = [];
    for (let k = 0; k < 420; k++) {
      const p = new Path2D();
      let x = rc() * W2;
      let y = rc() * H2;
      let a = rc() * Math.PI * 2;
      p.moveTo(x, y);
      const segs = 5 + ((rc() * 8) | 0);
      for (let s = 0; s < segs; s++) {
        a += (rc() - 0.5) * 1.6;
        x += Math.cos(a) * (4 + rc() * 9);
        y += Math.sin(a) * (4 + rc() * 9);
        p.lineTo(x, y);
      }
      paths.push(p);
    }
    return paths;
  };
  const net = cracks(mulberry32(77));
  g.globalAlpha = 0.3;
  g.strokeStyle = 'rgba(40,25,10,1)';
  g.lineWidth = 0.7;
  net.forEach((p) => g.stroke(p));
  g.globalAlpha = 0.12;
  g.globalCompositeOperation = 'lighter';
  g.filter = 'brightness(0) invert(1)';
  g.save();
  g.translate(1, 1);
  net.forEach((p) => g.stroke(p));
  g.restore();
  g.filter = 'none';
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
}

// ---- 光柱（烘焙帧 2）：楔形 blur(28px) 入缓存，每帧 screen 叠加 ----
export function bakeBeam(g: CanvasRenderingContext2D): void {
  const bg = g.createLinearGradient(373, 240, 467, 720);
  bg.addColorStop(0, 'rgba(255,228,175,0)');
  bg.addColorStop(0.22, 'rgba(255,228,175,.52)');
  bg.addColorStop(1, 'rgba(255,225,170,.30)');
  g.filter = 'blur(28px)';
  g.fillStyle = bg;
  g.beginPath();
  BEAM.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
  g.closePath();
  g.fill();
  g.filter = 'none';
  // 楔内第二层收窄亮芯（光柱的「体」感）
  const core = g.createLinearGradient(400, 300, 450, 720);
  core.addColorStop(0, 'rgba(255,240,205,0)');
  core.addColorStop(0.4, 'rgba(255,240,205,.22)');
  core.addColorStop(1, 'rgba(255,240,205,.12)');
  g.filter = 'blur(14px)';
  g.fillStyle = core;
  g.beginPath();
  g.moveTo(352, 316);
  g.lineTo(462, 330);
  g.lineTo(560, 720);
  g.lineTo(330, 720);
  g.closePath();
  g.fill();
  g.filter = 'none';
}
