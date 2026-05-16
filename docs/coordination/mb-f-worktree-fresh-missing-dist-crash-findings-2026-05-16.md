# MB-F-WORKTREE-FRESH-MISSING-DIST-CRASH — closure findings

**Session**: SESSION-r12-t1c-w1-worktree-fresh-dist
**Date**: 2026-05-16
**Wave**: T1-CLOSURE-Wave-1 refill cycle 2 (gen-6 22-hour max-throughput)
**Closure path**: Q-WTFD-1 (a) per-package + Q-WTFD-2 (b) freshness-check + Q-WTFD-3 (b) external helper
**FOLLOWUPS row**: `docs/FOLLOWUPS.md:155` (Tier 1)
**Ladder commits**: `3005743` (WB1 green) + `0dac630` (WB2 green)

---

## 1. Diagnose evidence [KNOWN 2026-05-16]

| Probe | Finding |
|---|---|
| `git log --all --grep "MB-F-WORKTREE-FRESH-MISSING-DIST-CRASH"` | ZERO closure-keyed commits — row OPEN at HEAD |
| `packages/dispatch-core/package.json` `postinstall` | `"tsc"` present from row-172 closure (SHA `23f7c88`) — preserve verbatim |
| `packages/dispatch-core/package.json` `pretest` | undefined — row-155 lifecycle key OPEN |
| root `package.json` keys | `test`/`typecheck`/`build` only — no `pretest`/`prebuild` overlap risk |
| FOLLOWUPS row 155 body | "pnpm pre-test hook that runs dispatch-core build if dist/ is absent or older than src/" |
| `packages/dispatch-core/vitest.config.ts` include glob | `test/**/*.test.{ts,tsx}` — drives `.test.ts` probe extension |

All three Q-WTFD-1/2/3 auto-ack envelopes satisfied at gen-6 pre-flight + verified again at HALT 0:
- Q-WTFD-1: per-package scope matches the failure-mode scope (only dispatch-core has the dist/v3/schema.js anchor).
- Q-WTFD-2: row body verbatim is "absent OR older than src/" — freshness-check, not unconditional rebuild.
- Q-WTFD-3: external helper composes with the existing `scripts/` convention (sibling: `cairn-atomic-commit.sh`).

## 2. Closure mechanism

Added one lifecycle key to `packages/dispatch-core/package.json`:

```json
"pretest": "bash ../../scripts/worktree-fresh-dist-prebuild.sh"
```

Helper script (`scripts/worktree-fresh-dist-prebuild.sh`): checks anchor=`dist/v3/schema.js`
absence + `find src -newer anchor` → fires `pnpm --filter dispatch-core build` on either
trigger. Logs branch decision to stderr.

Composes with the row-172 `postinstall: tsc` hook across two lifecycles (install vs test);
both coexist in package.json.

## 3. Verification matrix [KNOWN]

| Check | Result |
|---|---|
| WB1 RED — probe-mbfwfd-01 (3 assertions) | 2/3 fail pre-edit (pretest undefined); 1/3 green (postinstall regression guard) |
| WB1 GREEN — after edit | 3/3 pass |
| WB2 GREEN — probe-mbfwfd-02 (4 assertions) | 4/4 pass (anchor-absent, fresh-skip, src-newer, syntax-check) |
| Full dispatch-core suite | 221/221 (217 pre-edit + 4 new probe-02) |
| Live fresh-worktree simulation | `mv dist/v3/schema.js` → helper logs "anchor absent" → `tsc` runs → file restored |
| `pnpm --filter dispatch-core typecheck` | CLEAN |
| `pnpm --filter dispatch-daemon typecheck` | CLEAN |
| `pnpm --filter dispatch-workstation typecheck` | CLEAN |
| `pnpm --filter dispatch-cli typecheck` | CLEAN |
| `pnpm --filter dispatch-web typecheck` | CLEAN |

## 4. Mechanism-level finding (probe-02 design — content-equivalence over mtime)

[KNOWN] The probe at `test/worktree-fresh-dist/probe-mbfwfd-02-fresh-worktree-simulation.test.ts`
asserts content-equivalence, NOT mtime-equivalence, per the sibling-closure §4 lesson
documented at `docs/coordination/mb-f-dispatch-core-post-pull-rebuild-discipline-findings-2026-05-16.md`.

mtime is used as INPUT (via `fs.utimesSync` setting src mtime to past/future), but the
probe ASSERTS file content. The helper's internal logic IS mtime-based — that is correct
for the production scenario, but probe-side mtime assertions are unsound when wall-clock
and artificial mtime can drift.

The probe's three cases each have a content-equivalence assertion:
- Case A (anchor absent): `readFileSync(anchor)` equals the marker string written to src.
- Case B (src not newer): `readFileSync(anchor)` equals the PRE-mutation marker string (i.e., not the mutated content) — proves the helper did not invoke BUILD_CMD.
- Case C (src newer): `readFileSync(anchor)` equals the POST-mutation marker string — proves the helper did invoke BUILD_CMD.

This generalises the §4 lesson: when testing rebuild-triggering mechanisms, drive branches
with mtime inputs but assert via content propagation.

## 5. Manifest deviations [KNOWN]

| Manifest detail | Actual | Reason |
|---|---|---|
| Probe extension `.spec.ts` | Used `.test.ts` | `packages/dispatch-core/vitest.config.ts` include glob is `test/**/*.test.{ts,tsx}`; `.spec.ts` would not be discovered. vitest.config.ts not in WRITE territory. Same deviation as sibling closure §5. |

No other manifest deviations.

## 6. Cross-session observations

During this session one sibling commit landed on main:
- `8f4cb33` (kanban session territorial-manifest update: EXPANSION-4 + EXPANSION-5) landed between WB1 push (`3005743`) and WB2 push (`0dac630`).

Path-disjoint: `8f4cb33` only touched `docs/coordination/territorial-manifests/` files
(no `packages/dispatch-core/` or `scripts/` writes). Zero merge friction. Per-path `git
add` + `cairn-atomic-commit.sh -o` discipline correctly excluded foreign work both ways.

`c79470f` (kanban WB1 RED) also visible in history — also disjoint package
(`packages/dispatch-web/`). No interaction.

## 7. Closure proposal (operator-stamp envelope)

FOLLOWUPS.md is FORBIDDEN write in this session's territory. Proposing this closure row
update for operator stamping:

```
| `MB-F-WORKTREE-FRESH-MISSING-DIST-CRASH` | RESOLVED (`3005743` + `0dac630` r12-t1c-w1-worktree-fresh-dist 2026-05-16) — closure: `packages/dispatch-core/package.json` carries `"pretest": "bash ../../scripts/worktree-fresh-dist-prebuild.sh"`; helper checks dist/v3/schema.js anchor + `find src -newer anchor` and runs `pnpm --filter dispatch-core build` on either trigger. Composes with row-172 `postinstall: tsc` across two lifecycles (install vs test). Verification: probe-mbfwfd-01 (3 assertions, pretest key declared + helper-script reference + row-172 postinstall regression-guard preserved), probe-mbfwfd-02 (4 assertions, anchor-absent + fresh-skip + src-newer branches via content-equivalence in sandboxed tmpdir + bash-syntax check on real helper). WB-final live simulation: `mv dist/v3/schema.js` → helper detected absent → tsc ran → file restored. 5-package typecheck CLEAN. Discoverability: this row + findings/decisions/impl-coord docs at `docs/coordination/mb-f-worktree-fresh-missing-dist-crash-*-2026-05-16.md` + build doc at `docs/build-docs/CONDUCTOR_MB-F-WORKTREE-FRESH-MISSING-DIST-CRASH_BUILD.md`. | sess-mbt09+10 worktree ergonomics |
```

## 8. Methodology observations

- **§4 lesson generalisation lands cleanly**: the sibling closure's content-propagation
  lesson maps directly onto this probe's design. Driving branches via mtime inputs and
  asserting via content output is the recurring pattern for build-output-freshness probes.
  Worth filing as a Tier 3 pattern followup (operator-stamp envelope §9 below).
- **Env-var test affordances trade testability for trivial production surface**: 4 fallback
  expansions (`${WFD_CORE_DIR:-default}`) cost two lines of bash and zero production
  observability change. The probe-02 design would be substantially messier without them
  (real-dist manipulation with restore-on-cleanup). Acceptable surface cost.
- **HALT-0 auto-ack envelopes held perfectly**: gen-6 pre-flight's three auto-ack envelopes
  (Q-WTFD-1/2/3) all matched the local verification at HALT 0. No re-arbitration needed.
  Dispatch + pre-flight + auto-ack composition was load-bearing for the throughput target.

## 9. Tier-3 pattern followup proposal (operator-stamp envelope)

Proposing this Tier 3 followup row for operator stamping (memory pattern for future
build-output-freshness probes):

```
| `MB-F-BUILD-OUTPUT-FRESHNESS-PROBE-DESIGN-PATTERN` | Pattern (Tier 3): probes that verify build-output-freshness mechanisms should drive branches via mtime INPUTS (`fs.utimesSync`) but assert via content-equivalence OUTPUTS (`readFileSync` matching expected propagation). mtime-based assertions are unsound when wall-clock and artificially-set src mtime can drift past each other after a real tsc run. Implementation template: (1) tmpdir sandbox with src/ + dist/, (2) WFD_*-style env-var test affordances on the helper, (3) sandboxed BUILD_CMD that copies controlled src content to anchor, (4) three branches (absent / fresh / newer) each asserting anchor content. Established at row-172 closure §4; recursively-validated at row-155 closure §4 (sibling). Discoverability: this row + both findings docs. | r12-t1c-w1 closures 2026-05-16 |
```
