import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {GRAIN_URL} from '../common/DotFieldBg';
import {mulberry32} from '../common/kit/rand';

/**
 * aurora-glass 弥散渐变玻璃拟态 · 图元库（自研风格卡，mg 笔触参考 demos/12-aurora-glass）
 *
 * 签名特征（SPEC 锁死项，评审依据）：
 * 1. 底层 aurora：5 个纯色大圆 blur 90-130px，各自沿闭合贝塞尔路径 22-36s 漂移循环
 *    （431f 样片内呈现 ≥40% ≥ 1/3 循环），彼此 screen 混合出 mesh gradient 感
 * 2. 玻璃卡片配方：backdrop-filter blur(24px) + 白 8% 填充 + 1px 白 30% 内描边 + 28-32px 大圆角
 * 3. 配色邻近色紫蓝青（violet/indigo/blue/periwinkle/cyan），禁撞色；暗底 #05041a 亮斑
 * 4. 全局叠 4.5% 噪点防 banding（feTurbulence overlay）
 * 5. 缓动只有 sine/linear 呼吸曲线；文字入场只用 opacity+8px 位移；一切皆慢
 */

// ---- 色 token（SPEC 锁死项）----
export const AG = {
  bg: '#05041a', // 暗底
  bgLift: '#0a0824', // 暗底中心微提亮
  violet: '#7050FF',
  indigo: '#4A3AE8',
  blue: '#2F46F2',
  periwinkle: '#8C8CFF',
  cyan: '#34CFF0',
  ink: '#EAF0FF', // 近白主文字（邻近色低对比体系的亮端）
  inkDim: 'rgba(234,240,255,0.60)', // 次级文字
  glassFill: 'rgba(255,255,255,0.08)', // 玻璃卡白 8% 填充
  glassStroke: 'rgba(255,255,255,0.30)', // 玻璃卡 1px 内描边
} as const;

// ---- 数学：正弦族缓动（本卡唯一缓动词汇，签名特征5）----
export const inv = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const clamp01v = (v: number) => Math.min(1, Math.max(0, v));
/** easeInOutSine —— 呼吸曲线，全片唯一缓动 */
export const eSine = (t: number) => -(Math.cos(Math.PI * Math.min(1, Math.max(0, t))) - 1) / 2;
/** 分段 sine 进度：t 在 [a,b] 内从 0→1 */
export const seg = (t: number, a: number, b: number) => eSine(inv(t, a, b));

/** 闭合贝塞尔漂移路径（Catmull-Rom→Bezier 闭环，移植自 mg demos/12-aurora-glass/main.js）。 */
function loopBezier(pts: Array<[number, number]>, period: number, phase: number) {
  const n = pts.length;
  return (t: number): [number, number] => {
    const u = ((((t / period + phase) % 1) + 1) % 1) * n;
    const i = Math.floor(u);
    const s = u - i;
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    const a = 1 - s;
    return [
      a * a * a * p1[0] + 3 * a * a * s * c1[0] + 3 * a * s * s * c2[0] + s * s * s * p2[0],
      a * a * a * p1[1] + 3 * a * a * s * c1[1] + 3 * a * s * s * c2[1] + s * s * s * p2[1],
    ];
  };
}

// ---- aurora 光斑表（5 颗，全部邻近色紫蓝青；period 22-36s → 431f 呈现 ≥40% 循环）----
type Blob = {
  color: string;
  w: number;
  h: number;
  blur: number;
  base: number; // 常驻强度
  path: ReturnType<typeof loopBezier>;
  ramp: [number, number]; // 亮起窗（绝对帧）：f2-14 为钩子第一颗
  breath: number; // 呼吸周期（秒）
  bphase: number;
};

const BLOBS: Blob[] = [
  {
    color: AG.violet, w: 660, h: 430, blur: 110, base: 1.0,
    path: loopBezier([[330, 265], [455, 205], [500, 330], [270, 372]], 28, 0.05),
    ramp: [2, 14], breath: 9, bphase: 0.0,
  },
  {
    color: AG.indigo, w: 760, h: 540, blur: 130, base: 0.55,
    path: loopBezier([[620, 430], [790, 380], [760, 520], [540, 500]], 36, 0.5),
    ramp: [24, 70], breath: 11, bphase: 1.7,
  },
  {
    color: AG.blue, w: 680, h: 410, blur: 120, base: 0.8,
    path: loopBezier([[900, 560], [1080, 500], [1040, 640], [800, 620]], 32, 0.28),
    ramp: [36, 88], breath: 10, bphase: 3.1,
  },
  {
    color: AG.periwinkle, w: 400, h: 270, blur: 90, base: 0.42,
    path: loopBezier([[770, 295], [880, 250], [850, 345], [700, 330]], 22, 0.1),
    ramp: [48, 104], breath: 8, bphase: 4.2,
  },
  {
    color: AG.cyan, w: 500, h: 330, blur: 100, base: 0.66,
    path: loopBezier([[1000, 175], [1130, 130], [1100, 230], [920, 245]], 26, 0.65),
    ramp: [60, 110], breath: 12, bphase: 2.3,
  },
];

/** 全局 aurora 幕底：暗底渐变 + 5 颗 screen 混合光斑沿贝塞尔慢漂 + 整体呼吸（全片连续，挂在 Main，不随镜头重启）。 */
export const AuroraBackdrop: React.FC = () => {
  const f = useCurrentFrame(); // 全局帧（Main 直接挂载，不在 Sequence 内）；绝对帧 N = f + 1
  const N = f + 1;
  const t = f / 30;
  const bedBreath = 1 + 0.05 * Math.sin((2 * Math.PI * t) / 10);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 120% at 50% 42%, ${AG.bgLift} 0%, ${AG.bg} 58%, #030210 100%)`,
        overflow: 'hidden',
      }}
    >
      {BLOBS.map((b, i) => {
        const [x, y] = b.path(t);
        const rise = seg(N, b.ramp[0], b.ramp[1]);
        const scale = 1 + 0.035 * Math.sin((2 * Math.PI * t) / b.breath + b.bphase);
        const opacity = Math.min(1, b.base * rise * bedBreath * (1 + 0.06 * Math.sin((2 * Math.PI * t) / b.breath + b.bphase + 1.1)));
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - b.w / 2,
              top: y - b.h / 2,
              width: b.w,
              height: b.h,
              borderRadius: '50%',
              background: b.color, // 纯色大圆
              filter: `blur(${b.blur}px)`,
              mixBlendMode: 'screen',
              opacity,
              transform: `scale(${scale})`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** 全局噪点层：feTurbulence overlay 4.5%（签名特征4，防 banding），静态确定性纹理。 */
export const NoiseField: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      backgroundImage: GRAIN_URL,
      backgroundSize: '160px 160px',
      opacity: 0.045,
      mixBlendMode: 'overlay',
      pointerEvents: 'none',
    }}
  />
);

/** 磨砂玻璃卡（签名特征2）：backdrop blur24 + 白8%填充 + 1px 白30% 内描边 + 大圆角。
 *  x/y 为卡中心；breathPhase 控制呼吸微浮（±3px sine，用绝对帧保证跨镜头连续）。 */
export const GlassCard: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  radius?: number;
  opacity?: number;
  scale?: number;
  N: number; // 绝对帧（呼吸相位基准，跨镜头连续）
  children?: React.ReactNode;
}> = ({x, y, w, h, radius = 28, opacity = 1, scale = 1, N, children}) => {
  const bob = 3 * Math.sin((2 * Math.PI * (N / 30)) / 9 + (x % 7));
  return (
    <div
      style={{
        position: 'absolute',
        left: x - w / 2,
        top: y - h / 2 + bob,
        width: w,
        height: h,
        borderRadius: radius,
        background: AG.glassFill,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: `inset 0 0 0 1px ${AG.glassStroke}, 0 24px 70px rgba(3,2,16,0.45)`,
        opacity,
        transform: `scale(${scale})`,
        overflow: 'hidden',
      }}
    >
      {/* 卡面顶部一道极淡高光（同族白色系，非第二强调色） */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 34%)',
          pointerEvents: 'none',
        }}
      />
      {children}
    </div>
  );
};

/** 文字入场（签名特征5）：只用 opacity + 8px 位移，sine 呼吸节奏。style.transform 会被保留并前置于位移动画。 */
export const RisingText: React.FC<{
  N: number;
  from: number; // 起始绝对帧
  dur?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({N, from, dur = 40, children, style}) => {
  const p = seg(N, from, from + dur);
  const base = style?.transform ?? '';
  const composed = `${base} translateY(${(1 - p) * 8}px)`;
  return (
    <div
      style={{
        ...style,
        opacity: p,
        transform: composed,
      }}
    >
      {children}
    </div>
  );
}

// ====================================================================
// v4.0 opt-in 增补：GlassLens 透镜 / TiltGlassCard 倾斜玻璃卡 / Motes 尘点
// 技法借鉴：mg-styles-15 demos/12-aurora-glass（MIT, Vincentwei1021）——TSX 重写，非整段拷贝。
// 纪律：全部 opt-in，默认输出不变；慢/透/贵气质与 sine/linear 缓动白名单不动
// （squash 弹簧是透镜的材质响应物理，不是运动词汇；文字入场仍只有 opacity+8px）。
// ====================================================================

/** 圆角矩形 SVG path d 串（正向一圈），inset 为内缩量——iris 句号环用 evenodd 双子路径挖孔。 */
export const roundedRectPath = (w: number, h: number, r: number, inset = 0): string => {
  const x = inset;
  const y = inset;
  const iw = Math.max(1, w - inset * 2);
  const ih = Math.max(1, h - inset * 2);
  const rr = Math.max(0, Math.min(r - inset, iw / 2, ih / 2));
  return (
    `M${(x + rr).toFixed(2)},${y} H${(x + iw - rr).toFixed(2)} A${rr.toFixed(2)},${rr.toFixed(2)} 0 0 1 ${(x + iw).toFixed(2)},${(y + rr).toFixed(2)} ` +
    `V${(y + ih - rr).toFixed(2)} A${rr.toFixed(2)},${rr.toFixed(2)} 0 0 1 ${(x + iw - rr).toFixed(2)},${(y + ih).toFixed(2)} ` +
    `H${(x + rr).toFixed(2)} A${rr.toFixed(2)},${rr.toFixed(2)} 0 0 1 ${x},${(y + ih - rr).toFixed(2)} ` +
    `V${(y + rr).toFixed(2)} A${rr.toFixed(2)},${rr.toFixed(2)} 0 0 1 ${(x + rr).toFixed(2)},${y} Z`
  );
};

/** 透镜常量（源 FS_LENS/main.js lensStretch 的 720p 适配值）。 */
export const LENS = {
  blur: 14, // backdrop 模糊（frosted 底）
  sat: 1.15, // 源配方 saturate(170%) 的克制版
  bright: 1.04,
  fill: 'rgba(255,255,255,0.06)',
  rimGlow: 'rgba(255,255,255,0.20)',
  dispScale: 9, // feDisplacementMap 边缘扭曲强度（近似 bezel refraction）
  ringWEnd: 12, // 句号环壁厚（源 13-14px@1080p 等比）
  irisShrink: 0.62, // iris 全开时外轮廓收缩（源 lensHX 112→O_R 的收缩语义）
  spring: {w: Math.PI * 2 * 2.0, z: 0.3, gain: 0.00016, maxAmt: 0.1, dt: 1 / 240}, // 源 lensStretch 参数
} as const;

/** damped-spring squash（速度驱动；240Hz 固定步长自 t=0 积分 → 纯 t 函数，帧率确定性：
 *  同帧同参逐位同输出，与渲染帧率无关）。path: 秒→透镜中心（px）。
 *  返回拉伸矩阵 [i11, i12, i21, i22]（CSS matrix 顺序；源 lensState M 字段同构）。 */
export const springSquash = (t: number, path: (tt: number) => [number, number]): [number, number, number, number] => {
  const {w, z, gain, maxAmt, dt} = LENS.spring;
  const n = Math.max(0, Math.floor(t / dt));
  let sx = 0;
  let sy = 0;
  let vx = 0;
  let vy = 0;
  let prev = path(0);
  for (let i = 1; i <= n; i++) {
    const cur = path(i * dt);
    const tvx = (cur[0] - prev[0]) / dt * gain;
    const tvy = (cur[1] - prev[1]) / dt * gain;
    prev = cur;
    vx += (-w * w * (sx - tvx) - 2 * z * w * vx) * dt;
    vy += (-w * w * (sy - tvy) - 2 * z * w * vy) * dt;
    sx += vx * dt;
    sy += vy * dt;
  }
  const amt = Math.min(maxAmt, Math.hypot(sx, sy) * 0.75);
  const ang = Math.atan2(sy, sx);
  const a = 1 + amt;
  const b = 1 / Math.sqrt(1 + amt * 1.4);
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  return [ca * ca / a + sa * sa / b, ca * sa * (1 / a - 1 / b), ca * sa * (1 / a - 1 / b), sa * sa / a + ca * ca / b];
};

/** Liquid-Glass 透镜（头号 WOW 件，SVG 近似版）：backdrop 模糊 + feDisplacementMap 边缘扭曲
 *  （seeded feTurbulence 驱动，确定性）+ 边框渐变高光（fresnel 近似）+ 速度驱动 squash
 *  （path+tNow 给了才启用）+ 收尾 iris 张开成句号环（ringP 0→1）+ 环面跑光（glintP 0→1）。
 *  取舍：真折射/色散需 WebGL（源 FS_LENS shaders.js:215-356），本组件为近似（观感约七成）。 */
export const GlassLens: React.FC<{
  x: number;
  y: number;
  rx?: number; // 胶囊半轴
  ry?: number;
  path?: (tt: number) => [number, number]; // 秒→中心轨迹；给了 + tNow>0 才启用 squash
  tNow?: number;
  ringP?: number; // iris：0 胶囊体 → 1 句号环
  glintP?: number;
  seed?: number;
  children?: React.ReactNode;
}> = ({x, y, rx = 150, ry = 78, path, tNow = 0, ringP = 0, glintP = 0, seed = 7, children}) => {
  const w = rx * 2;
  const h = ry * 2;
  const rp = clamp01v(ringP);
  const outerScale = 1 - (1 - LENS.irisShrink) * rp;
  const wall = h * (1 - rp) + LENS.ringWEnd * rp; // 体 → 环壁
  const sq = path && tNow > 0 ? springSquash(tNow, path) : [1, 0, 0, 1];
  const glintA = -Math.PI / 2 + clamp01v(glintP) * Math.PI;
  const gid = `aglens-${seed}`;
  const annulus = `path(evenodd, '${roundedRectPath(w, h, ry)} ${roundedRectPath(w, h, ry, wall)}')`;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: 0, height: 0}}>
      <div style={{position: 'absolute', width: w, height: h, left: -w / 2, top: -h / 2, transform: `scale(${outerScale.toFixed(4)})`}}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: ry,
            background: LENS.fill,
            backdropFilter: `blur(${LENS.blur}px) saturate(${LENS.sat}) brightness(${LENS.bright})`,
            WebkitBackdropFilter: `blur(${LENS.blur}px) saturate(${LENS.sat}) brightness(${LENS.bright})`,
            boxShadow: `inset 0 0 18px ${LENS.rimGlow}, inset 0 1.5px 1px rgba(255,255,255,0.55)`,
            transform: `matrix(${sq.map(v => v.toFixed(6)).join(',')})`,
            clipPath: rp > 0 ? annulus : undefined,
          }}
        >
          {children}
        </div>
        <svg width={w} height={h} style={{position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none'}}>
          <defs>
            <filter id={`${gid}-disp`} x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.12 0.18" numOctaves={2} seed={seed} result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale={LENS.dispScale} xChannelSelector="R" yChannelSelector="G" />
            </filter>
            <radialGradient id={`${gid}-rim`} cx="50%" cy="50%" r="50%">
              <stop offset="62%" stopColor="rgba(255,255,255,0)" />
              <stop offset="88%" stopColor="rgba(255,255,255,0.16)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
            </radialGradient>
            <linearGradient id={`${gid}-bord`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.75)" />
              <stop offset="45%" stopColor="rgba(255,255,255,0.12)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.35)" />
            </linearGradient>
            <radialGradient id={`${gid}-glint`}>
              <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
          </defs>
          {/* 边缘扭曲的 fresnel 环（iris 时挖孔） */}
          <g clipPath={rp > 0 ? annulus : undefined}>
            <rect x={0} y={0} width={w} height={h} fill={`url(#${gid}-rim)`} filter={`url(#${gid}-disp)`} />
          </g>
          {/* 边框渐变高光 */}
          <rect x={0.75} y={0.75} width={w - 1.5} height={h - 1.5} rx={Math.max(0, ry - 0.75)} fill="none" stroke={`url(#${gid}-bord)`} strokeWidth={1.5} />
          {/* 环面跑光 */}
          {glintP > 0 && glintP < 1 ? (
            <circle
              cx={w / 2 + Math.cos(glintA) * (rx - ry * 0.55)}
              cy={h / 2 + Math.sin(glintA) * (ry - 4)}
              r={7}
              fill={`url(#${gid}-glint)`}
              opacity={Math.sin(Math.PI * clamp01v(glintP)).toFixed(3)}
            />
          ) : null}
        </svg>
      </div>
    </div>
  );
};

/** 倾斜玻璃卡（opt-in，源 FS_CARD 的 CSS 近似）：perspective+rotateY 倾斜玻璃板 + 顶部高光渐变
 *  + 边缘 1px 亮线（顶边另加亮线，fresnel 近似）+ 斜向 sheen 带 + 入场沿 bevel 跑一道 30% 白高光
 *  （伪 catch-light，SVG dash 沿圆角矩形路径）。真厚度折射/defocus LOD 做不了——倾斜+glint 已够。 */
export const TILT = {persp: 1200, tiltDeg: 10, radius: 30, catchDur: 36, catchBright: 0.85, sheenPeak: 0.12} as const;

export const TiltGlassCard: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  N: number; // 绝对帧（catch-light 相位基准）
  from?: number; // 入场帧：不给则不跑 catch-light
  tiltDeg?: number;
  persp?: number;
  radius?: number;
  catchDur?: number;
  children?: React.ReactNode;
}> = ({x, y, w, h, N, from, tiltDeg = TILT.tiltDeg, persp = TILT.persp, radius = TILT.radius, catchDur = TILT.catchDur, children}) => {
  const cp = from === undefined ? 0 : clamp01v((N - from) / catchDur);
  const head = Math.sin(Math.PI * cp);
  return (
    <div style={{position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, perspective: persp}}>
      <div style={{position: 'absolute', inset: 0, transform: `rotateY(${tiltDeg}deg)`, transformStyle: 'preserve-3d'}}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: radius,
            background: AG.glassFill,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: `inset 0 0 0 1px ${AG.glassStroke}, inset 0 1.2px 0 rgba(255,255,255,0.5), 0 24px 70px rgba(3,2,16,0.45)`,
            overflow: 'hidden',
          }}
        >
          {/* 顶部高光渐变 + 斜向 sheen 带（源 0.045 sheen 近似） */}
          <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%)'}} />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(115deg, transparent 32%, rgba(255,255,255,0.04) 44%, rgba(255,255,255,${TILT.sheenPeak}) 50%, rgba(255,255,255,0.04) 56%, transparent 68%)`,
            }}
          />
          {children}
          {/* 伪 catch-light：~30% 白高光沿 bevel（顶边→右上圆角）跑过 */}
          {cp > 0 && cp < 1 ? (
            <svg width={w} height={h} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
              <rect x={1} y={1} width={w - 2} height={h - 2} rx={Math.max(0, radius - 1)} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={1.6}
                pathLength={100} strokeDasharray="22 78" strokeDashoffset={(4 - cp * 38).toFixed(2)} opacity={(head * 0.55).toFixed(3)} strokeLinecap="round" />
              <rect x={1} y={1} width={w - 2} height={h - 2} rx={Math.max(0, radius - 1)} fill="none" stroke={`rgba(255,255,255,${TILT.catchBright})`} strokeWidth={2}
                pathLength={100} strokeDasharray="7 93" strokeDashoffset={(8 - cp * 38).toFixed(2)} opacity={head.toFixed(3)} strokeLinecap="round" />
            </svg>
          ) : null}
        </div>
      </div>
    </div>
  );
};

/** 尘点微粒层（opt-in 独立小件，与 NoiseField 防 banding 噪点是两回事）：
 *  seeded 慢漂（vy −4~−14px/s）+ 亮度呼吸，screen 混合。 */
export const Motes: React.FC<{
  n?: number;
  seed?: number;
  w?: number;
  h?: number;
  N: number; // 绝对帧
  speed?: number;
  rMax?: number;
  color?: string;
}> = ({n = 26, seed = 5, w = 1280, h = 720, N, speed = 1, rMax = 1.7, color = '#dce4ff'}) => {
  const t = N / 30;
  const rng = mulberry32(seed);
  const parts = Array.from({length: n}, () => ({
    x0: rng() * w,
    y0: rng() * h,
    vx: (rng() - 0.5) * 8,
    vy: -(4 + rng() * 10),
    r: 0.6 + rng() * (rMax - 0.6),
    ph: rng() * Math.PI * 2,
    tw: 0.4 + rng() * 0.5,
  }));
  return (
    <svg width={w} height={h} style={{position: 'absolute', inset: 0, mixBlendMode: 'screen', pointerEvents: 'none'}}>
      {parts.map((p, i) => {
        const px = (((p.x0 + p.vx * t * speed) % w) + w) % w;
        const py = (((p.y0 + p.vy * t * speed) % h) + h) % h;
        const a = p.tw * (0.35 + 0.4 * (0.5 + 0.5 * Math.sin(t * 0.5 + p.ph)));
        return <circle key={i} cx={px.toFixed(1)} cy={py.toFixed(1)} r={p.r.toFixed(2)} fill={color} opacity={a.toFixed(3)} />;
      })}
    </svg>
  );
};;
