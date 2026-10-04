# 配方：explainer（讲解片）

面向知识主题制作带旁白、字幕和因果演示的教学视频。默认沿用 anything2explainer 的 MG 体系；画幅、宿主、授权、素材与音频规则以本包 `SKILL.md` 和 `reference/production-contract.md` 为准。

## 随包规范

规范快照在 `reference/explainer/`，无需另装外部skill。上游署名见该目录README。依次阅读以下文件（均相对此目录）：

- `style-guide.md`：调色板、字体、图元与版式。
- `motion-vocabulary.md`：入场、强调、离场、运镜与衔接。
- `composition-and-light.md`：主体、光照、纵深与QC。
- `narration-storyboard.md`：稿件、配音、字幕与分镜。
- 调研时读 `research-brief.md`；派单时按需读 `agent-build-rules.md`、`agent-qc-rules.md` 和 `prompts.md`。
- `lessons.md` 按风险查阅。质量参考在 `sample-rag/` 和 `contrast-frames/`。

历史快照中的tmux、本机路径、独立确认点与画幅不覆盖统一契约。竖屏教学需要重新构图。

## 教学设计

先定一个观众看完能完成的任务。每个镜头记录purpose与action，让请求、文件或对象发生能解释知识的变化；字幕、指示线与动作表达同一因果。术语列表、标题入场和装饰循环不能代替机制演示。

黑底MG是默认值，主题需要时可以使用明暗章节或审核过的材质底。精确文字、数字与图解由代码绘制。素材来源、完整提示词、许可、哈希与披露按统一契约登记。

## 模板接线

`template/src/config.ts` 的 `recipe: 'explainer'` 选择对应覆盖层。模板图元与音频脚本可复用；须挂载真实镜头组件并核对覆盖。工程在skill外，Node初始化与渲染入口见主SKILL。结构化分镜1起含端点，Remotion0起，只转换一次。类型检查、分镜合同与实渲染分别验收。

## 审定与交付

按主SKILL走完整流程。用户已授权主控决定的稿件、音色和样片，由主控审定并记录；有子代理才并行，无子代理顺序完成。先验开场、复杂中段与结尾，再完成工程、教学、反向三轮审片。交付成片、工程、字幕、声音、封面、素材与事实来源及实测规格。镜头是否解释清楚必须通过实际片段判断。
