import React from 'react';
import {clamp01, easeInOutPow} from './common';

/**
 * 霓虹夜城图元库（neon-city 专用，主脚本维护）。
 * 夜幕底 + 城市光斑 + 霓虹描边（白芯+彩晕+闪烁）+ 雨丝 + 霓虹字。
 * 镜头组件 N = useCurrentFrame() + F0（F0 = ShotDef.from）。
 */
export const NEON = {
  night0: '#07070f', night1: '#12101f',
  pink: '#ff4d9d', cyan: '#33e0ff', yellow: '#ffe14d', purple: '#9d5cff',
  core: '#ffffff',
};

export type NeonColor = 'pink' | 'cyan' | 'yellow' | 'purple';
const NEON_COLOR: Record<NeonColor, string> = {
  pink: NEON.pink, cyan: NEON.cyan, yellow: NEON.yellow, purple: NEON.purple,
};

/** 夜幕底 + 远处城市光斑（确定性 bokeh） */
export const NeonNight: React.FC<{seed?: number}> = ({seed = 3}) => (
  <div style={{
    position: 'absolute', inset: 0,
    background: `radial-gradient(ellipse 80% 70% at 50% 40%, ${NEON.night1}, ${NEON.night0} 85%)`,
  }}>
    {Array.from({length: 18}, (_, i) => {
      const hx = ((i * 137 + seed * 31) % 100) / 100;
      const hy = ((i * 89 + seed * 53) % 60) / 100;
      const colors = [NEON.pink, NEON.cyan, NEON.yellow, NEON.purple];
      const c = colors[i % 4];
      const r = 3 + ((i * 17) % 6);
      return <div key={i} style={{
        position: 'absolute', left: `${(hx * 92 + 3).toFixed(1)}%`, top: `${(hy * 55 + 4).toFixed(1)}%`,
        width: r * 2, height: r * 2, borderRadius: '50%', background: c,
        opacity: 0.16 + ((i * 7) % 10) / 40, filter: `blur(${2 + (i % 3)}px)`,
      }} />;
    })}
  </div>
);

/** 全局收尾：夜色暗角（挂 Main） */
export const NeonPost: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0, pointerEvents: 'none',
    background: 'radial-gradient(ellipse 96% 90% at 50% 46%, transparent 60%, rgba(0,0,8,.55) 100%)',
  }} />
);

/** 幕包装：淡入淡出 */
export const NeonScene: React.FC<{N: number; f0: number; end: number; children: React.ReactNode}> = ({N, f0, end, children}) => {
  const inOp = clamp01((N - f0) / 12);
  const outOp = 1 - clamp01((N - (end - 14)) / 14);
  return <div style={{position: 'absolute', inset: 0, opacity: Math.min(inOp, outOp)}}>{children}</div>;
};

/** 霓虹描边：白芯 + 双层彩晕 + 确定性闪烁（flick>0 时）；渐进画入 */
export const NeonStroke: React.FC<{
  d: string; N: number; f0: number; len?: number; w?: number; color?: NeonColor; opacity?: number; delay?: number; flick?: number;
}> = ({d, N, f0, len = 24, w = 5, color = 'cyan', opacity = 0.96, delay = 0, flick = 0}) => {
  const n = N - f0 - delay;
  const t = easeInOutPow(1.7)(clamp01(n / len));
  if (t <= 0) return null;
  const c = NEON_COLOR[color];
  const flicker = flick > 0 ? 1 - flick * Math.abs(Math.sin(n * 1.7)) * (0.4 + 0.6 * Math.abs(Math.sin(n * 0.31))) : 1;
  return (
    <svg width={1280} height={720} viewBox="0 0 1280 720" style={{position: 'absolute', left: 0, top: 0, opacity: opacity * flicker * t}}>
      <path d={d} fill="none" stroke={c} strokeWidth={w * 3.2} strokeLinecap="round" opacity={0.22} style={{filter: `blur(${6 + w}px)`}} />
      <path d={d} fill="none" stroke={c} strokeWidth={w * 1.7} strokeLinecap="round" opacity={0.5} style={{filter: 'blur(2.4px)'}} />
      <path d={d} fill="none" stroke={NEON.core} strokeWidth={w * 0.55} strokeLinecap="round" />
    </svg>
  );
};

/** 霓虹字：白芯 + 彩色多层 textShadow + 确定性闪烁 */
export const NeonText: React.FC<{
  text: string; N: number; f0: number; x?: number; y?: number; size?: number; color?: NeonColor; spacing?: number; opacity?: number; flick?: number;
}> = ({text, N, f0, x = 640, y = 200, size = 90, color = 'pink', spacing = 10, opacity = 0.97, flick = 0.12}) => {
  const n = N - f0;
  const t = easeInOutPow(2)(clamp01(n / 16));
  if (t <= 0) return null;
  const c = NEON_COLOR[color];
  const flicker = 1 - flick * Math.abs(Math.sin(n * 1.9)) * Math.abs(Math.sin(n * 0.23));
  return (
    <div style={{
      position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%)', opacity: t * opacity * flicker,
      fontFamily: `'Noto Sans SC', sans-serif`, fontWeight: 900, fontSize: size, color: '#fff',
      letterSpacing: spacing, whiteSpace: 'nowrap',
      textShadow: `0 0 6px #fff, 0 0 14px ${c}, 0 0 34px ${c}, 0 0 60px ${c}`,
    }}>{text}</div>
  );
};

/** 雨丝：确定性细线阵（雨夜段用） */
export const Rain: React.FC<{N: number; f0: number; count?: number; opacity?: number}> = ({N, f0, count = 24, opacity = 0.3}) => {
  const n = N - f0;
  if (n <= 0) return null;
  return (
    <svg width={1280} height={720} viewBox="0 0 1280 720" style={{position: 'absolute', left: 0, top: 0, opacity}}>
      {Array.from({length: count}, (_, i) => {
        const sx = (i * 173 + 41) % 1280;
        const speed = 14 + (i % 5) * 5;
        const y = ((n * speed + i * 97) % 820) - 60;
        return <line key={i} x1={sx} y1={y} x2={sx - 7} y2={y + 34}
          stroke="rgba(180,220,255,.5)" strokeWidth={1.6} strokeLinecap="round" opacity={opacity} />;
      })}
    </svg>
  );
};

/** 地面反光：彩色模糊横带（雨夜湿地倒影） */
export const WetGlow: React.FC<{cx: number; y: number; w: number; color: NeonColor; N: number; f0: number; opacity?: number}> = ({cx, y, w, color, N, f0, opacity = 0.3}) => {
  const t = clamp01((N - f0) / 16);
  if (t <= 0) return null;
  return <div style={{
    position: 'absolute', left: cx - w / 2, top: y, width: w, height: 26, borderRadius: '50%',
    background: NEON_COLOR[color], opacity: t * opacity, filter: 'blur(16px)',
  }} />;
};

/** 霓虹图标骨架：Iconify ds 白芯 + 彩晕 + 亮起闪烁（flick>0 亮起瞬间的霓虹灯抖动）。许可见 src/icons.ts。 */
export const NeonIcon: React.FC<{
  ds: string[]; viewBox?: string; N: number; f0: number; x: number; y: number; size: number;
  color?: NeonColor; len?: number; opacity?: number; rotate?: number; flick?: number;
}> = ({ds, viewBox = '0 0 24 24', N, f0, x, y, size, color = 'pink', len = 22, opacity = 0.95, rotate = 0, flick = 0.35}) => {
  const n = N - f0;
  if (n <= 0) return null;
  const t = easeInOutPow(1.8)(clamp01(n / len));
  const [vx, vy, vw, vh] = viewBox.split(/\s+/).map(Number);
  const scale = size / Math.max(vw, vh);
  const c = NEON_COLOR[color];
  const flicker = n > len ? 1 - flick * Math.abs(Math.sin(n * 1.5)) * Math.abs(Math.sin(n * 0.21)) : t;
  return (
    <svg width={1280} height={720} viewBox="0 0 1280 720" style={{position: 'absolute', left: 0, top: 0, opacity: opacity * flicker}}>
      <g transform={`translate(${(x - size / 2).toFixed(1)} ${(y - size / 2).toFixed(1)}) rotate(${rotate} ${size / 2} ${size / 2})`}>
        <g transform={`scale(${scale.toFixed(4)}) translate(${(-vx).toFixed(2)} ${(-vy).toFixed(2)})`}>
          <g fill="none" stroke={c} strokeWidth={Math.max(vw, vh) / 14} strokeLinecap="round" strokeLinejoin="round"
            opacity={0.55} style={{filter: `blur(${(size / 28).toFixed(1)}px)`}}>
            {ds.map((d, i) => <path key={i} d={d} />)}
          </g>
          <g fill="none" stroke="#ffffff" strokeWidth={Math.max(vw, vh) / 40} strokeLinecap="round" strokeLinejoin="round"
            opacity={0.9}>
            {ds.map((d, i) => <path key={i} d={d} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - t} />)}
          </g>
        </g>
      </g>
    </svg>
  );
};

// =====================================================================
// opt-in 扩展区（2026-10-07）：以下组件借鉴 lanshu-create-ai-presenter-video
// （MIT, cclank）v2-signal kit 的 wire / tracker / stamp 机制，按本卡
// Remotion 惯用法（N=f0+useCurrentFrame()、NEON 色板、白芯彩晕纪律）重写。
// 全部为新增组件，默认不启用——不触碰、不改变上方任何既有组件的默认输出。
// =====================================================================

export type FlowPoint = {x: number; y: number};
type FlowPts = [FlowPoint, FlowPoint, FlowPoint, FlowPoint];

/** 三次贝塞尔求值（DataFlow 拖尾包取点用，导出供调用方对位标注）。 */
export const flowBez = (p: FlowPts, u: number): FlowPoint => {
  const v = 1 - u;
  return {
    x: v * v * v * p[0].x + 3 * v * v * u * p[1].x + 3 * v * u * u * p[2].x + u * u * u * p[3].x,
    y: v * v * v * p[0].y + 3 * v * v * u * p[1].y + 3 * v * u * u * p[2].y + u * u * u * p[3].y,
  };
};

/** 水平切线控制点：k=bend??max(40,|dx|·0.45)，方向 s=b.x>=a.x?1:-1（导出供复算线长/标注位）。 */
export const flowLink = (a: FlowPoint, b: FlowPoint, bend?: number): FlowPts => {
  const k = bend == null ? Math.max(40, Math.abs(b.x - a.x) * 0.45) : bend;
  const s = b.x >= a.x ? 1 : -1;
  return [a, {x: a.x + s * k, y: a.y}, {x: b.x - s * k, y: b.y}, b];
};

const flowLen = (p: FlowPts): number => {
  let L = 0;
  let a = flowBez(p, 0);
  for (let q = 1; q <= 48; q++) {
    const b = flowBez(p, q / 48);
    L += Math.hypot(b.x - a.x, b.y - a.y);
    a = b;
  }
  return L;
};

/**
 * DataFlow —— 数据包沿贝塞尔流动（opt-in）。
 * 基线随 len 帧画入（easeInOutPow(1.7)，dasharray/offset 画线）；流动虚线 dash "12 16"
 * 以 speed px/s 移动（dir ±1 可反向）；拖尾数据包 packets 组、每组 3 圆（r、r-2、r-4，白芯带头）
 * 按 ph=((t-t0)·rate+p/n)%1 相位巡线，q=ph-j·0.028·dir，透明度 min(1,sin(qπ)·1.8)·(1-j·0.3)
 * ——中段亮两端淡出。秒制参数按 fps（默认 30）换算；t0 默认=画入完成时刻。确定性、可 seek。
 */
export const DataFlow: React.FC<{
  a: FlowPoint;
  b: FlowPoint;
  N: number;
  f0: number;
  bend?: number;
  color?: NeonColor;
  len?: number;
  dir?: 1 | -1;
  speed?: number;
  rate?: number;
  packets?: number;
  r?: number;
  w?: number;
  opacity?: number;
  width?: number;
  height?: number;
  fps?: number;
}> = ({a, b, N, f0, bend, color = 'cyan', len = 20, dir = 1, speed = 70, rate = 0.8, packets = 3, r = 8,
  w = 3, opacity = 1, width = 1280, height = 720, fps = 30}) => {
  const n = N - f0;
  if (n <= 0) return null;
  const pts = flowLink(a, b, bend);
  const f1 = (v: number) => v.toFixed(1);
  const d = `M ${f1(pts[0].x)} ${f1(pts[0].y)} C ${f1(pts[1].x)} ${f1(pts[1].y)}, ${f1(pts[2].x)} ${f1(pts[2].y)}, ${f1(pts[3].x)} ${f1(pts[3].y)}`;
  const L = flowLen(pts) + 4;
  const draw = easeInOutPow(1.7)(clamp01(n / len));
  const c = NEON_COLOR[color];
  const t0Sec = len / fps;
  const tSec = n / fps;
  const flowing = draw >= 1;
  const dots: React.ReactNode[] = [];
  if (flowing) {
    for (let p = 0; p < packets; p++) {
      let ph = ((tSec - t0Sec) * rate + p / packets) % 1;
      if (dir < 0) ph = 1 - ph;
      for (let j = 0; j < 3; j++) {
        const q = ph - j * 0.028 * dir;
        if (q <= 0 || q >= 1) continue;
        const pt = flowBez(pts, q);
        const op = (Math.min(1, Math.sin(q * Math.PI) * 1.8) * (1 - j * 0.3)).toFixed(3);
        dots.push(<circle key={`p${p}j${j}`} cx={f1(pt.x)} cy={f1(pt.y)} r={r - j * 2} fill={c} opacity={op} />);
        if (j === 0) dots.push(
          <circle key={`p${p}c`} cx={f1(pt.x)} cy={f1(pt.y)} r={(r * 0.45).toFixed(1)} fill={NEON.core} opacity={op} />);
      }
    }
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{position: 'absolute', left: 0, top: 0, opacity}}>
      <path d={d} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" opacity={0.3}
        strokeDasharray={`${L.toFixed(1)} ${L.toFixed(1)}`} strokeDashoffset={((1 - draw) * L).toFixed(1)} />
      <path d={d} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round"
        strokeDasharray="12 16" strokeDashoffset={(-(tSec - t0Sec) * speed * dir).toFixed(1)}
        opacity={flowing ? 1 : 0} style={{filter: 'blur(1px)'}} />
      {dots}
    </svg>
  );
};

/**
 * Tracker —— 四角 L 形追踪框（opt-in）。
 * at 时刻（相对 f0 的帧数）以 scale 2.6→1 easeOutCubic 0.3s 锁定 (x,y 为中心的 w×h 框)；
 * 角臂 16px/3px（big: 34px/4px）；until（相对 f0 的帧数）前 0.12s 淡出。白芯纪律：角臂取色不描白。
 */
export const Tracker: React.FC<{
  N: number; f0?: number; at: number; x: number; y: number; w: number; h: number;
  big?: boolean; color?: NeonColor; until?: number; fps?: number;
}> = ({N, f0 = 0, at, x, y, w, h, big = false, color = 'cyan', until, fps = 30}) => {
  const n = N - f0 - at;
  if (n < 0) return null;
  const u = 1 - Math.pow(1 - clamp01(n / (0.3 * fps)), 3);
  const fade = 0.12 * fps;
  const op = until == null ? 1 : 1 - clamp01((n - (until - at - fade)) / fade);
  if (op <= 0) return null;
  const arm = big ? 34 : 16;
  const bw = big ? 4 : 3;
  const c = NEON_COLOR[color];
  const corner = (pos: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute', width: arm, height: arm, border: `0 solid ${c}`, ...pos,
  });
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: w, height: h, opacity: op, pointerEvents: 'none',
      transform: `translate(-50%,-50%) scale(${(2.6 - 1.6 * u).toFixed(3)})`,
    }}>
      <div style={corner({left: 0, top: 0, borderTopWidth: bw, borderLeftWidth: bw})} />
      <div style={corner({right: 0, top: 0, borderTopWidth: bw, borderRightWidth: bw})} />
      <div style={corner({left: 0, bottom: 0, borderBottomWidth: bw, borderLeftWidth: bw})} />
      <div style={corner({right: 0, bottom: 0, borderBottomWidth: bw, borderRightWidth: bw})} />
    </div>
  );
};

/**
 * Slam —— 盖章砸落（opt-in）。
 * at 起 0.18s 压入：u=easeInQuad(pr)，scale=1.9-0.9u、rotate=-14°→-5°；
 * until（相对 f0 的帧数）前 0.14s 淡出。本组件只管 motion+定位，印章内容由 children 给。
 */
export const Slam: React.FC<{
  N: number; f0?: number; at: number; until?: number; x?: number; y?: number; fps?: number;
  children?: React.ReactNode;
}> = ({N, f0 = 0, at, until, x = 640, y = 360, fps = 30, children}) => {
  const n = N - f0 - at;
  if (n < 0) return null;
  const u0 = clamp01(n / (0.18 * fps));
  const u = u0 * u0;
  const fade = 0.14 * fps;
  const op = until == null ? 1 : 1 - clamp01((n - (until - at - fade)) / fade);
  if (op <= 0) return null;
  return (
    <div style={{
      position: 'absolute', left: x, top: y, opacity: op, pointerEvents: 'none',
      transform: `translate(-50%,-50%) scale(${(1.9 - 0.9 * u).toFixed(3)}) rotate(${(-14 + 9 * u).toFixed(2)}deg)`,
    }}>
      {children}
    </div>
  );
};

// =====================================================================
// opt-in 扩展区 II（2026-10-07 v4.0）：VHS 后期 + Synthwave 场景件
// 技法借鉴 huashu-art-motion 26_vaporwave（MIT, alchaincyf）—— TSX 重写。
// 无 WebGL：通道分离用 feColorMatrix 幽灵层 + screen 混合近似源 multiply/lighter；
// 噪声带/OSD 闪/缝相全部 vhsHash 整数杂凑 + sin 组合（seeded 可 seek，禁 Math.random）。
// 全部为新增组件，默认不启用——不触碰、不改变上方任何既有组件的默认输出。
// =====================================================================

/** vhs/synthwave 借鉴件子色板（仅 opt-in 组件用，不进 NEON 锁死 token）。 */
export const SYNTH = {
  sun0: '#ffd84a', sun1: '#ff8a3a', sun2: '#ff4fd8', grid: '#3ff6ff', osd: '#ffffff',
} as const;

/** 确定性整数杂凑 → 0..1（huashu U.hash 同族，vhs/synthwave 借鉴件与断言共用）。 */
export const vhsHash = (a: number, b: number): number => {
  let x = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) >>> 0;
  x = (x ^ (x >>> 13)) >>> 0;
  x = Math.imul(x, 1274126177) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};

/** VHS 偶发加大开关：vhsHash(floor(t·60)>>2, 9)<0.12（≈12% 半秒群命中，huashu 同式）。 */
export const vhsJit = (t: number): 0 | 1 => (vhsHash(Math.floor(t * 60) >> 2, 9) < 0.12 ? 1 : 0);

/** VHS 色差错位量：ca = 3 + jit·6 + 1.5·sin(7t)（huashu P.vhs 同式）。 */
export const vhsCA = (t: number): number => 3 + vhsJit(t) * 6 + Math.sin(t * 7) * 1.5;

/** 切缝落日缝宽：随归一深度 q 2+q²·16（huashu 同式）。 */
export const slitW = (q: number): number => 2 + q * q * 16;

/** 透视网格行进相位：(1.3t) mod 1（huashu 同式）。 */
export const gridPhase = (t: number): number => (1.3 * t) % 1;

/** 单通道隔离滤镜矩阵（R 或 B；幽灵层用）。 */
const CHAN_MATRIX = {
  r: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0',
  b: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0',
} as const;

/**
 * VhsMode —— VHS 信号退化 Post 层（opt-in，默认不挂载）。
 * 包 children 整层输出：RGB 色差（底图一次 + 红/蓝单通道幽灵层 screen 混合，错位 ±ca，
 * ca=vhsCA(t)=3+jit·6+1.5sin(7t)；ghosts=0 关色差省渲染）｜跟踪噪声带（band 70px 以
 * bandSpeed 520px/s 下滚 (lt·520+200)%(H+160)−80，带内 6px 切片横移近似撕裂 + 90 条 seeded 噪线，
 * 噪线按帧重播种 → 每帧闪烁确定性可复现）｜扫描线（4px 周期，行 0 α.28/行 2 α.12）｜
 * OSD（PLAY▶ (f60>>4)%2==0 16 帧闪 + lt<0.2 常亮，日期 + 时:秒:帧 时间码随 lt）｜紫调暗角。
 * N≥f0 才渲染；seconds t=N/fps、lt=(N−f0)/fps。白色 OSD 用 textShadow 保可读。
 */
export const VhsMode: React.FC<{
  N: number; f0?: number; fps?: number; width?: number; height?: number;
  band?: number; bandSpeed?: number; ghosts?: 0 | 1 | 2;
  osd?: boolean; osdLabel?: string; osdDate?: string; osdClock?: string;
  vignette?: string | null; children?: React.ReactNode;
}> = ({N, f0 = 0, fps = 30, width = 1280, height = 720, band = 70, bandSpeed = 520,
  ghosts = 2, osd = true, osdLabel = 'PLAY', osdDate = 'SEP. 04 2011', osdClock = '23:59',
  vignette = 'rgba(10,0,25,.55)', children}) => {
  if (N < f0) return null;
  const t = N / fps;
  const lt = (N - f0) / fps;
  const ca = vhsCA(t);
  const fr = Math.floor(t * 60);
  const by = ((lt * bandSpeed + 200) % (height + 160)) - 80;
  const slices: React.ReactNode[] = [];
  for (let y = 0; y < band; y += 6) {
    const dx = (vhsHash(fr * 7 + y, 11) - 0.5) * 60 * Math.sin((y / band) * Math.PI);
    const a = (0.03 + vhsHash(fr * 7 + y, 13) * 0.05).toFixed(3);
    slices.push(<div key={y} style={{position: 'absolute', left: dx.toFixed(1), top: y, width: '100%', height: 6, background: `rgba(255,255,255,${a})`}} />);
  }
  const streaks: React.ReactNode[] = [];
  for (let i = 0; i < 90; i++) {
    streaks.push(<div key={i} style={{position: 'absolute',
      left: (vhsHash(fr * 7 + i, 21) * width).toFixed(1), top: (vhsHash(fr * 7 + i, 23) * band).toFixed(1),
      width: (20 + vhsHash(fr * 7 + i, 27) * 120).toFixed(1), height: 1.5,
      background: vhsHash(fr * 7 + i, 29) < 0.5 ? '#ffffff' : '#bbbbbb'}} />);
  }
  const osdOn = osd && ((fr >> 4) % 2 === 0 || lt < 0.2);
  const osdFont: React.CSSProperties = {
    fontFamily: `'Courier New', monospace`, fontWeight: 700, color: SYNTH.osd,
    textShadow: '3px 3px rgba(0,0,0,.8)', letterSpacing: 2, whiteSpace: 'nowrap', lineHeight: 1,
  };
  const clock = `${osdClock}:${String(30 + Math.floor(lt)).padStart(2, '0')}:${String(Math.floor(lt * 30) % 30).padStart(2, '0')}`;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width, height, overflow: 'hidden'}}>
      {children}
      {ghosts === 2 && (
        <svg width={0} height={0} style={{position: 'absolute'}}>
          <defs>
            <filter id="vhs-iso-r" colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values={CHAN_MATRIX.r} /></filter>
            <filter id="vhs-iso-b" colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values={CHAN_MATRIX.b} /></filter>
          </defs>
        </svg>
      )}
      {ghosts === 2 && (
        <>
          <div style={{position: 'absolute', inset: 0, transform: `translate(${(-ca).toFixed(2)}px,0)`,
            filter: 'url(#vhs-iso-r)', mixBlendMode: 'screen', opacity: 0.85, pointerEvents: 'none'}}>{children}</div>
          <div style={{position: 'absolute', inset: 0, transform: `translate(${ca.toFixed(2)}px,${(ca * 0.33).toFixed(2)}px)`,
            filter: 'url(#vhs-iso-b)', mixBlendMode: 'screen', opacity: 0.85, pointerEvents: 'none'}}>{children}</div>
        </>
      )}
      <div style={{position: 'absolute', left: 0, top: by.toFixed(1), width, height: band, overflow: 'hidden', pointerEvents: 'none'}}>
        {slices}
        <div style={{position: 'absolute', inset: 0, opacity: 0.5}}>{streaks}</div>
      </div>
      <div style={{position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'repeating-linear-gradient(to bottom, rgba(0,0,0,.28) 0 1px, transparent 1px 2px, rgba(0,0,0,.12) 2px 3px, transparent 3px 4px)'}} />
      {osdOn && (
        <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
          <div style={{...osdFont, position: 'absolute', left: (width * 0.031).toFixed(1), top: (height * 0.062).toFixed(1),
            fontSize: (height * 0.0315).toFixed(1), display: 'flex', alignItems: 'center', gap: (height * 0.014).toFixed(1)}}>
            <span style={{width: 0, height: 0, borderTop: `${(height * 0.0117).toFixed(1)}px solid transparent`,
              borderBottom: `${(height * 0.0117).toFixed(1)}px solid transparent`, borderLeft: `${(height * 0.0185).toFixed(1)}px solid ${SYNTH.osd}`}} />
            {osdLabel}
          </div>
          <div style={{...osdFont, position: 'absolute', left: (width * 0.031).toFixed(1), top: (height * 0.928).toFixed(1), fontSize: (height * 0.024).toFixed(1)}}>{osdDate}</div>
          <div style={{...osdFont, position: 'absolute', left: (width * 0.031).toFixed(1), top: (height * 0.958).toFixed(1), fontSize: (height * 0.024).toFixed(1)}}>{clock}</div>
        </div>
      )}
      {vignette && <div style={{position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 92% 86% at 50% 50%, transparent 46%, ${vignette} 100%)`}} />}
    </div>
  );
};

/**
 * SunSlit —— 切缝落日（SynthwaveSet 件 1，opt-in）。
 * 渐变盘（radial 径向默认 / linear 竖向两档）+ SVG mask 黑缝切出 destination-out 语义：
 * slits 7 条、缝宽 slitW(pos)=2+pos²·16 随深度变大、缝以 rise 0.9 圈/s 上移循环
 * （pos=(base−t·rise) mod 1，宽度跟随当前深度）+ 地平线以下裁掉。id 供多实例错开。
 */
export const SunSlit: React.FC<{
  N?: number; f0?: number; fps?: number; t?: number;
  cx?: number; horizonY?: number; r?: number; slits?: number; rise?: number;
  id?: string; grad?: 'radial' | 'linear'; clipHorizon?: boolean; opacity?: number;
}> = ({N, f0 = 0, fps = 30, t, cx = 640, horizonY = 430, r = 150, slits = 7, rise = 0.9,
  id = 'synth-sun', grad = 'radial', clipHorizon = true, opacity = 1}) => {
  const tt = t ?? (N === undefined ? 0 : (N - f0) / fps);
  const stops: React.ReactNode[] = [
    <stop key="0" offset="0" stopColor={SYNTH.sun0} />,
    <stop key="1" offset="0.55" stopColor={SYNTH.sun1} />,
    <stop key="2" offset="1" stopColor={SYNTH.sun2} />,
  ];
  const slitsEl: React.ReactNode[] = [];
  for (let k = 0; k < slits; k++) {
    const pos = ((((k / slits) - tt * rise) % 1) + 1) % 1; // 0=顶..1=底，随 tt 上移循环
    const y = horizonY - r + pos * 2 * r;
    slitsEl.push(<rect key={k} x={cx - r - 4} y={(y - 2).toFixed(2)} width={2 * r + 8} height={4} fill="#000" />);
  }
  const pad = r + 8;
  return (
    <svg width={1280} height={720} viewBox="0 0 1280 720" style={{position: 'absolute', left: 0, top: 0, opacity}}>
      <defs>
        {grad === 'radial'
          ? <radialGradient id={`${id}-g`} cx="50%" cy="42%" r="65%">{stops}</radialGradient>
          : <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">{stops}</linearGradient>}
        <mask id={`${id}-m`} maskUnits="userSpaceOnUse" x={cx - pad} y={horizonY - pad} width={2 * pad} height={2 * pad}>
          <rect x={cx - pad} y={horizonY - pad} width={2 * pad} height={2 * pad} fill="#fff" />
          {clipHorizon && <rect x={cx - pad} y={horizonY} width={2 * pad} height={pad} fill="#000" />}
          {slitsEl}
        </mask>
      </defs>
      <circle cx={cx} cy={horizonY} r={r} fill={`url(#${id}-g)`} mask={`url(#${id}-m)`} />
    </svg>
  );
};

/**
 * PerspectiveGrid —— 透视网格（SynthwaveSet 件 2，opt-in）。
 * 消失点 (vx,vy) 放射线 + 横线前滚：y=vy+drop/d、d=k+1−phase、phase=gridPhase(t)=(1.3t)%1
 * （huashu 同式，行向观众滚）；线宽近粗 min(4, 0.8+2.6/d)、近亮 opacity min(.9, 1.15/d)。
 * drop 默认 h·520/1080（huashu 1920 高度参数按画布等比）。
 */
export const PerspectiveGrid: React.FC<{
  N?: number; f0?: number; fps?: number; t?: number;
  vx?: number; vy?: number; w?: number; h?: number; lines?: number; drop?: number;
  fan?: number; color?: string; opacity?: number;
}> = ({N, f0 = 0, fps = 30, t, vx = 640, vy = 400, w = 1280, h = 720, lines = 16,
  drop, fan = 12, color = SYNTH.grid, opacity = 1}) => {
  const tt = t ?? (N === undefined ? 0 : (N - f0) / fps);
  const dp = drop ?? h * (520 / 1080);
  const phase = gridPhase(tt);
  const rows: React.ReactNode[] = [];
  for (let k = 0; k < lines; k++) {
    const d = k + 1 - phase;
    if (d <= 0.05) continue;
    const y = vy + dp / d;
    if (y > h) continue;
    rows.push(<line key={k} x1={0} y1={y.toFixed(2)} x2={w} y2={y.toFixed(2)} stroke={color}
      strokeWidth={Math.min(4, 0.8 + 2.6 / d).toFixed(2)} opacity={Math.min(0.9, 1.15 / d).toFixed(3)} />);
  }
  const fans: React.ReactNode[] = [];
  for (let j = 0; j <= fan; j++) {
    const x = vx + ((j / fan) * 2 - 1) * w * 0.85;
    fans.push(<line key={j} x1={vx} y1={vy} x2={x.toFixed(1)} y2={h} stroke={color} strokeWidth={1} opacity={0.35} />);
  }
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{position: 'absolute', left: 0, top: 0, opacity}}>
      {fans}
      {rows}
    </svg>
  );
};

/** SynthwaveSet —— synthwave 场景件包：Sun 切缝落日 + Grid 透视网格（各自独立可单用）。 */
export const SynthwaveSet = {
  Sun: SunSlit,
  Grid: PerspectiveGrid,
} as const;
