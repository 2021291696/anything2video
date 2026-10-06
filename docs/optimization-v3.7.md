# anything2video v3.7 发布契约修复与能力收敛（收尾轮）

2026-10-06。v3.2→v3.6 五轮高速迭代（shotcraft 移植 / chrome / 套餐制 / mg15 全案 / huashu 吸收）
后的一致性收尾：**版本与发布链路修复、套餐池口径对齐、SFX 通道收敛、缓存清场**。渲染主链路、
配方、风格、验收门禁一律不动。

## 一、发布契约修复（本轮核心）

v3.4–v3.6 的三端同步走 tar/手改，发布层欠账在本轮实锤并修复：

1. **宿主入口漂移**：`hosts/` 六个文件全停在 3.1.2（含过时的双轴前选型话术），而两端
   edition 的 SKILL.md 被整份替换成通用版（frontmatter `name: anything2video`，宿主身份丢失）。
   修复：hosts/*.md 重写为**纯身份 frontmatter**（WorkBuddy 保留平台要求的
   description_zh/description_en/author/顶层 version 字段），宿主操作要点归位 `docs/adapters.md`
   （ZCode workflow API 纪律、WorkBuddy 回车不发补录）。
2. **构建期拼合式入口**：`build-editions.mjs` 新增 `composeEntry` —— edition 的 SKILL.md =
   hosts/<host>.md frontmatter + 共享 SKILL.md 正文。宿主身份与通用指导单一来源各归其位，
   `validateEntry`/`verifyEdition` 契约复活。
3. **edition.json 陈旧**：两端清单停在 3.1.2 时代，gallery/audio-engine/samples/新 docs 均不在
   coreHashes。修复：`collectCoreFiles` 清单扩至 `gallery`、`audio-engine`（samples 原本就在），
   individual 补 `docs/optimization-v3.6.md`、`docs/optimization-v3.7.md`；excluded 补
   `.pytest_cache`。新脚本 `scripts/stamp-editions.mjs` 对已安装 edition 重打入口与清单并
   verifyEdition 把关。
4. **门禁缺口**：`editions.test.mjs` 全跑 fixture 沙箱，真实仓漂移不可见（版本连漏四版即证）。
   新增 `tests/source-consistency.test.mjs`：宿主入口版本与 SKILL.md 一致性、真实树包清单锚点、
   samples/manifest 全量 sha256+posters 对账、缓存垃圾零容忍。**下次版本漂移测试直接红。**

> **同步流程变更（重要）**：共享文件改动后，edition 的 SKILL.md **不再直拷主端 SKILL.md**，
> 改跑 `node scripts/stamp-editions.mjs <edition目录>` 重打（frontmatter 换宿主身份）；
> `diff main/SKILL.md <edition>/SKILL.md` 从此**必然**只剩 frontmatter 差异，属预期，不要"修"它。

## 二、套餐池 19 卡口径对齐（v3.5.0 漏更面）

v3.5.0 池子 11→19 改版只更新了 SKILL.md/style-ledger/samples 资产，四处文档遗留 11 卡口径：

- `styles/README.md`：头部 11 张→19 张（16 SKU + 3 正本脸），"待进套餐池统一改版"→已进池。
- `recipes/_schema.md`：选皮肤口径 11→19。
- `samples/README.md`：补 v3.5.0 轴 D 8 卡样片节（源工程/mgaudio 配乐 slug/SFX 台账），
  首批表改名 v3.4.0（11）。
- 根 `README.md`：16 SKU 清单、样片表补 8 卡（含月窗/花字/玻璃/线条/等轴/液态/形变/贴纸人）、
  19 段口径、gallery/audio-engine/mix_sfx/jury 门禁入工具清单、测试命令补 source-consistency。
- 两端 edition 的 `reference/README.md`、`reference/_schema.md` 为 v3.4.0 同步期误拷僵尸
  （正确位置的 styles/README、recipes/_schema 之外的多余副本），已删除。

## 三、SFX 通用通道收敛（v3.2/3.5 双挂账合并）

`mix_audio` 无通用 SFX 钉帧通道（只有 --sfx sand）+ 8-11 份工程内 mix_sfx.py 未收敛——
新工具 `template/scripts/mix_sfx.py`（init 自动分发新工程）：

- cues 表 `audio/sfx/cues.json`（`{frame,file,gain,offset?,dur?,note}`，frame 1 起含端点，
  按 sound-design §4.5 相对 shot 起点换算后登记）；slug/fps 从 project.json 读。
- **防双混**：台账 output_sha256 与当前 audio.wav 一致即拒绝重跑（工程内副本没有的护栏）。
- 台账 `audio/sfx/sfx-mix.json` schema v2（输入输出 sha/peak/renorm/逐条 placed_at_frame）。
- 接线：SKILL.md §2、production-contract §音频、production-workflow §3、sound-design 新 §4.7、
  lessons 轴 D 行挂账闭合。工程内 11 份副本封存为历史实现，不再照抄。

## 四、清场

- 三端删除运行时缓存：`audio-engine/mgaudio/**/__pycache__`、`template/.pytest_cache`、
  `template/scripts/__pycache__`；`.gitignore` 补 `.pytest_cache/`。
- SKILL.md：v3.6.0→3.7.0；残留活词汇"双问"（v3.4.0 已废）改"套餐选卡"。

## 五、验证记录

- `node --test tests/editions.test.mjs tests/qc.test.mjs tests/runtime.test.mjs tests/source-consistency.test.mjs`
  全绿（39 旧 + 4 新）。
- 两端 edition stamp 后 verifyEdition 通过（清单 = 当前树，v3.7.0，入口 = 宿主 frontmatter 拼合）。
- 样片放映页真浏览器终验：19 卡渲染、类型×气质双筛选、竖版卡（hanazi-916）纵横比正确。
- `styles_check.mjs` 回归无新红。
- mix_sfx.py 冒烟：对 samples-v34 存量工程副本（临时目录）按其原 cues 重跑，输出与工程内
  历史实现逐帧同长、台账字段齐备、二次运行被防双混 guard 拒绝。

## 六、三端与发布

实体 `~/.agents/skills/anything2video/`，`-codex`/`-zcode` 为镜像 edition（共享文件 diff=0；
SKILL.md 按拼合式入口必然仅 frontmatter 差异，见上）。`.claude/skills`、`.codex/skills` 等
junction 自动跟随。开源仓 fork（2021291696/anything2video）自 v3.1.2 后持续分叉，本轮不同步，
回灌与 push 另行拍板。

## 七、v3.7.1 补丁：首用图像通道询问与欠费告知（2026-10-06 晚）

用户拍板：首次使用除片子输出位置外，同轮加问**可选的生图 API key**，并如实告知影响边界。
背景：TTS/音乐主链路零 key 零费用；唯一要 key 的是可选图像通道（A2V_IMAGE_* 三件套，
provider 可选 openai/minimax），缺口在「配了但没钱」只报泛化错误、不识别欠费。

- SKILL.md §0 + production-contract「能力与授权」：图像通道入持久决策，首用与根目录同轮
  询问一次；口径写死「只影响约 5%–10% 的画面效果，不填不影响出片」；决定（provider 名或
  `none`）记 `~/.anything2video/image-channel`，**密钥只走环境变量不落盘**。
- `scripts/doctor.mjs`：imageChannel 报告升级四态——env 就绪（available）/ 已声明缺 env /
  首用决定 none（不再重复问）/ 无记录（提示首用询问）；`declared` 字段透出决定，仍不回显密钥。
- `template/scripts/gen_world_frames.py`：错误透传——HTTP 401/402/403/404/429 各给具体指引
  （充值/降级/查 key/限流重跑）；MiniMax `base_resp.status_code≠0` 把 status_msg 原样透出并
  按「余额/balance→充值或降级、鉴权→查 key」解读，替换原「returned no image candidate」泛化报错。
  post_json 本体不动（SSRF 防线 assert_safe_url 保持），映射在调用侧。
- `scripts/doctor.mjs --probe-image`（显式 opt-in）：真实调用一次图像生成验证通道可达、鉴权与
  余额（**计一张图费用，默认不跑**）；stderr 预告计费，stdout 纯 JSON 增加 `imageProbe` 字段；
  JS 侧同款 URL 防线（http(s)、拒凭据、DNS 解析后拒私网/环回/保留）；显式请求探测却没跑成
  （缺 env/provider 非法/地址被拒/失败）退出码红。假 key 实测：MiniMax 返回 1004
  "login fail…"，映射正确指向查 key。
- production-contract「素材与参考片」：通道调用失败如实向用户透传上游错误与含义，欠费给
  「充值重跑 / 降级程序材质或手工生成+--register」两条路，禁泛化成"无候选图"。
- docs/adapters.md WorkBuddy 节补内置生成通道声明（与豆包工作同口径：落盘登记可用作场景
  素材、不绕过确定性渲染与 QC、可用性以当版实测为准）。
- 文档同步：README（首用询问、doctor 条目含 --probe-image、v3.7.1）；hosts 六入口 +
  SKILL.md 3.7.0→3.7.1。
- 验证：`node --test tests/*.test.mjs` 43/43 全绿；doctor 四态 + 探针三态（无 env 跳过红/
  假 key 真链路 1004 红/默认绿）实测；gen_world_frames `py_compile` + `http_hint` 单元抽查。
  两端 edition 同步走「共享文件拷贝 + stamp-editions」，镜像 diff 仅 SKILL.md frontmatter 与
  edition.json（预期）。开源仓随本补丁回灌并推送（2021291696/anything2video）。
