// BPM 编舞数学 —— dance-line。唯一事实源：本文件；research/beat-sheet.json 的 bpm.value 与此同步。
// 机制与参数借鉴 huashu-art-motion（MIT, alchaincyf）references/风格配方/31_haring.md 的
// 「一切跟 BPM」：bounce=|sin(t·BPM/60·π)|^0.6、拍点在 0、各物相位错 0.25 拍——纯函数 TSX 重写。
// 纯数学模块（零依赖、零 React）：tests/bpm-assert.mjs 经 tsc 编译后离线断言（BPM 同步硬验收）。

/** 全局 BPM（可配：改这里即改全片弹跳时基；BGM --style 18-hanazi bouncy 默认同为 128）。 */
export const BPM = 128;
/** 每秒拍数。 */
export const BEAT_SEC = 60 / BPM;
/** 每拍帧数（30fps）：14.0625。 */
export const BEAT_FRAMES = BEAT_SEC * 30;

/**
 * 弹跳包络 0..1：拍点触地（=0），快起慢落（^0.6）。
 * phase 单位=拍：0.25 = 四分之一拍相位错（全场各物错开，保证任何帧都有物在空中）。
 */
export function bounce(t: number, phase = 0): number {
  return Math.pow(Math.abs(Math.sin((t * (BPM / 60) + phase) * Math.PI)), 0.6);
}

/** 8fps 姿势硬切索引（不插值——「这才是哈林的跳法」）：k = floor(t·8 + phase) mod n。 */
export function poseIndex(t: number, n = 4, phase = 0): number {
  return ((Math.floor(t * 8) + phase) % n + n) % n;
}

/** 8fps 沸腾步号（放射线换角/宝宝两帧交替共用）。 */
export function step8(t: number): number {
  return Math.floor(t * 8);
}

/** 第 k 拍的 1 起帧号（f = 1 + k·BEAT_FRAMES）。 */
export function beatFrame(k: number): number {
  return 1 + k * BEAT_FRAMES;
}
