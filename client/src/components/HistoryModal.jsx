import { useMemo } from 'react';
import { IconClose } from './icons.jsx';

/**
 * The edit trail behind assets/previous_data.png.
 *
 * Each stored revision is the row as it stood *before* an edit, and the server
 * appends the live row as the final entry. Diffing consecutive entries turns
 * that into what actually changed, which is the useful view - the full field
 * dump is kept behind a details toggle.
 */
export default function HistoryModal({ title, revisions, loading, onClose }) {
  // Newest first, each carrying the fields that its edit changed.
  const entries = useMemo(() => {
    const ordered = [...revisions].sort((a, b) => a.version - b.version);

    return ordered
      .map((entry, index) => {
        const previous = index > 0 ? ordered[index - 1].data : null;
        return { ...entry, changes: previous ? diff(previous, entry.data) : [] };
      })
      .reverse();
  }, [revisions]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-6">
      <div className="max-h-[82vh] w-full max-w-[760px] overflow-y-auto rounded-[14px] bg-surface p-[26px]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-mono text-title font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="btn-icon">
            <IconClose width={20} height={20} />
          </button>
        </div>

        {loading && <p className="text-data text-soft">Loading…</p>}

        {!loading && entries.length <= 1 && (
          <p className="text-data text-soft">This row has never been edited.</p>
        )}

        <ol className="space-y-4">
          {entries.map((entry, index) => {
            // The last item chronologically is the original; it has no diff.
            const isOriginal = index === entries.length - 1;

            return (
              <li key={entry.version} className="rounded-[10px] border border-edge bg-offwhite p-[16px]">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-note text-soft">
                  <span className="font-semibold text-ink_text">
                    {entry.current ? 'Current' : isOriginal ? 'Created' : `Edit ${entry.version}`}
                  </span>
                  <span>
                    {entry.changedBy ? `${entry.changedBy} · ` : ''}
                    {entry.changedAt ? new Date(entry.changedAt).toLocaleString() : ''}
                  </span>
                </div>

                {isOriginal ? (
                  <FieldGrid data={entry.data} />
                ) : entry.changes.length === 0 ? (
                  <p className="text-note text-soft">No field values changed.</p>
                ) : (
                  <ul className="space-y-[6px]">
                    {entry.changes.map((change) => (
                      <li
                        key={change.key}
                        className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-[6px]
                                   bg-calendar-light/40 px-[10px] py-[6px] text-data"
                      >
                        <span className="text-soft">{label(change.key)}</span>
                        <span className="text-danger line-through">{show(change.from)}</span>
                        <span aria-hidden="true" className="text-soft">
                          →
                        </span>
                        <span className="font-bold">{show(change.to)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {!isOriginal && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-note text-soft">
                      All values at this point
                    </summary>
                    <div className="mt-2">
                      <FieldGrid data={entry.data} />
                    </div>
                  </details>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function FieldGrid({ data }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-note md:grid-cols-3">
      {Object.entries(data)
        .filter(([key]) => !HIDDEN_FIELDS.has(key))
        .map(([key, value]) => (
          <div key={key}>
            <dt className="text-soft">{label(key)}</dt>
            <dd>{show(value)}</dd>
          </div>
        ))}
    </dl>
  );
}

/** Fields that differ between two snapshots, ignoring bookkeeping columns. */
function diff(before, after) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes = [];

  for (const key of keys) {
    if (HIDDEN_FIELDS.has(key)) continue;
    const from = before[key];
    const to = after[key];
    if (String(from ?? '') === String(to ?? '')) continue;
    changes.push({ key, from, to });
  }

  return changes.sort((a, b) => a.key.localeCompare(b.key));
}

const show = (value) =>
  value === null || value === undefined || value === '' ? '—' : String(value);

/** snake_case column -> readable label. */
const label = (key) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const HIDDEN_FIELDS = new Set([
  'id',
  'company_id',
  'created_by',
  'updated_by',
  'created_at',
  'updated_at',
  'deleted_at',
  'revision_count',
  'issued_qty',
  'issued_dup',
  'issued_pieces',
  'received_pieces',
  'received_qty',
  'received_dup',
]);
