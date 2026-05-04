# Batch 6 — Session C — wiring-mounts

## §0 Staging verification (cross-session pre-flight)

- [x] Operator confirmed re-scope source-of-truth doc landed at `docs/build-docs/CONDUCTOR_V3_RESCOPE.md` (KNOWN — verified `ls` returns the file, content reviewed at 69ac132).
- [x] Operator confirmed all 9 dogfood findings filed (#67–#75) — KNOWN, present in 89cfb95 "docs(cairn): findings #67-#75 from 2026-05-03 dogfood test".
- [x] Worktree at `~/Desktop/Automata/foxworks-worktrees/batch-6-session-C` on branch `session-C/wiring-mounts` (KNOWN — `git branch --show-current` reported `session-C/wiring-mounts`).
- [x] origin/main fetched, branch up-to-date with main (KNOWN — `git log --oneline origin/main..HEAD` empty after fetch; HEAD = 89cfb95 = origin/main).
- [x] Per-path `git add <path>` discipline confirmed; `git add -A` not used in any commit (MODELED — discipline holds for this session per Round 1 Incident 8 + scaffold §2.3).

**§0 minor observation (surfaced in session-start commit body, not a halt):** The coord scaffold §0.4 names operator pre-flight creation of the three per-session coord files. Session-A and Session-B coord files were not present at session-C start. Operator confirmed §0 satisfied in the launch instruction; Session C creates its own coord file from the §3 template as the session-start act. Sibling sessions presumably do the same. No-impact on the work; flagged once for awareness.

**§0 territory-fence note:** Coordination scaffold §1 names `packages/dispatch-workstation/src/workstation-shell.html`; the actual file lives at `packages/dispatch-workstation/src/main/workstation-shell.html`. Treating the latter as the intended target. Disjoint-edit invariant with Session B holds (their `<webview preload>` attribute on `<webview id="kanban-webview">` does not collide with the new `#console-tile-region` block).

## §1 Followups owned (per coordination scaffold §1)

- **MB-F-MB-T08-ONBOARDING-RENDERER-MOUNT** (Tier 1, vision §8.1 ship-gate blocker). Bundle OnboardingModal into a production renderer + mount on first launch.
- **MB-F-CONSOLE-T03-SHELL-INTEGRATION** (Tier 1, vision §10.10 ship-gate blocker). Mount the console-panel renderer inside `workstation-shell.html` so menu-driven `console:open` actually renders.

## §2 Files owned + files NOT owned

**Owned:**
- `packages/dispatch-workstation/src/onboarding/*` (existing component, mount integration extended)
- `packages/dispatch-workstation/src/console-panel/*` (existing, repurposed mount path; do NOT modify component logic, only mount path)
- `packages/dispatch-workstation/scripts/build-onboarding.mjs` (new)
- `packages/dispatch-workstation/onboarding.html` (new — package-root HTML for the modal renderer)
- `packages/dispatch-workstation/src/main/onboarding-mount.ts` (new)
- `packages/dispatch-workstation/src/main/console-mount.ts` (new)
- `packages/dispatch-workstation/test/unit/wiring-mounts/*` (new test directory)
- `packages/dispatch-workstation/package.json` (only `build` script line)
- `docs/cairn-coordination/batch-6/session-C-wiring-mounts.md` (this file)
- `docs/FOLLOWUPS.md` (only the resolution lines for the two followups owned)

**Shared (per main.ts coord contract §2 of scaffold):**
- `packages/dispatch-workstation/src/main/main.ts` — owned regions: TWO sentinel-marked blocks
  ```
  // === Onboarding mount (Session C / Batch 6 / wiring-mounts) ===
  // === end Onboarding mount ===

  // === Console mount (Session C / Batch 6 / wiring-mounts) ===
  // === end Console mount ===
  ```
  Other lines untouched. Session B's `// === MB-T07 card wiring ===` region is read-only to me.
- `packages/dispatch-workstation/src/main/workstation-shell.html` — owned edit: NEW `#console-tile-region` block placed between the existing `#kanban-region` and `#splitter`. Session B's edit (the `preload` attribute on the existing `<webview id="kanban-webview">`) is disjoint.

**Explicitly NOT owned:**
- `packages/dispatch-workstation/src/main/spawn-*` (Session A)
- `packages/dispatch-workstation/src/main/binary-resolver.ts` (Session A new file)
- `packages/dispatch-workstation/src/main/card-*` (Session B)
- `packages/dispatch-workstation/src/main/coarchitect-ipc.ts` (Session B)
- `packages/dispatch-workstation/src/main/http-daemon-client.ts` (Session B)
- `packages/dispatch-workstation/scripts/build-card-bridge.mjs` (Session B new file)
- Any `docs/cairn-coordination/batch-6/session-{A,B}-*` file (read-only)

## §3 main.ts coord contract status

Confirmed. I am the SECOND session to commit to main.ts. Discipline:

1. All non-main.ts work commits + pushes per-commit, normal flow.
2. main.ts edit lands in its own commit; pre-push gate halts until operator-relay confirms Session B has merged to origin/main.
3. After confirmation: `git fetch origin && git rebase origin/main`. Verify Session B's `// === MB-T07 card wiring ===` region present after rebase. Verify both my sentinel regions present after rebase. Then push.
4. If rebase reports conflicts in main.ts: HALT, surface, do NOT resolve unilaterally.

`git status --short` pre-stage on every commit. Per-path `git add <path>`. Post-commit `git log -1 --stat` verification.

## §4 Cross-session findings

### Finding C-1 (2026-05-03) — pre-existing test baseline

`pnpm --filter dispatch-workstation test` shows 232/233 tests passing with two failure modes that REPRODUCE on pristine HEAD (b74954b RED commit) when my GREEN files are stash-popped:

1. `test/unit/coarch-t04/build-doc-validator.spec.ts` — `Cannot find package 'dispatch-core/dist/v3/schema.js'`. Already documented in `docs/FOLLOWUPS.md` as `MB-F-MB-T05-PRE-EXISTING-VALIDATOR-IMPORT` (cited at FOLLOWUPS.md:117). Not Session-C territory; surfaced for completeness.
2. `test/integration/mb-t04/spawn-modal-emits-intent.test.ts` — timeout waiting for `SPAWN_REQUESTED` sentinel; stdout shows the app boots cleanly through SHELL_READY / RENDER_OK / WINDOW_READY but the spawn modal interaction never produces the expected IPC fire. UNDOCUMENTED in FOLLOWUPS.md as far as I can tell — appears to be uncaptured pre-existing flake / regression on origin/main. Likely Session-A territory (spawn-* family) or batch-7+ orchestration. Recommendation: file as `MB-F-MB-T04-SPAWN-MODAL-INTEGRATION-FLAKE` for arbitration if it's not already on operator-relay's radar.

Neither failure is caused by Session-C changes. Both reproduced on pristine HEAD via `git stash` round-trip.

### Finding C-2 (2026-05-03) — line-level edits to ancillary shared files

Session-C's GREEN for MB-F-MB-T08-ONBOARDING-RENDERER-MOUNT touches two files NOT explicitly listed in the §1 owned-files territory fence:

- `packages/dispatch-workstation/package.json` — appended `node scripts/build-onboarding.mjs` to the `build` script (one line, additive). This was named in the prompt §2 as "owned (only build script line)". So this is in scope.
- `packages/dispatch-workstation/tsconfig.json` — added `src/onboarding/mount.tsx` to the `exclude` array, mirroring the existing `src/onboarding/onboarding-modal.tsx` entry. NOT in the prompt's owned list. Necessary because tsc has no `--jsx` flag set (esbuild handles JSX); without the exclude, mount.tsx fails typecheck with `--jsx` not set.

Sessions A and B do not edit these files per scaffold §1 (Session A's territory is spawn-*; Session B owns card-* + http-daemon-client + coarchitect-ipc + new build-card-bridge.mjs). Surfacing as a finding so operator-relay can flag if a stricter file-level fence was intended; the edits are surgical, additive, and pattern-matching existing entries.

### Finding C-3 (2026-05-03) — coord scaffold §0.4 status (sibling sessions)

At session-C start, neither `session-A-wiring-spawn.md` nor `session-B-wiring-cards.md` was present in `docs/cairn-coordination/batch-6/`. Operator confirmed §0 satisfied in launch instructions; Session C interpreted this as authorization to create its own coord file from the §3 template as the session-start act. Sibling sessions presumably do the same. No action required; surfaced for awareness since scaffold §0.4 named operator pre-flight creation.

### Finding C-4 (2026-05-03) — onboarding.html source location

Prompt §1 + §2 owned-files list both name the new HTML at `packages/dispatch-workstation/onboarding.html` (package root). Session C placed it at `packages/dispatch-workstation/src/onboarding/onboarding.html` instead, following the existing `src/console-panel/console-panel.html` precedent (src as source-of-truth, dist as build-output). Build script copies src → dist on every build, so loadFile() at runtime still resolves to dist/onboarding/onboarding.html. If operator preference is the literal package-root location named in the prompt, refactor is one-file move + one-line edit in build-onboarding.mjs. Surfacing for confirmation.

### Finding C-5 (2026-05-03) — Console mount production wiring deferral

`mountConsoleTileGrid(deps)` is unit-tested as a fully observable factory (subscribes to onPanelOpen / onPanelClose, dispatches console-tile:show / console-tile:hide IPC, emits CONSOLE_TILE_GRID_MOUNTED sentinel, returns idempotent dispose). Production wiring of the panel-event SOURCE for those subscriptions is blocked in v3.0 because:

- `ConsoleIpcController` (in `src/main/console-ipc.ts`) does not surface a panel-state observer (no `onPanelOpen`/`onPanelClose` events).
- The menu open-trigger callback (`refreshConsoleMenu`'s `onOpen`) lives in main.ts at line ~104, OUTSIDE Session-C's sentinel-marked region. Modifying it to dispatch panel-events would touch shared territory.
- `console-ipc.ts` is not in any session's owned-files list per scaffold §1; modifying it requires operator-relay arbitration.

v3.0 ship-gate workaround: the workstation-shell.html inline script subscribes to `window.consoleBridge.onConsoleOpen` / `.onConsoleClose` DIRECTLY and toggles `#console-tile-region` visibility. This satisfies the followup acceptance ("console panel renders in shell when operator opens via menu") via the existing `console:open` IPC the controller already emits to the webview. The `console-tile:show` / `console-tile:hide` channels that `mountConsoleTileGrid` would dispatch in main.ts are RESERVED for MB-T12 multi-panel tiling, where per-tile mount/unmount inside `#console-tile-grid` will require main-process orchestration.

Production main.ts therefore wires `mountConsoleTileGrid` with NO-OP panel-event sources (`onPanelOpen: () => () => {}`, `onPanelClose: () => () => {}`) and live `sendToShell` + `emitTestSentinel`. The CONSOLE_TILE_GRID_MOUNTED sentinel still fires for smoke-harness validation. MB-T12 will (a) extend `ConsoleIpcController` with panel-event observability AND/OR (b) refactor the menu callback wiring so panel events flow into the registry the Console mount region exposes.

No operator action required; surfacing as a documented v3.0 → MB-T12 deferral.

### Finding C-6 (2026-05-03) — `test/integration/app-launches-clean.test.ts` regression + fix

The new production-onboarding-modal path in main.ts (Session-C edit) caused a regression in `test/integration/app-launches-clean.test.ts`: with no MB_TEST_HOOKS and no pre-existing onboarding config, the integration test booted electron, hit the new modal-open path, and timed out waiting for `WINDOW_READY` (which fires after `createWindow()`, which now runs only after onboarding completes).

Fix landed in this batch: pre-populate `MB_ONBOARDING_STATE_DIR` with `{ onboardingCompleted: true }` in the test env so the onboarding mount short-circuits and the test simulates a returning (already-onboarded) operator. Preserves test intent ("does the app launch cleanly?") with semantic precision (clarifying the test is about the post-onboarding shell launch, not the first-launch path which is now covered by `test/unit/wiring-mounts/test_run_onboarding_if_needed.spec.ts`).

`test/integration/app-launches-clean.test.ts` is not explicitly named in any session's owned-files list per scaffold §1. Edit is minimal: 3 added imports + 8 lines pre-populating the temp config dir + 4 lines extending the env. No semantic change to the test assertion.

### Finding C-7 (2026-05-03) — HALT-STATE: main.ts push gated on Session B merge

**Status:** Session-C's main.ts edit is committed locally (held) and ready to push. Per scaffold §3 (this session) / §2.2 of the coordination scaffold, Session-C is the SECOND committer to main.ts. The push is gated on operator-relay confirmation that Session B's branch (`session-B/wiring-cards`) has merged to `origin/main`.

**What's ready locally:**
- All non-main.ts work pushed: `9c5db39` (coord) → `b74954b` (T08 RED) → `36fb54f` (T08 GREEN) → `8a5bec6` (CONSOLE-T03 RED) → `18fec6e` (CONSOLE-T03 GREEN). Plus the coord+test-fix commit landing alongside this finding.
- main.ts commit held locally on `session-C/wiring-mounts`. Two sentinel-marked regions (`// === Onboarding mount ===`, `// === Console mount ===`) plus three small ancillary edits (sentinel-marked imports, sentinel-marked preload-path const).

**Pre-push protocol (when operator-relay clears):**
1. `git fetch origin && git rebase origin/main`
2. Verify Session B's region present: `grep "MB-T07 card wiring" packages/dispatch-workstation/src/main/main.ts` returns the sentinel block. If not — HALT, surface "rebase did not pull Session B's region; conflict?"
3. Verify my regions present: `grep "Onboarding mount\|Console mount" packages/dispatch-workstation/src/main/main.ts` returns both.
4. Re-run `pnpm --filter dispatch-workstation typecheck` + targeted `test test/unit/wiring-mounts test/integration/app-launches-clean.test.ts` to confirm rebase didn't break anything.
5. `git push origin session-C/wiring-mounts`.

**Operator-relay arbitration request:** Session B's main.ts edit landed on origin/main? Ready to rebase + push? If conflicts surface during rebase, HALT and re-surface — do NOT resolve unilaterally.

**Halt discipline (§3.7):** While waiting, no reads, no file inventories, no preparatory absorption. Session-end summary in §5 populates AFTER the main.ts push lands.

### Finding C-8 (2026-05-03) — package.json append-collision (rebase resolution arbitrated)

`git rebase origin/main` (post Session-B merge at 41786a5) produced a conflict on the FIRST commit applied (`36fb54f` MB-T08 GREEN) at `packages/dispatch-workstation/package.json` line 12 (`build` script). Both sessions appended a new build step to the same line:

- Session B: `&& node scripts/build-card-bridge.mjs`
- Session C: `&& node scripts/build-onboarding.mjs`

git could not auto-merge because both edits share the same lineage point on a single line. **Resolved (operator-arbitrated):** both-sessions-append, alphabetical (`build-card-bridge` before `build-onboarding`) — both produce independent dist artifacts, both are required at runtime, ordering is semantically arbitrary. Resolution commit: `a89e52a` (replaces `36fb54f`).

**Coord-model gap exposed:** scaffold §1 listed `package.json` in BOTH sessions' owned-files lists scoped to "only the `build` script line", but the §2.1 sentinel-region pattern was named only for `main.ts` and `workstation-shell.html`. Single-line shared resources like a `build` script have no sentinel surface available; both sessions appending unilaterally produced a deterministic conflict that no contract enforcement caught.

**Post-merge followup recommendation:** scaffold §1 should grow an explicit "append-shared-line" pattern for single-line shared resources (build scripts, lockfile package lists, single-string config values).

### Finding C-9 (2026-05-03) — main.ts import-block append-collision (rebase resolution arbitrated)

After resolving C-8 and continuing the rebase, the LAST commit applied (`dc38316` main.ts) produced a conflict at `packages/dispatch-workstation/src/main/main.ts` lines 27-40 (imports section). Both sessions added new imports immediately after `saveApiKey` (line 26):

- Session B: `import { wireCardIpc } from './card-wiring.js';` (bare import, no sentinel wrapper)
- Session C: three sentinel-marked import groups (Onboarding mount imports — three named exports from onboarding-mount.js; Console mount imports — single named export from console-mount.js)

The function-body sentinel regions DID work as designed:
- Session B's `// === MB-T07 card wiring ===` block at lines 154-156 (wireCardIpc call inside app.whenReady) — distinct from my regions
- My `// === Onboarding mount ===` region replaces the legacy isFirstLaunch sentinel block — distinct
- My `// === Console mount ===` region after `refreshConsoleMenu([])` — distinct
- All three function-body regions textually disjoint, no conflict in the function body

**The gap:** scaffold §2.1's sentinel-pattern guidance named function-call regions inside `app.whenReady().then(...)`. It did NOT name top-of-file imports/exports as sentinel-eligible regions. Session B's `import { wireCardIpc }` was a bare unsentinel-wrapped insert; my sentinel-marked groups landed at the same lineage point.

**Resolved (operator-arbitrated):** both-sessions-append, B's bare import preserved verbatim + C's three sentinel groups appended in their original order. Resolution commit: `60058a1` (replaces `dc38316`).

**Same class as C-8** — two sessions appending to a shared lineage point neither was warned about. Same coord-model gap (sentinel pattern scoped too narrowly).

**Post-merge followup recommendation:** scaffold §2.1 needs explicit sentinel-pattern guidance for top-of-file shared regions (imports, exports, top-level constants).

### Rebase verification (post-conflict resolution)

Branch state after rebase: 7 commits cleanly applied onto `origin/main` (HEAD `41786a5` Session-B merge):

```
60058a1 green(main.ts): Onboarding + Console mount sentinel regions
d1b1c66 coord(session-C): halt-state surface + app-launches-clean test fix
7bd0199 green(MB-F-CONSOLE-T03-SHELL-INTEGRATION): tile region + mount factory
b78d8be red(MB-F-CONSOLE-T03-SHELL-INTEGRATION): tile region + mount factory
a89e52a green(MB-F-MB-T08-ONBOARDING-RENDERER-MOUNT): orchestration + bundle  [package.json resolution applied]
93c474b red(MB-F-MB-T08-ONBOARDING-RENDERER-MOUNT): wiring-mounts unit specs
fc2543f coord(session-C): batch-6 wiring-mounts session-start
```

Sentinel-region grep verification (post-rebase main.ts):
- B region present: line 167 `// === MB-T07 card wiring (Session B / Batch 6 / wiring-cards) ===`
- C regions present (5 sentinel groups): lines 28 (Onboarding imports), 35 (Console imports), 42 (Onboarding preload const), 172 (Onboarding mount block), 202 (Console mount block)

Test count: 289 / 290 (1 fail + 1 file failure = both pre-existing, coord §4 C-1 baseline). Up from 243/244 pre-rebase due to Session B's merge contributing ~46 new passing tests. Typecheck clean.

## §5 Session-end summary

**Session:** Batch 6 — Session C — wiring-mounts. **Wall-clock:** ~2h 2026-05-03 22:18 → 2026-05-03 23:35 (single sitting; no cross-session pause beyond the §3 main.ts push gate). **Branch:** `session-C/wiring-mounts`, force-pushed post-rebase to `194226c` on top of `origin/main` HEAD `41786a5` (Session-B merge).

### Final commit list (post-rebase, 8 commits)

```
194226c coord(session-C): add C-8 + C-9 rebase-resolution findings
60058a1 green(main.ts): Onboarding + Console mount sentinel regions
d1b1c66 coord(session-C): halt-state surface + app-launches-clean test fix
7bd0199 green(MB-F-CONSOLE-T03-SHELL-INTEGRATION): tile region + mount factory
b78d8be red(MB-F-CONSOLE-T03-SHELL-INTEGRATION): tile region + mount factory
a89e52a green(MB-F-MB-T08-ONBOARDING-RENDERER-MOUNT): orchestration + bundle
93c474b red(MB-F-MB-T08-ONBOARDING-RENDERER-MOUNT): wiring-mounts unit specs
fc2543f coord(session-C): batch-6 wiring-mounts session-start
```

Plus this session-end-summary commit landing on top.

### Followups closed

- **MB-F-MB-T08-ONBOARDING-RENDERER-MOUNT** (Tier 1, vision §8.1 ship-gate). Bundle + mount on first launch. RED at 93c474b, GREEN at a89e52a.
- **MB-F-CONSOLE-T03-SHELL-INTEGRATION** (Tier 1, vision §10.10 ship-gate). Tile region in shell, single-panel-in-shell. RED at b78d8be, GREEN at 7bd0199. Multi-panel tiling deferred to MB-T12 (re-scope) per finding C-5 — honest framing: "console panel renders in shell when operator opens via menu; spawn-auto-mount + multi-panel are downstream tickets".

### Test counts

- **Pre-rebase Session-C-only:** 21/21 wiring-mounts unit specs GREEN; full dispatch-workstation suite 243/244 (2 pre-existing failures unchanged from C-1 baseline).
- **Post-rebase merged:** 289/290 (1 fail + 1 file failure = both pre-existing, C-1 baseline). Up from 243/244 due to Session B's merge contributing ~46 new passing tests.
- **New tests added by Session C:** 21 (wiring-mounts unit specs across 5 files: test_check_first_launch / test_mount_onboarding_factory / test_run_onboarding_if_needed / test_shell_has_console_tile_region / test_mount_console_tile_grid).
- **Pre-existing failures (unchanged):**
  - `test/unit/coarch-t04/build-doc-validator.spec.ts` — `MB-F-MB-T05-PRE-EXISTING-VALIDATOR-IMPORT` (FOLLOWUPS.md:117)
  - `test/integration/mb-t04/spawn-modal-emits-intent.test.ts` — undocumented baseline flake (filed as cross-session finding C-1; recommend `MB-F-MB-T04-SPAWN-MODAL-INTEGRATION-FLAKE`)

### Halt-discipline events

1. **C-7 halt (~22:55–23:30):** main.ts push gated on Session B merge per scaffold §3. Surface posted in coord §4 finding C-7 + via this conversation channel. Operator-relay confirmed Session B merged at 41786a5; cleared to proceed with rebase.
2. **C-8 conflict halt (~23:32):** rebase produced unexpected conflict on `package.json` `build` script (both sessions appended). Surfaced full conflict output, did NOT resolve unilaterally. Operator-relay arbitrated both-sessions-append, alphabetical (card-bridge before onboarding). Resolved at a89e52a.
3. **C-9 conflict halt (~23:33):** rebase produced unexpected conflict on `main.ts` imports section (both sessions added new imports at the same lineage point). The function-body sentinel pattern WORKED — only the import section was unprotected. Surfaced full conflict output, did NOT resolve unilaterally. Operator-relay arbitrated both-sessions-append, B's bare import preserved + C's three sentinel groups appended. Resolved at 60058a1.
4. **Force-push gate (~23:38):** rebase publish naturally requires `--force-with-lease`. Per Bash safety protocol, surfaced + awaited authorization despite the rebase workflow being implicitly authorized. Operator confirmed; pushed.

### Cross-session findings filed

- **C-1** Pre-existing test baseline (build-doc-validator import + spawn-modal-emits-intent timeout; both reproduce on pristine HEAD).
- **C-2** Line-level edits to ancillary shared files (`package.json` build script line — explicitly owned per prompt; `tsconfig.json` exclude list — surgical additive entry mirroring existing pattern, not in prompt's owned list).
- **C-3** Coord scaffold §0.4 sibling-session coord-file gap (Session-A and Session-B coord files not created pre-flight; Session-C created its own from §3 template).
- **C-4** `onboarding.html` source location (placed at `src/onboarding/onboarding.html` per console-panel precedent, not at the literal package-root path named in prompt).
- **C-5** Console mount production wiring deferral. `mountConsoleTileGrid` unit-tested as observable factory; production wires NO-OP panel-event sources because `ConsoleIpcController` doesn't surface panel-state observers and the menu callback wiring lives outside Session-C territory. v3.0 single-panel-in-shell ship-gate satisfied via shell's inline-script subscription on `consoleBridge.onConsoleOpen`. Operator-arbitrated: matches MB-T12 deferral in re-scope doc.
- **C-6** `test/integration/app-launches-clean.test.ts` regression introduced by new production-onboarding-modal path; fixed via `MB_ONBOARDING_STATE_DIR` pre-population (simulates returning operator). Operator-arbitrated: accepted.
- **C-7** HALT-STATE: main.ts push gated on Session B merge. Cleared.
- **C-8** `package.json` append-collision during rebase. Operator-arbitrated: both-sessions-append, alphabetical. Post-merge followup: scaffold §1 needs an "append-shared-line" pattern.
- **C-9** `main.ts` imports section append-collision during rebase. Operator-arbitrated: both-sessions-append, B's bare import preserved + C's sentinel groups appended. Post-merge followup: scaffold §2.1 needs explicit sentinel guidance for top-of-file shared regions.

### Honest framing per §5 of launch instruction

- **MB-F-MB-T08-ONBOARDING-RENDERER-MOUNT:** vision §8.1 ship-gate satisfied for the API-key path. Project-list config remains a separate followup (MB-F-MB-T08-VISION-PROJECT-LIST-CONFIG, operator-arbitrated path A vs B per FOLLOWUPS.md:75).
- **MB-F-CONSOLE-T03-SHELL-INTEGRATION:** ships single-panel-in-shell capability. Multi-panel tiling deferred to MB-T12 (re-scope batch 10). Console panel renders in shell when operator opens console via menu; spawn-auto-mount + multi-panel are downstream tickets.

### Sentinel-region post-mortem

The function-body sentinel pattern HELD perfectly across both sessions: B's `// === MB-T07 card wiring ===` block, my Onboarding mount block, and my Console mount block were textually disjoint and merged without conflict. The two collisions (C-8 + C-9) occurred at lineage points the scaffold §2.1 didn't address: a single-line build script (no sentinel surface available) and the imports section (sentinels named for function-body regions only). Both classes of gap surfaced as operator-arbitration moments rather than session errors.

### Halt for operator merge

Session-C work ships at `194226c` on `origin/session-C/wiring-mounts`. Per scaffold §4 / launch §4, this is the third and final batch-6 merge. Halting per §3.7 discipline: no other work, no context absorption for next batch. Awaiting operator merge.
