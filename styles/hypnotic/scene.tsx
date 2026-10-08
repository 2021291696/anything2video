import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {CX, CY, CYA, MAG, CORE, VOID, VOID2, SANS, SERIF, prog, breathDir,
  HypFilters, S05, T_TITLE, T_DIM} from './kit';
import {Eye, slitAlpha} from './eye';
import {Tunnel} from './tunnel';
import {Kaleido} from './kaleido';
import {Moire} from './moire';
import {SUBS} from '../common/subs';

/**
 * 场景合成：虚空底 < 摩尔纹背衬 < 眼（签名①⑤⑥）< 隧道（签名②）< 万花筒（签名③）< 收束心环 < 暗角/收暗 < 字幕/片名。
 * 单一连续世界（无镜头切换硬切）：段间全部 opacity 线性包络，运动全部恒速/线性呼吸（SPEC「闪烁合规」节）。
 */
export const Scene: React.FC = () => {
  const f = useCurrentFrame() + 1; // 全局帧（1 起含端点）
  const mandala = prog(f, S05, 20); // 收束心环淡入
  const bd = breathDir(f);
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse 900px 640px at ${CX}px ${CY}px, ${VOID2} 0%, ${VOID} 46%, #04020a 100%)`}}>
      {/* 钩子光缝（HTML 层，f1-16） */}
      <Slit f={f} />
      <svg width={1280} height={720} viewBox="0 0 1280 720" style={{position: 'absolute', inset: 0}}>
        <Moire f={f} boost={mandala} />
        <Eye f={f} />
        <Tunnel f={f} />
        <Kaleido f={f} />
        {/* 收束心环：曼陀罗定帧核心（呼吸微缩放） */}
        {mandala > 0.01 ? (
          <g opacity={mandala} filter="url(#hyp-glow)">
            {[34, 58, 86, 118].map((r, k) => (
              <circle key={k} cx={CX} cy={CY}
                r={r * (1 + 0.04 * bd)} fill="none"
                stroke={k % 2 ? CYA : MAG} strokeWidth={2} opacity={0.85 - k * 0.15} />
            ))}
          </g>
        ) : null}
      </svg>
      <Post f={f} />
      <Captions f={f} />
      <EndTitle f={f} />
    </AbsoluteFill>
  );
};

/** 钩子光缝：黑暗中的水平光缝 scaleX 张开（签名①前置，0.5s 内首环收缩已由 Eye f10 保证） */
const Slit: React.FC<{f: number}> = ({f}) => {
  const a = slitAlpha(f);
  if (a <= 0.01) return null;
  return (
    <div style={{position: 'absolute', left: CX - 300, top: CY - 1.5, width: 600, height: 3,
      transform: `scaleX(${prog(f, 1, 6).toFixed(3)})`,
      background: 'linear-gradient(90deg, transparent, #FFFFFF 18%, #FFD9EC 50%, #FFFFFF 82%, transparent)',
      boxShadow: '0 0 16px 4px rgba(255,62,157,0.55), 0 0 40px 10px rgba(46,230,255,0.25)',
      opacity: a}} />
  );
};

/** 后期：暗角 + 收暗（无闪帧、无色差抖动——本卡后期纪律：只做单调/亚 0.3Hz 调制） */
const Post: React.FC<{f: number}> = ({f}) => {
  const dim = prog(f, T_DIM, 4) * 0.35;
  return (
    <>
      <div style={{position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 860px 600px at 640px 360px, transparent 52%, rgba(3,1,9,0.62) 100%)'}} />
      {dim > 0 ? <div style={{position: 'absolute', inset: 0, background: '#02010a', opacity: dim}} /> : null}
    </>
  );
};

/** 字幕行（底部居中，细字重宽字距+柔辉光；来自 tts_build 生成的 SUBS） */
const Captions: React.FC<{f: number}> = ({f}) => {
  const sub = SUBS.find((s) => f >= s.from - 4 && f <= s.to + 5);
  if (!sub) return null;
  const a = prog(f, sub.from - 4, 6) * (1 - prog(f, sub.to, 5));
  if (a <= 0.01) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 40, display: 'flex', justifyContent: 'center',
      pointerEvents: 'none', zIndex: 20}}>
      <div style={{fontFamily: SANS, fontWeight: 300, fontSize: 22, letterSpacing: 6, color: '#F2EAFF',
        opacity: a * 0.94, textShadow: '0 0 12px rgba(255,62,157,0.4), 0 0 28px rgba(46,230,255,0.28), 0 2px 10px rgba(0,0,0,0.8)'}}>
        {sub.text}
      </div>
    </div>
  );
};

/** 片名卡：定帧段淡入「向内的一瞥」（OFL Noto Serif SC）+ EN 副行；底部渐变 scrim 保证字面对比 */
const EndTitle: React.FC<{f: number}> = ({f}) => {
  const a = prog(f, T_TITLE, 12);
  if (a <= 0.01) return null;
  return (
    <>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 190, pointerEvents: 'none', zIndex: 20,
        background: 'linear-gradient(180deg, rgba(4,2,10,0) 0%, rgba(4,2,10,0.66) 62%, rgba(4,2,10,0.8) 100%)', opacity: a}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 588, display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 9, pointerEvents: 'none', zIndex: 21, opacity: a}}>
        <div style={{fontFamily: SERIF, fontWeight: 600, fontSize: 36, letterSpacing: 14, textIndent: 14, color: '#FFF6FB',
          textShadow: `0 0 18px ${MAG}77, 0 0 42px ${CYA}44, 0 2px 12px rgba(0,0,0,0.9)`}}>
          向内的一瞥
        </div>
        <div style={{fontFamily: SANS, fontWeight: 300, fontSize: 11, letterSpacing: 7, textIndent: 7,
          color: CORE, opacity: 0.6, textShadow: '0 1px 8px rgba(0,0,0,0.9)'}}>A GLIMPSE INWARD</div>
      </div>
    </>
  );
};
