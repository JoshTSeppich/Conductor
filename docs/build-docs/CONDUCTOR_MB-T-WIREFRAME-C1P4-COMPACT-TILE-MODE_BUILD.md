# MB-T-WIREFRAME-C1P4-COMPACT-TILE-MODE — Compact `Tile` variant for Frame A render path

**Status:** DRAFT-PENDING-OPERATOR-REVIEW
**Date authored:** 2026-05-11
**Authored under:** §3.4 operator-supervised mechanical translation discipline
**Authoring delegate:** parallel-track session (Opus 4.7), bounded by operator-frozen envelope 2026-05-11 (Batch 1, parallel-2-of-3)
**Authoring anchor commit (HEAD at authoring time):** `d4b0420`
**Cairn ladder anchor:** post §C.1′ Frame Router (`44764fd`); sibling of MB-T-WIREFRAME-C1P1 (CSS, T2 in flight) + MB-T-WIREFRAME-C1P2 (Frame C surface, T4 in flight)
**Closes:**
- Audit §4.1 re-classification (Dim 2 / Tile Chrome) of 4 `SHIPPED-BEYOND-WIREFRAME` elements under shell-mode `'A'` (compact): approval-policy picker, autopilot toggle, collapse/expand, detach. Re-classified `SHIPPED-COMPACT-MODE` (hidden in `'A'`, visible in `'C'`).
- Post-audit plan §A.1.R=(2) Frame-C-primary + A-toggle render-coherence: Frame A operator-toggle yields a wireframe-aligned 4×4 dense-grid tile presentation (per `wireframes.jsx:223-248`).
**Depends on (all merged):**
- §C.1′ ticket #1 Frame Router (`44764fd`) — `FrameMode = 'A' | 'C'` + `readFrameMode`/`writeFrameMode` at `frame-mode-state.ts:1-34` + IPC bridge.
- MB-T12 tile-grid (post-WB5/WB10/WB11) — `Tile` component at `tile.tsx:116-235` with chrome composition.
- MB-T15 (`TileHeader` chrome), MB-T16 (`TileApprovalPicker`), MB-T17 (`TileAutopilotToggle`), MB-T18 (`TileFooter`) — shipped chrome the compact variant CONDITIONALLY hides.
**Downstream gates:**
- Audit §4.1 re-classification doc update (Dim 2 strategic finding refresh).
- §A.1.R=(2) Frame A toggle yields coherent render under realistic session counts (≥4 tiles).
**Estimated WB count:** 2-3 (WB1 RED + WB2 GREEN + WB3 docs); +1 if Sub-Q-MBTWBCTM-B=α requires upstream `tile-grid-app.tsx` FrameMode plumbing not already shipped under `44764fd`.

---

## §0 — Reading protocol

1. Read §1 (scope) + §2 (arbitration anchor — what's binding) first.
2. Read §3 (GATE sub-arbitrations) — TWO operator decisions are pre-execution prerequisites: element-set (Sub-Q-MBTWBCTM-A) + FrameMode threading mechanism (Sub-Q-MBTWBCTM-B).
3. Read §4 (WB ladder) for execution order. Note WB count is contingent on Sub-Q-MBTWBCTM-B outcome.
4. §5-§8 are operational supports — cross-references, self-check, definition-of-done, risk register.
5. §9 closing posture (anomalies surfaced at HALT-AUTHORED).

Confidence labels per CLAUDE.md §2.2 apply throughout: `[KNOWN]` observed in this session via direct source/git read; `[MODELED]` reasoned from observed facts plus a stated model; `[SPECULATIVE]` hypothesis without evidence. Operator-frozen-envelope outcomes are `[KNOWN-OPERATOR-ARBITRATED]` and binding for ticket scope.

---

## §1 — Scope

### §1.1 — What this ticket DOES

`[KNOWN-OPERATOR-ARBITRATED]` per Gate-W3 dispatch envelope 2026-05-11 + plan §6.2 row "§C.1′ ticket #4":

1. **Author** a `compact` variant of the `Tile` component at `tile.tsx` such that, when `FrameMode === 'A'`, the rendered tile presents only the wireframe-aligned minimum chrome set: status-dot + session-name + status text + token meter (the `TileHeader` chrome already aligned with the wireframe per audit §4.1 SHIPPED rows). The `SHIPPED-BEYOND-WIREFRAME` chrome — approval-policy picker, autopilot toggle, collapse/expand button, detach button — is HIDDEN under `'A'` per the exact element-set bound by Sub-Q-MBTWBCTM-A.

2. **Detect** the active `FrameMode` inside the render path via the mechanism bound by Sub-Q-MBTWBCTM-B (prop-drilled vs React context vs store-subscription). Default-fall-through behavior (FrameMode = `'C'`, the `frame-mode-state.ts:8` default) MUST render the existing full-chrome tile unchanged so the post-WB2 production default render is bit-identical to pre-WB2.

3. **Preserve** the existing three-tier integration pattern audit §4.1's strategic finding cites as binding (RENDERER-INTEGRATED, MOUNTED-VIA-RENDER-PROP, DECOUPLED). The compact variant hides chrome AT RENDER TIME; it does NOT remove the props from `TileProps`, does NOT delete the slot wrappers, and does NOT modify the bridge-free design of `Tile`. The render-prop closures supplied by `TileGridApp` (`renderPickerSlot`, `renderAutopilotSlot`, `renderFooterSlot`) remain wired upstream but render-empty when in compact mode.

4. **Update** the audit §4.1 table to reflect the new SHIPPED-COMPACT-MODE classification for the affected rows — `WB3 docs` commit, single docs/coordination/ + docs/FOLLOWUPS.md edit per cairn discipline.

### §1.2 — What this ticket DOES NOT

`[KNOWN-OPERATOR-ARBITRATED]` constraints:

- Does NOT touch `packages/dispatch-workstation/src/main/main.ts`. Frame Router IPC + persistence already shipped at `44764fd`. T2 (`MB-T-WIREFRAME-C1P1` CSS body) and T4 (`MB-T-WIREFRAME-C1P2` Frame C surface body) are not yet in execution territory but operator may dispatch their EXECUTION concurrently with this ticket; main.ts contention is a real risk — this ticket explicitly avoids it.
- Does NOT modify `frame-mode-state.ts`. `FrameMode` type + read/write helpers are shipped + binding at `44764fd`. WB1/WB2 consume the existing API.
- Does NOT modify `TileHeader`, `TileApprovalPicker`, `TileAutopilotToggle`, `TileFooter`, `ConsolePanel`, or any other downstream chrome component. Compact-mode behavior is gated at the `Tile` wrapper level (per `tile.tsx:116-235` composition pattern); downstream components are unmodified consumers of the same prop contracts.
- Does NOT modify frozen surfaces: `REGISTRY.md` §2, `docs/build-docs/CONDUCTOR_API_CONTRACT.md`, `packages/dispatch-core/src/v3/schema.ts` §1-§13, `docs/build-docs/WORKSTATION_CONTRACT.md` §6.
- Does NOT introduce a new IPC channel. If Sub-Q-MBTWBCTM-B=α requires `tile-grid-app.tsx` to subscribe to FrameMode changes from main and the existing 44764fd shipped subscription path is insufficient, halt-and-surface — that scope is upstream and would be a separate ticket / amendment to ticket #1.
- Does NOT modify `docs/coordination/wireframes.jsx`. The 4×4 dense-grid wireframe vision is operator-territory; ticket #4 closes the gap, it does not modify the source-of-truth wireframe.
- Does NOT close `MB-F-T13-TILE-HEADER-PICKER-INTEGRATION` or `MB-F-T12-AUTOPILOT-TILE-TOGGLE-INTEGRATION` followups. Those track full-chrome wiring; compact mode is a render-time gate, not a wiring closure.
- Does NOT measure perceptual-density Q-V35 thresholds. Visual evaluation is operator-driven post-WB2/WB3 via the Frame A toggle.

---

## §2 — Arbitration anchor (operator-frozen 2026-05-11)

### §2.1 — Plan §6.2 row "§C.1′ ticket #4" + §A.1.R=(2) bind scope

`[KNOWN-OPERATOR-ARBITRATED]`

Plan `v35-operational-readiness-2026-05-10.md` §6.2 line 657 enumerates the ticket scope verbatim: "§C.1′ ticket #4 (Compact tile mode): Trim Tile component to compact variant when shell-mode = A. `tile.tsx` (Frame A render path). Parallel-CC viable: YES." Plan §A.1.R=(2) (Frame-C-primary + A-toggle) is the binding architectural posture: Frame C is the default render mode; Frame A is operator-toggled and presents a compact 4×4 dense-grid tile presentation aligned to the wireframe vision.

§6.3 line 666 confirms file-ownership disjointness: "ticket #4 touches `tile.tsx` (no overlap)" — this ticket is parallel-CC viable against T2 (CSS body, separate file) + T4 (Frame C surface, separate `frame-c/` directory).

### §2.2 — Audit §4.1 strategic finding is binding

`[KNOWN-OPERATOR-ARBITRATED]`

Audit §4.1 strategic finding: "Bidirectional asymmetric divergence — neither shipped nor wireframe is a strict subset." The compact variant addresses one half of the divergence (shipped-beyond-wireframe chrome that ought to be conditionally hidden under wireframe-aligned `'A'`). It does NOT address the inverse half (wireframe-vision-not-shipped elements: tile-level visual separation, ctx N% text, footer max-plan, etc.) — those remain other-ticket scope (MB-T-WIREFRAME-C1P1 CSS for visual-separation; etc.).

The three-tier integration pattern (§4.1 strategic finding paragraph) is binding architectural discipline: compact-mode rendering MUST preserve `Tile`'s bridge-free design + the MOUNTED-VIA-RENDER-PROP composition. Render-prop closures (supplied by `TileGridApp`) render-empty under compact mode; they are NOT torn down or unmounted.

### §2.3 — Compact-mode is render-gated, not architectural-gated

`[KNOWN-OPERATOR-ARBITRATED]`

The compact variant is a RENDER-TIME branch inside `Tile`, NOT an architectural separation (i.e., not a sibling component `CompactTile` mounted in parallel to `Tile`). Rationale: avoiding a sibling component preserves all existing `TileProps`, test fixtures, prop-drill paths, and MB-T15/16/17/18 wiring without duplication. The render branch checks `FrameMode === 'A'` and conditionally suppresses chrome.

This decision is binding for WB2 GREEN scope. If WB1 probe design or WB2 implementation surfaces evidence that render-gating is structurally insufficient (e.g., a chrome component has irreducible mount-time side effects that compact mode must avoid), halt-and-surface for re-arbitration; do NOT improvise a sibling-component refactor.

---

## §3 — GATE sub-arbitrations REQUIRED before specific WBs

Two operator decisions remain pre-execution prerequisites. Surface at HALT-MBTWBCTM-AUTHORED for operator resolution before WB1 (both sub-Qs) — Sub-Q-MBTWBCTM-A determines the probe's exact assertions; Sub-Q-MBTWBCTM-B determines whether WB1 probe needs upstream `tile-grid-app.tsx` integration or stays at `Tile`-only scope.

### §3.1 — Sub-Q-MBTWBCTM-A: exact compact-mode element set

Required before **WB1 RED** (probe assertion shape) and **WB2 GREEN** (implementation branch). Default if unresolved: **(i) hide ALL SHIPPED-BEYOND-WIREFRAME chrome** (strict wireframe-alignment).

The 4 SHIPPED-BEYOND-WIREFRAME elements identified at audit §4.1 are:

1. `TileApprovalPicker` (`tile-approval-picker.tsx`) — MB-T16; tight/medium/loose select; full daemon round-trip per `approval-policy-ipc.ts`.
2. `TileAutopilotToggle` (`tile-autopilot-toggle.tsx`) — MB-T17; checkbox/switch; workstation-side state only.
3. Collapse/expand button (`tile.tsx:193-199` `tile-collapse-btn`) — MB-T12 WB10; persists via `tile-grid-state.ts`.
4. Detach button (`tile.tsx:200-206` `tile-detach-btn`) — MB-T12 WB11; opens detached BrowserWindow.

| Option | Action | Trade-off |
|---|---|---|
| **(i) Strict wireframe-alignment** | Hide ALL 4 elements under compact. Tile shows only: status-dot + session-name + branch + repo + model-chip + token-meter (the `TileHeader` chrome at `tile-header.tsx`) + ConsolePanel body. Body+footer slots render but slot closures may render-empty downstream. | Faithful to wireframe `pane`. Loses per-tile ops affordances entirely under `'A'`; operator must toggle to `'C'` to use approval-picker / autopilot / collapse / detach. |
| **(ii) Selective preservation** | Hide collapse + detach (incidental controls); KEEP approval-picker + autopilot (load-bearing ops). Tile shows: TileHeader + picker-slot + autopilot-slot + ConsolePanel body. No collapse-btn, no detach-btn. | Pragmatic — preserves the two ops controls that gate active orchestrator behavior. Slightly less dense than (i); diverges from strict wireframe vision but matches operational need. |
| **(iii) Operator-on-demand expansion** | Hide all 4 by default + add a small expand-affordance (e.g., gear icon) that reveals the chrome on click. Compact-by-default; full-on-demand. | Most flexible; adds new UI element + state + likely a new followup row (`MB-F-COMPACT-EXPAND-AFFORDANCE` etc.). Out of plan §6.2 verbatim scope ("trim to compact variant") — surface as scope-creep if pursued. |

`[MODELED]` Recommend **(i) strict wireframe-alignment** as default disposition. Rationale: wireframe `pane` shows only status + name + body. Plan §A.1.R=(2) is "Frame-C-primary + A-toggle" — the operator-driven toggle to `'A'` is explicit; pragmatic ops affordances live under the default `'C'` where they remain visible. (ii)'s "load-bearing ops" framing is actually addressed by toggling back to `'C'` — an operator wanting to set approval-policy on a peer can switch frame, not stay in compact. (iii) adds chrome the wireframe does not anticipate.

Operator decision pending. WB1 RED probe assertions are operator-arbitrated by this choice; (i) produces 4 hide-assertions, (ii) produces 2 hide-assertions, (iii) produces 4 hide-assertions + 1 expand-affordance-assertion.

### §3.2 — Sub-Q-MBTWBCTM-B: FrameMode threading mechanism into `Tile`

Required before **WB1 RED** (probe construction) and **WB2 GREEN** (implementation surface). Default if unresolved: **(α) prop-drilled from `TileGridApp`**.

`Tile` is RENDERER-INTEGRATED + bridge-free per audit §4.1 strategic finding. It does NOT directly read filesystem state, does NOT subscribe to IPC channels, and does NOT consume React context today. To know the active `FrameMode`, the variant must receive the value from upstream. Three viable paths:

| Option | Surface | Wiring scope | Test ergonomics |
|---|---|---|---|
| **(α) Prop-drilled `frameMode` on `TileProps`** | `Tile` receives `frameMode: FrameMode` as a new optional prop. `TileGridApp` (the tile tree's owner per `tile-grid-app.tsx`) subscribes to FrameMode changes via the existing `44764fd` IPC bridge + threads the value as a prop to each `<Tile>`. | `tile.tsx` (add prop + branch) + `tile-grid-app.tsx` (subscribe + thread). If `44764fd` already shipped renderer-side FrameMode subscription, scope is `tile-grid-app.tsx`-only; if NOT, scope adds an additional renderer-side subscription + state hook. | Cleanest — tests pass `frameMode` directly to `<Tile>` as a prop fixture; no provider setup. |
| **(β) React context `FrameModeContext`** | New `FrameModeProvider` mounted at the tile-grid renderer root (`tile-grid-app.tsx`); `Tile` consumes via `useContext(FrameModeContext)`. | New module (e.g., `frame-mode-context.tsx`) + `tile-grid-app.tsx` (mount provider) + `tile.tsx` (consume). | Provider boilerplate in every test fixture; minor friction but standard React pattern. |
| **(γ) Module-level state subscription** | `Tile` directly subscribes to a renderer-side store that mirrors `frame-mode-state.ts`. | New renderer-side store module + main↔renderer sync. | Awkward — `Tile`'s bridge-free principle (§4.1 strategic finding RENDERER-INTEGRATED tier) is violated. NOT RECOMMENDED. |

`[MODELED]` Recommend **(α) prop-drilled**. Rationale: simplest; preserves three-tier discipline (Tile stays bridge-free); aligns with existing `TileGridApp`-owns-state convention; cleanest unit-test fixture surface. (β) is acceptable if operator prefers context-based threading (Conductor chat-panel uses one — established pattern); (γ) violates audit §4.1 discipline + surfaces upstream-rebuild discipline complexity (renderer-side store sync).

Operator decision pending. Choice affects:
- Whether WB1 probe is `Tile`-scoped (α: pass `frameMode` directly) or composition-scoped (β: render via `<FrameModeProvider value='A'><Tile.../></FrameModeProvider>`).
- Whether estimated WB count is 2-3 (no upstream wiring needed) or 3-4 (upstream `tile-grid-app.tsx` work in scope).

### §3.3 — Sub-Q-MBTWBCTM-C: closure-state framing for audit §4.1 elements

Required before **WB3 docs** (audit re-classification commit). Default if unresolved: **(α) re-classify 4 rows to `SHIPPED-COMPACT-MODE` (or `SHIPPED-FRAME-A-HIDDEN`) + amend strategic finding paragraph**.

After WB2 GREEN ships, audit §4.1 rows for approval-picker / autopilot / collapse / detach require new classification. Three docs paths:

| Option | Action |
|---|---|
| **(α) Re-classify rows + amend strategic finding** | 4 rows updated `SHIPPED-BEYOND-WIREFRAME` → `SHIPPED-COMPACT-MODE` (or operator-preferred label). §4.1 strategic finding paragraph appended with closure note: bidirectional-asymmetric-divergence one-half-closed under shell-mode `'A'`. |
| **(β) Single audit amendment + new row** | Keep `SHIPPED-BEYOND-WIREFRAME` for full-mode classification + add new compact-mode-classification row showing the conditional behavior. More verbose but preserves the original audit state. |
| **(γ) Defer audit doc edit + file followup** | Leave audit doc as-is; file Tier 3 `MB-F-AUDIT-DOC-COMPACT-MODE-RECLASSIFICATION` for a future audit-doc-refresh pass to absorb. |

`[MODELED]` Recommend **(α)**. Rationale: cleanest; audit doc is operator-authored research artifact; mid-life updates to reflect closures are within-spec. (β) is acceptable for archaeological completeness if operator prefers. (γ) is acceptable if operator wants to batch audit-doc refreshes.

---

## §4 — WB ladder

WB count: 2-3 if Sub-Q-MBTWBCTM-B=α (no upstream wiring) + Sub-Q-MBTWBCTM-A=(i)/(ii) (no expand-affordance scope); +1 if Sub-Q-MBTWBCTM-B=β (provider boilerplate); +1-2 if Sub-Q-MBTWBCTM-A=(iii) (expand-affordance scope).

### WB1 — `red(MB-T-WIREFRAME-C1P4-COMPACT-TILE-MODE): probe asserts compact variant activates on FrameMode='A'`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/unit/tile-grid/probe-mbtwbctm-01-compact-tile-mode.spec.tsx` (NEW file; happy-dom environment per per-file vitest pragma — react/jsx pattern mirrors existing `test/unit/mb-t08/test_onboarding_modal_advances_to_api_key.spec.tsx`). Assertions per Sub-Q-MBTWBCTM-A choice + Sub-Q-MBTWBCTM-B threading mechanism:

For Sub-Q-MBTWBCTM-A=(i) + Sub-Q-MBTWBCTM-B=α (recommended defaults):
- **probe-01** Render `<Tile frameMode='A' ...minimal-props />`. Assert: `tile-collapse-btn` is NOT in DOM, `tile-detach-btn` is NOT in DOM, `tile-picker-slot-{name}` renders empty (no picker content), `tile-autopilot-slot-{name}` renders empty (no autopilot content).
- **probe-02** Render `<Tile frameMode='C' ...minimal-props />` (or `frameMode` omitted, default behavior). Assert: `tile-collapse-btn` IS in DOM, `tile-detach-btn` IS in DOM, `tile-picker-slot-{name}` + `tile-autopilot-slot-{name}` wrappers render (slot closures may be empty in fixture).
- **probe-03** Render `<Tile frameMode='A' />` with non-empty render-prop closures (`renderPickerSlot` returns a stub element). Assert: the stub element is NOT rendered (compact mode suppresses the slot content despite closure being supplied — render-time gate, NOT prop removal).
- **probe-04** TileHeader chrome present under BOTH modes — assert `tile-status-indicator` + `tile-session-name` (MB-T15 testids) render in both probe-01 + probe-02. Confirms compact does not regress wireframe-aligned chrome.

For Sub-Q-MBTWBCTM-A=(ii): probe-01 modified to assert ONLY `tile-collapse-btn` + `tile-detach-btn` absent; `tile-picker-slot-{name}` content + `tile-autopilot-slot-{name}` content remain in DOM under `'A'`.

For Sub-Q-MBTWBCTM-A=(iii): add **probe-05** asserts an `tile-expand-affordance` testid exists in compact mode and click reveals chrome (would also require a controlled-expansion state machine, which is sibling-component-shape scope — escalate Q-MBTWBCTM-A=(iii) per §2.3 if operator selects).

**Acceptance:** Probe RED at HEAD pre-WB2 because `Tile` does not currently branch on `frameMode`. Specifically: tests for probe-01 fail because `tile-collapse-btn` IS in DOM (current behavior is unconditional); tests for probe-02 pass trivially (default behavior); tests for probe-03 fail because slot content renders unconditionally.

**Frozen contracts touched:** none — probe-only. References existing `TileProps` (extending with optional `frameMode?: FrameMode` is a WB2 addition; the probe imports the post-WB2 prop type via `// @ts-expect-error WB1 RED:` pattern from MB-T-HSO-WIRE WB4-revised precedent (`cd135e4`)).

### WB2 — `green(MB-T-WIREFRAME-C1P4-COMPACT-TILE-MODE): Tile render-time branch on FrameMode='A'`

**Type:** green
**Scope:** Modify `packages/dispatch-workstation/src/tile-grid/tile.tsx`:
1. Add optional prop `frameMode?: FrameMode` to `TileProps` (default behavior when omitted: full chrome — bit-identical to pre-WB2 production render).
2. Import `FrameMode` from `../main/frame-mode-state.js` (type-only import; no main-process behavior pulled into the renderer bundle).
3. Inside the `Tile` function component, introduce `const isCompact = frameMode === 'A';` after the props destructure.
4. Branch the chrome rendering per Sub-Q-MBTWBCTM-A:
   - For (i): wrap `tile-collapse-btn` + `tile-detach-btn` in `{!isCompact && (...)}` blocks; wrap the picker-slot + autopilot-slot wrappers (or their children) in `{!isCompact && (...)}` blocks. KEEP the slot wrapper divs themselves in DOM (preserves testid stability for non-compact probes); only the children render-skip.
   - For (ii): same as (i) but only `tile-collapse-btn` + `tile-detach-btn` gated.
5. WB1 probe-04 (TileHeader present under both modes) is satisfied by NOT branching the `<TileHeader>` render — it always renders.
6. If Sub-Q-MBTWBCTM-B=α (recommended): `tile-grid-app.tsx` is also touched to subscribe to FrameMode changes (verify whether `44764fd` already ships this subscription; if YES, only thread the prop; if NO, add the subscription hook + state).

**Acceptance:** WB1 probes flip RED → GREEN. No regression in existing MB-T12/15/16/17/18 tile-tree tests (consumer non-regression per CLAUDE.md memory — run `test/unit/tile-grid/**` + `test/unit/mb-t08/**` + `test/unit/wiring-mounts/**`). Workstation typecheck CLEAN.

**Frozen contracts touched:** none. `TileProps` extension is a backward-compatible additive prop. `FrameMode` type-import is from a non-frozen surface (`frame-mode-state.ts`).

**Consumer probes** (per CLAUDE.md memory `feedback_consumer_non_regression_per_wb`): execute the following at WB2 verification before commit:
- `test/unit/tile-grid/*` (MB-T12 tile-tree direct tests)
- `test/unit/mb-t08/*` (onboarding modal tests — touch `tile-grid` indirectly via `wiring-mounts`)
- `test/unit/wiring-mounts/*` (cross-cutting wiring tests)

All three suites must remain GREEN.

### WB3 — `docs(MB-T-WIREFRAME-C1P4-COMPACT-TILE-MODE): audit §4.1 re-classification + findings doc`

**Type:** docs
**Scope:** Two-file commit (pathspec-restricted per CLAUDE.md §2.7):

1. Update `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` §4.1 per Sub-Q-MBTWBCTM-C:
   - 4 rows (approval-picker / autopilot / collapse / detach) re-classified per Sub-Q-MBTWBCTM-C=(α) recommended.
   - Strategic finding paragraph amended with closure note (bidirectional-asymmetric-divergence one-half-closed).
2. Update `docs/FOLLOWUPS.md` — IF Sub-Q-MBTWBCTM-A=(iii) was selected, file `MB-F-COMPACT-EXPAND-AFFORDANCE` Tier 3 row. Otherwise no FOLLOWUPS.md edit needed (this ticket does not close any pre-existing followup; it closes audit-doc classification only).
3. (Optional) Author short findings doc at `docs/coordination/mbtwbctm-findings-<date>.md` mirroring MB-T-HSO-WIRE WB17 docs format.

**Acceptance:** Single docs commit body Q1-Q9. Audit doc re-classification visible in the diff.

**Frozen contracts touched:** none.

### WB4 (CONDITIONAL on Sub-Q-MBTWBCTM-B=β OR Sub-Q-MBTWBCTM-A=(iii))

**Type:** green
**Scope:** Conditional — only if Sub-Q-MBTWBCTM-B=β (React context provider boilerplate) or Sub-Q-MBTWBCTM-A=(iii) (expand-affordance state machine).
**Frozen contracts touched:** none.

---

## §5 — Cross-references

### §5.1 — Followups closed by this ticket

This ticket does NOT close any pre-existing followup rows directly. It closes an audit-doc classification (§4.1) which is research artifact, not a tracked followup.

| Followup | Tier | Status | Notes |
|---|---|---|---|
| `MB-F-T13-TILE-HEADER-PICKER-INTEGRATION` | open (Tier ?) | NOT CLOSED by this ticket | Compact mode hides the picker render but does not close the picker-integration wiring scope. Followup remains open. |
| `MB-F-T12-AUTOPILOT-TILE-TOGGLE-INTEGRATION` | open (Tier ?) | NOT CLOSED by this ticket | Same as above for autopilot. |
| `MB-F-T15-MODEL-CHIP-HEX-COLORS-PLACEHOLDER` | Tier 2 | unchanged | Compact mode still renders the model chip via TileHeader; placeholder colors persist. |

### §5.2 — Followups likely to surface during this ticket

`[MODELED-SPECULATIVE]`:

- WB1/WB2 may discover that `Tile`'s body region behavior (`ConsolePanel` mount) needs a compact-specific treatment (e.g., shorter terminal scrollback, or different fit-strategy). If so, file Tier 3 `MB-F-COMPACT-TILE-BODY-FIT` for sibling-ticket scope.
- WB2 may discover that `tile-grid-app.tsx` already has FrameMode subscription wired from `44764fd` (Sub-Q-MBTWBCTM-B=α "no upstream wiring needed" case) — KNOWN by reading `tile-grid-app.tsx` at WB1 start.
- If `44764fd` did NOT ship renderer-side FrameMode subscription, surface for HALT-WB2-PRE-COMMIT scope confirmation: this ticket would either (a) absorb the wiring (scope creep — flag to operator) or (b) defer to a separate amendment-to-ticket-#1 commit (cleaner).

### §5.3 — Related shipped tickets (read-required at WB1 start)

| Ticket | Anchor | Read scope at WB1 |
|---|---|---|
| §C.1′ ticket #1 Frame Router | `44764fd` | `frame-mode-state.ts:1-34` (FrameMode type + read/write helpers + env override) + the renderer-side FrameMode subscription site (if shipped — verify) |
| MB-T12 tile-grid WB5 | (per MB-T12 family commits) | `tile.tsx:116-235` — current Tile composition: TileHeader + picker-slot + autopilot-slot + collapse/detach/kill btns + body + footer-slot |
| MB-T15 TileHeader | (per MB-T15 family commits) | `tile-header.tsx` — wireframe-aligned chrome subset (status-dot, name, branch, repo, model-chip, token-meter); identifies what compact mode KEEPS |

### §5.4 — Related FOLLOWUPS rows (read-required)

- Audit §4.1's strategic finding paragraph (the bidirectional-asymmetric-divergence framing). Compact mode closes half; other-ticket-scope closes the inverse half.
- Plan §A.1.R=(2) (Frame-C-primary + A-toggle) — the binding architectural posture this ticket's Frame A render path satisfies.

### §5.5 — Files this ticket READS but DOES NOT MODIFY

- `packages/dispatch-workstation/src/tile-grid/tile-header.tsx` — chrome the compact variant KEEPS (no modification).
- `packages/dispatch-workstation/src/tile-grid/tile-approval-picker.tsx` — render-prop closure that becomes empty in compact (no component modification).
- `packages/dispatch-workstation/src/tile-grid/tile-autopilot-toggle.tsx` — same.
- `packages/dispatch-workstation/src/tile-grid/tile-footer.tsx` — render-prop closure; sub-Q-A choice determines compact treatment.
- `packages/dispatch-workstation/src/main/frame-mode-state.ts` — type-only import.
- `docs/coordination/wireframes.jsx` — wireframe vision SOURCE-OF-TRUTH; not modified.

### §5.6 — Anchor commit at ticket-authoring time

`d4b0420` — `docs:(followup) MB-T-POOL-SHUTDOWN-HOOK-FIX closure batch ...`. Read of this anchor is implicit via the format mirror; no behavioral dependency.

---

## §6 — Self-check Q1-Q9 per WB commit (CONDUCTOR_API_CONTRACT.md §10.5)

Each cairn-grammar commit body answers all nine questions. Expected shapes per WB type:

| WB | Q1 (spike?) | Q2 (mocks?) | Q3 (impl-deleted-passes?) | Q4 (outside contract?) | Q5 (frozen mod?) | Q6 (labels?) | Q7 (parallel territory?) | Q8 (bypass PATCH?) | Q9 (halt-unauth?) |
|---|---|---|---|---|---|---|---|---|---|
| WB1 RED | N/A — RED probe; sub-Qs A+B bind probe shape | BEHAVIOR (happy-dom React render + DOM query) | No — impl absent; probes RED until WB2 | No — probe-only | No | KNOWN/MODELED applied | `tile.tsx` not modified; probe-file path-disjoint from T2 (CSS body) + T4 (frame-c/) | N/A | No (HALT auto-ack per autonomous mode) |
| WB2 GREEN | (see WB1) | BEHAVIOR (real React render under happy-dom; no mocks) | No — impl load-bearing for the 4 hide-assertions | No | No | KNOWN/MODELED applied | `tile.tsx` (this ticket's territory) + possibly `tile-grid-app.tsx` (Sub-Q-MBTWBCTM-B=α threading); both path-disjoint from T2/T4 | N/A | No |
| WB3 docs | N/A | N/A | N/A | No — single docs/coordination/ + docs/FOLLOWUPS.md edit | No | KNOWN per direct ticket-execution evidence | docs/ + FOLLOWUPS.md path-disjoint from main.ts/tile.tsx | N/A | No |
| WB4 (if β/iii) | (see WB1) | BEHAVIOR | No | Conditional — depends on chosen scope | No | KNOWN/MODELED | renderer-side; path-disjoint | N/A | No |

---

## §7 — Definition of done

The ticket is DONE when ALL of the following hold:

1. **WB1 probe** authored + RED at `tile.tsx` HEAD pre-WB2. 4 probes (Sub-Q-MBTWBCTM-A=(i) default) or 2-3 probes (Sub-Q-MBTWBCTM-A=(ii)) or 5+ probes (Sub-Q-MBTWBCTM-A=(iii)).
2. **WB2 implementation** ships the `frameMode` prop on `TileProps` + the render-time branch in `Tile`; WB1 probes flip RED → GREEN.
3. **Consumer non-regression** verified per CLAUDE.md memory: `test/unit/tile-grid/**` + `test/unit/mb-t08/**` + `test/unit/wiring-mounts/**` all GREEN post-WB2.
4. **Workstation typecheck CLEAN** (`pnpm --filter dispatch-workstation typecheck`).
5. **WB3 docs commit** updates audit §4.1 row classification + amends strategic finding paragraph per Sub-Q-MBTWBCTM-C.
6. **Operator visual verification** (optional but recommended): launch workstation with realistic ≥4 session count; toggle Frame A; visually confirm compact rendering matches wireframe `pane` density vision. Findings doc cites this if performed.
7. **No regression in v3.5 probe sanity** — `probe-mbthsowire-{02,04,06,08,10,12}` continue to pass post-WB2 (these are independent of tile.tsx, but rebuild discipline per CLAUDE.md §3.4 means a stale dist could surface spurious failures; rebuild before verify).
8. **WB4 (if conditional)** completes per Sub-Q-MBTWBCTM-B=β / Sub-Q-MBTWBCTM-A=(iii) scope.

---

## §8 — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `44764fd` did NOT ship renderer-side FrameMode subscription, so Sub-Q-MBTWBCTM-B=α requires upstream `tile-grid-app.tsx` wiring beyond `tile.tsx` scope | `[MODELED-MEDIUM]` — Frame Router ticket #1 description focuses on `frame-mode-state.ts` + IPC; renderer-side subscription may or may not be wired. KNOWN by reading `tile-grid-app.tsx` at WB1 start. | `[MODELED-LOW]` if scope creep is acknowledged (~+1 WB); `[MODELED-MEDIUM]` if hidden until WB2 implementation surfaces it (would require mid-WB scope expansion + halt-and-surface) | WB1 RED authoring includes explicit verification step: read `tile-grid-app.tsx` for FrameMode subscription before authoring probes; surface absence at HALT-WB1-PRE-COMMIT for scope decision. |
| Existing MB-T12/15/16/17/18 tile-tree tests fail under compact mode because their fixtures omit `frameMode` AND the default behavior accidentally triggers compact | `[MODELED-LOW]` (WB2 GREEN's `frameMode?` optional prop defaults to undefined, and `isCompact = frameMode === 'A'` is false when undefined — full chrome renders) | `[MODELED-HIGH]` if mishandled (broad regression in tile-tree tests) | WB1 probe-02 explicitly asserts `frameMode` omitted == full chrome. WB2 GREEN's branch logic is exact-equals on `'A'`, not truthy-falsy. |
| Compact mode visually hides the only operator affordance to set approval-policy (Sub-Q-MBTWBCTM-A=(i) strict path); operator in Frame A cannot adjust approval without toggling back to `'C'` | `[KNOWN]` per Sub-Q-MBTWBCTM-A=(i) definition | `[MODELED-MEDIUM]` (operator UX trade-off) | Surfaced explicitly in Sub-Q-MBTWBCTM-A=(i) vs (ii) trade-off table; operator-arbitrated. Frame mode toggle is operator-driven, so toggling to `'C'` for ops affordances is a deliberate workflow, not a bug. |
| WB2 zone-placement creates merge friction with T2 (CSS body) OR T4 (Frame C surface) | `[MODELED-LOW]` — both T2/T4 target distinct files (T2: CSS-only, no `.tsx` ownership conflict; T4: `frame-c/` new dir). `tile.tsx` ownership is exclusive to this ticket per plan §6.3 line 666. | `[MODELED-LOW]` | Per-path commit discipline (CLAUDE.md §2.7) + pathspec-restricted commit. Pre-WB2 territory check via `git status --short` to confirm no T2/T4 edits to `tile.tsx`. |
| WB1 RED probe authored under happy-dom but Tile's existing tests use node environment | `[KNOWN]` per `vitest.config.ts`: happy-dom is per-file pragma; existing tile-grid tests at `test/unit/tile-grid/**` already use happy-dom (verify at WB1 start) | `[MODELED-LOW]` (per-file pragma is the established pattern; no test-config edit required) | WB1 probe uses `// @vitest-environment happy-dom` pragma at the top of the file. Verify pattern at `test/unit/tile-grid/probe-01-grid-shape.spec.tsx` (or equivalent) for the exact pragma syntax. |
| Sub-Q-MBTWBCTM-A=(iii) selected → expand-affordance state machine + new UI element scope significantly larger than plan §6.2 verbatim "trim to compact variant" | `[MODELED-LOW]` if operator selects default (i) | `[MODELED-HIGH]` if (iii) chosen (~+2-3 WBs; new component shape; expand-affordance test surface) | Default recommendation is (i); operator-arbitrated. If (iii) is selected, surface scope-creep flag at HALT-AUTHORED for explicit operator confirmation of the expanded WB count. |
| `frameMode` prop threaded but `tile-grid-app.tsx` does not yet have FrameMode in state — would render full chrome under both `'A'` and `'C'` (the prop is undefined upstream) | `[MODELED-LOW]` (this is the "WB2 GREEN ships but doesn't take effect" risk under Sub-Q-MBTWBCTM-B=α-with-missing-upstream-wiring) | `[MODELED-MEDIUM]` (operator perceives "WB2 didn't work" — actually a Sub-Q-MBTWBCTM-B scope mis-estimate) | WB1 RED probe pins the prop-threading contract via direct prop fixture (not via tile-grid-app's actual state). WB2 GREEN scope explicitly tracks whether tile-grid-app's subscription is shipped or not. If missing, surface for scope-augmentation at HALT-WB2-PRE-COMMIT. |

---

## §9 — Closing posture

### §9.1 — Anomalies surfaced at HALT-MBTWBCTM-AUTHORED (for operator awareness)

1. **Sub-Q-MBTWBCTM-A operator-pending** (§3.1): exact compact-mode element set. Default (i) recommended; (ii) preserves ops affordances at cost of strict wireframe alignment; (iii) is scope-creep flag.
2. **Sub-Q-MBTWBCTM-B operator-pending** (§3.2): FrameMode threading mechanism. Default (α) prop-drilled recommended; (β) React context acceptable; (γ) violates audit §4.1 discipline.
3. **Sub-Q-MBTWBCTM-C operator-pending** (§3.3): audit §4.1 closure-state framing. Default (α) re-classify rows + amend strategic finding paragraph.
4. **Verification anomaly to flag at WB1 start**: whether `44764fd` shipped renderer-side FrameMode subscription in `tile-grid-app.tsx`. KNOWN by reading the file at WB1 start; if absent, surface for scope decision (in-ticket-absorb vs amendment-to-ticket-#1).

### §9.2 — Authoring-time stats (for HALT-AUTHORED surface)

| Stat | Value |
|---|---|
| Authoring-anchor HEAD | `d4b0420` |
| Files READ (no modification) | 5: `tile.tsx` (235L), `frame-mode-state.ts` (34L), `wireframe-vs-shipped-audit-2026-05-09.md` §4.1 (~30L), `v35-operational-readiness-2026-05-10.md` §6.2 (~30L), `CONDUCTOR_MB-T-POOL-SHUTDOWN-HOOK-FIX_BUILD.md` (format anchor; ~100L) |
| Sub-Qs surfaced for operator decision | 3 (A: element-set; B: threading mechanism; C: docs closure-state) |
| WB count range | 2-4 (depends on Sub-Q-MBTWBCTM-A/B outcomes) |
| Estimated total LOC for WB2 GREEN | ~30-50 lines (`tile.tsx` branch + optional `tile-grid-app.tsx` threading) |
| Frozen surface touches | 0 |

### §9.3 — Parallel-CC viability sealed

Plan §6.2 line 657 + §6.3 line 666 confirm this ticket is parallel-CC viable against T2 (CSS body) and T4 (Frame C surface body). All three tickets target disjoint files. This ticket's `tile.tsx` ownership is exclusive; T2's CSS and T4's `frame-c/` new directory do not overlap.

---

**End of MB-T-WIREFRAME-C1P4-COMPACT-TILE-MODE ticket body.**

Pending operator resolutions before execution: Sub-Q-MBTWBCTM-A (§3.1 element-set) + Sub-Q-MBTWBCTM-B (§3.2 FrameMode threading mechanism) + Sub-Q-MBTWBCTM-C (§3.3 audit-doc closure-state).
