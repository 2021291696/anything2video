# anything2video v3.1 六端扩展

2026-10-05。应新增要求：豆包工作与 WorkBuddy 纳入专属版，且豆包工作、WorkBuddy、Claude Code、Codex 为重点平台。v3.0.0 的四份包与发布资产保持不变，本次是增量版本 v3.1.0。

## 变更内容

- 新增 `hosts/doubao-work.md` 与 `hosts/workbuddy.md` 两份独立入口，公共制作核心（配方、参考、样式、模板、脚本、样片）与既有四端完全一致，`edition.json` 继续记录入口与核心 SHA256。
- `scripts/build-editions.mjs` 的 HOSTS 扩为六端，顺序按重点优先：doubao-work、workbuddy、claude-code、codex、zcode、minimax-code。构建前逐一校验六份身份，任何一份不合法即整体不写。
- `scripts/install.mjs` 新增 `doubao|doubao-work|workbuddy` 别名与 `--export-dir <目录>` 导出模式：输出 `<导出根>/anything2video-<host>` 完整包供手工导入。桌面两端没有可核实的自动发现目录，导出不写宿主配置、不代表应用已发现；其余用法与失败组合与 v3.0.0 相同。
- 新增 `reference/desktop-hosts.md` 记录桌面两端接入依据与未知项；Claude Code 与 Codex 入口补充相对路径解析与上下文压缩后续做两条防误报规则。
- 测试从四包扩展为六包，覆盖导出成功、缺参/错宿主/非桌面宿主误用 `--export-dir` 的拒绝、离线包再导出与身份不匹配。

## 接入边界（如实声明）

WorkBuddy：官方开放平台文档确认 SKILL.md + scripts + 参考结构及 description_zh/description_en/version/author 字段，本包已补齐；本地导入以实际版本界面为准。CodeBuddy IDE 的 `.codebuddy/skills` 是另一产品入口，安装器继续单独支持 generic 包。

豆包工作：截至本发布未获得可核验的原生第三方 Skill 导入格式或自动发现目录，不编造路径。专属包按显式资源目录接入：在可访问本地文件的工作任务中授权完整目录并要求读入口；内置图片/视频/声音是独立生成通道，落盘登记后可作场景素材，不替代确定性渲染与 QC。

宿主发现与应用内独立制片仍是两层独立证据：本次更新了本地四端安装（先备份），桌面两端完成导出；任何应用的完整独立出片都以该应用实际读取入口并渲出成片的记录为准，未实测项保留 not_performed。

## 版本与兼容

根 SKILL 与全部入口版本升至 3.1.0。已装 v3.0.0 目录被安装器保护，更新需先备份再显式替换；generic 正本与既有链接同样保留。旧工程不受影响，`init.mjs`/`check-qc.mjs` 等脚本行为未变。
