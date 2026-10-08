# SPEC：合成波/VHS（vhs-outrun）

**正本源工程**：`samples-v4/vhs-outrun`（2026-10-07 验证交付）｜**图元库**：工程 `src/style/`（`timeline.ts` 磁带时基/速度积分 + `kit.tsx` token/GridFloor/StripedSun/ChromeText/Sky + `roadside.tsx` 棕榈/反光柱/光带/速度线 + `vhs.tsx` VHS 做旧链/OSD/HUD + `world.tsx` 世界装配，纯 DOM/CSS/SVG 无 WebGL）
**风格句**：紫底夜空 + 一点透视滚动网格 + 条纹切缝日落 + 双层辉光 + 镀铬金属字星光掠过 + VHS 做旧链（RGB 色偏/渗色/扫描线/15fps 跟踪带/倒带卡顿）+ 棕榈剪影与反光柱公路元素。
**技法借鉴** mg-styles-15（MIT, Vincentwei1021）demos/10-synthwave——Three.js 全管线（YIQ VHS ShaderPass/时基重映射/切缝落日/滚动网格机制参数）的 DOM/SVG 惯用法重写，零代码拷贝、零 WebGL 依赖（RECON 判定 SVG/DOM 近似可达 70% 观感）。

## 签名三件套全检（缺一不可，新片自检必过）

1. **一点透视滚动网格 + 条纹日落球 + 双层辉光**：GridFloor 为 CSS 3D `rotateX(76.5deg)` 平面 + perspective 470 + 双层 repeating-linear-gradient（软辉光层 16px 渐隐线 + 锐核心层 4px 亮线）+ `backgroundPosition` 由速度曲线积分 Z 驱动滚动；StripedSun 为 SVG 渐变圆盘 + SVG mask 横向切带——**缝宽 `2+q²·16` px（q=下部归一位）、相位 `0.9/s` 上移**（SPEC 锁死参数，HERO 段整球再上移 -58px + 缝相 +1.3/s 追加）；辉光一律双层（`drop-shadow 0 0 4px` 高亮 + `0 0 30px` 低透明，日落/地平热线/镀铬字三处同规）。
2. **VHS 做旧链五件**：① RGB 色偏——SVG filter 组（feColorMatrix 三通道分离 ±2.2px feOffset + screen 混合 + 品红右向渗色 +5px/slope0.35）；② 色度渗色——品红通道额外右偏拷贝叠加（glitch 档加强至 12px/slope0.6）；③ 扫描线——3px 周期 repeating-gradient 全屏 opacity .5；④ 跟踪噪声带——feTurbulence(seed=7) 噪声带 46-74px 上下软边 mask 下行扫过 + 撕裂行 + 水平抖动，**全部钉在 15fps 步长**（`q15`）；⑤ 倒带卡顿——`sceneTime` 磁带时基重映射：f240-246 每帧回退 1 帧（2 帧倒放观感）+ f246-252 15fps 拖带重同步 + glitch 档 filter 切换 + REW OSD（全片至少一次，本样片钉 f240）。另常驻：暗角、feTurbulence 噪点（opacity .06）、CRT 开机张开幕（f1-5 scaleY+亮线）。
3. **镀铬金属字 + 星光掠过**：多层 linear-gradient（`#f2f9ff→#cfe2f4→#8fa3b8→#e9f4ff→#fff→#64788d→#2c3a4d→#9db2c6`）+ `background-clip:text` + skewX(-7deg) + 双层辉光；掠光为同 clip 覆层 `linear-gradient(100deg, transparent 40%, white 50%, transparent 60%)` 260% 宽 backgroundPosition 扫过（全片至少两道，本样片 f100-114 / f252-266）。

**公路元素（三选二全给）**：棕榈剪影（SVG 双 pass：品红 rim 面向路心 + 墨色本体，hash 定距定高变体，Z 循环掠过）+ 反光柱（路缘青/品红交替、白帽反光点、boxShadow 双层辉光）；另附路灯光带（速度门控拉丝）与路心尾迹。

## 锁死项

- **色 token**（`PK`）：紫底渐变 `#1a0b3d→#3d1466`（SPEC 锁死，Sky 落地）｜品红 `#ff2d95`（网格线/辉光/rim）｜青 `#23e5e5`（反光柱/副标/HUD）｜日落带 `#ff3d8f→#ff6547→#ffd75c`（品红→橙→黄）｜镀铬 `#f2f9ff/#2c3a4d`｜剪影墨 `#12062a`。辉光双层锁死（内 4px 高亮 + 外 30px 低透明）。
- **磁带时基**（`timeline.sceneTime`，新片按 5s/句重锚帧号但结构不变）：钩子段 15fps 步进 → 正常 1:1 → 倒带窗每帧回退 1 帧 → 15fps 拖带 → 正常；**定帧段 sceneTime 冻结而显示层伪影挂真实帧**（`VhsPost`/`Osd` 用 `fr/FPS` 的 q15）——定帧微动效的实现纪律。
- **速度曲线积分**：speed(t) 分段 smooth → dt=1/2400 梯形积分 ZT 表 → 网格滚动/棕榈/反光柱/光带全部同一 Z 驱动（源码 camZ 机制，TSX 重写）。
- **透视投影**：`project(x,zAhead)`：`k=FPX/z`、`groundY=HORIZON+1.7k`，FPX=FOV50° 等效 772；公路元素 worldX 棕榈 ±12.6-17.1 / 反光柱 ±8.9。
- **镜头语言**：全片一镜（世界连续、无场景切换、无转场件）；节奏全靠速度曲线/时基/叠层（标题、前灯、HUD、闪光）表达。
- **OSD 字**：FONT_MONO 白字 + 2px 黑影（PLAY ▶ / ◀◀ REW 黄 / STOP ❚❚ 品红 / 时码 SP 0:00:SS / TRACKING），渲染在扫描线之上保持清晰（源码 OSD after-VHS-pass 惯例）；字幕同层惯例置顶（白字黑影 + 品红微光，3f 淡入出）。

## 复用适配点

- 图元菜单：`GridFloor`（CSS 3D 网格）/`StripedSun`（SVG 切缝日落）/`ChromeText`（镀铬字+掠光）/`Sky`（紫底+seeded 星）/`PalmField`/`ReflectorPosts`/`LightBand`/`SpeedLines`/`VhsPost`（做旧链）/`VhsFilterDefs`（RGB split filter 组）/`Osd`/`SpeedHud`/`sceneTime`/`speed`/`zAt`/`sunLift`/`glowPump`/`hash1`/`q15`。
- 新片换题：只改 `script/narration.txt` + `src/Main.tsx` 无需动（世界连续）→ 实际只重锚 `timeline.ts` 的 5 个帧常量（钩子窗/倒带窗/HERO 帧/定帧帧）+ 标题字串（`world.tsx TITLE`）+ 世界配色微调；公路元素密度改 roadside 常量。
- 音频配伍：BGM 配方 `10-synthwave`（STYLE_MAP 经 `--style 10-synthwave` 直传）；SFX 主题音 = film 族（tape-rewind/cassette）+ mech 开机 + impact bass，钉帧表同源 `research/beat-sheet.json calibrated.sfxCues`。

## 与 neon 的边界（SPEC 写死差异声明）

- neon = **霓虹灯牌**：发光体是「线框图形/字牌」（描边字形、灯管边框、灯牌点灭），媒介是当代清洁屏，无年代做旧。
- vhs-outrun = **年代媒介整体**：发光体是「网格地平线+切缝日落+VHS 做旧链」三件套（缺一不可的自检项），辉光属于场景光源（日落/地平线）而非字形描边；磁带时基（15fps 步进/倒带/拖带）与 OSD 面板字是叙事本体。neon 无时基重映射、无切缝日落、无磁带噪声；本卡无灯牌点灭、无边框灯管。互斥判据：要「霓虹招牌城市夜」用 neon；要「80s 公路兜风录像带」用 vhs-outrun。

## QC 豁免档

- f362-397 定帧 1.2s：世界层冻结为合法定帧（0.8-1.2s 纪律内），微动效由 VHS 显示层伪影供给（跟踪噪声带/噪点/OSD 闪烁挂真实帧 15fps 步进，probe_liveness SC05 相邻 MAD 2.82 有活性）；f395-397 轻收暗 0.3 非黑场（probe_blank 18 帧全过）。
- 跟踪噪声带/噪点/撕裂行会被帧差类探针记「整幅噪声抖动」——是 VHS 媒介本体语义（源码 uTrack/snow 同源），有意保留，不修。
- 倒带窗（f240-252）画面整体回放/跳帧 + RGB 大色偏 + 撕裂：是签名动作（源码 tape_rewind 2 帧倒放机制），帧间 MAD 峰值 24-27 为有意冲击语言，非渲染抖动。
- 钩子段（f1-30）全片 15fps 步进：磁带 TRACKING 模式本体（源码 sceneTime `fr<30` 同构），低帧率步进为风格签名非缺帧。
- f1-5 CRT 开机：世界层 scaleY 0.02→1 + 黑幕遮挡为开机动作帧（画面内容压缩非黑屏），probe_blank 已豁免通过。
- 样片中 MPH 数字/时码为风格化虚构仪表读数（storyboard.json claims 登记），非真实车辆数据。

## 样张

`sample.jpg` = 正片 f250（HERO：REW OSD + glitch 档 RGB 大色偏 + 110 MPH 码表 + 条纹日落辉光泵 + 密网格 + 棕榈/反光柱 + 跟踪带，全签名元素同框），回归对照基准；辅证 `out/stills/frame-20.png`（TRACKING 15fps 段：开机后 PLAY OSD + 镀铬标题 + 慢滚网格）、`out/stills/frame-90.png`（油门段：速度线 + 条纹切带）、`out/stills/frame-380.png`（STOP 定帧段：磁带停走 + 噪声带持续）。
