import * as reportRepository from '../repositories/reportRepository.js';
import { WORK_KINDS } from '../config/constants.js';

const empty = { rows: [], total: 0 };

/**
 * The stacked sections of the Report page, each with its own total row.
 *
 * `includeEmbroidery` and `includeHandwork` come from the toggles in the filter
 * panel: a trade that is switched off is left out of the report entirely rather
 * than shown empty, and its totals do not reach the grand total.
 *
 * The grey section totals pieces; the four challan sections total amount.
 * Each section stands alone - there is no grand total across them.
 */
export async function build(companyId, filters = {}) {
  const wantEmbroidery = filters.includeEmbroidery !== false;
  const wantHandwork = filters.includeHandwork !== false;

  const [grey, embroideryIssue, embroideryReceive, handworkIssue, handworkReceive] =
    await Promise.all([
      reportRepository.greySection(companyId, filters),
      wantEmbroidery ? reportRepository.issueSection(companyId, WORK_KINDS.EMBROIDERY, filters) : empty,
      wantEmbroidery ? reportRepository.receiveSection(companyId, WORK_KINDS.EMBROIDERY, filters) : empty,
      wantHandwork ? reportRepository.issueSection(companyId, WORK_KINDS.HANDWORK, filters) : empty,
      wantHandwork ? reportRepository.receiveSection(companyId, WORK_KINDS.HANDWORK, filters) : empty,
    ]);

  const sections = [{ key: 'grey', title: 'Grey', totalLabel: 'Total quantity', ...grey }];

  if (wantEmbroidery) {
    sections.push(
      { key: 'embroideryIssue', title: 'Embroidery issue', totalLabel: 'Total', ...embroideryIssue },
      {
        key: 'embroideryReceive',
        title: 'Embroidery receive',
        totalLabel: 'Total',
        ...embroideryReceive,
      },
    );
  }

  if (wantHandwork) {
    sections.push(
      { key: 'handworkIssue', title: 'Handwork issue', totalLabel: 'Total', ...handworkIssue },
      { key: 'handworkReceive', title: 'Handwork receive', totalLabel: 'Total', ...handworkReceive },
    );
  }

  // Each section carries its own total. There is deliberately no roll-up across
  // them: grey totals pieces while the challan sections total money, so a single
  // figure spanning the lot would be adding unlike things.
  return { sections };
}
