import * as authService from '../services/authService.js';
import { profileSchema, pinSchema } from '../validation/authSchemas.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/httpError.js';

/**
 * Where the browser lands after the Google round-trip. Client and API share one
 * origin, so this is always the app URL.
 */
function clientOrigin() {
  return env.appUrl;
}

export const config = (req, res) => {
  res.json({ googleConfigured: env.google.configured });
};

export const me = asyncHandler(async (req, res) => {
  res.json(await authService.currentState(req));
});

export const googleStart = asyncHandler(async (req, res) => {
  if (!env.google.configured) {
    return res.redirect(`${clientOrigin()}/login?error=google_not_configured`);
  }
  res.redirect(authService.beginGoogleSignIn(req));
});

/**
 * Root-only, and the first half of every backup: asks Google for Drive
 * permission afresh, with the consent screen forced and root's own account
 * preselected. The callback parks that one-off token for the backup to use
 * once.
 */
export const googleConnectDrive = asyncHandler(async (req, res) => {
  if (!env.google.configured) {
    return res.redirect(`${clientOrigin()}/users?driveError=google_not_configured`);
  }
  res.redirect(
    authService.beginGoogleSignIn(req, { includeDrive: true, loginHint: req.user.email }),
  );
});

export const googleCallback = asyncHandler(async (req, res) => {
  const { code, state, error } = req.query;

  // Read before completeGoogleSignIn clears it: a declined or refused backup
  // grant belongs back on the Users page, not on the login screen.
  const forDrive = req.session.oauthWantsDrive === true;
  const fail = (reason) =>
    res.redirect(
      `${clientOrigin()}/${forDrive ? 'users?driveError' : 'login?error'}=${encodeURIComponent(reason)}`,
    );

  if (error || !code) {
    delete req.session.oauthState;
    delete req.session.oauthWantsDrive;
    return fail(error || 'no_code');
  }

  let result;
  try {
    result = await authService.completeGoogleSignIn(req, { code, state });
  } catch (failure) {
    return fail(failure.message || 'sign_in_failed');
  }

  // A backup grant returns to the Users page, which then runs the backup.
  if (result?.driveGranted) {
    return res.redirect(`${clientOrigin()}/users?drive=granted`);
  }

  // The client reads /api/auth/me on load and routes to the right screen.
  res.redirect(clientOrigin());
});

export const setProfile = asyncHandler(async (req, res) => {
  const { username, pin } = profileSchema.parse(req.body);
  res.json(await authService.setProfile(req, { username, pin }));
});

export const verifyPin = asyncHandler(async (req, res) => {
  const { pin } = pinSchema.parse(req.body);
  res.json(await authService.verifyPin(req, { pin }));
});

export const logout = asyncHandler(async (req, res) => {
  await authService.signOut(req);
  res.clearCookie('grag.sid');
  res.json({ stage: authService.STAGE.SIGNED_OUT, user: null });
});
