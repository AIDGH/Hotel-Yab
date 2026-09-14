#!/usr/bin/env bash
set -Eeuo pipefail

repository_root="$(git rev-parse --show-toplevel)"
if [[ -z "$repository_root" || ! -d "$repository_root/.git" || "$(basename "$repository_root")" != "Hotel-Yab" ]]; then
  echo "Automatic deployment stopped: unexpected repository root." >&2
  exit 1
fi
cd "$repository_root"

exec 9>"$repository_root/.git/hotel-yab-deploy.lock"
if ! flock -n 9; then
  echo "Another Hotel-Yab deployment is already running."
  exit 0
fi

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "Automatic deployment stopped: tracked production files have local changes." >&2
  exit 1
fi

git fetch origin main
local_revision="$(git rev-parse HEAD)"
remote_revision="$(git rev-parse origin/main)"
if [[ -z "$local_revision" || -z "$remote_revision" ]]; then
  echo "Automatic deployment stopped: Git revisions could not be resolved." >&2
  exit 1
fi
if [[ "$local_revision" == "$remote_revision" ]]; then
  echo "Production is already up to date."
  exit 0
fi

bash "$repository_root/scripts/deploy-production.sh"
