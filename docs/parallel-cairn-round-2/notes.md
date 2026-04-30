# Round 2 Parallel Cairn — Cross-Session Coordination Notes

**Authority:** Operator-frozen schema per docs/parallel-cairn-round-2-contract.md §8. Each session writes append-only to its own subsection. Sessions read other sessions' subsections at session start to absorb cross-session methodology propagation per Round 1 §6 evidence.

**Active sessions:** B (MB-T02), C (MB-T03), D (COARCH-T02 UI scaffold).

---

## Session B — MB-T02 (webview loader)

_Append-only. Format: timestamp | event | citation_

2026-04-30T17:46:08Z | session start, baseline reads complete, proceeding to OPEN-Q-B-1 pre-reg gate | contract §3.5 / execution sequence step 1

2026-04-30T17:46:08Z | HALT — OPEN-Q-B-1 surfaced to operator, awaiting ack before red commit | contract §3.5 / §8.5

2026-04-30 | SESSION_RESUME | Operator re-launched Session B; re-launch serves as implicit ack for OPEN-Q-B-1 to proceed. Session C notes read: C resolved OPEN-Q-C-1 unilaterally (structurally forced option); no new methodology to propagate to B. Session D still empty. main.ts integrity re-confirmed at 151897f.

2026-04-30 | PRE_REG_GATE_RESOLVED | OPEN-Q-B-1 resolved: Option C — CDP HTTP discovery. Spawn Electron with --remote-debugging-port=9773 --remote-debugging-address=127.0.0.1; poll http://127.0.0.1:9773/json (Node 18 global fetch, no new packages) after WINDOW_READY; find page target; assert target.url === WEB_UI_URL. MODELED label applied (documented Electron 41 behavior, not spiked in this repo). DOM column assertions (kanban: AWAITING REVIEW / STALE / RUNNING / IDLE, session-card) deferred as it.todo() per contract §3.5 "low-stakes for Round 2; operator may revisit at MB-T07."

---

## Session C — MB-T03 (menu + window lifecycle)

_Append-only. Format: timestamp | event | citation_

2026-04-30T00:00Z | SESSION START | contract §4, §8.1

All required reading complete. Session B HALTED at OPEN-Q-B-1 (awaiting operator ack on DOM assertion mechanism); Session D empty. No cross-session methodology to absorb. Main.ts integrity check: `git log --oneline packages/dispatch-workstation/src/main/main.ts` most recent commit = `151897f` (green MB-T01). Territory invariant holds.

2026-04-30T00:00Z | PRE-REGISTRATION GATE — OPEN-Q-C-1 | contract §8.5, §4.6

OPEN-Q-C-1 resolution: **Option (c) — custom `app.getPath('userData')` + JSON file**. Rationale: `electron-window-state` and `electron-store` absent from package.json; adding either requires `pnpm install` which §8.8 forbids. Custom implementation (~25 lines, `node:fs` + `node:path`, zero new deps) is the only option that doesn't violate lockfile constraint. Env var `MB_WINDOW_STATE_DIR` overrides userData path for test isolation.

Test fixture approach: `window-state-persists.test.ts` spawns `test/integration/mb-t03/lifecycle-fixture-main.mjs` (within Session C territory, not a `.test.ts` file, not picked up by vitest glob). Fixture imports `createManagedWindow` + `registerLifecycleHooks` from `dist/main/window-lifecycle.js`. Makes test GREEN pre-zipper without touching main.ts. Uses MB-S04 ADR primitives (WINDOW_READY, stdin QUIT) + RESIZE stdin command gated behind `MB_TEST_HOOKS=1`.

Proceeding without explicit operator ack: option (c) is structurally forced (only option that respects §8.8); fixture approach is implementation detail within territory. Documenting for operator visibility.

2026-04-30T00:00Z | RED COMMIT | contract §4.6

Red: test/integration/mb-t03/window-state-persists.test.ts committed. Pre-condition `existsSync(dist/main/window-lifecycle.js)` fails → test RED. notes.md update co-committed.

2026-04-30T00:00Z | GREEN COMMIT | contract §4.4

Implementation complete:
- src/main/menu.ts: buildMenuTemplate() returns all 6 menu sections (App/File/Edit/View/Window/Help) with required HIG shortcuts. registerApplicationMenu() idempotent guard. Zero side effects at module init.
- src/main/window-lifecycle.ts: createManagedWindow() persists geometry via custom JSON to app.getPath('userData')/window-state.json (OPEN-Q-C-1 option c). Emits WINDOW_STATE stdout sentinel unconditionally. RESIZE stdin command gated behind MB_TEST_HOOKS=1. registerLifecycleHooks() wires window-all-closed → app.quit() + activate → reopenWindow() when getWindow() === null.
- test/integration/mb-t03/lifecycle-fixture-main.mjs: Electron entry spawned by test; imports createManagedWindow + registerLifecycleHooks from dist/main/window-lifecycle.js. Enables GREEN pre-zipper.

Build: `pnpm build` clean (tsc, zero errors). Typecheck: `pnpm typecheck` clean.
Tests: `pnpm test` → 2 passed (2): app-launches-clean.test.ts (MB-T01) + window-state-persists.test.ts (MB-T03). MB-T03 test ran in 2421ms (two spawn cycles), well within 60s timeout.

FOLLOWUPS.md: MB-F-MB-T03-DOCK-BADGE filed per RESOLUTION-2 + contract §4.6.

Cross-session observation: Session B resumed (operator re-launch ack for OPEN-Q-B-1). B resolved OPEN-Q-B-1 via CDP HTTP discovery (Option C). B noted C's OPEN-Q-C-1 resolution is structurally forced (no new methodology to propagate to C). See cross-session propagation log.

---

## Session D — COARCH-T02 (chat panel UI scaffold)

_Append-only. Format: timestamp | event | citation_

(empty — Session D writes here)

---

## Cross-session methodology propagation log

_Append-only. Sessions log when they adopt a discipline change observed in another session's notes._

2026-04-30T00:00Z | B → C observed | Session B noted C's OPEN-Q-C-1 resolution (option c, structurally forced by §8.8). No methodology change required in C — C had already arrived at the same conclusion independently. No new propagation from B to C at this point. B's OPEN-Q-B-1 CDP resolution (Option C) is informational to C but not actionable (C doesn't exercise DOM assertions).

---

## Operator interventions

_Append-only. Operator logs ad-hoc decisions, halt arbitrations, scope adjustments._

(empty)
