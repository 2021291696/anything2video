# 配方：explainer（讲解片）

**定位一句话**：给一个技术/知识主题，产出黑底 MG、配音字幕、章节进度条的科普讲解视频——**本配方就是 a2e（anything2explainer）的现有体系**，本文档不复制其任何规范，只声明指向与接线；要讲产品/服务请用 `promo`。

## 1. 权威与指向

执行 explainer 配方时，规范与流程的**唯一权威是 a2e**，按其 `SKILL.md` 的「硬性原则 / 四个确认点 / 流程」三节照做：

- a2e 正本（随本仓 vendored）：`reference/explainer/`——下表中的 `SKILL.md` 与 `reference/X.md` 分别对应 `reference/explainer/SKILL.md` 与 `reference/explainer/X.md`（本仓另带 a2e 自身的 `lessons.md` 与样张 `sample-rag/`、`contrast-frames/`）。
- 质量标尺：先看 `reference/explainer/sample-rag/frames/` 的参考帧与 overview sheet，再开工（a2e SKILL.md 的要求，这里原样生效）。

### a2e reference 引用表（何时读哪份）

| a2e 文档 | 作用 | 何时读 |
|---|---|---|
| `SKILL.md` | 硬性原则 6 条、四个确认点、阶段 0–8 流程、关键文件表、质量标尺 | 全程主纲领，开工前通读 |
| `reference/style-guide.md` | 画布安全区、调色板、字体表、图元目录、版式规律 | 阶段 0/4；构建前必读 |
| `reference/motion-vocabulary.md` | 入场/强调/光效/离场/运镜/节拍/衔接的公式与帧数，闪烁白名单规则 | 写分镜与镜头代码时 |
| `reference/composition-and-light.md` | 主体尺寸三档、光跟主角、高光时刻编排、纵深、QC 量化判据 | style-guide 之后必读；QC 按 §6 |
| `reference/narration-storyboard.md` | 解说词写法、配音参数、字幕切块、分镜令牌格式、镜头设计模式表 | 阶段 1–3 |
| `reference/research-brief.md` | 研究员 prompt 模板与事实规则 | 阶段 1 派研究员时 |
| `reference/agent-build-rules.md` / `agent-qc-rules.md` | 构建 / QC agent 的派单协议 | 派单时随单下发 |
| `reference/prompts.md` | 研究/构建/QC/修复/复验/终检六种 prompt 模板 | 派单 |
| `reference/lessons.md` | 踩坑与根因（磁盘、离场归零、穿字幕带、glitch 错峰…） | 派单前扫一遍；收尾把新教训写回它 |

**不复制原则**：a2e 文档一概不拷进配方（正本已 vendored 于 `reference/explainer/` 单一出处，改动只发生在那里）。本配方与本文档只允许引用（上表路径），explainer 的一切判据以 a2e 原文为准。

## 2. 与本 skill 模板的接线（config.recipe）

- `template/src/config.ts` 声明 `recipe` 字段，**`'explainer'` 是默认值**：主会话看到 `recipe: 'explainer'` → 打开本文档 → 按第 1 节引用表走 a2e 体系；本 skill 的 `reference/brand-assets.md` 与 `reference/promo-style-guide.md`（及 `recipes/promo.md`）在 explainer 配方下**不参与**——品牌帽/品牌条/端板都是 promo 配方的覆盖层，explainer 用的是 a2e 自带的 HUD/进度条/章节卡；但 **`reference/workflow-orchestration.md` 对所有配方生效**——本入口一律走 ZCode workflow 派单（a2e 原生的 tmux pane 口径不采用），explainer 也按它派单。
- 本 skill 的 `template/` 与 a2e `template/` 同构：`src/config.ts` / `src/ui.tsx` / `src/fx.tsx` / `src/overlay/` / `src/shots/Gn/` / `scripts/`（tts_build.py、preview.sh、render.sh、still.sh、frame_metrics.py…）同名同职责，a2e `SKILL.md` §关键文件表对模板内路径同样成立。
- 本配方对模板**零新增**：不需要改任何覆盖层；模板里 a2e 没有的部分（`recipe` 字段本身）只服务配方选择，不改变 explainer 的任何行为。

## 3. 相对基准的差异声明

**无差异。** 四个确认点、八阶段流程、QC 判据全按 a2e 原文执行。本文档存在的意义只有两条：让 `config.recipe: 'explainer'` 有据可查；防止未来新配方把 explainer 的规则散抄进自己（要引用，走第 1 节的表）。
