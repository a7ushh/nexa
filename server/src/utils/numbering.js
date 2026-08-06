/**
 * Lot and challan numbering.
 *
 * Lot numbers are MMSS (month + series); challan numbers are unique per
 * company and kind, prefilled with the next number but editable.
 *
 * Both helpers take a transaction client so allocation happens inside the same
 * transaction as the insert, which is what stops two simultaneous creates from
 * claiming the same number.
 */

const pad2 = (value) => String(value).padStart(2, '0');

/**
 * Next lot number for a company: MM + a per-month series, four digits total.
 * Example: the first lot in August is `0801`.
 *
 * Lots created before this format was adopted are six digits (DDMMSS); the
 * length check keeps those out of the series calculation so an old `080204`
 * cannot be mistaken for series 204 of month 08.
 */
export async function nextLotNo(client, companyId, date = new Date()) {
  const prefix = pad2(date.getMonth() + 1);

  // Locks the company's rows for this prefix so a concurrent insert waits.
  const { rows } = await client.query(
    `SELECT lot_no FROM grey_lots
      WHERE company_id = $1
        AND lot_no LIKE $2
        AND length(lot_no) = 4
      ORDER BY lot_no DESC
      LIMIT 1
      FOR UPDATE`,
    [companyId, `${prefix}%`],
  );

  const lastSeries = rows[0] ? Number(rows[0].lot_no.slice(2)) : 0;
  return `${prefix}${pad2(lastSeries + 1)}`;
}

/**
 * Next challan number for a company and kind. Returned as a string because the
 * user may overwrite it with anything unique.
 */
export async function nextChallanNo(client, companyId, kind) {
  const { rows } = await client.query(
    `SELECT COALESCE(MAX(challan_no::numeric), 0) AS highest
       FROM issue_challans
      WHERE company_id = $1 AND kind = $2 AND deleted_at IS NULL
        AND challan_no ~ '^[0-9]+$'`,
    [companyId, kind],
  );
  return String(Number(rows[0].highest) + 1);
}

/** Same, for receive challans. */
export async function nextReceiveChallanNo(client, companyId, kind) {
  const { rows } = await client.query(
    `SELECT COALESCE(MAX(challan_no::numeric), 0) AS highest
       FROM receive_challans
      WHERE company_id = $1 AND kind = $2 AND deleted_at IS NULL
        AND challan_no ~ '^[0-9]+$'`,
    [companyId, kind],
  );
  return String(Number(rows[0].highest) + 1);
}
