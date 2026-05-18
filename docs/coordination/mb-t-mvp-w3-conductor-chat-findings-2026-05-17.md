# MB-T-MVP-W3-CONDUCTOR-CHAT findings — 2026-05-17

Session: `r12-mvp-w3-conductor-chat` (gen-7-w3 lane) + cross-session integration with `operator-CC` lane.
Closure: WB-final at this commit. Cairn ladder closure per CLAUDE.md §4.1 + cross-session coordination per EXPANSION-1 manifest 2026-05-17 ~20:30 MDT.

## §I — Outcome classification (CLAUDE.md §2.11)

**Capability enabled with known limitations**.

Conductor-chat surface ships dogfood-renderable as a fresh `src/conductor-chat/` flat-directory module replacing the prior `chat-shell` tab-host (per operator §5.3 arbitration commit `94d3e17`). Path-B per gen-7 HALT-0 ARBITRATION ~19:50 MDT: renderer-only, production wiring deferred via 4 follow-up rows. Full surface mounts end-to-end via `tryAutoMountConductorChat()` with test-injected bridge stub; production bridge wiring lives behind `MB-F-CONDUCTOR-CHAT-PROD-WIRING-DEFERRED` (Tier 1).

## §II — What shipped

Cairn ladder closed (renumbered post-cross-session amendment EXPANSION-1):

| WB | SHA | Files | Tests |
|----|-----|-------|-------|
| WB1 GREEN | `d0a96bf` | `src/conductor-chat/conductor-chat.tsx` scaffold | probe-01 7/7 |
| WB2 RED+GREEN | `5184ceb` + `a0baa19` | `src/conductor-chat/conductor-message.tsx` 5-variant union | probe-02 7/7 |
| WB3 (gen-7) RED+GREEN | `dd0dad5` + `9357fd8` | `src/conductor-chat/build-md-chip.tsx` | probe-08 8/8 |
| WB4 (gen-7) RED+GREEN | `fe54756` + `fa5afbb` | `src/conductor-chat/mount.ts`, `index.ts` + conductor-chat slot composition | probe-05 8/8 |
| WB5 (gen-7) RED+GREEN | `f4b6642` + `bdc50a8` | `mount.ts` DEFAULT_IDLE_STATE | probe-06 7/7 (§5.5 HARD GATE) |
| WB6 (gen-7) GREEN | `28b5692` | `test/integration/probe-mbt-mvp-w3-07` integration acceptance | probe-07 8/8 |
| WB-final | this commit | findings + decisions + impl-coord + build doc + 4 followups | — |

Cross-session (operator-CC lane):
| WB | SHA | Files | Tests |
|----|-----|-------|-------|
| WB3 (operator-CC) RED+GREEN | `605fd7c` + `f46649d` | `src/conductor-chat/composer.tsx` | probe-03 8/8 |
| WB4 (operator-CC) RED+GREEN | `84e7c67` + `6c0686d` | `src/conductor-chat/header.tsx` | probe-04 7/7 |

**Combined test surface: 60/60 pass** (8 probe files × suites; 7 unit + 1 integration). [KNOWN — `pnpm --filter dispatch-workstation exec vitest run test/unit/conductor-chat/ test/integration/probe-mbt-mvp-w3-07-conductor-chat-integration.test.ts` at WB-final time]

## §III — What did NOT ship (deferred to followups)

Four follow-up rows filed at WB-final in FOLLOWUPS.md (operator-stamp envelope per CLAUDE.md §2.10):

1. **`MB-F-CONDUCTOR-CHAT-PROD-WIRING-DEFERRED`** (Tier 1) — production wiring of:
   - `src/main/workstation-shell.html` `<script src="../conductor-chat/renderer.js">` insert + dedicated `#conductor-chat-root` slot (currently `#chat-region #root` routes to `chat-shell/renderer.js` at shell.html:785)
   - `src/main/main.ts` sentinel-zone block registering `conductor-chat-ipc.ts` handlers at `app.whenReady` (mirrors `MB-T-MVP-W1` sentinel at main.ts:1152)
   - `packages/dispatch-workstation/tsconfig.json` `exclude` amendment adding `src/conductor-chat` (other renderer dirs all excluded; current state surfaces JSX-flag errors at workstation typecheck — see §V)
   - `packages/dispatch-workstation/scripts/build-conductor-chat.mjs` esbuild script (in TERRITORY but deferred since no production mount point exists yet)
   - Real `window.conductorChatBridge` implementation in `src/main/conductor-chat-ipc.ts` (registered handlers for send/attach/detach/dispatchNext/togglePause/cancel + state emission)

2. **`MB-F-W3-FINAL-CHAT-SHELL-SWEEP-COORDINATION-PENDING`** (Tier 1) — DEFERRED DELETION cleanup of `src/chat-shell/**` + re-homing of bottom-rail meters (`cost-meter`, `mix-indicator`, `plan-timer-text`, `plan-usage-ring`, `dispatch-mode-toggle`, `max-parallel-counter`, `bypass-perms-indicator`) into W1 EXPANSION-2 topbar territory. Coordinated with W1 EXPANSION-2 session sweep per operator §5.6 + §5.7 arbitration at commit `94d3e17`.

3. **`MB-F-W3-WB6-ATTACHED-STATE-SCREENSHOT-COVERAGE-PENDING`** (Tier 2) — attached-state oracle gap. All 6 design screenshots (`docs/design-handoff/conductor-v-mvp/project/screenshots/{check,check2,progress,progress2,progress3,progress4}.png`) show ONLY the idle ConductorChat state — no attached-state with `BuildMdChip` + filename pill + pause/resume/cancel chrome captured. WB6 hard-gate per Q-W3-2 = (a) covers idle only. Operator capture of attached-state screenshots required before fidelity oracle extends to attached state.

4. **`MB-F-W3-VISUAL-FIDELITY-CSS-INJECTOR-PENDING`** (Tier 3) — CSS pseudo-state + `@keyframes` gaps that cannot live in `React.CSSProperties`:
   - `Conductor V_MVP.html:580-583` `@keyframes typing 1.1s ease-in-out infinite` for the typing-dot bounce animation
   - `Conductor V_MVP.html:668` `.buildmd-chip-x:hover { color: var(--err) }` for the remove-button hover state
   - Closure paths: (a) `<style>` tag injection at mount.ts on first mount, (b) CSS-in-JS injector (emotion / @emotion/css), (c) authoring a shared `conductor-chat/styles.css` loaded by the build-conductor-chat.mjs bundle. Path (a) is the minimal-dep choice and matches the deferred-prod-wiring scope.

## §IV — Cross-session coordination outcomes

Per EXPANSION-1 amendment 2026-05-17 ~20:30 MDT, the gen-7-w3 and operator-CC sessions ran path-disjoint inside the same wave with a FROZEN testid contract surface at `docs/coordination/w3-testid-contract-2026-05-17.md` and an append-only cross-session log at `docs/coordination/w3-cross-session-2026-05-17.md`.

**Discipline outcomes** [KNOWN per session log inspection]:
- 13 cross-session log entries (gen-7-w3: 6; operator-CC: 7) — every cairn-grammar commit followed by `docs(coord)` log-append commit per directive.
- Zero territory violations across both sessions — per-path `git add` + `git commit -o` + pre-stage `git status --short` + `tail -1` race-detection observed at every commit.
- One stash-rebase-pop cycle (gen-7-w3 WB4 GREEN, pre-stage detected operator-CC pushed `header.tsx` + log append during the GREEN authoring) — clean rebase, no conflicts (path-disjoint territories worked as designed).
- Zero non-fast-forward push failures — per-commit pull-before-push discipline kept divergence bounded.

**Convergence point** [KNOWN per WB6 integration probe]: 60/60 cross-session suite green; operator-CC's `Composer` (`f46649d`) + `Header` (`6c0686d`) mount cleanly through gen-7-w3's `mount.ts` + `ConductorChat` slot composition without modification.

**One open cross-session integration gap** [KNOWN per probe-07 test #8]: operator-CC's `composer.tsx:48-53` renders a placeholder stub `<div>` for the build-md chip (testid `conductor-composer-buildmd-chip` present, no body). The real `BuildMdChip` body (gen-7-w3 `9357fd8`) is NOT yet composed inside operator-CC's composer. Probe-07 test #8 documents this current state (× button null); flip-to-pass assertion at the W3-final sweep when operator-CC swaps in `import { BuildMdChip } from './build-md-chip.js'`. Tracked as part of `MB-F-W3-FINAL-CHAT-SHELL-SWEEP-COORDINATION-PENDING`.

## §V — Verification surface (CLAUDE.md §4.4 + §4.6)

**Targeted test suite** [KNOWN]: 60/60 across W3 unit + integration (7 unit probes 52 tests + 1 integration probe 8 tests).

**5-package typecheck** [KNOWN]:
| Package | Result |
|---------|--------|
| dispatch-core | ✅ clean |
| dispatch-daemon | ✅ clean |
| dispatch-workstation | ❌ FAILS — `src/conductor-chat/{*.tsx,index.ts,mount.ts}` JSX-flag errors (tsconfig.json READ-ONLY for W3; pre-existing-style blocker per Phase-1 R4) |
| dispatch-cli | ✅ clean |
| dispatch-web | ✅ clean |

The workstation typecheck failure is **not a regression** — it is the predicted-and-deferred Phase-1 R4 outcome, captured at session-start ARBITRATION and rolled into the `MB-F-CONDUCTOR-CHAT-PROD-WIRING-DEFERRED` Tier-1 followup (closure path: one-line append to tsconfig.json `exclude` list adding `src/conductor-chat`, mirroring the existing pattern for tile-grid, chat-shell, orchestrator-focus-pane, coarchitect, frame-c). Operator territory amendment required (tsconfig.json is currently READ-ONLY for W3).

**Runtime-launch smoke (CLAUDE.md §4.6)**: SKIPPED. W3 did NOT touch `src/main/*.ts` — Path-B explicitly defers main.ts sentinel registration to the prod-wiring followup. No runtime gating relevant at WB-final.

## §VI — Token budget surface

Phase-1 diagnose ran 103,837 tokens vs 50,000 hard-cap stated in boot prompt = **2.08× overrun**, replicating the W1 1.86× pattern flagged in the boot prompt §D. Operator ACK'd the overrun at HALT-0 with "Phase-1 overrun 2.08x ACKNOWLEDGED ... pattern logged for §12.3 archive ledger per gen-7 SITREP-N." No mid-session HALT-CONTEXT-PRESSURE-PENDING required; session stayed within hand-off thresholds.

## §VII — Engineering adjustments inside Path-B envelope

Two test-harness-driven mount.ts adjustments shipped at WB4 GREEN:
- `flushSync` wrapping the initial `reactRoot.render` in `tryAutoMountConductorChat` so synchronous callers (probe-05 + WB6 screenshot oracle) observe the mounted DOM before the function returns. React 18 createRoot otherwise batches the first render and observers see an empty root until next tick. [KNOWN — required to make probe-05 #4 pass]
- `act()` wrapping in probe-05 around the bridge emit call so React 18 auto-batched `setState` flushes synchronously before the assertion. [KNOWN — required to make probe-05 #6 pass]

Both adjustments are conventional React 18 test-harness patterns and were called out in the commit body for operator visibility.

## §VIII — Probe-08 implicit-amendment note

`probe-mbt-mvp-w3-08-build-md-chip-rendering.spec.tsx` (WB3 gen-7 lane) was authored under the operator-coordination directive "WB3 = build-md-chip.tsx + probe-tbd" — the manifest TERRITORY enumerated probes 01-07; probe-08 falls outside that enumeration. Treated as implicit operator-amendment under the directive's "probe-tbd" grant. Surfaced explicitly in the WB3 RED commit body per CLAUDE.md §2.12 followups-over-absorption. Documented here for archive-cycle awareness per gen-7 §12.x corpus.

## §IX — Open questions surfaced to operator at HALT-1 (this commit)

1. **Workstation typecheck amendment**: should the one-line tsconfig.json `exclude` addition (`src/conductor-chat`) ship as part of operator-stamp envelope at this WB-final, OR be deferred to the `MB-F-CONDUCTOR-CHAT-PROD-WIRING-DEFERRED` follow-up ticket? Recommended: ship at WB-final under operator-stamp envelope (one-line mechanical translation per §3.4, mirrors all other renderer-dir excludes).

2. **Probe-07 test #8 (BuildMdChip × wiring)**: should this flip to expect-not-null + click + detach-roundtrip immediately (requires updating operator-CC's composer.tsx to import BuildMdChip — cross-session-territory write) OR stay documented-as-current until the W3-final sweep coordinates the composer-swap. Recommended: stay documented-as-current; flip at W3-final sweep with operator-CC coordination.

3. **§5.5 NORMATIVE HARD GATE final visual closure** per Q-W3-1 = (a) qualitative review: operator visual inspection of the rendered surface (e.g., manual screenshot of the mounted bundle in a browser) for full HARD GATE closure. The 7-assertion structural probe-06 satisfies the machine-checkable subset; pixel-level fidelity (anti-aliasing, color saturation, animation timing) is the operator-side residual.

## §X — Cross-references

- **Boot prompt**: `/tmp/r12-mvp-w3-conductor-chat-boot.md` (session-start ~19:50 MDT)
- **Shared bootstrap**: `/tmp/r12-cw2-shared-bootstrap.md`
- **Operator arbitration**: `94d3e17` (§5.3 NEW src/conductor-chat/ replacing chat-shell)
- **Cross-session amendment**: `9625e04` (frozen testid contract) + `f6eeb71` (EXPANSION-1 negative fence)
- **Design oracle**: `docs/design-handoff/conductor-v-mvp/project/{conductor-chat.jsx,app.jsx,Conductor V_MVP.html,screenshots/*.png}`
- **Frozen testid contract**: `docs/coordination/w3-testid-contract-2026-05-17.md`
- **Cross-session log**: `docs/coordination/w3-cross-session-2026-05-17.md`
- **Decisions doc**: `docs/coordination/mb-t-mvp-w3-conductor-chat-decisions-2026-05-17.md`
- **Impl-coord doc**: `docs/coordination/mb-t-mvp-w3-conductor-chat-impl-coord-2026-05-17.md`
- **Build doc**: `docs/build-docs/CONDUCTOR_MB-T-MVP-W3-CONDUCTOR-CHAT_BUILD.md`
