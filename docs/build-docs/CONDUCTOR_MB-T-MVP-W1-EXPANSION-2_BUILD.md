# CONDUCTOR_MB-T-MVP-W1-EXPANSION-2 — Build doc

**Ticket:** MB-T-MVP-W1-EXPANSION-2-TOPBAR-ORCHESTRATOR-STRIP-TMUX-STYLING
**Ship date:** 2026-05-18
**Ship cycle:** EXPANSION-2 (second cycle of r12-mvp-w1-orchestrator-focus-pane session; post-89905a9 first-cycle WB-final)
**Authority:** Operator OPERATOR-CASCADE-AMENDMENT 2026-05-17 ~19:50 MDT + scope-arbitration commit 94d3e17 §5.1+§5.2+§5.6 + manifest EXPANSION-2 territory grant
**Outcome:** Capability enabled with known limitations (per CLAUDE.md §2.11)

---

## What ships

3 NEW pure-React component surfaces in dispatch-workstation, plus the design-handoff `TMUX_COLORS` color-class map and `ORCH_BANNER` ASCII-box constant:

| Surface | Path | LoC |
|---------|------|----:|
| Topbar | `packages/dispatch-workstation/src/topbar/topbar.tsx` | ~270 |
| OrchestratorStrip | `packages/dispatch-workstation/src/orchestrator-strip/orchestrator-strip.tsx` | ~620 |
| TmuxPaneBody | `packages/dispatch-workstation/src/orchestrator-focus-pane/tmux-pane-body.tsx` | ~170 |

Plus 7 NEW probes contributing 100 new tests (all PASS), all under `packages/dispatch-workstation/test/unit/{topbar,orchestrator-strip,orchestrator-focus-pane}/`.

---

## What's IN each surface

### Topbar (`src/topbar/topbar.tsx`)

Maps design-handoff `app.jsx:282-309` Topbar inline render + `Conductor V_MVP.html:86-110` `.topbar` CSS:

- 36px height, body-level fixed-position overlay (top:0 / left:0 / right:0 / zIndex:1100). Preserves W1 first-cycle overlay-strategy precedent (Q-EXP2-1 = W1 Q6=(c) mech-translation).
- Left section: brand glyph (◐ in `--accent`) + brand name ("Conductor" in `--text`) + brand version pill ("v_mvp" IBM Plex Mono in border-radius:3 pill) + live counts (`paneCount` pluralized via `pane`/`panes` + `runningCount` literal "{N} running" + gated `queue: K · done: J` block when `buildMdAttached`).
- Right section: env label (default em-dash; live verbatim when prop set) + budget label (`$U.UU / $T.TT` atomic display, em-dash when either side missing).
- Vertical separator pips (1×14px in `--border`) between meta items per design `.topbar-sep`.

All count/budget props optional → em-dash placeholders (Q-EXP2-2 = W1 Q3/Q4 mech-translation).

### OrchestratorStrip (`src/orchestrator-strip/orchestrator-strip.tsx`)

Maps design-handoff `orchestrator-strip.jsx` (full 133-line component) + `Conductor V_MVP.html:194-330` `.ostrip*` CSS:

- Header: ▦ mark (in `--accent`) + title text (default "build progress"; `attachedName` override) + count pill `(done+running)/total` (gated on `attached` prop).
- 3-segment progress bar (5px tall, border-radius pill): done in `--ok`, running in `--accent`, queued in `--border`. Widths computed `(value / max(total, sum, 1)) * 100` per design `Math.max` denominator-fallback formula.
- Per-stat surfaces: running (accent-colored), queued, done, optional failed (gated on `erroredCount > 0`), rate (always shown, "{n.n}/min" default "0.0/min"), optional ETA (gated on `etaSeconds != null`, formatted mm:ss).
- SlotGrid: 10×10 px buttons in `repeat(auto-fill, 10px)` grid, status-coded backgrounds (empty/starting/running/done/error), pulse inner span on running slots, click invokes `onSlotClick(session)` for live slots only. Default `maxSlots=64` per chat1.md:107 + scope-arbitration §2.3.
- Legend: 5 entries (running/starting/done/error/idle) with color swatches.
- Pure-fn export `computeThroughputAndEta({ history, queued, windowMs }) → { ratePerMin, etaSeconds }` implementing design jsx:70-89 rolling-window math with inclusive boundary semantics (`<=` deviation documented inline; pure-fn over caller-supplied history vs design's push-then-filter pragmatism).

### TmuxPaneBody (`src/orchestrator-focus-pane/tmux-pane-body.tsx`)

Maps design-handoff `tmux-pane.jsx:5-11` + `:78-108` + `tmux-content.jsx:163-170` + `Conductor V_MVP.html:416-447` `.tmux-*` CSS:

- Named exports: `TMUX_COLORS` (5-class color map: sys/ok/warn/err/banner with literal hex resolution per design `:root` dark-theme), `ORCH_BANNER` (readonly 6-entry array: 5 banner-class ASCII box lines with ┌/└ corners + trailing sys-class blank), `TmuxPaneBody` (React component), `TmuxLine` / `TmuxLineClass` / `TmuxStatus` types.
- Component renders: tmux-body root anchor + optional `ORCH_BANNER` block above (gated on `showBanner`) + classified `lines[]` color-mapped per t-class + blinking cwd cursor line when `status='running'` (cwd in `--accent` + ` $ ` separator in `--mono-dim` + cursor span with `--accent` background, marginLeft 2, 0.85 opacity) + done/error state footer lines.
- IBM Plex Mono 10.5px / 1.45 line-height body per design HTML:416-419.

---

## What's NOT in this cycle (deferred follow-ups)

### Tier-1 (mechanical-translation envelope; CLAUDE.md §3.4)

- `MB-F-MVP-W1-CHAT-SHELL-METERS-REHOME-PENDING` — Re-home chat-shell meters/indicators into src/topbar/ primitives per scope-arbitration §2.2. Coordinated with W3-final sweep.
- `MB-F-MVP-W1-EXP2-TSCONFIG-EXCLUDE-W3-COORDINATION` — Append `src/topbar` + `src/orchestrator-strip` to `tsconfig.json` exclude array. Cross-session collision with W3 sweep in flight; joint-state verified CLEAN.
- `MB-F-MVP-W1-EXP2-BUILD-SCRIPT-CHAIN-WIRING-PENDING` — Author `scripts/build-topbar.mjs` + `scripts/build-orchestrator-strip.mjs` + append `<script>` tags + register in package.json `build` chain.
- `MB-F-MVP-W1-EXP2-MOUNT-WIRING-PENDING` — Author `src/topbar/mount.ts` + `src/orchestrator-strip/mount.ts` mirror of existing `src/orchestrator-focus-pane/mount.ts` DOMContentLoaded auto-mount pattern.

### Tier-2 (live-data wiring)

- `MB-F-MVP-W1-EXP2-LIVE-DATA-IPC-WIRING-PENDING` — IPC channels feeding live data into Topbar/OrchestratorStrip/TmuxPaneBody. Currently all counts/sessions/budget default to em-dash placeholders per W1 Q3/Q4 precedent.
- `MB-F-MVP-W1-EXP2-PANEIN-PANEOUT-ANIMATION-W15` — W1.5 polish wave: `@keyframes paneIn/paneOut/barShimmer/slotPulse/cursor blink` per design HTML:265/308/453/458-466. Explicitly deferred per scope-arbitration §5.6.
- `MB-F-VISUAL-FIDELITY-PIXEL-DIFF-GATE-ADOPTION` — Cross-cutting W1+W3 question: when does pixel-diff infra (existing `scripts/phase-3-visual-smoke.mjs` + pixelmatch/pngjs) become mandatory acceptance gate vs structural-DOM oracle precedent?

---

## Verification

| Check | Result | Source |
|-------|--------|--------|
| 100/100 NEW probes PASS | [KNOWN] | `pnpm --filter dispatch-workstation test test/unit/topbar/ test/unit/orchestrator-strip/ test/unit/orchestrator-focus-pane/probe-mbt-mvp-w1-exp2-06-tmux-body-styling.spec.tsx` at 08:56 MDT 2026-05-18 |
| dispatch-core typecheck | CLEAN | 08:57 MDT |
| dispatch-daemon typecheck | CLEAN | 08:57 MDT |
| dispatch-workstation typecheck | CLEAN with joint W3+EXP2 tsconfig state | 08:55 MDT (stash-merge-revert verification pattern) |
| dispatch-cli typecheck | CLEAN | 08:57 MDT |
| dispatch-web typecheck | CLEAN | 08:57 MDT |
| Runtime smoke (WINDOW_READY) | DEFERRED (live mount wiring is Tier-1 follow-up) | EXPANSION-2 components are render-ready; live composition requires 4 follow-up wires |
| Cross-session staging respected | [KNOWN] | All 13 EXPANSION-2 commits used `git add <path>` + `git commit -o <path>` per CLAUDE.md §2.7; W3 sweep WIP preserved throughout |

---

## Commit log

13 commits across 7 WBs (e0b6aac → cc51032). Full table at `docs/coordination/mb-t-mvp-w1-expansion-2-impl-coord-2026-05-18.md` §1.

---

## Status

**Components: dogfood-renderable as React primitives. Live shell composition: pending 4 follow-up wires (all mechanical-translation envelope).**

EXPANSION-2 advances the operator vision §"Top chrome" + Component 1 design surface from "scaffold + IPC consumer + header placeholder" (W1 first cycle, 89905a9) to "full three-surface design-fidelity rendering" (this cycle). The remaining gap is live shell composition, not design fidelity.
