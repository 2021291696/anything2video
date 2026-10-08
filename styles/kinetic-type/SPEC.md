# SPEC：信息排版动态字体（kinetic-type）

**入库日期**：2026-10-08（战役 v4 批次⑤ Wave E，prompt-motion 看片复核 P1 卡）｜**正本源工程**：`samples-v4/kinetic-type`（样片《一句话的重量》13.1s/393f）｜**图元库**：`src/style/kit.tsx` + `src/style/Scene.tsx`（无纹理/字体文件依赖）
**风格句**：信息排版动态字体——字是演员：超粗黑体大字本身即运动主体，主词踩旁白重音砸进来、修饰词从虚线槽位升起、标点成为节拍、词性四级视觉层级、说完不再动；奶油白/纯黑/橙红/宝蓝四色实底按句节拍硬切。

## 正样本与领地

- **基准样本**：prompt-motion zheke 条目（RECON-pm-watch §2.3 看片裁决：三条 "kinetic type" 中唯一真身）。itsuki/topi 两条为杂糅 editorial reel，仅作参考样本（标题卡语法）。
- **领地**：文字作为结构信息主体弹跳/砸落/升起/粒子化——swiss-print（静态瑞士版式）、hanazi-916（情绪花字）均未覆盖。

## 锁死项

- **色 token**（`KT`）：**严格四色** paper `#F5F0E6`｜ink `#141414`｜vermilion `#E8442A`（主词专属强调）｜royal `#2B3FD6`——连接词层级用 ink 的透明度档（0.45/0.85），不引入第五色相。
- **纯平契约**：无渐变/无阴影/无 glow 滤镜；「句号微光」用径向衬底圆（radial-gradient 色块）实现，属衬底件非发光件。
- **幕底节拍硬切**：换色发生在单帧内、零过渡；一幕一底色（本片：黑→宝蓝→橙红（幕内半段，砸落帧）→奶油白→黑）。
- **词性四级**（`Rank`）：main（168-260px，vermilion，900）＞noun（92px，正文色 900）＞conn（38-54px，细体 500，45% 透明度）＞punct（54px，节拍件 85%）。
- **运动原语**（全部纯帧号解析函数）：`slamScale`（5f easeOutQuart 2.2→0.97+3f 回弹）｜`shakeAt`（7f 指数衰减 ktHash 抖动）｜`riseAt`（槽升起 115%→0 easeOutCubic 13f，无回弹）｜`popScale`（标点 6f 过冲弹入）｜`pulseScale`（emphasis 10f 半波 1→1.14→1）｜`softDropY`（句号软落无回弹）｜`crouchLift`+`slamFallY`+`landSquash`（蓄力→重力加速砸落→压扁回弹）｜`breatheScale`+`glowAlpha`（定帧微动效）。
- **排版**：`layoutLine` 确定性行排版（CJK 1em 测宽 `ktTextW`，不量 DOM）；`ktHash` 种子杂凑，禁 Math.random/Date/网络。
- **钉帧纪律**：主词 slam/emphasis/升起全部钉 TTS 字级实测帧（tts_build timeline.json chars[]）；「说完不再动」段零 SFX 零宏观运动。
- **三纪律**：钩子 0.5s 内主词砸入｜HERO（全句编排完成+主词 emphasis）落 60-75% 窗口｜结尾定帧 0.8-1.2s+ 带微动效（字重呼吸 ±1.2% 周期 90f + 末词微光，禁全静止也禁大动）。

## 词汇清单

`KtBg`（幕底纯色硬切）｜`SlotBox`（虚线槽位框：appear 淡入/land 收回）｜`KtWord`（词演员：槽容器 maskRise 升起 + scale/sx/sy/ty 上层合成）｜`FlashRing`｜`ImpactLines`｜`StressMark`（重音▼砸落）｜`BaseRule`（基线细线画出/淡出）｜`EmphUnderline`（强调下划线砸出常驻）｜`SoftGlow`（径向衬底微光）｜`StillFrame`（收束细框四边画出）。

## 差异边界（vs hanazi-916，锁死声明）

hanazi-916=综艺**情绪花字**：五层描边（挤出/彩色外描/粗白描/渐变填充/顶部高光）、爆炸框/序号牌/印章等情绪道具、综艺拟音 SFX 绑定、贴纸堆叠世界。本卡=**结构信息排版**：平涂实底、字槽对位、词性分级、一屏一焦点；字的世界是「版面」不是「贴纸」。可共享的只有底层手感——弹簧参数族与 textEm 确定性测宽（技法借鉴 mg-styles-15 demos/18-hanazi，MIT, Vincentwei1021，TSX 重写）；层栈/描边/情绪语义零复用。`riseAt` 槽升起机制借鉴 swiss-print 的 maskRise（技法借鉴 lanshu-create-ai-presenter-video，MIT, cclank；本仓 styles/swiss-print/swiss.tsx）重写：行内排版改为「词有确定性槽位框，从槽内升起，落定槽框收回」。

## 复用适配点

1. 拷 `kit.tsx + Scene.tsx` 即用（Fonts 走模板 common）；换文案只改 `LINE1/LINE2` 词组表（rank/size/gapAfter）与 `B` 钉帧表（按新片 tts_build timeline.json chars[] 重锚）。
2. 多句片：每句一组 layoutLine + 幕底轮换（四色循环），句间硬切；单句语法（砸/升/标点）原样复用。
3. BGM 配方 `18-hanazi`（variety bouncy）；SFX 词汇：重音砸入=`impact-deep-whoosh`/`bass-hit-short`，槽升起=`sweep-short`，标点=`switch-click-quick`/`ui-tone-quick`（静止段禁 SFX）。

## QC 豁免档

- **大面积实底**：一屏一焦点排版下单字/单行占画面 2-8%，probe_blank「近乎全屏同色」（>92% 单桶）命中属风格本体（zheke 帧表同款构图）——逐帧看图定性留证，不作渲染缺陷修。
- **定帧段 MAD 低于阈值**：呼吸 ±1.2% 的字重微动效 MAD≈0.2<0.5 采样阈值——双帧像素差实证（本片 f352 vs f372=4506px）非全静止即可豁免；提高幅度会稀释「不再动」语义。
- **大字脉冲的槽容器裁切**：pulseScale 1.14 时 168px 主词顶部可触 mask 容器边（pad 12px 内裁切 ~1-2px）——视觉上是「顶到槽边」的版式感，不修；若换更大脉冲幅度需同步加 pad。

## 样张

`sample.jpg` = 正片 f172（签名帧：旁白「砸」字帧——幕底橙红、主词墨黑砸落基线、重音▼、冲击线/环、震屏收尾）。辅样张 `out/stills/frame-3.png`（钩子砸入）、`frame-90.png`（标题行+空槽对位）、`frame-266.png`（HERO 全句编排+词性四档）、`frame-352.png`（定帧微光）。
