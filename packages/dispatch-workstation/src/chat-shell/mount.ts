// MB-T22 WB2 — Conductor chat panel shell mount adapter (multi-tab).
//
// Migrates the MB-T20 single-tab `renderChatTab?` slot to the multi-tab
// `tabs: TabConfig[]` API per Q-MBT22-3=a (decisions doc 2026-05-07).
// Closes MB-F-T20-FAMILY-B-ADDITIONAL-TABS.
//
// Public mountChatShell({ rootElementId, bridge }) signature preserved
// — A's MB-T21 quick-pick integration test
// (test/integration/chat-shell/quick-pick-roundtrip.test.tsx) and the
// MB-T20 probe-02 / probe-03 suites all call this shape and continue to
// work without modification. The new `tabs` option overrides the
// default Chat-tab construction (used by probe-02 test 5 after
// migration to the new API).
//
// preload.mts UNCHANGED at WB2. The new `commitsBridge` exposure +
// `commits-ipc.ts` IPC handler land at WB3 per the MB-T22 ladder
// (decisions doc §5-WB ladder).
//
// Renderer routing at runtime:
//   workstation-shell.html line 555 loads ../chat-shell/renderer.js
//   (the esbuild bundle of this module). Auto-mount block below mounts
//   ChatShell into workstation-shell.html#chat-region #root with a
//   tabs array containing the Chat tab built from coarchitectBridge
//   (Q-MBT20-5=a coarchitectBridge passthrough preserved).
//
// Auto-mount block gates on window.coarchitectBridge so unit tests can
// import mount.js without triggering DOM mount.

import { createRoot, type Root } from 'react-dom/client';
import { createElement, type ReactNode } from 'react';
import { ChatShell, type TabConfig } from './chat-shell.js';
import { ChatPanel, type StreamingBridge } from '../coarchitect/chat-panel.js';
import type {
  DaemonClient,
  ChatMessage,
  ChatMessageInput,
} from '../coarchitect/daemon-client.js';
// === BEGIN: MB-T25 plan-usage-ring import ===
import { PlanUsageRing } from './plan-usage-ring.js';
import type { RateLimitState } from './ring-helpers.js';
// === END: MB-T25 ===
// === BEGIN: MB-T-WIREFRAME-T9 plan-timer-text container import ===
// Production container for the bottom-rail plan-timer slot.
// Subscribes to coarchitectBridge.onRateLimitUpdate + ticks nowMs once
// per minute per ADR-MBTWFT9-C. Renders PlanTimerText (T4 WB10
// pure-prop component) with the latest state.
import { PlanTimerTextContainer } from './plan-timer-text.js';
// === END: MB-T-WIREFRAME-T9 ===
// === BEGIN: MB-T26 cost-meter import ===
import { CostMeter } from './cost-meter.js';
// === END: MB-T26 ===
// === BEGIN: MB-T-WIREFRAME-T4 bottom-rail imports ===
// Per ticket f8fc24d Sub-Q-T4-B=(iii) + Sub-Q-T4-C=(i): mount.ts wires
// BUILD.md tab (placeholder body) + BottomRailCostMeter (wireframe-
// formatted variant of MB-T26 cost-meter) into the production chat-
// shell. Remaining bottom-rail auto-wires (max-parallel-counter,
// bypass-perms-indicator, plan-timer-text) require sessions-stream /
// dispatchMode-poll / rate-limit-subscription reactivity that is
// deferred to Tier 2 followup MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING (filed
// at WB14 docs); slot props exist (chat-shell.tsx MB-T-WIREFRAME-T4
// WB12 sentinel zones) but production wiring lands in the follow-on.
import { BuildMdTab } from './build-md-tab.js';
import { BottomRailCostMeter } from './bottom-rail-cost-meter.js';
// === END: MB-T-WIREFRAME-T4 bottom-rail imports ===
// === BEGIN: MB-T-PHASE-4-BOTTOM-RAIL max-parallel pluggable-source imports ===
// Per operator decision 2026-05-16 BR-IMPL-1=(b) DEFER:
// pluggable-source seam for the MaxParallelCounter slot. Production
// raw-fs / IPC wiring deferred to Tier-1 followup
// MB-F-BOTTOM-RAIL-IMPL-PROD-WIRING-DEFERRED-WORKSTATION-CONTRACT-66-
// AMENDMENT-2026-05-16 (mirrors 7c8a957 HTTPSESSIONLISTCLIENT-PROD-
// WIRING-DEFERRED precedent).
import { MaxParallelCounter } from './max-parallel-counter.js';
import type { MaxParallelSource } from './max-parallel-source.js';
// === END: MB-T-PHASE-4-BOTTOM-RAIL ===
// === BEGIN: MB-T27 mix-indicator import ===
import { MixIndicatorContainer } from './mix-indicator.js';
// === END: MB-T27 ===
// === BEGIN: MB-T24 dispatch-mode-toggle import ===
// Type-only here at WB1 RED; component import lands at WB3 GREEN when
// resolveRenderDispatchModeToggle path 2 (window.dispatchModeBridge auto-
// build) is implemented. WB1 RED keeps only the type for the explicit-
// override path (path 1).
import type { DispatchModeBridge } from './dispatch-mode-toggle.js';
import { DispatchModeToggle } from './dispatch-mode-toggle.js';
// === END: MB-T24 ===
// === BEGIN: MB-T22 WB4 commits-tab import ===
// CommitsTab consumes window.commitsBridge (preload.mts MB-T22 zone) at
// render time. Type-only import of CommitsBridge so type narrowing works
// without pulling commits-reader's node:child_process into the renderer
// bundle.
import { CommitsTab, type CommitsBridge } from './commits-tab.js';
// === END: MB-T22 WB4 ===

// Re-export TabConfig for downstream tab-config authors (e.g. WB4
// commits TabConfig wiring; future MB-T23 Tasks tab).
export type { TabConfig };

// CoarchitectBridge type mirrors src/coarchitect/mount.ts:29-32. Source
// of truth: preload.mts contextBridge.exposeInMainWorld('coarchitect-
// Bridge', {...}). chat-shell extends StreamingBridge (imported from
// coarchitect/chat-panel.js — the wrapped consumer's contract surface).
export interface CoarchitectBridge extends StreamingBridge {
  readonly fetchHistory: () => Promise<ChatMessage[]>;
  readonly postMessage: (msg: ChatMessageInput) => Promise<ChatMessage>;
  // === BEGIN: MB-T26 cost-meter bridge surface (additive) ===
  // Q-MBT26-5=d operator-confirmed 2026-05-07 (push-based via
  // onCostUpdate). Optional so existing CoarchitectBridge mocks (probe-
  // 02/03 + coarchitect-ipc test_register_ipc_handlers) continue to
  // satisfy the interface without redefining their fixtures.
  readonly onCostUpdate?: (cb: (totalUsd: number) => void) => () => void;
  // === END: MB-T26 ===
  // === BEGIN: MB-T25 plan-usage bridge surface (additive) ===
  // Q-MBT25-2=a (push-based) + Q-MBT25-2a=a (extend coarchitectBridge)
  // operator-confirmed at HALT 0 2026-05-08. Bridge method name
  // `onRateLimitUpdate` aligns with Terminal D's MB-T34
  // C-MBT34-1 disposition (API-level concept; widget translates to
  // plan-usage UX internally). Optional so existing CoarchitectBridge
  // mocks satisfy the interface unchanged. Cb receives RateLimitState
  // (4-dimension nested-bucket from D's diagnose §VIII data contract).
  // WB1 RED used `state: unknown`; WB3 GREEN tightens to RateLimitState
  // via deep import from ring-helpers (per CLAUDE.md §3.4 mechanical-
  // translation discipline). [MODELED]→[KNOWN] ratchet at v3.1 once
  // Terminal D ships its API client and exports the type from MB-T34
  // surface; for v3.0 this local type is the canonical RateLimitState
  // shape per operator's HALT 0 ack on D's diagnose §VIII data contract.
  readonly onRateLimitUpdate?: (
    cb: (state: RateLimitState) => void,
  ) => () => void;
  // === END: MB-T25 ===
}

declare global {
  interface Window {
    coarchitectBridge?: CoarchitectBridge;
    // === BEGIN: MB-T22 WB4 commitsBridge global type ===
    // Exposed by preload.mts MB-T22 zone (`commits:list` IPC handler).
    // Renderer consumer is CommitsTab inside the Commits TabConfig
    // registered by resolveTabs() below.
    commitsBridge?: CommitsBridge;
    // === END: MB-T22 WB4 ===
    // === BEGIN: MB-T24 dispatchModeBridge global type ===
    // Exposed by preload.mts MB-T24 zone (NEW additive bridge per
    // Q-MBT24-6=c — mirrors commitsBridge precedent). Renderer
    // consumer is DispatchModeToggle inside the renderDispatchModeToggle
    // closure resolved by resolveRenderDispatchModeToggle() below.
    // Routes via ipcRenderer.invoke('dispatch-mode:get') +
    // ipcRenderer.invoke('dispatch-mode:set', mode) to dispatch-mode-
    // ipc.ts handlers (registered at app.whenReady time per main.ts
    // MB-T24 sentinel zone, lands at WB3 GREEN).
    dispatchModeBridge?: DispatchModeBridge;
    // === END: MB-T24 ===
  }
}

export interface MountChatShellOptions {
  readonly rootElementId: string;
  readonly bridge?: CoarchitectBridge | null;
  /**
   * Explicit tabs override. When omitted, mountChatShell builds a
   * single Chat tab from `bridge` (if supplied) or from
   * `defaultChatTabStub` (otherwise). When supplied, used verbatim.
   */
  readonly tabs?: readonly TabConfig[];
  // === BEGIN: MB-T26 cost-meter slot option ===
  // Q-MBT26-1=a (header-bar slot model) operator-confirmed 2026-05-07.
  // When supplied, used verbatim. When omitted, mountChatShell builds
  // a closure from `bridge.onCostUpdate` (if defined) — see
  // resolveRenderCostMeter below.
  readonly renderCostMeter?: () => ReactNode;
  // === END: MB-T26 ===
  // === BEGIN: MB-T22 WB4 commits-bridge override ===
  // Q-MBT22-7=a — explicit commitsBridge for test injection. When
  // omitted at runtime, the Commits TabConfig render closure pulls
  // `window.commitsBridge` (preload.mts MB-T22 zone). When supplied
  // (integration test fixture path), used verbatim.
  readonly commitsBridge?: CommitsBridge;
  // === END: MB-T22 WB4 ===
  // === BEGIN: MB-T27 model-mix slot option ===
  // Q-MBT27-1=a (header-bar slot model) + Q-MBT27-2=a (discrete named
  // slot prop) operator-confirmed at HALT 0 2026-05-07. When supplied,
  // used verbatim. When omitted, mountChatShell at WB2 GREEN will
  // build a closure from window.workstationBridge.onSpawnResult (if
  // defined). WB1 RED: resolveRenderModelMix returns undefined when
  // not explicitly supplied (no auto-build yet).
  readonly renderModelMix?: () => ReactNode;
  // === END: MB-T27 ===
  // === BEGIN: MB-T25 plan-usage slot option ===
  // Q-MBT25-2=a (push-based) + Q-MBT25-2a=a (extend coarchitectBridge)
  // operator-confirmed at HALT 0 2026-05-08. When supplied, used
  // verbatim (test override path). When omitted, mountChatShell at
  // WB3 GREEN builds a closure from `bridge.onRateLimitUpdate` if
  // defined. WB1 RED: resolveRenderPlanUsageRing returns undefined
  // when not explicitly supplied (path 2 auto-build deferred to WB3
  // GREEN).
  readonly renderPlanUsageRing?: () => ReactNode;
  // === END: MB-T25 ===
  // === BEGIN: MB-T-WIREFRAME-T9 plan-timer-text slot option ===
  // Sub-Q-T9-D=(i) reuse coarchitectBridge.onRateLimitUpdate per
  // ADR-MBTWFT9-D. When supplied, used verbatim (test override).
  // When omitted, mountChatShell builds a closure from
  // bridge.onRateLimitUpdate via PlanTimerTextContainer (subscription
  // + 60s nowMs tick per ADR-MBTWFT9-C). Closes the PlanTimerText
  // arm of MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING (Tier 2).
  readonly renderPlanTimerText?: () => ReactNode;
  // === END: MB-T-WIREFRAME-T9 ===
  // === BEGIN: MB-T24 dispatch-mode-toggle slot option ===
  // Q-MBT24-3=a (two-button segmented control) + Q-MBT24-4=a (FAR-LEFT
  // slot) + Q-MBT24-6=c (NEW dispatchModeBridge — additive surface
  // per commitsBridge precedent) operator-confirmed at HALT 0 2026-05-08.
  // When supplied, used verbatim (test-override path). When omitted,
  // mountChatShell at WB3 GREEN builds a closure from
  // window.dispatchModeBridge (if defined). WB1 RED:
  // resolveRenderDispatchModeToggle returns undefined when not explicitly
  // supplied (no auto-build yet).
  readonly renderDispatchModeToggle?: () => ReactNode;
  // === END: MB-T24 ===
  // === BEGIN: MB-T-PHASE-4-BOTTOM-RAIL max-parallel slot options ===
  // Per operator decision 2026-05-16 BR-IMPL-1=(b) DEFER. Two seams:
  //   - `renderMaxParallelCounter` (test/integration injection) —
  //     explicit override consumed verbatim, mirrors MB-T26/T27 pattern.
  //   - `maxParallelSource` (pluggable production source seam) —
  //     consumed by resolveRenderMaxParallelCounter to read the
  //     ceiling. Production raw-fs / IPC supplier ships via Tier-1
  //     followup MB-F-BOTTOM-RAIL-IMPL-PROD-WIRING-DEFERRED-
  //     WORKSTATION-CONTRACT-66-AMENDMENT-2026-05-16. Under DEFER
  //     scope, no auto-build from window.workstationBridge happens —
  //     the sessions-stream subscription is itself deferred (rendering
  //     activeCount=0 against a real maxParallel would mislead users).
  //     When neither override nor source is supplied, the factory
  //     returns undefined and the slot stays empty (preserves T4 WB4
  //     ship semantics per chat-shell.tsx:261 comment).
  readonly renderMaxParallelCounter?: () => ReactNode;
  readonly maxParallelSource?: MaxParallelSource;
  // === END: MB-T-PHASE-4-BOTTOM-RAIL ===
}

// Adapter from coarchitectBridge → ChatPanel's DaemonClient interface.
// Mirrors src/coarchitect/mount.ts:40-45.
function createDaemonClientAdapter(bridge: CoarchitectBridge): DaemonClient {
  return {
    fetchHistory: () => bridge.fetchHistory(),
    postMessage: (msg) => bridge.postMessage(msg),
  };
}

// renderChatTabBody closure that wraps ChatPanel for the Chat tab body.
// Q-MBT20-3=a (wrap) + Q-MBT20-5=a (coarchitectBridge passthrough).
function makeChatPanelRender(bridge: CoarchitectBridge): () => ReactNode {
  const daemonClient = createDaemonClientAdapter(bridge);
  return () =>
    createElement(ChatPanel, {
      daemonClient,
      streamingBridge: bridge,
    });
}

function defaultChatTabStub(): ReactNode {
  return createElement(
    'span',
    { 'data-testid': 'chat-shell-chat-tab-stub' },
    'Chat tab body — provide bridge or tabs to wire ChatPanel',
  );
}

// === BEGIN: MB-T22 WB4 commits-tab render helper ===
// Closure resolution order at render time:
//   1. opts.commitsBridge (test injection — integration fixture path)
//   2. window.commitsBridge (production via preload.mts MB-T22 zone)
//   3. undefined → CommitsTab renders empty-state row
// Resolved at render call (not at resolveTabs call) so window.commitsBridge
// can be set after mount.ts import (e.g. in integration tests that wire
// the global before mountChatShell()).
function makeCommitsTabRender(
  explicit?: CommitsBridge,
): () => ReactNode {
  return () => {
    const bridge =
      explicit ??
      (typeof window !== 'undefined' ? window.commitsBridge : undefined);
    return createElement(CommitsTab, bridge ? { bridge } : {});
  };
}
// === END: MB-T22 WB4 ===

// Resolution order (preserves MB-T20 probe-02 + probe-03 + A's
// quick-pick integration test behavior under the new API):
//   1. Explicit `opts.tabs` — used verbatim (probe-02 test 5 path).
//   2. `opts.bridge` — build single Chat tab wrapping ChatPanel via
//      coarchitectBridge passthrough (probe-03 + integration path).
//   3. Neither — build single Chat tab with defaultChatTabStub
//      (probe-02 tests 1-4 path; production fallback when bridge is
//      not yet exposed).
function resolveTabs(opts: MountChatShellOptions): readonly TabConfig[] {
  if (opts.tabs) return opts.tabs;
  if (opts.bridge) {
    return [
      {
        id: 'chat',
        label: 'Chat',
        render: makeChatPanelRender(opts.bridge),
      },
      // === BEGIN: MB-T22 WB4 Commits TabConfig ===
      // Sibling to Chat in the bridge path. Closes the renderer-second-tab
      // level of MB-F-T20-FAMILY-B-ADDITIONAL-TABS — structural multi-tab
      // API closure landed at WB2 (a08b406); this is the actual second
      // tab body. CommitsTab pulls data from window.commitsBridge or
      // opts.commitsBridge (test injection).
      {
        id: 'commits',
        label: 'Commits',
        render: makeCommitsTabRender(opts.commitsBridge),
      },
      // === END: MB-T22 WB4 ===
      // === BEGIN: MB-T-WIREFRAME-T4 WB13 BUILD.md TabConfig ===
      // Per Sub-Q-T4-B=(iii) operator-acked 2026-05-12: ship BUILD.md
      // tab with placeholder body. Actual content rendering owned by
      // T5 ticket (`c92f750` ticket body landed) — T5 will replace
      // BuildMdTab body OR mount.ts will swap the render fn.
      {
        id: 'build-md',
        label: 'BUILD.md',
        render: () => createElement(BuildMdTab),
      },
      // === END: MB-T-WIREFRAME-T4 WB13 ===
    ];
  }
  return [
    {
      id: 'chat',
      label: 'Chat',
      render: defaultChatTabStub,
    },
  ];
}

// === BEGIN: MB-T26 cost-meter slot resolution ===
// Resolution order mirrors resolveTabs above:
//   1. Explicit `opts.renderCostMeter` — used verbatim (test override path).
//   2. `opts.bridge?.onCostUpdate` — build closure that wraps <CostMeter
//      bridge={{ onCostUpdate: bridge.onCostUpdate }}/>.
//   3. Neither — return undefined (chat-shell renders empty header-bar
//      slot per chat-shell.tsx MB-T26 zone fallback).
function resolveRenderCostMeter(
  opts: MountChatShellOptions,
): (() => ReactNode) | undefined {
  if (opts.renderCostMeter) return opts.renderCostMeter;
  const onCostUpdate = opts.bridge?.onCostUpdate;
  if (!onCostUpdate) return undefined;
  // === BEGIN: MB-T-WIREFRAME-T4 WB13 wireframe-formatted cost-meter swap ===
  // Per Sub-Q-T4-C=(i) operator-acked 2026-05-12 + WB7 investigation
  // finding: production runtime uses BottomRailCostMeter (wireframe
  // "conductor api · $X.XX today" format) instead of MB-T26 CostMeter
  // ("$X.XXXX" format). Both consume the SAME `onCostUpdate` bridge
  // surface; wireframe-format swap is renderer-only. The MB-T26
  // CostMeter component remains available for other slot uses (e.g.
  // tests that import it directly); the `if (false)` guard preserves
  // the import path so the bundle still references MB-T26 (avoids
  // dead-code elimination of the export).
  if (false) void CostMeter;
  return () =>
    createElement(BottomRailCostMeter, { bridge: { onCostUpdate } });
  // === END: MB-T-WIREFRAME-T4 WB13 ===
}
// === END: MB-T26 ===

// === BEGIN: MB-T27 model-mix slot resolution ===
// Resolution order mirrors resolveRenderCostMeter / resolveTabs above:
//   1. Explicit `opts.renderModelMix` — used verbatim (test override path).
//   2. window.workstationBridge?.onSpawnResult — build closure that
//      wraps <MixIndicatorContainer bridge={{ onSpawnResult }} />.
//   3. Neither — return undefined (chat-shell renders empty model-mix
//      slot per chat-shell.tsx MB-T27 zone fallback; zero-state
//      acceptance preserved when no renderer wired).
//
// WB1 RED: only paths (1) and (3) implemented. WB2 GREEN adds
// MixIndicatorContainer import + window.workstationBridge wiring
// (path 2). Per Q-MBT27-3=a operator-confirmed at HALT 0 2026-05-07:
// preload.mts UNCHANGED; reuses existing workstationBridge.onSpawnResult.
// === BEGIN: MB-T24 dispatch-mode-toggle slot resolution ===
// Resolution order mirrors resolveRenderCostMeter / resolveRenderModelMix
// above:
//   1. Explicit `opts.renderDispatchModeToggle` — used verbatim (test
//      override path; probe-06 fixture sets this directly).
//   2. window.dispatchModeBridge — build closure that wraps
//      <DispatchModeToggle bridge={window.dispatchModeBridge}/>.
//   3. Neither — return undefined (chat-shell renders empty MB-T24 slot
//      per chat-shell.tsx MB-T24 zone fallback; integration tests that
//      do not wire dispatchModeBridge see the toggle in non-interactive
//      default state).
//
// WB1 RED: only paths (1) and (3) implemented. WB3 GREEN adds path 2
// (window.dispatchModeBridge auto-build) once preload.mts MB-T24 zone
// exposes the bridge per Q-MBT24-6=c.
function resolveRenderDispatchModeToggle(
  opts: MountChatShellOptions,
): (() => ReactNode) | undefined {
  if (opts.renderDispatchModeToggle) return opts.renderDispatchModeToggle;
  // Path 2: peek window.dispatchModeBridge and wrap
  // <DispatchModeToggle bridge={window.dispatchModeBridge}/>. Lands at
  // WB3 GREEN once preload.mts MB-T24 zone exposes the bridge.
  const bridge =
    typeof window !== 'undefined' ? window.dispatchModeBridge : undefined;
  if (!bridge) return undefined;
  return () => createElement(DispatchModeToggle, { bridge });
}
// === END: MB-T24 ===

function resolveRenderModelMix(
  opts: MountChatShellOptions,
): (() => ReactNode) | undefined {
  if (opts.renderModelMix) return opts.renderModelMix;
  // Path 2: peek window.workstationBridge.onSpawnResult and wrap
  // <MixIndicatorContainer bridge={{ onSpawnResult }} />. Inline
  // narrow type cast — the workstationBridge global aug lives in
  // tile-grid-app.tsx (a sibling renderer's territory); the
  // chat-shell directory is tsconfig-excluded so the cast does not
  // propagate type errors. preload.mts UNCHANGED per Q-MBT27-3=a;
  // reuses workstationBridge.onSpawnResult exposed at
  // preload.mts:55-56 (attachSpawnResultListener).
  const ws =
    typeof window !== 'undefined'
      ? (
          window as {
            workstationBridge?: {
              onSpawnResult?: (cb: (reply: unknown) => void) => () => void;
            };
          }
        ).workstationBridge
      : undefined;
  const onSpawnResult = ws?.onSpawnResult;
  if (!onSpawnResult) return undefined;
  return () =>
    createElement(MixIndicatorContainer, { bridge: { onSpawnResult } });
}
// === END: MB-T27 ===

// === BEGIN: MB-T25 plan-usage slot resolution ===
// Resolution order mirrors resolveRenderCostMeter / resolveRenderModelMix
// / resolveTabs above:
//   1. Explicit `opts.renderPlanUsageRing` — used verbatim (test
//      override path; consumed by probe-07-plan-usage-ring's
//      explicit-bridge fixtures).
//   2. `opts.bridge?.onRateLimitUpdate` — build closure that wraps
//      <PlanUsageRing bridge={{ onRateLimitUpdate }} /> (WB3 GREEN
//      wires this; Terminal D's MB-T34 WB-final adds onRateLimitUpdate
//      to coarchitectBridge per HALT 0 ack 2026-05-08).
//   3. Neither — return undefined (chat-shell renders empty plan-usage
//      slot per chat-shell.tsx MB-T25 zone fallback; placeholder
//      em-dash is rendered by PlanUsageRing itself when bridge is
//      null/undefined, but at the slot level an undefined render-prop
//      means no slot child at all — operator-noted UX subtlety: empty
//      slot vs null bridge are distinct cases).
//
// WB3 GREEN: paths (1), (2), (3) all implemented. CoarchitectBridge
// `onRateLimitUpdate` is now typed `cb: (state: RateLimitState) => void`
// (tightened from WB1 RED `unknown`). PlanUsageRingBridge surface is
// structurally compatible — wrap directly.
function resolveRenderPlanUsageRing(
  opts: MountChatShellOptions,
): (() => ReactNode) | undefined {
  if (opts.renderPlanUsageRing) return opts.renderPlanUsageRing;
  const onRateLimitUpdate = opts.bridge?.onRateLimitUpdate;
  if (!onRateLimitUpdate) return undefined;
  return () =>
    createElement(PlanUsageRing, { bridge: { onRateLimitUpdate } });
}
// === END: MB-T25 ===

// === BEGIN: MB-T-WIREFRAME-T9 plan-timer-text slot resolution ===
// Resolution order mirrors resolveRenderPlanUsageRing (sibling
// consumer of the same coarchitectBridge.onRateLimitUpdate channel):
//   1. Explicit `opts.renderPlanTimerText` — used verbatim (test
//      override path).
//   2. `opts.bridge?.onRateLimitUpdate` — build closure that wraps
//      <PlanTimerTextContainer bridge={{ onRateLimitUpdate }} />.
//      Container handles subscription + nowMs interval internally.
//   3. Neither — return undefined (chat-shell.tsx MB-T-WIREFRAME-T4
//      WB12 plan-timer-text slot renders nothing).
//
// Closes the PlanTimerText arm of MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING
// (Tier 2). Under Sub-Q-T9-A=(f) skeleton-with-deferred-source the
// container subscribes successfully but the bridge fires zero updates
// in production (aggregator wired to createNullRateLimitSource at
// coarchitect-ipc.ts), so the rendered text stays at the honest
// "Max plan resets in —" placeholder until a real source is plugged
// via follow-on ticket.
function resolveRenderPlanTimerText(
  opts: MountChatShellOptions,
): (() => ReactNode) | undefined {
  if (opts.renderPlanTimerText) return opts.renderPlanTimerText;
  const onRateLimitUpdate = opts.bridge?.onRateLimitUpdate;
  if (!onRateLimitUpdate) return undefined;
  return () =>
    createElement(PlanTimerTextContainer, {
      bridge: { onRateLimitUpdate },
    });
}
// === END: MB-T-WIREFRAME-T9 ===

// === BEGIN: MB-T-PHASE-4-BOTTOM-RAIL max-parallel slot resolution ===
// Per operator decision 2026-05-16 BR-IMPL-1=(b) DEFER. Resolution order
// mirrors resolveRenderPlanTimerText (sibling bottom-rail consumer):
//   1. Explicit `opts.renderMaxParallelCounter` — used verbatim
//      (test-override / integration fixture path).
//   2. Explicit `opts.maxParallelSource` — build closure that wraps
//      <MaxParallelCounter sessions={[]} maxParallel={source.read()} />.
//      Empty sessions[] is honest under DEFER scope: the renderer-side
//      sessions-stream subscription (BR-2=(a) renderer-internal filter)
//      is itself deferred to the Tier-1 followup, so activeCount
//      degrades to 0 via T10 inline-filter at max-parallel-counter.tsx:65.
//      The Tier-1 followup will replace this branch with a real
//      sessions accumulator + source-driven ceiling.
//   3. Neither — return undefined; chat-shell.tsx:261 renders empty
//      slot (preserves T4 WB4 ship semantics; current production state).
//
// Under DEFER scope, production runtime (no opts.maxParallelSource
// supplied) hits path 3 → slot renders nothing. This is the intended
// no-regression state until the Tier-1 followup plugs both seams.
// Tests can exercise paths 1 + 2 via explicit opts; behavioral
// assertions live in sibling probe-mbtwt4-02 component-level probes.
function resolveRenderMaxParallelCounter(
  opts: MountChatShellOptions,
): (() => ReactNode) | undefined {
  if (opts.renderMaxParallelCounter) return opts.renderMaxParallelCounter;
  const source = opts.maxParallelSource;
  if (!source) return undefined;
  return () =>
    createElement(MaxParallelCounter, {
      sessions: [],
      maxParallel: source.read(),
    });
}
// === END: MB-T-PHASE-4-BOTTOM-RAIL ===

export function mountChatShell(opts: MountChatShellOptions): () => void {
  const rootEl = document.getElementById(opts.rootElementId);
  if (!rootEl) throw new Error(`#${opts.rootElementId} not found`);
  const root: Root = createRoot(rootEl);
  const tabs = resolveTabs(opts);
  // === BEGIN: MB-T26 cost-meter slot passthrough ===
  const renderCostMeter = resolveRenderCostMeter(opts);
  // === BEGIN: MB-T27 model-mix slot passthrough ===
  // Sibling resolution + render-prop pass-through to ChatShell. Nested
  // inside MB-T26 zone per C's authored intent (chat-shell.tsx MB-T26
  // zone header comment 2026-05-07: "Terminal D adds model-mix slot
  // to the SAME header-bar element via its own non-overlapping
  // sentinel zone"). C's renderCostMeter resolution UNCHANGED; the
  // root.render call below extends its props object additively.
  const renderModelMix = resolveRenderModelMix(opts);
  // === END: MB-T27 ===
  // === BEGIN: MB-T25 plan-usage slot passthrough ===
  // Sibling resolution + render-prop pass-through to ChatShell. Nested
  // inside MB-T26 zone (same shape as MB-T27 nest per
  // MB-F-T27-WB1-MB-T26-ZONE-NEST Tier 3 observation). C's logic
  // UNCHANGED; root.render call below extends its props object
  // additively.
  const renderPlanUsageRing = resolveRenderPlanUsageRing(opts);
  // === END: MB-T25 ===
  // === BEGIN: MB-T-WIREFRAME-T9 plan-timer-text slot passthrough ===
  // Sibling resolution + render-prop pass-through to ChatShell.
  // ChatShell already accepts `renderPlanTimerText` per the
  // MB-T-WIREFRAME-T4 WB12 sentinel zone at chat-shell.tsx:133.
  const renderPlanTimerText = resolveRenderPlanTimerText(opts);
  // === END: MB-T-WIREFRAME-T9 ===
  // === BEGIN: MB-T24 dispatch-mode-toggle slot passthrough ===
  // Sibling resolution + render-prop pass-through. Slot ordering inside
  // chat-shell-header-bar is FAR-LEFT per Q-MBT24-4=a — the JSX render
  // order in chat-shell.tsx MB-T24 zone places this slot before the
  // MB-T26 cost-meter slot. mount.ts simply hands closures via props;
  // chat-shell.tsx owns left-to-right slot ordering.
  const renderDispatchModeToggle = resolveRenderDispatchModeToggle(opts);
  // === END: MB-T24 ===
  // === BEGIN: MB-T-PHASE-4-BOTTOM-RAIL max-parallel slot passthrough ===
  // Per operator decision 2026-05-16 BR-IMPL-1=(b) DEFER. Sibling
  // resolution + render-prop pass-through; chat-shell.tsx:121 +
  // chat-shell.tsx:261 already accept `renderMaxParallelCounter` via
  // T4 WB4 slot prop. Under DEFER scope the prod runtime resolves to
  // undefined (no opts.maxParallelSource supplied at auto-mount
  // block); Tier-1 followup wires the production source.
  const renderMaxParallelCounter = resolveRenderMaxParallelCounter(opts);
  // === END: MB-T-PHASE-4-BOTTOM-RAIL ===
  root.render(
    createElement(ChatShell, {
      tabs,
      renderCostMeter,
      renderModelMix,
      renderPlanUsageRing,
      renderDispatchModeToggle,
      renderPlanTimerText,
      renderMaxParallelCounter,
    }),
  );
  // === END: MB-T26 ===
  return () => root.unmount();
}

if (
  typeof window !== 'undefined' &&
  window.coarchitectBridge &&
  typeof document !== 'undefined' &&
  document.getElementById('root')
) {
  mountChatShell({
    rootElementId: 'root',
    bridge: window.coarchitectBridge,
  });
  console.log('CHAT_SHELL_MOUNTED');
}
