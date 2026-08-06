import { useCallback, useEffect, useState } from 'react';
import AppShell from '../layouts/AppShell.jsx';
import SectionDivider from '../components/SectionDivider.jsx';
import { reports } from '../api/resources.js';
import { useFilters } from '../hooks/useFilters.js';
import ShareSheet from '../components/ShareSheet.jsx';
import { formatDate, formatMoney } from '../utils/format.js';
import { IconFabric, IconNumber, IconPerson, IconShare } from '../components/icons.jsx';

/** steps.md "Report" filter list. */
const FILTER_FIELDS = [
  { key: 'lotNo', label: 'Lot no.', icon: IconNumber, placeholder: '123' },
  { key: 'challanNo', label: 'Challan no.', icon: IconNumber, placeholder: '15' },
  { key: 'masterHead', label: 'Master Head', icon: IconPerson, placeholder: 'Anil Sharma' },
  { key: 'fabric', label: 'Fabric', icon: IconFabric, placeholder: 'Cotton' },
  { key: 'date', label: 'Date', type: 'dateRange' },
  // Switch a trade off and its issue and receive tables leave the report.
  { key: 'includeEmbroidery', label: 'Include embroidery', type: 'boolean', default: 'true' },
  { key: 'includeHandwork', label: 'Include handwork', type: 'boolean', default: 'true' },
];

/** Columns per section, matching each module's own table. */
const SECTION_COLUMNS = {
  grey: [
    ['lot_no', 'Lot no.'],
    ['date', 'Date', formatDate],
    ['master_head', 'Master Head'],
    ['fabric', 'Fabric'],
    ['chart', 'Chart'],
    ['cut', 'Cut'],
    ['quantity', 'Quantity', null, 'right'],
    ['dupatta', 'Dupatta'],
    ['bottom', 'Bottom'],
  ],
  challan: [
    ['date', 'Date', formatDate],
    ['lot_no', 'Lot no.'],
    ['challan_no', 'Challan no.'],
    ['master_head', 'Master Head'],
    ['fabric', 'Fabric'],
    ['design', 'Design'],
    ['quantity', 'Quantity', null, 'right'],
    ['rate', 'Rate', null, 'right'],
    ['amount', 'Amount', formatMoney, 'right'],
  ],
};

export default function Report() {
  const filters = useFilters(FILTER_FIELDS);
  const [data, setData] = useState({ sections: [], grandTotal: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [share, setShare] = useState(null);

  const key = JSON.stringify(filters.query);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await reports.build(JSON.parse(key)));
    } catch (failure) {
      setError(failure.message);
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppShell
      title="Report"
      filterFields={FILTER_FIELDS}
      filters={filters}
      suggestScope="report"
      toolbar={
        <button
          type="button"
          onClick={() => setShare({ kind: 'report', filters: filters.query })}
          disabled={loading || data.sections.length === 0}
          className="btn-pill"
        >
          <IconShare width={16} height={16} />
          Export PDF
        </button>
      }
    >
      {error && <p className="mb-4 text-data text-danger">{error}</p>}
      {loading && <p className="text-data text-soft">Loading…</p>}

      <div className="space-y-6">
        {data.sections.map((section) => {
          const columns = section.key === 'grey' ? SECTION_COLUMNS.grey : SECTION_COLUMNS.challan;

          return (
            <section key={section.key}>
              <SectionDivider label={section.title} count={section.rows.length} />

              {section.rows.length === 0 ? (
                <p className="px-2 py-4 text-data text-soft">No rows for this filter.</p>
              ) : (
                <div className="overflow-x-auto rounded-[10px] border border-edge bg-surface">
                  <table className="w-full min-w-[860px] border-collapse text-note">
                    <thead>
                      <tr className="bg-table-head text-left">
                        {columns.map(([field, label, , align]) => (
                          <th
                            key={field}
                            className={`px-2 py-2 font-medium ${align === 'right' ? 'text-right' : ''}`}
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {section.rows.map((row, index) => (
                        <tr
                          key={row.id}
                          className={index % 2 === 1 ? 'bg-offwhite' : 'bg-surface'}
                        >
                          {columns.map(([field, , format, align]) => (
                            <td
                              key={field}
                              className={`px-2 py-2 ${align === 'right' ? 'text-right' : ''}`}
                            >
                              {renderCell(row[field], format)}
                            </td>
                          ))}
                        </tr>
                      ))}

                      {/* "with a last row add as total- in each table" */}
                      <tr className="bg-table-head font-semibold">
                        <td className="px-2 py-2" colSpan={columns.length - 1}>
                          {section.totalLabel}
                        </td>
                        <td className="px-2 py-2 text-right">{formatMoney(section.total)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {data.sections.length > 0 && (
        <p className="mt-8 text-right text-title">
          Grand total — {formatMoney(data.grandTotal)}
        </p>
      )}
      <ShareSheet request={share} onClose={() => setShare(null)} />
    </AppShell>
  );
}

function renderCell(value, format) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (format) return format(value);
  if (typeof value === 'number') return value.toLocaleString('en-IN');
  return value;
}
