# Dogfood Phase B — UI render + Fix-92 token-injection visual confirm

**Date:** 2026-05-11
**Anchor SHA:** `a600493` (MB-T-HSO-WIRE complete — WB1 through WB17)
**Scope:** observational; no production-file modification
**Build status pre-launch:** `dist/main/main.js` dated 2026-05-11 00:24; no `*.ts` src files newer than dist → reused without rebuild
**Daemon:** PID 92700 alive, port 7878, HTTP 401 auth-gate active (per Phase A liveness re-verify)

---

## I. Phase B scope

Observational verification that, post MB-T-HSO-WIRE close + v3.0 removal (WB14a-d), the Electron workstation:

1. Launches without `ERR_MODULE_NOT_FOUND` class regressions (validates WB14 v3.0 removal).
2. Mounts the renderer surfaces named in the dispatch:
   - Main BrowserWindow renderer (workstation-shell.html).
   - Chat panel (`mount.ts` auto-mount when `window.coarchitectBridge` is defined).
   - Tile grid (per MB-T12).
   - Dispatch-web embed (Fix-92 token-injection should let it auth via stored token rather than fresh login).
3. Exhibits the expected HSO pool behavior under current environmental constraints (SessionCap=5 saturated per existing tmux state).

Authoritative log: `/tmp/dogfood-phase-b-electron.log` (18 lines; not committed).

---

## II. Method

Launch invocation:

```bash
MB_TEST_HOOKS=1 pnpm --filter dispatch-workstation exec electron dist/main/main.js \
  > /tmp/dogfood-phase-b-electron.log 2>&1 &
sleep 30
pkill -P <pid>; kill <pid>; pkill -f "electron dist/main/main.js"
```

`MB_TEST_HOOKS=1` enables the main-process console-message forwarder zone (main.ts Probe-92 obs-infra) that pipes BrowserWindow renderer console output to stdout. Without it, renderer-side sentinels (`SHELL_READY`, `RENDER_OK`, `WINDOW_READY`, `TILE_GRID_MOUNTED`, `ONBOARDING_READY`) would not appear in the log.

Total observation window: 30 seconds. Teardown via SIGTERM; clean exit confirmed (`Electron exited with signal SIGTERM`; no orphan processes via post-kill `pgrep`).

---

## III. Evidence

### Sentinels observed [KNOWN per log line-by-line]

| # | Sentinel | Source | Count |
|---|---|---|---|
| 1 | `DISPATCH_MODE_IPC_MOUNTED` | main.ts MB-T24 zone | 1 |
| 2 | `WINDOW_STATE 1024 768` | window-lifecycle (initial geometry) | 1 |
| 3 | `SPLITTER_LOADED 251` | renderer (workstation-shell.html splitter init) | 1 |
| 4 | `SHELL_READY` | renderer | 1 |
| 5 | `RENDER_OK` | renderer | 1 |
| 6 | `WINDOW_READY` | renderer | 1 |
| 7 | `TILE_GRID_MOUNTED` | tile-grid renderer (MB-T12) | 1 |
| 8 | `APPROVAL_POLICY_IPC_MOUNTED` | main.ts MB-T16 zone | 1 |
| 9 | `AUTOPILOT_IPC_MOUNTED` | main.ts MB-T17 zone | 1 |
| 10 | `ONBOARDING_READY` | onboarding renderer | 1 |
| 11 | `BOOTSTRAP_TOKEN_WRITTEN 44` | main.ts Fix-92 zone | 1 |

### Sentinels NOT observed [KNOWN per `grep` of full log]

| Expected | Result |
|---|---|
| `CHAT_SHELL_MOUNTED` (per dispatch step 3) | **absent** |
| `coarchitectBridge` log entry | **absent** |
| `x-conductor-token` / `localStorage` reference | **absent** |
| `kanban` / `webview` / `dispatchweb` log entry | **absent** |

### Pool behavior [KNOWN per log]

| Sequence | Sessions affected |
|---|---|
| Initial start() spawn | 1× `__orchestrator_active` halt: `Session cap (5) reached.` |
| start() standby spawn | 1× `__orchestrator_standby` halt: same reason |
| Poll cycle (POLL_INTERVAL_MS=5000ms over ~25s post-start) | 5× additional `__orchestrator_standby` halts (one per poll) |
| **Total pool halts in 30s window** | **7** (1 active + 6 standby) |

### Errors / regressions [KNOWN per `grep -iE "ERR_|exception|stack"`]

- **Zero** `ERR_MODULE_NOT_FOUND` instances.
- **Zero** uncaught exceptions or stack traces.
- The 7 pool halts are structured halt-and-surface emissions per WB13 design (not errors); they read as `[MB-T-HSO-WIRE OrchestratorPoolManager halt]` log lines.
- Exit was SIGTERM-initiated (operator teardown), not crash.

---

## IV. Findings

### (a) Chat-shell render — ✗ **NOT confirmed via stdout**

`CHAT_SHELL_MOUNTED` sentinel from `mount.ts` auto-mount block is absent from the captured log. Three interpretations, in decreasing likelihood:

1. **[MODELED]** Chat panel is mounted INSIDE the workstation-shell.html webview/iframe context, which is a **separate render process** from the top-level workstation BrowserWindow. The `MB_TEST_HOOKS=1` console-message forwarder zone in main.ts attaches to `mainWindow.webContents` — it does not currently iterate child `<webview>` tags' webContents. So chat-shell's `console.log("CHAT_SHELL_MOUNTED")` would fire but never reach this log file. **No way to disprove visual chat-shell render from stdout-only evidence.**
2. **[SPECULATIVE]** Chat panel did not mount (e.g., `window.coarchitectBridge` undefined at script-tag-swap time). No supporting evidence for this in the log.
3. **[SPECULATIVE]** Chat panel mounted but its mount.ts never emits the sentinel string. Would require source-read of mount.ts; observational scope here precludes that.

This is the primary observability gap — **filed as a new Tier 3 followup in §V**.

### (b) Tile-grid render — ✓ **KNOWN GREEN**

`TILE_GRID_MOUNTED` sentinel observed once. Tile-grid renderer is the top-level workstation BrowserWindow renderer, so its console output IS captured by the main-window forwarder. MB-T12 wiring confirmed live.

### (c) Dispatch-web embed — ✗ **NOT confirmed via stdout**

Same observability gap as (a): dispatch-web is a `<webview>` embed in workstation-shell.html with its own renderer process. Its mount events + auth flow are not captured by the main-window forwarder. No `webview`/`kanban`/`dispatchweb` references in the log.

Cannot disprove successful render from stdout. Visual verification would require either the operator's eye on the running workstation, or extending the console-message forwarder to iterate child webContents.

### (d) Fix-92 token-injection observed — ✓ **PARTIAL (main-process write KNOWN; renderer consumption NOT observed)**

`BOOTSTRAP_TOKEN_WRITTEN 44` log line confirms the main-process Fix-92 zone wrote a 44-byte daemon token to the location it injects into the dispatch-web webview at bootstrap. **Main-process write is KNOWN per direct log evidence.**

Renderer-side consumption (`localStorage.setItem`, `x-conductor-token` HTTP header, auth bypass at dispatch-web fetch) is INSIDE the dispatch-web webview render context and not visible to the main-window forwarder. **End-to-end Fix-92 verification requires either: (i) extending the forwarder to capture webview console output, or (ii) operator visual confirmation that dispatch-web loads its kanban without showing a login prompt.**

### (e) MB-F-DISPATCH-WEB-AUTH-PERSISTENCE pre-closure verification — **INCONCLUSIVE**

The followup row asserts dispatch-web should pick up the daemon token from Fix-92's persistence layer and auth without re-prompting. Stdout evidence confirms main-process write (d above), but cannot confirm webview-side consumption. **Pre-closure verification is INCONCLUSIVE on the basis of this observation alone**; the followup row should NOT be closed by this dogfood pass without supplementary visual verification.

---

## V. New findings filed

### MB-F-DOGFOOD-WEBVIEW-CONSOLE-FORWARDER-GAP (Tier 3 — observability)

**Body:** `MB_TEST_HOOKS=1` console-message forwarder in `main.ts` (Probe-92 obs-infra zone) attaches only to the top-level `mainWindow.webContents`. Nested `<webview>` render processes (chat-shell + dispatch-web embeds inside `workstation-shell.html`) emit console output to their own per-webContents log channels, which are NOT forwarded to the main-process stdout. Result: observational dogfood passes cannot independently verify renderer-side mount sentinels for chat-shell or dispatch-web from stdout alone.

**Closure path:** extend the Probe-92 webview-console-forwarder zone in `main.ts` (currently at ~lines 210-234, gated on `MB_TEST_HOOKS=1`) to iterate all `<webview>` tags' webContents at WINDOW_READY time and attach `console-message` listeners that forward with a `[webview:<src>]` prefix. Operator-arbitrated whether to ship this as a test-hook-gated capability or extend to production logging.

**Tier 3 rationale:** Does not affect runtime correctness; only affects ability to verify renderer-side state from stdout. Operator visual verification remains the authoritative path until closure.

**Discoverability:** this row + this findings doc §IV(a) + §IV(c) + §IV(d).

### MB-F-DOGFOOD-POOL-STANDBY-RESPAWN-LOOP-UNDER-SESSIONCAP (Tier 2 — operator noise)

**Body:** When `OrchestratorPoolManager.start()` fails to spawn `__orchestrator_active` and `__orchestrator_standby` due to `SessionCapExceeded` (cap=5 reached), the pool's tmux-poll handler (POLL_INTERVAL_MS=5000ms) detects the missing standby every 5 seconds and triggers `_onStandbyCrash` → `_spawnAndRegister(RESERVED_STANDBY)` → fails again with the same `SessionCap` error. Observed loop: 7 halt-and-surface log lines (1 active + 6 standby) in a 30-second window. Each halt also emits a `coarchitect:streamError` event to the renderer's chat error banner — operator-visible spam under saturated session cap.

**Closure path:** in `OrchestratorPoolManager._onStandbyCrash`, distinguish `SessionCapExceeded` (terminal — wait for operator to free a slot) from transient spawn failures. Options: (i) check error_type before re-spawning; if `SessionCapExceeded`, set a back-off flag and emit a single halt; (ii) stop the poll timer entirely when first spawn fails with `SessionCapExceeded` and require operator action to restart. Either option avoids the 5-second halt-spam loop. Tier 2 — not a correctness bug (halts ARE halt-and-surface; no silent failure) but degrades operator UX under normal-but-saturated environments.

**Discoverability:** this row + this findings doc §III pool behavior + WB16 prior runtime-launch observation (commit `b607ed1`).

---

## VI. Workstation shutdown — **clean**

Teardown sequence:

1. `pkill -P <pid>` (kill children of background launch shell)
2. `kill <pid>` (kill launch shell)
3. `pkill -f "electron dist/main/main.js"` (catch any orphan electron child)
4. `sleep 3`
5. `pgrep -lf "electron dist/main"` → `(none)`

Log final line: `Electron exited with signal SIGTERM`. No zombie processes. No partial-shutdown state errors. Clean.

---

## Outcome classification

**Phase B: Capability enabled with known observability limitations.**

- Top-level workstation renderer end-to-end: KNOWN GREEN (10 of 11 expected main-window sentinels observed; `BOOTSTRAP_TOKEN_WRITTEN 44` confirms Fix-92 main-process write).
- Webview-embedded renderers (chat-shell + dispatch-web): NOT INDEPENDENTLY VERIFIABLE from stdout alone; observability gap filed as `MB-F-DOGFOOD-WEBVIEW-CONSOLE-FORWARDER-GAP`.
- HSO pool behavior under SessionCap saturation: KNOWN observation matches WB16 prior runtime smoke; standby-respawn loop newly characterized + filed as `MB-F-DOGFOOD-POOL-STANDBY-RESPAWN-LOOP-UNDER-SESSIONCAP`.
- v3.0 removal (WB14a-d): KNOWN STABLE — zero `ERR_MODULE_NOT_FOUND` regressions under runtime launch.
- `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` pre-closure verification: INCONCLUSIVE per stdout-only scope; closure deferred pending visual verification or webview-forwarder extension.
