# MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS Findings — 2026-05-12

**Ticket:** MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS — bottom-rail Conductor controls (brand + tabs + mode toggle + indicators + meters)
**Body anchor:** `f8fc24d docs(MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS): ticket body authored under §3.4 mechanical translation (full-build-mode dispatch §3.2; Phase 1 second batch)`
**Executing session:** `commit-plan-doc-1334` (T4 sub-session; Phase 1 second batch under gen-4 orchestrator dispatch 2026-05-12)
**Orchestrator:** gen-4 (full-build-mode dispatch §3.2 + Round 9 of cairn-under-stress)
**WB ladder:** 14 WBs total (12 cairn + WB13 smoke + WB14 docs)
**Pre-arbitrated envelope (operator 2026-05-12 chat-ack "accept all defaults and commit"):**
- Sub-Q-T4-A = (α) Extend chat-shell-header-bar (no DOM region addition)
- Sub-Q-T4-B = (iii) Defer BUILD.md content; ship tab shell with placeholder; T5 owns content
- Sub-Q-T4-C = (i) Reuse MB-T26 onCostUpdate (WB7 RED investigation gated)
- Sub-Q-T4-D = (i) Reuse MB-T34 onRateLimitUpdate (WB9 RED investigation gated)
- Sub-Q-T4-E = (i) Renderer-internal sessions stream + const M=16
- Sub-Q-T4-F = (i) Derive bypass-perms from dispatchMode='auto'
- Sub-Q-T4-G = (α) Reuse Auto/Ask toggle as-is; defer restyle to T7

**Cairn ladder (12 cairn + 1 smoke + 1 docs commit):**

| WB | Commit | Type | Surface |
|---|---|---|---|
| WB1 | `bbf4a86` | red | probe-mbtwt4-01 Conductor brand presence + placement (3 conditions) |
| WB2 | `57dc77a` | green | ConductorBrand component + chat-shell-header-bar leftmost slot + probe-05 consumer non-regression update |
| WB3 | `f9a468c` | red | probe-mbtwt4-02 MaxParallelCounter component + chat-shell slot (5 conditions) |
| WB4 | `b9e8d4b` | green | MaxParallelCounter component + chat-shell renderMaxParallelCounter slot prop |
| WB5 | `3fb0ec1` | red | probe-mbtwt4-03 BuildMdTab placeholder body (4 conditions; Sub-Q-T4-B=iii defer-with-placeholder) |
| WB6 | `8113c0b` | green | BuildMdTab placeholder body component |
| WB7 | `2c71793` | red | probe-mbtwt4-04 BottomRailCostMeter + Sub-Q-T4-C=i aggregation investigation (4 conditions) |
| WB8 | `edb0fba` | green | BottomRailCostMeter component (wireframe text format; reuses onCostUpdate) |
| WB9 | `36801e4` | red | probe-mbtwt4-05 PlanTimerText + Sub-Q-T4-D=i RateLimitState investigation (5 conditions) |
| WB10 | `4dc4f32` | green | PlanTimerText component (countdown derived from requests.reset) |
| WB11 | `c1f0907` | red | probe-mbtwt4-06 BypassPermsIndicator visibility (4 conditions; Sub-Q-T4-F=i) |
| WB12 | `26ff2c2` | green | BypassPermsIndicator component + final layout consolidation (renderBypassPerms + renderPlanTimerText slot props) |
| WB13 | `7abb649` | green | mount.ts production wiring (BUILD.md tab + BottomRailCostMeter swap) + runtime-launch smoke evidence |
| WB14 | (this commit) | docs | findings doc + audit §3/§10 reclassification |

---

## I — What Shipped

`[KNOWN]` Per direct read + probe evidence:

**NEW components in `src/chat-shell/` (6 files):**
- `conductor-brand.tsx` — `ConductorBrand` always-rendered brand label `<span data-testid="bottom-rail-brand">Conductor</span>`. Imported + auto-rendered by ChatShell.
- `max-parallel-counter.tsx` — `MaxParallelCounter({ sessions, maxParallel })` pure prop-driven; renders `<span data-testid="max-parallel-counter">max-parallel · N/M</span>`. N = filter `status==='open'`. Production-wiring deferred (slot prop exists but mount.ts wiring TBD via Tier 2 follower).
- `build-md-tab.tsx` — `BuildMdTab` placeholder body cross-referencing T5 `c92f750`. Wired into mount.ts tabs array as third tab.
- `bottom-rail-cost-meter.tsx` — `BottomRailCostMeter({ bridge })` wireframe-formatted ("conductor api · $X.XX today"); reuses MB-T26 `coarchitectBridge.onCostUpdate`. Swapped into production via mount.ts `resolveRenderCostMeter`.
- `plan-timer-text.tsx` — `PlanTimerText({ state, nowMs })` pure prop-driven; derives countdown "Max plan resets in Xh Ym" from `state.requests?.reset` (fallback `state.tokens?.reset`). Production-wiring deferred.
- `bypass-perms-indicator.tsx` — `BypassPermsIndicator({ dispatchMode })` conditional render; visible when `dispatchMode==='auto'`; renders red-triangle warning. Production-wiring deferred.

**MOD `src/chat-shell/chat-shell.tsx` (4 NEW sentinel zones; additive per CLAUDE.md §3.3):**
- `=== BEGIN: MB-T-WIREFRAME-T4 conductor-brand leftmost slot ===` — `<ConductorBrand />` rendered as new leftmost child of `chat-shell-header-bar`.
- `=== BEGIN: MB-T-WIREFRAME-T4 max-parallel-counter slot prop ===` — `renderMaxParallelCounter?: () => ReactNode` prop interface.
- `=== BEGIN: MB-T-WIREFRAME-T4 max-parallel-counter slot ===` — slot rendering inside header-bar after MB-T24 Auto/Ask.
- `=== BEGIN: MB-T-WIREFRAME-T4 WB12 bypass-perms + plan-timer slot props ===` + `=== BEGIN: ... bypass-perms slot ===` + `=== BEGIN: ... plan-timer-text slot ===` — three more sentinel zones for the remaining bottom-rail elements.

**MOD `src/chat-shell/mount.ts` (3 NEW sentinel-zoned changes):**
- NEW import zone `=== BEGIN: MB-T-WIREFRAME-T4 bottom-rail imports ===` — BuildMdTab + BottomRailCostMeter.
- NEW TabConfig zone `=== BEGIN: MB-T-WIREFRAME-T4 WB13 BUILD.md TabConfig ===` — third tab added to resolveTabs() bridge path.
- MOD `resolveRenderCostMeter()` — wireframe-formatted cost-meter swap (`if (false) void CostMeter` preserves MB-T26 import path without dead-code elimination).

**MOD `test/unit/chat-shell/probe-05-header-bar-slot.spec.tsx` (1 line modified):**
- WB2 consumer non-regression update: "renders empty header-bar when renderCostMeter is undefined" test updated from `header.children.length === 0` absolute assertion → `queryByTestId('probe-05-cost-meter-marker') === null` slot-specific semantic (header-bar no longer absolutely-empty post-ConductorBrand-unconditional-child).

**Probes (6 new T4 probes; 6 test files; 25 it-blocks total):**
- `probe-mbtwt4-01-conductor-brand.spec.tsx` (3 it-blocks)
- `probe-mbtwt4-02-max-parallel-counter.spec.tsx` (5 it-blocks)
- `probe-mbtwt4-03-build-md-tab-shell.spec.tsx` (4 it-blocks)
- `probe-mbtwt4-04-cost-meter-aggregation.spec.tsx` (4 it-blocks)
- `probe-mbtwt4-05-plan-timer-text.spec.tsx` (5 it-blocks)
- `probe-mbtwt4-06-bypass-perms-indicator.spec.tsx` (4 it-blocks)

---

## II — Q-disposition (sub-arbitrations)

All 7 sub-arbitrations resolved at default per operator chat-ack 2026-05-12 ("accept all defaults and commit" against HALT-TICKET-BODY-PRE-COMMIT). No mid-ticket Sub-Q escalation.

| Sub-Q | Disposition | Commit citation |
|---|---|---|
| Sub-Q-T4-A | (α) Extend chat-shell-header-bar | WB2 `57dc77a` |
| Sub-Q-T4-B | (iii) Defer with placeholder | WB6 `8113c0b` + WB13 `7abb649` (tab wiring) |
| Sub-Q-T4-C | (i) Reuse onCostUpdate | WB8 `edb0fba` + WB13 `7abb649` (production swap) |
| Sub-Q-T4-D | (i) Reuse onRateLimitUpdate | WB10 `4dc4f32` |
| Sub-Q-T4-E | (i) Renderer-internal | WB4 `b9e8d4b` |
| Sub-Q-T4-F | (i) Derive from dispatchMode | WB12 `26ff2c2` |
| Sub-Q-T4-G | (α) Defer restyle to T7 | implicit (no T4 modification to MB-T24 component) |

---

## III — Architectural deltas

`[KNOWN]` direct-read summary:

1. **NEW bottom-rail surface composition** in chat-shell-header-bar — 6 new slot-based elements (Conductor brand + max-parallel + cost-meter-wireframe + plan-timer + bypass-perms) joining existing MB-T24/25/26/27 chrome. Slot ordering per wireframe target 2026-05-11 left-to-right: brand → Auto/Ask → bypass-perms → max-parallel → plan-usage → cost-meter → plan-timer → model-mix.
2. **ZERO frozen-surface modifications** — all defaults route around new IPC channels. WORKSTATION_CONTRACT.md §6.6 untouched by this ticket (consolidated Wave B amendment at `0f0e762` covered the renderer↔main IPC surface).
3. **TWO investigation findings surfaced via direct-read** (per ticket body §3.3/§3.4 gate-with-investigation pattern):
   - **WB7 [KNOWN]**: `coarchitect-ipc.ts:89` `ipcMain.handle('coarchitect:getDailyCost', () => 0)` is a STUB returning hardcoded 0; no `captureUsageToLedger` implementation. BottomRailCostMeter renders "$0.00 today" at runtime until aggregation backend ships. Tier 3 followup recommended (§IX).
   - **WB9 [KNOWN]**: `ring-helpers.ts:26-43` `RateLimitState` shape has 4 dimensions (requests, tokens, inputTokens, outputTokens) each nullable with `reset: string | number`. NO unified `unified_rate_limit_window_resets_at` field. PlanTimerText uses `requests.reset` as primary source (closest plan-window signal); tokens.reset as fallback. Tier 3 followup for dimension-selection refinement recommended (§IX).
4. **Production-wiring partial-coverage** — WB13 wired BUILD.md tab + BottomRailCostMeter into mount.ts production path. Auto-wire deferred for MaxParallelCounter (sessions-stream subscription) + BypassPermsIndicator (dispatchMode poll) + PlanTimerText (rate-limit subscription). Slot props exist (chat-shell.tsx WB12 sentinel zones); component contracts shipped; mount.ts integration filed as Tier 2 follower (§IX).
5. **Slot-prop pattern preserved** — all new chrome elements follow existing MB-T24/25/26/27 slot-prop convention (renderXxx?: () => ReactNode). Caller (mount.ts at production runtime) supplies; tests inject directly. Consistent architectural surface.
6. **Cross-session linter-edits absorbed** — probe-05 consumer non-regression update applied at WB2 (1-line semantic change to MB-T26 WB3 test; original assertion intent preserved, post-T4 implementation reality reflected).

---

## IV — Probe distribution

| Probe file | Conditions | it-blocks | Behavior covered |
|---|---|---|---|
| probe-mbtwt4-01 | 3 | 3 | bottom-rail-brand presence + text="Conductor" + descendant-of-chat-shell-header-bar |
| probe-mbtwt4-02 | 5 | 5 | MaxParallelCounter export + 0/N/M render + status-filter + slot integration |
| probe-mbtwt4-03 | 4 | 4 | BuildMdTab export + placeholder testid + T5 cross-ref text + TabConfig.render integration with fireEvent.click tab-switch |
| probe-mbtwt4-04 | 4 | 4 | BottomRailCostMeter export + em-dash placeholder + 2-decimal format + truncation |
| probe-mbtwt4-05 | 5 | 5 | PlanTimerText export + null-state placeholder + countdown derivation + sub-minute truncation + all-dimensions-null placeholder |
| probe-mbtwt4-06 | 4 | 4 | BypassPermsIndicator export + auto-mode visible + text="bypass perms" + ask-mode absent |

**[KNOWN]** All 25 T4 it-blocks GREEN at WB14 author time. Full chat-shell suite 72/72 GREEN (13 test files; T4 probes + existing MB-T20/22/24/25/26/27 probes including the consumer-updated probe-05).

**Consumer non-regression** per CLAUDE.md memory `feedback_consumer_non_regression_per_wb`: each WB GREEN ran full chat-shell suite post-commit; probe-05 consumer-impact caught at WB2 + fixed in same commit; no other regressions surfaced through WB12.

**Runtime-launch smoke** per CLAUDE.md §4.6: WB13 `pnpm --filter dispatch-workstation build` SUCCESS (BUILD_COMPLETE; dist/chat-shell/renderer.js 1.1mb); `perl -e 'alarm 12; exec @ARGV' -- electron dist/main/main.js` emitted `WINDOW_STATE 1024 768` + `WINDOW_READY` sentinel. Bundle inclusion verified via `grep -o testid dist/chat-shell/renderer.js` fingerprint check: bottom-rail-brand 1 + max-parallel-counter 1 + build-md-tab-placeholder 1 + bottom-rail-cost-meter 2 + plan-timer-text 0 + bypass-perms-indicator 0 (last two = production-wiring gap; component-only exports not pulled by mount.ts).

---

## V — Architecture notes

1. **Bottom-rail-as-extension-of-chat-shell-header-bar** (Sub-Q-T4-A=α) — operator-acked architectural choice that the existing `chat-shell-header-bar` element (per `chat-shell.tsx:171` MB-T26 WB3 origin) IS the wireframe's bottom rail. No new DOM region; no new renderer surface. Additive sentinel-zone slot integration only. Minimizes architectural surface area.
2. **Pure prop-driven components** (all 6 new T4 components) — no internal subscription/bridge access. Callers (mount.ts at production; tests in isolation) supply data via props. Mirrors MB-T26 cost-meter.tsx + plan-usage-ring.tsx pattern (component-level isolation; subscription concern lifted to mount.ts).
3. **Tier 3 investigation-gated escalation discipline** — Sub-Q-T4-C and Sub-Q-T4-D defaults reuse existing bridge channels; RED-probe authoring includes mandatory direct-read investigation. WB7 + WB9 commit bodies document the investigation findings with [KNOWN] labels; no escalation needed (Sub-Q defaults remain valid despite backend gaps). Backend gaps filed as Tier 3 followups (§IX).
4. **mount.ts production-wiring SCOPE-SPLIT** — WB13 wired the simpler paths (BUILD.md TabConfig append; BottomRailCostMeter swap). Auto-wire-with-subscription paths (MaxParallel, BypassPerms, PlanTimer) deferred per Tier 2 follower for ship-velocity. Slot prop infrastructure shipped; production runtime integration is the follow-on.

---

## VI — Documentation drift

1. **Filesystem-convention discrepancy** [KNOWN, observed at HALT-TICKET-BODY-PRE-COMMIT]: dispatch specified `docs/build-docs/tickets/MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS.md`; actual convention is `docs/build-docs/CONDUCTOR_<NAME>_BUILD.md`. Existing convention honored per operator chat-ack "accept all defaults". Not filed as a methodology-incident followup; operator may adopt `tickets/` subdir convention going forward at their discretion.
2. **BUILD-md-spec.md absent** — dispatch references "BUILD-md-spec.md schema" but `find` returned no matches. T1 ticket body used as format precedent (sections + structure aligned). Not a blocker; ticket schema is de-facto specified by the T1/T2/T3/T4 corpus.

---

## VII — Consumer non-regression

1. **MB-T26 WB3 probe-05 header-bar test** — consumer-updated at WB2 (1-line assertion semantic change from absolute-emptiness → slot-specific-emptiness). Original test intent preserved; post-T4 ConductorBrand-unconditional-child reflected. No silent contract break.
2. **MB-T22 multi-tab API** — extended additively via mount.ts resolveTabs() bridge path; existing Chat + Commits TabConfigs unchanged; BUILD.md TabConfig appended as third entry. No regression in MB-T22 probes.
3. **MB-T24/25/26/27 chrome slots** — all four existing chrome slot props (renderDispatchModeToggle, renderPlanUsageRing, renderCostMeter, renderModelMix) preserved verbatim. T4 adds 3 NEW slot props (renderMaxParallelCounter, renderBypassPerms, renderPlanTimerText) without modifying existing.
4. **MB-T26 CostMeter component** — unmodified. mount.ts production path swaps to BottomRailCostMeter (wireframe-formatted variant) but CostMeter import preserved via `if (false) void CostMeter` no-op guard; consumers that explicitly supply renderCostMeter slot prop still get the user-supplied component.
5. **Workstation typecheck** CLEAN at every WB GREEN landing (12/12 cairn + 1 smoke + this WB14 = 14 commits with clean tsc).

---

## VIII — WB Skip Rationale

No WBs skipped. Full 14-WB ladder shipped IN-ORDER (WB1 → WB2 → ... → WB14). WB13 scope expanded mid-WB to include mount.ts production wiring (BUILD.md tab + BottomRailCostMeter swap) — the slot-prop infrastructure shipped at WB12 was meaningless at runtime without mount.ts integration; ship-velocity discipline drove the scope expansion rather than deferring to a follow-on ticket.

---

## IX — New Followups Filed

Tier 3 followups recommended for orchestrator-mediated FOLLOWUPS.md filing post-this-commit (filing target is T2-successor territory per parallel-cairn dispatch):

| Followup | Tier | Rationale | Discoverability |
|---|---|---|---|
| `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` | 2 | mount.ts auto-wire deferred for MaxParallelCounter (sessions stream) + BypassPermsIndicator (dispatchMode poll) + PlanTimerText (rate-limit subscription). Slot props exist (chat-shell.tsx WB12 zones); components shipped (3 of 6 unconditionally bundled today); production runtime integration is the follow-on. Closure path: NEW AutoWire wrappers in mount.ts (or sibling helper file) subscribing to respective bridges + supplying slot fns. | WB13 commit `7abb649` body + this findings doc §V + §III |
| `MB-F-COST-METER-AGGREGATION-BACKEND-STUBBED` | 3 | `coarchitect-ipc.ts:89` `getDailyCost` returns hardcoded 0; no `captureUsageToLedger` implementation. cost-meter ($0.00 today) is a stub at runtime. Closure: implement per-API-call usage capture in anthropic-api-client.ts + aggregation + broadcast in coarchitect-ipc.ts. Sibling territory (not T4 scope). | WB7 commit `2c71793` body + this findings doc §III |
| `MB-F-PLAN-TIMER-RESET-DIMENSION-SELECTION` | 3 | PlanTimerText uses `state.requests?.reset` as primary plan-window signal (closest match per Anthropic API rate-limit-header semantics); operator may prefer `state.tokens?.reset` OR a dedicated plan-window field if available. Tier 3 refinement deferral. | WB10 commit `4dc4f32` body + this findings doc §III |
| `MB-F-MAX-PARALLEL-CONFIG-SOURCE` | 3 | M (max-parallel limit) is renderer-internal const 16 today. Operator-arbitrated config-source (env var, persisted setting, daemon config, build-doc field) deferred. | WB4 commit `b9e8d4b` body + this findings doc §III |

**Cross-referenced existing followups (NOT closed by this ticket):**
- `MB-F-WIREFRAME-VISUAL-VERIFICATION-GAP` (Tier 1 at `64d9249`) — WB13 smoke covers boot + bundle inclusion; precise visual verification operator-empirical pending.
- `MB-F-WIREFRAME-PARITY-SCOPE-UNDERESTIMATED` (Tier 1 at `c2abb28`) — T4 advances Dim 3 chrome parity; visual-completeness gap iterative.
- `MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-GAP-2026-05-11` (Tier 2 at `6217ea0`) — sibling row; not closed by T4.
- `MB-F-CROSS-SESSION-STAGING-AREA-COMMIT-CONTAMINATION` (Tier 1) — discipline tested live at WB-§ticket-body-commit time (T5's file was staged in index concurrently); pathspec-commit `git commit -- <path>` defended cleanly. Round 9 evidence reinforcement, not new finding.

---

## X — Open Items / WB13 Smoke Evidence + Operator-Empirical Pending

### Smoke evidence

```
$ pnpm --filter dispatch-workstation build
→ BUILD_COMPLETE (3 renderer bundles)
$ grep -o <testid> dist/chat-shell/renderer.js | wc -l
  bottom-rail-brand: 1
  max-parallel-counter: 1
  build-md-tab-placeholder: 1
  bottom-rail-cost-meter: 2
  plan-timer-text: 0       ← Tier 2 deferred
  bypass-perms-indicator: 0 ← Tier 2 deferred
$ perl -e 'alarm 12; exec @ARGV' -- electron dist/main/main.js
WINDOW_STATE 1024 768
WINDOW_READY
```

- **Electron boot:** PASS — process spawn + BrowserWindow + workstation-shell.html load + did-finish-load + WINDOW_READY sentinel.
- **Bundle inclusion:** PASS for 4 of 6 components (auto-wired or imported). 2 components export-only-bundled pending mount.ts wiring per Tier 2 follower.

### Visual-render verification ([KNOWN] not in WB14 scope; operator-empirical pending)

Per dispatch §3.5 visual-comparison gate + `MB-F-WIREFRAME-VISUAL-VERIFICATION-GAP` framing — operator-manual-screenshot post-rebuild verifies:
- Frame C default mode renders with Conductor brand visible at bottom-rail leftmost
- BUILD.md tab clickable → placeholder body shows cross-reference to T5
- BottomRailCostMeter renders "conductor api · $0.00 today" (stub value per aggregation backend gap)
- Slot ordering matches wireframe (operator may flag T7 refinements)
- Frame A toggle hides Frame C; bottom-rail chrome persists across A↔C transitions

### Definition of done per ticket body §7

- ✅ WB1-WB12 cairn ladder lands; commit chain pushed to origin/main
- ✅ Bottom-rail elements shipped (6 new components + 3 new chat-shell.tsx slot props + mount.ts wiring for 3 of 6 slots)
- ✅ BUILD.md tab clickable; body shows Sub-Q-T4-B=iii placeholder
- ✅ Sub-Q-T4-F=i bypass-perms indicator wires (component shipped; mount.ts auto-wire Tier 2 deferred)
- ✅ max-parallel counter component shipped (mount.ts auto-wire Tier 2 deferred)
- ✅ BottomRailCostMeter shipped + production-wired in mount.ts (renders aggregated total from existing onCostUpdate; backend stub will surface $0.00 until aggregation lands)
- ✅ PlanTimerText component shipped (mount.ts auto-wire Tier 2 deferred)
- ✅ Workstation typecheck CLEAN at every WB
- ✅ No regression in v3.5 probes (72/72 chat-shell GREEN; existing MB-T20/22/24/25/26/27 probes preserved)
- ✅ WB13 runtime smoke + WINDOW_READY confirmed
- ⏸ **Visual rendering verification operator-empirical pending** per `MB-F-WIREFRAME-VISUAL-VERIFICATION-GAP` framing — structural ship closure per `MB-F-WIREFRAME-PARITY-SCOPE-UNDERESTIMATED`
- ⏸ **mount.ts auto-wire for 3 slot-prop-only components** — Tier 2 follow-on `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING`
- ✅ WB14 findings doc + audit reclass land (this commit)

**Status:** STRUCTURAL SHIP COMPLETE. Production-runtime wiring 50%+ shipped (3 of 6 components actively wired; remaining 3 component contracts shipped with slot props ready for Tier 2 follower autowire).

---

**End of MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS Findings.**
