# v3.8.0 — 轴 L：lanshu 技法吸收（4 新卡 + 6 卡 opt-in 增强）

日期：2026-10-07 ｜ 触发：竞品深度对比（cclank/lanshu-create-ai-presenter-video，MIT，2188★）

## 做了什么

**裁决框架**：lanshu 九风格中四个与现有卡正面撞车（留白↔swiss-print、信号↔crt-terminal/neon、图纸↔blueprint、黑板报↔chalk）——不加卡，技法以 opt-in 形式增强现有卡；五个新领地中四个建卡（手帐的便利贴/橡皮擦道具并入 line-art/chalk 增强），命名按 a2v 惯例重取。**用户拍板：卡片完全独立、无 3D 禁令**（isometric-city 的"禁真 3D 库"是单卡契约非全局规则），因此 three.js 卡可以按独立卡引入。

### 新卡 ×4（19→23）

| 卡 | 领地源 | 签名 | 样片 |
|---|---|---|---|
| pop-comic 波普漫画 | lanshu v5-comic | 粗描边错位阴影+半调网点+拟声词爆炸星+贴纸拍入（0.16s easeInQuad 锁死参数）+网点擦除转场 | 12.29s/367f |
| popup-book 纸艺立体书 | v4-paper | 牛皮纸+feTurbulence 纸纹(seed7)+rotateX 底缘铰链 90°→-10° 立定（弹簧过冲≈9%）+地影随折角+三层视差+拉页转场 | 12.95s/387f |
| clay-town 黏土小城 | v9-clay | SSR 等轴正本换黏土材质（顶亮/侧暗+inset AO+±2% 手捏抖动）+clayDrop 软落+kawaii 拟人件+双层标注 | 12.65s/378f |
| studio-oneshot 3D 一镜到底 | v6-cinematic | **skill 首张 three.js 卡**：石墨影棚+瓷质 MeshPhysicalMaterial+Catmull-Rom ±3\|Δ\| 限幅一镜相机（到站恒早 9f）+纯帧号确定性 | 12.93s/386f |

管线照 CAMPAIGN-D 体例（samples-l1/CAMPAIGN-L.md）：TTS 云详+8% → mgaudio 程序编曲（STYLE_MAP 新增 4 映射）→ mix_audio+mix_sfx 两段式 → typecheck/check-plan/stills/preview/video/ffprobe/probe_blank/probe_liveness 全门禁绿。

### 既有卡 opt-in 增强 ×6（默认输出不变，diff 审计为纯追加）

- **swiss-print**：SwissText maskRise 遮罩升起 / MarginNote 揭出 / SwissBlocks 四语义方块 / SwissReceipt 小票生长（pre/swap「？」揭晓+锯齿底，纯平化）/ SwissPageTurn 转场
- **blueprint**：BPLeader 正交引线束（45° 倒角+发光头+确定性 sparks+flow）/ BPRevCloud 修订云（弧泡算法）/ BPDim 45° 起止符+延伸线 / BPText ghostKaraoke 逐字空芯→实心 / easeConstantPush 恒速慢推
- **crt-terminal**：DecodeText 乱码解码入场（30tick/s hash 轮换+1em 占位防跳版）/ GlitchBurst 四帧窗故障转场（feDisplacementMap 切片+RGB 色差+扫描线）/ ChamferPanel
- **neon**：DataFlow 数据包拖尾（水平切线贝塞尔+3×3 递减圆）/ Tracker 四角追踪框 / Slam 盖章砸落
- **chalk**：ChalkGeo 手绘几何（hash 抖动+收笔过冲+1.12 圈搭口）/ ChalkDash 笔画 reveal / WriteText 逐字符现写 / ChalkErase 板擦三带蛇形擦除 / paceCps 配速+wrapLines DP 折行
- **line-art**：新增 extra.tsx——StickyNote 便利贴（slap+peel）/ Eraser 橡皮（toPencil 褪铅笔灰语义）/ GridPaper 方格纸 / Uncover 书写窗口 / Highlighter 荧光笔

## 关键实测（studio-oneshot frame_cost 前置门）

- renderStill 单帧 ~1.05-1.27s，但其中 ~1.05s 是每次调用的固定开销（最小场景同价）
- **renderMedia 真实吞吐 70-77ms/帧**（共享 GL 上下文），全片 386 帧 <0.5 分钟——three.js 卡的真实渲染成本与 DOM 卡同量级
- 教训入库：性能疑虑用真实渲染通道实测，探针开销会夸大 10 倍以上

## 许可与登记

- lanshu MIT 许可全文+attribution：`LICENSE-THIRDPARTY/MIT-lanshu-create-ai-presenter-video.txt`；技法领地重写为 Remotion 惯用法，零 HyperFrames 代码拷贝；各卡 SPEC 有借鉴登记行
- 登记链 12 项全落：styles/×4、styles/README（SKU 表+批注段）、style-ledger（映射 4 行+短板 4 行）、samples/（4 mp4+4 poster+manifest 26 条+index.html 23 卡+all.html 26+README 批次表）、SKILL.md（套餐池 23、宣传 9/讲解 10/史诗 4——顺带修正 v3.4.0 时代遗留的 4/5/2 陈旧计数）、bgm_generate STYLE_MAP
- 版本 3.7.1→3.8.0（SKILL.md+6 hosts）；验证工程 borrow-a/b/b-c 留存 samples-l1

## 遗留

- ~~四张新卡与六卡增强均未做 D 轮 jury（样片战役口径，正片消费时按 §7 补）~~ 样片验收：2026-10-07 用户逐卡看片，四卡全过（D 轮 jury 仍留正片口径）
- clay-town CSS 黏土质感上限（近看哑光贴纸球）——短板登记在案，重启方向 three.js 材质或更细渐变
- lanshu 配方层语法（逐字字幕四件套 chrome、演绎三铁律、facts 白名单）**未吸收**——属 recipes/explainer.md 配方层改造，另行立项
