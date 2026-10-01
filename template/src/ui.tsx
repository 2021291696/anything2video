import React from 'react';
import {FONT_HEAVY, FONT_TECH, FONT_MONO, TEXT_DY} from './common/lib';
import {GlitchIn, powOutRemain, BEZ_SCALE_IN, clamp01, easeInOutPow, SENTENCES} from './common';
import {getActiveRecipe} from './recipes';
import {VIDEO} from './config';

/**
 * 共用图元与调色板（黑填充 + 白描边 2–3px、主色 = 当前重点、辅助色 = 指标/警示、灰 = 非重点、绿 = 正确）。镜头组件 `import {…} from '../../ui'`。
 * 所有组件为纯函数式、绝对定位（画布 1280×720）；动画由调用方按 N 计算后传入（opacity/p/s 等）。
 * 调色板/光效常量按 config.VIDEO.recipe 经 recipes/getActiveRecipe() 派生（explainer 配方逐值等于 a2e 原实测常量，
 * 老片像素级不回归；promo 规范见 recipes/promo.ts，两配方差异详见 skill 的 recipes/ 文档）。导出名保持 a2e 原名，下游镜头零改动。
 */
const PAL = getActiveRecipe().palette;
// ---- 调色板（名 = a2e 原导出名，值随配方）----
export const PURPLE = PAL.accent; // 当前重点 / 激活 / 品牌（explainer = 标准胶囊紫 (102,48,248)）
export const PURPLE_LIGHT = PAL.accentLight; // 亮主色（高光端 / 穿过进度条后）
export const PURPLE_TECH = PAL.accentTech; // 英文科技字主色
export const PURPLE_DEEP = PAL.accentDeep; // 深主色（曲线 / 硬投影）
export const PURPLE_PALE = PAL.accentPale;
export const ORANGE = PAL.secondary; // 辅助色：指标数字 / 另一方 / 强调
export const CORAL = PAL.secondaryAlt;
export const RED_DEEP = PAL.warning; // 警示块
export const GREEN = PAL.correct; // 绿勾
export const GREY = PAL.grey; // 非激活
export const GREY_MID = PAL.greyMid;
export const GREY_LINE = PAL.greyLine; // 网格线
export const GREY_LIGHT = PAL.greyLight;
export const WHITE = PAL.white;
export const MAGENTA = PAL.magenta;
export const CYAN = PAL.cyan;
export const GLOW_PURPLE = PAL.glowAccent;
export const GLOW_PURPLE_S = PAL.glowAccentS;
export const GLOW_ORANGE = PAL.glowSecondary;
export const GLOW_RED = PAL.glowWarning;
export const BLOOM = PAL.bloom;
export const BLOOM_SOFT = PAL.bloomSoft;
export const TEXT_GLOW = PAL.textGlow;
export const PILL_SHADOW = PAL.pillShadow;

// ---- 色彩弧线（U1）：按句 id 锚定的主色/辅色插值，把「起承转合」从注释变成结构保证 ----
// colorArc 为空数组（或锚点全部无法解析）时恒返回配方色，逐值等价现状；镜头显式改调 arcAccent/arcSecondary 才生效。
// PURPLE/ORANGE 等 8 个既有常量一字不改，这里是并行的动态取值入口。
type ArcAnchor = {n: number; accent: [number, number, number]; secondary: [number, number, number]};
const ARC_RAMP = 30; // 过渡窗宽（帧）：锚点前 30 帧完成变色，其余帧保持当前值
const ARC_EASE = easeInOutPow(2.5); // 相邻锚点间的插值曲线（方案 U1 指定幂 2.5）
const hexToRgb = (hex: string): [number, number, number] | null => {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  return m ? [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)] : null;
};
/** #RRGGBB → rgba(r,g,b,a)（批 4 实测：模板字符串 `${hex}aa` 拼 8 位 hex 在色值非法时静默失效，统一走本助手）。
 *  非 6 位 hex 输入（渐变/rgba 串）原样返回；alpha 钳制 0–1。 */
export const withAlpha = (color: string, alpha: number): string => {
  const rgb = hexToRgb(color);
  return rgb ? `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${Math.max(0, Math.min(1, alpha))})` : color;
};
/** 锚点解析（惰性构建一次；colorArc/SENTENCES 均为生成期常量，渲染期不变）：atS 句 id → SENTENCES 起始帧，
 *  句 id 未匹配（未跑 tts_build 或占位数据）的锚点跳过；全跳过时整体回退恒定配方色。 */
let arcAnchorsCache: ArcAnchor[] | null = null;
const arcAnchors = (): ArcAnchor[] => {
  if (arcAnchorsCache) return arcAnchorsCache;
  const list: ArcAnchor[] = [];
  for (const a of VIDEO.colorArc) {
    const s = SENTENCES.find((q) => q.id === a.atS);
    const acc = hexToRgb(a.accent), sec = hexToRgb(a.secondary);
    if (s && acc && sec) list.push({n: s.from, accent: acc, secondary: sec});
  }
  list.sort((p, q) => p.n - q.n);
  arcAnchorsCache = list;
  return list;
};
const rgbCss = (c: [number, number, number]) => `rgb(${c[0]},${c[1]},${c[2]})`;
/** 主色/辅色公共插值（帧号 N 的纯函数）：首锚点前保持首值、末锚点后保持末值；段内最后 ARC_RAMP 帧对 RGB 三通道过渡。 */
const arcColorAt = (N: number, k: 'accent' | 'secondary'): string => {
  const anchors = arcAnchors();
  if (anchors.length === 0) return k === 'accent' ? PAL.accent : PAL.secondary;
  const val = (a: ArcAnchor) => (k === 'accent' ? a.accent : a.secondary);
  if (N <= anchors[0].n) return rgbCss(val(anchors[0]));
  for (let i = 1; i < anchors.length; i++) {
    const from = val(anchors[i - 1]), to = val(anchors[i]);
    const end = anchors[i].n;
    if (N < end) {
      const t0 = Math.max(anchors[i - 1].n, end - ARC_RAMP); // 过渡窗起点（窗比段短时贴段首截断）
      if (N <= t0) return rgbCss(from);
      const t = ARC_EASE((N - t0) / ARC_RAMP);
      return rgbCss([0, 1, 2].map((c) => Math.round(from[c] + (to[c] - from[c]) * t)) as [number, number, number]);
    }
  }
  return rgbCss(val(anchors[anchors.length - 1]));
};
/** 帧号 N 的弧线主色（动态入口；替代 PURPLE 常量的取值路径）。 */
export const arcAccent = (N: number): string => arcColorAt(N, 'accent');
/** 帧号 N（或句 id，经 SENTENCES 映射到起始帧）的弧线辅色（动态入口；替代 ORANGE 常量的取值路径）。 */
export const arcSecondary = (N: string | number): string => arcColorAt(typeof N === 'number' ? N : SENTENCES.find((q) => q.id === N)?.from ?? 0, 'secondary');

// ---- 动效小工具（n = N − f0）----
export const fadeIn = (n: number, len = 12) => clamp01(n / len);
export const fadeOut = (n: number, len = 15) => 1 - clamp01(n / len);
/** 自下滑入剩余位移（px）：Δ·(1−n/22)^2.5，用法 top = yEnd + slideUp(n) */
export const slideUp = (n: number, d = 300, N = 22) => d * powOutRemain(n, N, 2.5);
/** 21 帧缩放入场 0→1 */
export const scaleIn = (n: number, N = 21) => BEZ_SCALE_IN(clamp01(n / N));
/** 离场加速位移（px）：c·n²（n 帧），配 exitFade */
export const exitAccel = (n: number, c = 0.5) => (n <= 0 ? 0 : c * n * n);
/** 离场逐帧 6.7% 淡出 */
export const exitFade = (n: number) => (n <= 0 ? 1 : Math.pow(0.933, n));
/** 错峰：第 i 个元素延后 i·step 帧 */
export const stagger = (i: number, step = 2) => i * step;

export const abs = (x: number, y: number, w?: number, h?: number): React.CSSProperties => ({position: 'absolute', left: x, top: y, width: w, height: h});


/** 非闪烁入场（用户裁定：glitch 只给重点词，其余文字/标签一律用它）：len 帧 easeOut 淡入 + dy px 上浮；n<0 不渲染。签名与 GlitchIn 对齐（N,f0,children,style），可直接替换。 */
export const SoftIn: React.FC<{N: number; f0: number; children: React.ReactNode; len?: number; dy?: number; style?: React.CSSProperties}> = ({N, f0, children, len = 8, dy = 10, style}) => {
  const n = N - f0;
  if (n < 0) return null;
  const t = clamp01((n + 1) / (len + 1)); // 首帧即 ≈25% 可见（终检 v3：n=0 为 0 会让 HUD 换词/入场各空 1 帧）
  const e = 1 - Math.pow(1 - t, 2.5);
  const extra = typeof style?.opacity === 'number' ? style.opacity : 1;
  return (
    <div style={{position: 'absolute', inset: 0, ...style, opacity: e * extra, transform: `translateY(${((1 - e) * dy).toFixed(2)}px)${style?.transform ? ' ' + style.transform : ''}`}}>
      {children}
    </div>
  );
};

// ---- 屏级主角编排（U3）：显式声明唯一主角，其余元素自动降权 ----
/** 降权样式（压角色仍有存在感但自动让位）：saturate(0.45) brightness(0.72) + opacity dimAlpha（缺省 0.55）。
 *  纯 CSS 合成层滤镜，不产生 SVG filter 实例，不触碰 ≤6 红线。 */
export const dimmed = (dimAlpha = 0.55): React.CSSProperties => ({filter: 'saturate(0.45) brightness(0.72)', opacity: dimAlpha});
/** 屏级舞台容器：hero 原样渲染（唯一主角、垫顶），rest 逐个套 dimmed(dimAlpha) 且垫在主角之下。
 *  纯新增的编排容器，不删不改任何既有组件；单帧 DOM 增量 = rest.length 层全幅 div。 */
export const HeroStage: React.FC<{hero: React.ReactNode; rest?: React.ReactNode[]; dimAlpha?: number}> = ({hero, rest = [], dimAlpha = 0.55}) => (
  <>
    {rest.map((node, i) => (
      <div key={i} style={{position: 'absolute', inset: 0, ...dimmed(dimAlpha)}}>{node}</div>
    ))}
    {hero}
  </>
);

// ---- 文字 ----
export type CTextProps = {
  cx: number; cy: number; size: number; weight?: number; family?: string; color?: string; letterSpacing?: number;
  dy?: number; scaleX?: number; italic?: boolean; opacity?: number; shadow?: string; onSolid?: boolean; style?: React.CSSProperties; children: React.ReactNode;
};
/** 以墨迹中心 (cx,cy) 摆放的单行文字（Noto CJK 墨迹比行盒中心低 3–7px → dy 默认 −2）。
 *  onSolid（U15）：白字压实底/低照兜底，为真在既有 shadow 之后追加上下各 1px 暗边；缺省 false = 现状逐值等价。 */
export const CText: React.FC<CTextProps> = ({cx, cy, size, weight = 700, family = FONT_HEAVY, color = WHITE, letterSpacing = 0, dy = TEXT_DY, scaleX = 1, italic = false, opacity = 1, shadow, onSolid = false, style, children}) => (
  <div style={{position: 'absolute', left: cx, top: cy + dy, transform: `translate(-50%,-50%) scaleX(${scaleX})`, whiteSpace: 'nowrap', fontFamily: family, fontWeight: weight, fontSize: size, fontStyle: italic ? 'italic' : 'normal', lineHeight: 1, color, letterSpacing, opacity, textShadow: onSolid ? [shadow, '0 1px 0 rgba(0,0,0,.5), 0 -1px 0 rgba(0,0,0,.5)'].filter(Boolean).join(', ') : shadow, ...style}}>
    {children}
  </div>
);
/** 英文技术词：Exo 2 紫斜体 + scaleX 压窄 */
export const TechText: React.FC<{cx: number; cy: number; text: string; fontSize?: number; color?: string; scaleX?: number; weight?: number; letterSpacing?: number; glow?: boolean; opacity?: number; style?: React.CSSProperties}> = ({cx, cy, text, fontSize = 32, color = PURPLE_TECH, scaleX = 0.81, weight = 600, letterSpacing = 1, glow = true, opacity = 1, style}) => (
  <CText cx={cx} cy={cy} size={fontSize} weight={weight} family={FONT_TECH} color={color} letterSpacing={letterSpacing} scaleX={scaleX} italic opacity={opacity} dy={0} shadow={glow ? PAL.techGlow : undefined} style={style}>
    {text}
  </CText>
);
/** 等宽数字/代码文字 */
export const MonoText: React.FC<{x: number; y: number; size?: number; color?: string; opacity?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({x, y, size = 22, color = WHITE, opacity = 1, children, style}) => (
  <div style={{position: 'absolute', left: x, top: y, fontFamily: FONT_MONO, fontSize: size, lineHeight: 1.3, color, opacity, whiteSpace: 'pre', ...style}}>{children}</div>
);

// ---- 框 / 胶囊 ----
export type BoxProps = {x: number; y: number; w: number; h: number; r?: number; fill?: string; stroke?: string; sw?: number; dashed?: boolean; opacity?: number; glow?: string; style?: React.CSSProperties; children?: React.ReactNode};
/** 黑底白边矩形（border-box；fill 可为渐变字串；glow 传 boxShadow） */
export const Box: React.FC<BoxProps> = ({x, y, w, h, r = 0, fill = '#000', stroke = WHITE, sw = 2, dashed = false, opacity = 1, glow, style, children}) => (
  <div style={{...abs(x, y, w, h), boxSizing: 'border-box', background: fill, border: sw > 0 ? `${sw}px ${dashed ? 'dashed' : 'solid'} ${stroke}` : undefined, borderRadius: r, opacity, boxShadow: glow, ...style}}>{children}</div>
);
export type PillProps = BoxProps & {text?: React.ReactNode; fontSize?: number; weight?: number; color?: string; family?: string; textDy?: number; letterSpacing?: number; scaleX?: number};
/** 全圆角胶囊 + 居中文字（(x,y,w,h) 含描边外框） */
export const Pill: React.FC<PillProps> = ({text, fontSize = 28, weight = 700, color = WHITE, family = FONT_HEAVY, textDy = -2, letterSpacing = 0, scaleX = 1, r, h, ...box}) => (
  <Box {...box} h={h} r={r ?? h / 2}>
    <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `translateY(${textDy}px) scaleX(${scaleX})`, fontFamily: family, fontWeight: weight, fontSize, color, letterSpacing, lineHeight: 1, whiteSpace: 'nowrap'}}>{text}</div>
  </Box>
);
/** 大标签块（沿用「召回/精排」体系简化版）：色块 + 超粗字 scaleX .73 + 同色外发光 */
export const TagBlock: React.FC<{x: number; y: number; w?: number; h?: number; color?: string; text: string; fontSize?: number; opacity?: number; glow?: boolean; skewPx?: number}> = ({x, y, w = 237, h = 62, color = PURPLE, text, fontSize = 44, opacity = 1, glow = true, skewPx = 0}) => (
  <div style={{...abs(x, y, w, h), opacity}}>
    <div style={{position: 'absolute', inset: 0, background: color, transform: skewPx ? `skewX(${(-Math.atan2(skewPx, h) * 180) / Math.PI}deg)` : undefined, boxShadow: glow ? `0 0 28px 10px ${withAlpha(color, 0.6)}` : undefined}} />
    <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_HEAVY, fontWeight: 900, fontSize, color: WHITE, letterSpacing: -1, lineHeight: 1, transform: 'translateY(-2px) scaleX(0.8)', WebkitTextStroke: '1.5px #000', paintOrder: 'stroke fill'}}>{text}</div>
  </div>
);

// ---- SVG 图形 ----
export type BloomLevel = 'full' | 'soft' | 'none'; // 辉光档位（U9）：full=BLOOM（缺省）｜soft=BLOOM_SOFT｜none=不挂 filter
/** 全幅 1280×720 SVG 容器（默认 BLOOM）。bloomLevel 为 U9 预算档位：缺省 'full' 与原 bloom 布尔逐值等价；
 *  显式 'soft' 走 BLOOM_SOFT、'none' 不挂 filter（省 SVG filter 实例，单帧 ≤6 红线由分镜登记保证）。 */
export const Svg: React.FC<{children: React.ReactNode; style?: React.CSSProperties; bloom?: boolean; bloomLevel?: BloomLevel; opacity?: number}> = ({children, style, bloom = true, bloomLevel = 'full', opacity = 1}) => (
  <svg width={1280} height={720} viewBox="0 0 1280 720" style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', filter: bloomLevel === 'soft' ? BLOOM_SOFT : bloomLevel === 'none' ? undefined : bloom ? BLOOM : undefined, opacity, ...style}}>
    {children}
  </svg>
);
/** 任意方向直箭头（SVG <g>）：p=生长进度 0→1（自根部长出：杆先到、头随之），端点 (x1,y1) 为尖端 */
export const LineArrow: React.FC<{x0: number; y0: number; x1: number; y1: number; p?: number; rodW?: number; headL?: number; headW?: number; color?: string; opacity?: number; dashed?: boolean}> = ({x0, y0, x1, y1, p = 1, rodW = 3, headL = 22, headW = 24, color = WHITE, opacity = 1, dashed = false}) => {
  if (p <= 0) return null;
  const dx = x1 - x0, dy = y1 - y0;
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L;
  const len = L * clamp01(p);
  const hl = Math.min(headL, len);
  const tx = x0 + ux * len, ty = y0 + uy * len; // 当前尖端
  const bx = tx - ux * hl, by = ty - uy * hl; // 头底中心
  const px = -uy, py = ux;
  const hw = (headW / 2) * (hl / headL);
  return (
    <g opacity={opacity}>
      <line x1={x0} y1={y0} x2={bx + ux * 1} y2={by + uy * 1} stroke={color} strokeWidth={rodW} strokeLinecap="butt" strokeDasharray={dashed ? '8 7' : undefined} />
      <polygon points={`${tx},${ty} ${bx + px * hw},${by + py * hw} ${bx - px * hw},${by - py * hw}`} fill={color} />
    </g>
  );
};
/** 水平箭头 div 版（左端锚 scaleX = 自根部长出）；dir 'left' 时以右端为根 */
export const ArrowH: React.FC<{x: number; y: number; w?: number; h?: number; p?: number; color?: string; dir?: 'right' | 'left'; shaft?: number; opacity?: number}> = ({x, y, w = 70, h = 27, p = 1, color = WHITE, dir = 'right', shaft = 3, opacity = 1}) => (
  <div style={{...abs(x, y, w, h), opacity, transform: `scaleX(${clamp01(p) * (dir === 'left' ? -1 : 1)})`, transformOrigin: dir === 'left' ? '100% 50%' : '0 50%'}}>
    <div style={{position: 'absolute', left: 0, top: h / 2 - shaft / 2, width: w - 20, height: shaft, background: color}} />
    <div style={{position: 'absolute', left: w - 24, top: 0, width: 0, height: 0, borderTop: `${h / 2}px solid transparent`, borderBottom: `${h / 2}px solid transparent`, borderLeft: `24px solid ${color}`}} />
  </div>
);
/** 勾 / 叉（SVG 全幅内使用，p 为 draw-on 进度）。p<=0 不渲染（批 4 实测：round linecap 在 dashoffset=全长时仍会画出起点圆点伪影）。 */
export const Check: React.FC<{cx: number; cy: number; size?: number; color?: string; sw?: number; p?: number; opacity?: number}> = ({cx, cy, size = 60, color = GREEN, sw = 7, p = 1, opacity = 1}) => {
  if (p <= 0) return null;
  const s = size / 60;
  const pts: Array<[number, number]> = [[cx - 26 * s, cy + 2 * s], [cx - 8 * s, cy + 20 * s], [cx + 28 * s, cy - 20 * s]];
  const total = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]) + Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
  return <polyline points={pts.map((q) => q.join(',')).join(' ')} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={total} strokeDashoffset={total * (1 - clamp01(p))} opacity={opacity} />;
};
export const Cross: React.FC<{cx: number; cy: number; size?: number; color?: string; sw?: number; p?: number; opacity?: number}> = ({cx, cy, size = 50, color = CORAL, sw = 7, p = 1, opacity = 1}) => {
  const r = size / 2;
  const d = size * Math.SQRT2;
  return (
    <g opacity={opacity} stroke={color} strokeWidth={sw} strokeLinecap="round">
      <line x1={cx - r} y1={cy - r} x2={cx + r} y2={cy + r} strokeDasharray={d} strokeDashoffset={d * (1 - clamp01(Math.min(1, p * 2)))} />
      <line x1={cx + r} y1={cy - r} x2={cx - r} y2={cy + r} strokeDasharray={d} strokeDashoffset={d * (1 - clamp01(Math.max(0, p * 2 - 1)))} />
    </g>
  );
};

// ---- 语义图标（RAG 主题）----
/** 文档页：黑底白边 + 折角 + 文本线条（lines 条），label 在下方。
 *  bloomLevel（U9）：缺省 'soft' = 现状（glow 时不挂 filter，否则 BLOOM_SOFT，逐值等价）；'none' 强制不挂、'full' 升 BLOOM。 */
export const DocIcon: React.FC<{x: number; y: number; w?: number; h?: number; lines?: number; color?: string; fill?: string; sw?: number; label?: string; labelSize?: number; opacity?: number; accent?: string; glow?: string; bloomLevel?: BloomLevel}> = ({x, y, w = 64, h = 80, lines = 4, color = WHITE, fill = '#000', sw = 2, label, labelSize = 22, opacity = 1, accent, glow, bloomLevel = 'soft'}) => {
  const f = w * 0.3;
  const flt = glow ? undefined : bloomLevel === 'none' ? undefined : bloomLevel === 'full' ? BLOOM : BLOOM_SOFT;
  return (
    <div style={{...abs(x, y, w, h + (label ? labelSize + 14 : 0)), opacity}}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', filter: flt}}>
        <path d={`M${sw / 2},${sw / 2} H${w - f - sw / 2} L${w - sw / 2},${f + sw / 2} V${h - sw / 2} H${sw / 2} Z`} fill={fill} stroke={color} strokeWidth={sw} strokeLinejoin="round" />
        <path d={`M${w - f - sw / 2},${sw / 2} V${f + sw / 2} H${w - sw / 2}`} fill="none" stroke={color} strokeWidth={sw} strokeLinejoin="round" />
        {Array.from({length: lines}, (_, i) => {
          const ly = f + 12 + i * ((h - f - 22) / Math.max(1, lines - 1 + 0.6));
          const lw = (i === lines - 1 ? 0.55 : 0.72) * w;
          return <rect key={i} x={w * 0.14} y={ly} width={lw} height={3} fill={accent && i === 0 ? accent : color} opacity={accent && i === 0 ? 1 : 0.85} />;
        })}
      </svg>
      {label ? <CText cx={w / 2} cy={h + labelSize / 2 + 8} size={labelSize} weight={600} color={color} dy={-1}>{label}</CText> : null}
    </div>
  );
};
/** 数据库圆柱（向量数据库 / 索引）。bloomLevel（U9）：缺省 'soft' = 现状 BLOOM_SOFT；'none' 不挂、'full' 升 BLOOM。 */
export const DBIcon: React.FC<{cx: number; cy: number; w?: number; h?: number; color?: string; fill?: string; sw?: number; opacity?: number; label?: string; labelSize?: number; accent?: string; bloomLevel?: BloomLevel}> = ({cx, cy, w = 120, h = 130, color = WHITE, fill = '#000', sw = 2.5, opacity = 1, label, labelSize = 24, accent, bloomLevel = 'soft'}) => {
  const ry = w * 0.18;
  const x0 = cx - w / 2, y0 = cy - h / 2;
  return (
    <div style={{...abs(x0, y0, w, h + (label ? labelSize + 14 : 0)), opacity}}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', filter: bloomLevel === 'none' ? undefined : bloomLevel === 'full' ? BLOOM : BLOOM_SOFT}}>
        <path d={`M${sw},${ry} V${h - ry} A${w / 2 - sw},${ry} 0 0 0 ${w - sw},${h - ry} V${ry}`} fill={fill} stroke={color} strokeWidth={sw} />
        <ellipse cx={w / 2} cy={ry} rx={w / 2 - sw} ry={ry - sw / 2} fill={accent ?? fill} stroke={color} strokeWidth={sw} />
        {[0.42, 0.66].map((t) => <path key={t} d={`M${sw},${h * t} A${w / 2 - sw},${ry} 0 0 0 ${w - sw},${h * t}`} fill="none" stroke={color} strokeWidth={sw * 0.7} opacity={0.8} />)}
      </svg>
      {label ? <CText cx={w / 2} cy={h + labelSize / 2 + 8} size={labelSize} weight={600} color={color} dy={-1}>{label}</CText> : null}
    </div>
  );
};
/** 文本块 chunk 卡：黑底白边圆角 + 若干灰白文本线；active → 紫边 + 柔光 */
export const ChunkCard: React.FC<{x: number; y: number; w?: number; h?: number; lines?: number; active?: boolean; opacity?: number; r?: number; title?: string; seed?: number; sw?: number}> = ({x, y, w = 150, h = 92, lines = 4, active = false, opacity = 1, r = 8, title, seed = 1, sw = 2}) => (
  <Box x={x} y={y} w={w} h={h} r={r} stroke={active ? PURPLE_LIGHT : WHITE} sw={sw} opacity={opacity} glow={active ? GLOW_PURPLE_S : undefined}>
    {title ? <div style={{position: 'absolute', left: 12, top: 8, fontFamily: FONT_HEAVY, fontSize: 15, fontWeight: 600, color: PURPLE_LIGHT, whiteSpace: 'nowrap', lineHeight: 1}}>{title}</div> : null}
    {Array.from({length: lines}, (_, i) => {
      const lw = (0.5 + 0.42 * (((seed * 7 + i * 13) % 10) / 10)) * (w - 24);
      const top = (title ? 30 : 14) + i * ((h - (title ? 40 : 26)) / Math.max(1, lines - 0.3));
      return <div key={i} style={{position: 'absolute', left: 12, top, width: i === lines - 1 ? lw * 0.6 : lw, height: 3, background: active ? WHITE : GREY_LIGHT, opacity: 0.9}} />;
    })}
  </Box>
);
/** 大模型图标：圆角方块 + 内部"神经元"三层点阵，label 可选 */
export const LLMIcon: React.FC<{cx: number; cy: number; size?: number; color?: string; accent?: string; opacity?: number; label?: string; labelSize?: number; glow?: boolean}> = ({cx, cy, size = 140, color = WHITE, accent = PURPLE, opacity = 1, label, labelSize = 28, glow = true}) => {
  const s = size;
  const cols = [0.28, 0.5, 0.72];
  const rows = [[0.3, 0.5, 0.7], [0.22, 0.38, 0.62, 0.78], [0.3, 0.5, 0.7]];
  return (
    <div style={{...abs(cx - s / 2, cy - s / 2, s, s + (label ? labelSize + 16 : 0)), opacity}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: s, height: s, boxSizing: 'border-box', background: '#000', border: `3px solid ${color}`, borderRadius: s * 0.16, boxShadow: glow ? GLOW_PURPLE : undefined}} />
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{position: 'absolute', left: 0, top: 0}}>
        {cols.slice(0, -1).map((cxr, ci) => rows[ci].map((ry, i) => rows[ci + 1].map((ry2, j) => <line key={`${ci}-${i}-${j}`} x1={cxr * s} y1={ry * s} x2={cols[ci + 1] * s} y2={ry2 * s} stroke={GREY} strokeWidth={1.3} opacity={0.7} />)))}
        {cols.map((cxr, ci) => rows[ci].map((ry, i) => <circle key={`${ci}-${i}`} cx={cxr * s} cy={ry * s} r={s * 0.045} fill={ci === 1 ? accent : color} />))}
      </svg>
      {label ? <CText cx={s / 2} cy={s + labelSize / 2 + 10} size={labelSize} weight={700} color={color}>{label}</CText> : null}
    </div>
  );
};
/** 顶部 HUD 胶囊（沿用 (533,28,216,51) 位置，宽随文字）：GlitchIn 入场；tech 为其下方的英文副标（中心 y 92） */
export const TopCapsule: React.FC<{N: number; f0: number; text: string; w?: number; fill?: string; tech?: string; opacity?: number; textSize?: number; glitch?: boolean}> = ({N, f0, text, w = 216, fill = PURPLE, tech, opacity = 1, textSize = 33, glitch = false}) => (
  // 用户裁定（2026-09-06）：闪烁只给重点词；HUD 换词默认用 SoftIn 淡入，glitch 需显式开
  glitch ? (
  <GlitchIn N={N} f0={f0} style={{opacity}}>
    <Pill x={640 - w / 2} y={28} w={w} h={51} fill={fill} sw={2} text={text} fontSize={textSize} weight={700} letterSpacing={1} textDy={-2} style={{filter: PILL_SHADOW}} />
    {tech ? <TechText cx={640} cy={94} text={tech} fontSize={30} scaleX={0.8} /> : null}
  </GlitchIn>
  ) : (
  <SoftIn N={N} f0={f0} style={{opacity}} dy={6}>
    <Pill x={640 - w / 2} y={28} w={w} h={51} fill={fill} sw={2} text={text} fontSize={textSize} weight={700} letterSpacing={1} textDy={-2} style={{filter: PILL_SHADOW}} />
    {tech ? <TechText cx={640} cy={94} text={tech} fontSize={30} scaleX={0.8} /> : null}
  </SoftIn>
  )
);

// ---- 漏斗层（召回→重排→生成 之类的分层筛选）----
/** 灰→紫的非对称水平渐变 stops（原片实测：最暗平台在 t≈0.5–0.6，右半升得更慢）。k=0 灰、k=1 紫。 */
const TRAP_STOPS: Array<[number, number, number[]]> = [[0, 224, [230, 220, 255]], [0.18, 190, [170, 140, 250]], [0.45, 160, [110, 60, 248]], [0.6, 160, [102, 45, 248]], [0.8, 178, [125, 85, 248]], [1, 224, [230, 220, 255]]];
export const trapStops = (k: number): Array<[number, string]> => TRAP_STOPS.map(([t, g, p]) => [t, `rgb(${p.map((v) => Math.round(g + (v - g) * k)).join(',')})`] as [number, string]);
let trapSeq = 0;
/** 倒梯形漏斗层：顶宽 wTop、底宽 wBot、高 h，水平渐变填充 + 2px 白边 + 居中文字。k 0→1 灰变紫（11 帧变色用）。 */
export const Trap: React.FC<{cx: number; y: number; wTop: number; wBot: number; h: number; k?: number; stops?: Array<[number, string]>; text?: React.ReactNode; fontSize?: number; textDy?: number; stroke?: number; textShadow?: string; opacity?: number}> = ({cx, y, wTop, wBot, h, k = 1, stops, text, fontSize = 34, textDy = -2, stroke = 2, textShadow = '0 2px 12px rgba(0,0,0,.45)', opacity = 1}) => {
  const idRef = React.useRef<string | undefined>(undefined);
  if (!idRef.current) idRef.current = `trap-${trapSeq++}`;
  const id = idRef.current;
  const Wd = wTop + 8, x0 = cx - Wd / 2;
  const pts = `${4},${1} ${4 + wTop},${1} ${4 + (wTop + wBot) / 2},${1 + h} ${4 + (wTop - wBot) / 2},${1 + h}`;
  return (
    <div style={{...abs(x0, y, Wd, h + 4), opacity}}>
      <svg width={Wd} height={h + 4} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            {(stops ?? trapStops(k)).map(([o, c], i) => <stop key={i} offset={o} stopColor={c} />)}
          </linearGradient>
        </defs>
        <polygon points={pts} fill={`url(#${id})`} stroke={WHITE} strokeWidth={stroke} strokeLinejoin="miter" />
      </svg>
      {text !== undefined ? <div style={{position: 'absolute', left: 0, top: 0, width: Wd, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_HEAVY, fontWeight: 700, fontSize, color: WHITE, lineHeight: 1, textShadow, transform: `translateY(${textDy}px)`}}>{text}</div> : null}
    </div>
  );
};

/** 通用数字计数（tabular）*/
export const Counter: React.FC<{cx: number; cy: number; value: string | number; size?: number; color?: string; opacity?: number; weight?: number}> = ({cx, cy, value, size = 58, color = WHITE, opacity = 1, weight = 700}) => (
  <CText cx={cx} cy={cy} size={size} weight={weight} color={color} opacity={opacity} letterSpacing={-0.5} shadow={TEXT_GLOW} style={{fontVariantNumeric: 'tabular-nums'}}>
    {value}
  </CText>
);

// ---- 通用结构图元（U4）：信息卡 / 横向条形图 / 三态时间线 / 对比双栏 ----
// 与上方 RAG 语义图标并列的独立分区；参数全部走 PAL 派生（不含任何主题语义），换主题通用。
// 四者均为纯函数、绝对定位（画布 1280×720），入场动画由调用方按 N 算好进度/opacity 传入；
// 单帧 DOM 预算逐条标注于各组件注释（SVG filter 实例 0——发光走 CSS boxShadow，不触碰 ≤6 红线）。

/** 信息卡：2px 白描边、圆角 18、黑底；标题 40/900/scaleX .86、值 64/700 tabular、单位 24、来源脚注 22 灰。
 *  accent 为真时挂 GLOW_PURPLE_S 外发光（把卡升级为本屏主角，与 U3 唯一主角纪律配合）。
 *  fill（可选）：卡底色透传 Box（缺省 undefined = Box 的 '#000'，现状逐值）。
 *  单帧 DOM ≈ 7 节点：卡体 1 + 标题 1 + 值区 2 + 值/单位 2 + 脚注 1。 */
export const Card: React.FC<{x: number; y: number; w: number; h: number; title: string; value?: string | number; unit?: string; source?: string; accent?: boolean; fill?: string; opacity?: number}> = ({x, y, w, h, title, value, unit, source, accent = false, fill, opacity = 1}) => (
  <Box x={x} y={y} w={w} h={h} r={18} sw={2} fill={fill} opacity={opacity} glow={accent ? GLOW_PURPLE_S : undefined}>
    <CText cx={w / 2} cy={46} size={40} weight={900} scaleX={0.86} color={WHITE}>{title}</CText>
    {value !== undefined ? (
      <div style={{position: 'absolute', left: 0, top: 72, width: w, height: Math.max(0, h - 104), display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 8, fontFamily: FONT_HEAVY, lineHeight: 1}}>
          <span style={{fontSize: 64, fontWeight: 700, color: WHITE, fontVariantNumeric: 'tabular-nums'}}>{value}</span>
          {unit ? <span style={{fontSize: 24, fontWeight: 700, color: WHITE, opacity: 0.9}}>{unit}</span> : null}
        </div>
      </div>
    ) : null}
    {source ? <CText cx={w / 2} cy={h - 26} size={22} weight={600} color={GREY}>{source}</CText> : null}
  </Box>
);

/** 横向条形图行：label 行名、value 数值、max 单行独立满刻度（缺省用全表最大值统一刻度）。
 *  progress（可选，行级生长）：0–1，调用方按 N 算好传入——该行填充宽 = 满值宽 × frac × progress、数值文字透明度同乘 progress
 *  （行级接力生长；缺省 undefined = 即时满值，现状逐值）。
 *  litAt（可选，行级点亮帧）：传入后该行在 N ≥ litAt 时走主角 accent（需 BarChart 同帧传 N；缺省 undefined = topIdx 自动，现状逐值）。
 *  批 4 实测 topIdx accent 联动陷阱：主角行 ≠ 数值最大行时（如 accent 给重点行而非峰值行）自动联动会点错行，
 *  val-swiss SC0304 组内 workaround（红行 i===4 手工指定）上移为本字段。 */
export type BarRow = {label: string; value: number; max?: number; progress?: number; litAt?: number};
/** 横向条形图：轨道 PAL.bgPanel、条高 28 / 间距 18；最大值行唯一走 accent 渐变（内建每屏唯一主角纪律），其余行 PAL.grey；
 *  行标签 26 白、数值右对齐 tabular 32（主角行白 / 其余灰）。
 *  valueW：数值列宽，缺省 96（现状不动）；数据密集片（≥5 行短数值）推荐传 56——val-swiss SC0304 瑞士复刻实测值，可换回更多轨道宽。
 *  showValue（缺省 true = 现状）：false 隐藏数值列（纯图形对比用）。
 *  N（可选）：与行级 litAt 配对的当前绝对帧号（模板纪律：动画量由调用方按 N 算好传入）。
 *  单帧 DOM ≈ 1 + 每行 4（标签/轨道/填充/数值），5 行 ≈ 21 节点，远低于 600 红线。 */
export const BarChart: React.FC<{x: number; y: number; w: number; rows: BarRow[]; barH?: number; gap?: number; labelW?: number; valueW?: number; opacity?: number; showValue?: boolean; N?: number}> = ({x, y, w, rows, barH = 28, gap = 18, labelW = 190, valueW = 96, opacity = 1, showValue = true, N}) => {
  const topIdx = rows.reduce((b, r, i) => (r.value > rows[b].value ? i : b), 0); // 最大值行（并列取首个，保证唯一主色）
  const trackX = labelW + 14;
  const trackW = Math.max(0, w - trackX - valueW - 14);
  return (
    <div style={{...abs(x, y, w, Math.max(0, rows.length * (barH + gap) - gap)), opacity}}>
      {rows.map((r, i) => {
        const scale = r.max ?? Math.max(...rows.map((q) => q.value), 0);
        const grow = r.progress === undefined ? 1 : clamp01(r.progress); // 行级生长（缺省 1 = 现状）
        const frac = (scale > 0 ? clamp01(r.value / scale) : 0) * grow;
        const isTop = r.litAt === undefined ? i === topIdx : N !== undefined && N >= r.litAt; // 行级点亮（litAt 配 N；缺省 topIdx 自动 = 现状）
        return (
          <div key={i} style={{position: 'absolute', left: 0, top: i * (barH + gap), width: w, height: barH}}>
            <div style={{position: 'absolute', left: 0, top: 0, width: labelW, height: barH, display: 'flex', alignItems: 'center', fontFamily: FONT_HEAVY, fontWeight: 700, fontSize: 26, color: WHITE, lineHeight: 1}}>{r.label}</div>
            <div style={{position: 'absolute', left: trackX, top: 0, width: trackW, height: barH, background: PAL.bgPanel}} />
            <div style={{position: 'absolute', left: trackX, top: 0, width: trackW * frac, height: barH, background: isTop ? `linear-gradient(90deg, ${PAL.accent}, ${PAL.accentLight})` : PAL.grey}} />
            {showValue ? <div style={{position: 'absolute', left: trackX + trackW + 14, top: 0, width: valueW, height: barH, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontFamily: FONT_HEAVY, fontWeight: 700, fontSize: 32, color: isTop ? WHITE : PAL.grey, fontVariantNumeric: 'tabular-nums', lineHeight: 1, opacity: grow}}>{r.value}</div> : null}
          </div>
        );
      })}
    </div>
  );
};

/** 三态横向流程：已过 = PAL.bgPanel 底 + PAL.greyMid 字/边；当前 = PAL.accent 底 + GLOW_PURPLE_S 光 + pillTextOnAccent 字；
 *  未来 = 透明底 + PAL.greyLine 边/字。段间 ArrowH 自动衔接（已过段间箭头 greyMid、其后 greyLine）。
 *  单帧 DOM ≈ 1 + 每步 2 + 每箭头 3，5 步 ≈ 23 节点。 */
export const Timeline3: React.FC<{x: number; y: number; w: number; steps: string[]; active: number; boxH?: number; arrowW?: number; fontSize?: number; opacity?: number}> = ({x, y, w, steps, active, boxH = 64, arrowW = 32, fontSize = 26, opacity = 1}) => {
  const n = steps.length;
  if (n === 0) return null;
  const bw = (w - (n - 1) * arrowW) / n; // 每段宽（箭头居间）
  return (
    <div style={{...abs(x, y, w, boxH), opacity}}>
      {steps.map((s, i) => {
        const past = i < active, cur = i === active;
        return (
          <Box key={i} x={i * (bw + arrowW)} y={0} w={bw} h={boxH} r={12} sw={2} fill={cur ? PAL.accent : past ? PAL.bgPanel : 'transparent'} stroke={cur ? WHITE : past ? PAL.greyMid : PAL.greyLine} glow={cur ? GLOW_PURPLE_S : undefined}>
            <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_HEAVY, fontWeight: 700, fontSize, color: cur ? PAL.pillTextOnAccent : past ? PAL.greyMid : PAL.greyLine, whiteSpace: 'nowrap', lineHeight: 1}}>{s}</div>
          </Box>
        );
      })}
      {steps.slice(0, -1).map((_, i) => <ArrowH key={`a${i}`} x={i * (bw + arrowW) + bw} y={(boxH - 22) / 2} w={arrowW} h={22} p={1} color={i < active ? PAL.greyMid : PAL.greyLine} shaft={3} />)}
    </div>
  );
};

/** 对比双栏侧：label 标签 + children 该栏内容（按半宽 half = (w−2)/2 自行布局）。 */
export type CompareSide = {label: string; children?: React.ReactNode};
/** 对比双栏：中间 2px PAL.greyLine 竖分隔；左右各带 40px 高的顶部标签带（左白 / 右走 PAL.secondary「另一方」惯例，
 *  900/30/字距 2），children 垫在标签带下方。
 *  自身单帧 DOM ≈ 6 节点（容器 1 + 分隔 1 + 标签 2 + 内容容器 2），children 另计。 */
export const Compare: React.FC<{x: number; y: number; w: number; h: number; left: CompareSide; right: CompareSide; opacity?: number}> = ({x, y, w, h, left, right, opacity = 1}) => {
  const half = (w - 2) / 2;
  const side = (label: string, color: string, lx: number, children: React.ReactNode | undefined, key: string) => (
    <React.Fragment key={key}>
      <div style={{position: 'absolute', left: lx, top: 0, width: half, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_HEAVY, fontWeight: 900, fontSize: 30, color, letterSpacing: 2, lineHeight: 1}}>{label}</div>
      {children ? <div style={{position: 'absolute', left: lx, top: 40, width: half, height: Math.max(0, h - 40)}}>{children}</div> : null}
    </React.Fragment>
  );
  return (
    <div style={{...abs(x, y, w, h), opacity}}>
      <div style={{position: 'absolute', left: half, top: 0, width: 2, height: '100%', background: PAL.greyLine}} />
      {side(left.label, WHITE, 0, left.children, 'l')}
      {side(right.label, PAL.secondary, half + 2, right.children, 'r')}
    </div>
  );
};
