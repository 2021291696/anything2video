# SPEC：终端（crt-terminal）

**入库日期**：2026-09-29（用户确认）｜**正本源工程**：`style-samples/src/styles-try/crt-terminal/`（样片《终端唤醒》12s，用户确认）｜**图元库**：`crt.tsx`（无纹理/字体文件依赖）
**风格句**：磷光 CRT 终端——黑绿底、等宽字逐字敲入、荧光晕、扫描线+曲率暗角、块状光标、ASCII 框线/进度条、boot 日志。一切内容都是"终端里打出来的字符"。

## 锁死项
- **色 token**（`CRT_TOKENS`）：bg `#050a06`｜phosphor `#33ff66`｜dim `#1a8f3c`｜amber `#ffb000`——**amber 全片 ≤1 处语义**（WARN 行 + 进度条 8f 同步闪的联动窗口）。
- **字体**：等宽系统栈 `'Consolas','Courier New',monospace`（不随库分发）；中文靠系统 CJK 回退。
- **打字机契约**：`Typewriter` 字符切片是 N 的纯函数（2f/字符）；光标 8f 周期闪烁（打字中常亮）。
- **荧光系统**：`phosphorGlow` 分层晕（白芯不糊）+ `phosphorBreath` 4s 周期 ±5% 全屏微脉冲（贯穿全片）。
- **扫描线双层**：`CrtScreen` 慢滚亮带（900f 周期）+ `FastScanBand` 快速亮带（**全片 ≤2 次**）。
- **随机**：只用 `crtHash` 种子哈希（禁 Math.random/Date）。

## 词汇清单
`CrtScreen`（整屏底座：荧光微光/滚动亮带/扫描线/曲率暗角/玻璃边）｜`Typewriter`｜`Cursor`｜`LogLine`（OK/WARN/none）｜`AsciiBar`（█▓▒░ 进度条 + warn 联动）｜`AsciiBox`（┌─┐ 框线顺时针画出）｜`GlowText`（荧光大字）｜`FastScanBand`｜`ramp/easeOut`。
**opt-in 扩展（默认不启用，见文件尾扩展区）**：`DecodeText`（乱码逐字解码入场：ri=t0+dur·(0.3+0.7·i/(n-1)) 默认 dur=0.32s，乱码 30tick/s 轮换 `DECODE_POOL`，CJK 槽 1em 占位防跳版，hot 区间定稿染 amber——**计入琥珀预算**）｜`GlitchBurst`（包裹式转场 glitch：触发窗 seam±[−0.034,+0.09)s，切片位移 scale=200 + RGB 色差 + 3px 扫描线，窗外原样透传，须在 AbsoluteFill 内包全屏层、多实例各传 id）｜`ChamferPanel`（六点切角面板，左上/右下切角 c=18，fill=bg/stroke=dim/2px，可 dash）｜`chamferClipPath(c)` / `CRT_CHAMFER_CLIP`（配套 CSS clip-path 常量）｜`crtNoise`（扩展区配套 sin-hash，与 crtHash 并存）。

## 复用适配点
1. 无 staticFile 依赖，直接拷库即用；ASCII 图形按新片主题设计（字符格数注意 78 列内）。
2. 拍边界按"终端会话连续性"处理（命令打完再接下一拍，非严格等分切拍）——同风格沿用此叙事口径。
3. opt-in 扩展组件按需取用：转场切点用 `GlitchBurst` 时把切点帧写进 seams（属 Post 效果，QC 亮度/闪烁扫描需申报豁免）；`DecodeText` 的 hot 高亮默认 amber，用即占用该片的唯一琥珀语义额度。

> 技法借鉴 lanshu-create-ai-presenter-video（MIT, cclank）——Remotion 重写，2026-10-07

## QC 豁免档
- 荧光呼吸/扫描线/亮带属风格本体 Post 层（亮度曲线扫描需在白名单申报后豁免）。
- 曲率暗角会让四角量化亮度偏低——空场/无光判据按帧定性。

## 样张
`sample.jpg` = 样片 11.6s 处（SYSTEM ONLINE + 进度条 100% + boot 日志 + run demo ✓），回归三查对照基准。
