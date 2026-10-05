import { processMessage as process } from "../dist/bot.js";
export const config = {
  availability: { timezone: "Asia/Tehran", start: "23:00", end: "08:00", outsideHours: "message_handoff" },
  chatwootAccountId: 1, chatwootInboxId: 1, chatwootBaseUrl: "https://chatwoot.test", chatwootToken: "test-token",
  openaiApiKey: "test-key", openaiBaseUrl: "https://model.test/v1", openaiModel: "gpt-5.4-mini",
  openaiReasoningEffort: "low", confidenceThreshold: 0.72, maxContextMessages: 10,
  maxAttempts: 3, maxConcurrent: 2, retryBaseDelayMs: 10, queueLimit: 100, alertFailureThreshold: 5,
};
export const platformEvidence = ["ROCO provides MetaTrader 5 on desktop, web and mobile."];
export const job = (overrides = {}) => ({ messageId: "42", conversationId: 9, contactId: "7",
  content: "پلتفرم معاملاتی شما چیست؟", attempt: 1, ...overrides });
export const answer = (overrides = {}) => ({ action: "reply", reason: "knowledge_answer", confidence: 0.96,
  message: "روکو پلتفرم MetaTrader 5 را برای دسکتاپ، وب و موبایل ارائه می‌کند.", evidence: platformEvidence, ...overrides });
export const incoming = (id, content) => ({ id, content, message_type: "incoming", private: false });

/** Synthetic vendor only: no credentials, customer transcripts or live network. */
export function vendorMock(options = {}) {
  const state = { status: "pending", messages: [incoming(42, options.content ?? job().content)],
    calls: [], modelCalls: [], posts: [], notes: [], toggles: 0, ...options };
  const fetch = async (url, init = {}) => {
    const request = new URL(url);
    const method = init.method ?? "GET";
    state.calls.push({ path: request.pathname, method });
    if (request.hostname === "model.test") {
      const body = JSON.parse(init.body);
      state.modelCalls.push(body);
      if (state.onModel) await state.onModel(state);
      const decision = state.decisions?.shift() ?? answer();
      return Response.json({ output_text: JSON.stringify(decision) });
    }
    if (request.pathname.endsWith("/toggle_status")) {
      state.toggles += 1;
      if (state.toggleFailures > 0) { state.toggleFailures -= 1; return Response.json({}, { status: 503 }); }
      if (!state.silentToggle) state.status = "open";
      return Response.json({ payload: { current_status: "open" } });
    }
    if (request.pathname.endsWith("/messages")) {
      if (method === "GET") {
        return Response.json({}, { status: 401 });
      }
      const body = JSON.parse(init.body);
      const message = { ...body, id: Math.max(42, ...state.messages.map((m) => m.id)) + 1 };
      state.messages.push(message);
      if (body.private) state.notes.push(message); else state.posts.push(message);
      if (!body.private && state.losePostAcknowledgement) {
        state.losePostAcknowledgement = false;
        throw new TypeError("synthetic network failure");
      }
      return Response.json(message);
    }
    return Response.json({ status: state.status, messages: state.messages, meta: { assignee: state.assignee ?? null } });
  };
  return { state, fetch };
}

export async function withFetch(fetch, callback) {
  const original = globalThis.fetch;
  globalThis.fetch = fetch;
  try { return await callback(); } finally { globalThis.fetch = original; }
}

// Existing conversation tests run during a fixed active window, independently of wall time.
export const processMessage = (config, job, persist) =>
  process(config, job, persist, () => new Date("2026-10-05T23:30:00+03:30"));
