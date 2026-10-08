# dance-line · 凯斯·哈林粗线涂鸦（SPEC 卡）

**卡名**：dance-line（粗线＋舞蹈两大签名；huashu 31_haring 领地重写，战役 v4 批次④ D3-2）
**样片**：《街头空墙的舞蹈》12.23s / 367f / 1280×720@30（`out/video.mp4`，声明 12.233s，ffprobe 12.288s）
**定位**：音乐卡点 / 街头文化 / 青春活力题材；promo 与短科普均可。全片运动跟 BPM，是 a2v 第一张「BPM 编舞」卡。

## 借鉴登记

技法借鉴 huashu-art-motion（MIT, alchaincyf）`references/风格配方/31_haring.md` 与 `scripts/engine/scenes/31_haring.js`（109 行）的六签名机制与参数（13px 等宽线 / 并集轮廓 / 4 姿势 8fps 硬切 / 放射动作线 / 全局 BPM 弹跳相位表 / 光芒宝宝+红心），全部以 Remotion(React+TSX)+Canvas2D 惯用法重写，零整段拷贝；逐文件头注释登记（src/style/kit.ts、bpm.ts、choreo.ts、Scene.tsx）。

## 与既有卡的边界（撞车声明）

- **vs line-art**（同「等宽线」语言，互斥声明）：line-art=2.6px 细等宽线 draw-on 一笔画——克制、负空间、线性叙事；dance-line=**13px 粗线＋实色平涂＋BPM 弹跳**——狂欢、满构图、节奏叙事。密度/情绪/运动观三轴相反。
- vs hanazi-916：hanazi 是「节拍波」花字情绪卡（文字为主），dance-line 是「全场编舞」图形卡（人形为主）；BPM 数学骨架同源（bounce=|sin|^0.6）但载体不同。
- vs pop-dot（mg15 扁平弹性 MG）：pop-dot 弹簧物理逐物独立缓动；dance-line 全场共享同一 BPM 时基＋相位错 0.25 拍——「卡点」是身份不是效果。

## 签名（六项全锁，brief 逐条）

1. **粗 13px 圆头等宽黑线＋平涂**：`LW=13` 一切形体一套线宽（窗框 16/地平线 14 同一重量级）；纯色平涂无渐变。
2. **小人 4 姿势 8fps 硬切不插值**：`poseIndex(t,4,phase)=floor(t·8+phase) mod 4`；任何姿势间零插值——「这才是哈林的跳法」。
3. **放射动作线**：`radialLines()` 椭圆 n 根短直线，mulberry32(seed·97+step·13) 8fps 换角换长；舞者用头上半环（防扫腿）、狗/红心用全环。
4. **一切跟 BPM**：`bounce(t,ph)=|sin((t·128/60+ph)π)|^0.6`，拍点触地=0；各物绕自己着地点弹、相位错 0.25 拍（墙六席 0/0.25/0.5/0.75/0.25/0.5、狗 0.75、心 0.5）；BPM 从 `src/style/bpm.ts` 单点可配（beat-sheet `bpm.value` 同步）。落地压扁 sx+0.04/sy−0.05 绕脚点。
5. **光芒宝宝两帧交替＋红心跳动放射线**：窗内白色并集剪影四肢 8fps 两帧爬＋14 根光芒长短交替；红心 0.5 相位 `(1+0.15·bounce)` 跳＋放射线。
6. **并集轮廓法**：先全描（色宽+2LW）黑＋关节补丁黑盘，再统一色宽重描＋补丁色盘——外轮廓一线相连。

## RECON 点名坑的处理

- **RIG.limb 反向端帽关节露洞**（哈林小人被画成「奶牛」）：本卡肢体用原生 line stroke（圆帽），另加**关节补丁盘**双保险（黑 pass 半径 limbW/2+LW−1、色 pass limbW/2−1）——粗描边下关节零露洞（样帧 f250 无奶牛纹）。
- **hairLines 细线违背等宽纪律**：不实现（人物无发丝，光头＋眼点）。

## INDEX 短板修正（「少女不够哈林」）

五官只留**眼点＋唇**（主角唇；墙员/跳下者仅眼点）——哈林人物本无五官，留一点为认人。样帧静读：眼点+红唇位置即人脸，无鼻无眉。

## 锁死 token

黄墙 `#ffd51c` / 绿地 `#16a54a` / 黑线 `#111111` / 红 `#e8262b` / 蓝 `#1f62d6` / 粉 `#ff6fb0` / 橙 `#ff8a1c`（狗）/ 白（光芒宝宝）——纯色平涂，**禁渐变**。

## BPM 编舞接口（a2v 化）

- `src/style/bpm.ts`：`BPM=128`（唯一事实源）→ `bounce/poseIndex/step8/beatFrame` 纯函数；改一个常量全片时基跟随。
- `src/style/choreo.ts`：相位表/事件帧（MUSIC_F=120、HOOK_F=3、跳下 142/226/240）单一事实源，`tests/bpm-assert.mjs` 经 tsc 编译同源断言。
- 对接 beat-sheet 纪律：BGM drop（`--drop 4.0`=f120）即「音乐一响」因果拍；跳下/落地全钉拍点（141.6→142、226.0、240.1、254.1）。
- BGM：`--style 18-hanazi`（variety bouncy，pizzicato oom-pah）默认 BPM=128 与视觉天然同拍（audio-engine fun.py `bpm_default=128`）。

## 样片叙事结构（367f）

| 段 | 帧 | 内容 |
|---|---|---|
| SC01 | 1-119 | 钩子 f3 第一个红小人硬切入墙（爆发星→现身，0.067s）；f15-71 拍点逐个入墙排排站（poseLock 定姿势不弹）；宝宝爬/狗蹲坐 |
| SC02 | 120-179 | f120 BGM drop 全场 bounce 启用；f142 主角三步硬切跳出（墙位→半空星跳→156 落地压扁） |
| SC03 | 180-260 | HERO 齐舞：主角 4 姿势＋动作弧＋头顶放射；狗吠；红心跳；f226/f240 蓝/粉跳下——三人峰值 f226-275 |
| SC04 | 261-367 | 相机缓推 1→1.06；f282-316 题字「空墙的舞蹈」整字 8fps 逐个硬切浮现＋红粗下划线；f337-367 定帧 1.0s（宝宝交替+心放射+全场持续弹跳=微动效） |

## 工程事实

- 图元库：`src/style/`（kit 335 行 / bpm 42 / choreo 55 / Scene 236，单文件 <500）
- 音频：tts_build（edge YunyangNeural +8%，47 字 367f）→ bgm_generate（18-hanazi seed 20261102 drop 4.0，-14.1 LUFS）→ mix_audio --bed 0.08（peak 0.89）→ cues.json 9 点 → mix_sfx（9/9，peak 0.89）
- 硬验收：`tests/bpm-assert.mjs` 全绿（拍点触地 <1e-7、拍点时刻必有错拍物在弹 ≥0.6、全片每帧 ≥1 物在弹、8fps 硬切 31/31、相位四相全覆盖、事件帧对拍）
