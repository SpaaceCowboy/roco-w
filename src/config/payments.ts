export const RIAL_PAYMENT_PROVIDER = "TCPAY";

export const PAYMENT_MESSAGE_VALUES = {
  rialProvider: RIAL_PAYMENT_PROVIDER,
};

export const CRYPTO_PAYMENT_METHODS = [
  { id: "usdt", name: "USDT (Tether)", networks: ["TRC20", "ERC20", "BEP20"], image: "/payment-methods/usdt.webp" },
  { id: "usdc", name: "USDC", networks: ["TRC20", "ERC20", "BEP20"], image: "/payment-methods/usdc.webp" },
  { id: "btc", name: "Bitcoin (BTC)", networks: ["BTC"], image: "/payment-methods/btc.webp" },
  { id: "eth", name: "Ethereum (ETH)", networks: ["ERC20"], image: "/payment-methods/eth.webp" },
] as const;

export const FIAT_PAYMENT_METHODS = {
  visa: { id: "visa", name: "Visa" },
  mastercard: { id: "mc", name: "MasterCard" },
  localPsp: { id: "psp", name: "Local PSP" },
} as const;

/** Supported fiat countries and settlement currencies. */
export const SUPPORTED_FIAT_COUNTRIES = [
  ["AR", "USD/ARS"], ["AU", "USD/AUD"], ["BR", "USD/BRL"],
  ["BD", "USD/BDT"], ["BO", "USD/BOB"], ["CM", "USD/XAF"],
  ["CA", "USD/CAD"], ["CL", "USD/CLP"], ["CN", "USD/CNY"],
  ["CO", "USD/COP"], ["CR", "USD/CRC"], ["CI", "USD/XOF"],
  ["DO", "USD/DOP"], ["EC", "USD"], ["EG", "USD/EGP"],
  ["SV", "USD/SVC"], ["GH", "USD/GHS"], ["GT", "USD/GTQ"],
  ["HN", "USD/HNL"], ["IN", "USD/INR"], ["ID", "USD/IDR"],
  ["JP", "USD/JPY"], ["KE", "USD/KES"], ["MY", "USD/MYR"],
  ["MX", "USD/MXN"], ["NI", "USD/NIO"], ["NG", "USD/NGN"],
  ["PA", "USD"], ["PE", "USD/PEN"], ["PY", "USD/PYG"],
  ["PH", "USD/PHP"], ["SG", "USD/SGD"], ["ZA", "USD/ZAR"],
  ["TZ", "USD/TZS"], ["TR", "USD/TRY"], ["TH", "USD/THB"],
  ["UG", "USD/UGX"], ["UY", "USD/UYU"], ["VE", "USD/VES"],
  ["VN", "USD/VND"],
] as const;
