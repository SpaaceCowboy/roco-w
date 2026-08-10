import { COMPLIANCE_MESSAGE_VALUES } from "@/config/compliance";
import { PAYMENT_MESSAGE_VALUES } from "@/config/payments";
import { TRADING_MESSAGE_VALUES } from "@/config/trading";

/** FAQ item keys — plain module so the server route (JSON-LD) and the client
 *  view can both import it without crossing the "use client" boundary. */
export const FAQ_KEYS = [
  "openAccount", "minDeposit", "methods", "withdrawTime", "commissions", "islamic",
  "scalping", "spreadsNews", "orderClosed", "regulated", "demo", "iranianRials",
  "depositMissing", "robots", "education", "leverage", "microLots", "cashback", "dailyAnalysis",
] as const;

export type FaqKey = (typeof FAQ_KEYS)[number];

export const FAQ_ANSWER_VALUES: Partial<Record<FaqKey, Record<string, string>>> = {
  methods: PAYMENT_MESSAGE_VALUES,
  orderClosed: TRADING_MESSAGE_VALUES,
  regulated: COMPLIANCE_MESSAGE_VALUES,
  iranianRials: PAYMENT_MESSAGE_VALUES,
};
