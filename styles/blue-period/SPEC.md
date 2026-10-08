# SPEC：毕加索蓝色时期单色情绪（blue-period）

**正本源工程**：`samples-v4/blue-period`（2026-10-08 交付）｜**图元库**：工程 `src/style/`（types.ts 单色蓝 token+MONO_MAP 明度映射表 + noise.ts 种子随机/值噪声 + brush.ts 宽干笔引擎/swatch/糊叠/细丝/慢热气 + stretch.ts R.stretch 移植（DOMMatrix 烘 Path2D/点列/锚点，线宽不变）+ room.ts 静态五层（底稿/宽干笔/桌层/轮廓/画布纹罩）+ chars.ts 少女/猫几何与两段式填描 + extras.ts 海浪/碎影/长云 + subs.ts 字幕 + Scene.tsx 单组件正片；Canvas2D 纯函数，同帧渲两次逐像素一致）
**风格句**：严格单色蓝 + 宽而干的横竖笔（butt cap、糊 7px）+ El Greco 式拉长（线宽不变）+ 普鲁士蓝笃定轮廓 + 万物慢半拍（0.5 倍相时）。节奏即情绪：忧郁由拉长 + 慢速 + 下垂披肩三件合成，不是滤镜。
**技法借鉴** huashu-art-motion（MIT, alchaincyf）references/风格配方/36_picasso_blue.md 与 scripts/engine/scenes/36_picasso_blue.js（123 行）——机制与参数级借鉴，全部以 Remotion(React+TSX)+Canvas2D 惯用法重写（`useCurrentFrame()+1` 纯帧号驱动，几何按 1280×720 自行重设计，角色未搬 RIG 骨架），零整段拷贝；文件头注释逐文件登记。

## 锁死项
- **严格单色蓝 token**（`types.ts` BLUE）：#132240 / #1d3866 / #2d5a94 / #4f719a / #6b8fb6 / #b6c8d8 六档 + 青灰 #3b6878 + 线色 #0c1830。**禁任何第二色相**（连一点赭都不要——36 号踩坑：猫留赭被审片打回）；实测 f300 全部像素 100% 落蓝轴。
- **签名① 宽而干的横竖笔**（brush.ts strokes）：cell34/len110/w34（1920 基准；1280×720 等比 2/3 = cell23/len73/w23），墙竖刷（±0.5·noise 摆）地横刷，swatch 混底 0.8 低对比，**lineCap='butt' 锁死（宽笔圆头密排成「人头阵」是 36 号踩坑回流参数）**，再 blur 7px 叠 α0.8，干刷细丝 ≤260 条 α≤0.045（多了读成「下雨」——36 号 cell16 坑的同族）。
- **签名② R.stretch 拉长**（stretch.ts）：`DOMMatrix().translate(ax,ay).scale(sx,sy).translate(-ax,-ay)` 统一烘进 Path2D（addPath）+ 点列 + 锚点 + 杯/手坐标，**线宽不变**（禁 ctx.setTransform 直上——那会把描边一起压扁）；人 0.84×1.12 绕脚轴 (800,618)、猫 0.82×1.14 绕 (360,603)。样片叙事：HERO 段 1.0→锁死值（f225-262）并定格，落地长影同步拉长（压扁翻转+右移+skew，随 stretchAmt 0→1）。
- **签名③ 轮廓不沸腾**：#0c1830 粗轮廓（可见宽 ~5px），两段式「全描边→全填色」（先所有部件描边、线宽=可见宽 2 倍，再按遮挡序全部填色——内侧线全被盖掉，visibleLines 的近似）；轮廓线笃定不抖，禁 boil。
- **签名④ 万物减速**（Scene.ts SLOW_TAB）：slow(f) 从 1.0 单调降到 0.5（f117-225 smoothstep，参数化 SLOW.factor），按帧积分成相时 pt；呼吸 `sin(1.8pt)·0.026`（幅度≈常规 2 倍、频率≈0.45 倍）、端杯 1.25s（常规 0.9s）、热气/海浪/碎影/云/猫尾全按 pt。**慢本身是内容，不是性能取舍**。
- **签名⑤ 单色明度映射**（types.ts MONO_MAP）：彩色素材 → 蓝世界换算表——橘猫背=中蓝 #4f719a、虎斑=深蓝 #273f66、白胸爪=浅蓝 #b6c8d8、金发=最亮蓝灰 #cbd8e0（比肤 #90a9be 亮一档才读得出「金」）、布裙=#1e3a6a、披肩=#6b8fb6。规则：只保留相对明度，色相全归蓝。
- **签名⑥ 忧郁三件套**（INDEX 短板修正）：拉长 + 慢速 + 下垂披肩（从头顶罩到腰下，3 道褶线）**三件齐**，缺一则只是「蓝色滤镜」；辅以垂目/低眉疏笔、长指绕杯。验收=盲测读出「忧郁」。
- **坑（RECON 点名，必避）**：桌子单独成层画在笔触**之后**（room.ts tableCanvas），不在笔触层用矩形 mask 挖洞——挖洞留平涂补丁。
- **确定性**：全部 seeded（mulberry32 函数体内按用途重建 + 格点整数哈希值噪声），禁 Math.random/Date/网络；f210 两次渲染 sha256 全等（6ba68a5b…）。

## 与既有卡的边界
- **vs swiss-print（四色平涂）**：swiss 是版式卡（红黄蓝黑四色是信息编码）；blue-period 是单色情绪卡（蓝不是编码而是情绪本体，一切形体的可读性来自明度关系）——色相数量差一个量级，语义相反。
- **vs crt-terminal（磷光绿单色）**：crt 的单色是媒介仿真（屏幕发光、扫描线）；blue-period 的单色是绘画史风格（油画笔触、画布纹、暗角）——同为单色，媒介与笔触语言零交集。
- **vs swirl-oil（梵高）/light-dabs（印象派）/ink-plate 等油画族**：那些卡是多色厚涂/流动笔触；blue-period 是单色低对比宽刷 + 拉长造型 + 慢时参数化（「节奏即情绪」为本卡独有，其他卡时间都是常态速率）。
- vs sfumato（晕涂）：sfumato 靠明暗过渡消轮廓，blue-period 反其道——笃定的普鲁士蓝轮廓 + 平涂色块，轮廓态度相反。

## 复用适配点
- 换题只改 `Scene.tsx` 层序锚点 + `chars.ts` 母题（人物/猫几何）+ `script/narration.txt`；MONO_MAP 是通用「彩色素材→单色世界」换算表（换玫瑰红时期/黑色时期只换 token 表）。
- `stretch.ts` 的 R.stretch 移植是任何「风格化变形」卡可用的通用函数（非等比拉长且线宽不变）；`SLOW_TAB` 慢相时积分是任何「时间感」卡的通用件（改 from/to/factor 三参数）。
- `brush.ts` strokes 的 cap 参数化 + blur 叠层可给一切宽笔刷卡复用（cap='butt' 纪律随参数走）。
- 音频配伍：BGM `12-aurora-glass`（冷氛围）；SFX 主题音 = 极克制（4 点全 ≤0.10 gain，水滴是唯一「事件性」音效）。

## QC 豁免档
- f358-390 定帧 1.07s：极慢呼吸+海浪+碎影+热气+云为合法微动效（probe_liveness SC04 MAD 0.106-1.226 非全静止），不修。
- SC02/SC04 段 MAD 0.1-0.5 偏低：0.5 倍慢时是「节奏即情绪」本体，非渲染静帧。
- f1 平涂底稿段：叙事设计（第一笔未落），亮度均值 ~59 非黑场（probe_blank 全过）。
- 相机全片静止：蓝色时期的静物画时间观，风格内选择。

## 样张
`sample.jpg` = 正片 t≈9.97s（f300 定格帧实测截图：拉长定格人影+落地长影+下垂披肩+端杯热气+橘白猫明度映射+窗外海浪月光碎影全签名同框）；辅证 `out/stills/`（f1 平涂底稿 / f8 第一笔横扫 / f243 拉长半程 / f390 定帧末）。
