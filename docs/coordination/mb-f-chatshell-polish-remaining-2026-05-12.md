# MB-F-CHATSHELL-POLISH-REMAINING — Execution progress (t1-ticket-body-0905)

**Date:** 2026-05-12
**Sub-session:** t1-ticket-body-0905 (R11 §3.9 Wave 2 SPECULATIVE dispatch)
**Manifest:** `docs/coordination/territorial-manifests/t1-chatshell-polish.txt`
**Co-active sibling:** verify-chat-mount-1319 (`verify-chat-mount-t7polish.txt`) — territorial-disjoint at file level except shared `styles.css` (overlap-mitigated by my avoidance plan — see HALT-TERRITORY-ACK §3)
**Closure target:** `MB-F-T7-CHATSHELL-POLISH-REMAINING-DOGFOOD-DRIVEN` (Tier 3, FOLLOWUPS.md:357, filed T7 WB11) — closure-stamp filing deferred to operator/orchestrator per manifest FORBIDDEN FOLLOWUPS.md

---

## §1 — What shipped

3 WBs (each RED+GREEN paired) addressing the 3 example polish targets enumerated in T7 row 357:

| WB | Commit | Component | Refinement | Probes |
|---|---|---|---|---|
| WB1 | `d342986` | `dispatch-mode-toggle.tsx` | BUTTON_ACTIVE_STYLE.background `#374151` → `#4a7fb8` (matches T7 selected-tile borderLeft accent for visual unity across "selected/active" states) | 3 it-blocks (1 ACTIVE-RED + 2 non-regression baseline) |
| WB2 | `2595a46` | `plan-usage-ring.tsx` | NEW COUNTDOWN_STYLE: `fontVariantNumeric: 'tabular-nums'` + `color: '#cccccc'` + `fontWeight: 500` (stable digit-width during ticking + brighter contrast + subtle emphasis) | 4 it-blocks (3 ACTIVE-RED + 1 non-regression) |
| WB3 | `871caf9` | `mix-indicator.tsx` | CHIP_STYLE.borderRadius `3px` → `4px` (softer chip aesthetic matching broader T7 polish set) | 3 it-blocks (2 ACTIVE-RED + 1 non-regression) |

**Net file inventory:**
- MOD: `dispatch-mode-toggle.tsx` (+7/-1), `plan-usage-ring.tsx` (+15/-1), `mix-indicator.tsx` (+5/-1) — total `+27 / -3` src
- NEW probes: `probe-polish-01-dispatch-mode-toggle-active-hex.spec.tsx` · `probe-polish-02-plan-usage-countdown-typography.spec.tsx` · `probe-polish-03-mix-indicator-chip-border-radius.spec.tsx` — total ~150 LOC probe
- NEW docs: this file

---

## §2 — Test results aggregate

- **WB1+WB2+WB3 probes:** 10 it-blocks / 10 GREEN at WB-final
- **Consumer non-regression (MB-T24+T25+T27):** probe-06-dispatch-mode-toggle (9/9) · probe-07-plan-usage-ring (6/6) · probe-01-mix-indicator-render (8/8) · probe-02-mix-indicator-container-subscription (9/9) — 32/32 GREEN
- **Aggregate at WB-final:** 42 it-blocks / 42 GREEN / 0 regression

---

## §3 — Sub-Q resolutions (R11 §3.9 Wave 2 SPECULATIVE)

Per dispatch full-§C envelope authority, this execution selected:
- **All 3 refinements per T7 row 357 (β closure-path)** — operator-driven refinement cycle. Dogfood evidence not awaited; dispatch itself is the operator authorization.
- **`styles.css` avoidance** — overlap-mitigation per HALT-TERRITORY-ACK §3; verify-chat-mount-1319 owns `styles.css` edits if needed.
- **Inline-CSSProperties pattern** — T7 Sub-Q-A=(α) precedent (170-site codebase) preserved.

Closure path mapping per T7 row 357 body:
- (α) "wait for operator dogfood evidence" — SUPERSEDED by R11 §3.9 dispatch
- (β) "operator-driven hex/typography refinement at next visual-polish cycle" — **EXECUTED by this sub-session**
- (γ) "defer indefinitely" — NOT selected

---

## §4 — Cross-session coordination notes

### §4.1 — verify-chat-mount-1319 (territorial-disjoint co-active)

Per dispatch instruction "Coordinate with verify-chat-mount-1319 via territorial-disjoint sub-files":

| File | t1-ticket-body-0905 (me) | verify-chat-mount-1319 | Outcome |
|---|---|---|---|
| `conductor-brand.tsx` | not touched | their primary | No conflict |
| `tab-switcher.tsx` | not touched | their primary | No conflict |
| `styles.css` | NOT TOUCHED (overlap-mitigation) | their effective primary | No conflict |
| `dispatch-mode-toggle.tsx` | WB1 mine | not in their ALLOWED | No conflict |
| `plan-usage-ring.tsx` | WB2 mine | not in their ALLOWED | No conflict |
| `mix-indicator.tsx` | WB3 mine | not in their ALLOWED | No conflict |

**Net:** no file-level conflict observed across the 3-WB execution. styles.css avoidance plan held throughout.

### §4.2 — Cross-session staging-area contamination evidence

At WB3 pre-commit `git status --short` audit, observed staged-by-other-session entries (T3 + T5 territory): `tile-grid.tsx` `M` (T3 frame-c-ipc work), `test/unit/main/probe-frame-c-ipc-lookup-registry.spec.ts` `A`, `test/unit/tile-grid/probe-spawnmode-01-entry-type-shape.spec.ts` `M`.

**Discipline outcome:** pathspec-commit (per Tier 1 ratchet `63581e9` `MB-F-CROSS-SESSION-STAGING-AREA-COMMIT-CONTAMINATION-2026-05-12` discipline) correctly filtered to my 2 files only. Commit `871caf9` content verified via `git show --stat`: 2 files / +50 / -1. **No contamination landed.** Discipline-working case (mirrors T1 WB2-cycle recurrence at `b641eac`).

Per CLAUDE.md memory `feedback_followup_row_as_forward_propagation_memory.md`: this observation reinforces Tier 1 row evidence base; existing row already documents the mechanism (`63581e9` ratchet). Not filing additional Tier 3; existing row body covers the pattern.

---

## §5 — Followup closure-stamp filing deferred

**`MB-F-T7-CHATSHELL-POLISH-REMAINING-DOGFOOD-DRIVEN`** (Tier 3, FOLLOWUPS.md:357) is the canonical row tracking T7 deferred polish. Per manifest FORBIDDEN list, this sub-session CANNOT edit `docs/FOLLOWUPS.md` directly.

**Recommended closure stamp** (for operator/orchestrator to apply when ratifying P1's mb-f-chatshell-polish work):

```
**→ STAMP-PARTIAL 2026-05-12 by t1-ticket-body-0905 R11 §3.9 Wave 2
SPECULATIVE: 3 example refinements per row body shipped via WB1
`d342986` (dispatch-mode-toggle hex `#4a7fb8`) + WB2 `2595a46`
(plan-usage-ring COUNTDOWN_STYLE) + WB3 `871caf9` (mix-indicator
borderRadius 4px). Progress doc at `docs/coordination/mb-f-chatshell-
polish-remaining-2026-05-12.md`. Closure path (β) executed; (α)
dogfood-driven cycle superseded by R11 dispatch; (γ) defer-
indefinitely NOT selected. Sibling verify-chat-mount-1319 holds
conductor-brand/tab-switcher/styles.css scope (territorial-disjoint).
Tier 3 row may close fully OR remain open pending operator visual-
diff against wireframe-target-2026-05-11.png post-merge (operator
arbitration).
```

---

## §6 — Definition-of-done checklist

- [x] WB1 dispatch-mode-toggle active-hex polish landed + pushed
- [x] WB2 plan-usage-ring countdown typography polish landed + pushed
- [x] WB3 mix-indicator chip border-radius polish landed + pushed
- [x] All 3 WB probes RED→GREEN flipped within their WB cycle
- [x] MB-T24 + MB-T25 + MB-T27 consumer non-regression verified at every WB
- [x] Per-path `git add -- <file>` + `git commit -- <file>` discipline applied at every commit
- [x] Pre-commit `git status --short` audit at every commit boundary
- [x] No frozen-surface touch (zero §6 amendment)
- [x] No styles.css touch (overlap-mitigation held)
- [x] WB-final progress doc (this file) authored at manifest-allowed path
- [ ] FOLLOWUPS.md closure-stamp — DEFERRED to operator/orchestrator per manifest FORBIDDEN
- [ ] Operator visual-diff against wireframe-target-2026-05-11.png — DEFERRED to operator (post-merge dogfood OR post-T6 γ headless screenshot pipeline closure)

---

## §7 — Operator/orchestrator action requested

1. **Ratify closure stamp** on FOLLOWUPS row 357 per §5 template (or modified per operator preference)
2. **Visual-diff against wireframe-target** post-merge to confirm refinements match operator visual intent; if mismatch, file Tier 3 ratchet for further refinement
3. **Dispatch styles.css extraction cycle** if T7 inline-CSSProperties pattern proves unwieldy at scale (deferred subjective decision; current pattern is 170-site precedent + Sub-Q-A=(α) ratified)

---

## §8 — Stats

| Stat | Value |
|---|---|
| WB count actual | 3 (matches scope per T7 row 357 enumeration) |
| Commits | 3 (3 cairn-grammar paired WBs; no spike / no Tier 1 filing) |
| Files modified (src) | 3 (`dispatch-mode-toggle.tsx`, `plan-usage-ring.tsx`, `mix-indicator.tsx`) |
| Files added (test) | 3 (`probe-polish-{01,02,03}.spec.tsx`) |
| Frozen surface touches | 0 |
| Total LOC added (src) | +27 net |
| Total LOC added (probes) | ~150 |
| Cross-session contamination incidents | 1 observed at WB3 pre-commit; mitigated by pathspec-commit (no contamination landed) |
| Aggregate test coverage at WB-final | 42 it-blocks / 42 GREEN / 0 regression |
