// MB-T22 WB2 — Conductor chat panel shell (Family-B tab-host) — multi-tab API.
//
// Closes MB-F-T20-FAMILY-B-ADDITIONAL-TABS (Tier 2, FOLLOWUPS.md:128).
//
// Operator-confirmed Q-MBT22-3=a (decisions doc 2026-05-07): MB-T22 WB2
// is the single source of authorship for the multi-tab state machine.
// Replaces the MB-T20 single-tab `renderChatTab?` slot with the
// `tabs: TabConfig[]` + `activeTabId?` + `onTabChange?` API. No
// backwards-compat shim per CLAUDE.md "no backwards-compatibility hacks."
//
// Family-B tab body sequencing:
//   - MB-T22 (this WB): authors the multi-tab API
//   - MB-T22 WB4: registers the Commits tab body
//   - MB-T21 (sess A): renders Chat tab body (coarchitect/chat-panel.tsx)
//   - MB-T23: Tasks tab body (separate ticket)
//   - MB-T24..T27: header-bar slot extensions ABOVE the tab strip
//                  (NOT additional tabs — see header-bar extension point
//                  zone below)
//
// data-testid contract (preserved verbatim from MB-T20 + extended):
//   - chat-shell-root             outer container
//   - chat-shell-tab-strip        tab header (role=tablist)
//   - chat-shell-tab-{id}         per-tab chip (role=tab; aria-selected)
//   - chat-shell-tab-content      active tab body slot (role=tabpanel)
//
// Controlled / uncontrolled mode:
//   - If `activeTabId` is supplied, the parent owns selection state;
//     clicks invoke `onTabChange(id)` and the parent must update
//     activeTabId for the chip to switch.
//   - If `activeTabId` is omitted, ChatShell tracks active tab via an
//     internal useState (default = tabs[0]?.id). Clicks update internal
//     state AND notify `onTabChange?` if provided.
//   - Click on the already-active chip is a no-op (does not invoke
//     onTabChange).
import { useState, type ReactNode } from 'react';

export interface TabConfig {
  /** Stable identifier — used for `chat-shell-tab-{id}` data-testid + activeTabId matching. */
  readonly id: string;
  /** Visible chip text. */
  readonly label: string;
  /** Render fn for the tab body when this tab is active. */
  readonly render: () => ReactNode;
}

export interface ChatShellProps {
  readonly tabs: readonly TabConfig[];
  /** When supplied, ChatShell is controlled — parent owns selection state. */
  readonly activeTabId?: string;
  /** Invoked on click of an inactive tab chip with that chip's id. */
  readonly onTabChange?: (id: string) => void;
  // === BEGIN: MB-T22 header-bar extension point (MB-T26/MB-T27 territory) ===
  // Reserved for Terminal C (MB-T26 cost meter) and Terminal D
  // (MB-T27 model mix indicator) to additively extend the props
  // interface inside their own sentinel zones. Each future ticket adds
  // its own render-prop slot (e.g. `renderCostMeterSlot?: () =>
  // ReactNode`) and renders it inside the header-bar extension point
  // zone in the component body below. This zone preserves a documented
  // structural location ABOVE the tab strip; see operator coordination
  // 2026-05-07 (B WB2 ack message).
  // === END: MB-T22 header-bar extension point (MB-T26/MB-T27 territory) ===
}

export function ChatShell({
  tabs,
  activeTabId,
  onTabChange,
}: ChatShellProps) {
  // === BEGIN: MB-T22 multi-tab core ===
  // Hybrid controlled/uncontrolled state. When `activeTabId` is
  // supplied, parent owns; else fall back to internal state initialized
  // from tabs[0]?.id.
  const [internalActiveId, setInternalActiveId] = useState<string | undefined>(
    () => tabs[0]?.id,
  );
  const effectiveActiveId = activeTabId ?? internalActiveId;
  const activeTab = tabs.find((t) => t.id === effectiveActiveId);

  const handleTabClick = (id: string): void => {
    if (id === effectiveActiveId) return;
    if (activeTabId === undefined) {
      setInternalActiveId(id);
    }
    onTabChange?.(id);
  };
  // === END: MB-T22 multi-tab core ===

  return (
    <div data-testid="chat-shell-root">
      {/* === BEGIN: MB-T22 header-bar extension point (MB-T26/MB-T27 territory) ===
          C and D land their own sentinel zones HERE — DOM position
          ABOVE the tab strip. Per operator coordination 2026-05-07,
          C's WB3 plan adds `chat-shell-header-bar` element + cost-meter
          slot in this zone. WB2 leaves the location empty by design.
          === END: MB-T22 header-bar extension point (MB-T26/MB-T27 territory) === */}

      {/* === BEGIN: MB-T22 multi-tab core (DOM) === */}
      <div data-testid="chat-shell-tab-strip" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            data-testid={`chat-shell-tab-${tab.id}`}
            role="tab"
            aria-selected={tab.id === effectiveActiveId ? 'true' : 'false'}
            type="button"
            onClick={() => handleTabClick(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div data-testid="chat-shell-tab-content" role="tabpanel">
        {activeTab ? activeTab.render() : null}
      </div>
      {/* === END: MB-T22 multi-tab core (DOM) === */}
    </div>
  );
}
