# MB-T15 Phase 2 Findings — 2026-05-07

**Status:** WB5 (final) commit
**HEAD at authoring:** post-WB4 (`3c94312`)
**Ship outcome:** 5 commits + 1 phase-1-diagnose, 77 MB-T15 tests, 1 latent
testid-mismatch caught + fixed within the ladder, 5 followups filed at
WB5, 0 contract amendments, 0 frozen-zone touches.

This doc summarizes the MB-T15 (Tile-header chrome) ladder outcome.

---

## I. Ladder outcome by WB

| WB | Commit | Type | Headline | Net new tests |
|---|---|---|---|---|
| Phase 1 | `a7c6810` | spike | Diagnose — surface inventory + open questions | 0 |
| WB1 | `699824b` | red   | scaffold tile-header.tsx + color-helpers.ts + types.ts + decisions doc | 10 stub tests (replaced at WB2/3) |
| WB2 | `d40cc61` | green | color-helpers.ts pure-fn impls + spec table | 26 (replaced WB1 stubs) |
| WB3 | `4f71c4c` | green | tile-header.tsx chrome rendering + render-at-min-width tests | 30 (replaced WB1 stubs) |
| WB4 | `3c94312` | green | Tile.tsx integration + TileGridSessionEntry plumb-through | 21 |
| WB5 | (this commit) | docs  | findings + 5 followups | 0 |

**Cumulative MB-T15 test surface: 77 tests across 3 directories
(tile-grid-color-helpers + tile-grid-header + tile-grid-tile/probe-05),
100% green in scoped runs.** Plus 117 prior tile-grid regression tests
(probes-01..04 + tile-grid-grid + tile-grid-app + WB1 already-green
suites) preserved.

## II. 1 latent issue caught + fixed within the ladder

| # | Issue | Surfaced at | Fixed at | Class |
|---|---|---|---|---|
| 1 | WB3 chose new namespaced testids for tile-header (`tile-header-status-dot`, `tile-header-session-name`); these conflicted with the legacy MB-T12 contract that probe-01..04 (54 tests) assert against (`tile-status-indicator`, `tile-session-name` + `data-status` attribute). Per Q-MBT15-3=a "preserve existing testids" disposition. | WB4 integration planning | WB4 (rename + `data-status` attribute additive preservation) | testid-contract-mismatch |

The fix was symmetric: rename the WB3 testids to match the legacy
contract + add a `data-status` attribute (preserving the MB-T12
test-assertion shape) + keep the WB3-introduced `data-status-color`
attribute (additive, non-breaking). Net effect: probe-01..04 stay
GREEN without migration; WB3 + WB4 tests work against the renamed
testids.

## III. 2 architectural insights surfaced

### Insight 1 — Type extraction enables non-JSX modules in tsc scope

WB1 introduced `src/tile-grid/types.ts` (.ts file, plain type exports)
extracting `TileStatus` from `tile.tsx`. The pattern: tsx files are
excluded from workstation tsconfig (no JSX flag). When non-JSX modules
(`color-helpers.ts`) need to import types from a JSX module, they hit
TS6142. Extracting shared type literals to a sibling `.ts` file (in
tsc scope) removes the dependency.

This pattern is reusable for any future pure-fn helpers in
`src/tile-grid/` (or other workstation territories). Net: 1 new file,
no test churn, all consumers continue to import from their original
paths via a re-export in the original `.tsx` file.

### Insight 2 — Dual-attribute backward-compat is a cheap migration path

When MB-T12's status-indicator span (asserting `data-status={status}`)
needed to be unified with MB-T15's status-dot span (asserting
`data-status-color={dotColor}`), the WB4 fix kept both attributes on
the same element. Existing 54 MB-T12 tests assert `data-status`; new
WB3 30 tests assert `data-status-color`. Both pass against the same
DOM element.

Trade-off: small attribute redundancy in DOM. Win: zero existing-test
migration. The pattern: when an attribute carries semantically
different information (raw value vs. resolved color), it's correct
to expose BOTH for different consumer needs.

## IV. Operator dispositions honored

All 7 Q-MBT15 + 7 R-MBT15 dispositions from the Phase 1 diagnose +
decisions doc landed without amendment:

| Disposition | Honored? | Where |
|---|---|---|
| Q-MBT15-1=a (model SDK→shortcode mapping as literal Record) | ✅ | WB2 color-helpers.ts |
| Q-MBT15-2=a (stub data sources for v3.0) | ✅ | WB3 default props in TileHeader |
| Q-MBT15-3=a (TileHeader as child of tile-header div) | ✅ | WB4 tile.tsx integration |
| Q-MBT15-4=a (inline-style for dynamic; flex layout primitives) | ✅ | WB3 tile-header.tsx |
| Q-MBT15-5=b (open→green, killed→red, idle/detached→gray; yellow unused) | ✅ | WB2 statusDotColor |
| Q-MBT15-6=a (token meter horizontal bar, >0.7 warn, >0.85 danger) | ✅ | WB2 tokenMeterTint + WB3 meter render |
| Q-MBT15-7=a (flex + ellipsis truncation for 240px min-width) | ✅ | WB3 tile-header.tsx + probe-01 acceptance tests |
| R-MBT15-1 (source-of-truth gap surfaced) | ✅ | Phase 1 diagnose §VI |
| R-MBT15-2 (schema.ts amendment avoided) | ✅ | Q-MBT15-2=a stubs preserve SessionV2 |
| R-MBT15-3 (existing tile.tsx test regression) | ✅ | WB4 testid alignment + data-status preservation |
| R-MBT15-4 (color palette specificity gap) | ⏳ | filed MB-F-T15-MODEL-CHIP-HEX-COLORS-PLACEHOLDER at WB5 |
| R-MBT15-5 (token meter data semantics) | ⏳ | filed MB-F-T15-AUTOPILOT-TOKEN-INTEGRATION at WB5 |
| R-MBT15-6 (drag-swap interaction with new chrome) | ✅ | WB3 chrome uses span/div (not buttons) — drag-swap unaffected |
| R-MBT15-7 (240px min-width CSS) | ✅ | WB3 probe-01 acceptance tests verify flex + minWidth:0 + overflow:hidden |

## V. Methodology audit

The CLAUDE.md disciplines + MB-T12 ladder lessons + Phase 1 diagnose
discipline: all held throughout 5 commits. Zero violations.

| Discipline | Held? |
|---|---|
| Per-path git operations (no -A or .) | ✅ all 5 commits |
| Pre-commit territory check via `git status --short` | ✅ all 5 commits |
| Post-commit territory verification via `git log -1 --stat` | ✅ all 5 commits |
| Confidence labels KNOWN/MODELED/SPECULATIVE | ✅ all 5 commit bodies + diagnose + decisions doc |
| Anti-fabrication: read source, don't infer | ✅ Phase 1 diagnose surfaced source-of-truth gap (operator-side inventory) explicitly rather than fabricating |
| Each commit body includes self-check Q1-Q9 | ✅ all 5 commits |
| Per-commit-push: each WB pushed + verified | ✅ all 5 commits |
| Scoped sequential test runs (WB11a discovery) | ✅ all WB2-WB4 vitest invocations |
| tsconfig .tsx exclude pattern (WB11a discovery) | ✅ tile-header.tsx added at WB1 |

## VI. WB5 followups filed (5 entries)

| Tier | ID | Status | Origin |
|---|---|---|---|
| 2 | `MB-F-T15-MODEL-CHIP-HEX-COLORS-PLACEHOLDER` | filed | R-MBT15-4 + WB2 color-helpers.ts placeholder hex codes |
| 2 | `MB-F-T15-AUTOPILOT-TOKEN-INTEGRATION` | filed | R-MBT15-5 + Q-MBT15-2=a stubs (tokensUsed/tokenBudget defaults) |
| 2 | `MB-F-T15-SESSION-DAEMON-FIELDS-WIRING` | filed | Q-MBT15-2=a stubs (branchName/repoName/model defaults) |
| 3 | `MB-F-T15-COMPACT-MODE-AT-NARROW-WIDTH` | filed | Q-MBT15-7 deferred — compact mode for very narrow tiles |
| 3 | `MB-F-WRITE-TOOL-READ-TRACKING-CROSS-TURN` | filed | WB1 + WB2 + WB3 methodology — Write tool requires Read-before-Write tracking that re-asserts between turns |

## VII. Open questions for v3.1 (out of MB-T15 scope)

1. **Hex color confirmation** — operator-side inventory `§3 MB-T15
   entry` may have canonical hex codes that supersede WB2/WB3
   placeholders. If operator pastes hex values, MB-F-T15-MODEL-CHIP-HEX-
   COLORS-PLACEHOLDER closes via single-file edit to
   `color-helpers.ts modelChipColor` switch + `tile-header.tsx`
   STATUS_DOT_HEX/TOKEN_TINT_HEX tables.
2. **Real data wiring** — Q-MBT15-2=a stubs ship in v3.0; v3.1 adds
   real-data sources:
   - branch via `commit_landed` events on `/v2/events/stream` cached
     in TileGridApp state
   - repo via existing `cwd` field (basename) — already plumb-able
     today via TileGridApp seed (no daemon work needed)
   - model via spawn-handler captures (operator-only schema amendment
     OR renderer-side cache)
   - tokens via autopilot loop telemetry (NEW per-session tracking)
3. **Compact mode for very narrow tiles** — at sub-240px width the
   chrome would degrade gracefully (e.g., hide repo name, abbreviate
   chip). v3.0 ships ellipsis truncation; v3.1 polish per
   MB-F-T15-COMPACT-MODE-AT-NARROW-WIDTH.

## VIII. References

- decisions doc: `docs/coordination/mb-t15-decisions-2026-05-07.md`
- Phase 1 diagnose: `docs/coordination/mb-t15-diagnose-2026-05-07.md`
  (`a7c6810`)
- MB-T12 architecture-flow (integration baseline):
  `docs/coordination/mb-t12-architecture-flow.md`
- MB-T12 ladder lessons (per-commit-push + WB11a discoveries):
  `docs/coordination/mb-t12-findings-2026-05-07.md` +
  `MB-F-LADDER-PER-COMMIT-PUSH-VS-HALT-2-TENSION` row in FOLLOWUPS.md
- WB1-WB5 commits: `699824b d40cc61 4f71c4c 3c94312` + (WB5 commit,
  this).
