// 章节角标（v3.9.0 配方层四件套之二；节奏参数换算自 lanshu-create-ai-presenter-video v1/v8 chip，MIT——Remotion 重写）。
// 章开始 ~1.5f 后 10f 淡入上浮完成、下划线随入场进度画出、to 前 8f 淡出（to 缺省=播到片尾不淡出）。
// 数据源：src/common/timeline.ts 的 CHAPTER_STARTS（tts_build.py 生成）；to 传下一章 from-1（调用方算好）。
// 颜色全 props（kit 不引 recipes 防循环依赖）：accent 缺省跟随 ink；不传 bg 时编号走文字档，传 bg 时编号走垫底胶囊档。
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {clamp01, easeOutCubic} from '../easing';

export const ChapterBadge: React.FC<{
  n: number | string;
  title: string;
  from: number;
  to?: number;
  N?: number;
  x?: number;
  y?: number;
  size?: number;
  accent?: string;
  ink?: string;
  bg?: string;
}> = ({n, title, from, to, N: nProp, x = 56, y = 48, size = 26, accent, ink = '#FFFFFF', bg}) => {
  const rel = useCurrentFrame();
  const N = nProp ?? rel + 1;
  const inP = easeOutCubic(clamp01((N - from) / 10));
  const outP = to !== undefined ? clamp01((to - N) / 8) : 1;
  if (N < from || inP <= 0 || outP <= 0) return null;
  const num = typeof n === 'number' ? `第${n}章` : n;
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, display: 'flex', alignItems: 'baseline', gap: 10,
        opacity: Math.min(inP, outP), transform: `translateY(${(1 - inP) * 8}px)`, pointerEvents: 'none', whiteSpace: 'nowrap',
      }}
    >
      <span style={{fontSize: size, fontWeight: 800, color: accent ?? ink, background: bg, padding: bg ? '4px 10px' : 0, borderRadius: 6}}>{num}</span>
      <span style={{fontSize: size, fontWeight: 700, color: ink}}>{title}</span>
      <span style={{alignSelf: 'flex-end', display: 'inline-block', height: 2, width: `${inP * 100}%`, background: accent ?? ink}} />
    </div>
  );
};
