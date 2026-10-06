# SPEC：液态流动（liquid-flow）

**正本源工程**：`科普视频/samples-d8/s34-liquid`（2026-10-06 验证交付）｜**图元库**：`src/style/kit.tsx`（纯代码 SVG/CSS，无纹理依赖）
**风格句**：图形像液体一样流动拉丝滴落融合 + 波浪边缘转场 + metaball 融合 + 有机曲线永不直线（宣传向，食品饮料气质）。

## 锁死项

- **色 token**（`LQ`）：cream `#f8f0dc`｜creamDeep `#eedebd`｜tea `#c07a24`｜teaBright `#e5a34d`｜teaDeep `#8f4d12`｜foam `#f4dfb6`｜leaf `#5d7a2e`（点缀全片 ≤2 次）｜ink `#3a2310`（品牌字）。
- **幕底**：`LqBackdrop` 奶油暖径向 + 轻暗角；茶形体统一 `TeaGradDefs` userSpaceOnUse 屏幕纵轴渐变（bright→tea→deep），拼接无缝。
- **签名缓动**：`LIQUID = cubic-bezier(0.22,1,0.36,1)` 一切甩出类运动（转场/提起/文字淡入）；`FALL = powIn(2.2)` 唯一重力例外；`keyEase` 三段手 K（扫入—驻留—甩出）专供转场前沿；全片禁匀速。
- **液态转场**：`LiquidWipe`/`LiquidDrain`，前沿偏移走 `wipeOffset`——kπ 交替反相（任意帧相邻瓣必反向，3-5 凸起可数）+ 全局行进 p·2.6 + 每瓣异相呼吸 0.85·sin(p·3.1+k·1.7)；前沿泡沫亮缘双描 + 液珠随动。禁用单段缓动直接推前沿（LIQUID 过前载，前沿 4 帧即出画）。
- **metaball 融合**：`GooFilter` = `feGaussianBlur stdDeviation≥20`（本卡 22）→ `feColorMatrix` alpha 行 `0 0 0 26 -12` → `feComposite atop`；主体融合（滴-面/形-包/球-盘）必须走此滤镜。**小半径件（r<10 珠/溅点）会被阈值吞掉，须移出 goo 组用 crisp 层**；细颈拉丝用 `ribbonPath` 肥胖带在 goo 外绘制（两端埋入形体 ≥26px 遮接缝）。
- **拉丝-断裂-回弹**：提起留细颈（宽 30→7 收细），断裂后两端 `damped`（exp 衰减 sin 振）回弹可见 2-3 帧再吸入/化滴，主形过冲 ±18px 回位。
- **follow-through**：次级件延迟主体 2-3 帧跟随；落地 `landSquash`（3 帧压扁 0.55 → 过冲 1.19 → 收定，sx/sy 体积近似守恒）；下落中段 `fallStretch`（峰值拉伸 0.35，sxy 反向）。
- **有机曲线**：形体一律 `blobPath`（多瓣正弦平滑闭环）/ `poolEdge`（4 瓣交替反相缓浪 amp≥20）/ wobble 圆——禁直线边缘（文字除外）；汤面缘线用 `EdgeFadeDefs` 中部淡出（不横穿隆起）。
- **版式**：品牌字 Noto Serif SC 900 60px + letterSpacing 10（ink 色，LIQUID 淡入上升）；EN 小字 Noto Sans SC 600 16px ls9（ink 55%）。
- **节奏**：结尾定帧微动效 0.8-1.2s（液面呼吸/蒸汽/泡沫微闪，构图锁定）；转场钩子=前沿 0.4s 内漫入。

## 复用适配点

- 无 staticFile 纹理依赖，`kit.tsx` 整库拷入 `styles/<sku>/` 即用；换主题只改 `LQ` 色 token（茶琥珀→任意食品饮料系）与品牌字。
- `wipeOffset/poolEdge` 的 seed 参数换卡即换波形；`keyEase` 三段 stops 可按片长重排。
- BGM 走 `bgm_generate --style liquid-flow`（07-liquid/future_bass 配方）；hero 断裂帧 = `--drop <断裂秒>`（本片 8.4 对位 f251）；SFX 用 Mixkit 本地 fluid/transition 类目钉帧（`mix_sfx` 模式）。
- 镜头组件演示五镜结构：泼入钩子 → 滴-面融合 → 主体隆起 → 拉丝断裂（hero）→ 入盏定帧，可直接作新片骨架。

## QC 豁免档

- **goo 滤镜吞小件**：r<10 的微滴/溅点在 goo 内不可见（blur+阈值）——这类件走 crisp 层是有意设计，不是 metaball 缺失；主体融合仍全走滤镜。
- **极简留白**：SC01-SC02 前半奶油空镜 + 底部汤面为有意极简（液态卡信息密度低），frame_metrics 若判「画面不动」看液面波浪相位（t 驱动持续变化）定性，不修。
- **汤包下柱影**：隆起体与池体同渐变下在池缘线以下可见形界（f150 类帧）——读作茶汤深度，非接缝 bug，不修。

## 样张

`sample.jpg` = 正片 f400 品牌定帧（盏环+波浪液盘+品牌字+蒸汽全要素）。`out/stills/`（源工程）：f9（波浪前沿 5 凸起）、f66（metaball 汇面）、f170（琥珀汤包）、f248（拉丝细颈）、f253（断裂回弹）、f296（注液）为回归检查对照基准。
