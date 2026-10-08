import React from 'react';
import {EASE, PAPER, foldLift, midX} from './world';

/**
 * kit.tsx — popup-book 纸艺立体书图元库（纯 CSS transform + SVG，零纹理文件、零 3D 库）。
 *
 * 签名特征 1 —— 纸底与纸纹：牛皮纸渐变页 + feTurbulence 纸纹（SVG data-URI，seed 固定 7，确定性）。
 * 签名特征 2 —— 纸片厚度：多层 box-shadow 软阴影（0 1px 0 / 0 3px 0 / 0 10px 18px）+ 1px 描边，折页视角统一后仰 12°。
 * 签名特征 3 —— 翻折动作：perspective 容器 + rotateX 90°→78° 底缘铰链折起（弹簧过冲），地面投影随折角变宽变深；tab 拉杆同步轻拉。
 * （特征 4 三层视差在 world.ts/Book.tsx；特征 5 拉页转场在 chrome.tsx PageTurn。）
 */

// ---------------------------------------------------------------- 纸纹（feTurbulence，确定性 seed）
const GRAIN_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="384" height="384" viewBox="0 0 384 384">` +
  `<filter id="g" x="0" y="0" width="100%" height="100%">` +
  `<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7" stitchTiles="stitch"/>` +
  `<feColorMatrix type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.11  0 0 0 0 0.06  0 0 0 0.5 -0.16"/>` +
  `</filter><rect width="384" height="384" filter="url(#g)"/></svg>`,
);
/** 全页纸纹覆盖层（打印在页面上，随页面存在；不随相机位移=纸面本身）。 */
export const Grain: React.FC<{opacity?: number; z?: number}> = ({opacity = 0.4, z = 40}) => (
  <div style={{
    position: 'absolute', inset: 0, zIndex: z, pointerEvents: 'none', opacity,
    backgroundImage: `url("data:image/svg+xml,${GRAIN_SVG}")`, backgroundSize: '384px 384px',
    mixBlendMode: 'multiply',
  }} />
);

// ---------------------------------------------------------------- 纸片基础样式（厚度 = 多层 box-shadow + 1px 描边）
export const paperFace = (bg: string = PAPER.surface, extra?: React.CSSProperties): React.CSSProperties => ({
  background: bg,
  border: `1px solid rgba(74,50,34,0.22)`,
  boxShadow: `inset 0 -6px 0 rgba(74,50,34,0.06), 0 1px 0 ${PAPER.sandDark}, 0 3px 0 rgba(74,50,34,0.14), 0 12px 18px -6px ${PAPER.shadow}`,
  ...extra,
});

// ---------------------------------------------------------------- 折起件（签名特征 3：rotateX 底缘铰链 90°→-10°）
/** FoldUp：外层给 perspective，内层底缘铰链折起；lift=0 时侧棱朝观众（不可见），立定时全高微后仰 -10°（立体书视角）。 */
export const FoldUp: React.FC<{
  f: number; t0: number; x: number; y: number; w: number; h: number;
  z?: number; inner?: React.ReactNode; style?: React.CSSProperties;
}> = ({f, t0, x, y, w, h, z = 10, inner, style}) => {
  const lift = foldLift(f, t0);
  if (lift <= 0.001) return null;
  const angle = 90 - 100 * lift; // 90°=平铺侧棱 → -10°=立定微后仰（过冲时短暂 -19.9° 再回弹）
  return (
    <div style={{position: 'absolute', left: midX(x, f), top: y, width: w, height: h, zIndex: z, perspective: 1100, ...style}}>
      <div style={{
        position: 'absolute', inset: 0, transformOrigin: '50% 100%',
        transform: `rotateX(${angle}deg)`, opacity: EASE.clamp01(lift * 6),
        transformStyle: 'preserve-3d',
      }}>{inner}</div>
    </div>
  );
};

/** 地面投影：跟随折角变宽变深（签名特征 3 的影子半边）。x/y 为页面坐标（自动含中景视差）。 */
export const FloorShadow: React.FC<{f: number; t0: number; x: number; y: number; w: number; h?: number; z?: number}> =
({f, t0, x, y, w, h = 16, z = 4}) => {
  const lift = foldLift(f, t0);
  if (lift <= 0.01) return null;
  return (
    <div style={{
      position: 'absolute', left: midX(x - (w * lift - w) / 2, f), top: y - h / 2, width: w * lift, height: h,
      zIndex: z, borderRadius: '50%',
      background: `radial-gradient(closest-side, rgba(74,50,34,${0.26 * Math.min(1, lift)}) , transparent 72%)`,
      filter: 'blur(1px)',
    }} />
  );
};

// ---------------------------------------------------------------- tab 拉杆（立体书机关隐喻：折起时纸 tab 被轻拉出）
export const TabPull: React.FC<{f: number; t0: number; x: number; y: number; w?: number; z?: number; flip?: boolean}> =
({f, t0, x, y, w = 46, z = 6, flip}) => {
  const lift = foldLift(f, t0);
  if (lift <= 0.01) return null;
  const pull = Math.max(0, lift - 1 + 0.55) * 18; // 折到 45% 后开始拉出，最多 ~10px
  return (
    <div style={{
      position: 'absolute', left: midX(x, f) + (flip ? -w - pull : pull), top: y, width: w, height: 15, zIndex: z,
      ...paperFace(PAPER.sand, {borderRadius: '3px 8px 8px 3px'}),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{width: '60%', height: 3, borderRadius: 2, background: `repeating-linear-gradient(90deg, rgba(74,50,34,0.4) 0 5px, transparent 5px 10px)`}} />
    </div>
  );
};

// ---------------------------------------------------------------- 咖啡豆（纸片豆：椭圆纸面 + 中缝折痕，roast 0→1 由生豆烤到深烘）
export const Bean: React.FC<{x: number; y: number; s?: number; rot?: number; roast?: number; z?: number; squash?: number}> =
({x, y, s = 26, rot = 0, roast = 0, z = 12, squash = 0}) => {
  const bg = `linear-gradient(155deg, ${
    mix(PAPER.beanTan, '#e0b98a', 0.25 - 0.1 * roast)}, ${mix(PAPER.beanTan, PAPER.roast, roast)})`;
  const crease = mix('#a97c4e', '#3f2818', roast);
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: s, height: s * 0.72, zIndex: z,
      transform: `rotate(${rot}deg) scale(${1 + squash * 0.18}, ${1 - squash * 0.22})`,
      transformOrigin: '50% 100%',
      borderRadius: '50%',
      background: bg,
      border: `1px solid rgba(74,50,34,${0.3 - 0.08 * roast})`,
      boxShadow: `inset 0 2px 3px rgba(255,244,222,0.5), inset 0 -3px 4px rgba(74,50,34,0.28), 0 2px 4px ${PAPER.shadow}`,
    }}>
      <div style={{position: 'absolute', left: '46%', top: '8%', width: '8%', height: '84%', borderRadius: 4, background: crease, opacity: 0.75, transform: 'rotate(6deg)'}} />
    </div>
  );
};

// ---------------------------------------------------------------- 纸火苗（锯齿纸舌，确定性摇曳）
export const Flame: React.FC<{f: number; x: number; y: number; s?: number; seed?: number; z?: number}> = ({f, x, y, s = 1, seed = 1, z = 8}) => {
  const wob = Math.sin(f / 4.2 + seed * 2.1) * 0.06 + Math.sin(f / 2.3 + seed) * 0.03; // 确定性摇曳
  return (
    <svg width={54 * s} height={86 * s} viewBox="0 0 54 86" style={{position: 'absolute', left: x, top: y, zIndex: z, transform: `scaleX(${1 + wob}) rotate(${wob * 40}deg)`, transformOrigin: '50% 100%'}}>
      <path d="M27 3 C40 22 50 34 50 54 C50 72 40 83 27 83 C14 83 4 72 4 54 C4 34 14 22 27 3 Z"
        fill={PAPER.flame} stroke="rgba(74,50,34,0.28)" strokeWidth={1.5} />
      <path d="M27 30 C33 41 39 47 39 58 C39 69 33 75 27 75 C21 75 15 69 15 58 C15 47 21 41 27 30 Z"
        fill={PAPER.flameDeep} opacity={0.85} />
      <path d="M27 50 C30 56 32 60 32 66 C32 71 30 73 27 73 C24 73 22 71 22 66 C22 60 24 56 27 50 Z"
        fill={PAPER.cream} opacity={0.9} />
    </svg>
  );
};

// ---------------------------------------------------------------- 热气飘带（纸感波浪细带，上升循环；定帧段合法微动效）
export const Steam: React.FC<{f: number; x: number; y: number; seed?: number; s?: number; z?: number; op?: number}> =
({f, x, y, seed = 0, s = 1, z = 30, op = 1}) => {
  const cyc = 2.6; // 一轮上升秒数
  const t = ((f / 30 + seed * 0.9) % cyc) / cyc;
  const rise = -66 * s * t;
  const sway = Math.sin((f / 30 + seed) * 2.4) * 7 * s;
  const o = op * Math.sin(Math.PI * t) * 0.85;
  if (o <= 0.01) return null;
  return (
    <svg width={40 * s} height={70 * s} viewBox="0 0 40 70"
      style={{position: 'absolute', left: x + sway, top: y + rise, zIndex: z, opacity: o}}>
      <path d="M20 66 C10 56 30 48 20 38 C10 28 30 20 20 10 C16 6 14 4 15 1"
        fill="none" stroke={PAPER.cream} strokeWidth={5 * s} strokeLinecap="round" opacity={0.9} />
      <path d="M20 66 C10 56 30 48 20 38 C10 28 30 20 20 10 C16 6 14 4 15 1"
        fill="none" stroke="rgba(74,50,34,0.25)" strokeWidth={1.2} strokeLinecap="round" />
    </svg>
  );
};

// ---------------------------------------------------------------- 水弧（冲煮水柱：沿贝塞尔的描边推进）
export const WaterArc: React.FC<{f: number; from: number; to: number; x0: number; y0: number; x1: number; y1: number; z?: number}> =
({f, from, to, x0, y0, x1, y1, z = 26}) => {
  const t = EASE.clamp01((f - from) / Math.max(1, to - from));
  if (t <= 0 || f > to + 6) return null;
  const fade = f > to ? 1 - (f - to) / 6 : 1;
  const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 26;
  const len = 1.35 * (Math.abs(x1 - x0) + Math.abs(y1 - y0));
  return (
    <svg width={1280} height={720} style={{position: 'absolute', inset: 0, zIndex: z, opacity: fade, pointerEvents: 'none'}}>
      <path d={`M ${x0} ${y0} Q ${mx} ${my} ${x1} ${y1}`} fill="none"
        stroke={PAPER.sky} strokeWidth={7} strokeLinecap="round"
        strokeDasharray={`${len * t} ${len}`} />
      <path d={`M ${x0} ${y0} Q ${mx} ${my} ${x1} ${y1}`} fill="none"
        stroke="rgba(74,50,34,0.3)" strokeWidth={1.2} strokeLinecap="round"
        strokeDasharray={`${len * t} ${len}`} strokeDashoffset={-1.5} />
    </svg>
  );
};

// ---------------------------------------------------------------- 纸胶带（贴角；x 或 right 二选一定位）
export const Tape: React.FC<{x?: number; right?: number; y: number; rot?: number; w?: number; z?: number}> = ({x, right, y, rot = 0, w = 64, z = 20}) => (
  <div style={{
    position: 'absolute', left: x, right, top: y, width: w, height: 20, zIndex: z, background: PAPER.tape,
    boxShadow: '0 1px 2px rgba(74,50,34,0.18)', transform: `rotate(${rot}deg)`, opacity: 0.9,
  }} />
);

// ---------------------------------------------------------------- 工具：hex 混色（确定性，用于烘焙上色等）
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const u = EASE.clamp01(t);
  const ch = (sa: number, sb: number) => Math.round(sa + (sb - sa) * u).toString(16).padStart(2, '0');
  return `#${ch((pa >> 16) & 255, (pb >> 16) & 255)}${ch((pa >> 8) & 255, (pb >> 8) & 255)}${ch(pa & 255, pb & 255)}`;
}
