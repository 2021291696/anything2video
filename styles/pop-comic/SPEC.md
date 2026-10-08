# SPEC：波普漫画（pop-comic）

**正本源工程**：`samples-l1/pop-comic`（2026-10-07 验证交付）｜**图元库**：工程 `src/style/kit.tsx`（PK token + 爆炸星/贴纸拍入/网点/速度线/幕震原语，纯代码无纹理依赖）
**风格句**：暖纸白漫画页 + 粗黑描边 + 高饱和有限色（红/黄/青/品红）+ 半调网点 + 拟声词爆炸星 + 贴纸拍入 + 速度线 + 网点擦除转场。
**技法借鉴** lanshu-create-ai-presenter-video（MIT, cclank）explainer/kits/v5-comic——视觉语法与机制参数级借鉴，全部以 Remotion(React+TSX) 惯用法重写，零代码拷贝。

## 锁死项
- **色 token**（`PK`）：paper `#FBF1D9`（暖纸白底）｜surface `#FFFFFF`｜ink `#1A1613`｜muted `#6B6157`｜**pink `#F0439A`（唯一重点色：重点词/情绪/hero 爆星，一拍至多一件粉）**｜red `#E9482F`（钩子/警示/代价）｜yellow `#FFD53E`（贴纸/说明框/爆星底）｜cyan `#2BA3D4`（结构/机制标签）｜green `#3CB667`（过关，少量）。
- **波普描边契约**：标准描边 5px / 分格与主视觉 8px（`LINE/LINE_B`）；硬错位阴影无模糊（6-10px `hardShadow`）；大字一律 `-webkit-text-stroke` + `paintOrder:'stroke fill'` + 硬阴影（`strokeInk`）。
- **半调网点**：CSS radial-gradient 平铺（`halftone(color, r, gap)`，禁逐点 DOM）；幕底两层（黄 24px 满铺 + 品红 48px 错排）经椭圆 vignette mask 只在页缘显形（中央留净版面，防「满屏雨点」误读）；场景内衬底贴片 alpha 0.32-0.4。
- **贴纸拍入**（签名纪律，`slam()` 锁死默认）：0.16s easeInQuad 加速砸落，scale 1.16→1，+7°→落定 **-1.6°**（歪贴感，落定后不回弹不呼吸）；主视觉/爆星可放大档（`{s0}`），拍入节奏不变。
- **拟声词爆炸星**：`burstPts` seeded 锯齿多边形（尖角随机抖动，同 seed 同形）+ 墨色错位阴影层（+8,+8 同形 polygon）+ 描边；CJK 拟声词（啪!/咔!/咬!/怒!）Noto Sans SC 900 + 10-11px 描边。
- **网点擦除转场**（章节缝唯一转场，禁 dissolve）：网点自 origin 逐点放大盖满 6f → 缝帧下换景 → 自新 origin 收缩 9f（`DotWipe`，44px 网格 seeded 半径扰动）；色随章节轮换 pink/yellow/cyan。
- **幕震**：seeded、帧量化、二次衰减（`shakeAt`），冲击表对位大拍；hero 冲击 15px/10f，常规 4-9px/8f。
- **镜头语言**：无平移运镜；单场景内整幅轻推 zoom 1→1.04 easeInOutQuad（「凑近看漫画页」）+ 幕震，场景间靠网点擦除切换。
- **版式**：中文全用 Noto Sans SC（900 标题/拟声词、700 正文/字幕），拉丁拟声词/数字/角标用 Audiowide（letterSpacing 2-5）；字幕为漫画白盒（`CaptionBox`：5px 墨框 + 6px 硬阴影 + 逐字点亮 muted→ink），非字幕带。

## 复用适配点
- 无 staticFile 纹理依赖，kit 整库（`src/style/kit.tsx` 单文件 ~380 行）拷走即用；新片改 `src/shots/G1/shots.tsx` 的场景内容 + `Main.tsx` 的 `IMPACTS/SCENES/WIPES` 三张表即可换题。
- 图元菜单：`Panel`（分格）/`Sticker`（五色贴纸标签）/`Balloon`（圆角对话泡带尾）/`Burst`+`BurstWord`（爆星+拟声词）/`SfxWord`（无底爆字）/`SpeedLines`（拖尾/平行速度线）/`CaptionBox`（漫画字幕盒）/`slam/popIn/shakeAt/halftone/burstPts` 原语。
- 快节奏三连拍模板：SC05 三查卡（`CheckCard`：拍入 +6f 绿勾爆星 pop + 订书钉 SFX 递减 0.24/0.22/0.20）。
- 音频配伍：BGM 配方 `01-flat-vector`（STYLE_MAP `pop-comic`）；SFX 主题音 = paper 族（slice/staple）+ impact 族（hit-blow/bass-hit）+ ui/pop，钉帧表同源 `research/beat-sheet.json calibrated.sfxCues`。

## v4.0 opt-in：comic-print 复古印刷增强（默认输出不变）
**技法借鉴 huashu-art-motion 13_pop/27_kirby (MIT, alchaincyf), TSX 重写**（RECON-huashu §13_pop/§27_kirby 裁决：全部以 opt-in 进 pop-comic）。承载文件 `extra-print.tsx`（与 kit.tsx 并列，kit 一字未改；不被任何既有文件 import——**不调用新组件时渲染结果与 v4.0.0 前逐值等价，默认输出一个字节不变**）。参数照抄 huashu `lib/render.js`（P.dotPattern/P.clipBeside/P.kirbyShade 已核行）与配方 md；全部确定性（mulberry32/hash，禁 Math.random/Date/网络）。

- **`Benday`（网屏角本戴点，prop `angleDeg`）**：huashu P.dotPattern 移植——CSS radial-gradient 网点 tile 装进旋转容器出加网角；pitch/半径/角度/底色/点色分区独立可配。预设 `BENDAY_PRESETS` 照抄：popWall 蓝底白点 45° pitch24/r5.6｜popSkin 红点 pitch13/r3.3｜popGround 隐点 α0.18 pitch14/r2.2｜kirbyPlateC 15° pitch9/r2.7｜kirbyPlateM 75° pitch9/r3.2｜kirbySkin 75° pitch7/r1.5（kirby 板点色默认映射 PK cyan/pink/red，可覆盖）。不挂载即无网角。
- **`WarholGrid`（四格配色轮换）**：正本机制 `step=floor(lt·11)`（≈5.5 帧一换）、格 i 用第 `(i+step)%4` 套；`WARHOL_SETS` 四套底色照抄沃霍尔底 `#9ccf3a/#e0359a/#2fc0b0/#f08a2a`，脸/眼影/口红取 13_pop 色板（皮 `#fae0cc`/蓝 `#2f5cc8`/红 `#d8232a`），下半脸=同系深一档推导（RECON 未给逐格五色，注明推导）；内容经 `renderCell(palIdx, set, cell)` 交给调用方。
- **`ThoughtBubble`（思考泡）**：泡体 10 圆并集轮廓（先统一描 11px 黑再统一填白，`thoughtLit` 导出）；尾点序贯闪 `((f-2k) mod 12) < 4` 时 r20、上跳 6px，否则 r12，12 帧循环；默认云形为 TSX 重写通用造型（原片 10 圆坐标属场景级布局未入 RECON）。
- **`fieldWiggle`（权重场局部形变 util）**：`wig=sin(t·2π·6)·16`、权重 `clamp((560-x)/140)`、上翘 `|wig|·0.6`——anchorX/range/amp/hz/lift 全 prop 化，默认=原片扭臀参数；纯函数无随机。
- **`KirbyShade`（黑块阴影+羽化排线）**：P.kirbyShade 的 SVG 重写，clipBeside 数学（clip ∩ ¬translate evenodd）用 clipPath+mask 实现；黑月牙=shape∖shift(light·d1)、羽化带=shape∖shift(light·d2) 内沿光方向平行线间距 gap=9px；参数照抄 `KIRBY_DEF`：d1=14/d2=30/gap=9/light=[-0.86,-0.5]/ink=#141212/lw=2.6（参数表：裙 16/34、躯干 14/30、袖 10/22、发 12/26、猫 16/34 由调用方传 d1/d2）；`kirbyFan` 纯函数导出供断言。
- **`Krackle`（能量点）**：16–26 黑圆（默认 21）、距心 `R·rnd^0.7` 中心密、半径 `R·(0.05+0.2·(1-d/R))` 中心大、12fps 换种子、`sin(18t+i)` 脉动；技术题材当「能量/算力」视觉词。
- **`Misregister`（套色错位）**：色版层整体偏移默认 (4,3)px 老印刷味（正本 drawImage(color,4,3) 的 DOM 版）；用法=色版层（平涂+网点）包进 `<Misregister>`、墨线层在外不动。

## 与 paperclip-sticker 的边界（同族贴纸语言，不同视觉世界）
- paperclip-sticker = **冷静办公贴纸**：蓝灰米白底、贴纸化主体带**软**投影、超宽大画布 + 摄像机 log-z 平移一镜串信息站、精确数据图表、克制单强调色。贴纸是「信息载体」。
- pop-comic = **波普漫画页**：暖纸白底、高饱和四色、**硬**错位阴影、无画布运镜（单景轻推 + 幕震 + 网点擦除换景）、拟声词爆炸星/速度线/网点是叙事本体、情绪外露（快节奏辟谣/观点）。贴纸是「漫画道具」，整页都是漫画语言。
- 互斥判据：要「冷静讲解数据」用 paperclip-sticker；要「情绪化快节奏拍脸」用 pop-comic。两者的 slam/拍入机制参数不同源（paperclip 悬置-落地-回弹 wobble vs pop-comic 0.16s E.i2 加速砸落定 -1.6°），不共享 token。

## QC 豁免档
- f333-367 收束卡定帧 1.17s：仅「完」徽标爆星帧量化闪烁（hash 驱动 0.72↔1.0）+ 末 6 帧轻收暗 0.35——合法微动效（禁全静止纪律达标，probe_liveness SC06 全对 MAD 1.28-5.5 有活性），不修。
- 半调网点页缘带会被 frame_metrics 类探针记「整齐点阵/低对比纹理」——是风格本体（漫画印刷网点语义），看帧定性，不修。
- f1-f2 标题贴纸处于拍入中段（opacity 0.3→1、scale 1.16→1）：钩子纪律以落定帧计（f2=0.07s 达标），拍入中段的半透明大字是动作帧非缺帧。
- 幕震期间整幅平移会造成帧间大 MAD——是有意冲击语言（≤15px、≤10f、衰减），非渲染抖动。
- 末 6 帧收暗至 0.35 非黑场（paper 底仍可辨），probe_blank 帧级检查已豁免通过。

## 样张
`sample.jpg` = 正片 f230（HERO「怒!」16 尖品红爆星 + 愤怒仪表盘 + RAGE 贴纸 + 放射速度线 + 汗滴 + 网点幕底，全签名元素同框），回归三查对照基准；辅证 `out/stills/frame-90.png`（戏仿标题条 + 啪!爆星 + 三连 ? + 点开率计数）、`out/stills/frame-155.png`（掐半锯齿撕裂 + 鱼钩钓光标）、`out/stills/frame-340.png`（收束卡爆星 + 纸描边结论句）。
