import type { SVGProps } from "react";

const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

/** Transparent Trading — an eye. */
export function TransparentIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

/** Market Access — a globe. */
export function MarketAccessIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.4 2.5 15.6 0 18M12 3c-2.5 2.4-2.5 15.6 0 18" />
    </svg>
  );
}

/** Flexible Funding — a wallet. */
export function FlexibleFundingIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5Z" />
      <path d="M16 12.5h4M16 12.5a1.5 1.5 0 0 0 0 3H20v-3" />
    </svg>
  );
}

/** Reliable Performance — a shield with a check. */
export function ReliableIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M12 3 5 6v5c0 4.4 3 8.2 7 9.5 4-1.3 7-5.1 7-9.5V6l-7-3Z" />
      <path d="m9 11.5 2 2 4-4" />
    </svg>
  );
}

/** Value Control & Flexibility — sliders. */
export function ValueControlIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M5 5v5M5 14v5M12 5v3M12 12v7M19 5v9M19 18v1" />
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="10" r="2" />
      <circle cx="19" cy="16" r="2" />
    </svg>
  );
}

/** Minimized Risk — a shield. */
export function MinimizedRiskIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M12 3 5 6v5c0 4.4 3 8.2 7 9.5 4-1.3 7-5.1 7-9.5V6l-7-3Z" />
      <path d="M12 8v4" />
      <circle cx="12" cy="15" r="0.6" fill="currentColor" />
    </svg>
  );
}

/** Real Market Experience — a candlestick chart. */
export function RealMarketIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M7 4v3M7 15v4M7 7h0a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 7 18a1.5 1.5 0 0 1-1.5-1.5v-4A1.5 1.5 0 0 1 7 11" />
      <path d="M17 5v5M17 17v2M17 10a1.5 1.5 0 0 1 1.5 1.5v3A1.5 1.5 0 0 1 17 16a1.5 1.5 0 0 1-1.5-1.5v-3A1.5 1.5 0 0 1 17 10" />
    </svg>
  );
}

/** Defined Costs — a price tag. */
export function DefinedCostsIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M3.5 12.5 11 5a2 2 0 0 1 1.4-.6H19a1.5 1.5 0 0 1 1.5 1.5v6.6a2 2 0 0 1-.6 1.4l-7.5 7.5a1.5 1.5 0 0 1-2.1 0L3.5 14.6a1.5 1.5 0 0 1 0-2.1Z" />
      <circle cx="16" cy="8" r="1.2" />
    </svg>
  );
}

/** Commission-Based Structure — a percent sign. */
export function CommissionIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M6 18 18 6" />
      <circle cx="7.5" cy="7.5" r="2.5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
    </svg>
  );
}

export const DETAIL_ICONS: Record<string, [
  (p: SVGProps<SVGSVGElement>) => React.JSX.Element,
  (p: SVGProps<SVGSVGElement>) => React.JSX.Element,
  (p: SVGProps<SVGSVGElement>) => React.JSX.Element,
  (p: SVGProps<SVGSVGElement>) => React.JSX.Element,
]> = {
  lionStd: [TransparentIcon, MarketAccessIcon, FlexibleFundingIcon, ReliableIcon],
  lionNano: [TransparentIcon, ValueControlIcon, MinimizedRiskIcon, RealMarketIcon],
  cheetahStd: [TransparentIcon, DefinedCostsIcon, CommissionIcon, ReliableIcon],
  cheetahNano: [TransparentIcon, ValueControlIcon, MinimizedRiskIcon, RealMarketIcon],
};
