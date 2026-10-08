// RevealOrder：按部件表依次写出的时序器（开场「画出来」的编舞表）。
// 笔墨引擎技法借鉴 huashu-art-motion 17_ink (MIT, alchaincyf), TSX 重写。
import {clamp} from './ink';

/** 部件：d = 开始落笔的局部时刻（秒），l = 写完这一笔的时长（秒） */
export interface RevealPart { d: number; l: number }

/**
 * 工厂：给定部件表，返回 (lt) => reveal[] —— 每个部件的 0..1 写出比例。
 * lt 建议用 f/FPS + 0.12（开场不从白纸开始：第 1 帧已经落下前几笔）。
 */
export function makeReveal(parts: RevealPart[]): (lt: number) => number[] {
  return (lt: number): number[] => parts.map((p) => clamp((lt - p.d) / (p.l || 1e-6)));
}

const sm = (v: number): number => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};
/** 平滑版 reveal（笔画两端减速，更像手写） */
export function makeRevealSmooth(parts: RevealPart[]): (lt: number) => number[] {
  const base = makeReveal(parts);
  return (lt: number): number[] => base(lt).map(sm);
}
