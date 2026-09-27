# Crawl request validation and local session recovery

The saved request must be a `PolarisProfilePostsTabContentQuery_connection`
operation with `variables.username` matching the selected person's Instagram
handle. Both header and body operation names must agree. Home-feed, promotion,
and screen-time requests are rejected at save time. The local helper validates
previously stored recipes too, before reading browser cookies or making requests.

The API does not persist cookies, CSRF, `fb_dtsg`, `jazoest`, or LSD tokens.
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
