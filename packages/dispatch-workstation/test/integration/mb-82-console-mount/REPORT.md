# MB-#82 ConsolePanel-mount probe — REPORT.md

**Branch:** `sess-3/probe-additions`
**Cut from:** `main` HEAD `af0ac36`
**Probe commit:** `4151d78` (`green(probe-add): MB-#82 ConsolePanel mounts in shell after openPanel IPC`)
**Last individual-mode run:** 2026-05-05
**Aggregate result:** **1 / 1 PROBE PASS** (1 / 1 case, ~2s wall-clock)

Closes gap §4.1 #1 from `docs/probe-coverage-gap-analysis-2026-05-05.md`:
"#82 — ConsolePanel actually mounts in webview after IPC (GAP). fix-82
probes stop at the IPC channel; the renderer-side React mount is
unverified."

## §1 Suite identity

- **1 probe file**: `probe-01-console-panel-mounts.test.ts` (~360 LOC).
- **1 darwin-gated test case**: single-spawn SHELL_EVAL roundtrip.
- Consumes the SHELL_EVAL stdin seam shipped in commit `88daa41`
  (`green(probe-add): SHELL_EVAL stdin handler for shell DOM probes`).

## §2 Per-probe result

| # | Probe | Result | Evidence class | Test file |
|---|---|---|---|---|
| 1 | ConsolePanel mounts in shell after openPanel IPC | PASS in ~2s | KNOWN | `probe-01-console-panel-mounts.test.ts` |

### Probe 1 — ConsolePanel mounts in shell after openPanel IPC — PASS

**Asserts (all green this run):**
- `window.consoleBridge` exposed by preload contextBridge.
- `[data-testid="console-tile-region"]` style.display === `'block'`
  (shell HTML inline `onConsoleOpen` handler flipped it; line 548-550
  of `workstation-shell.html`).
- `[data-testid="console-panel-root"]` exists (auto-mount baseline;
  console-panel renderer.js loaded and mount.ts:87 ran).
- `[data-testid="console-panel-header"]` exists (post-bind branch;
  console-panel.tsx:129 — empty branch only renders
  `console-panel-empty`).
- `console-panel-header` `<span>` text contains the synthetic session
  name (proves IPC payload routing + React state binding).

**Mechanism:** SHELL_EVAL drives `window.consoleBridge.openPanel(<synthetic>)`
fire-and-forget. The IPC handler at `console-ipc.ts:155` emits
`emitToWebview('console:open', { sessionName })` SYNCHRONOUSLY before
calling `connectSocket` (line 157), so the renderer's mount path
(both shell HTML's tile-region toggle and console-panel renderer's
React state update) fires before the WS connect attempt fails on
the invalid daemon URL.

The eval body:
```js
(async () => {
  if (!window.consoleBridge) return { error: 'no-consoleBridge', ... };
  window.consoleBridge.openPanel(<sessionName>).catch(() => {});
  // poll up to 5s for tile-region display='block'
  while (Date.now() < deadline) {
    const tr = document.querySelector('[data-testid="console-tile-region"]');
    if (tr && tr.style.display === 'block') break;
    await new Promise(r => setTimeout(r, 50));
  }
  // snapshot DOM
  return { tileRegionDisplay, hasConsolePanelRoot, hasConsolePanelHeader,
           hasConsolePanelEmpty, headerSpanText, ... };
})()
```

**This run (individual-mode, 2026-05-05):** PASS in ~2s wall-clock.
Settling completed in well under the 5s poll deadline; tile-region
toggle + React state bind observed before the SHELL_EVAL_RESULT
returned.

**Evidence class:** KNOWN end-to-end. The renderer DOM observation
proves: (1) preload contextBridge wired, (2) IPC channel
`'console:open-panel'` reachable, (3) ConsoleIpcController mount-side
emitToWebview reaches both subscribers (shell inline handler +
console-panel renderer), (4) React component transitions from empty
to bound branch with the IPC payload's session name.

**Catches regressions:**
- Preload contextBridge breaking `window.consoleBridge` exposure
  (assertion 1).
- `console:open` IPC not reaching shell HTML's onConsoleOpen handler
  (assertion 2 — display still 'none').
- console-panel renderer.js bundle not auto-mounting (assertion 3 —
  console-panel-root absent).
- React state machine not transitioning empty → bound on
  console:open (assertion 4 — console-panel-header absent).
- IPC payload routing dropping the session name (assertion 5 —
  header span empty or wrong).

**Defense-in-depth:**
- `FOXWORKS_DAEMON_URL=invalid://` neutralizes daemon-side races
  (Fix-C bootstrap fetch + console-ipc connectSocket both fail
  immediately without polluting the probe window).
- Synthetic session name with timestamp suffix avoids collisions.
- userData isolated to tmpdir.
- Onboarding completed seeded so the first-launch gate short-
  circuits silently.

## §3 SHELL_EVAL seam consumption

This probe is the FIRST consumer of the SHELL_EVAL stdin seam shipped
in commit `88daa41`. The seam is byte-for-byte parallel of KANBAN_EVAL
(main.ts:548-577) but targets `mainWindow?.webContents` instead of
`kanbanWebContents`. Probe build verified the seam works end-to-end:

- `SHELL_EVAL p82|<async-IIFE>` written to stdin
- `mainWindow.webContents.executeJavaScript(code, true)` resolved
  with the IIFE's return value
- `SHELL_EVAL_RESULT p82 {"ok":true,"result":{...}}` emitted to
  stdout

No bugs surfaced in the seam itself. Operator arbitration B2
(SHELL_EVAL-driven, no separate OPEN_CONSOLE_PANEL handler) saved
~15 LOC of source.

## §4 What's verified — KNOWN evidence catalog

### §4.1 Preload contextBridge (`src/main/preload.mts`)

`window.consoleBridge` exposed; this probe is the first integration-
level proof that the bridge object reaches the shell renderer
(unit-tests at `test/unit/console-t02/` cover the factory shape but
not the contextBridge wiring).

**Confidence:** KNOWN.

### §4.2 IPC `console:open-panel` channel (`console-ipc.ts:429-432`)

Renderer `consoleBridge.openPanel(name)` invokes `console:open-panel`
which routes to `ConsoleIpcController.openConsolePanel(sessionName)`
(line 133-158). Mount-side `emitToWebview('console:open', ...)` fires
synchronously before connectSocket.

**Confidence:** KNOWN.

### §4.3 Shell HTML tile-region toggle (`workstation-shell.html:546-554`)

`window.consoleBridge.onConsoleOpen` handler flips
`#console-tile-region` `style.display` from `'none'` to `'block'`.

**Confidence:** KNOWN.

### §4.4 Console-panel renderer auto-mount + state bind

`console-panel/mount.ts:87` mounts on shell-load (auto-mount path).
The mounted component subscribes to `consoleBridge.onConsoleOpen`
and updates session binding on incoming events; transition from
empty branch (line 122-124) to bound branch (line 129+) verified.

**Confidence:** KNOWN.

### §4.5 What is NOT verified at this probe

- **xterm `<canvas>` rendering inside ConsolePanel** — gap analysis
  §4.1 #1 ALSO calls out "no probe asserts xterm `<canvas>` or DOM
  presence inside ConsolePanel post-mount". Out of P1 scope; would
  require either a real session with stdout flowing OR a synthetic
  stdout-chunk IPC injection. Filed as a follow-up in the aggregate
  REPORT.
- **Per-action stdin/signal contract** — covered by the
  `console-bridge` factory unit tests (test/unit/console-t02/).
- **PanelCapExceeded path** — covered by console-ipc unit tests.

## §5 Findings filed during probe development

**None.** The renderer-side mount path behaves per the design
documented in main.ts comments (Console mount sentinel region) and
console-mount.ts module header. The probe is a pure regression net.

## §6 Hash / commit references

| Commit | Body |
|---|---|
| `88daa41` | `green(probe-add): SHELL_EVAL stdin handler for shell DOM probes` |
| `56435af` | `green(probe-add): MB-T08 onboarding end-to-end probe` |
| `aa2171f` | `docs(probe-add): mb-t08-onboarding REPORT.md aggregate` |
| `32a549c` | `green(probe-add): MB-T05 tmux session existence probe` |
| `fcfe4b6` | `docs(probe-add): mb-t05-spawn-tmux REPORT.md aggregate` |
| `f1df785` | `green(probe-add): T1 cold-launch composite probe` |
| `8ee0bb1` | `docs(probe-add): t1-cold-launch-composite REPORT.md aggregate` |
| `4151d78` | `green(probe-add): MB-#82 ConsolePanel mounts in shell after openPanel IPC` |
| this commit | `docs(probe-add): mb-82-console-mount/REPORT.md` |

P1 closes gap §4.1 #1 (GAP → covered). Branch advance:
`af0ac36 → 88daa41 → 56435af → aa2171f → 32a549c → fcfe4b6 → f1df785 → 8ee0bb1 → 4151d78 → this`.
