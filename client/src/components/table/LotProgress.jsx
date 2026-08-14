import { useCallback, useEffect, useRef, useState } from 'react';
import Popover from '../Popover.jsx';
import { grey as greyApi } from '../../api/resources.js';
import { LOT_STAGES } from '../../config/lotStages.js';
import { formatDate } from '../../utils/format.js';

/**
 * Where a lot's pieces are right now, as one stacked bar across the lot
 * quantity, plus the individual challans behind it.
 *
 * The five stages are in flow order and always sum to the lot quantity, so the
 * bar is a picture of the whole lot rather than a percentage. The server
 * computes them (models/greyLot.js); this only draws them.
 *
 * A lot is routinely split across several challans, so the totals alone do not
 * answer "which challan is that 1200 sitting on". Clicking the bar fetches the
 * breakdown - on demand, because it is only ever wanted one lot at a time.
 *
 * The stage list lives in config/lotStages.js because the lot type-ahead colours
 * its rows from the same vocabulary.
 */
export default function LotProgress({ row, onChanged }) {
  const anchor = useRef(null);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState({ loading: false, challans: [], error: '' });
  const [closing, setClosing] = useState({ busy: false, error: '' });

  const stages = row.stages ?? {};
  const total = Number(row.quantity) || 0;

  // Dupatta moves through the chain on its own axis, so it gets its own bar and
  // its own figures rather than being folded into the garment counts.
  const dupStages = row.dupStages ?? null;
  const dupTotal = Number(row.dupTotal ?? 0);

  // Nothing waiting in grey and nothing out at a contractor, but it has not all
  // come back through handwork - so it is finished only if somebody says so.
  const nothingOut = (group) =>
    !group || (Number(group.atEmbroidery ?? 0) === 0 && Number(group.atHandwork ?? 0) === 0);

  // Dupatta counts as outstanding only while it is *at* a contractor. Dupatta
  // capacity that was never issued is not work in progress - a lot may carry a
  // dupatta and simply not use all of it - so `inGrey` is checked on garments
  // only. The server guard in greyService applies the same asymmetry.
  const canClose =
    !row.closedAt &&
    total > 0 &&
    Number(stages.inGrey ?? 0) === 0 &&
    nothingOut(stages) &&
    nothingOut(dupStages) &&
    stages.completed < total;

  const setClosed = async (closed) => {
    setClosing({ busy: true, error: '' });
    try {
      await (closed ? greyApi.close(row.id) : greyApi.reopen(row.id));
      setOpen(false);
      await onChanged?.();
    } catch (failure) {
      setClosing({ busy: false, error: failure.message });
      return;
    }
    setClosing({ busy: false, error: '' });
  };

  const load = useCallback(async () => {
    setDetail({ loading: true, challans: [], error: '' });
    try {
      const payload = await greyApi.flow(row.id);
      setDetail({ loading: false, challans: payload.challans, error: '' });
    } catch (failure) {
      setDetail({ loading: false, challans: [], error: failure.message });
    }
  }, [row.id]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const segments = (group, groupTotal) =>
    groupTotal > 0
      ? LOT_STAGES.map((stage) => ({ ...stage, value: Number(group?.[stage.key] ?? 0) })).filter(
          (stage) => stage.value > 0,
        )
      : [];

  const filled = segments(stages, total);
  const dupFilled = segments(dupStages, dupTotal);

  const summary = filled.map((stage) => `${stage.label}: ${stage.value}`).join(' · ');

  return (
    <>
      <button
        ref={anchor}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        title={summary || 'No quantity recorded'}
        className="flex w-full min-w-[120px] flex-col gap-1 text-left"
      >
        <span className="flex h-[10px] w-full overflow-hidden rounded-full bg-[#ececea]">
          {filled.map((stage) => (
            <span
              key={stage.key}
              className={stage.bar}
              style={{ width: `${(stage.value / total) * 100}%` }}
            />
          ))}
        </span>

        {/* Second, slimmer bar for the dupatta axis - only when the lot has one. */}
        {dupTotal > 0 && (
          <span className="flex h-[5px] w-full overflow-hidden rounded-full bg-[#ececea]">
            {dupFilled.map((stage) => (
              <span
                key={stage.key}
                className={stage.bar}
                style={{ width: `${(stage.value / dupTotal) * 100}%` }}
              />
            ))}
          </span>
        )}
        <span className="text-note text-soft">
          {row.closedAt && 'Closed — embroidery only'}
          {/* The invitation to click: nothing is out, so the lot can be closed. */}
          {!row.closedAt && canClose && 'all back — ready to close'}
          {!row.closedAt && !canClose && (total > 0 ? `${stages.completed ?? 0} / ${total} done` : '—')}
        </span>
      </button>

      {/* Wide enough for the two quantity columns without the master head
          truncating to nothing. */}
      <Popover anchorRef={anchor} open={open} onClose={() => setOpen(false)} width={400}>
        <div className="p-3">
          <p className="mb-2 text-note text-soft">
            Lot {row.lotNo} — {total} pieces
            {dupTotal > 0 && ` · ${dupTotal} dupatta`}
          </p>

          <dl className="mb-3 space-y-1">
            {dupTotal > 0 && (
              <div className="flex items-center gap-2 text-note text-soft">
                <span className="h-[9px] w-[9px] shrink-0" />
                <dt className="flex-1" />
                <dd className="w-[58px] text-right">Quantity</dd>
                <dd className="w-[58px] text-right">Dup. Qty</dd>
              </div>
            )}

            {LOT_STAGES.map((stage) => (
              <div key={stage.key} className="flex items-center gap-2 text-data">
                <span className={`h-[9px] w-[9px] shrink-0 rounded-full ${stage.bar}`} />
                <dt className="flex-1 text-soft">{stage.label}</dt>
                <dd className={dupTotal > 0 ? 'w-[58px] text-right' : ''}>
                  {Number(stages[stage.key] ?? 0)}
                </dd>
                {dupTotal > 0 && (
                  <dd className="w-[58px] text-right">{Number(dupStages?.[stage.key] ?? 0)}</dd>
                )}
              </div>
            ))}
          </dl>

          {(canClose || row.closedAt) && (
            <div className="mb-3 border-t border-edge pt-2">
              {closing.error && <p className="mb-1 text-note text-danger">{closing.error}</p>}

              {canClose && (
                <>
                  <p className="mb-2 text-note text-soft">
                    Nothing is outstanding. If this lot is not going to handwork,
                    close it and it moves to Past Records.
                  </p>
                  <button
                    type="button"
                    disabled={closing.busy}
                    onClick={() => setClosed(true)}
                    className="h-[32px] rounded-[8px] bg-navy px-4 text-note text-on-dark disabled:opacity-50"
                  >
                    {closing.busy ? 'Closing…' : 'Only embroidery'}
                  </button>
                </>
              )}

              {row.closedAt && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-note text-soft">Closed as embroidery only.</span>
                  <button
                    type="button"
                    disabled={closing.busy}
                    onClick={() => setClosed(false)}
                    className="text-note underline disabled:opacity-50"
                  >
                    {closing.busy ? 'Reopening…' : 'Reopen'}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-edge pt-2">
            <p className="mb-1 text-note text-soft">Challans on this lot</p>

            {detail.loading && <p className="text-note text-soft">Loading…</p>}
            {detail.error && <p className="text-note text-danger">{detail.error}</p>}
            {!detail.loading && !detail.error && detail.challans.length === 0 && (
              <p className="text-note text-soft">None yet.</p>
            )}

            {detail.challans.length > 0 && (
              <div className="flex items-baseline gap-2 pb-[2px] text-note text-soft">
                <span className="w-[16px] shrink-0" />
                <span className="w-[36px] shrink-0" />
                <span className="min-w-0 flex-1" />
                <span className="w-[58px] shrink-0 text-right">Quantity</span>
                <span className="w-[58px] shrink-0 text-right">Dup. Qty</span>
              </div>
            )}

            {detail.challans.map((challan) => {
              // `?? 0` matters: a server that predates the dupatta fields sends
              // them as undefined, which would render as NaN.
              const qty = Number(challan.quantity ?? 0);
              const dup = Number(challan.dup_qty ?? 0);
              const gotQty = Number(challan.received ?? 0);
              const gotDup = Number(challan.received_dup ?? 0);

              return (
                <div key={challan.id} className="flex items-baseline gap-2 py-[3px] text-note">
                  <span className="w-[16px] shrink-0 text-soft">
                    {challan.kind === 'handwork' ? 'H' : 'E'}
                  </span>
                  <span className="w-[36px] shrink-0 font-semibold">{challan.challan_no}</span>
                  <span className="min-w-0 flex-1 truncate text-soft">
                    {challan.master_head || '—'} · {formatDate(challan.date)}
                  </span>
                  {/* Each axis in its own column, and a dash where a challan
                      carries none of it - a dupatta-only challan showing "0/0"
                      under Quantity read as though nothing was on it. */}
                  <span className="w-[58px] shrink-0 text-right">
                    {qty > 0 ? `${gotQty}/${qty}` : <span className="text-soft">—</span>}
                  </span>
                  <span className="w-[58px] shrink-0 text-right">
                    {dup > 0 ? `${gotDup}/${dup}` : <span className="text-soft">—</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Popover>
    </>
  );
}
