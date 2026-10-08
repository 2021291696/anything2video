# SPEC：蓝图（blueprint）

**正本源工程**：`blueprint-bridge`（2026-09-27 验证交付）｜**图元库**：`blueprint.tsx` + `icons.ts`（无纹理依赖）
**风格句**：深蓝晒图底 + 精确网格 + 白色工程线（实线画入/虚线隐藏结构）+ 黄色尺寸标注 + 图框标题栏。

## 锁死项
- **色 token**（`BP`）：bg0 `#0d2a4a`｜bg1 `#123a63`｜line `#d7e8ff`｜dim `#7fa8d9`｜accent `#ffd23f`（唯一强调，只给尺寸标注/重点）｜grid `rgba(160,200,255,.10)`。
- **幕底**：`BPGrid`（40px 双向网格 + inset16 图框 + 右上标题栏「BLUEPRINT NO. … · SCALE 1:200」）＋ `BPPost` 晒图褪色暗角。
- **线词汇**：`BPLine`（draw-on，ease 幂1.6，len24，w5；`dashed='18 12'` = 隐藏结构线语义）｜`BPDim` 尺寸标注（accent 黄、端点圆点、中置数字——工程图签名元素，每片至少出现）｜`BPIcon`（Iconify ds 白线逐条错峰画入，步进 0.55）。
- **版式**：`BPText` Exo 2/Orbitron、大写+letterSpacing 8；标注数字 Exo 2 700 24px。

## 复用适配点
- 无 staticFile 纹理依赖，直接拷库即用；`icons.ts` 按新片主体增补 Iconify ds（Apache-2.0 优先）。

## QC 豁免档
- 网格底会触发 frame_metrics"整齐点阵"误报——看帧定性，不修。

## 样张
`sample.jpg` = 正片 f669/1339（双铁塔+力线+图框），回归三查对照基准。

## opt-in 增补（2026-10-07，技法借鉴，默认输出不变）
- `BPLeader`（新）：正交折线引线束——共用垂直脊线（源点 ox/oy + 脊线 sx）+ 12px 45° 倒角（|by-oy|<c 直连，否则 sx 处 (by∓c)→(sx∓c)→by，∓ 随目标在脊线左右侧）；画入 dasharray/offset easeInOutCubic 0.36s；发光头 r9 `#fff6cc` + drop-shadow(0 0 12px accent) 骑在折线 pointAt（u≥1 隐，解析式折线长度替代 getTotalLength）；终点确定性 sparks（seed=nb*31+k*7.7+0.5，速率 220+hash*520、寿命 0.35+hash*0.35、drag=(1-e^(-3dt))/3、重力 420dt²）；`flow` 起 3 点流光（相位 ((t-t0)*0.75+j/3)%1）；逐目标 `start`+i*`step` 错峰。
- `BPRevCloud`（新）：修订云——矩形或顺时针多边形点列，逐边 n=max(1,round(len/(2r)))（r 默认 18）每泡一段圆弧 `A (len/n/2+2)…`；draw-on easeInOutQuad 0.45s；倒三角标签（顶点 (0,-22)/(24,18)/(-24,18)）+ mono 字 a+0.3 起。**色彩例外**：默认 `BP.redline #ff5b3a`（工程 redline 惯例即红，opt-in 组件专用；`color` prop 可改回 accent 维持"唯一强调"锁）。
- `BPDim` 新 props：`arch`（45° 建筑起止符：tick 方向 ((dx+dy)/L,(dy-dx)/L)、半长 6.3、3px；文字强制正立 |角度|>90° 翻转、放外侧 off 符号定 32/-12px）｜`off`（法向偏移，增强模式默认 40；画 1.5px opacity0.7 延伸线，测点+8 → 偏移+10）。两 prop 均缺省时走原路径（端点圆点 + 中置数字，逐属性不变）。
- `BPText` 新 props：`words`（[[unit,tSec],…]，传了即切 ghostKaraoke，text 忽略）+ `emphasis`（词下标数组）——逐字符空芯→实心点亮 easeOutQuad(pr(t,at-0.03,0.16)) 提前 30ms；未唱 rgba(215,232,255,0.17)+1.5px 空芯描边（0.3*(1-lit) 淡出），唱后 #d7e8ff 实心；emphasis 词 accent #ffd23f。不传 = 原样。
- `easeConstantPush`（新工具函数）：k = easeOutQuad(pr(t,S,0.6))*0.1 + 0.9*pr(t,S,End-S)——90% 线性分量恒速慢推、结尾不归于静止；总结帧 scale(1+0.03*k) 用。

> 技法借鉴 lanshu-create-ai-presenter-video（MIT, cclank）——Remotion 重写，2026-10-07
