# MB-T-MVP-W1-EXPANSION-2 — Decisions

**Date:** 2026-05-18
**Session:** r12-mvp-w1-orchestrator-focus-pane (EXPANSION-2 cycle)
**Authority:** Auto-acked per CLAUDE.md §3.4 mechanical-translation envelope against W1 + W3 precedent. None of these decisions touch frozen contracts (REGISTRY.md, CONDUCTOR_API_CONTRACT.md, dispatch-core schema, WORKSTATION_CONTRACT.md §6).

---

## §1 Locked decisions (auto-ack)

| ID | Subject | Decision | Precedent |
|----|---------|----------|-----------|
| Q-EXP2-1 | Topbar mount location vs existing `#header-bar` | Body-level fixed-position overlay (top:0/left:0/right:0/height:36/zIndex:1100). NO `#header-bar` touch. Coexists at higher zIndex. | W1 first-cycle Q6=(c) operator ack 17:55 MDT 2026-05-17 — overlay strategy for orchestrator-focus-pane (focus-pane.tsx:46-65 OVERLAY_STYLE) |
| Q-EXP2-2 | Data source for live counts | Em-dash placeholders for unwired data; caller passes pre-computed props (paneCount, runningCount, queue, done, budget, sessions, ratePerMin, etaSeconds, erroredCount). | W1 first-cycle Q3/Q4=(a) operator ack 17:55 MDT — pid/cpu/budget/running/done em-dash precedent (focus-pane-header.tsx:14 EM_DASH) |
| Q-EXP2-3 | WB7 screenshot-fidelity mechanics | Structural-DOM oracle (composed-surface render + canonical-literal + testid contract assertions). NO pixel-diff library adoption. | W3 WB6 Q-W3-1=(a) precedent (probe-mbt-mvp-w3-06-screenshot-fidelity-acceptance.spec.tsx:6-11) |
| Q-EXP2-4 | Brand component duplication vs `src/chat-shell/conductor-brand.tsx` | NEW src/topbar/ primitives from design spec; defer chat-shell file MOVES to W3-final sweep coordination. | Manifest EXPANSION-2 explicit deferral: "re-homing coordinated with W3-final sweep; NOT W1 current-cycle scope" |
| Q-EXP2-5 | CSS-token plumbing for TMUX_COLORS + design literals | Inline component-scoped React.CSSProperties; literal hex resolved from Conductor V_MVP.html:11-32 `:root` dark-theme defaults. NO shell.html `<style>` block edit. | W1 OVERLAY_STYLE inline pattern (focus-pane.tsx); CLAUDE.md §3.5 persistence-pattern parity |

---

## §2 Risk dispositions

| R | Risk | Disposition |
|---|------|-------------|
| R1 | Topbar mount conflict with #header-bar (already hosts #spawn-button + FrameShellHeader tab strip A/C + MixIndicator + PlanRing) | MITIGATED via Q-EXP2-1 overlay strategy |
| R2 | Brand-component duplication with chat-shell/conductor-brand.tsx | ACCEPTED — chat-shell/** WRITE forbidden; W3-sweep deletion in flight; src/topbar/ is the forward primitive |
| R3 | Data sources require IPC | DEFERRED Tier-2 followup `MB-F-MVP-W1-EXP2-LIVE-DATA-IPC-WIRING-PENDING` |
| R4 | Pixel-diff infra rejected at W3 WB6 | MIRRORED via Q-EXP2-3; Tier-2 followup `MB-F-VISUAL-FIDELITY-PIXEL-DIFF-GATE-ADOPTION` |
| R5 | dispatch-core dist rebuild | N/A — grep confirms zero dispatch-core imports |
| R6 | Build-script registration | DEFERRED Tier-1 followup `MB-F-MVP-W1-EXP2-BUILD-SCRIPT-CHAIN-WIRING-PENDING` |
| R7 | CSS-token plumbing absence | MITIGATED via Q-EXP2-5 inline-style |
| R8 | W1.5 keyframe scope-boundary leak | NOT triggered — zero `@keyframes` declarations in EXP2 code |
| R9 | testid namespace collision | NOT triggered — topbar-*, ostrip-*, tmux-* namespaces all fresh |

---

## §3 Scope discipline

This decisions doc binds the EXPANSION-2 ladder ONLY. Frozen contracts untouched:
- REGISTRY.md §2 — not edited
- CONDUCTOR_API_CONTRACT.md — not edited
- dispatch-core/src/v3/schema.ts §1-§13 — not edited
- WORKSTATION_CONTRACT.md §6 — not edited

Pure additive cycle: 3 NEW components (src/topbar/topbar.tsx + src/orchestrator-strip/orchestrator-strip.tsx + src/orchestrator-focus-pane/tmux-pane-body.tsx) + 7 NEW probes (100 tests). Zero edits to existing source files (focus-pane.tsx, focus-pane-header.tsx, focus-pane-ipc.ts, mount.ts, index.ts, main.ts, preload.mts, workstation-shell.html, tsconfig.json, package.json). All shell-integration concerns deferred to Tier-1 followups for cross-session sweep coordination.

---

## §4 Cross-session coordination state

W3 sweep is in flight (uncommitted WIP touching tsconfig.json + main.ts + preload.mts + workstation-shell.html + package.json + FOLLOWUPS.md + chat-shell/** deletions). EXPANSION-2 cycle respected per-path `git add` + `git commit -o` discipline throughout — no W3 WIP included in any EXP2 commit (10 EXP2 commits across WB1-WB7, all per-path scoped).

Joint-state typecheck verification documented in findings §III + §VI: with both W3 WIP and EXP2 exclude additions applied to working tree, `pnpm --filter dispatch-workstation typecheck` is CLEAN. Independent landing blocked solely on the shared tsconfig.json file collision.
