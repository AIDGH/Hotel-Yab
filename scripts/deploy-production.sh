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

remove_retired_crawl_helper_artifact_key() {
  local authorized_keys="$HOME/.ssh/authorized_keys"
  local temporary

  if [[ ! -e "$authorized_keys" ]]; then
    return
  fi
  if [[ ! -f "$authorized_keys" || -L "$authorized_keys" ]]; then
    echo "Deployment stopped: SSH authorization file is unsafe." >&2
    exit 1
  fi
  if ! grep -q 'github-actions-hotel-yab-crawl-helper' "$authorized_keys"; then
    return
  fi

  umask 077
  temporary="$(mktemp "$HOME/.ssh/authorized_keys.hotelyab.XXXXXX")"
  awk '!/github-actions-hotel-yab-crawl-helper/' "$authorized_keys" > "$temporary"
  chmod 600 "$temporary"
  mv "$temporary" "$authorized_keys"
}

migrate_crawl_helper_archives() {
  local public_directory="$repository_root/apps/web/public/downloads"
  local private_directory="$repository_root/output/crawl-helper-downloads"
  local filename
  local source
  local target

  if [[ -L "$public_directory" || -L "$private_directory" ]]; then
    echo "Deployment stopped: crawler helper directories must not be symbolic links." >&2
    exit 1
  fi
  mkdir -p "$private_directory"
  chmod 700 "$private_directory"
  for filename in \
    HotelYab-Crawler-macOS-arm64.zip \
    HotelYab-Crawler-macOS-x64.zip \
    HotelYab-Crawler-Windows-x64.zip; do
    source="$public_directory/$filename"
    target="$private_directory/$filename"
    if [[ ! -e "$source" ]]; then
      continue
    fi
    if [[ ! -f "$source" || -L "$source" || -e "$target" ]]; then
      echo "Deployment stopped: crawler helper archive migration is unsafe for $filename." >&2
      exit 1
    fi
    mv "$source" "$target"
    chmod 600 "$target"
  done
}

remove_retired_crawl_helper_artifact_key
migrate_crawl_helper_archives

pnpm install --frozen-lockfile
pnpm api:prisma:generate
pnpm api:prisma:migrate:deploy
pnpm api:build
pnpm web:build

sudo -n systemctl restart hotel-yab-api hotel-yab-web
sudo -n systemctl is-active --quiet hotel-yab-api
sudo -n systemctl is-active --quiet hotel-yab-web

wait_for_url() {
  local url="$1"
  local attempt
  for attempt in {1..30}; do
    if curl --fail --silent --show-error "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "Deployment failed: health check did not pass for $url." >&2
  return 1
}

wait_for_url http://127.0.0.1:4000/api/v1/health
wait_for_url http://127.0.0.1:3000/

echo "Hotel-Yab production deployment completed successfully."
