# styles/ 风格库正本

每个子目录提供图元库、`SPEC.md` 风格约定、`sample.jpg` 静态回归样张和适用资产。目标是复用已有笔触、材质和组件，同时为本片重新解决内容、画幅、动作与声音。样张存在和风格组件可用，不等于新视频已通过完整验证。

> **套餐口径（v3.5.0 起）**：本目录 16 个 SKU + 3 张配方正本脸（deep-space 深空 / mg-purple 夜航 / epic-paper 神话，值=原配方正本）= 套餐池 19 张（卡=类型+风格，一张卡一次定盘；画幅是卡属性非第三筛选轴）。工程 `config.style` 选皮肤（token 级：调色板 + 字幕/进度条/结尾机身件）；**笔触与图元语言仍走本目录复用流程**——皮肤管 token，不管图元重画。选型先查 `reference/style-ledger.md`（口味锚、判例与新旧名映射表）。

## 当前 SKU

| 目录 | 风格 | 历史源工程/样片 | 纹理或字体 |
|---|---|---|---|
| `sand/` | 沙画 | usa250-sand | grain.png |
| `chalk/` | 黑板 | chalk-math | dust.png |
| `blueprint/` | 蓝图 | blueprint-bridge | 无 |
| `neon/` | 霓虹 | neon-city | 无 |
| `pixel-arcade/` | 街机 | style-samples《午夜游戏厅》 | PressStart2P ttf |
| `paper-collage/` | 拼贴 | style-samples《拼贴世界》 | 无 |
| `swiss-print/` | 版式 | style-samples《少即是多》 | 系统字体栈 |
| `crt-terminal/` | 终端 | style-samples《终端唤醒》 | 系统字体栈 |
| `guofeng-scroll/` | 敦煌月窗（v3.5.0 轴 D） | samples-d8《公元366年·一点金光》 | 无（纯代码 SVG） |
| `paperclip-sticker/` | 贴纸人科普（v3.5.0 轴 D） | samples-d8《心跳的一天》 | 无（纯代码，Noto Sans SC） |
| `hanazi-916/` | 综艺花字（v3.5.0 轴 D，9:16 卡属性） | samples-d8《猫主子的四种喜欢信号》 | 无（纯代码，Noto Sans SC） |
| `aurora-glass/` | 玻璃拟态（v3.5.0 轴 D） | samples-d8《深夜的专注》 | 无（纯代码，噪点用模板 GRAIN_URL） |
| `line-art/` | 线条动画（v3.5.0 轴 D） | samples-d8《一座桥的受力》 | 无（纯代码，Noto Serif SC 标题） |
| `isometric-city/` | 等轴 2.5D（v3.5.0 轴 D） | samples-d8《一条视频的渲染小城》 | 无（纯 CSS SSR 等轴，禁 3D 库） |
| `morph/` | 形变动画（v3.5.0 轴 D） | samples-d8《形态的旅行》 | 无（纯代码，手写路径插值器） |
| `pop-comic/` | 波普漫画（v3.8.0 轴 L，lanshu 领地重写） | samples-l1《标题党是怎么骗到你点进去的》 | 无（纯代码，粗黑描边+半调网点） |
| `popup-book/` | 纸艺立体书（v3.8.0 轴 L，lanshu 领地重写） | samples-l1《一杯咖啡的旅程》 | feTurbulence 纸纹（内联 SVG，seed 7） |
| `clay-town/` | 黏土小城（v3.8.0 轴 L，lanshu 领地重写） | samples-l1《自来水是怎么到你家的》 | 无（纯代码，SSR 等轴黏土材质） |
| `studio-oneshot/` | 3D 一镜到底（v3.8.0 轴 L，lanshu 领地重写） | samples-l1《一枚芯片的旅行》 | 无（three.js 材质，专有依赖申报见 SPEC） |
| `liquid-flow/` | 液态流动（v3.5.0 轴 D） | samples-d8《一盏茶汤》 | 无（纯代码 SVG goo 滤镜） |
| `pop-dot/` | 扁平矢量弹性 MG | 科普视频/samples-v4/pop-dot（借鉴 mg-styles-15） | 无（纯代码） |
| `ink-boil/` | 逐帧线沸腾 | 科普视频/samples-v4/ink-boil（借鉴 mg-styles-15） | 无（纯代码） |
| `ink-plate/` | 包豪斯丝印 | 科普视频/samples-v4/ink-plate（借鉴 mg-styles-15） | 无（纯代码） |
| `vhs-outrun/` | 合成波/VHS | 科普视频/samples-v4/vhs-outrun（借鉴 mg-styles-15） | 无（纯代码） |
| `soft-jelly/` | C4D 软渲染质感 | 科普视频/samples-v4/soft-jelly（借鉴 mg-styles-15） | 无（纯代码） |
| `target-lock/` | 赛博 HUD / FUI 空间化界面 | 科普视频/samples-v4/target-lock（借鉴 mg-styles-15） | 无（纯代码） |
| `ink-tea/` | 中国水墨写意（v4.0.0 复活重做） | 科普视频/samples-v4/ink-tea（huashu 17_ink 为底＋mg15） | 无（纯代码，RicePaper 程序宣纸纹） |
| `swirl-oil/` | 梵高后印象派 | 科普视频/samples-v4/swirl-oil（借鉴 huashu-art-motion） | paint/ 预烘焙帧 16（scene/vortex ×8） |
| `cave-wall/` | 洞穴岩画 | 科普视频/samples-v4/cave-wall（借鉴 huashu-art-motion） | 无（纯代码） |
| `tomb-wall/` | 埃及墓室壁画 | 科普视频/samples-v4/tomb-wall（借鉴 huashu-art-motion） | 无（纯代码） |
| `amphora/` | 阿提卡黑绘陶器 | 科普视频/samples-v4/amphora（借鉴 huashu-art-motion） | 无（纯代码） |
| `mosaic/` | 庞贝马赛克 | 科普视频/samples-v4/mosaic（借鉴 huashu-art-motion） | 无（纯代码） |
| `gold-leaf/` | 哥特泥金手抄本 | 科普视频/samples-v4/gold-leaf（借鉴 huashu-art-motion） | paint/grain.png＋page-mask/page-static |
| `whiplash-line/` | 慕夏新艺术 | 科普视频/samples-v4/whiplash-line（借鉴 huashu-art-motion） | 无（纯代码） |
| `grain-flat/` | 当代扁平插画（huashu 领地重写） | 科普视频/samples-v4/grain-flat（借鉴 huashu-art-motion） | 无（纯代码） |
| `gold-robe/` | 克里姆特金色时期 | 科普视频/samples-v4/gold-robe（借鉴 huashu-art-motion） | 无（纯代码） |
| `dot-infinity/` | 草间弥生无限波点 | 科普视频/samples-v4/dot-infinity（借鉴 huashu-art-motion） | 无（纯代码） |
| `hard-light/` | 霍珀美国现实主义光影叙事 | 科普视频/samples-v4/hard-light（借鉴 huashu-art-motion） | 无（纯代码） |
| `dance-line/` | 凯斯·哈林粗线涂鸦 | 科普视频/samples-v4/dance-line（借鉴 huashu＋mg15） | 无（纯代码） |
| `rubberhose/` | 1930 橡皮管卡通 | 科普视频/samples-v4/rubberhose（借鉴 huashu-art-motion） | 无（纯代码） |
| `shadow-play/` | 中国皮影 | 科普视频/samples-v4/shadow-play（借鉴 huashu-art-motion） | 无（纯代码） |
| `sfumato/` | 文艺复兴晕涂 | 科普视频/samples-v4/sfumato（借鉴 huashu-art-motion） | paint/beam＋overlay＋static.png |
| `light-dabs/` | 印象派光斑短笔触 | 科普视频/samples-v4/light-dabs（借鉴 huashu-art-motion） | paint/ 预烘焙帧 8（scene） |
| `facets/` | 分析立体主义 | 科普视频/samples-v4/facets（借鉴 huashu-art-motion） | 无（纯代码） |
| `chrome-ball/` | 早期光追 CGI | 科普视频/samples-v4/chrome-ball（借鉴 huashu-art-motion） | 无（纯代码） |
| `scream-warp/` | 蒙克表现主义 | 科普视频/samples-v4/scream-warp（借鉴 huashu-art-motion） | paint/ 预烘焙帧 8（wide） |
| `soft-clock/` | 达利超现实主义 | 科普视频/samples-v4/soft-clock（借鉴 huashu-art-motion） | 无（纯代码） |
| `watercolor-cel/` | 吉卜力水彩背景＋赛璐璐角色 | 科普视频/samples-v4/watercolor-cel（借鉴 huashu-art-motion） | 无（纯代码） |
| `lily-pond/` | 莫奈睡莲 | 科普视频/samples-v4/lily-pond（借鉴 huashu-art-motion） | paint/ 预烘焙帧 6（scene） |
| `optical-dots/` | 修拉点彩 | 科普视频/samples-v4/optical-dots（借鉴 huashu-art-motion） | field/ 预烘焙点场 29（glow/hook/s1-s4） |
| `candle-light/` | 烛光下的读信人（伦勃朗明暗法） | 科普视频/samples-v4/candle-light（借鉴 huashu-art-motion） | paint/beam＋overlay＋static.png |
| `cumulus-light/` | 新海诚光影 | 科普视频/samples-v4/cumulus-light（借鉴 huashu-art-motion） | 无（纯代码） |
| `blue-period/` | 毕加索蓝色时期单色情绪 | 科普视频/samples-v4/blue-period（借鉴 huashu-art-motion） | 无（纯代码） |
| `whiteboard/` | 白板马克笔科普 | 科普视频/samples-v4/whiteboard（借鉴 prompt-motion＋mg15） | 无（纯代码） |
| `kinetic-type/` | 信息排版动态字体 | 科普视频/samples-v4/kinetic-type（借鉴 prompt-motion＋mg15） | 无（纯代码） |
| `riso-print/` | Risograph 孔版印刷 | 科普视频/samples-v4/riso-print（借鉴 prompt-motion＋mg15） | 无（纯代码） |
| `math-lab/` | 数学实验室 | 科普视频/samples-v4/math-lab（借鉴 prompt-motion＋huashu） | 无（纯代码） |
| `hypnotic/` | 迷幻催眠视幻觉 | 科普视频/samples-v4/hypnotic（借鉴 prompt-motion） | 无（纯代码） |

`ink-tea` 水墨在历史记录中未过关，不作为稳定SKU。后四风格历史上以用户确认的12秒小样入库；本包保留静态样张与组件，未附等价的完整运动/声音审查证据，不能称为当前版本整片认证。每种字体和纹理检查实际随附许可，缺少许可时补证据或换资产。

2026-10-06：guofeng-scroll（敦煌月窗）以 13.5s 全音频样片入库（v3.5.0 轴 D 批 1，源工程 `科普视频/samples-d8/s34-guofeng`：TTS 旁白+程序编曲 BGM（15-guochao，-14.1 LUFS）+SFX 钉帧 3 点，typecheck/check-plan 绿，ffprobe 实测过）；paperclip-sticker（贴纸人科普）同批入库（源工程 `科普视频/samples-d8/s34-paperclip`：13.8s，TTS+程序编曲 BGM（19-paperclip 引擎原生 slug，-14.0 LUFS）+SFX，typecheck/check-plan 绿）；hanazi-916（综艺花字，首个 9:16 竖屏原生卡，画幅=卡属性）同批入库（源工程 `科普视频/samples-d8/s34-hanazi`：12.6s 1080×1920，TTS+程序编曲 BGM（18-hanazi，-14.1 LUFS）+SFX 19 点钉帧，claims 带 Nature/iCatCare 等已核验 URL）；aurora-glass（玻璃拟态，批 2 首卡）入库（源工程 `科普视频/samples-d8/s34-aurora`：14.4s，TTS+程序编曲 BGM（12-aurora-glass，-14.0 LUFS）+SFX 5 钉帧，backdrop-filter 无头渲染实证生效）。各卡均尚未进套餐池——套餐池 11→19 在 8 卡全验收后统一改版。批 3 补记：line-art（线条动画）入库（源工程 `科普视频/samples-d8/s34-lineart`：13.8s，一笔画 16 段预连通+7 处无缝续接，TTS+程序编曲 BGM（02-line-art，-14.0 LUFS）+SFX 4 点台账，check-plan 3 镜头无缝）。批 2 补记：isometric-city（等轴 2.5D）入库（源工程 `科普视频/samples-d8/s34-iso`：13.0s，SSR 三面矩阵数值验证<0.001 误差、189 瓦片+11 栋几何建筑，TTS+程序编曲 BGM（03-isometric，-14.1 LUFS）+SFX 8 点台账；口径裁量：真等轴 30° 与 2:1 dimetric 不可兼得，取 30° 已登记 claims）；morph（形变动画）入库（源工程 `科普视频/samples-d8/s34-morph`：13.8s，5 形状 120 顶点对齐+中介圆点三段式+手写插值器无 SMIL，形变链咖啡杯→落日→城市窗灯→圆点→地图钉，TTS+程序编曲 BGM（08-morph，-14.0 LUFS）+SFX 6 点，worker 自抓 OKLab 白化 roundtrip 假绿等 4 真 bug 修复）；liquid-flow（液态流动）入库（源工程 `科普视频/samples-d8/s34-liquid`：13.8s，goo 滤镜 metaball 四处融合+多瓣错相波浪前沿+细颈断裂回弹，TTS+程序编曲 BGM（07-liquid，-14.0 LUFS）+SFX 6 点，迭代 5 轮 30+ 帧判读）。**轴 D 8 卡全部验收入库并已进套餐池（2026-10-06 改版 11→19，`samples/` 与放映页 `index.html` 已带 19 卡真样片；逐卡短板见 `reference/style-ledger.md` 短板登记节）。**
2026-10-07（v3.8.0 轴 L · lanshu 技法吸收）：pop-comic（波普漫画）入库（源工程 `科普视频/samples-l1/pop-comic`：12.29s/367f，粗描边错位阴影+半调网点双层+拟声词爆炸星+贴纸拍入锁死参数（0.16s easeInQuad/scale1.16/-1.6°）+网点擦除转场，TTS+程序编曲 BGM（01-flat-vector，seed 20261071，-14.0 LUFS）+SFX 11 点）；popup-book（纸艺立体书）入库（源工程 `科普视频/samples-l1/popup-book`：12.95s/387f，牛皮纸+feTurbulence 纸纹 seed7+rotateX 底缘铰链 90°→-10° 立定（弹簧过冲≈9%）+地影随折角+三层视差+拉页转场×3，TTS+程序编曲 BGM（19-paperclip，seed 20261052，-14.1 LUFS）+SFX 12 点）；clay-town（黏土小城）入库（源工程 `科普视频/samples-l1/clay-town`：12.65s/378f，SSR 等轴正本换黏土材质（顶亮/侧暗+inset AO+±2% 手捏抖动）+clayDrop 软落压扁回弹+kawaii 水塔脸/水滴角色+双层标注三站，TTS+程序编曲 BGM（03-isometric，seed 20261072，-14.1 LUFS）+SFX 10 点）；studio-oneshot（3D 一镜到底，**skill 首张 three.js 卡**）入库（源工程 `科普视频/samples-l1/studio-oneshot`：12.93s/386f，石墨影棚+瓷质 MeshPhysicalMaterial+Catmull-Rom ±3|Δ| 限幅一镜相机（到站恒早 9f）+纯帧号确定性，frame_cost 前置门实测：renderStill 固定开销≈1.05s/帧、renderMedia 真实吞吐 70-77ms/帧全片<0.5min，TTS+程序编曲 BGM（10-synthwave，seed 20261007，-14.0 LUFS）+SFX 8 点；专有依赖 three@0.186.1+@remotion/three@4.0.507 需与 remotion 同版对齐）。四卡领地均自 lanshu-create-ai-presenter-video（MIT，cclank）重写为 Remotion 惯用法，许可登记 `LICENSE-THIRDPARTY/MIT-lanshu-create-ai-presenter-video.txt`；同轮 6 张既有卡获 opt-in 技法增强（swiss-print/blueprint/crt-terminal/neon/chalk/line-art，默认输出不变，各卡 SPEC 有增补节与借鉴登记行）。样片 manifest 与放映页同步 19→23。

2026-10-08（v4.0.0 战役）：**38 卡入库**（源工程 `科普视频/samples-v4/<slug>`：借鉴来源按各卡 SPEC 实测登记——huashu-art-motion 28 卡、mg-styles-15 8 卡、prompt-motion 5 卡（dance-line/ink-tea/math-lab 为交叉登记，合计 38 卡）；各卡逐工程报告与音频登记见 `<slug>/report.md`、`<slug>/research/audio-notes.md`，逐卡短板见 `reference/style-ledger.md` 短板登记节）。**5 卡改默认升级**（line-art/morph/isometric-city/paperclip-sticker/paper-collage，签名帧回归走 upgrade-lab 前后对照）＋共享数学层/渲染层落 `template/src/common/`（hermite/monotone/quantize/smear + strokes/brush）；**12 卡 opt-in 增强**（pop-comic/pixel-arcade/hanazi-916/neon/swiss-print/guofeng-scroll/liquid-flow/morph/paperclip-sticker/line-art/aurora-glass/paper-collage，默认输出不变，各卡 SPEC 有增补节）。许可登记：`LICENSE-THIRDPARTY/MIT-mg-styles-15.txt`（Vincentwei1021）、`MIT-huashu-art-motion.txt`（alchaincyf/花叔）、`MIT-cinetic.txt`（Leonxlnx，gallery 镜头卡 15 张收编见 `gallery/cards/ATTRIBUTION.md` cinetic 批次）；prompt-motion 系卡走「手法参考、重写实现」政策（ATTRIBUTION 框架）。BGM 映射：38 新卡 `--style` 实测值已登记 `scripts/bgm_generate.py` STYLE_MAP「v4.0.0 战役新卡」节（light-dabs 工程内中断前记录缺失，TODO 待复验补登）。38 卡套餐池口径待一次总验收定案，本批注不预设池内资格。


## 同风格复用

1. 用skill的 `scripts/init.mjs` 在包外建立空工程；进入工程执行 `npm install`、`uv sync`、`npx remotion browser ensure`。可显式设置 `BROWSER_EXECUTABLE` 使用可用浏览器。旧 `new_project.sh`、拷贝其他项目 `node_modules` 或浏览器缓存不作为依赖安装规范。
2. 完整读所选 `SPEC.md`，选需用图元和资产复制到项目，修正导入与 `staticFile` 路径。登记纹理、字体、图标的来源、许可、完整sha256及用途。
3. 按本项目width/height/fps重排，保留风格语言；固定横屏坐标、旧探针阈值和旧效果配额不能覆盖 `reference/production-contract.md`。中文、长命令和平台安全区单独核定。
4. 先渲两张签名帧与sample并排检查色板、笔触和构图，再渲开场、复杂中段、结尾的实际运动片段。静态回归只证明已比对的静态项；连续动作、字幕和声音另外审查。
5. 组任务书写所选图元API、需要保持的风格参数和允许变化。风格有意使用阶梯、扫描线或静止时，记录范围并选择适合的探针；豁免不自动等于通过。

可在技能根运行 `node template/scripts/styles_check.mjs` 检查资产存在性和icons正本关系。这个检查不能证明字形许可、动画正确、教学可读或整片好看。

## 新风格入库

同一段内容先做有区别的视觉小样，选择能说明信息的方案并固定图元库。完成真实制作后保存源码、风格token、材质参数、依赖版本、许可和验证范围；选一张签名帧为sample，SPEC记录画幅适配方法、已知取舍及需要重验的项目。

入库条件是可复用实现与可追溯证据，不是仅有一张好看的截图。记录检查媒体和源码哈希、实际工具/审片者及 `passed/failed/not_performed`；缺少完整审查时写明“试验风格”或“仅静态回归”，不夸大覆盖范围。CC-BY资产附作者与链接，随交付清单披露；MIT仓库许可不能替代字体、图标和纹理许可。

## 升级

风格库改动同步更新SPEC，保存同内容前后对比与验证范围，再写台账。项目内临时实验只有经过验证才回写长期库。更新token或图元时回归已有签名帧和相关运动片段，确认修复没有改变不相关风格特征；不要以“新片必须五项全变”为升级理由。
