# SPEC：黑板（chalk）

**正本源工程**：`chalk-math`（2026-09-27 验证交付）｜**图元库**：`chalk.tsx` + `dust.png`
**风格句**：深绿黑板 + 白垩压力笔触（颗粒+粉尘+双影）+ 板书字 + 板擦转场。

## 锁死项
- **色 token**（`CHALK`）：board `#1e3b2f`｜boardDeep `#152b23`｜boardEdge `#0f2019`｜white `#f5f2e8`｜yellow `#e8d48b`｜blue `#a8c8e8`｜pink `#e8a8b0`；木框 `#5a4632`。
- **幕底**：`Board`（径向 #24473a→board→boardDeep）＋ `ChalkPost`（dust 纹理 screen 0.35 漂移 + 板缘 14px 木框 + 暗角）。
- **笔触契约**：`ChalkStroke` = perfect-freehand `{size 10, thinning 0.4, smoothing 0.55, streamline 0.35, simulatePressure: true, easing easeInOutPow1.3}` + 三层渲染（灰尘晕 blur3.5 op0.14 / 白垩核心 blur0.6 op0.9 / 双影 translate(2,-1.5) 1.6px op0.35）。
  - **点距契约**：点列相邻间距 ≈6–10px（`ptsLine` 默认 n=28；长线加大 n），偏细 size×1.5 补偿——随建组任务书写明。
- **版式**：`ChalkText` Noto Sans SC 900、rotate −0.8° 手写歪斜、blur 0.5。
- **幕**：`ChalkScene` 淡入 12f/淡出 14f；`EraseMark` 板擦横痕 16f。

## 复用适配点
1. `DUST_URL = staticFile('assets/chalk-math/dust.png')` → 改新片 slug，拷 `dust.png` 进 `public/assets/<slug>/`。
2. 无图标骨架文件（粉笔片图形直接笔画勾勒）；需要图标骨架时按 blueprint/sand 的 icons.ts 模式新增。
3. **竞品技法增补（opt-in，默认全关，不影响上方默认词汇）**：
   - `ChalkGeo.line/rect/circ/hatch/arrow`（手绘几何生成器，返回 path d）：hash=`fract(sin(n*127.1+311.7)*43758.5453)`、`jit=(hash-.5)*2a`、种子每调用自增 7.31（`nextGeoSeed()` 只许在模块层调用，渲染保持纯帧函数）；line 端点抖 ±2 + Q 控制点偏 wob5；rect 四角抖 2、每边控制点抖 min(4,w/12)（纵 h/12）、收笔越过起点 4-5px；circ 44 段折线、起始角 -0.6π±0.3、扫 1.12 圈搭口、半径抖 3.5%；hatch 45° step12-13 解析裁剪；arrow Q 弓形主线+双翼 ±0.82π head26。seed 显式传参，同 seed 恒同形，可 seek。
   - `ChalkDash`（笔画 dash-reveal）：round cap/join，len=`dLen(d)`（解析 M/L/Q，build 时一次带缓存），每帧 `dashoffset=len*(1-easedU)` 从起点写出；`dashStyle` 虚线笔画必须走 SVG mask（白 path 宽+10）承载 reveal，否则变蚂蚁线；粉笔三层质感同 ChalkStroke。多子路径 d（hatch）按 SVG 语义各子路径并行写出。
   - `WriteText`（逐字符现写）：每字符 `clip-path: inset(-12% ((1-u)*100)% -22% -4%)`（负值上下边距防裁 ascend/descend，踩坑参数原样保留）；窗口模式字符 j 出场 `at=a+(b-a)*j/n`、单字时长 `clamp((b-a)/n+0.04s, 0.08..0.2s)`；`cps` 模式按字宽匀速（每段时长=字宽/cps，配 `paceCps`）。x/y 为左上书写锚。
   - `ChalkErase` + `eraseAt`/`eraseFadeF`（板擦擦除）：目标区域 3 横带蛇形（中带反向）；目标消失时刻由中心反推 `at=(r+along)/3*dur`、淡出 0.12s；擦痕残留 3 圆角矩形（blur18、fill rgba(225,235,228,.05+.02q)、x 抖 ±30）opacity=u；板擦本体 rotate(-8+6sin(t·30))≈4.8Hz 手腕抖。
   - `paceCps(totalEm, t0, t1, hold=1.2)`：cps=totalEm/(t1-hold-t0) 下限 10（秒域），配 `wlen`（CJK=1/拉丁 0.48/空格 0.3 em）。
   - `wrapLines(text, maxEm)`：原子切分（，：；后断、「 · 」分隔）→ 超长原子空格/顿号二分 → DP 最小化最长行；行永不跨 ：；。确定性。

> 技法借鉴 lanshu-create-ai-presenter-video（MIT, cclank）——Remotion 重写，2026-10-07

## QC 豁免档
- 粉尘层会被 frame_metrics 记"背景碎屑"——看帧定性为风格本体，不修。
- 量化"主角无光"在板书字镜头常误报（白垩字低反射）——按帧定性。

## 样张
`sample.jpg` = 正片 f714/1429（勾股定理三方格+双语字幕），回归三查对照基准。
