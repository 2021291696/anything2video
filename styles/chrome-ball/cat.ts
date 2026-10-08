// chrome-ball 猫（塑料玩具人偶）——INDEX 短板修正卡：
// ① 猫身折线必须先 Catmull-Rom 平滑（smoothPath）再上塑料着色，否则塑料感露出棱角（读成矢量插画）；
// ② 腿不再直柱：上/下两段 taper 圆柱 + 膝盖球关节（玩具人偶的关节感）；
// ③ 脸不做塑料（改哑光 matte：无白高光、无 lighter 反光描边），五官简化、眼睛发绿光（90 年代 demo 的招牌）。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）15_raytrace 的猫件与着色约定，TSX 重写，零整段拷贝。
import type {CanvasCtx, Pt} from './types';
import {PAL} from './types';
import {smoothPath} from './noise';
import {plastic, matte, cyl, taper, joint} from './plastic';

// 静态几何（一次构建）：体廓/尾/须
const BODY_PTS: Pt[] = [[286, 558], [278, 508], [292, 466], [322, 448], [352, 446], [376, 456], [390, 478], [396, 510], [398, 540], [400, 558]];
const TAIL_PTS: Pt[] = [[284, 540], [262, 552], [246, 560], [240, 548], [248, 532]];
let BODY: Path2D | null = null;
let TAIL: Path2D | null = null;

function ensureGeom(): void {
  if (!BODY) BODY = smoothPath(BODY_PTS);
  if (!TAIL) TAIL = smoothPath(TAIL_PTS, false);
}

export type CatState = {t: number};

/**
 * 画猫（面向右，坐姿）。呼吸/眨眼/耳动/眼绿光全部由 t=帧号秒 推出（确定性）。
 * 接地线 560；头(352,425) r32（哑光）；体廓平滑后塑料着色。
 */
export function drawCat(c: CanvasCtx, t: number): void {
  ensureGeom();
  const breathe = 1 + 0.008 * Math.sin(t * 2.4);
  const tailSway = 0.05 * Math.sin(t * 1.1);
  const blink = (Math.floor(t * 30) % 140) < 6; // ~4.7s 一次眨眼
  const earTwitch = (Math.floor(t * 30) % 96) < 4 ? 0.08 : 0; // ~3.2s 一次耳动

  // ---- 尾巴（粗管 + 高光线，末端白球；绕根微摆）----
  c.save();
  c.translate(284, 540);
  c.rotate(tailSway);
  c.translate(-284, -540);
  c.lineCap = 'round';
  c.strokeStyle = '#b35f14';
  c.lineWidth = 13;
  c.stroke(TAIL!);
  c.strokeStyle = PAL.catOrange;
  c.lineWidth = 10;
  c.stroke(TAIL!);
  c.strokeStyle = 'rgba(255,240,200,.75)';
  c.lineWidth = 2.6;
  c.save();
  c.translate(-1.5, -4.5);
  c.stroke(TAIL!);
  c.restore();
  const tip = TAIL_PTS[TAIL_PTS.length - 1];
  const tp = new Path2D();
  tp.arc(tip[0], tip[1], 6.5, 0, Math.PI * 2);
  plastic(c, tp, PAL.catWhite, tip[0] - 2.5, tip[1] - 3, 13, {spec: 0.8});
  c.restore();

  // ---- 身体（平滑体廓 → 塑料；呼吸绕接地线 560 缩放）----
  c.save();
  c.translate(0, 560);
  c.scale(1, breathe);
  c.translate(0, -560);
  plastic(c, BODY!, PAL.catOrange, 320, 490, 170, {spec: 0.8, specR: 0.09});
  // 白胸（体廓内）
  c.save();
  c.clip(BODY!);
  const chest = new Path2D();
  chest.ellipse(374, 506, 25, 42, 0.1, 0, Math.PI * 2);
  plastic(c, chest, PAL.catWhite, 368, 486, 90, {spec: 0.5, rim: false});
  c.restore();
  // 腹部暗渐变（体感）
  c.save();
  c.clip(BODY!);
  const dg = c.createLinearGradient(340, 470, 400, 560);
  dg.addColorStop(0, 'rgba(0,0,0,0)');
  dg.addColorStop(1, 'rgba(40,0,60,.3)');
  c.fillStyle = dg;
  c.fillRect(330, 460, 90, 110);
  c.restore();
  // 虎斑：blur 印在塑料下面（体廓内软条纹）
  c.save();
  c.clip(BODY!);
  c.filter = 'blur(2px)';
  c.strokeStyle = PAL.catStripe;
  c.lineWidth = 9;
  c.lineCap = 'round';
  [[[306, 452], [296, 492]], [[330, 448], [322, 494]], [[354, 452], [348, 490]]].forEach(([a, b]) => {
    c.beginPath();
    c.moveTo(a[0], a[1]);
    c.lineTo(b[0], b[1]);
    c.stroke();
  });
  c.filter = 'none';
  c.restore();

  // ---- 后腿：大腿圆丘（塑料）+ 坐姿暗示；前腿两段 taper + 膝球关节（短板修正②）----
  const thigh = new Path2D();
  thigh.ellipse(324, 514, 46, 48, -0.12, 0, Math.PI * 2);
  plastic(c, thigh, PAL.catOrange, 306, 492, 120, {spec: 0.6, specR: 0.1});
  // 近侧前腿：肩(384,492)→肘(387,524)→爪(391,550)
  cyl(c, taper([383, 494], [387, 524], 15, 12), PAL.catOrange, [383, 494], [387, 524], 15, 0.4);
  joint(c, 387, 525, 7.5, PAL.catOrange);
  cyl(c, taper([387, 526], [391, 548], 12, 10), PAL.catOrange, [387, 526], [391, 548], 12, 0.6);
  // 远侧前腿（暗一档）
  cyl(c, taper([368, 498], [370, 526], 13, 10), '#d97f24', [368, 498], [370, 526], 13, 0.25);
  joint(c, 370, 527, 6.5, '#d97f24');
  cyl(c, taper([370, 528], [373, 548], 10, 9), '#d97f24', [370, 528], [373, 548], 10, 0.4);
  // 爪（白塑料椭圆 + 分趾线）
  for (const [px, py] of [[392, 552], [374, 552]] as Pt[]) {
    const pw = new Path2D();
    pw.ellipse(px, py, 14, 8, 0, 0, Math.PI * 2);
    plastic(c, pw, PAL.catWhite, px - 3, py - 3, 20, {spec: 0.8, dark: 0.5});
    c.strokeStyle = 'rgba(120,90,110,.5)';
    c.lineWidth = 1.4;
    [-5, 5].forEach((o) => {
      c.beginPath();
      c.moveTo(px + o, py + 2);
      c.lineTo(px + o, py + 9);
      c.stroke();
    });
  }

  // ---- 头（短板修正③：哑光脸，不做塑料）----
  const head = new Path2D();
  head.arc(352, 425, 32, 0, Math.PI * 2);
  // 耳（先画，压在头后）
  for (const s of [-1, 1] as const) {
    const ear = new Path2D();
    if (s < 0) ear.moveTo(330, 400), ear.lineTo(337 + earTwitch * 20, 372), ear.lineTo(350, 392);
    else ear.moveTo(355, 392), ear.lineTo(368 + earTwitch * 14, 371), ear.lineTo(375, 399);
    ear.closePath();
    plastic(c, ear, PAL.catOrange, 344, 388, 34, {spec: 0.5, dark: 0.5});
    const inner = new Path2D();
    if (s < 0) inner.moveTo(335, 397), inner.lineTo(339, 381), inner.lineTo(346, 392);
    else inner.moveTo(359, 393), inner.lineTo(367, 380), inner.lineTo(370, 397);
    inner.closePath();
    c.fillStyle = '#f2a0a8';
    c.fill(inner);
  }
  matte(c, head, PAL.catOrange, 344, 412, 52);
  // 头顶虎斑（哑光面内的软条纹）
  c.save();
  c.clip(head);
  c.filter = 'blur(1.5px)';
  c.strokeStyle = PAL.catStripe;
  c.lineWidth = 6;
  c.lineCap = 'round';
  const headStripes: Pt[][] = [
    [[344, 394], [341, 406]],
    [[354, 393], [352, 405]],
    [[364, 396], [363, 408]],
  ];
  for (const [a, b] of headStripes) {
    c.beginPath();
    c.moveTo(a[0], a[1]);
    c.lineTo(b[0], b[1]);
    c.stroke();
  }
  c.filter = 'none';
  c.restore();
  // 白口鼻（哑光）
  const mz = new Path2D();
  mz.ellipse(360, 438, 17, 12, 0, 0, Math.PI * 2);
  matte(c, mz, PAL.catWhite, 356, 430, 30);
  // 鼻/嘴（简化，不勾轮廓）
  c.fillStyle = '#e66a7a';
  c.beginPath();
  c.moveTo(366, 432);
  c.lineTo(371, 432);
  c.lineTo(368.5, 436);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(90,50,30,.6)';
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(368.5, 436);
  c.lineTo(368.5, 439);
  c.moveTo(368.5, 439);
  c.quadraticCurveTo(365, 442, 362, 439.5);
  c.moveTo(368.5, 439);
  c.quadraticCurveTo(372, 442, 375, 439.5);
  c.stroke();
  // 须（白细线）
  c.strokeStyle = 'rgba(255,255,255,.85)';
  c.lineWidth = 1.2;
  const whiskers: [number, number, number, number][] = [
    [368, 438, 398, 434], [368, 440, 398, 442], [368, 442, 396, 450],
    [352, 438, 326, 433], [352, 440, 326, 441], [352, 442, 328, 449],
  ];
  for (const [x1, y1, x2, y2] of whiskers) {
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
  }
  // 眼：暗底 + 绿光 pulse（lighter）——90 年代 demo 招牌（杏形微挑，避免圆瞪感）
  const pulse = 0.75 + 0.25 * Math.sin(t * 18);
  for (const [ex, ey, er] of [[344, 421, -0.32], [364, 419, 0.28]] as [number, number, number][]) {
    c.fillStyle = '#0a3a10';
    c.beginPath();
    c.ellipse(ex, ey, 5, 6.6, er, 0, Math.PI * 2);
    c.fill();
    if (!blink) {
      // 竖瞳
      c.fillStyle = '#dfffd8';
      c.beginPath();
      c.ellipse(ex, ey, 1.5, 4.2, er, 0, Math.PI * 2);
      c.fill();
    }
    c.save();
    c.globalCompositeOperation = 'lighter';
    const rGlow = 22 * pulse;
    const gg = c.createRadialGradient(ex, ey, 0, ex, ey, rGlow);
    gg.addColorStop(0, blink ? 'rgba(120,200,140,.25)' : 'rgba(200,255,200,.9)');
    gg.addColorStop(0.25, 'rgba(80,255,120,.5)');
    gg.addColorStop(1, 'rgba(40,255,90,0)');
    c.fillStyle = gg;
    c.beginPath();
    c.arc(ex, ey, rGlow, 0, Math.PI * 2);
    c.fill();
    c.restore();
    if (blink) {
      c.strokeStyle = '#4a2a1a';
      c.lineWidth = 2.2;
      c.beginPath();
      c.moveTo(ex - 6, ey + 1);
      c.lineTo(ex + 6, ey);
      c.stroke();
    }
  }
  c.restore(); // breathe
}

/** 猫接地线（反射镜像用）。 */
export const CAT_GROUND = 560;
