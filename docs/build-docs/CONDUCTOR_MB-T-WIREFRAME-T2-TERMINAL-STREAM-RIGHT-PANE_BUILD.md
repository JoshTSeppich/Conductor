# MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE — Frame C DetailPane live terminal stream + tool indicators + cooking/queue/scroll chrome

**Status:** DRAFT-PENDING-OPERATOR-REVIEW (HALT-TICKET-BODY-PRE-COMMIT)
**Date authored:** 2026-05-12
**Authored under:** dispatch §3.2 operator-supervised mechanical translation from `docs/coordination/full-build-mode-dispatch.md` (`4f0bbde`) §1 right-pane element inventory + §2 T2 workstream enumeration
**Authoring delegate:** Sub-session B (T2) under orchestrator-2026-05-11-1257 (gen-3) Round 9 cairn-under-stress dispatch
**Authoring anchor commit (HEAD at authoring time):** `8eab991`
**Cairn ladder anchor:** dispatch §2 T2 workstream
**Closes (partial):** dispatch §1 "Right pane — Focused session terminal stream" wireframe-parity gap; specifically the Body items (live PTY tail, tool-invocation indicators, cooking timer, tool-queue counter, auto-scroll w/ operator-pause, "next tool" preview) and Header bar items (`<branch> @ <branch>`, ctx N%, uptime, plan).
**Depends on (all merged):** MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE (`525c502` family) — Frame C DetailPane mount + `selectedSessionName` prop chain; MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE — `tokensUsed`/`tokenBudget` on `TileGridSessionEntry`; CONSOLE-T02 (`eac381e`) — `consoleBridge.onStdoutChunk` + `console:stdout-chunk` per-session-filtered PTY channel; MB-T40 (`5704dd2`) — PTY broadcaster wiring (independent path, see §2.4); MB-T37 WB2 — `ConsoleIpcController.addStdoutObserver` tap.
**Downstream gates:** T3 (`MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS` follow-on + new `workstation:kill-session` IPC) — footer renders below this ticket's terminal body; coordinates on the same DetailPane DOM region. T1 (Session data flow) — if Sub-Q-MBTWFT2-C resolves to (α) `spawnedAt` on `TileGridSessionEntry`, T1 must extend the entry shape.

**Estimated WB count:** 10-12 (8-10 cairn ladder + 1 smoke + 1 docs).

---

## §0 — Reading protocol

1. Read §1 (scope) + §2 (arbitration anchor) first — `[KNOWN-OPERATOR-ARBITRATED]` envelope vs `[MODELED]` recommendation.
2. Read §3 (GATE sub-arbitrations) — three operator decisions are pre-execution prerequisites (Sub-Q-A → WB2; Sub-Q-B → WB5; Sub-Q-C → WB4).
3. Read §4 (WB ladder) for execution order. Construction order: terminal-body scaffold → header → tool-indicator parse → cooking/queue chrome → scroll-management → smoke → docs.
4. §5-§8 are cross-references / self-check / DOD / risk register.

Confidence labels per CLAUDE.md §2.2 apply throughout. `[KNOWN]` observed in this authoring session via direct source read of `console-bridge.ts:15-99`, `pty-stream-relay.ts:1-100`, `console-panel.tsx:1-187`, `coarchitect-ipc.ts:1-122`, `preload.mts:1-358`, `frame-c/detail-pane.tsx:1-232`, `frame-c/frame-c-root.tsx:1-130`, `tile-grid/tile-grid.tsx:29-52`. `[MODELED]` reasoned-from-observation. `[SPECULATIVE]` hypothesis without evidence.

---

## §1 — Scope

### §1.1 — What this ticket DOES

`[KNOWN-OPERATOR-ARBITRATED]` per dispatch §1 right-pane + §2 T2:

1. Introduces NEW `packages/dispatch-workstation/src/frame-c/terminal-stream.tsx` component — per-selected-session live PTY scrollback bound to `selectedSessionName`. Mirrors `console-panel/console-panel.tsx` per-session-filter pattern (`p.sessionName === targetSessionName` gate at every listener) but renders into the Frame C DetailPane DOM region instead of a detached `BrowserWindow`.
2. Introduces NEW `frame-c/terminal-header-bar.tsx` component — top row of DetailPane: `<branch> @ <branch>` (or `<session-name> @ <branch>` per wireframe), ctx N% (existing `tokensUsed`/`tokenBudget` data — moves from current DetailPane meta-row into the new header), uptime (Sub-Q-MBTWFT2-C), plan name (Sub-Q-MBTWFT2-C). The current `DetailPane` meta-row at `detail-pane.tsx:218-226` is superseded by this header.
3. Introduces NEW `frame-c/tool-indicator-parser.ts` — pure function `parseToolIndicators(chunkBuffer: string): ToolIndicatorState`. Scans the rolling PTY chunk buffer for CC stdout patterns:
   - `Cooking <MM>m <SS>s · <N> tools queued` → `{ cooking: { elapsedMs, queued } }`
   - `Bash: <cmd>` / `Read: <path>` / `Edit <path> (+<add> -<del>)` / `Write <path>` → tool-invocation events appended to a ring buffer
   - "next tool" preview line (e.g., dim italic line below the cooking indicator) → `{ nextTool: string }` if surfaced
4. Introduces NEW `frame-c/tool-indicator-strip.tsx` — renders the parsed state as a horizontal strip above the terminal body. Cooking timer ticks at 1Hz (client-side `setInterval` advancing `elapsedMs`) until the next `Cooking` line resets it; queued counter and next-tool preview track parsed state.
5. Wires auto-scroll behavior into `terminal-stream.tsx`:
   - Bottom-anchored by default: each new chunk scrolls to bottom.
   - Operator-scroll-up (`scrollTop` < `scrollHeight - clientHeight - tolerance`) flips a `paused: true` local state.
   - Paused state surfaces a "Resume autoscroll" affordance (button or footer-bar text); click resumes + scrolls to bottom.
6. **DetailPane integration**: extends `frame-c/detail-pane.tsx` to host `TerminalHeaderBar` + `ToolIndicatorStrip` + `TerminalStream` in addition to (or in place of) the current swarm-state.md section. Integration mode per Sub-Q-MBTWFT2-A: (i) REPLACE swarm-state body / (ii) HYBRID tab strip / (iii) STACK (swarm-state collapsed below terminal). The current swarm-state-read bridge (`workstationBridge.readSwarmState`, `coarchitect-ipc.ts:242-259` preload entry; main-process handler `workstation:read-swarm-state`) is PRESERVED — modes (ii)/(iii) keep the swarm-state section accessible.
7. **Audit / dispatch §1 reclassification**: this ticket's findings doc (WB-final) stamps dispatch §1 "Right pane — Focused session terminal stream" items as SHIPPED (or PARTIAL with explicit deferrals) — fields covered: body live-tail, tool indicators, cooking timer, queue counter, auto-scroll, next-tool preview, header branch/ctx/uptime/plan (last two conditional on Sub-Q-C).

### §1.2 — What this ticket DOES NOT

`[KNOWN-OPERATOR-ARBITRATED]` constraints:

- Does NOT add new IPC channels for the PTY tail. The CONSOLE-T02 `console:stdout-chunk` channel + `consoleBridge.onStdoutChunk` listener (already exposed via `preload.mts:278` + `console-bridge.ts:95`) carry per-session-filtered PTY chunks today. `[KNOWN]` from `console-bridge.ts:41-46` `StdoutChunkPayload { sessionName, stdoutSeq, bytes, encoding }`. NO `WORKSTATION_CONTRACT.md §6` amendment for the PTY tail.
- Does NOT reuse `coarchitect:ptyChunk`. That channel is hardcoded to `__orchestrator_active` (`pty-stream-relay.ts:48` `if (sessionName !== '__orchestrator_active') return;`) and is the v3.0-legacy chat-shell PTY path — not per-session-arbitrary.
- Does NOT touch the existing `console-panel/console-panel.tsx` component or the detached-window `console:open-panel` path. ConsolePanel remains the tile-grid embedded PTY view; TerminalStream is a sibling renderer using the SAME bridge channel with a DIFFERENT host (DetailPane vs. tile body).
- Does NOT modify the existing `frame-c/frame-c-root.tsx` selection-state machinery (Sub-Q-MBTWBFCS-A=α renderer-only, shipped Wave B `525c502`). TerminalStream consumes the already-passed `selectedSessionName` prop.
- Does NOT modify frozen surfaces: `REGISTRY.md` §2, `docs/build-docs/CONDUCTOR_API_CONTRACT.md`, `packages/dispatch-core/src/v3/schema.ts` §1-§13, `WORKSTATION_CONTRACT.md` §6. EXCEPT conditional on Sub-Q-MBTWFT2-C=(β) — a new `workstation:session-meta` IPC for uptime/plan data — which would escalate to operator-arbitrated `WORKSTATION_CONTRACT.md §6` amendment per CLAUDE.md §2.4. Default (α) or (γ) keeps the ticket §6-clean.
- Does NOT add the action bar (kill/diff/merge/focus) below the terminal body — that is T3 (`MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS` family). T3's `bypass-perms` indicator + `dispatch-workstation` source label likewise out-of-scope.
- Does NOT wire BUILD.md, Conductor controls bottom rail, max-parallel counter, cost meter, plan ring — those are T4 / T5 / T6 / T7 family work per dispatch §2.
- Does NOT alter the daemon-side PTY architecture (`packages/dispatch-daemon/src/session/session.ts`). Daemon-side per-session PTY observation is already shipped (MB-T37); this ticket is a renderer-side consumer.
- Does NOT modify v3.5 plan-doc (`docs/coordination/v35-operational-readiness-2026-05-10.md`). Findings doc updates land in `docs/coordination/mb-t-wireframe-t2-findings-<date>.md`; plan-doc edits remain operator-territory.
- Does NOT close `MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION` (Tier 3) or `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` (Tier 2). Plan ring + cost meter remain orchestrator-level chrome (T4 territory); this ticket only surfaces ctx N% which is already wired via MB-T-WIREFRAME-C5.
- Does NOT measure tool-indicator regex coverage against full real-CC stdout corpus — pragmatic regex per Sub-Q-MBTWFT2-B=(i) with Tier 2/3 followup for migration to structured-event sources (a Claude Code hook surface, if/when one exists) per CC-side dispatch §3.4.

---

## §2 — Arbitration anchor (operator-frozen 2026-05-11 dispatch)

### §2.1 — Dispatch §1 + §2 T2 right-pane wireframe-parity (binding)

`[KNOWN-OPERATOR-ARBITRATED]`

Per `docs/coordination/full-build-mode-dispatch.md` §1: the wireframe right pane shows a header bar (branch+ctx+uptime+plan), a body with live PTY output + tool-invocation indicators (`Cooking 12m 04s · 4 tools queued`, `Bash: pnpm tsc --noEmit`, `Read: packages/.../session.ts`, `Edit packages/.../spawn-pool.ts (+142 -8)`), a "next tool" preview, and auto-scroll with operator-pause. Per §2 T2: this work is enumerated as a single workstream producing ~1-3 Tier 1 tickets.

This ticket SHIPS the right-pane body + chrome (excluding the bottom action bar — T3 territory). Audit / dispatch reclassification lands at WB-final findings doc.

### §2.2 — Path-disjointness (parallel-CC discipline)

`[KNOWN per dispatch §5.1]`

This ticket touches:
- NEW: `frame-c/terminal-stream.tsx`, `frame-c/terminal-header-bar.tsx`, `frame-c/tool-indicator-parser.ts`, `frame-c/tool-indicator-strip.tsx`, `frame-c/index.ts` barrel update.
- EXTEND: `frame-c/detail-pane.tsx` (Sub-Q-A integration: REPLACE / HYBRID / STACK).
- POTENTIAL: `tile-grid/tile-grid.tsx` `TileGridSessionEntry` extension (Sub-Q-C=α adds `spawnedAt?: number` — coordinate with T1 sub-session A).

Path-disjoint from:
- T1 (session-list-rows): SessionList lives in `frame-c/session-list.tsx`; T1 owns row chrome + filter wiring. ONLY overlap is `TileGridSessionEntry` shape (Sub-Q-C=α coordination).
- T3 (action bar): action bar lives in `frame-c/action-bar.tsx`; T3 owns kill/diff/merge/focus button row + `bypass-perms` indicator. DetailPane DOM region is shared (T3 footer renders below T2 body) — coordinate via `frame-c-root.tsx` layout slot ordering.
- T4 / T5 / T6 / T7: bottom rail / BUILD.md / methodology infra / visual polish — fully path-disjoint.

### §2.3 — Construction order (file ownership for parallel-CC discipline)

`[KNOWN per dispatch §5.1]`

This ticket's file ownership inside the Frame C surface:
- `frame-c/terminal-stream.tsx` — NEW; T2 sole owner.
- `frame-c/terminal-header-bar.tsx` — NEW; T2 sole owner.
- `frame-c/tool-indicator-parser.ts` — NEW; T2 sole owner.
- `frame-c/tool-indicator-strip.tsx` — NEW; T2 sole owner.
- `frame-c/detail-pane.tsx` — T2 EXTENDS at well-defined extension point (mounting TerminalHeaderBar + ToolIndicatorStrip + TerminalStream within the existing `<div data-testid="frame-c-detail-pane">` root). Concurrent edits MUST surface via §0 staging check before commit.
- `frame-c/frame-c-root.tsx` — T2 does NOT modify; consumes `selectedSessionName` + `sessions[]` already passed in (`frame-c-root.tsx:113-127`). If Sub-Q-C=α extends `TileGridSessionEntry`, the new field flows through transparently.

### §2.4 — Existing-bridge reuse confirmation (operator-flagged scope check)

`[KNOWN per source-read 2026-05-12 of console-bridge.ts:15-99 + preload.mts:262-278]`

Operator's STEP 5 note in dispatch flagged uncertainty whether T2 needs a new IPC contract. Resolution:

| Wireframe element | Bridge today | Per-session filter? | New contract needed? |
|---|---|---|---|
| Live PTY tail | `consoleBridge.onStdoutChunk(handler)` → channel `console:stdout-chunk` payload `{ sessionName, stdoutSeq, bytes, encoding }` | YES (filter at listener via `p.sessionName === targetSessionName`, precedent `console-panel.tsx:92-99`) | **NO** — CONSOLE-T02 already covers this |
| Tool-indicator parsing | Derived from PTY chunk buffer | N/A (renderer-side) | **NO** — pure-function over received chunks |
| Cooking timer + queue counter | Derived from parsed Cooking line | N/A | **NO** |
| Header ctx N% | `TileGridSessionEntry.tokensUsed`/`tokenBudget` already plumbed into DetailPane (`frame-c-root.tsx:104-106`) | N/A | **NO** — existing wiring sufficient |
| Header branch | `TileGridSessionEntry.branchName` already on entry shape (`tile-grid.tsx:35`) | N/A | **NO** — propagation only; DetailPane currently does not consume the field |
| Header uptime | `TileGridSessionEntry` HAS NO `spawnedAt` or equivalent (`tile-grid.tsx:29-52`) | — | **CONDITIONAL** per Sub-Q-MBTWFT2-C |
| Header plan name | `TileGridSessionEntry` HAS NO `plan` (e.g., `max-plan`) | — | **CONDITIONAL** per Sub-Q-MBTWFT2-C |
| Auto-scroll w/ pause | Pure renderer DOM/event | N/A | **NO** |
| Next-tool preview | Parsed from PTY chunks | N/A | **NO** |

`[KNOWN]` `coarchitect:ptyChunk` is hardcoded to `__orchestrator_active` per `pty-stream-relay.ts:48` and is NOT a viable per-session reuse path — confirms operator's hypothesis that this channel is not the right reuse target. The viable reuse is `console:stdout-chunk` via CONSOLE-T02.

**Frozen-contract scope summary**: Default Sub-Q resolutions (A=ii hybrid, B=i regex, C=γ defer uptime/plan) → NO `WORKSTATION_CONTRACT.md §6` amendment in this ticket. Sub-Q-C=(β) is the only path that requires §6 amendment; surface at HALT-MBTWFT2-AUTHORED.

### §2.5 — WB2 SPIKE prerequisite: console:stdout-chunk lifecycle without console-panel window

`[MODELED-MEDIUM]` open question — must spike at WB2 start.

`ConsolePanel.tsx:82-92` gates rendering on `state.open`, which flips true on a `console:open` event. The question for T2: does `console:stdout-chunk` fire for a session whose PTY is streaming, even if no separate `console:open-panel` window has been opened, or is the underlying observer wired only when a console-panel window subscribes?

Reading `console-bridge.ts:67`: `openPanel(sessionName)` invokes `console:open-panel` which routes to `ConsoleIpcController.openConsolePanel(sessionName)` — this opens a NEW `BrowserWindow`. ConsolePanel rendering inside the tile-grid is driven by `console:open` events emitted on session-open-broadcast (not the window-open path).

`[SPECULATIVE]` Hypothesis: `console:open` is emitted by `ConsoleIpcController` whenever a session's PTY becomes available daemon-side, independent of any renderer window. If true, T2's TerminalStream can subscribe to `console:stdout-chunk` + filter by `selectedSessionName` directly, and the chunks flow without TerminalStream needing to call `openPanel`.

WB2 SPIKE: launch electron, spawn ≥2 sessions, select each in Frame C DetailPane, observe whether `console:stdout-chunk` events fire for the selected session WITHOUT TerminalStream calling `openPanel`. Three outcomes:
- **`[KNOWN-good]` chunks flow on select** → WB2 GREEN proceeds with listener-only pattern (matches ConsolePanel filter precedent).
- **chunks flow only after `openPanel` invocation** → WB2 GREEN adds `openPanel(selectedSessionName)` call on selection-change (creates an extra BrowserWindow — UX regression; surface at HALT-WB2-SPIKE for operator decision).
- **chunks require a separate "subscribe" affordance not yet in the contract** → escalate to operator; T2 may need a new minimal IPC (`console:subscribe-session(name)`) — `WORKSTATION_CONTRACT.md §6` amendment per CLAUDE.md §2.4.

Default expectation per `[MODELED]`: outcome 1 (listener-only). Surface spike result at HALT-WB2-PRE-COMMIT regardless.

---

## §3 — GATE sub-arbitrations REQUIRED before specific WBs

Three operator decisions remain pre-execution prerequisites. Surface at HALT-MBTWFT2-AUTHORED for operator resolution.

### §3.1 — Sub-Q-MBTWFT2-A: DetailPane integration mode (terminal vs swarm-state)

Required before **WB2** (TerminalStream initial mount) and **WB-final-integration**. Default if unresolved: **(ii) HYBRID** tab strip.

| Option | Behavior | Pros | Cons |
|---|---|---|---|
| (i) REPLACE | DetailPane drops swarm-state.md body; TerminalStream is the sole content. | Matches wireframe verbatim (right pane = terminal stream, no tab strip visible). | Loses HSO swarm-state context; regresses Wave B Sub-Q-MBTWBFCS-B=(i) operator-arbitrated content choice. File Tier 2 followup `MB-F-FRAME-C-DETAIL-PANE-NO-SWARM-CONTEXT` (re-open from Wave B). |
| (ii) HYBRID | Tab strip in DetailPane: "Live" (TerminalStream + chrome) / "Summary" (current swarm-state body). Default tab = "Live". | Preserves swarm-state value; matches wireframe primary view (Live default). | +1 WB (tab-strip component); UI density increase. |
| (iii) STACK | TerminalStream + chrome occupies the top 70% of DetailPane; swarm-state in a collapsible bottom 30% (default collapsed). | All content visible without tab; honest "two contents" disclosure. | Wireframe shows only terminal — visible swarm-state collapser is a delta. |

`[MODELED]` Recommend **(ii) HYBRID**. Wireframe-parity for the default view (Live tab) + preserves Wave B swarm-state work + Tier 2 followup avoidance. (i) is the most wireframe-pure but introduces a regression on operator-arbitrated Wave B scope.

Operator decision pending.

### §3.2 — Sub-Q-MBTWFT2-B: tool-invocation parsing strategy

Required before **WB5** (tool-indicator-parser RED). Default if unresolved: **(i) regex on PTY lines + Tier 2 followup for structured-event migration**.

| Option | Parse source | Robustness | Followup posture |
|---|---|---|---|
| (i) Regex on PTY lines | Renderer-side regex over chunk buffer matching `^Cooking <MM>m <SS>s · <N> tools queued$`, `^Bash: `, `^Read: `, `^Edit `, `^Write `. Reads CC's human-readable stdout. | `[MODELED-MEDIUM]` — CC stdout format may change across versions; regexes drift. | File Tier 2 `MB-F-T2-TOOL-PARSE-REGEX-BRITTLE-CC-FORMAT-DRIFT` on ship; revisit when CC offers a structured-event surface (e.g., `--output-format=jsonl` or a hook). |
| (ii) Structured CC events | Adopt a hypothetical CC machine-readable event stream — e.g., parse `--output-format=jsonl` if Claude Code SDK exposes one in the session PTY launch. | `[MODELED-HIGH]` if available. | Requires CC-side investigation; not load-bearing now per dispatch scope. |
| (iii) Defer parsing | Ship raw PTY tail only (no tool indicators); file Tier 1 followup for a follow-on ticket. | N/A — feature deferred. | Regresses wireframe parity for the right-pane indicators (cooking, queue, Bash/Read/Edit lines). |

`[MODELED]` Recommend **(i) regex + Tier 2 followup**. Pragmatic ship; parse failures surface as missing indicators (not crashes); migration path is non-blocking when structured events become available. (iii) loses wireframe parity for indicators — operator can re-direct if defer is preferred.

`[SPECULATIVE]` regex patterns to validate against real CC output at WB5-WB6 RED+GREEN:
- `/^Cooking (\d+)m (\d+)s · (\d+) tools queued/m` — captures `(elapsedM, elapsedS, queued)`
- `/^Bash: (.+)$/m` — captures command
- `/^Read: (.+)$/m` — captures path
- `/^Edit (.+) \(\+(\d+) -(\d+)\)$/m` — captures path, added, deleted
- `/^Write (.+)$/m` — captures path

Operator decision pending.

### §3.3 — Sub-Q-MBTWFT2-C: header-bar uptime + plan-name data sources

Required before **WB4** (TerminalHeaderBar GREEN). Default if unresolved: **(γ) defer uptime + plan to follow-on ticket; render `branch + ctx N%` only; file Tier 2 followup**.

| Option | Mechanism | TileGridSessionEntry extension | §6 amendment | Coordination |
|---|---|---|---|---|
| (α) `spawnedAt` field | Extend `TileGridSessionEntry` with `spawnedAt?: number` (ms epoch); plan name as `plan?: string`. Source: spawn-handler or session catalog at daemon. Uptime computed client-side `Date.now() - spawnedAt`. | YES — `tile-grid.tsx:29-52` extension | NO IF data already flows daemon→workstation in the existing SpawnSessionResult; YES if a new daemon IPC is required to fetch the fields | T1 sub-session A coordination — T1 may also extend the same shape; merge-conflict risk if not coordinated |
| (β) `workstation:session-meta` IPC | NEW IPC: `workstation:session-meta(sessionName)` → `{ branch, uptimeMs, plan }`. Renderer polls or subscribes. | NO — separate fetch | YES — `WORKSTATION_CONTRACT.md §6` amendment per CLAUDE.md §2.4; operator-arbitrated frozen-contract amendment | Independent of T1 |
| (γ) Defer to follow-on | Render `<branch> @ <branch>` + `ctx N%` only; uptime + plan as placeholders (e.g., `uptime —` / `plan —`). File Tier 2 `MB-F-T2-HEADER-UPTIME-PLAN-DATA-PATH`. | NO | NO | NO |

`[MODELED]` Recommend **(γ) defer** for ship-velocity within the T2 scope. Wireframe parity is partial (branch + ctx ship; uptime + plan placeholder). Tier 2 followup is the closure path; reopens when daemon-side session metadata API is shipped as a coordinated workstream.

`[KNOWN]` Verified `TileGridSessionEntry` shape at `tile-grid.tsx:29-52` lacks `spawnedAt`/`plan`. (α) requires shape extension + upstream data; (β) is the heaviest path with frozen-surface escalation. (γ) is honest "no data yet" + Tier 2 followup — matches `[KNOWN-no-data]` pattern from Wave B DetailPane `ctx 0%` fallback (`detail-pane.tsx:176-181`).

Operator decision pending.

---

## §4 — WB ladder

10-12 WBs baseline (Sub-Q-A=ii / Sub-Q-B=i / Sub-Q-C=γ); +1 WB if Sub-Q-A=(iii) STACK; +1 WB if Sub-Q-C=(α/β). Construction order: terminal-body scaffold → header → parser → indicator-strip → scroll-management → DetailPane integration → smoke → docs.

Each WB follows cairn methodology: red authors failing probe; green implements minimum; commit body carries Q1-Q9 self-check per CLAUDE.md §10.5 / CONDUCTOR_API_CONTRACT.md §10.5; per-path `git add` per §2.7; push after each cairn-grammar commit per §2.6.

### WB1 — `red(MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE): probe-MBTWFT2-01-terminal-stream-mount`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/unit/frame-c/probe-mbtwft2-01-terminal-stream-mount.spec.tsx`. Asserts:
- (a) Importing `frame-c/terminal-stream.tsx` resolves.
- (b) `<TerminalStream targetSessionName="alpha" consoleBridge={fakeBridge} createTerminal={fakeTermFactory} />` renders `data-testid="frame-c-terminal-stream-root"`.
- (c) On mount, subscribes to `consoleBridge.onStdoutChunk`; filters by `targetSessionName`; writes matching chunk bytes to the injected terminal adapter.
- (d) On unmount, calls the cleanup-fn returned by `onStdoutChunk`.

**Acceptance:** probe RED — `terminal-stream.tsx` does not yet exist.
**Frozen contracts touched:** none — probe-only.
**Spike marker:** §2.5 spike (`console:stdout-chunk` lifecycle) is BLOCKING for WB2 GREEN; WB1 RED authors against the expected listener-only pattern.

### WB2 — `spike + green(MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE): TerminalStream component`

**Type:** spike + green (spike per §2.5; green per WB1 acceptance)
**Scope:**
1. **SPIKE (pre-GREEN)**: Launch electron, spawn ≥2 sessions (e.g., via existing tile-grid spawn path), select session A in Frame C DetailPane (currently empty `<TerminalStream>` slot), observe via DevTools whether `console:stdout-chunk` events fire for the selected session. Cite outcome in commit body per CLAUDE.md §2.8 spike+ADR discipline (write to `docs/coordination/mb-t-wireframe-t2-console-stream-spike-2026-05-12.md` as a brief ADR).
2. **GREEN**: NEW `frame-c/terminal-stream.tsx`:
   - Props: `{ readonly targetSessionName: string; readonly consoleBridge: ConsoleBridge; readonly createTerminal: () => TerminalAdapter; }` — same shape as `ConsolePanel`; consume from `frame-c-root.tsx` extension (mount-time bridge + factory wiring at WB-final-integration).
   - Mount: subscribe to `consoleBridge.onStdoutChunk` + filter by `targetSessionName === p.sessionName` (PRECEDENT `console-panel.tsx:92-99`); on chunk, `terminalAdapterRef.current?.write(bytes-or-decoded)` via the existing base64 fallback (`console-panel.tsx:197-205`).
   - Unmount cleanup: invoke listener cleanup-fn + adapter dispose.
   - Render: `<div data-testid="frame-c-terminal-stream-root" ref={terminalContainerRef} />` styled for the DetailPane right-column flex region (fills available height; overflow-y auto).
3. **DetailPane integration is DEFERRED to WB-final-integration** (WB12 below) per Sub-Q-A. WB2 ships the component standalone + unit-tested.

**Acceptance:** WB1 probe flips RED → GREEN. Commit body Q1-Q9 + spike ADR citation. SURFACE HALT-WB2-PRE-COMMIT for operator review of spike outcome.
**Frozen contracts touched:** conditional on spike outcome 3 (new subscribe IPC).

### WB3 — `red(MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE): probe-MBTWFT2-02-header-bar-renders`

**Type:** red
**Scope:** RED probe at `probe-mbtwft2-02-header-bar-renders.spec.tsx`. Asserts:
- (a) `<TerminalHeaderBar sessionName="alpha" branchName="feat/x" tokensUsed={1000} tokenBudget={200000} />` renders `data-testid="frame-c-terminal-header-bar"`.
- (b) Header text includes `alpha @ feat/x` (or `feat/x @ feat/x` if `sessionName` is omitted — verify wireframe convention with operator; default to `<sessionName> @ <branchName>` and rename text via operator review at HALT-WB3).
- (c) Header includes `ctx <N>%` where N = round((tokensUsed / tokenBudget) * 100) (mirrors `detail-pane.tsx:178-181`).
- (d) Per Sub-Q-C resolution: (γ) header renders literal placeholders `uptime —` and `plan —`; (α) header renders computed uptime + plan from prop; (β) header subscribes to `workstation:session-meta`.

**Acceptance:** probe RED. Commit body Q1-Q9.
**Sub-Q-C blocker:** probe shape parameterized — flag at HALT-WB3-PRE-COMMIT.

### WB4 — `green(MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE): TerminalHeaderBar component`

**Type:** green
**Scope:** NEW `frame-c/terminal-header-bar.tsx`:
- Props per Sub-Q-C resolution: minimum `{ sessionName, branchName?, tokensUsed?, tokenBudget? }`; (α) adds `spawnedAt?: number`, `plan?: string`; (β) calls into `window.workstationBridge` for live meta (out-of-scope for default).
- Render: single row, monospace, mirror existing DetailPane meta-row style (`detail-pane.tsx:34-69`). Left: `<sessionName> @ <branchName>` (or `— @ —` if both omitted). Right cluster: `ctx <N>%` + uptime + plan (placeholder per Sub-Q-C=γ).
- Uptime tick (Sub-Q-C=α only): client-side `setInterval(1000)` → re-render with `Date.now() - spawnedAt` formatted as `HH:MM` or `MM:SS`.
- DOES NOT subsume the current `frame-c/detail-pane.tsx` ctx N% pill — that becomes the WB12 integration point (TerminalHeaderBar REPLACES the existing meta-row inside DetailPane; current code at `detail-pane.tsx:218-226` is removed).

**Acceptance:** WB3 probe flips RED → GREEN. Commit body Q1-Q9.
**Frozen contracts touched:** Sub-Q-C=(β) → §6 amendment; default (γ) → none.

### WB5 — `red(MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE): probe-MBTWFT2-03-tool-indicator-parser`

**Type:** red
**Scope:** RED probe at `probe-mbtwft2-03-tool-indicator-parser.spec.ts` (pure-fn unit). Asserts `parseToolIndicators(buf)` returns `ToolIndicatorState { cooking: { elapsedMs, queued } | null, recent: ReadonlyArray<ToolEvent>, nextTool: string | null }` for fixtures:
- (a) `"Cooking 12m 04s · 4 tools queued\n"` → `cooking.elapsedMs === 724000`, `cooking.queued === 4`.
- (b) `"Bash: pnpm tsc --noEmit\n"` → `recent` includes `{ kind: 'bash', cmd: 'pnpm tsc --noEmit' }`.
- (c) `"Read: packages/dispatch-daemon/src/session/session.ts\n"` → `recent` includes `{ kind: 'read', path: '...' }`.
- (d) `"Edit packages/.../spawn-pool.ts (+142 -8)\n"` → `recent` includes `{ kind: 'edit', path: '...', added: 142, deleted: 8 }`.
- (e) Empty buffer → `{ cooking: null, recent: [], nextTool: null }` (honest no-data).
- (f) Buffer with mixed lines preserves order in `recent` ring buffer (latest-last).

**Acceptance:** probe RED — parser file does not exist. Commit body Q1-Q9.
**Sub-Q-B blocker:** if (iii) defer is selected, WB5+WB6 are SKIPPED and ladder ends at WB10. Surface at HALT-MBTWFT2-AUTHORED.

### WB6 — `green(MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE): tool-indicator-parser pure fn`

**Type:** green
**Scope:** NEW `frame-c/tool-indicator-parser.ts`:
- Export types: `ToolEvent = { kind: 'bash', cmd: string } | { kind: 'read', path: string } | { kind: 'edit', path: string, added: number, deleted: number } | { kind: 'write', path: string }`; `ToolIndicatorState`.
- Export `parseToolIndicators(buf: string): ToolIndicatorState`.
- Regex patterns per Sub-Q-B=(i):
  - `/^Cooking (\d+)m (\d+)s · (\d+) tools queued/m` → cooking state (latest match wins).
  - `/^Bash: (.+)$/gm` → bash events.
  - `/^Read: (.+)$/gm` → read events.
  - `/^Edit (.+) \(\+(\d+) -(\d+)\)$/gm` → edit events.
  - `/^Write (.+)$/gm` → write events.
- Ring-buffer recent events to cap (`recent.slice(-20)`).
- `nextTool` regex TBD; placeholder return `null` until operator-verifiable CC fixture available (file Tier 3 `MB-F-T2-NEXT-TOOL-PREVIEW-FIXTURE-MISSING`).

**Acceptance:** WB5 probe flips RED → GREEN. Commit body Q1-Q9 + Tier 3 followup row if `nextTool` deferred.
**Frozen contracts touched:** none — pure function.

### WB7 — `red(MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE): probe-MBTWFT2-04-tool-indicator-strip`

**Type:** red
**Scope:** RED probe at `probe-mbtwft2-04-tool-indicator-strip.spec.tsx`. Asserts:
- (a) `<ToolIndicatorStrip state={{ cooking: { elapsedMs: 724000, queued: 4 }, recent: [], nextTool: null }} />` renders `data-testid="frame-c-tool-indicator-strip"` containing the literal text `Cooking 12m 04s · 4 tools queued`.
- (b) When `cooking !== null` and 1.5 seconds elapse with state unchanged, the rendered elapsed advances to `12m 05s` (client-side 1Hz tick via `setInterval` advancing local elapsedMs cursor; reset on `state.cooking.elapsedMs` change).
- (c) With `recent` containing `{ kind: 'bash', cmd: 'pnpm tsc --noEmit' }`, renders the literal `Bash: pnpm tsc --noEmit`.
- (d) With `nextTool: 'Read: ...'`, renders a "next: …" preview line.
- (e) Empty state renders `data-testid="frame-c-tool-indicator-strip"` with NO indicator items (no crash, honest empty).

**Acceptance:** probe RED. Commit body Q1-Q9.

### WB8 — `green(MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE): ToolIndicatorStrip + cooking 1Hz tick`

**Type:** green
**Scope:** NEW `frame-c/tool-indicator-strip.tsx`:
- Props: `{ state: ToolIndicatorState }`.
- Cooking ticker: `useEffect` on `state.cooking.elapsedMs` starts/resets `setInterval(1000)` advancing a local `tickElapsedMs` state; cleanup on unmount or cooking-null transition. Renders `Cooking ${MM}m ${SS}s · ${queued} tools queued`.
- Recent events: render the last N (default 5) as a horizontal compact strip.
- Next-tool preview: italic dim text below the cooking row.
- Empty state: render the strip container with no children.

**Acceptance:** WB7 probe flips RED → GREEN. Commit body Q1-Q9.
**Frozen contracts touched:** none.

### WB9 — `red(MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE): probe-MBTWFT2-05-auto-scroll-pause`

**Type:** red
**Scope:** RED probe at `probe-mbtwft2-05-auto-scroll-pause.spec.tsx`. Asserts on `<TerminalStream>` (extension of WB2 component):
- (a) After mount + 3 chunk events, `terminalContainerRef.current?.scrollTop === scrollHeight - clientHeight` (bottom-anchored).
- (b) Simulated operator scroll-up event (set `scrollTop = 0`) sets `paused: true` state visible via `data-testid="frame-c-autoscroll-paused"` attribute.
- (c) Subsequent chunk events DO NOT auto-scroll; `scrollTop` remains at 0.
- (d) A "Resume autoscroll" affordance (`data-testid="frame-c-autoscroll-resume"`) renders when paused.
- (e) Click on resume → `paused: false`; next chunk re-anchors to bottom.

**Acceptance:** probe RED — scroll-management is absent from WB2 TerminalStream. Commit body Q1-Q9.

### WB10 — `green(MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE): TerminalStream auto-scroll + pause + resume affordance`

**Type:** green
**Scope:** EXTEND `frame-c/terminal-stream.tsx`:
- `paused: boolean` local state (default false).
- Scroll listener on terminal container: if `scrollTop < scrollHeight - clientHeight - tolerance` (tolerance e.g. 4px to absorb sub-pixel), set `paused: true`.
- Auto-scroll on chunk: only if `!paused`, set `scrollTop = scrollHeight` after `terminalAdapterRef.current?.write(...)`.
- Resume affordance: button overlay (top-right corner of terminal region) rendered only when `paused === true`; on click, sets `paused: false` + scrolls to bottom.
- Affordance text per wireframe-ish "Auto-scroll paused · Resume" or similar; refine at HALT-WB10-PRE-COMMIT after operator screenshot review.

**Acceptance:** WB9 probe flips RED → GREEN. Commit body Q1-Q9.
**Frozen contracts touched:** none.

### WB11 — `green(MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE): DetailPane integration per Sub-Q-A`

**Type:** green (integration; no separate RED — exercised by WB-final smoke + existing DetailPane unit tests)
**Scope:** EXTEND `frame-c/detail-pane.tsx`:
- Mount `<TerminalHeaderBar>` at top (REPLACES current meta-row at `detail-pane.tsx:218-226`); subsumes the existing ctx N% pill.
- Mount `<ToolIndicatorStrip>` directly below header.
- Mount `<TerminalStream>` below indicator strip — bound to `selectedSessionName` (already a prop). Requires `consoleBridge` + `createTerminal` factory propagation from `frame-c/mount.tsx` (WB12 wiring point).
- Sub-Q-A=(i) REPLACE: DELETE the swarm-state.md body (`detail-pane.tsx:183-208` useEffect + `<pre>` block).
- Sub-Q-A=(ii) HYBRID (DEFAULT): wrap content in tab strip `<div data-testid="frame-c-detail-tabs">` with tabs "Live" (TerminalStream) and "Summary" (existing swarm-state body). Default active tab = "Live". State: `const [activeTab, setActiveTab] = useState<'live' | 'summary'>('live');`.
- Sub-Q-A=(iii) STACK: TerminalStream + chrome in top region (e.g., 70% via flex); swarm-state body in collapsible bottom region with `<details>` element default-closed.
- Update WB12 propagation accordingly.

**Acceptance:** existing DetailPane probes (Wave B `probe-mbtwbfcs-04-detail-pane-renders.spec.tsx` etc.) continue to pass (consumer non-regression per CLAUDE.md memory `feedback_consumer_non_regression_per_wb.md`); new tab/stack rendering exercised at WB-final smoke. Commit body Q1-Q9.

### WB12 — `green(MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE): mount.tsx + frame-c-root.tsx wiring`

**Type:** green
**Scope:**
- EXTEND `frame-c/mount.tsx` to accept `consoleBridge: ConsoleBridge` + `createTerminal: () => TerminalAdapter` in `FrameCMountProps` (already passed into tile-grid mount per `tile-grid/mount.ts` precedent); thread through `FrameCRoot` to `DetailPane` to `TerminalStream`.
- VERIFY auto-mount wiring at `tile-grid/mount.ts` `tryAutoMountFrameC()` (Wave B WB10 sentinel zone) passes the bridge + factory at mount time. If wiring is absent, ADD it via the existing zone — does NOT need a new sentinel block (extension inside Wave B's `=== BEGIN: MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE wiring ===` is permissible per CLAUDE.md §3.3 zone-internal extension within ticket scope; Frame C wiring zone is Wave B's territory but T2 needs the bridge propagation only — flag at HALT-WB12-PRE-COMMIT for operator review of zone-internal-extension permissibility, or alternatively add a new sibling zone `=== BEGIN: MB-T-WIREFRAME-T2 bridge propagation ===`).
- workstation-shell.html / main.ts: no changes — DetailPane DOM region was added at Wave B WB10.

**Acceptance:** WB11 DetailPane mount renders TerminalStream with live PTY tail for the selected session. Commit body Q1-Q9. SURFACE HALT-WB12-PRE-COMMIT for sentinel-zone-extension scope review.
**Frozen contracts touched:** none.

### WB13 — `green(MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE): runtime-launch smoke verification`

**Type:** green (smoke harness; per CLAUDE.md §4.6 runtime-launch-as-merge-gate)
**Scope:**
1. Build fresh: `pnpm --filter dispatch-core build && pnpm --filter dispatch-workstation build` (dist freshness per CLAUDE.md §3.4).
2. Launch electron: `pnpm --filter dispatch-workstation exec electron dist/main/main.js`.
3. Observe within ~10s: `WINDOW_READY` sentinel; Frame C default mode renders SessionList + DetailPane shell.
4. With ≥1 spawned CC session (manual spawn or initialSessions seed):
   - SessionList shows the session; click selects.
   - DetailPane renders TerminalHeaderBar (`<name> @ <branch>` + ctx N% + placeholder uptime/plan per Sub-Q-C=γ).
   - DetailPane renders ToolIndicatorStrip — empty initially; populated after the spawned CC session emits Cooking / Bash / Read / Edit lines.
   - DetailPane renders TerminalStream — PTY chunks for the selected session append to the scrollback; bottom-anchored.
   - Sub-Q-A=(ii): tab strip with "Live" default; toggle to "Summary" shows swarm-state body.
5. Scroll-pause behavior: scroll terminal up → "Resume autoscroll" affordance appears; click → returns to bottom-anchored.
6. Capture screenshot evidence to `docs/coordination/mb-t-wireframe-t2-runtime-smoke-2026-05-XX.md` for operator review per dispatch §3.5 visual-comparison gate.

**Acceptance:** all 6 steps verified. Evidence file committed in WB14. Commit body Q1-Q9 KNOWN/MODELED per direct observation.
**Frozen contracts touched:** none — observational.
**Pre-existing failures**: per CLAUDE.md §4.5, do NOT re-diagnose `MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL` (Tier 2) or `MB-F-WORKSTATION-INTEGRATION-TEST-FLAKE-SUITE` (Tier 3). Note in smoke surface as expected.

### WB14 — `docs(MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE): findings doc + dispatch §1 reclassification + followups`

**Type:** docs
**Scope:** Author `docs/coordination/mb-t-wireframe-t2-findings-2026-05-XX.md` per format anchor `docs/coordination/mb-t-hso-wire-findings-2026-05-11.md`:
I What Shipped / II Sub-Q disposition / III Architectural deltas / IV Probe distribution / V Architecture notes / VI Documentation drift / VII Consumer non-regression / VIII WB Skip Rationale / IX New Followups Filed / X Open Items.

Followup updates to `docs/FOLLOWUPS.md`:
- (CONDITIONAL Sub-Q-B=(i)) File NEW Tier 2 `MB-F-T2-TOOL-PARSE-REGEX-BRITTLE-CC-FORMAT-DRIFT` — closure when CC offers structured event surface.
- (CONDITIONAL Sub-Q-C=(γ)) File NEW Tier 2 `MB-F-T2-HEADER-UPTIME-PLAN-DATA-PATH` — closure path: extend `TileGridSessionEntry` with `spawnedAt` + `plan` from daemon session-meta; cross-ref T1.
- (CONDITIONAL nextTool deferral at WB6) File NEW Tier 3 `MB-F-T2-NEXT-TOOL-PREVIEW-FIXTURE-MISSING` — closure when a real CC fixture is captured.
- (CONDITIONAL Sub-Q-A=(i) REPLACE) File NEW Tier 2 `MB-F-FRAME-C-DETAIL-PANE-SWARM-STATE-REGRESSED` — reopens Wave B Sub-Q-MBTWBFCS-B=(i) operator-arbitrated value.

Dispatch §1 reclassification stamp:
- Right-pane Body: PARTIAL → SHIPPED (live PTY tail, tool indicators, cooking timer, queue counter, auto-scroll w/ pause, next-tool preview per WB6 deferral).
- Right-pane Header bar: PARTIAL (branch + ctx ship; uptime + plan placeholder per Sub-Q-C=γ); cross-ref Tier 2 followup.

**Acceptance:** findings doc + FOLLOWUPS.md updates + dispatch reclassification stamp land. Commit body Q1-Q9.
**Frozen contracts touched:** none — docs only.

---

## §5 — Cross-references

### §5.1 — Followups CLOSED (or partially CLOSED) by this ticket

| Followup / Row | Tier | Closure path | Closing WB |
|---|---|---|---|
| Dispatch §1 "Right pane — Focused session terminal stream" Body items | (dispatch row) | WB2/6/8/10 implement; WB11/12 integrate; WB13 smoke; WB14 stamp | WB14 |
| Dispatch §1 "Right pane" Header bar (branch + ctx) | (dispatch row) | WB4 implements; WB14 stamps PARTIAL | WB14 |

### §5.2 — Followups likely to surface during this ticket

`[MODELED-SPECULATIVE]`:

- WB2 SPIKE may discover that `console:stdout-chunk` requires explicit subscribe — escalates to operator + potentially new IPC (§2.5 outcome 3).
- WB6 may discover that CC stdout format does not match regex assumptions in §3.2 — refine regex set + Tier 2 followup if format drift discovered post-ship.
- WB10 may discover that scroll-listener pattern conflicts with the terminal adapter's own scroll handling (xterm.js owns viewport scrollback) — may need to scroll on the DOM CONTAINER rather than the xterm viewport. Surface at HALT-WB10-PRE-COMMIT if non-obvious.
- WB11 (Sub-Q-A=(ii) HYBRID) may discover that tab-switching breaks the TerminalStream's xterm adapter (unmount → re-mount loses scrollback). Mitigation: render both panels with CSS visibility toggle rather than React mount/unmount. Surface at HALT-WB11-PRE-COMMIT if observed.
- WB12 may discover that `tile-grid/mount.ts` `tryAutoMountFrameC()` (Wave B WB10) does NOT propagate `consoleBridge` — requires either zone-internal extension OR a new sibling sentinel zone. Per CLAUDE.md §3.3, prefer new sentinel block. Flag at HALT-WB12-PRE-COMMIT.
- WB13 smoke may discover that `console:stdout-chunk` does NOT fire for a session whose console-panel window has never opened — operator-visible "no terminal data" surface. Closure path depends on §2.5 spike result.

### §5.3 — Related shipped tickets (read-required at WB1 start)

| Ticket | Anchor | Read scope at WB1 |
|---|---|---|
| MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE | `525c502` family + `a1f7a03` ticket body | `frame-c/frame-c-root.tsx:75-130` (selection-state + DetailPane mount-gate); `frame-c/detail-pane.tsx:171-232` (current meta-row + swarm-state body — WB11 integration site). |
| MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE | (commit chain) | `frame-c-root.tsx:104-106` (`selectedEntry` lookup); `detail-pane.tsx:62-69` (ctx N% style). |
| CONSOLE-T02 | `eac381e` | `console-bridge.ts:15-99` (StdoutChunkPayload + makeConsoleBridge); `preload.mts:262-278` (consoleBridge exposure); `console-panel/console-panel.tsx:82-126` (per-session filter precedent). |
| MB-T40 PTY relay | `5704dd2` | `pty-stream-relay.ts:1-100` (broadcaster wiring; NOTE this is `coarchitect:ptyChunk` orchestrator-only — NOT the channel T2 reuses); confirms hardcoded `__orchestrator_active` filter. |

### §5.4 — Dispatch + audit anchors (read at WB1 start)

- `docs/coordination/full-build-mode-dispatch.md` §1 (right-pane element inventory)
- §2 T2 (workstream enumeration)
- §3.3 (frozen contracts; T2 NOT in the new-IPC list)
- §3.4 (T6 parallel — methodology infra runs in parallel; not a T2 dependency)
- §3.5 (visual-comparison gate; WB13 smoke screenshot path)
- `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` §3 (Dim 1 Frame Layout — Frame C already shipped per Wave B; right-pane content is the next gap)

---

## §6 — Self-check Q1-Q9 expectations per WB commit (CONDUCTOR_API_CONTRACT.md §10.5)

Each cairn-grammar commit body answers all nine questions. Expected shapes per WB type:

| WB | Q1 (spike?) | Q2 (mocks?) | Q3 (impl-deleted-passes?) | Q4 (outside contract?) | Q5 (frozen mod?) | Q6 (labels?) | Q7 (parallel territory?) | Q8 (bypass PATCH?) | Q9 (halt-unauth?) |
|---|---|---|---|---|---|---|---|---|---|
| WB1 RED | N/A | BEHAVIOR (mount + listener-subscription via vitest + @testing-library/react + fake consoleBridge) | No — impl absent | No — probe-only | No | KNOWN/MODELED applied | new test/unit/frame-c/ path-disjoint from T1/T3 | N/A | No |
| WB2 spike+green | YES — §2.5 spike per CLAUDE.md §2.8 (ADR cited) | BEHAVIOR (real DOM + fake adapter; spike uses real electron) | No — impl load-bearing | No | conditional on spike outcome 3 | KNOWN/MODELED applied (spike outcome cited) | frame-c/terminal-stream.tsx new file | N/A | No |
| WB3-WB10 RED+GREEN pairs | N/A | BEHAVIOR for each (pure-fn for parser/strip; DOM for streams/headers) | RED → GREEN flip per pair | No | conditional on Sub-Q-C=(β) WB4 | KNOWN/MODELED applied | per-WB ownership stays within frame-c/ NEW files | N/A | No |
| WB11 integration | N/A | BEHAVIOR (consumer non-regression — Wave B probes re-run) | No — impl load-bearing | No | No | KNOWN/MODELED applied | extends frame-c/detail-pane.tsx — exclusive zone | N/A | No |
| WB12 wiring | N/A | BEHAVIOR (mount factory + propagation; consumer test covers existing factory consumers) | No — impl load-bearing | No (default Sub-Q-A=ii) | Wave B zone-internal extension OR new sentinel block per HALT-WB12 | KNOWN/MODELED applied | tile-grid/mount.ts coordination with Wave B sentinel zone; cross-session check via §0 staging | N/A | No |
| WB13 smoke | N/A | BEHAVIOR (real electron + real daemon + real CC PTY) | No — verifies WB1-WB12 integration | No | No | KNOWN per observed sentinels + screenshot | none — observational | N/A | No |
| WB14 docs | N/A | N/A | N/A | No — docs/coordination/ + docs/FOLLOWUPS.md edits | No | KNOWN per direct ticket-execution evidence | docs paths disjoint from production | N/A | No |

---

## §7 — Definition of done

The ticket is DONE when ALL of the following hold:

1. **WB1-WB13 cairn ladder lands**: each RED probe flips RED → GREEN at the corresponding GREEN WB; commit chain pushed to origin/main per CLAUDE.md §2.6 per-commit-push discipline.
2. **`frame-c/terminal-stream.tsx` + `frame-c/terminal-header-bar.tsx` + `frame-c/tool-indicator-parser.ts` + `frame-c/tool-indicator-strip.tsx` shipped** with unit-test coverage per WB1/3/5/7/9 probes.
3. **DetailPane integration per Sub-Q-A** lands: HYBRID tab strip (default) OR REPLACE OR STACK per operator resolution at HALT-MBTWFT2-AUTHORED.
4. **WB12 mount/wiring**: `frame-c/mount.tsx` accepts `consoleBridge` + `createTerminal`; propagated to DetailPane → TerminalStream; `tile-grid/mount.ts` auto-mount passes bridge + factory at mount time.
5. **5-package typecheck CLEAN** per CLAUDE.md §4.4 (one command at a time, no `&&` chains).
6. **No regression** in Wave B + Wave C #5 + existing `console-panel/` probes (consumer non-regression per CLAUDE.md memory).
7. **WB13 runtime smoke** confirms WINDOW_READY + Frame C default + DetailPane TerminalHeaderBar + ToolIndicatorStrip + TerminalStream with live PTY chunks + scroll-pause behavior; screenshot evidence in coordination doc.
8. **WB14 findings doc + FOLLOWUPS.md updates** lands; dispatch §1 Right-pane Body stamped SHIPPED; Header bar stamped PARTIAL with Sub-Q-C followup cross-ref.
9. **Operator-visible UX**: selecting a session in Frame C SessionList causes the right pane to populate with the session's live terminal stream within ~1s of selection (or display honest "no chunks yet" if the session is idle).
10. **Pre-existing failures unchanged**: `MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL` + `MB-F-WORKSTATION-INTEGRATION-TEST-FLAKE-SUITE` status unchanged per CLAUDE.md §4.5.

---

## §8 — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `console:stdout-chunk` does NOT fire for sessions without a console-panel window opened — TerminalStream stays empty (§2.5 spike outcome 2 or 3) | `[MODELED-MEDIUM]` | `[MODELED-HIGH]` (core wireframe feature inert) | WB2 SPIKE blocks GREEN; outcomes documented in ADR + commit body; outcome 3 escalates to operator with §6 amendment scope |
| `tile-grid/mount.ts` auto-mount does NOT propagate `consoleBridge` to FrameC mount — TerminalStream cannot subscribe | `[MODELED-MEDIUM]` (Wave B WB10 wiring scope likely did not include the bridge param since DetailPane swarm-state path used `workstationBridge.readSwarmState` instead) | `[MODELED-MEDIUM]` (+1 WB if zone-internal extension required) | WB12 reads `tile-grid/mount.ts` first; if propagation absent, surfaces at HALT-WB12-PRE-COMMIT for sentinel-zone-extension scope arbitration |
| Sub-Q-A=(ii) HYBRID tab-switch unmounts TerminalStream → xterm scrollback lost on tab return | `[MODELED-MEDIUM]` | `[MODELED-MEDIUM]` (UX regression) | WB11 implements both panels with CSS visibility toggle (`display: none` vs unmount); test at WB13 smoke step 4 |
| Sub-Q-B=(i) regex misses CC stdout format drift across CC versions — tool indicators silently stop appearing | `[KNOWN-MEDIUM]` (CC stdout format is not a stable contract) | `[MODELED-MEDIUM]` (operator sees empty indicator strip; data still in raw terminal) | WB14 files Tier 2 followup; WB13 smoke validates against current CC; periodic re-validation via T6 methodology infra (visual regression) |
| Sub-Q-C=(γ) `uptime —` + `plan —` placeholders feel like missing-feature regression to operator visual review | `[MODELED-LOW]` | `[MODELED-LOW]` (cosmetic) | WB4 placeholder copy explicit ("uptime: pending session-meta IPC"); WB14 Tier 2 followup with clear closure path |
| Sub-Q-C=(β) NEW `workstation:session-meta` IPC escalates ticket to frozen-contract amendment mid-execution | `[KNOWN]` if (β) chosen | `[MODELED-MEDIUM]` (separate operator-arbitrated amendment commit + push cycle) | Default (γ) avoids; operator escalates only if uptime/plan is load-bearing |
| Scroll-listener (WB10) competes with xterm.js viewport scrollback ownership; pause detection misfires | `[MODELED-MEDIUM]` | `[MODELED-MEDIUM]` (UX: pause activates when it shouldn't, or fails to activate) | WB10 reads xterm.js scrollback model first; implement scroll-listener on the CONTAINER DOM not the xterm viewport; flag at HALT-WB10-PRE-COMMIT if non-trivial |
| Wave B Sub-Q-MBTWBFCS-B=(i) operator-arbitrated swarm-state default is regressed by Sub-Q-A=(i) REPLACE | `[KNOWN]` if (i) chosen | `[MODELED-MEDIUM]` (regression on prior operator decision) | Default Sub-Q-A=(ii) HYBRID preserves swarm-state; (i) requires explicit operator re-arbitration at HALT-MBTWFT2-AUTHORED + Tier 2 followup |
| Build pipeline (CLAUDE.md §3.7) does NOT auto-pick-up new `frame-c/` files — TerminalStream not bundled | `[MODELED-LOW]` (frame-c/ is already in an existing build path per Wave B `build-frame-c.mjs` likely exists; verify) | `[MODELED-LOW]` (bundle-inclusion verification at WB13 smoke) | WB13 smoke verifies bundle inclusion via grep fingerprint (per T6 dispatch §3.4 bundle-inclusion methodology); flag at HALT-WB13 if missing |
| Multiple concurrent sub-sessions (T1/T3) commit to `frame-c/` and overlap with T2's `detail-pane.tsx` edits | `[MODELED-LOW]` (path-disjointness §2.2 enforced) | `[MODELED-MEDIUM]` (merge conflicts) | Per-WB §0 staging check; CLAUDE.md §2.7 per-path `git add`; coordinate at HALT-MBTWFT2-AUTHORED if T3 already in flight on `detail-pane.tsx` |

---

**End of MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE ticket body.**

Pending operator resolutions before execution (HALT-MBTWFT2-AUTHORED):
- Sub-Q-MBTWFT2-A (§3.1) — DetailPane integration mode (i REPLACE / ii HYBRID DEFAULT / iii STACK)
- Sub-Q-MBTWFT2-B (§3.2) — tool-invocation parsing strategy (i regex DEFAULT / ii structured events / iii defer)
- Sub-Q-MBTWFT2-C (§3.3) — header-bar uptime + plan-name data sources (α `spawnedAt` extension / β new IPC / γ defer DEFAULT)

Plus three flag-at-WB questions:
- HALT-WB2-PRE-COMMIT: §2.5 console:stdout-chunk lifecycle spike outcome (lifecycle 1/2/3 — outcome 3 escalates to §6 amendment).
- HALT-WB3-PRE-COMMIT: header text convention — `<sessionName> @ <branchName>` vs `<branchName> @ <branchName>` per wireframe; brief operator screenshot confirmation.
- HALT-WB12-PRE-COMMIT: tile-grid/mount.ts auto-mount bridge propagation — zone-internal extension (Wave B's sentinel zone) vs new sibling sentinel block per CLAUDE.md §3.3.
