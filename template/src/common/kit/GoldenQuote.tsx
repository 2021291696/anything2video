// 结尾金句（v3.9.0 配方层四件套之三；maskRise 语出 lanshu-create-ai-presenter-video v1 title，MIT——Remotion 重写）。
// 整行容器 overflow:hidden 作遮罩，字符从遮罩下方 105% 处升起（词间错峰 stagger 帧、单字 rise 帧完成，CJK 按字错峰视觉等价词升）；
// emphasis 子串染 accent；末字落定后 ruleDelay 帧尾部规线 scaleX easeInOutCubic 画出。纯位移无回弹，适配"无回弹"系卡契约。
// 颜色全 props（kit 不引 recipes 防循环依赖）。N 缺省 useCurrentFrame()+1；Sequence 内传 N = fromN + useCurrentFrame()。
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {clamp01, easeOutCubic, easeInOutCubic} from '../easing';

export const GoldenQuote: React.FC<{
  text: string;
  from: number;
  emphasis?: string;
  N?: number;
  size?: number;
  ink?: string;
  accent?: string;
  stagger?: number;
  rise?: number;
  rule?: boolean;
  ruleDelay?: number;
  outFade?: number;
  to?: number;
  y?: number | string;
  fontFamily?: string;
}> = ({text, from, emphasis, N: nProp, size = 84, ink = '#FFFFFF', accent, stagger = 2, rise = 13, rule = true, ruleDelay = 6, outFade = 0, to, y = '42%', fontFamily = `'Noto Serif SC', 'Noto Sans SC', serif`}) => {
  const rel = useCurrentFrame();
  const N = nProp ?? rel + 1;
  const chars = Array.from(text);
  const emIdx = emphasis ? text.indexOf(emphasis) : -1;
  const emLen = emphasis ? Array.from(emphasis).length : 0;
  const lastDone = from + (chars.length - 1) * stagger + rise;
  const outP = to !== undefined && outFade > 0 ? clamp01((to - N) / outFade) : 1;
  if (outP <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: y, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: outP, pointerEvents: 'none'}}>
      <div style={{overflow: 'hidden', padding: '0.06em 0.1em', fontFamily, fontSize: size, fontWeight: 900, lineHeight: 1.16, letterSpacing: '-0.01em', whiteSpace: 'nowrap'}}>
        {chars.map((ch, i) => {
          const p = easeOutCubic(clamp01((N - from - i * stagger) / Math.max(1, rise)));
          const isEm = emIdx >= 0 && i >= emIdx && i < emIdx + emLen;
          return (
            <span key={i} style={{display: 'inline-block', transform: `translateY(${(1 - p) * 105}%)`, color: isEm ? accent ?? ink : ink}}>
              {ch}
            </span>
          );
        })}
      </div>
      {rule && (
        <div style={{width: 132, height: 4, marginTop: 26, background: accent ?? ink, transformOrigin: '0 50%', transform: `scaleX(${easeInOutCubic(clamp01((N - lastDone - ruleDelay) / 18))})`}} />
      )}
    </div>
  );
};
