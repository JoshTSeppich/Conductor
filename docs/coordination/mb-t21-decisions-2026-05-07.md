# MB-T21 Decisions — Chat tab proper

**Date:** 2026-05-07
**Phase 1 spike:** `e02aa52` (Phase 1 diagnose; index-race incident — see §V)
**WB1 red:** this commit
**Operator confirmation:** 2026-05-07 (this session, post-Phase 1 ack)

All Q-MBT21-1..13 + R-MBT21-1..9 dispositions ratified by operator. WB ladder
authorized to proceed.

---

## I. Q-MBT21-N final dispositions

| ID | Disposition | Implication |
|---|---|---|
| **Q-MBT21-1** | **(a)** Refactor `coarchitect/chat-panel.tsx` in place; extract sub-components into `coarchitect/` | New files: `chat-bubble.tsx`, `quick-pick-buttons.tsx`, `spawned-list.tsx`, `chat-content-markers.ts`. ChatPanel export signature preserved (`mount.ts` import unchanged). Existing `chat-input` + `send-button` testids preserved. |
| **Q-MBT21-2** | **(b)** Sentinel-marker parse for `QUICK_PICK: [...]` options inside assistant message content | Renderer-only; no schema/IPC change. v3.1 followup tracks first-class schema upgrade once orchestrator output stabilizes. |
| **Q-MBT21-3** | **(b)** Sentinel-marker parse for `spawned: [...]` blocks | Same shape as Q-MBT21-2; renderer-only. |
| **Q-MBT21-4** | **(a)** Quick-pick click → `streamingBridge.sendAndStream(optionText)` | Verbatim ticket spec. preload.mts unchanged (Q-MBT20-5 invariant held). |
| **Q-MBT21-5** | **(a)** New unit-probe directory at `test/unit/coarchitect/` | Mirrors source-dir layout per CLAUDE.md §3.6. Avoids filename collision with Terminal B's `test/unit/chat-shell/` territory. probe-04..06 numbering. |
| **Q-MBT21-6** | **(a)** Integration test at `test/integration/chat-shell/quick-pick-roundtrip.test.tsx` | happy-dom; no Electron boot; renderer-level IPC roundtrip via fake bridge. |
| **Q-MBT21-7** | **(a)** Duplicate quick-pick UI between dispatch-workstation chat panel + dispatch-web orchestrator-card | Cross-package extraction is scope creep. Each surface owns its own button.map. |
| **Q-MBT21-8** | **(a)** Tail anchor `scrollIntoView({block:'end'})` on history.length / inProgress change | Smart-pin (don't yank if user is scrolled up) deferred to v3.1 followup. |
| **Q-MBT21-9** | **(a)** Letter-glyph avatars: "O" for user/operator, "C" for assistant/conductor | No asset pipeline; legible monochrome. System-role glyph: "S". |
| **Q-MBT21-10** | **(a)** 6-WB ladder: Phase 1 → WB1 red → WB2-4 green → WB5 docs | 4 cairn-grammar commits + Phase 1 spike + WB5 docs = 6 total. |
| **Q-MBT21-11** | Confirmed | WB5 mirrors MB-T20 WB5's `MB-F-COARCH-T02-STYLING` closure pattern. Append `→ CLOSED at MB-T21 WB5: …` to `MB-F-T20-CHAT-TAB-CONTENT-STYLING` row in FOLLOWUPS.md with discoverability anchor. |
| **Q-MBT21-12** | **(a)** Inline `style={...}` props on bubble JSX | Consistent with workstation-shell.html's existing inline-style approach. Zero build-pipeline change. |
| **Q-MBT21-13** | Confirmed | Bubble persistence across workstation restart deferred to v3.1 (not in MB-T21 scope). |

## II. R-MBT21-N risk dispositions

| ID | Status |
|---|---|
| **R-MBT21-1** (legacy chat-panel test drift) | MITIGATED — `chat-input` + `send-button` testids preserved; legacy coarch-t02 tests will be re-run scoped at WB2 to confirm. |
| **R-MBT21-2** (quick-pick metadata source) | RESOLVED via Q-MBT21-2=b. |
| **R-MBT21-3** (spawned-list metadata source) | RESOLVED via Q-MBT21-3=b. |
| **R-MBT21-4** (chat-shell.tsx Terminal B collision) | AVOIDED — territory disjoint. chat-shell.tsx + mount.ts NOT modified. |
| **R-MBT21-5** (probe filename collision) | AVOIDED via Q-MBT21-5=a (NEW `test/unit/coarchitect/` directory). |
| **R-MBT21-6** (pre-existing coarchitect-ipc failures) | NOT re-diagnosed per CLAUDE.md §4.5; WB test runs scoped to `test/unit/coarchitect/` + new probes only. |
| **R-MBT21-7** (runtime smoke gating) | WB4 includes runtime electron smoke; RENDER_OK is the load-bearing sentinel. |
| **R-MBT21-8** (cross-package UI sharing) | RESOLVED via Q-MBT21-7=a (duplicate). |
| **R-MBT21-9** (atomic-chain mandatory) | ACKNOWLEDGED + courtesy-delay protocol added per operator (ceiling-incident response below). |

## III. WB ladder (final)

| WB | Type | Cairn verb | Scope | Commit count |
|---|---|---|---|---|
| Phase 1 | spike | `spike(MB-T21)` | Diagnose doc — `e02aa52` | 1 |
| WB1 | red | `red(MB-T21)` | This commit — skeletons + 18 failing probes + decisions doc | 1 |
| WB2 | green | `green(MB-T21)` | Bubble structure (avatar + role-layout + scroll-pin); refactor chat-panel.tsx; preserve `chat-input` + `send-button` testids | 1 |
| WB3 | green | `green(MB-T21)` | quick-pick parsing + button.map + click → sendAndStream(optionText); integration test for IPC roundtrip | 1 |
| WB4 | green | `green(MB-T21)` | spawned-list parsing + inline render; runtime electron smoke per CLAUDE.md §4.6 | 1 |
| WB5 | docs | `docs(MB-T21)` | Findings doc + followup closure (`MB-F-T20-CHAT-TAB-CONTENT-STYLING` CLOSED); v3.1 polish followups | 1 |

**Total: 6 commits** (1 spike + 1 red + 3 green + 1 docs).

## IV. Probe coverage (WB1 red)

WB1 authors **18 failing probe assertions** across 3 probe files:

| Probe | File | Tests | Component / helper covered |
|---|---|---|---|
| probe-04 | `test/unit/coarchitect/probe-04-chat-bubble.spec.tsx` | 7 | ChatBubble (role testid + data-role + avatar glyph + body content + role-aligned layout) |
| probe-05 | `test/unit/coarchitect/probe-05-quick-pick-buttons.spec.tsx` | 5 + 5 | QuickPickButtons (empty/render/click/type=button) + parseQuickPickMarker (no-marker/parse/2-floor/4-ceiling/whitespace-strip) |
| probe-06 | `test/unit/coarchitect/probe-06-spawned-list.spec.tsx` | 4 + 4 | SpawnedList (empty/list-render/li-content) + parseSpawnedMarker (no-marker/parse/empty-array-null/whitespace-strip) |

WB1 verification: all assertions on "with content" rendering + "marker parsed" return values fail RED. The "empty/null returns nothing" assertions trivially pass (skeleton returns null) — that's correct, those are not the load-bearing red assertions.

## V. Atomic-chain ceiling incident (Phase 1 commit `e02aa52`)

**Incident:** my Phase 1 commit `e02aa52` swept Terminal C's
`docs/coordination/mb-t26-diagnose-2026-05-07.md` alongside my own diagnose
file. Pre-commit `git diff --cached --name-only` snapshot confirmed
exactly 1 path; between that snapshot and `git commit` (the `&&`
boundary), Terminal C's `git add` mutated the shared index. My commit +
push sealed both paths under MB-T21's subject + Q1-Q9 self-check body.
Q7 ("Touched files another parallel session might modify? No") is now
factually wrong on origin/main.

**This is the second occurrence** of the index-race ceiling case
(first: MB-T18 `ecdd0e4` swept Terminal A's MB-T17 WB4 paths under
MB-T18 WB1's subject — see `docs/coordination/mb-t18-wb1-index-race-clarification-2026-05-07.md`
+ FOLLOWUPS.md line 196).

**Operator disposition:** **Option 1 — accept-and-document.** No
force-push, no revert. Both diagnose docs are correct content; only the
commit attribution is misleading. Q1-Q9 body remains as a permanent log
artifact (mirrors MB-T18 `ecdd0e4` shape).

**Forward mitigation per operator (parallel-cairn coordination update):**
1. **Courtesy delay** — at every subsequent commit, halt ~30 seconds
   before launching the atomic chain to allow other terminals' chains
   to complete. Probabilistic, not guaranteed.
2. **Per-path discipline + atomic-chain** continues as before.
3. **Third occurrence** triggers all-sessions halt + structural pivot to
   `git worktree` per CLAUDE.md §4.3.

**Followup body update at WB5:** extend
`MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT` (FOLLOWUPS.md line 196)
with this second-occurrence citation + courtesy-delay protocol +
worktree-pivot trigger condition.

---

## VI. References

- Phase 1 diagnose: `docs/coordination/mb-t21-diagnose-2026-05-07.md`
- Followup charter: `docs/FOLLOWUPS.md` line 126 (`MB-F-T20-CHAT-TAB-CONTENT-STYLING`)
- Atomic-chain methodology: `docs/FOLLOWUPS.md` line 196 (`MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT`)
- MB-T18 WB1 race incident clarification: `docs/coordination/mb-t18-wb1-index-race-clarification-2026-05-07.md`
- CLAUDE.md sections governing: §2.2, §2.3, §2.4, §2.6, §2.7, §3.6, §4.1, §4.2, §4.5, §4.6
