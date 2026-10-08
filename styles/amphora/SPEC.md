# SPEC：amphora（阿提卡黑绘陶器）

- **卡 ID**：`amphora`（批次④ huashu 新领地，RECON-huashu §03_greek，INDEX ★★★）
- **样片**：《一只陶瓶的航行》12.2s / 367f / 1280×720@30，工程 `科普视频/samples-v4/amphora/`
- **签名帧实测截图**：`skill-intake/sample.jpg`（正片 f90 实渲帧：铭文面+三件套+双带）
- **借鉴登记**：技法借鉴 huashu-art-motion scenes/03_greek 配方与 references/风格配方/03_greek.md（MIT），Remotion/React-TSX 重写，零代码拷贝；配方原文见 `tmp/huashu-art-motion/references/风格配方/03_greek.md`

## 1. 视觉语法（锁死）

**一句话**：黑釉剪影 + 陶土刻线 + 附加色三件套，零纹理零滤镜——做到这三样一眼是希腊陶瓶。

1. **三件套**：剪影一律 `#1b120d` 不描边；刻线一律陶土亮橙 `#e8904c` 1.5-2px（衣褶/五官/黑叠黑分界）；附加色紫红 `#8a2a37` 色带 + 白彩 `#f6ead6` 点（r≈2，间距 11-17px）。
2. **六色锁死**：陶土 `#dc6a2f` / 亮陶土（瓶面板）`#e8803f` / 黑釉 `#1b120d` / 紫红 `#8a2a37` / 白 `#f6ead6` / 刻线 `#e8904c`。不增不减。
3. **拉坯纹底**：水平条带噪声 `noise(x*0.006, y*0.85)` ±11 + fbm 斑驳 ±36（480×270 预渲放大）+ 560 条随机水平细线（150-1050 长，分带扫现+常驻微闪 ±30%）+ 深 420/浅 120 斑点 + 暖心径向提亮 + 暗角。
4. **滚动纹带**：预渲条带 dataURL + `backgroundPositionX = -(off mod P)`。顶回纹 P=60（单元折线 `[[4,46],[4,0],[50,0],[50,34],[18,34],[18,14],[36,14],[36,22]]` + 通长底线，7px 黑线）；**底莲苞链真实周期 = 2 单元 = 76px**（奇数苞填紫红），wrap 必须用 76 否则每 38px 跳色。匀速漂移 22/30px/s + 转面拍点 easeInOut 跳（60/76px）。
5. **陶瓶滚筒**：瓶影静立，鼓面内容横移 = 瓶在转。四面 ×420px（铭文/帆船/海豚/里拉琴），面间隔紫红竖带+白点列；转面 = easeInOut 367.9px（=面宽 420−漂移补偿，转完新面回中）；转面③ 405px 多转 37px 让初始铭文面自右缘回入（P 终值≈1292）=「绕瓶一周」。
6. **手写铭文**：自写笔画表（每字母 1-3 段折线，单位格 0..1），字母高 ×(0.9-1.06) 随机、基线 ±6%、顶点 ±0.7px；**Ο 画成小圆（字高 0.25）**，Ι 宽 2px——手写陶画味=不等高+小 o。
7. **黑叠黑**：只能靠 clip 刻线分界——斜倚人形臂对躯干/发髻用 clipPath 内 2-2.4px 刻线勾出；里拉琴臂对音箱同法。

## 2. 图元库（`src/style/`）

| 文件 | 图元 |
|---|---|
| kit.tsx | `AM` 六色 / `mulberry32`+`hash1`（状态挂闭包外层）/ `terracottaBackdropUrl` / `WHEEL_LINES` / `meanderStripUrl` / `lotusStripUrl` / `StripBand` / `GreekText` / `WhiteDotRow` / `PurpleBand` / `DotFlower` / `Rosette` / `Palmette` |
| figures.tsx | `vaseOutlinePath` / `panelPath` / `Handle` / `NeckDeco` / `FootRays` / `VaseGloss` / `Dolphin` / `Recliner` / `Ship` / `Lyre` / `WaveBand` / `drumP` / `FaceDivider` / `Splash` |

## 3. INDEX 短板修正

INDEX 03_greek 短板「RIG 裙摆偏厚」：本卡不套 RIG，人物（斜倚人形）整只重画——薄袍贴体收薄（摆带 5.5px）、支臂独立剪影、衣褶 5 条刻线。**验收=侧脸剪影下五官刻线可读**：额鼻线/眉/杏仁眼（白眼底+黑瞳）/唇/颌 2-2.4px 刻线，`out/recliner_zoom.png`（正片 f210 4x）目检可读。

## 4. 与既有卡边界

- **guofeng-scroll**（水墨长卷）：同为古文明叙事，但介质相反（纸绢线描 vs 陶壁剪影），无撞车。
- **pop-comic / cave-wall 等剪影族**：黑绘三件套（剪影+刻线+附加色）与"无附加色的纯剪影"分家；本卡唯一带"刻线穿黑"语法。
- 与 huashu 原库其他风格（04_roman 马赛克等）无共用图元。

## 5. 运动配额（防「没动」判罚）

全片四层常驻动：滚筒漂移 14px/s（+三次 easeInOut 转面）、顶带回纹 22px/s / 底带莲苞 30px/s、海豚 ±9px 游（0.85s，相位差 1.3）+船摇（±4px/±0.025rad，0.9s）+琴摆（±5°，0.8s）、拉坯纹微闪 ±30%（0.7Hz）。定帧段（f332-367）滚筒停、其余全保留——probe_liveness 实测定帧段 MAD 4.4-5.3 非零。

## 6. 许可

huashu-art-motion：MIT（`LICENSE-THIRDPARTY` 登记链由主控统一执行）；本工程全部视觉元素为代码原绘，无第三方素材。
