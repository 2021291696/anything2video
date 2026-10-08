import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {clamp01, lerp, slideIn, keyframes} from '../common';
import {mulberry32} from '../common/kit/rand';

/**
 * guofeng-scroll 敦煌月窗 · 图元库（自研风格卡，无 mg demo 对应）
 *
 * 签名特征（SPEC 锁死项，评审依据）：
 * 1. 暖黑底(#0a0806) + 圆形月窗：描金双环，窗内平涂壁画内容；窗位全片恒定（MOON 常量），窗内内容变
 * 2. 竖排题跋：Noto Serif SC 右起竖排短句淡入（每句 ≤8 字）+ 方形朱印（全片唯一高饱和红 #c03428，全片 ≤2 次）
 * 3. 长卷横移：hero 处画面横向卷动展开（手卷观看方式），底部红点进度点随卷走同步点亮
 * 4. 虹彩渐变描边只给唯一主角（渐变 stroke 沿形描边 + 微粒子光效），其余元素全部平涂壁画色系
 * 5. 有意静止与慢节奏成立：本章 f346-405 允许 2s 纯画面呼吸（QC 记录为合法静止）
 */

// ---- 色 token（SPEC 锁死项）----
export const GF = {
  bg0: '#0a0806', // 暖黑底
  bg1: '#1c130a', // 窗后暖光晕
  gold: '#c9a227', // 描金主
  goldBright: '#e8c56a', // 描金亮部
  goldDim: '#8a6f2a', // 描金暗部（外环）
  shiqing: '#3a6b8c', // 石青
  shilv: '#5b8c6e', // 石绿
  tuhong: '#9c5333', // 土红
  mibai: '#e8dcc0', // 米白
  zhu: '#c03428', // 朱——唯一高饱和红，只给印章
  zhuDim: '#a53a30', // 朱暗阶（长卷进度点，小面积导航件，非第二高饱和红块）
  ink: '#221a12', // 剪影墨
  scrollPaper: '#8a4630', // 卷面土红底（深化）
} as const;

/** 虹彩渐变（唯一主角专用）：SVG linearGradient stops，全局一个 defs id。 */
export const IRIDESCENT_STOPS = ['#7ee8d0', '#c9e86a', '#e8c56a', '#e88aa0', '#8aa8e8'];

// ---- 构图锚点：月窗位全片恒定 ----
export const MOON = {cx: 640, cy: 352, r: 218} as const;

/** 暖黑底 + 窗后光晕（全片幕底，镜头不画不透明黑底以外的东西）。 */
export const GfBackdrop: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(560px 560px at ${MOON.cx}px ${MOON.cy}px, ${GF.bg1} 0%, ${GF.bg0} 62%)`,
    }}
  />
);

/** 描金双环月窗。p = 双环描出进度 0..1（f12 内达 0.4 起钩子）；children 为窗内内容（圆形裁剪）。 */
export const MoonWindow: React.FC<{p: number; children?: React.ReactNode}> = ({p, children}) => {
  const C = 2 * Math.PI * MOON.r;
  const dash = `${C * clamp01(p)} ${C}`;
  return (
    <AbsoluteFill>
      {children ? (
        <AbsoluteFill style={{clipPath: `circle(${MOON.r}px at ${MOON.cx}px ${MOON.cy}px)`}}>{children}</AbsoluteFill>
      ) : null}
      <svg width={1280} height={720} style={{position: 'absolute', inset: 0}}>
        <g transform={`rotate(-90 ${MOON.cx} ${MOON.cy})`}>
          <circle cx={MOON.cx} cy={MOON.cy} r={MOON.r} fill="none" stroke={GF.goldDim} strokeWidth={5}
            strokeDasharray={dash} strokeLinecap="round" />
          <circle cx={MOON.cx} cy={MOON.cy} r={MOON.r - 9} fill="none" stroke={GF.gold} strokeWidth={1.6}
            strokeDasharray={dash} strokeLinecap="round" opacity={0.9} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/** 竖排题跋：右起竖排、逐字淡入（每列 ≤8 字纪律由调用方保证）。cols[0] 显示在最右。 */
export const Inscription: React.FC<{
  cols: string[];
  from: number; // 首字起始（镜头局部帧）
  stagger?: number;
  x?: number; // 首列（最右列）中心 x
  y?: number;
  size?: number;
  color?: string;
}> = ({cols, from, stagger = 5, x = 1148, y = 132, size = 36, color = GF.mibai}) => {
  const N = useCurrentFrame();
  let idx = 0;
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'row-reverse', gap: 26}}>
      {cols.map((col, ci) => (
        <div key={ci} style={{
          writingMode: 'vertical-rl',
          fontFamily: "'Noto Serif SC', 'Songti SC', serif",
          fontWeight: 600,
          fontSize: size,
          letterSpacing: 14,
          color,
          textShadow: '0 1px 6px rgba(0,0,0,0.55)',
        }}>
          {col.split('').map((ch, i) => {
            const app = slideIn(N - (from + idx * stagger), 13, 2);
            idx += 1;
            return (
              <span key={i} style={{display: 'inline-block', opacity: app, transform: `translateY(${(1 - app) * 7}px)`}}>
                {ch}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** 方形朱印（全片唯一高饱和红）：落印 p 动画（短促快落 + 印泥晕一次）。text ≤2 字竖排。 */
export const Seal: React.FC<{text: string; from: number; x: number; y: number; size?: number}> = ({
  text, from, x, y, size = 62,
}) => {
  const N = useCurrentFrame();
  const p = clamp01((N - from) / 8);
  const e = Math.pow(p, 2.4); // 快落缓停
  const scale = lerp(e, 0, 1, 1.55, 1);
  const halo = clamp01((N - from - 6) / 14) * (1 - clamp01((N - from - 14) / 22));
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)'}}>
      <div style={{
        width: size, height: size,
        transform: `scale(${scale}) rotate(-2deg)`,
        opacity: p,
        background: GF.zhu,
        borderRadius: 5,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `inset 0 0 0 2px rgba(232,220,192,0.85), inset 0 0 0 5px ${GF.zhu}, 0 2px 14px rgba(192,52,40,${0.32 * p})`,
      }}>
        <div style={{
          writingMode: 'vertical-rl',
          fontFamily: "'Noto Serif SC', serif",
          fontWeight: 900,
          fontSize: size * 0.40,
          letterSpacing: 4,
          color: GF.mibai,
          lineHeight: 1,
        }}>{text}</div>
      </div>
      {halo > 0.01 ? (
        <div style={{
          position: 'absolute', left: '50%', top: '50%', width: size * 1.5, height: size * 1.5,
          transform: 'translate(-50%,-50%)',
          borderRadius: '50%',
          border: `1.5px solid rgba(192,52,40,${0.5 * halo})`,
          opacity: halo,
        }} />
      ) : null}
    </div>
  );
};

// ---- 平涂壁画色系图元（全几何化，不做细节堆砌——笔触纪律参考 mg 09-bauhaus）----

/** 平涂山形：折线多边形一层。points 为 [x, y][] 相对坐标，底部自动封底。 */
export const Mountain: React.FC<{points: Array<[number, number]>; color: string; x?: number; y?: number; w: number; h: number}> = ({
  points, color, x = 0, y = 0, w, h,
}) => {
  const d = points.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px},${py}`).join(' ') + ` L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} style={{position: 'absolute', left: x, top: y, overflow: 'visible'}}>
      <path d={d} fill={color} />
    </svg>
  );
};

/** 乐尊剪影（几何化）：圆头 + 梯形僧袍 + 锡杖。walk = 行走相位秒。 */
export const Monk: React.FC<{x: number; y: number; s?: number; walk: number; color?: string}> = ({
  x, y, s = 1, walk, color = GF.ink,
}) => {
  const bob = Math.sin(walk * 5.2) * 1.6;
  const staffTilt = Math.sin(walk * 2.6) * 4; // 杖摆角
  return (
    <svg width={86 * s} height={120 * s} style={{position: 'absolute', left: x, top: y + bob, overflow: 'visible'}}>
      <g fill={color}>
        {/* 僧袍：几何梯形 */}
        <path d={`M43,44 L58,112 L28,112 Z`} />
        {/* 肩 */}
        <path d={`M30,50 Q43,36 56,50 L52,72 L34,72 Z`} />
        {/* 头（几何圆 + 微颈部） */}
        <circle cx={43} cy={30} r={12} />
        {/* 前伸手臂至杖 */}
        <path d={`M52,60 L66,52 L68,58 L54,68 Z`} />
      </g>
      {/* 锡杖：直杆 + 顶端小环 */}
      <g transform={`rotate(${staffTilt} 68 56)`} stroke={color} strokeWidth={3.2 * s} strokeLinecap="round">
        <line x1={68} y1={112} x2={68} y2={14} />
        <circle cx={68} cy={10} r={5.5} fill="none" strokeWidth={2.6 * s} />
      </g>
    </svg>
  );
};

/** 几何化佛龛（平涂）：拱顶龛 + 内坐佛（圆头 + 三角身 + 底座）。全部直线/圆，无细节堆砌。 */
export const Shrine: React.FC<{
  w: number; h: number;
  niche: string; body: string; head?: string;
  stroke?: string; strokeWidth?: number;
  x?: number; y?: number;
}> = ({w, h, niche, body, head, stroke, strokeWidth = 0, x = 0, y = 0}) => {
  const hd = head ?? body;
  const arch = `M0,${h} L0,${w * 0.42} Q${w / 2},${-w * 0.16} ${w},${w * 0.42} L${w},${h} Z`;
  return (
    <svg width={w} height={h} style={{position: 'absolute', left: x, top: y, overflow: 'visible'}}>
      <path d={arch} fill={niche} stroke={stroke ?? 'none'} strokeWidth={strokeWidth} />
      {/* 坐佛：几何三角身 + 圆头 + 底座线 */}
      <circle cx={w / 2} cy={h * 0.34} r={w * 0.13} fill={hd} />
      <path d={`M${w * 0.2},${h * 0.78} L${w / 2},${h * 0.42} L${w * 0.8},${h * 0.78} Z`} fill={body} />
      <rect x={w * 0.16} y={h * 0.78} width={w * 0.68} height={h * 0.07} fill={body} />
    </svg>
  );
};

/** 千佛平涂纹样：小佛龛阵列（4×6），色循环平涂。 */
export const ThousandBuddha: React.FC<{cols?: number; rows?: number; seed?: number}> = ({cols = 6, rows = 4, seed = 7}) => {
  const rng = mulberry32(seed);
  const palette = [GF.shiqing, GF.shilv, GF.tuhong, GF.mibai];
  const nichePal = ['rgba(58,107,140,0.30)', 'rgba(91,140,110,0.30)', 'rgba(156,83,51,0.30)', 'rgba(232,220,192,0.16)'];
  const cw = 152, ch = 134;
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const pi = Math.floor(rng() * palette.length);
      const pj = Math.floor(rng() * palette.length);
      cells.push(
        <Shrine key={`${r}-${c}`} w={110} h={102} x={c * cw + 40 + (r % 2) * 36} y={r * ch + 24}
          niche={nichePal[pi]} body={palette[pj]} />,
      );
    }
  }
  return (
    <div style={{position: 'absolute', inset: 0, background: '#171009'}}>
      {/* 窗内暖底 */}
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(420px 300px at 50% 42%, rgba(232,197,106,0.13), transparent 70%)'}} />
      {cells}
    </div>
  );
};

/** 窗内金色微尘（seeded，慢漂移 + 呼吸闪烁；frozen=true 时完全静止——呼吸段纪律）。 */
export const GoldDust: React.FC<{n?: number; seed?: number; frozen?: boolean; r?: number; cx?: number; cy?: number}> = ({
  n = 12, seed = 11, frozen = false, r = MOON.r, cx = MOON.cx, cy = MOON.cy,
}) => {
  const N = useCurrentFrame();
  const rng = mulberry32(seed);
  const parts = Array.from({length: n}, () => ({
    a: rng() * Math.PI * 2,
    d: Math.sqrt(rng()) * (r - 24),
    sp: 0.25 + rng() * 0.5,
    sz: 1.2 + rng() * 2.0,
    ph: rng() * Math.PI * 2,
  }));
  return (
    <svg width={1280} height={720} style={{position: 'absolute', inset: 0}}>
      {parts.map((p, i) => {
        const t = frozen ? 0 : N;
        const rad = p.a + t * 0.004 * p.sp;
        const px = cx + Math.cos(rad) * p.d;
        const py = cy + Math.sin(rad) * p.d * 0.86 - ((t * p.sp) % 40);
        const tw = frozen ? 0.5 : 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(t * 0.11 + p.ph));
        return <circle key={i} cx={px} cy={py} r={p.sz} fill={GF.goldBright} opacity={tw * 0.65} />;
      })}
    </svg>
  );
};

/** 虹彩渐变描边佛龛（唯一主角）：沿形渐变 stroke + 内坐佛（米白平涂）+ 微粒子光效。 */
export const IridescentShrine: React.FC<{x: number; y: number; w?: number; h?: number; glow?: number; frozen?: boolean}> = ({
  x, y, w = 150, h = 138, glow = 1, frozen = false,
}) => {
  const N = useCurrentFrame();
  const gid = 'iri-grad-main'; // 全片唯一虹彩 defs
  const arch = `M0,${h} L0,${w * 0.42} Q${w / 2},${-w * 0.16} ${w},${w * 0.42} L${w},${h} Z`;
  const rng = mulberry32(23);
  const sparks = Array.from({length: 14}, () => ({px: rng() * w, py: rng() * h, ph: rng() * Math.PI * 2, sz: 0.8 + rng() * 1.6}));
  const pulse = frozen ? 0.55 : 0.45 + 0.25 * Math.sin(N * 0.09);
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h}}>
      <svg width={w} height={h} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <defs>
          <linearGradient id={gid} x1="0%" y1="100%" x2="100%" y2="0%">
            {IRIDESCENT_STOPS.map((c, i) => (
              <stop key={i} offset={`${(i / (IRIDESCENT_STOPS.length - 1)) * 100}%`} stopColor={c} />
            ))}
          </linearGradient>
        </defs>
        {/* 龛内暗底（从阵列中浮出）+ 米白平涂坐佛（与 Shrine 同构几何） */}
        <path d={arch} fill="rgba(12,9,6,0.72)" />
        <circle cx={w / 2} cy={h * 0.36} r={w * 0.13} fill={GF.mibai} opacity={0.92} />
        <path d={`M${w * 0.2},${h * 0.8} L${w / 2},${h * 0.44} L${w * 0.8},${h * 0.8} Z`} fill={GF.mibai} opacity={0.92} />
        <rect x={w * 0.16} y={h * 0.8} width={w * 0.68} height={h * 0.06} fill={GF.mibai} opacity={0.8} />
        <path d={arch} fill="none" stroke={`url(#${gid})`} strokeWidth={2.6} opacity={0.55 + 0.45 * glow} />
        {sparks.map((s, i) => {
          const tw = frozen ? 0.3 : 0.15 + 0.55 * (0.5 + 0.5 * Math.sin(N * 0.13 + s.ph));
          return <circle key={i} cx={s.px} cy={s.py} r={s.sz} fill={IRIDESCENT_STOPS[i % IRIDESCENT_STOPS.length]} opacity={tw * pulse * 0.8} />;
        })}
      </svg>
    </div>
  );
};

/** 长卷红点进度：n 点，进度 0..1，已过点亮（zhuDim 系小面积导航件）。 */
export const ScrollProgress: React.FC<{progress: number; n?: number; y?: number}> = ({progress, n = 9, y = 636}) => {
  const lit = progress * n;
  const xs = Array.from({length: n}, (_, i) => 640 + (i - (n - 1) / 2) * 22);
  return (
    <div style={{position: 'absolute', left: 0, top: y, width: '100%'}}>
      <svg width={1280} height={20} style={{position: 'absolute', left: 0, top: -10}}>
        {xs.map((px, i) => {
          const on = clamp01(lit - i);
          return <circle key={i} cx={px} cy={10} r={3.4} fill={GF.zhuDim} opacity={0.16 + 0.74 * on} />;
        })}
      </svg>
    </div>
  );
};

/** 长卷卷面内容：一行平涂小佛龛 + 山形 + 唯一虹彩主龛。t = 卷动进度 0..1（0 起点、1 走满）。 */
export const ScrollContent: React.FC<{t: number; width: number; height: number; frozen?: boolean}> = ({t, width, height, frozen = false}) => {
  const rng = mulberry32(41);
  const palette = [GF.mibai, GF.shiqing, GF.shilv, GF.mibai];
  const nichePal = ['rgba(10,8,6,0.30)', 'rgba(10,8,6,0.22)', 'rgba(10,8,6,0.30)', 'rgba(10,8,6,0.18)'];
  const span = 2350; // 卷面内容总宽
  const off = lerp(t, 0, 1, 320, span - width + 80); // 内容左移量
  const shrineW = 128;
  const heroes: React.ReactNode[] = [];
  const nShrines = 13;
  for (let i = 0; i < nShrines; i++) {
    const sx = 120 + i * 172;
    const pi = i % 4;
    if (i === 6) {
      // 唯一虹彩主龛（卷面中央）
      heroes.push(<IridescentShrine key={i} x={sx - 12} y={height - 208} w={shrineW + 24} h={shrineW * 0.92} frozen={frozen} />);
    } else {
      heroes.push(
        <Shrine key={i} w={shrineW} h={118} x={sx} y={height - 196} niche={nichePal[pi]} body={palette[pi]} />,
      );
    }
  }
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: -off, top: 0, width: span, height}}>
        {/* 卷面底：土红平涂 + 顶部细金线 */}
        <div style={{position: 'absolute', inset: 0, background: GF.scrollPaper}} />
        <div style={{position: 'absolute', left: 0, top: 10, width: span, height: 1.5, background: GF.gold, opacity: 0.55}} />
        <div style={{position: 'absolute', left: 0, bottom: 12, width: span, height: 1.5, background: GF.gold, opacity: 0.35}} />
        {/* 远山（石绿平涂折线，弱化退后） */}
        <Mountain
          x={0} y={0} w={span} h={height * 0.62}
          color="rgba(91,140,110,0.32)"
          points={[[0, 190], [260, 96], [520, 176], [820, 70], [1120, 168], [1420, 92], [1740, 180], [2060, 84], [2350, 160]]}
        />
        {/* 近山道（暗土阶，弱化） */}
        <Mountain
          x={0} y={height * 0.42} w={span} h={height * 0.58}
          color="rgba(48,26,16,0.38)"
          points={[[0, 60], [420, 150], [900, 40], [1400, 140], [1900, 56], [2350, 130]]}
        />
        {heroes}
      </div>
    </div>
  );
};

/** 结尾「相传」题跋 + 微动效外的通用淡入文字（复用 Inscription，此处仅为语义别名）。 */
export const fadeAt = (N: number, from: number, dur = 16) => slideIn(N - from, dur, 2);

/** 全片呼吸/淡出工具：keyframes 便捷封装。 */
export const gfKeyframes = keyframes;

// ====================================================================
// v4.0 opt-in 增补：aged 做旧罩层 / apsara 飞天转场 / 铁线描 / 飘带行波
// 技法借鉴：huashu-art-motion 20_dunhuang（MIT, alchaincyf）——TSX 重写，非整段拷贝。
// 纪律：全部 opt-in，默认输出不变；暖黑底 #0a0806 / 恒定月窗 / 竖排题跋 / 朱印等身份特征不动。
// ====================================================================

/** 铁线描规范（造型线，非装饰线）：等宽 2.6px 主线 #5a2414；脸/肤用更红的 #8a3a24。
 *  与描金装饰线（变宽、金色）严格区分——铁线描是壁画的"骨"。 */
export const TIELINE = {
  width: 2.6,
  color: '#5a2414',
  faceColor: '#8a3a24',
} as const;

/** 铁线描造型线组：ds 内每条 path 按等宽规范描出（禁按段变宽）。 */
export const Tieline: React.FC<{
  ds: string[];
  w: number;
  h: number;
  x?: number;
  y?: number;
  color?: string;
  width?: number;
  opacity?: number;
}> = ({ds, w, h, x = 0, y = 0, color = TIELINE.color, width = TIELINE.width, opacity = 1}) => (
  <svg width={w} height={h} style={{position: 'absolute', left: x, top: y, overflow: 'visible', opacity, pointerEvents: 'none'}}>
    {ds.map((d, i) => (
      <path key={i} d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
    ))}
  </svg>
);

// ---- 飘带行波（kit 词汇）。量化纪律：横向位移 ≥200px ＋ 末端 30%（s≥0.7）上扬才读得出"飘"----
export const RIBBON = {
  minSpan: 200, // 横向位移下限（18–34px 是"椅子竖杆"）
  span: 230, // 默认基线横移（源 shawl 230q）
  waveAmp: 64, // 行波振幅（源 64q·sin）
  waveFreq: 4.2,
  waveSpeed: 5.5,
  liftZone: 0.7, // 末端 30% 起扬
  liftPx: 300, // 源起扬幅度
  liftPulse: 0.7, // (0.7 + 0.3sin(4t)) 呼吸下限
} as const;

/** 行波横向位移（s∈[0,1] 沿带）：span·s + amp·s·sin(freq·s − speed·t)（源 shawl 配方）。 */
export const ribbonWaveX = (s: number, t: number, span: number = RIBBON.span, amp: number = RIBBON.waveAmp): number =>
  span * s + amp * s * Math.sin(RIBBON.waveFreq * s - RIBBON.waveSpeed * t);

/** 末端上扬（y 偏移，负=向上）：s≤liftZone 恒 0；源配方 −max(0,s−0.7)·300·(0.7+0.3sin(4t))——
 *  末端 30% 内线性起扬带呼吸，s=1 处 36–90px。 */
export const ribbonLiftY = (s: number, t = 0, liftPx: number = RIBBON.liftPx): number => {
  if (s <= RIBBON.liftZone) return 0;
  return -(s - RIBBON.liftZone) * liftPx * (RIBBON.liftPulse + (1 - RIBBON.liftPulse) * Math.sin(t * 4));
};

/** 变宽飘带多边形：点列两侧按 widthAt(q) 法向偏移成闭合 path 字符串（重写 K.ribbon）。 */
export const ribbonPathD = (pts: Array<[number, number]>, widthAt: (q: number) => number): string => {
  const n = pts.length;
  const L: string[] = [];
  const R: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1;
    dx /= d;
    dy /= d;
    const hw = widthAt(i / (n - 1)) / 2;
    L.push(`${(pts[i][0] - dy * hw).toFixed(1)},${(pts[i][1] + dx * hw).toFixed(1)}`);
    R.push(`${(pts[i][0] + dy * hw).toFixed(1)},${(pts[i][1] - dx * hw).toFixed(1)}`);
  }
  return `M${L.join(' L')} L${R.slice().reverse().join(' L')} Z`;
};

/** 飘带行波组件：石绿飘带 + 白虚线描花 + 红点（源 shawl 语法：宽 w(0.75+0.25sin(9q−5t))(1−0.25q)）。
 *  span 默认 230 ≥ RIBBON.minSpan（"飘"的底线）。 */
export const RibbonWave: React.FC<{
  x: number;
  y: number;
  t: number;
  length?: number; // 带的纵向延伸 px
  span?: number;
  amp?: number;
  liftPx?: number;
  width?: number;
  color?: string;
  lineColor?: string;
  dashFlower?: boolean;
  dots?: boolean;
  n?: number;
}> = ({x, y, t, length = 400, span, amp, liftPx, width = 32, color = '#6ab08e', lineColor = TIELINE.color, dashFlower = true, dots = true, n = 26}) => {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= n; i++) {
    const q = i / n;
    pts.push([x + ribbonWaveX(q, t, span, amp), y + q * length + ribbonLiftY(q, t, liftPx)]);
  }
  const d = ribbonPathD(pts, q => width * (0.75 + 0.25 * Math.sin(q * 9 - t * 5)) * (1 - q * 0.25));
  const line = pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return (
    <svg width={2} height={2} style={{position: 'absolute', left: 0, top: 0, width: 1280, height: 720, overflow: 'visible', pointerEvents: 'none'}}>
      <path d={d} fill={color} stroke={lineColor} strokeWidth={2.2} strokeLinejoin="round" />
      {dashFlower ? <polyline points={line} fill="none" stroke="#ecdfc4" strokeWidth={2} strokeDasharray="3 9" /> : null}
      {dots
        ? pts.map((p, i) =>
            i % 9 === 4 ? <circle key={i} cx={p[0]} cy={p[1]} r={3.2} fill="#a5452f" /> : null,
          )
        : null}
    </svg>
  );
};

// ---- aged 做旧罩层（opt-in，默认关）。参数照抄 huashu scenes/20_dunhuang.js 剥落配方 ----
export type ProtectRect = {x: number; y: number; w: number; h: number};

export const AGED = {
  threshold: 0.3, // n > 0.30 露白灰地仗
  edgeBand: 0.02, // 0.28–0.30 剥落边缘暗线
  plaster: '#d8c6a2', // 白灰地仗
  edge: 'rgba(70,45,30,0.59)', // 源 rgb(70,45,30,150)
  crack: 'rgba(50,25,15,0.35)',
  crackN: 500,
  fade: 0.3, // saturation 混合 α.3 褪色
  smoke: 'rgba(40,20,10,0.35)',
  smokeH: 253, // 源 380px@1080p → 720p 等比
  cell: 6,
} as const;

/** 剥落三态判定（量化纪律）：v>0.30 露地仗，0.28–0.30 边缘暗线，其余完好。 */
export const flakeState = (v: number): 'intact' | 'edge' | 'exposed' =>
  v > AGED.threshold ? 'exposed' : v >= AGED.threshold - AGED.edgeBand ? 'edge' : 'intact';

// seeded value noise / fbm（禁 Math.random；整数 hash 全确定性）
const ih2 = (seed: number, xi: number, yi: number): number => {
  let h = Math.imul(seed | 0, 0x27d4eb2d) ^ Math.imul(xi | 0, 0x165667b1) ^ Math.imul(yi | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
const smq = (t: number) => t * t * (3 - 2 * t);
const vnoise2 = (seed: number, x: number, y: number): number => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = smq(x - xi);
  const fy = smq(y - yi);
  const a = ih2(seed, xi, yi);
  const b = ih2(seed, xi + 1, yi);
  const c = ih2(seed, xi, yi + 1);
  const d = ih2(seed, xi + 1, yi + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};
const fbm2 = (seed: number, x: number, y: number, oct: number): number => {
  let v = 0;
  let amp = 0.5;
  let f = 1;
  for (let o = 0; o < oct; o++) {
    v += amp * vnoise2(seed + o * 101, x * f, y * f);
    amp *= 0.5;
    f *= 2;
  }
  return v;
};

/** 剥落场（源配方：fbm(x·0.0032+11, y·0.0032+4, 5 倍频) + 0.12·noise(x·0.03, y·0.03)）。
 *  ⚠ 噪声频率 0.006 = 满屏芝麻斑（像污渍），禁用——见 RECON-huashu 20_dunhuang。 */
export const flakeField = (x: number, y: number, seed = 91): number =>
  fbm2(seed, x * 0.0032 + 11, y * 0.0032 + 4, 5) + 0.12 * vnoise2(seed + 7, x * 0.03, y * 0.03);

/** 做旧罩层（opt-in `aged` 模式，enabled 默认 false）：褪色(saturation α.3)＋顶部烟熏＋剥落斑＋龟裂(500 条)。
 *  保护区纪律：protect 矩形（人物/主角区域）内全部做旧层排除——做旧只上背景。
 *  静态层（useMemo 一次算好，与源 P.cached 一致，不随帧动）。 */
export const AgedMode: React.FC<{
  enabled?: boolean;
  seed?: number;
  w?: number;
  h?: number;
  protect?: ProtectRect[];
  cell?: number;
  crackN?: number;
  smokeH?: number;
}> = ({enabled = false, seed = 91, w = 1280, h = 720, protect = [], cell = AGED.cell, crackN = AGED.crackN, smokeH = AGED.smokeH}) => {
  const layers = React.useMemo(() => {
    if (!enabled) return null;
    const inProtect = (px: number, py: number) =>
      protect.some(r => px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h);
    // 逐格采样剥落场，同行同态格 RLE 合并成矩形
    type Run = {x: number; y: number; w: number; h: number; kind: 'exposed' | 'edge' | 'chalk'; a: number};
    const runs: Run[] = [];
    const nc = Math.ceil(w / cell);
    const nr = Math.ceil(h / cell);
    for (let r = 0; r < nr; r++) {
      let runKind: 'exposed' | 'edge' | 'chalk' | null = null;
      let runA = 0;
      let runStart = 0;
      const flushRun = (endC: number) => {
        if (runKind) runs.push({x: runStart * cell, y: r * cell, w: (endC - runStart) * cell, h: cell, kind: runKind, a: runA});
      };
      for (let c = 0; c < nc; c++) {
        const px = c * cell + cell / 2;
        const py = r * cell + cell / 2;
        let k: 'exposed' | 'edge' | 'chalk' | null = null;
        let a = 0;
        if (!inProtect(px, py)) {
          const st = flakeState(flakeField(px, py, seed));
          if (st === 'exposed') {
            k = 'exposed';
            a = 1;
          } else if (st === 'edge') {
            k = 'edge';
            a = 1;
          } else {
            // 颜料粉化发白（源：m=fbm(x·0.02, y·0.02+7, 3)，alpha=clamp(m·0.5+0.1)·80）
            const m = fbm2(seed + 55, px * 0.02, py * 0.02 + 7, 3);
            const alpha = clamp01(m * 0.5 + 0.1) * (80 / 255);
            if (alpha >= 0.12) {
              k = 'chalk';
              a = Math.round(alpha * 12) / 12; // 量化便于同行合并
            }
          }
        }
        if (k !== runKind || (k === 'chalk' && a !== runA)) {
          flushRun(c);
          runKind = k;
          runA = a;
          runStart = c;
        }
      }
      flushRun(nc);
    }
    // 龟裂：seeded 随机游走（源：500 条，步长 5+12r、转角 ±0.7rad）
    const rng = mulberry32(seed + 3);
    const crackD: string[] = [];
    for (let k = 0; k < crackN; k++) {
      let x = rng() * w;
      let y = rng() * h;
      let a = rng() * 6.28;
      if (inProtect(x, y)) continue; // 保护区不上裂
      let d = `M${x.toFixed(1)},${y.toFixed(1)}`;
      const steps = Math.floor(5 + rng() * 8);
      for (let s = 0; s < steps; s++) {
        a += (rng() - 0.5) * 1.4;
        x += Math.cos(a) * (5 + rng() * 12);
        y += Math.sin(a) * (5 + rng() * 12);
        d += ` L${x.toFixed(1)},${y.toFixed(1)}`;
      }
      crackD.push(d);
    }
    return {runs, crackD};
  }, [enabled, seed, w, h, cell, crackN, smokeH, protect]);
  if (!enabled || !layers) return null;
  const maskId = `gf-aged-${seed}`;
  const smokeId = `gf-smoke-${seed}`;
  return (
    <svg width={w} height={h} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      <defs>
        <mask id={maskId}>
          <rect x={0} y={0} width={w} height={h} fill="#fff" />
          {protect.map((r, i) => (
            <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill="#000" />
          ))}
        </mask>
        <linearGradient id={smokeId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={AGED.smoke} />
          <stop offset="100%" stopColor="rgba(40,20,10,0)" />
        </linearGradient>
      </defs>
      <g mask={`url(#${maskId})`}>
        {/* 褪色：saturation 混合 α.3 */}
        <rect x={0} y={0} width={w} height={h} fill="#808080" opacity={AGED.fade} style={{mixBlendMode: 'saturation'}} />
        {/* 顶部烟熏 */}
        <rect x={0} y={0} width={w} height={smokeH} fill={`url(#${smokeId})`} />
        {/* 剥落斑：露地仗 / 边缘暗线 / 粉化发白 */}
        {layers.runs.map((rn, i) => (
          <rect
            key={i}
            x={rn.x}
            y={rn.y}
            width={rn.w}
            height={rn.h}
            fill={rn.kind === 'exposed' ? AGED.plaster : rn.kind === 'edge' ? AGED.edge : '#fff5e1'}
            opacity={rn.kind === 'chalk' ? rn.a : 1}
          />
        ))}
        {/* 龟裂 */}
        <path d={layers.crackD.join(' ')} fill="none" stroke={AGED.crack} strokeWidth={1} />
      </g>
    </svg>
  );
};

// ---- apsara 飞天转场（opt-in，与现收卷转场并存可配）。参数照抄 huashu transitions.js:455-472 ----
export const APSARA = {
  frontFrom: 260, // 前沿 x 起点：W+260
  frontTo: -300, // 前沿 x 终点
  waveAmp: 110, // +110·sin(y·0.006 + p·5)
  waveFreq: 0.006,
  wavePhase: 5,
  flakeN: 70,
  step: 20, // 前沿采样步长 px
  ribbons: [
    ['#6ab08e', 0, 44],
    ['#a5452f', 70, 38],
    ['#5a86b0', 140, 32],
  ] as Array<[string, number, number]>,
} as const;

const easeInOutCos = (p: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(p));

/** 转场前沿（设计坐标）：从右往左扫的正弦波前。lerp(W+260, −300, e) + 110·sin(y·0.006+p·5)。 */
export const apsaraFront = (y: number, p: number, w = 1280): number => {
  const e = easeInOutCos(p);
  const base = (w + APSARA.frontFrom) * (1 - e) + APSARA.frontTo * e;
  return base + APSARA.waveAmp * Math.sin(y * APSARA.waveFreq + p * APSARA.wavePhase);
};

/** 飞天转场（opt-in）：飘带从右往左扫，前沿右侧为新画；旧画碎片沿前沿剥落（TSX 版以矿物色块
 *  近似源的像素采样）；三条石绿/土红/石青飘带沿前沿翻卷＋白虚线描花。outgoing/incoming 为整帧内容。 */
export const ApsaraTransition: React.FC<{
  p: number; // 0..1
  outgoing: React.ReactNode; // 旧画
  incoming: React.ReactNode; // 新画
  seed?: number;
  w?: number;
  h?: number;
  flakeN?: number;
  flakeColors?: string[];
}> = ({p, outgoing, incoming, seed = 33, w = 1280, h = 720, flakeN = APSARA.flakeN, flakeColors = ['#a5452f', '#6ab08e', '#5a86b0']}) => {
  const e = easeInOutCos(p);
  const k = w / 1920; // 源 1080p 几何等比
  // 前沿多边形（前沿右侧 = 新画区）：逐 20px 采样，右侧封边
  const pts: string[] = [];
  for (let y = -10; y <= h + 10; y += APSARA.step) {
    pts.push(`${apsaraFront(y, p, w).toFixed(1)},${y}`);
  }
  pts.push(`${w + 10},${h + 10}`, `${w + 10},-10`);
  // 剥落碎片（seeded；源 70 片：y0 / 尺寸 / 横漂 / 初相角 / 相位）
  const flakes = React.useMemo(() => {
    const r = mulberry32(seed);
    return Array.from({length: flakeN}, () => [r() * h, 20 + r() * 34, 10 + r() * 26, r() * 6.28, r()] as [number, number, number, number, number]);
  }, [seed, flakeN, h]);
  return (
    <div style={{position: 'absolute', inset: 0, width: w, height: h, overflow: 'hidden'}}>
      {outgoing}
      <div style={{position: 'absolute', inset: 0, clipPath: `polygon(${pts.join(',')})`}}>{incoming}</div>
      <svg width={w} height={h} style={{position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible'}}>
        {flakes.map((fl, i) => {
          const front = apsaraFront(fl[0], p, w);
          const born = clamp01(1 - (front + 40) / (w + 300));
          const age = e - born * 0.9;
          if (age < 0) return null;
          const x = front - fl[2] + age * 120 * k;
          const y = fl[0] + age * age * 900 * k;
          if (y > h + 40) return null;
          return (
            <g
              key={i}
              transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(((fl[3] + age * 9) * 180) / Math.PI).toFixed(1)}) scale(1 ${Math.cos(age * 12 + fl[4] * 6).toFixed(3)})`}
            >
              <rect x={-fl[1] / 2} y={-fl[1] * 0.35} width={fl[1]} height={fl[1] * 0.7} fill={flakeColors[i % flakeColors.length]} opacity={0.9} />
            </g>
          );
        })}
        {APSARA.ribbons.map(([col, off, rw], rib) => {
          const n = Math.ceil((h + 120) / 18);
          const rp: Array<[number, number]> = [];
          for (let i = 0; i <= n; i++) {
            const y = -60 + i * 18;
            rp.push([apsaraFront(y, p, w) + off + 46 * Math.sin(y * 0.011 - p * 14 + rib * 1.7), y]);
          }
          const d = ribbonPathD(rp, q => rw * (0.6 + 0.4 * Math.sin(q * 14 + p * 10 + rib)));
          const line = rp.map(q => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');
          return (
            <g key={rib}>
              <path d={d} fill={col} stroke="#5a2414" strokeWidth={2.4} strokeLinejoin="round" />
              <polyline points={line} fill="none" stroke="#ecdfc4" strokeWidth={2} strokeDasharray="4 10" />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

