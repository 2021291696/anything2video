// grain-flat SPEC —— 当代扁平插画（huashu 16_2026 领地重写，战役 v4.0.0 批次④ D2-3）
// 技法借鉴 huashu-art-motion (MIT, alchaincyf) scenes/16_2026.js + references/风格配方/16_2026.md，Remotion/TSX 重写。
// 样片：《一只猫的晨间仪式》12.82s / 383f / 1280×720@30（ffprobe 实测，out/probe.json）。
//
// ## 定位
// 表演密集型角色动画卡：姿势库驱动的一次连续表演（跳+拍杯+碎裂+惊呼），适合拟人短剧/生活流科普/喜剧化讲解。
// 与近亲的边界：hanazi-916 是花字先行的综艺风（角色是静态几何）、clay-town 是黏土材质语言、
// paperclip-sticker 是贴纸拼贴——本卡是「无描边色块扁平插画 + 骨骼级角色表演」，领地不重叠。
//
// ## 八签名（全落实，样片实测位置）
// ① mixPose 姿势库逐数值插值（pose.ts：SIT/STRETCH/REACH/LEAP/LAND/LICK 六姿势，每姿势 body10 点/chest6 点/
//    haunch/stripes3/head/front×2/hind/tail4 贝塞尔点/ear/gy，mixA 递归 lerp）——亮相：f108-124 伸懒腰 SIT→STRETCH
// ② 绕脚轴挤压拉伸（pose.ts applyCatTransform：translate(质心)→[pivot=ground] translate(0,gy) rotate scale(dir·sx,sy)
//    translate(0,-gy)）——下蹲/落桌时轴钉脚底，脚不离地：f100-108 下蹲 sy0.88 / f172-176 落桌挤压 sy0.70
// ③ 翻面最扁帧 snap（pose.ts flipSnapAt + state.ts catState：f176（sy 最低帧）dir +1→-1 一次切换，无 2-3 帧纸片翻转）
//    ——qc/flip_strip.png f173-178 连续帧实证：f175 面右→f176 面左，无中间翻转姿态
// ④ damped 阻尼二次动作（damped.ts：amp·exp(-dt/decay)·sin(2π·dt/period)，一维阻尼振动器）
//    ——吊灯 damped(f,176,0.055,26,22)+damped(f,263,0.045,22,20)；虎尾兰 damped(f,152,0.035,22,18)+damped(f,263,0.05,9,26)；
//    杯身被拍后 damped 晃（state.ts cupState）；闹钟机身受击 damped。**跨卡可借 util**（10 行，任何「冲击帧后世界活着」场景通用）
// ⑤ stipple 颗粒点彩密度函数（stipple.ts：形状内撒方点，密度=位置函数；粉圆 0.12+0.75·clamp((y-cy+80)/340)，
//    淡紫往右下密、太阳往右下密）+ 角色层叠静态颗粒纹理 source-atop（5% 暗 α70+3.5% 亮 α90，grainTexture seed2026）
// ⑥ 无描边色块+同色系深一档分体块（actors.ts：猫身 orange、虎斑/轮廓 orangeDk、大腿亮块 orangeLt+深色弧边、
//    白胸 catWhite；家具 navy+navyDk 分缝；杯 cup+cupDk 侧带——全部靠色块分体块，零 stroke）
// ⑦ 目标反算（actors.ts drawCat 拍杯：先施前倾变换，再 c.getTransform().invertSelf().transformPoint(杯沿世界坐标)
//    换回局部坐标当爪子目标）——f197-245 三次拍杯爪子沿全程真实触到杯沿（stills/frame-240.png 实证）
// ⑧ 特效小件 ≥3：起跳/小跳烟尘（dust 4 团外扩）、咖啡滴拖尾（drips 6 颗沿过去轨迹越早越小）、冲击放射线
//    （shatter 7 道 8 帧淡出）+ 附加：拍杯动线 3 短线、双圈灰涟漪、大碎片拉格朗日抛物线×2、碎屑×9、咖啡渍扩散
//
// ## 锁死 token
// 奶油底 wall #f6efe2 / floor #eedfc7 + 粉圆 #f5cdc6·#e8807b / 淡紫 #e4dbf6·#b9a4ea / 阳光黄 #f2b33d·#d99a26 /
// 藏青 #262a5c·#1d2050 / 猫 #f0a23c·#d8832a·#f3ad4c·#fff8ee / 杯 #e35b55·#c4433e / 咖啡 #b8782f ——
// 全低饱和同色系族+深一档阴影色，无第五色相，无描边。
//
// ## 分镜合同（详见 research/beat-sheet.json 与 script/storyboard.json）
// 钩子 f2 闹钟首响+猫耳动（0.03s<0.5s）；HERO f133-283 连续表演段 150 帧=5.0s（跳+拍杯+碎裂+惊呼逐帧分镜无跳变，
// 峰值碎裂 f263=68.7% 落 60-75% 窗口 f230-287）；结尾定帧 f347-383=1.2s（尾尖摆+耳抖+墙饰 4fps 沸腾+阻尼余摆，禁全静止）。
//
// ## 音频三件
// TTS=edge YunyangNeural +8%（GAP6/LEAD30/TAIL40）；BGM=01-flat-vector seed20261098 drop8.8（对位碎裂+惊呼）；
// SFX=12 点 Mixkit（碎裂 f263/惊呼 f266 必钉；research/audio-notes.md 全登记）。
//
// ## 借鉴登记
// 技法借鉴 huashu-art-motion（MIT, alchaincyf）：姿势库+mixPose+绕脚轴变换链+翻面 snap+stipple 密度点彩+
// source-atop 角色颗粒+damped+invertSelf 目标反算+碎裂小件参数表——机制与参数可搬、惯用法一律 Remotion/TSX 重写，
// 禁整段拷贝（源 scenes/16_2026.js 为 canvas 命令式引擎，本卡为 React 组件+纯帧号 drawFrame，点位/分镜全新排布）。
// 教训吸收（配方层踩坑直接进实现）：翻面在压到最扁一帧 snap 而非 2-3 帧插值；爪子目标必须经
// getTransform().invertSelf() 反算（否则前倾 0.38rad 后爪往下偏 ~60px 戳进桌面）；挤压拉伸绕脚底故蹲下脚不离地。
//
// ## 复用指引（后续卡要借这套工具箱）
// - 要「角色表演」：拷 src/style/pose.ts（姿势表结构+mixPose+applyCatTransform+flipSnapAt）+damped.ts，按卡重排姿势点。
// - 要「颗粒扁平质感」：拷 src/style/stipple.ts（stipple+grainTexture+cached），密度函数按卡重写。
// - damped.ts 单文件无依赖，**跨卡可借 util**（升级 clay-town/hanazi/paperclip 的环境二次动作时直接内嵌）。
