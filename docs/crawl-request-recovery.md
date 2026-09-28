# Crawl request validation and local session recovery

The saved request must be a `PolarisProfilePostsTabContentQuery_connection`
operation with `variables.username` matching the selected person's Instagram
handle. Both header and body operation names must agree. Home-feed, promotion,
and screen-time requests are rejected at save time. The local helper validates
previously stored recipes too, before reading browser cookies or making requests.

The API does not persist cookies, CSRF, `fb_dtsg`, `jazoest`, or LSD tokens.
At execution the helper keeps only the captured query identifier and variables,
then builds the Relay envelope locally. Captured rendering metadata such as
`__csr`, `__dyn`, `__hsi`, and `__spin_*` must not be replayed with a fresh session:
the captured request failed with 1357054 whereas the minimal profile request
returned a supported media connection during diagnosis.
The helper uses the selected local browser's cookies to read the profile page,
extract `DTSGInitialData` and `LSD`, and complete the GraphQL form in memory.
The actor ID comes from `RelayAPIConfigDefaults.actorID`, falling back to
`CurrentUserInitialData.NON_FACEBOOK_USER_ID` and then `USER_ID`. It is never
inferred from the `ds_user_id` cookie. A missing actor stops the crawl before the
GraphQL request. Redirects are rejected to avoid forwarding cookies.
Missing bootstrap tokens stop the crawl with a session/re-authentication message;
changes to Instagram's bootstrap format may require a helper update.
Interrupted HTML downloads retain received chunks and are usable only when both
session-token modules can be decoded completely. Otherwise the helper retries
up to three times with bounded delays; it never treats partial GraphQL media
data as a successful crawl.
`IG_COOKIE` cannot override the selected browser's session in this helper flow.

## Applying the changes

### Automatic capture (helper protocol 3)

The admin crawl page defaults to automatic request capture. No stored recipe is
required in that mode. The helper opens an isolated, visible installed Chrome
(Edge when selected) using Playwright and imports only local Instagram cookies.
If cookie reading fails, the operator can log in in the temporary window.
Other browser selections supply cookies but still require Chrome for capture.
The temporary session is not written to disk or sent to Hotel-Yab. The helper
captures only a successful profile-posts response matching `variables.username`
and the expected media connection, scrolls for pagination, and stops after two
minutes or cancellation. It never captures home-feed or promotion requests.
The resulting credential-free recipe stays in memory, and the matching local
session is passed directly to the crawler. Manual saved-recipe mode remains
available. Capturing is not guaranteed if Instagram changes its operation or
requires a login challenge. Downloading later still uses the selected browser's
login; a login only in the temporary capture window is not persisted for downloads.

Rebuild the helper with the updated helper requirements (including Playwright).
No bundled browser download is needed: installed Chrome/Edge is used. Version 2
helpers can still use manual mode, but cannot automatically capture requests.

### Media long-press on iOS

`media-gestures.module.css` disables selection, touch callouts, and image dragging
on reel/card media surfaces. Context menus are suppressed there while editable
comment fields retain selection. Pointer press/release and vertical scrolling
remain intact; no global touch preventDefault is installed.

Profile identity is validated against `variables.username` before sending the
request, not against individual media owners. Collaboration posts can legitimately
have a different owner and must not stop pagination. Review rows use the crawled
profile as `instagram_username`, retain the original owner separately as
`source_owner_username`, and keep the original source URL unchanged.

API changes take effect after the normal server update. Worker changes require
rebuilding and replacing the desktop helper; a Git push alone does not update an
already installed application. Replace a previously stored home-feed recipe with
a fresh profile-posts request. Do not change an unrelated operation's name or
`doc_id` manually to bypass validation.

For capture, open the profile's Posts grid with DevTools Network recording,
scroll until additional posts appear, and inspect the newly recorded requests.
Check the operation and `variables.username`, not merely the request URL or
Referer. Copy the matching request as cURL into the selected person's editor.
If no such request is present, do not substitute home-feed or promotion requests.

Related documentation: the `/admin/crawl-reviews` section in `PROJECT_CONTEXT.md`
and the local helper / saved GraphQL recipe section in `docs/ARCHITECTURE.md`.
