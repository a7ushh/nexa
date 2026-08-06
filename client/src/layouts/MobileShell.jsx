import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import FilterDrawer from '../components/filter/FilterDrawer.jsx';
import FilterChips from '../components/filter/FilterChips.jsx';
import { navFor } from '../config/navigation.js';
import { useAuth } from '../hooks/useAuth.jsx';

/**
 * The Android layout - Figma "android UI" frames.
 *
 * steps.md: "three lines are menu(navbar) and filter shifted down side." So the
 * navbar collapses to a hamburger with the page title, and the FILTER rail
 * becomes a navy bar pinned to the bottom that expands into the filter sheet.
 */
export default function MobileShell({
  title,
  toolbar,
  filterFields,
  filters,
  children,
  modalOpen,
  suggestScope,
  suggestKind,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const { user, company, signOut, leaveCompany } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-offwhite">
      <header
        className={`flex h-[101px] shrink-0 items-center gap-4 px-[23px] ${
          modalOpen ? 'bg-table-head' : 'bg-surface'
        }`}
      >
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="flex h-[24px] w-[33px] shrink-0 flex-col justify-between py-[2px]"
        >
          <span className="h-[2px] w-full bg-ink" />
          <span className="h-[2px] w-full bg-ink" />
          <span className="h-[2px] w-full bg-ink" />
        </button>

        <h1 className="min-w-0 flex-1 truncate text-title">{title}</h1>

        <span className="h-[50px] w-[50px] shrink-0 overflow-hidden rounded-full bg-[#333333]">
          {user?.picture && <img src={user.picture} alt="" className="h-full w-full object-cover" />}
        </span>
      </header>

      <div className="flex shrink-0 flex-wrap items-center justify-center gap-[16px] px-4 py-[19px]">
        {toolbar}
      </div>

      {filterFields.length > 0 && (
        <div className="shrink-0 px-4 pb-2">
          <FilterChips fields={filterFields} value={filters.applied} onRemove={filters.remove} />
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-4 pb-[90px]">{children}</main>

      {/* The navy FILTER bar across the foot. */}
      {filterFields.length > 0 && (
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          className="absolute inset-x-0 bottom-0 z-20 flex h-[74px] items-center justify-between
                     bg-navy px-[36px] text-on-dark"
        >
          <span className="text-title tracking-[0.3em]">FILTER</span>
          <span aria-hidden="true" className="text-title">
            ∧
          </span>
        </button>
      )}

      {/* `flex` so the panel stretches to the full height of the screen rather
          than sitting at its content height with the page showing beneath. */}
      {filterOpen && (
        <div className="absolute inset-0 z-30 flex">
          <FilterDrawer
            open
            fields={filterFields}
            value={filters.applied}
            onApply={(next) => {
              filters.setApplied(next);
              setFilterOpen(false);
            }}
            onClear={() => {
              filters.clear();
              setFilterOpen(false);
            }}
            onClose={() => setFilterOpen(false)}
            suggestScope={suggestScope}
            suggestKind={suggestKind}
          />
        </div>
      )}

      {menuOpen && (
        <div className="absolute inset-0 z-40 flex">
          <nav className="flex w-[280px] max-w-[80%] flex-col bg-navy px-6 py-8 text-on-dark">
            <p className="text-title tracking-[0.25em]">GRAG</p>
            <p className="mt-1 text-note text-on-dark/70">{company?.name}</p>

            <div className="mt-8 flex flex-col gap-1">
              {navFor(user?.role).flatMap((item) =>
                item.children
                  ? item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        onClick={() => setMenuOpen(false)}
                        className={mobileLinkClass}
                      >
                        {item.label} / {child.label}
                      </NavLink>
                    ))
                  : [
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMenuOpen(false)}
                        className={mobileLinkClass}
                      >
                        {item.label}
                      </NavLink>,
                    ],
              )}
            </div>

            <div className="mt-auto flex flex-col gap-2 pt-8">
              <button
                type="button"
                onClick={() => {
                  leaveCompany();
                  setMenuOpen(false);
                  navigate('/companies');
                }}
                className="rounded-[8px] border border-on-dark/40 px-3 py-2 text-data"
              >
                Switch company
              </button>
              <button
                type="button"
                onClick={signOut}
                className="rounded-[8px] bg-surface px-3 py-2 text-data text-danger"
              >
                Sign out
              </button>
            </div>
          </nav>

          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="flex-1 cursor-default bg-ink/50"
          />
        </div>
      )}
    </div>
  );
}

const mobileLinkClass = ({ isActive }) =>
  `rounded-[8px] px-3 py-2 text-data transition-colors ${
    isActive ? 'bg-surface text-ink_text' : 'text-on-dark hover:bg-on-dark/10'
  }`;
