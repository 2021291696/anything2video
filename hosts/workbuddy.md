---
name: anything2video-workbuddy
description: 在 WorkBuddy 桌面本地任务中，把主题、文章或产品制作成原创教学和科普视频，交付可复现 Remotion 工程、配音、分镜、成片及真实审片证据。
description_zh: 在 WorkBuddy 本地任务中制作原创代码视频，完成稿件、配音、分镜、渲染、修复与交付。
description_en: Produce original teaching videos in WorkBuddy local tasks with researched narration, reproducible Remotion projects and measured review evidence.
version: "3.1.2"
author: "2021291696"
metadata:
  version: "3.1.2"
---

# anything2video · WorkBuddy 专属版

面向 WorkBuddy 桌面本地任务的完整独立包。共享生产核心一致；WorkBuddy 与 CodeBuddy IDE/CLI 的加载入口分别处理。

## 导入与读取

- 推荐直接安装：`node scripts/install.mjs workbuddy` 装入 `~/.workbuddy/skills/anything2video-workbuddy/`（该目录为本机实证的桌面版技能发现目录），重启 WorkBuddy 后在技能列表核对；也可加项目根参数。跨机分发用 `--export-dir <导出根目录>` 得到完整文件夹供手工导入。
- 手工导入走当前 WorkBuddy 的技能管理/添加技能入口，支持的 ZIP 或文件夹格式以该版本界面为准。若只支持目录，解压保留 `anything2video-workbuddy/SKILL.md` 及全部子目录，不只上传入口文件。无导入入口时将解压目录作为本地任务资源显式读入口，记录为资源接入，不称已注册原生技能。
- 导入后要求返回实际读取的入口路径和版本，并读取 `reference/production-contract.md`、`reference/production-workflow.md` 与所选完整配方。选教学 `recipes/explainer.md`、产品 promo、风格 custom、谱系 epic；分镜前读 `reference/directing-playbook.md`。风格、运动、AI素材、竖屏参考按需读。官方结构/元数据与验证边界见 `reference/desktop-hosts.md`、`docs/adapters.md`。

## WorkBuddy 的执行方式

选择能访问指定本地工程的任务，分别确认技能目录、工程目录和输出目录都在实际授权范围。云端任务、手机端或连接器远程执行不能默认拥有本机文件与依赖。

**模型必须选支持工具调用的执行型模型**（2026-10-05 实测：默认 GLM-5.3-Flash 为纯对话型，任务里只输出计划文字，不调用命令/文件工具，多次要求仍零执行证据）。切到执行型模型后再开工，并先让它执行 `node --version` 贴原始输出验证执行力。

用当前真实文件与命令工具先运行 doctor；核实 Node/npm/uv/ffmpeg/ffprobe/Chromium，记录工作目录与命令输出。没有终端时可完成调研、稿件与分镜，交付工程待执行清单；没有渲染产物不能报告已出片。不能用内置短视频生成按钮替代本包确定性渲染及证据合同。

当前任务若提供子代理，可按独立镜头文件或测试边界派单；参数从实际工具说明读取，不套 ZCode Workflow 或 MiniMax task API。主控负责导演、共享接口、整合与最终验收。没有子代理顺序完成；阶段记录、素材清单与缺陷落盘，任务切换后核对文件再续做。

图像查看、MP4播放、音频听取分别实测。连接器返回摘要、联系表或日志不能代替实际整片播放与听取。缺失检查保留 not_performed，不能让软件名字代替证据。

## 制作与验收

沿用户指定视频根，在包外空目录运行 `node <skill>/scripts/init.mjs <工程> <slug>`；工程内 npm install、uv sync、浏览器 ensure。工作根和既有音乐/风格授权按生产契约沿用；未知工作根才收集，已授权决定不重复等待。

先可核实稿件与真实清洁配音时间轴，再构造原因、动作、结果分镜。开场、复杂中段、结尾先做目标画幅的运动小样。精确文字、命令、数字和图表交给代码或授权真实录屏；素材按来源、许可、SHA256登记，AI另记提示词、模型、seed、披露和三查。清洁 audio_narration.wav 与派生 audio.wav 分开。

默认 draft；正式前改 status=production 并渲完整 video。实际完整播放、听取后写 qc/final.json，运行 `node <skill>/scripts/check-qc.mjs <工程> qc/final.json`。变更源码/媒体后重渲复验，阻塞项未清零不交最终通过。

## 交付

MP4、源码与锁文件、配音/字幕、封面、事实和素材清单、实测规格、QC及待审项。抖音适用时启用当前AI声明，GitHub或社交发布按既有授权执行。包导入、应用发现、独立制片分开记录；不承诺全面替代Opus、免费或保证过审。
