import { OAuth2Client } from 'google-auth-library';
import { env } from './env.js';
import { redirectUriProblem as checkRedirectUri } from '../utils/urls.js';

/**
 * Scopes.
 *
 * Sign-in asks for identity only. Drive is requested on its own, by root alone,
 * every time a backup is taken - so ordinary sign-in never mentions Drive, and
 * no Drive token outlives the backup it was issued for.
 *
 * `drive.file` is a non-sensitive scope: it reaches only files this app creates,
 * so it needs no Google verification.
 */
export const SIGN_IN_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

/**
 * The rule itself lives in utils/urls.js so setup/setup.js can apply it without
 * importing config/env.js - env.js loads dotenv and throws on a malformed
 * APP_URL, which would brick the very script you run to fix one.
 *
 * Kept here as a wrapper because index.js checks the configured URI at boot and
 * relies on the default argument.
 */
export function redirectUriProblem(uri = env.google.redirectUri) {
  return checkRedirectUri(uri);
}

export function createOAuthClient() {
  if (!env.google.configured) {
    throw new Error(
      'Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in server/.env.',
    );
  }
  return new OAuth2Client({
    clientId: env.google.clientId,
    clientSecret: env.google.clientSecret,
    redirectUri: env.google.redirectUri,
  });
}

/**
 * Consent-screen URL. `state` guards against forged callbacks.
 *
 * Always `access_type: 'online'`: nothing keeps a refresh token any more. Sign-in
 * only needs to learn who the user is, and a backup uses its access token once
 * and then discards it (services/backupService.js).
 *
 * `include_granted_scopes` is off so a sign-in token never silently carries a
 * Drive grant from an earlier backup.
 *
 * `includeDrive` forces the consent screen, so each backup is an explicit,
 * visible grant. `loginHint` preselects root's own account on that screen.
 */
export function buildAuthUrl(state, { includeDrive = false, loginHint } = {}) {
  const scope = includeDrive ? [...SIGN_IN_SCOPES, DRIVE_SCOPE] : SIGN_IN_SCOPES;

  return createOAuthClient().generateAuthUrl({
    access_type: 'online',
    prompt: includeDrive ? 'consent' : 'select_account',
    scope,
    include_granted_scopes: false,
    state,
    ...(loginHint ? { login_hint: loginHint } : {}),
  });
}

/** Exchanges the callback code for tokens and the verified id-token payload. */
export async function exchangeCode(code) {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.google.clientId,
  });
  const payload = ticket.getPayload();

  return {
    profile: {
      googleSub: payload.sub,
      email: (payload.email || '').toLowerCase(),
      name: payload.name || '',
      picture: payload.picture || null,
      emailVerified: payload.email_verified === true,
    },
    accessToken: tokens.access_token || null,
    expiresAt: tokens.expiry_date || null,
    grantedScopes: tokens.scope ? tokens.scope.split(' ') : [],
  };
}
