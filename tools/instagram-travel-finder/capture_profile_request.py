"""Capture a profile query locally without exporting Instagram credentials."""

import json
import time
from urllib.parse import parse_qsl, urlencode, urlparse


OPERATION = "PolarisProfilePostsTabContentQuery_connection"
CONNECTION = "xdt_api__v1__feed__user_timeline_graphql_connection"


def capture_profile_request(username, cookies, browser, should_stop, report):
    try:
        from playwright.sync_api import sync_playwright, Error, TimeoutError
    except ImportError:
        raise RuntimeError("نسخه جدید برنامه کرالر را برای دریافت خودکار درخواست نصب کنید.") from None

    captured = None
    with sync_playwright() as playwright:
        try:
            instance = playwright.chromium.launch(
                channel="msedge" if browser == "edge" else "chrome", headless=False,
            )
        except Error:
            raise RuntimeError("برای دریافت خودکار، Chrome (یا با انتخاب Edge، مرورگر Edge) باید نصب باشد.") from None
        try:
            context = instance.new_context()
            context.add_cookies([
                {"name": name, "value": value, "domain": ".instagram.com", "path": "/", "secure": True}
                for name, value in cookies.items()
            ])
            page = context.new_page()

            def receive(response):
                nonlocal captured
                if captured is not None or response.status != 200:
                    return
                request = response.request
                url = urlparse(request.url)
                if (url.scheme != "https" or url.netloc != "www.instagram.com"
                        or url.path not in ("/graphql/query", "/api/graphql") or request.method != "POST"):
                    return
                try:
                    form = dict(parse_qsl(request.post_data or "", keep_blank_values=True))
                    variables = json.loads(form.get("variables", "{}"))
                    if (form.get("fb_api_req_friendly_name") != OPERATION
                            or not isinstance(variables, dict)
                            or str(variables.get("username", "")).lower() != username.lower()
                            or not form.get("doc_id")):
                        return
                    payload = response.json()
                    connection = (payload.get("data") or {}).get(CONNECTION)
                    if not isinstance(connection, dict) or not isinstance(connection.get("edges"), list):
                        return
                    variables["after"] = None
                    captured = {
                        "version": 1, "url": request.url,
                        "headers": {"x-fb-friendly-name": OPERATION},
                        "body": urlencode({"doc_id": form["doc_id"], "variables": json.dumps(variables),
                                           "fb_api_req_friendly_name": OPERATION}),
                    }
                except (Error, ValueError, TypeError, AttributeError):
                    return

            page.on("response", receive)
            report("در پنجره بازشده اگر لازم است وارد اینستاگرام شوید؛ درخواست خودکار دریافت می‌شود.")
            profile_url = f"https://www.instagram.com/{username}/"
            try:
                page.goto(profile_url, wait_until="domcontentloaded", timeout=25000)
            except TimeoutError:
                pass
            deadline = time.monotonic() + 120
            last_navigation = time.monotonic()
            while time.monotonic() < deadline and captured is None:
                if should_stop():
                    return None
                if page.is_closed():
                    raise RuntimeError("پنجره دریافت درخواست بسته شد؛ دوباره شروع کنید.")
                location = urlparse(page.url)
                if location.path.rstrip("/").lower() == f"/{username}".lower():
                    page.mouse.wheel(0, 1100)
                elif location.path in ("/", "") and time.monotonic() - last_navigation > 5:
                    page.goto(profile_url, wait_until="domcontentloaded", timeout=20000)
                    last_navigation = time.monotonic()
                page.wait_for_timeout(1000)
            if captured is None:
                raise RuntimeError("درخواست پست‌ها دریافت نشد؛ ورود و دسترسی به صفحه را بررسی کنید یا حالت cURL ذخیره‌شده را انتخاب کنید.")
            local_cookies = {item["name"]: item["value"] for item in context.cookies("https://www.instagram.com/")}
            return captured, local_cookies
        except Error:
            raise RuntimeError("دریافت درخواست از مرورگر متوقف شد؛ اتصال و پنجره اینستاگرام را بررسی کنید.") from None
        finally:
            instance.close()
