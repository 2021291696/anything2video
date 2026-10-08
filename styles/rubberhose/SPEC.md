# rubberhose · 1930 橡皮管卡通（skill-intake SPEC）

**卡 ID**：`rubberhose` ｜ **战役**：a2v v4.0.0 批次④ D3-3 ｜ **源**：huashu-art-motion 33_rubberhose（INDEX ★★★，★★★ 短板清除后入池）
**样片**：《闹钟的抗议》396f = 13.2s，1280×720@30，`out/video.mp4`

## 借鉴登记

技法借鉴 huashu-art-motion（MIT, alchaincyf）`references/风格配方/33_rubberhose.md` + `scripts/engine/scenes/33_rubberhose.js`（219 行）+ `lib/post.js P.film/P.gateWeave/P.fade`，Remotion(React+TSX)+Canvas2D 重写，零整段拷贝。场景内容（卧室+闹钟+猫+锣）、角色画法细节、编排为本卡原创。

## 图元库（`src/style/`）

| 文件 | 内容 |
|---|---|
| `types.ts` | 锁死 token（见下）+ BEAT=60/128 |
| `prims.ts` | `stepTime`（12fps 步进时基）/ `bnc`（拍子弹跳）/ `boing`（世界坐标压扁拉伸，布景用）/ `boingLocal`（本地坐标版，演员用）/ `smooth`（Catmull-Rom→贝塞尔）/ `pieEye`（派切眼）/ `hose`（恒粗面条臂）/ `glove`（白手套 4 指）/ `burstStar` / `noteGlyph` / mulberry32+hash2 |
| `film.ts` | `filmLayer`（24fps 闪烁双叠/划痕 floor(t·6) 跨格存活/灰尘毛发/颗粒 ±20px/圆角片门 r44+暗角）/ `gateWeave`（±1.5/±2px@24fps）/ `fadeMono`（saturation 去色+multiply #f2e8d2）/ `drawCountdown` / `drawIris` |
| `set.ts` | 纸色单色底缓存（墙纸竖条+菱点/地板砖缝/踢脚线/水彩压暗）/ 太阳脸（光芒 rotate(tq·1.6)+脸随拍点头）/ 窗+树+云（随拍弹）/ 圆点窗帘（下摆随拍甩）/ 床头柜/床/铜锣架（wobble 衰减振荡）/ 片名拍入 / 字幕条 |
| `cast.ts` | 闹钟（ring 唱歌：铃碗震颤+指针疯转+ring 弧+音符；jump 抛物线；dance：面条臂挥槌敲锣+交替踢腿）/ 猫（sleep 闭眼弧+ZZZ；flop 双手套扣枕头耳朵压平；slap 派切眼怒视+面条臂按拍拍打） |

## 锁死 token（去色后色板）

整片每帧 `saturation` 合成灰 α=1 + `multiply #f2e8d2`——全部填色去色后塌缩为 **4 个明度档 + 纸白**，无第二色相：
墨线 `#141210` ／ 深档 `#5e574b` ／ 中档 `#a39a84` ／ 浅档 `#d9d0b8` ／ 纸底 `#efe7d2` ／ 纸白 `#fbf7ec`（+ `#f4eedc/#f6f0e0/#e5dcc5/#cfc5ab/#cdc3a8/#8a816c` 同族中间档，multiply 后并入上述档位）。禁引入饱和色。

## 签名（六项全落实，验收对照 `qc/self-check.json`）

1. **12fps 步进一拍二**：`tq=floor(t·12)/12` 全场景唯一角色/母题时基（猫举枕头也步进——「一顿一顿」是风格的一半不是卡顿）；胶片层独用 24fps。
2. **派切眼+面条臂+白手套**：黑瞳 `arc(-1.45..-0.85)` 切楔形；二次贝塞尔恒粗臂+墨边 10px；4 指手套+外翻袖口+手背三道线。
3. **一切按拍弹跳**：`bnc(tq,ph)=|sin(π(tq/BEAT+ph))|`，各物相位错 0.25 拍；落地压扁 sx+0.09k/sy−0.09k、腾空拉长 5%k。
4. **胶片层全套**：闪烁/跨格存活划痕/灰尘毛发/颗粒抖动/圆角片门+gateWeave。
5. **太阳脸**：光芒 12 齿 rotate 1.6rad/s（随步进）+ 脸随拍点头。
6. **去色染色收尾**：角色画完再统一 fade（手套残留暖色是坑）；f360 定帧段叠加加深褪色。

## 短板修正（INDEX：运动大半是胶片噪声）

实测方法：`scripts/measure_body_share.mjs`——HERO 窗口 f238-299 逐帧 stills，61 相邻对 MAD 按「跨/不跨 12fps 步进」分两组：跨步对（本体+胶片）15.242 / 同步对（纯胶片）6.385 → **本体动作占比 58.1% ≥ 50%** ✓。手段：ring 弧/音符/锣冲击星/猫拍打/闹钟踢腿等本体动作全部按拍大幅运动，胶片层保持配方原参数不加重。

## 差异边界（三种「复古」互斥，SPEC 声明）

- `crt-terminal` = 终端字符流（磷光绿 CRT 文本界面）
- `pixel-arcade` = 8bit 游戏机（像素精灵+调色板量化）
- `rubberhose`（本卡）= 1930 手绘赛璐珞（墨线手绘+一拍二+胶片放映 artifacts）
与 `retro` 族其他卡零共用签名件；与 `shadow-play`（皮影）同走 12/10fps 步进家族但媒介（透光皮件 vs 纸面手绘）零重叠。

## 纪律与验收

- 猫身轮廓必须 `smooth`（折线在卡通里一眼直边）；步进帧率全场景一致（无 10/12 混用）。
- 钩子 0.5s 内（f1-13 倒计时+iris=0.43s）｜HERO f238=60.1%（窗口 f238-297）｜结尾定帧 f360-396=1.2s 带微动效（动作 12% 速率+胶片全速）。
- 逐帧确定性：mulberry32+hash2，禁 Math.random/Date/网络；f210 两次渲染 sha256 全等。
- 音频：TTS edge YunyangNeural +8%（GAP6/LEAD30/TAIL40）；BGM `--style 05-cel-boil --seed 20261103 --drop 7.9`；SFX 9 点（锣 f238/闹铃 f14+f58 必钉）。
