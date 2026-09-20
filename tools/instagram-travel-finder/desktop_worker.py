#!/usr/bin/env python3
"""Standalone desktop launcher for the loopback Hotel-Yab crawl worker."""

from __future__ import annotations

import os
import runpy
import sys
import threading
import tkinter as tk
import webbrowser
from pathlib import Path
from tkinter import ttk


SCRIPT_DIR = (
    Path(sys._MEIPASS) / "tools" / "instagram-travel-finder"
    if getattr(sys, "frozen", False)
    else Path(__file__).resolve().parent
)
APP_NAME = "HotelYabCrawler"
PANEL_URL = "https://hotelyab.jaryan.net/admin/crawl-reviews"


def private_data_root() -> Path:
    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / APP_NAME
    if sys.platform == "win32":
        return Path(os.environ["LOCALAPPDATA"]) / APP_NAME
    return Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share")) / APP_NAME


def configure_runtime() -> Path:
    runtime_root = private_data_root()
    runtime_root.mkdir(parents=True, exist_ok=True)
    os.environ["HOTELYAB_REPO_ROOT"] = str(runtime_root)
    os.environ["HOTELYAB_WORKER_OUTPUT_DIR"] = str(runtime_root / "output")
    os.environ["HOTELYAB_PUBLIC_DIR"] = str(runtime_root / "public")
    if str(SCRIPT_DIR) not in sys.path:
        sys.path.insert(0, str(SCRIPT_DIR))
    return runtime_root


def run_child(script: str, arguments: list[str]) -> None:
    if script not in {"download_approved.py", "import_approved.py"}:
        raise ValueError("Unknown worker child")
    configure_runtime()
    sys.argv = [str(SCRIPT_DIR / script), *arguments]
    runpy.run_path(sys.argv[0], run_name="__main__")


def self_check() -> None:
    root = configure_runtime()
    for name in (
        "local_crawl_worker.py",
        "crawl_graphql.py",
        "graphql_client.py",
        "download_approved.py",
        "import_approved.py",
        "iran-locations.json",
    ):
        if not (SCRIPT_DIR / name).is_file():
            raise RuntimeError(f"Missing bundled resource: {name}")
    from detector import load_locations

    if not load_locations():
        raise RuntimeError("Location catalog is empty")
    print(f"Hotel-Yab desktop helper is ready; private data: {root}")


def launch_gui() -> None:
    configure_runtime()
    from local_crawl_worker import create_server

    window = tk.Tk()
    window.title("هتل‌یاب · دستیار محتوا")
    window.geometry("470x250")
    window.minsize(440, 230)
    window.configure(bg="#f4f2ff")

    style = ttk.Style(window)
    style.configure("HotelYab.TFrame", background="#f4f2ff")
    style.configure("HotelYab.TLabel", background="#f4f2ff", foreground="#24213d")
    frame = ttk.Frame(window, style="HotelYab.TFrame", padding=24)
    frame.pack(fill="both", expand=True)
    ttk.Label(frame, text="دستیار کرال هتل‌یاب", font=("Arial", 19, "bold"), style="HotelYab.TLabel").pack(anchor="e")
    status = tk.StringVar(value="در حال اتصال…")
    ttk.Label(frame, textvariable=status, font=("Arial", 12), style="HotelYab.TLabel").pack(anchor="e", pady=(14, 6))
    ttk.Label(frame, text="اینستاگرام باید در مرورگر انتخاب‌شده در پنل باز و وارد شده باشد.", style="HotelYab.TLabel").pack(anchor="e")
    ttk.Label(frame, text="نشست اینستاگرام روی همین دستگاه می‌ماند.", style="HotelYab.TLabel").pack(anchor="e", pady=(3, 12))
    ttk.Button(frame, text="باز کردن پنل بررسی محتوا", command=lambda: webbrowser.open(PANEL_URL)).pack(anchor="e")

    server = None
    try:
        server = create_server("production")
    except OSError as exc:
        if exc.errno in {48, 98, 10048}:
            status.set("دستیار از قبل روی این دستگاه اجراست؛ پنل را باز کنید.")
        else:
            status.set(f"اتصال برقرار نشد: {exc}")
    if server:
        status.set("اتصال برقرار است؛ از پنل شروع کرال را بزنید.")
        threading.Thread(target=server.serve_forever, daemon=True).start()

    def close() -> None:
        if server:
            server.shutdown()
            server.server_close()
        window.destroy()

    window.protocol("WM_DELETE_WINDOW", close)
    window.mainloop()


def main() -> None:
    if len(sys.argv) > 1 and sys.argv[1] == "--worker-child":
        if len(sys.argv) < 3:
            raise ValueError("Worker child script is missing")
        run_child(sys.argv[2], sys.argv[3:])
    elif len(sys.argv) > 1 and sys.argv[1] == "--self-check":
        self_check()
    else:
        launch_gui()


if __name__ == "__main__":
    main()
