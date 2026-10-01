---
name: anything2video
description: 给一个主题/产品/品牌，产出一条 Remotion 代码动画视频的统一入口——任意类型视频都从这进：宣传片、广告、产品介绍、品牌片、讲解视频（中文或英文；时长由用户定）。画面由「配方」驱动：类型决定走哪份配方（promo 宣传片配方 / explainer 讲解片配方），配方定分镜结构、时长档位、节奏、审美与品牌色纪律；内含可编译模板（黑底 MG 视觉体系、图元库、配音/分镜/渲染工具）、多 agent 执行协议与 QC 判据；讲解片重活可继续走 anything2explainer，本 skill 是统一入口 + 宣传片主战场。The unified entry for turning any subject, product, or brand into a code-drawn Remotion video — promo, commercial, product intro, or explainer — routed by per-type recipes that define structure, pacing, aesthetics and brand-color discipline. Use when the user asks for a promotional video, an ad, a product introduction, any other kind of video about a topic, or an explainer.
---

# anything2video

把任意主题/产品做成一条**原创**视频的统一入口。画面体系不由本 skill 写死，由**配方**（`recipes/`）定义：类型决定配方，配方决定分镜骨架、时长档位、节奏与审美细则——讲解片沿用 anything2explainer 的黑底 MG 体系，宣传片/广告/产品介绍走 promo 配方（卖点驱动、品牌色前置、快节奏、CTA 收尾）。每帧都是 Remotion 代码绘制，配音/字幕/进度条与多 agent 并行建组机制与 a2e 同源。**目标是和所选配方的质量标尺一致**——开工前先读配方文档与它的标尺图。

## 何时用
- 用户要任意类型的视频：宣传片、广告、产品介绍、品牌片、活动片，以及讲解视频——统一从本 skill 进，按类型选配方路由，不要让用户先选「用哪个 skill」。
- **宣传片/广告/产品介绍是本 skill 主战场**（`recipes/promo.md`）；**讲解片（3–5 分钟科普长片）重活可继续走 anything2explainer 体系**（本仓 vendored 于 `reference/explainer/`）——explainer 配方只写路由与差异点，审美规范不维护两套。
- **提示词指定具象视觉风格（沙画/剪纸/水墨等风格即卖点的片子）或要求中英双语字幕** → 走 `recipes/custom.md`（自定义视觉路线：图纸先行 + 图标骨架 + 三层混音；已验证参考实现 usa250-sand）。
- 不适用：复刻某条现有视频、真人口播、以实拍为主的片子。

## 配方选择
| 用户要的 | 配方 | 定什么 |
|---|---|---|
| 讲解视频/科普/文章改视频 | `recipes/explainer.md` | 黑底 MG 讲解片；视觉体系与审美规范直接引用随仓 vendored 的 `reference/explainer/`（anything2explainer 体系），本配方只写路由与差异点 |
| 宣传片/广告/产品介绍/品牌片/其它类型 | `recipes/promo.md` | 本 skill 主战场：卖点驱动的分镜骨架、品牌色纪律、快节奏动效与 CTA 收尾；未知新类型按 promo 骨架裁剪 |
| 沙画/剪纸/风格化动画/自定义视觉 + 双语字幕需求 | `recipes/custom.md` | 图纸先行（风格图元库主脚本先建）+ 图标骨架铁律 + 三层混音；并行建组前必须过风格样张确认 |

**用户选模板时的风格样张**（成片参考，直接给用户看）：`styles/<风格>/sample.jpg`——粉笔黑板《勾股定理》/ 工程蓝图《一座桥的诞生》/ 霓虹夜城《城市不打烊》/ 像素街机《午夜游戏厅》/ 剪纸拼贴《拼贴世界》/ 瑞士版式《少即是多》/ CRT 终端《终端唤醒》（沙画见 `styles/sand/`）。用户选定风格后按 `recipes/custom.md` 新建同风格项目；**已验证风格（沙画/粉笔/蓝图/霓虹/像素街机/剪纸拼贴/瑞士版式/CRT 终端）的第二部片直接从 `styles/` 拷库复用**（SPEC 硬契约+样张回归，见 `styles/README.md`），不再重建图元库。水墨风格未过关，暂不进入样张集（早期水墨工程仅留作笔触引擎经验参考，未随本仓分发）。

## 硬性原则
1. **原创**：画面全部代码绘制；B-roll/素材只能用免版权来源（Mixkit 等）并登记 MANIFEST；不得使用任何现有视频的帧或片段。**具象形体例外条款**：模型盲画复杂具象 path 一眼假（lessons 实锤），改用开源图标骨架（Iconify，MIT/Apache 优先、CC-BY 须署名登记 MANIFEST）经本片渲染管线两阶段呈现（勾线画入→铺沙填色）——骨架是"笔画"，绘制仍是代码。
2. **事实有出处**：画面与口播出现的每个数字、规格、认证、年份必须能找到出处（产品/品牌信息以用户提供的资料或官方页面为准，全部登记进调研文档）；调研没核实的不上画面（口播也不说）。
3. **品牌色纪律**：品牌主色只给「当前重点」（CTA、logo、关键数字、主角高光），大面积铺色必须给理由；用户没给色板就先要，要不到就用中性底 + 单一强调色，**禁止自造一套「看起来像品牌」的颜色体系**。

## 确认点（基准四点；生效口径 = 基准 + 所选配方 §确认点差异）
下面四条是**基准备照**。选定配方后，该配方「确认点差异」一节（如 `recipes/promo.md` §8）的改问法/合并/删除**优先生效**——按差异表执行，不要照基准备照死问。
1. **类型（配方）+ 时长 + 语言与字幕**：「这条片是什么类型（宣传片/广告/产品介绍/讲解/其它/自定义风格）？想做多长？语言与字幕：中文／英文／中文旁白+中英双语字幕？」——类型决定配方与画面结构，时长决定内容规模与建组数，语言与字幕决定 TTS、画面文字与 subs 渲染（`config.subs`：none/cn/bilingual）。时长档位与规模表见所选配方（promo 档位在 `recipes/promo.md`，explainer 档位沿用 anything2explainer）。（promo：语言默认中文不追问，改问品牌资产包有无。）
2. **口播稿/解说词定稿**（配音之前）：把 `script/narration.txt` 全文 + 章节划分 + 字数/预估时长贴给用户，问「这版文案可以吗」。定稿后帧号会被每个镜头硬编码，改一个字就要全片重对位——这是全流程最便宜的一次干预点。（promo 保留。）
3. **配音与 BGM 偏好**（配音之前）：「配音有没有偏好的 TTS？BGM 要不要、有没有指定曲目？」配音默认走云端 TTS 装配路线（见 `reference/workflow-orchestration.md` §7，中文/英文都支持，音质显著优于 edge-tts）；edge-tts（`tts_build.py` 默认中文 `zh-CN-YunxiNeural` +8%、英文 kokoro `am_liam`，`TTS_ENGINE=auto` 按解说词语言自动选）为无云端通道时的回退；BGM 默认免版权曲库并登记出处，用户自带曲目放 `public/assets/<slug>/`；「要不要 BGM」本身也要问——只要口播 + 音效也是合法答案。（promo：删除独立确认点，并入①一句话带过，BGM 必配。）
4. **前 30 秒样片**（G1 完工后、派其余各组之前）：`scripts/preview.sh 30` 渲前 30 秒给用户看，问「风格 / 字号 / 配音语速 / 节奏可以吗」。在这里改一次是 1 个组的成本，等整片渲完再改是全部组。（promo 改为前 5 秒：`scripts/preview.sh 5`。）**风格 bake-off（可选升级）**：配色/字体方向拿不准时，渲 2–3 套主题变体样片并排给用户挑（只换 palette/字体 token 不动骨架，借 vox-director 的 style bake-off）；变体成本=打样×N，风格已定不启用。

## 流程总览（调研 → 文案 → 分镜 → 并行建组 → 渲染 → QC → 修复）

执行编排用 **ZCode workflow 子代理**（workflow 脚本 `agent()` 派单、await 收结果），**不是** anything2explainer 的 tmux pane；阶段表、派单 prompt 模板、修复轮规则与渲染命令见 `reference/workflow-orchestration.md`。

- **阶段 0 建项目**：`template/scripts/new_project.sh <slug>`（单参默认落数据根 `A2V_DATA_ROOT`（环境变量，缺省为当前目录 `./`）下的 `<slug>`；想指定位置就传两参 `<目标目录> <slug>`。复制模板、npm install、tsc）。
- **阶段 1 调研**（1 个子代理）：按派单模板产出 `research/调研.md`（核心事实表/卖点清单/数字与比喻清单，每条带出处 URL）；**对标片单是必交产出**——按 `reference/opus55-cases.md` 翻外部 Opus 5.5 案例库，产出 3–5 条同型案例 + 每条可借的结构要点（库不在就跳过并在调研.md 标注，不阻塞）；确认点 ① 一并问掉。
- **阶段 2 文案与配音**（主脚本）：写 `script/narration.txt`（骨架与节拍没把握，先读 `reference/opus55-cases.md` 指向的 prompt-playbook）→ 确认点 ② → 确认点 ③（按所选配方 §确认点差异生效；promo 下 ③ 并入 ①）→ 配音默认走云端 TTS 装配路线（见 `reference/workflow-orchestration.md` §7；无云端通道时回退 `tts_build.py`）出配音 wav + `timeline.ts`/`subs.ts` → 有 BGM 的配方由主脚本**选免版权曲**下载为 `public/assets/<slug>/bgm.wav` 并登记出处（不要拖到渲染前）；核对成片时长落在用户要的区间（差 >15% 加/删句子重跑，不改语速硬凑）。定稿后不再改词。
- **阶段 3 分镜**（主脚本）：**分镜前必读 `reference/style-ledger.md`**——跨片反同质化按**维度分档**执行：风格锁定片锁死材质/调色板/幕底/图元语言（=风格本体），只变开场/转场/运镜/叙事节奏/声音；promo/explainer 五项全变——差异化声明一句话写进分镜表全局约束；主体风格未定时可先做**方向三选一**：提 3 个骨架级视觉方向（每个手法说得出「因为主体有什么」）+ 渲 4 张关键画面给用户选，选定再写分镜（借 guizang；与确认点④ bake-off 分工——方向三选一=骨架级前置分叉，bake-off=同骨架换皮肤）。骨架决策先引阶段 1「对标片单」——与配方默认骨架冲突时以对标结论为准、在分镜表注明；写 `script/storyboard_src.md` → `render_storyboard.py` → `分镜表.md`（帧区间/节拍/画面/动效/主角·尺寸/光 + 全局约束：闪烁白名单、高光时刻清单、运镜清单、事实清单）；改 `src/config.ts`。
- **阶段 4 覆盖层与图元**（主脚本）：按配方补 `src/ui.tsx` 图元与 `src/config.ts`，`scripts/still.sh Overlay 1,30,60 <项目根>/stills ovl` 看一眼（四参形态：Comp / 帧列表 / 输出目录 / tag，与 orchestration §3.1 的 still.sh 契约一致）。
- **阶段 5a 打样**（1 个子代理）：只派 G1 → 打样秒数按所选配方 §确认点差异（promo `scripts/preview.sh 5` / 基准 `preview.sh 30`）→ 确认点 ④（问法同样按配方差异）。
- **阶段 5b 并行建组**（N 个子代理，组数按配方时长档位，每波 3–4 个）：每组 5–7 镜头；边做边写盘、每镜头 ≥6 张 still 自检、30 帧测渲、BUILD_NOTES。
- **阶段 6 渲染**：`npx tsc --noEmit` → `VER=v1 scripts/render.sh` → 主脚本拼 contact sheet 通读 + `frame_metrics.py`，问题先于 QC 派修。
- **阶段 7 QC 与修复**：每章 1 个 QC 子代理 → 修复子代理（一个 agent 只修一到两组）→ v2 复验 → 小修 → v3。收线：高 0 / 中 0 / 低 ≤5。
- **阶段 8 交付**：`交付说明.md`（成片、配音与 BGM 来源、事实出处、质检结论、已知保留项）；新坑写回 `reference/lessons.md`。

## 数据去向（skill 目录零污染）
- **运行期产物一律进项目根（工作目录）**：工程、成片、fin_frames/stills、QC 报告、调研、验收帧、一次性审计报告……全部放 `<数据根>/<slug>/`（数据根 = 环境变量 `A2V_DATA_ROOT`，缺省当前目录；阶段 0 传两参时 = 显式指定的项目目录）。任何派单与修复轮不得把数据写进本 skill 目录。
- **skill 目录只放长期资产**：配方、参考文档、模板与脚本（含 `template/node_modules`——模板自身跑探针/冒烟要用的依赖）。唯一允许的写回是 `reference/lessons.md` 踩坑回填（阶段 8 纪律）。

## 关键文件
| 路径 | 作用 |
|---|---|
| `recipes/` | 配方文档：`explainer.md` / `promo.md` / `custom.md`（自定义视觉：图纸先行+图标骨架+三层混音）——分镜骨架、时长档位、审美与品牌色细则、质量标尺（类型定了先读对应配方）；promo §2.5=video-shotcraft 镜头卡抽卡条款（外部 skill，可选增强——环境里没有该卡库就跳过抽卡，动效词汇走 `reference/promo-style-guide.md` §转场词汇）、custom §11=外部风格库参考（借设计不借管线） |
| `reference/` | `workflow-orchestration.md` 多 agent 执行协议（派单总则/阶段表/构建与 QC 派单模板/修复轮规则/渲染与混音命令/音画对位终检/云端 TTS 装配/交付）；`lessons.md` 踩坑记录（首片后回填）；`style-ledger.md` 跨片反同质化台账（阶段 3 必读：维度分档差异化） |
| `styles/` | **已验证风格 SKU 正本**（8 个：sand/chalk/blueprint/neon + pixel-arcade/paper-collage/swiss-print/crt-terminal：图元库+SPEC 硬契约+sample.jpg 回归样张+纹理/字体）：同风格第二部片从这拷库开工（复用流程见 `styles/README.md`），新风格过验证后入库 |
| `reference/opus55-cases.md` | 外部资料库导读：Opus 5.5 案例库（1000+ 代码绘帧案例与逆向方法论；**对标片单是分镜骨架的第一依据**，借结构不借技术路线；何时读什么、缺失兜底） |
| `template/` | 可编译的 Remotion 4 项目（`src/common` 幕底/glitch/缓动/字幕/进度条、`src/ui.tsx` 图元与调色板、`src/fx.tsx` 光效/运镜、`src/recipes/` 配方引擎——`config.recipe` 经 `getActiveRecipe()` 切换调色板与覆盖层集合、`src/overlay` explainer 覆盖层族（片头章节卡 HUD 片尾）+ promo 组件族（钩子/卖点/证明/CTA/品牌条）、`src/shots/promo` 配方演示合成（组合 id `PromoDemo`，源文件 `Demo.tsx`）、`src/config.ts` 片子配置、`scripts/` 配音/分镜/still/测渲/样片/整片渲染/建项目/三层混音（mix_audio.py：旁白+BGM+程序音效，BGM 先 RMS 归一）+ 程序配乐/音效三脚本（score_gen.py 程序化原创配乐·段落=句边界 / make_sfx.py 原创动作音效集 / sfx_landmarks.py 音效 onset·peak 实测）、`public/fonts` 四款字体 + OFL 许可） |
