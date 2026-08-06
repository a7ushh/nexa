import { useMemo, useState } from 'react';
import RevisionTrail from './RevisionTrail.jsx';
import RowMenu from './RowMenu.jsx';
import { IconChevronLeft, IconChevronRight } from '../icons.jsx';

const PAGE_SIZE = 10;

/**
 * The module table.
 *
 * Follows the reference layout: a rounded white card, sortable column headers,
 * a checkbox column, light row separators, a per-row action menu, and
 * pagination beneath.
 *
 * steps.md: "Only display the selected columns and if nothing is selected then
 * display the all columns" - the caller passes `columns` already narrowed.
 */
export default function DataTable({
  columns,
  rows,
  selected,
  onToggle,
  onToggleAll,
  onEdit,
  onDelete,
  onShare,
  onHistory,
  canDelete,
  canShare,
  emptyText = 'No records',
}) {
  const [sort, setSort] = useState({ key: null, direction: 'asc' });
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort.key) return rows;
    const column = columns.find((item) => item.key === sort.key);
    if (!column) return rows;

    // Sort on the raw value, not the rendered string, so numbers and dates
    // order correctly rather than alphabetically.
    const copy = [...rows];
    copy.sort((a, b) => {
      const left = a[sort.key];
      const right = b[sort.key];
      if (left === right) return 0;
      if (left === null || left === undefined || left === '') return 1;
      if (right === null || right === undefined || right === '') return -1;

      const result =
        typeof left === 'number' && typeof right === 'number'
          ? left - right
          : String(left).localeCompare(String(right), undefined, { numeric: true });

      return sort.direction === 'asc' ? result : -result;
    });
    return copy;
  }, [rows, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const visible = sorted.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  if (rows.length === 0) {
    return <p className="py-[110px] text-center font-mono text-title text-ink_text">{emptyText}</p>;
  }

  const allSelected = visible.every((row) => selected.includes(row.id));

  const toggleSort = (key) =>
    setSort((currentSort) =>
      currentSort.key === key
        ? { key, direction: currentSort.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    );

  return (
    <div className="rounded-[10px] border border-edge bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-data">
          <thead>
            <tr className="bg-table-head text-left">
              <th className="w-[44px] px-4 py-[11px]">
                <input
                  type="checkbox"
                  aria-label="Select all rows on this page"
                  checked={allSelected}
                  onChange={() =>
                    onToggleAll(allSelected ? [] : visible.map((row) => row.id))
                  }
                  className="h-[15px] w-[15px] accent-navy"
                />
              </th>
              <th className="w-[58px] px-2 py-[11px] font-medium">Sr no.</th>

              {columns.map((column) => (
                <th key={column.key} className={`px-3 py-[11px] font-medium ${alignOf(column)}`}>
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    className={`inline-flex items-center gap-[6px] transition-opacity hover:opacity-70
                                ${column.align === 'right' ? 'flex-row-reverse' : ''}`}
                  >
                    {column.label}
                    <SortMark active={sort.key === column.key} direction={sort.direction} />
                  </button>
                </th>
              ))}

              <th className="w-[70px] px-3 py-[11px] text-right font-medium">Action</th>
            </tr>
          </thead>

          <tbody>
            {visible.map((row, index) => (
              <tr key={row.id} className="border-t border-edge/70 transition-colors hover:bg-offwhite">
                <td className="px-4 py-[10px] align-middle">
                  <input
                    type="checkbox"
                    aria-label={`Select row ${current * PAGE_SIZE + index + 1}`}
                    checked={selected.includes(row.id)}
                    onChange={() => onToggle(row.id)}
                    className="h-[15px] w-[15px] accent-navy"
                  />
                </td>
                <td className="px-2 py-[10px] align-middle text-soft">
                  {current * PAGE_SIZE + index + 1}
                </td>

                {columns.map((column) => (
                  <td key={column.key} className={`px-3 py-[10px] align-middle ${alignOf(column)}`}>
                    {column.render ? column.render(row) : formatCell(row[column.key])}
                    {column.key === columns[0].key && row.revisionCount > 0 && (
                      <RevisionTrail count={row.revisionCount} onOpen={() => onHistory?.(row)} />
                    )}
                  </td>
                ))}

                <td className="px-3 py-[10px] text-right align-middle">
                  <RowMenu
                    label={`row ${current * PAGE_SIZE + index + 1}`}
                    onEdit={() => onEdit(row)}
                    onDelete={() => onDelete(row)}
                    onShare={onShare ? () => onShare(row) : undefined}
                    canDelete={canDelete}
                    canShare={canShare}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <Pagination
          page={current}
          pageCount={pageCount}
          onChange={(next) => setPage(Math.max(0, Math.min(next, pageCount - 1)))}
        />
      )}
    </div>
  );
}

function SortMark({ active, direction }) {
  return (
    <span
      aria-hidden="true"
      className={`text-[9px] leading-none ${active ? 'text-ink_text' : 'text-soft/60'}`}
    >
      {active ? (direction === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );
}

/** 1 2 3 … n, with the ends always reachable. */
function Pagination({ page, pageCount, onChange }) {
  const pages = [];
  for (let index = 0; index < pageCount; index += 1) {
    const nearCurrent = Math.abs(index - page) <= 1;
    const isEdge = index === 0 || index === pageCount - 1;
    if (nearCurrent || isEdge) pages.push(index);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }

  return (
    <nav className="flex items-center justify-center gap-[6px] border-t border-edge py-[12px]" aria-label="Pagination">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 0}
        aria-label="Previous page"
        className="btn-icon"
      >
        <IconChevronLeft width={16} height={16} />
      </button>

      {pages.map((item, index) =>
        item === '…' ? (
          <span key={`gap-${index}`} className="px-1 text-data text-soft">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === page ? 'page' : undefined}
            className={`h-[28px] min-w-[28px] rounded-[6px] px-2 text-data transition-colors ${
              item === page ? 'bg-navy text-on-dark' : 'hover:bg-offwhite'
            }`}
          >
            {item + 1}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page === pageCount - 1}
        aria-label="Next page"
        className="btn-icon"
      >
        <IconChevronRight width={16} height={16} />
      </button>
    </nav>
  );
}

const alignOf = (column) => (column.align === 'right' ? 'text-right' : 'text-left');

function formatCell(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString('en-IN');
  return value;
}
