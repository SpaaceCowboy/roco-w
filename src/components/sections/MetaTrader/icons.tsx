import type { SVGProps } from "react";

const svg = { width: 26, height: 26, viewBox: "0 0 24 24", "aria-hidden": true } as const;

/** Apple (App Store + Mac). */
export function AppleIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...svg} fill="currentColor" {...p}>
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

/** Google Play. */
export function PlayIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...svg} fill="currentColor" {...p}>
      <path d="M3.6 2.3c-.2.2-.35.5-.35.94v17.52c0 .44.15.74.35.94l.06.05L13.4 12.06v-.12L3.66 2.25l-.06.05zM16.7 15.35l-3.3-3.29v-.12l3.3-3.29.08.04 3.9 2.22c1.12.63 1.12 1.67 0 2.31l-3.9 2.22-.08-.09z" />
    </svg>
  );
}

/** Windows. */
export function WindowsIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...svg} fill="currentColor" {...p}>
      <path d="M3 5.1 10.5 4v7.5H3V5.1zM11.5 3.85 21 2.5v9h-9.5v-7.65zM3 12.5h7.5V20L3 18.9V12.5zM11.5 12.5H21v9l-9.5-1.35V12.5z" />
    </svg>
  );
}

/** Web / terminal — a globe. */
export function WebIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...svg}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.6 2.4 2.6 15.6 0 18M12 3c-2.6 2.4-2.6 15.6 0 18" />
    </svg>
  );
}
