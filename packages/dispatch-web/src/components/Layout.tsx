import type { ReactNode } from 'react';
import { ConnectionStatusBanner } from './ConnectionStatusBanner.js';
import { PanelErrorBoundary } from './PanelErrorBoundary.js';
import { KanbanPanel } from './KanbanPanel.js';
import { FocusedDetailPanel } from './FocusedDetailPanel.js';
import { TickerPanel } from './TickerPanel.js';
import { InBannerHost } from './InBannerHost.js';
import { SendModal } from './SendModal.js';
import { PlanRing } from './PlanRing.js';
import { CostPill } from './CostPill.js';

// Phase 2 Step 5 (parallel-batch-2 / sess-1/dispatch-web-ui).
// MOCK constants for header plan ring + cost pill. Daemon does not
// expose plan-quota or cost-aggregation endpoints today (verified
// in /tmp/sess-1-dispatch-web-ui-diagnose.md §2 — zero hits across
// dispatch-daemon/src/ and dispatch-core/src/). Operator arbitrated
// option 1 (mock v0). data-mock="true" on the cluster wrapper
// surfaces this fact in DOM for dev-tools visibility. A finding for
// daemon plan/cost endpoints will be filed as part of post-batch
// followup.
const MOCK_USAGE_PCT = 47;
const MOCK_RESET_MS = 8_040_000; // 2h 14m — matches wireframe example
const MOCK_USD_TODAY = 0.42;

// Tailwind 4 utility classes per WEB-T07. Default flex-col stack
// for narrow viewports; lg:grid (≥1024px) switches to 60/40
// columns. Mobile stacking acceptance from gate-3 amendment lands
// here via Tailwind responsive variants.
export function Layout(): ReactNode {
  return (
    <div className="flex flex-col h-screen font-sans bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="flex items-center justify-between gap-4 px-4 py-2 border-b border-gray-300 bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
        <strong>Foxworks Dispatch Conductor</strong>
        <div className="flex items-center gap-3" data-mock="true">
          <PlanRing usagePct={MOCK_USAGE_PCT} resetMs={MOCK_RESET_MS} />
          <CostPill usdToday={MOCK_USD_TODAY} />
        </div>
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
