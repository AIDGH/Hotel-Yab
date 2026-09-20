#!/usr/bin/env bash
set -euo pipefail

target="/home/jaryan/Hotel-Yab/apps/web/public/downloads/"
mkdir -p "$target"

case "${SSH_ORIGINAL_COMMAND:-}" in
  "scp -t $target"|"scp -t ${target%/}"|"scp -t -- $target"|"scp -t -- ${target%/}")
    exec /usr/bin/scp -t "$target"
    ;;
  *)
    echo "This key can only publish Hotel-Yab crawler downloads." >&2
    exit 126
    ;;
esac
