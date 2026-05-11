# MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE — wire `ctx N%` text onto Frame C list-row + detail-pane (+ optional Pane)

**Status:** DRAFT-PENDING-OPERATOR-REVIEW
**Date authored:** 2026-05-11
**Authored under:** §3.4 operator-supervised mechanical translation discipline (autonomous max-parallel; final Tier 1 body in queue)
**Authoring delegate:** T4 (commit-plan-doc) per GATE W3 Phase 1 continuation dispatch 2026-05-11
**Authoring anchor commit (HEAD at authoring time):** `a1f7a03`
**Cairn ladder anchor:** Tier 1 #5 per W1 disposition; Wave C (parallel-with-#3-after-#2-lands) per plan §F.3
**Closes:** Audit `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` §4.1 row "`ctx N%` text label" classification flip from WIREFRAME-VISION-NOT-SHIPPED → SHIPPED. Conditional partial closure of audit §10.6 token-meter-wiring row (data-source already SHIPPED at §C.5 13b7607; this ticket closes the text-rendering gap).
**Depends on (all merged):** §C.5 scraping infrastructure (`63f9b03` WB1+WB2 ANSI strip + debounce, `13b7607` WB3+WB4 model-context-windows + TileGridApp token wiring + main.ts sentinel — A-W1-2 confirmed). MB-T12 tile-grid (`TileGridSessionEntry` shape with `tokensUsed?` + `tokenBudget?` fields at `tile-grid.tsx:41-43`). MB-T15 tile-header token meter render at `tile-header.tsx:138-209` (existing fill-bar; this ticket ADDS visible text).
**Hard sequencing dependency:** §C.1′ ticket #2 Frame C surface (body authored at `a1f7a03`; **EXECUTION must land BEFORE this ticket's Frame C list-row + detail-pane WBs**). Body-only is insufficient — Frame C list-row + detail-pane components don't exist until #2 WB4 + WB8 ship. See §1.2 + §8 risk register.
**Downstream gates:** Audit §4.1 reclassification (WIREFRAME-VISION-NOT-SHIPPED → SHIPPED for `ctx N%` text row). Audit §10.6 partial-closure stamp (data-path was already complete at §C.5; this ticket closes the visible-text-rendering subset).
**Estimated WB count:** 4-6 (4 baseline if Sub-Q-A=(i); +2 if (iv) sibling tile-header pane integration; +0 if (iii) defer)

---

## §0 — Reading protocol

1. Read §1 (scope) + §2 (arbitration anchor) first.
2. Read §3 (GATE sub-arbitrations) — two operator decisions are pre-execution prerequisites (Sub-Q-A → WB scope expansion; Sub-Q-B → WB2/WB4 GREEN format).
3. Read §4 (WB ladder) for execution order. **Note hard-sequencing dependency on §C.1′ ticket #2 execution** at §1.2 — this ticket's WB1 RED probe is authorable today; WB2 GREEN requires #2's `frame-c/session-list.tsx` to exist.
4. §5-§8 are operational supports.

Confidence labels per CLAUDE.md §2.2 apply throughout. Audit-row text is `[KNOWN-OPERATOR-FILED-AT-2026-05-09]`, binding for closure scope.

---

## §1 — Scope

### §1.1 — What this ticket DOES

`[KNOWN-OPERATOR-ARBITRATED]` per W1 Tier 1 disposition + plan §F.3 + A-W1-2 confirmation:

1. Adds visible `ctx N%` text rendering to Frame C list-row (`frame-c/session-list.tsx` per #2 ticket body §1.1 item 3). Each session-list row displays "ctx {Math.round(tokensUsed / tokenBudget * 100)}%" inline next to existing token meter bar (Sub-Q-B=(a) default) OR per Sub-Q-B resolution.
2. Adds visible `ctx N%` text rendering to Frame C detail-pane (`frame-c/detail-pane.tsx` per #2 ticket body §1.1 item 4). Detail-pane shows ctx % alongside the selected session's content (per Sub-Q-MBTWBFCS-B=(i) swarm-state.md source).
3. **Surface integration only** — NO new scraping, NO new daemon changes, NO new IPC. Data already flows through:
   - `tile-token-scraper.ts:registerTileTokenScraper({broadcaster, onTokenUpdate})` shipped at `13b7607` (scraper source path: `packages/dispatch-workstation/src/main/tile-token-scraper.ts` — verified via `find`).
   - main.ts §C.5 sentinel zone fires `mainWindow?.webContents.send('workstation:tile-token-update', { sessionName, tokensUsed })` per `13b7607` wiring.
   - `tile-grid-app.tsx` consumes `workstation:tile-token-update` IPC → updates `TileGridSessionEntry.tokensUsed` per-session.
   - Frame C consumes `TileGridSessionEntry[]` from the same stream per #2 ticket body §1.1 item 3.
4. **Per-format-rendering choice per Sub-Q-MBTWBFCS-B**: (a) inline text next to bar (recommended; additive); (b) replace bar with text only; (c) hybrid bar + text.
5. **Conditional Pane sibling integration** per Sub-Q-MBTWTWS-A: extending visible text to existing `tile-header.tsx` token-meter at lines 202-209 (the wireframe "Pane" = current shipped tile-renderer; Hero is wireframe-Frame-B-only per audit §3 + §C.2 closed). Sub-Q operator-arbitrated; default `(i)` Frame C-only.
6. **Audit §4.1 reclassification** stamp at WB-final: "`ctx N%` text label" row flips WIREFRAME-VISION-NOT-SHIPPED → SHIPPED.

### §1.2 — What this ticket DOES NOT

`[KNOWN-OPERATOR-ARBITRATED]` constraints:

- Does NOT modify `tile-token-scraper.ts`. Scraper API + data shape are binding per §C.5 13b7607 ship.
- Does NOT add new IPC channels. `workstation:tile-token-update` is the only token-data channel; this ticket consumes; does not add.
- Does NOT modify `TileGridSessionEntry` shape. Existing `tokensUsed?` + `tokenBudget?` fields are sufficient; if Sub-Q-B=(b)/(c) shape requires per-session-ratio field, that's a separate Tier 3 follow-on (computed inline at render time is simpler).
- Does NOT modify frozen surfaces: `REGISTRY.md` §2, `CONDUCTOR_API_CONTRACT.md`, `dispatch-core/src/v3/schema.ts` §1-§13, `WORKSTATION_CONTRACT.md` §6.
- Does NOT touch MB-T-HSO-WIRE, frame-mode-state.ts, main.ts MB-T-HSO-WIRE zone, or other ticket #2 territory beyond the Frame C list-row + detail-pane component files.
- Does NOT include Hero surface (per audit §6.D Frame B Hero is wireframe-vision-only; §C.2 closed as not-selected). Hero is operator-out-of-scope.
- Does NOT close audit §10.6 token-meter-wiring row fully — that row covers data-path source (already SHIPPED at §C.5 13b7607) + visible text rendering (THIS ticket). WB-final stamp marks PARTIAL closure (text-rendering subset); the data-path subset was already closed by §C.5 commit chain.
- **Does NOT fire any WB until §C.1′ ticket #2 EXECUTION ships** Frame C list-row + detail-pane components. Body-only authoring (a1f7a03) is insufficient. WB1 RED probe IS authorable today (asserts components that don't yet exist → naturally RED); WB2 GREEN cannot ship until #2 execution lands. See §8 risk register.

---

## §2 — Arbitration anchor (W1 + audit §4.1 + plan §F.3)

### §2.1 — W1 Tier 1 disposition

`[KNOWN-OPERATOR-ARBITRATED-AT-W1]`

Per W1 wireframe-audit closure-tier ratification 2026-05-11: ticket #5 (token-wiring surface) is Tier 1, executable in Wave C (parallel-with-#3-after-#2-lands). A-W1-2 confirmation: scraping infrastructure SHIPPED at `13b7607`; ticket scope is SURFACE INTEGRATION only.

### §2.2 — Audit §4.1 `ctx N%` row verbatim

`[KNOWN-AUDIT-FILED-2026-05-09]`

From `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` §4.1 line 124:

> `ctx N%` text label | WIREFRAME-VISION-NOT-SHIPPED | Wireframe: `ctx {Math.round(s.tokens*100)}%` rendered inline with meter. Shipped: token percentage in `title=` tooltip only; no visible text. [KNOWN — `tile-header.tsx`]

Audit §10.6 sibling row (line 475) notes that the data-source decision was the blocker — that blocker is now resolved (PTY-scrape chosen per §C.5 13b7607 ship + A-W1-2). This ticket closes the text-rendering subset.

### §2.3 — Plan §F.3 anchor

`[KNOWN-PLAN-§F.3]` from `docs/coordination/v35-operational-readiness-2026-05-10.md` lines 562-565:

> "After §C.1′ ticket #1 + spike: §C.5 token-wiring ticket (ctx N% on Frame C list-row + detail-pane + Pane + Hero)"

Pane = current shipped tile-renderer (per audit §3 Dim 1 + §4.1 mapping). Hero = wireframe Frame B `.hero` element; not shipped per §C.2 closed. Operator-arbitrated at Sub-Q-MBTWTWS-A which surfaces this scope ambiguity.

---

## §3 — GATE sub-arbitrations REQUIRED before specific WBs

### §3.1 — Sub-Q-MBTWTWS-A: Pane + Hero scope

Required before **WB scope finalization** (WBs 1-4 fire either way; WBs 5-6 conditional). Default if unresolved: **(i) Frame C list-row + detail-pane only**.

| Option | Surface coverage | WB impact | Audit interaction |
|---|---|---|---|
| (i) Frame C only **(recommended)** | `frame-c/session-list.tsx` + `frame-c/detail-pane.tsx` | 4 WBs (2 RED + 2 GREEN) | Closes §4.1 `ctx N%` row for Frame C surface; tile-header pane retains tooltip-only state |
| (ii) Frame C + ConsolePanel | Adds `console-panel/` integration | +2 WBs | Misalignment: ConsolePanel is the per-tile PTY render, not the wireframe "Pane" container; risky scope creep |
| (iii) Defer Pane/Hero entirely to Tier 2 | Same as (i) but EXPLICITLY filed as Tier 2 follow-on for sibling surfaces | 4 WBs + 1 Tier 2 followup row | Clean ticket boundary; explicit deferral over implicit silence |
| (iv) Frame C + sibling tile-header pane | `frame-c/*` + `tile-header.tsx:202-209` text addition next to existing meter bar | +2 WBs | Closes §4.1 row for BOTH Frame C + tile-grid Frame A surfaces — most thorough; preserves wireframe-vision intent |

`[MODELED]` Recommend **(iv)** for completeness: tile-header is the SHIPPED "Pane" equivalent per audit §4.1; closing the ctx-text gap on Frame C AND tile-header in one ticket prevents a sibling follow-on. Cost: +2 WBs (~30 lines of code). Operator may prefer (i)+(iii) for ship-velocity if Frame A is deprioritized post-§A.1.R=(2) (Frame C primary).

Hero is out-of-scope under all options — wireframe-vision-only; §C.2 closed.

Operator decision pending.

### §3.2 — Sub-Q-MBTWTWS-B: `ctx N%` text format

Required before **WB2 GREEN** (and WB4/WB6 GREEN if (iv) selected). Default if unresolved: **(a) inline text next to existing bar**.

| Option | Render shape | UX impact |
|---|---|---|
| (a) Inline text next to bar **(recommended)** | `<bar/> <text>ctx 87%</text>` side-by-side; text is small (~10-11px) | Additive; preserves existing meter affordance; matches wireframe (`tile-header.tsx` audit row 124 cites wireframe as "rendered inline with meter") |
| (b) Replace bar with text only | `<text>ctx 87%</text>` only; bar removed | Cleaner; less visual noise; loses color-coded tint signal (TOKEN_TINT_HEX semantic at tile-header.tsx:155); regressive UX |
| (c) Hybrid bar + standalone text | Bar above + text below (or vice versa); separate line | Most prominent; takes more vertical space; may not fit Frame C list-row compact layout |

`[MODELED]` Recommend **(a)** for ship-velocity + UX preservation. Wireframe vision per audit row 124 already specifies "inline with meter" — (a) is wireframe-canonical.

Operator decision pending.

---

## §4 — WB ladder

4 WBs baseline (Sub-Q-A=(i)/(iii)); 6 WBs if Sub-Q-A=(iv) sibling pane integration. Construction-order: list-row → detail-pane → (optional) tile-header → docs.

Each WB follows cairn methodology: red authors failing probe; green implements minimum; commit body carries Q1-Q9 self-check per CLAUDE.md §10.5; per-path `git add` per §2.7; push after each cairn-grammar commit per §2.6.

### WB1 — `red(MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE): probe-MBTWTWS-01-session-list-ctx-text`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/unit/frame-c/probe-mbtwtws-01-session-list-ctx-text.spec.tsx`. Asserts: when `frame-c/session-list.tsx` is rendered with a `TileGridSessionEntry` whose `tokensUsed=87000, tokenBudget=200_000`, the session-row contains visible text matching `/ctx 4[34]%/` (87000/200000 = 43.5%; allow rounding tolerance). Per Sub-Q-B=(a) format: assert text rendered as a sibling element to the token-meter bar element. Probe fails RED — `frame-c/session-list.tsx` either does not exist yet (if #2 execution hasn't shipped) OR exists without ctx-text rendering (if #2 execution shipped without this addition).

**Acceptance:** probe RED. Commit body Q1-Q9.
**Sub-Q-A blocker:** WB1 probe authoring is independent of Sub-Q-A; assertions on Frame C list-row hold regardless.
**Hard-sequencing observation:** WB1 RED commit is authorable today; WB2 GREEN requires §C.1′ ticket #2 EXECUTION to have shipped `frame-c/session-list.tsx`. If #2 execution hasn't landed by WB1 commit time, RED state is "import-resolve failure" rather than "assertion failure" — either is acceptable RED per CLAUDE.md §2.3 (red asserts failing test exists).

### WB2 — `green(MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE): frame-c/session-list.tsx adds ctx N% text rendering`

**Type:** green
**Scope:** GREEN at `frame-c/session-list.tsx` (file shipped at #2 ticket WB4 — verify path before WB2 commit). Add ctx-text rendering per Sub-Q-B=(a):
```typescript
const ctxPct = Math.round(
  (entry.tokenBudget && entry.tokenBudget > 0)
    ? ((entry.tokensUsed ?? 0) / entry.tokenBudget) * 100
    : 0
);
// ... existing row layout ...
<span data-testid="frame-c-session-row-ctx-text" style={CTX_TEXT_STYLE}>
  ctx {ctxPct}%
</span>
```
Sub-Q-B=(b) removes the bar element (regressive); (c) adds standalone text line.

**Acceptance:** WB1 probe flips RED → GREEN. Commit body Q1-Q9.
**Frozen contracts touched:** none — surface integration only.
**Consumer probes (CLAUDE.md memory):** verify no regression in MB-T12 tile-grid rendering (Frame A still works; tile-header.tsx token meter renders correctly). Run existing tile-grid probes per WB2 post-commit.

### WB3 — `red(MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE): probe-MBTWTWS-02-detail-pane-ctx-text`

**Type:** red
**Scope:** RED probe at `probe-mbtwtws-02-detail-pane-ctx-text.spec.tsx`. Asserts: when `frame-c/detail-pane.tsx` renders for a selected session with non-zero `tokensUsed`, ctx N% text is visible (data-testid `frame-c-detail-pane-ctx-text`). Probe fails RED — detail-pane either does not exist (pre-#2 execution) OR exists without ctx-text addition.

**Acceptance:** probe RED. Commit body Q1-Q9.

### WB4 — `green(MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE): frame-c/detail-pane.tsx adds ctx N% text rendering`

**Type:** green
**Scope:** GREEN at `frame-c/detail-pane.tsx`. Add ctx-text element alongside the swarm-state.md content (per #2 Sub-Q-MBTWBFCS-B=(i)). Format per Sub-Q-MBTWTWS-B operator resolution.

**Acceptance:** WB3 probe flips RED → GREEN. Commit body Q1-Q9.

### WB5 — `red(MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE): probe-MBTWTWS-03-tile-header-ctx-text` [CONDITIONAL on Sub-Q-A=(iv)]

**Type:** red (CONDITIONAL)
**Scope:** RED probe at `probe-mbtwtws-03-tile-header-ctx-text.spec.tsx` if Sub-Q-A=(iv). Asserts: tile-header.tsx renders ctx N% text alongside the existing token-meter at lines 202-209. Probe fails RED — no ctx-text in current tile-header.tsx (per direct read 2026-05-11).

**Acceptance:** probe RED. Commit body Q1-Q9.
**If Sub-Q-A=(i)/(iii):** this WB is SKIPPED; ladder collapses to WB1-WB4 + final docs WB.

### WB6 — `green(MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE): tile-header.tsx adds ctx N% text rendering` [CONDITIONAL on Sub-Q-A=(iv)]

**Type:** green (CONDITIONAL)
**Scope:** GREEN at `tile-header.tsx:202-209`. Add ctx-text span before or after existing `<div data-testid="tile-header-token-meter" ...>` (per Sub-Q-B format).

**Acceptance:** WB5 probe flips RED → GREEN. Commit body Q1-Q9.
**If Sub-Q-A=(i)/(iii):** SKIPPED.

### WB7 — `docs(MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE): findings doc + audit reclassification + FOLLOWUPS updates`

**Type:** docs
**Scope:** author `docs/coordination/mbtwtws-findings-<date>.md` per MB-T-WIREFRAME-B1-TILE-VISUAL-SEPARATION (e41c9ea) findings-doc format. Sections: I What Shipped / II Q-disposition / III Architectural deltas / IV Probe distribution / V Architecture notes / VI Documentation drift / VII Consumer non-regression / VIII WB Skip Rationale (if Sub-Q-A=(i)/(iii)) / IX New Followups Filed / X Open Items.

Followup updates to `docs/FOLLOWUPS.md`:
- File NEW Tier 2 row if Sub-Q-A=(iii) selected: `MB-F-WIREFRAME-C5-TILE-HEADER-CTX-TEXT-DEFERRED` — tile-header (Frame A) ctx-text rendering deferred to follow-on per ticket #5 scope boundary.
- File NEW Tier 3 row if Sub-Q-B=(b) selected (regressive UX): `MB-F-FRAME-C-TOKEN-METER-BAR-REMOVED` — color-coded tint signal lost; consider hybrid restoration.
- Cross-ref `MB-F-T15-AUTOPILOT-TOKEN-INTEGRATION` (Tier 2 at line ~189) — autopilot-loop telemetry data source is sibling territory; this ticket uses PTY-scrape source per A-W1-2.

Audit-reclassification stamp at `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` §4.1 line 124: `ctx N%` text label row flips WIREFRAME-VISION-NOT-SHIPPED → SHIPPED. If Sub-Q-A=(iv), additionally stamp closure for the tile-header (Frame A) surface; otherwise note partial-closure for Frame C only.

**Acceptance:** findings doc + audit-reclassification + FOLLOWUPS.md updates land. Commit body Q1-Q9.
**Frozen contracts touched:** none — docs only.

---

## §5 — Cross-references

### §5.1 — Closures by this ticket

| Audit row / FOLLOWUP | Tier | Closure path | Closing WB |
|---|---|---|---|
| Audit §4.1 "`ctx N%` text label" | (audit row) | WB2 (Frame C list-row) + WB4 (Frame C detail-pane) + optional WB6 (tile-header) | WB7 stamp |
| Audit §10.6 token-meter-wiring | (audit row) | PARTIAL — data-path subset already closed by §C.5 13b7607; this ticket closes the text-rendering subset | WB7 partial-stamp |

### §5.2 — Likely-to-surface followups

`[MODELED-SPECULATIVE]`:

- WB2 may discover that `frame-c/session-list.tsx` from #2 execution differs in shape from #2 body's described structure (e.g., uses different prop drilling or splits the row into sub-components). Adapt at WB2 GREEN; surface at HALT-WB2-PRE-COMMIT if non-trivial.
- WB4 may discover that detail-pane's selected-session context lookup makes `tokensUsed/tokenBudget` access non-trivial (e.g., needs separate prop or context). Adapt at WB4.
- WB6 (if Sub-Q-A=(iv)) tile-header is in MB-T15 territory; the existing meter at lines 202-209 has stable test contracts (data-testid="tile-header-token-meter-fill"); adding ctx-text must NOT change those test contracts. File Tier 2 followup if regression observed.

### §5.3 — Related shipped tickets (read-required at WB1 start)

| Ticket | Anchor | Read scope at WB1 |
|---|---|---|
| §C.5 scraping infrastructure | `63f9b03` + `13b7607` | `tile-token-scraper.ts` API (path: `src/main/`); `tile-grid-app.tsx` IPC consumer of `workstation:tile-token-update`; main.ts §C.5 sentinel zone wiring |
| §C.1′ ticket #2 Frame C surface | `a1f7a03` body authored; **execution SHA TBD** | `frame-c/session-list.tsx` + `frame-c/detail-pane.tsx` post-execution shape — verify at WB1 |
| MB-T15 tile-header | tile-header.tsx HEAD | existing token meter render at lines 138-209; CTX_TEXT_STYLE constants if defined |

### §5.4 — Plan-doc + audit anchors (read at WB1 start)

- `docs/coordination/v35-operational-readiness-2026-05-10.md` §F.3 lines 562-565 (this ticket's plan anchor)
- `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` §4.1 line 124 (audit `ctx N%` row) + §10.6 line 475 (token-meter-wiring row)

---

## §6 — Self-check Q1-Q9 expectations per WB commit (CONDUCTOR_API_CONTRACT.md §10.5)

| WB | Q1 (spike?) | Q2 (mocks?) | Q3 (impl-deleted-passes?) | Q4 (outside contract?) | Q5 (frozen mod?) | Q6 (labels?) | Q7 (parallel territory?) | Q8 (bypass PATCH?) | Q9 (halt-unauth?) |
|---|---|---|---|---|---|---|---|---|---|
| WB1 RED | N/A — observational | BEHAVIOR (vitest + @testing-library/react render of Frame C list-row) | No — impl absent; RED until WB2 | No — probe-only | No | KNOWN/MODELED applied | new test/unit/frame-c/ path-disjoint from MB-T-HSO-WIRE + tile-grid territory | N/A | No (HALT auto-ack autonomous) |
| WB2 GREEN | (see WB1) | BEHAVIOR (real Frame C list-row render with token data) | No — impl load-bearing | No | No | KNOWN/MODELED applied | frame-c/ shipped by #2; adding ctx-text within session-list.tsx — flag at HALT-WB2-PRE-COMMIT if #2 execution shape differs from body | N/A | No |
| WB3+WB4 | N/A | BEHAVIOR | RED→GREEN flip per pair | No | No | KNOWN/MODELED | frame-c/detail-pane.tsx (per #2 ticket WB8 shipped); cross-session zone-disjoint | N/A | No |
| WB5+WB6 (CONDITIONAL Sub-Q-A=(iv)) | N/A | BEHAVIOR | RED→GREEN per pair | No | No | KNOWN/MODELED | tile-header.tsx in MB-T15 territory; verify no concurrent tile-header authoring before WB6 commit | N/A | No |
| WB7 docs | N/A | N/A | N/A | No — docs/coordination/ + docs/FOLLOWUPS.md + audit-doc edit | No | KNOWN per direct ticket-execution evidence | docs paths disjoint | N/A | No |

---

## §7 — Definition of done

The ticket is DONE when ALL of the following hold:

1. **§C.1′ ticket #2 EXECUTION shipped** Frame C list-row + detail-pane components — confirmed at WB1 start.
2. **WB1-WB4 cairn ladder lands**: each RED probe flips RED → GREEN at the corresponding GREEN WB.
3. **Frame C list-row renders visible ctx N% text** for each session per Sub-Q-B format.
4. **Frame C detail-pane renders visible ctx N% text** for the selected session.
5. **(CONDITIONAL Sub-Q-A=(iv))** tile-header.tsx renders visible ctx N% text alongside existing token meter at lines 202-209.
6. **5-package typecheck CLEAN** per CLAUDE.md §4.4.
7. **No regression in MB-T12/MB-T15 probes** (tile-grid + tile-header tests pass).
8. **WB7 findings doc + audit §4.1 reclassification stamp** lands; FOLLOWUPS.md updates per Sub-Q forks.
9. **No frozen-surface modification** — scraper API + IPC channels + schema + WORKSTATION_CONTRACT.md §6 all untouched.

---

## §8 — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| §C.1′ ticket #2 EXECUTION not yet shipped at this ticket's WB2 commit time — `frame-c/session-list.tsx` absent | `[KNOWN]` (this ticket is Wave-C; depends on #2 execution) | `[KNOWN-BLOCKING]` (WB2 GREEN cannot ship until #2 ships its component file) | Orchestrator dispatches this ticket's execution AFTER #2 execution completes; WB1 RED can author concurrently (probe RED on import-resolve OR assertion failure); WB2 GREEN gated on #2 component availability |
| #2 execution ships `frame-c/session-list.tsx` with different prop shape than #2 body described | `[MODELED-MEDIUM]` (execution drift from body authoring is common) | `[MODELED-LOW]` (adaptation at WB2 GREEN — read the actual shipped file at WB2 start) | WB1 + WB2 read scope includes verifying actual shipped `frame-c/session-list.tsx` API; surface adaptation at HALT-WB2-PRE-COMMIT if non-trivial |
| Sub-Q-B=(b) regressive UX (bar removed) loses color-coded tint signal; operator preference may swing back to (a)/(c) post-smoke | `[MODELED-LOW]` if (b) chosen | `[MODELED-MEDIUM]` (visual regression from MB-T15 shipped meter) | Default to (a) recommended; if operator selects (b), file Tier 3 followup pre-emptively |
| Sub-Q-A=(iv) tile-header modification — concurrent MB-T15 sibling work could collide | `[MODELED-LOW]` (no active MB-T15 ticket per FOLLOWUPS scan) | `[MODELED-MEDIUM]` (per-WB consumer non-regression check needed) | WB6 commit gated on `git status` clean at tile-header.tsx; pathspec-restricted commit isolates |
| `TileGridSessionEntry.tokenBudget` is `undefined` for sessions not yet seen by scraper — ctx N% renders as `ctx 0%` | `[MODELED-LOW]` (initial state before first chunk) | `[MODELED-LOW]` (transient; honest "0%" or "—" display) | WB2 GREEN handles `tokenBudget === undefined || tokenBudget === 0` case explicitly (render `ctx —` or hide text) — Sub-decision at WB2 implementation time |
| Audit §10.6 row text says "decision needed before ticket authoring" re: token source — but A-W1-2 already ratified PTY-scrape | `[KNOWN]` (audit-doc preceded A-W1-2 ratification) | `[MODELED-LOW]` (docs-drift; WB7 audit-stamp updates the row to note resolution) | WB7 reclassification stamp explicitly references A-W1-2 + §C.5 13b7607 commit chain; resolves docs-drift |

---

**End of MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE ticket body.**

Pending operator resolutions before execution:
- Sub-Q-MBTWTWS-A (§3.1) — Pane scope: (i) Frame C only, (ii) +ConsolePanel, (iii) defer Pane to Tier 2, (iv) +tile-header sibling
- Sub-Q-MBTWTWS-B (§3.2) — ctx N% text format: (a) inline next to bar (recommended), (b) replace bar, (c) hybrid

Hard sequencing: WB2 GREEN gated on §C.1′ ticket #2 EXECUTION (not body-only).
