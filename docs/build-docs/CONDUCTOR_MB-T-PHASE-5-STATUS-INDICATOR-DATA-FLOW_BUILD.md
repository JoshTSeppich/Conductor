# MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW — Tile status indicator production data source (green/amber/red/grey)

**Status:** DRAFT-PENDING-OPERATOR-REVIEW
**Date authored:** 2026-05-13
**Authored under:** §3.2 operator-supervised mechanical translation discipline. Round 11 §3.9 SPECULATIVE Wave 5 dispatch from `commit-plan-doc-1334-status-indicator` (continuation of `commit-plan-doc-1334` session under new ladder).
**Authoring delegate:** Opus 4.7 under dispatch row "MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW (wireframe gap; tile status colors green/amber/red/grey production source) — ticket body + WB1+".
**Authoring anchor commit (HEAD at authoring time):** TBD (will cite first WB1 RED commit anchor).
**Cairn ladder anchor:** Phase 5 forward-position wave. Closes the production-data-source gap behind `frame-c/status-color.ts` (T1 WB6 GREEN @ `ec60622`) which currently maps `TileStatus` → hex but is fed by a renderer-derived-or-test-fixture pipeline only. This ticket ships the workstation-side data source that feeds real session status into the `TileStatus` enum.

**Closes:**
- Dispatch row `commit-plan-doc-1334-status-indicator` verbatim scope: "Production data source for tile status colors green/amber/red/grey (T1 status-color.ts helper exists; ship the data source feeding it)."
- Forward-position roadmap entry under `phase-4-tier-1-roadmap-rev-2-2026-05-12.md` adjacent to (but distinct from) the §6.6-blocked `MB-T-PHASE-4-STATUS-DERIVATION-FROM-PTY`. Phase 5 is unblocked because it consumes existing daemon `computed_status` rather than amending daemon (no §6.6 amendment required).

**Depends on (already merged):**
- T1 WB6 `frame-c/status-color.ts` (`ec60622`) — `statusToColor(TileStatus): string | null` mapping. READ-ONLY consumer of my output.
- `session-cap.ts` `SessionListClient` interface + `HttpSessionListClient` (`session-cap.ts:61-63, 159+`) — workstation already polls `GET /v2/sessions` for the spawn cap check; my source extends this consumption (NO daemon-side changes).
- `dispatch-core/src/v2/schema.ts` `SessionResponseV2` (schema.ts:329-340) + `ComputedStatusEnum` (L40-45) + `StateEnum` (L32) — frozen contract surfaces I read but do not modify.
- Recent ladder `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` (228a2da / 758ef50 / 7fc2e7a / 294ed23) — establishes spawn-result envelope plumbing pattern this ticket follows.

**Depends on (NOT YET MERGED but coordinating in parallel):**
- None known at authoring time. Sibling sessions of Round 11 Wave 5 (per `dispatch-queue-current.md` row scan at authoring) operate in disjoint territories (T10 max-parallel, chat-shell polish, BypassPermsIndicator under MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING).

**Downstream gates (post-ship):**
- Integration of the StatusIndicator component into tile-header chrome (`tile-grid.tsx` slot wiring) requires a follow-on ticket — `tile-grid.tsx` is FORBIDDEN to this ticket's manifest. Filed as proposed Tier 2 `MB-F-STATUS-INDICATOR-TILE-HEADER-INTEGRATION` at WB-final.
- Daemon-side `computed_status` derivation refinement (currently per daemon's pane-activity heuristic) is out-of-scope; tracked under existing Cluster B §6.6-blocked rows.

**Estimated WB count:** 5 WBs + WB-final (per operator Q3 = "5-6 WB full ladder"). One RED+GREEN pair per: (WB1) pure-fn derivation, (WB2) daemon poll seam, (WB3) subscribe API, (WB4) StatusIndicator component, (WB5) integration probe. WB-final ships findings + coord docs.

---

## §0 — Reading protocol

1. §1 (scope) + §2 (arbitration anchor — operator answers binding for this ladder).
2. §3 (sub-Qs) — pre-resolved at authoring per operator AskUserQuestion turn 2026-05-13. All §3 entries cite the binding answer + alternates considered.
3. §4 (WB ladder) for execution order. No §0-WB contract commit required (no `contract:` verb scope — schema.ts is READ-ONLY).
4. §5-§9 are operational supports.

Confidence labels per CLAUDE.md §2.2 apply throughout: `[KNOWN]`, `[MODELED]`, `[SPECULATIVE]`, `[KNOWN-OPERATOR-ARBITRATED]` for operator-acked decisions binding ticket scope.

---

## §1 — Scope

### §1.1 — What this ticket DOES

`[KNOWN-OPERATOR-ARBITRATED]` per dispatch row + AskUserQuestion turn 2026-05-13:

1. **Ship `session-status-source-derive.ts`** — pure-fn module exporting:
   ```ts
   export function deriveTileStatus(input: SessionStatusInput): TileStatus;
   export interface SessionStatusInput {
     readonly state?: 'armed' | 'paused' | 'held' | 'killed';  // StateEnum subset
     readonly computed_status?: 'idle' | 'running' | 'awaiting_review' | 'stale';
     readonly daemonReachable: boolean;  // false ⇒ 'error'
     readonly hasSpawnResult: boolean;   // pre-daemon-poll window
   }
   ```
   **Mapping rule** (`[KNOWN-OPERATOR-ARBITRATED]` per Sub-Q-1 answer 2026-05-13 option A):
   - `!daemonReachable` → `'error'` (red)
   - `state === 'killed'` → `'killed'` (hidden)
   - `state === 'held'` → `'error'` (red — cairn-violation halt)
   - `computed_status === 'running'` → `'open'` (green)
   - `computed_status === 'idle'` → `'idle'` (grey)
   - `computed_status === 'stale'` → `'warning'` (amber)
   - `computed_status === 'awaiting_review'` → `'detached'` (amber)
   - `hasSpawnResult && !computed_status` (pre-poll window) → `'idle'` (grey)
   - fallback → `'idle'` (grey, defensive — exhaustiveness guard via `never` cast on TileStatus return).

2. **Ship `session-status-source-poll.ts`** — daemon poll seam:
   - Consumes existing `SessionListClient` interface (`session-cap.ts:61-63`) — NO new daemon-client class. Production wiring reuses `HttpSessionListClient`.
   - `setInterval`-based polling. Default 3000ms (`[KNOWN-OPERATOR-ARBITRATED]` per Sub-Q-3 answer option A); configurable via factory option.
   - Backoff on consecutive failures: 3s → 6s → 12s; resets to 3s on first successful poll. (Hard cap at 12s for v3.0; richer backoff strategy deferred to follow-on if dogfood reveals oscillation.)
   - Per-session dedup: emit status change only when derived `TileStatus` differs from last observed value for that session name.
   - `dispose()` clears interval + drops latest snapshot + drops subscribers.

3. **Ship `session-status-source.ts`** — public-facing module composing derive + poll:
   ```ts
   export interface SessionStatusSourceDeps {
     readonly listClient: SessionListClient;  // production: HttpSessionListClient
     readonly intervalMs?: number;             // default 3000
     readonly clock?: () => number;            // test seam; default () => Date.now()
   }
   export interface SessionStatusSource {
     subscribe(cb: (snapshot: ReadonlyMap<string, TileStatus>) => void): () => void;
     getSnapshot(): ReadonlyMap<string, TileStatus>;
     dispose(): void;
   }
   export function createSessionStatusSource(deps: SessionStatusSourceDeps): SessionStatusSource;
   ```
   - Spawn-event integration (pre-poll grey window): consumers that want the optimistic `'idle'` value pre-daemon-refresh can wrap the source with a `markSpawnResult(sessionName)` adapter. **Phase 5 ships the source with daemon-only inputs**; the spawn-event adapter is a thin follow-on if dogfood reveals user-visible latency. Filed as proposed Tier 3 `MB-F-STATUS-SOURCE-SPAWN-EVENT-OPTIMISTIC-WINDOW` at WB-final.

4. **Ship `tile-grid/status-indicator.tsx`** — React presentational component:
   ```tsx
   export interface StatusIndicatorProps {
     readonly status: TileStatus;
     readonly sessionName: string;  // for data-testid only
   }
   export function StatusIndicator(props: StatusIndicatorProps): JSX.Element | null;
   ```
   - Renders a 10px colored dot via inline style + `statusToColor(status)` from `frame-c/status-color.ts` (READ-ONLY consumed).
   - Returns `null` when `statusToColor` returns null (TileStatus 'killed'); defensive call-site — production callers filter killed sessions out before invoking.
   - `data-testid={\`tile-status-indicator-${sessionName}\`}` for downstream consumer tests.
   - `data-status={status}` attribute exposes raw status to test inspection without requiring color-value matching.

5. **Ship 5 WBs of probes** covering: pure-fn derivation per mapping rule branch (8 conditions), daemon poll behavior (5 conditions: interval, backoff, dedup, dispose, fail-then-recover), subscribe API (4 conditions: subscribe, unsubscribe, getSnapshot, dispose), StatusIndicator render (4 conditions: each color + killed-null), integration end-to-end (3 conditions: state transitions emit correct colors).

### §1.2 — What this ticket DOES NOT

`[KNOWN-OPERATOR-ARBITRATED]` constraints:

- Does NOT modify `tile-grid.tsx`, `tile-grid-app.tsx`, `spawn-handler.ts`, OR `frame-c/status-color.ts` — all FORBIDDEN or READ-ONLY per manifest. Integration into the tile-header chrome slot is a follow-on ticket.
- Does NOT amend `dispatch-core/src/v2/schema.ts` (FORBIDDEN; frozen). All consumed shapes already exist: `SessionResponseV2` (schema.ts:329-340), `ComputedStatusEnum` (L40-45), `StateEnum` (L32), `SessionsListResponse` (L347-349).
- Does NOT amend `WORKSTATION_CONTRACT.md` (FORBIDDEN) — no new IPC channels; data source is in-process renderer/main code consuming existing HTTP endpoint.
- Does NOT modify `dispatch-daemon/**` (FORBIDDEN entire package). Daemon's `computed_status` derivation heuristic is the source of truth for activity-based status; refining it is out-of-scope.
- Does NOT do a live daemon spike (`[KNOWN-OPERATOR-ARBITRATED]` per Sub-Q-2 answer option A). The schema.ts Zod contract is treated as the §2.8-equivalent observation evidence. Daemon's adherence to that schema is bound by its own Zod validators per CONDUCTOR_API_CONTRACT.md §4.2.
- Does NOT install runtime dependencies. Production wiring uses existing `fetch` + `HttpSessionListClient` already in the workstation bundle.
- Does NOT ship persistence. The status snapshot lives in memory; on dispose / window-reload it is rebuilt from the first daemon poll.

---

## §2 — Arbitration anchor

The following operator decisions are LOAD-BEARING and bind every WB. `[KNOWN-OPERATOR-ARBITRATED]` 2026-05-13 via AskUserQuestion turn:

| Sub-Q | Decision | Alternates considered |
|---|---|---|
| §3.1 (semantics) | **Activity-based, consuming daemon's `computed_status`** — single source of truth lives in daemon; workstation projects | Re-derive workstation-side from raw `last_prompt_sent_at` timestamps (rejected — duplicates daemon logic; drift risk); Hybrid with optimistic override (deferred — see §1.1 row 3 followup) |
| §3.2 (spike) | **Skip live daemon spike — schema is the contract** | Author daemon-startup + live HTTP capture WB (rejected — schema.ts Zod is contractual binding; live behavior is bound by daemon's own validators) |
| §3.3 (polling) | **Active polling with backoff (3s default; 6s → 12s on failure; dedup; dispose-aware)** | On-demand pull (rejected — pushes cadence decision to every consumer); WebSocket /v2/events subscription (rejected — adds WS coupling; existing HTTP poll path reused) |
| §3.4 (placement) | **Tile-header-chrome slot consumer** (integration deferred to follow-on ticket) | FrameCRoot SessionList row (rejected — same downstream-integration concern); Component-only no integration (chosen for this ticket; integration is a separate territory) |

---

## §3 — Sub-arbitrations (resolved at authoring)

### §3.1 — Status semantics (resolved: activity-based via daemon's computed_status)

Mapping rule per §1.1 row 1. Critical adaptation from the operator-preview vocabulary `'errored'` / `'spawning'` (which do NOT exist in StateEnum) to the real `'held'` (cairn-violation halt → red) and `'idle'` pre-poll fallback (grey). This adaptation was surfaced + acked in the same AskUserQuestion turn.

### §3.2 — External-API observation discipline (resolved: schema-as-contract)

`[KNOWN-OPERATOR-ARBITRATED]` per AskUserQuestion. dispatch-core/src/v2/schema.ts is treated as §2.8-equivalent observation; no live daemon HTTP capture authored. If WB5 integration probe reveals daemon response shape divergence from the schema, surface as HALT-PRE-WB5-COMMIT for spike + ADR insertion.

### §3.3 — Poll cadence + backoff (resolved: 3s default, 3→6→12s backoff, dedup, dispose)

`[KNOWN-OPERATOR-ARBITRATED]`. Backoff strategy is bounded (cap 12s); reset to 3s on first successful poll. Per-session dedup compares derived TileStatus only — daemon-side timestamp jitter does not trigger re-emit if mapping output is stable.

### §3.4 — Component render placement (resolved: tile-header slot — integration deferred)

`[KNOWN-OPERATOR-ARBITRATED]`. StatusIndicator component is decoupled from any specific slot integration. Integration WB requires modifying `tile-grid.tsx` (FORBIDDEN to this ticket); filed as proposed Tier 2 followup at WB-final.

### §3.5 — Open Sub-Q surfaced at authoring (RESOLVED VIA DEFAULT — operator may override)

**§3.5.A — Should the source emit a "stale snapshot indicator" between daemon-unreachable failures?**

Default: NO. While daemon is unreachable, source emits `'error'` for every session in the last-known snapshot. When recovery happens, source emits the new derived status. There is no "stale" intermediate state.

Alternate (operator may pin): emit a special `'awaiting'` TileStatus during the backoff window. **Rejected by default** because TileStatus does not include `'awaiting'`; adding it would touch `tile-grid/types.ts` (NOT in my territory) and `frame-c/status-color.ts` (READ-ONLY).

---

## §4 — WB ladder

5 WBs + WB-final. Each WB is a RED+GREEN pair per CLAUDE.md §2.3 cairn grammar.

### WB1 — `red+green(MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW): WB1 — pure-fn deriveTileStatus mapping`

**Scope:** Author `src/main/session-status-source-derive.ts` + RED probe at `test/unit/main/probe-mbtphase5-status-derive-01-mapping.spec.ts`.

**RED probe — 8 conditions** (one per mapping branch + 1 fallback):
1. `!daemonReachable` → `'error'`
2. `state === 'killed'` → `'killed'`
3. `state === 'held'` → `'error'`
4. `computed_status === 'running'` → `'open'`
5. `computed_status === 'idle'` → `'idle'`
6. `computed_status === 'stale'` → `'warning'`
7. `computed_status === 'awaiting_review'` → `'detached'`
8. `hasSpawnResult && !computed_status` → `'idle'` (pre-poll grey window)

Acceptance: probe imports a `deriveTileStatus` that does NOT exist at HEAD → import error / type error suppressed by `@ts-expect-error WB1 RED:`. All 8 conditions return `undefined` → all 8 fail with `expected undefined to be '<color>'`. GREEN: implement the function; remove suppressions; 8/8 PASS + typecheck CLEAN.

### WB2 — `red+green(MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW): WB2 — daemon poll seam with backoff`

**Scope:** Author `src/main/session-status-source-poll.ts` + RED probe at `test/unit/main/probe-mbtphase5-status-poll-01-interval-backoff.spec.ts`.

**RED probe — 5 conditions**:
1. Successful listSessions calls fire at `intervalMs` cadence (verified via fake-timer + recording client).
2. Per-session status change is emitted to subscriber callback exactly once per actual transition.
3. Duplicate listSessions response (same shape) does NOT re-emit (dedup).
4. Consecutive listSessions failures → backoff doubles up to cap 12s; first success resets to 3s.
5. `dispose()` clears interval + subsequent fake-timer ticks do NOT invoke listSessions.

Test fixture: `vi.useFakeTimers()` + recording `SessionListClient` stub + spy on subscriber callback. GREEN: implement poll module; 5/5 PASS.

### WB3 — `red+green(MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW): WB3 — subscribe API factory`

**Scope:** Author `src/main/session-status-source.ts` (public facade) + RED probe at `test/unit/main/probe-mbtphase5-status-source-01-subscribe-api.spec.ts`.

**RED probe — 4 conditions**:
1. `createSessionStatusSource(deps)` returns object with `subscribe`, `getSnapshot`, `dispose` methods.
2. `subscribe(cb)` returns an unsubscribe function; calling it stops further invocations.
3. `getSnapshot()` returns the current ReadonlyMap of derived statuses (empty until first poll completes).
4. `dispose()` is idempotent (calling twice does not throw); post-dispose, `subscribe` is a no-op.

GREEN: compose WB1 derive + WB2 poll into the factory; 4/4 PASS.

### WB4 — `red+green(MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW): WB4 — StatusIndicator React component`

**Scope:** Author `src/tile-grid/status-indicator.tsx` + RED probe at `test/unit/tile-grid/probe-mbtphase5-status-indicator-01-render.spec.tsx`.

**RED probe — 4 conditions** (one per visible status + null branch):
1. `<StatusIndicator status="open" sessionName="s" />` renders dot with `backgroundColor: #5b9d6e` (green).
2. `<StatusIndicator status="idle" sessionName="s" />` renders dot with `backgroundColor: #888888` (grey).
3. `<StatusIndicator status="warning" sessionName="s" />` renders dot with `backgroundColor: #c97a3a` (amber).
4. `<StatusIndicator status="error" sessionName="s" />` renders dot with `backgroundColor: #c54a4a` (red).
5. `<StatusIndicator status="killed" sessionName="s" />` returns null (defensive — production callers filter killed before invoking).

All conditions also assert `data-testid="tile-status-indicator-s"` + `data-status="<value>"` for testability. Imports `statusToColor` from `../frame-c/status-color.js` (READ-ONLY allowed). GREEN: implement component; 5/5 PASS.

### WB5 — `red+green(MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW): WB5 — integration probe end-to-end`

**Scope:** RED probe at `test/unit/tile-grid/probe-mbtphase5-status-indicator-02-integration.spec.tsx`.

**RED probe — 3 conditions**:
1. Mount `<StatusIndicator status={...}>` driven by `createSessionStatusSource()` subscribe; fake `SessionListClient` returns `{computed_status: 'running'}` → indicator renders green.
2. Fake client toggles to `{computed_status: 'stale'}` → after fake-timer tick + act() flush, indicator renders amber.
3. Fake client rejects (DaemonUnreachable) → after backoff window, indicator renders red.

This is the closure-of-loop probe — verifies WB1+WB2+WB3+WB4 compose correctly under realistic-ish state transitions. GREEN: no new source; this is purely an assertion the previous WB GREENs already satisfy. Authoring the probe IS the GREEN; if it fails, the failure is a bug in WB1-4 to be fixed in-WB before commit (no new RED commit — this is the integration ratification).

### WB-final — `docs(MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW): WB-final — findings + coord docs`

**Scope:**
1. `docs/coordination/mb-t-phase-5-status-indicator-data-flow-findings-2026-05-13.md` — durable findings (closure summary, cairn ladder table, verification evidence, vocabulary, downstream impact, proposed followups, confidence summary).
2. `docs/coordination/coord-phase5-status-2026-05-13.md` — cross-session coordination notes (interlocks, manifest territory delta if any, RECURRENCE catalog if observed, Tier 2/3 followups paste-ready for orchestrator pickup).

Proposed followups to be authored:
- `MB-F-STATUS-INDICATOR-TILE-HEADER-INTEGRATION` (Tier 2) — wire StatusIndicator into `tile-grid.tsx` tile-header slot (NOT in this ticket's territory).
- `MB-F-STATUS-SOURCE-SPAWN-EVENT-OPTIMISTIC-WINDOW` (Tier 3) — pre-poll grey window adapter for spawn-event-driven optimistic rendering.
- `MB-F-STATUS-SOURCE-DAEMON-UNREACHABLE-UX` (Tier 3) — UX disposition for "all sessions red because daemon down" — distinguish from per-session error.

---

## §5 — Cross-references

| Anchor | Citation |
|---|---|
| Operator answers binding §1.1 + §2 + §3 | AskUserQuestion turn 2026-05-13 (this session) |
| Daemon GET /v2/sessions response shape | `packages/dispatch-core/src/v2/schema.ts:329-340` (SessionResponseV2) + L40-45 (ComputedStatusEnum) + L32 (StateEnum) |
| Existing daemon-poll client | `packages/dispatch-workstation/src/main/session-cap.ts:61-63` (SessionListClient) + L159+ (HttpSessionListClient) |
| Color mapping target | `packages/dispatch-workstation/src/frame-c/status-color.ts` (statusToColor) |
| TileStatus enum | `packages/dispatch-workstation/src/tile-grid/types.ts` |
| Phase-4 roadmap context | `docs/coordination/phase-4-tier-1-roadmap-rev-2-2026-05-12.md` |
| Companion recently-shipped ladder pattern | MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING (228a2da/758ef50/7fc2e7a/294ed23) |

---

## §6 — Self-check expectations (per CONDUCTOR_API_CONTRACT.md §10.5)

Every WB commit body MUST include the Q1-Q9 self-check block. Pre-emptive answers for this ticket's expected pattern:

1. **API verified by spike?** — Per Sub-Q-3.2 ack: schema.ts is the §2.8-equivalent observation. No live spike needed.
2. **Test exercises behavior or MOCKS?** — Behavior. Pure-fn (WB1) is tested directly; poll seam (WB2) uses fake timers + recording stub of `SessionListClient` (necessary indirection); React component (WB4) is rendered for real.
3. **If implementation deleted, test passes?** — No (RED probes fail at HEAD; GREEN closes them).
4. **Anything outside contract spec?** — No. Pre-resolved Sub-Qs pin every decision.
5. **Modified contract without approval?** — No. dispatch-core/src/v2/schema.ts is READ for context only; not modified.
6. **Any unlabeled claim?** — No. KNOWN labels on schema-derived facts; KNOWN-OPERATOR-ARBITRATED on Sub-Qs; MODELED on backoff-doubling effectiveness (cited as model, not observed).
7. **Touched files another parallel session might modify?** — Every WB MUST pre-stage `git status --short` per CLAUDE.md §2.7 + the operator W2A discipline lessons from prior session (`commit-plan-doc-1334` MB-F-spawnmode ladder). Foreign-staged files MUST be `git restore --staged`-unstaged before per-path add.
8. **Bypass PATCH /v2/sessions/:name/state?** — N/A. This ticket only READS via GET /v2/sessions.
9. **Work during unauthorized halt?** — No. Operator dispatch + AskUserQuestion ack authorize the entire ladder.

Every WB commit MUST use per-path pathspec on the commit command: `git commit -m "..." -- <path1> <path2> ...`. Per prior session lessons documented in `mb-f-tilegridsessionentry-spawnmode-2026-05-12.md` §VI.

---

## §7 — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Daemon's `computed_status` heuristic surfaces unexpected values not in ComputedStatusEnum | LOW | MED — fallback to `'idle'` (defensive); schema validation by daemon should reject divergent values | Exhaustiveness `never` guard in deriveTileStatus switch; explicit fallback to `'idle'` documented |
| Backoff cap of 12s feels too slow under sustained daemon outage dogfood | MED | LOW — visible-status delay; not functional regression | Configurable via factory option; can be tuned post-dogfood without re-architecting |
| Cross-session staging contamination on shared working tree (per RECURRENCE-1..5 in prior session) | HIGH (observed ~1 incident per WB) | LOW per occurrence when discipline applied (caught at pre-stage status) | Mandatory `git status --short` pre-stage + `git restore --staged` of any foreign file; per-path commit pathspec |
| `frame-c/status-color.ts` (READ-ONLY for me) has a subtle bug or breaks the StatusIndicator integration | LOW | MED — would block WB4 GREEN | If observed, HALT-PRE-WB4-GREEN; surface to operator; do not modify the READ-ONLY file |
| Vitest fake-timer + happy-dom + React act() interaction is fragile for WB5 integration probe | MED | LOW — can be split or simplified | If WB5 RED authoring exposes fixture brittleness, escalate to: simpler unit probes per layer + visual MANUAL-TODO surface for integration confidence; document in findings |

---

## §8 — Definition of done

- [ ] WB1 RED+GREEN: `session-status-source-derive.ts` ships; 8/8 conditions pass; typecheck CLEAN.
- [ ] WB2 RED+GREEN: `session-status-source-poll.ts` ships; 5/5 conditions pass; typecheck CLEAN.
- [ ] WB3 RED+GREEN: `session-status-source.ts` (facade) ships; 4/4 conditions pass; typecheck CLEAN.
- [ ] WB4 RED+GREEN: `tile-grid/status-indicator.tsx` ships; 5/5 conditions pass; typecheck CLEAN.
- [ ] WB5 RED+GREEN: integration probe at 3/3 conditions; no new source code.
- [ ] WB-final: 2 docs authored under manifest territory.
- [ ] Every WB commit: per-path stage + per-path commit pathspec + post-stage status verified + push + origin parity verified.
- [ ] Consumer non-regression at WB-final: full workstation unit suite passes (excluding pre-existing REDs from peer tickets, e.g., MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS `model?:` + `spawnedAtMs` RED probes per `55776cf`).
- [ ] HALT-TICKET-BODY-PRE-COMMIT surfaced ONLY if operator review needed (this body is operator-authored-approval-implicit per dispatch row scope).

---

## §9 — Closing posture

Closure of this ticket SHIPS the data-source-side of the wireframe status indicator gap. Integration into the tile-header chrome slot is the next forward step and is operator-arbitrated. Proposed manifest territory delta for the integration ticket: `packages/dispatch-workstation/src/tile-grid/tile-grid.tsx` (currently FORBIDDEN to me).

No anomalies expected at HALT-TICKET-BODY-PRE-COMMIT for this DRAFT — operator pre-resolved 4 Sub-Qs via AskUserQuestion turn and dispatched the ladder directly. Body proceeds to WB1 RED authoring immediately upon ticket-body commit.

---

**End ticket body.**
