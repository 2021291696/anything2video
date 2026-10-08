# SPEC：白板马克笔科普（whiteboard）

**正本源工程**：`samples-v4/whiteboard`（2026-10-08 验证交付）｜**图元库**：工程 `src/style/`（`kit.tsx` token/墨迹引擎/手绘几何/笔尖道具/板上相机/字幕条 + `scene.tsx` 样片编舞，纯 DOM/CSS/SVG，`perfect-freehand` 为模板既有 MIT 依赖）
**风格句**：白板白底 + 马克笔渐进生长（讲一句画一句）+ 多色批注墨水分工 + 手绘箭头/圈注/下划线 + 错误笔划掉 + 板上相机 pan/zoom + 笔尖光标 + 底部字幕条。
**手法参考**：prompt-motion 白板解释器条目（tak3sh8 本体 / lemomo 截图批注 / Sarut0bi 配方分步），零素材搬运、零 prompt 搬运、零代码拷贝（ATTRIBUTION 框架：手法参考、重写实现）。
**技法搭底**：chalk 卡的笔画生长引擎媒介反转复用——perfect-freehand 压力轮廓 / dash-reveal（dLen 解析+dashoffset）/ 逐字符现写（clip-path inset 负边距）三机制的马克笔语义重写（无粉笔颗粒/双影/粉尘，改单层平涂墨 + multiply 叠笔变深）；mg15 line-art 的 tau 转角减速思路以 smoothstep 笔速替代。

## 签名三件套全检（缺一不可，新片自检必过）

1. **白底马克笔渐进绘制 + 笔尖光标**：白板暖白板面（静态 feTurbulence 颗粒 0.05 + 铝框 12px + 轻暗角）；墨迹一律沿路径渐进生长（点列笔走 perfect-freehand 轮廓切片，path 笔走 `dasharray/dashoffset = len·(1−easedU)`），句子起点对齐旁白句起点（讲一句画一句）；马克笔笔尖道具（墨色笔头 + 墨色箍 + 深灰笔杆，rotate -38°）全程跟随当前笔画末端（弧长定位 `dPoint` / 累计字宽定位）。
2. **多色批注墨水分工（色语义锁死）**：黑 `#33333b`=结构笔（弧线/地面/标题）｜橙 `#e2762c`=太阳与红光（暖光族）｜蓝 `#2456c4`=蓝光（payload 色）｜绿 `#1f9d55`=空气分子（对比态）｜红 `#d63a31`=强调批注（划掉/圈注/下划线）。全部墨迹 `mixBlendMode: multiply`（签名件：马克笔半透明，叠笔/压线处自然变深）。
3. **批注语法族 + 板上相机**：手绘箭头（Q 弓主线+两翼头，**头必须独立 InkPath 以 delay=主线 dur−2 补画**——SVG dashoffset 按子路径独立生效，拼同一 d 会提前显形）、红椭圆圈注、双道下划线、错误笔划掉（gCrossOut 双折 zig + 文字降饱和 0.45，全片 ≥1 次）；BoardCam 多键 pan/zoom（scale 围绕画面中心 + x/y 平移，smoothstep 插值）；底部同步字幕条（白底描边小票样式，SUBS 驱动）。

## 锁死项

- **色 token**（`WB`）：board `#fbfaf6`｜frame `#d7d7d1`｜ink/red/blue/green/orange 见上｜wash `rgba(36,86,196,0.16)`（蓝天铺色）｜cross `rgba(51,51,59,0.42)`。
- **笔触契约**：MarkerStroke（点列）= perfect-freehand `{size 8-13, thinning 0.18, smoothing 0.62, streamline 0.5, simulatePressure: true, easing 1−(1−k)^1.6}`，点距 ≈8px（resample）；InkPath（path d）= round cap/join、width 3-6（铺色 17）、dLen 解析 M/L/Q（Map 缓存，Q 12 段采样）。
- **手写字**（HandText）：Noto Sans SC 900、逐字 clip 现写 `inset(-12% ((1−u)·100)% -22% -4%)`（负值上下边距防裁 ascend/descend）、字姿抖动 rotate ±1.1° / 平移 ±1.4px（无状态 hash）、opacity 0.92。
- **几何生成器**：gLine（端点抖 ±2 + Q 控制点弓 wob）/ gBow（弓形弧，控制点偏移 2×bow）/ gCirc（40 段、1.1 圈搭口、半径抖 2.5%）/ gZig（n 折幅值 amp）/ gUnder（双道下划线，第二道短 42% 右错位）/ gStar（撞击 4 短刺）/ gHatchSet（平行斜杆组，逐根 stagger）/ gCrossOut（双折划掉）。seed 显式传参、无状态 hash `fract(sin(n·12.9898+78.233)·43758.5453)`，同 seed 恒同形、可 seek、可并行。
- **镜头语言**：全片一块板连续累积（长片才擦板分节）；节奏全靠绘制调度（讲一句画一句）+ 板上相机；错误笔划掉是唯一「否定」语法。
- **字幕**：白板格式签名——底部白底小票字幕条（描边 1.5px + 底边 3px 墨线），不吃全宽色带。

## opt-in preset 登记用法约定（本轮不单独实现组件，按以下约定扩件）

- **`screenshot-walkthrough`（lemomo 批注教程语法）**：底换真实截图框（圆角深灰描边容器内贴 `staticFile` 截图，零手绘），whiteboard 墨迹层原样叠加批注（圈选 gCirc/gBow、箭头 gHead、下划线 gUnder、手写标签 HandText）；笔尖光标逐点引导视线；约定截图框走黑墨结构笔、批注墨水分工不变。适用：产品教程/操作指引。
- **`step-by-step`（Sarut0bi 配方分步语法）**：固定画布内容持续累积不重置 + 四组件约定——①步骤编号圈（gCirc 小圆 + HandText 数字）；②剂量计数器（DigitRoll 语义：大数字随投放动作 count-up，hash 步进）；③配料清单 radio 逐项自动打勾（gZig 短勾 + 逐项延迟）；④顶部分段进度条（gBow 分段弧，随步骤点亮）。适用：流程/配方/实验步骤科普。

## 与 chalk 的边界（SPEC 写死差异声明）

- chalk = **黑板粉笔质感卡**：深绿黑板底 + 白垩压力笔触（颗粒 + 粉尘晕 + 双影 + 粉尘漂移）+ 木框，媒介语义是「粉尘附着」。
- whiteboard = **白板马克笔解释器格式**：白底 + 单层平涂墨（multiply 叠笔变深）+ 多色批注墨水分工 + 错误笔划掉 + 板上相机 + 旁白驱动的解释器节奏；媒介语义是「墨渗透与叠压」。互斥判据：要「深色课堂板书质感」用 chalk；要「白底多彩批注的手绘科普讲解」用 whiteboard。chalk 的笔触纪律（点距契约/配速书写）可借，介质语义不可混。

## QC 豁免档

- 结尾 f356-391 定帧 1.2s：板面冻结为合法定帧（0.8-1.2s 纪律内），微动效由笔尖悬停微颤供给（8Hz hash ±1.3px 挂真实帧，probe_liveness SC05 相邻 MAD 0.011-0.031 有活性）；f392-399 轻收暗至 0.26 非黑场（probe_blank 20 帧全过）。
- 白板大面积留白（开场 f1-30 白占比 >90%）：白板媒介本体（tak3sh8 同款版面），亮度单桶占比实测 ≤44%（颗粒+暗角摊开直方图），probe_blank 全过；帧差类探针若因留白记低活性，按帧定性豁免。
- 静态板面颗粒（feTurbulence seed=7 不随帧变）：板面材质静态是白板本体，活性由笔画/相机/笔尖供给。
- 划掉笔记长期残留（降饱和 0.45 挂在板上）：白板解释器的「更正痕迹」叙事本体，有意保留不擦除。
- 铺色排线（gHatchSet 斜杆 step 58 > width 17）露白缝隙：马克侧锋阴影画法本体，非填充缺陷。

## 样张

`sample.jpg` = 正片 f360（收束定帧段：全签名同框——太阳+放射线、大气层带+三颗小分子、红光穿透箭头+标签、蓝光弹开锯齿×3、错误笔划掉+「弹开了！」圈注、蓝天斜线铺色、「散射」圈注、小人抬头+视线、蓝墨「天是蓝的」+红墨双下划线、笔尖悬停微颤中），回归对照基准；辅证 `out/stills/frame-280.png`（HERO 铺色中段：排线扫掠 + 三连弹开 + 弹开了圈注）。
