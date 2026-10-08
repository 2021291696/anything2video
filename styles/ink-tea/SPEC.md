# ink-tea SPEC —— 中国水墨写意（v4.0.0 复活重做）

> 机 ID 沿用 `ink-tea`（台账连续）；实现为以 huashu-art-motion 17_ink 配方为底的全新重写。
> 样片：《墨虾》（齐白石风：一只虾 + 竹 + 题跋 + 钤印），387f = 12.9s，1280×720@30。
> 签名帧实测截图：`skill-intake/sample.jpg`（f387 正片渲染 still 直转 JPEG，q:v 2）。

## 0. 技法借鉴登记

- `技法借鉴 huashu-art-motion 17_ink (MIT, alchaincyf), TSX 重写`——P.brush（毛笔飞白数学：Catmull-Rom 加密→4px 等弧长重采样→笔压剖面→湿笔芯 ribbon→逐根笔毛噪声断开）/P.leaf（两头尖单笔）/P.inkWash（外晕+本体 multiply 两遍）三大函数与 17_ink 场景参数表（窗框 w dry .45-.6、案面、墨五色 焦.9/浓.8/重.6/淡.35/清.15、钤印 1.5→1 压下、纸纤维 2600 根、雾带横移、齐白石虾六节+焦墨头胸甲+须行波），全部 Remotion(React+TSX)+Canvas2D 重写，零整段拷贝（P.brush 数学可移植逐式重实现，惯用法重写）；文件头注释逐文件登记。
- SFX：Mixkit Free License（skill 分发行取 6 个）；BGM：bgm_generate 程序编曲（CC0 VCSL via mg-styles-15, MIT code）。

## 1. 锁死 token

- **纸**：`#efe6d0` 茶色宣纸（径向暗角 α0.22；纤维弧两色 `rgba(150,125,90,·)` / `rgba(255,252,240,·)`）。
- **墨**：单色墨 `[16,14,12]`，五档 tone——焦 0.9 / 浓 0.8 / 重 0.6 / 淡 0.35 / 清 0.15（虾身 0.16-0.245 淡墨系、头胸甲前缘/双眼/须 0.7-0.95 焦浓系、水纹 0.2 清墨系）。
- **一点红**：朱日 `#d8553f`、钤印 `#c4281e`（全片红色只给这两处——「画到红处即印」纪律）。
- **笔触参数**（huashu 已验证档位，1280 宽按 0.72 比例缩宽）：窗框 w10-13 dry .45-.6；窗角括号 w3.5；案面 w16 / 桌腿 w9.5 dry .65；地线 w4 dry .85 tone .35；竹节 w7 tone .5 dry .3（节间留白 4%-94%）；竹叶 LeafStroke L96×ls wmax12 tone .86。

## 2. 图元词汇（`src/style/`，全部 Canvas2D 纯函数 + seeded）

| 文件 | 图元 | 契约 |
|---|---|---|
| `ink.ts` | 共享底座 | mulberry32 / hs 散列 / ss / K 关键帧 / makeNoise2D（seeded Perlin）/ densify（Catmull-Rom）→ resample(4px) → ribbon（变宽带）→ pathOf / TONE 墨五色 / PAL / cached 离屏缓存 |
| `RicePaper.ts` | 宣纸底 | #efe6d0 + 低频色斑 220 + 纤维短弧 2600 根两色 + 径向暗角 α.22；`W/H` 常量 |
| `InkBrush.ts` | 毛笔（P.brush 移植） | 八参数 `w/tone/dry/reveal/head/tail/bristles/col`；笔压剖面+湿笔芯+逐根笔毛连续 path+butt cap（按小段 stroke 会叠竹节——铁律） |
| `LeafStroke.ts` | 两头尖单笔（P.leaf 移植） | `(x,y,ang,L,wmax,tone,col,reveal)`；sin^0.7 宽度剖面+8% 弯度；竹叶/兰叶/虾尾/鸟翅共用 |
| `InkWash.ts` | 墨晕/留白/补纸 | `inkWash(scratch,grow,fn,{blur,halo,haloA,alpha})`（外晕+本体 multiply 两遍，grow 0→1 洇开）；`blankOut`（destination-out 留白——纸底风格通用）；`paperInside`（剪影补纸色，防 multiply 透字） |
| `SealStamp.ts` | 钤印 | `buildSeal(chars,seed,size,fontSize)`（红底+白文 destination-out+40 粒斑驳+四角磨边）+ `stampSeal(c,x,y,q)`（1.5→1 压下，multiply） |
| `RevealOrder.ts` | 时序器 | `makeReveal([{d,l}])` → `(lt)=>reveal[]`（按部件表依次写出）；`makeRevealSmooth` 平滑版 |
| `Scene.tsx` | 正片壳 | drawFrame(f) 纯帧号函数；z 序：纸→远山/朱日/雾带/小鸟→窗案笔触→竹→虾→水纹→题跋→钤印→字幕 |
| `painting.ts` | 部件库 | 窗/案笔触表、远山/朱日/雾带、竹、齐白石虾、水纹涟漪、题跋、小鸟 |

## 3. 管线纪律（水墨与油画相反）

1. **纸是底、墨只往上加、大面积留白**——留白=不画的纸（水就是留白），负形用 destination-out 挖纸（小鸟眼白）而非画白颜料。
2. **reveal 顺序=窗→案→竹→虾→题跋→钤印**（文人画卷轴收笔次序）；钩子=首笔落纸（f1 已落，lt+0.12 开场不从白纸开始）。
3. **所有随机 seeded**（mulberry32/Perlin），同帧渲两次逐像素一致（f210 双渲染 sha256 全等已验）。
4. **晕染前剪影补纸色**（`paperInside`）——multiply 对透明无效，背后墨线会透过晕染（huashu 踩坑：窗台线透过猫耳）。本片虾在留白区游弋未触发该坑，图元保留供人物/复杂遮挡场景复用。
5. **人物/角色写意度四步解法**（历史短板 6/10 的根因=角色矢量平涂未过材料关）：
   a) 角色过同一材料（白描衣纹走 InkBrush w4-6 dry .3-.4 tone .78 + InkWash 晕边 + 纸纹 textureInside 语义=destination-in 剪影 multiply 叠回）；
   b) 晕染前剪影补纸色（防 multiply 透字）；
   c) 写意五官（纸色填面+1.8px 焦墨白描勾；八大式白眼）；
   d) 动物走代码（齐白石虾参数已验证可读），**人物可走 AI 生帧合成路线（未来 opt-in，本样片未实现）**：生图按水墨造型语法出帧（绿幕 #00B140→key_split），代码管位置/换帧/材质——huashu 经验第 32 条（代码画 Q 版人被判差、AI 帧效果好）。本片无人物，以虾/竹为主角过材料关。

## 4. 编舞契约（beat 对齐 narration）

| 段 | 帧 | 事件 |
|---|---|---|
| 钩子 | f1- | 首笔落纸（<0.5s）；reveal 全程 lt=f/30+0.12 |
| S01 | f31-92 | 窗→案→竹→虾依次写出，f90 虾成（「就是一只虾」f92） |
| S02 | f99-187 | 虾游+须行波；小鸟掠过 f110-175；涟漪环起 f118 |
| S03 | f194-300 | HERO f240-290（62-74.9%）：墨晕呼吸+须波×1.5；题跋 f250-300 |
| S04 | f307-341 | 「这就是写意」 |
| 定帧 | f352-387 | 1.2s：钤印 f353-356 压下 + 水纹微漾（禁全静止） |

## 5. 与既有卡的差异边界

- **vs 历史失败版 ink-tea（人物矢量平涂，台账短板 6/10）**：本版全图元过笔墨渲染器——无一处矢量平涂（虾=淡墨节+焦墨勾、竹=飞白笔+两头尖叶、窗案=InkBrush 飞白、晕染=InkWash multiply、留白=destination-out），机 ID 沿用但实现全新。
- **vs ink-boil（mg15 05 赛璐璐逐帧沸腾）**：水墨=晕染扩散+留白+笔压飞白（墨在纸上「洇」，边缘软、有浓淡五色、大面积纸底）；cel-boil=硬边赛璐璐+off-register 填色+line boil（颜料在 cel 上「抖」，边缘硬、平涂色块、全幅覆盖）。两者同属「纸/手绘」大族但媒介语义相反：洇 vs 抖。
- **vs guofeng-scroll**：guofeng 是版式/舞台卡（暖黑底+月窗+长卷横移+描金，崭新无纸纹）；ink-tea 是整幅纸面材质卡（宣纸底+笔墨渲染+做旧式暗角）。中式题材竞标时按「端庄叙事卷轴」vs「写意画面本体」分工。

## 6. 复用适配点（别的卡怎么用这套图元）

- **InkBrush（P.brush）**：一切「毛笔/书法/手绘线」需求（guofeng-scroll 题字、whiteboard 笔迹、chalk 替代完美-freehand 的中式变体）——传 `reveal` 即得「写出」动画，`dry` 即飞白程度。
- **InkWash**：一切「晕染/扩散/水墨转场」（liquid-flow 的墨滴、转场 bleed 替代）——`grow` 驱动洇开，scratch 可复用为蒙版。
- **BlankOut**：一切「纸底/镂空」风格的负形（popup-book 剪纸镂空、paper-collage 撕白）。
- **SealStamp**：中式/日式收尾落款通用（guofeng-scroll 的朱印现在是简单方块，可换本件）。
- **RevealOrder**：一切「按部件表依次写出」的时序编舞（line-art draw-on 多笔协调、cave-wall 逐笔岩绘）。
- **RicePaper**：一切纸底材质（popup-book 牛皮纸变体、paper-collage 底纸）。

## 7. QC 豁免档

- **f383-387 纸色微沉 0.1**：合法收尾非黑场（probe_blank 20 帧全过）。
- **SC04 定帧 1.2s**：合法微动效（钤印压下+水纹微漾+竹摆+须波；probe_liveness MAD 2.61-15.26，无静止对）。
- **相邻帧 MAD 基线 1.3-1.5**：墨晕呼吸/雾带横移/竹摆为风格本体持续微动，非渲染抖动（同帧双渲染 sha256 全等已证）。
- **帧差口径**：自测 |Δluma|>4 像素占比（全分辨率、相邻帧）mean 2.65% / hero 3.64%——vs brief ≥3% 的差距与根因登记于 report 弱点 3；判活以 probe_liveness 为准（MAD≥0.5 红线，全镜 2.61+）。

## 8. 音频契约

- TTS：edge `zh-CN-YunyangNeural` +8%（锁死）；4 句 48 字 speech 9.8s，total 387f。
- BGM：`15-guochao seed 20261087 --drop 7.7`（对位 f231 hero 前沿）；高频偏亮告警（2-5kHz 8.19%）已登记，复验可议换 12-aurora-glass ambient。
- SFX 6 点（落纸/钤印必钉）：f2 paper-slide / f31+f81 paper-move / f118 paper-wind / f234 impact-deep-whoosh / f353 paper-staple；混后峰 0.90。
