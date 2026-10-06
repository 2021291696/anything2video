# SPEC：贴纸人科普（paperclip-sticker）

**正本源工程**：`samples-d8/s34-paperclip`（2026-10-06 验证交付）｜**图元库**：工程 `src/style/kit.tsx`（PC token + 贴纸/相机原语，纯代码无纹理依赖）
**风格句**：蓝灰米白冷静底 + 主体贴纸化粗白描边 + 扁平图标与精确数据图表 + 超宽大画布摄像机平移串联信息点。

## 锁死项
- **色 token**（`PC`）：bg `#E9EEF2`｜bgDeep `#DFE6EC`｜ink `#25313D`｜mid `#8C9AA8`｜faint `#5E6D7B`｜card `#F7F9FB`｜line `#CDD6DE`｜dot `#C9D3DC`｜accent `#FF5A36`（唯一强调，只给重点数据/标记/记号笔）。克制 2-3 色系 + 唯一强调。
- **幕底**：`PaperDots`（米白→蓝灰微纵渐变 + 44px 均匀点阵 dot 2.1px，随世界层一起被摄像机平移——坐标纸隐喻）。
- **贴纸化契约**：粗白描边 = SVG `paintOrder:'stroke'` 白 stroke `2×OW`（主体 OW=11，小图标 OW=7）或 HTML 双层字（背字 `-webkit-text-stroke` 14–18px 纸白 + 面字填色）/白卡 `boxShadow: 0 0 0 OWpx paper` + inset 细边；软阴影 = `drop-shadow(0 3+13·lift px, 6+18·lift px, rgba(22,34,46,.14+.14·lift))`。
- **入场契约**：`slap()` 贴纸拍落（预拍悬置 amp .3–.5 → 落地 → `wobble` 欠阻尼回弹 f4.5/k10）；kicker = 橙方块 18px + 中文 32px/700 + 英文角标 ls6；数字一律 `fontFeatureSettings:'tnum'`。
- **摄像机层**（借 mg 19-paperclip 机制，只借参数与结构）：世界画布 **≥2400px 宽**（本片 2860×2760）；`CamKey[]` = {t,x,y,z,r?,move?}，x/y 线性 + **log-z 插值** + 每 move 独立长曲线 ease（fly `bez(.62,0,.22,1)` / pull `bez(.42,0,.22,1)` / drift `bez(.45,0,.55,1)`）；世界 div 变换 = `translate(640,360)∘rotate∘scale(z)∘translate(−cx,−cy)`；一镜串多信息站（本片 4 站 + 拉远宽景），镜头间零硬切。
- **版式**：Noto Sans SC 单字族（中文 900 标题/700 正文、数字 900+tnum、英文角标 600+letterspacing）——克制单字族系统。

## 复用适配点
1. 无 staticFile 纹理依赖，kit 整库可拷；主体图形（心脏/回形针/日历/范围条）在工程 `src/shots/G1/film.tsx` 内按片绘制，新片替换主体与站点布局，保 `PC/STK/slap/slapStyle/CamStage/PaperDots/Kick/StickerChip/StickerText` 原样。
2. a2v 机身件换血：注册 StyleSkin `paperclip-sticker`（工程 `src/recipes/styles/paperclip-sticker.ts`：chrome subColor=ink/subStroke=纸白/subAccent=橙、barFill 橙 0.55、barGlow false、endFade=bg）。
3. 片头/片尾卡是风格自有语言（贴纸钩子 + 宽景定帧标题卡）：工程 overlay/index.ts 裁掉 OV-Title/OV-Ending/OV-EndingTop（判例 s34-blueprint 空串法的直裁版）；config.title 置空串。
4. BGM 配方：引擎原生 `19-paperclip`（STYLE_MAP 的 'explainer' slug 在当前 mgaudio 不存在，首用判例）；SFX 主题音 = crowd/heartbeat-single。

## QC 豁免档
- PaperDots 点阵会被 frame_metrics 记「整齐点阵」误报——看帧定性为风格本体，不修。
- 白描边大字在浅底上会拉低「主体对比度」类自动分——白描边是贴纸语义，看帧定性，不修。

## 样张
`sample.jpg` = f267 hero slam 帧（100,800 白描边大数字+白圈+算式贴片全要素）。`out/stills/frame-300.png`（日历贴纸 + 1440 点阵 + 100,800 盖章 + 回形针，全签名元素同框）、`out/stills/frame-400.png`（拉远宽景 + 屏幕空间标题卡定帧）；回归三查对照基准 = `out/video.mp4` f246（hero slam 白圈）。
