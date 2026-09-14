/**
 * Database backup to Google Drive.
 *
 * steps.md: "There is a button is called backup is user page- it backup the
 * database into google drive using google API."
 *
 * Drive permission is asked for on every backup, and the token it produces is
 * used once and discarded. Pressing Backup sends root through Google's consent
 * screen; the callback parks a short-lived access token on the session
 * (authService.grantDriveForBackup); this takes it off the session before doing
 * anything else, then runs pg_dump and uploads the file. The token is never
 * written anywhere else, and Google expires it within the hour.
 *
 * It is deliberately NOT revoked at Google afterwards. Revoking withdraws the
 * app's Drive authorisation itself, so on the next backup Google's consent
 * screen shows Drive as a new, unticked checkbox - and Continue without ticking
 * it returns a token with no Drive access. That is what made every backup after
 * the first one fail.
 *
 * No Drive credential is written to the database, so there is nothing left to
 * go stale or leak from a log.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { google } from 'googleapis';

import { env } from '../config/env.js';
import * as logService from './logService.js';
import { LOG_ACTIONS } from '../config/constants.js';
import { badRequest } from '../utils/httpError.js';

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

/** Runs pg_dump into `target`. Rejects with stderr if it is not on PATH. */
function dumpTo(target) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'pg_dump',
      [
        '--host', env.db.host,
        '--port', String(env.db.port),
        '--username', env.db.user,
        '--format', 'custom',
        '--file', target,
        env.db.database,
      ],
      { env: { ...process.env, PGPASSWORD: env.db.password } },
    );

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) =>
      reject(
        new Error(
          error.code === 'ENOENT'
            ? 'pg_dump was not found on PATH. Install the PostgreSQL client tools to use Backup.'
            : error.message,
        ),
      ),
    );

    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(stderr.trim() || `pg_dump exited with ${code}`)),
    );
  });
}

/**
 * Removes the grant from the session and saves that immediately, before any
 * slow work starts - so a second click arriving while this dump is still
 * running finds nothing to reuse.
 */
async function takeDriveGrant(req) {
  const grant = req.session.driveGrant ?? null;
  delete req.session.driveGrant;
  await new Promise((resolve, reject) =>
    req.session.save((error) => (error ? reject(error) : resolve())),
  );
  return grant;
}

export async function run(req) {
  if (!env.google.configured) {
    throw badRequest('Google is not configured, so backups cannot be uploaded.');
  }

  const grant = await takeDriveGrant(req);

  const usable =
    grant && grant.userId === Number(req.user.id) && Date.now() <= Number(grant.expiresAt);

  if (!usable) {
    const error = badRequest(
      'Google Drive permission is asked for on every backup. Press Backup to grant it.',
    );
    error.details = { needsDrive: true };
    throw error;
  }

  const name = `grag-backup-${timestamp()}.dump`;
  const target = path.join(os.tmpdir(), name);

  try {
    await dumpTo(target);

    // Deliberately googleapis' own OAuth2 client rather than createOAuthClient().
    //
    // googleapis 173 ships googleapis-common 8 and gaxios 7, which hand the auth
    // client a WHATWG `Headers` object. Our direct google-auth-library@9
    // dependency attaches the token with `headers.Authorization = ...` - a plain
    // property that `Headers` silently discards - so the upload left here with no
    // Authorization header at all and Google answered `401 Login Required`.
    // `google.auth.OAuth2` is the very copy googleapis-common uses to make the
    // request, so the two cannot drift, and it sets the header properly.
    const auth = new google.auth.OAuth2({
      clientId: env.google.clientId,
      clientSecret: env.google.clientSecret,
    });
    // An access token only - there is no refresh token to fall back on, which
    // is the point.
    auth.setCredentials({ access_token: grant.accessToken });

    const drive = google.drive({ version: 'v3', auth });
    const { data } = await drive.files.create({
      requestBody: {
        name,
        ...(env.google.driveFolderId ? { parents: [env.google.driveFolderId] } : {}),
      },
      media: { mimeType: 'application/octet-stream', body: fs.createReadStream(target) },
      fields: 'id, name, webViewLink, size',
    });

    await logService.record(req, {
      action: LOG_ACTIONS.BACKUP,
      entity: 'database',
      details: { file: data.name, driveFileId: data.id },
    });

    return { file: data.name, driveFileId: data.id, link: data.webViewLink ?? null };
  } finally {
    await fsp.rm(target, { force: true });
  }
}
