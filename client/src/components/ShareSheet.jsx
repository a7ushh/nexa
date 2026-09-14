import { useEffect, useRef, useState } from 'react';
import { generateChallan, generateReport } from '../api/resources.js';

/**
 * Print and Share act straight away. The caller passes the intent as
 * `request.intent`; the document is generated and the print dialog or the share
 * sheet opens the moment it arrives. Nothing is asked first - a challan prints
 * the party exactly as it is recorded.
 *
 * All that appears on screen is a small note while the PDF is being made, and
 * the reason if it could not be made.
 */
export default function ShareSheet({ request, onClose }) {
  const [state, setState] = useState({ status: 'idle', error: '' });
  const [doc, setDoc] = useState(null);

  const isReport = request?.kind === 'report';
  const intent = request?.intent === 'print' ? 'print' : 'share';

  // Fires the chosen action exactly once per generated document, so a re-render
  // does not reopen the print dialog on top of itself.
  const [delivered, setDelivered] = useState(false);

  // The print frame outlives the call that made it: a PDF detached from the DOM
  // while the print dialog is still open cancels the job in Chrome. So it stays
  // attached - and the request stays open - until the next print or share
  // replaces it.
  const frameRef = useRef(null);

  const dropFrame = () => {
    if (frameRef.current) {
      frameRef.current.remove();
      frameRef.current = null;
    }
  };

  useEffect(() => dropFrame, []);

  // Every new request starts clean. `state` must go back to idle with the rest:
  // the effect below nulls `doc` on change but leaves the status alone, and a
  // "ready" status with no document once threw on render and, with no error
  // boundary anywhere in the app, took the whole page white.
  useEffect(() => {
    dropFrame();
    setState({ status: 'idle', error: '' });
    setDelivered(false);
  }, [request]);

  useEffect(() => {
    if (!request) return undefined;

    let revoked = null;
    setState({ status: 'loading', error: '' });

    const build = isReport
      ? generateReport(request.filters)
      : // Only what identifies the rows. generateChallan treats a master head,
        // address or phone as a deliberate override of the recorded party, and
        // there is none to make.
        generateChallan({ kind: request.kind, direction: request.direction, ids: request.ids });

    build
      .then((result) => {
        revoked = URL.createObjectURL(result.blob);
        setDoc({ ...result, url: revoked });
        setState({ status: 'ready', error: '' });
      })
      .catch((error) => setState({ status: 'error', error: error.message }));

    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
      setDoc(null);
    };
  }, [request, isReport]);

  const download = () => {
    const link = document.createElement('a');
    link.href = doc.url;
    link.download = doc.filename;
    link.click();
    onClose();
  };

  /**
   * Printing goes through a hidden frame rather than a new tab: the generated
   * PDF arrives well after the click that asked for it, and a window.open() that
   * late is what popup blockers exist to stop. The frame is same-origin (a blob
   * URL), so its print() reaches the browser's own PDF viewer.
   */
  const print = () => {
    dropFrame();

    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    frame.src = doc.url;
    frame.onload = () => {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } catch {
        // Some browsers refuse print() on an embedded PDF viewer. The tab is the
        // fallback: the viewer's own print button still works there.
        window.open(doc.url, '_blank', 'noopener');
      }
    };

    document.body.appendChild(frame);
    frameRef.current = frame;
  };

  const share = async () => {
    const file = new File([doc.blob], doc.filename, { type: 'application/pdf' });

    // Web Share with files is not everywhere; fall back to a download.
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: doc.filename });
        onClose();
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }
    download();
  };

  // The document is ready, so run the action the caller asked for.
  useEffect(() => {
    if (state.status !== 'ready' || !doc || delivered) return;
    setDelivered(true);
    if (intent === 'print') print();
    else share();
    // One shot per document; adding the handlers here would re-fire them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, doc, delivered, intent]);

  if (!request) return null;

  if (state.status === 'error') {
    return (
      <div
        role="alert"
        className="fixed bottom-6 right-6 z-50 flex max-w-[420px] items-start gap-4 rounded-[10px]
                   bg-navy px-5 py-3 text-data text-on-dark shadow-lg"
      >
        <span>Could not {intent} the document. {state.error}</span>
        <button type="button" onClick={onClose} className="shrink-0 underline">
          Close
        </button>
      </div>
    );
  }

  // Once the dialog or share sheet has opened there is nothing left to show.
  if (state.status === 'ready') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 rounded-[10px] bg-navy px-5 py-3 text-data
                 text-on-dark shadow-lg"
    >
      {intent === 'print' ? 'Preparing to print…' : 'Preparing to share…'}
    </div>
  );
}
