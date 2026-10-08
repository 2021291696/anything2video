# SPEC：街机（pixel-arcade）

**入库日期**：2026-09-29（用户确认）｜**正本源工程**：`style-samples/src/styles-try/pixel-arcade/`（样片《午夜游戏厅》12s，用户确认）｜**图元库**：`pixel.tsx` + `PressStart2P-Regular.ttf`（OFL）
**风格句**：复古像素街机——8px 像素网格、有限色块阵、CRT 扫描线+暗角、阶梯缓动、大像素字。所有"圆"都是方块拼的。

## 锁死项
- **色 token**（`PIXEL_TOKENS`）：bg `#0d0f1c`｜panel `#1a1f3a`｜magenta `#ff3d81`｜green `#2ee6a8`｜gold `#ffc93c`｜white `#f4f6ff`；灰阶只允许 `GRAY` 两档（`#a2a2a6`/`#3c3c44`）。
- **像素契约**：所有"圆"= 方块拼；位移动画过 `stepped()`/`q()`（4px 网格量子）；随机只用 `rnd(i)=fract(sin(i*127.1)*43758.5)`（禁 Math.random/Date）。
- **字体**：Press Start 2P（OFL，ttf 已随库）——**无 CJK 字形**，中文文字用 Noto Sans SC 900 或避免大段中文上屏；`PixelFont` 组件负责注册。
- **CRT Post**：`CrtPost` 扫描线（阶梯微闪）+ 慢滚亮带（4px/帧）+ 暗角 + 玻璃内阴影，永远放最顶层；开机 `CrtBoot` 只在拍①。

## 词汇清单
`PixelText`（大字+闪烁）｜`PixelSprite`（字符画→块阵，同行同色合并控 DOM）｜`PixelRunner`（11×14 小人，3f 腿摆）｜`PixelCoin`（旋转高光）｜`PixelBurst`（块阵烟花）｜`PixelSky`（星阵+特写星+双层天际线视差）｜`PixelRoof`｜`CrtBoot`｜`CrtPost`｜缓动族 `stepped/stepScaleIn/after`。

## 复用适配点
1. `PixelFont` 的 `staticFile('fonts/PressStart2P-Regular.ttf')` → 把库内 ttf 拷进新项目 `public/fonts/`（路径不变）。
2. `icons`/sprite 字符画按新片主体增补（块阵画法，不引外部素材）。

## QC 豁免档
- 阶梯（stepped）动画在 probe_liveness 的平滑度判据下属风格本体；扫描线/暗角为 Post 层本体。
- 已知取舍：样片拍②③采用连贯奔跑契约（同风格新片沿用"主体跨拍不硬切"）。

## 样张
`sample.jpg` = 样片 3.0s 处（像素小人楼顶奔跑 + 金币列队 + HUD），回归三查对照基准。

## v4.0 opt-in 增强（2026-10-07 Wave B2）
**技法借鉴 mg-styles-15 demos/20-pixel (MIT, Vincentwei1021) 与 huashu-art-motion 14_8bit (MIT, alchaincyf), TSX 重写。** 本节全部 opt-in：不传新 prop 时既有组件输出与旧版逐值一致；默认输出不变。
- **`PixelTextCJK`**（补「Press Start 2P 无 CJK」已知缺口）：任意中文字符串 → canvas 栅格化（Noto Sans SC 900）→ 灰度阈值（默认 110，照抄源码 glyph()）→ 块阵（同行同色合并控 DOM）。`size/block/threshold/shadow/spacing` props 化；`shadow` 为 1 块右下阴影 pass（默认 `#000000`，传 null 关闭）。**确定性合同**：必须先挂 `PixelCjkFont`（`staticFile('fonts/NotoSansSC.ttf')` + delayRender/continueRender，同 `PixelFont` 模式）；组件渲染时 `document.fonts.check` 断言，字体未加载直接 throw（静默回退字体 = 不确定位图，禁）。
- **`PixelSprite` 新 props**：`outline`（per-part 1px 描边——空格块 4 邻域有实块即涂边色，每个连通部件各自出边，huashu 14_8bit「分层描边」契约）；`palette`（色板数组，全部颜色经 `paletteQuantize` 最近色量化，huashu 14 色角色板可传入）。
- **`paletteQuantize(color, palette)`**：最近色量化契约（加权 0.3/0.59/0.11 照抄源码 nearest()），纯函数。
- **`DitherBand`**：棋盘 `(x+y)%2` 抖动两色渐变带（NES 唯一渐变法）——u=by/(rows-1) 量化到 `bands` 档（默认 4），档内棋盘半档过渡；容器铺 `top` 色叠加 `bottom` 色 run。
- **`PixelLogo`**：块字构造器——文字→字形掩膜→cell 块阵→行深浅 ramp（r=行位×28/墨高 归一化，阈值 2/10/14/21/24 与档内棋盘混色照抄源码）→ 顶/左缘提亮 → `ext` cell 挤出（默认 4，柱色/尖端色两档）→ 1 cell 外描边 → 角部 glint（左上笔画角按 x 排序取 [0.04,0.78,0.36,0.96,0.58] 分位共 5 点，9f 周期轮换星芒、a<6 可见，确定性）。默认色 `LOGO_COLORS` 照抄 QUEST-32 ramp（M15/M14/M13/M12/M26/M9/M0/M7/白）——仅本组件在用色，出片如启用需在片级声明。
- 单测锚点：`glyphMask` 同输入两次（清缓存重算）逐像素一致；`maskFromAlpha` 输出只有 0/1 两态；canvas 工厂可注入（`setCanvasFactoryForTest`）供 node 侧断言。
