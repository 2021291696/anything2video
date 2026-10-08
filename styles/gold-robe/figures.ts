// ============================================================================
// figures.ts — gold-robe 人物层（《吻》式相拥二人 v2 · 战役 4 批次④ D2）
// 管线（配方 18_klimt 照抄）：纹样先画满一张 Pattern 画布 → 按袍剪影【一次性 source-in】
//   （坑：逐个纹样 source-in 会互相清掉）→ 袍面 3px 深描边 → 写实的脸/手最后画。
// 150 个四类纹样（同心圆三色 / 深褐金螺旋 ±3rad/s / 荷鲁斯眼形眨 sin(2.2t+φ)>0.86 / 白点簇红心）
//   分布点用「袍内 isPointInPath 采样」生成——纹样只上身不出界（验收项）。
// 签名③平面装饰 vs 写实脸：袍面 3px 描边、纹样纯平面；脸径向渐变 4 色标 + blur 腮红眼窝 + 仅 1.2px 轮廓。
// 二人读法：她 = 大脸闭目仰向右上 + 金发披左 + 花冠；他 = 低头侧脸（额/鼻/唇小侧面）+ 深金发披后；
//   双手相握于胸前，袖口环（黑白格环带 + 开口椭圆）让手明确从袖口里长出来（短板修正）。
// hero 激活波：R(t) 从相握的手扩散，纹样 alive 系数 = smoothstep((R−dist)/50)——装饰先「平」后「活」。
// 技法借鉴 huashu-art-motion scenes/18_klimt.js (MIT, alchaincyf)，TS 重写零代码拷贝。
// ============================================================================
import {INK, BW, mulberry32, scratch, clamp01} from './gold';
import {goldTex, drawSweep} from './gold';

export const HER_FACE = {cx: 580, cy: 258, rx: 44, ry: 52, tilt: -0.18};
export const HIS_HEAD = {cx: 700, cy: 182, rx: 64, ry: 60};
export const HANDS = {x: 622, y: 430};
export const WAVE_FROM_T = 192 / 30;
export const WAVE_FULL_T = 285 / 30;
const WAVE_MAX = 390;

// ---- 袍剪影（大钟形 + 双袖；重叠无害，source-in 是并集）----
export const robePath = new Path2D();
robePath.moveTo(478, 650);
robePath.bezierCurveTo(458, 548, 462, 434, 496, 348);
robePath.bezierCurveTo(514, 300, 542, 262, 574, 240);
robePath.bezierCurveTo(582, 196, 612, 160, 650, 146);
robePath.bezierCurveTo(694, 130, 736, 146, 754, 186);
robePath.bezierCurveTo(770, 222, 772, 264, 762, 300);
robePath.bezierCurveTo(782, 336, 792, 396, 790, 452);
robePath.bezierCurveTo(846, 502, 848, 584, 826, 650);
robePath.closePath();

/** 沿折线生成变宽管形（袖子）：法向偏移拼多边形。 */
const tube = (pts: Array<[number, number]>, ws: number[]): Path2D => {
  const p = new Path2D();
  const left: Array<[number, number]> = [], right: Array<[number, number]> = [];
  pts.forEach(([x, y], i) => {
    const [px, py] = pts[Math.max(0, i - 1)], [nx, ny] = pts[Math.min(pts.length - 1, i + 1)];
    const dx = nx - px, dy = ny - py, L = Math.hypot(dx, dy) || 1;
    left.push([x + (-dy / L) * ws[i], y + (dx / L) * ws[i]]);
    right.push([x - (-dy / L) * ws[i], y - (dx / L) * ws[i]]);
  });
  p.moveTo(left[0][0], left[0][1]);
  left.forEach(([x, y], i) => i && p.lineTo(x, y));
  for (let i = right.length - 1; i >= 0; i--) p.lineTo(right[i][0], right[i][1]);
  p.closePath();
  return p;
};

// 他的近侧袖（右肩 → 相握的手）与她的近侧袖（左肩 → 搭在他的手背上）
export const SLEEVE_HIS = tube([[714, 288], [678, 358], [652, 404], [636, 422]], [34, 30, 26, 22]);
export const SLEEVE_HER = tube([[558, 312], [574, 358], [594, 400], [606, 416]], [24, 21, 18, 15]);
export const CUFF_HIS = {x: 632, y: 418, ang: Math.atan2(422 - 404, 636 - 652), sc: 1.3, hand: {x: 614, y: 438}};
export const CUFF_HER = {x: 602, y: 408, ang: Math.atan2(416 - 400, 606 - 594), sc: 1.05, hand: {x: 630, y: 424}};

// ---- 纹样分布：150 点袍内采样（拒收脸/手/头/袖口保护区）----
export type Motif = {x: number; y: number; k: number; s: number; ph: number; dist: number};
const inKeepout = (x: number, y: number) =>
  (x > 528 && x < 634 && y > 196 && y < 320) ||
  (x > 582 && x < 668 && y > 392 && y < 466) ||
  Math.hypot(x - HIS_HEAD.cx, y - HIS_HEAD.cy) < 84;
export const MOTIFS: Motif[] = (() => {
  const probe = document.createElement('canvas').getContext('2d')!;
  const r = mulberry32(71), o: Motif[] = [];
  let guard = 0;
  while (o.length < 150 && guard++ < 8000) {
    const x = 478 + r() * 324, y = 150 + r() * 500;
    if (inKeepout(x, y)) continue;
    if (!probe.isPointInPath(robePath, x, y)) continue;
    o.push({x, y, k: r(), s: 0.7 + r() * 0.6, ph: r() * 6.28, dist: Math.hypot(x - HANDS.x, y - HANDS.y)});
  }
  return o;
})();
/** hero 激活波半径：f192 从相握的手起，f285 盖满全袍。 */
export const waveR = (t: number) => clamp01((t - WAVE_FROM_T) / (WAVE_FULL_T - WAVE_FROM_T)) * WAVE_MAX;
export const aliveOf = (m: Motif, t: number) => {
  const a = clamp01((waveR(t) - m.dist) / 50);
  return a <= 0 ? 0 : a >= 1 ? 1 : a * a * (3 - 2 * a);
};

// ---- 纹样图元 ----
const CCOLS = [['#c03a2a', '#f4efe2', '#2a4a9a'], ['#2a4a9a', '#d6a845', '#c03a2a'], ['#6a3a8a', '#f4efe2', '#d6a845']];
const IRIS = ['#2a4a9a', '#2a7a5a', '#8a2a2a'];
const spiral = (g: CanvasRenderingContext2D, x: number, y: number, R: number, rot: number, col: string, lw = 2) => {
  g.strokeStyle = col; g.lineWidth = lw;
  g.beginPath();
  for (let a = 0; a < Math.PI * 5.2; a += 0.22) {
    const rr = R * a / (Math.PI * 5.2);
    const px = x + Math.cos(a + rot) * rr, py = y + Math.sin(a + rot) * rr;
    a ? g.lineTo(px, py) : g.moveTo(px, py);
  }
  g.stroke();
};
const eye = (g: CanvasRenderingContext2D, x: number, y: number, L: number, open: number, iris: string) => {
  const h = L * 0.42 * Math.max(0.08, open);
  g.fillStyle = '#f6f0e0'; g.strokeStyle = INK; g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x - L / 2, y);
  g.quadraticCurveTo(x, y - h * 2, x + L / 2, y);
  g.quadraticCurveTo(x, y + h * 2, x - L / 2, y);
  g.closePath(); g.fill(); g.stroke();
  if (open > 0.25) {
    g.save(); g.clip();
    g.fillStyle = iris; g.beginPath(); g.arc(x, y, L * 0.22, 0, Math.PI * 2); g.fill();
    g.fillStyle = INK; g.beginPath(); g.arc(x, y, L * 0.1, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  g.beginPath(); g.moveTo(x - L / 2 - 4, y);
  g.quadraticCurveTo(x, y - L * 0.42 * 2 - 3, x + L / 2 + 4, y);
  g.stroke();
};

/** 纹样整层：金箔底 + 他侧/下摆黑白竖块 + 150 四类纹样。alive 前装饰「平」（相位冻结），alive 后转/眨/换色/心跳。 */
export const paintPattern = (g: CanvasRenderingContext2D, t: number) => {
  g.drawImage(goldTex(), 0, 0);
  const r = mulberry32(77);
  for (let i = 0; i < 60; i++) {
    const rightSide = i < 34;
    const x = rightSide ? 700 + r() * 88 : 492 + r() * 330;
    const y = rightSide ? 320 + r() * 310 : 566 + r() * 76;
    const w = 10 + r() * 14, h = 26 + r() * 40;
    g.fillStyle = r() < 0.55 ? BW.blk : BW.wht;
    g.fillRect(x, y, w, h);
    g.strokeStyle = BW.trim; g.lineWidth = 2;
    g.strokeRect(x, y, w, h);
  }
  MOTIFS.forEach((m, i) => {
    const a = aliveOf(m, t);
    const s = m.s * (1 + 0.06 * a * Math.sin(3 * t + m.ph));
    if (m.k < 0.3) {
      const idx = a > 0.5 ? (i + Math.floor(t * 1.25)) % 3 : i % 3;
      const R = 16 * s;
      CCOLS[idx].forEach((col, j) => {
        g.fillStyle = col;
        g.beginPath(); g.arc(m.x, m.y, R * (1 - j * 0.3), 0, Math.PI * 2); g.fill();
      });
    } else if (m.k < 0.62) {
      g.fillStyle = '#3a2410';
      g.beginPath(); g.arc(m.x, m.y, 15 * s, 0, Math.PI * 2); g.fill();
      spiral(g, m.x, m.y, 13 * s, m.ph + (a > 0.15 ? 1 : 0) * t * 3 * (i % 2 ? 1 : -1), '#f2cf6a', 2);
    } else if (m.k < 0.84) {
      const bl = Math.sin(t * 2.2 + m.ph * 3);
      const open = a > 0.2 && bl > 0.86 ? clamp01(1 - (bl - 0.86) / 0.07) : 1;
      eye(g, m.x, m.y, 34 * s, open, IRIS[i % 3]);
    } else {
      g.fillStyle = '#f4efe2';
      for (let j = 0; j < 5; j++) {
        g.beginPath();
        g.arc(m.x + Math.cos(j * 1.26) * 9 * s, m.y + Math.sin(j * 1.26) * 9 * s, 3.2 * s, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#c03a2a';
      g.beginPath();
      g.arc(m.x, m.y, 4 * s * (1 + 0.35 * a * Math.max(0, Math.sin(6 * t + m.ph))), 0, Math.PI * 2);
      g.fill();
    }
  });
};

// ---- 袖口环（短板修正：手与袖接缝处画环带 + 开口椭圆，手明确从袖口里出来）----
const paintCuff = (g: CanvasRenderingContext2D, c: typeof CUFF_HIS) => {
  const {sc} = c;
  const bx = c.x + Math.cos(c.ang + Math.PI) * 10 * sc, by = c.y + Math.sin(c.ang + Math.PI) * 10 * sc;
  g.save();
  g.translate(bx, by);
  g.rotate(c.ang);
  g.fillStyle = BW.blk;
  g.fillRect(-18 * sc, -6.5 * sc, 36 * sc, 13 * sc);
  g.save();
  g.beginPath(); g.rect(-18 * sc, -6.5 * sc, 36 * sc, 13 * sc); g.clip();
  g.fillStyle = BW.wht;
  for (let k = 0; k < 8; k++) g.fillRect(-18 * sc + (k % 4) * 9 * sc + (((k / 4) | 0) % 2) * 4.5 * sc, -6.5 * sc + ((k / 4) | 0) * 7 * sc, 4.5 * sc, 4.5 * sc);
  g.restore();
  g.strokeStyle = BW.trim; g.lineWidth = 1.6;
  g.strokeRect(-18 * sc, -6.5 * sc, 36 * sc, 13 * sc);
  g.restore();
  g.save();
  g.translate(c.x, c.y);
  g.rotate(c.ang);
  g.fillStyle = '#2a1a0a';
  g.beginPath(); g.ellipse(0, 0, 14 * sc, 9 * sc, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = INK; g.lineWidth = 2; g.stroke();
  g.restore();
};

// ---- 写实的脸与手（径向渐变 4 色标 + blur 腮红眼窝 + 仅 1.2px 轮廓）----
const skinFill = (g: CanvasRenderingContext2D, cx: number, cy: number, R: number, ldx = -0.35, ldy = -0.4, deep = '#b07a5e') => {
  const gr = g.createRadialGradient(cx + R * ldx, cy + R * ldy, R * 0.08, cx, cy, R * 1.38);
  gr.addColorStop(0, '#fceee2'); gr.addColorStop(0.48, '#f2d2ba'); gr.addColorStop(0.82, '#d9a98c'); gr.addColorStop(1, deep);
  return gr;
};
const faceP = new Path2D();
faceP.ellipse(HER_FACE.cx, HER_FACE.cy, HER_FACE.rx, HER_FACE.ry, HER_FACE.tilt, 0, Math.PI * 2);

const neckP = new Path2D('M 582 294 C 582 312 587 324 599 328 L 614 318 C 603 312 598 303 598 292 Z');
const hairP = new Path2D('M 566 220 C 534 226 510 256 502 292 C 496 324 502 350 514 362 C 530 356 540 332 546 302 C 552 272 558 242 566 228 Z');

const drawFace = (g: CanvasRenderingContext2D) => {
  g.fillStyle = skinFill(g, 564, 238, 44);
  g.fill(faceP);
  g.save();
  g.clip(faceP);
  g.filter = 'blur(8px)';
  // 眼窝阴影（blur）
  g.fillStyle = 'rgba(150,90,70,.32)';
  g.beginPath(); g.ellipse(558, 254, 13, 8, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(602, 249, 13, 8, 0, 0, Math.PI * 2); g.fill();
  // 腮红（blur）
  g.fillStyle = 'rgba(230,115,105,.4)';
  g.beginPath(); g.ellipse(550, 286, 15, 10, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(608, 280, 15, 10, 0, 0, Math.PI * 2); g.fill();
  // 唇下影 + 鼻侧影
  g.fillStyle = 'rgba(150,90,70,.26)';
  g.beginPath(); g.ellipse(590, 314, 13, 7, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(596, 276, 5, 14, 0.15, 0, Math.PI * 2); g.fill();
  g.filter = 'none';
  g.restore();
  // 闭眼（向下弯的睫线 = 安眠的眼，《吻》女子闭目）
  g.strokeStyle = '#3a2216'; g.lineWidth = 2.6; g.lineCap = 'round';
  g.beginPath(); g.moveTo(547, 267); g.quadraticCurveTo(559, 276, 571, 267); g.stroke();
  g.beginPath(); g.moveTo(589, 263); g.quadraticCurveTo(601, 272, 613, 263); g.stroke();
  // 睫毛（外角两根）
  g.lineWidth = 1.7;
  g.beginPath(); g.moveTo(549, 269); g.lineTo(544, 275); g.stroke();
  g.beginPath(); g.moveTo(553, 271); g.lineTo(549, 277); g.stroke();
  g.beginPath(); g.moveTo(611, 265); g.lineTo(616, 271); g.stroke();
  g.beginPath(); g.moveTo(607, 267); g.lineTo(611, 273); g.stroke();
  // 眼睑折痕（淡弧）
  g.strokeStyle = 'rgba(150,90,70,.5)'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(551, 260); g.quadraticCurveTo(560, 265, 569, 260); g.stroke();
  g.beginPath(); g.moveTo(593, 256); g.quadraticCurveTo(602, 261, 611, 256); g.stroke();
  // 眉（柔弧）
  g.strokeStyle = 'rgba(110,72,36,.75)'; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(543, 252); g.quadraticCurveTo(558, 243, 573, 248); g.stroke();
  g.beginPath(); g.moveTo(585, 247); g.quadraticCurveTo(600, 239, 615, 244); g.stroke();
  // 鼻（侧影 + 鼻头/鼻翼）
  g.strokeStyle = 'rgba(150,90,70,.45)'; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(588, 266); g.quadraticCurveTo(593, 278, 591, 286); g.stroke();
  g.beginPath(); g.moveTo(591, 286); g.quadraticCurveTo(587, 291, 582, 289); g.stroke();
  // 唇（丘比特弓 + 唇缝）
  g.fillStyle = '#c23a44';
  g.beginPath();
  g.moveTo(578, 298);
  g.quadraticCurveTo(583, 293, 588, 296);
  g.quadraticCurveTo(592, 293, 598, 297);
  g.quadraticCurveTo(599, 303, 593, 306);
  g.quadraticCurveTo(585, 308, 578, 298);
  g.closePath(); g.fill();
  g.strokeStyle = 'rgba(110,30,36,.7)'; g.lineWidth = 1.1;
  g.beginPath(); g.moveTo(579, 299); g.quadraticCurveTo(588, 303, 597, 298); g.stroke();
  // 仅 1.2px 淡轮廓（与袍 3px 对比）
  g.strokeStyle = 'rgba(120,80,40,.4)'; g.lineWidth = 1.2;
  g.stroke(faceP);
};

const drawNeck = (g: CanvasRenderingContext2D) => {
  g.fillStyle = skinFill(g, 590, 312, 24, -0.4, -0.6);
  g.fill(neckP);
  g.save();
  g.clip(neckP);
  g.filter = 'blur(6px)';
  g.fillStyle = 'rgba(120,70,50,.34)';
  g.beginPath(); g.ellipse(600, 300, 20, 8, 0, 0, Math.PI * 2); g.fill();
  g.filter = 'none';
  g.restore();
  g.strokeStyle = 'rgba(120,80,40,.4)'; g.lineWidth = 1.2;
  g.stroke(neckP);
};

const drawHair = (g: CanvasRenderingContext2D, t: number) => {
  const gr = g.createLinearGradient(552, 224, 502, 358);
  gr.addColorStop(0, '#f2d084'); gr.addColorStop(0.5, '#d0a03e'); gr.addColorStop(1, '#96681f');
  g.fillStyle = gr;
  g.fill(hairP);
  g.strokeStyle = 'rgba(110,74,18,.6)'; g.lineWidth = 1.3;
  for (let k = 0; k < 4; k++) {
    g.beginPath();
    const sway = Math.sin(t * 0.9 + k * 2.1) * 2;
    g.moveTo(548 - k * 3, 234 + k * 5);
    g.quadraticCurveTo(514 + sway, 280 + k * 7, 510 + sway, 344 + k * 5);
    g.stroke();
  }
  spiral(g, 514, 344, 12, 0.5 + t * 0.15, 'rgba(130,90,25,.7)', 1.3);
};

const WREATH: Array<[number, number]> = [[544, 230], [559, 219], [576, 213], [594, 216], [610, 226]];
const FCOL = [['#d8402a', '#f4d65a'], ['#3a5ab0', '#f2eee0'], ['#f2eee0', '#d8402a'], ['#8a4ab0', '#f4d65a'], ['#e08aa0', '#3a5ab0']];
const drawWreath = (g: CanvasRenderingContext2D, t: number) => {
  WREATH.forEach(([x, y], k) => {
    const fc = FCOL[k % 5], rr = 10;
    g.save();
    g.translate(x, y);
    g.rotate(t * 0.4 + k);
    g.fillStyle = fc[0];
    for (let j = 0; j < 5; j++) {
      g.beginPath();
      g.arc(Math.cos(j * 1.256) * rr * 0.6, Math.sin(j * 1.256) * rr * 0.6, rr * 0.5, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = fc[1];
    g.beginPath(); g.arc(0, 0, rr * 0.35, 0, Math.PI * 2); g.fill();
    g.restore();
  });
};

const drawBangs = (g: CanvasRenderingContext2D) => {
  g.save();
  g.clip(faceP);
  const gr = g.createLinearGradient(0, 200, 0, 240);
  gr.addColorStop(0, '#e8c06a'); gr.addColorStop(1, 'rgba(200,154,58,0)');
  g.fillStyle = gr;
  g.beginPath(); g.ellipse(HER_FACE.cx, 204, 50, 30, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(150,104,26,.5)'; g.lineWidth = 1.2;
  for (let k = 0; k < 3; k++) {
    g.beginPath();
    g.moveTo(562 + k * 13, 210);
    g.quadraticCurveTo(564 + k * 13, 220, 560 + k * 13, 228);
    g.stroke();
  }
  g.restore();
};

/** 他的头：低头侧脸（额/闭眼/鼻/唇/下巴小侧面）+ 深金发披后 + 花叶——朝向她俯身。 */
const drawHisHead = (g: CanvasRenderingContext2D) => {
  // 发披后（先画，压在袍兜帽上）
  const hairP2 = new Path2D('M 640 202 C 626 162 646 124 690 114 C 734 104 762 134 764 172 C 766 212 756 248 732 266 C 716 277 698 275 690 264 C 700 248 702 228 696 212 C 682 205 656 205 640 202 Z');
  const hg = g.createLinearGradient(668, 116, 742, 262);
  hg.addColorStop(0, '#d0a03e'); hg.addColorStop(0.55, '#a06e22'); hg.addColorStop(1, '#5f3c10');
  g.fillStyle = hg;
  g.fill(hairP2);
  g.strokeStyle = 'rgba(70,44,10,.55)'; g.lineWidth = 1.4;
  for (let k = 0; k < 4; k++) {
    g.beginPath();
    g.moveTo(664 + k * 14, 124);
    g.quadraticCurveTo(706 + k * 10, 150 + k * 6, 724 + k * 6, 230 + k * 6);
    g.stroke();
  }
  // 发间花叶（常春藤 + 小花，《吻》男子发间语言）
  const leaves: Array<[number, number, number]> = [[664, 122, -0.5], [692, 114, 0.2], [720, 122, 0.7], [742, 146, 1.1], [748, 186, 1.5]];
  leaves.forEach(([x, y, rot]) => {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = '#5a6a2a';
    g.beginPath(); g.ellipse(0, 0, 9, 4.5, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(40,50,14,.7)'; g.lineWidth = 1; g.stroke();
    g.restore();
  });
  [[676, 120, 0], [730, 138, 1]].forEach(([x, y, k]) => {
    const fc = FCOL[k as number];
    g.fillStyle = fc[0];
    g.beginPath(); g.arc(x, y, 5.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = fc[1];
    g.beginPath(); g.arc(x, y, 2, 0, Math.PI * 2); g.fill();
  });
  // 侧脸小面（皮肤）：额 → 闭眼睫 → 鼻 → 唇 → 下巴，朝左下俯向她
  const profP = new Path2D('M 648 192 C 640 196 636 202 636 208 C 636 214 638 218 636 224 C 634 230 632 234 636 238 C 640 242 646 242 650 240 C 652 246 658 250 666 250 C 676 250 684 244 686 236 C 688 224 686 210 680 200 C 670 192 656 188 648 192 Z');
  g.fillStyle = skinFill(g, 668, 216, 30, -0.5, -0.2);
  g.fill(profP);
  // 闭眼 + 眉（他在她发间，眼帘安放）
  g.strokeStyle = '#3a2216'; g.lineWidth = 2; g.lineCap = 'round';
  g.beginPath(); g.moveTo(640, 212); g.quadraticCurveTo(648, 217, 656, 214); g.stroke();
  g.strokeStyle = 'rgba(110,72,36,.8)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(638, 204); g.quadraticCurveTo(646, 200, 654, 202); g.stroke();
  // 鼻/唇折线（侧面剪影内收）
  g.strokeStyle = 'rgba(150,90,70,.5)'; g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(636, 224); g.quadraticCurveTo(634, 232, 638, 237); g.stroke();
  g.beginPath(); g.moveTo(640, 240); g.quadraticCurveTo(645, 243, 650, 241); g.stroke();
  g.strokeStyle = 'rgba(120,80,40,.45)'; g.lineWidth = 1.2;
  g.stroke(profP);
};

const drawHands = (g: CanvasRenderingContext2D) => {
  // 他的手（下，稍大，指沟三条）
  const handHis = new Path2D('M 596 436 C 594 425 603 416 616 416 C 629 416 638 425 638 436 C 638 446 629 454 616 454 C 605 454 598 447 596 436 Z');
  g.fillStyle = skinFill(g, 616, 436, 17, -0.3, -0.5, '#a86e52');
  g.fill(handHis);
  g.strokeStyle = 'rgba(120,80,40,.55)'; g.lineWidth = 1.2; g.stroke(handHis);
  g.strokeStyle = 'rgba(150,90,70,.5)'; g.lineWidth = 1.1;
  g.beginPath(); g.moveTo(606, 422); g.quadraticCurveTo(608, 434, 606, 448); g.stroke();
  g.beginPath(); g.moveTo(615, 420); g.quadraticCurveTo(617, 433, 615, 450); g.stroke();
  g.beginPath(); g.moveTo(624, 421); g.quadraticCurveTo(626, 433, 624, 449); g.stroke();
  // 她的手搭在他的手背上（投影 + 指沟）
  g.save();
  g.filter = 'blur(3px)';
  g.fillStyle = 'rgba(120,70,50,.32)';
  g.beginPath(); g.ellipse(634, 424, 17, 7, 0, 0, Math.PI * 2); g.fill();
  g.filter = 'none';
  g.restore();
  const handHer = new Path2D('M 614 420 C 614 411 621 405 632 405 C 643 405 650 411 650 420 C 650 429 643 435 632 435 C 623 435 616 429 614 420 Z');
  g.fillStyle = skinFill(g, 632, 420, 13, -0.3, -0.5);
  g.fill(handHer);
  g.strokeStyle = 'rgba(120,80,40,.55)'; g.lineWidth = 1.2; g.stroke(handHer);
  g.strokeStyle = 'rgba(150,90,70,.5)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(624, 409); g.quadraticCurveTo(626, 419, 624, 430); g.stroke();
  g.beginPath(); g.moveTo(633, 407); g.quadraticCurveTo(635, 417, 633, 431); g.stroke();
  g.beginPath(); g.moveTo(642, 409); g.quadraticCurveTo(644, 418, 642, 429); g.stroke();
};

/** 袍合成：剪影填底 → 纹样一次性 source-in → 袖口提亮 → 袍内流光 → 3px 深描边 → 袖口环。返回成品位图。 */
export const paintRobe = (t: number, sx: number): HTMLCanvasElement => {
  const rg = scratch('gr_robe');
  const pat = scratch('gr_pat');
  paintPattern(pat, t);
  rg.fillStyle = '#000';
  [robePath, SLEEVE_HIS, SLEEVE_HER].forEach((p) => rg.fill(p));
  rg.globalCompositeOperation = 'source-in';
  rg.drawImage(pat.canvas, 0, 0);
  rg.globalCompositeOperation = 'source-over'; // ⚠ source-in 一次性贴完立即恢复；残留 source-in 时后续描边会把整层擦成线
  // 袖子提亮 + 折线（让袖管从袍身上分离出来）
  rg.save();
  rg.globalCompositeOperation = 'lighter';
  rg.fillStyle = 'rgba(255,238,170,0.2)';
  rg.fill(SLEEVE_HIS);
  rg.fill(SLEEVE_HER);
  rg.restore();
  rg.strokeStyle = 'rgba(90,55,10,.4)';
  rg.lineWidth = 1.6;
  [[714, 292, 676, 362], [706, 300, 668, 372], [558, 318, 574, 364], [566, 326, 582, 372]].forEach(([x1, y1, x2, y2]) => {
    rg.beginPath(); rg.moveTo(x1, y1); rg.quadraticCurveTo((x1 + x2) / 2 - 6, (y1 + y2) / 2, x2, y2); rg.stroke();
  });
  if (sx > -9000) drawSweep(rg, t, sx + 260, 'source-atop'); // 袍内流光：atop 只落在袍面（角色自然挡住的外面不画）
  rg.globalCompositeOperation = 'source-over';
  rg.strokeStyle = INK;
  rg.lineWidth = 3;
  rg.lineJoin = 'round';
  [SLEEVE_HIS, SLEEVE_HER, robePath].forEach((p) => rg.stroke(p));
  paintCuff(rg, CUFF_HIS);
  paintCuff(rg, CUFF_HER);
  return rg.canvas;
};

/** 写实件（发/颈/脸/刘海/花冠/他的头/手）——在袍位图之后画。 */
export const drawRealParts = (g: CanvasRenderingContext2D, t: number) => {
  drawHair(g, t);
  drawNeck(g);
  drawFace(g);
  drawBangs(g);
  drawWreath(g, t);
  drawHisHead(g);
  drawHands(g);
};
