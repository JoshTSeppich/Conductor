# MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE Findings — 2026-05-11

**Ticket:** MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE — wire `ctx N%` text onto Frame C list-row + detail-pane + tile-header
**Body anchor:** `8ff40a8 docs(MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE): ticket body authored under §3.4 mechanical translation`
**Executing session:** `verify-chat-mount-1319` (Wave C #5 executor; rotation successor to `verify-chat-mount`)
**Orchestrator:** `orchestrator-2026-05-11-1257` (gen-3)
**WB ladder:** 7 WBs total (4 baseline + 2 conditional under Sub-Q-A=(iv) + 1 docs)
**Pre-arbitrated envelope (operator 2026-05-11):**
- Sub-Q-MBTWTWS-A = **(iv) +tile-header sibling integration**
- Sub-Q-MBTWTWS-B = **(a) inline text next to bar** (additive)

**Cairn ladder (6 cairn commits + 1 docs commit):**

| WB | Commit | Type | Surface |
|---|---|---|---|
| WB1 | `f7b2e70` | red | probe-mbtwtws-01 session-list ctx-text (5 conditions; Sub-Q-B=a inline format) |
| WB2 | `d5ba210` | green | `session-list.tsx` ctx N% inline text rendering |
| WB5 | `e18a5a3` | red | probe-mbtwtws-03 tile-header ctx-text (5 conditions incl. anti-regression sentinel; Sub-Q-A=iv sibling) |
| WB6 | `8205b01` | green | `tile-header.tsx` ctx N% sibling text rendering |
| WB3 | `8b3f356` | red | probe-mbtwtws-02 detail-pane ctx-text (6 it-blocks across 5 describe blocks; post-Wave-B-WB8-clearance) |
| WB4 | `bd31b94` | green | `detail-pane.tsx` ctx N% inline text rendering + `frame-c-root.tsx` tokens prop threading |
| WB7 | (this commit) | docs | findings + audit §4.1 reclass stamp + audit §10.6 partial-stamp |

**Sequencing note:** WB ladder shipped OUT-OF-ORDER (WB1/WB2/WB5/WB6 before WB3/WB4). WB3/WB4 detail-pane work had a HARD external sequencing dependency on Wave B WB8 GREEN (Wave B ship of `detail-pane.tsx` component); HALT-PRE-WB-DETAIL-PANE held until `525c502 green(MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE): WB8` landed in `origin/main` and operator dispatched UNBLOCK. WB5/WB6 tile-header was path-disjoint per dispatch envelope ("WB-tile-header GREEN is path-disjoint from T4-successor; authorable in parallel"), so shipped during the halt window instead of sitting idle.

---

## I — What Shipped

`[KNOWN]` Per direct read + probe evidence:

**Frame C session-list rows** (`packages/dispatch-workstation/src/frame-c/session-list.tsx`):
- New `CTX_TEXT_STYLE` constant (11px, `#9ca3af`, `marginLeft:auto` for right-alignment, `flexShrink:0`, no-wrap).
- Per-row `ctxPct = Math.round(((tokensUsed ?? 0) / tokenBudget) * 100)` guarded for `tokenBudget` undefined OR 0 → fallback `ctx 0%`.
- New `<span data-testid="frame-c-session-row-ctx-text-{name}">` as DIRECT child of the row div (sibling to status/name/meta), per Sub-Q-B=(a).

**`tile-header.tsx`** (`packages/dispatch-workstation/src/tile-grid/tile-header.tsx`):
- New `CTX_TEXT_STYLE` constant (10px, `#9ca3af`, `flexShrink:0`, `fontVariantNumeric:tabular-nums` for stable width across % transitions).
- New `<span data-testid="tile-header-ctx-text">` placed BEFORE the existing token-meter div as a sibling at the same flex level inside `tile-header-content`. Sub-Q-A=(iv) sibling integration.
- Reuses existing `tokenRatio` compute at line 150 (already guarded against `tokenBudget=0`).
- MB-T15 token-meter contract preserved verbatim (bar element + fill element + `data-testid`s + fill width still tracks ratio).

**Frame C detail-pane** (`packages/dispatch-workstation/src/frame-c/detail-pane.tsx`):
- `DetailPaneProps` extended with optional `tokensUsed?: number` + `tokenBudget?: number` (adaptation per ticket body §8 risk register row 2).
- New `META_ROW_STYLE` flex-row wrapper containing the existing `HEADER_STYLE` div + new ctx-text span (header on left, ctx-text right-aligned via `marginLeft:auto`).
- `HEADER_STYLE.marginBottom` moved to `META_ROW_STYLE` (the row now owns the spacing as a unit).
- New `CTX_TEXT_STYLE` constant (11px, `#9ca3af`, `marginLeft:auto`, `flexShrink:0`, tabular-nums).
- ctxPct computed inline per same fallback pattern as session-list.

**FrameCRoot threading** (`packages/dispatch-workstation/src/frame-c/frame-c-root.tsx`):
- New `selectedEntry = selected !== null ? sessions.find((s) => s.name === selected) : undefined` lookup.
- `<DetailPane>` invocation extended with `tokensUsed={selectedEntry?.tokensUsed}` + `tokenBudget={selectedEntry?.tokenBudget}`. Optional chaining preserves the ctx-0% fallback path for stale-selection edge cases.

**Tests** (3 new probes, 16 it-blocks total):
- `packages/dispatch-workstation/test/unit/frame-c/probe-mbtwtws-01-session-list-ctx-text.spec.tsx` — 5 it-blocks
- `packages/dispatch-workstation/test/unit/frame-c/probe-mbtwtws-02-detail-pane-ctx-text.spec.tsx` — 6 it-blocks
- `packages/dispatch-workstation/test/unit/tile-grid-tile/probe-mbtwtws-03-tile-header-ctx-text.spec.tsx` — 5 it-blocks

---

## II — Q-disposition (sub-arbitrations)

| Sub-Q | Disposition | Source | Commit citation |
|---|---|---|---|
| Sub-Q-MBTWTWS-A | **(iv) Frame C + sibling tile-header pane** | operator pre-arbitrated 2026-05-11 (dispatch envelope) | `a1f7a03` (#5 body authored) + this ticket's WB5/WB6 commits |
| Sub-Q-MBTWTWS-B | **(a) inline text next to bar** (additive) | operator pre-arbitrated 2026-05-11 (dispatch envelope) | `a1f7a03` + this ticket's WB2/WB4/WB6 commits |

No new arbitration surfaced during execution. The WB4 prop-extension adaptation (DetailPaneProps + tokens) was explicitly anticipated by ticket body §8 risk register row 2 ("Adapt at WB4") — no escalation needed.

---

## III — Architectural deltas

`[KNOWN]` direct-read summary:

1. **DetailPaneProps shape change** — added optional `tokensUsed?` + `tokenBudget?` props. Wave B WB8 (`525c502`) shipped DetailPane with `{ selectedSessionName }` only; WB4 extended for token data threading per body §8 risk-row anticipation. Sibling impact: FrameCRoot was the sole call site; updated in same commit (`bd31b94`).
2. **Inline ctx-text rendering** added to 3 surfaces (session-list rows, tile-header, detail-pane). Common pattern across all three:
   - `Math.round(((tokensUsed ?? 0) / tokenBudget) * 100)` percent compute
   - Guard for `tokenBudget` undefined/0 → fallback `ctxPct=0`
   - `data-testid` for probe queryability
   - Sub-Q-B=(a) "inline" semantic: sibling-level placement (not nested inside body content)
3. **No new IPC channels.** The §6 amendment (`workstation:read-swarm-state` + `frame-c:{diff,merge,focus}`) at `0f0e762` was Wave B's territory; this ticket consumes the existing `workstation:tile-token-update` data path (shipped at §C.5 `13b7607`) via the `TileGridSessionEntry.tokensUsed` / `tokenBudget` fields.
4. **No frozen-surface modifications.** REGISTRY.md §2 + CONDUCTOR_API_CONTRACT.md + `dispatch-core/src/v3/schema.ts` §1-§13 + WORKSTATION_CONTRACT.md §6 all untouched.

---

## IV — Probe distribution

| Probe file | Location | Conditions | it-blocks | Behavior covered |
|---|---|---|---|---|
| probe-mbtwtws-01 | `test/unit/frame-c/` | 5 | 5 | session-list rows ctx-text presence, percent compute, per-row data binding, edge fallback, Sub-Q-B=(a) inline placement |
| probe-mbtwtws-02 | `test/unit/frame-c/` | 5 | 6 | detail-pane ctx-text presence, percent compute, edge fallback (undef + 0), bridge-independence, Sub-Q-B=(a) inline placement (not-inside-<pre>) |
| probe-mbtwtws-03 | `test/unit/tile-grid-tile/` | 5 | 5 | tile-header ctx-text presence, percent compute, edge fallback, MB-T15 meter contract preservation (anti-regression sentinel), Sub-Q-B=(a) sibling-to-meter placement |

**[KNOWN]** All 16 it-blocks GREEN at WB7 author time:
- `pnpm --filter dispatch-workstation exec vitest run test/unit/frame-c/` → 40/40 GREEN (8 files; my 3 probes + 5 sibling-ticket probes)
- `pnpm --filter dispatch-workstation exec vitest run test/unit/tile-grid-tile/` → 105/105 GREEN (10 files; my probe + 9 sibling MB-T12/MB-T15 probes)

**Consumer non-regression** (per CLAUDE.md memory `feedback_consumer_non_regression_per_wb`):
- WB2 verified all `test/unit/frame-c/` probes GREEN (24/24 at WB2 commit time).
- WB6 verified all `test/unit/tile-grid-tile/` probes GREEN (105/105 at WB6 commit time) — critically including MB-T15 `probe-05-tile-header-integration` (21 tests).
- WB4 verified all `test/unit/frame-c/` probes GREEN (40/40 at WB4 commit time) — including Wave B `probe-mbtwbfcs-04-detail-pane-renders` (4 tests; no regression on DetailPane render contract).

---

## V — Architecture notes

### V.1 — ctx-text is bridge-independent in DetailPane

A non-obvious design choice in WB4 GREEN: ctx-text rendering does NOT depend on `window.workstationBridge.readSwarmState()` resolution. The percent is sourced from props (FrameCRoot → DetailPane), not from the bridge data. Consequence: ctx-text renders in the initial sync render, even before useEffect fires; even if the bridge is unavailable (mount-without-bridge case in probe-mbtwtws-02 Condition 4); even when the bridge surfaces an error inline. This separation is intentional — token data is a UX-visible metric per session, semantically independent of the swarm-state.md content that the bridge fetches.

### V.2 — `marginLeft:auto` for flex-row right-alignment

Session-list rows + detail-pane meta-row both use `marginLeft:auto` on `CTX_TEXT_STYLE` to right-align the ctx-text within the flex container without needing `justifyContent:space-between` or extra spacer divs. Tile-header does NOT use this pattern — ctx-text is placed adjacent to the meter at natural flex order (the meter is already at the row end via `flexShrink:0`).

### V.3 — `fontVariantNumeric: 'tabular-nums'`

tile-header + detail-pane ctx-text use `fontVariantNumeric: 'tabular-nums'` so the text width is stable across percent transitions (87% → 88% doesn't reflow the row). session-list does not — session-list rows have higher visual variability (status + name + meta vary already) so the stability gain is marginal.

### V.4 — DetailPane stale-selection fallback

`FrameCRoot.selectedEntry = sessions.find(s.name === selected)` may return `undefined` if a session is removed from sessions[] while still `selected`. DetailPane handles this via the same `tokenBudget undefined → ctxPct=0` fallback path, surfacing "ctx 0%" alongside the existing detail-pane content (which would show "No swarm-state section found..."). Not a defect — honest "no data" surface. Filed as `[MODELED-LOW]` polish concern (no new Tier 2/3 row).

---

## VI — Documentation drift

`[KNOWN]` updates applied in this WB7 commit (see audit-reclass section):
- `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` §4.1 line 124 row → reclassed WIREFRAME-VISION-NOT-SHIPPED → SHIPPED + post-amendment paragraph appended after line 138.
- `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` §10.6 line 477 row → partial-closure stamp (text-rendering subset; data-path subset was already closed by §C.5 `13b7607`).

No other docs touched. `docs/build-docs/CONDUCTOR_MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE_BUILD.md` (ticket body) remains DRAFT-PENDING-OPERATOR-REVIEW per its status header; operator-side action to update status post-execution is operator discretion (not in WB7 scope per body).

---

## VII — Consumer non-regression

Per CLAUDE.md memory `feedback_consumer_non_regression_per_wb`: verified at every WB.

| WB | Suite run | Result | Notes |
|---|---|---|---|
| WB1 | (red only) | probe authored; 5/5 RED | — |
| WB2 | `test/unit/frame-c/` | 24/24 GREEN | probe-mbtwbfcs-01..04 (Wave B sibling) no regression; my probe-mbtwtws-01 flipped GREEN |
| WB5 | (red only) | probe authored; 4/5 RED + 1/5 PASS (anti-regression sentinel — MB-T15 meter contract intact at HEAD) | — |
| WB6 | `test/unit/tile-grid-tile/` | 105/105 GREEN | MB-T15 probe-05 (21 tests) preserved verbatim; my probe-mbtwtws-03 flipped GREEN |
| WB3 | (red only) | probe authored; 6/6 RED | post-Wave-B-WB8 unblock |
| WB4 | `test/unit/frame-c/` | 40/40 GREEN | Wave B probe-mbtwbfcs-04 detail-pane render contract preserved; my probe-mbtwtws-02 flipped GREEN |

**Workstation typecheck CLEAN** at every WB commit (verified pre-commit each cycle via `pnpm --filter dispatch-workstation typecheck`).

---

## VIII — WB Skip Rationale

N/A — Sub-Q-A=(iv) selected (full 6-WB ladder + WB7 docs); no WBs skipped. Construction-order reordered (WB1/WB2 → WB5/WB6 → WB3/WB4 → WB7) per dispatch envelope clearance for path-disjoint parallel work on tile-header during HALT-PRE-WB-DETAIL-PANE window. Reorder did not skip or merge WBs; each WB landed as authored.

---

## IX — New Followups Filed

**NONE.** Sub-Q forks that would have triggered followups were not selected:
- Sub-Q-A=(iii) deferral → would have filed `MB-F-WIREFRAME-C5-TILE-HEADER-CTX-TEXT-DEFERRED` Tier 2. NOT triggered (Sub-Q-A=(iv) selected; tile-header surface SHIPPED at WB6).
- Sub-Q-B=(b) bar removal → would have filed `MB-F-FRAME-C-TOKEN-METER-BAR-REMOVED` Tier 3. NOT triggered (Sub-Q-B=(a) selected; meter bar preserved verbatim, anti-regression sentinel passing).

No new defects or surprises emerged during execution. Cross-ref `MB-F-T15-AUTOPILOT-TOKEN-INTEGRATION` (Tier 2; existing): autopilot-loop telemetry data source is sibling territory; this ticket uses PTY-scrape source per A-W1-2 ratification — no follow-on action.

---

## X — Open Items

None on this ticket. Adjacent open work (informational, not ticket-blocking):

1. `MB-F-WORKSTATION-CONTRACT-SECTION-6-DRIFT-AUDIT` (Tier 2; existing) — Wave B WB8 IPC §6 amendment landed at `0f0e762`; drift audit deferred per operator. Not in this ticket's territory.
2. Wave B WB9-WB11 in progress (`commit-plan-doc-1334` session) — main.ts sentinel-zone wiring + workstation-shell.html DOM region for Frame C mount + final integration polish. Not in this ticket's territory.
3. Wave C #3 in progress (`c5-ticket-wb1` session) — MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS WB1+WB2 landed (`07a7d93` RED + `cde9308` GREEN); ActionBar component shipped renderer-integrated bridge-free. Not in this ticket's territory.

---

**End of findings.**

Authored 2026-05-11 by `verify-chat-mount-1319` (Wave C #5 executor) under operator-pre-arbitrated envelope + scope-expansion §C auto-ack discipline.
