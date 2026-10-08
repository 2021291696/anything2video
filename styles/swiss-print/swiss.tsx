import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';

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

/** 超大无衬线字（900 字重，fit 到 maxW；默认极轻负 tracking——Grotesk 大字的呼吸感）。
 *  opt-in `variant="maskRise"`：逐词遮罩升起（借鉴 lanshu-create-ai-presenter-video，Remotion 重写）——
 *  行容器 overflow:hidden，词 span translateY(105%→0) easeOutCubic（词间错峰 60ms、单词 420ms 完成），
 *  可选 emphasis 子串红色（卡内红 #e63329）、可选尾部横线 scaleX 0.6s easeInOutCubic 画出。默认 'static' 输出与旧版逐像素一致。 */
export const SwissText: React.FC<{
  text: string;
  size: number;
  maxW?: number; // 可选：fit 上限（px）
  trackingEm?: number;
  color?: string;
  weight?: number;
  lineH?: number;
  style?: React.CSSProperties; // 定位由调用方给（left/top/right…）
  variant?: 'static' | 'maskRise';
  at?: number; // maskRise：起始秒（默认 0）
  emphasis?: string; // maskRise：红色强调子串（首个匹配）
  tailRule?: {length: number; dy?: number; thickness?: number; color?: string}; // maskRise：尾部横线（词落定后画出）
}> = ({text, size, maxW, trackingEm = -0.015, color = SWISS_TOKENS.black, weight = 900, lineH = 0.94, style, variant = 'static', at = 0, emphasis, tailRule}) => {
  if (variant === 'maskRise') {
    return (
      <SwissTextMaskRise
        text={text} size={size} maxW={maxW} trackingEm={trackingEm} color={color}
        weight={weight} lineH={lineH} style={style} at={at} emphasis={emphasis} tailRule={tailRule}
      />
    );
  }
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

/** maskRise 内部实现（独立组件：让 SwissText 静态路径保持零 hook）。 */
const SwissTextMaskRise: React.FC<{
  text: string; size: number; maxW?: number; trackingEm: number; color: string; weight: number; lineH: number;
  style?: React.CSSProperties; at: number; emphasis?: string;
  tailRule?: {length: number; dy?: number; thickness?: number; color?: string};
}> = ({text, size, maxW, trackingEm, color, weight, lineH, style, at, emphasis, tailRule}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const fitted = maxW !== undefined ? fitSwiss(text, size, maxW, trackingEm) : size;
  // 逐词拆分 + emphasis 子串的字符级红标记（确定性：indexOf 首个匹配）
  const eStart = emphasis !== undefined ? text.indexOf(emphasis) : -1;
  const eLen = emphasis !== undefined ? [...emphasis].length : 0;
  const eEnd = eStart >= 0 ? eStart + eLen : -1;
  let cursor = 0;
  const words = text.split(' ').filter((w) => w.length > 0).map((w) => {
    const s = text.indexOf(w, cursor);
    cursor = s + w.length;
    return [...w].map((ch, j) => ({ch, red: s + j >= eStart && s + j < eEnd}));
  });
  const STEP = 0.06; // 词间错峰 60ms
  const DUR = 0.42; // 单词 420ms 完成
  return (
    <div style={{position: 'absolute', pointerEvents: 'none', ...style}}>
      <div
        style={{
          overflow: 'hidden',
          fontFamily: SWISS_FONT,
          fontWeight: weight,
          fontSize: fitted,
          lineHeight: lineH,
          letterSpacing: `${(trackingEm * fitted).toFixed(2)}px`,
          color,
          whiteSpace: 'nowrap',
        }}
      >
        {words.map((word, i) => {
          const e = easeOutCubic(t - (at + i * STEP), DUR);
          return (
            <React.Fragment key={i}>
              {i > 0 ? ' ' : null}
              <span style={{display: 'inline-block', transform: `translateY(${((1 - e) * 105).toFixed(2)}%)`}}>
                {word.map((c, j) => (
                  <span key={j} style={{color: c.red ? SWISS_TOKENS.red : undefined}}>{c.ch}</span>
                ))}
              </span>
            </React.Fragment>
          );
        })}
      </div>
      {tailRule !== undefined && (
        <Rule
          x={0}
          y={fitted * lineH + (tailRule.dy ?? 14)}
          length={tailRule.length}
          thickness={tailRule.thickness ?? 6}
          color={tailRule.color ?? SWISS_TOKENS.red}
          progress={easeInOutCubic(t - (at + words.length * STEP), 0.6)}
        />
      )}
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

/** 边注小字系统：22px 细体 Grotesk + 轻微正 tracking（页码 / 图注 / 编目）。
 *  opt-in `reveal`（0..1，调用方按帧算好传入，与 Rule/Hatch45 同一 progress 惯例）：
 *  左缘揭出 clipPath: inset(-8px ((1-r)*100)% -8px -8px)，r=easeOutCubic(clamp01(p*1.15))，opacity min(1,p*2)。
 *  不传 = 原样输出（默认路径不变）。 */
export const MarginNote: React.FC<{
  text: string;
  x?: number; // 左锚（align='right' 时为右缘锚）
  y?: number;
  align?: 'left' | 'right';
  color?: string;
  trackingEm?: number;
  opacity?: number;
  reveal?: number; // 揭出进度 0..1
}> = ({text, x = SWISS_MARGIN, y = 64, align = 'left', color = SWISS_TOKENS.black, trackingEm = 0.08, opacity = 1, reveal}) => {
  const r = reveal === undefined ? undefined : easeOutCubic(clamp01(reveal * 1.15), 1);
  return (
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
        opacity: opacity * (r === undefined ? 1 : Math.min(1, reveal! * 2)),
        clipPath: r === undefined ? undefined : `inset(-8px ${((1 - r) * 100).toFixed(3)}% -8px -8px)`,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        ...(align === 'right' ? {right: SWISS_W - x} : {left: x}),
      }}
    >
      {text}
    </div>
  );
};

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

// =====================================================================
// opt-in 增补组件（技法借鉴 lanshu-create-ai-presenter-video，MIT, cclank —— Remotion 重写）
// 均不改变上列既有图元的默认输出。
// =====================================================================

/** 方块语义：ink=数据｜accent=新或变｜grey=旧或已存｜ghost=虚拟或跳过（内部映射卡内四色 token）。 */
export type SwissBlockKind = 'ink' | 'accent' | 'grey' | 'ghost';

/** 数据方块语义网格：四语义映射卡内四色——ink 黑=数据｜accent 红=新或变｜grey=旧或已存｜
 *  ghost=透明+2px dashed=虚拟或跳过。方块默认 48px、圆角 14%、gap 8px；pitch=size+gap 绝对定位，
 *  容器收缩到 cols*pitch-(pitch-size)。进场：translateY((1-e)*26px)+scale(0.82→1)、opacity min(1,p*1.4)，
 *  按 start+i*step 错峰（时间用 useCurrentFrame，秒）。 */
export const SwissBlocks: React.FC<{
  n: number;
  cols: number;
  kinds: SwissBlockKind[] | ((i: number) => SwissBlockKind);
  x?: number;
  y?: number;
  size?: number; // 默认 48
  gap?: number; // 默认 8
  start?: number; // 进场起始秒（默认 0）
  step?: number; // 每块错峰秒（默认 0.03）
  opacity?: number;
}> = ({n, cols, kinds, x = 0, y = 0, size = 48, gap = 8, start = 0, step = 0.03, opacity = 1}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const kindOf: (i: number) => SwissBlockKind = typeof kinds === 'function' ? kinds : (i) => kinds[i] ?? 'ink';
  const pitch = size + gap;
  const rows = Math.ceil(n / cols);
  const DUR = 0.32;
  const fillOf = (kind: SwissBlockKind): React.CSSProperties => {
    switch (kind) {
      case 'accent':
        return {background: SWISS_TOKENS.red};
      case 'grey':
        return {background: SWISS_TOKENS.grey};
      case 'ghost':
        return {background: 'transparent', border: `2px dashed ${SWISS_TOKENS.grey}`};
      default:
        return {background: SWISS_TOKENS.black}; // ink = 数据
    }
  };
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: cols * pitch - (pitch - size),
        height: rows * pitch - (pitch - size),
        opacity,
        pointerEvents: 'none',
      }}
    >
      {Array.from({length: n}, (_, i) => {
        const p = clamp01((t - (start + i * step)) / DUR);
        const e = easeOutCubic(p, 1);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: (i % cols) * pitch,
              top: Math.floor(i / cols) * pitch,
              width: size,
              height: size,
              borderRadius: '14%',
              opacity: Math.min(1, p * 1.4),
              transform: `translateY(${((1 - e) * 26).toFixed(2)}px) scale(${(0.82 + 0.18 * e).toFixed(4)})`,
              ...fillOf(kindOf(i)),
            }}
          />
        );
      })}
    </div>
  );
};

/** 小票生长：纸随打印行数长高（从不存在"大片空白的小票"）。
 *  HEAD=86 / ROW=84 / FOOT=44（scale 等比调）；纸高 = HEAD + Σ easeOutCubic(pr(t, 行t-0.12, 0.28))*ROW + FOOT；
 *  行内容提前 120ms 开始"喂纸"、行本体 translateY -12px 落下；锯齿底 clip-path 5% 步进、齿深 18px；
 *  纯平化：禁投影，只留 1px 描边（卡契约覆盖源 kit 的 box-shadow）。
 *  pre/swap 契约：swap 时刻前值显示 pre（默认语义「？」），swap 起换真值。 */
export const SwissReceipt: React.FC<{
  title?: string;
  rows: {label: string; value: string; t: number; pre?: string; swap?: number; big?: boolean; total?: boolean; tone?: 'ink' | 'accent'}[];
  x?: number;
  y?: number;
  width?: number; // 默认 560
  at?: number; // 整体入场秒（默认首行前 0.4s）
  out?: number; // 出场秒（可选）
  scale?: number; // 默认 1；按卡内字号体系等比调 HEAD/ROW/FOOT 与字号
}> = ({title = 'RECEIPT', rows, x = 0, y = 0, width = 560, at, out, scale = 1}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const HEAD = 86 * scale;
  const ROW = 84 * scale;
  const FOOT = 44 * scale;
  const PAD = 40 * scale;
  const TOOTH = 18 * scale;
  const at0 = at ?? (rows[0]?.t ?? 0) - 0.4;
  const pIn = clamp01((t - at0) / 0.4);
  const pOut = out === undefined ? 1 : 1 - clamp01((t - (out - 0.2)) / 0.2);
  const vis = pIn > 0 ? Math.min(1, pIn * 1.5) * pOut : 0;
  if (vis <= 0) return null;
  let fed = 0;
  for (const r of rows) fed += easeOutCubic(t - (r.t - 0.12), 0.28);
  const h = HEAD + fed * ROW + FOOT;
  // 锯齿底：polygon(0 0, 100% 0, 100% calc(100%-tooth), 95% 100%, 90% calc(100%-tooth), …, 0 calc(100%-tooth))
  let zig = `polygon(0 0, 100% 0, 100% calc(100% - ${TOOTH}px)`;
  for (let pct = 95; pct >= 0; pct -= 5) {
    zig += `, ${pct}% ${pct % 10 === 5 ? '100%' : `calc(100% - ${TOOTH}px)`}`;
  }
  zig += ')';
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height: h,
        background: SWISS_TOKENS.white,
        border: `1px solid ${SWISS_TOKENS.black}`, // 纯平化：禁投影，只留 1px 描边
        clipPath: zig,
        overflow: 'hidden',
        opacity: vis,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: PAD,
          right: PAD,
          top: 28 * scale,
          paddingBottom: 14 * scale,
          borderBottom: `3px solid ${SWISS_TOKENS.black}`,
          fontFamily: SWISS_FONT,
          fontWeight: 700,
          fontSize: Math.max(MIN_FONT, 24 * scale),
          lineHeight: 1.2,
          letterSpacing: '0.08em',
          color: SWISS_TOKENS.grey,
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </div>
      {rows.map((r, i) => {
        const q = easeOutCubic(t - r.t, 0.22);
        const pre = r.pre !== undefined && r.swap !== undefined && t < r.swap;
        const valueColor = pre ? SWISS_TOKENS.grey : r.tone === 'accent' ? SWISS_TOKENS.red : SWISS_TOKENS.black;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: PAD,
              right: PAD,
              top: HEAD + i * ROW,
              height: ROW,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: r.total ? undefined : `1px solid rgba(17,17,17,0.22)`,
              fontFamily: SWISS_FONT,
              fontWeight: r.total ? 900 : 500,
              fontSize: r.big ? Math.max(MIN_FONT, 56 * scale) : Math.max(MIN_FONT, 30 * scale),
              color: valueColor,
              whiteSpace: 'nowrap',
              opacity: q,
              transform: `translateY(${((1 - q) * -12).toFixed(1)}px)`,
            }}
          >
            <span>{r.label}</span>
            <span style={{fontWeight: r.big && !pre ? 900 : undefined}}>{pre ? r.pre : r.value}</span>
          </div>
        );
      })}
    </div>
  );
};

/** 章节转场（opt-in 包装）：整帧 translateX(100%→0) easeInOutCubic 0.55s 推入，
 *  落定后 1px 墨色分隔线（Rule，0.4s 画出，不引阴影）在 ruleY 处收束章节。ruleY={null} 关闭分隔线。 */
export const SwissPageTurn: React.FC<{
  at: number; // 转场起始秒
  dur?: number; // 默认 0.55
  ruleY?: number | null; // 默认 64（对齐边注基线区）
  children: React.ReactNode;
}> = ({at, dur = 0.55, ruleY = 64, children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const e = easeInOutCubic(t - at, dur);
  const rp = ruleY === null ? 0 : easeInOutCubic(t - (at + dur), 0.4);
  return (
    <>
      <div style={{position: 'absolute', inset: 0, transform: `translateX(${((1 - e) * 100).toFixed(3)}%)`, pointerEvents: 'none'}}>
        {children}
      </div>
      {ruleY !== null && rp > 0 && (
        <Rule x={SWISS_MARGIN} y={ruleY} length={SWISS_W - SWISS_MARGIN * 2} thickness={1} color={SWISS_TOKENS.black} progress={rp} />
      )}
    </>
  );
};

// =====================================================================
// opt-in 增补 II（2026-10-07 v4.0）：SwissKinetic 运动组件包 + photo-collage 扩展
// 技法借鉴 huashu-art-motion 12_bauhaus / 22_constructivism（MIT, alchaincyf）—— Remotion 重写。
// 运动组件只用卡内四色 token；photo-collage（HalftonePhoto/CutoutEdge）按 SPEC 豁免条款
// 放宽纯平契约（第五色 #fbf7ea 剪纸白边 + 网点纹理），仅限显式挂载这两个组件的镜头。
// 全部为新增导出，默认不启用——不改变上列任何既有图元的默认输出。
// =====================================================================

/** 轮换格窗换色时刻：huashu 12 同式 (step+2·sw)%9<6——13fps 卡点下不是每拍都换，防机械。 */
export const kineticSwapDue = (step: number, sw: number): boolean => (step + 2 * sw) % 9 < 6;

/** 指针杆角度：huashu 12 逐帧量帧拟合 28→49.5°，deg = from + (to−from)·easeOut(clamp((lt−at)/dur))。 */
export const pointerDeg = (lt: number, at = 0.26, dur = 0.22, from = 28, to = 49.5): number =>
  from + (to - from) * easeOutCubic(lt - at, dur);

/** 盖章字波浪跳：−10·max(0, sin(11lt−0.8k))（huashu 22 同式）。 */
export const stampHop = (lt: number, k: number): number => -10 * Math.max(0, Math.sin(11 * lt - 0.8 * k));

/** 网点点径：cell·gain·√(1−L)（huashu 22 halftone 同式；L=0 黑→最粗，L→1 白→不落点）。 */
export const halftoneR = (L: number, cell: number, gain: number): number =>
  cell * gain * Math.sqrt(Math.max(0, 1 - clamp01(L)));

/**
 * KineticPointer —— 指针杆（SwissKinetic 件 1，opt-in）。
 * 斜长黑杆绕毂心 (x,y) 缓转：deg=pointerDeg(lt,at,dur,from,to)（easeOut 拟合 huashu 12 量帧曲线，
 * 默认 28→49.5°/0.26s 起/0.22s）。毂后长毂前短（源 −432/+150 → tail 0.74/nose 0.26）；
 * counterweight 红短杆垂直偏移置毂后（huashu −30px 细节的四色化）。毂心黑盘收尾。
 */
export const KineticPointer: React.FC<{
  x: number; y: number; len?: number; w?: number; at?: number; dur?: number;
  from?: number; to?: number; color?: string; counterweight?: boolean; opacity?: number;
}> = ({x, y, len = 390, w = 18, at = 0.26, dur = 0.22, from = 28, to = 49.5,
  color = SWISS_TOKENS.black, counterweight = true, opacity = 1}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const lt = frame / fps;
  if (lt < at) return null;
  const deg = pointerDeg(lt, at, dur, from, to);
  const tail = len * 0.74;
  const nose = len * 0.26;
  return (
    <svg width={SWISS_W} height={SWISS_H} viewBox={`0 0 ${SWISS_W} ${SWISS_H}`} style={{position: 'absolute', inset: 0, opacity, pointerEvents: 'none'}}>
      <g transform={`rotate(${deg.toFixed(3)} ${x} ${y})`}>
        <rect x={x - tail} y={y - w / 2} width={tail + nose} height={w} fill={color} />
        {counterweight && (
          <rect x={(x - tail + len * 0.06).toFixed(1)} y={(y - w / 2 - w * 1.2).toFixed(1)}
            width={(len * 0.3).toFixed(1)} height={(w * 0.7).toFixed(1)} fill={SWISS_TOKENS.red} />
        )}
      </g>
      <circle cx={x} cy={y} r={(w * 0.9).toFixed(1)} fill={SWISS_TOKENS.black} />
    </svg>
  );
};

/**
 * KineticGrid —— 轮换格窗（SwissKinetic 件 2，opt-in）。
 * 13fps 卡点 step=floor((t−at)·fpsStep)，每格相位 sw=swissHash(seed,i)，仅
 * kineticSwapDue(step,sw)=(step+2sw)%9<6 时换色（不是每拍都换）；换色取
 * swissHash(seed+17(s+1), i) 从 colors 选——色轮只用卡内四色 token。
 * skip(i)=true 的格子不渲染（留给调用方画图样格/保留格，huashu「图样格保留」语义）。
 */
export const KineticGrid: React.FC<{
  x: number; y: number; cols?: number; rows?: number; cell?: number; gap?: number;
  at?: number; fpsStep?: number; seed?: number; opacity?: number;
  colors?: readonly string[]; skip?: (i: number) => boolean;
}> = ({x, y, cols = 4, rows = 4, cell = 66, gap = 6, at = 0, fpsStep = 13, seed = 5,
  opacity = 1, colors = [SWISS_TOKENS.black, SWISS_TOKENS.red, SWISS_TOKENS.grey, SWISS_TOKENS.white], skip}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const step = Math.floor((frame / fps - at) * fpsStep);
  const n = cols * rows;
  const cells: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    if (skip?.(i)) continue;
    const sw = swissHash(seed, i);
    let s = step;
    while (s >= 0 && !kineticSwapDue(s, sw)) s--;
    const pick = s < 0
      ? Math.floor(swissHash(seed + 101, i) * colors.length)
      : Math.floor(swissHash(seed + 17 * (s + 1), i) * colors.length);
    cells.push(
      <div key={i} style={{position: 'absolute',
        left: (x + (i % cols) * (cell + gap)).toFixed(1), top: (y + Math.floor(i / cols) * (cell + gap)).toFixed(1),
        width: cell, height: cell, background: colors[pick]}} />,
    );
  }
  return <div style={{position: 'absolute', inset: 0, opacity, pointerEvents: 'none'}}>{cells}</div>;
};

/**
 * RollingBall —— 滚球（SwissKinetic 件 3，opt-in）。
 * x = x0 + (x1−x0)·easeOutCubic；转角 = 位移/半径（huashu 12「白直径线看得出在滚」：
 * 白直径线 + 心点随 rotate 同步转）。滚动中两条灰色速度线（rolling 区间才画）。
 */
export const RollingBall: React.FC<{
  y: number; x0: number; x1: number; at: number; r?: number; dur?: number;
  color?: string; lineColor?: string; speedLines?: boolean; opacity?: number;
}> = ({y, x0, x1, at, r = 30, dur = 0.34, color = SWISS_TOKENS.red, lineColor = SWISS_TOKENS.white,
  speedLines = true, opacity = 1}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const lt = frame / fps;
  const p = clamp01((lt - at) / dur);
  if (p <= 0) return null;
  const x = x0 + (x1 - x0) * easeOutCubic(lt - at, dur);
  const deg = ((x - x0) / r) * (180 / Math.PI);
  const rolling = p < 1;
  return (
    <svg width={SWISS_W} height={SWISS_H} viewBox={`0 0 ${SWISS_W} ${SWISS_H}`} style={{position: 'absolute', inset: 0, opacity, pointerEvents: 'none'}}>
      {speedLines && rolling && (
        <g stroke={SWISS_TOKENS.grey} strokeWidth={3} opacity={0.55}>
          <line x1={(x - r - 46).toFixed(1)} y1={y - r * 0.55} x2={(x - r - 12).toFixed(1)} y2={y - r * 0.55} />
          <line x1={(x - r - 60).toFixed(1)} y1={y} x2={(x - r - 18).toFixed(1)} y2={y} />
        </g>
      )}
      <g transform={`translate(${x.toFixed(2)} ${y})`}>
        <circle r={r} fill={color} />
        <g transform={`rotate(${deg.toFixed(2)})`}>
          <line x1={-r * 0.82} y1={0} x2={r * 0.82} y2={0} stroke={lineColor} strokeWidth={2.5} />
        </g>
        <circle r={2.6} fill={lineColor} />
      </g>
    </svg>
  );
};

/**
 * KineticArcs —— 同心弧（SwissKinetic 件 4，opt-in）。
 * n 条红弧像声波往外推（huashu 12）：起点相位 sin(9lt−0.7i)·0.05 波动、半径 ±3 呼吸、
 * 弧长 at 起 0.4s 内从 55% 扫到 100%（满圆用 <circle> 收尾）；外圈逐条减淡。
 */
export const KineticArcs: React.FC<{
  cx: number; cy: number; r0?: number; n?: number; gapR?: number; at?: number; dur?: number;
  color?: string; thick?: number; opacity?: number;
}> = ({cx, cy, r0 = 60, n = 6, gapR = 14, at = 0, dur = 0.4, color = SWISS_TOKENS.red, thick = 4, opacity = 1}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const lt = frame / fps;
  const e = easeOutCubic(lt - at, dur);
  if (e <= 0) return null;
  const sweep = 0.55 + 0.45 * e; // 弧长占整圆比例
  const arcs: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const wobA = Math.sin(9 * lt - 0.7 * i) * 0.05;
    const rr = r0 + i * gapR + 3 * Math.sin(9 * lt - i);
    const total = sweep * 2 * Math.PI;
    const a0 = -Math.PI / 2 + wobA - total / 2;
    const a1 = -Math.PI / 2 + wobA + total / 2;
    const x0 = cx + rr * Math.cos(a0), y0 = cy + rr * Math.sin(a0);
    const x1 = cx + rr * Math.cos(a1), y1 = cy + rr * Math.sin(a1);
    const fade = 1 - i / (n + 2);
    arcs.push(sweep >= 0.999 ? (
      <circle key={i} cx={cx} cy={cy} r={rr.toFixed(2)} fill="none" stroke={color} strokeWidth={thick} strokeLinecap="round" opacity={fade.toFixed(3)} />
    ) : (
      <path key={i}
        d={`M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${rr.toFixed(1)} ${rr.toFixed(1)} 0 ${total > Math.PI ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`}
        fill="none" stroke={color} strokeWidth={thick} strokeLinecap="round" opacity={fade.toFixed(3)} />
    ));
  }
  return <svg width={SWISS_W} height={SWISS_H} viewBox={`0 0 ${SWISS_W} ${SWISS_H}`} style={{position: 'absolute', inset: 0, opacity, pointerEvents: 'none'}}>{arcs}</svg>;
};

/** SwissKinetic 运动扩展包（huashu 12_bauhaus 四母题，参数照抄配方）：Pointer 指针杆｜Grid 轮换格窗｜Ball 滚球｜Arcs 同心弧。 */
export const SwissKinetic = {
  Pointer: KineticPointer,
  Grid: KineticGrid,
  Ball: RollingBall,
  Arcs: KineticArcs,
} as const;

/**
 * halftonePath —— 网点化路径生成（huashu 22 halftone 的 TSX 重写核心）。
 * 45°（ang 默认 π/4）旋转网格采样 lum(u,v)∈[0,1]（0=黑 1=白），点径 halftoneR=cell·gain·√(1−L)，
 * r<minR（≈白处）不落点；**所有点并成一条 path 字符串**——调用方一个 <path fill> 一次渲染，
 * 源「脸 3000 点 <2ms」的性能语义。纯函数、确定性、可断言。
 */
export const halftonePath = (
  lum: (u: number, v: number) => number,
  opts: {x: number; y: number; w: number; h: number; cell?: number; gain?: number; ang?: number; minR?: number},
): string => {
  const {x, y, w, h, cell = 5, gain = 0.78, ang = Math.PI / 4, minR = 0.35} = opts;
  const cos = Math.cos(ang), sin = Math.sin(ang);
  const cx = x + w / 2, cy = y + h / 2;
  const R = Math.ceil((w + h) / 2 / cell) + 1;
  let d = '';
  for (let j = -R; j <= R; j++) {
    for (let i = -R; i <= R; i++) {
      const px = cx + (i * cos - j * sin) * cell;
      const py = cy + (i * sin + j * cos) * cell;
      if (px < x || px > x + w || py < y || py > y + h) continue;
      const L = clamp01(lum((px - x) / w, (py - y) / h));
      const r = halftoneR(L, cell, gain);
      if (r < minR) continue;
      const cxr = (px + r).toFixed(2), cxl = (px - r).toFixed(2), rr = r.toFixed(2), pyf = py.toFixed(2);
      d += `M${cxr} ${pyf}A${rr} ${rr} 0 1 1 ${cxl} ${pyf}A${rr} ${rr} 0 1 1 ${cxr} ${pyf}`;
    }
  }
  return d;
};

/**
 * HalftonePhoto —— 灰度照片网点化（photo-collage 扩展，opt-in 默认关）。
 * lum 由调用方给（程序化灰度「照片」：径向人像光/天空渐变/剪影都可写成纯函数——
 * 本卡无 canvas 采样，真实位图请走项目内离屏预处理后以 lum 查表）。白纸垫底可关。
 * **纯平契约豁免**：本组件按 SPEC 豁免条款引入网点纹理，仅限显式挂载镜头。
 */
export const HalftonePhoto: React.FC<{
  lum: (u: number, v: number) => number; x?: number; y?: number; w: number; h: number;
  cell?: number; gain?: number; ang?: number; color?: string; paper?: boolean; opacity?: number;
}> = ({lum, x = 0, y = 0, w, h, cell = 5, gain = 0.78, ang = Math.PI / 4,
  color = SWISS_TOKENS.black, paper = true, opacity = 1}) => (
  <svg width={SWISS_W} height={SWISS_H} viewBox={`0 0 ${SWISS_W} ${SWISS_H}`} style={{position: 'absolute', left: 0, top: 0, opacity, pointerEvents: 'none'}}>
    {paper && <rect x={x} y={y} width={w} height={h} fill={SWISS_TOKENS.white} />}
    <path d={halftonePath(lum, {x, y, w, h, cell, gain, ang})} fill={color} />
  </svg>
);

/**
 * CutoutEdge —— 剪纸白边（photo-collage 扩展，opt-in 默认关）。
 * 网点「照片」外圈 7px #fbf7ea 纸白边（huashu 22：外圈先描 7px = 照片被剪下来的语义）。
 * 平涂实现（无阴影）；子件裁剪在内容区。第五色豁免条款见 SPEC。
 */
export const CutoutEdge: React.FC<{
  x?: number; y?: number; w: number; h: number; edge?: number; color?: string; children?: React.ReactNode;
}> = ({x = 0, y = 0, w, h, edge = 7, color = '#fbf7ea', children}) => (
  <div style={{position: 'absolute', left: x - edge, top: y - edge, width: w + edge * 2, height: h + edge * 2, background: color, pointerEvents: 'none'}}>
    <div style={{position: 'absolute', inset: edge, overflow: 'hidden'}}>{children}</div>
  </div>
);

/**
 * StampText —— 盖章字（opt-in）。
 * 逐字盖章（huashu 22）：第 k 字 0.045k 秒起，0.12s 内 1.5→1 缩回（easeOutCubic），
 * 之后整排波浪跳 stampHop=−10·max(0,sin(11lt−0.8k))；每第 every 个字换 altColor
 * （四色 token，默认红底黑点缀 = 源「每第 4 个字是黑字」）。起点前该字不渲染（保留占位宽）。
 */
export const StampText: React.FC<{
  text: string; x: number; y: number; size: number; at?: number; every?: number;
  color?: string; altColor?: string; trackingEm?: number; weight?: number; opacity?: number;
}> = ({text, x, y, size, at = 0, every = 4, color = SWISS_TOKENS.red, altColor = SWISS_TOKENS.black,
  trackingEm = 0.06, weight = 900, opacity = 1}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const lt = frame / fps;
  const fs = Math.max(MIN_FONT, size);
  return (
    <div style={{position: 'absolute', left: x, top: y, fontFamily: SWISS_FONT, fontWeight: weight,
      fontSize: fs, letterSpacing: `${(trackingEm * fs).toFixed(2)}px`, whiteSpace: 'nowrap', opacity, pointerEvents: 'none'}}>
      {[...text].map((ch, k) => {
        const start = at + 0.045 * k;
        if (lt < start) return <span key={k} style={{display: 'inline-block', opacity: 0}}>{ch}</span>;
        const s = 1.5 - 0.5 * easeOutCubic(lt - start, 0.12);
        return (
          <span key={k} style={{display: 'inline-block', color: k % every === every - 1 ? altColor : color,
            transform: `translateY(${stampHop(lt, k).toFixed(2)}px) scale(${s.toFixed(4)})`,
            transformOrigin: '50% 78%'}}>{ch}</span>
        );
      })}
    </div>
  );
};
