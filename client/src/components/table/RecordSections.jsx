import { useState } from 'react';
import SectionDivider from '../SectionDivider.jsx';
import DataTable from './DataTable.jsx';
import MobileRecordCard from './MobileRecordCard.jsx';
import { useIsMobile } from '../../hooks/useIsMobile.js';

/**
 * Renders the labelled sections each module page is built from: a divider, then
 * either the table (desktop) or the Android record cards (mobile).
 *
 * `sections` is `[{ key, label, rows, render? }]`.
 */
export default function RecordSections({ sections, columns, cardTitle, actions, roles }) {
  const [collapsed, setCollapsed] = useState({});
  const isMobile = useIsMobile();

  return (
    <div className="space-y-2">
      {sections.map((section) => {
        const isCollapsed = collapsed[section.key];

        return (
          <section key={section.key}>
            <SectionDivider
              label={section.label}
              count={section.rows.length}
              collapsed={isCollapsed}
              onToggle={() =>
                setCollapsed((current) => ({ ...current, [section.key]: !current[section.key] }))
              }
            />

            {!isCollapsed &&
              (section.render ? (
                section.render(section.rows)
              ) : isMobile ? (
                section.rows.length === 0 ? (
                  <p className="px-1 py-6 text-data text-soft">Nothing here yet.</p>
                ) : (
                  section.rows.map((row) => (
                    <MobileRecordCard
                      key={row.id}
                      row={row}
                      columns={columns}
                      title={cardTitle(row)}
                      selected={actions.selected.includes(row.id)}
                      onToggle={() => actions.onToggle(row.id)}
                      onEdit={() => actions.onEdit(row)}
                      onDelete={() => actions.onDelete(row)}
                      onShare={actions.onShare ? (intent) => actions.onShare(row, intent) : undefined}
                      onOpen={actions.onRowClick ? () => actions.onRowClick(row) : undefined}
                      canDelete={roles.canDelete}
                      canShare={roles.canShare}
                    />
                  ))
                )
              ) : (
                <DataTable
                  columns={columns}
                  rows={section.rows}
                  selected={actions.selected}
                  onToggle={actions.onToggle}
                  onToggleAll={actions.onToggleAll}
                  onEdit={actions.onEdit}
                  onDelete={actions.onDelete}
                  onShare={actions.onShare}
                  onHistory={actions.onHistory}
                  onRowClick={actions.onRowClick}
                  canDelete={roles.canDelete}
                  canShare={roles.canShare}
                />
              ))}
          </section>
        );
      })}
    </div>
  );
}
