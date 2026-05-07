# MB-T20 Phase 1 Diagnose — Conductor chat panel shell

**Date:** 2026-05-07
**Authoring HEAD:** `39e8134` (post-MB-T17 Phase 1 spike on main)
**Status:** Phase 1 surface inventory + open-questions surface;
operator-review HALT before Phase 2 WB1.
**Parallel-cairn context:** MB-T17 (Terminal A — autopilot toggle) +
MB-T18 (Terminal B — footer chrome) are running concurrently; this
diagnose verifies zero file-territory overlap before Phase 2.

This doc surfaces existing chat-panel territory + open questions
Q-MBT20-1..13 + risks R-MBT20-1..8 with tentative dispositions for the
**Conductor chat panel shell** ticket. The headline finding is that
`coarchitect/chat-panel.tsx` already ships a fully-working chat panel
with streaming + history + form input — so MB-T20 is plausibly NOT a
greenfield panel, but the **Family-B tab-host shell** that wraps the
existing chat as one tab among many (MB-T21 = Chat tab, MB-T22 =
Commits tab, MB-T23 = Tasks tab, T24-T27 = toggles + meters per
CLAUDE.md §5.3). **Q-MBT20-1 surfaces this interpretation as the
most consequential Phase 1 question.**

---

## I. Surface inventory

### I-A. Existing ChatPanel component (NOT a greenfield ticket)

**File:** `packages/dispatch-workstation/src/coarchitect/chat-panel.tsx`
(151 lines, COARCH-T02 baseline + COARCH-T03 streaming wiring).

**KNOWN behavior** (read end-to-end, lines 1-151):

| Surface | Implementation |
|---|---|
| Container | flat `<div>` wrapper (no header, no footer, no chrome) |
| Message list | `<div role="log" aria-live="polite">` rendering `history.map((msg) => …)` with `<strong>{msg.role}</strong>: {msg.content}` |
| Input area | `<form onSubmit={handleSubmit}><input ref={inputRef} data-testid="chat-input" /><button data-testid="send-button">Send</button></form>` |
| Streaming UI | `inProgress` chunk accumulator + `Thinking…` / `Deliberating…` (2s timer per F3-UX-1) + `streamError` alert |
| IPC | `daemonClient.fetchHistory()` + `daemonClient.postMessage()` (non-streaming path) + `streamingBridge.sendAndStream() / onStream{Chunk,Done,Error}` (streaming path) |

**Test sentinels emitted:** `RENDER_OK`, `STREAM_START`, `STREAM_DONE
{preview}`, `STREAM_ERROR {code}`, `MESSAGE_SENT {content}`. Already
exercised by integration suite.

**Implication:** the operator's Phase 1 acceptance ("panel container,
message list, input area, read-only message list, input renders +
onSubmit stub") **describes a STRICT SUBSET of what already ships
today**. Three coherent interpretations of MB-T20 follow (Q-MBT20-1).

### I-B. Existing chat IPC bridge (already wired)

**File:** `packages/dispatch-workstation/src/main/preload.mts:7-32`
(KNOWN).

`coarchitectBridge` exposes 9 methods:
- `fetchHistory()` → `ipcRenderer.invoke('coarchitect:fetchHistory')`
- `postMessage(msg)` → `ipcRenderer.invoke('coarchitect:postMessage', msg)`
- `sendAndStream(content)` → `ipcRenderer.send('coarchitect:sendAndStream', content)`
- `getBuildDocConfig()` / `setBuildDocConfig()` / `clearBuildDocConfig()` (COARCH-T04)
- `onStreamChunk(cb)` / `onStreamDone(cb)` / `onStreamError(cb)` (with cleanup-fn returns)

**Implication:** the operator brief's "Wires through existing chat IPC
(or surfaces a Phase 1 question if no chat IPC yet exists)" — chat IPC
EXISTS. No greenfield bridge needed unless MB-T20 owns a NEW set of
non-chat channels (e.g., tab-state persistence). See Q-MBT20-5.

### I-C. Existing main-process IPC handlers

**File:** `packages/dispatch-workstation/src/main/coarchitect-ipc.ts`
(imported by `main.ts:14`, KNOWN).

**Implication:** MB-T20 does NOT need to author new chat handlers. If
a tab-state persistence channel is desired (Q-MBT20-5), one new
handler is in scope; if not, ZERO main-process surface.

### I-D. workstation-shell.html chat region (mount point)

**File:** `packages/dispatch-workstation/src/main/workstation-shell.html`
(KNOWN, lines 80-83 + 251-253 + 555).

**Current structure:**
- CSS region `#chat-region` (line 80-83): `overflow:hidden;
  flex-shrink:0;` with inline `style="height:280px"` (line 251)
- DOM mount: `<div id="root"></div>` (line 252)
- Auto-mount script: `<script src="../coarchitect/renderer.js"></script>`
  (line 555) — `coarchitect/mount.ts` calls `mountChatPanel({
  rootElementId: 'root', daemonClient: …, streamingBridge: bridge })`
  on load.

**Implication:** the chat-region MOUNT POINT is owned by coarchitect
today. MB-T20 either (a) replaces the script tag with a new
`chat-shell/renderer.js` that mounts a tab host that itself contains
ChatPanel as one tab, (b) adds a wrapper that loads BOTH renderers, or
(c) builds inside coarchitect/ (rejected — naming + ownership smell).
See Q-MBT20-3 + Q-MBT20-4.

### I-E. Auto-mount adapter pattern

**File:** `packages/dispatch-workstation/src/coarchitect/mount.ts:46-58`
(KNOWN).

```ts
const bridge = window.coarchitectBridge;
if (bridge) {
  mountChatPanel({ rootElementId: 'root', daemonClient: createBridgeAdapter(bridge), streamingBridge: bridge });
} else {
  mountChatPanel({ rootElementId: 'root', daemonClient: createStubDaemonClient() });
}
```

**Implication:** the existing auto-mount pattern is the precedent for
MB-T20's mount strategy. New chat-shell renderer follows the same
auto-mount-on-load shape.

### I-F. Open chartered followups touching the chat panel

| Line | ID | Tier | MB-T20 relation |
|---|---|---|---|
| 123 | `MB-F-COARCH-T02-STYLING` | (operator-arbitrated new ticket required per body) | **Plausible CHARTERED CLOSURE for MB-T20** if ticket scope includes production-quality CSS styling matching modern LLM chat aesthetic |
| 125 | `MB-F-COARCH-T02-DEFAULT-LAYOUT` | (revisit when styling lands) | **Plausibly closed at WB4** with revisited 280px default if styling is in-scope |

**Implication:** if Q-MBT20-1=B (refactor coarchitect into polished
panel) is the chosen interpretation, MB-T20 is the operator-
arbitrated closer of these followups. If Q-MBT20-1=A (tab host),
these followups remain open for a future MB-Tx styling pass on Chat
tab content (likely MB-T21).

### I-G. Workstation flat directory convention (CLAUDE.md §3.2)

**Existing surfaces** (verified via `ls
packages/dispatch-workstation/src/`):
- `audit-modal/`, `coarchitect/`, `console-panel/`, `error-display/`,
  `main/`, `onboarding/`, `tile-grid/`

**MB-T20 candidate directory:** new flat sibling. Naming options:
- (a) `chat-shell/` — preferred per "Conductor chat panel SHELL"
  wording; avoids naming collision with existing
  `coarchitect/chat-panel.tsx`.
- (b) `chat-panel/` — operator brief mentioned this name verbatim, but
  collides with `coarchitect/chat-panel.tsx` (file-finder confusion +
  test-import ambiguity).
- (c) `conductor-chat/` — semantically clean per CONDUCTOR_V3_RESCOPE
  line 15 ("orchestrator chat panel"), but breaks Family-B "T21 Chat
  tab" naming continuity.

See Q-MBT20-2.

### I-H. Per-renderer build pipeline (CLAUDE.md §3.7)

Existing build scripts (`packages/dispatch-workstation/scripts/`):
- `build-audit-modal.mjs`, `build-card-bridge.mjs`,
  `build-coarchitect.mjs`, `build-console-panel.mjs`,
  `build-onboarding.mjs`, `build-preload.mjs`, `build-shell.mjs`,
  `build-tile-grid.mjs`

**Implication:** MB-T20 needs `build-chat-shell.mjs` (or whatever
final dir name resolves to per Q-MBT20-2) that mirrors
`build-coarchitect.mjs` shape (esbuild, platform:browser,
target:chrome130, jsx:automatic, bundle:true). Plus a one-line
addition to the package `build` script chain.

### I-I. Parallel-session territory (MB-T17 + MB-T18 cross-check)

**MB-T17 territory** (KNOWN per `docs/coordination/mb-t17-diagnose-2026-05-07.md`):
- NEW: `src/main/autopilot-ipc.ts`,
  `src/tile-grid/tile-autopilot-toggle.tsx`, `test/unit/autopilot-ipc/`,
  `test/unit/tile-autopilot-toggle/`,
  `test/unit/tile-grid-tile/probe-07*`,
  `test/unit/tile-grid-app/probe-05*`
- MODIFIED: `src/tile-grid/tile.tsx`, `src/tile-grid/tile-grid.tsx`,
  `src/tile-grid/tile-grid-app.tsx`, `src/main/preload.mts`,
  `src/main/main.ts` (sentinel `MB-T17 autopilot IPC`),
  `src/main/tsconfig.json`

**MB-T18 territory** (MODELED from operator brief "footer chrome" +
existing slot at `tile.tsx:206` `<div data-slot="footer"
data-testid={`tile-footer-slot-${sessionName}`} />` + line-16/28
`<slot:footer>` annotation; no diagnose committed to main yet — likely
in Terminal B's worktree):
- NEW: `src/tile-grid/tile-footer.tsx`, footer-related tests
- MODIFIED: `src/tile-grid/tile.tsx`,
  `src/tile-grid/tile-grid.tsx`, `src/tile-grid/tile-grid-app.tsx`,
  `src/main/preload.mts` (if footer needs new bridge),
  `src/main/main.ts` (sentinel `MB-T18 footer`),
  `src/main/tsconfig.json`

**MB-T20 territory (proposed, Q-MBT20-2/3/5 dependent):**
- NEW: `src/chat-shell/<files>`, `scripts/build-chat-shell.mjs`,
  `test/unit/chat-shell/`
- MODIFIED: `src/main/main.ts` (sentinel `MB-T20 chat panel`),
  `src/main/tsconfig.json` (.tsx exclude append),
  `src/main/workstation-shell.html` (line 555 script-tag swap +
  optional inline-CSS adjustments to #chat-region),
  `src/main/preload.mts` (only if Q-MBT20-5=b — new bridge methods)

**Zero-overlap verification:**

| File class | T17 touches? | T18 touches? | T20 touches? | Overlap? |
|---|---|---|---|---|
| `src/tile-grid/*` | YES | YES (likely) | NO | No T20 conflict |
| `src/main/autopilot-ipc.ts` | YES (new) | NO | NO | No T20 conflict |
| `src/main/coarchitect-ipc.ts` | NO | NO | NO (read only) | None |
| `src/coarchitect/*` | NO | NO | NO (read only at WB1) | None |
| `src/chat-shell/*` (new) | NO | NO | YES | None |
| `src/main/main.ts` | YES (new sentinel zone) | YES (new sentinel zone) | YES (new sentinel zone) | **Sentinel discipline mandatory; non-overlapping zones** |
| `src/main/preload.mts` | YES (autopilot bridge) | MAYBE (footer bridge) | MAYBE (Q-MBT20-5=b) | **Append-only discipline; per-path git add** |
| `src/main/tsconfig.json` | YES (.tsx exclude append) | YES (.tsx exclude append) | YES (.tsx exclude append) | **Array-append; merge-resolvable but commit-time check required** |
| `src/main/workstation-shell.html` | NO | NO | YES (line 555 script tag) | **T20 sole owner** |
| `src/main/coarchitect-ipc.ts` | NO | NO | NO | None |

**Verdict:** ZERO direct file overlap between MB-T20 and MB-T17/T18 in
NEW directory territory (chat-shell vs autopilot-ipc/tile-autopilot-
toggle/tile-footer + tile-grid/). Three SHARED files
(`main.ts`, `tsconfig.json`, `preload.mts`) require sentinel +
append-only + per-path-git-add discipline (CLAUDE.md §2.7 + §3.3).
`workstation-shell.html` is MB-T20-only.

---

## II. Open questions Q-MBT20-1..13

### Q-MBT20-1: Ticket scope — Family-B tab-host shell vs standalone chat panel refactor?

**Most consequential Phase 1 question.** Three plausible
interpretations:

- **(a) Family-B tab-host shell** — MB-T20 is the SHELL that hosts
  multiple tabs (Chat, Commits, Tasks, etc. per CLAUDE.md §5.3). MB-T20
  ships: tab-strip + active-tab content slot + minimal Chat tab
  containing existing ChatPanel as default-selected tab. MB-T21 then
  refactors/replaces the Chat tab content. **Acceptance** maps to:
  panel container = tab-host wrapper; message list = ChatPanel
  message list (delegated); input area = ChatPanel form (delegated).
- **(b) Standalone chat panel polish** — MB-T20 is the operator-
  arbitrated closer of `MB-F-COARCH-T02-STYLING` +
  `MB-F-COARCH-T02-DEFAULT-LAYOUT`. Refactors `coarchitect/chat-panel.tsx`
  into a polished panel (production CSS, role-based message bubbles,
  better input affordance). NO tabs. **Acceptance** maps to: container
  = polished outer chrome; message list = restyled history; input
  area = restyled form.
- **(c) New parallel chat panel** — MB-T20 ships an entirely new
  panel for a DIFFERENT actor (e.g., the future MB-T35 reasoning-loop
  Conductor, distinct from the coarchitect chat). Coarchitect stays
  unchanged. Both chats coexist (would require splitter or stacked
  layout). **Strongly disfavored** — no current contract or rescope-
  doc text supports a second parallel chat.

**Tentative disposition: (a) — Family-B tab-host shell** —
strongest evidence is CLAUDE.md §5.3 explicitly listing MB-T20 as
"shell" and MB-T21 as "Chat tab", which presupposes a tab-host
distinction. Operator brief's "panel container + message list +
input area" is describable as the WB1-shippable initial state of the
tab-host (Chat tab is the only tab; Chat tab content is delegated to
the existing ChatPanel pending MB-T21 refactor). **HALT-flag — the
operator MUST confirm or correct this interpretation before Phase 2;
the WB ladder shape pivots on this answer.**

### Q-MBT20-2: Directory naming for new surface

- **(a)** `chat-shell/` — preferred; matches "Conductor chat panel
  SHELL" wording; avoids collision with existing
  `coarchitect/chat-panel.tsx`; reads naturally in
  `<script src="../chat-shell/renderer.js">`.
- (b) `chat-panel/` — operator brief used this name verbatim, but
  COLLIDES with `coarchitect/chat-panel.tsx` filename: tooling autocomplete and grep ambiguity inevitable.
- (c) `conductor-chat/` — semantically clean per CONDUCTOR_V3_RESCOPE
  line 15 ("orchestrator chat panel"), but breaks Family-B continuity
  (T21 Chat tab + T22 Commits tab + T23 Tasks tab — they all live
  inside one container; `chat-shell/` reads as the container).

**Tentative disposition: (a)** — naming hygiene + Family-B continuity
+ avoids the hard collision in (b).

### Q-MBT20-3: Existing coarchitect/chat-panel.tsx — wrap, replace, or coexist?

Branches off Q-MBT20-1:
- If Q-MBT20-1=a (tab host): chat-shell renders ChatPanel inside the
  Chat tab via direct import (`import { ChatPanel } from
  '../coarchitect/chat-panel.js'`). **Wrap, do not replace.**
- If Q-MBT20-1=b (standalone polish): chat-shell ABSORBS chat-panel.tsx
  (move + restyle); coarchitect/ keeps daemon-client +
  build-doc-state + tier4-builder + context-builder etc. (the
  non-UI core). **Replace, with file-move + import-update.**
- If Q-MBT20-1=c (parallel chat): chat-shell ships its own message
  list + input independent of coarchitect. **Coexist; zero shared
  code.**

**Tentative disposition: (a-aligned wrap)** — Phase-2 imports
ChatPanel from coarchitect into chat-shell's Chat tab content slot.
**Critical: NO modification to coarchitect/chat-panel.tsx in MB-T20.**

### Q-MBT20-4: Mount target inside workstation-shell.html

The chat-region's `#root` mount is currently consumed by
`coarchitect/renderer.js` (line 555). Three plausible re-wirings:
- **(a)** Replace line 555 with `<script
  src="../chat-shell/renderer.js"></script>`; chat-shell renderer
  mounts tab-host into `#root`; tab-host's Chat tab body
  programmatically imports + renders ChatPanel directly (no nested
  mount). **Cleanest; mirrors existing one-renderer-per-region rule.**
- (b) Keep line 555; add another script tag for chat-shell that mounts
  into a NEW DOM element (sub-region inside #chat-region). Two
  renderers in one region. **Smell — duplicate React roots in same
  region.**
- (c) chat-shell wraps coarchitect — chat-shell mounts a host
  component, then triggers coarchitect's mount.ts to mount inside
  chat-shell's tab body via shared element id. **Mount-order
  fragility; rejected.**

**Tentative disposition: (a)** — single renderer per region; new
chat-shell renderer is the new owner; tab-host imports + renders
ChatPanel inline (React composition, no nested mount API).

### Q-MBT20-5: Bridge IPC — reuse coarchitectBridge, new bridge, or no IPC at WB1?

Per operator brief: "Input area renders but onSubmit is stub (no IPC
wiring at WB1; surfaces Phase 1 question)."

- **(a) Reuse coarchitectBridge** — chat-shell imports coarchitectBridge
  from window globals; passes through to the wrapped ChatPanel exactly
  as `coarchitect/mount.ts:46-58` does today. **No new IPC.**
- (b) New bridge `chatShellBridge` — adds tab-state persistence
  (e.g., `getActiveTab` / `setActiveTab`) + delegates chat methods.
  Plumbs through preload.mts as a NEW contextBridge.exposeInMainWorld.
- (c) WB1 stub — chat-shell renders with NO IPC; ChatPanel is
  imported but mocked with a stub DaemonClient (mirrors
  `createStubDaemonClient`); IPC wiring is a WB2+ scope.

**Tentative disposition: (a)** — Q-MBT20-1=a + Q-MBT20-3=wrap means
the wrapped ChatPanel keeps its existing IPC contract. Tab-state
persistence is a v3.1 polish followup unless explicitly in MB-T20
acceptance. **No preload.mts modification → zero T17 collision risk
on shared bridge file.**

### Q-MBT20-6: Closes MB-F-COARCH-T02-STYLING (FOLLOWUPS line 123)?

- (a) **Closes fully** — only if Q-MBT20-1=b.
- (b) **Closes partially** — chat-shell adds outer chrome styling
  (panel container border/header/title), inner ChatPanel styling
  remains a separate ticket. Compatible with Q-MBT20-1=a.
- (c) **Does NOT close** — styling deferred entirely.

**Tentative disposition: (b)** — under Q-MBT20-1=a, MB-T20 ships the
panel chrome (header text, container styling, tab strip), which is a
visible UX upgrade even though inner ChatPanel content remains
unstyled until MB-T21. File a v3.1 polish followup
`MB-F-T20-COARCH-STYLING-DEFERRED` if the Chat tab body remains
unstyled at WB4 close.

### Q-MBT20-7: Closes MB-F-COARCH-T02-DEFAULT-LAYOUT (FOLLOWUPS line 125)?

The 280px default chat-region height may not be optimal once tab strip
+ chrome land.

- (a) Closes — operator picks new default in MB-T20 WB4 with explicit
  rationale.
- (b) Defers — keeps 280px; revisits in dedicated layout pass.

**Tentative disposition: (a)** — adjacent UX surface; revisit lands
naturally with the visible chrome change. WB4 commits the new default
+ files closure note in WB5 findings.

### Q-MBT20-8: main.ts sentinel block name + placement

- **(a)** New sentinel `=== BEGIN: MB-T20 chat panel ===` (operator-
  approved name in brief), placed adjacent to existing MB-T16
  sentinel zone in main.ts. New zone holds: chat-shell-related
  imports (only if needed) + any tab-state persistence wiring
  (Q-MBT20-5 dependent). **At minimum, the sentinel block is
  COMMENTED-EMPTY at WB1 to reserve the territory.**
- (b) Reuse / extend an existing sentinel zone.

**Tentative disposition: (a)** — direct CLAUDE.md §3.3 mandate ("Add
new logic in NEW sentinel blocks"). Reserves namespace even if zero
new logic lands (defensive against parallel-cairn writes).

### Q-MBT20-9: Build script

- **(a)** New `scripts/build-chat-shell.mjs` mirroring
  `build-coarchitect.mjs` shape (esbuild platform:browser,
  target:chrome130, jsx:automatic). Add to package `build` script
  chain.
- (b) Extend `build-coarchitect.mjs` to also bundle chat-shell.
  Cross-package coupling smell; rejected.

**Tentative disposition: (a)** — direct precedent + clean isolation.

### Q-MBT20-10: Test directory layout (CLAUDE.md §3.6)

- **(a)** `test/unit/chat-shell/probe-NN-<descriptor>.spec.tsx` for
  shell render tests. WB-relevant only; full suite at WB final
  verification per CLAUDE.md §4.4.
- (b) Combine with existing `test/unit/coarchitect/`.

**Tentative disposition: (a)** — direct precedent (T15/T16/T17 each
have their own test/unit/<surface>/ directory).

### Q-MBT20-11: WB count — 5 or 7?

If Q-MBT20-1=a (tab host): 5-WB ladder is sufficient (mirror MB-T15/T16
shape — scaffold → impl → integration → wiring → docs).

If Q-MBT20-1=b (standalone polish): 7+ WBs likely (file-move + restyle
→ test rewrites + visual-regression coverage + production CSS module
+ default-height arbitration → docs).

- **(a)** 5 WBs (Q-MBT20-1=a-aligned)
- (b) 7 WBs (Q-MBT20-1=b-aligned)

**Tentative disposition: (a)** — pending Q-MBT20-1=a confirmation.

### Q-MBT20-12: tsconfig .tsx exclude policy

Workstation tsconfig.json `exclude` array entries for new .tsx files
(per MB-T11a discovery — `.tsx` files bundle via esbuild, not tsc).

- **(a)** Add chat-shell .tsx files to `exclude` at WB1. Same pattern
  as T16 (`tile-approval-picker.tsx`) + T17 plan
  (`tile-autopilot-toggle.tsx`).
- (b) Skip and accept tsc errors.

**Tentative disposition: (a)** — direct precedent.

### Q-MBT20-13: Ladder shape — mirror MB-T15/T16/T17?

- **(a) Strict mirror:** WB1 red (scaffold + decisions doc + tsconfig
  exclude + empty test directories) → WB2 green (chat-shell.tsx tab
  host + render tests) → WB3 green (chat-shell auto-mount +
  workstation-shell.html script-tag swap) → WB4 green (Chat tab body
  imports + renders ChatPanel; runtime-launch smoke; close
  COARCH-T02-STYLING + COARCH-T02-DEFAULT-LAYOUT partials) → WB5 docs
  (findings + v3.1 polish followups).
- (b) Different shape if Q-MBT20-1=b changes the ladder structurally.

**Tentative disposition: (a)** — mirror precedent assuming
Q-MBT20-1=a.

---

## III. Risks R-MBT20-1..8

### R-MBT20-1: Naming collision with existing coarchitect/chat-panel.tsx

**Surface:** if Q-MBT20-2=b (`chat-panel/` directory), all
file-finder + grep + import-statement work becomes ambiguous between
`coarchitect/chat-panel.tsx` and `chat-panel/chat-panel.tsx`.

**Severity:** HIGH for IDE workflow; MEDIUM for code correctness
(distinct module paths but tooling friction is real).

**Tentative disposition: AVOID via Q-MBT20-2=a (`chat-shell/`).**

### R-MBT20-2: Cross-session main.ts sentinel proximity

**Surface:** T17 is adding `MB-T17 autopilot IPC` zone, T18 is adding
`MB-T18 footer` zone, T20 will add `MB-T20 chat panel` zone — all
three in one file simultaneously. CLAUDE.md §2.7 mandates per-path
git add and pre-commit territory check.

**Severity:** LOW when discipline is followed; HIGH if `git add -A`
sneaks in.

**Tentative disposition: PER-PATH GIT ADD; pre-commit `git status
--short` MANDATORY before every commit; new sentinel zone placed at
non-overlapping line ranges (recommend: bottom of file, after MB-T16
zone but before any future T17/T18 zone — alphabetical-ish ordering).**

### R-MBT20-3: preload.mts shared file conflict

**Surface:** if Q-MBT20-5=b (new bridge), preload.mts gets a new
`contextBridge.exposeInMainWorld` block. T17 also adds 2 new methods
to `workstationBridge`. Concurrent edits are merge-resolvable but the
diff overlap risk is non-trivial.

**Severity:** ZERO if Q-MBT20-5=a (no preload changes); MEDIUM if
Q-MBT20-5=b.

**Tentative disposition: PREFER Q-MBT20-5=a → preload.mts UNCHANGED
by MB-T20.**

### R-MBT20-4: tsconfig.json `exclude` array shared-file conflict

**Surface:** T17 + T18 + T20 all need to append .tsx file paths to
`exclude`. Append order is non-conflicting in principle (textually
non-overlapping), but JSON arrays + parallel commits can produce
trivial conflicts.

**Severity:** LOW. Resolution is mechanical (sort + dedupe append).

**Tentative disposition: ACCEPT** — per-path git add + commit-time
verification handles it.

### R-MBT20-5: workstation-shell.html mount-point swap (line 555)

**Surface:** swapping `<script src="../coarchitect/renderer.js">` to
`<script src="../chat-shell/renderer.js">` removes coarchitect's
auto-mount path. Until WB4's chat-shell renderer renders ChatPanel
inline, the chat region is BLANK.

**Severity:** HIGH at intermediate WBs, ZERO at WB4 close.

**Tentative disposition: SWAP ONLY AT WB4** — earlier WBs leave line
555 untouched; chat-shell renderer is built but not yet mounted.
WB4 atomically swaps the script tag + commits the swap with the
ChatPanel import + runtime-launch smoke verification.

### R-MBT20-6: dispatch-core dist rebuild discipline (CLAUDE.md §3.4)

**Surface:** if MB-T20 imports new schema types from dispatch-core
(e.g., a TabState schema), workstation typecheck against the source
.ts succeeds while runtime ESM expects the .js artifact.

**Severity:** ZERO if MB-T20 introduces no new dispatch-core schema
exports; HIGH if it does.

**Tentative disposition: NO DISPATCH-CORE SCHEMA CHANGES IN SCOPE.**
Tab-state (if it lands) is workstation-local JSON persistence
mirroring `splitter-state.ts` (CLAUDE.md §3.5). No schema spine
ingress.

### R-MBT20-7: Runtime-launch smoke as merge gate (MB-F-WORKSTATION-RUNTIME-RELAUNCH-AS-MERGE-GATE)

**Surface:** mount-point swap (line 555) is a runtime-only change.
Typecheck + unit tests will not catch a broken script-tag path or a
build-script omission.

**Severity:** HIGH if smoke step is skipped; LOW with smoke.

**Tentative disposition: WB4 includes `pnpm --filter
dispatch-workstation exec electron dist/main/main.js` smoke per
CLAUDE.md §4.6, observing `WINDOW_READY` + `RENDER_OK` (the existing
ChatPanel sentinel) within ~10s. Findings doc records the smoke
result.**

### R-MBT20-8: Pre-existing chat-panel test suite drift

**Surface:** existing tests for ChatPanel
(`packages/dispatch-workstation/test/unit/coarchitect/`) assert exact
DOM structure (e.g., the bare `<div>` wrapper). If chat-shell wraps
ChatPanel in a tab-host, the rendered tree depth changes; some
existing assertions might fail.

**Severity:** UNKNOWN until WB4 integration runs. MEDIUM — likely
zero impact since ChatPanel itself is unchanged and existing tests
assert relative DOM structure within the component tree, not the
mount root.

**Tentative disposition: ACCEPT FOR INVESTIGATION AT WB4** — if
existing tests fail, fix-forward (extend selectors) within WB4 scope;
do NOT modify ChatPanel itself.

---

## IV. Territory map (zero overlap with T17/T18 confirmed)

### NEW (MB-T20-only)

```
packages/dispatch-workstation/src/chat-shell/
  chat-shell.tsx              ← tab host component
  mount.ts                    ← auto-mount adapter
  chat-shell.html?            ← optional standalone harness (mirrors coarchitect/chat-panel.html)
  tab-state-store.ts?         ← Q-MBT20-5=b only

packages/dispatch-workstation/scripts/
  build-chat-shell.mjs

packages/dispatch-workstation/test/unit/chat-shell/
  probe-01-render-tests.spec.tsx
  probe-02-tab-host-tests.spec.tsx?
```

### MODIFIED (shared with T17 / T18 — discipline mandatory)

| File | Change | Conflict risk |
|---|---|---|
| `src/main/main.ts` | NEW sentinel zone `=== BEGIN: MB-T20 chat panel ===` | LOW — non-overlapping line ranges per §3.3 |
| `src/main/tsconfig.json` | Append .tsx exclude entries | LOW — append-only array |
| `src/main/workstation-shell.html` | Line 555 script-tag swap (WB4 only); optional inline-CSS adjust to #chat-region | NONE — T20 sole owner |
| `src/main/preload.mts` | UNCHANGED if Q-MBT20-5=a | NONE under recommended disposition |
| `package.json` build script chain | Append `node scripts/build-chat-shell.mjs` | LOW — mechanical conflict |

### READ-ONLY (referenced but not modified)

- `src/coarchitect/chat-panel.tsx` (imported at WB4)
- `src/coarchitect/daemon-client.ts` (type imports only)
- `src/coarchitect/mount.ts` (pattern reference only)
- `src/main/coarchitect-ipc.ts` (no edits)

---

## V. Proposed ladder (5 WBs, Q-MBT20-1=a-aligned)

| WB | Type | Scope |
|---|---|---|
| WB1 | red | Scaffold: empty `chat-shell/chat-shell.tsx` + `chat-shell/mount.ts` (file shells), `scripts/build-chat-shell.mjs`, tsconfig .tsx exclude entries (per-path git add only), decisions doc capturing Q-MBT20-1..13 dispositions, stub probe directory `test/unit/chat-shell/` with placeholder render test asserting empty container + a fixed-position test sentinel. Pre-commit territory check: `git status --short` shows ONLY chat-shell/ + scripts/build-chat-shell.mjs + tsconfig + decisions doc + test placeholders — zero T17/T18 file leakage. |
| WB2 | green | `chat-shell.tsx` impl: tab-host component with tab strip + active-tab content slot. Render-prop slot for tab content (mirrors MB-T16 picker pattern). Initial tab set: single Chat tab (others stubbed pending MB-T21..T27). Render tests at `probe-01`. |
| WB3 | green | `mount.ts` impl: auto-mount adapter mirroring `coarchitect/mount.ts` shape. Adapter passes through coarchitectBridge to the inner ChatPanel (Q-MBT20-5=a). build-chat-shell.mjs produces `dist/chat-shell/renderer.js`. NO workstation-shell.html change yet. Mount tests at `probe-02`. |
| WB4 | green | Integration: chat-shell's Chat tab body imports + renders ChatPanel directly. workstation-shell.html line 555 swap (`coarchitect/renderer.js` → `chat-shell/renderer.js`). main.ts sentinel `=== BEGIN: MB-T20 chat panel ===` reserves namespace (may be no-op if zero new wiring). Runtime-launch smoke: `pnpm --filter dispatch-workstation exec electron dist/main/main.js` → observe `WINDOW_READY` + `RENDER_OK`. Closes MB-F-COARCH-T02-STYLING (partial: panel chrome) + MB-F-COARCH-T02-DEFAULT-LAYOUT (revisit default if needed). Integration probe `probe-03-chat-panel-tab-integration.spec.tsx` (verifies ChatPanel renders inside Chat tab body). |
| WB5 | docs | Findings doc + 3 v3.1 polish followups (Chat tab content styling deferral, tab-state persistence, additional Family-B tabs). Records runtime-launch smoke outcome. Records existing-test deltas (if any). |

**Estimated total tests:** ~20-30 (10 shell render + 5 mount adapter +
5-10 integration). Significantly fewer than T16/T17 because no IPC
controller class to test; the heaviest WB is integration.

**Estimated commits:** 5 + 1 docs (Phase 1 diagnose). Plus operator-
arbitrated final commit + push at HALT 2.

---

## VI. Out-of-scope confirmations

Per operator brief + Family-B tab-host interpretation (Q-MBT20-1=a):

- **LLM integration** — Conductor v2/v3 visibility surface; out of
  v3.x scope per CONDUCTOR_API_CONTRACT §9.
- **Streaming wiring** — already exists via coarchitectBridge; MB-T20
  does NOT touch streaming logic. (Acceptance phrasing "no streaming
  yet" applies to NEW MB-T20 code; the wrapped ChatPanel keeps its
  streaming.)
- **Message persistence** — already exists via daemon-client; MB-T20
  does NOT touch.
- **Footer chrome** — MB-T18 (Terminal B).
- **Per-tile autopilot toggle** — MB-T17 (Terminal A).
- **Tab content beyond Chat** — MB-T21 (Chat tab proper), MB-T22
  (Commits tab), MB-T23 (Tasks tab), MB-T24..T27 (toggles + meters).
- **Tab-state persistence** — only if Q-MBT20-5=b is selected;
  default disposition is OUT (Q-MBT20-5=a, no persistence at v3.0).
- **Chat tab inner styling** — defers to MB-T21 (Q-MBT20-6 partial-
  closure surfaces this).
- **Hero / squad layout** — MB-T19.
- **BUILD.md integration** — Family C (MB-T28..T33).
- **Anthropic API client** — MB-T34 hard prerequisite.
- **Reasoning loop** — MB-T35 hard prerequisite.

---

## VII. References

- MB-T17 ladder precedent: `docs/coordination/mb-t17-diagnose-2026-05-07.md`
- MB-T16 ladder precedent: `docs/coordination/mb-t16-decisions-2026-05-07.md`
  + `docs/coordination/mb-t16-findings-2026-05-07.md`
- Existing ChatPanel: `packages/dispatch-workstation/src/coarchitect/chat-panel.tsx`
- Existing chat IPC bridge: `packages/dispatch-workstation/src/main/preload.mts:7-32`
- workstation-shell.html chat region: lines 80-83 + 251-253 + 555
- Open chartered followups: `docs/FOLLOWUPS.md:123` (MB-F-COARCH-T02-STYLING)
  + `:125` (MB-F-COARCH-T02-DEFAULT-LAYOUT)
- CLAUDE.md sections governing: §2.5 halt, §2.7 per-path git add,
  §3.2 flat directory convention, §3.3 sentinel zones, §3.6 test
  layout, §3.7 build pipeline, §4.1 WB ladder, §4.2 HALT gates,
  §4.6 runtime-launch smoke.

---

**HALT 0 — Phase 1 complete.** Awaiting operator review of Q-MBT20-1..13
+ R-MBT20-1..8 tentative dispositions before Phase 2 WB1.

**Most consequential open question:** Q-MBT20-1 (tab-host shell vs
standalone polish vs parallel chat). The WB ladder shape pivots on
the answer. Tentative disposition is (a) Family-B tab-host shell
based on CLAUDE.md §5.3 architecture wording, but operator must
confirm or correct before scaffold begins.

When proceeding, operator says either:
- **"proceed with tentative dispositions, begin Phase 2 WB1"** —
  unanimous accept (Q-MBT20-1=a), WB1 starts.
- **"adjust Q-MBT20-N to (b/c)"** — disposition flip for specific
  questions before Phase 2; ladder shape may pivot if Q-MBT20-1
  changes.
