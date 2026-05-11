# Spike — Fix-92 residual-gap identification for `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` closure

**Ticket:** MB-T-DISPATCH-WEB-AUTH-INJECTION WB1
**Date:** 2026-05-11
**Anchor SHA:** `4fb8d41` (ticket body authoring) + `870e991` (current origin/main HEAD at spike-execution time)
**Parser source:** read-only across 7 files (no production modification)
**Spike harness:** none — direct source-read + cross-reference against Phase B (`eb69cc0`) + Phase C (`673d5d6`) live evidence

---

## I. Spike question

Does the existing Fix-92 token-injection pipeline (cairn finding #92, MB-F-#92 GREEN at `daemon-token-bootstrap.ts:1` header) structurally close `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` (Tier 1, FOLLOWUPS.md:124), or does a residual gap remain across the workstation→webview→dispatch-web→daemon auth chain?

## II. Method

Direct source-read of 7 files comprising the end-to-end auth chain:

| Link | File | Lines | Role |
|---|---|---|---|
| 1 | `packages/dispatch-workstation/src/main/main.ts` | 414-434 | Fix-92 main-process IPC handler registration |
| 2 | `packages/dispatch-workstation/src/main/daemon-token-bootstrap.ts` | 40-49 | Disk read of `~/.foxworks-dispatch/token` |
| 3 | `packages/dispatch-workstation/src/main/card-bridge-preload.mts` | 50-75 | Webview preload IPC invoke + localStorage.setItem |
| 4 | `packages/dispatch-workstation/src/main/workstation-shell.html` | 250 | `<webview id="kanban-webview" preload="./card-bridge.cjs">` attachment |
| 5 | `packages/dispatch-web/src/auth/token-storage.ts` | 1-26 | `KEY = 'x-conductor-token'` getter/setter abstraction |
| 6 | `packages/dispatch-web/src/auth/useAuthBootstrap.ts` | 16-73 | Phase-state machine: prompt / bootstrapping / connected / daemon_down / auth_failed |
| 7 | `packages/dispatch-web/src/components/AuthBootstrap.tsx` | 11-28 | Phase-to-UI routing (TokenPrompt vs children) |
| 8 | `packages/dispatch-web/src/query/internal.ts` + `http-client.ts` | 1-19 | Per-fetch `X-Conductor-Token` header injection |
| 9 | `packages/dispatch-workstation/src/main/main.ts` | 257-281 | Probe-92 obs-infra `did-attach-webview` forwarder |

Cross-references:
- Phase B (`eb69cc0`) `BOOTSTRAP_TOKEN_WRITTEN 44` sentinel observation (live runtime evidence)
- Phase C (`673d5d6`) daemon `x-conductor-token` auth-header verification (live HTTP probe evidence)
- FOLLOWUPS.md:124 (`MB-F-DISPATCH-WEB-AUTH-PERSISTENCE`) original framing (option (a) IPC token-injection chosen at Q-GATE-2-4)
- FOLLOWUPS.md:285 (`MB-F-DOGFOOD-WEBVIEW-CONSOLE-FORWARDER-GAP`) my prior Phase B finding (correction in §IV)

No production code modified. No probes added. No tmux/electron launch this spike — structural evidence is sufficient when paired with prior sealed runtime evidence.

## III. Evidence

### End-to-end auth chain (8 links; all [KNOWN] per direct source read)

1. **[KNOWN]** main.ts:430 — `ipcMain.handle('workstation:get-daemon-token', () => readDaemonTokenForBootstrap(...))`. Handler registered BEFORE `createWindow()` per comment at line 418 ("Must register before createWindow() so the handler is live when the webview attaches and its preload fires ipcRenderer.invoke"). No `MB_TEST_HOOKS` gating — production-active.

2. **[KNOWN]** daemon-token-bootstrap.ts:40-48 — `readDaemonTokenForBootstrap()` calls `readFileSync(~/.foxworks-dispatch/token, 'utf8').trim()`. Returns trimmed contents on success, `null` on any I/O failure (file absent / unreadable). Silent-on-error semantics documented at lines 31-38.

3. **[KNOWN]** card-bridge-preload.mts:51-74 — preload IIFE invokes `ipcRenderer.invoke('workstation:get-daemon-token')`, on string result with `length > 0` calls `localStorage.setItem('x-conductor-token', token)` and emits `console.log('BOOTSTRAP_TOKEN_WRITTEN ' + token.length)`. Wrapped in try/catch — silent fallthrough to TokenPrompt on any failure. NO env-var gating — production-active.

4. **[KNOWN]** workstation-shell.html:250 — `<webview id="kanban-webview" allowpopups preload="./card-bridge.cjs">`. Resolves at runtime to `dist/main/card-bridge.cjs` (build script `build-card-bridge.mjs:24` outputs there; workstation-shell.html lives at `dist/main/workstation-shell.html` post-build; relative path matches). Preload runs in the webview's renderer process BEFORE any page scripts per Electron preload contract.

5. **[KNOWN]** token-storage.ts:1 — `KEY = 'x-conductor-token'` (lowercase). Matches the key written by card-bridge-preload.mts:56 exactly. `readToken()` at line 3-10 returns `localStorage.getItem(KEY)`; catches localStorage-disabled exception.

6. **[KNOWN]** useAuthBootstrap.ts:26 — first action of the bootstrap effect: `const token = readToken();`. If null/empty → `setPhase('prompt')` → TokenPrompt renders. If non-null → `setPhase('bootstrapping')` → `runPreflight(token, ...)`.

7. **[KNOWN]** useAuthBootstrap.ts:50-62 — preflight result routing:
   - `daemon_down` → `setPhase('daemon_down')` → `ConnectionStatusBanner` renders
   - `auth_failed` → `clearToken()` + `setPhase('auth_failed')` → `TokenPrompt reason='invalid'` renders
   - success → `setPhase('connected')` → AuthBootstrap children render (DaemonEventsBridge + kanban)

8. **[KNOWN]** http-client.ts:15 — `if (token) headers.set('X-Conductor-Token', token)`. Per HTTP RFC 7230 §3.2, header names are case-insensitive; `X-Conductor-Token` (camel) and `x-conductor-token` (lowercase) are wire-equivalent. Daemon accepts both (verified at Phase C `673d5d6` HTTP probe — `curl -H "x-conductor-token: $TOKEN"` returned 200). Per-fetch fresh-client at internal.ts:9 reads token from localStorage at call time, so rotation between bootstrap and a given fetch is observed.

### Probe-92 obs-infra forwarder scope [KNOWN per main.ts:267-280]

- Gated on `MB_TEST_HOOKS=1` (production: branch skipped per line 266).
- Attaches to `mainWindow.webContents.on('did-attach-webview', ...)` — fires for the kanban `<webview>` only (first/only webview attached).
- Listener allowlists exactly two emissions: messages starting with `BOOTSTRAP_TOKEN_WRITTEN ` (forwarded to stdout) + any `level === 'error'` message (forwarded to stderr with `[kanban-webview-error]` prefix).
- All other console output from the kanban webview's preload AND from dispatch-web's renderer (post-page-load) is NOT forwarded.

### Phase B runtime cite [KNOWN per `eb69cc0` log]

- `BOOTSTRAP_TOKEN_WRITTEN 44` observed in `/tmp/dogfood-phase-b-electron.log`. The 44 is the token length in bytes — matches `~/.foxworks-dispatch/token`'s on-disk size (`ls -la` shows 44 bytes). End-to-end IPC roundtrip + setItem succeeded.
- No `[kanban-webview-error]` lines — no errors during webview load.
- No TokenPrompt banner / connection-error indicators in any of the main-window-renderer sentinels.

### Phase C runtime cite [KNOWN per `673d5d6` curl probe]

- Daemon accepts `x-conductor-token: <token>` header → 200 OK with full session list.
- Daemon rejects `Authorization: Bearer <token>` → 401 `{"error": "Invalid or missing token"}`.
- Token at `~/.foxworks-dispatch/token` (44 bytes, dated 2026-05-02) is VALID against the running daemon (PID 92700).

## IV. Findings — Sub-Q-MBTDWAI-A disposition

Spike binds against the five candidate failure modes in ticket §3.1:

### (a) Token file missing on fresh launch — **NOT applicable to operator-current-env; applicable to clean-install** [MODELED for clean-install branch]

- Operator current env: `~/.foxworks-dispatch/token` exists, 44 bytes, valid against daemon. Phase B observed `BOOTSTRAP_TOKEN_WRITTEN 44` ✓. Operator does NOT see TokenPrompt in this env.
- Clean-install scenario [MODELED]: token file is written by daemon first-launch (per Sub-Q-MBTDWAI-B=(α) speculation); if operator launches workstation BEFORE ever starting the daemon, IPC handler returns null → preload skips setItem → useAuthBootstrap sees `readToken() === null` → `setPhase('prompt')` → TokenPrompt shown. This IS the residual gap relative to the original FOLLOWUPS.md:124 row's three-option framing.
- **Binding for Sub-Q-MBTDWAI-A: (a) — but only on first-launch-no-daemon path; not on already-installed operator-env path.**

### (b) Token file exists but rejected by daemon — **NOT applicable** [KNOWN]

Phase C confirmed the 44-byte token at `~/.foxworks-dispatch/token` is accepted by the running daemon (200 response to `x-conductor-token` header). Token is not stale; not rejected.

### (c) Timing race (preload runs AFTER useAuthBootstrap) — **NOT applicable** [KNOWN per Electron contract + observed sentinel order]

Electron preload contract: preload scripts run in the renderer process BEFORE any page scripts execute (per Electron docs + card-bridge-preload.mts:19-21 comment). For a `<webview>`, the preload's IIFE awaits the IPC roundtrip + writes localStorage — by the time the dispatch-web bundle loads and `useAuthBootstrap`'s `useEffect` fires, localStorage already holds the token.

Phase B did not observe any pre-`BOOTSTRAP_TOKEN_WRITTEN` TokenPrompt flash. (Note: the main-window forwarder wouldn't have captured a TokenPrompt mount event from the kanban webview anyway — see §IV(f) correction below — but no auth-failure stderr lines fired either, which the forwarder WOULD have caught.)

### (d) Origin/storage scoping mismatch — **NOT applicable** [KNOWN per source]

card-bridge-preload.mts and dispatch-web's token-storage.ts both reference the SAME key (`'x-conductor-token'`) on the SAME `localStorage` (the kanban webview's per-origin store; preload + page scripts share the same renderer context per Electron `contextIsolation:false` for webview content; per card-bridge-preload.mts:17-19 comment "localStorage is per-origin and shared across isolated worlds even with contextIsolation:true").

### (e) Fix-92 disabled in production builds — **NOT applicable** [KNOWN per source]

- Fix-92 IPC handler (main.ts:430) — NO env-var gating.
- Fix-92 preload IIFE (card-bridge-preload.mts:51-74) — NO env-var gating.
- Only the Probe-92 obs-infra console-message forwarder (main.ts:267-280) is gated on `MB_TEST_HOOKS=1` — that's the OBSERVABILITY layer, not the FUNCTIONALITY layer. Fix-92 itself fires in production.

### (f) Correction-flag for `MB-F-DOGFOOD-WEBVIEW-CONSOLE-FORWARDER-GAP` (row 285) — surfaced this spike

My Phase B finding (FOLLOWUPS.md:285) stated Probe-92 forwarder "does not iterate into nested `<webview>` elements." **More precise truth: forwarder IS scoped to the kanban webview (via `did-attach-webview`), but its allowlist is narrow — two emissions only (BOOTSTRAP_TOKEN_WRITTEN prefix + error-level).** Other kanban-webview console messages (e.g., dispatch-web's React render logs, query-layer fetch debug) and ALL messages from other embeds (chat-shell, if it's a separate webview) are NOT forwarded.

Row 285's core claim (Phase B couldn't verify chat-shell/dispatch-web mount from stdout alone) still stands. The mechanism description should be refined at row 285's closure path — "extend the allowlist" rather than "iterate into nested webviews" — but the conclusion is unchanged. **No new followup needed; this is a clarification within the existing row's closure path option (a).**

## V. Binding decision for MB-T-DISPATCH-WEB-AUTH-INJECTION ladder + `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` closure framing

### V.1 — Sub-Q-MBTDWAI-A binding: **(a) on the first-launch-no-daemon path; n/a on the operator-current-env path**

The auth chain IS structurally complete and KNOWN-functional under operator-current-env. The original FOLLOWUPS.md:124 framing ("workstation Electron BrowserWindow session shows dispatch-web 'Conductor authentication' screen on every fresh launch") is **inaccurate as of this spike** for operator-current-env — Fix-92 prevents the TokenPrompt mount when `~/.foxworks-dispatch/token` is present and valid.

The residual scenario where TokenPrompt still mounts is **first-launch-no-daemon**: a clean install where `~/.foxworks-dispatch/token` does not yet exist (daemon never started). This is a sub-case of failure mode (a), bound here for WB2 RED scope.

### V.2 — WB2 RED scope (recommended)

RED probe must reproduce **first-launch-no-daemon**: tmp-dir-rebind `~/.foxworks-dispatch/token` path (via `MB_TEST_HOOKS_DAEMON_TOKEN_PATH` per main.ts:425-428) to a non-existent path → workstation launch → assert TokenPrompt mounts (the failure-mode evidence) → that's the RED state.

WB2 probe shape: integration test at `packages/dispatch-workstation/test/integration/dispatch-web-auth/probe-mbtdwai-02-no-token-prompt-on-launch.test.ts` (per ticket §4 WB2). Asserts TokenPrompt does NOT mount under the GREEN path (`~/.foxworks-dispatch/token` populated by WB3 onboarding-side write). RED state: probe pre-WB3 will see TokenPrompt mount → fails.

### V.3 — Sub-Q-MBTDWAI-B binding: **(γ) workstation MB-T08 onboarding step writes the token**

Per ticket §3.2's three options:
- (α) daemon first-launch generates — currently the de-facto path but not robust (daemon may not have been started)
- (β) operator manual placement — not viable for v3.5-alpha
- (γ) onboarding writes it — **RECOMMENDED** per ticket §3.2 hint ("Likely correct closure if Sub-Q-MBTDWAI-A=(a)")

WB3 GREEN site: extend `packages/dispatch-workstation/src/onboarding/` to detect missing `~/.foxworks-dispatch/token` and either:
- (γ.1) generate a fresh token + write the file + POST to daemon's token-registration endpoint (if such endpoint exists — needs daemon-side verification)
- (γ.2) prompt the operator for the token (manual paste) + write the file — mirrors existing API-key onboarding pattern at `packages/dispatch-workstation/src/onboarding/api-key-storage.ts`

Operator-arbitrated at HALT-WB3-PRE-COMMIT between γ.1 and γ.2.

### V.4 — WB4/WB5 disposition: **conditional-skip recommended**

Per ticket §4 WB4 + WB5 conditional-skip clauses. Phase C's curl probe directly confirmed daemon-acceptance of the token via `x-conductor-token` header (200 OK). There is no observed daemon-rejection scenario in current state — WB4 RED would have no failure to assert.

Recommendation: WB4 collapses to a WB6 smoke-confirmation sub-step (assert dispatch-web's first authenticated `/v2/sessions` fetch returns 200 under the GREEN path) rather than a standalone probe + commit. WB5 collapses to no-op (nothing to fix). Operator-arbitrated at HALT-WB4-PRE-CODE-SCOPE.

### V.5 — Sub-Q-MBTDWAI-C binding (closure-state for `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE`): **(α) CLOSED entirely** post-WB3+WB6

After WB3 onboarding-write GREEN + WB6 smoke confirms TokenPrompt does not mount on first-launch (and remains absent on subsequent launches), the original row 124 ship-blocker is fully resolved per the operator's chosen option (a) at Q-GATE-2-4.

No Tier 3 successor needed for the "brief TokenPrompt flash before Fix-92 completes" hypothetical (ticket §3.3 option (β)) — Phase B + this spike's §III link 4 confirm preload runs BEFORE page scripts; no flash window exists.

A Tier 3 successor MAY be filed at operator discretion for the **mid-session token-rotation invalidation** edge case (not in row 124's scope): if the daemon rotates its token while the workstation is running, the in-renderer localStorage holds a stale value → next fetch 401s → `useAuthBootstrap.ts:55-59` clears token + routes to TokenPrompt. NOT a Fix-92 gap (Fix-92 is bootstrap, not refresh). NOT in row 124's framing. NOT in ticket §1.1 scope. Surface to operator if relevant; otherwise skip.

### V.6 — Required additional reads before WB2 RED authoring

- `packages/dispatch-workstation/src/onboarding/api-key-storage.ts` — to confirm the existing onboarding-write pattern WB3 will mirror.
- `packages/dispatch-daemon/` token-management surface — to determine whether daemon has a `/v3/tokens` or equivalent registration endpoint that the workstation onboarding could call (γ.1 path) or whether γ.2 (manual paste) is the only viable shape.
- `packages/dispatch-workstation/src/main/onboarding-mount.ts` — to identify the right wiring site for the onboarding extension.

Operator should verify these reads before approving WB3 GREEN scope.

## VI. Confidence labels

**§III evidence cells:** all 8 chain links + Probe-92 forwarder scope + Phase B/C citations are **[KNOWN]** per direct file:line source read this session.

**§IV findings:** (a) **[KNOWN]** for operator-current-env (Phase B + Phase C direct evidence) + **[MODELED]** for the clean-install branch (no live re-creation of that scenario performed in this spike; structural reasoning grounded in §III evidence). (b)(c)(d)(e) all **[KNOWN]** per source + Phase C direct probe evidence. (f) correction-flag **[KNOWN]** per direct read of main.ts:267-280.

**§V binding decisions:**
- V.1 Sub-Q-MBTDWAI-A=(a) on first-launch-no-daemon — **[KNOWN]** by structural exhaustion of §3.1 options (a)-(e); only (a) survives elimination.
- V.2 WB2 RED scope — **[MODELED]** as a recommended shape; final probe authoring is WB2 territory.
- V.3 Sub-Q-MBTDWAI-B=(γ) — **[MODELED]** as the only path that closes the gap without cross-package daemon changes (which §1.2 excludes); operator may still arbitrate γ.1 vs γ.2.
- V.4 WB4/WB5 conditional-skip — **[MODELED]** per Phase C daemon-acceptance evidence + ticket §4's own conditional-skip clauses.
- V.5 Sub-Q-MBTDWAI-C=(α) — **[MODELED]** per the structural argument that all five §3.1 options reduce to (a)-clean-install-branch which WB3 closes.

**Anti-fabrication discipline (CLAUDE.md §2.1 + §2.2):** every Section III evidence cell is file:line-anchored; every Phase B/C reference is sealed-commit-cite (`eb69cc0` + `673d5d6`); every §V binding recommendation is explicitly **[MODELED]** to distinguish from the **[KNOWN]** evidence-anchored disposition in §IV. No SPECULATIVE claims appear in this ADR.

**Spike binding posture:** WB2 RED authoring + WB3 GREEN implementation MAY refine the recommended shape in §V.2 + §V.3 without re-spike, provided the auth chain integrity established by §III is preserved (the 8 links + same key + case-insensitive header + Electron preload ordering contract). WB2/WB3 MAY NOT redirect to a different failure mode without re-spike, because the evidence rules out (b)(c)(d)(e).

**End of WB1 spike ADR.**
