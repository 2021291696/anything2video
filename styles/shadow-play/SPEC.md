# SPEC：中国皮影（shadow-play）

**正本源工程**：`samples-v4/shadow-play`（2026-10-07 验证交付）｜**图元库**：工程 `src/style/`（noise.ts 种子随机/值噪声/步进时基 + leather.ts 皮件预渲/刻纹五纹样/stamp 印幕/铆钉链 + screen.ts 影窗油灯/布纹/灯苗/微漾 + dan.ts 旦角 + general.ts 武将 + army.ts 千军万马 + captions.ts 字幕题名 + Scene.tsx 单组件正片；Canvas2D 纯函数，f210 两次渲染 sha256 全等）
**风格句**：幕后油灯 × 牛皮透光——半透明刻纹皮件 multiply 印幕（透光=幕色×皮色）、铆钉关节 10fps 步进的杆操戏偶、白=镂空；讲「谁在幕布后面动它」的表演叙事，不是画一幅画。
**技法借鉴** huashu-art-motion（MIT, alchaincyf）references/风格配方/34_shadowpuppet.md 与 scripts/engine/scenes/34_shadowpuppet.js（195 行）——P.carve/P.piece/P.stamp 机制与参数级借鉴，全部以 Remotion(React+TSX)+Canvas2D 惯用法重写（`useCurrentFrame()+1` 纯帧号驱动），零整段拷贝；文件头注释逐文件登记。

## 锁死项
- **色 token**（`PAL`）：五皮色 红 `#c0352a`/绿 `#2f7d4c`/琥珀 `#d99a2e`/黄 `#e2bd4a`/蓝 `#2c5a8a` + 橘 `#d9782a`/皮白 `#efe2c4`｜皮边深褐 `#3a160a`（2.6px）｜幕布径向四档 `#fff6d6→#f2d7a0→#cf9a58→#7a4a20`｜木框 `#2a140a`+衬线 `#a8742e`。禁第六色相。
- **签名① 牛皮透光**（`leather.ts piece()`）：填色 → clip 内 destination-out 刻纹 → clip 内补皮边（2×edge 同色描边，防刻穿外轮廓）→ 深褐 2.6px 外轮廓；成品 sprite 整层 multiply 印幕——透光 = 幕色×皮色，重叠皮件自然变深。**布局纪律：重叠区避开焦点柱**（旦角 x353-447 / 武将 x810-950，群件全离两柱）。
- **签名② 刻纹库五纹样**（`leather.ts k*`）：鱼子纹 kDots（s14-22 r3-3.5 错排）/ 团花 kFlowers（5 瓣椭圆绕心）/ 云纹 kClouds（阿基米德螺旋线宽 3.4）/ 方格 kLattice（s26-32）/ 刻线 kLines（宽 3-7）。全部 destination-out 执行。
- **签名③ 铆钉关节+步进+杆操**（`dan.ts/general.ts`）：刚体件绕铆钉转（颈/肩/肘/腕 7px 铆钉+铜高光）；**10fps 步进全场一致**（`stepT(t,10)`）；杆 5px 深褐 blur1.2 multiply，主杆在颈、手杆在腕，向下向外走、不横穿别的角色；手腕松甩 `dangle=0.35·sin(11ls)·(1−0.6cup)`（cup=团扇抬起进度）。
- **签名④ 幕后油灯**（`screen.ts lampState`）：`fl=0.5·noise(3ts)+0.3·noise(9ts)`（ts 15fps 步进）驱动光斑呼吸+热点 215±34fl+光心漂移 ±26/±18；热点 screen 合成（不洗幕色），布纹 3px 经纬+颗粒缓存 multiply；灯苗剪影 multiply（收戏后 α 0.16→0.46 反而更显）。
- **签名⑤ 旦角空脸**（`dan.ts headSprite`）：destination-out 整脸只描轮廓（深褐 3px+琥珀皮边 8px clip 内回补）+凤眼（上挑长线+下眼线+点睛 3.2px）+柳叶眉+点唇——脸孔是「光」不是「色」。
- **签名⑥ stamp 虚影**（`leather.ts stampLayer`）：先 multiply α0.28 blur6 偏移 (7,5)（皮没贴紧幕布）再 multiply 本体；每个活动主体合并一张共享 scratch 层只 stamp 一次；武将翻杆中段加第二道 (14,9) α0.12 速度虚影。
- **签名⑦ 铰链链**（`leather.ts chain`）：4 节（飘带）/3 节（翎子），每节 `0.3·sin(7ts−0.9i)+curl`——飘带 curl 锁死 **0.38**（配方原参数，下垂鞭梢滞后）；节形状静态预渲、逐帧只转不重刻。
- **签名⑧ 白=镂空**：团扇面/武将不予（净角为实皮）、马白鞍、兵旗花点——白色部位整块 destination-out 只留皮边（`knockOut`/sprite 内联刻法），透光读白。
- **性能预算（INDEX 短板「121ms/帧 偏慢」的修正）**：皮件（形状+刻纹不变）只预渲一次成 alpha-sprite，逐帧仅 drawImage+变换；活动主体合并共享 scratch 层，全帧 multiply 大合成 ≤4 次。**实测（页内 `scripts/bench_frame.mjs` 循环 drawFrame，HERO 段 94 帧三轮中位）：avg 6.79ms/帧、p95 11.3ms、max 13.3ms ≪ 60ms 预算**（probe_frame_cost 墙钟含 ~460ms renderStill 往返基线，以页内钩子剥离）。

## 与既有卡的边界
- **vs guofeng-scroll**：中文传统文化题材同池竞标——guofeng=平面壁画/长卷/题跋（端庄叙事，画面即内容）；shadow-play=幕后光影/关节戏偶（表演叙事，画面的魅力在「被操纵」与透光材质）。机制零重叠：无长卷运镜/题跋/工笔勾线，皮影全部件可拆关节+杆。
- **vs sand（灯箱沙画）**：同为「光源+半透明媒介」家族——sand 是指尖在沙里减出形体（连续塑形）；shadow-play 是预刻皮件的铆钉拼装（离散关节+杆操）。媒介运动学相反。
- vs 其余 v4 新卡（cave-wall/tomb-wall 岩壁/墓室）：cave=画进石壁（静态媒材），shadow-play=幕上表演（活动偶戏）。

## 复用适配点
- 换剧目只改 `dan.ts/general.ts/army.ts` 的角色件编排 + `Scene.tsx` 时间轴锚点；影窗/皮件/stamp/铰链四件全复用。
- `leather.ts piece()` 是通用「半透明剪纸」渲染器：换色板即得剪纸动画/玻璃贴纸/万花筒皮影灯；`stampLayer` 可给任何「贴在受光面上」的材质做虚影。
- `chain()` 铰链链可移植水草/鞭子/飘带/电线（curl 参数定垂/扬）。
- 音频配伍：BGM `15-guochao`（锣鼓点正对皮影打斗）；SFX 主题音 = transition 风（灯亮/入场）+ paper 族拟音（皮件贴幕滑行/杆击）+ impact 鼓点（翻杆落定锣鼓）。

## QC 豁免档
- f374-408 定帧 1.17s：灯苗摇曳+幕布微漾+光斑呼吸为合法微动效（probe_liveness SC04 采样对 MAD 0.60-0.87 非零，非全静止），不修。
- f1-2 暗幕：场亮系数 0.1 设计内（暗幕+灯苗剪影可见，probe_blank 21 帧全过，无需豁免登记）。
- 皮影重叠变深：材质本体（multiply），已按「重叠避开焦点柱」布局纪律执行；非焦点区轻边重叠保留作材质证据。
- 10fps 关节步进造成动作一顿一顿：签名③风格本体，非卡顿。

## 样张
`sample.jpg` = 正片 f270（HERO 窗口内：旦角空脸执扇+武将靠旗翎子+两马三兵虚影+杆操全签名同框），回归对照基准；辅证 `out/stills/frame-3.png`（钩子点灯 0.07s）、`out/stills/frame-150.png`（空脸亮相）、`out/stills/frame-408.png`（收戏题名定帧）。
