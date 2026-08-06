import { formatDate, formatMoney } from '../utils/format.js';

/**
 * The "Not Received" band on the issue pages: overdue challans stacked
 * vertically and filling the column width, each showing how far past the
 * deadline it is.
 */
export default function DeadlineList({ rows, onOpen }) {
  if (rows.length === 0) {
    return <p className="px-1 py-6 text-data text-soft">Nothing overdue.</p>;
  }

  return (
    <ul className="space-y-[14px] py-[6px]">
      {rows.map((row) => (
        <li key={row.id}>
          <button
            type="button"
            onClick={() => onOpen?.(row)}
            className="flex w-full flex-wrap items-center justify-between gap-x-[32px] gap-y-[10px]
                       rounded-[10px] border border-edge bg-surface px-[24px] py-[18px] text-left
                       transition-shadow hover:shadow-md"
          >
            <span className="min-w-[190px] font-mono text-title">
              Challan no. - {row.challanNo}
            </span>

            <span className="text-data">
              <span className="text-soft">Issue Date - </span>
              {formatDate(row.date)}
            </span>

            <span className="text-data">
              <span className="text-soft">Master Head - </span>
              {row.masterHead || '—'}
            </span>

            <span className="ml-auto flex flex-col items-end">
              <span className="text-data font-semibold text-danger">
                {row.delayDays} days delay
              </span>
              <span className="text-data font-bold">Amount - {formatMoney(row.amount)}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
