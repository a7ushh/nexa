import { useEffect, useRef, useState } from 'react';
import Popover from '../Popover.jsx';
import { IconClose } from '../icons.jsx';

/**
 * The type-ahead used by Lot no., Challan no. and Master Head.
 *
 * steps.md, challan form: "input field lot no. works as search bar it show the
 * all the matches lot no. and remaining quantity of lot and dupatta seperatly
 * and user select it." The receive form does the same with challan numbers and
 * their master head.
 *
 * Choosing a suggestion prefills the rest of the form; every field stays
 * editable afterwards. The list renders through Popover so it is never clipped
 * by the scrolling form or filter panel.
 */
export default function SearchSelect({
  label,
  icon: Icon,
  placeholder,
  text,
  onTextChange,
  search,
  renderOption,
  onSelect,
  disabled,
  // Optional per-option row classes - the lot field tints each row by where the
  // lot stands. A caller that supplies a background must supply its own hover
  // too, or the default would paint over the colour on mouseover.
  optionClassName,
}) {
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const anchor = useRef(null);
  const id = `search-${label}`;

  // Debounced lookup so typing does not fire a request per keystroke.
  useEffect(() => {
    const term = text?.trim();
    if (!term) {
      setOptions([]);
      setOpen(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const found = await search(term);
        if (!cancelled) {
          setOptions(found);
          setOpen(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text, search]);

  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
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
          disabled={disabled}
          value={text ?? ''}
          placeholder={placeholder}
          onChange={(event) => onTextChange(event.target.value)}
          onFocus={() => options.length > 0 && setOpen(true)}
          className="field-control"
        />
        {text && (
          <button
            type="button"
            onClick={() => onTextChange('')}
            aria-label={`Clear ${label}`}
            className="field-clear"
          >
            <IconClose width={16} height={16} />
          </button>
        )}
      </div>

      <Popover anchorRef={anchor} open={open} onClose={() => setOpen(false)}>
        <ul role="listbox" className="py-1">
          {loading && <li className="px-4 py-2 text-data text-soft">Searching…</li>}

          {!loading && options.length === 0 && (
            <li className="px-4 py-2 text-data text-soft">No match.</li>
          )}

          {options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(option);
                  setOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-data transition-colors ${
                  optionClassName?.(option) || 'hover:bg-offwhite'
                }`}
              >
                {renderOption(option)}
              </button>
            </li>
          ))}
        </ul>
      </Popover>
    </div>
  );
}
