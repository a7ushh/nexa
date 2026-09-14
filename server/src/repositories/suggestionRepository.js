import { query } from '../config/db.js';

/**
 * Distinct existing values for a filter field, so every filter input can
 * suggest what is actually in the data rather than making the user guess.
 *
 * The column allow-list is the security boundary here: `field` comes from the
 * client and is never interpolated, only used to look up a fixed expression.
 */
const SOURCES = {
  grey: {
    table: 'grey_lots g LEFT JOIN masters m ON m.id = g.master_id',
    fields: {
      lotNo: 'g.lot_no',
      masterHead: 'm.name',
      fabric: 'g.fabric',
      chart: 'g.chart',
      cut: 'g.cut',
    },
  },
  issue: {
    table: `issue_challans c
            LEFT JOIN grey_lots l ON l.id = c.lot_id
            LEFT JOIN masters m   ON m.id = c.master_id`,
    fields: {
      lotNo: 'l.lot_no',
      challanNo: 'c.challan_no',
      masterHead: 'm.name',
      fabric: 'c.fabric',
      chart: 'c.chart',
      design: 'c.design',
    },
  },
  receive: {
    table: `receive_challans c
            LEFT JOIN grey_lots l ON l.id = c.lot_id
            LEFT JOIN masters m   ON m.id = c.master_id`,
    fields: {
      lotNo: 'l.lot_no',
      challanNo: 'c.challan_no',
      retailChallanNo: 'c.retail_challan_no',
      masterHead: 'm.name',
      fabric: 'c.fabric',
      chart: 'c.chart',
      design: 'c.design',
    },
  },
};

/** Which scopes a report filter should draw its suggestions from. */
const REPORT_SCOPES = ['grey', 'issue', 'receive'];

export function isKnownField(scope, field) {
  if (scope === 'report') return REPORT_SCOPES.some((item) => SOURCES[item].fields[field]);
  return Boolean(SOURCES[scope]?.fields[field]);
}

async function distinct(scope, { companyId, kind, field, term, limit }) {
  const source = SOURCES[scope];
  const column = source.fields[field];
  if (!column) return [];

  const alias = scope === 'grey' ? 'g' : 'c';
  const params = [companyId, `%${term}%`, `${term}%`, limit];
  let kindClause = '';

  if (scope !== 'grey' && kind) {
    params.splice(1, 0, kind);
    kindClause = `AND ${alias}.kind = $2`;
  }

  // Renumber placeholders after the optional kind parameter.
  const p = (base) => `$${base + (kindClause ? 1 : 0)}`;

  // The prefix rank has to live in the select list for DISTINCT, so the
  // ranking and de-duplication happen in a subquery and the ordering outside.
  const { rows } = await query(
    `SELECT value
       FROM (
         SELECT DISTINCT
                ${column} AS value,
                CASE WHEN ${column} ILIKE ${p(3)} THEN 0 ELSE 1 END AS rank
           FROM ${source.table}
          WHERE ${alias}.company_id = $1
            AND ${alias}.deleted_at IS NULL
            ${kindClause}
            AND ${column} IS NOT NULL
            AND ${column} <> ''
            AND ${column} ILIKE ${p(2)}
       ) matches
      ORDER BY matches.rank, matches.value
      LIMIT ${p(4)}`,
    params,
  );

  return rows.map((row) => row.value);
}

export async function suggest({ scope, companyId, kind, field, term, limit = 8 }) {
  if (scope !== 'report') {
    return distinct(scope, { companyId, kind, field, term, limit });
  }

  // The report filters span every table, so merge and de-duplicate.
  const merged = new Set();
  for (const item of REPORT_SCOPES) {
    if (!SOURCES[item].fields[field]) continue;
    for (const value of await distinct(item, { companyId, kind: null, field, term, limit })) {
      merged.add(value);
    }
    if (merged.size >= limit) break;
  }
  return [...merged].slice(0, limit);
}
