// 签名①：噪声浮雕岩壁 —— 半分辨率高度场 fbm + 有限差分法线 + 左上方向光，伪 3D 岩面一次成型。
// 技法借鉴 huashu-art-motion references/风格配方/01_cave.md 与 scenes/01_cave.js（MIT, alchaincyf），TS 重写。
// 参数锁死：高度场 fbm(x·0.0022,4oct)·1.0 + fbm(x·0.011,3oct)·0.16 + noise(x·0.05)·0.03；
//   中频系数 >0.2 会变迷彩（配方踩坑量化）——锁 0.16；法线 ×52；光源 L=(-0.55,-0.62,0.56)；
//   shade = clamp(0.5+(dot-0.56)·0.9)；底色三赭石两层低频 fbm 混合 ×(0.72+shade·0.55)。
import {PAL, WORLD, type CanvasCtx} from './types';
import {clamp, fbm, hash2, mulberry32, vnoise} from './noise';

const HW = 1120, HH = 540; // 半分辨率高度场（世界 2240×1080）

const hex = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16),
];
const WALL_L = hex(PAL.wallL), WALL_D = hex(PAL.wallD), WALL_R = hex(PAL.wallR);
const mix3 = (a: [number, number, number], b: [number, number, number], k: number): [number, number, number] =>
  [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

let RELIEF: HTMLCanvasElement | null = null;
let SHADE: Float32Array | null = null;

/** 半分辨率浮雕（放大用平滑插值 → 起伏柔和），同时导出 shade 场给颜料贴图。 */
export function relief(): HTMLCanvasElement {
  if (RELIEF) return RELIEF;
  const cv = document.createElement('canvas');
  cv.width = HW; cv.height = HH;
  const g = cv.getContext('2d')!;
  const hgt = new Float32Array((HW + 1) * (HH + 1));
  for (let y = 0; y <= HH; y++) {
    for (let x = 0; x <= HW; x++) {
      const X = x * 2, Y = y * 2;
      hgt[y * (HW + 1) + x] =
        fbm(X * 0.0022 + 3, Y * 0.0022, 4, 11) +
        fbm(X * 0.011, Y * 0.011 + 7, 3, 22) * 0.16 +
        vnoise(X * 0.05, Y * 0.05, 33) * 0.03;
    }
  }
  const L = [-0.55, -0.62, 0.56];
  const img = g.createImageData(HW, HH);
  const d = img.data;
  const shade = new Float32Array(HW * HH);
  for (let y = 0; y < HH; y++) {
    for (let x = 0; x < HW; x++) {
      const i = y * (HW + 1) + x;
      const dx = (hgt[i + 1] - hgt[i]) * 52, dy = (hgt[i + HW + 1] - hgt[i]) * 52;
      const nl = Math.hypot(dx, dy, 1);
      const dot = (-dx * L[0] - dy * L[1] + L[2]) / nl;
      const s = clamp(0.5 + (dot - 0.56) * 0.9);
      shade[y * HW + x] = s;
      const X = x * 2, Y = y * 2;
      const n2 = fbm(X * 0.0016 + 11, Y * 0.0016 + 2, 3, 44);
      const n3 = fbm(X * 0.004 + 40, Y * 0.004, 2, 55);
      let col = mix3(WALL_L, WALL_D, clamp(0.35 - n2 * 1.3));
      col = mix3(col, WALL_R, clamp(n3 * 1.4, 0, 0.45));
      const k = 0.72 + s * 0.55;
      const j = (y * HW + x) * 4;
      d[j] = col[0] * k; d[j + 1] = col[1] * k; d[j + 2] = col[2] * k; d[j + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  RELIEF = cv;
  SHADE = shade;
  return cv;
}

function grainLayer(seed: number, freq: number, col: [number, number, number], alpha: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = WORLD.w; cv.height = WORLD.h;
  const g = cv.getContext('2d')!;
  const img = g.createImageData(WORLD.w, WORLD.h);
  const d = img.data;
  for (let y = 0; y < WORLD.h; y++) {
    for (let x = 0; x < WORLD.w; x++) {
      if (hash2(x, y, seed) < freq) {
        const j = (y * WORLD.w + x) * 4;
        d[j] = col[0]; d[j + 1] = col[1]; d[j + 2] = col[2];
        d[j + 3] = 255 * alpha * hash2(x, y, seed + 91);
      }
    }
  }
  g.putImageData(img, 0, 0);
  return cv;
}

/** 随机游走裂缝：深线下面垫一条 +1.6px 偏移的亮线 → 刻痕感。 */
function cracks(g: CanvasCtx): void {
  const r = mulberry32(404);
  const starts: Array<[number, number, number]> = [
    [620, 0, 1.5], [700, 0, 1.75], [1180, 0, 1.7], [0, 420, -0.15], [0, 560, 0.05],
    [2240, 380, 3.0], [2240, 640, 3.25], [930, 1080, -1.4], [170, 1080, -1.6], [0, 120, 0.4],
  ];
  const walk = (x: number, y: number, a: number, n: number, w: number, depth: number): void => {
    const pts: Array<[number, number]> = [[x, y]];
    for (let s = 0; s < n; s++) {
      a += (r() - 0.5) * 0.9;
      const l = 14 + r() * 26;
      x += Math.cos(a) * l; y += Math.sin(a) * l;
      pts.push([x, y]);
      if (depth < 2 && r() < 0.12) walk(x, y, a + (r() < 0.5 ? 1 : -1) * (0.6 + r() * 0.6), ((n - s) * 0.5) | 0, w * 0.7, depth + 1);
    }
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(255,226,180,.22)';
    g.lineWidth = w + 1;
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0] + 1.6, p[1] + 1.6) : g.moveTo(p[0] + 1.6, p[1] + 1.6)));
    g.stroke();
    g.strokeStyle = 'rgba(40,22,10,.62)';
    g.lineWidth = w;
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.stroke();
  };
  starts.forEach(([x, y, a]) => walk(x, y, a, 12 + ((r() * 14) | 0), 2.2, 0));
}

let BG: HTMLCanvasElement | null = null;

/** 世界底版：浮雕 + 两层颗粒 + 裂缝 + 静态旧手印/爪印/红点弧/淡炭涂鸦 + 暗角 + 静态暖光。 */
export function wallBg(statics: (g: CanvasCtx) => void): HTMLCanvasElement {
  if (BG) return BG;
  const cv = document.createElement('canvas');
  cv.width = WORLD.w; cv.height = WORLD.h;
  const g = cv.getContext('2d')!;
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(relief(), 0, 0, WORLD.w, WORLD.h);
  g.drawImage(grainLayer(101, 0.22, [60, 36, 18], 0.32), 0, 0);
  g.drawImage(grainLayer(102, 0.1, [255, 238, 205], 0.28), 0, 0);
  cracks(g);
  statics(g); // 旧手印/爪印/红点弧/淡炭涂鸦（负形喷绘，画在底版上）
  const v = g.createRadialGradient(1120, 540, 300, 1120, 540, 1300);
  v.addColorStop(0, 'rgba(30,14,4,0)');
  v.addColorStop(0.5, 'rgba(30,14,4,.16)');
  v.addColorStop(1, 'rgba(18,8,2,.8)');
  g.fillStyle = v;
  g.fillRect(0, 0, WORLD.w, WORLD.h);
  const fl = g.createRadialGradient(585, 500, 20, 585, 500, 640);
  fl.addColorStop(0, 'rgba(255,190,110,.36)');
  fl.addColorStop(0.5, 'rgba(255,150,70,.14)');
  fl.addColorStop(1, 'rgba(255,150,70,0)');
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = fl;
  g.fillRect(0, 0, WORLD.w, WORLD.h);
  g.globalCompositeOperation = 'source-over';
  BG = cv;
  return cv;
}

let FIGTEX: HTMLCanvasElement | null = null;

/** 签名②配套：「岩面贴图」——颜料层 source-atop 用（阴影压暗/亮处提暖 + 颗粒 + 干湿大斑）。 */
export function figTex(): HTMLCanvasElement {
  if (FIGTEX) return FIGTEX;
  const sh = SHADE!;
  const cv = document.createElement('canvas');
  cv.width = WORLD.w; cv.height = WORLD.h;
  const g = cv.getContext('2d')!;
  const s = document.createElement('canvas');
  s.width = HW; s.height = HH;
  const sg = s.getContext('2d')!;
  const img = sg.createImageData(HW, HH);
  const d = img.data;
  for (let i = 0; i < HW * HH; i++) {
    const v = sh[i];
    const dk = v < 0.5;
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = dk ? 20 : 255;
    if (!dk) { d[i * 4 + 1] = 236; d[i * 4 + 2] = 200; }
    d[i * 4 + 3] = dk ? (0.5 - v) * 150 : (v - 0.5) * 50;
  }
  sg.putImageData(img, 0, 0);
  g.drawImage(s, 0, 0, WORLD.w, WORLD.h);
  g.drawImage(grainLayer(201, 0.14, [30, 18, 8], 0.32), 0, 0);
  g.drawImage(grainLayer(202, 0.05, [255, 236, 200], 0.22), 0, 0);
  // 颜料干湿不均的低频大斑
  const mw = 280, mh = 135;
  const m = document.createElement('canvas');
  m.width = mw; m.height = mh;
  const mg = m.getContext('2d')!;
  const mi = mg.createImageData(mw, mh);
  for (let i = 0; i < mw * mh; i++) {
    const x = i % mw, y = (i / mw) | 0;
    const n = fbm(x * 0.08 + 21, y * 0.08, 3, 66);
    mi.data[i * 4] = mi.data[i * 4 + 1] = mi.data[i * 4 + 2] = n > 0 ? 255 : 0;
    mi.data[i * 4 + 3] = Math.abs(n) * 70;
  }
  mg.putImageData(mi, 0, 0);
  g.drawImage(m, 0, 0, WORLD.w, WORLD.h);
  FIGTEX = cv;
  return cv;
}
