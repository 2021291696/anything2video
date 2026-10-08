// ============================================================================
// actors.ts — sfumato 动态层画师（每帧矢量重画，走 Remotion useCurrentFrame）
// 猫（INDEX 短板修正：原卡「猫偏卡通+整体偏静」）：
//   · 必过 sfumato（由 kit.tsx 统一两遍：blur 1.6px 全不透明 → α0.82 清晰层；
//     v2 教训：高 blur 低 α 清晰层=景深倒置，禁）
//   · 体积全靠渐变：橘毛底色+白胸径向「晕」入+背光侧压暗+受光侧暖边+毛向短线，
//     无平涂无硬边；轮廓内侧压暗 9px·α0.2（26px·α0.45 会像玻璃罩——配方踩坑参数）
//   · 活性：呼吸 ×3 / 头绕脖歪蹭 ±0.16rad / 眯眼松紧交替 / 尾巴行波 ×2.2 / 眨眼
// 扑翼机（签名⑤）：前缘梁+6 放射肋+扇贝后缘膜（肋骨扇形翼，平面纸飞机认不出）
// 技法借鉴 huashu-art-motion scenes/06_renaissance.js（MIT, alchaincyf），TS 重写零拷贝。
// 全确定性：mulberry32 + 解析 sin/noise，禁 Math.random/Date。
// ============================================================================
import {INNER, RIVER, clamp01, lerp, mulberry32, noise2} from './world';

const TAU = Math.PI * 2;

// ---- 达芬奇扑翼机（裁剪在窗洞内；hero f223-273 飞过窗景，越远越淡）----
export function drawOrnithopter(
  c: CanvasRenderingContext2D, t: number, flightU: number, fadeNear: number,
): void {
  if (flightU <= 0 || flightU >= 1) return;
  const x = lerp(340, 500, flightU);
  const y = 156 + Math.sin(flightU * 9) * 9 - flightU * 14;
  const shrink = 1 - flightU * 0.18; // 越飞越远越小（空气透视呼应「远的东西越淡」）
  c.save();
  c.clip(INNER);
  c.globalAlpha = fadeNear * (0.92 - flightU * 0.3);
  c.translate(x, y);
  c.rotate(-0.06 + Math.sin(flightU * 7 + 1) * 0.06);
  c.scale(1.25 * shrink, 1.25 * shrink);
  const flap = Math.sin(t * 12);
  const wing = (sc: number, dark: boolean, ph: number) => {
    const up = 0.5 + 0.5 * Math.sin(t * 12 + ph); // 0=翼压下 1=翼抬起
    const tip: [number, number] = [-17 * sc, (-79 * up + 16 * (1 - up)) * sc];
    const back: [number, number] = [-85 * sc, (-20 * up + 12) * sc];
    const ribs = 5;
    const ends: Array<[number, number]> = [];
    for (let k = 0; k <= ribs; k++) {
      const u = k / ribs;
      ends.push([
        lerp(tip[0], back[0], u) - Math.sin(u * Math.PI) * 17 * sc,
        lerp(tip[1], back[1], u) - Math.sin(u * Math.PI) * 5 * sc * (up - 0.3),
      ]);
    }
    c.fillStyle = dark ? 'rgba(150,118,80,.92)' : 'rgba(214,188,140,.95)';
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(ends[0][0], ends[0][1]);
    for (let k = 1; k <= ribs; k++) {
      const a = ends[k - 1];
      const b = ends[k];
      c.quadraticCurveTo((a[0] + b[0]) / 2 + 4 * sc, (a[1] + b[1]) / 2 + 6 * sc, b[0], b[1]);
    }
    c.lineTo(-20 * sc, 4 * sc);
    c.closePath();
    c.fill();
    c.strokeStyle = '#4e321a';
    c.lineWidth = 1.1;
    c.stroke();
    // 前缘梁+放射肋
    c.lineWidth = 1.5;
    ends.forEach((e, k) => {
      c.beginPath();
      c.moveTo(-3, 0);
      c.lineTo(e[0], e[1]);
      c.lineWidth = k ? 1 : 2;
      c.stroke();
    });
  };
  wing(0.78, true, 0.5); // 远翼：小一号、压暗、相位错 0.5
  c.strokeStyle = '#4e321a';
  c.lineWidth = 2.3;
  c.beginPath();
  c.moveTo(27, 5);
  c.lineTo(-53, 8);
  c.stroke();
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(-7, 7);
  c.lineTo(-20, 20);
  c.lineTo(7, 20);
  c.closePath();
  c.stroke();
  // 扇形尾舵（摆动）
  c.fillStyle = 'rgba(214,188,140,.95)';
  c.beginPath();
  c.moveTo(-52, 8);
  c.lineTo(-79, -4 + Math.sin(t * 6) * 2.7);
  c.quadraticCurveTo(-75, 8, -77, 21 + Math.sin(t * 6) * 2.7);
  c.closePath();
  c.fill();
  c.strokeStyle = '#4e321a';
  c.lineWidth = 1.1;
  c.stroke();
  // 驾驶者（红衣）
  c.fillStyle = '#a02a1e';
  c.beginPath();
  c.ellipse(4, 9, 20, 4.4, 0.03, 0, TAU);
  c.fill();
  c.fillStyle = '#d8b090';
  c.beginPath();
  c.arc(25, 7, 4, 0, TAU);
  c.fill();
  c.strokeStyle = '#a02a1e';
  c.lineWidth = 2.3;
  c.beginPath();
  c.moveTo(-15, 10);
  c.lineTo(-27, 12 + flap * 2.7);
  c.stroke();
  wing(1.0, false, 0); // 近翼
  c.restore();
}

// ---- 飞鸟（窗洞内，常驻活性）----
export function drawBirds(c: CanvasRenderingContext2D, t: number): void {
  c.save();
  c.clip(INNER);
  c.strokeStyle = 'rgba(50,40,30,.85)';
  c.lineWidth = 1.2;
  c.lineCap = 'round';
  const r = mulberry32(9);
  for (let k = 0; k < 10; k++) {
    const x0 = 347 + r() * 200;
    const y0 = 120 + r() * 80;
    const s = 1.0 + r() * 0.8;
    const sp = 20 + r() * 27;
    const ph = r() * 7;
    const x = x0 - ((t * sp + k * 37) % 260);
    const y = y0 + Math.sin(t * 3 + ph) * 3;
    const f = Math.sin(t * 11 + ph) * 3.4 * s;
    c.beginPath();
    c.moveTo(x - 4.7 * s, y - f);
    c.quadraticCurveTo(x - 2 * s, y - 1.3, x, y + 0.7);
    c.quadraticCurveTo(x + 2 * s, y - 1.3, x + 4.7 * s, y - f);
    c.stroke();
  }
  c.restore();
}

// ---- 河面碎光 + 云影（窗洞内）----
export function drawRiverGlints(c: CanvasRenderingContext2D, t: number): void {
  c.save();
  c.clip(INNER);
  for (let k = 0; k < 3; k++) {
    const x = 240 + ((t * 47 + k * 127) % 373);
    const y = 267 + k * 30;
    const g = c.createRadialGradient(x, y, 3, x, y, 60);
    g.addColorStop(0, 'rgba(30,40,40,.28)');
    g.addColorStop(1, 'rgba(30,40,40,0)');
    c.fillStyle = g;
    c.save();
    c.translate(x, y);
    c.scale(1, 0.35);
    c.translate(-x, -y);
    c.beginPath();
    c.arc(x, y, 60, 0, TAU);
    c.fill();
    c.restore();
  }
  c.restore();
  c.save();
  c.clip(INNER);
  c.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 18; k++) {
    const u = ((t * 0.22 + k / 18) % 1) * (RIVER.length - 1);
    const i = Math.floor(u);
    const f = u - i;
    const a = RIVER[i];
    const b = RIVER[i + 1];
    const x = lerp(a[0], b[0], f);
    const y = lerp(a[1], b[1], f);
    const tw = Math.max(0, Math.sin(t * 9 + k * 2.3));
    c.fillStyle = `rgba(255,255,245,${0.6 * tw})`;
    c.beginPath();
    c.ellipse(x, y, 1.4 + i * 0.33, 0.8, 0, 0, TAU);
    c.fill();
  }
  c.restore();
}

// ---- 猫（每帧画进离屏层，由 kit.tsx 做两遍 sfumato 合成）----
// 区域 bbox：CAT_RX/Y/W/H（blur 边缘留 ≥10px 余量防裁剪亮边）
export const CAT_RX = 238;
export const CAT_RY = 374;
export const CAT_RW = 344;
export const CAT_RH = 292;
// 身体轮廓点列（坐姿朝窗，体积由渐变出）
const BODY: Array<[number, number]> = [
  [302, 500], [284, 535], [283, 572], [295, 606], [322, 622], [372, 628], [432, 622],
  [468, 602], [487, 562], [490, 522], [476, 490], [442, 470], [392, 460], [340, 470],
];
const OR = '#d88a3e';
const OR_D = '#9a5520';
const OR_L = '#f2b46a';
const WH = '#f4ece0';
const smooth = (pts: Array<[number, number]>): Path2D => {
  const p = new Path2D();
  p.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    p.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  }
  p.closePath();
  return p;
};

export function drawCat(c: CanvasRenderingContext2D, t: number): void {
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  // 地面投影（光池内暖影）
  c.fillStyle = 'rgba(30,15,5,.42)';
  c.beginPath();
  c.ellipse(395, 634, 102, 12, 0, 0, TAU);
  c.fill();
  // 呼吸（×3 幅度，胸腔起伏绕后脚轴）
  const breathe = Math.sin(t * 2.6) * 0.026;
  c.save();
  c.translate(430, 622);
  c.scale(1 - breathe * 0.4, 1 + breathe);
  c.translate(-430, -622);
  // 尾巴：橘、环纹、白尖，S 形搭向前（×2.2 行波）
  const sw = Math.sin(t * 2.2);
  const tp: Array<[number, number]> = [];
  for (let i = 0; i <= 9; i++) {
    const q = i / 9;
    tp.push([
      478 + q * 66 - Math.sin(q * Math.PI) * 10 + Math.sin(q * 5 + sw * 2.6) * 6,
      596 + q * 26 - Math.sin(q * Math.PI) * (26 + sw * 16),
    ]);
  }
  const tail = new Path2D();
  tail.moveTo(tp[0][0], tp[0][1]);
  for (let i = 1; i < tp.length; i++) {
    const a = tp[i - 1];
    const b = tp[i];
    tail.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  }
  c.strokeStyle = OR;
  c.lineWidth = 11;
  c.stroke(tail);
  c.strokeStyle = OR_D;
  c.lineWidth = 4;
  for (let i = 2; i < tp.length - 2; i += 2) {
    const a = Math.atan2(tp[i + 1][1] - tp[i][1], tp[i + 1][0] - tp[i][0]) + Math.PI / 2;
    c.beginPath();
    c.moveTo(tp[i][0] - Math.cos(a) * 7.5, tp[i][1] - Math.sin(a) * 7.5);
    c.lineTo(tp[i][0] + Math.cos(a) * 7.5, tp[i][1] + Math.sin(a) * 7.5);
    c.stroke();
  }
  const tip = tp[tp.length - 1];
  c.fillStyle = WH;
  c.beginPath();
  c.arc(tip[0], tip[1], 6, 0, TAU);
  c.fill();
  // 尾巴背光侧压暗（体积）
  c.strokeStyle = 'rgba(110,55,15,.4)';
  c.lineWidth = 3;
  c.beginPath();
  for (let i = 0; i < tp.length; i++) {
    const p = tp[i];
    if (i) c.lineTo(p[0], p[1] + 4);
    else c.moveTo(p[0], p[1] + 4);
  }
  c.stroke();
  // 身体：橘底 → 白胸径向晕入 → 背光侧压暗 → 受光暖边（窗在左上）
  const body = smooth(BODY);
  const bg = c.createLinearGradient(283, 460, 490, 628);
  bg.addColorStop(0, '#e8b878');
  bg.addColorStop(0.45, OR);
  bg.addColorStop(1, OR_D);
  c.fillStyle = bg;
  c.fill(body);
  c.save();
  c.clip(body);
  // 白胸腹（受光面，径向晕入无硬边）
  const chest = c.createRadialGradient(322, 560, 12, 330, 566, 92);
  chest.addColorStop(0, WH);
  chest.addColorStop(0.6, 'rgba(244,236,224,.85)');
  chest.addColorStop(1, 'rgba(244,236,224,0)');
  c.fillStyle = chest;
  c.fillRect(250, 460, 200, 168);
  // 橘毛被「晕」进来盖住白胸边缘（配方手法：橘色从背侧径向渐隐）
  const coat = c.createRadialGradient(430, 505, 30, 415, 515, 150);
  coat.addColorStop(0, 'rgba(216,138,62,.96)');
  coat.addColorStop(0.62, 'rgba(216,138,62,.72)');
  coat.addColorStop(1, 'rgba(216,138,62,0)');
  c.fillStyle = coat;
  c.fillRect(290, 430, 210, 200);
  // 背部受光暖边（左上窗光）
  c.strokeStyle = 'rgba(255,224,170,.4)';
  c.lineWidth = 7;
  c.beginPath();
  c.moveTo(310, 492);
  c.quadraticCurveTo(390, 452, 470, 500);
  c.stroke();
  // 虎斑：只在橘毛区（背侧），软边弧线顺体圆走向
  c.strokeStyle = 'rgba(150,75,20,.36)';
  for (let k = 0; k < 5; k++) {
    c.lineWidth = 4 + (k % 3) * 1.6;
    c.beginPath();
    c.moveTo(402 + k * 14, 478 + (k % 2) * 6);
    c.quadraticCurveTo(396 + k * 16, 530 + k * 6, 420 + k * 12, 588 - (k % 2) * 10);
    c.stroke();
  }
  // 腹底阴影
  const sh = c.createLinearGradient(0, 570, 0, 630);
  sh.addColorStop(0, 'rgba(80,40,10,0)');
  sh.addColorStop(1, 'rgba(80,40,10,.38)');
  c.fillStyle = sh;
  c.fillRect(270, 570, 230, 60);
  // 毛：短线顺轮廓（受光侧亮、背光侧暗）
  const r = mulberry32(3);
  for (let k = 0; k < 280; k++) {
    const x = 292 + r() * 192;
    const y = 468 + r() * 152;
    const dx = x - 385;
    const a = Math.atan2(y - 545, dx * 1.6) + (r() - 0.5) * 0.5;
    const L = 4 + r() * 5;
    c.strokeStyle = dx < -40 ? (r() < 0.6 ? 'rgba(255,238,205,.5)' : 'rgba(150,90,35,.35)')
      : (r() < 0.5 ? 'rgba(255,215,160,.42)' : 'rgba(105,50,12,.38)');
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L);
    c.stroke();
  }
  // 轮廓内侧轻压暗=体积（9px·α0.2；26px·α0.45 会像玻璃罩——配方坑）
  c.strokeStyle = 'rgba(90,50,15,.2)';
  c.lineWidth = 9;
  c.stroke(body);
  c.restore();
  // 前腿（胸下两条，奶油白渐变+爪）
  const leg = (x: number, w: number) => {
    const lg = c.createLinearGradient(x - w, 0, x + w, 0);
    lg.addColorStop(0, '#fdf8ee');
    lg.addColorStop(0.55, '#eadec4');
    lg.addColorStop(1, '#b8a888');
    c.fillStyle = lg;
    c.beginPath();
    c.moveTo(x - w, 548);
    c.quadraticCurveTo(x - w - 2, 590, x - w + 1, 622);
    c.quadraticCurveTo(x, 632, x + w - 1, 622);
    c.quadraticCurveTo(x + w + 2, 590, x + w, 548);
    c.closePath();
    c.fill();
    // 腿侧阴影
    c.fillStyle = 'rgba(120,80,40,.22)';
    c.beginPath();
    c.moveTo(x + w * 0.35, 552);
    c.quadraticCurveTo(x + w * 0.6, 590, x + w * 0.4, 622);
    c.lineTo(x + w, 616);
    c.quadraticCurveTo(x + w + 1, 585, x + w, 550);
    c.closePath();
    c.fill();
    // 爪
    const pg = c.createRadialGradient(x - 2, 628, 2, x, 630, 13);
    pg.addColorStop(0, '#fffaf0');
    pg.addColorStop(1, '#cfc2ae');
    c.fillStyle = pg;
    c.beginPath();
    c.ellipse(x, 628, w + 1, 7, 0, 0, TAU);
    c.fill();
    // 腿上毛色短笔（与胸腹衔接，破"塑料管"感）
    const rl = mulberry32(x | 0);
    for (let k = 0; k < 14; k++) {
      const ly = 552 + rl() * 68;
      const lx = x - w + 2 + rl() * (w * 2 - 4);
      c.strokeStyle = rl() < 0.5 ? 'rgba(244,236,224,.55)' : 'rgba(200,138,70,.4)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(lx, ly);
      c.lineTo(lx + (rl() - 0.5) * 3, ly + 4 + rl() * 4);
      c.stroke();
    }
    // 腿顶与身体的橘毛过渡（晕）
    const tp2 = c.createLinearGradient(0, 540, 0, 566);
    tp2.addColorStop(0, 'rgba(216,138,62,.75)');
    tp2.addColorStop(1, 'rgba(216,138,62,0)');
    c.fillStyle = tp2;
    c.fillRect(x - w - 2, 540, w * 2 + 4, 26);
  };
  leg(312, 11);
  leg(352, 12);
  c.restore(); // 呼吸变换结束（头不随胸腔压缩）
  // 头：绕脖子歪头蹭（±0.16rad 慢 + 0.05rad 快），呼吸微点
  const pv: [number, number] = [342, 514];
  c.save();
  c.translate(pv[0], pv[1]);
  c.rotate(0.16 * Math.sin(t * 3.4) + 0.05 * Math.sin(t * 8.1));
  c.translate(-pv[0], -pv[1]);
  c.translate(0, Math.sin(t * 2.6 + 0.6) * 1.5);
  const hc: [number, number] = [334, 464];
  // 耳（先画，被头圆盖住下缘；耳缘加软边暗线不显"剪纸"）
  const ear = (x: number, dir: number) => {
    c.fillStyle = OR;
    c.beginPath();
    c.moveTo(x - 14, hc[1] - 31);
    c.lineTo(x + dir * 5, hc[1] - 68);
    c.lineTo(x + 16, hc[1] - 27);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(225,140,130,.85)';
    c.beginPath();
    c.moveTo(x - 7, hc[1] - 34);
    c.lineTo(x + dir * 2, hc[1] - 58);
    c.lineTo(x + 9, hc[1] - 31);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(120,60,15,.35)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x - 14, hc[1] - 31);
    c.lineTo(x + dir * 5, hc[1] - 68);
    c.stroke();
  };
  ear(303, -1);
  ear(365, 1);
  // 头：径向体积（左上受光 OR_L → OR → 右下 OR_D）
  const hg = c.createRadialGradient(hc[0] - 14, hc[1] - 16, 8, hc[0], hc[1], 56);
  hg.addColorStop(0, OR_L);
  hg.addColorStop(0.55, OR);
  hg.addColorStop(1, OR_D);
  c.fillStyle = hg;
  c.beginPath();
  c.ellipse(hc[0], hc[1], 46, 41, 0, 0, TAU);
  c.fill();
  c.save();
  c.beginPath();
  c.ellipse(hc[0], hc[1], 46, 41, 0, 0, TAU);
  c.clip();
  // 额头虎斑 M 字
  c.strokeStyle = 'rgba(140,70,20,.6)';
  c.lineWidth = 4;
  for (let k = 0; k < 3; k++) {
    c.beginPath();
    c.moveTo(hc[0] - 16 + k * 12, hc[1] - 40);
    c.quadraticCurveTo(hc[0] - 20 + k * 12, hc[1] - 27, hc[0] - 24 + k * 12, hc[1] - 16);
    c.stroke();
  }
  // 白口鼻（径向晕入，收敛不过强——防「emoji 脸」）
  const mg = c.createRadialGradient(hc[0] - 8, hc[1] + 20, 3, hc[0] - 8, hc[1] + 20, 25);
  mg.addColorStop(0, WH);
  mg.addColorStop(0.65, 'rgba(244,236,224,.78)');
  mg.addColorStop(1, 'rgba(244,236,224,0)');
  c.fillStyle = mg;
  c.beginPath();
  c.arc(hc[0] - 8, hc[1] + 20, 25, 0, TAU);
  c.fill();
  // 下颊背光压暗
  c.fillStyle = 'rgba(120,60,15,.22)';
  c.beginPath();
  c.ellipse(hc[0] + 31, hc[1] + 15, 20, 24, 0.3, 0, TAU);
  c.fill();
  // 轮廓内侧压暗
  c.strokeStyle = 'rgba(80,35,8,.38)';
  c.lineWidth = 11;
  c.beginPath();
  c.ellipse(hc[0], hc[1], 46, 41, 0, 0, TAU);
  c.stroke();
  c.restore();
  // 半睁杏眼（琥珀虹膜+竖瞳，朝窗方向看；周期性眨眼）——去「^^ 微笑眼」卡通感
  const eye = (x: number) => {
    const phase = (t * 0.213 + (x - hc[0]) * 0.004) % 1;
    const blink = clamp01(1 - Math.abs(phase - 0.93) / 0.05); // 每周期末端快速眨一次
    const open = (0.62 + 0.16 * Math.sin(t * 2.2 + x * 0.05)) * (1 - blink);
    const ey = hc[1] + 2;
    c.save();
    c.beginPath();
    c.moveTo(x - 7.5, ey);
    c.quadraticCurveTo(x, ey - 7 * open - 1, x + 7.5, ey);
    c.quadraticCurveTo(x, ey + 5.5 * open + 1, x - 7.5, ey);
    c.closePath();
    c.fillStyle = '#cfc98f';
    c.fill();
    c.clip();
    c.fillStyle = '#7a8a4a';
    c.beginPath();
    c.arc(x - 1.5, ey, 4.6, 0, TAU);
    c.fill();
    c.fillStyle = '#221608';
    c.beginPath();
    c.ellipse(x - 2, ey, 1.7, 3.4 * Math.max(0.25, open), 0, 0, TAU);
    c.fill();
    c.fillStyle = 'rgba(255,248,230,.85)';
    c.beginPath();
    c.arc(x - 3.2, ey - 1.6, 1.1, 0, TAU);
    c.fill();
    c.restore();
    c.strokeStyle = '#3a2210';
    c.lineWidth = 1.7;
    c.beginPath();
    c.moveTo(x - 7.5, ey);
    c.quadraticCurveTo(x, ey - 7 * open - 1, x + 7.5, ey);
    c.quadraticCurveTo(x, ey + 5.5 * open + 1, x - 7.5, ey);
    c.closePath();
    c.stroke();
    // 上脸窝阴影（晕涂）
    c.strokeStyle = 'rgba(120,70,40,.25)';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(x - 6, ey - 7);
    c.quadraticCurveTo(x, ey - 10, x + 6, ey - 7);
    c.stroke();
  };
  eye(312);
  eye(352);
  // 鼻+嘴
  c.fillStyle = '#d07a70';
  c.beginPath();
  c.moveTo(323, 476);
  c.lineTo(335, 476);
  c.lineTo(329, 481);
  c.closePath();
  c.fill();
  c.strokeStyle = '#4a2a18';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(329, 481);
  c.lineTo(329, 486);
  c.moveTo(322, 486);
  c.quadraticCurveTo(325.5, 491, 329, 486);
  c.quadraticCurveTo(332.5, 491, 336, 486);
  c.stroke();
  // 胡须（左右各两根，微颤）
  const wf = Math.sin(t * 7) * 1.2;
  c.strokeStyle = 'rgba(250,245,235,.9)';
  c.lineWidth = 1;
  const wsk: Array<[number, number, number, number]> = [
    [312, 484, 262, 476 + wf], [312, 488, 258, 492 + wf],
    [338, 484, 388, 476 - wf], [338, 488, 392, 492 - wf],
  ];
  wsk.forEach(([x0, y0, x1, y1]) => {
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
    c.stroke();
  });
  c.restore(); // 头部变换结束
}

// ---- 浮尘（光柱内上浮+闪烁；70 颗，活性常驻层）----
export function drawDust(c: CanvasRenderingContext2D, t: number, bloom: number): void {
  c.save();
  c.globalCompositeOperation = 'lighter';
  const r = mulberry32(17);
  for (let i = 0; i < 70; i++) {
    const bx = lerp(300, 580, r());
    const ph = r() * 6;
    const q = ((t + ph) % 6) / 6;
    const x = bx + Math.sin((t + ph) * 1.7 + i) * 12;
    const y = lerp(667, 300, q);
    const tw = 0.5 + 0.5 * Math.sin(t * 6 + i * 1.7);
    const a = tw * Math.sin(q * Math.PI) * bloom;
    const s = 0.6 + r() * 0.8;
    const g = c.createRadialGradient(x, y, 0, x, y, 3.8 * s + 1);
    g.addColorStop(0, `rgba(255,240,200,${a})`);
    g.addColorStop(1, 'rgba(255,240,200,0)');
    c.fillStyle = g;
    c.fillRect(x - 7, y - 7, 14, 14);
  }
  c.restore();
}

// ---- 烛焰（结尾定帧微动：呼吸+噪声摇曳）----
export function drawFlame(c: CanvasRenderingContext2D, t: number): void {
  const fl = 0.5 * noise2(t * 2.2, 3.7) + 0.3 * noise2(t * 6.5, 8.1);
  const cx = 756.5;
  const top = 360;
  const h = 17 + fl * 4.5;
  const sway = noise2(t * 3.1, 9.3) * 3.2;
  c.save();
  c.globalCompositeOperation = 'lighter';
  // 焰心光晕（呼吸）
  const gl = c.createRadialGradient(cx, top - 5, 3, cx, top - 5, 34 + fl * 8);
  gl.addColorStop(0, `rgba(255,190,90,${0.34 + fl * 0.12})`);
  gl.addColorStop(1, 'rgba(255,190,90,0)');
  c.fillStyle = gl;
  c.fillRect(cx - 50, top - 50, 100, 72);
  // 焰体（泪滴，外橙内亮）
  c.fillStyle = 'rgba(240,150,50,.88)';
  c.beginPath();
  c.moveTo(cx, top - h - 5);
  c.quadraticCurveTo(cx + 5.6 + sway, top - h * 0.4, cx, top + 2);
  c.quadraticCurveTo(cx - 5.6 + sway, top - h * 0.4, cx, top - h - 5);
  c.fill();
  c.fillStyle = 'rgba(255,232,160,.95)';
  c.beginPath();
  c.moveTo(cx, top - h * 0.62);
  c.quadraticCurveTo(cx + 2.8 + sway * 0.6, top - h * 0.3, cx, top + 1);
  c.quadraticCurveTo(cx - 2.8 + sway * 0.6, top - h * 0.3, cx, top - h * 0.62);
  c.fill();
  c.restore();
}

// ---- 雾带（S02「一层雾盖住边界」：软边雾带缓慢掠过猫，盖住轮廓再散开）----
export function drawFogBand(c: CanvasRenderingContext2D, u: number): void {
  if (u <= 0 || u >= 1) return;
  // u: 0→1 掠过全程；α 包络 sin(u·π)，位移从 -260 → +420
  const a = Math.sin(u * Math.PI) * 0.22;
  const x = -260 + u * 680;
  c.save();
  c.globalCompositeOperation = 'screen';
  const g = c.createLinearGradient(x, 0, x + 300, 0);
  g.addColorStop(0, 'rgba(236,226,204,0)');
  g.addColorStop(0.5, `rgba(236,226,204,${a})`);
  g.addColorStop(1, 'rgba(236,226,204,0)');
  c.fillStyle = g;
  c.filter = 'blur(16px)';
  c.fillRect(x - 40, 380, 380, 270);
  c.filter = 'none';
  c.restore();
}
