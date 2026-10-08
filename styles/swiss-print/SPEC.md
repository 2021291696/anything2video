# SPEC：版式（swiss-print）

**入库日期**：2026-09-29（用户确认）｜**正本源工程**：`style-samples/src/styles-try/swiss-print/`（样片《少即是多》12s，用户确认）｜**图元库**：`swiss.tsx`（无纹理/字体文件依赖）
**风格句**：瑞士国际主义版式——严格 12 列模数网格、超大 grotesk 黑字 900、唯一红色几何强调、大量留白、非对称但精确对齐、硬切精确位移。

## 锁死项
- **色 token**（`SWISS_TOKENS`）：**严格四色** white `#fafafa`｜black `#111111`｜red `#e63329`（唯一强调）｜grey `#9a9a9a`——禁任何其它色。
- **纯平契约**：无发光/无渐变/无阴影；动画纯位移硬切 + easeOut（无回弹）。
- **版式常量**：12 列模数网格（`SWISS_COLS=12`、页边距 80）；`MIN_FONT=22`；随机只用 `swissHash` 种子杂凑（禁 Math.random/Date）。
- **字体**：系统栈 `'Helvetica Neue','Helvetica','Arial',sans-serif`（不随库分发——Helvetica/Arial 就是最正宗的 Grotesk）；字宽用 `swissTextW` 估算表（误差 <2%）。

## 词汇清单
`SwissText`（900 大字 + `fitSwiss` fit 逻辑）｜`SwissGrid`（12 列网格线层，"闪现一瞬"版式自证）｜`RedCircle`（唯一强调几何）｜`Hatch45`（45° 斜线束单次横扫）｜`MarginNote`（22px 边注系统）｜`Rule`（细线精确画出，红下划线用）｜`SwissFrame`（海报收束框）｜缓动 `easeOutCubic/easeInOutCubic`。

## 复用适配点
1. 无任何 staticFile 依赖，直接拷库即用；不同机器无 Arial 时回退其它 sans，`fitSwiss` 保证不溢出（下划线对齐可能轻偏）。
2. 红圆的几何角色变奏（正圆→裁半圆→缩落交点）是样片的构图记忆点，新片应有自己的变奏（台账维度）。

## QC 豁免档
- 网格参考线"闪现"是有意的版式自证（白名单申报时计入）；静止挂底>45 帧在瑞士风格下仍算缺陷（留白≠静止）。

## 样张
`sample.jpg` = 样片 11.6s 处（海报构图：LESS IS MORE + 红圆 + 图框 + 边注），回归三查对照基准。

## opt-in 增补（2026-10-07，技法借鉴，默认输出不变）
- `SwissText` 新 props：`variant="maskRise"`（行容器 overflow:hidden，词 span translateY 105%→0 easeOutCubic，词间错峰 60ms、单词 420ms）｜`at` 起始秒｜`emphasis` 红色强调子串（首个匹配，卡内红）｜`tailRule`{length,dy,thickness,color}（词落定后横线 0.6s easeInOutCubic 画出）。默认 `variant='static'` 与旧版逐属性一致。
- `MarginNote` 新 prop：`reveal`（0..1，调用方算好传入）——左缘揭出 `clipPath: inset(-8px ((1-r)*100)% -8px -8px)`，r=easeOutCubic(clamp01(p*1.15))，opacity min(1,p*2)。不传 = 原样。
- `SwissBlocks`（新）：数据方块语义网格——ink 黑=数据｜accent 红=新或变｜grey=旧或已存｜ghost=透明+2px dashed=虚拟或跳过；默认 48px/圆角 14%/gap 8px；进场 translateY 26px 升起落定 + scale 0.82→1，`start`/`step` 错峰。
- `SwissReceipt`（新）：小票随打印行长高（HEAD 86/ROW 84/FOOT 44，`scale` 等比调）；行提前 120ms 喂纸、行本体 -12px 落下；锯齿底 clip-path 5% 步进齿深 18px；**纯平化覆盖源技法**：禁投影只留 1px 描边；`pre`/`swap` 契约（swap 前显示「？」类占位值）。
- `SwissPageTurn`（新）：章节转场包装——整帧 translateX(100%→0) easeInOutCubic 0.55s 推入，落定后 1px 墨色分隔线（Rule 0.4s 画出，无阴影）；`ruleY` 定位或 `{null}` 关。

> 技法借鉴 lanshu-create-ai-presenter-video（MIT, cclank）——Remotion 重写，2026-10-07

## v4.0 opt-in：SwissKinetic 运动包 + photo-collage（2026-10-07，默认输出不变）
- **`SwissKinetic` 运动扩展包**（四组件，参数照抄 huashu 12_bauhaus 配方；只用卡内四色 token）：
  `Pointer`（指针杆——斜长黑杆绕毂心缓转，`pointerDeg = from+(to−from)·easeOut(clamp((lt−at)/dur))`，默认 28→49.5°/at 0.26s/dur 0.22s（源逐帧量帧拟合曲线）；毂后 0.74/毂前 0.26 分段，counterweight 红短杆置毂后）｜
  `Grid`（轮换格窗——13fps 卡点 `step=floor((t−at)·fpsStep)`，每格相位 `sw=swissHash(seed,i)`，仅 `kineticSwapDue(step,sw)=(step+2sw)%9<6` 换色（不是每拍都换防机械），换色 `swissHash(seed+17(s+1),i)` 选色；色轮默认黑/红/灰/白四 token；`skip(i)` 留图样格/保留格）｜
  `Ball`（滚球——`x=x0+(x1−x0)·easeOutCubic`，转角=位移/半径，白直径线+心点同步转；滚动中两条灰色速度线）｜
  `Arcs`（同心弧——n 条红弧声波推：起点相位 `sin(9lt−0.7i)·0.05`、半径 ±3 呼吸、弧长 at 起 0.4s 从 55% 扫到 100%，满圆 `<circle>` 收尾，外圈逐条减淡）。
- **`HalftonePhoto` + `CutoutEdge`**（photo-collage 扩展，opt-in 默认关）：`halftonePath` 纯函数——45° 旋转网格采样 `lum(u,v)`，点径 `halftoneR=cell·gain·√(1−L)`，所有点并成一条 path 只 fill 一次（源「脸 3000 点 <2ms」性能语义）；`HalftonePhoto` 白纸垫底 + 单 path 渲染（lum 为程序化灰度纯函数，本卡无 canvas 位图采样）；`CutoutEdge` 外圈 7px `#fbf7ea` 剪纸白边（平涂，无阴影）。
  **纯平契约豁免条款**：仅当镜头显式挂载 `HalftonePhoto`/`CutoutEdge` 时，允许第五色 `#fbf7ea` 与网点纹理出现在该镜头；未挂载镜头仍严格四色纯平。
- **`StampText`**（opt-in）：逐字盖章——第 k 字 0.045k 秒起、0.12s 内 1.5→1 缩回，整排波浪跳 `stampHop=−10·max(0,sin(11lt−0.8k))`；每第 4 个字换色（红底黑点缀，四色 token 内）。
- 纯函数 `kineticSwapDue/pointerDeg/stampHop/halftoneR/halftonePath` 导出供数学断言；全部组件确定性（swissHash 种子杂凑，禁 Math.random）。

> 技法借鉴 huashu-art-motion 12_bauhaus / 22_constructivism（MIT, alchaincyf）——Remotion/TSX 重写，2026-10-07
