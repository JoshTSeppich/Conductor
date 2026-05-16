# MB-F-WORKTREE-FRESH-MISSING-DIST-CRASH — impl-coord doc

**Session**: SESSION-r12-t1c-w1-worktree-fresh-dist
**Date**: 2026-05-16
**Wave**: T1-CLOSURE-Wave-1 refill cycle 2

Cross-session coordination observations + impl-time gotchas surfaced during the closure.

---

## 1. Sibling-session activity during this closure

| Time | Commit | Session | Territory |
|---|---|---|---|
| ~17:46 (HALT 0) | `6eb35b9` | this session (gen-6 manifest landing) | docs/coordination/territorial-manifests/ |
| ~17:48 (WB1 push) | `3005743` | this session | dispatch-core/package.json + test + scripts/ |
| ~17:50 (interleave) | `8f4cb33` | kanban session | docs/coordination/territorial-manifests/ (EXPANSION-4 + EXPANSION-5) |
| ~17:50 (interleave) | `c79470f` | kanban session | packages/dispatch-web/ (WB1 RED) |
| ~17:50 (WB2 push) | `0dac630` | this session | dispatch-core/test/worktree-fresh-dist/ |

Sibling territory was disjoint: kanban session writes touched `packages/dispatch-web/`
and territorial-manifests, never `packages/dispatch-core/` or `scripts/`. Zero merge
friction; zero per-path-add cross-contamination risk realised.

## 2. Coordination with row-172 closure (sibling precedent)

Before editing `packages/dispatch-core/package.json`, READ
`docs/coordination/mb-f-dispatch-core-post-pull-rebuild-discipline-findings-2026-05-16.md`
in full. Key learnings absorbed:

- §2 closure mechanism — sibling shipped `"postinstall": "tsc"` in the same package.json
  file. My edit adds `"pretest"` immediately above it; both keys are independent.
- §4 mechanism-level finding — mtime-comparison probes for build-output freshness are
  unsound; use content-equivalence. Applied directly in probe-mbfwfd-02 design.
- §5 manifest deviation precedent — `.spec.ts` → `.test.ts` is CC-arbitrable when vitest
  config drives the constraint. Applied to both my probes.
- §9 methodology observation — postinstall hook adds ~2s to every install. My pretest
  hook adds ~10ms (find -newer -quit) on the no-op path + ~2s on the rebuild path. Both
  bounded; both acceptable.

The two closures explicitly compose; neither overwrites or invalidates the other. Both
keys ship side-by-side in package.json:

```json
"scripts": {
  "test": "vitest run --passWithNoTests",
  "pretest": "bash ../../scripts/worktree-fresh-dist-prebuild.sh",   // ← row 155 closure
  "typecheck": "tsc --noEmit",
  "build": "tsc",
  "postinstall": "tsc",                                              // ← row 172 closure
  ...
}
```

## 3. Impl-time gotchas surfaced

### 3.1 cwd-resolution in helper script

Initial concern: pnpm's `pretest` lifecycle invokes scripts with cwd = package root (here,
`packages/dispatch-core/`). The helper at `scripts/worktree-fresh-dist-prebuild.sh` needs
to resolve REPO_ROOT correctly regardless of where it is invoked from.

Resolution: use `BASH_SOURCE[0]` to find the script's own location, then ascend one level:
```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
```
This is cwd-independent. Verified at WB-final by invoking from `packages/dispatch-core/`
cwd directly.

### 3.2 Anchor file selection

Initial candidates: `dist/index.js`, `dist/v3/schema.js`, or the whole `dist/` directory.

- Whole-directory `-newer dist` checks the dir mtime, which only changes when files are
  added/removed (not when files are modified). Unreliable for the "stale dist" case.
- `dist/index.js` is generated, but row 155 body specifically cites `dist/v3/schema.js`
  as the import-time crash anchor.

Selected `dist/v3/schema.js` — row-body-anchored, file-level mtime, reliable freshness signal.

### 3.3 Build-command indirection

Initial design: helper invokes `tsc` directly. Reconsidered: `tsc` requires the correct
cwd + tsc binary on PATH (or relative resolution through node_modules/.bin). Production
invocation guarantees both because pnpm sets cwd = package root + tsc lives at
`packages/dispatch-core/node_modules/.bin/tsc` (pnpm hoists). But invoking from outside
the package (manual test, future automation) would break.

Selected `pnpm --filter dispatch-core build` — pnpm handles cwd + binary resolution
internally + matches the row 155 body wording "runs dispatch-core build".

Cost: ~50ms pnpm overhead vs raw tsc. Negligible compared to the ~2s tsc run itself.

### 3.4 Env-var test affordances

Probe-mbfwfd-02 needs to drive the helper's three freshness branches in isolation, without
touching the real `packages/dispatch-core/dist/` (which would break other concurrently-
running tests).

Added four `${WFD_*:-default}` overrides to the helper:
- `WFD_CORE_DIR` — override the dispatch-core package root.
- `WFD_SRC_DIR` — override the src input.
- `WFD_ANCHOR` — override the dist anchor.
- `WFD_BUILD_CMD` — override the rebuild command.

Production callers never set any of these. Each override has a clean default mapping to
the production path. Documented in the helper header as "test affordances". Same pattern
as `CAIRN_ATOMIC_TEST_RACE_HOOK` in `scripts/cairn-atomic-commit.sh`.

## 4. WB-final live verification ordering

Per CLAUDE.md §4.4 multi-package verification ordering:
1. `pnpm --filter dispatch-core build` (implicitly via the helper's own live simulation
   in `mv dist/v3/schema.js` → re-run helper → tsc fires → anchor restored).
2. Full dispatch-core suite — 221/221.
3. 5-package typecheck — one command at a time, no `&&` chains:
   - dispatch-core ✓
   - dispatch-daemon ✓
   - dispatch-workstation ✓
   - dispatch-cli ✓
   - dispatch-web ✓

No full workstation suite run (this ticket is build-infrastructure, not workstation-touching).

## 5. Forward propagation

The pattern from this closure (content-equivalence assertion for build-output-freshness
probes; env-var test affordances on shell helpers) is filed as a Tier 3 followup proposal
(`MB-F-BUILD-OUTPUT-FRESHNESS-PROBE-DESIGN-PATTERN`) in findings doc §9. Future closures
that ship pretest/postinstall/post-pull/post-clone hooks should consume this pattern.

Per memory `feedback_followup_row_as_forward_propagation_memory`: the proposed Tier 3 row
body carries the full implementation template (tmpdir sandbox + WFD_*-style env-vars +
sandboxed BUILD_CMD + content assertions on three branches), not just a reference.
