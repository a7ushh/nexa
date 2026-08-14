/**
 * Amount arithmetic. Always computed on the server - the client shows a live
 * preview but never decides the stored value.
 *
 *   issue   : (dup_qty or quantity) * rate
 *   receive : ((dup_qty or quantity) - damage_loss) * rate
 *
 * Both trades carry dupatta, and a challan is one thing or the other: a dupatta
 * challan bills its dupatta pieces, a garment challan its quantity.
 */

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const num = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Pieces a challan bills for.
 *
 * A challan is either a dupatta challan or a garment challan, so the two are an
 * either/or rather than a sum: dupatta wins whenever it is set. A garment
 * quantity entered alongside a dupatta quantity is therefore not billed.
 */
export function billablePieces({ dupQty, quantity }) {
  return num(dupQty) > 0 ? num(dupQty) : num(quantity);
}

export function issueAmount({ dupQty, quantity, rate }) {
  return round2(billablePieces({ dupQty, quantity }) * num(rate));
}

/** Damaged and lost pieces are not billable, so they come off before the rate. */
export function receiveAmount({ dupQty, quantity, rate, damageLoss }) {
  const net = billablePieces({ dupQty, quantity }) - num(damageLoss);
  return round2(Math.max(0, net) * num(rate));
}
