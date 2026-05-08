# MB-T21 Findings — Chat tab proper

**Date:** 2026-05-07
**Terminal:** A (4-session parallel-cairn run)
**Final HEAD:** `f2b7ccd` (WB4 green) + this WB5 docs commit
**Phase 1 spike:** `e02aa52` (with index-race incident — see §V)
**Ladder:** 6 commits — Phase 1 → WB1 red → WB2 green → WB3 green → WB4 green → WB5 docs.
**Outcome classification (CLAUDE.md §2.11):** **Improved (binary flip + behavioral quality).**
Family-B Chat tab body now renders styled bubble messages with operator/conductor avatars,
inline quick-pick options that fire IPC roundtrip via existing sendAndStream,
inline spawned-list blocks parsed from a sentinel marker, and tail-anchor scroll-pin.
Closes `MB-F-T20-CHAT-TAB-CONTENT-STYLING` (Tier 2, MB-T20 WB5 charter).

---

## I. Summary

MB-T21 ships the Chat tab body inside the MB-T20 tab-host shell. The
existing `coarchitect/chat-panel.tsx` is refactored in place (Q-MBT21-1=a)
to extract three sub-components into `coarchitect/`: `ChatBubble`,
`QuickPickButtons`, `SpawnedList`. A new `chat-content-markers.ts` exposes
`parseQuickPickMarker` + `parseSpawnedMarker` for renderer-side parsing of
sentinel markers in assistant message content.

**No frozen contracts touched** — `preload.mts` coarchitectBridge surface
unchanged (Q-MBT20-5 invariant held); `dispatch-core/src/v3/schema.ts`
unchanged (Q-MBT21-2=b + Q-MBT21-3=b: sentinel-marker parse is renderer-
only, schema upgrade deferred to v3.1 followups). `chat-shell.tsx` +
`mount.ts` untouched (Terminal B MB-T22 territory; ChatPanel export
signature preserved so mount.ts import is unchanged).

**Quick-pick clicks fire `streamingBridge.sendAndStream(optionText)`**
verbatim — same IPC pathway as text-input submit (Q-MBT21-4=a). No new
IPC channel, no preload change.

---

## II. WB ladder reference

| WB | Commit | Type | Tests | Note |
|---|---|---|---|---|
| Phase 1 | `e02aa52` | spike | n/a | Surface inventory + Q-MBT21-1..13 + R-MBT21-1..9 with tentative dispositions. **Index-race incident** swept Terminal C's mb-t26 diagnose into this commit; operator accept-and-document (§V). |
| WB1 | `5fff03a` | red | 16 RED / 9 trivial-pass | Scaffold 4 src files (skeletons return null/pass-through) + 3 probe files (probe-04..06 = 25 tests) + decisions doc. NEW `test/unit/coarchitect/` directory. |
| WB2 | `536d413` | green | 12/12 | ChatBubble impl (avatar + role-aligned layout + inline styles) + chat-panel.tsx refactor (history.map → ChatBubble; tail-anchor scrollIntoView; chat-input + send-button testids preserved). probe-04 7→GREEN; probe-03 (chat-shell ↔ ChatPanel) regression-free 5/5. |
| WB3 | `fd6b9c5` | green | 26/26 | parseQuickPickMarker impl + QuickPickButtons impl + chat-panel.tsx integration; click → `streamingBridge?.sendAndStream(text)`. NEW `test/integration/chat-shell/quick-pick-roundtrip.test.tsx` (4 tests) verifies render + strip + click + testid preservation. probe-05 10/10 GREEN. |
| WB4 | `f2b7ccd` | green | 34/34 | parseSpawnedMarker impl (parser was actually landed at WB3 with parseQuickPickMarker since both shared `chat-content-markers.ts`; component lands here) + SpawnedList impl + chat-panel.tsx chains both parsers with bubble→spawned-list→quick-pick render order. Runtime electron smoke per CLAUDE.md §4.6: WINDOW_READY + RENDER_OK + bonus STREAM_DONE all fired. probe-06 8/8 GREEN. |
| WB5 | this commit | docs | n/a | Findings doc + 5 v3.1 polish followups + `MB-F-T20-CHAT-TAB-CONTENT-STYLING` CLOSED + `MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT` updated with second-occurrence citation. |

**Total tests authored: 25** (probe-04: 7; probe-05: 10 = 5 component +
5 marker; probe-06: 8 = 4 component + 4 marker). Plus 4 integration tests
in `quick-pick-roundtrip.test.tsx`. **Cumulative scoped run: 34/34 GREEN**
across probe-03 + probe-04 + probe-05 + probe-06 + quick-pick-roundtrip.

---

## III. Acceptance verification

Per ticket charter (wireframe-tickets-inventory.md §3):

| Acceptance criterion | Verification |
|---|---|
| Bubbles render in correct order (oldest top, newest bottom) | probe-03:1 (chat-input + send-button inside chat-shell-tab-content) — preserved; chat-panel.tsx history.map iterates in array order; ChatPanel renders messages in stored sequence. |
| Scroll-pinned (newest in view) | Q-MBT21-8=a tail-anchor `useEffect(() => tailAnchorRef.current?.scrollIntoView({block:'end'}), [history.length, inProgress])`. Smart-pin (don't yank if user scrolled up) deferred to v3.1 (`MB-F-T21-SMART-PIN-SCROLL`). |
| Quick-pick buttons dispatch to coarchitect-ipc as text input | quick-pick-roundtrip integration test #3: `expect(bridge._spies.sendAndStream).toHaveBeenCalledWith('MB-T16 picker')`. Verbatim option text becomes the IPC argument. |
| `spawned: [...]` blocks render inline | probe-06 component tests (4) + chat-panel.tsx integration: SpawnedList renders between bubble and QuickPickButtons when sessions parsed. |
| Integration test for quick-pick → IPC roundtrip | `test/integration/chat-shell/quick-pick-roundtrip.test.tsx` (4 tests; Q-MBT21-6=a). |
| Out of scope: cross-tab notification badges | DEFERRED — Family-B prerequisite; tracked at `MB-F-T20-FAMILY-B-ADDITIONAL-TABS`. |
| Out of scope: bubble persistence across workstation restart | DEFERRED — Q-MBT21-13 confirms v3.1 deferral; daemon-side `fetchHistory` already persists message rows; visual continuity (scroll position, draft) deferred. |

---

## IV. Runtime smoke (CLAUDE.md §4.6 + R-MBT21-7)

```
$ MB_TEST_HOOKS=1 node node_modules/.../electron/cli.js dist/main/main.js
WINDOW_STATE 1024 768
SPLITTER_LOADED 395
SHELL_READY
RENDER_OK              ← ChatPanel useEffect inside ChatShell wrap;
                          refactored chat-panel.tsx + new sub-components
                          mounted clean
WINDOW_READY
TILE_GRID_MOUNTED
APPROVAL_POLICY_IPC_MOUNTED
AUTOPILOT_IPC_MOUNTED
ONBOARDING_READY
BOOTSTRAP_TOKEN_WRITTEN 44
STREAM_START
STREAM_DONE Hey! How's it going? What can I help you with today?
```

Load-bearing sentinels: `RENDER_OK` (proves chat-shell renderer.js bundle
loads + ChatShell mounts + ChatPanel useEffect runs + new sub-components
import successfully) + `WINDOW_READY` (Electron app fully booted).

Bonus: `STREAM_START` + `STREAM_DONE` fired during the smoke window —
indicating the StreamingBridge wiring survives the bubble refactor +
inProgress streaming bubble flow lands clean. No `STREAM_ERROR` observed.

---

## V. Cross-session events (parallel-cairn, T22 + T26 + T27)

### V-A. Phase 1 commit `e02aa52` — index-race ceiling incident (second occurrence)

**Incident:** Phase 1 commit `e02aa52` swept Terminal C's
`docs/coordination/mb-t26-diagnose-2026-05-07.md` alongside this
session's `mb-t21-diagnose-2026-05-07.md`. Pre-commit `git diff --cached
--name-only` snapshot confirmed exactly 1 path; between that snapshot
and `git commit` (the `&&` boundary), Terminal C's `git add` mutated
the shared index. My commit + push sealed both paths under MB-T21's
subject + Q1-Q9 self-check body. Q7 ("Touched files another parallel
session might modify? No") is now factually wrong on origin/main.

**Operator disposition:** **Accept-and-document.** No force-push, no
revert. Both diagnose docs are correct content; only the commit
attribution is misleading. Q1-Q9 body remains a permanent log artifact
(mirrors MB-T18 `ecdd0e4` shape).

**Forward mitigation (parallel-cairn coordination protocol updated):**
1. **Courtesy delay** ~30s before launching every atomic-chain commit,
   to allow other terminals' chains to complete. Probabilistic, not
   guaranteed.
2. Per-path `git add <path>` + diff-verify-then-commit `&&` chain
   continues unchanged.
3. **Third occurrence** triggers all-sessions halt + structural pivot
   to `git worktree` per CLAUDE.md §4.3.

**Result:** courtesy-delay protocol applied at every WB1-4 atomic
chain. Q7 verified true on every commit since: `5fff03a`, `536d413`,
`fd6b9c5`, `f2b7ccd` all show exactly the intended paths in
post-commit `git log -1 --name-only`. Zero subsequent index-race
incidents in this session.

`MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT` (FOLLOWUPS.md line 196)
updated at WB5 with second-occurrence citation + courtesy-delay
protocol + worktree-pivot trigger condition.

### V-B. Other cross-session activity

| Event | Timing | Resolution |
|---|---|---|
| Terminal C's MB-T26 WB1 (`a1e41fc red(MB-T26)`) pushed between my WB1 push and WB2 pull | Pre-WB2 commit | `git pull --ff-only` inside WB2 atomic-chain fast-forwarded clean; my WB2 commit (`536d413`) parented onto a1e41fc; no conflicts (territory disjoint). |
| Terminal B's MB-T22 work in progress (probe-04-multi-tab-api.spec.tsx + commits-tab.tsx + commits-reader.ts) visible as untracked in working tree throughout WB1-4 | Continuous | Per-path git add held; never staged Terminal B's files. Their probe-04 surfaced 9 tests in the combined vitest run (2 pass + 7 fail = their red WB), counted separately from my coarchitect probes. |
| Terminal C's MB-T26 working tree additions (cost-calc/, cost-ledger/, cost-meter.tsx) + Terminal D's MB-T27 work | Continuous | Disjoint territory; per-path discipline held; tsconfig.json modification by another session NOT staged by me. |
| Other terminals' decisions/diagnose docs landing in `docs/coordination/` | Continuous | Not in my territory; not staged. |

**Methodology takeaway:** the courtesy-delay + atomic-chain + per-path
discipline successfully prevented index-race incidents on commits 2-5
of this session even with 3 concurrent terminals actively staging
their own work. The single failure (Phase 1 commit) preceded the
operator's coordination update; once protocol applied, zero further
incidents.

---

## VI. Pre-existing test failures (CLAUDE.md §4.5)

**NOT re-diagnosed** per CLAUDE.md §4.5. The two known classes
(`MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL`
+ `MB-F-WORKSTATION-INTEGRATION-TEST-FLAKE-SUITE`) remain open under
their dedicated tickets. This WB ladder did NOT run the full
workstation suite per CLAUDE.md §9. Scoped chat-shell + coarchitect
suite (34 tests) ran every WB, clean.

Concurrent Terminal B's MB-T22 `probe-04-multi-tab-api.spec.tsx` was
present in shared working tree throughout this session and its 7
failing tests appeared in combined run output — these are Terminal B's
red WB and NOT MB-T21's responsibility.

---

## VII. Followups filed

### VII-A. Closed at WB5

| ID | Closure |
|---|---|
| `MB-F-T20-CHAT-TAB-CONTENT-STYLING` | **CLOSED at MB-T21 WB5.** Inner ChatPanel content now rendered as styled bubbles with letter-glyph avatars, role-aligned layout (user right, conductor left), tail-anchor scroll-pin, and inline quick-pick + spawned-list composition. `chat-input` + `send-button` testids preserved. Discoverability: this findings doc §III + commits `536d413`, `fd6b9c5`, `f2b7ccd`. |

### VII-B. Updated at WB5

| ID | Update |
|---|---|
| `MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT` | **Tier 1 methodology — second occurrence cited.** Phase 1 commit `e02aa52` is the second confirmed instance of the ceiling case (first: MB-T18 `ecdd0e4`). Operator-accepted accept-and-document disposition applied. Forward mitigation: courtesy-delay protocol (~30s pre-atomic-chain). Third occurrence triggers all-sessions halt + worktree pivot. |

### VII-C. New v3.1 polish followups (5)

| ID | Tier | Closes-at | Body |
|---|---|---|---|
| `MB-F-T21-SMART-PIN-SCROLL` | 3 | v3.1 polish | Q-MBT21-8=a shipped naive `tailAnchorRef.current?.scrollIntoView({block:'end'})` on `[history.length, inProgress]`. Yanks scroll to bottom even if user has manually scrolled up to read history. Closes by adding scroll-position detection + only auto-scroll if user is within ~50px of bottom. Cosmetic UX polish. Discoverability: `chat-panel.tsx` scroll-pin useEffect + this findings doc §III. |
| `MB-F-T21-QUICK-PICK-SCHEMA-FIRST-CLASS` | 2 | post-v3.0 schema review | Q-MBT21-2=b shipped sentinel-marker parse (`QUICK_PICK: ["a","b"]` line at end of assistant message body) as renderer-only — no schema/IPC change. Once orchestrator output spec stabilizes, upgrade to first-class field on `OrchestratorMessageRow` / `MultiChoiceCardOutputSchema` integration. Operator-arbitrated frozen-schema change required. Discoverability: `chat-content-markers.ts` parseQuickPickMarker + this findings doc + Q-MBT21-2 in decisions doc. |
| `MB-F-T21-SPAWNED-LIST-SCHEMA-FIRST-CLASS` | 2 | post-v3.0 schema review | Same shape as MB-F-T21-QUICK-PICK-SCHEMA-FIRST-CLASS for the `spawned: [...]` marker. Q-MBT21-3=b sentinel-parse is renderer-only; v3.1 schema upgrade tracked here. Pair with MB-F-T21-QUICK-PICK-SCHEMA-FIRST-CLASS. Discoverability: `chat-content-markers.ts` parseSpawnedMarker. |
| `MB-F-T21-LATEST-ASSISTANT-INTERACTIVE-ONLY` | 3 | v3.1 polish | When multiple assistant messages with QUICK_PICK markers exist in history (e.g., operator scrolls up after several turns), ALL render interactive option buttons. Clicking an old option fires a fresh sendAndStream against current orchestrator state — likely confusing UX. Closes by tracking the latest-assistant-message id and rendering buttons disabled (or omitted) on older messages. UX polish; not load-bearing. Discoverability: `chat-panel.tsx` history.map render + WB3 commit body. |
| `MB-F-T21-COMPOSED-MARKER-ORDERING` | 3 | post-v3.0 visual review | Current render order: `ChatBubble (stripped body)` → `SpawnedList` → `QuickPickButtons`. Operator may prefer alternate orderings (e.g., quick-pick above spawned-list, or spawned-list inline within bubble body). Closes by either confirming current order matches design intent OR refactoring `chat-panel.tsx` history.map JSX. Cosmetic. Discoverability: `chat-panel.tsx` Fragment composition + this findings doc §I. |

---

## VIII. Q-MBT21-N + R-MBT21-N final dispositions

All 13 Q-MBT21 + 9 R-MBT21 dispositions held through the ladder:

| ID | Disposition | Verified by |
|---|---|---|
| Q-MBT21-1=a | Refactor coarchitect/chat-panel.tsx in place | WB2 commit `536d413` modifies chat-panel.tsx + creates chat-bubble.tsx; chat-input + send-button testids preserved (probe-03 still green) |
| Q-MBT21-2=b | Sentinel-marker parse for QUICK_PICK | WB3 commit `fd6b9c5` chat-content-markers.ts parseQuickPickMarker + probe-05 marker tests + roundtrip integration |
| Q-MBT21-3=b | Sentinel-marker parse for spawned: | WB4 commit `f2b7ccd` parseSpawnedMarker + SpawnedList + probe-06 marker tests |
| Q-MBT21-4=a | Quick-pick click → sendAndStream(optionText) | quick-pick-roundtrip integration test #3 verified `expect(sendAndStream).toHaveBeenCalledWith('MB-T16 picker')` |
| Q-MBT21-5=a | NEW test/unit/coarchitect/ directory | probe-04..06 spec files at this path; first WB1 created the directory |
| Q-MBT21-6=a | Integration test at test/integration/chat-shell/ | quick-pick-roundtrip.test.tsx (4 tests); first WB3 created the directory |
| Q-MBT21-7=a | Duplicate quick-pick UI between workstation + dispatch-web | quick-pick-buttons.tsx is renderer-local; no cross-package imports |
| Q-MBT21-8=a | Tail-anchor scrollIntoView | chat-panel.tsx tailAnchorRef + useEffect on `[history.length, inProgress]` |
| Q-MBT21-9=a | Letter-glyph avatars O/C/S | chat-bubble.tsx GLYPH map; probe-04 tests #3 + #4 verify |
| Q-MBT21-10=a | 6-WB ladder | Phase 1 + WB1-4 + WB5 = 6 commits as planned |
| Q-MBT21-11 | Mirror MB-T20 closure pattern | FOLLOWUPS.md line 126 appended `→ CLOSED at MB-T21 WB5: …` |
| Q-MBT21-12=a | Inline styles | All 4 new components use inline `style={...}` props; no Tailwind, no stylesheet |
| Q-MBT21-13 | Bubble persistence deferred to v3.1 | Out-of-scope confirmed; no persistence code added |

| ID | Status |
|---|---|
| R-MBT21-1 (legacy chat-panel test drift) | MITIGATED — chat-input + send-button preserved; probe-03 + probe-03 5/5 green every WB |
| R-MBT21-2 (quick-pick metadata source) | RESOLVED via Q-MBT21-2=b |
| R-MBT21-3 (spawned-list metadata source) | RESOLVED via Q-MBT21-3=b |
| R-MBT21-4 (chat-shell.tsx Terminal B collision) | AVOIDED — chat-shell.tsx + mount.ts NOT modified |
| R-MBT21-5 (probe filename collision) | AVOIDED via Q-MBT21-5=a (new test/unit/coarchitect/) |
| R-MBT21-6 (pre-existing coarchitect-ipc failures) | NOT re-diagnosed; scoped runs only |
| R-MBT21-7 (runtime smoke gating) | SATISFIED — WB4 ran electron smoke; RENDER_OK + WINDOW_READY + STREAM_DONE all fired |
| R-MBT21-8 (cross-package UI sharing) | RESOLVED via Q-MBT21-7=a (duplicate) |
| R-MBT21-9 (atomic-chain mandatory) | UPHELD — WB1-4 commits all used atomic-chain + courtesy-delay; Q7 verified true on each |

---

## IX. References

- Phase 1 diagnose: `docs/coordination/mb-t21-diagnose-2026-05-07.md`
- Decisions doc: `docs/coordination/mb-t21-decisions-2026-05-07.md`
- Closing followup: `docs/FOLLOWUPS.md` line 126 (`MB-F-T20-CHAT-TAB-CONTENT-STYLING`)
- Updated methodology followup: `docs/FOLLOWUPS.md` line 196 (`MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT`)
- Atomic-chain reference: MB-T18 WB1 race incident clarification at `docs/coordination/mb-t18-wb1-index-race-clarification-2026-05-07.md`
- ChatPanel + sub-components:
  - `packages/dispatch-workstation/src/coarchitect/chat-panel.tsx` (refactored)
  - `packages/dispatch-workstation/src/coarchitect/chat-bubble.tsx` (NEW)
  - `packages/dispatch-workstation/src/coarchitect/quick-pick-buttons.tsx` (NEW)
  - `packages/dispatch-workstation/src/coarchitect/spawned-list.tsx` (NEW)
  - `packages/dispatch-workstation/src/coarchitect/chat-content-markers.ts` (NEW)
- Probes + integration:
  - `packages/dispatch-workstation/test/unit/coarchitect/probe-{04,05,06}-*.spec.tsx`
  - `packages/dispatch-workstation/test/integration/chat-shell/quick-pick-roundtrip.test.tsx`
- Predecessor (NOT modified):
  - `packages/dispatch-workstation/src/chat-shell/{chat-shell.tsx,mount.ts}` (MB-T20 territory; Terminal B MB-T22 will extend)
  - `packages/dispatch-workstation/src/main/preload.mts` (Q-MBT20-5 invariant)
- CLAUDE.md sections governing: §2.2, §2.3, §2.4, §2.6, §2.7, §3.6, §4.1, §4.2, §4.5, §4.6, §2.10, §2.12.

---

**MB-T21 ladder closed at WB5.** Family-B Chat tab body fully wired:
bubbles render with role-aligned styling; quick-pick options parse from
sentinel marker, render inline, and roundtrip via existing IPC; spawned
sessions render inline; tail-anchor scroll-pin lands. Five v3.1 polish
followups filed for forward refinement. Family B continues at MB-T22
(Commits tab, Terminal B) which will extend chat-shell.tsx with multi-tab
state machine per `MB-F-T20-FAMILY-B-ADDITIONAL-TABS`.
