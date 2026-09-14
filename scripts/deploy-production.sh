#!/usr/bin/env bash
set -Eeuo pipefail

repository_root="$(git rev-parse --show-toplevel)"
if [[ -z "$repository_root" || ! -d "$repository_root/.git" || "$(basename "$repository_root")" != "Hotel-Yab" ]]; then
  echo "Deployment stopped: the repository root is not the expected Hotel-Yab checkout." >&2
  exit 1
fi
cd "$repository_root"

node_bin="${HOTELYAB_NODE_BIN:-}"
if [[ -z "$node_bin" ]]; then
  node_bin="$(find "$HOME/.nvm/versions/node" -mindepth 1 -maxdepth 1 -type d -name 'v*' -print 2>/dev/null | sort -V | tail -n 1)/bin"
fi
if [[ -z "$node_bin" || ! -x "$node_bin/node" || ! -x "$node_bin/pnpm" ]]; then
  echo "Deployment stopped: Node.js and pnpm could not be resolved." >&2
  exit 1
fi
export PATH="$node_bin:$PATH"

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "Deployment stopped: tracked production files have local changes." >&2
  exit 1
fi

git fetch origin main
git checkout main
git merge --ff-only origin/main

pnpm install --frozen-lockfile
pnpm api:prisma:generate
pnpm api:prisma:migrate:deploy
pnpm api:build
pnpm web:build

sudo -n systemctl restart hotel-yab-api hotel-yab-web
sudo -n systemctl is-active --quiet hotel-yab-api
sudo -n systemctl is-active --quiet hotel-yab-web

curl --fail --silent --show-error http://127.0.0.1:4000/api/v1/health >/dev/null
curl --fail --silent --show-error http://127.0.0.1:3000/ >/dev/null

echo "Hotel-Yab production deployment completed successfully."
