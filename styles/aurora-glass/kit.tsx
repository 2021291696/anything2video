import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {GRAIN_URL} from '../common/DotFieldBg';

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
};
