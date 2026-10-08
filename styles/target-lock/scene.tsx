import React from 'react';
import {CHK, CYA, DIM, flick, FrameCorners, HexGrid, prog, Tape, TopBar, T_END_HOLD, W, H} from './kit';
import {SUBS} from '../common/subs';
import {HoloGlobe, ScopeRing, SweepConic} from './scope';
import {LeftCol, RightCol} from './columns';
import {AcquireReticle, LockBanner, LockBrackets, SweepBlips} from './acquire';

/**
 * 场景合成：HUD 世界唯一真相（cyan 版）。Main 用同内容渲染两份做告警再上墨波（青→橙红）。
 * z 序：六边形网格底 < 全息地球 < 雷达余辉 < HUD SVG < 定帧字幕行。
 */

export const Scene: React.FC<{f: number}> = ({f}) => (
  <>
    <HexGrid f={f} />
    <HoloGlobe f={f} />
    <SweepConic f={f} />
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
      <FrameCorners f={f} />
      <TopBar f={f} />
      <LeftCol f={f} />
      <RightCol f={f} />
      <Tape f={f} />
      <ScopeRing f={f} />
      <SweepBlips f={f} />
      <AcquireReticle f={f} />
      <LockBrackets f={f} />
      <LockBanner f={f} />
    </svg>
    <Captions f={f} />
  </>
);

/** 底部字幕行（HUD 内联式：小型 Chakra 轨道读出风格，非 explainer 字幕带） */
const Captions: React.FC<{f: number}> = ({f}) => {
  const sub = SUBS.find((s) => f >= s.from - 2 && f <= s.to + 3);
  if (!sub) return null;
  const a = flick(f, sub.from - 2) * (1 - prog(f, sub.to + 1, 3));
  if (a <= 0.01) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 5, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 20}}>
      <div style={{fontFamily: CHK, fontWeight: 600, fontSize: 14, letterSpacing: 3, color: CYA, opacity: a * 0.92,
        background: 'rgba(2,10,13,0.66)', padding: '3px 14px', border: '1px solid rgba(11,124,140,0.55)'}}>
        {sub.text}
      </div>
    </div>
  );
};

/** 白热冲击帧 + 微 glitch 带 + 收暗（后处理 overlay 族；帧级 seeded，QC 豁免档登记） */
export const GLITCH_FRAMES = [2, 3, 150, 151, 242, 243, 292];
export const Post: React.FC<{f: number}> = ({f}) => {
  const flash = f === 242 ? 0.2 : f === 150 ? 0.08 : 0;
  const glitch = GLITCH_FRAMES.includes(f);
  const dim = prog(f, 379, 6) * 0.35;
  return (
    <>
      {flash > 0 ? <div style={{position: 'absolute', inset: 0, background: '#EAF9FF', opacity: flash, zIndex: 40}} /> : null}
      {glitch ? (
        <div style={{position: 'absolute', inset: 0, zIndex: 41, pointerEvents: 'none'}}>
          {[0, 1, 2].map((i) => {
            const y = Math.floor(40 + 640 * ((Math.sin(f * 13.7 + i * 7.1) + 1) / 2));
            const h = 2 + i * 2;
            return <div key={i} style={{position: 'absolute', left: 0, right: 0, top: y, height: h,
              background: i === 1 ? 'rgba(232,254,255,0.07)' : 'rgba(2,10,13,0.5)', mixBlendMode: i === 1 ? 'screen' : 'normal'}} />;
          })}
        </div>
      ) : null}
      {/* 扫描线 + 滚动干扰带 + vignette（统一质感层） */}
      <div style={{position: 'absolute', inset: 0, zIndex: 42, pointerEvents: 'none',
        background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.16) 0px, rgba(0,0,0,0.16) 1px, transparent 1px, transparent 3px)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, height: 90, top: -90 + ((f * 4.2) % (H + 180)), zIndex: 43, pointerEvents: 'none',
        background: 'linear-gradient(180deg, transparent, rgba(120,220,235,0.045), transparent)'}} />
      <div style={{position: 'absolute', inset: 0, zIndex: 44, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(0,4,6,0.55) 100%)'}} />
      {f >= T_END_HOLD ? <FreezeBadge f={f} /> : null}
      {dim > 0 ? <div style={{position: 'absolute', inset: 0, background: '#000', opacity: dim, zIndex: 46}} /> : null}
    </>
  );
};

/** 定帧段角标：TRACKING 呼吸徽记（微动效证据件） */
const FreezeBadge: React.FC<{f: number}> = ({f}) => {
  const a = flick(f, 345);
  const br = 0.7 + 0.3 * Math.sin(f / 9);
  return (
    <div style={{position: 'absolute', right: 30, top: 76, zIndex: 45, display: 'flex', alignItems: 'center', gap: 7,
      opacity: a, border: '1px solid rgba(0,229,255,0.5)', padding: '3px 9px', background: 'rgba(2,10,13,0.6)'}}>
      <span style={{width: 7, height: 7, borderRadius: 7, background: '#2BD96B', opacity: br, display: 'inline-block'}} />
      <span style={{fontFamily: CHK, fontWeight: 600, fontSize: 10, letterSpacing: 2, color: CYA}}>TRACKING · NEO-2031</span>
      <span style={{fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: 10, color: DIM}}>{`0.38 AU`}</span>
    </div>
  );
};
