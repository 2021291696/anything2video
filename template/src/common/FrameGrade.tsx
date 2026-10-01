import React from 'react';
import {GRAIN_URL} from './DotFieldBg';

/**
 * 全局收尾层（方案 U12）：暗角 + 静态噪点 + 可选色偏，三层全屏静态 div（各 1 节点，无容器）。
 * - 缺省全关：config.VIDEO.grade 缺省 undefined 时 Main 不挂载本组件，DOM 零增量；三项皆未开时组件内部也返回 null。
 * - 噪点复用 DotFieldBg 导出的 GRAIN_URL（同一份 feTurbulence data-URI，不复制第二份），overlay 0.04；
 *   全屏静态、禁逐帧位移（lessons：禁元素级逐帧漂移纹理，质感靠全局层出）。
 * - 暗角把视线压回中心，间接服务「每屏唯一主角」；tint 为收尾向冷/暖收的可选色偏（multiply 混合）。
 * - 无 SVG filter 实例；overlay/multiply 均为合成层混合，不进 blur 预算。
 */
export const FrameGrade: React.FC<{vignette?: boolean; grain?: boolean; tint?: string; tintAlpha?: number}> = ({vignette = false, grain = false, tint, tintAlpha = 0}) => {
  if (!vignette && !grain && !(tint && tintAlpha > 0)) return null;
  return (
    <React.Fragment>
      {vignette ? <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 100% 96% at 50% 48%, transparent 62%, rgba(0,0,0,0.42) 100%)', pointerEvents: 'none'}} /> : null}
      {grain ? <div style={{position: 'absolute', inset: 0, backgroundImage: GRAIN_URL, backgroundSize: '160px 160px', opacity: 0.04, mixBlendMode: 'overlay', pointerEvents: 'none'}} /> : null}
      {tint && tintAlpha > 0 ? <div style={{position: 'absolute', inset: 0, background: tint, mixBlendMode: 'multiply', opacity: tintAlpha, pointerEvents: 'none'}} /> : null}
    </React.Fragment>
  );
};
