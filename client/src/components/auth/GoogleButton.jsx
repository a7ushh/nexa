import googleLogo from '../../assets/google-logo.svg';

/**
 * "Sign in with Google" - the navy pill from the new login frame, with the
 * Google mark exported from Figma.
 */
export default function GoogleButton({ onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-[42px] items-center justify-center gap-3 rounded-pill bg-navy
                 px-6 text-data text-on-dark transition-opacity hover:opacity-90
                 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-surface">
        <img src={googleLogo} alt="" aria-hidden="true" className="h-[14px] w-[14px]" />
      </span>
      Sign in with Google
    </button>
  );
}
