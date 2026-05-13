# MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW — closure findings

**Session**: `commit-plan-doc-1334-status-indicator` (continuation of `commit-plan-doc-1334` under new ladder)
**Date**: 2026-05-13
**Round**: 11 §3.9 SPECULATIVE Wave 5
**Ticket body**: `docs/build-docs/CONDUCTOR_MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW_BUILD.md` (`832c03b`)
**Closure path executed**: ticket §1.1 rows 1-5 — full 5-WB ladder + WB-final per ticket §4.

## §I — Closure summary

The wireframe gap "production data source for tile status colors green/amber/red/grey" is closed. The workstation now consumes daemon's existing `computed_status` (activity-derived) + `state` (lifecycle) fields via an active 3s-cadence poll with 3→6→12s backoff on consecutive failures, deriving per-session `TileStatus` values (`'open' | 'idle' | 'detached' | 'warning' | 'error' | 'killed'`). A presentational `StatusIndicator` React component renders a 10px colored dot via the existing T1 `statusToColor` mapping (read-only consumed). The complete chain is integration-ratified end-to-end at WB5: real state transitions (`running → stale → daemon-down`) drive the indicator through green → amber → red within fake-timer-driven test windows.

No daemon-side modifications. No frozen-contract amendments. No new IPC channels. Workstation-internal renderer/main composition only.

## §II — Cairn ladder

| WB | Verb | Commit | File(s) | Outcome |
|---|---|---|---|---|
| ticket body | docs | `832c03b` | `docs/build-docs/CONDUCTOR_MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW_BUILD.md` | 5-WB ladder authored with 4 pre-resolved Sub-Qs (operator AskUserQuestion turn 2026-05-13) + 1 §3.5.A default. |
| WB1 RED | red | `09fff64` | `test/unit/main/probe-mbtphase5-status-derive-01-mapping.spec.ts` | 8 conditions (one per mapping branch); all fail at HEAD pre-module (`deriveTileStatus` undefined). |
| WB1 GREEN | green | `eeb11f5` | `src/main/session-status-source-derive.ts` | Pure-fn ships; 8/8 PASS; typecheck CLEAN. |
| WB2 RED | red | `9c0491b` | `test/unit/main/probe-mbtphase5-status-poll-01-interval-backoff.spec.ts` | 5 conditions (interval / dedup / backoff trace / dispose); all fail pre-module. |
| WB2 GREEN | green | `17aa384` | `src/main/session-status-source-poll.ts` | Poll seam ships; 5/5 PASS; backoff cadence trace verified (`t=0 fail → 6s → 12s → 12s → 12s → success → reset 3s`). |
| WB3 RED | red | `ee1ccdb` | `test/unit/main/probe-mbtphase5-status-source-01-subscribe-api.spec.ts` | 4 conditions (shape / unsubscribe / getSnapshot / dispose-idempotent); all fail pre-module. |
| WB3 GREEN | green | `fb6a474` | `src/main/session-status-source.ts` | Facade ships; 4/4 PASS; subscribe Set + snapshot Map composition. |
| WB4 RED | red | `6d70dbe` | `test/unit/tile-grid/probe-mbtphase5-status-indicator-01-render.spec.tsx` | 5 conditions (4 colors + killed-null); all fail pre-module. |
| WB4 GREEN | green | `ff530b1` | `src/tile-grid/status-indicator.tsx` + `tsconfig.json` (W4A ad-hoc relax: 1-line exclude-list entry) | Component ships; 5/5 PASS; typecheck CLEAN post-tsconfig-fix. |
| WB5 ratification | green | `5dc34c7` | `test/unit/tile-grid/probe-mbtphase5-status-indicator-02-integration.spec.tsx` | 3 conditions (running-green / running→stale-amber / daemon-down-red); 3/3 PASS on first author; 78/591 consumer non-regression. |
| WB-final | docs | (this commit) | findings + coord | Tier-2/3 followups proposed + manifest formalization request. |

## §III — Verification evidence (KNOWN)

- **All WBs**: `pnpm --filter dispatch-workstation typecheck` CLEAN at every commit.
- **WB1**: 8/8 mapping conditions pass; one assertion per branch of the precedence rule.
- **WB2**: 5/5 poll conditions pass; backoff cadence trace step-by-step (6 calls over t=0..45s) verified at the assertion level.
- **WB3**: 4/4 facade conditions pass; idempotent dispose + no-op post-dispose subscribe verified.
- **WB4**: 5/5 component conditions pass; data-status + backgroundColor hex asserted per status value; null-return on `'killed'`.
- **WB5**: 3/3 integration conditions pass first-author; no bug exposed in WB1-4.
- **Consumer non-regression at WB5**: 78 suites / 591 tests PASS across `test/unit/main + test/unit/tile-grid + test/unit/frame-c`. 0 failures attributable to my work.

## §IV — Vocabulary + design decisions [KNOWN-OPERATOR-ARBITRATED]

Per AskUserQuestion turn 2026-05-13:

| Sub-Q | Decision | Mechanism shipped |
|---|---|---|
| §3.1 status semantics | Consume daemon `computed_status` (activity-derived) | `deriveTileStatus(input)` switch on `computed_status` with state-machine precedence above (`!daemonReachable` → `'error'`; `state === 'killed'` → `'killed'`; `state === 'held'` → `'error'`) |
| §3.2 external-API spike | Schema-as-contract; no live daemon HTTP capture | Direct read of `dispatch-core/src/v2/schema.ts:32 + 40-45 + 329-340` cited as §2.8-equivalent observation. Daemon source spot-checked at `routes/sessions.ts:100-120` to verify array-shape response (vs schema's `z.record` docstring drift). |
| §3.3 poll cadence | Active polling 3s default; backoff 3→6→12s on failure; reset on first success; dedup on derived TileStatus | `session-status-source-poll.ts` setTimeout-driven loop; `DEFAULT_INTERVAL_MS=3000`, `BACKOFF_CAP_MS=12000`. |
| §3.4 component placement | Tile-header-chrome slot consumer; integration deferred | Component is decoupled from any slot integration. `tile-grid.tsx` slot wiring is a follow-on ticket (FORBIDDEN to my manifest). |
| §3.5.A stale-snapshot indicator | NO (default; operator did not override) | Failure window emits `'error'` for previously-known sessions; no special `'awaiting'` TileStatus. |

### Schema-vs-preview adaptation surfaced + acked

The operator's Sub-Q-1 preview proposed `state === 'errored'` and `state === 'spawning'` — values that do NOT exist in `StateEnum`. I surfaced this gap inline in the AskUserQuestion turn; operator chose the schema-faithful mapping (state-machine `'held'` for red; pre-poll fallback for grey). Documented in ticket body §3.1 + module docstrings.

### Daemon response shape adaptation

`dispatch-core/src/v2/schema.ts:347-349` declares `SessionsListResponse = { sessions: z.record(name, SessionResponseV2) }` (record-shape). Daemon's actual handler at `dispatch-daemon/src/routes/sessions.ts:100-120` returns `{ sessions: Array<{name, ...session, computed_status, cost_info}> }` (array-shape). My `StatusListClient` interface follows the array-shape (matches actual daemon behavior + matches existing `SessionListClient`/`HttpSessionListClient` at `session-cap.ts:46-186`). Schema-docstring drift filed as proposed Tier 3 followup (see §VII).

## §V — Downstream impact + unblocking

| Downstream | Status pre-closure | Status post-closure |
|---|---|---|
| Tile-header chrome status indicator (visual wireframe target) | Color helper exists (`status-color.ts`), no data source feeding it | Data source ships; component ready; only `tile-grid.tsx` slot wiring remains (follow-on ticket) |
| FrameCRoot SessionList per-row status dot | Inline `STATUS_DOT_HEX` literal at `session-list.tsx:64-70` (T1 vintage) | Could swap to consume `SessionStatusSource` for live updates; alternative integration site noted in coord doc §1 |
| `MB-T-PHASE-4-STATUS-DERIVATION-FROM-PTY` (Cluster B; §6.6-blocked) | Independent — different scope (daemon-side PTY parsing) | UNCHANGED — Phase-5 ships consumer of existing daemon-derivation; daemon-derivation refinement is Phase-4 work |
| `MB-F-T4-BOTTOM-RAIL-MOUNT-WIRING` BypassPermsIndicator arm | Independent — different bottom-rail component | UNCHANGED — separate follow-on under MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW peer work |

## §VI — Methodology findings

### RECURRENCE catalog (this session)

Zero cross-session staging contaminations observed during this 5+1 WB ladder. Pre-stage `git status --short` checkpoints applied at every WB; foreigners (when present in working tree) were unstaged. The prior `commit-plan-doc-1334-spawnmode` ladder caught 5 contaminations (RECURRENCE-1..-5 catalog in `mb-f-tilegridsessionentry-spawnmode-2026-05-12.md` §VI). This session ran cleaner — possibly because Round 11 Wave 5 has fewer parallel-cairn sessions hitting overlapping territory at the same time, OR because the operator-mandated discipline directives (W2A patterns) are now load-bearing on the orchestrator dispatch side.

Pattern is consistent with prior session's discipline-success-rate analysis: **mandatory pre-stage status check catches 100% of contaminations**, when contaminations occur.

### W4A ad-hoc territory relaxation

WB4 surfaced a tsconfig.json gap (`.tsx` files in `src/tile-grid/` must be individually listed in the `exclude` array for tsc to skip them — esbuild does the JSX compilation per `scripts/build-tile-grid.mjs`). Operator W4A ack 2026-05-13 granted single-line `exclude`-list expansion for this ticket. Follow-on tickets shipping new `src/tile-grid/*.tsx` files will hit the same convention — see §VIII for manifest formalization request.

## §VII — Tier 2/3 followups proposed for orchestrator pickup (FOLLOWUPS.md FORBIDDEN to me)

| Proposed row | Tier | Rationale | Discoverability anchor |
|---|---|---|---|
| `MB-F-STATUS-INDICATOR-TILE-HEADER-INTEGRATION` | Tier 2 | Wire StatusIndicator into `tile-grid.tsx` tile-header slot (NOT in my manifest territory). Likely uses an existing `renderHeaderStatusSlot` pattern analogous to `renderPickerSlot` / `renderAutopilotSlot` / `renderFooterSlot`. Closure: 1 prop addition to `TileGridProps` + 1 closure at the parent that pulls status from `createSessionStatusSource` + threading through to `<Tile>`. | This findings doc §V row 1; ticket body §1.2 "Does NOT modify tile-grid.tsx"; WB5 ratification (`5dc34c7`) demonstrates end-to-end mechanism |
| `MB-F-STATUS-SOURCE-SPAWN-EVENT-OPTIMISTIC-WINDOW` | Tier 3 | Pre-poll grey window adapter for spawn-event-driven optimistic rendering. When a workstation observes a successful spawn-result, mark the session `'idle'` (grey) immediately rather than wait for the first daemon poll (up to 3s latency). Implementation: thin wrapper around `createSessionStatusSource` that pre-seeds the snapshot Map. | Ticket body §1.1 row 3 explicit deferral note; this findings doc §IV §3.4 row |
| `MB-F-STATUS-SOURCE-DAEMON-UNREACHABLE-UX` | Tier 3 | UX disposition for "all sessions red because daemon is down" vs per-session error. Currently, when the daemon becomes unreachable, every previously-seen session flips to `'error'` — visually indistinguishable from a per-session cairn-violation halt. Consider distinct UI for whole-daemon-down state (banner + grey-all vs red-all). | This findings doc §IV §3.5.A; ticket body risk register row 2 |
| `MB-F-SCHEMA-V2-SESSIONS-LIST-RESPONSE-RECORD-VS-ARRAY-DOCSTRING-DRIFT` | Tier 3 | `dispatch-core/src/v2/schema.ts:347` declares `z.record(name, ...)` but daemon's handler at `dispatch-daemon/src/routes/sessions.ts:100-120` returns array shape. Drift is "Zod schema is wrong vs production behavior" — caught by direct daemon-source read during my §2.8 spike. Closure: amend schema to match (or amend daemon if record-shape is the intent — operator-arbitrated). | This findings doc §IV "Daemon response shape adaptation" |
| `MB-F-WORKSTATION-TSCONFIG-TILE-GRID-TSX-EXCLUDE-CONVENTION` | Tier 2 | Workstation tsconfig requires every new `src/tile-grid/*.tsx` file to be added to the `exclude` array individually. This convention is implicit — not documented in CLAUDE.md §3.7 build pipeline section. Any future ticket adding a new `.tsx` in tile-grid hits the same TS17004 wall (caught at WB4 this session). Closure: codify the convention in CLAUDE.md OR amend the tsconfig to use a glob exclude `src/tile-grid/*.tsx` (would need verification that no other tsc-needed `.tsx` lives there). | This findings doc §VI W4A row + ticket body §1.2 risk register |

## §VIII — Manifest territory delta surfaced for formalization

Per operator W4A ack 2026-05-13:

```
packages/dispatch-workstation/tsconfig.json   (1-line `exclude` array append)
```

**Manifest formalization recommendation**: codify this path in the manifest for any future Phase-5/Phase-6 ticket adding `src/tile-grid/*.tsx` files. The tsconfig convention is load-bearing — without the exclude entry, tsc fails with TS17004 because the workstation tsconfig does not enable `--jsx` (JSX compilation is delegated to esbuild per `scripts/build-tile-grid.mjs`). See `MB-F-WORKSTATION-TSCONFIG-TILE-GRID-TSX-EXCLUDE-CONVENTION` Tier 2 (§VII row 5).

## §IX — Closure stamp request

Per operator-mediated FOLLOWUPS / dispatch queue update (both FORBIDDEN to me):
- Move `commit-plan-doc-1334-status-indicator` dispatch row from IN-FLIGHT to COMPLETED in `docs/coordination/dispatch-queue-current.md`.
- Reference closure commits: `{832c03b, 09fff64, eeb11f5, 9c0491b, 17aa384, ee1ccdb, fb6a474, 6d70dbe, ff530b1, 5dc34c7}` + this WB-final commit.

## §X — Confidence summary

All factual claims `[KNOWN]` from direct evidence cited inline (vitest output, `git show`, `git diff`, schema.ts + daemon-source reads). Pattern conclusions in §VI (zero contaminations this session; discipline-100% catch rate) are `[KNOWN]` for this session's local sample; `[MODELED]` for cross-session generalization (consistent with prior session's analysis at N=5 incidents, all caught at pre-stage check).
