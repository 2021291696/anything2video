# SPEC · target-lock（赛博 HUD / FUI 空间化界面）

战役 4 新卡（批次③，mg15 ×6 之一）｜工程：`科普视频/samples-v4/target-lock`｜画幅 1280×720@30｜样片《追踪近地小行星》12.83s / 385 帧。

## 借鉴登记

`技法借鉴 mg-styles-15 demos/22-hud (MIT, Vincentwei1021)，Remotion(React+TSX) 惯用法重写，零整段拷贝`——具体条目：
scramble 字符解码/flick 4 帧闪烁/roll 滚动落定/typed 打字机（util.js 机制重写）、SEGS seeded 分段环+conic 雷达扫描+acquire 四括号锁定编排状态机（hud.js 机制重写）、告警再上墨波 reink + 六边形网格底 + 扫描线/vignette/微 glitch（post.js 机制以 feColorMatrix/CSS 重写）。源码的 Three.js 全息球以 2D 经纬线正交近似替代（零 three 依赖）；Canvas2D HUD 层以 SVG 重写。

## 领地声明（差异边界）

- **vs crt-terminal**：crt-terminal 是字符终端美学（绿磷光、行式输出、光标扫描线为主语）；本卡是**空间化 UI**——环形瞄准镜/四角括号/面板 chrome/全息球占空间构图，字符流只是数据纹理。绿磷光换青色 FUI 线框。
- **vs neon**：neon 的发光是装饰本体（灯牌/描边炫光）；本卡辉光服务于**信息可读**（双层 glow 只加在 HUD 线框与文字上，亮度层级=信息层级：HOT 热白 > CYA 青 > DIM 暗青 > DEEP 底青）。
- **vs vhs-outrun**：同有扫描线/色差，但 vhs-outrun 是年代媒介美学（网格地平线+切缝日落+VHS 跟踪带三件套全检）；本卡是作战界面，无年代媒介叙事，扫描线只是 CRT 质感薄层。
- 母题：**锁定编排（target lock）是全卡戏剧母题**——扫描→发现→筛选→狩猎→snap 的状态机是第一签名，命卡名。

## 锁死 token

| 类 | 值 |
|---|---|
| 色 | 青 `#00E5FF` / 暗青 `#0B7C8C` / 深底 `#020A0D` / 底青 `#0E3A42` / 热白 `#E8FEFF` / 告警红 `#FF2A1F`；告警态全局翻转由 reink 矩阵派生（青族→橙红），不引入第七色 |
| 字 | JetBrains Mono（数据流/读数，600/700）+ Chakra Petch（标题/标签，500/600/700）+ Noto Sans SC（中文副标）；OFL 本地分发，许可随 fonts/ |
| 缓动 | outCubic（飞行）/outExpo（落定）/inOutCubic（hop）/inQuad（进度填充）；入 flick 出 hard |
| 辉光 | 双层：blur 1.1 + blur 4 feMerge 源图（tl-post 滤镜链，叠加轻色差 ±0.6px） |
| 密度 | 高密度但**网格对齐**（左列 x64 w200 / 右列 x1016 w200 / 环心 640,360 / 刻度环 r200/184/172/155）且**节奏错峰**（面板 t0 表：16/58/64/70/78/86/94，两列交替，禁同帧齐入） |

## 签名特征（全检清单）

1. **中央环形瞄准镜**：外环四弧慢旋（R212）+ 方位刻度环 120 tick + **SEGS 40 段 seeded 分段环**（反转）+ 虚线环 + 光晕环 + 十字线 + conic 雷达余辉（2.0s/圈、108° 尾迹）+ 扫描线 + MAG/FOV/HDG/TLT 角读数。
2. **线框全息地球**：2D 正交近似（经纬线绕 Y 轴旋转、前后明暗 0.62/0.35/0.09）、虚线轨道 + 小行星菱形 + 5 点尾迹 + 锁定后目标连线；**不引 three 依赖**。
3. **scramble 字符解码**：5 帧随机字符集（GL 40 字符）逐位解锁，`hash(id,i,df) < df/n` 判据，白热冲击帧强制明文；**flick 4 帧闪烁入场** [0.7,0.1,1.0,0.45]；等宽小字数据流三件：roll 滚动 5 帧落定真值、typed 打字机 + █ 光标、sparkline（信号跳升 + 端点热斑）。
4. **acquire 锁定编排状态机**：候选 blip 余辉揭示（scramble 标签 + BRG 方位虚线）→ 瞄准具 hop 切换（inOutQ 6 帧 + 到达脉冲）→ ANALYSING→NO MATCH ✗ / MATCH 99.7% 闪烁 → **HERO 四括号 8 帧 outCubic 从四角飞行汇聚（3 重 echo 拖影 .45/.25/.12）→ ±16px 2 帧步进狩猎抖动 → snap KF 过冲系列 [1.35,1.08,0.96,1.0]** → 36 段锁定进度环（f190 起 inQ 填充）+ 角标（TGT-03/LOCK %/T−倒计时/MATCH）骑括号。
5. **告警态全局翻转 + 再上墨波**：snap 起以目标为圆心扩张波（14 帧盖满），双层同内容互补 mask（内橙外青无缝无 alpha 叠加）+ 橙红波前环；reink 用 feColorMatrix 线性近似源码 reink()（青→橙红、亮部偏暖）。
6. **统一质感层**：辉光双层 + 轻色差（±0.6px）+ 3px 扫描线 + 滚动干扰带 + 微 glitch（7 个 glitch 帧：水平条带 + 世界层 ±2-4px 抖动）+ vignette + CRT 开机热线（f1-6）。

## QC 豁免档（闪烁类登记）

| 效果 | 帧位 | 理由 |
|---|---|---|
| flick 闪烁入场 | 全部面板/读数入场帧（t0 表） | 风格签名（FUI power-in），非渲染缺陷 |
| 微 glitch 条带+抖动 | f2/3/150/151/242/243/292 | 风格签名（信号干扰叙事节点），GLITCH_FRAMES 白名单 |
| 白热冲击帧 | f242（全帧 flash 0.2）、f150（0.08） | 锁定/发现拍击语言 |
| CRT 开机热线 | f1-6 | 钩子件（0.5s 纪律） |
| 告警波色翻转 | f243-256 扩张期 | 签名④本体；翻转后至片尾恒定 |
| REC 1Hz 闪烁 / 模式框热态 blink / MATCH 5Hz blink | 常驻 | HUD 语义性闪烁 |

## 与样片的验收对应

样片 385 帧全部签名在帧：f1（开机热线+flick）、f90（环阵+面板 chrome 全开）、f210（分析期+进度环+候选残叉）、f242（snap 白热+banner slam）、f248（告警波扩张中）、f300（告警态数据支付 0.38 AU）、f385（定帧微动效+TRACKING 徽记）。
