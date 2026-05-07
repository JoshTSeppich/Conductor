# MB-T15 Phase 2 — Operator-Arbitrated Decisions

**Date:** 2026-05-07
**HEAD at decision time:** post-Phase-1-diagnose (`a7c6810`)
**Source:** `docs/coordination/mb-t15-diagnose-2026-05-07.md` (Phase 1)
+ operator confirmation 2026-05-07 ("proceed with tentative
dispositions, begin Phase 2 WB1").
**Phase 2 brief:** operator-authored 2026-05-07 (this session).

This doc captures the dispositions on Q-MBT15-1..7 + R-MBT15-1..7 + the
Phase 2 ladder for MB-T15 (Tile-header chrome). Operator confirmed all
tentative recommendations from §VIII of the Phase 1 diagnose by acking
"proceed with tentative dispositions".

---

## I. Q-MBT15-N dispositions

| ID | Disposition | One-line rationale |
|---|---|---|
| Q-MBT15-1 | (a) operator-confirmed model SDK→shortcode mapping captured as a literal `Record` in color-helpers.ts | Cleanest data shape for read-only chip rendering |
| Q-MBT15-2 | (a) for ALL fields: stub everything for v3.0 ship-minimum | Avoids frozen-zone schema.ts amendment; chrome ships with placeholder data sources until autopilot/spawn-handler integration |
| Q-MBT15-3 | (a) TileHeader as CHILD of existing `tile-header` div, above buttons + slots | Preserves existing testids (tile-header, tile-status-indicator, tile-session-name); no probe-01..04 regression at WB4 |
| Q-MBT15-4 | (a) inline-style for dynamic state; (b) shell-html `<style>` block for layout primitives | Matches existing dispatch-workstation styling pattern |
| Q-MBT15-5 | (b) idle→gray, open→green, killed→red, detached→gray; yellow UNUSED in v3.0 | Detached tile renders placeholder (UI is in dimmed state); yellow flagged for future use (gap-detected, daemon-disconnect) |
| Q-MBT15-6 | (a) horizontal progress bar; tints normal/warn/danger via background-color | Standard meter UX; testable via inline-style ratio + class assertion |
| Q-MBT15-7 | (a) flex layout + ellipsis truncation on session/branch/repo names | Compact mode (b) deferred to v3.1 polish |

### Stub data source defaults (Q-MBT15-2 = a per-field)

| Field | v3.0 stub | v3.1 / autopilot integration |
|---|---|---|
| model | `'claude-sonnet-4-6'` (orchestrator default) | spawn-handler captures `model` arg; SessionV2 amendment (operator-only authoring) OR renderer-side cache keyed by sessionName |
| branchName | `'main'` | subscribe `commit_landed` events from `/v2/events/stream` + cache per session in TileGridApp state |
| repoName | basename of `cwd` (existing SessionV2 field; via parent plumb-through) | unchanged |
| tokensUsed | `0` | autopilot loop telemetry (MB-T11 / MB-T17 successor); per-session token tracking via NEW field on SessionV2 (operator-only authoring) |
| tokenBudget | `200_000` (200k context window default for Sonnet 4.6) | per-model lookup table; updated when model changes |

### Q-MBT15-1: model SDK→shortcode mapping (tentative; operator confirms hex colors at WB2)

| Shortcode | SDK name (KNOWN where verified) | Color (TBD WB2; placeholder) |
|---|---|---|
| `S4.6` | `claude-sonnet-4-6` (KNOWN, coarch-t03 spike) | TBD — likely blue/cyan family |
| `O4.6` | `claude-opus-4-6` ([SPECULATIVE] — model name not verified in repo) | TBD — likely purple family |
| `O4.7·1M` | `claude-opus-4-7-[1m]` ([MODELED] — CLAUDE.md mentions Opus 4.7 1M context) | TBD — likely deeper purple / amber accent |
| `H` | `claude-haiku-4-5-*` ([MODELED] — CLAUDE.md mentions Haiku 4.5) | TBD — likely green/yellow family |

Operator clarifies SDK names + chip colors during WB2 implementation
review. WB1 stubs the shortcode union; WB2 fills the literal Record +
unit tests for each mapping.

## II. R-MBT15-N dispositions

| ID | Disposition | Action |
|---|---|---|
| R-MBT15-1 | Surface in §VIII Phase 1 diagnose; operator can paste inventory `§3 MB-T15 entry` if it overrides any tentative; otherwise inline brief is the source-of-truth | Operator confirmed proceed; tentative held |
| R-MBT15-2 | RESOLVED | Q-MBT15-2 = (a) stub avoids schema.ts amendment |
| R-MBT15-3 | HONOR | Q-MBT15-3 = (a) preserves existing testids; probe-01..04 at WB4 stay GREEN |
| R-MBT15-4 | DEFER | Color hex specifics filed at WB2 for operator review during impl |
| R-MBT15-5 | ACCEPT | Token meter ships with stub data; meter logic + tint thresholds tested with explicit ratio inputs |
| R-MBT15-6 | mitigated | Read-only chrome (chip + meter as `<div>`s, not buttons); isInteractiveTarget treats them as draggable background |
| R-MBT15-7 | validate at WB3 | Render-at-min-width tests assert no overflow; CSS flex + ellipsis are the mechanism |

## III. Phase 2 ladder (4-5 WBs, single session)

Per operator brief 2026-05-07 §VI Phase 2 ladder draft + Phase 1
diagnose §VI:

1. **WB1 (red)** — scaffold tile-header.tsx skeleton + color-helpers.ts
   stubs + types.ts (TileStatus extracted) + test files (probe-00
   per dir) + this decisions doc.
   Commit: `red(MB-T15): WB1 — scaffold tile-header + color-helpers + decisions doc`.
2. **WB2 (green)** — color-helpers.ts pure-fn implementations
   (statusDotColor, modelChipShortcode, modelChipColor, tokenMeterTint)
   + unit tests (probe-01-spec-table per fn).
   Commit: `green(MB-T15): WB2 — color-helpers.ts pure-fn + unit tests`.
3. **WB3 (green)** — tile-header.tsx full implementation (status dot,
   session name truncated, branch, repo, model chip, token meter bar)
   + render tests at min-width 240px + truncation tests.
   Commit: `green(MB-T15): WB3 — tile-header.tsx + render-at-min-width tests`.
4. **WB4 (green)** — Tile.tsx integration: slot TileHeader as child;
   extend TileGridSessionEntry with optional fields (branchName,
   repoName, model, tokensUsed, tokenBudget); plumb-through
   TileGrid.tsx and TileGridApp.tsx; preserve all existing
   probe-01..04 tests.
   Commit: `green(MB-T15): WB4 — Tile.tsx integration + session-entry plumb-through`.
5. **WB5 (docs)** — findings doc + followups + cross-layer flow update
   if needed (probably just §I composition diagram tweak in
   architecture-flow doc).
   Commit: `docs(MB-T15): WB5 — findings doc + followups`.

## IV. Discipline (per CLAUDE.md + MB-T12 ladder lessons)

- Per-path git operations (NEVER `-A` or `.`) — CLAUDE.md §2.7
- Pre-commit territory check via `git status --short`
- Post-commit territory verification via `git log -1 --stat`
- Confidence labels KNOWN / MODELED / SPECULATIVE on every claim — §2.2
- Anti-fabrication: read source, don't infer — §2.1
- Each commit body includes self-check Q1-Q9 per
  CONDUCTOR_API_CONTRACT.md §10.5 — §2.4
- All work happens directly on main (additive scaffolding) — §2.7
- Per-commit-push: each WB commit pushed to origin immediately,
  verified via `git log --oneline origin/main..HEAD` returning empty —
  §2.6 + MB-T12 WB14 closure (`MB-F-LADDER-PER-COMMIT-PUSH-VS-HALT-2-TENSION`)
- WB11a discoveries applied:
  - Run scoped vitest dirs SEQUENTIALLY (not concurrently — happy-dom hang)
  - Use `act()` wrappers around async DOM-flush calls
  - Add new `.tsx` files to tsconfig exclude

## V. References

- Phase 1 diagnose: `docs/coordination/mb-t15-diagnose-2026-05-07.md`
- Operator brief 2026-05-07: MB-T15 — Tile-header chrome (this session)
- MB-T12 architecture-flow: `docs/coordination/mb-t12-architecture-flow.md`
- MB-T12 decisions doc (pattern reference):
  `docs/coordination/mb-t12-decisions-2026-05-07.md`
- Existing surfaces: `src/tile-grid/tile.tsx` (WB5+),
  `src/tile-grid/tile-grid.tsx` (WB6+), `src/tile-grid/tile-grid-app.tsx` (WB9+)
- Frozen-zone refs: `CLAUDE.md` §2.10 + `packages/dispatch-core/src/v2/schema.ts`
