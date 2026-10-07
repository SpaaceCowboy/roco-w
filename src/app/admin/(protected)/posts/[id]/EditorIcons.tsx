import type { ReactNode } from "react";

/** Inline 24px stroke icons for the editor toolbar (no icon dependency needed for ~16 glyphs). */
const glyphs = {
  bold: <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" />,
  italic: <path d="M10 5h8M6 19h8M14 5l-4 14" />,
  heading: <path d="M6 4v16M18 4v16M6 12h12" />,
  list: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  listOrdered: <path d="M10 6h10M10 12h10M10 18h10M4 6h1v4M4 14h2l-2 3h2" />,
  quote: <path d="M9 7H6v5h3v1.5A2.5 2.5 0 0 1 6.5 16M18 7h-3v5h3v1.5a2.5 2.5 0 0 1-2.5 2.5" />,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  image: <><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="m4 17 5-4 4 3 3-2.5 4 3.5" /></>,
  pencil: <path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" />,
  table: <><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M4 10h16M4 15h16M10 5v14" /></>,
  callout: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></>,
  cta: <><rect x="3.5" y="7" width="17" height="10" rx="3" /><path d="M9 12h6M13 10l2 2-2 2" /></>,
  import: <path d="M12 4v11M8 11l4 4 4-4M5 19h14" />,
  undo: <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />,
  redo: <path d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof glyphs;

export function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {glyphs[name]}
    </svg>
  );
}
