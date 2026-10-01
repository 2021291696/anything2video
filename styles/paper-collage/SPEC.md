# SPEC：剪纸拼贴（paper-collage）

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
