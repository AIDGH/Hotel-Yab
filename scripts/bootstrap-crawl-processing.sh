#!/usr/bin/env bash
set -Eeuo pipefail

repository_root="$(git rev-parse --show-toplevel)"
cd "$repository_root"

python3 -m venv .venv-instagram
.venv-instagram/bin/python -m pip install --upgrade pip
.venv-instagram/bin/python -m pip install \
  -r tools/instagram-travel-finder/requirements.txt

echo "Crawler runtime is ready at $repository_root/.venv-instagram/bin/python"
echo "Copy the Instaloader session to the service user's ~/.config/instaloader directory before enabling server processing."
