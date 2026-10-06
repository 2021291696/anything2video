# SPEC：沙画（sand）

**正本源工程**：`usa250-sand`（2026-09-27 验证交付，frame_metrics 高/中/低 0）｜**图元库**：`sand.tsx` + `icons.ts` + `grain.png`
**风格句**：经典灯箱沙画——暖纸底灯箱、深沙铺层、纸色描边"擦"出形体、手影引导、全局噪点颗粒。

## 锁死项（改动=破坏风格稳定性，须走正本升级流程）
- **色 token**（`SAND`）：dark `#4a3520`｜deep `#33241a`｜paper `#e9d9b4`｜glow `#f7edd2`｜amber `#a06a28`（唯一点缀色）｜edge `#c9b384`｜base `#eedcb6`；明暗四阶 `SAND_SHADES`：light `#f6ecd0`/base `#eedcb6`/mid `#c8a76b`/deep `#7d5f36`；描边纸色 `#f0e2be`。
- **幕底**：`Paper`（径向辉光纸底 62%×55% @50%,44%）＋ `SandScene` 深沙 wash（rgba(62,43,25,.93)→rgba(36,24,13,1)）＋ `SandPost` 颗粒 0.5 + 暗角。
- **纹理**：`grain.png`（512² 噪点）——全局 Grain（multiply，随帧 (7,13)px 漂移）与形内颗粒共用；**禁元素级逐帧漂移纹理**（clipPath+image 塌方源，SandIcon 默认 grain=false）。
- **画法词汇**：`Stroke`（dash 画入，easeInOutPow1.8，len22f，blur 0.45×）｜`Shape`（整形淡入 blur1.4）｜`SandVolume`（三遍体渲染：投影 dx7dy7→基形→高光）｜`Sketch`（多笔次序勾勒）｜`SandIcon` 两阶段（勾线 26f→60% 处铺沙填充）。
- **手影**：`Hand`/`HandPoint`/`HandOpen` + `handAt` 编舞（线性插值，全局帧）。
- **版式**：`SandText` Noto Sans SC 900、120px、letterSpacing 10、blur 0.3、纸色辉光 textShadow。

## 复用适配点（拷库后必改）
1. `sand.tsx` 的 `GRAIN_URL = staticFile('assets/usa250-sand/grain.png')` → 改成新片 slug，并把 `grain.png` 拷进 `public/assets/<slug>/`。
2. `icons.ts` 图标骨架可按新片主体增补（Iconify 拉 ds，许可 MIT/Apache 优先，**CC-BY 的 dove 必须在 MANIFEST 署名**）。

## QC 豁免档
- 深底镜头的"主角无光/紫色碎片"类量化低项按帧定性（沙面本身低反射，误报源）。
- 深底场景用 `SAND_SHADES` 亮沙变体（lessons：默认配色只适配单一底色）。
- 性能：探针塌方线 500ms；禁 feConvolveMatrix、逐像素颗粒运算。

## 样张
`sample.jpg` = 正片 f1989/3978（自由女神+帆船+手影+双语字幕），回归三查（色板/笔触/版式）的对照基准。
