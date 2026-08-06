import { useEffect, useMemo, useRef, useState } from 'react';
import Popover from '../Popover.jsx';
import { IconCalendar, IconChevronLeft, IconChevronRight, IconClose } from '../icons.jsx';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const pad = (n) => String(n).padStart(2, '0');
const toISO = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const sameDay = (a, b) =>
  a && b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

function parse(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Month + year with arrow navigation, a Mon-Sun grid, the selected day ringed
 * and today marked with a dot.
 *
 * The calendar is rendered through Popover, so it escapes the scrolling filter
 * panel and form instead of being clipped by them.
 */
export default function DatePicker({ id, label, value, onChange, icon = IconCalendar, clearable = true }) {
  const [open, setOpen] = useState(false);
  const selected = parse(value);
  const [cursor, setCursor] = useState(() => selected ?? new Date());
  const anchor = useRef(null);

  useEffect(() => {
    if (selected) setCursor(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const today = new Date();

  /** Six weeks of dates, starting on the Monday on or before the 1st. */
  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // shift so Monday is 0
    const start = new Date(first);
    start.setDate(first.getDate() - offset);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [cursor]);

  const step = (months) =>
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + months, 1));

  const Icon = icon;

  return (
    <div>
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
        </label>
      )}

      <div ref={anchor} className="field-shell">
        {Icon && (
          <span className="field-icon" aria-hidden="true">
            <Icon width={18} height={18} />
          </span>
        )}
        <button
          id={id}
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="field-control flex items-center text-left"
        >
          {selected ? formatLong(selected) : <span className="text-soft">Select date</span>}
        </button>
        {clearable && value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear date"
            className="field-clear"
          >
            <IconClose width={16} height={16} />
          </button>
        )}
      </div>

      <Popover anchorRef={anchor} open={open} onClose={() => setOpen(false)} width={300}>
        <div className="p-[16px]" role="dialog" aria-label="Choose date">
          <div className="mb-[12px] flex items-center justify-between">
            <span className="font-mono text-data font-bold">
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </span>
            <div className="flex items-center gap-[8px]">
              <button type="button" onClick={() => step(-1)} aria-label="Previous month" className="btn-icon">
                <IconChevronLeft width={18} height={18} />
              </button>
              <button type="button" onClick={() => step(1)} aria-label="Next month" className="btn-icon">
                <IconChevronRight width={18} height={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-y-[2px]">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-[4px] text-center text-note text-soft">
                {day}
              </span>
            ))}

            {days.map((date) => {
              const outside = date.getMonth() !== cursor.getMonth();
              const isSelected = sameDay(date, selected);
              const isToday = sameDay(date, today);

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => {
                    onChange(toISO(date));
                    setOpen(false);
                  }}
                  className={`relative mx-auto flex h-[32px] w-[32px] items-center justify-center
                              rounded-full text-data transition-colors
                              ${outside ? 'text-soft/50' : 'text-ink_text'}
                              ${isSelected ? 'font-bold text-accent ring-2 ring-accent' : 'hover:bg-offwhite'}`}
                >
                  {date.getDate()}
                  {isToday && !isSelected && (
                    <span className="absolute bottom-[3px] h-[4px] w-[4px] rounded-full bg-danger" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-[12px] flex items-center justify-between border-t border-edge pt-[10px]">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="text-data text-accent"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(toISO(today));
                setCursor(today);
                setOpen(false);
              }}
              className="text-data text-accent"
            >
              Today
            </button>
          </div>
        </div>
      </Popover>
    </div>
  );
}

function formatLong(date) {
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}
