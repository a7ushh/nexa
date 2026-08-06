import { IconClose } from '../icons.jsx';

/**
 * The outlined field from the new design: a leading icon cell on a pale fill,
 * the control, and a clear button once there is something to clear.
 */
export function Field({ id, label, icon: Icon, children, onClear, showClear }) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
        </label>
      )}
      <div className="field-shell">
        {Icon && (
          <span className="field-icon" aria-hidden="true">
            <Icon width={18} height={18} />
          </span>
        )}
        {children}
        {showClear && (
          <button type="button" onClick={onClear} aria-label="Clear" className="field-clear">
            <IconClose width={16} height={16} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Field wrapping a plain text or number input. */
export function TextField({
  id,
  label,
  icon,
  value,
  onChange,
  placeholder,
  type = 'text',
  readOnly,
  clearable = true,
}) {
  return (
    <Field
      id={id}
      label={label}
      icon={icon}
      showClear={clearable && !readOnly && Boolean(value)}
      onClear={() => onChange('')}
    >
      <input
        id={id}
        type={type}
        inputMode={type === 'number' ? 'decimal' : undefined}
        step={type === 'number' ? 'any' : undefined}
        min={type === 'number' ? 0 : undefined}
        readOnly={readOnly}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`field-control ${readOnly ? 'cursor-not-allowed text-body' : ''}`}
      />
    </Field>
  );
}

/** Field wrapping a select; the chevron is the browser's, styled to match. */
export function SelectField({ id, label, icon, value, onChange, options }) {
  return (
    <Field id={id} label={label} icon={icon}>
      <select
        id={id}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        className="field-control cursor-pointer appearance-none pr-8"
      >
        {options.map((option) => (
          <option key={String(option.value)} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

/**
 * The toggle used for Dupatta and Bottom - a pill track with a white knob,
 * navy when on.
 */
export function Toggle({ id, label, checked, onChange }) {
  return (
    <div className="flex items-center gap-4">
      {label && (
        <label htmlFor={id} className="text-data">
          {label}
        </label>
      )}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-[24px] w-[46px] shrink-0 rounded-pill transition-colors ${
          checked ? 'bg-accent' : 'bg-ink'
        }`}
      >
        <span
          className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-surface transition-all ${
            checked ? 'left-[25px]' : 'left-[3px]'
          }`}
        />
      </button>
    </div>
  );
}
