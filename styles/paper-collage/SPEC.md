# SPEC：拼贴（paper-collage）

**入库日期**：2026-09-29（用户确认）｜**正本源工程**：`style-samples/src/styles-try/paper-collage/`（样片《拼贴世界》12s，用户确认）｜**图元库**：`paper.tsx`（无纹理文件依赖）
**风格句**：Vox 式剪纸拼贴——手撕纸边缘、每层纸片投影、和纸胶带、白边斜贴照片、虚线剪刀线、大标题纸条。所有形体都是"剪出来贴上去的"，没有纯数字线条。

## 锁死项
- **色 token**（`PAPER_TOKENS`）：paper `#f6f1e7`（桌面底纸）｜kraft `#d9c6a3`｜red `#d94f3d`｜ink `#274060`｜mustard `#e0a63c`。
- **撕边契约**：`tornPath`（确定性，点数 ≤24；mode 'all' 四边撕/'top' 山脊+侧撕痕）；同一 seed 撕边固定；随机只用 `paperRnd` hash（禁 Math.random/Date）。
- **纸片呼吸**：`breathe(n,seed)` ±0.3° 极慢摆动（周期 6-9s 错峰）贯穿全片——拼贴活感的签名。
- **质感**：纸纹理全部 CSS 渐变叠加（TEX 表：plain/grain/kraft），**不下载素材、不用 canvas**。
- **投影**：每层 drop-shadow（ink 色系 rgba(39,64,96,…)），层压感来源。

## 词汇清单
`tornPath`｜`zigCircle`（锯齿剪纸太阳）｜`tornBlob`（撕纸云）｜`triPts`（撕纸屋顶）｜`PaperLayer`（任意多边形+投影+旋转）｜`Tape`（和纸胶带）｜`PhotoFrame`（白边斜贴照片+两角胶带）｜`DashedCutLine`（虚线剪刀线+剪刀标记）｜`PaperText`（大字纸条）｜缓动 `easeOutCubic/easeOutBack`（贴纸微过冲）。

## 复用适配点
1. 无 staticFile 依赖，直接拷库即用；`FONT_PAPER` 走系统 CJK 栈（中文可上屏）。
2. 剪刀线路径、撕边直切/叠压关系是**每片的设计决策**（样片：剪刀线沿下缘绕行不穿主体）。

## QC 豁免档
- 撕纸锯齿边缘可能触发量化"碎屑/锐角"误报——看帧定性为风格本体。
- 纸片呼吸在静帧中不可见——判据 2（画面变化）以多帧差验证。

## 样张
`sample.jpg` = 样片 5.3s 处（撕纸山峦+锯齿太阳+胶带照片框拼贴屋），回归三查对照基准。

## v4.0 升级（2026-10-07 · Wave A/W3）
**借鉴登记**：mg-styles-15 `demos/06-collage/index.html:45-62`（MIT, Vincentwei1021）——步进时基三件套 K/Q6/ks、jit 手摆抖动、slap 三帧姿势表。TSX 重写，非整段拷贝。

**改动**
1. 新增步进时基三件套 + 手摆件：`K(t)=floor(t*12+1e-4)`｜`Q12/Q6`（12/6fps 量化时刻）｜`ks(t,t0)`（cue 起步数）｜`q12/q6(t,f)`（连续缓动→定格采样）｜`jit(id,t,amp,fps)`（hashStep(id,step) 三轴，默认 ±2px/±2px/±0.4°，12fps）｜`boil(moving)`（运动 2px/12fps，静置 1.1px/6fps）｜`liftShadow(lift)`（悬置投影律）。
2. 入场换制式：easeOutBack 连续 pop → **`slap(t,t0,pre=3)` 三帧姿势表**（k<0 空中放大悬置 s=1+0.38u²+0.05u、lift 1→0 → k=0 压扁 **0.972** 投影塌地 → k=1 回弹 **1.01**/lift 0.03 → 静置 1；k<-pre 不渲染）。`easeOutBack` 保留导出，仅作非入场微过冲。
3. 组件接线（全部向后兼容，不传 t 即旧行为）：`PaperLayer/PaperText/PhotoFrame` 增 `t/id/amp/fps/enter`（jit + slap + lift 期间上提 40px·lift + liftShadow）；`Tape` 增 `t/id`（静置 6fps boil）；`DashedCutLine` 增 `t/t0/t1`（剪刀行进走 12fps 定格揭示）。
4. 默认运动制式：全卡位移/旋转的连续缓动**输入时间过 `Q12(t)`（运动件）/`Q6(t)`（静置件）**，jit 随 t 自动叠加——「定格式抽帧」是 prompts 点名的一眼签名。

**参数照抄源码**：slap 序列（pre=3、0.38/0.05/0.972/1.01/0.03）、jit 三轴（±amp、±amp、0.2·amp 度）、boil 两档（2/12、1.1/6）、lift 投影律（+24/+34/+34px、α+0.08·min(l,1)、上提 40px）逐项与 mg15 06-collage 一致。

**签名不变声明**：`PAPER_TOKENS` 五色、`tornPath`（≤24 点确定性撕边）、`breathe`（±0.3° 连续呼吸）、TEX 纹理渐变、ink 系投影配方、既有组件签名全部不动；步进/jit 只作用于位移/旋转/入场时序，撕边形状与呼吸曲线逐点不变，`sample.jpg` 静帧回归基准不受影响。

**边界声明（本卡 vs photo-cutout）**：本卡 = Vox 式**纯代码剪纸**（无位图素材、CSS 渐变纹理、连续 breathe + 步进运动）。照片剪影**亚种 `photo-cutout`**（rembg 抠像素材 + alpha 膨胀白剪刀边 `rimmed()` + 半调网点）**不在本卡范围，`rimmed()` 不实现**；如需照片贴纸路线另立新卡。

## v4.0 opt-in 增补（huashu 30_matisse 移植 · Wave B5）

**借鉴登记**：huashu-art-motion 风格配方 30_matisse + `scripts/engine/lib/brush.js P.cut` / `render.js P.roughen`（MIT，整合仓）。TSX 重写（paper.tsx 仅增 cutMode 分支；新增 `matisse.tsx`）。剪刀边/有机形与撕边是「同纸世界两种剪刀语言」，全部 opt-in、与 12/6fps 步进时基无耦合。

1. **`tornPath` 加 `cutMode:'scissor'`（opt-in）**：剪刀平直小抖折线——沿四边每 14–24px（步距按 seed 确定）取一点 ±2.5px 抖动、直线相连（源 P.cut 参数照抄）。与撕边互补的边缘语义；点数由周长/步距决定（**≤24 点契约只约束 tear 撕边模式**，scissor 为 clip-path polygon 支持的密集折线）。
2. **`AlgaeShape` 有机形生成器（opt-in，`matisse.tsx`）**：锥形茎 + 2×lobes 圆头胶囊手指**并集**（nonzero 单 fill，投影只算一次）；手指参数照抄配方：角度 ±(1.05−0.55u)、长 width·(1−0.45u)、宽 width·(0.34−0.12u)。**禁「沿脊线调制宽度」——会出毛毛虫**（配方原坑）。star/flame 为同一并集通道的参数变体；摆动 sway=sin(2.8t+φ)·0.13 rad、卷边 curl scaleX 0.93–1.0；钉墙投影 drop-shadow(5px 6px 4px rgba(10,20,40,.3))。
3. **`roughenLayer`/`RoughenLayer` 整层手剪位移（opt-in）**：静态低频位移场 dx=fbm(0.028x,0.028y,2)·9、dy=fbm(0.028x+40,0.028y+17,2)·9（源公式与 +40/+17 照抄，|d|≤9px 上界有断言）。源为 Canvas 逐像素搬运，本卡「不用 canvas」纪律下降级为**水平条带位移近似**（默认 14 条带、逐条 clip+场采样平移）——低频手剪观感的 DOM 等价实现，已知取舍。
