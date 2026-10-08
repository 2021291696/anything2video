# SPEC：纸艺立体书（popup-book）

**正本源工程**：`samples-l1/popup-book`（2026-10-07 验证交付）｜**图元库**：`src/style/kit.tsx` + `src/style/world.ts` + `src/style/Book.tsx` + `src/style/props.tsx` + `src/style/chrome.tsx`（纯 CSS transform + SVG data-URI，零纹理文件、零 3D 库、零真视频素材）
**风格句**：摊开的牛皮纸立体书 + 折起式纸片机关（rotateX 底缘铰链）+ 三层纸景视差 + 拉页转场 + 纸感阴影随折角呼吸。
**技法借鉴**：lanshu-create-ai-presenter-video（MIT, cclank）——v4-paper 的立体书视觉语法（折页/纸影/拉杆/视差世界），Remotion 重写，未拷贝任何代码。

## 锁死项
- **色 token**（`PAPER`）：kraftTop `#d9bf95`｜kraftMid `#c8a97e`（页面主调暖纸）｜kraftLow `#b3925f`｜surface `#fbf6ea`（白纸片）｜sand `#f1e4c8`｜ink `#4a3222`（深咖啡墨）｜muted `#7a5c3e`｜accent `#d96f4e`（烘焙珊瑚，每拍唯一重点色）｜sky `#c3d8e2`｜sage `#9db898`｜roast `#6b4226`｜beanTan `#c89b6b`｜cherry `#c4553f`｜flame `#e2a13c`。暖纸底上白纸片+深咖啡墨，珊瑚只给「本拍最重要的东西」。
- **纸纹**：SVG feTurbulence（fractalNoise，baseFrequency 0.9，numOctaves 3，**seed=7 固定**，stitchTiles）inline data-URI，multiply 叠印全帧（kit.tsx `Grain`）——确定性、无外部纹理文件。
- **纸片厚度**：`paperFace()` 统一式样——1px `rgba(74,50,34,0.22)` 描边 + 三层 box-shadow（`inset 0 -6px 0` 底缘受光 + `0 1px 0` 纸边 + `0 3px 0`/`0 12px 18px` 软投影）。
- **翻折动作（签名纪律）**：`FoldUp` = perspective 1100 容器 + 底缘铰链（transformOrigin 50% 100%）`rotateX` 90°→**-10°**（立定微后仰=立体书视角），弹簧 w16 z0.55（过冲≈9% 至 -19.9° 再回弹）；配套 `FloorShadow` 地影随折角变宽变深（w×lift、α 0.26×lift）+ `TabPull` 纸拉杆折至 45% 后被轻拉出（机关隐喻）。**禁止交叉溶解**：纸片只以折起/平铺进出。
- **三层视差**：`camDrift(f)` 整组水平漂移（无旋转无缩放），远/中/近 = **0.55 / 0.8 / 1.0**（world.ts `PARALLAX`）；漂移段边界对齐拉页窗口（盖页瞬间换向，观众无感）。
- **拉页转场（签名纪律）**：`PageTurn` 整帧新页自右滑入，窗口 **16f≈0.53s**（0.55s 窗口内允许阴影），左缘单向阴影渐强后收、**落定移除**；盖页表面=`BookSurface` 逐帧复刻（同 f 同确定性输出），落定卸载零跳变。
- **版式**：中文 Noto Sans SC 900（标题 letterSpacing 3、scaleX 0.97）；EN/数字 Fraunces（书卷衬线，呼应纸书）；字幕=底部白纸签 + 双胶带贴角（`PaperCaption`，粘贴式入场 rotate -1.6°→0），非字幕带。

## 复用适配点
- 整库拷 `styles/popup-book/` 即用；新片改 `world.ts` 的 `SCH` 分件时刻表 + `TL` 拉页窗口 + `props.tsx` 场景机关件即可换题材。
- 折起机关三件套随取随用：`FoldUp`（任意纸卡）+`FloorShadow`（折角地影）+`TabPull`（拉杆）；通用纸件 `Bean`（roast 0→1 烤色插值）/`Flame`/`Steam`/`WaterArc`（贝塞尔描边推进）/`Tape`（胶带贴角）。
- chrome 三件：`TitleLockup`（钩子标题卡，f3 折起 f13 成形=0.4s 达钩子纪律）/`CornerChip`（书签角标，页 2 起常驻）/`EndPlacard`（尾页收束卡：标题+五段流程纸丸带+脚注）。
- 流程类题材模板：每章节一页 → 折起入场 → 页码标签 → 拉页换章；hero 段放本页「动作件」（本片为水弧），BGM `--drop` 对位其起帧。

## 与 paper-collage 的边界（同族纸艺、不同纸语）
- **paper-collage = 撕纸拼贴**：平面剪纸层贴（撕边/锯齿/纸屑飞散），元素**平贴在画面上**做 2D 拼贴运动，无折页无纵深机关。
- **popup-book = 立体翻折纵深**：所有元素是**从页面上折起的立体机关**（rotateX 铰链 + 折角地影 + 后仰立定 + 拉杆/拉页），运动语言是「翻页/折起/拉出」，不是拼贴滑移。两者色系可近（暖纸），但镜头语法不重叠——需要「书/翻页/流程翻章」语义用本卡，需要「剪贴簿/手账/撕纸节奏」用 paper-collage。

## QC 豁免档
- 结尾定帧段 f354-387（1.13s）：收束卡折定后仅流程丸 ±2px 呼吸 + 箭头明度脉动 + 前景草带极缓漂移（camDrift 尾段）——合法微动效，看帧定性不修。
- feTurbulence 纸纹为全帧低对比 multiply 噪点纹理（seed 固定），非噪点/脏帧；牛皮纸底大片同色区域（probe_blank「近乎全屏同色」帧）为页面留白设计，非黑屏。
- 火苗摇曳/热气循环/云漂均为 sin 确定性微动（mulberry32 + 固定相位），可复现。
- 拉页窗口内 camDrift 分段换向存在帧间「跳变」，但该帧被不透明新页完全覆盖，成片不可见（设计意图）。

## 样张
`sample.jpg` = 正片 f265（页 3 研磨冲煮 hero：水弧灌注纸杯 + 磨豆机 + 页码标签 + 书签角标 + 纸质字幕贴），回归三查对照基准。
