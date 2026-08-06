import { useCallback, useMemo, useState } from 'react';

/**
 * Filter state shared by every module page.
 *
 * The drawer edits a draft; `applied` is what the API sees. Date ranges are
 * held as `{from, to}` and flattened to dateFrom/dateTo for the query.
 *
 * A field may declare a `default`, which is where Clear returns it to. The
 * report's include-embroidery / include-handwork toggles use that so they start
 * switched on, and `active` ignores anything still sitting at its default.
 */
export function useFilters(fields) {
  const empty = useMemo(() => {
    const state = {};
    for (const field of fields) {
      if (field.type === 'dateRange') state[field.key] = { from: '', to: '' };
      else state[field.key] = field.default ?? '';
    }
    return state;
  }, [fields]);

  const [applied, setApplied] = useState(empty);

  const clear = useCallback(() => setApplied(empty), [empty]);

  const remove = useCallback(
    (key) => {
      const field = fields.find((item) => item.key === key);
      setApplied((current) => ({
        ...current,
        [key]: field?.type === 'dateRange' ? { from: '', to: '' } : field?.default ?? '',
      }));
    },
    [fields],
  );

  /** Shape the API expects. */
  const query = useMemo(() => {
    const result = {};
    for (const field of fields) {
      const value = applied[field.key];
      if (field.type === 'dateRange') {
        if (value?.from) result.dateFrom = value.from;
        if (value?.to) result.dateTo = value.to;
      } else if (value !== '' && value !== undefined && value !== null) {
        result[field.key] = value;
      }
    }
    return result;
  }, [applied, fields]);

  // Only count filters the user actually changed.
  const active = useMemo(
    () => fields.some((field) => !isDefault(field, applied[field.key])),
    [applied, fields],
  );

  return { applied, setApplied, clear, remove, query, active };
}

function isDefault(field, value) {
  if (field.type === 'dateRange') return !value?.from && !value?.to;
  return value === (field.default ?? '');
}
