# 桌面工作助手接入依据

2026-10-05核对，同日v3.1.1修订。本包的 WorkBuddy 和豆包工作入口各自独立，公共制作代码、素材和QC相同。适配说明是执行指导；只有实际应用发现和完整制片的证据才支持对应验证结论。

## WorkBuddy

[官方开放平台技能说明](https://open.workbuddy.cn/docs/skill)明确描述 SKILL.md + scripts + 可选参考/模板结构，技能市场位于”专家·技能·连接器”中的”技能”；添加技能/创建技能入口及开放平台ZIP解析规则也在此页。官方列出 description、description_zh、description_en、version、author 等字段，本专属入口已补齐。

本地发现目录已实证（2026-10-05，本机）：`~/.workbuddy/skills/` 为桌面版本地技能目录——既有市场安装技能（如 short-drama 系列、grill-me）均在其中，`.workbuddy/.skill-list-cache.json` 的技能 filePath 全部指向该目录，纯 SKILL.md 目录即可被发现。因此安装器支持直接安装：`node scripts/install.mjs workbuddy` 装入 `~/.workbuddy/skills/anything2video-workbuddy/`，重启应用后在技能列表核对；也可加项目根参数或 `--export-dir` 导出供手工导入。该实证来自当前安装的 WorkBuddy 版本，其他版本以应用实际界面为准。

[CodeBuddy IDE Skills](https://www.workbuddy.cn/docs/ide/Features/Skills)明确使用项目.codebuddy/skills目录，这是IDE产品文档，是另一产品的入口，不与本目录混用。CodeBuddy兼容安装器单独保留。

## 豆包工作

[豆包官方下载页](https://www.doubao.com/download)是桌面产品入口。工作模式、本地文件访问、内置图片/视频功能必须按当前版本实际任务验证，网页存在或产品介绍不能证明已开放第三方 Skill 导入。

截至本次发布未获得可核验的原生第三方Skill导入格式、自动发现目录或编码CLI规范，因此不提供猜测路径。专属包使用显式资源目录接入：在可访问本地文件的工作任务中授权完整目录并要求读入口；如果该版本确实提供原生导入入口，核对官方格式后采用。目录导出（`node scripts/install.mjs doubao-work --export-dir <目录>`）不会修改豆包配置。命令执行不可用时仅交付稿件/分镜或待执行工程，不能把内置视频生成结果当确定性Remotion工程已完成。

## 四个重点平台的验证边界

Claude Code：标准.claude/skills加载、交互/普通CLI，子代理与媒体能力按会话实测。Codex：.agents/skills加载、CLI/桌面分别核对，遵循AGENTS与独立文件所有权。WorkBuddy：`~/.workbuddy/skills`安装后重启核对发现，本地任务与云任务分开。豆包工作：显式资源目录、原生导入未知、内置生成通道与代码渲染分开。

初次接入返回实际SKILL路径/版本、配方路径、doctor结果与媒体可审范围。导入、发现、工程执行、完整播放与听取、独立制片分别记录，不能由前一层自动推断后一层。任何无能力检查的项保留not_performed。
