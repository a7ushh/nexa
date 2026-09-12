import { useEffect, useRef, useState } from 'react';
import { generateChallan, generateReport } from '../api/resources.js';

/**
 * steps.md: "When clicked on share button is open a full stretch box that asked
 * the user whether to download or share directly."
 *
 * Split since: the caller chooses Print or Share before the sheet opens and
 * passes it as `request.intent`, so the sheet only asks who the challan is made
 * out to and then performs that one action. The buttons under "ready" are the
 * manual retry - a browser may refuse a print or a share it did not see the
 * user click directly, and a dead end there would leave no way to the document.
 *
 * Not drawn in Figma, so it is built from the same tokens: a full-width navy
 * sheet across the foot of the page.
 */
export default function ShareSheet({ request, onClose }) {
  const [state, setState] = useState({ status: 'idle', error: '' });
  const [doc, setDoc] = useState(null);

  // A challan asks who it is being made out to before it is generated; a report
  // has no party, so it skips straight to the document.
  const isReport = request?.kind === 'report';
  const intent = request?.intent === 'print' ? 'print' : 'share';
  const [party, setParty] = useState({ masterHead: '', masterAddress: '', masterPhone: '' });
  const [confirmed, setConfirmed] = useState(false);

  // Fires the chosen action exactly once per generated document, so a re-render
  // does not reopen the print dialog on top of itself.
  const [delivered, setDelivered] = useState(false);

  // The print frame outlives the call that made it: a PDF detached from the DOM
  // while the print dialog is still open cancels the job in Chrome, so it stays
  // attached until the sheet closes.
  const frameRef = useRef(null);

  const dropFrame = () => {
    if (frameRef.current) {
      frameRef.current.remove();
      frameRef.current = null;
    }
  };

  useEffect(() => dropFrame, []);

  // A fresh request always re-asks, and never inherits the last one's answers.
  // Closing the sheet lands here too (request goes null), which is where the
  // previous print frame has to go: the effect below revokes the blob URL it
  // points at, and the component itself never unmounts.
  useEffect(() => {
    dropFrame();
    // `state` has to go back to idle with the rest. The effect below nulls
    // `doc` on close but leaves the status alone, so without this the next
    // share opens straight into the "ready" branch with nothing to show -
    // which threw on doc.filename and, with no error boundary anywhere in the
    // app, took the whole page white.
    setState({ status: 'idle', error: '' });
    setParty({ masterHead: '', masterAddress: '', masterPhone: '' });
    setConfirmed(false);
    setDelivered(false);
  }, [request]);

  useEffect(() => {
    if (!request) return undefined;
    if (!isReport && !confirmed) return undefined;

    let revoked = null;
    setState({ status: 'loading', error: '' });

    const build = isReport
      ? generateReport(request.filters)
      : generateChallan({ ...request, ...party });

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
    // `party` is read at generation time only - re-running on every keystroke
    // would refetch the PDF as the user types.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, isReport, confirmed]);

  const download = () => {
    const link = document.createElement('a');
    link.href = doc.url;
    link.download = doc.filename;
    link.click();
    onClose();
  };

  const openTab = () => {
    window.open(doc.url, '_blank', 'noopener');
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
        openTab();
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

  // The document is ready, so run the action the caller asked for. Everything
  // below this point is recovery, not the normal path.
  useEffect(() => {
    if (state.status !== 'ready' || !doc || delivered) return;
    setDelivered(true);
    if (intent === 'print') print();
    else share();
    // One shot per document; adding the handlers here would re-fire them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, doc, delivered, intent]);

  if (!request) return null;

  const verb = intent === 'print' ? 'print' : 'share';

  return (
    <div className="absolute inset-x-0 bottom-0 z-50">
      <div
        className="w-full bg-navy px-8 py-7 text-on-dark shadow-md"
        role="dialog"
        aria-label={intent === 'print' ? 'Print document' : 'Share document'}
      >
        <div className="mx-auto flex max-w-[900px] flex-col items-center gap-5 text-center">
          {!isReport && !confirmed && (
            <>
              <p className="text-title">Who is this challan for?</p>
              <p className="text-data text-on-dark/80">
                Leave a field blank to keep what the record already says.
              </p>

              <div className="flex w-full flex-col gap-3 sm:flex-row">
                <label className="flex-1 text-left">
                  <span className="text-note text-on-dark/70">Master Head</span>
                  <input
                    type="text"
                    value={party.masterHead}
                    onChange={(event) =>
                      setParty((current) => ({ ...current, masterHead: event.target.value }))
                    }
                    placeholder={request.masterHead || 'as recorded on the challan'}
                    className="mt-1 h-[40px] w-full rounded-[8px] bg-surface px-3 text-data text-ink_text"
                  />
                </label>

                <label className="flex-[2] text-left">
                  <span className="text-note text-on-dark/70">Party Address</span>
                  <input
                    type="text"
                    value={party.masterAddress}
                    onChange={(event) =>
                      setParty((current) => ({ ...current, masterAddress: event.target.value }))
                    }
                    placeholder="as recorded against the master"
                    className="mt-1 h-[40px] w-full rounded-[8px] bg-surface px-3 text-data text-ink_text"
                  />
                </label>

                <label className="flex-1 text-left">
                  <span className="text-note text-on-dark/70">Party Phone</span>
                  <input
                    type="text"
                    value={party.masterPhone}
                    onChange={(event) =>
                      setParty((current) => ({ ...current, masterPhone: event.target.value }))
                    }
                    placeholder="as recorded against the master"
                    className="mt-1 h-[40px] w-full rounded-[8px] bg-surface px-3 text-data text-ink_text"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setConfirmed(true)}
                  className="h-[40px] rounded-[8px] bg-card-accent px-6 text-data text-ink_text"
                >
                  {intent === 'print' ? 'Continue to print' : 'Continue to share'}
                </button>
                <button type="button" onClick={onClose} className="text-data underline">
                  Cancel
                </button>
              </div>
            </>
          )}

          {state.status === 'loading' && <p className="text-title">Generating…</p>}

          {state.status === 'error' && (
            <>
              <p className="text-title">Could not generate the document</p>
              <p className="text-data text-on-dark/80">{state.error}</p>
              <button type="button" onClick={onClose} className="text-data underline">
                Close
              </button>
            </>
          )}

          {state.status === 'ready' && doc && (
            <>
              <p className="text-title">{doc.filename}</p>
              <p className="text-data text-on-dark/80">
                {intent === 'print'
                  ? 'The print dialog should be open. If nothing happened, use a button below.'
                  : 'Sharing… if nothing happened, use a button below.'}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={intent === 'print' ? print : share}
                  className="h-[40px] rounded-[8px] bg-card-accent px-6 text-data text-ink_text"
                >
                  {intent === 'print' ? 'Print again' : 'Share again'}
                </button>
                {intent === 'print' && (
                  <button
                    type="button"
                    onClick={openTab}
                    className="h-[40px] rounded-[8px] bg-surface px-6 text-data text-ink_text"
                  >
                    Open in new tab
                  </button>
                )}
                <button
                  type="button"
                  onClick={download}
                  className="h-[40px] rounded-[8px] bg-surface px-6 text-data text-ink_text"
                >
                  Download
                </button>
                <button type="button" onClick={onClose} className="text-data underline">
                  Done
                </button>
              </div>

              <span className="sr-only" role="status">
                Document ready to {verb}.
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
