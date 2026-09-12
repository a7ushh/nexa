import { IconEdit, IconTrash, IconShare, IconPrinter } from '../icons.jsx';

/**
 * The record card the Android layout uses in place of a table row, carried over
 * to the new visual language: white card, outlined edge, icon actions.
 */
export default function MobileRecordCard({
  row,
  columns,
  selected,
  onToggle,
  onEdit,
  onDelete,
  onShare,
  canDelete,
  canShare,
  title,
  onOpen,
}) {
  return (
    <article className="mb-[14px] rounded-[10px] border border-edge bg-surface p-[16px]">
      <div className="flex items-start justify-between">
        <h3 className="font-mono text-title">{title}</h3>
        <input
          type="checkbox"
          aria-label={`Select ${title}`}
          checked={selected}
          onChange={onToggle}
          className="mt-1 h-[15px] w-[15px] accent-navy"
        />
      </div>

      {/* Tapping the body opens the row; the action icons below keep theirs. */}
      <dl className="mt-3 space-y-[6px]" onClick={onOpen}>
        {columns.map((column) => {
          const value = column.render ? column.render(row) : row[column.key];
          if (value === null || value === undefined || value === '') return null;

          // A cell that is itself a widget - the lot progress bar - needs the
          // full card width rather than being squeezed beside its label.
          if (column.block) {
            return (
              <div key={column.key} className="pt-1 text-data">
                <dt className="mb-1 text-soft">{column.label}</dt>
                <dd>{value}</dd>
              </div>
            );
          }

          return (
            <div key={column.key} className="flex gap-2 text-data">
              <dt className="text-soft">{column.label} -</dt>
              <dd>{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}</dd>
            </div>
          );
        })}
      </dl>

      <div className="mt-4 flex justify-end gap-[12px]">
        {canShare && onShare && (
          <>
            <button
              type="button"
              onClick={() => onShare('print')}
              aria-label="Print"
              className="btn-icon"
            >
              <IconPrinter width={17} height={17} />
            </button>
            <button
              type="button"
              onClick={() => onShare('share')}
              aria-label="Share"
              className="btn-icon"
            >
              <IconShare width={17} height={17} />
            </button>
          </>
        )}
        <button type="button" onClick={onEdit} aria-label="Edit" className="btn-icon">
          <IconEdit width={17} height={17} />
        </button>
        {canDelete && (
          <button type="button" onClick={onDelete} aria-label="Delete" className="btn-icon">
            <IconTrash width={17} height={17} />
          </button>
        )}
      </div>
    </article>
  );
}
