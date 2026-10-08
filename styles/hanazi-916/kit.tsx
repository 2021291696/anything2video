import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FONT_HEAVY, W, clamp, textEm} from '../common';
import {SUBS} from '../common/subs';
import {beatHopWave, huaZiCharLayers} from './hzcore';

/**
 * hanazi-916 综艺花字 · 风格图元库（本卡唯一视觉正本，规格见 skill-intake/SPEC.md）。
 * 五条签名特征的落点：
 * ① 花字三层结构（渐变填充 + 粗白描边 + 彩色外描边/挤出投影）——HuaZi
 * ② 入场 overshoot：scale 0→1.15→1.0（约 8 帧弹簧），逐字错帧 2，带轻微旋转——spring()/HuaZi
 * ③ 情绪匹配：惊讶=Burst 放射爆炸框 / 强调=Sparkle 闪光 / 旁白小字=SubBand 歪斜手写感
 * ④ 花字出现时机 = 语音/画面时刻 +2 帧（research/beat-sheet.json 钉帧显式 +2f，镜头调用按钉帧传 f0）
 * ⑤ 长驻留花字 wiggle 保活（只作用于花字层，不违抗「恒动陷阱」——底层装饰仅慢漂）
 *
 * 帧号约定：镜头组件用 FrameScope base={镜头from} 包裹后， kit 内 useGlobalFrame() 取全局帧，
 * 与 beat-sheet / Sequence 挂载合同（from-1 起）一致。
 */

// ---- 色板（锁死项，见 SPEC）----
export const HZ = {
  bg: '#FFF4E3', // 奶油底
  ink: '#2B2149', // 深紫墨（投影/对比）
  pink: '#FF4D88',
  pinkDeep: '#D9356C',
  yellow: '#FFC93C',
  yellowDeep: '#E89B12',
  cyan: '#35D0FF',
  cyanDeep: '#1490C4',
  white: '#FFFFFF',
  vermilion: '#D93425', // 朱红（印章专用）
} as const;

// ---- 弹簧 overshoot：ζ=0.517 ω=22 → 峰值 ≈1.15 @第5帧，≈1.01 @第8帧（30fps 换秒）----
export const spring = (t: number, z = 0.517, w = 22): number => {
  if (t <= 0) return 0;
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
};
export const springF = (uFrames: number, z = 0.517, w = 22) => spring(uFrames / 30, z, w);

/** 长驻留 wiggle（只给花字层）：入场 8 帧后起振，转角/浮沉/呼吸三路正弦，相位按字符错开。 */
export const holdWiggle = (uF: number, ph: number): {r: number; y: number; s: number} => {
  const k = clamp((uF - 8) / 12, 0, 1);
  if (k <= 0) return {r: 0, y: 0, s: 1};
  const t = uF / 30;
  return {
    r: k * 1.6 * Math.sin(2 * Math.PI * 1.1 * t + ph),
    y: k * 3 * Math.sin(2 * Math.PI * 1.1 * t + ph + 1.9),
    s: 1 + k * 0.012 * Math.sin(2 * Math.PI * 2.2 * t + ph * 1.7),
  };
};

/** 打击震屏（hero 用）：衰减正弦，约 10 帧耗尽。 */
export const kickShake = (uF: number, amp = 13, k = 0.5, f = 11) => {
  if (uF < 0) return {x: 0, y: 0};
  const e = amp * Math.exp(-k * uF);
  return {x: e * Math.sin(2 * Math.PI * f * (uF / 30)), y: e * 0.7 * Math.cos(2 * Math.PI * f * 0.83 * (uF / 30) + 0.7)};
};

// ---- 全局帧上下文 ----
const FrameCtx = React.createContext<{base: number}>({base: 1});
export const FrameScope: React.FC<{base: number; children: React.ReactNode}> = ({base, children}) => (
  <FrameCtx.Provider value={{base}}>{children}</FrameCtx.Provider>
);
export const useGlobalFrame = () => useCurrentFrame() + 1 + React.useContext(FrameCtx).base;

let gradSeq = 0;

/**
 * HuaZi 花字（签名特征①②④⑤的载体）。
 * 层序（下→上）：挤出投影（deep）→ 彩色外描边 → 粗白描边 → 渐变填充 → 顶部高光。
 * 每字弹簧 pop（0→1.15→1 约 8 帧），逐字错帧 stagger=2，交替 ±rot 入场旋转；驻留期 holdWiggle 保活；
 * until 帧后 pop-out 退场。文字布局用 textEm 确定性测宽（与模板 textfit 同表），无 DOM 测量。
 * v4.0 opt-in（默认不传=旧行为逐值一致）：
 *   ext / extColor —— 双层挤出（dy=ext 与 ext/2，同色 stroke 宽同外描边；色缺省=deep）；
 *   gloss —— 源码式顶部垂直渐变白（顶 gloss→0@46%，源码 demo 0.55），传数值启用；
 *   hopBeats —— 节拍 hop 波（全局帧时刻表，每 beat 每字错 2 帧：蹲→抛物线跳 40px→落地回弹）。
 */
export const HuaZi: React.FC<{
  text: string;
  f0: number; // 全局帧：第 1 字 pop 起点（= 语音/画面钉帧时刻 +2）
  y: number; // 行视觉中心 y
  size?: number;
  fills?: [string, string];
  outer?: string;
  deep?: string; // 挤出投影色（缺省 ink）
  whiteW?: number; // 白描边宽 px
  outerW?: number; // 彩色外描边宽 px
  rot?: number; // 每字入场旋转幅（交替 ±）
  stagger?: number;
  drop?: number; // 落下距离 px
  wiggle?: boolean;
  until?: number; // 全局帧：pop-out 起点
  skew?: number; // 手写歪斜 skewX（deg）
  gap?: number; // 额外字距 px
  ext?: number; // v4.0 opt-in：双层挤出深度 px
  extColor?: string; // v4.0 opt-in：挤出色（缺省 deep）
  gloss?: number; // v4.0 opt-in：顶部渐变白峰值透明度（0-1）
  hopBeats?: number[]; // v4.0 opt-in：节拍 hop 波的全局帧时刻表
}> = ({
  text,
  f0,
  y,
  size = 96,
  fills = [HZ.yellow, HZ.yellowDeep],
  outer = HZ.white,
  deep = HZ.ink,
  whiteW,
  outerW,
  rot = 5,
  stagger = 2,
  drop = 90,
  wiggle = true,
  until,
  skew = 0,
  gap = 0,
  ext,
  extColor,
  gloss,
  hopBeats,
}) => {
  const N = useGlobalFrame();
  const gid = React.useMemo(() => `hzg${gradSeq++}`, []);
  const chars = [...text];
  const widths = chars.map((c) => textEm(c) * size);
  const autoGap = size * 0.09; // 字间留白：给白描边/外描边留出余量，避免相邻字贴死
  const total = widths.reduce((a, b) => a + b, 0) + (gap || autoGap) * Math.max(0, chars.length - 1);
  const ww = whiteW ?? size * 0.07;
  const ow = outerW ?? size * 0.12;
  const layers = huaZiCharLayers({size, ww, ow, deep, outer, ext, extColor, gloss});
  const startX = W / 2 - total / 2;
  let cx = startX;
  const els: React.ReactNode[] = [];
  chars.forEach((ch, i) => {
    const mid = cx + widths[i] / 2;
    cx += widths[i] + (gap || autoGap);
    const u = N - (f0 + i * stagger);
    if (u < 0) return;
    let s = springF(u);
    let dy = -drop * (1 - springF(u, 0.55, 20));
    let r = (i % 2 === 0 ? rot : -rot) * (1 - springF(u, 0.45, 18));
    if (wiggle) {
      const hw = holdWiggle(u, i * 0.9 + 1.3);
      r += hw.r;
      dy += hw.y;
      s *= hw.s;
    }
    // v4.0 opt-in：节拍 hop 波（不传 hopBeats 恒为 0，输出与旧行为一致）
    let hopY = 0;
    let sq = 0;
    if (hopBeats) {
      const hop = beatHopWave(N, hopBeats, i);
      hopY = -hop.hy + (size / 2) * hop.sq;
      sq = hop.sq;
    }
    let op = 1;
    if (until !== undefined && N >= until) {
      const k = (N - until) / 6;
      if (k >= 1) return;
      s *= k < 0.4 ? 1 + 0.1 * (k / 0.4) : 1.1 * (1 - (k - 0.4) / 0.6);
      op = 1 - k * k;
    }
    const common = {
      fontFamily: FONT_HEAVY,
      fontSize: size,
      fontWeight: 900,
      textAnchor: 'middle' as const,
      dominantBaseline: 'central' as const,
      strokeLinejoin: 'round' as const,
      strokeLinecap: 'round' as const,
    };
    const grad = (f: string) =>
      f === '#grad:fill' ? `url(#${gid})` : f === '#grad:gloss' ? `url(#${gid}-gloss)` : f === '#grad:glossP' ? `url(#${gid}-glossP)` : f;
    els.push(
      <g
        key={i}
        transform={
          hopBeats
            ? `translate(${mid.toFixed(1)} ${(y + dy + hopY).toFixed(1)}) rotate(${r.toFixed(2)}) scale(${(s * (1 + sq)).toFixed(4)} ${(
                s * (1 - sq)
              ).toFixed(4)})`
            : `translate(${mid.toFixed(1)} ${(y + dy).toFixed(1)}) rotate(${r.toFixed(2)}) scale(${s.toFixed(4)})`
        }
        opacity={op}
      >
        <g transform={skew ? `skewX(${skew})` : undefined}>
          {layers.map((L) => (
            <text
              key={L.id}
              {...common}
              y={L.dy || undefined}
              fill={grad(L.fill)}
              stroke={L.stroke}
              strokeWidth={L.strokeWidth}
              opacity={L.opacity}
            >
              {ch}
            </text>
          ))}
        </g>
      </g>,
    );
  });
  return (
    <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={fills[0]} />
          <stop offset="1" stopColor={fills[1]} />
        </linearGradient>
        <linearGradient id={`${gid}-gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={0.85} />
          <stop offset="0.42" stopColor="#fff" stopOpacity={0} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
        {gloss !== undefined && gloss > 0 ? (
          <linearGradient id={`${gid}-glossP`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity={gloss} />
            <stop offset="0.46" stopColor="#fff" stopOpacity={0} />
            <stop offset="1" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
        ) : null}
      </defs>
      {els}
    </svg>
  );
};

/** Burst 惊讶放射爆炸框（签名特征③惊讶档）：双层多角放射星形（deep 投影 + 主色 + 内芯），弹簧 pop + 微旋。 */
export const Burst: React.FC<{
  f0: number;
  cx: number;
  cy: number;
  rx?: number;
  ry?: number;
  n?: number;
  seed?: number;
  color?: string;
  core?: string;
  deep?: string;
}> = ({f0, cx, cy, rx = 430, ry = 250, n = 14, seed = 7, color = HZ.yellow, core = '#FFE9F1', deep = HZ.yellowDeep}) => {
  const N = useGlobalFrame();
  const u = N - f0;
  if (u < 0) return null;
  const s = springF(u, 0.5, 20);
  const op = clamp(u / 2, 0, 1);
  const pt = (i: number, k: number) => {
    const a = (i / (2 * n)) * Math.PI * 2 - Math.PI / 2;
    const outer = i % 2 === 0;
    const j = 0.86 + 0.28 * (Math.sin(seed * 97.31 + i * 31.7) * 0.5 + 0.5);
    const R1 = (outer ? 1 : 0.66) * j * k;
    return `${(Math.cos(a) * rx * R1).toFixed(1)} ${(Math.sin(a) * ry * R1).toFixed(1)}`;
  };
  let d = '';
  let d2 = '';
  for (let i = 0; i < 2 * n; i++) {
    d += `${i === 0 ? 'M' : 'L'}${pt(i, 1)}`;
    d2 += `${i === 0 ? 'M' : 'L'}${pt(i, 0.82)}`;
  }
  return (
    <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none', opacity: op}}>
      <g transform={`translate(${cx + 10} ${cy + 12}) rotate(${-1.4 + 0.02 * u}) scale(${s.toFixed(4)})`}>
        <path d={`${d}Z`} fill={deep} />
      </g>
      <g transform={`translate(${cx} ${cy}) rotate(${1.0 - 0.02 * u}) scale(${s.toFixed(4)})`}>
        <path d={`${d}Z`} fill={color} />
        <path d={`${d2}Z`} fill={core} />
      </g>
    </svg>
  );
};

/** Sparkle 闪光（签名特征③强调档配件）：四角星，pop 后旋入快灭。 */
export const Sparkle: React.FC<{f0: number; x: number; y: number; size?: number; color?: string; dur?: number}> = ({
  f0,
  x,
  y,
  size = 46,
  color = HZ.white,
  dur = 22,
}) => {
  const N = useGlobalFrame();
  const u = N - f0;
  if (u < 0 || u > dur) return null;
  const sIn = springF(Math.min(u, 6), 0.6, 26);
  const fade = u < dur - 8 ? 1 : 1 - (u - (dur - 8)) / 8;
  const k = size * 0.16;
  const r = size;
  const d = `M0 ${-r}Q${k} ${-k} ${r} 0Q${k} ${k} 0 ${r}Q${-k} ${k} ${-r} 0Q${-k} ${-k} 0 ${-r}Z`;
  return (
    <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none', opacity: fade}}>
      <g transform={`translate(${x} ${y}) rotate(${12 + u * 1.5}) scale(${sIn.toFixed(3)})`}>
        <path d={d} fill={color} stroke={HZ.ink} strokeWidth={size * 0.05} strokeLinejoin="round" />
      </g>
    </svg>
  );
};

/** PawShape 爪印（贯穿符号，纯代码几何）。 */
export const PawShape: React.FC<{x: number; y: number; size: number; rot?: number; color?: string; scale?: number; opacity?: number}> = ({
  x,
  y,
  size,
  rot = 0,
  color = HZ.pink,
  scale = 1,
  opacity = 1,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${(size / 100) * scale})`} opacity={opacity}>
    <ellipse cx={0} cy={10} rx={34} ry={28} fill={color} />
    <ellipse cx={-34} cy={-22} rx={12} ry={16} fill={color} transform="rotate(-18 -34 -22)" />
    <ellipse cx={-12} cy={-36} rx={12} ry={16} fill={color} transform="rotate(-6 -12 -36)" />
    <ellipse cx={12} cy={-36} rx={12} ry={16} fill={color} transform="rotate(6 12 -36)" />
    <ellipse cx={34} cy={-22} rx={12} ry={16} fill={color} transform="rotate(18 34 -22)" />
  </g>
);

/** PawStamp：盖章式入场（1.55→1 压下 + 微回弹）。 */
export const PawStamp: React.FC<{f0: number; x: number; y: number; size?: number; rot?: number; color?: string}> = ({
  f0,
  x,
  y,
  size = 92,
  rot = 0,
  color = HZ.pink,
}) => {
  const N = useGlobalFrame();
  const u = N - f0;
  if (u < 0) return null;
  const press = u < 5 ? 1.55 - 0.55 * (u / 5) ** 1.6 : 1 + 0.04 * springF(u - 5, 0.4, 14);
  const op = clamp(u / 2, 0, 1);
  return (
    <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none', opacity: op}}>
      <PawShape x={x} y={y} size={size} rot={rot} color={color} scale={press} />
    </svg>
  );
};

/** Badge 序号圆牌：①–④ 信号编号，pop 入场 + 常驻轻摆。 */
export const Badge: React.FC<{n: number; f0: number; x?: number; y?: number; color?: string}> = ({
  n,
  f0,
  x = 150,
  y = 300,
  color = HZ.cyan,
}) => {
  const N = useGlobalFrame();
  const u = N - f0;
  if (u < 0) return null;
  const s = springF(u);
  const sway = Math.sin((N / 30) * 2.1 + n) * 2.4;
  return (
    <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}}>
      <defs>
        <linearGradient id={`bdg${n}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor={HZ.ink} />
        </linearGradient>
      </defs>
      <g transform={`translate(${x + sway} ${y}) scale(${s.toFixed(3)}) rotate(${(-6 + n * 3).toFixed(1)})`}>
        <circle cx={5} cy={7} r={58} fill={HZ.ink} opacity={0.9} />
        <circle cx={0} cy={0} r={58} fill={`url(#bdg${n})`} stroke={HZ.white} strokeWidth={9} />
        <text
          x={0}
          y={4}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={FONT_HEAVY}
          fontWeight={900}
          fontSize={66}
          fill={HZ.white}
          stroke={HZ.ink}
          strokeWidth={2}
        >
          {n}
        </text>
      </g>
    </svg>
  );
};

/** SubBand 竖屏字幕带（带中心 y1462，正文 46px ≥42 红线）：白字 + 墨色描边环 + 逐条歪斜手写感（签名特征③旁白小字档）。 */
export const SubBand: React.FC = () => {
  const N = useCurrentFrame() + 1;
  const cur = SUBS.find((e) => N >= e.from && N <= e.to);
  if (!cur) return null;
  const idx = SUBS.indexOf(cur);
  const u = N - cur.from;
  const pop = u < 4 ? 1 + 0.08 * (1 - u / 4) : 1;
  const tilts = [-1.4, 1.0, -0.8, 1.4];
  const tilt = tilts[idx % tilts.length];
  /** 描边环：16+8+4 三圈方向点阵（同模板 Subtitle.strokeShadow 的做法，避免 -webkit-text-stroke 尖角刺）。 */
  const ring = (r: number, k: number, col: string): string[] =>
    Array.from({length: k}, (_, i) => {
      const a = (i / k) * Math.PI * 2;
      return `${(Math.cos(a) * r).toFixed(2)}px ${(Math.sin(a) * r).toFixed(2)}px 0 ${col}`;
    });
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 1462,
        width: W,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        transform: `translateY(-50%) rotate(${tilt}deg) scale(${pop.toFixed(3)})`,
      }}
    >
      <span
        style={{
          fontFamily: FONT_HEAVY,
          fontWeight: 900,
          fontSize: 46,
          color: HZ.white,
          lineHeight: 1.25,
          letterSpacing: 1,
          textShadow: [...ring(5, 16, HZ.ink), ...ring(2.5, 8, HZ.ink), '0 5px 0 rgba(43,33,73,0.33)'].join(', '),
        }}
      >
        {cur.text}
      </span>
    </div>
  );
};

/** PopField 底层装饰场：奶油底 + 三个慢漂软色斑 + 半调网点角 + 手绘感圆角虚线框（纯代码，无照片素材）。 */
export const PopField: React.FC = () => {
  const N = useCurrentFrame() + 1;
  const t = N / 30;
  const blob = (cx: number, cy: number, r: number, color: string, op: number) => (
    <div
      style={{
        position: 'absolute',
        left: cx - r + Math.sin(t * 0.35 + cx) * 16,
        top: cy - r + Math.cos(t * 0.28 + cy) * 14,
        width: r * 2,
        height: r * 2,
        borderRadius: '50%',
        background: color,
        opacity: op,
        filter: 'blur(2px)',
      }}
    />
  );
  return (
    <AbsoluteFill style={{background: HZ.bg}}>
      {blob(190, 330, 210, HZ.pink, 0.14)}
      {blob(930, 760, 240, HZ.cyan, 0.13)}
      {blob(210, 1250, 190, HZ.yellow, 0.2)}
      <svg width={W} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        <defs>
          <pattern id="hz-dots" width={34} height={34} patternUnits="userSpaceOnUse">
            <circle cx={5} cy={5} r={3.2} fill={HZ.ink} opacity={0.1} />
          </pattern>
        </defs>
        <rect x={0} y={0} width={330} height={430} fill="url(#hz-dots)" opacity={0.75} />
        <rect x={W - 300} y={1300} width={300} height={620} fill="url(#hz-dots)" opacity={0.75} />
        <rect x={30} y={30} width={W - 60} height={1920 - 60} rx={44} fill="none" stroke={HZ.ink} strokeOpacity={0.13} strokeWidth={5} strokeDasharray="2 26" strokeLinecap="round" />
      </svg>
    </AbsoluteFill>
  );
};
