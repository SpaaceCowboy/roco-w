# Update the existing VPS bot installation

Repository records document an existing installation at `/opt/roco-chatwoot-agent`,
running as `rocobot` under `roco-chatwoot-agent.service`. The source checkout is
`/opt/rocobroker-next`, owned by `rocoweb`; Node is at `/opt/rocobroker-node`.
The Apache `/agent-bot/` proxy is already installed. These are repository records,
not a live inspection of the VPS. Confirm the prerequisites below first.

Run in a root **Bash** shell on the VPS. Substitute the full pushed commit SHA.
The staging build happens before stopping the running bot. Git operations run
as the checkout owner. No website build, PM2 restart, Apache reload, or Chatwoot
container rebuild is needed for this bot-only update.

```bash
set -euo pipefail
bot_release=REPLACE_WITH_PUSHED_COMMIT_SHA
bot_checkout=/opt/rocobroker-next
bot_live=/opt/roco-chatwoot-agent
bot_path=/opt/rocobroker-node/bin:/usr/bin:/bin

id rocoweb
id rocobot
test -x /opt/rocobroker-node/bin/node
test -d "$bot_checkout/.git"
test -d "$bot_live/dist"
test -d "$bot_live/knowledge"
test -d "$bot_live/node_modules"
test -f "$bot_live/package.json"
test -f "$bot_live/package-lock.json"
test -f /etc/systemd/system/roco-chatwoot-agent.service
systemctl is-active roco-chatwoot-agent.service
curl -fsS http://127.0.0.1:3200/health

# Stop here if tracked local checkout changes are reported. Preserve them.
test -z "$(runuser -u rocoweb -- git -C "$bot_checkout" status --porcelain --untracked-files=no)"
runuser -u rocoweb -- git -C "$bot_checkout" pull --ff-only origin main
runuser -u rocoweb -- git -C "$bot_checkout" merge-base --is-ancestor "$bot_release" origin/main

bot_stage=$(mktemp -d /opt/roco-chatwoot-build.XXXXXX)
runuser -u rocoweb -- git -C "$bot_checkout" archive "$bot_release:roco-chatwoot-agent" |
  tar -x -C "$bot_stage"
chown -R rocobot:rocobot "$bot_stage"
cd "$bot_stage"
runuser -u rocobot -- env PATH="$bot_path" npm ci --include=dev
runuser -u rocobot -- env PATH="$bot_path" npm run typecheck
# npm test builds dist before running the tests; no second build is required.
runuser -u rocobot -- env PATH="$bot_path" npm test
printf '%s\n' "$bot_release" > "$bot_stage/DEPLOYED_COMMIT"

bot_backup=/opt/roco-chatwoot-backups/$(date -u +%Y%m%dT%H%M%SZ)
install -d -m 700 "$bot_backup"
cp -a /etc/systemd/system/roco-chatwoot-agent.service "$bot_backup/service.unit"

systemctl stop roco-chatwoot-agent.service
# Default persistent-state directory. Do not delete or replace the live state.
if test -d /var/lib/rocobot; then
  cp -a /var/lib/rocobot "$bot_backup/state-before-update"
fi

# Retain each old release component and replace it with the tested component.
# The environment file and any other local files remain in place.
for bot_entry in dist knowledge node_modules src test deploy package.json package-lock.json tsconfig.json README.md DEPLOYED_COMMIT; do
  if test -e "$bot_live/$bot_entry"; then
    mv "$bot_live/$bot_entry" "$bot_backup/$bot_entry"
  fi
  mv "$bot_stage/$bot_entry" "$bot_live/$bot_entry"
done
install -m 644 "$bot_live/deploy/roco-chatwoot-agent.service" /etc/systemd/system/roco-chatwoot-agent.service
systemctl daemon-reload
systemctl start roco-chatwoot-agent.service
systemctl is-active roco-chatwoot-agent.service
curl --retry 10 --retry-connrefused --retry-delay 1 --max-time 5 -fsS http://127.0.0.1:3200/health
curl --max-time 15 -fsS https://support.rocobroker.com/agent-bot/health
printf '\nRelease: %s\nRollback directory: %s\n' "$bot_release" "$bot_backup"
printf 'Build staging retained at: %s\n' "$bot_stage"
```

If `BOT_STATE_FILE` was customized to a location outside `/var/lib/rocobot`, take
a restricted backup of that location after stopping the service too. Keep the
existing environment and live state; do not copy `.env.example` over `.env`.
Do not run the staging server against production or run two workers concurrently.
If activation fails midway, keep the bot stopped, preserve both release bundles,
and restore the moved components before starting it again.

## Verify with staffed support

The health response should contain `bot_availability` with `Asia/Tehran`,
`23:00`, `08:00`, and `message_handoff`. `available` is false during the day;
`ok` should still be true. Confirm the release marker:

```bash
cat /opt/roco-chatwoot-agent/DEPLOYED_COMMIT
systemctl status roco-chatwoot-agent.service --no-pager
journalctl -u roco-chatwoot-agent.service --since '10 minutes ago' --no-pager
```

During 08:00–23:00 Tehran time, send a new Persian message and verify one offline
notice and status `open` in Chatwoot. During 23:00–08:00, verify a general Persian
question is answered, an ambiguous general question receives at most one
clarification, and a personal withdrawal issue or explicit human request is
transferred. An Arabic question should receive English. A human takeover should
stop later AI replies. Check factual accuracy and RTL display with staff present.
Reject rollout acceptance if any sampled answer is unsafe or fabricated.

Inspect `failed_jobs`, `handoff_failures`, `language_retries` and
`retry_exhaustions`; health alone does not prove vendor or response quality.
The event counters reset on restart; terminal jobs remain on disk.

## Roll back

The old worker does not understand the new terminal phases. Do not blindly feed
it the new queue or restore the pre-update snapshot: that could repeat completed
work. First pause the bot in Chatwoot's inbox configuration and have support
finish any queued or failed cases. Keep copies of all job records for review.
The automatic procedure below requires the live state to be an empty JSON array;
if it is not, stop and reconcile the cases manually rather than deleting them.

Run in a root Bash shell; set the rollback directory printed by the update.
If `BOT_STATE_FILE` was customized, use that actual path for the emptiness check.

```bash
set -euo pipefail
bot_backup=/opt/roco-chatwoot-backups/REPLACE_WITH_BACKUP_TIMESTAMP
bot_live=/opt/roco-chatwoot-agent
test -d "$bot_backup/dist"
test -d "$bot_backup/knowledge"
test -d "$bot_backup/node_modules"
test -f "$bot_backup/service.unit"
systemctl stop roco-chatwoot-agent.service
/opt/rocobroker-node/bin/node --input-type=module -e '
  import { readFileSync } from "node:fs";
  const records = JSON.parse(readFileSync("/var/lib/rocobot/jobs.json", "utf8"));
  if (!Array.isArray(records) || records.length !== 0) {
    throw new Error("Rollback blocked: reconcile remaining jobs with support first");
  }
'
bot_failed=/opt/roco-chatwoot-backups/failed-$(date -u +%Y%m%dT%H%M%SZ)
install -d -m 700 "$bot_failed"
cp -a /var/lib/rocobot "$bot_failed/state-before-rollback"
for bot_entry in dist knowledge node_modules src test deploy package.json package-lock.json tsconfig.json README.md DEPLOYED_COMMIT; do
  if test -e "$bot_live/$bot_entry"; then
    mv "$bot_live/$bot_entry" "$bot_failed/$bot_entry"
  fi
  if test -e "$bot_backup/$bot_entry"; then
    cp -a "$bot_backup/$bot_entry" "$bot_live/$bot_entry"
  fi
done
install -m 644 "$bot_backup/service.unit" /etc/systemd/system/roco-chatwoot-agent.service
systemctl daemon-reload
systemctl start roco-chatwoot-agent.service
curl --retry 10 --retry-connrefused --retry-delay 1 --max-time 5 -fsS http://127.0.0.1:3200/health
```

Reattach the bot in Chatwoot only after confirming the previous release behaves
correctly with staffed support. Keep the new release bundle and state snapshots.
