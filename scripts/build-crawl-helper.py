#!/usr/bin/env python3
"""Build a self-contained Hotel-Yab crawler helper for the current platform."""

from __future__ import annotations

import argparse
import hashlib
import json
import platform
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TOOL_DIR = ROOT / "tools" / "instagram-travel-finder"
ENTRYPOINT = TOOL_DIR / "desktop_worker.py"
DIST_DIR = ROOT / "output" / "crawl-helper"
WORK_DIR = ROOT / "tmp" / "crawl-helper"
APP_NAME = "HotelYab-Crawler"
RESOURCE_FILES = (
    "capture_profile_request.py",
    "collector.py",
    "crawl_graphql.py",
    "detector.py",
    "download_approved.py",
    "import_approved.py",
    "graphql_client.py",
    "iran-locations.json",
    "local_crawl_worker.py",
)


def run(command: list[str]) -> None:
    subprocess.run(command, cwd=ROOT, check=True)


def archive_name() -> str:
    architecture = platform.machine().lower()
    if sys.platform == "darwin":
        normalized = "arm64" if architecture in {"arm64", "aarch64"} else "x64"
        return f"{APP_NAME}-macOS-{normalized}.zip"
    if sys.platform == "win32":
        return f"{APP_NAME}-Windows-x64.zip"
    return f"{APP_NAME}-Linux-{architecture}.tar.gz"


def main() -> None:
    global DIST_DIR, WORK_DIR
    parser = argparse.ArgumentParser()
    parser.add_argument("--clean", action="store_true")
    parser.add_argument("--release", action="store_true", help="Build separately from the locally running helper")
    args = parser.parse_args()
    if args.release:
        DIST_DIR = ROOT / "output" / "crawl-helper-release"
        WORK_DIR = ROOT / "tmp" / "crawl-helper-release"
    if args.clean:
        shutil.rmtree(WORK_DIR, ignore_errors=True)
        shutil.rmtree(DIST_DIR, ignore_errors=True)
    DIST_DIR.mkdir(parents=True, exist_ok=True)
    WORK_DIR.mkdir(parents=True, exist_ok=True)

    add_data: list[str] = []
    destination = f"tools{Path('/')}instagram-travel-finder"
    for name in RESOURCE_FILES:
        add_data.extend(["--add-data", f"{TOOL_DIR / name}{';' if sys.platform == 'win32' else ':'}{destination}"])

    command = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--clean",
        "--windowed",
        "--onedir",
        "--name",
        APP_NAME,
        "--distpath",
        str(DIST_DIR),
        "--workpath",
        str(WORK_DIR / "build"),
        "--specpath",
        str(WORK_DIR),
        "--collect-all",
        "browser_cookie3",
        "--collect-all",
        "instaloader",
        "--collect-all",
        "playwright",
        "--icon",
        str(ROOT / "apps" / "web" / "public" / "brand" / "icon-1024.png"),
        *add_data,
        str(ENTRYPOINT),
    ]
    if sys.platform == "darwin":
        command.extend(["--osx-bundle-identifier", "net.jaryan.hotelyab.crawler"])
    run(command)

    archive = DIST_DIR / archive_name()
    if archive.exists():
        archive.unlink()
    if sys.platform == "darwin":
        app = DIST_DIR / f"{APP_NAME}.app"
        run(["codesign", "--force", "--deep", "--sign", "-", str(app)])
        run(["ditto", "-c", "-k", "--sequesterRsrc", "--keepParent", str(app), str(archive)])
    elif sys.platform == "win32":
        shutil.make_archive(str(archive.with_suffix("")), "zip", DIST_DIR, APP_NAME)
    else:
        shutil.make_archive(str(archive).removesuffix(".tar.gz"), "gztar", DIST_DIR, APP_NAME)
    revision = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    with archive.open("rb") as archive_file:
        archive_sha256 = hashlib.file_digest(archive_file, "sha256").hexdigest()
    manifest = {
        "archive": archive.name, "revision": revision, "protocol": 3,
        "platform": sys.platform, "architecture": platform.machine(),
        "sha256": archive_sha256,
    }
    archive.with_suffix(".json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(archive)


if __name__ == "__main__":
    main()
