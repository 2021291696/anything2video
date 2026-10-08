# SPEC — gold-leaf（哥特泥金手抄本）

战役：CAMPAIGN-4 批次④ D2-1 ｜ 日期：2026-10-08 ｜ 样片：《一页手抄本的诞生》372f/12.4s ｜ 工程：`科普视频/samples-v4/gold-leaf/`

## 1. 定位与领地

一切「金色材质」的卡：中世纪手抄本 / 圣物 / 奖杯勋章 / 鎏金标题 / 圣诞金饰。签名是**逐像素金箔材质**与**「金色度」遮罩匀速高光扫**——凡画面的金色物自动被高光扫亮，不用为每件金色物手写高光。

**差异声明（同族边界）**：guofeng-scroll 的描金是 5px/1.6px 线性描绘（无金箔材质）；aurora-glass 的金是 UI 高光；gold-leaf 是唯一带逐像素金属拉丝＋压花＋接缝的金箔材质渲染器。

## 2. 借鉴登记

技法借鉴 huashu-art-motion 05_gothic（MIT, references/风格配方/05_gothic.md + scripts/engine/scenes/05_gothic.js），Remotion/TSX 重写（`src/style/world.ts` / `scene.ts` / `figures.ts` / `cat.ts` / `marginalia.ts` 文件头有同款登记行）。机制与参数可搬（金箔噪声配方 / 金色度阈值 / 蜗牛老鼠速度），Canvas 惯用法全部重写为 Remotion 组件；未整段拷贝。

## 3. 图元库（src/style/）

| 图元 | 文件 | 说明 |
|---|---|---|
| GoldTexture | world.ts `paintGoldTexture` | 逐像素 `f=0.52+fbm(x·.0035)·0.42+noise(x·.004,y·.09)·0.5+noise(x·.012,y·.25)·0.3+受光+颗粒`，三色插值 #9c6a1a/#d9a63a/#f8de86；**打磨纹 y 频率是 x 的 22.5 倍才有横向金属拉丝**。预烘焙成 page-static.png（`scripts/bake_gold.mjs`），热帧零逐像素（RECON 建议） |
| GoldMask | world.ts `paintGoldMask` | 「金色度」：对静态层逐像素 `clamp((r-b-70)/50)·clamp((g-b-30)/40)·clamp((r-140)/40)` 当 alpha——不用重画金色形状，凡金自动入掩膜（羊皮 r−b=42 被排除；白/红/蓝/粉/绿/木全排除；实测探针见 qc/self-check.json）。**猫为动态层不进掩膜**（橘色会被误当金；源片同序：猫画在高光之后） |
| GoldSweep | marginalia.ts `drawGoldSweep` | 920px scratch 渐变带斜率 0.45 → destination-in 乘掩膜 → lighter **α0.62** 叠回；**必须匀速**（inOut 会提前扫出金区）：`sweepXAt = lerp(-366,1644,(f-208)/60)`，33.5px/帧 |
| Glint / nearSweep | marginalia.ts | 四角星（quadratic 四瓣）；经过判定 `|u−sweepX|<70`，u=x+0.45(y−360) |
| Lattice | marginalia.ts `drawLattice` | 签名②③：两族斜线（x+y=u / x−y=u）各画两遍（暗线 rgba(110,66,10,.55)＋错开 **1.2px** 亮线 rgba(255,240,180,.55)）＝刻进金里；菱心四点压印（左上亮右下暗）；接缝每 **118×125px** 一条 rgba(120,75,15,.18)＝一片片贴的金箔。三段进度参数（uSeam/uLine/uDot）供 SC03 刻入动画 |
| VineScroll | marginalia.ts `vines` | 页边双茎藤蔓：茎摆 sin(t·2.6)·3.4，叶摆 sin(t·3.6)·0.42，三瓣常春藤叶（蓝/红/金轮换）＋金球三须 |
| Snail / RunMouse | marginalia.ts | 蜗牛 **62px/s** 向左爬（brief 锁死）；老鼠 **360px/1.05s** 腿 **40rad/s**（brief 锁死） |
| CatPendulum | marginalia.ts `catPendulum` | 猫爪挂鼠钟摆 0.32·sin(5.5t)（源片同参） |
| PageTurn | kit.tsx `PageTurn` | 签名⑥：左铰链 rotateY 0→-80°（perspective 1400）羊皮纸翻页，14f=0.47s |
| Maiden / CatBody | figures.ts / cat.ts | 哥特圣像少女（光环/金发/红袍金条/蓝斗篷/圣杯）＋稚拙人脸猫 |

## 4. 锁死 token

- 金三阶：`#9c6a1a / #d9a63a / #f8de86`
- 羊皮：`rgb(236,223,194)`（#ecdfc0）
- 朱红朱批：`#c3262e`（句首 Cattus/Nemo/Mus）
- 蓝袍：`#24449e`（斗篷 #142a6a 深）
- 墨线：`#2b1a12`
- 拉丁正文：UnifrakturMaguntia（OFL，public/fonts/）

## 5. 短板修正（INDEX「金发像兜帽」）

首版金发用中点平滑折线，自交塌成兜帽状（复现于首轮烘焙，见 report 附记）。修正：`maiden()` 金发为**显式 quadratic 波浪瓣闭合轮廓**（左右各 4 瓣垂落到腰）＋中分刘海＋脸侧厚发绺＋每侧 3 条 S 形发绺，不套任何默认头形。验收：金发 #e9b746 入掩膜（mask 实测 y=405 行 x∈[880,957] alpha>200）；`HAIR_SPARK=(952,405)` 在 f248 随高光带出四角星（`out/stills/frame-248.png`、`skill-intake/sample.jpg`）。

## 6. 性能纪律（RECON 建议）

逐像素金箔与掩膜只在烘焙期算一次（`node scripts/bake_gold.mjs` → public/assets/gold-leaf/paint/*.png，sha256 入 storyboard）。正片热帧 = drawImage 静态图 + 矢量动态层 + 高光带合成。Bench 实测 **19.90 ms/帧**（90 次均值，getImageData 强制同步，`out/bench-hotframe.png`）。

## 7. 确定性

mulberry32(seed)/hash2 固定种子（藤蔓叶位/菱心压点/颗粒/彩窗闪点）；动画相位全部 sin(absF/30) 解析式；禁 Math.random/Date/网络。

## 8. 样片节拍（摘要，全表 research/beat-sheet.json）

钩子 f2 烛光起（0.07s）＋f14 金箔贴上（0.47s）→ f31-44 翻页转场 → f48 题名 → f106-173 菱格压花特写 → f208-268 HERO 匀速高光扫（f248 扫过金发=星闪峰值 66.7%，BGM drop 8.3s 对位）→ f340-372 定帧 1.07s（页边蜗牛/老鼠/藤蔓微动不停）。

## 9. 音频

TTS edge YunyangNeural +8%（GAP=6/LEAD=30/TAIL=40）｜ BGM `12-aurora-glass seed=20261096 drop=8.3` CC0 ｜ SFX 7 点（f2/f14/f31/f131/f208/f248/f350；贴金箔/翻页必钉）。登记行见 `research/audio-notes.md`。
