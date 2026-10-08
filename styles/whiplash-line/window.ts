// ============================================================================
// window.ts — whiplash-line 拱形窗（内部天空/太阳升起/铅条随动/山丘/玻璃边带＋金框鞭线轮廓）
// 技法借鉴 huashu-art-motion（MIT）scenes/10_nouveau.js，Remotion/TSX 重写。签名①⑥。
// ============================================================================
import type {Pt} from './prims';
import {clamp01, outC, dense, spiralPts, partial, twoTone} from './prims';
import {PAL, GLASS_COLS, TAU, t2, WIN, CHOREO, STEM_CURL} from './tokens';

// ---- ② 拱形窗：内部（天空/太阳/铅条/山丘/玻璃边带）＋ 金框鞭线 ----
// ---- 拱窗辅助 ----
const archPath = (ins: number): Path2D => {
  const p = new Path2D();
  p.moveTo(WIN.x0 + ins, WIN.base - ins);
  p.lineTo(WIN.x0 + ins, WIN.cy);
  p.ellipse(WIN.cx, WIN.cy, WIN.rx - ins, WIN.ry - ins, 0, Math.PI, TAU);
  p.lineTo(WIN.x1 - ins, WIN.base - ins);
  p.closePath();
  return p;
};
const archLinePts = (ins: number): Pt[] => {
  const o: Pt[] = [];
  for (let y = WIN.base - ins; y > WIN.cy; y -= 5) o.push([WIN.x0 + ins, y]);
  for (let a = Math.PI; a <= TAU + 1e-6; a += 0.03) o.push([WIN.cx + Math.cos(a) * (WIN.rx - ins), WIN.cy + Math.sin(a) * (WIN.ry - ins)]);
  for (let y = WIN.cy; y < WIN.base - ins; y += 5) o.push([WIN.x1 - ins, y]);
  return o;
};
const archEdgePts = (ins: number): Pt[] => {
  const o: Pt[] = [];
  for (let y = WIN.base - ins; y > WIN.cy + 20; y -= 4) o.push([WIN.x0 + ins, y]);
  for (let a = Math.PI; a <= TAU + 1e-6; a += 0.02) o.push([WIN.cx + Math.cos(a) * (WIN.rx - ins), WIN.cy + Math.sin(a) * (WIN.ry - ins)]);
  for (let y = WIN.cy + 20; y < WIN.base - ins; y += 4) o.push([WIN.x1 - ins, y]);
  return o;
};
const hillPts = (y0: number, amp: number, ph: number): Pt[] => {
  const o: Pt[] = [];
  for (let x = WIN.x0 - 10; x <= WIN.x1 + 10; x += 10) {
    o.push([x, y0 + Math.sin(x * 0.016 + ph) * amp + Math.sin(x * 0.037 + ph * 2) * amp * 0.35]);
  }
  return o;
};
const HILLS: Array<[number, number, number, string]> = [
  [352, 13, 0.5, '#f2dd9c'], [376, 15, 2.2, '#efc39c'], [398, 13, 4.1, '#e6a7a0'], [420, 11, 1.3, '#a9cfa0'], [436, 8, 3.3, '#7fb5a8'],
];

export function drawWindow(g: CanvasRenderingContext2D, f: number, alpha: number) {
  if (alpha <= 0) return;
  const t = t2(f);
  g.save();
  g.globalAlpha = alpha;
  g.save();
  g.clip(archPath(30));
  const sg = g.createLinearGradient(0, 40, 0, 428);
  sg.addColorStop(0, '#86bfbd'); sg.addColorStop(0.6, '#b9d8b3'); sg.addColorStop(1, '#e9e2a8');
  g.fillStyle = sg;
  g.fillRect(WIN.x0 - 10, 30, WIN.x1 - WIN.x0 + 20, 400);
  // 太阳：从山后升起（按节奏）＋铅条光芒随日心随动
  const su = CHOREO.sun(f);
  const sx = WIN.cx, sy = 322 + (168 - 322) * su;
  g.strokeStyle = PAL.line;
  g.lineCap = 'round';
  const rot = t * 0.23;
  const ru = CHOREO.rays(f);
  if (ru > 0) {
    g.lineWidth = 2.6;
    g.globalAlpha = alpha * 0.9;
    for (let i = 0; i < 14; i++) {
      const a = Math.PI + ((i + 0.5) / 14) * Math.PI + Math.sin(rot * 2 + i) * 0.04 + rot * 0.25;
      g.beginPath();
      g.moveTo(sx + Math.cos(a) * 54, sy + Math.sin(a) * 54);
      g.lineTo(sx + Math.cos(a) * (54 + 190 * ru), sy + Math.sin(a) * (54 + 190 * ru));
      g.stroke();
    }
    g.lineWidth = 2;
    [[0.78, 96], [1.15, 128]].forEach(([e, r]) => {
      g.beginPath();
      g.ellipse(sx, sy, r * ru, r * e * 0.75 * ru, 0, Math.PI, TAU);
      g.stroke();
    });
    g.globalAlpha = alpha;
  }
  // 光晕环＋日盘
  g.fillStyle = PAL.sunHalo;
  g.beginPath(); g.arc(sx, sy, 52, 0, TAU); g.fill();
  g.strokeStyle = PAL.line; g.lineWidth = 2.6; g.stroke();
  const sunG = g.createRadialGradient(sx - 9, sy - 9, 4, sx, sy, 42);
  sunG.addColorStop(0, PAL.sun1); sunG.addColorStop(1, PAL.sun2);
  g.fillStyle = sunG;
  g.beginPath(); g.arc(sx, sy, 40, 0, TAU); g.fill();
  g.lineWidth = 2.6; g.stroke();
  // 山丘色带（挡住太阳下半）
  HILLS.forEach(([y0, amp, ph, col], i) => {
    const pts = hillPts(y0, amp, ph + Math.sin(t * 1.4 + i) * 0.12);
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(WIN.x0 - 10, 432);
    pts.forEach((p) => g.lineTo(p[0], p[1]));
    g.lineTo(WIN.x1 + 10, 432);
    g.closePath();
    g.fill();
    g.strokeStyle = PAL.line;
    g.lineWidth = 2.4;
    g.beginPath();
    pts.forEach((p, j) => (j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.stroke();
  });
  g.restore();
  // 彩色玻璃边带（沿拱内缘一格一色）
  const gu = CHOREO.glass(f);
  if (gu > 0) {
    g.save();
    g.globalAlpha = alpha * gu;
    g.clip(archPath(8));
    const pts = archEdgePts(14);
    let acc = 0, k = 0;
    g.lineWidth = 1;
    g.strokeStyle = PAL.line;
    for (let i = 1; i < pts.length; i++) {
      acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc >= 12) {
        acc = 0;
        const a = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]);
        g.save();
        g.translate(pts[i][0], pts[i][1]);
        g.rotate(a);
        g.fillStyle = GLASS_COLS[k++ % GLASS_COLS.length];
        g.fillRect(-4.6, -4.6, 9.2, 9.2);
        g.strokeRect(-4.6, -4.6, 9.2, 9.2);
        g.restore();
      }
    }
    g.restore();
  }
  // 窗台
  g.fillStyle = '#6b4a2e';
  g.fillRect(228, WIN.base, 428, 18);
  g.strokeStyle = PAL.line;
  g.lineWidth = 2;
  g.strokeRect(228, WIN.base, 428, 18);
  g.restore();
  // 金框鞭线：拱窗轮廓（签名①：根部粗/顶心细可变线宽）＋ 窗顶螺旋饰
  const au = CHOREO.arch(f);
  if (au > 0) {
    const breathe = Math.sin(t * 2.2) * 0.8;
    twoTone(g, partial(archLinePts(8), au), (q) => 5.4 + 7 * Math.pow(1 - q, 1.6) + breathe, PAL.gold, PAL.line, 2.2, 6);
  }
  const fu = CHOREO.finial(f);
  if (fu > 0) {
    twoTone(g, partial(STEM_CURL, fu), (q) => (4.5 - q * 2.6) + Math.sin(t * 3) * 0.5, PAL.gold, PAL.line, 2, 4);
  }
}

