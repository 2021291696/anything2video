// math-lab 编排单一事实源：句/幕/事件帧锚 + 自由落体物理（闭式，零随机源）。
// 帧号 1 起含端点；时间轴按 scripts/tts_build.py 实测校准（total=376f=12.53s：
// S01 f31-76 / S02 f83-141 / S03 f148-222 / S04a f229-282 / S04b f283-330）。
// seek(t) 哲学：任意帧 N 全部状态 = f(N) 纯函数（物理闭式解 + hermite/monotone 重参数），同帧渲两次逐像素一致。

export const FPS = 30;
export const TOTAL = 376;

// ---- 物理：自由落体（地球 g，演示全程 3s / 44.1m，闭式解） ----
export const G_ACC = 9.8; // m/s²
export const DROP_S = 3; // 演示满程下落时长（s）
export const DROP_M = 0.5 * G_ACC * DROP_S * DROP_S; // 44.1 m
/** 下落位移（m）：y(t)=½gt²，t≤DROP_S。 */
export const fallY = (t: number): number => 0.5 * G_ACC * t * t;
/** 下落速度（m/s）：v(t)=gt，t≤DROP_S。 */
export const fallV = (t: number): number => G_ACC * t;
export const clamp = (x: number, a = 0, b = 1): number => Math.min(b, Math.max(a, x));

// ---- 句锚（tts_build 实测） ----
export const SENT = {
  s1: [31, 76], // 松手，小球往下掉。
  s2: [83, 141], // 每过一秒，下落快得更多。
  s3: [148, 222], // 把高度画下来，是一条光滑的曲线。
  s4a: [229, 282], // 落差，正比于时间的平方
  s4b: [283, 330], // 这就是自由落体的规律
} as const;

// ---- 幕（一幕一概念：释放 / 速度 / 曲线 / 平方；硬切=实验重放） ----
export const SC = {
  sc1: [1, 81],
  sc2: [82, 147],
  sc3: [148, 228],
  sc4: [229, TOTAL],
} as const;

// ---- 事件帧锚 ----
export const RELEASE1 = 4; // 钩子：球释放（0.1s < 0.5s；网格同窗亮起 GRID_IN）
export const GRID_IN = 15; // 网格亮起完成（≤0.5s 钩子窗）
export const RELEASE2 = 82; // SC02 回放释放（S02 首字前 1f 起跳拍）
export const TICK1 = RELEASE2 + 30; // f112：t=1s 刻度（y=4.9m）
export const TICK2 = RELEASE2 + 60; // f142：t=2s 刻度（y=19.6m）
export const RELEASE3 = 150; // SC03 释放（S03「把高度画下来」语头）
export const CURVE_DONE = RELEASE3 + 30 * DROP_S; // f240：曲线描绘完成+公式点亮（HERO 窗 f226-282 内）
export const COL1 = 250; // SC04 ×1 柱起
export const COL2 = 262; // ×4 柱起
export const COL3 = 274; // ×9 柱起
export const BRACKET_F = 284; // 「y ∝ t²」括式点亮（S04b「这就是…规律」语头）
export const DOT_FROM = 246; // 能量点沿曲线巡行（SC04 起常驻，冻结段即合法微动效）
export const FREEZE_FROM = 344; // 结尾定帧 344-376 = 33f = 1.1s（0.8-1.2s 纪律内，辉光呼吸+巡行点=微动效）

// ---- 三次实验的演示时钟（回放重置；t= 时码即它） ----
/** 幕内演示时间（s）：未释放→0；满程后钳在 DROP_S。 */
export function demoT(f: number, release: number): number {
  return clamp((f - release) / FPS, 0, DROP_S);
}

// ---- 呼吸（确定性振荡：辉光纪律 ±5% 级，冻结段加强到 ±12%） ----
export const breath = (f: number, hz = 0.75, ph = 0): number =>
  0.5 + 0.5 * Math.sin((f / FPS) * hz * 2 * Math.PI + ph);

// ---- 幕判定 ----
export type SceneId = 1 | 2 | 3 | 4;
export function sceneOf(f: number): SceneId {
  if (f < SC.sc2[0]) return 1;
  if (f < SC.sc3[0]) return 2;
  if (f < SC.sc4[0]) return 3;
  return 4;
}
/** 各幕释放帧（t 时码/演示时钟按幕取）。 */
export const RELEASE_OF: Record<SceneId, number> = {1: RELEASE1, 2: RELEASE2, 3: RELEASE3, 4: RELEASE3};
