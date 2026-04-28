# Cairn findings — foxworks-dispatch

Local findings ledger for the foxworks-dispatch repository. Records
methodology evidence and codification candidates surfaced during real-
environment work. Each finding is **frozen at capture time** — past
tense, dated, not retroactively edited. Subsequent learning produces
new findings, never amendments to old ones.

Findings here lift to the Cairn v0.2 portfolio-master findings file at
codification time. Until then, this file is the citation target for
commits and tickets that reference a finding number.

This ledger is **not** the followup index. `docs/FOLLOWUPS.md` owns
work-item tracking (followup IDs, priority bands). Findings are a
different genre: methodology evidence with portfolio-level half-life,
not per-cluster work items.

Numbers are assigned from the **portfolio-shared sequence** (Cairn-
wide). Gaps in this file represent findings captured in sibling repos.
The portfolio sequence is monotone; codified findings stay in place
with a `Lifted:` line added.

## Format

Each finding follows this shape:

    ### Finding #N — short title

    - **Captured:** YYYY-MM-DD
    - **Origin:** <commit-sha> · <ticket-or-scope>
    - **Companions:** #M, #K (or _none_)
    - **Codification target:** Cairn v0.2 §<section> (or _TBD_)
    - **Status:** Captured

    <body — past-tense narrative of what was observed and the
    methodology lesson it codifies>

Status values: `Captured` (default), `Codified` (after Cairn v0.2
lift), `Superseded` (if later finding refines or replaces).

---

## Findings

### Finding #51 — smoke-test scope vs. user-surface divergence

- **Captured:** 2026-04-28
- **Origin:** 80a90ec · v2.0.0 dogfood incident; CLI-Z2-1 fix-pack at 28902ca
- **Companions:** #49 (runtime-path divergence; in sibling ledger), #52, #53, #54
- **Codification target:** Cairn v0.2 §<TBD>
- **Status:** Captured

Phase Z smoke tests covered daemon-side (Z-1), web-side (Z-3), and
CLI-internal-via-tsx (Z-4) invocation paths but did not exercise the
binary-on-PATH user-invocation path that any returning user hits via
the pnpm-global shim. Result: v2.0.0 shipped with `fd init` unusable
for any pre-link operator. The smoke harness `smoke-test-cli` ran via
tsx, masking the binary-on-PATH gap entirely; tsx resolves source
imports differently than plain node, so a smoke that exercises only
the tsx path verifies a different module-resolution graph than the
production-shipped binary.

Codification target Cairn v0.2: smoke-test surface must include every
user-invocation surface the install instructions point at, not only
the test-script surfaces. The discipline is "exercise what users
exercise," not "exercise what tests are convenient to write."

Companion to #49 (runtime-path divergence; in sibling ledger). Sibling
at the binary-resolution layer rather than the module-resolution
layer.

### Finding #52 — workspace dep public surface vs. source-tree reach-in

- **Captured:** 2026-04-28
- **Origin:** 80a90ec · v2.0.0 dogfood incident; CLI-Z2-1 fix-pack at 28902ca
- **Companions:** #51, #53, #54
- **Codification target:** Cairn v0.2 §<TBD>
- **Status:** Captured

CLI source imports `dispatch-core/src/<x>.js` across 7 files (18
import lines surveyed pre-attempt; full-monorepo survey at finding
#54 capture surfaced 88 across 68 files). tsx and tsc both resolve
`.js` → `.ts` source under workspace symlinks, so unit/integration
coverage and the `smoke-test-cli` tsx harness all stay green. But the
built CLI under plain node fails to find the `.js` file — there is no
`.js` at that path in source, and `dispatch-core/package.json` had no
`exports` map at v2.0.0, so node ESM walks into the source tree and
looks for the literal file. Phase Z's build-once-then-test discipline
never executed against the built CLI; smoke harness ran via tsx.

Verification at finding capture confirmed
`packages/dispatch-core/{src,dist}/index.js` are both literal
`export {};` — the nominal package main entry has no semantic content,
and no test in the suite would have surfaced the gap. The empty
barrel was scaffolded but never wired with re-exports; the public-
surface contract was never built or tested in any layer of coverage.

Codification target Cairn v0.2: a workspace package's public surface
is whatever its package.json `main`/`exports` declares, not whatever
path resolves under tsx. Reaching into another workspace's `src/` is
a forbidden import shape — lint or grep at PR time.

Companion to #51 — same dogfood incident, but a different layer of
the cake.

### Finding #53 — type-contract emission gap parallel to runtime contract

- **Captured:** 2026-04-28
- **Origin:** 80a90ec · v2.0.0 dogfood incident; CLI-Z2-1 fix-pack at 28902ca
- **Companions:** #52
- **Codification target:** Cairn v0.2 §<TBD>
- **Status:** Captured

`dispatch-core/tsconfig.json` had no `"declaration": true`; the build
emitted `.js` without matching `.d.ts`. The reach-in import pattern
(`dispatch-core/src/<x>.js`) hid this because TypeScript NodeNext
resolution mapped `.js` → `.ts` source via workspace symlink, reading
types directly from source. After green-2 (e416da6 — subsequently
reverted at 28902ca) declared an explicit exports map pointing at
`dist/`, TypeScript expected co-located `.d.ts` files and didn't find
them; 23 typecheck errors surfaced (TS7016 "Could not find a
declaration file" plus cascading TS18046 'unknown' errors).

Codification target Cairn v0.2: a workspace package's declared public
surface is two contracts — runtime (exports pointing at `.js`) and
type (declarations pointing at `.d.ts`). Declaring one without the
other is a half-measure; either both ship or neither does. Verifiable
as a build-step invariant (every `.js` in `dist/` has a sibling
`.d.ts`).

Companion to #52 (workspace dep public surface). Same underlying gap
(public-surface contract never built or tested), different facet
(type contract vs. runtime contract).

### Finding #54 — consumer-survey discipline at public-surface decisions

- **Captured:** 2026-04-28
- **Origin:** 80a90ec · v2.0.0 dogfood incident; CLI-Z2-1 green-3 scope-underestimation halt at 23d5ed1; revert at 28902ca
- **Companions:** #52, #53
- **Codification target:** Cairn v0.2 §<TBD>
- **Status:** Captured

When a workspace package changes its public surface (implicit-via-
reach-in → explicit-via-exports-map, or any similar architectural
shift), every reach-in consumer across the monorepo is affected. The
migration scope decision (contained / portfolio-wide / back-compat-
aliased) must be informed by a consumer survey before pre-
registration, not after. CLI-Z2-1 v2.0.1 attempted exports-map
declaration scoped only to dispatch-cli (18 imports projected);
actual consumer survey at green-3 surfaced 88 imports across 68
files in 3 workspaces — 5x scope underestimation. The correct
sequence: survey → scope decision → pre-reg → red/green.

Codification target Cairn v0.2: any architectural decision that
changes a workspace package's public surface requires a consumer
survey (full monorepo grep for reach-in imports) before pre-
registration. Survey output feeds the scope decision and the
pre-reg authority chain. Skipping the survey produces fix-pack
overreach.

Companion to #52 (workspace dep public surface) and #53
(type-contract emission gap) — same incident family, third facet.
