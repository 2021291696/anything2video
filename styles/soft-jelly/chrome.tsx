import React from 'react';
import {useCurrentFrame} from 'remotion';
import {SUBS} from '../common/subs';
import {FPS, TOTAL, clamp01, expoOut} from './world';

/**
 * soft-jelly 完成层（index.html 完成层技法全套，TSX 重写）：
 * ① 渐进 DOF 三叠层（backdrop-blur 2.5/2.6/4.9px 线性 mask 叠层复合 0→6px，随 lockup 到达做「跟焦」渐入）；
 * ② S 曲线两级调色（feComponentTransfer 41 点表常驻 + 开场二级 grade 交叉淡出 f1-27）；
 * ③ hero 触击 1.035→1.0 六帧 expoOut + 2px 垂直抖动表（f240 起）；
 * ④ 结尾 creep（f329 起 ~1.2% 缓推，ease-in 后匀速，防 QC 静止告警）；
 * ⑤ 颗粒逐帧重掷（SVG feTurbulence 确定性 seed + 每帧 hash 平移）；
 * ⑥ lockup rise+unblur+track-in（字距 0.46em→0.26em）+ 字幕。
 * 技法借鉴 mg-styles-15 demos/04-3d-render/index.html（MIT, Vincentwei1021），TSX 重写。
 */

export const HERO_F = 240;
const FREEZE_F = 329;
const LOCKUP_F = 254;

const hash = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const smoothU = (u: number) => {
  const c = clamp01(u);
  return c * c * (3 - 2 * c);
};
const quartOut = (u: number) => 1 - Math.pow(1 - clamp01(u), 4);

// 源 index.html #grade 41 点 S 曲线表（display-space：暗部下压、中腰抬、高光保留）
const S_TABLE =
  '0 0.0175 0.035 0.0525 0.07 0.09 0.11 0.13 0.15 0.1712 0.1925 0.2137 0.235 0.2562 0.2775 0.2987 0.32 0.3425 0.365 0.3875 0.41 0.4325 0.455 0.4775 0.5 0.525 0.55 0.575 0.6 0.6275 0.655 0.6825 0.71 0.7438 0.7775 0.8112 0.845 0.905 0.96 0.985 1';
// 开场二级 grade（上中段曲线：加深胶囊间隙、保高光）
const OPEN_TABLE =
  '0.0000 0.0312 0.0625 0.0938 0.1250 0.1562 0.1875 0.2188 0.2500 0.2812 0.3125 0.3438 0.3750 0.4048 0.4251 0.4435 0.4616 0.4803 0.5003 0.5221 0.5462 0.5729 0.6025 0.6350 0.6703 0.7083 0.7487 0.7909 0.8346 0.8789 0.9231 0.9658 1.0000';

const GradeFilters: React.FC = () => (
  <svg width="0" height="0" style={{position: 'absolute'}}>
    <filter id="sj-grade" colorInterpolationFilters="sRGB">
      <feComponentTransfer>
        <feFuncR type="table" tableValues={S_TABLE} />
        <feFuncG type="table" tableValues={S_TABLE} />
        <feFuncB type="table" tableValues={S_TABLE} />
      </feComponentTransfer>
    </filter>
    <filter id="sj-open" colorInterpolationFilters="sRGB">
      <feComponentTransfer>
        <feFuncR type="table" tableValues={OPEN_TABLE} />
        <feFuncG type="table" tableValues={OPEN_TABLE} />
        <feFuncB type="table" tableValues={OPEN_TABLE} />
      </feComponentTransfer>
    </filter>
  </svg>
);

const GRAIN_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='7' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)'/%3E%3C/svg%3E\")";

const Lockup: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const words = ['A', 'SOFT', 'LANDING'];
  const word = (k: number) => {
    const u = clamp01((t - (LOCKUP_F / FPS + 0.07 * k)) / 0.9);
    const e = expoOut(u);
    return {
      opacity: clamp01(u * 2.2),
      transform: `translateY(${(1 - e) * 14}px)`,
      filter: `blur(${(1 - e) * 7}px)`,
      letterSpacing: `${0.26 + (1 - e) * 0.2}em`,
    } as React.CSSProperties;
  };
  const ur = expoOut(clamp01((t - (LOCKUP_F / FPS + 0.22)) / 0.8));
  const uz = clamp01((t - (LOCKUP_F / FPS + 0.3)) / 0.9);
  const ez = expoOut(uz);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 88, textAlign: 'center', color: '#4a2e4e'}}>
      <div style={{fontFamily: "'DM Sans','Noto Sans SC',sans-serif", fontWeight: 600, fontSize: 26, lineHeight: 1, whiteSpace: 'nowrap'}}>
        {words.map((w, k) => (
          <span key={k} style={{display: 'inline-block', willChange: 'transform,filter,opacity', marginRight: '0.5em', ...word(k)}}>
            {w}
          </span>
        ))}
      </div>
      <div
        style={{
          width: 64,
          height: 2,
          margin: '14px auto 12px',
          background: '#4a2e4e',
          opacity: 0.55 * clamp01(ur * 1.5),
          transform: `scaleX(${ur})`,
          transformOrigin: '50% 50%',
        }}
      />
      <div
        style={{
          fontFamily: "'Noto Sans SC',sans-serif",
          fontWeight: 500,
          fontSize: 24,
          letterSpacing: `${0.36 + (1 - ez) * 0.1}em`,
          lineHeight: 1,
          whiteSpace: 'nowrap',
          opacity: clamp01(uz * 2.0),
          transform: `translateY(${(1 - ez) * 10}px)`,
          filter: `blur(${(1 - ez) * 6}px)`,
        }}
      >
        软着陆
      </div>
    </div>
  );
};

const Subs: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 64, textAlign: 'center'}}>
      {SUBS.map((s, i) => {
        const a = clamp01((f - s.from + 1) / 4) * clamp01((s.to - f + 1) / 4);
        if (a <= 0.01) return null;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 26,
              fontFamily: "'Noto Sans SC',sans-serif",
              fontWeight: 500,
              fontSize: 29,
              letterSpacing: '0.06em',
              color: '#5a3560',
              textShadow: '0 1px 10px rgba(250,236,244,0.9), 0 0 2px rgba(250,236,244,0.9)',
              opacity: a,
            }}
          >
            {s.text}
          </div>
        );
      })}
    </div>
  );
};

/** 完成层包裹：children = 3D plate。全部运动为 f 的纯函数。 */
export const Chrome: React.FC<{children: React.ReactNode}> = ({children}) => {
  // CHROME_OFF 隔离开关已移除（隔离实测完成：完成层 ~20-40ms/帧，保留）
  const f = useCurrentFrame();
  const t = f / FPS;
  // ③ hero punch + shake（f240 首触帧起）
  const df = f - HERO_F;
  const pun = df >= 0 ? 0.035 * (1 - expoOut(df / 6)) : 0;
  const shk = [2, -1.5, 1, -0.5][df] || 0;
  // ④ end creep（f329 起：ease-in 0.6s 后匀速，至末帧 ~0.85%）
  const tc = (f - FREEZE_F) / FPS;
  const crp = tc <= 0 ? 0 : 0.0092 * (tc < 0.6 ? (tc * tc) / 1.2 : tc - 0.3);
  const origin = f >= 290 ? '50% 62%' : '50% 80%'; // punch 原点=hero 触床屏位 (640,580)，creep 原点=构图轴
  // ② 开场二级 grade 交叉淡出（f1-27）
  const op = 1 - smoothU((t - 0.55) / 0.35);
  // ① 渐进 DOF：随 lockup 到达渐入（rack 感）
  const od = quartOut((t - (LOCKUP_F / FPS - 0.2)) / 1.2);
  // ⑤ 颗粒逐帧重掷
  const gx = Math.round(hash(f) * 64 - 32);
  const gy = Math.round(hash(f + 999) * 64 - 32);
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: '#efe2ea'}}>
      <GradeFilters />
      {/* plate：S 曲线常驻调色 + hero punch/end-creep 变换（只作用 3D 板，文字层不震） */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          filter: 'url(#sj-grade) saturate(1.08)',
          transform: `translateY(${shk}px) scale(${1 + pun + crp})`,
          transformOrigin: origin,
        }}
      >
        {children}
      </div>
      {/* ① 渐进 DOF 三叠层（blurs compound：2.5/2.8/7.7px 复合出 0→6px 底部渐变） */}
      {[
        {top: 470, blur: 2.5, h: 44},
        {top: 500, blur: 2.6, h: 44},
        {top: 535, blur: 4.9, h: 50},
      ].map((d, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            width: '100%',
            top: d.top,
            height: d.h,
            pointerEvents: 'none',
            opacity: od,
            backdropFilter: `blur(${d.blur}px)`,
            WebkitBackdropFilter: `blur(${d.blur}px)`,
            maskImage: 'linear-gradient(rgba(0,0,0,0) 0, #000 40px)',
            WebkitMaskImage: 'linear-gradient(rgba(0,0,0,0) 0, #000 40px)',
          }}
        />
      ))}
      {/* ② 开场二级调色罩（加深 opening，交叉淡出） */}
      <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', background: 'rgba(84,48,80,1)', mixBlendMode: 'multiply', opacity: 0.12 * op}} />
      {/* 暗角（开场加深） */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse 72% 70% at 50% 47%, rgba(0,0,0,0) ${55 - 8 * op}%, rgba(58,30,66,${(0.16 + 0.1 * op).toFixed(3)}) 100%)`,
          mixBlendMode: 'multiply',
        }}
      />
      {/* ⑤ 颗粒 boil */}
      <div
        style={{
          position: 'absolute',
          inset: -64,
          pointerEvents: 'none',
          opacity: 0.09,
          mixBlendMode: 'overlay',
          backgroundImage: GRAIN_URI,
          backgroundSize: '240px 240px',
          transform: `translate(${gx}px, ${gy}px)`,
        }}
      />
      <Lockup />
      <Subs />
      {/* 末帧安全哨兵（无渲染作用） */}
      <div style={{display: 'none'}}>{f === TOTAL ? 'end' : ''}</div>
    </div>
  );
};
