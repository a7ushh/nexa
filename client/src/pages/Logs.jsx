import { useCallback, useEffect, useState } from 'react';
import AppShell from '../layouts/AppShell.jsx';
import { logs as logsApi } from '../api/resources.js';

const NO_FILTERS = {
  applied: {},
  setApplied: () => {},
  clear: () => {},
  remove: () => {},
  active: false,
};

/**
 * "It shows every change onto the web application. All logins and exits for
 * every user." Root only.
 *
 * The Figma file has no Log frame, so this mirrors the Users table.
 */
export default function Logs() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await logsApi.list(300);
      setRows(payload.logs);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppShell
      title="Log"
      filters={NO_FILTERS}
      toolbar={
        <button type="button" onClick={load} className="btn-pill">
          Refresh
        </button>
      }
    >
      <h1 className="mb-6 font-mono text-heading font-bold">Log -</h1>

      {error && <p className="mb-4 text-data text-danger">{error}</p>}
      {loading && <p className="text-data text-soft">Loading…</p>}

      <div className="overflow-x-auto rounded-[10px] border border-edge bg-surface">
        <table className="w-full min-w-[900px] border-collapse text-note">
          <thead>
            <tr className="bg-table-head text-left">
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Entity</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Detail</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className={index % 2 === 1 ? 'bg-offwhite' : 'bg-surface'}>
                <td className="px-4 py-2 whitespace-nowrap">
                  {new Date(row.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2">{row.user_name || row.user_email || '—'}</td>
                <td className="px-4 py-2 capitalize">{row.role || '—'}</td>
                <td className="px-4 py-2 font-semibold">{row.action}</td>
                <td className="px-4 py-2">
                  {row.entity ? `${row.entity}${row.entity_id ? ` #${row.entity_id}` : ''}` : '—'}
                </td>
                <td className="px-4 py-2">{row.company_name || '—'}</td>
                <td className="px-4 py-2 text-body">
                  {row.details ? JSON.stringify(row.details) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && rows.length === 0 && (
        <p className="text-data text-soft">Nothing logged yet.</p>
      )}
    </AppShell>
  );
}
