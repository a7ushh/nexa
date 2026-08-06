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
 * Root-only: re-runs consent asking additionally for Drive, so the Backup
 * button has a refresh token. Everyone else never sees a Drive prompt.
 */
export const googleConnectDrive = asyncHandler(async (req, res) => {
  if (!env.google.configured) {
    return res.redirect(`${clientOrigin()}/users?error=google_not_configured`);
  }
  res.redirect(authService.beginGoogleSignIn(req, { includeDrive: true }));
});

export const googleCallback = asyncHandler(async (req, res) => {
  const { code, state, error } = req.query;

  if (error || !code) {
    return res.redirect(`${clientOrigin()}/login?error=${encodeURIComponent(error || 'no_code')}`);
  }

  let result;
  try {
    result = await authService.completeGoogleSignIn(req, { code, state });
  } catch (failure) {
    return res.redirect(
      `${clientOrigin()}/login?error=${encodeURIComponent(failure.message || 'sign_in_failed')}`,
    );
  }

  // A Drive re-authorisation returns to the page that started it.
  if (result?.driveConnected) {
    return res.redirect(`${clientOrigin()}/users?drive=connected`);
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
