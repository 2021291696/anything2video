# BGM Bake-off（用户圈选试听页）

> 2026-10-02 用户定调：BGM 不由主脚本独选——候选以 **HTML 试听页**统一呈现给用户圈选，圈定后才落位混音。适用于一切要 BGM 的片（含 promo/explainer/custom 全配方）。首验：yunkai-promo（2026-10-02）。

## 流程（阶段 2 内、混音前完成）

1. **提名**：按片气质定 3 个方向 × 每向 2–3 首，外加对照组（现曲/本机存量）。**优先从 `bgm-library.md` 已验证曲池取**，不足再上新淘——Mixkit tag 页（`mixkit.co/free-stock-music/tag/{minimal,piano,documentary,ambient,tech}/`）的 JSON-LD 含 name/genre/duration 可脚本解析；新直链必须 `curl -sI` 验 HTTP 200 再下载。
2. **生成试听页**：拷 `bgm-bakeoff-template.html` 到 `<项目根>/bgm_bakeoff/`，按卡片填曲（mp3 与 html 同目录、相对路径 src），文案按下方"卡片六件"写。
3. **开页**：`cmd //c start "" "<项目根>\bgm_bakeoff\bakeoff.html"`，用户圈 2–3 首（可多轮提名，每轮按用户反馈收窄气质描述）。
4. **贴片终选**：圈中曲裁到片长（长曲挑段、短曲单遍）→ `mix_audio.py` 侧链混音出 `audio.wav` → **remux 换音轨**（分镜未按拍点卡片的片直接 `ffmpeg -c:v copy` 换 `audio.wav`，不重渲画面）→ 每候选出一版贴片 mp4 给用户最终拍板。
5. **定稿落位**：胜者落 `public/assets/<slug>/bgm.wav` + MANIFEST 登记（曲名/作者/ID/URL/许可/sha256）+ 交付说明 BGM 节更新 + 按 `bgm-library.md` 入库纪律回填曲库表。

## 提名纪律（2026-10-02 云开首轮教训，三条全灭实录）

- **按气质提名，不按 tag 提名**：「科技感」≠ DJ/club/EDM——tech house、minimal techno 全被否（"偏 DJ 了"）；「电影氛围」≠ 空旷悲凉——meditation/drone/space 向全被否（"过于空旷悲凉"）。提名前先问用户要"温度与律动形态"，再按描述找曲，别按 genre 标签对号入座。
- **卡片六件**：曲名/作者/ID/时长 + 听感画像一句 + 落点预判 + 风险一句——用户不是在听歌，是在选"配这条片的"；长曲标"需挑段"，短曲标"单遍够用"（对片长）。
- **许可分层标注**：Mixkit 免署名 / incompetech CC-BY 需署名——CC-BY 曲入选时交付说明必须附署名文案。

## 试听页规范

- 深色面板（建议与片同色调，代入感）；按方向分组（`h2` + 一句方向定义）；顶部"怎么听"提示框，**两处听点写死**：前 20 秒钩子段（低频稳不稳、欢不欢）+ 尾 10 秒 CTA 段（收得干不干净）。
- 卡片 tag 区分：本机现成 / 新下 / 现曲待换（对照）。
- **单曲互斥**：全局 `play` 事件监听暂停其余 `<audio>`（模板已内置）；`preload="none"` 防 13 首同时加载。

## 坑

- Git Bash 的 cwd 跨调用持久但不按预期走——下载/拷贝前显式 `cd` 到目标目录，或落完后 `mv` 归位（云开首轮 13 首全落项目根实录）。
- Mixkit 数字直链 `assets.mixkit.co/music/<ID>/<ID>.mp3` 对老曲有效；直链 404 时回 tag 页解析该曲的 preview URL。
