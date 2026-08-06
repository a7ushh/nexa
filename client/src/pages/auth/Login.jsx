import { useSearchParams } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout.jsx';
import GoogleButton from '../../components/auth/GoogleButton.jsx';
import { startGoogleSignIn } from '../../api/auth.js';
import { useAuth } from '../../hooks/useAuth.jsx';

/** Figma "loading" page, `login` frame. */
export default function Login() {
  const [params] = useSearchParams();
  const { googleConfigured } = useAuth();
  const error = params.get('error');

  return (
    <AuthLayout page="Login">
      <div className="text-center">
        <h1 className="font-mono text-heading font-bold">Sign In</h1>
        <p className="mt-[6px] font-mono text-title">Production ERP</p>

        <p className="mt-[42px] font-mono text-data">Sign in with Google account to continue</p>

        <div className="mt-[36px] flex justify-center">
          <GoogleButton onClick={startGoogleSignIn} disabled={!googleConfigured} />
        </div>

        <p className="mt-[36px] font-mono text-data">Access is restricted to authorized users</p>

        {!googleConfigured && (
          <p className="mt-8 font-mono text-note text-danger">
            Google sign-in is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to
            server/.env and restart the server.
          </p>
        )}

        {error && googleConfigured && (
          <p className="mt-8 font-mono text-note text-danger">{decodeURIComponent(error)}</p>
        )}
      </div>
    </AuthLayout>
  );
}
