import Wordmark from '../Wordmark.jsx';

/**
 * Shared chrome for the sign-in screens: `NEXA / <page>` top left, then either
 * a centred white card (login, access denied) or the large white sheet with its
 * big top-left radius that the profile and company frames use.
 */
export default function AuthLayout({ page, variant = 'card', footer, children }) {
  return (
    <div className="relative flex min-h-full flex-col overflow-hidden bg-offwhite">
      <div className="relative z-10 flex items-center gap-[14px] px-[60px] pt-[26px]">
        <Wordmark />
        <span className="font-brand text-nav font-semibold">/</span>
        <span className="font-brand text-nav font-semibold underline underline-offset-[6px]">
          {page}
        </span>
      </div>

      {variant === 'sheet' ? (
        <>
          {/* The sweeping white sheet: pinned to the right and bottom edges
              with a single very large top-left corner. */}
          <div className="absolute inset-y-[170px] left-[190px] right-0 rounded-tl-[340px] bg-surface" />
          <div className="relative z-10 flex flex-1 flex-col items-center px-6 pt-[100px]">
            {children}
          </div>
        </>
      ) : (
        <div className="relative z-10 flex flex-1 items-center justify-center px-6">
          <div className="w-full max-w-[515px] rounded-[24px] bg-surface px-[60px] py-[70px]">
            {children}
          </div>
        </div>
      )}

      <div className="relative z-10 pb-[22px] pt-[30px] text-center">{footer}</div>
    </div>
  );
}
