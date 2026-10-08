# SPEC：梵高后印象派（swirl-oil）

**正本源工程**：`samples-v4/swirl-oil`（2026-10-07 验证交付）｜**图元库**：工程 `src/style/strokes.ts`（流场笔触渲染器）+ `src/style/world.ts`（油画世界：底稿/方向场/区域色板/缓存）+ `src/style/kit.tsx`（React 层）；**共享正本**：`samples-v4/shared/paint/strokes.ts`（油画族四卡共用，`light-dabs`/`scream-warp`/`lily-pond` 拷用）
**风格句**：流场长笔触三遍分区 + 区域色板十几种色相 + 深色描边 + 星空漩涡卷入转场 + 灯晕虚线环外扩 + 8fps boil 换种子——「梵高的感觉来自区域色板里十几种色相，只有颜色抖动=同一个蓝的噪点」。
**技法借鉴** huashu-art-motion `lib/paint.js` P.strokes/P.swatch + `scenes/09_postimp.js`（MIT, alchaincyf），TS 重写——抖动网格取底稿色/先描后画/swatch 混底/boilSeed 机制与三遍分区参数级借鉴，结构、命名、API 全部按 Remotion/TS 惯用法重写，零代码拷贝。借鉴登记：`移植自 huashu-art-motion lib/paint.js (MIT, alchaincyf), TS 重写`。

## 锁死项

- **签名①三遍分区笔触**（同一参数跑全图=地毯，必须分三遍）：墙/塔身竖长 `cell14/len64/w8`｜地板沿透视指向消失点 `cell12/len46/w8`｜其余（天空/海/屋顶）`cell10/len22/w6.5`。方向场：墙 `-π/2±0.26·noise(x,y,t)` 火苗摇曳、地板 `atan2(y-VP1,x-VP0)+0.06·sin(2t+x/100)`（VP=640,452）、星空沿最近漩涡切线 `+π/2+0.3t`、海面近水平微摆、屋顶沿坡。
- **签名②区域色板 token（配方 09 照抄，禁改色值）**：
  - 墙 8 色蓝紫系 `#7f9be6 #5f7fd8 #a7bbf2 #6c6fd2 #8ad0e6 #c3cbf6 #4f6cc8 #9a8fe0`（mixBase 0.45）
  - 星空 6 色 `#22339a #2f4fb8 #5c86dc #8fb6ee #1b2a78 #3c6bd0`（mixBase 0.45）
  - 地板 7 色暖系 `#c0573c #a8453a #d7774a #8e3b30 #5f8f6a #c96a52 #e08a5c`（mixBase 0.3）
  - 扩展区：海 5 色深蓝 `#1b2a78 #24377e #2f4fb8 #3c5cb8 #16205f`（0.35）｜屋顶 4 色暗绿 `#163a22 #1f4a2c #122f1b #275534`（0.3）｜灯晕 4 色暖黄 `#fff2a0 #f6d84a #ffe680 #f0c040`（0.3）
  - mixBase 纪律 0.3–0.45：抽色必须混底稿色保明暗。
- **签名③深色描边**：`outlineCol #141a3c`（深蓝），三遍 outline 0.8/0.85/0.9、outlineMix 0.38/0.45/0.45（描边宽=主体宽+2.5，先描后画）。
- **签名④星空漩涡卷入转场**（章节缝唯一大转场，禁 dissolve）：扩张圆盘内容=画出来的漩涡特写油画（clip 圆 + 反向旋入 + 1.35 过扫），盘缘深蓝厚描边 + 三条半透明螺旋臂快旋 + 内吸速度线；配套整景向漩涡中心 scale 1→2.7 + rotate 28°（transform-origin=漩涡中心）。本片窗口 f263-292、盖满 f285=72.9%。
- **签名⑤灯晕虚线环外扩**：灯室为心，3 圈 `setLineDash([22,14])`、`lineDashOffset=-60t`、r 34→118 外扩、`lighter` 叠加，α 0.28→0。
- **签名⑥8fps boil 换种子**：笔触层缓存键=`boilSeed(t,8)`（`Math.floor(t*8)`）；定帧段构图冻结但 boil/星闪/波光/螺旋带不停。
- **签名⑦stable() 防重洗（默认行为，08_impressionism v2 事故的解法本体）**：一切 palette 过 `stable()`——每格恰好消费固定个数随机数（swatch=1 个）、永不返回 null；「高光格保底稿色」判定只用亮度 colSum>520（零随机数）。底稿动/区域变不影响已画格子的抽色。
- **道具层纪律**：小物件（灯室/门窗/月/星/村灯）禁被大笔触打碎——单独 props 层绘制后过 `cell7/len14/w4.5` 细笔触 `source-atop(alphaMask)` 再叠回。
- **性能纪律（油画族门槛）**：底稿+三遍分区笔触按 boilSeed 预渲染为静态位图（`StrokeCache` LRU≤5），热帧只 `drawImage`+亮度层矢量重画；仅方向场时间项/亮度层走 `useCurrentFrame`；连续旋转相位用分段线性速度的时间积分 `swirlPhase(t)`（防变速跳变）。目标热帧 <50ms/帧，实测见 report。
- **版式**：中文 Noto Sans SC（900 标题/700 正文），奶油纸片字幕卡（#f6f1e6 底 + #1c2458 墨字 + 硬投影 + hash 微转角）；全片暗角常驻。
- **确定性**：mulberry32/hash1 + 解析时间函数，禁 Math.random/Date/网络。

## 复用适配点

- `shared/paint/strokes.ts` 整库拷走即用（API：`paintStrokes/swatch/stable/regionPalette/boilSeed/StrokeCache/makeNoise2d`）；换题改 world.ts 三件事：底稿 painter、方向场、区域路由 + 色板 token。
- 漩涡卷入转场参数表（中心/盖满帧/整景 scale+rotate）在 SC06 + SpiralSuck props 一处可调；灯塔/渔舍场景几何（`inTower/isFloor/isSea/isRoof/VP/LAMP`）即换题模板。
- 蒙克「刻意分化」预告（scream-warp 用）：`outline:0`（不描边）+ `len×1.6`（更长）+ 整层 alpha≈0.8（更透）——本库参数全开放。
- 音频配伍：BGM 配方 `12-aurora-glass`（STYLE_MAP `swirl-oil`）；SFX 主题音=stardust-swish（第一笔）+shimmer/sparkle（光感成形）+whoosh-swirl/bass-hit（hero 卷入对）+chime-crystal（收束），钉帧表同源 `research/beat-sheet.json`。

## 与近邻卡的边界（同族差异声明）

- **swirl-oil ≠ light-dabs（印象派）**：同用 P.strokes 底座但参数预设分化——swirl-oil 长笔触（len22-64）+深色描边（0.8-0.9）+三遍分区+漩涡方向场；light-dabs 短笔触色点（印象派光斑、位置固定不沸腾、不勾轮廓）。域：后印象派表现主义笔触 vs 印象派外光写生。
- **swirl-oil ≠ scream-warp（蒙克）**：刻意分化纪律——蒙克不描边/更长/更透的流动性笔触 vs 梵高深描边短促厚涂；swirl-oil 的 hero 是漩涡母题转场，scream-warp 是波动扭曲。
- **swirl-oil ≠ lily-pond（莫奈）**：莫奈水光横向碎笔+睡莲母题、boil 只给水面；swirl-oil 全域方向场+漩涡。
- **swirl-oil ≠ liquid-flow**：liquid-flow 是矢量液态模拟（ metaball/流体守恒），swirl-oil 是静态笔触面+方向场（画出来的流），无物理。

## QC 豁免档

- 定帧段 f356-391 构图冻结 1.2s：微动=8fps boil（笔触层缓存键持续前进）+ 星闪 + 海面波光 + 螺旋带旋转，probe_liveness 需按「合法微动」判读。
- SC06 卷入期（f263-292）整景 scale 最大 2.7×：缓存位图放大出现笔触软化——「凑近看油画」的语义本体，非渲染缺陷。
- 灯晕亮核（hiKeep>520 保底稿色）呈放射状星芒：梵高星夜光源的画法本体（配方 09 同机制），非描边脏点。
- f1 暗场（cover 0.88 隐透笔触）：钩子前 1 帧的「未落笔之夜」，非空屏（亮度层与笔触仍活动）。

## 样张

`sample.jpg` = 正片 f90（S01 全景：灯塔+渔舍+星月夜三漩涡+区域色板三遍笔触+灯晕光束，全签名同框），回归三查对照基准；辅证 `out/stills/frame-285.png`（hero 漩涡卷入盖满）、`frame-235.png`（21 枚 token chips stagger）、`frame-300.png`（漩涡特写）、`frame-1.png`（暗场+落笔前）、`frame-391.png`（定帧收束卡）。
