import { OAuth2Client } from 'google-auth-library';
import { env } from './env.js';

/**
 * Scopes.
 *
 * Sign-in asks for identity only. `drive.file` is a *sensitive* scope: asking
 * for it up front makes Google show every user the Drive consent panel and the
 * "Google hasn't verified this app" interstitial, even though only the root
 * user ever runs a backup.
 *
 * So Drive is requested separately, on demand, by root alone - Google calls
 * this incremental authorisation.
 */
export const SIGN_IN_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]', '::1'];

/**
 * Google refuses a redirect URI that is not either https:// or a loopback
 * address, and answers with `Error 400: invalid_request` ("doesn't comply with
 * Google's OAuth 2.0 policy for keeping apps secure") rather than naming the
 * problem. A LAN address such as http://192.168.1.20:5000 is the usual cause
 * when moving the app to another machine.
 *
 * Returns null when the URI is fine, otherwise an explanation.
 */
export function redirectUriProblem(uri = env.google.redirectUri) {
  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    return `"${uri}" is not a valid URL.`;
  }

  if (parsed.protocol === 'https:') return null;
  if (parsed.protocol === 'http:' && LOOPBACK_HOSTS.includes(parsed.hostname)) return null;

  return (
    `Google will reject "${uri}". Over http it only accepts localhost or 127.0.0.1; ` +
    'anything else has to be https. Set APP_URL to http://localhost:<port> on the ' +
    'machine running the app, or put it behind a real https domain.'
  );
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
 * Pass `includeDrive` only for the root user's explicit "connect Drive" step;
 * ordinary sign-in never asks for it.
 */
export function buildAuthUrl(state, { includeDrive = false } = {}) {
  const scope = includeDrive ? [...SIGN_IN_SCOPES, DRIVE_SCOPE] : SIGN_IN_SCOPES;

  return createOAuthClient().generateAuthUrl({
    access_type: 'offline',
    // Only force the consent screen when we need a refresh token for Drive;
    // a plain sign-in should be a single click for a returning user.
    prompt: includeDrive ? 'consent' : 'select_account',
    scope,
    include_granted_scopes: true,
    state,
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
    refreshToken: tokens.refresh_token || null,
    // Present only when the Drive scope was granted.
    grantedScopes: tokens.scope ? tokens.scope.split(' ') : [],
  };
}
