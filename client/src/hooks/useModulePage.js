import { useCallback, useMemo, useState } from 'react';
import { useFilters } from './useFilters.js';
import { useRecords } from './useRecords.js';
import { canDelete as roleCanDelete, canShare as roleCanShare } from '../config/navigation.js';
import { useAuth } from './useAuth.jsx';

/**
 * The state every module page shares: filters, rows, row selection, visible
 * columns, the open modal, and the history / share panels.
 */
export function useModulePage({ filterFields, allColumns, fetcher }) {
  const { user } = useAuth();
  const filters = useFilters(filterFields);

  const fetch = useCallback((query) => fetcher(query), [fetcher]);
  const { rows, loading, error, reload } = useRecords(fetch, filters.query);

  const [visibleColumns, setVisibleColumns] = useState([]);
  const [selected, setSelected] = useState([]);
  const [editing, setEditing] = useState(null);
  const [history, setHistory] = useState(null);
  const [share, setShare] = useState(null);
  const [actionError, setActionError] = useState('');

  // "if nothing is selected then display the all columns"
  const columns = useMemo(
    () =>
      visibleColumns.length === 0
        ? allColumns
        : allColumns.filter((column) => visibleColumns.includes(column.key)),
    [allColumns, visibleColumns],
  );

  const toggle = useCallback((id) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }, []);

  const clearSelection = useCallback(() => setSelected([]), []);

  return {
    user,
    filters,
    rows,
    loading,
    error,
    reload,
    columns,
    allColumns,
    visibleColumns,
    setVisibleColumns,
    selected,
    setSelected,
    toggle,
    clearSelection,
    editing,
    setEditing,
    history,
    setHistory,
    share,
    setShare,
    actionError,
    setActionError,
    roles: {
      canDelete: roleCanDelete(user?.role),
      canShare: roleCanShare(user?.role),
    },
  };
}
