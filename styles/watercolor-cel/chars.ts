// 赛璐璐角色 —— watercolor-cel（少女＋猫， cel 两调 + 暖褐细线，整层过 textureInside 水彩化）。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）scenes/25_ghibli.js 角色段（P.cel 两调月牙影 + 角色水彩化 +
// 线色调软 #6a4a38——INDEX 短板「人物不如背景」修正）：机制与参数级借鉴，Remotion 重写，角色几何按 1280×720 重设计。
// 锁死 token（types.ts）：青裙 #3f8590/#2b6470、金发 #f8dc8c/#d9a95a、肤 #fde6d2/#efbfa4、白 #fffaf0/#d8dde4、
// 红结 #d93a30/#a0261f、猫 #f3a24c/#d27a2c、线 #6a4a38。
import type {CanvasCtx, Pt} from './types';
import {W, H, FIX, GP, KP} from './types';
import {cel, smoothPath} from './wash';
import {breathe, hairWind} from './motion';

const LINE = FIX.line;

/** 二次贝塞尔胶囊（四肢）：采样中心线 ±半宽法线 → 闭合多边形。 */
function tube(a: Pt, ctrl: Pt, b: Pt, w: number): Path2D {
  const up: Pt[] = [], dn: Pt[] = [];
  for (let i = 0; i <= 8; i++) {
    const q = i / 8, iq = 1 - q;
    const x = iq * iq * a[0] + 2 * iq * q * ctrl[0] + q * q * b[0];
    const y = iq * iq * a[1] + 2 * iq * q * ctrl[1] + q * q * b[1];
    const tx = 2 * (iq * (ctrl[0] - a[0]) + q * (b[0] - ctrl[0]));
    const ty = 2 * (iq * (ctrl[1] - a[1]) + q * (b[1] - ctrl[1]));
    const l = Math.hypot(tx, ty) || 1;
    up.push([x - (ty / l) * w, y + (tx / l) * w]);
    dn.push([x + (ty / l) * w, y - (tx / l) * w]);
  }
  return smoothPath([...up, ...dn.reverse()]);
}

function ellipse(cx: number, cy: number, rx: number, ry: number, rot = 0): Path2D {
  const p = new Path2D();
  p.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
  return p;
}

function poly(pts: Pt[]): Path2D {
  const p = new Path2D();
  pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])));
  p.closePath();
  return p;
}

/** 少女（《风起的午后》）：窗边站立、面朝窗、金长发被风吹向右后、青裙白围裙、红蝴蝶结。 */
export function girl(c: CanvasCtx, lt: number, t: number): void {
  const wind = hairWind(lt);
  const br = breathe(t);
  const blink = (t + 0.9) % 3.4 < 0.12;
  c.save();
  c.lineJoin = 'round';
  c.lineCap = 'round';
  // 呼吸：上身绕脚点微缩放
  c.translate(596, 664);
  c.scale(1 + br * 0.0012, 1 + br * 0.0018);
  c.translate(-596, -664);
  // ---- 后层：被风吹向右后的长发（before 身体，多段随风位移 + 颤动）
  const nape: Pt = [592, 352];
  const hairBack: Pt[] = [
    [585 + wind * 2, 276 - br * 0.6],
    [626 + wind * 8, 288],
    [652 + wind * 18, 322 + Math.sin(t * 6) * 3],
    [668 + wind * 26, 376 + Math.sin(t * 5 + 1) * 5],
    [660 + wind * 20, 438 + Math.sin(t * 4.4) * 6],
    [626 + wind * 10, 476 + Math.sin(t * 5 + 2) * 5],
    [588, 470],
    [566, 428],
    [560, 372],
    [562, 322],
  ];
  cel(c, smoothPath(hairBack), GP.hair, GP.hairS, LINE, 2.4, 10, 4);
  // ---- 远侧臂（身后，先画）
  cel(c, tube([600, 380 + br], [622, 424], [612, 456], 6.5), GP.dress, GP.dressS, LINE, 2.2, 6, 4);
  cel(c, ellipse(612, 460, 6, 6.5), GP.skin, GP.skinS, LINE, 1.8, 4, 3);
  // ---- 腿与鞋（裙下）
  cel(c, tube([572, 596], [566, 630], [562, 656], 5.5), GP.skin, GP.skinS, LINE, 2, 4, 2);
  cel(c, tube([604, 596], [602, 630], [600, 654], 5.5), GP.skin, GP.skinS, LINE, 2, 4, 2);
  cel(c, ellipse(556, 660, 13, 7), '#6a3a24', '#4a2414', LINE, 2, 4, 2);
  cel(c, ellipse(594, 658, 13, 7), '#6a3a24', '#4a2414', LINE, 2, 4, 2);
  // ---- 青裙（A 字，摆线微波动）＋裙褶
  const hem = 556;
  const skirt: Pt[] = [
    [560, 372 + br],
    [612, 372 + br],
    [636, 452],
    [654, hem - 4 + Math.sin(t * 2.6) * 2 * (0.4 + wind * 0.6)],
    [620, hem + 2],
    [586, hem - 4],
    [552, hem + 2],
    [522, hem - 4 + Math.sin(t * 2.6 + 1) * 2 * (0.4 + wind * 0.6)],
    [538, 448],
  ];
  cel(c, smoothPath(skirt), GP.dress, GP.dressS, LINE, 2.4, 14, 7);
  c.save();
  c.strokeStyle = GP.dressS;
  c.lineWidth = 2.4;
  [[562, 380, 544, hem - 10], [588, 378, 580, hem - 6], [606, 380, 624, hem - 10]].forEach(([x1, y1, x2, y2]) => {
    c.beginPath();
    c.moveTo(x1, y1);
    c.quadraticCurveTo((x1 + x2) / 2 + 4, (y1 + y2) / 2, x2, y2);
    c.stroke();
  });
  c.restore();
  // ---- 白围裙（围裙裙 + 胸前）＋口袋线
  const apron: Pt[] = [[566, 384 + br], [604, 384 + br], [612, 436], [640, 470], [636, hem - 8], [556, hem - 8], [546, 462], [560, 434]];
  cel(c, smoothPath(apron), GP.white, GP.whiteS, LINE, 2.2, 8, 5);
  c.strokeStyle = GP.whiteS;
  c.lineWidth = 1.8;
  c.beginPath();
  c.arc(592, 508, 16, 0.2, Math.PI - 0.2);
  c.stroke();
  // ---- 近侧臂：肩→肘→手搭在桌沿（袖白）
  cel(c, tube([566, 386 + br], [530, 420], [474, 448], 8), GP.dress, GP.dressS, LINE, 2.2, 8, 5);
  cel(c, tube([486, 444], [474, 452], [458, 458], 6), GP.white, GP.whiteS, LINE, 2, 4, 3);
  cel(c, ellipse(452, 459, 7.5, 6.5), GP.skin, GP.skinS, LINE, 2, 3, 3);
  // ---- 躯干（上身青裙）＋领口白
  cel(c, poly([[558, 366 + br], [614, 366 + br], [620, 396 + br], [552, 396 + br]]), GP.dress, GP.dressS, LINE, 2.2, 10, 5);
  cel(c, poly([[570, 362 + br], [602, 362 + br], [606, 374 + br], [566, 374 + br]]), GP.white, GP.whiteS, LINE, 2, 5, 3);
  // ---- 颈＋脸
  cel(c, poly([[578, 344 + br], [598, 344 + br], [598, 366 + br], [578, 366 + br]]), GP.skin, GP.skinS, LINE, 2, 5, 2);
  const face = ellipse(588, 318 + br, 27, 32);
  cel(c, face, GP.skin, GP.skinS, LINE, 2.4, 9, 4);
  // 腮红（clip 脸内）
  c.save();
  c.clip(face);
  c.fillStyle = 'rgba(240,140,130,.35)';
  c.beginPath();
  c.ellipse(572, 331 + br, 10, 5.5, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
  // ---- 刘海（盖住额头，下缘三段圆弧）
  cel(c, smoothPath([[552, 314 + br], [554, 288 + br], [578, 277 + br], [606, 279 + br], [618, 296 + br], [614, 310 + br], [602, 295 + br], [590, 304 + br], [578, 296 + br], [566, 305 + br]]), GP.hair, GP.hairS, LINE, 2.2, 6, 5);
  // 发丝高光块（吉卜力式：两道浅弧，clip 在后发内）
  c.save();
  c.clip(smoothPath(hairBack));
  c.strokeStyle = 'rgba(253,240,188,.85)';
  c.lineWidth = 2.6;
  c.beginPath();
  c.moveTo(626 + wind * 8, 322);
  c.quadraticCurveTo(638 + wind * 14, 356, 634 + wind * 16, 392);
  c.stroke();
  c.beginPath();
  c.moveTo(634 + wind * 10, 318);
  c.quadraticCurveTo(648 + wind * 18, 352, 644 + wind * 20, 388);
  c.stroke();
  c.restore();
  // ---- 红蝴蝶结（后脑上方）＋双飘带（随风抖）
  const bc: Pt = [612, 286 + br];
  const tail1: Pt[] = [[bc[0] + 4, bc[1] + 6], [bc[0] + 30 + wind * 14, bc[1] + 32 + Math.sin(t * 8) * 4], [bc[0] + 22 + wind * 8, bc[1] + 44], [bc[0] + 2, bc[1] + 12]];
  const tail2: Pt[] = [[bc[0] + 2, bc[1] + 6], [bc[0] + 44 + wind * 20, bc[1] + 20 + Math.sin(t * 6.6 + 1) * 6], [bc[0] + 40 + wind * 14, bc[1] + 40 + Math.sin(t * 7 + 2) * 5], [bc[0] + 4, bc[1] + 14]];
  cel(c, smoothPath(tail1), GP.bow, GP.bowS, LINE, 2, 4, 3);
  cel(c, smoothPath(tail2), GP.bow, GP.bowS, LINE, 2, 4, 3);
  cel(c, ellipse(bc[0] - 15, bc[1] - 6, 15, 9.5, -0.55), GP.bow, GP.bowS, LINE, 2.2, 4, 3);
  cel(c, ellipse(bc[0] + 13, bc[1] - 7, 15, 9.5, 0.5), GP.bow, GP.bowS, LINE, 2.2, 4, 3);
  cel(c, ellipse(bc[0] - 1, bc[1], 6.5, 6.5), GP.bow, GP.bowS, LINE, 2, 2, 2);
  // ---- 五官（吉卜力式大而简单的眼；侧脸只画朝窗一眼）
  const ex = 570, ey = 315 + br;
  if (blink) {
    c.strokeStyle = LINE;
    c.lineWidth = 2.6;
    c.beginPath();
    c.arc(ex, ey - 2, 6, 0.2, Math.PI - 0.2);
    c.stroke();
  } else {
    c.fillStyle = '#3a2a24';
    c.beginPath();
    c.ellipse(ex - 1, ey + 1, 4.6, 7, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#5a8ac8';
    c.beginPath();
    c.ellipse(ex - 1, ey + 3, 3, 3.6, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(ex - 2.4, ey - 2, 1.8, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = LINE;
    c.lineWidth = 2.4;
    c.beginPath();
    c.ellipse(ex - 1, ey, 6.5, 8.5, 0, 0.15, Math.PI - 0.15);
    c.stroke();
  }
  c.strokeStyle = '#c08a40';
  c.lineWidth = 2.2;
  c.beginPath();
  c.moveTo(562, 299 + br);
  c.quadraticCurveTo(568, 296 + br, 574, 298 + br);
  c.stroke();
  c.strokeStyle = '#a8443a';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(564, 339 + br);
  c.quadraticCurveTo(568, 342 + br, 572, 340 + br);
  c.stroke();
  c.restore();
}

/** 暖橙猫：窗边坐姿，尾巴慢摆，content 眯眼/睁眼两态。 */
export function cat(c: CanvasCtx, lt: number, t: number): void {
  const br = breathe(t + 1.7);
  const blinkK = (t + 2.2) % 3.4 < 0.12;
  c.save();
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.translate(800, 662);
  c.scale(1 + br * 0.002, 1 + br * 0.003);
  c.translate(-800, -662);
  // 尾巴（描边双层：暖褐衬边 + 橙芯；白尖），慢摆
  const sw = Math.sin(t * 1.8) * 7;
  const tail: Pt[] = [[850, 648], [882, 638 + sw * 0.4], [898, 610 + sw], [890, 584 + sw * 1.2]];
  c.strokeStyle = LINE;
  c.lineWidth = 12.5;
  tailPath(c, tail);
  c.strokeStyle = KP.fur;
  c.lineWidth = 9;
  tailPath(c, tail);
  const tip = tail[tail.length - 1];
  c.fillStyle = KP.cream;
  c.beginPath();
  c.arc(tip[0], tip[1], 4.4, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = LINE;
  c.lineWidth = 1.5;
  c.stroke();
  // 身体（坐姿水滴）＋背条纹
  const body = smoothPath([[756, 656], [748, 618], [762, 588], [796, 578], [830, 592], [850, 622], [852, 656]]);
  cel(c, body, KP.fur, KP.furS, LINE, 2.4, 16, 9);
  c.save();
  c.clip(body);
  c.strokeStyle = KP.stripe;
  c.lineWidth = 6;
  [[816, 588, 830, 616], [832, 598, 846, 628], [790, 582, 800, 606]].forEach(([x1, y1, x2, y2]) => {
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
  });
  c.restore();
  // 白胸腹
  c.save();
  c.clip(body);
  cel(c, ellipse(774, 636, 24, 28), KP.cream, KP.creamS, '', 0, 8, 5);
  c.restore();
  // 前腿（白）与爪
  cel(c, tube([768, 632], [764, 650], [764, 660], 5.5), KP.cream, KP.creamS, LINE, 1.8, 5, 3);
  cel(c, tube([788, 630], [786, 650], [786, 660], 5.5), KP.cream, KP.creamS, LINE, 1.8, 5, 3);
  // 头（面向左窗）＋白口鼻
  const head = ellipse(762, 576, 28, 26);
  cel(c, head, KP.fur, KP.furS, LINE, 2.4, 12, 8);
  c.save();
  c.clip(head);
  c.fillStyle = KP.cream;
  c.beginPath();
  c.ellipse(748, 590, 20, 15, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
  // 耳（双三角＋粉内耳，基部压进头圆防脱节）
  cel(c, poly([[738, 562], [745, 534], [763, 552]]), KP.fur, KP.furS, LINE, 2, 3, 2);
  cel(c, poly([[768, 550], [781, 528], [792, 554]]), KP.fur, KP.furS, LINE, 2, 3, 2);
  c.fillStyle = KP.ear;
  c.beginPath();
  c.moveTo(743, 558);
  c.lineTo(747, 542);
  c.lineTo(757, 553);
  c.closePath();
  c.fill();
  c.beginPath();
  c.moveTo(772, 549);
  c.lineTo(780, 534);
  c.lineTo(787, 552);
  c.closePath();
  c.fill();
  // 头顶条纹
  c.save();
  c.clip(head);
  c.strokeStyle = KP.stripe;
  c.lineWidth = 5;
  [[758, 552, 758, 566], [768, 551, 770, 565]].forEach(([x1, y1, x2, y2]) => {
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
  });
  c.restore();
  // 眼鼻嘴须
  const eyes: Array<[number, number]> = [[748, 574], [768, 572]];
  eyes.forEach(([x, y]) => {
    if (blinkK) {
      c.strokeStyle = LINE;
      c.lineWidth = 2.4;
      c.beginPath();
      c.arc(x, y - 2, 6, 0.2, Math.PI - 0.2);
      c.stroke();
    } else {
      c.fillStyle = KP.eye;
      c.beginPath();
      c.ellipse(x, y, 5, 6.6, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#fff';
      c.beginPath();
      c.arc(x - 1.6, y - 2.2, 2, 0, Math.PI * 2);
      c.fill();
    }
  });
  c.fillStyle = KP.nose;
  c.beginPath();
  c.arc(751, 584, 3.4, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = LINE;
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(751, 588);
  c.quadraticCurveTo(748, 592, 744, 590);
  c.stroke();
  c.lineWidth = 1.2;
  [[740, 584, 722, 580], [740, 588, 722, 590], [742, 592, 726, 598]].forEach(([x1, y1, x2, y2]) => {
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
  });
  c.restore();
}

function tailPath(c: CanvasCtx, pts: Pt[]): void {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    c.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  }
  const l = pts[pts.length - 1];
  c.lineTo(l[0], l[1]);
  c.stroke();
}

/** 角色整帧：猫+少女画进离屏 L（供 Scene 做 textureInside 水彩化）。 */
export function drawChars(c: CanvasCtx, lt: number, t: number): void {
  cat(c, lt, t);
  girl(c, lt, t);
}

export const CHAR_LAYER_W = W, CHAR_LAYER_H = H;
