import type { SVGProps } from "react";

const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Min deposit — wallet. */
export function DepositIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M3 7a2 2 0 0 1 2-2h12v3M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3M3 7h16a1 1 0 0 1 1 1v3" />
      <circle cx="16.5" cy="12.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Max leverage — upward arrows. */
export function LeverageIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M4 20V9M4 9l3 3M4 9l-1.5 1.5" />
      <path d="M13 20V4M13 4l3 3M13 4l-3 3" />
      <path d="M20 20v-7" />
    </svg>
  );
}

/** Spread — two levels with a gap. */
export function SpreadIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M3 8h7M14 8h7M3 16h4M11 16h10" />
      <path d="M12 5v14" strokeDasharray="2 2" />
    </svg>
  );
}

/** Commission — percent tag. */
export function CommissionIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M19 5 5 19" />
      <circle cx="7.5" cy="7.5" r="2.5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
    </svg>
  );
}
