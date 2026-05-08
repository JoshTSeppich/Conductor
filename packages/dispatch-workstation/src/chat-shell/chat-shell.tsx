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
  // === BEGIN: MB-T25 plan-usage slot prop ===
  // Q-MBT25-2=a (push-based via onRateLimitUpdate) + Q-MBT25-2a=a
  // (extend coarchitectBridge) operator-confirmed at HALT 0
  // 2026-05-08. Q-MBT25-3 slot ordering operator-arbitrated at
  // Terminal A's Q-MBT24-4=far-left HALT 0 ack:
  //   [Auto/Ask MB-T24] | [plan-usage MB-T25 — this] | [cost-meter MB-T26] | [model-mix MB-T27]
  // Render-prop closure passed by mount.ts auto-mount block at WB3;
  // auto-mount wraps <PlanUsageRing bridge={coarchitectBridge}/> when
  // bridge.onRateLimitUpdate is defined (added by Terminal D's MB-T34
  // WB-final per operator HALT 0 ack 2026-05-08). WB1 RED: prop
  // reserved + JSX slot reserved; resolveRenderPlanUsageRing returns
  // undefined → empty slot. WB3 GREEN fills in.
  readonly renderPlanUsageRing?: () => ReactNode;
  // === END: MB-T25 ===
  //
  // Round 4 extension: MB-T24 (Auto/Ask toggle) + MB-T25 (plan-usage
  // ring) land sibling sentinel zones inside this same outer reserved
  // zone via per-session worktree isolation (Round 4 §3.12 pivot).
  // Slot ordering left-to-right per Q-MBT24-4=a (operator-confirmed
  // 2026-05-08, HALT 0 ack):
  //   [Auto/Ask MB-T24] | [plan-usage MB-T25] | [cost-meter MB-T26] | [model-mix MB-T27]
  // === BEGIN: MB-T24 dispatch-mode-toggle slot prop ===
  // Q-MBT24-3=a (two-button segmented control) + Q-MBT24-4=a (FAR-LEFT
  // slot, higher-priority operator-control surface) operator-confirmed
  // 2026-05-08. Render-prop closure passed by mount.ts auto-mount
  // block; auto-mount wraps <DispatchModeToggle bridge={dispatchModeBridge}/>
  // when window.dispatchModeBridge is exposed (preload.mts MB-T24 zone
  // adds the bridge per Q-MBT24-6=c at WB3 GREEN). WB1 RED: prop
  // reserved + JSX slot reserved; resolveRenderDispatchModeToggle returns
  // undefined → empty slot. WB3 GREEN fills in.
  readonly renderDispatchModeToggle?: () => ReactNode;
  // === END: MB-T24 ===
  // === BEGIN: MB-T26 cost-meter slot prop ===
  // Q-MBT26-1=a (header-bar slot model) + Q-MBT26-6=a (Terminal C lands
  // first inside Terminal B's reserved zone) operator-confirmed
  // 2026-05-07. Render-prop closure passed by mount.ts auto-mount
  // block; auto-mount wraps <CostMeter bridge={coarchitectBridge}/>
  // when bridge.onCostUpdate is defined (added at MB-T26 WB3 per
  // Q-MBT26-5=d push-based bridge method).
  readonly renderCostMeter?: () => ReactNode;
  // === END: MB-T26 ===
  // === BEGIN: MB-T27 model-mix slot prop ===
  // Q-MBT27-1=a (header-bar slot model, sibling to MB-T26) +
  // Q-MBT27-2=a (discrete named slot prop) operator-confirmed at
  // HALT 0 2026-05-07. Render-prop closure passed by mount.ts
  // auto-mount block; auto-mount wraps <MixIndicatorContainer
  // bridge={{ onSpawnResult }}/> when window.workstationBridge is
  // exposed (preload.mts UNCHANGED per Q-MBT27-3=a). WB1 RED: prop
  // reserved + JSX slot reserved; resolveRenderModelMix returns
  // undefined → empty slot. WB2 GREEN fills in.
  readonly renderModelMix?: () => ReactNode;
  // === END: MB-T27 ===
  // === END: MB-T22 header-bar extension point (MB-T26/MB-T27 territory) ===
}

export function ChatShell({
  tabs,
  activeTabId,
  onTabChange,
  // === BEGIN: MB-T25 plan-usage slot destructure ===
  renderPlanUsageRing,
  // === END: MB-T25 ===
  // === BEGIN: MB-T24 dispatch-mode-toggle slot destructure ===
  renderDispatchModeToggle,
  // === END: MB-T24 ===
  // === BEGIN: MB-T26 cost-meter slot destructure ===
  renderCostMeter,
  // === END: MB-T26 ===
  // === BEGIN: MB-T27 model-mix slot destructure ===
  renderModelMix,
  // === END: MB-T27 ===
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
          slot in this zone. T27 will add a sibling `renderModelMix`
          slot inside the same `chat-shell-header-bar` element via its
          own non-overlapping sentinel zone (see
          docs/coordination/t26-t27-coord.md).
          === */}
      {/* === BEGIN: MB-T26 cost-meter header-bar element + slot ===
          Q-MBT26-1=a (header-bar slot model) + Q-MBT26-6=a (Terminal C
          lands first; Terminal D adds model-mix slot to the SAME
          header-bar element via its own non-overlapping sentinel zone).
          Slot ordering left-to-right per t26-t27-coord.md:
            [plan-usage MB-T25 future] | [cost-meter MB-T26] | [model-mix MB-T27]
          === */}
      <div
        data-testid="chat-shell-header-bar"
        role="toolbar"
        aria-label="Chat shell header"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 8px',
        }}
      >
        {/* === BEGIN: MB-T24 dispatch-mode-toggle slot ===
            FAR-LEFT slot per Q-MBT24-4=a (operator-confirmed 2026-05-08
            HALT 0): operator-control surface gets prime position.
            Slot ordering left-to-right:
              [Auto/Ask MB-T24 — this] | [plan-usage MB-T25] | [cost-meter MB-T26] | [model-mix MB-T27]
            Sibling to MB-T26 + MB-T27 zones inside MB-T22 reserved zone.
            WB1 RED: renderDispatchModeToggle resolves to undefined → empty slot.
            WB3 GREEN fills in via window.dispatchModeBridge auto-build.
            === */}
        {renderDispatchModeToggle ? renderDispatchModeToggle() : null}
        {/* === END: MB-T24 === */}
        {/* === BEGIN: MB-T25 plan-usage slot ===
            Q-MBT25-3 slot ordering operator-arbitrated at A's Q-MBT24-4
            HALT 0 ack 2026-05-08:
              [Auto/Ask MB-T24] | [plan-usage MB-T25] | [cost-meter MB-T26] | [model-mix MB-T27]
            MB-T24 zone (Terminal A's mbt24-worktree branch) lands LEFT
            of this slot at operator-side merge time. This zone nests
            inside MB-T26's outer zone (same shape as MB-T27 nest per
            MB-F-T27-WB1-MB-T26-ZONE-NEST Tier 3 observation; authorized
            by C's MB-T26 zone header comment lines 116-124 — "additive
            sentinel zones in the SAME header-bar element"). C's logic
            UNCHANGED; no modification of cost-meter slot rendering.
            WB1 RED: renderPlanUsageRing resolves to undefined → empty.
            WB3 GREEN auto-mount fills in via mount.ts
            resolveRenderPlanUsageRing path 2.
            === */}
        {renderPlanUsageRing ? renderPlanUsageRing() : null}
        {/* === END: MB-T25 === */}
        {renderCostMeter ? renderCostMeter() : null}
        {/* === BEGIN: MB-T27 model-mix slot ===
            Sibling slot inside the chat-shell-header-bar element per
            t26-t27-coord.md slot ordering left-to-right:
              [plan-usage MB-T25 future] | [cost-meter MB-T26] | [model-mix MB-T27]
            Nested inside MB-T26's outer zone scope per C's authored
            intent in MB-T26 zone header comment 2026-05-07: "Terminal
            D adds model-mix slot to the SAME header-bar element via
            its own non-overlapping sentinel zone." C's logic
            UNCHANGED; no modification of cost-meter slot rendering.
            WB1 RED: renderModelMix resolves to undefined → empty.
            === */}
        {renderModelMix ? renderModelMix() : null}
        {/* === END: MB-T27 === */}
      </div>
      {/* === END: MB-T26 === */}
      {/* === END: MB-T22 header-bar extension point (MB-T26/MB-T27 territory) === */}

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
