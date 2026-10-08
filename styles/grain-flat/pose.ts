// 猫姿势库（签名① mixPose 逐数值插值）+ 绕脚轴挤压拉伸变换链（签名②）+ 翻面 snap（签名③）。
// 每姿势一组局部关键点（朝右、原点=质心）：body 10 点 / chest 6 点 / haunch 椭圆 / stripes 3 段 /
// head [x,y,rx,ry] / front 两条前腿 [肩x,肩y,爪x,爪y] / hind 后腿 / tail 4 贝塞尔点 / ear 耳角 / gy 脚底到质心。
// 变换链 translate(质心) → [绕脚底] rotate → scale(dir·sx, sy)：挤压拉伸绕脚底，蹲下时脚不离地。
// 技法借鉴 huashu-art-motion (MIT) scenes/16_2026.js 姿势库/mixPose/变换链，TSX 重写（点位全为新排）。
import type {CanvasCtx} from './types';

export type Pose = {
  body: Array<[number, number]>;
  chest: Array<[number, number]>;
  haunch: [number, number, number, number];
  stripes: Array<[number, number, number, number]>;
  head: [number, number, number, number];
  front: Array<[number, number, number, number]>;
  hind: [number, number, number, number];
  tail: Array<[number, number]>;
  ear: number;
  tipW: number;
  gy: number;
};

/** 地坐（地上/桌上通用，面右）。 */
export const SIT: Pose = {
  body: [[-105, 88], [-108, 38], [-88, -8], [-40, -46], [20, -52], [70, -38], [98, -2], [106, 44], [92, 88], [0, 92]],
  chest: [[36, -38], [74, -24], [84, 16], [74, 62], [38, 64], [26, 8]],
  haunch: [-62, 40, 58, 48],
  stripes: [[-52, -44, -46, -22], [-84, -20, -78, 4], [-96, 26, -86, 44]],
  head: [96, -66, 62, 54],
  front: [[70, 10, 86, 84], [36, 10, 48, 84]],
  hind: [-70, 72, -116, 88],
  tail: [[-112, 76], [-160, 90], [-178, 132], [-140, 138]],
  ear: 0, tipW: 1, gy: 92,
};

/** 踮脚伸懒腰（起身拉高、前爪上够、后脚踮起）。 */
export const STRETCH: Pose = {
  body: [[-98, 92], [-104, 44], [-92, -6], [-56, -52], [-4, -84], [52, -86], [92, -56], [106, -4], [98, 58], [86, 92]],
  chest: [[20, -70], [64, -52], [80, -8], [74, 40], [34, 48], [14, -16]],
  haunch: [-66, 52, 52, 44],
  stripes: [[-58, -40, -50, -18], [-88, -8, -80, 16], [-98, 34, -88, 50]],
  head: [78, -118, 58, 50],
  front: [[40, -70, 100, -186], [8, -64, 28, -178]],
  hind: [-64, 84, -104, 92],
  tail: [[-104, 84], [-150, 98], [-168, 138], [-132, 144]],
  ear: -0.15, tipW: 1, gy: 94,
};

/** 踮脚够杯子（直立、前爪伸向上前方）。 */
export const REACH: Pose = {
  body: [[-88, 88], [-96, 40], [-86, -4], [-56, -48], [-6, -72], [46, -74], [88, -48], [104, 0], [96, 52], [84, 88]],
  chest: [[14, -58], [58, -44], [74, -2], [66, 44], [28, 50], [10, -12]],
  haunch: [-62, 56, 48, 38],
  stripes: [[-52, -36, -46, -14], [-80, -4, -74, 18], [-92, 32, -84, 46]],
  head: [62, -104, 56, 48],
  front: [[28, -62, 62, -148], [-6, -58, 28, -142]],
  hind: [-58, 84, -96, 92],
  tail: [[-96, 80], [-142, 94], [-160, 132], [-124, 138]],
  ear: -0.1, tipW: 1, gy: 90,
};

/** 腾空（水平拉长）。 */
export const LEAP: Pose = {
  body: [[-122, 14], [-116, -22], [-78, -44], [-2, -48], [68, -42], [112, -20], [120, 14], [88, 36], [0, 40], [-88, 36]],
  chest: [[56, 8], [108, -2], [116, 22], [82, 38], [40, 36], [38, 20]],
  haunch: [-78, 8, 46, 36],
  stripes: [[-58, -44, -54, -26], [-22, -46, -18, -28], [16, -45, 18, -28]],
  head: [148, -44, 56, 50],
  front: [[82, 18, 180, 34], [64, 16, 166, 46]],
  hind: [-90, 16, -186, 40],
  tail: [[-120, -4], [-170, -20], [-212, -42], [-248, -28]],
  ear: 0.35, tipW: 0, gy: 40,
};

/** 落地（前爪向下接桌）。 */
export const LAND: Pose = {
  ...LEAP,
  body: LEAP.body.map(([x, y]) => [x * 0.92, y * 1.08] as [number, number]),
  front: [[84, 18, 118, 74], [66, 16, 98, 76]] as Array<[number, number, number, number]>,
  hind: [-90, 16, -148, 56] as [number, number, number, number],
  head: [138, -30, 58, 52] as [number, number, number, number],
  ear: 0.1,
  gy: 76,
};

/** 舔爪（坐姿、近侧前爪抬到嘴边）。 */
export const LICK: Pose = {
  ...SIT,
  head: [96, -58, 62, 54] as [number, number, number, number],
  front: [[70, 10, 152, -30], [36, 10, 48, 84]] as Array<[number, number, number, number]>,
  ear: -0.05,
};

/** 递归逐数值 lerp：嵌套数组结构完全一致，纯数值混合（签名①）。 */
export function mixA(a: unknown, b: unknown, q: number): unknown {
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => mixA(v, b[i], q));
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * q;
  return q < 0.5 ? a : b;
}

export function mixPose(a: Pose, b: Pose, q: number): Pose {
  return mixA(a, b, q) as Pose;
}

export type CatTransform = {
  x: number;
  y: number; // 质心世界坐标
  rot: number;
  sx: number;
  sy: number;
  dir: 1 | -1;
  pivot: 'ground' | 'center';
};

/** 变换链（签名②）：translate(质心) → 绕脚底 rotate → scale(dir·sx, sy)。
 *  pivot='ground' 时旋转/缩放轴钉在脚底（gy），蹲下脚不离地；腾空用 'center'。 */
export function applyCatTransform(c: CanvasCtx, t: CatTransform, gy: number): void {
  c.translate(t.x, t.y);
  if (t.pivot === 'ground') {
    c.translate(0, gy);
    c.rotate(t.rot);
    c.scale(t.dir * t.sx, t.sy);
    c.translate(0, -gy);
  } else {
    c.rotate(t.rot);
    c.scale(t.dir * t.sx, t.sy);
  }
}

/** 翻面纪律（签名③）：dir 翻转必须在压到最扁的那一帧一次 snap（+1→-1），
 *  不做 2-3 帧的 scaleX 插值「纸片翻转」。调用方保证仅在 squash 最深帧切换一次。 */
export function flipSnapAt(t: CatTransform, frame: number, flattenFrame: number): 1 | -1 {
  return frame >= flattenFrame ? -1 : 1;
}
