// 镶嵌渲染器：ID/SH 双缓冲——布局一次性预计算进 typed array，每帧只重取色。
// 技法借鉴 huashu-art-motion (MIT) scripts/engine/scenes/04_roman.js:325-447（Hausner 2001 andamento：
// 结构图降采样→RGB 差边缘→Felzenszwalb–Huttenlocher 精确欧氏距离变换→距离场等值线带沿 8 邻域最一致
// 走线放石块→规则成行补洞→四半边独立 s/2×(1.08–1.28)＋旋转抖→加权 L∞ Voronoi 光栅，D1>1 或
// (D2−D1)·h/2<g 判灰浆——石头比半间距大 8–28% 交给平分线切出缝），TSX 重写，零整段拷贝。
// 两条运动学定律（RECON-huashu §04）：①动态区不做单独小石块参数（静止时是补丁）——犬颌/烟动=同尺度
// 石块重新取色；②慢速位移小于颗粒尺寸时「只换色」会被量化吃掉——边框用传送带（石块随图案平移），
// 小于 3 石宽的吠叫波做成 emblema 嵌片随手移动。
import {Ctx, clamp, mulberry32, hash1, easeInOut} from './engine';
import {
  PAL, W, H, BW, FRESCO, FINT, MOUTH, paintStatic, paintFrescoFX, paintDog, paintMouse,
  paintScroll, drawText, PER, SIDES, DOG_BOX,
} from './art';
import {TOTAL_FRAMES} from '../common/timeline';
import {SUBS} from '../common/subs';

// ---- 石块类别：尺寸 / 沿轮廓圈数（99=全部沿轮廓）/ 颜色抖动（配方表，脸=5px 短板修正）----
const K_WALL = 0, K_HALO = 1, K_FIG = 2, K_FACE = 3, K_FRAME = 4, K_PIC = 5, K_BORDER = 6, K_TEXT = 7, K_FLOOR = 8;
const SZ = [12, 11, 10, 5, 9, 9, 7.6, 7, 13];
const KR = [1, 9, 99, 99, 99, 2, 0, 99, 1];
const JIT = [.08, .05, .05, .04, .05, .06, .05, .05, .065];

export const FPS = 30;
const T0 = 2.33;                                   // FX 时间基（frame0 烘焙相位）
const FX_T0 = 64 / 30 + T0;                        // 底稿烘焙取管线起点相态，衔接无跳变
const PIPE_BLEND = 8;                              // 铺陈→光栅 交叉淡化帧数
const REV = {x: 830, y: 560, speed: 21, dur: 9, start: 2}; // 翻面波：犬心荡出（钩子）

type Rect = {x: number; y: number; w: number; h: number; img: ImageData};
type Mosaic = {
  sb: HTMLCanvasElement; bgc: HTMLCanvasElement; bg: Ctx; oc: HTMLCanvasElement; og: Ctx;
  ID: Int32Array; SH: Uint8Array; SO: Uint8ClampedArray;
  TCr: Uint8ClampedArray; TCg: Uint8ClampedArray; TCb: Uint8ClampedArray;
  SX: Float32Array; SY: Float32Array; SS: Float32Array; n: number;
  QX: Float64Array; QY: Float64Array;                 // 每块最终四角（8 值/块，inset 后）
  avgSh: Uint8Array; delay: Float32Array; SIDX: Int32Array; JL: Float32Array;
  rects: Rect[]; dyn: Int32Array;
  strip: HTMLCanvasElement; ring: HTMLCanvasElement; bed: HTMLCanvasElement;
  revealEnd: number; stats: {tiles: number; dynTiles: number; buildMs: number};
};

let S: Mosaic | null = null;
export const getMosaic = (): Mosaic => {
  if (!S) S = build();
  return S;
};

const mk = (): [HTMLCanvasElement, Ctx] => {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  return [cv, cv.getContext('2d', {willReadFrequently: true}) as Ctx];
};

// ---- Felzenszwalb–Huttenlocher 2D 平方欧氏距离变换（数学移植，两遍一维下包络）----
function edt(F: Float64Array, w: number, h: number): Float64Array {
  const n = Math.max(w, h);
  const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  const pass = (len: number): void => {
    let k = 0; v[0] = 0; z[0] = -1e30; z[1] = 1e30;
    for (let q = 1; q < len; q++) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; z[k] = s; z[k + 1] = 1e30;
    }
    k = 0;
    for (let q = 0; q < len; q++) {
      while (z[k + 1] < q) k++;
      d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
    }
  };
  const out = new Float64Array(w * h);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = F[y * w + x];
    pass(h);
    for (let y = 0; y < h; y++) out[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = out[y * w + x];
    pass(w);
    for (let x = 0; x < w; x++) out[y * w + x] = d[x];
  }
  return out;
}

function build(): Mosaic {
  const tm0 = performance.now();                     // 仅统计用，不参与内容
  const [sb, sbg] = mk();
  paintStatic(sbg);
  // 结构图（决定石块怎么排）：静态＋犬（静止颌相，不含会动的吠叫波——嵌片不入结构）
  const [sc, sg] = mk();
  sg.drawImage(sb, 0, 0);
  paintDog(sg, 0, 0, 'art');
  // 类别图
  const [cc, cg] = mk();
  const cs = (k: number): string => `rgb(${k * 16},0,0)`;
  cg.fillStyle = cs(K_WALL); cg.fillRect(0, 0, W, H);
  cg.strokeStyle = cs(K_HALO); cg.lineWidth = 30; cg.strokeRect(FRESCO.x, FRESCO.y, FRESCO.w, FRESCO.h);
  cg.fillStyle = cs(K_FRAME); cg.fillRect(FRESCO.x, FRESCO.y, FRESCO.w, FRESCO.h);
  cg.fillStyle = cs(K_PIC); cg.fillRect(FINT.x, FINT.y, FINT.w, FINT.h);
  cg.fillStyle = cs(K_FLOOR); cg.fillRect(FINT.x, 496, FINT.w, FINT.h + FINT.y - 496);
  drawText(cg, 640, 905, 640, cs(K_TEXT));
  paintMouse(cg, 'class', cs(K_FIG));
  cg.lineJoin = 'round';
  cg.strokeStyle = cs(K_HALO); cg.lineWidth = 46; paintDog(cg, 0, 0, 'halo');
  paintDog(cg, 0, 0, 'class', cs(K_FIG), cs(K_FACE));
  cg.fillStyle = cs(K_BORDER);
  cg.fillRect(0, 0, W, BW); cg.fillRect(0, H - BW, W, BW); cg.fillRect(0, 0, BW, H); cg.fillRect(W - BW, 0, BW, H);
  const cd = cg.getImageData(0, 0, W, H).data;
  const CL = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) CL[i] = Math.round(cd[i * 4] / 16);
  // 半分辨率：RGB 差>34 记边缘 → 精确 EDT
  const HW = 960, HH = 540, N = HW * HH;
  const hc = document.createElement('canvas');
  hc.width = HW; hc.height = HH;
  const hg = hc.getContext('2d', {willReadFrequently: true}) as Ctx;
  hg.drawImage(sc, 0, 0, HW, HH);
  const hd = hg.getImageData(0, 0, HW, HH).data;
  const CH = new Uint8Array(N);
  for (let y = 0; y < HH; y++) for (let x = 0; x < HW; x++) CH[y * HW + x] = CL[(2 * y) * W + 2 * x];
  const F = new Float64Array(N);
  for (let y = 0; y < HH; y++) for (let x = 0; x < HW; x++) {
    const i = y * HW + x, o = i * 4;
    let e = false;
    if (x < HW - 1) { const q = o + 4; e = Math.abs(hd[o] - hd[q]) + Math.abs(hd[o + 1] - hd[q + 1]) + Math.abs(hd[o + 2] - hd[q + 2]) > 34; }
    if (!e && y < HH - 1) { const q = o + HW * 4; e = Math.abs(hd[o] - hd[q]) + Math.abs(hd[o + 1] - hd[q + 1]) + Math.abs(hd[o + 2] - hd[q + 2]) > 34; }
    if (!e && x < HW - 1 && CH[i] !== CH[i + 1] && (CH[i] === K_BORDER || CH[i + 1] === K_BORDER)) e = true;
    if (!e && y < HH - 1 && CH[i] !== CH[i + HW] && (CH[i] === K_BORDER || CH[i + HW] === K_BORDER)) e = true;
    F[i] = e ? 0 : 1e20;
  }
  const D = edt(F, HW, HH);
  for (let i = 0; i < N; i++) D[i] = Math.sqrt(D[i]) * 2;
  const tangent = (i: number): number => {
    const x = i % HW, y = (i / HW) | 0;
    const gx = D[i + (x < HW - 1 ? 1 : 0)] - D[i - (x > 0 ? 1 : 0)];
    const gy = D[i + (y < HH - 1 ? HW : 0)] - D[i - (y > 0 ? HW : 0)];
    return Math.atan2(gy, gx) + Math.PI / 2;
  };
  // 石块种子：空间哈希保证最小间距
  const sx: number[] = [], sy: number[] = [], ss: number[] = [], sa: number[] = [], scl: number[] = [];
  const CS = 24, GWc = Math.ceil(W / CS), GHc = Math.ceil(H / CS);
  const cell: number[][] = Array.from({length: GWc * GHc}, () => []);
  const ok = (x: number, y: number, s: number, fac: number): boolean => {
    const cx = (x / CS) | 0, cy = (y / CS) | 0;
    for (let j = cy - 1; j <= cy + 1; j++) for (let i = cx - 1; i <= cx + 1; i++) {
      if (i < 0 || j < 0 || i >= GWc || j >= GHc) continue;
      for (const k of cell[j * GWc + i]) {
        const m = fac * (s + ss[k]) / 2, dx = sx[k] - x, dy = sy[k] - y;
        if (dx * dx + dy * dy < m * m) return false;
      }
    }
    return true;
  };
  const add = (x: number, y: number, s: number, a: number, c: number): void => {
    const k = sx.length;
    sx.push(x); sy.push(y); ss.push(s); sa.push(a); scl.push(c);
    cell[((y / CS) | 0) * GWc + ((x / CS) | 0)].push(k);
  };
  const r = mulberry32(2079);
  // ① 外框：沿边成行（传送带之下同一布局）＋四角方格
  const NR = 11, bs = BW / NR;
  for (const [a, b, c, d, e, f, len] of SIDES) {
    for (let j = 0; j < NR; j++) {
      let u = BW + (j % 2) * bs * 0.5 + r() * 2;
      while (u < len - BW) {
        const w = bs * (0.86 + r() * 0.28), uc = u + w / 2, v = (j + 0.5) * bs;
        add(a * uc + c * v + e, b * uc + d * v + f, bs, Math.atan2(b, a) + (r() - 0.5) * 0.06, K_BORDER);
        u += w;
      }
    }
  }
  for (const [x0, y0] of [[0, 0], [W - BW, 0], [0, H - BW], [W - BW, H - BW]])
    for (let j = 0; j < NR; j++) for (let i = 0; i < NR; i++) add(x0 + (i + 0.5) * bs, y0 + (j + 0.5) * bs, bs, (r() - 0.5) * 0.06, K_BORDER);
  // ② 沿轮廓：距离场等值线带 |d−(k+½)s|<1.5 上走线，每走一个石块宽放一块
  const cand = new Uint8Array(N), vis = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const c = CH[i];
    if (c === K_BORDER) continue;
    const s = SZ[c], d = D[i];
    if (d < 1) continue;
    const k = Math.floor(d / s);
    if (k >= KR[c]) continue;
    if (Math.abs(d - (k + 0.5) * s) < 1.5) cand[i] = 1;
  }
  const NB = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  for (let i0 = 0; i0 < N; i0++) {
    if (!cand[i0] || vis[i0]) continue;
    let cur = i0, px = -1e9, py = -1e9, dx = 1, dy = 0;
    for (;;) {
      vis[cur] = 1;
      const hx = cur % HW, hy = (cur / HW) | 0, x = 2 * hx + 1, y = 2 * hy + 1, c = CH[cur], s = SZ[c];
      if ((x - px) * (x - px) + (y - py) * (y - py) >= s * s * 0.98 && ok(x, y, s, 0.8)) { add(x, y, s, tangent(cur), c); px = x; py = y; }
      let best = -1, bd = -9, bx = 0, by = 0;
      for (const [ox, oy] of NB) {
        const nx = hx + ox, ny = hy + oy;
        if (nx < 0 || ny < 0 || nx >= HW || ny >= HH) continue;
        const n = ny * HW + nx;
        if (!cand[n] || vis[n]) continue;
        const l = Math.hypot(ox, oy), dt = (ox * dx + oy * dy) / l;
        if (dt > bd) { bd = dt; best = n; bx = ox / l; by = oy / l; }
      }
      if (best < 0) break;
      dx = dx * 0.6 + bx * 0.4; dy = dy * 0.6 + by * 0.4;
      const l = Math.hypot(dx, dy) || 1;
      dx /= l; dy /= l; cur = best;
    }
  }
  // ③ 其余：规则成行（砖缝错半块）＋补洞
  for (let c = 0; c < SZ.length; c++) {
    if (c === K_BORDER) continue;
    const s = SZ[c];
    for (let j = 0; (j + 0.5) * s < H; j++) for (let i = -1; (i + 0.5) * s < W; i++) {
      const x = (i + 0.5 + (j % 2) * 0.5) * s + (r() - 0.5) * 0.18 * s;
      const y = (j + 0.5) * s + (r() - 0.5) * 0.1 * s;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      if (CL[(y | 0) * W + (x | 0)] !== c) continue;
      const hi = Math.min(HH - 1, (y / 2) | 0) * HW + Math.min(HW - 1, (x / 2) | 0);
      const contour = KR[c] >= 99 || D[hi] < KR[c] * s;
      if (ok(x, y, s, 0.86)) add(x, y, s, contour ? tangent(hi) : (r() - 0.5) * 0.07, c);
    }
  }
  // ④ 光栅化：加权 L∞ Voronoi（四半边独立 1.08–1.28 抖动 → 不规则方块；D2−D1 太小处=灰浆缝）
  const n = sx.length;
  const HUP = new Float32Array(n), HUM = new Float32Array(n), HVP = new Float32Array(n), HVM = new Float32Array(n);
  const CA = new Float32Array(n), SA = new Float32Array(n), JL = new Float32Array(n);
  const TR = new Float32Array(n), TG = new Float32Array(n), TB = new Float32Array(n);
  const SIDX = new Int32Array(n);
  for (let k = 0; k < n; k++) {
    const h = ss[k] / 2, c = scl[k];
    HUP[k] = h * (1.08 + r() * 0.2); HUM[k] = h * (1.08 + r() * 0.2);
    HVP[k] = h * (1.08 + r() * 0.2); HVM[k] = h * (1.08 + r() * 0.2);
    const a = sa[k] + (r() - 0.5) * 0.12;
    CA[k] = Math.cos(a); SA[k] = Math.sin(a);
    JL[k] = (r() - 0.5) * 2 * JIT[c];
    const ad = (r() - 0.5) * 14; TR[k] = ad; TG[k] = ad; TB[k] = ad;
    const q = r();
    if (q < 0.09) { TR[k] += 12; TG[k] += 4; TB[k] -= 8; } else if (q < 0.16) { TR[k] -= 6; TB[k] += 9; }
    if (c === K_WALL && r() < 0.07) JL[k] -= 0.12;
    SIDX[k] = clamp(Math.round(sy[k]), 0, H - 1) * W + clamp(Math.round(sx[k]), 0, W - 1);
  }
  const D1 = new Float32Array(W * H).fill(9), D2 = new Float32Array(W * H).fill(9);
  const ID = new Int32Array(W * H).fill(-1);
  for (let k = 0; k < n; k++) {
    const cx = sx[k], cy = sy[k], ca = CA[k], sn = SA[k];
    const hm = Math.max(HUP[k], HUM[k], HVP[k], HVM[k]), R = Math.ceil(hm * 1.5) + 1;
    const x0 = Math.max(0, (cx - R) | 0), x1 = Math.min(W - 1, (cx + R) | 0);
    const y0 = Math.max(0, (cy - R) | 0), y1 = Math.min(H - 1, (cy + R) | 0);
    const hup = HUP[k], hum = HUM[k], hvp = HVP[k], hvm = HVM[k];
    for (let y = y0; y <= y1; y++) {
      const ddy = y + 0.5 - cy;
      let p = y * W + x0;
      for (let x = x0; x <= x1; x++, p++) {
        const ddx = x + 0.5 - cx, u = ddx * ca + ddy * sn, v = -ddx * sn + ddy * ca;
        const du = u > 0 ? u / hup : -u / hum, dv = v > 0 ? v / hvp : -v / hvm;
        const Dd = du > dv ? du : dv;
        if (Dd < D1[p]) { D2[p] = D1[p]; D1[p] = Dd; ID[p] = k; } else if (Dd < D2[p]) D2[p] = Dd;
      }
    }
  }
  // ⑤ 每像素：石块 or 灰浆；斜面明暗（左上受光）＋颗粒
  const SH = new Uint8Array(W * H), LX = -0.6, LY = -0.8;
  const gr = mulberry32(7);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x, k = ID[p];
    if (k < 0) continue;
    const h = (HUP[k] + HUM[k] + HVP[k] + HVM[k]) / 4, g = clamp(0.1 * ss[k], 0.75, 1.25), d1 = D1[p];
    const gap = (D2[p] - d1) * h / 2;
    if (d1 > 1 || gap < g) { ID[p] = -1; continue; }
    const e = Math.min((1 - d1) * h, gap - g);
    let sh = 1 - 0.05 * d1 * d1 + (gr() - 0.5) * 0.06;
    if (e < 2.2) {
      const ddx = x + 0.5 - sx[k], ddy = y + 0.5 - sy[k], ca = CA[k], sn = SA[k];
      const u = ddx * ca + ddy * sn, v = -ddx * sn + ddy * ca;
      const du = u > 0 ? u / HUP[k] : -u / HUM[k], dv = v > 0 ? v / HVP[k] : -v / HVM[k];
      const nx = du > dv ? Math.sign(u) * ca : -Math.sign(v) * sn;
      const ny = du > dv ? Math.sign(u) * sn : Math.sign(v) * ca;
      sh += 0.16 * (1 - e / 2.2) * (nx * LX + ny * LY);
    }
    SH[p] = clamp(Math.round(sh * 128), 0, 255);
  }
  // ⑥ 第 0 帧全幅上色 → 静态马赛克 SO ＋ 每块均色（翻面波用）
  const [bc, bg] = mk();
  bg.drawImage(sb, 0, 0);
  paintScroll(bg, 0);
  paintFrescoFX(bg, FX_T0);
  paintDog(bg, 0, 0, 'art');
  const bd = bg.getImageData(0, 0, W, H).data;
  const TCr = new Uint8ClampedArray(n), TCg = new Uint8ClampedArray(n), TCb = new Uint8ClampedArray(n);
  for (let k = 0; k < n; k++) {
    const o = SIDX[k] * 4, f = 1 + JL[k];
    TCr[k] = bd[o] * f + TR[k]; TCg[k] = bd[o + 1] * f + TG[k]; TCb[k] = bd[o + 2] * f + TB[k];
  }
  const shSum = new Float64Array(n), shCnt = new Uint32Array(n);
  for (let p = 0; p < W * H; p++) { const k = ID[p]; if (k >= 0) { shSum[k] += SH[p]; shCnt[k]++; } }
  const avgSh = new Uint8Array(n);
  for (let k = 0; k < n; k++) avgSh[k] = shCnt[k] ? clamp(Math.round(shSum[k] / shCnt[k]), 40, 255) : 128;
  const [oc, og] = mk();
  const oimg = og.createImageData(W, H), SO = oimg.data;
  const grr = mulberry32(13);
  for (let p = 0; p < W * H; p++) {
    const k = ID[p], o = p * 4;
    if (k < 0) {
      const nz = (grr() - 0.5) * 16;
      SO[o] = PAL.grout[0] + nz; SO[o + 1] = PAL.grout[1] + nz; SO[o + 2] = PAL.grout[2] + nz;
    } else {
      const sh = SH[p];
      SO[o] = (TCr[k] * sh) >> 7; SO[o + 1] = (TCg[k] * sh) >> 7; SO[o + 2] = (TCb[k] * sh) >> 7;
    }
    SO[o + 3] = 255;
  }
  og.putImageData(oimg, 0, 0);
  // ⑦ 动态矩形（烟/火星画窗＋犬含晕圈余量；动态区与邻区同一套布局，只重取色）
  const mkRect = (x: number, y: number, w: number, h: number): Rect => ({x, y, w, h, img: og.createImageData(w, h)});
  const rects = [mkRect(120, 140, 540, 510), mkRect(DOG_BOX.x, DOG_BOX.y, DOG_BOX.w, DOG_BOX.h)];
  const mark = new Uint8Array(n), dyn: number[] = [];
  for (const R of rects) for (let y = R.y; y < R.y + R.h; y++) for (let x = R.x; x < R.x + R.w; x++) {
    const k = ID[y * W + x];
    if (k >= 0 && !mark[k]) { mark[k] = 1; dyn.push(k); }
  }
  // ⑧ 铺陈波：每块延迟=离心距/波速＋散列抖；预烘最终四角
  let maxDelay = 0;
  const delay = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const dist = Math.hypot(sx[k] - REV.x, sy[k] - REV.y);
    const d = dist / REV.speed + hash1(k * 3.7) * 3 - 3 * Math.max(0, 1 - dist / 500);
    delay[k] = d;
    if (d > maxDelay) maxDelay = d;
  }
  const revealEnd = Math.ceil(REV.start + maxDelay + REV.dur) + 1;
  const QX = new Float64Array(n * 4), QY = new Float64Array(n * 4);
  for (let k = 0; k < n; k++) {
    const hu = HUP[k] * 0.92, hv = HVP[k] * 0.9, hu2 = HUM[k] * 0.92, hv2 = HVM[k] * 0.9;
    const ca = CA[k], sa = SA[k];
    const cor: Array<[number, number]> = [[hu, -hv], [hu2, hv2], [-hu, hv], [-hu2, -hv2]];
    for (let i = 0; i < 4; i++) {
      QX[k * 4 + i] = sx[k] + cor[i][0] * ca - cor[i][1] * sa;
      QY[k * 4 + i] = sy[k] + cor[i][0] * sa + cor[i][1] * ca;
    }
  }
  // ⑨ 传送带＋吠叫波嵌片＋铺陈底床
  const strip = borderStrip();
  const ring = ringSprite();
  const bed = document.createElement('canvas');
  bed.width = W; bed.height = H;
  const bedg = bed.getContext('2d') as Ctx;
  bedg.fillStyle = `rgb(${PAL.bed[0]},${PAL.bed[1]},${PAL.bed[2]})`;
  bedg.fillRect(0, 0, W, H);
  return {
    sb, bgc: bc, bg, oc, og, ID, SH, SO, TCr, TCg, TCb,
    SX: Float32Array.from(sx), SY: Float32Array.from(sy), SS: Float32Array.from(ss), n,
    QX, QY, avgSh, delay, SIDX, JL, rects, dyn: Int32Array.from(dyn),
    strip, ring, bed, revealEnd,
    stats: {tiles: n, dynTiles: dyn.length, buildMs: Math.round(performance.now() - tm0)},
  };
}

// ---- 外框传送带：周期=卷涡周期 81px 的石块带，整条平移取景（石块跟着图案走）----
function borderStrip(): HTMLCanvasElement {
  const NP = 26, SL = PER * NP;
  const pc = document.createElement('canvas');
  pc.width = SL; pc.height = BW;
  const pg = pc.getContext('2d', {willReadFrequently: true}) as Ctx;
  pg.fillStyle = PAL.bW; pg.fillRect(0, 0, SL, BW);
  pg.fillStyle = PAL.bK; pg.fillRect(0, 0, SL, 8); pg.fillRect(0, 66, SL, BW - 66);
  pg.strokeStyle = PAL.bK; pg.lineWidth = 13; pg.lineCap = 'round'; pg.lineJoin = 'round';
  for (let k = -1; k <= NP; k++) {
    const u0 = k * PER, cx = u0 + PER * 0.52, cy = 38, r0 = 24;
    pg.beginPath(); pg.moveTo(u0 - 6, 68); pg.quadraticCurveTo(u0 + 2, 42, cx - r0, cy);
    for (let th = Math.PI; th <= Math.PI * 3.25; th += 0.14) {
      const rr = r0 - (th - Math.PI) / (Math.PI * 2.25) * (r0 - 5);
      pg.lineTo(cx + Math.cos(th) * rr, cy + Math.sin(th) * rr);
    }
    pg.stroke();
  }
  const pd = pg.getImageData(0, 0, SL, BW).data;
  const cv = document.createElement('canvas');
  cv.width = SL; cv.height = BW;
  const g = cv.getContext('2d') as Ctx;
  g.fillStyle = `rgb(${PAL.grout[0]},${PAL.grout[1]},${PAL.grout[2]})`;
  g.fillRect(0, 0, SL, BW);
  const NR = 11, bs = BW / NR;
  for (let j = 0; j < NR; j++) {
    const rr = mulberry32(500 + j);
    const cnt = Math.round(PER / bs);
    const ws = Array.from({length: cnt}, () => 0.84 + rr() * 0.32);
    const sum = ws.reduce((a, b) => a + b, 0);
    const tiles: Array<[number, number, number[], number, number]> = [];
    let u = (j % 2) * bs * 0.5;
    ws.forEach((w0) => {
      const w = (w0 / sum) * PER;
      tiles.push([u, w, Array.from({length: 8}, () => (rr() - 0.5) * 1.4), (rr() - 0.5) * 0.12, (rr() - 0.5) * 14]);
      u += w;
    });
    for (let k = -1; k <= NP; k++) for (const [u0, w, jt, jl, ja] of tiles) {
      const x0 = k * PER + u0, y0 = j * bs, cx = x0 + w / 2, cy = y0 + bs / 2;
      if (cx < -w || cx > SL + w) continue;
      const o = (Math.min(BW - 1, cy | 0) * SL + Math.max(0, Math.min(SL - 1, cx | 0))) * 4;
      const f = 1 + jl;
      const col = [pd[o] * f + ja, pd[o + 1] * f + ja, pd[o + 2] * f + ja];
      const q = [[x0 + 0.9, y0 + 0.9], [x0 + w - 0.9, y0 + 0.9], [x0 + w - 0.9, y0 + bs - 0.9], [x0 + 0.9, y0 + bs - 0.9]]
        .map((p, i) => [p[0] + jt[i * 2] * 0.6, p[1] + jt[i * 2 + 1] * 0.6]);
      g.fillStyle = `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`;
      g.beginPath();
      q.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
      g.closePath(); g.fill();
      g.strokeStyle = `rgb(${Math.min(255, col[0] + 58) | 0},${Math.min(255, col[1] + 58) | 0},${Math.min(255, col[2] + 58) | 0})`;
      g.lineWidth = 1; g.beginPath(); g.moveTo(q[0][0], q[0][1]); g.lineTo(q[1][0], q[1][1]); g.stroke();
      g.strokeStyle = `rgb(${col[0] * 0.82 | 0},${col[1] * 0.82 | 0},${col[2] * 0.82 | 0})`;
      g.beginPath(); g.moveTo(q[3][0], q[3][1]); g.lineTo(q[2][0], q[2][1]); g.stroke();
    }
  }
  return cv;
}

// ---- 吠叫波 emblema 嵌片：<3 石宽的道具做成随手移动的小石拼片（RECON §04 可搬清单④）----
function ringSprite(): HTMLCanvasElement {
  const w = 96, h = 80, AX = 78, AY = 40;
  const fc = document.createElement('canvas');
  fc.width = w; fc.height = h;
  const fg = fc.getContext('2d', {willReadFrequently: true}) as Ctx;
  fg.lineCap = 'round';
  const arc = (col: string, lw: number): void => {
    fg.strokeStyle = col; fg.lineWidth = lw;
    for (const rr of [14, 27]) {
      fg.beginPath(); fg.arc(AX, AY, rr, Math.PI * 0.62, Math.PI * 1.38); fg.stroke();
    }
  };
  arc(PAL.outline, 14);
  arc(PAL.teeth, 9);
  const fd = fg.getImageData(0, 0, w, h).data;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d') as Ctx;
  const ts = 4.4, rr = mulberry32(91);
  for (let y = 0; y < h; y += ts) for (let x = ((y / ts) % 2) * ts * 0.5 - ts; x < w; x += ts) {
    const cx = x + ts / 2, cy = y + ts / 2;
    if (cx < 0 || cx >= w || cy >= h) continue;
    const o = ((cy | 0) * w + (cx | 0)) * 4;
    if (fd[o + 3] < 110) continue;
    const f = 1 + (rr() - 0.5) * 0.12;
    g.fillStyle = `rgb(${fd[o] * f | 0},${fd[o + 1] * f | 0},${fd[o + 2] * f | 0})`;
    g.fillRect(x + 0.6 + (rr() - 0.5) * 0.5, y + 0.6 + (rr() - 0.5) * 0.5, ts - 1.2, ts - 1.2);
  }
  return cv;
}

// ---- 编舞（帧号驱动，纯函数）----
const barkEnv = (f: number, t0: number, dur: number): number => {
  const q = (f - t0) / dur;
  return q > 0 && q < 1 ? Math.pow(Math.sin(Math.PI * q), 0.65) : 0;
};
export const jawAt = (f: number): number =>
  Math.min(1, barkEnv(f, 118, 20) + 0.8 * barkEnv(f, 200, 26) + barkEnv(f, 278, 32));
const borderPhase = (lt: number): number => {
  const lt0 = 71 / 30;
  return 15 * Math.max(0, lt - lt0) + PER * easeInOut((lt - 9.2) / 0.9);
};
const RINGS: Array<[number, number, number, number]> = [[121, 24, 70, 250], [203, 26, 80, 280], [282, 28, 90, 330], [291, 28, 90, 330]];

type Cam = {s: number; dx: number; dy: number};
const camera = (f: number): Cam => {
  let s = 1, dx = 0, dy = 0;
  if (f >= 200) s += 0.035 * Math.exp(-(f - 200) / 7);
  if (f >= 278) {
    s += 0.085 * Math.exp(-(f - 278) / 9);
    const amp = 3 * Math.exp(-(f - 278) / 5);
    dx = (hash1(f * 7.31) - 0.5) * 2 * amp;
    dy = (hash1(f * 3.77 + 9.1) - 0.5) * 2 * amp;
  }
  return {s, dx, dy};
};

// ---- 每帧：铺陈波（翻面转场）→ 光栅管线（双缓冲：只重取色）→ 传送带 → 嵌片 → 覆盖层 ----
export function drawFrame(c: Ctx, fRaw: number): void {
  const f = clamp(Math.round(fRaw), 1, TOTAL_FRAMES);
  const M = getMosaic();
  const lt = f / FPS;
  if (f <= M.revealEnd + PIPE_BLEND) drawReveal(c, f, M);
  if (f > M.revealEnd) {
    // 光栅层透明度：铺陈结束后 8 帧交叉淡入，之后恒 1
    drawPipeline(c, f, lt, clamp((f - M.revealEnd) / PIPE_BLEND, 0, 1));
  }
  drawOverlays(c, f);
  if (f > TOTAL_FRAMES - 6) {
    c.save();
    c.globalAlpha = ((f - (TOTAL_FRAMES - 6)) / 6) * 0.18;
    c.fillStyle = PAL.dogInk; c.fillRect(0, 0, W, H);
    c.restore();
  }
}

// 铺陈：底床＋逐块翻面（背/面交替），q>=1 为已落定石块
function drawReveal(c: Ctx, f: number, M: Mosaic): void {
  c.drawImage(M.bed, 0, 0);
  const n = M.n;
  for (let k = 0; k < n; k++) {
    const q = (f - REV.start - M.delay[k]) / REV.dur;
    if (q <= 0) continue;
    const cx = M.SX[k], cy = M.SY[k];
    if (q >= 1) {
      const o = k * 4;
      const sh = M.avgSh[k];
      c.beginPath();
      c.moveTo(M.QX[o], M.QY[o]); c.lineTo(M.QX[o + 1], M.QY[o + 1]);
      c.lineTo(M.QX[o + 2], M.QY[o + 2]); c.lineTo(M.QX[o + 3], M.QY[o + 3]);
      c.closePath();
      c.fillStyle = `rgb(${(M.TCr[k] * sh) >> 7},${(M.TCg[k] * sh) >> 7},${(M.TCb[k] * sh) >> 7})`;
      c.fill();
      continue;
    }
    // 翻面：水平压扁 cos(πq)，前半背(灰浆浅)后半面(石色)，边棱压暗
    const w = Math.abs(Math.cos(Math.PI * q));
    const front = q >= 0.5;
    const sh = front ? M.avgSh[k] : 255;
    const br = 0.55 + 0.45 * w;
    const base = front ? [(M.TCr[k] * sh) >> 7, (M.TCg[k] * sh) >> 7, (M.TCb[k] * sh) >> 7] : [150, 140, 126];
    const o = k * 4;
    c.beginPath();
    for (let i = 0; i < 4; i++) {
      const px = cx + (M.QX[o + i] - cx) * w, py = cy + (M.QY[o + i] - cy) * 0.98;
      if (i) c.lineTo(px, py); else c.moveTo(px, py);
    }
    c.closePath();
    c.fillStyle = `rgb(${base[0] * br | 0},${base[1] * br | 0},${base[2] * br | 0})`;
    c.fill();
  }
}

// 光栅管线：底稿→动态石块重取色→离屏 putImageData→drawImage（禁直写主 canvas：绕过镜头/转场裁剪）
function drawPipeline(c: Ctx, f: number, lt: number, ocAlpha: number): void {
  const M = getMosaic();
  const bg = M.bg;
  bg.setTransform(1, 0, 0, 1, 0, 0);
  bg.globalAlpha = 1;
  bg.drawImage(M.sb, 0, 0);
  paintFrescoFX(bg, lt + T0);
  const j = jawAt(f);
  paintDog(bg, j, -0.075 * j, 'art');
  const bd = bg.getImageData(0, 0, W, H).data;
  const dyn = M.dyn;
  // 逐块重取色（与第 0 帧同一公式：中心取色＋每块固定抖动——石块不动，颜色流过石块）
  for (let i = 0; i < dyn.length; i++) {
    const k = dyn[i], o = M.SIDX[k] * 4, fj = 1 + M.JL[k];
    M.TCr[k] = bd[o] * fj; M.TCg[k] = bd[o + 1] * fj; M.TCb[k] = bd[o + 2] * fj;
  }
  for (const R of M.rects) {
    const dd = R.img.data;
    let o2 = 0;
    for (let y = R.y; y < R.y + R.h; y++) {
      let p = y * W + R.x;
      for (let x = 0; x < R.w; x++, p++, o2 += 4) {
        const k = M.ID[p];
        if (k < 0) { const q = p * 4; dd[o2] = M.SO[q]; dd[o2 + 1] = M.SO[q + 1]; dd[o2 + 2] = M.SO[q + 2]; }
        else {
          const sh = M.SH[p];
          dd[o2] = (M.TCr[k] * sh) >> 7; dd[o2 + 1] = (M.TCg[k] * sh) >> 7; dd[o2 + 2] = (M.TCb[k] * sh) >> 7;
        }
        dd[o2 + 3] = 255;
      }
    }
    M.og.putImageData(R.img, R.x, R.y);
  }
  const cam = camera(f);
  c.save();
  c.translate(W / 2, H / 2); c.scale(cam.s, cam.s); c.translate(-W / 2 + cam.dx, -H / 2 + cam.dy);
  if (ocAlpha < 1) c.globalAlpha = ocAlpha;
  c.drawImage(M.oc, 0, 0);
  c.globalAlpha = 1;
  // 传送带：同一条周期石块带四边顺时针平移（相位匀速＋hero 走一个整周期）
  const off = ((borderPhase(lt) % PER) + PER) % PER;
  const beltA = clamp((f - M.revealEnd) / PIPE_BLEND, 0, 1);
  if (beltA > 0) {
    c.globalAlpha = beltA;
    for (const [a, b, c2, d, e, fl, len] of SIDES) {
      c.save(); c.transform(a, b, c2, d, e, fl);
      c.beginPath(); c.rect(BW, 0, len - 2 * BW, BW); c.clip();
      c.drawImage(M.strip, BW - 2 * PER + off, 0);
      c.restore();
    }
    c.globalAlpha = 1;
  }
  drawRings(c, f);
  c.restore();
}

function drawRings(c: Ctx, f: number): void {
  const M = getMosaic();
  for (const [f0, dur, r0, r1] of RINGS) {
    const q = (f - f0) / dur;
    if (q <= 0 || q >= 1) continue;
    const R = r0 + (r1 - r0) * q;
    const sc = R / 27;
    c.save();
    c.globalAlpha = (1 - q) * 0.9;
    c.translate(MOUTH[0], MOUTH[1]);
    c.rotate(-0.08 + q * 0.1);
    c.drawImage(M.ring, -78 * sc, -40 * sc, 96 * sc, 80 * sc);
    c.restore();
  }
}

// 覆盖层：题字（拍入）＋字幕带（ crisp，非马赛克层）
function drawOverlays(c: Ctx, f: number): void {
  // 题字
  if (f >= 12) {
    const born = f - 12;
    const sc = born === 0 ? 1.14 : born === 1 ? 1.05 : 1;
    const rot = born === 0 ? -0.05 : born === 1 ? -0.028 : -0.02;
    c.save();
    c.translate(960, 138); c.rotate(rot); c.scale(sc, sc);
    c.font = '900 72px "Noto Sans SC"';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineJoin = 'round';
    c.strokeStyle = PAL.outline; c.lineWidth = 10;
    c.strokeText('小心恶犬', 0, 0);
    c.fillStyle = PAL.teeth;
    c.fillText('小心恶犬', 0, 0);
    c.restore();
    if (born >= 4) {
      c.save();
      c.globalAlpha = clamp((born - 4) / 8, 0, 1);
      c.fillStyle = PAL.frameRed;
      c.fillRect(866, 182, 188, 6);
      c.font = '700 21px "Noto Sans SC"';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = '#6b5a48';
      c.fillText('C A V E   C A N E M · P O M P E I I', 960, 214);
      c.restore();
    }
  }
  // 字幕带
  const sub = SUBS.find((s) => f >= s.from && f <= s.to);
  if (sub) {
    c.save();
    c.font = '700 33px "Noto Sans SC"';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const tw = c.measureText(sub.text).width;
    const bx = 960, by = 1034;
    c.fillStyle = 'rgba(24,20,16,0.78)';
    c.beginPath();
    const rx = bx - tw / 2 - 26, ry = by - 27, rw = tw + 52, rh = 54, rr = 12;
    c.moveTo(rx + rr, ry);
    c.arcTo(rx + rw, ry, rx + rw, ry + rh, rr);
    c.arcTo(rx + rw, ry + rh, rx, ry + rh, rr);
    c.arcTo(rx, ry + rh, rx, ry, rr);
    c.arcTo(rx, ry, rx + rw, ry, rr);
    c.closePath(); c.fill();
    c.fillStyle = PAL.teeth;
    c.fillText(sub.text, bx, by + 1);
    c.restore();
  }
}
