# SPEC：蓝图（blueprint）

**正本源工程**：`blueprint-bridge`（2026-09-27 验证交付）｜**图元库**：`blueprint.tsx` + `icons.ts`（无纹理依赖）
**风格句**：深蓝晒图底 + 精确网格 + 白色工程线（实线画入/虚线隐藏结构）+ 黄色尺寸标注 + 图框标题栏。

## 锁死项
- **色 token**（`BP`）：bg0 `#0d2a4a`｜bg1 `#123a63`｜line `#d7e8ff`｜dim `#7fa8d9`｜accent `#ffd23f`（唯一强调，只给尺寸标注/重点）｜grid `rgba(160,200,255,.10)`。
- **幕底**：`BPGrid`（40px 双向网格 + inset16 图框 + 右上标题栏「BLUEPRINT NO. … · SCALE 1:200」）＋ `BPPost` 晒图褪色暗角。
- **线词汇**：`BPLine`（draw-on，ease 幂1.6，len24，w5；`dashed='18 12'` = 隐藏结构线语义）｜`BPDim` 尺寸标注（accent 黄、端点圆点、中置数字——工程图签名元素，每片至少出现）｜`BPIcon`（Iconify ds 白线逐条错峰画入，步进 0.55）。
- **版式**：`BPText` Exo 2/Orbitron、大写+letterSpacing 8；标注数字 Exo 2 700 24px。

## 复用适配点
- 无 staticFile 纹理依赖，直接拷库即用；`icons.ts` 按新片主体增补 Iconify ds（Apache-2.0 优先）。

## QC 豁免档
- 网格底会触发 frame_metrics"整齐点阵"误报——看帧定性，不修。

## 样张
`sample.jpg` = 正片 f669/1339（双铁塔+力线+图框），回归三查对照基准。
