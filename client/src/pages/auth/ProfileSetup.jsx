import { useState } from 'react';
import AuthLayout from '../../components/auth/AuthLayout.jsx';
import PinInput from '../../components/auth/PinInput.jsx';
import { submitProfile } from '../../api/auth.js';
import { useAuth } from '../../hooks/useAuth.jsx';

const USERNAME_MAX = 12;
const PIN_LENGTH = 4;

/** Figma "loading" page, `config username and pin` frame. */
export default function ProfileSetup() {
  const { apply } = useAuth();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const ready =
    username.trim().length > 0 && pin.length === PIN_LENGTH && confirmPin.length === PIN_LENGTH;

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (pin !== confirmPin) {
      setError('The two PINs do not match.');
      return;
    }

    setSaving(true);
    try {
      apply(await submitProfile({ username: username.trim(), pin, confirmPin }));
    } catch (failure) {
      setError(failure.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthLayout page="Login" variant="sheet">
      <h1 className="font-mono text-heading font-bold">Complete your Profile</h1>

      <form onSubmit={submit} className="mt-[70px] flex flex-col items-center">
        <div className="flex flex-col items-start">
          <label htmlFor="username" className="mb-[6px] font-mono text-data">
            Enter Username -
          </label>
          <input
            id="username"
            value={username}
            onChange={(event) => setUsername(event.target.value.slice(0, USERNAME_MAX))}
            maxLength={USERNAME_MAX}
            autoComplete="username"
            placeholder="username"
            className="h-[56px] w-[280px] rounded-[10px] border-2 border-ink bg-surface px-4
                       font-mono text-data outline-none placeholder:text-soft
                       focus:border-accent"
          />
          <span className="mt-[6px] font-mono text-note text-soft">
            *Max length of {USERNAME_MAX} characters
          </span>
        </div>

        <div className="mt-[54px] flex flex-col items-center">
          <span className="mb-[10px] font-mono text-data">Enter PIN -</span>
          <PinInput value={pin} onChange={setPin} length={PIN_LENGTH} label="Enter PIN" />
        </div>

        <div className="mt-[34px] flex flex-col items-center">
          <span className="mb-[10px] font-mono text-data">Confirm PIN -</span>
          <PinInput
            value={confirmPin}
            onChange={setConfirmPin}
            length={PIN_LENGTH}
            label="Confirm PIN"
          />
        </div>

        {error && <p className="mt-6 font-mono text-data text-danger">{error}</p>}

        <button
          type="submit"
          disabled={!ready || saving}
          className="mt-[48px] h-[42px] rounded-[10px] bg-navy px-7 font-mono text-data
                     text-on-dark transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'saving…' : 'continue'}
        </button>
      </form>
    </AuthLayout>
  );
}
