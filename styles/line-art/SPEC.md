# SPEC：线条动画（line-art）

**正本源工程**：`科普视频/samples-d8/s34-lineart`（2026-10-06 验证交付）｜**图元库**：`src/style/kit.tsx`（纯代码 SVG，无纹理/无 staticFile 依赖）
**风格句**：单色等宽细线唯一造型语言 + 线条自我描绘（draw-on）+ 一笔画叙事 + 线面转换瞬间 + 大量负空间。

## 锁死项

- **色 token**（`LA`）：bg `#f7f4ec`（米白纸底）｜ink `#23262e`（唯一造型线）｜inkSoft `rgba(35,38,46,.72)`（标注字）｜dim `rgba(35,38,46,.45)`｜**gold `#b8862b`（唯一暖金强调，只给索力面/题眉/力源点/笔锋晕）**。双色上限，禁第三色相。
- **线宽**：`LINE_W = 2.6` 全片恒定（2-4px 档），所有 stroke（主笔画/标注引线/涟漪/题眉）引用同一常量；`strokeLinecap/Linejoin` 全 round。禁双线宽。
- **描绘缓动**：`EASE = cubicBezier(0.65, 0, 0.35, 1)` 全片唯一缓动常量。v4.0 起一笔画主体描绘进度改走「转角密度 tau + monotone 标点休止」（见下「v4.0 升级」节，段界=转角的速度归零语义由样条平台继承）；`EASE` 继续服务标注类笔画（箭头/引线/题眉）。转角件（小圆/短折返）给满时长不按长度缩放。
- **一笔画**：主体为 `SEGS` 预连通折线表（前段终点=后段起点）拼成的**单 path**，dashoffset 单调揭示、笔尖不提笔；「回滑段」与既有墨线几何重合=零新增墨迹（笔尖滑行的衔接语言）；至少两处无缝续接（前图尾线=后图起线）。`drawnAt(N)` 给已绘弧长（v4.0 起内部为 tau 重参数化），`penAt(N)` 给笔锋位。
- **线转面**：同路径双实现——stroke swell（2.6→16px）沿路径自锚点 dash 揭示 + 封闭面（力三角）自锚点 `scale` 长出 + 锚点强调点；每片至少一处，reveal 起点必须是结构起点（锚点）。
- **笔锋**：墨点 r3 + 暖金晕 r8/r16 双层，只随一笔画主体（标注类笔画笔不跟画），收笔驻留（标点休止 5f+）后 14f 提笔淡出。
- **负空间**：构图集中在中带（720p 下 y180-500），上带全空；地面线两侧留白 ≥150px；标注 ≤3 处（本体标注 2 + 角注 1），引线同为 LINE_W。
- **版式**：标注 Noto Sans SC 400 13px（inkSoft）；定帧标题 Noto Serif SC 600 40px letterSpacing 6 + 暖金题眉线（draw-on）+ 中文副题 14px + 英文角注 9.5px letterSpacing 3；讲解片必须有「**受力示意 · 非精确比例**」类示意角注。
- **节奏**：钩子 ≤0.5s（起笔 0.4s 内线+笔锋可见）；hero（线转面）落在 60-75% 窗口；结尾定帧 0.8-1.2s 唯一微动效=线转面 opacity 微呼吸（±0.035 档）。

## 复用适配点

- 无 staticFile 纹理依赖，`kit.tsx` 整库拷入 `styles/<sku>/` 即用；适配新主体只改三处：几何常量（锚点/塔位/跨度）、`T` 帧号表（对位 tts_build 实测 timeline）、`SEG_DEFS` 段表（连通顺序即叙事顺序）。
- 换主题保持「一笔画蓝图」方法：先把主体画成一条**不断线**的折线（列出续接点），再按口播节奏切窗；标注类（箭头/引线）走独立短笔画，不并入主体。
- BGM 走 `bgm_generate --style line-art`（02-line-art 配方，ambient）；笔触拟音用 Mixkit text/ 类（marker/pencil），动效 whoosh 用 transition/ 类；回滑密集段给一支铅笔短写即可，无氛围床（ambient 自带空间感）。
- 镜头组织：三镜可共用一个纯函数 Scene（N=局部帧+from），镜头边界=叙事分节、零接缝——一笔画天然要求连续画布，新片不必强拆镜头组件。
- **竞品技法增补（opt-in，`extra.tsx` 同目录伴生模块，默认全关，不触碰 `kit.tsx` 任何现有导出与默认输出）**：
  - `StickyNote`（便利贴完整组件）：默认宽 520/padding 30/34/底 #ffe68a/阴影 0 16px 22px rgba(42,35,32,.2)；顶部胶带条 140×42 rgba(233,217,168,.85) rotate(-3deg)；落定旋转 -1.6°；slap 拍入 0.16s easeInQuad（起始 scale1.16/rot+7°/y-22px，opacity 半程内出现，落定即静止无回弹）；逐行书写（贪心折行 `noteLines`：标点后断、行首禁闭合标点；每行 dur=clamp(非空白字符数×0.05s, 0.14..0.75s)、行隔 0.06s、at+0.2s 等落定）；peel 撕走（out 时刻 v=easeInQuad：y-=80v, x+=120v, r+=14°, opacity=1-v）。
  - `Eraser`（橡皮）：120×60 圆角 10、双色 linear-gradient(90deg,#eba7a0 0 62%,#2e5a9c 62%)、固定 rotate(-24deg)；`runs` 沿折线点列匀速分段行进、段内 easeInOutQuad（一下一下搓擦）；擦前 0.14s 从 (+160,+140) 斜向滑入 easeOutQuad 淡入、擦完 0.2s 同向滑出；`eraserAt` 给橡皮位供内容对位；`toPencil` prop 擦过处留铅笔灰底痕，被擦内容褪色用 `mixHex(原色, LA_PENCIL, p)`（#9c9186）而非消失。
  - `GridPaper`（方格纸底容器）：#f4ede0 + 两条 1.5px linear-gradient @48px 方格 rgba(190,172,140,.42) + 左红边线 3px rgba(214,120,104,.7) + 装订孔 44px 圆 #e2d6c1；`variant='index'` 索引卡（底 #fbf8f1 + 蓝横线 repeating-gradient + 红竖线）。
  - `Uncover`（书写窗口）：外层 overflow:hidden margin:-0.22em -0.14em + 内层 padding 互偿；reveal=外层 translateX((u-1)*100%)+内层 translateX((1-u)*100%) 反向对滑（linear）——整段文本"被写出来"的最廉价实现，不拆字符。
  - `Highlighter`（荧光笔）：rgba(255,210,63,.62) + mixBlendMode multiply + 不对称圆角 12px 20px 14px 22px、scaleX 0→1 origin left；`tone='warn'` 变体 rgba(240,132,52,.42)。
  - 道具色说明：以上纸品道具色是 opt-in 道具局部色，不进双色上限（双色纪律只约束一笔画本体与标注）。

> 技法借鉴 lanshu-create-ai-presenter-video（MIT, cclank）——Remotion 重写，2026-10-07

## v4.0 升级（mg15 技法移植）

**改了什么（改默认实现）**：`drawnAt` 的「逐段窗口 EASE」替换为**转角密度加权弧长 tau 重参数化 + monotone 单调三次样条标点休止**，全部内嵌 `kit.tsx`（自包含，无新增依赖）。管线四步（机制移植自 mg demos/02-line-art film.js，TSX 重写）：

1. **稠密采样**：`MASTER_PTS` 按 `LA_STEP=4px` 等距加密（源 STEP=0.5 为 Canvas 逐帧重绘设；σ 物理宽度不变）。
2. **TURN→CORN**：逐点航向角差（卷回 ±π）= 折角 `TURN`；高斯核（物理宽度 `CORN_SIG_PX=7px`，半径 3σ）卷积成转角密度 `CORN`（rad/px）。
3. **TAU**：`TAU[i] = TAU[i-1] + Δs·(1 + KCORN·min(CORN, CAP))`，`KCORN=9`、`CAP=0.3`（源参数照抄；直线 1×、弯道最高 3.7×）——笔速连续过弯减速的载体。
4. **monotone 时间重参数化**：`DRAW_CUES` 由既有 `SEGS`/`T` 表自动生成（每段 `[f0→段首tau, f1→段尾tau]`，相邻段共享边界弧长 → 段界 1 帧平台，收笔驻留 f239-244 → 6 帧长平台）；`tauOfT = monotone(cues, m0Scale=1.3, mEnd=0)`（源参数照抄）——cue/标点平台处切线归零=速度归零，快起钩子由 m0Scale=1.3 保留。

**参数登记**：`LA_STEP=4`｜`KCORN=9`｜`CORN_CAP=0.3`｜`CORN_SIG_PX=7`｜`m0Scale=1.3`｜`mEnd=0`——除采样步长（SVG 管线适配）外全部照抄源码，无自创参数。
**借鉴登记**：技法借鉴 mg-styles-15 demos/02-line-art（MIT, Vincentwei1021）——film.js:37-51 monotone、129-153 转角密度 tau 与标点休止，TSX 重写，2026-10-07（kit.tsx 文件头有同款登记行）。

**签名帧特征不变声明**：恒线宽 `LINE_W=2.6`、全片唯一缓动常量 `EASE=cubicBezier(0.65,0,0.35,1)`（仍服务标注类笔画）、预连通一笔画段表 `SEGS`/`T` 帧号表、笔锋三层晕（r3 墨点 + r8/r16 暖金晕 + 提笔淡出）、双色纪律（ink+gold）全部未动；各段 f0/f1 帧的已绘弧长与旧实现逐帧一致（样条严格过 cue 点），签名帧位（f86-132 / f143-232 / f251-341 对位点、f244 收笔、f263 压落）不变——变的是段内速度分布：匀速改「过弯减速 + 标点休止」。

## QC 豁免档

- **呼吸段静止误报**：结尾定帧段版式全静止、仅线转面 opacity 微呼吸，frame_metrics 可能判「画面不动」——本卡签名节奏（定帧微动效纪律），看帧定性不修。
- **回滑段「无新增墨迹」**：一笔画回滑在 diff 指标上近似静止段（只有笔锋小面积移动），非卡顿；以笔锋位移动帧定性。
- **米白底大面积亮部**：#f7f4ec 整帧高亮度为风格本底（负空间），亮度/对比指标以墨线可读性为准，不修底色。

## 样张

`sample.jpg` = v-f284（hero 线转面：金色索力带+力三角面+荷载箭头全要素）。源工程 `out/stills/`：v-f230（索面往复中段：鞍座+扇形索+笔锋折返位）、v-f284、v-f411（定帧标题全要素：题眉+主标+副标+英文角注+示意角注）为回归三查对照基准。

## v4.0 opt-in 增补（mg15 02-line-art 技法移植 · Wave B5）

**借鉴登记**：mg-styles-15 demos/02-line-art（MIT, Vincentwei1021）——film.js:462-543 字形 write-on、:593-597 辉光合成、:35-36 + :115-127 vnoise 手绘抖动。TSX 重写于 `mg15.tsx`（kit.tsx/extra.tsx 零改动，默认输出不变）。

1. **`WriteOnText` 字形描线标题（opt-in，降级实现）**：逐字符 clip-reveal（reveal 前沿=笔锋位，金晕 r16/r8+墨点 r3 与 PenTip 同构）+ 闭合内 flood 金渐变（floodIn 0.06s / flood 0.26s / fill 0.36）+ 全题收束一次 flare（σ0.1s 滞后 0.04s）——源参数照抄。**降级声明**：源用 opentype 预导出字形轮廓（v5_title.json），本卡无轮廓数据且不引字体解析依赖，字符按 CJK≈size/latin≈0.55size 估宽、整字揭示近似逐笔描线；工程内如需真轮廓版，用 opentype.js 离线导出常用字轮廓 JSON 后替换揭示层即可。
2. **`GlowLine` 线辉光（opt-in）**：SVG 双 feGaussianBlur（blur16@α0.2 + blur3@α0.3）+ 原色层 feMerge——源双层 screen 合成的滤镜等价近似（合成算子 screen→alpha over，观感差异 <5%）。
3. **`WobbleStroke` 手绘抖动（opt-in，默认不接）**：`wobblePts` vnoise 位移（LAT seed 20260927、幅度按段配置、box 平滑窗 ±40 步 4、w=AMP·(0.75·vnoise(S/17)+0.45·vnoise(S/5.5+300)) 全照抄），端点钉住防续接点错位。**直线感是本卡「蓝图感」签名，默认描线保持尺规直线**；手绘语境（便利贴/橡皮场景配线）才启用。
