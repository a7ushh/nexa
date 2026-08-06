import { useEffect, useState } from 'react';
import { IconClose } from '../icons.jsx';
import { Toggle } from '../form/Field.jsx';
import DatePicker from '../form/DatePicker.jsx';
import SuggestField from './SuggestField.jsx';

const pad = (n) => String(n).padStart(2, '0');
const iso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Shortcut ranges offered beneath the date pickers. */
const DATE_PRESETS = [
  {
    label: 'Today',
    range: () => {
      const today = iso(new Date());
      return { from: today, to: today };
    },
  },
  {
    label: 'Last 1 week',
    range: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(to.getDate() - 7);
      return { from: iso(from), to: iso(to) };
    },
  },
  {
    label: 'Last month',
    range: () => {
      const to = new Date();
      const from = new Date();
      from.setMonth(to.getMonth() - 1);
      return { from: iso(from), to: iso(to) };
    },
  },
];

/**
 * The expanded filter panel from the new design: a 415px navy column holding
 * `F I L T E R`, the module's fields as white outlined inputs, the date range,
 * and Clear / Apply at the foot.
 *
 * Fields are supplied per module as a descriptor list, so one panel serves
 * Grey, both challan directions and the Report.
 */
export default function FilterDrawer({
  open,
  fields,
  value,
  onApply,
  onClear,
  onClose,
  suggestScope,
  suggestKind,
}) {
  const [draft, setDraft] = useState(value);

  // Re-sync on open so a cancelled edit is discarded.
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  if (!open) return null;

  const set = (key, next) => setDraft((current) => ({ ...current, [key]: next }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(value);

  return (
    <aside
      className="flex h-full w-panel max-w-full flex-1 shrink-0 flex-col bg-navy
                 px-[30px] pb-[30px] pt-[40px] text-on-dark md:flex-none"
      role="dialog"
      aria-label="Filter items"
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-mono text-title font-bold tracking-[10px]">FILTER</h2>
          <p className="mt-[4px] text-note text-on-dark/60">Separate several values with /</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close filters"
          className="mt-1 text-on-dark transition-opacity hover:opacity-70"
        >
          <IconClose width={20} height={20} />
        </button>
      </div>

      <div className="mt-[20px] flex-1 space-y-[14px] overflow-y-auto pr-1 no-scrollbar">
        {fields.map((field) => (
          <FilterField
            key={field.key}
            field={field}
            value={draft[field.key]}
            onChange={set}
            scope={suggestScope}
            kind={suggestKind}
          />
        ))}
      </div>

      <div className="mt-[24px] flex items-center gap-[22px]">
        <button type="button" onClick={onClear} className="btn-ghost flex-1 text-on-dark">
          Clear Filters
        </button>
        <button
          type="button"
          disabled={!dirty}
          onClick={() => onApply(draft)}
          className="btn-accent flex-1"
        >
          Apply Filters
        </button>
      </div>
    </aside>
  );
}

function FilterField({ field, value, onChange, scope, kind }) {
  const id = `filter-${field.key}`;

  if (field.type === 'boolean') {
    return (
      <Toggle
        id={id}
        label={field.label}
        checked={value === 'true'}
        // A field that defaults to on has to send an explicit `false` when
        // switched off; one that defaults to blank just clears itself.
        onChange={(next) => onChange(field.key, next ? 'true' : field.default ? 'false' : '')}
      />
    );
  }

  if (field.type === 'dateRange') {
    const current = value ?? { from: '', to: '' };
    const preset = (range) => onChange(field.key, range);
    const isActive = (range) => current.from === range.from && current.to === range.to;

    return (
      <div>
        <span className="field-label text-on-dark">{field.label}</span>
        <div className="flex gap-[12px]">
          <div className="flex-1">
            <DatePicker
              id={`${id}-from`}
              value={current.from}
              onChange={(next) => onChange(field.key, { ...current, from: next })}
            />
          </div>
          <div className="flex-1">
            <DatePicker
              id={`${id}-to`}
              value={current.to}
              onChange={(next) => onChange(field.key, { ...current, to: next })}
            />
          </div>
        </div>

        {/* Quick ranges, so the common cases need no calendar at all. */}
        <div className="mt-[10px] flex flex-wrap gap-[8px]">
          {DATE_PRESETS.map((item) => {
            const range = item.range();
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => preset(range)}
                className={`rounded-pill border px-[12px] py-[5px] text-note transition-colors
                            ${
                              isActive(range)
                                ? 'border-accent bg-accent text-on-dark'
                                : 'border-on-dark/40 text-on-dark hover:bg-on-dark/10'
                            }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return <SuggestField field={field} value={value} onChange={onChange} scope={scope} kind={kind} />;
}
