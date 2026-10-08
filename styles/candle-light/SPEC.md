# SPEC：烛光下的读信人（candle-light · 伦勃朗明暗法）

**正本源工程**：`samples-v4/candle-light`（2026-10-08 验证交付）｜**图元库**：工程 `src/style/world.ts`（暗房静态层画师+光柱+旧画罩层烘焙）+ `src/style/light.ts`（光照图管线：环境打底/光池表/flick/cloud/applyLight）+ `src/style/actors.ts`（读信人三件套重做 + impasto 鬃毛笔 + 烛焰/浮尘/云影/热气）+ `src/style/kit.tsx`（SceneCanvas 十步合成 + React 信息层）
**风格句**：光照图整幅相乘（暗是主体）+ 烛光/窗光双光源 + 失边两遍 + impasto 受光厚涂 + 分离光——「光照亮的才存在，其余的交给黑暗」。
**★ 级重做卡**：huashu INDEX 全仓唯一 ★（人物扁平 5/10）——本卡即重做本身，人物三件套是头号验收项（见下「INDEX 短板重做」）。
**技法借鉴** huashu-art-motion `scenes/32_rembrandt.js`（217 行）+ `lib/render.js` P.pool/P.lightMap/P.applyLight + `lib/brush.js` P.impasto（MIT, alchaincyf），TS 重写——机制与参数级借鉴（光照图管线/光池表数值/flick 双频噪声/云影正弦/impasto 鬃毛参数/失边两遍配比/分离光），结构、命名、API 全部按 Remotion/TS 惯用法重写，零代码拷贝。借鉴登记：`移植自 huashu-art-motion scenes/32_rembrandt.js + lib/render.js + lib/brush.js (MIT, alchaincyf), TS 重写`。

## 锁死项（签名逐条）

- **签名①光照图整幅相乘管线**（光即内容，本卡与全油画族的分界）：环境光 `rgb(30,21,13)`（=0.13）打底 → `lighter` 叠光池表 → 整幅 `multiply`（light.ts buildLightMap/applyLight）。**光池表（数值锁死）**：窗 r330 α(1−0.3cloud) / 脸 r250 α0.95±0.08flick / 胸 r230 α0.55 / 桌·信纸 r280 α0.6 / 烛 r190+40·fc α(0.6+0.4fc) / 分离光 r300 α0.35。光池中心随 `noise(0.9t)` 漂移 ±14px（呼吸感）。位图三张（static/overlay/beam）720p 原生烘焙（bake_paint.mjs，Bake 合成 3 帧），热帧零纹理计算；光照图本体每帧矢量重画（7 个渐变，廉价）。
- **签名②烛光+窗光双光源**（缺一不可）：烛焰 `flick(t)=0.5noise(2.2t)+0.25noise(6.5t)` 驱动烛光池半径/α + 焰身左右倾 `6noise(3t)` + 高度 `−8fc`；云影 `cloud=0.5+0.5sin(2.2t−0.6)` 让窗光 ×(1−0.35cloud)，暗斑 230px/s 横穿窗玻璃；剧情窗 S03 f250-268 cloudBoost 把窗光压暗→烛光成主光源→f278-300 恢复（双光源各自呼吸的叙事）。
- **签名③impasto 鬃毛厚涂**（只打受光处）：一笔=round(w/1.3) 条平行细鬃，每条亮度 ±17、两端各缩 0-25%、线宽 1.4-2.6、鬃位微抖 ±w·0.06；下侧一条 α0.28 投影；上侧 2+w/3 亮点。布点：金发冠部/髻缘/领口受光边/信纸顶缘/珍珠/颧骨/黄铜座/书口/指节。**红线：画成「暗影+主笔+亮脊」三条整齐线=白色贴纸坑（huashu 实测），每条鬃必须独立抖**；古典油画不沸腾（每帧同 seed，笔触不换位）。
- **签名④失边两遍**：角色离屏层 blur(2.4px) 全不透明画一遍 → 叠 α0.62 清晰层——暗侧融进背景、五官留清（kit SceneCanvas 第③步）。
- **签名⑤分离光**：人物暗侧背后墙面打亮 r300 α0.35（hero 增益至 0.5）——伦勃朗式把人从背景里分出来。
- **INDEX 短板重做（人物无扁平感三件套，缺一即「贴上去」）**：①角色进光照图（脸/胸光池锚点在 actors.ts READER 导出，light.ts 光池表定位）②失边两遍（上）③受光处 impasto（上）。**抗扁平底层**：皮肤多段建模（受光径向亮心@颊 + 暗侧线性只压右 1/4 + 眼窝双椭圆 + 鼻侧暗面 + 烛下鼻影朝上[烛光签名] + 颧骨暖晕 + 伦勃朗光小三角@暗侧颊）+ 体积渐变 source-atop（左上受光→右下沉入暗）+ 130 笔细笔触肌理（不沸腾）+ 读信微动作（呼吸 1.15rad/s / 头微动±1.5px·0.85rad/s / 眨眼 4.7s 周期 / 信角颤 2.1rad/s）。前后对照证据：`out/dev/char-v1-firstpass.png`（首版：平涂+等距竖裙褶+发丝压脸）→ `out/dev/char-v2-remodel.png`（重建模后）→ 正片 `stills/frame-210.png`（三件套合成后）。huashu 原版病灶（人物平涂、光照图外挂、无失边无受光厚涂→贴纸感 5/10）在本卡全部闭环。
- **锁死 token**：暗褐环境（墙 #6a4a2a→#241408 揉开底子）+ 暖金光池（脸池 `255,226,180` / 烛池 `255,180,90`）+ 暖金 soft-light 釉 `rgba(200,140,60,.35)` + 烛焰橙（#ffd890 焰身/#fff6d8 亮芯/#ffaa46 光晕）+ 桌毯深红 `#6e2414` 金边 `#b8863a` 藏青徽章。
- **合成顺序（kit SceneCanvas 十步，顺序锁死）**：静态层 PNG → 云影穿窗 → 角色失边两遍 → 光照图 multiply → 窗玻璃 screen 再提亮（0.35+0.08flick，窗是光源）→ impasto → 浮尘（楔内显形）→ 烛焰+热气 → 罩层 PNG → 暖金釉。⚠ 工程坑登记：**烘焙位图必须带 alpha（Bake 画布禁填底色）**——首版 overlay 带不透明底，第⑨步把整幅正片盖成暗板；位图预载完成后必须强制重画（delayRender 只冻结取帧，layout effect 可能早于 onload 跑过一次）。
- **版式**：衬线 Noto Serif SC；字幕卡=深胡桃木牌 `rgba(28,18,10,.9)` 暖金边 + 奶油字（暗房烛光语境铭牌，非亮色羊皮纸）；标题暖金 `#f0dfba` + 烛光 textShadow。
- **确定性**：mulberry32 + 解析 value 噪声 + sin，禁 Math.random/Date/网络。

## 复用适配点

- **光照图管线（lightMap/applyLight + 光池表）是一切「光即内容」场景的通用方案**：烛光/夜景/探照/暮色/审讯室——比逐物画明暗统一，且光照图可独立做动效层（剧情压光、爆亮脉冲、光池呼吸）。换题材只换光池表数值与锚点。
- impasto 鬃毛笔（actors.ts）+ 「只打受光处」纪律 + ±17/两端缩 0-25% 参数表——一切厚涂质感（高光/釉反光/金属缘）通用。
- 分离光技巧（暗侧背后墙打亮）——一切暗调人物场景的「把人从背景分出来」通用件。
- 失边两遍法（blur 2.4 全不透明 + α0.62 清晰层）是 sfumato 两遍（1.6px+0.82）的暗调变体，配比表可直接抄 kit.tsx。
- 工程坑两条登记（见锁死项末条）——凡「烘焙位图 + 每帧合成」架构的卡都适用。

## 与近邻卡的边界（同族差异声明）

- **candle-light ≠ sfumato（古典晕涂）**：同属油画族——candle-light 是**光照图管线**（光即内容：光池表 multiply + impasto 厚涂 + 分离光，暗是主体，光决定存在）；sfumato 是晕涂+罩层的古典日景（光是氛围不是主体，暗角只是收边，笔触不可见）。candle-light 的窗光是叙事光源（云影剧情），sfumato 的窗景是空间纵深。
- **candle-light ≠ swirl-oil（梵高流场）**：swirl-oil 笔触即造型（流场长笔三遍分区+8fps boil，笔触位置沸腾）；candle-light 笔触是肌理（背景揉开底子+细笔触不沸腾，明暗由光照图决定而非笔触方向场）。
- **candle-light ≠ light-dabs（印象派）**：light-dabs 短笔触色点分区、靠色点密度造型；candle-light 靠光照图整幅相乘，笔触只在受光处做厚涂高光。
- **candle-light ≠ blue-period（毕加索蓝）**：blue-period 单色明度映射+宽干笔可见笔触；candle-light 全暖色温（暗褐+烛橙+暖金釉），明暗由双光源决定。

## QC 豁免档

- f358-394 定帧收束 1.1s：构图冻结但烛焰 flick 噪声摇曳 + 浮尘上浮 + 热气微升（probe_liveness SC06 最长连续静止 2 对 <4 阈值；frame_metrics 最长静止 2 帧），合法微动非全静止。
- f1-4 烛火点亮前画面近黑（impasto 已门控 flameU>0.45）：钩子语义本体（烛火点亮=0.13s），probe_blank 20 帧全绿佐证非空屏。
- f1 impasto 门控瞬间的亮痕淡出：合法过渡（点火前唯一光=烛焰 bloom）。
- SC05 f330-357 zoom 回位后构图静止 4 帧（烛焰/浮尘仍动）：镜头静止非画面静止，frame_metrics 标记 OK。
- 龟裂白线在窗洞亮部略可见：旧画漆裂签名本体，非脏点。
- 末 6 帧收暗 0.35：合法收尾非黑场。

## 样张

`sample.jpg` = 正片 f277（HERO 70.3%：烛焰爆亮+脸/胸/信纸池全亮+分离光满值+impasto 领口/珍珠/信缘受光+窗光云影后恢复中——全签名同框），回归三查对照基准；辅证 `out/stills/frame-90.png`（双光源全景+光照图签）、`frame-210.png`（厚涂签+人物三件套特写）、`frame-1.png`（钩子点火前）、`frame-394.png`（定帧收束卡）。
