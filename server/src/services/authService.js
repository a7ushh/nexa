import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

import * as userRepository from '../repositories/userRepository.js';
import * as logService from './logService.js';
import { toUser } from '../models/user.js';
import { buildAuthUrl, exchangeCode, DRIVE_SCOPE } from '../config/google.js';
import { LOG_ACTIONS, USER_STATUS } from '../config/constants.js';
import { badRequest, forbidden, unauthorized } from '../utils/httpError.js';

/**
 * Sign-in stages, in the order a user meets them.
 *
 *   signed_out       -> show the Google button          (Figma "login")
 *   needs_profile    -> choose username + PIN           (Figma "login -username")
 *   needs_pin        -> enter the PIN, every sign-in    (same frame, PIN only)
 *   pending_approval -> waiting for owner/root          (Figma "login -access")
 *   authenticated    -> pick a company, then the app
 */
export const STAGE = Object.freeze({
  SIGNED_OUT: 'signed_out',
  NEEDS_PROFILE: 'needs_profile',
  NEEDS_PIN: 'needs_pin',
  PENDING_APPROVAL: 'pending_approval',
  AUTHENTICATED: 'authenticated',
});

const PIN_ROUNDS = 10;

/**
 * Creates the consent URL and stores the CSRF state on the session.
 *
 * `includeDrive` is set only by the root user's explicit Drive connect step, so
 * ordinary sign-ins never request a sensitive scope.
 */
export function beginGoogleSignIn(req, { includeDrive = false } = {}) {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;
  req.session.oauthWantsDrive = includeDrive;
  return buildAuthUrl(state, { includeDrive });
}

/**
 * Handles the OAuth callback: verifies state, exchanges the code, upserts the
 * user and parks their id on the session as "identified but not yet signed in".
 */
export async function completeGoogleSignIn(req, { code, state }) {
  if (!state || state !== req.session.oauthState) {
    throw badRequest('Sign-in could not be verified. Please try again.');
  }
  delete req.session.oauthState;

  const wantedDrive = req.session.oauthWantsDrive === true;
  delete req.session.oauthWantsDrive;

  const { profile, refreshToken, grantedScopes } = await exchangeCode(code);
  if (!profile.emailVerified) {
    throw forbidden('That Google account does not have a verified email address.');
  }

  const row = await userRepository.upsertFromGoogle(profile);

  // Only keep a refresh token when Drive was actually granted - it exists to
  // run backups, and nothing else uses it.
  if (refreshToken && grantedScopes.includes(DRIVE_SCOPE)) {
    await userRepository.setRefreshToken(row.id, refreshToken);
  }

  // Re-authorising for Drive happens while already signed in; keep the session.
  if (wantedDrive && req.session.userId) {
    return { stage: STAGE.AUTHENTICATED, user: toUser(row), driveConnected: true };
  }

  // Identified by Google, but not signed in until the PIN is accepted.
  req.session.pendingUserId = Number(row.id);
  delete req.session.userId;
  delete req.session.companyId;

  return stageFor(row);
}

/** Which screen a user row belongs on. */
export function stageFor(row) {
  if (!row) return STAGE.SIGNED_OUT;
  if (!row.username || !row.pin_hash) return STAGE.NEEDS_PROFILE;
  return STAGE.NEEDS_PIN;
}

/** Resolves the current session into a stage plus, once signed in, the user. */
export async function currentState(req) {
  const signedInId = req.session?.userId;
  const pendingId = req.session?.pendingUserId;

  if (signedInId) {
    const row = await userRepository.findById(signedInId);
    if (!row || row.status === USER_STATUS.REMOVED) {
      req.session.destroy(() => {});
      return { stage: STAGE.SIGNED_OUT, user: null };
    }
    return {
      stage: STAGE.AUTHENTICATED,
      user: toUser(row),
      companyId: req.session.companyId ?? null,
    };
  }

  if (pendingId) {
    const row = await userRepository.findById(pendingId);
    if (!row) return { stage: STAGE.SIGNED_OUT, user: null };

    // The PIN was accepted but an owner or root has not granted access yet.
    if (req.session.pinVerified && row.status === USER_STATUS.PENDING) {
      return { stage: STAGE.PENDING_APPROVAL, user: toUser(row) };
    }
    return { stage: stageFor(row), user: null, email: row.email, name: row.name };
  }

  return { stage: STAGE.SIGNED_OUT, user: null };
}

/** First-time username + PIN. */
export async function setProfile(req, { username, pin }) {
  const pendingId = req.session?.pendingUserId;
  if (!pendingId) throw unauthorized('Sign in with Google first.');

  const row = await userRepository.findById(pendingId);
  if (!row) throw unauthorized('Sign in with Google first.');
  if (row.username && row.pin_hash) {
    throw badRequest('This account already has a username and PIN.');
  }

  const taken = await userRepository.findByUsername(username);
  if (taken && Number(taken.id) !== Number(pendingId)) {
    throw badRequest('That username is already taken.');
  }

  const pinHash = await bcrypt.hash(pin, PIN_ROUNDS);
  const updated = await userRepository.setProfile(pendingId, { username, pinHash });

  await logService.record(req, {
    action: LOG_ACTIONS.CREATE,
    entity: 'user_profile',
    entityId: Number(pendingId),
    details: { username },
  });

  return finishSignIn(req, updated);
}

/** PIN check on every sign-in. */
export async function verifyPin(req, { pin }) {
  const pendingId = req.session?.pendingUserId;
  if (!pendingId) throw unauthorized('Sign in with Google first.');

  const row = await userRepository.findById(pendingId);
  if (!row?.pin_hash) throw unauthorized('Sign in with Google first.');

  const ok = await bcrypt.compare(pin, row.pin_hash);
  if (!ok) throw badRequest('Incorrect PIN.');

  return finishSignIn(req, row);
}

/**
 * Shared tail of both PIN paths: an approved user gets a real session, a
 * pending one is held on the Access Denied screen.
 */
async function finishSignIn(req, row) {
  req.session.pinVerified = true;

  if (row.status !== USER_STATUS.ACTIVE) {
    return { stage: STAGE.PENDING_APPROVAL, user: toUser(row) };
  }

  req.session.userId = Number(row.id);
  req.session.lastSeenAt = Date.now();
  await userRepository.touchLastAccess(row.id);

  await logService.record(req, {
    action: LOG_ACTIONS.LOGIN,
    entity: 'user',
    entityId: Number(row.id),
    details: { email: row.email, role: row.role },
  });

  return { stage: STAGE.AUTHENTICATED, user: toUser(row), companyId: null };
}

export async function signOut(req) {
  if (req.session?.userId) {
    await logService.record(req, {
      action: LOG_ACTIONS.LOGOUT,
      entity: 'user',
      entityId: req.session.userId,
    });
  }
  await new Promise((resolve) => req.session.destroy(resolve));
}
