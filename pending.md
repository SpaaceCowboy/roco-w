# Pending Work

Last updated: 2026-08-12 (Asia/Tehran)

Picking up from `currentstate.md`, which records how the deployment is put
together and why. This file is only what is left to do, in the order I would do
it. Deployed commit at the time of writing: `12cb39b`.

The site is serving over HTTPS at `https://next.rocobroker.com` through Apache.
WordPress still serves the production apex. Nothing below is required to keep
that working — item 1 is required before the site takes public traffic.

---

## 1. Cookie policy copy — blocking for public launch

The tawk.to widget loads for every visitor on every page **before** any
cookie-consent choice, and tawk.to sets its own visitor cookies (`__tawkuuid`
and friends) at that moment. It is the only third party on the site that runs
ungated.

The cookie policy text in `messages/*.json` still describes TradingView only, so
the site currently discloses less than it does. On a regulated brokerage serving
MENA and EU-adjacent markets that is the one item here with actual regulatory
exposure — everything else on this list is operational.

Two ways to resolve, and this is a business decision rather than a technical one:

- **Disclose it.** Add live chat to the cookie policy in all six locales. Fast,
  keeps the widget on every page.
- **Gate it.** Move the injection behind a consent category in `@/lib/consent`.
  The component comment at `src/components/ui/LiveChat/LiveChat.tsx:12` already
  describes this as the intended route if consent is ever required.

Whichever way, the translations need compliance sign-off, same as the risk
disclosure wording did.

---

## 2. PM2 log rotation

Small, and it removes a real risk before public traffic. PM2's log files grow
without bound, and this host also runs cPanel, Exim, Dovecot and WordPress —
filling the disk takes mail and Apache down with the site.

```bash
cd /home/rocoweb
E="HOME=/home/rocoweb PM2_HOME=/home/rocoweb/.pm2"
P="/home/rocoweb/.local/bin:/opt/rocobroker-node/bin:/usr/bin:/bin"

runuser -u rocoweb -- env $E PATH=$P pm2 install pm2-logrotate
runuser -u rocoweb -- env $E PATH=$P pm2 set pm2-logrotate:max_size 10M
runuser -u rocoweb -- env $E PATH=$P pm2 set pm2-logrotate:retain 14
```

Check afterwards that `pm2 list` still shows `rocobroker-next` online, and that
the module survives `systemctl restart pm2-rocoweb`.

---

## 3. Apex cutover — `rocobroker.com` to Next.js

The riskiest step left. Three things have to be right *together*; getting any
one wrong breaks something visitors or staff depend on.

### 3a. The proxy must be conditioned on `Host`

The apex vhost's `ServerAlias` carries `mail.`, `webmail.`, `cpanel.`,
`webdisk.`, `autoconfig.`, `autodiscover.`, `cpcalendars.` and `cpcontacts.`
A blanket `ProxyPass /` there sends webmail and cPanel logins to Next.js and
locks you out of mail administration.

Proxy only when the request is actually for the website:

```apache
ProxyPreserveHost On
ProxyPass /.well-known !
<If "%{HTTP_HOST} =~ /^(www\.)?rocobroker\.com$/i">
  ProxyPass / http://127.0.0.1:3100/
  ProxyPassReverse / http://127.0.0.1:3100/
</If>
```

Verify **before** reloading, and again after, that `webmail.rocobroker.com` and
`cpanel.rocobroker.com` still serve cPanel and not the Next.js site.

### 3b. Port 80 should redirect, not proxy

On the apex, port 80 should send everything to HTTPS while keeping
`/.well-known` local for ACME. That leaves the app unreachable over plain HTTP,
which matters because header-based trust (see item 4) is only sound if the app
cannot be reached except through the proxy chain.

### 3c. The switch has to be atomic

`src/config/legacyRedirects.mjs` assumes the old WordPress URLs stop being
served by WordPress at the same moment Next.js starts serving them. A window
where both are live means duplicate content and redirect chains against a domain
with existing rankings — the whole reason `localePrefix: "as-needed"` was chosen
in the first place.

Plan the WordPress retirement in the same change, not afterwards. Mail services
must not be touched by it.

### 3d. Order of operations

1. Add the `Host`-conditional include to the apex userdata directories
   (`std` and `ssl`, user `rocobrok`).
2. `/scripts/ensure_vhost_includes --user=rocobrok`
3. `apachectl configtest` — reload **only** on `Syntax OK`.
4. `systemctl reload httpd`
5. Verify in this order: apex serves Next.js, `www.` serves Next.js, webmail
   still serves cPanel, `/metatrader-5` redirects to `/platforms/metatrader-5`,
   contact form delivers.
6. Then orange-cloud the apex in Cloudflare and do item 4.

Keep `next.rocobroker.com` working throughout as a fallback and comparison. Only
remove it once the apex has been stable for a while.

---

## 4. Origin lockdown — after the apex is orange-clouded

Until this is done, `cf-connecting-ip` is forgeable by anyone who reaches
`69.167.169.231` directly, so the per-IP contact rate limit is a brake on casual
abuse rather than a boundary. `src/lib/rateLimit.ts` says so in its comment.

```bash
csf -a $(curl -s https://www.cloudflare.com/ips-v4 | tr '\n' ' ')
```

Then in `/etc/csf/csf.conf` remove `443` from `TCP_IN`.

**Leave port 80 open.** Let's Encrypt validates over port 80 from its own IP
ranges, not Cloudflare's. Closing it breaks AutoSSL renewals for every domain on
this host, including the mail hostnames — and you would not find out for about
sixty days.

**Never touch the SSH port**, and keep a second SSH session open while applying
the change.

---

## 5. Expired origin certificates — unrelated, but outstanding

`bo.rocobroker.com`, `my.rocobroker.com` and `webtrading.rocobroker.com` have
self-signed origin certificates that expired **2026-05-16**. AutoSSL cannot fix
them: they resolve to Cloudflare (`172.67.190.36` and similar) rather than to
this host, so HTTP validation fails every run.

Harmless while the Cloudflare SSL/TLS mode is Flexible or Full. If anyone ever
switches it to **Full (strict)**, the client portal and the webtrader break
immediately — the two subdomains a broker least wants down.

Check the current SSL/TLS mode in Cloudflare, and if these origins should have
valid certificates, Cloudflare Origin CA certificates are the usual answer for
orange-clouded hosts.

Also note the apex certificate is reported "Incomplete" because `cpanel.`,
`webmail.`, `autodiscover.` and friends have no public DNS in Cloudflare.
Harmless for the website; it means webmail-over-HTTPS by hostname has no valid
certificate.

---

## 6. Small tidy-ups

- `/opt/rocobroker-next/.env.production` still carries the unused
  `RESEND_API_KEY` line from when contact mail went through Resend. Harmless,
  but it invites someone to think it matters.
- Confirm `CONTACT_EMAIL_TO` points at a mailbox somebody actually reads. A
  wrong-but-valid address gives a `200` and a lost enquiry, which looks healthier
  than a failure.
