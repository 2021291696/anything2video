# anything2video v3.1 六端扩展

2026-10-05。应新增要求：豆包工作与 WorkBuddy 纳入专属版，且豆包工作、WorkBuddy、Claude Code、Codex 为重点平台。v3.0.0 的四份包与发布资产保持不变，本次是增量版本。v3.1.0 发布后同日修订为 v3.1.1：实证 WorkBuddy 桌面存在本地技能发现目录 `~/.workbuddy/skills/`（既有市场技能均安装于此、技能缓存 filePath 全部指向该目录），安装器改为直接安装 WorkBuddy 专属包到该目录并保留 `--export-dir`；v3.1.0 文档中"WorkBuddy 无核实自动发现目录"的表述作废，豆包工作仍维持仅导出。

## 变更内容

- 新增 `hosts/doubao-work.md` 与 `hosts/workbuddy.md` 两份独立入口，公共制作核心（配方、参考、样式、模板、脚本、样片）与既有四端完全一致，`edition.json` 继续记录入口与核心 SHA256。
- `scripts/build-editions.mjs` 的 HOSTS 扩为六端，顺序按重点优先：doubao-work、workbuddy、claude-code、codex、zcode、minimax-code。构建前逐一校验六份身份，任何一份不合法即整体不写。
- `scripts/install.mjs` 新增 `doubao|doubao-work|workbuddy` 别名与 `--export-dir <目录>` 导出模式：输出 `<导出根>/anything2video-<host>` 完整包供手工导入。v3.1.1 起 WorkBuddy 为标准安装宿主（装入 `~/.workbuddy/skills/`，同 Claude Code 等一致的目录安装语义），`--export-dir` 保留用于跨机分发；豆包工作仍仅支持导出，不写宿主配置、不代表应用已发现。
- 新增 `reference/desktop-hosts.md` 记录桌面两端接入依据与未知项；Claude Code 与 Codex 入口补充相对路径解析与上下文压缩后续做两条防误报规则。
- 测试从四包扩展为六包，覆盖导出成功、缺参/错宿主/非桌面宿主误用 `--export-dir` 的拒绝、离线包再导出与身份不匹配。

## 接入边界（如实声明）

WorkBuddy：官方开放平台文档确认 SKILL.md + scripts + 参考结构及 description_zh/description_en/version/author 字段，本包已补齐；本地技能目录 `~/.workbuddy/skills/` 为本机实证（市场安装技能与技能缓存均指向它），安装器直接装入，应用内发现以重启后技能列表实测为准。CodeBuddy IDE 的 `.codebuddy/skills` 是另一产品入口，安装器继续单独支持 generic 包。

豆包工作：截至本发布未获得可核验的原生第三方 Skill 导入格式或自动发现目录，不编造路径。专属包按显式资源目录接入：在可访问本地文件的工作任务中授权完整目录并要求读入口；内置图片/视频/声音是独立生成通道，落盘登记后可作场景素材，不替代确定性渲染与 QC。

宿主发现与应用内独立制片仍是两层独立证据：本次更新了本地四端安装（先备份），桌面两端完成导出；任何应用的完整独立出片都以该应用实际读取入口并渲出成片的记录为准，未实测项保留 not_performed。

## 版本与兼容

根 SKILL 与全部入口版本现为 3.1.2（v3.1.0 同日两次修订）。v3.1.2 曾记"WorkBuddy 默认模型为纯对话型不调用工具"，同日复查撤回：任务输入框回车不发送、须点发送按钮，当日测试指令疑未送达代理，该结论不成立；入口改为"确认消息上屏+必要时切执行型模型"的实测注意。豆包桌面 2.28.13 开启"电脑操作"后本地读已实证（随机口令文件读取排除猜测），写文件与命令执行未获实证（声明完成但磁盘无落盘），边界记入 reference/desktop-hosts.md。已装旧版目录被安装器保护，更新需先备份再显式替换；generic 正本与既有链接同样保留。旧工程不受影响，`init.mjs`/`check-qc.mjs` 等脚本行为未变。
