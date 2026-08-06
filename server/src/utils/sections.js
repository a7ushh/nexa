/**
 * Which section a row belongs to. The names match the Figma dividers.
 */
import { GREY_PAST_AFTER_DAYS, ISSUE_DEADLINE_DAYS } from '../config/constants.js';

export const SECTIONS = Object.freeze({
  NOT_RECEIVED: 'not_received',
  IN_PROGRESS: 'in_progress',
  PAST: 'past',
});

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysSince(value, now = new Date()) {
  const then = value instanceof Date ? value : new Date(value);
  return Math.floor((now.getTime() - then.getTime()) / DAY_MS);
}

/** Grey: a lot created more than a month ago drops into Past Operation. */
export function greySection(row, now = new Date()) {
  return daysSince(row.created_at, now) > GREY_PAST_AFTER_DAYS
    ? SECTIONS.PAST
    : SECTIONS.IN_PROGRESS;
}

/**
 * Issue challans.
 *
 * Fully received leaves the floor entirely; anything still outstanding after
 * the deadline is flagged as Not Received; everything else is in progress.
 */
export function issueSection(row, now = new Date()) {
  const issued = Number(row.issued_pieces ?? 0);
  const received = Number(row.received_pieces ?? 0);

  if (issued > 0 && received >= issued) return SECTIONS.PAST;
  if (daysSince(row.date, now) > ISSUE_DEADLINE_DAYS) return SECTIONS.NOT_RECEIVED;
  return SECTIONS.IN_PROGRESS;
}

/** How overdue an issue challan is, for the "N days delay" line on the card. */
export function delayDays(row, now = new Date()) {
  return Math.max(0, daysSince(row.date, now) - ISSUE_DEADLINE_DAYS);
}

/** Receive challans: complete once the whole issued quantity is back. */
export function receiveSection(row) {
  const issued = Number(row.issued_pieces ?? 0);
  const received = Number(row.received_pieces ?? 0);
  return issued > 0 && received >= issued ? SECTIONS.PAST : SECTIONS.IN_PROGRESS;
}
