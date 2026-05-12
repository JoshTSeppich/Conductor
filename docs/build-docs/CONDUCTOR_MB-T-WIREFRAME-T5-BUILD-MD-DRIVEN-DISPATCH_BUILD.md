# MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH — Workstation-side BUILD.md driver (parser-consumer + status-line + auto-dispatch)

**Status:** DRAFT-PENDING-OPERATOR-REVIEW
**Date authored:** 2026-05-12
**Authored under:** §3.4 operator-supervised mechanical translation discipline per full-build-mode dispatch `4f0bbde` §3.2. Round 9 of cairn-under-stress.
**Authoring delegate:** T5 sub-session (Opus 4.7) spawned by orchestrator-2026-05-11-1257 (gen-4 successor of gen-3 PRIMARY); prior ladder MB-T-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-α-β COMPLETE.
**Authoring anchor commit (HEAD at authoring time):** `40fde1e` (T6 WB6 docs land — α+β methodology infra operative)
**Cairn ladder anchor:** Wireframe-parity workstream T5 (BUILD.md driven dispatch). Builds DIRECTLY on **MB-T28** (shipped at merge `7ce34b4` 2026-05-08; parser at `packages/dispatch-core/src/build-doc-parser/`; 143/143 GREEN, 100% line coverage) which already ships the parser + DAG builder + validators. T5 is workstation-side WIRING (parser-consumer), NOT parser authoring.

**Closes (partial):** Full-build-mode dispatch `4f0bbde` §2 workstream T5 verbatim scope (BUILD.md parser INVOCATION + auto-dispatch + loaded-status indicator + task-count display + blocked/ready breakdown + spawn-K-sessions trigger wiring). Wireframe §1 bottom status line ("Loaded BUILD.md (rev <sha>) — parsed N tasks, M blocked, K ready. Spawning K sessions now, max-parallel.").

**Cross-closes (potentially):** Tracks `MB-F-BUILD-MD-SPEC-NOT-IN-REPO` (Tier 1 OPEN since 2026-05-08) — this ticket forces the spec-in-repo question because workstation now load-bears on BUILD.md presence + format stability. Filing-side reconciliation at WB12 docs.

**Depends on (all merged):**
- MB-T28 parser at `7ce34b4` (parser library: `parseBuildDoc`, `buildDag`, `detectCycle`, `detectOrphans`, `detectDuplicateBranches` exports + `ParseResult`/`TaskDAG`/`Task`/`Preamble`/`ParseError` types)
- MB-T05 spawn-handler at `bf4ad92` (`packages/dispatch-workstation/src/main/spawn-handler.ts` + `spawn-ipc.ts` `SpawnIpcController` + `spawn-confirm-gate.ts`)
- MB-T36 orchestrator-fire-spawn at HEAD `40fde1e` (`packages/dispatch-workstation/src/main/orchestrator-fire-spawn.ts` — dispatch-mode-aware spawn invoker: `'auto'` fires controller; `'ask'` surfaces confirm modal)
- MB-T24 dispatch-mode-store (per-workstation dispatch-mode state; `dispatch-mode:get`/`set` IPC)
- T6 methodology infra at HEAD `40fde1e` (α build-freshness gate + β bundle-inclusion verification — operative per WB5 `0d71590` §C envelope amendment)

**Downstream gates:**
- Wireframe §1 bottom status-line SHIPPED (one of the bottom-rail surfaces; T4 ticket-body Wave B may overlap on container — coordination required at HALT-WB5-PRE-COMMIT)
- MB-F-WIREFRAME-PARITY-SCOPE-UNDERESTIMATED closure-path-α second-order ticket roadmap progresses by one workstream (T5 of T1-T7)

**Path-disjoint from:**
- T1 (`src/frame-c/` SessionList data flow + `src/tile-grid/`)
- T2 (`src/frame-c/detail-pane.tsx` + PTY stream + terminal-stream.tsx)
- T3 (`src/frame-c/action-bar.tsx` + frame-c-ipc.ts kill-session)
- T4 (bottom rail tabs Chat/Commits/BUILD.md — T4 may CONTAIN T5's status line as its "BUILD.md" tab content; see Sub-Q-MBTWFT5-E)
- T6 (methodology infra — α + β gates compose with T5; T5 declares fingerprints per WB)
- T7 (visual polish)

**Estimated WB count:** 10-12 (8-WB cairn core + 2-3 docs/wiring WBs + 1 runtime-launch smoke)

---

## §0 — Reading protocol

1. Read §1 (scope) + §2 (arbitration anchor) first to understand what is binding vs deferred.
2. Read §3 (GATE sub-arbitrations) — FIVE operator decisions are pre-execution prerequisites; surface at HALT-TICKET-BODY-PRE-COMMIT for resolution before WB ladder begins.
3. Read §4 (WB ladder) for execution order. WBs follow probe-impl pattern: parser-import → IPC → status-line → dispatch-loop → spawn-trigger → smoke → docs.
4. §5-§8 are operational supports — cross-references, self-check, definition-of-done, risk register.

Confidence labels per CLAUDE.md §2.2 apply throughout: `[KNOWN]` observed in this session via direct source read; `[MODELED]` reasoned from observed facts plus a stated model; `[SPECULATIVE]` hypothesis without evidence. Operator-frozen-envelope outcomes are `[KNOWN-OPERATOR-ARBITRATED]` and binding for ticket scope.

---

## §1 — Scope

### §1.1 — What this ticket DOES

`[KNOWN-OPERATOR-ARBITRATED]` per dispatch §1 wireframe inventory bottom-status-line + §2 T5 workstream + §3.3 IPC arbitration anchor:

1. **Workstation-side BUILD.md service module** at NEW `packages/dispatch-workstation/src/build-md/` (flat directory convention per CLAUDE.md §3.2):
   - `build-md/service.ts` — reads `BUILD.md` from disk (path per Sub-Q-MBTWFT5-A); invokes `parseBuildDoc()` from `dispatch-core/dist/build-doc-parser/index.js`; computes load-status metrics (N tasks parsed; M blocked; K ready; cycle/orphan/branch errors); exposes `loadBuildMd(path)` + `computeReadySet(dag, completedTaskIds)` + `BuildMdStatus` type.
   - `build-md/dispatch-loop.ts` — orchestrates DAG traversal: identifies ready-set (tasks with all `dependsOn` complete), enforces max-parallel cap, invokes spawn pathway per Sub-Q-MBTWFT5-C, surfaces dispatch events.
   - `build-md/index.ts` — barrel export.

2. **New renderer↔main IPC channel `workstation:read-build-md`** (WORKSTATION_CONTRACT.md §6.6 amendment — REQUIRES operator arbitration per CLAUDE.md §2.4 + dispatch §3.3):
   - Direction: renderer → main (invoke/handle)
   - Payload: `{ path?: string }` (optional path override; default per Sub-Q-A)
   - Response: `Promise<BuildMdLoadResult>` (discriminated union — see §1.1.5 below for exact shape)
   - Bridge surface: `window.workstationBridge.readBuildMd(opts?): Promise<BuildMdLoadResult>` (extends EXISTING `workstationBridge` per existing Wave B precedent at `read-swarm-state` 2026-05-11)
   - Path resolution: `resolve(app.getAppPath(), '..', '..', 'BUILD.md')` per Sub-Q-A=(i) default — mirrors `swarm-state-writer.ts` init path pattern
   - ENOENT fallback: `{ ok: false, reason: 'NotFound' }` — surfaced as honest UI placeholder ("No BUILD.md found at <path>")
   - Other errors: `{ ok: false, reason: 'ParseError'|'IoError'|'NotAFile', message, parseErrors? }`
   - Consumer: `src/build-md/dispatch-loop.ts` (main-process; pre-dispatch refresh) + `src/frame-c/build-md-status-line.tsx` OR equivalent renderer per Sub-Q-MBTWFT5-E

3. **Optional second IPC channel `workstation:build-md-dispatch-trigger`** per Sub-Q-MBTWFT5-C=(ii)/(iii):
   - Triggers main-process dispatch loop; returns count of spawned vs queued
   - Only needed if Sub-Q-C=(i) reuse-existing-SpawnIpcController is NOT selected; (i) is the recommended path and avoids a second IPC

4. **BuildMdStatusLine renderer component** (NEW `packages/dispatch-workstation/src/frame-c/build-md-status-line.tsx` if Sub-Q-MBTWFT5-E=(i) frame-c-bottom OR NEW `src/bottom-rail/` if Sub-Q-E=(iii) new-bottom-rail):
   - Renders the wireframe §1 bottom-status-line text: `Loaded BUILD.md (rev <sha>) — parsed N tasks, M blocked, K ready. Spawning K sessions now, max-parallel.`
   - On parse-error: renders error banner (cycle/orphan/duplicate-branch surfaces inline; non-fatal errors highlighted)
   - On `not-found`: renders honest placeholder ("No BUILD.md at <repo>/BUILD.md")
   - data-testid set: `build-md-status-line`, `build-md-task-count`, `build-md-blocked-count`, `build-md-ready-count`, `build-md-load-error`, `build-md-spawn-trigger` (button if Sub-Q-MBTWFT5-B=(ii) operator-clicks)

5. **Auto-dispatch logic** (per Sub-Q-MBTWFT5-B):
   - (i) auto-on-load — invoke dispatch loop immediately after successful parse
   - (ii) operator-click — render "Spawn K sessions" button; only invoke on operator action
   - (iii) auto-on-change — fs.watch debounced (300ms) to detect BUILD.md edits + auto-redispatch (heavier scope; advisory deferral to follow-on ticket)
   - Dispatch loop respects `dispatch-mode` (auto/ask) per existing `orchestrator-fire-spawn.ts` deps pattern (Sub-Q-C=(i) reuses this directly)
   - max-parallel cap: read from existing dispatch-mode-store OR from operator config (Sub-Q-D); displays "Spawning K sessions now, max-parallel" only when K = max-parallel cap hit

6. **`workstation:read-build-md` channel registration** in `packages/dispatch-workstation/src/main/main.ts` via NEW sentinel zone `=== BEGIN: MB-T-WIREFRAME-T5-BUILD-MD wiring ===` (additive; non-collision with existing zones per CLAUDE.md §3.3).

### §1.1.5 — Discriminated-union shape for `BuildMdLoadResult`

`[MODELED]` matching WORKSTATION_CONTRACT.md §6.6 Result-type discriminated-union pattern established by Wave C #3 frame-c-ipc (`DiffResult`, `MergeResult`, `FocusResult`):

```typescript
// packages/dispatch-workstation/src/main/build-md-ipc.ts (NEW; WB exported types)

export interface BuildMdLoadSuccess {
  readonly ok: true;
  readonly path: string;                    // absolute path read
  readonly revSha?: string;                 // git HEAD sha of BUILD.md at read time (best-effort; undefined if not in git)
  readonly dag: SerializableTaskDAG;        // parser output (TaskDAG with sourceLine numbers; no functions)
  readonly status: BuildMdStatus;           // computed: { taskCount, blockedCount, readyCount, errorCount }
}

export interface BuildMdLoadError {
  readonly ok: false;
  readonly error_type: 'NotFound' | 'NotAFile' | 'IoError' | 'ParseError';
  readonly message: string;
  readonly parseErrors?: readonly ParseError[]; // present only when error_type === 'ParseError'
}

export type BuildMdLoadResult = BuildMdLoadSuccess | BuildMdLoadError;

export interface BuildMdStatus {
  readonly taskCount: number;
  readonly blockedCount: number;
  readonly readyCount: number;
  readonly errorCount: number;
}
```

### §1.2 — What this ticket DOES NOT

`[KNOWN-OPERATOR-ARBITRATED]` constraints:

- Does NOT author the BUILD.md parser. MB-T28 shipped the parser at `7ce34b4` with 143/143 GREEN tests + 100% line coverage. T5 imports `parseBuildDoc` from `dispatch-core/dist/build-doc-parser/index.js` and treats the API as frozen contract.
- Does NOT modify `dispatch-core/src/build-doc-parser/*`. Any parser bug surfaced during T5 dogfood files as Tier 2 followup against MB-T28; out of T5 scope.
- Does NOT close `MB-F-BUILD-MD-SPEC-NOT-IN-REPO` (Tier 1 OPEN since 2026-05-08; spec lives at `~/Downloads/BUILD-md-spec.md` operator-side). T5 USES the parser which encodes the spec semantically; spec-in-repo placement remains operator-arbitrated separate commit. T5 may surface the spec-in-repo question more sharply (workstation now load-bears) but does not unilaterally close.
- Does NOT modify frozen surfaces:
  - `REGISTRY.md §2` (binary contracts)
  - `docs/build-docs/CONDUCTOR_API_CONTRACT.md` (Conductor API v2/v3 — frozen contract per CLAUDE.md §1; T5 does NOT touch spawn/orchestrator endpoints)
  - `packages/dispatch-core/src/v3/schema.ts` §1-§13 (Zod schema spine)
- DOES modify `WORKSTATION_CONTRACT.md §6.6` to ADD channel `workstation:read-build-md` (+ optional `workstation:build-md-dispatch-trigger` per Sub-Q-C). Frozen-surface amendment per CLAUDE.md §2.4. Operator-arbitrated at HALT-WB4-PRE-COMMIT.
- Does NOT implement the wireframe §1 OTHER bottom-rail elements (Conductor tab strip, Auto/Ask toggle, bypass-perms indicator, max-parallel counter, cost meter, plan timer — those are T4 territory). T5's status-line component is path-disjoint from T4's tab strip but may share the bottom-rail container DOM region.
- Does NOT close MB-F-WIREFRAME-PARITY-SCOPE-UNDERESTIMATED. T5 is one of seven workstreams advancing partial closure.
- Does NOT implement file-watch on `BUILD.md` for auto-redispatch on edit (Sub-Q-B=(iii) — DEFERRED as Tier 2 follow-on `MB-F-T5-BUILD-MD-FILE-WATCH-AUTO-REDISPATCH` if Sub-Q-B=(i) or (ii) selected; minimum-viable v1 ships fs-read-on-load).
- Does NOT migrate orchestrator-fire-spawn or spawn-ipc internals. Reuses the existing surface via dependency injection.
- Does NOT measure Q-V35-7(a) thresholds. Measurement is dogfood Phase D, downstream of this ticket's merge.

---

## §2 — Arbitration anchor (operator-frozen 2026-05-12 gen-4 dispatch)

### §2.1 — Dispatch §2 T5 verbatim scope (binding)

`[KNOWN-OPERATOR-ARBITRATED]`

Per `docs/coordination/full-build-mode-dispatch.md` `4f0bbde` §2 T5:
> ### T5 — BUILD.md driven dispatch
> - BUILD.md parser
> - Auto-dispatch logic ("Spawning K sessions now")
> - Loaded-status indicator
> - Task-count display
> - Blocked/Ready breakdown

Plus dispatch §1 wireframe inventory bottom-status-line:
> ### Bottom status line
> - Avatar `C` (Claude indicator)
> - BUILD.md status: `Loaded BUILD.md (rev <sha>) — parsed N tasks, M blocked, K ready. Spawning K sessions now, max-parallel.`

**Reshape from dispatch §2 wording**: "BUILD.md parser" reads as if the parser is unbuilt. Anti-fabrication §2.1 stale-dispatch check (per `memory/feedback_stale_dispatch_detection.md`): MB-T28 SHIPPED the parser at `7ce34b4` 2026-05-08. Workstation invocation sites = zero (`grep -rn "build-doc-parser\|parseBuildDoc\|parseBuild" packages/dispatch-workstation/src/` returns nothing at HEAD `40fde1e`). T5 is the FIRST workstation consumer. Surfaced as Q-T5-STALE-DISPATCH-1 below.

### §2.2 — Dispatch §3.3 IPC arbitration anchor (binding)

`[KNOWN-OPERATOR-ARBITRATED]`

Per dispatch §3.3:
> WORKSTATION_CONTRACT.md §6 amendments require operator arbitration. New IPC methods needed:
> - `workstation:kill-session` (T3 workstream) — requires arbitration
> - `workstation:read-build-md` (T5 workstream) — requires arbitration
> - `workstation:cost-meter` (T4 workstream) — requires arbitration
> - Potentially others as workstreams develop
>
> Each new IPC method = new contract-amendment cycle. Pattern established 2026-05-11: sub-session drafts amendment text under §3.4; operator HALT-PRE-COMMIT review of exact language; commit lands with operator-supervised authorship.

T5 amendment drafts Channel #5 (after Wave B/C #3 #1-#4) following the §6.6 Result-type discriminated-union pattern (per §1.1.5 above). Surface at HALT-WB4-PRE-COMMIT.

### §2.3 — Visual-comparison gate (dispatch §3.5)

`[KNOWN-OPERATOR-ARBITRATED]`

Per dispatch §3.5 visual-comparison gate addition to auto-ack §C: `green:wiring` AUTO-ACK requires visual diff OR explicit "structural-only, no visual diff" note. T5's status-line component is visual; runtime-launch smoke at WB11 with operator-screenshot fallback (per dispatch §3.5 pending T6 γ headless screenshot pipeline) closes the visual-comparison gate per WB.

### §2.4 — Stale-dispatch reconciliation surface

`[KNOWN per anti-fabrication §2.1]` Three dispatch claims do NOT match repo state at HEAD `40fde1e`:

| Dispatch claim | Repo state | Resolution in this ticket |
|---|---|---|
| `BUILD.md parser` (T5 scope) implies authoring | MB-T28 shipped parser at `7ce34b4` 2026-05-08 | T5 reshaped to workstation-consumer; parser is dependency |
| `BUILD-md-spec.md` cited as required-read | Not in repo (`MB-F-BUILD-MD-SPEC-NOT-IN-REPO` Tier 1 OPEN since 2026-05-08; lives at `~/Downloads/BUILD-md-spec.md` operator-side) | T5 cannot verify scope against spec directly; uses parser code as spec-as-code (143/143 GREEN); WB12 docs surfaces this dependency |
| `wireframe-target-2026-05-11.png` cited as required-read | Not in repo (verified `find docs -name "wireframe*"` 2026-05-12) | T5 references dispatch §1 wireframe-inventory text verbatim instead |
| `docs/build-docs/tickets/` directory cited as deliverable path | Does not exist; existing convention is `docs/build-docs/CONDUCTOR_<TICKET>_BUILD.md` (verified via existing T1/T2/T3/T6 ticket bodies) | T5 ticket body lands at `docs/build-docs/CONDUCTOR_MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH_BUILD.md` matching existing convention |

Operator notification at HALT-TICKET-BODY-PRE-COMMIT: please confirm reshape is acceptable, or redirect.

---

## §3 — GATE sub-arbitrations REQUIRED before specific WBs

Five operator decisions remain pre-execution prerequisites. Surface ALL at HALT-TICKET-BODY-PRE-COMMIT for resolution before WB1 (sub-sessions cannot defer to mid-ladder without methodology-incident risk per Round 9 stress regime).

### §3.1 — Sub-Q-MBTWFT5-A: BUILD.md file location

Required before **WB2** (build-md service module). Default if unresolved: **(i) repo-root `BUILD.md`** matching dispatch §1 wireframe text "Loaded BUILD.md" (no path qualifier).

| Option | Path resolution | Discoverability | Multi-repo workflow |
|---|---|---|---|
| (i) Repo-root `BUILD.md` | `resolve(app.getAppPath(), '..', '..', 'BUILD.md')` | HIGH — matches wireframe; matches MB-T28 spec convention | Single per workspace |
| (ii) Per-session-cwd `BUILD.md` | `resolve(session.cwd, 'BUILD.md')` per spawned session | MEDIUM — supports multi-repo workflows | Heavier UX: which session's BUILD.md drives status line? |
| (iii) Operator-configured path | new settings field; default = (i); operator may override | LOW — adds settings UX surface | Flexible but adds Round 9 stress |

`[MODELED]` Recommend **(i)**. Rationale: matches dispatch §1 wireframe text verbatim; aligns with MB-T28 spec convention (BUILD.md is repo-level by design per spec §2.1 implied by parser fixtures); single-source-of-truth is operationally simplest; (ii)/(iii) deferred as Tier 3 follow-on if multi-repo workflows surface.

Operator decision pending.

### §3.2 — Sub-Q-MBTWFT5-B: Dispatch trigger source

Required before **WB7** (dispatch loop) + **WB6** (status-line UI shape). Default if unresolved: **(ii) operator-click "Spawn K sessions" button**.

| Option | UX | Auto-dispatch behavior | Risk |
|---|---|---|---|
| (i) Auto-on-load | Status line shows counts; spawns fire immediately after successful parse | Most-automated; matches wireframe "Spawning K sessions now" | Operator may not want spawn-on-launch; max-parallel cap could spawn many sessions unexpectedly |
| (ii) Operator-click button | Status line shows counts + "Spawn K sessions" button; spawns fire only on click | Operator-in-loop; safer; matches dispatch-mode `'ask'` semantics | Less-automated; wireframe text "Spawning K sessions now" reads as observation-of-current-state, not future-action — accommodates (ii) by showing 0 in-flight pre-click |
| (iii) Auto-on-change (fs.watch) | (i) + debounced fs.watch on BUILD.md re-trigger on edit | Most-reactive; supports operator editing BUILD.md and seeing immediate redispatch | Heavier scope (fs.watch state machine); deferred as Tier 2 follow-on `MB-F-T5-BUILD-MD-FILE-WATCH-AUTO-REDISPATCH` |

`[MODELED]` Recommend **(ii)**. Rationale: operator-in-loop matches existing `'ask'` dispatch-mode default (Q-T36 / MB-T24 territory); wireframe text "Spawning K sessions now" can read as post-click state ("K sessions currently spawning, max-parallel"); (i) auto-on-load risks operator surprise on first launch with non-trivial BUILD.md; (iii) deferred as Tier 2 follow-on (adds fs.watch state machine complexity).

Operator decision pending.

### §3.3 — Sub-Q-MBTWFT5-C: Spawn pathway

Required before **WB9** (spawn-trigger wiring). Default if unresolved: **(i) reuse `orchestrator-fire-spawn.ts` via dependency injection**.

| Option | Mechanism | Frozen-surface touch | Coupling |
|---|---|---|---|
| (i) Reuse orchestrator-fire-spawn | T5 dispatch loop calls `orchestratorFireSpawn(deps, request)` per ready-task; respects dispatch-mode (`auto`/`ask` confirm-modal); inherits SpawnConfirmGate | NONE — no new IPC; uses existing pathway | T5 dispatch loop depends on `OrchestratorFireSpawnDeps` shape |
| (ii) New `workstation:build-md-dispatch-trigger` IPC | Renderer-initiated trigger; main-process loops over ready-set; emits spawn-requested per ready task | YES — `WORKSTATION_CONTRACT.md §6.6` second amendment (Channel #6); operator-arbitrated per CLAUDE.md §2.4 | More UI control; heavier contract surface |
| (iii) Extend SpawnIpcController with batch-spawn method | New `SpawnIpcController.handleBatchSpawn(requests[])` method; T5 invokes via existing `:spawn-requested` channel with array payload | YES — extends existing channel payload shape (potential frozen-contract drift) | Tighter coupling to SpawnIpcController; controversial channel-payload extension |

`[MODELED]` Recommend **(i)**. Rationale: `orchestrator-fire-spawn.ts` already encodes dispatch-mode-aware spawn behavior (verified at `packages/dispatch-workstation/src/main/orchestrator-fire-spawn.ts` lines 1-50 — `'auto'` fires controller directly; `'ask'` surfaces confirm modal via SpawnConfirmGate); reusing this pathway gives T5 dispatch loop free coherence with the operator's dispatch-mode toggle (T4 territory); avoids second IPC amendment cycle; matches the existing parallel-cairn pattern of orchestrator-fired spawns. (ii)/(iii) deferred as Tier 3 follow-on if UI control or batch optimization surfaces post-dogfood.

Operator decision pending.

### §3.4 — Sub-Q-MBTWFT5-D: max-parallel source

Required before **WB7** (dispatch loop). Default if unresolved: **(i) read from existing dispatch-mode-store or related config**.

| Option | Source | Coupling | Surfacing |
|---|---|---|---|
| (i) Read from existing config | Per workstation: read max-parallel cap from `dispatch-mode-store` OR new `max-parallel-store.ts` sibling state module | LOW — sibling state pattern (matches `splitter-state.ts` + `frame-mode-state.ts` precedent) | Implicit; operator doesn't see surface unless they look at file |
| (ii) Wireframe bottom-rail counter (T4 territory) | T4 ticket's `max-parallel · 16/16 counter` surfaces the cap; T5 reads from T4's max-parallel-store | HIGH cross-ticket dependency | Visible in wireframe; operator-editable per T4 design |
| (iii) BUILD.md preamble `max_parallel: N` field | Authored in BUILD.md itself; parser exposes via preamble; T5 honors per-BUILD.md cap | LOW (parser-side; per-file) | Visible in BUILD.md; per-file customizable |

`[MODELED]` Recommend **(ii)**. Rationale: wireframe §1 bottom-rail shows `max-parallel · 16/16 counter` as a T4 element; T5 should READ from the same source so the displayed "max-parallel" in T5 status line and T4 counter agree; reverse-coupling (T5 reads, T4 owns) is path-disjoint at file level. Fallback to (i) sibling state if T4 not yet shipped at WB7 execution time. (iii) is appealing but creates per-BUILD.md max-parallel coupling that may surprise operators; deferred as Tier 3.

Operator decision pending.

### §3.5 — Sub-Q-MBTWFT5-E: Status-line DOM location

Required before **WB6** (status-line component). Default if unresolved: **(i) `frame-c/build-md-status-line.tsx` in Frame C surface**.

| Option | Location | Coordination with T4 bottom-rail | Wireframe match |
|---|---|---|---|
| (i) Frame C bottom (extension of `frame-c-root.tsx`) | Renders below DetailPane in Frame C layout | NONE — Frame C is path-disjoint from T4 | PARTIAL — wireframe shows BUILD.md status as bottom-of-window, not bottom-of-Frame-C |
| (ii) Workstation-shell footer (`workstation-shell.html` extension) | Renders at workstation-shell-level below tile-grid + frame-c regions | LOW — adds new DOM region; may coordinate with T4 bottom-rail layout | CLOSE — workstation-shell footer matches wireframe bottom positioning |
| (iii) New `bottom-rail/` surface (parallel to `tile-grid/` + `frame-c/`) | NEW `src/bottom-rail/` flat-dir + mount factory; renders bottom-rail container that may HOST T4's tab strip + T5's status line + other bottom elements | HIGH cross-ticket coordination with T4; potential coordinated authoring | BEST — matches wireframe bottom positioning + accommodates T4 elements |

`[MODELED]` Recommend **(i)** for ship-velocity. Rationale: Frame C is the current operator-default surface (`frame-mode-state.ts:8` `DEFAULT_MODE: FrameMode = 'C'` per Wave B `8eab991`); extending Frame C bottom keeps T5 path-disjoint from T4; defers T4 coordination overhead. (ii) intermediate; (iii) creates new mount surface that requires ticket-#1 CSS amendment scope (per Wave B WB10 precedent + MB-T-WIREFRAME-T4 future ticket). Honest visual-mismatch: (i) places status line at Frame-C-bottom not window-bottom — operator visible as cosmetic-but-correct trade-off until T4 ships and T5 migrates per Sub-Q-MBTWFT5-E-followon Tier 3.

Operator decision pending.

---

## §4 — WB ladder

10 WBs baseline (defaults Sub-Q-A=(i) + B=(ii) + C=(i) + D=(ii) + E=(i)); 11-12 WBs if alternates selected (e.g., Sub-Q-C=(ii)/(iii) adds new IPC + amendment WB; Sub-Q-E=(iii) adds bottom-rail mount-factory WB).

Each WB follows cairn methodology: red authors failing probe; green implements minimum; commit body carries Q1-Q9 self-check per CONDUCTOR_API_CONTRACT.md §10.5; per-path `git add` per CLAUDE.md §2.7; pathspec-on-commit form per `MB-F-METHODOLOGY-CROSS-SESSION-STAGING-CONTAMINATION` Tier 1 closure path α (`git commit -m "..." -- <pathspec>`); push after each cairn-grammar commit per §2.6.

**T6 α + β gates operative this ticket** per `0d71590` §C envelope amendment: each `green:wiring` commit MUST (1) declare a fingerprint set in commit body §F-Fingerprints; (2) run `pnpm --filter dispatch-workstation verify:build-freshness` post-impl (autonomous rebuild on STALE); (3) run `pnpm --filter dispatch-workstation verify:bundle-fingerprint --fingerprint <s1> ...` and capture output in commit body.

### WB1 — `red(MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH): probe-MBTWFT5-01-parser-import-and-fixture-parse`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/unit/build-md/probe-mbtwft5-01-parser-import-and-fixture-parse.spec.ts` (NEW dir). Asserts:
- Workstation can import `parseBuildDoc` + `buildDag` + `ParseResult` type from `dispatch-core/dist/build-doc-parser/index.js`.
- Calling `parseBuildDoc(minimalFixture)` against a hand-rolled minimal BUILD.md fixture returns `{ok: true, dag: TaskDAG}` with `dag.tasks.length === 1`.
- BuildMd service module exports `loadBuildMd(path)` from `packages/dispatch-workstation/src/build-md/service.js`.

Probe fails RED — `src/build-md/service.ts` does not yet exist (import-resolve failure at fourth case).
**Acceptance:** probe RED. Commit body Q1-Q9. §F-Fingerprints: none yet (RED).
**Frozen contracts touched:** none — probe-only.
**Dispatch-core dist rebuild check** (per CLAUDE.md §3.4): verify `dispatch-core/dist/build-doc-parser/index.js` exists at WB1 start; if absent, run `pnpm --filter dispatch-core build` first. Surface at WB1 start.

### WB2 — `green(MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH): build-md/service.ts + loadBuildMd + computeReadySet`

**Type:** green
**Scope:** GREEN at NEW `packages/dispatch-workstation/src/build-md/`:
- `build-md/service.ts` exports:
  - `loadBuildMd(path: string): Promise<BuildMdLoadResult>` — reads file via `fs.promises.readFile(path, 'utf8')`; on ENOENT returns `{ok: false, error_type: 'NotFound', message}`; on parse error returns `{ok: false, error_type: 'ParseError', message, parseErrors}`; on success returns `{ok: true, path, dag, status}`. Resolves path per Sub-Q-A=(i) via `resolve(app.getAppPath(), '..', '..', 'BUILD.md')` — but takes `path` as parameter to enable testing.
  - `computeReadySet(dag: TaskDAG, completedTaskIds: ReadonlySet<TaskId>): TaskId[]` — returns task ids whose `dependsOn` ⊆ `completedTaskIds`.
  - `computeBuildMdStatus(dag: TaskDAG, completedTaskIds: ReadonlySet<TaskId>): BuildMdStatus` — { taskCount, blockedCount, readyCount, errorCount }.
- `build-md/types.ts` exports `BuildMdLoadResult`, `BuildMdLoadSuccess`, `BuildMdLoadError`, `BuildMdStatus` types per §1.1.5.
- `build-md/index.ts` barrel export.
**Acceptance:** WB1 probe flips RED → GREEN. Commit body Q1-Q9. §F-Fingerprints: `loadBuildMd`, `computeReadySet`, `build-md/service.ts` filename.
**Frozen contracts touched:** none — new directory.
**Build pipeline note:** `build-md/` is consumed via main-process `import` at WB4; no esbuild renderer-surface script needed for the service module itself. Renderer status-line component at WB6 may need new `scripts/build-build-md-status.mjs` IF Sub-Q-E=(iii) selected; for (i) extending Frame C, the existing `build-frame-c.mjs` chain (if added) covers it.

### WB3 — `red(MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH): probe-MBTWFT5-02-build-md-ipc-handler`

**Type:** red
**Scope:** RED probe at `probe-mbtwft5-02-build-md-ipc-handler.spec.ts`. Asserts:
- `registerBuildMdIpcHandlers({ipcMain, loadBuildMd})` (from `src/main/build-md-ipc.ts` — NEW) registers handler for channel `workstation:read-build-md`.
- Invoking the handler with `{path: <fixture>}` returns the `BuildMdLoadResult` from `loadBuildMd` verbatim.
- Invoking without payload uses default path (Sub-Q-A=(i)).
**Acceptance:** probe RED — `build-md-ipc.ts` does not exist. Commit body Q1-Q9. §F-Fingerprints: none yet.

### WB4 — `green(MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH): build-md-ipc.ts + main.ts wiring + WORKSTATION_CONTRACT §6.6 amendment`

**Type:** green
**Scope:**
- GREEN at NEW `packages/dispatch-workstation/src/main/build-md-ipc.ts`: `registerBuildMdIpcHandlers(deps)` exports + `BuildMdIpcController` class (mirroring `SpawnIpcController` pattern). Validates payload shape; invokes `loadBuildMd(opts.path ?? defaultPath)`; returns result.
- `main.ts` extension: NEW sentinel zone `=== BEGIN: MB-T-WIREFRAME-T5-BUILD-MD wiring ===` after the §C.1′ frame-mode IPC zone (mirroring Wave B `=== BEGIN: MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE wiring ===` placement). Adds `import { registerBuildMdIpcHandlers } from './build-md-ipc.js';` to imports zone; invokes inside `app.whenReady()` callback.
- WORKSTATION_CONTRACT.md §6.6 amendment: append Channel #5 — `workstation:read-build-md` per the field-table template established by Wave B/C #3 amendments. Operator-arbitrated frozen-contract amendment per CLAUDE.md §2.4. **HALT-WB4-PRE-COMMIT REQUIRED** for operator review of exact amendment text.
- Preload bridge: add `readBuildMd` method to EXISTING `workstationBridge` (matches Wave B `readSwarmState` precedent — both getter-style on shared `workstationBridge` binding).
**Acceptance:** WB3 probe flips RED → GREEN. Commit body Q1-Q9. §F-Fingerprints: `workstation:read-build-md`, `registerBuildMdIpcHandlers`, `BuildMdIpcController`, `readBuildMd`.
**Frozen contracts touched:** WORKSTATION_CONTRACT.md §6.6 (operator-arbitrated; HALT).

### WB5 — `red(MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH): probe-MBTWFT5-03-status-line-renders`

**Type:** red
**Scope:** RED probe at `probe-mbtwft5-03-status-line-renders.spec.tsx`. Asserts:
- `<BuildMdStatusLine result={successFixture} />` renders text matching wireframe template: `Loaded BUILD.md (rev <sha>) — parsed N tasks, M blocked, K ready.` with N/M/K substituted from `status` field.
- Spawn button rendered with `data-testid="build-md-spawn-trigger"` (per Sub-Q-B=(ii)) when result.ok && status.readyCount > 0.
- On `result.ok === false`: renders `data-testid="build-md-load-error"` with `message` content.
- On `result.ok === false && error_type === 'ParseError'`: renders parse-error list with cycle/orphan/duplicate-branch breakdown.
**Acceptance:** probe RED — component absent. Commit body Q1-Q9. §F-Fingerprints: none yet.

### WB6 — `green(MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH): BuildMdStatusLine component`

**Type:** green
**Scope:** GREEN at NEW `packages/dispatch-workstation/src/frame-c/build-md-status-line.tsx` (per Sub-Q-E=(i)):
- React component consuming `BuildMdLoadResult` prop.
- Renders wireframe template text + counts.
- Renders spawn-trigger button per Sub-Q-B=(ii) (button only; click handler wires at WB10).
- Error states render inline (parse-error list + not-found placeholder).
- data-testid set per WB5 probe expectations.
- Integration into `frame-c-root.tsx` (extension of existing component) OR new mount factory if Sub-Q-E selects a different surface.
**Acceptance:** WB5 probe flips RED → GREEN. Commit body Q1-Q9. §F-Fingerprints: `build-md-status-line`, `build-md-task-count`, `build-md-blocked-count`, `build-md-ready-count`, `BuildMdStatusLine`.
**Sub-Q-E blocker:** WB6 surface depends on Sub-Q-E resolution; (i) default extends Frame C; (ii)/(iii) require additional scope. Flag at HALT-WB6-PRE-COMMIT if alternates selected.

### WB7 — `red(MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH): probe-MBTWFT5-04-dispatch-loop-ready-set-traversal`

**Type:** red
**Scope:** RED probe at `probe-mbtwft5-04-dispatch-loop-ready-set-traversal.spec.ts`. Asserts:
- `DispatchLoop({ dag, completedTaskIds, maxParallel, fireSpawn })` returns object with `tick()` method.
- `tick()` computes ready-set, slices to `maxParallel - in-flight`, invokes `fireSpawn(taskSpec)` per ready task.
- Cycle in DAG: `tick()` surfaces error state without firing spawns.
- All-tasks-completed: `tick()` returns `{ done: true }`.
- max-parallel respected: if `maxParallel=2` and 5 tasks ready, only 2 spawns fire per tick.
- dispatch-mode 'ask' path: confirm-modal gate respected (probe uses mock `fireSpawn` that returns `{declined: true}`; loop handles).
**Acceptance:** probe RED — DispatchLoop absent. Commit body Q1-Q9. §F-Fingerprints: none yet.

### WB8 — `green(MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH): build-md/dispatch-loop.ts impl`

**Type:** green
**Scope:** GREEN at NEW `packages/dispatch-workstation/src/build-md/dispatch-loop.ts`:
- `createDispatchLoop(deps)` factory returning loop state machine.
- `tick()` method: enumerate ready-set; slice to `maxParallel - in-flight`; map each ready task to `SpawnSessionRequest` (per `spawn-handler.ts` exported type); invoke `deps.fireSpawn(request)` per task; track in-flight via spawn-result callback; mark completed on terminal success/failure.
- Cycle/error handling: ParseError surfaces inert state; no spawn invocation; status line shows error.
- max-parallel = 0: loop idle; `tick()` returns `{idle: true, reason: 'maxParallel0'}`.
- Cancellation: `tick()` aborts mid-iteration on AbortSignal (optional dep).
**Acceptance:** WB7 probe flips RED → GREEN. Commit body Q1-Q9. §F-Fingerprints: `DispatchLoop`, `createDispatchLoop`, `dispatch-loop.ts` filename.
**Sub-Q-D blocker:** maxParallel source per Sub-Q-D. Flag at HALT-WB8-PRE-COMMIT if (ii)/(iii) alternates require additional integration.

### WB9 — `red(MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH): probe-MBTWFT5-05-spawn-trigger-end-to-end`

**Type:** red
**Scope:** RED probe at `probe-mbtwft5-05-spawn-trigger-end-to-end.spec.ts`. End-to-end probe — workstation main-process integration:
- Renderer invokes `workstationBridge.readBuildMd()` → returns `BuildMdLoadResult` for fixture BUILD.md with 3 tasks (2 ready, 1 blocked).
- Renderer invokes spawn-trigger handler (Sub-Q-B=(ii) button click → IPC OR Sub-Q-B=(i) auto).
- DispatchLoop tick fires 2 spawns via `orchestratorFireSpawn` per Sub-Q-C=(i).
- Probe asserts: 2 spawn-requested events emitted with correct task → branch + cwd mapping; max-parallel cap of 2 respected; spawn-confirm-gate honored if dispatch-mode='ask'.
**Acceptance:** probe RED — wiring absent. Commit body Q1-Q9.

### WB10 — `green(MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH): spawn-trigger wiring (orchestrator-fire-spawn integration)`

**Type:** green
**Scope:** GREEN at `packages/dispatch-workstation/src/main/main.ts` MB-T-WIREFRAME-T5 sentinel zone + `src/build-md/dispatch-loop.ts` integration:
- Wire `DispatchLoop` instance into main.ts post-`registerBuildMdIpcHandlers`; deps = `{ readDag: from BuildMdIpcController state cache, fireSpawn: orchestratorFireSpawn-derived per Sub-Q-C=(i), maxParallel: from Sub-Q-D source }`.
- Spawn-trigger: per Sub-Q-B=(ii) operator-click — renderer button onClick invokes new IPC `workstation:build-md-dispatch-trigger` (this IS a second amendment per Sub-Q-C path; OR renderer directly invokes existing pathway if reusing). Default (ii)+(i) requires the trigger IPC.
- Renderer wiring: button onClick → `workstationBridge.triggerBuildMdDispatch()` → main-process handler → `DispatchLoop.tick()` → returns spawn count + queued count for UI feedback.
**Acceptance:** WB9 probe flips RED → GREEN. Commit body Q1-Q9. §F-Fingerprints: `triggerBuildMdDispatch`, `workstation:build-md-dispatch-trigger` (IF Sub-Q-C path requires; else only the dispatch-loop fingerprints).
**Frozen contracts touched:** WORKSTATION_CONTRACT.md §6.6 SECOND amendment if Sub-Q-C requires new trigger IPC (HALT-WB10-PRE-COMMIT for operator review). Else NO amendment (Sub-Q-C=(i) end-to-end via existing channels).

### WB11 — `green(MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH): runtime-launch smoke + α/β verification`

**Type:** green (smoke harness)
**Scope:** per CLAUDE.md §4.6 + T6 α/β envelope:
1. Build fresh (`pnpm --filter dispatch-workstation build`).
2. Verify α PASS: `pnpm --filter dispatch-workstation verify:build-freshness --dist-path dist/main/main.js`.
3. Verify β PASS: `pnpm --filter dispatch-workstation verify:bundle-fingerprint --dist-path dist/main/main.js --fingerprint "workstation:read-build-md" --fingerprint "registerBuildMdIpcHandlers"` + same against `dist/tile-grid/renderer.js` (frame-c bundle) `--fingerprint "BuildMdStatusLine" --fingerprint "build-md-status-line"`.
4. Launch electron from dist.
5. Observe within ~10s: `WINDOW_READY` sentinel + status line renders (operator-screenshot fallback OR auto-headless per T6 γ when ships).
6. With BUILD.md fixture present at repo root: status line shows counts; click "Spawn K sessions"; verify spawns fire.
7. Operator visual diff: status line matches wireframe §1 bottom-status-line text.
**Acceptance:** all 7 steps verified. Evidence: `docs/coordination/mbtwft5-runtime-smoke-2026-05-12.md`.

### WB12 — `docs(MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH): findings doc + FOLLOWUPS updates + closure stamps`

**Type:** docs
**Scope:** author `docs/coordination/mbtwft5-findings-2026-05-12.md` per `mbtmrvcab-findings-2026-05-12.md` format anchor (I-XI sections).

Followup updates to `docs/FOLLOWUPS.md`:
- **Closure-stamp candidate** for `MB-F-BUILD-MD-SPEC-NOT-IN-REPO` (Tier 1 OPEN since 2026-05-08): T5 ships FIRST workstation consumer, sharpening the spec-in-repo question. Filing-side surface: workstation now load-bears on BUILD.md presence + parser-encoded spec semantics. Operator-arbitrated whether T5 motivates closure (spec copied to `docs/build-docs/BUILD-md-spec.md`) or whether parser-as-spec-of-record suffices.
- File new Tier 3 follow-on `MB-F-T5-BUILD-MD-FILE-WATCH-AUTO-REDISPATCH` (deferred Sub-Q-B=(iii) closure-path).
- File new Tier 3 follow-on `MB-F-T5-MAX-PARALLEL-T4-DEPENDENCY` (Sub-Q-D=(ii) cross-ticket dep; T5 reads from T4 max-parallel-store).
- File new Tier 3 follow-on `MB-F-T5-STATUS-LINE-WINDOW-BOTTOM-RELOCATION` (Sub-Q-E=(i) ships Frame-C-bottom; relocation to window-bottom deferred until T4 bottom-rail mount-surface ships).
- File new Tier 2 follow-on `MB-F-T5-WIREFRAME-AUTO-DISPATCH-AMBIGUITY` (wireframe text "Spawning K sessions now, max-parallel" reads as either present-tense observation OR future-tense action; T5 ships (ii) operator-click but operator may want (i) auto-on-load after dogfood — schedule re-arbitration).
- Append closure-stamp candidate to `MB-F-WIREFRAME-PARITY-SCOPE-UNDERESTIMATED` (one workstream of T1-T7 progresses).

Cross-reference at WB12:
- MB-T28 parser at `7ce34b4` (frozen library dependency)
- MB-T05 + MB-T36 spawn-handler + orchestrator-fire-spawn (frozen integration surface)
- MB-T24 dispatch-mode-store (T5 reads to determine auto/ask behavior)
- T6 α + β methodology infra (operative; α/β PASS captured at WB11)
- T4 future ticket (bottom-rail container — T5 status line may migrate when T4 ships)

**Acceptance:** findings doc + FOLLOWUPS updates + closure stamps land. Commit body Q1-Q9. **Pathspec-on-commit form mandatory** per `MB-F-METHODOLOGY-CROSS-SESSION-STAGING-CONTAMINATION` Tier 1 closure path α: `git commit -m "..." -- docs/coordination/mbtwft5-findings-2026-05-12.md docs/FOLLOWUPS.md`.
**Frozen contracts touched:** none — docs only.

---

## §5 — Cross-references

### §5.1 — Followups CLOSED or stamped by this ticket

| Followup / Row | Tier | Closure path | Closing WB |
|---|---|---|---|
| (potentially) `MB-F-BUILD-MD-SPEC-NOT-IN-REPO` | Tier 1 (OPEN since 2026-05-08) | T5 sharpens question; closure remains operator-arbitrated | WB12 docs surface; not auto-closed |
| `MB-F-WIREFRAME-PARITY-SCOPE-UNDERESTIMATED` partial | Tier 1 (OPEN) | one workstream advances of T1-T7 | WB12 stamp candidate |

### §5.2 — Followups likely to surface during this ticket

`[MODELED-SPECULATIVE]`:

- WB1 may discover dispatch-core dist build is stale (CLAUDE.md §3.4) — rebuild required.
- WB2 may surface MB-T28 parser API quirks (e.g., `parseDependsOn` silently drops malformed refs per `MB-F-T28-MALFORMED-DEP-REF-TIGHTENING` Tier 3) — file Tier 3 followup if it affects T5 status line UX.
- WB4 WORKSTATION_CONTRACT.md amendment may surface §6 drift concerns — coordinate with `MB-F-WORKSTATION-CONTRACT-SECTION-6-DRIFT-AUDIT` Tier 2.
- WB8 dispatch-loop may surface need for spawn-result-listener integration; complex state-machine — flag at HALT-WB8-PRE-COMMIT if non-trivial.
- WB11 runtime-smoke may surface bottom-rail layout conflict with T4 (if T4 ships in parallel and uses workstation-shell footer DOM region) — coordinate via cross-session findings doc.

### §5.3 — Related shipped tickets (read-required at WB1 start)

| Ticket | Anchor | Read scope at WB1 |
|---|---|---|
| MB-T28 BUILD.md parser | `7ce34b4` (merged 2026-05-08) | `packages/dispatch-core/src/build-doc-parser/{index.ts, types.ts}` + `MB-F-T28-*` followup rows + `docs/coordination/mb-t28-findings-2026-05-08.md` |
| MB-T05 spawn-handler | `bf4ad92` | `packages/dispatch-workstation/src/main/{spawn-handler.ts, spawn-ipc.ts, spawn-confirm-gate.ts}` |
| MB-T36 orchestrator-fire-spawn | (HEAD `40fde1e`) | `packages/dispatch-workstation/src/main/orchestrator-fire-spawn.ts` — full file (50 LOC) |
| MB-T24 dispatch-mode-store | (HEAD `40fde1e`) | `packages/dispatch-workstation/src/main/dispatch-mode-store.ts` |
| WORKSTATION_CONTRACT.md §6.6 | (HEAD `40fde1e`) | full §6.6 — pattern reference for Channel #5 amendment |
| T6 methodology infra | `0d71590` (WB5 envelope) | `docs/coordination/orchestrator-state-current.md` §8.α + §8.β + verify CLI usage |

### §5.4 — Plan-doc anchors (read at WB1 start)

- `docs/coordination/full-build-mode-dispatch.md` `4f0bbde` §1 wireframe element inventory + §2 T5 workstream + §3.3 IPC arbitration anchor + §3.5 visual-comparison gate
- `docs/coordination/orchestrator-state-current.md` §8 auto-ack scope (now including α + β PASS conditions)

### §5.5 — Stale-dispatch + missing-reference reconciliation

Per §2.4 stale-dispatch reconciliation:
- Parser SHIPPED at MB-T28 (`7ce34b4`); workstation consumer NEW
- `BUILD-md-spec.md` not in repo (operator-side `~/Downloads/BUILD-md-spec.md`); parser-as-spec-of-record (143/143 GREEN) acceptable surrogate
- `wireframe-target-2026-05-11.png` not in repo; dispatch §1 textual inventory used verbatim
- `docs/build-docs/tickets/` does not exist; ticket lands at existing convention path

---

## §6 — Self-check Q1-Q9 expectations per WB commit (CONDUCTOR_API_CONTRACT.md §10.5)

Each cairn-grammar commit body answers all nine questions. Expected shapes per WB type:

| WB | Q1 (spike?) | Q2 (mocks?) | Q3 (impl-deleted-passes?) | Q4 (outside contract?) | Q5 (frozen mod?) | Q6 (labels?) | Q7 (parallel territory?) | Q8 (bypass PATCH?) | Q9 (halt-unauth?) |
|---|---|---|---|---|---|---|---|---|---|
| WB1 RED | N/A — observational RED | BEHAVIOR (real fs.readFile in WB2; real parser invocation against fixture) | No — impl absent; RED until WB2 | No — probe-only | No | KNOWN/MODELED applied | new test/unit/build-md/ path-disjoint from T1-T4/T6/T7 | N/A | No (HALT auto-ack per op autonomous mode) |
| WB2 GREEN | spike-equivalent: parser API verified at WB1 via direct read of types.ts + index.ts | BEHAVIOR (real parser invocation) | No — impl load-bearing for loadBuildMd | No | No (new dir; no frozen surface) | KNOWN/MODELED applied | build-md/ new dir; main.ts untouched at WB2 | N/A | No |
| WB3 RED | N/A | BEHAVIOR (real ipcMain.handle simulation via mock electron) | No — impl absent | No — probe-only | No | KNOWN/MODELED applied | new probe path-disjoint | N/A | No |
| WB4 GREEN | (see WB3) | BEHAVIOR (real registerBuildMdIpcHandlers wiring) | No — impl load-bearing | No | **YES — WORKSTATION_CONTRACT.md §6.6 amendment (operator-arbitrated; HALT-WB4-PRE-COMMIT required)** | KNOWN/MODELED applied | main.ts MB-T-WIREFRAME-T5 zone-disjoint from T1-T4/T6 zones | N/A | No |
| WB5 RED | N/A | BEHAVIOR (real React render via @testing-library/react + happy-dom) | No — impl absent | No — probe-only | No | KNOWN/MODELED applied | new component path-disjoint | N/A | No |
| WB6 GREEN | (see WB5) | BEHAVIOR (real component + real prop wiring) | No — impl load-bearing | No | conditional on Sub-Q-E (if (iii) new bottom-rail surface — may need ticket-#1 CSS amendment scope) | KNOWN/MODELED applied | frame-c/ extension OR new bottom-rail/ — coordinate with T4 if (iii) | N/A | No |
| WB7 RED | N/A | BEHAVIOR (real DAG traversal + mock fireSpawn — pure fn) | No — impl absent | No — probe-only | No | KNOWN/MODELED applied | dispatch-loop probe path-disjoint | N/A | No |
| WB8 GREEN | (see WB7) | BEHAVIOR (real DAG + injected fireSpawn) | No — impl load-bearing | No | No | KNOWN/MODELED applied | dispatch-loop.ts new file | N/A | No |
| WB9 RED | N/A | BEHAVIOR (real end-to-end main-process integration test) | No — wiring absent | No — probe-only | No | KNOWN/MODELED applied | end-to-end probe touches main.ts simulation | N/A | No |
| WB10 GREEN | (see WB9) | BEHAVIOR (real main.ts wiring + real DispatchLoop instantiation) | No — wiring load-bearing | No | conditional on Sub-Q-C (if (ii) new trigger IPC — §6.6 second amendment required, HALT-WB10-PRE-COMMIT) | KNOWN/MODELED applied | main.ts MB-T-WIREFRAME-T5 zone; coordinate with concurrent sessions if any | N/A | No |
| WB11 smoke | N/A | BEHAVIOR (real electron launch + α + β verify) | No — verifies WB1-WB10 integration | No | No | KNOWN per observed sentinels + α/β output | none — observational | N/A | No |
| WB12 docs | N/A | N/A | N/A | No — docs/coordination/ + docs/FOLLOWUPS.md edits | No | KNOWN per direct ticket-execution evidence | **pathspec-on-commit mandatory** per MB-F-METHODOLOGY-CROSS-SESSION-STAGING-CONTAMINATION Tier 1 | N/A | No |

---

## §7 — Definition of done

The ticket is DONE when ALL of the following hold:

1. **WB1-WB10 cairn ladder lands**: each RED probe flips RED → GREEN at the corresponding GREEN WB; commit chain pushed to origin/main per CLAUDE.md §2.6.
2. **`build-md/` directory shipped**: contains `service.ts` (loadBuildMd + computeReadySet + computeBuildMdStatus) + `dispatch-loop.ts` + `types.ts` + `index.ts` barrel.
3. **`workstation:read-build-md` IPC operative**: renderer invokes `window.workstationBridge.readBuildMd()`; main-process handler returns `BuildMdLoadResult`; ENOENT + ParseError + Success cases all surface honestly.
4. **WORKSTATION_CONTRACT.md §6.6 Channel #5 amendment landed**: operator-arbitrated text per HALT-WB4-PRE-COMMIT.
5. **BuildMdStatusLine renders wireframe template text**: `Loaded BUILD.md (rev <sha>) — parsed N tasks, M blocked, K ready.` with real counts from parser.
6. **DispatchLoop respects max-parallel + dispatch-mode**: auto fires controller directly; ask surfaces confirm modal via existing SpawnConfirmGate.
7. **End-to-end spawn-trigger fires real spawns**: WB11 smoke verifies clicking "Spawn K sessions" produces K real CC sessions in tile-grid.
8. **5-package typecheck CLEAN** per CLAUDE.md §4.4 (one command at a time): dispatch-core (verify dist build per §3.4 first) + dispatch-daemon + dispatch-workstation + dispatch-cli + dispatch-web.
9. **No regression in pre-existing baseline failures** per CLAUDE.md §4.5: `MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL` + `MB-F-WORKSTATION-INTEGRATION-TEST-FLAKE-SUITE` remain at known state; not re-diagnosed per WB.
10. **WB11 runtime-launch smoke** confirms WINDOW_READY + status-line renders + click triggers spawns + α/β PASS for both main + renderer bundles.
11. **WB12 findings doc + FOLLOWUPS.md updates** lands; followups filed per §4 WB12; `MB-F-BUILD-MD-SPEC-NOT-IN-REPO` sharpened-surface annotation noted (operator-arbitrated whether to close).
12. **Methodology-incident-free across WB1-WB12** per Round 9 stress regime: no anti-fabrication violations; no halt-unauthorized actions; no `git add -A`; pathspec-on-commit form applied; no cross-session staging contamination recurrence (per `MB-F-METHODOLOGY-CROSS-SESSION-STAGING-CONTAMINATION` Tier 1 closure path α discipline).

---

## §8 — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `BUILD-md-spec.md` not in repo (`MB-F-BUILD-MD-SPEC-NOT-IN-REPO` Tier 1 OPEN) — T5 cannot validate scope against spec | `[KNOWN]` | `[MODELED-MEDIUM]` (parser-as-spec-of-record acceptable per 143/143 GREEN; but future spec amendments may diverge from parser without single source of truth) | Use parser library as load-bearing reference; WB12 docs raises operator-arbitrated closure of `MB-F-BUILD-MD-SPEC-NOT-IN-REPO` |
| Sub-Q-C=(i) `orchestrator-fire-spawn` API may surface deps mismatch — T5 dispatch loop calls with different deps shape than orchestrator | `[MODELED-LOW]` (orchestrator-fire-spawn.ts is deps-injected per OrchestratorFireSpawnDeps; T5 supplies parallel deps) | `[MODELED-MEDIUM]` (refactor scope if Spec drift) | WB1 reading scope verifies API shape directly; WB9 probe end-to-end catches integration gaps |
| Sub-Q-B=(ii) operator-click button conflicts with auto-dispatch (Sub-Q-B=(i)) operator expectation — wireframe text "Spawning K sessions now" reads as observation-of-current-state | `[MODELED-MEDIUM]` (wireframe ambiguity per §3.2 table) | `[MODELED-MEDIUM]` (operator may want (i) post-dogfood) | WB12 files `MB-F-T5-WIREFRAME-AUTO-DISPATCH-AMBIGUITY` Tier 2 for post-dogfood re-arbitration |
| max-parallel source Sub-Q-D=(ii) — T4 ticket not yet shipped at T5 WB7 execution | `[KNOWN]` (T4 in Phase 1 second batch parallel; ship order unknown) | `[MODELED-MEDIUM]` (T5 falls back to Sub-Q-D=(i) sibling state if T4 not present) | Sub-Q-D=(i) sibling-state-fallback as graceful degradation; WB7 probe parameterized to handle either |
| Status-line DOM location Sub-Q-E=(i) Frame-C-bottom does NOT match wireframe window-bottom | `[KNOWN]` (cosmetic mismatch per §3.5 table) | `[MODELED-LOW]` (operator-visible but functional) | WB12 files `MB-F-T5-STATUS-LINE-WINDOW-BOTTOM-RELOCATION` Tier 3 for migration when T4 bottom-rail ships |
| `parseDependsOn` silently drops malformed refs (`MB-F-T28-MALFORMED-DEP-REF-TIGHTENING` Tier 3) — T5 status counts may be wrong under malformed BUILD.md | `[KNOWN]` (existing parser quirk) | `[MODELED-LOW]` (parse error count surfaces; malformed refs filed against MB-T28 not T5) | WB12 cross-ref; don't re-litigate at T5 |
| WORKSTATION_CONTRACT.md §6.6 amendment surface — operator HALT delays WB4 | `[KNOWN]` (per dispatch §3.3 each new IPC = arbitration cycle) | `[MODELED-LOW]` (queue-and-wait acceptable per dispatch §5.3 async cadence) | Surface HALT-WB4-PRE-COMMIT early; respect §2.5 halt discipline; no "useful prep" during halt |
| Sub-Q-C=(ii)/(iii) selected over default — second §6.6 amendment OR SpawnIpcController extension required | `[MODELED-LOW]` (default (i) recommended) | `[MODELED-HIGH]` (additional operator arbitration cycle; longer ladder) | Default to (i) per recommendation; only escalate if operator selects alternates |
| T6 α gate concurrent-push false STALE (`MB-F-METHODOLOGY-α-OVER-CONSERVATIVE-CONCURRENT-PUSH` Tier 3) — T5 rebuilds may race with sibling sub-sessions | `[KNOWN]` (per T6 WB4 finding) | `[MODELED-LOW]` (operational mitigation per §8.α step 4 in envelope) | Apply §8.α step 4 — investigate small-delta STALE for sibling push to dist-irrelevant paths before treating as blocker |
| Cross-session staging contamination recurrence (`MB-F-METHODOLOGY-CROSS-SESSION-STAGING-CONTAMINATION` Tier 1 from T6 WB5) | `[MODELED-MEDIUM]` (Round 9 4-6 concurrent sub-sessions) | `[MODELED-HIGH]` (commit attribution + T1-T4 sibling work co-pollution risk) | **MANDATORY pathspec-on-commit form** (`git commit -m "..." -- <pathspec>`) per closure path α at EVERY WB commit, not just docs; WB6 pristine commit precedent established |
| BUILD.md file does not exist at repo root during dogfood | `[KNOWN]` (verified `ls BUILD.md` 2026-05-12: NotFound) | `[MODELED-LOW]` (T5 surfaces honest NotFound placeholder; ships graceful empty-state) | WB5 + WB6 explicitly handle `error_type: 'NotFound'`; operator authors BUILD.md when ready to dogfood the dispatch loop |
| Parser API surface drift (MB-T28 parser is library import; future MB-T28 patches could change exported types) | `[MODELED-LOW]` (MB-T28 SHIPPED frozen at `7ce34b4` per CLAUDE.md §3.4 mechanical translation framing) | `[MODELED-MEDIUM]` (T5 typecheck breaks on parser type changes) | Pin to `dispatch-core/dist/build-doc-parser/index.js` import path; typecheck-clean serves as drift detection per WB |

---

**End of MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH ticket body.**

Pending operator resolutions before execution:
- Sub-Q-MBTWFT5-A (§3.1) — BUILD.md file location (i repo-root (RECOMMENDED) / ii per-session-cwd / iii operator-configured)
- Sub-Q-MBTWFT5-B (§3.2) — Dispatch trigger source (i auto-on-load / ii operator-click (RECOMMENDED) / iii auto-on-change)
- Sub-Q-MBTWFT5-C (§3.3) — Spawn pathway (i reuse orchestrator-fire-spawn (RECOMMENDED) / ii new trigger IPC / iii batch-spawn extension)
- Sub-Q-MBTWFT5-D (§3.4) — max-parallel source (i sibling state / ii T4 bottom-rail (RECOMMENDED) / iii BUILD.md preamble field)
- Sub-Q-MBTWFT5-E (§3.5) — status-line DOM location (i Frame-C-bottom (RECOMMENDED) / ii workstation-shell footer / iii new bottom-rail surface)

Plus operator notification (§2.4) of stale-dispatch reconciliation:
- Reshape: T5 is workstation-consumer of MB-T28 parser (parser SHIPPED at `7ce34b4`), NOT parser authoring
- Substitution: `BUILD-md-spec.md` not in repo; using parser-as-spec-of-record (143/143 GREEN)
- Substitution: `wireframe-target-2026-05-11.png` not in repo; using dispatch §1 textual inventory verbatim
- Substitution: `docs/build-docs/tickets/` not a convention; landing ticket at `docs/build-docs/CONDUCTOR_<TICKET>_BUILD.md`

Plus mandatory **HALT-WB4-PRE-COMMIT** operator wording-review of WORKSTATION_CONTRACT.md §6.6 Channel #5 amendment text. Conditional second HALT-WB10-PRE-COMMIT if Sub-Q-C=(ii) selected.
