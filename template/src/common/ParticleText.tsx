import React from 'react';
import {useCurrentFrame} from 'remotion';
import {clamp01, easeOutCubic, rnd} from './easing';

/**
 * 粒子聚字（epic 片名/收口大字，OPUS 片头 13–17s 同型）——两阶段确定性实现：
 * 阶段一（0..gather 帧）：count 颗粒子从全域散布点飞向文字锚区（每粒子起/终点由 rnd(seed,i,salt) 一次定死，帧间稳定）；
 * 阶段二（gather−6 起 10 帧）：文字本体淡入 + 微辉光，粒子随后 8 帧淡出。
 * DOM 预算：容器 1 + 粒子 count（缺省 90，≤600 红线内；>140 需在分镜表登记性能预算）。
 * 已知边界：粒子落在文字包围盒（估宽）而非字形轮廓——轮廓级聚字需 canvas 采样像素，首片需要时再立项升级；
 * 反锯齿观感由粒子小径（2.5–3.5px）+ 阶段二文字显影补足。随机只用 rnd 约定，禁 Math.random，逐帧可复现。
 */
export const ParticleText: React.FC<{
  text: string;
  f0: number;
  N: number;
  seed?: number;
  count?: number;
  /** 文字锚（画布坐标，缺省画面中心） */
  cx?: number;
  cy?: number;
  /** 文字字号（估宽用） */
  fontSize?: number;
  /** 聚集阶段帧数 */
  gather?: number;
  color?: string;
  particleColor?: string;
  style?: React.CSSProperties;
}> = ({text, f0, N: nRaw, seed = 11, count = 90, cx = 640, cy = 360, fontSize = 120, gather = 42, color = '#F5EFE0', particleColor = 'rgba(233,214,166,.9)', style}) => {
  const N = nRaw - f0;
  if (N < 0) return null;
  const estW = Math.min(1100, text.length * fontSize * 0.92);
  const halfW = estW / 2;
  const halfH = fontSize * 0.55;
  const textOp = clamp01((N - (gather - 6)) / 10);
  const dustOp = N < gather ? 1 : clamp01(1 - (N - gather) / 8);
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden'}}>
      {dustOp > 0 && Array.from({length: count}, (_, i) => {
        const sx = rnd(seed, i, 1, 7) * 1280;
        const sy = rnd(seed, i, 2, 7) * 720;
        const tx = cx - halfW + rnd(seed, i, 3, 7) * estW;
        const ty = cy - halfH + rnd(seed, i, 4, 7) * halfH * 2;
        const delay = rnd(seed, i, 5, 7) * (gather * 0.35);
        const p = easeOutCubic(clamp01((N - delay) / (gather - delay)));
        const drift = Math.sin((N + i * 13) * 0.11) * 2.5 * (1 - p);
        const size = 2.5 + rnd(seed, i, 6, 7) * 1.5;
        return (
          <div key={i} style={{position: 'absolute', left: sx + (tx - sx) * p, top: sy + (ty - sy) * p + drift, width: size, height: size, borderRadius: '50%', background: particleColor, opacity: dustOp * (0.35 + 0.65 * p)}} />
        );
      })}
      {textOp > 0 && (
        <div style={{position: 'absolute', left: cx, top: cy, transform: 'translate(-50%,-50%)', whiteSpace: 'nowrap', fontFamily: `'Noto Serif SC', 'Songti SC', serif`, fontWeight: 700, fontSize, letterSpacing: 10, color, opacity: textOp, textShadow: `0 0 18px rgba(233,214,166,${(0.5 * textOp).toFixed(2)}), 0 2px 14px rgba(0,0,0,.6)`, ...style}}>{text}</div>
      )}
    </div>
  );
};
