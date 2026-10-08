// ink-boil 锁死 token 与共享类型。

/** 色板（锁死 4 色 + 派生纸白高光；禁入第五色相） */
export const PAL = {
  ink: '#1c1613',    // 墨黑
  red: '#e5402b',    // 番茄红
  yel: '#ffc425',    // 葵黄
  cream: '#f4e9d0',  // 奶油纸
  hi: '#fff6e2',     // 纸白高光（奶油纸的亮调，仅用于高光/拖影/烟）
} as const;

/** 色对线错位（off-register 手上色登记偏移） */
export const REG = { dx: -4, dy: 3 } as const;

/** 墨宽锁死：6px 基准 ±35%（inkW jit=0.35）；boil amp 2.4 / scale 70 */
export const INK_W = 6;
export const BOIL_AMP = 2.4;
export const BOIL_SCALE = 70;

export type DrawInfo = { fq: number; id: number; step: number };

export type CanvasCtx = CanvasRenderingContext2D;
