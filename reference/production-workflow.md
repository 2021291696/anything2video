# 生产流程 v3

本流程跨宿主共用。配方负责叙事与风格，工程和最终验收遵循 production-contract.md。用户已授权自主决策时，由主控完成稿件、音色与小样审定并记录理由。

## 1. 能力与工程

记录实际入口路径、Node/npm/uv/ffmpeg/ffprobe/Chromium 是否可用，以及图像、视频播放、音频听取、TTS、图像生成、子代理各自是否实测。可读图片不等于可读 MP4，可读视频不等于能听音频。缺项只影响对应操作，不能写成 passed。

沿既有视频数据根，在 skill 外初始化空工程：`node <skill>/scripts/init.mjs <slug>`，或显式 `<工程> <slug>`。数据根优先 A2V_DATA_ROOT，再读 ~/.anything2video/workdir；未知先问并持久化，不散落当前目录。进入工程安装依赖：`npm install`、`uv sync`、`npx remotion browser ensure`。初始化默认 status=draft；模板不是完整片子。

## 2. 调研与导演决定

写 research/creative-brief.md：受众、一个学习目标、看完能做的操作、平台、画幅、语言、时长范围、可信事实、贯穿示例、主角和首尾关系。事实表保留 URL/用户材料/本地可复测证据和访问日期。

参考片记录实际查看的时间段、可借的方法和证据等级；不以帖子标题或视觉猜测证明制作模型。参考资料缺失时可继续，但明确未对标原片。读 directing-playbook.md，把稿件转换为原因、动作和结果。

风格拿不准先放映 samples/ 的真实片段，再用同内容的两种小样比清晰度和质感；已有风格复用 SPEC 并做样张回归。已指定或授权主控决定则记录选择理由。风格决定后固定共享图元和接口，避免每组重新设计。

## 3. 稿件与真实时间轴

教学稿包含前提、步骤、结果和失败修复。每句旁白一行，用 `|` 切字幕；不能只念屏幕标题。先定稿、生成或导入清洁配音，再从真实音频建立句子时间轴。

工程内运行 `uv run python scripts/tts_build.py`；TTS 不可用则导入已授权音频，不能假设凭宿主名就有语音通道。无旁白影片用 `chapter_timeline.py`，从 project.json 的 fps 建章表，保留 material 等元数据。音乐可无；需要音乐先按 bgm-bakeoff.md 试听定曲，再进分镜与建组。明确无音乐或已有选曲授权时记录决定。核对许可，清晰拍点可辅助动作，不能反过来压缩理解时间。

`audio_narration.wav` 是正本，`audio.wav` 是混音派生物。运行 `uv run python scripts/mix_audio.py`，风格音效仅显式选择。钉帧音效在混音后第三步 `uv run python scripts/mix_sfx.py`（cues 表 + `audio/sfx/sfx-mix.json` 台账；重跑混音后必须重跑本步，工具防双混）。检查头尾、中段对位、削波、响度、音色和背景遮挡，首句 onset probe 只证明首句。

音频脚本以 project.json 的 slug/fps 为准，config slug 不一致先同步真实资产引用；已有正本只在授权更新时用 tts_build.py --force。TTS 会更新 totalFrames；重建音频后分镜、字幕、覆盖层和实际 Composition 同步核对，再运行 TypeScript 和真实渲染。

## 4. 分镜与多点打样

声明 project.json 与 script/storyboard.json，完整结构见 production-contract.md。每镜头目的、动作、结果、素材与局部/全局帧号明确；覆盖全片，核对真实 Sequence 挂载。

渲开场、复杂中段、结尾的真实运动小样，使用目标画幅、实际配音与字幕。尚未实现全片时，在工程外的独立 draft 样片工程内声明准确的样片帧数和完整镜头表；不删除主工程未完成镜头来假装全片完成，也不绕过 check-plan 或 TypeScript。

中段/末段命令：`node <skill>/scripts/render.mjs <工程> preview <秒数> <1起开始帧>`。不同范围默认同名 preview，比较多个小样时给不同 VER 不会改 preview 文件名；用独立样片工程或把前次产物及 sidecar 成对归档后再明确 --overwrite。

## 5. 建镜头与整合

先定共享 API，再按独立文件所有权派单。任务书含分镜、资产、图元接口、1起含端点到 Remotion 0起的转换、禁改边界和验收命令。进度、结果和缺陷写磁盘；不要在 prompt 中来回搬运大段 JSON。

没有子代理就顺序做。主控核对镜头注册、章间边界、共享状态、字幕和音频。占位或 null 组件虽然可能通过类型检查，不能通过 registration、visual 或 teaching 审核。

## 6. 渲染与三种检查

所有模式先 check-plan 和工程本地 TypeScript。输出默认保护，明确 --overwrite 才覆盖；同输出互斥，不同 bundle 可并行。正式全片渲染前把 status 改为 production，再运行 video。

每次 bundle 使用独立目录并关闭共享 webpack 缓存，避免并行 pack 文件 rename 竞争。此选择可能增加打包时间，渲染吞吐仍需同机实测；不用假定缓存性能收益。

渲染 sidecar 记录实际媒体 SHA256、源码清单哈希、模式、帧范围和 ffprobe；默认 visualReview/audioReview=not_performed。它是技术记录，不是成片合格证。

三轮分别看：工程真实性；视觉、动作、教学和听感；反向挑最弱镜头、事实和发布说明。每轮写 qc/round-N.md：缺陷、原因、改动文件、重渲哈希、检查范围与保留项。轮数不替代结果，阻塞项未清零就继续修根因，必要时重做稿件或整章。

## 7. 最终证据与交付

看完整实际媒体、听完整音轨，记录工具、审查者和全片范围。无播放/听取能力的项目保留 not_performed，可交待审稿和工程，不标最终通过。

按 production-contract.md 写 qc/final.json，执行 `node <skill>/scripts/check-qc.mjs <工程> qc/final.json`。该工具核对声明、媒体、源码、范围、证据文件和解码；它不能证明审查者真的观看，也不能自动打审美分。

源码、素材、字幕、音频或配置任何变化都让旧渲染证据失效。重新渲染，重新检查受影响片段和边界，再做全片播放与听取。最终交付 MP4、可复现工程与锁文件、字幕、封面、事实与素材清单、原始规格和 QC。保留未测试的宿主能力及待审项。

抖音做原生竖屏与实际发布预览，适用时启用 AI 声明；X 长文/线程按账号权限；GitHub 只发授权仓库，排除密钥、缓存、他人视频和隐私日志。模型替代声明限定为本制作任务，不写全面能力等价或过审保证。
