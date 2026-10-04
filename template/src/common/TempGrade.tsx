import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {clamp01, easeInOutCubic} from './easing';

/**
 * 章界色温渐变层（epic 配方"色彩即转场"，recipes/epic.md §8；实现升格自 yunkai-promo《降灵》Rite.tsx Tint 层——2026-10-03 epic 配方落地轮入库）。
 * 全屏 rgba 色温层：N 落入 stop.from 起的 len 帧窗口内，从上一 stop 的色插值到本 stop 的色，其后持稳到下一窗口。
 * 挂载：内容之上、字幕/角标之下（与 FrameGrade 同区）；stops 传空数组 = 不渲染、DOM 零增量。
 * 纪律：rgba 全程显式（不透明度 0.08–0.22 区间——色温层是"调"不是"盖"）；纯函数、确定性、无 filter 实例。
 */
export type TempStop = {from: number; rgba: [number, number, number, number]};
export const TempGrade: React.FC<{stops: TempStop[]; len?: number}> = ({stops, len = 12}) => {
  const N = useCurrentFrame() + 1;
  if (stops.length === 0) return null;
  let c = stops[0].rgba;
  for (let i = 0; i < stops.length; i++) {
    const s = stops[i];
    const next = stops[i + 1];
    if (N >= s.from && (!next || N < next.from)) {
      const k = clamp01((N - s.from) / len);
      const p = i > 0 ? stops[i - 1].rgba : s.rgba;
      c = [0, 1, 2, 3].map((ch) => p[ch] + (s.rgba[ch] - p[ch]) * easeInOutCubic(k)) as [number, number, number, number];
      break;
    }
  }
  if (N < stops[0].from) c = stops[0].rgba;
  return <AbsoluteFill style={{background: `rgba(${c.map((v, i) => (i < 3 ? Math.round(v) : v.toFixed(3))).join(',')})`, pointerEvents: 'none'}} />;
};
