# MB-T-WIREFRAME-B1-TILE-VISUAL-SEPARATION — tile chrome via per-tile border/radius/background + #tile-grid-root gap (CSS-only)

**Status:** DRAFT-PENDING-OPERATOR-REVIEW
**Date authored:** 2026-05-11
**Authored under:** §3.4 operator-supervised mechanical translation discipline (max-parallel autonomous mode, parallel-1-of-3 with T3 #4 + T4 #2)
**Authoring delegate:** T2 sub-session (Opus 4.7), bounded by W1 + W2 wireframe-audit dispositions 2026-05-11
**Authoring anchor commit (HEAD at authoring time):** `d4b0420`
**Cairn ladder anchor:** Tier 1 #1 of GATE W3 Batch 1. Audit `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` §4.1 row "Tile-level visual separation" classification flip from WIREFRAME-VISION-NOT-SHIPPED → SHIPPED.
**Closes:** Audit §4.1 Tile-level-visual-separation row (Tier 1 per W1 disposition: "the largest perceptual gap and cheapest to close").
**Depends on (all merged):** MB-T12 tile-grid + tile.tsx wrapper (post-WB12 shipped at `69d7d29`); §C.1′ Frame Router (44764fd — frame-mode shell containing the tile-grid-root container).
**Downstream gates:** Audit-reclassification (post-merge: a re-run of the wireframe-vs-shipped audit over §4.1 should report SHIPPED for this row). Visual-correctness validation is operator-territory at GATE W4 (operator smoke + screenshot review).
**Estimated WB count:** 2 (RED probe + GREEN implementation)

---

## §0 — Reading protocol

1. Read §1 (scope) + §2 (arbitration anchor) — scope is purely cosmetic / CSS-only.
2. Read §3 — two small Sub-Q candidates (color hex values + flex-vs-grid layout choice). Neither is operator-territory-required; `[MODELED]` defaults provided for WB2 GREEN convenience.
3. Read §4 (WB ladder) — 2 WBs total.
4. §5-§9 are operational supports.

Confidence labels per CLAUDE.md §2.2 apply throughout. The audit §4.1 row text is `[KNOWN-OPERATOR-FILED-AT-2026-05-09]` (audit-doc), binding for closure scope.

---

## §1 — Scope

### §1.1 — What this ticket DOES

`[KNOWN-AUDIT-§4.1-FILED]` per audit closure path:

1. **Add CSS rules to `packages/dispatch-workstation/src/main/workstation-shell.html`** (inside the existing `<style>` block; near the MB-T12 sentinel zone at lines 65-78):
   - `#tile-grid-root` switches from `display: block` to `display: flex; flex-direction: column; gap: <gap>; padding: <pad>;` (per Sub-Q-MBTWBIVTS-B default).
   - NEW `.tile` class rule with per-tile chrome: `border: <border>; border-radius: <radius>; background: <bg>; box-sizing: border-box; overflow: hidden;`.
   - `.tile` background `[MODELED]` proposal: `#161616` (between shell `#0a0a0a` and would-be-bright; preserves dark-mode read; distinct from shell-region `#console-tile-region` background `#0a0a0a` at shell line 70).
   - `.tile` border `[MODELED]` proposal: `1px solid #303030` (matches existing shell border-top color at shell line 69 for visual consistency).
   - `.tile` border-radius `[MODELED]` proposal: `6px` (modest rounding; wireframe-vision standard).

2. **Add `className="tile"` to the tile root `<div>` in `packages/dispatch-workstation/src/tile-grid/tile.tsx:137-145`.** Single line addition; existing `data-testid`, `data-collapsed`, `data-status` attributes preserved unchanged. Existing inline `style` for collapsed mode (`{ height: '40px', overflow: 'hidden', alignSelf: 'start' }`) preserved — CSS `.tile` rule applies always; inline `style` only when `collapsed === true` (no conflict; inline takes precedence per CSS spec).

3. **Author a RED probe** at `packages/dispatch-workstation/test/unit/tile-grid/probe-mbtwbivts-01-tile-visual-separation.spec.ts` (NEW file) asserting source-text presence of the CSS rules + className attribute. RED today; GREEN after WB2 ships.

4. **Re-classify audit §4.1 row** from WIREFRAME-VISION-NOT-SHIPPED → SHIPPED at WB-final FOLLOWUPS update (or audit-doc update — operator discretion at HALT-WB2-PRE-COMMIT per §6.1).

### §1.2 — What this ticket DOES NOT

`[KNOWN-OPERATOR-ARBITRATED-AT-W1]` constraints:

- Does NOT modify tile data binding, IPC, schema, contract surfaces. Pure CSS + 1-attribute addition.
- Does NOT touch frozen surfaces: `REGISTRY.md` §2, `CONDUCTOR_API_CONTRACT.md`, `packages/dispatch-core/src/v3/schema.ts` §1-§13, `docs/build-docs/WORKSTATION_CONTRACT.md` §6.
- Does NOT modify tile body content (`ConsolePanel`, `TileHeader`, slots, footer). Tile-internal chrome unchanged.
- Does NOT modify chat-shell, kanban webview, splitter, header-bar, or any other non-tile surface.
- Does NOT introduce a build-step (CSS lives in inline `<style>` block per existing shell HTML pattern; no new toolchain).
- Does NOT touch the JavaScript bundles or main process — purely renderer-side cosmetic.
- Does NOT close other audit §4.1 sibling rows (ctx % text label, footer max-plan, etc.) — those are separate tickets per W1 batch breakdown.
- Does NOT make claims about visual-correctness — that is operator-eye-validated at GATE W4 smoke. Probe asserts STRUCTURAL presence of CSS rules + className only, not pixel-perfect rendering.

---

## §2 — Arbitration anchor (audit §4.1 verbatim + W1 Tier 1 disposition)

`[KNOWN-AUDIT-FILED-2026-05-09]`

From `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` §4.1 row (verbatim, line 118):

> **Tile-level visual separation** (border, radius, background, gap between tiles) | WIREFRAME-VISION-NOT-SHIPPED | Wireframe `.pane` has visual chrome separating each tile. Shipped tiles are bare `<div data-testid="tile-{name}">` — no border, no radius, no background. `#tile-grid-root` is `display:block` with no gap. This is the **largest perceptual gap and cheapest to close** (CSS-only). [KNOWN — `workstation-shell.html:63-67`, `tile-grid.tsx`]

(Note: audit-doc cites `tile-grid.tsx` for tile rendering; current tree has rendering in `tile.tsx` not `tile-grid.tsx`. Documented in §2.1 below.)

### §2.1 — File-path correction (anti-fabrication note)

`[KNOWN-T2-AUTHORING-OBSERVATION-2026-05-11]`

The audit row cites `tile-grid.tsx` as the file containing tile rendering. Verified at HEAD `d4b0420`:
- `packages/dispatch-workstation/src/tile-grid/tile-grid.tsx` is the GRID orchestrator (lays out N tiles).
- `packages/dispatch-workstation/src/tile-grid/tile.tsx` is the per-TILE renderer (the `<div data-testid="tile-{name}">` lives at lines 137-145 of tile.tsx, NOT tile-grid.tsx).

This is a discoverability-only concern; the audit row's intent is unambiguous, and the closure scope correctly targets `tile.tsx`. Documented per CLAUDE.md §2.1 + sibling `MB-F-T2-FILENAME-CITE-FABRICATION` discipline (audit-doc archaeology preserved per "DO NOT amend prior commits").

---

## §3 — GATE 3 sub-arbitrations (optional; `[MODELED]` defaults proposed)

Neither Sub-Q is operator-territory-required — both are `[MODELED]` proposals safe for WB2 GREEN execution. If operator prefers different values, surface at HALT-WB2-PRE-COMMIT.

### §3.1 — Sub-Q-MBTWBIVTS-A: specific color + radius values

`[MODELED]` proposals (defaults if no operator override):

| CSS property | Default | Rationale |
|---|---|---|
| `.tile { background: ... }` | `#161616` | Distinct from shell-region `#0a0a0a` background (line 70); preserves dark-mode read; subtle contrast. |
| `.tile { border: ... }` | `1px solid #303030` | Matches existing shell border-top color (line 69) for visual consistency. |
| `.tile { border-radius: ... }` | `6px` | Modest rounding; aligns with wireframe-vision standard pane chrome. |
| `#tile-grid-root { gap: ... }` | `8px` | Subtle separation; matches conventional dark-mode dashboard spacing. |
| `#tile-grid-root { padding: ... }` | `8px` | Equal padding so first/last tile have visible gap to shell edges. |

If operator prefers different values: provide hex codes at HALT-WB2-PRE-COMMIT. The probe (§4 WB1) asserts STRUCTURAL presence of `border`, `border-radius`, `background`, `gap` — not specific values — so different operator values do NOT re-RED the probe.

### §3.2 — Sub-Q-MBTWBIVTS-B: layout primitive — flex vs grid

`[MODELED]` proposal (default): **flex** (`display: flex; flex-direction: column;`).

Rationale: tiles are stacked vertically (one column); flex's `gap` property is supported in all modern Chromium versions Electron 41 ships. Grid would also work (`display: grid; grid-auto-flow: row;`) but adds complexity (row template, auto-flow direction). Flex is the minimal-change-from-`display:block`.

Operator may prefer grid if anticipating multi-column future layouts. Surface at HALT-WB2-PRE-COMMIT if needed. Probe (§4 WB1) asserts STRUCTURAL `gap` presence regardless of flex vs grid.

### §3.3 — Sub-Q-MBTWBIVTS-C: probe scope — source-text vs computed-style

`[KNOWN-AUTO-RESOLVED]` Source-text grep is the chosen probe shape per §4 WB1. Computed-style assertion would require happy-dom + full stylesheet parsing (heavier mock; same coverage). Source-text grep mirrors the proven fix01e + crash-recovery probe pattern (structural source assertions). No operator decision required.

---

## §4 — WB ladder

2-WB ladder. Each WB follows cairn methodology: red authors failing probe; green implements minimum; commit body carries Q1-Q9 per CLAUDE.md §10.5; per-path `git add` per §2.7; push after each cairn-grammar commit per §2.6.

### WB1 — `red(MB-T-WIREFRAME-B1-TILE-VISUAL-SEPARATION): tile chrome + #tile-grid-root gap source-text probe`

**Type:** red
**Scope:** Author RED probe at `packages/dispatch-workstation/test/unit/tile-grid/probe-mbtwbivts-01-tile-visual-separation.spec.ts` (NEW file). Probe reads two source files (workstation-shell.html + tile.tsx) and asserts 5 conditions via substring/regex matches:

1. **`#tile-grid-root` layout has gap.** workstation-shell.html contains a `#tile-grid-root { ... }` rule that includes `display:\s*(flex|grid)` AND `gap:\s*\d+(\.\d+)?(px|rem|em)` (regex tolerates `flex` or `grid` + any numeric gap unit). Today RED: shell HTML at line 73-77 has `display: block` and zero gap declaration.

2. **`.tile` chrome rule exists.** workstation-shell.html contains a `.tile { ... }` rule that includes `border:`, `border-radius:`, AND `background:` declarations. Today RED: no `.tile` rule exists in shell HTML.

3. **Tile root `<div>` carries `className="tile"`.** tile.tsx root `<div data-testid={\`tile-${sessionName}\`}>` (line 137 of current source) includes a `className="tile"` attribute. Today RED: no `className` on this div per tile.tsx:137-145 read.

4. **`.tile` background distinct from shell-region background.** workstation-shell.html `.tile` rule's `background:` value differs from `#0a0a0a` (the shell-region `#console-tile-region` background at line 70). Today RED: no `.tile` rule. After WB2 GREEN: probe asserts the chosen background hex (e.g., `#161616`) differs from `#0a0a0a`.

5. **Collapsed-mode inline-style preservation.** tile.tsx still contains the existing collapsed-mode inline style `height: '40px', overflow: 'hidden', alignSelf: 'start'` (line 142-144). Verifies WB2 GREEN did not regress the WB10 collapsed-mode chrome behavior. Today PASSES (existing); WB2 GREEN must preserve. Included as defense-in-depth invariant assertion.

Probe MUST fail RED today on assertions (1)-(4). Assertion (5) is a regression-prevention check that should remain GREEN throughout.

**Acceptance:** probe RED with 4 of 5 assertions failing + 1 passing (invariant). Commit body Q1-Q9.
**Frozen contracts touched:** none — probe-only.
**Test infrastructure:** standard `vitest` + `node:fs.readFileSync` for source-text reading (same pattern as `probe-mbthsowire-fix01e-path-e-pool-state-machine.spec.ts` reading main.ts). No DOM rendering needed; no React Testing Library; no happy-dom stylesheet parsing.

### WB2 — `green(MB-T-WIREFRAME-B1-TILE-VISUAL-SEPARATION): CSS chrome + className wired`

**Type:** green
**Scope:** Two file edits.

1. **`packages/dispatch-workstation/src/main/workstation-shell.html`** — extend the existing `<style>` block near the MB-T12 sentinel zone (around line 65-78). Specifically:
   - Modify `#tile-grid-root` rule (line 73-77) from `display: block` to `display: flex; flex-direction: column; gap: 8px; padding: 8px;`. Preserves `height: 100%; width: 100%;`.
   - Add new `.tile` rule (NEW; insert AFTER the MB-T12 sentinel zone end-marker per CLAUDE.md §3.3 sentinel discipline — OR inside a new sentinel zone `=== BEGIN: MB-T-WIREFRAME-B1-TILE-VISUAL-SEPARATION ===`). Body:
     ```css
     .tile {
       border: 1px solid #303030;
       border-radius: 6px;
       background: #161616;
       box-sizing: border-box;
       overflow: hidden;
     }
     ```

2. **`packages/dispatch-workstation/src/tile-grid/tile.tsx`** — single-line addition at line 137. Modify:
   ```tsx
   <div
     data-testid={`tile-${sessionName}`}
     data-collapsed={collapsed ? 'true' : 'false'}
     data-status={status}
     style={...}
   ```
   to:
   ```tsx
   <div
     className="tile"
     data-testid={`tile-${sessionName}`}
     data-collapsed={collapsed ? 'true' : 'false'}
     data-status={status}
     style={...}
   ```

**Acceptance:** WB1 probe flips RED → GREEN (5/5). Adjacent probes preserved:
- `probe-mbt12-tile-grid-{01..04}.spec.tsx` (MB-T12 baseline tile-grid probes) — assert on `data-testid`, `data-collapsed`, `data-status`; className addition is additive, no regression.
- `probe-mbt15-tile-header.spec.tsx` (MB-T15 TileHeader chrome) — inside tile body; not affected.
- `probe-mbt16-tile-approval-picker.spec.tsx`, `probe-mbt17-tile-autopilot-toggle.spec.tsx` — slot-level probes inside tile; not affected.

Workstation typecheck clean. Commit body Q1-Q9.

**Frozen contracts touched:** none.
**Consumer probes (CLAUDE.md memory feedback):** verify the tile DOM tests above remain GREEN; specifically the `data-testid="tile-{name}"` and `data-collapsed` selector assertions in MB-T12 probes must continue to pass (className addition does not alter those attribute presences).

---

## §5 — Cross-references

### §5.1 — Audit elements CLOSED by this ticket

| Audit element | Tier | Source | Closure target |
|---|---|---|---|
| §4.1 row "Tile-level visual separation" | 1 (W1 disposition) | `wireframe-vs-shipped-audit-2026-05-09.md` line 118 | WB2 GREEN — classification flips WIREFRAME-VISION-NOT-SHIPPED → SHIPPED |

### §5.2 — Audit elements NOT closed by this ticket (sibling rows; separate tickets)

| Sibling row | Tier (W1) | Likely ticket |
|---|---|---|
| §4.1 `ctx N%` text label | Tier 2 prompt-engineering | MB-T-WIREFRAME-CTX-LABEL (future) |
| §4.1 Footer max-plan | Tier 3 | MB-T-WIREFRAME-FOOTER-MAX-PLAN (future) |
| §3 Frame C listview + detail | Tier 1 (sibling #2; T4 authoring in parallel) | MB-T-WIREFRAME-B2-FRAME-C |
| §3 Compact tile mode | Tier 2 (sibling #4; T3 authoring in parallel) | MB-T-WIREFRAME-B4-COMPACT-TILE |
| Other Dim 2/3/4 WIREFRAME-VISION-NOT-SHIPPED rows | Various | Per W1 disposition + W2 batch breakdown |

### §5.3 — Related shipped tickets

| Ticket | Anchor | Relevance |
|---|---|---|
| MB-T12 tile-grid + tile wrapper | `69d7d29` (WB12 ship) | Source of tile root `<div>` being styled; provides existing `data-testid="tile-{name}"` selector |
| MB-T15 TileHeader chrome | (header chrome shipped per MB-T15 ladder) | Inside tile body; not modified |
| MB-T16 approval-policy picker | (slot-level) | Inside tile; not modified |
| MB-T17 autopilot toggle | (slot-level) | Inside tile; not modified |
| MB-T18 tile footer | (slot-level) | Inside tile; not modified |
| §C.1′ Frame Router | `44764fd` | Frame-mode shell containing the tile-grid-root (Frame A mode) |
| MB-T12 WB10 collapsed-mode | (height-40px inline style) | Preserved by WB2 GREEN (invariant per §4 WB1 assertion 5) |

### §5.4 — Files this ticket READS but DOES NOT MODIFY

- `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` — audit anchor (read-only)
- `packages/dispatch-workstation/src/tile-grid/tile-grid.tsx` — grid orchestrator; tile.tsx is the per-tile renderer
- `packages/dispatch-workstation/src/tile-grid/tile-header.tsx` — header chrome inside tile body
- `packages/dispatch-workstation/test/unit/tile-grid/probe-mbt12-*.spec.tsx` — preserved at GREEN by additive className

### §5.5 — Anchor commit at ticket-authoring time

`d4b0420` (HEAD at 2026-05-11 ticket-authoring time). WB1 RED authoring should begin by verifying current state via `git status --short` + anti-stale-dispatch checklist (`MB-F-CHAT-CLAUDE-STALE-DISPATCH-2026-05-10` template).

---

## §6 — Self-check protocol per WB commit (CLAUDE.md §10.5)

Every cairn-grammar commit (red / green) carries a Q1-Q9 self-check block. Standard answers for this ticket below.

| Q | Standard answer for MB-T-WIREFRAME-B1-TILE-VISUAL-SEPARATION WBs |
|---|---|
| Q1 — API verified by spike? | N/A. Source-state of workstation-shell.html lines 55-79 + tile.tsx line 137-145 verified by direct read at HEAD `d4b0420`. No API surface; purely renderer-side cosmetic chrome. |
| Q2 — Test exercises behavior or MOCKS? | Probe is source-text-grep against real source files via `node:fs.readFileSync`. No mocks; no rendering harness. Same pattern as `probe-mbthsowire-fix01e-...` structural assertions. |
| Q3 — If implementation deleted, test passes? | No. WB1 RED probe's 4 of 5 assertions fail today (assertion 5 is an invariant regression-prevention check, preserved across both states). After WB2 GREEN: 5/5 pass; reverting WB2 GREEN reproduces RED. |
| Q4 — Anything outside contract spec? | No. Each WB's "Frozen contracts touched" lists explicit boundaries. WB2 GREEN edits two renderer files; no contract changes. |
| Q5 — Modified contract without approval? | No. Frozen contracts (REGISTRY.md §2, CONDUCTOR_API_CONTRACT.md, schema.ts §1-§13, WORKSTATION_CONTRACT.md §6) untouched. CSS + className are renderer-internal. |
| Q6 — Any unlabeled claim in commit body? | All claims labeled `[KNOWN]` / `[MODELED]` / `[SPECULATIVE]` per CLAUDE.md §2.2. Color hex values are `[MODELED]` proposals (§3.1) until operator confirms at HALT-WB2-PRE-COMMIT. |
| Q7 — Touched files another parallel session might modify? | Answer against actual `git status` per CLAUDE.md §2.7. T3 (#4 compact tile body authoring) + T4 (#2 Frame C surface body authoring) are docs-only and path-disjoint from workstation-shell.html + tile.tsx. Cross-session staging verification at HALT-WB2-PRE-COMMIT. |
| Q8 — Bypass PATCH /v2/sessions/:name/state? | No. Renderer-only commit; no daemon calls. |
| Q9 — Work during unauthorized halt? | No. HALT-MBTWBIVTS-AUTHORED + per-WB HALT-PRE-COMMIT + HALT-PRE-PUSH gate operator-review (auto-ack under operator's autonomous-mode cadence). |

### §6.1 — Per-WB HALT-PRE-COMMIT inventory

- **WB1 RED**: standard HALT-PRE-COMMIT — surface probe contents + 4-RED-1-PASS count + cross-session staging. Auto-ack under autonomous mode.
- **WB2 GREEN**: standard HALT-PRE-COMMIT — surface diff + probe flip evidence (4 RED → 5 GREEN) + adjacent regression check (MB-T12 tile-grid probes preserved). Operator may surface specific color/radius overrides at this HALT per §3.1 if `[MODELED]` defaults don't fit visual intent. Auto-ack under autonomous mode if defaults accepted.

NEW arbitration questions surfacing mid-WB execution → HALT-and-surface, NOT auto-ack.

---

## §7 — Definition-of-done

MB-T-WIREFRAME-B1-TILE-VISUAL-SEPARATION is COMPLETE when ALL of the following are KNOWN-evidence-captured:

1. WB1 + WB2 commits + pushes per CLAUDE.md §2.6 (per-commit-push discipline). `git log --oneline origin/main..HEAD` returns empty after each WB push.
2. WB1 RED probe authored + RED at WB1; flipped GREEN at WB2 (5/5 assertions pass).
3. Adjacent test non-regression at WB2 GREEN:
   - `probe-mbt12-tile-grid-{01..04}.spec.tsx`: preserved GREEN (selector + attribute assertions intact).
   - `probe-mbt15-tile-header.spec.tsx`: preserved GREEN.
   - `probe-mbt16-*` / `probe-mbt17-*` / `probe-mbt18-*`: preserved GREEN.
   - Full `test/unit/tile-grid/` dir: ≥ current-baseline GREEN (no regression).
4. Workstation typecheck clean (`pnpm --filter dispatch-workstation typecheck` exit 0).
5. Audit row §4.1 Tile-level-visual-separation re-classification recorded: WIREFRAME-VISION-NOT-SHIPPED → SHIPPED. Closure documented either in audit-doc inline-edit (operator-territory; surface at HALT-WB2-PRE-COMMIT) OR FOLLOWUPS.md closure row (T2-territory; preferred default per recent precedent at `0a8af68`, `9dc19eb` patterns).
6. No frozen-contract amendment.

### §7.1 — What MB-T-WIREFRAME-B1-TILE-VISUAL-SEPARATION completion does NOT achieve

- Does NOT close other audit §4.1 sibling rows (`ctx N%` text label, max-plan footer, etc.) — separate tickets.
- Does NOT validate visual-correctness — operator-eye review at GATE W4 smoke; not WB-cycle scope.
- Does NOT modify wireframe-vision-not-shipped count beyond the 1 §4.1 row this ticket addresses (audit Dim 2 summary count moves from 5 → 4 post-merge).
- Does NOT touch existing chat-shell or kanban webview chrome — orthogonal surfaces.

---

## §8 — Risk register

### §8.1 — Known risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| CSS specificity conflict with collapsed-mode inline `style` | `[KNOWN]` Low | Low — inline-style spec-wins for height/overflow per W3C cascade rules | WB1 RED probe assertion (5) explicitly verifies collapsed-mode inline-style preservation. WB2 GREEN's `.tile` rule does NOT declare `height` / `overflow` / `align-self` for non-collapsed; only border + radius + background + box-sizing + overflow:hidden (which is collapsed-style-compatible). |
| `.tile` class-name collision with existing `.tile` usage elsewhere | `[MODELED]` Low | Low | Pre-WB2 grep: `grep -rn '\.tile\b\|className="tile"\|className=\\\`tile\\\`' packages/dispatch-workstation/src/` to verify no existing `.tile` class. If collision exists, surface at HALT-WB2-PRE-COMMIT and choose alternate class name (e.g., `tile-chrome`). |
| MB-T12 probe-01..04 regressions from className addition | `[MODELED]` Very Low | Medium — would block WB2 GREEN | Adjacent probes assert `data-testid` + `data-collapsed` + `data-status` — className is additive to these attributes; should not regress. Verified at WB2 GREEN HALT-PRE-COMMIT via full `test/unit/tile-grid/` dir run. |
| Operator-eye visual review at GATE W4 finds default `[MODELED]` colors visually off | `[SPECULATIVE]` Medium | Low — cosmetic, easy to iterate | Hex defaults at §3.1 are revisable via a single-commit follow-up; not blocking GATE W3 closure for this ticket. |
| Tile root `<div>` is rendered N times (one per session in grid); CSS rule applies to all — but DEFAULT background `#161616` may visually conflict with status-color signaling (`data-status` attribute) | `[SPECULATIVE]` Low | Medium | TileHeader's status indicator (per MB-T15) already provides the per-tile status signal; tile-root `.tile` background does NOT need to encode status. If operator wants per-status `.tile[data-status="error"]` etc. styling, file as Tier 3 follow-on. |
| Pre-existing test failures (CLAUDE.md §4.5 baseline) flake under increased test invocation | `[KNOWN]` Medium | Low (pre-existing) | NOT re-diagnosed per §4.5 discipline. |

### §8.2 — Escalation triggers (HALT all work + surface)

Per CLAUDE.md §2.10:

- Frozen-contract amendment surfaced mid-WB (none expected — pure renderer cosmetic)
- `.tile` class-name collision discovered at WB2 GREEN pre-commit grep
- Adjacent MB-T12 probes regress at WB2 GREEN (would indicate CSS / DOM-level conflict)
- Cross-session conflict on workstation-shell.html or tile.tsx (T3 + T4 are docs-only authoring; should not occur)
- Operator surfaces non-`[MODELED]`-default color preference that requires non-trivial style restructuring

### §8.3 — Anti-patterns to avoid

- ❌ Adding inline `style` to tile.tsx for the chrome — keeps shell stylesheet as single source-of-truth for tile chrome; inline-style only used for collapsed-mode height (existing).
- ❌ Modifying `data-testid` / `data-collapsed` / `data-status` attribute presence (would regress MB-T12 probes).
- ❌ Hoisting tile chrome into a separate `.css` file (introduces build-step + breaks current shell.html-inline-`<style>` pattern).
- ❌ `git add -A` or `git add .` (CLAUDE.md §2.7).
- ❌ Force-push to origin/main.
- ❌ Re-diagnosing pre-existing test failures (CLAUDE.md §4.5).
- ❌ Touching `MB-T12 WB12 tile-grid region` sentinel zone in shell HTML outside this ticket's `=== BEGIN: MB-T-WIREFRAME-B1-TILE-VISUAL-SEPARATION ===` zone (if a new sentinel is added per §3.3 zone discipline).
- ❌ Modifying tile body content (ConsolePanel, TileHeader, slots, footer).

---

## §9 — Closing posture

`[KNOWN-AUTHORED-UNDER-§3.4-OPERATOR-SUPERVISED-MECHANICAL-TRANSLATION]`

This ticket translates the W1 Tier 1 #1 disposition into a 2-WB ladder. Scope is purely cosmetic — CSS rules + a single `className="tile"` attribute on the existing tile root `<div>`. No JS / TS code changes; no daemon / IPC / schema changes. The closure flips one audit row from WIREFRAME-VISION-NOT-SHIPPED → SHIPPED.

Two `[MODELED]` Sub-Q proposals surfaced (§3.1 color values; §3.2 flex-vs-grid); both have safe defaults and do NOT block WB execution. Operator may override at HALT-WB2-PRE-COMMIT.

The ticket is the **cheapest closure in the GATE W3 Batch 1** — minimal blast radius, no operator-territory required, immediate visual-perception improvement. Paired with T3's #4 (compact tile body authoring) + T4's #2 (Frame C surface body authoring) for parallel-cairn batch execution.

The cairn methodology applies throughout: red → green → Q1-Q9 → commit → push per WB; per-path `git add`; halt-and-surface for any new arbitration question; no frozen-contract amendment.

Operator review at HALT-MBTWBIVTS-AUTHORED gates execution dispatch. Path-disjoint from T3 + T4 per dispatch context (docs-only ticket-body authoring in parallel; workstation-shell.html + tile.tsx + new probe file are T2's exclusive write scope for WB1 + WB2 execution).

**End MB-T-WIREFRAME-B1-TILE-VISUAL-SEPARATION build doc.**
