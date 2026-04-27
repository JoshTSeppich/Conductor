import type { ReactNode } from 'react';
import { ConnectionStatusBanner } from './ConnectionStatusBanner.js';
import { PanelErrorBoundary } from './PanelErrorBoundary.js';
import { KanbanPanel } from './KanbanPanel.js';
import { FocusedDetailPanel } from './FocusedDetailPanel.js';
import { TickerPanel } from './TickerPanel.js';
import { InBannerHost } from './InBannerHost.js';
import { SendModal } from './SendModal.js';

// Tailwind 4 utility classes per WEB-T07. Default flex-col stack
// for narrow viewports; lg:grid (≥1024px) switches to 60/40
// columns. Mobile stacking acceptance from gate-3 amendment lands
// here via Tailwind responsive variants.
export function Layout(): ReactNode {
  return (
    <div className="flex flex-col h-screen font-sans bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="px-4 py-2 border-b border-gray-300 bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
        <strong>Foxworks Dispatch Conductor</strong>
      </header>

      <ConnectionStatusBanner />

      <main className="flex flex-col flex-1 overflow-hidden lg:grid lg:grid-cols-[60%_40%]">
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

      <SendModal />
    </div>
  );
}
