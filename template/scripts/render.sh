#!/usr/bin/env bash
# 整片渲染：VER=v1 scripts/render.sh  → renders/<slug>_v1.mp4 + fin_frames/ + renders/sheet_v1.html
# bundle 复用：build_full 带 .src_ok 戳且不旧于 src/ 与 public/ 则直接复用（v1→v2 修复轮改了代码会自动重打）。
#   SKIP_BUNDLE=1 强制复用；SKIP_BUNDLE=0 强制重打；默认 auto（按新鲜度）。build_full 默认保留（KEEP_BUNDLE=0 删），
#   复用后下一轮渲染省一次 bundle（≈1 分钟）。
# 并发：默认 CPU 核数、上限 12（720p×N 个标签页，更高会吃爆内存）；CONC=8 可覆盖。
# 探针提示：渲前跑探针（probe_av_sync 等）时先 rm -rf scripts/.probe-tmp 防旧 bundle 假红
#   ——probe_blank 误报根源是复用旧 bundle，宁重打勿误报（lessons 批 4）。
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd); cd "$ROOT"
# python 解释器：Windows/Git Bash 下 command -v python3 能解析到 python3.bat 却无法直接执行，
# 所以用"跑得通"而不是"找得到"来判定
PY=""
for c in python3 python; do
  command -v "$c" >/dev/null 2>&1 && "$c" -c 'pass' >/dev/null 2>&1 && { PY=$c; break; }
done
[ -n "$PY" ] || { echo "找不到可执行的 python3 / python"; exit 1; }
V=${VER:-v1}
SLUG=$($PY -c "import re;print(re.search(r\"slug:\s*'([^']+)'\", open('src/config.ts').read()).group(1))")
CONC=${CONC:-$($PY -c "import os;print(min(os.cpu_count() or 6, 12))")}
mkdir -p renders
# bundle 新鲜度对账：有 .src_ok 戳且 src/、public/ 无更新文件才复用
if [ "${SKIP_BUNDLE:-auto}" = "0" ] || { [ "${SKIP_BUNDLE:-auto}" != "1" ] && { [ ! -f build_full/.src_ok ] || [ -n "$(find src public -type f -newer build_full/.src_ok -print -quit 2>/dev/null)" ]; }; }; then
  rm -rf build_full && npx remotion bundle src/index.ts --out-dir build_full --log=error && touch build_full/.src_ok
else
  echo "bundle 复用: build_full（源码无更新）"
fi
npx remotion render build_full Video "renders/${SLUG}_${V}.mp4" --codec=h264 --crf=16 --concurrency=$CONC --timeout=${RTIMEOUT:-300000} --log=error
[ -s "renders/${SLUG}_${V}.mp4" ] || { echo "RENDER FAILED"; exit 1; }
# 全帧抽取：frame_metrics.py 逐镜头对账依赖 fin_frames 全量帧（--step 4 采样），QC 轮不要跳；
# 只想快速验成片本身时 SKIP_FRAMES=1 可跳过（省 7200 帧的 ffmpeg 抽取 ≈1–2 分钟）
if [ "${SKIP_FRAMES:-0}" = 1 ]; then
  echo "SKIP_FRAMES=1：跳过全帧抽取与 contact sheet（frame_metrics 本轮不可跑）"
else
  rm -rf fin_frames && mkdir -p fin_frames
  ffmpeg -v error -y -i "renders/${SLUG}_${V}.mp4" -q:v 4 fin_frames/f_%04d.jpg
  ls fin_frames | wc -l > fin_count.txt
  $PY scripts/sheet.py fin_frames "renders/sheet_${V}.html" 60 || true
fi
[ "${KEEP_BUNDLE:-1}" = 1 ] || rm -rf build_full
echo done > render.done
