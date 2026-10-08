// ============================================================================
// kit.tsx — whiplash-line 图元库 React 侧（慕夏新艺术 · 战役 4 批次④）
// PosterCanvas：单 canvas 每帧 useLayoutEffect 重画（world.drawWorld 纯帧号驱动，确定性）
// MuchaCaption：慕夏风字幕卡（奶油纸片＋深棕衬线字＋金鞭线底线）
// WhiplashRule：可变线宽金线规则条（SVG 逐段矩形近似 swell）
// Vignette：四角暗角（纯 CSS）
// 纪律：禁 Math.random/Date；文本滚动无；全组件纯 props/f 驱动。
// ============================================================================
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {W, H, FPS} from '../common';
import {drawWorld} from './world';
import {clamp01, inv, outC, outBack} from './prims';

// ---- 世界画布：单 canvas，drawWorld(f) 全量重画 ----
export const PosterCanvas: React.FC<{absF: number}> = ({absF}) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useLayoutEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, W, H);
    drawWorld(g, absF);
  }, [absF]);
  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      style={{position: 'absolute', left: 0, top: 0, display: 'block', width: W, height: H}}
    />
  );
};

// ---- 可变线宽金线规则条（swellW 的 SVG 近似：30 段矩形拼合）----
export const WhiplashRule: React.FC<{x: number; width: number; y: number; wmax?: number; phase?: number; f: number}> = ({
  x, width, y, wmax = 5, phase = 0, f,
}) => {
  const segs = 30;
  return (
    <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none'}}>
      {Array.from({length: segs}).map((_, i) => {
        const q = i / (segs - 1);
        const w = 1.2 + (wmax - 1.2) * Math.sin(Math.PI * q) + Math.sin((f / FPS) * 3 + phase + q * 4) * 0.4;
        return (
          <rect
            key={i}
            x={x + (width * i) / segs}
            y={y - w / 2}
            width={width / segs + 0.8}
            height={w}
            fill="#c9a24a"
            rx={w / 2.4}
          />
        );
      })}
    </svg>
  );
};

// ---- 慕夏风字幕卡：奶油纸片＋深棕衬线字＋金鞭线底线＋旋入 ----
export const MuchaCaption: React.FC<{f: number; from: number; to: number; text: string}> = ({f, from, to, text}) => {
  const uIn = outBack(inv(from, from + 6, f));
  const uOut = 1 - inv(to - 3, to, f);
  if (f < from || uOut <= 0) return null;
  const a = Math.min(1, uIn * 1.2) * uOut;
  const scale = 0.92 + 0.08 * Math.min(1, uIn);
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 34,
        transform: `translateX(-50%) scale(${scale.toFixed(3)})`,
        opacity: a.toFixed(3),
        background: 'rgba(246,238,219,.96)',
        border: '2px solid #c9a24a',
        borderRadius: 10,
        boxShadow: '0 2px 0 rgba(78,51,32,.35), inset 0 0 0 1px rgba(78,51,32,.5)',
        padding: '9px 26px 13px',
        whiteSpace: 'nowrap',
      }}
    >
      <div
        style={{
          fontFamily: '"Noto Serif SC", serif',
          fontWeight: 700,
          fontSize: 24,
          color: '#4e3320',
          letterSpacing: 2,
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {text}
      </div>
      <svg width="100%" height="8" viewBox={`0 0 220 8`} preserveAspectRatio="none" style={{display: 'block', marginTop: 3}}>
        {Array.from({length: 24}).map((_, i) => {
          const q = i / 23;
          const w = 1 + 3.4 * Math.sin(Math.PI * q);
          return <rect key={i} x={(220 * i) / 24} y={4 - w / 2} width={220 / 24 + 0.6} height={w} fill="#c9a24a" rx={w / 2.4} />;
        })}
      </svg>
    </div>
  );
};

// ---- 片名字卡（SC01 钩子段叠加；海报横幅里也有石版标题，这里做拍入强调）----
export const TitleEmphasis: React.FC<{f: number; at: number}> = ({f, at}) => {
  const u = outBack(inv(at, at + 9, f));
  const fade = 1 - outC(inv(22, 30, f));
  if (u <= 0 || fade <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: 64,
        transform: `translateX(-50%) scale(${(0.9 + 0.1 * Math.min(1, u)).toFixed(3)}) rotate(-1.2deg)`,
        opacity: (Math.min(1, u * 1.2) * fade).toFixed(3),
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: '"Noto Serif SC", serif',
          fontWeight: 900,
          fontSize: 54,
          color: '#f6eedb',
          textShadow: '0 0 2px #4e3320, 3px 3px 0 #4e3320, -1px -1px 0 #4e3320',
          letterSpacing: 6,
          whiteSpace: 'nowrap',
        }}
      >
        一条鞭线的旅行
      </div>
      <div style={{fontFamily: '"Fraunces", serif', fontStyle: 'italic', fontSize: 17, color: '#4e3320', letterSpacing: 4, marginTop: 2}}>
        LE TRAIT FOUET
      </div>
    </div>
  );
};

// ---- 暗角＋收尾压暗 ----
export const Vignette: React.FC<{strength?: number}> = ({strength = 0.26}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      background: `radial-gradient(ellipse 118% 108% at 50% 46%, rgba(0,0,0,0) 62%, rgba(46,28,12,${strength}) 100%)`,
    }}
  />
);

export const endDark = (f: number, total: number, lastFrames = 6, max = 0.35): number =>
  f > total - lastFrames ? ((f - (total - lastFrames)) / lastFrames) * max : 0;

export const ease = {clamp01, inv, outC, outBack};
