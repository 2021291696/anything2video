# 15 大人类工艺材质世界宝典（Material World Codex）

> 本文件是 `recipes/epic.md`（史诗品牌片配方）的材质世界核心知识库。
> 知识来源：OPUS 5.5《A family history of making》16 章节全量拆解与定量测量（`measure_art.py` 实测输出）。
> 核心原则：**AI 出世界底（有机材质与氛围），代码出秩序（毫米级文字与几何）**。AI 帧严禁包含任何可读文字、假刻字或精准图表。

---

## 1. 材质世界矩阵总表

| 序号 | 材质世界 | 历史时代/载体 | 画面媒介 | 色温倾向 (R-B) | 亮度档位 | 暗角档位 | 推荐代码叠加层 |
|---|---|---|---|---|---|---|---|
| M01 | 洞穴岩壁 | 40,000 BCE 旧石器时代 | 粗粝石灰岩 + 矿物赭石手印 | 极暖 (+38) | 70–90 | deep | ✦ 掌心火星呼吸、星火微粒 |
| M02 | 深海沉船 | II c. BCE 古希腊安提基特拉 | 深海水下摄影 + 锈蚀青铜 | 冷青绿 (-18) | 50–70 | deep | 旋转天体刻度盘、水下悬浮光斑 |
| M03 | 青铜星盘 | II c. BCE 天文机械 | 黄铜精密齿轮 + 宇宙星云底 | 金暖 (+28) | 80–110 | cinematic | 精确天文圈、✦ 轴芯高光 |
| M04 | 泥金细密画 | 830 CE 巴格达智慧宫 | 羊皮纸 + 青金石蓝与金箔 | 富丽暖 (+24) | 120–140 | paper | 伊斯兰几何星花纹、微量金色星尘 |
| M05 | 水墨宣纸 | 1703 莱布尼茨/易经 | 生宣焦墨浸润 + 纸纤维 | 墨白中性 (+2) | 160–180 | paper | 八卦阴阳爻线 stagger、黑白对比 |
| M06 | 提花织机 | 1804 雅卡尔打孔卡 | 胡桃木机械结构 + 穿孔纸带 | 温暖木质 (+22) | 90–120 | cinematic | 打孔带数字编码流、经纬线交错 |
| M07 | 钢版雕刻 | 1843 洛夫莱斯/分析机 | 19 世纪精细铜版排线印刷 | 暖黄旧纸 (+18) | 130–150 | paper | 伯努利数计算表、齿轮传动线框 |
| M08 | 现代信息图 | 1948 香农信息论 | 50 年代包豪斯扁平纸面印刷 | 暖黄复古 (+14) | 140–160 | paper | 脉冲编码波形、二进制通道拓扑 |
| M09 | 图灵打字 | 1950 图灵纸带与测试 | 重磅打字纸 + 机械击键压印 | 浅暖米白 (+8) | 150–170 | paper | 等宽打字机程序叠加输出（禁 AI 乱字） |
| M10 | 浮世绘冬夜 | 1950s 晶体管与逻辑门 | 江户木刻版画套色 + 漫天细雪 | 冷蓝带暖 (-12) | 60–85 | deep | 纸窗暖橙烛光锚点、缓慢飘落程序雪花 |
| M11 | 榧木围棋 | 1997/2016 机器博弈 | 数百年榧木棋盘 + 蛤蜊云石 | 沉稳木暖 (+26) | 90–110 | cinematic | 棋盘网格高亮、落子冲击波与胜率曲线 |
| M12 | 暮光飞鸟 | 1986 Boids 群体算法 | 黄昏天际线深蓝紫 + 椋鸟群剪影 | 冷暖过渡 (+6) | 70–95 | cinematic | 粒子群避障向量场、邻域连线 |
| M13 | 宣纸家谱 | 谱系收束章 | 手工做旧皮纸 + 斑驳纸边 | 纯正宣纸 (+16) | 160–185 | paper | 径向向下家谱根须 (`RadialRootTree`) + 朱红方印 |
| M14 | 雨夜屏幕 | 现代开发端夜景 | 模糊毛玻璃雨滴 + 屏幕冷光 | 冷中带光 (-15) | 40–60 | deep | 终端闪烁光标、代码滚动、高光聚焦 |
| M15 | 终篇岩壁 | 闭环回归 | 首尾同景洞穴石壁 | 极暖 (+38) | 70–90 | deep | 标识归一、EndCard 独立左对齐落版 |

---

## 2. 核心 Prompt 模板与各媒介配方

### 通用 Prompt 骨架（严格执行，违者必崩）
```
[Medium Style] style of [Scene Subject],
[Material Details & Textures],
[Lighting Direction & Atmosphere],
16:9 aspect ratio, cinematic composition with generous negative space,
Negative prompt: text, letters, words, writing, numbers, typography, watermark, logo, captions, UI, distorted geometry, modern digital artifacts.
```

### 精选材质 Prompt 规范

#### M01. 洞穴岩壁 (Cave Stone)
* **Prompt**: `Paleolithic cave painting style, close-up textured limestone wall with ancient ochre and charcoal hand stencils, subtle earthy deer silhouette, soft flickering warm torchlight from bottom-left, deep shadows, rich ancient stone crevices, 16:9, cinematic still, hyper-tactile mineral pigments.`
* **Negative**: `text, letters, words, modern, digital, watermark, neon.`
* **Lighting**: 画左低位暖烛火/篝火光，边缘大范围暗化。

#### M02. 深海沉船与青铜星盘 (Antikythera Shipwreck)
* **Prompt**: `Underwater archaeological documentary photography, ancient shipwreck on sandy Aegean seabed, heavily encrusted ancient bronze gears and celestial mechanism partially buried in sand, god rays filtering through deep turquoise water, floating sea particles, atmospheric cinematic lighting, 16:9.`
* **Negative**: `text, inscriptions, modern diver, trash, cartoon, text watermark.`
* **Lighting**: 顶部天光穿透深水形成丁达尔光柱。

#### M05. 水墨宣纸与阴阳卦象 (Ink Wash & Xuan Paper)
* **Prompt**: `Minimalist traditional Song Dynasty ink wash painting, high-texture handmade Xuan paper with subtle fibrous pulp, flowing dark sumi ink wash gradients, delicate misty negative space, soft ambient natural daylight, 16:9, timeless Zen aesthetics.`
* **Negative**: `calligraphy, characters, stamps, red seals, modern, glossy.`
* **Lighting**: 柔和阴天无阴影漫射天光。

#### M10. 浮世绘冬夜 (Ukiyo-e Winter Night)
* **Prompt**: `Authentic Edo period Japanese ukiyo-e woodblock print style, snowy winter twilight over traditional dark timber house, delicate falling snowflakes, deep indigo blue night sky, warm glowing paper shoji screen lantern emitting soft golden amber light, subtle woodcut relief grain, 16:9.`
* **Negative**: `kanji, modern text, photo-realism, 3D render, glossy.`
* **Lighting**: 冷夜大环境中的局部暖灯笼光（冷夜暖锚点）。

#### M13. 宣纸家谱图谱 (Xuan Paper Genealogy)
* **Prompt**: `Top-down macro shot of antique blank Chinese mulberry paper scroll, textured aged deckle edges, subtle golden flecks embedded in warm ivory parchment, clean minimalist background with ample breathing room, soft warm studio rim light, 16:9.`
* **Negative**: `text, writing, drawings, ink marks, dirty, noisy.`
* **Lighting**: 均匀柔和的古典暖漫射光，完美适合叠加 SVG 根系网络与朱砂印章。

---

## 3. 代码叠加工位配对规则

1. **背景亮度与版式联动**：
   * `meanLum < 140`（暗底章：岩壁、深海、雪夜、雨夜）：
     * 角标文字：`rgba(255,255,255,0.92)`
     * 诗行字幕：白色衬线主文字 + 描金细线 `─── ✦ ───`
   * `meanLum >= 140`（亮纸章：宣纸、细密画、信笺、家谱）：
     * 角标文字：`#1C1A17` 墨黑
     * 诗行字幕：墨色衬线主文字 + 砖红细线 `─── ✦ ───`
2. **文字与符号严禁进入 AI 图层**：
   * 所有历史年代（如 `40,000 BCE`）、器物名称、人名、算法代码，必须由 React 组件动态挂载。
   * 即使画面中需要打字机击打文字，也是 AI 出空白老信纸底图，由 `TypewriterPaper` 或 `PerCharReveal` 沿透视矩阵逐字打入！
