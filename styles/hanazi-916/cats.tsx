import React from 'react';
import {W} from '../common';
import {HZ} from './kit';

/**
 * hanazi-916 卡 · 纯代码猫形几何图元（不引照片，纪律第 4 条「素材 CC0 或纯代码」取纯代码档）。
 * 贴纸风：奶油白填充 + 墨色粗描边 + 粉腮红，圆角化路径，全部确定性（无 Math.random）。
 */

const INK = HZ.ink;

/** 眼睛：open=圆眼 / half=眯一半 / closed=慢眨闭弧 / happy=开心下弯弧 */
const Eye: React.FC<{x: number; y: number; s: number; mood: 'open' | 'half' | 'closed' | 'happy'}> = ({x, y, s, mood}) => {
  if (mood === 'open')
    return (
      <g transform={`translate(${x} ${y})`}>
        <ellipse cx={0} cy={0} rx={15 * s} ry={19 * s} fill={INK} />
        <circle cx={5 * s} cy={-6 * s} r={5.5 * s} fill="#fff" />
      </g>
    );
  if (mood === 'half')
    return (
      <g transform={`translate(${x} ${y})`}>
        <path d={`M${-16 * s} 0Q0 ${10 * s} ${16 * s} 0`} stroke={INK} strokeWidth={8 * s} fill="none" strokeLinecap="round" />
        <path d={`M${-15 * s} ${-2 * s}Q0 ${-9 * s} ${15 * s} ${-2 * s}`} stroke={INK} strokeWidth={7 * s} fill="none" strokeLinecap="round" />
      </g>
    );
  // closed / happy：下弯弧（满足眯眼）
  return (
    <path
      d={`M${x - 16 * s} ${y}Q${x} ${y + 14 * s} ${x + 16 * s} ${y}`}
      stroke={INK}
      strokeWidth={8 * s}
      fill="none"
      strokeLinecap="round"
    />
  );
};

export type CatMood = 'open' | 'half' | 'closed' | 'happy';

/** 猫头：圆脸 + 三角耳 + 胡须 + ω 嘴 + 腮红。size = 头宽 px。 */
export const CatFace: React.FC<{x: number; y: number; size?: number; tilt?: number; mood?: CatMood}> = ({
  x,
  y,
  size = 340,
  tilt = 0,
  mood = 'open',
}) => {
  const s = size / 340;
  const eyeS = mood === 'happy' ? 1 : 1;
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt}) scale(${s.toFixed(4)})`}>
      {/* 耳 */}
      <path d="M-128 -96 L-168 -212 Q-166 -224 -152 -218 L-52 -158 Z" fill="#fff" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
      <path d="M-138 -122 L-158 -186 L-84 -150 Z" fill={HZ.pink} opacity={0.75} />
      <path d="M128 -96 L168 -212 Q166 -224 152 -218 L52 -158 Z" fill="#fff" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
      <path d="M138 -122 L158 -186 L84 -150 Z" fill={HZ.pink} opacity={0.75} />
      {/* 脸 */}
      <ellipse cx={0} cy={0} rx={168} ry={150} fill="#fff" stroke={INK} strokeWidth={9} />
      {/* 腮红 */}
      <ellipse cx={-104} cy={38} rx={30} ry={18} fill={HZ.pink} opacity={0.45} />
      <ellipse cx={104} cy={38} rx={30} ry={18} fill={HZ.pink} opacity={0.45} />
      {/* 眼 */}
      <Eye x={-62} y={-18} s={eyeS} mood={mood} />
      <Eye x={62} y={-18} s={eyeS} mood={mood} />
      {/* 鼻 + ω 嘴 */}
      <path d="M-12 22 Q0 34 12 22 Q0 16 -12 22 Z" fill={HZ.pinkDeep} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
      <path d="M0 34 Q-4 52 -22 50 M0 34 Q4 52 22 50" stroke={INK} strokeWidth={7} fill="none" strokeLinecap="round" />
      {/* 胡须 */}
      {[-1, 1].map((d) => (
        <g key={d} stroke={INK} strokeWidth={6} strokeLinecap="round" opacity={0.9}>
          <path d={`M${d * 150} -8 Q${d * 208} -18 ${d * 244} -30`} fill="none" />
          <path d={`M${d * 152} 14 Q${d * 214} 14 ${d * 252} 10`} fill="none" />
          <path d={`M${d * 150} 34 Q${d * 208} 44 ${d * 244} 52`} fill="none" />
        </g>
      ))}
    </g>
  );
};

/** 坐姿猫（正侧）：竖尾信号镜头主体。tailLift 0→1：尾从斜后（-52°）扫到竖直（0°），尖端可加 wiggle。 */
export const CatSit: React.FC<{x: number; y: number; size?: number; tailLift?: number; tailWag?: number; mood?: CatMood}> = ({
  x,
  y,
  size = 520,
  tailLift = 1,
  tailWag = 0,
  mood = 'happy',
}) => {
  const s = size / 520;
  const ang = -52 * (1 - tailLift) + tailWag;
  return (
    <g transform={`translate(${x} ${y}) scale(${s.toFixed(4)})`}>
      {/* 尾（基点在身体右后，绕基点转） */}
      <g transform={`translate(150 -10) rotate(${ang.toFixed(2)})`}>
        <path
          d="M0 40 Q34 6 30 -78 Q27 -150 2 -188"
          stroke={INK}
          strokeWidth={40}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M0 40 Q34 6 30 -78 Q27 -150 2 -188"
          stroke="#fff"
          strokeWidth={24}
          strokeLinecap="round"
          fill="none"
        />
        <circle cx={2} cy={-188} r={13} fill={HZ.pink} stroke={INK} strokeWidth={0} opacity={0.9} />
      </g>
      {/* 身体（梨形坐姿） */}
      <path
        d="M-96 118 Q-136 40 -96 -40 Q-56 -108 8 -108 Q76 -108 104 -34 Q130 36 96 118 Q40 150 -20 148 Q-70 146 -96 118 Z"
        fill="#fff"
        stroke={INK}
        strokeWidth={9}
        strokeLinejoin="round"
      />
      {/* 胸腹 */}
      <ellipse cx={8} cy={54} rx={62} ry={62} fill={HZ.bg} stroke="none" />
      {/* 前爪 */}
      <g stroke={INK} strokeWidth={8} fill="#fff">
        <rect x={-58} y={96} width={52} height={44} rx={22} />
        <rect x={10} y={96} width={52} height={44} rx={22} />
      </g>
      {/* 头 */}
      <g transform="translate(-34 -150)">
        <CatHeadGroup mood={mood} />
      </g>
      {/* 尾尖闪光点（竖直到位后由场景 Sparkle 补） */}
    </g>
  );
};

/** 头部内组（CatSit/CatRub 复用，240px 基准头宽）。 */
const CatHeadGroup: React.FC<{mood: CatMood}> = ({mood}) => (
  <g>
    <path d="M-92 -62 L-118 -148 Q-116 -158 -104 -152 L-38 -112 Z" fill="#fff" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
    <path d="M-100 -82 L-114 -126 L-62 -104 Z" fill={HZ.pink} opacity={0.75} />
    <path d="M92 -62 L118 -148 Q116 -158 104 -152 L38 -112 Z" fill="#fff" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
    <path d="M100 -82 L114 -126 L62 -104 Z" fill={HZ.pink} opacity={0.75} />
    <ellipse cx={0} cy={0} rx={118} ry={106} fill="#fff" stroke={INK} strokeWidth={8} />
    <ellipse cx={-72} cy={26} rx={21} ry={13} fill={HZ.pink} opacity={0.45} />
    <ellipse cx={72} cy={26} rx={21} ry={13} fill={HZ.pink} opacity={0.45} />
    <Eye x={-44} y={-12} s={0.72} mood={mood} />
    <Eye x={44} y={-12} s={0.72} mood={mood} />
    <path d="M-8 16 Q0 24 8 16 Q0 12 -8 16 Z" fill={HZ.pinkDeep} stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
    <path d="M0 24 Q-3 37 -16 35 M0 24 Q3 37 16 35" stroke={INK} strokeWidth={5.5} fill="none" strokeLinecap="round" />
    {[-1, 1].map((d) => (
      <g key={d} stroke={INK} strokeWidth={4.5} strokeLinecap="round" opacity={0.9}>
        <path d={`M${d * 104} -4 Q${d * 144} -12 ${d * 170} -20`} fill="none" />
        <path d={`M${d * 106} 12 Q${d * 148} 12 ${d * 174} 8`} fill="none" />
      </g>
    ))}
  </g>
);

/** 躺平露肚猫（hero 镜头主体）：身体横躺、四爪朝上、头后仰、尾卷。 */
export const CatBellyUp: React.FC<{x: number; y: number; size?: number; pawWave?: number; mood?: CatMood}> = ({
  x,
  y,
  size = 640,
  pawWave = 0,
  mood = 'happy',
}) => {
  const s = size / 640;
  const paw = (px: number, ph: number) => {
    const dy = Math.sin(pawWave * Math.PI * 2 + ph) * 8;
    return (
      <g transform={`translate(${px} ${-108 + dy})`} stroke={INK} strokeWidth={8} fill="#fff">
        <ellipse cx={0} cy={0} rx={34} ry={26} />
        <path d={`M-12 -10 L-12 -22 M0 -12 L0 -25 M12 -10 L12 -22`} strokeWidth={6} strokeLinecap="round" />
      </g>
    );
  };
  return (
    <g transform={`translate(${x} ${y}) scale(${s.toFixed(4)})`}>
      {/* 尾（右侧卷起） */}
      <path d="M210 60 Q290 66 296 -6 Q299 -52 268 -70" stroke={INK} strokeWidth={34} strokeLinecap="round" fill="none" />
      <path d="M210 60 Q290 66 296 -6 Q299 -52 268 -70" stroke="#fff" strokeWidth={20} strokeLinecap="round" fill="none" />
      {/* 身体（横躺胶囊） */}
      <rect x={-230} y={-120} width={460} height={220} rx={110} fill="#fff" stroke={INK} strokeWidth={9} />
      {/* 肚皮 */}
      <ellipse cx={20} cy={10} rx={150} ry={82} fill={HZ.bg} stroke={HZ.ink} strokeWidth={0} opacity={0.95} />
      <ellipse cx={20} cy={10} rx={150} ry={82} fill="none" stroke={HZ.pinkDeep} strokeWidth={0} opacity={0.4} strokeDasharray="3 18" strokeLinecap="round" />
      {/* 四爪朝上 */}
      {paw(-140, 0)}
      {paw(-40, 0.9)}
      {paw(60, 1.9)}
      {paw(150, 2.8)}
      {/* 头（左端后仰） */}
      <g transform="translate(-238 -84) rotate(-24)">
        <CatHeadGroup mood={mood} />
      </g>
    </g>
  );
};

/** 心形（蹭头镜头的被蹭物 + 飞吻粒子）。 */
export const Heart: React.FC<{x: number; y: number; size: number; rot?: number; color?: string; opacity?: number; outline?: boolean}> = ({
  x,
  y,
  size,
  rot = 0,
  color = HZ.pink,
  opacity = 1,
  outline = false,
}) => {
  const s = size / 100;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s.toFixed(4)})`} opacity={opacity}>
      <path
        d="M0 34 C-44 6 -50 -22 -32 -36 C-16 -48 -2 -40 0 -28 C2 -40 16 -48 32 -36 C50 -22 44 6 0 34 Z"
        fill={outline ? 'none' : color}
        stroke={outline ? color : INK}
        strokeWidth={outline ? 10 : 8}
        strokeLinejoin="round"
      />
    </g>
  );
};

/** 禁摸手 + 禁止圈（hero「≠随便摸」配件）：圆角手掌 + 红圈斜杠 + 之字电花。 */
export const NoTap: React.FC<{x: number; y: number; size?: number; f0: number; N: number}> = ({x, y, size = 300, f0, N}) => {
  const u = N - f0;
  if (u < 0) return null;
  const s = (size / 300) * (u < 6 ? 1.35 - 0.35 * (u / 6) ** 1.5 : 1);
  const jitter = u < 14 ? Math.sin(u * 2.2) * 3 : 0;
  return (
    <g transform={`translate(${x + jitter} ${y}) scale(${s.toFixed(4)}) rotate(${8})`}>
      {/* 手掌 */}
      <g stroke={INK} strokeWidth={9} fill={HZ.bg}>
        <rect x={-58} y={-30} width={116} height={120} rx={40} />
        <rect x={-58} y={-84} width={26} height={72} rx={13} />
        <rect x={-24} y={-98} width={26} height={86} rx={13} />
        <rect x={10} y={-92} width={26} height={80} rx={13} />
        <rect x={44} y={-78} width={24} height={66} rx={12} />
      </g>
      {/* 禁止圈 */}
      <circle cx={0} cy={10} r={132} fill="none" stroke={HZ.vermilion} strokeWidth={22} />
      <line x1={-93} y1={-83} x2={93} y2={103} stroke={HZ.vermilion} strokeWidth={22} strokeLinecap="round" />
      {/* 之字电花（拒触反馈） */}
      {u >= 6 && u < 22 ? (
        <path
          d={`M150 -96 L118 -52 L154 -44 L120 4`}
          stroke={HZ.yellow}
          strokeWidth={12}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={1 - (u - 6) / 16}
        />
      ) : null}
    </g>
  );
};

/** 印章（结尾定帧）：朱红圆角方印 + 白内框 + 2 行印文 + 小爪，stamp 进度 0→1 控制压下。 */
export const SealHanzi: React.FC<{x: number; y: number; size?: number; press: number; rot?: number}> = ({
  x,
  y,
  size = 520,
  press = 1,
  rot = -6,
}) => {
  const s = (size / 520) * press;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s.toFixed(4)})`}>
      <rect x={-250} y={-250} width={500} height={500} rx={56} fill={HZ.vermilion} stroke={HZ.ink} strokeWidth={0} opacity={0.96} />
      <rect x={-250} y={-250} width={500} height={500} rx={56} fill="none" stroke="#8f1f14" strokeWidth={10} opacity={0.5} />
      <rect x={-208} y={-208} width={416} height={416} rx={36} fill="none" stroke="#fff" strokeWidth={12} opacity={0.95} />
      <text x={0} y={-96} textAnchor="middle" dominantBaseline="central" fontWeight={900} fontSize={132} fill="#fff" style={{fontFamily: "'Noto Sans SC', sans-serif"}}>
        猫主子
      </text>
      <text x={-64} y={92} textAnchor="middle" dominantBaseline="central" fontWeight={900} fontSize={132} fill="#fff" style={{fontFamily: "'Noto Sans SC', sans-serif"}}>
        认证
      </text>
      <g transform="translate(118 92) scale(0.62)">
        <PawMini />
      </g>
    </g>
  );
};
const PawMini: React.FC = () => (
  <g fill="#fff" opacity={0.95}>
    <ellipse cx={0} cy={12} rx={30} ry={24} />
    <ellipse cx={-30} cy={-18} rx={11} ry={14} />
    <ellipse cx={-10} cy={-30} rx={11} ry={14} />
    <ellipse cx={10} cy={-30} rx={11} ry={14} />
    <ellipse cx={30} cy={-18} rx={11} ry={14} />
  </g>
);

/** 全局 SVG 容器便捷封装（镜头内多层叠加时用）。 */
export const SvgLayer: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}}>
    {children}
  </svg>
);
