# SPEC：黏土小城（clay-town）

**正本源工程**：`samples-l1/clay-town`（2026-10-07 交付）｜**图元库**：`src/style/kit.tsx` + `src/style/world.ts` + `src/style/Town.tsx` + `src/style/chrome.tsx`（纯 CSS transform + 内联 SVG，禁真 3D 库、零纹理依赖）
**风格句**：30° 等轴黏土舞台 + 哑光次表面材质 + squash 软落动画 + kawaii 拟人件 + 双层标注（白话标签 + 真实术语）。
**定位**：讲给外行的比喻型科普（自然与生活系统：供水/循环/生长类题材）。

## 与 isometric-city 的边界声明（同族技法分工）

- **同族**：等轴投影方法论正本继承 isometric-city——SSR 三面公式逐面矩阵相同（顶 `rotate(30)skewX(-30)scaleY(.866)` / 右镜像族）、Z 序 `(u+v+w+d)·10`、三层舞台 1:0.8:0.6 视差整组平移、mulberry32 seeded 布局、`backCorner` 唯一换算入口。
- **不同材质语言（重写非拷贝）**：isometric-city 是**硬建筑几何**（小圆角 3-9px、平面纯色 shade(k)、底-墙-顶三段硬生长、窗格/LED 机架）；clay-town 是**软黏土自然物**——大圆角 12-26px（seeded 抖动）、哑光双向渐变 + inset 环境光遮蔽内阴影（次表面感：顶面亮/侧面暗）、球/圆柱走屏幕空间（正交投影球冠=圆）、入场动画换「整体软落 squash」（clayDrop 落地压扁回弹，非三段生长）、hash 手捏抖动 ±2%（scale/rotate/圆角/渐变角全扰动）。
- **题材分工**：clay-town 管自然与生活系统（水循环/植物生长/食物旅程等比喻科普）；isometric-city 管城市与数据设施（渲染农场/数据管线/机房集群）。两卡不在同一片题材内复用。
- **签名特征互斥**：双层标注（白话+术语）与 kawaii 拟人面孔为 clay-town 独有；蓝图扫掠/LED 点亮扫掠/RENDER HUD 为 isometric-city 独有。hero 手法区分：isometric-city 用光带扫掠逐列点亮，clay-town 用「水滴沿管网滑行+流过即亮」的路径式 hero。

## 锁死项

- **色 token**（`CLAY`）：bgTop `#FDF4E8`｜bgMid `#F6E2CB`｜bgLow `#EDD2B4`｜cream `#FBF3E4`（奶白）｜terra `#E8926B`（陶土橙主 accent）｜slate `#9FB8CF`（灰蓝）｜moss `#A8C39A`（苔绿）｜cocoa `#4A3A31`（炭褐 ink）｜water `#8FC1EE`/waterD `#5E93C9`（水蓝 hero 色）｜rim `#FFE3C8`（贴纸桃描边）｜butter `#F5CE7E`。禁纯黑，暗部一律 cocoa 系。
- **黏土材质公式**（`clayTop/claySide`）：顶面 = radial 高光（rgba(255,252,242,.55) at 26% 24%）叠 linear 双向渐变（1.10→1.01→0.90）+ inset AO；侧面 = linear（1.05→1.00→0.84）+ inset AO + 底部 3px 落影；渐变角度/ AO 强度全部 seeded 抖动（`wob(seed, ±7°/±4px)`）。
- **SSR 等轴面**（正本 kit.tsx）：三面 transform 与 isometric-city 同款；U=56px/世界单位；`backCorner(ox,u,v,h)` 唯一换算入口；立面挂前角（IsoBox 同款锚定），底座檐口挂前角下垂。
- **Z 序**：`zIndex = round((u+v+w+d)·10)`；三层舞台容器 `isolation:'isolate'` + zIndex（back 1 / mid 2 / front 4）防 z 泄漏；底座组 zIndex=1 压底（占用面不与楼体底冲突，见 kit 注）。
- **软落 squash**（签名纪律，替代硬三段生长）：`EASE.clayDrop(tau, fall, h0)` 下落 → 落地 ±22%/26% 衰减振荡压扁回弹（约 0.23s）；整组以地面占用中心为 transformOrigin；水塔三段式（支腿依次 → 罐体软落 → 圆盖 pop 延迟 11f/22f）是楼体变体，非通用纪律。
- **手捏不规则**：`wob(seed, amp)`（mulberry32）±2% 作用于 scale/rotate（房子 ±1.1°）/圆角/渐变角；同一 seed 全片可复现。
- **双层标注**（签名特征，`chrome.DualLabel`）：贴纸气泡（奶白底 + 3px 桃描边 rim + 圆角 16 + 软影）两行——主行白话 Noto 800 18px cocoa、次行真实术语小标签（butter 32% 底圆角 8、12px #8A6A4F）；茎线 48px + 陶土珠钉画面比喻物；经 `midScreen()` 随视差对位。
- **kawaii 拟人**：水塔罐体双眼+微笑+腮红（`ClayTower` faceOn，眨眼由调用方按帧传）；水滴角色（`Droplet` SVG 水滴形+radial 渐变+高光+表情）为全片贯穿元素。
- **运镜**：整组平移（无旋转无缩放）；`camPan(f)` 三段（f101-123 / f187-209 / f293-315）驱动三层 1:0.8:0.6 视差；站点覆盖层一律 `midScreen()` 对位。
- **幕底**：暖奶油三段渐变天空 + 远景黏土云 + 低对比暖色丘陵带（bottom 226，opacity 0.55）；前景 1.0× 黏土树带。
- **版式**：中文 Noto Sans SC 900（标题 letterSpacing 2、scaleX 0.97）；EN 角标 Audiowide letterSpacing 4；字幕为底部奶白黏土丸（自绘 CaptionPill，非字幕带）。

## 复用适配点

- 换题材：改 `world.ts` 的 `SLAB_AT / PIPES / HERO_RIDE / DECO / FRONT_BUSHES / camPan` 时刻表 + `Town.tsx` 站点 props 布局即可换故事；图元库不动。
- 楼体件：`ClayHouse`（墙/屋顶色可换，内置圆胖烟囱 chimney={fu,fv,hc} 带烟圈循环）、`ClayTower`（水塔，kawaii 面孔）、`ClayCyl`（通用黏土圆柱）、`ClayTree/ClayFlower/ClayBush`（云朵冠绿植）。
- 管网/路径类 hero：`ClayPipe`（沿等轴网格线挤出 grow / 过水点亮 lit 水蓝+辉光）+ `HERO_RIDE` 水滴行程表 + 接头球——任何「流经/输送」类题材可直接复用。
- 叙事件：`TitleLockup`（钩子快弹 f3→停靠左上）/`DualLabel`（每站一枚）/`GlassCup`（接水容器，水位+涟漪）/`EndLockup`（收束卡：成形→定帧段水滴呼吸+菱点微闪）。

## QC 豁免档

- 结尾定帧段（f352-378，0.87s）：收束卡静止，仅卡上水滴徽标呼吸（±2.4px）+ 菱点微闪 + 末段微收暗——合法微动效，看帧定性不修。
- SC04 末段（f325-331）：水滴落杯后杯中呼吸摆（±1.6px）+ 水位缓升，liveness 采样 MAD 0.14-0.16 偏低——合法低幅微动效（动作已收敛、等待收束卡）。
- 远景丘陵带（低对比暖色椭圆，opacity 0.55）与黏土云为氛围层，frame_metrics 低对比告警可豁免；非噪点/脏帧。
- 片头 f1-5 为底座软落下落段（无建筑），非空场：天空/云/前景带已在画，底座 f6 落地 squash——钩子以标题 f3 快弹计（0.1s 纪律）。
- 前景树带 wobble 为入场的 seeded appear（一次性），非 idle 循环摆动（lanshu 纪律「动来自落地/生长/运镜」已遵守）。

## 样张

`sample.jpg` = 正片 f172 实测抽帧（ffmpeg -ss 5.733）：kawaii 水塔（眨眼脸+圆盖+顶珠）+ 水滴角色塔顶探头 + 双层标注「大水塔 = 城市蓄水池」+ 黏土字幕丸——签名特征最密一帧，回归三查对照基准。

## 借鉴登记

技法借鉴 lanshu-create-ai-presenter-video（MIT, cclank）——Remotion 重写。具体借鉴点：黏土色板气质与「比喻物=真名」双层标注信息结构（v9-clay kit.css tokens / Kit.label）、三层奶油底座 diorama 概念（C.diorama → ClaySlab 等轴重写）、kawaii 面孔与落地 squash 动作语言（C.boxTexture/C.squash → CSS/DOM 重写）；全部以 a2v 的 Remotion(React+TSX)+CSS SSR 惯用法重写，未拷贝其 Three.js/DOM 代码。等轴方法论正本继承自 a2v 自有卡 isometric-city（见边界声明）。
