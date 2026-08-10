# Current Deployment State

Last updated: 2026-08-10 (Asia/Tehran)

This is the handoff point for the RocoBroker Next.js deployment. It records
what is running, what has deliberately not been changed, and the first checks
to perform when work resumes.

## Source state

- Repository: `git@github.com:SpaaceCowboy/roco-w.git`
- Branch: `main`
- Deployed compatibility commit: `5b60573a083264a9233559fe5ae6cc569b902980`
- Commit title: `fix: support AlmaLinux production builds`
- The compatibility commit is pushed to GitHub and pulled on the VPS.
- All implementation and deployment-documentation changes are recorded in
  `changelog.md`.
- The production build uses Webpack so Next.js can fall back to its SWC WASM
  compiler on AlmaLinux 8/glibc 2.28.
- Next.js standalone output is enabled.

## Existing server services left untouched

- VPS: Liquid Web AlmaLinux 8.10 at `69.167.169.231`
- Hostname: `host1.rocobroker.com`
- Apache (`httpd`), Exim, and Dovecot remain active.
- The existing cPanel/WHM installation, email service, DNS, SSL, and WordPress
  virtual host have not been reconfigured or removed.
- The existing cPanel Node.js 16 installation under
  `/opt/cpanel/ea-nodejs16` has not been modified.
- No public Apache reverse proxy or production-domain cutover has been made.

## Isolated Next.js runtime

- Service account: `rocoweb`
- Application checkout: `/opt/rocobroker-next`
- Dedicated Node.js runtime: `/opt/node-v22.23.2-linux-x64`
- Stable runtime symlink: `/opt/rocobroker-node`
- Node.js version: `v22.23.2`
- User-local PM2 installation: `/home/rocoweb/.local`
- PM2 home: `/home/rocoweb/.pm2`
- PM2 version: `7.0.3`
- PM2 must be invoked with `HOME`, `PM2_HOME`, and `PATH` set explicitly, and
  from a directory accessible to `rocoweb` (for example `/home/rocoweb`).
- Git operations in the application checkout must run as `rocoweb`; running
  them as root triggers Git's dubious-ownership protection.

## Build and process state

- `npm ci` completed successfully.
- The production standalone build completed after the AlmaLinux compatibility
  fix.
- Static assets were prepared for the standalone bundle under
  `/opt/rocobroker-next/.next/standalone`.
- PM2 application name: `rocobroker-next`
- PM2 process ID at launch: `0`
- PM2 mode: `fork`, one instance
- PM2 reported the application as `online` with zero restarts.
- The application is bound privately to `127.0.0.1:3100` with
  `NODE_ENV=production`.
- It is not directly exposed by CSF or bound to a public network interface.

## Last observed HTTP response

The following command reached the application:

```bash
curl -I http://127.0.0.1:3100/
```

It returned `HTTP/1.1 307 Temporary Redirect`, included the expected security
headers and locale alternate links, set `NEXT_LOCALE=en`, internally rewrote
to `/en`, and returned `Location: /`.

This may be HEAD-only locale canonicalization, but it has not yet been proven
safe. Do not configure Apache or switch the production domain until a normal
GET request confirms there is no redirect loop.

## First task when resuming

Run these read-only checks on the VPS:

```bash
curl -sS -o /dev/null \
  -w 'root: %{http_code} redirect=%{redirect_url}\n' \
  http://127.0.0.1:3100/

curl -sS -o /dev/null \
  -w 'english: %{http_code} redirect=%{redirect_url}\n' \
  http://127.0.0.1:3100/en

curl -sS -L --max-redirs 5 -o /dev/null \
  -w 'followed: %{http_code} final=%{url_effective}\n' \
  http://127.0.0.1:3100/

runuser -u rocoweb -- env \
  HOME="/home/rocoweb" \
  PM2_HOME="/home/rocoweb/.pm2" \
  PATH="/home/rocoweb/.local/bin:/opt/rocobroker-node/bin:/usr/bin:/bin" \
  pm2 logs rocobroker-next --lines 30 --nostream
```

Review these results before proceeding. If normal GET requests work, the next
stages are:

1. Save the PM2 process list and configure boot persistence for the `rocoweb`
   PM2 home.
2. Test the site from the operator's computer through an SSH local tunnel.
3. Plan and verify the Apache reverse-proxy virtual-host change separately.
4. Only after full verification, perform the intentional domain cutover and
   later retire the old WordPress site without touching mail services.

## Safe process controls

Check the application:

```bash
cd /home/rocoweb
runuser -u rocoweb -- env \
  HOME="/home/rocoweb" \
  PM2_HOME="/home/rocoweb/.pm2" \
  PATH="/home/rocoweb/.local/bin:/opt/rocobroker-node/bin:/usr/bin:/bin" \
  pm2 status
```

If the Next.js process must be stopped, this affects only the new private app
and does not stop Apache, WordPress, cPanel, Exim, or Dovecot:

```bash
cd /home/rocoweb
runuser -u rocoweb -- env \
  HOME="/home/rocoweb" \
  PM2_HOME="/home/rocoweb/.pm2" \
  PATH="/home/rocoweb/.local/bin:/opt/rocobroker-node/bin:/usr/bin:/bin" \
  pm2 stop rocobroker-next
```
