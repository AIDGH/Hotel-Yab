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

install_crawl_helper_artifact_key() {
  local ssh_dir="$HOME/.ssh"
  local authorized_keys="$ssh_dir/authorized_keys"
  local public_key_file="$repository_root/scripts/crawl-helper-actions.pub"
  local public_key
  local forced_entry
  local temporary

  if [[ ! -f "$public_key_file" || -L "$public_key_file" ]]; then
    echo "Deployment stopped: crawler artifact public key is missing or unsafe." >&2
    exit 1
  fi
  public_key="$(<"$public_key_file")"
  if [[ "$public_key" != ssh-ed25519\ *github-actions-hotel-yab-crawl-helper ]]; then
    echo "Deployment stopped: crawler artifact public key is invalid." >&2
    exit 1
  fi
  if [[ -L "$ssh_dir" || ( -e "$authorized_keys" && -L "$authorized_keys" ) ]]; then
    echo "Deployment stopped: SSH authorization path must not be a symbolic link." >&2
    exit 1
  fi

  umask 077
  mkdir -p "$ssh_dir"
  chmod 700 "$ssh_dir"
  temporary="$(mktemp "$ssh_dir/authorized_keys.hotelyab.XXXXXX")"
  if [[ -f "$authorized_keys" ]]; then
    awk '!/github-actions-hotel-yab-crawl-helper/' "$authorized_keys" > "$temporary"
  fi
  forced_entry="restrict,command=\"$repository_root/scripts/receive-crawl-helper-artifacts.sh\" $public_key"
  printf '%s\n' "$forced_entry" >> "$temporary"
  chmod 600 "$temporary"
  mv "$temporary" "$authorized_keys"
}

install_crawl_helper_artifact_key

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
