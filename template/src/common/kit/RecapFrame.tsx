// 一帧复习（v3.9.0 配方层四件套之四；结构借鉴 lanshu-create-ai-presenter-video recap，MIT——Remotion 重写）。
// 中心 tagline + 要点网格（≤3 个单列、>3 个双列）错峰升起入场；全部就位后阅读高亮轮巡（active 要点标题/序号转 accent，
// 轮巡步长按剩余时长均分，lanshu step=max(0.45s, 剩余/点数) 换算帧）；全程恒速微推 scale(1+0.03k)——90% 分量是线性 t，
// 结尾绝不归于静止（服务 beat sheet「结尾定帧必须带微动效」纪律，配合 probe_liveness 的 MAD 非零判据）。
// 颜色全 props（kit 不引 recipes 防循环依赖）。N 缺省 useCurrentFrame()+1；Sequence 内传 N = fromN + useCurrentFrame()。
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {clamp01, easeOutCubic, easeOutQuad} from '../easing';

/** 恒速微推：前 riseTail 帧缓出起步，之后 90% 权重保持线性——与 styles/blueprint 的 easeConstantPush 同源公式。 */
export const constantPush = (N: number, from: number, to: number, riseTail = 18) =>
  easeOutQuad(clamp01((N - from) / riseTail)) * 0.1 + 0.9 * clamp01((N - from) / Math.max(1, to - from));

export const RecapFrame: React.FC<{
  tagline: string;
  points: Array<{title: string; text: string}>;
  from: number;
  to: number;
  N?: number;
  taglineSize?: number;
  ink?: string;
  accent?: string;
  muted?: string;
  stagger?: number;
  rise?: number;
  fontFamily?: string;
}> = ({tagline, points, from, to, N: nProp, taglineSize = 56, ink = '#FFFFFF', accent, muted = 'rgba(255,255,255,0.62)', stagger = 5, rise = 12, fontFamily = `'Noto Sans SC', 'PingFang SC', sans-serif`}) => {
  const rel = useCurrentFrame();
  const N = nProp ?? rel + 1;
  if (N < from || N > to) return null;
  const ac = accent ?? ink;
  const twoCol = points.length > 3;
  const settled = from + 20 + (points.length - 1) * stagger + rise; // 全部就位（tagline 20f 升起 + 末点落定）
  const step = Math.max(14, Math.floor((to - 10 - settled) / Math.max(1, points.length))); // 阅读高亮步长（帧）
  const active = N < settled ? -1 : Math.floor((N - settled) / step) % points.length;
  const push = constantPush(N, from, to);
  return (
    <div style={{position: 'absolute', inset: 0, transform: `scale(${1 + 0.03 * push})`, fontFamily, pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: '14%', textAlign: 'center'}}>
        <div style={{overflow: 'hidden', display: 'inline-block'}}>
          <span style={{display: 'inline-block', fontSize: taglineSize, fontWeight: 900, color: ink, transform: `translateY(${(1 - easeOutCubic(clamp01((N - from) / 20))) * 105}%)`}}>
            {tagline}
          </span>
        </div>
      </div>
      <div style={{position: 'absolute', left: '10%', right: '10%', top: '34%', bottom: '12%', display: 'grid', gridTemplateColumns: twoCol ? '1fr 1fr' : '1fr', columnGap: 56, rowGap: 34, alignContent: 'center'}}>
        {points.map((pt, i) => {
          const p = easeOutCubic(clamp01((N - from - 20 - i * stagger) / Math.max(1, rise)));
          const on = i === active;
          return (
            <div key={i} style={{opacity: p, transform: `translateY(${(1 - p) * 20}px)`, borderTop: `2px solid ${on ? ac : muted}`, paddingTop: 14}}>
              <div style={{display: 'flex', alignItems: 'baseline', gap: 10}}>
                <span style={{fontSize: 30, fontWeight: 900, color: on ? ac : muted}}>{i + 1}</span>
                <span style={{fontSize: 30, fontWeight: 700, color: on ? ac : ink}}>{pt.title}</span>
              </div>
              <div style={{fontSize: 24, lineHeight: 1.5, color: muted, marginTop: 8}}>{pt.text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
