# v3.9.0 — 配方层语法吸收：演绎四件套 + 三铁律 + facts 白名单

日期：2026-10-07 ｜ 前置：v3.8.0 轴 L（lanshu 风格卡吸收）｜ 用户指令："只要是有价值的，那就做"

## 做了什么

lanshu 配方层三大机制本土化落地（机制借鉴 lanshu-create-ai-presenter-video，MIT——全部 Remotion 重写，接在 a2v 已有设施上，不另起炉灶）：

### 1. 词级点亮字幕的数据层（tts_build.py）

- `chunk_starts()` 现在同时返回**每块逐字符起始秒**（此前 `char_t` 逐字符时间算完即丢）——无词边界字符（标点）继承前字符
- `synth_sentence()` 边引擎双路：edge=实测词边界逐字符；kokoro=块内线性估计（块起点仍精确）
- `SubEntry` 新增可选 `chars?: number[]`（逐字符起始帧，长度==text 字符数）写进 src/common/subs.ts；旧工程数据缺省该字段，**渲染逐值等价**
- 单测：ast 抽取 chunk_starts 纯函数离线执行（块内对齐/标点继承/跨块边界全断言 PASS，不落 pycache）；**live TTS 复验已完成（2026-10-07）**：发现 edge-tts 7.2.8 `Communicate` 默认 `boundary='SentenceBoundary'`（零词事件、chars 退化平铺）——`synth_edge` 显式传 `boundary='WordBoundary'` 修复，复验 9 词事件、chars 单调非平（块一 [29,29,43,48,52,52,52]）、渲染帧逐字点亮与数据对应（grammar-lab f45/f95，坑已回写 lessons.md）

### 2. 演绎四件套组件（template/src/common/kit/，props 驱动、kit 不引 recipes 防循环）

| 组件 | 机制 | 底料 |
|---|---|---|
| `WordLitCaption` | 逐字符点亮（easeOutQuad 5f），unlit=38% 同色或 unlitColor 幽灵垫底双层 | `SubEntry.chars` |
| `ChapterBadge` | 章节角标（10f 淡入上浮+下划线画出，to 前 8f 淡出） | `CHAPTER_STARTS` |
| `GoldenQuote` | 结尾金句（maskRise 逐字升起 105%→0 + emphasis 染色 + 规线 scaleX 画出） | props |
| `RecapFrame` | 一帧复习（tagline+要点网格错峰+阅读高亮轮巡+`constantPush` 恒速微推——90% 线性分量，结尾绝不静止） | props |

验证：grammar-lab scratch 工程（samples-l1/grammar-lab）typecheck 0 错 + stills f30/f100/f120 目检——逐字点亮半亮态、角标、金句 emphasis、复习帧高亮轮巡全部正确。过程中修了两处：GoldenQuote `y` 类型放宽 `number|string`；WordLitCaption 的 N 改可选+内部 useCurrentFrame 兜底（与兄弟组件一致，防 N={0} 常量误用）。

### 3. facts 白名单（接 claims，机器验"绑没绑对"、人审"内容越不越界"）

- `script/storyboard.json` 镜头可选 `facts: number[]`——指向 claims 下标，声明"本镜头画面演绎的事实以这几条登记为准"
- `check-plan.mjs` 校验：非数组/负数/非整数/越界即红；空数组合法（纯装饰镜头显式声明）
- `runtime.test.mjs` 新增 7 断言用例（正路径/空数组/越界/负数/非整数/未声明 claims/非数组），runtime 18/18 绿
- 边界（诚实声明）：机器只验索引合法性；画面内容是否真在白名单内仍靠 C 轮人审——代码画面可 grep 对账，AI 素材镜头按素材三查

### 4. 演绎三铁律（directing-playbook.md 新节）

每口播关键词一个可见解释动作（beat sheet 逐拍问）／禁死空间（合法静止只有 0.3–0.7s 逗号与带微动效结尾定帧）／相机禁停泊（`constantPush` 替代 easeOut 收死）。判据复用现有 probe_motion_quality/probe_liveness，未新增门禁（免"验收工具也要被验收"的连带成本）。

### 文档接线

production-contract.md（分镜节 facts 字段规格+示例）/ directing-playbook.md（三铁律节）/ recipes/explainer.md（事实绑定+三铁律+四件套接线）/ SKILL.md（§2 chars 产出、§3 facts、资产段四件套、版本 3.9.0）/ hosts ×6 / LICENSE 借鉴登记已随 v3.8.0 落位。

## 未做与理由

- WordLitCaption 未替换 Subtitle.tsx 默认字幕——Subtitle 是全片默认带，四件套是按块/按片 opt-in（与"默认输出逐值等价"纪律一致）
- 未新增死空间/停泊探针——现有探针+beat sheet 纪律已覆盖，加门禁必须连带负路径元验证，收益不抵成本
- RecapFrame 布局是通用网格，不做 lanshu 式双列引线束版式——那是卡片级语言（blueprint BPLeader 已有引线束，按需组合）
