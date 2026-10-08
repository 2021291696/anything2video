# SPEC：扁平矢量弹性 MG（pop-dot）

**正本源工程**：`samples-v4/pop-dot`（2026-10-07 验证交付）｜**图元库**：工程 `src/style/kit.tsx`（PD/SHADE token + 弹簧三件套 + ShapeWipe + QuadrantGrid + 小动件词汇，纯代码零纹理依赖）
**风格句**：六色高饱和平涂 + 每主色 SHADE 自明暗对 + 弹簧物理三段（预备→冲出→回弹）+ 元素 stagger 错峰 + shape-wipe 色块擦除转场 + crisp 选择性快门。
**技法借鉴** mg-styles-15 demos/01-flat-vector (MIT, Vincentwei1021), TSX 重写——spring/springV/kick/pop 数学、SHADE 映射（源码 index.html:117）、ShapeWipe 三形（:171-173,519+）、crisp 8% shutter（:170）、ping/buzz/蒸汽词汇（:239-232,224），全部以 Remotion(React+TSX) 惯用法重写，零代码拷贝。

## 锁死项
- **色 token**（`PD`，六主色 + 派生，不许引入第七色相）：U `#2B2BFF`（群青=世界底/结构，派生 UD/UL/UT/UP）｜CO `#FF5A4E`（珊瑚=硬币/hero，派生 COD/COL）｜SU `#FFC62B`（葵黄=强调/数字，派生 SUD/SUE）｜MI `#2EE6A8`（薄荷=存钱罐/正向，派生 MID）｜CR `#FFF6E9`（奶油=地面/卡片/字，派生 CRD/CRS）｜INK `#151433`（墨夜=线条/文字，伴 INKW `#2A2962`）。
- **SHADE 自明暗对**（`SHADE` 映射，签名纪律）：每个主色的暗侧面/投影/未点亮态用自身 SHADE 色（MI→MID、CR→CRD、CO→COD、SU→SUD、U→UD、INK→#0B0A22），**非黑非灰非渐变**；UNLIT 映射管窗口/凹陷态。
- **红线：无渐变、形状无轮廓描边**。明暗=色块并置；线条类造型元素（速度线/放射线/曲线/尾巴）是造型不是描边，豁免。
- **弹簧三件套**（锁死默认参数）：`spring(t,f=2,z=.4)` / `springV`（速度导数）/ `kick(t,t0,f=3,z=.35)`（衰减余弦震屏）；`pop(t,t0,f=2.4,z=.42,amt=.12,pin=.9)` → [scale, squash]——**squash 用速度导数限幅 clamp(±0.3)，pin 秒后钉死 1**（缩放下无亚像素漂移）；`popStyle` 把 [s,k] 变成 scale(s/(1+k), s*(1+k))（⚠ CSS scale 两参必须逗号）。钩子级主体可用放大档（f=3.0/z=.42/amt=.18），物理手感不变。
- **元素 stagger 错峰**：同拍多元素一律逐件 +2f 错峰 pop（存钱罐六件、象限硬币阵、装饰形），落定锚点用 transformOrigin 控（落地件 '50% 100%'）。
- **ShapeWipe 转场**（章节缝唯一转场，禁 dissolve）：三形 circle/pill/half（半圆=大穹顶 inQ 加速压落变体），盖入 6f / 缝帧换景 / 揭开 9f，圆与胶囊走 log 空间 scale（源码 W2 手法）；**色块擦除边缘一律过 `crisp(f, .08)` 只取 8% 快门**——防平涂色块边缘糊出「渐变感」（源码极具参考价值的细节修正）。
- **幕震**：`kickAt` 解析衰减余弦（无随机），冲击表对位大拍；hero 11px/12f，常规 4-5px。
- **镜头语言**：单场景整幅轻推 zoom 1→1.03 easeInOutQuad + kick 幕震；场景间 ShapeWipe 切换；无平移运镜。
- **版式**：中文全部 Noto Sans SC（900 大字/700 正文），字色只走 CR/INK/派生淡色（UP/SU），字幕为奶油 pill 卡（CR 底 + CRD 硬投影 + pop 入场）。

## 复用适配点
- kit 整库（`src/style/kit.tsx` 单文件 ~330 行）拷走即用；新片改 `src/shots/G1/shots.tsx` 场景内容 + `Main.tsx` 的 `WIPES` 转场表 + `shots.tsx` 导出的 `IMPACTS` 幕震表三张表即可换题。
- 图元菜单：`pop/popF/popStyle/spring/springV/kick/kickAt/crisp` 原语｜`ShapeWipe`（三形转场）｜`QuadrantGrid`（2×2 象限节拍网格容器）｜`PingRing`（扩散环）/`BuzzArc`（震动弧线）/`SpeedLines`（拖尾线）/`Steam`（dasharray 流动）/`Rays`（放射线）/`PillTag`（胶囊标签）/`DotCaption`（字幕卡）｜复用件范式：Coin（面+环+字三层平涂）、Piggy/PiggyHalf（clipPath 剖半+内壁+罐内物）。
- 「翻倍」类概念模板：SC04 象限节拍网格（1/2/4/8 逐象限 burst + 逐枚错峰）与 SC05 剖开三波弹跳（×1/×2/×4 递进计数）可直接改数字复用。
- 音频配伍：BGM 配方 `01-flat-vector`（STYLE_MAP `pop-dot`）；SFX 主题音 = impact/metal-spring-hit（弹簧拟音）+ ui/pop（弹跳落定递增对）+ impact/bass-hit-short（hero 唯一重拍）+ ui/chime-crystal（惊奇感），钉帧表同源 `research/beat-sheet.json calibrated.sfxCues`。

## 与近邻卡的边界（同族差异声明）
- **pop-dot ≠ pop-comic**：pop-comic 是波普漫画页（纸白底+粗黑描边+半调网点+硬错位阴影+贴纸拍入，情绪外露快节奏）；pop-dot 是企业 explainer 平涂弹性 MG（大色场+无描边+弹簧物理+色块擦除，克制理性科普）。两者共享「pop」字面但物理体系不同源（pop-comic 0.16s E.i2 加速砸落 vs pop-dot 闭式阻尼弹簧三段），不共享 token。
- **pop-dot ≠ swiss-print**：swiss 是版式排版驱动（网格/字重/留白），pop-dot 是形状语法（圆/胶囊/圆角矩形拼一切）+ 弹性物理驱动。
- **pop-dot ≠ morph**：morph 管单主体形变（A→B 插值），pop-dot 管多元素 stagger 弹入 + 色块擦除的场景编舞；本卡弹簧数学未来可被 morph 复用（RECON 裁决方向），但卡层互不覆盖。

## QC 豁免档
- f336-369 收束卡定帧 1.1s：微动效=sin 浮动 ±3.4px + 放射线慢旋 + f348 ping 环 + 四角 deco hash 帧量化闪烁 + 末 6 帧轻收暗 0.35——合法微动（禁全静止达标，probe_liveness SC07 相邻 MAD 0.8-9.3 有活性），不修。
- U 底大色场（SC01/SC07 单亮度桶占比 ~87-92%）：扁平矢量风格本体（tone-on-tone 大色场），非空屏——帧内含硬币/标题/圆环/装饰形（stills 为证）。曾 3 帧 >92% 触发 probe_blank 红，已用风格内手段（大 UT 同色系圆环背景形）压回后全绿；后续换题若再触线，优先加 tone-on-tone 背景形而非豁免。
- ShapeWipe 盖入期（每缝前 6f）画面被色块大面积覆盖：转场语义本体（源码同款），probe_blank 帧级检查已按「硬切过渡帧豁免」放行缝帧；缝后揭开期内容正常。
- 幕震期间整幅平移造成帧间大 MAD——有意冲击语言（解析 kick，≤11px、≤12f、衰减），非渲染抖动。
- f210 门禁帧为「剖开进行时」（两半 mid-pop 拉开中）：是动作帧非缺帧，读图按「裂缝展开瞬间」定性。

## 样张
`sample.jpg` = 正片 f240（HERO：存钱罐剖开两半 + 硬币三段弹跳 ×1/×2/×4 stagger + 放射线 + 落点 burst 线 + 字幕卡，全签名元素同框），回归三查对照基准；辅证 `out/stills/frame-90.png`（存钱罐+胶囊 wipe 进行时）、`out/stills/frame-125.png`（罐 buzz+第二枚硬币弧线+PillTag）、`out/stills/frame-180.png`（象限节拍网格 1/2/4 翻倍阵）、`out/stills/frame-300.png`(雪球双曲线对比)、`out/stills/frame-369.png`（收束卡定帧+大环微动布局）。
