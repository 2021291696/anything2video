// 帧级状态机 / 镜头表 / 幕震 —— 从 Scene.tsx 拆出的编舞状态层（纯帧号函数，seeded）。
import {hs, lerp, inv, sstep, K, type Key} from './engine';
import {bv} from './cadence';
import type {DrawInfo} from './types';

export const STICK = 190;

export type Shot = {s: number; px: number; py: number; X: number; Y: number};
const WIDE: Shot = {s: 1.0, px: 640, py: 360, X: 640, Y: 360};
const CLOSE: Shot = {s: 2.15, px: 780, py: 512, X: 640, Y: 392};
const HERO: Shot = {s: 1.3, px: 750, py: 468, X: 640, Y: 386};
const END: Shot = {s: 1.42, px: 800, py: 505, X: 640, Y: 398};
export const shotFor = (f: number): Shot => (f < 104 ? WIDE : f < 202 ? CLOSE : f < 270 ? HERO : END);

export const BOX = {px: 830, py: 560, x0: -330, x1: 330, y1: -88, y2: 0, dx: 42, dy: -92};
export function boxState(f: number): {x: number; y: number; sy: number; sx: number} {
  const u = inv(38, 50, f);
  const x = 560 * (1 - K(u, [[0, 0], [1, 1, 'out2']] as Key[]));
  const sq = f >= 50 && f < 53 ? 0.035 * Math.exp(-(f - 50) * 0.9) * Math.cos((f - 50) * 2.2) : 0;
  return {x, y: 0, sy: 1 - sq, sx: 1 + sq * 0.5};
}

export type MatchPose = {hx: number; hy: number; r: number; bend: number; sy?: number; charU: number};
export const BUTT_OF = (s: MatchPose): number[] => [s.hx - Math.sin(s.r) * STICK, s.hy + Math.cos(s.r) * STICK];
export const TIP_OF = (s: MatchPose): number[] => [s.hx - Math.sin(s.r) * STICK * s.charU, s.hy + Math.cos(s.r) * STICK * s.charU];

const IMPACTS: Array<{f: number; amp: number; dur?: number}> = [
  {f: 3, amp: 6, dur: 6}, {f: 104, amp: 4, dur: 5}, {f: 167, amp: 5, dur: 6},
  {f: 217, amp: 13, dur: 9}, {f: 231, amp: 3, dur: 4}, {f: 248, amp: 3, dur: 4}, {f: 270, amp: 4, dur: 5},
];
export function shakeAt(f: number): [number, number] {
  let x = 0, y = 0;
  for (const im of IMPACTS) {
    const dur = im.dur ?? 6;
    if (f < im.f || f > im.f + dur) continue;
    const u = (f - im.f) / dur;
    const a = im.amp * Math.pow(1 - u, 2);
    x += (hs(f, 1, im.f) - 0.5) * 2 * a;
    y += (hs(f, 2, im.f) - 0.5) * 2 * a;
  }
  return [x, y];
}

export function matchPose(f: number, D: DrawInfo): MatchPose {
  const tremble = Math.sin(D.fq * 2.6) * 2.0;
  if (f < 104) { // WIDE：拍入 + 躺姿
    const lie: MatchPose = {hx: 348, hy: 584, r: -0.93, bend: 4, charU: 0};
    if (f < 3) return lie;
    const k = f - 3;
    if (k === 0) return {hx: 452, hy: 492, r: -0.62, bend: 0, sy: 1.26, charU: 0}; // 空中拉伸
    if (k === 1) return {hx: lie.hx, hy: lie.hy + 6, r: lie.r, bend: 6, sy: 0.93, charU: 0}; // 压扁
    if (k === 2) return {hx: lie.hx, hy: lie.hy, r: lie.r, bend: 4, sy: 1.045, charU: 0};
    if (k === 3) return {hx: lie.hx, hy: lie.hy, r: lie.r, bend: 4, sy: 0.99, charU: 0};
    const wake = f >= 84 ? Math.sin(D.fq * 0.9) * 0.014 : 0;
    return {...lie, r: lie.r + wake, bend: 4 + (f >= 84 ? Math.sin(D.fq * 1.3) * 1.5 : 0)};
  }
  if (f < 202) { // CLOSE：预备 + 擦燃 + 点火
    const u = sstep(110, 125, D.fq);
    if (f < 126) {
      return {hx: 640 - 42 * u + tremble * u, hy: 516 - 2 * u, r: 2.02 + 0.08 * u, bend: -16 * u, charU: 0};
    }
    const p = K(D.fq, [[126, 0], [146, 0.62, 'lin'], [160, 0.94, 'lin'], [166, 1, 'out2']] as Key[]);
    const r = 2.02 + 0.12 * p;
    return {hx: lerp(600, 986, p), hy: 516 - 3 * Math.sin(p * Math.PI), r, bend: 20, charU: f >= 172 ? 0.06 : 0};
  }
  // HERO/END：立插在盒顶（butt 固定，杆从下往上）
  const butt: [number, number] = [772, 506];
  const charU = f < 270
    ? K(f, [[202, 0.06], [269, 0.34]] as Key[])
    : K(f, [[270, 0.34], [320, 0.56], [361, 0.585]] as Key[]);
  const r = 0.06;
  return {
    hx: butt[0] + Math.sin(r) * STICK,
    hy: butt[1] - Math.cos(r) * STICK,
    r, bend: -2, charU,
  };
}
export function flameH(f: number): number {
  if (f < 166) return 0;
  if (f < 202) return K(f, [[166, 0], [167, 26], [172, 64], [175, 70], [201, 118]] as Key[]);
  if (f < 270) return K(f, [[202, 126], [212, 142], [217, 152], [269, 132]] as Key[]);
  return K(f, [[270, 126], [272, 84], [276, 40], [280, 14], [283, 0]] as Key[]);
}
export function poolR(f: number): number {
  if (f < 167) return 0;
  if (f < 202) return K(f, [[167, 0], [175, 90], [188, 170], [201, 205]] as Key[]);
  if (f < 270) return K(f, [[202, 215], [217, 300], [240, 292], [269, 252]] as Key[]);
  return K(f, [[270, 246], [278, 150], [288, 0]] as Key[]);
}
// 火灵跳步（HERO 段在盒顶横跳两段）
export function hopDx(f: number): {dx: number; hop: number; sq: number} {
  if (f >= 231 && f < 243) {
    const u = (f - 231) / 12;
    return {dx: 86 * u, hop: Math.sin(u * Math.PI) * 46, sq: u < 0.15 ? 0.9 : u > 0.85 ? 0.93 : 1 + 0.06 * Math.sin(u * Math.PI)};
  }
  if (f >= 248 && f < 259) {
    const u = (f - 248) / 11;
    return {dx: 86 * (1 - u), hop: Math.sin(u * Math.PI) * 40, sq: u < 0.15 ? 0.91 : 1};
  }
  return {dx: 0, hop: 0, sq: 1};
}
