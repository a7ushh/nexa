/**
 * Amount arithmetic. Always computed on the server - the client shows a live
 * preview but never decides the stored value.
 *
 *   issue   : (dup_qty + quantity) * rate
 *   receive : (dup_qty + quantity - damage_loss) * rate
 *
 * Handwork has no dupatta, so dup_qty plays no part there. On an embroidery
 * challan the two are mutually exclusive: a dupatta challan carries dup_qty and
 * no quantity, a garment challan the other way round, so the sum is simply
 * "the pieces this challan covers".
 */
import { WORK_KINDS } from '../config/constants.js';

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const num = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Pieces a challan covers. */
export function billablePieces({ kind, dupQty, quantity }) {
  return kind === WORK_KINDS.HANDWORK ? num(quantity) : num(dupQty) + num(quantity);
}

export function issueAmount({ kind, dupQty, quantity, rate }) {
  return round2(billablePieces({ kind, dupQty, quantity }) * num(rate));
}

/** Damaged and lost pieces are not billable, so they come off before the rate. */
export function receiveAmount({ kind, dupQty, quantity, rate, damageLoss }) {
  const net = billablePieces({ kind, dupQty, quantity }) - num(damageLoss);
  return round2(Math.max(0, net) * num(rate));
}
