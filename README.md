# anything2video

把主题、文章或产品做成原创视频的 Agent Skill。包含调研、稿件、配音、分镜、代码动画、渲染、审片与修复流程，适配 ZCode、Claude Code、Codex 和 WorkBuddy 等具备文件与命令执行能力的助手。

**v2 的目标是可迁移、可复测的制作流程。** Skill 不改变模型权重，不承诺任意模型全面等价于 Opus，也不保证一次提示生成精品。代码承担精确文字、数字、图表和动画；经过审核的生成素材可以承担场景与材质，必须登记来源和披露。

English: A portable agent skill for producing researched, original code-composited videos with narration, shot contracts, deterministic rendering and measured quality evidence. Model capabilities and application support still need real validation.

## 快速开始

需要 Node.js、npm、uv、ffmpeg/ffprobe 和可用 Chromium。Remotion 相关包固定同版本，依赖与字体、素材各有许可。

```powershell
git clone https://github.com/2021291696/anything2video.git
cd anything2video
node scripts/doctor.mjs
node scripts/init.mjs D:/video-projects/my-video my-video
cd D:/video-projects/my-video
npm install
uv sync
npx remotion browser ensure
```

初始化器只建模板工程，不产生完整片子；拒绝覆盖非空目录，不自动暂存/提交。工程必须在skill外。浏览器可用环境变量 `BROWSER_EXECUTABLE` 指向已安装版本。

完整教程见[教学仓库](https://github.com/2021291696/anything2video-tutorial)。

## 作为 Skill 使用

- Claude Code：项目 `.claude/skills/anything2video/` 或用户 `~/.claude/skills/anything2video/`。
- Codex：项目 `.agents/skills/anything2video/` 或用户 `~/.agents/skills/anything2video/`。
- ZCode：按当前版本导入，用 `zcode skills list` 确认发现；旧dynamic workflow不是必需依赖。
- WorkBuddy桌面：本地skill包导入；CodeBuddy IDE/CLI项目用 `.codebuddy/skills/anything2video/`，入口依版本核对。

完整说明与验证等级见 [docs/adapters.md](docs/adapters.md)。包检查、工程渲染和应用端完整制作分别记录，安装指南不等于全平台实测认证。

给助手的起步任务：

```text
先完整阅读anything2video/SKILL.md和production-contract.md。
为初学者解释缓存命中与未命中，中文，原生竖屏，约2分钟。
每镜头有信息变化，文字和图解由代码负责。
我授权你选择视觉与音色。先看开场、复杂中段、结尾，至少三轮审片。
交付MP4、工程、字幕、封面、素材来源和ffprobe实测规格。
没有子代理就顺序完成，不跳过混音和QC。
```

## 配方与资产

讲知识：`recipes/explainer.md`；卖功能：`promo.md`；风格化叙事：`custom.md`；谱系/品牌历史：`epic.md`。旧配方里的宿主、授权、画幅和音频口径统一由 [production-contract](reference/production-contract.md) 覆盖。explainer参考已随仓库附在 `reference/explainer/`，不依赖本机另一个skill目录。

8个风格SKU：sand、chalk、blueprint、neon、pixel-arcade、paper-collage、swiss-print、crt-terminal。每个包含图元、SPEC和回归样张；同风格后续片优先复用。材质场景参考在 `reference/materials.md`，混合素材纪律在 `ai-frame-sop.md`。

历史代码样片见 [examples](examples/)。这些早期样片不代表全部新配方都纯代码；新片的素材模式以各自MANIFEST为准。

## 生产与验收

```text
调研 → 稿件与真实配音时间轴 → 结构化分镜 → 多点小样
     → 建镜头 → 混音与渲染 → 三轮验收修复 →  measured delivery
```

- `scripts/init.mjs`：安全复制纯模板，无自动git动作。
- `scripts/doctor.mjs`：本地命令检查；不验证账户或云端额度。
- `scripts/check-plan.mjs`：连续帧覆盖、空片、来源、文件和素材哈希；还需核对真实镜头注册与渲染。
- `scripts/render.mjs`：跨平台Node渲染，Composition规格与声明必须一致，保存ffprobe原始证据。
- `template/scripts/tts_build.py`：清洁旁白、句子时间轴与字幕。
- `template/scripts/mix_audio.py`：不可变旁白正本、可复测重混、音乐压低；默认不注入风格音效。
- `probe_av_sync.mjs`：纯旁白首句检查，最终媒体时长另测；不能代表全部字幕逐句对齐。
- `probe_delivery.py`：实际规格，交付说明不手写分辨率。

```powershell
npm run typecheck
node <skill>/scripts/check-plan.mjs <project>
node <skill>/scripts/render.mjs <project> preview 12
node <skill>/scripts/render.mjs <project> video
```

三轮分别看工程真实性、视觉与教学、反向挑错。真实运动片段必须包含开场、复杂中段与片尾，不能以类型检查或截图集代替整片审片。

横屏传统模板1280×720@30；竖屏目标1080×1920@30，需要重新布局和Composition，不是横屏放大。AI生成素材必须披露，发布平台的声明入口仍需使用。不存在“保证过审”规则。

## 回归验证

```powershell
node --test tests/runtime.test.mjs
cd template
uv sync
uv run python -m unittest discover -s tests -p test_audio_pipeline.py -v
npm install
npm run typecheck
```

测试覆盖连续/缺失镜头、来源合同、重复混音正本、声音刷新、音乐干扰、静音、损坏音频和真实错位。测试证明具体工程行为，不证明审美与跨模型等价。优化记录见 [docs/optimization-v2.md](docs/optimization-v2.md)。

## 许可与鸣谢

代码与文档 [MIT](LICENSE)。字体分别为SIL OFL，许可随文件分发。早期样例音乐署名见 [examples/README.md](examples/README.md)。新工程音乐与AI素材分别记录，不将独立音乐原文件打包公开分发。

explainer规范与本模板同源于 [anything2explainer](https://github.com/Vincentwei1021/anything2explainer)。参考案例仅用于学习手法；不随包分发他人视频或抽帧。本项目无 Anthropic、平台或其他工具官方合作关系。
