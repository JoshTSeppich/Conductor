# MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION — WB-final findings

**Ticket:** MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION
**Session:** SESSION-r12-phase4-bottom-rail-impl (Round 12 Wave 2)
**Authored:** 2026-05-16 (filename retains manifest-stamped 2026-05-13 per territory)
**Operator authorization:** MAX-AUTONOMY-WITHIN-FENCES 2026-05-13; BR-IMPL-1=(b) DEFER ack 2026-05-16
**Cascade context:** SECOND IMPL session in Round 12 (concurrent with r12-phase5-tile-header-impl); path-disjoint manifest fences
**Outcome classification:** Capability enabled with known limitations (renderer pluggable-source seams shipped; production wiring deferred to Tier-1 followup)

---

## §1 Overview

This ticket closes the renderer-side bottom-rail consumer-mount work for MaxParallelCounter + BypassPermsIndicator under a **deferred-production-wiring scope**. The originally-specified default-path 7-9 WB ladder (build doc §4) prescribed full main-process singleton instantiation + IPC fan-out + renderer subscription. **Operator decision 2026-05-16 BR-IMPL-1=(b) DEFER** removed items 3-7 of the ladder (IPC channels + main.ts singleton + production sources) from this ticket because items 3+4 would require amending **`WORKSTATION_CONTRACT.md §6.6` IPC channels — operator-arbitrated frozen-contract territory** per CLAUDE.md §1.

What this ticket ships (workstation-internal scope):
- **Renderer-side pluggable-source seams** in `mount.ts` (factories accept caller-supplied data, no IPC subscription).
- **`max-parallel-source.ts` interface module** establishing the contract Tier-1 followup will plug.
- **`main.ts` sentinel-zone documentation anchor** marking the deferral site for future implementation.
- **3 RED probes + 3 GREEN ships** + runtime-launch smoke evidence.

What this ticket DEFERS (Tier-1 followup body proposed in §6 below):
- `createBypassPermsSource()` singleton at app start.
- `spawn-ipc.ts defaultSpawnHandlerDeps.bypassPermsSource` field population.
- `coarchitect-ipc.ts onUpdate` fan-out (`coarchitect:bypass-perms-update` IPC channel).
- `preload.mts coarchitectBridge.onBypassPermsUpdate` exposure.
- `mount.ts` auto-mount-block subscription threading.
- Raw-fs `<userData>/max-parallel.json` reader (per CLAUDE.md §3.5).
- Renderer-side sessions-stream accumulator (BR-2=(a) ratification).

---

## §2 Cairn ladder (WB-by-WB)

| WB | Verb | Commit | Subject | Probes | Confidence |
|----|------|--------|---------|--------|------------|
| WB0+ | docs | `f61fab9` | Sub-Q operator-ack capture (gen-5 auto-ack 6/6) | n/a | [KNOWN] |
| WB1 | red | `7e951a8` | max-parallel mount-wiring probe — 3/3 RED at HEAD | probe-mbtphasebrf-01 (3 conditions: symbol + module-exists + import) | [KNOWN] |
| WB2 | green | `b3e8daf` | mount.ts `resolveRenderMaxParallelCounter` + `max-parallel-source.ts` pluggable seam — 3/3 GREEN | probe-mbtphasebrf-01 flipped 3/3 GREEN | [KNOWN] |
| WB3 | red | `3393fcf` | bypass-perms mount-wiring probe — 2/2 RED at HEAD | probe-mbtphasebrf-02 (2 conditions: symbol + import) | [KNOWN] |
| WB4 | green | `8c905b9` | mount.ts `resolveRenderBypassPerms` pluggable seam — 2/2 GREEN | probe-mbtphasebrf-02 flipped 2/2 GREEN | [KNOWN] |
| WB5 | red | `e4dc734` | main.ts deferred-wiring sentinel anchor probe — 2/2 RED at HEAD | probe-mbtphasebrf-03 (2 conditions: sentinel + followup slug) | [KNOWN] |
| WB6 | green | `10df792` | main.ts deferred-wiring sentinel anchor — 2/2 GREEN | probe-mbtphasebrf-03 flipped 2/2 GREEN | [KNOWN] |
| WB7 | (skip) | — | Conditional WB skipped per BR-1=(b) DEFER — no contract amendment needed | n/a | [KNOWN] |
| WB8 | verify | (no commit) | Runtime-launch smoke + integration triage | 7/7 unit probes GREEN; WINDOW_READY observed; 0 ERR_MODULE_NOT_FOUND; 2 pre-existing failures triaged | [KNOWN] |
| WB-final | docs | (this commit) | Findings + impl-coord docs + Tier-1 followup body proposed | n/a | [KNOWN] |

**Per-commit-push discipline:** every cairn-grammar commit pushed to `origin/main` immediately; `git log origin/main..HEAD` verified empty after each push per CLAUDE.md §2.6.

**Per-path discipline:** every commit used `git commit -o <pathspec>` (explicit "only" flag) after pre-commit `git status --short` verification. Phase-5 session FOLLOWUPS.md modification (`66ff96d`) interleaved between my WB2 and WB3 — verified path-disjoint, no contamination.

---

## §3 Sub-Q dispositions taken

| Sub-Q | Disposition | Source | Effect on this ticket |
|-------|-------------|--------|------------------------|
| BR-1 | **(b) DEFER** | Operator decision 2026-05-16 (after Phase-1 diagnose surfaced contract-amendment requirement) | All IPC-channel work deferred to Tier-1 followup; this ticket ships pluggable-source seams only |
| BR-2 | (a) renderer-internal sessions-stream filter | Decisions doc §4.1 (auto-ack `f61fab9`) | Ratified mechanically: factory passes `sessions: []` under DEFER; followup wires real accumulator |
| BR-3 | (b) raw-fs `<userData>/max-parallel.json` | Decisions doc §4.1 (auto-ack `f61fab9`) | Interface shipped in `max-parallel-source.ts`; raw-fs reader DEFERRED to followup |
| BR-4 | (b) Out-of-scope (anti-absorption per CLAUDE.md §2.12) | Decisions doc §4.1 | bottom-rail-cost-meter consumer-wiring NOT touched |
| BR-5 | (a) main.ts singleton through `defaultSpawnHandlerDeps` | Decisions doc §4.1 | Singleton instantiation DEFERRED to followup; main.ts sentinel anchor only |
| BR-6 | (c) Skip (derivative of BR-1=(a)) | Decisions doc §4.1 | Absorbed into Tier-1 followup under (b) DEFER scope |

**Implementation arbitrations resolved at HALT 0:**

| ID | Question | Disposition | Source |
|----|----------|-------------|--------|
| Q-PHASE4-BR-IMPL-1 | IPC channel mechanism for bypass-perms fan-out | DEFER (no channel ships) | Operator 2026-05-16 |
| Q-PHASE4-BR-IMPL-2 | `max-parallel-source.ts` directory placement | `src/chat-shell/` accepted (no raw-fs read under DEFER → renderer-bundle safe) | Operator implicit via DEFER ack |
| Q-PHASE4-BR-IMPL-3 | Manifest expansion for `spawn-ipc.ts` | NOT NEEDED (deferred) | Operator 2026-05-16 |
| Q-PHASE4-BR-IMPL-4 | Manifest expansion for `coarchitect-ipc.ts` + `preload.mts` | NOT NEEDED (deferred) | Operator 2026-05-16 |

---

## §4 Architecture summary

### §4.1 Renderer-side pluggable-source seams (`mount.ts`)

Two new factories added under `=== BEGIN: MB-T-PHASE-4-BOTTOM-RAIL ===` sentinel zone, mirroring the T9 `resolveRenderPlanTimerText` pattern (mount.ts:459-470):

**`resolveRenderMaxParallelCounter(opts)`** — resolution order:
1. `opts.renderMaxParallelCounter` explicit override → verbatim (test path).
2. `opts.maxParallelSource` supplied → wraps `<MaxParallelCounter sessions={[]} maxParallel={source.read()} />`. Empty `sessions[]` is honest under DEFER: renderer-side sessions accumulator is itself deferred.
3. Neither → `undefined`; `chat-shell.tsx:261` renders empty slot (preserves T4 WB4 ship semantics; current production state).

**`resolveRenderBypassPerms(opts)`** — resolution order:
1. `opts.renderBypassPerms` explicit override → verbatim (test path).
2. `opts.bypassPermsDispatchMode` supplied → wraps `<BypassPermsIndicator dispatchMode={...} bypassActiveCount={opts.bypassPermsActiveCount}/>`. Visibility per T4 WB12 + T11 render rule.
3. Neither → `undefined`; `chat-shell.tsx:248` renders empty slot.

### §4.2 `max-parallel-source.ts` interface module

NEW module shipped at `packages/dispatch-workstation/src/chat-shell/max-parallel-source.ts` defines:

- `MaxParallelSource` interface — sync `read(): number`.
- `RENDERER_INTERNAL_MAX_PARALLEL_DEFAULT = 16` — preserves T4 WB4 inline-default at `max-parallel-counter.tsx:7-9`.
- `createDefaultMaxParallelSource()` factory — returns const-default impl.

No `node:fs` import — renderer-bundle safe per CLAUDE.md §3.7. Production raw-fs implementation is Tier-1 followup territory (will live in `src/main/` per CLAUDE.md §3.5).

### §4.3 `main.ts` sentinel zone (WB6 documentation anchor)

`=== BEGIN: MB-T-PHASE-4-BOTTOM-RAIL deferred-wiring anchor ===` placed at end-of-file (post line 1395), top-level comment block, OUTSIDE all existing sentinel zones. Zone body documents the 7 deferred items + cites the Tier-1 followup slug for traceability. No runtime behavior changes; comment-only addition.

### §4.4 Production runtime behavior post-ship

| Bottom-rail slot | Pre-ticket state | Post-ticket state | Change |
|------------------|------------------|---------------------|--------|
| MaxParallelCounter | Empty (no factory) | Empty (factory exists but no `maxParallelSource` supplied at auto-mount) | Seam shipped, behavior unchanged |
| BypassPermsIndicator | Empty (no factory) | Empty (factory exists but no `bypassPermsDispatchMode` supplied at auto-mount) | Seam shipped, behavior unchanged |
| Other slots (Plan*, Cost*, ModelMix*, DispatchMode*) | As shipped by T9/T26/T27/T24 | Unchanged | No regression |

**No-regression rationale:** under DEFER scope, the auto-mount block does NOT pass `maxParallelSource` or `bypassPermsDispatchMode` (those are followup-territory wirings). Both factories degrade to `undefined`, and the chat-shell slots render empty — identical to pre-ticket production behavior. The Tier-1 followup will plug both seams at the auto-mount block.

---

## §5 Test evidence

### §5.1 Unit probes (7/7 GREEN at WB6 GREEN landing `10df792`)

```
✓ test/unit/chat-shell/probe-mbtphasebrf-01-max-parallel-mount-wiring.spec.tsx (3 tests)
✓ test/unit/chat-shell/probe-mbtphasebrf-02-bypass-perms-mount-wiring.spec.tsx (2 tests)
✓ test/unit/main/probe-mbtphasebrf-03-main-aggregator-instantiation.spec.ts (2 tests)
```

### §5.2 Typecheck (CLEAN at every WB ship)

`pnpm --filter dispatch-workstation typecheck` → `tsc --noEmit` returns no output after WB2, WB4, WB6 — 5-package single-package focus.

### §5.3 Runtime-launch smoke (CLEAN at WB6 / `10df792`)

Per CLAUDE.md §4.6 (mandatory since `src/main/*.ts` touched):

```
$ MB_TEST_HOOKS=1 ./node_modules/.bin/electron dist/main/main.js
DISPATCH_MODE_IPC_MOUNTED
WINDOW_STATE 1024 768
SPLITTER_LOADED 251
SHELL_READY
RENDER_OK
WINDOW_READY                      ← observed within 12s smoke window
TILE_GRID_MOUNTED
APPROVAL_POLICY_IPC_MOUNTED
AUTOPILOT_IPC_MOUNTED
ONBOARDING_READY
BOOTSTRAP_TOKEN_WRITTEN 44
```

- `WINDOW_READY` count: **1** ✓
- `ERR_MODULE_NOT_FOUND` count: **0** ✓
- All standard mounts wired ✓

(HSO orchestrator-pool tmux warnings are pre-existing local-env state, not caused by this ticket — `__orchestrator_active`/`__orchestrator_standby` tmux sessions persisted from prior dev-env runs.)

### §5.4 Pre-existing failures (NOT caused by this ticket)

Discovered during WB2 + WB8 consumer-non-regression sweeps. Triaged via `cairn-test-failure-triage` agent at WB8 (full report in agent return). Two distinct classes, both pre-existing my session:

**Pre-existing failure class A — T8 WB1 RED still pending:**
- `test/unit/chat-shell/probe-mbtwft8-01-current-stub-state.spec.ts` — 2 failures
- Mechanism: asserts `cost-meter-aggregator.ts` and `bottom-rail-cost-meter-aggregator.ts` `existsSync(...)` truthy; modules absent at HEAD.
- Authored: `31709e0` (T8 ladder WB1 RED before my session)
- Closure: filed as new followup row in §7 (Tier 3 — visibility / not regression).

**Pre-existing failure class B — T9 introduced second `onRateLimitUpdate` subscriber without updating T25 integration test:**
- `test/integration/chat-shell/plan-usage-roundtrip.test.tsx` — 6 failures
- Mechanism: T9 `de6620e` added `PlanTimerTextContainer` (second subscriber to `bridge.onRateLimitUpdate`). T25's fake bridge at `plan-usage-roundtrip.test.tsx:65-71` uses single-slot `captured = cb` (last-writer-wins) → 6 cascading symptoms: subscribeCount 1→2, cleanupCount 1→2, captured cb overwritten, header-bar DOM ordinal shifted, ring SVG never receives state.
- Authored at: T25 WB4 `f448139` (deterministic-fail since T9 ship `de6620e` 2026-05-12)
- Triage report: cairn-test-failure-triage at WB8 (read-only verification; static diff + mechanism analysis; agent `a947daa4c8f72386c`)
- Closure: filed as new followup row in §7 (Tier 2 — deterministic-fail; mechanism-clear; ≤2-line fix in test fake-bridge).

**Per CLAUDE.md §4.5: NOT re-diagnosed beyond WB8 triage.** These are surfaced for operator awareness + new followup row authoring.

---

## §6 Tier-1 followup row body proposed (operator-stamp envelope)

**Per dispatch §11 directive: "WB-final ships with Tier-1 followup row body proposed (gen-5 files pathspec-restricted post WB-final landing)".** The row body is proposed here for operator review; FOLLOWUPS.md edit is operator-territory (read-only in my manifest).

### MB-F-BOTTOM-RAIL-IMPL-PROD-WIRING-DEFERRED-WORKSTATION-CONTRACT-66-AMENDMENT-2026-05-16 (Tier 1)

**Row body draft for `docs/FOLLOWUPS.md` insertion:**

```markdown
| MB-F-BOTTOM-RAIL-IMPL-PROD-WIRING-DEFERRED-WORKSTATION-CONTRACT-66-AMENDMENT-2026-05-16 | Tier 1 — dogfood-blocking pattern (NEW EMERGENT CLASS deferred-prod-wiring-surface-in-operator-dogfood; class anchor at `7c8a957`). MB-T-PHASE-4-BOTTOM-RAIL ticket shipped renderer-side pluggable-source seams in `chat-shell/mount.ts` (`resolveRenderMaxParallelCounter` at `b3e8daf`, `resolveRenderBypassPerms` at `8c905b9`) + `chat-shell/max-parallel-source.ts` interface module + `main.ts` sentinel-zone documentation anchor at `10df792`. Production wiring (items 1-7 below) was deferred under operator BR-IMPL-1=(b) DEFER 2026-05-16 because items 3+4 require amending **`WORKSTATION_CONTRACT.md §6.6` IPC channels — operator-arbitrated frozen contract per CLAUDE.md §1**. Bundling §6.6 amendment with the seam ship would gate the seam on contract arbitration; operator separated them.<br><br>**7 deferred items (Tier-1 followup body):**<br>1. `createBypassPermsSource()` singleton instantiation at `main.ts` app-start (inside MB-T-PHASE-4-BOTTOM-RAIL sentinel zone shipped at `10df792`).<br>2. `spawn-ipc.ts:248-273` `defaultSpawnHandlerDeps` factory population of `bypassPermsSource` field (closes the gap at `spawn-handler.ts:486` where `deps.bypassPermsSource?.recordSpawn` is wired but always falsy in prod today).<br>3. `coarchitect-ipc.ts` `bypassPermsSource.onUpdate` fan-out emitting `coarchitect:bypass-perms-update` to renderer (mirrors `rate-limit-aggregator` fan-out at `coarchitect-ipc.ts:144-150`).<br>4. `preload.mts` `coarchitectBridge.onBypassPermsUpdate` exposure.<br>5. `chat-shell/mount.ts` auto-mount block subscribing to `onBypassPermsUpdate` + threading `bypassPermsActiveCount` + `bypassPermsDispatchMode` into `MountChatShellOptions` (the seams shipped at `8c905b9` accept these as pluggable inputs today; no production caller supplies them).<br>6. NEW `src/main/max-parallel-source.ts` (NOT `src/chat-shell/`) raw-fs `<userData>/max-parallel.json` reader per CLAUDE.md §3.5 splitter-state.ts pattern + new local IPC handler `coarchitect:getMaxParallelLimit` exposing the value to renderer. Renderer-side seam shipped at `b3e8daf` accepts `MaxParallelSource` interface; followup plugs main-process supplier.<br>7. Renderer-side sessions-stream accumulator off `workstationBridge.onSpawnResult` (BR-2=(a) ratification: maintain a Set/Map of sessionName → status keyed off `onSpawnResult` events; expose as `sessions: readonly SessionEntryShape[]` to the `MaxParallelSource`/`MaxParallelCounter` slot).<br><br>**Frozen-contract amendment scope:** items 3+4 require adding `coarchitect:bypass-perms-update` channel (renderer-bound emit) to `WORKSTATION_CONTRACT.md §6.6` IPC contract surface. Operator-arbitrated.<br><br>**Discoverability anchors:** `chat-shell/mount.ts` `MB-T-PHASE-4-BOTTOM-RAIL` sentinel zone; `main.ts` end-of-file `=== BEGIN: MB-T-PHASE-4-BOTTOM-RAIL deferred-wiring anchor ===`; `chat-shell/max-parallel-source.ts` module-header comment; `chat-shell/bypass-perms-indicator.tsx:37-38` ("Consumer plumbing of the aggregator into this prop is deferred to follow-on MB-F-BYPASS-PERMS-CONSUMER-WIRING") — these now point at THIS Tier-1 row.<br><br>**Closure path:** dedicated implementation ticket spinning out items 1-7 with WORKSTATION_CONTRACT.md §6.6 amendment as WB1 RED contract-author step; mirrors `MB-F-MOUNT-WIRING-HTTPSESSIONLISTCLIENT-PROD-WIRING-DEFERRED` precedent at `7c8a957`. Suggested ticket name: `MB-T-PHASE-4-BOTTOM-RAIL-PROD-WIRING-FOLLOWUP`. | MB-T-PHASE-4-BOTTOM-RAIL WB-final (this surface) |
```

**Operator stamp envelope:** ready for pathspec-restricted insertion into `docs/FOLLOWUPS.md` (gen-5 files governance per dispatch §3.9).

---

## §7 New Tier 2/3 followup rows proposed (operator-stamp envelope)

### MB-F-T25-PLAN-USAGE-ROUNDTRIP-INTEGRATION-TEST-STALE-AFTER-T9-AUTOWIRE (Tier 2 — deterministic)

**Row body draft for `docs/FOLLOWUPS.md` insertion:**

```markdown
| MB-F-T25-PLAN-USAGE-ROUNDTRIP-INTEGRATION-TEST-STALE-AFTER-T9-AUTOWIRE | Tier 2 — deterministic fail; mechanism-clear; ≤2-line fix. T9 GREEN `de6620e` added `PlanTimerTextContainer` as second subscriber to `bridge.onRateLimitUpdate` (via `mount.ts:459-470` `resolveRenderPlanTimerText` path-2 auto-wire). T25's integration test `packages/dispatch-workstation/test/integration/chat-shell/plan-usage-roundtrip.test.tsx` (authored at `f448139` before T9 ship) uses single-slot last-writer-wins fake bridge at lines 65-71 (`captured = cb`). Result: 6/6 tests deterministic-fail since 2026-05-12 (T9 ship date) — one mechanism, six symptoms: (a) `subscribeCount 1→2`, (b) `cleanupCount 1→2`, (c) `captured cb` overwritten so PlanUsageRing never receives `fireUpdate`, (d) ring SVG never renders, (e) yellow/red tint testids null, (f) header-bar DOM ordinal of plan-usage shifts 0→1 due to extra plan-timer slot.<br><br>**Fix options:**<br>1. Update test fake bridge to multi-subscriber (add list of `captured` cbs; `fireUpdate` invokes all) AND update assertions to `subscribeCount === 2` + DOM ordinal expectation.<br>2. Pass `renderPlanTimerText: undefined` (or a no-op stub) override in `mountChatShell` opts to skip the path-2 auto-wire in this test specifically.<br><br>Option 2 is the smaller diff; Option 1 is more representative of production multi-subscriber semantics.<br><br>**Discoverability anchors:** test file lines 167, 196, 227, 258, 274, 310 (the 6 failing assertions); mount.ts `resolveRenderPlanTimerText` at line 459-470 (the introducing factory).<br><br>**Cross-ref:** introduced at `de6620e`; surfaced via `cairn-test-failure-triage` at MB-T-PHASE-4-BOTTOM-RAIL WB8. | MB-T-PHASE-4-BOTTOM-RAIL WB8 + WB-final (this surface) |
```

### MB-F-T8-COST-METER-AGGREGATOR-PROBE-MBTWFT8-01-RED-AT-HEAD (Tier 3 — visibility)

**Row body draft for `docs/FOLLOWUPS.md` insertion:**

```markdown
| MB-F-T8-COST-METER-AGGREGATOR-PROBE-MBTWFT8-01-RED-AT-HEAD | Tier 3 — visibility / not regression. T8 WB1 RED probe at `packages/dispatch-workstation/test/unit/chat-shell/probe-mbtwft8-01-current-stub-state.spec.ts` authored at `31709e0` asserts `cost-meter-aggregator.ts` + `bottom-rail-cost-meter-aggregator.ts` `existsSync(...)` truthy. Both modules absent at HEAD (T8 GREEN ship not yet landed). 2/2 deterministic-fail since `31709e0`. NOT a flake; NOT a regression — this is T8's own ladder waiting for its GREEN ship. Surface in CLAUDE.md §4.5 expanded pre-existing failure list so future sessions don't re-diagnose (memory `feedback_followup_row_as_forward_propagation_memory` discipline).<br><br>**Closure path:** T8 WB-N GREEN ships `cost-meter-aggregator.ts` + sibling — both modules existsSync → probe flips. No action needed in MB-T-PHASE-4-BOTTOM-RAIL.<br><br>**Discoverability anchors:** probe file lines 77 (cost-meter-aggregator assertion); CLAUDE.md §4.5 known pre-existing failure list (this followup expands it). | MB-T-PHASE-4-BOTTOM-RAIL WB2 + WB-final (this surface) |
```

---

## §8 RESOLVED stamps proposed

The following FOLLOWUPS.md rows are CANDIDATES for RESOLVED stamps based on this ticket's work — operator-stamp envelope:

| Row | Resolution status | Rationale |
|-----|-------------------|-----------|
| `MB-F-BOTTOM-RAIL-MOUNT-WIRING-FINAL-INTEGRATION` (Tier 2 primary, per dispatch §SCOPE BRIEF) | **PARTIAL — seam-shipped, prod-wiring DEFERRED** | Renderer-side pluggable-source seams shipped at `b3e8daf` + `8c905b9`. Production sources DEFERRED to new Tier-1 followup (§6). Suggested stamp: "PARTIAL — pluggable seams shipped MB-T-PHASE-4-BOTTOM-RAIL WB2/WB4 `b3e8daf`/`8c905b9`; production wiring tracked at MB-F-BOTTOM-RAIL-IMPL-PROD-WIRING-DEFERRED-WORKSTATION-CONTRACT-66-AMENDMENT-2026-05-16 (Tier 1)." |
| `MB-F-BYPASS-PERMS-CONSUMER-WIRING` (Tier 2 absorbed, per dispatch §SCOPE BRIEF) | **PARTIAL — same disposition as above** | Renderer-side `resolveRenderBypassPerms` factory shipped at `8c905b9`. Aggregator-subscription wiring DEFERRED. Suggested stamp: "PARTIAL — renderer seam shipped MB-T-PHASE-4-BOTTOM-RAIL WB4 `8c905b9`; main-process aggregator wiring tracked at MB-F-BOTTOM-RAIL-IMPL-PROD-WIRING-DEFERRED-WORKSTATION-CONTRACT-66-AMENDMENT-2026-05-16 (Tier 1)." |
| `MB-F-MAX-PARALLEL-CONFIG-SOURCE` (Tier 3 via BR-3=(b), per dispatch §SCOPE BRIEF) | **PARTIAL — interface-shipped, raw-fs-reader DEFERRED** | `max-parallel-source.ts` interface module shipped at `b3e8daf`. Raw-fs `<userData>/max-parallel.json` reader DEFERRED. Suggested stamp: "PARTIAL — `MaxParallelSource` interface shipped MB-T-PHASE-4-BOTTOM-RAIL WB2 `b3e8daf`; raw-fs reader (item 6) tracked at MB-F-BOTTOM-RAIL-IMPL-PROD-WIRING-DEFERRED-WORKSTATION-CONTRACT-66-AMENDMENT-2026-05-16 (Tier 1)." |

Operator may prefer FULL RESOLVED stamps with cross-refs to the Tier-1 followup (rather than PARTIAL stamps that linger in OPEN state) — both framings are honest; operator-arbitrated.

---

## §9 Plugin agent dispatches (§11(VIII) evidence)

| WB | Agent | Purpose | Outcome |
|----|-------|---------|---------|
| HALT 0 | `cairn-phase-1-diagnose` | Surface inventory of `mount.ts` / `main.ts` / `splitter-state.ts` precedents + WB ladder readiness | [KNOWN] Full report returned; 8 surface files inventoried + 8 risks surfaced; 4 territory-arbitration questions raised to operator (Q-PHASE4-BR-IMPL-1 through Q-PHASE4-BR-IMPL-4) |
| WB8 | `cairn-test-failure-triage` | Triage 6 plan-usage-roundtrip integration failures | [KNOWN] Pre-existing T9-introduced (de6620e); not my fault; surfaced as Tier 2 followup in §7 |

---

## §10 Confidence labels + verification posture

All factual claims in this document carry [KNOWN] confidence unless explicitly labeled [MODELED]/[SPECULATIVE]. Specifically:
- Cairn ladder commit hashes: [KNOWN] (verified via `git log` at WB-final time)
- 7/7 unit probes GREEN: [KNOWN] (verified at WB6 ship + WB8 re-run)
- Typecheck CLEAN: [KNOWN] (verified at WB2/WB4/WB6)
- Runtime smoke CLEAN: [KNOWN] (verified at WB8)
- Pre-existing failure mechanism attribution: [KNOWN]/[MODELED] per cairn-test-failure-triage report (KNOWN for failure observation; MODELED for "pre-existing at f61fab9" since dynamic re-run at historical commit was forbidden by triage agent's safe-list — static + source-trace evidence used instead)
- Operator decision boundary (DEFER scope): [KNOWN] (operator message 2026-05-16)
- Tier-1 followup row body: [SPECULATIVE] for the exact 7-item decomposition (the body proposes a decomposition the operator may revise; mechanism + frozen-contract intersection are [KNOWN])

---

## §11 Self-check Q1-Q9 (per CONDUCTOR_API_CONTRACT.md §10.5)

| Q | Answer |
|---|--------|
| Q1 (API verified by spike?) | N/A — workstation-internal scope; no external API contact |
| Q2 (Test exercises behavior or MOCKS?) | Source-text + filesystem behavior (existsSync, readFileSync, toMatch); no mocks |
| Q3 (If implementation deleted, test passes?) | NO — deleting any WB2/WB4/WB6 ship artifact flips its respective probe RED |
| Q4 (Anything outside contract spec?) | NO — scope strictly within DEFER ladder; bypass-perms-source / cost-meter / etc. all untouched per BR-4=(b) |
| Q5 (Modified contract without approval?) | NO — `WORKSTATION_CONTRACT.md §6.6` specifically frozen per BR-IMPL-1=(b) DEFER decision; v3 schema unchanged; `CONDUCTOR_API_CONTRACT.md` unchanged |
| Q6 (Any unlabeled claim in commit body?) | NO — every WB commit body carries [KNOWN] labels |
| Q7 (Touched files another parallel session might modify?) | NO — phase-5 session (r12-phase5-tile-header-impl) wrote `src/tile-grid/**`; my manifest FORBIDS that path. Phase-5 interleaved commit `66ff96d` (FOLLOWUPS.md docs only) verified path-disjoint. Phase-5 WB-final commits `4a9633c` + `b2af065` predate my session. No contamination |
| Q8 (Bypass PATCH /v2/sessions/:name/state?) | N/A — workstation-renderer + main-process comment scope; no daemon contact |
| Q9 (Work during unauthorized halt?) | NO — HALT 0 was the only halt this session; cleared at operator PROCEED 2026-05-16 |

---

## §12 Outcome classification

**Capability enabled with known limitations** (per CLAUDE.md §2.11 honest framings):
- Capability enabled: renderer-side pluggable-source seams for MaxParallelCounter + BypassPermsIndicator; interface module establishing the contract Tier-1 followup will plug; documentation anchor in main.ts marking the deferral site.
- Known limitations: production wiring (7 items per §6) is NOT shipped. Production runtime renders bottom-rail slots EMPTY (identical to pre-ticket state). The ticket establishes the seam contract that the Tier-1 followup will plug; it does NOT close the operator-dogfood gap.

This framing is preferred over "Improved" because the operator-observable behavior of the bottom-rail surface is unchanged post-ship — the value delivered is structural (architectural seams + documentation anchor + closure-path traceability), not visible UX.

---

## §13 References

- Build doc: `docs/build-docs/CONDUCTOR_MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION_BUILD.md`
- Decisions doc: `docs/coordination/mb-t-phase-4-bottom-rail-final-integration-decisions-2026-05-13.md`
- Coord doc: `docs/coordination/mb-t-phase-4-bottom-rail-final-integration-impl-coord-2026-05-13.md` (sibling doc; WB-final coord notes)
- Tier-1 precedent: `MB-F-MOUNT-WIRING-HTTPSESSIONLISTCLIENT-PROD-WIRING-DEFERRED` at `7c8a957`
- Manifest: `docs/coordination/territorial-manifests/r12-phase4-bottom-rail-impl.txt`
- Cairn methodology: CLAUDE.md §2 + `docs/cairn-under-stress-round-11.md`
- T9 sibling precedent: commits `de6620e` (mount.ts auto-wire) + `probe-mbtwft9-01-current-stub-state.spec.ts` (probe shape)

---

**End of WB-final findings.** Operator stamp envelope ready for `docs/FOLLOWUPS.md` insertion of §6 + §7 + §8 entries per gen-5 pathspec-restricted governance.
