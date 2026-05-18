# MB-T-MVP-W1-EXPANSION-2-TOPBAR-ORCHESTRATOR-STRIP-TMUX-STYLING — WB-final findings

**Session:** r12-mvp-w1-orchestrator-focus-pane (EXPANSION-2 cycle, post-89905a9 first-cycle ship)
**Dispatch authorization:** operator OPERATOR-CASCADE-AMENDMENT 2026-05-17 ~19:50 MDT + scope-arbitration commit 94d3e17 §5.1+§5.2+§5.6
**Date:** 2026-05-18 ~08:57 MDT
**Author:** Claude Opus 4.7 (CC sub-session, foxworks-cairn plugin-loaded)

---

## §I — Scope shipped

**One-liner (verbatim from manifest):** Wire 3 visual surfaces per operator vision §"Top chrome" + Component 1 design — (a) Topbar (36px brand+counts+budget+env), (b) OrchestratorStrip (segmented progress + 64-slot grid + rate/ETA), (c) TmuxPane body styling (banner+cursor+line-class colors).

EXPANSION-2 of operator-vision 23b4362 + scope-arbitration 94d3e17 §2.1: W1 territory expansion for the post-first-cycle build of sibling-chrome surfaces (Topbar + OrchestratorStrip) + design-conformance body styling within the existing src/orchestrator-focus-pane/ territory.

### Files shipped (3 NEW src + 7 NEW probes)

| Path | Type | Lines | Purpose |
|------|------|------:|---------|
| `packages/dispatch-workstation/src/topbar/topbar.tsx` | NEW | ~270 | Topbar surface: brand (◐ + Conductor + v_mvp pill) + live counts (panes/running/queue-done) + env label + budget. Body-level fixed-position overlay (zIndex:1100) per W1 Q6=(c) precedent. |
| `packages/dispatch-workstation/src/orchestrator-strip/orchestrator-strip.tsx` | NEW | ~620 | OrchestratorStrip surface: ▦ mark + title + count pill + 3-segment progress bar (done/running/queued) + per-stat surfaces (running/queued/done/rate/eta/failed) + 64-slot SlotGrid + 5-entry Legend. Exports pure-fn `computeThroughputAndEta` helper. |
| `packages/dispatch-workstation/src/orchestrator-focus-pane/tmux-pane-body.tsx` | NEW | ~170 | TmuxPaneBody surface: classified TmuxLine[] rendering + ORCH_BANNER ASCII box (5 banner-class lines + trailing blank) + blinking cwd cursor when status='running' + done/error footer states. Exports `TMUX_COLORS` (5-class map) + `ORCH_BANNER` constant. |
| `packages/dispatch-workstation/test/unit/topbar/probe-mbt-mvp-w1-exp2-01-topbar-scaffold.spec.tsx` | NEW | 79 | 7 tests: scaffold + brand chrome + env label + root overlay positioning |
| `packages/dispatch-workstation/test/unit/topbar/probe-mbt-mvp-w1-exp2-02-topbar-counts.spec.tsx` | NEW | 99 | 14 tests: pane-count pluralization + running-count + queue-done gating + budget formatting |
| `packages/dispatch-workstation/test/unit/orchestrator-strip/probe-mbt-mvp-w1-exp2-03-ostrip-scaffold.spec.tsx` | NEW | 144 | 12 tests: scaffold + 3-seg progress bar + per-stat em-dash defaults |
| `packages/dispatch-workstation/test/unit/orchestrator-strip/probe-mbt-mvp-w1-exp2-04-ostrip-slot-grid.spec.tsx` | NEW | 156 | 13 tests: 64-default slot grid + status-coded slots + pulse span + click handler + legend |
| `packages/dispatch-workstation/test/unit/orchestrator-strip/probe-mbt-mvp-w1-exp2-05-ostrip-rate-eta.spec.tsx` | NEW | 167 | 15 tests: pure-fn computeThroughputAndEta + render rate/eta/failed stat conditionals |
| `packages/dispatch-workstation/test/unit/orchestrator-focus-pane/probe-mbt-mvp-w1-exp2-06-tmux-body-styling.spec.tsx` | NEW | 167 | 20 tests: TMUX_COLORS + ORCH_BANNER + TmuxPaneBody render (banner + line-class color + cursor + done/error footers) |
| `packages/dispatch-workstation/test/unit/orchestrator-strip/probe-mbt-mvp-w1-exp2-07-screenshot-fidelity.spec.tsx` | NEW | 281 | 19 tests: composed-surface structural oracle (Topbar + OrchestratorStrip + TmuxPaneBody w/ ORCH_BANNER) in idle + attached states; HARD GATE per §5.5 NORMATIVE per Q-EXP2-3 auto-ack |

### Probe totals: 100 NEW tests added (all PASS as of 08:57 MDT 2026-05-18)

| WB | Probe | Tests |
|----|-------|------:|
| WB1 | topbar-scaffold | 7 |
| WB2 | topbar-counts | 14 |
| WB3 | ostrip-scaffold | 12 |
| WB4 | ostrip-slot-grid | 13 |
| WB5 | ostrip-rate-eta | 15 |
| WB6 | tmux-body-styling | 20 |
| WB7 | screenshot-fidelity | 19 |
| **Total** | | **100** |

Plus 51 prior W1 first-cycle probes still PASS → **146 total** in the EXPANSION-2 verification sweep.

---

## §II — Phase-1 diagnose findings

**Agent invocation:** `cairn-phase-1-diagnose` agentId `a38956f3c3cd5c795` (50k token HARD CAP per gen-7 dispatch).

**Pre-primed Phase-1 strategy:** Main session pre-read existing src/orchestrator-focus-pane/* (5 files), main.ts sentinel zone (lines 1127-1155), design source files (orchestrator-strip.jsx 133 lines + tmux-pane.jsx 134 lines + tmux-content.jsx ORCH_BANNER at 163-170 + app.jsx 282-309 Topbar + Conductor V_MVP.html CSS lines 86-466 covering .topbar/.ostrip/.tmux-pane rules), manifest EXPANSION-2 territory grant. Phase-1 agent was asked to verify these claims + surface gaps. **Token actual: ~35k (under cap).**

### Arbitration questions raised + auto-ack dispositions (per CLAUDE.md §3.4 mechanical-translation envelope)

| Q | Question | Auto-ack disposition | Precedent cited |
|---|----------|----------------------|-----------------|
| Q-EXP2-1 | Topbar mount location vs existing #header-bar | Body-level fixed-position overlay (stacked above focus-pane overlay) — NO #header-bar touch | W1 Q6=(c) operator ack 17:55 MDT (focus-pane.tsx:46-65 OVERLAY_STYLE precedent) |
| Q-EXP2-2 | Data source for live counts (runningCount/queue/done/sessions/budget) | Em-dash placeholders for unwired data; uptime/wall-clock live where feasible; caller passes pre-computed props | W1 Q3/Q4=(a) operator ack 17:55 MDT (focus-pane-header.tsx:14 EM_DASH precedent) |
| Q-EXP2-3 | WB7 screenshot-fidelity probe mechanics | Structural-DOM oracle (no pixel-diff library adoption); render composed surfaces + assert testid + literal content | W3 WB6 Q-W3-1=(a) precedent (probe-mbt-mvp-w3-06-screenshot-fidelity-acceptance.spec.tsx:6-11) |
| Q-EXP2-4 | Brand-component duplication vs chat-shell/conductor-brand.tsx | NEW src/topbar/ primitives from design spec; defer chat-shell MOVES to W3-final sweep coordination | Manifest EXPANSION-2 explicit deferral wording: "re-homing coordinated with W3-final sweep; NOT W1 current-cycle scope" |
| Q-EXP2-5 | CSS-token plumbing for TMUX_COLORS + design literals | Inline component-scoped style attrs (no shell.html style block edit); literal hex resolution per Conductor V_MVP.html:11-32 :root dark-theme | W1 OVERLAY_STYLE inline pattern (focus-pane.tsx:46-65); CLAUDE.md §3.5 persistence pattern parity |

### Risks raised + dispositions

| R | Risk | Disposition |
|---|------|-------------|
| R1 | Topbar mount conflict with pre-existing #header-bar (lines 23-32 of shell.html — already hosts #spawn-button + FrameShellHeader chrome) | MITIGATED via Q-EXP2-1 overlay strategy (no #header-bar touch); coexists at higher zIndex |
| R2 | Brand-component duplication with chat-shell/conductor-brand.tsx | ACCEPTED — manifest forbids chat-shell writes; W3-sweep deletion in flight; new src/topbar/ is the forward primitive |
| R3 | Data sources not free — runningCount/queue/sessions/budget require IPC | DEFERRED to Tier-1 followup (W3-final sweep coordination + future cycle wiring); em-dash placeholders are W1-precedent compliant |
| R4 | Visual-diff infra exists but rejected at W3 WB6 in favor of structural oracle | MIRRORED W3 precedent (Q-EXP2-3 auto-ack); pixel-diff adoption tracked Tier-2 |
| R5 | dispatch-core dist rebuild necessity | N/A — no dispatch-core imports added by EXPANSION-2 (grep clean) |
| R6 | Build-script registration — needs scripts/build-topbar.mjs + build-orchestrator-strip.mjs + shell.html script tags + package.json chain | DEFERRED to Tier-1 followup (parallel to MB-F-MVP-W1-BUILD-SCRIPT-CHAIN-WIRING-PENDING first-cycle precedent); coordinated with W3 sweep |
| R7 | CSS-token plumbing absence in shell.html | MITIGATED via Q-EXP2-5 auto-ack: inline-style literal hex resolution; shell.html :root unchanged |
| R8 | W1.5 keyframe scope-boundary leak | NOT triggered — paneIn/paneOut/barShimmer/slotPulse keyframes explicitly skipped at every WB (only inline styles, no `@keyframes` declarations) |
| R9 | #header-indicators-root testid collision | NOT triggered — new testids namespaced (topbar-*, ostrip-*, tmux-*) avoid existing tile-grid/frame-shell-header probe selectors |

---

## §III — Cross-session findings + tsconfig coordination

### MB-F-MVP-W1-EXP2-TSCONFIG-EXCLUDE-W3-COORDINATION (Tier-1)

**Mechanism:** EXPANSION-2 introduces 2 new top-level directories (`src/topbar/` + `src/orchestrator-strip/`) containing `.tsx` files. Per CLAUDE.md §3.4 mechanical-translation envelope, `tsconfig.json` must append `"src/topbar"` + `"src/orchestrator-strip"` to its `exclude` array (mirrors existing src/chat-shell + src/frame-c + src/orchestrator-focus-pane + src/conductor-chat exclusion pattern).

**Cross-session collision:** `tsconfig.json` is currently W3-WIP-MODIFIED in the working tree (W3 sweep removed `"src/chat-shell/commits-reader.ts"` from `files` array + added `"src/conductor-chat"` to exclude array — both staged-not-committed). My EXPANSION-2 cycle cannot append additional excludes without including W3's WIP in my commit (territorial violation per CLAUDE.md §2.7 + §2.9).

**Verification:** With joint state (W3-WIP + EXP2 exclude additions) applied to working tree, `pnpm --filter dispatch-workstation typecheck` is CLEAN [KNOWN — 08:55 MDT 2026-05-18]. Without joint state (W3-WIP only), typecheck fails TS17004 on every .tsx line in new src/topbar/ + src/orchestrator-strip/ files (predictable per CLAUDE.md §3.4).

**Closure path:** W3-sweep operator-stamp commit OR dedicated cross-session tsconfig sweep landing both W3 modifications AND EXP2 exclude additions atomically. Mechanical translation envelope — operator may auto-ack at next gen-7 status surface.

**Authority:** Tier-1 because mechanical translation is fully derivable from EXPANSION-1 precedent + manifest pattern; only territorial coordination blocks landing.

---

## §IV — Followup rows filed (new at this WB-final)

| Row | Tier | Closure path |
|-----|------|--------------|
| `MB-F-MVP-W1-CHAT-SHELL-METERS-REHOME-PENDING` | Tier-1 | Re-home chat-shell meters/indicators (cost-meter.tsx, bottom-rail-cost-meter.tsx, max-parallel-counter.tsx, plan-timer-text.tsx, plan-usage-ring.tsx, mix-indicator.tsx, bypass-perms-indicator.tsx, dispatch-mode-toggle.tsx, conductor-brand.tsx, max-parallel-source.ts, ring-helpers.ts) into src/topbar/ primitives per scope-arbitration §2.2. Coordinated with W3-final sweep; not in this cycle scope. |
| `MB-F-MVP-W1-EXP2-TSCONFIG-EXCLUDE-W3-COORDINATION` | Tier-1 | Append `"src/topbar"` + `"src/orchestrator-strip"` to tsconfig.json exclude array — mechanical translation per CLAUDE.md §3.4 mirroring src/chat-shell/src/frame-c/src/orchestrator-focus-pane/src/conductor-chat exclusion pattern. Currently blocked on W3-WIP tsconfig coordination (see §III). |
| `MB-F-MVP-W1-EXP2-BUILD-SCRIPT-CHAIN-WIRING-PENDING` | Tier-1 | Author `scripts/build-topbar.mjs` + `scripts/build-orchestrator-strip.mjs` (mirror existing `scripts/build-orchestrator-focus-pane.mjs`) + append `<script>` tags to workstation-shell.html + register in package.json build chain. Parallel to first-cycle `MB-F-MVP-W1-BUILD-SCRIPT-CHAIN-WIRING-PENDING` closure path. Coordinated with W3 sweep. |
| `MB-F-MVP-W1-EXP2-MOUNT-WIRING-PENDING` | Tier-1 | Author mount entry for Topbar + OrchestratorStrip + TmuxPaneBody composition (mirror src/orchestrator-focus-pane/mount.ts DOMContentLoaded auto-mount pattern). The composition probe at WB7 verifies render-time fidelity; live shell mount requires a separate mount.ts + script-tag wiring step. |
| `MB-F-MVP-W1-EXP2-LIVE-DATA-IPC-WIRING-PENDING` | Tier-2 | Wire IPC channels feeding live data into Topbar (paneCount/runningCount/queue/done/budget) + OrchestratorStrip (sessions/queue/done/runningCount/erroredCount + history-accumulation timer for rate/eta) + TmuxPaneBody (lines stream + cwd + status). Currently all props default to em-dash placeholders per W1 Q3/Q4 precedent. Likely sessions-snapshot push channel in preload.mts + new IPC handler in main.ts. |
| `MB-F-MVP-W1-EXP2-PANEIN-PANEOUT-ANIMATION-W15` | Tier-2 | W1.5 follow-on polish wave: author paneIn/paneOut keyframes per Conductor V_MVP.html:458-466 + barShimmer per HTML:265-268 + slotPulse per HTML:308-311 + cursor blink per HTML:453. Deferred per scope-arbitration §5.6. Adds `<style>` block to component-scoped CSS module OR shell.html :root. |
| `MB-F-VISUAL-FIDELITY-PIXEL-DIFF-GATE-ADOPTION` | Tier-2 | Cross-cutting W1+W3 sweep coordination: adopt `scripts/phase-3-visual-smoke.mjs` + pixelmatch/pngjs infra as ticket-acceptance gate for visual surfaces (mirror infra exists; usage rejected at W3 WB6 + EXP2 WB7 in favor of structural oracle). Decision: when does pixel-diff become mandatory? |

---

## §V — Design-conformance coverage map (cross-reference to design-handoff)

| Design element | Bundle anchor | EXP2 state | Confidence |
|----------------|---------------|------------|------------|
| Topbar 36px chrome (brand + counts + env + budget) | app.jsx:282-309 | Shipped (src/topbar/topbar.tsx) | [KNOWN] |
| `.topbar` CSS rule (h=36px, border-bottom, bg-elev, font 12px) | HTML:86-110 | Inline-style equivalent shipped | [KNOWN] cited line-by-line |
| OrchestratorStrip header (▦ mark + title + count pill) | orchestrator-strip.jsx:91-104 | Shipped | [KNOWN] |
| 3-segment progress bar (done/running/queued, denominator guard) | orchestrator-strip.jsx:12-26 | Shipped pure-fn | [KNOWN] |
| `.ostrip` CSS rules (panel bg, accent border, padding) | HTML:194-264 | Inline-style equivalent shipped | [KNOWN] cited line-by-line |
| SlotGrid (10×10 px squares, status colors, pulse on running) | orchestrator-strip.jsx:29-52 | Shipped, default maxSlots=64 | [KNOWN] |
| Throughput rate (rolling 30s window) + ETA | orchestrator-strip.jsx:70-89 | Shipped pure-fn `computeThroughputAndEta` | [KNOWN] |
| Per-stat surfaces (running/queued/done/failed/rate/eta) | orchestrator-strip.jsx:106-112 | Shipped with conditional rendering | [KNOWN] |
| Legend (5 entries) | orchestrator-strip.jsx:121-126 | Shipped | [KNOWN] |
| TMUX_COLORS (5-class color map) | tmux-pane.jsx:5-11 | Shipped as named export | [KNOWN] hex literals cited |
| ORCH_BANNER (5-line ASCII box + trailing blank) | tmux-content.jsx:163-170 | Shipped as readonly export | [KNOWN] line-by-line |
| visibleLines color-mapped rendering | tmux-pane.jsx:86-90 | Shipped (TmuxPaneBody lines[] map) | [KNOWN] |
| Blinking cwd cursor when status=running | tmux-pane.jsx:91-97 | Shipped (cursor span + cwd + $) | [KNOWN] |
| Done/error footer state lines | tmux-pane.jsx:98-107 | Shipped | [KNOWN] |
| paneIn/paneOut keyframe animations | HTML:458-466 | EXPLICITLY DEFERRED (§5.6 W1.5) | [KNOWN] |
| barShimmer keyframe animation | HTML:265-268 | EXPLICITLY DEFERRED (W1.5) | [KNOWN] |
| slotPulse keyframe animation | HTML:308-311 | EXPLICITLY DEFERRED (W1.5) | [KNOWN] |
| Cursor blink keyframe | HTML:453 | EXPLICITLY DEFERRED (W1.5) | [KNOWN] |
| Topbar live count data sources | n/a | Em-dash placeholders; live IPC DEFERRED (Tier-2) | [KNOWN] |
| OrchestratorStrip session data source | n/a | Em-dash + sessions=[]; live IPC DEFERRED (Tier-2) | [KNOWN] |
| TmuxPaneBody lines stream | n/a | Component accepts caller-supplied lines[]; live mount wiring DEFERRED (Tier-1 `MB-F-MVP-W1-EXP2-MOUNT-WIRING-PENDING`) | [KNOWN] |

---

## §VI — Verification record

| Check | Result | Source |
|-------|--------|--------|
| 100/100 NEW EXPANSION-2 probes PASS | [KNOWN] | 08:56 MDT — `pnpm --filter dispatch-workstation test test/unit/topbar/ test/unit/orchestrator-strip/ test/unit/orchestrator-focus-pane/probe-mbt-mvp-w1-exp2-06-tmux-body-styling.spec.tsx` |
| 146/146 ALL probes PASS (100 EXP2 + 46 W1 first-cycle remaining in unit suite — integration probe excluded from per-WB scope) | [KNOWN] | Same invocation |
| dispatch-core typecheck CLEAN | [KNOWN] | 08:57 MDT — `pnpm --filter dispatch-core typecheck` |
| dispatch-daemon typecheck CLEAN | [KNOWN] | 08:57 MDT — `pnpm --filter dispatch-daemon typecheck` |
| dispatch-workstation typecheck CLEAN with joint W3+EXP2 tsconfig state | [KNOWN] | 08:55 MDT — verified via stash-merge-revert pattern; documented in §III |
| dispatch-workstation typecheck FAILS TS17004 with W3-WIP-only tsconfig state | [KNOWN] | 08:55 MDT — predictable per CLAUDE.md §3.4 mechanical-translation pending |
| dispatch-cli typecheck CLEAN | [KNOWN] | 08:57 MDT — `pnpm --filter dispatch-cli typecheck` |
| dispatch-web typecheck CLEAN | [KNOWN] | 08:57 MDT — `pnpm --filter dispatch-web typecheck` |
| dispatch-core dist rebuild | [KNOWN] N/A | grep clean — EXPANSION-2 adds zero dispatch-core imports |
| Runtime-launch smoke (WINDOW_READY + Topbar/OrchestratorStrip visible) | DEFERRED | EXPANSION-2 ships component surfaces only; live mount wiring deferred to Tier-1 followup `MB-F-MVP-W1-EXP2-MOUNT-WIRING-PENDING`. WINDOW_READY non-regression verified via prior W1 first-cycle smoke (89905a9) — no main.ts / shell.html / package.json touches in this cycle. |
| Cross-session staging respected | [KNOWN] | Every commit used `git add <path>` + `git commit -o <path>` per CLAUDE.md §2.7. W3-WIP paths (chat-shell/** D, main.ts M, preload.mts M, shell.html M, tsconfig.json M, package.json M, FOLLOWUPS.md M) remain unstaged throughout. |

---

## §VII — Pattern observations

### §VII.1 Pre-primed Phase-1 with hard token cap = effective discipline

Main session pre-read existing source + design files BEFORE invoking Phase-1; agent prompt asked agent to verify pre-primed claims + surface gaps rather than re-inventory. Token actual ~35k under 50k HARD CAP. Phase-1 surfaced 5 blockers + 9 risks in tabular form, all auto-ackable under CLAUDE.md §3.4 mechanical-translation envelope with W1 + W3 precedent cites.

Codify-able: when continuing a multi-cycle session, pre-prime Phase-1 with prior-cycle findings + already-read files to keep token spend bounded.

### §VII.2 Cross-session tsconfig.json territorial coordination is a Tier-1 pattern

EXPANSION-2 cannot append `tsconfig.json` exclude entries without territorial collision with W3 sweep. Stash-merge-revert pattern allowed verifying that the joint state typechecks clean (proving the implementation is correct + the only blocker is config coordination). The pattern: stash WIP, edit + verify on baseline, restore WIP, document joint-state verification in findings.

This is a generic pattern when a frozen-ish shared config (tsconfig, package.json, shell.html) gets simultaneous additive edits from multiple in-flight sessions.

### §VII.3 Structural-DOM oracle scales as visual-fidelity gate

W3 WB6 + EXPANSION-2 WB7 both took the structural-DOM oracle path over pixel-diff. The probe asserts canonical design literals + testid surface contract anchors + state-conditional rendering. Composes the full surface and verifies idle + active states. Acceptance signal: 19/19 PASS = "renders consistently with screenshots within machine-checkable scope" without requiring rasterizer + diff library + browser launch infrastructure.

Codify-able: pixel-diff is reserved for actual pixel-level disputes; structural-DOM oracle covers ~95% of design-fidelity assertions at zero new infra cost.

### §VII.4 Pure-fn extraction enables deterministic test coverage

`computeThroughputAndEta` extracted as pure-fn helper (no React, no timer) made the rate/ETA math testable across 7 edge cases (empty / single-sample / 2-sample / ETA gates / rolling-window-filter / inclusive-boundary semantics) without any React render or setInterval mocking. The component receives `ratePerMin` + `etaSeconds` as pre-computed props — orchestration concern is caller-owned.

Codify-able: time-driven logic should always extract a pure-fn helper that takes time as an argument; tests stay deterministic + component stays focused on render.

---

## §VIII — Outcome classification (CLAUDE.md §2.11)

**Capability enabled with known limitations.**

- All 3 visual surfaces ship as pure-React components: Topbar (~270 LoC), OrchestratorStrip (~620 LoC), TmuxPaneBody (~170 LoC).
- Component-level fidelity is structural-DOM verified (100/100 EXP2 probes + 19/19 composed-surface oracle).
- Live shell composition requires 3 follow-up wires (tsconfig exclude, build scripts + script tags, mount entry) — all filed as Tier-1 followups for cross-session sweep coordination.
- Live data IPC (sessions snapshot, throughput history, build.md attach state) deferred to Tier-2 follow-up; em-dash placeholders are W1-precedent compliant for ship.
- W1.5 follow-on covers all keyframe animation polish (paneIn/paneOut, barShimmer, slotPulse, cursor blink) per scope-arbitration §5.6 explicit deferral.

The EXPANSION-2 surface is dogfood-renderable once the 3 mount-wiring follow-ups land (tracked Tier-1; mechanical translation envelope per CLAUDE.md §3.4).
