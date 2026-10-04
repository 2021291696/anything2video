# anything2video

把主题、文章或产品做成原创视频的 Agent Skill。包含调研、稿件、配音、分镜、代码动画、渲染、审片与修复流程，适配 ZCode、Claude Code、Codex 和 WorkBuddy 等具备文件与命令执行能力的助手。

**v3 提供 Claude Code、ZCode、Codex、MiniMax Code 四份专属版。** 各自适配加载与编排，共用相同的配方、图元、模板和生产脚本。导演方法、原生画幅、多点打样与证据门禁帮助稳定制作；Skill 不改变模型权重，不承诺全面等价于 Opus 或一次提示生成精品。代码承担精确信息，审核后的生成素材承担场景，逐件登记来源和披露。

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

也支持 `node scripts/init.mjs <slug>`：根目录优先 A2V_DATA_ROOT，再读 ~/.anything2video/workdir 的绝对路径；未知时先询问，不默默落在当前目录。音乐默认试听圈选，已指定无音乐或授权选曲则记录决定；风格拿不准先看 [离线视觉样片](samples/index.html)。

完整教程见[教学仓库](https://github.com/2021291696/anything2video-tutorial)。

## 作为 Skill 使用

```powershell
node scripts/install.mjs claude-code
node scripts/install.mjs zcode
node scripts/install.mjs codex
node scripts/install.mjs minimax-code
```

默认用户级安装，已有目录会被保护，更新先备份。前三种可追加项目根参数；MiniMax 可用 `--data-dir <真实DATA_DIR>`，不要传 skills 子目录。

- Claude Code：`.claude/skills/anything2video-claude-code/`，新会话 `/anything2video-claude-code`。
- Codex：`.agents/skills/anything2video-codex/`，新会话 `$anything2video-codex`。
- ZCode：`.agents/skills/anything2video-zcode/`，用 `zcode skills list --json` 核对实际路径；普通 CLI 和可选 workflow 均可。
- MiniMax Code：`{{DATA_DIR}}/skills/anything2video-minimax-code/`，下一会话原生 skill 加载核对 Location。
- WorkBuddy桌面：本地skill包导入；CodeBuddy IDE/CLI项目用 `.codebuddy/skills/anything2video/`，入口依版本核对。

[Releases](https://github.com/2021291696/anything2video/releases) 提供四份完整 ZIP，可脱离原仓库初始化工程。自建：`node scripts/build-editions.mjs <仓库外输出目录>`。每包 edition.json 保存入口哈希和公共核心清单，四包公共文件 SHA256 一致。原 generic 版与已有链接保留。

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

四个独立包均附11段6秒无音轨视觉预览，来源/许可与AI披露见 [samples/README.md](samples/README.md)。它们是历史风格参考，不是四宿主当前端到端认证。原生竖屏接线见 [portrait-wiring](reference/portrait-wiring.md)。

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
- `scripts/check-qc.mjs`：拒绝草稿、片段、未审素材、缺项和旧媒体/源码证据，独立计帧与全片解码；不自动证明艺术质量或实际观看。
- [导演手册](reference/directing-playbook.md) 与 [生产流程](reference/production-workflow.md)：原因/动作/结果、多点打样、根因修复及真实完整审片。
- `template/scripts/tts_build.py`：按 project.json 的 slug/fps 生成清洁旁白、时间轴与字幕，同步 totalFrames；旧正本需 --force 才能更新。音频路径逃逸和 config 不一致会拒绝。
- `template/scripts/mix_audio.py`：不可变旁白正本、可复测重混、音乐压低；默认不注入风格音效。
- `probe_av_sync.mjs`：纯旁白首句检查，最终媒体时长另测；不能代表全部字幕逐句对齐。
- `probe_delivery.py`：实际规格，交付说明不手写分辨率。

```powershell
npm run typecheck
node <skill>/scripts/check-plan.mjs <project>
node <skill>/scripts/render.mjs <project> preview 12 <1起开始帧>
node <skill>/scripts/render.mjs <project> video
node <skill>/scripts/check-qc.mjs <project> qc/final.json
```

三轮分别看工程真实性、视觉与教学、反向挑错。真实运动片段必须包含开场、复杂中段与片尾，不能以类型检查或截图集代替整片审片。

初始化是 draft。正式前改 project.status 为 production 再重渲。媒体 sidecar 记录媒体/源码全 SHA256 和帧范围，视觉/声音默认 not_performed；实际完整播放与听取后才填 QC。源码、字幕、音频或素材变化都会使旧证据失效。

横屏传统模板1280×720@30；竖屏目标1080×1920@30，需要重新布局和Composition，不是横屏放大。AI生成素材必须披露，发布平台的声明入口仍需使用。不存在“保证过审”规则。

## 回归验证

```powershell
node --test tests/runtime.test.mjs tests/editions.test.mjs tests/qc.test.mjs
cd template
uv sync
uv run python -m unittest discover -s tests -v
npm install
npm run typecheck
```

测试覆盖运行时、独立包、证据新鲜性、音频正本、真实错位、章表和生成素材合同。测试证明具体工程行为，不证明审美与跨模型等价。优化与实际验证范围见 [v3报告](docs/optimization-v3.md)，历史 [v2报告](docs/optimization-v2.md) 保留。

## 许可与鸣谢

代码与文档 [MIT](LICENSE)。字体分别为SIL OFL，许可随文件分发。早期样例音乐署名见 [examples/README.md](examples/README.md)。新工程音乐与AI素材分别记录，不将独立音乐原文件打包公开分发。

explainer规范与本模板同源于 [anything2explainer](https://github.com/Vincentwei1021/anything2explainer)。参考案例仅用于学习手法；不随包分发他人视频或抽帧。本项目无 Anthropic、平台或其他工具官方合作关系。
