#!/usr/bin/env bash
# 从模板创建新项目：new_project.sh <slug>  或  new_project.sh <目标目录> <slug>
# 单参数 = 数据去向约定：项目默认落 $A2V_DATA_ROOT/<slug>（环境变量未设时默认 ~/a2v-projects）；
# 运行期产物（成片/帧/QC/调研）随项目根走，skill/仓库目录零污染（见 SKILL.md §数据去向）。
set -e
HERE=$(cd "$(dirname "$0")/.." && pwd)
DATA_ROOT="${A2V_DATA_ROOT:-$HOME/a2v-projects}"
# 本脚本必须留在 template/scripts/ 里：$HERE 是下面拷贝的源，脚本被单独拷到别处时
# $HERE 会指向无关目录（最坏是 /），就会去复制那整棵目录树
[ -f "$HERE/src/config.ts" ] && [ -d "$HERE/src/common" ] || { echo "找不到模板（$HERE 不像 template/），请从 template/scripts/ 里运行本脚本"; exit 1; }
if [ $# -ge 2 ]; then DEST=$1; SLUG=$2; elif [ -n "$1" ]; then
  SLUG=$1
  [ -d "$DATA_ROOT" ] || { echo "数据根 $DATA_ROOT 不存在，请先创建它、设 A2V_DATA_ROOT 指到别的目录，或显式传 <目标目录> <slug> 两参"; exit 1; }
  DEST="$DATA_ROOT/$SLUG"
else
  echo "usage: new_project.sh <slug>  或  new_project.sh <dest_dir> <slug>"; exit 1
fi
# slug 会进文件名、sed 表达式与渲染命令行，只允许安全字符
case "$SLUG" in
  ''|*[!A-Za-z0-9_-]*) echo "slug 只能用字母/数字/-/_，收到：$SLUG"; exit 1;;
esac
mkdir -p "$DEST"
# 原实现用 rsync --exclude；Git Bash 没有 rsync，改为整目录拷贝后清掉产物目录
# （模板本身不含 node_modules / build* / renders 等，这里的 rm 是给"拷进已有项目目录"兜底）
cp -R "$HERE/." "$DEST/"
rm -rf "$DEST/node_modules" "$DEST/audio/cache" "$DEST/renders" "$DEST/fin_frames" "$DEST/stills"
for d in "$DEST"/build*; do [ -e "$d" ] && rm -rf "$d"; done
# sed -i 的 GNU/BSD 语法不一致（BSD 要 -i ''，GNU 会把 '' 当成后缀文件名而报错），用 -i.bak 两侧通用
sed -i.bak "s/slug: 'demo'/slug: '$SLUG'/" "$DEST/src/config.ts" && rm -f "$DEST/src/config.ts.bak"
mkdir -p "$DEST/public/assets/$SLUG" "$DEST/script" "$DEST/research" "$DEST/qc" "$DEST/stills" "$DEST/renders"
cd "$DEST" && npm install --silent && npx tsc --noEmit && echo "project ready: $DEST (slug=$SLUG)"
