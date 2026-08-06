import { useCallback, useMemo, useState } from 'react';
import AppShell from '../layouts/AppShell.jsx';
import RecordSections from '../components/table/RecordSections.jsx';
import ColumnSelector from '../components/table/ColumnSelector.jsx';
import SelectionBar from '../components/table/SelectionBar.jsx';
import RecordModal from '../components/form/RecordModal.jsx';
import SearchSelect from '../components/form/SearchSelect.jsx';
import HistoryModal from '../components/HistoryModal.jsx';
import ShareSheet from '../components/ShareSheet.jsx';
import DeadlineList from '../components/DeadlineList.jsx';
import { challans, grey as greyApi, masters as mastersApi } from '../api/resources.js';
import { useModulePage } from '../hooks/useModulePage.js';
import { formatDate, formatMoney, today } from '../utils/format.js';
import { IconAdd, IconChart, IconFabric, IconNumber, IconPerson } from '../components/icons.jsx';

/**
 * Issue challans for either trade. steps.md gives embroidery a dupatta and its
 * quantity; handwork has neither, so those columns and fields drop out.
 */
export default function IssuePage({ kind }) {
  const api = useMemo(() => challans(kind), [kind]);
  const isEmbroidery = kind === 'embroidery';

  const filterFields = useMemo(
    () =>
      [
        { key: 'lotNo', label: 'Lot no.', icon: IconNumber, placeholder: '123' },
        { key: 'challanNo', label: 'Challan no.', icon: IconNumber, placeholder: '15' },
        { key: 'masterHead', label: 'Master Head', icon: IconPerson, placeholder: 'Anil Sharma' },
        { key: 'fabric', label: 'Fabric', icon: IconFabric, placeholder: 'Cotton' },
        { key: 'design', label: 'Design', icon: IconChart, placeholder: 'design-07' },
        isEmbroidery && { key: 'dupatta', label: 'Dupatta', type: 'boolean' },
        { key: 'date', label: 'Date', type: 'dateRange' },
      ].filter(Boolean),
    [isEmbroidery],
  );

  const allColumns = useMemo(
    () =>
      [
        { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
        { key: 'lotNo', label: 'Lot no.' },
        { key: 'challanNo', label: 'Challan no.' },
        { key: 'masterHead', label: 'Master Head' },
        { key: 'fabric', label: 'Fabric' },
        { key: 'design', label: 'Design' },
        isEmbroidery && { key: 'dupatta', label: 'Dupatta', render: (row) => dupattaLabel(row.dupatta) },
        isEmbroidery && { key: 'dupQty', label: 'Dup. Qty', align: 'right' },
        { key: 'quantity', label: 'Quantity', align: 'right' },
        { key: 'rate', label: 'Rate', align: 'right' },
        { key: 'amount', label: 'Amount', align: 'right', render: (row) => formatMoney(row.amount) },
      ].filter(Boolean),
    [isEmbroidery],
  );

  const fetcher = useCallback((query) => api.listIssues(query), [api]);
  const page = useModulePage({ filterFields, allColumns, fetcher });

  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [revisions, setRevisions] = useState({ loading: false, items: [] });

  const sections = useMemo(
    () => [
      {
        key: 'not_received',
        label: 'Not Received',
        rows: page.rows.filter((row) => row.section === 'not_received'),
        render: (rows) => <DeadlineList rows={rows} onOpen={openEdit} />,
      },
      {
        key: 'in_progress',
        // An overdue challan is still outstanding, so it appears in the
        // Not Received band *and* here - it has not left the floor.
        label: 'In Progress',
        rows: page.rows.filter(
          (row) => row.section === 'in_progress' || row.section === 'not_received',
        ),
      },
      {
        key: 'past',
        label: 'Past Records',
        rows: page.rows.filter((row) => row.section === 'past'),
      },
    ],
    // openEdit is stable enough for this list; rows are the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page.rows],
  );

  const searchLots = useCallback(async (term) => {
    const payload = await greyApi.search(term);
    return payload.rows;
  }, []);

  const searchMasters = useCallback(async (term) => {
    const payload = await mastersApi.search(term);
    return payload.masters;
  }, []);

  // The dupatta toggle governs the dupatta fields only. Quantity is always
  // part of the challan and always part of the amount.
  const amountPreview = (value) => {
    const dup = isEmbroidery && value.dupattaYes ? Number(value.dupQty || 0) : 0;
    return formatMoney((dup + Number(value.quantity || 0)) * Number(value.rate || 0));
  };

  const fields = useMemo(
    () =>
      [
        {
          key: 'lotId',
          type: 'custom',
          render: ({ value, onChange }) => (
            <SearchSelect
              key="lot"
              label="Lot no."
              icon={IconNumber}
              placeholder="search lot number"
              text={value.lotText}
              onTextChange={(text) => onChange({ ...value, lotText: text, lotId: '' })}
              search={searchLots}
              renderOption={(lot) => (
                <span className="flex flex-col">
                  <span className="font-semibold">{lot.lotNo}</span>
                  <span className="text-soft">
                    remaining {lot.remainingQty}
                    {lot.dupatta !== 'no' && ` · dupatta ${lot.remainingDup} (${lot.dupatta})`}
                    {lot.fabric && ` · ${lot.fabric}`}
                  </span>
                </span>
              )}
              onSelect={(lot) =>
                // "every detail should be fetched and paste in their respective
                // fields ... But can be editable."
                onChange({
                  ...value,
                  lotId: lot.id,
                  lotText: lot.lotNo,
                  fabric: lot.fabric || value.fabric,
                  masterId: lot.masterId ?? value.masterId,
                  masterText: lot.masterHead || value.masterText,
                  remainingQty: lot.remainingQty,
                  remainingDup: lot.remainingDup,
                })
              }
            />
          ),
        },
        { key: 'challanNo', label: 'Challan no.', icon: IconNumber, placeholder: '15' },
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
        { key: 'fabric', label: 'Fabric', icon: IconFabric, placeholder: 'Cotton' },
        { key: 'design', label: 'Design', icon: IconChart, placeholder: 'design-07' },
        { key: 'date', label: 'Date', type: 'date' },

        // "dupatta= if no is selected then select whether diamond or chain or
        // plain, else if yes then yes"
        // The Dupatta toggle reveals the finish and the dupatta quantity;
        // turning it off hides both and bills no dupatta pieces.
        isEmbroidery && { key: 'dupattaYes', label: 'Dupatta', type: 'boolean' },
        isEmbroidery && {
          key: 'dupatta',
          label: 'Dupatta finish',
          type: 'select',
          hidden: (value) => value.dupattaYes,
          options: [
            { value: 'diamond', label: 'Diamond' },
            { value: 'chain', label: 'Chain' },
            { value: 'plain', label: 'Plain' },
          ],
        },
        isEmbroidery && {
          key: 'dupQty',
          label: 'Dup. Qty',
          type: 'number',
          hidden: (value) => !value.dupattaYes,
          hint: (value) =>
            value.remainingDup !== undefined ? `lot has ${value.remainingDup} left` : null,
        },
        {
          key: 'quantity',
          label: 'Quantity',
          type: 'number',
          hint: (value) =>
            value.remainingQty !== undefined ? `lot has ${value.remainingQty} left` : null,
        },
        { key: 'rate', label: 'Rate', type: 'number' },
        {
          key: 'amount',
          type: 'custom',
          render: ({ value }) => (
            <div key="amount">
              <span className="field-label">Amount</span>
              <div className="field-shell">
                <span className="field-icon" aria-hidden="true">
                  <IconNumber width={18} height={18} />
                </span>
                <span className="flex flex-1 items-center px-3 text-data text-body">
                  {amountPreview(value)}
                </span>
              </div>
            </div>
          ),
        },
      ].filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isEmbroidery, searchLots, searchMasters],
  );

  async function openCreate() {
    const { challanNo } = await api.nextIssueNo();
    page.setEditing({ mode: 'create' });
    setForm({
      lotId: '',
      lotText: '',
      challanNo,
      masterId: '',
      masterText: '',
      fabric: '',
      design: '',
      date: today(),
      dupattaYes: false,
      dupatta: 'diamond',
      dupQty: '',
      quantity: '',
      rate: '',
    });
  }

  function openEdit(row) {
    page.setEditing({ mode: 'edit', id: row.id, challanNo: row.challanNo });
    setForm({
      lotId: row.lotId,
      lotText: row.lotNo,
      challanNo: row.challanNo,
      masterId: row.masterId ?? '',
      masterText: row.masterHead ?? '',
      fabric: row.fabric,
      design: row.design,
      date: row.date,
      dupattaYes: row.dupatta === 'yes',
      dupatta: row.dupatta === 'yes' ? 'diamond' : (row.dupatta ?? 'diamond'),
      dupQty: String(row.dupQty ?? ''),
      quantity: String(row.quantity ?? ''),
      rate: String(row.rate ?? ''),
    });
  }

  const submit = async () => {
    setBusy(true);
    try {
      const body = {
        challanNo: form.challanNo,
        date: form.date,
        lotId: Number(form.lotId),
        masterId: form.masterId === '' ? null : Number(form.masterId),
        fabric: form.fabric,
        design: form.design,
        dupatta: isEmbroidery ? (form.dupattaYes ? 'yes' : form.dupatta) : null,
        dupQty: isEmbroidery && form.dupattaYes ? Number(form.dupQty || 0) : 0,
        quantity: Number(form.quantity || 0),
        rate: Number(form.rate || 0),
      };

      if (page.editing.mode === 'create') await api.createIssue(body);
      else await api.updateIssue(page.editing.id, body);

      page.setEditing(null);
      setForm(null);
      await page.reload();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete challan ${row.challanNo}?`)) return;
    page.setActionError('');
    try {
      await api.removeIssue(row.id);
      await page.reload();
    } catch (failure) {
      page.setActionError(failure.message);
    }
  };

  const removeSelected = async () => {
    if (!window.confirm(`Delete ${page.selected.length} challan(s)?`)) return;
    page.setActionError('');
    try {
      await api.removeIssues(page.selected);
      page.clearSelection();
      await page.reload();
    } catch (failure) {
      page.setActionError(failure.message);
    }
  };

  const openHistory = async (row) => {
    page.setHistory(row);
    setRevisions({ loading: true, items: [] });
    const payload = await api.issueHistory(row.id);
    setRevisions({ loading: false, items: payload.revisions });
  };

  const label = kind === 'handwork' ? 'Handwork / Issue' : 'Embroidery / Issue';

  return (
    <AppShell
      title={label}
      filterFields={filterFields}
      filters={page.filters}
      suggestScope="issue"
      suggestKind={kind}
      modalOpen={Boolean(page.editing)}
      toolbar={
        <>
          <ColumnSelector
            columns={allColumns}
            visible={page.visibleColumns}
            onChange={page.setVisibleColumns}
            onClearFilters={page.filters.clear}
            filtersActive={page.filters.active}
          />
          <button type="button" onClick={openCreate} className="btn-pill">
            <IconAdd width={17} height={17} />Add Challan
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
        cardTitle={(row) => `Challan no. - ${row.challanNo}`}
        roles={page.roles}
        actions={{
          selected: page.selected,
          onToggle: page.toggle,
          onToggleAll: page.setSelected,
          onEdit: openEdit,
          onDelete: remove,
          onHistory: openHistory,
          onShare: page.roles.canShare
            ? (row) => page.setShare({ kind, direction: 'issue', ids: [row.id] })
            : undefined,
        }}
      />

      <SelectionBar
        count={page.selected.length}
        canDelete={page.roles.canDelete}
        canShare={page.roles.canShare}
        onDelete={removeSelected}
        onShare={() => page.setShare({ kind, direction: 'issue', ids: page.selected })}
        onClear={page.clearSelection}
      />

      {page.editing && form && (
        <RecordModal
          title={
            page.editing.mode === 'create'
              ? 'Create Challan'
              : `Edit Challan ${page.editing.challanNo}`
          }
          fields={fields}
          value={form}
          onChange={setForm}
          onSubmit={submit}
          onClose={() => {
            page.setEditing(null);
            setForm(null);
          }}
          subtitle="Issue Challan"
          submitLabel={page.editing.mode === 'create' ? 'Issue Challan' : 'Save changes'}
          busy={busy}
        />
      )}

      {page.history && (
        <HistoryModal
          title={`Challan ${page.history.challanNo} — earlier versions`}
          revisions={revisions.items}
          loading={revisions.loading}
          onClose={() => page.setHistory(null)}
        />
      )}

      <ShareSheet request={page.share} onClose={() => page.setShare(null)} />
    </AppShell>
  );
}

const dupattaLabel = (value) => {
  if (!value) return '—';
  return value === 'yes' ? 'Yes' : value.charAt(0).toUpperCase() + value.slice(1);
};
