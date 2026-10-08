# SPEC：形变动画（morph）

**正本源工程**：`科普视频/samples-d8/s34-morph`（2026-10-06 验证交付）｜**图元库**：`src/style/kit.tsx` + `src/style/morph.ts`（纯代码 SVG/CSS，无纹理依赖）
**风格句**：图形丝滑连续互变 + 中介形状桥接 + 形变伴随位移旋转 + 挤压拉伸，苹果发布会级图形叙事。

## 锁死项

- **形变纪律**（签名特征，评审依据）：
  1. **路径对齐**：全部互变形状 resample 到统一顶点数（`N_VERTS=120`）+ `normWinding` 统一绕向 + `orientTop` 首顶点 12 点钟起步 + `alignStart` 逐对最优循环对位（argmin 顶点距离平方和，防打结）——自己构造形状时按同顶点数生成，禁止不同拓扑直接 lerp。
  2. **中介简形**：复杂 A→B 必须走 A→圆→B 三段式（两段各 8-12 帧），每片至少一处；中介圆要嵌进叙事（如拉远成远景光点），不做无意义桥。
  3. **挤压拉伸**：形变全程沿速度方向拉伸（v4.0 默认 `morphPose`/`makeM`：k=1+0.12·sin(πe) 骑在位移轨速度方向 phi 上，10-15% 带内）+ 旋转 ±5°（方向逐段交替）+ 位移漂移 ≤12px（二次贝塞尔轨）；绕局部支点的 impact 切向压扁/均匀脉冲由事件系统叠加。v3 固定轴向实现 `morphDeform`（sx +10% / sy −12%）保留为兼容视图，不再走默认链路。
  4. **速度曲线**：`cubic-bezier(0.7,0,0.3,1)`（中段最快），起止各留 3 帧缓冲（`morphProgress`：lf≤3 / lf≥dur−2 恒 0/1）。
  5. **轮廓连续**：逐帧位移必须缓动约束有界（实测峰值 ≤62px/帧）；最快段全帧渲染目检 + 数值复算双重验收；插值用手写逐点插值器（`lerpPts`），**禁朴素 SMIL**。
- **色 token**（`PAL`）：bg `#0b0b10`｜ink `#f5f5f7`｜dim `#9a9aa2`｜cupTop `#f7c98b`｜cupLow `#c98344`｜coffee `#7a4a26`｜steam `#f7d9ac`｜sunTop `#ffd98a`｜sunLow `#ff7a3d`｜sunTopDeep `#ff9b52`｜sunLowDeep `#e8455e`｜cityTop `#3d466e`｜cityLow `#141827`｜window `#ffd27a`｜dot `#ffcf7a`｜pinTop `#ff8a5c`｜pinLow `#ff4d3d`。
- **幕底**：深空 `#0b0b10` + 场景环境光 `Ambient`（径向 radial，随剧情 OKLab 迁移：暖琥珀→落日橙→暮紫→夜蓝→钉红）+ 全片暗角（72%/68% ellipse，0.4）。
- **主体构图**：单主体居中 `CX,CY=(640,340)` 全片恒定，跨镜头连续（形变链不切镜头重置位置）；主体填充=垂直渐变+同色 drop-shadow 辉光，颜色走 OKLab 插值（禁 RGB 直插走灰）。
- **节奏**：钩子 0.5s 内（主体弹入 popIn overshoot 或首段形变起）；形变链 ≥4 段；hero = 三段式+落定（60-75% 窗口）；结尾定帧微动效 0.8-1.2s（辉光呼吸周期 ~50f + 回声雷达波）+ 末 8-9 帧收暗 0.32。
- **笔触**：形状全部几何化单闭合轮廓（杯带实心把手、天际线阶梯楼顶、钉圆头收尖），不做细节堆砌；附属元素（热气虚线、咖啡液面 clip、窗灯矩阵、halo/雷达波环、落地投影）皆为非形变层，随形变做包络淡入淡出或塌缩（`winScale=1−0.82·e`）。

## 复用适配点

- 无 staticFile 纹理依赖，`kit.tsx` + `morph.ts` 整库拷入 `styles/<sku>/` 即用；`SHAPES` 表换主体形状时保持「单闭合轮廓 + 质心近原点 + 尺度 ±200px 内」即可直接互变。
- 窗灯矩阵 `cityWindows(seed)` 为确定性生成（mulberry32），换 seed 即换 twinkling 版本；`BUILDINGS` 表与 `CITY_RAW` 轮廓同步改。
- BGM 走 `bgm_generate --style morph`（08-morph future_bass）；形变 whoosh / 落定 pop 直配 Mixkit（swoosh-quick / pop-electric / zoom-air-fast，URL 可反查）。
- 非形变叙事元素（字幕定帧 `BrandText`、液面、热气）照 `SC01/SC04` 模式挂在形变组外层。

## QC 豁免档

- **落日 hold 大面积亮色**：落日圆 r150 亮橙占帧约 8%，帧均亮度指标偏高属风格本体，不修。
- **定帧段静止误报**：f372-404 仅辉光呼吸+回声环（微动效），frame_metrics 若判「画面不动」属合法结尾定帧（签名特征），不修。

## v4.0 升级（mg15 技法移植）

**改了什么（三项改默认实现，全部内嵌 `morph.ts` 数学库 + `kit.tsx` 组件，无新增依赖）**：

1. **makeM 速度方向拉伸**（源 08-morph index.html:329-339 机制重写）：2×2 矩阵复合 Q（沿速度方向 phi 拉伸 k、垂直 1/k）× R（旋转 rot、缩放 sc）× D（绕局部支点 piv 压扁 (1+q,1−q)），支点仿射不变；phi 由位移轨二次贝塞尔中心差分求出（`phiAlong`，g±0.02、速度 <0.5px 回退竖直向下）。默认链路换成 `morphPose`（k=1+STRETCH·sin(πe)，STRETCH=0.12、SWING=±5°——SPEC 带值）；`morphDeform` 固定轴向 sin 保留为兼容视图。
2. **impact 事件系统**（源 index.html:316-326 机制重写）：`impactEvent(tFrame, table, fps=30)`——`hit` 阻尼正弦冲击 v=a·sin(2π·τ/0.28)·e^(−7.5τ)（起于冲击前 2 帧、1.2s 窗，uni 变体为均匀缩放脉冲）；`press` 形变预备-释放曲线（压 0.3s、前 0.2s easeInOut 压满 → 0.12s easeOut 释放带 −0.35·a·sin(π·u) 下冲）。事件表 `ImpactEvent[]` 由卡内镜头表驱动、按 who 过滤后喂 `MorphHero`。
3. **smearCap 解析运动模糊**（源 index.html:604-611 + 471-505 机制重写）：快件按帧中心+半快门两端采样（`shutterFrames`：量化帧 ±0.25 帧，源 tqc±SH/2、SH=0.5/FPS）画 alpha 渐变胶囊（两端 0、平台 min(1,2r/L)、T=L+2r；L<1.5px 退化圆盘）。接入点：`MorphHero` 默认给形变主体画质心位移轨的快门胶囊，半径=当帧轮廓外接半径——**最快运动段（M3 类 12f 峰值 ~62px/帧）的步进感由解析模糊消除**。

**新增组件**：`SmearCap`（胶囊渲染层）、`MorphHero`（对位插值 × morphPose × impact × smear 的默认主体组件）；新增导出 `makeM/applyM/qbez/phiAlong/morphPose/impactEvent/smearCapGeom/shutterFrames/STRETCH/SWING/FPS/SHUTTER/EASE_PRESS_IN/EASE_RELEASE`。
**参数登记**：0.28s/7.5/1.2s/2 帧（hit）、0.3s/0.2s/0.12s/0.35（press）、±0.02（phi 差分）、0.5px（phi 回退阈）、1.5px（disc 阈）、SH=0.5/FPS——全部照抄源码，无自创参数；STRETCH=0.12/SWING=±5° 取自本卡 SPEC 既有锁死带。
**借鉴登记**：技法借鉴 mg-styles-15 demos/08-morph（MIT, Vincentwei1021）——makeM/impact/smearCap，TSX 重写，2026-10-07（morph.ts 与 kit.tsx 文件头有同款登记行）。
**QC 豁免撤销**：原豁免档「M3A 快速段步进感（无运动模糊）」条目已删除——**v4.0 smearCap 落地，该豁免撤销**，最快段按有运动模糊标准验收。

**签名帧特征不变声明**：`N_VERTS=120` 统一重采样、normWinding/orientTop/alignStart 对位链、via-circle 三段式、`MORPH_EASE=cubicBezier(0.7,0,0.3,1)`+3 帧缓冲、OKLab 插值、PAL 色 token、CX/CY 构图、窗灯矩阵（seed 20261076）全部未动；`morphDeform`/`MorphPath` 等旧导出数值与行为逐位不变（新机制全走新增导出）。

## 样张

`sample.jpg` = f263（hero 地图钉触地：辉光+触地阴影）。源工程 `out/stills/`：f150（落日圆+halo+暮色）、f200（城市天际线+窗灯矩阵）、f241（拉远圆点+扩散环）、f330（钉+品牌字逐字升入）为回归四查对照基准；`stills/_m3b_grid.png` 为最快形变段 12 帧连续性基准。

## v4.0 opt-in 增补（mg15 08-morph PartsMorph · Wave B5）

**借鉴登记**：mg-styles-15 demos/08-morph（MIT, Vincentwei1021）——index.html:344-362 blendParts 副部件系统。TSX 重写于 `parts.tsx`（morph.ts/kit.tsx 零改动，默认输出不变）。

**`PartsMorph` 副部件形变（opt-in）**：单闭合轮廓之外的「主体+可动副部件」选配层（源码「蒸汽→光线→波浪」签名的载体）。四族部件：
- **body**：与既有对位链同源（preparePart = orientTop∘resample；建议 N_VERTS=120 与 SHAPES 同拓扑）。
- **holes**（源 NH=72）：与 body 拼单 path、`fillRule=evenodd` 挖洞；A 有 B 无→向自身质心收拢消失（clamp(gA/0.6)），B 有 A 无→自 B 质心展开（clamp((gB−0.4)/0.6)）。
- **strokes**（源 NM=24 / 8 槽）：槽序错相 0.03s（槽序表 [7,0,1,2,6,3,5,4] 照抄）、gk=EIO(clamp((u−0.06−o)/0.7))；B 槽 w=0 →「原地收缩+淡出」（向槽中点收 f=1−0.7·smooth(0.05,0.48,u)、宽乘 wk=1−smooth(0.2,0.48,u)）。
- **shade**（源 NS=60）：前半段向 A 质心收拢、后半段自 B 质心展开，渲染 clip 在 body 内（源 :563 同法）。

外层位移/旋转/拉伸复用 morphPose 的 Xform（applyM 后喂点列）；EM/EIO 分别复用本卡 MORPH_EASE(0.7,0,0.3,1) 与 EASE_PRESS_IN(0.45,0,0.55,1)（与源 bez 常量同值）。
