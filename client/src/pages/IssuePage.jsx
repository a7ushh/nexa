import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../layouts/AppShell.jsx';
import RecordSections from '../components/table/RecordSections.jsx';
import ColumnSelector from '../components/table/ColumnSelector.jsx';
import SelectionBar from '../components/table/SelectionBar.jsx';
import RecordModal from '../components/form/RecordModal.jsx';
import SearchSelect from '../components/form/SearchSelect.jsx';
import HistoryModal from '../components/HistoryModal.jsx';
import ReceiptsModal from '../components/ReceiptsModal.jsx';
import ShareSheet from '../components/ShareSheet.jsx';
import DeadlineList from '../components/DeadlineList.jsx';
import { challans, grey as greyApi, masters as mastersApi } from '../api/resources.js';
import { currentStage } from '../config/lotStages.js';
import { useModulePage } from '../hooks/useModulePage.js';
import { formatDate, formatMoney, today } from '../utils/format.js';
import { IconAdd, IconChart, IconFabric, IconNumber, IconPerson } from '../components/icons.jsx';

/**
 * Issue challans for either trade.
 *
 * Both trades carry the same columns and the same form - only the page title
 * differs. What still differs is the quantity chain behind them: embroidery
 * draws on the lot, handwork on what embroidery gave back (utils/quantities.js).
 */
export default function IssuePage({ kind }) {
  const api = useMemo(() => challans(kind), [kind]);
  const navigate = useNavigate();

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
        { key: 'masterHead', label: 'Master Head' },
        { key: 'fabric', label: 'Fabric' },
        { key: 'design', label: 'Design' },
        { key: 'dupatta', label: 'Dupatta', render: (row) => dupattaLabel(row.dupatta) },
        { key: 'dupQty', label: 'Dup. Qty', align: 'right' },
        { key: 'quantity', label: 'Quantity', align: 'right' },
        { key: 'rate', label: 'Rate', align: 'right' },
        { key: 'amount', label: 'Amount', align: 'right', render: (row) => formatMoney(row.amount) },
      ],
    [],
  );

  const fetcher = useCallback((query) => api.listIssues(query), [api]);
  const page = useModulePage({ filterFields, allColumns, fetcher });

  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [revisions, setRevisions] = useState({ loading: false, items: [] });
  const [receipts, setReceipts] = useState(null);

  const sections = useMemo(
    () => [
      {
        key: 'not_received',
        label: 'Not Received',
        rows: page.rows.filter((row) => row.section === 'not_received'),
        // Overdue means a receipt is due, so this opens the receive form for
        // that challan rather than the issue editor. Editing is still on the
        // same row in the In Progress band below.
        render: (rows) => (
          <DeadlineList
            rows={rows}
            onOpen={(row) => navigate(`/${kind}/receive`, { state: { fromIssue: row } })}
          />
        ),
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

  const searchLots = useCallback(
    async (term) => {
      const payload = await greyApi.search(term, kind);
      return payload.rows;
    },
    [kind],
  );

  const searchMasters = useCallback(async (term) => {
    const payload = await mastersApi.search(term);
    return payload.masters;
  }, []);

  // Mirrors utils/amounts.js on the server, which decides the stored value: a
  // challan bills dupatta pieces when it has them, otherwise its quantity.
  // Any drift here shows the user one figure and saves another.
  const amountPreview = (value) => {
    const dup = value.dupattaYes || value.onlyDupatta ? Number(value.dupQty || 0) : 0;
    const qty = value.onlyDupatta ? 0 : Number(value.quantity || 0);
    return formatMoney((dup > 0 ? dup : qty) * Number(value.rate || 0));
  };

  // "Only Dupatta" implies the dupatta fields, so `dupattaYes` is derived
  // rather than forced - nothing has to write to it when the mode turns on.
  const onlyDup = (value) => Boolean(value.onlyDupatta);
  const dupattaOn = (value) => Boolean(value.onlyDupatta || value.dupattaYes);

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
              // Tint each row by where the lot stands, so a glance at the list
              // says whether a lot is still in grey, out, or back.
              optionClassName={(lot) => {
                const stage = currentStage(lot.stages);
                return stage ? `${stage.tint} hover:brightness-95` : '';
              }}
              renderOption={(lot) => {
                const stage = currentStage(lot.stages);
                return (
                  <span className="flex flex-col">
                    <span className="flex items-center gap-2">
                      <span className="font-semibold">{lot.lotNo}</span>
                      {stage && (
                        // Named as well as coloured: the two blues are close at
                        // this opacity, and colour alone should not carry it.
                        <span className="flex items-center gap-1 text-note text-soft">
                          <span className={`h-[8px] w-[8px] rounded-full ${stage.bar}`} />
                          {stage.label}
                        </span>
                      )}
                    </span>
                    <span className="text-soft">
                      remaining {lot.remainingQty}
                      {lot.dupatta !== 'no' && ` · dupatta ${lot.remainingDup} (${lot.dupatta})`}
                      {lot.fabric && ` · ${lot.fabric}`}
                    </span>
                  </span>
                );
              }}
              onSelect={(lot) =>
                // "every detail should be fetched and paste in their respective
                // fields ... But can be editable."
                //
                // Master Head is deliberately not among them: a lot's master is
                // whoever supplied the grey, which is rarely the contractor this
                // challan is going out to.
                onChange({
                  ...value,
                  lotId: lot.id,
                  lotText: lot.lotNo,
                  fabric: lot.fabric || value.fabric,
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
        { key: 'fabric', label: 'Fabric', icon: IconFabric, placeholder: 'Cotton', hidden: onlyDup },
        { key: 'design', label: 'Design', icon: IconChart, placeholder: 'design-07', hidden: onlyDup },
        { key: 'date', label: 'Date', type: 'date' },

        // A dupatta-only challan carries no garment at all: no fabric, no
        // design, no quantity - just dupatta pieces at a rate.
        { key: 'onlyDupatta', label: 'Only Dupatta', type: 'boolean' },

        // "dupatta= if no is selected then select whether diamond or chain or
        // plain, else if yes then yes"
        // The Dupatta toggle reveals the finish and the dupatta quantity;
        // turning it off hides both and bills no dupatta pieces. Only Dupatta
        // implies it, so the switch is hidden there rather than shown locked.
        { key: 'dupattaYes', label: 'Dupatta', type: 'boolean', hidden: onlyDup },
        {
          key: 'dupatta',
          label: 'Dupatta finish',
          type: 'select',
          hidden: (value) => dupattaOn(value),
          options: [
            { value: 'diamond', label: 'Diamond' },
            { value: 'chain', label: 'Chain' },
            { value: 'plain', label: 'Plain' },
          ],
        },
        {
          key: 'dupQty',
          label: 'Dup. Qty',
          type: 'number',
          hidden: (value) => !dupattaOn(value),
          hint: (value) =>
            value.remainingDup !== undefined ? `lot has ${value.remainingDup} left` : null,
        },
        {
          key: 'quantity',
          label: 'Quantity',
          type: 'number',
          hidden: onlyDup,
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
    [searchLots, searchMasters],
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
      onlyDupatta: false,
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
      // The mode is not stored - it is exactly the shape a dupatta-only
      // challan leaves behind, so it reconstructs from the row itself.
      onlyDupatta:
        row.dupatta === 'yes' && !row.fabric && !row.design && Number(row.quantity) === 0,
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
      // A dupatta-only challan stores fabric, design and quantity as empty, so
      // the table shows blanks and the amount is dupatta pieces alone.
      const dupattaOnly = onlyDup(form);

      const body = {
        challanNo: form.challanNo,
        date: form.date,
        lotId: Number(form.lotId),
        masterId: form.masterId === '' ? null : Number(form.masterId),
        fabric: dupattaOnly ? '' : form.fabric,
        design: dupattaOnly ? '' : form.design,
        dupatta: dupattaOn(form) ? 'yes' : form.dupatta,
        dupQty: dupattaOn(form) ? Number(form.dupQty || 0) : 0,
        quantity: dupattaOnly ? 0 : Number(form.quantity || 0),
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

  // Clicking a row answers "what has come back against this one" - the row
  // itself only carries totals, and a challan is often received in parts.
  const openReceipts = async (row) => {
    setReceipts({ loading: true, challan: row, receipts: [] });
    try {
      const payload = await api.issueReceipts(row.id);
      setReceipts({ loading: false, challan: payload.challan, receipts: payload.receipts });
    } catch (failure) {
      setReceipts(null);
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
          onRowClick: openReceipts,
          onShare: page.roles.canShare
            ? (row) =>
                // masterHead only fills the override placeholder, so the sheet
                // can show what would be printed if the field is left blank.
                page.setShare({
                  kind,
                  direction: 'issue',
                  ids: [row.id],
                  masterHead: row.masterHead,
                })
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

      {receipts && (
        <ReceiptsModal
          challan={receipts.challan}
          receipts={receipts.receipts}
          loading={receipts.loading}
          onClose={() => setReceipts(null)}
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
