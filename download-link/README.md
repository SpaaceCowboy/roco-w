# ParsPack Expiring Video Downloads

A small admin dashboard for uploading videos directly to an S3-compatible ParsPack Object Storage bucket and issuing client download links with this rule:

- A freshly created client link has no countdown.
- The first successful visit starts the timer.
- The same client link stays valid for 2 hours after that first visit.
- After 2 hours it returns HTTP 403.
- Revoking or regenerating a link immediately invalidates the previous app link.

The actual object-storage bucket should remain private.

## Files

- `public/index.html` — single-page admin UI.
- `server.js` — secure API, upload signing, link state and download redirects.
- `.env.example` — configuration template.
- `data/uploads.json` — created automatically; stores metadata, not video bytes.

## 1. Requirements

Node.js 20+ and a private ParsPack Object Storage bucket with S3-compatible API credentials.

## 2. Install

```bash
npm install
cp .env.example .env
```

Edit `.env` and set:

- `PUBLIC_BASE_URL`
- `ADMIN_TOKEN`
- `S3_ENDPOINT`
- `S3_REGION` if ParsPack gives you a specific region
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_FORCE_PATH_STYLE` according to the endpoint style

Generate a strong admin token, for example:

```bash
openssl rand -hex 32
```

## 3. Bucket CORS

Because the admin browser uploads the video directly to object storage, the bucket must allow `PUT` requests from your dashboard origin.

Use the equivalent of this CORS policy in your ParsPack bucket settings, replacing the origin:

```json
[
  {
    "AllowedOrigins": ["https://support-downloads.rocobroker.com"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Do not make the bucket public.

## 4. Run

```bash
npm start
```

Open `http://127.0.0.1:3000` for a local test. The process binds to localhost by default.

For production, `PUBLIC_BASE_URL` should be the public HTTPS address, for example:

```env
PUBLIC_BASE_URL=https://support-downloads.rocobroker.com
```

## 5. How the expiry is enforced

The link given to the client looks like:

```text
https://support-downloads.rocobroker.com/d/<random-token>
```

On first successful request the server atomically stores:

- `firstUsedAt = now`
- `expiresAt = now + 2 hours`

Each valid request then creates a short-lived signed GET URL to the private object and redirects the browser to it. The signed storage URL is capped at 5 minutes and is shortened when the 2-hour deadline is closer, so it cannot outlive the client-link window.

## 6. Dashboard features

- Drag-and-drop video upload
- Direct-to-object-storage upload progress
- File list with size and upload time
- Copy client link
- Unused / active / expired / revoked status
- Live remaining time for active links
- First-used and expiry timestamps
- Revoke a link
- Generate a fresh unused link
- Delete the object from storage
- Simple admin-token lock

## Production notes

The included JSON metadata store is intentionally simple and works well for a small internal tool. If you expect multiple application instances or high concurrency, replace it with PostgreSQL/SQLite/Redis.

Back up `data/uploads.json`; losing it loses the mapping between client tokens and object keys.

The application does not expose ParsPack credentials to the browser. Only temporary presigned upload/download URLs reach the client.

Production installation and Git-based updates are documented in [DEPLOYMENT.md](DEPLOYMENT.md).
