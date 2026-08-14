import { useCallback, useEffect, useMemo, useState } from 'react';
import AppShell from '../layouts/AppShell.jsx';
import RecordModal from '../components/form/RecordModal.jsx';
import { masters as mastersApi } from '../api/resources.js';
import { canDelete } from '../config/navigation.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { IconAdd, IconClose, IconEdit, IconTrash, IconPerson } from '../components/icons.jsx';

/**
 * "Add all the masters that can be selected in the master head field while fill
 * the input form."
 *
 * The Figma "loading" page has no Masters frame, so this follows the same
 * language as the rest of it: outlined white cards, Source Code Pro, and the
 * edit / delete icon pair used in the tables.
 */
const FIELDS = [
  { key: 'name', label: 'Master Head', icon: IconPerson },
  { key: 'mobile', label: 'Mobile no.' },
  { key: 'address', label: 'Address' },
];

const NO_FILTERS = {
  applied: {},
  setApplied: () => {},
  clear: () => {},
  remove: () => {},
  active: false,
};

export default function Masters() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  // The list endpoint returns every master with no paging, so this filters what
  // is already in hand rather than making a round trip per keystroke.
  //
  // Substring, unlike the filter panel: here you are looking for a name you
  // half-remember, so typing part of it has to work.
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.name, row.mobile, row.address].some((field) =>
        String(field ?? '').toLowerCase().includes(term),
      ),
    );
  }, [rows, search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await mastersApi.list();
      setRows(payload.masters);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing({ mode: 'create' });
    setForm({ name: '', mobile: '', address: '' });
  };

  const openEdit = (row) => {
    setEditing({ mode: 'edit', id: row.id });
    setForm({ name: row.name, mobile: row.mobile, address: row.address });
  };

  const submit = async () => {
    setBusy(true);
    try {
      if (editing.mode === 'create') await mastersApi.create(form);
      else await mastersApi.update(editing.id, form);
      setEditing(null);
      setForm(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete master ${row.name}?`)) return;
    setError('');
    try {
      await mastersApi.remove(row.id);
      await load();
    } catch (failure) {
      setError(failure.message);
    }
  };

  return (
    <AppShell
      title="Master"
      filters={NO_FILTERS}
      modalOpen={Boolean(editing)}
      toolbar={
        <>
          <div className="field-shell w-[260px]">
            <span className="field-icon" aria-hidden="true">
              <IconPerson width={18} height={18} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="search name, mobile or address"
              aria-label="Search masters"
              className="field-control"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="field-clear"
              >
                <IconClose width={16} height={16} />
              </button>
            )}
          </div>

          <button type="button" onClick={openCreate} className="btn-pill">
            <IconAdd width={17} height={17} />
            Add Masters
          </button>
        </>
      }
    >
      {error && <p className="mb-4 text-data text-danger">{error}</p>}
      {loading && <p className="text-data text-soft">Loading…</p>}

      {!loading && rows.length === 0 && (
        <p className="py-[120px] text-center font-mono text-title">No masters</p>
      )}

      {!loading && rows.length > 0 && visible.length === 0 && (
        <p className="py-[120px] text-center font-mono text-title">No master matches “{search}”</p>
      )}

      <ul className="grid grid-cols-1 gap-[24px] md:grid-cols-2 xl:grid-cols-3">
        {visible.map((row) => (
          <li
            key={row.id}
            className="flex min-h-[180px] flex-col rounded-[10px] border border-edge bg-surface p-[22px]"
          >
            <h3 className="font-mono text-title">Master Head - {row.name}</h3>
            {row.mobile && <p className="mt-[16px] text-data">Mobile no. - {row.mobile}</p>}
            {row.address && <p className="mt-[10px] text-data text-body">Address- {row.address}</p>}

            <div className="mt-auto flex justify-end gap-[10px] pt-6">
              <button
                type="button"
                onClick={() => openEdit(row)}
                aria-label="Edit"
                className="btn-icon"
              >
                <IconEdit width={17} height={17} />
              </button>
              {canDelete(user?.role) && (
                <button
                  type="button"
                  onClick={() => remove(row)}
                  aria-label="Delete"
                  className="btn-icon"
                >
                  <IconTrash width={17} height={17} />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {editing && form && (
        <RecordModal
          title={editing.mode === 'create' ? 'Create Master' : 'Edit Master'}
          subtitle="Master Head"
          sectionTitle="Master Information"
          fields={FIELDS}
          value={form}
          onChange={setForm}
          onSubmit={submit}
          onClose={() => {
            setEditing(null);
            setForm(null);
          }}
          submitLabel={editing.mode === 'create' ? 'Add Master' : 'Save changes'}
          busy={busy}
        />
      )}
    </AppShell>
  );
}
