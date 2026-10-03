#!/usr/bin/env bash
set -euo pipefail
PKG=$(cd "$(dirname "$0")/../.." && pwd)
if [ "$#" -eq 1 ]; then
  exec node "$PKG/scripts/init.mjs" "${A2V_DATA_ROOT:-$PWD}/$1" "$1"
elif [ "$#" -eq 2 ]; then
  exec node "$PKG/scripts/init.mjs" "$1" "$2"
else
  echo 'Usage: new_project.sh <slug> or <target> <slug>; no --force' >&2
  exit 2
fi
