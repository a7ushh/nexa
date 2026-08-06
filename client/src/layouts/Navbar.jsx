import { NavLink, useLocation } from 'react-router-dom';
import Wordmark from '../components/Wordmark.jsx';
import { navFor } from '../config/navigation.js';
import { useAuth } from '../hooks/useAuth.jsx';

/**
 * The navbar from the new design: one row of Raleway SemiBold 26px items after
 * `GARG /`, the active item underlined, and a section's Issue / Receive
 * sub-options on a second line directly beneath their parent - still inside the
 * same 118px bar, as steps.md requires.
 */
export default function Navbar({ onAvatarClick }) {
  const { user } = useAuth();
  const location = useLocation();
  const items = navFor(user?.role);

  const isActive = (item) =>
    location.pathname.startsWith(`/${item.page}`) ||
    location.pathname === item.path ||
    (item.page === 'master' && location.pathname.startsWith('/masters')) ||
    (item.page === 'log' && location.pathname.startsWith('/logs'));

  // Height is a minimum, not a fixed value: Embroidery and Handwork add an
  // Issue / Receive row inside the bar, so the bar has to grow to hold it
  // rather than crowding it against the rule.
  return (
    <header className="relative z-30 flex min-h-[var(--navbar-height)] shrink-0 items-start border-b-2 border-edge bg-offwhite px-[96px] pb-[16px]">
      <div className="flex items-start gap-[18px] pt-[24px]">
        <Wordmark />
        <span className="font-brand text-nav font-semibold leading-[24px]">/</span>

        <nav className="flex items-start gap-[40px]">
          {items.map((item) => {
            const active = isActive(item);

            return (
              <div key={item.page} className="flex flex-col items-center">
                {/* A section with sub-options keeps its parent plain - the pill
                    marks the active Issue / Receive beneath it instead. */}
                <NavLink
                  to={item.path}
                  className={`rounded-[6px] px-[10px] py-[3px] font-brand text-nav font-semibold leading-[24px]
                              transition-colors ${
                                active && !item.children
                                  ? 'bg-ink text-on-dark'
                                  : 'hover:bg-ink/5'
                              }`}
                >
                  {item.label}
                </NavLink>

                {/* Sub-options live inside the navbar, under their parent. */}
                {item.children && active && (
                  <span className="mt-[8px] flex items-center gap-[8px]">
                    {item.children.map((child, index) => (
                      <span key={child.path} className="flex items-center gap-[8px]">
                        {index > 0 && (
                          <span className="font-brand text-nav font-semibold leading-[24px]">/</span>
                        )}
                        <NavLink
                          to={child.path}
                          className={({ isActive: on }) =>
                            `rounded-[6px] px-[10px] py-[2px] font-brand text-nav font-semibold leading-[24px]
                             transition-colors ${on ? 'bg-ink text-on-dark' : 'hover:bg-ink/5'}`
                          }
                        >
                          {child.label}
                        </NavLink>
                      </span>
                    ))}
                  </span>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <button
        type="button"
        onClick={onAvatarClick}
        aria-label="Account"
        className="ml-auto mt-[20px] h-[42px] w-[42px] shrink-0 overflow-hidden rounded-full
                   border border-outline bg-[#d9d9d9] transition-opacity hover:opacity-90"
      >
        {user?.picture && <img src={user.picture} alt="" className="h-full w-full object-cover" />}
      </button>
    </header>
  );
}
