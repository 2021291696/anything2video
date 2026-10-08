import React from 'react';
import {SUBS} from '../common/subs';
import {camPan, LAYER_SPEED, STOX, STOY, U, C30, S30, EASE} from './world';
import {CLAY, shade} from './kit';

/**
 * chrome.tsx — clay-town 镜头覆盖层件（全部接收绝对帧号 f，镜头组件传 Sequence.from+n）：
 * 标题锁排 / 双层标注（白话标签+真实术语小标签，签名特征 6）/ 字幕丸 / 收束卡。
 * 站点局部坐标经 midScreen() 随中景视差（0.8×）对位。
 */

/** 中景层世界格 → 当前屏幕坐标（含相机视差偏移）。 */
export const midScreen = (st: 'A' | 'B' | 'C', u: number, v: number, y = 0, f = 0) => ({
  x: STOX[st] + (u - v) * C30 * U - camPan(f) * LAYER_SPEED.mid,
  y: STOY + (u + v) * S30 * U - y * U,
});

const springPop = (f: number, f0: number) => Math.max(0.0001, EASE.spring((f - f0) / 30, 20, 0.5, 6));
/** 钩子专用快弹（w24：f0+9 帧≈90%）。 */
const fastPop = (f: number, f0: number) => Math.max(0.0001, EASE.spring((f - f0) / 30, 24, 0.55, 8));

// ---------------------------------------------------------------- 标题锁排（SC01 钩子 f3 弹入 → f58-80 缩小停靠左上常驻）
export const TitleLockup: React.FC<{f: number}> = ({f}) => {
  const pop = fastPop(f, 3);
  const dock = EASE.easeInOutPow(EASE.clamp01((f - 58) / 22), 2.4);
  const cx = 640 + (168 - 640) * dock;
  const cy = 108 + (46 - 108) * dock;
  const scale = (1 - 0.5 * dock) * pop;
  return (
    <div style={{position: 'absolute', left: cx, top: cy, transform: `translate(-50%,-50%) scale(${scale})`, opacity: Math.min(pop, 1), zIndex: 90, display: 'flex', alignItems: 'center', gap: 14}}>
      {/* 迷你水滴徽标 */}
      <svg width={44} height={50} viewBox="0 0 36 42" style={{transform: `rotate(${Math.sin(f / 9) * 4}deg)`}}>
        <path d="M18 2 C18 2 5.5 19.5 5.5 28 a12.5 12.5 0 0 0 25 0 C30.5 19.5 18 2 18 2 Z" fill={CLAY.water} stroke={shade(CLAY.waterD, 0.92)} strokeWidth="1.6" />
        <ellipse cx="12" cy="25" rx="3.2" ry="4.4" fill="rgba(255,255,255,0.6)" transform="rotate(-18 12 25)" />
      </svg>
      <div>
        <div style={{fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 900, fontSize: 44, letterSpacing: 2, color: CLAY.cocoa, transform: 'scaleX(0.97)', lineHeight: 1.15, whiteSpace: 'nowrap'}}>
          自来水是怎么到你家的
        </div>
        <div style={{marginTop: 3, fontFamily: 'Audiowide, sans-serif', fontSize: 12, letterSpacing: 4, color: '#B08968', opacity: 1 - dock, whiteSpace: 'nowrap'}}>A2V · CLAY TOWN · 黏土小城</div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- 双层标注（签名特征 6：白话标签 + 真实术语小标签；茎线钉画面比喻物）
export const DualLabel: React.FC<{f: number; f0: number; plain: string; term: string; st: 'A' | 'B' | 'C'; u: number; v: number; y?: number; dy?: number; dx?: number}> =
({f, f0, plain, term, st, u, v, y = 0, dy = 0, dx = 0}) => {
  const pop = springPop(f, f0);
  if (pop <= 0.001) return null;
  const p = midScreen(st, u, v, y, f);
  return (
    <div style={{position: 'absolute', left: p.x + dx, top: p.y + dy, transform: `translate(-50%,-100%) scale(${Math.min(pop, 1.06)})`, transformOrigin: '50% 100%', zIndex: 80}}>
      {/* 茎线（钉到比喻物） */}
      <div style={{position: 'absolute', left: -1.5, top: 0, width: 3, height: 48, background: 'rgba(74,58,49,0.35)', borderRadius: 2}} />
      <div style={{position: 'absolute', left: -4, top: 44, width: 8, height: 8, borderRadius: '50%', background: CLAY.terra, boxShadow: '0 1px 3px rgba(74,58,49,0.3)'}} />
      {/* 贴纸气泡（奶白 + 桃色描边，双层两行） */}
      <div style={{position: 'absolute', left: 0, bottom: 50, transform: 'translateX(-50%)', background: CLAY.cream,
        border: `3px solid ${CLAY.rim}`, borderRadius: 16, padding: '8px 14px 9px',
        boxShadow: '0 8px 18px rgba(74,58,49,0.18), inset 0 0 10px rgba(74,58,49,0.05)', whiteSpace: 'nowrap', textAlign: 'center'}}>
        <div style={{fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 800, fontSize: 18, color: CLAY.cocoa, letterSpacing: 1.5, lineHeight: 1.2}}>{plain}</div>
        <div style={{marginTop: 4, display: 'inline-block', background: 'rgba(245,206,126,0.32)', borderRadius: 8, padding: '2px 9px',
          fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 500, fontSize: 12, color: '#8A6A4F', letterSpacing: 1}}>{term}</div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- 字幕丸（读 SUBS，底部居中；奶白黏土丸）
export const CaptionPill: React.FC<{f: number}> = ({f}) => {
  const cur = SUBS.find((s) => f >= s.from - 2 && f <= s.to + 4);
  if (!cur) return null;
  const on = EASE.easeOutCubic((f - (cur.from - 2)) / 6);
  const off = 1 - EASE.easeOutCubic((f - (cur.to + 1)) / 5);
  return (
    <div style={{position: 'absolute', left: 640, top: 662, transform: `translate(-50%,-50%) scale(${0.92 + 0.08 * on})`, opacity: Math.min(on, off), zIndex: 85}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(251,243,228,0.95)', border: `2.5px solid ${CLAY.rim}`,
        borderRadius: 999, padding: '9px 22px', boxShadow: '0 8px 20px rgba(74,58,49,0.16)'}}>
        <div style={{width: 9, height: 9, borderRadius: '50%', background: CLAY.water, transform: `scale(${1 + 0.18 * Math.sin(f / 4)})`, boxShadow: 'inset 0 -1px 2px rgba(62,110,158,0.5)'}} />
        <div style={{fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 700, fontSize: 21, color: CLAY.cocoa, letterSpacing: 1.5, whiteSpace: 'nowrap'}}>{cur.text}</div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- 收束卡（SC05：成形 f338 → 定帧段带微动效）
export const EndLockup: React.FC<{f: number}> = ({f}) => {
  const pop = springPop(f, 338);
  const rise = EASE.easeOutCubic((f - 338) / 10);
  return (
    <div style={{position: 'absolute', inset: 0, zIndex: 92}}>
      <div style={{position: 'absolute', inset: 0, background: 'rgba(74,58,49,0.32)', opacity: rise}} />
      <div style={{position: 'absolute', left: 640, top: 330, transform: `translate(-50%,-50%) scale(${Math.min(pop, 1.04)}) translateY(${(1 - rise) * 26}px)`, opacity: Math.min(1, pop * 1.6)}}>
        <div style={{background: CLAY.cream, border: `4px solid ${CLAY.rim}`, borderRadius: 28, padding: '30px 54px 24px',
          boxShadow: '0 24px 60px rgba(74,58,49,0.3), inset 0 0 16px rgba(74,58,49,0.05)', textAlign: 'center'}}>
          {/* 水滴徽标（呼吸微动） */}
          <svg width={54} height={60} viewBox="0 0 36 42" style={{transform: `translateY(${Math.sin((f - 352) / 6) * (f >= 352 ? 2.4 : 0)}px)`}}>
            <path d="M18 2 C18 2 5.5 19.5 5.5 28 a12.5 12.5 0 0 0 25 0 C30.5 19.5 18 2 18 2 Z" fill={CLAY.water} stroke={shade(CLAY.waterD, 0.92)} strokeWidth="1.6" />
            <ellipse cx="12" cy="25" rx="3.4" ry="4.6" fill="rgba(255,255,255,0.6)" transform="rotate(-18 12 25)" />
            <circle cx="13.4" cy="29" r="3.4" fill="#fff" /><circle cx="23" cy="29" r="3.4" fill="#fff" />
            <circle cx="14" cy="29.4" r="1.8" fill={CLAY.cocoa} /><circle cx="23.6" cy="29.4" r="1.8" fill={CLAY.cocoa} />
            <path d="M15.5 34.5 Q18 36.6 20.5 34.5" stroke={CLAY.cocoa} strokeWidth="1.4" fill="none" strokeLinecap="round" />
          </svg>
          <div style={{marginTop: 8, fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 900, fontSize: 38, letterSpacing: 3, color: CLAY.cocoa, transform: 'scaleX(0.97)', whiteSpace: 'nowrap'}}>龙头一开，水就到家</div>
          <div style={{marginTop: 10, fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: 2, color: CLAY.cocoaL}}>
            水塔蓄水 · 管网送水 · 供水系统不放假
          </div>
          <div style={{marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(245,206,126,0.32)', borderRadius: 999, padding: '6px 16px'}}>
            <div style={{width: 8, height: 8, borderRadius: '50%', background: CLAY.terra, transform: `scale(${f >= 352 ? 1 + 0.2 * Math.max(0, Math.sin((f - 352) / 5)) : 1})`}} />
            <span style={{fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 700, fontSize: 14, color: '#8A6A4F', letterSpacing: 2}}>a2v · 黏土小城 · 示意样片</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- 水流前进光晕（SC03 hero：水滴滑行时管网上方的柔光提示）
export const FlowGlow: React.FC<{f: number; x: number; y: number; on: boolean}> = ({f, x, y, on}) => {
  if (!on) return null;
  const pulse = 0.7 + 0.3 * Math.sin(f / 3);
  return (
    <div style={{position: 'absolute', left: x - 90, top: y - 60, width: 180, height: 120, borderRadius: '50%', zIndex: 58,
      background: `radial-gradient(closest-side, rgba(143,193,238,${0.24 * pulse}), transparent 70%)`, filter: 'blur(2px)'}} />
  );
};
