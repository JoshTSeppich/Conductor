# MB-T-WIREFRAME-T7-VISUAL-POLISH — Findings (2026-05-12)

**Ticket body:** `docs/build-docs/CONDUCTOR_MB-T-WIREFRAME-T7-VISUAL-POLISH_BUILD.md` (committed at `8f5beac`).
**Authoring delegate:** T7 sub-session (Opus 4.7; prior ladder MB-T-WIREFRAME-T3-ACTION-BAR-WIRING COMPLETE at `bae1b97`) spawned by orchestrator-2026-05-12-0953 (gen-4 PRIMARY) for Phase 1 second batch ticket-body authoring.
**Anchor commits:** body `8f5beac` → WB1 RED `5bf7261` → WB2 GREEN `02c0807` → WB3 RED `a0fe7a7` → WB4 GREEN `be24ed8` → WB5 RED `68d2be2` → WB6 GREEN `77deec0` → WB7 RED (superseded) `1685769` → Tier 1 followup `095e507` → WB7-revised `66059ef` → WB8 GREEN `ba49029` → WB9 RED `039df45` → WB10 GREEN `c37ebe5` → WB11 docs (this commit).
**Round:** 9 of cairn-under-stress.
**Status:** 10 of 11 WBs landed + pushed; WB11 docs (this file) is the final WB.

---

## §I — Sub-Q resolutions (operator-arbitrated 2026-05-12)

All 7 (8 with conditional H) Sub-Qs resolved at recommended defaults via full-autonomous orchestrator dispatch ack:

| Sub-Q | Topic | Resolution | Material consequence |
|---|---|---|---|
| **A** (LOAD-BEARING) | Styling approach | **(α) extend existing inline-CSSProperties pattern** | Matches 170-site codebase precedent; zero new dev dep; zero §6 amendment |
| **B** | Status-color palette source | **(i) ratify T1 placeholder hex** (GREEN/GREY/AMBER/RED `#5b9d6e/#888888/#c97a3a/#c54a4a`) | WB2 comment-stamp ratification; T1 hex values preserved verbatim |
| **C** | Model-badge color-coding | **(i) per-family colors** (Sonnet=`#5eb3c4` teal/blue, Opus=`#9b6dd7` purple/violet, Haiku=`#d4a04a` amber/gold, unknown=`#7a8290` neutral) | New `modelToFamily` helper at `model-badge.ts`; `MODEL_BADGE_STYLE_BY_FAMILY` Record at session-list.tsx |
| **D** | FilterBar scope split | **(i) T7 ships structural + T1 future-WB wires logic** | **OVERRIDDEN BY ANTI-FABRICATION FINDING**: T1's WB11 ladder shipped BOTH structural component (`session-filter-bar.tsx`) AND filter logic (`applyFilter`) concurrent with T7 body authoring. WB7-revised supersession + WB8 GREEN pivoted to visual-polish-only. Filed Tier 1 `MB-F-T7-WB7-FILTERBAR-SCOPE-OBSOLETED-BY-T1-WB11`. |
| **E** | Bottom-rail polish scope | **(i) polish existing chat-shell/ only; defer tab-switcher** | WB9-WB10 scope narrowed via anti-fabrication discipline (chat-shell substantially shipped); narrowed to cost-meter wireframe-format polish only |
| **F** | Selected-tile highlight | **(i) background-color shift + left-border accent** | WB4 GREEN: ROW_STYLE_SELECTED with bg `#1f2a3f` (T1-preserved) + borderLeft `3px solid #4a7fb8` accent + sticky-note wrapper bg `#0a0a0a` |
| **G** | Visual-diff acceptance gate | **(i) operator-manual fallback** (only option until T6 γ ships) | WB-FINAL operator visual-diff against wireframe-target-2026-05-11.png |
| **H** | Design-token module location | **N/A** (Sub-Q-A=α ratified; no design-token module shipped) | — |

---

## §II — Anti-fabrication findings (two catches; lessons applied)

### §II.1 — Three Phase-1 catches resolved at ticket-body §2

1. **Codebase has zero external CSS files + zero styled-components** at HEAD `bae1b97`. Sub-Q-A defaulted to (α) extend-inline-CSSProperties (matches 170-site precedent).
2. **Deliverable path `docs/build-docs/tickets/...`** referenced by dispatch is NOT the established convention. Used `CONDUCTOR_MB-T-WIREFRAME-T7-VISUAL-POLISH_BUILD.md` per T1/T2/T3 precedent.
3. **`wireframe-target-2026-05-11.png`** is operator-side only (not in repo). Sub-Q-B/C operator-provided refinement defaulted to (i) sub-session-driven palette + operator visual-diff at WB-FINAL.

### §II.2 — WB7 anti-fabrication catch (Tier 1 row filed `095e507`)

T1's WB11 ladder shipped `frame-c/session-filter-bar.tsx` (SessionFilterBar + applyFilter + DEFAULT_FILTER_STATE) + wired in `FrameCRoot:275-279` CONCURRENT with T7's ticket-body authoring at HEAD `bae1b97`. T7 ticket body §3.4 Sub-Q-D=(i) assumed FilterBar didn't exist; the dispatch + body were stale on this point.

**Contract drift surfaced at WB8 GREEN authoring** (direct source read of frame-c-root.tsx):
- T7's WB7 RED probe (`1685769`) targeted a NEW `frame-c/filter-bar.tsx` with `FilterBar` component + `onFilterChange` callback + null-sentinel FilterState.
- T1's shipped surface: `SessionFilterBar` component + `onFilterStateChange` prop + `'all'`-sentinel FilterState + different testid suffixes (`frame-c-filter-status` / `frame-c-filter-repo` / `frame-c-filter-clear` vs T7's `filter-bar-status-select` / `filter-bar-repos-select` / `filter-bar-clear-btn`).
- Root testid `frame-c-filter-bar` matches between both (coincidental).

**Operator option-(A) remediation 2026-05-12**:
- T7 WB7-revised (`66059ef`) superseded original WB7 RED — deleted obsolete probe + authored `probe-mbtwft7-07-revised-session-filter-bar-ratification.spec.tsx` codifying T1's shipped contract (ratification probes; trivially-passing baselines) + ACTIVE-RED probe for WB8 GREEN visual-polish target (BAR_STYLE backgroundColor sticky-note tint).
- WB8 GREEN (`ba49029`) pivoted from "ship NEW FilterBar" to "visual-polish T1's SessionFilterBar styling" — single-property additive `backgroundColor: '#0a0a0a'` matching T7 WB4 GREEN SessionList LIST_ROOT_STYLE wrapper bg for consistent sticky-note aesthetic.

**Pattern instance**: CLAUDE.md memory `feedback_stale_dispatch_detection.md` — "check git log + FOLLOWUPS + findings doc at Phase 1 before any RED scaffold; dispatch prompts can describe already-merged work." T7 Phase-1 body-authoring did `ls docs/build-docs/CONDUCTOR_MB-T-WIREFRAME-T*.md` but did NOT `grep -r "FilterBar|filter-bar" packages/dispatch-workstation/src/frame-c/` for shipped precedent.

### §II.3 — WB9 anti-fabrication scope-narrowing (applied lesson)

Per WB7 catch lesson, WB9 authoring began with direct source read of all 4 chat-shell components BEFORE probe scaffold:
- **dispatch-mode-toggle** already has active-state via BUTTON_ACTIVE_STYLE (`background:#374151 + fontWeight:600`) + aria-pressed semantic + testids. Wireframe "Auto highlighted = autonomous" SHIPPED.
- **plan-usage-ring** already renders SVG ring + countdown via shipped testids.
- **mix-indicator** already renders chip with shipped testids.
- **cost-meter** renders ONLY the value (`$0.42` per formatCost); NO wireframe-mandated "conductor api · ... today" prefix/suffix.

WB9-WB10 scope NARROWED from ticket body §4 WB9's 4-component enumeration to 1-component concrete-gap (cost-meter prefix/suffix per dispatch §1 verbatim text). Remaining 3 components functionally-shipped; deferred to Tier 3 `MB-F-T7-CHATSHELL-POLISH-REMAINING-DOGFOOD-DRIVEN` (filed this WB11).

---

## §III — WB ladder verification summary

| WB | Type | Commit | Probes | Verification |
|---|---|---|---|---|
| body | docs | `8f5beac` | N/A | 8 Sub-Qs operator-arbitrated at defaults |
| WB1 | red | `5bf7261` | 6 trivially-passing (Sub-Q-B=i ratify baseline contract codification) | Locks in T1 hex values as v3.0 ratified palette |
| WB2 | green | `02c0807` | 6 PASS | Comment-stamp ratification at status-color.ts:30-40 |
| WB3 | red | `a0fe7a7` | 5 (2 ACTIVE-RED 03c+03e; 3 trivial-baseline 03a/03b/03d) | T1 ships aria-selected + selected-bg; borderLeft + sticky-note RED |
| WB4 | green | `be24ed8` | 5 PASS | ROW_STYLE_SELECTED borderLeft `#4a7fb8` + LIST_ROOT_STYLE bg `#0a0a0a` |
| WB5 | red | `68d2be2` | 6 RED (modelToFamily not yet exported; @ts-expect-error type-level RED) | All 6 fail at HEAD; per-family-color test |
| WB6 | green | `77deec0` | 6 PASS | modelToFamily helper added; MODEL_BADGE_STYLE_BY_FAMILY Record + data-attr |
| WB7 (original) | red | `1685769` | (superseded; obsolete contract) | Cairn-log artifact for Tier 1 row discoverability |
| Tier 1 filing | docs | `095e507` | N/A | MB-F-T7-WB7-FILTERBAR-SCOPE-OBSOLETED-BY-T1-WB11 |
| WB7-revised | red | `66059ef` | 5 (1 ACTIVE-RED 07e BAR_STYLE bg; 4 trivial-baseline 07a-07d ratify T1 contract) | Deletes obsolete probe + adds revised |
| WB8 | green | `ba49029` | 5 PASS | session-filter-bar.tsx BAR_STYLE `backgroundColor: '#0a0a0a'` |
| WB9 | red | `039df45` | 4 (2 ACTIVE-RED 09c+09d; 2 trivial-baseline 09a/09b) | Cost-meter prefix/suffix per wireframe-target text |
| WB10 | green | `c37ebe5` | 4 PASS | cost-meter.tsx PREFIX_STYLE + SUFFIX_STYLE + spans |
| WB11 | docs | (this commit) | N/A | Findings + 3 Tier 2/3 followups |

**Aggregate test coverage** [KNOWN]: 26+ probes across 6 T7 spec files; 11+ probes consumer non-regression (cost-meter Wave C #5 + T4; DetailPane Wave B WB7); 15 probes total at WB10 GREEN verification. Typecheck CLEAN at every WB.

---

## §IV — Runtime-launch smoke (deferred to operator-mediated)

Per CLAUDE.md §4.6 + ticket body §7 Definition of Done point 11, runtime-launch smoke is operator-mediated per dispatch §3.5 visual-comparison gate fallback (until T6 γ headless screenshot pipeline ships per `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-γ-HEADLESS-SCREENSHOT` Tier 2 closure).

**Pre-flight commands** (operator-runnable):
```
pnpm --filter dispatch-core build
pnpm --filter dispatch-workstation build
pnpm --filter dispatch-workstation exec electron dist/main/main.js
```

**Expected visual surfaces at HEAD post-WB11**:
1. WINDOW_READY sentinel within ~10s.
2. Toggle to Frame C.
3. SessionList rendered with:
   - Sticky-note wrapper backgroundColor `#0a0a0a`.
   - Per-row status dot in ratified palette (GREEN/GREY/AMBER/RED).
   - Model badge in per-family color (Sonnet=teal, Opus=purple, Haiku=amber).
   - Selected row has bg shift `#1f2a3f` + left-border accent `#4a7fb8`.
4. SessionFilterBar above SessionList with backgroundColor matching SessionList wrapper.
5. Bottom rail cost-meter renders `conductor api · $0.42 today` format.

If runtime surface differs from expected OR operator visual-diff identifies regressions, file Tier 1 `MB-F-MBTWFT7-RUNTIME-SURFACE-<DESCRIPTOR>` + HALT per ticket body §4 WB-FINAL.

---

## §V — Followups filed at this WB11 docs commit

(See FOLLOWUPS.md row additions in this commit.)

1. **`MB-F-T7-CHATSHELL-POLISH-REMAINING-DOGFOOD-DRIVEN` (Tier 3)** — dispatch-mode-toggle / plan-usage-ring / mix-indicator visual refinements deferred to operator-visual-diff-driven future cycle (these components functionally-shipped at HEAD; further polish is subjective without dogfood feedback).
2. **`MB-F-T7-TAB-SWITCHER-POLISH-DEFERRED-TO-T4-CLOSURE` (Tier 3)** — bottom-rail tab switcher (Chat/Commits/BUILD.md) is T4 territory; T7 visual polish deferred per Sub-Q-E=(i).
3. **`MB-F-T7-VISUAL-DIFF-AUTOMATION-DEFERRED-TO-T6-GAMMA-CLOSURE` (Tier 3 informational)** — cross-references existing `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-γ-HEADLESS-SCREENSHOT` Tier 2; tracks operator-time cost of manual-fallback visual-diff for T7 + future visual-polish tickets.

Already-filed at WB7 catch (`095e507`):
- **`MB-F-T7-WB7-FILTERBAR-SCOPE-OBSOLETED-BY-T1-WB11` (Tier 1)** — anti-fabrication catch; T7 ladder pivot to visual-polish-only via WB7-revised + WB8 GREEN.

Note: ticket body §5.2 originally enumerated `MB-F-FILTERBAR-LOGIC-NOT-WIRED-T1-TERRITORY` Tier 2 — OBSOLETED by the Tier 1 row already filed (logic IS wired by T1; not deferred). Not filed.

---

## §VI — Cross-session coordination notes

| Sibling workstream | Coord seam | Status at T7 WB11 |
|---|---|---|
| **T1** (Session data flow) | T1 explicit T7-handoff comments at `status-color.ts:31-33` + `session-list.tsx:80-81` + selection-state visual deferral; T1 WB11 ladder shipped SessionFilterBar concurrently | T7 WB2 ratified palette; T7 WB4 added borderLeft + sticky-note bg; T7 WB6 added per-family colors; T7 WB7-revised + WB8 ratified + visually polished T1 SessionFilterBar. Path-overlap risk RESOLVED via operator option-(A) remediation. |
| **T2** (Terminal stream) | DetailPane DOM slot ordering — T2 owns TerminalStream + TerminalHeaderBar + ToolIndicatorStrip additions. T7 didn't touch DetailPane structural surface | No conflict observed. T2 ladder advanced WB8/WB9/WB10 during T7 ladder; T2 owns DetailPane scope. |
| **T4** (Bottom rail) | Tab switcher (Chat/Commits/BUILD.md) + Auto/Ask toggle + max-parallel counter — T4 NOT YET SHIPPED (no T4 body at HEAD per ls) | T7 polished EXISTING chat-shell/ components only per Sub-Q-E=(i); tab-switcher polish deferred via Tier 3 followup. |
| **T5** (BUILD.md driven dispatch) | Path-disjoint at chat-shell/ component layer; T5 active on workstation main.ts + preload.mts during T7 ladder | No conflict observed. T5 sibling staging in main process; T7 in chat-shell renderer. |
| **T6** (Methodology infra) | Path-disjoint; α + β shipped at `0d71590`; γ headless screenshot pipeline deferred | T7 ladder benefited from α + β auto-rebuild discipline indirectly; γ closure required for automated visual-diff at WB-FINAL. |

---

## §VII — Outcome classification per CLAUDE.md §2.11

**Improved (binary flip + behavioral quality)** — T7 ticket scope:
- Status-color palette ratified (WB1+2).
- SessionList selected-tile borderLeft accent + sticky-note wrapper bg (WB3+4).
- Model-badge per-family color coding (WB5+6).
- SessionFilterBar sticky-note bg refinement via WB7-revised + WB8 (operator option-(A) post anti-fabrication catch).
- Cost-meter wireframe-target text format (WB9+10).

**Anti-fabrication catch + remediation** (operator option-(A)):
- WB7 catch: T1's WB11 ladder shipped FilterBar; T7 WB7+WB8 scope pivoted to visual-polish-only.
- WB9 catch (applied lesson): chat-shell substantially shipped; WB9-WB10 scope narrowed to cost-meter only.

**Capability enabled with known limitations** (T7-scoped sub-classification):
- Visual polish structurally complete at probe layer; operator visual-diff at WB-FINAL is the load-bearing acceptance gate.
- Hex values in palettes (status-color + model-family) are representative; operator visual-diff may refine.
- Chat-shell remaining polish (3 components) deferred to dogfood-driven cycle.
- Tab-switcher polish deferred until T4 ships.
- Headless visual-diff automation deferred until T6 γ ships.

---

## §VIII — Definition-of-done checklist

Per ticket body §7:

- [x] (1) WB0 contract commit — N/A under Sub-Q-A=(α) default.
- [x] (2) WB1+WB2 status-color palette ratified; 6 probes lock in.
- [x] (3) WB3+WB4 SessionList selected-highlight + sticky-note; 5 probes flipped.
- [x] (4) WB5+WB6 model-badge per-family colors; 6 probes flipped.
- [x] (5) WB7-revised + WB8 SessionFilterBar ratification + sticky-note bg; 5 probes flipped via operator-(A) remediation.
- [x] (6) WB9+WB10 cost-meter wireframe-format polish (scope-narrowed via anti-fab); 4 probes flipped.
- [x] (7) WB11 docs (this commit).
- [x] (8) Consumer non-regression — all touched modules' consumer probes (Wave B WB7 + Wave C #3 + Wave C #5 + T4 cost-meter aggregation + T1 SessionFilterBar ratification) stay GREEN at every WB.
- [x] (9) Workstation typecheck CLEAN at every WB.
- [x] (10) Dispatch-core build fresh — N/A (T7 touched no dispatch-core schemas).
- [ ] (11) Runtime-launch smoke — DEFERRED to operator per dispatch §3.5 visual-comparison gate fallback.
- [ ] (12) Operator visual verification against wireframe target — DEFERRED to operator-side post-merge.

---

## §IX — Authoring stats

| Stat | Value |
|---|---|
| WB count actual | 11 (matches ticket body §4 default estimate) + 1 mid-ladder Tier 1 filing |
| Commits | 13 (10 ladder + 1 Tier 1 + 1 supersession + 1 docs) |
| Anti-fabrication catches | 2 (WB7: FilterBar already shipped; WB9: chat-shell substantially shipped) |
| Files modified (src) | 4: status-color.ts (comment), session-list.tsx (multiple), model-badge.ts (modelToFamily), session-filter-bar.tsx (bg), cost-meter.tsx (prefix+suffix) |
| Files modified (test) | 5 NEW spec files + 1 superseded probe deletion |
| Frozen surface touches | 0 |
| Total LOC added (src) | ~80 net |
| Total LOC added (probes) | ~900 |

---

**End of MB-T-WIREFRAME-T7-VISUAL-POLISH findings.**
