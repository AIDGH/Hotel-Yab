#!/usr/bin/env python3
"""Loopback-only bridge between Hotel-Yab and a local Instagram session."""

from __future__ import annotations

import argparse
import hashlib
import http.client
import json
import math
import os
import subprocess
import sys
import threading
import time
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, unquote, urlencode, urlparse
from urllib.request import Request, urlopen

import instaloader

import crawl_graphql
from collector import create_loader, extract_username
from detector import detect_locations
from graphql_client import clear_request, configure_request
from import_approved import media_plan_path, public_url_to_path


BASE_DIR = (
    Path(sys._MEIPASS) / "tools" / "instagram-travel-finder"
    if getattr(sys, "frozen", False)
    else Path(__file__).resolve().parent
)
REPO_ROOT = Path(os.environ.get("HOTELYAB_REPO_ROOT", BASE_DIR.parents[1]))
OUTPUT_DIR = Path(os.environ.get("HOTELYAB_WORKER_OUTPUT_DIR", BASE_DIR / "output"))
WORKER_DIR = OUTPUT_DIR / "local-worker"
WORKER_ORIGINS = {
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://hotelyab.jaryan.net",
}
API_BASES = {
    "local": "http://127.0.0.1:4000/api/v1",
    "production": "https://hotelyab.jaryan.net/api/v1",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class WorkerJob:
    def __init__(self, kind: str, username: str = ""):
        self.id = str(uuid.uuid4())
        self.kind = kind
        self.username = username
        self.status = "QUEUED"
        self.message = "در صف اجرا"
        self.current = 0
        self.total: int | None = None
        self.new_items = 0
        self.result_path: Path | None = None
        self.logs: list[str] = []
        self.created_at = utc_now()
        self.updated_at = self.created_at
        self.stop_event = threading.Event()
        self.process: subprocess.Popen[str] | None = None
        self.batch_id = ""
        self.ticket = ""

    def update(self, **values):
        for key, value in values.items():
            setattr(self, key, value)
        self.updated_at = utc_now()

    def log(self, value: str):
        value = value.rstrip()
        if value:
            self.logs.append(value)
            self.logs = self.logs[-300:]
        self.updated_at = utc_now()

    def payload(self) -> dict:
        return {
            "id": self.id,
            "kind": self.kind,
            "username": self.username,
            "status": self.status,
            "message": self.message,
            "current": self.current,
            "total": self.total,
            "newItems": self.new_items,
            "hasResult": bool(self.result_path and self.result_path.exists()),
            "logs": self.logs[-80:],
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
            "batchId": self.batch_id or None,
        }


JOBS: dict[str, WorkerJob] = {}
JOBS_LOCK = threading.Lock()
API_BASE = API_BASES["local"]
ENVIRONMENT = "local"
DEFAULT_BROWSER = "chrome"


def register_job(job: WorkerJob) -> WorkerJob:
    with JOBS_LOCK:
        JOBS[job.id] = job
        finished = [
            item
            for item in JOBS.values()
            if item.status in {"SUCCEEDED", "FAILED", "PAUSED"}
        ]
        for old in sorted(finished, key=lambda item: item.updated_at)[:-25]:
            JOBS.pop(old.id, None)
    return job


def has_active_job() -> bool:
    with JOBS_LOCK:
        return any(job.status in {"QUEUED", "RUNNING"} for job in JOBS.values())


def read_json(path: Path, fallback):
    if not path.exists():
        return fallback
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return fallback


def write_json(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".part")
    temporary.write_text(
        json.dumps(value, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    temporary.replace(path)


def output_path(username: str) -> Path:
    return OUTPUT_DIR / f"{username}.json"


def state_path(username: str) -> Path:
    return WORKER_DIR / f"{username}.state.json"


def media_items_for_post(post) -> list[dict]:
    if str(getattr(post, "typename", "") or "") == "GraphSidecar":
        items = []
        for index, node in enumerate(post.get_sidecar_nodes(), start=1):
            is_video = bool(getattr(node, "is_video", False))
            display_url = str(getattr(node, "display_url", "") or "")
            items.append(
                {
                    "display_order": index,
                    "media_type": "VIDEO" if is_video else "IMAGE",
                    "download_url": (
                        str(getattr(node, "video_url", "") or "")
                        if is_video
                        else display_url
                    ),
                    "thumbnail_source_url": display_url,
                }
            )
        return items

    is_video = bool(getattr(post, "is_video", False))
    display_url = str(getattr(post, "url", "") or "")
    return [
        {
            "display_order": 1,
            "media_type": "VIDEO" if is_video else "IMAGE",
            "download_url": (
                str(getattr(post, "video_url", "") or "")
                if is_video
                else display_url
            ),
            "thumbnail_source_url": display_url,
        }
    ]


def candidate_for_post(username: str, post) -> dict | None:
    caption = str(getattr(post, "caption", "") or "")
    location = getattr(post, "location", None)
    location_name = str(getattr(location, "name", "") or "")
    detection = detect_locations(caption, location_name)
    if not detection["isIranTravel"]:
        return None

    shortcode = str(getattr(post, "shortcode", "") or "")
    published = getattr(post, "date_utc", None)
    media_items = media_items_for_post(post)
    if len(media_items) == 1 and media_items[0]["media_type"] == "IMAGE":
        return None
    first = media_items[0] if media_items else {}
    has_video = any(item["media_type"] == "VIDEO" for item in media_items)
    product_type = str(getattr(post, "product_type", "") or "")
    if str(getattr(post, "typename", "") or "") == "GraphSidecar":
        content_type = "CAROUSEL"
    elif product_type == "clips":
        content_type = "REEL"
    else:
        content_type = "VIDEO_POST" if has_video else "POST"
    cities = detection["cities"]
    provinces = detection["provinces"]
    source_kind = "reel" if product_type == "clips" else "p"
    return {
        "instagram_username": username,
        "source_url": f"https://www.instagram.com/{source_kind}/{shortcode}/",
        "shortcode": shortcode,
        "published_at": published.isoformat() if published else "",
        "caption": caption,
        "instagram_location": location_name,
        "product_type": product_type,
        "media_type": "VIDEO" if has_video else "IMAGE",
        "content_type": content_type,
        "signal_strength": detection["signalStrength"],
        "signal_score": detection["signalScore"],
        "candidate_signals": detection["candidateSignals"],
        "matched_cities": [item["name"] for item in cities],
        "matched_city_slugs": [item["slug"] for item in cities],
        "matched_provinces": [item["name"] for item in provinces],
        "matched_province_slugs": [item["slug"] for item in provinces],
        "video_download_url": next(
            (
                item["download_url"]
                for item in media_items
                if item["media_type"] == "VIDEO"
            ),
            "",
        ),
        "thumbnail_source_url": str(first.get("thumbnail_source_url", "")),
        "media_items": media_items,
        "review_status": "pending",
        "notes": "",
    }


def crawl_with_browser(job: WorkerJob, browser: str, max_posts: int | None):
    username = extract_username(job.username)
    job.update(status="RUNNING", message="در حال اتصال امن به Chrome")
    loader = create_loader(
        None,
        browser=browser,
        interactive_login=False,
    )
    profile = instaloader.Profile.from_username(loader.context, username)
    existing_rows = read_json(output_path(username), [])
    if not isinstance(existing_rows, list):
        existing_rows = []
    by_shortcode = {
        str(item.get("shortcode", "")): item
        for item in existing_rows
        if isinstance(item, dict) and item.get("shortcode")
    }
    known_candidates = set(by_shortcode)
    state = read_json(state_path(username), {})
    previously_complete = bool(state.get("complete"))
    seen = set(state.get("seenShortcodes", []))
    consecutive_seen = 0
    scanned = 0
    reached_scan_limit = False

    try:
        for post in profile.get_posts():
            if job.stop_event.is_set():
                write_json(
                    state_path(username),
                    {"complete": False, "seenShortcodes": sorted(seen)},
                )
                job.update(status="PAUSED", message="کرال متوقف شد؛ قابل ادامه است")
                return
            shortcode = str(getattr(post, "shortcode", "") or "")
            scanned += 1
            job.update(current=scanned, message=f"بررسی محتوای {scanned}")
            if shortcode in seen:
                consecutive_seen += 1
            else:
                consecutive_seen = 0
                seen.add(shortcode)
            candidate = candidate_for_post(username, post)
            if candidate:
                previous = by_shortcode.get(shortcode, {})
                candidate["review_status"] = previous.get(
                    "review_status", candidate["review_status"]
                )
                candidate["notes"] = previous.get("notes", candidate["notes"])
                by_shortcode[shortcode] = {**previous, **candidate}
                job.new_items = len(set(by_shortcode) - known_candidates)
            if scanned % 10 == 0:
                save_crawl_progress(username, by_shortcode, seen, complete=False)
            if max_posts and scanned >= max_posts:
                reached_scan_limit = True
                break
            if previously_complete and consecutive_seen >= 30:
                job.log("۳۰ محتوای قبلاً دیده‌شده پیدا شد؛ کرال تازه کامل است.")
                break
            time.sleep(0.35)
        save_crawl_progress(
            username,
            by_shortcode,
            seen,
            complete=not reached_scan_limit,
        )
        job.result_path = output_path(username)
        job.update(
            status="SUCCEEDED",
            message=f"کرال تمام شد؛ {job.new_items} محتوای تازه پیدا شد",
        )
    except Exception:
        save_crawl_progress(username, by_shortcode, seen, complete=False)
        raise


def crawl_with_saved_request(
    job: WorkerJob,
    browser: str,
    max_posts: int | None,
    crawl_request: dict,
):
    username = extract_username(job.username)
    if (
        crawl_request.get("version") != 1
        or not isinstance(crawl_request.get("url"), str)
        or not isinstance(crawl_request.get("headers"), dict)
        or not isinstance(crawl_request.get("body"), str)
    ):
        raise RuntimeError(
            "درخواست کرال این چهره معتبر نیست؛ از مدیر بخواهید cURL تازه ثبت کند."
        )

    job.update(status="RUNNING", message="در حال کرال با درخواست ذخیره‌شده")
    cookies = read_browser_cookies(browser)
    headers = {
        str(name): str(value)
        for name, value in crawl_request["headers"].items()
    }
    headers["Cookie"] = "; ".join(
        f"{name}={value}" for name, value in cookies.items()
    )
    csrf_token = cookies.get("csrftoken")
    if csrf_token:
        headers["X-CSRFToken"] = csrf_token

    form = dict(parse_qsl(crawl_request["body"], keep_blank_values=True))
    viewer_id = cookies.get("ds_user_id")
    if viewer_id:
        form["av"] = viewer_id
        form["__user"] = viewer_id
    body = urlencode(form)

    existing_rows = read_json(output_path(username), [])
    existing_shortcodes = {
        str(item.get("shortcode", ""))
        for item in existing_rows
        if isinstance(item, dict) and item.get("shortcode")
    }
    crawl_graphql.OUTPUT_DIR = OUTPUT_DIR
    max_pages = math.ceil(max_posts / 12) if max_posts else 10000
    configure_request(crawl_request["url"], headers, body)
    try:
        crawl_graphql.crawl_profile(
            username,
            max_pages=max_pages,
            should_stop=job.stop_event.is_set,
            on_progress=lambda page, processed: job.update(
                current=processed,
                message=f"بررسی صفحه {page}؛ {processed} محتوا",
            ),
        )
    except RuntimeError as exc:
        detail = str(exc)
        if "HTTP 429" in detail:
            raise RuntimeError(
                "Instagram موقتاً درخواست‌ها را محدود کرده است؛ چند ساعت بعد دوباره تلاش کنید."
            ) from exc
        if detail.startswith("Instagram HTTP "):
            status = detail.split(":", 1)[0].removeprefix("Instagram HTTP ")
            raise RuntimeError(
                f"Instagram درخواست کرال را با خطای HTTP {status} رد کرد؛ "
                "cURL تازه از همان صفحه بگیرید و دوباره امتحان کنید."
            ) from exc
        if detail.startswith("Instagram GraphQL error"):
            raise RuntimeError(
                "پاسخ GraphQL اینستاگرام خطا داشت؛ cURL تازه از همان صفحه بگیرید."
            ) from exc
        if detail.startswith("Instagram returned"):
            raise RuntimeError(
                "پاسخ اینستاگرام برای کرال معتبر نبود؛ وضعیت ورود و cURL را بررسی کنید."
            ) from exc
        raise
    finally:
        clear_request()

    rows = read_json(output_path(username), [])
    current_shortcodes = {
        str(item.get("shortcode", ""))
        for item in rows
        if isinstance(item, dict) and item.get("shortcode")
    }
    job.new_items = len(current_shortcodes - existing_shortcodes)
    job.result_path = output_path(username)
    job.update(
        status="SUCCEEDED",
        message=f"کرال تمام شد؛ {job.new_items} محتوای تازه پیدا شد",
    )


def read_browser_cookies(browser: str) -> dict[str, str]:
    try:
        import browser_cookie3
    except ImportError as exc:
        raise RuntimeError("امکان خواندن نشست مرورگر در برنامه وجود ندارد.") from exc

    readers = {
        "brave": browser_cookie3.brave,
        "chrome": browser_cookie3.chrome,
        "chromium": browser_cookie3.chromium,
        "edge": browser_cookie3.edge,
        "firefox": browser_cookie3.firefox,
        "librewolf": browser_cookie3.librewolf,
        "opera": browser_cookie3.opera,
        "opera_gx": browser_cookie3.opera_gx,
        "safari": browser_cookie3.safari,
        "vivaldi": browser_cookie3.vivaldi,
    }
    reader = readers.get(browser.lower())
    if not reader:
        raise RuntimeError("مرورگر انتخاب‌شده پشتیبانی نمی‌شود.")
    try:
        jar = reader()
    except Exception as exc:
        raise RuntimeError(
            "خواندن نشست مرورگر انجام نشد؛ وارد Instagram شوید و دسترسی سیستم را تأیید کنید."
        ) from exc
    cookies = {
        cookie.name: cookie.value
        for cookie in jar
        if "instagram.com" in cookie.domain
    }
    if not cookies.get("sessionid"):
        raise RuntimeError(
            "نشست Instagram در مرورگر پیدا نشد؛ ابتدا در همان مرورگر وارد شوید."
        )
    return cookies


def save_crawl_progress(
    username: str,
    by_shortcode: dict[str, dict],
    seen: set[str],
    *,
    complete: bool,
):
    rows = sorted(
        by_shortcode.values(),
        key=lambda item: str(item.get("published_at", "")),
        reverse=True,
    )
    write_json(output_path(username), rows)
    write_json(
        state_path(username),
        {"complete": complete, "seenShortcodes": sorted(seen)},
    )


def api_request(
    path: str,
    ticket: str,
    *,
    method: str = "GET",
    payload: dict | None = None,
) -> dict:
    body = None
    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {ticket}",
    }
    if payload is not None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = Request(
        f"{API_BASE}{path}",
        data=body,
        method=method,
        headers=headers,
    )
    try:
        with urlopen(request, timeout=120) as response:
            raw = response.read()
            return json.loads(raw.decode("utf-8")) if raw else {}
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Hotel-Yab API HTTP {exc.code}: {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"Hotel-Yab API is unavailable: {exc}") from exc


def upload_file(batch_id: str, ticket: str, media_url: str):
    source = public_url_to_path(media_url)
    if not source.exists():
        raise RuntimeError(f"Prepared media is missing: {source}")
    total_size = source.stat().st_size
    chunk_size = 8 * 1_024 * 1_024
    chunk_count = max(1, (total_size + chunk_size - 1) // chunk_size)
    upload_id = hashlib.sha256(
        f"{batch_id}:{media_url}:{total_size}".encode("utf-8")
    ).hexdigest()[:32]
    parsed = urlparse(API_BASE)
    connection_class = (
        http.client.HTTPSConnection
        if parsed.scheme == "https"
        else http.client.HTTPConnection
    )
    endpoint = f"{parsed.path.rstrip('/')}/crawl-worker/{batch_id}/media"
    with source.open("rb") as media:
        for chunk_index in range(chunk_count):
            chunk_offset = chunk_index * chunk_size
            chunk = media.read(chunk_size)
            connection = connection_class(parsed.hostname, parsed.port, timeout=300)
            connection.request(
                "PUT",
                endpoint,
                body=chunk,
                headers={
                    "Authorization": f"Bearer {ticket}",
                    "Content-Type": "application/octet-stream",
                    "Content-Length": str(len(chunk)),
                    "X-Media-Path": media_url,
                    "X-Upload-Id": upload_id,
                    "X-Chunk-Index": str(chunk_index),
                    "X-Chunk-Count": str(chunk_count),
                    "X-Chunk-Offset": str(chunk_offset),
                    "X-Total-Size": str(total_size),
                },
            )
            response = connection.getresponse()
            detail = response.read().decode("utf-8", errors="replace")
            connection.close()
            if response.status >= 300:
                raise RuntimeError(
                    f"Media upload failed ({response.status}) for {media_url} "
                    f"at chunk {chunk_index + 1}/{chunk_count}: {detail}"
                )


def run_child(job: WorkerJob, args: list[str], environment: dict[str, str]):
    job.log("$ " + " ".join(args))
    process = subprocess.Popen(
        args,
        cwd=REPO_ROOT,
        env=environment,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    job.process = process
    assert process.stdout is not None
    for line in process.stdout:
        job.log(line)
        if job.stop_event.is_set():
            process.terminate()
            process.wait(timeout=15)
            raise InterruptedError("پردازش به درخواست کاربر متوقف شد")
    code = process.wait()
    job.process = None
    if code != 0:
        raise RuntimeError(f"فرمان با کد {code} متوقف شد")


def process_batch(job: WorkerJob, browser: str):
    batch_id = job.batch_id
    ticket = job.ticket
    job.update(status="RUNNING", message="دریافت اطلاعات تأییدشده")
    payload = api_request(f"/crawl-worker/{batch_id}/export", ticket)
    username = str(payload.get("batch", {}).get("instagramUsername", "batch"))
    job.username = username
    reviewed_file = WORKER_DIR / "jobs" / batch_id / f"{username}.reviewed.json"
    write_json(reviewed_file, payload)
    environment = {
        **os.environ,
        "PYTHONUNBUFFERED": "1",
        "HOTELYAB_API_BASE": API_BASE,
        "HOTELYAB_CRAWL_WORKER_TOKEN": ticket,
        "HOTELYAB_CRAWL_WORKER_BATCH_ID": batch_id,
    }
    job.update(message="دانلود و آماده‌سازی رسانه‌ها")
    run_child(
        job,
        [
            sys.executable,
            *(["--worker-child", "download_approved.py"] if getattr(sys, "frozen", False)
              else [str(BASE_DIR / "download_approved.py")]),
            str(reviewed_file),
            "--download",
            "--prepare-media",
            "--load-cookies",
            browser,
        ],
        environment,
    )
    plan = read_json(media_plan_path(reviewed_file), {})
    media_urls: list[str] = []
    for item in plan.get("items", []):
        entries = item.get("mediaItems", [])
        if not entries and item.get("payload"):
            entries = [
                {
                    "mediaUrl": item["payload"].get("mediaUrl"),
                    "thumbnailUrl": item["payload"].get("thumbnailUrl"),
                }
            ]
        for media in entries:
            for key in ("mediaUrl", "thumbnailUrl"):
                value = str(media.get(key, "") or "")
                if value and value not in media_urls:
                    media_urls.append(value)
    job.update(total=len(media_urls), current=0, message="انتقال رسانه‌ها به هتل‌یاب")
    for index, media_url in enumerate(media_urls, start=1):
        if job.stop_event.is_set():
            raise InterruptedError("پردازش به درخواست کاربر متوقف شد")
        upload_file(batch_id, ticket, media_url)
        job.update(current=index, message=f"انتقال رسانه {index} از {len(media_urls)}")
    for mode in ("--dry-run", "--apply"):
        job.update(
            message="اعتبارسنجی اطلاعات" if mode == "--dry-run" else "ورود اطلاعات"
        )
        run_child(
            job,
            [
                sys.executable,
                *(["--worker-child", "import_approved.py"] if getattr(sys, "frozen", False)
                  else [str(BASE_DIR / "import_approved.py")]),
                str(reviewed_file),
                mode,
            ],
            environment,
        )
    api_request(
        f"/crawl-worker/{batch_id}/complete",
        ticket,
        method="POST",
        payload={},
    )
    job.update(status="SUCCEEDED", message="رسانه‌ها و اطلاعات وارد سایت شدند")


def run_job(job: WorkerJob, target, *args):
    try:
        target(job, *args)
    except InterruptedError as exc:
        job.update(status="PAUSED", message=str(exc))
        if job.kind == "PROCESS" and job.batch_id and job.ticket:
            try:
                api_request(
                    f"/crawl-worker/{job.batch_id}/failed",
                    job.ticket,
                    method="POST",
                    payload={"message": str(exc)},
                )
            except Exception as callback_error:
                job.log(f"Could not report pause: {callback_error}")
    except Exception as exc:
        job.log(f"ERROR: {exc}")
        job.update(status="FAILED", message=str(exc))
        if job.kind == "PROCESS" and job.batch_id and job.ticket:
            try:
                api_request(
                    f"/crawl-worker/{job.batch_id}/failed",
                    job.ticket,
                    method="POST",
                    payload={"message": str(exc)},
                )
            except Exception as callback_error:
                job.log(f"Could not report failure: {callback_error}")


class WorkerHandler(BaseHTTPRequestHandler):
    server_version = "HotelYabLocalWorker/2.0"

    def log_message(self, format_string, *args):
        print(f"[{self.log_date_time_string()}] {format_string % args}")

    def allowed_origin(self) -> str | None:
        origin = self.headers.get("Origin", "")
        return origin if origin in WORKER_ORIGINS else None

    def send_json(self, status: int, payload):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        origin = self.allowed_origin()
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length <= 0 or length > 30_000_000:
            raise ValueError("Invalid request body")
        payload = json.loads(self.rfile.read(length).decode("utf-8"))
        if not isinstance(payload, dict):
            raise ValueError("Request body must be an object")
        return payload

    def do_OPTIONS(self):
        if self.headers.get("Origin") and not self.allowed_origin():
            self.send_json(403, {"message": "Origin is not allowed"})
            return
        self.send_response(204)
        origin = self.allowed_origin()
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.headers.get("Origin") and not self.allowed_origin():
            self.send_json(403, {"message": "Origin is not allowed"})
            return
        path = urlparse(self.path).path
        if path == "/health":
            self.send_json(
                200,
                {"data": {"ready": True, "version": 2, "environment": ENVIRONMENT}},
            )
            return
        parts = [unquote(item) for item in path.strip("/").split("/")]
        if len(parts) >= 2 and parts[0] == "jobs":
            job = JOBS.get(parts[1])
            if not job:
                self.send_json(404, {"message": "Job not found"})
                return
            if len(parts) == 3 and parts[2] == "result":
                if not job.result_path or not job.result_path.exists():
                    self.send_json(409, {"message": "Job result is not ready"})
                    return
                self.send_json(200, read_json(job.result_path, []))
                return
            self.send_json(200, {"data": job.payload()})
            return
        self.send_json(404, {"message": "Not found"})

    def do_POST(self):
        if self.headers.get("Origin") and not self.allowed_origin():
            self.send_json(403, {"message": "Origin is not allowed"})
            return
        path = urlparse(self.path).path
        try:
            if path == "/crawl":
                if has_active_job():
                    self.send_json(
                        409,
                        {"message": "یک کار دیگر در برنامه کرالر در حال اجرا است."},
                    )
                    return
                payload = self.read_json()
                username = extract_username(str(payload.get("username", "")))
                browser = str(payload.get("browser", DEFAULT_BROWSER) or DEFAULT_BROWSER)
                max_posts = int(payload["maxPosts"]) if payload.get("maxPosts") else None
                crawl_request = payload.get("crawlRequest")
                if not isinstance(crawl_request, dict):
                    raise ValueError(
                        "درخواست کرال این چهره ثبت نشده است؛ از مدیر بخواهید cURL تازه ثبت کند."
                    )
                job = register_job(WorkerJob("CRAWL", username))
                threading.Thread(
                    target=run_job,
                    args=(
                        job,
                        crawl_with_saved_request,
                        browser,
                        max_posts,
                        crawl_request,
                    ),
                    daemon=True,
                ).start()
                self.send_json(202, {"data": job.payload()})
                return
            if path == "/process":
                if has_active_job():
                    self.send_json(
                        409,
                        {"message": "یک کار دیگر در برنامه کرالر در حال اجرا است."},
                    )
                    return
                payload = self.read_json()
                batch_id = str(payload.get("batchId", ""))
                ticket = str(payload.get("ticket", ""))
                browser = str(payload.get("browser", DEFAULT_BROWSER) or DEFAULT_BROWSER)
                if not batch_id or not ticket:
                    raise ValueError("Processing request is incomplete")
                job = register_job(WorkerJob("PROCESS"))
                job.batch_id = batch_id
                job.ticket = ticket
                threading.Thread(
                    target=run_job,
                    args=(job, process_batch, browser),
                    daemon=True,
                ).start()
                self.send_json(202, {"data": job.payload()})
                return
            parts = [unquote(item) for item in path.strip("/").split("/")]
            if len(parts) == 3 and parts[0] == "jobs" and parts[2] == "pause":
                job = JOBS.get(parts[1])
                if not job:
                    self.send_json(404, {"message": "Job not found"})
                    return
                job.stop_event.set()
                job.update(message="در حال توقف امن…")
                self.send_json(202, {"data": job.payload()})
                return
        except (ValueError, TypeError, json.JSONDecodeError) as exc:
            self.send_json(400, {"message": str(exc)})
            return
        except Exception as exc:
            self.send_json(500, {"message": str(exc)})
            return
        self.send_json(404, {"message": "Not found"})


def create_server(environment: str = "local", browser: str = "chrome", port: int = 4317):
    global API_BASE, ENVIRONMENT, DEFAULT_BROWSER
    ENVIRONMENT = environment
    API_BASE = API_BASES[ENVIRONMENT]
    DEFAULT_BROWSER = browser
    WORKER_DIR.mkdir(parents=True, exist_ok=True)
    return ThreadingHTTPServer(("127.0.0.1", port), WorkerHandler)


def main():
    parser = argparse.ArgumentParser(
        description="Run the Hotel-Yab local Instagram crawler bridge."
    )
    parser.add_argument(
        "--environment",
        choices=sorted(API_BASES),
        default="local",
        help="Use local Hotel-Yab or the fixed production domain.",
    )
    parser.add_argument(
        "--browser",
        choices=["brave", "chrome", "edge", "firefox", "safari", "vivaldi"],
        default="chrome",
    )
    parser.add_argument("--port", type=int, default=4317)
    args = parser.parse_args()
    server = create_server(args.environment, args.browser, args.port)
    print(f"Hotel-Yab local crawler is ready at http://127.0.0.1:{args.port}")
    print(f"Hotel-Yab environment: {ENVIRONMENT}")
    print("Instagram cookies stay on this computer.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping local crawler…")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
