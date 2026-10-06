import React from 'react';
import {useCurrentFrame} from 'remotion';
import {FONT_HEAVY} from './lib';
import {kf} from './easing';
import {fitSize} from './textfit';
import {TOTAL_FRAMES, CHAPTER_STARTS} from './timeline';
import {arcAccent} from '../ui';
import {getActiveRecipe} from '../recipes';

/**
 * 底部章节进度条（半透明条体 y687–720、填充右缘 x=1280·N/TOTAL、n−1 根分隔线、章节名粗黑斜体 24px），来源于一条 MG 科普原片的实测模型（半透明条体 y687–720、填充右缘 x=1280·N/TOTAL、3 根分隔线、4 个章节名粗黑斜体 24px），
 * 章节切换帧来自 timeline.ts（tts_build.py 自动生成），当前章高亮保持到片尾。章名 ≤6 字为宜。
 * v3.3.0 chrome token：填充/轨道/章名/分隔线/辉光从配方 chrome 读取（风格皮肤可覆写）；缺省 chrome 与旧字面量逐值等价。
 */
export const PROGRESS_ALPHA = 0.52;
/** @deprecated 旧字面量别名（chrome 化后仅作历史参照；取色请用 getActiveRecipe().chrome.barFill/barTrack）。 */
export const FILL_RGBA = 'rgba(190,170,250,0.52)';
/** @deprecated 同上。 */
export const TRACK_RGBA = 'rgba(243,243,243,0.32)';
export const BAR_TOP = 687;
export const BAR_H = 720 - BAR_TOP;
const NCH = Math.max(1, CHAPTER_STARTS.length);
export const DIVIDERS = Array.from({length: NCH - 1}, (_, i) => Math.round(((i + 1) * 1280) / NCH)); // n 章等宽分隔
export const DIVIDER_W = 4;
const CENTERS = Array.from({length: NCH}, (_, i) => Math.round(((i + 0.5) * 1280) / NCH));
export const CHAPTERS: Array<{text: string; cx: number; from: number}> = CHAPTER_STARTS.map((c, i) => ({text: c.title, cx: CENTERS[i] ?? 640, from: c.from}));
export const CHAPTER_HIGHLIGHT_END = TOTAL_FRAMES + 1;
export const LABEL_SIZE = 24;
export const LABEL_SLOT_W = Math.round(1280 / NCH) - 30; // 章名不得压到分隔线上（英文章名长，自动缩到 17px 兜底）
export const LABEL_SCALE_Y = 0.9;
export const LABEL_TOP = 690.5;
export const LABEL_SKEW = -10;
export const LABEL_DIM_ALPHA = 0.55;

export const currentChapter = (N: number) => {
  if (N >= CHAPTER_HIGHLIGHT_END) return -1;
  let idx = -1;
  for (let i = 0; i < CHAPTERS.length; i++) if (N >= CHAPTERS[i].from) idx = i;
  return idx; // 片头（第一章开始前）无高亮
};

export const ProgressBar: React.FC<{dimKf?: Array<[number, number]>; frame?: number}> = ({dimKf = [], frame}) => {
  const cur = useCurrentFrame();
  const N = frame ?? cur + 1;
  const fillW = (1280 * N) / TOTAL_FRAMES;
  const dim = dimKf.length ? kf(N, dimKf) : 1;
  const ch = currentChapter(N);
  const chrome = getActiveRecipe().chrome;
  // U10 当前章焦点色：chrome 钉色优先，否则走 U1 色彩弧线（无 colorArc 配置时恒等于 PAL.accent = #6630F8）。
  const acc = chrome.barLabelActive ?? arcAccent(N);
  const hair = chrome.barHair ?? acc;
  return (
    <div style={{position: 'absolute', left: 0, top: BAR_TOP, width: 1280, height: BAR_H, pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 1280, height: BAR_H, transform: 'translateY(0.25px)'}}>
        <div style={{position: 'absolute', left: fillW, top: 0, width: 1280 - fillW, height: BAR_H, background: chrome.barTrack}} />
        <div style={{position: 'absolute', left: 0, top: 0, width: fillW, height: BAR_H, background: chrome.barFill}} />
        {/* U10：填充层顶部 2px accent 发丝线（+66 辉光），让「已播进度」的右缘可读；chrome.barGlow=false 时去辉光（纸/平色皮肤） */}
        <div style={{position: 'absolute', left: 0, top: 0, width: fillW, height: 2, background: hair, ...(chrome.barGlow ? {boxShadow: `0 0 8px 1px ${hair}66`} : {})}} />
        {dim < 0.999 ? <div style={{position: 'absolute', left: 0, top: 0, width: 1280, height: BAR_H, background: '#000', opacity: 1 - dim}} /> : null}
      </div>
      {DIVIDERS.map((x) => (
        // U10：分隔线 0.9 → 0.55，不再与当前章高亮争夺注意力
        <div key={x} style={{position: 'absolute', left: x - DIVIDER_W / 2, top: 693 - BAR_TOP, width: DIVIDER_W, height: 22, background: chrome.barDivider}} />
      ))}
      {CHAPTERS.map((c, i) => (
        <div
          key={c.text}
          style={{
            position: 'absolute', left: c.cx, top: LABEL_TOP - BAR_TOP,
            transform: `translateX(-50%) skewX(${LABEL_SKEW}deg) scaleY(${LABEL_SCALE_Y})`, transformOrigin: '50% 50%',
            whiteSpace: 'nowrap', fontFamily: FONT_HEAVY, fontWeight: 900, fontSize: fitSize(c.text, LABEL_SLOT_W, LABEL_SIZE, 17), lineHeight: 1,
            // U10：当前章 白 → 焦点色 + 10px 辉光；非当前章维持半透（chrome.barGlow=false 时去辉光）
            color: i === ch ? acc : chrome.barLabel,
            ...(i === ch && chrome.barGlow ? {textShadow: `0 0 10px ${acc}80`} : {}),
          }}
        >
          {c.text}
        </div>
      ))}
    </div>
  );
};
