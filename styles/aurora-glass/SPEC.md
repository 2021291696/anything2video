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

## v4.0 opt-in 增补：lens / tilt / motes

> 借鉴登记：mg-styles-15 `demos/12-aurora-glass`（MIT, Vincentwei1021）——TSX 重写，非整段拷贝。

- **`GlassLens`**（头号 WOW 件，opt-in）：SVG 近似版 Liquid-Glass 透镜——backdrop 模糊（blur14+饱和1.15+亮度1.04）+ `feDisplacementMap` 边缘扭曲（seeded feTurbulence 驱动，scale 9，近似 bezel refraction，确定性）+ 边框渐变高光（fresnel 近似，0.75/0.12/0.35 三段）+ **速度驱动 squash**（`springSquash`：damped-spring w=2Hz·2π、z=0.3、gain 0.00016、amt 封顶 0.1——**240Hz 固定步长自 t=0 积分，纯 t 函数，帧率确定性**：同帧同参逐位同输出，与渲染帧率无关）+ 收尾 iris 张开成句号环（`ringP` 0→1：外轮廓收至 62%、体变 ~12px 环壁，evenodd 挖孔）+ 环面跑光 `glintP`。**取舍声明：真折射/色散（源 FS_LENS shaders.js:215-356：smin metaball 颈、ior=1.5+dispersion 七采样光谱折射、fresnel、caustic）需 WebGL；SVG 版为近似，观感约七成——需要真色散时上 WebGL 后处理，勿在本卡许诺真色散。**
- **`TiltGlassCard`**（opt-in）：CSS `perspective(1200)+rotateY(±8–14°)` 倾斜玻璃板 + 顶部高光渐变 + 边缘 1px 白 30% 亮线（顶边另加 0.5 亮线，fresnel 近似）+ 斜向 sheen 带（源 FS_CARD shaders.js:149-210 的 0.045 sheen 近似，峰值 0.12）+ 入场沿 bevel（顶边→右上圆角）跑一道 30% 白高光（伪 catch-light，SVG dash 沿圆角矩形路径 `pathLength=100`，头 7 单位亮 0.85 + 尾 22 单位 0.28）。真 3D 厚度折射与 defocus LOD 做不了——倾斜+glint 已拉开与平面卡的差距。
- **`Motes`**（opt-in）：尘点微粒层，独立小件，与 `NoiseField`（防 banding 的静态噪点）是两回事；seeded 慢漂（vy −4~−14px/s、vx ±4px/s，双轴 wrap）+ 亮度呼吸（0.35–0.75·tw），screen 混合，默认 26 颗、r 0.6–1.7px。
- **不动项**：慢/透/贵气质与 **sine/linear 缓动白名单不变**——squash 弹簧是透镜受速度激励的材质响应物理（源 damped-spring），不是运动词汇，文字入场仍只有 opacity+8px；aurora 光斑床/玻璃卡配方/噪点全部默认不变。本节全部 opt-in，不启用时导出与渲染与 v3.5.0 逐值等价。
