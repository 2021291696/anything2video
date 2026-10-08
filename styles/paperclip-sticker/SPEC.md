# SPEC：贴纸人科普（paperclip-sticker）

**正本源工程**：`samples-d8/s34-paperclip`（2026-10-06 验证交付）｜**图元库**：工程 `src/style/kit.tsx`（PC token + 贴纸/相机原语，纯代码无纹理依赖）
**风格句**：蓝灰米白冷静底 + 主体贴纸化粗白描边 + 扁平图标与精确数据图表 + 超宽大画布摄像机平移串联信息点。

## 锁死项
- **色 token**（`PC`）：bg `#E9EEF2`｜bgDeep `#DFE6EC`｜ink `#25313D`｜mid `#8C9AA8`｜faint `#5E6D7B`｜card `#F7F9FB`｜line `#CDD6DE`｜dot `#C9D3DC`｜accent `#FF5A36`（唯一强调，只给重点数据/标记/记号笔）。克制 2-3 色系 + 唯一强调。
- **幕底**：`PaperDots`（米白→蓝灰微纵渐变 + 44px 均匀点阵 dot 2.1px，随世界层一起被摄像机平移——坐标纸隐喻）。
- **贴纸化契约**：粗白描边 = SVG `paintOrder:'stroke'` 白 stroke `2×OW`（主体 OW=11，小图标 OW=7）或 HTML 双层字（背字 `-webkit-text-stroke` 14–18px 纸白 + 面字填色）/白卡 `boxShadow: 0 0 0 OWpx paper` + inset 细边；软阴影 = `drop-shadow(0 3+13·lift px, 6+18·lift px, rgba(22,34,46,.14+.14·lift))`。
- **入场契约**：`slap()` 贴纸拍落（预拍悬置 amp .3–.5 → 落地 → `wobble` 欠阻尼回弹 f4.5/k10）；kicker = 橙方块 18px + 中文 32px/700 + 英文角标 ls6；数字一律 `fontFeatureSettings:'tnum'`。
- **摄像机层**（借 mg 19-paperclip 机制，只借参数与结构）：世界画布 **≥2400px 宽**（本片 2860×2760）；`CamKey[]` = {t,x,y,z,r?,move?}，x/y 线性 + **log-z 插值** + 每 move 独立长曲线 ease（fly `bez(.62,0,.22,1)` / pull `bez(.42,0,.22,1)` / drift `bez(.45,0,.55,1)`）；世界 div 变换 = `translate(640,360)∘rotate∘scale(z)∘translate(−cx,−cy)`；一镜串多信息站（本片 4 站 + 拉远宽景），镜头间零硬切。
- **版式**：Noto Sans SC 单字族（中文 900 标题/700 正文、数字 900+tnum、英文角标 600+letterspacing）——克制单字族系统。

## 复用适配点
1. 无 staticFile 纹理依赖，kit 整库可拷；主体图形（心脏/回形针/日历/范围条）在工程 `src/shots/G1/film.tsx` 内按片绘制，新片替换主体与站点布局，保 `PC/STK/slap/slapStyle/CamStage/PaperDots/Kick/StickerChip/StickerText` 原样。
2. a2v 机身件换血：注册 StyleSkin `paperclip-sticker`（工程 `src/recipes/styles/paperclip-sticker.ts`：chrome subColor=ink/subStroke=纸白/subAccent=橙、barFill 橙 0.55、barGlow false、endFade=bg）。
3. 片头/片尾卡是风格自有语言（贴纸钩子 + 宽景定帧标题卡）：工程 overlay/index.ts 裁掉 OV-Title/OV-Ending/OV-EndingTop（判例 s34-blueprint 空串法的直裁版）；config.title 置空串。
4. BGM 配方：引擎原生 `19-paperclip`（STYLE_MAP 的 'explainer' slug 在当前 mgaudio 不存在，首用判例）；SFX 主题音 = crowd/heartbeat-single。

## QC 豁免档
- PaperDots 点阵会被 frame_metrics 记「整齐点阵」误报——看帧定性为风格本体，不修。
- 白描边大字在浅底上会拉低「主体对比度」类自动分——白描边是贴纸语义，看帧定性，不修。

## v4.0 升级（mg-styles-15 技法移植）
- **van Wijk 曲线飞行相机**（kit.tsx `zoomFly`，约 50 行纯数学、零 d3 依赖）：`fly`/`pull` 段的 x/y 线性插值换为 interpolateZoom 曲线航迹——视口三元组 `[cx, cy, SCREEN_W/z]`（屏宽基准 1280，与 CamStage 的 scale(z) 严格互逆）之间「放大-飞越-缩小」，log-z 语义由曲线的 w 通道自然承担（端点处 z 精确回到段表值）。`drift`/`hold` 段保持原线性 x/y + log-z 插值；`CamKey` 段表结构、r 插值、CAM_EASE 时间轴整形全部不变（ease 后的 e 喂给 zoomFly，同源码 `s.I(EASE[move](u))` 的用法）。
- **rho 参数**：照抄源码——fly 0.85 / pull 1.25（`zoomFly` 第 4 参可配，默认 0.85）。
- **借鉴登记**：d3.interpolateZoom 用法（index.html:80-81、cam() :88）——mg-styles-15 demos/19-paperclip（MIT, Vincentwei1021）；算法出自 van Wijk 2008《Smooth and efficient zooming and panning》，本卡为 TS 重写非拷贝。
- **签名不变声明**：`CamKey` 段表结构、slap/wob、STK 贴纸化参数（粗白描边/软影）、超宽画布纪律（WW≥2400）、PaperDots、Kick/StickerText/StickerChip 全部保持；仅换插值核，既有分镜的段表数值无需改动（fly/pull 端点逐帧对齐原值）。

## 样张
`sample.jpg` = f267 hero slam 帧（100,800 白描边大数字+白圈+算式贴片全要素）。`out/stills/frame-300.png`（日历贴纸 + 1440 点阵 + 100,800 盖章 + 回形针，全签名元素同框）、`out/stills/frame-400.png`（拉远宽景 + 屏幕空间标题卡定帧）；回归三查对照基准 = `out/video.mp4` f246（hero slam 白圈）。

## v4.0 opt-in 增补（mg15 19-paperclip 图形匹配飞行 + TrackCam · Wave B5）

**借鉴登记**：mg-styles-15 demos/19-paperclip（MIT, Vincentwei1021）——index.html:229-247 图形匹配飞行、:289-291 track 相机、:436-442 方向性速度模糊。TSX 重写于 `flight.tsx`（kit.tsx 零改动，zoomFly 相机默认行为不变）。

1. **`GraphicMatchFlight`（opt-in）**：徽章 peel（eIO 0.12s）→ 直线插值 + 垂直弧线（amp 60-129px、sg 交替）→ 落地 wob(4.5,13) 回弹；尺寸 S0=62/104→1.15→1.36→落地 1、圆角 18.4→12、双层字交叉淡化 xf=P(g,.3,.4)、名条 1−pu、序号 P(g,.65,.35)、色由 props 表同步——比例/时序全照抄。**方向性速度模糊**：t±0.004s 位姿差分得 vx/vy/vs，feGaussianBlur stdDeviation=(min(60,kb(|vx|+380vs)/sc), min(60,kb(|vy|+150vs)/sc))、kb=.75·SH/MBN（SH=.5s、MBN=12 照抄）；bx+by≤0.5 自动摘滤镜（静止零开销）。
2. **`anchorZoom`（opt-in）**：锚点锁屏缩放段——解 c1 = a−(a−c0)·(z0/z1) 使锚点屏幕位置两端一致，产出 CamKey 对可直接混排进既有段表（move='hold'）。
3. **`trackPose`/`TrackStage`（opt-in）**：跟随质心段——cen(t) 回调给内容质心，相机 y 跟随位移、z 按质心行程 log 插值 A.z→zB（源 TRK 机制）；TrackStage 与 CamStage 同变换链，位姿直给（track 是 t 的函数，非静态段表）。
