---
name: anything2video-claude-code
description: 在 Claude Code 中从主题、文章或产品制作原创教学、科普和宣传视频；交付可复现 Remotion 工程、配音、分镜、成片与审片证据。Use for original video production in Claude Code.
metadata:
  version: "3.1.1"
---

# anything2video · Claude Code 专属版

这是完整独立包，共享生产核心与其他专属版字节一致。宿主只改变加载、工具和编排，不能推导模型质量一致。

## 先执行

1. 从本次实际加载的 skill 目录完整读 `reference/production-contract.md`、`reference/production-workflow.md`。
2. 选一个配方完整读：教学 `recipes/explainer.md`、产品 `recipes/promo.md`、风格 `recipes/custom.md`、谱系 `recipes/epic.md`。
3. 分镜前读 `reference/directing-playbook.md`；按需读 motion-language、styles/README 与 SPEC、ai-frame-sop、brand-assets、workflow-orchestration。历史 explainer 文档是特定风格快照，不能覆盖共享契约。

## Claude Code 的加载与工作方式

- 用户级 `.claude/skills/anything2video-claude-code/`，项目级 `<project>/.claude/skills/anything2video-claude-code/`。完整保留 reference、template、styles、scripts。
- 交互会话 `/anything2video-claude-code <主题、平台与约束>`。若当前版本未发现目录，显式提供 SKILL.md 绝对路径，核对实际读取位置，不猜已加载。
- headless 可用 `claude -p "完整阅读指定 SKILL.md 并执行任务"`，从授权工程目录启动；具体 flags 先看本机 `claude --help`。不添加绕过权限的默认参数。
- 使用当前会话实际提供的文件与 shell 工具。子代理仅在可用时用于独立镜头文件、资料整理或测试；主会话负责导演、共享 API、整合与最终审片。长运行保持磁盘阶段记录，不靠摘要猜完成情况。
- 技能相对路径均以实际入口目录为根；命令从工程执行，不把用户级安装目录当工程。计划/只读模式只完成对应设计工作，待当前授权与工具允许执行时再建工程，不把计划响应记成渲染。
- 不同 Claude 模型/会话的视频和音频能力不同。实际测试图片、MP4 播放和听取；只读图片就只能通过静态视觉项，不能把联系表当完整运动与听感验收。

## 生产约束

沿已有视频数据根初始化，支持 init.mjs <slug> 读取 A2V_DATA_ROOT 或 ~/.anything2video/workdir；未知先确认并持久化。音乐按 bgm-bakeoff 试听决定，风格拿不准放映 samples/；已有明确决定或对应授权不重复询问。竖屏接线见 reference/portrait-wiring.md。

先运行本包 `scripts/doctor.mjs`；在包外空目录 `node <skill>/scripts/init.mjs <工程> <slug>`，进入工程 npm install、uv sync、浏览器 ensure。先稿件与真实配音时间轴，再分镜，开场/复杂中段/结尾打样，随后扩展整片。

每镜头要有原因、动作、结果。文字和图表用代码或真实授权录屏，素材登记来源/许可/全 SHA256，AI 追加完整提示词、模型、seed、披露与三查。有意静止可以成立，不为凑效果数强加光效或音乐。保留不可变 audio_narration.wav，audio.wav 为派生混音。

工程默认为 draft。最终前改 status=production，再 video 渲染；运行 `check-qc.mjs <工程> qc/final.json`。媒体/源码变化后旧证据失效。真实整片播放和听取缺失就交待审稿，不能宣称 QC passed。

只在已有授权内发布。含合成配音或生成素材时按平台实际声明；不承诺免费、必过审、一次提示精品或全面替代 Opus。

## 交付

MP4、源码和锁文件、字幕、封面、事实/素材清单、ffprobe 和 QC。说明本次用了哪些真实工具、未验证哪些能力；目录安装成功不是 Claude 独立全流程制片认证。
