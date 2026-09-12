import { IconShare, IconTrash, IconPrinter } from '../icons.jsx';

/**
 * steps.md: "When checkbox of a row is selected then appear to button to
 * multi-share and multi-delete."
 *
 * `onShare` takes the intent ('print' | 'share') so both buttons can share one
 * handler - see RowMenu for why it is one prop rather than two.
 */
export default function SelectionBar({ count, onShare, onDelete, onClear, canShare, canDelete }) {
  if (count === 0) return null;

  return (
    <div
      className="sticky bottom-5 z-20 mx-auto flex w-fit items-center gap-4 rounded-pill bg-navy
                 px-6 py-[10px] text-on-dark shadow-lg"
      role="status"
    >
      <span className="text-data">{count} selected</span>

      {canShare && (
        <>
          <button
            type="button"
            onClick={() => onShare('print')}
            className="btn-ghost h-[30px] px-4 text-on-dark"
          >
            <IconPrinter width={15} height={15} />
            Print
          </button>

          <button
            type="button"
            onClick={() => onShare('share')}
            className="btn-ghost h-[30px] px-4 text-on-dark"
          >
            <IconShare width={15} height={15} />
            Share
          </button>
        </>
      )}

      {canDelete && (
        <button type="button" onClick={onDelete} className="btn-ghost h-[30px] px-4 text-on-dark">
          <IconTrash width={15} height={15} />
          Delete
        </button>
      )}

      <button type="button" onClick={onClear} className="text-data underline">
        Clear
      </button>
    </div>
  );
}
