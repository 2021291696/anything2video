# SPEC：3D 一镜到底（studio-oneshot）

**正本源工程**：`samples-l1/studio-oneshot`（2026-10-07 验证交付）｜**图元库**：`src/style/world.ts`（纯数学：相机样条/色板/时刻表/seeded rng）+ `src/style/OneShot.tsx`（四站 3D 世界）+ `src/style/chrome.tsx`（HTML 覆盖层：投影站标/标题/字幕/收束行）
**风格句**：深石墨影棚无限地面 + 瓷质白道具 + 双色 rim 辉光 + Hermite 一镜到底相机（到站比首词早 0.3s，禁停泊）。

## 依赖申报（本卡专有，消费工程必须单独安装）

`three@0.186.1` + `@remotion/three@4.0.507`（**必须与工程 remotion 版本严格对齐**，双份 remotion 会崩）+ peer `@react-three/fiber@9.8.1`（npm 自动装）+ dev `@types/three`。渲染前照例拷 chrome 缓存到 `node_modules/.remotion/`。

## 锁死项

- **色 token**（`world.COL`）：bg `#141418`（雾同色）｜floor `#1a1a1e`｜porcelain `#f4f2ec`｜graphite `#26262c`｜die `#1c1c22`｜rimCold `#cfe4ff`（冷白 rim，常驻知识感）｜rimWarm `#ff9a4a`（暖橙 rim，唯一 hero 专用，点亮时才增强——一色一义禁装饰）｜accent `#7fd8ff`（青色电光：刻蚀/诞生脉冲）。
- **瓷质材质参数**（`Porcelain`）：MeshPhysicalMaterial `color #f4f2ec / roughness 0.24 / clearcoat 1 / clearcoatRoughness 0.12 / sheen 0.18`；石墨瓷（`Graphite`）`#26262c / roughness 0.34 / clearcoat 0.55 / clearcoatRoughness 0.3`。clearcoat 是签名高光，禁整体去掉（lanshu 教训：玻璃+clearcoat 会爆辉光斑，本卡瓷白无此问题，实测正常）。
- **灯光配置**（四盏，Shadow 仅一盏）：key `directionalLight (10,13,7) intensity 3.2 #fff4e6` castShadow 1024²（shadow camera ±15/±10/−6, bias −0.0005）｜rim 冷 `directionalLight (−8,6,−9) 1.9 #cfe4ff`｜rim 暖 `pointLight (站D组内 1.6,2.6,−1.8) 2+ignite×22 #ff9a4a distance 14 decay 2`｜fill `hemisphereLight(#3a3a46, #101014, 0.72)`。Canvas `shadows dpr={1} gl={{antialias:true}}`，无 postprocessing（雾=假景深 `#141418, 11→36`）。
- **相机插值算法**（`world.camAt`）：10 键 Catmull-Rom 非均匀三次 Hermite（邻键差分切线），**每段每分量切线钳制 ±3|Δ|**（Fritsch-Carlson 式限幅——不过冲，修掉「长飞行→长驻留」甩镜，实测过冲 bug 见 report）；到站键 = 该句首词帧 −9（0.3s）；结尾拉全景键 f345→f386。相机 rig 与投影站标共用同一 `camAt`（单一事实源）。
- **确定性纪律**：纯帧号驱动——旋转= `(f/30)×角速度`，轨道=`相位+f/30×速度`，全部位置参数化；随机量只走 `world.rng`（mulberry32，模块级播种：微尘 20261007/晶体 4407/大脑点云 77/光尘 991）；禁 Math.random/Date/网络/useFrame/物理引擎。Remotion 三帧等值由「同 f 同输出」保证（渲染树纯函数 of f）。
- **一镜到底纪律**：全片一个 ThreeCanvas 一座世界，无剪切无转场；驻留段保留相机微漂移（禁停泊——任意两帧有位移或道具微动，liveness 探针过）；收尾 f362-386 准定帧 0.8s 带微动（内核脉动+光尘），全静止禁。
- **frame_cost 实测值**（锁死预算依据）：最小场景 stills 口径 1087ms 均值/1104ms 最大 ≤1200ms（10 帧，方法与原始数据见 report「frame_cost 实测」）；全片 video 口径实测 70-77ms/帧（386 帧 26.9s 墙钟）。**消费方预算口径用 video 吞吐**，stills 探针的 ~1.05s 为调用固定开销勿误读为场景成本。
- **版式**：标题 Noto Sans SC 300/46px + mono 副行（Geist Mono 14px letterSpacing 0.42em）；站标 22px 白字 + 12px mono 副行（下挂 hairline 竖线）；字幕 33px 白字柔光无底带（影棚底自暗）。

## 复用适配点

- 换题目=换世界数据：改 `world.ts` 的 `CAM_KEYS`（到站键锚新旁白首词−9f）+ `STATIONS/LABEL_ANCHORS`（布局与站标）+ `OneShot.tsx` 里对应站 group 的道具时刻表；灯光/材质/相机算法零改动。
- 站点道具四选一拼装：转台类（Graphite 圆台）+ 瓷白主道具（Porcelain 任意简单几何）+ 点云类（`brainGeo` 模式：mulberry32+fibonacci 球分布→BufferGeometry→pointsMaterial additive）+ 内核类（emissive 球 + `BRAIN_IGNITE` 点亮包络，hero 段落通用）。
- 投影标签组件（`chrome.tsx` `StationLabel`）直接复用：给世界锚点与出入窗，自动跟随相机+安全区隐去；换文案只动 `STATIONS`。
- hero 点亮包络：`ignite(f)=clamp01((f−from)/(full−from))` × 呼吸 `0.78+0.22sin(2π·0.8·f/30)`——内核 emissive/点云透明度/暖 rim 强度三处共用同一 ignite 变量（同步呼吸，BGM drop 对位 `from+(full−from)/2` 附近）。

## 与同族边界

- vs `isometric-city`（s34-iso）：那是 CSS 2.5D 等轴微缩（伪 3D、楼体生长、平移视差）；本卡是真 3D 影棚（three 场景、物理材质、透视相机飞行）。题材上 isometric 管城市/设施/流程地图，studio-oneshot 管旗舰发布/大概念的「展台叙事」。
- vs lanshu v6-cinematic（借鉴源）：机制同源（影棚/瓷白/一镜/投影标签），实现零拷贝——其为 HyperFrames 全局脚本+DOM 惯用法，本卡为 R3F 声明式+Remotion 帧号驱动（其 core.track 时钟驱动不可用于确定性渲染，已重写为纯帧函数）。

## QC 豁免档

- f362-386 准定帧收尾（相机慢漂+内核脉动+光尘上浮；liveness f330→385 MAD=14.4 非零）——合法微动，非死动画。
- f345-353 站 D 标签淡出残影（~25% 透明度中态）——淡出中态非残留；介意则 `STATIONS.D.to` 345→340。
- f88-101/f172-186/f258-268 中景飞行低信息密度——一镜呼吸段，每段 10-14 帧即过。
- WebGLShadowMap「PCFSoftShadowMap has been removed」console 警告——three 0.186 内部降级 PCFShadowMap 的提示，画面无差异，非错误。

## 样张

`skill-intake/sample.jpg` = 正片 f300（t=10.0s 成片实测抽帧）：大脑点云轮廓 + 暖橙内核满亮 + 双斜环 + 站 D 光池暖晖 + 字幕「装进机器的大脑，」——hero 签名帧，回归对照基准。

## 借鉴登记

技法借鉴 lanshu-create-ai-presenter-video（MIT, cclank），Remotion 重写。
