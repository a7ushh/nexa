import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { STAGE } from './api/auth.js';
import { PAGE_ACCESS, landingPath } from './config/navigation.js';

import Login from './pages/auth/Login.jsx';
import ProfileSetup from './pages/auth/ProfileSetup.jsx';
import PinEntry from './pages/auth/PinEntry.jsx';
import AccessDenied from './pages/auth/AccessDenied.jsx';
import CompanySelect from './pages/CompanySelect.jsx';
import Grey from './pages/Grey.jsx';
import IssuePage from './pages/IssuePage.jsx';
import ReceivePage from './pages/ReceivePage.jsx';
import Report from './pages/Report.jsx';
import Masters from './pages/Masters.jsx';
import Users from './pages/Users.jsx';
import Logs from './pages/Logs.jsx';
import Wordmark from './components/Wordmark.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

/**
 * The sign-in stage decides which screen renders; only once a user is
 * authenticated and has chosen a company do the module routes exist at all.
 */
function Gate() {
  const { stage, loading, companyId } = useAuth();
  const location = useLocation();

  if (loading) return <Splash />;

  switch (stage) {
    case STAGE.NEEDS_PROFILE:
      return <ProfileSetup />;
    case STAGE.NEEDS_PIN:
      return <PinEntry />;
    case STAGE.PENDING_APPROVAL:
      return <AccessDenied />;
    case STAGE.AUTHENTICATED:
      break;
    default:
      return <Login />;
  }

  // Signed in but no company chosen yet.
  if (!companyId && location.pathname !== '/companies') {
    return <Navigate to="/companies" replace />;
  }

  return (
    <Routes>
      <Route path="/companies" element={<CompanySelect />} />

      <Route path="/grey" element={<Guard page="grey"><Grey /></Guard>} />

      <Route
        path="/embroidery/issue"
        element={<Guard page="embroidery"><IssuePage key="embroidery-issue" kind="embroidery" /></Guard>}
      />
      <Route
        path="/embroidery/receive"
        element={<Guard page="embroidery"><ReceivePage key="embroidery-receive" kind="embroidery" /></Guard>}
      />
      <Route path="/embroidery" element={<Navigate to="/embroidery/issue" replace />} />

      <Route
        path="/handwork/issue"
        element={<Guard page="handwork"><IssuePage key="handwork-issue" kind="handwork" /></Guard>}
      />
      <Route
        path="/handwork/receive"
        element={<Guard page="handwork"><ReceivePage key="handwork-receive" kind="handwork" /></Guard>}
      />
      <Route path="/handwork" element={<Navigate to="/handwork/issue" replace />} />

      <Route path="/report" element={<Guard page="report"><Report /></Guard>} />
      <Route path="/masters" element={<Guard page="master"><Masters /></Guard>} />
      <Route path="/users" element={<Guard page="users"><Users /></Guard>} />
      <Route path="/logs" element={<Guard page="log"><Logs /></Guard>} />

      <Route path="*" element={<Landing />} />
    </Routes>
  );
}

/**
 * Client-side page gate. The server enforces the same rule on every request;
 * this only keeps a role from navigating somewhere it would be refused.
 */
function Guard({ page, children }) {
  const { user } = useAuth();
  const allowed = PAGE_ACCESS[user?.role] ?? [];
  if (!allowed.includes(page)) return <Navigate to={landingPath(user?.role)} replace />;
  return children;
}

function Landing() {
  const { user } = useAuth();
  return <Navigate to={landingPath(user?.role)} replace />;
}

function Splash() {
  return (
    <div className="flex min-h-full items-center justify-center bg-offwhite">
      <Wordmark />
    </div>
  );
}
