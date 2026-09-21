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

/** The Persian (fa) step-by-step guide series, in reading order. */
export const faGuideArticles: GuideArticleContent[] = [
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
