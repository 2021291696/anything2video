# styles/ — 已验证风格库正本

每个子目录 = 一个**过验证的风格 SKU**：图元库正本 + SPEC.md 硬契约 + sample.jpg 回归样张（+ 纹理资产）。
目标：**同风格第二部片从拷库开工，不重新发明**——用户选风格如同点菜单，出片可预期。

## 当前 SKU
| 目录 | 风格 | 正本源工程 | 纹理/字体 |
|---|---|---|---|
| `sand/` | 灯箱沙画 | usa250-sand | grain.png |
| `chalk/` | 粉笔黑板 | chalk-math | dust.png |
| `blueprint/` | 工程蓝图 | blueprint-bridge | 无 |
| `neon/` | 霓虹夜城 | neon-city | 无 |
| `pixel-arcade/` | 像素街机 | style-samples（样片《午夜游戏厅》） | PressStart2P ttf（OFL） |
| `paper-collage/` | 剪纸拼贴 | style-samples（样片《拼贴世界》） | 无 |
| `swiss-print/` | 瑞士版式 | style-samples（样片《少即是多》） | 无（系统字体栈） |
| `crt-terminal/` | CRT 终端 | style-samples（样片《终端唤醒》） | 无（系统字体栈） |

（`ink-tea` 水墨未过关，不入库；其工程保留作笔触引擎参考。后四风格以**用户确认的 12s 样片**为验证基准入库（2026-09-29）；其首部正片收线后如有正本修订，走升级纪律。）

## 同风格复用流程（第二部片起）
1. 从 `styles/<风格>/` 拷图元库 + 纹理进新项目 `src/` 与 `public/assets/<slug>/`；
2. 按 SPEC.md「复用适配点」改 `staticFile` 的 slug；
3. **开工样张回归**：渲 2 帧与 `sample.jpg` 并排三查——色板 token / 笔触质感 / 版式锚点，漂移=缺陷（不比内容，只比风格语言）。首渲旁路：`new_project.sh` 已保留模板 node_modules（含 `.remotion/chrome-headless-shell`）；若从旧项目开工且首渲挂起——从任一已有项目拷 `node_modules/.remotion/chrome-headless-shell` 过去，或设 `BROWSER_EXECUTABLE` 指向本机 Chrome（lessons 09-27）；
4. 建组任务书内嵌 SPEC 的锁死项（调色板/笔触参数/版式），QC 按该风格豁免档执行。

## 新风格入库流程（首部片）
图纸先行（custom.md §1）→ 成片收线（frame_metrics 无高无中 + 用户确认样片）→ 拷图元库/纹理进 `styles/<新风格>/` → 写 SPEC.md（从库文件提取色 token 与参数，逐值如实）→ 选 1 张风格签名帧命名 `sample.jpg` → style-ledger.md 记行 → 收尾两步：跑 `template/scripts/styles_check.mjs` 必须 PASS（资产存在性 + icons 正本对拍）；许可登记——CC-BY 系图标必须登记作者名与作者链接，随交付 MANIFEST 披露。

## 升级纪律
图元库有改动（新图元/参数调整）= 正本升级：改 `styles/` 文件 + SPEC 同步 + 台账记行；项目内临时改动不回写，除非验证过。
