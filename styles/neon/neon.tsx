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
