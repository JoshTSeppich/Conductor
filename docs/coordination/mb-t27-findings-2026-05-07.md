# MB-T27 Findings — Model mix indicator

**Date:** 2026-05-07
**Final HEAD:** `7fd7af8` (WB2 green) + this docs commit
**Phase 1 spike:** `ed7362c`
**Ladder:** 3 WBs — Phase 1 → WB1 red → WB2 green → WB3 docs (this commit).
**Outcome classification (CLAUDE.md §2.11):** **Capability enabled with
known limitations.** Mix indicator wiring is end-to-end correct (component
renders, container subscribes, idempotent dedup verified, cleanup verified);
v3.0 ship: chips render at 0 even when N>0 sessions live because the
`model` field on `TileGridSessionEntry` is currently always undefined in
production (spawn-handler returns no model field). Two Tier 2 followups
queued for v3.1 closure (model-field-plumb-from-spawn + kill-event-
propagation).

---

## I. Summary

MB-T27 ships the per-model session-count chips (S4.6/O4.6/O4.7·1M/H) in
the chat-shell header-bar slot per docs/coordination/t26-t27-coord.md
slot ordering left-to-right:

```
[ plan-usage ring ]   [ cost-meter ]   [ model-mix ]
   MB-T25 (future)      MB-T26 (C)       MB-T27 (this ticket)
```

The MixIndicator component is a pure-render React surface that takes a
`sessions: readonly SessionLike[]` prop and groups via `modelChipShortcode`
from `src/tile-grid/color-helpers.js` (MB-T15 pure-fn, already covered by
`tile-grid-color-helpers/probe-01` 26/26). The MixIndicatorContainer
wraps MixIndicator with a `useState<readonly SessionLike[]>([])` +
`useEffect` subscription to `bridge.onSpawnResult` — feeding sessions
into the pure-render surface as they spawn.

`mount.ts` `resolveRenderModelMix` follows the 3-tier resolution pattern
established by C's `resolveRenderCostMeter`:
1. Explicit `opts.renderModelMix` (test-injection path)
2. `window.workstationBridge?.onSpawnResult` (production auto-build)
3. Neither → return undefined (chat-shell renders empty model-mix slot)

`preload.mts` is UNCHANGED per Q-MBT27-3=a (reuses the existing
`workstationBridge.onSpawnResult` exposed at `preload.mts:55-56` /
`attachSpawnResultListener`).

---

## II. WB ladder reference

| WB | Commit | Type | Tests | Note |
|---|---|---|---|---|
| Phase 1 | `ed7362c` | spike | n/a | Surface inventory + Q-MBT27-1..10 + R-MBT27-1..10 with tentative dispositions; operator-confirmed all (a)-track at HALT 0 |
| WB1 | `0676090` | red | 8/8 fail | Scaffold mix-indicator.tsx + probe-01 + sentinel-zone reservations in chat-shell.tsx + mount.ts; stubs return null → red proof |
| WB2 | `7fd7af8` | green | 17/17 pass | MixIndicator pure-render impl + MixIndicatorContainer subscriber + mount.ts path-2 wiring + probe-02 (9 new tests); probe-01 8 RED → 8 GREEN |
| WB3 | this commit | docs | n/a | Findings doc + 4 followups appended to FOLLOWUPS.md |

**Total tests authored:** 17 (probe-01: 8 pure-render assertions;
probe-02: 9 subscription assertions). All 17 pass at WB2 GREEN against
happy-dom DOM with @testing-library/react + act() flush for React 18
useState updates.

**Scoped run at WB2 verification:** 9 files / 82 tests / 0 failures.
- `chat-shell-mix-indicator/probe-01`: 8/8 PASS (RED → GREEN flip)
- `chat-shell-mix-indicator/probe-02`: 9/9 PASS (new)
- `chat-shell/probe-01..05`: ALL PASS (no regression to MB-T20/T22 surface)
- `cost-meter/probe-01`: 7/7 PASS (Terminal C surface intact)
- `tile-grid-color-helpers/probe-01`: 26/26 PASS (modelChipShortcode dependency intact)

---

## III. Acceptance verification — HONEST framing

Per operator prompt acceptance criteria:

| Acceptance | Verification | Honest framing |
|---|---|---|
| **Indicator updates within 1s of session spawn** | probe-02 test 4 fires fake `bridge.onSpawnResult` cb with sonnet-4-6 model → S46 chip count 0 → 1 immediately via React state machine; subscription latency ≪ 1s | **Met against test fixtures with model field present.** [LIMITED] in production: spawn-handler.ts:387-393 returns no model field → indicator counts session as "unknown" bucket → no chip increments. Operator observes the spawn-result envelope arriving but no chip change. |
| **Indicator updates within 1s of session kill** | n/a — no test authored (acceptance gap acknowledged at HALT 0) | **NOT met.** No `onSessionKilled` IPC channel exists; chips do not decrement when sessions are killed via tile-grid UI. `workstationBridge.killSession` is renderer→main invoke only; main has no broadcast back to other renderers. Q-MBT27-4=a accepted the gap; `MB-F-T27-KILL-EVENT-PROPAGATION` (Tier 2) filed for v3.1 closure. |
| **Counts accurate against live session list** | probe-01 test 4-6: 3 sonnet → S46=3; mixed 6 sessions → S46=1, O46=1, O471M=2, H=2; opus-4-7 base + suffixed both → O471M | **Met against the model field as currently populated.** [LIMITED] in production: `model` is always undefined on `TileGridSessionEntry` because spawn-handler doesn't carry it. Counts ARE accurate (always 0) against the always-undefined field. `MB-F-T27-MODEL-FIELD-PLUMB-FROM-SPAWN` (Tier 2) filed for v3.1 closure. |
| **Renders with zero-state (all zeros visible, not collapsed)** | probe-01 test 1-3: mix-indicator-root present; all 4 chips render in zero-state; counts = 0 with sessions=[] | **Met fully.** Zero-state is the dominant production state in v3.0 because of the model-undefined gap; all 4 chips render at 0 not collapsed; layout occupies stable header-bar slot space. |

**Outcome classification (CLAUDE.md §2.11):** "Capability enabled with
known limitations."

**What's enabled (KNOWN, verified by tests):**
- 4 fixed chips (S46/O46/O471M/H) render in zero-state
- Pure-render counting via `modelChipShortcode` correctly groups all
  4 chip categories including suffixed model variants
- "Unknown" bucket excludes undefined / unmapped models from chips
  (Q-MBT27-5=a)
- MixIndicatorContainer subscribes to `bridge.onSpawnResult` exactly
  once on mount
- Type guard `isSpawnSuccessReply` rejects malformed / null / undefined
  / non-success replies
- Idempotent on duplicate sessionName (daemon-recovery re-fires)
- Cleanup fn returned by `onSpawnResult` invoked on unmount
- mount.ts `resolveRenderModelMix` 3-tier resolution mirrors C's
  `resolveRenderCostMeter` pattern; production auto-builds closure
  from `window.workstationBridge.onSpawnResult` when exposed

**What's limited (KNOWN, surfaced as Tier 2 followups for v3.1):**
- `TileGridSessionEntry.model` is always undefined in production:
  `spawn-handler.ts:387-393` returns `{sessionName, sessionId,
  panelMounted, cwd}` only. Indicator chips render at 0 even when N>0
  sessions live. → `MB-F-T27-MODEL-FIELD-PLUMB-FROM-SPAWN` (Tier 2).
- No `onSessionKilled` IPC channel exists. Indicator does not
  decrement on session kill. → `MB-F-T27-KILL-EVENT-PROPAGATION`
  (Tier 2).

**Family-B v3.0 ship-gate completeness depends on subsequent operator
decisions** about whether to ship MB-T27 with these limitations or
hold for the two Tier 2 followups to resolve. The mix-indicator's
acceptance language ("counts accurate against live session list",
"updates within 1s of spawn/kill") is structurally satisfied against
the model field as currently populated; the field itself is the gap.
Honest framing, not "Improved" framing.

---

## IV. §3.18 actor-side perspective on cross-session stash interaction

**Setup.** During WB2 GREEN authoring, Terminal D's working tree
contained Terminal B's MB-T22 WB4 WIP (commits-tab integration in
`mount.ts` + `commits-tab.tsx` + new untracked
`commits-tab-tmpdir-fixture.test.tsx`). D's `mount.ts` edits would
sweep B's content into D's commit (the
`MB-F-PARALLEL-CAIRN-SHARED-TREE-CONTENT-SWEEP` Tier 1 shape).

**Path β (operator-arbitrated).** D stashed B's WIP via explicit-paths
`git stash push -u`:

```
git stash push -u -m "B WB4 WIP — MB-T22 commits-tab integration
(stashed by Terminal D for MB-T27 WB2 green)" -- \
  packages/dispatch-workstation/src/chat-shell/mount.ts \
  packages/dispatch-workstation/src/chat-shell/commits-tab.tsx \
  packages/dispatch-workstation/test/integration/chat-shell/commits-tab-tmpdir-fixture.test.tsx
```

D named B explicitly in the stash message + chose stash-not-delete
(preserved recovery state). The action was defensible under shared-tree
constraints — alternative was halt indefinitely.

**B-side concurrent flow (recipient-side, per operator narrative).** B's
atomic-chain mid-flight saw the disappearance as `git commit` exit-1
"nothing added to commit but untracked files" — easily misinterpretable
as B's own staging mistake. B held discipline (anti-fabrication §3.1 +
halt §3.7), investigated via independent commands, recovered cleanly,
shipped at `226c2e9` with full incident citation in commit subject:
*"Tier-1 stash-recovery incident cited"*.

**D-side outcome.** When D's WB2 atomic-chain ran `git pull --ff-only`,
B's `226c2e9` had already landed on origin/main. D's local main
fast-forwarded; D's mount.ts edits applied cleanly on top of B's
sentinel zones (B and D both used non-overlapping sentinel zones in
mount.ts — the §3.3 discipline held at the file-content level).
`git stash list` was empty post-pull (B presumably recovered + dropped
the stash entry), so D's planned `git stash pop` had no entry to pop.
Final `mount.ts` on origin/main contains all three terminals' sentinel
zones cleanly intact: MB-T26 (C), MB-T22 WB4 (B), MB-T27 (D) — verified
via `grep -n "=== BEGIN\\|=== END" mount.ts` post-WB2.

**Methodology lesson — actor side.** The action was structurally
cross-session-destructive even though it was reversible. The failure
mode exists because shared working tree allows one session to act on
another session's working state at all. Even with both sessions
executing perfect cairn discipline (D's stash-not-delete + named-
authorship attribution; B's anti-fabrication + halt + investigate-
via-independent-commands), the incident still occurred.

**Actor-side rule (filed as Tier 2 methodology FU
`MB-F-PARALLEL-CAIRN-STASH-CROSS-SESSION-RECOVERY`):** *don't stash
other sessions' work even when blocked*. Prefer halt-and-coordinate
(per `MB-F-PARALLEL-CAIRN-WORKING-TREE-BLOCKING`'s recommended
workaround) over reversible-but-still-cross-session-destructive
action. Pairs with B's recipient-side Tier 1 followup
`MB-F-PARALLEL-CAIRN-CROSS-SESSION-STASH-DESTRUCTIVE` (B's WB5
forthcoming).

**Forward fix.** Worktree isolation per CLAUDE.md §4.3 — the only
structural defense. Operator-arbitrated whether next dispatch wave
pivots to worktree-per-session.

---

## V. Cross-session events (parallel-cairn, 4-session run)

| Event | Timing | Resolution |
|---|---|---|
| Origin advanced from `934c0a8` (session start) → `f2b7ccd` (between Phase 1 author + commit) | Pre-Phase-1 commit | `git pull --ff-only` fast-forwarded cleanly during atomic chain; Phase 1 spike landed on top at `ed7362c` |
| Origin advanced from `ed7362c` → `53a9fa3` between WB1 author + commit | Pre-WB1 commit | `git pull --ff-only` fast-forwarded; WB1 RED landed at `0676090` |
| C's MB-T26 sentinel zones over-wrap shared territory (`<div data-testid="chat-shell-header-bar">` + `root.render` call) | WB1 authoring | C's MB-T26 zone header comment explicitly authorized cross-zone nesting (*"Terminal D adds model-mix slot to the SAME header-bar element via its own non-overlapping sentinel zone"*) → MB-T27 zones nest inside MB-T26 zones in chat-shell.tsx JSX + mount.ts mountChatShell body. C's logic UNCHANGED. Surfaced as Tier 3 FU `MB-F-T27-WB1-MB-T26-ZONE-NEST` |
| Harness blocked leading `sleep 30` at first WB1 commit attempt | WB1 atomic-chain attempt 1 | Operator-arbitrated Path α (commit without sleep); Round 2 evidence of §3.11 harness incompatibility filed at MB-T26 WB4 (`MB-F-§3.11-COURTESY-DELAY-HARNESS-INCOMPATIBILITY-ROUND-2`) |
| Working-tree CWD drift (earlier `cd packages/dispatch-workstation` for vitest) broke first atomic-chain `git add` | WB1 atomic-chain attempt 2 | Retry with explicit `cd /Users/.../foxworks-dispatch` prefix; chain succeeded; index-state unchanged between attempts |
| Terminal A's discovered §3.11 workaround (post-`git status --short` sleep 30) functional in this session | WB1 + WB2 commits | `git status --short && sleep 30 && ...` chain succeeded both times; harness allows sleep AFTER cheap initial command |
| Terminal B's MB-T22 WB4 WIP visible uncommitted in shared working tree at WB2 start | Pre-WB2 authoring | Path β stash workflow (per §IV above); B independently recovered + shipped at `226c2e9`; D's WB2 landed clean on top at `7fd7af8` |
| Three-terminal sentinel-zone coexistence in mount.ts | Final WB2 state | All non-overlapping; verified via grep — MB-T26 (C, 4 zones), MB-T22 WB4 (B, 5 zones), MB-T27 (D, 4 zones) coexist cleanly |

**Methodology takeaway:** parallel-cairn discipline (per-path git add +
sentinel zones + atomic-chain diff-verify + non-overlapping zone
namespaces) held through 3 commits without a sweep incident at this
terminal. The §3.18 stash incident was structural (shared-tree blocker
+ Path β), not a discipline failure. Round 2 evidence accumulating
that **shared working tree is the root cause of multiple distinct
failure modes** (`MB-F-PARALLEL-CAIRN-SHARED-TREE-CONTENT-SWEEP` +
`MB-F-PARALLEL-CAIRN-WORKING-TREE-BLOCKING` +
`MB-F-PARALLEL-CAIRN-STASH-CROSS-SESSION-RECOVERY`); worktree
isolation per CLAUDE.md §4.3 closes the family.

---

## VI. Q-MBT27-N + R-MBT27-N final dispositions

All Q + R rows operator-confirmed (a)-track at HALT 0 (2026-05-07).
WB1+WB2 implemented per dispositions verbatim; no flips during ladder.

| ID | Disposition | WB landing |
|---|---|---|
| Q-MBT27-1 (header bar location) | (a) NEW header bar above tab strip with named slots | C's MB-T26 WB3 landed the `chat-shell-header-bar` element (`09b38ce`); MB-T27 WB1 added `renderModelMix?` slot inside it |
| Q-MBT27-2 (slot pattern) | (a) discrete `renderModelMixSlot` + `renderCostMeterSlot` props | WB1 added `renderModelMix?` to ChatShellProps + JSX slot |
| Q-MBT27-3 (session list source) | (a) `workstationBridge.onSpawnResult` subscription (preload.mts UNCHANGED) | WB2 path-2 `resolveRenderModelMix` peeks `window.workstationBridge?.onSpawnResult` |
| Q-MBT27-4 (kill-event coverage) | (a) accept gap + Tier 2 v3.1 followup | `MB-F-T27-KILL-EVENT-PROPAGATION` filed at WB3 |
| Q-MBT27-5 ("unknown" bucket) | (a) NOT shown in chips; chips at 0 | WB2 `countByChip` returns continue on `chip === null` from `modelChipShortcode` |
| Q-MBT27-6 (component file location) | (a) `src/chat-shell/mix-indicator.tsx` co-located | WB1+WB2 |
| Q-MBT27-7 (data-testid contract) | (a) `mix-indicator-root` + `mix-indicator-chip-{S46,O46,O471M,H}` per-chip + `-count` suffix | WB1 probe-01 + WB2 impl |
| Q-MBT27-8 (WB count) | (a) 3 WBs | Phase 1 spike + WB1 red + WB2 green + WB3 docs (Phase 1 separate from WB count) |
| Q-MBT27-9 (closes existing FU) | (a) none | n/a |
| Q-MBT27-10 (tsconfig.json) | (a) verify-no-edit; chat-shell directory tsconfig-excluded | Verified at WB1 — chat-shell pattern excludes mix-indicator.tsx automatically |

| ID | Risk | Disposition outcome |
|---|---|---|
| R-MBT27-1 | Shared-file conflict on chat-shell.tsx with Terminal C | MITIGATED via Q-MBT27-2=a + sequence (C first, D second per t26-t27-coord.md) + per-path git add + diff-verify; held |
| R-MBT27-2 | preload.mts changes (frozen contract) | AVOIDED via Q-MBT27-3=a; preload.mts UNCHANGED at all 3 WBs |
| R-MBT27-3 | Kill-event acceptance gap | ACCEPTED with Tier 2 followup; framed as "Capability enabled with known limitations" §2.11 |
| R-MBT27-4 | model=undefined → all chips at 0 | ACCEPTED; counts ARE accurate against the field as populated; Tier 2 followup filed |
| R-MBT27-5 | dispatch-core dist rebuild | ZERO impact — no schema spine ingress |
| R-MBT27-6 | Runtime-launch smoke as merge gate | NOT-REQUIRED — no `src/main/*.ts` changes; chat-shell renderer bundle only |
| R-MBT27-7 | Test directory layout | HELD — `test/unit/chat-shell-mix-indicator/probe-NN-*.spec.tsx` |
| R-MBT27-8 | esbuild script | HELD — mix-indicator.tsx co-bundled via existing `scripts/build-chat-shell.mjs` |
| R-MBT27-9 | Pre-existing test failures | NOT re-diagnosed; scoped run did not touch them |
| R-MBT27-10 | Cross-session origin advance | HELD — 2 mid-ladder origin advances handled cleanly via FF-pull |

---

## VII. Followups filed at WB3

Four followups appended to `docs/FOLLOWUPS.md`:

1. **`MB-F-T27-MODEL-FIELD-PLUMB-FROM-SPAWN`** (Tier 2) —
   acceptance-gap closure path for "counts accurate against live
   session list" once spawn-handler returns model field.

2. **`MB-F-T27-KILL-EVENT-PROPAGATION`** (Tier 2) — acceptance-gap
   closure path for "updates within 1s of kill" once `onSessionKilled`
   IPC channel exists (paired with #1; same v3.1 closure window).

3. **`MB-F-PARALLEL-CAIRN-STASH-CROSS-SESSION-RECOVERY`** (Tier 2
   methodology, actor-side) — actor-side perspective on §3.18 stash
   interaction; pairs with B's recipient-side Tier 1
   `MB-F-PARALLEL-CAIRN-CROSS-SESSION-STASH-DESTRUCTIVE` (B's WB5
   forthcoming). Body: *"don't stash other sessions' work even when
   blocked"*.

4. **`MB-F-T27-WB1-MB-T26-ZONE-NEST`** (Tier 3) — sentinel-zone
   scoping observation; C's MB-T26 zones over-wrap shared territory
   in chat-shell.tsx JSX + mount.ts mountChatShell body; MB-T27 zones
   nest inside per C's authored cross-zone authorization. Operator-
   arbitrated whether action needed.

---

## VIII. References

- **Phase 1 diagnose:** `docs/coordination/mb-t27-diagnose-2026-05-07.md`
  (commit `ed7362c`)
- **Decisions doc:** `docs/coordination/mb-t27-decisions-2026-05-07.md`
  (commit `ed7362c`)
- **Cross-session coord (C ↔ D):** `docs/coordination/t26-t27-coord.md`
- **Implementation:**
  - `packages/dispatch-workstation/src/chat-shell/mix-indicator.tsx`
    (commit `7fd7af8`)
  - `packages/dispatch-workstation/src/chat-shell/chat-shell.tsx`
    MB-T27 zones (commit `0676090`)
  - `packages/dispatch-workstation/src/chat-shell/mount.ts` MB-T27 zones
    (commits `0676090` red, `7fd7af8` green)
- **Tests:**
  - `packages/dispatch-workstation/test/unit/chat-shell-mix-indicator/probe-01-mix-indicator-render.spec.tsx`
    (8 tests; commit `0676090` red → `7fd7af8` green)
  - `packages/dispatch-workstation/test/unit/chat-shell-mix-indicator/probe-02-mix-indicator-container-subscription.spec.tsx`
    (9 tests; commit `7fd7af8` green)
- **Dependency reused:** `src/tile-grid/color-helpers.ts:62-70`
  (`modelChipShortcode` from MB-T15) — no shortcode logic added at
  MB-T27.
- **Out-of-scope but related:** `src/main/spawn-handler.ts:387-393`
  (envelope return) — closure dependency for
  `MB-F-T27-MODEL-FIELD-PLUMB-FROM-SPAWN`. `src/main/preload.mts:51-118`
  (workstationBridge surface) — closure dependency for
  `MB-F-T27-KILL-EVENT-PROPAGATION`.
