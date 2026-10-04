# reference/explainer/ —— 黑底 MG 讲解片规范（vendored）

本目录是 [anything2explainer](https://github.com/Vincentwei1021/anything2explainer)（下称 a2e）核心文档的**内联副本**，供 `recipes/explainer.md` 配方独立使用——本仓开源后不依赖读者本地安装 a2e。

**出处与授权**：文档由 a2e 原作者（Vincent Wei / 李卓霖，两仓共同作者）许可收入本仓。a2e 本体持续演进，本副本不追平；需要最新版去上游仓库。除本 README 外，目录内文档与上游字节一致，便于对照 diff。

## 目录内容

| 本仓路径 | 内容 |
|---|---|
| `SKILL.md` | a2e 主纲领：硬性原则 6 条、四个确认点、阶段 0–8 流程、质量标尺 |
| `style-guide.md` | 画布安全区、调色板、字体表、图元目录、版式规律 |
| `motion-vocabulary.md` | 入场/强调/光效/离场/运镜/节拍/衔接公式与帧数、闪烁白名单 |
| `composition-and-light.md` | 主体尺寸三档、光跟主角、高光时刻编排、QC 量化判据 |
| `narration-storyboard.md` | 解说词写法、配音参数、字幕切块、分镜令牌格式 |
| `research-brief.md` | 研究员 prompt 模板与事实规则 |
| `agent-build-rules.md` / `agent-qc-rules.md` | 构建 / QC agent 派单协议 |
| `prompts.md` | 研究/构建/QC/修复/复验/终检六种 prompt 模板 |
| `lessons.md` | a2e 踩坑与根因记录 |
| `sample-rag/` | 完整参考实现《RAG 与知识库》：调研、解说词、分镜源、镜头源码 `shots_src/`、QC 报告、成片参考帧 `frames/` |
| `contrast-frames/` | 反例帧（好/坏构图对照） |

## 路径映射

vendored 文档内部沿用了 a2e 原生的相对路径，在本仓中按下表换算：

| 文档里写的 | 在本仓实际是 |
|---|---|
| `examples/rag/…` | `reference/explainer/sample-rag/…` |
| `examples/rag/frames/…` | `reference/explainer/sample-rag/frames/…` |
| `examples/contrast/` | `reference/explainer/contrast-frames/` |
| `reference/X.md` | `reference/explainer/X.md`（同目录） |
| `template/…` | 本仓 `template/…`（与 a2e 模板同构） |
| tmux pane / ZCode workflow 口径 | 仅在宿主实际支持时使用；否则顺序完成全部工序，见 `../production-contract.md` |
