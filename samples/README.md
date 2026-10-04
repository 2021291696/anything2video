# 视觉样片库

这 11 段是用户原有 anything2video 本机样片库的历史片段，不是借用他人参考片。各段实测 1280×720、30fps、180 帧、6 秒、H.264；发布副本去掉所有音轨，用于看风格与运动。原有含音轨副本已随本机 skill 备份保留。这里不展示新版本的全片质量认证，也不证明四个宿主分别完成过制片。

打开 index.html 可离线播放。manifest.json 登记每段发布文件 SHA256、原输入 SHA256、原工程标识、素材模式、披露和真实规格。样片从用户现有库继承；精确截取的原片时间窗未保存，不编造。

posters/ 是从对应发布MP4的第2秒实际抽取的预览封面，与原片采用相同来源和许可。播放器默认先显示代表帧，避免黑首帧影响风格比较；浏览器原生控件可暂时覆盖历史片段底部文字，隐藏控件后的画面与MP4本身未改。

| 片段 | 原工程/模式 |
|---|---|
| sand | usa250-sand，代码合成沙画 |
| chalk / blueprint / neon | val-chalk / val-blueprint / val-neon，代码合成 |
| pixel-arcade / paper-collage / swiss-print / crt-terminal | style-samples 对应风格，代码合成 |
| recipe-promo | a2v-skill-promo v3，代码合成，已移除音乐与合成配音 |
| recipe-epic | skill-epic v4，MiniMax image-01 生成世界底 + 代码字幕/图形 |
| recipe-explainer | bowen-daily，代码合成讲解 |

代码与本项目文档采用 MIT。生成场景不因与 MIT 代码合成就自动获得独占著作权；它受实际服务条款约束。epic 原工程已逐张登记模型、提示词、负向约束和生成来源，本样片继承该披露；不是史实照片。历史图像三查结论不转成 v3 最终 QC。

沙画原工程图标来源包括 Pictogrammers/Material Design Icons、MingCute（Apache-2.0）和 Game-icons 的 peace-dove（CC BY 3.0）。Game-icons 作者与许可原始索引见 https://game-icons.net/1x1/lorc/peace-dove.html ，署名 Lorc / Game-icons.net，修改为沙画轮廓。各图标库保留各自许可；本项目 MIT 不替代它们。字体许可另随 styles/template 内文件分发。

无音轨副本不包含原片音乐。原工程历史音乐许可与署名仍适用于原片；不能用此预览副本的说明为音乐重新授权。参考片抽帧、完整参考视频、音乐母带、私人日志及 API 密钥不进入本库。
