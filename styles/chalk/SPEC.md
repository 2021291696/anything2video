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

## QC 豁免档
- 粉尘层会被 frame_metrics 记"背景碎屑"——看帧定性为风格本体，不修。
- 量化"主角无光"在板书字镜头常误报（白垩字低反射）——按帧定性。

## 样张
`sample.jpg` = 正片 f714/1429（勾股定理三方格+双语字幕），回归三查对照基准。
