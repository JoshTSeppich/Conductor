# MB-T15 Phase 1 — Diagnose / Surface Inventory

**Ticket:** MB-T15 — Tile-header chrome
**Spec source-of-truth (per operator brief):** `docs/build-docs/wireframe-tickets-inventory.md` §3 MB-T15 entry
**Integration baseline:** `docs/coordination/mb-t12-architecture-flow.md` (WB14, `a4f4ea9`)
**Phase:** Phase 1 only — surface read + arbitration questions. NO production
edits, NO implementation commits, NO tests run.

Confidence labels appended per CLAUDE.md §2.2: `[KNOWN]`, `[MODELED]`,
`[SPECULATIVE]`.

---

## ⚠️ Source-of-truth gap

The operator-named spec file `docs/build-docs/wireframe-tickets-inventory.md`
**does not exist in the repo tree** [KNOWN]:
```sh
ls docs/build-docs/wireframe-tickets-inventory.md
→ No such file or directory
```
CLAUDE.md §5.3 states:
> Inventory at `/mnt/user-data/outputs/wireframe-tickets-inventory.md`
> (operator-side). 21 tickets across 3 families.
> Family A — Tile chrome (MB-T15 header, T16 picker, T17 autopilot toggle,
> T18 footer, T19 hero+squad)

So the inventory is operator-filesystem-side, not committed. Phase 1
proceeds with the **operator brief in this turn as the inline source-of-
truth** for MB-T15 scope + acceptance, and surfaces specific questions
(§IV) where the inventory's `§3 MB-T15 entry` would clarify.

---

## I. Surface inventory (anti-fabrication, file:line + responsibility)

### A — Tile.tsx (the surface MB-T15 modifies)

`packages/dispatch-workstation/src/tile-grid/tile.tsx:34` [KNOWN]
- `TileStatus = 'idle' | 'open' | 'killed' | 'detached'` — 4 values.

`packages/dispatch-workstation/src/tile-grid/tile.tsx:36-49` [KNOWN]
- `TileProps`: sessionName, consoleBridge, createTerminal, collapsed,
  status?, onKill, onCollapse, onDetach, onSwapDragStart?, onSwapDrop?.
- **NO branchName, NO repoName, NO model, NO tokensUsed, NO tokenBudget
  fields.** All MB-T15 visual data fields are NEW additions to TileProps.

`packages/dispatch-workstation/src/tile-grid/tile.tsx:96-135` [KNOWN]
- Current header DOM:
  - `<div data-testid="tile-header">` wrapper with onMouseDown/onMouseUp
    for drag-swap (WB8); skips interactive targets.
  - `<span data-testid="tile-status-indicator" data-status={status} />` (line 107)
  - `<span data-testid="tile-session-name">{sessionName}</span>` (line 108)
  - `<div data-slot="picker" data-testid="tile-picker-slot-X" />` (line 109)
  - `<div data-slot="autopilot" data-testid="tile-autopilot-slot-X" />` (line 110)
  - `<button data-testid="tile-collapse-btn">Collapse|Expand</button>`
  - `<button data-testid="tile-detach-btn">Detach</button>`
  - `<button data-testid="tile-kill-btn">Kill</button>`
- Brief says MB-T15 chrome lives "below the drag-grip" — the drag-grip
  IS the header div itself (mousedown there starts a swap). MB-T15 must
  decide where the new chrome (status dot, session name, branch, repo,
  model chip, token meter) goes relative to existing buttons + slots.

`packages/dispatch-workstation/src/tile-grid/tile.tsx:53-61` [KNOWN]
- `isInteractiveTarget(target)`: checks for closest button/input/select
  /textarea. Used by drag-swap mousedown/mouseup + collapsed-tile click.
  MB-T15's new tile-header.tsx must not insert button/input elements
  that would unintentionally block drag-swap; OR if it does, document
  the interaction.

### B — TileGridSessionEntry (data flow into Tile)

`packages/dispatch-workstation/src/tile-grid/tile-grid.tsx:25-29` [KNOWN]
```ts
export interface TileGridSessionEntry {
  readonly name: string;
  readonly status?: TileStatus;
  readonly collapsed?: boolean;
}
```
- This is the parent-managed session record that flows down into Tile.
- MB-T15's new fields (branchName, repoName, model, tokens) need to be
  ADDED here so TileGridApp can plumb them through.

`packages/dispatch-workstation/src/tile-grid/tile-grid-app.tsx:49,93` [KNOWN]
- `initialSessions?: readonly TileGridSessionEntry[]` (seed from parent)
- `useState<readonly TileGridSessionEntry[]>` (in-memory session list)
- WB9's `handleSpawnResult` only knows `sessionName` from the spawn-
  result payload — branch/repo/model are NOT in the spawn-result envelope.
  MB-T15 needs a separate data-fetch path OR has to pass these through
  the spawn flow.

### C — Existing tile.tsx tests (regression-risk surfaces)

`packages/dispatch-workstation/test/unit/tile-grid-tile/` [KNOWN]:
- `probe-01-tile-skeleton-and-handlers.spec.tsx` — 21 tests (WB5).
  Asserts tile-header, tile-status-indicator, tile-session-name,
  picker/autopilot/footer slot rendering + click handlers.
- `probe-02-swap-drag-callbacks.spec.tsx` — 9 tests (WB8). Asserts
  header onMouseDown/onMouseUp filter behavior.
- `probe-03-collapse-expand.spec.tsx` — 14 tests (WB10). Asserts
  collapsed inline style + click-to-expand.
- `probe-04-detached-placeholder.spec.tsx` — 10 tests (WB11a). Asserts
  status='detached' renders placeholder.

**Regression risks for MB-T15:**
- Adding new DOM elements between status-indicator and session-name (or
  rearranging) may break `getByTestId('tile-header')` content assertions.
  Most existing tests use `getByTestId` for individual elements (not
  positional), so likely safe. [MODELED]
- New header chrome elements (status dot + chip + meter) increase the
  pool of interactive targets for `isInteractiveTarget`. If MB-T15
  introduces clickable elements in the header that AREN'T intended to
  block drag-swap, the swap-drag tests could regress. [SPECULATIVE]
- Min-tile-width 240px acceptance: existing tests don't assert tile
  width; MB-T15 introduces this constraint. New tests required (per
  brief acceptance). [KNOWN]

### D — Session schema (where header data would come from)

`packages/dispatch-core/src/v2/schema.ts:144-163` [KNOWN] — `SessionSchemaV2`:
```
cwd, tmux_target, handoff_path, last_prompt_sent_at, last_handoff_pulled_at,
state, last_commit_sha, last_status_json_at, plan_info?
```
- **NO model field. NO branch field. NO tokens field.**

`packages/dispatch-core/src/v2/schema.ts:223-231` [KNOWN] — `CommitLandedEvent.data`:
```
{ sha: string, subject: string, branch: string }
```
- Branch is emitted on `commit_landed` events via `/v2/events/stream`.
  Real-time but event-driven; the daemon would need to track "current
  branch per session" and the workstation would need to subscribe.
  Alternative: read `cwd` + `git rev-parse --abbrev-ref HEAD` on demand.

`packages/dispatch-core/src/v2/schema.ts:120-125` [KNOWN] — `CostInfoSchema`:
```
{ usd_today, usd_this_month, token_count }
```
- Account-level (not per-session) request-time aggregation. NOT what a
  per-tile token meter wants without scope-narrowing.

### E — Model identifiers (where they exist + don't exist)

[KNOWN-NEGATIVE]: zero matches for `S4.6`, `O4.6`, `O4.7·1M`, `H` model
shorthand strings anywhere in `packages/`. These are operator-coined
chip labels; MB-T15 must define the SDK-name → shorthand mapping.

[KNOWN] Real SDK identifiers in repo:
- `claude-sonnet-4-6` — orchestrator model in coarch-t03 SDK call
  (`test/unit/coarch-t03/sdk-call-shape.spec.ts:3`).
- Inferred SDK names from CLAUDE.md / patterns: `claude-opus-4-7`,
  `claude-haiku-4-5-20251001`. [MODELED]

[KNOWN-NEGATIVE]: no `model:` field anywhere in canonical session
record schema. Spawned CC sessions don't capture model at spawn:
`spawn-handler.ts:95` [KNOWN] — request shape is `repoPath, sessionName`
only. No model arg.

**Implication:** MB-T15's model chip needs a NEW data source. Options:
1. Extend SpawnSessionRequest with `model` field; spawn-handler captures.
2. Daemon-side: add `model: string` to SessionSchemaV2 (FROZEN-ZONE
   AMENDMENT — operator-only, per CLAUDE.md §2.10).
3. Renderer-side: stub a default model (`claude-sonnet-4-6` like the
   orchestrator) until later integration. [PHASE-1-RECOMMENDED for
   v3.0 ship-minimum read-only chrome.]

### F — Token data sources

[KNOWN] `CostInfoSchema` (account-level request-time aggregation, not
per-session).

[KNOWN-NEGATIVE]: no per-session token tracking in any schema or daemon
endpoint. Brief mentions "MB-T11 autopilot integration later" — implies
MB-T15 ships a stubbed/placeholder token reading and the real data
source lands when autopilot wires through.

**Implication:** MB-T15's token meter ships with a stub data source
(zero tokens, or a session.tokensUsed prop from TileProps with default
0). The renderer-side meter logic + tint thresholds (>0.7 warn, >0.85
danger) ARE testable today via pure-fn helpers + props.

### G — CSS / styling patterns in dispatch-workstation

[KNOWN] Existing patterns observed in tile.tsx + workstation-shell.html:
- Inline `style={...}` for dynamic state (collapsed → height:40px).
- CSS classes defined in workstation-shell.html `<style>` block.
- `data-testid` for test queries; `data-status` / `data-collapsed`
  attributes for state-driven CSS targeting.
- Color palette currently used in shell HTML (`#0a0a0a`, `#3a3a3a`,
  `#303030` borders) — defines a dark theme. MB-T15's status dot
  green/yellow/red/gray + model chip per-color palette + token-meter
  warn/danger tints need to match this dark theme.

[KNOWN-NEGATIVE]: no CSS-in-JS library, no Tailwind, no styled-components.
Pure inline-style + class names. MB-T15 should follow this same
convention.

### H — Frozen-zone proximity check

Per CLAUDE.md §1 + §2.10 + §3.4 + the operator brief's §3.4 explicit
list:
- `REGISTRY.md §2 contracts` — NOT touched by MB-T15.
- `CONDUCTOR_API_CONTRACT.md` — NOT touched.
- `packages/dispatch-core/src/v2/schema.ts` — **POTENTIALLY** touched
  IF model/branch/tokens fields are added (Q-MBT15-2 below).
- `WORKSTATION_CONTRACT.md` — NOT touched (pure-renderer ticket).
- Sherpa Pass primitives — NOT touched.
- Engine `runOnce`/`runPlan` signatures — NOT touched.
- 1/10 through 8/10 + 10/10 mechanism interfaces — NOT touched.

[KNOWN] **The default Phase 2 path keeps schema.ts untouched** by
ship-minimum stub data sources (option 3 in §I-E). If the operator
arbitrates an SDK-name field on SessionSchemaV2 (§I-E option 2), that's
a frozen-zone amendment and requires operator-only authoring per §2.10
— escalate before WB1.

[KNOWN] No `=== BEGIN: ... ===` sentinel zones in tile.tsx — MB-T15 can
edit freely within the `<Tile>` body. Existing comment block at the top
(WB5 + WB10 + WB11a notes) should be extended with MB-T15 notes.

---

## II. Dependency map

```
                       ┌────────────────────────────────────────┐
                       │  TileGridApp (WB9)                     │
                       │  ├─ sessions: TileGridSessionEntry[]   │
                       │  │   └─ {name, status?, collapsed?}    │
                       │  │       MB-T15 ADDS:                  │
                       │  │       branchName?, repoName?,       │
                       │  │       model?, tokensUsed?,          │
                       │  │       tokenBudget?                  │
                       │  └─ feeds → TileGrid                   │
                       └──────────────────┬─────────────────────┘
                                          │
                       ┌──────────────────▼─────────────────────┐
                       │  TileGrid (WB6)                        │
                       │  └─ map(sessions) → <Tile>             │
                       │     props plumb to <Tile>              │
                       └──────────────────┬─────────────────────┘
                                          │
                       ┌──────────────────▼─────────────────────┐
                       │  Tile (WB5 + WB8 + WB10 + WB11a)       │
                       │  ┌─────────────────────────────────┐   │
                       │  │  tile-header (current)          │   │
                       │  │  status-indicator span          │   │
                       │  │  session-name span              │   │
                       │  │  picker slot                    │   │
                       │  │  autopilot slot                 │   │
                       │  │  collapse / detach / kill btns  │   │
                       │  └─────────────────────────────────┘   │
                       │       MB-T15 INTRODUCES:               │
                       │  ┌─────────────────────────────────┐   │
                       │  │  <TileHeader>  (NEW component)   │   │
                       │  │  status-dot (color helper)      │   │
                       │  │  session-name (truncated)       │   │
                       │  │  branch-name                    │   │
                       │  │  repo-name                      │   │
                       │  │  model-chip (color palette)     │   │
                       │  │  token-meter (tint thresholds)  │   │
                       │  └─────────────────────────────────┘   │
                       │  ┌─────────────────────────────────┐   │
                       │  │  body  ← unchanged              │   │
                       │  └─────────────────────────────────┘   │
                       └────────────────────────────────────────┘
```

What MB-T15 must wire (high-level):
1. Define `Model` enum/union + SDK-name → shorthand-chip mapping (Q-MBT15-1).
2. Decide model + branch + repo + tokens data source (Q-MBT15-2).
3. Extend `TileGridSessionEntry` with new fields (additive).
4. Add new `<TileHeader>` component in `src/tile-grid/tile-header.tsx`.
5. Add color-helpers pure-fn module (`src/tile-grid/color-helpers.ts`).
6. Wire TileHeader into Tile (slot above body or replace existing
   header content — Q-MBT15-3).
7. Acceptance: 240px min-width truncation + color tests.

---

## III. Territory boundaries (Phase 2 likely files)

**a. New files (Phase 2):**
- `packages/dispatch-workstation/src/tile-grid/tile-header.tsx` — read-only
  header chrome React component.
- `packages/dispatch-workstation/src/tile-grid/color-helpers.ts` — pure-fn
  module: `statusDotColor(status)`, `modelChipColor(model)`,
  `tokenMeterTint(ratio)`.
- `packages/dispatch-workstation/test/unit/tile-grid-color-helpers/probe-01-*.spec.ts`
- `packages/dispatch-workstation/test/unit/tile-grid-header/probe-01-*.spec.tsx`

**b. Modified files (Phase 2):**
- `packages/dispatch-workstation/src/tile-grid/tile.tsx` — slot the new
  TileHeader; preserve existing tests.
- `packages/dispatch-workstation/src/tile-grid/tile-grid.tsx` — extend
  TileGridSessionEntry with optional fields + plumb to Tile.
- `packages/dispatch-workstation/src/tile-grid/tile-grid-app.tsx` — extend
  initialSessions plumbing.
- `packages/dispatch-workstation/tsconfig.json` — add
  `src/tile-grid/tile-header.tsx` to the exclude list (per WB11a discovery).

**c. NOT touched (frozen / out-of-scope):**
- `packages/dispatch-core/src/v2/schema.ts` — only IF Phase 1 arbitration
  goes Q-MBT15-2 = (b) operator-amends-schema. Default Phase 2 path
  uses stub data sources, no schema touch.
- `packages/dispatch-workstation/src/main/main.ts` — pure-renderer ticket.
- `packages/dispatch-workstation/src/main/workstation-shell.html` — pure-
  renderer ticket; CSS for new chrome lives in tile-header.tsx inline
  styles or shell-html `<style>` block (Q-MBT15-4).
- `docs/build-docs/CONDUCTOR_API_CONTRACT.md` — no IPC additions.
- `docs/build-docs/WORKSTATION_CONTRACT.md` — no daemon-IPC additions.

---

## IV. Q-MBT15-N arbitration questions

### Q-MBT15-1 — Model SDK-name → shorthand chip mapping

**Context:** The brief lists 4 shorthand chips: `S4.6`, `O4.6`, `O4.7·1M`,
`H`. The repo's SDK identifiers are full names: `claude-sonnet-4-6`,
`claude-opus-4-6` (?), `claude-opus-4-7`, `claude-haiku-4-5` (?). The
mapping is ambiguous without operator confirmation:

**Tentative mapping [SPECULATIVE]:**
- `S4.6` → `claude-sonnet-4-6`
- `O4.6` → `claude-opus-4-6` (model name unverified in repo)
- `O4.7·1M` → `claude-opus-4-7-[1m]` (CLAUDE.md mentions Opus 4.7 1M context)
- `H` → `claude-haiku-4-5-*`

**Options:**
- **(a)** Operator confirms the mapping in Phase 1 review; ship as a
  literal `Record<ChipShortcode, ChipMeta>` in color-helpers.ts. **(Recommended)**
- (b) Read mapping from a config file (e.g., `tile-header-models.json`)
  loaded at startup; defer the canonical-mapping decision.
- (c) Derive shortcode programmatically from SDK name (e.g., first letter
  + version digits) — fragile and would need an override table anyway.

**Tentative recommendation:** **(a)** with operator-confirmed mapping
captured in the decisions doc.

### Q-MBT15-2 — Source of model / branch / tokens per session

**Context:** SessionSchemaV2 has none of these. The brief acceptance
focuses on render correctness (color match per state, truncation,
chip palette) — implying the data SOURCE can be operator-arbitrated
to a stub for v3.0.

**Options per field:**

- **Model:**
  - (a) Stub default `claude-sonnet-4-6` until autopilot wiring (MB-T17?).
  - (b) Extend SpawnSessionRequest with `model` field; spawn-handler
    captures + stores in NEW `model: string` SessionV2 field. [FROZEN
    ZONE — schema.ts touch.]
  - (c) Renderer-side: read from a workstation-local cache mapped by
    sessionName (operator sets when spawning).
- **Branch:**
  - (a) Stub `'main'` default + a TODO to subscribe `commit_landed` events.
  - (b) Renderer-side fetch from `cwd` + `git rev-parse` (requires
    main-process IPC; non-trivial for v3.0 ship-minimum).
  - (c) Subscribe `/v2/events/stream` `commit_landed` events; cache
    branch per session in TileGridApp state.
- **Repo name:**
  - (a) Derive from existing `cwd` field (basename) — already on
    SessionV2, no new wiring.
  - (b) Stub default empty string.
- **Tokens (used + budget):**
  - (a) Stub `tokensUsed=0`, `tokenBudget=200000` (or some default
    representing the model context window) until MB-T11/T17 autopilot
    integration. **(Recommended for ship-minimum)**
  - (b) Account-level `CostInfo.token_count` divided across active
    sessions (incorrect semantically — account is shared).

**Tentative recommendation:**
- Model: **(a) stub** — minimal ship; operator-arbitrated default.
- Branch: **(a) stub `'main'` default** — minimal ship.
- Repo name: **(a) basename(cwd)** — uses existing data, no new wiring.
- Tokens: **(a) stub** — minimal ship; flag for autopilot follow-up.

### Q-MBT15-3 — TileHeader vs existing Tile.tsx header DOM

**Context:** Today `tile.tsx:96-135` renders header DOM inline. MB-T15
introduces visual chrome below the drag-grip. Two structural options:

**Options:**
- **(a)** TileHeader is a NEW component rendered as a child of the
  existing `tile-header` div, ABOVE the existing buttons. Existing
  status-indicator span + session-name span are MOVED into TileHeader;
  buttons + slots remain as siblings of TileHeader in the current
  position. Existing tests still pass IF testid query paths still
  resolve. **(Recommended for minimal regression risk)**
- (b) TileHeader REPLACES the existing header content (status-indicator
  + session-name spans) — buttons + slots become props of TileHeader.
  Existing tests need migration.
- (c) TileHeader is a sibling section ABOVE the current tile-header
  div (visually a row above the buttons). Adds vertical space.

**Tentative recommendation:** **(a)** — preserves existing testids
(`tile-header`, `tile-status-indicator`, `tile-session-name`); adds new
children for branch/repo/model-chip/token-meter. Existing tests pass
unchanged.

### Q-MBT15-4 — CSS location for new chrome styling

**Context:** Existing dispatch-workstation styling: inline-style for
dynamic state, `<style>` blocks in shell HTML for global CSS. No
CSS-in-JS library.

**Options:**
- **(a)** Inline-style on tile-header DOM elements (per-element style
  objects, dynamic via state). **(Consistent with existing pattern)**
- (b) Add CSS classes to workstation-shell.html `<style>` block;
  reference via className. (Consistent for static styles; less
  testable than inline.)
- (c) NEW separate CSS file (would require build-pipeline changes).

**Tentative recommendation:** **(a)** for color/dynamic state; **(b)**
for layout primitives if needed (e.g., flex/grid for the header
columns). Decisions doc captures the split.

### Q-MBT15-5 — Status mapping (TileStatus → dot color)

**Context:** Current `TileStatus = 'idle' | 'open' | 'killed' | 'detached'`
(4 values). Brief acceptance maps 4 colors: `green/yellow/red/gray`
to `ok|warn|err|idle`. Mapping:

**Options:**
- **(a)** `idle → gray, open → green, killed → red, detached → yellow`.
  Map "warn" semantics to "detached" (operator's running-elsewhere state).
- (b) `idle → gray, open → green, killed → red, detached → gray`.
  Drop yellow (no Tile state warrants warn currently).
- (c) Add NEW intermediate states (e.g., `'reconnecting'` or
  `'gap-detected'`) → yellow. Requires TileStatus extension.

**Tentative recommendation:** **(b)** for ship-minimum — `detached`
becomes a gray-dot state semantically (UI is in placeholder mode).
Yellow stays unused in v3.0 + flagged for future use (gap-detected
banner, daemon-disconnect, etc.).

Operator-arbitration call: brief explicitly enumerates 4 colors. (b)
under-uses one. (a) overloads "warn" to "detached" which doesn't match
the semantics. (c) is the cleanest semantic fit but extends TileStatus.

### Q-MBT15-6 — Token meter visual shape

**Context:** Brief says "token meter bar tints to warn (>0.7) and
danger (>0.85)". Implementation shape options:

**Options:**
- (a) Horizontal progress bar (min 0, max 1.0) with width:%
  proportional to ratio + background-color tint per threshold band.
  **(Standard meter UX)**
- (b) Vertical bar (compact for tile width).
- (c) Numeric percentage text only ("73%") with color tint on the text.

**Tentative recommendation:** **(a)** horizontal bar.

### Q-MBT15-7 — Min-tile-width 240px enforcement

**Context:** Brief says renders without overflow at min tile width
(240px). Current grid layout's tile width is computed from container ÷
cols. At 1024px container with 4 cols (N=8), each tile is ~256px before
gutters/handles — close to 240px. MB-T15 must:

**Options:**
- (a) Add a `min-width: 240px` CSS to tile root + use truncation on
  long session/branch names via CSS `text-overflow: ellipsis`. **(Recommended)**
- (b) Make the entire header layout dynamic — switch to "compact mode"
  below a threshold (e.g., hide repo name, abbreviate model chip).
- (c) Force-scrollable header (`overflow-x: auto`).

**Tentative recommendation:** **(a)** — flexbox + ellipsis. Compact mode
(b) is v3.1 polish if operator-driven by usage observations.

---

## V. R-MBT15-N risks

### R-MBT15-1 — Source-of-truth gap

`docs/build-docs/wireframe-tickets-inventory.md` not in repo; operator-
side at `/mnt/user-data/outputs/wireframe-tickets-inventory.md`.
Mitigation: operator pastes the §3 MB-T15 entry during Phase 1 review,
OR commits the inventory file. Q-MBT15-1 / Q-MBT15-2 / Q-MBT15-5 may
have canonical answers in the inventory that override my tentative
recommendations.

### R-MBT15-2 — Schema.ts amendment ambiguity

If operator chooses Q-MBT15-2 = (b) for any field (extend SessionV2 with
model / branch / tokens), that's a frozen-zone amendment per
CLAUDE.md §2.10 — operator-only. Phase 2 ladder must HALT before WB1
if the arbitration goes that way.

### R-MBT15-3 — Existing tile.tsx test regression

Probes 01-04 (54 tests) assert specific testids in current Tile DOM.
Q-MBT15-3 = (a) preserves them. (b) requires test migration similar
to WB4's 12-test migration (took one disciplined batched edit). Plan
accommodates.

### R-MBT15-4 — Color palette specificity gap

Brief lists 4 model chips (S4.6, O4.6, O4.7·1M, H) — what colors? The
ticket says "fixed color palette per S4.6/O4.6/O4.7·1M/H" but doesn't
specify which color goes with which. Operator-side inventory likely
has this; if not surfaced in Phase 1 review, Phase 2 picks defensible
defaults + flags for operator review.

### R-MBT15-5 — Token meter data semantics

Account-level vs per-session token data is a real schema gap. v3.0
ship-minimum stub (Q-MBT15-2 = a for tokens) is correct, but the meter's
displayed values will be FAKE (or zero) until autopilot integration.
Operator must accept that v3.0 token meter is a placeholder UI surface.

### R-MBT15-6 — Drag-swap interaction with new clickable chrome

Current `isInteractiveTarget` skips drag-swap for buttons/inputs. MB-T15
adds a model chip + token meter — should clicks on these:
- Skip drag-swap (treat as interactive)? Yes if they have hover/click
  behaviors planned for MB-T16.
- Or be drag-swap-eligible (treat as background)? If passive read-only
  display.

For ship-minimum read-only: chip + meter don't need clicks; can be
divs (not buttons), so isInteractiveTarget naturally treats them as
draggable background. [MODELED]

### R-MBT15-7 — Tile-header CSS at min-width

240px is tight for header, body buttons (kill/detach/collapse =
combined ~120-180px text + button padding), AND new chrome. Ellipsis
truncation handles names; chip + meter are fixed-width small. CSS
flex-wrap may help. Need real screenshot or measured layout to
validate. [MODELED — risk surfaces at Phase 2 WB3 render tests.]

---

## VI. Phase 2 ladder (DRAFT — operator may revise after Phase 1 review)

Per operator brief recommendation: 4-5 WBs single session.

- **WB1 (red)** — scaffold tile-header.tsx skeleton + color-helpers.ts
  stubs + test files + decisions doc capturing Q-MBT15 dispositions.
  Commit: `red(MB-T15): WB1 — scaffold tile-header + color-helpers + decisions doc`.
- **WB2 (green)** — color-helpers.ts pure-fn implementations
  (statusDotColor, modelChipColor, tokenMeterTint) + unit tests.
  Commit: `green(MB-T15): WB2 — color-helpers.ts pure-fn + unit tests`.
- **WB3 (green)** — tile-header.tsx implementation + render tests at
  240px min-width + truncation tests.
  Commit: `green(MB-T15): WB3 — tile-header.tsx + render-at-min-width tests`.
- **WB4 (green)** — Tile.tsx integration: slot TileHeader; extend
  TileGridSessionEntry with optional fields + plumb-through;
  preserve all existing probe-01..04 tests.
  Commit: `green(MB-T15): WB4 — Tile.tsx integration + session-entry plumb-through`.
- **WB5 (docs)** — findings doc + followups + cross-layer flow update
  if needed (probably just Section I composition diagram tweak).
  Commit: `docs(MB-T15): WB5 — findings doc + followups`.

Per-commit-push throughout (per CLAUDE.md §2.6 + MB-T12 WB14 closure
lesson — no terminal HALT for push). HALT-per-WB only on operator
request; default ladder runs through with status surface every 2-3 WBs.

---

## VII. Parallelizability

[MODELED] MB-T15 splits into 4 roughly-orthogonal tracks:

- **Track 1** — color-helpers.ts (pure-fn, unit-test only)
- **Track 2** — tile-header.tsx (renderer, depends on Track 1)
- **Track 3** — Tile.tsx integration (renderer, depends on Tracks 1+2)
- **Track 4** — TileGridSessionEntry plumb-through (renderer, additive)

**Recommendation:** **single session for Phase 2.** Tracks are tightly
coupled; serial 4-5 WBs is faster than coordination overhead for any
parallel split.

---

## VIII. Open items for operator Phase 1 review

Before Phase 2 begins, operator confirms or revises:

1. **Q-MBT15-1** — model SDK-name → shorthand mapping. CC's tentative:
   `S4.6 → claude-sonnet-4-6`, `O4.6 → claude-opus-4-6`,
   `O4.7·1M → claude-opus-4-7-[1m]`, `H → claude-haiku-4-5-*`.
2. **Q-MBT15-2** — data source per field. CC's tentative: stub everything
   for v3.0 ship-minimum (model default `claude-sonnet-4-6`, branch
   default `'main'`, repo basename(cwd), tokens stubbed).
3. **Q-MBT15-3** — TileHeader-as-child (preserves existing testids) vs
   replace-existing-header. CC's tentative: child placement.
4. **Q-MBT15-4** — inline-style vs shell-CSS-classes. CC's tentative:
   inline for dynamic, shell-CSS for layout primitives.
5. **Q-MBT15-5** — TileStatus → dot color mapping. CC's tentative:
   idle→gray, open→green, killed→red, detached→gray; yellow unused in
   v3.0.
6. **Q-MBT15-6** — token meter shape. CC's tentative: horizontal bar.
7. **Q-MBT15-7** — 240px min-width strategy. CC's tentative: flex +
   ellipsis truncation.
8. **Color palette specifics** — chip colors per model + status-dot
   colors per state + token-meter warn/danger colors. Brief mentions
   colors at the value level (green/yellow/red/gray) but not exact hex
   codes. Operator-side inventory likely has these.

If the wireframe-tickets-inventory.md `§3 MB-T15 entry` (operator-side)
contradicts any tentative recommendation, that file is the
source-of-truth and CC's tentative defers.

---

## IX. End

Awaiting operator Phase 1 review. Standing by with no production
action. Next step on review: capture dispositions in
`docs/coordination/mb-t15-decisions-2026-05-07.md` and begin Phase 2
WB1.
