# audio-engine — vendor 溯源与许可

**来源**：[Vincentwei1021/mg-styles-15](https://github.com/Vincentwei1021/mg-styles-15) `lib/audio/`，commit `49052d80bfaf9fa8412cc9710530e5e95a3b8d8c`（2026-10-05），vendor 日期 2026-10-06（a2v 优化全案轴 C，见 `handoff/2026-10-06-a2v优化全案-mg15与双片对标.md`）。

**构成**：`mgaudio/`（确定性配乐合成包）+ `samples/`（103 个 VCSL 乐器采样）+ `tools/` + 原 README.md（API 全文，含 recipes/SFX/ Mix 三表，先读它再用）。

**许可分层**：
- `mgaudio/` 代码与 a2v 适配层（`scripts/bgm_generate.py`）：MIT（随上游 LICENSE）
- `samples/`：VCSL 采样，CC0 —— 交付 MANIFEST 登记时许可写 `CC0 (VCSL via mg-styles-15)`，无需署名
- 升级方式：回到源仓取新 commit，整目录覆盖后跑 `scripts/bgm_generate.py --selftest` 回归；**禁改 mgaudio/ 内部源码**（保 upstream 可合并），a2v 侧定制一律写在适配层

**Windows 运行环境**（2026-10-06 冒烟验证版）：
`uv run --with numpy --with scipy --with soundfile --with numba --with pedalboard --with pyloudnorm python scripts/bgm_generate.py …`
首次运行 numba JIT 编译约 20-60s 属正常；matplotlib/librosa 仅 QC 频谱图与个别分析路径需要，缺省不装。

**上游已知差异**：上游 README 的配方表以 10 秒片为设计口径；长片多段结构由 a2v 适配层负责（见 bgm_generate.py 头注），勿改配方本体迁就长片。
