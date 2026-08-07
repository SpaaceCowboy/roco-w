/** Small decorative "+" / sparkle mark placed at each corner of a section. */
export function CornerMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="9"
      height="9"
      viewBox="0 0 9 9"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M0.500001 0.5L2.9 3.7C3.27771 4.20361 3.87049 4.5 4.5 4.5M8.5 8.5L6.1 5.3C5.72229 4.79639 5.12952 4.5 4.5 4.5M4.5 4.5C3.87049 4.5 3.27771 4.79639 2.9 5.3L0.5 8.5M4.5 4.5C5.12952 4.5 5.72229 4.20361 6.1 3.7L8.5 0.5"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}
