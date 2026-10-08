# SPEC：C4D 软渲染质感（soft-jelly）

**正本源工程**：`samples-v4/soft-jelly`（2026-10-07 验证交付）｜**图元库**：`src/style/world.ts`（纯数学：接触 ODE 预积分/闭式波场/克隆阵列/时刻表/seeded rng）+ `src/style/JellyScene.tsx`（three.js 软胶世界：糖果材质/床阵列/棚拍布光/Cyc）+ `src/style/chrome.tsx`（完成层：DOF 三叠层/S 曲线调色/hero punch/end-creep/颗粒 boil/lockup/字幕）
**风格句**：粉彩棚拍 + 站立双色糖果胶囊克隆阵列作软胶床，物体（糖果胶囊）在其上做 jelly squash 与行进涟漪——光滑 PBR 软渲染，静棚物体动。

## 依赖申报（本卡专有，消费工程必须单独安装）

`three@0.186.1` + `@remotion/three@4.0.507`（**必须与工程 remotion 版本严格对齐**，双份 remotion 会崩）+ peer `@react-three/fiber`（npm 自动装）+ dev `@types/three`。渲染前照例拷 chrome 缓存到 `node_modules/.remotion/`。

## 锁死项

- **色 token**（`world.COL`）：gummy `#ff4d9e`（hero 体）｜peach `#ff8a52`｜cap 奶瓷 `#ebdccd`｜lilac `#a878d8`｜床柱三变 `#d9bfa4/#b18cd4/#f99a6c`｜cyc `#e3d2de`（配 vertexColors 前暗后亮 `#d8c2d2→#f2e2ec`）｜排版梅紫 `#4a2e4e`。粉彩四族（candy pink/peach/cream/lilac），禁加饱和撞色。
- **糖果材质**（`CandyMaterial`）：MeshPhysicalMaterial `roughness 0.22 / ior 1.42 / clearcoat 0.45 / clearcoatRoughness 0.16 / sheen 0.42(体 0.65) / sheenColor #f5bfda / specularIntensity 0.55 / envMapIntensity 0.4`。**近似打七折声明**：源 gummy 的 SSS（Weight 1.0/Radius(1.0,0.5,0.8)/Scale 0.11）以 sheen+attenuation 色近似，clearcoat 0.45 原值；transmission 关闭（frame_cost 门裁决，见下）。双色胶囊几何 = 帽（r, 略宽）+体（0.94r）两段 CapsuleGeometry 沿几何轴（local Y）偏移拼合，台阶唇缘是签名轮廓。
- **床阵列**：hex 网格 PITCH=0.228、柱径 0.212/柱高≈0.43（体 r0.098+帽 r0.106 两 instancedMesh 共 399 实例，几何烘焙偏移 BED_HALF_H=0.211，柱顶=着陆面 y=0；**柱径与 PITCH 差 0.016 是防「走廊视线」关键**）；逐实例 seeded 抖动 ±6% 尺度 / ±4° 倾角；体色三变奶油为主；倒伏件 seeded 1.5% 在近景带（y∈1.05-1.8，避 hero 区）。边缘下沉：远缘（y<-0.5 起）全沉 + 两侧 |x|>1.9 渐沉——**网格边界永不入画**。
- **软体动力学**（`world.pillTrack`，dt=1/2400 模块级预积分）：`bed_force` 指数硬化弹簧床 A=1.43/λ=0.02/Cd=47（hero 重球 A=1.0/λ=0.033/Cd=62）+ jelly squash 阻尼振子 **ws=2π·3.3 / zeta=0.14 / beta=0.56**；落前翻滚 (1-u)^2.2、落后 wobble、体积近似 sxz=1/√(1+s)。**波场**：`ring`（阻尼余弦×高斯包络，hero c=4.4/λ=1.15/amp0=0.16，轻胶囊 c=3.4/λ=0.95/amp=0.105·min(v/11,1.2)，τ 窗口早退）+ `sweep` 方向高斯带（钩子横扫/S03 阅读序波 v=2.6/收尾呼吸带）；柱列响应 = dz+梯度倾斜 atan(1.35·∂h)+squash(0.28/0.34)+hero 预备 tremble(17Hz seeded)+nest 弹坑。
- **灯光/棚**：key `directionalLight (3.2,5.4,2.6) intensity 2.1 #fff2e8` castShadow 1024²（frustum ±6 near1 far20, bias −0.0004）｜粉色条灯 `(-4.4,2.4,-1.6) 1.5 #ffc9e2`｜ambient `#ffe4f0 0.75`｜Cyc（地面 y=-0.5+圆弧收边+后墙，**MeshBasicMaterial 顶色烘焙渐变**——门裁决：最大平面不付逐碎片光照）+ 地平线辉光 sprite。Canvas `shadows dpr={1} gl={{antialias:false}}`（AA 关=门裁决）。相机静棚微呼吸：expoOut 慢漂 + 双频微动（0.11Hz/0.07Hz），禁全静态。
- **相机/构图**（`world.CAM`）：pos (0.15,0.95,2.25)→(0.24,0.99,2.33)，tgt (-0.08,-0.05,0.35)，fov 42；糖果落点（PILLS）按逆投影钉屏位：P1 (300,330) / P2 (480,430) / P3 (880,410) / hero (640,580)。**方向纪律：相机看 -z，「近景」=大 y**。
- **完成层**（`chrome.tsx`）：DOF 三叠层 backdrop-blur 2.5/2.6/4.9px 线性 mask（随 lockup 跟焦渐入 quartOut 1.2s）；S 曲线 feComponentTransfer **源 41 点表逐值保留** + saturate(1.08)，开场二级罩 multiply f1-27 淡出（近似，已声明）；hero punch `0.035·(1-expoOut(df/6))` + 抖动 `[2,-1.5,1,-0.5]`，只变换 3D 板（文字层不震），origin '50% 80%'→'50% 62%'（f290 切）；end-creep `0.0092·(tc<0.6? tc²/1.2 : tc−0.3)`（f329 起）；颗粒 = SVG feTurbulence（baseFrequency 0.9 seed7）+ 逐帧 hash 平移，opacity 0.09 overlay；lockup rise+unblur+track-in（0.46em→0.26em，词错峰 0.07s expoOut 0.9s）。
- **确定性纪律**：纯帧号驱动；ODE 预积分与床阵列模块级播种（mulberry32 seed 20261085）；禁 Math.random/Date/网络/useFrame/物理引擎。同 f 同输出。
- **frame_cost 预算口径**（锁死）：**~200ms/帧**（1280×720 dpr1，renderMedia 斜率法终版实测 196.4；13 轮降本阶梯见 report）；红线=transmission（+612ms）与全场 scene.environment（+155ms）——env 只准挂小画幅物体；构图/相机改变后**必须复测门**（第 9 轮教训）。renderStill 口径 ~2.6s 为调用固定开销，勿当场景成本。

## 复用适配点

- 换题=改 `world.ts` 的 EV 时刻表 + PILLS（落点/尺寸/双色，RIPPLES 自动派生）+ narration 重跑 TTS 重锚；动力学/波场/材质/完成层零改动。
- 任意 MeshPhysicalMaterial 糖果（`CandyMaterial`）+ `pillTrack(tLandF,z0,dropF,heavy)` 即得「软着陆」动作单元——可多颗、可改 heavy 参数做重量差异。
- 波场注册即波即得：往 `waveHeight` 加一条 `sweep`/`ring` 即新编舞（呼吸带、横扫都是现成模式）。
- 完成层 `Chrome` 与 3D 解耦：包任何 children 画布都成立（punch/creep/DOF/颗粒/lockup 全套带走）。

## 与同族边界

- vs `studio-oneshot`：一镜到底相机叙事（Hermite 串站、禁停泊）vs **静棚+物体动**（近固定相机，运动全在软体动力学）。
- vs `clay-town`：定格颗粒感（CSS 等轴、手摆、哑光）vs **光滑 PBR 软渲染**（物理材质 clearcoat、连续缓动、真透视）。
- vs 源（mg15 04-3d-render）：Cycles 离线序列 + DOM 播放器 → R3F 实时确定性场景；字形充气字母+chrome 球 → 三小一大糖果胶囊编舞；数学与完成层同源移植。

## QC 豁免档

- f329-365 定帧呼吸（end-creep+颗粒 boil+胶囊呼吸+呼吸带波；liveness MAD=10.3 非零）。
- f240-243 chrome 抖动表（设计内 punch，源同款）。
- f240-245 / f319-328 字幕间隙（旁白句间，画面不静止）。
- console 警告三条（PCFSoftShadowMap 降级 / THREE.Clock 弃用提示 / @remotion/three 内部）——画面无差异。

## 样张

`skill-intake/sample.jpg` = 正片 f300（t=10.0s 成片实测抽帧）：hero 大糖果粉 + 三颗双色胶囊 + 克隆阵列床 + 涟漪凹陷 + lockup「A SOFT LANDING/软着陆」+ 底部 DOF——签名帧回归对照基准。

## 借鉴登记

技法借鉴 mg-styles-15 demos/04-3d-render（MIT, Vincentwei1021），TSX/R3F 重写：sim.py 闭式软体运动学与 index.html 完成层技法参数移植，实现零拷贝（源为 numpy 离线管线 + DOM 序列帧播放器）。
