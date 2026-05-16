# MB-F-WORKTREE-FRESH-MISSING-DIST-CRASH — decisions doc

**Session**: SESSION-r12-t1c-w1-worktree-fresh-dist
**Date**: 2026-05-16

Decisions made during the closure of FOLLOWUPS row 155. All three open arbitrations
(Q-WTFD-1/2/3) resolved within their gen-6 auto-ack envelopes; no escalation to operator.

---

## Q-WTFD-1: Pretest hook location

**Question**: Where should the `pretest` lifecycle key live?
- (a) `packages/dispatch-core/package.json` `pretest` — per-package; runs only before `pnpm --filter dispatch-core test`.
- (b) root `package.json` `pretest` — workspace-wide; runs before any package's tests.

**Disposition**: **(a)** per-package, in `packages/dispatch-core/package.json`.

**Reasoning**:
- The failure-mode anchor (`dist/v3/schema.js`) is dispatch-core-specific. Other packages
  have their own dist/ outputs from their own build processes; conflating them under a
  root-level pretest would either over-fire (unnecessary tsc runs for unrelated test
  invocations) or grow conditional logic.
- Per-package matches the precedent of row 172's `postinstall: tsc` — same scope, same
  package.json file. The two keys compose naturally.
- `pnpm -r test` invokes each package's `pretest` in turn — dispatch-core's pretest still
  fires when the workspace-wide test command is used. No coverage gap.

**Auto-ack envelope**: Matched (gen-6 dispatch flagged this as the auto-ack disposition).

## Q-WTFD-2: Trigger condition

**Question**: When should the pretest hook invoke a rebuild?
- (a) UNCONDITIONAL — always run `tsc` before test (over-aggressive, always correct).
- (b) FRESHNESS-CHECK — only if `dist/` is absent OR any src file is newer than the anchor.

**Disposition**: **(b)** freshness-check.

**Reasoning**:
- Row 155 body specifies "if dist/ is absent or older than src/" verbatim. The closure
  path is row-body-mandated; auto-ack disposition is direct text match.
- Unconditional rebuild would add ~2s to every `pnpm test` invocation, including the
  common case where dist is already fresh. Freshness-check skips with one `find -newer
  -print -quit` call (~10ms on macOS APFS for ~100 src files). 200x speed differential on
  the no-op path is load-bearing for developer-loop ergonomics.
- The freshness check is intentionally conservative: missing anchor → rebuild (safe), any
  src file newer → rebuild (safe). False positives (rebuild when not needed) only happen
  when src mtimes are artificially manipulated, which is a test-affordance scenario, not
  a production scenario.

**Auto-ack envelope**: Matched (gen-6 dispatch flagged this as the auto-ack disposition).

## Q-WTFD-3: Implementation form

**Question**: Where should the freshness-check logic live?
- (a) inline shell in `package.json` `"pretest"` field — e.g., `"pretest": "if [ ! -d dist ] || ...; then tsc; fi"`.
- (b) external helper script — `scripts/worktree-fresh-dist-prebuild.sh`.

**Disposition**: **(b)** external helper at `scripts/worktree-fresh-dist-prebuild.sh`.

**Reasoning**:
- Inline shell in package.json gets quoted/escaped into a JSON string, which makes it
  effectively unreadable + brittle to edit. Multi-line bash logic (the freshness-check
  has 3 conditional branches + 2 log statements) cannot live as a clean inline.
- External script matches the `scripts/` directory convention shipping in this repo
  (`cairn-atomic-commit.sh` at SHA `173ead7`; both scripts cooperate as build infrastructure).
- The external script can carry comments, env-var test affordances (`WFD_CORE_DIR` /
  `WFD_SRC_DIR` / `WFD_ANCHOR` / `WFD_BUILD_CMD`), and a stderr-logged branch decision —
  none of which would survive inline JSON-string encoding.
- Per CLAUDE.md §3.5 raw-fs pattern: external script with explicit shell discipline is
  preferred over inline indirection.

**Auto-ack envelope**: Matched (gen-6 dispatch flagged this as the auto-ack disposition).

---

## Probe-extension deviation (decision, not arbitration)

Territory manifest names probes with `.spec.ts` extension. dispatch-core vitest.config.ts
include glob is `test/**/*.test.{ts,tsx}` — `.spec.ts` files are not discovered.

**Decision**: Use `.test.ts` extension for both probes.

**Reasoning**: vitest.config.ts is READ-only in this session's territory; cannot adapt
the glob to discover `.spec.ts`. The probe MUST be executable to be load-bearing for
RED/GREEN cycles. Sibling closure (`docs/coordination/mb-f-dispatch-core-post-pull-rebuild-
discipline-findings-2026-05-16.md` §5) established the same deviation in the precedent
ticket. CC-arbitrable per the precedent: deviation preserves probe executability without
modifying scope.

## Probe-02 assertion strategy (content over mtime)

**Decision**: probe-mbfwfd-02 asserts file CONTENT equivalence, not file mtime equivalence.

**Reasoning**: sibling-closure §4 lesson — mtime-comparison probes for build-output
freshness are unsound when src mtimes are artificially manipulated (post-`tsc` wall-clock
drift). The helper's INTERNAL logic uses mtime, which is correct for production. The
probe drives the helper's branches via mtime INPUT (`fs.utimesSync`) but asserts via
content OUTPUT (`readFileSync` matching expected propagation).

This decision is filed as a Tier 3 pattern proposal in findings doc §9 (proposed
MB-F-BUILD-OUTPUT-FRESHNESS-PROBE-DESIGN-PATTERN row).
