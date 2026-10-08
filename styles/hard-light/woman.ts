// 家具与人物（双版本画法）—— hard-light。
// 签名①（人物侧）：同一个 drawWoman/furniture 按背光 TS / 受光 TL 两套色各画一遍，
// 受光版整只裁进人物光带 OP（litClip 在 Scene 里做）→ 她的光色随光斑移动而切换。
// 短板修正（INDEX：猫全程在阴影里）：本片无猫；主角 face-crossing 由光斑轨迹保证——
// 光边在 f247-265（60-75% 窗口内）扫过她的脸，半脸背光 → 全脸受光（叙事重音）。
import {FIX, type CanvasCtx, type ThingKey} from './types';
import {clamp, lerp, smoothstep} from './noise';

export type Pose = {sipK: number; blink: boolean; breathe: number; hairSway: number};

/** 人物姿态：呼吸 3.9s 周期 / 两次眨眼 / 一次端杯啜饮（f150 前后）/ 发梢微摆。全为帧号确定函数。 */
export function pose(f: number, FPS: number): Pose {
  const t = (f - 1) / FPS;
  const breathe = 0.5 + 0.5 * Math.sin((t * Math.PI * 2) / 3.9);
  const hairSway = Math.sin(t * 0.9) * 1.8 * (0.4 + 0.6 * breathe);
  const blink = [4.2, 9.7, 12.4].some((a) => Math.abs(t - a) < 0.07);
  const k1 = smoothstep((t - 5.0) / 0.8);
  const k2 = smoothstep((t - 6.0) / 0.8);
  const sipK = clamp(k1 - k2);
  return {sipK, blink, breathe, hairSway};
}

/** 端杯时手/杯的位置（rest → 嘴边）。热气要从杯口跟随。 */
export function cupPos(p: Pose): [number, number] {
  return [lerp(934, 900, p.sipK) + 8, lerp(436, 368, p.sipK) - 16];
}

/** 木桌（光斑 narrative 中段爬过桌面）。 */
export function furniture(c: CanvasCtx, K: ThingKey): void {
  c.fillStyle = K.wood;
  c.fillRect(810, 418, 230, 16);
  c.fillStyle = K.woodD;
  c.fillRect(818, 434, 214, 14);
  c.fillRect(810, 432, 230, 2);
  c.fillStyle = K.wood;
  c.fillRect(824, 448, 13, 197);
  c.fillRect(1013, 448, 13, 197);
  c.fillStyle = K.woodD;
  c.fillRect(1031, 448, 4, 197);
  c.fillRect(824, 448, 3, 197);
}

/** 站姿女人（面向左/窗，长发蓝发带，端杯）。sil=true 时全部剪影黑（墙上投影用）。 */
export function drawWoman(c: CanvasCtx, K: ThingKey, p: Pose, sil = false): void {
  const col = (base: string): string => (sil ? '#000' : base);
  const dy = -1.4 * p.breathe; // 上半身呼吸（裙/鞋不动）
  const hx = lerp(934, 900, p.sipK), hy = lerp(436, 368, p.sipK); // 手/杯
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  // ---- 下半身（固定）----
  c.fillStyle = col(K.dress); // 裙
  c.beginPath();
  c.moveTo(861, 428);
  c.lineTo(919, 428);
  c.lineTo(941, 628);
  c.quadraticCurveTo(890, 644, 839, 628);
  c.closePath();
  c.fill();
  c.fillStyle = col(K.dressD); // 裙右侧背光块
  c.beginPath();
  c.moveTo(897, 428);
  c.lineTo(919, 428);
  c.lineTo(941, 628);
  c.quadraticCurveTo(921, 634, 903, 631);
  c.closePath();
  c.fill();
  c.strokeStyle = col(K.dressD); // 裙褶
  c.lineWidth = 3;
  [[880, 470, 872, 598], [896, 470, 894, 608], [909, 470, 913, 596]].forEach(([x1, y1, x2, y2]) => {
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
  });
  c.fillStyle = col(FIX.shoe); // 鞋
  c.beginPath();
  c.ellipse(862, 640, 15, 7, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(920, 640, 15, 7, 0, 0, Math.PI * 2);
  c.fill();
  // ---- 上半身（呼吸组）----
  c.fillStyle = col(K.dress); // 躯干
  c.beginPath();
  c.moveTo(857, 344 + dy);
  c.lineTo(923, 344 + dy);
  c.lineTo(917, 430);
  c.lineTo(863, 430);
  c.closePath();
  c.fill();
  c.fillStyle = col(K.dressD); // 躯干右侧暗块
  c.beginPath();
  c.moveTo(903, 344 + dy);
  c.lineTo(917, 344 + dy);
  c.lineTo(917, 430);
  c.lineTo(903, 430);
  c.closePath();
  c.fill();
  c.fillStyle = col(K.skinD); // 颈
  c.fillRect(882, 306 + dy, 16, 30);
  c.fillStyle = col(K.collar); // 白领尖
  c.beginPath();
  c.moveTo(878, 338 + dy);
  c.lineTo(902, 338 + dy);
  c.lineTo(890, 350 + dy);
  c.closePath();
  c.fill();
  // 远侧手臂（垂）
  c.strokeStyle = col(K.dress);
  c.lineWidth = 12;
  c.beginPath();
  c.moveTo(872, 354 + dy);
  c.lineTo(862, 408 + dy);
  c.stroke();
  c.fillStyle = col(K.skinD);
  c.beginPath();
  c.arc(860, 420 + dy, 5.5, 0, Math.PI * 2);
  c.fill();
  // 长发（脑后垂落，发梢微摆）
  const sw = p.hairSway;
  c.fillStyle = col(K.hair);
  c.beginPath();
  c.moveTo(870, 272 + dy);
  c.quadraticCurveTo(890, 252 + dy, 914, 270 + dy);
  c.quadraticCurveTo(926, 292 + dy, 924, 330);
  c.quadraticCurveTo(923 + sw, 372, 918 + sw, 392);
  c.quadraticCurveTo(900, 398, 886 + sw * 0.6, 392);
  c.quadraticCurveTo(882, 330, 882, 310 + dy);
  c.closePath();
  c.fill();
  c.fillStyle = col(K.hairD); // 发内侧暗面
  c.beginPath();
  c.ellipse(910 + sw * 0.5, 352, 13, 34, 0.06, 0, Math.PI * 2);
  c.fill();
  // 脸
  c.fillStyle = col(K.skin);
  c.beginPath();
  c.ellipse(890, 288 + dy, 23, 26, 0, 0, Math.PI * 2);
  c.fill();
  c.save(); // 颊后暗面
  c.beginPath();
  c.ellipse(890, 288 + dy, 23, 26, 0, 0, Math.PI * 2);
  c.clip();
  c.fillStyle = col(K.skinD);
  c.beginPath();
  c.ellipse(908, 300 + dy, 9, 15, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
  // 刘海
  c.fillStyle = col(K.hair);
  c.beginPath();
  c.moveTo(868, 282 + dy);
  c.quadraticCurveTo(873, 257 + dy, 896, 257 + dy);
  c.quadraticCurveTo(913, 263 + dy, 914, 282 + dy);
  c.quadraticCurveTo(897, 268 + dy, 875, 286 + dy);
  c.closePath();
  c.fill();
  // 蓝发带（少女感）
  c.strokeStyle = col(K.band);
  c.lineWidth = 6;
  c.beginPath();
  c.moveTo(869, 273 + dy);
  c.quadraticCurveTo(890, 259 + dy, 911, 273 + dy);
  c.stroke();
  if (!sil) {
    // 五官（疏笔，望向左/窗）
    if (p.blink) {
      c.strokeStyle = FIX.eye;
      c.lineWidth = 2.4;
      c.beginPath();
      c.moveTo(872, 290 + dy);
      c.lineTo(881, 290 + dy);
      c.stroke();
    } else {
      c.fillStyle = FIX.eye;
      c.beginPath();
      c.ellipse(876, 290 + dy, 2.6, 3.4, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'rgba(46,32,24,.5)';
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(871, 288 + dy);
      c.quadraticCurveTo(876, 285 + dy, 882, 288 + dy);
      c.stroke();
    }
    c.strokeStyle = K.hairD;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(869, 279 + dy);
    c.quadraticCurveTo(876, 275.5 + dy, 883, 279 + dy);
    c.stroke();
    c.strokeStyle = K.skinD;
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(869, 296 + dy);
    c.lineTo(867, 301 + dy);
    c.stroke();
    c.fillStyle = FIX.lip;
    c.beginPath();
    c.moveTo(868, 306 + dy);
    c.lineTo(878, 305 + dy);
    c.lineTo(872, 311 + dy);
    c.closePath();
    c.fill();
  }
  // 近侧手臂 + 杯（端杯组）
  c.strokeStyle = col(K.dress);
  c.lineWidth = 13;
  c.beginPath();
  c.moveTo(910, 352 + dy);
  c.lineTo(922, 410 + dy);
  c.stroke();
  c.lineWidth = 11;
  c.beginPath();
  c.moveTo(922, 410 + dy);
  c.lineTo(hx, hy);
  c.stroke();
  c.fillStyle = col(K.skin);
  c.beginPath();
  c.arc(hx, hy, 6, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = col(K.cup); // 杯
  c.beginPath();
  c.roundRect(hx, hy - 14, 16, 18, 2);
  c.fill();
  c.strokeStyle = col(FIX.cupRim);
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(hx, hy - 14);
  c.lineTo(hx + 16, hy - 14);
  c.stroke();
  c.lineWidth = 2.5;
  c.beginPath();
  c.arc(hx + 18, hy - 6, 4, -Math.PI / 2, Math.PI / 2);
  c.stroke();
  c.restore();
}
