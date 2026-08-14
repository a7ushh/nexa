import { useCallback, useMemo, useRef, useState } from 'react';
import AppShell from '../layouts/AppShell.jsx';
import RecordSections from '../components/table/RecordSections.jsx';
import ColumnSelector from '../components/table/ColumnSelector.jsx';
import LotProgress from '../components/table/LotProgress.jsx';
import SelectionBar from '../components/table/SelectionBar.jsx';
import RecordModal from '../components/form/RecordModal.jsx';
import SearchSelect from '../components/form/SearchSelect.jsx';
import HistoryModal from '../components/HistoryModal.jsx';
import { grey as greyApi, masters as mastersApi } from '../api/resources.js';
import { useModulePage } from '../hooks/useModulePage.js';
import { formatDate, today } from '../utils/format.js';
import {
  IconAdd,
  IconChart,
  IconFabric,
  IconNumber,
  IconPerson,
} from '../components/icons.jsx';

/** steps.md "Grey" filter list, with the icons used in the Figma filter panel. */
const FILTER_FIELDS = [
  { key: 'lotNo', label: 'Lot no.', icon: IconNumber, placeholder: '123' },
  { key: 'masterHead', label: 'Master Head', icon: IconPerson, placeholder: 'Anil Sharma' },
  { key: 'fabric', label: 'Fabric', icon: IconFabric, placeholder: 'Cotton' },
  { key: 'chart', label: 'Chart', icon: IconChart, placeholder: 'design-07' },
  { key: 'dupatta', label: 'Dupatta', type: 'boolean' },
  { key: 'bottom', label: 'Bottom', type: 'boolean' },
  { key: 'date', label: 'Date', type: 'dateRange' },
];

/** steps.md "Grey" table columns. */
const COLUMNS = [
  { key: 'lotNo', label: 'Lot no.' },
  { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
  { key: 'masterHead', label: 'Master Head' },
  { key: 'fabric', label: 'Fabric' },
  { key: 'chart', label: 'Chart' },
  { key: 'cut', label: 'Cut' },
  { key: 'quantity', label: 'Quantity', align: 'right' },
  { key: 'dupatta', label: 'Dupatta', render: (row) => dupattaLabel(row.dupatta) },
  { key: 'bottom', label: 'Bottom', render: (row) => (row.bottom ? 'Yes' : 'No') },
  // Where the lot's pieces currently are, across both trades. Sorts by how far
  // through the chain the lot is, since the cell itself is a bar.
  {
    key: 'progress',
    label: 'Progress',
    block: true,
    // `onChanged` is bound in the component - closing a lot re-sections the
    // table, so the list has to reload. See `columns` below.
    render: (row) => <LotProgress row={row} />,
    sortValue: (row) => Number(row.stages?.completed ?? 0),
  },
];

const dupattaLabel = (value) => (value === 'no' ? 'No' : value.charAt(0).toUpperCase() + value.slice(1));

const emptyLot = () => ({
  date: today(),
  masterId: '',
  masterText: '',
  fabric: '',
  chart: '',
  cut: '',
  quantity: '',
  dupattaYes: false,
  dupatta: 'no',
  bottom: false,
});

export default function Grey() {
  const fetcher = useCallback((query) => greyApi.list(query), []);

  // Closing a lot moves it between sections, so the progress cell needs the
  // page's `reload`. A ref keeps `allColumns` referentially stable - rebuilding
  // it every render would restart the fetch loop in useRecords.
  const reloadRef = useRef(null);
  const columns = useMemo(
    () =>
      COLUMNS.map((column) =>
        column.key === 'progress'
          ? {
              ...column,
              render: (row) => <LotProgress row={row} onChanged={() => reloadRef.current?.()} />,
            }
          : column,
      ),
    [],
  );

  const searchMasters = useCallback(async (term) => {
    const payload = await mastersApi.search(term);
    return payload.masters;
  }, []);
  const page = useModulePage({ filterFields: FILTER_FIELDS, allColumns: columns, fetcher });
  reloadRef.current = page.reload;

  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [revisions, setRevisions] = useState({ loading: false, items: [] });

  const sections = useMemo(
    () => [
      {
        key: 'in_progress',
        label: 'In Progress',
        rows: page.rows.filter((row) => row.section === 'in_progress'),
      },
      {
        key: 'past',
        label: 'Past Records',
        rows: page.rows.filter((row) => row.section === 'past'),
      },
    ],
    [page.rows],
  );

  const fields = useMemo(
    () => [
      { key: 'date', label: 'Date', type: 'date' },
      {
        key: 'masterId',
        type: 'custom',
        render: ({ value, onChange }) => (
          <SearchSelect
            key="master"
            label="Master Head"
            icon={IconPerson}
            placeholder="type a name"
            text={value.masterText}
            onTextChange={(text) => onChange({ ...value, masterText: text, masterId: '' })}
            search={searchMasters}
            renderOption={(master) => (
              <span className="flex flex-col">
                <span className="font-semibold">{master.name}</span>
                {master.mobile && <span className="text-soft">{master.mobile}</span>}
              </span>
            )}
            onSelect={(master) =>
              onChange({ ...value, masterId: master.id, masterText: master.name })
            }
          />
        ),
      },
      { key: 'fabric', label: 'Fabric', icon: IconFabric },
      { key: 'chart', label: 'Chart', icon: IconChart },
      { key: 'cut', label: 'Cut' },
      { key: 'quantity', label: 'Quantity', type: 'number', icon: IconNumber },
      // "dupatta= if no is selected then no, else if yes then select whether
      // tone or contrast (select box appear in input box)"
      { key: 'dupattaYes', label: 'Dupatta', type: 'boolean' },
      {
        key: 'dupatta',
        label: 'Dupatta type',
        type: 'select',
        hidden: (value) => !value.dupattaYes,
        options: [
          { value: 'tone', label: 'Tone' },
          { value: 'contrast', label: 'Contrast' },
        ],
      },
      { key: 'bottom', label: 'Bottom', type: 'boolean' },
    ],
    [searchMasters],
  );

  const openCreate = () => {
    page.setEditing({ mode: 'create' });
    setForm(emptyLot());
  };

  const openEdit = (row) => {
    page.setEditing({ mode: 'edit', id: row.id, lotNo: row.lotNo });
    setForm({
      date: row.date,
      masterId: row.masterId ?? '',
      masterText: row.masterHead ?? '',
      fabric: row.fabric,
      chart: row.chart,
      cut: row.cut,
      quantity: String(row.quantity),
      dupattaYes: row.dupatta !== 'no',
      dupatta: row.dupatta === 'no' ? 'tone' : row.dupatta,
      bottom: row.bottom,
    });
  };

  const submit = async () => {
    setBusy(true);
    try {
      const body = {
        date: form.date,
        masterId: form.masterId === '' ? null : Number(form.masterId),
        fabric: form.fabric,
        chart: form.chart,
        cut: form.cut,
        quantity: Number(form.quantity || 0),
        dupatta: form.dupattaYes ? form.dupatta : 'no',
        bottom: form.bottom,
      };

      if (page.editing.mode === 'create') await greyApi.create(body);
      else await greyApi.update(page.editing.id, body);

      page.setEditing(null);
      setForm(null);
      await page.reload();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete lot ${row.lotNo}?`)) return;
    page.setActionError('');
    try {
      await greyApi.remove(row.id);
      await page.reload();
    } catch (failure) {
      page.setActionError(failure.message);
    }
  };

  const removeSelected = async () => {
    if (!window.confirm(`Delete ${page.selected.length} lot(s)?`)) return;
    page.setActionError('');
    try {
      await greyApi.removeMany(page.selected);
      page.clearSelection();
      await page.reload();
    } catch (failure) {
      page.setActionError(failure.message);
    }
  };

  const openHistory = async (row) => {
    page.setHistory(row);
    setRevisions({ loading: true, items: [] });
    const payload = await greyApi.history(row.id);
    setRevisions({ loading: false, items: payload.revisions });
  };

  return (
    <AppShell
      title="Grey"
      filterFields={FILTER_FIELDS}
      filters={page.filters}
      suggestScope="grey"
      modalOpen={Boolean(page.editing)}
      toolbar={
        <>
          <ColumnSelector
            columns={COLUMNS}
            visible={page.visibleColumns}
            onChange={page.setVisibleColumns}
            onClearFilters={page.filters.clear}
            filtersActive={page.filters.active}
          />
          <button type="button" onClick={openCreate} className="btn-pill">
            <IconAdd width={17} height={17} />Add Lot
          </button>
        </>
      }
    >
      {page.error && <p className="mb-4 text-data text-danger">{page.error}</p>}
      {page.actionError && <p className="mb-4 text-data text-danger">{page.actionError}</p>}
      {page.loading && <p className="text-data text-soft">Loading…</p>}

      <RecordSections
        sections={sections}
        columns={page.columns}
        cardTitle={(row) => `Lot no. - ${row.lotNo}`}
        roles={page.roles}
        actions={{
          selected: page.selected,
          onToggle: page.toggle,
          onToggleAll: page.setSelected,
          onEdit: openEdit,
          onDelete: remove,
          onHistory: openHistory,
        }}
      />

      <SelectionBar
        count={page.selected.length}
        canDelete={page.roles.canDelete}
        canShare={false}
        onDelete={removeSelected}
        onClear={page.clearSelection}
      />

      {page.editing && form && (
        <RecordModal
          title={page.editing.mode === 'create' ? 'Create Lot' : `Edit Lot ${page.editing.lotNo}`}
          subtitle="Grey Lot"
          sectionTitle="Lot Information"
          fields={fields}
          value={form}
          onChange={setForm}
          onSubmit={submit}
          onClose={() => {
            page.setEditing(null);
            setForm(null);
          }}
          submitLabel={page.editing.mode === 'create' ? 'Add Lot' : 'Save changes'}
          busy={busy}
        />
      )}

      {page.history && (
        <HistoryModal
          title={`Lot ${page.history.lotNo} — earlier versions`}
          revisions={revisions.items}
          loading={revisions.loading}
          onClose={() => page.setHistory(null)}
        />
      )}
    </AppShell>
  );
}
