# MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW — findings doc

**Authored:** 2026-05-12 (Round 11 §3.9 SPECULATIVE Wave 3 — session phase4-t9-exec-t10)
**Cairn ladder:** 5 WBs (RED-GREEN pairs + docs)
**Anchor commits:**
- WB1 RED `5b4a744` — daemon-side max-parallel-aggregator test (7 conditions)
- WB2 GREEN `8ea83a0` — daemon-side `max-parallel-aggregator.ts` pure-fn impl
- WB3 RED `76f95c7` — workstation `MaxParallelCounter` prop-contract probe (4 conditions)
- WB4 GREEN `9ec2b6a` — workstation component `activeCount?: number` optional override
- WB5 (this doc) — findings + FOLLOWUPS/audit operator-stamp surface

**Authoring envelope:** Round 11 §3.9 territorial-manifest at `phase4-t9-t10-exec.txt`; per-path `git add` + per-path commit pathspec MANDATORY at every WB; PHASE 4 SPECULATIVE per directive (revision-cost accepted).

---

## §I — Summary

T10 ships the **canonical-named pure-fn aggregator** for max-parallel data flow, plus an additive `activeCount?: number` prop seam on `MaxParallelCounter`. The daemon-side `max-parallel-aggregator.ts` module + workstation component prop extension co-exist with the existing T4 WB4 chat-shell slot supplier — backward-compat preserved; future cross-package consumers plug into the new seam without touching the slot supplier.

Outcome classification per CLAUDE.md §2.11: **Capability enabled with known limitations.**

`[KNOWN]` evidence: WB1+WB3 RED probes flip RED→GREEN at their respective GREEN WBs; WB2 daemon-side test 7/7 GREEN; WB3 workstation-side probe 4/4 GREEN; T4 WB4 regression probe 5/5 GREEN; daemon typecheck CLEAN; workstation typecheck CLEAN.

---

## §II — Cairn ladder

| WB | Type | Commit | Test impact |
|---|---|---|---|
| WB1 | red | `5b4a744` | 7-cond daemon probe (module existence + 2 fn behavior + DEFAULT constant + purity) — all RED at HEAD |
| WB2 | green | `8ea83a0` | WB1 7/7 GREEN — daemon `max-parallel-aggregator.ts` ships |
| WB3 | red | `76f95c7` | 4-cond workstation probe (activeCount? source-text + override + 2 regression shields) — 2 RED + 2 PRE-PASS at HEAD |
| WB4 | green | `9ec2b6a` | WB3 4/4 GREEN — component activeCount? optional override |
| WB5 | docs | (this push) | findings doc + operator-stamp surface |

5 WBs total (vs. ticket body §4 8-10 WB baseline — manifest-bound reshape collapsed the mount.ts wiring + settings-file persistence + IPC channel WBs into deferred follow-ons; the consumer plumbing those WBs would have done is out-of-manifest for this session).

---

## §III — Sub-Q-T10 resolutions (under manifest-bound scope)

Manifest at `phase4-t9-t10-exec.txt` constrained the disposition space. The recommendations the ticket body §3 makes (`(β) workstation settings file`, `(i) prop-drilled`, etc.) all involve workstation `src/main/` and/or `chat-shell/mount.ts` — neither in territory. The taken dispositions are:

| Sub-Q | Resolution | Rationale |
|---|---|---|
| T10-A active-count source | **(α) RATIFY** sessions-stream filter | Component computes N inline at T4 WB4; WB4 adds `activeCount?: number` optional override seam for future consumers |
| T10-B max-parallel source | **(α) RATIFY** `DEFAULT_MAX_PARALLEL = 16` | (β) settings-file source requires workstation `src/main/max-parallel-state.ts` — out-of-manifest. Daemon exports `resolveMaxParallel(config?)` resolver; consumer plumbing deferred |
| T10-C emission channel | **(i) prop-drilled** | (ii) push IPC requires `WORKSTATION_CONTRACT.md` §6.6 amendment — FORBIDDEN. Component remains prop-driven |
| T10-D persistence | **(i) no persistence** | (ii) `splitter-state.ts` mirror requires `src/main/` — out-of-manifest. Consumer plumbing deferred |
| T10-E cadence | **(α) synchronous per-render** | (β)/(γ) require async source which the deferred plumbing would supply |

`[KNOWN]` All five RATIFY/(i)/(α) dispositions match what the ticket body §3 marks as "recommended for ship-velocity." Manifest scope further narrowed by collapsing four "B=(β) settings-file" WBs into a single deferred follow-on.

---

## §IV — Architectural shape shipped

### Daemon side (manifest-allowed)

```ts
// packages/dispatch-daemon/src/max-parallel-aggregator.ts (WB2 GREEN)

export const DEFAULT_MAX_PARALLEL = 16;     // RATIFY T4 WB4 wireframe-fixed default

export interface SessionWithStatus {
  readonly status?: string;
}

export function aggregateActiveSessionCount(
  sessions: ReadonlyArray<SessionWithStatus>,
): number {
  // Counts sessions.status === 'open'; matches workstation
  // MaxParallelCounter inline filter verbatim.
}

export function resolveMaxParallel(config?: {
  readonly maxParallel?: number;
}): number {
  // Returns config.maxParallel or DEFAULT_MAX_PARALLEL.
}
```

### Workstation side (manifest-allowed)

```tsx
// packages/dispatch-workstation/src/chat-shell/max-parallel-counter.tsx (WB4 GREEN)

export interface MaxParallelCounterProps {
  readonly sessions: readonly SessionEntryShape[];
  readonly maxParallel: number;
  readonly activeCount?: number;          // NEW WB4 — optional override
}

// Render branch:
const activeCount =
  activeCountProp ?? sessions.filter((s) => s.status === 'open').length;
```

### Architectural relationship

```
┌──────────────────────────────────────────────────────────────────┐
│ daemon/src/max-parallel-aggregator.ts (WB2)                       │
│   • DEFAULT_MAX_PARALLEL = 16                                     │
│   • aggregateActiveSessionCount(sessions) → N                     │
│   • resolveMaxParallel(config?) → M                               │
└──────────────────────────────────────────────────────────────────┘
                       │ canonical-named pure-fns
                       │ (no production-side consumer plumbing yet)
                       ▼
        [DEFERRED — out of manifest:
           workstation `src/main/` aggregator/source consumer,
           OR daemon HTTP endpoint exposing parsed config,
           OR chat-shell/mount.ts `resolveRenderMaxParallelCounter`]
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│ workstation/src/chat-shell/max-parallel-counter.tsx (WB4)         │
│   props: { sessions, maxParallel, activeCount? }                  │
│                                                                    │
│   When future consumer pre-computes N via                          │
│   aggregateActiveSessionCount(...), pass via activeCount prop —    │
│   overrides inline filter. When activeCount omitted, T4 WB4        │
│   inline filter semantics preserved verbatim (backward-compat).    │
└──────────────────────────────────────────────────────────────────┘
```

The daemon module is "load-bearing for future consumers, not load-bearing today." The component's optional override is the slot that lets future plumbing flow without touching T4 WB4 chat-shell slot supplier.

---

## §V — Test evidence

### §V.1 — Daemon-side aggregator (7/7 GREEN at WB2)

```
$ pnpm exec vitest run test/unit/max-parallel-aggregator.test.ts
Test Files  1 passed (1)
     Tests  7 passed (7)
```

Conditions verified:
- Module exists
- `aggregateActiveSessionCount`: counts `status === 'open'`; ignores other statuses + missing-status; empty list → 0
- `resolveMaxParallel`: returns `config.maxParallel` when present; returns `DEFAULT_MAX_PARALLEL` otherwise
- `DEFAULT_MAX_PARALLEL === 16` (RATIFY T4 WB4)
- Purity: 5 successive calls return identical results; deterministic

### §V.2 — Workstation component (4/4 GREEN at WB4)

```
$ pnpm exec vitest run test/unit/chat-shell/probe-mbtwft10-01-component-prop-contract.spec.tsx
Test Files  1 passed (1)
     Tests  4 passed (4)
```

Conditions verified:
- Source-text: `readonly activeCount?: number` declared on `MaxParallelCounterProps`
- `activeCount={5}` overrides inline filter (renders "5/8" instead of "3/8" for sessions=[3 open + 2 closed])
- `activeCount` omitted → inline filter preserved (renders "3/16")
- `maxParallel` prop pass-through unchanged (T4 WB4 seam preserved)

### §V.3 — T4 regression (5/5 GREEN preserved)

```
$ pnpm exec vitest run test/unit/chat-shell/probe-mbtwt4-02-max-parallel-counter.spec.tsx
Test Files  1 passed (1)
     Tests  5 passed (5)
```

Existing T4 WB4 component contract semantically unchanged; backward-compat callers see no behavioral difference.

### §V.4 — Typecheck

```
$ pnpm --filter dispatch-daemon typecheck       → CLEAN (tsc --noEmit exits 0)
$ pnpm --filter dispatch-workstation typecheck  → CLEAN (tsc --noEmit exits 0)
```

---

## §VI — Race-window evidence (Round 11 §3.9 stress regime)

`[KNOWN]` Sibling-session activity observed across all 4 cairn-grammar commits. Pre-stage `git status --short` shifted between consecutive bash invocations on multiple WBs:

| WB | Pre-stage observation |
|---|---|
| WB1 | `A docs/build-docs/CONDUCTOR_MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS_BUILD.md` (sibling-staged) → shifted to `A packages/dispatch-workstation/test/unit/tile-grid/probe-spawnmode-02-frame-c-root-pass-through.spec.ts` on retry |
| WB2 | `M docs/cairn-under-stress-round-11.md`, `M packages/dispatch-workstation/src/frame-c/frame-c-root.tsx`, `?? docs/coordination/round-11-archive-coauthor-notes-...`, `?? packages/dispatch-core/src/v3/spawn-result-fields.ts` |
| WB3 | `M docs/cairn-under-stress-round-11.md`, `A docs/coordination/round-11-archive-coauthor-notes-...` |
| WB4 | `?? docs/coordination/mb-f-tilegridsessionentry-spawnmode-...`, `?? packages/dispatch-workstation/src/main/spawn-session-result-extensions.ts` |

Origin advanced between my pushes:
- `5b4a744..ce1d828` between WB1 push and WB2 push (sibling commits landed)
- `8ea83a0..f943d21` between WB2 push and WB3 push
- `76f95c7..c76f903` between WB3 push and WB4 push

**Defense**: per-path `git add <single-path>` + per-path `git commit -m "..." -- <single-path>` at every WB. Per-commit stat verification shows each commit changed exactly the expected file count:
- WB1: 1 file, +204 lines
- WB2: 1 file, +124 lines
- WB3: 1 file, +129 lines
- WB4: 1 file, +18 / -2 lines

**Zero cross-session contamination across 4 commits.** Per-path discipline holds under Round 11 §3.9 stress regime.

---

## §VII — FOLLOWUPS surface (operator stamp required — manifest excludes `FOLLOWUPS.md` direct edit)

Manifest at `phase4-t9-t10-exec.txt` forbids `docs/FOLLOWUPS.md` direct edit. Operator applies the following stamps in a separate manifest-relaxation commit:

| Row | Action | Closing WB | Citation |
|---|---|---|---|
| `MB-F-MAX-PARALLEL-CONFIG-SOURCE` (Tier 3, T4 WB14 findings §IX) | **PARTIAL-STAMP** — daemon-side resolver shipped (`resolveMaxParallel`); M source-of-truth ARM remains OPEN (consumer plumbing deferred). Cross-ref NEW `MB-F-T10-MAX-PARALLEL-CONSUMER-WIRING` (proposed below). | WB2 | architectural seam shipped; DEFAULT_MAX_PARALLEL=16 fallback per `resolveMaxParallel` |
| `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` (Tier 2) | **NO CHANGE** — T10 does NOT close MaxParallelCounter arm because mount.ts wiring is out-of-manifest. T8 closed cost-meter arm (`7abb649`); T9 closed plan-timer arm (`afd3778`); MaxParallelCounter + BypassPermsIndicator arms remain OPEN. | n/a | mount.ts auto-wire path deferred to future ticket |

NEW Tier 2 follow-on to be filed (proposed body):

```
| MB-F-T10-MAX-PARALLEL-CONSUMER-WIRING | T10 shipped daemon-side aggregator (`max-parallel-aggregator.ts` at 8ea83a0) + workstation component activeCount? optional override (max-parallel-counter.tsx at 9ec2b6a). Closure path: plumb a real consumer of resolveMaxParallel + aggregateActiveSessionCount into the rendered counter. Three viable paths: (a) workstation `src/main/max-parallel-state.ts` settings-file reader passing M via chat-shell slot supplier; (b) daemon HTTP endpoint `/v3/max-parallel` with workstation polling; (c) chat-shell/mount.ts `resolveRenderMaxParallelCounter` with cross-package import-from-relative-path. All three paths require manifest expansion (workstation `src/main/`, `chat-shell/mount.ts`, OR daemon HTTP route addition). Discoverability anchor: docs/coordination/mb-t-wireframe-t10-findings-2026-05-12.md §IV architecture diagram. Tier 2. | MB-T-WIREFRAME-T10 WB5 |
```

`[MODELED]` Recommended path: (a) workstation settings-file source — matches ticket body §3.2 Sub-Q-T10-B=(β) recommendation + `splitter-state.ts` precedent. Requires manifest expansion to include `packages/dispatch-workstation/src/main/max-parallel-state.ts` + `packages/dispatch-workstation/src/chat-shell/mount.ts`. Same shape as T9 manifest expansion at `e5c7c96`.

---

## §VIII — Audit reclassification surface (manifest excludes audit doc — operator stamp required)

`docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` §10.4 row "max-parallel counter":
- **From:** SHIPPED-with-renderer-internal-const
- **To:** SHIPPED-with-component-prop-override-seam-and-deferred-source
- **Reason:** Component now accepts optional `activeCount?: number` for upstream N override; daemon-side canonical-named resolvers exist for both N (`aggregateActiveSessionCount`) and M (`resolveMaxParallel`) but consumer plumbing into the rendered counter is deferred to `MB-F-T10-MAX-PARALLEL-CONSUMER-WIRING` follow-on.

---

## §IX — Risk register (residual)

`[KNOWN]` Resolved:
- Sub-Q-T10-A/B/C/D/E disposition under manifest constraint — resolved to all-RATIFY/(i)/(α) pattern; ticket body's recommended (β) settings-file path deferred to follow-on.
- T4 WB4 component regression — verified 5/5 GREEN preserved.
- Cross-session staging contamination across 4 cairn-grammar commits — per-path discipline confirmed zero contamination.

`[KNOWN]` Carried forward (pre-existing):
- `MB-F-WORKSTATION-INTEGRATION-TEST-FLAKE-SUITE` Tier 3 class — chat-shell suite happy-dom matcher issues (NOT re-diagnosed per CLAUDE.md §4.5; T10 component probe uses different code path that DOES work — 4/4 GREEN evidence).

`[SPECULATIVE]` Phase 4:
- Operator may revise T10 disposition post-Phase-3-visual-verification per dispatch §3.9 STATUS FRAMING (revision-cost accepted).
- The deferred consumer-plumbing follow-on may itself be DISCARDED if Phase 3 dogfood reveals max-parallel counter is operator-fine at the existing renderer-internal-const-via-slot-supplier shape.

---

## §X — Definition-of-done verification

| Item | Status | Evidence |
|---|---|---|
| Cairn ladder lands; commits pushed to origin | ✓ | 4 commits (`5b4a744`, `8ea83a0`, `76f95c7`, `9ec2b6a`) + this WB5 docs commit |
| Daemon aggregator shipped (pure-fn) | ✓ | `aggregateActiveSessionCount` + `resolveMaxParallel` + `DEFAULT_MAX_PARALLEL=16` |
| Component prop-extension shipped | ✓ | optional `activeCount?: number` override |
| `MB-F-MAX-PARALLEL-CONFIG-SOURCE` closed | PARTIAL ✓ | daemon resolver shipped; consumer ARM tracked at proposed NEW follow-on per §VII |
| `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` MaxParallelCounter arm | NOT closed | mount.ts wiring out-of-manifest; deferred to follow-on |
| Daemon + workstation typecheck CLEAN | ✓ | tsc --noEmit exits 0 (both packages) |
| No regression in T4 WB4 component contract | ✓ | probe-mbtwt4-02-max-parallel-counter.spec.tsx 5/5 GREEN |
| Per-path discipline applied at every WB commit | ✓ | per-commit stat verified 1-file-only across 4 commits under race-window stress (see §VI) |
| Methodology-incident-free | ✓ | zero cross-session contamination; HALT-TERRITORY-VIOLATION surfaced + operator-resolved before WB1 |

Outcome classification per CLAUDE.md §2.11: **Capability enabled with known limitations** — daemon-side resolvers + component-side override seam in place; consumer plumbing deferred. Honest framing.

---

## §XI — Manifest constraint surfacing (for future operator dispositions)

T10's manifest-bound scope differs from ticket body §4's 8-WB baseline because the ticket body assumes workstation `src/main/` + `chat-shell/mount.ts` are in territory. Three documented divergences:

1. **WB1+WB2 (`src/main/max-parallel-state.ts` settings-file)** — out-of-manifest. Replaced by daemon-side `resolveMaxParallel(config?)` resolver; consumer passes config later.
2. **WB3+WB4 (`chat-shell/mount.ts` `resolveRenderMaxParallelCounter` auto-wire)** — out-of-manifest. Replaced by component-side `activeCount?` optional override; future consumer plumbing supplies values.
3. **WB7 (runtime-launch smoke)** — out-of-manifest (no workstation build/electron-launch artifacts in territory; smoke would target `dist/chat-shell/renderer.js` which is built but not in T10 write-scope). Deferred to operator-side verification or future manifest expansion.

If operator subsequently expands manifest (matching T9 precedent at `e5c7c96`), the remaining 3-5 WBs can land as a continuation: settings-file ship → mount.ts auto-wire → runtime smoke → findings amendment.
