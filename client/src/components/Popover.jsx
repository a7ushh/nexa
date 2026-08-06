import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Floating panel anchored to a trigger element.
 *
 * It renders into `document.body` rather than next to the trigger, because the
 * filter panel and the form both scroll and would otherwise clip the calendar
 * or the type-ahead list. Position is measured from the trigger and clamped to
 * the viewport, flipping above the trigger when there is not enough room below,
 * so the panel is always fully visible without scrolling sideways.
 */
export default function Popover({ anchorRef, open, onClose, children, width, align = 'left' }) {
  const panel = useRef(null);
  const [style, setStyle] = useState(null);

  const place = () => {
    const trigger = anchorRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const panelRect = panel.current?.getBoundingClientRect();
    const panelWidth = width ?? Math.max(rect.width, 240);
    const panelHeight = panelRect?.height ?? 320;
    const gap = 6;
    const margin = 8;

    // Flip above when the panel would run off the bottom.
    const roomBelow = window.innerHeight - rect.bottom;
    const above = roomBelow < panelHeight + gap + margin && rect.top > roomBelow;
    const top = above ? Math.max(margin, rect.top - panelHeight - gap) : rect.bottom + gap;

    let left = align === 'right' ? rect.right - panelWidth : rect.left;
    left = Math.min(left, window.innerWidth - panelWidth - margin);
    left = Math.max(margin, left);

    setStyle({
      position: 'fixed',
      top: Math.round(top),
      left: Math.round(left),
      width: Math.round(panelWidth),
      maxHeight: above ? rect.top - gap - margin : window.innerHeight - rect.bottom - gap - margin,
      zIndex: 60,
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setStyle(null);
      return undefined;
    }
    place();

    const onChange = () => place();
    window.addEventListener('resize', onChange);
    // `true` catches scrolling of any ancestor, not just the window.
    window.addEventListener('scroll', onChange, true);
    return () => {
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (panel.current?.contains(event.target)) return;
      if (anchorRef.current?.contains(event.target)) return;
      onClose();
    };
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={panel}
      style={style ?? { position: 'fixed', top: -9999, left: -9999, zIndex: 60 }}
      className="overflow-y-auto rounded-[12px] border border-edge bg-surface shadow-lg"
    >
      {children}
    </div>,
    document.body,
  );
}
