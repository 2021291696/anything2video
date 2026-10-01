import React from 'react';
import {useCurrentFrame} from 'remotion';
import {PROMO} from '../../recipes';
import {clamp01} from '../../common';

// 调色板恒走 PROMO.palette，不随 config.recipe 漂移——与 BrandBar/CtaEnd/HookTitle/ProofCard/BenefitCard 同族约定
const PAL = PROMO.palette;

/**
 * 顶部品牌帽（promo-style-guide §1.2：y28–72，logo 30px + 品牌名 24–28px 取 26）。
 * 常驻层：钩子段（≤hookUntil）淡出隐藏，hookUntil 起 12f 淡入常驻，ctaFrom 起 12f 淡出（让位 CTA 端板）。
 * 由主脚本在 Main.tsx 挂载并按分镜表传 hookUntil/ctaFrom（构建组禁改本文件）。
 * 09-28 shotcraft-promo 首用；logo 为代码绘制场记板（斜切板+条纹），换品牌时改这里。
 */
export const BrandCap: React.FC<{brand: string; hookUntil: number; ctaFrom: number; slogan?: string}> = ({brand, hookUntil, ctaFrom, slogan}) => {
  const N = useCurrentFrame() + 1;
  const fadeIn = clamp01((N - hookUntil) / 12);
  const fadeOut = N >= ctaFrom ? 1 - clamp01((N - ctaFrom) / 12) : 1;
  const opacity = fadeIn * fadeOut;
  if (opacity <= 0.01) return null;
  return (
    <div style={{position: 'absolute', left: 0, top: 28, width: 1280, height: 44, opacity, pointerEvents: 'none', display: 'flex', alignItems: 'center', paddingLeft: 60, gap: 12}}>
      {/* 场记板小标（代码绘制：斜切板 + 条纹） */}
      <div style={{position: 'relative', width: 30, height: 30}}>
        <div style={{position: 'absolute', left: 0, bottom: 0, width: 30, height: 17, background: 'transparent', border: `2px solid ${PAL.accent}`, borderRadius: 2}} />
        <div style={{position: 'absolute', left: 1, top: 0, width: 28, height: 10, background: PAL.accent, transform: 'skewX(-22deg)', borderRadius: 2, opacity: 0.92}} />
        <div style={{position: 'absolute', left: 7, top: 1, width: 3, height: 8, background: PAL.bg, transform: 'skewX(-22deg)', opacity: 0.85}} />
        <div style={{position: 'absolute', left: 16, top: 1, width: 3, height: 8, background: PAL.bg, transform: 'skewX(-22deg)', opacity: 0.85}} />
      </div>
      <div style={{fontFamily: 'Audiowide, sans-serif', fontSize: 26, letterSpacing: 2, color: PAL.white, textShadow: PAL.textGlow}}>{brand}</div>
      {slogan ? <div style={{marginLeft: 10, fontSize: 22, letterSpacing: 1, color: PAL.grey}}>{slogan}</div> : null}
    </div>
  );
};
