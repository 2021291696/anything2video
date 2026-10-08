// 速度方向拉伸 makeM / impact 预备-释放 / smearCap 解析模糊：技法借鉴 mg-styles-15 demos/08-morph (MIT, Vincentwei1021), TSX 重写
import React from 'react';
import {
  applyM,
  cityWindows,
  impactEvent,
  morphPose,
  morphProgress,
  morphPts,
  oklabLerp,
  qbez,
  shutterFrames,
  smearCapGeom,
  toPath,
  type ImpactEvent,
  type Pt,
  type ShapeKey,
  type Win,
} from './morph';

/**
 * kit.tsx — MORPH 风格卡图元库（s34-morph 正本）。
 * 苹果发布会级图形叙事：深空底 + 单主体发光渐变形 + 环境光随剧情迁移。
 * 全部纯代码 SVG/CSS，无外部素材；动画 seeded 可复现。
 */

// 色板 token（SPEC 锁死项）
export const PAL = {
  bg: '#0b0b10',
  ink: '#f5f5f7',
  dim: '#9a9aa2',
  cupTop: '#f7c98b',
  cupLow: '#c98344',
  coffee: '#7a4a26',
  steam: '#f7d9ac',
  sunTop: '#ffd98a',
  sunLow: '#ff7a3d',
  sunTopDeep: '#ff9b52',
  sunLowDeep: '#e8455e',
  cityTop: '#3d466e',
  cityLow: '#141827',
  window: '#ffd27a',
  dot: '#ffcf7a',
  pinTop: '#ff8a5c',
  pinLow: '#ff4d3d',
};

/** 主体舞台中心（全片恒定，跨镜头连续）。 */
export const CX = 640;
export const CY = 340;

/** 环境光层（径向氛围，随剧情换色）。 */
export const Ambient: React.FC<{c: string; o?: number; cx?: number; cy?: number; r?: number}> = ({
  c,
  o = 1,
  cx = CX,
  cy = CY,
  r = 560,
}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: `radial-gradient(circle ${r}px at ${cx}px ${cy}px, ${c} 0%, rgba(11,11,16,0) 72%)`,
      opacity: o,
    }}
  />
);

/** 主体形变路径：垂直渐变（两端色 OKLab 插值）+ 同色辉光。 */
export const MorphPath: React.FC<{
  pts: Pt[];
  top: string;
  bottom: string;
  glow: string;
  glowSize?: number;
  opacity?: number;
  transform?: string;
  gid: string;
}> = ({pts, top, bottom, glow, glowSize = 46, opacity = 1, transform, gid}) => (
  <g transform={transform} opacity={opacity}>
    <defs>
      <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={top} />
        <stop offset="1" stopColor={bottom} />
      </linearGradient>
    </defs>
    <path
      d={toPath(pts)}
      fill={`url(#${gid})`}
      style={{filter: `drop-shadow(0 0 ${glowSize}px ${glow})`}}
    />
  </g>
);

/** 渐变对插值（形变/天黑时颜色随进度走 OKLab）。 */
export const lerpPair = (a: [string, string], b: [string, string], t: number): [string, string] => [
  oklabLerp(a[0], b[0], t),
  oklabLerp(a[1], b[1], t),
];

/** 咖啡液（杯体梯形 clip，液面下降 = 喝空）。 */
export const CoffeeFill: React.FC<{level: number; clipId: string; op?: number}> = ({level, clipId, op = 1}) => (
  <g opacity={op} clipPath={`url(#${clipId})`}>
    <defs>
      <linearGradient id="cf-g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8a5a2b" />
        <stop offset="1" stopColor="#5d3818" />
      </linearGradient>
    </defs>
    <rect x={-104} y={level} width={208} height={260} fill="url(#cf-g)" />
  </g>
);

/** 杯体 clip（不含把手鼓包；边缘内收避开杯轮廓，液面只在杯身内且不露角）。 */
export const CupClip: React.FC<{clipId: string}> = ({clipId}) => (
  <clipPath id={clipId}>
    <path d="M-92,-116 L92,-116 L62,104 L-62,104 Z" />
  </clipPath>
);

/** 热气（两条摆动虚线，dashoffset 流动）。 */
export const Vapor: React.FC<{f: number; o: number}> = ({f, o}) => (
  <g opacity={o} stroke={PAL.steam} strokeWidth={4} strokeLinecap="round" fill="none">
    {[-26, 22].map((x0, i) => {
      const sway = Math.sin(f / 14 + i * 2.1) * 7;
      const drift = -((f * 0.9 + i * 30) % 56);
      return (
        <path
          key={i}
          d={`M${x0 + sway},${-138 + drift * 0.25} C ${x0 + sway - 9},${-170 + drift * 0.5} ${x0 + sway + 9},${-186 + drift * 0.75} ${x0 + sway},${-214 + drift}`}
          strokeDasharray="7 9"
          strokeDashoffset={-f * 1.6}
          opacity={0.5 - i * 0.14}
        />
      );
    })}
  </g>
);

/** 城市窗灯矩阵（确定性生成；lit 相对点亮帧，f 为绝对帧）。 */
export const Windows: React.FC<{wins?: Win[]; f: number; alpha: number}> = ({wins, f, alpha}) => {
  const list = wins ?? cityWindows();
  return (
    <g opacity={alpha}>
      {list.map((w, i) => {
        const t = Math.min(1, Math.max(0, (f - w.lit) / 6));
        if (t <= 0) return null;
        const flick = 0.86 + 0.14 * Math.sin(f / 9 + w.warm * 9);
        return (
          <rect
            key={i}
            x={w.x}
            y={w.y}
            width={9}
            height={12}
            rx={2}
            fill={PAL.window}
            opacity={t * (0.55 + 0.45 * w.warm) * flick}
          />
        );
      })}
    </g>
  );
};

/** 扩散圆环（halo / 拉远涟漪 / 定位雷达波共用）。 */
export const Ring: React.FC<{r: number; o: number; c: string; w?: number; cy?: number; ry?: number}> = ({
  r,
  o,
  c,
  w = 3,
  cy = 0,
  ry,
}) =>
  o <= 0.004 ? null : (
    <ellipse cx={0} cy={cy} rx={r} ry={ry ?? r} fill="none" stroke={c} strokeWidth={w} opacity={o} />
  );

/** 落地投影（钉子落下时压出）。 */
export const PinShadow: React.FC<{o: number; s: number}> = ({o, s}) =>
  o <= 0.004 ? null : (
    <ellipse cx={0} cy={156} rx={54 * s} ry={11 * s} fill="rgba(0,0,0,0.55)" opacity={o} />
  );

/** 品牌字幕定帧（逐字升入；含 kicker 小字）。 */
const LINE = '每个形状，都是一段抵达';
export const BrandText: React.FC<{f: number; from: number}> = ({f, from}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      top: 522,
      textAlign: 'center',
      fontFamily: "'Noto Sans SC', sans-serif",
    }}
  >
    <div
      style={{
        fontSize: 15,
        letterSpacing: 10,
        color: PAL.dim,
        opacity: Math.min(1, Math.max(0, (f - from + 4) / 16)),
        marginBottom: 18,
      }}
    >
      形态的旅行 · MORPH
    </div>
    <div style={{fontSize: 46, fontWeight: 600, color: PAL.ink, letterSpacing: 7}}>
      {LINE.split('').map((ch, i) => {
        const t = Math.min(1, Math.max(0, (f - (from + i * 3)) / 14));
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: t,
              transform: `translateY(${(1 - t) * 18}px)`,
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  </div>
);

/** 呼吸辉光脉动（定帧微动效用）。 */
export const breathe = (f: number, amp: number, period = 48) => amp * (0.5 + 0.5 * Math.sin((f / period) * Math.PI * 2));

/** easeOutBack 弹入（钩子弹入用）。 */
export const popIn = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const x = Math.min(1, Math.max(0, t));
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

// ---------------------------------------------------------------- v4.0（mg 08-morph 技法移植，改默认实现）

/** v4.0 解析运动模糊胶囊（smearCap 渲染层）：smearCapGeom 画成 SVG stadium——round-cap
 *  粗线 + 沿运动轴 alpha 渐变（两端 0、平台 min(1,2r/L)）；disc（L<1.5px）退化为单圆。
 *  pA/pB 由快门两端采样（shutterFrames：帧中心 ±0.25 帧，源 tqc±SH/2）。 */
export const SmearCap: React.FC<{pA: Pt; pB: Pt; r: number; color: string; gid: string}> = ({pA, pB, r, color, gid}) => {
  const geo = smearCapGeom(pA, pB, r);
  if (geo.disc) {
    return (
      <circle cx={geo.pA[0]} cy={geo.pA[1]} r={geo.r} fill={color} />
    );
  }
  return (
    <g>
      <defs>
        <linearGradient
          id={gid}
          gradientUnits="userSpaceOnUse"
          x1={geo.grad.from[0]}
          y1={geo.grad.from[1]}
          x2={geo.grad.to[0]}
          y2={geo.grad.to[1]}
        >
          {geo.grad.stops.map(([off, al], i) => (
            <stop key={i} offset={off} stopColor={color} stopOpacity={al} />
          ))}
        </linearGradient>
      </defs>
      <line
        x1={geo.pA[0]}
        y1={geo.pA[1]}
        x2={geo.pB[0]}
        y2={geo.pB[1]}
        stroke={`url(#${gid})`}
        strokeWidth={geo.r * 2}
        strokeLinecap="round"
      />
    </g>
  );
};

/**
 * v4.0 默认形变主体组件（改默认实现）：morphPair 对位插值 × morphPose（速度方向拉伸 +
 * impact 事件系统）× smearCap（最快运动段解析模糊）。smear 判据与源 drawDecor 同构：
 * 主体质心（位移贝塞尔轨）在快门窗（±0.25 帧）内位移 L≥1.5px 才画胶囊，半径=主体外接
 * 半径（局部顶点到质心最大距，源 drawDecor 的 R=max dist 同法）。v3 图元（MorphPath +
 * morphDeform）保留兼容，新出片默认走本组件。
 */
export const MorphHero: React.FC<{
  a: ShapeKey;
  b: ShapeKey;
  f: number; // 绝对帧
  f0: number;
  f1: number; // 形变窗口（帧）
  from: Pt;
  ctrl: Pt;
  to: Pt; // 位移贝塞尔轨（与 SHAPES 同局部坐标系）
  top: string;
  bottom: string; // 渐变对
  glow: string;
  glowSize?: number;
  dir?: number;
  piv?: Pt;
  sc?: number;
  impactEvents?: ImpactEvent[]; // 卡内镜头表驱动的事件表
  impactWho?: string; // 本段归属主体键（按 who 过滤事件表）
  smearColor?: string; // smear 胶囊色（默认 glow）
  gid: string;
}> = ({
  a, b, f, f0, f1, from, ctrl, to,
  top, bottom, glow, glowSize = 46,
  dir = 1, piv, sc,
  impactEvents, impactWho,
  smearColor,
  gid,
}) => {
  const e = morphProgress(f - f0, f1 - f0);
  const table = impactEvents && impactWho ? impactEvents.filter((ev) => ev.who === impactWho) : undefined;
  const im = table && table.length > 0 ? impactEvent(f, table) : {q: 0, uni: 0};
  const pose = morphPose({from, ctrl, to, e, dir, piv, sc, impact: im});
  const local = morphPts(a, b, e);
  const pts = local.map((p) => applyM(pose, p));
  // 主体外接半径（当帧插值轮廓域；仿射下质心映射质心）
  let cx = 0;
  let cy = 0;
  for (const p of local) {
    cx += p[0];
    cy += p[1];
  }
  cx /= local.length;
  cy /= local.length;
  let R = 0;
  for (const p of local) R = Math.max(R, Math.hypot(p[0] - cx, p[1] - cy));
  // 最快运动段：位移轨在快门两端的速度 → 解析胶囊（L<1.5px 自动退化为不画）
  const span = Math.max(1, f1 - f0);
  const [fa, fb] = shutterFrames(f);
  const cl = (u: number): number => Math.min(1, Math.max(0, u));
  const pa = qbez(from, ctrl, to, cl((fa - f0) / span));
  const pb = qbez(from, ctrl, to, cl((fb - f0) / span));
  const geo = smearCapGeom(pa, pb, Math.max(1, R));
  return (
    <g>
      {geo.disc ? null : <SmearCap pA={pa} pB={pb} r={geo.r} color={smearColor ?? glow} gid={`${gid}-smear`} />}
      <MorphPath pts={pts} top={top} bottom={bottom} glow={glow} glowSize={glowSize} gid={gid} />
    </g>
  );
};
