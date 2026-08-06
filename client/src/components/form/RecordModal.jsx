import { useEffect, useState } from 'react';
import { Field, Toggle } from './Field.jsx';
import DatePicker from './DatePicker.jsx';
import { IconClose } from '../icons.jsx';

/**
 * The record form from the new design.
 *
 * It is a full page rather than a modal over the table: a heading, a subtitle,
 * a "Challan Information" section, a three-column grid of outlined fields, and
 * Cancel / confirm at the bottom right. It keeps the component's original API,
 * so every module page passes the same field descriptors as before.
 */
export default function RecordModal({
  title,
  subtitle,
  sectionTitle = 'Challan Information',
  fields,
  value,
  onChange,
  onSubmit,
  onClose,
  submitLabel,
  busy,
  error,
  headerToggle,
}) {
  const [localError, setLocalError] = useState('');

  useEffect(() => setLocalError(''), [value]);

  const submit = async (event) => {
    event.preventDefault();
    setLocalError('');
    try {
      await onSubmit();
    } catch (failure) {
      setLocalError(failure.message);
    }
  };

  const visible = fields.filter((field) => !field.hidden?.(value));

  return (
    <div className="absolute inset-0 z-40 overflow-y-auto bg-offwhite">
      <form onSubmit={submit} className="min-h-full px-[68px] pb-[40px] pt-[40px]" role="dialog" aria-label={title}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-mono text-heading font-semibold">{title}</h2>
            {subtitle && <p className="mt-[2px] font-mono text-data text-body">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-[26px]">
            {/* Form-level switch, e.g. "Only Dupatta" on an issue challan. */}
            {headerToggle && (
              <Toggle
                id="record-header-toggle"
                label={headerToggle.label}
                checked={headerToggle.checked}
                onChange={headerToggle.onChange}
              />
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="btn-icon h-[32px] w-[32px]"
            >
              <IconClose width={20} height={20} />
            </button>
          </div>
        </div>

        <h3 className="mt-[30px] font-mono text-title font-semibold">{sectionTitle}</h3>

        <div className="mt-[20px] grid grid-cols-1 gap-x-[70px] gap-y-[26px] md:grid-cols-2 xl:grid-cols-3">
          {visible.map((field) => (
            <FormField key={field.key} field={field} value={value} onChange={onChange} />
          ))}
        </div>

        {(error || localError) && (
          <p className="mt-8 text-data text-danger">{error || localError}</p>
        )}

        <div className="mt-[60px] flex justify-end gap-[18px]">
          <button type="button" onClick={onClose} className="btn-danger-outline">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="btn-accent">
            {busy ? 'Saving…' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

function FormField({ field, value, onChange }) {
  const current = value[field.key];
  const set = (next) => onChange({ ...value, [field.key]: next });

  if (field.type === 'custom') {
    return field.render({ value, onChange, set, current });
  }

  const id = `field-${field.key}`;

  if (field.type === 'boolean') {
    return (
      <div className="pt-[26px]">
        <Toggle id={id} label={field.label} checked={Boolean(current)} onChange={set} />
      </div>
    );
  }

  if (field.type === 'date') {
    return <DatePicker id={id} label={field.label} value={current} onChange={set} />;
  }

  if (field.type === 'select') {
    return (
      <Field id={id} label={field.label} icon={field.icon}>
        <select
          id={id}
          value={current ?? ''}
          onChange={(event) => set(event.target.value)}
          className="field-control cursor-pointer"
        >
          {field.options.map((option) => (
            <option key={String(option.value)} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
    );
  }

  const isNumber = field.type === 'number';

  return (
    <div>
      <Field
        id={id}
        label={field.label}
        icon={field.icon}
        showClear={!field.readOnly && Boolean(current)}
        onClear={() => set('')}
      >
        <input
          id={id}
          type={isNumber ? 'number' : 'text'}
          inputMode={isNumber ? 'decimal' : undefined}
          step={isNumber ? 'any' : undefined}
          min={isNumber ? 0 : undefined}
          readOnly={field.readOnly}
          value={current ?? ''}
          placeholder={field.placeholder ?? ''}
          onChange={(event) => set(event.target.value)}
          className={`field-control ${field.readOnly ? 'cursor-not-allowed text-body' : ''}`}
        />
      </Field>
      {field.hint && <p className="mt-[6px] text-note text-soft">{field.hint(value)}</p>}
    </div>
  );
}
