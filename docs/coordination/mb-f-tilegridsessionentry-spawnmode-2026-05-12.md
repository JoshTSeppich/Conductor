# MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING — closure findings (path (a) end-to-end)

**Session**: `commit-plan-doc-1334` (Round 11 §3.9 SPECULATIVE Continuation Wave 2)
**Date**: 2026-05-12
**Anchor followup row**: `docs/FOLLOWUPS.md:332` (Tier 2, filed at T3 WB9 docs at HEAD `e713cbd`)
**Closure path executed**: (a) — `TileGridSessionEntry.spawnMode` field + `spawn-handler.ts` plumbing + `FrameCRoot` consumer pass-through. Closure path (b) (workstation-internal IPC) NOT pursued — heavier scope and not recommended per the followup body.

## §I — Closure summary (one paragraph)

The bypass-perms indicator at ActionBar (`action-bar.tsx:128` — `[data-testid="action-bar-bypass-perms-indicator"]`) now renders end-to-end under dogfood whenever a session spawned via `spawnSession()` with `req.permissionMode === 'auto'` is selected in Frame C. The plumbing extension covers: `SpawnSessionResult.spawnMode?: 'auto' | 'ask'` (workstation-internal wire field, NOT exposed by daemon — §2.10 frozen surface respected); `TileGridSessionEntry.spawnMode?: 'auto' | 'ask'` (renderer entry projection); FrameCRoot's `onSpawnResult` bridge subscription extracts the field and writes it into the appended entry; FrameCRoot's DetailPane render forwards `spawnMode={selectedEntry?.spawnMode}` (DetailPane already accepted this prop from T3 WB8 ship-shy default at `e713cbd`). Vocabulary `'auto' | 'ask'` mirrors `SpawnPermissionMode` at `spawn-handler.ts:91` verbatim — single per-spawn permission concept; no new enum authored; no schema.ts frozen surface modified.

## §II — Cairn ladder

| WB | Verb | Commit | Files | Outcome |
|---|---|---|---|---|
| WB1 RED | red | `d4d61bc` | `test/unit/tile-grid/probe-spawnmode-01-entry-type-shape.spec.ts` | 3 conditions (2 with `@ts-expect-error WB1 RED:` suppressions + 1 optional-modifier check); typecheck CLEAN + 3/3 runtime PASS at RED state (object literals preserve unknown-to-TS keys). |
| WB1 (c5 incident) | — | `63eba0f` (foreign) | sweep | Parallel session `c5-ticket-wb1` absorbed staged WB1-GREEN edits without ack. |
| WB1 (revert) | chore | `9b8a4e9` | partial-revert | Orchestrator-mediated partial-revert restored tile-grid.tsx + probe-spawnmode-01 to pre-c5 state; c5's legitimate `probe-frame-c-ipc-lookup-registry.spec.ts` preserved. |
| WB1 GREEN | green | `228a2da` | `src/tile-grid/tile-grid.tsx` (+18 lines field + docstring) + probe (removed suppressions) | Typecheck CLEAN + 3/3 runtime PASS; 58/58 consumer suites + 472/472 consumer tests PASS. |
| WB2 RED | red | `227bd2e` | `test/unit/main/probe-spawn-handler-mode-01-result-emits-spawnmode.spec.ts` | 4 conditions (3 fail-on-undefined + 1 union-shape regression guard); typecheck CLEAN + 1/4 runtime PASS at RED. |
| WB2 GREEN | green | `758ef50` | `src/main/spawn-handler.ts` + 3 ad-hoc-relaxed consumer tests + native probe (suppressions removed) | Typecheck CLEAN + 4/4 native probe PASS + 77/77 consumer (spawn-handler + ipc) suites. |
| WB3 RED | red | `8a34327` | `test/unit/tile-grid/probe-spawnmode-02-frame-c-root-pass-through.spec.ts` | 3 conditions (1 fail + 2 regression-guard pass); typecheck CLEAN + 1/3 runtime fail at RED with cited assertion `expected null not to be null`. |
| WB3 GREEN | green | `7fc2e7a` | `src/frame-c/frame-c-root.tsx` (3 surgical edits in single file) | Typecheck CLEAN + 3/3 probe PASS + 61/61 consumer suites + 493/493 consumer tests PASS. |
| WB-final | docs | (this commit) | findings + coord | Audit + Tier 2 followups proposed (see §VII). |

## §III — Verification evidence (KNOWN)

- **WB1**: tile-grid + frame-c + tile-grid-grid + tile-grid-hero-squad — 58 suites / 472 tests pass.
- **WB2**: wiring-spawn + mb-t05 + mb-t06 + spawn-ipc-failure-envelopes + main subdir — 77/77 (the 2 unrelated pre-existing REDs at `probe-mbtphase4-clustera-01-spawn-result-fields.spec.ts` are MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS WB1 RED targets, commit `55776cf`, with explicit docstring coordination: "spawnMode arm absorbed by sibling commit-plan-doc-1334").
- **WB3**: frame-c + tile-grid full subdirs — 61 suites / 493 tests pass; my probe 3/3 pass at GREEN.
- **All WBs**: 5-package typecheck CLEAN at every WB transition (only workstation typecheck was scoped per WB; full 5-package sweep is operator-arbitrated at orchestrator settlement).

## §IV — Vocabulary + ship-shy semantics

- **Vocabulary**: `'auto' | 'ask'` matches `SpawnPermissionMode` at `spawn-handler.ts:91`. The renderer projection retains the T3-contract name `spawnMode` (the entry/prop name predates the source-of-truth field; coherent enough that no rename was authored).
- **Default-when-omitted**: `req.permissionMode ?? 'ask'` populates `SpawnSessionResult.spawnMode`. Spec-faithful to the operator-arbitrated §7.2 docstring at `spawn-handler.ts:88-91`: "Field is optional; omitted ⇒ 'ask' (operator-arbitrated §7.2: 'ask' on first launch; operator opts INTO 'auto' consciously)."
- **Ship-shy fallback preserved**: spawn-results that omit `spawnMode` entirely (legacy emits before WB2 GREEN — historical artifact only; all real spawns post-758ef50 emit) leave `entry.spawnMode` undefined → indicator hidden. T3 WB8's ship-shy default at `e713cbd` continues to hold under absent-data.
- **Schema.ts NOT touched**: `TileGridSessionEntry` is locally defined at `tile-grid.tsx:29-67`, not Zod-derived; `SpawnSessionResult` is workstation-internal (not in `dispatch-core/src/v3/schema.ts`). Frozen contracts respected.

## §V — Downstream impact + unblocking

| Downstream | Status pre-closure | Status post-closure |
|---|---|---|
| T3 bypass-perms indicator (`action-bar.tsx:128`) | Render gate present + DetailPane prop wired, but `selectedEntry?.spawnMode` always undefined → indicator never rendered under realistic dogfood | Renders end-to-end when selected entry was spawned with `permissionMode: 'auto'` |
| MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS WB1 (`probe-mbtphase4-clustera-01-spawn-result-fields.spec.ts`) | RED awaits `model?:` + `spawnedAtMs` fields (independent ticket) | UNCHANGED — explicitly coordinated; my work absorbed `spawnMode` arm only |
| `tile-grid-app.tsx:159-185` spawn-result subscription (parallel to FrameCRoot's) | Does NOT populate spawnMode (file FORBIDDEN under my manifest) | UNCHANGED — separate followup; see §VII row 3 |
| `phase-4-tier-1-roadmap-draft.md:111-121` Tier 1 entry | Open | Closes via this ladder |

## §VI — Methodology findings (cross-session-staging contamination)

Five contamination incidents observed during this session. Listed chronologically with discipline-application outcomes.

| # | Time | Foreign file in MY index | Source session | Pre-stage check applied? | Outcome |
|---|---|---|---|---|---|
| RECURRENCE-1 | 2026-05-12 15:09:24 | `tile-grid.tsx` + `probe-spawnmode-01-entry-type-shape.spec.ts` (my staged WB1 GREEN edits) | `c5-ticket-wb1` swept INTO their commit via likely `git add -A` or directory glob | **NO** — staged-by-me; their commit absorbed my staging | `63eba0f` published with my edits attributed to c5; orchestrator partial-revert at `9b8a4e9` restored clean state; WB1 GREEN re-authored at `228a2da` |
| RECURRENCE-2 | 2026-05-12 WB2 RED pre-stage | `probe-framemode-subscription.spec.tsx` (c5 territory pattern) staged into MY index without my action | parallel session (c5-class) | **YES** | Caught at mandatory `git status --short` checkpoint; `git restore --staged` unstaged before commit; no contamination |
| RECURRENCE-3 | 2026-05-12 WB3 RED pre-stage | `packages/dispatch-daemon/test/unit/max-parallel-aggregator.test.ts` (T10-class territory) | parallel session | **YES** | Caught + unstaged + clean commit |
| RECURRENCE-4 | 2026-05-12 WB3 GREEN pre-stage | `docs/cairn-under-stress-round-11.md` (FORBIDDEN to me via `docs/cairn-*.md` glob) | r11-archive-writer | **YES** | Caught + unstaged + clean commit |
| RECURRENCE-5 | 2026-05-12 WB3 GREEN pre-stage | `docs/coordination/round-11-archive-coauthor-notes-2026-05-12.md` (r11-archive-writer territory) | r11-archive-writer | **YES** | Caught + unstaged + clean commit |

**Pattern conclusion** [KNOWN]: when the mandatory pre-commit `git status --short` check is applied + foreign entries `git restore --staged`-unstaged before per-path add, **contamination is caught 100% of occurrences** (4/4 post-RECURRENCE-1). The single observed escape (RECURRENCE-1) preceded operator's mandatory-discipline directive. Operator §(d) requirement is load-bearing for parallel-cairn sessions and should be promoted to manifest-class enforcement (see §VII).

## §VII — Tier 2 followups proposed (orchestrator pickup; FOLLOWUPS.md FORBIDDEN to me)

| Proposed row | Tier | Rationale | Discoverability anchor |
|---|---|---|---|
| `MB-F-PARALLEL-CAIRN-PRE-STAGE-STATUS-MANDATORY` | Tier 2 | RECURRENCE-1 → RECURRENCE-5 demonstrate: cross-session staging contamination is endemic to shared working tree, occurs at rate of ~1 incident per WB step under Round 11 §3.9 Wave 2 concurrency. Pre-stage `git status --short` + selective `git restore --staged` catches 100% of contaminations when applied. Operator W2A + SUPERSEDES-A/B/C acks established this as session-level discipline; CLAUDE.md §2.7 should be amended to mandate pre-stage status check + post-stage diff inspection as PROCEDURAL invariants (not just narrative guidance). | This findings doc §VI; commit `758ef50` body + this WB-final commit body |
| `MB-F-SPAWN-RESULT-CONSUMER-TOEQUAL-FRAGILITY` | Tier 2 | 3 consumer test sites use exact-match `toEqual` on the 4-field result envelope (`test/unit/mb-t05/test_spawn_daemon_registration.spec.ts:73`, `test/unit/mb-t05/test_spawn_ipc_handler.spec.ts:92+105`, `test/unit/wiring-spawn/test_post_spawn_liveness_check.spec.ts:189`). Any new optional field breaks all 3. Fixed in this ladder via one-line per-site additions (W2A ad-hoc territory relaxation, operator-acked 2026-05-12), but MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS WB1 (peer `55776cf`) will hit the same fragility when adding `model?:` + `spawnedAtMs`. Closure: refactor all 3 sites to `expect.objectContaining({...})` in a single dedicated cleanup ticket, OR adopt as standing pattern. | Commit `758ef50` body + this findings doc §IV; manifest formalization request in §VIII |
| `MB-F-TILE-GRID-APP-SPAWN-RESULT-CONSUMER-DOES-NOT-PROPAGATE-SPAWNMODE` | Tier 3 | `tile-grid-app.tsx:159-185` is a sibling spawn-result subscription (the SAME wire shape FrameCRoot now consumes). FrameCRoot was selected for THIS closure because tile-grid-app.tsx was FORBIDDEN to me. If tile-grid-app.tsx surfaces are operator-displayed and would benefit from bypass-perms-indicator surfacing, replicate the WB3 GREEN diff (+ DetailPane prop forwarding) in tile-grid-app.tsx territory. Otherwise: no-op (single-source-of-truth in FrameCRoot is sufficient for v3.0). | Commit `7fc2e7a` body; this findings doc §V row 3 |
| `MB-F-SPAWNMODE-PROBE-MANIFEST-PATTERN-AMBIGUITY` | Tier 3 | Manifest glob `test/unit/tile-grid/probe-spawnmode-*.spec.ts` literally matches only `.spec.ts` (not `.spec.tsx`). WB3 probe needed JSX-equivalent React rendering; I authored via `React.createElement` to honor the literal glob, but this is awkward for any future tile-grid probe that wants real JSX. Resolution: amend manifest glob to `probe-spawnmode-*.spec.{ts,tsx}` for next session covering this territory. | Commit `8a34327` body (WB3 RED) + this findings doc §VIII |

## §VIII — Manifest territory delta surfaced for formalization

Per operator W2A ack 2026-05-12: "ad-hoc territorial expansion granted for this WB cycle to cover the 3 consumer test files — surface their paths in WB-final coord doc + commit body for manifest formalization." The following 3 paths were edited (one-line each) at WB2 GREEN and are NOT in the dispatch manifest as-authored:

```
packages/dispatch-workstation/test/unit/mb-t05/test_spawn_daemon_registration.spec.ts
packages/dispatch-workstation/test/unit/mb-t05/test_spawn_ipc_handler.spec.ts
packages/dispatch-workstation/test/unit/wiring-spawn/test_post_spawn_liveness_check.spec.ts
```

Edits per file: single `+ spawnMode: 'ask',` line added to existing `toEqual({...4-field envelope})` assertions. Edit signature is 1-line-each, contained, audit-reversible.

**Manifest formalization recommendation**: codify these 3 paths as a Tier 1 territory annex for any future `MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS`-class ticket (peer `55776cf` is the next session that will hit this; their manifest should pre-claim these paths to avoid a second ad-hoc relaxation cycle).

## §IX — Confidence summary

All claims in this doc are `[KNOWN]` from direct evidence cited inline (vitest output, `git show`, `git diff`, manifest text) OR `[MODELED]` from observed patterns labeled as such. No `[SPECULATIVE]` material.
