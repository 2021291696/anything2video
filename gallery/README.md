# gallery/ — 镜头动效词汇库（移植自 video-shotcraft）

> **出处**：[video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft)（Apache-2.0），
> 2026-10-06 全量移植（commit 快照见 `cards/ATTRIBUTION.md`）。许可证副本：
> `LICENSE-THIRDPARTY/APACHE-2.0-video-shotcraft.txt`。卡内容逐字保留（含其内部判例引用），
> 后续本 skill 自己的新卡直接追加，不改写原卡。

## 这是什么

157 张**镜头配方卡**：每张卡 = 一个经过实战返工打磨的动效镜头的完整知识——
意图、动效核心、**参数表（典型值 / 调节手感 / 带日期的判例）**、声音钉点、已知坑、
参考实现源码指针。分镜时抽卡，实现时照卡的参数和判例做，不要从零猜动效。

## 目录

| 目录 | 数量 | 内容 | a2v 何时用 |
|---|---|---|---|
| `cards/typography/` | 26 | 文字揭示、逐字、计数、标题卡 | 讲解片字卡、要点、数字 |
| `cards/data/` | 13 | 网格构建、数据流入、图表 | 事实、数量、对比 |
| `cards/ui-entrance/` | 28 | 卡片墙、列表涌入、面板进场 | 内容量大/清单类镜头 |
| `cards/transition/` | 19 | 镜间转场、擦除、变形 | 全类型通用 |
| `cards/rhythm/` | 11 | 节拍卡点、闪切、踩点 | 配强节奏 BGM 时 |
| `cards/opening/` `outro/` | 11+7 | 开场悬念、结尾定版 | 全类型通用 |
| `cards/camera/` | 10 | 运镜、推拉、环绕 | 空间交代、材质特写 |
| `cards/effects/` `interaction/` | 17+15 | 材质特效、交互隐喻 | 风格化叙事、custom 配方 |
| `demos-ref/` | 248 文件 | 每张卡的参考实现源码（原仓 `demos/`） | 实现前读对应源码 |
| `lib-ref/` | — | 原仓 `assets/lib/` 全量（含未编入 kit 的 three.js 组件） | 参考 |
| `promo-energy-arc.md` | — | 宣传片能量曲线编排法 | promo/epic 配方分镜 |

**路径映射规则**：卡内「参考实现」写的 `demos/…` 路径，在本 skill 中是
`gallery/demos-ref/…`；卡内提到 `assets/lib/` 的，先看 `template/src/common/kit/`
（已编入，可直接 import），不在 kit 的再查 `lib-ref/`。

## 怎么用（接入 a2v 流程）

1. **分镜阶段**（流程 §3）：按镜头 purpose/action 到对应类别抽 2-3 张候选卡，
   在 `storyboard.json` 每个镜头的 `component`/`action` 里记卡名（如 `deck-deal-flyin`）。
2. **实现阶段**（流程 §5）：完整读卡——参数表是硬数据（bezier 值、帧数、缓动），
   「调节手感」列和「已知坑」是判例，**优先级高于自己的直觉**；再读 `demos-ref/`
   里对应源码，按本片画幅/时长重排后实现。
3. **组件**：`template/src/common/kit/`（PageCam 2.5D 运镜、DigitRoll 数字滚、
   FlashCut 闪切、VerticalTicker 滚动墙、lagged/dampedSettle 跟随回弹、mulberry32
   确定性伪随机）`import … from '…/common/kit'`。
4. **纪律不变**：卡词汇服务于镜头，仍须遵守 `reference/production-contract.md` 的
   镜头合同、seeded 可复现、每帧覆盖无洞重叠；卡的判例与本 skill 合同冲突时合同优先。

## 卡格式速读

frontmatter：`name / 一句话 / 适用 / 时长 / 能量`。正文六段：意图、动效核心、
参数表、声音、已知坑、参考实现。参数表「判例（日期）」= 实战用户裁决记录，
照做可以少走一轮返工。
