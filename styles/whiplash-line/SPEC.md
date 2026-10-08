# SPEC — whiplash-line（慕夏新艺术 / Mucha Art-Nouveau Poster）

战役 4 批次④ D2-2 ｜ 样片《一条鞭线的旅行》｜ 2026-10-07
溯源：huashu-art-motion `scenes/10_nouveau.js`（334 行）+ `references/风格配方/10_nouveau.md`（RECON-huashu §10_nouveau，INDEX ★★★）
**借鉴登记：技法借鉴 huashu-art-motion（MIT），Remotion/TSX 重写（禁整段拷贝已执行：全部数学原语与绘制函数为 TS 重写，机制/参数/色彩 token 有源可查）。**

## 1. 领地定义

慕夏式新艺术石版海报：**一条「鞭线」（whiplash line，新艺术运动的标准术语）用粗细呼吸的装饰线长出整个画面**——花茎、拱窗、藤蔓、发丝、光环，最后框住整张海报。与 line-art（细线极简 2.6px 等宽 draw-on）不撞：本卡是**粗细呼吸的装饰线 + 海报构图 + 石版印刷质感**。定位：美学/文化类科普、品牌氛围片。

## 2. 锁死 token（不可改）

- 线 `#4e3320`；金 `#c9a24a` / 深 `#9c7a2e`；奶白 `#f6eedb`；皮肤 `#f6dcc4`；金发 `#e2b54c/#e8bf55/#f6dc8a/#b9862a`
- 底版三段竖渐变：灰绿 `#b9cba0` → 米绿 `#cfd3a6` → 桃 `#ecc9a2`；圆点花纹 `rgba(120,140,100,.38)`；横幅绿 `#8fac80`
- 光环：粉 `#ebb8b2` / 青 `#5f9a8a` / 红 `#b8473a` / 花瓣 `#e3a5a0/#efc4be`
- 字体：标题 Noto Serif SC 900（石版字，深棕描边+奶白填）；副题 Fraunces italic

## 3. 图元库（src/style/）

| 图元 | 文件 | 说明 |
|---|---|---|
| **Ribbon（核心原语）** | `prims.ts ribbonPath` | 点列 Catmull-Rom 加密（每段 4-10 点）→每点沿法线两侧偏 w(q)/2→闭合多边形 fill。**可被其他卡借用的绘制原语**：一切「粗细变化的勾线」——书法/藤蔓/飘带/河流/鞭线通用，比 SVG stroke（等宽）强一档。配套 `swellW`（两头尖中间粗）/`taperW`（宽→细递减）/`twoTone`（深棕宽底+本色窄面）/`dense`/`spiralPts`/`smoothClosed`/`partial`（描画进度切片） |
| OffsetOutline | `world.drawWorld` 角色层 | **剪影错位垫底法**：角色画进离屏 L →复制 source-in 染深棕 → 按 (-1,-1)/(2.5,3.5)/(1.5,1.5) 三偏移垫底（1920 版源参数 (-1.5,-1.5)/(3.5,4.5)/(2,2.5) 的 2/3 换算）= 外轮廓 1px+右下 3-4px 厚边、内线 2px。所有线稿风（line-art/pop-comic/chalk）可借做「版画感」外轮廓 |
| HaloRing | `chars.drawGirlHalo/drawCatHalo` | 双环反向旋转：外金环 18 圆钉 **+0.9t**、内 32 玫瑰窗花瓣 **−0.63t**；猫环 8 橙瓣 −1.1t + 虚线环 lineDashOffset 走 |
| MuchaHair | `chars.drawLock/HAIR_MASS` | **发团打底（外缘 sin 波动）+ 细绺 S 行波** `sin(7.4q+φ−7t)·(6+20q)` + 1.2 圈螺旋收尾、宽 16→2.5 递减。⚠ 禁无发团裸画细绺（会变香肠面条，源配方踩坑原话） |
| SteamLean | `chars.drawSteam` | 3 条奶白 ribbon + 棕描边 + 中线，`sin(4q+φ−6t)` 行波、横向 ×(1+1.5q) 散开、末端螺旋；**lean 随 cup 增强**（举杯时热气往窗侧倒，防横穿脸——源配方踩坑） |
| SunLead | `window.drawWindow` | 太阳从山后按节奏升起（easeInOut）+ 14 根铅条光芒**随日心随动**（放射线端点挂在太阳坐标上）慢转 ±0.04 摆；山丘色带画在太阳之后=天然遮挡 |
| SpiralEnd | `prims.spiralPts` | 半径线性收到 15%（r0·(1−q·0.85)）——线端「转弯」的统一语汇 |
| MuchaFrame | `world.posterBg/drawFrameLine` | 圆点花纹底（环+心点菱形交错）+ fbm 石版斑驳 + 马赛克地砖带（9 色循环 `(k*7+(k>>2))%9`）+ 绿横幅石版标题 + 金框由鞭线勾成（四角小花收尾）+ 颗粒罩层（mulberry32 纹理 α0.13） |

模块划分：`prims.ts`（原语）→ `tokens.ts`（锁死 token/几何/编舞）→ `chars.ts`（角色+光环+热气）→ `window.ts`（拱窗+太阳）→ `world.ts`（花境/藤蔓/金框/顶层编排）+ `kit.tsx`（React 壳：PosterCanvas/字幕卡/暗角）。全部 ≤500 行。

## 4. 签名清单（缺一不可）

① ribbon 可变线宽鞭线（swellW 呼吸）② 剪影错位垫底 ③ 光环双环反向旋转 ④ 发团+细绺行波+螺旋收尾 ⑤ S 形热气随举杯往窗侧倒 ⑥ 太阳升起+铅条随动 ⑦ spiral 收尾 15%。银验收 = 静帧一眼读出「慕夏海报」（光环+鞭线+拱形窗三要素齐）。

## 5. 短板修正（INDEX：猫姿势僵）

源卡猫为 RIG 坐姿白色直腿。本卡猫重画为**趴卧 loaf 造型**（smoothClosed 身形+呼吸缩放+眯眼+虎斑 ribbon+鞭线螺旋尾），光环罩在头上方（HALO_C=[258,516]）。样片 f190-204 画入，f285/f413 静帧可复核。

## 6. 动画纪律

钩子 f2（0.07s）第一段鞭线抽出；HERO f285=69%（光环双环反向旋转+发丝行波全开，BGM drop 9.5s 对位）；定帧 f379-413（1.17s）带线端呼吸/花瓣摇/光环旋转微动。全片相机为一条连续关键帧轨（scale+transform-origin，inOutC 插值，跨镜无缝）。确定性：全部运动为解析时间函数，唯一 PRNG mulberry32(20091007) 只用于颗粒纹理；两次渲染 frame-285 sha256 一致实测。

## 7. 与近亲卡的边界

- **line-art**：等宽细线 draw-on 讲解风 vs 本卡粗细呼吸装饰线+海报构图——不撞。
- **swirl-oil**（油画族）：厚涂笔触沸腾 vs 本卡平涂色块+勾线——媒介不同。
- **ink-tea**：毛笔飞白+留白 vs 本卡石版印刷+满版装饰——纸墨 vs 石版。
- 借用接口：其他卡可 import `prims.ts` 的 ribbonPath/swellW/taperW/twoTone/spiralPts 做任何「会粗细的线」；OffsetOutline 三偏移参数表见 §3。
