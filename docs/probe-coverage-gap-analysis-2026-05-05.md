# Probe coverage gap analysis — v3.0 ship-gate paths

**Date:** 2026-05-05
**Repo:** `/Users/joshuatseppich/Desktop/Automata/foxworks-dispatch`
**Branch:** `main` HEAD `c834fdf`
**Mode:** Read-and-surface only. NO test additions, source edits, or findings doc edits.
**Goal:** Identify operator-experiential paths lacking probe coverage so dogfood becomes optional rather than required.

**Confidence labels used throughout:**
- **KNOWN** — verified by directly reading the test/source file
- **MODELED** — inferred from REPORT.md, commit history, or section-level structure without reading every line
- **SPECULATIVE** — hypothesis without concrete evidence (flagged prominently)

---

## §1 Probe inventory — per-probe assertion table

### §1.1 fix-* probe directories

#### fix-82-verification (5 probes + REPORT.md → all PASS)

| # | Filename | Assertion | Evidence | Coverage scope |
|---|---|---|---|---|
| 01 | `probe-01-source-and-build-wiring.test.ts` | `subscribeConsoleMenuToDaemon` exports + main.ts sentinel + `console:open-panel` channel in dist + bridge factory wiring | file-content | KNOWN — Fix-C sentinel wiring, bootstrap fetch symbol presence |
| 02 | `probe-02-bootstrap-fetch-fires.test.ts` | Bootstrap GET `/v2/sessions` fires exactly once at app-ready with token header | spawned-electron (darwin) | KNOWN — initial menu population |
| 03 | `probe-03-ws-trigger-debounce.test.ts` | WS event burst (5 events / 100ms) collapses to ≤2 GET hits via 150ms debounce | spawned-electron (darwin) | KNOWN — debounce refinement |
| 04 | `probe-04-bridge-openpanel-surface.test.ts` | `consoleBridge.openPanel` factory exposes IPC channel + preload contextBridge wiring + unit test cross-ref | file-content + behavioral | KNOWN — IPC roundtrip surface |
| 05 | `probe-05-menu-rebuild-cross-ref.test.ts` | Lexical-ordering proof of `refreshConsoleMenu` invocation; cross-ref to fix-89 | file-content + cross-ref | KNOWN — fail-loud rename detection |

#### fix-83-verification (5 probes + REPORT.md → all PASS)

| # | Filename | Assertion | Evidence | Coverage scope |
|---|---|---|---|---|
| 01 | `probe-01-source-and-build-wiring.test.ts` | `attachSpawnResultListener` exports + preload `onSpawnResult` + shell DOM handler emits sentinels + main.ts sentinel + dist bundles | file-content | KNOWN — IPC channel + listener helper wiring |
| 02 | `probe-02-bridge-surface-cross-ref.test.ts` | Preload wires `onSpawnResult` with cleanup-fn return; cleanup removes via `ipcRemoveListener`; preload.cjs bundles; ≥5 unit-test cross-refs | file-content + behavioral | KNOWN — listener seam contract |
| 03 | `probe-03-spawn-result-error-daemon-unreachable.test.ts` | Daemon unreachable (port 1) cap-check fails → `SPAWN_RESULT_ERROR DaemonUnreachable` emitted | spawned-electron (darwin) | KNOWN — error path + IPC envelope |
| 04 | `probe-04-spawn-result-ok-live-daemon.test.ts` | Live daemon: spawn modal → submit → `SPAWN_RESULT_OK <name>`; cleanup via PATCH | spawned-electron (darwin, loud-skip) | KNOWN — success path + daemon integration |
| 05 | `probe-05-banner-sentinel-chained.test.ts` | Lexical-ordering: `showSpawnResultBanner` precedes console.log sentinels; asymmetric dismiss timers | file-content + cross-ref | KNOWN — banner UX execution; **assertion is on source-text ordering, not on rendered DOM** |

#### fix-84-verification (6 probes + REPORT.md → 13/16 executed; 3 loud-skipped)

| # | Filename | Assertion | Evidence | Coverage scope |
|---|---|---|---|---|
| 01 | `probe-01-defect-a-wiring.test.ts` | `bootstrapApiKey` exports + env-precedence guard + main.ts sentinel ordering + dist + ≥4 unit cross-refs | file-content | KNOWN — Defect A wiring + ordering invariant |
| 02 | `probe-02-defect-a-noop-when-env-set.test.ts` | App boots with API key pre-set, no ciphertext; `ONBOARDING_READY` fires; no auth_error during boot | spawned-electron (darwin) | KNOWN — env-precedence idempotence |
| 03 | `probe-03-defect-a-end-to-end-live.test.ts` | Two-boot pattern: seed ciphertext → boot 2 verifies safeStorage decrypt → env populate → chat `STREAM_DONE` (not auth_error) | spawned-electron (darwin, loud-skip) | KNOWN — safeStorage roundtrip |
| 04 | `probe-04-defect-b-wiring.test.ts` | `build-doc-state.stateDir()` chain ordering: `MB_BUILD_DOC_STATE_DIR` → `MB_WORKSTATION_USERDATA` → `MB_APP_USERDATA` → `app.getPath('userData')`; dist bundles; ≥3 unit cross-refs | file-content | KNOWN — Defect B wiring + fallback chain |
| 05 | `probe-05-defect-b-userdata-fallback-orchestrator.test.ts` | `stateDir` resolves via `app.getPath('userData')`; build-doc seeded; orchestrator system prompt loads; `STREAM_DONE` emits `output_type ∈ {action, card, multi-choice-card}` (not text) | spawned-electron (darwin, loud-skip) | KNOWN — userData fallback + structured output |
| 06 | `probe-06-defect-b-card-emission-manual.test.ts` | Router branches on card output_type; coarchitect-ipc emits `orchestrator-card-rendered`; card-ipc/wiring wire audit-row path | file-content + manual (`it.skip`) | KNOWN — wiring is asserted; **actual card render is MANUAL with operator-step in REPORT.md** |

#### fix-89-menu-rebuild (1 probe, no REPORT.md)

| # | Filename | Assertion | Evidence | Coverage scope |
|---|---|---|---|---|
| 01 | `probe-01-menu-rebuild-propagates.test.ts` | `REFRESH_CONSOLE_MENU` stdin → AppleScript introspection of macOS menu bar via System Events → asserts rebuilt session names appear | spawned-electron (darwin) | KNOWN — finding #89 OS-level cache reattachment validation |

#### fix-92-verification (9 probes + REPORT.md → all PASS)

| # | Filename | Assertion | Evidence | Coverage scope |
|---|---|---|---|---|
| 01 | `probe-01-token-file-precondition.test.ts` | `~/.foxworks-dispatch/token` exists, mode 0o600, non-empty | file-content | KNOWN — operator-state precondition |
| 02 | `probe-02-daemon-precondition.test.ts` | Live daemon GET `/v2/sessions` 200 with token; non-200 without | behavioral | KNOWN — daemon HTTP integration |
| 03 | `probe-03-build-artifact-bootstrap-wiring.test.ts` | `dist/main/card-bridge.cjs` contains `'workstation:get-daemon-token'` IPC channel + `'x-conductor-token'` localStorage key | file-content | KNOWN — esbuild string-literal preservation |
| 04 | `probe-04-ipc-handler-reachable.test.ts` | `BOOTSTRAP_TOKEN_WRITTEN <length>` sentinel fires; length matches disk file trimmed length | spawned-electron (darwin) | KNOWN — IPC handler registration + preload setItem |
| 05 | `probe-05-kanban-localstorage-populated.test.ts` | `localStorage['x-conductor-token']` length + SHA-256 prefix match disk file | behavioral (KANBAN_EVAL) | KNOWN — localStorage write verification |
| 06 | `probe-06-no-tokenprompt-connected.test.ts` | Cold-launch DOM: no TokenPrompt heading; no "Connecting to daemon" status; kanban columns rendered | behavioral (KANBAN_EVAL) | KNOWN — useAuthBootstrap connected state |
| 07 | `probe-07-daemon-connectivity-from-webview.test.ts` | Webview `fetch('/v2/sessions')` with localStorage token returns 200 + valid `sessions[]` JSON | behavioral (KANBAN_EVAL) | KNOWN — end-to-end webview→daemon roundtrip |
| 08 | `probe-08-race-condition-timing.test.ts` | TokenPrompt absent at `BOOTSTRAP_TOKEN_WRITTEN` time AND 2.5s later; forensic wall-clock deltas | behavioral | KNOWN — cold-launch race observation |
| 09 | `probe-09-tokenprompt-fallback-intact.test.ts` | When token absent: `BOOTSTRAP_TOKEN_WRITTEN` does NOT fire AND TokenPrompt IS rendered | spawned-electron (darwin) | KNOWN — fallback path preservation |

### §1.2 Non-fix probe directories

| Filename | Assertion | Evidence | Coverage scope |
|---|---|---|---|
| `coarch-t02/chat-input-emits-event.test.ts` | `TYPE_AND_SEND` stdin → daemonClient.postMessage → `MESSAGE_SENT <content>` sentinel | spawned-electron | KNOWN — chat input → daemon postMessage |
| `coarch-t02/chat-panel-renders.test.ts` | React ChatPanel mounts in sandboxed renderer → `RENDER_OK` within 15s | spawned-electron | KNOWN — chat panel React mount |
| `coarch-t03/self-check-renders.spec.ts` | `MB_MOCK_ANTHROPIC_RESPONSE=self_check` → `STREAM_DONE` fires without crash | spawned-electron | KNOWN — §10.5 self-check block streams |
| `coarch-t03/streaming-renders.spec.ts` | `MB_MOCK_ANTHROPIC=1` → `STREAM_START` then `STREAM_DONE` after `TYPE_AND_SEND` | spawned-electron | KNOWN — streaming sentinel chain |
| `mb-t02/webview-loader-callable.test.ts` | `loadDispatchWeb(win)` callable; `WEBVIEW_LOAD_ATTEMPTED` sentinel; exit 0 | spawned-electron | KNOWN — webview-loader callable surface |
| `mb-t03/window-state-persists.test.ts` | Two-spawn cycle: RESIZE → quit → relaunch → `WINDOW_STATE` matches resized dims | spawned-electron | KNOWN — window state persistence |
| `mb-t04/spawn-modal-emits-intent.test.ts` | `FILL_AND_SUBMIT_SPAWN <repo>\|<name>` → `SPAWN_REQUESTED <json>` with payload | spawned-electron | KNOWN — modal IPC emit |
| `mb-t04/spawn-modal-opens.test.ts` | `CLICK_SPAWN_BUTTON` → `SPAWN_MODAL_OPENED` sentinel | spawned-electron | KNOWN — modal open visibility |
| `zipper-2/splitter-persists.test.ts` | Two-spawn: `SAVE_SPLITTER 350` → `SPLITTER_SAVED 350` → relaunch → `SPLITTER_LOADED` with 350 | spawned-electron | KNOWN — splitter state persistence |
| `zipper-2/wrapper-renders.test.ts` | `workstation-shell.html` loads → `SHELL_READY` → `RENDER_OK` from chat panel | spawned-electron | KNOWN — wrapper-shell mount |
| `app-launches-clean.test.ts` | App spawns Electron, opens BrowserWindow (`WINDOW_READY`), exits code 0 on QUIT | spawned-electron | KNOWN — basic launch + quit |
| `orchestrator-output-router-imports.test.ts` | Raw Node ESM dynamic import of `dist/main/orchestrator-output-router.js` succeeds (`IMPORT_OK`) | file-content (subprocess Node) | KNOWN — module resolution under Electron-mimicking ESM |

### §1.3 Aggregate counts

- **Total probes/tests in test/integration:** 27 (5 + 5 + 6 + 1 + 9 = 26 fix-* + 12 non-fix + 2 top-level − overlap)
- Wait — recount: 5 (82) + 5 (83) + 6 (84) + 1 (89) + 9 (92) + 2 (coarch-t02) + 2 (coarch-t03) + 1 (mb-t02) + 1 (mb-t03) + 2 (mb-t04) + 2 (zipper-2) + 2 (top-level) = **38 test files**
- Evidence distribution: ~14 file-content/cross-ref, ~21 spawned-electron, ~3 behavioral-only, 1 manual-loud-skip
- Darwin-gated: all spawned-electron probes (~21)

---

## §2 Operator-experiential path inventory

### §2.1 Findings (Tier 1+2; KNOWN from `docs/cairn-findings.md`)

| ID | Tier | Area | Operator path |
|---|---|---|---|
| #82 | 2 | Console panel accessibility | Operator clicks "CC Console > [session]" in native menu → IPC fires → ConsolePanel mounts in shell drawer → xterm appears → operator sees stdout |
| #83 | 1 | Spawn end-to-end feedback | Operator submits spawn modal → tmux session created OR error → banner shows visible feedback |
| #84-A | 1 | API key bootstrap | Operator launches workstation → `process.env.ANTHROPIC_API_KEY` populated from safeStorage → chat works |
| #84-B | 1 | Build-doc state dir | Operator with valid API key → orchestrator system prompt loads → cards emit on prompt |
| #68 | 1 | Web UI URL config | Operator runs `pnpm dev:all` → workstation loads from Vite dev server (5173), not bundled dist |
| #71 | 1 | Kanban auth persistence | Operator launches → kanban shows no "Daemon unreachable" banner; auth survives across launches |
| #92 | 1 | Cold-launch kanban auth | Operator launches → kanban renders without TokenPrompt; daemon token bootstrapped to localStorage |
| #69 | 2 | Dev orchestration | Operator runs ONE command → daemon + Vite + workstation start in correct order |
| #70 | 2 | Port collision (IPv4/IPv6) | Operator launches daemon → only one process binds 7878 → no health-check intermittency |
| #94 | 2 | CC spawn permission mode | Orchestrator-spawned CC sessions inherit operator approval gate → no per-action prompts |

### §2.2 Ticket acceptance criteria (KNOWN from V3_TICKETS.md)

| Ticket | Operator path |
|---|---|
| MB-T01 | Empty workstation window opens via `pnpm dev`; packageable |
| MB-T02 | Embedded dispatch-web kanban renders columns (AWAITING REVIEW / STALE / RUNNING / IDLE) with control buttons + live event ticker |
| MB-T03 | Native File/Edit/View/Window menus; Cmd+W close, Cmd+Q quit; window state restores |
| MB-T04 | Spawn button → modal opens; repo picker + session name input; Spawn/Cancel buttons fire |
| MB-T05 | Spawn intent emit → tmux session in `tmux ls` → daemon registers → kanban shows new card |
| MB-T06 | Header session count; spawn button disables at cap; hover-reason tooltip; override modal |
| COARCH-T01 | `/v3/orchestrator/*` endpoints work round-trip; schema migration applies |
| COARCH-T02 | Chat panel renders with history; input → send → daemon persistence; history survives restart |
| COARCH-T03 | Anthropic SDK + streaming progressive in panel; API key secure; clean error surface |
| COARCH-T04 | Build-doc upload + stateless context routing (action / card / multi-choice / escape) |
| MB-T07 | Kanban-card render with Approve/Decline + free-form text; audit row written; multi-choice persists; stale → STALE column |
| MB-T08 | Onboarding modal → API key + project list config → workstation usable; daemon-offline / Anthropic-outage / invalid build-doc error states |

### §2.3 main.ts sentinel regions (KNOWN from grep + read of main.ts)

| Region | Operator behavior |
|---|---|
| Fix-A api-key-bootstrap | safeStorage decrypt → process.env at startup → chat IPC works |
| Fix-C console-trigger | Native "CC Console" menu populates from daemon /v2/sessions (bootstrap + WS-debounced refresh); click → console:open-panel IPC |
| Fix-92 webview-token-bootstrap | Daemon token read from disk → kanban localStorage written via cross-context preload IPC |
| Probe-92 obs-infra | MB_TEST_HOOKS=1 + MB_USER_DATA_DIR → tmpdir userData; KANBAN_EVAL stdin handler runs JS in webview |
| Fix-B spawn-result-subscription | workstation:spawn-result IPC → showSpawnResultBanner DOM (success 3s auto-dismiss / error persists) |
| Fix-89 menu-rebuild test hook | REFRESH_CONSOLE_MENU stdin → refreshConsoleMenu → Menu.setApplicationMenu(null) precursor → setApplicationMenu(newMenu) → AppleScript-introspectable |
| Card wiring (MB-T07) | orchestrator-card-rendered IPC → executeJavaScript → dispatch-web kanban mounts orchestrator-card |
| Console mount (Session C) | mountConsoleTileGrid wires tile-open/close events → ConsolePanel visibility synced |

### §2.4 Dogfood tests T1/T4/T5/T11/T12/T17/T18 (MODELED — operator-driven mental tests, not codified)

| Test | Operator assertions |
|---|---|
| **T1** cold-launch | window opens; SHELL_READY; kanban columns visible; CC Console menu enumerates daemon sessions; no TokenPrompt; no "Daemon unreachable" banner |
| **T4** spawn end-to-end | spawn modal → fill → submit → SPAWN_RESULT_OK with name; tmux ls includes new session; daemon /v2/sessions registers; kanban shows new card |
| **T5** orchestrator card flow | session spawned → chat input → STREAM_START + STREAM_DONE; orchestrator system prompt injected; if build-doc: card renders in kanban OR multi-choice in panel; else passthrough |
| **T11** kill tmux mid-spawn | spawn begins → tmux server SIGKILL → SPAWN_RESULT_ERROR with SpawnFailed type; no ghost daemon entry; error banner persists |
| **T12** kill daemon mid-flight | session live → daemon SIGKILL → operator interaction → IPC error surfaces in UI; not silent hang; restart-and-retry works |
| **T17** cold-launch + cleared userData | userData wiped → onboarding modal appears → API key entry → ONBOARDING_COMPLETE → next boot succeeds without onboarding |
| **T18** menu rebuilds with new session | T1 done (0 sessions menu) → T4 spawns → menu CC Console submenu enumerates new session name; click → console:open-panel fires |

---

## §3 Coverage diff per operator-experiential path

For each path, classification: **FULL / PARTIAL / GAP / MANUAL**. PARTIAL/GAP rows name the specific missing assertion.

### §3.1 Findings paths

| Path | Class | Concrete missing assertion |
|---|---|---|
| #82 — bootstrap fetch + WS debounce | **FULL** | (fix-82 probes 02, 03 cover) |
| #82 — consoleBridge.openPanel IPC surface | **FULL** | (fix-82 probe 04) |
| #82 — menu rebuild propagates to OS menu bar | **FULL** | (fix-89 probe-01 darwin) |
| **#82 — ConsolePanel actually mounts in webview after console:open-panel** | **GAP** | KNOWN: no probe asserts that after `consoleBridge.openPanel(name)` IPC fires, the ConsolePanel React component mounts in the webview DOM with the right session name. Probes stop at the IPC channel; the renderer-side mount is unverified |
| **#82 — xterm renders inside ConsolePanel after mount** | **GAP** | KNOWN: no probe asserts xterm `<canvas>` or DOM presence inside ConsolePanel post-mount |
| #83 — listener wiring + cleanup contract | **FULL** | (fix-83 probes 01, 02) |
| #83 — error path (DaemonUnreachable) → SPAWN_RESULT_ERROR | **FULL** | (fix-83 probe 03) |
| #83 — success path → SPAWN_RESULT_OK | **FULL** | (fix-83 probe 04 darwin) |
| **#83 — banner DOM renders with operator-readable text + auto-dismiss timing** | **PARTIAL** | KNOWN: probe-05 asserts source-text lexical ordering of `showSpawnResultBanner` call; no probe reads the rendered DOM banner element nor verifies the 3000ms success / 0ms error dismiss timers in actual UI |
| #84-A — API key bootstrap wiring | **FULL** | (fix-84 probes 01, 02) |
| #84-A — safeStorage encrypt/decrypt roundtrip | **FULL** | (fix-84 probe 03 darwin) |
| #84-B — userData fallback chain | **FULL** | (fix-84 probes 04, 05) |
| **#84-B — actual orchestrator card emits on prompt** | **MANUAL** | KNOWN: probe 06 is `it.skip` with operator-step in REPORT.md. LLM emit is non-deterministic at model boundary |
| **#68 — Web UI URL dev/prod env-var override** | **GAP** | KNOWN: no probe directory exists for #68. No probe asserts `WORKSTATION_WEB_URL` or similar override loads Vite dev server at 5173 vs bundled dist |
| #71 — Kanban auth persistence across launches | **MODELED FULL** | MODELED: fix-92 probes 06-09 cover the cold-launch path; #71 root issue (auth-session bridge gap) appears to be subsumed by fix-92 token bootstrap. SPECULATIVE that #71 is fully closed by #92 — no explicit fix-71-verification dir exists. (Worth confirming with operator) |
| #92 — daemon token cold-launch bootstrap (full chain) | **FULL** | (fix-92 9 probes — exemplary coverage) |
| **#69 — `pnpm dev:all` orchestration single-command** | **GAP** | KNOWN: no probe directory. SPECULATIVE that this is even a probe-suitable surface (developer experience, not runtime). Likely better as harness-level documentation than probe |
| **#70 — IPv4/IPv6 daemon port binding stability** | **GAP** | KNOWN: no probe. System-level network state, hard to make deterministic; could be a probe that asserts daemon listens on exactly one stack |
| **#94 — orchestrator-spawned CC sessions inherit approval mode** | **GAP** | KNOWN: no probe asserts spawned CC subprocess command-line includes `--dangerously-skip-permissions` or equivalent flag |

### §3.2 Ticket paths

| Ticket | Class | Concrete missing assertion |
|---|---|---|
| MB-T01 — basic launch + quit | **FULL** | (`app-launches-clean.test.ts`) |
| MB-T02 — kanban columns render | **PARTIAL** | KNOWN: `mb-t02/webview-loader-callable.test.ts` asserts loader callable + `zipper-2/wrapper-renders.test.ts` asserts `RENDER_OK` sentinel. **No probe asserts the four column headers (AWAITING REVIEW / STALE / RUNNING / IDLE) actually appear in DOM.** fix-92 probe-06 reaches kanban DOM but only asserts column-presence-as-bool, not column labels |
| MB-T03 — native menu (File/Edit/View/Window) | **PARTIAL** | KNOWN: fix-89 probe-01 covers `CC Console` submenu via AppleScript. **No probe asserts File/Edit/View/Window top-level menus exist.** Cmd+W close + Cmd+Q quit keybindings → GAP (no probe) |
| MB-T03 — window state persistence | **FULL** | (`mb-t03/window-state-persists.test.ts`) |
| MB-T04 — spawn modal opens + emits intent | **FULL** | (`mb-t04/*.test.ts`) |
| MB-T05 — spawn end-to-end (tmux ls + daemon /v2/sessions) | **PARTIAL** | KNOWN: fix-83 probe-04 emits `SPAWN_RESULT_OK <name>` with cleanup PATCH. **No probe runs `exec tmux ls` to assert tmux session actually exists**; success is trusted via IPC sentinel only. **No probe asserts daemon /v2/sessions includes the new session entry independently** (probe trusts the IPC envelope) |
| MB-T05 — kanban shows new spawn card | **GAP** | KNOWN: no probe drives kanban refresh after spawn and asserts new card mounts. SPECULATIVE that this is reachable via KANBAN_EVAL after fix-83 probe-04's success |
| **MB-T06 — cap enforcement UI** | **GAP** | KNOWN: fix-83 probe-03 covers cap-block as `DaemonUnreachable` IPC error. **No probe asserts**: header session count display, spawn-button disabled state at cap, hover-reason tooltip text, override-modal mount + confirm flow |
| COARCH-T01 — daemon /v3/orchestrator/* round-trip | **MODELED FULL** | MODELED: covered by daemon-side tests in `packages/dispatch-daemon/` (out of workstation probe scope) |
| COARCH-T02 — chat panel renders + history | **PARTIAL** | KNOWN: `coarch-t02/chat-panel-renders.test.ts` covers mount; `chat-input-emits-event.test.ts` covers send. **No probe asserts conversation history loads from daemon on mount**; **No probe asserts history survives app restart** (would need 2-spawn cycle pattern like mb-t03) |
| COARCH-T03 — Anthropic streaming + clean error surface | **PARTIAL** | KNOWN: `coarch-t03/streaming-renders.spec.ts` + `self-check-renders.spec.ts` cover happy path with mock. **No probe asserts**: rate_limit error rendered in UI; auth_error rendered in UI; mid-stream throw rendered in UI. fix-84 covers the auth_error path indirectly via `STREAM_DONE` not firing, but no probe asserts the error surface text |
| COARCH-T04 — build-doc upload + routing | **PARTIAL** | KNOWN: fix-84 probe-05 covers structured-output routing; probe-06 manual for actual card render. **GAP**: no probe asserts the multi-choice-card panel render path; no probe asserts escape-block copy-to-clipboard surface |
| MB-T07 — kanban-card Approve/Decline + audit row | **GAP** | KNOWN: fix-84 probe-04 covers card-ipc audit-write wiring. **No probe asserts**: Approve click → action fires AND audit row written; Decline click → card dismissed AND decline-reason logged; multi-choice → choice persists for next call; stale card → moves to STALE column |
| **MB-T08 — onboarding flow** | **GAP** | KNOWN: stdin handlers `ONBOARDING_NEXT / ONBOARDING_API_KEY / ONBOARDING_DONE` exist in main.ts; sentinels `ONBOARDING_REQUIRED / ONBOARDING_STEP_API_KEY / ONBOARDING_API_KEY_SAVED / ONBOARDING_COMPLETE` exist. **No probe drives the onboarding flow end-to-end**: clean userData → ONBOARDING_REQUIRED → enter key → SAVED → next-boot succeeds without ONBOARDING_REQUIRED |
| MB-T08 — daemon-offline error banner | **GAP** | KNOWN: fix-83 probe-03 emits `DaemonUnreachable` over IPC but no probe asserts the red banner UI element renders with daemon-offline text |
| MB-T08 — Anthropic-outage error toast | **MANUAL** | KNOWN: depends on real Anthropic outage to surface; can be MOCKED via mid-stream throw (similar to my coarchitect-ipc unit test pattern) but full UI toast assertion is GAP |
| MB-T08 — invalid build-doc validation error | **GAP** | KNOWN: no probe asserts that uploading a schema-invalid build doc surfaces a validation error in the UI |

### §3.3 Sentinel-region paths

(Most reduce to findings/tickets above. Standalone sentinel paths:)

| Region | Class | Concrete missing assertion |
|---|---|---|
| Probe-92 obs-infra (KANBAN_EVAL) | **FULL** | (used by fix-92 probes 05-09; covers itself) |
| Console mount (Session C wiring) | **PARTIAL** | KNOWN: `mountConsoleTileGrid` wired but **no probe asserts** the tile region actually toggles `display:block` on `console-tile:show` and `display:none` on `console-tile:hide`. unit-tested at the factory level but no integration probe walks the full IPC → tile-region-DOM-toggle flow |

### §3.4 Dogfood test paths

| Test | Class | Concrete missing assertion |
|---|---|---|
| **T1 — cold-launch + kanban + CC Console menu (one-shot)** | **PARTIAL** | KNOWN: distributed across `app-launches-clean` (basic launch), fix-92 probes 06-09 (no TokenPrompt + kanban DOM), fix-82 probes 02-03 (menu populates). **No single probe asserts T1's full path in one spawn.** SPECULATIVE that recombining existing assertions in one probe would catch interaction bugs that distributed probes miss |
| T4 — spawn end-to-end | **PARTIAL** | (Same as MB-T05 above) |
| T5 — orchestrator card flow | **PARTIAL/MANUAL** | (Same as MB-T07/COARCH-T04 — wiring covered, actual emit MANUAL) |
| **T11 — kill tmux mid-spawn** | **GAP** | KNOWN: no probe injects `kill -9` against tmux server mid-spawn and asserts SPAWN_RESULT_ERROR fires with appropriate type. SPECULATIVE that `MB_TEST_HOOKS_KILL_TMUX_AFTER_MS=200` style env-var hook could make this deterministic |
| **T12 — kill daemon mid-flight** | **GAP** | KNOWN: no probe kills daemon mid-IPC and asserts UI surface. SPECULATIVE that a probe could spawn its own daemon, confirm IPC works, kill it, then assert the next IPC fails with surface text |
| **T17 — cold-launch + cleared userData (onboarding)** | **GAP** | (Same as MB-T08 — ONBOARDING stdin handlers exist but no probe drives them) |
| T18 — menu rebuilds with new session | **PARTIAL/FULL** | KNOWN: fix-82 probe-03 covers WS-debounced refresh + fix-89 probe-01 covers OS menu propagation. **No probe asserts the combined production path**: fix-82 uses the bootstrap+debounce trigger; fix-89 uses the REFRESH_CONSOLE_MENU stdin trigger. SPECULATIVE that the production path (WS event → debounce → fetch → refreshConsoleMenu → menu propagation) has no end-to-end probe |

---

## §4 Gap summary — ranked by ship-gate proximity

### §4.1 Top GAP/PARTIAL items (highest ship-gate proximity)

1. **#82 — ConsolePanel actually mounts in webview after IPC** (GAP) — Core operator-experiential path. fix-82 probes stop at IPC channel; the renderer-side React mount is unverified. Operator-blocking if the renderer wiring breaks.

2. **#83 — banner DOM renders with operator-readable text** (PARTIAL) — fix-83 probe-05 is source-text lexical ordering, not actual DOM observation. A renderer-side regression that breaks DOM banner rendering would not be caught by current probes.

3. **MB-T08 — onboarding flow end-to-end** (GAP) — Stdin handlers + sentinels are wired but no probe drives the full path. T17 dogfood test is the operator's only safety net against cleared-userData regressions.

4. **MB-T05 — tmux session actually exists in `tmux ls` after spawn** (PARTIAL) — fix-83 probe-04 trusts SPAWN_RESULT_OK sentinel; no independent `exec tmux ls` assertion. A failed-spawn-but-IPC-reports-OK regression would slip through.

5. **MB-T06 — spawn cap enforcement UI** (GAP) — Header session count, button disabled state, override modal are all unprobed. Cap-block was the diagnosed root of fix-83's silent-modal-close finding; UI feedback regression risk persists.

### §4.2 Secondary GAP/PARTIAL items

6. MB-T05 — kanban shows new spawn card (GAP) — composable from existing KANBAN_EVAL pattern.

7. MB-T03 — File/Edit/View/Window top-level native menus (PARTIAL) — only CC Console submenu probed.

8. MB-T03 — Cmd+W close, Cmd+Q quit keybindings (GAP).

9. T11 — kill tmux mid-spawn → typed error surface (GAP) — needs new MB_TEST_HOOK timer-injection or signal hook.

10. T12 — kill daemon mid-flight → UI error surface (GAP) — could be probed by spawning own daemon and killing it.

11. COARCH-T03 — error surface (rate_limit / auth_error / mid-stream throw) renders in UI text (PARTIAL).

12. COARCH-T02 — chat history loads on mount + survives restart (PARTIAL).

13. MB-T08 — invalid build-doc validation error UI (GAP).

14. MB-T08 — daemon-offline red banner UI text (GAP) — only IPC envelope is probed via fix-83.

15. T1 — cold-launch one-shot composite probe (PARTIAL) — distributed across many specs; combined end-to-end probe would catch interaction bugs.

16. MB-T07 — kanban-card Approve/Decline + audit row (GAP).

17. Console mount tile-region display toggle (PARTIAL) — unit-tested at factory; no probe walks IPC→DOM-toggle.

18. #94 — orchestrator-spawned CC has `--dangerously-skip-permissions` flag (GAP).

19. MB-T08 — Anthropic-outage error toast (MANUAL but mockable for routing assertion).

20. T18 — production-path WS-event → menu propagation end-to-end (PARTIAL).

### §4.3 Lower-priority gaps (developer-experience or system-level)

21. #68 — Web UI URL dev/prod env-var override (GAP) — better as harness-level smoke than probe.
22. #69 — `pnpm dev:all` orchestration (GAP) — SPECULATIVE that this is probe-shaped at all.
23. #70 — IPv4/IPv6 daemon port stability (GAP) — system network state; deterministic-only with explicit binding assertion.

---

## §5 Proposed probe additions (one per GAP/PARTIAL)

For each, table format: probe shape, evidence type, ~LOC, dependencies (test-hooks needed, env-vars, MB_TEST_HOOKS gating).

### Tier 1 ship-gate-proximate (top 5 from §4.1)

| # | Path | Probe shape | Evidence | LOC | Deps |
|---|---|---|---|---:|---|
| P1 | #82 ConsolePanel mounts in webview | Spawn app, REFRESH_CONSOLE_MENU, KANBAN_EVAL invokes `window.consoleBridge.openPanel('alpha')` (or stdin OPEN_CONSOLE_PANEL hook), KANBAN_EVAL polls for `[data-testid="console-panel"]` element with `data-session="alpha"`. Assert mount within timeout | spawned-electron + KANBAN_EVAL | ~120 | NEW stdin hook `OPEN_CONSOLE_PANEL <name>` (or extend KANBAN_EVAL into shell webview, not kanban) — likely needs new ConsoleBridge accessor in the SHELL webview, not kanban. **HALT-POTENTIAL: may need bridge surface refactor** |
| P2 | #83 banner DOM renders with text | Spawn app, force SPAWN_RESULT_ERROR via fix-83 probe-03 path, KANBAN_EVAL `document.querySelector('[data-testid=spawn-result-banner]').textContent` matches /DaemonUnreachable/. Optional: assert auto-dismiss timing for success case (poll element absence after 3s) | spawned-electron + KANBAN_EVAL | ~80 | KANBAN_EVAL targets shell webview (not kanban). May need shell-side eval seam |
| P3 | MB-T08 onboarding end-to-end | Spawn 1: empty userData, await ONBOARDING_REQUIRED, drive ONBOARDING_NEXT → ONBOARDING_API_KEY → ONBOARDING_DONE, assert ONBOARDING_COMPLETE + `~/Library/Application Support/.../config.json` written. Spawn 2: same userData, assert NO ONBOARDING_REQUIRED, app launches normally | spawned-electron, two-spawn cycle | ~150 | existing ONBOARDING stdin handlers; add probe to drive them; userData isolation via `MB_USER_DATA_DIR` |
| P4 | MB-T05 tmux session in `tmux ls` after spawn | Continue from fix-83 probe-04 happy path; after SPAWN_RESULT_OK, `execSync('tmux ls')` and assert session name appears; cleanup `tmux kill-session -t <name>` in afterAll | spawned-electron + subprocess exec | ~60 | none (extends existing fix-83 probe-04 pattern) |
| P5 | MB-T06 cap enforcement UI | Spawn app, KANBAN_EVAL on shell webview reads `[data-testid=session-count]` text + `[data-testid=spawn-button]` disabled attribute. Drive: pre-populate daemon with N=cap sessions before app spawn; assert button disabled, count = N; click → assert override modal appears | spawned-electron + KANBAN_EVAL | ~140 | NEW: shell-side KANBAN_EVAL equivalent (today only kanban webview is reachable via KANBAN_EVAL); pre-cap-fixture helper |

### Tier 2 (gaps 6-15)

| # | Path | Probe shape | Evidence | LOC | Deps |
|---|---|---|---|---:|---|
| P6 | MB-T05 kanban shows new spawn card | Continue from P4; after SPAWN_RESULT_OK, KANBAN_EVAL polls kanban DOM for `[data-session=<name>]` card element | spawned-electron + KANBAN_EVAL | ~50 | existing KANBAN_EVAL |
| P7 | MB-T03 File/Edit/View/Window menus exist | AppleScript introspection (extending fix-89 probe-01 pattern) of full menu bar; assert each top-level label present | spawned-electron + AppleScript (darwin) | ~70 | existing AppleScript helper from fix-89 |
| P8 | MB-T03 Cmd+W / Cmd+Q keybindings | Spawn app; AppleScript `tell application 'System Events' to keystroke 'w' using command down`; assert window count drops; same for Cmd+Q + exit code 0 | spawned-electron + AppleScript (darwin) | ~70 | AppleScript helper |
| P9 | T11 kill tmux mid-spawn | NEW MB_TEST_HOOK env: `MB_TEST_HOOKS_KILL_TMUX_AFTER_MS=200`. spawn-handler reads, `setTimeout(() => execSync('tmux kill-server'))`. Probe asserts SPAWN_RESULT_ERROR with SpawnFailed type within window | spawned-electron + injected hook | ~100 + ~10 src hook | **REQUIRES SOURCE EDIT to spawn-handler** — operator-arbitrated authorization |
| P10 | T12 kill daemon mid-flight | Probe spawns its own dispatch-daemon subprocess, sets FOXWORKS_DAEMON_URL, confirms IPC works, kills daemon, observes next IPC error sentinel | spawned-electron + spawned daemon | ~150 | none (subprocess management) |
| P11 | COARCH-T03 error surface text | Use existing MB_MOCK_ANTHROPIC pattern; new mock response `MB_MOCK_ANTHROPIC_RESPONSE=rate_limit` that throws `RateLimitError` mid-stream. Assert STREAM_ERROR sentinel + KANBAN_EVAL on chat panel finds error-toast text | spawned-electron + mock | ~100 | NEW mock case in coarchitect-ipc.ts MOCK_RESPONSES — small src extension |
| P12 | COARCH-T02 chat history persistence | Two-spawn: spawn 1 sends MESSAGE_SENT, spawn 2 reads chat panel DOM, asserts message present | spawned-electron + KANBAN_EVAL | ~80 | existing |
| P13 | MB-T08 invalid build-doc validation error | Drive build-doc upload via stdin (NEW HOOK or KANBAN_EVAL) with malformed YAML; assert validation error toast text | spawned-electron + new hook | ~100 + ~10 src hook | NEW: BUILD_DOC_UPLOAD stdin or evaluate-equivalent |
| P14 | MB-T08 daemon-offline banner UI | Like P2 but assert banner text via KANBAN_EVAL | spawned-electron + KANBAN_EVAL | ~50 | bundled with P2 |
| P15 | T1 cold-launch one-shot composite | Single spawn that combines: app-launches-clean (WINDOW_READY) + fix-92 probes 06-09 (no TokenPrompt + kanban renders) + fix-82 probe-02 (menu populates). All in one app spawn, asserting the composite end state | spawned-electron + KANBAN_EVAL + AppleScript | ~120 | none new |

### Tier 3 (gaps 16-20)

| # | Path | Probe shape | Evidence | LOC | Deps |
|---|---|---|---|---:|---|
| P16 | MB-T07 Approve/Decline + audit row | Driven by mock-emitted card (use COARCH-T03 mock pattern with card output_type); KANBAN_EVAL clicks Approve button; asserts daemon /v3/orchestrator/audit POST received via spy daemon or daemon log inspection | spawned-electron + spawned daemon + KANBAN_EVAL | ~200 | mock card emit + spy daemon |
| P17 | Console-mount tile-region display toggle | Spawn app, KANBAN_EVAL on shell webview reads `#console-tile-region.style.display`; drive console-tile:show via mock IPC; assert display flips | spawned-electron + KANBAN_EVAL on shell | ~80 | shell-side KANBAN_EVAL (shared with P1) |
| P18 | #94 spawned CC has skip-permissions flag | After fix-83 probe-04 success, `execSync('tmux send-keys -t <session> "ps -ef \| grep claude" Enter')`, then `tmux capture-pane`, assert command line contains `--dangerously-skip-permissions` | spawned-electron + tmux capture | ~80 | none |
| P19 | MB-T08 Anthropic-outage error toast (mockable for routing) | New mock case `MB_MOCK_ANTHROPIC_RESPONSE=outage` emits Anthropic-shaped 503 error mid-stream; assert error-toast text in panel | spawned-electron + mock | ~80 | NEW mock case |
| P20 | T18 production-path WS-event → menu propagation | Drive a real `/v2/events/stream` event (need spy daemon or daemon helper that emits an arbitrary event); assert AppleScript-introspection of menu after debounce window | spawned-electron + spawned daemon + AppleScript | ~150 | spawned daemon |

### Lower-priority Tier 4 (gaps 21-23)

| # | Path | Recommendation |
|---|---|---|
| P21 | #68 Web UI URL override | SPECULATIVE: better as harness smoke + unit test of webview-loader env-var read; not probe-shaped |
| P22 | #69 `pnpm dev:all` | Not probe-shaped; better as documented `pnpm dev:all` script + smoke |
| P23 | #70 IPv4/IPv6 port stability | Probe-shaped: assert daemon listen socket count via `lsof -i :7878` after daemon start; one-line assertion |

### LOC + dependency summary

- **Tier 1** (P1-P5): ~550 LOC, possibly 1-2 source-side test-hook seams (shell-side KANBAN_EVAL equivalent, OPEN_CONSOLE_PANEL stdin)
- **Tier 2** (P6-P15): ~890 LOC, possibly 2-3 source-side test-hook seams (kill-tmux timer, build-doc upload hook, mock case extensions)
- **Tier 3** (P16-P20): ~590 LOC, possibly 1-2 source-side test-hook seams (mock case extensions, spy daemon)
- **Total** estimated probe LOC: ~2,030
- Source-side seam additions (operator-arbitrated): ~6-8 small additions, all MB_TEST_HOOKS=1 gated. Total ~50-100 LOC of source.

---

## §6 MANUAL items — should remain operator-driven

These items are non-deterministic by nature or have boundaries (LLM, OS keychain, real network, real time) that resist deterministic automation. Even after gap-closure, an operator should still verify these on dogfood passes.

| Item | Class | Rationale (KNOWN unless flagged) |
|---|---|---|
| **#84-B / MB-T07 actual LLM card emission** | MANUAL | KNOWN: model-output non-determinism is the root cause. fix-84 probe-06 already accepts MANUAL; routing logic is mockable (P19) but actual LLM behavior under real API is operator-verifiable only |
| **safeStorage encryption-roundtrip on real keychain** | MANUAL | KNOWN: fix-84 probe-03 covers safeStorage decrypt with seeded ciphertext. Real-keychain interaction (locked vs unlocked, password change, system reboot) is OS-level non-determinism; operator must verify on real system |
| **Anthropic-API real-network behavior** | MANUAL | KNOWN: rate limits, auth errors, 503s under real load are not reproducible. Mocked routing covered by P11/P19; real-network behavior operator-only |
| **Visual UX polish (animation timing, color, layout, fonts)** | MANUAL | MODELED: probes can read DOM text but not visual fidelity. Operator dogfood is the only assertion of "looks like the screenshot" |
| **macOS native menu bar visual appearance** | MANUAL | KNOWN: fix-89 probe-01 introspects via AppleScript / System Events but does not verify pixel-level bar appearance. Operator-only for "looks right on Sonoma+" |
| **System-level race conditions under real load** | MANUAL | KNOWN: fix-92 probe-08 attempts forensic timing; reproducibility depends on system load, hard-disk speed, daemon-fork timing. Operator dogfood under real load is a useful complement |
| **Multi-monitor / external display behavior** | MANUAL | SPECULATIVE: not currently a probed surface; operator-driven for "spawn modal opens on the right display" type checks |
| **Real-tmux integration on operator's actual TERM/shell** | MANUAL | KNOWN: probes spawn tmux against test-controlled env; operator's `~/.tmux.conf` and shell setup may surface integration issues that probes cannot reproduce deterministically |
| **Performance perceptual responsiveness (frame drops, jank, delays)** | MANUAL | MODELED: probes assert sentinels fire within timeouts but not "feels snappy." Operator-only |
| **Crash-recovery behavior (kernel panic, system shutdown mid-spawn)** | MANUAL | KNOWN: SIGKILL is testable (T11/T12 → P9/P10); kernel-level crashes are not |

---

## §7 Surface to operator

**Document path:** `/tmp/probe-coverage-gap-analysis.md`

**Counts:**
- **GAP items: 13** (#82 ConsolePanel mount, #82 xterm render, #68 dev URL, #69 dev:all, #70 port stability, #94 skip-permissions, MB-T03 keybindings, MB-T05 kanban card, MB-T06 cap UI, MB-T07 audit, MB-T08 onboarding, MB-T08 invalid build-doc, MB-T08 daemon-offline UI, T11 kill-tmux, T12 kill-daemon — recount: ~14, see §4 ranked list)
- **PARTIAL items: ~10** (#83 banner DOM, MB-T02 column labels, MB-T03 top-level menus, MB-T05 tmux ls, COARCH-T02 history, COARCH-T03 errors, COARCH-T04 multi-choice/escape, console-mount tile toggle, T1 composite, T18 production path)
- **MANUAL items: 10** (LLM card, safeStorage real keychain, Anthropic real network, visual polish, native menu visual, real-load races, multi-monitor, real-tmux, perceptual perf, crash recovery)
- **FULL items: ~14** (most fix-92 paths, most fix-82/83/84 wiring paths, MB-T01 launch, MB-T03 window state, MB-T04 modal, etc.)

**Top 5 ship-gate-proximate gaps (per §4.1):**
1. **#82 — ConsolePanel actually mounts in webview after IPC** (GAP)
2. **#83 — banner DOM renders with operator-readable text + dismiss timing** (PARTIAL)
3. **MB-T08 — onboarding flow end-to-end** (GAP, stdin handlers exist, no probe drives them)
4. **MB-T05 — tmux session actually exists in `tmux ls` after spawn** (PARTIAL)
5. **MB-T06 — spawn cap enforcement UI** (GAP)

**Likely source-side hook additions if these gaps are closed:**
- Shell-side `KANBAN_EVAL` equivalent (so probes can reach the workstation-shell webview, not just the embedded kanban) — needed by P1, P2, P5, P14, P17 (5 probes)
- `MB_TEST_HOOKS_KILL_TMUX_AFTER_MS` timer hook — needed by P9
- New `MB_MOCK_ANTHROPIC_RESPONSE` cases (`rate_limit`, `outage`) — needed by P11, P19
- `BUILD_DOC_UPLOAD` stdin hook (or KANBAN_EVAL extension) — needed by P13
- `OPEN_CONSOLE_PANEL` stdin hook — needed by P1 (alternative to shell-eval)

All hook additions are MB_TEST_HOOKS=1 gated by convention, ~50-100 LOC total of source under sentinel regions.

**HALT.** No probe additions, source edits, or findings doc edits made in this phase. Document is at `/tmp/probe-coverage-gap-analysis.md` for operator review and arbitration of which Phase 2 probe additions proceed.
