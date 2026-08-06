import { IconEdit, IconTrash, IconShare } from '../icons.jsx';

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

      <dl className="mt-3 space-y-[6px]">
        {columns.map((column) => {
          const value = column.render ? column.render(row) : row[column.key];
          if (value === null || value === undefined || value === '') return null;
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
          <button type="button" onClick={onShare} aria-label="Share" className="btn-icon">
            <IconShare width={17} height={17} />
          </button>
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
