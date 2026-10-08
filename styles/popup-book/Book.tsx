import React from 'react';
import {useCurrentFrame} from 'remotion';
import {EASE, PAPER, PARALLAX, camDrift, frontX} from './world';
import {Bean, Grain} from './kit';

/**
 * Book.tsx — 摊开的牛皮纸立体书页面（全片常驻舞台）。
 * z 序：页底 PageFloor(z0) < 远景 BackLayer(z1，0.55×) < 页上场景件（shots，z3-29）< 近景 FrontLayer(z30，1.0×)
 *      < 纸纹 Grain(z40) < 拉页转场 PageTurn(z50) < 角标书签(z60) < 字幕(z85)。
 * PageTurn 的盖页表面 = BookSurface 的逐帧复刻（同 f 同确定性输出），落定卸载零跳变。
 */

/** 牛皮纸页面底（全帧，两页共用同一张纸面）。 */
export const PageFloor: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0, zIndex: 0,
    background: `linear-gradient(180deg, ${PAPER.kraftTop} 0%, ${PAPER.kraftMid} 46%, ${PAPER.kraftLow} 100%)`,
    boxShadow: 'inset 0 0 90px rgba(74,50,34,0.22), inset 0 10px 0 rgba(255,246,228,0.16)',
  }}>
    {/* 远近地平淡线（书页上印刷的远景分界） */}
    <div style={{position: 'absolute', left: 0, right: 0, top: 468, height: 2, background: PAPER.horizon}} />
    {/* 页面装订边（上缘装订线阴影，读作「书」） */}
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 26,
      background: 'linear-gradient(180deg, rgba(74,50,34,0.18), transparent)'}} />
  </div>
);

/** 远景层（0.55×）：纸太阳 / 纸云 / 远山沙纸剪影，缓漂。 */
export const BackLayer: React.FC<{f?: number}> = ({f: fProp}) => {
  const fFrame = useCurrentFrame();
  const f = fProp ?? fFrame + 1;
  const pan = camDrift(f) * PARALLAX.back;
  const clouds = [
    {x: 210, y: 96, s: 1.0, drift: 6, seed: 0.2},
    {x: 720, y: 150, s: 0.7, drift: -4, seed: 1.6},
    {x: 1180, y: 82, s: 1.2, drift: 8, seed: 3.1},
    {x: 1560, y: 160, s: 0.8, drift: -6, seed: 4.4},
  ];
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 1, isolation: 'isolate'}}>
      <div style={{position: 'absolute', left: -pan, top: 0, width: 2200, height: '100%'}}>
        {/* 纸太阳（沙纸圆 + 内阴影厚度） */}
        <div style={{position: 'absolute', left: 1035 + Math.sin(f / 90) * 3, top: 92, width: 118, height: 118, borderRadius: '50%',
          background: PAPER.sand, border: '1px solid rgba(74,50,34,0.18)',
          boxShadow: 'inset 0 -8px 0 rgba(74,50,34,0.08), 0 8px 14px rgba(74,50,34,0.18)'}} />
        {clouds.map((c, i) => {
          const cx = c.x + Math.sin((f / 30) * 0.22 + c.seed) * c.drift;
          return (
            <div key={i} style={{position: 'absolute', left: cx, top: c.y, opacity: 0.92}}>
              <div style={{width: 104 * c.s, height: 32 * c.s, borderRadius: 999, background: PAPER.cream,
                border: '1px solid rgba(74,50,34,0.14)', boxShadow: '0 5px 0 rgba(74,50,34,0.10)'}} />
              <div style={{position: 'absolute', left: 24 * c.s, top: -14 * c.s, width: 50 * c.s, height: 26 * c.s, borderRadius: 999, background: PAPER.cream, border: '1px solid rgba(74,50,34,0.14)'}} />
            </div>
          );
        })}
        {/* 远山（沙纸剪影两叠） */}
        <svg width={2200} height={140} viewBox="0 0 2200 140" style={{position: 'absolute', left: 0, top: 342, opacity: 0.3}}>
          <path d="M0 140 L0 96 Q160 34 340 88 Q520 132 700 74 Q880 24 1080 84 Q1260 130 1450 70 Q1650 20 1860 82 Q2040 130 2200 78 L2200 140 Z"
            fill="#bfa170" stroke="rgba(74,50,34,0.14)" strokeWidth={1.5} />
        </svg>
        <svg width={2200} height={110} viewBox="0 0 2200 110" style={{position: 'absolute', left: 0, top: 396, opacity: 0.42}}>
          <path d="M0 110 L0 72 Q220 26 430 70 Q640 108 860 60 Q1080 18 1290 66 Q1500 106 1710 58 Q1920 22 2200 70 L2200 110 Z"
            fill="#b18e5c" stroke="rgba(74,50,34,0.16)" strokeWidth={1.5} />
        </svg>
      </div>
    </div>
  );
};

/** 近景层（1.0×，视差读感最强）：纸草叶带 + 平铺豆/叶（页面上的小道具）。 */
export const FrontLayer: React.FC<{f?: number}> = ({f: fProp}) => {
  const fFrame = useCurrentFrame();
  const f = fProp ?? fFrame + 1;
  const rand = EASE.rng(20261051);
  const tufts = Array.from({length: 16}, (_, i) => ({
    x: i * 108 + rand() * 54,
    y: 648 + rand() * 46,
    s: 0.7 + rand() * 0.7,
    lean: -14 + rand() * 28,
  }));
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 30, isolation: 'isolate', pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 2200, height: '100%'}}>
        {tufts.map((t, i) => (
          <svg key={i} width={64 * t.s} height={54 * t.s} viewBox="0 0 64 54"
            style={{position: 'absolute', left: frontX(t.x, f), top: t.y, transform: `rotate(${t.lean}deg)`, transformOrigin: '50% 100%'}}>
            <path d="M32 54 C28 38 18 30 8 26 C22 26 30 32 32 40 C34 32 42 26 56 26 C46 30 36 38 32 54 Z"
              fill={i % 3 === 0 ? '#8fae8a' : PAPER.sage} stroke="rgba(74,50,34,0.20)" strokeWidth={1.2} />
          </svg>
        ))}
        {/* 页面上平放的两颗豆 + 一片叶（随前景层 1.0× 滑动） */}
        <div style={{position: 'absolute', left: frontX(430, f), top: 664}}><Bean x={0} y={0} s={30} rot={-18} roast={0.15} z={31} /></div>
        <div style={{position: 'absolute', left: frontX(1210, f), top: 682}}><Bean x={0} y={0} s={26} rot={22} roast={0.55} z={31} /></div>
        <svg width={72} height={44} viewBox="0 0 72 44" style={{position: 'absolute', left: frontX(880, f), top: 668, transform: 'rotate(8deg)'}}>
          <path d="M4 40 C10 14 34 2 68 6 C60 30 38 44 4 40 Z" fill={PAPER.sage} stroke="rgba(74,50,34,0.22)" strokeWidth={1.4} />
          <path d="M8 38 C24 30 44 20 64 9" fill="none" stroke="rgba(74,50,34,0.28)" strokeWidth={1.4} />
        </svg>
      </div>
    </div>
  );
};

/** 书页表面全栈（= 常驻舞台的复刻）：PageFloor + BackLayer + FrontLayer + Grain。拉页盖页用它做逐帧一致的表面。 */
export const BookSurface: React.FC<{f: number}> = ({f}) => (
  <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
    <PageFloor />
    <BackLayer f={f} />
    <FrontLayer f={f} />
    <Grain z={5} />
  </div>
);
