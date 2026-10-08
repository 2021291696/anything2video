# SPEC：埃及墓室壁画（tomb-wall）

**正本源工程**：`samples-v4/tomb-wall`（2026-10-07 验证交付）｜**图元库**：工程 `src/style/kit.tsx`（TW token + 象形字函数表 + dash 写出引擎 + Blocks 彩块边框 + feTurbulence 墙面滤镜）与 `src/style/motifs.tsx`（RayHand/AtenRays/LongRays + Scarab + Priestess + TapestryWipe + Title），纯代码零纹理图片依赖。
**风格句**：无笔触渲染器——干净 2.2–2.8px 深棕线 #2a1810；时代感全靠程式（侧脸正面眼＋正面双肩）＋色板（灰泥墙＋红蓝黄绿四色＋金三阶）＋纹样密度（手写象形字栏）。
**技法借鉴** huashu-art-motion scripts/engine/scenes/02_egypt.js (MIT)，Remotion(React+TSX) 重写——象形字函数表与排布约束（源 02_egypt.js GL/GLYPHS）、setLineDash 逐笔写出改为 SVG `pathLength=100 + strokeDasharray`（每条 path 各自从头=天然笔顺，Canvas 每子路径 dash 重启的等价 TSX 惯用法）、金色 shadowBlur 余辉改 CSS drop-shadow、圣甲虫/阿顿小手/彩块边框几何 1:1 重排、墙面斑驳 P.texture 改 feTurbulence(seed 固定)——机制与参数级借鉴，零代码拷贝。

## 锁死项（六签名）
1. **埃及程式人物**：侧脸轮廓＋正面杏仁眼（白眼＋黑瞳贴上睑）＋**kohl 眼线 3.2px 后拖 18px**＋长眉；**正面双肩**（宽梯形躯干，两肩都可见）；白亚麻 alpha .9 罩肤色＝半透明亚麻；宽领项圈五色同心带＋水滴坠；金色编发（9 束人字纹分节，非圆珠铺满）。
2. **手写象形字函数表 + 逐笔写出**：21 个字形定义（安卡/日轮/圣甲虫/荷鲁斯之眼/王名圈/杰德柱/申环/猫头鹰/隼/鹭/角蝰/莲花/nfr/水纹等，每形 2–8 子路径局部坐标函数），墙 面 94 实例；**写出引擎**：每 4f 一槽 ×6 字、0.36s(11f) 写完、同屏约 18 字在写；`pathLength={100}` + `strokeDasharray=${rv*100} 1000`；笔迹从亮金 #f6c846 落回原色＋`drop-shadow` 金粉余辉（blur 7×(1-p)，alpha 0.9×(1-p)）；填充形 rv>0.55 才出现。
3. **圣甲虫推日球 + 阿顿光线小手**：圣甲虫青金石蓝身＋绿松石鞘翅高光，推红日球（黄点随 `rot=bx/r` 滚动，clip 球内），7.1px/f 匀速循环，腿两套姿态每 2f 交替、前足顶球；窗内 13 条阿顿光线＋末端小手 **0.4s 周期开合**（open=0.5+0.5·sin(2πf/12+0.9k)，指张角 0.03–0.45），光线 0.45s 沿扇形依次伸缩（相位 −0.55k）＋末端 ±2px 颤动；日盘脉动光晕＋亮环（盘上重绘保持红色）。
4. **四色彩块边框 + 深蓝饰带 + 金饰体系**：红 #b8322a/蓝 #2a58a8/黄 #e2b13a/绿 #2e8a55 四色轮换彩块（米白缝＋黑分隔线）；地线＋多层饰带（黑/米白/彩块带/黄/红/深蓝 #1c223e 带 1300 颗粒点）；金三阶 #e0ab38/#a8741c/#f3d27a（檐口金楣＋金椅＋金臂环＋发箍＋挂毯金下摆）。
5. **挂毯竖条落下回弹转场**（章节缝唯一转场，禁 dissolve）：14 竖条（深蓝双调＋织纹线＋金下摆），盖入 11f 依次坠落（落定 4f scaleY 弹性脉冲＝回弹），揭走 11f backIn 预抬再加速；缝 s=99/190/275。
6. **象形字排布约束**：`mulberry32(1350)` 种子、逐栏向下塞、同栏不相邻重复、同栏同字形 ≤3 次、**圣甲虫/水纹降权 60%**（防「满屏贴纸」）、水纹保底 ≥6（12fps 步进 zigzag 流动，4 步一循环）。

**锁死色 token**（`TW`）：墙 #eadcb8/暗部 #d8c597｜线 #2a1810（净线 2.2–2.8px）｜四色红蓝黄绿｜金三阶｜深蓝带 #1c2236｜米白 #f2ead6｜肤色 #e6b282｜青金 #2c56b0＋绿松石 #3fa6a0｜分栏红线 #9a2b22｜日盘 #c8372b/光线 #c23a2a/小手 #b4452c。
**红线**：无笔触渲染器（线条干净不沸腾）；时代感靠程式＋色板＋纹样密度；全确定性（解析时间函数＋mulberry32/hash，禁 Math.random/Date/网络）；零 AI 素材零外部图片。

## 短板修正（INDEX：端杯肘偏僵）
近臂**肩点挪到前肩** `(-38,-276)`（躯干梯形前缘，非躯干中线），**手托杯脚** `(-80,-248)`（握杯茎底而非杯侧），`ik2(S,H,L1=48,L2=52,side=+1)` 解出肘 `(-32,-228)`——位于肩下 48px、胸前自然下垂，静帧 `qc/elbow-check.png` 实测可读；杯随 bob=1.5·sin(2πf/80) 微浮、肘逐帧解析跟随。

## 复用适配点
- kit 两文件（`src/style/kit.tsx` + `src/style/motifs.tsx`，合计 ~700 行）拷走即用；新片改 `src/shots/G1/shots.tsx` 场景 + `Main.tsx` 的 `WIPES`/`IMPACTS` 两张表即可换题。
- **GlyphWriter 引擎本身是可复用资产**：任何「象形/符号/图标逐笔书写」场景（白板/chalk/铭文/魔法阵）换一张字形表即可；排布约束函数可直接复用。
- 长光线端点表 `LONG`、窗内小手位表 `HANDS` 均为数据表，换构图只改数字。
- 音频配伍：BGM 配方 `12-aurora-glass`（STYLE_MAP `tomb-wall`）；SFX 主题音 = paper/paper-slide（饰带落下）+ light/shimmer-sparkle-sweep（光线神性）+ impact/bass-hit-short（hero 唯一重拍）+ ui/chime-crystal（金粉铭文）。

## 与近邻卡的边界（同族差异声明）
- **tomb-wall ≠ cave-wall**：同属「画在什么上」媒介命名族；cave-wall 是原始岩壁（炭黑手绘抖动轮廓＋火光 overlay＋负手印），tomb-wall 是文明期灰泥墓墙（程式化人物＋彩色平涂＋规整字栏＋金饰），材料语言一个「野」一个「工」。
- **tomb-wall ≠ guofeng-scroll**：guofeng 是中式长卷（绢本设色/铁线描/做旧罩层），tomb-wall 是埃及正面律平涂＋象形字栏；两者共享「古风叙事」领地但文明位、线法、色法均不同源。
- **tomb-wall ≠ amphora/mosaic（批次④同批兄弟）**：amphora 是陶器黑绘剪影（器物曲面＋刻线），mosaic 是拼块马赛克（块面离散）；tomb-wall 是建筑壁面平涂＋字栏纹样。四卡各自锁死色 token 与母题，不共享图元。
- **tomb-wall ≠ blueprint**：blueprint 是工程线稿（白线网格底＋标注），与本卡无技法交叠。

## QC 豁免档
- f337-372 结尾定帧 1.2s：微动效=铭文持续逐笔写出（金粉余辉随进度变化）＋小手 0.4s 开合＋圣甲虫画底巡行＋水纹字 12fps 流动＋圣女 hash 相位眨眼＋末 5f 收暗 0.25——禁全静止达标（probe_liveness SC05 相邻 MAD 1.678-2.372），不修。
- 挂毯转场盖入期（每缝前 11f）画面被竖条大面积覆盖：转场语义本体，probe_blank 缝帧按过渡帧放行；缝后揭开期内容正常。
- SC03 画幅下半为深蓝饰带延展（世界层 y>720 由底色补全）：深蓝带本体即「夜空地带」，圣甲虫在其上巡行＝神话语义（滚日轮走过夜空），非空屏；probe_blank 19 帧全绿为证。
- 幕震期间整幅平移造成帧间大 MAD——有意冲击语言（解析 kick，≤10px、≤12f、衰减），非渲染抖动。
- 墙面 feTurbulence 斑驳为随机纹理——seed 固定（13/99/7），逐帧一致、逐次渲染一致（f245 双渲 sha256 同）。

## 样张
`sample.jpg` = 正片 f340（SC05 全景：程式祭女端蓝莲杯[肘自然下垂]＋圣龛窗阿顿光线小手＋象形字栏＋四彩边框＋深蓝饰带＋金椅＋圣甲虫画底巡行，全签名元素同框），回归三查对照基准；辅证 `out/stills/frame-14.png`（钩子饰带落定+金框标题）、`out/stills/frame-50.png`（圣龛特写光线小手+字幕）、`out/stills/frame-90.png`（挂毯竖条转场进行时+金粉写出字）、`out/stills/frame-140.png`（圣甲虫推日球深蓝带跟拍）、`out/stills/frame-245.png`（HERO 全手张开+光晕环+幕震帧）、`qc/elbow-check.png`（端杯肘短板修正特写）。
