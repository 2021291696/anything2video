import React from 'react';
import {FONT_ORB, DirBlur, H} from './common/lib';
import {clamp01, easeInOutPow, BEZ_SCALE_IN} from './common';
import {CText, PURPLE, PURPLE_LIGHT, WHITE, GLOW_PURPLE, abs} from './ui';
import {getActiveRecipe, rgbOf} from './recipes';

/**
 * 光效 / 高光时刻 / 纵深 / 运镜 图元（从样片《RAG 与知识库》各组辅助文件升级而来；规则见 reference/composition-and-light.md）。
 * 镜头里 `import {…} from '../../fx'`。全部纯函数：动画量由镜头按 N 算好传入，或传 N/f0 让组件自己算相对帧。
 * 内联 rgba 光效的基色 / 光环渐变端色按 config.VIDEO.recipe 经 recipes/ 派生（explainer 逐值等于 a2e 原实测值）。
 * 用途速查：
 *   LightBar / LightSweep  紫光条横扫（高光时刻开场，三轮）
 *   StageLine              中央舞台光线：展宽 → 呼吸 → 节拍帧白闪 3 帧后消失
 *   GhostText              主角文字的白描边轮廓 10% 隐现（预示）
 *   HaloRing               主体脚下的紫色光环（外环内环白描边 + 紫渐变 + 虚线波纹），可分前后半环夹住主体
 *   HeroGlow               给任何矩形主角加双层紫柔光 + 30 帧呼吸
 *   BigNumber / countTo    大数字（Orbitron + 紫硬投影 + 白光），tabular，可计数
 *   Sparkle / GradBall     四角小星 / 顶亮底黑小球
 *   TiltPlane              倾斜平面（纵深层）
 *   CameraRig / camAt      定点推近 / 平移 / 整页滚动的相机（世界坐标 → 屏幕）
 *   SET_PIECE / setPiece   登场型高光时刻的标准相对帧
 */

const PAL = getActiveRecipe().palette; // 光效基色 token（accentGlowRgb/haloDark/haloLight），见 recipes/types.ts

// ---- 紫光条 ----
/** 单条光条：黑底上的紫色渐变条 + 紫外发光 + 白芯。alpha 为整体透明度。 */
export const LightBar: React.FC<{x: number; y: number; w: number; h: number; alpha?: number; color?: string; core?: boolean}> = ({x, y, w, h, alpha = 0.3, color = PURPLE_LIGHT, core = true}) => (
  <div style={{...abs(x, y, w, h), opacity: alpha}}>
    <div style={{position: 'absolute', inset: 0, borderRadius: h / 2, background: `linear-gradient(90deg, transparent 0%, ${color} 16%, ${color} 84%, transparent 100%)`, boxShadow: `0 0 ${h * 2.4}px ${h * 0.9}px rgba(${PAL.accentGlowRgb},.6)`}} />
    {core ? <div style={{position: 'absolute', left: w * 0.18, right: w * 0.18, top: h * 0.3, height: h * 0.4, borderRadius: h, background: 'linear-gradient(90deg, transparent 0%, #FFFFFF 28%, #FFFFFF 72%, transparent 100%)', boxShadow: '0 0 6px 1px rgba(255,255,255,.75)'}} /> : null}
  </div>
);
/** 光条 x：n 帧内自左 −w 扫到 1280+w（easeInOut 1.6） */
export const sweepX = (n: number, w: number, len = 16) => -w + (1280 + 2 * w) * easeInOutPow(1.6)(clamp01(n / len));
/** 默认三条光条 [y, h, w, 帧偏移]（样片 SC08） */
export const SWEEP_BARS: Array<[number, number, number, number]> = [[292, 6, 420, 0], [334, 10, 560, 2], [378, 6, 380, 4]];
/**
 * 一轮或多轮横扫：rounds 为各轮起始帧（样片 3 轮，轮距 18 帧首尾相接），alphas 各轮透明度；dy 整体上下平移（让光线对准主角中心）。
 * 每轮 3 条、2 帧错峰、16 帧；末段按 (1−t^6) 收尾，避免硬消失。
 */
export const LightSweep: React.FC<{N: number; rounds: number[]; alphas?: number[]; bars?: Array<[number, number, number, number]>; dy?: number; len?: number}> = ({N, rounds, alphas = [0.6, 0.55, 0.55], bars = SWEEP_BARS, dy = 0, len = 16}) => (
  <>
    {rounds.map((t0, k) =>
      bars.map(([y, h, w, off], i) => {
        const n = N - t0 - off;
        if (n < 0 || n > len) return null;
        return <LightBar key={`${k}-${i}`} x={sweepX(n, w, len)} y={y + dy - h / 2} w={w} h={h} alpha={(alphas[k] ?? 0.55) * (1 - Math.pow(clamp01(n / len), 6))} />;
      }),
    )}
  </>
);

// ---- 舞台光线 ----
/**
 * 中央光线：f0 起 14 帧展宽到 w（幂 2.5 缓出），之后 α 呼吸 .45±.15；flashAt 起 3 帧白闪（.95/.7/.35）然后消失。
 * 用法：主角 GlitchIn 的节拍帧 = flashAt。
 */
export const StageLine: React.FC<{N: number; f0: number; flashAt?: number; cx?: number; cy?: number; w?: number; h?: number}> = ({N, f0, flashAt = Infinity, cx = 640, cy = 331, w = 720, h = 3}) => {
  const n = N - f0;
  if (n < 0) return null;
  const flash = N >= flashAt ? N - flashAt : -1;
  if (flash >= 3) return null;
  const lineW = w * (1 - Math.pow(1 - clamp01(n / 14), 2.5));
  const breathe = 0.45 + 0.15 * Math.sin(n * 0.28);
  return (
    <div style={{position: 'absolute', left: cx - lineW / 2, top: cy - h / 2, width: lineW, height: h, borderRadius: h, background: flash >= 0 ? WHITE : `linear-gradient(90deg, transparent, ${PURPLE_LIGHT} 20%, ${PURPLE_LIGHT} 80%, transparent)`, opacity: flash >= 0 ? [0.95, 0.7, 0.35][flash] : breathe, boxShadow: flash >= 0 ? '0 0 30px 8px rgba(255,255,255,.55)' : `0 0 18px 4px rgba(${PAL.accentGlowRgb},.5)`}} />
  );
};

// ---- 幽灵轮廓 ----
/** 主角文字的白描边、透明填充、紫雾轮廓：opacity 由调用方给（样片 (0.1+0.02·sin)·fadeIn(n,12)，glitch 期间保留作底，pulse 起撤掉） */
export const GhostText: React.FC<{cx: number; cy: number; size: number; family?: string; weight?: number; letterSpacing?: number; opacity: number; dy?: number; scaleX?: number; children: React.ReactNode}> = ({cx, cy, size, family, weight = 400, letterSpacing = 8, opacity, dy = -4, scaleX = 1, children}) => {
  if (opacity <= 0) return null;
  return (
    <CText cx={cx} cy={cy} size={size} weight={weight} family={family} letterSpacing={letterSpacing} color="transparent" dy={dy} scaleX={scaleX} opacity={opacity} shadow={`0 0 22px rgba(${rgbOf(PAL.accentLight)},.95)`} style={{WebkitTextStroke: `2px ${WHITE}`}}>
      {children}
    </CText>
  );
};
/** 幽灵轮廓的标准透明度：f0 起 12 帧淡入到 0.10 并呼吸，到 until 帧撤掉 */
export const ghostOpacity = (N: number, f0: number, until: number) => {
  const n = N - f0;
  if (n < 0 || N >= until) return 0;
  return (0.1 + 0.02 * Math.sin(n * 0.35)) * clamp01(n / 12);
};

// ---- 光环 ----
const ellipsePerim = (rx: number, ry: number) => Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
let haloSeq = 0;
/**
 * 主体脚下的紫色光环（样片 SC44 护城河）：外环 rxo×ryo、内环 rxi×ryi；p 为白描边 draw-on 进度 0→1；fillOp 为紫渐变填充透明度；
 * phase 为虚线波纹相位（样片 floor(n/2)*5）。half='back' 只画 cy 以上的后半环、'front' 只画前半环——先 back、再主体、再 front 即可让主体「站在环里」。
 * 紫渐变填充受 draw-on 门控（实际 fillOp = fillOp × pe，pe 为 p 的缓出）：环随描边一起生长，不再 p<1 时整环填充瞬现；
 * 缺省 p=1 → pe=1 → 乘 1 不变（缺省渲染逐值等价）。
 */
export const HaloRing: React.FC<{cx?: number; cy?: number; rxo?: number; ryo?: number; rxi?: number; ryi?: number; p?: number; fillOp?: number; phase?: number; half?: 'back' | 'front' | 'both'; opacity?: number; ripples?: boolean}> = ({cx = 640, cy = 428, rxo = 335, ryo = 78, rxi = 245, ryi = 44, p = 1, fillOp = 0.85, phase = 0, half = 'both', opacity = 1, ripples = true}) => {
  const idRef = React.useRef<string | undefined>(undefined);
  if (!idRef.current) idRef.current = `halo-${haloSeq++}`;
  const id = idRef.current;
  const pe = 1 - Math.pow(1 - clamp01(p), 2);
  const PO = ellipsePerim(rxo, ryo), PI = ellipsePerim(rxi, ryi);
  const e = (rx: number, ry: number) => `M ${cx - rx} ${cy} a ${rx} ${ry} 0 1 0 ${rx * 2} 0 a ${rx} ${ry} 0 1 0 ${-rx * 2} 0 Z`;
  const ring = `${e(rxo, ryo)} ${e(rxi, ryi)}`;
  const clip = half === 'back' ? `url(#${id}-back)` : half === 'front' ? `url(#${id}-front)` : undefined;
  return (
    <svg width={1280} height={720} viewBox="0 0 1280 720" style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.45))', opacity}}>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={PAL.haloDark} />
          <stop offset="55%" stopColor={PURPLE} />
          <stop offset="100%" stopColor={PAL.haloLight} />
        </linearGradient>
        <clipPath id={`${id}-back`}><rect x={0} y={0} width={1280} height={cy} /></clipPath>
        <clipPath id={`${id}-front`}><rect x={0} y={cy} width={1280} height={720 - cy} /></clipPath>
      </defs>
      <g clipPath={clip}>
        <path d={ring} fill={`url(#${id}-g)`} fillRule="evenodd" opacity={fillOp * pe} />
        <ellipse cx={cx} cy={cy} rx={rxo} ry={ryo} fill="none" stroke={WHITE} strokeWidth={2.5} strokeDasharray={PO} strokeDashoffset={PO * (1 - pe)} />
        <ellipse cx={cx} cy={cy} rx={rxi} ry={ryi} fill="none" stroke={WHITE} strokeWidth={2.5} strokeDasharray={PI} strokeDashoffset={PI * (1 - pe)} />
        {ripples ? [0.3, 0.55, 0.8].map((t, i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={rxi + (rxo - rxi) * t} ry={ryi + (ryo - ryi) * t} fill="none" stroke={PURPLE_LIGHT} strokeWidth={1.6} strokeDasharray="16 22" strokeDashoffset={phase * (i % 2 ? -1 : 1) + i * 9} opacity={0.55 * fillOp} />
        )) : null}
      </g>
    </svg>
  );
};

// ---- 主角柔光 ----
/**
 * 给矩形主角加双层紫柔光：放在主角组件之下，同位同尺寸。N 传入时 30 帧周期呼吸；k 为强度 0→1（激活 8 帧渐亮用）。
 * sizeHint（方案 §U2）：主角包围盒面积 px²，可由调用方显式传，缺省按 w*h 推断。按面积三档选光：
 *   < 40000（图标级，默认路径，与历史渲染逐值相等）：单层 12/3 + 外层 42/14；呼吸幅度 0.15。
 *   40000–120000（卡片/中等面板）：内层不变，外层 42/14 → 46/16（spread +2）；呼吸幅度 0.15。
 *   > 120000（大面板/大场景）：改三段光池 18/6 · 52/18 · 96/34，blur/spread 随 a 线性缩放、以方案值封顶（避免大面积糊光）；呼吸幅度降到 0.10（大面积极易察觉抖动）。
 * 非 color 路径保持配方字符串 GLOW_PURPLE 原样（recipes 的 glow 字符串一字不改），分档只影响呼吸幅度。
 * shape（val-blueprint 修复轮正本化）：'rect'（缺省 = 现状逐值）为矩形 boxShadow；'ellipse' 改径向椭圆柔光池——
 * 宽拱/圆弧卡体上矩形光晕呈「盒感」读作选择框，椭圆池中心亮→透明、无直边，且大主体的光不再以矩形大幅超出本体 bbox
 * （外扩 22%/32% 对应原 42/14 外层 spread 量级；走配方 accentGlowRgb，不接 color 参数）。
 */
export const HeroGlow: React.FC<{x: number; y: number; w: number; h: number; r?: number; N?: number; k?: number; color?: string; sizeHint?: number; shape?: 'rect' | 'ellipse'}> = ({x, y, w, h, r = 16, N, k = 1, color, sizeHint, shape = 'rect'}) => {
  const area = sizeHint ?? w * h;
  const tier = area > 120000 ? 2 : area >= 40000 ? 1 : 0;
  const breathe = N === undefined ? 1 : 1 + (tier === 2 ? 0.10 : 0.15) * Math.sin((2 * Math.PI * N) / 30);
  const a = clamp01(k) * breathe;
  if (a <= 0.01) return null;
  if (shape === 'ellipse') {
    const g = `radial-gradient(ellipse 50% 50% at 50% 50%, rgba(${PAL.accentGlowRgb},${(0.5 * a).toFixed(3)}) 0%, rgba(${PAL.accentGlowRgb},${(0.22 * a).toFixed(3)}) 42%, rgba(${PAL.accentGlowRgb},0) 74%)`;
    return <div style={{...abs(x - w * 0.22, y - h * 0.32, w * 1.44, h * 1.64), background: g}} />;
  }
  const glow = color
    ? tier === 0
      ? `0 0 ${(12 * a).toFixed(0)}px ${(3 * a).toFixed(0)}px ${color}59, 0 0 ${(42 * a).toFixed(0)}px ${(14 * a).toFixed(0)}px ${color}73`
      : tier === 1
        ? `0 0 ${(12 * a).toFixed(0)}px ${(3 * a).toFixed(0)}px ${color}59, 0 0 ${(46 * a).toFixed(0)}px ${(16 * a).toFixed(0)}px ${color}73`
        : `0 0 ${(18 * a).toFixed(0)}px ${(6 * a).toFixed(0)}px ${color}59, 0 0 ${(52 * a).toFixed(0)}px ${(18 * a).toFixed(0)}px ${color}66, 0 0 ${(96 * a).toFixed(0)}px ${(34 * a).toFixed(0)}px ${color}73`
    : GLOW_PURPLE;
  return <div style={{...abs(x, y, w, h), borderRadius: r, boxShadow: glow, opacity: color ? 1 : a}} />;
};

// ---- 大数字 ----
export const fmtInt = (v: number) => Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
/** len 帧内从 a 计数到 b（幂 2 缓出），返回取整字符串（千分位） */
export const countTo = (n: number, a: number, b: number, len = 20) => fmtInt(a + (b - a) * (1 - Math.pow(1 - clamp01(n / len), 2)));
/** 大数字：Orbitron tabular + 紫硬投影 6px + 紫柔光（片名同款"重"字处理）；unit 为下方小字。
 *  anchor / bandTop / bandHeight（设计终审发现 2：巨型数字独占上带、与图表值/caption 分带）：
 *   - bandTop+bandHeight 同时给定：忽略 cy，数字在该带内定位——anchor 'center'（缺省）带内垂直居中、'top' 墨迹顶贴 bandTop；
 *   - 只给 anchor='top'（无 band）：cy 解读为墨迹顶（渲染中心 = cy + size/2）；
 *   - 全不传（缺省）= 现状逐值（cy 为墨迹中心）。unit 小字始终挂数字渲染中心下方（中心 + size*0.62 + unitSize/2）。 */
export const BigNumber: React.FC<{cx: number; cy: number; value: string | number; size?: number; color?: string; family?: string; weight?: number; letterSpacing?: number; shadow?: string; unit?: string; unitSize?: number; unitColor?: string; opacity?: number; dy?: number; anchor?: 'center' | 'top'; bandTop?: number; bandHeight?: number}> = ({cx, cy, value, size = 110, color = WHITE, family = FONT_ORB, weight = 700, letterSpacing = 2, shadow = `6px 6px 0 ${PURPLE}, 0 0 28px rgba(${PAL.accentGlowRgb},.45)`, unit, unitSize = 24, unitColor = '#A0A0A1', opacity = 1, dy = -2, anchor = 'center', bandTop, bandHeight}) => {
  const inBand = bandTop !== undefined && bandHeight !== undefined && bandHeight > 0;
  const cyEff = inBand
    ? (anchor === 'top' ? bandTop + size / 2 : bandTop + bandHeight / 2)
    : anchor === 'top' ? cy + size / 2 : cy;
  return (
    <>
      <CText cx={cx} cy={cyEff} size={size} weight={weight} family={family} color={color} letterSpacing={letterSpacing} opacity={opacity} dy={dy} shadow={shadow} style={{fontVariantNumeric: 'tabular-nums'}}>
        {value}
      </CText>
      {unit ? <CText cx={cx} cy={cyEff + size * 0.62 + unitSize / 2} size={unitSize} weight={600} color={unitColor} opacity={opacity}>{unit}</CText> : null}
    </>
  );
};

// ---- 小件 ----
/** 四角小星（"冒星"），r = 外半径 */
export const Sparkle: React.FC<{cx: number; cy: number; r: number; opacity?: number; color?: string}> = ({cx, cy, r, opacity = 1, color = WHITE}) => {
  const k = 0.28;
  const d = `M0,${-r} C0,${-r * k} ${r * k},0 ${r},0 C${r * k},0 0,${r * k} 0,${r} C0,${r * k} ${-r * k},0 ${-r},0 C${-r * k},0 0,${-r * k} 0,${-r} Z`;
  return (
    <svg width={r * 2 + 8} height={r * 2 + 8} viewBox={`${-r - 4} ${-r - 4} ${r * 2 + 8} ${r * 2 + 8}`} style={{position: 'absolute', left: cx - r - 4, top: cy - r - 4, opacity, overflow: 'visible'}}>
      <path d={d} fill={color} />
    </svg>
  );
};
/** 顶亮底黑小球（节点 / 小球跑圈用） */
export const GradBall: React.FC<{cx: number; cy: number; r: number; stroke?: number}> = ({cx, cy, r, stroke = 2.5}) => (
  <div style={{...abs(cx - r, cy - r, 2 * r, 2 * r), borderRadius: '50%', boxSizing: 'border-box', border: `${stroke}px solid #FFF`, background: 'linear-gradient(180deg, #F0F0F0 0%, #E8E8E8 3%, #919191 11.7%, #787878 20%, #5B5B5B 28%, #313131 40%, #0F0F0F 50%, #000 58%, #000 100%)'}} />
);

// ---- 纵深：倾斜平面 ----
/**
 * 倾斜平面（HNSW 分层、空间分层用）：以 (cx,cy) 为中心的 w×h 平面，skewX(skew°) scaleY(sy) 成「躺着」的平行四边形；
 * children 用平面内坐标（原点左上、尺寸 w×h）绝对定位，会跟着一起变形。多层叠放：层距 90px，靠后的层 opacity 0.6。
 */
export const TiltPlane: React.FC<{cx: number; cy: number; w?: number; h?: number; skew?: number; sy?: number; stroke?: string; sw?: number; fill?: string; opacity?: number; children?: React.ReactNode}> = ({cx, cy, w = 420, h = 260, skew = -20, sy = 0.5, stroke = WHITE, sw = 2, fill = 'rgba(0,0,0,.85)', opacity = 1, children}) => (
  <div style={{...abs(cx - w / 2, cy - h / 2, w, h), transform: `scaleY(${sy}) skewX(${skew}deg)`, transformOrigin: '50% 50%', opacity}}>
    <div style={{position: 'absolute', inset: 0, boxSizing: 'border-box', border: `${sw}px solid ${stroke}`, background: fill, filter: 'drop-shadow(0 0 2px rgba(255,255,255,.35))'}} />
    {children}
  </div>
);

// ---- 纵深：三层景深堆栈 ----
/**
 * DepthStack（方案 §U7）：back/mid/front 三层拉开纵深，让主体「站在场景里」而不是「贴在背景上」。三层 transform+opacity 目标值：
 *   back ：scale 0.88、Y −40px、opacity 0.5、saturate(0.7)
 *   mid  ：scale 1、Y 0、opacity 0.85
 *   front：scale 1.12、Y +56px、opacity 1
 * 入场：t = BEZ_SCALE_IN(clamp01(n/len))（复用 easing.ts 的缩放入场曲线），三层各错 4 帧——背景先落定、主体后到、前景最后压上；
 * 入场期间各层从中位（scale 1 / Y 0 / opacity 0）向目标值插值，t=1 时与目标值逐值相等；未到入场帧的层不渲染。动画全是帧号 N 的纯函数。
 * dof（可选，缺省 0 = 关闭）：给 back 叠加静态 blur（px）。约束（性能红线，勿违反）：
 *   ① 只做静态模糊，不做逐帧重光栅化（禁元素级逐帧漂移纹理）；② 方案原文写 back/front 均可叠 blur，但按「dof>0 时单帧仅允许一层带 blur」收紧为只模糊 back 一层；
 *   ③ σ ≥ 1（Chromium 中 σ<0.8 无效，本组件对 >0 的 dof 强制 max(1, dof)）；④ 与 FocusRack 互斥，二者不得同帧开启；
 *   ⑤ dof 生效时计入单帧 filter ≤6 预算（common/lib 的 filterBudget 可自查）。
 */
export const DepthStack: React.FC<{N: number; f0: number; len?: number; back?: React.ReactNode; mid?: React.ReactNode; front?: React.ReactNode; dof?: number}> = ({N, f0, len = 30, back, mid, front, dof = 0}) => {
  const blur = dof > 0 ? Math.max(1, dof) : 0;
  const layer = (offset: number, node: React.ReactNode, scale: number, dy: number, opacity: number, filter?: string) => {
    if (!node) return null;
    const t = BEZ_SCALE_IN(clamp01((N - f0 - offset) / len));
    if (t <= 0) return null;
    return (
      <div style={{position: 'absolute', inset: 0, transform: `scale(${(1 + (scale - 1) * t).toFixed(4)}) translateY(${(dy * t).toFixed(2)}px)`, transformOrigin: '50% 50%', opacity: opacity * t, filter}}>{node}</div>
    );
  };
  return (
    <>
      {layer(0, back, 0.88, -40, 0.5, `saturate(0.7)${blur ? ` blur(${blur}px)` : ''}`)}
      {layer(4, mid, 1, 0, 0.85)}
      {layer(8, front, 1.12, 56, 1)}
    </>
  );
};

/**
 * FocusRack（方案 §U8）：以 (cx,cy) 为心的白描边矩形框 12 帧内 scale 1→1.35 生长，同时经 DirBlur 把 σ 从 0 推到 sigma——一帧内「看哪」被明确。
 * 约束：① 每实例消耗 1 个 SVG filter 实例（DirBlur 内联 feGaussianBlur，colorInterpolationFilters 已是 sRGB），与 DepthStack 的 dof、GlitchIn 的 tint 共享单帧 ≤6 预算（common/lib 的 filterBudget），须在分镜表登记；
 *       ② 目标 σ 缺省 2.4 ≥1 满足红线（本组件对 >0 的 sigma 强制 max(1, sigma)，爬坡期的过渡 σ 属 DirBlur 既有行为）；
 *       ③ 框外区域不额外加暗——单色纪律，只做锐度差；④ len 帧后消失（瞬时视线引导，非持续装饰）；生长曲线 easeInOutPow(2.5)。
 */
export const FocusRack: React.FC<{N: number; f0: number; cx: number; cy: number; r0?: number; len?: number; sigma?: number; children?: React.ReactNode}> = ({N, f0, cx, cy, r0 = 180, len = 12, sigma = 2.4, children}) => {
  const n = N - f0;
  if (n < 0 || n > len) return null;
  const t = easeInOutPow(2.5)(clamp01(n / len));
  const s = 1 + 0.35 * t;
  const blur = sigma > 0 ? Math.max(1, sigma) * t : 0;
  const side = r0 * 2;
  return (
    <DirBlur bx={blur} by={blur}>
      <div style={{...abs(cx - side / 2, cy - side / 2, side, side), boxSizing: 'border-box', transform: `scale(${s.toFixed(4)})`, transformOrigin: '50% 50%', border: '2px solid rgba(255,255,255,.9)', borderRadius: 24, pointerEvents: 'none'}}>{children}</div>
    </DirBlur>
  );
};

// ---- 运镜 ----
export type CamKey = {f: number; x: number; y: number; s: number};
/** 相机关键帧插值：f 之间 easeInOutPow(2.5)，首值之前停在第一帧、末值之后停在最后一帧（避免 kf 首值陷阱：第一帧必须写镜头起始状态） */
export const camAt = (N: number, keys: CamKey[], ease = easeInOutPow(2.5)) => {
  if (N <= keys[0].f) return keys[0];
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    if (N <= b.f) {
      const t = ease(clamp01((N - a.f) / Math.max(1, b.f - a.f)));
      return {f: N, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, s: a.s + (b.s - a.s) * t};
    }
  }
  return keys[keys.length - 1];
};
/**
 * 相机：children 用世界坐标（默认相机 x=640,y=360,s=1 时与画布重合）。定点推近 = 同一 (x,y) 改 s（1→1.33，30–40 帧）；
 * 平移/整页滚动 = 改 (x,y)；承接 = 上一镜头末与下一镜头首用相同 keys。scale 对 box-shadow/描边同样放大，推近超过 1.4 时描边会显粗。
 */
export const CameraRig: React.FC<{N: number; keys: CamKey[]; children: React.ReactNode; style?: React.CSSProperties}> = ({N, keys, children, style}) => {
  const c = camAt(N, keys);
  return (
    <div style={{position: 'absolute', inset: 0, transformOrigin: '0 0', transform: `translate(640px,360px) scale(${c.s.toFixed(4)}) translate(${(-c.x).toFixed(2)}px,${(-c.y).toFixed(2)}px)`, ...style}}>
      {children}
    </div>
  );
};

/**
 * 发现 11（safeBand 的 camera-aware）：贴底 chrome（收束区间贴底的收束卡行 / 贴底状态条等）放进 CameraRig 世界坐标时，
 * 视口可见底边随相机 scale/offset 变化——相机变换 screen_y = 360 + s·(world_y − cam.y) 反解得可见底边 world_y = cam.y + (H − margin − 360) / s
 * （s=1、cam 居中时 = 720 − 24 = 696，与 SAFE 安全区口径一致）。贴底元素的 y 应取该值而非固定 696，推近/平移时才不会出画。
 * useSafeBottom(N, keys, margin)：按当前相机关键帧取值（沿用任务书命名；纯函数非 React hook——不内部调 useCurrentFrame，
 * N 按模板惯例由调用方传绝对帧号）。explainer 的 OV-EndingCard 挂 overlay 层（相机之外、不受运镜影响），缺省路径不用本助手。
 */
export const safeBottomWorld = (cam: {x: number; y: number; s: number}, margin = 24) => cam.y + (H - margin - 360) / cam.s;
export const useSafeBottom = (N: number, keys: CamKey[], margin = 24) => safeBottomWorld(camAt(N, keys), margin);

// ---- 高光时刻标准时序 ----
/** 登场型高光时刻相对帧（T0 = 镜头起始/清场帧，T1 = 主角节拍帧；样片 SC08：T0=1013、T1=1080） */
export const SET_PIECE = {
  sweeps: [4, 22, 40], // 三轮 LightSweep 起始（相对 T0）
  line: 18, // StageLine 起始（相对 T0）
  ghost: 37, // GhostText 起始（相对 T0）
  pulse: 12, // emphasisPulse 起始（相对 T1）
  sub: 16, // 中文副标 slideUp Δ80/22（相对 T1）
  pills: 24, // 拆词/标签 SoftIn 2 帧错峰（相对 T1）
  minLen: 90, // 高光时刻镜头最短帧数
};
export const setPiece = (T0: number, T1: number) => ({
  sweeps: SET_PIECE.sweeps.map((d) => T0 + d),
  line: T0 + SET_PIECE.line,
  ghost: T0 + SET_PIECE.ghost,
  flash: T1,
  pulse: T1 + SET_PIECE.pulse,
  sub: T1 + SET_PIECE.sub,
  pills: T1 + SET_PIECE.pills,
});
