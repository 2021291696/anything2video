# anything2video v3.6 方法论与工具增强（huashu-art-motion 吸收轮）

2026-10-06。应「根据 huashu-art-motion 开源仓优化 a2v」的要求，对该仓（MIT，
https://github.com/alchaincyf/huashu-art-motion，36 风格场景 + 9 解说语法 + Canvas 引擎 +
量化 QA + 参考片拆解工具）做全量深读后差距分析，按「跨栈可移植、不引入第二渲染栈」原则
吸收其方法论与工程工具。 Remotion 主链路、套餐制、验收门禁一律不动；本次是增量版本。

## 移植判定（吸收什么、不吸收什么）

- **吸收**：与渲染栈无关的方法论（拆解、签名转场、运动密度语义、数字口径、经验回流双轨）
  和与渲染栈无关的工具（ffmpeg+numpy 级分析/探针）。
- **不吸收**：huashu 的 Canvas 引擎、36 个风格场景代码、17 个 lib——那是与 Remotion 并列的
  第二渲染栈，塞入只会造成双栈维护负担；其价值已通过方法论层移植兑现。
- **互相印证不重复收录**：独立审片（本 skill 已有 D 轮 jury，huashu 经验 16 为同构）、
  先稳定共享接口再并行（编排协议已有，huashu 经验 15/36 同构）。

## 变更内容

### 新增脚本（3，均 PEP 723 内联依赖、`uv run scripts/<名>.py` 脚本模式运行）

- `scripts/reference_breakdown.py`：参考片拆解工具（移植自 huashu `breakdown.py`，MIT）。一条
  命令产出接触表 / 逐帧差 `diff.npy` / 转场起点+节拍网格拟合（80% 内点下最大步长） / 每转场
  高帧率接触表 / 运动热图 / 关键帧总览 / `ref/seg??.png` 参考帧。服务 production-workflow §2 调研
  与 aesthetic-rules P2（参考素材先拆解成手法清单）。
- `scripts/probe_motion_quality.py`：成片级运动连续性探针（判据移植自 huashu `qa.py`）。运动
  面积%、静止帧对%、孤立跳变（>3% 且 >6× 局部中位数，附前后帧证据拼图）、最长静止段＋全片
  运动热图。线索不定罪：合法静止（呼吸章/定帧/阅读镜头）按 beat sheet 豁免登记定性。
- `scripts/probe_subtitle_band.py`：字幕带侵入门禁（移植自 huashu `subzone_gate.py`，按本 skill
  画幅参数化 `--band-ratio`，竖屏 0.73 / 横屏 0.78）。默认只开深色像素路（浅底风格主路）；
  亮像素路默认关闭——冒烟实测深底片星点/粒子层 flood（deep-space 样片 128/128 帧命中、单帧
  13.8 万像素），要用须抬 `--thresh` 并逐帧定性。

### 新增文档

- `reference/reference-breakdown.md`：参考片拆解方法论（huashu 01 号 a2v 化）：何时用、证据
  边界（拆解产物=结构/节奏/手法证据，帧不进成片）、五步读法、数字→beat sheet/分镜/creative-brief
  的接线、坑（参考帧取转场前最后一帧等）。
- `LICENSE-THIRDPARTY/MIT-huashu-art-motion.txt` + 三个脚本文件头 attribution。
- 本记录文档。

### 增强文档（6）

- `reference/ai-frame-sop.md` §2.5「一帧先行：四条路线」：A 纯代码 / B AI 分层绿幕（保留原画面
  坐标抠图法）/ **C 首尾同帧图生视频**（epic 世界底从「静帧+Ken Burns」升级为「画里的东西自己
  动」的直接方法：首尾同帧=可无缝拼接/只换中段；prompt 三段结构；5s 取 1s 按节奏变速）/
  D 混合；设定稿坑（审核敏感词、部位化描述、动作压姿势、文字交代码）与生成验真两查
  （输出目录文件数、PNG info 无 ImageMagick date:create）。
- `reference/directing-playbook.md`：新增「签名转场」节（四步法：找物理过程→污染旧画→新画从
  过程形状里露出→拍点双层冲击；自绘开场；复杂签名转场按时长 0.48–0.5s）、「运动量按配方语义
  读」（探针数字按镜头任务解释；防「低帧率重洗=闪」假活）与反向轮数字口径三条判例（倍数表述/
  图表不撒谎/口径一致性）。
- `reference/production-contract.md`：beat sheet 增「事件锚词不锚裸秒」纪律；三轮证据工程轮增
  probe_motion_quality；增「验收工具也要被验收」（新门禁上线故意制造一次失败确认会红，huashu
  经验 25）；竖屏节增字幕带门禁。
- `reference/lessons.md`：回填纪律升级双轨（坑→历史表；正面→新设「正面经验」节，格式=做法＋
  证据＋为什么＋何时用）+ 回写归宿表；首批注入 10 条 huashu 跨栈经验（拆解先行/母题小循环/
  材料即物理过程/相机只由时间决定/镜头只进不退/段长递减加速/小元素放大/入场慢退场快/竖屏
  半句焦点/参数化换不友好输入审），全部标注 ⟨hN⟩ 来源与「本 skill 复验：待」状态——复验成功
  才转正为本 skill 判例。
- `reference/style-ledger.md`：新增「短板登记」节（huashu INDEX 模式）：每卡登记当前短板+实据+
  状态，新卡入库必有一行；首批登记 ink-tea / paper-collage / hanazi-916 三行（全部有既有实据）。
- `SKILL.md`：调研挂拆解工具、A 轮挂运动探针、发布挂字幕带门禁、回写升级双轨、资产清单补三
  脚本与来源；版本 3.5.0 → 3.6.0。

## 验证记录

- 三脚本冒烟（对 `samples/` 现役样片）：reference_breakdown 于 deep-space-sample 检出 2 转场、
  七类产物落盘；probe_motion_quality 于同片出 运动 2.08%（峰 15.98%）/ 静止帧对 3.1% / 5 处
  孤立跳变+证据拼图；probe_subtitle_band 三画幅/三风格跑通，swiss-print 浅底 128/128 命中为
  真实信号（样片结尾卡在字幕带区，即该门禁设计目标）。
- Node 侧零改动：`node --test tests/editions.test.mjs tests/qc.test.mjs tests/runtime.test.mjs`
  39/39 通过（基线与改后一致）；check-plan/check-qc/render 行为未变。
- 已知边界：三脚本为成片/参考片级分析工具，不经 check-qc 强制门（motion check 仍 method=
  playback，探针输出当 evidence 之一）；PEP 723 首跑需联网装 numpy/pillow（uv 自动）。

## 三端与发布

实体在 `~/.agents/skills/anything2video/`，`anything2video-codex/`、`anything2video-zcode/` 为
镜像副本（本版本三端同步 diff=0），`.claude/skills/`、`.codex/skills/` 为 junction 自动跟随。
开源仓 fork（2021291696/anything2video）与本 skill 处于分叉状态，本轮不同步（回灌另行拍板）。
