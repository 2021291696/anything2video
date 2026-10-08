# SPEC：吉卜力水彩背景＋赛璐璐角色（watercolor-cel）

**正本源工程**：`samples-v4/watercolor-cel`（2026-10-08 验证交付）｜**图元库**：工程 `src/style/`（types.ts 锁死 token + noise.ts 种子随机/值噪声 + wash.ts 水彩引擎（deform/wash/cel/textureInside/paperTex/cached）+ world.ts 底版/云/树/草场 + motion.ts 纱帘/komorebi/桌布/风铃/热气/时间轴包络 + chars.ts 少女/猫 + subs.ts 字幕 + Scene.tsx 单组件正片；Canvas2D 纯函数，同帧渲三次 sha256 全等）
**风格句**：水彩洗染的会呼吸的背景 + 赛璐璐两调的角色——墙会亮、纱帘会鼓、草会一层层弯腰，人站在风里。
**技法借鉴** huashu-art-motion（MIT, alchaincyf）references/风格配方/25_ghibli.md 与 scripts/engine/scenes/25_ghibli.js（251 行）——机制与参数级借鉴（P.deform/P.watercolor/P.cel/textureInside/风场参数表/云精灵配方），全部以 Remotion(React+TSX)+Canvas2D 惯用法重写（`useCurrentFrame()+1` 纯帧号驱动，几何按 1280×720 重设计 ×2/3 视口换算），零整段拷贝；文件头注释逐文件登记。

## 锁死项
- **锁死 token**（`types.ts`）：暖纸白墙 `#fbf3e0`（窗边亮）→`#dcc49a`（角落暗）径向 + 青裙 `#3f8590`/`#2b6470` + 金发 `#f8dc8c`/`#d9a95a` + 暖橙猫 `#f3a24c`/`#d27a2c` + 线 `#6a4a38`（调软暖褐——INDEX 短板修正项）。每物两色成对（基色/阴影色）。
- **签名① 水彩洗染**：`deform()` 中点位移（每轮边中点沿法向推近似高斯量 ×min(1,len/80)、amp×0.6/轮）× 多层低 α `multiply` 叠色；`wash()` 每层 α=edge 描 1.6px 同色边=**水痕边**。常用参数锁死：大墙 layers5 α.4 amp12／色晕 layers3 α.028 amp40（源 .045，本片调亮防迷彩）／木板 layers3 α.32-.5 amp3 edge.12-.14；不透明白 `source-over` α.9+。
- **签名② cel 赛璐璐两调**：`cel()` 填阴影色→clip 内自身朝光平移 (−dx,−dy) 填基色→剩背光月牙→暖褐细线。一个函数=日式动画角色体积。
- **签名③ 角色水彩化 textureInside**：角色画进离屏 L → 纹理层（纸纹 α0.8 全分辨率＋40 块色晕 α0.12 amp16）`destination-in` 角色剪影→`multiply` 叠回。**禁 source-atop（盖纸色整体发白，源配方第一版踩坑）**。INDEX 短板「背景像了人物不像」的通用解，本卡人物强制过此材料关＋线色调软。
- **签名④ 风场**：草浪 `wind=0.5+0.5sin(3.1t−0.027x)` 相位沿 x 推进（360 根草叶成片摆=一道看得见的风浪扫过）；纱帘 gust 5.4Hz（源审片 3.2→5.4 提速定版）、鼓起 `q²·(28+71·gust)`（源 q²·(60+150gust) ×2/3 视口换算）＋ `sin(7lt+6q)` 小波纹；少女发丝/飘带/猫尾共用风相干（3.2Hz 慢涌）。钩子追加 `hookPulse=smoothstep(Δf/6)·e^(−Δf/28)` 一次性强灌风。
- **签名⑤ komorebi 光斑 34 个**：vnoise 漂移＋`sin(5t+1.7i)` 明灭＋screen 暖黄径向渐变；HERO 段亮度 ×(1+1.35·bump) 全开。
- **签名⑥ 云精灵**：白团 puff（wash source-over α0.9）＋ `source-atop` 底部蓝灰渐变，缓存精灵漂移。
- **坑（RECON §25 点名，已验证规避）**：色晕 α>.05×3 层=发霉羊皮纸（本卡 0.028×3＋亮 tint）；矩形拼墙硬接缝（暗部 amp60 大变形多边形）；textureInside 用 source-atop 人物发白。
- **确定性**：全部 seeded（mulberry32 每次调用按种子重建，无 §5.1 闭包退化模式），禁 Math.random/Date/网络；f210 三次渲染 sha256 全等。

## 三纪律（样片实测）
- **钩子 f1-15（0.47s）**：纱帘第一次鼓起——f1 settleK≈0 近垂，hookPulse 强灌风入画（frame-1 vs frame-15 对照）。
- **HERO f232-262（峰 f246=64.1%，60-75% 窗口 f230-288 内）**：草浪二次增强＋komorebi 全开，与 S03「树影落在地上，像水一样晃」对位。
- **结尾定帧 f350-384（1.17s，0.8-1.2s 内）**：freezeK 1→0.22 大动作收敛、纱帘单独 0.45 保留微鼓；微动效=光斑漂＋草微摆＋呼吸＋热气＋风铃（probe_liveness SC04 末段 MAD 0.839，非全静止）。

## 与既有卡的边界
- **vs 35_shinkai（新海诚，候选池）**：同是「动画背景」领地不同宗——吉卜力=水彩＋暖光日常＋手绘水痕边；新海诚=数字光影＋史诗天光＋高饱和渐变。RECON §25 撞车标注原文照抄进边界。
- **vs guofeng-scroll / ink-tea（水墨族）**：水墨=留白＋笔触骨法；吉卜力水彩=满铺暖色＋透明叠色（multiply）＋水痕边——材料语言相反（纸上的颜料 vs 笔墨）。
- **vs paper-collage / popup-book（纸族）**：纸族贴「纸的材质」；本卡贴「水的材质」（洗染/沉积/透叠），无剪纸边无厚度。
- vs hard-light：hard-light 用光作叙事（光斑移动切光色）；本卡光是氛围（komorebi 明灭+暖晕常驻），叙事者是风。

## 复用适配点
- 换题只改 `Scene.tsx` 层序锚点 + `motion.ts` TL 时间轴表 + `chars.ts` 母题 + `script/narration.txt`。
- `wash/deform` 是通用「手绘水彩材质」引擎：任何卡要水彩质感直接 import（参数预设见 types.ts 注释）；`textureInside()` 是「角色跟不上背景材质」的通用解（油面族/彩铅/蜡笔均适用）。
- `hookPulse` 一次性事件包络（e^-Δf/τ 衰减）可给一切「事件→回落常驻」的钩子复用。
- 音频配伍：BGM `12-aurora-glass`（暖玻璃氛围）；SFX 主题音=风（swoosh/pass）+风铃（chime-crystal）+微光（shimmer/sparkle），纪律=轻（≤0.13 gain）。

## QC 豁免档
- f350-384 定帧 1.17s：光斑漂+纱帘微鼓+草微摆+呼吸+热气为合法微动效（probe_liveness SC04 末段 MAD 0.839，最长连续静止 0 对），不修。
- SC01-SC03 段 MAD 2.1-3.4 偏均匀：风的本体是持续呼吸不是爆发节奏，属本卡「活着的背景」本体韵律，非渲染静帧。
- 相机全片缓推 1.00→1.035（f350 钳死）：极缓电影化推入，非抖动。

## 样张
`sample.jpg` = 正片 f246（HERO：komorebi 光斑全开＋纱帘呼吸鼓＋青裙少女 cel 月牙影过 textureInside＋暖橙猫＋云白团蓝灰底＋扫帚彩蛋同框，实测自成片 8.2s）；辅证 `stills/frame-1.png`（纱帘近垂开场）、`stills/frame-15.png`（钩子首鼓）、`stills/frame-150.png`（草浪推进）、`stills/frame-384.png`（定帧末微鼓）。
