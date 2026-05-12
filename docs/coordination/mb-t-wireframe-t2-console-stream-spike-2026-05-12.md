# MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE — WB2 SPIKE ADR

**Date:** 2026-05-12
**Spike subject:** `console:stdout-chunk` lifecycle question (ticket §2.5)
**Spike method:** source-trace through `ConsoleIpcController` + bridge wiring (internal-code spike per CLAUDE.md §2.1 anti-fabrication + §2.8 spike-before-code)
**Ticket:** MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE (body at `30ab109`)
**Decided at HEAD:** `fcf0c65` (post-WB1 RED commit)

---

## §1 — Question

Does `console:stdout-chunk` fire for a session whose PTY is streaming, even if no separate `console:open-panel` window has been opened, or is the underlying observer wired only when something subscribes to a session?

The ticket §2.5 enumerated three possible outcomes:

1. **Listener-only**: chunks flow on selection (TerminalStream subscribes via `consoleBridge.onStdoutChunk` and gets per-session-filtered chunks immediately).
2. **OpenPanel-gated**: chunks flow only after `openPanel(sessionName)` is invoked; TerminalStream must call `openPanel` on mount.
3. **No-existing-subscribe-affordance**: a new IPC (`console:subscribe-session(name)`) is required → `WORKSTATION_CONTRACT.md §6` amendment per CLAUDE.md §2.4.

Outcome 3 escalates to operator-arbitrated frozen-surface amendment.

---

## §2 — Source trace [KNOWN]

### §2.1 — Where `console:stdout-chunk` is emitted

`packages/dispatch-workstation/src/main/console-ipc.ts:350` (inside `handleWsMessage`):

```ts
this.emitToWebview('console:stdout-chunk', {
  sessionName,
  stdoutSeq,
  bytes,
  encoding,
});
```

`handleWsMessage` is invoked solely by the `'message'` event on the WebSocket established by `wireSocket` (line 282-284):

```ts
sock.on('message', (raw: string) => {
  this.handleWsMessage(sessionName, raw, state);
});
```

### §2.2 — Where the WebSocket is opened

`wireSocket` (line 277) is called only by `connectSocket` (line 255):

```ts
private connectSocket(sessionName: string, state: PanelState): void {
  const url = this.daemonClient.streamUrl(sessionName);
  const sock = this.wsFactory(url);
  state.socket = sock;
  this.wireSocket(sessionName, sock, state);
}
```

`connectSocket` is called from THREE sites, all of which require `openConsolePanel` to have run first:

1. **`openConsolePanel(sessionName)`** at line 224:
   ```ts
   this.panels.set(sessionName, state);
   this.emitToWebview('console:open', { sessionName });
   this.connectSocket(sessionName, state);  // ← first WS subscription
   ```
2. **`testReconnectNow`** at line 248 — test seam; only fires if `state.reconnectPending`, which is set by `scheduleReconnect`, which itself only fires after a prior WS close (i.e., after `openConsolePanel` already ran once).
3. **`scheduleReconnect`** at line 317 — same chain as `testReconnectNow`.

### §2.3 — Where `console:open-panel` (IPC) is invoked from

`console:open-panel` IPC handler at `console-ipc.ts:498-501` routes to `controller.openConsolePanel`.

`grep -rn "openPanel\|openConsolePanel\|console:open-panel"` over `packages/dispatch-workstation/src/` returns **one** production caller of the underlying controller method:

- `main.ts:349`:
  ```ts
  onOpen: (sessionName) => {
    void consoleController?.openConsolePanel(sessionName).catch(() => {
      /* Swallow PanelCapExceeded / PanelAlreadyOpen here — the menu UI
       * disables items at cap. Surfacing a dialog is a future UX pass. */
    });
  ```
  This is the **native menu** "CC Console > Open <name>" handler.

No auto-open-on-spawn path exists. No renderer code currently calls `consoleBridge.openPanel`. The `ConsolePanel` React component (`console-panel/console-panel.tsx`) passively SUBSCRIBES to `console:open` + `console:stdout-chunk` events and waits — it does NOT trigger opens.

### §2.4 — Conclusion

`console:open` AND `console:stdout-chunk` events fire ONLY after `openConsolePanel(sessionName)` is invoked. **OUTCOME 2** from §2.5 enumeration is selected by the source.

---

## §3 — Implication for T2 WB2 GREEN

`TerminalStream` MUST invoke `consoleBridge.openPanel(targetSessionName)` on mount (and on `targetSessionName` change) to establish the WS subscription. The bridge method is already exposed (`console-bridge.ts:67` + `preload.mts:262-278`); NO new IPC channel; NO `WORKSTATION_CONTRACT.md §6` amendment.

### §3.1 — Error-handling pattern (precedent at main.ts:349-352)

`openConsolePanel` throws two named errors:
- `PanelAlreadyOpen` (line 202-205) — if `this.panels.has(sessionName)` already.
- `PanelCapExceeded` (line 207-211) — if `this.panels.size >= this.panelCap`.

Existing precedent at `main.ts:349-352` swallows both via `.catch(() => {})`. T2 adopts the same pattern:

```ts
useEffect(() => {
  consoleBridge.openPanel(targetSessionName).catch(() => {
    /* PanelAlreadyOpen (another surface already opened this session)
       and PanelCapExceeded (operator hit the cap) are non-fatal here:
       in both cases the WS subscription either already exists (chunks
       still flow) or the operator must close a panel first (operator-
       facing UX is the native menu cap surface — out of T2 scope). */
  });
  // ... onStdoutChunk subscription per ConsolePanel precedent
}, [consoleBridge, targetSessionName]);
```

### §3.2 — Lifecycle on selection-change

When the operator selects a different session in Frame C SessionList:
- React re-runs the useEffect with the new `targetSessionName`.
- TerminalStream invokes `openPanel(newSession)` — either succeeds (new WS) or throws `PanelAlreadyOpen` (panel already exists; chunks already flow).
- TerminalStream does NOT call `closePanel(previousSession)` — closing the panel kills the WS subscription, which would break any other surface (e.g., tile-grid `ConsolePanel`) that subscribes to the same session. Panels persist; cap-management is operator-facing menu territory.
- Listener cleanup-fn from prior `onStdoutChunk` registration fires (effect cleanup) — listener leak prevention.

### §3.3 — Cap-management UX risk (Tier 3 followup candidate)

If operator selects N distinct sessions in Frame C SessionList and the panel cap is M < N, the (N-M+1)st selection fails `openPanel` silently. UX surface: TerminalStream renders the root testid but no chunks flow. WB13 smoke validates against the default panel cap (per `DEFAULT_PANEL_CAP` in `main.ts`); file Tier 3 `MB-F-T2-PANEL-CAP-AWARE-UX` at WB14 if cap-management surfacing is operator-desired.

### §3.4 — Fixture-maintenance gap surfaced

`test/unit/console-t03/fake-console-bridge.ts:68-82` constructs the fake `ConsoleBridge` object WITHOUT `openPanel` — predates the Fix-C / cairn finding #82 addition of `openPanel` to the production interface (`console-bridge.ts:67`). WB2 GREEN adds `openPanel: async () => {}` to the fake as a single-line additive fixture-maintenance fix; CONSOLE-T03 tests do not use `openPanel` so this is non-impacting.

---

## §4 — Frozen-surface scope confirmation

| Surface | Touched? | Why |
|---|---|---|
| `WORKSTATION_CONTRACT.md §6` | NO | Reuses existing `console:open-panel` + `console:stdout-chunk` channels. |
| `REGISTRY.md §2` | NO | No registry binary change. |
| `CONDUCTOR_API_CONTRACT.md` | NO | Daemon contract unchanged. |
| `packages/dispatch-core/src/v3/schema.ts` | NO | No cross-package schema change. |

§6 amendment escalation (outcome 3) is NOT triggered. WB2 GREEN proceeds under DEFAULT envelope.

---

## §5 — HALT-WB2-PRE-COMMIT surface to operator

Per ticket §4 WB2 acceptance: surface for operator review of:
- Spike outcome (this document — OUTCOME 2 confirmed).
- GREEN implementation diff (`frame-c/terminal-stream.tsx` + `fake-console-bridge.ts` single-line fixture-maintenance addition).
- Confirmation that no §6 amendment escalation needed.

Awaiting operator ack.

---

**Confidence label per CLAUDE.md §2.2:** all §2 claims are `[KNOWN]` from direct source read of `console-ipc.ts:200-368`, `console-bridge.ts:1-99`, `main.ts:335-360`, `preload.mts:262-278`, `console-panel/console-panel.tsx:82-126`. §3.3 cap-management UX is `[MODELED]` — speculation about operator workflow; needs WB13 smoke validation. §3.4 fixture-maintenance gap is `[KNOWN]` from direct read of `fake-console-bridge.ts:68-82`.
