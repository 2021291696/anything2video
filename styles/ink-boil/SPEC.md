# SPEC：逐帧线沸腾（ink-boil）

**正本源工程**：`samples-v4/ink-boil`（2026-10-07 验证交付）｜**图元库**：工程 `src/style/`（engine.ts 噪声/几何/boil + brush.ts 变宽笔刷 + cadence.ts 打帧曝光表 + fx.ts CelFX 编舞词汇 + state.ts 帧级状态机 + actors.ts 角色绘制 + Scene.tsx 单组件正片；Canvas2D 纯函数，同帧渲两次逐像素一致）
**风格句**：奶油纸 cel + 变宽手绘墨线（每 2/1/3 帧重播种沸腾）+ 错位平涂填色 + 打帧节奏（一拍二/一拍一/一拍三）+ smear/multiples 快动作帧 + 纸纹每张重乘。
**技法借鉴** mg-styles-15（MIT, Vincentwei1021）demos/05-cel-boil 的 engine.js 五件套与 scene.js 编舞词汇——机制与参数级借鉴，全部以 Remotion(React+TSX) 惯用法重写（Canvas2D 绘制进 `<canvas>`，`useCurrentFrame()+1` 纯帧号驱动），零代码拷贝。

## 锁死项
- **色 token**（`PAL`）：ink `#1C1613`（墨黑）｜red `#E5402B`（番茄红）｜yel `#FFC425`（葵黄）｜cream `#F4E9D0`（奶油纸底）｜hi `#FFF6E2`（奶油纸亮调派生，仅高光/拖影/烟）。**禁入第五色相**；`#fff7df`/`#fff0b4` 仅作灯池 multiply 色（黄的邻域）。
- **line boil**（第一签名）：`boil(pts, seed, amp=2.4, scale=70)` 世界空间 3D 单纯形噪声位移，z=seed 重掷=重画一张；由 DrawCadence 张号驱动重播种——每 2/1/3 帧线条必然微变，画面在呼吸。
- **打帧节奏 DrawCadence**（`cadence.ts` SCHED 曝光表）：30fps 成片帧号查表——普通动作一拍二（boil 4 张循环 `id%4`）、快动作一拍一（擦燃拖划/点火/HERO 爆框/熄火）、静止一拍三（hold 段 boil 3 张 `id%3`）。全片 361f = 225 张唯一画稿。
- **变宽笔刷**：`inkW` 手绘墨宽剖面——**6px 基准 ±35%**（jit=0.35 压力噪声）+ 两端锥形（t0=14/t1=26px）+ **背光侧加粗**（法线与光向 (0.55,0.83) 点积）；`outline()` 中轴+法线偏移成轮廓多边形（8 段圆头端帽）填充；`inkLoop()` 闭合形拆 1-2 笔重叠描（2.5px 出锋）+ 自动判绕向统一重边朝向。
- **off-register 填色错位**：`REG={dx:-4, dy:3}`，填色与描线**独立 boil** + 固定 dx/dy 偏移（手上色没套准的印刷感）；全部 fillShape 调用带错位。
- **smear / multiples**（快动作帧，1s 段内各保 1 帧）：smear=扫掠面填充+条纹+主体沿运动方向拉伸 150-300%；multiples=前后两姿之间 3 道残影（本片 f147/f148）。
- **纸纹每张 cel 重乘**：程序 tooth 纹理 tile（multiply 12%）**每张 cel 换 offset**（「every cel is a new sheet」）+ 每张 20 粒石墨尘（hash 换位）。
- **确定性**：全部 seeded（mulberry32 + FNV hash + 单纯形噪声固定置换种子），禁 Math.random/Date/网络；实测同帧渲三次 sha256 一致。

## 图元库菜单（src/style/）
- `engine.ts`：mulberry32 / hs / makeNoise3D / boil / spline（向心 CR 保角）/ resample / prefix / xf / circlePts / K+E 缓动
- `brush.ts`：inkStroke / inkLoop / fillShape / hatch（手排线 clip 填充）/ edge（转角出锋直边）/ outline / inkW / Layers（离屏层池）
- `cadence.ts`：SCHED 曝光表 + drawing(f) + bv（boil 变体）
- `state.ts`：镜头表/火柴姿势机/火焰高度/灯池半径/跳步/幕震（纯帧号函数）
- `actors.ts`：火柴盒/火柴/火灵/擦燃特殊帧/字幕题字绘制
- `fx.ts`（CelFX 包）：starPts / twinkle（四尖星芒）/ drawSpark（泪滴火花）/ speedLinesTrail / speedLinesRadial / drawStarburst（三层爆框）/ smokeGroup（云朵圈：填色+destination-out 墨环+体积弧）/ drawWisp（烟丝带顶卷）/ drawLightPool（scallop 灯池 multiply 入纸）/ drawEmbers（余烬粒子）/ drawPoof（小爆星）

## 复用适配点
- 换题只改 `Scene.tsx` 的编舞表（matchPose/flameH/poolR/hopDx 四个状态函数 + drawFrame 事件分支）与 `cadence.ts` 的 SCHED；图元库四个文件零改动。
- 与 **line-art 的分界**（两卡 SPEC 互引）：line-art=恒线宽单色单线、静态几何无填色、无沸腾、连续缓动；**ink-boil=变宽笔刷+错位填色+逐帧沸腾+打帧节奏**（一拍二/一/三）、快动作走 smear/multiples 而非运动模糊。
- 与历史弃卡 ink-tea（水墨）的区隔：水墨=晕染扩散软边；本卡=硬边赛璐璐+沸腾重绘。
- 音频配伍：BGM 配方 `05-cel-boil`（mgaudio lofi，直接以配方 slug 传 `--style`）；SFX 主题音 = paper 族（摩擦/移动）+ impact 族（bass hit）+ light 族（点火/余烬），钉帧表同源 `research/beat-sheet.json calibrated.sfxCues`。

## QC 豁免档
- f327-361 结尾定帧 1.17s：3s 打帧 boil（烟卷/余烬/线条重播种）+ 余烬 twinkle 闪烁——合法微动效（probe_liveness SC04 全对 MAD 2.7-35.5 有活性），非全静止，不修。
- 相邻 cel 之间全画面线条微变（MAD 基线 ~1-3）：line boil 是风格本体（第一签名），帧差探针记「整帧微动」属预期，不是渲染抖动。
- 幕震期间整幅平移（≤13px、≤9f、二次衰减）：有意冲击语言，非稳定问题。
- 末 6 帧轻收暗至 0.18：合法收尾，非黑场（probe_blank 18 帧全过）。
- f1-2 空纸两帧：钩子以 f3 火柴拍入计（0.1s 达标），空纸是 cel 片「开画前一张白纸」的惯例起手。

## 样张
`sample.jpg` = 正片 f217（HERO：15 尖三层爆框 + 火灵满高脸/双臂 + 放射速度线 + 灯池 + 变宽沸腾墨线全签名同框），回归对照基准；辅证 `out/stills/frame-147.png`（smear 拉伸帧：扫掠面+条纹+头 260% 拉长+速度线）、`out/stills/frame-4.png`（拍入：poof 爆星+尘圈+入画速度线）、`out/stills/frame-330.png`（定帧：错位题字+烟圈+余烬+炭化 stub）。
