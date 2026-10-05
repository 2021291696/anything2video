# 桌面工作助手接入依据

2026-10-05核对。本包的 WorkBuddy 和豆包工作入口各自独立，公共制作代码、素材和QC相同。适配说明是执行指导；只有实际应用发现和完整制片的证据才支持对应验证结论。

## WorkBuddy

[官方开放平台技能说明](https://open.workbuddy.cn/docs/skill)明确描述 SKILL.md + scripts + 可选参考/模板结构，技能市场位于“专家·技能·连接器”中的“技能”；添加技能/创建技能入口及开放平台ZIP解析规则也在此页。ZIP提交/市场创建说明不能独立证明某版本本地导入已成功。

官方列出 description、description_zh、description_en、version、author 等字段。本专属入口补齐中英文说明、顶层版本与实际仓库作者，保留标准name及metadata.version。未提供官方未要求的虚构依赖、CLI或自动发现目录。reference/和template/是本包的真实相对路径，需允许读取完整子目录；只导入入口文件不能执行。

本地使用：在实际桌面版本的技能管理/导入界面选完整包；格式、大小限制与入口以该界面为准。无相应入口时通过授权本地任务显式读取解压目录，记录为资源接入，不能称已注册技能。先核对实际路径与版本，再运行doctor和初始化。

[CodeBuddy IDE Skills](https://www.workbuddy.cn/docs/ide/Features/Skills)明确使用项目.codebuddy/skills目录，这是IDE产品文档，不作为WorkBuddy桌面自动发现目录的证据。CodeBuddy兼容安装器仍单独保留。

## 豆包工作

[豆包官方下载页](https://www.doubao.com/download)是桌面产品入口。工作模式、本地文件访问、内置图片/视频功能必须按当前版本实际任务验证，网页存在或产品介绍不能证明已开放第三方 Skill 导入。

截至本次发布未获得可核验的原生第三方Skill导入格式、自动发现目录或编码CLI规范，因此不提供猜测路径。专属包使用显式资源目录接入：在可访问本地文件的工作任务中授权完整目录并要求读入口；如果该版本确实提供原生导入入口，核对官方格式后采用。目录导出不会修改豆包配置。

单独导出用 `node scripts/install.mjs doubao-work --export-dir <目录>`；WorkBuddy对应参数为workbuddy。两者输出供手工接入，未自动安装。命令执行不可用时仅交付稿件/分镜或待执行工程，不能把内置视频生成结果当确定性Remotion工程已完成。

## 四个重点平台的验证边界

Claude Code：标准.claude/skills加载、交互/普通CLI，子代理与媒体能力按会话实测。Codex：.agents/skills加载、CLI/桌面分别核对，遵循AGENTS与独立文件所有权。WorkBuddy：桌面完整资源导入、本地任务与云任务分开。豆包工作：显式资源目录、原生导入未知、内置生成通道与代码渲染分开。

初次接入返回实际SKILL路径/版本、配方路径、doctor结果与媒体可审范围。导入、发现、工程执行、完整播放与听取、独立制片分别记录，不能由前一层自动推断后一层。任何无能力检查的项保留not_performed。
