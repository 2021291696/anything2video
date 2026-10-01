import React from 'react';

// =====================================================================
// swiss-print 图元库 —— 瑞士国际主义版式（International Typographic Style）
// 严格模数网格 · 超大无衬线黑字(900) · 唯一红色几何强调 · 大量留白 · 非对称但精确对齐
// 硬约束：锁死四色；最小字号 22px；无发光/无渐变/无阴影（纯平）；动画纯位移硬切、无回弹；
//         随机一律走 swissHash 种子杂凑（禁 Math.random / Date）。
// =====================================================================

/** 锁死调色板：严格四色，禁任何其它色。 */
export const SWISS_TOKENS = {
  white: '#fafafa',
  black: '#111111',
  red: '#e63329',
  grey: '#9a9a9a',
} as const;
export type SwissColor = keyof typeof SWISS_TOKENS;

/** 系统无衬线栈（不下载字体，Helvetica/Arial 就是最正宗的 Grotesk）。 */
export const SWISS_FONT = `'Helvetica Neue', 'Helvetica', 'Arial', sans-serif`;

/** 版式常量：1280×720 画布、12 列模数网格、页边距 80。 */
export const SWISS_W = 1280;
export const SWISS_H = 720;
export const SWISS_COLS = 12;
export const SWISS_MARGIN = 80;
export const COL_W = (SWISS_W - SWISS_MARGIN * 2) / SWISS_COLS; // ≈93.33px
export const MIN_FONT = 22; // 硬约束：全库最小字号

// ---- 确定性杂凑（禁 Math.random/Date；任何"随机"都走这里）----
export const swissHash = (seed: number, i = 0): number => {
  let x = (Math.imul(seed | 0, 374761393) + Math.imul(i | 0, 668265263)) >>> 0;
  x = (x ^ (x >>> 13)) >>> 0;
  x = Math.imul(x, 1274126177) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296; // → 0..1
};

// ---- 缓动（克制：纯位移，easeOut 无回弹）----
export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
export const easeOutCubic = (n: number, dur: number): number => 1 - Math.pow(1 - clamp01(n / dur), 3);
export const easeInOutCubic = (n: number, dur: number): number => {
  const t = clamp01(n / dur);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const lerpN = (a: number, b: number, t: number): number => a + (b - a) * clamp01(t);

// ---- 字宽估算与 fit（确定性纯函数，不量 DOM；Arial/Helvetica Bold 实测帽宽）----
const CAP_W: Record<string, number> = {
  A: 0.722, B: 0.722, C: 0.722, D: 0.722, E: 0.667, F: 0.611, G: 0.778, H: 0.722,
  I: 0.278, J: 0.556, K: 0.722, L: 0.611, M: 0.833, N: 0.722, O: 0.778, P: 0.667,
  Q: 0.778, R: 0.722, S: 0.667, T: 0.611, U: 0.722, V: 0.667, W: 0.944, X: 0.667,
  Y: 0.667, Z: 0.611,
};
const emOf = (ch: string): number => {
  const c = ch.codePointAt(0) ?? 32;
  if (c >= 0x2000) return 1.0; // em dash / 省略号等全宽标点
  if (ch >= 'A' && ch <= 'Z') return CAP_W[ch] ?? 0.722;
  if (ch >= 'a' && ch <= 'z') return 0.58;
  if (ch >= '0' && ch <= '9') return 0.556;
  if (ch === ' ') return 0.278;
  return 0.333; // 半角标点 / 中点
};
/** 估算文本宽度 px（含 letterSpacing；Chromium 末字后也加 tracking，与渲染一致）。 */
export const swissTextW = (text: string, size: number, trackingEm = 0): number => {
  const chars = [...text];
  let em = 0;
  for (const ch of chars) em += emOf(ch);
  return em * size + chars.length * trackingEm * size;
};
/** fit 逻辑：desired 装不进 maxW 就按比例缩，但不低于 MIN_FONT。 */
export const fitSwiss = (text: string, desired: number, maxW: number, trackingEm = 0): number => {
  const w = swissTextW(text, desired, trackingEm);
  return w <= maxW ? desired : Math.max(MIN_FONT, Math.floor((maxW / w) * desired));
};

// =====================================================================
// 图元
// =====================================================================

/** 超大无衬线字（900 字重，fit 到 maxW；默认极轻负 tracking——Grotesk 大字的呼吸感）。 */
export const SwissText: React.FC<{
  text: string;
  size: number;
  maxW?: number; // 可选：fit 上限（px）
  trackingEm?: number;
  color?: string;
  weight?: number;
  lineH?: number;
  style?: React.CSSProperties; // 定位由调用方给（left/top/right…）
}> = ({text, size, maxW, trackingEm = -0.015, color = SWISS_TOKENS.black, weight = 900, lineH = 0.94, style}) => {
  const fitted = maxW !== undefined ? fitSwiss(text, size, maxW, trackingEm) : size;
  return (
    <div
      style={{
        position: 'absolute',
        fontFamily: SWISS_FONT,
        fontWeight: weight,
        fontSize: fitted,
        lineHeight: lineH,
        letterSpacing: `${(trackingEm * fitted).toFixed(2)}px`,
        color,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {text}
    </div>
  );
};

/** 12 列模数网格参考线层（13 根列线 + 可选水平等分线），用于"闪现一瞬"的版式自证。 */
export const SwissGrid: React.FC<{
  columns?: number;
  margin?: number;
  top?: number; // 网格纵向范围
  bottom?: number;
  rows?: number; // 附加水平线数（0 = 只画列线 + 上下界线不画）
  color?: string;
  opacity?: number;
}> = ({columns = SWISS_COLS, margin = SWISS_MARGIN, top = 64, bottom = 656, rows = 0, color = SWISS_TOKENS.grey, opacity = 0.3}) => {
  const innerW = SWISS_W - margin * 2;
  const lines: React.ReactNode[] = [];
  for (let i = 0; i <= columns; i++) {
    lines.push(
      <div key={`c${i}`} style={{position: 'absolute', left: Math.round(margin + (innerW / columns) * i) - 0.5, top, width: 1, height: bottom - top, background: color}} />,
    );
  }
  for (let r = 0; rows > 0 && r <= rows; r++) {
    const y = Math.round(top + ((bottom - top) / rows) * r) - 0.5;
    lines.push(<div key={`r${r}`} style={{position: 'absolute', left: margin, top: y, width: innerW, height: 1, background: color}} />);
  }
  return (
    <div style={{position: 'absolute', inset: 0, opacity, pointerEvents: 'none'}}>
      {lines}
    </div>
  );
};

/** 唯一强调色几何件：红色正圆（纯平填充，无描边无阴影）。 */
export const RedCircle: React.FC<{
  cx: number;
  cy: number;
  d: number; // 直径
  color?: string;
  opacity?: number;
}> = ({cx, cy, d, color = SWISS_TOKENS.red, opacity = 1}) => (
  <div style={{position: 'absolute', left: cx - d / 2, top: cy - d / 2, width: d, height: d, borderRadius: '50%', background: color, opacity, pointerEvents: 'none'}} />
);

/** 45° 斜线束：count 根平行斜线在裁剪区内沿对角方向扫过一次（progress 0→1，区间外不渲染）。 */
export const Hatch45: React.FC<{
  x: number; // 裁剪区
  y: number;
  w: number;
  h: number;
  progress: number; // 0..1；≤0 或 ≥1 时不画（硬切）
  count?: number;
  spacing?: number;
  thickness?: number;
  color?: string;
  seed?: number; // 线长杂凑抖动（确定性）
  opacity?: number;
}> = ({x, y, w, h, progress, count = 12, spacing = 30, thickness = 5, color = SWISS_TOKENS.black, seed = 11, opacity = 1}) => {
  if (progress <= 0 || progress >= 1) return null;
  const diag = Math.hypot(w, h);
  const d = (clamp01(progress) - 0.5) * diag; // 沿 (1,1) 方向横扫（垂直于斜线自身）
  const lines: React.ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const len = Math.round(diag * (0.92 + 0.16 * swissHash(seed, i)));
    lines.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: w / 2 + (i - (count - 1) / 2) * spacing - len / 2,
          top: h / 2 - thickness / 2,
          width: len,
          height: thickness,
          background: color,
          transform: 'rotate(45deg)',
        }}
      />,
    );
  }
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, overflow: 'hidden', opacity, pointerEvents: 'none'}}>
      <div style={{position: 'absolute', inset: 0, transform: `translate(${d.toFixed(2)}px, ${d.toFixed(2)}px)`}}>{lines}</div>
    </div>
  );
};

/** 边注小字系统：22px 细体 Grotesk + 轻微正 tracking（页码 / 图注 / 编目）。 */
export const MarginNote: React.FC<{
  text: string;
  x?: number; // 左锚（align='right' 时为右缘锚）
  y?: number;
  align?: 'left' | 'right';
  color?: string;
  trackingEm?: number;
  opacity?: number;
}> = ({text, x = SWISS_MARGIN, y = 64, align = 'left', color = SWISS_TOKENS.black, trackingEm = 0.08, opacity = 1}) => (
  <div
    style={{
      position: 'absolute',
      top: y,
      fontFamily: SWISS_FONT,
      fontWeight: 400,
      fontSize: MIN_FONT,
      lineHeight: 1,
      letterSpacing: `${(trackingEm * MIN_FONT).toFixed(2)}px`,
      color,
      opacity,
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      ...(align === 'right' ? {right: SWISS_W - x} : {left: x}),
    }}
  >
    {text}
  </div>
);

/** 细线件：横/竖细线，progress 支持 0→1 精确画出（红色下划线同步落格用）。 */
export const Rule: React.FC<{
  x: number;
  y: number;
  length: number;
  thickness?: number;
  orientation?: 'h' | 'v';
  color?: string;
  opacity?: number;
  progress?: number; // 0..1，从锚点起画出
}> = ({x, y, length, thickness = 2, orientation = 'h', color = SWISS_TOKENS.black, opacity = 1, progress = 1}) => {
  const L = Math.max(0, length * clamp01(progress));
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: orientation === 'h' ? L : thickness,
        height: orientation === 'h' ? thickness : L,
        background: color,
        opacity,
        pointerEvents: 'none',
      }}
    />
  );
};

/** 细黑框（海报收束）：inset 像素内缩的 2px 边框，调用方对 inset 做关键帧即可"合拢"。 */
export const SwissFrame: React.FC<{
  inset: number;
  thickness?: number;
  color?: string;
  opacity?: number;
}> = ({inset, thickness = 2, color = SWISS_TOKENS.black, opacity = 1}) => (
  <div
    style={{
      position: 'absolute',
      top: inset,
      left: inset,
      right: inset,
      bottom: inset,
      border: `${thickness}px solid ${color}`,
      opacity,
      pointerEvents: 'none',
    }}
  />
);
