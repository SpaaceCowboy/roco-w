# ROCO Chatwoot AgentBot

A standalone, guarded AI support service for ROCO's self-hosted Chatwoot. It is
separate from both the website and Chatwoot application.

## Behavior

1. Verify signed, recent Chatwoot webhooks; accept public incoming contact
   messages only for the configured account/inbox.
2. Persist identifiers and processing state before acknowledging receipt. Jobs
   are serialized per conversation, including retry delays. Customer and model
   text is never stored in the local job file.
3. Read conversation status and recent message history from the AgentBot-authorized conversation detail. Build context through
   the triggering message exactly once, excluding private and future messages.
4. Resolve explicit language preferences before current-message evidence; use
   recent customer history for ambiguous replies. Persian and Arabic are
   distinguished by vocabulary as well as script. Arabic customers receive English.
5. Route explicit human requests and high-risk personal issues directly to
   support. General FAQs use approved knowledge; vague general requests may
   receive one clarification. Its Chatwoot marker survives process restarts.
6. Validate action/reason combinations, exact knowledge excerpts, approved links,
   confidence and response language. Allow one language correction before handoff.
  The model output budget is 1200 tokens to accommodate Persian replies and
  internal evidence; customer-visible text stays limited to 1200 characters.
7. Recheck human ownership before publishing. Save handoff intent, set status to
   `open` and read it back before confirming transfer to the customer. Recovery
   reconciles reply delivery separately from status completion.

The bot cannot access trading passwords, portal credentials, wallets or payment
instruments. Keep those capabilities outside this service.

## Bot answering hours

`knowledge/availability.json` configures daily answering hours: **23:00–08:00,
Asia/Tehran**, every day. The start is inclusive; the end is exclusive. This
uses the configured IANA timezone independently of the VPS timezone. Invalid
configuration prevents startup instead of silently enabling all-day answers.

From 08:00–23:00, new pending conversations bypass the model and enter the human
support queue (`open`). After confirming the transfer, the bot sends a brief
localized offline notice and handoff confirmation. This does not assert that
an agent is online or promise a response time. Existing human-owned conversations
are left to support. The service stays running and accepts webhooks all day.

Outside-hours routing is saved with the job before webhook acknowledgement,
so delayed work and restarts cannot turn a daytime support request into a model
answer at night. The clock is also checked before publishing, including requests
crossing the 08:00 cutoff. Unfinished transfers continue with bounded retries.
If a delayed transfer completes after the bot opens, its confirmation omits the
now-inaccurate offline notice. During answering hours, general questions and
one clarification remain available; safety and explicit-human handoffs remain.

To change hours, edit this non-secret JSON file, deploy it with the bot and
restart `roco-chatwoot-agent.service`. Keep `outsideHours: "message_handoff"`
for the selected behavior. `/health` exposes `bot_availability`, including the
current answering-window state; the overall queue health remains available
outside answering hours. This feature requires no extra dependency or scheduler.

## Local setup

Requirements: Node.js 22 or newer.

```bash
cp .env.example .env
npm install
npm test
npm run dev
```

Fill every blank secret in `.env`. Never commit `.env`.

Health check:

```bash
curl -fsS http://127.0.0.1:3200/health
```

## Required Chatwoot values

- `CHATWOOT_AGENT_BOT_TOKEN`: the AgentBot API access token. It authorizes the
  bot to read the conversation, post a reply and open it for human support.
- `CHATWOOT_WEBHOOK_SECRET`: the signing secret shown for the AgentBot webhook.
  This is not the public website inbox token.
- `CHATWOOT_ACCOUNT_ID` and `CHATWOOT_INBOX_ID`: both are currently `1` for the
  ROCO website inbox.

The public widget token (`vPK...`) must never be used as either server secret.

## Chatwoot configuration

After the service is publicly reachable:

1. Open Chatwoot **Settings → Bots → Add bot**.
2. Name it `ROCO AI Support`.
3. Use this outgoing webhook URL:

   ```text
   https://support.rocobroker.com/agent-bot/webhooks/chatwoot
   ```

4. Copy the generated API access token and webhook signing secret into `.env`.
5. Open **Settings → Inboxes → Website inbox → Configuration**.
6. Under **Bot Configuration**, select `ROCO AI Support` and save.
7. Start with staff online and send test questions for each case below.

Expected test matrix:

- “What is a Lion account?” → answered by the bot.
- “How does the seven-day swap-free rule work?” → answered by the bot.
- “My withdrawal is pending” → message plus human handoff.
- “Tell me what leverage I should use” → human handoff.
- “I want a person” → immediate human handoff without a model request.
- An agent reply → ignored by the bot; no loop.

## Production installation

For the already installed VPS service, use [the update and rollback procedure](deploy/UPDATE.md). The installation commands below are for a new installation.

This example keeps the process private on `127.0.0.1:3200` and exposes only a
path through the existing Apache HTTPS vhost.

```bash
useradd --system --home-dir /opt/roco-chatwoot-agent --shell /sbin/nologin rocobot
mkdir -p /opt/roco-chatwoot-agent
```

Copy the project there, then:

```bash
cd /opt/roco-chatwoot-agent
cp .env.example .env
chown -R rocobot:rocobot /opt/roco-chatwoot-agent
chmod 600 .env
runuser -u rocobot -- env PATH=/opt/rocobroker-node/bin:/usr/bin:/bin npm ci
runuser -u rocobot -- env PATH=/opt/rocobroker-node/bin:/usr/bin:/bin npm run build
cp deploy/roco-chatwoot-agent.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now roco-chatwoot-agent
systemctl status roco-chatwoot-agent --no-pager
```

Add `deploy/apache-path.conf` before the catch-all proxy rule for
`support.rocobroker.com`, apply the cPanel userdata includes, test Apache, and
reload it. The exact cPanel commands on the ROCO host are:

```bash
/scripts/ensure_vhost_includes --user=rocobrok
apachectl configtest
systemctl reload httpd
```

Verify the public path:

```bash
curl -fsS https://support.rocobroker.com/agent-bot/health
```

## Model configuration

The default is `gpt-5.4-mini` with `low` reasoning effort through the OpenAI
Responses API. The model, reasoning effort, key and base URL are environment
settings. An alternate provider must implement the Responses API, reasoning
configuration and Structured Outputs at its configured `/v1` endpoint.

The implementation uses `store: false`, a hashed safety identifier and a stable
prompt-cache key. The stable approved knowledge appears before the changing
conversation so eligible requests can benefit from prompt caching.

## Persian response quality

The style is professional and natural: respectful شما, concise direct answers,
brand روکو, correct نیم‌فاصله and consistent trading terms. Technical names,
URLs, identifiers and ratios retain their exact forms. The first substantive
question is answered immediately; greeting-only messages receive an invitation
to ask a question. First-turn state is independent of the model context limit.

Product facts remain in `knowledge/roco.md`; `knowledge/policy.md` governs
behavior and style. Internal evidence excerpts are validated but never shown in
customer replies. Exact excerpts and script checks are safeguards, not proof
that every model paraphrase is accurate. Business-review gaps are tracked in
`knowledge/review-gaps.md`, which is not loaded into the model.

## Operations and monitoring

- This remains a single-process service. Do not run replicas against the same
  state file. The state file defaults to `/var/lib/rocobot/jobs.json`.
- Persisted jobs include processing phase, attempt count, next retry time and
  terminal failure status. Existing records load compatibly. Legacy records
  already at the attempt limit are retained as failed for manual review.
- Retry reads, status changes and uncertain sends within `AI_MAX_ATTEMPTS`
  (default 3), with exponential delay from `AI_RETRY_BASE_DELAY_MS` (default
  1000). Permanent HTTP errors (for example 401/403) become terminal immediately;
  408/429/5xx and network failures may retry. Before reposting, reconcile the public source-message marker through
  conversation-detail history. Model failure causes a confirmed human handoff.
- Exhausted jobs remain terminal across restarts. Alert on `failed_jobs > 0`;
  inspect the logged message/conversation IDs and the conversation in Chatwoot.
  A human should finish the case there. There is no automatic terminal-job reset.
- Health exposes `language_retries`, `clarifications`, `handoffs`,
  `handoff_failures`, `retry_exhaustions`, `failed_jobs`, queue depth and active
  work. Event counters reset on restart; failed-job count comes from disk.
  `ok`/HTTP 200 means the queue accepts work, not that vendors are available.
- Logs contain IDs, operation, bounded error code, HTTP status and latency only.
  Customer/model text and vendor error bodies never enter logs. Model input is
  redacted for Persian/Arabic digits and credential labels as well as common
  identifiers. Redaction is best-effort, not complete anonymization.
- The AgentBot token cannot access the GET messages index. Conversation details return a bounded recent history. If the entire returned window is newer than the triggering message, reply reconciliation fails closed for manual review. An already requested transfer can still complete without reposting a public message.
- Chatwoot does not provide a conditional message POST or server-side unique
  source marker here. Read-before-write reconciliation reduces duplicate and
  takeover races but cannot provide exactly-once delivery under every timing.
- On persistence failure, the queue stops and the process exits for systemd to
  restart; already-acknowledged jobs remain in durable state. Graceful shutdown
  stops new scheduling; any unfinished persisted phase is reconciled on restart.

The separate `../roco-chatwoot-agent` repository is not synchronized or deployed
by changes to this nested service.

## Validation and independent release

Run from this directory:

```bash
npm run typecheck
npm test
```

Tests include a reviewed synthetic Persian answer set and mocked vendor failures:
shared-script Persian, letter variants, preference changes, Arabic-to-English,
wrong-language retries, one clarification, first-turn context, human takeover,
missing status outcomes, lost POST acknowledgements, retry order and restarts.
The synthetic set validates the pipeline with supplied model decisions; live
model generation quality still needs a staffed Chatwoot check.

Deploy this service independently of the website. Before replacing the active
release, retain its source, `dist`, knowledge files and dependency manifests as
one rollback bundle. Stop the service, take a restricted backup of the job
state (no transcript content), install the new service files without replacing
its environment or state, run `npm ci` and `npm run build`, then restart it.
Verify health and perform the staffed smoke checks below before unattended use:

- Persian greeting → one brief AI introduction.
- First message «چه پلتفرمی دارید؟» → introduction and actual answer together.
- «حساب من محدود شده» / «برداشتم نرسیده» → Persian handoff; verify `open` in Chatwoot.
- «در مورد حساب» → one clarification; another unclear reply → handoff.
- «رگولاتور روکو چیست؟» → named approved regulator, without legal interpretation.
- Arabic question → English response; Persian-to-English preference → English.
- Verify MT5, USDT, URLs and leverage ratios display correctly in the RTL widget.
- A human reply or takeover → no later bot reply.

Audit live answers against approved knowledge for tone, accuracy and routing.
Reject release acceptance if any sampled answer gives unsafe advice or fabricates
facts. Monitor language retries, handoff failures and terminal jobs during rollout.

For rollback, stop the service and restore the previous release bundle while
preserving the new job-state backup. The older worker does not understand
terminal phases: do not restart it with failed records in its active job list.
Have support finish those cases and retain their records separately before
restarting the old worker. Restore no product facts from an unapproved revision.
