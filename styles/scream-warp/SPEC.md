# SPEC：蒙克表现主义（scream-warp）

**正本源工程**：`samples-v4/scream-warp`（2026-10-08 续作交付）｜**图元库**：工程 `src/style/flow.ts`（长弯流线笔 + 整幅行列 warp）+ `src/style/world.ts`（呐喊世界：底稿/方向场/分区参数/血色色带/烘焙）+ `src/style/kit.tsx`（React 层：ScreamCanvas/ScreamWarp/SurgeReveal/TitleCard/EndCard）+ `src/style/strokes.ts`（油画族共享底座拷入）；**共享正本**：`samples-v4/shared/paint/strokes.ts`（swirl-oil 工人产出，油画族四卡共用）
**风格句**：长弯流线笔沿方向场积分 + 整幅行列正弦 warp（世界本身在扭）+ 血色天空 7 色波浪色带 + screamWarp 呐喊色带下压转场 + 8fps boil——「蒙克的尖叫是看不见的声音把整个世界扭弯」。
**技法借鉴** huashu-art-motion `lib/brush.js` P.flowSeeds/P.flowLines + `lib/kit.js` K.warpRows/K.warpCols + `transitions.js:442-454` screamWarp + `references/风格配方/19_munch.md`（MIT, alchaincyf），TS 重写——「种子沿随时间扭动的方向场积分、越出本区即停」「行列整体正弦位移 + margin 拉伸防露缝」「波浪前沿压色带」机制与参数级借鉴，结构、命名、API 全部按 Remotion/TS 惯用法重写，零代码拷贝。借鉴登记：`移植自 huashu-art-motion lib/brush.js P.flowSeeds/flowLines (MIT, alchaincyf), TS 重写`。

## 锁死项

- **签名①长弯流线笔（与梵高刻意分化，RECON §19 点名教训照搬梵高=墙面毛毛虫短笔一眼梵高）**：`flowLines` **无 outline 概念（不描边）**、**步数 26–42**（梵高 10）、一根笔走 **200–300px**（拉长）、宽 8–13、**α .5–.8 薄涂叠色**（减透明度）；`extraSteps=8` 前置热身步防起笔折角。分化三件（去描边/步数 10→26–42/拉长加宽减透明度）全部锁进 `FLOW_PARAMS`，禁回调。
- **签名②24px 抖动网格种子≈3854 枚**（源分辨率 1920×1080 / cell24，源卡「种子≈3600」同口径；构建期每格恒定消费 4 个随机数），分区参数 `[steps, step, width, α]`（配方 19 锁死）：天 `[32,7,10,.78]`｜峡湾 `[26,6,9,.78]`｜山丘 `[12,6,8,.8]`｜墙 `[42,7,13,.5]`｜地 `[32,8,12,.55]`。沿 `angle(x,y,t,reg)` 积分，**越出本区即停**（区域边界干净）。
- **签名③方向场（配方 19 公式）**：天 `0.55·sin(x·.011+y·.018−2.4t)+0.15·sin(y·.05+3t)`（sin 波）｜峡湾绕心切线 `atan2+π/2+0.3·sin(2t+2a)`｜山丘 `-0.9+0.4·sin(y·.03+2t)`｜墙竖向扭 `-π/2±0.5·sin(y·.011+x·.005+2.4t)+0.2·sin(x·.03−3t)`｜地指向消失点 `atan2(y−VP)+0.18·sin(x·.01+2.6t)`。
- **签名④整幅行列正弦 warp（世界在流动）**：按行 `9·sin(y·.012+4.2t)+4·sin(y·.031−6t)`（最大 ±13px）、按列 `6·sin`（最大 ±6px）；**margin 14/8 ≥ 最大位移 13/6 防露缝**（warpRows/warpCols 每带左右各拉伸 2×margin）。
- **签名⑤血色天空波浪化色带**：种子按波浪化 y `yy=y+22·sin(x·.014−2.2t)+8·sin(x·.05+3t)` 决定 **28px 色带**、血红 **7 色循环** `#e2541c #f08a24 #f4c03a #c8301e #e8743a #f6a63a #b82a1e`（配方 token 禁改色值）+ 4 条流光长波线连续游走。
- **签名⑥screamWarp 转场（配方 transitions.js:442-454 机制重写，章节缝唯一大转场）**：旧画按行扭曲 `70e·sin(y·.014+ph)+20e·sin(y·.05−ph)`、margin `92e`；新画反向 `60(1−e)·sin(y·.013−ph)`、margin `62(1−e)`；波浪前沿**从上往下压 4 道 26px 色带** `#b82a1e #e2541c #f08a24 #f4c03a`。本片窗口 f236-262（warp-slide f236 钉帧）。
- **钩子层 SurgeReveal**：血色前沿从地平线涌上天空（inOut 20f，f2=0.07s<0.5s 纪律）+ 沿前沿 2 道血色带（screamWarp 同语汇预告）。
- **性能纪律（油画族门槛 <50ms/帧）**：底稿 + flowLines + 桥景按 `boilSeed(t,8)` 预烘焙 8 态位图（Bake 合成 → `public/assets/scream-warp/paint/wide-0..7.png`，1920×1080 源分辨率）；热帧只 drawImage 换图 + 尖叫者/流光/声波环矢量重画 + warp 行列 blit。
- **桥景纪律**：三条扭动栏杆（波浪线随世界扭）+ 立柱 + 桥板缝 + 远处两个戴帽人影 + 尖叫者小像（捂脸张嘴）+ 嘴部声波环外扩（`lighter` 叠加）。
- **字体纪律（禁漫画手写体，IMFellEnglish 教训）**：中文 **Noto Serif SC**（900 标题/700 正文），西文 **Fraunces**（EDVARD MUNCH · 1893 署名）；血色深底字幕卡。
- **确定性**：mulberry32 + 解析时间函数，禁 Math.random/Date/网络（grep 审计仅注释命中）；mulberry32 生成器在函数体内按帧/按 boilSeed 重建（CAMPAIGN-4 §5.1 闭包排查项已自查，无状态累积）。

## 复用适配点

- `shared/paint/strokes.ts` 整库拷入即用（`hex2rgb/mixRGB/mulberry32/boilSeed/StrokeCache`）；`flow.ts` 的 `flowSeeds/flowLines/warpRows/warpCols` 四 API 换题只改 `world.ts` 五件事：底稿 painter、区域路由、方向场、分区参数表、色板 token。
- screamWarp 转场参数表（窗口/前沿色带/行列扭曲幅度）在 `kit.tsx ScreamWarp` + `world.ts oldWarpedForTransition/newWarpedForTransition` 两处可调；SurgeReveal 钩子（涌上方向/前沿色带对）换题即用。
- 烘焙管线（`bake.tsx` + `scripts/bake_paint.mjs` → 8 态 PNG）：油画族「热帧零笔触计算」通用模板。

## 与近邻卡的边界（同库不同参差异声明）

- **scream-warp ≠ swirl-oil（梵高）**：同一 strokes.ts 家族但**刻意分化**——swirl-oil 深蓝描边（outline #141a3c，先描后画）+ 步数 10 短促厚涂 + 三遍分区；scream-warp **不描边 + 步数 26–42 + 200–300px 长笔 + α .5–.8 薄涂**，且独有整幅 warp + screamWarp 转场（swirl-oil hero 是漩涡卷入）。判据：描边有无 + 笔长 + hero 母题（漩涡 vs 扭曲）。
- **scream-warp ≠ light-dabs（印象派）**：light-dabs 短笔触色点（光斑、位置固定不沸腾、stable() 防重洗为默认行为）；scream-warp 长弯流线笔沿方向场**积分成线** + 8fps boil + 整幅扭动。域：印象派外光写生 vs 表现主义情绪扭曲。
- **scream-warp ≠ lily-pond（莫奈）**：莫奈水光横向碎笔 + 睡莲母题、boil 只给水面；scream-warp 五区全方向场 + 世界级 warp。
- 油画族共享判据：三卡共享 strokes.ts 底座，参数预设各卡 SPEC 锁死，任何撞近亲的新卡照 §19「识别度来自与近亲风格的刻意分化」案抄分化思路。

## QC 豁免档

- 定帧段 f368-400 构图冻结 1.07s（0.8-1.2s 纪律内）：微动=8fps boil 换种子 + warp 0.42 持续 + 流光游走 + 尖叫者嘴部张合（probe_liveness SC07 MAD 21-33，最长连续静止 0 对），非全静止。
- f1 暗场（cover 0.82 世界微透 + warp 0.3 微摆）：钩子前「未落笔之夜」，亮度均值非黑（probe_blank 全过），血色前沿 f2 涌上即破暗。
- f300 硬切过渡帧：screamWarp 章节缝转场扫过，probe_blank 自动豁免（不计缺陷）。
- HERO 特写段 scale 2.05（f263-300）：烘焙位图放大笔触软化——「凑近看油画」的语义本体，非渲染缺陷。
- 自检盲测（验收要点：不得被判为梵高）：out/stills 6 帧读图判读——画面读出「呐喊」母题（血色天空+桥+捂脸尖叫者）、笔触无深色描边、长弯薄涂，判为蒙克表现主义，不判梵高；天空卷曲语汇与星夜同源属《呐喊》原作本体（峡湾漩涡），分化靠无描边+长笔+人物母题+血红 token 托底（残余风险见 report 弱点③）。

## 样张

`sample.jpg` = 正片 f279（HERO 峰值：warp 全开行 ±13px + 尖叫者特写 scale 2.05 + 嘴部声波环满幅 + 血色波浪色带，全签名同框；68.7% 落 60-75% hero 窗口），回归三查对照基准；辅证 `out/stills/frame-120.png`（S01 全景五区笔触+桥景+人影）、`frame-250.png`（screamWarp 转场中程波浪前沿）、`frame-406.png`（EndCard 定帧收束）、`frame-1.png`（暗场钩子前）。
