import React from 'react';
import {clamp01} from './easing';

/**
 * 逐字错峰入场（epic 诗行字幕逐字底座，recipes/epic.md §4；OPUS 实测错峰 60–80ms ≈ 2–2.4 帧 @30fps）。
 * 文本按字符拆 span，第 i 字符在 f0 + i*stagger 起经 fade 帧淡入；纯函数、确定性。
 * style 透传（字体/字号/色由调用方定）；stagger/fade 单位=帧。悬挂标点跟随前字（不做避头尾——字幕行由章表稿保证 ≤20 字）。
 */
export const PerCharReveal: React.FC<{
  text: string;
  f0: number;
  N: number;
  stagger?: number;
  fade?: number;
  style?: React.CSSProperties;
}> = ({text, f0, N, stagger = 2, fade = 3, style}) => (
  <div style={{whiteSpace: 'nowrap', ...style}}>
    {Array.from(text).map((ch, i) => {
      const op = clamp01((N - f0 - i * stagger) / Math.max(1, fade));
      if (op <= 0) return <span key={i} style={{opacity: 0}}>{ch}</span>;
      return <span key={i} style={{opacity: op}}>{ch}</span>;
    })}
  </div>
);
