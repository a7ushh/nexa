import { useState } from 'react';
import Navbar from './Navbar.jsx';
import FilterRail from './FilterRail.jsx';
import MobileShell from './MobileShell.jsx';
import AccountMenu from './AccountMenu.jsx';
import FilterDrawer from '../components/filter/FilterDrawer.jsx';
import FilterChips from '../components/filter/FilterChips.jsx';
import { useIsMobile } from '../hooks/useIsMobile.js';

/**
 * Page chrome shared by every module.
 *
 * In the new design the filter panel is part of the layout rather than an
 * overlay: the 70px rail expands into a 415px column and the content beside it
 * narrows. Under 768px the Android shell takes over.
 */
export default function AppShell({
  filterFields = [],
  filters,
  toolbar,
  children,
  modalOpen = false,
  title,
  suggestScope,
  suggestKind,
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileShell
        title={title}
        toolbar={toolbar}
        filterFields={filterFields}
        filters={filters}
        modalOpen={modalOpen}
        suggestScope={suggestScope}
        suggestKind={suggestKind}
      >
        {children}
      </MobileShell>
    );
  }

  const hasFilters = filterFields.length > 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Navbar onAvatarClick={() => setMenuOpen((open) => !open)} />

      <div className="relative flex flex-1 overflow-hidden">
        {hasFilters &&
          (filtersOpen ? (
            <FilterDrawer
              open
              fields={filterFields}
              value={filters.applied}
              onApply={(next) => {
                filters.setApplied(next);
                setFiltersOpen(false);
              }}
              onClear={() => {
                filters.clear();
                setFiltersOpen(false);
              }}
              onClose={() => setFiltersOpen(false)}
              suggestScope={suggestScope}
              suggestKind={suggestKind}
            />
          ) : (
            <FilterRail onOpen={() => setFiltersOpen(true)} />
          ))}

        {!hasFilters && <div className="w-rail shrink-0 bg-navy" />}

        <main className="relative flex-1 overflow-y-auto bg-offwhite px-[22px] pb-12">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-[10px] pt-[30px]">
            <div className="min-w-0 flex-1">
              {hasFilters && (
                <FilterChips
                  fields={filterFields}
                  value={filters.applied}
                  onRemove={filters.remove}
                />
              )}
            </div>
            <div className="flex shrink-0 items-center gap-[18px]">{toolbar}</div>
          </div>

          {children}
        </main>
      </div>

      {menuOpen && <AccountMenu onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
