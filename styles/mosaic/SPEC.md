# SPEC — mosaic（庞贝马赛克）

- 卡 ID：`mosaic` ｜ 战役：a2v v4.0.0 批次④（huashu 新领地，RECON-huashu §04，INDEX ★★★）
- 样片：《小心恶犬》1920×1080@30，392 帧 = 13.07s（ffprobe 实测见 out/probe.json）
- 借鉴登记：技法借鉴 huashu-art-motion（MIT）`scripts/engine/scenes/04_roman.js:325-447` 与 `references/风格配方/04_roman.md`，Remotion(React+TSX)+Canvas2D 重写，EDT/Voronoi 数学移植、惯用法零整段拷贝。

## 1. 领地与边界

庞贝 opus tessellatum/vermiculatum 石镶：石块沿轮廓排布（andamento）＋灰浆缝＋emblema 嵌片。20 卡无镶嵌/颗粒铺排类（29_seurat 未建、pop-comic 网点是印刷语义非石材）——新领地无撞车。与 pixel-arcade（屏幕像素语义）、pop-dot（矢量圆点）的差异：马赛克的颗粒是**不规则石材＋手工灰浆缝**，且"石块不动、颜色流过"是介质原生运动模型。

## 2. 签名（7/7 全落实）

| # | 签名 | 本卡实现 |
|---|---|---|
| ① | ID/SH 双缓冲渲染器 | `src/style/mosaic.ts build()`：init 一次建 `ID`(Int32 石块号，-1=灰浆)＋`SH`(Uint8 明暗) 全屏缓冲——结构图降采样 960×540→RGB 差>34 边缘→Felzenszwalb–Huttenlocher 精确 EDT→距离场等值线带 \|d−(k+½)s\|<1.5 沿 8 邻域最一致走线放石块→规则成行补洞→每块四半边独立 s/2×(1.08–1.28)＋旋转抖±0.06rad→加权 L∞ Voronoi 光栅，`D1>1 或 (D2−D1)·h/2<g` 判灰浆（石头比半间距大 8–28% 交给平分线切缝）。实测 19,342 块 / build 574ms / warm 32.1ms（ProbeStats 探针帧 out/probe-stats.png） |
| ② | 每帧只重取色 | 动态石块中心取色→`色×明暗>>7`→putImageData 进离屏 oc→drawImage 主 canvas；**禁直写主 canvas**（绕过镜头 punch 与转场裁剪）——drawPipeline() 注释即此纪律 |
| ③ | 波浪纹边框顺时针流动 | 传送带：init 预烘 2106px（26×81px 周期）石块带，石块布局/抖动按周期复用，每帧四边 `transform` 到局部坐标平移取景——石块随图案走（运动学定律②） |
| ④ | 维苏威冒烟＋火星抛物线 | 画框内：灰云带 55px/s 右漂（周期 380px）＋7 团烟柱压低右飘＋10 火星抛物线（确定性 LCG seed 7917）＋火山口熔岩脉动 |
| ⑤ | 马赛克砖翻面扩散转场 | 铺陈波：f2 起 19k 石块从犬心 (830,560) 径向翻面（背/面交替 cos(πq) 压扁＋边棱压暗），f75 完成后与光栅层 8 帧交叉淡化；二见：f150-186 CAVE CANEM 文字砖逐字级联 |
| ⑥ | 等宽粗笔画马赛克字 | CAVE CANEM 自写字模（C 椭圆弧/A V E N M 折线），笔画 14px = 2×7px 文字石宽（细字体粗颗粒必断——配方三轮结论） |
| ⑦ | 两条运动学定律 | ①动态区不单独换参数：犬颌/头动态矩形与邻区同一套石块布局，只逐帧重取色（静止时是补丁——配方返修教训）；②慢速位移<颗粒尺寸只换色会被量化吃掉：边框用传送带、<3 石宽吠叫波做成 emblema 嵌片随手移动。两条均写入本 SPEC 与 kit 文件头注释 |

## 3. 锁死 token

墙 `#e4ddcd`＋晕圈 `#f5f1e8`＋红金画框（`#a8322a/#7c221d/#d0a23c`）＋灰浆 `rgb(112,103,92)`；犬墨黑 `#1d1a18`、口腔 `#7c1f1f`、舌 `#b8433a`、牙 `#f7f2e8`、项圈 `#b02a22`＋金 `#d0a23c`；天空 `#9ec0d8→#d3e3e4`、火山三面 `#7c84b8/#4e5796/#2f3672`。

## 4. 短板修正（INDEX：小尺度下脸部细节少）

配方第三轮返修参数落地＋本卡加强：犬脸石块 5px（K_FACE）、眼白 15×8＋深色 9×8＋白色下眼环（原配方 13×7/8×7，本卡加大保证半尺寸可读）、鼻头深色椭圆 9.5×6.5＋左上高光点（黑上黑必须有高光）、怒纹 6px。**验收实测**：f290 帧缩到 960×540（1080p 一半）再裁犬脸——眼白高光、张口红腔、白石獠牙均可读（out/face-half-290.png）。

## 5. Remotion 适配

init 预计算放组件 `useMemo`（首帧前同步 build，等效 delayRender 一次；模块级单例跨帧复用）；字体 FontFace delayRender（ink-boil 同款）；drawFrame(f) 纯帧号函数——同帧渲两次逐像素一致（seeded：mulberry32 2079/7/13/500+j＋LCG 7917，零 Math.random/Date/网络）。性能：build 574ms 一次／warm 32.1ms/帧（1920×1080，19,342 块其中 5,678 块动态重取色）。

## 6. 音频

旁白 edge-tts YunyangNeural +8%（GAP=6/LEAD=30/TAIL=40）；BGM `12-aurora-glass` seed 20261095 drop 9.3（=HERO f278）；SFX 7 点（ Mixkit，犬吠以 hit-blow+bass 拟音替代——库内无真实犬吠，audio-notes.md 披露）。
