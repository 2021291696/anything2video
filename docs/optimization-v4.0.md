# v4.0.0 — 风格层吸收战役：38 新卡 + 5 卡改默认升级 + 12 卡 opt-in 增强

日期：2026-10-07/08 ｜ 总控：`科普视频/samples-v4/CAMPAIGN-4.md`（战役唯一事实源，本篇为其文档面摘要）｜ 来源：用户指定四源（prompt-motion.com / lanshu / mg-styles-15 / huashu-art-motion）

## 定案（grilling 锁定）

一轮全吃三源（lanshu 经核查 v3.8 已挖尽 9/9，本轮零产出）；升级裁决=**只看疗效**（源码技法让卡更好看→改默认实现，加料→opt-in）；新卡不设上限全建；一次总验收；ink-tea 借 huashu 17_ink 复活重做（机 ID 沿用）；开源仓不回灌继续挂账；huashu 9 解说语法属配方层，**另立项不混本轮**。

## 冲突升级（16 处目标）

**改默认实现 ×5 + common 层**（技法移植自 mg15 源码，参数级）：
- line-art：转角密度 tau 重参数化 + monotone 标点休止
- morph：makeM 速度方向拉伸 + impact 事件系统 + smearCap 解析运动模糊（SPEC「步进感」QC 豁免撤销）
- isometric-city：hermite 相机轨 + loopPath 圆角环路行车 + zoom punch
- paperclip-sticker：zoomFly（van Wijk interpolateZoom，零 d3 依赖）曲线飞行
- paper-collage：12/6fps 步进时基 + jit 手摆 + slap 三姿势
- template/src/common/motion/（新）：hermite/monotone/quantize/smear 共享数学层

**opt-in 增强 ×12 卡**（默认输出零变化，逐值断言钉死）：pop-comic 印刷模式（网角/沃霍尔四格/kirbyShade/krackle）、pixel-arcade 像素中文 PixelTextCJK+描边+量化色板、hanazi-916 ext/gloss/节拍波、neon VhsMode+SynthwaveSet、swiss-print SwissKinetic+网点照片、guofeng-scroll AgedMode+apsara 转场+铁线描飘带、liquid-flow 体积守恒+GlossPass、aurora-glass GlassLens+TiltGlassCard、line-art WriteOnText/GlowLine/WobbleStroke、morph PartsMorph、paperclip GraphicMatchFlight+TrackCam、paper-collage 剪刀边+有机形；通用 PhotoStage 入 template/src/common/kit/。

视觉对照：upgrade-lab 工程 before/after 251 张 PNG+帧序列条（`科普视频/samples-v4/upgrade-lab/`），逐卡差异强可感知。

## 新卡 ×38（全管线 12-14s 全音频样片）

- **mg15 借鉴 6**：pop-dot 弹点（扁平矢量弹簧）/ink-boil 线沸（cel-boil 笔刷引擎 1:1 移植）/ink-plate 墨版（包豪斯双版错位丝印）/soft-jelly 软糖（three.js SSS 近似，frame_cost 门 196ms/帧）/vhs-outrun 公路夜（SVG/DOM 近似 VHS 三件套）/target-lock 锁定（HUD 空间化 UI）
- **huashu 借鉴 26**：油画族共享渲染器 `samples-v4/shared/paint/strokes.ts`（P.strokes 移植，swirl-oil 产出四卡复用）——swirl-oil 星涡（性能门热帧 3ms）/light-dabs 光斑/scream-warp 呐喊（与梵高刻意分化）/lily-pond 睡莲（boil 分档）；古典系 cave-wall 岩壁/tomb-wall 墓室/amphora 陶瓶/mosaic 马赛克（ID/SH 双缓冲）/gold-leaf 金箔/gold-robe 金袍/whiplash-line 鞭线；现当代 grain-flat 颗粒扁平/dot-infinity 波点/facets 切面/chrome-ball 铬球/soft-clock 软钟/optical-dots 点彩（热帧 0.62ms）/hard-light 硬光/watercolor-cel 水彩赛璐璐/cumulus-light 积雨云/blue-period 蓝时期（100% 蓝轴像素审计）；叙事系 dance-line 舞线（全局 BPM 弹跳接 beat-sheet）/rubberhose 橡皮管（本体动作帧差 58%）/shadow-play 皮影（性能 6.79ms）；**★ 级重做 candle-light 烛光**（人物扁平病灶闭环：光照图+失边+impasto 三件套全上）
- **复活 1**：ink-tea 水墨（huashu P.brush/P.inkWash 图元库+人物写意度四步解法；《墨虾》齐白石母题一眼可辨）
- **prompt-motion 看片后建 5**：whiteboard 白板（P0，chalk 媒介反转）/kinetic-type 字动/riso-print 孔版/math-lab 数学屋/hypnotic 催眠（闪烁 <3Hz 合规 PASS）；E1 看片 13/13 下载裁决，否决 5 条（UI 形变归 morph 配方层、体裁穿越属叙事配方、名画 3D 许可复杂等）

## 镜头卡与基建

- cinetic（MIT，@LexnLin）273 技法库挖掘：27 条值得吸收，首批 15 张镜头卡入 gallery/cards（ATTRIBUTION 登记）
- 登记链全套：styles/README 38 行、台账短板 38 行（逐工程真实提取自陈三弱点）、LICENSE-THIRDPARTY ×3 MIT、STYLE_MAP 38 键、ATTRIBUTION cinetic 批次、SKILL.md v4.0.0 套餐池 23→**61**（宣传 11/讲解 46/史诗 4）、hosts ×6、samples 放映页 64 片
- 三端同步：claude/codex junction 自动；claude-code 与 workbuddy 派生版 `scripts/build-editions.mjs` 重建 verifyEdition 通过（workbuddy 实体=`C:\Users\20212\.workbuddy\skills\anything2video-workbuddy`）

## 质量与事故

- 全战役 PRNG 排查（`samples-v4/PRNG-AUDIT.md`）：mulberry32 闭包坑（状态写内层函数体→序列恒定）抓出 pop-dot 一例已修两副本并行为验证；amphora 同款事故工期内已自修
- template 污染事故 ×3（生成脚本误以 template 为 cwd）：全部字节级恢复验证；根治=任务书「工程根铁律」（template 只读、一切脚本以新工程为 cwd）后零复发
- 待裁决豁免 4 项（ink-tea 帧差/BGM、kinetic-type 探针、pop-dot 重渲）——清单在 `samples-v4/总验收/index.html`

## 边界与未做

- huashu 9 解说语法（3b1b/keynote UI/财经图表/kurzgesagt/vox/白板/storytime/kinetic type/presenter）**另立项**，本轮只做了撞车标注（y3↔chalk、y5↔hanazi 等 4 硬撞）
- 候选池挂账：fresco（huashu 20 全屏壁画路线）、red-wedge（构成主义独立建卡）、photo-cutout（paper-collage 照片剪影亚种）——按需再启动
- 开源仓（2021291696/anything2video）不回灌，与本地 skill 分叉继续拉大（用户拍板挂账）
- prompt-motion 剩余 ~177 条详情页未抽样（低优先）；buildfast-skills 的 talking-avatar/threejs-game 两目录未下钻
- 备料报告与全部工程证据留存于 `科普视频/samples-v4/`（RECON-*.md、PRNG-AUDIT.md、upgrade-lab/、总验收/）
