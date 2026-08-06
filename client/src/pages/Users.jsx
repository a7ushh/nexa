import { useCallback, useEffect, useState } from 'react';
import AppShell from '../layouts/AppShell.jsx';
import { users as usersApi } from '../api/resources.js';
import { formatDate } from '../utils/format.js';

const NO_FILTERS = {
  applied: {},
  setApplied: () => {},
  clear: () => {},
  remove: () => {},
  active: false,
};

/**
 * Figma "admin -users": the user table with an inline role dropdown, Remove,
 * and the Backup button in the top right.
 */
export default function Users() {
  const [rows, setRows] = useState([]);
  const [assignable, setAssignable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [backingUp, setBackingUp] = useState(false);
  const [needsDrive, setNeedsDrive] = useState(false);

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

  const backup = async () => {
    setBackingUp(true);
    setError('');
    setNotice('');
    try {
      const result = await usersApi.backup();
      setNotice(`Backed up to Google Drive as ${result.file}.`);
    } catch (failure) {
      // Drive is requested separately from sign-in, so the first backup sends
      // root through a one-off consent instead of failing.
      if (failure.details?.needsDrive) {
        setNeedsDrive(true);
        setError('');
      } else {
        setError(failure.message);
      }
    } finally {
      setBackingUp(false);
    }
  };

  const connectDrive = () => {
    window.location.href = '/api/auth/google/drive';
  };

  return (
    <AppShell
      title="Users"
      filters={NO_FILTERS}
      toolbar={
        <button type="button" onClick={backup} disabled={backingUp} className="btn-pill">
          {backingUp ? 'Backing up…' : 'Backup'}
        </button>
      }
    >
      <h1 className="mb-6 font-mono text-heading font-bold">Users -</h1>

      {error && <p className="mb-4 text-data text-danger">{error}</p>}
      {notice && <p className="mb-4 text-data text-accent">{notice}</p>}
      {loading && <p className="text-data text-soft">Loading…</p>}

      {needsDrive && (
        <div className="mb-6 rounded-[10px] border border-edge bg-surface p-[18px]">
          <p className="text-data">
            Backups upload to Google Drive, and that permission is asked for separately from
            sign-in so nobody else is prompted for it.
          </p>
          <button type="button" onClick={connectDrive} className="btn-accent mt-[14px]">
            Connect Google Drive
          </button>
        </div>
      )}

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
