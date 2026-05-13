# MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW — findings doc

**Authored:** 2026-05-13 (Round 11 §3.9 SPECULATIVE Wave 4 — session phase4-t9-exec-bypass-perms)
**Cairn ladder:** 7 WBs (ticket-body + 3 RED-GREEN pairs + findings)
**Anchor commits:**
- WB0 docs `42cede6` — ticket body authored (Cluster F per P3-rev-2 §3.2)
- WB1 RED `3c24822` — bypass-perms-source module probe (6 conditions)
- WB2 GREEN `469a5e1` — bypass-perms-source.ts pluggable-source skeleton
- WB3 RED `f1b36d3` — spawn-handler integration probe (5 conditions)
- WB4 GREEN `bf1c33b` — spawn-handler bypassPermsSource? dep + recordSpawn invocation
- WB5 RED `6f61d0e` — BypassPermsIndicator prop-contract probe (5 conditions)
- WB6 GREEN `3c54195` — BypassPermsIndicator bypassActiveCount? optional override
- WB7 (this doc) — findings + coord + operator-stamp surface

**Authoring envelope:** Round 11 §3.9 territorial-manifest at `phase4-t9-bypass-perms.txt`; per-path `git add` + per-path commit pathspec MANDATORY at every WB; PHASE 4 SPECULATIVE per directive (revision-cost accepted); gen-5 orchestrator announcement (rate-limit cleared) mid-ladder authorization for resume.

---

## §I — Summary

T11 (this ticket) ships the **workstation-side pluggable-source aggregator** for bypass-perms-indicator data flow + spawn-handler sibling integration + component additive-prop seam. Closes the FINAL ARM of `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` Tier 2 from T4 WB14 findings §IX — sibling tickets T8 (cost-meter, `155933f`), T9 (plan-timer, `afd3778`), T10 (max-parallel, `6ce548f`) closed three of four bottom-rail data-flow arms; this ticket closes BypassPermsIndicator.

Outcome classification per CLAUDE.md §2.11: **Capability enabled with known limitations.**

`[KNOWN]` evidence: WB1+WB3+WB5 RED probes flip RED→GREEN at their respective GREEN WBs; WB1 6/6 GREEN; WB3 5/5 GREEN (including condition (5) backward-compat regression shield); WB5 5/5 GREEN (including 3 regression shields preserving T4 WB12 + sibling Frame-C consumer semantics); workstation typecheck CLEAN across all WBs; 17/17 GREEN on 4 spawn-handler test files at WB4; 14/14 GREEN on 3 indicator test files at WB6.

---

## §II — Cairn ladder

| WB | Type | Commit | Files | Lines | Test impact |
|---|---|---|---|---|---|
| WB0 | docs | `42cede6` | 1 (ticket body) | +364 | ticket body authored |
| WB1 | red | `3c24822` | 1 (test) | +166 | 6-cond probe — all RED at HEAD |
| WB2 | green | `469a5e1` | 1 (impl) | +119 | WB1 6/6 GREEN |
| WB3 | red | `f1b36d3` | 1 (test) | +172 | 5-cond probe — 4 RED + 1 PRE-PASS |
| WB4 | green | `bf1c33b` | 1 (MOD) | +27 | WB3 5/5 GREEN; 3 sibling spawn-handler probes 4/4 each preserved |
| WB5 | red | `6f61d0e` | 1 (test) | +105 | 5-cond probe — 2 RED + 3 PRE-PASS |
| WB6 | green | `3c54195` | 1 (MOD) | +25/-1 | WB5 5/5 GREEN; T4 WB12 4/4 + Frame-C 5/5 preserved |
| WB7 | docs | (this push) | 2 (findings + coord) | findings + coord land |

7 WBs total. Race-window evidence under heavy Wave 4 concurrent activity (see §VI).

---

## §III — Sub-Q-T11 resolutions taken under manifest-bound scope

Per ticket body §3 with auto-defaults applied under Wave 4 envelope (operator HALT-TERRITORY-ACK confirms manifest-as-given; defaults from `[MODELED]` recommendations).

| Sub-Q | Resolution | Rationale |
|---|---|---|
| A aggregator architecture | **(α) pluggable-source skeleton** | T9 (`3fef80d`) precedent; `BypassPermsSource = { recordSpawn, getActiveBypassCount, onUpdate }`; integrator pushes events |
| B signal shape | **(ii) `bypassActiveCount?: number`** | T10 (`9ec2b6a`) precedent shape; numeric carries more info than boolean for future UX |
| C component API | **(α) additive optional prop** | Backward-compat preserved; existing call sites unaffected |
| D render disposition | **(any)** `(count ?? 0) > 0 \|\| dispatchMode === 'auto'` | Any bypassed-session presence triggers indicator; dispatchMode='auto' fallback when aggregator unavailable |
| E integration cadence | **(α) sync post-spawn-success** | recordSpawn fires immediately after tmux+daemon registration succeed |

---

## §IV — Architectural shape shipped

### Workstation main-process (manifest-allowed)

```ts
// packages/dispatch-workstation/src/main/bypass-perms-source.ts (WB2)
export type BypassPermsMode = 'auto' | 'ask';

export interface BypassPermsSource {
  recordSpawn(sessionName: string, mode: BypassPermsMode): void;
  getActiveBypassCount(): number;
  onUpdate(cb: (activeBypassCount: number) => void): () => void;
}

export function createBypassPermsSource(): BypassPermsSource {
  const sessions = new Map<string, BypassPermsMode>();
  const subscribers = new Set<(count: number) => void>();
  // ... mutations fire subscribers; pure in-memory state
}
```

```ts
// packages/dispatch-workstation/src/main/spawn-handler.ts (WB4 MOD)
import type { BypassPermsSource } from './bypass-perms-source.js';

export interface SpawnHandlerDeps {
  // ... existing fields preserved
  bypassPermsSource?: BypassPermsSource;
}

export async function spawnSession(req, deps): Promise<SpawnSessionResult> {
  // ... tmux + daemon registration succeed
  deps.bypassPermsSource?.recordSpawn(
    req.sessionName,
    req.permissionMode ?? 'ask',
  );
  return { ... };
}
```

### Workstation renderer (manifest-allowed)

```tsx
// packages/dispatch-workstation/src/chat-shell/bypass-perms-indicator.tsx (WB6 MOD)

export interface BypassPermsIndicatorProps {
  readonly dispatchMode: 'auto' | 'ask';
  readonly bypassActiveCount?: number; // NEW WB6
}

export function BypassPermsIndicator(props): JSX.Element | null {
  const showIndicator =
    (props.bypassActiveCount ?? 0) > 0 || props.dispatchMode === 'auto';
  if (!showIndicator) return null;
  return <span ...>⚠ bypass perms</span>;
}
```

### Architectural relationship

```
┌──────────────────────────────────────────────────────────────────┐
│ spawn-handler.ts (WB4)                                            │
│   deps.bypassPermsSource?.recordSpawn(name, mode)                 │
│   fires AFTER tmux+daemon registration succeed                    │
└──────────────────────────────────────────────────────────────────┘
                       │ recordSpawn events
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│ bypass-perms-source.ts (WB2)                                      │
│   Map<sessionName, 'auto' | 'ask'>                                │
│   getActiveBypassCount() = count of mode === 'auto'               │
│   onUpdate(cb) fires per recordSpawn                              │
└──────────────────────────────────────────────────────────────────┘
                       │ aggregated count signal
                       │ (deferred consumer plumbing)
                       ▼
        [DEFERRED — out of Wave 4 manifest:
           chat-shell/mount.ts (FORBIDDEN) auto-wire path,
           OR new IPC channel under WORKSTATION_CONTRACT.md §6.6
           (also FORBIDDEN — amendment cycle deferred)]
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│ chat-shell/bypass-perms-indicator.tsx (WB6)                       │
│   props: { dispatchMode, bypassActiveCount? }                     │
│   showIndicator = (count ?? 0) > 0 || dispatchMode === 'auto'     │
│                                                                    │
│   Until consumer plumbing lands, dispatchMode-only fallback        │
│   semantics preserved (T4 WB12 behavior verbatim for backward-     │
│   compat callers).                                                 │
└──────────────────────────────────────────────────────────────────┘
```

The aggregator is "load-bearing for future consumers, not load-bearing today." Same shape as T9 (f)-disposition + T10 manifest-bound deferred consumer.

---

## §V — Test evidence

### §V.1 — Workstation source module (6/6 GREEN at WB2)

```
$ pnpm exec vitest run test/unit/main/probe-mbtwfbypass-01-source-module.spec.ts
Test Files  1 passed (1)
     Tests  6 passed (6)
```

Conditions verified:
- Module exists at `src/main/bypass-perms-source.ts`
- `createBypassPermsSource` exported as function
- `recordSpawn(name, 'auto')` increments count; `'ask'` does not
- Re-recording same name replaces entry (no double-count; mode flips correctly)
- `onUpdate(cb)` fires per recordSpawn; dispose deregisters; state continues
- `getActiveBypassCount` deterministic — repeated reads return same value

### §V.2 — Spawn-handler integration (17/17 GREEN at WB4 across 4 test files)

```
$ pnpm exec vitest run test/unit/main/probe-mbtwfbypass-02-spawn-handler-integration.spec.ts \
    test/unit/main/probe-spawn-handler-mode-01-result-emits-spawnmode.spec.ts \
    test/unit/main/probe-mbtphase4-spawn-result-01-shape.spec.ts \
    test/unit/main/probe-mbtphase4-clustera-01-spawn-result-fields.spec.ts
Test Files  4 passed (4)
     Tests  17 passed (17)
```

- WB3 probe (probe-mbtwfbypass-02): 5/5 GREEN (conditions 1-4 flipped + condition 5 backward-compat preserved)
- Closure-(a) spawnMode probe (probe-spawn-handler-mode-01): 4/4 GREEN — unaffected
- T8-sibling shape probe (probe-mbtphase4-spawn-result-01): 4/4 GREEN — unaffected
- T8-sibling Cluster-A fields probe (probe-mbtphase4-clustera-01): 4/4 GREEN — model+spawnedAtMs co-exist cleanly with my new bypassPermsSource? field

### §V.3 — Indicator component (14/14 GREEN at WB6 across 3 test files)

```
$ pnpm exec vitest run test/unit/chat-shell/probe-mbtwfbypass-03-indicator-prop-contract.spec.tsx \
    test/unit/chat-shell/probe-mbtwt4-06-bypass-perms-indicator.spec.tsx \
    test/unit/frame-c/probe-mbtwft3-07-bypass-perms-indicator.spec.tsx
Test Files  3 passed (3)
     Tests  14 passed (14)
```

- WB5 probe (probe-mbtwfbypass-03): 5/5 GREEN (conditions 1+2 flipped; 3 regression shields preserved)
- T4 WB12 component probe (probe-mbtwt4-06): 4/4 GREEN — dispatchMode-only semantics preserved
- Frame-C per-session consumer probe (probe-mbtwft3-07): 5/5 GREEN — ActionBarProps.spawnMode-driven consumer unaffected

### §V.4 — Typecheck

```
$ pnpm --filter dispatch-workstation typecheck  → CLEAN (tsc --noEmit exits 0)
```

Verified at WB2, WB4, WB6.

---

## §VI — Race-window evidence (Round 11 §3.9 Wave 4 stress regime)

`[KNOWN]` Wave 4 concurrent-session activity peaked above all prior waves. Pre-stage `git status --short` observed sibling activity at every WB; origin advanced between every push:

| WB | Pre-stage sibling churn | Origin advance |
|---|---|---|
| WB0 | `?? coord-phase3-vv` + `?? dist-screenshots/` + `?? test/unit/scripts/` | `42cede6` |
| WB1 | `?? coord-phase3-vv` + `?? phase-3-vv-results` + `?? dist-screenshots/` + `?? visual-diff-config.mjs` | `42cede6..89809cd` (sibling commits between WB0 push + WB1 push) |
| WB2 | `M dispatch-queue-current.md` + `?? 4 new territorial manifests` (Wave 4 spawning more sessions) | `3c24822..c6a5ad1` |
| WB3 | `M cairn-under-stress` + `A phase-4-roadmap-update-notes` + `A phase-4-tier-1-roadmap-rev-3` | `469a5e1..e79eee6` |
| WB4 | spawn-handler.ts shifted 424→473 lines mid-ladder (sibling T8-cluster-A WB2 edits landing) | `f1b36d3..4507b49` |
| WB5 | `?? visual-diff-runner.mjs` (sibling Wave 4 phase3-vv) | `bf1c33b..16b288d` |
| WB6 | (low churn this push) | `6f61d0e..6f61d0e` (clean push — no concurrent commits) |

**Sibling-file race details (WB4 critical observation)**: `spawn-handler.ts` was being concurrently edited by `phase4-t8-exec` Cluster A session. Between my WB3 RED probe pre-read (file at 424 lines) and my WB4 GREEN edit (file at 473 lines), the sibling added `model?: string` + `nowMs?: number` fields to SpawnHandlerDeps + matching populator invocation. Re-reading at edit time confirmed:
- Sibling fields intact (verified 4/4 GREEN on probe-mbtphase4-clustera-01 sibling probe at WB4 verification)
- My WB4 edit slotted in additively after sibling fields without conflict
- Per-path commit pathspec restricted my commit to the file; no whole-package add

Defense pattern (Round 11 §3.9.A): atomic stage+commit+verify in single shell invocation; per-path `git add <single-path>`; per-path `git commit -m "..." -- <single-pathspec>`. Per-commit stat verification:
- WB0: 1 file, +364 lines
- WB1: 1 file, +166 lines
- WB2: 1 file, +119 lines
- WB3: 1 file, +172 lines
- WB4: 1 file, +27 lines (additive co-existence with sibling +44 lines)
- WB5: 1 file, +105 lines
- WB6: 1 file, +25 / -1 lines

**Zero cross-session contamination across 7 commits** in highest-concurrent-activity Wave to date.

---

## §VII — FOLLOWUPS surface (operator stamp required — manifest excludes `FOLLOWUPS.md`)

Manifest at `phase4-t9-bypass-perms.txt` forbids `docs/FOLLOWUPS.md` direct edit. Operator applies the following stamps in a separate manifest-relaxation commit:

| Row | Action | Closing WB | Citation |
|---|---|---|---|
| `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` (Tier 2, T4 WB14 §IX) | **FINAL ARM CLOSED (component seam)** — BypassPermsIndicator component-prop seam shipped at WB6; sibling tickets T8 (`7abb649`), T9 (`afd3778`), T10 (`9ec2b6a`) closed three of four bottom-rail data-flow component-prop seams; this ticket closes the fourth. **Mount.ts auto-wire for ALL arms remains deferred** to NEW proposed `MB-F-BOTTOM-RAIL-MOUNT-WIRING-FINAL-INTEGRATION` follow-on. | WB6 | architectural seam complete at component layer |

NEW Tier 2 follow-ons to be filed (proposed bodies):

```
| MB-F-BYPASS-PERMS-CONSUMER-WIRING | T11 shipped workstation-side bypass-perms-source (3fef80d-pattern aggregator at 469a5e1) + spawn-handler integration (bf1c33b) + component bypassActiveCount? optional override (3c54195). Closure path: plumb the aggregator's getActiveBypassCount() / onUpdate signal into BypassPermsIndicator via chat-shell/mount.ts auto-wire (FORBIDDEN by Wave 4 manifest) OR new IPC channel under WORKSTATION_CONTRACT.md §6.6 amendment (FORBIDDEN by Wave 4 manifest). Both paths require manifest expansion (matches T9 e5c7c96 precedent). Recommended path: chat-shell/mount.ts resolveRenderBypassPermsIndicator() mirroring T9 resolveRenderPlanTimerText (de6620e) precedent. Discoverability anchor: docs/coordination/mb-t-phase-4-bypass-perms-indicator-data-flow-findings-2026-05-13.md §IV architecture diagram. Tier 2. | MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW WB7 |
```

```
| MB-F-BOTTOM-RAIL-MOUNT-WIRING-FINAL-INTEGRATION | All four bottom-rail indicators (cost-meter T8, plan-timer T9, max-parallel T10, bypass-perms T11) now have component-side prop seams accepting aggregated/computed data. Closure path: ship chat-shell/mount.ts integration consolidating all four consumer wirings via resolveRenderXxx pattern (T9 plan-timer at de6620e is the lone shipped instance; cost-meter at 7abb649 is structurally similar but uses different data flow). Single PR consolidates: bottom-rail-cost-meter wiring + plan-timer wiring (already shipped) + max-parallel wiring (from T10 9ec2b6a seam) + bypass-perms wiring (from T11 3c54195 seam). Requires manifest expansion to include chat-shell/mount.ts (currently FORBIDDEN by multiple Wave 4 manifests for territorial isolation). Discoverability anchor: docs/coordination/mb-t-phase-4-bypass-perms-indicator-data-flow-findings-2026-05-13.md §VII. Tier 2. | MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW WB7 |
```

`[SPECULATIVE]` Tier 3 candidates (file if Phase 3 dogfood surfaces):
- `MB-F-BYPASS-PERMS-SOURCE-KILL-RECONCILIATION` — Sub-Q-A=(γ) `recordKill` path; depends on Phase 3 surfacing whether kill-tracking is essential for indicator accuracy.
- `MB-F-BYPASS-PERMS-SOURCE-PERSISTENCE` — process-singleton state lost on workstation restart; if operator restarts mid-session, bypass count drops to 0 until next spawn. Acceptable v1 per `splitter-state.json` precedent.

---

## §VIII — Audit reclassification surface (manifest excludes audit doc — operator stamp required)

`docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` §10.5 row "bypass-perms indicator":
- **From:** SHIPPED-with-global-dispatchMode-only
- **To:** SHIPPED-with-aggregator-seam-and-component-prop-override-and-deferred-consumer
- **Reason:** Component now accepts aggregated bypass-perms count via `bypassActiveCount?: number` optional override; workstation main-process aggregator captures per-spawn state via integration with spawn-handler; consumer plumbing into the rendered indicator deferred to `MB-F-BYPASS-PERMS-CONSUMER-WIRING` follow-on.

---

## §IX — Risk register (residual)

`[KNOWN]` Resolved:
- Sub-Q-T11-A/B/C/D/E all auto-defaulted under Wave 4 envelope per ticket body §3 `[MODELED]` recommendations.
- spawn-handler.ts concurrent-edit race with sibling T8-cluster-A — resolved via re-read at edit time + per-path commit pathspec; 4/4 GREEN on sibling probe at WB4 verification.
- T4 WB12 BypassPermsIndicator regression — verified 4/4 GREEN preserved.
- Frame-C per-session consumer regression — verified 5/5 GREEN preserved.

`[KNOWN]` Carried forward (pre-existing):
- Wider chat-shell happy-dom test infrastructure issues per CLAUDE.md §4.5 — both T4 WB12 probe (probe-mbtwt4-06) AND new WB5 probe (probe-mbtwfbypass-03) ran 4/4 + 5/5 GREEN here, suggesting the failure class is narrower than originally cataloged (likely affects only toBeInTheDocument-style matchers, not queryByTestId pattern). NOT re-diagnosed per CLAUDE.md §4.5 discipline.

`[SPECULATIVE]` Phase 4:
- Phase 3 visual-verification may RESHAPE or DISCARD this ticket; revision-cost accepted per §3.9 STATUS FRAMING.
- Consumer plumbing (`MB-F-BYPASS-PERMS-CONSUMER-WIRING`) may itself be DISCARDED if Phase 3 reveals chat-shell-global indicator is operator-fine at T4 WB12 dispatchMode-only shape (per-session indicator via Frame-C action-bar already addresses per-tile case).

---

## §X — Definition-of-done verification

| Item | Status | Evidence |
|---|---|---|
| WB0-WB7 cairn ladder lands; commits pushed to origin | ✓ | 7 commits in chain (`42cede6` → `3c54195` → this WB7) |
| `bypass-perms-source.ts` shipped (pluggable-source skeleton) | ✓ | `createBypassPermsSource` + `BypassPermsSource` interface |
| spawn-handler.ts integrated (optional dep + recordSpawn) | ✓ | `bypassPermsSource?: BypassPermsSource` field + invocation at WB4 |
| `BypassPermsIndicator` prop seam added | ✓ | optional `bypassActiveCount?: number` + override branch |
| `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` FINAL ARM closed (component side) | ✓ | BypassPermsIndicator arm shipped at WB6; all four bottom-rail consumer arms now have component-prop seams |
| Workstation typecheck CLEAN | ✓ | tsc --noEmit exits 0 (verified WB2, WB4, WB6) |
| No regression in T4 WB12 indicator probe | ✓ | probe-mbtwt4-06: 4/4 GREEN at WB6 |
| No regression in Frame-C indicator probe | ✓ | probe-mbtwft3-07: 5/5 GREEN at WB6 |
| No regression in sibling spawn-handler probes | ✓ | probe-spawn-handler-mode-01 + probe-mbtphase4-* — 12/12 GREEN at WB4 |
| Per-path discipline at every commit | ✓ | per-commit stat verified 1-file-only across 7 commits under Wave 4 stress (see §VI) |
| Methodology-incident-free | ✓ | zero cross-session contamination; HALT-TERRITORY-ACK surfaced + operator-resolved before WB0 |

Outcome classification per CLAUDE.md §2.11: **Capability enabled with known limitations** — aggregator + integration + component seam in place; consumer plumbing deferred. Honest framing matching T9/T10 sibling pattern.

---

## §XI — Manifest constraint surfacing (for future operator dispositions)

T11's manifest-bound scope differs from typical bottom-rail-data-flow tickets because chat-shell/mount.ts is FORBIDDEN. Documented divergences:

1. **Consumer plumbing path** — chat-shell/mount.ts `resolveRenderBypassPermsIndicator` auto-wire is out-of-manifest. Replaced by component-side `bypassActiveCount?` optional override; future consumer plumbing supplies values via deferred follow-on.
2. **WORKSTATION_CONTRACT.md §6.6 amendment** — out-of-manifest. New IPC channel for renderer subscription to aggregator (alternative consumer-wiring path) requires manifest expansion.
3. **WB-final runtime smoke** — would target `dist/main/main.js` for bypass-perms-source bundle inclusion + `dist/chat-shell/renderer.js` for BypassPermsIndicator bundle. Both build paths available but not in T11 write-scope. Deferred to operator-side verification or future manifest expansion.

If operator subsequently expands manifest matching T9 `e5c7c96` precedent, the remaining consumer-wiring WBs land as continuation: mount.ts resolveRenderBypassPermsIndicator → runtime smoke → audit reclassification finalize.

---

## §XII — Cross-ticket synthesis (T8/T9/T10/T11 sibling bottom-rail data-flow closure)

All four bottom-rail indicators now have data-flow architectural seams shipped per Cluster F:

| Indicator | Ticket | Aggregator | Component seam | Mount auto-wire | FOLLOWUPS arm |
|---|---|---|---|---|---|
| Cost meter | T8 (`155933f`) | daemon `cost-aggregator.ts` (pure-fn) | `bottom-rail-cost-meter.tsx` prop-driven | shipped at T8 `7abb649` | CLOSED |
| Plan timer | T9 (`afd3778`) | workstation `rate-limit-aggregator.ts` (pluggable-source skeleton) | `plan-timer-text.tsx` prop-driven | shipped at T9 `de6620e` | PARTIAL (source ARM open) |
| Max parallel | T10 (`6ce548f`) | daemon `max-parallel-aggregator.ts` (pure-fn) | `max-parallel-counter.tsx` `activeCount?` seam | DEFERRED | PARTIAL (consumer wiring open) |
| Bypass perms | T11 (this) | workstation `bypass-perms-source.ts` (pluggable-source skeleton) | `bypass-perms-indicator.tsx` `bypassActiveCount?` seam | DEFERRED | FINAL ARM CLOSED (component-side); consumer plumbing OPEN |

T9 + T11 ship workstation-side pluggable-source skeletons (mirror pattern). T8 + T10 ship daemon-side pure-fn aggregators (mirror pattern). The choice between workstation-vs-daemon side reflects ticket-by-ticket manifest scoping — both patterns are valid; both ship `[Capability enabled with known limitations]` outcome with deferred consumer plumbing as the residual concern.

The proposed `MB-F-BOTTOM-RAIL-MOUNT-WIRING-FINAL-INTEGRATION` follow-on would consolidate consumer plumbing for max-parallel + bypass-perms (and revisit cost-meter + plan-timer if their consumer wiring needs refresh) in a single integration ticket post-Phase-3.
