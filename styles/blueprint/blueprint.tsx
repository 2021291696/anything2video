import React from 'react';

/**
 * 工程蓝图图元库（blueprint-bridge 专用，主脚本维护）。
 * 深蓝晒图底 + 网格 + 白色工程线（实线/虚线）+ 标注尺寸线 + 图框标题栏。
 * 镜头组件 N = useCurrentFrame() + F0（F0 = ShotDef.from）。
 */
export const BP = {
  bg0: '#0d2a4a', bg1: '#123a63', line: '#d7e8ff', dim: '#7fa8d9',
  accent: '#ffd23f', grid: 'rgba(160,200,255,.10)',
};

/** 晒图底 + 网格 + 图框（挂 Main 或场景首层） */
export const BPGrid: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0,
    background: `
      repeating-linear-gradient(0deg, ${BP.grid} 0 1px, transparent 1px 40px),
      repeating-linear-gradient(90deg, ${BP.grid} 0 1px, transparent 1px 40px),
      radial-gradient(ellipse 80% 70% at 50% 45%, ${BP.bg1}, ${BP.bg0} 88%)`,
  }}>
    <div style={{position: 'absolute', inset: 16, border: `2px solid rgba(215,232,255,.5)`}} />
    <div style={{position: 'absolute', right: 30, top: 28, fontFamily: `'Exo 2','Orbitron',sans-serif`,
      fontSize: 15, letterSpacing: 4, color: 'rgba(215,232,255,.55)'}}>BLUEPRINT NO. 250-2026 · SCALE 1:200</div>
  </div>
);

/** 全局收尾：晒图褪色暗角（挂 Main） */
export const BPPost: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0, pointerEvents: 'none',
    background: 'radial-gradient(ellipse 95% 88% at 50% 46%, transparent 62%, rgba(2,14,30,.5) 100%)',
  }} />
);

/** 幕包装：淡入淡出 */
export const BPScene: React.FC<{N: number; f0: number; end: number; children: React.ReactNode}> = ({N, f0, end, children}) => {
  const inOp = clamp((N - f0) / 12);
  const outOp = 1 - clamp((N - (end - 14)) / 14);
  return <div style={{position: 'absolute', inset: 0, opacity: Math.min(inOp, outOp)}}>{children}</div>;
};

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (t: number) => 1 - Math.pow(1 - clamp(t), 1.6);

/** 工程线：画入（len 帧），dashed=true 时为虚线（隐藏结构） */
export const BPLine: React.FC<{
  d: string; N: number; f0: number; len?: number; w?: number; color?: string; dashed?: boolean; opacity?: number; delay?: number;
}> = ({d, N, f0, len = 24, w = 5, color = BP.line, dashed = false, opacity = 0.95, delay = 0}) => {
  const t = ease(clamp((N - f0 - delay) / len));
  if (t <= 0) return null;
  return (
    <svg width={1280} height={720} viewBox="0 0 1280 720" style={{position: 'absolute', left: 0, top: 0, opacity: opacity * t}}>
      <path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round"
        strokeDasharray={dashed ? '18 12' : `${2000}`} strokeDashoffset={dashed ? 0 : 2000 * (1 - t)} />
    </svg>
  );
};

/** 尺寸标注线：两端箭头 + 中间数字，工程图签名元素 */
export const BPDim: React.FC<{
  x0: number; y0: number; x1: number; y1: number; label: string; N: number; f0: number; color?: string;
}> = ({x0, y0, x1, y1, label, N, f0, color = BP.accent}) => {
  const t = ease(clamp((N - f0) / 18));
  if (t <= 0) return null;
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  return (
    <svg width={1280} height={720} viewBox="0 0 1280 720" style={{position: 'absolute', left: 0, top: 0, opacity: t}}>
      <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={color} strokeWidth={2.5} />
      <circle cx={x0} cy={y0} r={4} fill={color} />
      <circle cx={x1} cy={y1} r={4} fill={color} />
      <text x={mx} y={my - 10} textAnchor="middle" fill={color} fontSize={24}
        fontFamily={`'Exo 2','Noto Sans SC',sans-serif`} fontWeight={700}>{label}</text>
    </svg>
  );
};

/** 蓝图字（Exo2 大写 + 字距） */
export const BPText: React.FC<{
  text: string; N: number; f0: number; x?: number; y?: number; size?: number; color?: string; spacing?: number; opacity?: number;
}> = ({text, N, f0, x = 640, y = 200, size = 60, color = BP.line, spacing = 8, opacity = 0.96}) => {
  const t = ease(clamp((N - f0) / 16));
  if (t <= 0) return null;
  return (
    <div style={{
      position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%)', opacity: t * opacity,
      fontFamily: `'Exo 2','Orbitron',sans-serif`, fontWeight: 700, fontSize: size, color,
      letterSpacing: spacing, whiteSpace: 'nowrap',
    }}>{text}</div>
  );
};

/** 图标骨架：Iconify ds 白线描边画入（draw-on）。骨架来源与许可见 src/icons.ts。 */
export const BPIcon: React.FC<{
  ds: string[]; viewBox?: string; N: number; f0: number; x: number; y: number; size: number;
  len?: number; color?: string; opacity?: number; rotate?: number; w?: number;
}> = ({ds, viewBox = '0 0 24 24', N, f0, x, y, size, len = 26, color = BP.line, opacity = 0.95, rotate = 0, w}) => {
  const t = ease(clamp((N - f0) / len));
  if (t <= 0) return null;
  const [vx, vy, vw, vh] = viewBox.split(/\s+/).map(Number);
  const scale = size / Math.max(vw, vh);
  const sw = w ?? Math.max(vw, vh) / 40;
  return (
    <svg width={1280} height={720} viewBox="0 0 1280 720" style={{position: 'absolute', left: 0, top: 0, opacity: opacity * t}}>
      <g transform={`translate(${(x - size / 2).toFixed(1)} ${(y - size / 2).toFixed(1)}) rotate(${rotate} ${size / 2} ${size / 2})`}>
        <g transform={`scale(${scale.toFixed(4)}) translate(${(-vx).toFixed(2)} ${(-vy).toFixed(2)})`}>
          <g fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
            {ds.map((d, i) => (
              <path key={i} d={d} pathLength={1} strokeDasharray={1}
                strokeDashoffset={1 - clamp(t * ds.length - i * 0.55)} />
            ))}
          </g>
        </g>
      </g>
    </svg>
  );
};
