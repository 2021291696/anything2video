# SPEC：综艺花字（hanazi-916）

**正本源工程**：`s34-hanazi`（2026-10-06 验证交付，1080×1920 竖屏原生）｜**图元库**：`src/style/kit.tsx` + `src/style/cats.tsx`（无纹理依赖）
**风格句**：高饱和撞色多层描边胖体花字 + 弹性逐字入场 + 手绘装饰符号 + 综艺节奏打击音效；竖屏原生（竖屏是卡属性，非第三筛选轴）。

## 锁死项
- **色 token**（`HZ`）：bg `#FFF4E3` 奶油底｜ink `#2B2149` 深紫墨（挤出投影/正文对比）｜pink `#FF4D88`｜yellow `#FFC93C`｜cyan `#35D0FF`｜white｜vermilion `#D93425`（仅印章/禁止圈）。粉/黄/青三色按场景轮换（信号①粉②青③黄④粉），印章永远朱红。
- **幕底**：`PopField`（三软色斑 16px 慢漂 + 34px 半调网点双角 + 0.13 透明度圆角虚线框）；底层画面纯代码几何猫（`cats.tsx`：CatFace/CatSit/CatBellyUp/PawShape/Heart/NoTap/SealHanzi），禁照片。
- **花字词汇**（`HuaZi`）：五层 SVG text = 挤出投影（deep，y+0.09em）→ 彩色外描边（outer，2×(whiteW+outerW)）→ 粗白描边（whiteW 0.07em）→ 渐变填充（fills 顶亮底深）→ 顶部高光（gloss 0.5）。弹簧 ζ=0.517/ω=22（峰值 1.15@5f、收敛@8f），逐字错帧 2（hero 可 1），交替 ±5° 入场旋转；字距自动 0.09em。字体 Noto Sans SC 900。
- **情绪三档**：惊讶=`Burst` 放射爆炸框（双层多角星形+微旋，配 `kickShake` 全组震屏 8 帧）；强调=`Sparkle` 四角闪 + `Badge` 序号牌弹入；旁白小字=`SubBand` 逐条歪斜（-1.4°/1.0°/-0.8°/1.4°）+ 释义行 skewX(-5°) 手写感。
- **保活**：`holdWiggle`（入场 8 帧后转角 ±1.6°/浮沉 3px/呼吸 0.012，相位按字错开）只给花字层；底场仅慢漂，不做全屏恒动。
- **钉帧纪律**：花字/情绪框出现时刻 = 语音/画面钉帧 +2f（beat-sheet `flowerPinPlus2` 显式登记）；结尾定帧 0.8–1.2s+ 带印章微摆 ±0.5° 与闪点交替。
- **竖屏版式**（卡属性）：关键信息 x80–1000 / y180–1500；字幕带 y1400–1570（SubBand 中心 y1462，白字 46px + 墨色描边环 16+8+4）；信号卡纵向三层 = 序号牌(y330) → 大字(y450, 124–132px) → 释义行(y604, 56–62px) → 主体猫(y950–1150)；中文正文 ≥42px；底部 350px / 右侧 160px 不放必要信息。
- **音效绑定**：综艺卡通拟音=风格本体：`pop/duang/squeak/stamp/slide_whistle/boing/text_hit(slam)/sparkle/ding`（mgaudio 单点），钉帧随花字；BGM 配方 `variety bouncy`（STYLE_MAP `18-hanazi`）。

## 复用适配点
- 无 staticFile 纹理依赖，拷 `kit.tsx + cats.tsx` 即用；`FrameScope/useGlobalFrame` 全局帧合同随库走（镜头组件必须用全局帧对齐钉帧——s34-hanazi 初版本地帧 bug 的制度化教训）。
- 换主题只改：六镜头的场景文案与猫形选择、HuaZi 各场景 fills/outer 配色、SFX cue 表；`Badge` 序号数、印章印文按片重写。
- 横屏适配（如需 16:9 变体）：SAFE 重锚 + 信号卡改纵向三层为左右两层，花字字号 124–132 → 96–110；竖屏参数见锁死项。

## QC 豁免档
- 半调网点角会触发 frame_metrics「整齐点阵」误报——看帧定性，不修。
- 花字相邻白描边轻互切（贴纸堆叠感）是风格本体，不算缺陷；但字符主体重叠超过 1/4 字宽才算破版。
- hero 前「露肚皮」退场残影与爆炸框约 3 帧过渡交叠：s34-hanazi 审美保留项，复用片可把 until 提前 2 帧消除。

## 样张
`sample.jpg` = f160（蹭头花字+盖章隐喻+竖屏安全区全要素）。源工程 `out/stills/frame-254.png` = 正片 f254（hero 爆炸框+花字全态+禁摸手，回归三查对照基准）；辅样张 `frame-40`（钩子）、`frame-105`（慢眨眼+歪斜字幕）、`frame-310`（朱红印章定帧）。
