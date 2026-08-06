import { useState } from 'react';
import AuthLayout from '../../components/auth/AuthLayout.jsx';
import PinInput from '../../components/auth/PinInput.jsx';
import { submitPin } from '../../api/auth.js';
import { useAuth } from '../../hooks/useAuth.jsx';

const PIN_LENGTH = 4;

/**
 * PIN on every sign-in - Figma "loading" page, `next time sign in` frame.
 * steps.md: "a PIN which is required every time they login/ sign in".
 */
export default function PinEntry() {
  const { apply, signOut, email } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setChecking(true);
    try {
      apply(await submitPin(pin));
    } catch (failure) {
      setError(failure.message);
      setPin('');
    } finally {
      setChecking(false);
    }
  };

  return (
    <AuthLayout page="Login" variant="sheet">
      <h1 className="font-mono text-heading font-bold">Welcome Back</h1>
      {email && <p className="mt-[8px] font-mono text-data text-body">{email}</p>}

      <form onSubmit={submit} className="mt-[80px] flex flex-col items-center">
        <span className="mb-[10px] font-mono text-data">Enter PIN -</span>
        <PinInput
          value={pin}
          onChange={setPin}
          length={PIN_LENGTH}
          label="Enter PIN"
          autoFocus
        />

        {error && <p className="mt-6 font-mono text-data text-danger">{error}</p>}

        <button
          type="submit"
          disabled={pin.length !== PIN_LENGTH || checking}
          className="mt-[48px] h-[42px] rounded-[10px] bg-navy px-7 font-mono text-data
                     text-on-dark transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {checking ? 'checking…' : 'continue'}
        </button>

        <button type="button" onClick={signOut} className="mt-8 font-mono text-note underline">
          Use a different account
        </button>
      </form>
    </AuthLayout>
  );
}
