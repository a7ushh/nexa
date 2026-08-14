/**
 * The section rule from the new design, drawn the way the mock does it: a short
 * run of dashes, the label, a long dashed rule, and a chevron at the far right.
 *
 * The dashes are a real repeating border rather than typed hyphens so the rule
 * fills whatever width the column happens to be.
 */
export default function SectionDivider({ label, collapsed = false, onToggle, count }) {
  // The whole rule is the target, not just the chevron - it spans the column, so
  // hunting for a 20px arrow at the far right was the harder way to do it.
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${label}`}
      className="flex w-full select-none items-center gap-[10px] py-[14px] text-left font-mono
                 text-data transition-opacity hover:opacity-70"
    >
      <Dashes className="w-[42px]" />
      <span className="shrink-0 whitespace-nowrap">{label}</span>
      {count !== undefined && <span className="shrink-0 text-soft">({count})</span>}
      <Dashes className="flex-1" />
      <span
        aria-hidden="true"
        className="shrink-0 px-1 font-bold transition-transform"
        style={{ transform: collapsed ? 'rotate(-90deg)' : 'none' }}
      >
        V
      </span>
    </button>
  );
}

function Dashes({ className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`h-px shrink-0 ${className}`}
      style={{
        backgroundImage:
          'repeating-linear-gradient(to right, rgb(var(--text-rgb)) 0 8px, transparent 8px 14px)',
      }}
    />
  );
}
