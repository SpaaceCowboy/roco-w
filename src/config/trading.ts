/** Canonical trading conditions shared by every account presentation. */
export const ACCOUNT_COMMON_CONDITIONS = {
  leverage: "1:1000",
  stopOut: "40%",
  marginCall: "100%",
  minVolume: "0.01 Lots",
  maxVolume: "30 Lots",
} as const;

export const TRADING_MESSAGE_VALUES = {
  marginCallLevel: ACCOUNT_COMMON_CONDITIONS.marginCall,
  stopOutLevel: ACCOUNT_COMMON_CONDITIONS.stopOut,
};
