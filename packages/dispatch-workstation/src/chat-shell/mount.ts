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
// === BEGIN: MB-T26 cost-meter import ===
import { CostMeter } from './cost-meter.js';
// === END: MB-T26 ===
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
  return () =>
    createElement(CostMeter, { bridge: { onCostUpdate } });
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
function resolveRenderModelMix(
  opts: MountChatShellOptions,
): (() => ReactNode) | undefined {
  if (opts.renderModelMix) return opts.renderModelMix;
  // WB2 GREEN: peek window.workstationBridge?.onSpawnResult and build
  // closure wrapping <MixIndicatorContainer bridge={{ onSpawnResult }} />.
  return undefined;
}
// === END: MB-T27 ===

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
  root.render(createElement(ChatShell, { tabs, renderCostMeter, renderModelMix }));
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
