import { useEffect, useState } from 'react';
import { generateChallan, generateReport } from '../api/resources.js';

/**
 * steps.md: "When clicked on share button is open a full stretch box that asked
 * the user whether to download or share directly."
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
  const [party, setParty] = useState({ masterHead: '', masterAddress: '', masterPhone: '' });
  const [confirmed, setConfirmed] = useState(false);

  // A fresh share always re-asks, and never inherits the last one's answers.
  useEffect(() => {
    setParty({ masterHead: '', masterAddress: '', masterPhone: '' });
    setConfirmed(false);
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

  if (!request) return null;

  const download = () => {
    const link = document.createElement('a');
    link.href = doc.url;
    link.download = doc.filename;
    link.click();
    onClose();
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

  return (
    <div className="absolute inset-x-0 bottom-0 z-50">
      <div
        className="w-full bg-navy px-8 py-7 text-on-dark shadow-md"
        role="dialog"
        aria-label="Share document"
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
                  Continue
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

          {state.status === 'ready' && (
            <>
              <p className="text-title">{doc.filename}</p>
              <p className="text-data text-on-dark/80">
                Download it, or share it straight from here.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={download}
                  className="h-[40px] rounded-[8px] bg-surface px-6 text-data text-ink_text"
                >
                  Download
                </button>
                <button
                  type="button"
                  onClick={share}
                  className="h-[40px] rounded-[8px] bg-card-accent px-6 text-data text-ink_text"
                >
                  Share directly
                </button>
                <button type="button" onClick={onClose} className="text-data underline">
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
