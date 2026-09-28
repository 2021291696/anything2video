# 配方：explainer（讲解片）

**定位一句话**：给一个技术/知识主题，产出黑底 MG、配音字幕、章节进度条的科普讲解视频——本配方沿用 a2e（anything2explainer）的现有体系，其核心规范已**内联进本仓** `reference/explainer/`（含完整参考实现与质量标尺帧），不依赖本地安装 a2e；要讲产品/服务请用 `promo`。

## 1. 权威与指向

执行 explainer 配方时，规范与流程的**唯一权威是 `reference/explainer/`**（a2e 核心文档的内联副本，出处与路径映射见该目录 `README.md`），按其 `SKILL.md` 的「硬性原则 / 四个确认点 / 流程」三节照做：

- 核心文档：`reference/explainer/SKILL.md`
- 质量标尺：开工前先看 `reference/explainer/sample-rag/frames/` 的参考帧与 overview sheet 建立标尺（a2e SKILL.md 的要求，这里原样生效）；反例对照看 `reference/explainer/contrast-frames/`。

### reference/explainer/ 引用表（何时读哪份）

| 文档 | 作用 | 何时读 |
|---|---|---|
| `SKILL.md` | 硬性原则 6 条、四个确认点、阶段 0–8 流程、关键文件表、质量标尺 | 全程主纲领，开工前通读 |
| `style-guide.md` | 画布安全区、调色板、字体表、图元目录、版式规律 | 阶段 0/4；构建前必读 |
| `motion-vocabulary.md` | 入场/强调/光效/离场/运镜/节拍/衔接的公式与帧数，闪烁白名单规则 | 写分镜与镜头代码时 |
| `composition-and-light.md` | 主体尺寸三档、光跟主角、高光时刻编排、纵深、QC 量化判据 | style-guide 之后必读；QC 按 §6 |
| `narration-storyboard.md` | 解说词写法、配音参数、字幕切块、分镜令牌格式、镜头设计模式表 | 阶段 1–3 |
| `research-brief.md` | 研究员 prompt 模板与事实规则 | 阶段 1 派研究员时 |
| `agent-build-rules.md` / `agent-qc-rules.md` | 构建 / QC agent 的派单协议 | 派单时随单下发 |
| `prompts.md` | 研究/构建/QC/修复/复验/终检六种 prompt 模板 | 派单 |
| `lessons.md` | a2e 踩坑与根因 | 派单前扫一遍 |
| `sample-rag/` | 完整参考实现（调研/解说词/分镜/镜头源码/QC 报告/成片帧） | 拿不准怎么落地时对照 |

**同步纪律**：`reference/explainer/` 是上游 a2e 的内联副本，不随上游自动追平；两仓都在演进时，以本项目实际使用的这份为准修。你本地若装有 a2e（更新、更全），可以其为准并注明差异。

## 2. 与本 skill 模板的接线（config.recipe）

- `template/src/config.ts` 声明 `recipe` 字段，**`'explainer'` 是默认值**：主会话看到 `recipe: 'explainer'` → 打开本文档 → 按第 1 节引用表走 a2e 体系；本 skill 的 `reference/brand-assets.md` 与 `reference/promo-style-guide.md`（及 `recipes/promo.md`）在 explainer 配方下**不参与**——品牌帽/品牌条/端板都是 promo 配方的覆盖层，explainer 用的是 a2e 自带的 HUD/进度条/章节卡；但 **`reference/workflow-orchestration.md` 对所有配方生效**——本入口一律走 ZCode workflow 派单（a2e 原生的 tmux pane 口径不采用），explainer 也按它派单。
- 本 skill 的 `template/` 与 a2e `template/` 同构：`src/config.ts` / `src/ui.tsx` / `src/fx.tsx` / `src/overlay/` / `src/shots/Gn/` / `scripts/`（tts_build.py、preview.sh、render.sh、still.sh、frame_metrics.py…）同名同职责，`reference/explainer/SKILL.md` §关键文件表对模板内路径同样成立。
- 本配方对模板**零新增**：不需要改任何覆盖层；模板里 a2e 没有的部分（`recipe` 字段本身）只服务配方选择，不改变 explainer 的任何行为。

## 3. 相对基准的差异声明

**无差异。** 四个确认点、八阶段流程、QC 判据全按 `reference/explainer/` 原文执行。本文档存在的意义只有两条：让 `config.recipe: 'explainer'` 有据可查；把 a2e 体系的入口从"本地安装路径"改为"本仓内联副本"。
