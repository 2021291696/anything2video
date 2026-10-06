---
name: anything2video
description: Create original teaching videos, explainers, promotional films and brand films from a topic, article or product. Produce researched narration, shot plans, deterministic Remotion animation, licensed or disclosed generated assets, audio, rendered video and measured quality evidence. Works with ZCode, Claude Code, Codex and other agents with file and command access. 给主题、文章、产品生成原创教学视频、科普片、宣传片、品牌片，包含调研、分镜、代码动画、配音、审片和交付。
metadata:
  version: "3.7.1"
---

# anything2video

把任意主题变成原创、可修复、可验收的视频工程。Skill提供导演和工程约束，模型仍负责理解、编码与判断；不能承诺一个Skill让任意模型等同于Opus，也不能承诺一次提示稳定出精品。

## 何时用

用户要教学、科普、文章改视频、产品宣传、风格动画或品牌片。主要画面由代码动画或代码合成构建，可按镜头加入有来源、经过审核的生成场景素材。以实拍采访为主、复制现有片子、真人口播剪辑不是本Skill主场。

## 先读什么

1. 完整读 `reference/production-contract.md` 和 `reference/production-workflow.md`：它们是跨宿主的工程与验收权威。
2. 套餐卡定配方：宣传卡读 `recipes/promo.md`，讲解卡读 `recipes/explainer.md`，史诗卡读 `recipes/epic.md`；点名风格+类型自由组合时按需读 `recipes/custom.md`。先完整读所选配方。
3. 分镜前读 `reference/directing-playbook.md`。需要动作设计时读 `reference/motion-language.md`，并到 `gallery/` 按镜头抽配方卡（157 张，用法见 `gallery/README.md`，卡的参数表与判例优先于直觉）；连续做片时读 `reference/style-ledger.md`。历史 `reference/explainer/` 是特定黑底MG风格的上游快照，固定画幅、效果配额、确认点和宿主指令不覆盖共享契约。
4. 用AI世界底读 `reference/ai-frame-sop.md`；用已有风格读 `styles/README.md` 和对应SPEC。只加载本任务相关参考，避免全量文档压垮执行。
5. 按宿主读 `docs/adapters.md`。重点支持豆包工作、WorkBuddy、Claude Code、Codex四个独立入口，另保留ZCode与MiniMax Code；桌面接入依据见 `reference/desktop-hosts.md`。先检测真实能力，再选择并行或顺序，不假设ZCode workflow/tmux可用。

## 硬性原则

- 原创叙事、构图和运动。参考片仅分析结构，不拿其帧或片段作成片素材。
- 精确信息由代码负责：文字、数字、图表、流程、字幕、标识。AI可提供有需要的材质/场景底；各配方按镜头声明模型、完整提示词、许可、来源、哈希与披露。不把混合合成写成纯代码或免版权。
- 事实可追溯到官方页面、用户资料或可复测本地证据。参考片生成方式的视觉推测不能称官方已确认事实。
- 品牌色只用于明确重点；用户未给品牌体系时用中性底和明确的强调色，不能编造品牌资产。
- 音频正本 `audio_narration.wav` 不可变；`audio.wav`是派生混音。禁止mtime猜正本，禁止将混音再当旁白。
- 动画 seeded、逐帧可复现；镜头合同1起含端点，Remotion frame/Sequence 0起，一次且仅一次转换。
- 探针只证明所测项。审美和教学需要查看真实运动片段与整片，截图集或日志不能替代。
- 不承诺零成本、必过审、全面模型替代或官方关系。素材、依赖、字体、声音的许可分别核对。

## 确认与授权

开工前**单问套餐定盘**（套餐制 v3.4.0，用户拍板 2026-10-06）：放映 `samples/index.html` 套餐池挑一张卡——每张卡 = 类型+风格完整决定（宣传 4 / 讲解 5 / 史诗 2）。**卡赢为默认**；卡类型或卡上 ⚠ 判例注与用户显式需求冲突时，开工前一句话确认，不得静默越过。用户点名风格+类型自由组合走后门（`config.style` 机制不变）。选卡结果（卡名+机器 ID）记入工程 `research/creative-brief.md` 成持久决策，同系列沿用时记"沿用"不再问。**选型先查 `reference/style-ledger.md`**：口味锚与既有判例优先于主题隐喻推理。

资料未明确时，一次收集受众、平台、语言、时长、学习目标、事实材料、预算与品牌约束。稿件、音色、音乐是关键决策点（风格已由套餐选卡覆盖）；遵循已有授权和持久偏好，由实际决策者审定并记录，不重复等待。音乐按 bgm-bakeoff.md 试听圈选，明确无音乐或授权自行选曲时记录。发布仅在已有授权范围执行，不顺带发布社交平台。

## 流程

### 0 建工程

根目录未知先问用户片子放哪，把绝对路径保存到 `~/.anything2video/workdir`；已指定就沿用。首次使用同一轮加问图像生成通道（可选，持久决策，口径见统一合同「能力与授权」）：有没有生图 API key（MiniMax 或任意 OpenAI 兼容接口）——用途是 AI 材质/世界底生图，**只影响约 5%–10% 的画面效果，不填不影响出片**；决定记入 `~/.anything2video/image-channel`（provider 名或 `none`），key 本身只进环境变量不落盘。`node scripts/doctor.mjs` 检查本地命令与图像通道状态；`node scripts/init.mjs <slug>` 沿 `A2V_DATA_ROOT` 或持久目录建工程，也可显式 `<工程绝对路径> <slug>`。未知根不退回当前目录。目标非空拒绝，不覆盖、不自动git add/commit；工程位于skill之外。进入工程 `npm install`、`uv sync`；渲染浏览器 `npx remotion browser ensure` 或 `BROWSER_EXECUTABLE`。锁文件与源码版本管理，缓存不入库。

### 1 调研

写事实表、出处、观众问题与一个结论。选3–5个有证据参考案例；案例库缺失则标明。**有对标参考片先跑拆解**：`uv run scripts/reference_breakdown.py --video 参考.mp4 --out <工程>/research/reference-breakdown/`（接触表/转场节奏网格/运动热图/参考帧一条命令出齐，读法与证据边界见 `reference/reference-breakdown.md`）——转场节奏进 beat sheet 对标，运动热图决定每镜「什么在动」，参考帧只当生成构图输入。借结构、材质、节奏和首尾呼应，不抄素材；候选视频总量不能声称全是已验证模型作品。

### 2 稿件、配音与节拍

稿件先服务学习目标，旁白一行一句，用 `|` 切短字幕。定稿后逐句合成或导入清洁配音，真实音频建立时间轴。优先可用且合格的云端TTS；不可用时明确回退。需要音乐时先按 `reference/bgm-bakeoff.md` 定曲，再进分镜与建组；登记无音乐决定或曲名/来源/许可。TTS `uv run python scripts/tts_build.py`；混音 `uv run python scripts/mix_audio.py --bed 0.055`，沙音仅显式 `--sfx sand`；钉帧音效在混音之后第三步 `uv run python scripts/mix_sfx.py`（cues 表 + `audio/sfx/sfx-mix.json` 台账，通用 SFX 通道，工具防双混；判例见 `reference/sound-design.md` §4）。音效从 `assets/audio/sfx/` 16 类里选（149 个，Mixkit 免费商用，逐文件 URL 见 `assets/audio/ATTRIBUTION.md`；类别索引、钉帧与防机枪感判例见 `reference/sound-design.md`，风格绑定拟音与 in-key SFX 走 `audio-engine/mgaudio`）。强节奏配乐的卡点编排按 `reference/music-beat-sync.md`。分镜定稿同时产出 `research/beat-sheet.json` 节拍表：钩子 0.5s 内出现、hero moment 落位 60–75%、结尾定帧 0.8–1.2s 带微动效；程序编曲以它为合同、曲库曲以实测 beat_grid 为真值，分工见统一合同。不用语速硬凑时长。

### 3 结构化分镜

`project.json` 声明 width/height/fps/totalFrames/composition/recipe。`script/storyboard.json` 列全部镜头 `{id,from,to,group,component,purpose,action}`、claims、assets，格式见统一合同。覆盖每帧、无洞重叠。每个有动效的镜头从 `gallery/cards/` 对应类别抽卡对标，卡名记入镜头；分镜只定"用哪张卡、何时、讲什么"，参数实现阶段照卡执行。清单存在不证明镜头挂载，必须核对注册表与实渲染。排布 AI 生成素材前先确认图像通道（doctor `imageChannel`；无通道禁排依赖生成的 AI 镜头，见统一合同）。

每个镜头有信息变化、动作与结果。贯穿对象必须做事；章间可以有有意静止与呼吸，不强制每45帧乱动。复杂有机材质与精确图解分别分工，不能以装饰替代教学演示。

初始化工程默认为 `status: draft`。尚未建完全片时，在包外独立草稿工程声明完整样片帧数和镜头，再跑同样门禁；不能删掉主工程未完成镜头来伪装全片完成。正式渲染前将主工程改为 `production`，状态变化也要求重渲。

### 4 图纸与打样

图元、构图、安全区、贯穿对象与运动规则先定。已有风格复用 `styles/<sku>/`，按SPEC渲样张回归。新风格先建图元库。渲开场、一个复杂中段与结尾，检查字号、字幕遮挡、实际音色、节奏、素材三查。5秒开场通过不等于全片合格。

### 5 建镜头

并行仅用于独立文件所有权明确的组。派单包含全部分镜、共享API、全局/本地帧号规则、边界、验证命令、各镜头所抽配方卡路径（`gallery/cards/…`，参数表/调节手感/判例照卡执行，参考源码在 `gallery/demos-ref/`）。每组交镜头ID、源码、测试与未完成项。没有子代理就顺序做，质量不降级。主控整合，不把整个复杂任务转给执行代理。

### 6 渲染

`npm run typecheck`；`node <skill>/scripts/check-plan.mjs <工程>`；`node <skill>/scripts/render.mjs <工程> stills 1,90,...`、`preview 12`、`video`。统一Node渲染入口检查Composition与声明一致，并记录ffprobe。保留旧脚本作兼容工具，不用旧render.sh固定画幅口径覆盖project.json。

### 7 三轮验收与修复

A 工程真实性：覆盖/时间窗/素材/音画/规格/解码；运动连续性加采 `uv run scripts/probe_motion_quality.py <成片>`（运动面积/静止帧对/孤立跳变/最长静止＋跳变证据拼图；数字是线索，合法静止按 beat sheet 豁免登记定性，判读口径见 `directing-playbook.md`）。B 视觉与教学：真实片段、因果、可读性、动作落点、素材伪影、听感；C 反向审查：最弱镜头、中后段、结尾、事实与发布说明（数字口径三条判例见 directing-playbook）。每轮记录发现、修改、重渲证据、保留项；阻塞缺陷未清零不交最终版。新门禁/探针上线时故意制造一次它要抓的失败确认会红（统一合同「验收工具也要被验收」）。

性能同机热渲比较；主体/活性/空场探针需声明ROI、背景掩码、合法静止。不能默默跳过失败，也不能把无检查能力当通过。音画探针默认检查纯旁白首句，最终媒体时长另查，还需中段/末段对位。

三轮通过后加 D 轮独立评分评审（`reference/jury-review.md`，2026-10-06 轴 A）：独立会话评委按 7 维锚点评分（风格保真/概念惊艳/动效工艺/设计版式/质感收尾/声音同步/技术），任一维度 <7 阻塞、修复后复审，≥8 不设硬门，修复轮上限 3 轮；产出 `qc/jury.json` 进交付证据链，`check-qc` 门禁照旧。

### 8 交付与回写

成片、源码、配音、字幕、封面、事实来源、MANIFEST、QC、ffprobe规格。所有数字取真实文件，不手填1080p。运行产物留工程内；skill只放长期资产。**回写双轨**（v3.6.0）：坑当天回写 `reference/lessons.md` 历史表（现象→根因→判据/修法）；做对了的事回写 lessons「正面经验」节（做法＋证据＋为什么＋何时用，含跨栈借用的复验转正）；归宿表在 lessons 头部——风格/卡特有问题改对应 SPEC 或 gallery 卡、导演方法进 directing-playbook、可量化判据进探针与门禁、流程缺口进编排协议。实际与文档不符时以实际为准，然后把文档改对。未测试的宿主应用明确标注，不能用打包成功代替应用端完整执行成功。

render 写媒体 SHA256、源码哈希清单与实际帧范围的 `.delivery.json`，其中视觉/音频默认 not_performed。实际整片播放与听取后，按统一契约写 `qc/final.json` 并运行 `node <skill>/scripts/check-qc.mjs <工程> qc/final.json`。它拒绝草稿、片段、待审AI素材、缺项和旧证据；通过只证明技术与声明完整，不证明审美（审美维度由 D 轮 jury 评分承担）。交付报告附七维自评与自陈三弱点。媒体或源码变化使旧证据失效，不能自动填 passed。

## 画幅与发布

横屏传统模板1280×720@30，竖屏目标1080×1920@30。竖屏必须新布局/Composition，不能横屏放大宣称完成；输出分辨率不提升素材原始细节。抖音保守安全区和字幕预算见统一合同；**烧字幕前对无字幕版成片跑 `uv run scripts/probe_subtitle_band.py <成片> --band-ratio 0.73` 查画面内容侵入字幕带**（命中看帧定性，设计内元素登记豁免），发布预览按实际设备复核。含合成配音/生成画面按当前发布界面启用适用AI声明；片内小字不能替代平台按钮。

## 资产与工具

套餐池 19 张（套餐制 v3.5.0：卡=类型+风格，画幅是卡属性非第三筛选轴，单问一次定盘）：v3.4.0 十一卡——深空 deep-space / 夜航 mg-purple / 神话 epic-paper / 沙画 sand / 黑板 chalk / 蓝图 blueprint / 霓虹 neon / 街机 pixel-arcade / 拼贴 paper-collage / 版式 swiss-print / 终端 crt-terminal；v3.5.0 八新卡——月窗 guofeng-scroll（史诗）/ 贴纸人 paperclip-sticker（讲解）/ 花字 hanazi-916（讲解，9:16 卡属性）/ 线条 line-art（讲解）/ 等轴 isometric-city（宣传）/ 玻璃 aurora-glass（宣传）/ 液态 liquid-flow（宣传）/ 形变 morph（宣传）（新旧名映射见 `reference/style-ledger.md`，新卡 SPEC/kit 在 `styles/<sku>/`，样片 manifest 见 `samples/manifest.json`）。工程 `config.style` 浅合并覆写配方 palette/chrome——字幕/进度条/结尾机身件自动随风格换皮（qr-scan 2026-10-06"风格脱离"判例的制度化）。动效词汇：`gallery/` 157 张配方卡 + demo 参考源码（移植自 video-shotcraft，Apache-2.0，见 `gallery/README.md`）；可编组件 `template/src/common/kit/`（PageCam 2.5D 运镜、DigitRoll 数字滚、FlashCut 闪切、VerticalTicker 滚动墙、lagged/dampedSettle/mulberry32）。审美判例 `reference/aesthetic-rules.md`。风格拿不准先放映随包 `samples/` 真实片段，来源和披露见 samples/README.md；样片不是当前宿主端到端认证。材质与混合镜头：materials、ai-frame-sop（一帧先行四路线与首尾同帧图生视频见其 §2.5）；参考片拆解：reference-breakdown + `scripts/reference_breakdown.py`；史诗方法论：epic-brand-film（🔥 市面爆款风向，热门向优先）。关键脚本：init、doctor、check-plan、render、tts_build、mix_audio、mix_sfx、probe_av_sync、probe_delivery、bgm_generate（程序编曲，底层 `audio-engine/mgaudio`，MIT+CC0 vendor 自 mg-styles-15，溯源与依赖见 `audio-engine/VENDOR.md`）、reference_breakdown / probe_motion_quality / probe_subtitle_band（v3.6.0 移植自 huashu-art-motion，MIT，许可见 `LICENSE-THIRDPARTY/MIT-huashu-art-motion.txt`；Python 脚本均 PEP 723 内联依赖，用 `uv run scripts/<名>.py` 脚本模式运行）；Python用uv。程序编曲与曲库双通道圈选见 `reference/bgm-bakeoff.md` 程序编曲通道节；风格绑定 SFX 见 `reference/sound-design.md` §3.5；D 轮评审见 `reference/jury-review.md`。`reference/workflow-orchestration.md` 保存历史派单与构建协议，跨宿主冲突以本入口和统一合同为准。

安装与能力边界见 `docs/adapters.md`。Skill需要执行环境，不能在纯聊天窗口凭空渲染MP4。
