/** FAQ item keys — plain module so the server route (JSON-LD) and the client
 *  view can both import it without crossing the "use client" boundary. */
export const FAQ_KEYS = [
  "openAccount", "minDeposit", "methods", "withdrawTime", "commissions", "islamic",
  "scalping", "spreadsNews", "orderClosed", "regulated", "demo", "iranianRials",
  "depositMissing", "robots", "education", "leverage", "microLots", "cashback", "dailyAnalysis",
] as const;
