import { useCallback, useEffect, useState } from 'react';

/**
 * Loads a list from the API and re-loads it whenever the filters or the fetcher
 * change.
 *
 * `fetcher` must be memoised by the caller (it is, via useCallback keyed on the
 * module's api object). It belongs in the dependency list: Embroidery and
 * Handwork render the *same* component with a different `kind`, so React reuses
 * the instance and only the fetcher identity tells us the module changed.
 */
export function useRecords(fetcher, filters) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const key = JSON.stringify(filters ?? {});

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await fetcher(JSON.parse(key));
      setRows(payload.rows ?? []);
    } catch (failure) {
      setError(failure.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [key, fetcher]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { rows, loading, error, reload };
}
