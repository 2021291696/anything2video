---
name: anything2video-zcode
description: 在 ZCode 中从主题、文章或产品制作原创教学、科普、宣传与品牌视频；普通 CLI 或可用 workflow 编排均可，交付可复现工程和真实质量证据。Use for original video production in ZCode.
metadata:
  version: "3.0.0"
---

# anything2video · ZCode 专属版

完整独立包，生产核心与其他专属版一致。保留原有导演与图元知识，避免把历史 workflow 当每个 ZCode 安装都具备的前提。

## 先执行

1. 完整读本次实际入口目录内的 `reference/production-contract.md`、`reference/production-workflow.md`。
2. 选配方：教学 explainer、产品 promo、风格 custom、谱系 epic，完整读 `recipes/<类型>.md`。
3. 分镜前读 `reference/directing-playbook.md`；按需加载 motion-language、styles/README 与 SPEC、ai-frame-sop、brand-assets、workflow-orchestration。旧 explainer 快照不覆盖统一契约。

## ZCode 的加载与编排

- 本包安装器使用 `~/.agents/skills/anything2video-zcode/`；有版本还发现 `.zcode/skills` 或支持设置页导入，先读本机帮助并用 `zcode skills list --json` 核对实际路径。用户级同名项可能遮盖项目项。
- 交互明确要求使用 anything2video-zcode，并返回实际入口路径。普通 headless 可用 `zcode -p "完整阅读指定 SKILL.md 并执行任务" --cwd <工程>`，具体 flags 以本机帮助为准。
- 优先普通文件与命令执行跑通。dynamic workflow 仅在当前会话真实提供该接口时用；自定义工作流走 scriptPath，不用内置 name。
- 仅在实际 Workflow API 中：args 可能是 JSON 字符串，先解析；agent() 必须 await，返回值先 toText；用 log 输出，不能靠 return。不要用 phase/log/agent/parallel/pipeline 作变量。先验证三行最小脚本，详细派单见 workflow-orchestration。
- 子代理/便宜 worker 可做独立镜头、格式和测试，任务书含文件所有权与验收命令。不要通过 agent prompt 往返大 JSON，磁盘保存后直接运行工具。没有该能力就顺序完成。
- ZCode 的模型选择可能改变图片/视频/音频能力。实测可读取媒体类型；MP4 被拒时可以审截图和技术项，但 motion/audio 保留 not_performed，不能伪造动态审片。

## 生产与最终验收

沿已有视频数据根初始化，支持 init.mjs <slug> 读取 A2V_DATA_ROOT 或 ~/.anything2video/workdir；未知先确认并持久化。音乐按 bgm-bakeoff 试听决定，风格拿不准放映 samples/；已有明确决定或对应授权不重复询问。竖屏接线见 reference/portrait-wiring.md。

doctor 后在包外空目录 init；工程内 npm install、uv sync、浏览器 ensure。先稿件和真实音频时间轴，按原因/动作/结果建分镜；开场、复杂中段和结尾真实打样通过再扩展全片。不要只让标题进出。

精确信息由代码或真实授权录屏承担；AI 场景登记来源/许可/全 SHA256/完整提示词/模型/seed/披露/三查。音频正本 audio_narration.wav 不可当混音覆盖，audio.wav 为派生物。光效、音乐、相机按内容需要选择。

工程默认 draft；正式前 status=production 并 video 渲染，完整播放与听取后写 qc/final.json，运行 check-qc.mjs。源码或素材变化须重渲复验。探针和截图只证明所测项，不能替代整片。

## 交付

成片、工程锁文件、配音/字幕、封面、事实与素材清单、ffprobe、QC 和待审项。只发布用户已授权渠道，生成内容按当前平台入口声明；不宣称全模型等价或保证过审。安装发现成功与 ZCode 独立制片成功分别记录。
