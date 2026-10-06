/**
 * 配方体系共享类型。同一引擎支持多种视频类型：每种配方 = 一套调色板 + 一族覆盖层。
 * token 的取值锚点（explainer 逐值等于 a2e 原实测常量）见 recipes/explainer.ts；promo 规范见 recipes/promo.ts。
 */
export type RecipeId = 'explainer' | 'promo' | 'epic';
export type OverlaySet = 'explainer' | 'promo' | 'epic';
/** 配方调色板：主色系 + 语义色 + 背景系 + 光效系（光效字符串与 a2e 原值同构，只换基色）。 */
export type RecipePalette = {
  // ---- 主色系：当前重点 / 激活 / 品牌 ----
  accent: string; // 主色
  accentLight: string; // 亮主色（高光端 / 穿过进度条后 / 激活卡边）
  accentTech: string; // 英文技术词主色（Exo 2）
  accentDeep: string; // 深主色（曲线 / 硬投影）
  accentPale: string; // 浅主色（淡底）
  // ---- 语义色 ----
  secondary: string; // 辅助色：指标数字 / 另一强调位
  secondaryAlt: string; // 辅助色变体（红叉用）
  warning: string; // 警示块
  correct: string; // 正确（绿勾）
  // ---- 背景系 ----
  bg: string; // 幕底 / 画布底
  bgFog: string; // 雾底渐变末端
  bgPanel: string; // 面板 / 已过灰块底
  grey: string; // 非激活文字
  greyMid: string; // 灰块
  greyLine: string; // 网格线
  greyLight: string; // 文本线条 / 浅灰
  white: string; // 结构文字 / 描边
  magenta: string; // glitch 错位副本（品红端）
  cyan: string; // glitch 错位副本（青端）
  // ---- 光效系 ----
  glowAccent: string; // 主色双层柔光（大主角）
  glowAccentS: string; // 主色单层强柔光（active 卡 / 胶囊）
  glowSecondary: string; // 辅助色光
  glowWarning: string; // 警示光
  accentGlowRgb: string; // fx 内联 rgba 光效的基色 'r,g,b'（explainer 实测 102,45,248，与 accent 的 102,48,248 差 3，按原值保留）
  haloDark: string; // 光环渐变深端
  haloLight: string; // 光环渐变亮端
  techGlow: string; // 英文技术词光
  bloom: string; // 白色泛光（SVG 默认）
  bloomSoft: string; // 白色弱泛光
  textGlow: string; // 白字辉光
  pillShadow: string; // 胶囊描边光
  pillTextOnAccent: string; // 主色实底胶囊上的文字色（随主色联动；explainer=白，promo=主色深端）
  textShadowOnSolid: string; // 白字压实底兜底阴影（U15 配方级写法：上下 1px 暗边 + 与本配方 accent 同源的微光；explainer=紫系 / promo=青系。必填——新配方漏配会被 tsc 拦下）
};
/** 配方：同一引擎的一种视频类型。overlaySet 决定 Main 挂哪族覆盖层。
 *  accentFrom（发现 10）：合法主色集合断言——palette.accent 必须落在本集合内（getActiveRecipe 渲染前校验，
 *  不在则 console.error + 抛错，不允许静默渲出）。集合 = 模板正本色 + styles/ 各 SPEC 声明的主色抄录；
 *  accentFromBrand 换主色时必须同步把新色登记进集合（reference/brand-assets.md §3）。
 *  chrome（v3.3.0 起）：机身件色 token——字幕/进度条/结尾从调色板取色，风格皮肤（StyleSkin）可覆写，
 *  根治"配方机身件硬编码导致换风格时双材质系统"（qr-scan 2026-10-06 判例）。 */
export type Recipe = {id: RecipeId; name: string; palette: RecipePalette; chrome: ChromePalette; overlaySet: OverlaySet; accentFrom?: string[]};

/** 机身件色：值锚点 = v3.2.0 及以前 Subtitle/ProgressBar/Overlay 里的硬编码字面量（缺省即逐值等价）。
 *  带 ? 的 token 缺省时走 arcAccent(N)（色彩弧线联动，与旧行为一致）；皮肤想钉死色就显式给值。 */
export type ChromePalette = {
  subColor: string; // 字幕主色（旧字面量 #FFFFFF）
  subStroke: string; // 字幕描边环色（旧字面量 #000000）
  subAccent?: string; // 重点字幕色；缺省 = arcAccent(N)
  barFill: string; // 进度条已播填充（旧字面量 rgba(190,170,250,0.52)）
  barTrack: string; // 进度条未播轨道（旧字面量 rgba(243,243,243,0.32)）
  barLabel: string; // 非当前章名（含 alpha；旧字面量 rgba(255,255,255,0.55)）
  barDivider: string; // 章节分隔线（含 alpha；旧字面量 rgba(255,255,255,0.55)）
  barHair?: string; // 填充顶部发丝线；缺省 = arcAccent(N)
  barLabelActive?: string; // 当前章名；缺省 = arcAccent(N)
  barGlow: boolean; // 发丝线/当前章名辉光开关（暗底配方 true；纸/平色皮肤 false）
  endFade: string; // 片尾渐隐底色（旧字面量 #000000）
};

/** 风格侧：独立于配方的视觉皮肤。palette/chrome 均为浅合并覆写（未覆盖字段沿用配方默认）。
 *  11 个风格 = 3 张配方正本脸（值=现配方，保证吸收后逐值等价）+ 8 个 SKU（值从各 SPEC 锁死色板派生）。
 *  选型流程见 SKILL.md「确认与授权」：单问挑一张套餐卡（样片库 samples/index.html）。 */
export type StyleId =
  | 'deep-space' // 深空电光青（吸收自 promo）
  | 'mg-purple' // 紫调黑底 MG（吸收自 explainer）
  | 'epic-paper' // 暖纸白印章红描金（吸收自 epic）
  | 'sand'
  | 'chalk'
  | 'blueprint'
  | 'neon'
  | 'pixel-arcade'
  | 'paper-collage'
  | 'swiss-print'
  | 'crt-terminal';

/** 风格皮肤：accentLegal = 本风格合法主色集合（并入配方 accentFrom 参与断言，皮肤换血后不误伤）。 */
export type StyleSkin = {id: StyleId; name: string; accentLegal: string[]; palette: Partial<RecipePalette>; chrome: Partial<ChromePalette>};
