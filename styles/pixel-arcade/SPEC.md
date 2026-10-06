# SPEC：街机（pixel-arcade）

**入库日期**：2026-09-29（用户确认）｜**正本源工程**：`style-samples/src/styles-try/pixel-arcade/`（样片《午夜游戏厅》12s，用户确认）｜**图元库**：`pixel.tsx` + `PressStart2P-Regular.ttf`（OFL）
**风格句**：复古像素街机——8px 像素网格、有限色块阵、CRT 扫描线+暗角、阶梯缓动、大像素字。所有"圆"都是方块拼的。

## 锁死项
- **色 token**（`PIXEL_TOKENS`）：bg `#0d0f1c`｜panel `#1a1f3a`｜magenta `#ff3d81`｜green `#2ee6a8`｜gold `#ffc93c`｜white `#f4f6ff`；灰阶只允许 `GRAY` 两档（`#a2a2a6`/`#3c3c44`）。
- **像素契约**：所有"圆"= 方块拼；位移动画过 `stepped()`/`q()`（4px 网格量子）；随机只用 `rnd(i)=fract(sin(i*127.1)*43758.5)`（禁 Math.random/Date）。
- **字体**：Press Start 2P（OFL，ttf 已随库）——**无 CJK 字形**，中文文字用 Noto Sans SC 900 或避免大段中文上屏；`PixelFont` 组件负责注册。
- **CRT Post**：`CrtPost` 扫描线（阶梯微闪）+ 慢滚亮带（4px/帧）+ 暗角 + 玻璃内阴影，永远放最顶层；开机 `CrtBoot` 只在拍①。

## 词汇清单
`PixelText`（大字+闪烁）｜`PixelSprite`（字符画→块阵，同行同色合并控 DOM）｜`PixelRunner`（11×14 小人，3f 腿摆）｜`PixelCoin`（旋转高光）｜`PixelBurst`（块阵烟花）｜`PixelSky`（星阵+特写星+双层天际线视差）｜`PixelRoof`｜`CrtBoot`｜`CrtPost`｜缓动族 `stepped/stepScaleIn/after`。

## 复用适配点
1. `PixelFont` 的 `staticFile('fonts/PressStart2P-Regular.ttf')` → 把库内 ttf 拷进新项目 `public/fonts/`（路径不变）。
2. `icons`/sprite 字符画按新片主体增补（块阵画法，不引外部素材）。

## QC 豁免档
- 阶梯（stepped）动画在 probe_liveness 的平滑度判据下属风格本体；扫描线/暗角为 Post 层本体。
- 已知取舍：样片拍②③采用连贯奔跑契约（同风格新片沿用"主体跨拍不硬切"）。

## 样张
`sample.jpg` = 样片 3.0s 处（像素小人楼顶奔跑 + 金币列队 + HUD），回归三查对照基准。
