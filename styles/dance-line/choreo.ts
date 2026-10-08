// 编舞常量 —— dance-line。纯数学模块（零 React/零 remotion）：Scene.tsx 与 tests/bpm-assert.mjs 共享的单一事实源。
// 「一切跟 BPM」的相位表：各物绕自己着地点弹、相位错 0.25 拍（配方 31_haring 的编舞骨架，重写实现）。
import {BEAT_FRAMES} from './bpm';

/** 「音乐一响」：全场 bounce 启用帧（=BGM drop 4.0s=S02 首字 f120）。 */
export const MUSIC_F = 120;
/** 钩子：第一个小人硬切入墙帧（0.067s < 0.5s 纪律）。 */
export const HOOK_F = 3;

/** 墙内六席弹跳相位（拍）：主角席 0（主拍），其余错 0.25。 */
export const WALL_SEAT_PHASES = [0, 0.25, 0.5, 0.75, 0.25, 0.5] as const;
/** 主角（大红人）：主拍相位 0。 */
export const HERO_PHASE = 0;
/** 吠犬：错 0.75 拍。 */
export const DOG_PHASE = 0.75;
/** 红心：错 0.5 拍。 */
export const HEART_PHASE = 0.5;
/** 跳下的蓝/粉舞者：0.25 / 0.5 拍。 */
export const BLUE_PHASE = 0.25;
export const PINK_PHASE = 0.5;

/** 全场景相位清单（断言用：任何一帧至少一物在弹的验收集合）。 */
export const ALL_PHASES: number[] = [...WALL_SEAT_PHASES, HERO_PHASE, DOG_PHASE, HEART_PHASE, BLUE_PHASE, PINK_PHASE];

/** 跳下硬切起点（拍点邻帧）：主角 f142（beatFrame(10)=141.6）/ 蓝 f226（=226.0）/ 粉 f240（=240.1）。 */
export const HERO_LEAP_FROM = 142;
export const BLUE_LEAP_FROM = 226;
export const PINK_LEAP_FROM = 240;

/** 第 k 拍的 1 起帧号（含小数）；拍点帧表 = 全片内所有 k。 */
export function beatFramesUpTo(totalFrames: number): number[] {
  const out: number[] = [];
  for (let k = 0; 1 + k * BEAT_FRAMES <= totalFrames; k++) out.push(1 + k * BEAT_FRAMES);
  return out;
}
