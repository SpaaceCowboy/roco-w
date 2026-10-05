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
  "AllowedHeaders": ["Content-Type", "Content-Disposition"],
  "ExposeHeaders": ["ETag"],
  "MaxAgeSeconds": 3600
}
```

## First installation

```bash
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
install -m 0644 download-link/server.js download-link/package.json \
  download-link/package-lock.json /opt/roco-support-downloads/
install -d -m 0755 /opt/roco-support-downloads/public
install -m 0644 download-link/public/index.html /opt/roco-support-downloads/public/

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
LINK_LIFETIME_HOURS=2
UPLOAD_URL_SECONDS=900
DOWNLOAD_URL_MAX_SECONDS=300
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

Expected: `{"ok":true}` and `401`. Open the dashboard, unlock it with the
configured admin token, upload a small video and test its client link in Chrome.
Test revocation afterward. Already issued storage URLs can remain usable for
up to five minutes after revocation. The first redirect starts the expiry timer;
it does not confirm that the storage download succeeded.

## Subsequent updates

Keep the previous source revision available for rollback. Reinstall the files
from that revision if an update fails. Never remove the metadata directory.

```bash
cd /opt/rocobroker-next
runuser -u rocoweb -- git rev-parse HEAD
runuser -u rocoweb -- git pull --ff-only origin main
systemctl stop roco-support-downloads
install -m 0644 download-link/server.js download-link/package.json \
  download-link/package-lock.json /opt/roco-support-downloads/
install -m 0644 download-link/public/index.html /opt/roco-support-downloads/public/
cd /opt/roco-support-downloads
PATH=/opt/rocobroker-node/bin:/usr/bin:/bin npm ci --omit=dev --ignore-scripts
systemctl start roco-support-downloads
curl -fsS https://support-downloads.rocobroker.com/api/health
```

If service or Apache configuration changed, also reinstall the corresponding
configuration files and repeat their validation/reload steps. Updating downloads
does not require rebuilding or restarting the Next.js website.
