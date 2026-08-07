/** Small down-chevron used by the language switcher (matches the reference). */
export function Chevron({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="10"
      viewBox="0 0 16 11"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.25 0L15.25 2.62722L7.60056 10.2501L0.25 2.92613V0.0363028H1.75V2.30322L7.60049 8.13257L13.75 2.00437L13.75 9.86474e-06L15.25 0Z"
      />
    </svg>
  );
}
