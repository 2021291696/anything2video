# SPEC：达利超现实主义（soft-clock）

**正本源工程**：`samples-v4/soft-clock`（2026-10-07 验证交付）｜**图元库**：工程 `src/style/`（types.ts 源配方色板 token+帧锚点 + noise.ts seeded 工具 + paint.ts vol/castShadow/softMap/softClock/faceRipple + world.ts 三张底版缓存 + motifs.ts 高跷象/蚂蚁怀表/软体生物/孤柏 + melt.ts melt 转场 + camera.ts 相机与 sag/kx 主曲线 + subs.ts 字幕 + Scene.tsx 单组件正片；Canvas2D 纯函数，f210 两次渲染 sha256 全等）
**风格句**：softMap 参数化软钟（全要素同一映射）＋无勾线学院派体积填色＋剪切仿射长影子＋高跷象与蚂蚁绕表＋melt 液滴转场。超现实物理=时间可塑：钟在淌、影在长、下午被拉慢——「油画里的超现实物理」。
**技法借鉴** huashu-art-motion（MIT, alchaincyf）references/风格配方/23_dali.md、scripts/engine/lib/render.js（P.vol/P.castShadow 已核行）、scripts/engine/scenes/23_dali.js（221 行，softMap/softClock）、scripts/engine/transitions.js T.melt（663-680 已核行）——机制与参数级借鉴，全部以 Remotion(React+TSX)+Canvas2D 惯用法重写（`useCurrentFrame()+1` 纯帧号驱动，几何按 1280×720 重设计），零整段拷贝；文件头注释逐文件登记。

## 锁死项
- **色板 token**（源配方收死，`types.ts`）：天 `#22407c→#5f88bd→#e9dcae`＋海 `#8aa6b8/#4f6f86`＋礁岩金 `#eec98a/#9a6a34`＋荒原暖沙 `#d2ad70/#a87a44/#7a5129`＋墙 `#f4ead2/#cdbf9f`＋钟金 `#f0d27c/#9a7426`、盘 `#f6efd6`＋怀表橙 `#f39a4a/#9a3a10`。暖沙系+钟金，无出系色。
- **签名① softMap 参数化软钟**：圆盘局部 (u,v)→屏幕——v≤fold 躺平面（top 0.25-0.3 压缩）、v>fold 垂下（**flare=−0.12 往外摊，正值会收成冰淇淋筒**）＋中央高斯下垂（随 sag 加深）＋sin 波纹；**外框/表盘/12 刻度/双指针/折线高光/涟漪全部走同一映射**。三钟参数：枯枝 R43 fold−23（大部分垂下）/窗台 R48 fold3/桌沿 R59 fold8，指针 4.5-6.5 rad/s 异速（含倒走 −2.4）。
- **签名② P.vol 体积填色**：线性渐变＋clip 内 shadowBlur 内阴影（lineWidth=blur·0.6）；全片无勾线，学院派圆润感全靠这个。
- **签名③ 剪切仿射长影子**：`setTransform(1,0,−kx,ky,kx·yg,yg(1−ky))`，yg=各物着地线（墙 466/桌凳 603/生物 620/孤柏 655；源 700/905/930@1080 等比）；剪影先画离屏纯黑再整体 α0.6 blur1.5 叠（重叠不加深）；clip 只留岸线下地面；**坑：ky>0 往观众投会被画框底边吃——太阳放左前低空影往右后躺**；kx 0.85→1.45（缓爬 1.02 后在 1.2s 里主变长，HERO 达最长并保持）。
- **签名④ 高跷象**：四腿相位差 π/2 交替（膝关节 0.52 高度微弯）＋14Hz 身体微颠＋背驮方尖碑红鞍布；47px/s（源 70px/s@1920 等比）。
- **签名⑤ 蚂蚁绕表**：9 只蚂蚁沿椭圆爬（方向/速率各异、三节身位沿行进向）。
- **签名⑥ melt 转场**：新画带圆头液滴从上往下流（剖面 `(1−u²)^0.3`），旧画逐列被压下垂，液面高光＋暗边；26 滴 seeded（mulberry32(41) 每帧重建）。
- **签名⑦ sag 全程 0.1→1.4 肉眼可见在淌**：`0.1+1.3·pow(x,0.72)` 前快后缓（钩子 f15≈0.24=+140%），f330 达 1.4 后 softMap 保留时间相位波动——审片「没在淌」教训（首版 0.35→1.0 被判死）是本卡红线。
- **确定性**：全部 seeded（mulberry32 调用点内新建 + 纯三角函数），禁 Math.random/Date/网络；f210 两次渲染 sha256 全等。

## 与既有卡的边界
- **vs liquid-flow（图形液体 UI）**：liquid-flow 是 metaball 融合/波浪转场的 UI 液体语义（液体本身是图形元素）；soft-clock 是「油画里的超现实物理」——软钟/长影/蚂蚁是画中的超现实叙事物，媒介（油画质感+学院派体积）与叙事（时间可塑的荒原寓言）都不同。melt 转场与 LiquidWipe 的区别同源：前者是「画在融化」的颜料语义，后者是 UI 擦除。
- vs swirl-oil（梵高笔触油画）：swirl-oil 的油画感来自方向场笔触（P.strokes 系），soft-clock 无笔触、靠渐变+内阴影的学院派体积——同族油画、不同画法世系。
- vs hard-light（光影叙事）：hard-light 的影子是硬边光斑的负形；soft-clock 的长影子是剪切仿射投影几何（kx 即时间旋钮）。
- vs morph（图形变形）：morph 是形状间插值；softMap 是单形状的参数化软变形（旗/布/融化物通用映射思路）。

## 复用适配点
- 换题只改 `Scene.tsx` 三钟参数/母题布置 + `script/narration.txt`；sag/kx/melt 窗口锚点在 `types.ts` 帧锚点集中声明。
- `softMap()` 是通用「参数化软变形」：旗子/布料/融化物/果冻直接复用（top/flare/drip 三参数控形态语义）；`faceRipple()` 的「涟漪采样过变形映射」可给一切软表面波纹复用。
- `castShadow()` 是通用黄昏/强光长影方案（kx 动画 prop 即「时间流逝」）；`vol()` 是一切「软写实」图元的体积底件。
- melt 转场双画布接口（A/B scratch + p 进度）可给任何「画中画/换 viewpoint」叙事复用。
- 音频配伍：BGM `12-aurora-glass`（冷氛围）；SFX 主题音=水滴（时间变软）+低风（影子生长）+单声钟响（睡着），纪律=超现实的安静（全部 ≤0.12 gain）。

## QC 豁免档
- f330-365 定帧 1.2s：钟面涟漪+sag 时间相位波动+指针+蚂蚁+远处象行为合法微动效（motion 探针静止帧对 0.0%、最长静止 0.0s），不修。
- melt 段运动面积峰 43.17%：全屏转场本体（探针判读条款「>15% 连续=推拉/全屏转场」），非穿帮；孤立跳变 0 处。
- 相机全片缓推 1.00→1.03（f330 钳死）：极缓慢电影化推入，非抖动。

## 样张
`sample.jpg` = 正片 f232（HERO：三只软钟淌+长影子最长+高跷象走过荒原中部+蚂蚁怀表+孤柏+软体生物+窗内蛋全签名同框，实测自成片 7.7s）；辅证 `out/stills/frame-1.png`（钩子特写）、`out/stills/frame-115.png`（melt 中段新旧两画同框）、`out/stills/frame-365.png`（定帧末 sag=1.4 满幅）。
