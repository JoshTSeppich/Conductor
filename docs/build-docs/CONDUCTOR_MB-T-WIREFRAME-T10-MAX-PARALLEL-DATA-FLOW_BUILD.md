# MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW — Bottom-rail max-parallel-counter real-data flow (active-count source + cap-source + mount auto-wire)

**Status:** DRAFT-PENDING-OPERATOR-REVIEW (SPECULATIVE Phase 4 forward-positioning)
**Date authored:** 2026-05-12
**Authored under:** §3.4 operator-supervised mechanical translation discipline (full-build-mode dispatch §3.2) + Round 11 §3.9 Wave 2 SPECULATIVE dispatch (territory manifest `t6-wireframe-t10-body.txt`; SESSION-`t6-ticket-body-0905`; operator-acknowledged speculative-revision risk per §3.9 STATUS FRAMING)
**Authoring delegate:** SESSION-`t6-ticket-body-0905` (Opus 4.7) under orchestrator gen-4 Round 11 cascade — prior ladders MB-T-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-α-β + MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH COMPLETE.
**Authoring anchor commit (HEAD at authoring time):** post-`87c04b6` (T5 WB12 docs landed; verified via dispatch-queue-current.md COMPLETED section)
**Cairn ladder anchor:** full-build-mode dispatch §2 T4 (Bottom rail — Conductor controls) Phase 4 follow-on per P3 PROVISIONAL Phase 4 roadmap `d009e6f` §1.1 row `MB-T-PHASE-4-MAX-PARALLEL-COUNTER-CONFIG-SOURCE` (implied; companion to MB-T-PHASE-4-COST-METER-PER-SESSION-ATTRIBUTION + MB-T-PHASE-4-PLAN-TIMER-RESET-COUNTDOWN-ACCURACY); dispatch §1 wireframe-inventory "max-parallel · 16/16 counter" bottom-rail element.

**SPECULATIVE Phase-4 status:** `[SPECULATIVE per dispatch §3.9 STATUS FRAMING]` Phase 3 visual-verification not yet triggered. Operator explicitly accepts revision-cost via Round 11 Wave 2 cascade. Post-Phase-3 evidence may RATIFY / RESHAPE / DISCARD this ticket. Treat scope as plausible, not committed.

**Closes / advances:**
- `MB-F-MAX-PARALLEL-CONFIG-SOURCE` (Tier 3 — filed at T4 WB14 findings `4e8ec96` §IX per ticket body §3.5 Sub-Q-T4-E disposition) — **primary closure target**: replaces `MaxParallelCounter` renderer-internal `const MAX_PARALLEL = 16` hardcode with operator-configured source per Sub-Q-T10-B resolution.
- `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` (Tier 2 — T4 WB14 findings §IX) — **partial closure (third arm)**: T10 ships MaxParallelCounter mount auto-wire. Sibling T8 (`7abb649`) closed cost-meter arm; sibling T9 (`afd3778`) closed plan-timer arm; T10 closes MaxParallelCounter arm. BypassPermsIndicator arm remains (separate Phase 4 follow-on).
- Full-build-mode dispatch §1 Bottom rail bullet 5 (`max-parallel · 16/16 counter`) — structural ship landed at T4 WB4 (per ticket body `f8fc24d` §4 WB4 + Sub-Q-T4-E=(i) renderer-internal); **this ticket advances max-parallel-counter from renderer-internal-const + sessions-stream-filter → workstation-authoritative source**.
- Audit `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` §10.4 row "max-parallel counter" — advances from SHIPPED-with-renderer-internal-const → SHIPPED-with-authoritative-cap-source.

**Depends on (all merged):**
- MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS (`f8fc24d` ticket body; WB14 docs at `4e8ec96`) — `MaxParallelCounter` component at `packages/dispatch-workstation/src/chat-shell/max-parallel-counter.tsx` + sessions-stream-filter for N count shipped; consumer surface unchanged by T10.
- MB-T-WIREFRAME-T1-SESSION-DATA-FLOW (`4414ef9`) — sessions stream surface that T4's MaxParallelCounter consumes for N count via Sub-Q-T4-E=(i) renderer-internal posture; T10 may EITHER continue consuming this surface OR migrate N source per Sub-Q-T10-A resolution.
- MB-T8 spawn-handler + MB-T6 pool cap-check (`a33d9e5`) — workstation-side pool state precedent if Sub-Q-T10-B=(γ) workstation-pool-state source selected.
- Sibling T8 (`MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW`) at `155933f` (WB-final + β amendment) — architectural pattern reference for data-flow ticket shape (aggregator + emission channel + mount auto-wire).
- Sibling T9 (`MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW`) at `afd3778` (WB8 + runtime smoke) — architectural pattern reference + `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` partial-closure precedent.

**Downstream gates:**
- T7 (Visual polish) — max-parallel-counter visual format already shipped at T4 WB4 (`max-parallel · N/M`); T10 does NOT touch visual rendering.
- T8 + T9 (sibling data-flow tickets) — SHIPPED at Round 10 cascade per dispatch-queue `155933f` + `afd3778`; T10 inherits their `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` partial-closure pattern.
- Future BypassPermsIndicator data-flow ticket — remaining arm of `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` after T10 ships; companion forward-positioning.

**Estimated WB count:** 8-10 baseline (8 WB default path; +1-2 if Sub-Q-T10-B=(γ) workstation-pool-state requires new IPC channel + `WORKSTATION_CONTRACT.md` §6.6 amendment; +1 if Sub-Q-T10-D=(ii) persistence-via-fs-state escalates).

---

## §0 — Reading protocol

1. Read §1 (scope) + §2 (arbitration anchor) first to bind vs deferred work.
2. Read §3 (Sub-Q gate arbitrations) — five operator decisions parameterize WB scope; defaults `[MODELED]` recommendations.
3. Read §4 (WB ladder) for execution order. WBs are construction-order-aware: probe-then-impl per cairn discipline.
4. §5-§9 are operational supports — cross-refs, self-check expectations, definition of done, risk register, IPC amendment outline.

Confidence labels per CLAUDE.md §2.2: `[KNOWN]` observed in this session via direct source read at HEAD post-`87c04b6`; `[MODELED]` reasoned from observed facts plus a stated model; `[SPECULATIVE]` hypothesis without evidence — especially binding for Phase-4 forward-positioned claims per dispatch §3.9 STATUS FRAMING.

---

## §1 — Scope

### §1.1 — What this ticket DOES

`[KNOWN-OPERATOR-ARBITRATED]` per full-build-mode dispatch §2 T4 follow-on + Round 11 Wave 2 SPECULATIVE dispatch territory manifest `t6-wireframe-t10-body.txt`:

1. **Advances `MaxParallelCounter` from T4 Sub-Q-E=(i) renderer-internal posture to authoritative-source posture** per Sub-Q-T10 resolutions. `[KNOWN per T4 ticket body f8fc24d §3.5]`: T4 shipped N (active count) = sessions-stream-filter `status === 'open'` + M (max-parallel limit) = renderer-internal const = 16. T10 advances ONE or BOTH per operator arbitration.

2. **Authoritative N-source per Sub-Q-T10-A** (active session count):
   - (α) **RATIFY renderer-internal sessions-stream filter** (Sub-Q-T4-E=(i) precedent) — no change; explicit re-ratification.
   - (β) Migrate to workstation pool-state source (mirrors MB-T6 cluster-3 pool cap-check pattern at `a33d9e5`).
   - (γ) Daemon-side `/v2/sessions` count with `state=open` filter (cross-package contract surface).

3. **Authoritative M-source per Sub-Q-T10-B** (max-parallel cap):
   - (α) Renderer-internal const = 16 (RATIFY T4 default; honest "wireframe-fixed" stance).
   - (β) Workstation settings file (mirrors `splitter-state.ts` raw-fs pattern per CLAUDE.md §3.5; persisted across launches).
   - (γ) Daemon config / pool config (`/v3/config` or equivalent — cross-package).
   - (δ) BUILD.md preamble `max_parallel: N` field (T5 ticket body Sub-Q-MBTWFT5-D=(iii) deferred candidate — `MB-F-T5-MAX-PARALLEL-T4-DEPENDENCY` Tier 3 cross-reference).

4. **Emission channel per Sub-Q-T10-C**:
   - (i) Direct prop-drilled from chat-shell host (RATIFY T4 WB4 default; renderer reads sessions stream + const).
   - (ii) New IPC `workstation:max-parallel-state` push channel — main emits `{ activeCount: number; maxParallel: number }`; preload bridge subscribes; `WORKSTATION_CONTRACT.md` §6.6 amendment required.
   - (iii) Hybrid — (i) for N (renderer-side derivation cheap) + (ii) for M (operator-configured).

5. **Mount auto-wire** (closes `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` MaxParallelCounter arm): MOD `packages/dispatch-workstation/src/chat-shell/mount.ts` adding `resolveRenderMaxParallelCounter()` returning a closure that subscribes to N + M sources (per Sub-Q-T10-A + Sub-Q-T10-B) + supplies `<MaxParallelCounter activeCount={N} maxParallel={M} />`. Mirrors `resolveRenderCostMeter` (T8 `7abb649`) + `resolveRenderPlanTimerText` (T9 `afd3778`) precedent.

6. **Persistence per Sub-Q-T10-D** (only if Sub-Q-B=(β) workstation-settings-file selected):
   - (i) No persistence (M is process-singleton; default applies on launch).
   - (ii) `fs.readFileSync` of `<userData>/max-parallel.json` mirror `splitter-state.ts` 35-line pattern per CLAUDE.md §3.5 (raw fs; `MB_MAX_PARALLEL_STATE_DIR` env-var override for test isolation).

7. **Cadence per Sub-Q-T10-E**:
   - (α) Synchronous (each render reads sources fresh — works for prop-drilled cheap derivations).
   - (β) Interval poll (only if Sub-Q-B=(γ) daemon-config requires polling).
   - (γ) Event-driven (only if Sub-Q-C=(ii) push-channel selected — push emits on M-config change).

8. **Audit reclassification + FOLLOWUPS closure stamps**: WB-final docs update audit §10.4 row + close/advance `MB-F-MAX-PARALLEL-CONFIG-SOURCE` Tier 3 + partial-close `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` Tier 2 (MaxParallelCounter arm — BypassPermsIndicator arm remains).

### §1.2 — What this ticket DOES NOT

`[KNOWN-OPERATOR-ARBITRATED]` constraints:

- Does NOT modify `MaxParallelCounter` component body (`max-parallel-counter.tsx`) — pure prop-driven; consumer-surface stable; data-flow change is upstream-only.
- Does NOT modify `chat-shell.tsx` slot props — T4 WB4 slot-integration shipped; T10 changes only what the slot's prop-supplier provides.
- Does NOT modify `TileGridSessionEntry` shape — N count under Sub-Q-A=(α/β) consumes existing sessions stream OR pool-state without schema additions.
- Does NOT close `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` Tier 2 in full — only the MaxParallelCounter arm; BypassPermsIndicator arm remains (separate Phase 4 follow-on).
- Does NOT modify v2/v3 schemas (no daemon contract additions in default path).
- Does NOT modify `WORKSTATION_CONTRACT.md` §6.6 unless Sub-Q-T10-C=(ii) push channel selected (then `contract:` amendment scope surfaces at HALT-WB-PRE-COMMIT per CLAUDE.md §2.4 — separate operator-arbitrated commit).
- Does NOT introduce electron-store; persistence (if Sub-Q-D=(ii) selected) mirrors `splitter-state.ts` raw fs pattern per CLAUDE.md §3.5.
- Does NOT touch Frame C / tile-grid / action-bar / detail-pane / chat panel body — strictly bottom-rail max-parallel-counter data territory.
- Does NOT advance `MB-F-T5-MAX-PARALLEL-T4-DEPENDENCY` Tier 3 closure (T5 ticket-body cross-reference) — that row tracks T5 dispatch-loop reading max-parallel from T10's source; T10 ships M-source but T5 consumer wiring is sibling territory and out-of-T10-scope.
- Does NOT modify dispatch-mode-store (MB-T24); max-parallel is orthogonal to auto/ask mode.
- Does NOT introduce a new spawn-pool implementation; Sub-Q-B=(β) workstation-pool-state assumes existing pool surface (MB-T6 cluster-3 cap-check at `a33d9e5`).

---

## §2 — Arbitration anchor (operator-frozen via Round 11 §3.9 Wave 2 dispatch + full-build-mode dispatch 2026-05-11)

### §2.1 — Round 11 §3.9 Wave 2 dispatch enumeration (binding)

`[KNOWN-OPERATOR-ARBITRATED]`

Per Round 11 §3.9 Wave 2 dispatch-queue-current.md row for `t6-ticket-body-0905`:
> MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW ticket body draft (forward-position Phase 4 ticket)

Operator-supplied scope-frame:
> Phase 4 follow-on to T4-shipped MaxParallelCounter placeholder; read T4/T8/T9 ticket bodies as precedent.

`[KNOWN-OPERATOR-PRE-ARBITRATED]` constraints derived from dispatch frame:
- Scope = max-parallel-counter data flow (NOT visual, NOT new component).
- Source-of-truth direction = "Phase 4 follow-on to MaxParallelCounter placeholder" — biases Sub-Q-T10-A + Sub-Q-T10-B toward escalation from T4's renderer-internal posture; (α) RATIFY remains admissible but operator-direction suggests at least one source escalates.
- Sibling pattern (T8 + T9) = aggregator + emission channel + mount auto-wire — T10 inherits this architectural pattern.

### §2.2 — Visual-comparison gate (dispatch §3.5)

`[KNOWN-OPERATOR-ARBITRATED]`

Per full-build-mode dispatch §3.5: `green:wiring` AUTO-ACK requires headless screenshot generation OR operator-manual-screenshot fallback. T10 is data-flow (not visual), but WB-final smoke per CLAUDE.md §4.6 verifies that `MaxParallelCounter` renders `N/M` text with non-stub values post-Sub-Q-A/B resolution. Until T6/MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING headless pipeline ships (in flight per `030c2d6`), operator-manual-screenshot fallback at HALT-WB-FINAL-PRE-COMMIT.

### §2.3 — Frozen-contract amendment scoping (binding pattern)

`[KNOWN-OPERATOR-ARBITRATED]`

Per dispatch §3.3: NEW IPC channels require `WORKSTATION_CONTRACT.md` §6.6 amendment per CLAUDE.md §2.4 (operator-arbitrated separate `contract:` commit). T10 default Sub-Q recommendations minimize new-channel introductions (Sub-Q-T10-C=(i) prop-drilled default; Sub-Q-T10-A=(α) RATIFY existing source; Sub-Q-T10-B=(β) settings-file workstation-internal). Non-default selections escalate amendment scope.

If T10 + future BypassPermsIndicator data-flow ticket both adopt new-IPC paths, recommend single consolidated `contract(GATE-T10-BPI-§6.6-additions): ...` commit covering both channels (mirrors T4 + T8/T9 +§6.6 consolidated-amendment precedent).

### §2.4 — Construction order (file ownership for parallel-CC discipline)

`[KNOWN per Round 11 §3.9 Wave 2 manifest + this ticket §5.3]`

T10 primary territory (WRITE per manifest):
- `docs/build-docs/CONDUCTOR_MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW_BUILD.md` (this ticket body)
- `docs/coordination/mb-t-wireframe-t10-decisions-2026-05-12.md` (Sub-Q resolutions when operator acks)

T10 execution-phase territory (NOT in current ticket-body-authoring manifest; surfaces at execution-phase dispatch):
- CONDITIONAL NEW `packages/dispatch-workstation/src/main/max-parallel-state.ts` (Sub-Q-T10-B=(β) settings-file path; mirrors `splitter-state.ts` raw-fs pattern)
- MOD `packages/dispatch-workstation/src/chat-shell/mount.ts` (add `resolveRenderMaxParallelCounter()` mirroring `resolveRenderCostMeter` / `resolveRenderPlanTimerText`; closes MaxParallelCounter arm of `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING`)
- CONDITIONAL MOD `packages/dispatch-workstation/src/main/main.ts` sentinel zone (aggregator startup wiring + IPC handler registration if Sub-Q-T10-C=(ii))
- CONDITIONAL MOD `packages/dispatch-workstation/src/main/preload.mts` (new bridge method if Sub-Q-T10-C=(ii))
- CONDITIONAL MOD `WORKSTATION_CONTRACT.md` §6.6 (amendment if Sub-Q-T10-C=(ii); separate `contract:` commit per CLAUDE.md §2.4)
- WB-final NEW `docs/coordination/mbtwft10-findings-2026-05-12.md`
- WB-final MOD `docs/FOLLOWUPS.md` (close `MB-F-MAX-PARALLEL-CONFIG-SOURCE`; partial-close `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` MaxParallelCounter arm)

`[KNOWN]` per Round 11 §3.9.A manifest enforcement: this ticket-body authoring DOES NOT touch any execution-phase file. Execution-phase territory boundaries surface at the execution-dispatch cycle.

Path-disjoint from co-active sub-sessions per dispatch-queue-current.md Wave 2:
- `c5-ticket-wb1` (trinity integration): `src/tile-grid/tile-grid-app.tsx` — path-disjoint from `src/chat-shell/`.
- `commit-plan-doc-1334` (spawnMode field): `src/tile-grid/tile-grid.tsx` + `src/main/spawn-handler.ts` — path-disjoint from T10 execution territory at body-authoring time.
- `t1-ticket-body-0905` (chat-shell polish): `src/chat-shell/conductor-brand.tsx` + visual styling — path-overlap risk with T10 execution-phase `chat-shell/mount.ts`; coordinate edit window at T10 execution dispatch.
- `t3-ticket-body-0905` (lookup-session production wiring): `src/main/frame-c-ipc-deps-production.ts` — path-disjoint from T10.

Path-overlap risk (execution-phase only, not body-authoring):
- `chat-shell/mount.ts` is touched by T8 (cost-meter slot, shipped `7abb649`) + T9 (plan-timer slot, shipped `afd3778`) + future T10 (max-parallel slot) — sequential slot additions in same file. T10 execution-phase must coordinate with `t1-ticket-body-0905` if that session also edits `mount.ts`.
- `coarchitect-ipc.ts` was shared by T8 + T9 — T10 default path does NOT touch `coarchitect-ipc.ts` (Sub-Q-T10-C=(i) prop-drilled; no IPC handler). If Sub-Q-C=(ii) selected, new IPC handler lives in NEW `max-parallel-ipc.ts` not `coarchitect-ipc.ts` per Wave C #3 separation precedent.

---

## §3 — Sub-Q gate arbitrations REQUIRED before specific WBs

Five operator decisions parameterize WB scope. Surface at HALT-TICKET-BODY-PRE-COMMIT for batch resolution. Defaults if unresolved are `[MODELED]` recommendations.

### §3.1 — Sub-Q-T10-A: Active-count (N) source

Required before **WB2** (N-source probe) + **WB3** (impl). Default if unresolved: **(α) RATIFY renderer-internal sessions-stream filter**.

`[KNOWN]` per direct-read of T4 ticket body `f8fc24d` §3.5 + WB4 spec:
- T4 WB4 shipped Sub-Q-T4-E=(i) renderer-internal posture: N = T1 sessions stream filtered by `status === 'open'`.
- T1 sessions stream surface lives at `tile-grid/tile-grid-app.tsx` state + `tile-grid/mount.ts:185` workstationBridge pass-through.
- MB-T6 cluster-3 pre-spawn pool cap-check at `a33d9e5` operates on workstation pool state (`packages/dispatch-workstation/src/main/spawn-pool.ts` or equivalent).
- Daemon `/v2/sessions` GET returns active session list with `state` field per existing endpoint.

| Option | Mechanism | Frozen-surface touch | Effort |
|---|---|---|---|
| (α) RATIFY renderer-internal (recommended) | Continue Sub-Q-T4-E=(i): `MaxParallelCounter` receives N via prop-drilled sessions-stream filter at chat-shell `mount.ts` `resolveRenderMaxParallelCounter()`. Explicit re-ratification removes ambiguity. | NONE | ZERO (mount-wire only) |
| (β) Workstation pool-state | NEW `chat-shell/mount.ts` reads workstation pool state via existing surface (MB-T6 cluster-3 precedent); N = pool.activeSessionCount. Authoritative for spawn-loop accounting; may diverge from sessions stream during transient states (spawn-in-flight, kill-pending). | NONE if pool surface already exposed; CONDITIONAL new IPC if pool state is main-process-only | LOW-MEDIUM (depends on pool surface exposure) |
| (γ) Daemon-side `/v2/sessions` count | Workstation polls daemon endpoint, filters by `state === 'open'`. Authoritative cross-package; introduces poll cadence + network dep. | NONE (existing endpoint) | LOW (poll wiring); coordinate cadence with sibling tickets |

`[MODELED]` Recommend **(α) RATIFY** for ship-velocity + matches Sub-Q-T4-E=(i) operator arbitration + no new wiring beyond mount auto-wire (which closes `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` arm anyway). Rationale: sessions stream IS authoritative for "displayed session count" per T1's surface; pool-state divergence under transient conditions is an edge case operator does not observe in the counter (operator sees displayed sessions, counter matches). (β) is admissible if Phase 3 dogfood surfaces transient-state divergence as load-bearing. (γ) is heavier and couples to daemon roadmap unnecessarily.

Operator decision pending.

### §3.2 — Sub-Q-T10-B: Max-parallel (M) source-of-truth

Required before **WB2** (M-source probe) + **WB3** (impl). Default if unresolved: **(β) Workstation settings file (`splitter-state.ts` raw-fs pattern; default = 16 on first-launch)**.

`[KNOWN]` per direct-read of T4 ticket body `f8fc24d` §3.5 + WB4 spec:
- T4 WB4 shipped renderer-internal `const MAX_PARALLEL = 16` per Sub-Q-T4-E=(i).
- `splitter-state.ts` at `packages/dispatch-workstation/src/main/splitter-state.ts` (35 lines, raw fs `readFileSync`/`writeFileSync` of `<userData>/splitter-state.json`; `MB_SPLITTER_STATE_DIR` env-var override) is the canonical persistence pattern per CLAUDE.md §3.5.
- Daemon configuration surface lives at `packages/dispatch-daemon/src/routes/config.ts` or equivalent (`[SPECULATIVE]` — verify at execution-phase WB1 reading scope).
- T5 ticket body Sub-Q-MBTWFT5-D=(iii) deferred BUILD.md preamble `max_parallel: N` field as Tier 3 candidate per `MB-F-T5-MAX-PARALLEL-T4-DEPENDENCY`.

| Option | Mechanism | Frozen-surface touch | Effort | Persistence |
|---|---|---|---|---|
| (α) Renderer-internal const = 16 (RATIFY T4) | No change; honest "wireframe-fixed" stance per Sub-Q-T4-E=(i). | NONE | ZERO | None |
| (β) Workstation settings file (recommended) | NEW `main/max-parallel-state.ts` mirroring `splitter-state.ts` raw-fs pattern; reads `<userData>/max-parallel.json` `{ maxParallel: number }`; default = 16 on first-launch missing-file; operator may edit JSON file directly (no UI surface in this ticket; UI deferred). `MB_MAX_PARALLEL_STATE_DIR` env-var override for test isolation. | NONE (workstation-internal per CLAUDE.md §2.10) | LOW (35-line module + read at mount-wire site) | Persisted across launches |
| (γ) Daemon config / pool config | Workstation reads daemon `/v3/config` or equivalent for max-parallel; daemon owns source-of-truth. | YES — `WORKSTATION_CONTRACT.md` §6.6 amendment (workstation IPC channel) OR daemon endpoint addition | MEDIUM (cross-package contract) | Daemon-side |
| (δ) BUILD.md preamble `max_parallel: N` field | T5 `MB-F-T5-MAX-PARALLEL-T4-DEPENDENCY` Tier 3 candidate; parser-side change (MB-T28 amendment); per-BUILD.md customization. | YES — MB-T28 parser amendment + workstation-side BUILD.md observer | HIGH (parser change + observer wiring) | Per-BUILD.md |
| (ε) Hybrid (β + δ) | (β) workstation default; (δ) BUILD.md override when present. | YES if (δ) included | HIGH | Per-BUILD.md + workstation fallback |

`[MODELED]` Recommend **(β) workstation settings file** for ship-velocity + persistence + zero-frozen-surface-touch + matches `splitter-state.ts` precedent. Rationale: operator-configurable max-parallel is the natural escalation from T4's renderer-internal const; settings file (raw fs JSON) is the cheapest persistence per CLAUDE.md §3.5; UI surface for editing is deferred to follow-on ticket (operator may edit JSON directly initially — same posture as `splitter-state.json` UX precedent). (α) RATIFY is honest if operator prefers no config-surface yet. (γ) daemon-config is architecturally cleaner but couples to daemon roadmap. (δ) BUILD.md preamble is `MB-F-T5-MAX-PARALLEL-T4-DEPENDENCY` closure path but requires MB-T28 amendment. (ε) hybrid is forward-compat but +1-2 WBs.

Operator decision pending.

### §3.3 — Sub-Q-T10-C: Emission channel

Required before **WB4** (channel probe) + **WB5** (impl). Default if unresolved: **(i) Prop-drilled from chat-shell host (RATIFY T4 WB4 + mount auto-wire pattern)**.

| Option | Mechanism | Frozen-surface touch | Effort |
|---|---|---|---|
| (i) Prop-drilled (recommended) | `mount.ts` `resolveRenderMaxParallelCounter()` reads sources synchronously per render: N from sessions stream filter (Sub-Q-A=α) + M from settings file read (Sub-Q-B=β) OR pool state. Component receives final values as props. | NONE | LOW (mount auto-wire only) |
| (ii) NEW IPC `workstation:max-parallel-state` push channel | Main emits `{ activeCount: number; maxParallel: number }` via push; preload bridge subscribes; renderer auto-updates. Forward-compat for operator-edits-settings-file → live workstation update. | YES — `WORKSTATION_CONTRACT.md` §6.6 amendment | MEDIUM (+1 WB) |
| (iii) Hybrid | Prop-drilled for N (renderer-cheap derivation); push channel for M (operator-edit-aware). | YES if (ii) portion adopted | HIGH (+2 WBs) |

`[MODELED]` Recommend **(i)** for ship-velocity + zero-§6-touch + matches T8/T9 mount auto-wire pattern. Rationale: M-source under Sub-Q-B=(β) settings file is read-on-mount (operator must restart workstation to apply edits initially — acceptable v1 UX per `splitter-state.json` precedent which also requires restart). Sub-Q-C=(ii) push channel is the natural escalation if operator-load-bearing on live updates; defer as follow-on Tier 3 `MB-F-MAX-PARALLEL-LIVE-RELOAD` if operator visual-diff post-Phase 3 surfaces stale counter behavior.

Operator decision pending.

### §3.4 — Sub-Q-T10-D: Persistence (only applies if Sub-Q-B=(β))

Required before **WB3** (M-source impl). Default if unresolved: **(ii) `fs.readFileSync` of `<userData>/max-parallel.json` mirroring `splitter-state.ts`**.

`[KNOWN]` per `splitter-state.ts` direct read (verified in prior T5 ladder WB2 reading scope):
- 35-line module; `MB_SPLITTER_STATE_DIR` env-var override for test isolation; default fall-through on missing-file or parse error; non-fatal best-effort persistence.

| Option | Mechanism | Effort |
|---|---|---|
| (i) No persistence | M is process-singleton via const fallback (Sub-Q-B=(α) RATIFY); on launch, always = 16. | ZERO |
| (ii) `splitter-state.ts` pattern (recommended) | NEW `main/max-parallel-state.ts` raw-fs read/write; reads on launch; defaults to 16 on missing-file; env-var override for tests. | LOW (~35 lines) |
| (iii) electron-store | New dev dependency; structured API; overkill for single number. | MEDIUM (dep + setup) |

`[MODELED]` Recommend **(ii)** for matched-precedent + zero-dep-add + 35-line scope. Sub-Q-D=(iii) electron-store is explicitly excluded by CLAUDE.md §3.5 ("Do NOT install electron-store unless explicitly authorized"). Sub-Q-D=(i) only applies if Sub-Q-B=(α) RATIFY-const is selected.

Operator decision pending.

### §3.5 — Sub-Q-T10-E: Cadence (only applies if Sub-Q-A or Sub-Q-B introduces async source)

Required before **WB6** (cadence probe) + **WB7** (impl). Default if unresolved: **(α) Synchronous per-render reads**.

| Option | Cadence | Cost characteristic | Sub-Q-A/B compatibility |
|---|---|---|---|
| (α) Synchronous per-render (recommended) | Each component render reads N + M sources fresh. | Zero idle cost; per-render cost is O(1) for both filter + fs read. | Sub-Q-A=(α) + Sub-Q-B=(α/β); incompatible with (γ) daemon-poll. |
| (β) Interval poll (e.g., 30s/60s) | Poll N + M sources at interval; cache + emit on change. | Moderate idle cost; matches daemon-poll cadence. | Sub-Q-A=(γ) + Sub-Q-B=(γ); required for cross-package sources. |
| (γ) Event-driven (push) | Subscribe to source change events; emit only on diff. | Minimal; optimal for fs-watch + daemon-SSE. | Requires Sub-Q-C=(ii) push channel. |

`[MODELED]` Recommend **(α)** for ship-velocity + matches Sub-Q-A=(α) + Sub-Q-B=(β) default. N (sessions stream) re-derives on every render anyway (React state dep); M (fs read) caches via mount-time once-per-launch + re-read on render is cheap. Sub-Q-E=(β/γ) only load-bearing if cross-package sources adopted.

Operator decision pending.

---

## §4 — WB ladder

8 WBs baseline (defaults Sub-Q-A=α + B=β + C=i + D=ii + E=α); 9-10 WBs if alternates selected (e.g., Sub-Q-C=(ii) adds new IPC + amendment WB; Sub-Q-B=(γ) adds daemon endpoint WB).

Each WB follows cairn methodology: red authors failing probe; green implements minimum; commit body carries Q1-Q9 self-check per CONDUCTOR_API_CONTRACT.md §10.5; per-path `git add` per CLAUDE.md §2.7; pathspec-on-commit form per `MB-F-METHODOLOGY-CROSS-SESSION-STAGING-CONTAMINATION` Tier 1 closure path α (`git commit -m "..." -- <pathspec>`); push after each cairn-grammar commit per §2.6.

**T6 α + β gates operative this ticket** per `0d71590` §C envelope amendment: each `green:wiring` commit MUST (1) declare a fingerprint set in commit body §F-Fingerprints; (2) run `pnpm --filter dispatch-workstation verify:build-freshness` post-impl; (3) run `pnpm --filter dispatch-workstation verify:bundle-fingerprint --fingerprint <s1> ...` per affected dist artifact.

### WB1 — `red(MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW): probe-mbtwft10-01-max-parallel-state-module`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/unit/max-parallel-state/probe-mbtwft10-01-max-parallel-state-module.spec.ts` (NEW dir). Asserts (Sub-Q-B=(β) default path):
- `readMaxParallel()` from `src/main/max-parallel-state.ts` exports as function.
- Returns 16 (default) when state file absent.
- Returns persisted value when state file present.
- Respects `MB_MAX_PARALLEL_STATE_DIR` env-var override for test isolation.

Probe fails RED — module absent. WB2 GREEN ships the module.
**Acceptance:** probe RED. Commit body Q1-Q9. §F-Fingerprints: N/A (RED).

### WB2 — `green(MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW): max-parallel-state.ts impl (splitter-state.ts mirror)`

**Type:** green
**Scope:** GREEN at NEW `packages/dispatch-workstation/src/main/max-parallel-state.ts` (~35 lines mirroring `splitter-state.ts` pattern):
- `readMaxParallel(): number` — reads `<userData>/max-parallel.json` `{ maxParallel: number }`; returns 16 on missing-file or parse error; respects `MB_MAX_PARALLEL_STATE_DIR` env-var override.
- `writeMaxParallel(maxParallel: number): void` — writes JSON file; best-effort persistence.

**Acceptance:** WB1 RED → GREEN. Commit body Q1-Q9. §F-Fingerprints: `readMaxParallel`, `writeMaxParallel`, `max-parallel-state.ts` filename.

### WB3 — `red(MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW): probe-mbtwft10-02-resolve-render-max-parallel-counter`

**Type:** red
**Scope:** RED probe at `probe-mbtwft10-02-resolve-render-max-parallel-counter.spec.tsx` (in chat-shell test dir or shared mount test dir). Asserts:
- `resolveRenderMaxParallelCounter(deps)` from `chat-shell/mount.ts` returns a render closure.
- Closure consumes sessions-stream prop (Sub-Q-A=(α)) + M-supplier (Sub-Q-B=(β) settings file) DI seam.
- Renders `<MaxParallelCounter activeCount={N} maxParallel={M} />` with N = filtered sessions count + M = readMaxParallel() return.
- Mirrors `resolveRenderCostMeter` (T8 `7abb649`) + `resolveRenderPlanTimerText` (T9 `afd3778`) precedent.

Probe fails RED — function absent at mount.ts. WB4 GREEN adds it.
**Acceptance:** probe RED.

### WB4 — `green(MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW): resolveRenderMaxParallelCounter mount auto-wire`

**Type:** green
**Scope:** GREEN at MOD `packages/dispatch-workstation/src/chat-shell/mount.ts`:
- Add `resolveRenderMaxParallelCounter(deps)` function mirroring `resolveRenderCostMeter` + `resolveRenderPlanTimerText` precedent.
- Wire into chat-shell slot per existing T4 WB4 slot-integration.

**Acceptance:** WB3 RED → GREEN. Commit body Q1-Q9. §F-Fingerprints: `resolveRenderMaxParallelCounter`, `MaxParallelCounter` (re-bundled into chat-shell renderer).
**Coordination:** path-overlap risk with sibling sub-sessions editing `mount.ts` (T1-polish, T8 cost-meter slot already shipped, T9 plan-timer slot already shipped). Coordinate edit window via coord note OR sequence at execution dispatch.

### WB5 — `red(MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW): probe-mbtwft10-03-counter-renders-real-data`

**Type:** red
**Scope:** RED probe at `probe-mbtwft10-03-counter-renders-real-data.spec.tsx`. Asserts:
- With mocked sessions stream (3 open + 2 closed) + mocked settings file (M=8), `<MaxParallelCounter>` renders `max-parallel · 3/8` (NOT `max-parallel · N/16` const).
- With sessions stream empty + missing settings file, renders `max-parallel · 0/16` (default M fallback).

Probe fails RED — mount auto-wire absent OR settings-file read absent.
**Acceptance:** probe RED.

### WB6 — `green(MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW): consumer-integration end-to-end`

**Type:** green
**Scope:** GREEN — finalize end-to-end consumer integration:
- Verify chat-shell slot consumes `resolveRenderMaxParallelCounter` output correctly.
- Verify operator-edits-settings-file → workstation-relaunch updates displayed M (Sub-Q-C=(i) prop-drilled cadence per Sub-Q-E=(α) synchronous; no live-reload).

**Acceptance:** WB5 RED → GREEN. Commit body Q1-Q9. §F-Fingerprints: per WB4 + sessions-stream-filter logic.

### WB7 — `green(MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW): runtime-launch smoke + α/β verification`

**Type:** green (smoke harness)
**Scope:** per CLAUDE.md §4.6 + T6 α/β envelope:
1. Build dispatch-core + dispatch-workstation.
2. Verify α PASS via `pnpm --filter dispatch-workstation verify:build-freshness --dist-path dist/main/main.js`.
3. Verify β PASS via `pnpm --filter dispatch-workstation verify:bundle-fingerprint --dist-path dist/main/main.js --fingerprint "readMaxParallel"` + `dist/chat-shell/renderer.js --fingerprint "MaxParallelCounter" --fingerprint "resolveRenderMaxParallelCounter"`.
4. Launch electron from dist; observe `WINDOW_READY` within ~10s.
5. With `~/Library/Application Support/foxworks-dispatch/max-parallel.json` present, observe counter renders persisted M.
6. Operator visual diff: counter matches wireframe `max-parallel · N/M` text per dispatch §1.

**Acceptance:** smoke evidence at `docs/coordination/mbtwft10-runtime-smoke-2026-05-12.md` (or appropriate date).

### WB8 — `docs(MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW): findings doc + FOLLOWUPS closure stamps`

**Type:** docs
**Scope:** author `docs/coordination/mbtwft10-findings-2026-05-12.md` per `mbtwft5-findings-2026-05-12.md` format anchor.

Followup updates to `docs/FOLLOWUPS.md`:
- Close `MB-F-MAX-PARALLEL-CONFIG-SOURCE` Tier 3 per Sub-Q-T10-B resolution.
- Partial-close `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` Tier 2 — MaxParallelCounter arm closed; BypassPermsIndicator arm remains (future Phase 4 ticket).
- File NEW Tier 3 follow-ons if Sub-Q-C=(i) selected:
  - `MB-F-MAX-PARALLEL-LIVE-RELOAD` — Sub-Q-C=(ii) push-channel candidate for live operator-edit propagation.
  - `MB-F-MAX-PARALLEL-CONFIG-UI` — operator UX surface for editing M (currently JSON-file edit only).
- File NEW Tier 3 follow-on if Sub-Q-D=(ii) settings-file: `MB-F-T10-T5-MAX-PARALLEL-CONSUMER-WIRING` — cross-reference `MB-F-T5-MAX-PARALLEL-T4-DEPENDENCY` Tier 3 (T5 dispatch-loop consumes M from T10's settings-file source).

**Acceptance:** findings doc + FOLLOWUPS updates land. Commit body Q1-Q9.

---

## §5 — Cross-references

### §5.1 — Followups CLOSED or stamped by this ticket

| Followup / Row | Tier | Closure path | Closing WB |
|---|---|---|---|
| `MB-F-MAX-PARALLEL-CONFIG-SOURCE` | Tier 3 (T4 WB14 findings) | Sub-Q-T10-B resolution | WB8 |
| `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` (MaxParallelCounter arm) | Tier 2 (T4 WB14 findings) | WB4 mount auto-wire | WB8 partial-close stamp |

### §5.2 — Followups likely to surface during this ticket

`[MODELED-SPECULATIVE]`:

- WB2 may surface `MB-T6` pool surface drift if Sub-Q-A=(β) selected — verify at execution-phase WB1 reading scope.
- WB4 may surface `chat-shell/mount.ts` sentinel-zone conflicts if T1-polish or other sibling edited slot positions — coordinate via coord note.
- WB6 may surface operator-edit-without-relaunch surprise if Sub-Q-E=(α) synchronous-per-render cadence is selected — file `MB-F-MAX-PARALLEL-LIVE-RELOAD` Tier 3 at WB8.
- WB7 smoke may surface BUILD.md preamble override drift if Sub-Q-T5-D=(iii) cross-ticket-dep is pursued post-Phase 3.

### §5.3 — Related shipped tickets (read-required at execution-phase WB1 start)

| Ticket | Anchor | Read scope at execution-phase WB1 |
|---|---|---|
| MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS | `f8fc24d` ticket body; WB14 docs `4e8ec96` | `packages/dispatch-workstation/src/chat-shell/max-parallel-counter.tsx` + `chat-shell.tsx` slot integration |
| MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW | `155933f` (WB-final) | `packages/dispatch-workstation/src/chat-shell/mount.ts` `resolveRenderCostMeter` precedent |
| MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW | `afd3778` (WB8 + smoke) | `packages/dispatch-workstation/src/chat-shell/mount.ts` `resolveRenderPlanTimerText` precedent |
| MB-T-WIREFRAME-T1-SESSION-DATA-FLOW | `4414ef9` | sessions stream surface for Sub-Q-A=(α) N count |
| MB-T6 cluster-3 pool cap-check | `a33d9e5` | workstation pool state surface for Sub-Q-A=(β) |
| MB-T-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-α-β | `40fde1e` (WB6 docs) | T6 α + β methodology infra (operative this ticket per WB) |
| splitter-state.ts precedent | `packages/dispatch-workstation/src/main/splitter-state.ts` | Sub-Q-D=(ii) raw-fs persistence pattern per CLAUDE.md §3.5 |

### §5.4 — Plan-doc anchors (read at execution-phase WB1 start)

- `docs/coordination/full-build-mode-dispatch.md` `4f0bbde` §1 wireframe-inventory bottom-rail "max-parallel · 16/16 counter" + §2 T4 workstream + §3.3 IPC arbitration anchor + §3.5 visual-comparison gate
- `docs/coordination/phase-4-tier-1-roadmap-draft.md` §1.4 + §4 Cluster F (validation-driven) — T10 is implicit Phase 4 candidate per "max-parallel-counter accuracy" Phase 3 trigger
- `docs/coordination/orchestrator-state-current.md` §8 auto-ack scope (α + β PASS conditions per T6 envelope)

### §5.5 — Stale-dispatch + missing-reference reconciliation

`[KNOWN per Round 11 §3.9 anti-fabrication check]`:
- T4 MaxParallelCounter SHIPPED at WB4; not stub-from-scratch.
- T8 + T9 sibling data-flow tickets SHIPPED at Round 10 cascade; mount auto-wire pattern established + `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` partial-closure precedent landed.
- Round 11 §3.9 dispatch frames T10 as "forward-position Phase 4 follow-on" — matches T8/T9 sibling pattern (T8/T9 were also forward-positioned Phase 4 at Round 10).
- `splitter-state.ts` precedent verified at T5 ladder reading scope; raw-fs persistence pattern is canonical per CLAUDE.md §3.5.

---

## §6 — Self-check Q1-Q9 expectations per WB commit (CONDUCTOR_API_CONTRACT.md §10.5)

Each cairn-grammar commit body answers all nine questions. Expected shapes per WB type:

| WB | Q1 (spike?) | Q2 (mocks?) | Q3 (impl-deleted-passes?) | Q4 (outside contract?) | Q5 (frozen mod?) | Q6 (labels?) | Q7 (parallel territory?) | Q8 (bypass PATCH?) | Q9 (halt-unauth?) |
|---|---|---|---|---|---|---|---|---|---|
| WB1 RED | N/A — observational RED | BEHAVIOR (real fs.readFileSync against synthetic temp-dir fixture) | No — impl absent | No — probe-only | No | KNOWN/MODELED | new test path | N/A | No |
| WB2 GREEN | spike-equivalent: splitter-state.ts pattern verified at T5 ladder reading scope | BEHAVIOR (real fs operations) | No — impl load-bearing | No | No (workstation-internal per §2.10) | KNOWN/MODELED | new max-parallel-state.ts | N/A | No |
| WB3 RED | N/A | BEHAVIOR (real React render via @testing-library/react + happy-dom) | No — function absent | No — probe-only | No | KNOWN/MODELED | new probe in chat-shell test dir | N/A | No |
| WB4 GREEN | spike-equivalent: T8/T9 resolveRender* precedent | BEHAVIOR (real mount.ts wiring + real component render) | No — function load-bearing | No | No (Sub-Q-C=(i) prop-drilled default; no §6 touch) | KNOWN/MODELED | mount.ts MOD coordinate with sibling sub-sessions per §2.4 | N/A | No |
| WB5 RED | N/A | BEHAVIOR | No | No | No | KNOWN/MODELED | new probe | N/A | No |
| WB6 GREEN | (see WB5) | BEHAVIOR (end-to-end consumer integration) | No | No | conditional on Sub-Q-C resolution at execution dispatch | KNOWN/MODELED | end-to-end | N/A | No |
| WB7 smoke | N/A | BEHAVIOR (real electron launch + α/β verify) | No | No | No | KNOWN per observed sentinels | none — observational | N/A | No |
| WB8 docs | N/A | N/A | N/A | No — docs only | No | KNOWN per direct ticket-execution evidence | pathspec-on-commit per MB-F-METHODOLOGY-CROSS-SESSION-STAGING-CONTAMINATION Tier 1 | N/A | No |

---

## §7 — Definition of done

The ticket is DONE when ALL of the following hold:

1. **WB1-WB6 cairn ladder lands**: each RED probe flips RED → GREEN at the corresponding GREEN WB; commit chain pushed to origin/main per CLAUDE.md §2.6.
2. **`max-parallel-state.ts` shipped** (if Sub-Q-B=(β)): readMaxParallel + writeMaxParallel exports; mirrors splitter-state.ts pattern; env-var override for tests.
3. **`resolveRenderMaxParallelCounter` mount auto-wire shipped**: chat-shell `mount.ts` adds the resolve function mirroring T8/T9 precedent; closes `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` MaxParallelCounter arm.
4. **MaxParallelCounter renders real N/M data**: N from sessions stream filter (Sub-Q-A=α) + M from settings file (Sub-Q-B=β) per WB6 end-to-end probe.
5. **5-package typecheck CLEAN** per CLAUDE.md §4.4.
6. **No regression in pre-existing baseline failures** per CLAUDE.md §4.5.
7. **WB7 runtime-launch smoke** confirms WINDOW_READY + counter renders persisted M + α/β PASS for affected dist artifacts.
8. **WB8 findings doc + FOLLOWUPS.md updates** lands; `MB-F-MAX-PARALLEL-CONFIG-SOURCE` closed; `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` partial-close stamped.
9. **Methodology-incident-free across WB1-WB8**: no anti-fabrication violations; no `git add -A`; pathspec-on-commit form applied throughout per `MB-F-METHODOLOGY-CROSS-SESSION-STAGING-CONTAMINATION` Tier 1 closure path α.

---

## §8 — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Sub-Q-A=(β) workstation pool-state surface drift — MB-T6 pool API may have changed since T4 ship | `[MODELED-LOW]` | `[MODELED-MEDIUM]` (refactor scope if pool surface diverged) | Execution-phase WB1 reading scope verifies pool API at HEAD-time; flag at HALT-WB2-PRE-COMMIT |
| Sub-Q-C=(ii) new IPC channel triggers `WORKSTATION_CONTRACT.md` §6.6 amendment — operator-arbitration cycle | `[KNOWN]` if (ii) chosen | `[MODELED-MEDIUM]` (HALT-WB-PRE-COMMIT operator wording-review) | Default to (i) prop-drilled; only escalate if operator wants live operator-edit propagation |
| Sub-Q-B=(γ) daemon-config introduces cross-package contract dependency | `[KNOWN]` if (γ) chosen | `[MODELED-HIGH]` (daemon endpoint addition + cross-package contract) | Default to (β) workstation settings file; (γ) deferred unless daemon-side max-parallel is operator-load-bearing |
| Sub-Q-B=(δ) BUILD.md preamble requires MB-T28 parser amendment | `[KNOWN]` if (δ) chosen | `[MODELED-HIGH]` (parser amendment + workstation observer) | Default to (β); (δ) deferred per `MB-F-T5-MAX-PARALLEL-T4-DEPENDENCY` Tier 3 cross-reference |
| `chat-shell/mount.ts` path-overlap at WB4 with T1-polish or other sibling editing slot positions | `[MODELED-MEDIUM]` (Round 11 Wave 2 has T1-polish in flight) | `[MODELED-MEDIUM]` (sequential slot additions; coord note required) | Coordinate at execution dispatch via `docs/coordination/<session-pair>-coord.md` per CLAUDE.md §4.3 |
| Operator edits `max-parallel.json` while workstation running — Sub-Q-E=(α) synchronous-per-render misses the update | `[KNOWN]` (matches `splitter-state.json` precedent UX limitation) | `[MODELED-LOW]` (operator-visible; restart-to-apply matches existing UX) | File `MB-F-MAX-PARALLEL-LIVE-RELOAD` Tier 3 at WB8; close if operator selects Sub-Q-C=(ii) push channel post-Phase 3 |
| Cross-session staging contamination recurrence per Round 11 §3.9 stress regime | `[MODELED-MEDIUM]` | `[MODELED-HIGH]` (commit attribution + sibling work co-pollution risk) | **MANDATORY pathspec-on-commit form** per closure path α at EVERY WB commit, not just docs; matches T5/T6 ladder precedent (12+12 pristine commits) |
| T6 α gate concurrent-push false STALE (`MB-F-METHODOLOGY-α-OVER-CONSERVATIVE-CONCURRENT-PUSH` Tier 3) | `[KNOWN]` | `[MODELED-LOW]` (operational mitigation per §8.α step 4) | Apply §8.α step 4 — investigate small-delta STALE before treating as blocker |
| Sub-Q-A=(α) N source under-counts active sessions during transient spawn-in-flight states | `[MODELED-LOW]` | `[MODELED-LOW]` (counter momentarily lags spawn; operator sees session appear + counter increment in same render-cycle batch) | Acceptable per Sub-Q-A=(α) RATIFY; escalate to (β) pool-state only if Phase 3 dogfood surfaces lag visibility |
| Round 11 §3.9 Wave 2 SPECULATIVE: Phase 3 visual-verification may DISCARD this ticket entirely | `[KNOWN per dispatch STATUS FRAMING]` | `[MODELED-MEDIUM]` (12-WB equivalent scope discard) | Operator explicitly accepts revision-cost per §3.9 dispatch; sub-Q resolutions at HALT-TICKET-BODY-PRE-COMMIT preserve operator pre-arbitration anchors |

---

**End of MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW ticket body.**

Pending operator resolutions before execution dispatch:
- Sub-Q-T10-A (§3.1) — Active-count (N) source (α RATIFY (RECOMMENDED) / β pool-state / γ daemon)
- Sub-Q-T10-B (§3.2) — Max-parallel (M) source (α RATIFY const / β settings-file (RECOMMENDED) / γ daemon / δ BUILD.md / ε hybrid)
- Sub-Q-T10-C (§3.3) — Emission channel (i prop-drilled (RECOMMENDED) / ii push IPC / iii hybrid)
- Sub-Q-T10-D (§3.4) — Persistence (i none / ii splitter-state.ts pattern (RECOMMENDED) / iii electron-store)
- Sub-Q-T10-E (§3.5) — Cadence (α synchronous (RECOMMENDED) / β interval / γ event-driven)

Plus conditional **HALT-WB4-PRE-COMMIT** operator wording-review of `WORKSTATION_CONTRACT.md` §6.6 amendment text IF Sub-Q-T10-C=(ii) push channel selected.

`[KNOWN per Round 11 §3.9 STATUS FRAMING]`: SPECULATIVE Phase 4 forward-positioning; revision-cost explicitly accepted by operator. Post-Phase-3 evidence may RATIFY / RESHAPE / DISCARD.
