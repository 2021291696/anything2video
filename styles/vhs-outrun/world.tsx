// vhs-outrun 连续世界层：天空/日落/网格/雾光地平线/公路元素装配合——全片一镜（公路兜风），
// 场景推进只由时基（timeline.sceneTime）驱动，镜头 beat 只在 Main 加叠层（标题/前灯/HUD/闪光）。
import React from 'react';
import {W, H} from '../common';
import {PK, HORIZON, GridFloor, StripedSun, Sky, ChromeText} from './kit';
import {PalmField, ReflectorPosts, LightBand, SpeedLines} from './roadside';
import {sceneTime, speed} from './timeline';

export const World: React.FC<{f: number}> = ({f}) => {
  const t = sceneTime(f);
  const sp = speed(t);
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
      <Sky f={f} />
      <StripedSun f={f} />
      {/* 网格地平线（CSS 3D 平面） */}
      <GridFloor f={f} />
      {/* 地平线雾光：暗紫压脚 + 热线（白粉 2px + 双层辉光） */}
      <div style={{position: 'absolute', left: 0, top: HORIZON, width: W, height: 130, zIndex: 3,
        background: `linear-gradient(180deg, rgba(26,11,61,0.92) 0px, rgba(46,16,84,0.55) 34px, rgba(61,20,102,0.0) 110px)`}} />
      <div style={{position: 'absolute', left: 0, top: HORIZON - 2, width: W, height: 3, zIndex: 7,
        background: 'linear-gradient(90deg, rgba(255,150,200,0.2), rgba(255,235,245,0.95) 30%, rgba(255,235,245,0.95) 70%, rgba(255,150,200,0.2))',
        boxShadow: '0 0 4px rgba(255,220,240,0.9), 0 0 30px rgba(255,95,168,0.5)'}} />
      {/* 公路元素：反光柱 < 棕榈 < 路灯光带/速度线 */}
      <ReflectorPosts f={f} />
      <PalmField f={f} />
      <LightBand f={f} />
      <SpeedLines f={f} />
    </div>
  );
};

// ---- S02 点火前灯（f31-52：双青白光团 + 湿路反射拉丝，随镜头推进淡出）----
export const Headlights: React.FC<{f: number}> = ({f}) => {
  const fr = f - 1;
  if (fr < 31 || fr > 56) return null;
  const u = (fr - 31) / 25;
  const a = Math.sin(Math.min(u * 1.25, 1) * Math.PI) * 0.85;
  const flare = (cx: number) => (
    <div key={cx} style={{position: 'absolute', left: cx - 60, top: 596 - 60, width: 120, height: 120,
      background: 'radial-gradient(closest-side, rgba(235,255,255,0.95), rgba(35,229,229,0.5) 42%, transparent 70%)',
      opacity: a.toFixed(3), mixBlendMode: 'screen'}} />
  );
  return (
    <div style={{position: 'absolute', inset: 0, zIndex: 8, pointerEvents: 'none'}}>
      {flare(586)}
      {flare(694)}
      <div style={{position: 'absolute', left: 640 - 150, top: 640, width: 300, height: 70,
        background: 'linear-gradient(180deg, rgba(35,229,229,0.55), transparent 85%)',
        opacity: (a * 0.7).toFixed(3), mixBlendMode: 'screen', clipPath: 'polygon(18% 0, 82% 0, 100% 100%, 0 100%)'}} />
    </div>
  );
};

// ---- 湿路速度反射丝（品红尾迹，HERO 段路心）----
export const RoadGlow: React.FC<{f: number}> = ({f}) => {
  const t = sceneTime(f);
  const sp = speed(t);
  const k = Math.min(Math.max((sp - 60) / 18, 0), 1);
  if (k <= 0.02) return null;
  const wob = Math.sin(t * 7.1) * 14;
  return (
    <div style={{position: 'absolute', left: 640 - 26 + wob * 0.3, top: HORIZON + 8, width: 52, height: H - HORIZON - 8, zIndex: 4,
      background: `linear-gradient(180deg, rgba(255,120,90,${(0.30 * k).toFixed(3)}), rgba(255,45,149,${(0.16 * k).toFixed(3)}) 55%, transparent 96%)`,
      filter: 'blur(6px)', mixBlendMode: 'screen', transform: `skewX(${(wob * 0.06).toFixed(2)}deg)`}} />
  );
};

// ---- 镀铬标题装配（f3 拍入 + 两道星光掠过；常驻全片）----
export const TITLE = '午夜 1986';
export const ChromeTitle: React.FC<{f: number; children: string}> = React.memo(function ChromeTitle({f, children}) {
  const fr = f - 1;
  // 拍入：f3-8 scale 1.30→1 + 微 blur 收敛（easeInQuad 加速落定）
  const u = Math.min(Math.max((fr - 3) / 5, 0), 1);
  const sc = 1.3 - 0.3 * u * u;
  const op = fr < 3 ? 0 : 0.25 + 0.75 * Math.min(u * 2, 1);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 96, zIndex: 20, textAlign: 'center',
      opacity: op.toFixed(3), transform: `scale(${sc.toFixed(4)})`, transformOrigin: '50% 50%',
      filter: u < 1 ? `blur(${((1 - u) * 6).toFixed(1)}px)` : undefined}}>
      <ChromeTitleInner f={f}>{children}</ChromeTitleInner>
      <div style={{marginTop: 2, fontFamily: 'Audiowide, sans-serif', fontSize: 17, letterSpacing: 8, color: PK.cyan,
        textShadow: '0 0 4px rgba(35,229,229,0.8), 2px 2px 0 rgba(0,0,0,0.8)', opacity: 0.92}}>M I D N I G H T &nbsp; D R I V E</div>
    </div>
  );
});
const ChromeTitleInner: React.FC<{f: number; children: string}> = ({f, children}) => (
  // 首道星光掠过在 S02（f100-114），第二道在 HERO（f252-266）
  <ChromeText f={f} size={88} glint={f < 130 ? [100, 114] : [252, 266]}>{children}</ChromeText>
);
