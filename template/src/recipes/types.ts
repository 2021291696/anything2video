/**
 * 配方体系共享类型。同一引擎支持多种视频类型：每种配方 = 一套调色板 + 一族覆盖层。
 * token 的取值锚点（explainer 逐值等于 a2e 原实测常量）见 recipes/explainer.ts；promo 规范见 recipes/promo.ts。
 */
export type RecipeId = 'explainer' | 'promo';
export type OverlaySet = 'explainer' | 'promo';
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
 *  accentFromBrand 换主色时必须同步把新色登记进集合（reference/brand-assets.md §3）。 */
export type Recipe = {id: RecipeId; name: string; palette: RecipePalette; overlaySet: OverlaySet; accentFrom?: string[]};
