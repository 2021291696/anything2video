#!/usr/bin/env bash
# 30 帧测渲测 fps：test_render.sh <Comp> <起始帧 1 起> [tag]   正常 30 帧 3–12 s；<3 fps 要查滤镜/DOM
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd); cd "$ROOT"
COMP=$1; A=$2; TAG=${3:-$COMP}; B=build_dev_$TAG
[ -n "$COMP" ] && [ -n "$A" ] || { echo "usage: test_render.sh <Comp> <start_frame> [tag]"; exit 1; }
# bundle 新鲜度门：src/public 任一源文件比打标记新 → 重打（否则修完代码测的是旧 bundle，fps/运行时结论全失真）
if [ -d "$B" ]; then
  [ -f "$B/.bundled" ] || touch "$B/.bundled"
  if find src public -type f -newer "$B/.bundled" -print -quit 2>/dev/null | grep -q .; then
    rm -rf "$B"; echo "[test_render] bundle 过期，重打"
  fi
fi
[ -d "$B" ] || { npx remotion bundle src/index.ts --out-dir "$B" --log=error && touch "$B/.bundled"; }
OUT=$(mktemp -d "${TMPDIR:-/tmp}/explainer_test_${TAG}_XXXXXX")
trap 'rm -rf "$OUT"' EXIT
time npx remotion render "$B" "$COMP" "$OUT" --sequence --image-format=jpeg --frames=$((A-1))-$((A+28)) --log=error
ls "$OUT" | wc -l
