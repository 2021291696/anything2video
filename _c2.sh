#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
git add -A
git commit -m "chore: remove local helper script"
git -c http.proxy=127.0.0.1:7890 -c https.proxy=127.0.0.1:7890 push origin main
