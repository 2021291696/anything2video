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
