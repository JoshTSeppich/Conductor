# MB-T21 Phase 1 Diagnose — Chat tab proper

**Date:** 2026-05-07
**Terminal:** A (4-session parallel-cairn run)
**HEAD at start:** `934c0a8` (origin/main, clean)
**Ticket charter:** wireframe-tickets-inventory.md §3 — "MB-T21 — Chat tab"
**Closes followup:** `MB-F-T20-CHAT-TAB-CONTENT-STYLING` (Tier 2; filed at MB-T20 WB5)
**Predecessor:** MB-T20 (Family-B tab-host shell, shipped at `734298b`)

All factual claims labelled per CLAUDE.md §2.2.

---

## I. Surface inventory

### I-A. Existing chat-panel territory — `[KNOWN]`

`packages/dispatch-workstation/src/coarchitect/chat-panel.tsx` (151 lines) is
the current chat surface. Renders flat unstyled HTML inside the chat-shell
tab body via `mount.ts:60-66` `makeChatPanelRenderChatTab`. Visible structure:

```
<div>
  <div role="log" aria-live="polite">
    {history.map(msg => (
      <div key={msg.id}><strong>{msg.role}</strong>: {msg.content}</div>
    ))}
    {inProgress && <div><strong>assistant</strong>: {inProgress}</div>}
  </div>
  {thinking && !inProgress && <div aria-live="assertive">…</div>}
  {streamError && <div role="alert">…</div>}
  <form onSubmit={handleSubmit}>
    <input data-testid="chat-input" … />
    <button data-testid="send-button" type="submit">Send</button>
  </form>
</div>
```

State: `history: ChatMessage[]`, `thinking`, `deliberating`, `inProgress: string`,
`streamError: { code, message } | null`. Streaming is wired through
`StreamingBridge.sendAndStream / onStreamChunk / onStreamDone / onStreamError`.

**Per MB-T20 Q-MBT20-3=a invariant:** chat-panel.tsx was NOT modified by
MB-T20. **Per `MB-F-T20-CHAT-TAB-CONTENT-STYLING` charter:** MB-T21 has
explicit license to *replace or refactor* this content. Existing
`chat-input` + `send-button` testids are referenced by `probe-03` integration
tests at `test/unit/chat-shell/probe-03-chat-panel-integration.spec.tsx`
+ `test/integration/coarch-t02/chat-input-emits-event.test.ts`; these
testids MUST remain stable across the refactor.

### I-B. Outer chat-shell — `[KNOWN]` (frozen for MB-T21)

`packages/dispatch-workstation/src/chat-shell/{chat-shell.tsx,mount.ts}` —
MB-T20 territory. Tab-host with single Chat tab; renderChatTab slot wraps
ChatPanel via `createDaemonClientAdapter(bridge)` + bridge.

**Status for MB-T21:** chat-shell.tsx itself is **out of scope for MB-T21**.
Terminal B (MB-T22) will extend chat-shell.tsx for multi-tab state machine
per `MB-F-T20-FAMILY-B-ADDITIONAL-TABS`. mount.ts adapter is kept as-is —
ChatPanel import stays.

### I-C. Coarchitect IPC contract — `[KNOWN]` (frozen — preload.mts unchanged)

`packages/dispatch-workstation/src/main/preload.mts:7-32` exposes
`coarchitectBridge`:
- `fetchHistory()` → `Promise<ChatMessage[]>`
- `postMessage(msg)` → `Promise<ChatMessage>`
- `sendAndStream(content: string)` → fires-and-forgets via `ipcRenderer.send`
- `onStreamChunk/Done/Error(cb)` → returns cleanup-fn

**Per MB-T20 Q-MBT20-5=a invariant:** preload.mts unchanged across MB-T20.
**Per ticket charter:** "Quick-pick options fire IPC back as if operator
typed the option text" — quick-pick clicks reuse `sendAndStream(optionText)`.
**No new IPC channel required** for MB-T21.

### I-D. ChatMessage row shape — `[KNOWN]`

`coarchitect/daemon-client.ts:8-15`:

```ts
interface ChatMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string;
  readonly created_at: string;
  readonly build_doc_id: string | null;
  readonly build_doc_commit_sha: string | null;
}
```

**Field-aligned with `OrchestratorMessageRow` in `dispatch-core/src/v3/schema.ts`**
(per daemon-client.ts:1-7 doc comment). Adding fields here is a frozen-contract
surface change → operator-arbitrated only.

**MB-T21 ticket spec calls for "quick-pick options" + "spawned-list block"**
which have NO existing field on ChatMessage. This is the central scope
question — see §III Q-MBT21-1.

### I-E. Schema variant for multi-choice — `[KNOWN]`

`packages/dispatch-core/src/v3/schema.ts:213-222`:

```ts
MultiChoiceCardOutputSchema = z.object({
  type: z.literal('multi-choice-card'),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(4),
  rationale: z.string().min(1),
  build_doc_commit_sha: z.string().min(1),
  superseded_card_ids: z.array(z.string()).default([]),
}).strict();
```

Currently routed by `orchestrator-output-router.ts:75` to **dispatch-web kanban
webview** via `orchestrator-card-rendered` event. NOT routed into the chat
panel. dispatch-web's `orchestrator-cards/orchestrator-card.tsx:141-192`
already implements `MultiChoiceVariant` with option buttons firing
`onMultiChoiceSelect(idx, freeForm)` — but this is webview territory, not
chat-panel territory.

**Implication:** "quick-pick" in the MB-T21 charter is *visually similar* to
multi-choice options but flows through chat-panel and emits `sendAndStream`,
not the orchestrator-card kanban flow.

### I-F. Test patterns — `[KNOWN]`

- `test/unit/chat-shell/probe-{01,02,03}-*.spec.tsx` — existing chat-shell
  probes (17 tests). probe-04 is the next number in sequence.
- `test/integration/coarch-t02/chat-panel-renders.test.tsx` +
  `chat-input-emits-event.test.ts` — legacy chat-panel integration tests.
  These exercise the existing chat-panel directly; if I refactor
  chat-panel.tsx in place, they constrain testid stability.
- Test convention: `.spec.tsx` for unit (vitest happy-dom), `.test.tsx` /
  `.test.ts` for integration. New chat-tab tests follow this.

### I-G. Build pipeline — `[KNOWN]`

`scripts/build-chat-shell.mjs` bundles `src/chat-shell/mount.ts` →
`dist/chat-shell/renderer.js`. Since `mount.ts` imports
`coarchitect/chat-panel.js`, esbuild transitively bundles the chat-panel
refactor automatically. **No new build script needed for MB-T21.**

### I-H. Sentinel zones in main.ts — `[KNOWN]`

`packages/dispatch-workstation/src/main/main.ts:63-70` reserves an empty
`=== BEGIN: MB-T20 chat panel ===` zone. **MB-T21 is renderer-side only:** no
IPC handlers, no main.ts code paths required. **Tentative:** zero main.ts
touches in MB-T21. If a sentinel zone is needed (e.g., for a console-message
allowlist extension or a chat-tab-mounted sentinel forwarder), it would be a
new `=== BEGIN: MB-T21 chat tab ===` zone adjacent to MB-T20's.

---

## II. Risks (R-MBT21-N)

| ID | Risk | Severity | Tentative mitigation |
|---|---|---|---|
| **R-MBT21-1** | Refactoring chat-panel.tsx in place breaks `test/integration/coarch-t02/chat-input-emits-event.test.ts` + probe-03 if they reference internals beyond `chat-input` + `send-button` testids | Medium | WB1 red includes a read-pass over both legacy tests; refactor preserves both testids verbatim |
| **R-MBT21-2** | Quick-pick option metadata has NO existing ChatMessage field; sourcing options requires either (a) frozen-contract schema change [operator-arbitrated], (b) sentinel-marker parse from assistant `content` [renderer-only], or (c) deferring quick-pick out of MB-T21 [conflicts with ticket acceptance] | High | Q-MBT21-2 — propose sentinel-marker parse; followup tracks schema-first-class upgrade in v3.1 |
| **R-MBT21-3** | Spawned-list `spawned: [...]` block likewise has no ChatMessage field; same trichotomy as R-MBT21-2 | High | Q-MBT21-3 — same disposition as R-MBT21-2 |
| **R-MBT21-4** | Terminal B (MB-T22) will modify `chat-shell/chat-shell.tsx` to add multi-tab; if I refactor inside chat-shell.tsx, atomic-chain commit racing | Low | I will NOT touch chat-shell.tsx. Territory: `coarchitect/chat-panel.tsx` + new sub-component files in `coarchitect/` only |
| **R-MBT21-5** | probe-04 filename collision with Terminal B's probe additions in `test/unit/chat-shell/` | Low | Q-MBT21-5 — propose probe lives in `test/unit/coarchitect/probe-04-chat-tab.spec.tsx` (chat-panel territory) NOT chat-shell directory |
| **R-MBT21-6** | Pre-existing `MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL` will surface in any unit run touching `coarchitect-ipc` directory | Low | Per CLAUDE.md §4.5 do NOT re-diagnose; scope WB test runs to coarchitect/chat-panel + new probes only, not full coarchitect-ipc directory |
| **R-MBT21-7** | Runtime-launch smoke (CLAUDE.md §4.6) is required for any merge that touches `src/main/*.ts`; if MB-T21 stays renderer-only, smoke is technically not gated, but `RENDER_OK` should still fire post-refactor — regression risk if mount path breaks | Medium | WB4/WB5 includes runtime smoke verifying RENDER_OK + new chat-tab sentinel (if added) |
| **R-MBT21-8** | dispatch-web kanban already implements multi-choice option buttons; risk that operator wants chat-panel quick-pick to share component with dispatch-web instead of duplicating | Low | Q-MBT21-7 — explicitly ask: extract shared component, or duplicate? Default: duplicate (cross-package extraction is scope creep) |
| **R-MBT21-9** | Atomic-chain commit pattern (MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT, Tier 1) MANDATORY in 4-session run | High if dropped | Every commit follows the 7-step atomic-chain pattern verbatim per ticket prompt |

---

## III. Open questions (Q-MBT21-N)

### Q-MBT21-1 — Refactor target & module location

Where does the new bubble/quick-pick/spawned-list code live?

- **(a) [Recommended]** Refactor `coarchitect/chat-panel.tsx` in place; extract
  sub-components (`chat-bubble.tsx`, `quick-pick-buttons.tsx`,
  `spawned-list.tsx`) into `coarchitect/`. ChatPanel keeps its export
  signature (`ChatPanel`, `StreamingBridge`, `ChatPanelProps`) so mount.ts
  import stays unchanged. Existing testids preserved.
- (b) Create new `chat-shell/chat-tab.tsx` that internally composes a refactored
  ChatPanel + new sub-components; mount.ts switches `renderChatTab` to import
  ChatTab instead of ChatPanel. coarchitect/chat-panel.tsx gradually deprecated.
  Risk: chat-shell territory is shared with Terminal B (MB-T22) —
  cross-session collision potential.
- (c) Keep chat-panel.tsx as-is; build new sub-components purely additive.
  Bubble structure layered as a wrapper around existing list. Conservative
  but doesn't actually deliver "bubble" structure cleanly — visual quality
  goal of `MB-F-T20-CHAT-TAB-CONTENT-STYLING` underdelivered.

**Tentative:** (a) — territory disjoint from Terminal B, preserves IPC
invariants, delivers visual goal cleanly.

### Q-MBT21-2 — Quick-pick options data source

Where does the orchestrator say "here are 2-4 quick-pick options for this
turn"?

- (a) **Schema change** — extend `OrchestratorMessageRow` /
  `daemon-client.ts:ChatMessage` with optional `quick_pick_options?: string[]`.
  Daemon mints/persists; coarchitect-ipc surfaces. **Touches frozen schema
  — operator-arbitrated.**
- (b) **[Recommended]** Sentinel-marker parse — orchestrator emits a
  parseable marker inside assistant message `content` (e.g., a JSON-fenced
  block at end of message: `\n\nQUICK_PICK: ["opt1", "opt2"]\n`). Renderer
  parses + renders. No schema/IPC change. v3.1 followup tracks first-class
  schema upgrade once orchestrator output stabilizes.
- (c) Reuse `MultiChoiceCardOutputSchema` — when assistant message stream
  ends with a parseable multi-choice-card JSON, ALSO render inline as
  quick-pick (in addition to current kanban routing). No schema change;
  reuses existing emit from `routeOrchestratorOutput`.
- (d) Defer quick-pick to v3.1; ship MB-T21 without quick-pick. **Conflicts
  with ticket acceptance criterion "integration test for quick-pick → IPC
  roundtrip".**

**Tentative:** (b) sentinel-marker parse with renderer-side detection. (c) is
attractive but conflates two distinct semantic streams (chat-bubble
quick-pick vs. orchestrator-card multi-choice → kanban) and would create a
race between two UI surfaces wanting to handle the same payload. Operator
preference required.

### Q-MBT21-3 — Spawned-list `spawned: [...]` data source

Same shape as Q-MBT21-2 for spawned-session lists in assistant messages.

- (a) Schema change — `ChatMessage.spawned_session_names?: string[]`. Frozen.
- (b) **[Recommended]** Sentinel-marker parse — assistant content ends with
  `\n\nspawned: ["sess1", "sess2"]\n` block; renderer parses + renders inline.
- (c) Defer.

**Tentative:** (b), paired with Q-MBT21-2 disposition. Marker formats are
operator-defined; suggested `QUICK_PICK: [...]` and `spawned: [...]` literal
forms but operator may prefer alternates.

### Q-MBT21-4 — Quick-pick click → which IPC?

Confirms ticket-spec invariant: `bridge.sendAndStream(optionText)` — same
pathway as text input (operator typing).

- (a) **[Recommended]** sendAndStream(optionText) — verbatim ticket spec.
  Renders option click as if operator typed; inProgress flow + streaming
  identical to text submit.
- (b) Distinct IPC channel (e.g., `coarchitect:quickPickClicked`) — adds
  new IPC; touches preload.mts (frozen).

**Tentative:** (a). No preload change.

### Q-MBT21-5 — Test directory placement

Where do the new probes live?

- (a) **[Recommended]** `test/unit/coarchitect/probe-04-chat-tab.spec.tsx`
  (+ probe-05 for quick-pick, probe-06 for spawned-list). chat-panel.tsx
  lives in coarchitect/ source dir; tests mirror that layout. Avoids
  filename collision with Terminal B in chat-shell/ test dir.
- (b) `test/unit/chat-shell/probe-04-chat-tab-bubbles.spec.tsx`. Per
  CLAUDE.md §3.6 chat-shell-territory tests live in chat-shell test dir.
  Higher collision risk with MB-T22.

**Tentative:** (a). Note `test/unit/coarchitect/` does not currently exist
as a directory — would be NEW, mirrors `test/unit/chat-shell/` shape.
Existing legacy chat-panel tests live in `test/integration/coarch-t02/`
(integration-only). Creating `test/unit/coarchitect/` for new unit probes
is consistent with the §3.6 unit/integration split convention.

### Q-MBT21-6 — Integration test scope

Where does "integration test for quick-pick → IPC roundtrip" live?

- (a) **[Recommended]** `test/integration/chat-shell/quick-pick-roundtrip.test.tsx`
  — exercises `mountChatShell({bridge: fakeBridge})` → render quick-pick
  options → click → assert `bridge.sendAndStream` called with option text.
  happy-dom; no Electron boot; pure renderer-level assertion.
- (b) `test/integration/coarchitect-action-routing/` — extends existing
  coarchitect-ipc integration suite. Higher boot cost; touches main-process
  scope unnecessarily.
- (c) Skip integration test, fold into unit probe-05. Conflicts with
  ticket acceptance ("integration test for quick-pick → IPC roundtrip").

**Tentative:** (a).

### Q-MBT21-7 — Quick-pick UI shared with dispatch-web?

dispatch-web's orchestrator-card.tsx already implements `MultiChoiceVariant`
button list. Reuse vs. duplicate?

- (a) **[Recommended]** Duplicate — chat-panel quick-pick is a small
  primitive (3-line button.map); cross-package extraction is scope creep
  for a small UI surface.
- (b) Extract to `dispatch-core` or new shared package; both consumers
  import. Substantial refactor; touches multiple package boundaries.

**Tentative:** (a).

### Q-MBT21-8 — Scroll-pinning behavior

Ticket says "scroll-pinned" for newest message. Implementation choices:

- (a) **[Recommended]** Tail anchor with `useEffect(() => anchor.scrollIntoView({block:'end'}), [history.length, inProgress])`. Auto-scrolls when new history row arrives or streaming chunk extends inProgress. Simple, vanilla React.
- (b) Smart-pin (only auto-scroll if user is already at bottom; don't yank if scrolled up). More UX-correct but adds complexity (scroll-position
  detection + ref).

**Tentative:** (a) for v3.0 scope; (b) is potential v3.1 polish followup.

### Q-MBT21-9 — Avatar source / styling depth

"Bubble messages with avatar" — what's the avatar shape?

- (a) **[Recommended]** Letter glyph (operator: "O", conductor: "C") — no
  asset pipeline, no image fetch. Cheap for v3.0.
- (b) Emoji (operator: 👤, conductor: 🤖) — no asset pipeline; modern
  chat-app feel.
- (c) Inline SVG icon — explicit visual design; scope creep for v3.0.

**Tentative:** (a) for legibility + monochrome aesthetic; or (b) if
operator prefers emoji feel. Operator preference question.

### Q-MBT21-10 — WB ladder length (operator charter says 6-8 WBs)

Two reasonable ladders:

- (a) **[Recommended]** 6 WBs — Phase 1 spike → WB1 red → WB2 green
  (bubbles + scroll-pin) → WB3 green (quick-pick + integration test) →
  WB4 green (spawned-list + smoke) → WB5 docs.
- (b) 8 WBs — Phase 1 spike → WB1 red → WB2 green (bubble extraction) →
  WB3 green (avatar + role-layout) → WB4 green (scroll-pin) → WB5 green
  (quick-pick) → WB6 green (spawned-list) → WB7 verification + smoke →
  WB8 docs.

**Tentative:** (a) — tighter cycle, each WB lands a complete capability.
(b) makes WB granularity finer but adds 2 commits without adding evidence.

### Q-MBT21-11 — Followup target for closed `MB-F-T20-CHAT-TAB-CONTENT-STYLING`

Acknowledgment: WB5 docs MUST mark the followup CLOSED in
`docs/FOLLOWUPS.md` line 126 + cite the closing commit + WB ladder ref.
Confirm pattern.

**Tentative:** Mirror MB-T20 WB5's pattern for `MB-F-COARCH-T02-STYLING`
(line 123) — append `→ CLOSED at MB-T21 WB5: …` with discoverability
anchor.

### Q-MBT21-12 — Visual styling — Tailwind CSS, inline styles, or stylesheet?

dispatch-web uses Tailwind classes; dispatch-workstation does NOT have
Tailwind set up. chat-panel.tsx currently has zero styles.

- (a) **[Recommended]** Inline `style={...}` props on bubble JSX —
  consistent with workstation-shell.html's existing inline style approach
  (line 251 chat-region inline style). Zero build-pipeline changes.
- (b) Add `chat-panel.css` stylesheet imported via esbuild loader. Build
  config touch.
- (c) Stand up Tailwind in dispatch-workstation. Major scope creep.

**Tentative:** (a). Inline styles fit the package's existing pattern.

### Q-MBT21-13 — bubble persistence "across workstation restart"

Ticket spec explicitly **defers to v3.1**: "Out of scope: bubble persistence
across workstation restart". Daemon-side `fetchHistory` already persists
through restarts at the SQL row level — the visual continuity (e.g.,
remembering scroll position, in-progress draft) is what's deferred.

**Tentative:** Confirm this is operator-explicit and no special handling
needed at MB-T21.

---

## IV. Tentative WB ladder (Q-MBT21-10 = a)

| WB | Type | Scope | Tests authored |
|---|---|---|---|
| Phase 1 | spike | This diagnose doc + commit | n/a |
| WB1 | red | Scaffold `coarchitect/chat-bubble.tsx` + `quick-pick-buttons.tsx` + `spawned-list.tsx` skeletons + decisions doc + author 6-8 failing probe tests | probe-04 (bubble render) + probe-05 (quick-pick render+click) + probe-06 (spawned-list render) — all red |
| WB2 | green | Bubble structure (avatar + role-layout + scroll-pinned tail anchor); refactor chat-panel.tsx to render bubbles; preserve `chat-input` + `send-button` testids | probe-04 green; probe-03 unchanged & still green |
| WB3 | green | quick-pick parsing (sentinel-marker `QUICK_PICK: [...]` per Q-MBT21-2 disposition) + button.map + click → `streamingBridge.sendAndStream(optionText)` + integration test for the IPC roundtrip | probe-05 green; new `test/integration/chat-shell/quick-pick-roundtrip.test.tsx` green |
| WB4 | green | spawned-list parsing (sentinel-marker `spawned: [...]` per Q-MBT21-3 disposition) + inline render block; CLAUDE.md §4.6 runtime smoke verifies `RENDER_OK` | probe-06 green; runtime smoke clean |
| WB5 | docs | findings doc + followup closure (`MB-F-T20-CHAT-TAB-CONTENT-STYLING` CLOSED) + 2-3 v3.1 polish followups (smart-pin scrolling, schema first-class quick-pick, etc.) | n/a |

**Total cairn-grammar commits: 4** (WB1 red + WB2 green + WB3 green + WB4
green) plus Phase 1 spike + WB5 docs = 6 commits.

**Pre-WB1 HALT 0:** This Phase 1 commit awaits operator review of
Q-MBT21-1..13 + R-MBT21-1..9 dispositions. Per CLAUDE.md §4.2.

---

## V. Atomic-chain commit pattern (per session prompt + Tier-1 followup)

Every commit in MB-T21 chains:

```sh
git pull --ff-only && \
git add <explicit paths> && \
git diff --cached --name-only | sort > /tmp/mb-t21-wbN-staged.txt && \
diff /tmp/mb-t21-wbN-staged.txt <(printf "<paths>\n" | sort) && \
git commit -m "..." && \
git push origin main && \
git log --oneline origin/main..HEAD
```

The `diff` step aborts the chain before `git commit` if the index has been
mutated by another session between `git add` and the verification snapshot.
Q7 self-check in commit body answered against post-commit `git log -1
--name-only`, NOT pre-commit `git status`.

Reference: `MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT` (FOLLOWUPS.md line 196).

---

## VI. Frozen-contract awareness

**Will NOT modify** in MB-T21:
- `packages/dispatch-core/src/v3/schema.ts` (any §1-§13 file)
- `docs/build-docs/CONDUCTOR_API_CONTRACT.md`
- `docs/build-docs/WORKSTATION_CONTRACT.md`
- `docs/build-docs/REGISTRY.md`
- `docs/build-docs/CONDUCTOR_V3_RESCOPE.md`
- `packages/dispatch-workstation/src/main/preload.mts` (Q-MBT20-5 invariant)
- `packages/dispatch-workstation/src/chat-shell/chat-shell.tsx` (Terminal B
  territory — MB-T22)
- `packages/dispatch-workstation/src/chat-shell/mount.ts` (MB-T20 territory;
  ChatPanel import stays — refactor preserves ChatPanel export signature)
- `packages/dispatch-web/src/orchestrator-cards/*` (cross-package; out of
  scope)

**Will modify** in MB-T21:
- `packages/dispatch-workstation/src/coarchitect/chat-panel.tsx` (refactor
  in place per Q-MBT21-1=a tentative)
- NEW: `packages/dispatch-workstation/src/coarchitect/chat-bubble.tsx`
- NEW: `packages/dispatch-workstation/src/coarchitect/quick-pick-buttons.tsx`
- NEW: `packages/dispatch-workstation/src/coarchitect/spawned-list.tsx`
- NEW: `packages/dispatch-workstation/test/unit/coarchitect/probe-{04,05,06}-*.spec.tsx`
- NEW: `packages/dispatch-workstation/test/integration/chat-shell/quick-pick-roundtrip.test.tsx`
- `docs/FOLLOWUPS.md` (mark `MB-F-T20-CHAT-TAB-CONTENT-STYLING` CLOSED at WB5)
- `docs/coordination/mb-t21-{diagnose,decisions,findings}-2026-05-07.md`

**Possibly modify (assess at WB2):**
- `packages/dispatch-workstation/tsconfig.json` if new `.tsx` files need
  exclude entries (unlikely — coarchitect/ already in includes)

---

## VII. References

- Ticket charter: `wireframe-tickets-inventory.md §3` (operator-side)
- MB-T20 findings: `docs/coordination/mb-t20-findings-2026-05-07.md`
- MB-T20 closing commit: `734298b`
- Followup charter: `docs/FOLLOWUPS.md` line 126
  (`MB-F-T20-CHAT-TAB-CONTENT-STYLING` Tier 2)
- Atomic-chain methodology: `docs/FOLLOWUPS.md` line 196
  (`MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT` Tier 1)
- CLAUDE.md sections governing: §2.2 (confidence labels), §2.3 (cairn
  grammar), §2.4 (Q1-Q9), §2.6 (push discipline), §2.7 (per-path add),
  §3.6 (test layout), §4.1 (WB ladder), §4.2 (HALT gates), §4.5 (pre-existing
  failures), §4.6 (runtime smoke).

---

## VIII. HALT 0 — pre-execution surface

This Phase 1 spike commit is the pre-WB1 surface per CLAUDE.md §4.2 HALT 0.
**Awaiting operator dispositions on Q-MBT21-1..13 + R-MBT21-1..9** before
WB1 red commit. No file inventory, no test authoring, no scaffold writes
during this halt per CLAUDE.md §2.5.

Operator: please review and acknowledge Q-MBT21 dispositions or override.
WB ladder begins on operator unblock.
