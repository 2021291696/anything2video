# SPEC：Risograph 孔版印刷（riso-print）

**正本源工程**：`samples-v4/riso-print`（2026-10-08 交付）｜**图元库**：`src/style/world.ts`（时刻表/版偏移状态机/确定性哈希/自检断言）+ `src/style/kit.tsx`（机台图元：纸基/滚筒/版纸翻动/叠放/床条界面/网点图案）+ `src/style/film.tsx`（双版叠印正片）——纯 SVG+CSS transform，零纹理依赖、零真 3D
**手法参考**：prompt-motion `rneayan` 条目（Risograph 印刷质感，RECON-pm-watch §2.6 五件套签名）——**手法参考、零素材搬运**（未复制其任何帧/prompt/素材，仅吸收风格方法论后重写自有实现）。
**风格句**：本白纸面 + 荧光粉/riso 蓝双专色 + 套色错位双色影 + 半调网点/hatch 填充 + 滚筒压印的印刷动作语义——「错位才是它的签名」。
**定位**：印刷物料美学向讲解（工艺流程、制作隐喻、独立创作者/工作室叙事、zine 文化题材）。

## 签名五件套（看片帧表 rneayan-474bcf 锁定）

1. **荧光双色系 + 纸张本白**：riso 荧光粉 `#FF48B0` + riso 蓝 `#0078BF` 两专色 + 本白纸 `#F4EFE4`；机台炭灰 `#3E3A36` 仅限界面层（床/字幕/slug/进纸辊），不参与版面印刷语言（限色纪律见「锁死项」）。
2. **套色错位 misregistration**：版间相对错位 2-6.5px @10fps 量化游移（world.ts 断言覆盖包络）；multiply 叠印交叠处出第三色（粉×蓝=深蓝紫，题头蓝主字+粉错位边、错位环×半调太阳交叠弧）；lock 帧 1 帧过冲 (+6.6,-4.2) 锁版撞击。
3. **网点 halftone**：SVG pattern 大颗粒网点（tile 16px，4 波段点径 6.4/4.7/3.2/2.1 同心posterize——单色版内渐变靠网点大小）；斜纹 hatch（45°，7.4/18px）与竖纹 hatch（5.6/14px）填充；定帧段网点呼吸（点半径 1±0.07 @10fps）。
4. **纸纹 + 印刷不匀**：本白纸 + 纤维斑驳（coarse multiply 0.07）+ 纸纹（fine soft-light 0.30）+ 逐帧平移颗粒（overlay 0.12）+ 版膜印边粗糙（feTurbulence 位移 2.6px，双版独立 seed）+ 滚筒条纹 lighten 条（扫印相位内）+ 上墨率 0.93 基准微透纸（ink kiss 压住帧 +7%）。
5. **印刷动作语义 ≥1 组（实为 3 组）**：①滚筒入画压下→扫印（裁剪随滚筒显墨 + 墨带/端帽/纸面阴影，f8-62/156-200）；②蓝版版纸翻动装版（CSS 3D rotateY 窄条版膜，f140-176）；③成品吐出（三进纸辊 + 纸面 jolt 震落 6/3/1px + 叠放两张滑入，f296-330）。

## 与最近似卡的差异边界（SPEC 必写项）

- **vs ink-plate（包豪斯丝印）**：ink-plate 的主语是**几何编舞**（圆/三角/方是角色，模数网格是舞台，红黄蓝黑四墨按 120BPM 落位、排队隐喻）；本卡主语是**印刷工艺本身**（分版→套印→错位的过程叙事，画面=工作台上的一张海报）。视觉上 ink-plate 是四墨红黄蓝黑+钢线网格+棘齿群转；本卡是双专色荧光系+网点/hatch+滚筒扫印，无网格编舞、无群转、无预告十字语言。二者的双版错位为**同源机制、不同形制**：ink-plate 用套准状态机（松版→敲击收紧→press lock 0.12 全对齐）讲「排错重来」；本卡相反——错位是被歌颂的签名（游移→定格在 5.6px 签名错位上，永不归零）。
- **vs pop-comic（波普漫画）**：pop-comic 是**漫画描边叙事**（粗黑描边+爆炸星+拟声词+分格+贴纸拍入，网点只作幕底纹理）；本卡**无描边、无爆炸星、无拟声词、无分格**——网点/hatch 是版面填充的印刷语言（印刷物料美学，非漫画语汇），色系是 riso 专色（荧光粉/印刷蓝）非 CMYK 波普四色。
- **题材分工**：riso-print 管印刷/工艺/工作室/独立创作题材；ink-plate 管次序/规则/节拍类抽象概念；pop-comic 管快节奏观点/辟谣/热点。

## 锁死项

- **色 token**（双专色+一纸+一界面墨，禁第五色相入版面）：粉 `#FF48B0`｜蓝 `#0078BF`｜本白纸 `#F4EFE4`｜机台炭灰 `#3E3A36`（仅床条界面）｜床 `#292623`。版面（multiply 层内）只允许粉/蓝。
- **版式几何**：机台床包内缩纸面（上 32 / 下 48 / 左右 36），纸面 1208×640，纸面内 44 裁切边距；角线四枚（印前划样，f1 即在）；床条界面（字幕/slug）不与版面混排。
- **缓动白名单**（机械理性，禁 overshoot 族；lock 帧 1 帧过冲是锁版撞击设计值非缓动）：只有 `io2`/`in2`/`lin`——world.ts 唯一导出。
- **游移量化**：10fps 量化步进（STEP=3 帧，`hash2` seeded），游移/微颤/网点呼吸全部同频——机械印刷的时间颗粒感。
- **扫印物理**：滚筒 y 单调 32→704（`in2` 扫印段），`pressExtent` 单调（断言覆盖）；墨只落纸面（`sheetClip`）且只落滚筒已压过的区域（`pressClip-P/B`）。
- **上墨率**：基准 0.93；压住/扫印起帧 +0.07、次帧 +0.03、lock 帧 +0.06——ink kiss 惯例。
- **确定性**：`hash2`（imul 混合）唯一随机源；src/ 内 grep `Math.random|Date.now|new Date|fetch(` 零实际命中（仅注释禁令）。

## 复用适配点

- 换题材：改 `world.ts` 的 `EV` 时刻表 + `film.tsx` 双版 artwork 即可换海报内容；滚筒运动学/版偏移状态机/网点图案不动。
- 图元件：`Drum`（扫印滚筒）、`PlateFlip`（版纸翻动）、`StackSheets`（成品叠放）、`FeedRollers`（进纸辊）、`RollerStreaks`（印刷不匀条纹）、`RisoDefs`（网点/hatch 图案 + 双裁剪）、`BedSlug`（状态机 slug：READY→PASS→套准→OUTPUT→DONE）。
- `plateOffset()` 的「游移→定格在签名错位」状态机是通用的「riso 完成层」——任何扁平卡叠加即得孔版质感（与 ink-plate 的套准状态机互补：一个收敛到对齐、一个收敛到错位）。

## 模块级自检（开发期纪律的运行时化）

- EV 序偶单调 + 全帧越界检；钩子 f14≤0.5s；lock f262 ∈ [223,279]（60-75% 窗口）；定帧长 36f ∈ [24,45]；相对错位包络 [2, 6.8]px 全时刻扫描 + 签名定格 ∈ [2,6.5]px；pressExtent 双版全帧单调。
- 自检命令：`node --experimental-strip-types src/style/world.ts` → PASS（随每次开发验证执行）。

## QC 豁免档

- 定帧段 f336-372（1.20s）：微动效=半调网点呼吸（点半径 1±0.07 @10fps）+ 粉版错位微颤 ±1px @10fps——合法微动效；probe_liveness SC04 相邻 MAD 1.374-6.507（最长连续静止 0 对）。
- 吐纸 jolt：f298 +6px / f299 +3px / f300 +1px 全纸面 translateY settling（印刷机吐纸语义，设计内）。
- 错位环在粉版太阳右下缘的 multiply 交叠弧 + 强调短条×绦带交叠块出第三色（深蓝紫）——riso 叠印语义本体，非瑕疵。
- 蓝版题头主字与粉版影的字腔交叠区整体偏深（multiply 深蓝紫）——rneayan 正样本同款「2016 数字」双色影形制，签名行为。
- 听感未验收（not_performed）：SFX 增益为经验档（0.11-0.22），BGM 响度床 0.08 由 mix_audio 自动归一（-14.0 LUFS）。

## 样张

`sample.jpg` = 正片 f262（t=8.70s）实测抽帧（ffmpeg -ss 8.70）：游移定格·锁进签名错位的 HERO 帧——题头蓝主字+粉错位边、错位环×半调太阳交叠、斜纹绦带×强调短条 multiply 第三色、竖纹面板、双专色色标 chip、床条 slug「套准 · 签名错位」——签名②③④⑤同帧，回归对照基准。

## 借鉴登记

- 技法借鉴 mg-styles-15 demos/09-bauhaus（MIT, Vincentwei1021），经 samples-v4/ink-plate 同构转译——Remotion/TSX 重写，未整段拷贝。具体借鉴点与重写方式：双版错位叠印管线（源 WebGL press pass → 多层偏移 SVG × mix-blend-mode multiply）、版偏移状态机（源 registration() 思路 → plateOffset() 重锚定为「游移→定格在错位」的 riso 语义）、纸牙/纤维/颗粒完成层（源 tooth/grain → 独立参数重写：bf 0.0028/0.016/0.85，seed 23/29/31）、印边粗糙（源 feTurbulence 位移 → 双版独立 seed 43/47, scale 2.6）、ink kiss 上墨率（源 densAt → densityAt 重锚定）。
- 技法借鉴 samples-l1/pop-comic 半调网点平铺（a2v 战役自有卡）——本卡改走 SVG pattern（网点需随帧呼吸缩放且参与 multiply 叠印），非拷贝。
- 手法参考 prompt-motion rneayan（网站条目，作品归创作者所有）——仅领地发现与手法研究（RECON-pm-watch §2.6 签名五件套），零素材搬运、零 prompt 搬运。
