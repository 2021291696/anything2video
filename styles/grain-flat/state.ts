// 表演状态机 —— 《一只猫的晨间仪式》。全部帧号 30fps、1 起含端点（TOTAL=383）。
// 分镜（beat-sheet 同源）：
//   f2/f24/f62   闹钟三响（第三遍最响）→ 钩子：f2 闹钟震+猫耳动（0.03s<0.5s）
//   f100-135     踮脚伸懒腰（绕脚轴下蹲→拉高→收回，脚不离地）
//   f136-146     两段小跳接近床头柜（烟尘小件）
//   f146-184     跳上床头柜：预备下蹲→蹬地→弧线→落桌挤压→f176 最扁帧翻面 snap→坐起
//   f184-192     盯杯子（前倾+瞳孔偏移）
//   f197-245     三次拍杯（wind5/hit3/hold3/back5，目标经 getTransform().invertSelf() 反算）
//   f244-261     杯子出桌沿倾倒坠落（咖啡滴拖尾）
//   f263         碎裂（HERO 峰值=68.7%，60-75% 窗口内）
//   f264-274     惊呼（大张嘴+紧张线弹出）
//   f275-284     心虚缩脖；f285-310 舔爪两遍；f310-346 得意；f347-383 定帧 1.2s（微动效：尾尖摆/耳抖/装饰沸腾/阻尼余摆）
// 连续表演段 = f133-283（150 帧 = 5.0s，approach→jump→swipe→shatter→gasp→sheepish，无跳变）。
// 技法借鉴 huashu-art-motion (MIT) scenes/16_2026.js catState/cupState，TSX 重写（分镜全为新排）。
import {clamp, ease, kf, lerp, path, seg, type PathTab} from './util';
import {LAND, LEAP, LICK, REACH, SIT, STRETCH, mixPose, type Pose} from './pose';
import {WORLD} from './types';

export type Eyes = 'closed' | 'open' | 'wide' | 'gasp' | 'happy';

export type CatState = {
  pose: Pose;
  x: number;
  y: number;
  rot: number;
  sx: number;
  sy: number;
  dir: 1 | -1;
  pivot: 'ground' | 'center';
  eyes: Eyes;
  look: number; // 瞳孔水平偏移（局部坐标，面右为正）
  lean: number; // 前倾弧度（绕脚底，朝局部 +x）
  earFlat: number; // 耳压平 0-1
  headTilt: number; // 头部附加旋转
  tongue: number; // 吐舌 0-1
  headDy: number; // 头部附加下沉（下蹲预备）
  flipFrame: number; // 翻面 snap 帧（供对照表）
};

/** 跳跃质心弧线（Catmull-Rom 控制点，帧,x,y）。 */
const JUMP: PathTab = [
  [153, 700, 556], [156, 742, 496], [159, 795, 444], [162, 855, 410],
  [165, 915, 396], [168, 962, 392], [171, 988, 394], [172, 996, 396],
];

/** 拍杯三次的击出帧（与 audio/sfx/cues.json 对齐）。 */
export const SWIPES = [202, 218, 234];

/** 拍杯相位：wind(前5帧)→hit(3)→hold(3)→back(5)。 */
export function pawReach(f: number): {k: 'wind' | 'hit' | 'hold' | 'back'; q: number; f0: number} | null {
  for (const f0 of SWIPES) {
    if (f >= f0 - 5 && f < f0 + 11) {
      if (f < f0) return {k: 'wind', q: ease.inOut(seg(f, f0 - 5, f0)), f0};
      if (f < f0 + 3) return {k: 'hit', q: ease.out(seg(f, f0, f0 + 3)), f0};
      if (f < f0 + 6) return {k: 'hold', q: 1, f0};
      return {k: 'back', q: ease.inOut(seg(f, f0 + 6, f0 + 11)), f0};
    }
  }
  return null;
}

/** 闹钟三响的爆发帧（锤体敲击窗口 [b,b+5)，f62 第三遍最强）。 */
export const RINGS = [2, 24, 62];
export function ringAt(f: number): {i: number; q: number; strength: number} | null {
  for (let i = 0; i < RINGS.length; i++) {
    const b = RINGS[i];
    if (f >= b && f < b + 6) return {i, q: (f - b) / 6, strength: i === 2 ? 1 : 0.55};
  }
  return null;
}

export function catState(f: number, t: number): CatState {
  const s: CatState = {
    pose: SIT, x: WORLD.catFloor.x, y: WORLD.catFloor.ground, rot: 0, sx: 1, sy: 1,
    dir: 1, pivot: 'ground', eyes: 'closed', look: 0, lean: 0, earFlat: 0, headTilt: 0,
    tongue: 0, headDy: 0, flipFrame: 176,
  };
  const breathe = Math.sin(t * 3) * 0.006;

  if (f < 100) { // —— 楼板睡觉，闹钟三响 ——
    s.sy = 1 + breathe;
    s.eyes = 'closed';
    if (f >= 30 && f < 62) s.eyes = 'closed'; // 前两遍不理
    if (f >= 62) { s.earFlat = seg(f, 62, 68) * (1 - seg(f, 88, 100)); s.headDy = 4 * seg(f, 62, 70); } // 第三遍：耳压平、头埋一点
  } else if (f < 135) { // —— 踮脚伸懒腰（S02）——
    const crouch = seg(f, 100, 108), rise = ease.inOut(seg(f, 108, 124)), settle = ease.inOut(seg(f, 124, 135));
    const up = rise * (1 - settle);
    s.pose = mixPose(mixPose(SIT, STRETCH, up), SIT, settle > 0 ? 0 : 0);
    s.pose = mixPose(SIT, STRETCH, up);
    s.sy = lerp(lerp(1 - 0.12 * ease.inOut(crouch), 1.06, up), 1, settle);
    s.sx = lerp(lerp(1 + 0.06 * ease.inOut(crouch), 0.96, up), 1, settle);
    s.headDy = 8 * ease.inOut(crouch) * (1 - up);
    s.eyes = f >= 106 ? 'open' : 'closed'; // 伸懒腰时睁眼
  } else if (f < 146) { // —— 两段小跳接近床头柜 ——
    const h1 = seg(f, 136, 141), h2 = seg(f, 141, 146);
    const hop = Math.max(h1, h2);
    s.x = f < 141 ? lerp(560, 640, h1) : lerp(640, 700, h2);
    const arc = Math.sin(Math.PI * (f < 141 ? h1 : h2));
    s.y = WORLD.catFloor.ground - arc * 34;
    s.pivot = 'center';
    s.rot = -0.18 * arc;
    s.pose = mixPose(SIT, LEAP, 0.45 * arc);
    s.sx = 1 + 0.06 * arc;
    s.sy = 1 - 0.05 * arc;
    s.eyes = 'open';
  } else if (f < 184) { // —— 跳上床头柜 ——
    if (f < 150) { // 预备下蹲（绕脚轴：脚不离地）
      const q = ease.inOut(seg(f, 146, 150));
      s.x = 700;
      s.sy = 1 - 0.14 * q;
      s.sx = 1 + 0.07 * q;
      s.headDy = 8 * q;
      s.eyes = 'wide';
    } else if (f < 153) { // 蹬地：切绕质心、上扬拉长
      const q = seg(f, 150, 153);
      [s.x, s.y] = path(f, JUMP);
      s.pivot = 'center';
      s.pose = mixPose(SIT, LEAP, ease.in(q) * 0.45);
      s.rot = -0.72 * ease.out(q);
      s.sy = lerp(0.86, 1.12, ease.out(q));
      s.sx = lerp(1.07, 0.92, ease.out(q));
      s.eyes = 'wide';
    } else if (f < 172) { // 腾空弧线：质心走实测点，rot=切线角×0.8，落地前放平
      [s.x, s.y] = path(f, JUMP);
      s.pivot = 'center';
      const a = path(f + 0.5, JUMP), b = path(f - 0.5, JUMP);
      const tang = Math.atan2(a[1] - b[1], a[0] - b[0]);
      s.pose = mixPose(SIT, LEAP, clamp(0.45 + seg(f, 153, 158) * 0.55));
      s.rot = tang * 0.8 * (1 - 0.85 * ease.inOut(seg(f, 166, 172)));
      const st = seg(f, 161, 167);
      s.sx = lerp(0.95, 1.12, st);
      s.sy = lerp(1.08, 0.9, st);
      if (f > 170) { // 前爪先着
        const q = seg(f, 170, 172);
        s.pose = mixPose(s.pose, LAND, q);
        s.sx = lerp(s.sx, 1.0, q);
        s.sy = lerp(s.sy, 1.0, q);
      }
      s.eyes = 'wide';
    } else { // 落桌挤压 → f176 最扁帧翻面 snap → 坐起
      s.pivot = 'ground';
      s.x = kf(f, [[172, 1000], [174, 1006], [176, 1000], [180, 1000]], ease.out);
      s.dir = f >= 176 ? -1 : 1;
      s.pose = f < 177 ? LAND : mixPose(LAND, SIT, ease.out(seg(f, 177, 184)));
      s.sy = kf(f, [[172, 0.86], [174, 0.74], [176, 0.7], [178, 0.92], [181, 1.06], [183, 0.98], [184, 1]], ease.inOut);
      s.sx = kf(f, [[172, 1.12], [174, 1.18], [176, 1.15], [178, 1.0], [181, 0.96], [184, 1]], ease.inOut);
      s.y = WORLD.catTable.ground - s.pose.gy; // 脚底钉在台面
      s.eyes = f >= 180 ? 'open' : 'wide';
    }
  } else if (f < 193) { // —— 盯杯子（前倾+瞳孔偏移）——
    s.pose = SIT;
    s.x = WORLD.catTable.x;
    s.y = WORLD.catTable.ground - SIT.gy;
    s.dir = -1;
    s.eyes = 'open';
    s.lean = 0.08 * ease.inOut(seg(f, 184, 190));
    s.look = 4; // 局部 +x = 面向杯子的方向
  } else if (f < 246) { // —— 三次拍杯 ——
    s.pose = SIT;
    s.x = WORLD.catTable.x;
    s.y = WORLD.catTable.ground - SIT.gy;
    s.dir = -1;
    s.eyes = 'open';
    s.look = 4;
    // 空档盯杯微倾；拍杯相位里 lean 由 actors 按反算目标二次覆写
    const pr = pawReach(f);
    s.lean = pr ? 0.12 : 0.08 * (1 - seg(f, 240, 246));
  } else if (f < 275) { // —— 杯落碎裂 + 惊呼 ——
    s.pose = SIT;
    s.x = WORLD.catTable.x + 6 * seg(f, 264, 268); // 吓得后缩
    s.y = WORLD.catTable.ground - SIT.gy;
    s.dir = -1;
    if (f < 264) {
      s.eyes = 'wide';
      s.lean = 0.16; // 探身看杯子掉下去
      s.look = 5;
    } else { // 惊呼：大眼大嘴、头后仰、紧张线（actors 画）
      s.eyes = 'gasp';
      s.headTilt = 0.14 * ease.outBack(seg(f, 264, 269));
      s.earFlat = 1;
      s.sx = 1 + 0.03 * Math.sin(f * 1.9) * (1 - seg(f, 270, 275)); // 发抖
    }
  } else if (f < 285) { // —— 心虚缩脖 ——
    s.pose = SIT;
    s.x = WORLD.catTable.x + 6;
    s.y = WORLD.catTable.ground - SIT.gy;
    s.dir = -1;
    s.eyes = 'closed';
    s.earFlat = 1 - 0.4 * seg(f, 282, 285);
    s.sx = 0.97;
    s.headDy = 6;
  } else if (f < 310) { // —— 舔爪两遍（S04）——
    const lift = ease.inOut(seg(f, 285, 290));
    s.pose = mixPose(SIT, LICK, lift);
    s.x = WORLD.catTable.x + 6;
    s.y = WORLD.catTable.ground - mixPose(SIT, LICK, lift).gy;
    s.dir = -1;
    s.eyes = 'closed';
    s.tongue = Math.max(ease.out(seg(f, 289, 292)) * (1 - ease.in(seg(f, 294, 297))), ease.out(seg(f, 299, 302)) * (1 - ease.in(seg(f, 304, 307))));
    s.headTilt = 0.06 * lift;
  } else if (f < 347) { // —— 得意收势 ——
    const q = ease.inOut(seg(f, 310, 316));
    s.pose = mixPose(LICK, SIT, q);
    s.x = WORLD.catTable.x + 6;
    s.y = WORLD.catTable.ground - SIT.gy;
    s.dir = -1;
    s.eyes = 'happy';
    s.sy = 1 + breathe;
  } else { // —— 定帧（f347-383，1.2s）：姿态锁死，只留微动效 ——
    s.pose = SIT;
    s.x = WORLD.catTable.x + 6;
    s.y = WORLD.catTable.ground - SIT.gy;
    s.dir = -1;
    s.eyes = 'happy';
    s.sy = 1;
  }
  return s;
}

/** 杯子状态：桌上被拍→出沿倾倒→坠落→碎（null）。x 表与拍击帧对齐。 */
const CUPX: Array<[number, number]> = [[193, 858], [202, 838], [206, 844], [210, 838], [218, 812], [222, 818], [226, 812], [234, 776], [240, 770], [244, 766]];
const FALL: PathTab = [
  [247, 766, 437], [250, 762, 490], [253, 757, 545], [256, 752, 600],
  [259, 749, 628], [262, 748, 640],
];

export type CupState =
  | {phase: 'table'; x: number; rot: number}
  | {phase: 'fall'; x: number; y: number; rot: number}
  | null;

export function cupState(f: number): CupState {
  if (f < 244) {
    const x = kf(f, CUPX, ease.linear);
    // 被拍的晃动：每次击出帧后阻尼摆（签名④ 复用）
    let rot = 0;
    for (const f0 of SWIPES) {
      if (f >= f0) {
        const dt = f - f0;
        rot += 0.06 * Math.exp(-dt / 6) * Math.sin((dt / 7) * Math.PI * 2) * (f0 === 234 ? 1.6 : 1);
      }
    }
    return {phase: 'table', x, rot};
  }
  if (f < 262) {
    const q = seg(f, 244, 247);
    if (f < 247) { // 倾倒：绕桌沿转
      return {phase: 'table', x: lerp(766, 762, q), rot: -0.55 * ease.in(q)};
    }
    const [x, y] = path(f, FALL);
    return {phase: 'fall', x, y, rot: -0.55 - 2.1 * Math.pow(seg(f, 247, 262), 1.3)};
  }
  return null; // 已碎（shatter FX 接管）
}
