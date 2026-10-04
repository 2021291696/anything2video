import React from 'react';
import {GRAIN_URL} from './DotFieldBg';

export type VignetteMode = 'paper' | 'cinematic' | 'deep' | 'none';

/**
 * 全局收尾层（电影级光学调色与暗角）：
 * - 自适应暗角：根据底色模式切换（OPUS 测量实测数据：亮纸章 1.25x / 暗底章最高 11.5x）。
 *   paper 档（亮纸/宣纸/书法）：极柔和暖红棕外缘微压（rgba(94,27,20,0.08)），保护宣纸通透度；
 *   cinematic 档（默认）：经典电影暗角（rgba(0,0,0,0.52)）；
 *   deep 档（黑场/深海/深邃宇宙）：聚光灯级强压边（rgba(0,0,0,0.88)）。
 * - 胶片/纸质微粒：复用 GRAIN_URL（feTurbulence overlay），静态微粒赋予无机底图手工质感。
 */
export const FrameGrade: React.FC<{
  vignette?: boolean;
  vignetteMode?: VignetteMode;
  grain?: boolean;
  tint?: string;
  tintAlpha?: number;
}> = ({
  vignette = false,
  vignetteMode = 'cinematic',
  grain = false,
  tint,
  tintAlpha = 0
}) => {
  if (!vignette && !grain && !(tint && tintAlpha > 0)) return null;

  let vignetteBg = 'radial-gradient(ellipse 95% 90% at 50% 48%, transparent 52%, rgba(0,0,0,0.52) 100%)';
  if (vignetteMode === 'paper') {
    vignetteBg = 'radial-gradient(ellipse 96% 88% at 50% 50%, transparent 68%, rgba(94, 27, 20, 0.09) 100%)';
  } else if (vignetteMode === 'deep') {
    vignetteBg = 'radial-gradient(ellipse 85% 80% at 50% 48%, transparent 32%, rgba(0,0,0,0.86) 100%)';
  }

  return (
    <React.Fragment>
      {vignette && vignetteMode !== 'none' ? (
        <div style={{position: 'absolute', inset: 0, background: vignetteBg, pointerEvents: 'none'}} />
      ) : null}
      {grain ? (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: GRAIN_URL,
          backgroundSize: '160px 160px',
          opacity: 0.045,
          mixBlendMode: 'overlay',
          pointerEvents: 'none'
        }} />
      ) : null}
      {tint && tintAlpha > 0 ? (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: tint,
          mixBlendMode: 'multiply',
          opacity: tintAlpha,
          pointerEvents: 'none'
        }} />
      ) : null}
    </React.Fragment>
  );
};
