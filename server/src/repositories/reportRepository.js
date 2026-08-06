import { query } from '../config/db.js';
import { SqlBuilder } from './filters.js';

/**
 * steps.md: "It shows all the tables(rows) which are involved that are showed
 * with a last row add as total- in each table" and "Each filter fetches its own
 * table then join them union."
 *
 * Each section is fetched with the same filter set, then the five results are
 * returned side by side with their own totals.
 */

const SHARED_FILTERS = ['lotNo', 'challanNo', 'masterHead', 'fabric', 'dateFrom', 'dateTo'];

function applyShared(builder, filters, { lotColumn, challanColumn, alias, masterAlias = 'm' }) {
  builder.like(lotColumn, filters.lotNo);
  if (challanColumn) builder.like(challanColumn, filters.challanNo);
  builder
    .like(`${masterAlias}.name`, filters.masterHead)
    .like(`${alias}.fabric`, filters.fabric)
    .dateFrom(`${alias}.date`, filters.dateFrom)
    .dateTo(`${alias}.date`, filters.dateTo);
  return builder;
}

/**
 * A challan-no. filter cannot match grey lots, which have no challan number.
 * Asking for one means the grey section is legitimately empty.
 */
function greyExcludedBy(filters) {
  return Boolean(filters.challanNo && String(filters.challanNo).trim());
}

export async function greySection(companyId, filters) {
  if (greyExcludedBy(filters)) return { rows: [], total: 0 };

  const builder = new SqlBuilder(2);
  applyShared(builder, filters, { lotColumn: 'g.lot_no', alias: 'g' });

  const { rows } = await query(
    `SELECT g.id, g.lot_no, g.date, m.name AS master_head, g.fabric, g.chart,
            g.cut, g.quantity, g.dupatta, g.bottom
       FROM grey_lots g
       LEFT JOIN masters m ON m.id = g.master_id
      WHERE g.company_id = $1 AND g.deleted_at IS NULL ${builder.where}
      ORDER BY g.date DESC, g.id DESC`,
    [companyId, ...builder.params],
  );

  // Grey lots carry no amount; the section totals pieces instead.
  return { rows, total: rows.reduce((sum, row) => sum + Number(row.quantity), 0) };
}

export async function issueSection(companyId, kind, filters) {
  const builder = new SqlBuilder(3);
  applyShared(builder, filters, {
    lotColumn: 'l.lot_no',
    challanColumn: 'c.challan_no',
    alias: 'c',
  });

  const { rows } = await query(
    `SELECT c.id, c.date, l.lot_no, c.challan_no, m.name AS master_head, c.fabric,
            c.design, c.dupatta, c.dup_qty, c.quantity, c.rate, c.amount
       FROM issue_challans c
       LEFT JOIN grey_lots l ON l.id = c.lot_id
       LEFT JOIN masters m   ON m.id = c.master_id
      WHERE c.company_id = $1 AND c.kind = $2 AND c.deleted_at IS NULL ${builder.where}
      ORDER BY c.date DESC, c.id DESC`,
    [companyId, kind, ...builder.params],
  );

  return { rows, total: rows.reduce((sum, row) => sum + Number(row.amount), 0) };
}

export async function receiveSection(companyId, kind, filters) {
  const builder = new SqlBuilder(3);
  applyShared(builder, filters, {
    lotColumn: 'l.lot_no',
    challanColumn: 'c.challan_no',
    alias: 'c',
  });

  const { rows } = await query(
    `SELECT c.id, c.date, l.lot_no, c.challan_no, c.retail_challan_no,
            m.name AS master_head, c.fabric, c.design, c.dupatta, c.dup_qty,
            c.quantity, c.rate, c.damage_loss, c.amount
       FROM receive_challans c
       LEFT JOIN grey_lots l ON l.id = c.lot_id
       LEFT JOIN masters m   ON m.id = c.master_id
      WHERE c.company_id = $1 AND c.kind = $2 AND c.deleted_at IS NULL ${builder.where}
      ORDER BY c.date DESC, c.id DESC`,
    [companyId, kind, ...builder.params],
  );

  return { rows, total: rows.reduce((sum, row) => sum + Number(row.amount), 0) };
}

export { SHARED_FILTERS };
