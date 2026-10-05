# Support downloads deployment

Source is maintained in the website repository at `download-link/`. It runs as
an independent service at `https://support-downloads.rocobroker.com`.
Pulling the website repository does not restart this service or the website.

The commands below assume the existing cPanel VPS, the `rocobrok` cPanel
account, the website checkout at `/opt/rocobroker-next`, and Node.js at
`/opt/rocobroker-node/bin/node`. Run server commands as root.

## DNS, certificate and storage

1. Point the `support-downloads` A record at the VPS. Initially use DNS-only if
   Cloudflare manages DNS.
2. Create `support-downloads.rocobroker.com` in the `rocobrok` cPanel account
   with its own document root. Run AutoSSL and verify its certificate before
   installing the proxy includes.
3. Keep the shared MT5 bucket private. Videos use the `videos/` prefix; this
   application does not manage the existing MT5 installer.
4. Add the following bucket CORS rule, preserving existing rules:

```json
{
  "AllowedOrigins": ["https://support-downloads.rocobroker.com"],
  "AllowedMethods": ["PUT"],
  "AllowedHeaders": ["Content-Type"],
  "ExposeHeaders": ["ETag"],
  "MaxAgeSeconds": 3600
}
```

## First installation

```bash
umask 022
cd /opt/rocobroker-next
runuser -u rocoweb -- git pull --ff-only origin main

test -x /opt/rocobroker-node/bin/node
/opt/rocobroker-node/bin/node --version
ss -ltn 'sport = :3300'
# If a listener appears on port 3300, stop here and resolve the conflict.

id rocodownloads >/dev/null 2>&1 || \
  useradd --system --home-dir /opt/roco-support-downloads \
  --shell /sbin/nologin rocodownloads

install -d -m 0755 /opt/roco-support-downloads
install -m 0644 download-link/server.js download-link/app.js download-link/package.json \
  download-link/package-lock.json /opt/roco-support-downloads/
install -d -m 0755 /opt/roco-support-downloads/public
cp -r download-link/public/. /opt/roco-support-downloads/public/
chmod -R u=rwX,go=rX /opt/roco-support-downloads/public

cd /opt/roco-support-downloads
PATH=/opt/rocobroker-node/bin:/usr/bin:/bin npm ci --omit=dev --ignore-scripts
```

Set credentials directly on the server. Do not copy a local `.env` into the
repository or paste credentials into a chat.

```bash
umask 077
touch /etc/roco-support-downloads.env
chmod 600 /etc/roco-support-downloads.env
nano /etc/roco-support-downloads.env
```

Enter these settings using the existing MT5 bucket configuration:

```dotenv
S3_ENDPOINT=https://YOUR-PARSPACK-ENDPOINT
S3_REGION=us-east-1
S3_BUCKET=YOUR-MT5-BUCKET
S3_ACCESS_KEY_ID=YOUR-ACCESS-KEY
S3_SECRET_ACCESS_KEY=YOUR-SECRET-KEY
S3_FORCE_PATH_STYLE=true
UPLOAD_URL_SECONDS=900
```

Generate the dashboard token once, directly into the configuration file:

```bash
openssl rand -hex 32 | sed 's/^/ADMIN_TOKEN=/' >> /etc/roco-support-downloads.env

install -m 0644 \
  /opt/rocobroker-next/download-link/deploy/roco-support-downloads.service \
  /etc/systemd/system/roco-support-downloads.service
systemd-analyze verify /etc/systemd/system/roco-support-downloads.service
systemctl daemon-reload
systemctl enable --now roco-support-downloads
curl -fsS http://127.0.0.1:3300/api/health
```

The service binds to `127.0.0.1:3300`. Do not open that port in the firewall.
Metadata persists in `/var/lib/roco-support-downloads/uploads.json`, outside
the deployment directory. Back it up securely; it contains client link tokens.

## Apache proxy

After the cPanel domain and HTTPS certificate exist:

```bash
install -d \
  /etc/apache2/conf.d/userdata/ssl/2_4/rocobrok/support-downloads.rocobroker.com \
  /etc/apache2/conf.d/userdata/std/2_4/rocobrok/support-downloads.rocobroker.com
install -m 0644 /opt/rocobroker-next/download-link/deploy/apache-ssl.conf \
  /etc/apache2/conf.d/userdata/ssl/2_4/rocobrok/support-downloads.rocobroker.com/downloads.conf
install -m 0644 /opt/rocobroker-next/download-link/deploy/apache-http.conf \
  /etc/apache2/conf.d/userdata/std/2_4/rocobrok/support-downloads.rocobroker.com/downloads.conf
/usr/local/cpanel/scripts/ensure_vhost_includes --user=rocobrok
/usr/local/cpanel/scripts/rebuildhttpdconf
apachectl configtest && systemctl reload httpd
```

Validate Apache configuration before reloading. These includes are scoped to
the downloads domain and preserve AutoSSL validation paths.
See [cPanel include-file documentation](https://docs.cpanel.net/ea4/apache/modify-apache-virtual-hosts-with-include-files/).

## Verification

```bash
curl -fsS https://support-downloads.rocobroker.com/api/health
curl -sS -o /dev/null -w '%{http_code}\n' \
  https://support-downloads.rocobroker.com/api/uploads
```

Expected: `{"ok":true}` and `401`. Open the Persian dashboard, unlock it with
its admin token, upload a small video, and copy the client link. Opening or
previewing that link must not consume it. Press «دانلود ویدئو» once and verify
that the video downloads, then repeat the POST and confirm it is refused.

The video streams through the VPS. There is no storage redirect or reusable
signed GET URL. Browsers cannot resume interrupted downloads; support must
create a fresh link. A storage failure before the download response starts
releases the claim for retry. Claims left behind by a process crash stay used.

Existing links with a `firstUsedAt` timestamp become used, even if their old
two-hour window had not ended. Existing unused links still work once. Revoked
links stay blocked. The previous `LINK_LIFETIME_HOURS` and
`DOWNLOAD_URL_MAX_SECONDS` environment settings are ignored; the operator may
remove them from the server configuration. No credentials need to change.

The proxy drops ParsPack's disposition header and creates one safe attachment
header itself. Older uploads are usable through the new streaming path without
re-uploading them to change that metadata.

## Subsequent updates

Run the following in a root Bash session. `set -e` stops the sequence if an
update command fails. It stops only the download service. The backup is taken
after stopping the service so it cannot capture an unfinished metadata write.

```bash
set -e
umask 022
cd /opt/rocobroker-next
runuser -u rocoweb -- git rev-parse HEAD
runuser -u rocoweb -- git pull --ff-only origin main
systemctl stop roco-support-downloads
install -d -m 0700 /var/backups/roco-support-downloads
if test -f /var/lib/roco-support-downloads/uploads.json; then
  install -m 0600 /var/lib/roco-support-downloads/uploads.json \
    "/var/backups/roco-support-downloads/uploads-$(date +%Y%m%d-%H%M%S).json"
fi
install -m 0644 download-link/server.js download-link/app.js \
  download-link/package.json download-link/package-lock.json \
  /opt/roco-support-downloads/
cp -r download-link/public/. /opt/roco-support-downloads/public/
chmod -R u=rwX,go=rX /opt/roco-support-downloads/public
install -m 0644 download-link/deploy/apache-ssl.conf \
  /etc/apache2/conf.d/userdata/ssl/2_4/rocobrok/support-downloads.rocobroker.com/downloads.conf
cd /opt/roco-support-downloads
PATH=/opt/rocobroker-node/bin:/usr/bin:/bin npm ci --omit=dev --ignore-scripts
/usr/local/cpanel/scripts/ensure_vhost_includes --user=rocobrok
/usr/local/cpanel/scripts/rebuildhttpdconf
apachectl configtest
systemctl reload httpd
systemctl start roco-support-downloads
curl -fsS https://support-downloads.rocobroker.com/api/health
```

Record the previous commit before updating. If deployment fails before the new
service is used, reinstall its files with `git show <previous-commit>:<path>`
and restore the previous Apache include, validate configuration and restart.
After any new downloads have started, do not restore an older metadata backup:
that could reopen consumed links. Retain the current metadata and use forward
fixes; do not roll back to the former two-hour link logic.

## Staff access recommendation (not implemented)

This release retains the shared admin-token login. For individual staff access,
use Cloudflare Access with an explicit email allowlist and corporate SSO or
one-time email codes. Protect the dashboard and admin APIs, with a narrowly
scoped public exception for `/d/*`. Validate Access JWT signatures, issuer,
audience and expiry inside the service so requests directly to the origin
cannot bypass authentication. Replace the shared admin token only in that
separate authentication rollout.

References: [email login](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/),
[public-path exceptions](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/common-policies/),
[origin JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/).
