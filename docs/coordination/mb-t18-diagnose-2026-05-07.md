# MB-T18 Phase 1 Diagnose — Per-tile footer chrome

**Date:** 2026-05-07
**Authoring HEAD:** `39e8134` (post-MB-T17 Phase 1 spike, pre-T17 Phase 2 WB1)
**Concurrent session:** Terminal A is running MB-T17 (per-tile autopilot
toggle) in the same working tree. See §VII for shared-file inventory +
coordination mitigations.
**Status:** Phase 1 surface inventory + open-questions surface;
operator-review HALT before Phase 2 WB1.

This doc surfaces the existing footer-slot territory + open questions
Q-MBT18-1..12 + risks R-MBT18-1..8 with tentative dispositions for the
**per-tile footer chrome** ticket. MB-T18 mirrors the MB-T16 / MB-T17
ladder shape (render-prop slot pattern, sentinel discipline,
Read-before-Write prophylaxis) with three **deviations** vs. MB-T16:
1. NO bridge / NO IPC handlers (operator brief: "if footer is purely
   renderer-side data, skip the bridge"; Q-MBT18-6=a).
2. NO new sentinel zone in main.ts (Q-MBT18-10=a — no IPC means no
   wiring site).
3. NO chartered follow-up to close at integration WB (unlike
   MB-F-T13-TILE-HEADER-PICKER-INTEGRATION for T16 and
   MB-F-T12-AUTOPILOT-TILE-TOGGLE-INTEGRATION for T17). MB-T18 is pure
   greenfield slot population.

Net result: smaller ladder (~4 WBs vs. T16/T17's 5 WBs).

---

## I. Surface inventory

### I-A. Footer slot wrapper baseline

**File:** `packages/dispatch-workstation/src/tile-grid/tile.tsx`
(line 206, KNOWN).

**Current markup:**
```tsx
<div data-slot="footer" data-testid={`tile-footer-slot-${sessionName}`} />
```

**Self-closing — no children, no render-prop today.** Direct mirror of
pre-MB-T16 picker slot baseline (which was `<div ... />` self-closing
before WB4 wired the render-prop). The MB-T17 plan replaces autopilot
slot with the same render-prop wrapper at WB4; MB-T18 does the
equivalent for footer.

**Composition comments at tile.tsx:16+28** explicitly reserve "MB-T18
future" / "Footer slot is also placeholder for MB-T18." Authoritative
intent: this slot is mine.

**MB-T18 plan (mirror picker pattern from WB4):** replace the
self-closing `<div ... />` with the render-prop wrapper:
```tsx
<div
  data-slot="footer"
  data-testid={`tile-footer-slot-${sessionName}`}
>
  {renderFooterSlot ? renderFooterSlot(sessionName) : null}
</div>
```

**Contract preservation (KNOWN-required):**
- `data-slot="footer"` MUST persist (tile-grid-tile probe-01..05 tests
  assert this).
- `data-testid="tile-footer-slot-{name}"` MUST persist (MB-T12 WB5
  contract).
- When `renderFooterSlot` is `undefined`, wrapper renders empty
  (existing-test compatibility).

### I-B. TileGridSessionEntry shape (KNOWN)

**File:** `packages/dispatch-workstation/src/tile-grid/tile-grid.tsx`
(lines 25-40).

Existing fields: `name`, `status?`, `collapsed?`, `branchName?`,
`repoName?`, `model?`, `tokensUsed?`, `tokenBudget?`. **No `cwd`, no
`spawnedAt`, no `lastActivityAt`.**

**Implication for MB-T18:** if footer needs `cwd`, an additive field is
required. Adding `cwd?: string` mirrors the MB-T15 chrome additions
(branchName, repoName, etc.) — same plumb-through shape, same
optionality posture.

### I-C. SpawnSessionResult shape (KNOWN — load-bearing for footer data)

**File:** `packages/dispatch-workstation/src/main/spawn-handler.ts`
(lines 91-103 interface, lines 378-382 return statement).

**Current shape:**
```ts
return {
  sessionName: registered.name,
  sessionId: registered.name,
  panelMounted: false,
};
```

`cwd` is captured at spawn-handler.ts:361 (`cwd: req.repoPath` for the
daemon registration) but **NOT propagated back to the renderer.**

**TileGridApp.onSpawnResult populates only `{ name }`** (tile-grid-app.
tsx:121-127):
```ts
return [...current, { name: sessionName }];
```

**Implication:** all MB-T15 chrome stub-renders today (branchName,
repoName, model, tokensUsed, tokenBudget all default to MB-T15 stubs
at runtime — the production mount.ts seed is just `name`). Footer
faces the SAME pipeline. To populate footer with cwd, either:
- (a) Extend SpawnSessionResult to include cwd → workstation-internal
  change, ~3 LoC at spawn-handler.ts; renderer plumbs the new field
  into TileGridSessionEntry.
- (b) Add a new IPC fetch path → BUT the daemon GET response body
  doesn't include cwd (see I-D), so this requires a daemon contract
  amendment.
- (c) Skip cwd entirely; render footer with renderer-only data
  (uptime). Smallest change but loses cwd surfacing.

### I-D. Daemon GET /v2/sessions/:name response (KNOWN — frozen)

**File:** `packages/dispatch-daemon/src/routes/sessions.ts`
(lines 122-148).

**Returned fields:** `{ name, state, computed_status, status_json }`.

**`cwd` is in the registry record** (`registry.sessions[name].cwd`,
sessions.ts:197) but **NOT in the GET response body.** Adding it
requires modifying the daemon /v2 route — which lives behind
`docs/build-docs/CONDUCTOR_API_CONTRACT.md` (FROZEN per CLAUDE.md
§2.10). **Operator-arbitrated only; rules out (b) above as a
self-deliverable.**

**Disposition:** workstation-internal (a) is the right path for v3.0;
(b) is a v3.1 candidate via separate operator-arbitrated ticket if
ever needed.

### I-E. SessionContextSnapshot (KNOWN — informational)

**File:** `packages/dispatch-core/src/v3/schema.ts:785-794`.

GET `/v3/sessions/:name/context-snapshot` returns:
```
{ recent_handoff, recent_console_tail, pending_intents,
  last_action_fired_at, last_operator_typed_at }
```

`last_action_fired_at` could surrogate as "last-activity-time" for
footer; it's populated by orchestrator-action-handler when the
autopilot loop fires. **But:** this only updates on
orchestrator-driven actions, NOT on operator-typed prompts (which set
`last_operator_typed_at` — but that field is hardcoded `null` in v3.0
per schema.ts:782-783).

**Implication:** `last_action_fired_at` is a NOISY signal for "session
activity" — only fires when autopilot is enabled AND the orchestrator
fires an action. For idle / operator-driven sessions, it stays null.
Renderer-side mount-time uptime is a more reliable footer signal for
v3.0.

### I-F. Tile-header chrome (already-rendered metadata, KNOWN)

**File:** `packages/dispatch-workstation/src/tile-grid/tile-header.tsx`
(MB-T15 baseline).

Already in header chrome:
- status dot (`data-status`)
- session name (truncated, testid `tile-session-name`)
- branch name (MB-T15)
- repo name (basename of cwd, MB-T15)
- model chip (MB-T15)
- token meter (MB-T15)

**Implication for footer non-duplication:**
- ✘ DO NOT put: session name, repo basename, model, tokens (header has
  them).
- ✓ candidates: full cwd path (header has only basename), uptime,
  spawn time, tmux target, sessionId. **Footer must add value beyond
  header chrome — not duplicate.**

### I-G. Sentinel zones in main.ts (KNOWN — coordination-relevant)

**File:** `packages/dispatch-workstation/src/main/main.ts` (772 LoC).

Existing zones (verified via `grep -n "=== "`):
- Line 38-47: `MB-T12 tile-grid mount imports`
- Line 48-54: `MB-T16 approval-policy IPC imports`
- Line 469-506: `MB-T12 tile-grid mount`
- Line 508-534: `MB-T16 approval-policy IPC`
- (plus pre-existing Fix-A/B/C, Fix-89/92, Probe-92, Session-3 zones)

**MB-T17 (in-flight, Terminal A) WILL add:**
- One new sentinel block adjacent to MB-T16 zone (per
  `mb-t17-diagnose-2026-05-07.md` Q-MBT17-10=a) wiring
  `createDefaultAutopilotIpcController().registerHandlers(ipcMain)`.

**MB-T18 (this ticket) per Q-MBT18-10=a does NOT touch main.ts at all.**
No IPC, no wiring site. Sidesteps the main.ts contention with T17 by
construction.

### I-H. Render-prop / bridge-adapter pattern (KNOWN — applied)

**Insight 1 from `mb-t16-findings-2026-05-07.md`:** the render-prop slot
population pattern is reusable. Each successor adds a `render*Slot?`
prop on Tile + TileGrid; TileGridApp constructs the closure with the
relevant data; the slot wrapper preserves testid + data-slot by
construction.

**Insight 2 (bridge adapter):** any IPC-bound feature uses optional
bridge methods on `WorkstationBridgeShape` and constructs the adapter
only when ALL required methods exist; null path = unavailable state.

**For MB-T18:** Insight 1 applies (render-prop). Insight 2 does NOT
apply per Q-MBT18-6=a (no bridge needed) — adapter pattern is
silently absent because there's nothing to adapt.

### I-I. Open followups touching footer territory

| Line | ID | Tier | MB-T18 relation |
|---|---|---|---|
| 187 | `MB-F-T16-OPTIMISTIC-ROLLBACK-OBSERVABILITY` | 3 | Mentions "workstation footer" in passing as a candidate v3.1 surface for a transient toast/banner — that's the workstation-shell-level footer, NOT the per-tile footer this ticket builds. **Unrelated.** |

**No chartered follow-up to close at MB-T18 integration WB.** Unlike
MB-T16 (closed `MB-F-T13-TILE-HEADER-PICKER-INTEGRATION`) and MB-T17
(plans to close `MB-F-T12-AUTOPILOT-TILE-TOGGLE-INTEGRATION`), MB-T18
is pure greenfield slot population. The slot wrapper file-header
comments at tile.tsx:16+28 reserve "MB-T18 future" but there is no
FOLLOWUPS.md row to close. **Outcome classification §2.11 candidate:
"Capability enabled" not "Improved (binary flip)".**

### I-J. mount.ts production seed (KNOWN — load-bearing)

**File:** `packages/dispatch-workstation/src/tile-grid/mount.ts`
(lines 78-85).

Production auto-mount passes only:
```
workstationBridge, consoleBridge, createTerminal
```
to TileGridApp. **NO `initialSessions` seed today.** Sessions are
populated by `onSpawnResult` reply handling at runtime (tile-grid-
app.tsx:117-130), which only sets `{ name }` on each entry.

**Implication for MB-T18:** if cwd is added to SpawnSessionResult, the
TileGridApp `setSessions` call at line 121-127 must also include the
new field — otherwise footer gets an empty cwd. This is the actual
WB3 integration site for cwd plumb-through.

---

## II. Open questions Q-MBT18-1..12

### Q-MBT18-1: Footer content set [LOAD-BEARING for ladder shape]

What does footer display? Operator brief: "compact session metadata
(working-dir, last-activity-time, or similar)".

Options:
- (a) `cwd` (full path, CSS truncate) — chrome-style readonly metadata.
- (b) `lastActivityAt` (relative ago format) — needs new
  instrumentation OR the noisy `last_action_fired_at` source from I-E.
- (c) cwd + last-activity-time (compound).
- (d) Spawn time / session uptime (renderer-side mount snapshot,
  ticks every 5s).
- **(e) cwd + uptime (compound)** — both renderer-derivable; cwd via
  SpawnSessionResult extension (workstation-internal); uptime via
  renderer mount-time snapshot. No new IPC. No daemon contract change.
- (f) Empty placeholder — ship slot-wrapper-only for v3.0, defer
  content (mirrors MB-T15's stub strategy).

**Tentative disposition: (e)** — gives footer real content with
zero contract churn. Aligns with operator brief "if footer is purely
renderer-side data, skip the bridge."
**Operator decision dependency:** §I-A through §I-J support (e); if
operator wants daemon-authoritative `lastActivityAt`, flip to
(b)/(c) — but that means new IPC + likely a daemon contract change
(out-of-scope per §2.10) OR using the noisy `last_action_fired_at`
signal (which surfaces as "1h ago" forever for idle sessions).

### Q-MBT18-2: Data-source for cwd

- **(a) Extend `SpawnSessionResult` to include `cwd: string`.**
  Workstation-internal — `spawn-handler.ts:378-382` adds the field;
  `SpawnSessionResult` interface adds `cwd: string`. ~3 LoC. Renderer
  plumbs into TileGridSessionEntry.
- (b) Add new IPC fetch `workstation:session-meta-get` hitting daemon
  /v2/sessions/:name → ❌ daemon GET doesn't return cwd today (I-D);
  requires frozen-contract amendment.
- (c) Read from main-process registry via separate IPC piggyback →
  more plumbing, no benefit over (a).

**Tentative disposition: (a)** — minimal contract churn, single field
add, available at spawn-handler.ts:361 already.

### Q-MBT18-3: Data-source for uptime

- **(a) Renderer-side mount-time snapshot.** `useEffect(() =>
  setMountedAt(Date.now()), [])` per tile; uptime computed as
  `now - mountedAt`. Reset on tile re-mount (e.g., detach close per
  WB11, renderer reload).
- (b) Daemon-authoritative spawn time → daemon doesn't expose this in
  /v2/sessions/:name; same frozen-contract issue as (b)-Q-MBT18-2.
- (c) Extend SpawnSessionResult with `spawnedAt: string`
  (ISO datetime). Survives renderer reload IF persisted via tile-
  grid-state (today: tile-grid-state persists layout, NOT session-
  meta).

**Tentative disposition: (a)** — simplest; semantics ("time since
this tile was last mounted in this window") are honest for v3.0.
File followup `MB-F-T18-FOOTER-DAEMON-AUTHORITATIVE-SPAWN-TIME`
(Tier 3) for v3.1 if operator wants "time since session spawn."

### Q-MBT18-4: Render-prop on Tile [PARALLELS Q-MBT16-4=a, Q-MBT17-4=a]

- **(a)** `Tile.renderFooterSlot?: (sessionName: string) => ReactNode`
  prop, plumbed through TileGrid + populated by TileGridApp.
- (b) Direct embed of `<TileFooter>` inside Tile.tsx.

**Tentative disposition: (a)** — direct MB-T16/T17 precedent + Insight
1. Reuses Tile's testability.

### Q-MBT18-5: Footer component file location

- **(a)** `packages/dispatch-workstation/src/tile-grid/tile-footer.tsx`
  (mirrors `tile-header.tsx`, `tile-approval-picker.tsx`).
- (b) Inline inside tile-grid-app.tsx.

**Tentative disposition: (a)** — direct precedent; flat-directory
convention §3.2; separate file keeps Tile testable in isolation.

### Q-MBT18-6: Bridge needed?

- **(a) NO bridge.** Pure renderer-side data: cwd from extended
  SpawnSessionResult (already on the IPC envelope when WB2 lands);
  uptime from renderer mount-time. No optional bridge methods on
  WorkstationBridgeShape.
- (b) Optional bridge methods (mirror MB-T16/T17 pattern —
  `getSessionMeta?`).

**Tentative disposition: (a)** — operator brief explicitly: "if
footer is purely renderer-side data, skip the bridge." Q-MBT18-1=e
+ Q-MBT18-2=a + Q-MBT18-3=a together make footer purely
renderer-side. **Significant deviation from MB-T16/T17:** no bridge,
no IPC, no preload extension, no main.ts wiring. ~50% of MB-T16's
file surface goes away.

### Q-MBT18-7: cwd truncation strategy

When cwd is wider than the tile column:
- (a) middle-ellipsis: `/Users/.../foxworks-dispatch` (custom helper,
  ~15 LoC).
- (b) head-ellipsis: `.../foxworks-dispatch` (custom helper, ~10
  LoC).
- (c) basename-only with full-path `title=` tooltip.
- **(d)** Full path with CSS `text-overflow: ellipsis`. Browser-native;
  hover via `title=` shows full path. ~0 lines of formatting code.

**Tentative disposition: (d)** — simplest; defer to CSS; tile width
controls visible portion. If operator wants explicit middle-ellipsis,
flip to (a) as a ~15-LoC helper at WB2.

### Q-MBT18-8: Uptime formatting

- **(a)** Auto-switch units: `< 60s` → "Ns"; `< 60m` → "Nm"; `< 24h`
  → "Nh"; else "Nd". ~10 LoC pure-fn.
- (b) HH:MM:SS strict.
- (c) `Intl.RelativeTimeFormat` ("3 minutes ago" style) — too verbose
  for chrome.

**Tentative disposition: (a)** — common UX, compact, easy unit tests.

### Q-MBT18-9: Uptime tick interval

- (a) 1s — most current; ≤8 tiles × 1Hz = ≤8 setState/s.
- **(b) 5s** — quieter; ≤8 tiles × 0.2Hz = ≤1.6 setState/s; format-(a)
  unit boundaries (60s → 1m, 60m → 1h) update visibly within 5s.
- (c) 30s — coarse; up to 30s lag at minute boundary feels stale.
- (d) Tick-on-render only — no setInterval; updates only on parent
  re-renders, which is unrelated to wall-clock time.

**Tentative disposition: (b)** — 5s tradeoff between current-ish and
re-render churn; React reconciliation skips identical subtree if the
rendered string didn't change anyway.

### Q-MBT18-10: Sentinel block in main.ts

Per Q-MBT18-6=a (no bridge), there's NO IPC handler to wire. main.ts
isn't touched by MB-T18 at all.

- **(a) NO sentinel zone.** Deviates from MB-T16/T17 but matches scope
  exactly: no IPC = no wiring site.
- (b) Add a no-op sentinel zone for future-proofing.

**Tentative disposition: (a)** — main.ts untouched. SpawnSessionResult
shape change happens in spawn-handler.ts (workstation-internal),
NOT main.ts. **Critical for §VII coordination:** entirely sidesteps
main.ts contention with concurrent MB-T17 session.

### Q-MBT18-11: Test directory layout

- **(a)** `test/unit/tile-footer/` for component + formatters,
  `test/unit/tile-grid-tile/probe-08-footer-slot-integration.spec.tsx`
  for Tile integration, `test/unit/tile-grid-app/probe-06-footer-
  render-prop.spec.tsx` for TileGridApp closure plumbing.

**Tentative disposition: (a)** — direct MB-T16/T17 precedent. Probe
numbering: tile-grid-tile probe-08 (after T16's probe-06 + T17's
planned probe-07); tile-grid-app probe-06 (after T16's probe-04 +
T17's planned probe-05).

### Q-MBT18-12: SpawnSessionResult shape extension granularity

Adding cwd at spawn-handler.ts:91-103 + 378-382:
- **(a) Single field add: `cwd: string`.** Minimal change, ~3 LoC.
- (b) Full session-meta object (`{ cwd, spawnedAt, tmuxTarget }`) —
  pre-emptive plumbing for future footer enhancements.

**Tentative disposition: (a)** — single field; deferring spawnedAt to
Q-MBT18-3=a (renderer-side); deferring tmuxTarget unless a future
ticket needs it. Minimal contract surface.

---

## III. Risks R-MBT18-1..8

### R-MBT18-1: Render-prop pattern reproducibility

**Surface:** WB3 integration mirrors MB-T16/T17 render-prop shape.

**Severity:** ZERO — established 2x (picker shipped, autopilot in
flight). Insight 1 from MB-T16 findings explicitly endorses pattern
reuse.

**Tentative disposition: PRESERVE.**

### R-MBT18-2: Slot wrapper testid preservation (mirrors R-MBT16-4 / R-MBT17-4)

**Surface:** existing tile-grid-tile probe-01..05 tests assert
`data-testid="tile-footer-slot-{name}"` + `data-slot="footer"`.

**Severity:** ZERO when render-prop pattern is followed (preserves
both attributes by construction).

**Tentative disposition: PRESERVE.** Verified at WB3 integration probe.

### R-MBT18-3: Concurrent territory with MB-T17 [CRITICAL]

**Surface:** MB-T17 is in flight in Terminal A (post-Phase-1 spike at
`39e8134`, pre-Phase-2 WB1). Both tickets edit shared files in WB
equivalents (T18 WB3 ≈ T17 WB4 — both touch tile.tsx + tile-grid.tsx
+ tile-grid-app.tsx). Possible per-file race if both sessions stage
uncommitted edits at the same moment OR if either fails per-path
discipline.

**Shared files (BOTH MB-T17 and MB-T18 edit):**

| File | T17 edit shape | T18 edit shape | Conflict surface |
|---|---|---|---|
| `packages/dispatch-workstation/src/tile-grid/tile.tsx` | adds `renderAutopilotSlot?` prop on TileProps; replaces self-closing `<div data-slot="autopilot" .../>` with render-prop wrapper | adds `renderFooterSlot?` prop on TileProps; replaces self-closing `<div data-slot="footer" .../>` with render-prop wrapper | TileProps interface block (additive, distinct prop names); two non-overlapping JSX wrapper edits. **Likely auto-merges; in worst case 3-way conflict around prop list ordering.** |
| `packages/dispatch-workstation/src/tile-grid/tile-grid.tsx` | adds `renderAutopilotSlot?` to TileGridProps; pass-through in `<Tile>` JSX (lines 311-328) | adds `renderFooterSlot?` to TileGridProps; pass-through in same `<Tile>` JSX block | Same shape — additive interface field + additive prop in one JSX block. **Likely auto-merges.** |
| `packages/dispatch-workstation/src/tile-grid/tile-grid-app.tsx` | constructs `autopilotBridge` adapter + `renderAutopilotSlot` closure + passes to `<TileGrid>`; possibly adds bridge fields to WorkstationBridgeShape | constructs `renderFooterSlot` closure (no bridge per Q-MBT18-6=a) + extends TileGridSessionEntry interpretation in `setSessions` to include `cwd` from SpawnSuccessReply | Different sites within the same file (T17 around bridge-adapter block; T18 around setSessions + new closure) — **mostly disjoint**; closure block is a new section so likely auto-merges. |

**Files MB-T18 touches that MB-T17 does NOT:**
- `packages/dispatch-workstation/src/tile-grid/tile-footer.tsx` (NEW, WB1+WB2)
- `packages/dispatch-workstation/src/main/spawn-handler.ts` (cwd field on SpawnSessionResult, WB2)
- `packages/dispatch-workstation/test/unit/tile-footer/` (NEW)
- `packages/dispatch-workstation/test/unit/tile-grid-tile/probe-08-footer-slot-integration.spec.tsx` (NEW)
- `packages/dispatch-workstation/test/unit/tile-grid-app/probe-06-footer-render-prop.spec.tsx` (NEW)
- `packages/dispatch-workstation/tsconfig.json` (`exclude` array entry for `tile-footer.tsx`, WB1)

**Files MB-T17 touches that MB-T18 does NOT (per `mb-t17-diagnose-2026-05-07.md`):**
- `packages/dispatch-workstation/src/main/main.ts` (sentinel zone)
- `packages/dispatch-workstation/src/main/autopilot-ipc.ts` (NEW)
- `packages/dispatch-workstation/src/main/preload.mts` (autopilot bridge methods)
- `packages/dispatch-workstation/src/tile-grid/tile-autopilot-toggle.tsx` (NEW)
- autopilot test directories

**Mitigations (KNOWN — restated for explicitness per operator brief):**
1. **Per-path `git add` only.** No `-A`, no `.`, ever. CLAUDE.md §2.7
   + operator brief.
2. **Pre-commit territory check.** `git status --short` BEFORE every
   commit — verify ONLY this session's intended files staged. If
   unexpected paths appear (the OTHER session's territory), HALT and
   surface to operator.
3. **Post-commit territory verification.** `git log -1 --stat` AFTER
   every commit — confirm commit content matches intent.
4. **Sync via pull-before-WB.** §2.6 per-commit-push gives natural
   sync points. Before starting any WB that edits a SHARED file
   (tile.tsx / tile-grid.tsx / tile-grid-app.tsx), `git pull --rebase
   origin main` to absorb any pushed T17 commits into the local base
   before re-staging WB edits.
5. **Render-prop additivity.** T17's `renderAutopilotSlot?` and T18's
   `renderFooterSlot?` are independent optional props on the same
   TileProps / TileGridProps interfaces — merge-friendly by
   construction. Worst-case conflict is interface-line ordering,
   which is trivial to resolve.
6. **Sentinel discipline.** T18 sidesteps main.ts entirely
   (Q-MBT18-10=a). T17 owns the new sentinel zone alone. **Zero
   contention on main.ts by design.**
7. **Frozen-contract avoidance.** Both tickets target workstation-
   internal surfaces; no daemon contract changes (frozen surface
   §2.10 untouched). SpawnSessionResult shape extension (T18 WB2) is
   workstation-internal — not contract-bearing.

**Severity:** MEDIUM — process-driven risk; controllable with
per-path discipline. With (1)-(7) applied, expected outcome is
zero merge conflicts.

**Tentative disposition: ACCEPT WITH MITIGATIONS.** Pre-commit
territory check at every WB.

### R-MBT18-4: SpawnSessionResult interface change ripples

**Surface:** Adding `cwd` to SpawnSessionResult propagates into:
- `spawn-handler.ts` SpawnSessionResult interface (1 line) + return
  statement (1 line).
- `spawn-ipc.ts` SpawnSuccessReply (no change — opaque `result` field
  passes through).
- `tile-grid-app.tsx` `isSpawnSuccessReply` type guard (1 line —
  optional check on cwd) + `setSessions` call (1 line — propagate
  cwd into TileGridSessionEntry).
- `tile-grid.tsx` TileGridSessionEntry interface (1 line — add
  `cwd?: string`).
- existing spawn-handler / spawn-ipc unit tests asserting reply shape
  (need to verify at WB1 if pre-existing tests strict-match the
  result shape; likely they pattern-match on `sessionName` only).

**Severity:** LOW — additive field; pre-existing tests likely
pattern-match `{ sessionName }` without strict deep-equal on the
rest (same rigor pattern as MB-T15 chrome additions which landed
without spawn-result test breakage).

**Tentative disposition: VERIFY at WB1 scaffold.** If pre-existing
test rigor blocks the change, fall back to (c)-Q-MBT18-1 (uptime-
only footer; cwd deferred).

### R-MBT18-5: Mount-time uptime has reload semantics

**Surface:** Q-MBT18-3=a uses renderer mount-time as uptime baseline.
On renderer reload (window refresh), tile re-mount (after detach
close per WB11 detach flow), or session re-attach, the snapshot
resets — uptime restarts from 0.

**Severity:** LOW — v3.0 is single-user; renderer reload is rare.
The semantics are "time since this tile was last mounted in this
window," which is honest if not ideal.

**Tentative disposition: ACCEPT for v3.0.** File followup at WB4:
`MB-F-T18-FOOTER-DAEMON-AUTHORITATIVE-SPAWN-TIME` (Tier 3) — v3.1
exposes spawn time via SessionContextSnapshot extension OR daemon
GET response addition (operator-arbitrated frozen-contract change).

### R-MBT18-6: TS dual-import drift (mirror R-MBT17-6)

**Surface:** WB2 `tile-footer.tsx` uses no dispatch-core types
directly (renders strings; cwd is `string`, uptime is `number`).

**Severity:** ZERO.

**Tentative disposition: NONE NEEDED.**

### R-MBT18-7: tsconfig .tsx exclude pattern (mirror R-MBT17-7)

**Surface:** new `tile-footer.tsx` requires entry in workstation
tsconfig.json `exclude` array (workstation tsconfig has no JSX
flag; .tsx files bundle via esbuild, not tsc).

**Severity:** ZERO when added at WB1 scaffold.

**Tentative disposition: ADD AT WB1.** Same pattern as MB-T16 WB1
added tile-approval-picker.tsx and MB-T17 WB1 plans for tile-
autopilot-toggle.tsx.

### R-MBT18-8: Uptime re-render churn

**Surface:** Q-MBT18-9=b 5s tick on each tile via `setInterval`. ≤8
tiles × 0.2Hz = ≤1.6 setState/s in worst case.

**Severity:** ZERO. setState on a string change is ~µs; React
reconciliation skips unchanged subtrees; format-(a) bucket-switching
is rare (boundaries at 60s, 60m, 24h).

**Tentative disposition: ACCEPT.**

---

## IV. Proposed ladder (4 WBs — smaller than MB-T16/T17 due to no IPC)

| WB | Type | Scope |
|---|---|---|
| WB1 | red | Scaffold: empty `tile-footer.tsx` (file shell), tsconfig.json `exclude` entry, decisions doc capturing Q-MBT18-1..12 + R-MBT18-1..8 dispositions, stub probe directories with placeholder tests. SpawnSessionResult interface change DEFERRED to WB2 to keep WB1 strictly red-stubs (no logic changes). |
| WB2 | green | (1) `tile-footer.tsx` impl — pure-fn formatters (`formatUptime`), `<TileFooter sessionName cwd mountedAt>` component with useEffect mount snapshot + setInterval(5s) uptime tick, full-cwd `title=` tooltip + CSS truncate. (2) `spawn-handler.ts` — add `cwd: string` to SpawnSessionResult interface + return-statement field. Tests: `test/unit/tile-footer/probe-01-render.spec.tsx` (formatters + render + tick); spawn-handler unit-test adjustments if pre-existing tests strict-match return shape. |
| WB3 | green | Integration: Tile.tsx adds `renderFooterSlot?` prop, TileGrid plumbs through, TileGridApp constructs `renderFooterSlot` closure and propagates `cwd` from SpawnSuccessReply.result into `setSessions` call. TileGridSessionEntry adds `cwd?: string`. mount.ts UNCHANGED (TileGridApp picks up cwd from runtime spawn-result, not from initialSessions). New tests: `tile-grid-tile/probe-08-footer-slot-integration.spec.tsx` (~7 tests) + `tile-grid-app/probe-06-footer-render-prop.spec.tsx` (~5 tests). main.ts UNCHANGED per Q-MBT18-10=a. |
| WB4 | docs | Findings doc + 1-2 v3.1 polish followups (`MB-F-T18-FOOTER-DAEMON-AUTHORITATIVE-SPAWN-TIME` Tier 3; possibly `MB-F-T18-FOOTER-LAST-ACTIVITY-INSTRUMENTATION` Tier 3 if operator wants noisy-but-cheap last_action_fired_at signal as a v3.1 alt path). |

**Estimated total tests: ~20-25** (smaller than MB-T16's 57 since no
IPC controller pure-fn module + no preload extension + no main.ts
wiring tests).
**Estimated commits: 4 + 1 phase-1-diagnose.**

**Possible compression to 3 WBs:** if operator wants tighter ladder,
WB2 + WB3 can fuse (component impl + Tile/TileGrid integration in a
single green commit). Decision deferred to decisions-doc review.

---

## V. Out-of-scope confirmations

Per operator brief + §2.10 frozen-contracts:

- **Picker** — MB-T16, shipped at `6252e64`.
- **Autopilot toggle** — MB-T17, in-flight in Terminal A.
- **Hero / squad layout** — MB-T19.
- **Daemon contract changes** — frozen surface
  `CONDUCTOR_API_CONTRACT.md` per §2.10. Cwd-in-GET-response and
  spawnedAt-in-GET-response stay deferred to operator-arbitrated
  v3.1 tickets.
- **Daemon-authoritative spawn time** — v3.1 followup
  `MB-F-T18-FOOTER-DAEMON-AUTHORITATIVE-SPAWN-TIME` (Tier 3).
- **Last-activity-time as spawn-side persisted timestamp** — v3.1
  followup if operator wants; v3.0 ships uptime-only.
- **Multi-window footer sync** — mirrors MB-T16 §VII-3 deferred.
- **Workstation-shell-level footer toast/banner** — separate surface
  referenced in `MB-F-T16-OPTIMISTIC-ROLLBACK-OBSERVABILITY`; not
  this ticket.
- **New IPC channels** — Q-MBT18-6=a confirms NO bridge / NO IPC.
- **main.ts edits** — Q-MBT18-10=a confirms main.ts UNTOUCHED.

---

## VI. References

- **MB-T16 ladder precedent:**
  `docs/coordination/mb-t16-decisions-2026-05-07.md` +
  `docs/coordination/mb-t16-findings-2026-05-07.md`
- **MB-T17 concurrent diagnose:**
  `docs/coordination/mb-t17-diagnose-2026-05-07.md` (`39e8134`)
- **Footer slot baseline:** `packages/dispatch-workstation/src/
  tile-grid/tile.tsx:206`
- **Composition contract for slot:** `tile.tsx:1-28` file-header
  composition comment + `(MB-T18 future)` reservations at lines
  16+28
- **Tile-header chrome (non-dup reference):**
  `packages/dispatch-workstation/src/tile-grid/tile-header.tsx`
  (MB-T15 baseline)
- **SpawnSessionResult shape:**
  `packages/dispatch-workstation/src/main/spawn-handler.ts:91-103,
  378-382`
- **SpawnSuccessReply envelope:**
  `packages/dispatch-workstation/src/main/spawn-ipc.ts:42-61`
- **TileGridApp spawn-result handling:**
  `packages/dispatch-workstation/src/tile-grid/tile-grid-app.tsx:117-130`
- **mount.ts production seed:**
  `packages/dispatch-workstation/src/tile-grid/mount.ts:78-85`
- **Daemon GET /v2/sessions/:name (frozen-surface evidence):**
  `packages/dispatch-daemon/src/routes/sessions.ts:122-148`
- **CLAUDE.md sections governing:** §2.5 halt, §2.6 per-commit-push,
  §2.7 per-path git add, §2.10 frozen contracts, §3.2 flat directory,
  §3.3 sentinel discipline, §3.6 test layout, §4.1 WB ladder, §4.2
  HALT gates.

---

## VII. Concurrent-session coordination summary [MITIGATIONS RESTATED]

**Concurrent session:** Terminal A — MB-T17 (per-tile autopilot
toggle), post-Phase-1 spike at `39e8134`. Same working tree.

### Shared files (BOTH sessions edit)

1. `packages/dispatch-workstation/src/tile-grid/tile.tsx`
   - T17: adds `renderAutopilotSlot?` to TileProps; render-prop wraps
     autopilot slot at line 165-168.
   - T18: adds `renderFooterSlot?` to TileProps; render-prop wraps
     footer slot at line 206.
   - **Conflict surface:** TileProps interface block (additive, distinct
     prop names); two non-overlapping JSX edits. Auto-merge expected.

2. `packages/dispatch-workstation/src/tile-grid/tile-grid.tsx`
   - T17: adds `renderAutopilotSlot?` to TileGridProps; pass-through
     in `<Tile>` JSX block (lines 311-328).
   - T18: adds `renderFooterSlot?` to TileGridProps; pass-through in
     same `<Tile>` JSX block.
   - **Conflict surface:** same — additive interface field + additive
     prop in one JSX block. Auto-merge expected.

3. `packages/dispatch-workstation/src/tile-grid/tile-grid-app.tsx`
   - T17: constructs `autopilotBridge` adapter (mirrors
     `pickerBridge`); adds `renderAutopilotSlot` closure; possibly
     adds methods to WorkstationBridgeShape.
   - T18: constructs `renderFooterSlot` closure (NO bridge per
     Q-MBT18-6=a); extends `setSessions` call at lines 121-127 to
     propagate `cwd` from SpawnSuccessReply.result.
   - **Conflict surface:** different sites within same file (T17
     around bridge-adapter block at lines 217-235; T18 around
     setSessions at 121-127 + new closure block). Mostly disjoint;
     auto-merge expected.

### MB-T18-only files (NO concurrent edit)

- `packages/dispatch-workstation/src/tile-grid/tile-footer.tsx`
  (NEW, WB1+WB2)
- `packages/dispatch-workstation/src/main/spawn-handler.ts`
  (WB2; cwd field on SpawnSessionResult)
- `packages/dispatch-workstation/test/unit/tile-footer/` (NEW)
- `packages/dispatch-workstation/test/unit/tile-grid-tile/
  probe-08-footer-slot-integration.spec.tsx` (NEW)
- `packages/dispatch-workstation/test/unit/tile-grid-app/
  probe-06-footer-render-prop.spec.tsx` (NEW)
- `packages/dispatch-workstation/tsconfig.json` (`exclude` entry,
  WB1)

### MB-T17-only files (per `mb-t17-diagnose-2026-05-07.md`; NO MB-T18 edit)

- `packages/dispatch-workstation/src/main/main.ts` (sentinel zone for
  autopilot IPC). **MB-T18 sidesteps main.ts entirely (Q-MBT18-10=a) —
  zero contention by design.**
- `packages/dispatch-workstation/src/main/autopilot-ipc.ts` (NEW)
- `packages/dispatch-workstation/src/main/preload.mts` (autopilot
  bridge methods)
- `packages/dispatch-workstation/src/tile-grid/tile-autopilot-
  toggle.tsx` (NEW)
- autopilot test directories

### Mitigations (CRITICAL — applied at every WB)

1. **Per-path `git add <path>`** for every staged file. NEVER `-A`,
   NEVER `.`. (CLAUDE.md §2.7 + operator brief.)
2. **Pre-commit `git status --short`** — verify ONLY this session's
   files staged. **HALT and surface if unexpected paths appear** —
   that's the other session's territory.
3. **Post-commit `git log -1 --stat`** — confirm commit content
   matches intent.
4. **Pull-before-WB on shared-file WBs.** Before WB3 (which edits
   tile.tsx + tile-grid.tsx + tile-grid-app.tsx), run `git pull
   --rebase origin main` to absorb any pushed T17 commits.
5. **Render-prop additivity** is merge-friendly by construction —
   distinct optional prop names on the same interface.
6. **Sentinel discipline** — T18 owns ZERO sentinel zones; T17 owns
   one new zone alone. Zero conflict on main.ts.
7. **Frozen-contract avoidance** — both tickets stay workstation-
   internal; daemon `CONDUCTOR_API_CONTRACT.md` untouched.

---

**HALT 0 — Phase 1 complete.** Awaiting operator review of
Q-MBT18-1..12 + R-MBT18-1..8 tentative dispositions before Phase 2
WB1.

When proceeding, operator says either:
- **"proceed with tentative dispositions, begin Phase 2 WB1"** —
  unanimous accept, WB1 starts.
- **"adjust Q-MBT18-N to (b/c/d/...)"** — disposition flip for
  specific questions before Phase 2.

Specific high-leverage operator decisions (in case more direction is
preferred):
- Q-MBT18-1 footer content set: `(e) cwd + uptime` is tentative; flip
  to (a) cwd-only / (d) uptime-only / (f) shell-only if scope wants
  to compress further.
- Q-MBT18-2 cwd source: `(a) extend SpawnSessionResult` is tentative;
  alternative is to skip cwd entirely (Q-MBT18-1=d).
- Q-MBT18-7 truncation: `(d) CSS-only` is tentative; flip to (a)
  middle-ellipsis if operator wants explicit basename preservation.
- Q-MBT18-12 SpawnSessionResult granularity: `(a) cwd field only` is
  tentative; flip to (b) full meta object if operator wants
  pre-emptive plumbing.
