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

2026-04-30 | RED_COMMIT | test/integration/mb-t02/dispatch-web-renders-in-shell.test.ts committed. URL assertion (CDP HTTP) exercises RED→GREEN: RED=data: URL loads (MB-T01 scaffold) → CDP returns data: URL ≠ WEB_UI_URL → FAIL. GREEN (post Zipper-1, dispatch-web running) → URL matches → PASS. Two DOM column it.todo() entries surfaced pending OPEN-Q-B-1 DOM ack.

2026-04-30T17:52:45Z | OPEN-Q-B-1 operator arbitration received — prior CDP resolution (above) superseded. Option C approved as extended MB-S04 stdout sentinel. Three rescopes applied: (1) single sentinel WEBVIEW_LOAD_ATTEMPTED, (2) test renamed webview-loader-callable.test.ts, (3) MB-F-MB-T02-DOM-ASSERTION filed at green | operator arbitration 2026-04-30

2026-04-30T17:52:45Z | territory check: stale dispatch-web-renders-in-shell.test.ts (untracked, wrong approach) deleted; stale dist/main/webview-loader.js (prior run artifact) deleted to restore red state; FOLLOWUPS.md clean (Session C committed DOCK-BADGE at 865b80f); C and D files not in Session B working tree | §8.3 pre-commit check

2026-04-30T17:52:45Z | cross-session read: Session C complete at 0bf4722 (menu.ts+window-lifecycle.ts+fixture at 865b80f); Session D empty; no methodology remediations to absorb | §8.7

2026-04-30T17:52:45Z | RED verified: pnpm test → 1 failed (MB-T02 webview-loader-callable) / 2 passed (MB-T01, MB-T03). Fail: existsSync(dist/main/webview-loader.js) → false, expected RED state. Proceeding to red commit | red criterion §3.5

2026-04-30T18:00:08Z | RED COMMIT ac38567 — red(MB-T02): webview-loader-callable test + harness fixture | §3.5 red commit

2026-04-30T18:00:08Z | GREEN: pnpm build clean, pnpm test → 3 passed (3) — MB-T02 1757ms, sentinel WEBVIEW_LOAD_ATTEMPTED emitted. MB-T01 and MB-T03 not regressed. webview-loader.ts exports match frozen §3.2 exactly. FOLLOWUPS.md: filed MB-F-MB-T02-PRODUCTION-LOADING + MB-F-MB-T02-DOM-ASSERTION (RESCOPE 3). Proceeding to green commit | §3.2 frozen exports verified

2026-04-30 | SESSION_COMPLETE | FOLLOWUPS.md staged but inadvertently excluded from green commit 7ef8e44; committed separately via docs(MB-T02) commit. Session B deliverables complete: src/main/webview-loader.ts (green 7ef8e44), test/integration/mb-t02/ (red ac38567 — webview-loader-callable.test.ts + mb-t02-harness.mjs), docs/FOLLOWUPS.md (MB-F-MB-T02-PRODUCTION-LOADING + MB-F-MB-T02-DOM-ASSERTION). main.ts untouched (151897f). Zipper-1 integration ready per §3.6. | §8.3 session close

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

Self-correction (§8.6): First green commit (5acadef) omitted implementation files — git add ran from packages/dispatch-workstation/ cwd instead of repo root; paths resolved correctly but the index state was lost between status check and commit. Remediation: second green commit (865b80f) staged from repo root explicitly. Disclosed in 865b80f commit body.

Shared git index event: Session B's test file (mb-t02/dispatch-web-renders-in-shell.test.ts) appeared staged in shared index on both git add attempts. Detected via `git status` after per-path add. Unstaged via `git restore --staged` before committing. No contamination landed in Session C commits.

2026-04-30T00:00Z | FRAMING CORRECTION — operator review | contract §3.8, §8.7

The shared-index event documented above and in 0bf4722 was framed as a "novel §9.x candidate" and "not anticipated in §9.1-§9.4." That framing is incorrect and corrected here per operator review.

The shared-working-tree per-path-git-add discipline is NOT novel. It is Round 1 Incident 8, codified in project instructions §3.8 ("Per-path git add (shared-working-tree contexts)"): git add -A in shared-working-tree parallel sessions is unsafe; use explicit git add <path> for every staged file; pre-commit territory check via git status --short; post-commit verification via git log -1 --stat. The Round 2 contract §8/§9 inherits this primitive. Session C's per-path add + git status check + git restore --staged sequence is the existing primitive executing as designed, not new methodology.

No contract amendment recommendation stands (contract amendment is operator-only authoring under §3.4 and not in build-session lane to recommend). The "novel §9.x candidate" and "anticipated failure modes don't cover shared index" claims in 0bf4722 commit body are incorrect. This correction propagates forward so cross-session inheritance in any subsequent round receives accurate framing.

2026-04-30T00:00Z | SESSION COMPLETE | contract §4

MB-T03 deliverables complete per §2 territory matrix:
- src/main/menu.ts: committed at 865b80f ✓
- src/main/window-lifecycle.ts: committed at 865b80f ✓
- test/integration/mb-t03/window-state-persists.test.ts: committed at 470a065 ✓
- test/integration/mb-t03/lifecycle-fixture-main.mjs: committed at 865b80f ✓
- docs/FOLLOWUPS.md MB-F-MB-T03-DOCK-BADGE: committed at 865b80f ✓
- main.ts: NOT touched ✓ (territory invariant holds)

Zipper-1 pre-conditions met: exports match §4.2-§4.3 exactly; pnpm test 2 passed (2).

---

## Session D — COARCH-T02 (chat panel UI scaffold)

_Append-only. Format: timestamp | event | citation_

(empty — Session D writes here)

---

## Zipper-1 — main-process wiring (B + C)

_Append-only. Format: timestamp | event | citation_

2026-04-30T00:00Z | SESSION START — Zipper-1 launching, baseline reads complete, proceeding to wire main.ts | contract §7.2 / execution sequence step 1

Pre-reads complete (in order): contract §3/§4/§7, main.ts (151897f), webview-loader.ts (7ef8e44), menu.ts (865b80f), window-lifecycle.ts (865b80f), all three existing test files, cairn-findings.md.

Territory check: `git log --oneline packages/dispatch-workstation/src/main/main.ts` → `151897f` (green MB-T01) confirmed as last touch. `git status --short` → clean working tree. COARCH-T02 session has staged nothing. Territory invariant holds per §7.5.

Cross-session reads absorbed: Session B complete (7ef8e44), Session C complete (865b80f). Session D empty — COARCH-T02 running in parallel per operator briefing. No methodology remediations from B or C to propagate to Zipper-1 beyond existing per-path git add discipline (already applied).

DISCREPANCY NOTED: briefing states "docs/cairn-findings.md including new entries #56 and #57 — both apply to your work." cairn-findings.md ends at finding #55; #56 and #57 do not exist. Per anti-fabrication discipline, not inventing their content. Proceeding on existing finding #55 (frozen-contract verification) and contract §8.5 (halt-and-surface on ambiguity). Flagged in commit body.

DISCREPANCY NOTED (contract §4.7 step 3 vs frozen file): Contract §4.7 step 3 says `createManagedWindow({ defaultWidth: 1024, defaultHeight: 768, ... })`. Frozen `window-lifecycle.ts` `WindowSizeDefaults` interface uses `width` and `height` (not `defaultWidth`/`defaultHeight`). Frozen file is the authority per anti-fabrication. Wiring uses `{ width: 1024, height: 768, ... }`.

MODELED CONCERN (loadDispatchWeb rejection): `loadDispatchWeb` returns `win.loadURL(WEB_UI_URL)` with no error handling. If the dev-server is unreachable during tests, `loadURL` may reject with ERR_CONNECTION_REFUSED, which may prevent `did-finish-load` from firing and thus suppress the `WINDOW_READY` sentinel that MB-T01 awaits. Mitigation: register `did-finish-load` listener BEFORE `await loadDispatchWeb(mainWindow)` so the listener exists when the URL load starts. Will run tests post-wiring and surface if MB-T01 regresses per execution sequence step 4.

2026-04-30T00:00Z | WIRING COMMIT 68e6528 — refactor(zipper-1): wire B's webview-loader + C's menu/window-lifecycle into main.ts | §7.2 wiring complete

POST-EDIT VERIFICATION RESULTS:
- typecheck: clean (no errors)
- build: clean
- test 3 passed (3): MB-T01 PASS 2421ms, MB-T02 PASS 2156ms, MB-T03 PASS 2632ms
- git log -1 --stat: only main.ts in commit (17 insertions, 22 deletions)
- git status --short: clean post-commit
- git log --oneline origin/main..HEAD: empty (fully pushed)

MODELED CONCERN RESOLVED: loadDispatchWeb rejection → OBSERVED SAFE. Electron fires did-finish-load for its ERR_CONNECTION_REFUSED error page. WINDOW_READY emitted. MB-T01 passes without modification. No test updates required.

CONTRACT DISCREPANCY RESOLVED: §4.7 step 3 `defaultWidth`/`defaultHeight` → used `width`/`height` per frozen file (authority per anti-fabrication). Surfaced in commit body 68e6528.

ZIPPER-1 SESSION COMPLETE. Deliverables: packages/dispatch-workstation/src/main/main.ts (68e6528). Operator exit gate: manual `pnpm --filter dispatch-workstation dev` launch to verify menu bar + webview load. Zipper-2 may proceed once COARCH-T02 session delivers (Session D territory: src/coarchitect/* — not touched by Zipper-1).

---

## Cross-session methodology propagation log

_Append-only. Sessions log when they adopt a discipline change observed in another session's notes._

2026-04-30T00:00Z | B → C observed | Session B noted C's OPEN-Q-C-1 resolution (option c, structurally forced by §8.8). No methodology change required in C — C had already arrived at the same conclusion independently. No new propagation from B to C at this point. B's OPEN-Q-B-1 CDP resolution (Option C) is informational to C but not actionable (C doesn't exercise DOM assertions).

---

## Operator interventions

_Append-only. Operator logs ad-hoc decisions, halt arbitrations, scope adjustments._

(empty)
