# MB-F-WORKTREE-FRESH-MISSING-DIST-CRASH — build doc

**Closure target**: FOLLOWUPS.md row 155 (Tier 1).
**Closure session**: SESSION-r12-t1c-w1-worktree-fresh-dist.
**Wave**: T1-CLOSURE-Wave-1 refill cycle 2 (gen-6 22-hour max-throughput 2026-05-16).
**Ladder commits**: `3005743` (WB1 green) + `0dac630` (WB2 green) + WB-final stamp.

---

## 1. Failure mode

Fresh worktrees created via `git worktree add <path> <branch>` reuse the pnpm store from
the primary working tree. `pnpm install` is never invoked on the new worktree because
node_modules symlinks already resolve through the shared `.pnpm-store`. As a result, the
row-172 closure (`packages/dispatch-core/package.json` `postinstall: tsc`) does NOT fire
on worktree creation, and `packages/dispatch-core/dist/` stays absent.

Any workstation test that imports through `dispatch-core/dist/v3/schema.js` then crashes
at module-resolution time on the fresh worktree until a developer manually runs `pnpm
--filter dispatch-core build`.

Original row 155 mitigation was operator-side: spawn CC into worktrees that already had
dispatch-core/dist/ pre-built. That removed the symptom from the CC-facing path but left
the trap in place for any direct developer use of `git worktree add`.

## 2. Closure mechanism

Two layers, composing with the row-172 closure across two pnpm lifecycle keys:

| Lifecycle key | Fires on | Closes | Anchor file in pkg.json |
|---|---|---|---|
| `postinstall` | `pnpm install` (post-clone, post-pull) | row 172 | `"postinstall": "tsc"` |
| `pretest` | `pnpm test` (per-package or via `pnpm -r test`) | row 155 | `"pretest": "bash ../../scripts/worktree-fresh-dist-prebuild.sh"` |

The two keys are independent (different lifecycle hooks); both live in
`packages/dispatch-core/package.json` without overlap.

### 2.1 Helper script — `scripts/worktree-fresh-dist-prebuild.sh`

```text
1. Resolve REPO_ROOT from script location (cwd-independent).
2. ANCHOR := packages/dispatch-core/dist/v3/schema.js
3. If ANCHOR is absent → rebuild via `pnpm --filter dispatch-core build`.
   Else if any file under packages/dispatch-core/src/ is newer than ANCHOR → rebuild.
   Else → no-op (log "dist fresh; skipping rebuild").
```

The anchor is `dist/v3/schema.js` because that is the artifact cited in row 155's body as
the import-time crash anchor. `find -newer <anchor>` compares src file mtimes against the
anchor's mtime; matches the row body's "older than src/" criterion verbatim.

Production rebuild command is `pnpm --filter dispatch-core build`, which runs `tsc` (the
existing `build` script). Helper accepts `WFD_CORE_DIR` / `WFD_SRC_DIR` / `WFD_ANCHOR` /
`WFD_BUILD_CMD` env-var overrides for testability (consumed by probe-mbfwfd-02).

### 2.2 Package.json wiring

```diff
   "scripts": {
     "test": "vitest run --passWithNoTests",
+    "pretest": "bash ../../scripts/worktree-fresh-dist-prebuild.sh",
     "typecheck": "tsc --noEmit",
     "build": "tsc",
     "postinstall": "tsc",
```

## 3. Verification matrix [KNOWN 2026-05-16]

| Check | Result |
|---|---|
| WB1 RED — probe-mbfwfd-01, no pretest key | 2/3 fail (pretest undefined); regression guard 1/3 green |
| WB1 GREEN — probe-mbfwfd-01 after edit | 3/3 pass |
| WB2 GREEN — probe-mbfwfd-02 (4 branches) | 4/4 pass (anchor-absent, fresh-skip, src-newer, syntax-check) |
| Full dispatch-core suite | 221/221 (217 prior + 4 new probe-02) |
| Live fresh-worktree simulation | anchor moved → helper detected absent → `tsc` ran → anchor restored |
| `pnpm --filter dispatch-core typecheck` | CLEAN |
| `pnpm --filter dispatch-daemon typecheck` | CLEAN |
| `pnpm --filter dispatch-workstation typecheck` | CLEAN |
| `pnpm --filter dispatch-cli typecheck` | CLEAN |
| `pnpm --filter dispatch-web typecheck` | CLEAN |

## 4. Operational notes

- Helper logs branch decisions to stderr — visible in `pnpm test` output when developers
  invoke tests; surfaces "skipping rebuild" or "rebuilding dispatch-core" so the freshness
  check is observable, not invisible.
- Overhead when dist is fresh: one `find -newer -print -quit` call (~10ms on macOS APFS
  for ~100 src files). Acceptable per-test-invocation cost.
- Overhead when rebuild fires: ~2s `tsc` invocation. Identical to the cost the row-172
  postinstall pays on `pnpm install`. Only occurs once per worktree per `pretest` call
  until src changes again.
- Bash compatibility: bash 3.2+ (macOS default zsh users get bash via shebang).
  Verified against the WB-final live invocation from `packages/dispatch-core/` cwd.

## 5. Composition with row 172

Row 172 (`MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE`, RESOLVED `23f7c88` + `24c7d41`)
closed the *post-pull* and *post-clone* scenarios via `postinstall: tsc`. Row 155 closes
the orthogonal *fresh-worktree* scenario via `pretest: bash ../../scripts/worktree-fresh-
dist-prebuild.sh`. The two are complementary, not duplicative:

- `pnpm install` (covered by row 172) is run on clone + after every pull (per typical
  workflow). Not run on `git worktree add` because the pnpm store is shared.
- `pnpm test` (covered by row 155) is the entry-point that crashes when dist is missing.
  Catching staleness at the test boundary closes the gap row 172 cannot reach.

If a user runs `pnpm install` on a fresh worktree manually (recommended in onboarding
docs), row 172's `postinstall` fires first and row 155's `pretest` then sees fresh dist
and no-ops. Both layers coexist with zero conflict.

## 6. References

- `docs/coordination/mb-f-worktree-fresh-missing-dist-crash-findings-2026-05-16.md` — closure findings.
- `docs/coordination/mb-f-worktree-fresh-missing-dist-crash-decisions-2026-05-16.md` — Q-WTFD-1/2/3 disposition reasoning.
- `docs/coordination/mb-f-worktree-fresh-missing-dist-crash-impl-coord-2026-05-16.md` — cross-session observations.
- `docs/coordination/mb-f-dispatch-core-post-pull-rebuild-discipline-findings-2026-05-16.md` — sibling closure precedent (row 172).
