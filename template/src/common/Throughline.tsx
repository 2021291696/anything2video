import React from 'react';
import {useCurrentFrame} from 'remotion';
import {kf} from './easing';

/**
 * 贯穿元素槽位（方案 U11）：审美锚之三「独有贯穿元素」的声明式落点——一枚记号（仪表刻度 / 螺丝 / 图钉…）跟着内容走过全片。
 * 纪律核心：形态 glyph 全片不变（同一枚记号，不是每镜重画），每镜只由位置/缩放/透明度表达「它在哪」。
 * 动画全是帧号 N 的纯函数；config.VIDEO.throughline 缺省 undefined 时 Main 不挂载，DOM 零增量。
 */
export type ThroughlineSpec = {glyph: React.ReactNode; keyframes: Array<{from: number; x: number; y: number; s?: number; a?: number}>};

/** 指令式：at(N) 回调给出每帧位置/缩放/透明度；[from, to] 之外不渲染（DOM 零增量）。 */
export const Throughline: React.FC<{N: number; glyph: React.ReactNode; at: (N: number) => {x: number; y: number; s?: number; a?: number}; from: number; to: number}> = ({N, glyph, at, from, to}) => {
  if (N < from || N > to) return null;
  const p = at(N);
  return (
    <div style={{position: 'absolute', left: 0, top: 0, transform: `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) scale(${(p.s ?? 1).toFixed(4)})`, opacity: p.a ?? 1, pointerEvents: 'none'}}>
      {glyph}
    </div>
  );
};

/** 声明式：keyframes 用既有 kf() 逐属性插值（x/y/s/a 各一组 [from, 值]；s 缺省 1、a 缺省 1）。
 *  首关键帧之前不渲染（规避 kf 首值陷阱：不能让记号从第 0 帧就停在首帧位上），末关键帧之后保持末值常驻。 */
export const ThroughlineFromSpec: React.FC<{spec: ThroughlineSpec}> = ({spec}) => {
  const frame = useCurrentFrame();
  const N = frame + 1;
  const kfs = spec.keyframes;
  if (kfs.length === 0 || N < kfs[0].from) return null;
  const x = kf(N, kfs.map((k): [number, number] => [k.from, k.x]));
  const y = kf(N, kfs.map((k): [number, number] => [k.from, k.y]));
  const s = kf(N, kfs.map((k): [number, number] => [k.from, k.s ?? 1]));
  const a = kf(N, kfs.map((k): [number, number] => [k.from, k.a ?? 1]));
  return (
    <div style={{position: 'absolute', left: 0, top: 0, transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${s.toFixed(4)})`, opacity: a, pointerEvents: 'none'}}>
      {spec.glyph}
    </div>
  );
};
