import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {clamp01} from '../../common/easing';
import {SUBS} from '../../common/subs';
import {PoemSubtitleLine} from '../../common/PoemSubtitle';
import {VIDEO} from '../../config';
import {getActiveRecipe} from '../../recipes';
import type {ShotDef} from '../../common';

/**
 * epic 配方常驻覆盖层族（Main 按 overlaySet:'epic' 挂载）：
 * - EpochBadge 年代角标：左上角标系统（recipes/epic.md §2——OPUS 七章左边距全对齐 x136 是版式锚）。
 *   数据源 config.epicChapters；窗内 12 帧淡入 12 帧淡出；左边距全片恒定，任何一章不得偏移（QC 判据 1）。
 * - EpicSubtitles 诗行字幕：三段式（PoemSubtitleLine），数据源 common/subs SUBS（zh=条目 text，en=对照行），
 *   窗内 8 帧淡入 8 帧淡出（RiteSub 先例）；分隔行取配方描金 secondary。
 * - EpicEndCard + EPIC_END_SHOTS：收口端板，config.epicEnd 存在时生成 aboveBar 镜头（CtaEnd 模式）。
 * 挂载纪律：epic 不挂 ProgressBar、不挂 Subtitles 旁白字幕带、不挂 explainer 覆盖层 shots（Main.tsx 分支）。
 * 版式数值即契约（与 recipes/epic.md §2 同源），改这里必须同步配方文档。
 */
export const EPIC_LAYOUT = {
  /** 角标短横线与文字列的公共左边距（全片恒定） */
  badgeX: 136,
  /** 角标年代行 top（画布 y） */
  eraY: 64,
  /** 角标地点·主题行 top */
  placeY: 100,
  /** 角标淡入淡出帧数 */
  badgeFade: 12,
  /** 诗行字幕淡入淡出帧数 */
  subFade: 8,
} as const;

const ease = (k: number) => clamp01(k);

/** 年代角标：短横线 + 年代行（Fraunces 700 22px 全大写字距 2）+ 地点·主题行（Noto Serif SC 300 15px 字距 6 暖灰） */
export const EpochBadge: React.FC = () => {
  const N = useCurrentFrame() + 1;
  const ch = VIDEO.epicChapters.find((c) => N >= c.from && N <= c.to);
  if (!ch) return null;
  const fin = ease((N - ch.from) / EPIC_LAYOUT.badgeFade);
  const fout = ease((ch.to - N) / EPIC_LAYOUT.badgeFade);
  const op = Math.min(fin, fout);
  if (op <= 0) return null;
  const pal = getActiveRecipe().palette;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, opacity: op, pointerEvents: 'none'}}>
      {/* 左侧短横线：x136–160, y86（垂直居中于年代行） */}
      <div style={{position: 'absolute', left: EPIC_LAYOUT.badgeX, top: 85, width: 24, height: 1, background: 'rgba(255,255,255,.65)'}} />
      <div style={{position: 'absolute', left: EPIC_LAYOUT.badgeX + 16, top: EPIC_LAYOUT.eraY}}>
        <div style={{fontFamily: `'Fraunces', 'Georgia', serif`, fontWeight: 700, fontSize: 22, letterSpacing: 2, color: 'rgba(255,255,255,.92)', textShadow: '0 1px 8px rgba(0,0,0,.7)'}}>{ch.era.toUpperCase()}</div>
        <div style={{fontFamily: `'Noto Serif SC', 'Songti SC', serif`, fontWeight: 300, fontSize: 15, letterSpacing: 6, color: pal.greyLight, marginTop: 10, textShadow: '0 1px 6px rgba(0,0,0,.6)'}}>{ch.place}</div>
      </div>
    </div>
  );
};

/** 诗行字幕层：遍历 SUBS（zh = 条目 text，en = 对照行 en），8 帧淡入淡出，同屏最多一条（章表诗行密度纪律保证） */
export const EpicSubtitles: React.FC = () => {
  const N = useCurrentFrame() + 1;
  const s = SUBS.find((x) => N >= x.from && N <= x.to);
  if (!s) return null;
  const fin = ease((N - s.from) / EPIC_LAYOUT.subFade);
  const fout = ease((s.to - N) / EPIC_LAYOUT.subFade);
  const op = Math.min(fin, fout);
  if (op <= 0) return null;
  const accent = getActiveRecipe().palette.secondary;
  return <PoemSubtitleLine zh={s.text} en={s.en} accent={`${accent}BF`} opacity={op} />;
};

/** 收口端板（展示组件，帧窗由 EPIC_END_SHOTS 的 Sequence 管）：✦ 呼吸 + 品牌主文 + 可选英文副标 + 可选日期行 */
export const EpicEndCard: React.FC<{zh: string; en?: string; date?: string}> = ({zh, en, date}) => {
  const N = useCurrentFrame();
  const pal = getActiveRecipe().palette;
  // 相对帧 0–59 淡入（≥2s 停留由 config.epicEnd 的窗长保证）；✦ 呼吸 = 首尾闭环标记（P0 火星 = EndCard 标）
  const op = ease(clamp01(N / 30));
  const breathe = 0.94 + 0.06 * Math.sin(N * 0.08);
  return (
    <AbsoluteFill style={{opacity: op, pointerEvents: 'none'}}>
      <AbsoluteFill style={{background: pal.bg}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 90% 80% at 50% 46%, rgba(0,0,0,0) 55%, rgba(94,27,20,0.10) 100%)'}} />
      {/* ✦ 印章红呼吸（贯穿符号归一为 logo）。⚠ 定位用显式锚点盒：transform 会创建 containing block，
          禁止在无 position 的包裹层内放 absolute 子元素（v1 实锤：inline-block+scale 把 ✦ 推到画布右上角）。 */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 236, height: 0}}>
        <div style={{position: 'absolute', left: '50%', top: 0, transform: `translate(-50%,-50%) scale(${breathe.toFixed(3)})`, width: 30, height: 30}}>
          {[0, 90, 180, 270].map((a) => (
            <div key={a} style={{position: 'absolute', left: 14, top: 1, width: 2, height: 28, background: pal.accent, transform: `rotate(${a}deg)`, borderRadius: 1}} />
          ))}
          {[45, 135, 225, 315].map((a) => (
            <div key={'d' + a} style={{position: 'absolute', left: 14.5, top: 9, width: 1.5, height: 12, background: pal.accent, transform: `rotate(${a}deg)`, borderRadius: 1, opacity: 0.8}} />
          ))}
        </div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 330, textAlign: 'center'}}>
        <div style={{fontFamily: `'Noto Serif SC', 'Songti SC', serif`, fontWeight: 700, fontSize: 84, color: '#2B2419', letterSpacing: 10}}>{zh}</div>
        {en ? <div style={{marginTop: 18, fontFamily: `'Fraunces', 'Georgia', serif`, fontStyle: 'italic', fontSize: 26, color: pal.accent, letterSpacing: 2}}>{en}</div> : null}
        {date ? <div style={{marginTop: 34, fontFamily: `'Fraunces', 'Georgia', serif`, fontSize: 16, letterSpacing: 4, color: pal.grey}}>{date}</div> : null}
      </div>
    </AbsoluteFill>
  );
};

/** config.epicEnd 存在时生成收口端板镜头（aboveBar：压在全部内容之上；缺省空数组 = DOM 零增量） */
export const EPIC_END_SHOTS: ShotDef[] = VIDEO.epicEnd
  ? [{id: 'EPIC-End', from: VIDEO.epicEnd.from, to: VIDEO.epicEnd.to, layer: 'aboveBar', Comp: (() => EpicEndCard({zh: VIDEO.epicEnd!.zh, en: VIDEO.epicEnd!.en, date: VIDEO.epicEnd!.date})) as unknown as React.FC}]
  : [];
