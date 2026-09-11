import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function verifyChatwootSignature({
  rawBody,
  timestamp,
  signature,
  secret,
  maxAgeSeconds,
  nowSeconds = Math.floor(Date.now() / 1000),
}: {
  rawBody: string;
  timestamp: string | undefined;
  signature: string | undefined;
  secret: string;
  maxAgeSeconds: number;
  nowSeconds?: number;
}): boolean {
  if (!timestamp || !signature || !/^\d+$/.test(timestamp)) return false;
  const sentAt = Number(timestamp);
  if (!Number.isSafeInteger(sentAt) || Math.abs(nowSeconds - sentAt) > maxAgeSeconds) return false;

  const expected = `sha256=${createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex")}`;
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

/** Remove common identifiers before any conversation text leaves ROCO infrastructure. */
export function redactForModel(value: string): string {
  return value
    .replace(/\b(?:password|passcode|otp|one[- ]?time code|2fa|secret|private key|seed phrase|cvv)\b\s*[:=]?\s*\S+/gi, "[sensitive value removed]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email removed]")
    .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, "[number removed]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[card number removed]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, "[identifier removed]")
    .replace(/\b(?:0x)?[0-9a-f]{24,}\b/gi, "[identifier removed]")
    .slice(0, 4_000);
}

export function safetyIdentifier(contactId: string): string {
  return createHash("sha256").update(`roco-chatwoot:${contactId}`).digest("hex");
}
