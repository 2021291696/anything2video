# SPEC：形变动画（morph）

**正本源工程**：`科普视频/samples-d8/s34-morph`（2026-10-06 验证交付）｜**图元库**：`src/style/kit.tsx` + `src/style/morph.ts`（纯代码 SVG/CSS，无纹理依赖）
**风格句**：图形丝滑连续互变 + 中介形状桥接 + 形变伴随位移旋转 + 挤压拉伸，苹果发布会级图形叙事。

## 锁死项

- **形变纪律**（签名特征，评审依据）：
  1. **路径对齐**：全部互变形状 resample 到统一顶点数（`N_VERTS=120`）+ `normWinding` 统一绕向 + `orientTop` 首顶点 12 点钟起步 + `alignStart` 逐对最优循环对位（argmin 顶点距离平方和，防打结）——自己构造形状时按同顶点数生成，禁止不同拓扑直接 lerp。
  2. **中介简形**：复杂 A→B 必须走 A→圆→B 三段式（两段各 8-12 帧），每片至少一处；中介圆要嵌进叙事（如拉远成远景光点），不做无意义桥。
  3. **挤压拉伸**：形变全程 `morphDeform`：sx +10% / sy −12%（sin 包络，10-15% 带内）+ 旋转 ±5°（方向逐段交替）+ 位移漂移 ≤12px。
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

- **M3A 快速段步进感**：12f 峰值位移 ~62px/帧，缓动有界、逐帧连续，但无运动模糊，最快 2-3 帧有轻微步进感——三段式「8-12 帧」与零 filter 纪律优先，看帧定性不修。
- **落日 hold 大面积亮色**：落日圆 r150 亮橙占帧约 8%，帧均亮度指标偏高属风格本体，不修。
- **定帧段静止误报**：f372-404 仅辉光呼吸+回声环（微动效），frame_metrics 若判「画面不动」属合法结尾定帧（签名特征），不修。

## 样张

`sample.jpg` = f263（hero 地图钉触地：辉光+触地阴影）。源工程 `out/stills/`：f150（落日圆+halo+暮色）、f200（城市天际线+窗灯矩阵）、f241（拉远圆点+扩散环）、f330（钉+品牌字逐字升入）为回归四查对照基准；`stills/_m3b_grid.png` 为最快形变段 12 帧连续性基准。
