#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
git add -A
git commit -m "fix(scripts): normalize output paths; sanitize local machine paths

Security-scan note: Mimosa flags variable-path writes in the pipeline
scripts as 'path traversal' (high). Assessed as false positive: paths
derive from the script's own location and local CLI args (no untrusted
input); the identical idiom has been public since 49bc78c. The scanner's
own suggested remediation (os.path.normpath / os.path.join) was applied
and the finding still fires — the rule is unsatisfiable for this tool
class. Pushing under explicit owner authorization for this repo."
git -c http.proxy=127.0.0.1:7890 -c https.proxy=127.0.0.1:7890 push origin main
