# WEB-T decomposition — Phase Y.2 (Session B territory)

- **Status:** Pending operator ack (pre-reg gate 3)
- **Date:** 2026-04-23
- **Session:** B (UI)
- **Frozen inputs:**
  - `CONDUCTOR_API_CONTRACT.md` v2.0.0 (commit `3ddca60`)
  - `packages/dispatch-core/src/v2/schema.ts` (commit `551c469`)
  - UI-S01 ADR: `docs/adr/UI-S01-websocket-client.md`
  - UI-S02 ADR: `docs/adr/UI-S02-menubar-framework.md`
  - UI-S03 ADR: `docs/adr/UI-S03-notification-click.md`
  - UI-S04 ADR: `docs/adr/UI-S04-clipboard.md`
  - GAP-1..GAP-6 arbitrated resolutions (in-conversation; reflected in
    the schema + this doc where load-bearing)
  - DAEMON-S03 coordination (`notifications_available` flag on
    `/v2/health`; in-banner fallback requirements)

---

## 1. Component hierarchy

```
<App>
├── <ConnectionStatusBanner>         — top-of-viewport; surfaces
│                                      UI-S01 client status
│                                      (daemon_down | auth_failed)
├── <InBannerHost>                   — overlay region for toasts +
│                                      sticky alerts per
│                                      DAEMON-S03 rules (T21)
├── <AuthBootstrap>                  — gates the rest of the app
│                                      until token + preflight pass
│                                      (T02)
└── <Dashboard>
    ├── <KanbanPanel>                (T09)
    │   └── <KanbanColumn> × 4       — idle | running |
    │       │                          awaiting_review | stale;
    │       │                          sort priority from v1
    │       │                          (awaiting_review > stale >
    │       │                          running > idle)
    │       └── <SessionCard>         (T10)
    │           └── click → update
    │               location.hash + Zustand focused (T11)
    ├── <FocusedDetailPanel>          (T12)
    │   ├── <StateBadge> + <ComputedStatusBadge>
    │   ├── <LastCommitSummary>       — sha + subject via GAP-2
    │   │                              client-side reduce
    │   ├── <StatusJsonSummary>       — tests_passing/failing/phase
    │   │                              when present (contract §8.2)
    │   ├── <StateControlCluster>     (T13)
    │   ├── <SendButton> ──► <SendModal>          (T14 / T15)
    │   └── <PullButton>              (T16)
    ├── <TickerPanel>                 (T17)
    │   ├── <TickerFilters>           (T19)
    │   └── <TickerRow> × N           (T18 / T20)
    └── <ArchiveToggle>               (T22)

Global modals (portal-rendered):
├── <SendModal>                       (T15)
└── <KillConfirmModal>                (folded into T13)
```

### Component boundaries explained

- `<ConnectionStatusBanner>` is always visible when client status
  isn't `connected`. Rendered regardless of auth/daemon state so the
  operator always sees why things look frozen.
- `<InBannerHost>` is a singleton region that renders 0-N toasts +
  0-N sticky alerts. Decides auto-dismiss vs sticky per the
  DAEMON-S03 rules (T21's core responsibility).
- `<AuthBootstrap>` reads token from `~/.foxworks-dispatch/token`
  (contract §3.2), runs UI-S01 preflight (`/v2/health` then
  `/v2/events?since=0` with token), and mounts `<Dashboard>` on
  success. On `auth_failed`, shows a reauth modal (see T02).
- `<Dashboard>` does not mount until auth succeeds the first time;
  survives subsequent `daemon_down` transitions without unmounting
  (queries retry via TanStack Query + UI-S01's reconnect).

---

## 2. State management approach

### 2.1 Boundary: TanStack Query vs Zustand

**TanStack Query** owns daemon HTTP state (queries + mutations).
**Zustand** owns local UI state (focus, modals, visibility toggles,
connection status, GAP-2 commit-subject reduce). Shape below.

### 2.2 TanStack Query keys + invalidation

| Key | Fetch | Invalidation triggers |
|---|---|---|
| `['health']` | `GET /v2/health` | periodic refetch (every 30 s) |
| `['sessions']` | `GET /v2/sessions` | WS `state_changed`, `handoff_written`, `prompt_sent`, `test_status_updated` |
| `['session', name]` | `GET /v2/sessions/:name` | WS events for that session (same list) |
| `['events', since]` | `GET /v2/events?since=` | manual (ticker backfill) |

Mutations (auto-invalidate affected keys):

- `patchSessionState({name, state})` → `PATCH /v2/sessions/:name/state`
- `postPrompt({name, prompt})` → `POST /v2/sessions/:name/prompts`
- `getHandoff({name})` → `GET /v2/sessions/:name/handoff`

### 2.3 Zustand store shape

```ts
interface UIState {
  // Focus
  focusedSessionName: string | null;      // reflects location.hash

  // Modal visibility
  sendModalOpen: boolean;
  killConfirmOpen: boolean;
  killConfirmTarget: string | null;

  // Archive / filter toggles (GAP-1: UI hides killed by default)
  showArchived: boolean;

  // UI-S01 client status (propagated from the WS client hook)
  connectionStatus: 'connecting' | 'connected' | 'daemon_down' | 'auth_failed';

  // GAP-2 commit-subject map (client-side reduce)
  commitBySession: Record<string, {
    sha: string;
    subject: string;
    branch: string;
    at: string;
  }>;

  // In-banner queue state (T21 consumes)
  banners: Array<{
    id: string;
    kind: 'toast' | 'sticky';
    severity: 'info' | 'warn' | 'error';
    title: string;
    body?: string;
    createdAt: number;
  }>;

  // actions...
  setFocus: (name: string | null) => void;
  openSendModal: () => void;
  closeSendModal: () => void;
  openKillConfirm: (target: string) => void;
  closeKillConfirm: () => void;
  toggleArchive: () => void;
  setConnectionStatus: (s: UIState['connectionStatus']) => void;
  applyCommitEvent: (e: CommitLandedEvent) => void;
  pushBanner: (b: Omit<UIState['banners'][number], 'id' | 'createdAt'>) => void;
  dismissBanner: (id: string) => void;
}
```

Rationale for combining these into one store instead of slicing: the
store is small (~10 fields), all fields are UI-local, and the GAP-2
reducer + banners need to coordinate with each other (e.g., a
`cairn_violation_detected` event both queues a sticky banner and
invalidates session detail). One store is simpler than cross-slice
subscriptions.

### 2.4 WebSocket subscription hook

`useDaemonEvents()` is the single top-level hook wrapping the UI-S01
client (algorithm from `docs/adr/UI-S01-websocket-client.md`). Its
responsibilities:

1. Manage the SpikeClient → production-client instance (singleton per
   app; WEB-T03 ports the algorithm from the spike).
2. On each event:
   - Invalidate TanStack Query keys per the table in §2.2
   - Call Zustand actions for GAP-2 reduce, banner queue, etc.
3. Expose client status via Zustand's `connectionStatus`.

Consumers (most components) use TanStack Query hooks + selected
Zustand slices; they do NOT import the client directly.

### 2.5 GAP-2 commit-subject reduce

On bootstrap after preflight succeeds, fetch `GET /v2/events?since=0`
with a filter-down to `commit_landed` events, reduce into
`commitBySession`. Thereafter maintained by WS events in
`useDaemonEvents`. Retention: only the *latest* commit per session is
kept (bounded memory; older commits are in the daemon's event log
but unused by the UI).

### 2.6 In-banner rules (from DAEMON-S03)

```
event                         | notifications_available=true       | notifications_available=false
handoff_written               | no banner (native fired)            | toast (auto-dismiss, 5s)
cairn_violation_detected      | sticky banner (defense in depth)    | sticky banner
gate_trip                     | sticky banner                       | sticky banner
state_changed                 | none (kanban updates)               | none
prompt_sent                   | none (ticker only)                  | none
test_status_updated           | none (focused detail only)          | none
commit_landed                 | none (ticker only)                  | none
```

Sticky banners must be explicitly dismissed by the operator.

---

## 3. Routing approach

**Decision: single-page app with URL fragment routing.**

- `#` (empty) → no focused session
- `#session=<name>` → focused session `<name>`

Web UI listens to `hashchange` event; Zustand `setFocus` updates
hash + state together. MB-T07 (menu bar notification click) uses
`open http://localhost:7878#session=<name>` to both focus the browser
tab AND set the web UI focus. Fragment is client-only — daemon
serves the same `index.html` regardless of fragment; no server-side
routing needed.

Rationale for fragment over query param:
- Fragment survives service-worker caching + URL rewrites.
- Fragment is explicit about "this URL points to the same page, just
  a different focus" — matches single-page semantics.
- Back/forward buttons work via native browser.

Rationale over path-based routing (`/sessions/:name`):
- Avoids adding a router library (react-router ~50 KB).
- Avoids server-side coordination for client routes (daemon would
  otherwise need to serve `index.html` for any path).
- Single-route semantically — there's one dashboard, one focused
  session at a time.

**Tradeoff:** URL is less pretty; `/sessions/sherpa` reads better
than `#session=sherpa`. Accepted cost for solo-operator scope.

---

## 4. Test approach

### 4.1 Boundaries

| Boundary | Tool | Examples |
|---|---|---|
| Pure utilities | vitest | dedupe-key builder, hashParseSession, event reducer |
| Component logic | vitest + react-testing-library + happy-dom | KanbanColumn renders cards grouped by computed_status; SendModal disables submit while pending |
| Hook behavior | vitest + renderHook | useDaemonEvents dispatches invalidation correctly; Zustand reducer pure tests |
| Integration | vitest + MSW | HTTP client against mocked `/v2/sessions`, WS against mocked ws server (same pattern as UI-S01 spike fixture, promoted) |
| E2E | **Deferred to Round 2 zipper session** | live daemon + real browser; per session prompt §12 |

### 4.2 TDD discipline

Per session prompt §2 (TDD literal): every WEB-T ships as a
red-then-green commit pair. Ticket scope is the unit of red/green, not
the feature. For example, WEB-T09 (kanban columns) ships:

1. `test(WEB-T09): red — 4 tests for column grouping + sort priority`
2. `feat(WEB-T09): green — KanbanPanel component`

Pure-logic tickets (T04, T05) get more tests than view tickets (T07,
T08, T20) where rendering is the value.

### 4.3 What we will NOT unit-test

- Real daemon HTTP (that's integration territory; MSW mocks the
  response shapes matching v2 Zod schemas)
- Real browser WebSocket (same; MSW-ws or a throwaway ws fixture
  like UI-S01's)
- Visual pixel-perfect rendering (a design review + screenshots
  replace pixel testing; kept out of automated suite)
- macOS-specific behaviors (notifications, clipboard native paths —
  those are MB/UI-S territory, not web UI)

### 4.4 43-test preservation

Per contract §7.4 + session prompt §10: fd v1's 43 tests must
continue to pass through Phase Y. Current count: 43 green (core 23,
cli 20). Every WEB-T commit re-runs `pnpm test` and surfaces if the
count changes. Dispatch-web's own new tests add to this baseline;
failures of existing tests halt the ticket.

---

## 5. Ticket list (WEB-T01 → WEB-T22)

Each ticket below: scope, acceptance criteria, dependencies,
followups. Order within a cluster is execution order (T01 before T02
etc.). Clusters can overlap if dependencies allow.

### W-1 Foundation (5 tickets)

#### WEB-T01 — Vite + React + TS scaffold

- **Scope:** Replace `packages/dispatch-web/` minimal-scaffold (the
  UI-S01 spike shell) with a production scaffold: Vite 5, React 19,
  TypeScript, `workspace:*` dep on `dispatch-core` for v2 schemas.
  Add dev script. Decide dev-server origin (`http://localhost:5173`
  default) and surface it to Session A for CORS allowlist.
- **Acceptance:**
  - `pnpm --filter dispatch-web dev` opens dev server, shows "Hello
    Conductor" page
  - `pnpm --filter dispatch-web build` emits static assets to
    `packages/dispatch-web/dist/`
  - `pnpm typecheck` + `pnpm test` green
  - `import { StateEnum } from 'dispatch-core/v2/schema'` resolves
    via workspace dep (no relative paths)
  - Cross-session coordination note filed: "Session B dev origin =
    http://localhost:5173; Session A daemon CORS allowlist must
    include this origin."
- **Deps:** none (this is the entry)
- **External:** Vite, React, @vitejs/plugin-react, dispatch-core
  workspace
- **Followups:** none (CORS coordination handled at ticket time)

#### WEB-T02 — HTTP client wrapper + auth bootstrap

- **Scope:** Fetch wrapper that injects `X-Conductor-Token` header
  from `~/.foxworks-dispatch/token` (read via a small HTTP endpoint
  the daemon should expose, OR via Electron preload if served from
  Electron, OR via a `<meta>` tag the daemon injects into `index.html`
  — pick one at ticket time). `<AuthBootstrap>` component that runs
  the UI-S01 preflight sequence (health → events-with-token) and
  routes to `<Dashboard>` on success or `<ReauthPrompt>` on
  `auth_failed`.
- **Acceptance:**
  - Token read path works (tested with MSW fixture serving mock
    token endpoint OR meta tag injection documented)
  - Preflight sequence matches UI-S01 ADR (health 200, events 200 →
    proceed; health fail → daemon_down state; events 401 →
    auth_failed)
  - `auth_failed` shows reauth UI with "Paste new token" input
  - `daemon_down` shows ConnectionStatusBanner + continues retry
    per UI-S01 backoff
  - Tests: preflight happy path, token-missing error, token-invalid
    401, health-fail daemon-down
- **Deps:** WEB-T01
- **External:** contract §3 (auth), §4.1 (health), §4.5 (events);
  UI-S01 ADR
- **Followups:** UI-F04 (token rotation mid-stream — post-MVP)

#### WEB-T03 — WebSocket client (production of UI-S01 algorithm)

- **Scope:** Port the UI-S01 spike client algorithm to production.
  Replace `ws` Node lib with browser `WebSocket`. Same preflight +
  gap-fill + compound backoff + dedupe. Expose `useDaemonEvents()`
  hook wiring into Zustand + TanStack Query invalidation.
- **Acceptance:**
  - Component tests using MSW-ws verify reconnect, dedupe, gap-fill
    paths (mirroring UI-S01 spike scenarios S1/S2/S5)
  - Backoff numbers match ADR: 1000 ms / 2× / 30000 ms / ±25%
  - `connectionStatus` in Zustand transitions through
    `connecting → connected → (daemon_down | auth_failed)` per UI-S01
  - Integration test: real throwaway ws server fixture (promoted
    from UI-S01 spike) verifies end-to-end gap-fill
- **Deps:** WEB-T01, WEB-T02, WEB-T05 (Zustand), WEB-T04 (Query
  invalidation)
- **External:** contract §5; UI-S01 ADR
- **Followups:** UI-F02 (real-browser backgrounded-tab verification)

#### WEB-T04 — TanStack Query setup + base hooks

- **Scope:** QueryClient provider; base hooks for all contract
  endpoints (`useHealth`, `useSessions`, `useSession`, `useEvents`).
  Mutations: `usePatchState`, `usePostPrompt`, `useGetHandoff`.
- **Acceptance:**
  - Each hook tested with MSW fixture returning v2 Zod-validated
    response
  - Response shapes validated against
    `packages/dispatch-core/src/v2/schema.ts` at runtime (dev-only
    assertion; prod can skip)
  - Query keys follow §2.2 table
  - Mutations return typed results
- **Deps:** WEB-T01
- **External:** contract §4; v2 schema
- **Followups:** UI-F03 (batching if throughput requires)

#### WEB-T05 — Zustand store

- **Scope:** Single store with the shape in §2.3. Actions implemented
  as pure reducers for test-ability.
- **Acceptance:**
  - Each action has ≥1 unit test (pure reducer tests)
  - GAP-2 `applyCommitEvent` maintains latest-per-session invariant
  - `setFocus` syncs `location.hash` (mockable for tests)
  - `pushBanner` + `dismissBanner` maintain banner queue ordering
- **Deps:** WEB-T01
- **External:** none beyond zustand
- **Followups:** none

### W-2 Layout (3 tickets)

#### WEB-T06 — Main layout scaffold

- **Scope:** CSS grid layout (kanban top-left, focused-detail
  top-right, ticker bottom, full width). Responsive breakpoints
  (desktop-only for v2 MVP; narrower viewport collapses to stacked).
  `<ConnectionStatusBanner>` + `<InBannerHost>` slots reserved but
  empty until T21 lands.
- **Acceptance:**
  - Layout renders at 1280×800 (operator's laptop size) with kanban
    ~60% width, focused-detail ~40%, ticker ~160px tall bottom strip
  - Resize to 800×600 stacks panels vertically
  - Empty slots don't shift layout when populated
- **Deps:** WEB-T01, WEB-T07
- **External:** Tailwind CSS grid
- **Followups:** none

#### WEB-T07 — Tailwind config + design tokens

- **Scope:** Install Tailwind 4.x, configure JIT, author design
  tokens matching v1 TUI color semantics:
  - `--color-awaiting-review: yellow` (operator action needed)
  - `--color-stale: red` (operator nudge-or-kill decision)
  - `--color-running: cyan` (in-flight, no action)
  - `--color-idle: gray` (cold)
  - `--color-accent: foxworks brand` (TBD at ticket time; consult
    Automata-chat design if applicable)
- **Acceptance:**
  - Tokens available as Tailwind classes (`bg-status-stale`, etc.)
  - Dark + light modes both have legible contrast (WCAG AA minimum)
  - v1 TUI `status.tsx:32-43` color mapping preserved
- **Deps:** WEB-T01
- **External:** Tailwind
- **Followups:** none

#### WEB-T08 — Dark/light mode toggle

- **Scope:** `prefers-color-scheme` media query detection + manual
  override (button in a corner). Persisted in localStorage.
- **Acceptance:**
  - Switches correctly on macOS dark-mode system toggle
  - Manual override persists across reloads
  - Tokens in T07 render correctly in both modes
- **Deps:** WEB-T07
- **Status note:** this ticket is **deferrable** to followup
  (UI-F12) if scope pressure arrives. v2 MVP can ship with
  system-theme-only support.

### W-3 Kanban (3 tickets)

#### WEB-T09 — KanbanPanel + 4 columns

- **Scope:** 4 columns (awaiting_review, stale, running, idle) with
  v1 sort priority preserved. Grouping reads `computed_status` per
  GAP-3. Killed sessions filtered out by default per GAP-1 (visible
  when `showArchived` is true).
- **Acceptance:**
  - Sessions grouped into correct columns per `computed_status`
  - Sort priority matches v1 (`awaiting_review(0) > stale(1) >
    running(2) > idle(3)`)
  - Archive toggle reveals/hides killed sessions (but killed have
    no computed_status match — shown as 5th "Archived" column when
    toggle on? or mixed into idle? decided at ticket time)
  - Empty columns show placeholder "No X sessions"
- **Deps:** WEB-T04, WEB-T05, WEB-T07
- **External:** contract §4.2; v2 schema `SessionsListResponse`
- **Followups:** T22 archive toggle design

#### WEB-T10 — SessionCard minimal view

- **Scope:** Card component rendering name, state badge,
  computed_status color accent, last action age, tmux target
  (dimmed).
- **Acceptance:**
  - Renders all fields from `SessionResponseV2`
  - State badge uses T07 tokens for color
  - Card is keyboard-focusable (tab order correct)
  - Click → updates `location.hash` + Zustand focused (via T11's hook)
- **Deps:** WEB-T04, WEB-T07
- **External:** v2 schema `SessionResponseV2`
- **Followups:** none

#### WEB-T11 — Card focus interaction

- **Scope:** `useFocusFromHash()` hook wires `hashchange` ↔ Zustand.
  SessionCard consumes `useSetFocus()` on click.
- **Acceptance:**
  - Clicking a card updates URL hash AND Zustand state
  - Navigating to `#session=sherpa` directly focuses that card
  - Back button navigates focus history
  - MB-T07 integration note: menu bar's `open <URL>#session=<name>`
    invocation focuses the correct card (verified in MB-T07
    integration, not WEB-T11 unit)
- **Deps:** WEB-T05, WEB-T10
- **External:** browser History API
- **Followups:** UI-F10 (MB-T07 integration test upgrades URL-fragment
  targeting MODELED → KNOWN)

### W-4 Focused detail + actions (5 tickets)

#### WEB-T12 — FocusedDetailPanel

- **Scope:** Right-side panel rendering focused session's details:
  state + computed_status badges, last commit (sha + subject from
  GAP-2 map), last action timestamp, tests passing/failing from
  `status_json` (contract §8.2) when present (fallback to "—"),
  phase from `status_json.phase` when present.
- **Acceptance:**
  - All fields render from typed Session + StatusJson shapes
  - When `status_json` is absent: tests + phase show "—", not error
  - Last commit sha+subject rendered from Zustand
    `commitBySession[focused]` (GAP-2 reduce result); fallback to
    session.last_commit_sha alone if no subject reduced yet
  - No panel if no focus (placeholder text "Click a session card")
- **Deps:** WEB-T04, WEB-T05, WEB-T10
- **External:** contract §4.2, §8.2; v2 schema `StatusJsonSchema`
- **Followups:** none

#### WEB-T13 — StateControlCluster + KillConfirmModal

- **Scope:** Buttons for armed/paused/held/killed state transitions.
  Invalid transitions (per contract §6.1) are disabled. Kill button
  opens `<KillConfirmModal>` ("Kill session <name>? This is
  terminal — you'll need `fd init` to create a new session with the
  same name."). Confirmed kill → PATCH state=killed. Per GAP-5,
  menu-bar's multi-session kill lives in MB-T06; WEB-T13 handles
  single-session only.
- **Acceptance:**
  - All 4 buttons render; disabled per valid transitions from current
    state (§6.1)
  - Click → mutation → 200 OK refreshes session; 422 shows error
    toast "Invalid transition"
  - Kill requires confirmation modal; modal blocks submit while
    mutation pending
  - Test: each valid transition (8 total per §6.1) fires correct
    PATCH; each invalid transition is disabled
- **Deps:** WEB-T04, WEB-T05, WEB-T10, WEB-T12
- **External:** contract §4.3, §6.1; v2 schema `PatchStateRequest`
- **Followups:** GAP-5 menu-bar kill-switch is MB-T06, not here

#### WEB-T14 — SendButton

- **Scope:** Button that opens `<SendModal>`. Disabled if session is
  not in `armed` state (contract §4.4 says POST /v2/sessions/:name/
  prompts returns 422 for non-armed).
- **Acceptance:**
  - Disabled states correct per session.state
  - Click opens modal (Zustand openSendModal)
- **Deps:** WEB-T05, WEB-T15
- **External:** contract §4.4
- **Followups:** none

#### WEB-T15 — SendModal

- **Scope:** Modal with textarea (prompt body), session name display
  (read from focused session), Cancel + Send buttons. Send invokes
  `postPrompt` mutation. On 200: closes modal, shows toast "Prompt
  sent to <name>". On 422: stays open, shows inline error. On network
  failure: shows retry/cancel option.
- **Acceptance:**
  - Modal opens/closes from Zustand flag
  - Empty prompt body disables Send
  - Submit fires mutation; pending state disables Send
  - 422 surfaces body error; 2xx closes modal
  - Escape key closes modal; Cancel button same
- **Deps:** WEB-T04, WEB-T05, WEB-T14
- **External:** contract §4.4; v2 schema `SendPromptRequest`
- **Followups:** none

#### WEB-T16 — PullButton + clipboard

- **Scope:** Button that invokes `getHandoff` mutation, receives
  `{content, written_at, archived_to}`, writes `content` to
  clipboard via `navigator.clipboard.writeText`. On success: fires
  banner toast `"Copied handoff for <session>"` (UI-S04 FM2
  mitigation). On clipboard-gesture failure: shows `<CopyFallbackModal>`
  with pre-selected text + manual "Copy" button (UI-S04 FM3
  mitigation). On 404 (no handoff): toast "No handoff written yet".
- **Acceptance:**
  - Successful pull writes clipboard + fires toast
  - 404 shows appropriate message
  - Clipboard rejection opens fallback modal with content pre-
    selected
  - Test: mock `navigator.clipboard.writeText` success + reject
    paths
- **Deps:** WEB-T04, WEB-T05, WEB-T12
- **External:** contract §4.4; UI-S04 ADR FM2/FM3
- **Followups:** UI-F05 (Linux clipboard parity if Linux enters
  scope)

### W-5 Ticker + in-banner (5 tickets, including new T21)

#### WEB-T17 — TickerPanel layout

- **Scope:** Full-width bottom strip, fixed height (~160px), scrolling
  vertically (newest at top), renders `<TickerRow>` for each event.
- **Acceptance:**
  - Renders fixed-height strip
  - Scrollable when >visible rows
  - New events appear at top with brief highlight (T20 polish)
  - No layout shift on event arrival
- **Deps:** WEB-T06
- **External:** none
- **Followups:** none

#### WEB-T18 — Ticker subscription + bounded history

- **Scope:** On mount, fetch `GET /v2/events?since=0&limit=100` for
  backfill, apply to local ring buffer. Subscribe to WS events via
  `useDaemonEvents()`. Maintain bounded window (last 100 events).
  Handle `notifications_available` flag for T21 deciding banner
  behavior.
- **Acceptance:**
  - Mount fetches backfill + renders
  - WS events append to ring buffer, oldest dropped past 100
  - `notifications_available` flag flows to `<InBannerHost>` via
    Zustand
- **Deps:** WEB-T03, WEB-T04, WEB-T05, WEB-T17
- **External:** contract §4.5, §5; DAEMON-S03 coordination
- **Followups:** UI-F03 (batching if throughput exceeds)

#### WEB-T19 — Ticker filters

- **Scope:** Two dropdowns: filter by session (populated from
  sessions list), filter by event type (§5.3 seven types). Multi-
  select or single? Single for MVP. Clear filter button.
- **Acceptance:**
  - Filter applies client-side (no refetch)
  - Cleared filters show all 100
  - URL hash can include filter state? — deferred; filter is
    ephemeral for MVP
- **Deps:** WEB-T18
- **External:** v2 schema `EventV2`
- **Followups:** none

#### WEB-T20 — Ticker visual polish

- **Scope:** Per-event-type color coding (matching T07 tokens where
  applicable: `state_changed` → computed_status color; `commit_landed`
  → neutral; `cairn_violation_detected` → red; etc.). Event type
  icon. Human-readable timestamps (relative: "3m ago"). Session-name
  links focus the card (hash update).
- **Acceptance:**
  - Each event type has distinct visual affordance
  - Clicking session name in ticker focuses that card
  - Timestamp refreshes every ~30s (not every second — perf)
- **Deps:** WEB-T17, WEB-T18, WEB-T19
- **External:** none
- **Followups:** none

#### WEB-T21 — InBannerHost + banner rules (NEW per DAEMON-S03)

- **Scope:** Overlay region rendering 0-N toasts (auto-dismiss after
  5s) and 0-N sticky alerts (manually dismissed). Consumes
  `UIState.banners` + `useDaemonEvents()` output per the §2.6 rules
  table. Toasts stack vertically, sticky alerts above them.
- **Acceptance:**
  - `handoff_written` with `notifications_available=false` fires
    auto-dismiss toast; with `true` fires nothing
  - `cairn_violation_detected` fires sticky regardless of flag
  - `gate_trip` fires sticky regardless of flag
  - Sticky alerts require explicit dismiss
  - Tests: rule table covered exhaustively
- **Deps:** WEB-T03, WEB-T05, WEB-T18
- **External:** contract §5.3; DAEMON-S03 coordination
- **Followups:** none (this ticket closes the DAEMON-S03 loop on
  Session B side)

### Supporting (1 ticket)

#### WEB-T22 — ArchiveToggle (GAP-1 per-session-list filter)

- **Scope:** Small toggle/checkbox near the kanban header: "Show
  archived sessions". When off (default), killed sessions hidden
  from kanban. When on, killed sessions appear in a 5th column
  "Archived" OR inline in their nominal computed_status column
  (decided at ticket time — either works; 5th column is clearer).
- **Acceptance:**
  - Toggle state in Zustand (`showArchived`)
  - Kanban grouping logic respects flag
  - Persisted in localStorage (operator preference)
- **Deps:** WEB-T05, WEB-T09
- **External:** GAP-1 arbitration
- **Followups:** none

---

## 6. Cross-session coordination

| Coordination | Consumed in | Produced by | Notes |
|---|---|---|---|
| CORS allowlist | Session A (DAEMON-T0x) | WEB-T01 | WEB-T01 commit body names the dev origin (`http://localhost:5173`); Session A's HTTP server ticket reads + allows |
| `notifications_available` flag | WEB-T18, WEB-T21 | Session A DAEMON-S03 + `/v2/health` contract | Flag defaults false until Session A proves otherwise; T21 rules are correct in both states |
| UI-S01 preflight pattern | WEB-T02, WEB-T03 | UI-S01 ADR (Session B, already landed) | Spike client → production client, same algorithm |
| UI-S04 clipboard FM2 toast | WEB-T16 | UI-S04 ADR (Session B, already landed) | Operator-visible feedback on every web-UI clipboard write |
| Token storage path | WEB-T02 | Session A daemon (token file) + contract §3.2 | Web UI must read `~/.foxworks-dispatch/token`; how it reaches browser JS is WEB-T02's design decision (meta-tag injection, dedicated endpoint, or Electron preload) |
| WS URL convention | WEB-T03, MB-T xx | Contract §5.1 | `ws://localhost:7878/v2/events/stream?token=<t>` |
| URL-fragment routing | WEB-T11, MB-T07 | This doc | `#session=<name>` agreed; MB-T07 uses `open <URL>#session=<name>` |
| v2 Zod schemas | WEB-T02, T04, T09, T12, T13, T15, T21 | `packages/dispatch-core/src/v2/schema.ts` (operator-frozen at `551c469`) | Runtime validation in dev, type flow in prod |

---

## 7. Followup anticipation (maintained live as WEB-T ships)

**Active:**
- UI-F02 — real-browser tab-suspension lifecycle (WEB-T03 integration)
- UI-F03 — event batching if throughput requires (post-MVP tune)
- UI-F04 — token rotation mid-stream handling (post-MVP)
- UI-F05 — Linux clipboard parity (deferred; Linux not in v2)
- UI-F10 — MB-T07 integration for URL-fragment focusing
- UI-F12 — dark/light mode manual toggle (if WEB-T08 deferred)

**Closed by this doc:**
- UI-F06 — MB-T01 scaffold; activates after WEB-T01 (Electron
  scaffold follows same Vite-less pattern separately in MB-T01)
- UI-F07 — UI-S03 already landed; no longer "blocked"

**Deprecated:**
- UI-F08, UI-F09 — Tauri/Swift paths (Electron chosen)

---

## 8. Not in WEB-T scope (explicit scope fence)

- `fd v1` backward-compat rerouting (`fd init/list/send/pull/status`
  now via daemon) — Session A territory, DAEMON-T14/T15
- Menu bar tickets MB-T01..T07 — surfaced separately per session
  prompt
- CLI enhancement tickets CLI-T01..T03 — surfaced separately
- Daemon HTTP server / WS endpoint implementation — Session A's
  Phase 2
- Contract modifications — operator-arbitrated only
- E2E browser automation — Round 2 zipper session
- Multi-operator / cloud sync / LLM calls — contract §9 out of scope
- launchd integration — Session A DAEMON-T13

---

## 9. Self-check (pre-reg gate 3)

Per contract §10.5, answering for this decomposition doc:

1. Is the API I called verified by a spike in this repo? **n/a** — this
   is decomposition, not implementation. Each WEB-T will answer this
   per-commit.
2. Does my test exercise behavior, or my mocks? **n/a** (no tests
   this commit).
3. If implementation deleted, would test still pass? **n/a**.
4. Did I add anything outside the contract's specification? **no** —
   every API reference cites a contract section; GAP resolutions are
   captured from operator-arbitrated decisions.
5. Did I modify the contract? **no**.
6. Is any claim in my commit body unlabeled? No — findings map to
   spike ADRs; design decisions cite contract or GAP arbitrations.
7. Did this touch any file Session A might also modify? **no** — this
   is `packages/dispatch-web/TICKETS.md` plus the commit body. No
   other files.
8. Direct registry write bypassing PATCH? **n/a**.
9. Work during halt? **no** — proceeded only after operator's explicit
   resumption signal.

Session B prompt item 8: n/a for decomposition; applies per-ticket at
WEB-T execution time.

---

## 10. What I need from you (pre-reg gate 3)

- **Ack the decomposition as-is,** or
- **Reshape specific tickets or the overall structure.** Common
  reshape candidates:
  - Collapse T08 (dark/light toggle) entirely into followup
  - Split T15 (SendModal) if it grows beyond ~150 LOC
  - Move T22 (ArchiveToggle) inline into T09
  - Renumber or recluster if the 5 clusters don't match your Phase Y
    structure doc

On ack: I proceed to WEB-T01 red-then-green. WEB-T01 is its own
pre-reg cycle per §3.2 discipline — small per-ticket surface before
starting, then red/green pair, then commit/push/halt.
