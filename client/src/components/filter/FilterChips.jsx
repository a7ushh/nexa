import { IconClose } from '../icons.jsx';
import { formatDate } from '../../utils/format.js';

/** The applied-filter chips shown above the table. */
export default function FilterChips({ fields, value, onRemove }) {
  const chips = [];

  for (const field of fields) {
    const current = value[field.key];
    if (current === undefined || current === null || current === '') continue;

    if (field.type === 'dateRange') {
      if (!current.from && !current.to) continue;
      const from = current.from ? formatDate(current.from) : '…';
      const to = current.to ? formatDate(current.to) : '…';
      chips.push({ key: field.key, text: `From ${from} to ${to}` });
      continue;
    }

    if (field.type === 'boolean') {
      chips.push({ key: field.key, text: `${field.label} ${current === 'true' ? 'Yes' : 'No'}` });
      continue;
    }

    chips.push({ key: field.key, text: current });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-[12px]">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex h-[30px] items-center gap-[8px] rounded-pill bg-card-accent
                     px-[14px] text-data text-on-dark"
        >
          {chip.text}
          <button
            type="button"
            onClick={() => onRemove(chip.key)}
            aria-label={`Remove ${chip.text} filter`}
            className="transition-opacity hover:opacity-70"
          >
            <IconClose width={14} height={14} />
          </button>
        </span>
      ))}
    </div>
  );
}
