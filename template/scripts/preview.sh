#!/usr/bin/env bash
# 前 N 秒样片（确认点④：先给用户看风格，别等整片渲完）：preview.sh [秒数=30] [起始秒=0]
#   → renders/<slug>_preview_<a>-<b>s.mp4（含配音/字幕/进度条；还没建的组是空画面，正常）
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd); cd "$ROOT"
# python 解释器：Windows/Git Bash 下 command -v python3 能解析到 python3.bat 却无法直接执行，
# 所以用"跑得通"而不是"找得到"来判定
PY=""
for c in python3 python; do
  command -v "$c" >/dev/null 2>&1 && "$c" -c 'pass' >/dev/null 2>&1 && { PY=$c; break; }
done
[ -n "$PY" ] || { echo "找不到可执行的 python3 / python"; exit 1; }
SEC=${1:-30}; FROM=${2:-0}
SLUG=$($PY -c "import re;print(re.search(r\"slug:\s*'([^']+)'\", open('src/config.ts').read()).group(1))")
TOTAL=$($PY -c "import re;print(re.search(r'TOTAL_FRAMES\s*=\s*(\d+)', open('src/common/timeline.ts').read()).group(1))")
A=$((FROM * 30)); B=$((A + SEC * 30 - 1))
[ $B -gt $((TOTAL - 1)) ] && B=$((TOTAL - 1))
mkdir -p renders
OUTF="renders/${SLUG}_preview_${FROM}-$((FROM + SEC))s.mp4"
CONC=${CONC:-$($PY -c "import os;print(min(os.cpu_count() or 6, 12))")}
# bundle 复用：build_prev 带 .src_ok 戳且 src/、public/ 无更新则直接复用（打样门反馈改码后自动重打）
if [ "${SKIP_BUNDLE:-auto}" = "0" ] || { [ "${SKIP_BUNDLE:-auto}" != "1" ] && { [ ! -f build_prev/.src_ok ] || [ -n "$(find src public -type f -newer build_prev/.src_ok -print -quit 2>/dev/null)" ]; }; }; then
  rm -rf build_prev && npx remotion bundle src/index.ts --out-dir build_prev --log=error && touch build_prev/.src_ok
fi
npx remotion render build_prev Video "$OUTF" --codec=h264 --crf=18 --frames=$A-$B --concurrency=$CONC --timeout=${RTIMEOUT:-300000} --log=error
[ -s "$OUTF" ] || { echo "PREVIEW FAILED"; exit 1; }
[ "${KEEP_BUNDLE:-1}" = 1 ] || rm -rf build_prev
echo "$OUTF"
