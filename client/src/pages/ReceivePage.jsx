import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppShell from '../layouts/AppShell.jsx';
import RecordSections from '../components/table/RecordSections.jsx';
import ColumnSelector from '../components/table/ColumnSelector.jsx';
import SelectionBar from '../components/table/SelectionBar.jsx';
import RecordModal from '../components/form/RecordModal.jsx';
import SearchSelect from '../components/form/SearchSelect.jsx';
import HistoryModal from '../components/HistoryModal.jsx';
import ShareSheet from '../components/ShareSheet.jsx';
import { challans, masters as mastersApi } from '../api/resources.js';
import { useModulePage } from '../hooks/useModulePage.js';
import { formatDate, formatMoney, today } from '../utils/format.js';
import { IconAdd, IconChart, IconFabric, IconNumber, IconPerson } from '../components/icons.jsx';

/**
 * Receive challans for either trade. A receipt is always booked against an
 * issue challan, and may be partial - the server refuses anything beyond what
 * that challan still owes.
 *
 * Both trades carry the same columns and the same form; only the title differs.
 */
export default function ReceivePage({ kind }) {
  const api = useMemo(() => challans(kind), [kind]);
  const navigate = useNavigate();
  const location = useLocation();

  const filterFields = useMemo(
    () =>
      [
        { key: 'lotNo', label: 'Lot no.', icon: IconNumber, placeholder: '123' },
        { key: 'challanNo', label: 'Challan no.', icon: IconNumber, placeholder: '15' },
        { key: 'masterHead', label: 'Master Head', icon: IconPerson, placeholder: 'Anil Sharma' },
        { key: 'fabric', label: 'Fabric', icon: IconFabric, placeholder: 'Cotton' },
        { key: 'design', label: 'Design', icon: IconChart, placeholder: 'design-07' },
        { key: 'dupatta', label: 'Dupatta', type: 'boolean' },
        { key: 'date', label: 'Date', type: 'dateRange' },
      ],
    [],
  );

  const allColumns = useMemo(
    () =>
      [
        { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
        { key: 'lotNo', label: 'Lot no.' },
        { key: 'challanNo', label: 'Challan no.' },
        { key: 'retailChallanNo', label: 'Retail challan no.' },
        { key: 'masterHead', label: 'Master Head' },
        { key: 'fabric', label: 'Fabric' },
        { key: 'design', label: 'Design' },
        { key: 'dupatta', label: 'Dupatta', render: (row) => dupattaLabel(row.dupatta) },
        { key: 'dupQty', label: 'Dup. Qty', align: 'right' },
        { key: 'quantity', label: 'Quantity', align: 'right' },
        { key: 'damageLoss', label: 'Damage/Loss', align: 'right' },
        // Rate second to last, amount last.
        { key: 'rate', label: 'Rate', align: 'right' },
        { key: 'amount', label: 'Amount', align: 'right', render: (row) => formatMoney(row.amount) },
      ],
    [],
  );

  const fetcher = useCallback((query) => api.listReceives(query), [api]);
  const page = useModulePage({ filterFields, allColumns, fetcher });

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

  const searchIssues = useCallback(
    async (term) => {
      const payload = await api.searchIssues(term);
      return payload.rows;
    },
    [api],
  );

  const searchMasters = useCallback(async (term) => {
    const payload = await mastersApi.search(term);
    return payload.masters;
  }, []);

  // Mirrors utils/amounts.js: dupatta pieces when there are any, otherwise the
  // quantity - and damaged or lost pieces come off before the rate is applied.
  const amountPreview = (value) => {
    const dup = Number(value.dupQty || 0);
    const pieces = dup > 0 ? dup : Number(value.quantity || 0);
    const net = pieces - Number(value.damageLoss || 0);
    return formatMoney(Math.max(0, net) * Number(value.rate || 0));
  };

  const fields = useMemo(
    () =>
      [
        {
          key: 'issueChallanId',
          type: 'custom',
          render: ({ value, onChange }) => (
            <SearchSelect
              key="issue"
              label="Challan no."
              icon={IconNumber}
              placeholder="search issue challan"
              text={value.issueText}
              onTextChange={(text) => onChange({ ...value, issueText: text, issueChallanId: '' })}
              search={searchIssues}
              renderOption={(issue) => (
                <span className="flex flex-col">
                  <span className="font-semibold">{issue.challanNo}</span>
                  <span className="text-soft">
                    {issue.masterHead || 'no master'} · lot {issue.lotNo} · outstanding{' '}
                    {issue.outstandingPieces}
                  </span>
                </span>
              )}
              onSelect={(issue) =>
                onChange({
                  ...value,
                  issueChallanId: issue.id,
                  issueText: issue.challanNo,
                  lotId: issue.lotId,
                  lotNo: issue.lotNo,
                  masterId: issue.masterId ?? value.masterId,
                  masterText: issue.masterHead || value.masterText,
                  fabric: issue.fabric || value.fabric,
                  design: issue.design || value.design,
                  dupatta: issue.dupatta ?? value.dupatta,
                  rate: String(issue.rate ?? value.rate),
                  outstandingQty: issue.outstandingQty,
                  outstandingDup: issue.outstandingDup,
                })
              }
            />
          ),
        },
        { key: 'challanNo', label: 'Receive challan no.', icon: IconNumber },
        { key: 'retailChallanNo', label: 'Retail challan no.' },
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

        {
          key: 'dupatta',
          label: 'Dupatta',
          type: 'select',
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'diamond', label: 'Diamond' },
            { value: 'chain', label: 'Chain' },
            { value: 'plain', label: 'Plain' },
          ],
        },
        {
          key: 'dupQty',
          label: 'Dup. Qty',
          type: 'number',
          hint: (value) =>
            value.outstandingDup !== undefined ? `${value.outstandingDup} still due` : null,
        },
        {
          key: 'quantity',
          label: 'Quantity',
          type: 'number',
          hint: (value) =>
            value.outstandingQty !== undefined ? `${value.outstandingQty} still due` : null,
        },
        { key: 'damageLoss', label: 'Damage/Loss', type: 'number' },
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
    [searchIssues, searchMasters],
  );

  /**
   * `issue` prefills the form from an issue challan - the Not Received band on
   * the issue page hands one over, so booking a late receipt is one click
   * instead of retyping the challan number to find it again.
   */
  const openCreate = useCallback(
    async (issue) => {
      const { challanNo } = await api.nextReceiveNo();
      page.setEditing({ mode: 'create' });
      setForm({
        issueChallanId: issue?.id ?? '',
        issueText: issue?.challanNo ?? '',
        challanNo,
        retailChallanNo: '',
        lotId: issue?.lotId,
        lotNo: issue?.lotNo,
        masterId: issue?.masterId ?? '',
        masterText: issue?.masterHead ?? '',
        fabric: issue?.fabric ?? '',
        design: issue?.design ?? '',
        date: today(),
        dupatta: issue?.dupatta ?? 'yes',
        dupQty: '',
        quantity: '',
        rate: issue ? String(issue.rate ?? '') : '',
        damageLoss: '',
        outstandingQty: issue?.outstandingQty,
        outstandingDup: issue?.outstandingDup,
      });
    },
    // `page.setEditing` is stable; api changes only when the trade does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [api],
  );

  // Arriving from the Not Received band: open the form for that challan, then
  // drop the history state so a refresh does not reopen it.
  const fromIssue = location.state?.fromIssue;
  useEffect(() => {
    if (!fromIssue) return;
    openCreate(fromIssue);
    navigate(location.pathname, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromIssue]);

  function openEdit(row) {
    page.setEditing({ mode: 'edit', id: row.id, challanNo: row.challanNo });
    setForm({
      issueChallanId: row.issueChallanId,
      issueText: row.issueChallanNo,
      challanNo: row.challanNo,
      retailChallanNo: row.retailChallanNo,
      masterId: row.masterId ?? '',
      masterText: row.masterHead ?? '',
      fabric: row.fabric,
      design: row.design,
      date: row.date,
      dupatta: row.dupatta ?? 'yes',
      dupQty: String(row.dupQty ?? ''),
      quantity: String(row.quantity ?? ''),
      rate: String(row.rate ?? ''),
      damageLoss: String(row.damageLoss ?? ''),
    });
  }

  const submit = async () => {
    setBusy(true);
    try {
      const body = {
        challanNo: form.challanNo,
        retailChallanNo: form.retailChallanNo,
        date: form.date,
        issueChallanId: Number(form.issueChallanId),
        lotId: form.lotId ? Number(form.lotId) : null,
        masterId: form.masterId === '' ? null : Number(form.masterId),
        fabric: form.fabric,
        design: form.design,
        dupatta: form.dupatta,
        dupQty: Number(form.dupQty || 0),
        quantity: Number(form.quantity || 0),
        rate: Number(form.rate || 0),
        damageLoss: Number(form.damageLoss || 0),
      };

      if (page.editing.mode === 'create') await api.createReceive(body);
      else await api.updateReceive(page.editing.id, body);

      page.setEditing(null);
      setForm(null);
      await page.reload();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete receipt ${row.challanNo}?`)) return;
    page.setActionError('');
    try {
      await api.removeReceive(row.id);
      await page.reload();
    } catch (failure) {
      page.setActionError(failure.message);
    }
  };

  const removeSelected = async () => {
    if (!window.confirm(`Delete ${page.selected.length} receipt(s)?`)) return;
    page.setActionError('');
    try {
      await api.removeReceives(page.selected);
      page.clearSelection();
      await page.reload();
    } catch (failure) {
      page.setActionError(failure.message);
    }
  };

  const openHistory = async (row) => {
    page.setHistory(row);
    setRevisions({ loading: true, items: [] });
    const payload = await api.receiveHistory(row.id);
    setRevisions({ loading: false, items: payload.revisions });
  };

  const label = kind === 'handwork' ? 'Handwork / Receive' : 'Embroidery / Receive';

  return (
    <AppShell
      title={label}
      filterFields={filterFields}
      filters={page.filters}
      suggestScope="receive"
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
          <button type="button" onClick={() => openCreate()} className="btn-pill">
            <IconAdd width={17} height={17} />Receive Challan
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
            ? (row, intent) =>
                page.setShare({
                  kind,
                  direction: 'receive',
                  ids: [row.id],
                  masterHead: row.masterHead,
                  intent,
                })
            : undefined,
        }}
      />

      <SelectionBar
        count={page.selected.length}
        canDelete={page.roles.canDelete}
        canShare={page.roles.canShare}
        onDelete={removeSelected}
        onShare={(intent) =>
          page.setShare({ kind, direction: 'receive', ids: page.selected, intent })
        }
        onClear={page.clearSelection}
      />

      {page.editing && form && (
        <RecordModal
          title={
            page.editing.mode === 'create'
              ? 'Create Challan'
              : `Edit Receipt ${page.editing.challanNo}`
          }
          fields={fields}
          value={form}
          onChange={setForm}
          onSubmit={submit}
          onClose={() => {
            page.setEditing(null);
            setForm(null);
          }}
          subtitle="Receive Challan"
          submitLabel={page.editing.mode === 'create' ? 'Receive Challan' : 'Save changes'}
          busy={busy}
        />
      )}

      {page.history && (
        <HistoryModal
          title={`Receipt ${page.history.challanNo} — earlier versions`}
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
