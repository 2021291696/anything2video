import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {SUBS} from './subs';
import {fitSize, textW} from './textfit';
import {arcAccent} from '../ui';

/**
 * 字幕：白 #FFF Noto Sans SC 700 44px、居中 x=640、CSS top 637（墨迹 y644–684）、黑描边 4px（16+8+4 方向 text-shadow 环，避免 -webkit-text-stroke 的尖角刺）、
 * 无底框（靠雾底衬托）、进出单帧硬切。条目由 scripts/tts_build.py 从配音词边界生成（每块中文 ≤16 字 / 英文 ≤48 字符）。
 * U5 两档：普通句维持 44px 白；SUBS 条目 emphasis=true 走重点档——54px（emphasisSize）+ 色彩弧线主色（accent(N)）+
 * 描边环之后追加 0 0 18px 辉光（环本身 16+8+4 不动，尖角刺不复发）。缺省全 false 时与旧版逐值等价。
 * 相邻块窗重叠时的交叉淡化（S11 同屏登记的共用层修正）见 SubSeq：重叠窗内两块透明度互补（和 ≤1），无重叠时逐值等价旧硬切。
 */
export const SUB_STYLE = {
  fontSize: 44,
  /** 重点档字号（U5）：emphasis=true 的字幕块用 54px。 */
  emphasisSize: 54,
  weight: 700,
  top: 637,
  color: '#FFFFFF',
  stroke: 4,
  strokeColor: '#000000',
  /** 重点档取色入口（U5，取自 U1 色彩弧线）：accent(N) 惰性包装（不 Top-level 调用，规避 common↔ui 循环 import 的模块初始化顺序问题）。
   *  无 colorArc 配置时恒等于 PAL.accent。返回 6 位 hex，供 66/80 等 8 位 alpha 后缀拼接。 */
  accent: (N: number): string => arcAccent(N),
};
export const SUB_MAX_W = 1160; // 安全区 x60–1220；超宽自动缩到 34px 兜底（中文 ≤16 字 / 英文 ≤48 字符本来就装得下）
const ring = (r: number, k: number, col: string) => Array.from({length: k}, (_, i) => {
  const a = (i / k) * Math.PI * 2;
  return `${(Math.cos(a) * r).toFixed(2)}px ${(Math.sin(a) * r).toFixed(2)}px 0 ${col}`;
});
export const strokeShadow = (w = SUB_STYLE.stroke, col = SUB_STYLE.strokeColor) => [...ring(w, 16, col), ...ring(w * 0.6, 8, col), ...ring(w * 0.3, 4, col)].join(', ');

export const SubtitleLine: React.FC<{text: string; top?: number; left?: number; color?: string; stroke?: number; emphasis?: boolean; fromN?: number; opacity?: number}> = ({text, top = SUB_STYLE.top, left = 640, color = SUB_STYLE.color, stroke = SUB_STYLE.stroke, emphasis = false, fromN, opacity = 1}) => {
  // 一块字幕默认单行（字幕带只有 53px 高）：超宽先缩字号到 34px。
  // 连 34px 都装不下（英文一块 >70 字符）→ 折成两行向上生长：会压进内容区，但比两头被裁掉可读。
  // 这是兜底不是设计，tts_build.py 生成时已按安全区宽度打过 ⚠，正确做法是用 | 再切一刀。
  // fromN：Subtitles 传入的字幕块起始绝对帧（Sequence 内 useCurrentFrame 是相对帧，N = fromN + rel 可还原绝对帧号），
  // 仅供 emphasis 取色彩弧线用；独立使用时不传，N = 帧号 + 1（模板惯例）。
  const rel = useCurrentFrame();
  const N = fromN !== undefined ? fromN + rel : rel + 1;
  const size = fitSize(text, SUB_MAX_W, emphasis ? SUB_STYLE.emphasisSize : SUB_STYLE.fontSize, 34);
  const lh = 1.2;
  const col = emphasis ? SUB_STYLE.accent(N) : color;
  const shadow = emphasis ? `${strokeShadow(stroke)}, 0 0 18px ${SUB_STYLE.accent(N)}66` : strokeShadow(stroke);
  const font: React.CSSProperties = {fontFamily: `'Noto Sans SC', 'PingFang SC', sans-serif`, fontWeight: SUB_STYLE.weight, fontSize: size, lineHeight: lh, color: col, textShadow: shadow};
  if (textW(text, size) <= SUB_MAX_W) {
    return <div style={{position: 'absolute', left, top, transform: 'translateX(-50%)', whiteSpace: 'nowrap', opacity, ...font}}>{text}</div>;
  }
  // 折行兜底：放一个两行高的盒子，底边贴在单行字幕的原位（flex 列向、底对齐）。
  // 这样不管 Chromium 实际折成 1 行还是 2 行（估宽和真实排版可能差几个百分点），最后一行都落在字幕带里；
  // 真折出第 3 行也只会向上溢出到内容区，不会压进进度条。
  const lineH = Math.round(size * lh);
  return (
    <div style={{position: 'absolute', left, top: top - lineH, transform: 'translateX(-50%)', width: SUB_MAX_W, height: lineH * 2, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', textAlign: 'center', whiteSpace: 'normal', opacity, ...font}}>
      <div>{text}</div>
    </div>
  );
};
/** 单条字幕块的可视化（Subtitles 内层组件）：按相邻块窗口重叠计算交叉淡化透明度（val-swiss 交付说明 S11 同屏登记的共用层修正）。
 *  手填/重排的 SUBS 相邻块窗可能重叠 3–5 帧，原实现两块同时满可见 = 叠影。修法（透明度互补，重叠窗内两块可见度之和恒 ≤1）：
 *  本块作为「前块」（与后块窗重叠）：自身末 fade=min(2, 重叠帧数) 帧线性淡出（每帧 −50%）；
 *  本块作为「后块」（与前块窗重叠）：前块窗走完（prev.to 帧，前块透明度恰归 0）才入场。
 *  无重叠（tts_build 生成的数据保证 to < 下块 from）时两段全不触发、opacity 恒 1 = 现状逐值。 */
const SubSeq: React.FC<{s: (typeof SUBS)[number]; alt?: string; bilingual: boolean; ovPrev: number; ovNext: number}> = ({s, alt, bilingual, ovPrev, ovNext}) => {
  const rel = useCurrentFrame(); // Sequence 内相对帧（0 = 绝对帧 s.from）
  let op = 1;
  if (ovNext > 0) {
    const fade = Math.min(2, ovNext);
    const left = s.to - (s.from + rel); // 距本块窗末的剩余帧数（末帧为 0）
    if (left < fade) op = Math.min(op, Math.max(0, left / fade));
  }
  if (ovPrev > 0 && rel < ovPrev - 1) op = 0; // 前块窗末帧（rel = ovPrev−1）前块归零，本块同帧入场
  return bilingual && alt
    ? <BilingualLine primary={s.text} secondary={alt} opacity={op} />
    : <SubtitleLine text={s.text} emphasis={s.emphasis ?? false} fromN={s.from} opacity={op} />;
};
export const Subtitles: React.FC<{bilingual?: boolean}> = ({bilingual = false}) => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    {SUBS.map((s, k) => {
      const alt = s.en ?? s.cn;
      const prev = SUBS[k - 1];
      const next = SUBS[k + 1];
      const ovPrev = prev && prev.to >= s.from ? prev.to - s.from + 1 : 0; // 与前块的重叠帧数（>0 = 本块入场时前块仍在窗内）
      const ovNext = next && next.from <= s.to ? s.to - next.from + 1 : 0; // 与后块的重叠帧数（>0 = 后块入场时本块仍在窗内）
      return (
        <Sequence key={k} from={s.from - 1} durationInFrames={Math.max(1, s.to - s.from + 1)}>
          {/* emphasis 只作用于单语主行（双语行两行字号本就不同档，不另设重点档）；缺省 false 与现状逐值等价 */}
          <SubSeq s={s} alt={alt} bilingual={bilingual} ovPrev={ovPrev} ovNext={ovNext} />
        </Sequence>
      );
    })}
  </AbsoluteFill>
);

/** 双语行：主行=旁白语言 40px（y622），副行=对照语言 23px（y668，米白细描边）。无进度条配方（promo/自定义）底部空到 720 正好放下；有进度条的配方会轻微压线，双语时建议关进度条或下移字幕带。 */
const BilingualLine: React.FC<{primary: string; secondary: string; opacity?: number}> = ({primary, secondary, opacity = 1}) => {
  const primarySize = fitSize(primary, SUB_MAX_W, 40, 30);
  const font: React.CSSProperties = {fontFamily: `'Noto Sans SC', 'PingFang SC', sans-serif`, textAlign: 'center'};
  return (
    <>
      <div style={{position: 'absolute', left: 640, top: 622, transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontWeight: 700, fontSize: primarySize, lineHeight: 1.15, color: '#FFFFFF', textShadow: strokeShadow(4), opacity, ...font}}>{primary}</div>
      <div style={{position: 'absolute', left: 640, top: 668, transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontWeight: 500, fontSize: 23, lineHeight: 1.1, color: '#EFE6CC', textShadow: strokeShadow(3), opacity, ...font}}>{secondary}</div>
    </>
  );
};
