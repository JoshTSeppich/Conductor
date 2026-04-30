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
