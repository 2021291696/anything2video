import React from 'react';
import {GlitchIn, SQUEEZE, fitSize} from '../../common';
import {CText, Pill, SoftIn, fadeIn, slideUp} from '../../ui';
import {PROMO} from '../../recipes';

// promo 专属组件恒定走 PROMO 配方，不随 config.recipe 漂移（演示合成才能稳定预览宣传视觉）
const PAL = PROMO.palette;

/**
 * 片尾行动号召端板（promo）：主标题大字（主色硬投影）+ CTA 胶囊按钮（自下滑入 + 轻呼吸）+ 小字副标；主色氛围光自底部升起。
 * 替代讲解片的"片尾压黑"：promo 的收尾就是这块端板本身，没有压黑兜底（promo 分支不挂载 endingFade）。
 */
export const CtaEnd: React.FC<{
  N: number; f0: number; headline: string; cta?: string; sub?: string; cx?: number; cy?: number; opacity?: number; ctaAt?: number;
}> = ({N, f0, headline, cta = '立即开始', sub, cx = 640, cy = 320, opacity = 1, ctaAt = 4}) => {
  const n = N - f0;
  if (n < 0) return null;
  const ctaScale = 1 + 0.02 * Math.sin(n * 0.22); // CTA 按钮轻呼吸
  return (
    <div style={{position: 'absolute', inset: 0, opacity}}>
      {/* 主色氛围光：radial 自按钮后方升起，18 帧淡入 */}
      <div style={{position: 'absolute', left: cx - 460, top: cy + 30, width: 920, height: 400, background: `radial-gradient(closest-side, rgba(${PAL.accentGlowRgb},.30), transparent 72%)`, opacity: fadeIn(n, 18)}} />
      <GlitchIn N={N} f0={f0} rgbSplit={5} seed={11}>
        <CText
          cx={cx} cy={cy} size={fitSize(headline, 1040, 96, 48, 1, 4)} weight={900} scaleX={SQUEEZE} letterSpacing={3}
          style={{WebkitTextStroke: '1px #000', paintOrder: 'stroke fill', textShadow: `6px 6px 0 ${PAL.accent}`}}
        >
          {headline}
        </CText>
      </GlitchIn>
      {/* CTA 胶囊按钮：ctaAt（默认 4）帧后自下滑入 + 轻呼吸；宽度自适应文案（固定 340px 会在长文案下溢出 ≈85px，09-28 shotcraft-promo 实测） */}
      <div style={{position: 'absolute', left: cx, top: cy + 108 + slideUp(n - ctaAt, 60, 18), transform: `translateX(-50%) scale(${ctaScale.toFixed(3)})`, transformOrigin: '50% 50%', opacity: n >= ctaAt ? 1 : 0}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: 68, padding: '0 44px', borderRadius: 34, background: PAL.accent, boxShadow: PAL.glowAccentS, whiteSpace: 'nowrap'}}>
          <span style={{fontFamily: 'Noto Sans SC, sans-serif', fontSize: 32, fontWeight: 900, color: PAL.pillTextOnAccent, letterSpacing: 4, lineHeight: 1, transform: 'translateY(-2px)'}}>{cta}</span>
        </div>
      </div>
      {sub ? (
        <SoftIn N={N} f0={f0 + 24} dy={8}>
          <CText cx={cx} cy={cy + 226} size={24} weight={500} color={PAL.grey} letterSpacing={3}>{sub}</CText>
        </SoftIn>
      ) : null}
    </div>
  );
};
