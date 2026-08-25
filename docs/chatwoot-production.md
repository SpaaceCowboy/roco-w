# Chatwoot production operations

RocoBroker uses the self-hosted Chatwoot Community Edition at
`https://support.rocobroker.com`. Chatwoot runs under Docker Compose in
`/opt/chatwoot`; cPanel Apache proxies the public hostname to
`127.0.0.1:3001`.

## Website integration

Create a Website Inbox in Chatwoot, then configure the website deployment:

```dotenv
NEXT_PUBLIC_LIVE_CHAT_PROVIDER=chatwoot
NEXT_PUBLIC_CHATWOOT_BASE_URL=https://support.rocobroker.com
NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN=<public website inbox token>
```

The token is a public widget identifier, not a Chatwoot API or administrator
secret. Rebuild the website after changing any `NEXT_PUBLIC_*` value.

## Security baseline

After creating the administrator, `/opt/chatwoot/.env` must contain:

```dotenv
ENABLE_ACCOUNT_SIGNUP=false
```

Protect the file with `root:root` ownership and mode `0600`. PostgreSQL, Redis,
and Rails must not have publicly bound ports. Rails is intentionally published
only as `127.0.0.1:3001:3000` for Apache.

CSF must allow Docker's bridge and outbound TCP 3000. At deployment time the
bridge was generated dynamically, so do not run `docker compose down` until a
stable bridge name has been configured in both Compose and `/etc/csf/csf.conf`.

## Routine checks

```bash
cd /opt/chatwoot
sudo docker compose ps
curl -fsSI https://support.rocobroker.com
free -h
df -h /
sudo docker stats --no-stream
```

Test agent invitations and password resets after initial SMTP configuration and
after mail-provider changes. Inspect failures with:

```bash
sudo docker compose logs --since=10m rails
sudo docker compose logs --since=10m sidekiq
```

## Backup scope

Keep encrypted off-VPS copies of all of the following:

- a PostgreSQL custom-format dump of the `chatwoot` database;
- the Chatwoot `storage_data` volume, unless attachments use S3-compatible
  object storage;
- `/opt/chatwoot/.env` and `/opt/chatwoot/docker-compose.yaml`;
- the cPanel Apache userdata directories for `support.rocobroker.com`;
- `/etc/csf/csf.conf` and any CSF post-hook used for Docker.

A backup is not considered valid until a database dump can be listed with
`pg_restore --list` and a restore drill has been completed on disposable
infrastructure. Retention must include daily, weekly, and monthly recovery
points, with at least one copy outside this VPS.

## Upgrades

Use a versioned Community Edition image (`vX.Y.Z-ce`), not `latest-ce`. Read the
release notes and take a verified backup before changing it. Then run:

```bash
cd /opt/chatwoot
sudo docker compose pull
sudo docker compose run --rm rails bundle exec rails db:chatwoot_prepare
sudo docker compose up -d
sudo docker compose ps
curl -fsSI https://support.rocobroker.com
```

Never use `docker compose down -v`; it deletes persistent data volumes.

## Recovery verification

During a maintenance window, reboot the VPS and verify Docker, all four Chatwoot
services, Apache, HTTPS, SMTP, and a real browser conversation. Confirm the CSF
Docker bridge configuration still matches the active Compose bridge after boot.

## Separate certificate findings

The initial AutoSSL run found defective or expired certificates for
`bo.rocobroker.com`, `my.rocobroker.com`, and `webtrading.rocobroker.com`.
These are separate from Chatwoot and require DNS/origin ownership review before
renewing or removing their cPanel virtual hosts.
