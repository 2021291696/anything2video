import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {FONT_WIDE, H, W} from '../../common';
import {CText, MonoText, Pill, SoftIn} from '../../ui';
import {LightBar, countTo, sweepX} from '../../fx';
import {PROMO} from '../../recipes';
import {BenefitCard, BrandBar, CtaEnd, HookTitle, ProofCard} from '../../overlay/promo';

/**
 * promo 配方演示合成（PromoDemo，独立于主合成 Video）：6 拍 × 60 帧占位演示——
 * 片头钩子 / 卖点 1 / 卖点 2 / 证明 / CTA / 片尾，全走 overlay/promo 组件族 + promo palette（深空黑底 + 电光青图元），
 * 不依赖讲解片 timeline（SENTENCES/timeline.ts）。只作配方视觉验收，正式宣传片按分镜表另写镜头。
 */
// promo 专属组件恒定走 PROMO 配方，不随 config.recipe 漂移（演示合成才能稳定预览宣传视觉）
const PAL = PROMO.palette;
export const BEAT_LEN = 60; // 每拍帧数
export const PROMO_DEMO_FRAMES = BEAT_LEN * 6;

/** promo 幕底占位：深空黑底上的暗青点阵（确定性图元；正式配方如需星点/雾底，走 common/StarField|Fog 的 BG 覆写）。 */
const PromoBackdrop: React.FC = () => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', left: 0, top: 0}}>
    {Array.from({length: 9}, (_, r) =>
      Array.from({length: 16}, (_, c) => (
        <circle key={`${r}-${c}`} cx={((c + 0.5) * W) / 16} cy={76 + r * 71} r={2} fill={PAL.accent} opacity={0.05 + ((r * 3 + c) % 5) * 0.018} />
      )),
    )}
  </svg>
);

// ---- 拍 1｜片头钩子：主色光条两轮横扫 + HookTitle ----
const BeatHook: React.FC = () => {
  const N = useCurrentFrame() + 1;
  return (
    <>
      {[0, 2].map((off, i) => {
        const n = N - 2 - off;
        if (n < 0 || n > 16) return null;
        return <LightBar key={i} x={sweepX(n, 520, 16)} y={i ? 402 : 214} w={520} h={i ? 10 : 6} alpha={0.5 * (1 - Math.pow(n / 16, 6))} />;
      })}
      <HookTitle N={N} f0={8} kicker="ANYTHING2VIDEO" text="把任何素材变成宣传片" />
      <SoftIn N={N} f0={32} dy={8}>
        <CText cx={640} cy={472} size={26} weight={500} color={PAL.grey} letterSpacing={4}>60 秒 · 6 拍 · 一条成片</CText>
      </SoftIn>
    </>
  );
};

// ---- 拍 2｜卖点 1：卖点卡双卡错峰，左卡 active ----
const BeatBenefit1: React.FC = () => {
  const N = useCurrentFrame() + 1;
  return (
    <>
      <SoftIn N={N} f0={4} dy={6}>
        <Pill x={440} y={128} w={400} h={46} fill={PAL.accent} sw={0} text="卖点 01" fontSize={24} weight={800} color={PAL.pillTextOnAccent} letterSpacing={6} textDy={-2} glow={PAL.glowAccentS} />
      </SoftIn>
      <BenefitCard N={N} f0={10} x={160} y={236} title="一键成片" sub="丢进素材，脚本、画面、配音一次生成" active />
      <BenefitCard N={N} f0={18} x={680} y={236} title="品牌换色" sub="accentFromBrand：换主色即整片换肤" />
    </>
  );
};

// ---- 拍 3｜卖点 2：镜像布局，右卡 active（辅助橙标签，展示 secondary 位） ----
const BeatBenefit2: React.FC = () => {
  const N = useCurrentFrame() + 1;
  return (
    <>
      <SoftIn N={N} f0={4} dy={6}>
        <Pill x={440} y={128} w={400} h={46} fill={PAL.secondary} sw={0} text="卖点 02" fontSize={24} weight={800} letterSpacing={6} textDy={-2} glow={PAL.glowSecondary} />
      </SoftIn>
      <BenefitCard N={N} f0={10} x={160} y={236} title="多平台尺寸" sub="竖版 / 横版 / 方版一次导出" />
      <BenefitCard N={N} f0={18} x={680} y={236} title="节奏可控" sub="每拍 60 帧，按秒编排卖点顺序" active />
    </>
  );
};

// ---- 拍 4｜证明：大数字计数 + 来源小字 ----
const BeatProof: React.FC = () => {
  const N = useCurrentFrame() + 1;
  return (
    <ProofCard
      N={N} f0={8} x={240} y={200} value={countTo(N - 8, 0, 12800)} unit="条成片已生成" label="内测 30 天"
      source="来源：anything2video 内测数据 · 2026-09（占位演示）"
    />
  );
};

// ---- 拍 5｜CTA：行动号召端板 ----
const BeatCta: React.FC = () => {
  const N = useCurrentFrame() + 1;
  return <CtaEnd N={N} f0={6} headline="现在，就现在" cta="免费开始" sub="打开 anything2video，60 秒出第一条宣传片" />;
};

// ---- 拍 6｜片尾：品牌收尾（占位 logo 方块 + 品牌名 + slogan） ----
const BeatEnd: React.FC = () => {
  const N = useCurrentFrame() + 1;
  return (
    <SoftIn N={N} f0={6} len={14} dy={0}>
      <div style={{position: 'absolute', left: 640 - 64, top: 252, width: 128, height: 128, borderRadius: 28, background: `linear-gradient(145deg, ${PAL.accent}, ${PAL.accentDeep})`, boxShadow: PAL.glowAccent}} />
      <CText cx={640} cy={462} size={64} weight={900} family={FONT_WIDE} letterSpacing={8} style={{textShadow: `6px 6px 0 ${PAL.accentDeep}`}}>A2V</CText>
      <CText cx={640} cy={528} size={24} weight={500} color={PAL.grey} letterSpacing={4}>让任何素材开口说话</CText>
    </SoftIn>
  );
};

const BEATS: React.FC[] = [BeatHook, BeatBenefit1, BeatBenefit2, BeatProof, BeatCta, BeatEnd];

export const PromoDemo: React.FC = () => (
  <AbsoluteFill style={{background: PAL.bg}}>
    <PromoBackdrop />
    {BEATS.map((Beat, i) => (
      <Sequence key={i} from={i * BEAT_LEN} durationInFrames={BEAT_LEN}>
        {/* 拍号角标（QC 用）+ 本拍镜头 */}
        <MonoText x={28} y={26} size={18} color={PAL.grey} opacity={0.7}>{`PROMO · 拍 ${i + 1}/6`}</MonoText>
        <Beat />
      </Sequence>
    ))}
    {/* 常驻品牌条（promo 的"进度条"位） */}
    <BrandBar brand="ANYTHING2VIDEO" slogan="60 秒，任何素材成宣传片" total={PROMO_DEMO_FRAMES} />
  </AbsoluteFill>
);
