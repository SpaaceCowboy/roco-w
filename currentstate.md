> **Deployment update — 2026-10-09 (later):** website revision `a1f9029` is live, adding the swap-free landing page, the leads table and the admin export.
>
> - **Runtime:** `/opt/rocobroker-next/.next` → `/opt/rocobroker-releases/leads-a1f9029/.next`.
> - **Rollback target:** the previous runtime, `/opt/rocobroker-releases/scc-staff-c38eca7/.next`.
> - **Migration:** `0007_leads` was applied (8 migrations).
> - **Backup:** a pre-migration content DB backup is at `/home/rocoweb/backups/leads-c69a326/`.
> - **Restart scope:** only `rocobroker-next` was restarted, and the PM2 staff-login environment was kept. A before/after diff of running services and Docker containers showed no change.
> - **Production checkout:** `/opt/rocobroker-next` is still at `19b55b0`. Only the runtime link moved.
>
> Details and procedure are in "Release: swap-free landing page and leads" at the end of this file. The staff-login update below still applies.
>
> **Deployment update — 2026-10-09:** shared staff login is live. Website runtime revision `19b55b0` is served through `/opt/rocobroker-next/.next`, which now points to `/opt/rocobroker-releases/scc-staff-c38eca7/.next`. The directory name identifies the initial staged revision; it includes the verified Apache-header fix from `19b55b0`. Only the `rocobroker-next` application was restarted; the systemd-owned PM2 daemon and unrelated services remained running. SCC API/dashboard/proxy use `roco-seo:staff-cd7a7b6`; its worker and PostgreSQL were not recreated.
>
> Staff login is at `https://scc.rocobroker.com/admin/sign-in`, with terminal-managed email/password accounts and mandatory authenticator enrollment. The existing administrator identity and SEO actor were preserved. No credentials are recorded in this document. The protected password handoff and backups remain only on the website VPS. Both repository implementation branches are pushed; the website production checkout is pinned at `19b55b0`.
>
> Live verification covered MFA, both dashboards, draft save/conflict handling, a real image upload, asset routing and global logout. The temporary draft/image were removed and verification accounts disabled, with audit history retained. Public English/Persian pages remained healthy. The historical setup below remains useful but its old source/deployed-commit statements are superseded by this update.

# Current Deployment State

Last updated: 2026-09-18 (Asia/Tehran)

The Next.js site serves the production apex over HTTPS at
`https://rocobroker.com`, proxied by the existing Apache. `next.rocobroker.com`
still works and redirects to the apex as a fallback. Webmail and cPanel
hostnames are untouched. The public blog reads from PostgreSQL
(`CONTENT_SOURCE=database`), with the checked-in `posts.json` retained as the
read-only fallback for one release. Live remaining work is tracked in
`pending.md`.

## Source state

- Repository: `git@github.com:SpaaceCowboy/roco-w.git`
- Branch: `main`
- Deployed commit: `05e2c40`. The live-chat consent gating (`162851f`) and the
  apex/scheduler doc + timer-unit changes (`cdaa19b`) are on `main` but not yet
  deployed — the cutover deploy below picks them up.
- Production builds use Webpack so Next.js can fall back to its SWC WASM
  compiler on AlmaLinux 8 / glibc 2.28. Standalone output is enabled.
- All implementation changes are recorded in `changelog.md`.

## Isolated Next.js runtime

- Service account: `rocoweb`; checkout `/opt/rocobroker-next`
- Node.js `v22.23.2` at `/opt/node-v22.23.2-linux-x64`, stable symlink
  `/opt/rocobroker-node` — always reference the symlink, never the versioned
  path, or a Node upgrade breaks boot
- PM2 `7.0.3`, user-local at `/home/rocoweb/.local`, `PM2_HOME=/home/rocoweb/.pm2`
- Bound privately to `127.0.0.1:3100`, `NODE_ENV=production`, not on a public
  interface and not opened in CSF
- Git operations in the checkout must run as `rocoweb`; as root they trip Git's
  dubious-ownership protection

## Process management — systemd owns PM2

`/etc/systemd/system/pm2-rocoweb.service` is enabled and owns the PM2 daemon.

- Start and stop the service with `systemctl start|stop|restart pm2-rocoweb`,
  **not** `pm2 start`. Starting a second daemon by hand splits ownership of
  `PM2_HOME`, after which systemd cannot adopt it: `pm2 resurrect` finds the
  daemon already running, exits without forking, never writes
  `/home/rocoweb/.pm2/pm2.pid`, and the unit fails with `result 'protocol'`.
  Recovery is `pm2 save`, `pm2 kill`, `systemctl reset-failed pm2-rocoweb`,
  `systemctl start pm2-rocoweb`.
- `pm2 restart rocobroker-next` for an app-level restart is fine — it works
  through the systemd-owned daemon.
- The unit's `Environment=PATH` must contain `/opt/rocobroker-node/bin`;
  `ExecStart` runs pm2's JS entry point through a `#!/usr/bin/env node` shebang.

## Application logs are not in journald

`journalctl -u pm2-rocoweb` shows only PM2's own CLI output. The application's
stdout and stderr go to PM2's log files. An erroring app looks perfectly healthy
in journald.

```
/home/rocoweb/.pm2/logs/rocobroker-next-error.log
/home/rocoweb/.pm2/logs/rocobroker-next-out.log
```

Log rotation is configured with `pm2-logrotate` (10 MB per file, 14 files
retained, installed 2026-09-18).

## Configuration and secrets

`/opt/rocobroker-next/.env.production`, mode `600`, owned by `rocoweb`, ignored
by Git. It is read twice:

- at **build** time from the project root, which is when `NEXT_PUBLIC_*` values
  are inlined into the client bundle — a runtime-only value will never reach the
  browser;
- at **runtime** from `.next/standalone`, because the standalone server calls
  `process.chdir(__dirname)`.

`.next` is regenerated by every build, so the runtime copy is a symlink that
must be recreated on each deploy. Missing it fails silently: the site looks
healthy while every contact submission fails.

## Contact form

Mail goes to Exim on this host over SMTP to `127.0.0.1:25`, delivering to a
local mailbox. There is no third-party sender and no API key. The earlier Resend
integration was removed — the deployment had no account, and adding one would
have meant merging SPF records on a domain already carrying production mail.

Failure codes: `503` the MTA is unreachable, `502` the MTA refused the message,
`429` the per-IP brake, `403` not a same-origin browser submission.

## Apache reverse proxy

Serving `next.rocobroker.com` only. cPanel regenerates `httpd.conf`, so the
configuration lives in userdata includes, never in `httpd.conf` directly:

```
/etc/apache2/conf.d/userdata/std/2_4/rocobrok/next.rocobroker.com/proxy.conf
/etc/apache2/conf.d/userdata/ssl/2_4/rocobrok/next.rocobroker.com/proxy.conf
```

Apply changes with `/scripts/ensure_vhost_includes --user=rocobrok`, then
`apachectl configtest`, and only then `systemctl reload httpd`. The cPanel user
is `rocobrok` (truncated to 8 characters), not `rocobroker`.

Two directives are load-bearing:

- `ProxyPreserveHost On` — the app derives canonical and hreflang URLs from the
  `Host` header.
- `ProxyPass /.well-known !` **before** the catch-all — otherwise ACME challenges
  are proxied to Next.js and AutoSSL renewals fail.

SELinux is disabled on this host, so `httpd_can_network_connect` does not apply.
`proxy_module` and `proxy_http_module` are both loaded.

## Deploy procedure

```bash
systemctl stop pm2-rocoweb
cd /opt/rocobroker-next
runuser -u rocoweb -- git pull
runuser -u rocoweb -- env PATH=/opt/rocobroker-node/bin:/usr/bin:/bin npm ci
runuser -u rocoweb -- env PATH=/opt/rocobroker-node/bin:/usr/bin:/bin npm run build
runuser -u rocoweb -- cp -r .next/static .next/standalone/.next/static
runuser -u rocoweb -- cp -r public .next/standalone/public
runuser -u rocoweb -- ln -sfn /opt/rocobroker-next/.env.production \
  /opt/rocobroker-next/.next/standalone/.env.production
systemctl start pm2-rocoweb
```

Then verify both, not just the first:

```bash
curl -sS -L --max-redirs 5 -o /dev/null -w 'root: %{http_code}\n' \
  http://127.0.0.1:3100/

curl -sS -o /dev/null -w 'contact: %{http_code}\n' \
  -X POST http://127.0.0.1:3100/api/contact \
  -H 'Content-Type: application/json' -H 'Sec-Fetch-Site: same-origin' \
  -d '{"name":"Probe","email":"probe@example.com","subject":"probe","message":"probe","department":"support","locale":"en"}'
```

A `200` on the contact probe sends a real email. `503` means the env symlink
step was missed.

## Remaining work

Tracked in `pending.md`, which supersedes the earlier list here. Completed since
the last update: log rotation (item 1), apex cutover (item 3), the live-chat
consent gating, the PostgreSQL password rotation, the `CONTENT_SOURCE=database`
read cutover, the Postgres and R2 restore drills, the scheduled-publication
timer install, and origin lockdown. Still open: alert owners and destinations,
and the manual security/accessibility QA. 

**Unrelated but outstanding:** `bo.`, `my.` and `webtrading.rocobroker.com`
have self-signed origin certificates that expired 2026-05-16. AutoSSL cannot
fix them because they resolve to Cloudflare rather than this host. Harmless
while Cloudflare SSL mode is Flexible or Full; switching to Full (strict) would
break the client portal and webtrader immediately.

## Safe process controls

```bash
systemctl status pm2-rocoweb --no-pager

cd /home/rocoweb
runuser -u rocoweb -- env \
  HOME=/home/rocoweb PM2_HOME=/home/rocoweb/.pm2 \
  PATH=/home/rocoweb/.local/bin:/opt/rocobroker-node/bin:/usr/bin:/bin \
  pm2 status
```

Stopping the app affects only this private service. Apache, WordPress, cPanel,
Exim and Dovecot are untouched by it.

## Prepared SCC staff-login release (2026-10-08)

The `codex/scc-shared-staff-login` branch adds an opt-in shared email/password + authenticator login and SCC proxy integration. This is a prepared release, not a claim that the main VPS has been updated. Main-VPS deployment, account provisioning, the key transfer and rollback are documented in `docs/scc-staff-deployment.md`. Both services remain on their existing VPSs.

## Release: swap-free landing page and leads (2026-10-09)

**Status: deployed 2026-10-09 as `a1f9029`.** That is `c69a326` plus a fix that
drops the inherited canonical and hreflang links from the noindex landing page.
The steps below are what was run; reuse them for the next release with a new
revision and directory name. `main` also contains the three staff-login commits
that were already live, so this release changed only:

- the public campaign page `/lp/swap-free` (fa, en)
- `POST /api/leads` → new `leads` table (additive migration `0007_leads`)
- `/admin/leads` with an Excel export
- the new `exceljs` dependency

There is no new environment variable and no email change.

Do **not** use the in-place "Deploy procedure" above for this release.
`/opt/rocobroker-next/.next` is a symlink into
`/opt/rocobroker-releases/scc-staff-c38eca7/`, so a build in the checkout would
overwrite the live runtime and the rollback target. Build a separate release
directory and repoint the symlink, as the staff-login rollout did.

Run on the main website VPS, as root:

```bash
set -eu
# 0. Confirm the layout before changing anything
readlink -f /opt/rocobroker-next/.next     # expect /opt/rocobroker-releases/scc-staff-c38eca7/.next
runuser -u rocoweb -- git -C /opt/rocobroker-next rev-parse --short HEAD   # expect 19b55b0

# 1. Back up the content database
install -d -m 700 -o rocoweb -g rocoweb /home/rocoweb/backups/leads-c69a326
cd /opt/rocobroker-next
runuser -u rocoweb -- env CONTENT_BACKUP_DIR=/home/rocoweb/backups/leads-c69a326 PATH=/opt/rocobroker-node/bin:/usr/bin:/bin \
  node --env-file=.env.production -e \
  'require("node:child_process").execFileSync("bash",["scripts/backup-content-db.sh"],{stdio:"inherit"})'

# 2. Build the release in its own directory; the live site keeps running
R=/opt/rocobroker-releases/leads-a1f9029
install -d -o rocoweb -g rocoweb "$R"
runuser -u rocoweb -- git clone --quiet /opt/rocobroker-next "$R"
cd "$R"
runuser -u rocoweb -- git fetch --quiet "$(runuser -u rocoweb -- git -C /opt/rocobroker-next remote get-url origin)" main
runuser -u rocoweb -- git switch --detach a1f9029
runuser -u rocoweb -- ln -s /opt/rocobroker-next/.env.production .env.production
runuser -u rocoweb -- env PATH=/opt/rocobroker-node/bin:/usr/bin:/bin npm ci

# 3. Additive migration: creates only `leads` and the `lead_account_status` enum.
#    Safe while the current version is serving.
runuser -u rocoweb -- env PATH=/opt/rocobroker-node/bin:/usr/bin:/bin \
  node --env-file=.env.production node_modules/drizzle-kit/bin.cjs migrate

# Two page-generation workers (CIRCLE_NODE_TOTAL=3), capped in a scope. The
# default (cores - 1 = 7 workers) needs about 2.1 GB on top of the compiler and
# was OOM-killed in the 2.5 GB cap. Uncapped, it would compete with ClamAV,
# Chatwoot and MariaDB for the ~3 GB free on this host.
systemd-run --quiet --scope -p MemoryMax=2500M -p CPUQuota=400% nice -n 10 \
  runuser -u rocoweb -- env HOME=/home/rocoweb NEXT_TELEMETRY_DISABLED=1 CIRCLE_NODE_TOTAL=3 \
  PATH=/opt/rocobroker-node/bin:/usr/bin:/bin npm run build
runuser -u rocoweb -- cp -r .next/static .next/standalone/.next/static
runuser -u rocoweb -- cp -r public .next/standalone/public
runuser -u rocoweb -- ln -sfn /opt/rocobroker-next/.env.production .next/standalone/.env.production

# 3b. Before promoting, run the release privately on a spare loopback port and
#     test it (the page, /api/leads 400/403, a real insert, then delete the row):
#     systemd-run --unit=rocobroker-leads-preview --uid=rocoweb --gid=rocoweb \
#       -p WorkingDirectory=$R/.next/standalone -p MemoryMax=1G \
#       --setenv=NODE_ENV=production --setenv=PORT=3199 --setenv=HOSTNAME=127.0.0.1 \
#       /opt/rocobroker-node/bin/node server.js
#     ...then: systemctl stop rocobroker-leads-preview

# 4. Promote: repoint the runtime and restart only the app.
#    Don't stop pm2-rocoweb, and don't pass --update-env: the app's PM2
#    environment carries the staff-login settings.
ln -sfn "$R/.next" /opt/rocobroker-next/.next
cd /home/rocoweb
runuser -u rocoweb -- env \
  HOME=/home/rocoweb PM2_HOME=/home/rocoweb/.pm2 \
  PATH=/home/rocoweb/.local/bin:/opt/rocobroker-node/bin:/usr/bin:/bin \
  pm2 restart rocobroker-next
```

Verify:

```bash
for u in / /lp/swap-free /fa/lp/swap-free; do curl -s -o /dev/null -w "$u %{http_code}\n" https://rocobroker.com$u; done   # all 200
curl -s -o /dev/null -w "de %{http_code} -> %{redirect_url}\n" https://rocobroker.com/de/lp/swap-free                    # 307 -> /lp/swap-free
curl -s https://rocobroker.com/fa/lp/swap-free | grep -o '<meta name="robots"[^>]*>'                                 # noindex, nofollow
curl -s https://rocobroker.com/sitemap.xml | grep -c lp/swap-free                                                    # 0
curl -s -o /dev/null -w "leads %{http_code}\n" -X POST https://rocobroker.com/api/leads \
  -H 'Content-Type: application/json' -H 'Origin: https://rocobroker.com' -d '{}'                                    # 400 = route live
```

Then test end to end in a browser:

1. Submit the `/fa/lp/swap-free` form with the name `Deploy Test`.
2. Confirm the lead shows at `/admin/leads`.
3. Click **Export to Excel** and open the file.
4. Delete the test row, with `.env.production` loaded:
   `psql "$DATABASE_URL" -c "delete from leads where name = 'Deploy Test'"`.

A `503` from `/api/leads` means the database write failed. Check the
application log for `[leads] … outcome=failed code=…`. The migration not
having run gives code `42P01`.

Rollback: point the runtime back and restart only the app. Leave the additive
`leads` table in place, because the previous code never reads it.

```bash
ln -sfn /opt/rocobroker-releases/scc-staff-c38eca7/.next /opt/rocobroker-next/.next
cd /home/rocoweb
runuser -u rocoweb -- env \
  HOME=/home/rocoweb PM2_HOME=/home/rocoweb/.pm2 \
  PATH=/home/rocoweb/.local/bin:/opt/rocobroker-node/bin:/usr/bin:/bin \
  pm2 restart rocobroker-next
```

Verified on 2026-10-09:

- **Public pages:** `/`, `/fa`, `/lp/swap-free` and `/fa/lp/swap-free` return 200, and `/de/lp/swap-free` returns 307 to `/lp/swap-free`.
- **Search exclusion:** the landing page is noindex, has no canonical or hreflang links, and is absent from the sitemap.
- **Lead endpoint:** `/api/leads` returns 400 for an empty body and 403 for a cross-site request.
- **Export:** `/api/admin/leads/export` returns 401 without a session.
- **SCC sign-in:** returns 200.
- **Probe lead:** a real insert of a probe lead (Persian digits normalised), followed by a duplicate retry of the same submission ID (stored once), and then deletion. `leads` holds 0 rows.

A full end-to-end check through the browser and admin export is still to do
with a real staff login.
