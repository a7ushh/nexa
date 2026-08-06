import { useEffect, useRef, useState } from 'react';
import Popover from '../Popover.jsx';
import { IconClose } from '../icons.jsx';
import { suggestions as suggestionsApi } from '../../api/resources.js';

/**
 * A filter input that suggests values already present in the data, and accepts
 * several alternatives separated by `/` - `cotton / micro` matches either.
 *
 * Only the segment currently being typed is used as the search term, and
 * picking a suggestion replaces that segment, so a list can be built up one
 * value at a time.
 */
export default function SuggestField({ field, value, onChange, scope, kind, dark = true }) {
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const anchor = useRef(null);
  const id = `filter-${field.key}`;
  const Icon = field.icon;

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const payload = await suggestionsApi.list({
          scope,
          kind,
          field: field.key,
          q: value ?? '',
        });
        if (!cancelled) setOptions(payload.values);
      } catch {
        if (!cancelled) setOptions([]);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, scope, kind, field.key]);

  /** Replace the segment being typed, keeping any earlier ones. */
  const choose = (picked) => {
    const segments = String(value ?? '').split('/');
    segments[segments.length - 1] = ` ${picked}`;
    const next = segments.join('/').replace(/^\s+/, '');
    onChange(field.key, next);
    setOpen(false);
  };

  return (
    <div>
      <label htmlFor={id} className={`field-label ${dark ? 'text-on-dark' : ''}`}>
        {field.label}
      </label>

      <div ref={anchor} className="field-shell">
        {Icon && (
          <span className="field-icon" aria-hidden="true">
            <Icon width={18} height={18} />
          </span>
        )}
        <input
          id={id}
          type="text"
          autoComplete="off"
          value={value ?? ''}
          placeholder={field.placeholder ?? ''}
          onChange={(event) => {
            onChange(field.key, event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="field-control"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange(field.key, '')}
            aria-label={`Clear ${field.label}`}
            className="field-clear"
          >
            <IconClose width={16} height={16} />
          </button>
        )}
      </div>

      <Popover anchorRef={anchor} open={open && options.length > 0} onClose={() => setOpen(false)}>
        <ul role="listbox" className="py-1">
          {options.map((option) => (
            <li key={option}>
              <button
                type="button"
                onClick={() => choose(option)}
                className="w-full px-4 py-2 text-left text-data transition-colors hover:bg-offwhite"
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      </Popover>
    </div>
  );
}
