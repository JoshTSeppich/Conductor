# coord-mb-t-phase-5-tile-header-status-integration-2026-05-13 — cross-session coordination notes

**Session**: `r12-phase5-tile-header-integration-body` (Round 12 §3.9 SPECULATIVE Wave 1 — plugin-loaded cohort)
**Ladder**: ticket-body authoring ONLY (3 docs); no impl scope — operator HALT-PRE-WB1 ack required before any code lands
**Closure target**: `MB-F-STATUS-INDICATOR-TILE-HEADER-INTEGRATION` (Tier 2, `docs/FOLLOWUPS.md:361`)
**Companion docs**: `coord-mb-t-phase-5-tile-header-status-integration-2026-05-13.md` (this doc) + `mb-t-phase-5-tile-header-status-integration-decisions-2026-05-13.md`

---

## §1 — Cross-session interlocks

| Sibling session | Their declared territory | Intersection with mine | Resolution |
|---|---|---|---|
| `commit-plan-doc-1334-status-indicator` (closed @ `bf99f9d`) | `src/main/session-status-source*.ts` + `src/tile-grid/status-indicator.tsx` + workstation tsconfig.json | Shipped surfaces I CONSUME (READ-ONLY) | Closed; my ticket body cites their findings + coord doc verbatim |
| `r12-phase5-bottom-rail-integration-body` (Round 12 Wave 1 sibling per dispatcher cohort) | Different followup (`MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` BypassPermsIndicator arm) | None — different component, different data source | Independent; no overlap on docs/build-docs/ or docs/coordination/ filenames |
| Other Round 12 Wave 1 plugin-loaded cohort sessions (3-4 sibling manifests per dispatcher §3.9) | Body-drafting only per round positioning | None — disjoint territories per Wave 1 plan | Independent |
| Future Wave 2 impl session for THIS ticket | `packages/dispatch-workstation/src/tile-grid/tile-grid-app.tsx` (Path B); possibly `tile-grid.tsx` + `tile.tsx` (Path A); possibly `tile-header.tsx` (Path C) | **Territory expansion needed** — see §2 | Wave 2 manifest must include scope expansion per operator Sub-Q-1 disposition |
| MB-T15-T19 ladder (chrome family) if any in-flight | Various `tile-grid/*.tsx` files | **Potential overlap with Path A/C** on `tile.tsx` or `tile-header.tsx` | Defer collision check to Wave 2 manifest authoring time |

---

## §2 — Tile-grid.tsx territory-expansion-needed surface for Wave 2 impl manifest

`[SPECULATIVE]` — operator HALT-PRE-WB1 binds the final shape via Sub-Q-1 disposition.

The shipped MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW ladder explicitly DEFERRED tile-grid.tsx integration because the predecessor manifest (`commit-plan-doc-1334-status-indicator`) marked `tile-grid.tsx` FORBIDDEN. This ticket closes the deferred surface. The Wave 2 impl session manifest MUST include territory expansion as follows:

### §2.1 — If operator chooses Path B (RECOMMENDED data-flow)

**Wave 2 impl manifest TERRITORY (write)**:
```
packages/dispatch-workstation/src/tile-grid/tile-grid-app.tsx
packages/dispatch-workstation/test/unit/tile-grid/probe-mbtphase5-status-integration-01-parent-closure.spec.tsx (NEW)
packages/dispatch-workstation/test/unit/tile-grid/probe-mbtphase5-status-integration-02-empty-window.spec.tsx (NEW)
packages/dispatch-workstation/test/unit/tile-grid/probe-mbtphase5-status-integration-03-dispose.spec.tsx (NEW)
docs/coordination/mb-t-phase-5-tile-header-status-integration-findings-2026-05-13.md (NEW)
docs/coordination/coord-mb-t-phase-5-tile-header-status-integration-2026-05-13.md (THIS FILE — Wave 2 may append §3 RECURRENCE catalog + §4 followups)
```

**READ-ONLY**: `src/tile-grid/tile-grid.tsx`, `src/tile-grid/tile.tsx`, `src/tile-grid/tile-header.tsx`, `src/tile-grid/status-indicator.tsx`, `src/main/session-status-source*.ts`, `src/frame-c/status-color.ts`, schema.ts, predecessor findings + coord docs, FOLLOWUPS.md.

**FORBIDDEN**: `tile-grid.tsx`, `tile.tsx`, `tile-header.tsx`, all status-source modules, schema.ts, daemon source, CLAUDE.md, frozen contracts.

**No tsconfig.json amendment needed** — Path B adds no new `.tsx` files under `src/tile-grid/`. New probes under `test/unit/tile-grid/` are covered by the blanket `test` exclude at `tsconfig.json:17`.

### §2.2 — If operator chooses Path A (followup-row-literal `renderStatusSlot`)

**Wave 2 impl manifest TERRITORY (write)** — additional files vs Path B:
```
packages/dispatch-workstation/src/tile-grid/tile-grid.tsx (add renderStatusSlot prop)
packages/dispatch-workstation/src/tile-grid/tile.tsx (add renderStatusSlot prop + render slot wrapper)
packages/dispatch-workstation/src/tile-grid/tile-grid-app.tsx (add parent-closure)
packages/dispatch-workstation/test/unit/tile-grid/probe-mbtphase5-status-integration-04-ratification-end-to-end.spec.tsx (NEW)
+ all Path B probes
```

**No tsconfig.json amendment needed** — no new `.tsx` files; only edits to existing files already in the exclude array.

**Risk**: edits to `tile-grid.tsx` + `tile.tsx` are stable surfaces; any cross-session tile-grid ticket in parallel must coordinate via per-path `git add` + pre-stage `git status --short` per CLAUDE.md §2.7.

### §2.3 — If operator chooses Path C (full collapse — NOT RECOMMENDED)

**Wave 2 impl manifest TERRITORY (write)** — additional files vs Path A:
```
packages/dispatch-workstation/src/tile-grid/tile-header.tsx (remove inline status dot span)
packages/dispatch-workstation/test/unit/tile-grid/probe-mbt12-*.spec.tsx (MB-T12 selector migration — file list to be enumerated at manifest authoring time)
```

**Risk**: MB-T12 unit tests (probe-01..04) use the unkeyed `tile-status-indicator` testid. Removing the inline span breaks them unless migrated atomically. Larger blast radius; defer unless operator explicitly invokes.

---

## §3 — RECURRENCE catalog (this session: BODY-DRAFTING-ONLY)

**Zero impl commits this session.** Body authoring discipline: 3 NEW docs only under declared TERRITORY; per-path `git add` + per-path commit pathspec per CLAUDE.md §2.7; pre-stage `git status --short` mandatory pre each commit.

No cross-session contamination expected because:
- Round 12 Wave 1 cohort is body-drafting only (per dispatcher); siblings are in disjoint doc territories.
- My TERRITORY is 3 NEW files in non-overlapping doc paths.
- FORBIDDEN globs prevent accidental impl scope creep.

Recurrence catalog will be populated at Wave 2 impl session if any contaminations observed there.

---

## §4 — Tier 2/3 followups proposed for orchestrator pickup (FOLLOWUPS.md FORBIDDEN to me)

`[SPECULATIVE]` — only proposed at this body-drafting stage; final tier + body authored at Wave 2 WB-final after impl evidence accumulates.

### §4.1 — Closure proposal at Wave 2 WB-final

```
| `MB-F-STATUS-INDICATOR-TILE-HEADER-INTEGRATION` | **CLOSED** by MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION at <Wave-2-WB-final-commit-hash>. Closure path: Path <A|B|C> per operator Sub-Q-1 disposition. End-to-end mechanism: <as-shipped summary>. **Discoverability**: this row's closure stamp + Wave 2 findings doc §I + decisions doc. | session r12-phase5-tile-header-integration-body 2026-05-13 (body) + Wave 2 impl session WB-final |
```

(Operator-mediated `docs/FOLLOWUPS.md:361` row revision.)

### §4.2 — Speculative new followups that may emerge at Wave 2 impl

Tracked here for forward-propagation per `[[feedback_followup_row_as_forward_propagation_memory]]`:

```
| `MB-F-STATUS-SOURCE-FRAME-C-SESSION-LIST-INTEGRATION` | **Tier 3 — Wire StatusIndicator (or data-flow snapshot) into FrameCRoot SessionList rows.** Per predecessor coord §1 row 2: SessionList currently uses inline STATUS_DOT_HEX literal at `session-list.tsx:64-70` (T1 vintage). Live updates possible by consuming `SessionStatusSource` analogous to this ticket's parent-closure pattern. **Closure paths**: (α) render StatusIndicator inside SessionList row chrome; (β) merge snapshot into SessionList's session entries (data-flow analog to Path B). **Tier 3** because SessionList rows are non-primary surfaces; tile-header integration ships the operator-visible primary path. **Discoverability**: this proposal + predecessor coord §1 row 2 + predecessor findings §V row 2. | proposed at body-drafting stage; final tier confirmed at Wave 2 impl WB-final |
```

```
| `MB-F-TILE-GRID-APP-USE-EFFECT-LIFECYCLE-STRICT-MODE-DOUBLE-INVOKE` | **Tier 3 — Verify SessionStatusSource lifecycle under React strict-mode double-invoke pattern.** This ticket's WB3 dispose probe asserts mount-count == dispose-count; if strict mode is enabled (workstation renderer may or may not), the assertion needs `vi.advanceTimersByTime(0)` + double-mount/dispose handling. **Closure**: confirm strict-mode disposition + amend WB3 probe if needed. **Tier 3** because deterministic in test fixture; only matters in production strict-mode rollout. | proposed at body-drafting stage; final tier confirmed at Wave 2 impl WB3 |
```

(Both speculative; may be folded into Wave 2 WB-final findings or filed standalone depending on impl observations.)

---

## §5 — Closure stamp request (at Wave 2 WB-final)

Per operator-mediated FOLLOWUPS / dispatch queue update (both FORBIDDEN to me):

- **Move** Wave 2 impl session dispatch row (TBD name) from IN-FLIGHT to COMPLETED in `docs/coordination/dispatch-queue-current.md`.
- **Reference closure commits**: TBD at Wave 2 impl time. Body-drafting (this session) ships 3 doc commits — those are NOT closure commits for the ticket itself; they're scaffolding for Wave 2.
- **Closure path**: `MB-F-STATUS-INDICATOR-TILE-HEADER-INTEGRATION` (FOLLOWUPS.md:361) → CLOSED at Wave 2 WB-final. Path A/B/C per operator Sub-Q-1 disposition.

---

## §6 — Plugin agent dispatches (§11(VIII) evidence track)

- `cairn-phase-1-diagnose`: dispatched at session start (one invocation) — surface inventory + arbitration questions + risks. Returned concise diagnose with 5 arbitration questions + 5 risks. Conserved main-context budget by avoiding broad-codebase scan via main thread.
- `cairn-anti-fabrication-verifier`: NOT dispatched — surface claims were already direct-read by main thread via grounding tasks (#1-#4) before body composition; each KNOWN claim cites file:line.
- `cairn-followup-drafter`: NOT dispatched — followup rows proposed in §4 are speculative scaffolding only; final body authored at Wave 2 WB-final with concrete impl evidence.
- `cairn-cross-package-impact`: NOT dispatched — no schema-touching analysis required (schema.ts is READ-ONLY consumed via shipped source); zero cross-package impact for this ticket.
- `cairn-test-failure-triage`: N/A — no impl, no test runs.

Total plugin agent dispatches this session: **1** (cairn-phase-1-diagnose).

---

## §7 — Confidence summary

All factual claims `[KNOWN]` from direct evidence cited inline (Read tool reads of `tile-grid.tsx`, `tile-grid-app.tsx`, `tile.tsx`, `tile-header.tsx`, `status-indicator.tsx`, `session-status-source.ts`, `probe-...-02-integration.spec.tsx`, `FOLLOWUPS.md`, `tsconfig.json`). Sub-Q dispositions in companion decisions doc are `[SPECULATIVE]` until operator HALT-PRE-WB1 ack — at which point they become `[KNOWN-OPERATOR-ARBITRATED]`. Recommendation strength is `[MODELED]` based on surface inventory + blast-radius analysis.
