# jury-review — D 轮独立评分评审（第四轮验收）

> 2026-10-06 全案轴 A 落地，机制移植自 [mg-styles-15](https://github.com/Vincentwei1021/mg-styles-15) `rubric.md`（MIT）并 a2v 化。
> 定位：三轮验收（A 工程/B 视听/C 反向）全部通过**之后**的审美攀登轮。三轮管"对不对"，D 轮管"好不好"——
> `check-qc` 通过只证明技术与声明完整，不证明审美，本轮补的就是这一层。

## 独立性规则（不可妥协）

- **评委不是作者**：评审必须由独立会话执行——ZCode/Claude Code 用 general-purpose subagent（主控只递成片路径、画幅规格与配方卡签名特征，不递制作过程与自我评价）；无 subagent 的宿主开新会话。
- 作者收到评审后**先保版本**（成片+源码拷为 version-N）再改；禁止边看意见边改边覆盖。

## 触发与门槛

- 触发：三轮验收通过后、最终交付前，每片必跑（除非用户明确说跳过——记录）。
- **门槛：7 维中任一维度 <7 = 阻塞，必须按修复清单改并复审该维度**；≥8 不设硬门（攀登语义，防无限循环）。修复轮上限 3 轮，3 轮后仍有 <7 维度 → 如实列出升级给用户，不得自动放行。
- 复审只重看被 fix 触及的片段与维度（媒体变了旧证据作废的纪律照旧）。

## 评审提示词（整段发给独立评委）

```text
You are a senior motion-design jury member (Motionographer editor / Buck–ManvsMachine creative director /
抖音·B站头部设计号主理人). You did NOT make this film. Judge it harshly and precisely. Kindness is useless;
specificity is everything. A template-looking or "AI-average" result is a fail.

The film: <成片绝对路径>. 画幅与规格声明: <project.json 的 w×h@fps，总长>. 本片风格卡的签名特征
（来自 styles/<sku>/SPEC.md 或配方卡，逐条附上）: <签名特征/锁死项全文>。

1. 真看片，证据先行：
   - 接触表：≤60s 片每 0.5s 一帧；≥60s 长片每 1s 一帧 + 最快段与 hero moment 邻域 0.25s 加密；
   - 全分辨率抽帧 5–8 个关键时刻，放大看小细节：边缘、字形与标点、走样、色带、纹理、裁切；
   - 最快运动段逐帧看 spacing/easing/arc/overlap。
2. 规格核查：时长与 project.json 一致、分辨率/fps 一致、音轨存在、整轨响度 ≈ -14 LUFS(±1)、
   true peak ≤ -1 dBTP、无意外黑场、无意外静止跨段、声明卡拍的镜头音画落点对齐。
3. 七维评分，1–10 打分（5=合格学生作业；6=模板级；7=扎实专业；8=高端代理商；9=获奖入围；10=世界最佳）。
   首渲通常 5–7 分。禁止膨胀：
   - style_fidelity   风格保真：专家一秒认出风格；签名特征逐条在场且做法正确（对照上面附的 SPEC）
   - concept_wow      概念惊艳：开头 0.5s 内有钩子、hero moment 无可误认、结尾定帧令人满足
   - motion_craft     动效工艺：缓动/spacing/overlap/预备与跟随/弧线/转场由元素承载；无死场无抖动
   - design_typography 设计版式：构图/层级/网格/排版（含中文标点）/留白/调色纪律
   - finish_texture   质感收尾：光影/纹理/颗粒/辉光符合风格意图；无色带/走样/伪影
   - sound_sync       声音与同步：音乐气质对风格、音画落点、SFX 不打架、混音响度
   - technical        技术硬指标：规格、字体加载（无 fallback/tofu）、无毛刺闪跳
4. 给 5–10 条修复，按"对最终印象的影响力"排序。每条：时间码 → 可观察的问题（不是口味）→ 为什么
   要紧 → 具体做法带数字（缓动曲线/帧数/px/色值/字号/布局）。至少一条必须提升 wow，不只是打磨。
5. 以下按 critical 标出（等价于一票缺陷）：任何"generic/AI 模板感"段落、不自然的中文文案、
   fallback 字体或豆腐块、任何规格违规。

返回三件：评分表（7 维+总分）、critical 清单、按影响力排序的修复清单。
```

## 修复提示词（回到制作会话）

```text
独立评审已出。评审全文：<粘贴>
先保当前成片与源码为 version-N，再动手：
- critical 全部处置；高影响力修复逐条落实。可用更好的等价方案替代某条，但要说为什么。
- 评审没覆盖到、你看到更大的提升空间（尤其 wow 维度）可以超出清单去做；评审点名的优点不许回退。
- 全分辨率重渲、规格复测、修复片段逐帧看到真正落地为止。
- 逐条报告：已应用/跳过及理由。
```

## 产出：qc/jury.json（进交付证据链）

```json
{
  "round": 1,
  "juror": "general-purpose subagent <id/说明>",
  "scores": {"style_fidelity": 0, "concept_wow": 0, "motion_craft": 0,
             "design_typography": 0, "finish_texture": 0, "sound_sync": 0, "technical": 0},
  "overall": 0,
  "critical": [{"at": "00:12", "issue": "", "evidence": "帧/片段引用"}],
  "fixes": [{"rank": 1, "at": "", "issue": "", "why": "", "how": "", "applied": true, "note": ""}],
  "gate": "pass|blocked(<7 维度列表)",
  "evidence": {"contact_sheet": "路径", "stills": ["路径"], "loudness": "-14.1 LUFS", "true_peak_dbtp": -1.3}
}
```

- `check-qc` 现行门禁不强制 jury.json（三轮照旧）；**交付说明必须附 jury 评分与 gate 状态**——gate=blocked 未清零不得交最终版（同三轮纪律）。
- 媒体或源码变化后旧 jury 证据作废，修完重评被触及的维度并更新 round。
- 自评联动：制作会话交付报告的七维自评（production-contract §交付）与 jury 评分差 ≥2 的维度，在报告里写一句差距归因。
