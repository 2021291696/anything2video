---
name: anything2video
description: Create original teaching videos, explainers, promotional films and brand films from a topic, article or product. Produce researched narration, shot plans, deterministic Remotion animation, licensed or disclosed generated assets, audio, rendered video and measured quality evidence. Works with ZCode, Claude Code, Codex and other agents with file and command access. 给主题、文章、产品生成原创教学视频、科普片、宣传片、品牌片，包含调研、分镜、代码动画、配音、审片和交付。
version: 2.0.0
author: 2021291696
description_zh: 从主题生成原创教学视频、宣传片与品牌片，包含分镜、配音、代码动画和验收。
description_en: Produce original teaching and promotional videos with researched scripts, deterministic animation and quality evidence.
---

# anything2video

把任意主题变成原创、可修复、可验收的视频工程。Skill提供导演和工程约束，模型仍负责理解、编码与判断；不能承诺一个Skill让任意模型等同于Opus，也不能承诺一次提示稳定出精品。

## 何时用

用户要教学、科普、文章改视频、产品宣传、风格动画或品牌片。主要画面由代码动画或代码合成构建，可按镜头加入有来源、经过审核的生成场景素材。以实拍采访为主、复制现有片子、真人口播剪辑不是本Skill主场。

## 先读什么

1. 完整读 `reference/production-contract.md`，它是跨工具、授权、画幅、音频与证据的统一权威；与历史配方冲突时优先。
2. 类型选配方：讲知识 `recipes/explainer.md`；卖功能 `recipes/promo.md`；风格化叙事 `recipes/custom.md`；讲谱系/历史 `recipes/epic.md`。先完整读所选配方。
3. 分镜前读 `reference/motion-language.md` 和 `reference/style-ledger.md`。explainer规范已随包附在 `reference/explainer/`，不依赖另一个本机skill。
4. 用AI世界底读 `reference/ai-frame-sop.md`；用已有风格读 `styles/README.md` 和对应SPEC。只加载本任务相关参考，避免全量文档压垮执行。
5. 按宿主读 `docs/adapters.md`。先检测真实能力，再选择并行或顺序，不假设ZCode workflow/tmux可用。

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

资料未明确时，一次收集受众、平台、语言、时长、学习目标、事实材料、预算与品牌约束。稿件、音色、样片、**音乐圈选**与**风格选择**是关键决策点；用户已授权自行决定时，由主控审定并记录，不重复等待。发布仅在已有授权范围执行，不顺带发布社交平台。三个不可豁免的用户决策点（工作目录/音乐/风格放映样片）见 `reference/production-contract.md`「能力与授权」。

## 流程

### 0 建工程

**首次使用先问用户片子放哪**（2026-10-04 定规）：根目录未知时必须问用户并把答案写入 `~/.anything2video/workdir` 持久化；此后工程一律落该根下 `<slug>/`，不散落、不静默用当前目录。`node scripts/doctor.mjs` 检查本地命令；`node scripts/init.mjs <slug>`（单参按持久化根）或 `node scripts/init.mjs <工程绝对路径> <slug>`。目标非空拒绝，不覆盖、不自动git add/commit；工程位于skill之外。进入工程 `npm install`、`uv sync`；渲染浏览器 `npx remotion browser ensure` 或 `BROWSER_EXECUTABLE`。锁文件与源码版本管理，缓存不入库。

### 1 调研

写事实表、出处、观众问题与一个结论。选3–5个有证据参考案例；案例库缺失则标明。借结构、材质、节奏和首尾呼应，不抄素材；候选视频总量不能声称全是已验证模型作品。

### 2 稿件、配音与节拍

稿件先服务学习目标，旁白一行一句，用 `|` 切短字幕。定稿后逐句合成或导入清洁配音，真实音频建立时间轴。优先可用且合格的云端TTS；不可用时明确回退。**音乐是用户硬决策点：要不要 BGM、选哪首，经 `reference/bgm-bakeoff.md` 试听页圈选后才进分镜与建组（先曲后片——曲落才出拍点网格/时长锚）；豁免出口仅「用户明说不要音乐」与「用户明说你选」两个，主控不得默认代选**；有音乐登记曲名/来源/许可并按声音节拍设计。TTS `uv run python scripts/tts_build.py`；混音 `uv run python scripts/mix_audio.py --bed 0.055`，沙音仅显式 `--sfx sand`。不用语速硬凑时长。

### 3 结构化分镜

`project.json` 声明 width/height/fps/totalFrames/composition/recipe。`script/storyboard.json` 列全部镜头 `{id,from,to,group,component,purpose,action}`、claims、assets，格式见统一合同。覆盖每帧、无洞重叠。清单存在不证明镜头挂载，必须核对注册表与实渲染。

每个镜头有信息变化、动作与结果。贯穿对象必须做事；章间可以有有意静止与呼吸，不强制每45帧乱动。复杂有机材质与精确图解分别分工，不能以装饰替代教学演示。

### 4 图纸与打样

图元、构图、安全区、贯穿对象与运动规则先定。已有风格复用 `styles/<sku>/`，按SPEC渲样张回归。新风格先建图元库。渲开场、一个复杂中段与结尾，检查字号、字幕遮挡、实际音色、节奏、素材三查。5秒开场通过不等于全片合格。

### 5 建镜头

并行仅用于独立文件所有权明确的组。派单包含全部分镜、共享API、全局/本地帧号规则、边界、验证命令。每组交镜头ID、源码、测试与未完成项。没有子代理就顺序做，质量不降级。主控整合，不把整个复杂任务转给执行代理。

### 6 渲染

`npm run typecheck`；`node <skill>/scripts/check-plan.mjs <工程>`；`node <skill>/scripts/render.mjs <工程> stills 1,90,...`、`preview 12`、`video`。统一Node渲染入口检查Composition与声明一致，并记录ffprobe。保留旧脚本作兼容工具，不用旧render.sh固定画幅口径覆盖project.json。

### 7 三轮验收与修复

A 工程真实性：覆盖/时间窗/素材/音画/规格/解码；B 视觉与教学：真实片段、因果、可读性、动作落点、素材伪影、听感；C 反向审查：最弱镜头、中后段、结尾、事实与发布说明。每轮记录发现、修改、重渲证据、保留项；阻塞缺陷未清零不交最终版。

性能同机热渲比较；主体/活性/空场探针需声明ROI、背景掩码、合法静止。不能默默跳过失败，也不能把无检查能力当通过。音画探针默认检查纯旁白首句，最终媒体时长另查，还需中段/末段对位。

### 8 交付与回写

成片、源码、配音、字幕、封面、事实来源、MANIFEST、QC、ffprobe规格。所有数字取真实文件，不手填1080p。运行产物留工程内；skill只放长期资产，真实新坑回写lessons。未测试的宿主应用明确标注，不能用打包成功代替应用端完整执行成功。

## 画幅与发布

横屏传统模板1280×720@30，竖屏目标1080×1920@30。竖屏必须新布局/Composition，不能横屏放大宣称完成；输出分辨率不提升素材原始细节。抖音保守安全区和字幕预算见统一合同，发布预览按实际设备复核。含合成配音/生成画面按当前发布界面启用适用AI声明；片内小字不能替代平台按钮。

## 资产与工具

8个风格SKU：sand/chalk/blueprint/neon/pixel-arcade/paper-collage/swiss-print/crt-terminal。**`samples/` 随包分发样片**（8 风格 SKU + promo/epic/explainer 三配方，各 6 秒真实成片段落，h264 720p）：风格/配方选择拿不准时先放映给用户看效果再定（用户硬决策点之一）。材质与混合镜头：materials、ai-frame-sop；史诗方法论：epic-brand-film。关键脚本：init、doctor、check-plan、render、tts_build、mix_audio、probe_av_sync、probe_delivery；Python用uv。`reference/workflow-orchestration.md` 保存历史派单与构建协议，跨宿主冲突以本入口和统一合同为准。

安装与能力边界见 `docs/adapters.md`。Skill需要执行环境，不能在纯聊天窗口凭空渲染MP4。
