# CONSOLE-T02 — halt-and-surface on `console:open` / `console:close` IPC direction

**Status:** HALT pending operator arbitration. CONSOLE-T02 implementation
work has NOT begun pending resolution; only the procedural session-start
commit (3418300) and this halt artifact have landed.

**Authority chain:**

- Frozen vision: `docs/vision/SECTION_10_CC_CONSOLE.md` §10.7 at `eac381e`
- Frozen contract: `CONDUCTOR_API_CONTRACT.md` §4.7 at `a7e8d4f` (v2.2.0)
- Ticket prompt: CONSOLE-T02 (operator-issued in this session, 2026-05-02)
- Cairn primitives: `cairn.md` halt discipline + frozen-contract respect
- Per session-prompt CAIRN DISCIPLINE: "if you encounter ambiguity in
  vision §10.7 IPC message specifications or §4.7 daemon contract
  semantics, halt and surface — do not infer"

**Date:** 2026-05-02

---

## §1 — The contradiction

### §1.1 What vision §10.7 says (frozen at eac381e)

`docs/vision/SECTION_10_CC_CONSOLE.md` §10.7 lines 105-109 enumerate the
five IPC message types with explicit directionality:

```
- `console:open`         (shell → webview) — instruct webview to open a CC-console panel bound to a specified session.
- `console:close`        (shell → webview) — instruct webview to close a CC-console panel.
- `console:send-stdin`   (webview → shell) — webview forwards operator-typed prompt to shell, shell calls daemon `POST /v3/sessions/:name/console/stdin`.
- `console:stdout-chunk` (shell → webview) — shell forwards a chunk of STDOUT bytes from the daemon WS stream to the webview for rendering.
- `console:signal`       (webview → shell) — webview requests shell to send a signal to a session's CC process.
```

`console:open` and `console:close` are documented as **shell → webview**:
the shell drives panel lifecycle and instructs the webview to render or
tear down the panel surface.

### §1.2 What the CONSOLE-T02 ticket prompt asks for

The operator-issued ticket prompt's RED cluster 1 specifies (verbatim
phrasing preserved):

```
RED cluster 1 — IPC message round-trip:
- test_console_open_message_routing.spec.ts:
    shell receives console:open from webview, asserts handler invoked
    with {sessionName} payload.
- test_console_close_message_routing.spec.ts:
    shell receives console:close, asserts cleanup invoked.
- test_console_send_stdin_routing.spec.ts:
    webview sends console:send-stdin, asserts shell forwards to daemon
    POST /v3/sessions/:name/console/stdin.
- test_console_signal_routing.spec.ts:
    webview sends console:signal, asserts shell forwards to daemon
    POST /v3/sessions/:name/console/signal.
```

`console:open` and `console:close` are described as **webview → shell**:
the shell receives them from the webview and runs side-effect handlers
(create/dispose WS, etc.).

### §1.3 Per-message reconciliation

| Message               | Vision §10.7 direction | Ticket cluster-1 direction | Match? |
|-----------------------|------------------------|----------------------------|--------|
| `console:open`        | shell → webview        | webview → shell            | **NO** |
| `console:close`       | shell → webview        | webview → shell            | **NO** |
| `console:send-stdin`  | webview → shell        | webview → shell            | yes    |
| `console:stdout-chunk`| shell → webview        | shell → webview (cluster 2)| yes    |
| `console:signal`      | webview → shell        | webview → shell            | yes    |

Two of the five message types have inverted directionality between the
frozen vision and the ticket prompt's RED cluster 1 test descriptions.
Three match.

### §1.4 Why this is not inferable

The two readings imply structurally different code:

- **Vision-aligned (shell → webview):** `console:open` is dispatched via
  `webContents.send('console:open', payload)` from the main process; the
  webview registers a listener via `ipcRenderer.on` (or a contextBridge
  subscription wrapper). The operator's "open console" trigger lives
  somewhere shell-side — Electron menu item, spawn-flow follow-on, etc.

- **Ticket-aligned (webview → shell):** `console:open` is dispatched via
  `ipcRenderer.send('console:open', payload)` from the renderer; the
  main process registers `ipcMain.on('console:open', ...)`. The
  operator's "open console" trigger lives webview-side — likely a
  button on a session card in the embedded `dispatch-web` kanban that
  the contextBridge routes through `window.consoleBridge.open(name)`.

Choosing one without operator arbitration would either (a) write code
that contradicts a frozen vision section (forbidden per CAIRN DISCIPLINE
"frozen contract respect" + the explicit halt-discipline clause in the
session prompt) or (b) write code that contradicts the ticket scope
the operator explicitly issued.

---

## §2 — Three plausible resolutions for operator

### §2.1 (a) Vision is authoritative; reframe the tests

CONSOLE-T02 keeps `console:open` and `console:close` as
**shell → webview** per §10.7. The RED cluster 1 tests for those two
messages invert their assertion shape:

- `test_console_open_message_routing.spec.ts` becomes
  "main calls a `dispatchConsoleOpen({sessionName})` API → assert the
  webview's `consoleBridge.onOpen` listener fires with the payload"
  (verified via a sentinel forwarded back through preload).
- Similarly for `close`.

Operator-side trigger for "open a console panel" is left to CONSOLE-T03
or a future ticket (e.g., a session-card "Open console" button in the
webview kanban that uses some OTHER message — perhaps re-uses
`console:send-stdin` initial state, or a not-yet-defined
`console:open-request` that needs a contract amendment).

Pros: respects frozen vision; no contract amendment.
Cons: leaves the open/close USER trigger underspecified for v3.0.
This may force a subsequent vision §10.7 amendment anyway when
CONSOLE-T03 lands and discovers it needs a webview→shell trigger.

### §2.2 (b) Ticket is authoritative; vision §10.7 amendment first

`console:open` and `console:close` are amended to **webview → shell**
in vision §10.7 (operator-only authoring per §3.4). After the amendment
lands, CONSOLE-T02 proceeds as written.

Rationale would be that the natural UX flow is: operator clicks "Open
console" on a session card in the webview kanban → webview sends
`console:open` to shell → shell creates WS to daemon + tells webview
to render the panel (via either a different shell→webview message,
e.g., `console:panel-rendered`, or an out-of-band response to the open
request).

Pros: matches operator's stated intent in the ticket; matches the
natural webview-driven UX.
Cons: contract amendment required before CONSOLE-T02 can proceed;
operator-only territory; extra coordination latency.

### §2.3 (c) Both directions are needed; expand the message-type set

The set of five message types in vision §10.7 is incomplete: a complete
panel lifecycle needs both a webview-driven request ("operator wants to
open a console for session X") AND a shell-driven render instruction
("here's the panel context, render it"). Vision §10.7 currently
captures only the latter.

Amend vision §10.7 to add e.g. `console:open-request` (webview → shell)
and keep `console:open` (shell → webview) as render instruction. Same
for close. CONSOLE-T02 implements both.

Pros: most complete model; matches both vision and ticket simultaneously.
Cons: largest contract amendment; potential for over-engineering in
v3.0; operator-only territory.

---

## §3 — What this halt does NOT cover

- Choice between (a)/(b)/(c) — operator-only arbitration per §3.4.
- The `console:send-stdin`, `console:stdout-chunk`, and `console:signal`
  message-type implementations are NOT halted; they match between
  vision and ticket. However, since CONSOLE-T02 ships the four red
  clusters as a coherent unit and cluster 1 contains all four
  routing tests, holding the entire ticket pending arbitration is
  cleaner than splitting into "cluster 1a / cluster 1b" and shipping
  half.
- WORKSTATION_CONTRACT.md §7 is also relevant (existing IPC surface).
  No action proposed against it; whatever resolution operator picks
  for vision §10.7 may also imply a `WORKSTATION_CONTRACT.md` §7
  follow-on amendment per vision §10.7's own self-description as
  "WORKSTATION_CONTRACT.md amendment surface".

---

## §4 — Pending operator action

1. Pick (a), (b), or (c) above (or a fourth option not enumerated here).
2. If (b) or (c): author the vision §10.7 amendment per §3.4.
3. Resume CONSOLE-T02 in a future session with the ambiguity removed.

This session ends gracefully after this halt commits. No CONSOLE-T02
implementation, no test files, no `console-ipc.ts`, no `consoleBridge`
preload additions land in this session.
