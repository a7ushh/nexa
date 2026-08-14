/**
 * The NEXA wordmark - Raleway Bold 26px with the 18.2px tracking measured in
 * the Figma navbar. The trailing letter-space is trimmed so the mark stays
 * optically flush with whatever follows it.
 */
export default function Wordmark({ className = '' }) {
  return (
    <span
      className={`select-none whitespace-nowrap font-brand text-[26px] leading-[30px] font-bold tracking-brand
                  [margin-right:calc(var(--brand-tracking)*-1)] ${className}`}
    >
      NEXA
    </span>
  );
}
