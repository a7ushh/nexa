import * as challanRepository from '../repositories/challanRepository.js';
import * as recordService from './recordService.js';
import { toIssueChallan, toIssueChallans, toReceiveChallan, toReceiveChallans } from '../models/challan.js';
import { issueAmount, receiveAmount } from '../utils/amounts.js';
import { nextChallanNo, nextReceiveChallanNo } from '../utils/numbering.js';
import { assertIssueWithinLot, assertReceiveWithinIssue } from '../utils/quantities.js';
import { LOG_ACTIONS, WORK_KINDS } from '../config/constants.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { withTransaction } from '../config/db.js';

const ISSUE_TABLE = 'issue_challans';
const RECEIVE_TABLE = 'receive_challans';

/* ------------------------------------------------------------------ issue -- */

export async function listIssues(companyId, kind, filters) {
  return toIssueChallans(await challanRepository.list('issue', companyId, kind, filters));
}

export async function searchIssues(companyId, kind, term) {
  return toIssueChallans(await challanRepository.searchIssues(companyId, kind, term));
}

/** Prefills the challan-no. field with max + 1 (the user may overwrite it). */
export async function suggestIssueNo(companyId, kind) {
  return withTransaction((client) => nextChallanNo(client, companyId, kind));
}

export async function suggestReceiveNo(companyId, kind) {
  return withTransaction((client) => nextReceiveChallanNo(client, companyId, kind));
}

export async function issueHistory(companyId, kind, id) {
  return withTransaction(async (client) => {
    const row = await challanRepository.findById('issue', companyId, kind, id, client);
    if (!row) throw notFound('That challan no longer exists.');

    const stored = await recordService.revisions(client, { table: ISSUE_TABLE, id });
    return [...stored, { version: stored.length + 1, data: row, changedAt: row.updated_at, current: true }];
  });
}

export async function createIssue(req, kind, data) {
  return recordService.perform(
    req,
    { action: LOG_ACTIONS.CREATE, entity: ISSUE_TABLE },
    async (client) => {
      // Handwork has no dupatta at all.
      const dupQty = kind === WORK_KINDS.HANDWORK ? 0 : data.dupQty;
      const dupatta = kind === WORK_KINDS.HANDWORK ? null : data.dupatta;

      await assertIssueWithinLot(client, {
        companyId: req.companyId,
        lotId: data.lotId,
        quantity: data.quantity,
        dupQty,
      });

      const challanNo = data.challanNo || (await nextChallanNo(client, req.companyId, kind));
      const amount = issueAmount({ kind, dupQty, quantity: data.quantity, rate: data.rate });

      const id = await challanRepository.insertIssue(client, req.companyId, kind, {
        ...data,
        challanNo,
        dupatta,
        dupQty,
        amount,
        userId: req.user.id,
      });

      const row = await challanRepository.findById('issue', req.companyId, kind, id, client);
      return { record: toIssueChallan(row), entityId: Number(id), details: { challanNo, kind } };
    },
  );
}

export async function updateIssue(req, kind, id, data) {
  return recordService.perform(
    req,
    { action: LOG_ACTIONS.UPDATE, entity: ISSUE_TABLE },
    async (client) => {
      const before = await challanRepository.findById('issue', req.companyId, kind, id, client);
      if (!before) throw notFound('That challan no longer exists.');

      const dupQty = kind === WORK_KINDS.HANDWORK ? 0 : data.dupQty;
      const dupatta = kind === WORK_KINDS.HANDWORK ? null : data.dupatta;

      // The row being edited is excluded so its own pieces do not count twice.
      await assertIssueWithinLot(client, {
        companyId: req.companyId,
        lotId: data.lotId,
        quantity: data.quantity,
        dupQty,
        excludeIssueId: id,
      });

      // Editing down below what has already come back would break the maths.
      const received = Number(before.received_pieces ?? 0);
      const nowIssued = Number(data.quantity) + Number(dupQty);
      if (nowIssued < received) {
        throw badRequest(`Quantity cannot drop below the ${received} already received.`);
      }

      await recordService.snapshot(client, {
        table: ISSUE_TABLE,
        id,
        companyId: req.companyId,
        row: before,
        changedBy: req.user.id,
      });

      const amount = issueAmount({ kind, dupQty, quantity: data.quantity, rate: data.rate });
      await challanRepository.updateIssue(client, req.companyId, kind, id, {
        ...data,
        dupatta,
        dupQty,
        amount,
        userId: req.user.id,
      });

      const row = await challanRepository.findById('issue', req.companyId, kind, id, client);
      return {
        record: toIssueChallan(row),
        entityId: Number(id),
        details: { challanNo: before.challan_no, kind },
      };
    },
  );
}

export async function removeIssue(req, kind, id) {
  const receipts = await challanRepository.receiveCount(req.companyId, id);
  if (receipts > 0) {
    throw badRequest(`This challan has ${receipts} receipt(s) against it and cannot be deleted.`);
  }

  return recordService.perform(
    req,
    { action: LOG_ACTIONS.DELETE, entity: ISSUE_TABLE },
    async (client) => {
      const before = await challanRepository.findById('issue', req.companyId, kind, id, client);
      if (!before) throw notFound('That challan no longer exists.');

      await recordService.snapshot(client, {
        table: ISSUE_TABLE,
        id,
        companyId: req.companyId,
        row: before,
        changedBy: req.user.id,
      });

      await challanRepository.softDelete(client, 'issue', req.companyId, kind, id, req.user.id);
      return {
        record: { id: Number(id) },
        entityId: Number(id),
        details: { challanNo: before.challan_no, kind },
      };
    },
  );
}

/* ---------------------------------------------------------------- receive -- */

export async function listReceives(companyId, kind, filters) {
  return toReceiveChallans(await challanRepository.list('receive', companyId, kind, filters));
}

export async function receiveHistory(companyId, kind, id) {
  return withTransaction(async (client) => {
    const row = await challanRepository.findById('receive', companyId, kind, id, client);
    if (!row) throw notFound('That receipt no longer exists.');

    const stored = await recordService.revisions(client, { table: RECEIVE_TABLE, id });
    return [...stored, { version: stored.length + 1, data: row, changedAt: row.updated_at, current: true }];
  });
}

export async function createReceive(req, kind, data) {
  return recordService.perform(
    req,
    { action: LOG_ACTIONS.CREATE, entity: RECEIVE_TABLE },
    async (client) => {
      const dupQty = kind === WORK_KINDS.HANDWORK ? 0 : data.dupQty;

      const state = await assertReceiveWithinIssue(client, {
        companyId: req.companyId,
        issueId: data.issueChallanId,
        quantity: data.quantity,
        dupQty,
      });

      const challanNo = data.challanNo || (await nextReceiveChallanNo(client, req.companyId, kind));
      const amount = receiveAmount({
        kind,
        dupQty,
        quantity: data.quantity,
        rate: data.rate,
        damageLoss: data.damageLoss,
      });

      const id = await challanRepository.insertReceive(client, req.companyId, kind, {
        ...data,
        challanNo,
        dupQty,
        dupatta: kind === WORK_KINDS.HANDWORK ? null : data.dupatta ?? state.issue.dupatta,
        lotId: data.lotId ?? Number(state.issue.lot_id),
        amount,
        userId: req.user.id,
      });

      const row = await challanRepository.findById('receive', req.companyId, kind, id, client);
      return { record: toReceiveChallan(row), entityId: Number(id), details: { challanNo, kind } };
    },
  );
}

export async function updateReceive(req, kind, id, data) {
  return recordService.perform(
    req,
    { action: LOG_ACTIONS.UPDATE, entity: RECEIVE_TABLE },
    async (client) => {
      const before = await challanRepository.findById('receive', req.companyId, kind, id, client);
      if (!before) throw notFound('That receipt no longer exists.');

      const dupQty = kind === WORK_KINDS.HANDWORK ? 0 : data.dupQty;

      await assertReceiveWithinIssue(client, {
        companyId: req.companyId,
        issueId: data.issueChallanId,
        quantity: data.quantity,
        dupQty,
        excludeReceiveId: id,
      });

      await recordService.snapshot(client, {
        table: RECEIVE_TABLE,
        id,
        companyId: req.companyId,
        row: before,
        changedBy: req.user.id,
      });

      const amount = receiveAmount({
        kind,
        dupQty,
        quantity: data.quantity,
        rate: data.rate,
        damageLoss: data.damageLoss,
      });

      await challanRepository.updateReceive(client, req.companyId, kind, id, {
        ...data,
        dupQty,
        dupatta: kind === WORK_KINDS.HANDWORK ? null : data.dupatta,
        amount,
        userId: req.user.id,
      });

      const row = await challanRepository.findById('receive', req.companyId, kind, id, client);
      return {
        record: toReceiveChallan(row),
        entityId: Number(id),
        details: { challanNo: before.challan_no, kind },
      };
    },
  );
}

export async function removeReceive(req, kind, id) {
  return recordService.perform(
    req,
    { action: LOG_ACTIONS.DELETE, entity: RECEIVE_TABLE },
    async (client) => {
      const before = await challanRepository.findById('receive', req.companyId, kind, id, client);
      if (!before) throw notFound('That receipt no longer exists.');

      await recordService.snapshot(client, {
        table: RECEIVE_TABLE,
        id,
        companyId: req.companyId,
        row: before,
        changedBy: req.user.id,
      });

      await challanRepository.softDelete(client, 'receive', req.companyId, kind, id, req.user.id);
      return {
        record: { id: Number(id) },
        entityId: Number(id),
        details: { challanNo: before.challan_no, kind },
      };
    },
  );
}

/* ------------------------------------------------------------------ bulk -- */

export async function removeMany(req, kind, direction, ids) {
  const removed = [];
  for (const id of ids) {
    if (direction === 'issue') await removeIssue(req, kind, id);
    else await removeReceive(req, kind, id);
    removed.push(id);
  }
  return removed;
}
