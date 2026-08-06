import { useEffect, useRef, useState } from 'react';
import { IconColumns } from '../icons.jsx';

/**
 * The COLUMNS pill and its dropdown.
 *
 * steps.md: "Only display the selected columns and if nothing is selected then
 * display the all columns" and "Add a clear filter button inside column
 * selector" - hence Clear filter living in this menu.
 */
export default function ColumnSelector({
  columns,
  visible,
  onChange,
  onClearFilters,
  filtersActive,
  label = 'Columns',
}) {
  const [open, setOpen] = useState(false);
  const container = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClickAway = (event) => {
      if (!container.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [open]);

  const toggle = (key) => {
    onChange(visible.includes(key) ? visible.filter((item) => item !== key) : [...visible, key]);
  };

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="btn-pill"
      >
        <IconColumns width={17} height={17} />
        {label}
      </button>

      {open && (
        <div
          className="absolute right-0 z-30 mt-2 w-[250px] rounded-[10px] border border-edge
                     bg-surface p-3 shadow-lg"
          role="menu"
        >
          <p className="mb-2 text-note text-soft">Nothing ticked shows every column.</p>

          <div className="max-h-[300px] space-y-1 overflow-y-auto">
            {columns.map((column) => (
              <label key={column.key} className="flex cursor-pointer items-center gap-2 text-data">
                <input
                  type="checkbox"
                  checked={visible.includes(column.key)}
                  onChange={() => toggle(column.key)}
                  className="h-[14px] w-[14px] accent-navy"
                />
                {column.label}
              </label>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-edge pt-2">
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-note underline disabled:no-underline disabled:opacity-40"
              disabled={visible.length === 0}
            >
              Reset columns
            </button>
            <button
              type="button"
              onClick={() => {
                onClearFilters();
                setOpen(false);
              }}
              className="text-note underline disabled:no-underline disabled:opacity-40"
              disabled={!filtersActive}
            >
              Clear filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
