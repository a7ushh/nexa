import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

/** The avatar menu: who is signed in, which company, and the way out. */
export default function AccountMenu({ onClose }) {
  const { user, company, signOut, leaveCompany } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default"
      />
      <div className="absolute right-[80px] top-[86px] z-50 w-[260px] rounded-[8px] bg-surface p-4 shadow-md ring-1 ring-ink/10">
        <p className="text-data font-semibold">{user?.name || user?.username}</p>
        <p className="text-note text-soft">{user?.email}</p>
        <p className="mt-2 text-note">
          Role: <span className="font-semibold capitalize">{user?.role}</span>
        </p>
        {company && (
          <p className="text-note">
            Company: <span className="font-semibold">{company.name}</span>
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              leaveCompany();
              onClose();
              navigate('/companies');
            }}
            className="btn-ghost w-full"
          >
            Switch company
          </button>
          <button type="button" onClick={signOut} className="btn-danger w-full">
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
