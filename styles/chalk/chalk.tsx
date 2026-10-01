import React from 'react';
import {useCurrentFrame, staticFile} from 'remotion';
import {getStroke} from 'perfect-freehand';
import {clamp01, easeInOutPow} from './common';

/**
 * 粉笔黑板图元库（chalk-math 专用，主脚本维护）。
 * 黑板底 + 粉笔压力笔触（颗粒质感 + 粉尘）+ 板书字 + 擦除转场。
 * 镜头组件 N = useCurrentFrame() + F0（F0 = ShotDef.from）。
 */
export const CHALK = {
  board: '#1e3b2f', boardDeep: '#152b23', boardEdge: '#0f2019',
  white: '#f5f2e8', yellow: '#e8d48b', blue: '#a8c8e8', pink: '#e8a8b0',
};

const DUST_URL = staticFile('assets/chalk-math/dust.png');

/** 黑板底：深绿板面 + 使用磨损痕 */
export const Board: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0,
    background: `radial-gradient(ellipse 70% 60% at 50% 45%, #24473a, ${CHALK.board} 62%, ${CHALK.boardDeep} 100%)`,
  }} />
);

/** 全局收尾：粉笔灰（screen 漂移）+ 板缘木框色压暗（挂 Main） */
export const ChalkPost: React.FC = () => {
  const N = useCurrentFrame() + 1;
  return (
    <>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `url(${DUST_URL})`, backgroundSize: '512px 512px',
        backgroundPosition: `${(N * 4) % 512}px ${(N * 7) % 512}px`,
        mixBlendMode: 'screen', opacity: 0.35,
      }} />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 94% 86% at 50% 46%, transparent 66%, rgba(8,18,12,.4) 100%)',
        border: '14px solid #5a4632', boxSizing: 'border-box',
      }} />
    </>
  );
};

/** 水墨幕的对应物：黑板幕包装（整幕淡入淡出） */
export const ChalkScene: React.FC<{N: number; f0: number; end: number; children: React.ReactNode}> = ({N, f0, end, children}) => {
  const inOp = clamp01((N - f0) / 12);
  const outOp = 1 - clamp01((N - (end - 14)) / 14);
  return <div style={{position: 'absolute', inset: 0, opacity: Math.min(inOp, outOp)}}>{children}</div>;
};

const svgPathFromStroke = (stroke: number[][]): string => {
  if (!stroke.length) return '';
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...stroke[0], 'Q'],
  );
  d.push('Z');
  return d.join(' ');
};

/**
 * 粉笔笔触：perfect-freehand 压力轮廓 + 渐进画入 + 双层（白垩核心 + 灰尘晕）+ dust 裁剪颗粒。
 * chalk=true 时叠加第二遍略偏移的描边（粉笔的粗糙双影）。
 */
export const ChalkStroke: React.FC<{
  points: [number, number][]; N: number; f0: number; len?: number; size?: number; color?: string; opacity?: number; delay?: number; chalk2?: boolean;
}> = ({points, N, f0, len = 26, size = 10, color = CHALK.white, opacity = 0.95, delay = 0, chalk2 = true}) => {
  const n = N - f0 - delay;
  if (n <= 0) return null;
  const t = clamp01(n / len);
  const vis = points.slice(0, Math.max(2, Math.ceil(points.length * t)));
  const outline = getStroke(vis, {
    size, thinning: 0.4, smoothing: 0.55, streamline: 0.35,
    simulatePressure: true, easing: easeInOutPow(1.3), last: t >= 1,
  });
  const d = svgPathFromStroke(outline);
  return (
    <svg width={1280} height={720} viewBox="0 0 1280 720" style={{position: 'absolute', left: 0, top: 0, opacity}}>
      {/* 灰尘晕 */}
      <path d={d} fill={color} opacity={0.14 * t} style={{filter: 'blur(3.5px)'}} />
      {/* 白垩核心 */}
      <path d={d} fill={color} opacity={0.9 * t} style={{filter: 'blur(0.6px)'}} />
      {/* 粉笔双影：第二遍偏移细描 */}
      {chalk2 && <path d={d} fill="none" stroke={color} strokeWidth={1.6} opacity={0.35 * t}
        transform="translate(2 -1.5)" style={{filter: 'blur(0.7px)'}} />}
    </svg>
  );
};

/** 点列生成器（导出给场景用） */
export const ptsLine = (x0: number, y0: number, x1: number, y1: number, n = 28): [number, number][] =>
  Array.from({length: n}, (_, i) => [x0 + (x1 - x0) * (i / (n - 1)), y0 + (y1 - y0) * (i / (n - 1))]);
export const ptsPoly = (...xy: [number, number][]): [number, number][] => {
  const pts: [number, number][] = [];
  for (let i = 0; i < xy.length; i++) {
    const [x0, y0] = xy[i];
    const [x1, y1] = xy[(i + 1) % xy.length];
    const seg = 18;
    for (let k = 0; k < seg; k++) pts.push([x0 + (x1 - x0) * (k / seg), y0 + (y1 - y0) * (k / seg)]);
  }
  return pts;
};

/** 板书字：白垩字 + 轻微歪斜（手写感） */
export const ChalkText: React.FC<{
  text: string; N: number; f0: number; x?: number; y?: number; size?: number; color?: string; spacing?: number; rotate?: number; opacity?: number;
}> = ({text, N, f0, x = 640, y = 200, size = 64, color = CHALK.white, spacing = 8, rotate = -0.8, opacity = 0.96}) => {
  const t = clamp01((N - f0) / 14);
  if (t <= 0) return null;
  return (
    <div style={{
      position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) rotate(${rotate}deg)`, opacity: t * opacity,
      fontFamily: `'Noto Sans SC', 'PingFang SC', sans-serif`, fontWeight: 900, fontSize: size, color,
      letterSpacing: spacing, whiteSpace: 'nowrap', filter: 'blur(0.5px)',
      textShadow: '0 0 1px rgba(245,242,232,.6)',
    }}>{text}</div>
  );
};

/** 板擦转场：整幕擦除淡出（ChalkScene 已含淡出，这里给硬擦的横向板擦痕） */
export const EraseMark: React.FC<{N: number; f0: number; y?: number}> = ({N, f0, y = 300}) => {
  const n = N - f0;
  if (n < 0 || n > 16) return null;
  const x = (n / 16) * 1400 - 200;
  return <div style={{
    position: 'absolute', left: x - 160, top: y - 40, width: 320, height: 80, borderRadius: 8,
    background: 'rgba(240,234,217,.14)', filter: 'blur(2px)',
  }} />;
};
