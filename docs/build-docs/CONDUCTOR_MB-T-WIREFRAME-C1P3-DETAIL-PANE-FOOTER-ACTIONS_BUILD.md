# MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS — `diff` / `merge` / `focus` action bar in Frame C detail-pane

**Status:** DRAFT-PENDING-OPERATOR-REVIEW
**Date authored:** 2026-05-11
**Authored under:** §3.4 operator-supervised mechanical translation discipline (max-parallel autonomous mode, GATE W3 Batch 1 PHASE 1 continuation; T3 #4 + T2 #1 + T4 #2 are siblings)
**Authoring delegate:** T3 sub-session (Opus 4.7), bounded by W1 + W2 wireframe-audit dispositions 2026-05-11
**Authoring anchor commit (HEAD at authoring time):** `dec21c1`
**Cairn ladder anchor:** Tier 1 #3 of GATE W3 Batch 1. Sibling of MB-T-WIREFRAME-B1-TILE-VISUAL-SEPARATION (T2, `e41c9ea`) + MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE (T4, pending) + MB-T-WIREFRAME-C1P4-COMPACT-TILE-MODE (T3 #4, `dec21c1`). EXECUTION-SERIALIZED: depends on ticket #2 (Frame C surface) shipping the detail-pane host BEFORE WB1 can author the action-bar probe.
**Closes:**
- Plan `v35-operational-readiness-2026-05-10.md` §6.2 row "§C.1′ ticket #3 (Detail-pane footer actions)" verbatim scope at line 658.
- A NOVEL surface relative to the 2026-05-09 wireframe audit (audit §6.D Frame Navigation enumerates Frame tab router + frame title as `WIREFRAME-VISION-NOT-SHIPPED`; detail-pane was not an audit-time object because Frame C did not yet exist). Post-WB6 ship, the audit-doc must grow a new row OR a new §6.F subsection capturing the detail-pane action-bar surface.
**Depends on (MUST land before WB1):**
- MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE (T4, pending commit) — defines the `frame-c/` directory + the detail-pane host React component the action-bar mounts INTO. Until this ticket lands on origin/main, WB1 has no rendering host to assert against.
- §C.1′ Frame Router (`44764fd`) — `FrameMode = 'A' | 'C'`; Frame C is the host frame for the detail-pane.
- MB-T12 tile-grid (post-WB12, `69d7d29`) — `TileGridSessionEntry[]` is the data source the detail-pane consumes for the selected-session-shape; this ticket reads the entry shape but does not modify MB-T12.
**Depends on (already merged):**
- IPC controller precedent: MB-T22 `commits-ipc.ts` (`registerCommitsIpc` factory + main.ts call site) + MB-T24 `dispatch-mode-ipc.ts` (`DispatchModeIpcController` class + factory + DI seam) + MB-T16 `approval-policy-ipc.ts` (full daemon-roundtrip pattern). WB4 GREEN mirrors the most appropriate of these depending on Sub-Q-MBTWBDPFA-B action semantics (workstation-internal vs daemon-roundtrip).
- preload contextBridge precedent: existing `preload.mts` exposes multiple bridges (workstationBridge, coarchitectBridge, dispatchModeBridge, commitsBridge, etc.). WB4 GREEN adds a new `frameCBridge` (or similar; operator may prefer extending an existing bridge — Sub-Q-MBTWBDPFA-D).
**Downstream gates:**
- Audit-doc reclassification (post-WB6 merge: append §6.F or extend §6.E with detail-pane action-bar surface).
- §A.1.R=(2) Frame C detail-pane is operationally complete (selected session affords diff/merge/focus operator actions; failure modes surface inline-visible).
**Estimated WB count:** 5-7 (3 pairs of RED+GREEN: action-bar UI, IPC channels, failure UX; +1 docs; +1 conditional `contract(...)` commit if Sub-Q-MBTWBDPFA-A=(β)).

---

## §0 — Reading protocol

1. Read §1 (scope) + §2 (arbitration anchor — what's binding) first.
2. Read §3 (GATE sub-arbitrations) — FOUR operator decisions are pre-execution prerequisites. Sub-Q-MBTWBDPFA-A is load-bearing (potentially gates a separate `contract:` commit per CLAUDE.md §2.4 BEFORE any GREEN WB ships). Sub-Q-MBTWBDPFA-B + C + D bind probe + implementation shape.
3. Read §4 (WB ladder) for execution order. Note ladder includes a conditional `contract(MB-T-WIREFRAME-C1P3-detail-pane-ipc): extend WORKSTATION_CONTRACT §6` commit gated on Sub-Q-MBTWBDPFA-A=(β).
4. §5-§9 are operational supports — cross-references, self-check expectations, definition-of-done, risk register.
5. §9 closing posture (anomalies surfaced at HALT-AUTHORED).

Confidence labels per CLAUDE.md §2.2 apply throughout: `[KNOWN]` observed in this session via direct source/git read; `[MODELED]` reasoned from observed facts plus a stated model; `[SPECULATIVE]` hypothesis without evidence. Operator-frozen-envelope outcomes are `[KNOWN-OPERATOR-ARBITRATED]` and binding for ticket scope.

---

## §1 — Scope

### §1.1 — What this ticket DOES

`[KNOWN-OPERATOR-ARBITRATED]` per Gate-W3 PHASE 1 dispatch envelope 2026-05-11 + plan §6.2 line 658:

1. **Author an `ActionBar` component** in `packages/dispatch-workstation/src/frame-c/` (directory created by ticket #2 prerequisite). The component renders three buttons in the Frame C detail-pane footer when a session is selected: `[Diff]`, `[Merge]`, `[Focus]` (button labels subject to Sub-Q-MBTWBDPFA-B; default labels recommended). Component is RENDERER-INTEGRATED per the audit §4.1 three-tier discipline (no direct bridge access; consumes data as props; emits via callback props).

2. **Wire three new IPC channels** (channel names subject to Sub-Q-MBTWBDPFA-B; default `frame-c:diff`, `frame-c:merge`, `frame-c:focus`). Each channel implements:
   - Renderer-side: `frameCBridge.diff(sessionName)` / `.merge(sessionName)` / `.focus(sessionName)` (or operator-preferred bridge per Sub-Q-MBTWBDPFA-D), exposed via `preload.mts` `contextBridge.exposeInMainWorld('frameCBridge', ...)`.
   - Main-process side: `ipcMain.handle('frame-c:diff', ...)` etc., mirroring `dispatch-mode-ipc.ts:55-78` Controller-with-DI-seam pattern. Production factory at `frame-c-ipc.ts` (NEW file; package: `src/main/` per existing IPC-controller convention — NOT inside `src/frame-c/` because IPC controllers are main-process concerns separate from renderer components).
   - Action semantics for each channel per Sub-Q-MBTWBDPFA-B operator binding.

3. **Wire failure-UX surface** per Sub-Q-MBTWBDPFA-C operator binding. Each IPC handler returns a discriminated-union result (success / error with error_type + message); ActionBar renders the failure state inline (banner) OR via modal OR via toast (operator decision). Mirrors MB-T16 `TileApprovalPicker`'s optimistic-UI-with-rollback pattern where structurally appropriate.

4. **Preserve** the audit §4.1 three-tier integration discipline: ActionBar is RENDERER-INTEGRATED + bridge-free at the component level; bridge consumption is via callback props from the Frame C detail-pane host (ticket #2 territory) which itself holds the `window.frameCBridge` reference. ActionBar receives `onDiff`, `onMerge`, `onFocus` callback props + `sessionName: string | null` selection state.

5. **Update audit doc** at WB7 docs commit per Sub-Q-MBTWBDPFA-C closure-state framing. Append §6.F (or extend §6.E Shipped-Beyond-Wireframe) with detail-pane action-bar surface.

### §1.2 — What this ticket DOES NOT

`[KNOWN-OPERATOR-ARBITRATED]` constraints:

- Does NOT modify ticket #2's Frame C surface scope. The detail-pane host is ticket #2 territory; this ticket consumes the host's "action-bar slot" extension point.
- Does NOT modify frozen surfaces UNLESS Sub-Q-MBTWBDPFA-A=(β) — in which case a separate `contract(MB-T-WIREFRAME-C1P3-detail-pane-ipc): extend WORKSTATION_CONTRACT §6` commit lands BEFORE any GREEN WB ships per CLAUDE.md §2.4. Frozen-surface mods are operator-arbitrated, not delegate-arbitrated.
- Does NOT modify `tile.tsx`, `tile-header.tsx`, `tile-footer.tsx`, `tile-approval-picker.tsx`, `tile-autopilot-toggle.tsx`, or any other Tile-tree component. Detail-pane chrome is Frame-C-only; Frame A's tile chrome is ticket #4 territory.
- Does NOT modify `dispatch-core/src/v3/schema.ts`. If IPC payload schemas are needed (Zod validation), they live in `frame-c-ipc-schemas.ts` (NEW file local to dispatch-workstation) per the cross-package-boundary discipline (Q-MBT21-7=a — no cross-package imports from dispatch-web; mirrored for dispatch-workstation IPC schemas).
- Does NOT modify daemon-side `/v2/` or `/v3/` routes. Action semantics (per Sub-Q-MBTWBDPFA-B) are workstation-internal: `diff` invokes git via `child_process` mirroring MB-T22 `commits-ipc.ts`; `merge` similarly; `focus` is renderer-side state mutation (e.g., select-tile in Frame A) OR a workstation-internal IPC (tmux attach) — NO daemon route invocation.
- Does NOT modify `chat-shell/`, kanban webview, splitter, header-bar, or any other non-Frame-C surface.
- Does NOT implement the failure-UX surface as a CROSS-SESSION shared component (toast queue). If toast is the chosen Sub-Q-MBTWBDPFA-C outcome, the toast component is Frame-C-scoped; cross-session toast is a separate ticket if surfaced.
- Does NOT measure perceptual-density Q-V35 thresholds. Visual evaluation is operator-driven post-WB6.

---

## §2 — Arbitration anchor (operator-frozen 2026-05-11)

### §2.1 — Plan §6.2 row "§C.1′ ticket #3" binds scope

`[KNOWN-OPERATOR-ARBITRATED]`

Plan `v35-operational-readiness-2026-05-10.md` §6.2 line 658 enumerates the ticket scope verbatim: "§C.1′ ticket #3 (Detail-pane footer actions): Add diff/merge/focus actions to Frame C detail-pane. `frame-c/` + 3 new IPC channels. NOT parallel-CC viable; depends on ticket #2 detail-pane shape." This binds:
- Three actions: diff, merge, focus (action SET is fixed; action SEMANTICS subject to Sub-Q-MBTWBDPFA-B).
- Three IPC channels (one per action).
- File ownership: `frame-c/` directory (renderer-side components) + new IPC controller file in `src/main/` (per existing pattern).
- Execution-serialization: ticket #2 MUST land before this ticket's WB1 can author the action-bar probe (no detail-pane host to mount into otherwise).

### §2.2 — Audit §4.1 three-tier integration discipline is binding

`[KNOWN-AUDIT-FILED-2026-05-09]`

Audit §4.1 strategic finding paragraph enumerates three component tiers: RENDERER-INTEGRATED (props-only, no bridge access), MOUNTED-VIA-RENDER-PROP (constructed by parent with bridge ref captured), DECOUPLED (architecturally separate; xterm.js precedent). The ActionBar component MUST be RENDERER-INTEGRATED tier — receives callback props from the Frame C detail-pane host; the host (ticket #2) holds the `window.frameCBridge` reference.

This decision is binding for WB2 GREEN scope. ActionBar MUST NOT directly import `window.frameCBridge` or any IPC-aware module. Tests must be authorable without provider/bridge mocks at the component level.

### §2.3 — IPC controller pattern: DispatchModeIpcController is the recommended anchor

`[KNOWN]`

Three precedents exist for new IPC channels in dispatch-workstation:
- **MB-T16 `approval-policy-ipc.ts`** — full daemon-roundtrip + Zod validation + optimistic-UI rollback. Heaviest pattern; appropriate when daemon-side state must coordinate.
- **MB-T22 `commits-ipc.ts`** — workstation-internal git invocation via `child_process`; no daemon route; `registerCommitsIpc()` factory function. Light pattern; appropriate when git tooling is the action.
- **MB-T24 `dispatch-mode-ipc.ts`** — workstation-internal fs persistence via `dispatch-mode-store.ts`; Controller class with DI seam + factory. Standard pattern; appropriate when workstation-internal state mutation is the action.

For this ticket: `diff` + `merge` are git-invocation actions → MB-T22 `commits-ipc.ts` pattern is appropriate. `focus` is workstation-internal state mutation → MB-T24 `dispatch-mode-ipc.ts` pattern is appropriate. Sub-Q-MBTWBDPFA-B operator decision determines whether action semantics permit a single unified Controller class or require separate controllers.

---

## §3 — GATE sub-arbitrations REQUIRED before specific WBs

FOUR operator decisions are pre-execution prerequisites. Surface at HALT-MBTWBDPFA-AUTHORED for operator resolution before WB1 (Sub-Qs B + D bind probe shape) and before any GREEN WB (Sub-Q-A potentially gates a separate `contract:` commit; Sub-Q-C binds failure-UX implementation surface).

### §3.1 — Sub-Q-MBTWBDPFA-A: `WORKSTATION_CONTRACT.md` §6 amendment scope (LOAD-BEARING; T2's W2-Q4 flagged this)

Required **BEFORE ANY GREEN WB** (WB2 GREEN cannot ship until resolved). Default if unresolved: **(α) lenient — additive IPC channels do NOT require §6 amendment**, matching MB-T22/MB-T24/MB-T16/MB-T17 precedent.

`WORKSTATION_CONTRACT.md §6` is enumerated as frozen per `CLAUDE.md` §1: "WORKSTATION_CONTRACT.md §6 — IPC + endpoints". Three new IPC channels (`frame-c:diff`, `frame-c:merge`, `frame-c:focus`) are additive workstation-internal surfaces. The question is whether the contract envelope considers additive IPC channels as:

| Option | Posture | Action |
|---|---|---|
| **(α) Lenient (RECOMMENDED — matches shipped precedent)** | Additive IPC channels are workstation-internal extension points NOT covered by the §6 freeze. The §6 freeze is the daemon-IPC-bridge transport contract (request/reply envelope shapes, error_type discriminants) — not an exhaustive enumeration of every renderer↔main channel. Shipped tickets MB-T22 + MB-T24 + MB-T16 + MB-T17 all added new IPC channels without §6 amendments and shipped under cairn-grammar GREEN commits without `contract:` commits. | No frozen-surface touch; this ticket proceeds with normal RED→GREEN WB ladder. |
| **(β) Strict** | Every new IPC channel requires §6 enumeration per the frozen-surface discipline. Prior tickets shipped under a less-strict interpretation; that drift is acknowledged but going forward §6 must be amended. | Separate `contract(MB-T-WIREFRAME-C1P3-detail-pane-ipc): extend WORKSTATION_CONTRACT §6 with frame-c channel enumeration` cairn-grammar commit lands BEFORE WB2 GREEN. Adds 1 WB to the ladder. May trigger retroactive §6 amendment review for shipped tickets (out-of-scope for this ticket; surface as Tier 2 followup `MB-F-WORKSTATION-CONTRACT-SECTION-6-DRIFT-AUDIT` if (β) selected). |

`[MODELED]` Recommend **(α)** because:
1. Multi-precedent: MB-T16/17/22/24 all shipped additive IPC without §6 amendment under the lenient interpretation. Reversing course mid-ticket would create an asymmetric discipline (this ticket strict, others lenient) without resolving the drift.
2. T2's W2-Q4 flagged the question; operator may now arbitrate the standing interpretation. (α) ratifies the de-facto shipped practice. (β) requires a separate audit-doc workstream to bring shipped tickets into compliance.
3. The §6 freeze's intent is plausibly the daemon-IPC envelope shape (which IS load-bearing across packages + sessions). Renderer↔main IPC channels are workstation-internal coordination, not cross-package contract surface.

Operator decision pending. If (β): add WB0 `contract:` commit + queue follow-up audit ticket.

### §3.2 — Sub-Q-MBTWBDPFA-B: Action semantics (LOAD-BEARING for probe + implementation)

Required before **WB1 RED + WB3 RED + WB2 GREEN + WB4 GREEN**. Default if unresolved per dispatch text: see candidate options below; operator selects per action.

Three actions; each has multiple plausible semantics:

#### §3.2.A — `diff` action

| Option | Semantics | Implementation surface |
|---|---|---|
| **(i)** Opens git diff for selected session's branch vs `main` (default base) | `git diff main...<branch>` invoked via `child_process`; renders diff output in a NEW detail-pane sub-region (or modal) | `commits-ipc.ts`-pattern; `child_process.exec` + parser |
| **(ii)** Opens git diff vs `HEAD~1` of selected session's branch | `git diff HEAD~1` in session's cwd | Same as (i); different argv |
| **(iii)** Opens diff UI with operator-selected base (dropdown of common bases: main, HEAD, HEAD~1, HEAD~N) | Adds operator-base-selector before action fires | (i) + selector UI; more chrome scope |
| **(iv)** Opens external diff tool (`git difftool`) — operator's configured external tool (e.g., `git config diff.tool`) takes over | `child_process.spawn` of `git difftool`; no diff rendering in workstation; workstation backgrounds while tool runs | Lightest workstation scope; operator-environment-dependent |

`[MODELED]` Recommend **(i)** as default: most common operator intent ("show me what this session changed"); workstation-renderable; no operator-config dependency; matches dogfood operator pattern.

#### §3.2.B — `merge` action

| Option | Semantics | Implementation surface |
|---|---|---|
| **(i)** Performs `git merge --no-commit <branch>` from selected session's branch into `main` (or current branch), then halts for operator confirm before commit | `child_process` of `git merge`; surfaces conflict state + commit-ready state | High operator-supervision; safest |
| **(ii)** Performs full `git merge` (commit-immediate); on conflict, surfaces error + leaves index in merge state | `git merge <branch>` direct invoke | Faster; relies on operator-pre-validated branch |
| **(iii)** Stages a merge proposal in a separate workstation-internal queue; operator reviews + approves in a separate UI | Adds a merge-proposal queue surface | Cleanest semantically; adds significant UI scope (out of plan §6.2 verbatim?) |
| **(iv)** Out of scope — `merge` action surfaces a "Coming Soon" or "Use external tool" message; no actual git invocation | Stub action with text; no git wiring | Defers structural complexity to later ticket |

`[MODELED]` Recommend **(i)** with `--no-commit` flag for safety: operator-supervised merge with conflict surfacing; matches dogfood pattern of "merge to main with operator gate." (ii) is unsafe (silent commits on dirty state). (iii) is scope-creep. (iv) is ship-shy but operator-defensible if `merge` semantics aren't yet settled.

`[SPECULATIVE-RISK]` `merge` is the highest-risk action: destructive (modifies working tree + index + potentially HEAD). Operator may prefer (iv) ship-shy default until dogfood evidence supports more aggressive semantics.

#### §3.2.C — `focus` action

| Option | Semantics | Implementation surface |
|---|---|---|
| **(i)** Toggles workstation FrameMode to `'A'` (compact tile mode) + scrolls/selects the chosen session's tile | Calls `writeFrameMode('A')` from frame-mode-state + emits a renderer event for tile-grid to scroll/highlight | Pure workstation-internal; no daemon/tmux; integrates with ticket #4 compact mode |
| **(ii)** Issues `tmux attach -t <sessionName>` in a new terminal window (spawns external terminal) | `child_process.spawn` of `tmux attach`; macOS: `open -a Terminal "tmux attach -t..."` | Operator-environment-dependent; cross-platform variance |
| **(iii)** "Focus" = inline-detail-pane behavior — expands the detail-pane to fill more screen space + shows full session activity log | Pure renderer-side state mutation in Frame C | Ticket-#2-host-dependent; needs operator decision on detail-pane expand semantics |
| **(iv)** Hybrid: (i) AND (iii) — toggle to Frame A AND expand the session's tile | Combines (i) + (iii) | Most useful operationally; biggest UI scope |

`[MODELED]` Recommend **(i)** as default: simplest; integrates with ticket #4 (compact tile mode operator-arbitrated); no environmental dependency. (iii) is appealing but ticket-#2 detail-pane shape must support expand semantics — possibly out of #2 scope. (iv) is scope-creep.

### §3.3 — Sub-Q-MBTWBDPFA-C: Failure UX

Required before **WB5 RED + WB6 GREEN**. Default if unresolved: **(α) inline banner inside ActionBar**.

Each action can fail. Examples:
- `diff` fails if cwd is not a git repo OR if branch doesn't exist OR if `child_process` returns non-zero.
- `merge` fails if there's a merge conflict OR if working tree is dirty OR if branch is non-fast-forward.
- `focus` fails (rarely) if FrameMode write fails (disk full, perms, etc.).

Three surface choices:

| Option | UX | Component complexity |
|---|---|---|
| **(α) Inline banner inside ActionBar (RECOMMENDED default)** | After action fires, ActionBar renders an error-state `<div role="alert">` below the buttons with the error message + Dismiss button. Auto-dismisses on next successful action. | Minimal; pure component state; no global queue |
| **(β) Modal dialog** | Action failure opens a modal `<dialog>` with the error message + Dismiss button. Blocks Frame C interaction until dismissed. | Adds modal infrastructure; matches existing spawn-result modal pattern (workstation-shell.html:286-355) |
| **(γ) Toast queue (top-right corner of workstation)** | Action failure pushes a toast onto a queue; toasts auto-dismiss after 5s (or persistent for errors). Multi-session-failures stack. | Adds toast-queue infrastructure (cross-session shared component); larger scope; matches existing spawn-result banner pattern (workstation-shell.html:258-275) |

`[MODELED]` Recommend **(α)** as default: ship-shy; minimal infrastructure; operator can ratchet to (β) or (γ) post-dogfood if banner proves insufficient. (β) is appropriate if operator considers merge-conflict-recovery a "must acknowledge" event. (γ) is appropriate if cross-action failure observability is a priority.

### §3.4 — Sub-Q-MBTWBDPFA-D: Preload bridge surface

Required before **WB4 GREEN**. Default if unresolved: **(α) NEW `frameCBridge`** matching commitsBridge / dispatchModeBridge / coarchitectBridge precedent.

| Option | Surface | Trade-off |
|---|---|---|
| **(α) NEW `frameCBridge` (RECOMMENDED)** | `contextBridge.exposeInMainWorld('frameCBridge', { diff, merge, focus })` in preload.mts. New top-level bridge. | Clean separation; mirrors MB-T22 commits / MB-T24 dispatch-mode precedent (each new IPC family gets its own bridge). |
| **(β) Extend existing `workstationBridge`** | Adds `workstationBridge.frameC.diff()` etc. (nested namespace) OR `workstationBridge.diff()` flat. | Reuses existing bridge; arguably violates separation-of-concerns. Adds `frame-c` namespace to a generic bridge. |
| **(γ) Extend `coarchitectBridge`** | Adds methods to the chat-shell bridge. | Mis-fit; coarchitect is chat-shell-scoped. Not recommended. |

`[MODELED]` Recommend **(α)** for consistency with established pattern (each new IPC family = new bridge).

---

## §4 — WB ladder

WB count: 5-7 if Sub-Q-MBTWBDPFA-A=(α) (no `contract:` commit); 6-8 if (β) (adds WB0 contract commit). Failure-UX scope (Sub-Q-C) may collapse WB5+WB6 into WB4 if (α) inline banner is chosen (single GREEN WB carries the failure-UX). Action semantics (Sub-Q-B) may expand or contract WB2 GREEN scope (e.g., (iv) ship-shy stub is ~10-line WB; (iii) operator-base-selector requires sub-WBs for selector UI).

### WB0 (CONDITIONAL on Sub-Q-MBTWBDPFA-A=(β)) — `contract(MB-T-WIREFRAME-C1P3-detail-pane-ipc): extend WORKSTATION_CONTRACT §6`

**Type:** contract
**Scope:** Amend `docs/build-docs/WORKSTATION_CONTRACT.md` §6 with the three new IPC channels: `frame-c:diff`, `frame-c:merge`, `frame-c:focus`. Document request/reply envelope shapes, error_type discriminants, and the bridge surface (`frameCBridge`). Per CLAUDE.md §2.4, this is operator-arbitrated; the delegate authors the amendment text but operator reviews + commits.
**Acceptance:** Single docs commit; cairn-grammar `contract:` prefix; operator review at HALT-WB0-PRE-COMMIT before any GREEN WB ships.
**Frozen contracts touched:** YES — `WORKSTATION_CONTRACT.md §6` (operator-arbitrated by definition).

### WB1 — `red(MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS): probe asserts ActionBar renders 3 buttons in detail-pane footer`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/unit/frame-c/probe-mbtwbdpfa-01-action-bar-renders.spec.tsx` (NEW file; happy-dom environment via per-file pragma per `vitest.config.ts` convention). Render `<ActionBar sessionName='session-foo' onDiff={vi.fn()} onMerge={vi.fn()} onFocus={vi.fn()} />` and assert:
- **probe-01a** `[data-testid="frame-c-action-bar"]` element exists.
- **probe-01b** Three buttons exist with stable testids: `action-bar-diff-btn`, `action-bar-merge-btn`, `action-bar-focus-btn`.
- **probe-01c** When `sessionName === null`, buttons render in `disabled` state (no session selected).
- **probe-01d** When `sessionName !== null`, buttons render enabled.
- **probe-01e** Clicking each button invokes its respective callback prop with `sessionName` as the argument (verify via `vi.fn` call assertions).

**Acceptance:** Probe RED at HEAD pre-WB2 because `ActionBar` component does not exist in `frame-c/`. Specifically: tests fail at module-import-resolution (import `../../../src/frame-c/action-bar.js` from probe → ENOENT). Per the MB-T-HSO-WIRE WB4-revised precedent (`cd135e4`), use `@ts-expect-error WB1 RED:` comment in probe source.

**Frozen contracts touched:** none — probe-only.

**Pre-WB1 verification:** ticket #2 (`frame-c/` directory + detail-pane host component) MUST be merged on origin/main BEFORE WB1 authoring proceeds. If `src/frame-c/` does not exist at WB1 start, HALT-and-surface for orchestrator unblock; this is the EXECUTION-SERIALIZATION gate per plan §6.2 "NOT parallel-CC viable."

### WB2 — `green(MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS): ActionBar component`

**Type:** green
**Scope:** Author `packages/dispatch-workstation/src/frame-c/action-bar.tsx` (NEW file). Pure React component, RENDERER-INTEGRATED per audit §4.1 three-tier discipline. Component receives:
- `sessionName: string | null`
- `onDiff: (sessionName: string) => void`
- `onMerge: (sessionName: string) => void`
- `onFocus: (sessionName: string) => void`
- (Optional) `failureState: { action: 'diff'|'merge'|'focus'; message: string } | null` — if Sub-Q-MBTWBDPFA-C=(α) inline-banner default, the host (ticket #2) passes failure state down via prop.

Component renders:
- Root `<div data-testid="frame-c-action-bar">` with three `<button>` elements.
- Buttons disabled when `sessionName === null`.
- (Conditional Sub-Q-MBTWBDPFA-C=(α)) failure banner below buttons when `failureState !== null`.

**Acceptance:** WB1 probes flip RED → GREEN. Workstation typecheck CLEAN.

**Frozen contracts touched:** none.

### WB3 — `red(MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS): probe asserts 3 IPC channels exist + roundtrip`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/unit/frame-c-ipc/probe-mbtwbdpfa-03-ipc-channels.spec.ts` (NEW file). Assert:
- **probe-03a** `FrameCIpcController` class exists at `src/main/frame-c-ipc.ts` and has a `registerHandlers(ipcMain)` method.
- **probe-03b** After `registerHandlers` is called against a fake `ipcMain`, three `handle` calls have been recorded for the three channel names (Sub-Q-MBTWBDPFA-B operator-decision-bound exact channel names).
- **probe-03c** For each channel, invoking the handler with a valid `{sessionName: 'session-foo'}` payload returns a discriminated-union result shape `{ok: true, ...} | {ok: false, error_type: ..., message: ...}`. The actual git invocation may be mocked via DI seam (FrameCIpcDeps).

**Acceptance:** Probe RED at HEAD pre-WB4 because `FrameCIpcController` does not exist. Import-resolution failure.

**Frozen contracts touched:** none — probe-only.

### WB4 — `green(MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS): IPC controller + preload bridge wired`

**Type:** green
**Scope:** Two files (+ optional preload edit):

1. `packages/dispatch-workstation/src/main/frame-c-ipc.ts` (NEW file): `FrameCIpcController` class mirroring `DispatchModeIpcController` (DI seam + factory). Three `ipcMain.handle` calls. Each handler validates payload shape, invokes the DI-seam'd action helper (per Sub-Q-MBTWBDPFA-B), returns discriminated-union result.

2. `packages/dispatch-workstation/src/main/preload.mts`: extend with `contextBridge.exposeInMainWorld('frameCBridge', { diff, merge, focus })` per Sub-Q-MBTWBDPFA-D=(α) default. Each method invokes via `ipcRenderer.invoke(channel, {sessionName})`.

3. `packages/dispatch-workstation/src/main/main.ts`: register `FrameCIpcController` via `createDefaultFrameCIpcController().registerHandlers(ipcMain)` call in the existing IPC-registration zone. **NOTE:** main.ts ownership at WB4 execution time depends on orchestrator coordination. If T2/T4 hold main.ts territory, HALT-WB4-PRE-COMMIT until released.

4. ActionBar integration: ticket #2's detail-pane host calls `window.frameCBridge.diff(sessionName)` etc. via the callback-prop seam.

**Acceptance:** WB3 probes flip RED → GREEN. Workstation typecheck CLEAN.

**Frozen contracts touched:** Conditional — if Sub-Q-MBTWBDPFA-A=(β), §6 is amended in WB0 BEFORE this WB. If (α), no frozen-surface touch in this WB.

**Pre-WB4 verification:** main.ts territory check; if held, HALT and coordinate with orchestrator.

### WB5 — `red(MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS): failure-UX probe`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/unit/frame-c/probe-mbtwbdpfa-05-failure-ux.spec.tsx` (NEW file). Assertions per Sub-Q-MBTWBDPFA-C:
- For (α) inline-banner: render `<ActionBar failureState={{action:'merge', message:'merge conflict'}} ...>` and assert error banner renders inline with `role="alert"` + message text + Dismiss button.
- For (β) modal: assert modal `<dialog>` renders + traps focus + Dismiss closes it.
- For (γ) toast: assert toast pushes to a `ToastContext` queue.

**Acceptance:** Probe RED at HEAD pre-WB6 because `failureState` prop / modal / toast queue does not exist.

**Frozen contracts touched:** none.

### WB6 — `green(MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS): failure-UX implementation`

**Type:** green
**Scope:** Implementation per Sub-Q-MBTWBDPFA-C choice. For (α) (recommended default): extend ActionBar to render failure banner when `failureState` prop is non-null. Ticket #2's detail-pane host catches the bridge call's error result + sets `failureState` prop accordingly.

**Acceptance:** WB5 probes flip RED → GREEN. Consumer non-regression: existing tile-grid + Frame C tests stay GREEN.

**Frozen contracts touched:** none.

### WB7 — `docs(MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS): audit-doc append + findings doc + FOLLOWUPS closure`

**Type:** docs
**Scope:** Single docs commit (pathspec-restricted per CLAUDE.md §2.7):
1. Append `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` with a new §6.F (or extend §6.E) capturing the detail-pane action-bar surface as SHIPPED.
2. (Optional) Author short findings doc at `docs/coordination/mbtwbdpfa-findings-<date>.md` mirroring MB-T-HSO-WIRE WB17 docs format.
3. Update `docs/FOLLOWUPS.md` if any new followups surfaced during execution (e.g., merge-conflict-recovery flow, operator-config diff tool support).

**Acceptance:** Single docs commit body Q1-Q9.

**Frozen contracts touched:** none.

---

## §5 — Cross-references

### §5.1 — Followups closed by this ticket

This ticket closes a novel-surface gap (detail-pane footer actions) that did not exist in the 2026-05-09 audit because Frame C did not exist. Closure is via audit-doc append at WB7.

No pre-existing FOLLOWUPS rows close as a direct consequence of this ticket.

### §5.2 — Followups likely to surface during this ticket

`[MODELED-SPECULATIVE]`:

- If Sub-Q-MBTWBDPFA-A=(β), file Tier 2 `MB-F-WORKSTATION-CONTRACT-SECTION-6-DRIFT-AUDIT` tracking the retroactive review of shipped tickets (MB-T16/17/22/24) that added IPC channels without §6 amendment.
- If Sub-Q-MBTWBDPFA-B `merge` action chosen as (iv) ship-shy stub, file Tier 2 `MB-F-FRAME-C-MERGE-ACTION-SEMANTICS` tracking the deferred decision for post-dogfood implementation.
- If WB2 ActionBar surfaces operator-environment-dependent diff/merge behavior (e.g., `git config diff.tool` unset), file Tier 3 `MB-F-FRAME-C-DIFF-MERGE-ENV-FALLBACK` tracking the fallback UX.
- If failure-UX (Sub-Q-C=α inline-banner) proves insufficient under dogfood (e.g., merge-conflict states need persistent surfacing), file Tier 3 `MB-F-FRAME-C-FAILURE-UX-RATCHET` tracking the operator-driven escalation path to (β) modal or (γ) toast.

### §5.3 — Related shipped tickets (read-required at WB1 start)

| Ticket | Anchor | Read scope at WB1 |
|---|---|---|
| MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE (ticket #2) | T4 pending | `src/frame-c/` directory shape + detail-pane host component + selected-session state shape — REQUIRED for WB1 probe to know the integration seam |
| MB-T22 `commits-ipc.ts` | (commits-ipc.ts shipped) | Pattern for git-tooling IPC channel via `child_process` invocation; relevant for diff + merge implementation |
| MB-T24 `dispatch-mode-ipc.ts` | (dispatch-mode-ipc.ts:1-92 read) | Pattern for Controller class + DI seam + factory; relevant for FrameCIpcController shape |
| MB-T16 `approval-policy-ipc.ts` | (approval-policy-ipc.ts shipped) | Pattern for failure-UX optimistic rollback; relevant if Sub-Q-MBTWBDPFA-C=(α) banner + retry pattern |
| §C.1′ Frame Router (44764fd) | `44764fd` | `frame-mode-state.ts` read/write helpers; relevant for `focus` action Sub-Q-MBTWBDPFA-B=(i) implementation |
| Compact tile mode #4 (T3) | `dec21c1` (this delegate's prior body) | If Sub-Q-MBTWBDPFA-B-focus=(i), the focus action triggers FrameMode='A' — synergy with ticket #4 |

### §5.4 — Related FOLLOWUPS rows (read-required)

- Audit §4.1 strategic finding paragraph (three-tier integration discipline) — binding for ActionBar component design.
- Audit §6.D Frame Navigation table — informational; this ticket creates a novel surface NOT yet in §6.D.
- Plan §A.1.R=(2) Frame-C-primary + A-toggle — binding architectural posture; this ticket lives in Frame C's detail-pane.

### §5.5 — Files this ticket READS but DOES NOT MODIFY

- `packages/dispatch-workstation/src/frame-c/<detail-pane-host>.tsx` (ticket #2 territory) — consumed for integration seam; not modified.
- `packages/dispatch-workstation/src/main/dispatch-mode-ipc.ts` — pattern anchor; not modified.
- `packages/dispatch-workstation/src/main/commits-ipc.ts` — pattern anchor; not modified.
- `packages/dispatch-workstation/src/main/approval-policy-ipc.ts` — failure-UX pattern anchor; not modified.
- `packages/dispatch-workstation/src/main/frame-mode-state.ts` — `focus` action target if Sub-Q-MBTWBDPFA-B-focus=(i); read-only consumption via helper functions, not modified.

### §5.6 — Anchor commit at ticket-authoring time

`dec21c1` (T3's prior body for ticket #4). T2 + T4 are concurrent; origin/main may advance during this body's authoring. Authoring is HEAD-stable; the body's `[KNOWN]` cites are from sources read this session at HEAD `dec21c1`.

---

## §6 — Self-check Q1-Q9 per WB commit (CONDUCTOR_API_CONTRACT.md §10.5)

| WB | Q1 (spike?) | Q2 (mocks?) | Q3 (impl-deleted-passes?) | Q4 (outside contract?) | Q5 (frozen mod?) | Q6 (labels?) | Q7 (parallel territory?) | Q8 (bypass PATCH?) | Q9 (halt-unauth?) |
|---|---|---|---|---|---|---|---|---|---|
| WB0 (β only) | N/A | N/A | N/A | No — single docs commit | YES (§6) — operator-arbitrated | KNOWN/MODELED applied | docs/build-docs/ path-disjoint | N/A | No |
| WB1 RED | N/A — probe-only | BEHAVIOR (happy-dom React render) | No — impl absent | No | No | KNOWN/MODELED applied | frame-c/ + test/unit/frame-c/; path-disjoint from T2/T4 territories | N/A | No |
| WB2 GREEN | (see WB1) | BEHAVIOR (real React render under happy-dom; no mocks) | No — impl load-bearing | No | No | KNOWN/MODELED applied | frame-c/action-bar.tsx; path-disjoint | N/A | No |
| WB3 RED | N/A | BEHAVIOR (fake ipcMain stub + DI-seam'd action helpers) | No — impl absent | No | No | KNOWN/MODELED applied | main/frame-c-ipc.ts + test/unit/frame-c-ipc/; path-disjoint | N/A | No |
| WB4 GREEN | (see WB3) | BEHAVIOR (real IPC controller; DI seam'd; no mocks at boundary) | No — impl load-bearing | Conditional — if (β), depends on WB0 contract commit landing first | Conditional — (α) no; (β) WB0 already amended §6 | KNOWN/MODELED applied | main/frame-c-ipc.ts + main.ts (preload.mts too) — coordinate with T2/T4 for main.ts | N/A | No |
| WB5 RED | N/A | BEHAVIOR | No — impl absent | No | No | KNOWN/MODELED applied | frame-c/action-bar.tsx (extending) | N/A | No |
| WB6 GREEN | (see WB5) | BEHAVIOR | No — impl load-bearing | No | No | KNOWN/MODELED applied | frame-c/action-bar.tsx | N/A | No |
| WB7 docs | N/A | N/A | N/A | No — docs/coordination/ + docs/FOLLOWUPS.md | No | KNOWN per direct execution evidence | docs paths path-disjoint | N/A | No |

---

## §7 — Definition of done

The ticket is DONE when ALL of the following hold:

1. **(Conditional WB0)** If Sub-Q-MBTWBDPFA-A=(β), `WORKSTATION_CONTRACT.md` §6 amended with the three new IPC channels via operator-arbitrated `contract:` commit BEFORE any GREEN WB.
2. **WB1 probe** authored + RED at HEAD pre-WB2.
3. **WB2 implementation** ships ActionBar at `src/frame-c/action-bar.tsx`; WB1 probes flip RED → GREEN.
4. **WB3 probe** authored + RED at HEAD pre-WB4.
5. **WB4 implementation** ships `FrameCIpcController` + preload bridge + main.ts wiring; WB3 probes flip RED → GREEN.
6. **WB5 probe** authored + RED at HEAD pre-WB6.
7. **WB6 implementation** ships failure-UX per Sub-Q-MBTWBDPFA-C choice; WB5 probes flip RED → GREEN.
8. **WB7 docs** appends audit doc with §6.F or extends §6.E; optional findings doc; FOLLOWUPS edits if applicable.
9. **Consumer non-regression** verified per CLAUDE.md memory: existing frame-c/ tests (T4's ticket #2 territory) + tile-grid tests + chat-shell tests stay GREEN post-WB2/4/6.
10. **Workstation typecheck CLEAN** per CLAUDE.md §4.4 (`pnpm --filter dispatch-workstation typecheck`).
11. **Runtime smoke** (manual or scripted) confirms: launch workstation; toggle to Frame C; select a session; verify ActionBar renders + each button is clickable + diff/merge/focus action fires + failure-UX renders on a forced error scenario.
12. **Operator visual verification** (recommended): visual inspection of detail-pane footer + ActionBar; failure-UX state under merge-conflict scenario.

---

## §8 — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Sub-Q-MBTWBDPFA-A=(β) creates a retroactive-amendment workstream that delays WB ladder** | `[MODELED-LOW]` if operator selects (α) recommended default | `[MODELED-HIGH]` if (β) selected (adds WB0 + queues `MB-F-WORKSTATION-CONTRACT-SECTION-6-DRIFT-AUDIT` for shipped tickets) | Default (α); if operator wants stricter discipline going forward, surface the retroactive scope at HALT-AUTHORED so operator can decide whether (β) is in-this-ticket or post-ticket |
| **Ticket #2 (Frame C surface) does not land before WB1 → no detail-pane host to assert against** | `[KNOWN-MEDIUM]` — execution-serialization gate per plan §6.2 | `[MODELED-HIGH]` (WB1 blocked) | EXPLICIT pre-WB1 verification: read `src/frame-c/` directory + detail-pane host component; HALT-and-surface if absent. Orchestrator coordinates ticket-#2-landing before unblocking this ticket. |
| **`merge` action semantics (Sub-Q-MBTWBDPFA-B-merge) chosen unsafely → operator working-tree corruption** | `[MODELED-LOW]` if Sub-Q-B-merge=(i) `--no-commit` default; `[MODELED-MEDIUM]` if (ii) immediate-commit | `[MODELED-CRITICAL]` (destructive — modifies working tree + index + HEAD) | Default recommendation is (i) `--no-commit` with operator gate. (iv) ship-shy stub is acceptable defensive default. If operator chooses (ii), surface the destructive-action risk explicitly + queue Tier 2 followup for pre-merge validation (dirty-tree check, etc.). |
| **`focus` action conflicts with ticket #4 compact-tile-mode (T3's own #4)** | `[MODELED-LOW]` if Sub-Q-B-focus=(i) and operator-arbitrated focus = "toggle to Frame A + scroll" | `[MODELED-LOW]` (graceful — both tickets are T3 territory; integration is intra-delegate) | If both ship, the focus action emits `writeFrameMode('A')` + a renderer event for tile-grid to scroll; ticket #4's compact-mode rendering does the rest. No conflict. |
| **main.ts ownership at WB4 conflicts with T2/T4 ongoing main.ts edits** | `[MODELED-MEDIUM]` — main.ts is contended across all three Batch 1 tickets | `[MODELED-MEDIUM]` (merge friction; per-path commit + pathspec discipline mitigates) | Pre-WB4 territory check (`git status --short` for main.ts unstaged changes). If T2/T4 hold territory, HALT and coordinate with orchestrator for serialized commit window. Use `git commit -m <msg> -- <path>` pathspec form (mirrors T3's prior WB4-revised pattern at `cd135e4`). |
| **WB4 IPC controller pattern (DispatchModeIpcController vs CommitsIpcController) mismatch with action semantics → refactor mid-WB** | `[MODELED-LOW]` if Sub-Q-B-action semantics are settled at HALT-AUTHORED | `[MODELED-MEDIUM]` (mid-WB refactor; halt-and-surface required) | §2.3 enumerates the three precedents + recommends per-action mapping. Surface ambiguity at HALT-AUTHORED. |
| **Failure-UX (Sub-Q-MBTWBDPFA-C) chosen scope creates infrastructure overflow (γ) toast queue requires cross-session shared component beyond Frame-C-scope** | `[MODELED-LOW]` if Sub-Q-C=(α) inline-banner default; `[MODELED-MEDIUM]` if (γ) toast | `[MODELED-MEDIUM]` (γ scope adds ~+2 WBs for toast-queue + provider boilerplate) | Default (α). If operator wants (γ), surface the cross-session-scope creep at HALT-AUTHORED. |
| **Preload bridge surface (Sub-Q-MBTWBDPFA-D) chosen as (β) extend workstationBridge creates namespace pollution** | `[MODELED-LOW]` if Sub-Q-D=(α) new `frameCBridge` default | `[MODELED-LOW]` (cosmetic; functional either way) | Default (α). If (β), surface the namespace-vs-separation trade-off. |
| **Detail-pane host integration seam (ticket #2 territory) does not surface `failureState` or `onAction` callback-prop convention this ticket expects** | `[MODELED-MEDIUM]` — ticket #2 body not yet authored at this body's authoring time; integration-seam shape is `[SPECULATIVE]` | `[MODELED-MEDIUM]` (WB6 implementation depends on ticket-#2-host accepting failureState prop OR managing it internally) | At WB1 start, read ticket #2's shipped host component; if integration seam differs from this ticket's assumption (callback-prop pattern), HALT-and-surface for amendment to ticket #2 OR scope-adjustment in this ticket |

---

## §9 — Closing posture

### §9.1 — Anomalies surfaced at HALT-MBTWBDPFA-AUTHORED (for operator awareness)

1. **Sub-Q-MBTWBDPFA-A operator-pending** (§3.1, LOAD-BEARING): `WORKSTATION_CONTRACT.md` §6 amendment scope. T2's W2-Q4 flag now active. Default (α) lenient — matches shipped precedent (MB-T16/17/22/24). (β) strict adds WB0 + retroactive-audit workstream.
2. **Sub-Q-MBTWBDPFA-B operator-pending** (§3.2): action semantics per action (diff / merge / focus). Three sub-question groups with 4 options each. Recommended defaults: diff=(i), merge=(i) `--no-commit` OR (iv) ship-shy stub, focus=(i) FrameMode toggle.
3. **Sub-Q-MBTWBDPFA-C operator-pending** (§3.3): failure-UX surface. (α) inline-banner recommended; (β) modal / (γ) toast available.
4. **Sub-Q-MBTWBDPFA-D operator-pending** (§3.4): preload bridge surface. (α) new `frameCBridge` recommended.
5. **Execution-serialization verification flag at WB1 start**: ticket #2 (Frame C surface) MUST be merged on origin/main BEFORE WB1 authoring proceeds.

### §9.2 — Authoring-time stats (for HALT-AUTHORED surface)

| Stat | Value |
|---|---|
| Authoring-anchor HEAD | `dec21c1` |
| Files READ (no modification) | 5: `wireframe-vs-shipped-audit-2026-05-09.md` §4.1 + §6.D (~50L total), `v35-operational-readiness-2026-05-10.md` §6.2 (~30L), `dispatch-mode-ipc.ts` (92L), `commits-ipc.ts` (peek 104L), `CONDUCTOR_MB-T-WIREFRAME-B1-TILE-VISUAL-SEPARATION_BUILD.md` (format anchor; ~110L) |
| Sub-Qs surfaced for operator decision | 4 (A: §6 amendment scope; B: action semantics; C: failure UX; D: preload bridge surface) |
| WB count range | 5-8 (depends on Sub-Q-A outcome + failure-UX collapse possibility) |
| Estimated total LOC for WB2+WB4+WB6 GREEN | ~150-250 lines (`action-bar.tsx` ~50-80 lines + `frame-c-ipc.ts` ~80-120 lines + main.ts/preload.mts thread-throughs ~20-50 lines) |
| Frozen surface touches | 0 if (α); 1 if (β) — `WORKSTATION_CONTRACT.md` §6 amendment via WB0 |

### §9.3 — Parallel-CC viability sealed

Plan §6.2 line 658 explicitly: "NOT parallel-CC viable; depends on ticket #2 detail-pane shape." EXECUTION-SERIALIZED behind ticket #2. The BODY authoring (this commit) IS parallel-CC viable (it touches a new `docs/build-docs/` file with no overlap with T2's #1 execution + T4's #2 body). EXECUTION (WB1+) waits for ticket #2 merge.

---

**End of MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS ticket body.**

Pending operator resolutions before execution: Sub-Q-MBTWBDPFA-A (§3.1 §6 amendment scope; LOAD-BEARING) + Sub-Q-MBTWBDPFA-B (§3.2 action semantics × 3 sub-questions) + Sub-Q-MBTWBDPFA-C (§3.3 failure UX surface) + Sub-Q-MBTWBDPFA-D (§3.4 preload bridge surface).
