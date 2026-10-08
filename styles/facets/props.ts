// 咖啡馆道具 —— facets 签名④（模版字 destination-out 切断口）+ 签名⑤（一景四格错位取景）+ 吉他/报纸。
// 窗景缓存成比窗大的图，四格各自不同基準偏移 + 相位错动的滑动 = 同一窗景多视角拼合；
// CAFÉ 字 12fps 卡点跳换位（顺序表轮换），每步每字 y/旋转 hash 相位，destination-out 切出横竖断口
// （断口透出底下叠面，比画纸色条真实——配方原纪律）；报纸 8fps 微颤 + 折角翻动（定帧段微动效）；
// 吉他 = 木纹平涂进离屏 → facetize cell 26 → 直线外轮廓（按 8fps 沸腾步缓存）。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）scenes/11_cubism.js 的 windowPanes/cafe/news/wood，TSX 重写。
import {A, C, PROP, WIN, type CanvasCtx, type Pt} from './types';
import {clamp, easeOutCubic, hash2, lerp} from './rand';
import {layer} from './facetize';
import {plane, poly, segs, wood} from './plane';
import {FONT_SANS, FONT_SERIF} from './fonts';

// ---------- 窗景（缓存 420×400 大图：55 片蓝灰切面 + 3 条斜光束 + 铁塔 + 海鸥弧） ----------
let WIN_CACHE: HTMLCanvasElement | null = null;
function winScene(): HTMLCanvasElement {
  if (WIN_CACHE) return WIN_CACHE;
  const {cv, g} = layer('facets-win', 420, 400);
  const r = (() => {
    let s = 77 >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();
  g.fillStyle = '#9fb0bd';
  g.fillRect(0, 0, 420, 400);
  for (let i = 0; i < 55; i++) {
    const cx = r() * 420, cy = r() * 400, s = 30 + r() * 130, a0 = r() * Math.PI * 2;
    const pts: Pt[] = [0, 1, 2].map((k) => {
      const a = a0 + k * 2.1 + (r() - 0.5) * 0.6;
      return [cx + Math.cos(a) * s, cy + Math.sin(a) * s * (0.4 + r())];
    });
    plane(g, pts, WIN[(r() * WIN.length) | 0], 0.45 + r() * 0.4, r, 0.45, 0.35);
  }
  // 斜向长条光束
  ([[110, 0, 44], [170, 0, 22], [58, 88, 30]] as Array<[number, number, number]>).forEach(([x, y, w]) =>
    plane(g, [[x, y], [x + w, y], [x + w + 220, y + 310], [x + 220, y + 310]], '#e8ecec', 0.55, r, 0.3, 0.5));
  // 铁塔（右侧，碎成两段 + 交叉纹）
  const tx = 300;
  g.fillStyle = '#4a4c50';
  poly(g, [[tx - 5, 88], [tx + 5, 88], [tx + 11, 242], [tx - 11, 242]]);
  g.fill();
  poly(g, [[tx - 16, 242], [tx + 16, 242], [tx + 52, 406], [tx + 32, 406], [tx, 344], [tx - 32, 406], [tx - 52, 406]]);
  g.fill();
  g.strokeStyle = 'rgba(220,226,230,0.6)';
  g.lineWidth = 1;
  g.beginPath();
  for (let y = 250; y < 400; y += 8) {
    const w = 16 + (y - 242) * 0.17;
    g.moveTo(tx - w, y);
    g.lineTo(tx + w, y + 8);
    g.moveTo(tx + w, y);
    g.lineTo(tx - w, y + 8);
  }
  g.stroke();
  g.fillRect(tx - 34, 330, 68, 7);
  // 白色海鸥弧 ×4
  g.strokeStyle = '#f4f2ec';
  g.lineWidth = 3.4;
  g.lineCap = 'round';
  ([[300, 150], [326, 142], [284, 288], [312, 280]] as Array<[number, number]>).forEach(([x, y]) => {
    g.beginPath();
    g.arc(x, y + 13, 13, -2.6, -0.5);
    g.stroke();
  });
  WIN_CACHE = cv;
  return cv;
}

/** 窗格几何：外框 + 2×2 四格。 */
export const WIN_RECT = {x: 120, y: 72, w: 310, h: 310};
const PANES: Array<[number, number, number, number]> = [
  [126, 78, 147, 147], [277, 78, 147, 147], [126, 229, 147, 147], [277, 229, 147, 147],
];
/** 四格各自基准偏移（多视角拼合的「不同取景」本体；右列两格取景含铁塔与海鸥）+ 相位。 */
const PANE_BASE: Array<[number, number]> = [[132, 96], [240, 110], [128, 178], [238, 190]];

/** 一景四格错位取景（conv=0..1 收束系数：HERO 段滑动幅度收小、四格定格成多视角拼合）。 */
export function windowPanes(c: CanvasCtx, t: number, st: number, conv: number, appear: number): void {
  if (appear <= 0) return;
  const amp = lerp(12, 4, conv);
  c.save();
  c.globalAlpha = appear;
  PANES.forEach(([x, y, w, h], i) => {
    const dx = Math.sin(t * 9 + i * 1.7) * amp + (hash2(st, i, 71) - 0.5) * 4;
    const dy = Math.cos(t * 7 + i) * amp * 0.45;
    c.save();
    c.beginPath();
    c.rect(x, y, w, h);
    c.clip();
    c.drawImage(winScene(), PANE_BASE[i][0] + dx, PANE_BASE[i][1] + dy);
    // 每格一片自己滑动的半透明碎面
    const sx = x + ((t * 180 + i * 60) % (w + 90)) - 45;
    c.fillStyle = 'rgba(232,236,236,0.5)';
    poly(c, [[sx, y + 14 + i * 9], [sx + 52, y + 44], [sx + 8, y + 106]]);
    c.fill();
    c.strokeStyle = 'rgba(40,40,46,0.6)';
    c.lineWidth = 1.4;
    c.stroke();
    c.restore();
  });
  // 窗棂 + 外框
  c.strokeStyle = '#4a3420';
  c.lineWidth = 11;
  c.strokeRect(WIN_RECT.x - 4, WIN_RECT.y - 4, WIN_RECT.w + 8, WIN_RECT.h + 8);
  c.lineWidth = 7;
  c.beginPath();
  c.moveTo(275, 74);
  c.lineTo(275, 380);
  c.moveTo(122, 227);
  c.lineTo(428, 227);
  c.stroke();
  c.strokeStyle = C.ink;
  c.lineWidth = 1.6;
  c.strokeRect(WIN_RECT.x - 9, WIN_RECT.y - 9, WIN_RECT.w + 18, WIN_RECT.h + 18);
  // 窗台
  c.fillStyle = '#8a6a44';
  poly(c, [[108, 382], [444, 382], [438, 396], [114, 396]]);
  c.fill();
  c.strokeStyle = C.ink;
  c.lineWidth = 1.6;
  c.stroke();
  c.restore();
}

// ---------- CAFÉ 模版字（12fps 跳换位 + destination-out 断口） ----------
const ORDERS = ['CAFÉ', 'CAFÉ', 'ACFÉ', 'CAFÉ', 'CAÉF', 'CFAÉ', 'CAFÉ', 'CAFÉ', 'ACFÉ', 'CAFÉ'];
const CAFE_POS = {x: 520, y: 84, w: 300, h: 116};

export function cafeLetters(c: CanvasCtx, t: number, stCafe: number, appear: number): void {
  if (appear <= 0) return;
  const {cv, g} = layer('facets-cafe', CAFE_POS.w, CAFE_POS.h);
  const order = ORDERS[stCafe % ORDERS.length];
  const slots = [14, 82, 150, 218];
  g.font = '900 72px ' + FONT_SERIF;
  g.textBaseline = 'alphabetic';
  g.fillStyle = PROP.cafeInk;
  [...order].forEach((ch, i) => {
    const h = hash2(stCafe, i * 3 + 1, 81);
    const jy = (h - 0.5) * 18 - (i === 1 ? 6 : 0);
    const rot = (hash2(stCafe, i * 5 + 2, 82) - 0.5) * 0.22;
    g.save();
    g.translate(slots[i] + 30, 92 + jy);
    g.rotate(rot + (i === 2 ? -0.06 : 0));
    g.fillText(ch, -30, 0);
    g.restore();
  });
  // 模版字的断口（destination-out：横杠 + 竖缝，透出底下叠面）
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#000';
  ([[32, 44], [100, 66], [168, 50], [230, 60]] as Array<[number, number]>).forEach(([x, y], i) => {
    g.fillRect(x - 30 + ((i * 5) % 14), y, 64, 4.5);
    g.fillRect(x + 3, 30, 4, 72);
  });
  g.globalCompositeOperation = 'source-over';
  c.save();
  c.globalAlpha = appear;
  c.drawImage(cv, CAFE_POS.x, CAFE_POS.y);
  c.restore();
}

// ---------- 报纸 JOU（缓存小图 + 8fps 微颤 + 折角翻动） ----------
let NEWS_CACHE: HTMLCanvasElement | null = null;
function newsSheet(): HTMLCanvasElement {
  if (NEWS_CACHE) return NEWS_CACHE;
  const {cv, g} = layer('facets-news', 200, 128);
  g.fillStyle = PROP.newsPaper;
  g.fillRect(0, 0, 200, 128);
  g.strokeStyle = 'rgba(60,45,30,0.6)';
  g.lineWidth = 1;
  g.strokeRect(0.5, 0.5, 199, 127);
  g.fillStyle = PROP.newsInk;
  g.font = '700 52px ' + FONT_SERIF;
  g.textBaseline = 'alphabetic';
  g.fillText('JOU', 11, 54);
  g.fillRect(8, 62, 184, 2);
  g.font = '700 9px ' + FONT_SANS;
  g.fillText('LA BATAILLE', 9, 78);
  g.fillText("S'EST ENGAGÉ UN CHAT", 74, 78);
  g.fillRect(8, 84, 184, 1);
  g.fillStyle = PROP.newsFake;
  for (let col = 0; col < 3; col++) {
    for (let y = 90; y < 124; y += 5) {
      g.fillRect(9 + col * 62, y, 56 - ((y * 7 + col * 13) % 15), 1.6);
    }
  }
  g.strokeStyle = 'rgba(40,30,20,0.5)';
  g.beginPath();
  g.moveTo(70, 86);
  g.lineTo(70, 124);
  g.moveTo(132, 86);
  g.lineTo(132, 124);
  g.stroke();
  NEWS_CACHE = cv;
  return cv;
}

/** 报纸入场滑上桌 + 之后 8fps 微颤（定帧段微动效本体之一）。 */
export function newspaper(c: CanvasCtx, t: number, st: number, f: number): void {
  const k = easeOutCubic((f - A.NEWS_IN) / (A.NEWS_IN_END - A.NEWS_IN));
  if (k <= 0) return;
  const a = -0.12 + (hash2(st, 9, 91) - 0.5) * 0.025;
  const dx = (hash2(st, 4, 92) - 0.5) * 3;
  c.save();
  c.translate(lerp(160, 424, k) + dx, lerp(560, 618, k));
  c.rotate(a);
  c.drawImage(newsSheet(), -100, -64);
  // 翘起的折角（随帧翻动）
  const fl = 12 + Math.sin(t * 20) * 4;
  c.fillStyle = '#d8ceb4';
  poly(c, [[100, -64], [100 - fl, -64], [100, -64 + fl]]);
  c.fill();
  c.strokeStyle = 'rgba(40,30,20,0.6)';
  c.lineWidth = 1.2;
  c.stroke();
  c.restore();
  // 报纸下的两根支脚斜线
  c.strokeStyle = 'rgba(40,30,20,0.7)';
  c.lineWidth = 1.8;
  c.beginPath();
  c.moveTo(486, 640);
  c.lineTo(506, 668);
  c.moveTo(372, 668);
  c.lineTo(360, 690);
  c.stroke();
}

// ---------- 吉他（木纹平涂 → facetize cell 26 → 直线轮廓；按沸腾步缓存整层） ----------
const GUITAR_BOX: [number, number, number, number] = [76, 380, 246, 676];
let GUITAR_CACHE: {st: number; cv: HTMLCanvasElement} | null = null;

function guitarLayer(st: number): HTMLCanvasElement {
  if (GUITAR_CACHE && GUITAR_CACHE.st === st) return GUITAR_CACHE.cv;
  const {cv, g} = layer('facets-guitar');
  // 平涂：琴身（双腰）+ 音孔 + 琴颈 + 弦钮（木纹族 token）
  g.save();
  g.translate(161, 528);
  g.rotate(-0.24);
  g.fillStyle = PROP.guitarBase;
  g.beginPath();
  g.ellipse(0, 62, 54, 74, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(0, -18, 42, 50, 0, 0, Math.PI * 2);
  g.fill();
  wood(g, -60, -30, 120, 210, true, 5, PROP.guitarBase, PROP.guitarDark);
  g.fillStyle = PROP.guitarDeep;
  g.beginPath();
  g.arc(0, 26, 19, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = PROP.guitarDark;
  g.lineWidth = 3;
  g.beginPath();
  g.arc(0, 26, 23, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = PROP.guitarDark;
  g.fillRect(-7, -140, 14, 96);
  g.fillRect(-13, -164, 26, 26);
  g.strokeStyle = C.ink;
  g.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.moveTo(-5 + i * 2.5, -138);
    g.lineTo(-5 + i * 2.5, 88);
    g.stroke();
  }
  g.fillStyle = '#efe6d0';
  g.fillRect(-16, 88, 32, 7);
  g.restore();
  // 切面：cell 26 细切（三角画回主层，不垫底）
  facetizeGuitar(g, cv, st);
  GUITAR_CACHE = {st, cv};
  return cv;
}

function facetizeGuitar(g: CanvasCtx, src: HTMLCanvasElement, st: number): void {
  const [x0, y0, x1, y1] = GUITAR_BOX;
  const w = x1 - x0, h = y1 - y0;
  const cell = 26;
  const d = (src.getContext('2d') as CanvasCtx).getImageData(x0, y0, w, h).data;
  const nx = Math.ceil(w / cell), ny = Math.ceil(h / cell);
  let s = (31 + st * 13) >>> 0;
  const r = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pts: Pt[] = [];
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const k = j * (nx + 1) + i;
      pts.push([
        x0 + i * cell + (r() - 0.5) * cell * 0.85 + (hash2(k, st * 3 + 31, 111) - 0.5) * cell * 0.16,
        y0 + j * cell + (r() - 0.5) * cell * 0.85 + (hash2(k, st * 5 + 31, 222) - 0.5) * cell * 0.16,
      ]);
    }
  }
  const at = (x: number, y: number): [number, number, number, number] => {
    const ix = clamp(Math.round(x - x0), 0, w - 1), iy = clamp(Math.round(y - y0), 0, h - 1);
    const k = (iy * w + ix) * 4;
    return [d[k], d[k + 1], d[k + 2], d[k + 3]];
  };
  g.lineJoin = 'round';
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const P0 = pts[j * (nx + 1) + i], P1 = pts[j * (nx + 1) + i + 1], P2 = pts[(j + 1) * (nx + 1) + i], P3 = pts[(j + 1) * (nx + 1) + i + 1];
      const tris: Pt[][] = r() < 0.5 ? [[P0, P1, P3], [P0, P3, P2]] : [[P0, P1, P2], [P1, P3, P2]];
      tris.forEach((tri) => {
        const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3;
        const cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
        const sm = at(cx, cy);
        if (sm[3] < 120) return;
        const sh = 0.8 + r() * 0.38;
        const flick = hash2(i * 17 + j, st, 333) < 0.3 ? (hash2(i, j + st, 444) - 0.5) * 0.25 : 0;
        plane(g, tri, [sm[0] * sh * (1 + flick), sm[1] * sh * (1 + flick), sm[2] * sh * (1 + flick)], 0.92, r, 0.32, 0.24);
        g.strokeStyle = 'rgba(40,30,20,0.28)';
        g.lineWidth = 1;
        poly(g, tri);
        g.stroke();
      });
    }
  }
  // 直线外轮廓（端点外伸）
  segs(g, [[128, 402], [140, 448], [120, 500], [96, 570], [110, 640], [150, 668], [204, 650], [222, 590], [206, 520], [222, 460], [196, 408], [150, 396]], 9, 'rgba(40,30,20,0.7)', 2);
  segs(g, [[152, 400], [146, 430], [176, 434]], 6, 'rgba(40,30,20,0.7)', 1.8);
}

/** 吉他入场（pop：scale 0.94→1 + alpha）+ 之后按沸腾步缓存层 blit。 */
export function guitar(c: CanvasCtx, t: number, st: number, f: number): void {
  const k = easeOutCubic((f - A.GUITAR_IN) / (A.GUITAR_IN_END - A.GUITAR_IN));
  if (k <= 0) return;
  const cv = guitarLayer(st);
  c.save();
  c.globalAlpha = k;
  const sc = lerp(0.94, 1, k);
  c.translate(161, 528);
  c.scale(sc, sc);
  c.translate(-161, -528);
  c.drawImage(cv, 0, 0);
  c.restore();
  void t;
}

/** 定帧步冻结的 CAFÉ 字步进（定帧后字位锁定，微动效交给碎面/报纸/窗格）。 */
export function cafeStep(t: number): number {
  return Math.floor(Math.min(t, (A.FREEZE - 1) / 30) * 12);
}
