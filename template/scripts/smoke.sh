#!/usr/bin/env bash
# smoke.sh —— 模板级冒烟门：新项目开工前先跑一遍，四步全过才算模板就绪。
# 用法：bash scripts/smoke.sh（cwd 任意，脚本内部固定 cd 到 template 根）。
# 步骤：① tsc --noEmit ② probe_time --selftest ③ chrome-headless-shell 就绪检查 ④ 单帧成本探针。
# 注意：第 ④ 步显式传 --comp PromoDemo 是刻意的——模板自检扫演示合成（动态探针的默认值是正片 Video）。
set -e
cd "$(dirname "$0")/.."

echo '== [1/4] tsc --noEmit =='
npx tsc --noEmit

echo '== [2/4] probe_time --selftest =='
node scripts/probe_time.mjs --selftest

echo '== [3/4] chrome-headless-shell 就绪检查 =='
if [ -d node_modules/.remotion/chrome-headless-shell ]; then
  echo 'PASS: node_modules/.remotion/chrome-headless-shell 已就绪'
else
  echo '缺失：node_modules/.remotion/chrome-headless-shell 不存在，动态渲染探针无法起浏览器。'
  echo '二选一：从已有项目拷贝该目录过来；或设 BROWSER_EXECUTABLE 指向本机已装 Chrome 后重跑。'
  exit 1
fi

echo '== [4/4] probe_frame_cost（--comp PromoDemo --shots beat1,beat2，前两个演示拍） =='
node scripts/probe_frame_cost.mjs --comp PromoDemo --shots beat1,beat2

echo 'smoke PASS'
