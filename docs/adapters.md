# 跨宿主安装与执行

同一包提供 SKILL.md、recipes、reference、styles、template、scripts。宿主差异限于加载与编排；事实、素材、音频、审片和交付规则完全共用。适配成功不能推导成模型质量一致。

## ZCode

已有环境的正本在 `~/.agents/skills/anything2video`。用 `zcode skills list` 核对当前版本是否发现；有版本使用设置页导入，按实际CLI帮助执行。普通 headless 使用 `zcode -p "先完整读目标skill，再执行任务" --cwd <工程目录>`；可在任务中给 SKILL.md 绝对路径，避免猜自动发现。旧 dynamic workflow 是可选，不能要求所有 ZCode 版本都有 `agent()` 注入接口。

## Claude Code

项目安装 `.claude/skills/anything2video/`，用户安装 `~/.claude/skills/anything2video/`。目录内必须完整保留模板和引用资产。会话里 `/anything2video <主题和平台>` 或明确要求加载。需要文件与命令执行权限。先顺序跑通一条小片，再启用子代理；每组指定文件所有权、输入分镜和验收命令。

## Codex

项目安装 `.agents/skills/anything2video/`，用户安装 `~/.agents/skills/anything2video/`。已有 `.codex/skills` 链接可保留，避免两份不同正本。使用 `$anything2video <任务>` 或直接给SKILL路径。CLI与桌面支持能力按会话实测，不能假设存在 ZCode workflow/tmux。主控负责整合与审片，编码worker只负责镜头文件。

## WorkBuddy / CodeBuddy

桌面 WorkBuddy 可使用本地 skill 包导入；市场/open平台提交可能需要额外metadata，见[官方说明](https://open.workbuddy.cn/docs/skill)。CodeBuddy IDE/CLI 的项目目录为 `.codebuddy/skills/anything2video/`，见[官方文档](https://www.workbuddy.cn/docs/ide/Features/Skills)。两种产品入口不能混称。提供完整仓库ZIP即可作为本地包来源；市场发布不在本次范围。

首次导入后，要求助手返回它实际读取的入口路径、配方路径、可执行命令。能读包但不能执行 shell 的环境只能输出稿件/分镜，不声称已经渲染MP4。云端或沙箱若缺 ffmpeg/浏览器，按环境要求配置后重验。

## 验证等级

- 包检查：入口YAML、引用文件、离线素材/许可完整。
- 工程检查：Node/uv/ffmpeg、类型检查、渲染、音画和规格实测。
- 宿主检查：该应用实际加载skill并独立完成一条片子。

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
