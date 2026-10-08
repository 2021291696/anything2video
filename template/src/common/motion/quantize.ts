// 帧中心量化闸门 + 12/6fps 步进时基 + hash 手摆抖动。
// 技法借鉴 mg-styles-15 demos/08-morph index.html:31（qT）/ demos/09-bauhaus film.js:23（snap 同物）/
// demos/06-collage index.html:45-53（K/Q6/ks/jit）(MIT, Vincentwei1021), TS 重写。
// 用途：qT——motion-blur 子样本取同一帧心时刻、硬切永不跨帧；Q12/Q6/K/ks——定格抽帧（stop-motion）观感；
//      jit——确定性手摆抖动（同 (id, 步号) 恒定，同一步不闪）。
// 纯函数、零依赖（无 React / DOM / 随机源；禁 Math.random/Date 的场景直接用）。

/** 帧中心量化时刻：round(t*fps)/fps。同一 shutter 内所有子样本得到同一时刻（08/09 同款，默认 30fps）。 */
export const qT = (t: number, fps = 30) => Math.round(t * fps) / fps;

/** 12fps 步进序号（主体运动拍格）：K(t) = floor(t*12 + 1e-4)，1e-4 防浮点落缝。 */
export const K = (t: number) => Math.floor(t * 12 + 1e-4);
/** 12fps 量化时刻：把连续缓动的输入时间换成 Q12(t) 即得「一拍二」定格。 */
export const Q12 = (t: number) => K(t) / 12;
/** 6fps 量化时刻（静置件 boil / 桌面相机）。 */
export const Q6 = (t: number) => Math.floor(t * 6 + 1e-4) / 6;
/** cue t0 以来的 12fps 步数（替换帧姿势表查表用；k=0 = 命中帧）。 */
export const ks = (t: number, t0: number) => K(t) - Math.round(t0 * 12);

/** 双种子整型 hash → [0,1)：同一 (a,b) 恒定的确定性抖动源（imul 混合，06-collage 同款）。 */
export const hash2 = (a: number, b = 0) => {
  let h = (a * 374761393 + b * 668265263 + 1013904223) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

/** 手摆抖动：按 (id, fps 步号) 三轴确定性抖动 → [dx px, dy px, dRot rad]。
 *  默认 ±2px/±2px/±0.4°（第三轴 = amp*0.2*DEG，量级照抄源码）；同一步内恒定。
 *  注意：第三轴为弧度（源码口径）；CSS 侧需自行 ×180/π 或改用卡内 deg 版本。 */
export const jit = (id: number, t: number, amp = 2, fps = 12): [number, number, number] => {
  const k = Math.floor(t * fps + 1e-4);
  const DEG = Math.PI / 180;
  return [
    (hash2(id, k) * 2 - 1) * amp,
    (hash2(id + 71, k) * 2 - 1) * amp,
    (hash2(id + 913, k) * 2 - 1) * amp * 0.2 * DEG,
  ];
};
