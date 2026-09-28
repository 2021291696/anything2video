#!/usr/bin/env bash
# 出 still（批量版）：still.sh <Comp: Video|Overlay|G1..G8|PromoDemo> <帧号列表 1 起,逗号分隔> <输出目录(绝对路径)> [tag]
# 单进程复用渲染器：bundle + Chrome 各冷启动一次、循环出帧（执行体 scripts/still_batch.mjs），
# 旧版「一帧一次 npx remotion still」每帧付 Node+Chrome 冷启动 ≈5–10s，一次 6 张就白烧半分钟。
# bundle 目录 build_dev_<tag>：tag 固定本组（并行组互不踩、磁盘只留一份/组）；src 改动自动重打，无需手动 rm -rf。
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd); cd "$ROOT"
COMP=$1; FRAMES=$2; OUT=$3; TAG=${4:-$COMP}
[ -n "$COMP" ] && [ -n "$FRAMES" ] && [ -n "$OUT" ] || { echo "usage: still.sh <Comp> <frames> <out_dir_abs> [tag]"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "找不到 node"; exit 1; }
node scripts/still_batch.mjs --comp "$COMP" --frames "$FRAMES" --out "$OUT" --tag "$TAG"
# 清理 4 小时以上没动过的 remotion 临时 bundle（只清明显已死的：这台机器上可能有别的
# remotion 项目/agent 正在渲染，短阈值会删掉别人正在用的 bundle）。CLEAN_TMP=0 可关闭。
[ "${CLEAN_TMP:-1}" = 1 ] && find "${TMPDIR:-/tmp}" -maxdepth 1 -name 'remotion-webpack-bundle-*' -mmin +240 -exec rm -rf {} + 2>/dev/null
ls "$OUT" | wc -l
