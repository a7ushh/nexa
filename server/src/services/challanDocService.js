/**
 * Builds the printable challan. Nothing is stored - the document is generated
 * on demand from the rows it covers (steps.md: "it is not stored it generated
 * which can be directly share or download").
 */
import * as challanRepository from '../repositories/challanRepository.js';
import * as companyRepository from '../repositories/companyRepository.js';
import * as masterRepository from '../repositories/masterRepository.js';
import * as logService from './logService.js';
import { toIssueChallan, toReceiveChallan } from '../models/challan.js';
import { renderChallan, challanLabel } from '../utils/challanPdf.js';
import { LOG_ACTIONS } from '../config/constants.js';
import { badRequest, notFound } from '../utils/httpError.js';

export async function generate(req, { kind, direction, ids }) {
  const mapper = direction === 'receive' ? toReceiveChallan : toIssueChallan;

  const rows = [];
  for (const id of ids) {
    const row = await challanRepository.findById(direction, req.companyId, kind, id);
    if (!row) throw notFound(`Challan ${id} no longer exists.`);
    rows.push(mapper(row));
  }
  if (rows.length === 0) throw badRequest('Select at least one row to share.');

  // A multi-share groups the selected rows under the first row's challan.
  const head = rows[0];
  const company = await companyRepository.findById(req.companyId);

  // The party address comes from the master head on the challan.
  const master = head.masterId
    ? await masterRepository.findById(req.companyId, head.masterId)
    : null;

  const pdf = await renderChallan({
    rows,
    meta: {
      companyName: company?.name ?? 'GARG',
      companyAddress: company?.address ?? '',
      companyPhone: company?.phone ?? '',
      kind,
      direction,
      challanNo: head.challanNo,
      date: head.date,
      masterHead: head.masterHead,
      masterAddress: master?.address ?? '',
    },
  });

  await logService.record(req, {
    action: LOG_ACTIONS.SHARE,
    entity: direction === 'receive' ? 'receive_challans' : 'issue_challans',
    entityId: head.id,
    details: { kind, count: rows.length, challanNo: head.challanNo },
  });

  return { pdf, filename: `${challanLabel(kind, head.challanNo)}.pdf` };
}
