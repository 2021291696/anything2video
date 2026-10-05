# 统一生产契约 v3

本文件与 production-workflow.md 覆盖历史配方和 explainer 快照中的宿主绑定、硬编码路径、画幅、效果配额、授权与验收规则；配方保留叙事和风格知识。冲突时按此契约，不让模型在矛盾指令间猜选。

## 能力与授权

Skill 是制作流程，不是模型权重。宿主至少需读写文件、运行 Node/uv/ffmpeg、安装依赖并查看图像；子代理、云端语音、图像模型是可选能力。先实测，不根据产品名字猜。ZCode workflow 的 `agent()`/`log()` 注入接口仅在该接口实际存在时使用，普通 CLI 无须伪造它。

用户指定“自行决策”“不计成本”“发布到某仓库”已提供对应授权。内部稿件与样片审定记录即可；不要重复等待用户确认。发布社交平台仍需相应授权。费用许可仅指本任务，不复制密钥到工程或 GitHub。

工作目录、音乐与风格是持久决策：根目录未知先询问并保存绝对路径到 `~/.anything2video/workdir`；明确给过路径则沿用。音乐默认按 bgm-bakeoff.md 试听圈选，用户明说无音乐或授权自行选曲时记录决定；泛泛预算许可不自动替代选曲许可。需要音乐时在分镜与建组前定曲。风格拿不准先放映随包 `samples/` 的真实片段；用户指定风格或已授权主控定方向时记录依据，不重复询问。

## 工程合同

工程位于 skill 外。初始化器拒绝非空目标，不执行 git add 或 commit。`project.json` 字段：schemaVersion、status（draft/production）、slug、width、height、fps、totalFrames、composition（默认 Video）、recipe。默认横屏 1280×720；原生竖屏 1080×1920。故意无声时额外声明 `audio: {mode: "silent"}`，有旁白作品不能用此字段掩盖丢失音轨。

初始化支持 `<slug>` 单参：数据根优先 `A2V_DATA_ROOT`，再读持久化文件；未知或相对根直接拒绝，不退回当前目录。也支持 `<工程绝对路径> <slug>`。工程顶层 renders/stills/fin_frames/qc 与依赖、音频缓存为保留产物位置，不放导入源码；源码与素材应放入被记录的项目位置。`src/build`、自定义 components 及普通 build/out/dist 目录仍是输入。

所有渲染模式都检查完整分镜、文件、素材哈希和 TypeScript。未完成全片时使用独立 draft 样片工程，准确声明该样片范围；正式工程保留完整计划和未完成项。初始化默认 draft，不是最终片。status 改为 production 后须重渲全片，状态变化也会改变源码哈希。

`script/storyboard.json` 示例：

```json
{
  "shots": [
    {"id":"S01","from":1,"to":180,"group":"G1","component":"src/shots/Intro.tsx","purpose":"建立问题","action":"光标选择视频生产链"}
  ],
  "claims": [{"text":"工程可逐帧渲染","source":"https://www.remotion.dev/docs/"}],
  "assets": []
}
```

镜头表 1 起含端点，覆盖每帧，无洞无重叠。Remotion frame 0 起；`Sequence from = shot.from - 1`，duration = to-from+1，本地帧加 shot.from 转全局 N。清单存在不证明镜头真的挂载：必须核对注册表并实渲染。

字幕、指示线与对象应说明同一个因果关系。镜头合同必须包含 purpose 和 action，禁止以“文字入场”代替全部镜头设计。默认不要求每 45 帧乱动：有意静止与持续环境镜头可以成立，需记录具体理由。

## 竖屏

1080×1920 片建议关键信息 x80–900、y180–1500，字幕 y1400–1570；底部约350px和右侧约160px不放必要信息。这是保守制作区，**不是抖音官方固定UI尺寸**，发布前依实际预览复核。中文正文建议至少42px，字幕48–56px，每行约12–16字；命令分段显示，不能缩到不可读。封面需独立测试方形裁切。

## 素材与参考片

各配方都可按镜头使用混合素材：代码做精确信息，已审过的生成图像做材质或场景。需要叙事理由，不能用历史器物填满软件教程。每条登记文件/sha256/来源/许可/用途；AI追加模型、完整提示词、seed或n/a、披露与三查结论。普通 API 使用条款不等于素材独占著作权，不写“免版权”。

分镜排布 AI 生成素材前必须先确认图像通道：doctor 的 `imageChannel` 报告、宿主实测图像生成、已有手工素材三者有其一。三者皆无时不得把镜头设计成依赖 AI 生成，世界层改走程序材质路线——通道缺失要在分镜阶段暴露并改道，不能留到生成阶段才发现。

结构化 assets 记录 `{path, sha256, source, license, usage, ai}`，sha256 为完整64位；AI 再加 `{model,prompt,seed,disclosure,qc:{textFree,geometry,continuity}}`。三查分别记录 passed/failed/not_performed，尚未审核必须 not_performed。草稿可带待审素材，最终三项必须 passed；不能以 pending 或一句“已检查”冒充。生成脚本输出 MANIFEST.json，主控审核后纳入 storyboard.assets，未实际使用的候选不算成片资产。品牌、字体和声音同样登记来源与授权。

参考片只借结构、材质、运动与首尾呼应，不拿抽帧拼片。观察到“像AI”只能写推测，不声明其官方制作技术或比例。案例库候选总量不等于已核实原创模型作品数。

## 音频

TTS 先产出清洁 `audio_narration.wav`，再派生 `audio.wav`；只在显式旁白更新时换正本。混音不能靠修改时间猜来源。相同输入重混应该字节一致，正本哈希不变。背景音乐按「能力与授权」的持久决策执行：有音乐时先试听圈选；用户明说无音乐或授权自行选曲时登记决定，不重复等待。铺沙/扫掠等风格音效必须显式选择；语音段压低音乐，结尾淡出。检查 peak、静音、总时长、听感；响度目标须实测而不是“RMS=某值所以已经达标”。

TTS/mix 从 project.json 读取 slug/fps；config slug 不一致须迁移后重跑。TTS 同步 totalFrames，已存在旁白正本仅 --force 可更新。缺项目文件的旧工程仅显式 --legacy-config --fps <整数> 可迁移；所有输入、缓存、输出经过工程内真实路径检查，不能用穿越 slug、junction 或单文件链接写出工程。

音画 probe 用 raw 旁白检测首句，不把 BGM 开口当语音。首句 onset 检测只验证首句，不能证明整段字幕正确；还要抽查中段/末段并核对最终音轨起点与时长。

## 三轮证据

1. 工程轮：类型检查、全镜头覆盖、素材存在、音画、输出规格、解码错误。空组与空句不能假通过。
2. 导演轮：开场、中段复杂演示、结尾真实运动片段；字幕遮挡、文字清晰、画面是否承载解释、转场是否连续、素材伪影、声音自然度。
3. 反向轮：先挑最弱镜头，检查数字/出处/承诺/发布标签；复验修复过的场景，防止修一处坏另一处。

每轮记录具体缺陷与真实重渲结果。probe阈值只适用于已声明 ROI/风格背景；性能用同机热渲比较，允许有记录的审美静止。不能默默跳过失败探针，也不能把“无能力检查”算通过。

阻塞缺陷未清零，不交付最终版。交付包含视频、可复现源码、配音与字幕、封面、素材及来源清单、QC和ffprobe原始数据。单独记录未测试的宿主适配能力，不笼统写“全平台已验证”。

## 最终 QC 数据合同

render.mjs 为每个媒体写 `.delivery.json`：schemaVersion=1、mediaSha256、sourceHashes、mode、1起含端点的 frames、renderedAt、原始 ffprobe，visualReview/audioReview 默认 not_performed。不编辑此记录来掩盖旧渲染。sourceHashes 扫描项目真实输入，含 src/script/scripts/public、自定义源码根、配置与锁文件；只排除保留产物和缓存。已注册镜头若位于排除位置会拒绝；变动就须重新渲染。

`qc/final.json` 使用以下结构，示例只展示一个检查，其余七项必须分别给真实证据，不能复制示例当审片结果：

```json
{
  "schemaVersion": 1,
  "media": "renders/demo_v1.mp4",
  "mediaSha256": "实际成片完整64位SHA256",
  "blockingDefects": [],
  "checks": [{
    "id": "motion",
    "status": "not_performed",
    "reviewer": "实际审片者",
    "tool": "实际工具",
    "method": "playback",
    "frames": {"from": 1, "to": 1800},
    "notes": "实际观察结果和已处理缺陷",
    "evidence": [{"path": "qc/motion.md", "sha256": "证据文件完整64位SHA256"}]
  }]
}
```

必需 ID：technical（规格/解码/音画探针）、registration（所有镜头真实挂载）、sources（事实和许可）、visual（可读性/遮挡/素材）、motion（完整真实运动）、teaching（任务与因果演示）、audio（完整听取）、platform（实际目标画幅和发布说明）。全部范围为1..totalFrames，status 必须 passed，reviewer/tool/method/notes 非空，证据文件在工程内且哈希匹配。motion/audio 必须 method=playback；静音作品也记录完整播放无音轨是有意设计。

`node <skill>/scripts/check-qc.mjs <工程> qc/final.json` 独立运行 ffprobe 计帧、ffmpeg 全片解码，核对完整视频模式、规格、媒体、源码、审核状态与证据哈希，拒绝草稿、片段、旧证据和未审素材。通过仅表示技术和审查声明完整，不能证明人真的看过、听过或艺术质量优秀。不得自动把声明填成 passed。证据记录必须包含实际观察范围与问题。

## 发布

抖音：实际含AI生成画面/合成配音时，按当期发布界面启用适用AI声明并保留相关标识。视频内小字说明不能代替平台按钮。不提供账户交易、地域绕行或过审保证。标题写“替代Opus做视频的流程”，避免未经测试的全面模型等价。

X：提供长文与可拆线程，不假设所有账号都能发Articles；以账号界面权限为准。GitHub：只发授权仓库，保留许可证和上游署名；不得上传密钥、参考片、带隐私的日志或运行缓存。
