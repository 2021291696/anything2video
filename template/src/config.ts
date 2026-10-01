import type {ReactNode} from 'react';

/**
 * 片子级配置（唯一需要按主题改的文件之一；另一个是 script/narration.txt）。
 * 句 id（S01…）来自 scripts/tts_build.py 生成的 timeline.ts；章节数与标题来自 narration.txt 的 `# CHAPTER n 标题` 行。
 */
export type HudEntry = {fromS: string; toS: string; text: string; tech?: string; fromOffset?: number; toOffset?: number; w?: number};
export type RailSpec = {steps: string[]; switchS: string[]; fromS: string; toS: string};
export const VIDEO = {
  slug: 'demo', // 素材目录 public/assets/<slug>/（配音 audio.wav 由 tts_build.py 写到这里）
  /**
   * 配方：'explainer' 讲解片（默认，即 a2e 现有视觉：紫调 + HUD/章节卡/流程轨 + 章节进度条）｜
   * 'promo' 宣传片（深空黑底 #0B0B12 + 电光青，overlay/promo 组件族 + BrandBar 品牌条）。
   * 切换的是调色板/光效（src/ui.tsx、src/fx.tsx 经 recipes/getActiveRecipe() 派生）、覆盖层集合与底条（src/Main.tsx）；镜头代码零改动。
   * 两配方差异与选型详见 skill 的 recipes/ 文档。
   */
  recipe: 'explainer' as 'explainer' | 'promo',
  /**
   * 片子语言：'zh' 中文（默认）｜'en' 英文。
   * 影响 → 配音引擎（tts_build.py 的 TTS_ENGINE=auto 也会自己按解说词判语言）、标题/章节卡是否压窄（拉丁不压）、
   * 居中文字的基线补偿（CJK −2 / 拉丁 0）、文案与字幕块长度预算（见 reference/narration-storyboard.md §5）。
   */
  lang: 'zh' as 'zh' | 'en',
  /**
   * 字幕模式覆盖：'cn' 中文单语｜'bilingual' 中英双语（解说词句子下一行写 @EN:/@CN: 对照行，tts_build 解析进 subs.ts）｜'none' 无字幕。
   * 不设置时按配方惯例回退：explainer=cn，promo/自定义视觉=none。
   */
  subs: undefined as 'cn' | 'bilingual' | 'none' | undefined,
  /**
   * 幕底：'stars' 星点 + 雾底渐变（默认，样片风格）｜'dots' 点阵波（video-talkcraft dot-field-wave 移植，`common/DotFieldBg.tsx`）。
   * 两者互斥；镜头里的 BG_Gn 覆写（`stars:'none'` 关幕底）对两种方案都生效。frame_metrics.py 会按这里的值抠掉幕底再统计。
   */
  bg: 'stars' as 'stars' | 'dots',
  /**
   * 片头。中文片：big 用 Audiowide 宽体（缩写/英文词），rest 用 Noto 900（中文部分），en 是英文全称，tagline 一句话钩子。
   * 英文片：rest 留空 ''（不显示），big 放主词/缩写，en 放全称或副标，tagline 一句话钩子。
   */
  title: {big: 'RAG', rest: '与知识库', en: 'Retrieval-Augmented Generation', tagline: '让大模型开卷考试'},
  /** 章节英文副标（顺序对应 narration 的 CHAPTER 1..n；章节卡从第 2 章起显示）。⚠ 新片必须清掉占位/示例数据——残留示例若引用不存在的句 id，tsc 不报但运行时崩。 */
  chapterTech: [],
  /** 顶部 HUD 胶囊（当前小节名）：按句 id 区间；相邻条目之间自动无空档；跨章节卡自动淡出。⚠ 同上，新片置空或按本片句 id 重写。 */
  hud: [] as HudEntry[],
  /** 流程轨（可选，一章最多一条，五步以内）：y118–162。⚠ 同上，新片置空或按本片句 id 重写。 */
  rails: [] as RailSpec[],
  /** 片头帧数（tts_build 的 LEAD+CHAPTER_GAP 决定，通常 85）与片尾压黑（仅 explainer：promo 无片尾压黑，本项不生效） */
  endingFade: 30,
  /**
   * 片尾收束卡结论句（可选，黑尾预案·val-pixel 验证片回灌）：设置后片尾在压黑上淡入收束卡（片名 title.big/rest + 这一行结论），
   * 消除「纯黑仅进度条」的收束尾段；缺省 undefined = OV-EndingCard 完全不挂载、DOM 零增量、渲染逐帧不变。
   */
  conclusionLine: undefined as string | undefined,
  /**
   * promo 品牌三件套（explainer 不读）。brand 同时喂 BrandCap 与 BrandBar（单一事实源，占位值 YOUR-BRAND 上片前必须换）；
   * brandHookUntil=品牌帽入场帧（钩子镜结束帧，按分镜表传）；brandCtaFrom=品牌帽退场帧（CtaEnd f0，按分镜表传）。
   * ⚠ 换配音/重排时间轴时这两个帧号必须重锚（lessons 09-29④），当前 176/1030 是模板演示值。
   */
  brand: 'YOUR-BRAND',
  brandHookUntil: 176,
  brandCtaFrom: 1030,
  /** promo 品牌条 slogan（可空串=不显示） */
  brandSlogan: '',
  /**
   * 色彩弧线（审美锚之首，空数组=全片恒定主色、与现状像素级等价）：按句 id 锚定的主色/辅色序列，
   * 相邻锚点间 30 帧完成过渡；ui.tsx 的 arcAccent(N)/arcSecondary(N) 按 CHAPTER_STARTS 插值取值。
   */
  colorArc: [] as Array<{atS: string; accent: string; secondary: string}>,
  /** 全局收尾层（缺省 undefined=三项全关、DOM 零增量），见 common/FrameGrade.tsx：暗角/静态噪点/可选色偏 */
  grade: undefined as {vignette?: boolean; grain?: boolean; tint?: string; tintAlpha?: number} | undefined,
  /** 贯穿元素槽位（缺省 undefined=不挂载、DOM 零增量），见 common/Throughline.tsx：形态全片不变的独有记号 */
  throughline: undefined as {glyph: ReactNode; keyframes: Array<{from: number; x: number; y: number; s?: number; a?: number}>} | undefined,
};
