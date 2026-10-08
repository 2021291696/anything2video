# 配方：explainer（讲解片）

面向知识主题制作有因果演示、可照做步骤与结果的教学视频。默认旁白与字幕，也可制作明确声明的无旁白样片；画幅、宿主、授权、素材与音频规则以本包 `SKILL.md` 和 `reference/production-contract.md` 为准。

## 随包规范

先读本包 directing-playbook.md 和 production-workflow.md。竖屏接线见 reference/portrait-wiring.md。历史快照在 `reference/explainer/`，无需另装外部skill；上游署名见该目录README。仅选择黑底MG或需要具体组件知识时，按需完整读相应文件：

- `style-guide.md`：调色板、字体、图元与版式。
- `motion-vocabulary.md`：入场、强调、离场、运镜与衔接。
- `composition-and-light.md`：主体、光照、纵深与QC。
- `narration-storyboard.md`：稿件、配音、字幕与分镜。
- 调研时读 `research-brief.md`；派单时按需读 `agent-build-rules.md`、`agent-qc-rules.md` 和 `prompts.md`。
- `lessons.md` 按风险查阅。静态构图与历史工程参考在 `sample-rag/` 和 `contrast-frames/`，不能推导当前整片动态或听感已通过。

历史快照中的tmux、本机路径、独立确认点、固定画幅、色板、效果数量和强制微动不覆盖统一契约。按当前任务选择风格与阅读停留，竖屏教学需要重新构图。共享导演与多点打样见 directing-playbook.md 和 production-workflow.md。

## 教学设计

先定一个观众看完能完成的任务。每个镜头记录purpose与action，让请求、文件或对象发生能解释知识的变化；字幕、指示线与动作表达同一因果。术语列表、标题入场和装饰循环不能代替机制演示。

**事实绑定（v3.9.0）**：讲解片的"事实镜头"建议全部声明 `facts: [claims 下标]`（格式与校验见统一合同分镜节）——画面演绎的事实以登记过的 claims 为准，C 轮反审逐镜头按绑定核对；纯装饰/过渡镜头用空数组显式声明。

**演绎三铁律**（全文见 directing-playbook.md）在本配方是硬要求：每个口播关键词一个可见解释动作；禁死空间（合法静止只有 0.3–0.7s 逗号档与带微动效的结尾定帧）；旁白进行中相机禁停泊。

**结构四件套**（`common/kit/`，v3.9.0，颜色 props 传入配方 chrome token）：
- `WordLitCaption`：逐字点亮字幕，底料是 tts_build 写进 `SubEntry.chars` 的逐字符起始帧（edge=实测词边界；kokoro=估计）。整片卡拉OK风或重点句升级按块选用；不传 chars（旧工程）自动退化整块淡入。
- `ChapterBadge`：章节角标，数据源 `timeline.ts` 的 CHAPTER_STARTS，to 传下一章 from-1。
- `GoldenQuote`：结尾金句（maskRise 升起 + emphasis 染色 + 规线画出），放在收尾段、复习帧之前。
- `RecapFrame`：一帧复习（tagline + 要点网格 + 阅读高亮轮巡 + 恒速微推），占结尾定帧段 0.8–1.2s 以上的呼吸位，替代"最后一帧死静止"。

明确授权无旁白样片时，用 chapter_timeline.py 从 project.json 建字幕/章表，并声明故意无声 audio.mode=silent；静音床仅保证技术接线。正式有声教学不能借此掩盖失败配音。无声也需实际全片播放审查。

按观众、主题与已有风格决定视觉；黑底MG是可选路线，主题需要时可用明暗章节或审核过的材质底。精确文字、数字与图解由代码绘制。素材来源、完整提示词、许可、哈希与披露按统一契约登记。

## 模板接线

`template/src/config.ts` 的 `recipe: 'explainer'` 选择对应覆盖层。模板图元与音频脚本可复用；须挂载真实镜头组件并核对覆盖。工程在skill外，Node初始化与渲染入口见主SKILL。结构化分镜1起含端点，Remotion0起，只转换一次。类型检查、分镜合同与实渲染分别验收。

## 审定与交付

按主SKILL走完整流程。用户已授权主控决定的稿件、音色和样片，由主控审定并记录；有子代理才并行，无子代理顺序完成。先验开场、复杂中段与结尾，再完成工程、教学、反向三轮审片。交付成片、工程、字幕、声音、封面、素材与事实来源及实测规格。镜头是否解释清楚必须通过实际片段判断。
