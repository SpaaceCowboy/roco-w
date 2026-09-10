# ROCO Chatwoot AgentBot

A standalone, guarded AI support service for ROCO's self-hosted Chatwoot. It is
separate from both the website and Chatwoot application.

## Behavior

1. Chatwoot sends a signed `message_created` webhook.
2. The service verifies the HMAC signature and rejects stale requests.
3. Only incoming contact messages for account 1 / inbox 1 are accepted. Agent,
   bot, private and already-human-owned conversation messages are ignored.
4. The service acknowledges Chatwoot before model work, then processes requests
   through a bounded in-memory queue.
5. Recent text messages are fetched from Chatwoot. Common personal identifiers
   are redacted before the transcript is sent to the model.
6. The model must produce a schema-validated `reply` or `handoff` decision using
   only the curated facts in `src/knowledge.ts`.
7. Sensitive, account-specific, uncertain, complaint, legal and financial-advice
   requests are moved to `open` status for a human agent.

The service never has access to trading passwords, client-portal credentials,
wallet keys or payment instruments. Do not add those capabilities.

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

The default is `gpt-5.6-luna` with `low` reasoning effort through the OpenAI
Responses API. The model, reasoning effort, key and base URL are environment
settings. An alternate provider must implement the Responses API, reasoning
configuration and Structured Outputs at its configured `/v1` endpoint.

The implementation uses `store: false`, a hashed safety identifier and a stable
prompt-cache key. The stable approved knowledge appears before the changing
conversation so eligible requests can benefit from prompt caching.

## Operational limits

- The queue and duplicate-message cache are in memory. A process restart loses
  queued work and the short duplicate window. This is acceptable for the first
  single-process deployment; use Redis before adding replicas.
- Model failure triggers a human handoff.
- No conversation content or model output is written to logs. Logs contain only
  message IDs, conversation IDs, decisions, timing and errors.
- Review and approve `src/knowledge.ts` before production. It is the bot's only
  product-information source.
- Keep a human staffed during initial rollout and audit a representative sample
  of replies before enabling the bot outside business hours.
