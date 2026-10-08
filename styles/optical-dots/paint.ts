// ============================================================================
// paint.ts — 烘焙渲染管线：底稿（world.ts 矢量）→ 打底 blur → 点彩渲染器（pointillism.ts）
// 产物 = 每场景 5 个 flicker 态的全幅点彩位图（scripts/bake_paint.mjs 渲成 PNG）。
// 正片热帧只 drawImage（kit.tsx BakedField），零逐点计算——性能纪律的落点。
// ============================================================================
import {W, H} from '../common';
import {drawUnderlay, gradePurple, renderPointillism, hash2, PAL} from './pointillism';
import {drawS1, drawS2, drawS3, drawS2Mosaic, inS1Band, inS2Mosaic, inS3River, type SceneId} from './world';

const newCanvas = (w: number, h: number): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

const ctx2d = (c: HTMLCanvasElement, readFrequently = false) =>
  c.getContext('2d', readFrequently ? {willReadFrequently: true} : undefined) as CanvasRenderingContext2D;

/** 底稿矢量 → 像素（s4 在 s3 之上做紫光分级）。 */
export const drawBase = (scene: SceneId): HTMLCanvasElement => {
  const base = newCanvas(W, H);
  const g = ctx2d(base, true);
  if (scene === 's1') drawS1(g);
  else if (scene === 's2') drawS2(g, PAL);
  else drawS3(g);
  if (scene === 's4') {
    const img = g.getImageData(0, 0, W, H);
    gradePurple(img.data); // 权重/斜率锁在 pointillism.gradePurple 默认值（0.88，紫配对族）
    g.putImageData(img, 0, 0);
  }
  return base;
};

const shimmerOf = (scene: SceneId) =>
  scene === 's1' ? inS1Band : scene === 's2' ? undefined : inS3River;
const maskOf = (scene: SceneId) => (scene === 's2' ? inS2Mosaic : undefined);

/** 场景点彩全幅：打底（blur 底稿当缝色）+ 点彩（flicker 态 st）。s2 的镶嵌大点在末尾重描一遍（crisp 不被虚化）。 */
export const renderSceneField = (scene: SceneId, st: number): HTMLCanvasElement => {
  const base = drawBase(scene);
  const out = newCanvas(W, H);
  const g = ctx2d(out);
  drawUnderlay(g, base, W, H);
  renderPointillism(g, {base: ctx2d(base, true).getImageData(0, 0, W, H).data, width: W, height: H, st,
    shimmer: shimmerOf(scene), mask: maskOf(scene)});
  if (scene === 's2') drawS2Mosaic(g);
  return out;
};

const outCubic = (u: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, u)), 3);

/** SC01 钩子结晶帧（u∈(0,1]）：同 s1 点阵，点半径按「对角位置梯度 + 点哈希」stagger 从 0 长满。 */
export const renderHookFrame = (u: number): HTMLCanvasElement => {
  const base = drawBase('s1');
  const out = newCanvas(W, H);
  const g = ctx2d(out);
  drawUnderlay(g, base, W, H);
  renderPointillism(g, {base: ctx2d(base, true).getImageData(0, 0, W, H).data, width: W, height: H, st: 0,
    shimmer: inS1Band,
    radMul: (px, py, i, j) => {
      const d = 0.55 * ((px / W) * 0.6 + (py / H) * 0.4) + hash2(i, j) * 0.35;
      return outCubic((u - d * 0.62) / 0.38);
    }});
  return out;
};

/** 光渗呼吸层：终幅点彩的提亮模糊副本（runtime 只做 globalAlpha 脉动，零 filter 成本）。 */
export const renderGlow = (field: HTMLCanvasElement): HTMLCanvasElement => {
  const out = newCanvas(W, H);
  const g = ctx2d(out);
  g.filter = 'brightness(1.55) blur(10px)';
  g.drawImage(field, 0, 0);
  g.filter = 'none';
  return out;
};
