# ROCO Support Video Downloads

A Persian, RTL support dashboard for uploading videos to private ParsPack
object storage and issuing one-time client download links. It is maintained in
the website repository but deployed as its own service.

## Download behavior

- Opening `/d/:token` shows a Persian confirmation page. GET and HEAD do not
  consume the link, so ordinary previews and refreshes are harmless.
- Clicking «دانلود ویدئو» sends `POST /d/:token/download`. The server durably
  claims the link before reading the object, then streams it through the VPS.
- Only one request can claim a link. Used or revoked links return HTTP 403.
- Storage failure before the response starts releases the claim. Once streaming
  starts, interrupted downloads require a new link from support.
- Crash-interrupted claims remain consumed. Range/resume requests are refused.
- Admin regeneration invalidates the old link and grants one new attempt.
- Records used under the old two-hour policy remain used. Unused records retain
  one attempt. `expiresAt` is returned as null for API compatibility.

The JSON metadata store is for one service process only. Keep it outside the
release folder and back it up securely. It contains the client link mappings;
losing or restoring an older copy can invalidate links or reopen used links.

## Local development

Requirements: Node.js 20+ and a private S3-compatible bucket.

```bash
npm ci
cp .env.example .env
# Fill configuration directly in your local editor; never commit it.
npm start
```

The app binds to `127.0.0.1:3000` by default. The public dashboard at
`https://support-downloads.rocobroker.com` uses the existing MT5 bucket, storing
videos under `videos/` without managing the MT5 installer.

```bash
npm test
```

Tests inject fake storage, synthetic credentials and temporary metadata. They
never load `.env`, contact ParsPack or access production link data.

The dashboard uses locally served Vazirmatn, Persian digits and Jalali dates
in Tehran time. The font source and license are included in `public/fonts/`.
Uploads still go straight from the browser to ParsPack using temporary signed
PUT URLs. Downloads stream through the VPS, with backpressure and cancellation,
without exposing signed GET URLs. Download traffic consumes VPS bandwidth.

See [DEPLOYMENT.md](DEPLOYMENT.md) for cPanel installation, Git-based updates,
backup precautions, public verification and the deferred Cloudflare Access
recommendation. Authentication remains the existing shared admin token.
