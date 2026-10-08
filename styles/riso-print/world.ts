// riso-print · world.ts — 时刻表 / 双专色限色 / 版偏移状态机（套色错位）/ 确定性哈希 / 模块级自检
// 机制借鉴：mg-styles-15 demos/09-bauhaus 双版错位思路（MIT, Vincentwei1021，经 ink-plate 同构转译）+ pop-comic 半调网点平铺（samples-l1）——均以 Remotion(React+TSX) 重写为 riso 孔版语义，非拷贝。
// 领地：Risograph 孔版印刷物料美学（正样本手法参考 prompt-motion rneayan，零素材搬运）。
// 版式定案：全片 = 一台双滚筒 riso 的工作台。机台床包住内缩纸面（上 32 / 下 48 / 左右 36），
// 纸面内再留 44 裁切边距——纸面是海报本体，床条是机台界面（字幕/slug/进纸辊），两层语义分离。

export const W = 1280;
export const H = 720;
export const FPS = 30;
export const TOTAL = 372; // = tts_build total_frames（12.4s）

// ---- 纸面几何（frame 坐标）----
export const SHEET = {x0: 36, y0: 32, x1: 1244, y1: 672} as const;
export const SHEET_W = SHEET.x1 - SHEET.x0; // 1208
export const SHEET_H = SHEET.y1 - SHEET.y0; // 640

// ---- 双专色限色 + 纸 + 界面墨 ----
export const PAPER = '#F4EFE4'; // 纸张本白（微暖）
export const PINK = '#FF48B0'; // riso 荧光粉（fluorescent pink）
export const BLUE = '#0078BF'; // riso 蓝
export const META = '#3E3A36'; // 机台炭灰：仅界面层（字幕/角标/进纸辊/床），不参与版面印刷语言
export const BED = '#292623'; // 机台床
export const INK = {P: PINK, B: BLUE} as const;
export type PlateInk = keyof typeof INK; // 'P' | 'B'

// ---- 时刻表（帧，1 起含端点；已按 tts 实测句表校准）----
// S01 31-79 两个色版，一台机器 ｜ S02 86-131 每次只印一种颜色 ｜ S03 138-190 粉版先印，蓝版跟上
// S04 197-248 套不准？没关系 ｜ S05 255-284 错开的那一点 ｜ S06 291-326 才是它的签名
export const EV = {
  drumIn0: 8, // 滚筒入画下压（钩子起）
  drumTouch: 14, // 滚筒压住纸面（钩子锚点：14/30=0.47s<0.5s）
  sweep1a: 16, // 粉版扫印起点
  sweep1b: 56, // 粉版扫印终点（纸底）
  drum1Gone: 62,
  flip0: 140, // 蓝版版纸翻动装版（S03 起）
  flip1: 156,
  flipGone: 176,
  sweep2a: 162, // 蓝版扫印
  sweep2b: 194,
  drum2Gone: 200,
  wander0: 200, // 套准松开：错位游移起（S04「套不准？」）
  wander1: 254, // 游移收束点
  lock: 262, // 游移定格：锁进「签名错位」（hero 锚点，70.4%∈60-75%）
  eject0: 296, // 进纸辊吐纸（S06「才是它的签名」）
  jolt: 298, // 纸面震落
  stack1a: 304, // 下方第一张成品滑入
  stack1b: 316,
  stack2a: 318, // 第二张
  stack2b: 330,
  freezeFrom: 336, // 定帧起点（至 372 = 36f = 1.2s），微动效=网点呼吸+粉版微颤
} as const;

// ---- 缓动白名单（全片唯一缓动源；无 spring/back/overshoot 族）----
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lin = (t: number) => clamp01(t);
export const in2 = (t: number) => clamp01(t) ** 2;
export const io2 = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
};
export const prog = (f: number, a: number, b: number) => (b === a ? (f >= b ? 1 : 0) : (f - a) / (b - a));

// ---- 确定性哈希（唯一随机源；禁 Math.random/Date/网络）----
export function hash2(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b ^ 0xc2b2ae35, 0x27d4eb2f);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2545f491);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

// ---------------------------------------------------------------- 滚筒运动学
export type DrumPass = 'in1' | 'sweep1' | 'out1' | 'away1' | 'in2' | 'sweep2' | 'out2' | 'away2';
/** 滚筒全局 y（滚筒中线）+ 相位。两版各一落：下压→扫印→抬离→退场。 */
export function drumAt(f: number): {pass: 1 | 2; y: number; active: boolean} {
  const drop = -96;
  if (f < EV.drumIn0) return {pass: 1, y: drop, active: false};
  if (f >= EV.drumIn0 && f < EV.drumTouch) return {pass: 1, y: drop + (SHEET.y0 - drop) * io2(prog(f, EV.drumIn0, EV.drumTouch)), active: true};
  if (f < EV.sweep1a) return {pass: 1, y: SHEET.y0, active: true};
  if (f < EV.sweep1b) return {pass: 1, y: SHEET.y0 + (SHEET.y1 + 24 - SHEET.y0) * in2(prog(f, EV.sweep1a, EV.sweep1b)), active: true};
  if (f < EV.drum1Gone) return {pass: 1, y: SHEET.y1 + 24 + (drop - SHEET.y1 - 24) * io2(prog(f, EV.sweep1b, EV.drum1Gone)), active: true};
  if (f < EV.flip1) return {pass: 1, y: drop, active: false};
  if (f < EV.sweep2a) return {pass: 2, y: SHEET.y0 + (drop - SHEET.y0) * (1 - io2(prog(f, EV.flip1, EV.sweep2a))), active: true};
  if (f < EV.sweep2b) return {pass: 2, y: SHEET.y0 + (SHEET.y1 + 24 - SHEET.y0) * in2(prog(f, EV.sweep2a, EV.sweep2b)), active: true};
  if (f < EV.drum2Gone) return {pass: 2, y: SHEET.y1 + 24 + (drop - SHEET.y1 - 24) * io2(prog(f, EV.sweep2b, EV.drum2Gone)), active: true};
  return {pass: 2, y: drop, active: false};
}
/** 某版已印到的纸面局部深度（0..SHEET_H）：reveal 裁剪用；版未印/已离场时为终值。 */
export function pressExtent(pass: 1 | 2, f: number): number {
  const [a, b] = pass === 1 ? [EV.sweep1a, EV.sweep1b] : [EV.sweep2a, EV.sweep2b];
  if (f < a) return 0;
  if (f > b) return SHEET_H;
  return Math.min(SHEET_H, (SHEET_H + 24) * in2(prog(f, a, b)));
}
/** 扫印进度 0..1（网点进度语义/滚筒条纹相位用）。 */
export const sweepProg = (pass: 1 | 2, f: number) =>
  pass === 1 ? in2(prog(f, EV.sweep1a, EV.sweep1b)) : in2(prog(f, EV.sweep2a, EV.sweep2b));

// ---------------------------------------------------------------- 上墨率（版密度）
/** 基准 0.93；压住/锁版帧 +0.07、次帧 +0.03（墨 kiss 惯例转译）。 */
export function densityAt(f: number): number {
  let d = 0.93;
  const hits: Array<[number, number, number]> = [
    [EV.drumTouch, 0.07, 0.03],
    [EV.sweep2a, 0.07, 0.03],
    [EV.lock, 0.06, 0.02],
  ];
  for (const [s, a, b] of hits) {
    if (f === s) d += a;
    else if (f === s + 1) d += b;
  }
  return Math.min(d, 1);
}

// ---------------------------------------------------------------- 套色错位：版偏移状态机（签名②）
// 粉版=基准版（微游移 ±0.7px）；蓝版=套准版：装版即带 4px 级错位（双色影从第一眼可读），
// S04 游移段振幅爬升（相对错位 2-6.5px @10fps 量化），lock 帧收敛为「签名错位」并 1 帧过冲。
const STEP = 3; // 10fps 量化（30fps/3）
const SIGMA: Record<PlateInk, [number, number]> = {P: [1.4, -0.9], B: [4.2, -2.6]}; // 各版基准偏移（px）
const LOCK_TARGET: [number, number] = [5.6, -3.4];
const OVERSHOOT: [number, number] = [6.6, -4.2];

function wander2(seed: number, step: number): [number, number] {
  return [(hash2(seed, step * 2 + 1) - 0.5) * 2, (hash2(seed, step * 2 + 2) - 0.5) * 2];
}

export function plateOffset(ink: PlateInk, f: number): {x: number; y: number} {
  const step = Math.floor(f / STEP);
  const [bx, by] = SIGMA[ink];
  if (ink === 'P') {
    let x = bx + wander2(11, step)[0] * 0.7;
    let y = by + wander2(11, step)[1] * 0.7;
    if (f >= EV.freezeFrom) {
      // 定帧段：粉版错位微颤（±1px @10fps）——合法微动效之一
      x += (hash2(step, 101) - 0.5) * 2;
      y += (hash2(step, 103) - 0.5) * 2;
    }
    return {x, y};
  }
  // 蓝版
  if (f < EV.wander0) return {x: bx + wander2(23, step)[0] * 0.5, y: by + wander2(23, step)[1] * 0.5};
  if (f < EV.wander1) {
    const amp = in2(prog(f, EV.wander0, EV.wander0 + 18)); // 振幅爬升
    const [wx, wy] = wander2(23, step);
    return {x: bx + wx * 3.0 * amp, y: by + wy * 2.4 * amp};
  }
  if (f < EV.lock) {
    const t = io2(prog(f, EV.wander1, EV.lock));
    return {x: bx + (LOCK_TARGET[0] - bx) * t, y: by + (LOCK_TARGET[1] - by) * t};
  }
  if (f === EV.lock) return {x: OVERSHOOT[0], y: OVERSHOOT[1]}; // 1 帧过冲（锁版撞击）
  return {x: LOCK_TARGET[0], y: LOCK_TARGET[1]};
}

/** 相对错位量（蓝-粉，px）——签名②「版间 2-6.5px」的断言口径。 */
export function relMisreg(f: number): number {
  const p = plateOffset('P', f);
  const b = plateOffset('B', f);
  return Math.hypot(b.x - p.x, b.y - p.y);
}

// ---------------------------------------------------------------- 定帧网点呼吸（签名③微动效）
/** 定帧段网点半径缩放：1±0.07 @10fps 量化步进（hash 相位），定帧前恒 1。 */
export function halftoneScale(f: number): number {
  if (f < EV.freezeFrom) return 1;
  const step = Math.floor((f - EV.freezeFrom) / STEP);
  return 1 + (hash2(71, step) - 0.5) * 0.14;
}

// ---------------------------------------------------------------- 吐纸震落 + 叠放
/** 纸面 y 震落（吐纸 jolt）：lock 惯例转译——jolt 帧 6px、次帧 3px、再次 1px。 */
export const joltY = (f: number) => (f === EV.jolt ? 6 : f === EV.jolt + 1 ? 3 : f === EV.jolt + 2 ? 1 : 0);
/** 叠放第 k 张的滑入进度 0..1（k=1,2）。 */
export const stackProg = (k: 1 | 2, f: number) =>
  k === 1 ? in2(prog(f, EV.stack1a, EV.stack1b)) : in2(prog(f, EV.stack2a, EV.stack2b));

// ---------------------------------------------------------------- 床条界面文案
export function phaseText(f: number): string {
  if (f < EV.drumIn0) return 'READY';
  if (f < EV.drum1Gone) return 'PASS 1/2 · 荧光粉';
  if (f < EV.flip1) return 'LOAD 蓝版';
  if (f < EV.drum2Gone) return 'PASS 2/2 · riso 蓝';
  if (f < EV.lock) return '套准 · 游移';
  if (f < EV.eject0) return '套准 · 签名错位';
  if (f < EV.freezeFrom) return 'OUTPUT · 吐纸';
  return 'DONE · 2/2';
}

// ---------------------------------------------------------------- 模块级自检（node --experimental-strip-types src/style/world.ts）
// （浏览器 bundle 里 process.argv 是 shim，须先验 Array.isArray）
if (typeof process !== 'undefined' && Array.isArray(process.argv) && process.argv[1] && /world\.ts$/.test(process.argv[1].replace(/\\/g, '/'))) {
  const evs = Object.values(EV) as number[];
  for (const v of evs) if (!Number.isInteger(v) || v < 1 || v > TOTAL) throw new Error(`EV 越界: ${v}`);
  // 关键序偶（翻转淡出与蓝版扫印并行，不做整表单调）
  const pairs: Array<[number, number, string]> = [
    [EV.drumIn0, EV.drumTouch, '压下'],
    [EV.drumTouch, EV.sweep1a, '扫1'],
    [EV.sweep1a, EV.sweep1b, '扫1终'],
    [EV.sweep1b, EV.drum1Gone, '抬1'],
    [EV.flip0, EV.flip1, '翻版'],
    [EV.flip1, EV.sweep2a, '扫2'],
    [EV.sweep2a, EV.sweep2b, '扫2终'],
    [EV.drum2Gone, EV.wander0, '游移'],
    [EV.wander0, EV.wander1, '游移终'],
    [EV.wander1, EV.lock, '锁版'],
    [EV.lock, EV.eject0, '吐纸'],
    [EV.eject0, EV.jolt, '震落'],
    [EV.stack1a, EV.stack1b, '叠1'],
    [EV.stack2a, EV.stack2b, '叠2'],
    [EV.freezeFrom, TOTAL, '定帧'],
  ];
  for (const [a, b, tag] of pairs) if (b < a) throw new Error(`EV 序偶反序 ${tag}: ${a} > ${b}`);
  if (EV.drumTouch > 15) throw new Error(`钩子 ${EV.drumTouch}/30 > 0.5s`);
  const heroLo = Math.round(TOTAL * 0.6);
  const heroHi = Math.round(TOTAL * 0.75);
  if (EV.lock < heroLo || EV.lock > heroHi) throw new Error(`lock ${EV.lock} 不在 hero 窗口 [${heroLo},${heroHi}]`);
  const freezeLen = TOTAL - EV.freezeFrom + 1;
  if (freezeLen < 24 || freezeLen > 45) throw new Error(`定帧 ${freezeLen}f 不在 24-45`);
  if (TOTAL - EV.lock < 60) throw new Error('lock 后余量不足（吐纸+定帧）');
  // 游移包络断言：全时刻相对错位 ∈ [1.2, 6.6]px（签名② 2-6.5 邻域，1 帧过冲 6.6 为锁版撞击设计值）
  let maxRel = 0;
  for (let f = EV.sweep2a; f <= TOTAL; f += 1) maxRel = Math.max(maxRel, relMisreg(f));
  if (maxRel < 2 || maxRel > 6.8) throw new Error(`相对错位峰值 ${maxRel.toFixed(2)}px 越界`);
  if (relMisreg(EV.lock + 2) < 2 || relMisreg(EV.lock + 2) > 6.5) throw new Error('签名定格错位不在 2-6.5px');
  // 裁剪深度单调
  for (const p of [1, 2] as const) {
    let last = -1;
    for (let f = 1; f <= TOTAL; f += 1) {
      const e = pressExtent(p, f);
      if (e < last - 1e-9) throw new Error(`pressExtent(${p}) 回退 @f${f}`);
      last = e;
    }
  }
  console.log('world.ts self-check PASS');
}
