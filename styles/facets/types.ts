// facets 调色板与世界常量（分析立体主义样片，战役 v4 批次④）。
// 本卡纪律：锁死纸/米白/赭/棕/深棕/蓝灰系 token（11_cubism 配方色板血统），
// 短板修正（INDEX「偏亮，深褐大面不够」）：大面里 brown/dbrown 深褐族占比 ≥36%，随机小面加权重深色。
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）references/风格配方/11_cubism.md 与
// scripts/engine/scenes/11_cubism.js（265 行）——机制与参数级借鉴，全部 Remotion(React+TSX)+Canvas2D 重写，零整段拷贝。

/** 纸与叠面八色（分析立体主义锁死 token）。 */
export const C = {
  paper: '#d6c8ac',   // 画纸底
  cream: '#ece3cf',   // 米白
  ochre: '#b8975f',   // 赭
  brown: '#6e5538',   // 棕
  dbrown: '#3a2c1e',  // 深棕
  grey: '#a8a395',    // 灰
  bgrey: '#8e9eab',   // 蓝灰
  dgrey: '#5a5852',   // 暗灰
  ink: '#2e241a',     // 线墨（深棕黑）
} as const;

/** 窗景蓝灰族（窗外多视角世界的六色）。 */
export const WIN = ['#c9d3da', '#8fa3b3', '#e4e6e2', '#6f8597', '#b4c1cb', '#5f7385'] as const;

/** 人物 token（袖必须比裙深，否则手臂融进裙子切面——配方踩坑原话）。 */
export const FIG = {
  skin: '#e2cfae', skinA: '#e4d1b0', skinB: '#c9b28c', // 平涂底 / 脸部两块明暗重铺面
  facePlane: 'rgba(82,104,128,0.82)',                  // 毕加索式前半张脸蓝灰面
  hair: '#c9a256', dress: '#6a7a8b', sleeve: '#3c4857',
  collar: '#e9e2d0', collarD: '#bdb5a2', cuff: '#d9d4c4',
  lip: '#a8443a', iris: '#231a12', eyeWhite: '#efe8d8',
  cup: '#ebe6da', cupD: '#56606a', saucer: '#e8e0cc',
} as const;

/** 道具 token（吉他/报纸/CAFÉ 字/桌）。 */
export const PROP = {
  guitarBase: '#b8975f', guitarDark: '#6e5538', guitarDeep: '#3a2c1e',
  newsPaper: '#ebe3cc', newsInk: '#2b2219', newsFake: 'rgba(50,40,30,0.55)',
  cafeInk: '#3b2e22', tableWood: '#b98b52', tableWoodD: '#6e4a24',
  apron: '#5a4128', diamond: '#d8c39a', drawer: '#8a6a44',
} as const;

export const W = 1280, H = 720, FPS = 30;

/** 帧锚点（由 scripts/tts_build.py 实测时间轴校准：total 410f = 13.67s；S01 31-110 / S02 117-204 / S03 211-299 / S04 306-364）。 */
export const A = {
  /** 钩子结束帧：第一块大切面亮起 f1-13（0.43s < 0.5s）。 */
  HOOK: 13,
  /** 底版叠面整体显影完成帧。 */
  INTRO: 30,
  /** 人物平涂剪影入场窗 f38-52。 */
  FIG_IN: 38,
  FIG_IN_END: 52,
  /** 切面器开剪帧（「拆开」瞬间，S01「毕加索把脸拆开」句中）。 */
  CUT: 58,
  /** 外轮廓直线画出窗 f70-110（「碎片里藏着空间」）。 */
  SEGS: 70,
  SEGS_END: 110,
  /** 咖啡馆道具入场：报纸 f120-140 / 吉他 f148-175 / CAFÉ 字 f185-200。 */
  NEWS_IN: 120,
  NEWS_IN_END: 140,
  GUITAR_IN: 148,
  GUITAR_IN_END: 175,
  CAFE_IN: 185,
  CAFE_IN_END: 200,
  /** HERO：碎面重组 f240-262、蓝灰半脸 f246-262、正面杏眼+唇 f256-268（双视角完成锚 f268 = 65.4%，60-75% 窗口 f246-307 内）。 */
  HERO: 240,
  HERO_ASM: 262,
  DUAL: 268,
  /** 结尾定帧起点（f376-410 = 1.13s，0.8-1.2s 纪律；微动效：碎面明暗跳+报纸颤+窗格滑片+叠面错动）。 */
  FREEZE: 376,
} as const;

/** 总帧数（common/timeline.ts 由 tts_build 生成，此处冗余常量供 style 层钳制）。 */
export const TOTAL = 410;

export type CanvasCtx = CanvasRenderingContext2D;
export type Pt = [number, number];
