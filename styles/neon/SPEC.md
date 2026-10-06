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

## QC 豁免档
- flick 亮度抖动会命中闪烁曲线扫描——白名单已申报的 flick 镜头豁免； bokeh 光斑可能触发"背景碎屑"——风格本体，不修。

## 样张
`sample.jpg` = 正片 f609/1219（霓虹屋/车/雨线/bokeh），回归三查对照基准。
