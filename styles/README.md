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
| `liquid-flow/` | 液态流动（v3.5.0 轴 D） | samples-d8《一盏茶汤》 | 无（纯代码 SVG goo 滤镜） |

`ink-tea` 水墨在历史记录中未过关，不作为稳定SKU。后四风格历史上以用户确认的12秒小样入库；本包保留静态样张与组件，未附等价的完整运动/声音审查证据，不能称为当前版本整片认证。每种字体和纹理检查实际随附许可，缺少许可时补证据或换资产。

2026-10-06：guofeng-scroll（敦煌月窗）以 13.5s 全音频样片入库（v3.5.0 轴 D 批 1，源工程 `科普视频/samples-d8/s34-guofeng`：TTS 旁白+程序编曲 BGM（15-guochao，-14.1 LUFS）+SFX 钉帧 3 点，typecheck/check-plan 绿，ffprobe 实测过）；paperclip-sticker（贴纸人科普）同批入库（源工程 `科普视频/samples-d8/s34-paperclip`：13.8s，TTS+程序编曲 BGM（19-paperclip 引擎原生 slug，-14.0 LUFS）+SFX，typecheck/check-plan 绿）；hanazi-916（综艺花字，首个 9:16 竖屏原生卡，画幅=卡属性）同批入库（源工程 `科普视频/samples-d8/s34-hanazi`：12.6s 1080×1920，TTS+程序编曲 BGM（18-hanazi，-14.1 LUFS）+SFX 19 点钉帧，claims 带 Nature/iCatCare 等已核验 URL）；aurora-glass（玻璃拟态，批 2 首卡）入库（源工程 `科普视频/samples-d8/s34-aurora`：14.4s，TTS+程序编曲 BGM（12-aurora-glass，-14.0 LUFS）+SFX 5 钉帧，backdrop-filter 无头渲染实证生效）。各卡均尚未进套餐池——套餐池 11→19 在 8 卡全验收后统一改版。批 3 补记：line-art（线条动画）入库（源工程 `科普视频/samples-d8/s34-lineart`：13.8s，一笔画 16 段预连通+7 处无缝续接，TTS+程序编曲 BGM（02-line-art，-14.0 LUFS）+SFX 4 点台账，check-plan 3 镜头无缝）。批 2 补记：isometric-city（等轴 2.5D）入库（源工程 `科普视频/samples-d8/s34-iso`：13.0s，SSR 三面矩阵数值验证<0.001 误差、189 瓦片+11 栋几何建筑，TTS+程序编曲 BGM（03-isometric，-14.1 LUFS）+SFX 8 点台账；口径裁量：真等轴 30° 与 2:1 dimetric 不可兼得，取 30° 已登记 claims）；morph（形变动画）入库（源工程 `科普视频/samples-d8/s34-morph`：13.8s，5 形状 120 顶点对齐+中介圆点三段式+手写插值器无 SMIL，形变链咖啡杯→落日→城市窗灯→圆点→地图钉，TTS+程序编曲 BGM（08-morph，-14.0 LUFS）+SFX 6 点，worker 自抓 OKLab 白化 roundtrip 假绿等 4 真 bug 修复）；liquid-flow（液态流动）入库（源工程 `科普视频/samples-d8/s34-liquid`：13.8s，goo 滤镜 metaball 四处融合+多瓣错相波浪前沿+细颈断裂回弹，TTS+程序编曲 BGM（07-liquid，-14.0 LUFS）+SFX 6 点，迭代 5 轮 30+ 帧判读）。**轴 D 8 卡全部验收入库并已进套餐池（2026-10-06 改版 11→19，`samples/` 与放映页 `index.html` 已带 19 卡真样片；逐卡短板见 `reference/style-ledger.md` 短板登记节）。**

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
