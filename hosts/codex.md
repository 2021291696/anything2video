---
name: anything2video-codex
description: 在 Codex CLI 或桌面中制作原创教学、科普、宣传和品牌视频，使用文件、命令和可用媒体工具完成 Remotion 工程、配音、分镜、渲染与审片修复。Use for original video production in Codex.
metadata:
  version: "3.0.0"
---

# anything2video · Codex 专属版

这是自包含的专属包。共享核心与其他版本相同，工具按当前会话能力选择。

## 加载

用户级 `~/.agents/skills/anything2video-codex/`，项目级 `<project>/.agents/skills/anything2video-codex/`。现有 `.codex/skills` 链接可保留，但核对是否指同一正本。通过 `$anything2video-codex <任务>` 或 SKILL.md 绝对路径触发；安装后在新会话核对实际加载路径。

先完整读 `reference/production-contract.md`、`reference/production-workflow.md`，再读所选 `recipes/explainer.md`、promo、custom 或 epic。分镜前读 directing-playbook；运动、SKU、AI、品牌和编排参考按需加载。旧 explainer 文档是特定风格快照，不覆盖共享契约。

## Codex 的执行方式

- CLI 与桌面都依赖授权范围内文件和命令执行。先 doctor，并实测 Node/uv/ffmpeg/Chromium。CLI headless flags 先查 `codex --help` 和 `codex exec --help`，不要套用 ZCode -p 或 workflow 注入函数。
- 桌面可用图像查看、浏览器/媒体或插件能力因会话而异。单帧截图只证明静态可读性；浏览器实际播放视频的观察才支持运动项，真实听取才支持 audio。工具不能提供这些就明确待审。
- 子代理存在时按独立文件所有权委派，任务边界含共享 API、全局与局部帧号、输入分镜和验收命令。主代理负责设计、复杂诊断、整合与最终验收；不能把整个项目无边界转交。
- 遵循工程 AGENTS.md、现有依赖与用户授权，保留已有改动。需要隔离样片可建包外独立 draft 工程；并行 bundle 与输出锁由 render.mjs 处理。后台任务结束和输出核对后才记录完成。
- 当前工具没有视频生成或 TTS 就不要假设存在；使用实测通道，或已授权外部音频与素材。成本和模型能力分别说明。

## 导演与工程

沿已有视频数据根初始化，支持 init.mjs <slug> 读取 A2V_DATA_ROOT 或 ~/.anything2video/workdir；未知先确认并持久化。音乐按 bgm-bakeoff 试听决定，风格拿不准放映 samples/；已有明确决定或对应授权不重复询问。竖屏接线见 reference/portrait-wiring.md。

初始化：`node <skill>/scripts/init.mjs <工程> <slug>`，工程内 npm install、uv sync、browser ensure。先可核实稿件、真实配音时间轴和分镜，再渲开场/复杂中段/结尾。每镜头必须让观众看见原因、动作与结果；命令与步骤给足阅读时间。

所有精确文字、数字、图表由代码或真实录屏承载。素材登记来源/许可/全 SHA256；生成素材追加模型、完整提示词、seed、披露与三查。参考片借手法，不用其抽帧作成片。配音正本与混音分开。

默认 draft；最终前改 status=production 后 video 渲染。真实看完整片、听音轨并记录 evidence，再运行 `node <skill>/scripts/check-qc.mjs <工程> qc/final.json`。该门禁核对证据和新鲜性，不是审美自动评分。源码和媒体变化后旧证据失效。

## 交付

MP4、源码与锁文件、字幕/配音、封面、事实/素材清单、实际规格、QC 和未完成项。遵循既有发布授权，按平台声明生成内容；不承诺全面 Opus 等价、免费或必过审。不能把 Codex 可加载包写成四应用已分别完整出片。
