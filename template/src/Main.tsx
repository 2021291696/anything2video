import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {Fonts, BgTrack, DotFieldBg, FootageTrack, ProgressBar, Subtitles, ThroughlineFromSpec, FrameGrade} from './common';
import type {ShotDef, BgSpec, FootageSpec} from './common';
import {VIDEO} from './config';
import {getActiveRecipe} from './recipes';
import {SHOTS_OVERLAY, SHOTS_OVERLAY_TOP, BG_OVERLAY} from './overlay';
import {BrandBar, BrandCap} from './overlay/promo';
import {SHOTS_G1, BG_G1, FOOTAGE_G1} from './shots/G1';
import {SHOTS_G2, BG_G2, FOOTAGE_G2} from './shots/G2';
import {SHOTS_G3, BG_G3, FOOTAGE_G3} from './shots/G3';
import {SHOTS_G4, BG_G4, FOOTAGE_G4} from './shots/G4';
import {SHOTS_G5, BG_G5, FOOTAGE_G5} from './shots/G5';
import {SHOTS_G6, BG_G6, FOOTAGE_G6} from './shots/G6';
import {SHOTS_G7, BG_G7, FOOTAGE_G7} from './shots/G7';
import {SHOTS_G8, BG_G8, FOOTAGE_G8} from './shots/G8';

// 1280×720@30fps，帧号 N = useCurrentFrame()+1（1 起含端点）。
// z 序（低→高）：底色 < 幕底（config.bg：雾底 Fog + 星点 StarField，或点阵波 DotFieldBg）< 实拍 FootageTrack < 覆盖层 < 镜头 G1–G8 < 片尾压黑 < 进度条 < aboveBar 镜头 < 贯穿元素 Throughline（可选）< 收尾层 FrameGrade（可选）< 字幕。
// 镜头组件不要画不透明黑底（会盖掉雾底星点）；需要纯黑处用 BG_Gn 覆写 {fog:false, stars:'none'}。
// 配方开关（config.VIDEO.recipe）：explainer 走原覆盖层（片头/章节卡/HUD/流程轨/片尾）+ 章节进度条 + 字幕带；
// promo 走 overlay/promo 组件族（钩子/卖点/证明/CTA 由镜头按拍取用），常驻底条换 BrandBar 品牌条、
// 无字幕带（关键词大字由镜头绘制）、无片尾压黑，画布底/雾底取配方 token（PAL.bg / PAL.bgFog）。
const PROMO = VIDEO.recipe === 'promo';
const PAL = getActiveRecipe().palette;
const OVERLAY_SHOTS: ShotDef[] = PROMO ? [] : SHOTS_OVERLAY;
const OVERLAY_TOP_SHOTS: ShotDef[] = PROMO ? [] : SHOTS_OVERLAY_TOP;
export const Stage: React.FC<{shots: ShotDef[]; bg: BgSpec[]; footage?: FootageSpec[]; audio?: boolean}> = ({shots, bg, footage = [], audio = false}) => (
  <AbsoluteFill style={{background: PAL.bg}}>
    <Fonts />
    {audio ? <Audio src={staticFile(`assets/${VIDEO.slug}/audio.wav`)} /> : null}
    {VIDEO.bg === 'dots' ? <DotFieldBg specs={bg} /> : <BgTrack specs={bg} />}
    <FootageTrack specs={footage} />
    {shots.filter((s) => s.layer !== 'aboveBar').map((s) => (
      <Sequence key={s.id} from={s.from - 1} durationInFrames={s.to - s.from + 1}>
        <s.Comp />
      </Sequence>
    ))}
    {/* promo 常驻层：顶部品牌帽（hookUntil/ctaFrom 按分镜表传：钩子镜结束后入场、CtaEnd f0 前淡出）+ 底部品牌条（brand/slogan 换成本片品牌） */}
    {PROMO ? (
      <>
        <BrandCap brand={VIDEO.brand} hookUntil={VIDEO.brandHookUntil} ctaFrom={VIDEO.brandCtaFrom} />
        <BrandBar brand={VIDEO.brand} slogan={VIDEO.brandSlogan} />
      </>
    ) : <ProgressBar />}
    {shots.filter((s) => s.layer === 'aboveBar').map((s) => (
      <Sequence key={s.id} from={s.from - 1} durationInFrames={s.to - s.from + 1}>
        <s.Comp />
      </Sequence>
    ))}
    {/* U11 贯穿元素：插在内容层（aboveBar 镜头）之上、字幕之下，不改变既有层的相对顺序；缺省 undefined = 完全不渲染、DOM 零增量 */}
    {VIDEO.throughline ? <ThroughlineFromSpec spec={VIDEO.throughline} /> : null}
    {/* U12 全局收尾层：与 Throughline 同区（aboveBar 之上、字幕之下）——暗角/噪点/色偏作用于全部内容层，字幕带保持原亮度优先可读；
        缺省 undefined = 暗角/噪点/色偏三项全关、DOM 零增量 */}
    {VIDEO.grade ? <FrameGrade {...VIDEO.grade} /> : null}
    {(VIDEO.subs ?? (PROMO ? 'none' : 'cn')) !== 'none' && (
      <Subtitles bilingual={VIDEO.subs === 'bilingual'} />
    )}
  </AbsoluteFill>
);

const SHOTS = [...OVERLAY_SHOTS, ...SHOTS_G1, ...SHOTS_G2, ...SHOTS_G3, ...SHOTS_G4, ...SHOTS_G5, ...SHOTS_G6, ...SHOTS_G7, ...SHOTS_G8, ...OVERLAY_TOP_SHOTS];
const BG = [...BG_OVERLAY, ...BG_G1, ...BG_G2, ...BG_G3, ...BG_G4, ...BG_G5, ...BG_G6, ...BG_G7, ...BG_G8];
const FOOTAGE = [...FOOTAGE_G1, ...FOOTAGE_G2, ...FOOTAGE_G3, ...FOOTAGE_G4, ...FOOTAGE_G5, ...FOOTAGE_G6, ...FOOTAGE_G7, ...FOOTAGE_G8];
export const Video: React.FC = () => <Stage shots={SHOTS} bg={BG} footage={FOOTAGE} audio />;
