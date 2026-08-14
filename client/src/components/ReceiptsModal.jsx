import { IconClose } from './icons.jsx';
import { formatDate, formatMoney } from '../utils/format.js';

/**
 * Every receipt booked against one issue challan, opened by clicking its row on
 * an issue page.
 *
 * An issue challan is routinely received in parts, so "what has come back
 * against this one" is not answerable from the row itself - the row only carries
 * the totals. Same shell as HistoryModal so the two behave alike.
 */
export default function ReceiptsModal({ challan, receipts, loading, onClose }) {
  const outstanding = Number(challan?.outstandingPieces ?? 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-6">
      <div className="max-h-[82vh] w-full max-w-[760px] overflow-y-auto rounded-[14px] bg-surface p-[26px]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-mono text-title font-bold">
            Challan {challan?.challanNo} — receipts
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="btn-icon">
            <IconClose width={20} height={20} />
          </button>
        </div>

        {loading && <p className="text-data text-soft">Loading…</p>}

        {!loading && challan && (
          <p className="mb-4 text-data text-soft">
            Issued {challan.issuedPieces} · received {challan.receivedPieces} ·{' '}
            <span className={outstanding > 0 ? 'font-semibold text-ink_text' : ''}>
              {outstanding > 0 ? `${outstanding} still outstanding` : 'fully received'}
            </span>
          </p>
        )}

        {!loading && receipts.length === 0 && (
          <p className="text-data text-soft">Nothing has been received against this challan yet.</p>
        )}

        {receipts.length > 0 && (
          <div className="overflow-x-auto rounded-[10px] border border-edge">
            <table className="w-full min-w-[620px] border-collapse text-note">
              <thead>
                <tr className="bg-navy text-left text-on-dark">
                  <th className="px-3 py-2 font-medium">Receive no.</th>
                  <th className="px-3 py-2 font-medium">Retail no.</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 text-right font-medium">Dup. Qty</th>
                  <th className="px-3 py-2 text-right font-medium">Quantity</th>
                  <th className="px-3 py-2 text-right font-medium">Damage/Loss</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((receipt, index) => (
                  <tr key={receipt.id} className={index % 2 === 1 ? 'bg-offwhite' : 'bg-surface'}>
                    <td className="px-3 py-2 font-semibold">{receipt.challan_no}</td>
                    <td className="px-3 py-2">{receipt.retail_challan_no || '—'}</td>
                    <td className="px-3 py-2">{formatDate(receipt.date)}</td>
                    <td className="px-3 py-2 text-right">{Number(receipt.dup_qty)}</td>
                    <td className="px-3 py-2 text-right">{Number(receipt.quantity)}</td>
                    <td className="px-3 py-2 text-right">{Number(receipt.damage_loss)}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(receipt.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
