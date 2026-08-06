/**
 * Database backup to Google Drive.
 *
 * steps.md: "There is a button is called backup is user page- it backup the
 * database into google drive using google API."
 *
 * pg_dump writes a compressed dump to a temp file, the file is uploaded with
 * the signer's own Drive credentials, then the temp file is removed.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { google } from 'googleapis';

import { env } from '../config/env.js';
import { createOAuthClient } from '../config/google.js';
import * as userRepository from '../repositories/userRepository.js';
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

export async function run(req) {
  if (!env.google.configured) {
    throw badRequest('Google is not configured, so backups cannot be uploaded.');
  }

  const refreshToken = await userRepository.getRefreshToken(req.user.id);
  if (!refreshToken) {
    // Drive is not part of sign-in, so the first backup needs a one-off grant.
    const error = badRequest('Google Drive is not connected yet.');
    error.details = { needsDrive: true };
    throw error;
  }

  const name = `grag-backup-${timestamp()}.dump`;
  const target = path.join(os.tmpdir(), name);

  try {
    await dumpTo(target);

    const auth = createOAuthClient();
    auth.setCredentials({ refresh_token: refreshToken });

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
