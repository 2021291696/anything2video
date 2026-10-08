// ============================================================================
// flow.ts — 长弯流线笔（蒙克表现主义签名①）+ 整幅按行/列正弦 warp（签名④）
// 移植自 huashu-art-motion lib/brush.js P.flowSeeds/P.flowLines + lib/kit.js
// K.warpRows/K.warpCols (MIT, alchaincyf)，TS 重写——「种子沿随时间扭动的方向场
// 积分、越出本区即停」「每行/列带整体正弦位移 + margin 拉伸防露缝」机制与参数级
// 借鉴，结构、命名、API 按 TS/Remotion 惯用法重写，零代码拷贝。
//
// 与梵高 strokes.ts 的刻意分化（RECON §19 点名教训：照搬梵高深色描边 → 墙面成
// 毛毛虫短笔、一眼梵高）：不描边（flowLines 无 outline 概念）/ 步数 10→26–42 /
// 拉长加宽减透明度（一根笔走 200–300px、α .5–.8 薄涂叠色）。
// ============================================================================
import {mulberry32, type RGB} from './strokes';

export type FlowSeed = readonly [number, number, number, number];

/** 种子网格：cell 抖动网格，每格一个种子 [x, y, r1, r2]；构建期每格恒定消费 4 个随机数
 *  （1920×1080 / cell24 ≈ 3854 枚 ≈ 源卡「种子≈3600」口径）。 */
export const flowSeeds = (w: number, h: number, cell = 24, seed = 5): FlowSeed[] => {
  const r = mulberry32(seed);
  const out: FlowSeed[] = [];
  for (let y = -10; y < h + 10; y += cell) {
    for (let x = -10; x < w + 10; x += cell) {
      out.push([x + (r() - 0.5) * cell, y + (r() - 0.5) * cell, r(), r()]);
    }
  }
  return out;
};

export type RegionFn = (x: number, y: number, t: number) => string;
/** 方向场：reg 参与计算（天/峡湾/墙/地各有自己的场） */
export type FlowAngleFn = (x: number, y: number, t: number, reg: string) => number;
export type FlowColorFn = (reg: string, sx: number, sy: number, r1: number, t: number) => RGB;
/** 每区参数 [steps, step, width, alpha]：一根笔约走 steps×step px（26–42 步 × 6–8px = 200–300px） */
export type FlowParams = Record<string, readonly [number, number, number, number]>;

export interface FlowLinesPass {
  t: number;
  region: RegionFn;
  angle: FlowAngleFn;
  color: FlowColorFn;
  params: FlowParams;
  /** 每根另加 0–extraSteps 步随机长度（源卡 8） */
  extraSteps?: number;
}

/** 长弯流线笔：每种子判区 → 沿 angle(x,y,t,reg) 积分；越出本区即停（区域边界干净）。
 *  不描边、半透明叠色——蒙克是薄涂长笔，不是梵高的厚涂短笔。绘制期零随机数消费
 *  （宽度抖动用种子自带的 r2），天然免疫 stable() 频闪问题。 */
export const flowLines = (c: CanvasRenderingContext2D, seeds: readonly FlowSeed[], pass: FlowLinesPass): void => {
  const {t, region, angle, color, params, extraSteps = 8} = pass;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (const [sx, sy, r1, r2] of seeds) {
    const reg = region(sx, sy, t);
    const pr = params[reg];
    if (!pr) continue;
    const [steps, step, width, alpha] = pr;
    const col = color(reg, sx, sy, r1, t);
    let x = sx;
    let y = sy;
    c.beginPath();
    c.moveTo(x, y);
    const n = steps + ((r2 * extraSteps) | 0);
    for (let i = 0; i < n; i++) {
      const a = angle(x, y, t, reg);
      x += Math.cos(a) * step;
      y += Math.sin(a) * step;
      if (region(x, y, t) !== reg) break;
      c.lineTo(x, y);
    }
    c.strokeStyle = `rgba(${col[0] | 0},${col[1] | 0},${col[2] | 0},${alpha})`;
    c.lineWidth = width * (0.7 + r2 * 0.6);
    c.stroke();
  }
};

/** 整幅按行正弦位移：每行带整体横移，左右各多拉伸 2×margin（margin ≥ 最大位移防露缝，
 *  裸边由调用方先铺的暗底色接住）。 */
export const warpRows = (
  dst: CanvasRenderingContext2D, src: HTMLCanvasElement,
  fx: (y: number) => number, band = 6, margin = 0,
): void => {
  const w = src.width;
  const h = src.height;
  for (let y = 0; y < h; y += band) {
    const dx = fx(y + band / 2);
    dst.drawImage(src, 0, y, w, band, dx - margin, y, w + 2 * margin, band);
  }
};

/** 整幅按列正弦位移：每列带整体纵移，上下各多拉伸 2×margin。 */
export const warpCols = (
  dst: CanvasRenderingContext2D, src: HTMLCanvasElement,
  fy: (x: number) => number, band = 6, margin = 0,
): void => {
  const w = src.width;
  const h = src.height;
  for (let x = 0; x < w; x += band) {
    const dy = fy(x + band / 2);
    dst.drawImage(src, x, 0, band, h, x, dy - margin, band, h + 2 * margin);
  }
};
