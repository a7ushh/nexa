import { useState } from 'react';
import AuthLayout from '../../components/auth/AuthLayout.jsx';
import { useAuth } from '../../hooks/useAuth.jsx';

/**
 * Figma "loading" page, `access denied` frame. Shown after the PIN is accepted
 * while the account still waits for an owner or root to grant access.
 */
export default function AccessDenied() {
  const { refresh, signOut } = useAuth();
  const [checking, setChecking] = useState(false);

  const reload = async () => {
    setChecking(true);
    await refresh();
    setChecking(false);
  };

  return (
    <AuthLayout page="Login">
      <div className="text-center">
        <h1 className="font-mono text-heading font-bold">Access Denied</h1>
        <p className="mt-[6px] font-mono text-title">Awaiting approval</p>

        <p className="mt-[42px] font-mono text-data">
          Your account is waiting for the owner to grant access
        </p>

        <div className="mt-[36px] flex justify-center">
          <button
            type="button"
            onClick={reload}
            disabled={checking}
            className="h-[42px] rounded-pill bg-navy px-7 font-mono text-data text-on-dark
                       transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {checking ? 'Checking…' : 'Reload'}
          </button>
        </div>

        <p className="mt-[36px] font-mono text-data">New account? Ask for access from the owner</p>

        <button
          type="button"
          onClick={signOut}
          className="mt-[26px] font-mono text-data text-danger underline"
        >
          Sign Out
        </button>
      </div>
    </AuthLayout>
  );
}
