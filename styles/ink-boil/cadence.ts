// 打帧节奏 DrawCadence —— 曝光表（exposure sheet）移植自 mg-styles-15 demos/05-cel-boil scene.js SCHED (MIT), TSX 重写。
// 30fps 成片帧号（1 起含端点）查表：普通动作「一拍二」、快动作「一拍一」、静止「一拍三」。
// drawing(f) 返回 {fq, id, step}：fq=本张 cel 的首帧、id=全片唯一张号（boil 重播种用）、step=曝光步长。

export const FPS = 30;

// [from, to, exposure] 2 = on twos, 1 = on ones, 3 = on threes
export const SCHED: Array<[number, number, number]> = [
  [1, 2, 2],      // 开场空纸（2s）
  [3, 10, 1],     // 钩子：火柴 slap 拍入（快动作 1s）
  [11, 37, 2],    // 题字定板（2s）
  [38, 52, 1],    // 火柴盒滑入（1s）
  [53, 125, 2],   // S01 静场 + S02 预备（2s）
  [126, 166, 1],  // 擦燃拖划（快动作 1s：smear/multiples 帧在内）
  [167, 174, 1],  // 点火 poof（1s）
  [175, 216, 2],  // 火灵长成（2s）
  [217, 230, 1],  // HERO 爆星（1s + 幕震）
  [231, 269, 2],  // 燃烧下探（2s）
  [270, 283, 1],  // 熄火（1s）
  [284, 314, 2],  // 烟丝升起（2s）
  [315, 326, 3],  // 余烬沉降（3s）
  [327, 361, 3],  // 结尾定帧（3s，微动效供活性）
];

export function drawing(f: number): { fq: number; id: number; step: number } {
  let id = 0;
  for (const [a, b, s] of SCHED) {
    if (f < a) break;
    if (f > b) { id += Math.ceil((b - a + 1) / s); continue; } // 区间含端点：整个区间已翻页
    const k = Math.floor((f - a) / s);
    return { fq: a + k * s, id: id + k, step: s };
  }
  const last = SCHED[SCHED.length - 1];
  return { fq: last[1], id, step: last[2] };
}

// boil 变体：动的东西 4 张循环（经典 boil loop），hold 段 3 张
export const bv = (D: { id: number; step: number }): number => (D.step === 3 ? D.id % 3 : D.id % 4);
