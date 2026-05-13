# MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION — Sub-Q dispositions

**Status:** `[SPECULATIVE]` — all Sub-Q rows below are AUTHORING-RECOMMENDATIONS only. Operator HALT-PRE-WB1 ack required before any row's status flips to `[KNOWN-OPERATOR-ARBITRATED]` and before Wave 2 impl session is dispatched.
**Date authored:** 2026-05-13
**Session**: `r12-phase5-tile-header-integration-body` (Round 12 §3.9 SPECULATIVE Wave 1)
**Companion docs:** ticket body at `docs/build-docs/CONDUCTOR_MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION_BUILD.md` §3; coord at `docs/coordination/coord-mb-t-phase-5-tile-header-status-integration-2026-05-13.md`

---

## §1 — How to use this doc

Operator reviews each Sub-Q row, picks the binding answer, and either:
- **Acks recommended option** (most rows mark `RECOMMEND` clearly).
- **Picks an alternate option** and updates the row inline.
- **Pins a new disposition not listed** and adds it as a new option.

Once all Sub-Qs are acked, the row's `disposition` field flips from `[SPECULATIVE]` to `[KNOWN-OPERATOR-ARBITRATED]` with citation `(operator ack <date> via <channel>)`. Wave 2 impl session manifest authoring is then unblocked.

---

## §2 — Sub-Q dispositions

### Sub-Q-1 — Closure path

**Question**: Which closure path implements the followup row prescription, given that authoring investigation reveals an existing data-flow seam not anticipated in the followup row body?

| Field | Value |
|---|---|
| disposition | `[SPECULATIVE]` — pending operator ack |
| authoring recommendation | **Path B (data-flow)** — exploit existing `TileGridSessionEntry.status?` seam at `tile-grid.tsx:31`; merge `createSessionStatusSource` snapshot into `sessions` array at `tile-grid-app.tsx:447-448` JSX call site. Zero new render-prop; zero new `.tsx` files; preserves all existing testid contracts. |
| rationale | Smallest blast radius (single file `tile-grid-app.tsx`). Zero `MB-F-WORKSTATION-TSCONFIG-TILE-GRID-TSX-EXCLUDE-CONVENTION` tax. Preserves MB-T12 probe-01..04 unkeyed `tile-status-indicator` testid. The shipped `StatusIndicator` component is NOT consumed by this ticket but remains exported for the predecessor coord doc §1 row 2 FrameCRoot SessionList consumer (separate follow-on). |
| alternates considered | **Path A** — followup-row-literal `renderStatusSlot` prop. Adds a 2nd indicator (keyed testid `tile-status-indicator-{sessionName}`) alongside the existing unkeyed inline span. Visual duplication concern; 4-WB ladder. **Path C** — full collapse: replace inline span with new render-slot. Largest blast radius; touches `tile-header.tsx` + breaks MB-T12 probe selectors unless migrated atomically. 5+-WB ladder. |
| risk if disposition flips mid-ladder | MED — partial Path B work along `tile-grid-app.tsx` would require pivot to multi-file Path A. Gate at HALT-PRE-WB1. |

### Sub-Q-2 — Source ownership and lifecycle

**Question**: Where does the singleton `SessionStatusSource` live, and what is its lifetime relative to the React component tree?

| Field | Value |
|---|---|
| disposition | `[SPECULATIVE]` — pending operator ack |
| authoring recommendation | **Renderer-side `useEffect`-owned in `tile-grid-app.tsx`** — one source per `TileGridApp` component instance; subscribe on mount; `dispose()` on unmount. |
| rationale | Mirrors `probe-mbtphase5-status-indicator-02-integration.spec.tsx:76-89` `ConsumerWrapper` pattern. React-idiomatic. No IPC coupling, no main-process state, no schema amendment. |
| alternates considered | **Main-process bridge** — workstation main owns the source; renderer subscribes via IPC. **Rejected** — requires `WORKSTATION_CONTRACT.md` IPC amendment (FORBIDDEN frozen surface). **Global module singleton** — module-scope source. **Not recommended** — leaks if not disposed at app shutdown; harder to test. |
| risk if not addressed | Renderer remounts (e.g., HMR, error-boundary recovery) would leak poll timers without `useEffect` cleanup. Mitigated by WB3 dispose probe. |

### Sub-Q-3 — Empty-window rendering

**Question**: Snapshot starts empty; first daemon poll completes 0-3s after mount. What does the indicator show during that window?

| Field | Value |
|---|---|
| disposition | `[SPECULATIVE]` — pending operator ack |
| authoring recommendation | **`snapshot.get(s.name) ?? s.status ?? 'idle'`** — fallback chain: live snapshot > entry's seeded status > `'idle'`. |
| rationale | Preserves any pre-poll seeded status (e.g., from spawn-result envelope plumbing that may seed `'idle'` or `'open'` optimistically — orthogonal flow). Defaults to `'idle'` (grey) when nothing else is known. Matches existing TileHeader behavior. |
| alternates considered | **`'idle'` unconditionally** — discard entry's seeded status. Simpler but less reactive to spawn-result optimistic seeding. **Distinct `'awaiting'` placeholder** — would require touching `tile-grid/types.ts` (FORBIDDEN) + `frame-c/status-color.ts` (READ-ONLY). **Rejected.** |
| risk if not addressed | Indicator shows `'idle'` (grey) for up to 3s after spawn even when daemon already reports `'running'`. Operator-visible latency at session-spawn time. Acceptable for v3.0 ship; optimization tracked at `MB-F-STATUS-SOURCE-SPAWN-EVENT-OPTIMISTIC-WINDOW` Tier 3 (deferred). |

### Sub-Q-4 — `HttpSessionListClient` sharing

**Question**: Does the new source share the existing `HttpSessionListClient` instance used by `session-cap.ts`, or instantiate a separate one?

| Field | Value |
|---|---|
| disposition | `[SPECULATIVE]` — pending operator ack |
| authoring recommendation | **Instantiate separate `HttpSessionListClient`** — fully decoupled from `session-cap.ts` poll loop. |
| rationale | Decouples status-poll cadence (3s default per predecessor ticket) from cap-check cadence (whatever session-cap uses; not modified here). HTTP overhead is negligible (~1 extra request per 3s). Avoids refactor-coupling concerns where any change to one consumer impacts the other. |
| alternates considered | **Share instance, share poll loop** — refactor `session-cap.ts` to broadcast cap-check results to status consumers. Scope creep; predecessor ticket explicitly avoided this. **Share instance, separate poll loops** — both modules call `listSessions()` on the same client object. Acceptable (client is stateless) but no meaningful benefit over (a). |
| risk if not addressed | Two HTTP polls/3s instead of one. At 4-tile cap, total HTTP traffic to daemon is negligible. No functional risk. |

### Sub-Q-5 — Optimistic spawn-event seeding

**Question**: A workstation spawn-result envelope arrives faster than the first daemon poll (up to 3s gap). Should this ticket seed `snapshot[sessionName] = 'idle'` upon spawn-result observation?

| Field | Value |
|---|---|
| disposition | `[SPECULATIVE]` — pending operator ack |
| authoring recommendation | **Defer** — separate filed Tier 3 followup (`MB-F-STATUS-SOURCE-SPAWN-EVENT-OPTIMISTIC-WINDOW`, `docs/FOLLOWUPS.md:362`) closes this. Keep this ticket data-flow-only. |
| rationale | Optimistic seeding is UX-polish-class — current 3s grey-window is informationally accurate (status genuinely unknown until first poll). Scope segregation: this ticket closes the **integration** gap; the **optimistic-window** gap is filed separately. |
| alternates considered | **Include in this ticket** — add `markSpawnResult(sessionName)` adapter or extend parent-closure to subscribe to `workstationBridge.onSpawnResult` and pre-seed. Scope creep; mixes two distinct closure concerns. |
| risk if not addressed | Up to 3s grey-window after spawn even when session is already `'idle'` per daemon. Operator-visible latency tracked at Tier 3 followup; ship-acceptable for v3.0. |

---

## §3 — Bound decisions for Wave 2 impl session

Once §2 dispositions flip to `[KNOWN-OPERATOR-ARBITRATED]`, the Wave 2 impl session manifest is authored using:

- Sub-Q-1 disposition → ladder size + territory expansion per coord doc §2.1 / §2.2 / §2.3.
- Sub-Q-2 disposition → `tile-grid-app.tsx` edit pattern (useState + useEffect lifecycle).
- Sub-Q-3 disposition → snapshot merge expression at JSX call site.
- Sub-Q-4 disposition → `createSessionStatusSource` invocation site (new `HttpSessionListClient` instantiation inline in useEffect).
- Sub-Q-5 disposition → scope segregation (this ticket data-flow-only; spawn-event optimistic in separate followup).

Each WB body's Q1-Q9 self-check cites the binding Sub-Q row by ID (e.g., "Per Sub-Q-1=B at `mb-t-phase-5-tile-header-status-integration-decisions-2026-05-13.md` §2 ack <date>").

---

## §4 — Open arbitration questions NOT yet surfaced

`[SPECULATIVE]` — items potentially needing operator attention at HALT-PRE-WB1 ack time but not catalogued as Sub-Q rows:

- Whether MB-T12 probe-01..04 unit tests need any selector audit even for Path B (data-flow). **Authoring claim** `[MODELED]`: no audit needed; Path B preserves `tile-status-indicator` unkeyed testid exactly. Operator can verify by spot-check.
- Whether the `TileGrid` `sessions` prop's shallow-immutable contract is honored by the merge expression `sessions.map(s => ({ ...s, status: ... }))` — produces a new array of new objects per render. **Authoring claim** `[MODELED]`: yes; React reference-equality semantics tolerate this; performance is negligible at N ≤ 8.
- Whether a `useMemo` is appropriate to memoize the merged array to avoid downstream `<Tile>` re-renders when snapshot is unchanged. **Authoring claim** `[MODELED]`: defer to Wave 2 WB1 impl observation; if React DevTools shows unnecessary `<Tile>` renders, add `useMemo` with `[sessions, snapshot]` deps.

---

## §5 — Confidence summary

All Sub-Q recommendations are `[MODELED]` based on:
- Surface inventory from main-thread reads of `tile-grid.tsx`, `tile-grid-app.tsx`, `tile.tsx`, `tile-header.tsx`, `status-indicator.tsx`, `session-status-source.ts`, `probe-...-02-integration.spec.tsx`.
- Blast-radius analysis comparing Path A/B/C against existing tsconfig.tsx convention + MB-T12 selector contract.
- Predecessor ticket findings + coord doc reads.

Authoring asserts no `[KNOWN]` claims about how the Wave 2 impl will execute — only `[KNOWN]` claims about the current state of READ-ONLY surfaces cited inline with file:line.

---

**End decisions doc.**
