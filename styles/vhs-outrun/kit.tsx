// vhs-outrun 风格 kit：锁死 token + 一点透视滚动网格 GridFloor + 条纹切缝日落 StripedSun
// + 镀铬金属字 ChromeText + 透视投影 project + 双层辉光 glow2。纯 DOM/CSS/SVG，无 WebGL。
// 技法借鉴 mg-styles-15 demos/10-synthwave (MIT, Vincentwei1021)，TSX 重写。
import React from 'react';
import {W, H, FONT_HEAVY} from '../common';
import {hash1, sceneTime, sunLift, glowPump, zAt} from './timeline';

// ---- 锁死 token（SPEC 写死）----
export const PK = {
  bgTop: '#1a0b3d',        // 紫底渐变顶
  bgBot: '#3d1466',        // 紫底渐变底
  pink: '#ff2d95',         // 品红（网格线/辉光主色）
  cyan: '#23e5e5',         // 青（反光柱/描边辅色）
  sunPink: '#ff3d8f',      // 日落带底（品红）
  sunOrange: '#ff6547',    // 日落带中（橙）
  sunGold: '#ffd75c',      // 日落带顶（黄）
  haze: '#ff5fa8',         // 地平线雾光
  chromeLight: '#f2f9ff',  // 镀铬高光
  chromeDark: '#2c3a4d',   // 镀铬暗带
  ink: '#12062a',          // 剪影深色
};
/** 地平线 y（移轴：垂线保持垂直，整体下移让天空占比更大） */
export const HORIZON = H / 2 + 46; // 406
/** 透视焦距（FOV≈50° 等效，垂直像素） */
export const FPX = (H / 2) / Math.tan((50 / 2) * Math.PI / 180); // ≈772
/** 相机离地高（世界单位） */
export const CAM_H = 1.7;

/** 双层辉光（SPEC 锁死：内 4px 高亮 + 外 30px 低透明） */
export const glow2 = (inner: string, outer: string, pump = 0): React.CSSProperties => ({
  filter: `drop-shadow(0 0 4px ${inner}) drop-shadow(0 0 30px ${outer})`,
  // pump>0 时由调用方叠加第二层 halo 元素，不在 filter 里叠第三层
  ...(pump > 0 ? {} : {}),
});

/** 透视投影：世界 (x, zAhead) → 屏幕像素。zAhead=物体在前方距离（世界单位）。 */
export function project(worldX: number, zAhead: number): {x: number; k: number; groundY: number} {
  const z = Math.max(zAhead, 2.2);
  const k = FPX / z;
  return {x: W / 2 + worldX * k, k, groundY: HORIZON + CAM_H * k};
}

// ---- GridFloor：CSS 3D rotateX 平面 + repeating gradient + background-position 滚动 ----
const CELL = 128; // 网格世界间距（平面局部 px）
export const GridFloor: React.FC<{f: number}> = ({f}) => {
  const t = sceneTime(f);
  const travel = -zAt(t); // 正向推进距离
  const off = travel % CELL;
  // 线条能量随车速微增（全速段网格更亮）
  const boost = 1 + 0.18 * Math.min(Math.max((-zAt(t + 0.05) + zAt(t)) / 0.05 / 78, 0), 1);
  const core = (a: number) => `rgba(255,45,149,${(a * boost).toFixed(3)})`;
  const soft = (a: number) => `rgba(255,45,149,${(a * boost).toFixed(3)})`;
  // 双层：glow 层（宽软线，充当 30px 低透明辉光的廉价替身）+ core 层（锐线=4px 高亮）
  const layers: Array<{bg: string; blur: number; op: number}> = [
    {
      // 软辉光层：14px 渐隐线（远近都读作 glow）
      bg: `repeating-linear-gradient(90deg, ${soft(0.38)} 0px, ${soft(0.12)} 7px, transparent 16px, transparent ${CELL}px),
           repeating-linear-gradient(0deg, ${soft(0.38)} 0px, ${soft(0.12)} 7px, transparent 16px, transparent ${CELL}px)`,
      blur: 0, op: 1,
    },
    {
      // 锐核心层：4px 亮线 + 1px 渐隐缘
      bg: `repeating-linear-gradient(90deg, ${core(0.95)} 0px, ${core(0.55)} 3px, ${core(0.18)} 4px, transparent 5px, transparent ${CELL}px),
           repeating-linear-gradient(0deg, ${core(0.95)} 0px, ${core(0.55)} 3px, ${core(0.18)} 4px, transparent 5px, transparent ${CELL}px)`,
      blur: 0, op: 1,
    },
  ];
  return (
    <div style={{position: 'absolute', left: 0, top: HORIZON, width: W, height: 0, perspective: 470, perspectiveOrigin: '50% 0%', zIndex: 3}}>
      {layers.map((L, i) => (
        <div key={i} style={{
          position: 'absolute', left: '50%', top: 0, width: 4800, height: 3200, marginLeft: -2400,
          transformOrigin: '50% 0%', transform: 'rotateX(76.5deg)',
          backgroundImage: L.bg, backgroundSize: `${CELL}px ${CELL}px`,
          backgroundPosition: `0px ${off.toFixed(2)}px`, opacity: L.op,
        }} />
      ))}
    </div>
  );
};

// ---- StripedSun：条纹日落球（水平切带，缝宽 2+q²·16 px、0.9/s 上移；HERO 整球上移+缝相加速）----
const SUN_R = 118;
const BAND_PITCH = 22; // 切带间距 px
export const StripedSun: React.FC<{f: number}> = ({f}) => {
  const t = sceneTime(f);
  const lift = sunLift(f);
  const pump = glowPump(f);
  const cy = HORIZON - SUN_R - 14 + lift;
  // 缝相位：0.9/s 上移（HERO 泵期间 +1.3/s 追加，切缝上移强化）
  const phase = (t * 0.9 + pump * 1.3) * BAND_PITCH;
  const D = SUN_R * 2;
  const spanTop = D * 0.31; // 缝只出现在下部 69%（q∈[0,1]）
  const gaps: Array<{y: number; h: number}> = [];
  for (let i = 0; i < 14; i++) {
    const base = spanTop + (i * BAND_PITCH * 1.06) % (D - spanTop);
    const y = spanTop + (((base - spanTop - phase) % (D - spanTop)) + (D - spanTop)) % (D - spanTop);
    const q = (y - spanTop) / (D - spanTop);
    gaps.push({y, h: 2 + q * q * 16}); // SPEC 锁死：缝宽 2+q²·16
  }
  const gid = `sungrad-${f >= 250 ? 'h' : 'n'}`;
  return (
    <div style={{position: 'absolute', left: W / 2 - SUN_R, top: cy, width: D, height: D, zIndex: 2}}>
      {/* 外圈 30px 低透明辉光 halo（pump 期间增亮） */}
      <div style={{position: 'absolute', left: -D * 0.42, top: -D * 0.42, width: D * 1.84, height: D * 1.84,
        background: `radial-gradient(closest-side, rgba(255,61,143,${(0.34 + pump * 0.22).toFixed(3)}), rgba(255,45,149,0.10) 62%, transparent 74%)`}} />
      <svg width={D} height={D} style={{
        display: 'block',
        filter: `drop-shadow(0 0 4px rgba(255,235,190,${(0.6 + pump * 0.3).toFixed(2)})) drop-shadow(0 0 30px rgba(255,61,143,${(0.35 + pump * 0.3).toFixed(2)}))`,
      }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff7c0" />
            <stop offset="0.16" stopColor={PK.sunGold} />
            <stop offset="0.42" stopColor="#ff9e38" />
            <stop offset="0.64" stopColor={PK.sunOrange} />
            <stop offset="1" stopColor={PK.sunPink} />
          </linearGradient>
          <mask id={`sunmask-${f >= 250 ? 'h' : 'n'}`}>
            <rect width={D} height={D} fill="#fff" />
            {gaps.map((g, i) => <rect key={i} x={-2} width={D + 4} y={g.y} height={g.h} fill="#000" />)}
          </mask>
        </defs>
        <circle cx={SUN_R} cy={SUN_R} r={SUN_R} fill={`url(#${gid})`} mask={`url(#sunmask-${f >= 250 ? 'h' : 'n'})`} />
      </svg>
    </div>
  );
};

// ---- ChromeText：镀铬金属字（多层 background-clip:text 渐变 + 星光掠过 + 双层辉光）----
export const ChromeText: React.FC<{
  f: number; size: number; glint?: [number, number]; style?: React.CSSProperties; children: string;
}> = ({f, size, glint, style, children}) => {
  const [g0, g1] = glint ?? [-99, -98];
  const u = (f - g0) / Math.max(g1 - g0, 1);
  const sweeping = u >= 0 && u <= 1;
  const pos = -160 + u * 420;
  return (
    <div style={{position: 'relative', display: 'inline-block', ...style}}>
      <span style={{
        fontFamily: FONT_HEAVY, fontWeight: 900, fontSize: size, letterSpacing: 2, whiteSpace: 'nowrap',
        transform: 'skewX(-7deg)',
        backgroundImage: `linear-gradient(180deg, ${PK.chromeLight} 0%, #cfe2f4 16%, #8fa3b8 30%, #e9f4ff 44%, #ffffff 50%, #64788d 60%, ${PK.chromeDark} 74%, #9db2c6 88%, ${PK.chromeLight} 100%)`,
        WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        filter: 'drop-shadow(0 0 4px rgba(200,240,255,0.5)) drop-shadow(0 0 30px rgba(255,45,149,0.30))',
      }}>{children}</span>
      {sweeping ? (
        <span style={{
          position: 'absolute', inset: 0, fontFamily: FONT_HEAVY, fontWeight: 900, fontSize: size, letterSpacing: 2,
          whiteSpace: 'nowrap', transform: 'skewX(-7deg)', pointerEvents: 'none',
          backgroundImage: `linear-gradient(100deg, transparent 40%, rgba(255,255,255,0.95) 50%, transparent 60%)`,
          backgroundSize: '260% 100%', backgroundPosition: `${pos.toFixed(1)}% 0%`,
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        }}>{children}</span>
      ) : null}
    </div>
  );
};

// ---- 天空 + 星点（紫底渐变锁死 token + seeded 星）----
export const Sky: React.FC<{f: number}> = ({f}) => {
  const t = sceneTime(f);
  const stars: Array<{x: number; y: number; s: number; ph: number}> = [];
  for (let i = 0; i < 46; i++) {
    stars.push({x: hash1(i * 7.31 + 1) * W, y: hash1(i * 3.77 + 2) * (HORIZON - 40), s: 1 + hash1(i * 9.13 + 3) * 1.6, ph: hash1(i * 5.19 + 4) * 6.28});
  }
  return (
    <div style={{position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${PK.bgTop} 0%, #241045 42%, ${PK.bgBot} 72%, #551a67 88%, #7a2168 100%)`}} />
      {stars.map((s, i) => {
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.9 + s.ph));
        return <div key={i} style={{position: 'absolute', left: s.x, top: s.y, width: s.s, height: s.s,
          borderRadius: '50%', background: '#e8e2ff', opacity: (tw * 0.8).toFixed(3)}} />;
      })}
      {/* 地平线上方品红雾带 */}
      <div style={{position: 'absolute', left: 0, top: HORIZON - 120, width: W, height: 120,
        background: `linear-gradient(180deg, transparent 0%, rgba(255,45,149,0.10) 55%, rgba(255,95,168,0.30) 100%)`}} />
    </div>
  );
};
