import type {ShotDef, BgSpec} from '../common';
import {TOTAL_FRAMES} from '../common';
import {VIDEO} from '../config';
import {Title, TITLE_RANGE, ChapterCard, CHAPTER_CARDS, Hud, HUD_RANGE, Rail, RAILS, Ending, ENDING_RANGE, EndingTop, ENDING_TOP_RANGE, EndingCard} from './Overlay';
// 覆盖层（由主会话维护，构建组不要画这些）：片头 / 章节卡 / 顶部 HUD 胶囊 / 流程轨 / 片尾压黑。层序最低（Main 里排最前）。
export const SHOTS_OVERLAY: ShotDef[] = [
  {id: 'OV-Title', from: TITLE_RANGE[0], to: TITLE_RANGE[1], Comp: Title},
  ...CHAPTER_CARDS.map((c) => ({id: `OV-Chapter${c.n}`, from: c.from, to: c.to, Comp: (() => ChapterCard({card: c})) as unknown as React.FC})),
  ...(HUD_RANGE[1] > HUD_RANGE[0] ? [{id: 'OV-Hud', from: HUD_RANGE[0], to: HUD_RANGE[1], Comp: Hud}] : []),
  ...RAILS.map((r, i) => ({id: `OV-Rail${i + 1}`, from: r.from, to: r.to, Comp: (() => Rail({spec: r})) as unknown as React.FC})),
];
// 压在全部内容之上：片尾压黑（进度条之下）+ 末 30 帧连进度条一起压黑（aboveBar）
// + 片尾收束卡（val-pixel 黑尾预案回灌，可选：仅 config.conclusionLine 存在时挂载，缺省 undefined=不挂载、DOM 零增量；
//   aboveBar 且排在 EndingTop 之后 → 数组序即层序，进度条压黑后卡仍在其上持续到片尾末帧；区间=ENDING_RANGE 完整覆盖设计黑场不留缝）
export const SHOTS_OVERLAY_TOP: ShotDef[] = [
  {id: 'OV-Ending', from: ENDING_RANGE[0], to: ENDING_RANGE[1], Comp: Ending},
  {id: 'OV-EndingTop', from: ENDING_TOP_RANGE[0], to: ENDING_TOP_RANGE[1], Comp: EndingTop, layer: 'aboveBar'},
  ...(VIDEO.conclusionLine ? [{id: 'OV-EndingCard', from: ENDING_RANGE[0], to: ENDING_RANGE[1], Comp: EndingCard, layer: 'aboveBar' as const}] : []),
];
export const BG_OVERLAY: BgSpec[] = [
  {from: 1, to: 10, fog: false, stars: 'none'},
  {from: TOTAL_FRAMES - 40, to: TOTAL_FRAMES, fog: false, stars: 'none'},
];
