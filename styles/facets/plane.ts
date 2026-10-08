// 「透明叠面」空间 —— facets 签名①。每块面一条线性渐变（三色标=混米白/原色/混深棕），α 0.18-0.7，
// 22 块手排大面（深褐族 ≥36%，INDEX「偏亮」短板修正）+ 桌下 9 片放射扇面（棕/暗灰交替）+
// 70 片随机 3/4 边形（深色加权）+ 肌理面（点画/排线/纸页）+ 9000 个布拉克短划砂纹 + 46 条 passage 直线。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）scenes/11_cubism.js 的 plane/wood 与叠面编成，TSX 重写非拷贝。
import {A, C, FIG, PROP, type CanvasCtx, type Pt} from './types';
import {hex2rgb, mix, mulberry32, rgba, clamp} from './rand';

export function poly(g: CanvasCtx, pts: Pt[]): void {
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.closePath();
}

const CREAM: [number, number, number] = [250, 244, 228];
const DARK: [number, number, number] = [45, 35, 25];

/** 一块「切面」：沿某方向从亮到暗的渐变叠面（立体主义的明暗切面）。 */
export function plane(g: CanvasCtx, pts: Pt[], col: string | [number, number, number], alpha: number, r: () => number, dark = 0.4, light = 0.25): void {
  const c0 = Array.isArray(col) ? col : hex2rgb(col);
  let a = pts[0];
  let b = pts[(r() * pts.length) | 0];
  if (a === b) b = pts[(pts.length / 2) | 0];
  const gr = g.createLinearGradient(a[0], a[1], b[0], b[1]);
  gr.addColorStop(0, rgba(mix(c0, CREAM, light), alpha));
  gr.addColorStop(0.55, rgba(c0, alpha));
  gr.addColorStop(1, rgba(mix(c0, DARK, dark), alpha));
  g.fillStyle = gr;
  poly(g, pts);
  g.fill();
}

/** 直线外轮廓：每段两端各外伸 ext（立体派的线常常画出界）。 */
export function segs(g: CanvasCtx, pts: Pt[], ext = 14, col = 'rgba(40,30,20,0.72)', w = 2.2): void {
  g.strokeStyle = col;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
    g.moveTo(a[0] - ux * ext, a[1] - uy * ext);
    g.lineTo(b[0] + ux * ext, b[1] + uy * ext);
  }
  g.stroke();
}

/** 仿木纹（布拉克的梳纹假木头）：沿长边 S 波浪线 + 过节疤高斯鼓包 + 4 圈椭圆节疤。 */
export function wood(g: CanvasCtx, x: number, y: number, w: number, h: number, vertical: boolean, seed: number, base: string = PROP.tableWood, dark: string = PROP.tableWoodD): void {
  const r = mulberry32(seed);
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.fillStyle = base;
  g.fillRect(x, y, w, h);
  g.strokeStyle = dark;
  const L = vertical ? h : w, S = vertical ? w : h;
  const kx = 0.35 + r() * 0.3, ky = 0.3 + r() * 0.4;
  for (let i = 0; i < S / 6; i++) {
    g.lineWidth = 0.8 + r() * 1.6;
    g.globalAlpha = 0.35 + r() * 0.4;
    g.beginPath();
    for (let s = 0; s <= L; s += 6) {
      const u = s / L;
      const off = i * 6 + Math.sin(u * 7 + i * 0.4) * 3 + 14 * Math.exp(-((u - kx) * (u - kx)) / 0.01) * Math.sign(i * 6 - S * ky);
      const X = vertical ? x + off : x + s;
      const Y = vertical ? y + s : y + off;
      if (s) g.lineTo(X, Y); else g.moveTo(X, Y);
    }
    g.stroke();
  }
  g.globalAlpha = 1;
  const kX = vertical ? x + S * ky : x + L * kx;
  const kY = vertical ? y + L * kx : y + S * ky;
  for (let k = 0; k < 4; k++) {
    g.lineWidth = 1.6;
    g.beginPath();
    g.ellipse(kX, kY, (vertical ? 6 : 16) + k * 5, (vertical ? 16 : 6) + k * 4, 0, 0, Math.PI * 2);
    g.stroke();
  }
  g.fillStyle = dark;
  g.beginPath();
  g.ellipse(kX, kY, vertical ? 4 : 10, vertical ? 10 : 4, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

// ---------- 手排大面（22 块；深褐族 brown/dbrown 8 块 = 36%，INDEX 短板修正） ----------
type BigPlane = [Pt[], string, number];
const BIG: BigPlane[] = [
  [[[0, 0], [300, 0], [160, 300], [0, 240]], C.grey, 0.5],
  [[[40, 0], [500, 0], [320, 100]], C.cream, 0.5],
  [[[0, 260], [180, 300], [90, 720], [0, 720]], C.dbrown, 0.55],
  [[[120, 380], [300, 430], [240, 600], [90, 540]], C.ochre, 0.45],
  [[[560, 0], [700, 0], [640, 220]], C.cream, 0.5],
  [[[600, 80], [830, 30], [740, 290], [580, 260]], C.bgrey, 0.45],
  [[[720, 0], [1020, 0], [900, 160], [800, 140]], C.grey, 0.4],
  [[[1020, 0], [1280, 0], [1280, 220], [1100, 170]], C.dbrown, 0.5],
  [[[880, 110], [1160, 210], [1080, 420], [840, 300]], C.grey, 0.4],
  [[[1140, 230], [1280, 190], [1280, 600], [1180, 590]], C.brown, 0.55],
  [[[560, 250], [780, 210], [810, 380], [590, 400]], C.grey, 0.45],
  [[[240, 370], [560, 400], [540, 600], [200, 620]], C.cream, 0.4],
  [[[460, 410], [580, 370], [610, 720], [420, 720]], C.brown, 0.5],
  [[[840, 400], [1050, 430], [1000, 720], [800, 720]], C.dbrown, 0.45],
  [[[0, 430], [260, 370], [280, 720], [0, 720]], C.ochre, 0.4],
  [[[380, 0], [600, 0], [550, 80], [400, 60]], C.ochre, 0.4],
  [[[1050, 410], [1280, 370], [1280, 720], [1000, 720]], C.brown, 0.5],
  [[[200, 50], [360, 30], [320, 200], [190, 170]], C.dgrey, 0.35],
  [[[660, 180], [760, 160], [780, 300], [680, 310]], C.dbrown, 0.4],
  [[[1080, 540], [1240, 510], [1280, 660], [1120, 680]], C.dgrey, 0.45],
  [[[340, 640], [560, 620], [580, 720], [360, 720]], C.dbrown, 0.5],
  [[[60, 160], [170, 140], [150, 330], [50, 350]], C.bgrey, 0.35],
];

/** 随机小面调色：深褐族加权 0.42（短板修正：不只靠大面，随机碎面也压暗）。 */
const SMALL_PAL = [C.cream, C.grey, C.ochre, C.bgrey, C.brown, C.dgrey, C.dbrown] as const;
function smallCol(r: number): string {
  const t = r;
  if (t < 0.14) return SMALL_PAL[0];
  if (t < 0.28) return SMALL_PAL[1];
  if (t < 0.44) return SMALL_PAL[2];
  if (t < 0.58) return SMALL_PAL[3];
  if (t < 0.74) return SMALL_PAL[4];
  if (t < 0.88) return SMALL_PAL[5];
  return SMALL_PAL[6];
}

/** 钩子大面（叠面 #4 赭色面加亮礼：f1-13 亮起 + 高光带扫过）。 */
export const HOOK_PLANE: Pt[] = [[120, 380], [300, 430], [240, 600], [90, 540]];

/** 底版全量绘制（静态内容 → 调用方缓存一次）。 */
export function backdrop(g: CanvasCtx): void {
  const r = mulberry32(1912);
  g.fillStyle = C.paper;
  g.fillRect(0, 0, 1280, 720);
  BIG.forEach(([pts, col, a]) => plane(g, pts, col, a, r));
  // 桌下放射扇面（棕/暗灰交替——比源配方 cream/brown 更深一档，短板修正）
  for (let i = 0; i < 9; i++) {
    const a0 = -Math.PI + 0.25 + i * 0.3, a1 = a0 + 0.16;
    plane(g, [[680, 724], [680 + Math.cos(a0) * 430, 724 + Math.sin(a0) * 360], [680 + Math.cos(a1) * 430, 724 + Math.sin(a1) * 360]], i % 2 ? C.brown : C.dgrey, 0.3, r, 0.5, 0.3);
  }
  // 70 片随机 3/4 边形（避开右上 CAFÉ 字区）
  for (let i = 0; i < 70; i++) {
    const cx = r() * 1280, cy = r() * 720, s = 42 + r() * 140, a0 = r() * Math.PI * 2;
    const n = r() < 0.6 ? 3 : 4;
    const pts: Pt[] = [];
    for (let k = 0; k < n; k++) {
      const a = a0 + (k / n) * Math.PI * 2 + (r() - 0.5) * 0.8;
      pts.push([cx + Math.cos(a) * s * (0.5 + r() * 0.6), cy + Math.sin(a) * s * (0.5 + r() * 0.6)]);
    }
    if (cx > 990 && cy < 160) continue;
    plane(g, pts, smallCol(r()), 0.18 + r() * 0.3, r);
  }
  // 点画肌理面 ×4
  ([[[640, 290], [740, 260], [726, 352], [660, 378]], [[1040, 280], [1150, 254], [1124, 348]], [[90, 250], [180, 284], [150, 380]], [[500, 470], [570, 462], [556, 550]]] as Pt[][]).forEach((pts) => {
    g.save();
    poly(g, pts);
    g.clip();
    g.fillStyle = 'rgba(40,30,20,0.45)';
    for (let y = 0; y < 720; y += 9) {
      for (let x = (y / 9 % 2) * 4.5; x < 1280; x += 9) {
        if (x < pts[0][0] - 140 || x > pts[0][0] + 180 || y < pts[0][1] - 140 || y > pts[0][1] + 180) continue;
        g.beginPath();
        g.arc(x, y, 1.6, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.restore();
  });
  // 排线肌理面 ×4
  ([[[700, 320], [810, 268], [826, 348], [730, 378]], [[28, 200], [76, 188], [56, 430], [16, 442]], [[830, 460], [896, 440], [884, 560]], [[410, 106], [476, 88], [470, 200]]] as Pt[][]).forEach((pts, k) => {
    g.save();
    poly(g, pts);
    g.clip();
    g.strokeStyle = 'rgba(50,38,26,0.45)';
    g.lineWidth = 1.2;
    g.beginPath();
    for (let d = -800; d < 800; d += 7) {
      g.moveTo(pts[0][0] + d, pts[0][1] - 200);
      g.lineTo(pts[0][0] + d + (k % 2 ? 200 : -80), pts[0][1] + 200);
    }
    g.stroke();
    g.restore();
  });
  // 左缘一页横线纸
  g.save();
  poly(g, [[0, 190], [70, 196], [48, 540], [0, 552]]);
  g.clip();
  g.fillStyle = 'rgba(236,227,207,0.7)';
  g.fillRect(0, 190, 76, 364);
  g.strokeStyle = 'rgba(60,45,30,0.4)';
  g.lineWidth = 1;
  g.beginPath();
  for (let y = 196; y < 548; y += 8) {
    g.moveTo(0, y);
    g.lineTo(72, y - 5);
  }
  g.stroke();
  g.restore();
  // 桌：木纹桌面 + 深色裙板 + 抽屉 + 菱形镶嵌 + 独脚
  g.save();
  poly(g, [[300, 588], [1240, 578], [1236, 614], [304, 622]]);
  g.clip();
  wood(g, 292, 572, 956, 56, false, 3, PROP.tableWood, PROP.tableWoodD);
  g.restore();
  g.strokeStyle = C.ink;
  g.lineWidth = 2.2;
  poly(g, [[300, 588], [1240, 578], [1236, 614], [304, 622]]);
  g.stroke();
  plane(g, [[308, 622], [1232, 614], [1226, 664], [314, 668]], PROP.apron, 0.95, r, 0.35, 0.15);
  g.fillStyle = PROP.drawer;
  g.fillRect(540, 624, 96, 26);
  g.strokeStyle = C.ink;
  g.lineWidth = 1.8;
  g.strokeRect(540, 624, 96, 26);
  g.fillStyle = '#efe6d0';
  g.beginPath();
  g.arc(588, 637, 4, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = PROP.diamond;
  poly(g, [[906, 618], [928, 640], [906, 662], [884, 640]]);
  g.fill();
  g.stroke();
  g.fillStyle = C.dbrown;
  poly(g, [[906, 640], [928, 640], [906, 662]]);
  g.fill();
  plane(g, [[700, 664], [744, 664], [752, 720], [694, 720]], C.brown, 0.6, r);
  // 咖啡杯碟（桌上，举走的杯不在——本片杯始终在桌上）
  g.fillStyle = FIG.saucer;
  g.beginPath();
  g.ellipse(968, 606, 40, 7, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = C.ink;
  g.lineWidth = 1.8;
  g.stroke();
  g.fillStyle = FIG.cup;
  poly(g, [[950, 584], [952, 604], [984, 604], [986, 584]]);
  g.fill();
  g.fillStyle = FIG.cupD;
  poly(g, [[968, 584], [986, 584], [984, 604], [968, 604]]);
  g.fill();
  g.strokeStyle = C.ink;
  g.lineWidth = 1.8;
  poly(g, [[950, 584], [952, 604], [984, 604], [986, 584]]);
  g.stroke();
  g.fillStyle = FIG.iris;
  g.beginPath();
  g.ellipse(968, 585, 16, 3.6, 0, 0, Math.PI * 2);
  g.fill();
  // 布拉克短划砂纹 ×9000（55% 米白 α0.28 / 45% 深棕 α0.18）
  for (let i = 0; i < 9000; i++) {
    const x = r() * 1280, y = r() * 720;
    g.fillStyle = r() < 0.55 ? 'rgba(246,238,220,0.28)' : 'rgba(50,38,26,0.18)';
    g.fillRect(x, y, 3 + r() * 5, 1.5);
  }
  // 贯穿细直线（passage）×46
  g.strokeStyle = 'rgba(40,30,20,0.55)';
  g.lineWidth = 1.3;
  for (let i = 0; i < 46; i++) {
    const x = r() * 1280, y = r() * 720, a = r() * Math.PI, L = 90 + r() * 380;
    if (x > 980 && y < 160) continue;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L);
    g.stroke();
  }
}

/** 钩子高光带（沿钩子大面扫过的一道亮渐变）。 */
export function hookSweep(g: CanvasCtx, f: number): void {
  const k = clamp((f - 1) / 26);
  if (k >= 1) return;
  const x0 = 60 + k * 320;
  const gr = g.createLinearGradient(x0 - 90, 0, x0 + 90, 0);
  gr.addColorStop(0, 'rgba(250,244,228,0)');
  gr.addColorStop(0.5, `rgba(250,244,228,${0.5 * (1 - k * 0.6)})`);
  gr.addColorStop(1, 'rgba(250,244,228,0)');
  g.save();
  poly(g, HOOK_PLANE);
  g.clip();
  g.fillStyle = gr;
  g.fillRect(0, 300, 420, 360);
  g.restore();
}

export {A};
