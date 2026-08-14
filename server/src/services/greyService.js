import * as greyRepository from '../repositories/greyRepository.js';
import * as recordService from './recordService.js';
import { closeBlocker, toGreyLot, toGreyLots } from '../models/greyLot.js';
import { nextLotNo } from '../utils/numbering.js';
import { LOG_ACTIONS } from '../config/constants.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { withTransaction } from '../config/db.js';

const TABLE = 'grey_lots';

export async function list(companyId, filters) {
  return toGreyLots(await greyRepository.list(companyId, filters));
}

/**
 * `kind` makes the type-ahead hint trade-correct: an embroidery form should see
 * what the lot has left, a handwork form what embroidery has given back.
 */
export async function search(companyId, term, kind) {
  return toGreyLots(await greyRepository.search(companyId, term), { kind });
}

/** Every challan tied to a lot, for the progress bar's popover. */
export function flow(companyId, lotId) {
  return greyRepository.flow(companyId, lotId);
}

export async function history(companyId, id) {
  return withTransaction(async (client) => {
    const row = await greyRepository.findById(companyId, id, client);
    if (!row) throw notFound('That lot no longer exists.');

    const stored = await recordService.revisions(client, { table: TABLE, id });
    // Each stored revision is the row *before* an edit, so the live row is
    // needed as the final state for the newest change to be visible.
    return [...stored, { version: stored.length + 1, data: row, changedAt: row.updated_at, current: true }];
  });
}

export async function create(req, data) {
  return recordService.perform(
    req,
    { action: LOG_ACTIONS.CREATE, entity: TABLE },
    async (client) => {
      // Allocated inside the transaction so two lots on the same day cannot
      // claim the same series number.
      const lotNo = await nextLotNo(client, req.companyId, new Date(data.date));

      const id = await greyRepository.insert(client, req.companyId, {
        ...data,
        lotNo,
        userId: req.user.id,
      });

      const row = await greyRepository.findById(req.companyId, id, client);
      return { record: toGreyLot(row), entityId: Number(id), details: { lotNo } };
    },
  );
}

export async function update(req, id, data) {
  return recordService.perform(
    req,
    { action: LOG_ACTIONS.UPDATE, entity: TABLE },
    async (client) => {
      const before = await greyRepository.findById(req.companyId, id, client);
      if (!before) throw notFound('That lot no longer exists.');

      // Shrinking a lot below what is already on challans would corrupt the
      // outstanding maths, so it is refused.
      const alreadyIssued = Math.max(Number(before.issued_qty ?? 0), Number(before.issued_dup ?? 0));
      if (Number(data.quantity) < alreadyIssued) {
        throw badRequest(
          `Quantity cannot drop below the ${alreadyIssued} already issued against this lot.`,
        );
      }

      await recordService.snapshot(client, {
        table: TABLE,
        id,
        companyId: req.companyId,
        row: before,
        changedBy: req.user.id,
      });

      await greyRepository.update(client, req.companyId, id, { ...data, userId: req.user.id });
      const row = await greyRepository.findById(req.companyId, id, client);

      return { record: toGreyLot(row), entityId: Number(id), details: { lotNo: before.lot_no } };
    },
  );
}

export async function remove(req, id) {
  const challans = await greyRepository.challanCount(req.companyId, id);
  if (challans > 0) {
    throw badRequest(`This lot has ${challans} challan(s) against it and cannot be deleted.`);
  }

  return recordService.perform(
    req,
    { action: LOG_ACTIONS.DELETE, entity: TABLE },
    async (client) => {
      const before = await greyRepository.findById(req.companyId, id, client);
      if (!before) throw notFound('That lot no longer exists.');

      await recordService.snapshot(client, {
        table: TABLE,
        id,
        companyId: req.companyId,
        row: before,
        changedBy: req.user.id,
      });

      await greyRepository.softDelete(client, req.companyId, id, req.user.id);
      return { record: { id: Number(id) }, entityId: Number(id), details: { lotNo: before.lot_no } };
    },
  );
}

/**
 * Closing a lot by hand.
 *
 * A lot normally finishes when everything is back from handwork, but plenty
 * only ever go to embroidery. Once nothing is outstanding anywhere, somebody can
 * say so and the lot drops into Past Records - a judgement the data cannot make
 * for itself.
 */
export async function setClosed(req, id, closed) {
  return recordService.perform(
    req,
    { action: LOG_ACTIONS.UPDATE, entity: TABLE },
    async (client) => {
      const before = await greyRepository.findById(req.companyId, id, client);
      if (!before) throw notFound('That lot no longer exists.');

      // Refuse while anything is still moving - the same rule the button uses
      // to decide whether to appear, enforced here so an API call cannot
      // bypass it. See closeBlocker in models/greyLot.js.
      if (closed) {
        const blocker = closeBlocker(before);
        if (blocker) throw badRequest(`Lot ${before.lot_no} still has ${blocker}.`);
      }

      await recordService.snapshot(client, {
        table: TABLE,
        id,
        companyId: req.companyId,
        row: before,
        changedBy: req.user.id,
      });

      await greyRepository.setClosed(client, req.companyId, id, req.user.id, closed);
      const row = await greyRepository.findById(req.companyId, id, client);

      return {
        record: toGreyLot(row),
        entityId: Number(id),
        details: { lotNo: before.lot_no, closed },
      };
    },
  );
}

export async function removeMany(req, ids) {
  const removed = [];
  for (const id of ids) {
    await remove(req, id);
    removed.push(id);
  }
  return removed;
}
