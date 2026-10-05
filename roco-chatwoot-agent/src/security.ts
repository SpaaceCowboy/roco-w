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
  // Normalize digits only inside the redaction pipeline, not customer history.
  return value
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/\b(?:password|passcode|otp|one[- ]?time code|2fa|secret|private key|seed phrase|cvv)\b\s*[:=]?\s*[^\n]+/gi, "[sensitive value removed]")
    .replace(/(?:رمز(?: عبور)?|کد (?:تأیید|تایید|امنیتی|یک[‌ ]?بار[‌ ]?مصرف)|رمز یک[‌ ]?بار[‌ ]?مصرف|کلید خصوصی|[کك]ل[یي]د خصوص[یي]|عبارت بازیابی|عبارت بازيابي|شماره کارت)\s*[:=]?\s*[^\n]+/gu, "[sensitive value removed]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email removed]")
    .replace(/(?<![\p{L}\d:.])\+?\d[\d ()-]*\d(?![\d:.])/gu,
      (number) => number.replace(/\D/g, "").length >= 8 ? "[number removed]" : number)
    .replace(/(?:\d[ -]*?){13,19}/g, "[card number removed]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, "[identifier removed]")
    .replace(/\b(?:0x)?[0-9a-f]{24,}\b/gi, "[identifier removed]")
    .replace(/\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b|\bbc1[a-z0-9]{25,87}\b|\bT[1-9A-HJ-NP-Za-km-z]{33}\b/g, "[identifier removed]")
    .slice(0, 4_000);
}

export function safetyIdentifier(contactId: string): string {
  return createHash("sha256").update(`roco-chatwoot:${contactId}`).digest("hex");
}
