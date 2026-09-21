import type { GuideArticleContent } from "../../guide-types";
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
 * The English step-by-step guide series, in reading order. It mirrors the
 * Persian series exactly, but is text-only: the source screenshots show the
 * Persian client portal, so they are intentionally omitted here.
 */
export const enGuideArticles: GuideArticleContent[] = [
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
