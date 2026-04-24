import type { ReactNode } from 'react';
import { ConnectionStatusBanner } from './ConnectionStatusBanner.js';
import { PanelErrorBoundary } from './PanelErrorBoundary.js';
import { KanbanPanel } from './KanbanPanel.js';
import { FocusedDetailPanel } from './FocusedDetailPanel.js';
import { TickerPanel } from './TickerPanel.js';
import { InBannerHost } from './InBannerHost.js';

// Desktop CSS grid layout per packages/dispatch-web/TICKETS.md
// component hierarchy. Inline styles for T06; T07 retrofits with
// Tailwind classes + responsive variants (mobile stacking moves
// to T07 acceptance per gate-3 amendment).
//
// Structure:
//   <div column flex>
//     <header>                       brand strip
//     <ConnectionStatusBanner />     conditional banner row
//     <main grid 60/40>              kanban | focused-detail
//     <TickerPanel />                bottom strip
//     <InBannerHost />               fixed overlay (top-right)
export function Layout(): ReactNode {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        fontFamily: 'system-ui',
      }}
    >
      <header
        style={{
          padding: '8px 16px',
          borderBottom: '1px solid #ddd',
          background: '#fafafa',
        }}
      >
        <strong>Foxworks Dispatch Conductor</strong>
      </header>

      <ConnectionStatusBanner />

      <main
        style={{
          display: 'grid',
          gridTemplateColumns: '60% 40%',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        <PanelErrorBoundary name="Sessions">
          <KanbanPanel />
        </PanelErrorBoundary>
        <PanelErrorBoundary name="Session detail">
          <FocusedDetailPanel />
        </PanelErrorBoundary>
      </main>

      <PanelErrorBoundary name="Activity">
        <TickerPanel />
      </PanelErrorBoundary>

      <PanelErrorBoundary name="Banners">
        <InBannerHost />
      </PanelErrorBoundary>
    </div>
  );
}
