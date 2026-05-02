# Followup index

Consolidated index of post-MVP work filed across Phase Y + Phase Z by both
Session A (daemon + CLI) and Session B (web UI + menubar). Each entry
references its origin cluster/ticket; commit bodies have richer context.

Three priority bands: **MVP-required** (must ship for v2.0 — should be
empty if Phase Z closed cleanly), **Post-MVP / v2.1** (planned next
iteration), **Deferred / nice-to-have** (no current commitment).

Z-7 harvest snapshot: 18 distinct followups across both sessions. MVP-
required band empty as expected (Z-1 + Z-4 closed real bugs as part of
their own tickets; no MVP-blocker carried into Z-7).

---

## MVP-required

_(empty)_

If anything surfaces here at re-harvest, it represents work that should
have resolved before Phase Z cluster close.

---

## Post-MVP / v2.1

### Session A — daemon + CLI

| ID | Scope | Origin |
|---|---|---|
| `DAEMON-F-installer-cross-platform` | Linux / Windows installer paths (S04 documented darwin-only for v2.0) | D-6 / T18 |
| `DAEMON-F-installer-prebuilt-binary` | Bundle daemon as single-file executable for end users without Node.js installed | D-6 / T18 |
| `DAEMON-F-installer-code-signing` | Apple notarization for distribution outside this repo (S04 followup #2) | D-6 / T18 |
| `DAEMON-F-runtime-deps-hygiene` | `node-notifier`, `@fastify/websocket`, `ws` currently in devDependencies; move to dependencies pre-distribution | D-5 / T16 |
| `DAEMON-F-version-source` | `/v2/health` version is hardcoded `'0.0.0'`; read package.json dynamically at startup | D-5 / T16 |
| `DAEMON-F-watcher-registry-mutex` | Composite: `last_commit_sha` (T14) + `last_status_json_at` (T15) + possibly `last_handoff_pulled_at` written by manager via single mutex coordinated with route writes | D-4+D-5 |
| `DAEMON-F-last-commit-sha-update` | Subsumed by the composite mutex above | D-4 / T14 |
| `CLI-F-ci-setup` | CI matrix: daemon-up + daemon-down configs; runs the existing test suite under both per X2 line 361 | CLI-T / T05 |
| `CLI-F-probe-timeout-env` | `/v2/health` probe timeout (currently 500ms hardcoded) configurable via env var | CLI-T / T04 |

### Session B — web + menubar

| ID | Scope | Origin |
|---|---|---|
| `WEB-F-focused-card-highlight` | Visual refinement on focused-via-keyboard SessionCard | W-2 / WEB-T07 |
| `WEB-F-send-modal-error-differentiation` | Modal currently surfaces a single error region; differentiate validation vs network vs daemon-422 paths | W-3 / WEB-T11 |
| `UI-F-banner-copy` | Banner text refinement (Session B authoring decision) | W-1 |
| `UI-F-real-browser-modal` | Real-browser smoke test for SendPromptModal interactions (deferred per Session B's no-Playwright scope) | W-3 |
| `MB-F-pnpm-electron-packaging` | When COARCH-T03 reinstalls `@anthropic-ai/sdk`, re-spike packager against actual workspace dep tree. Decide between `node-linker=hoisted` (workspace-wide), `public-hoist-pattern` (local), or `electron-builder`. MB-S04 ADR's K6 claim (263 MB / 8.4 s) was sterile-spike evidence, not workspace-dep evidence. | MB-T01 green |
| `MB-F-mb-s04-spike-amendment` | Amend MB-S04 ADR §K6 to reflect spike-vs-reality gap discovered at MB-T01 green: sterile package.json doesn't surface pnpm symlink + `@electron/packager` prune walker incompatibility. Future packaging spikes must use actual workspace dep tree. | MB-T01 green |
| `MB-F-MB-T03-DOCK-BADGE` | Dock badge implementation deferred per RESOLUTION-2 (operator 2026-04-30). V3_TICKETS.md L120 "if relevant" language stripped from MB-T03 frozen surface (contract §4.6, OPEN-Q-C-2). Implement in a future ticket: `app.setBadgeCount(n)` for unread-action-count badge on the macOS dock icon. Requires daemon polling or SSE event to drive count updates. Non-blocking for v3.0 ship. | MB-T03 green |
| `MB-F-MB-T02-PRODUCTION-LOADING` | v3.0 ships dev-only `loadURL('http://localhost:7878')` per contract §3.4 (IMPORTANT-5 operator resolution 2026-04-30). Production-mode loading (static file fallback or packaged-app URL resolution) is out of scope for MB-T02. Implement in MB-T08 or a dedicated follow-on ticket. | MB-T02 green |
| `MB-F-MB-T02-DOM-ASSERTION` | Round 2 webview-loader test (webview-loader-callable.test.ts) verifies callability + non-crash; full DOM assertion of kanban columns (AWAITING REVIEW / STALE / RUNNING / IDLE headers, session cards) deferred until dispatch-web server runnable in test env (MB-T07 territory). | MB-T02 green |
| `MB-F-COARCH-T02-REAL-DAEMON-WIRING` | **CLOSED by COARCH-T03 7f15c78.** HttpDaemonClient wired in coarchitect-ipc.ts; mount.ts bridge adapter uses `window.coarchitectBridge`; AnthropicChatClient streams via Sonnet 4.6. Daemon persistence gracefully fails when daemon unreachable (synthetic local-only message fallback per HttpDaemonClient design). OPEN-Q-D-2 remains open for typed import resolution in a future ticket. | COARCH-T02 green → CLOSED COARCH-T03 |
| `MB-F-ZIPPER-2-ESM-PRELOAD` | Electron 41 sandboxed preloads cannot load ESM modules — `import` statements in `.mjs` files cause `SyntaxError: Cannot use import statement outside a module` in the sandbox context, regardless of `package.json` `"type":"module"`. Fixed in Zipper-2 by compiling `src/main/preload.mts` to `dist/main/preload.cjs` via esbuild `format:'cjs'`. All future preload scripts in this package must use CJS output. If Electron ever ships first-class ESM preload support, revisit and remove the `build-preload.mjs` script. | Zipper-2 green 039721f |
| `MB-F-ZIPPER-2-COARCH-T03-IPC` | **CLOSED by COARCH-T03 7f15c78.** coarchitect-ipc.ts now uses HttpDaemonClient (real /v3/* calls, graceful failure); sendAndStream one-way IPC handler added; preload exposes streaming bridge; mount.ts uses bridge adapter from `window.coarchitectBridge`. Integration test for real message persistence (daemon must be running) deferred to COARCH-T04+ scope. | Zipper-2 green 039721f → CLOSED COARCH-T03 |
| `MB-F-MB-T04-PROJECT-LIST` | MB-T04 ships file-dialog fallback only — V3_TICKETS.md L130 names a "configured project list" picker that depends on the settings UI (V3_TICKETS.md MB-T11 / W-T19). When MB-T11 lands, the spawn modal should grow a dropdown above the path input populated from `electron-store` (or equivalent) with the operator-configured project paths; current text input + Browse… stay as the manual entry / fallback. | MB-T04 green |
| `MB-F-MB-T04-INITIAL-PROMPT` | WORKSTATION_CONTRACT.md §3.3 spawn-new-session row lists "optional initial prompt" in the payload. MB-T04 modal does NOT surface this field; IPC payload shape committed as `{repoPath, sessionName}`. If MB-T05 needs it, extend modal with a multi-line textarea + extend payload to `{repoPath, sessionName, initialPrompt?: string}` and add a v3-schema entry for the IPC channel under §2.1. Tier-2 because behavior under absence is well-defined (claude starts with no prompt; operator types one in the spawned pane). | MB-T04 green |
| `MB-F-MB-T04-PAYLOAD-VALIDATION` | spawn-ipc.ts main-process listener accepts payload as `unknown` and only validates shape implicitly via JSON.stringify (test-hook only). MB-T05 should add a Zod schema (likely `WorkstationSpawnRequestedSchema` in dispatch-core/src/v3/schema.ts §2.1 IPC section) and validate at the main-process boundary, surfacing `WorkstationError` on shape mismatch per WORKSTATION_CONTRACT.md §6.5. Until then, a malformed renderer could pass non-string repoPath/sessionName. | MB-T04 green |
| `MB-F-MB-T04-EMPTY-INPUT-UX` | Spawn confirm button is a silent no-op when either input is empty (after `.trim()`). Acceptable for MB-T04 ship per ticket scope, but a future UX pass should add inline validation (red border + helper text) or button-disable-when-empty similar to MB-T06's at-cap disable pattern. Tier 3 — non-blocking. | MB-T04 green |

---

## Deferred / nice-to-have

| ID | Scope | Origin |
|---|---|---|
| `DAEMON-F-backpressure-integration` | Real slow-client browser smoke for T12's WS backpressure (force-disconnect at 1009); current coverage is unit-only | D-4 / T12 |
| `DAEMON-F-git-recursive-branches` | Support slash-bearing branch names (`feature/foo`); requires recursive `fs.watch` (S02 flagged macOS-fragile) | D-4 / T14 |
| `DAEMON-F-watcher-fsevents-smoke` | Real `fs.watch` integration smoke test (T13/T14/T15 currently mock-factory only) | D-4 |
| `DAEMON-F-watcher-real-git-smoke` | Real `git init` + commit roundtrip integration test for T14 git watcher | D-4 / T14 |
| `DAEMON-F-watcher-status-real-fs-smoke` | Real `STATUS.json` write + watch integration test for T15 | D-4 / T15 |
| `DAEMON-F-status-json-configurable-path` | Per-session configurable STATUS.json location (currently `<cwd>/STATUS.json`) | D-4 / T15 |
| `DAEMON-F-test-contention` | Investigated only if recurs: T14 P2 git-watcher debounce flaked once under cross-package pnpm recursive contention | D-4 / T14 |
| `DAEMON-F-health-response-schema-consumption` | Session B's UI consumption of `notifications_available` flag from `/v2/health` (Session B territory) | cross-session |
| `CLI-F-real-daemon-state-isolation` | Z-4 spawnRealDaemon writes to `~/.foxworks-dispatch/*` (operator state); post-MVP support test-isolated paths via env-var override or daemon CLI args | Z-4 |
| `CLI-F-send-pull-real-env-smoke` | Z-4 deferred fd send + fd pull from smoke coverage (need tmux pane + HANDOFF.md fixture) | Z-4 |
| `UI-F-color-audit` | Cross-component color usage audit (Session B authoring decision) | W-* |

---

## Numbering convention

Followups carry a domain prefix matching their package owner:

- `DAEMON-F-*` — `packages/dispatch-daemon/`
- `CLI-F-*` — `packages/dispatch-cli/`
- `WEB-F-*` — `packages/dispatch-web/`
- `UI-F-*` — Session B's UI surface broadly (web + menubar)
- `MB-F-*` — `packages/dispatch-workstation/` (v3.0 Workstation surface)

Origin column references the cluster ID (`D-1` through `D-6`, `W-1`
through `W-5`, `CLI-T`, `Z-*`) plus the originating ticket where
unambiguous. Commit bodies in the originating commits carry full
context; this index is a scan target, not a substitute.
| `MB-F-COARCH-T02-STYLING` | Chat panel renders functional but unstyled — D shipped UI scaffold only per COARCH-T02 contract scope; needs production-quality CSS matching modern LLM chat aesthetic (Claude/GPT/Gemini-style message bubbles, role-based layout, input affordances). Operator-arbitrated new ticket required (visual reference + frozen exports + acceptance criteria with operator manual gate). | Round 2 Zipper-2 manual gate |
| `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` | Workstation Electron BrowserWindow session shows dispatch-web "Conductor authentication" screen on every fresh launch; Electron session has no relationship to user's regular browser auth state. Architectural decision needed: (a) IPC token-injection at workstation launch from `~/.foxworks-dispatch/token`, (b) auth-bypass for workstation context, (c) accept as workstation onboarding step. Link to MB-T08 (production-mode webview) territory. | Round 2 Zipper-2 manual gate |
| `MB-F-COARCH-T02-DEFAULT-LAYOUT` | Default `chat-region` height of 280px in workstation-shell.html may not be optimal default; revisit when styling lands and visual proportions become design-decision-able. | Round 2 Zipper-2 manual gate |
