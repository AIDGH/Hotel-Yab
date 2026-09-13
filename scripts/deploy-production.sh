#!/usr/bin/env bash
set -Eeuo pipefail

repository_root="$(git rev-parse --show-toplevel)"
cd "$repository_root"

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
