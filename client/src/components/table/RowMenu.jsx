import { useRef, useState } from 'react';
import Popover from '../Popover.jsx';
import { IconEdit, IconTrash, IconShare } from '../icons.jsx';

/**
 * The per-row action menu from the reference table: a vertical ellipsis that
 * opens Share / Edit / Delete. Rendered through Popover so it is never clipped
 * by the table's own scroll container.
 */
export default function RowMenu({ onEdit, onDelete, onShare, canDelete, canShare, label }) {
  const [open, setOpen] = useState(false);
  const anchor = useRef(null);

  const run = (action) => () => {
    setOpen(false);
    action();
  };

  return (
    <>
      <button
        ref={anchor}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${label}`}
        className="btn-icon"
      >
        <span aria-hidden="true" className="text-[18px] leading-none">
          ⋮
        </span>
      </button>

      <Popover anchorRef={anchor} open={open} onClose={() => setOpen(false)} width={168} align="right">
        <div role="menu" className="py-1">
          {canShare && onShare && (
            <MenuItem icon={IconShare} onClick={run(onShare)}>
              Share
            </MenuItem>
          )}
          <MenuItem icon={IconEdit} onClick={run(onEdit)}>
            Edit
          </MenuItem>
          {canDelete && (
            <MenuItem icon={IconTrash} onClick={run(onDelete)} danger>
              Delete
            </MenuItem>
          )}
        </div>
      </Popover>
    </>
  );
}

function MenuItem({ icon: Icon, onClick, children, danger }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-2 text-left text-data transition-colors
                  hover:bg-offwhite ${danger ? 'text-danger' : 'text-ink_text'}`}
    >
      <Icon width={16} height={16} />
      {children}
    </button>
  );
}
