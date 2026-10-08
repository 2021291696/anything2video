# SPEC：霓虹（neon）

**正本源工程**：`neon-city`（2026-09-27 验证交付）｜**图元库**：`neon.tsx` + `icons.ts`（无纹理依赖）
**风格句**：夜幕 + 城市 bokeh 光斑 + 白芯彩晕霓虹描边（确定性闪烁）+ 雨丝 + 湿地反光。

## 锁死项
- **色 token**（`NEON`）：night0 `#07070f`｜night1 `#12101f`｜pink `#ff4d9d`｜cyan `#33e0ff`｜yellow `#ffe14d`｜purple `#9d5cff`｜core `#ffffff`。
- **幕底**：`NeonNight`（径向夜幕 + 18 颗确定性 bokeh，seed 参数化）＋ `NeonPost` 夜色暗角。
- **霓虹三层**：`NeonStroke` = 彩晕（w×3.2，blur 6+w，op0.22）→ 中晕（w×1.7，blur2.4，op0.5）→ 白芯（w×0.55）。
- **闪烁契约**：flick 用确定性 sin 组合（1.7/0.31 与 1.9/0.23），**禁 Math.random**——闪烁属风格内置动效，**申报闪烁白名单时把 flick 镜头计入条目**。
- **氛围件**：`Rain` 雨丝阵（夜城片标配氛围）｜`WetGlow` 湿地彩色反光带。
- **版式**：`NeonText` 白字 + 四层 textShadow（6px 白芯→14/34/60px 彩色）。
- **图标**：`NeonIcon` 白芯描边画入 + 彩晕 + 亮起抖动（flick 0.35）；ICONS city/cocktail/car/music/home（Apache-2.0）。

## 复用适配点
- 无 staticFile 纹理依赖，直接拷库即用；`icons.ts` 按新片主体增补。
- **opt-in 扩展（默认不启用，见 neon.tsx 文件尾扩展区，依赖 `./common` 的 clamp01/easeInOutPow）**：`DataFlow`（数据包沿水平切线贝塞尔流动：基线 len 帧画入→dash "12 16" 流动层 speed 70px/s（dir 反向），拖尾包 3 组×3 圆 r=8/6/4 白芯带头，ph=((t-t0)·0.8+p/3)%1 中段亮两端淡出；确定性可 seek；配 `flowLink/flowBez` 导出复算）｜`Tracker`（四角 L 形追踪框 16px/3px（big 34/4），at 时刻 scale 2.6→1 easeOutCubic 0.3s 锁定，until 前 0.12s 淡出）｜`Slam`（盖章砸落 motion 壳：at 起 0.18s scale 1.9→1 + rotate −14°→−5° easeInQuad，until 前 0.14s 淡出，印章内容由 children 给）。at/until 均为相对 f0 的帧数；秒制参数按 fps（默认 30）换算。

> 技法借鉴 lanshu-create-ai-presenter-video（MIT, cclank）——Remotion 重写，2026-10-07

## v4.0 opt-in：vhs / synthwave（2026-10-07，默认输出不变）
- **`VhsMode`**（Post 层，包 children，默认不挂载）：RGB 色差——底图渲染一次 + 红/蓝单通道幽灵层（feColorMatrix 隔离 + `mix-blend-mode: screen`）错位 ±ca，`ca = vhsCA(t) = 3 + jit·6 + 1.5·sin(7t)`，jit = `vhsJit(t)` = vhsHash(floor(t·60)>>2, 9)<0.12 偶发加大（huashu P.vhs 同式；`ghosts=0/1` 可降档省渲染，children 会渲染 2 份）｜跟踪噪声带 70px 以 520px/s 下滚 `(lt·520+200)%(H+160)−80`，带内 6px 切片横移近似撕裂 + 90 条噪线（vhsHash 按帧重播种）｜扫描线 4px 周期（行 0 α.28/行 2 α.12）｜OSD：PLAY▶ 16 帧闪（(f60>>4)%2==0）+ 日期/时间码随 lt｜紫调暗角 rgba(10,0,25,.55)。
- **`SynthwaveSet`**（场景件包，默认不挂载）：`Sun`（SunSlit 切缝落日——radial/linear 渐变盘 + SVG mask 黑缝，7 缝、缝宽 `slitW(pos)=2+pos²·16` 随深度变大、缝以 rise 0.9 圈/s 上移循环、地平线以下裁掉）｜`Grid`（PerspectiveGrid 透视网格——消失点放射线 + 横线 `y=vy+drop/d`、`d=k+1−phase`、`phase=gridPhase(t)=(1.3t)%1` 前滚，近粗近亮远细远淡）。
- **opt-in 子色板 `SYNTH`**：sun0 `#ffd84a`｜sun1 `#ff8a3a`｜sun2 `#ff4fd8`｜grid `#3ff6ff`｜osd `#ffffff`——仅借鉴件使用，不进 NEON 锁死 token。
- **确定性白名单纪律**：jit 偶发加大/噪线重播种/缝相位/OSD 闪全部走 `vhsHash` 整数杂凑 + sin 组合（seeded 可 seek，禁 Math.random）；申报闪烁白名单时把 VhsMode 的 OSD 闪、噪带抖动与既有 flick 镜头一并计入条目。
- 纯函数 `vhsHash/vhsJit/vhsCA/slitW/gridPhase` 导出供数学断言与调用方对位。

> 技法借鉴 huashu-art-motion 26_vaporwave（MIT, alchaincyf）——Remotion/TSX 重写，2026-10-07

## QC 豁免档
- flick 亮度抖动会命中闪烁曲线扫描——白名单已申报的 flick 镜头豁免； bokeh 光斑可能触发"背景碎屑"——风格本体，不修。

## 样张
`sample.jpg` = 正片 f609/1219（霓虹屋/车/雨线/bokeh），回归三查对照基准。
