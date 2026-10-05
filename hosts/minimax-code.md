---
name: anything2video-minimax-code
description: 在 MiniMax Code 中从主题、文章或产品制作原创教学、科普与宣传视频，利用当前真实文件、命令与多模态能力完成可复现工程和质量证据。Use for original video production in MiniMax Code.
metadata:
  version: "3.1.1"
---

# anything2video · MiniMax Code 专属版

独立包共享同一生产核心。MiniMax Code 是宿主，图片模型和语音服务是另外的通道，不能因为同品牌就假设已配置或可用。

## MiniMax Code 的加载

- 用户全局目录 `{{DATA_DIR}}/skills/anything2video-minimax-code/`；代理私有目录 `{{DATA_DIR}}/agents/<agent>/skills/anything2video-minimax-code/`。DATA_DIR 以运行应用为准；默认用户目录常见为 `~/.minimax`，可用安装器 --data-dir 指定真实目录。
- 此宿主的 skill 管理没有通用 CLI。使用当前 available_skills 列表核对发现，再调用原生 `skill({name: "anything2video-minimax-code"})`，以返回 Location 为实际资源根。
- 更新在下一会话生效，无需凭空重启 local-runtime；不要改受保护的 `.builtin-skills`。不发明 `minimax -p`，mcode-tools connector 不是制片 CLI。

## 先读与实测

从 Location 完整读 `reference/production-contract.md`、`reference/production-workflow.md`，选择并读 recipes 中一个配方。分镜前读 directing-playbook；按需要加载 motion-language、styles/README 与 SPEC、ai-frame-sop、brand-assets 和 workflow-orchestration。旧 explainer 快照不覆盖共享规则。

检查文件、shell、Node/uv/ffmpeg/Chromium，再分别实际测试图片、MP4 与音频。多模态可用于发现素材伪影、布局遮挡和节奏，但只能报告真实读到/听到的范围。不能仅凭“多模态强”把静态截图验成动态和听感。

若有原生 task/task_append/task_output，可按独立文件所有权派单并取回实际文件与日志；具体参数从当前工具说明读取。代理负责素材 QC、独立镜头或测试；主会话负责导演、共享接口、整合。没有这些工具就顺序完成，不套用其他宿主的 workflow 函数。

## 生产流程

沿已有视频数据根初始化，支持 init.mjs <slug> 读取 A2V_DATA_ROOT 或 ~/.anything2video/workdir；未知先确认并持久化。音乐按 bgm-bakeoff 试听决定，风格拿不准放映 samples/；已有明确决定或对应授权不重复询问。竖屏接线见 reference/portrait-wiring.md。

doctor 后在包外空目录 init；进入工程 npm install、uv sync、browser ensure。先稿件与真实配音时间轴，再按原因/动作/结果构造分镜；开场、复杂中段和结尾真实打样之后扩展全片。

精确文字、命令、数字和图表交给代码或真实授权录屏。图像通道仅在真实配好时使用，记录完整提交提示词、模型、seed、全 SHA256、来源、许可、披露，素材三查不得默认 passed。image-01 等通道接口按实际服务文档确认，不从宿主推断 API key 或额度。

保留清洁 audio_narration.wav，audio.wav 仅为派生混音。有意静止、无音乐和不使用 AI 世界底都是合法决定，按内容需要选。参考片不得抽帧拼成成片。

默认工程 draft；正式前 status=production 并 video 渲染。真实完整播放和听取，写 qc/final.json，运行 check-qc.mjs。审查缺项明确 not_performed；媒体或源码变化要重渲并重新验收。

## 交付

MP4、工程/锁文件、字幕/配音、封面、事实与素材清单、ffprobe 和 QC。发布使用已授权渠道并按适用平台入口声明 AI 内容。安装包校验与 MiniMax Code 自己独立出片是不同验证等级，不能混报。
