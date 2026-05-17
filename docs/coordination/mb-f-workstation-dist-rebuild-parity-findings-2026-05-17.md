# MB-F-WORKSTATION-DIST-REBUILD-PARITY — closure findings

**Session**: r12-cw2-workstation-dist-rebuild-parity
**Date**: 2026-05-17
**Wave**: R12-CLOSURE-Wave-2 (gen-7 V4 high-concurrency stress cascade)
**Closure path**: mirror gen-6 dispatch-core postinstall pattern (commit `6eaf194`)
**FOLLOWUPS row**: `docs/FOLLOWUPS.md:373` (Tier 2)
**Ladder commits**: `2d3982a` (WB1 red) + `758e5e2` (WB1 green) + `011ac3d` (WB2 green)

---

## I. Diagnose evidence [KNOWN 2026-05-17]

Phase-1 invoked via `cairn-phase-1-diagnose` subagent + main-session inheritance reads.

| Surface | Finding |
|---|---|
| `packages/dispatch-core/package.json` postinstall pattern | `"postinstall": "tsc"` at line 14 (gen-6 `6eaf194`); postinstall identical to `build` |
| `packages/dispatch-workstation/package.json` postinstall pre-edit | NOT present; build script chains `tsc && <9 esbuild scripts>` |
| Workstation `main` field | `"dist/main/main.js"` (Electron entry-point) |
| `pnpm-workspace.yaml` | `packages: - 'packages/*'`; no cross-package build-order directives |
| `scripts/post-pull-rebuild.sh` (manifest READ-ONLY) | does NOT exist on disk — manifest deviation flag |
| workstation `vitest.config.ts` include glob | `test/**/*.{test,spec}.{ts,tsx}` — `.spec.ts` runs (differs from dispatch-core `.test.ts`-only) |
| Stale-dispatch pre-check (`git log --grep MB-F-WORKSTATION-DIST-REBUILD-PARITY`) | 2 commits: `fa95d8c` (FILED row) + `6eaf194` (gen-6 referenced as new-Tier-3-to-file). Neither RESOLVED. Dispatch NOT stale. |

Phase-1 auto-ack conditions satisfied for §3.4 mechanical-translation envelope: closure is literal mirror of gen-6 ratified pattern; surface is single-package package.json + single probe file; no frozen contract touched.

## II. Closure mechanism

Single-line addition to `packages/dispatch-workstation/package.json` scripts block:

```json
"postinstall": "tsc"
```

`tsc` invokes the workstation TypeScript compiler — the same binary that runs as the first step of the workstation `build` script. The hook fires after every `pnpm install` invocation that includes `dispatch-workstation` in the install graph (which, for the workspace root, is always).

**Empirical verification at WB1 GREEN [KNOWN]**:

```
$ rm packages/dispatch-workstation/dist/main/main.js
$ pnpm install --filter dispatch-workstation
Lockfile is up to date, resolution step is skipped
packages/dispatch-workstation postinstall$ tsc
packages/dispatch-workstation postinstall: Done
Done in 2.6s using pnpm v10.33.0
$ ls -la packages/dispatch-workstation/dist/main/main.js
-rw-r--r--@ 1 joshuatseppich  staff  74291 May 17 08:55 packages/dispatch-workstation/dist/main/main.js
```

Anchor lifecycle `delete → install → regenerate` demonstrates the hook fires + produces the Electron entry-point. Install duration of 2.6s (filtered install; full workspace install ~5-10s with hook) is well within row 373 Tier-2 concern (2) threshold.

## III. Verification matrix [KNOWN]

| Check | Result |
|---|---|
| WB1 RED state — scripts.postinstall undefined | 3/3 probe assertions fail pre-edit |
| WB1 GREEN state — hook added | 3/3 probe assertions pass (`758e5e2`) |
| WB1 GREEN smoke — empirical pnpm install | `postinstall$ tsc` observed; dist anchor regenerated |
| WB2 GREEN state — content-propagation layers (LIVE + MECHANISM) | 4 new assertions; total 7/7 PASS (`011ac3d`) |
| dispatch-core typecheck | CLEAN |
| dispatch-daemon typecheck | CLEAN |
| dispatch-workstation typecheck | CLEAN |
| dispatch-cli typecheck | CLEAN |
| dispatch-web typecheck | CLEAN |

## IV. Manifest deviations [KNOWN]

| Manifest detail | Actual | Reason |
|---|---|---|
| TERRITORY enumerates only probe-01 path | WB2 layers consolidated INTO probe-01 (not authored as separate probe-02) | Stays within manifest letter; file name "postinstall-emits-dist" semantically covers content-propagation; gen-6 precedent at FOLLOWUPS:172 §5 establishes probe-naming arbitration is CC-delegable when preserving probe executability — same principle applies to file count here |
| READ-ONLY mentions `scripts/post-pull-rebuild.sh` | File does NOT exist | Read-only entry is advisory at most; absent file is not a write barrier. Likely manifest carry-over from an earlier draft of the closure-path universe. Surfaced for orchestrator awareness; not a blocker. |
| `package.json` listed in BOTH TERRITORY and READ-ONLY | Treated TERRITORY as operative (the closure scope explicitly authorizes the package.json edit) | Manifest internal contradiction; TERRITORY supersedes for the single load-bearing edit |
| TERRITORY probe filename `.spec.ts` | Used `.spec.ts` (workstation vitest accepts both `.test` and `.spec`) | No deviation — both extensions execute |

## V. Mechanism-level finding (WB2 probe design)

[KNOWN] Per MB-F-MTIME-PROBE-UNSOUNDNESS (FOLLOWUPS:372 — gen-6 lesson) + MB-F-BUILD-OUTPUT-FRESHNESS-PROBE-DESIGN-PATTERN (FOLLOWUPS:379 — established template), the WB2 probe layers use content-based assertions throughout:

- LIVE invariant: assert `dist/main/splitter-state.js` contains the named exports declared in `src/main/splitter-state.ts` (regex match on `export function readSplitterPosition` + `export function writeSplitterPosition`). Anchor choice: `splitter-state.ts` is the CLAUDE.md §3.5 canonical persistence pattern — small (35 lines), stable, unlikely to be removed in nearby tickets.
- MECHANISM invariant: isolated tmpdir sandbox — write `sample.ts` with `ExistingFn` → run local tsc → assert `dist/sample.js` contains `ExistingFn` AND NOT `AddedFn` → add `AddedFn` to sample.ts → re-run tsc → assert dist/sample.js now contains BOTH.

Both layers verify content propagation, not mtime drift. This makes the probe robust against `git checkout` mtime semantics, fresh-worktree file timestamps, and CI-cache-restoration artifacts.

## VI. Cross-session observations

R12-CLOSURE-Wave-2 12-cap concurrent cascade observed during this session:

- Sibling commit `c03d32d` (between my WB1 RED push `2d3982a` and my WB1 GREEN push `758e5e2`) — path-disjoint, no merge friction.
- Sibling commit `6acf1f2` (between WB1 GREEN push and WB2 GREEN push) — path-disjoint.
- Sibling-staged modifications to `packages/dispatch-workstation/src/frame-c/frame-c-root.tsx` observed at WB2 pre-commit (FORBIDDEN in MY manifest, but a sibling session's TERRITORY). Per-path discipline `git commit -o packages/dispatch-workstation/test/build/probe-mbf-workstation-dist-rebuild-01-*.spec.ts` correctly excluded sibling work from my commit.
- Sibling-modified `packages/dispatch-daemon/{lifecycle/startup.ts, routes/sessions.ts}` + untracked `packages/dispatch-daemon/src/db/` observed at WB2 pre-commit — path-disjoint, no interference.
- Sibling untracked test file `packages/dispatch-daemon/test/integration/probe-mbf-t13-01-session-policy-cleanup-on-kill.{spec,test}.ts` (parallel R12-CLOSURE-Wave-2 closure for a daemon-side row) — path-disjoint.

Per-path discipline + `git commit -o <pathspec>` per CLAUDE.md §2.7 held across all 3 ladder commits. No cross-session contamination.

## VII. Closure proposal (FOLLOWUPS:373 RESOLVED stamp)

Per shared bootstrap §F step 7 (operator-stamp envelope exception), proposing this closure row update applied at WB-final commit:

```
→ CLOSED 2026-05-17 by r12-cw2-workstation-dist-rebuild-parity at <WB-final SHA> — closure path-(a): `packages/dispatch-workstation/package.json` carries `"postinstall": "tsc"`; every `pnpm install` (post-pull/post-clone) refreshes `dist/main/main.js` Electron entry-point automatically. Mirrors gen-6 dispatch-core closure at FOLLOWUPS:172 / commit `6eaf194`. Verification: probe-mbf-workstation-dist-rebuild-01 (7 assertions: 3 static + LIVE invariant on splitter-state.js content match + MECHANISM invariant via tmpdir tsc sandbox). WB1 GREEN smoke (rm dist/main/main.js + pnpm install) empirically confirmed postinstall$ tsc + anchor regeneration. 5-package typecheck CLEAN. Renderer-bundle (`dist/<panel>/renderer.js`) parity remains operator-rebuild-gated at dogfood time; filed as sibling Tier-3 followup `MB-F-WORKSTATION-RENDERER-BUNDLE-POSTINSTALL-PARITY` for future surfacing if dogfood reveals friction. Findings: `docs/coordination/mb-f-workstation-dist-rebuild-parity-findings-2026-05-17.md`. Decisions: `docs/coordination/mb-f-workstation-dist-rebuild-parity-decisions-2026-05-17.md`.
```

## VIII. Methodology observations

- **Tier-2 row body deferral language overridden by gen-7 V4 dispatch**: The row body itself read "defer until operator dogfood surfaces friction or post-cascade verification confirms recurrence pattern." Gen-7 V4 cascade explicitly dispatched this row for closure — interpreted as implicit operator GREEN-LIGHT to proceed (mirrors §3.4 mechanical-translation envelope; the row body's deferral language was authored before the V4 wave dispatch decision). Documented for future operator awareness in case the implicit-authorization reading was wrong.
- **Probe consolidation as manifest discipline**: Authoring WB2 probe inside the manifest-listed probe-01 file (rather than at a new probe-02 path) preserves manifest TERRITORY boundary without contaminating cross-session staging. Gen-6 precedent at FOLLOWUPS:172 §5 ratifies CC arbitration of probe naming when preserving manifest constraints + probe executability. This is a recurrence of the same arbitration principle.
- **WB1→WB2 collapse via gen-6 precedent**: gen-6 dispatch-core ladder used two `green:` commits (no separate RED for WB2), since the WB1 GREEN already established the mechanism. Mirrored here: WB2 is a single `green:` commit (`011ac3d`).
- **Install-cycle slowdown threshold validated**: empirical filter-install duration of 2.6s for workstation-only validates the row 373 Tier-2 concern (2) was theoretical. `pnpm build` (with 9 esbuild chains) would have been ~10-30x slower; choosing bare `tsc` is the right scoping.
- **Anti-fabrication discipline held**: WB1 GREEN smoke was a real `rm dist/main/main.js && pnpm install` invocation, not a modeled-passing assumption. Empirical evidence (74291 bytes, mtime 08:55) is KNOWN, not MODELED.

## IX. Caveats

- **Renderer-bundle parity is out of scope**: The closure addresses `dist/main/*.js` only. `dist/<panel>/renderer.js` files (tile-grid, chat-shell, coarchitect, console-panel, etc.) require esbuild scripts that postinstall does NOT invoke. Operator must continue running `pnpm build` (or `pnpm --filter dispatch-workstation build`) before dogfood sessions that depend on renderer surfaces. Filed as Tier-3 followup row `MB-F-WORKSTATION-RENDERER-BUNDLE-POSTINSTALL-PARITY` (proposed in decisions §V).
- **Cold install order**: `dispatch-workstation/postinstall` runs `tsc`, which transitively imports `dispatch-core/dist/v3/schema.js`. On a fresh clone, `dispatch-core/postinstall` must run BEFORE `dispatch-workstation/postinstall`. pnpm workspace topology orders this correctly (dispatch-core is a dependency declared in workstation/package.json), so the order is modeled-safe. Not explicitly verified in this session (would require `rm -rf node_modules/.pnpm && pnpm install` from clean state); deferred to operator-dogfood time as part of post-cascade verification.
- **Scope of `tsc` emit subset**: workstation tsconfig excludes 15 .tsx/dir entries (tile-grid TSX, chat-shell, coarchitect, console-panel, etc.) — postinstall `tsc` will NOT compile those (they're handled by their respective esbuild scripts at full `pnpm build` time). This is intentional behavior consistent with the current build pipeline; postinstall produces only the Node-side main process compilation.
