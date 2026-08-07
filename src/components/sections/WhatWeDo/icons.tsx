import type { SVGProps } from "react";

const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

/** Forex News — a newspaper. */
export function NewsIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M4 5h12v14H5a2 2 0 0 1-2-2V6" />
      <path d="M16 8h3a1 1 0 0 1 1 1v8a2 2 0 0 1-2 2" />
      <path d="M7 8h6M7 11h6M7 14h4" />
    </svg>
  );
}

/** Educational Networking — a graduation cap. */
export function EduIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M12 4 2 9l10 5 10-5-10-5Z" />
      <path d="M6 11v4c0 1.1 2.7 2.5 6 2.5s6-1.4 6-2.5v-4" />
      <path d="M22 9v5" />
    </svg>
  );
}

/** Markets — candlestick chart. */
export function MarketsIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M7 4v3M7 15v5M7 7h0a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2 2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
      <path d="M17 4v6M17 18v2M17 10a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

/** 24/7 Support — a headset. */
export function SupportIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
      <path d="M4 13h2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4Z" />
      <path d="M20 13h-2a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-4Z" />
      <path d="M20 18v1a3 3 0 0 1-3 3h-3" />
    </svg>
  );
}

/** Trading Tools — sliders. */
export function ToolsIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h13M19 18h1" />
      <circle cx="15" cy="6" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="19" cy="18" r="2" />
    </svg>
  );
}

export const ICONS = {
  forexNews: NewsIcon,
  education: EduIcon,
  markets: MarketsIcon,
  support: SupportIcon,
  tools: ToolsIcon,
} as const;
