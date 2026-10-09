# SCC staff login: main website VPS handoff

This release keeps the website and SEO services on their existing VPSs. The initial handoff kept main-VPS work with the operator. On 2026-10-09 the user explicitly authorized the agent to complete the website deployment too, with all unrelated services kept untouched. The commands below remain available for operator deployment and rollback.

Recorded website setup (from `currentstate.md`, last updated 2026-09-18): checkout `/opt/rocobroker-next`, account `rocoweb`, Node `/opt/rocobroker-node/bin`, application `rocobroker-next`, systemd service `pm2-rocoweb`. Confirm those still match before running these commands. The deployment below follows the recorded stop/build/start procedure and needs a maintenance window.

## 1. Deploy the code and additive migration; keep Google login initially

Run on the **main website VPS**, as root. Keep the current `ADMIN_AUTH_BASE_URL` and Google configuration. Do not enable `ADMIN_AUTH_MODE=staff` yet.

```bash
set -eu
cd /opt/rocobroker-next
runuser -u rocoweb -- git status --short
# If the checkout has unrelated changes, stop and preserve them before switching revisions.
install -d -m 700 -o rocoweb -g rocoweb /home/rocoweb/backups/scc-staff
runuser -u rocoweb -- env CONTENT_BACKUP_DIR=/home/rocoweb/backups/scc-staff PATH=/opt/rocobroker-node/bin:/usr/bin:/bin \
  node --env-file=.env.production -e \
  'require("node:child_process").execFileSync("bash",["scripts/backup-content-db.sh"],{stdio:"inherit"})'
runuser -u rocoweb -- git rev-parse HEAD > /root/rocobroker-pre-staff-revision.txt
systemctl stop pm2-rocoweb
runuser -u rocoweb -- git fetch origin
runuser -u rocoweb -- git switch --detach origin/codex/scc-shared-staff-login
runuser -u rocoweb -- env PATH=/opt/rocobroker-node/bin:/usr/bin:/bin npm ci
runuser -u rocoweb -- env PATH=/opt/rocobroker-node/bin:/usr/bin:/bin \
  node --env-file=.env.production node_modules/drizzle-kit/bin.cjs migrate
runuser -u rocoweb -- env PATH=/opt/rocobroker-node/bin:/usr/bin:/bin npm run build
runuser -u rocoweb -- cp -r .next/static .next/standalone/.next/static
runuser -u rocoweb -- cp -r public .next/standalone/public
runuser -u rocoweb -- ln -sfn /opt/rocobroker-next/.env.production .next/standalone/.env.production
systemctl start pm2-rocoweb
curl --fail --silent --show-error -o /dev/null https://rocobroker.com/
curl --fail --silent --show-error -o /dev/null https://rocobroker.com/admin/sign-in
```

If a command fails after stopping the service, follow rollback below before leaving the host. Migration `0006_shared_staff_login` only adds the staff actor link, per-session MFA timestamp, MFA-enabled flag, and authenticator table. It does not alter articles, revisions, publication state, or existing identities. Keep the existing `ADMIN_AUTH_SECRET`; changing it also affects previews and encrypted authenticator data.

## 2. Create the staff account and shared service key

Create a new key file without printing its contents or putting the key in command arguments:

```bash
install -d -m 700 -o rocoweb -g rocoweb /home/rocoweb/.config/roco-staff
runuser -u rocoweb -- sh -c \
  'umask 077; test ! -e /home/rocoweb/.config/roco-staff/service-key && openssl rand -hex 32 > /home/rocoweb/.config/roco-staff/service-key'
```

If the file already exists, reuse it; do not regenerate it halfway through the cutover. Securely transfer this file to the SEO VPS as `/opt/roco-seo/secrets/staff_auth_service_secret`, initially root-owned mode `0600`. Do not paste it into chat. Then, on the SEO VPS, run the operator helper:

```bash
/opt/roco-seo/app/scripts/operations/prepare-staff-key.sh
```

The helper produces a root-readable Nginx include and assigns the individual application key file to UID/GID 1000 with mode `0400`. Keep `/opt/roco-seo/secrets` root-owned mode `0700`. It refuses to overwrite an existing proxy include.

The initial account must link to the **existing human SEO actor**, preserving its permissions and audit history. Obtain that UUID from the authorized SEO operator; do not use a SERVICE actor. Substitute both values below, then run on the main VPS:

```bash
cd /opt/rocobroker-next
staff_email='REPLACE_WITH_YOUR_ADMIN_EMAIL'
seo_actor_id='REPLACE_WITH_THE_EXISTING_HUMAN_ACTOR_UUID'
runuser -u rocoweb -- env PATH=/opt/rocobroker-node/bin:/usr/bin:/bin \
  node --env-file=.env.production --import tsx scripts/staff-user.ts create \
  --email "$staff_email" --role admin --seo-actor-id "$seo_actor_id"
```

The script prompts twice for a password without echoing it. Use 12–128 characters. Existing Google identities retain their IDs and audit history; adding password credentials revokes their old sessions. Re-running `create` on an account that already has a password fails rather than silently replacing it.

Add `https://scc.rocobroker.com` to the existing R2 bucket CORS allowed origins for signed uploads. Keep the existing origins, methods and headers. Do not use a wildcard.

## 3. Coordinate the login cutover

Once both code releases and the transferred key are ready, edit the main VPS's protected `/opt/rocobroker-next/.env.production` yourself. Set exactly:

```dotenv
ADMIN_AUTH_MODE=staff
ADMIN_AUTH_BASE_URL=https://scc.rocobroker.com
ADMIN_STAFF_SERVICE_SECRET_FILE=/home/rocoweb/.config/roco-staff/service-key
```

Do not also set `ADMIN_STAFF_SERVICE_SECRET`. Keep the existing database, media, preview, scheduled-publication, and `ADMIN_AUTH_SECRET` settings. Keep the Google values available for rollback; staff mode disables that provider.

Apache must pass `X-Roco-Proxy-Key`, `X-Forwarded-Host`, and `X-Roco-Client-IP` from SCC through to the application. Its default proxy behavior appends the apex host to `X-Forwarded-Host`; the application accepts the SCC-pinned first value only after validating the proxy credential, and uses its configured staff origin for CSRF checks. Keep `ProxyPreserveHost On` and the existing HTTPS scheme header. No Apache route changes are otherwise needed.

Rebuild/restart using the recorded standalone procedure:

```bash
cd /opt/rocobroker-next
systemctl stop pm2-rocoweb
runuser -u rocoweb -- env PATH=/opt/rocobroker-node/bin:/usr/bin:/bin npm run build
runuser -u rocoweb -- cp -r .next/static .next/standalone/.next/static
runuser -u rocoweb -- cp -r public .next/standalone/public
runuser -u rocoweb -- ln -sfn /opt/rocobroker-next/.env.production .next/standalone/.env.production
systemctl start pm2-rocoweb
```

Tell the agent the main side is ready. The SEO release must then enable `compose.staff.yaml`, build with `SEO_ASSET_PREFIX=/seo-static`, and recreate only API/dashboard/proxy. The SEO worker, queues, schedules and database stay running. Switching the dashboard release invalidates the old in-memory SCC sessions once; refresh old tabs.

## 4. Verify before considering the cutover finished

1. Open `https://scc.rocobroker.com/admin/sign-in`. Sign in with the new email/password, enter the manual setup key in an authenticator, save the recovery codes, and verify a code. Password-only access must fail for both dashboards.
2. Switch between Blog content admin and SEO Control Center without another login. Confirm the original SEO permissions and audit actor are preserved.
3. In an isolated draft, check English/Persian editing, autosave, conflict handling, category selection, media upload and preview. Confirm preview and public links still point to `rocobroker.com`.
4. Verify normal publication and the scheduled timer using the existing publication runbook. Scheduled publication remains on the main website endpoint; it is not exposed through SCC.
5. Verify SEO reads and authorized operations, and confirm workers and schedules continue running. This release adds no website-write adapter to SEO.
6. Sign out from either dashboard. Both protected interfaces must require login again. Confirm Google login, credential-based SCC browser login and public signup cannot be used in staff mode.
7. Check the public English/Persian site, blog, RSS, sitemap and contact configuration. A contact submission sends a real email; use your existing approved smoke procedure.

Use existing safe logs for status/latency/correlation IDs. Do not inspect cookies, keys, request bodies or a full `nginx -T` dump. Authenticated pages/APIs must not be cached by an upstream CDN.

## Recovery and rollback

See [Staff account management](staff-account-management.md) for ready-to-run password changes, new-user creation, authenticator recovery and account disabling.

Password recovery and MFA reset are terminal-only. On the main VPS:

```bash
cd /opt/rocobroker-next
staff_email='REPLACE_WITH_YOUR_ADMIN_EMAIL'
runuser -u rocoweb -- env PATH=/opt/rocobroker-node/bin:/usr/bin:/bin \
  node --env-file=.env.production --import tsx scripts/staff-user.ts reset-password --email "$staff_email"
# For a lost authenticator AND exhausted recovery codes, use reset-mfa instead.
# To revoke access entirely, use disable instead.
```

These commands revoke existing sessions and pending sign-in challenges. Password reset preserves the authenticator. MFA reset invalidates the old authenticator/recovery codes and forces setup before either dashboard becomes available.

For application rollback, restore `ADMIN_AUTH_MODE=google` and the previous apex `ADMIN_AUTH_BASE_URL` in the protected configuration, then ask the SEO operator to disable its staff overlay and restore its previous image. Restore the recorded website revision and repeat the install/build/static-copy/env-symlink/start sequence above. Do not reverse or drop the additive migration, delete authentication data, rotate secrets, restore the whole database, or stop the SEO worker merely to roll back this interface change. The new code can also remain deployed in Google mode.

## Verified live rollout — 2026-10-09

The operator explicitly authorized agent access to both VPSs. Backups were taken before the additive migration. The website was built in a separate release directory with memory/CPU limits, verified privately on loopback, and promoted without stopping Apache, mail, cPanel, PostgreSQL, the Chatwoot agent, or the PM2 daemon. The deployment restarted only `rocobroker-next`; SCC recreated only API/dashboard/proxy. Its worker and database kept running.

Production website revision: `19b55b0`. Active runtime link: `/opt/rocobroker-next/.next` -> `/opt/rocobroker-releases/scc-staff-c38eca7/.next`. Previous runtime: `/opt/rocobroker-next/.next-before-scc-staff-20261009`. Configuration/source-state backups: protected `/root/roco-staff-20261009`; database backup: protected `/home/rocoweb/backups/scc-staff`. No credential values or personal account data are recorded here.

The website's PM2 application explicitly persists the three staff settings in its environment. Therefore rollback must update that named application's environment too, not merely restore `.env.production`. After restoring the protected configuration and prior runtime link/revision, restart through the existing daemon with `ADMIN_AUTH_MODE=google`, the previous `ADMIN_AUTH_BASE_URL`, and `--update-env`, then save the PM2 process list. Do not stop the whole PM2 service or remove the additive migration. Coordinate disabling the SCC staff overlay and restoring its recorded prior image.

The existing administrator was given new password credentials without replacing its identity or reusing the SSH password. It must enroll its own authenticator at first login. Live verification used separate temporary editor accounts, never published a post, and disabled those accounts afterward. Their audit records are intentionally retained. Real upload verification confirmed the operator's CORS origin addition.
