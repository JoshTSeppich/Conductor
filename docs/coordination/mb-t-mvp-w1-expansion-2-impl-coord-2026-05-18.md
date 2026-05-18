# MB-T-MVP-W1-EXPANSION-2 — Implementation coordination

**Date:** 2026-05-18
**Session:** r12-mvp-w1-orchestrator-focus-pane (EXPANSION-2 cycle)
**Audience:** Operator + gen-7 orchestrator + downstream sessions (W3 sweep coordination + future EXPANSION-3 cycle + W1.5 polish wave)

---

## §1 Commit log (this cycle)

| WB | Verb | SHA | Subject |
|----|------|-----|---------|
| WB1 RED | red | e0b6aac | probe-01 topbar scaffold |
| WB1 GREEN | green | 5c82bf6 | topbar.tsx scaffold + brand + env label |
| WB2 RED | red | 0ec48f5 | probe-02 topbar live counts |
| WB2 GREEN | green | 4e062c2 | topbar live counts + budget + queue-done gating |
| WB3 RED | red | 234ae7f | probe-03 ostrip scaffold + 3-segment progress bar |
| WB3 GREEN | green | 5f46c85 | orchestrator-strip.tsx scaffold + 3-segment progress bar + per-stat surfaces |
| WB4 RED | red | 5c3943f | probe-04 ostrip 64-slot grid + legend |
| WB4 GREEN | green | 08db311 | ostrip 64-slot SlotGrid + Legend |
| WB5 RED | red | 764f31b | probe-05 ostrip rate + ETA stats |
| WB5 GREEN | green | 71d0c98 | ostrip rate + ETA stats + failed-stat gating + computeThroughputAndEta pure-fn |
| WB6 RED | red | c8aae56 | probe-06 TmuxPaneBody styling (banner + line-class + cursor) |
| WB6 GREEN | green | 2bda686 | tmux-pane-body.tsx (banner + line-class + cursor) within src/orchestrator-focus-pane/ |
| WB7 GREEN | green | cc51032 | probe-07 screenshot-fidelity structural oracle (HARD GATE) |

13 commits total across 7 WBs. WB7 single-commit (composition probe over already-shipped surfaces, RED implicit if WB1-WB6 hadn't landed).

All commits pushed to origin/main per CLAUDE.md §2.6.

---

## §2 Forward-looking coordination notes

### §2.1 For W3 sweep session

Your in-flight WIP at the start of EXPANSION-2 (uncommitted):
- `D` packages/dispatch-workstation/scripts/build-chat-shell.mjs
- `D` packages/dispatch-workstation/src/chat-shell/{build-md-tab, chat-shell, commits-reader, commits-tab, mount, tab-switcher}
- `D` packages/dispatch-workstation/src/main/commits-ipc.ts
- `D` packages/dispatch-workstation/test/integration/chat-shell/** (3 files)
- `D` packages/dispatch-workstation/test/unit/chat-shell/** (10 files)
- `D` packages/dispatch-workstation/test/unit/commits-* (3 files)
- ` M` packages/dispatch-workstation/{tsconfig.json, package.json, src/main/main.ts, src/main/preload.mts, src/main/workstation-shell.html}
- ` M` docs/FOLLOWUPS.md

EXPANSION-2 cycle respected this WIP — none of it was staged or committed by my session.

**When you commit your sweep:** please also include `"src/topbar"` + `"src/orchestrator-strip"` in `tsconfig.json` exclude array (per Tier-1 followup `MB-F-MVP-W1-EXP2-TSCONFIG-EXCLUDE-W3-COORDINATION` filed at this WB-final). Joint-state typecheck CLEAN verified at 08:55 MDT 2026-05-18.

### §2.2 For EXPANSION-3 cycle (future mount-wiring follow-up)

To wire EXPANSION-2 surfaces into the live shell:

1. **Author `scripts/build-topbar.mjs`** — mirror `scripts/build-orchestrator-focus-pane.mjs`. Entry `src/topbar/mount.ts` → `dist/topbar/renderer.js`.
2. **Author `scripts/build-orchestrator-strip.mjs`** — same pattern. Entry `src/orchestrator-strip/mount.ts` → `dist/orchestrator-strip/renderer.js`.
3. **Author `src/topbar/mount.ts`** — mirror `src/orchestrator-focus-pane/mount.ts` DOMContentLoaded auto-mount pattern. Body-level overlay div + `createRoot` + `<Topbar />`.
4. **Author `src/orchestrator-strip/mount.ts`** — same pattern. Compose with `TmuxPaneBody` (showBanner=true) for the body region OR stay strip-only.
5. **Append `<script>` tags to workstation-shell.html** — mirror existing tile-grid + orchestrator-focus-pane patterns at lines 783-793.
6. **Append `node scripts/build-*.mjs` invocations to package.json `build` chain** — see Tier-1 followup `MB-F-MVP-W1-EXP2-BUILD-SCRIPT-CHAIN-WIRING-PENDING`.
7. **(Optional, depending on W3 sweep) add main.ts sentinel block** for any new IPC ready-sentinel emission under MB_TEST_HOOKS=1.

Once wired, `pnpm --filter dispatch-workstation build` produces shipping bundles + runtime smoke can verify "WINDOW_READY + topbar + orchestrator-strip + tmux-banner visible" within ~10s.

### §2.3 For W1.5 polish wave

Animation keyframes deferred per scope-arbitration §5.6:

- `@keyframes paneIn` + `@keyframes paneOut` (Conductor V_MVP.html:458-466) — pane mount/unmount cubic-bezier scale-in
- `@keyframes barShimmer` (HTML:265-268) — running-segment progress-bar gradient sweep
- `@keyframes slotPulse` (HTML:308-311) — slot-grid running cell opacity pulse
- `@keyframes blink` (HTML:453) — cursor steps blink
- `@keyframes pulse` (HTML:454) — starting-state status-dot pulse

All require a `<style>` block somewhere (component-scoped CSS module, OR shell.html `<style>`, OR runtime-injected stylesheet at mount). EXPANSION-2 components are render-ready for the addition (testids + className-equivalents present); only the CSS declarations are missing.

### §2.4 For future live-data IPC wiring (Tier-2 follow-up)

Topbar props that need IPC sourcing:
- `paneCount` ← `sessionListClient.snapshot().length` (existing HTTP-pull pattern at spawn-handler.ts:156)
- `runningCount` ← `snapshot().filter(s => s.status === 'running').length`
- `buildMdAttached` + `buildMdQueue` + `buildMdDone` ← `src/build-md/dispatch-loop.ts` state stream (currently broadcasts via build-md-dispatch-trigger-ipc.ts)
- `budgetUsedDollars` + `budgetTotalDollars` ← new IPC channel sourced from orchestrator-process metrics (parallel to first-cycle Tier-2 `MB-F-MVP-W1-HEADER-PID-CPU-BUDGET-WIRING`)
- `envLabel` ← config env / `process.env.NODE_ENV` / OS region detection

OrchestratorStrip props that need IPC sourcing:
- `sessions` ← `sessionListClient.snapshot()` mapped to `SlotSession` shape
- `done` / `runningCount` / `queuedCount` / `totalSteps` / `erroredCount` ← same snapshot + build-md state stream
- `ratePerMin` + `etaSeconds` ← caller-orchestrated history accumulation via `computeThroughputAndEta` over a `done`-snapshot tick (1Hz setInterval pushes `{t: Date.now(), done}` to a ref, then computes)
- `attached` + `attachedName` ← build-md attach state

TmuxPaneBody props that need IPC sourcing:
- `lines` ← orchestrator pty-stream broken into classified TmuxLine[] (currently `coarchitect:ptyChunk` emits raw strings; needs a classifier hop OR the orchestrator must emit pre-classified `{t, s}` lines)
- `cwd` ← orchestrator-process metadata channel
- `status` ← derived from orchestrator-session lifecycle observer
- `showBanner` ← true when build.md attached (mirrors design app.jsx `attached && ORCH_BANNER` semantic)

---

## §3 Probe inventory (cross-reference)

| Probe path | WB | Test count | Tests cover |
|------------|----|-----------:|-------------|
| `test/unit/topbar/probe-mbt-mvp-w1-exp2-01-topbar-scaffold.spec.tsx` | WB1 | 7 | Scaffold + brand chrome + env label + overlay positioning |
| `test/unit/topbar/probe-mbt-mvp-w1-exp2-02-topbar-counts.spec.tsx` | WB2 | 14 | Pane-count pluralization + running-count + queue-done gating + budget format + em-dash placeholders |
| `test/unit/orchestrator-strip/probe-mbt-mvp-w1-exp2-03-ostrip-scaffold.spec.tsx` | WB3 | 12 | Scaffold + 3-segment progress bar + per-stat em-dash defaults + denominator-fallback + divide-by-zero guard |
| `test/unit/orchestrator-strip/probe-mbt-mvp-w1-exp2-04-ostrip-slot-grid.spec.tsx` | WB4 | 13 | 64-default slot grid + status-coded slots + pulse span + click handler + 5-entry legend + truncation cap |
| `test/unit/orchestrator-strip/probe-mbt-mvp-w1-exp2-05-ostrip-rate-eta.spec.tsx` | WB5 | 15 | Pure-fn computeThroughputAndEta (7 cases) + render rate/eta/failed stat conditionals (8 cases) |
| `test/unit/orchestrator-focus-pane/probe-mbt-mvp-w1-exp2-06-tmux-body-styling.spec.tsx` | WB6 | 20 | TMUX_COLORS exports + ORCH_BANNER constant + TmuxPaneBody render (banner + line-class + cursor + done/error footers) |
| `test/unit/orchestrator-strip/probe-mbt-mvp-w1-exp2-07-screenshot-fidelity.spec.tsx` | WB7 | 19 | Composed-surface structural oracle (Topbar + OrchestratorStrip + TmuxPaneBody) idle + attached states + design-handoff constant fidelity |
| **Total NEW** | | **100** | |

---

## §4 Confidence labels summary

All factual claims in this doc carry [KNOWN] confidence from direct verification at 08:55-08:57 MDT 2026-05-18 unless otherwise marked. Confidence labels per CLAUDE.md §2.2:
- [KNOWN] verification claims = single-command tool invocation result
- [MODELED] no claims in this doc rely on modeling beyond direct test PASS / typecheck CLEAN output
- [SPECULATIVE] zero — no speculative claims surfaced

---

## §5 Operator-facing snapshot

EXPANSION-2 ships 3 NEW component surfaces (Topbar + OrchestratorStrip + TmuxPaneBody) + 100 NEW tests, all PASS. The components are render-ready as React primitives consuming caller-supplied props. Live shell composition requires 4 follow-up wires (tsconfig exclude / build scripts / shell.html script tags / mount entries) — all filed as Tier-1 followups, all auto-ack envelope per CLAUDE.md §3.4 mechanical-translation. Live data IPC wiring deferred to Tier-2. W1.5 keyframe polish deferred per scope-arbitration §5.6.

No frozen contracts touched. No existing source files modified. Pure additive cycle; territorial discipline (per-path commit -o) preserved W3 sweep WIP throughout.
