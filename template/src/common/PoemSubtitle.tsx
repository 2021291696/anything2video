import React from 'react';

/**
 * 诗行字幕三段式（epic 配方专用展示组件，回灌自 yunkai-promo《降灵》Rite.tsx RiteSub——2026-10-03 epic 配方落地轮升格入模板）：
 * 中文主行（Noto Serif SC 700 38px 白 + 黑描边投影，≤20 字）+ 分隔行（─── ✦ ───，章强调色）+ 英文行（Fraunces italic 22px 暖白）。
 * 数值即契约：与 recipes/epic.md §2 / §4 一致；窗管理（进出淡变）由调用方（overlay/epic 的 EpicSubtitles）负责，本组件只管展示。
 * 版式 token 见 overlay/epic/index.tsx 的 EPIC_LAYOUT（两处必须同步改）。
 */
export const POEM_STYLE = {
  /** 中文主行字号 */
  zhSize: 38,
  /** 英文行字号（约主行 60%——OPUS 实测比例） */
  enSize: 22,
  /** 分隔行字号 */
  sepSize: 13,
  /** 三段式块顶（画布 y） */
  top: 612,
} as const;

export const PoemSubtitleLine: React.FC<{zh: string; en?: string; accent?: string; opacity?: number; top?: number}> = ({zh, en, accent = '#C9A86A', opacity = 1, top = POEM_STYLE.top}) => (
  <div style={{position: 'absolute', left: 0, right: 0, top, textAlign: 'center', opacity, pointerEvents: 'none'}}>
    <div style={{fontFamily: `'Noto Serif SC', 'Songti SC', serif`, fontWeight: 700, fontSize: POEM_STYLE.zhSize, color: '#FFFFFF', letterSpacing: 2, textShadow: '0 2px 10px rgba(0,0,0,.85), 0 0 2px rgba(0,0,0,.9)', lineHeight: 1.3}}>{zh}</div>
    <div style={{marginTop: 6, color: accent, fontSize: POEM_STYLE.sepSize, letterSpacing: 2}}>───&nbsp;&nbsp;✦&nbsp;&nbsp;───</div>
    {en ? (
      <div style={{marginTop: 4, fontFamily: `'Fraunces', 'Georgia', serif`, fontStyle: 'italic', fontWeight: 400, fontSize: POEM_STYLE.enSize, color: 'rgba(233,223,197,.85)', letterSpacing: 1}}>{en}</div>
    ) : null}
  </div>
);
