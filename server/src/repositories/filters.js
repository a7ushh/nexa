/**
 * Turns the shared filter payload into parameterised SQL fragments.
 *
 * One builder is used by every module and by the report, so a filter behaves
 * identically wherever it appears (steps.md lists the same fields per page).
 */

/** `a / b / c` -> ['a','b','c'], dropping blanks. Exported for the suggester. */
export function splitTerms(value) {
  return String(value ?? '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);
}

export class SqlBuilder {
  constructor(startIndex = 1) {
    this.clauses = [];
    this.params = [];
    this.index = startIndex;
  }

  add(fragment, ...values) {
    const rendered = fragment.replace(/\?/g, () => `$${this.index++}`);
    this.clauses.push(rendered);
    this.params.push(...values);
    return this;
  }

  /**
   * Case-insensitive "contains", skipped when the value is blank.
   *
   * A value may hold several alternatives separated by `/`, e.g.
   * `cotton / micro`, in which case the row matches if *any* of them does.
   */
  like(column, value) {
    if (value === undefined || value === null || String(value).trim() === '') return this;

    const terms = splitTerms(value);
    if (terms.length === 0) return this;
    if (terms.length === 1) return this.add(`${column} ILIKE ?`, `%${terms[0]}%`);

    const clause = terms.map(() => `${column} ILIKE ?`).join(' OR ');
    return this.add(`(${clause})`, ...terms.map((term) => `%${term}%`));
  }

  equals(column, value) {
    if (value === undefined || value === null || value === '') return this;
    return this.add(`${column} = ?`, value);
  }

  bool(column, value) {
    if (value === undefined || value === null || value === '') return this;
    return this.add(`${column} = ?`, value === true || value === 'true' || value === 'yes');
  }

  dateFrom(column, value) {
    if (!value) return this;
    return this.add(`${column} >= ?`, value);
  }

  dateTo(column, value) {
    if (!value) return this;
    return this.add(`${column} <= ?`, value);
  }

  get where() {
    return this.clauses.length ? `AND ${this.clauses.join(' AND ')}` : '';
  }
}

/**
 * Filters shared by the challan tables (embroidery and handwork, issue and
 * receive). `alias` is the table alias used by the caller's query.
 */
export function challanFilters(builder, filters = {}, { alias = 'c', masterAlias = 'm' } = {}) {
  builder
    .like(`l.lot_no`, filters.lotNo)
    .like(`${alias}.challan_no`, filters.challanNo)
    .like(`${masterAlias}.name`, filters.masterHead)
    .like(`${alias}.fabric`, filters.fabric)
    .like(`${alias}.design`, filters.design)
    .dateFrom(`${alias}.date`, filters.dateFrom)
    .dateTo(`${alias}.date`, filters.dateTo);

  if (filters.dupatta !== undefined && filters.dupatta !== null && filters.dupatta !== '') {
    // "Dupatta (boolean)" on the filter panel: yes means the dupatta column is
    // set to `yes`, no means one of the no-dupatta finishes.
    const wantsDupatta = filters.dupatta === true || filters.dupatta === 'true';
    builder.add(wantsDupatta ? `${alias}.dupatta = ?` : `${alias}.dupatta <> ?`, 'yes');
  }

  return builder;
}

/** Filters for the Grey table. */
export function greyFilters(builder, filters = {}, { alias = 'g', masterAlias = 'm' } = {}) {
  builder
    .like(`${alias}.lot_no`, filters.lotNo)
    .like(`${masterAlias}.name`, filters.masterHead)
    .like(`${alias}.fabric`, filters.fabric)
    .like(`${alias}.chart`, filters.chart)
    .dateFrom(`${alias}.date`, filters.dateFrom)
    .dateTo(`${alias}.date`, filters.dateTo);

  if (filters.dupatta !== undefined && filters.dupatta !== null && filters.dupatta !== '') {
    const wantsDupatta = filters.dupatta === true || filters.dupatta === 'true';
    builder.add(wantsDupatta ? `${alias}.dupatta <> ?` : `${alias}.dupatta = ?`, 'no');
  }

  builder.bool(`${alias}.bottom`, filters.bottom);

  return builder;
}
