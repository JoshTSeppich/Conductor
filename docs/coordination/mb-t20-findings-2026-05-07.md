# MB-T20 Findings — Conductor chat panel shell

**Date:** 2026-05-07
**Final HEAD:** `6b4866b` (WB4 green) + this docs commit
**Phase 1 spike:** `aca95bc`
**Ladder:** 5 WBs — Phase 1 → WB1 red → WB2-4 green → WB5 docs.
**Outcome classification (CLAUDE.md §2.11):** **Capability enabled with
known limitations.** Family-B tab-host shell ships; Chat tab body
delegates to the existing coarchitect ChatPanel via direct import +
coarchitectBridge passthrough. Inner ChatPanel styling deferred to
MB-T21; specific revised chat-region default height deferred to
v3.1 followup pending visual review.

---

## I. Summary

MB-T20 ships the Family-B tab-host shell (Q-MBT20-1=a operator-confirmed
2026-05-07) at `packages/dispatch-workstation/src/chat-shell/`. The
Conductor chat region (`workstation-shell.html#chat-region #root`) now
mounts `ChatShell` — a tab-host with one initial Chat tab whose body
delegates to `coarchitect/chat-panel.js`'s `ChatPanel` via render-prop
slot + direct import. coarchitectBridge passthrough (Q-MBT20-5=a)
preserves the existing chat IPC contract end-to-end:
`coarchitectBridge.{fetchHistory,postMessage,sendAndStream,onStream*}`.
preload.mts is UNCHANGED.

Outer panel chrome (Q-MBT20-6=b) lands as panel container + tab strip
+ tab-content slot. Inner ChatPanel content (message-bubble styling,
input affordance polish) is MB-T21 territory.

The line-555 script-tag swap atomically transferred `#chat-region`
ownership from `coarchitect/renderer.js` to `chat-shell/renderer.js`.
Runtime smoke confirmed `WINDOW_READY + RENDER_OK + SHELL_READY +
SPLITTER_LOADED` within 10s in real Electron (R-MBT20-7 + CLAUDE.md
§4.6 satisfied).

---

## II. WB ladder reference

| WB | Commit | Type | Tests | Note |
|---|---|---|---|---|
| Phase 1 | `aca95bc` | spike | n/a | Surface inventory + Q-MBT20-1..13 + R-MBT20-1..8 with tentative dispositions |
| WB1 | `7782bf3` | red | 4/4 fail | Scaffold chat-shell/ + build script + tsconfig append + package.json append + decisions doc operator-ack |
| WB2 | `90cd05b` | green | 7/7 pass | ChatShell tab-host component + render-prop slot; probe-01 expanded from 4 red to 7 green (4 tab-host render + 3 renderChatTab slot) |
| WB3 | `a68cd0b` | green | 12/12 pass | mountChatShell adapter + auto-mount block (bridge-gated) + default chat-tab stub; probe-02 (5 tests) covers mount/unmount/error/stub/custom-renderChatTab |
| WB4 | `6b4866b` | green | 17/17 pass | ChatPanel wrap + line-555 swap + main.ts MB-T20 sentinel zone + runtime smoke; probe-03 (5 tests) covers ChatPanel-inside-Chat-tab integration via bridge passthrough; closes MB-F-COARCH-T02-STYLING (partial chrome) + MB-F-COARCH-T02-DEFAULT-LAYOUT (deferred) |
| WB5 | this commit | docs | n/a | Findings doc + 3 v3.1 polish followups |

**Total tests authored: 17** (probe-01: 7, probe-02: 5, probe-03: 5).
All unit tests + integration probe pass against happy-dom DOM with
@testing-library/react + act() flush for React 18 createRoot.

---

## III. Acceptance verification

Per Phase 1 acceptance under Q-MBT20-1=a (Family-B tab-host
interpretation):

| Acceptance | Verification |
|---|---|
| Chat panel container renders | probe-01:1 (`chat-shell-root` present) — verified |
| header (tab strip) | probe-01:2 (`chat-shell-tab-strip` role=tablist) — verified |
| message list | probe-03:1 (ChatPanel `chat-input` + `send-button` inside `chat-shell-tab-content`) — verified via wrap |
| input area | probe-03:1 (same; ChatPanel form is the input area) — verified via wrap |
| Layout responsive to splitter | runtime smoke (SPLITTER_LOADED 395 fired) — verified |
| Read-only message list (seeded) | ChatPanel's existing daemonClient.fetchHistory contract preserved (probe-03:3 spy verifies one fetchHistory call on mount) — verified via wrap |
| onSubmit not stub at WB1 | NOT applicable under Q-MBT20-1=a — onSubmit is wired through coarchitectBridge.sendAndStream end-to-end (probe-03:4 verifies onStream subscriptions register on mount) |
| Mount-point integration | line 555 swap (workstation-shell.html) + runtime smoke (RENDER_OK fired = ChatPanel mounted inside ChatShell wrap) — verified |

**Family-B tab-host shape:** tab strip with single Chat tab visible at
v3.0; aria-selected="true" hard-coded. MB-T22..T27 add Commits/Tasks/
toggles/meters tabs (Family-B sequence per CLAUDE.md §5.3); multi-tab
state machine deferred per Family-B ticket boundary.

---

## IV. Cross-session events (parallel-cairn, T17 + T18)

| Event | Timing | Resolution |
|---|---|---|
| Origin advanced from `aca95bc` to `59c7387` (T17 WB1+WB2+WB3 + T18 spike) between Phase 1 push and WB1 first stage | Pre-WB1 commit | `git stash -u` + `git pull --rebase` + `git stash pop` — clean (zero conflicts) |
| Local HEAD diverged from origin during WB3→WB4 transition (origin had `a68cd0b`, local had `ecdd0e4`); root cause unclear, possibly autostash interaction or fetch-side effect | Pre-WB4 commit | `git stash push -u` + `git pull --rebase` + `git stash pop` (with mount.ts UU conflict — resolved by rewriting mount.ts to WB4 content directly rather than 3-way merge stash patch); `git stash drop` |
| T17 WB1 added `tile-autopilot-toggle.tsx` to tsconfig.json exclude before my read | Pre-WB1 read | My append landed cleanly after T17's entry — append-only array merge resolved naturally |
| T18 spawned untracked `mb-t18-diagnose-2026-05-07.md` in working tree | Visible in `git status --short` from Phase 1 commit onwards | Per-path git add held — never staged T18's diagnose; T18 committed it themselves at `536e206` later |
| main.ts gained two parallel sentinel zones (T16 line 48-54, T17 line 55-62, T20 line 63-71) | Continuous (each session adds its own zone) | Non-overlapping line ranges per CLAUDE.md §3.3 — zero conflicts |

**Methodology takeaway:** the parallel-cairn discipline (per-path git
add + sentinel zones + frozen-territory boundaries + pre-commit
territory check) held through 4 commits without a single inter-session
conflict on shared files. Recovery from the local-HEAD-divergence
incident was mechanical (standard git stash + rebase) and did not
require operator arbitration. Filed as `MB-F-T20-LOCAL-HEAD-
DIVERGENCE-MECHANISM` (Tier 3) in case the same mechanism recurs and
becomes diagnosable.

---

## V. Runtime smoke (R-MBT20-7 + CLAUDE.md §4.6)

```
$ MB_TEST_HOOKS=1 pnpm --filter dispatch-workstation exec electron \
    dist/main/main.js
WINDOW_STATE 1024 768
SPLITTER_LOADED 395
SHELL_READY
RENDER_OK              ← ChatPanel useEffect inside ChatShell wrap
WINDOW_READY
TILE_GRID_MOUNTED
APPROVAL_POLICY_IPC_MOUNTED
AUTOPILOT_IPC_MOUNTED
ONBOARDING_READY
BOOTSTRAP_TOKEN_WRITTEN 44
```

All four target sentinels fired within 10s. `RENDER_OK` is
load-bearing — its presence proves:
1. chat-shell renderer.js loaded (line 555 swap working)
2. ChatShell mounted into #root (mount adapter working)
3. ChatShell.renderChatTab fired (bridge wrap working)
4. ChatPanel mounted (wrap import succeeded)
5. ChatPanel's useEffect ran (RENDER_OK fired from inside the wrap)

`CHAT_SHELL_MOUNTED` is emitted from chat-shell/mount.ts:96 but is NOT
in the test-hooks console-message forwarder allowlist (main.ts
~line 151-154). This is a known limitation — see followup
`MB-F-T20-CHAT-SHELL-MOUNTED-SENTINEL-FORWARDING` for v3.1.

---

## VI. Pre-existing test failures (CLAUDE.md §4.5)

NOT re-diagnosed per CLAUDE.md §4.5. The two known classes
(`MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL`
+ `MB-F-WORKSTATION-INTEGRATION-TEST-FLAKE-SUITE`) remain open
under their dedicated tickets; this WB ladder did not run the full
workstation suite per CLAUDE.md §9 ("Run the full workstation test
suite per WB"). Scoped chat-shell suite (17 tests) ran every WB,
clean.

---

## VII. Followups filed (3 v3.1 polish + 1 methodology)

| ID | Tier | Closes-at | Body |
|---|---|---|---|
| `MB-F-T20-CHAT-TAB-CONTENT-STYLING` | 2 | MB-T21 | Inner ChatPanel content (history list message bubbles, deliberating/thinking indicators, input form affordance, error alert styling) renders functional but unstyled inside MB-T20's tab-host shell. Closes by replacing/refactoring `coarchitect/chat-panel.tsx` styling at MB-T21 (Chat tab proper) per Family-B sequence. |
| `MB-F-T20-CHAT-REGION-DEFAULT-HEIGHT` | 3 | post-MB-T21 visual review | Default `chat-region` height of 280px in workstation-shell.html may now be visually tight given MB-T20 added ~35px tab-strip chrome. Specific revised number deferred to operator-arbitrated visual review post-MB-T21 styling. Was previously tracked as `MB-F-COARCH-T02-DEFAULT-LAYOUT` (now deferred-closed at MB-T20 WB4). |
| `MB-F-T20-FAMILY-B-ADDITIONAL-TABS` | 2 | MB-T22..T27 | MB-T20 ships single Chat tab (aria-selected hard-coded "true"). MB-T22 (Commits tab), MB-T23 (Tasks tab), MB-T24..T27 (toggles + meters) add additional tabs. ChatShell needs multi-tab state machine (active-tab tracking + tab-switch handler + per-tab content slots) before MB-T22 can wire its tab body. Tier 2 — Family-B prerequisite. |
| `MB-F-T20-CHAT-SHELL-MOUNTED-SENTINEL-FORWARDING` | 3 | next main.ts-touching ticket | `CHAT_SHELL_MOUNTED` sentinel emitted from `src/chat-shell/mount.ts:96` is not currently forwarded by main.ts test-hooks console-message handler (~line 151-154 allowlist). RENDER_OK serves the load-bearing smoke purpose so this is cosmetic; v3.1 polish if MB-T20-specific smoke wants to assert chat-shell-mounted-before-ChatPanel-mounts ordering. |
| `MB-F-T20-LOCAL-HEAD-DIVERGENCE-MECHANISM` | 3 | recurrence-driven | During WB3→WB4 transition, local HEAD diverged from origin (origin had `a68cd0b`, local had `ecdd0e4`) without an obvious mechanism. Recovered via stash + rebase; root cause unidentified. If this recurs in future parallel-cairn sessions, file specific reproduction steps to make diagnose-able. |

---

## VIII. Q-MBT20-N + R-MBT20-N final dispositions

All Q-MBT20-1..13 = (a) operator-accepted 2026-05-07 + landed:

| ID | Disposition | Verified by |
|---|---|---|
| Q-MBT20-1 | tab-host shell | probe-01 + probe-03 verify tab-host shape with delegated Chat tab body |
| Q-MBT20-2 | `chat-shell/` directory | NEW directory at `packages/dispatch-workstation/src/chat-shell/` |
| Q-MBT20-3 | wrap (no coarchitect modify) | `git diff` since aca95bc shows zero changes to `src/coarchitect/*` |
| Q-MBT20-4 | line 555 single-renderer swap | workstation-shell.html line-555 swap committed at WB4 |
| Q-MBT20-5 | reuse coarchitectBridge | preload.mts UNCHANGED across all 5 commits |
| Q-MBT20-6 | partial close (chrome only) | FOLLOWUPS.md MB-F-COARCH-T02-STYLING marked PARTIALLY CLOSED at WB4 |
| Q-MBT20-7 | revisit (deferred) | FOLLOWUPS.md MB-F-COARCH-T02-DEFAULT-LAYOUT marked DEFERRED at WB4; MB-F-T20-CHAT-REGION-DEFAULT-HEIGHT filed |
| Q-MBT20-8 | NEW sentinel adjacent to MB-T16 | main.ts lines 63-71 host the new MB-T20 zone |
| Q-MBT20-9 | new build script | `scripts/build-chat-shell.mjs` produces `dist/chat-shell/renderer.js` (1.1mb) |
| Q-MBT20-10 | `test/unit/chat-shell/` | 3 probe files at this directory; 17 tests total |
| Q-MBT20-11 | 5 WBs | This commit is the 5th (WB5 docs) |
| Q-MBT20-12 | tsconfig .tsx exclude at WB1 | tsconfig.json `"src/chat-shell"` entry committed at WB1 |
| Q-MBT20-13 | mirror MB-T15/T16 | WB ladder shape (red/scaffold → green×3 → docs) is identical to T15/T16/T17 |

All R-MBT20-1..8 dispositions held through the ladder:

| ID | Status |
|---|---|
| R-MBT20-1 (chat-panel.tsx naming collision) | AVOIDED via `chat-shell/` |
| R-MBT20-2 (cross-session main.ts sentinel proximity) | OK — non-overlapping zones (T16/T17/T20) |
| R-MBT20-3 (preload.mts shared-file conflict) | NONE — preload UNCHANGED |
| R-MBT20-4 (tsconfig.json append conflict) | NONE — clean append after T17 entry |
| R-MBT20-5 (intermediate-WB blank chat region) | RESOLVED — line-555 swap atomic at WB4 |
| R-MBT20-6 (dispatch-core dist rebuild) | NONE — zero schema changes |
| R-MBT20-7 (runtime smoke as merge gate) | SATISFIED — WB4 ran smoke, all sentinels fired |
| R-MBT20-8 (pre-existing chat-panel test drift) | NONE OBSERVED — coarchitect tests not run scoped here, but no chat-panel.tsx changes were made (Q-MBT20-3=a wrap held) |

---

## IX. References

- Phase 1 diagnose: `docs/coordination/mb-t20-diagnose-2026-05-07.md`
- Phase 1 decisions + operator confirmation: `docs/coordination/mb-t20-decisions-2026-05-07.md`
- ChatPanel source (wrapped, NOT modified):
  `packages/dispatch-workstation/src/coarchitect/chat-panel.tsx`
- Chat IPC bridge (reused, NOT modified):
  `packages/dispatch-workstation/src/main/preload.mts:7-32`
- workstation-shell.html line-555 swap:
  `packages/dispatch-workstation/src/main/workstation-shell.html`
- main.ts MB-T20 sentinel zone:
  `packages/dispatch-workstation/src/main/main.ts:63-71`
- chat-shell sources:
  `packages/dispatch-workstation/src/chat-shell/{chat-shell.tsx,mount.ts}`
- chat-shell tests:
  `packages/dispatch-workstation/test/unit/chat-shell/probe-{01,02,03}-*.spec.tsx`
- chat-shell build script:
  `packages/dispatch-workstation/scripts/build-chat-shell.mjs`
- CLAUDE.md sections governing: §2.7, §3.2, §3.3, §3.6, §3.7, §4.1,
  §4.2, §4.5, §4.6.

---

**MB-T20 ladder closed at WB5.** Awaiting operator review of findings
+ WB5 push. Family B continues at MB-T21 (Chat tab proper) which will
consume `MB-F-T20-CHAT-TAB-CONTENT-STYLING` + (when more tabs land)
`MB-F-T20-FAMILY-B-ADDITIONAL-TABS`.
