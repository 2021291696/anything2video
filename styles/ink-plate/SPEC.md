# SPEC：包豪斯丝印（ink-plate）

**正本源工程**：`samples-v4/ink-plate`（2026-10-07 交付）｜**图元库**：`src/style/world.ts`（数学/时刻表/断言/套准状态机）+ `src/style/kit.tsx`(版画图元) + `src/style/film.tsx`（四版编舞正片）——纯 SVG+CSS transform，零纹理依赖、零真 3D
**风格句**：240px 模数网格上的几何编舞 + 红黄蓝黑四墨叠印 + 双版错位丝印完成层 + Passkreuz 预告语言 + 120BPM 一拍一动作。
**定位**：规则/流程/次序类概念的机械理性讲解（排队、协议、状态机、工序节拍）。

## 与最近似卡的差异边界（SPEC 必写项）

- **vs swiss-print（瑞士国际主义排版）**：swiss 的主语是「字」（字与网格的编辑设计，信息层级靠字号/字重/栏式）；本卡主语是「形」（圆/三角/方是角色，网格是舞台，信息靠落位与队序讲述）。swiss 无套印错位与落版敲击语言，本卡四版错位是完成层签名。
- **vs morph（形变）**：morph 是连续轮廓插值（N 顶点重采样对位 + via 圆中介）；本卡**无任何连续形变**——全部运动是量化跳变落位（io2/in2 滑入砸死、12 棘齿步进、翻面用竖直镜像无中间弧线），形状 identity 恒定，只换位置与朝向。
- **vs paper-collage（拼贴步进时基）**：collage 的步进是定格抽帧美学（12/6fps 手摆）；本卡的步进是机械擒纵（12 棘齿×16 分音符棘轮，齿内后 65% 行程）——运动永远精确对齐 BGM 网格，无手摆抖动。
- **题材分工**：ink-plate 管次序/规则/节拍类抽象概念；swiss-print 管文字信息型版面；pop-dot 管企业 explainer 弹性形状语法。

## 锁死项

- **色 token**（四墨+一纸，禁第五色相）：红 `#E03C31`｜黄 `#F2B705`｜蓝 `#1E4FA3`｜黑 `#111111`｜奶油纸 `#F1E9DA`。形状↔墨永久绑定：圆=红、三角=黄、方=蓝、结构线/题头/十字=黑。
- **模数**：M=120px 半模数（网格钢线间距），CARD=240px 卡片模数（形状边长）；trim x40-1240 / y60-660（10×5 卡片）；全部版面元素按模数测量（题头横幅 10×0.5 模数、钢线距 120、题头墨迹总宽=4 模数=8 字槽×0.5 模数、L 队落点=240 网格线交点）。
- **缓动白名单**（机械理性，禁 overshoot）：只有 `io2`(power2.inOut)、`in2`(power2.in，落版砸死)、`lin`(linear)——world.ts 唯一导出，全片无其他缓动。
- **节拍**：120BPM=15f/拍（BGM techno 同网格，b0=f1）；**一拍一动作**，全部动作钉拍点/反拍（源 cues.json 事件表纪律）。
- **四版完成层**（签名，源 WebGL press pass 的 DOM 重写）：每墨独立 SVG 版层 × `mix-blend-mode: multiply` 逐版偏移合成——`plateOffset()` = 套准状态机（reg：1 基准错位 → err 后 1→2.3 松版 → 三次敲击逐击收紧 → lock 0.12 敲进套准）+ 三色离心 spread 脉冲（敲击 3f）+ seeded 滚筒偏心（±0.65/±0.18px 恒定）+ feTurbulence 印边粗糙（4 版独立 seed，位移 2.4px）+ 纸牙斑驳（coarse multiply 0.07 / fine soft-light 0.32）+ 逐帧平移颗粒（overlay 0.14）+ 暗角。
- **印刷 trap 惯例**：形状自带 2px 同色外扩描边（spread 防露白）；方入场宽含 4px trap；黑版 overprint 一切色墨（抢拍撞墙=方塞进黑条下方）。
- **Passkreuz 预告语言**（源 target() 移植）：环+四刻+心点十字，拍点/反拍出现，**until=真实落版帧被落版墨敲掉**（时间窗移除，源"落版墨把十字敲掉"语义）；抢拍落位无预告=画面罪证。
- **步进 90° 群转**（源 groupAngle 12-detent escapement 移植）：`-90°·(k+io2((r-0.35)/0.65))/12`——快中段、两端明显步进，落齿点=BGM 16 分音符；形状绕轴点 (640,300) 群转，横队转角成 L 队。
- **挖孔（knockout）纪律**：题头横幅文字/计数器/slug/色标孔全部走 SVG mask 挖孔（黑版无墨=纸色显现），黄版强调字印在挖孔位；动态文字（拍计数）在 mask 内随帧重算。
- **模数版式**：题头字 40px/900、textLength 锁定段宽（5 字=300px/3 字=180px）；小字 13px/700 tracking 2.6；零淡入淡出——一切出现/消失是印刷出现（瞬时盖印）或时间窗移除。

## 复用适配点

- 换题材：改 `world.ts` 的 `EV`（时刻表）+ `LANDINGS/CROSSES`（落点/预告台账，断言自动复核）+ `film.tsx` 形状-墨绑定即可换故事；图元库与套准状态机不动。
- 图元件：`Passkreuz`（预告十字）、`GridRuling`（16 分音符落规钢线）、`Banner`（挖孔题头横幅）、`KandinskyKey`（▲■●钥匙）、`InkChips`（版次色标）、`RegMarkAt/SheetMarks`（套准标/角线）、`TurnGroup`（12 棘齿包裹器）、`CaptionPlate`（印刷字幕）。
- 套准状态机 `regAt/spreadAt/densAt/plateOffset` 是通用的「丝印完成层」——任何扁平几何卡叠加即得印刷质感。
- `world.ts` 的 module 级网格断言模式（落点∈网格 + 十字↔落版对位 + 违规位无预告三连检）可移植到一切网格编舞卡。

## 网格断言（开发期纪律的运行时化）

- `assertOnGrid`：14 个形状落点 + 9 个预告十字，全部 ∈ 120px 网格线（形状落点全为 240 卡片中心或 240 网格交点）；module 载入即检，**随每次渲染执行**，越格即渲染失败。
- 交叉校验：每个十字的 until 必须对位真实落版拍；抢拍落位（c4r1）必须无预告（与「排错一格」叙事互锁）。
- 自检命令：`node --experimental-strip-types src/style/world.ts` → PASS（14 落点+9 十字；群转 0→-90°；onGrid 负例正确拒绝）。

## QC 豁免档

- 定帧段 f353-389（1.20s）：末形（红圆）红版错位微颤 ±1px @10fps 量化 + BEAT 计数 f376 步进 26/26——合法微动效；probe_liveness SC05 相邻 MAD 0.494-0.589（1 对低于 0.5 阈值，最长连续静止 1 对 < 4）。
- lock 帧纸牙震落：f346 +2px / f347 +1px 全画面 translateY settling（源 camera() 移植）。
- 群转中段（f265-295）黄三角扫掠瞬时越出裁切线下缘 ≤21px、并与题头横幅 overprint（黑×黄=墨色）——印刷叠印语义自洽，落定后无越界，运动帧不修。
- bgm_generate WARN: silence gap 0.85s（配方内部乐段间隙，落在 f308-315 旁白间隙附近）——混后为合法呼吸口。
- 网格钢线发丝线（1.1px, alpha 0.17-0.28）为设计内低对比层；颗粒/纸牙为设计内噪点层。

## 样张

`sample.jpg` = 正片 f280（t=9.3s）实测抽帧（ffmpeg -ss 9.3）：步进群转中段——方呈菱形扫掠、三角随动、圆中途，双 Passkreuz 预告落点在画（c7/c8），轴点黑点压地平钢线，题头横幅挖孔+黄字，字幕「一拍都不能抢」——群转+预告+套印三签名同帧，回归三查对照基准。

## 借鉴登记

技法借鉴 mg-styles-15 demos/09-bauhaus（MIT, Vincentwei1021）——Remotion/TSX 重写，未整段拷贝。具体借鉴点与重写方式：双版/四墨错位丝印管线（源 Canvas2D 墨版分离 + WebGL press pass → 多层偏移 SVG × mix-blend-mode multiply + feTurbulence 位移滤边）、Passkreuz 预告-敲掉语言（源 target() 时间窗语义 → React 时间窗组件）、12 棘齿擒纵群转（源 groupAngle 公式逐项移植为 turnAngleDeg）、帧中心量化闸门 snap、模数版式度量反推（源 measureType 量字宽反推 letterSpacing → SVG textLength 锁宽）、印刷 trap（源 4px 漏白/黑版 overprint → 同色外扩描边 + 版层叠印顺序）、套准状态机（源 registration() → regAt/spreadAt/densAt 重锚定本片时刻表）、cues 事件表纪律（源 cues.json 双读 → world.ts EV 时刻表 + beat-sheet.json）。
