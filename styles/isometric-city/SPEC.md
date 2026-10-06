# SPEC：等轴 2.5D（isometric-city）

**正本源工程**：`s34-iso`（2026-10-06 验证交付）｜**图元库**：`src/style/kit.tsx` + `src/style/world.ts` + `src/style/City.tsx` + `src/style/chrome.tsx`（零纹理依赖，纯 CSS transform，禁真 3D 库）
**风格句**：30° 等轴微缩世界 + 无透视灭点 + 楼体生长动画 + 平行滑轨运镜 + 前中后景视差。

## 锁死项
- **色 token**（`ISO`）：bgTop `#EEEAFC`｜bgMid `#DAD3F7`｜bgLow `#C4BAEF`｜dot `#A79EE2`｜road `#8781D0`｜ink `#2C2960`｜data `#62F0F2`｜白 `#FBFAFF`｜peach `#FFC4AC`｜sky `#A8D2FF`｜mint `#B7ECD6`｜lilac `#D9D1FA`｜butter `#FFE6A1`｜coral `#FF9E86`｜deepSky `#74A9F2`｜winOff `#98ACEE`｜winOn `#FFF0C8`。浅紫底上粉/黄/薄荷糖豆色，ink 深藍紫做字与机架暗部。
- **SSR 等轴面**（正本在 kit.tsx，逐面矩阵精确可验）：顶 `rotate(30deg) skewX(-30deg) scaleY(.866)`｜右 `rotate(-30deg) skewX(-30deg) scaleY(.866)`｜左 `rotate(30deg) skewX(30deg) scaleY(.866) scaleX(-1)`（镜像面）；三面共用前顶角锚（transformOrigin 0 0）。U=56px/世界单位；`backCorner(st,u,v,h)` 唯一换算入口。
- **Z 序**：`zIndex = round((u+v+w+d)·10)`（画面 y 坐标即前后，禁真 3D）；三层舞台容器必须 `isolation:'isolate'` + zIndex（back 1 / mid 2 / front 4）防 z 泄漏（s34-iso 首轮返工教训）。
- **楼房生长**（签名纪律）：底面先落位（t0−3f scale-in）→ 立面 scaleY 0→1 弹簧（`EASE.spring(t/30, 14.8, 0.61)`：峰值≈8帧、9% 过冲）→ 顶面延迟 3 帧盖上（pop+微弹）。多楼逐栋间隔 14f。
- **运镜**：整组平移（无旋转无缩放）；`camPan(f)` 驱动三层 1:0.8:0.6 视差；站间距 1250px（中景坐标），站点局部覆盖层一律经 `midScreen()` 对位（含视差偏移）。
- **幕底**：天空三段渐变 + 远景剪影楼群 + 缓漂云 + rotate45·scaleY0.52 等轴点阵地（限底部，防「天上下雨」误读）。
- **版式**：中文 Noto Sans SC 900（标题 letterSpacing 2、scaleX 0.96）；数字/百分数 Orbitron；EN 角标 Audiowide letterSpacing 4-5。字幕为底部白色丸（自绘 CaptionPill，非字幕带）。

## 复用适配点
- 无 staticFile 纹理依赖，整库拷 `styles/isometric-city/` 即用；新片改 `world.ts` 的 `BOXES/TILES/MID_TREES/CARS/HERO_CUBES` 数据表 + `STOX/STOY` 站点布局即可换城市。
- 建筑挂载件三选一：`win`（窗格，rows×cols 真窗 div，逐列点亮）/`led`（机架 LED 带，hero 扫掠逐行点亮）/`screen`（巨幕，三格过检绿勾）。
- hero 扫掠：`IgnitionBeam` 光带 + `RACK_IGNITE` 逐楼帧表 + `RENDER %` HUD（RenderHUD），BGM drop 对位扫掠起帧。
- 站点叙事件：`StationLabel`（①②③ 丸标）/`PaperFly`/`BeatCards`/`FilmStripFly`/`EndLockup`（收束卡：f353 成形→f363 定帧，定帧段 0.8-1.2s 纪律）。

## QC 豁免档
- 定帧段（收束卡）仅徽标菱点微闪 + 末 6 帧轻收暗——合法微动效，看帧定性不修。
- 等轴点阵地在浅紫底上呈低对比斑点（opacity 0.3），非噪点/脏帧；远景剪影楼群低对比为氛围层，frame_metrics 低对比告警可豁免。
- 窗格/LED 的 seeded 眨动为合法微动效（mulberry32 可复现）。

## 样张
`sample.jpg` = 正片 f270（四栋机架楼 + 点亮扫掠 + RENDER HUD + 视差树带），回归三查对照基准。
