// ============================================================================
// marginalia.ts — 运行时动态层（每帧矢量重画；烘焙静态图之上）
// 签名②菱格压花（两族斜线各画两遍：暗线+错开 1.2px 亮线）＋签名③接缝（每 118×125px）
// 签名④匀速高光扫（920px scratch 渐变带斜率 0.45 → destination-in 乘烘焙掩膜 → lighter α0.62）
//   ＋经过判定 |u−sweepX|<70 出四角星；签名⑤页边母题（藤蔓/蜗牛 62px/s/老鼠 360px/1.05s 腿 40rad/s）
// 技法借鉴 huashu-art-motion 05_gothic（MIT），TSX/Remotion 重写；帧号驱动 + sin 相位，零随机运行时。
// ============================================================================
import {
  BLUE, clamp01, CAT_PAW, dot, F, GIRL, GOLD, HAIR_SPARK, INK, K_SLANT, LANCETS,
  lerpN, mulberry32, PANEL_PTS, RED, sweepXAt, W, H,
} from './world';

// ---- 菱格压花 + 接缝（签名②③；uSeam/uLine/uDot 三段进度，SC03 刻入动画用，之后恒 1）----
const LATTICE_S = 31; // 源 46px ×2/3，保持视觉密度
export function drawLattice(
  g: CanvasRenderingContext2D,
  uSeam: number,
  uLine: number,
  uDot: number,
) {
  g.save();
  g.beginPath();
  PANEL_PTS.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.closePath();
  g.clip();
  // ③ 接缝：每 118×125px 一条极淡拼贴线（金箔一片片贴）
  g.strokeStyle = `rgba(120,75,15,${(0.18 * uSeam).toFixed(3)})`;
  g.lineWidth = 1;
  for (let x = 219 + 118; x < 960; x += 118) {
    g.beginPath();
    g.moveTo(x, 150);
    g.lineTo(x + 2, 595);
    g.stroke();
  }
  for (let y = 262; y < 595; y += 125) {
    g.beginPath();
    g.moveTo(219, y);
    g.lineTo(960, y + 1.4);
    g.stroke();
  }
  // ② 两族斜线各画两遍：暗线 + 错开 1.2px 亮线＝刻进金里（族1 x+y=u，族2 x−y=u）
  const s = LATTICE_S;
  g.lineWidth = 1.2;
  const segs: Array<[number, number, number, number, number]> = [];
  for (let k = -30; k < 70; k++) {
    const u = k * s;
    segs.push([u - 900, 900, u + 900, -900, (k + 30) * 0.013]); // x+y=u 族
    segs.push([u - 900, -900, u + 900, 900, (k + 30) * 0.013 + 0.0065]); // x-y=u 族
  }
  for (const [x1, y1, x2, y2, ph] of segs) {
    const lu = clamp01((uLine - ph) / 0.45);
    if (lu <= 0) continue;
    const xe = lerpN(x1, x2, lu), ye = lerpN(y1, y2, lu);
    g.strokeStyle = 'rgba(110,66,10,0.55)';
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(xe, ye);
    g.stroke();
    g.strokeStyle = 'rgba(255,240,180,0.55)';
    g.beginPath();
    g.moveTo(x1 + 1.2, y1 + 1.2);
    g.lineTo(xe + 1.2, ye + 1.2);
    g.stroke();
  }
  // 菱心四点压印（左上亮右下暗；中心＝两族线的半格交错，与源片同构）
  for (let a = -14; a < 64; a++) {
    for (let b = -20; b < 26; b++) {
      const u = (a + 0.5) * s, v = (b + 0.5) * s;
      const x = (u + v) / 2, y = (u - v) / 2;
      if (x < 225 || x > 954 || y < 143 || y > 591) continue;
      if (uDot < mulberry32(a * 131 + b * 17 + 7)()) continue;
      for (const [dx, dy] of [[-3.4, 0], [3.4, 0], [0, -3.4], [0, 3.4]]) {
        g.fillStyle = 'rgba(255,245,200,0.7)';
        g.beginPath();
        g.arc(x + dx - 0.4, y + dy - 0.4, 1.3, 0, 7);
        g.fill();
        g.fillStyle = 'rgba(120,70,10,0.55)';
        g.beginPath();
        g.arc(x + dx + 0.5, y + dy + 0.5, 1, 0, 7);
        g.fill();
      }
    }
  }
  g.restore();
}

// ---- 彩窗闪烁（hash 点位 + sin 点亮；确定性）----
export function glassTwinkle(g: CanvasRenderingContext2D, t: number) {
  g.save();
  g.globalCompositeOperation = 'lighter';
  LANCETS.forEach((L, li) => {
    g.save();
    g.beginPath();
    g.moveTo(L.xl, L.yb);
    g.lineTo(L.xl, L.ys);
    g.arc(L.xl + L.r, L.ys, L.r, Math.PI, Math.PI * 1.5);
    g.arc(L.xr - L.r, L.ys, L.r, Math.PI * 1.5, 0);
    g.lineTo(L.xr, L.yb);
    g.closePath();
    g.clip();
    for (let k = 0; k < 40; k++) {
      const h = (Math.imul(k ^ 0x9e37, 0x85eb) ^ Math.imul(li + 3, 0xc2b2)) >>> 0;
      const h1 = (h % 1000) / 1000, h2 = ((h >>> 10) % 1000) / 1000;
      const x = (li ? 397 : 264) + h1 * 113, y = 200 + h2 * 153;
      const a = Math.max(0, Math.sin(t * 5 + h1 * 40));
      if (a < 0.6) continue;
      const gr = g.createRadialGradient(x, y, 0, x, y, 15);
      gr.addColorStop(0, `rgba(255,255,255,${((a - 0.6) * 1.1).toFixed(3)})`);
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(x - 15, y - 15, 30, 30);
    }
    g.restore();
  });
  g.restore();
}

// ---- 匀速高光扫（签名④核心）：scratch 渐变带 → destination-in 乘掩膜 → lighter α0.62 叠回 ----
let scratch: HTMLCanvasElement | null = null;
export function drawGoldSweep(g: CanvasRenderingContext2D, f: number, mask: HTMLImageElement | null) {
  if (!mask || !mask.complete || !mask.naturalWidth) return;
  if (!scratch) scratch = document.createElement('canvas');
  const sc = scratch;
  if (sc.width !== 920 || sc.height !== H) {
    sc.width = 920;
    sc.height = H;
  }
  const s = sc.getContext('2d')!;
  const xc = sweepXAt(f);
  const bx = Math.round(xc - 460);
  s.clearRect(0, 0, 920, H);
  s.globalCompositeOperation = 'source-over';
  const gr = s.createLinearGradient(460 - 170, 360 - 170 * K_SLANT, 460 + 170, 360 + 170 * K_SLANT);
  gr.addColorStop(0, 'rgba(255,240,190,0)');
  gr.addColorStop(0.25, 'rgba(255,236,170,0.32)');
  gr.addColorStop(0.47, 'rgba(255,252,230,0.85)');
  gr.addColorStop(0.53, 'rgba(255,252,230,0.85)');
  gr.addColorStop(0.75, 'rgba(255,236,170,0.32)');
  gr.addColorStop(1, 'rgba(255,240,190,0)');
  s.fillStyle = gr;
  s.fillRect(0, 0, 920, H);
  s.globalCompositeOperation = 'destination-in';
  s.drawImage(mask, bx, 0, 920, H, 0, 0, 920, H);
  s.globalCompositeOperation = 'source-over';
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = 0.62;
  g.drawImage(sc, 0, 0, 920, H, bx, 0, 920, H);
  g.restore();
}

// ---- 四角星闪光（经过判定 |u−sweepX|<70）----
export function glint(g: CanvasRenderingContext2D, x: number, y: number, s: number, a = 1) {
  if (s <= 0.02 || a <= 0.01) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = a;
  g.fillStyle = '#fff6d0';
  g.beginPath();
  g.moveTo(x, y - 12 * s);
  g.quadraticCurveTo(x, y, x + 12 * s, y);
  g.quadraticCurveTo(x, y, x, y + 12 * s);
  g.quadraticCurveTo(x, y, x - 12 * s, y);
  g.quadraticCurveTo(x, y, x, y - 12 * s);
  g.fill();
  g.globalAlpha = a * 0.5;
  g.beginPath();
  g.arc(x, y, 4 * s, 0, 7);
  g.fill();
  g.restore();
}
export const nearSweepLocal = (x: number, y: number, f: number) => {
  const u = x + K_SLANT * (y - 360);
  return clamp01(1 - Math.abs(u - sweepXAt(f)) / 70);
};
export function drawSparks(g: CanvasRenderingContext2D, f: number, points: Array<[number, number]>) {
  for (const [x, y] of points) {
    const n = nearSweepLocal(x, y, f);
    if (n > 0) glint(g, x, y, 0.4 + n * 0.8, n);
  }
}

// ---- 页边藤蔓（两茎摆动 + 三瓣常春藤叶/金球，签名⑤）----
const VINES: Array<Array<[number, number]>> = (() => {
  const L: Array<[number, number]> = [];
  for (let y = 20; y <= 660; y += 6) L.push([115 + 32 * Math.sin(y * 0.0188) + 12 * Math.sin(y * 0.0495 + 1), y]);
  const B: Array<[number, number]> = [];
  for (let x = 153; x <= 1267; x += 6) {
    B.push([x, 675 + 17 * Math.sin(x * 0.0165) + 7 * Math.sin(x * 0.0525 + 2) - (x > 1000 ? (x - 1000) * 0.09 : 0)]);
  }
  return [L, B];
})();
const LEAFCOL = [BLUE, RED, GOLD, BLUE, RED];
function ivy(g: CanvasRenderingContext2D, x: number, y: number, a: number, s: number, col: string) {
  g.save();
  g.translate(x, y);
  g.rotate(a);
  g.scale(s, s);
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(-7, -4, -10, -13);
  g.quadraticCurveTo(-4, -10, -1.4, -16);
  g.quadraticCurveTo(0, -21, 1.4, -16);
  g.quadraticCurveTo(4, -10, 10, -13);
  g.quadraticCurveTo(7, -4, 0, 0);
  g.closePath();
  g.fillStyle = col;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1.2 / s;
  g.stroke();
  g.restore();
}
export function vines(g: CanvasRenderingContext2D, t: number) {
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  VINES.forEach((pts, vi) => {
    const pp = pts.map((p, i) => [
      p[0] + Math.sin(t * 2.6 + i * 0.09 + vi) * 3.4,
      p[1] + Math.cos(t * 2.1 + i * 0.07) * 2.6,
    ] as [number, number]);
    g.strokeStyle = '#3a2416';
    g.lineWidth = 1.8;
    g.beginPath();
    pp.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.stroke();
    const r = mulberry32(31 + vi * 7);
    for (let i = 3, k = 0; i < pp.length - 3; i += 3 + ((r() * 3) | 0), k++) {
      const p = pp[i], q = pp[i + 1];
      const ta = Math.atan2(q[1] - p[1], q[0] - p[0]);
      const side = k % 2 ? 1 : -1;
      const na = ta + (side * (Math.PI / 2 - 0.5));
      const L2 = 12 + r() * 11;
      const sw = Math.sin(t * 3.6 + k * 1.7 + vi) * 0.42;
      const ex = p[0] + Math.cos(na + sw * 0.5) * L2;
      const ey = p[1] + Math.sin(na + sw * 0.5) * L2;
      g.strokeStyle = '#3a2416';
      g.lineWidth = 1.1;
      g.beginPath();
      g.moveTo(p[0], p[1]);
      g.quadraticCurveTo(p[0] + Math.cos(na) * L2 * 0.6 + side * 2.6, p[1] + Math.sin(na) * L2 * 0.6, ex, ey);
      g.stroke();
      if (r() < 0.62) ivy(g, ex, ey, na + Math.PI / 2 + sw, 0.75 + r() * 0.3, LEAFCOL[(k + vi) % 5]);
      else {
        dot(g, ex, ey, 3.6, GOLD, INK, 1);
        g.strokeStyle = '#3a2416';
        g.lineWidth = 0.8;
        for (let h = -1; h <= 1; h++) {
          const a2 = na + h * 0.6 + sw;
          g.beginPath();
          g.moveTo(ex + Math.cos(a2) * 4, ey + Math.sin(a2) * 4);
          g.lineTo(ex + Math.cos(a2) * 8.6, ey + Math.sin(a2) * 8.6);
          g.stroke();
        }
      }
    }
  });
  g.restore();
}

// ---- 蜗牛（62px/s 向左爬，触角晃；签名⑤）----
export function snail(g: CanvasRenderingContext2D, t: number) {
  const T0 = 44 / 30;
  const x = W + 30 - 62 * (t - T0);
  if (x < -90) return;
  const y = 693;
  const st = Math.sin(t * 6) * 2.6;
  g.save();
  g.lineJoin = 'round';
  F(g, '#aab6cc', INK, 1.6, () => {
    g.moveTo(x + 34, y + 17);
    g.lineTo(x - 36 - st, y + 17);
    g.quadraticCurveTo(x - 46 - st, y + 15, x - 41 - st, y + 4);
    g.quadraticCurveTo(x - 27, y + 3, x - 7, y + 8);
    g.lineTo(x + 34, y + 12);
    g.closePath();
  });
  g.strokeStyle = INK;
  g.lineWidth = 1.6;
  const ex = x - 39 - st;
  for (const [dx, dy] of [[-8, -20], [1.4, -23]]) {
    const wob = Math.sin(t * 8 + dx) * 2;
    g.beginPath();
    g.moveTo(ex + 2.6, y + 5);
    g.quadraticCurveTo(ex + dx * 0.5, y - 7, ex + dx + wob, y + dy);
    g.stroke();
    dot(g, ex + dx + wob, y + dy, 2.4, INK);
  }
  F(g, '#e3a447', INK, 2, () => g.arc(x + 2.6, y - 7, 23, 0, 7));
  g.strokeStyle = '#9a5a1a';
  g.lineWidth = 2;
  g.beginPath();
  for (let a = 0; a < 15; a += 0.2) {
    const r = 1.4 + a * 1.37;
    const px = x + 2.6 + Math.cos(a) * r, py = y - 7 + Math.sin(a) * r;
    if (a) g.lineTo(px, py);
    else g.moveTo(px, py);
  }
  g.stroke();
  g.restore();
}

// ---- 老鼠跑（360px/1.05s，腿 40rad/s；签名⑤；f289-320 窗口）----
export function runMouse(g: CanvasRenderingContext2D, f: number, t: number) {
  const q = clamp01((f - 289) / 31.5);
  if (q <= 0 || q >= 1) return;
  const x = lerpN(1260, 900, q), y = 599;
  const leg = Math.sin(t * 40);
  g.save();
  g.lineCap = 'round';
  g.fillStyle = 'rgba(80,50,20,0.18)';
  g.beginPath();
  g.ellipse(x, y + 8, 20, 3.4, 0, 0, 7);
  g.fill();
  g.strokeStyle = '#3a2a24';
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(x + 15, y);
  g.bezierCurveTo(x + 33, y - 8 + Math.sin(t * 14) * 4, x + 40, y + 7, x + 55, y - 3 + Math.sin(t * 14 + 1) * 4);
  g.stroke();
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x - 7, y + 3);
  g.lineTo(x - 11 - leg * 5, y + 8);
  g.moveTo(x + 8, y + 3);
  g.lineTo(x + 11 + leg * 5, y + 8);
  g.stroke();
  F(g, '#3e302c', INK, 1, () => g.ellipse(x, y - 1.4, 17, 8, 0, 0, 7));
  F(g, '#3e302c', INK, 1, () => {
    g.moveTo(x - 9, y - 7);
    g.quadraticCurveTo(x - 20, y - 5, x - 25, y + 1.4);
    g.quadraticCurveTo(x - 16, y + 4, x - 8, y + 4);
    g.closePath();
  });
  dot(g, x - 11, y - 8.6, 4, '#5a4640', INK, 0.8);
  dot(g, x - 20, y - 1.4, 1.1, '#fff');
  g.restore();
}

// ---- 猫爪挂鼠钟摆（0.32·sin(5.5t)；源片同参）----
export function catPendulum(g: CanvasRenderingContext2D, t: number) {
  const sw = Math.sin(t * 5.5) * 0.32;
  const ml = 37;
  const [px, py] = CAT_PAW;
  const mx = px + Math.sin(sw) * ml, my = py + Math.cos(sw) * ml;
  g.strokeStyle = '#6a4a40';
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(px, py + 4);
  g.quadraticCurveTo(px + Math.sin(sw) * 20 + 4, py + 20, mx, my - 8);
  g.stroke();
  g.save();
  g.translate(mx, my);
  g.rotate(-sw);
  F(g, '#4c3e38', INK, 1.4, () => g.ellipse(0, 4, 6.6, 11.4, 0, 0, 7));
  dot(g, -5.4, 13.4, 3.4, '#4c3e38', INK, 1);
  dot(g, 5.4, 13.4, 3.4, '#4c3e38', INK, 1);
  dot(g, 0, 16, 1.4, '#e8a0a0');
  g.strokeStyle = '#4c3e38';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-4, 2.6);
  g.lineTo(-8, 8 + Math.sin(t * 9) * 2);
  g.moveTo(4, 2.6);
  g.lineTo(8, 8 - Math.sin(t * 9) * 2);
  g.stroke();
  g.restore();
}

// ---- 少女动态：眨眼 / 光环随扫增亮 / 圣杯沿星 + 热气 ----
export function girlDyn(g: CanvasRenderingContext2D, f: number, t: number) {
  const blink = Math.max(0, Math.sin(t * 1.1 + 2)) > 0.985 || (f % 180) < 4;
  const [hx, hy] = GIRL.headC; // (897,322) 正面像
  if (blink) {
    for (const sd of [-1, 1]) {
      const ex = hx + sd * 10;
      g.fillStyle = '#f5dcc2';
      g.beginPath();
      g.ellipse(ex, hy + 2, 8, 5, 0, 0, 7);
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 1.6;
      g.beginPath();
      g.arc(ex, hy + 0.6, 4.4, 0.35, Math.PI - 0.35);
      g.stroke();
    }
  }
  // 光环随高光扫增亮（源片 halo hs 叠亮）
  const hs = nearSweepLocal(GIRL.haloC[0], GIRL.haloC[1], f);
  if (hs > 0) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = hs * 0.35;
    g.fillStyle = '#fff4c8';
    g.beginPath();
    g.arc(GIRL.haloC[0], GIRL.haloC[1], GIRL.haloR, 0, 7);
    g.fill();
    g.restore();
  }
  // 圣杯沿四角星呼吸闪
  const tw = Math.max(0, Math.sin(t * 7 + 1));
  glint(g, hx + 15, hy + 118, 0.5 + tw * 0.5, 0.35 + tw * 0.35); // 圣杯沿
  // 热气（细墨线三缕上升）
  g.save();
  g.globalAlpha = 0.55;
  g.strokeStyle = 'rgba(120,110,100,0.9)';
  g.lineWidth = 1.4;
  for (let k = 0; k < 3; k++) {
    g.beginPath();
    for (let s = 0; s <= 12; s++) {
      const q = s / 12;
      const x = hx + (k - 1) * 6 + Math.sin(q * 5 + t * 2.2 + k) * 4.6 * q;
      const y = hy + 122 - q * 42;
      if (s) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.stroke();
  }
  g.restore();
  // 金发验收帧呼吸微光（HAIR_SPARK 在 drawSparks 随高光带星闪；此处补待机微光让短板修正点常醒）
  const breath = 0.5 + 0.5 * Math.sin(t * 2.4);
  glint(g, HAIR_SPARK[0], HAIR_SPARK[1], 0.3 + breath * 0.25, 0.18 + breath * 0.14);
}
