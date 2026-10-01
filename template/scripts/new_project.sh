#!/usr/bin/env bash
# 从模板创建新项目：new_project.sh <slug>  或  new_project.sh <目标目录> <slug>
# 单参数 = 本 skill 的数据去向约定：项目默认落数据根 <DATA_ROOT>/<slug>；
# 数据根取环境变量 A2V_DATA_ROOT，未设置时缺省为当前目录（./）；
# 运行期产物（成片/帧/QC/调研）随项目根走，skill 目录零污染（见 SKILL.md §数据去向）。
# ⚠ 续作/修复类 workflow 一律不跑本脚本：目标目录已有工程时会拒启（--force 才放行），
#   防止整目录覆盖毁掉已建镜头（lessons 09-25）。
set -e
HERE=$(cd "$(dirname "$0")/.." && pwd)
DATA_ROOT="${A2V_DATA_ROOT:-.}"
FORCE=0
POS=()
for a in "$@"; do
  if [ "$a" = "--force" ]; then FORCE=1; else POS+=("$a"); fi
done
# 本脚本必须留在 template/scripts/ 里：$HERE 是下面拷贝的源，脚本被单独拷到别处时
# $HERE 会指向无关目录（最坏是 /），就会去复制那整棵目录树
[ -f "$HERE/src/config.ts" ] && [ -d "$HERE/src/common" ] || { echo "找不到模板（$HERE 不像 template/），请从 template/scripts/ 里运行本脚本"; exit 1; }
if [ ${#POS[@]} -ge 2 ]; then DEST=${POS[0]}; SLUG=${POS[1]}; elif [ -n "${POS[0]:-}" ]; then
  SLUG=${POS[0]}
  [ -d "$DATA_ROOT" ] || { echo "数据根 $DATA_ROOT 不存在（检查 A2V_DATA_ROOT？），请显式传 <目标目录> <slug> 两参"; exit 1; }
  DEST="$DATA_ROOT/$SLUG"
else
  echo "usage: new_project.sh <slug>  或  new_project.sh <dest_dir> <slug> [--force]"; exit 1
fi
# slug 会进文件名、sed 表达式与渲染命令行，只允许安全字符
case "$SLUG" in
  ''|*[!A-Za-z0-9_-]*) echo "slug 只能用字母/数字/-/_，收到：$SLUG"; exit 1;;
esac
if [ -e "$DEST/src/config.ts" ] && [ "$FORCE" -ne 1 ]; then
  echo "目标已是工程：$DEST"; echo "续作/修复请直接以磁盘工程为起点，不要跑本脚本；确要重开请加 --force（会整目录覆盖）"; exit 1
fi
mkdir -p "$DEST"
# 原实现用 rsync --exclude；Git Bash 没有 rsync，改为整目录拷贝后清掉产物目录。
# node_modules 不清：模板带现成依赖（含 .remotion/chrome-headless-shell ~270MB，删了弱网首渲必挂死，lessons 09-27），
# 拷完直接 npm install 幂等补齐即可。
cp -R "$HERE/." "$DEST/"
rm -rf "$DEST/audio/cache" "$DEST/renders" "$DEST/fin_frames" "$DEST/stills"
for d in "$DEST"/build*; do [ -e "$d" ] && rm -rf "$d"; done
# sed -i 的 GNU/BSD 语法不一致（BSD 要 -i ''，GNU 会把 '' 当成后缀文件名而报错），用 -i.bak 两侧通用
sed -i.bak "s/slug: 'demo'/slug: '$SLUG'/" "$DEST/src/config.ts" && rm -f "$DEST/src/config.ts.bak"
grep -q "slug: '$SLUG'" "$DEST/src/config.ts" || { echo "slug 没写进去（config.ts 格式漂移？grep slug 看一眼）"; exit 1; }
mkdir -p "$DEST/public/assets/$SLUG" "$DEST/script" "$DEST/research" "$DEST/qc" "$DEST/stills" "$DEST/renders"
# 就地建 git 档：修复轮必须能 diff 复核（lessons 09-30 验证片无版本控制，越权就地修后无从回看改了什么）。
# git 缺失 / 旧版不支持 -b / 未配置 user.name/user.email 时全部静默跳过，绝不阻塞建项目。
# 用 git -C 而非 cd：git init 万一失败时，裸 add 会对调用方 cwd 所在仓库误提交整棵树。
if git -C "$DEST" init -b main >/dev/null 2>&1; then
  git -C "$DEST" add -A >/dev/null 2>&1 || true
  git -C "$DEST" commit -m "project scaffold: $SLUG" >/dev/null 2>&1 || true
fi
cd "$DEST" && npm install --silent && npx tsc --noEmit && echo "project ready: $DEST (slug=$SLUG)"
