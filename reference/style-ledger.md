# 跨片风格与方法台账（style ledger）

台账记录连续做片的实际选择，帮助识别模板惯性与复用机会。方法源于 guizang product video skill 的多片实践；本表采用按主题和受众选维度的规则，不设置"上一片用过就必须全部换掉"的配额。

## 选型策略（套餐制 v3.4.0 起必读——任何会话按 SKILL.md 干活都会走到这里）

- **口味锚（用户裁决，优先级最高）**：冷峻精密、不贴科技标签（BGM 战役 2026-10-02/03 用户原话）。产品/品牌/对外向先看冷峻系（deep-space 深空 / blueprint 蓝图 / mg-purple 夜航 / crt-terminal 终端 / swiss-print 版式）；暖系与手作系（sand 沙画 / chalk 黑板 / paper-collage 拼贴 / epic-paper 神话）仅用户点名或生活/儿童/情感叙事时用。辉光系（neon 霓虹）与"不贴科技标签"相悖，慎选。
- **铁律：口味锚与既有判例优先于主题隐喻推理**（2026-10-06 qr-scan 教训：按"二维码=方块拼贴"的隐喻推理选了 paper-collage 做冷峻产品向验证片，用户判"风格脱离"，两轮返工）。
- **判例登记**：
  - 2026-10-06：paper-collage 不接冷峻产品向（qr-scan，用户否决两轮：机身件污染→纯化后仍整体否）。
  - 2026-10-06：配方机身件（字幕/进度条/结尾）必须随风格换皮——已制度化（config.style 皮肤覆写 chrome token），禁再手改机身件颜色。
  - 换风格只换调色板不换图元语言时，画面主体仍需用该 SKU 图元库重画（皮肤管 token，不管笔触）。
  - 2026-10-06 晚：**套餐制定案**（取代同日早的双问拍板）——单问选卡，卡=类型+风格完整决定；卡赢为默认，卡类型或 ⚠ 判例注与显式需求冲突时开工前一句确认，不得静默越过；显示名改本质名词（见下表），机器 ID 不变；custom 配方经点名后门可达（与 v3.3.0 等价）。
  - 2026-10-06：**爆款判例两件**（v3.5.0 轴 E/D 输入）——①敦煌×AgentSpace 品牌史诗 154s：epic+AI 世界层路线实证，偈语文案/呼吸章/光源贯穿/暗场调色四维度沉淀进 `epic-brand-film.md` §7；②九色鹿壁画活化 94s：黑底月窗+竖排题跋+朱印+长卷构图语言，轴 D 批1 guofeng-scroll 卡蓝本。片源与拆解在 `tmp/grilling-20261006/`（tmp 会清，细节见 handoff 全案输入物清单）。
  - 2026-10-06：**画幅是卡属性非第三筛选轴**（v3.5.0 W1 定案）——"卡=类型+风格完整决定"公式不动；9:16 卡（hanazi-916）以卡属性标注+样片页竖版卡样式表达，选卡公式不因画幅改版。
- **单问套餐流程**：放映 samples/index.html 挑一张卡（卡=类型+风格，映射见下表）。答案（卡名+机器 ID）进 creative-brief 持久化；同系列沿用记"沿用"。
- 风格复用时保持已约定的材质、笔触、调色板与图元语言，按 `styles/README.md` 做回归。需要修改风格本体时记录理由、改动和验证范围。
- 从开场、转场、相机、叙事节奏、背景、色彩、声音或贯穿对象中，选择能服务本主题的变化。教学步骤、同品牌连载和可识别系列可以合理保留设计。
- 复用的对象必须参与本片信息链；同一装饰、空面板和标题模板反复出现却不改变状态时，先改镜头内容。

## 短板登记（每张卡的下一轮提质方向，v3.6.0 起）

> huashu-art-motion 风格配方 INDEX 模式（MIT）：每张风格卡除签名特征外，还登记**当前短板**——
> 「短板就是下一次做这个风格时该先超越的地方」。选卡后、开工前先读对应卡的短板行；
> 做完该片若突破了短板或发现了新短板，回写本表与 SPEC。

登记格式（一行一卡，只登记有实据的短板——用户裁决、审片发现、判例返工，不凭印象写）：

| 卡（机器 ID） | 当前短板 | 实据 | 状态 |
|---|---|---|---|
| ink-tea（历史试验行，v4.0.0 已复活重做） | 人物写实度不足，历史样片未过关 | styles/README「未过关」记录 | 已复活重做（v4.0.0），待总验收 |
| paper-collage（paper-collage） | 冷峻产品向被否（机身件污染→纯化后仍整体否） | 2026-10-06 qr-scan 判例两轮 | 边界已立：生活/情感向可用 |
| hanazi-916（hanazi-916） | 首个 9:16 原生卡，横屏适配未验证 | styles/README 入库批注（画幅=卡属性） | 待首个横屏需求实测 |
| pop-comic（pop-comic） | 道具图形简笔级、Balloon 对话泡已入库未消费；收束卡结论句三层描边在黄爆星上略糊 | samples-l1 report 自陈三弱点 | 待首部正片复验 |
| popup-book（popup-book） | -10° 立定角俯视体积感弱于真立体书；SC03 密度不均；"磨成细粉"无粉末粒子段 | samples-l1 report 自陈三弱点 | 待首部正片复验 |
| clay-town（clay-town） | CSS 渐变黏土质感上限（近看哑光贴纸球）；C 站信息密度偏低；水滴跨站衔接靠剪辑隐含 | samples-l1 report 自陈三弱点 | 待首部正片复验 |
| studio-oneshot（studio-oneshot） | 站间飞行段信息密度低；瓷白材质绑死深石墨光比（亮背景白对白）；大脑为轮廓意象非解剖造型 | samples-l1 report 自陈三弱点 | 待首部正片复验 |
| pop-dot（pop-dot） | 世界结构薄（一镜 nesting 被裁）；角色缺位；SHADE 只用「暗侧」半边 | 科普视频/samples-v4/pop-dot/report.md 自陈三弱点 | 待首部正片复验 |
| ink-boil（ink-boil） | 特写段（SC02）画面层次单薄；火灵表演系统浅；结尾烟系统双轨并行 | 科普视频/samples-v4/ink-boil/report.md 自陈三弱点 | 待首部正片复验 |
| ink-plate（ink-plate） | 丝印质感「近似度」上限；题头横幅位置偏离源片；信息密度偏低＋抢拍叙事依赖旁白 | 科普视频/samples-v4/ink-plate/report.md 自陈三弱点 | 待首部正片复验 |
| vhs-outrun（vhs-outrun） | 镀铬字与源码档差；VHS 链是近似而非 YIQ 域；世界密度低于源码 | 科普视频/samples-v4/vhs-outrun/report.md 自陈三弱点 | 待首部正片复验 |
| soft-jelly（soft-jelly） | 糖果材质「七折近似」且透明感缺位；克隆阵列无「抛飞冠」；床毯是「糖珠垫」非「软胶板」 | 科普视频/samples-v4/soft-jelly/report.md 自陈三弱点 | 待首部正片复验 |
| target-lock（target-lock） | 全息球是 2D 近似而非真 3D；reink 线性矩阵保不了热白；微 glitch 是全帧行条带近似 | 科普视频/samples-v4/target-lock/report.md 自陈三弱点 | 待首部正片复验 |
| ink-tea（ink-tea，v4.0.0 重做） | 虾仍是「可读的齐白石习作」而非「乱真的齐白石」；构图编舞密度低于 huashu 原版；帧差均值 2.65% 未达 brief 3% 线 | 科普视频/samples-v4/ink-tea/report.md 自陈三弱点 | 待首部正片复验；BGM 已换 12-aurora-glass（总验收裁决 2026-10-08，重混音重渲，画面 387f 逐帧零差异） |
| swirl-oil（swirl-oil） | 灯塌「星」塌「灯」；海岸线与屋顶的矢量感残留；叙事容量被签名挤占 | 科普视频/samples-v4/swirl-oil/report.md 自陈三弱点 | 待首部正片复验 |
| cave-wall（cave-wall） | 牛犊体型偏「豆」；吹颜料喷锥偏「粒子雾」；火光只改亮度不改阴影方向 | 科普视频/samples-v4/cave-wall/report.md 自陈三弱点 | 待首部正片复验 |
| tomb-wall（tomb-wall） | 人物手臂读形偏弱；HERO 冲击幅度受「无笔触」纪律约束；SC03 画幅下半近半为深蓝纯色 | 科普视频/samples-v4/tomb-wall/report.md 自陈三弱点 | 待首部正片复验 |
| amphora（amphora） | 人物尺度；HERO 幅面；里拉琴配额 | 科普视频/samples-v4/amphora/report.md 自陈三弱点 | 待首部正片复验 |
| mosaic（mosaic） | 犬形偏「猫科感」；吠叫波嵌片上屏偏散；右上墙面留白偏大 | 科普视频/samples-v4/mosaic/report.md 自陈三弱点 | 待首部正片复验 |
| gold-leaf（gold-leaf） | 高光带亮核窗口窄；翻页转场起点是硬接；少女与猫是烘焙静态 | 科普视频/samples-v4/gold-leaf/report.md 自陈三弱点 | 待首部正片复验 |
| whiplash-line（whiplash-line） | 少女为写意简笔；拱窗内装饰做了减法；定帧段构图层静止 | 科普视频/samples-v4/whiplash-line/report.md 自陈三弱点 | 待首部正片复验 |
| grain-flat（grain-flat） | 伸懒腰读感弱（S02）；拍杯冲击偏轻（S03 前半）；背景颗粒语言单一 | 科普视频/samples-v4/grain-flat/report.md 自陈三弱点 | 待首部正片复验 |
| gold-robe（gold-robe） | 人物读法停在「装饰插画」；双人肢体语义偏弱；纹样分布上稀下密 | 科普视频/samples-v4/gold-robe/report.md 自陈三弱点 | 待首部正片复验 |
| dot-infinity（dot-infinity） | 镜屋灯三色受限；少女偏几何简笔；消融饱和段静帧单调 | 科普视频/samples-v4/dot-infinity/report.md 自陈三弱点 | 待首部正片复验 |
| hard-light（hard-light） | 人物是「够用」而非「霍珀」；光斑与受光面是两套贴合而非一套光照；钩子段信息密度偏低 | 科普视频/samples-v4/hard-light/report.md 自陈三弱点 | 待首部正片复验 |
| dance-line（dance-line） | 狗的造型偏「卡通吉祥物」；「一格一格跳出来」只落在入场/跳下事件；S01 排排站段运动密度偏低 | 科普视频/samples-v4/dance-line/report.md 自陈三弱点 | 待首部正片复验 |
| rubberhose（rubberhose） | 闹钟四肢个别拍点「手套漂」；猫 flop 态读形依赖补全；定帧段「微动」幅度保守 | 科普视频/samples-v4/rubberhose/report.md 自陈三弱点 | 待首部正片复验 |
| shadow-play（shadow-play） | 武将净角脸谱读面弱；靠旗形态偏「折扇」；旦角比例矮胖 | 科普视频/samples-v4/shadow-play/report.md 自陈三弱点 | 待首部正片复验 |
| sfumato（sfumato） | 猫仍偏「plaisant 插画」半步；道具层完成度低于主体；扑翼机叙事只有一拍 | 科普视频/samples-v4/sfumato/report.md 自陈三弱点 | 待首部正片复验 |
| light-dabs（light-dabs） | 《日出·印象》与窗景「画中画」层次偏示意；少女是「安全可读」而非「印象派人物」；hero 仅「齐明」一拍、光斑无第二叙事拍 | 科普视频/samples-v4/light-dabs/report.md 自陈三弱点 | 待首部正片复验 |
| facets（facets） | 人物是「够用的立体派」而非「毕加索」；窗景「多视角」靠基准偏移硬拼无真透视差；深褐面修正后仍有「中部偏粉」时段 | 科普视频/samples-v4/facets/report.md 自陈三弱点 | 待首部正片复验 |
| chrome-ball（chrome-ball） | 逐像素棋盘只在 720p 半分辨率密度上成立；猫是「配方母题复刻」非通用角色系统；flare 强度依赖窗位构图 | 科普视频/samples-v4/chrome-ball/report.md 自陈三弱点 | 待首部正片复验 |
| scream-warp（scream-warp） | 尖叫者小像是「可读符号」而非「蒙克」；HERO 特写段烘焙位图笔触软化；天空卷曲语汇有梵高残余风险 | 科普视频/samples-v4/scream-warp/report.md 自陈三弱点 | 待首部正片复验 |
| soft-clock（soft-clock） | 学院派体积是「渐变级」而非「油画级」；影子叙事依赖孤柏救场；全景平面利用率偏低 | 科普视频/samples-v4/soft-clock/report.md 自陈三弱点 | 待首部正片复验 |
| watercolor-cel（watercolor-cel） | 人物是「致敬」而非「吉卜力本尊」；水彩颗粒「纸感」偏含蓄；HERO 重音靠光不靠运动 | 科普视频/samples-v4/watercolor-cel/report.md 自陈三弱点 | 待首部正片复验 |
| lily-pond（lily-pond） | ripple 转场 26f 内旧画行条错位露出底色缝隙；叶幕区垂笔读感偏「垂草」；岸堤色板在全蓝绿画面中偏跳 | 科普视频/samples-v4/lily-pond/report.md 自陈三弱点 | 待首部正片复验 |
| optical-dots（optical-dots） | 两处转场帧成本偏高（非热帧）；撑伞女士为剪影简笔；s4 紫光版靠分级函数非叙事内演算 | 科普视频/samples-v4/optical-dots/report.md 自陈三弱点 | 待首部正片复验 |
| candle-light（candle-light） | 人物是代码矢量画师上限；桌面静物语义密度低；剧情云影与自然云影双系统叠加 | 科普视频/samples-v4/candle-light/report.md 自陈三弱点 | 待首部正片复验 |
| cumulus-light（cumulus-light） | 角色是「干净」而非「新海诚」；光柱是「叠出来」而非「体积」；英雄拍三件同框依赖观众注意 | 科普视频/samples-v4/cumulus-light/report.md 自陈三弱点 | 待首部正片复验 |
| blue-period（blue-period） | 人物是「写意」而非「造型」级；拉长是「时刻」不是「语言」；猫的纹理碎 | 科普视频/samples-v4/blue-period/report.md 自陈三弱点 | 待首部正片复验 |
| whiteboard（whiteboard） | 手写感是「字体+抖动」而非真笔迹；铺色是排线近似非墨区渗透；擦除语法缺席 | 科普视频/samples-v4/whiteboard/report.md 自陈三弱点 | 待首部正片复验 |
| kinetic-type（kinetic-type） | 词性分级靠字号/透明度、色相只有一档强调；信息密度低是领地代价；定帧段探针天然红 | 科普视频/samples-v4/kinetic-type/report.md 自陈三弱点 | 待首部正片复验（探针双红已裁决豁免：大面积实底+定帧微呼吸=签名本体，总验收 2026-10-08） |
| riso-print（riso-print） | 印刷不匀的表现深度有限；版纸翻动是形制简化；构图全程单机位固定 | 科普视频/samples-v4/riso-print/report.md 自陈三弱点 | 待首部正片复验 |
| math-lab（math-lab） | 「平方」一幕 1:4:9 依赖柱高读数而非面积直觉；SC01 释放段运动密度偏低；SC02 秒刻度只到 t=2s | 科普视频/samples-v4/math-lab/report.md 自陈三弱点 | 待首部正片复验 |
| hypnotic（hypnotic） | 万花筒楔内容偏「十字花」而非有机曼陀罗；隧道段信息量平；眼/隧道/万花筒三段过渡全靠 opacity 包络 | 科普视频/samples-v4/hypnotic/report.md 自陈三弱点 | 待首部正片复验 |

新卡入库时本表必须有一行（无短板写「无已知短板（首版）」，不留空）。

## 显示名映射（v3.4.0 套餐制，机器 ID 不变）

| 新卡名 | 旧显示名 | 机器 ID | 主类型 |
|---|---|---|---|
| 深空 | 深空电光青 | deep-space | 宣传 |
| 夜航 | 紫调黑底MG | mg-purple | 讲解 |
| 神话 | 暖纸白描金 | epic-paper | 史诗 |
| 沙画 | 灯箱沙画 | sand | 史诗 |
| 黑板 | 粉笔黑板 | chalk | 讲解 |
| 蓝图 | 工程蓝图 | blueprint | 讲解 |
| 霓虹 | 霓虹夜城 | neon | 宣传（⚠慎选） |
| 街机 | 像素街机 | pixel-arcade | 讲解 |
| 拼贴 | 剪纸拼贴 | paper-collage | 讲解（⚠冷峻产品向不接） |
| 版式 | 瑞士版式 | swiss-print | 宣传 |
| 终端 | CRT终端 | crt-terminal | 宣传 |
| 月窗 | 敦煌月窗国风 | guofeng-scroll | 史诗 |
| 贴纸人 | 回形针贴纸科普 | paperclip-sticker | 讲解 |
| 花字 | 综艺花字（9:16 卡属性） | hanazi-916 | 讲解 |
| 线条 | 一笔画线条 | line-art | 讲解 |
| 等轴 | 等轴 2.5D | isometric-city | 宣传 |
| 玻璃 | 弥散玻璃拟态 | aurora-glass | 宣传 |
| 液态 | 液态流动 | liquid-flow | 宣传 |
| 波普 | 波普漫画 | pop-comic | 宣传 |
| 立体书 | 纸艺立体书 | popup-book | 讲解 |
| 黏土 | 黏土小城 | clay-town | 讲解 |
| 一镜 | 3D 一镜到底 | studio-oneshot | 史诗 |
| 形变 | 形变动画 | morph | 宣传 |
| 弹点 | 扁平矢量弹性 MG | pop-dot | 讲解 |
| 线沸 | 逐帧线沸腾 | ink-boil | 讲解 |
| 墨版 | 包豪斯丝印 | ink-plate | 讲解 |
| 公路夜 | 合成波/VHS | vhs-outrun | 宣传 |
| 软糖 | C4D 软渲染质感 | soft-jelly | 讲解 |
| 锁定 | 赛博 HUD / FUI 空间化界面 | target-lock | 讲解 |
| 水墨 | 中国水墨写意（v4.0.0 复活重做） | ink-tea | 讲解 |
| 星涡 | 梵高后印象派 | swirl-oil | 讲解 |
| 岩壁 | 洞穴岩画 | cave-wall | 讲解 |
| 墓室 | 埃及墓室壁画 | tomb-wall | 讲解 |
| 陶瓶 | 阿提卡黑绘陶器 | amphora | 讲解 |
| 马赛克 | 庞贝马赛克 | mosaic | 讲解 |
| 金箔 | 哥特泥金手抄本 | gold-leaf | 讲解 |
| 鞭线 | 慕夏新艺术 | whiplash-line | 讲解 |
| 颗粒扁平 | 当代扁平插画 | grain-flat | 讲解 |
| 金袍 | 克里姆特金色时期 | gold-robe | 讲解 |
| 波点 | 草间弥生无限波点 | dot-infinity | 讲解 |
| 硬光 | 霍珀美国现实主义光影叙事 | hard-light | 讲解 |
| 舞线 | 凯斯·哈林粗线涂鸦 | dance-line | 讲解 |
| 橡皮管 | 1930 橡皮管卡通 | rubberhose | 讲解 |
| 皮影 | 中国皮影 | shadow-play | 讲解 |
| 晕涂 | 文艺复兴晕涂 | sfumato | 讲解 |
| 光斑 | 印象派光斑短笔触 | light-dabs | 讲解 |
| 切面 | 分析立体主义 | facets | 讲解 |
| 铬球 | 早期光追 CGI | chrome-ball | 讲解 |
| 呐喊 | 蒙克表现主义 | scream-warp | 讲解 |
| 软钟 | 达利超现实主义 | soft-clock | 讲解 |
| 水彩赛璐璐 | 吉卜力水彩背景＋赛璐璐角色 | watercolor-cel | 讲解 |
| 睡莲 | 莫奈睡莲 | lily-pond | 讲解 |
| 点彩 | 修拉点彩 | optical-dots | 讲解 |
| 烛光 | 烛光下的读信人（伦勃朗明暗法） | candle-light | 讲解 |
| 积雨云 | 新海诚光影 | cumulus-light | 讲解 |
| 蓝时期 | 毕加索蓝色时期单色情绪 | blue-period | 讲解 |
| 白板 | 白板马克笔科普 | whiteboard | 宣传 |
| 字动 | 信息排版动态字体 | kinetic-type | 讲解 |
| 孔版 | Risograph 孔版印刷 | riso-print | 讲解 |
| 数学屋 | 数学实验室 | math-lab | 讲解 |
| 催眠 | 迷幻催眠视幻觉 | hypnotic | 讲解 |

**v4.0.0 战役批注（2026-10-08）**：38 新卡显示名如上（主类型取自各工程 project.json `recipe`：explainer=讲解 / promo=宣传）；逐卡短板已登记短板表（实据=各工程 report.md 自陈三弱点）。ink-tea 历史行状态已改「已复活重做（v4.0.0），待总验收」。

**v3.5.0 轴 D 批注**：八新卡 2026-10-06 以 12-15s 全音频样片入库并进套餐池（源工程 `科普视频/samples-d8/s34-*`，TTS+程序编曲 mgaudio 双通道 BGM+SFX 钉帧，check-plan/ffprobe 全绿）；画幅是卡属性（花字卡 9:16 原生，选卡公式不变——W1 定案）；各卡签名特征/QC 豁免档见 `styles/<sku>/SPEC.md`。

历史制作记录与本表旧名按历史保留，lessons 历史日志不改名。

分镜前查看最近相关片，记录本次保留和改变的维度及目的。新片行注明真实检查范围、媒体或QC引用和未完成项；静态样张、用户确认小样不能推导整片教学或声音已通过。

以下是历史制作记录，不是重新验证后的认证表。标为样片、静音或未过关的边界保留；没有可访问证据的行不能用于声称当前版本整片通过。

| 日期 | 片名 | 风格/配方 | 开场 | 主转场 | 背景 | 色彩弧线 | 声音 |
|---|---|---|---|---|---|---|---|
| 2026-09-27 | usa250-sand | 沙画（custom） | 灯箱铺沙渐显 | 抹沙转场 | 纸底灯箱+全局颗粒 | 纸白/深沙/琥珀暖调 | 程序音效（铺沙/扫掠） |
| 2026-09-27 | chalk-math | 粉笔黑板（custom） | 黑板木框+粉笔字渐写 | 板擦横扫 | 深绿板面+粉尘 | 板绿底+白垩+黄重点 | —（静音片） |
| 2026-09-27 | blueprint-bridge | 工程蓝图（custom） | 图框+标题栏绘制 | 图纸层叠 | 蓝图网格底 | 蓝底白线单色系 | — |
| 2026-09-27 | neon-city | 霓虹夜城（custom） | 霓虹描边逐管点亮 | 电流跳接 | 夜城景深黑 | 黑底+多色霓虹 | — |
| 2026-09-27 | ink-tea | 水墨（custom，未过关） | —（笔触引擎参考） | — | 宣纸底 | 墨分五色 | — |
| 2026-09-28 | shotcraft-promo | promo（琥珀冷底） | 拍板线长出+问句 GlitchIn@45 | 硬切+离场归零 | 冷蓝黑+星雾 | 冷开局→琥珀只给主角→冷收尾 | Mixkit《Deep Urban》+旁白 duck |
| 2026-09-29 | 午夜游戏厅_像素街机（样片） | pixel-arcade | CRT 开机闪+天际线视差 | 阶梯量化位移（stepped） | 夜空星阵+双层剪影 | 夜蓝黑+品红/荧绿/金 | （样片静音） |
| 2026-09-29 | 拼贴世界_剪纸拼贴（样片） | paper-collage | kraft 底纸铺开 | 纸片贴入（easeOutBack 微过冲） | 桌面+撕纸山峦层压 | 牛皮暖底+剪纸红/墨蓝 | （样片静音） |
| 2026-09-29 | 少即是多_瑞士版式（样片） | swiss-print | 红圆精确落格 | 硬切+模数网格精确位移 | 纯白大量留白 | 白底黑字+唯一红 | （样片静音） |
| 2026-09-29 | 终端唤醒_CRT终端（样片） | crt-terminal | 光标闪烁+荧光点亮 | 打字机/日志滚动（会话连续式） | 黑绿磷光+扫描线 | 黑底磷光绿+唯一 amber 警示 | （样片静音） |
| 2026-10-02 | anything2video 自宣传 | promo（暗色编辑风皮肤） | 灰卡阵洗牌→衬线主标淡入+字距展开 | 硬切为主+章 3 SceneWipe bar 一处 | 深炭暖黑+星雾+ShaderPost 胶片颗粒 | 暖白/炭/陶土金三色，证明拍金亮唯一大暖点 | Classical Vibes 2（Mixkit 684）+云端 TTS +25；beat_grid reliable=false 不卡拍 |
| 2026-10-06 | s34-* 11 卡套餐样片（v3.4.0 重制，用户逐卡验收通过替换 samples/） | 全部 11 卡=类型骨架×风格（工程 科普视频/samples-v34/） | 逐卡签名开场（红圆落格/CRT 开机/铺沙尘瀑/线框生长…） | 硬切为主+风格签名转场（板擦/抹沙/电流跳接） | 逐卡风格底 | 逐卡调色纪律（四色/单色系/磷光绿+唯一 amber…） | TTS+Mixkit SFX+BGM（逐卡曲目见 samples/manifest.json；黑板/版式/终端无 BGM 系风格纪律） |
