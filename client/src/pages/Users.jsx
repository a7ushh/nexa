import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppShell from '../layouts/AppShell.jsx';
import { users as usersApi } from '../api/resources.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { formatDate } from '../utils/format.js';

const NO_FILTERS = {
  applied: {},
  setApplied: () => {},
  clear: () => {},
  remove: () => {},
  active: false,
};

/** What the Google round-trip reports when it did not end in a Drive grant. */
function driveErrorMessage(code) {
  if (code === 'access_denied') {
    return 'Google Drive permission was declined, so nothing was backed up.';
  }
  if (code === 'google_not_configured') {
    return 'Google is not configured on this server, so backups cannot be uploaded.';
  }
  return code;
}

/**
 * Figma "admin -users": the user table with an inline role dropdown, Remove,
 * and the Backup button in the top right.
 */
export default function Users() {
  const { user: me } = useAuth();
  // Owners can open this page too, but a backup is root's alone - the server
  // refuses anyone else, so the button is not offered to them.
  const isRoot = me?.role === 'root';

  const location = useLocation();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [assignable, setAssignable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [backingUp, setBackingUp] = useState(false);
  // Offered after a backup fails for want of Drive permission, so trying again
  // is one click rather than a hunt for the toolbar button.
  const [canRetry, setCanRetry] = useState(false);
  const backupStarted = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await usersApi.list();
      setRows(payload.users);
      setAssignable(payload.assignableRoles);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeRole = async (user, role) => {
    setError('');
    setNotice('');
    try {
      await usersApi.setRole(user.id, role);
      setNotice(`${user.name || user.email} is now ${role}.`);
      await load();
    } catch (failure) {
      setError(failure.message);
    }
  };

  const remove = async (user) => {
    if (!window.confirm(`Remove ${user.name || user.email}?`)) return;
    setError('');
    try {
      await usersApi.remove(user.id);
      await load();
    } catch (failure) {
      setError(failure.message);
    }
  };

  /**
   * A backup spans a page load. The button leaves for Google's consent screen -
   * Drive permission is asked for every time. Google sends the browser back here
   * with ?drive=granted, and only then is the backup run, on a token the server
   * uses once and throws away.
   */
  const startBackup = () => {
    setError('');
    setNotice('');
    setCanRetry(false);
    setBackingUp(true);
    window.location.href = '/api/auth/google/drive';
  };

  const runBackup = useCallback(async () => {
    setBackingUp(true);
    setError('');
    setNotice('');
    setCanRetry(false);
    try {
      const result = await usersApi.backup();
      setNotice(`Backed up to Google Drive as ${result.file}.`);
    } catch (failure) {
      setError(failure.message);
      setCanRetry(Boolean(failure.details?.needsDrive));
    } finally {
      setBackingUp(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const granted = params.get('drive') === 'granted';
    const driveError = params.get('driveError');
    if (!granted && !driveError) return;

    // Drop the flag straight away so a refresh cannot replay it.
    navigate(location.pathname, { replace: true });

    if (driveError) {
      setError(driveErrorMessage(driveError));
      setCanRetry(true);
      return;
    }

    // StrictMode runs effects twice in development and the token is single-use:
    // a second request would only report it as already spent.
    if (backupStarted.current) return;
    backupStarted.current = true;
    runBackup();
    // Acts only on the URL the page was opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell
      title="Users"
      filters={NO_FILTERS}
      toolbar={
        isRoot ? (
          <button type="button" onClick={startBackup} disabled={backingUp} className="btn-pill">
            {backingUp ? 'Backing up…' : 'Backup'}
          </button>
        ) : null
      }
    >
      <h1 className="mb-6 font-mono text-heading font-bold">Users -</h1>

      {error && (
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <p className="text-data text-danger">{error}</p>
          {isRoot && canRetry && (
            <button
              type="button"
              onClick={startBackup}
              disabled={backingUp}
              className="btn-ghost h-[30px] px-4"
            >
              Try again
            </button>
          )}
        </div>
      )}
      {notice && <p className="mb-4 text-data text-accent">{notice}</p>}
      {loading && <p className="text-data text-soft">Loading…</p>}

      <div className="overflow-x-auto rounded-[10px] border border-edge bg-surface">
        <table className="w-full min-w-[860px] border-collapse text-data">
          <thead>
            <tr className="bg-table-head text-left">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Username</th>
              <th className="px-4 py-3 font-medium">Last access</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((user) => (
              <tr key={user.id} className="border-t border-edge/70">
                <td className="px-4 py-4">{user.name || '—'}</td>
                <td className="px-4 py-4">{user.email}</td>
                <td className="px-4 py-4">{user.username || '—'}</td>
                <td className="px-4 py-4">
                  {user.lastAccessAt
                    ? `${formatDate(user.lastAccessAt)} ${new Date(user.lastAccessAt)
                        .toTimeString()
                        .slice(0, 5)}`
                    : 'never'}
                </td>
                <td className="px-4 py-4">
                  {user.role === 'root' || assignable.length === 0 ? (
                    <span className="inline-flex h-[35px] items-center rounded-pill bg-table-head px-3 capitalize">
                      {user.role}
                    </span>
                  ) : (
                    <select
                      aria-label={`Role for ${user.email}`}
                      value={assignable.includes(user.role) ? user.role : ''}
                      onChange={(event) => changeRole(user, event.target.value)}
                      className="h-[35px] rounded-pill bg-table-head px-3 capitalize outline-none"
                    >
                      {!assignable.includes(user.role) && (
                        <option value="">{user.role}</option>
                      )}
                      {assignable.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  )}
                  {user.status === 'pending' && (
                    <span className="ml-2 text-note text-danger">awaiting access</span>
                  )}
                </td>
                <td className="px-4 py-4 text-right">
                  {user.role !== 'root' && (
                    <button type="button" onClick={() => remove(user)} className="btn-danger-outline h-[30px] px-4">
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
