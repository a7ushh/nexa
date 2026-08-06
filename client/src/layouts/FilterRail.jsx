/**
 * The collapsed filter rail: 70px of navy down the left edge with FILTER set
 * vertically in Source Code Pro Bold and a chevron at the foot. Clicking it
 * expands the full filter panel.
 */
export default function FilterRail({ onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open filters"
      className="flex w-rail shrink-0 flex-col items-center justify-between bg-navy py-[24px]
                 text-on-dark transition-opacity hover:opacity-95"
    >
      <span />
      <span
        className="font-mono text-nav font-bold tracking-brand"
        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
      >
        FILTER
      </span>
      <span
        aria-hidden="true"
        className="font-mono text-nav font-bold"
        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
      >
        V
      </span>
    </button>
  );
}
