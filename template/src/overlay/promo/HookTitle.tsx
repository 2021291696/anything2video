import React from 'react';
import {GlitchIn, SQUEEZE, easeInOutPow, fitSize, kf} from '../../common';
import {CText, Pill, SoftIn} from '../../ui';
import {PROMO} from '../../recipes';

// promo 专属组件恒定走 PROMO 配方，不随 config.recipe 漂移（演示合成才能稳定预览宣传视觉）
const PAL = PROMO.palette;

/**
 * 片头钩子大字（promo 覆盖层族）：kicker 小胶囊 + 900 大字（主色硬投影 + 呼吸辉光，讲解片片名同款"重"字处理）+ 主色下划线生长。
 * 与讲解片 Title 的差异：钩子只有一句话、无英文副标与 tagline 分层；默认 GlitchIn（宣传片钩子允许闪，glitch=false 退化为 SoftIn）。
 */
export const HookTitle: React.FC<{
  N: number; f0: number; text: string; kicker?: string; cx?: number; cy?: number; size?: number; glitch?: boolean; opacity?: number;
}> = ({N, f0, text, kicker, cx = 640, cy = 330, size = 96, glitch = true, opacity = 1}) => {
  const n = N - f0;
  if (n < 0) return null;
  const lineW = kf(n, [[0, 0], [20, 240]], easeInOutPow(2.5));
  const word = (
    <CText
      cx={cx} cy={cy} size={fitSize(text, 1100, size, 56, 1, 4)} weight={900} scaleX={SQUEEZE} letterSpacing={4}
      style={{WebkitTextStroke: '1px #000', paintOrder: 'stroke fill', textShadow: `6px 6px 0 ${PAL.accent}, 0 0 ${(24 + 10 * Math.sin((N / 30) * Math.PI)).toFixed(1)}px rgba(${PAL.accentGlowRgb},.55)`}}
    >
      {text}
    </CText>
  );
  return (
    <div style={{position: 'absolute', inset: 0, opacity}}>
      {kicker ? (
        <SoftIn N={N} f0={f0} dy={6}>
          <Pill x={cx - 130} y={cy - size * 0.92} w={260} h={44} fill="rgba(0,0,0,.7)" stroke={PAL.accent} sw={2} text={kicker} fontSize={22} weight={800} color={PAL.accent} letterSpacing={6} textDy={-2} />
        </SoftIn>
      ) : null}
      {glitch ? <GlitchIn N={N} f0={f0} rgbSplit={5} seed={7}>{word}</GlitchIn> : <SoftIn N={N} f0={f0} len={10} dy={14}>{word}</SoftIn>}
      {/* 主色下划线：20 帧自中心长出 */}
      <div style={{position: 'absolute', left: cx - lineW / 2, top: cy + size * 0.72, width: lineW, height: 4, background: PAL.accent, boxShadow: `0 0 12px 2px rgba(${PAL.accentGlowRgb},.6)`}} />
    </div>
  );
};
