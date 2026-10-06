# 视觉样片库

现役 19 段是套餐制样片（2026-10-06）：11 段 **v3.4.0 首批**（用户逐卡验收通过）+ 8 段 **v3.5.0 轴 D 新卡**（配乐走 mgaudio 程序编曲通道）。每张套餐卡一条 12-15 秒微型成片，卡的类型骨架 × 卡的风格视觉，1280×720（花字卡 1080×1920 竖屏原生）、30fps、H.264，带完整音频（TTS 旁白 + 音效 + BGM）。镜头优先移植自已验证源工程（见下表）；机身件（字幕/进度条/结尾）由工程 `config.style` 自动换皮。样片证明卡的视觉与结构观感，不等于当前宿主端到端认证，也不替代整片 QC。

另保留 3 段历史配方样片（`recipe-*.mp4`，6 秒无音轨），作为配方层的期历史参考。

打开 index.html 可离线播放（类型 × 气质双筛选，19 卡）。manifest.json 登记每段发布文件 SHA256、原输入 SHA256、来源工程、素材模式、披露和真实规格；哈希与规格为实测值，不手填。

posters/ 是从对应发布 MP4 第 2 帧实际抽取的预览封面，与正片同源同许可。

## v3.4.0 首批样片（11）

| 片段 | 来源工程 | 音频 |
|---|---|---|
| deep-space | s34-deepspace（深空×宣传，手法借 shotcraft-promo） | TTS + SFX + BGM Vertigo |
| mg-purple | s34-nightflight（夜航×讲解，explainer 配方组件） | TTS + SFX + BGM Echoes |
| epic-paper | s34-myth（神话×史诗，纯代码构图） | TTS + SFX + BGM Classical Vibes 2 |
| sand | s34-sand（图元移植 usa250-sand） | TTS + 沙音通道 + BGM Tapis |
| chalk | s34-blackboard（图元移植 chalk-math） | TTS + 粉笔/板擦 SFX，无 BGM |
| blueprint | s34-blueprint（图元移植 blueprint-bridge） | TTS + SFX + BGM Tapis |
| neon | s34-neon（图元移植 neon-city） | TTS + SFX（雨床为静噪替代，已披露）+ BGM Staring at the Night Sky |
| pixel-arcade | s34-arcade（图元移植 style-samples/pixel-arcade） | TTS + 8-bit SFX + BGM Keeping Fit |
| paper-collage | s34-collage（图元移植 style-samples/paper-collage 与 qr-scan） | TTS + SFX + BGM Tears of Joy |
| swiss-print | s34-swiss（图元移植 style-samples/swiss-print） | TTS + click SFX，无 BGM |
| crt-terminal | s34-terminal（叙事骨架移植 style-samples/crt-terminal） | TTS + 键盘/beep SFX，无 BGM |

每卡工程（`科普视频/samples-v34/<slug>/`）内 `research/` 登记逐项音频来源与 Mixkit 曲目号；`qc/self-check.json` 记录验收线（人工听感为 not_performed，以听众耳判为准）。

## v3.5.0 轴 D 新卡样片（8）

BGM 全部为 mgaudio 程序编曲（`audio-engine/mgaudio`，MIT+CC0，vendor 溯源见 `audio-engine/VENDOR.md`；编号 slug 即配方名），免外部音乐许可；SFX 钉帧台账在各工程 `audio/sfx/sfx-mix.json`。

| 片段 | 来源工程 | 音频 |
|---|---|---|
| guofeng-scroll（月窗） | s34-guofeng《公元366年·一点金光》 | TTS + 程序编曲 BGM（15-guochao）+ SFX 钉帧（含朱印拟音） |
| paperclip-sticker（贴纸人） | s34-paperclip《心跳的一天》 | TTS + 程序编曲 BGM（19-paperclip）+ SFX |
| hanazi-916（花字，9:16 竖屏原生） | s34-hanazi《猫主子的四种喜欢信号》 | TTS + 程序编曲 BGM（18-hanazi）+ SFX 19 点钉帧 |
| aurora-glass（玻璃） | s34-aurora《深夜的专注》 | TTS + 程序编曲 BGM（12-aurora-glass）+ SFX |
| line-art（线条） | s34-lineart《一座桥的受力》 | TTS + 程序编曲 BGM（02-line-art）+ SFX |
| isometric-city（等轴） | s34-iso《一条视频的渲染小城》 | TTS + 程序编曲 BGM（03-isometric）+ SFX |
| morph（形变） | s34-morph《形态的旅行》 | TTS + 程序编曲 BGM（08-morph）+ SFX |
| liquid-flow（液态） | s34-liquid《一盏茶汤》 | TTS + 程序编曲 BGM（07-liquid）+ SFX |

工程在 `科普视频/samples-d8/<slug>/`；逐卡签名特征、QC 豁免档与登记判据见 `styles/<sku>/SPEC.md`，短板见 `reference/style-ledger.md` 短板登记节。

## 历史配方样片（3）

| 片段 | 原工程/模式 |
|---|---|
| recipe-promo | a2v-skill-promo v3，代码合成，已移除音乐与合成配音 |
| recipe-epic | skill-epic v4，MiniMax image-01 生成世界底 + 代码字幕/图形 |
| recipe-explainer | bowen-daily，代码合成讲解 |

## 许可与披露

- 代码与本文档 MIT。生成内容不因与 MIT 代码合成就自动获得独占著作权，受实际服务条款约束。
- 新样片音频：BGM 与音效来自 Mixkit Free License（逐曲目号见 manifest 与各工程 research/）；TTS 为现役云端合成通道。样片内合成配音/音频许可不因预览副本扩展到成片——成片按当次制作另行核对。
- 历史配方样片：epic 原工程已逐张登记模型、提示词与生成来源，样片继承该披露；不是史实照片。旧沙画样片的图标署名（Material Design Icons、MingCute、Game-icons peace-dove CC BY 3.0，作者 Lorc）随原工程档案保留；现役 sand 样片为纯代码沙画图元，未使用这些图标。
- 字体许可另随 styles/template 内文件分发（PressStart2P 为 OFL）。参考片抽帧、完整参考视频、音乐母带、私人日志及 API 密钥不进入本库。
