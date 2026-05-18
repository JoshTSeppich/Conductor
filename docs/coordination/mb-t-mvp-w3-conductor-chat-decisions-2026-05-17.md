# MB-T-MVP-W3-CONDUCTOR-CHAT decisions — 2026-05-17

Companion to findings doc. Records operator-arbitrated decisions and their Path-B framing.

## §I — Path-B (operator gen-7 HALT-0 ARBITRATION ~19:50 MDT)

**Path-B: W3 ships renderer-only; production wiring deferred.**

Selected at HALT-0 over Path-A (operator pre-arbitrates ALL blockers, then W3 proceeds) and Path-C (split ticket into W3a visual + W3b IPC). Rationale per operator directive verbatim:

> (1) chat-shell is DEFERRED-DELETION territory per OPERATOR-CASCADE-AMENDMENT §'CHAT-SHELL DEFERRED DELETION' — cannot remove its <script> tag at shell.html:785 in W3 cycle, so Path-A's shell.html amendment would create runtime collision at #root; (2) Path-B mirrors W1 EXPANSION-2 pattern (W1 will sweep chat-shell meters into topbar at next cycle; W3-final coordinates the integration); (3) Path-B avoids 3 FORBIDDEN-territory inserts gen-7 would have to amendment-dispatch separately.

## §II — Q-W3-1..8 arbitration outcomes (HALT-0 ACK ~19:50 MDT)

All 8 questions resolved at HALT-0 with session-recommended defaults ACK'd by operator:

| # | Question | Operator decision |
|---|----------|---------------------|
| Q-W3-1 | WB6 "pixel-perfect" semantics | **(a) qualitative operator review** — no diff library in 7-WB scope |
| Q-W3-2 | WB6 oracle coverage | **(a) idle-only** — file `MB-F-W3-WB6-ATTACHED-STATE-SCREENSHOT-COVERAGE-PENDING` Tier-2 for attached-state gap |
| Q-W3-3 | WB5 IPC strategy | **(a) stub-only IPC** — parse work is Wave-4 territory |
| Q-W3-4 | WB4 pause/resume/cancel wiring | **(a) visual-only** — wire in Wave-4/5 |
| Q-W3-5 | Props vs bridge boundary | **(a) pure-props in component + bridge-shim in mount.ts** |
| Q-W3-6 | Design-token strategy | **(b) inline-style React** matching `coarchitect/chat-panel.tsx` precedent |
| Q-W3-7 | Composer Enter-keystroke semantics | **(a) exact match** to design |
| Q-W3-8 | BuildMdChip data ownership | **(b) prop-driven w/ null default** |

## §III — Pattern decision: build-fresh ConductorMessage (Phase-1 diagnose)

Decided at Phase-1 diagnose: **build fresh `conductor-message.tsx`**, do NOT fork `coarchitect/chat-panel.tsx` `ChatBubble`. Evidence in Phase-1 surface inventory:

| Dimension | `ChatBubble` (`chat-panel.tsx:166-205`) | Design `ConductorMessage` (`conductor-chat.jsx:5-46`) |
|---|---|---|
| Roles | 2 (user/assistant) | 4 + typing (user/assistant/dispatch/system + typing) |
| Palette | Slate `#0f172a` | Warm amber `#f0a062` |
| Layout | Flex column left/right | Grid `26px 1fr` for assistant |
| Side widgets | `<QuickPickButtons>` + `<SpawnedList>` marker-parsed | None |
| Typing | "Deliberating…" text | Animated 3 dots + agent-count label |
| Streaming | Chunk accumulator + tail anchor | `scrollTop = scrollHeight` on `messages.length` |

Fork would have required deleting palette, adding 2 roles, removing widgets, adding grid, rewriting typing, rewriting streaming — a full rewrite that preserves the file path only. Fresh `conductor-message.tsx` honors territorial manifest naming AND avoids `chat-shell/coarchitect` DEFERRED-DELETION coupling.

## §IV — Cross-session amendment: path-disjoint within-wave (EXPANSION-1)

Operator-arbitrated 2026-05-17 ~20:30 MDT at commit `9625e04` + manifest amendment `f6eeb71`. Splits W3 into two cooperating sessions:

- **operator-CC lane** writes: `src/conductor-chat/composer.tsx`, `header.tsx`, `test/unit/conductor-chat/probe-03`, `probe-04`
- **gen-7-w3 lane** writes: `src/conductor-chat/conductor-chat.tsx` (WB1 + WB4 slot extension), `conductor-message.tsx`, `build-md-chip.tsx`, `mount.ts`, `index.ts`, probes 02 / 05 / 06 / 07 / 08

Discipline overlay:
- FROZEN testid contract at `w3-testid-contract-2026-05-17.md` — neither session modifies
- Append-only cross-session log at `w3-cross-session-2026-05-17.md` — both append `TIMESTAMP \| SESSION \| SHA \| FILE` after every cairn-grammar commit (separate `docs(coord)` chore commit)
- Pre-commit discipline: `git status --short` + `tail -1` race-detection BEFORE every commit
- Non-FF push → `git pull --rebase` + re-verify staged scope + re-push

**Outcome**: 13 cross-session log entries, zero territory violations, one clean stash-rebase-pop cycle, zero non-FF push failures.

## §V — Probe-numbering decision (gen-7 lane)

WB3 gen-7 lane authored `probe-mbt-mvp-w3-08-build-md-chip-rendering.spec.tsx` outside the manifest-enumerated 01-07 range. The cross-session directive named the probe as "probe-tbd" — treated as implicit operator-amendment granting probe-08 territory. Documented in WB3 RED commit body and findings §VIII.

Alternative considered + rejected:
- (a) Inline build-md-chip tests inside probe-05 (mount-integration) — conflates concerns; chip is a separate component.
- (b) Probe-08 with explicit HALT for manifest amendment — process overhead; directive grant is sufficient.

## §VI — Default-idle-state decision (WB5 GREEN)

WB5 GREEN (`bdc50a8`) replaces mount.ts `EMPTY_STATE` with `DEFAULT_IDLE_STATE` seeded with the canonical assistant intro message from design `app.jsx:86` verbatim. Decision rationale:

- §5.5 NORMATIVE screenshot oracle shows the intro bubble visible at idle in all 6 design screenshots.
- Without the default seed, the renderer's idle screen would be visibly broken (no chat content).
- The default can be overridden by a production bridge via `bridge.getInitialState` — no contract violation.

Probe-05 "bridge absent" assertion updated in the same commit: was "no assistant message"; now "exactly one assistant intro bubble per default idle state". WB4 contract was wrong; WB5 corrects it per the design oracle.

## §VII — flushSync + act() decision (WB4 GREEN engineering adjustment)

React 18 `createRoot` batches the initial render; assertions fire before render commits in synchronous tests. Two changes shipped at WB4 GREEN:

1. **mount.ts**: `flushSync(() => reactRoot.render(...))` — forces initial render to commit before `tryAutoMount` returns. Production cost is minimal (single shell render). Choice rationale: synchronous-observable mount keeps the function contract clean for callers AND simplifies WB6 screenshot oracle reading.

2. **probe-05**: `act(() => emit(...))` — wraps the bridge emit callback so React 18 auto-batched `setState` flushes synchronously. Standard `@testing-library/react` test-harness pattern.

Both adjustments are inside the Path-B + Q-W3-5 envelope.

## §VIII — refactor envelope for conductor-chat.tsx (WB4 GREEN)

WB1 (`d0a96bf`) shipped `conductor-chat.tsx` as an empty-slot scaffold with the FROZEN testid anchors. WB4 GREEN (`fa5afbb`) extended it additively to fill the slots:

- `messages` prop mapped through `ConductorMessage` into the thread anchor
- `running > 0` → renders typing variant at thread tail
- New `renderHeader` + `renderComposer` render-prop slots for the header + composer anchors

WB1 commit explicitly named WB2-WB4 as the slot-fill phase ("WB2 = message role rendering into thread; WB3 = composer paperclip+textarea+send; WB4 = header brand+controls"); the cross-session amendment reshuffled file ownership but the slot-fill intent stayed valid. The additive refactor is in-charter though it crossed a previously-shipped file. WB1 probe-01 still passes (testid anchors preserved; empty-prop render yields empty slots).

## §IX — Cross-references

- Findings: `docs/coordination/mb-t-mvp-w3-conductor-chat-findings-2026-05-17.md`
- Impl-coord: `docs/coordination/mb-t-mvp-w3-conductor-chat-impl-coord-2026-05-17.md`
- Build doc: `docs/build-docs/CONDUCTOR_MB-T-MVP-W3-CONDUCTOR-CHAT_BUILD.md`
- Operator §5.3 arbitration: `94d3e17`
- Cross-session FROZEN contract: `9625e04`
- EXPANSION-1 manifest: `f6eeb71`
