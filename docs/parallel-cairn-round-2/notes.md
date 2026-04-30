# Round 2 Parallel Cairn — Cross-Session Coordination Notes

**Authority:** Operator-frozen schema per docs/parallel-cairn-round-2-contract.md §8. Each session writes append-only to its own subsection. Sessions read other sessions' subsections at session start to absorb cross-session methodology propagation per Round 1 §6 evidence.

**Active sessions:** B (MB-T02), C (MB-T03), D (COARCH-T02 UI scaffold).

---

## Session B — MB-T02 (webview loader)

_Append-only. Format: timestamp | event | citation_

2026-04-30T17:46:08Z | session start, baseline reads complete, proceeding to OPEN-Q-B-1 pre-reg gate | contract §3.5 / execution sequence step 1

2026-04-30T17:46:08Z | HALT — OPEN-Q-B-1 surfaced to operator, awaiting ack before red commit | contract §3.5 / §8.5

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

---

## Session D — COARCH-T02 (chat panel UI scaffold)

_Append-only. Format: timestamp | event | citation_

(empty — Session D writes here)

---

## Cross-session methodology propagation log

_Append-only. Sessions log when they adopt a discipline change observed in another session's notes._

(empty)

---

## Operator interventions

_Append-only. Operator logs ad-hoc decisions, halt arbitrations, scope adjustments._

(empty)
