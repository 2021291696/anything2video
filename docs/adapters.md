# 六端专属版安装与执行

同一包提供 SKILL.md、recipes、reference、styles、template、scripts。宿主差异限于加载与编排；事实、素材、音频、审片和交付规则完全共用。适配成功不能推导成模型质量一致。

v3.1 专属名称为 anything2video-doubao-work、anything2video-workbuddy、anything2video-claude-code、anything2video-codex、anything2video-zcode、anything2video-minimax-code，各包 `edition.json` 记录入口和公共核心完整 SHA256。公共核心一致、入口适配不同，不声称模型表现一致。豆包工作、WorkBuddy、Claude Code、Codex 为重点平台，ZCode 与 MiniMax Code 继续保留。

从仓库或对应完整独立包运行 `node scripts/install.mjs claude-code|zcode|codex|minimax-code`。默认用户级安装；前三种可加项目根参数。目标存在会被保护，更新前备份并核对。MiniMax 可 `--data-dir <真实DATA_DIR>`，不要传 skills 子目录。豆包工作与 WorkBuddy 运行 `node scripts/install.mjs doubao-work|workbuddy --export-dir <导出根目录>` 得到完整包供手工导入；导出不写宿主配置，也不代表应用已发现。原 generic 目录和已有链接保留。

## ZCode

专属包正本在 `~/.agents/skills/anything2video-zcode`；generic 仍在原目录。用 `zcode skills list --json` 核对实际路径；有版本发现 `.zcode/skills` 或设置页导入，以随包 configuration-guide 和本机 help 为准。用户同名项可能遮盖项目项。普通 headless `zcode -p "完整阅读指定SKILL.md并执行" --cwd <工程>`；旧 dynamic workflow 可选，真实 API 存在才用，不要求每个版本都有注入函数。不同模型的图片/MP4/音频能力分别实测。

## Claude Code

项目 `.claude/skills/anything2video-claude-code/`，用户 `~/.claude/skills/anything2video-claude-code/`，完整保留资产。新会话 `/anything2video-claude-code <主题和平台>` 或给入口绝对路径。文件/shell/媒体工具与子代理按当前会话提供的能力执行；每组指定所有权、分镜与验收。headless 普通 `claude -p` 具体 flags 看本机 help，不默认绕过权限。依据：[官方 Skills](https://code.claude.com/docs/en/skills)。

## Codex

项目 `.agents/skills/anything2video-codex/`，用户 `~/.agents/skills/anything2video-codex/`。已有 `.codex/skills` 链接可保留且核对正本。使用 `$anything2video-codex <任务>` 或入口绝对路径，新会话核对发现。CLI `codex exec` 参数以 help 为准；桌面媒体工具按当前会话实测，不套 ZCode workflow/tmux。主控负责设计、整合与审片。依据：[官方 Skills](https://developers.openai.com/codex/skills/)。

## MiniMax Code

全局 `{{DATA_DIR}}/skills/anything2video-minimax-code/`，代理私有 `{{DATA_DIR}}/agents/<agent>/skills/<name>/`。默认常见 DATA_DIR=~/.minimax，以运行应用为准。下一会话查 available_skills，再调用原生 `skill({name: "anything2video-minimax-code"})` 核对 Location；不需要为了 skill 更新重启 local-runtime。依据是随应用 mavis 的 skill-management.md，它明确没有 skill CLI。不发明 minimax -p，不把 mcode-tools connector 当编码CLI。task/task_append/task_output 只在工具表实际提供时使用；多模态和图像/语音服务分别实测。

## WorkBuddy（重点平台）

专属包 `anything2video-workbuddy` 由 `install.mjs workbuddy --export-dir <导出根目录>` 导出，入口含官方开放平台列出的 description_zh/description_en/version/author 字段。桌面版用技能管理/添加技能入口导入完整包；格式与大小限制以该版本界面为准，依据见[官方说明](https://open.workbuddy.cn/docs/skill)与 `reference/desktop-hosts.md`。无导入入口时把解压目录作为本地任务资源显式读取，记录为资源接入，不称已注册技能。CodeBuddy IDE/CLI 是另一产品，项目目录 `.codebuddy/skills/anything2video/` 走 generic 包安装（见[官方文档](https://www.workbuddy.cn/docs/ide/Features/Skills)），两种入口不能混称。

## 豆包工作（重点平台）

专属包 `anything2video-doubao-work` 同样用 `--export-dir` 导出。截至本发布未核实到原生第三方 Skill 导入格式或自动发现目录，不猜 `.doubao/skills` 或 CLI 名：在支持本地文件访问的工作任务中授权完整目录并显式读入口；若该版本确有导入入口，先核对官方格式再用。豆包内置图片/视频/声音是独立生成通道，落盘登记来源与许可后可作场景素材，不绕过确定性渲染与 QC。依据与未知项见 `reference/desktop-hosts.md`。

## 首次接入核对

豆包工作、WorkBuddy 首次接入后，要求助手返回它实际读取的入口路径、配方路径、可执行命令。能读包但不能执行 shell 的环境只能输出稿件/分镜，不声称已经渲染MP4。云端或沙箱若缺 ffmpeg/浏览器，按环境要求配置后重验。

## 验证等级

- 包检查：入口YAML、引用文件、离线素材/许可完整。
- 工程检查：Node/uv/ffmpeg、类型检查、渲染、音画和规格实测。
- 宿主发现：该应用确认实际加载的入口路径，不等于独立制片。
- 宿主检查：该应用实际加载skill并独立完成一条片子。

最终 `check-qc.mjs` 要求 production 全片、完整动态与听感声明及有效哈希证据。安装或打包不证明任何应用独立出片；未完成检查明确 not_performed，不能自动填 passed。生产数据合同见 production-contract.md。

本次发布会附包与工程的实测记录；未独立跑完整条片子的应用明确标记未实测，不能把安装指南写成跨应用端到端认证。

## 统一任务书

```text
完整阅读 anything2video/SKILL.md 和 production-contract.md。
为初学者制作中文竖屏教学视频，1080x1920，约2分钟。
先写可核实稿件；代码承载所有精确信息；不要复用别人的视频帧。
交付完整工程、成片、字幕、封面、素材清单和ffprobe规格。
我授权你选择音色和视觉方向。先验开场、复杂中段和结尾，至少三轮审片。
没有子代理就顺序完成，不能跳过混音和QC。未完成项明确报告。
```

成本来自模型调用、TTS、素材生成、计算和人工复核。不要据此宣称“完全免费”。
