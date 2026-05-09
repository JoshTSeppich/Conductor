# MB-T40 Findings — Chat-Panel PTY Refactor

**Terminal:** Z  
**Date:** 2026-05-09  
**Commits:** `f41a42e` (WB1 RED) → `3b794dd` (WB2 GREEN) → `5aca470` (WB2-followup main.ts wiring)  
**Outcome:** Improved (capability enabled; PTY relay and chat-panel wired for production)

---

## I. What Shipped

MB-T40 refactors the chat-panel streaming path from an AnthropicChatClient-backed preload bridge to a PTY relay architecture where the active orchestrator's PTY output drives the chat panel directly.

### New files

- **`packages/dispatch-workstation/src/main/pty-stream-relay.ts`** — `registerPtyRelay({ broadcaster, getWebContents, outerQuiescenceMs? })` → `() => void` disposer. Main-process relay: subscribes to `IConsoleBroadcaster.addStdoutObserver`, filters `__orchestrator_active`, forwards per-chunk via `coarchitect:ptyChunk`, fires `coarchitect:ptyTurnDone` on outer quiescence (default 3000ms) or on `parseActionMarker` fast-path completion. No Electron import surface — testable in happy-dom isolation.
- **`packages/dispatch-workstation/src/coarchitect/pty-streaming-bridge.ts`** — `PtyStreamingBridgeImpl` class implements `StreamingBridge` interface (chat-panel.tsx). Mirrors relay accumulator pattern for renderer-side / test context. `sendAndStream` → `ipcRenderer.invoke('workstation:session-send-prompt', { sessionName: '__orchestrator_active', ... })`. `onStreamError` is a no-op stub per A3 ratification.

### Modified files

- **`packages/dispatch-workstation/src/main/coarchitect-ipc.ts`** (lines 30–31 import, lines 244–255 export): Added `import { registerPtyRelay, type IConsoleBroadcaster }` and `export function wirePtyRelay(broadcaster)` — single `registerPtyRelay(...)` call; no inline relay logic.
- **`packages/dispatch-workstation/src/main/main.ts`** (line 14 import, lines 440–445 sentinel zone): Added `wirePtyRelay` to coarchitect-ipc import; `wirePtyRelay(consoleController)` called after `consoleController = registerConsoleIpcHandlers(...)` (line ~437). Activation deferred from WB2 due to initialization order; landed at WB2-followup.
- **`packages/dispatch-workstation/src/main/preload.mts`** (lines 10–37 post-edit): Channel rebindings per A3: `sendAndStream` → `ipcRenderer.invoke('workstation:session-send-prompt', ...)` (was: `ipcRenderer.send('coarchitect:sendAndStream')`); `onStreamChunk` → `coarchitect:ptyChunk` (was: `coarchitect:streamChunk`); `onStreamDone` → `coarchitect:ptyTurnDone` (was: `coarchitect:streamDone`); `onStreamError` → no-op stub (was: `coarchitect:streamError` listener).
- **`packages/dispatch-workstation/src/coarchitect/chat-panel.tsx`** (lines 85–102 post-edit): `onStreamDone(text)` handler changed from `daemonClient.fetchHistory().then(setHistory)` to `setHistory(prev => [...prev, { role:'assistant', content:text, ... }])`. Mount-time `fetchHistory()` call unchanged.
- **`packages/dispatch-workstation/test/unit/coarchitect/probe-11-pty-stream-relay.spec.ts`**: WB1 `undefined` stubs replaced with production imports; dead-code guards removed.
- **`packages/dispatch-workstation/test/unit/chat-shell/probe-03-chat-panel-integration.spec.tsx`**: Test (4) renamed and commented per Q-MBT40-6 disposition; assertions unchanged (all three subscriptions retained per A3).

---

## II. Q-MBT40 Dispositions

| Q | Disposition | Resolution |
|---|---|---|
| Q-MBT40-1(a-revised) | PtyStreamingBridge satisfies StreamingBridge; relay in main-process module separate from coarchitect-ipc.ts | A4 re-arbitration α |
| Q-MBT40-2(a) | Hardcoded `__orchestrator_active` session name filter in relay | Encoded in pty-stream-relay.ts + pty-streaming-bridge.ts |
| Q-MBT40-3(a) | Hardcoded `__orchestrator_active` IPC target in `sendAndStream` | Encoded in pty-streaming-bridge.ts + preload.mts |
| Q-MBT40-4(c) | Plain bubble fallback for action markers; ptyTurnDone payload carries reconstructed `[ACTION:type]...[/ACTION]` text | Encoded in pty-stream-relay.ts + pty-streaming-bridge.ts |
| Q-MBT40-5(a) | Per-chunk streaming + configurable outer quiescence (default 3000ms) | Encoded; configurable via `outerQuiescenceMs` dep |
| Q-MBT40-6(a)/(c) | fetchHistory on mount only; NOT called after turn finalization | chat-panel.tsx onStreamDone direct push |

---

## III. Ambiguity Ratifications

| ID | Ratification | Implementation |
|---|---|---|
| A1 | PTY relay in main process; renderer-side PtyStreamingBridgeImpl as thin StreamingBridge impl | α — separate files (see A4) |
| A2 | onStreamDone pushes directly to history state; no fetchHistory on done path | chat-panel.tsx lines 85–102 |
| A3 | Retain onStreamError as no-op stub returning no-op disposer | preload.mts + PtyStreamingBridgeImpl.onStreamError |
| A4 | ~~Inline in coarchitect-ipc.ts~~ → **re-arbitrated α: separate files** | coarchitect-ipc.ts has 15+ transitive Electron deps (ipcMain, BrowserWindow, app, webContents, AnthropicChatClient, DaemonClient, etc.) blocking happy-dom isolation. Separate-file pattern enables unit testing without the full IPC surface. Mirrors peer-summary-harvester.ts placement (testable module separated from IPC handlers). Caught at WB1 probe authoring; operator re-arbitrated at HALT-WB1 before WB2. |

---

## IV. Probe Distribution — 11/11 GREEN

| Probe | What It Exercises | Status |
|---|---|---|
| 01 | `registerPtyRelay`: `__orchestrator_active` chunk → `ptyChunk` forwarded; other sessions filtered | ✓ |
| 02 | `registerPtyRelay`: 3 chunks → 3 ptyChunk events; `ptyTurnDone` NOT fired within quiescence window | ✓ |
| 03 | `registerPtyRelay`: outer quiescence fires → `ptyTurnDone` carries accumulated text; buffer reset | ✓ |
| 04 | `registerPtyRelay`: complete action marker → immediate `ptyTurnDone` (fast-path); buffer reset | ✓ |
| 05 | `registerPtyRelay`: partial action marker → `null` → no early `ptyTurnDone` | ✓ |
| 06 | `PtyStreamingBridgeImpl.sendAndStream` → `ipcRenderer.invoke('workstation:session-send-prompt', ...)` | ✓ |
| 07 | `onStreamDone(text)` → history push directly; `fetchHistory` NOT called after turn | ✓ |
| 08 | `registerPtyRelay.dispose()` clears outer timer; `ptyTurnDone` NOT fired after dispose | ✓ |
| 09 | `sendAndStream` does NOT fire `coarchitect:sendAndStream` (AnthropicChatClient regression guard) | ✓ |
| 10 | Model-agnostic regression: ChatPanel renders in tab-content; chrome preserved (EXPECTED GREEN at WB1) | ✓ |
| 11 | `PtyStreamingBridgeImpl.start()` registers `addStdoutObserver`; `dispose()` removes subscription | ✓ |

Consumer non-regression: chat-shell 47/47; full coarchitect suite 76/76 (incl. peer-summary-harvester 13/13).

---

## V. Architecture Notes

### wirePtyRelay initialization order

main.ts call order in `app.whenReady()` callback:
- Line ~382: `registerIpcHandlers()` — `consoleController` is `null` at this point
- Line ~437: `consoleController = registerConsoleIpcHandlers({ getWebContents: () => mainWindow?.webContents ?? null })`
- Line 444: `wirePtyRelay(consoleController)` ← MB-T40 insertion
- Line ~468: `createWindow()` — PTY sessions start flowing after this

Wiring at line 444 is before any PTY output flows; safe. Dispatch authoring drift catch (see §VI).

### AnthropicChatClient preservation

`AnthropicChatClient` class is intact in `coarchitect-ipc.ts`. The `coarchitect:sendAndStream` IPC handler is retained. `chat-panel.tsx` no longer reaches `AnthropicChatClient` via `sendAndStream` (preload.mts now routes to `workstation:session-send-prompt`). Operator-arbitrated removal at v3.5 ship per BUILD doc. Followup: `MB-F-MBT40-ANTHROPIC-CHAT-CLIENT-REMOVAL`.

### ChunkAccumulator pattern reuse

`pty-stream-relay.ts` outer-quiescence + `parseActionMarker` fast-path is a structural copy of the ChunkAccumulator pattern introduced in `peer-summary-harvester.ts` at MB-T39 WB2 (`bb4c47c`). The inline pattern mirrors successfully; potential extraction tracked at `MB-F-CHUNK-ACCUMULATOR-EXTRACTION`.

---

## VI. Documentation Drift Acknowledgments

1. **dispatch §3.4 WB2 step 1** ("Remove AnthropicChatClient streamMessages subscription") — actual refactor surface was the StreamingBridge abstraction layer, not a direct AnthropicChatClient import in chat-panel.tsx. chat-panel.tsx already consumed the `StreamingBridge` interface; refactor target was preload.mts binding swap + StreamingBridge wiring. Class preserved. Caught at HALT 0 PF-2.

2. **dispatch §1** ("render as MB-T07 OrchestratorCard — existing card surface, NOT new") — conflicted with Q-MBT21-7=a precedent (no cross-package imports from dispatch-web). Revised to Q-MBT40-4(c): plain bubble fallback; `MB-F-MBT40-ACTION-MARKER-CARD-RENDERING` filed.

3. **dispatch §3.4 WB2 missing main.ts wirePtyRelay call** — dispatch §3.4 step (3) listed the `wirePtyRelay` export to `coarchitect-ipc.ts` but did not name the corresponding `wirePtyRelay(consoleController)` call in `main.ts` as a separate step. Caught at HALT-WB2; operator authorized 2-line activation as in-scope at HALT-WB2 cleared. Filed as PF-finding in this doc.

4. **A4 inline ratification** — HALT 1 ratified A4 as "Inline in coarchitect-ipc.ts." Caught at WB1 probe authoring: coarchitect-ipc.ts has 15+ Electron transitive deps blocking happy-dom isolation. Separate-file option (α) re-arbitrated at HALT-WB1 before WB2.

---

## VII. Consumer Non-Regression

| Suite | Tests | Status |
|---|---|---|
| `test/unit/coarchitect/` | 76 | ✓ all GREEN |
| `test/unit/chat-shell/` | 47 | ✓ all GREEN |
| peer-summary-harvester (within coarchitect) | 13 | ✓ all GREEN |

---

## VIII. WB3 Skip Rationale

After WB2 + WB2-followup: `pty-stream-relay.ts` and `pty-streaming-bridge.ts` mirror the same accumulator pattern intentionally (different contexts: main-process broadcast vs. renderer-side/test StreamingBridge). No refactor surface identified that would improve correctness or testability without scope expansion. WB3 skipped.

---

## IX. New Followups Filed

| ID | Tier | Summary |
|---|---|---|
| `MB-F-MBT40-ACTION-MARKER-CARD-RENDERING` | Tier 3 | Q-MBT40-4(c) deferral; richer card UI for action markers |
| `MB-F-MBT40-PTY-MESSAGE-PERSISTENCE` | Tier 2 | A2 deferral; PTY messages not persisted to daemon DB |
| `MB-F-MBT40-PTY-STREAM-ERROR-WIRING` | Tier 3 | A3 deferral; stream-close → onStreamError mapping |
| `MB-F-MBT40-ANTHROPIC-CHAT-CLIENT-REMOVAL` | Tier 2 | AnthropicChatClient class + handler preserved; removal at v3.5 ship |
| `MB-F-CHUNK-ACCUMULATOR-EXTRACTION` | Tier 3 | Pattern duplication between pty-stream-relay.ts + peer-summary-harvester.ts |
