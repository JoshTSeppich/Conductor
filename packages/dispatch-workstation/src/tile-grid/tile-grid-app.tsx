// MB-T12 WB9 — top-level TileGrid wrapper that subscribes to
// workstationBridge.onSpawnResult and manages the sessions list state.
//
// The lower-level <TileGrid> (WB6) is prop-driven (stateless about
// session inventory). This wrapper holds the inventory in React state,
// listens for spawn-result success replies on the bridge, and feeds
// the array down. Per Q-MBT12-5=a (operator-arbitrated 2026-05-07):
// reuse the existing `workstation:spawn-result` IPC — NO new IPC, NO
// contract amendment.
//
// Subsequent WBs extend this wrapper:
//   - WB10 (collapse) — toggleCollapse already wired to internal state
//     mutation; adds persistence callback to writeTileLayoutState.
//   - WB11 (detach) — handleDetach is currently a no-op; WB11 fills in
//     the BrowserWindow open + main-grid placeholder.
//   - WB12 (main.ts integration) — wires onSessionMounted, persistence
//     callbacks, and the initialSessions seed from tile-grid-state.

import { useEffect, useState } from 'react';
import {
  TileGrid,
  type TileGridSessionEntry,
} from './tile-grid.js';
import {
  TileApprovalPicker,
  type TileApprovalPickerBridge,
} from './tile-approval-picker.js';
import {
  TileAutopilotToggle,
  type TileAutopilotToggleBridge,
} from './tile-autopilot-toggle.js';
import { TileFooter } from './tile-footer.js';
import {
  subscribeToFrameMode,
  type FrameModeBridge,
} from './frame-mode-subscription.js';
import {
  subscribeToScrollToSession,
  type ScrollToSessionBridge,
} from './scroll-to-session-consumer.js';
import type { TileStatus } from './types.js';
import type { GridOverride } from '../main/tile-grid-state.js';
import type { ConsoleBridge } from '../main/console-bridge.js';
import type { TerminalAdapter } from '../console-panel/terminal-adapter.js';
import type { FrameMode } from '../main/frame-mode-state.js';
import {
  createSessionStatusSource,
  type StatusListClient,
} from '../main/session-status-source.js';
import type {
  ApprovalPolicy,
  ApprovalPolicyGetResponse,
} from 'dispatch-core/dist/v3/schema.js';

export interface WorkstationBridgeShape
  extends FrameModeBridge,
    ScrollToSessionBridge {
  /** Subscribes to 'workstation:spawn-result' replies. Returns cleanup. */
  onSpawnResult: (cb: (reply: unknown) => void) => () => void;
  /** WB11: invokes 'tile:detach' IPC to open a separate BrowserWindow for
   *  the session's console panel. Optional — when undefined, detach is a
   *  no-op (graceful degradation for non-Electron / test environments). */
  detachTile?: (sessionName: string) => Promise<{ ok: boolean }>;
  /** WB11: subscribes to 'tile:detach-closed' main-process events fired
   *  when an operator closes a detached console window. The detached
   *  session's tile re-mounts in the main grid (status flips to 'open').
   *  Returns cleanup. Optional — see detachTile note. */
  onTileDetachClosed?: (
    cb: (payload: { sessionName: string }) => void,
  ) => () => void;
  /** MB-T16 WB2: invokes 'workstation:approval-policy-get'. Optional —
   *  when undefined, TileApprovalPicker renders 'unavailable' state per
   *  Q-MBT16-2=a. */
  getSessionApprovalPolicy?: (
    sessionName: string,
  ) => Promise<ApprovalPolicyGetResponse>;
  /** MB-T16 WB2: invokes 'workstation:approval-policy-put'. Optional —
   *  when undefined, picker stays in 'unavailable' state. */
  putSessionApprovalPolicy?: (
    sessionName: string,
    policy: ApprovalPolicy,
  ) => Promise<ApprovalPolicyGetResponse>;
  /** MB-T17 WB2: invokes 'workstation:autopilot-get'. Optional —
   *  when undefined, TileAutopilotToggle renders 'unavailable' state
   *  per Q-MBT17-2=a. */
  getSessionAutopilotEnabled?: (
    sessionName: string,
  ) => Promise<{ enabled: boolean }>;
  /** MB-T17 WB2: invokes 'workstation:autopilot-put'. Optional —
   *  when undefined, toggle stays in 'unavailable' state. */
  setSessionAutopilotEnabled?: (
    sessionName: string,
    enabled: boolean,
  ) => Promise<{ enabled: boolean }>;
  /** §C.5: subscribes to 'workstation:tile-token-update' main-process events
   *  emitted by tile-token-scraper after per-session 500ms debounce.
   *  Optional — when undefined, token meter stays at stub default (0 tokens).
   *  Returns cleanup. */
  onTileTokenUpdate?: (
    cb: (payload: { sessionName: string; tokensUsed: number }) => void,
  ) => () => void;
}

export interface TileGridAppProps {
  readonly workstationBridge: WorkstationBridgeShape;
  readonly consoleBridge: ConsoleBridge;
  readonly createTerminal: () => TerminalAdapter;
  /** Seed sessions (e.g., from tile-grid-state on app startup, WB12). */
  readonly initialSessions?: readonly TileGridSessionEntry[];
  /** Initial grid override (drag-resize state) loaded from state file. */
  readonly initialGridOverride?: GridOverride;
  /** Fires when a new tile is mounted (auto-mount on spawn). WB12 hooks
   *  this to writeTileLayoutState(name, defaultTileLayoutState(idx)). */
  readonly onSessionMounted?: (sessionName: string) => void;
  /** Fires after drag-resize commits. WB12 hooks to writeGridOverride(). */
  readonly onPersistGridOverride?: (override: GridOverride) => void;
  /** Fires after collapse toggle / kill / swap. WB12 hooks to
   *  writeTileLayoutState / writeAllTileLayoutStates. */
  readonly onPersistSessions?: (
    sessions: readonly TileGridSessionEntry[],
  ) => void;
  /** Test seam — passed through to TileGrid for happy-dom layout
   *  determinism in drag-resize tests. */
  readonly getCurrentPixelSizes?: () => { colPx: number[]; rowPx: number[] };
  /** MB-T19 WB4: hero session designation seeded from tile-grid-state
   *  (`readHeroSessionName()`) on app startup. Passed through to
   *  <TileGrid>'s heroSessionName for hero/squad layout activation
   *  per Q-MBT19-1. v3.0 accepts the value as read-only render-time
   *  input; mutation flow + state setter deferred to v3.1. The
   *  end-to-end persistence wire (mount.ts → readHeroSessionName())
   *  shares the existing MB-F-T12-RENDERER-PERSISTENCE-WIRING
   *  followup; until that closes, this prop receives null in
   *  production and is operator-edit-then-restart only. */
  readonly heroSessionName?: string | null;
  /** MB-T-PHASE-4-T8-SIBLING-EXEC WB4: forward-position observation seam
   *  for Cluster A `spawnedAtMs` extension field. Fires from the
   *  spawn-result handler when the reply envelope carries `spawnedAtMs`.
   *  Optional — production wiring may later use it for persistence
   *  (e.g., crash-recovery seed of uptime); tests use it to assert
   *  Cluster A consumer-side propagation. NOT a render seam — uptime
   *  rendering is fed by the renderer-local spawnedAtMsBySession Map
   *  whose downstream pass-through to `<Tile>` props is deferred (see
   *  build-doc §1.5; tile-grid.tsx + tile.tsx out of t8-sibling-exec
   *  territory). */
  readonly onSpawnedAtMsCapture?: (
    sessionName: string,
    spawnedAtMs: number,
  ) => void;
  /** MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION WB1 (Path B; Sub-Q-4):
   *  injectable StatusListClient for tests. Production omits → useEffect
   *  instantiates a `new HttpSessionListClient()` per decisions doc §3
   *  ("new HttpSessionListClient instantiation inline in useEffect").
   *  Mirrors the existing `getCurrentPixelSizes` test-seam pattern. */
  readonly statusListClient?: StatusListClient;
  /** MB-T-MVP-W2-AGENT-GRID WB2 — agent-grid layout activation toggle
   *  (operator-vision Component 2: docs/coordination/operator-vision-
   *  three-pane-conductor-2026-05-17.md:80-85).
   *
   *  Default: `true` (MVP production default — flips the renderer to
   *  the 2x2/2x3/3x3/3x4 agent-grid layout for "1-12 concurrent tiles
   *  gracefully" per operator vision). Pass `false` explicitly to opt
   *  out (e.g., test fixtures asserting legacy uniform geometry).
   *
   *  Per Q-W2-1 disposition (b): prop-gated with TileGridApp-level
   *  default of true. Hero-mode (heroSessionName matches) takes
   *  precedence over agent-grid (Q-W2-2 FLAG-PRESERVE). */
  readonly agentGridMode?: boolean;
}

interface SpawnSuccessReply {
  type: 'success';
  result: {
    sessionName: string;
    /** MB-T18 WB3: cwd field on SpawnSessionResult (workstation-
     *  internal extension landed at WB2). Optional in the type guard
     *  for defensive parsing — absent → TileGridSessionEntry.cwd
     *  stays undefined and the footer omits the cwd line. */
    cwd?: string;
    /** MB-T-PHASE-4-T8-SIBLING-EXEC WB4: model identifier from Cluster A
     *  populator (via spawn-handler.ts WB2). Optional for defensive
     *  parsing — pre-WB2 spawn-result envelopes omit it; the field
     *  flows through to `TileGridSessionEntry.model` when present. */
    model?: string;
    /** MB-T-PHASE-4-T8-SIBLING-EXEC WB4: spawn-time (ms-since-epoch)
     *  from Cluster A populator. Optional for defensive parsing — pre-
     *  WB2 envelopes omit it; captured into the renderer-local
     *  spawnedAtMsBySession Map when present, and forwarded via
     *  onSpawnedAtMsCapture for future persistence wiring. */
    spawnedAtMs?: number;
  };
}

function isSpawnSuccessReply(x: unknown): x is SpawnSuccessReply {
  if (x === null || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  if (r['type'] !== 'success') return false;
  const result = r['result'];
  if (result === null || typeof result !== 'object') return false;
  const sessionName = (result as Record<string, unknown>)['sessionName'];
  return typeof sessionName === 'string' && sessionName.length > 0;
}

export function TileGridApp({
  workstationBridge,
  consoleBridge,
  createTerminal,
  initialSessions = [],
  initialGridOverride,
  onSessionMounted,
  onPersistGridOverride,
  onPersistSessions,
  getCurrentPixelSizes,
  heroSessionName,
  onSpawnedAtMsCapture,
  statusListClient,
  agentGridMode = true,
}: TileGridAppProps): JSX.Element | null {
  const [sessions, setSessions] = useState<readonly TileGridSessionEntry[]>([
    ...initialSessions,
  ]);

  // MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION WB1 (Path B; Sub-Q-1=B):
  // mirror the createSessionStatusSource snapshot in renderer state so
  // the JSX call site can merge it into the sessions[] prop passed to
  // <TileGrid>. New immutable Map on each emit so React's
  // reference-equality dirty-check fires (Sub-Q-2=useEffect-owned).
  const [statusSnapshot, setStatusSnapshot] = useState<
    ReadonlyMap<string, TileStatus>
  >(() => new Map());

  // MB-T-PHASE-4-T8-SIBLING-EXEC WB4: renderer-local side-Map for
  // Cluster A `spawnedAtMs`. Mirrors c5-trinity's anchor-only pattern
  // (`_frameMode`, `_lastScrollTargetSessionName` above) — value held,
  // downstream prop-drill into `<Tile>` is deferred per build-doc §1.5
  // (tile-grid.tsx + tile.tsx out of t8-sibling territory). Side-Map
  // exists separately because `TileGridSessionEntry.spawnedAtMs?` is
  // not addable this round (tile-grid.tsx FORBIDDEN).
  const [_spawnedAtMsBySession, setSpawnedAtMsBySession] = useState<
    ReadonlyMap<string, number>
  >(() => new Map());

  // MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-GAP anchor (c5 ticket): hold
  // subscribed FrameMode in renderer state. Initial 'C' matches the
  // shell-level `[data-frame-mode="C"]` default at
  // workstation-shell.html:46. End-to-end prop-drill into <Tile> is
  // OUT of c5 territory (tile-grid.tsx forbidden per manifest) —
  // _frameMode value is held but not yet visually propagated. See
  // coord-c5-tilegrid-wiring-2026-05-12.md (forthcoming at WB-final).
  const [_frameMode, setFrameMode] = useState<FrameMode>('C');

  useEffect(() => {
    return subscribeToFrameMode(workstationBridge, setFrameMode);
  }, [workstationBridge]);

  // MB-F-FRAME-C-FOCUS-EVENT-CONSUMER-MISSING anchor (c5 ticket): hold
  // the most-recent `frame-c:scroll-to-session` payload's sessionName
  // in renderer state. Visual scroll/highlight in tile-grid.tsx is OUT
  // of c5 territory; this state is anchor-only until the downstream
  // implementation reads from it. See coord-c5-tilegrid-wiring-
  // 2026-05-12.md (forthcoming at WB-final).
  const [_lastScrollTargetSessionName, setLastScrollTargetSessionName] =
    useState<string | null>(null);

  useEffect(() => {
    return subscribeToScrollToSession(workstationBridge, (payload) => {
      setLastScrollTargetSessionName(payload.sessionName);
    });
  }, [workstationBridge]);

  useEffect(() => {
    return workstationBridge.onSpawnResult((reply) => {
      if (!isSpawnSuccessReply(reply)) return;
      const sessionName = reply.result.sessionName;
      // MB-T18 WB3: propagate `cwd` from the SpawnSessionResult
      // envelope into the new TileGridSessionEntry. Conditional spread
      // avoids creating an `cwd: undefined` field when the envelope
      // didn't carry it (defensive — pre-WB2 workstation builds, test
      // fixtures emitting partial replies).
      const replyCwd = reply.result.cwd;
      // MB-T-PHASE-4-T8-SIBLING-EXEC WB4: Cluster A extension fields.
      // `model` flows into the existing `TileGridSessionEntry.model`
      // field (MB-T15) — full end-to-end propagation (renderer chip
      // already reads `s.model`). `spawnedAtMs` is captured into the
      // renderer-local side-Map; downstream prop-drill into `<Tile>`
      // is deferred per build-doc §1.5.
      const replyModel = reply.result.model;
      const replySpawnedAtMs = reply.result.spawnedAtMs;
      setSessions((current) => {
        // Idempotent: a duplicate spawn-result for the same sessionName
        // (e.g., re-fired by daemon recovery) does NOT create a second
        // tile.
        if (current.some((s) => s.name === sessionName)) return current;
        return [
          ...current,
          {
            name: sessionName,
            ...(typeof replyCwd === 'string' && replyCwd.length > 0
              ? { cwd: replyCwd }
              : {}),
            ...(typeof replyModel === 'string' && replyModel.length > 0
              ? { model: replyModel }
              : {}),
          },
        ];
      });
      if (typeof replySpawnedAtMs === 'number' && Number.isFinite(replySpawnedAtMs)) {
        setSpawnedAtMsBySession((prev) => {
          const next = new Map(prev);
          next.set(sessionName, replySpawnedAtMs);
          return next;
        });
        if (onSpawnedAtMsCapture) {
          onSpawnedAtMsCapture(sessionName, replySpawnedAtMs);
        }
      }
      if (onSessionMounted) onSessionMounted(sessionName);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workstationBridge, onSessionMounted, onSpawnedAtMsCapture]);

  // WB11: subscribe to detach-window-closed events. When the operator closes
  // a detached console window (closes the second BrowserWindow), the main
  // process fires 'tile:detach-closed' with the affected sessionName; the
  // tile reverts to 'open' status and re-mounts the ConsolePanel in the
  // main grid.
  useEffect(() => {
    if (!workstationBridge.onTileDetachClosed) return undefined;
    return workstationBridge.onTileDetachClosed(({ sessionName }) => {
      setSessions((current) =>
        persistAndUpdate(
          current.map((s) =>
            s.name === sessionName ? { ...s, status: 'open' as const } : s,
          ),
        ),
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workstationBridge]);

  // §C.5: subscribe to per-tile PTY token-count updates from tile-token-scraper.
  // Updates only tokensUsed on the matching session; does not trigger persistence
  // (token count is transient display state, not layout state).
  useEffect(() => {
    if (!workstationBridge.onTileTokenUpdate) return undefined;
    return workstationBridge.onTileTokenUpdate(({ sessionName, tokensUsed }) => {
      setSessions((current) =>
        current.map((s) => (s.name === sessionName ? { ...s, tokensUsed } : s)),
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workstationBridge]);

  // MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION WB1 (Path B; amended
  // post-WB-final smoke per operator Option A 2026-05-13):
  // construct a SessionStatusSource on mount, subscribe to its snapshot,
  // and dispose on unmount. Sub-Q-2: useEffect-owned, one source per
  // TileGridApp mount; cleanup calls unsub() + source.dispose() per
  // WB5 ConsumerWrapper pattern (probe-mbtphase5-status-indicator-02-
  // integration.spec.tsx:85-88).
  //
  // WB-final smoke amendment: Sub-Q-4 originally prescribed inline
  // `new HttpSessionListClient()` fallback here. That instantiation
  // pulls node:fs / node:path / node:os into the renderer esbuild
  // bundle (session-cap.ts:138-140 top-level imports) and breaks
  // build-tile-grid.mjs. Fallback DROPPED — `statusListClient` must be
  // provided explicitly (production wiring deferred to followup MB-F-
  // TILE-HEADER-STATUS-INTEGRATION-RENDERER-WIRING Tier 2). When
  // statusListClient is undefined, the subscription no-ops; the
  // existing tile-header chain falls back to seeded `s.status` or
  // 'idle' (Sub-Q-3 fallback chain handles undefined snapshot).
  useEffect(() => {
    if (!statusListClient) return undefined;
    const source = createSessionStatusSource({ listClient: statusListClient });
    const unsub = source.subscribe((snap) => {
      // Capture into a new immutable Map so setState identity-change
      // triggers a re-render. The source's internal Map mutates in
      // place across emits (session-status-source.ts:73-77).
      setStatusSnapshot(new Map(snap));
    });
    return () => {
      unsub();
      source.dispose();
    };
  }, [statusListClient]);

  function persistAndUpdate(
    next: readonly TileGridSessionEntry[],
  ): readonly TileGridSessionEntry[] {
    if (onPersistSessions) onPersistSessions(next);
    return next;
  }

  function handleKill(name: string): void {
    setSessions((current) => persistAndUpdate(current.filter((s) => s.name !== name)));
  }

  function handleCollapse(name: string): void {
    setSessions((current) =>
      persistAndUpdate(
        current.map((s) =>
          s.name === name ? { ...s, collapsed: !(s.collapsed ?? false) } : s,
        ),
      ),
    );
  }

  function handleDetach(name: string): void {
    // WB11: fire the IPC and update local status. Bridge call is async,
    // but we update status optimistically — onTileDetachClosed restores
    // status='open' if the operator closes the window or the detach fails.
    if (!workstationBridge.detachTile) return;
    void workstationBridge.detachTile(name).catch(() => {
      // Detach failed (e.g., window creation refused). Restore status.
      setSessions((current) =>
        persistAndUpdate(
          current.map((s) =>
            s.name === name ? { ...s, status: 'open' as const } : s,
          ),
        ),
      );
    });
    setSessions((current) =>
      persistAndUpdate(
        current.map((s) =>
          s.name === name ? { ...s, status: 'detached' as const } : s,
        ),
      ),
    );
  }

  function handleSwap(a: string, b: string): void {
    setSessions((current) => {
      const idxA = current.findIndex((s) => s.name === a);
      const idxB = current.findIndex((s) => s.name === b);
      if (idxA === -1 || idxB === -1) return current;
      const next = [...current];
      [next[idxA], next[idxB]] = [next[idxB], next[idxA]];
      return persistAndUpdate(next);
    });
  }

  function handleResizeEnd(override: GridOverride): void {
    if (onPersistGridOverride) onPersistGridOverride(override);
  }

  // MB-T16 WB4 — adapt the optional bridge methods into the slim
  // TileApprovalPickerBridge shape ONLY when both methods are defined.
  // Captured in a stable closure so React doesn't re-mount the picker
  // on every TileGridApp render. When the bridge methods are missing
  // (test fixtures, non-Electron envs), the closure passes null →
  // picker renders 'unavailable' per Q-MBT16-2=a.
  const pickerBridge: TileApprovalPickerBridge | null =
    workstationBridge.getSessionApprovalPolicy &&
    workstationBridge.putSessionApprovalPolicy
      ? {
          getSessionApprovalPolicy:
            workstationBridge.getSessionApprovalPolicy,
          putSessionApprovalPolicy:
            workstationBridge.putSessionApprovalPolicy,
        }
      : null;

  function renderPickerSlot(sessionName: string): JSX.Element {
    return (
      <TileApprovalPicker
        sessionName={sessionName}
        workstationBridge={pickerBridge}
      />
    );
  }

  // MB-T17 WB4 — adapt the optional autopilot bridge methods into the
  // slim TileAutopilotToggleBridge shape ONLY when both methods are
  // defined. When the bridge methods are missing (test fixtures, non-
  // Electron envs), the closure passes null → toggle renders
  // 'unavailable' per Q-MBT17-2=a. Mirrors the picker bridge adapter
  // pattern (MB-T16 Insight 2).
  const autopilotBridge: TileAutopilotToggleBridge | null =
    workstationBridge.getSessionAutopilotEnabled &&
    workstationBridge.setSessionAutopilotEnabled
      ? {
          getSessionAutopilotEnabled:
            workstationBridge.getSessionAutopilotEnabled,
          setSessionAutopilotEnabled:
            workstationBridge.setSessionAutopilotEnabled,
        }
      : null;

  function renderAutopilotSlot(sessionName: string): JSX.Element {
    return (
      <TileAutopilotToggle
        sessionName={sessionName}
        workstationBridge={autopilotBridge}
      />
    );
  }

  // MB-T18 WB3 — render-prop closure for the footer slot (Q-MBT18-4=a).
  // Per Q-MBT18-6=a: NO bridge — pure renderer-side data. The closure
  // looks up the session entry by sessionName + passes its cwd field
  // to TileFooter. Lookup is O(N) per render but N ≤ 8 (session cap);
  // negligible. Mount-time uptime is renderer-internal to TileFooter
  // (Q-MBT18-3=a lazy useState snapshot).
  function renderFooterSlot(sessionName: string): JSX.Element {
    const session = sessions.find((s) => s.name === sessionName);
    return (
      <TileFooter
        sessionName={sessionName}
        {...(session?.cwd !== undefined ? { cwd: session.cwd } : {})}
      />
    );
  }

  // MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION WB1 (Sub-Q-3 fallback
   // chain): merge the live snapshot into each entry. The existing
   // Tile.status → TileHeader.status → `<span data-testid="tile-status-
   // indicator" data-status={...}>` chain (tile-header.tsx:225-230)
   // becomes reactive automatically (Path B preserves the testid).
  return (
    <TileGrid
      sessions={sessions.map((s) => ({
        ...s,
        status: statusSnapshot.get(s.name) ?? s.status ?? 'idle',
      }))}
      consoleBridge={consoleBridge}
      createTerminal={createTerminal}
      onKill={handleKill}
      onCollapse={handleCollapse}
      onDetach={handleDetach}
      onSwap={handleSwap}
      renderPickerSlot={renderPickerSlot}
      renderAutopilotSlot={renderAutopilotSlot}
      renderFooterSlot={renderFooterSlot}
      onResizeEnd={handleResizeEnd}
      gridOverride={initialGridOverride}
      getCurrentPixelSizes={getCurrentPixelSizes}
      heroSessionName={heroSessionName ?? null}
      agentGridMode={agentGridMode}
    />
  );
}
