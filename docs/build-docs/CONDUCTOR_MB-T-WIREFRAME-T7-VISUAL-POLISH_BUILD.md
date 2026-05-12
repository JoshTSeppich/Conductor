# MB-T-WIREFRAME-T7-VISUAL-POLISH — Workstation visual polish (palette ratification + sticky-note tile aesthetic + selected-tile highlight + model-badge color coding + FilterBar component + bottom-rail typography)

**Status:** DRAFT-PENDING-OPERATOR-REVIEW
**Date authored:** 2026-05-12
**Authored under:** §3.2 operator-supervised mechanical translation discipline per full-build-mode dispatch `4f0bbde` §3.2 + gen-4 orchestrator dispatch 2026-05-12. Round 9 of cairn-under-stress.
**Authoring delegate:** T7 sub-session (Opus 4.7; prior ladder MB-T-WIREFRAME-T3-ACTION-BAR-WIRING COMPLETE) spawned by orchestrator-2026-05-12-0953 (gen-4 PRIMARY) for Phase 1 second batch ticket-body authoring, workstream T7 (Visual polish) per dispatch §2 + §4 Phase 1 second batch.
**Authoring anchor commit (HEAD at authoring time):** `bae1b97` (T7 sub-session's own prior WB9 docs commit).
**Cairn ladder anchor:** Wireframe-parity workstream T7 (Visual polish). Builds on top of already-shipped structural surfaces from T1 (Session data flow — status-color palette + model-badge mapping shipped at `ec60622` + subsequent WB ladder), T2 (Terminal stream — DetailPane structural extension), T3 (Action bar — visual primitives shipped this sub-session's prior ladder `5565a60` → `bae1b97`), and T6 (Methodology runtime-verification α+β shipped `0d71590`; γ headless screenshot DEFERRED tracked at `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-γ-HEADLESS-SCREENSHOT` Tier 2 FOLLOWUPS row 335).

**Closes:**
- Full-build-mode dispatch `4f0bbde` §2 workstream T7 verbatim scope (lines 127-133).
- Visual polish elements per dispatch §1 wireframe element inventory (left rail tile typography + status dot colors + model badges + filter bar; right pane action bar polish; bottom rail mode toggle + cost meter + plan tracker styling).
- POTENTIALLY refines T1-shipped status-color palette per Sub-Q-MBTWFT7-B (T1's `frame-c/status-color.ts` Lines 31-37 explicitly cede "T7 visual-polish ticket may refine these hex values" — operator-pre-arbitrated handoff).

**Depends on (already merged at HEAD `bae1b97`):**
- **T1 frame-c primitives** — `frame-c/status-color.ts` (palette GREEN/GREY/AMBER/RED `#5b9d6e/#888888/#c97a3a/#c54a4a`); `frame-c/model-badge.ts` (model→label mapping S4.6/O4.6/O4.7/H); `frame-c/uptime-format.ts`; SessionList row-rendering with status dot + model badge + uptime + ctx% + meta line.
- **T2 DetailPane structural extension** — DetailPane shipped via Wave B WB8 + extended via T3 WB4 GREEN (`e05add2`) with flex-column body+footer + ActionBar mount.
- **T3 ActionBar surface** — `frame-c/action-bar.tsx` shipped with 4 buttons + failure banner + bypass-perms indicator + dispatch-workstation source label (this sub-session's prior ladder `7009b72` → `e713cbd`).
- **T6 build-freshness + bundle-inclusion verification α+β** — `pnpm verify:build-freshness` + `verifyBundleFingerprint`; T7 visual-polish ladder benefits from these gates indirectly via auto-ack §C envelope amendments at `0d71590`.

**Depends on (NOT YET MERGED — coordinating in parallel OR future ticket cycles):**
- **T4 Bottom rail** (dispatch §2 T4 — tab switcher Chat/Commits/BUILD.md + Auto/Ask toggle + bypass-perms indicator + max-parallel counter + cost meter + plan timer) — T4 ticket body NOT YET authored at HEAD `bae1b97` per `ls docs/build-docs/CONDUCTOR_MB-T-WIREFRAME-T4-*.md` returning empty. Per Sub-Q-MBTWFT7-E=(i) default: T7 polishes ONLY existing chat-shell/ components (cost-meter, dispatch-mode-toggle, plan-usage-ring, mix-indicator); tab-switcher polish DEFERRED until T4 structural delivery + separate T7 follow-on cycle.
- **T1 status-indicator wiring** (dispatch §2 T1 — "Per-tile status indicator wiring green/amber/red/grey based on session-state.md or daemon signal") — T1 has shipped the palette mapping module; production status-source wiring may be in-progress. T7 ratifies/refines colors; T1 wires state-derivation. Path-disjoint at module level.

**Downstream gates:**
- **`MB-F-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-γ-HEADLESS-SCREENSHOT` Tier 2** (FOLLOWUPS row 335) closure dependency for AUTOMATED visual-diff acceptance gate. Per dispatch §3.5: until γ ships, T7's visual-diff acceptance gate uses operator-manual-screenshot fallback. T7 ships with manual-fallback; auto-screenshot regression-detection post-γ.
- **Operator visual verification against `wireframe-target-2026-05-11.png`** (operator-side image; NOT in repo per direct `ls` verification at HEAD `bae1b97`). Operator visual-diff at WB-FINAL HALT.

**Estimated WB count:** 9-11 WBs (default 9: 4 RED+GREEN pairs + 1 docs; expands to 11 if Sub-Q-A=(β) introduces design-token module via WB0 + sub-WB consumer refactors).

---

## §0 — Reading protocol

1. Read §1 (scope) + §2 (arbitration anchor — what's binding) first.
2. Read §3 (sub-arbitrations) — EIGHT operator decisions are pre-execution prerequisites. Sub-Q-A is LOAD-BEARING (gates styling approach choice for whole ladder). Sub-Q-B-C-D-E-F-G bind per-WB scope. Sub-Q-H is META (design-token module location IF Sub-Q-A=(β)).
3. Read §4 (WB ladder) for execution order.
4. §5-§9 are operational supports — cross-references, self-check expectations, definition-of-done, risk register.
5. §9 closing posture (anomalies surfaced at HALT-TICKET-BODY-PRE-COMMIT).

Confidence labels per CLAUDE.md §2.2 apply throughout: `[KNOWN]` observed in this session via direct source/git read; `[MODELED]` reasoned from observed facts plus a stated model; `[SPECULATIVE]` hypothesis without evidence. Operator-frozen-envelope outcomes are `[KNOWN-OPERATOR-ARBITRATED]` and binding for ticket scope.

---

## §1 — Scope

### §1.1 — What this ticket DOES

`[KNOWN-OPERATOR-ARBITRATED]` per full-build-mode dispatch `4f0bbde` §2 T7 + §1 wireframe element inventory:

1. **Status-indicator color palette ratification/refinement** for `frame-c/status-color.ts`. T1 shipped placeholder hex codes (`GREEN='#5b9d6e'` / `GREY='#888888'` / `AMBER='#c97a3a'` / `RED='#c54a4a'`) with explicit comment "T7 visual-polish ticket may refine these hex values; for v3.0 ship they match the audit-doc §1 Dim 5 row + the existing session-list.tsx:66-69 green/amber values for continuity." Sub-Q-MBTWFT7-B operator decision binds whether T7 ratifies-as-is OR refines.

2. **Tile-grid sticky-note aesthetic + selected-tile highlight** for `frame-c/session-list.tsx`. Currently SessionList rows render flat with `borderBottom: '1px solid #1a1a1a'` (line 51). `isSelected` is computed at L204 but UNUSED for visual styling — selection-state visual is comment-deferred ("Selection-state visual (aria-selected, highlight) DEFERRED to WB6 GREEN" — never landed). T7 adds:
   - Selected row: distinct background + left-border accent OR padding-shift OR shadow (Sub-Q-MBTWFT7-F).
   - Sticky-note aesthetic: subtle background shift per row + padding tuning + border-radius (Sub-Q-MBTWFT7-F).
   - `aria-selected={true}` on the row's `<div role="option">` (a11y discipline).

3. **Model-badge color coding** for `frame-c/model-badge.ts` + `frame-c/session-list.tsx:MODEL_BADGE_STYLE`. Currently uniform `color: '#7a8290'` (muted gray) per session-list.tsx:84. Wireframe target shows per-model-family color coding (S=teal/blue family, O=purple/violet family, H=amber/gold family). T7 adds:
   - `modelToFamily(model: string): 'sonnet' | 'opus' | 'haiku' | 'unknown'` helper function in model-badge.ts.
   - Per-family color map (Sub-Q-MBTWFT7-C operator binding).
   - SessionList uses `data-model-family={family}` attribute + family-keyed style lookup.

4. **FilterBar component** — NEW file `frame-c/filter-bar.tsx`. Currently no filter UI exists per direct grep of `frame-c/` directory at HEAD `bae1b97`. T7 ships:
   - Top of SessionList: `<FilterBar />` row with All-status dropdown + All-repos dropdown + Clear button + visual styling.
   - Component is RENDERER-INTEGRATED + props-driven per audit §4.1 three-tier discipline. Receives `onFilterChange: (filter: FilterState) => void` callback. Filter LOGIC (predicate application against `sessions[]`) is T1 future-WB territory; T7 ships STRUCTURAL component + visual styling only (Sub-Q-MBTWFT7-D=(i) recommendation).

5. **Bottom-rail polish for existing chat-shell/ components** (Sub-Q-MBTWFT7-E=(i) recommendation):
   - `chat-shell/cost-meter.tsx` — typography hierarchy refinement (font-size + color + spacing for `$0.42 today` style).
   - `chat-shell/dispatch-mode-toggle.tsx` — Auto/Ask highlight states; active=dark-bg per wireframe.
   - `chat-shell/plan-usage-ring.tsx` — progress-ring + typography for `Max plan resets in 2h 47m`.
   - `chat-shell/mix-indicator.tsx` — chip styling (already shipped; refinement only).
   - DOES NOT ship tab-switcher (Chat/Commits/BUILD.md) per Sub-Q-MBTWFT7-E=(i) defer-until-T4-ships.

6. **Typography + spacing audit** at WB-FINAL — pass through SessionList + DetailPane + ActionBar + chat-shell/ for font-size hierarchy alignment per wireframe (single audit pass; refinements bundled into closing WB).

7. **Visual-diff operator-manual gate at WB-FINAL** per dispatch §3.5 visual-comparison gate fallback (until T6 γ headless screenshot pipeline ships per `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-γ-HEADLESS-SCREENSHOT` Tier 2 closure).

### §1.2 — What this ticket DOES NOT

`[KNOWN-OPERATOR-ARBITRATED]` constraints:

- Does NOT introduce CSS modules, styled-components, or external `.css`/`.scss` files. The codebase has 170 inline `CSSProperties` constants and zero external CSS files at HEAD `bae1b97` (verified via `find packages/dispatch-workstation/src -name "*.css" -o -name "*.scss"` returning empty + `grep -rn "import.*styled\|styled-components"` returning empty). Per Sub-Q-MBTWFT7-A=(α) RECOMMENDED: T7 extends the inline-CSSProperties pattern.
- Does NOT modify `frame-c/status-color.ts` value semantics — i.e., the GREEN/GREY/AMBER/RED token NAMES remain authoritative; only the HEX VALUES are subject to Sub-Q-MBTWFT7-B refinement. Status-state-to-color MAPPING (statusToColor function logic) is T1 territory + unchanged by T7.
- Does NOT modify `frame-c/model-badge.ts` modelToLabel mapping. T7 ADDS `modelToFamily` helper alongside; does not change existing label semantics.
- Does NOT modify `tile-grid/` chrome (Frame A primary tile-header / tile-footer / tile-approval-picker / tile-autopilot-toggle). Per audit §A.1.R=(2) operator-arbitrated Frame-C-primary posture: T7 polishes Frame C surfaces only. Frame A polish is a future-cycle scope IF dogfood requires.
- Does NOT ship tab-switcher (Chat/Commits/BUILD.md) — T4 territory per dispatch §2 T4 (queued in Phase 1 second batch). T7's bottom-rail polish is bounded to existing chat-shell/ components.
- Does NOT modify `dispatch-core/src/v3/schema.ts` (frozen). No new schema types needed — palette + color helpers are workstation-internal.
- Does NOT amend `WORKSTATION_CONTRACT.md §6.6` — visual-polish work touches no IPC channels.
- Does NOT close `MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11` Tier 2 (T3 ticket-cycle followup; separate ticket).
- Does NOT close `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` Tier 2 (T3 WB9 followup; T1 territory).
- Does NOT ship FilterBar predicate-application LOGIC (Sub-Q-MBTWFT7-D=(i) splits: T7 ships structural component + styling; T1 future-WB wires filter logic against `sessions[]`).
- Does NOT ship headless screenshot automation per dispatch §3.5 — automation is `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-γ-HEADLESS-SCREENSHOT` Tier 2 separate-ticket territory.

---

## §2 — Arbitration anchor (operator-frozen 2026-05-12)

### §2.1 — Dispatch §2 T7 workstream binds scope

`[KNOWN-OPERATOR-ARBITRATED]`

Full-build-mode dispatch `4f0bbde` §2 T7 enumerates verbatim:
> **T7 — Visual polish**
> - CSS for tile-grid layout matching wireframe (sticky-note paper aesthetic per screenshot)
> - Tile status indicator colors + dot rendering
> - Model badge color coding
> - Filter dropdown styling
> - Bottom rail layout precision
> - Selected tile highlight + visual focus state
> - Typography + spacing per wireframe (font-family / size hierarchy)

Gen-4 dispatch 2026-05-12 (this sub-session's authoring prompt) refines wireframe element inventory to include status-indicator colors (green/amber/red/grey), model-badge variants (S4.6 / O4.6 / O4.7·1M / H), filter dropdowns (All status / All repos / Clear), and bottom-rail layout precision.

### §2.2 — Existing inline-CSSProperties pattern binds styling approach

`[KNOWN]` direct evidence at HEAD `bae1b97`:
- 170 inline `style={...}` / `CSSProperties` const sites across workstation src (per `grep -rn "style: {\|CSSProperties\|style={" packages/dispatch-workstation/src/ | wc -l`).
- ZERO external `.css`/`.scss` files in workstation src.
- ZERO styled-components / emotion imports.
- Per-component CSSProperties constants are the established convention (e.g., `tile-header.tsx` STATUS_DOT_HEX + STATUS_DOT_STYLE_BASE; `chat-shell/cost-meter.tsx` SLOT_STYLE; `error-display/error-toast.tsx` ROOT_STYLE/TITLE_STYLE/BUTTON_STYLE).

Sub-Q-MBTWFT7-A=(α) RECOMMENDED therefore extends this pattern — introducing CSS modules or styled-components would be a 170-site refactor + new dev dependency + cross-session conflict risk multiplier. Operator may arbitrate (β)-(δ) but ship-shy recommends (α).

### §2.3 — T1 status-color + model-badge handoff comments bind T7 territory

`[KNOWN]` direct evidence at HEAD `bae1b97`:
- `frame-c/status-color.ts:31-33` explicit comment: "T7 visual-polish ticket may refine these hex values; for v3.0 ship they match the audit-doc §1 Dim 5 row + the existing session-list.tsx:66-69 green/amber values for continuity."
- `frame-c/session-list.tsx:80-81` explicit comment on MODEL_BADGE_STYLE: "T7 visual-polish ticket may refine."
- `frame-c/session-list.tsx:26-27` explicit comment on selection-visual: "Selection-state visual (aria-selected, highlight) DEFERRED."

T1 has pre-coordinated the territory handoff for these three concerns. T7 owns the visual refinement; T1 owns the data + state mapping. Path-disjoint at module-content level (T7 modifies hex literals / per-family helpers / row-styling; T1 maintains statusToColor / modelToLabel logic).

### §2.4 — Audit §4.1 three-tier integration discipline preserved

`[KNOWN-AUDIT-FILED-2026-05-09]`

All T7 components (NEW FilterBar; existing SessionList / ActionBar / chat-shell/* polish) remain RENDERER-INTEGRATED per audit §4.1 — no bridge access at component layer; props-only interfaces. Filter LOGIC is T1 future-WB host-territory; T7's FilterBar is bridge-free.

---

## §3 — Sub-arbitrations REQUIRED before specific WBs

EIGHT operator decisions are pre-execution prerequisites. Surface at HALT-TICKET-BODY-PRE-COMMIT for operator resolution. Sub-Q-A is LOAD-BEARING (gates the styling approach for the whole ladder). Sub-Q-B-C-D-E-F-G bind per-WB scope. Sub-Q-H is conditional (META: design-token location if Sub-Q-A=(β)).

### §3.1 — Sub-Q-MBTWFT7-A: Styling approach (LOAD-BEARING)

Required **BEFORE ANY GREEN WB**. Default if unresolved: **(α) extend existing inline-CSSProperties pattern (RECOMMENDED — matches 170-site precedent + zero new dev dep + zero cross-session conflict-multiplier).**

`[KNOWN]` Codebase has ZERO external CSS files and ZERO styled-components at HEAD `bae1b97`. Sub-Q options:

| Option | Posture | Action |
|---|---|---|
| **(α) Extend inline-CSSProperties (RECOMMENDED — ship-shy)** | Each new visual style lives as `const X_STYLE: CSSProperties = {...}` at module top; applied via React `style={X_STYLE}`. NEW visuals follow existing pattern verbatim. | No new dev dep; no 170-site refactor; T7 ladder fully path-disjoint from other sessions' style code. |
| **(β) Introduce centralized `frame-c/color-palette.ts` design-token module + inline-CSSProperties consumers** | New module exports named tokens (e.g., `PALETTE.statusActive = '#5b9d6e'`); consumers `import { PALETTE } from './color-palette.js'` + reference at CSSProperties const sites. Refactor T1's `status-color.ts` to import from palette. Sub-WBs touch consumer files. | Adds palette module; small (≤50 lines); zero dev dep; consumers refactor at-touch only (no big-bang). Operator-supervised mechanical translation per CLAUDE.md §3.4. Sub-Q-H selects module location. |
| **(γ) Introduce CSS modules** | New `.module.css` files per component; import + class refs. Requires Vite/esbuild build-pipeline config change. | New build config + 170-site refactor + cross-session conflict-multiplier. Heavy scope. |
| **(δ) Introduce styled-components** | New `styled('div')...` per visual element. Requires `styled-components` dev dep + SSR/ASW consideration. | New dev dep + 170-site refactor; cross-session conflict-multiplier. Heaviest scope. |

`[MODELED]` Recommend **(α)** because:
1. Multi-precedent: 170 inline-CSSProperties sites + zero alternative-system files = established convention.
2. Operator-supervised mechanical translation envelope (CLAUDE.md §3.4) supports extending an established convention without arbitration; introducing a new system requires deeper arbitration.
3. Round 9 stress regime favors low-conflict-multiplier choices. (γ)/(δ) introduce build-pipeline + dep changes which collide with T6 build-freshness/bundle-inclusion gates AND cross-session WBs.

If (β): file new module location per Sub-Q-H (defaults to `frame-c/color-palette.ts` per existing frame-c naming convention). If (γ)/(δ): add WB0 dev-dep arbitration + dependency-installation work; ladder grows substantially.

### §3.2 — Sub-Q-MBTWFT7-B: Status-color palette source

Required before **WB1 RED**. Default if unresolved: **(i) ratify T1's existing hex codes (RECOMMENDED ship-shy — preserves continuity).**

T1 shipped placeholder hex codes with explicit T7-refinement deference. Three options:

| Option | Source | Trade-off |
|---|---|---|
| **(i) Ratify T1 placeholder (RECOMMENDED)** | Keep `GREEN='#5b9d6e'` / `GREY='#888888'` / `AMBER='#c97a3a'` / `RED='#c54a4a'` exactly. T7 WB1 probe asserts these values render; WB2 GREEN is no-op (or a comment-stamp removing the "T7 may refine" deference). | Zero hex-value change → zero visual regression risk vs T1-shipped state. Operator visual-diff at WB-FINAL verifies acceptability against wireframe. |
| **(ii) Operator-provides refined hex codes from wireframe** | Operator extracts hex codes from `wireframe-target-2026-05-11.png` (operator-side image) and provides at HALT-TICKET-BODY-PRE-COMMIT. T7 ratifies provided values. | Operator-time cost; highest fidelity to wireframe. |
| **(iii) T7 commits to representative refined palette; operator visual-verifies at WB-FINAL** | T7 picks plausible refinements (e.g., `GREEN` brighter saturation, `AMBER` warmer hue, `RED` more saturated) based on standard UI palette principles; ships at WB2 GREEN; operator visual-diff at WB-FINAL ratifies or directs refinement. | Sub-session-driven; risk of operator-rejected hex values requiring rework WB. |

`[MODELED]` Recommend **(i)** because:
1. T1 explicit-cede-to-T7 framing doesn't mandate refinement — only opens the option.
2. Visual diff against wireframe is operator-side; sub-session can't independently verify pixel match.
3. (ii) is highest-fidelity but requires operator-time which competes with operator-arbitration of other tickets in Phase 1 second batch.

### §3.3 — Sub-Q-MBTWFT7-C: Model-badge color-coding scheme

Required before **WB5 RED**. Default if unresolved: **(i) per-family colors (Sonnet=teal/blue family, Opus=purple/violet family, Haiku=amber/gold family) — RECOMMENDED matches wireframe target's visual differentiation.**

Wireframe target shows model badges with distinct visual color coding (per dispatch §1 inventory). T7 introduces a `modelToFamily(model)` helper alongside existing `modelToLabel(model)`. Sub-Q binds the per-family color map.

| Option | Scheme | Hex (representative) |
|---|---|---|
| **(i) Per-family colors (RECOMMENDED)** | Sonnet=teal/blue; Opus=purple/violet; Haiku=amber/gold; unknown=neutral-gray | S→`#5eb3c4` · O→`#9b6dd7` · H→`#d4a04a` · unknown→`#7a8290` (placeholder; subject to operator refinement same as Sub-Q-B (iii)) |
| **(ii) Per-model uniform (current state)** | All models render same muted gray; no per-model differentiation | `#7a8290` (current) |
| **(iii) Operator-provides exact hex per family** | Operator extracts per-family hex from wireframe + provides at HALT | Operator-time cost |
| **(iv) Per-tier intensity** | All Sonnet variants share base hue; intensity differentiates model variant (S4.6 lighter than S4.7) | Within-family gradients; more design-system overhead |

`[MODELED]` Recommend **(i)** because:
1. Wireframe target visually differentiates model badges — uniform-gray (ii) misses the wireframe semantic.
2. (iii) is highest-fidelity but adds operator-time gate.
3. (iv) is over-engineered for v3.0 ship (only 4 model variants currently; intra-family gradients are premature optimization).

### §3.4 — Sub-Q-MBTWFT7-D: FilterBar scope split

Required before **WB7 RED**. Default if unresolved: **(i) T7 ships NEW FilterBar STRUCTURAL component + styling; T1 future-WB wires filter LOGIC (RECOMMENDED path-disjoint split).**

T1 has NOT shipped FilterBar at HEAD `bae1b97` (verified via `frame-c/` directory listing — 8 files, no filter-* files). Dispatch §2 T1 lists "Filter dropdowns → actual filter logic" as T1 territory; dispatch §2 T7 lists "Filter dropdown styling" as T7 territory. The territory split is structural (component exists) vs logical (predicate applies). Three options:

| Option | Scope | Trade-off |
|---|---|---|
| **(i) T7 ships structural FilterBar + styling; T1 wires logic (RECOMMENDED)** | T7 creates `frame-c/filter-bar.tsx` with All-status + All-repos `<select>` + Clear `<button>`; emits `onFilterChange(filter)` callback. T1 future-WB consumes the callback + filters `sessions[]` before passing to SessionList. | Path-disjoint at module level. T7 ships verifiable structural surface. T1 future-WB landing makes filters operationally functional. |
| **(ii) Defer entire FilterBar to T1; T7 polishes post-T1** | T7 visual-polish ladder ships without filter-bar work; files Tier 2 followup `MB-F-FILTERBAR-POLISH-DEFERRED-TO-T1-CLOSURE`; revisits in a future cycle. | Removes ~2 WBs from T7 ladder; defers visible-surface delivery. |
| **(iii) T7 + T1 co-author bundled commit** | Cross-session co-authorship pattern (precedent: Wave B + Wave C #3 consolidated §6.6 amendment at `0f0e762`). T7 drafts structural; T1 drafts logic; both ratify in single commit. | High coordination cost; not justified for non-frozen-surface work. |

`[MODELED]` Recommend **(i)** because:
1. Path-disjoint by module: T7 owns `filter-bar.tsx` file + style; T1 owns filter callback consumer at FrameCRoot or higher.
2. Visible-surface delivery: operator sees filter UI at T7 ship even before T1 wires predicate.
3. Honest empty-state: pre-T1-closure, dropdowns render but operator sees no actual filtering — this is the same posture as `MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11` (structural ship + data deferred per separate ticket).

### §3.5 — Sub-Q-MBTWFT7-E: Bottom-rail polish scope

Required before **WB9 RED**. Default if unresolved: **(i) polish existing chat-shell/ components only; defer tab-switcher polish until T4 ships (RECOMMENDED).**

T4 (bottom rail — tab switcher + Auto/Ask + cost meter + plan timer) has NOT shipped at HEAD `bae1b97` (verified via `ls docs/build-docs/CONDUCTOR_MB-T-WIREFRAME-T4-*.md` returning empty). T7 dispatch §2 T7 includes "Bottom rail layout precision (tab switcher dark/active state, mode toggle highlight, indicator placement)" — but tab-switcher doesn't exist yet to polish.

| Option | Scope | Trade-off |
|---|---|---|
| **(i) Polish existing chat-shell/ only (RECOMMENDED)** | T7 polishes `cost-meter.tsx`, `dispatch-mode-toggle.tsx`, `plan-usage-ring.tsx`, `mix-indicator.tsx` typography + spacing + active-state highlights. Tab-switcher polish DEFERRED until T4 structural delivery + separate T7 follow-on cycle. File Tier 3 `MB-F-T7-TAB-SWITCHER-POLISH-DEFERRED-TO-T4-CLOSURE` at WB-final. | Path-disjoint from T4 ticket scope. Polishes what exists; defers what doesn't. |
| **(ii) T7 also ships structural tab-switcher component** | Adds NEW `chat-shell/tab-switcher.tsx` component to T7 scope. Crosses T4 ticket territory. | Cross-session conflict if T4 sub-session active concurrently. Ladder grows ~2 WBs. |
| **(iii) Defer all bottom-rail polish until T4 closure** | T7 scope contracts; ship only tile-grid + filter + status-color + model-badge work. | Tighter T7 ship; defers visible polish improvement on shipped chat-shell components. |

`[MODELED]` Recommend **(i)** because:
1. Path-disjoint with T4 future-cycle.
2. Polishes what exists; operator sees immediate visible improvement on chat-shell/ components without waiting for tab-switcher.
3. (ii) crosses T4 territory which may have its own polish posture; cleaner to wait.

### §3.6 — Sub-Q-MBTWFT7-F: Selected-tile highlight rendering

Required before **WB3 RED**. Default if unresolved: **(i) background-color shift + left-border accent (RECOMMENDED minimal — matches common selection patterns).**

Currently SessionList computes `isSelected` at L204 but uses it for NOTHING visual. Sub-Q options:

| Option | Visual approach | CSS impact |
|---|---|---|
| **(i) Background + left-border (RECOMMENDED)** | Selected row: `backgroundColor` shifts to `~#1f2937` (or similar dark-mode highlight); `borderLeft: '3px solid <accent>'`. Padding-left adjusts to compensate for border. | Minimal CSS additions; ~5 lines per ROW_STYLE_SELECTED const. |
| **(ii) Full sticky-note aesthetic with shadow + border-radius** | Selected row renders as a card: background + padding + border-radius + drop-shadow. Sub-Q-MBTWFT7-F=(ii) extends to ALL rows (sticky-note aesthetic). | More CSS; visual departure from compact-list pattern; per-row shadow may impact scroll perf with large session counts. |
| **(iii) Accordion-expanded view** | Selected row expands inline to show additional session-detail content within the row. | UX departure; not standard list-selection pattern; out of scope per Frame-C-primary detail-pane architecture. |
| **(iv) Operator-provides spec** | Operator-time cost to specify exact selection visual. | Highest fidelity to wireframe; defers WB3 RED scope. |

`[MODELED]` Recommend **(i)** because:
1. Standard pattern; minimal visual departure.
2. Compounds well with sticky-note aesthetic on non-selected rows (different background shift; both work).
3. Operator-arbitratable at WB-FINAL visual diff if (i) proves insufficient.

### §3.7 — Sub-Q-MBTWFT7-G: Visual-diff acceptance gate

Required at **WB-FINAL HALT**. Default if unresolved: **(i) operator-manual-screenshot fallback (only option until γ ships).**

| Option | Gate mechanism |
|---|---|
| **(i) Operator-manual fallback (RECOMMENDED — only option until γ ships)** | Operator runs `pnpm --filter dispatch-workstation build && pnpm --filter dispatch-workstation exec electron dist/main/main.js` post-ladder; visually compares against `wireframe-target-2026-05-11.png` (operator-side); ratifies at HALT-FINAL-PRE-PUSH OR directs refinement WBs. |
| **(ii) Defer entire T7 until γ ships** | Block T7 execution behind `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-γ-HEADLESS-SCREENSHOT` Tier 2 closure. |

`[MODELED]` Recommend **(i)** because: (ii) blocks T7 indefinitely on γ closure (separate-ticket arbitration cycle per FOLLOWUPS row 335). Dispatch §3.5 explicitly defines operator-manual fallback as the gate-mechanism until γ ships. T7's per-WB unit-probes catch structural regressions; operator-visual-diff catches aesthetic ones.

### §3.8 — Sub-Q-MBTWFT7-H (META): Design-token module location

CONDITIONAL on Sub-Q-A=(β). Default if (β) selected + Sub-Q-H unresolved: **(a) `frame-c/color-palette.ts` (matches existing frame-c/ module location convention).**

| Option | Location | Rationale |
|---|---|---|
| **(a) `packages/dispatch-workstation/src/frame-c/color-palette.ts` (RECOMMENDED if (β))** | Lives alongside existing T1 frame-c primitives (status-color.ts, model-badge.ts, uptime-format.ts). Frame-C-scoped; mirrors existing module-location convention. | Path-disjoint from tile-grid + chat-shell territories; clear ownership. |
| **(b) `packages/dispatch-workstation/src/palette.ts`** | Workstation-global; available to all surface directories | Implies cross-surface palette which T7 may not fully cover. |
| **(c) `packages/dispatch-workstation/src/tile-grid/palette.ts`** | Tile-grid scope only | Misfits Frame-C-primary discipline. |

If Sub-Q-A=(α) RECOMMENDED default: this Sub-Q-H is N/A (no design-token module shipped).

---

## §4 — WB ladder

WB count: **9-11 WBs default** under Sub-Q-A=(α) + Sub-Q-B=(i) + Sub-Q-C=(i) + Sub-Q-D=(i) + Sub-Q-E=(i) + Sub-Q-F=(i) + Sub-Q-G=(i). Adjustments:
- +1-2 WBs if Sub-Q-A=(β) (WB0 design-token module + consumer refactors).
- +1-2 WBs if Sub-Q-D=(iii) co-author bundle (cross-session sync).
- +2-3 WBs if Sub-Q-E=(ii) tab-switcher structural ship (T4 territory crossing).

### WB0 (CONDITIONAL on Sub-Q-A=(β)) — `green(MB-T-WIREFRAME-T7-VISUAL-POLISH): WB0 — frame-c/color-palette.ts design-token module`

**Type:** green (no RED probe — palette module is a constants-only file; consumer probes verify integration at-touch sites)
**Scope:** Author `packages/dispatch-workstation/src/frame-c/color-palette.ts` exporting named tokens for status colors (statusActive/statusIdle/statusWarn/statusError) + model-family colors (modelFamilySonnet/Opus/Haiku/Unknown) + structural neutrals (rowBgDefault/rowBgSelected/borderSubtle/textPrimary/textMuted). Pathspec-restricted commit.
**Acceptance:** Module imports cleanly from consumers in later WBs; typecheck CLEAN.
**Frozen contracts touched:** None.

### WB1 — `red(MB-T-WIREFRAME-T7-VISUAL-POLISH): WB1 — probe-mbtwft7-01-status-color-ratification`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/unit/frame-c/probe-mbtwft7-01-status-color-ratification.spec.ts` (unit test; no React env required — pure-fn assertion). Asserts:
- **probe-01a:** `statusToColor('open')` returns the ratified GREEN hex (per Sub-Q-B value).
- **probe-01b:** `statusToColor('idle')` returns GREY hex.
- **probe-01c:** `statusToColor('warning')` returns AMBER hex.
- **probe-01d:** `statusToColor('detached')` returns AMBER hex (per T1 mapping documented at status-color.ts:16).
- **probe-01e:** `statusToColor('error')` returns RED hex.
- **probe-01f:** `statusToColor('killed')` returns `null` (filter sentinel per T1 status-color.ts contract).

**RED criterion:** If Sub-Q-B=(i) ratify, probes pass at HEAD `bae1b97` already → WB1 RED becomes a TYPE-LEVEL ratification probe (no-op pure-fn check); WB2 GREEN comment-stamps the "T7 may refine" deference. If Sub-Q-B=(ii)/(iii) refine, RED state via hex-value-mismatch.

**Acceptance:** Probes RED at HEAD pre-WB2 (under (ii)/(iii) refine path) OR trivially-passing (under (i) ratify path; WB2 GREEN clarifies the deference removal).

**Frozen contracts touched:** None.

### WB2 — `green(MB-T-WIREFRAME-T7-VISUAL-POLISH): WB2 — status-color palette ratification/refinement`

**Type:** green
**Scope (under Sub-Q-B=(i) default):** Comment-stamps `frame-c/status-color.ts` — replace "T7 visual-polish ticket may refine these hex values" line with "T7 visual-polish ticket WB2 GREEN 2026-05-12 RATIFIED these hex values for v3.0 ship; operator visual-diff at HALT-T7-FINAL-PRE-PUSH". Probe stays passing.
**Scope (under Sub-Q-B=(ii)/(iii) refine):** Update GREEN/GREY/AMBER/RED hex constants in `frame-c/status-color.ts`; refactor `tile-header.tsx` STATUS_DOT_HEX to import from `frame-c/status-color.ts` (DRY removal of duplicated palette).

**Acceptance:** WB1 probes pass; typecheck CLEAN.

**Frozen contracts touched:** None.

### WB3 — `red(MB-T-WIREFRAME-T7-VISUAL-POLISH): WB3 — probe-mbtwft7-03-session-list-selected-highlight + sticky-note styling`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/unit/frame-c/probe-mbtwft7-03-session-list-selected-highlight.spec.tsx` (happy-dom). Asserts:
- **probe-03a:** SessionList row for `selectedSessionName === row.name` has `aria-selected="true"` attribute.
- **probe-03b:** Selected row has distinct background-color (style.backgroundColor !== default rowBgDefault) — verified via inline-style inspection or `data-selected="true"` attribute marker.
- **probe-03c:** Selected row has left-border accent (style.borderLeft includes non-zero width) per Sub-Q-F=(i).
- **probe-03d:** Non-selected rows have `aria-selected="false"` and default background.
- **probe-03e:** Sticky-note aesthetic: SessionList wrapper has subtle background shift OR row gap/padding per wireframe (data-testid="frame-c-session-list" outer container background-color OR row container padding).

**Acceptance:** RED at HEAD; SessionList does not render aria-selected or selected-row-distinct-style.

**Frozen contracts touched:** None.

### WB4 — `green(MB-T-WIREFRAME-T7-VISUAL-POLISH): WB4 — SessionList selected-highlight + sticky-note styling`

**Type:** green
**Scope:** Extend `frame-c/session-list.tsx`:
- Add ROW_STYLE_SELECTED CSSProperties const (background-color shift + left-border accent per Sub-Q-F=(i)).
- Add `aria-selected={isSelected}` + `data-selected={String(isSelected)}` to row `<div>`.
- Compose row style: `isSelected ? {...ROW_STYLE, ...ROW_STYLE_SELECTED} : ROW_STYLE`.
- Update SessionList wrapper LIST_ROOT_STYLE with sticky-note aesthetic refinements (slight background shift, padding refinement).

**Acceptance:** WB3 probes flip RED → GREEN. Consumer non-regression: Wave B WB7 DetailPane probe + Wave C #3 ActionBar probes + T3 ladder probes stay GREEN.

**Frozen contracts touched:** None.

### WB5 — `red(MB-T-WIREFRAME-T7-VISUAL-POLISH): WB5 — probe-mbtwft7-05-model-badge-family-coloring`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/unit/frame-c/probe-mbtwft7-05-model-badge-family-coloring.spec.ts` (pure-fn). Asserts:
- **probe-05a:** `modelToFamily('claude-sonnet-4-6')` returns `'sonnet'`.
- **probe-05b:** `modelToFamily('claude-opus-4-6')` and `'claude-opus-4-7'` return `'opus'`.
- **probe-05c:** `modelToFamily('claude-haiku-4-5')` returns `'haiku'`.
- **probe-05d:** `modelToFamily(undefined)` and unknown identifiers return `'unknown'`.
- **probe-05e (happy-dom):** SessionList row renders `data-model-family="<family>"` attribute on the model badge element.
- **probe-05f (happy-dom):** Per-family color is applied via inline-style or via CSSProperties-keyed lookup (style.color differs between sonnet/opus/haiku rows).

**Acceptance:** RED at HEAD; modelToFamily function doesn't exist + SessionList doesn't apply per-family color.

**Frozen contracts touched:** None.

### WB6 — `green(MB-T-WIREFRAME-T7-VISUAL-POLISH): WB6 — model-badge family coloring`

**Type:** green
**Scope:**
- Extend `frame-c/model-badge.ts` with `modelToFamily(model?: string): 'sonnet' | 'opus' | 'haiku' | 'unknown'` pure function.
- Extend `frame-c/session-list.tsx` with MODEL_BADGE_STYLE_BY_FAMILY record keyed by family; resolve via `modelToFamily(s.model)`.
- Apply `data-model-family={family}` attribute + family-keyed style to badge span.

**Acceptance:** WB5 probes flip RED → GREEN; typecheck CLEAN.

**Frozen contracts touched:** None.

### WB7 — `red(MB-T-WIREFRAME-T7-VISUAL-POLISH): WB7 — probe-mbtwft7-07-filter-bar-component`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/unit/frame-c/probe-mbtwft7-07-filter-bar-component.spec.tsx` (happy-dom). Asserts:
- **probe-07a:** `[data-testid="frame-c-filter-bar"]` renders at FrameCRoot OR SessionList top.
- **probe-07b:** All-status `<select data-testid="filter-bar-status-select">` renders with options (e.g., "All status" default, "open", "idle", "warning", "error").
- **probe-07c:** All-repos `<select data-testid="filter-bar-repos-select">` renders with options derived from sessions[].repoName unique set + "All repos" default.
- **probe-07d:** Clear `<button data-testid="filter-bar-clear-btn">` renders.
- **probe-07e:** Changing select OR clicking Clear invokes `onFilterChange(filter: FilterState)` callback with shape `{status: string \| null, repo: string \| null}`.

**Acceptance:** RED at HEAD; `frame-c/filter-bar.tsx` doesn't exist.

**Frozen contracts touched:** None.

### WB8 — `green(MB-T-WIREFRAME-T7-VISUAL-POLISH): WB8 — FilterBar component (structural + styling)`

**Type:** green
**Scope:**
- Author `packages/dispatch-workstation/src/frame-c/filter-bar.tsx` (NEW file) — RENDERER-INTEGRATED component with All-status `<select>` + All-repos `<select>` + Clear `<button>` + inline-CSSProperties styling.
- Mount inside `frame-c/frame-c-root.tsx` above SessionList in the left column. FilterBar receives `sessions` prop (for unique-repo enumeration) + `onFilterChange` callback.
- **Logic deferred to T1 future-WB:** FrameCRoot does NOT apply the filter at WB8 (Sub-Q-D=(i) split). The `onFilterChange` callback is wired to a useState placeholder; SessionList receives unfiltered sessions[]. Filed `MB-F-FILTERBAR-LOGIC-NOT-WIRED-T1-TERRITORY` Tier 2 at WB-FINAL docs.

**Acceptance:** WB7 probes flip RED → GREEN; typecheck CLEAN.

**Frozen contracts touched:** None.

### WB9 — `red(MB-T-WIREFRAME-T7-VISUAL-POLISH): WB9 — probe-mbtwft7-09-chat-shell-polish`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/unit/chat-shell/probe-mbtwft7-09-chat-shell-polish.spec.tsx` (happy-dom). Asserts:
- **probe-09a:** `dispatch-mode-toggle.tsx` Auto button has `data-active="true"` data-attr when active mode + distinct background (active-state highlight).
- **probe-09b:** `cost-meter.tsx` renders `data-testid="cost-meter"` with typography hierarchy (font-size + color matching wireframe spec).
- **probe-09c:** `plan-usage-ring.tsx` renders progress-ring with `data-progress-pct={N}` data-attr.
- **probe-09d:** Typography hierarchy: cost-meter font-size > plan-usage-ring label font-size > mix-indicator chip font-size (relative ordering — exact values per Sub-Q-B/C ratification path).

**Acceptance:** RED at HEAD where data-attrs / typography-hierarchy assertions fail.

**Frozen contracts touched:** None.

### WB10 — `green(MB-T-WIREFRAME-T7-VISUAL-POLISH): WB10 — chat-shell/ polish (mode toggle active-state + cost-meter + plan-ring typography)`

**Type:** green
**Scope:** Polish existing chat-shell/ components:
- `dispatch-mode-toggle.tsx`: add `data-active` attribute; refine active/inactive background contrast.
- `cost-meter.tsx`: typography hierarchy refinement (font-size + color); add `data-testid`.
- `plan-usage-ring.tsx`: add `data-progress-pct` attribute + label typography refinement.
- `mix-indicator.tsx`: chip styling refinement (already shipped; minor polish).
- DOES NOT ship tab-switcher per Sub-Q-E=(i).

**Acceptance:** WB9 probes flip RED → GREEN; chat-shell consumer probes (existing) stay GREEN.

**Frozen contracts touched:** None.

### WB11 — `docs(MB-T-WIREFRAME-T7-VISUAL-POLISH): WB11 — findings doc + FOLLOWUPS filings + operator-manual visual-diff gate`

**Type:** docs
**Scope:** Single docs commit (pathspec-restricted per CLAUDE.md §2.7):
1. Findings doc at `docs/coordination/mb-t-wireframe-t7-visual-polish-findings-<date>.md` documenting:
   - Sub-Q resolutions A-H.
   - Status-color palette ratification/refinement record.
   - Per-family model-badge color choices.
   - FilterBar structural ship + T1-logic-deferred posture.
   - chat-shell/ polish summary.
   - Operator visual-diff gate handoff (manual fallback per dispatch §3.5).
2. FOLLOWUPS edits:
   - File Tier 2 `MB-F-FILTERBAR-LOGIC-NOT-WIRED-T1-TERRITORY` (Sub-Q-D=(i) split — structural ship + logic deferred).
   - File Tier 3 `MB-F-T7-TAB-SWITCHER-POLISH-DEFERRED-TO-T4-CLOSURE` (Sub-Q-E=(i) defer).
   - File Tier 3 `MB-F-T7-VISUAL-DIFF-AUTOMATION-DEFERRED-TO-T6-GAMMA-CLOSURE` (cross-reference to existing `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-γ-HEADLESS-SCREENSHOT` Tier 2 + observation that T7 manual-fallback is the operator-time cost until γ closure).
3. Audit doc (`docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md`) §6.F append OR new subsection for T7 visual polish coverage — DEFERRED to operator-mediated reconciliation per established T3/T6 precedent (audit-doc is orchestrator-mediated territory).

**Acceptance:** Single docs commit body Q1-Q9.

**Frozen contracts touched:** None.

### WB-FINAL (verification, no commit) — operator-manual visual-diff gate + runtime-launch smoke

Per dispatch §3.5 + CLAUDE.md §4.6:
```
pnpm --filter dispatch-core build
pnpm --filter dispatch-workstation build
pnpm --filter dispatch-workstation exec electron dist/main/main.js
# Observe WINDOW_READY sentinel within ~10 seconds
# Toggle to Frame C
# Verify visual surfaces:
#   - SessionList rows render with sticky-note background + status-dot in wireframe colors + model-badge in per-family color
#   - Selected row shows highlight + left-border accent
#   - FilterBar renders with 2 selects + Clear button (no actual filtering until T1 future-WB)
#   - chat-shell/ components show typography hierarchy + Auto/Ask active-state
# Compare against wireframe-target-2026-05-11.png (operator-side image)
# Direct refinement WBs OR ratify
```

If runtime-launch smoke surfaces unexpected behavior OR operator visual-diff identifies regressions, file Tier 1 `MB-F-MBTWFT7-RUNTIME-SURFACE-<DESCRIPTOR>` and HALT.

---

## §5 — Cross-references

### §5.1 — Followups CLOSED by this ticket

T1's explicit T7-refinement deference comments (status-color.ts:31-33 + session-list.tsx:80-81 + session-list.tsx:26-27 selection-visual deferral) are addressed by WB2 + WB6 + WB4 respectively. These are inline comment-deferrals NOT formal FOLLOWUPS rows; closure is via WB ladder land + comment-stamp updates.

### §5.2 — Followups FILED by this ticket (at WB11 docs)

`[MODELED-SPECULATIVE]`:
- `MB-F-FILTERBAR-LOGIC-NOT-WIRED-T1-TERRITORY` (Tier 2) — T7 ships structural FilterBar; T1 future-WB wires predicate-application logic against sessions[]. Cross-reference to dispatch §2 T1 "Filter dropdowns → actual filter logic".
- `MB-F-T7-TAB-SWITCHER-POLISH-DEFERRED-TO-T4-CLOSURE` (Tier 3) — bottom-rail tab-switcher (Chat/Commits/BUILD.md) polish deferred per Sub-Q-E=(i) until T4 ships structural component.
- `MB-F-T7-VISUAL-DIFF-AUTOMATION-DEFERRED-TO-T6-GAMMA-CLOSURE` (Tier 3 OR informational) — cross-references existing `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-γ-HEADLESS-SCREENSHOT` Tier 2; tracks operator-time cost of manual-fallback visual-diff for T7 + future visual-polish tickets.

### §5.3 — Related shipped tickets (read-required at WB1 start)

| Ticket | Anchor | Read scope at WB1 |
|---|---|---|
| MB-T-WIREFRAME-T1-SESSION-DATA-FLOW (T1) | `ec60622` + subsequent WB ladder | `frame-c/status-color.ts` + `frame-c/model-badge.ts` + `frame-c/session-list.tsx` + `frame-c/uptime-format.ts` |
| MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE (T2) | `30ab109` + subsequent | DetailPane structural extension + `frame-c/terminal-stream.tsx` |
| MB-T-WIREFRAME-T3-ACTION-BAR-WIRING (T3) | `5565a60` → `bae1b97` (this sub-session's prior ladder) | `frame-c/action-bar.tsx` + `frame-c/detail-pane.tsx` + bypass-perms indicator + source-label |
| MB-T-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-α-β (T6) | `10d5238` → `0d71590` | `verifyBundleFingerprint` + `verify:build-freshness` script + auto-ack §C envelope amendment (closure-paths α+β shipped; γ deferred) |

### §5.4 — Related FOLLOWUPS rows (read-required)

- `MB-F-WIREFRAME-PARITY-SCOPE-UNDERESTIMATED` (Tier 1) — T7 is one of the workstreams enumerated; T7 closure contributes to parity progress.
- `MB-F-WIREFRAME-VISUAL-VERIFICATION-GAP` (Tier 1) — T7 + γ closure together address this gap.
- `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-γ-HEADLESS-SCREENSHOT` (Tier 2 FOLLOWUPS row 335) — T7 visual-diff gate cross-reference.
- `MB-F-CROSS-SESSION-STAGING-AREA-COMMIT-CONTAMINATION-2026-05-12` (Tier 1) — Round 9 stress-regime discipline; T7 ladder applies pathspec-add + pathspec-commit BOTH per operator's reinforced Q7 protocol.

### §5.5 — Files this ticket READS but DOES NOT MODIFY

- `packages/dispatch-workstation/src/tile-grid/tile-header.tsx` — read for STATUS_DOT_HEX reference (read-only unless Sub-Q-B=(ii)/(iii) drives WB2 DRY refactor).
- `packages/dispatch-workstation/src/tile-grid/tile.tsx` — Frame A primary chrome; out of T7 scope.
- `dispatch-core/src/v3/schema.ts` — frozen; no T7 modifications.
- `WORKSTATION_CONTRACT.md` — no §6 touches.

### §5.6 — Files this ticket MODIFIES

- `packages/dispatch-workstation/src/frame-c/status-color.ts` — WB2 (ratification stamp OR hex refinements per Sub-Q-B).
- `packages/dispatch-workstation/src/frame-c/session-list.tsx` — WB4 (selected-row highlight + sticky-note) + WB6 (model-family-coloring application) + WB8 (FilterBar mount above list, if mounted here vs FrameCRoot).
- `packages/dispatch-workstation/src/frame-c/model-badge.ts` — WB6 (`modelToFamily` helper add).
- `packages/dispatch-workstation/src/frame-c/frame-c-root.tsx` — WB8 (FilterBar mount above SessionList in left column).
- `packages/dispatch-workstation/src/frame-c/filter-bar.tsx` — WB8 (NEW file).
- `packages/dispatch-workstation/src/chat-shell/cost-meter.tsx` — WB10 (typography polish).
- `packages/dispatch-workstation/src/chat-shell/dispatch-mode-toggle.tsx` — WB10 (active-state polish).
- `packages/dispatch-workstation/src/chat-shell/plan-usage-ring.tsx` — WB10 (typography polish).
- `packages/dispatch-workstation/src/chat-shell/mix-indicator.tsx` — WB10 (chip polish; minor).
- `packages/dispatch-workstation/test/unit/frame-c/probe-mbtwft7-*.spec.{ts,tsx}` — 4 NEW probe specs (WB1, WB3, WB5, WB7).
- `packages/dispatch-workstation/test/unit/chat-shell/probe-mbtwft7-09-*.spec.tsx` — 1 NEW probe spec (WB9).
- `docs/coordination/mb-t-wireframe-t7-visual-polish-findings-<date>.md` (NEW findings doc at WB11).
- `docs/FOLLOWUPS.md` — Tier 2/3 rows at WB11.
- (CONDITIONAL on Sub-Q-A=(β)) `packages/dispatch-workstation/src/frame-c/color-palette.ts` — WB0 NEW file.

### §5.7 — Anchor commit at ticket-authoring time

`bae1b97` (HEAD at authoring time — T7 sub-session's own prior T3 WB9 docs commit). Origin/main may advance during this body's authoring; the body's `[KNOWN]` cites are from sources read this session at HEAD `bae1b97`.

---

## §6 — Self-check Q1-Q9 per WB commit (CONDUCTOR_API_CONTRACT.md §10.5)

| WB | Q1 (spike?) | Q2 (mocks?) | Q3 (impl-deleted-passes?) | Q4 (outside contract?) | Q5 (frozen mod?) | Q6 (labels?) | Q7 (parallel territory?) | Q8 (bypass PATCH?) | Q9 (halt-unauth?) |
|---|---|---|---|---|---|---|---|---|---|
| WB0 (β only) | N/A | N/A | N/A | No — design-token module | No | KNOWN/MODELED applied | frame-c/color-palette.ts path-disjoint | N/A | No |
| WB1 RED | N/A | BEHAVIOR (pure-fn assertion) | No — probe-only | No | No | KNOWN/MODELED | test/unit/frame-c/ path-disjoint | N/A | No |
| WB2 GREEN | N/A | BEHAVIOR | No — comment-stamp OR hex refinement | No | No | KNOWN/MODELED | frame-c/status-color.ts — coord with T1 if T1 active | N/A | No |
| WB3 RED | N/A | BEHAVIOR (happy-dom React render) | No — probe-only | No | No | KNOWN/MODELED | test/unit/frame-c/ path-disjoint | N/A | No |
| WB4 GREEN | N/A | BEHAVIOR | No — impl load-bearing | No | No | KNOWN/MODELED | frame-c/session-list.tsx — coord with T1 if T1 active | N/A | No |
| WB5 RED | N/A | BEHAVIOR | No — probe-only | No | No | KNOWN/MODELED | test/unit/frame-c/ path-disjoint | N/A | No |
| WB6 GREEN | N/A | BEHAVIOR | No — impl load-bearing | No | No | KNOWN/MODELED | frame-c/model-badge.ts + frame-c/session-list.tsx — coord with T1 | N/A | No |
| WB7 RED | N/A | BEHAVIOR | No — probe-only | No | No | KNOWN/MODELED | test/unit/frame-c/ path-disjoint | N/A | No |
| WB8 GREEN | N/A | BEHAVIOR | No — impl load-bearing | No | No | KNOWN/MODELED | NEW frame-c/filter-bar.tsx + frame-c/frame-c-root.tsx | N/A | No |
| WB9 RED | N/A | BEHAVIOR | No — probe-only | No | No | KNOWN/MODELED | test/unit/chat-shell/ path-disjoint | N/A | No |
| WB10 GREEN | N/A | BEHAVIOR | No — impl load-bearing | No | No | KNOWN/MODELED | chat-shell/* — path-disjoint from frame-c siblings | N/A | No |
| WB11 docs | N/A | N/A | N/A | No — docs/coordination/ + docs/FOLLOWUPS.md | No | KNOWN per direct execution evidence | docs paths path-disjoint | N/A | No |

---

## §7 — Definition of done

The ticket is DONE when ALL of the following hold:

1. **(Conditional WB0)** If Sub-Q-A=(β), `frame-c/color-palette.ts` shipped + consumers refactored at-touch.
2. **WB1+WB2** status-color palette ratified OR refined; probe asserts hex values.
3. **WB3+WB4** SessionList selected-tile highlight + sticky-note aesthetic; probes flipped.
4. **WB5+WB6** model-badge per-family color coding; probes flipped.
5. **WB7+WB8** FilterBar structural component + styling; probes flipped; logic deferral row filed.
6. **WB9+WB10** chat-shell/ polish (mode toggle + cost-meter + plan-ring + mix-indicator); probes flipped; tab-switcher deferral row filed.
7. **WB11 docs** findings doc + 3 followups (Tier 2 FilterBar logic + Tier 3 tab-switcher + Tier 3 γ visual-diff automation).
8. **Consumer non-regression** per CLAUDE.md memory: existing T1/T2/T3 + Wave B/C probes stay GREEN at every WB.
9. **Workstation typecheck CLEAN** per CLAUDE.md §4.4.
10. **Dispatch-core build fresh** per CLAUDE.md §3.4 (N/A unless T7 touches schemas — should not).
11. **Runtime-launch smoke** per CLAUDE.md §4.6 + WB-FINAL section confirms: visual surfaces render per §1.1 enumeration; no console errors; WINDOW_READY sentinel observed.
12. **Operator visual verification** against `wireframe-target-2026-05-11.png` per dispatch §3.5 visual-comparison gate — operator-manual fallback (until γ ships).

---

## §8 — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Sub-Q-A=(γ)/(δ) (CSS modules or styled-components) creates 170-site refactor + dev-dep arbitration cycle** | `[MODELED-LOW]` if (α) RECOMMENDED default | `[MODELED-HIGH]` if (γ)/(δ) selected | Default (α). DRAFT alternates in §3.1; operator surface at HALT-TICKET-BODY-PRE-COMMIT for arbitration. |
| **T1 sibling active on frame-c/status-color.ts OR frame-c/session-list.tsx OR frame-c/model-badge.ts during T7 WB2/WB4/WB6** | `[MODELED-MEDIUM]` — T1's WB ladder is in-flight per dispatch §2 T1 + frame-c primitives shipped at `ec60622` + subsequent | `[MODELED-MEDIUM]` (merge friction; per-path commit discipline mitigates) | Pre-WB territory check per CLAUDE.md §2.7 + Q7 protocol (`git status --short` + `git diff --cached --name-only` at commit time). Pathspec on `git add` AND `git commit`. Per Tier 1 `MB-F-CROSS-SESSION-STAGING-AREA-COMMIT-CONTAMINATION-2026-05-12` lessons. |
| **Wireframe target image NOT in repo — Sub-Q-B/C operator-provided refinement requires operator-time** | `[KNOWN]` confirmed via `ls docs/coordination/wireframe-target-2026-05-11.png` at HEAD `bae1b97` (file absent) | `[MODELED-MEDIUM]` (Sub-Q-B/C=(ii) defers WB until operator-input arrives) | Default Sub-Q-B=(i) ratify T1 placeholder + Sub-Q-C=(i) sub-session-driven per-family palette. Operator visual-diff at WB-FINAL is the refinement gate (operator-manual fallback per dispatch §3.5). |
| **Operator visual-diff at WB-FINAL rejects sub-session-chosen hex values (Sub-Q-B/C=(i)) → require post-FINAL refinement WBs** | `[MODELED-MEDIUM]` | `[MODELED-LOW]` (refinement WBs are mechanical hex-value updates; small) | Document the refinement-WB-as-followup pattern in WB11 findings doc. Operator may either ratify at FINAL or request refinement cycle. |
| **FilterBar logic-deferred posture creates dogfood confusion (operator clicks dropdowns + nothing filters)** | `[MODELED-MEDIUM]` (operator may forget logic is T1 territory) | `[MODELED-LOW]` (no functional regression; just non-functional UI) | Default Sub-Q-D=(i) split. FilterBar visual surface renders; honest empty-effect posture matches `MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11` precedent. WB11 findings doc + Tier 2 row document this clearly. |
| **chat-shell/dispatch-mode-toggle.tsx existing consumer tests fail after WB10 polish** | `[MODELED-LOW]` if polish is additive (data-attr + style refinement); `[MODELED-MEDIUM]` if active-state shape change breaks existing consumer assumptions | `[MODELED-MEDIUM]` (test failures outside §4.5 trigger HALT) | Pre-WB10 verification: read existing dispatch-mode-toggle tests; ensure additive-only changes. If consumer assumption breakage required, scope down OR file Tier 2 followup. |
| **Visual-diff gate operator-manual fallback creates indefinite operator-time-cost across all visual-polish tickets** | `[KNOWN-MEDIUM]` per dispatch §3.5 + γ deferral | `[MODELED-MEDIUM]` (cumulative operator-load) | Default Sub-Q-G=(i). File Tier 3 followup at WB11 cross-referencing γ closure-track for visibility. Operator may prioritize γ closure if cumulative load justifies. |
| **Sticky-note aesthetic (Sub-Q-F=(ii)) shadow rendering impacts scroll performance with large session counts** | `[MODELED-LOW]` if Sub-Q-F=(i) (minimal background+border); `[MODELED-MEDIUM]` if (ii) per-row shadows + large session counts | `[MODELED-LOW]` (renderer scroll perf; not ship-blocking) | Default Sub-Q-F=(i). If (ii) requested by operator, file Tier 3 perf monitoring followup. |

---

## §9 — Closing posture

### §9.1 — Anomalies surfaced at HALT-TICKET-BODY-PRE-COMMIT (for operator awareness)

1. **Sub-Q-MBTWFT7-A operator-pending** (§3.1, LOAD-BEARING): styling approach. (α) extend inline-CSSProperties RECOMMENDED — matches 170-site precedent + zero dev dep + zero cross-session conflict-multiplier. (β)/(γ)/(δ) introduce new system; (γ)/(δ) require WB0 dev-dep arbitration.
2. **Sub-Q-MBTWFT7-B operator-pending** (§3.2): status-color palette source. (i) ratify T1 placeholder RECOMMENDED. (ii) operator-provides refined hex from wireframe. (iii) T7 commits + operator visual-verifies at FINAL.
3. **Sub-Q-MBTWFT7-C operator-pending** (§3.3): model-badge per-family color scheme. (i) per-family colors (sonnet/opus/haiku) RECOMMENDED.
4. **Sub-Q-MBTWFT7-D operator-pending** (§3.4): FilterBar scope split. (i) T7 structural + T1 logic RECOMMENDED.
5. **Sub-Q-MBTWFT7-E operator-pending** (§3.5): bottom-rail polish scope. (i) chat-shell/ only RECOMMENDED; defer tab-switcher.
6. **Sub-Q-MBTWFT7-F operator-pending** (§3.6): selected-tile highlight. (i) background+border-accent RECOMMENDED.
7. **Sub-Q-MBTWFT7-G operator-pending** (§3.7): visual-diff gate. (i) operator-manual fallback (only option until γ).
8. **Sub-Q-MBTWFT7-H operator-pending** (§3.8, CONDITIONAL on Sub-Q-A=(β)): design-token location. (a) `frame-c/color-palette.ts` RECOMMENDED.
9. **Anti-fabrication catches resolved at body §2**: codebase has zero external CSS files + zero styled-components (verified via direct grep); wireframe image is operator-side only (verified via `ls`); T4 ticket body not yet authored at HEAD `bae1b97` (verified via `ls docs/build-docs/CONDUCTOR_MB-T-WIREFRAME-T4-*.md`).
10. **Stale-dispatch detection per CLAUDE.md memory `feedback_stale_dispatch_detection.md`**: dispatch §2 T7 scope is OPEN at HEAD — no T7 visual-polish probes/sources at HEAD. Dispatch is current.

### §9.2 — Authoring-time stats (for HALT-TICKET-BODY-PRE-COMMIT surface)

| Stat | Value |
|---|---|
| Authoring-anchor HEAD | `bae1b97` (T3 sub-session's own prior WB9 docs commit) |
| Files READ (no modification) | 8: `full-build-mode-dispatch.md` (§§0-9, 369L), `frame-c/status-color.ts` (~50L), `frame-c/model-badge.ts` (~60L), `frame-c/session-list.tsx` (peek L1-130 + computed L140-210), `chat-shell/dispatch-mode-toggle.tsx`, `chat-shell/cost-meter.tsx`, `chat-shell/plan-usage-ring.tsx`, `chat-shell/mix-indicator.tsx` (file-grep), `CONDUCTOR_MB-T-WIREFRAME-T3-ACTION-BAR-WIRING_BUILD.md` (format anchor) |
| Files GREP'd | `find packages/dispatch-workstation/src -name "*.css" -o -name "*.scss"` (0 results); `grep -rn "import.*styled\|styled-components"` (0); `grep -rn "style: {\|CSSProperties"` (170 sites); `grep "color: '#'"` (30 unique hex codes); `ls docs/coordination/wireframe-target-2026-05-11.png` (absent); `ls docs/build-docs/CONDUCTOR_MB-T-WIREFRAME-T*.md` (3 results: T1/T2/T3 only) |
| Sub-Qs surfaced for operator decision | 8 (A LOAD-BEARING; B-G per-WB-scope; H META conditional) |
| WB count range | 9-13 (default 9 under all-α/i; +1-2 if β; +2-3 if D=iii or E=ii) |
| Estimated total LOC for GREEN WBs | ~250-400 lines (frame-c/filter-bar.tsx ~80-120L; SessionList style additions ~30-50L; model-badge.ts modelToFamily ~30L; chat-shell polish ~50-80L; status-color.ts WB2 ratification ~0-30L) + ~400-600 lines of probes |
| Frozen surface touches | 0 |
| Anti-fabrication catches | 3 (zero external CSS in workstation; wireframe image NOT in repo; T4 body not authored) |

### §9.3 — Parallel-CC viability

T7 ticket-body authoring (this commit) IS path-disjoint and parallel-CC viable: touches NEW `docs/build-docs/CONDUCTOR_MB-T-WIREFRAME-T7-VISUAL-POLISH_BUILD.md` only.

T7 EXECUTION path-overlap analysis:
- `frame-c/status-color.ts` — PATH-OVERLAP with T1 (T1 owns module-content; T7 modifies hex values per Sub-Q-B). Coord at WB2.
- `frame-c/model-badge.ts` — PATH-OVERLAP with T1. Coord at WB6 (modelToFamily helper add — additive, low conflict).
- `frame-c/session-list.tsx` — PATH-OVERLAP with T1 (T1 owns row-rendering structure; T7 adds selected-state styling + sticky-note). Coord at WB4/WB6/WB8.
- `frame-c/frame-c-root.tsx` — PATH-OVERLAP with T1 (T1 owns column layout; T7 adds FilterBar mount above SessionList). Coord at WB8.
- `frame-c/filter-bar.tsx` — NEW file; T7 territory.
- `chat-shell/*` — path-disjoint from frame-c siblings; chat-shell territory.
- `tile-grid/tile-header.tsx` — READ ONLY (unless Sub-Q-B=(ii)/(iii) WB2 DRY refactor).
- `dispatch-core/src/v3/schema.ts` — NO TOUCH (frozen).
- `WORKSTATION_CONTRACT.md` — NO TOUCH.

Path-overlap mitigations: per-path `git add` AND per-path `git commit` (per Tier 1 `MB-F-CROSS-SESSION-STAGING-AREA-COMMIT-CONTAMINATION-2026-05-12` lessons — T7 sub-session observed 2 near-miss contaminations in prior T3 ladder at WB1+WB3, both successfully remediated pre-commit via Q7 protocol). Pre-WB territory check (`git status --short` + `git diff --cached --name-only` at commit time).

---

**End of MB-T-WIREFRAME-T7-VISUAL-POLISH ticket body.**

Pending operator resolutions before execution: Sub-Q-A (§3.1 styling approach; LOAD-BEARING) + Sub-Q-B (§3.2 status-color source) + Sub-Q-C (§3.3 model-badge family scheme) + Sub-Q-D (§3.4 FilterBar scope split) + Sub-Q-E (§3.5 bottom-rail polish scope) + Sub-Q-F (§3.6 selected-tile highlight) + Sub-Q-G (§3.7 visual-diff gate) + Sub-Q-H (§3.8 design-token location, conditional on Sub-Q-A=(β)).
