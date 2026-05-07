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
import type { GridOverride } from '../main/tile-grid-state.js';
import type { ConsoleBridge } from '../main/console-bridge.js';
import type { TerminalAdapter } from '../console-panel/terminal-adapter.js';

export interface WorkstationBridgeShape {
  /** Subscribes to 'workstation:spawn-result' replies. Returns cleanup. */
  onSpawnResult: (cb: (reply: unknown) => void) => () => void;
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
}

interface SpawnSuccessReply {
  type: 'success';
  result: { sessionName: string };
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
}: TileGridAppProps): JSX.Element | null {
  const [sessions, setSessions] = useState<readonly TileGridSessionEntry[]>([
    ...initialSessions,
  ]);

  useEffect(() => {
    return workstationBridge.onSpawnResult((reply) => {
      if (!isSpawnSuccessReply(reply)) return;
      const sessionName = reply.result.sessionName;
      setSessions((current) => {
        // Idempotent: a duplicate spawn-result for the same sessionName
        // (e.g., re-fired by daemon recovery) does NOT create a second
        // tile.
        if (current.some((s) => s.name === sessionName)) return current;
        return [...current, { name: sessionName }];
      });
      if (onSessionMounted) onSessionMounted(sessionName);
    });
  }, [workstationBridge, onSessionMounted]);

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

  function handleDetach(_name: string): void {
    // WB11 fills in detach-to-window BrowserWindow open + status update.
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

  return (
    <TileGrid
      sessions={sessions}
      consoleBridge={consoleBridge}
      createTerminal={createTerminal}
      onKill={handleKill}
      onCollapse={handleCollapse}
      onDetach={handleDetach}
      onSwap={handleSwap}
      onResizeEnd={handleResizeEnd}
      gridOverride={initialGridOverride}
      getCurrentPixelSizes={getCurrentPixelSizes}
    />
  );
}
