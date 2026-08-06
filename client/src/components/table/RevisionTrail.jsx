/**
 * The version markers from assets/previous_data.png: an edited row carries
 * numbered chips, and opening one shows what it used to say.
 */
export default function RevisionTrail({ count, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title={`${count} earlier version${count === 1 ? '' : 's'}`}
      className="ml-2 inline-flex items-center gap-[3px] align-middle"
    >
      <span className="font-mono text-[10px] leading-none text-soft">1</span>
      <span
        className="inline-flex h-[15px] min-w-[14px] items-center justify-center rounded-[3px]
                   bg-navy px-[3px] font-mono text-[10px] leading-none text-on-dark"
      >
        {count + 1}
      </span>
    </button>
  );
}
