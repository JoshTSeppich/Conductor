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

## §5 Session-end summary

(populated at session end)
