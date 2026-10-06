# SPEC：弥散渐变玻璃拟态（aurora-glass）

**正本源工程**：`科普视频/samples-d8/s34-aurora`（2026-10-06 验证交付）｜**图元库**：`src/style/kit.tsx`（纯代码 CSS/DOM，无纹理依赖）
**风格句**：大面积高斯模糊彩色光斑缓慢漂移作底 + 磨砂玻璃卡片 + 1px 高光描边 + 邻近色低对比 + 全程呼吸感慢节奏。

## 锁死项

- **色 token**（`AG`）：bg `#05041a`｜bgLift `#0a0824`｜violet `#7050FF`｜indigo `#4A3AE8`｜blue `#2F46F2`｜periwinkle `#8C8CFF`｜cyan `#34CFF0`｜ink `#EAF0FF`｜inkDim `rgba(234,240,255,0.60)`｜glassFill `rgba(255,255,255,0.08)`｜glassStroke `rgba(255,255,255,0.30)`。**全部光斑色限定紫蓝青邻近族（可整体换成橙粉红族），禁补色/撞色对；暗底亮斑。**
- **aurora 床**（`AuroraBackdrop`）：3-5 颗纯色大圆（无渐变、靠 blur 出柔边），`filter: blur(90-130px)` + `mix-blend-mode: screen` + 底上 `radial-gradient` 暗底；各沿 `loopBezier`（Catmull-Rom→Bezier 闭环）**22-36s 周期**漂移（片内必须呈现 ≥1/3 循环），各自叠 ±3.5% scale 呼吸（8-12s）与 ±6% 亮度呼吸；全片挂在壳层连续漂移、不随镜头重启；首颗光斑亮起 ramp 即钩子（0.5s 内可辨）。
- **玻璃卡**（`GlassCard`）：`backdrop-filter: blur(20-40px)` + 白 **5-10%** 填充 + **1px 白 30% 内描边**（inset boxShadow）+ **28-32px 大圆角** + 卡顶 5% 高光渐变 + 深色投影（浮起感）；卡面呼吸微浮 ±3px sine（用绝对帧算相位，跨镜头连续）。
- **噪点**（`NoiseField`）：feTurbulence 静态确定性纹理，**3-5%**（现值 4.5%）+ overlay 混合，全局顶层，防 banding。
- **缓动**：只允许 sine 呼吸曲线与 linear（kit 只导出 `eSine`/`seg`/`inv`）；**文字入场只用 opacity + 8px 位移**；一切皆慢——无弹性、无甩入、无快动作；快动作=风格违规。
- **文字**：Noto Sans SC 细字重（300）+ 大 letterSpacing（3-10）；小字标签用 Orbitron（数字/英文小 caps）。

## 复用适配点

- 无 staticFile 纹理依赖，`kit.tsx` 整库拷入 `styles/<sku>/` 即用；镜头组件演示了「光斑钩子开场 → 玻璃卡逐张浮起 → 三卡汇拢 → 玻璃卡品牌字定帧」的完整品牌 teaser 骨架，换文案与光斑配色即可复用。
- 光斑床在壳层（Main）全局挂载、镜头只画前景：换主题时保持此结构，保证 aurora 跨镜头不断线（呼吸相位用绝对帧）。
- BGM 走 `bgm_generate --style aurora-glass`（12-aurora-glass 配方，ambient glass）；SFX 用 Mixkit `light/` 类（aura/shimmer/sparkle-touch/stardust-swish），gain 压低至 0.06-0.14、同音色异增益防机枪感。

## QC 豁免档

- **呼吸段静止误报**：结尾定帧段（≥0.8s）版式全静止，仅 aurora 漂移/呼吸光/噪点——本卡签名特征，属合法微动效，看帧定性不修。
- **大面积渐变+暗底**：整帧平均亮度低、色域集中在邻近色族，frame_metrics 类「色彩单调/暗部占比」指标会偏——aurora 床本意即弥散低对比，不修。
- **玻璃卡在亮斑上会「变亮变彩」**：backdrop-filter 取决于卡后画面，卡体填充/描边不恒色是材质本性，不算配色违规。

## 样张

`sample.jpg` = f180（aurora 光斑床+磨砂玻璃卡全要素）。源工程 `out/stills/`：f60（光斑床+钩子小字）、f240（三张玻璃卡全要素）、f360（合并玻璃卡+品牌字+NIGHT MODE）为回归三查对照基准。
