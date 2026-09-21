import type { GuideArticleContent } from "../guide-types";
import { registrationGuide } from "./registration";
import { identityVerificationGuide } from "./identity-verification";
import { ibRequestGuide } from "./ib-request";
import { tradingAccountGuide } from "./trading-account";
import { centAccountGuide } from "./cent-account";
import { rialDepositGuide } from "./rial-deposit";
import { rialWithdrawalGuide } from "./rial-withdrawal";
import { cryptoDepositGuide } from "./crypto-deposit";
import { cryptoWithdrawalGuide } from "./crypto-withdrawal";
import { internalTransferGuide } from "./internal-transfer";
import { bonusGuide } from "./bonus";
import { socialTradingGuide } from "./social-trading";

/**
 * The step-by-step guide series, in reading order. Order here defines the
 * previous/next navigation, the series index and the progress indicator, so
 * keep it aligned with the numbered scope of the series.
 */
export const guideArticles: GuideArticleContent[] = [
  registrationGuide,
  identityVerificationGuide,
  ibRequestGuide,
  tradingAccountGuide,
  centAccountGuide,
  rialDepositGuide,
  rialWithdrawalGuide,
  cryptoDepositGuide,
  cryptoWithdrawalGuide,
  internalTransferGuide,
  bonusGuide,
  socialTradingGuide,
];

export function getGuideArticle(slug: string): GuideArticleContent | undefined {
  return guideArticles.find((article) => article.slug === slug);
}
