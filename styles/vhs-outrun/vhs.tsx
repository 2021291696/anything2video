// vhs-outrun VHS 做旧链：RGB 色偏 SVG filter 组（含品红右向渗色）+ 扫描线 + 跟踪噪声带（15fps 步进）
// + 噪点 + 暗角 + OSD（PLAY/REW/STOP/时码/TRACKING）+ 数字车速 HUD。全部帧号驱动、seeded、零时钟。
// 技法借鉴 mg-styles-15 demos/10-synthwave (MIT, Vincentwei1021) VHS YIQ ShaderPass 后期链机制，TSX/DOM 重写。
import React from 'react';
import {W, H, FONT_MONO} from '../common';
import {sceneTime, inRewind, q15, hash1, speed, FPS as FPS_R} from './timeline';

// ---- SVG filter defs：RGB split（常驻 2.2px）与 glitch 档（倒带窗 5px + 品红渗色加强）----
export const VhsFilterDefs: React.FC = () => (
  <svg width="0" height="0" style={{position: 'absolute'}} aria-hidden>
    <defs>
      <filter id="vhs-split" x="-3%" y="-3%" width="106%" height="106%" colorInterpolationFilters="sRGB">
        <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
        <feOffset in="r" dx="2.2" dy="0" result="ro" />
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
        <feOffset in="b" dx="-2.2" dy="0" result="bo" />
        <feBlend in="ro" in2="g" mode="screen" result="rg" />
        <feBlend in="rg" in2="bo" mode="screen" result="rgb" />
        <feOffset in="r" dx="5" dy="0" result="rs" />
        <feComponentTransfer in="rs" result="rsf"><feFuncA type="linear" slope="0.35" /></feComponentTransfer>
        <feBlend in="rgb" in2="rsf" mode="screen" />
      </filter>
      <filter id="vhs-split-glitch" x="-4%" y="-3%" width="108%" height="106%" colorInterpolationFilters="sRGB">
        <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
        <feOffset in="r" dx="5.5" dy="0" result="ro" />
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
        <feOffset in="b" dx="-5.5" dy="0" result="bo" />
        <feBlend in="ro" in2="g" mode="screen" result="rg" />
        <feBlend in="rg" in2="bo" mode="screen" result="rgb" />
        <feOffset in="r" dx="12" dy="0" result="rs" />
        <feComponentTransfer in="rs" result="rsf"><feFuncA type="linear" slope="0.6" /></feComponentTransfer>
        <feBlend in="rgb" in2="rsf" mode="screen" />
      </filter>
    </defs>
  </svg>
);

// ---- feTurbulence 噪声片（确定性 seed，grain 与跟踪带共用生成器不同参数）----
const NoiseTile: React.FC<{id: string; freq: number; seed: number; alpha: number}> = ({id, freq, seed, alpha}) => (
  <svg width="100%" height="100%" style={{display: 'block'}} aria-hidden>
    <filter id={id} x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves="2" seed={seed} stitchTiles="stitch" />
      <feColorMatrix type="matrix" values={`0 0 0 0 0.72  0 0 0 0 0.74  0 0 0 0 0.8  0.9 0 0 0 ${alpha}`} />
    </filter>
    <rect width="100%" height="100%" filter={`url(#${id})`} />
  </svg>
);

// ---- VhsPost：叠加链（z 序：撕裂行 < 跟踪带 < 扫描线 < 颗粒 < 暗角 < CRT 开机白闪/HERO 闪光）----
export const VhsPost: React.FC<{f: number}> = ({f}) => {
  const fr = f - 1;
  const t = sceneTime(f);
  const rew = inRewind(f);
  // 显示层伪影（跟踪带/噪点/撕裂）挂在真实帧的 15fps 步长上：定帧段磁带内容冻结、
  // 噪声带持续步进（结尾定帧微动效纪律）；正常段与磁带时基同步（sceneTime 量化值一致）。
  const rt = fr / FPS_R;
  const qq = q15(rt); // 15fps 步进相位（跟踪带撕裂/抖动全部钉在这个步长上）
  // 跟踪噪声带：缓慢下行扫过全屏；钩子段加高加强
  const hook = fr < 30;
  const bandH = hook ? 74 : rew ? 64 : 46;
  const bandY = ((rt * 170 + 40) % (H + 120)) - bandH - 20;
  const bandJx = (hash1(qq * 3.71) - 0.5) * (hook || rew ? 14 : 5);
  // CRT 开机（f1-5 竖直张开幕 + 亮线）
  const bootK = fr <= 1 ? 0.02 : fr === 2 ? 0.2 : fr === 3 ? 0.55 : fr === 4 ? 0.88 : 1;
  const bootLine = fr <= 5;
  // HERO 闪光（f250-257 白粉闪，快速衰减）
  const flash = fr >= 250 && fr <= 257 ? 0.5 * Math.pow((257 - fr) / 7, 1.6) : 0;
  // 末 3 帧轻收暗
  const endDim = f >= 395 ? ((f - 394) / 3) * 0.3 : 0;
  return (
    <div style={{position: 'absolute', inset: 0, zIndex: 40, pointerEvents: 'none', overflow: 'hidden'}}>
      {/* 跟踪噪声带：噪声底 + 横向拉伸纹 + 15fps 撕裂行（上下软边 mask，避免读成实心灰条） */}
      <div style={{position: 'absolute', left: bandJx, top: bandY, width: W, height: bandH,
        opacity: hook ? 0.42 : rew ? 0.38 : 0.2,
        WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 22%, #000 78%, transparent 100%)',
        maskImage: 'linear-gradient(180deg, transparent 0%, #000 22%, #000 78%, transparent 100%)'}}>
        <NoiseTile id="nz-band" freq={0.55} seed={7} alpha={0.8} />
        <div style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', mixBlendMode: 'screen',
          background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 10px)'}} />
        {[0, 1, 2].map((i) => {
          const ry = hash1(qq * 7.77 + i * 13.1) * bandH;
          const rx = (hash1(qq * 5.13 + i * 3.7) - 0.5) * 46;
          return <div key={i} style={{position: 'absolute', left: rx, top: ry, width: W, height: hook || rew ? 3 : 2,
            background: 'rgba(8,2,18,0.85)', mixBlendMode: 'multiply'}} />;
        })}
      </div>
      {/* 扫描线（3px 周期）+ 全屏噪点（15fps 量化位移） */}
      <div style={{position: 'absolute', inset: 0, opacity: 0.5,
        background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0 1px, transparent 1px 3px)'}} />
      <div style={{position: 'absolute', inset: -8, opacity: 0.06, mixBlendMode: 'screen',
        transform: `translate(${(hash1(qq * 1.31) * 8).toFixed(1)}px, ${(hash1(qq * 2.17) * 8).toFixed(1)}px)`}}>
        <NoiseTile id="nz-grain" freq={0.9} seed={12} alpha={0.7} />
      </div>
      {/* 暗角 */}
      <div style={{position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 130% 124% at 50% 46%, transparent 56%, rgba(8,0,22,0.52) 100%)'}} />
      {/* CRT 开机：中央亮线 + 上下黑幕（ scaleY 由 Main 的世界 wrapper 承担，这里补亮线与暗幕） */}
      {bootLine ? (
        <>
          <div style={{position: 'absolute', left: 0, right: 0, top: `calc(50% - ${(360 * (1 - bootK)).toFixed(0)}px)`, height: `calc(${(720 * (1 - bootK)).toFixed(0)}px)`, background: '#05010d'}} />
          <div style={{position: 'absolute', left: 0, right: 0, bottom: `calc(50% - ${(360 * (1 - bootK)).toFixed(0)}px)`, height: `calc(${(720 * (1 - bootK)).toFixed(0)}px)`, background: '#05010d'}} />
          <div style={{position: 'absolute', left: 0, right: 0, top: '50%', height: 3, transform: 'translateY(-50%)',
            background: '#ffffff', boxShadow: '0 0 4px #fff, 0 0 30px rgba(160,220,255,0.9)', opacity: 1 - fr / 6}} />
        </>
      ) : null}
      {/* HERO 白粉闪光 */}
      {flash > 0.01 ? <div style={{position: 'absolute', inset: 0, background: 'rgba(255,214,236,1)', opacity: flash.toFixed(3), mixBlendMode: 'screen'}} /> : null}
      {/* 末帧收暗 */}
      {endDim > 0.01 ? <div style={{position: 'absolute', inset: 0, background: '#05010d', opacity: endDim.toFixed(3)}} /> : null}
    </div>
  );
};

// ---- OSD：VHS 机面板字（PLAY ▶ / ◀◀ REW / STOP ❚❚ / 时码 / TRACKING），渲染在扫描线之上保持清晰 ----
export const Osd: React.FC<{f: number}> = ({f}) => {
  const fr = f - 1;
  const t = sceneTime(f);
  const rew = inRewind(f);
  const stopped = fr >= 355;
  const showPlay = fr >= 8 && !rew && !stopped;
  const blinkOn = q15(fr / FPS_R) % 2 === 0; // 面板闪烁挂真实帧（定帧段持续微动）
  const ss = String(Math.floor(t) % 60).padStart(2, '0');
  const base: React.CSSProperties = {fontFamily: FONT_MONO, fontWeight: 700, letterSpacing: 3, color: '#f2f2ff',
    textShadow: '2px 2px 0 rgba(0,0,0,0.85)'};
  return (
    <div style={{position: 'absolute', inset: 0, zIndex: 60, pointerEvents: 'none'}}>
      {showPlay ? <div style={{...base, position: 'absolute', left: 34, top: 24, fontSize: 30}}>PLAY ▶</div> : null}
      {rew ? <div style={{...base, position: 'absolute', left: 34, top: 24, fontSize: 30, color: blinkOn ? '#ffd75c' : '#f2f2ff'}}>◀◀ REW</div> : null}
      {stopped ? <div style={{...base, position: 'absolute', left: 34, top: 24, fontSize: 30, color: blinkOn ? '#ff2d95' : '#f2f2ff'}}>STOP ❚❚</div> : null}
      {fr < 30 ? <div style={{...base, position: 'absolute', left: 34, bottom: 78, fontSize: 24, opacity: blinkOn ? 0.95 : 0.5}}>TRACKING</div> : null}
      <div style={{...base, position: 'absolute', right: 34, bottom: 74, fontSize: 24, opacity: stopped ? 0.5 : 0.9}}>SP  0:00:{ss}</div>
    </div>
  );
};

// ---- 数字车速 HUD（S03「仪表狂飙」：HERO 段左下数字码表 + 油门条）----
export const SpeedHud: React.FC<{f: number}> = ({f}) => {
  const fr = f - 1;
  if (fr < 172 || fr >= 300) return null;
  const t = sceneTime(f);
  const sp = speed(t);
  const mph = Math.round(sp * 1.42);
  const in01 = Math.min(sp / 78, 1);
  const gate = fr < 176 ? (fr - 172) / 4 : fr >= 292 ? (300 - fr) / 8 : 1;
  return (
    <div style={{position: 'absolute', left: 34, bottom: 118, zIndex: 55, opacity: Math.min(gate, 1).toFixed(3), pointerEvents: 'none'}}>
      <div style={{fontFamily: FONT_MONO, fontWeight: 700, fontSize: 44, letterSpacing: 2, color: '#23e5e5',
        textShadow: '0 0 4px rgba(35,229,229,0.9), 2px 2px 0 rgba(0,0,0,0.8)'}}>
        {String(mph).padStart(3, '0')}<span style={{fontSize: 18, opacity: 0.85}}> MPH</span>
      </div>
      <div style={{marginTop: 6, width: 190, height: 8, background: 'rgba(10,2,24,0.7)', border: '1px solid rgba(35,229,229,0.5)'}}>
        <div style={{width: `${(in01 * 100).toFixed(1)}%`, height: '100%',
          background: in01 > 0.92 ? '#ff2d95' : '#23e5e5', boxShadow: '0 0 6px currentColor'}} />
      </div>
    </div>
  );
};
