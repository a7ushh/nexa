import { useEffect, useRef } from 'react';

/**
 * The PIN boxes from the new design: pale rounded squares in Source Code Pro,
 * split into two groups with a dash between them.
 *
 * Length stays at the app's configured 4 digits - the design draws six, but the
 * PIN length is a functional rule (validation, the seeded root account and the
 * setup script all use four), so only the styling is adopted here.
 */
export default function PinInput({ value, onChange, length = 4, autoFocus = false, label }) {
  const refs = useRef([]);
  const half = Math.ceil(length / 2);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const handleChange = (index) => (event) => {
    const digits = event.target.value.replace(/\D/g, '');

    if (!digits) {
      onChange(value.slice(0, index));
      return;
    }

    if (digits.length > 1) {
      const merged = (value.slice(0, index) + digits).slice(0, length);
      onChange(merged);
      refs.current[Math.min(merged.length, length - 1)]?.focus();
      return;
    }

    const chars = value.split('');
    chars[index] = digits;
    onChange(chars.join('').slice(0, length));
    if (index < length - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index) => (event) => {
    if (event.key === 'Backspace' && !value[index] && index > 0) refs.current[index - 1]?.focus();
    if (event.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < length - 1) refs.current[index + 1]?.focus();
  };

  return (
    <div className="flex items-center gap-[14px]" role="group" aria-label={label}>
      {Array.from({ length }, (_, index) => (
        <div key={index} className="flex items-center gap-[14px]">
          {index === half && <span aria-hidden="true" className="font-mono text-title">-</span>}
          <input
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={length}
            aria-label={`${label} digit ${index + 1}`}
            value={value[index] ?? ''}
            onChange={handleChange(index)}
            onKeyDown={handleKeyDown(index)}
            className="h-[58px] w-[58px] rounded-[10px] bg-pin-box text-center font-mono
                       text-title text-ink_text outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
      ))}
    </div>
  );
}
