# MB-T18 Phase 2 Findings — 2026-05-07

**Status:** WB4 (final) commit
**HEAD at authoring:** post-WB3 (`31ffee8`)
**Discipline-gap incident:** `ecdd0e4` (titled `red(MB-T18): WB1 —
scaffold tile-footer + decisions doc`) absorbed Terminal A's MB-T17
WB4 territory (7 paths) due to a parallel-cairn index race in
shared-working-tree execution. See §II. Tracked at the Tier 1
methodology followup `MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT`
(filed by this session at clarification commit `2d8d260`).

**Ship outcome:** 4 commits attributed to MB-T18 (Phase 1 spike
`536e206`; WB1 red `ecdd0e4`; WB2 green `453100f`; WB3 green
`31ffee8`) + 1 incident-recovery commit (`2d8d260` clarification +
Tier 1 methodology FU) + this WB4 docs commit. **39 MB-T18 tests**
across 3 directories all GREEN. **End-to-end render path verified**
in unit + integration suite: spawn-handler.ts → SpawnSessionResult.cwd
→ TileGridApp.onSpawnResult → TileGridSessionEntry.cwd →
renderFooterSlot closure → TileFooter (cwd + uptime) → tile-footer-
slot wrapper inside Tile. **0 chartered followups CLOSED** (pure
greenfield slot population — no MB-F-T18 followup existed at ladder
start). **2 v3.1 polish followups filed** at WB4. **0 contract
amendments, 0 frozen-zone touches.** **1 cross-session discipline
incident** documented + recovered + Tier 1 methodology lesson filed.

This doc summarizes the MB-T18 (per-tile footer chrome) ladder
outcome.

---

## I. Ladder outcome by WB

| WB | Commit | Type | Headline | Net new tests |
|---|---|---|---|---|
| Phase 1 | `536e206` | spike | Diagnose — surface inventory + Q-MBT18-1..12 + R-MBT18-1..8 | 0 |
| WB1 | `ecdd0e4` | (see §II) | scaffold tile-footer + decisions doc + tsconfig exclude | 4 (probe-00 module-load) |
| (recovery) | `2d8d260` | chore | clarification doc + Tier 1 methodology FU `MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT` | 0 |
| WB2 | `453100f` | green | tile-footer real chrome (cwd + uptime + 5s tick + auto-units) + spawn-handler SpawnSessionResult.cwd field add + 4 strict-match test fixups | 23 (probe-01 13 + probe-02 11 - probe-00 stub guard 1 = +23 net) |
| WB3 | `31ffee8` | green | Tile.renderFooterSlot + TileGrid plumb + TileGridApp closure + cwd plumb-through | 12 (probe-08 7 + probe-06 5) |
| WB4 | (this commit) | docs | findings + 2 v3.1 polish followups | 0 |

**Cumulative MB-T18 test surface: 39 tests across 3 directories
(tile-footer probe-00..02 + tile-grid-tile probe-08 + tile-grid-app
probe-06), 100% GREEN in scoped runs on origin/main HEAD `31ffee8`.**
Plus existing tile-grid regression tests (130 tile-grid-tile +
tile-grid-app pre-MB-T18) all preserved.

## II. Discipline-gap incident — `ecdd0e4`

**Incident.** MB-T18 WB1 plan: 4 paths (decisions doc + tile-footer
skeleton + probe-00 + tsconfig exclude). Pre-stage `git diff --cached
--stat` confirmed 4 paths. Pre-commit `git status --short` confirmed
4 staged + 7 unstaged from Terminal A's MB-T17 WB4 (in flight in
shared working tree) + 2 unstaged from Terminal C MB-T20 WB2 (in
flight). Between the pre-commit snapshot and the `git commit`
invocation, Terminal A staged their 7 MB-T17 WB4 paths into the
shared `.git/index`. The resulting commit `ecdd0e4` captured all 11
paths under MB-T18's subject.

**Root cause [KNOWN].** The git index is process-shared, NOT session-
private. Per-path `git add <path>` (CLAUDE.md §2.7) protects against
THIS session's accidental sweeps but NOT against another session's
`git add` happening between this session's pre-commit `git status
--short` snapshot and this session's `git commit`. The pre-commit
snapshot is not a lock.

**Recovery [KNOWN].** Operator-arbitrated 2026-05-07 path: accept
`ecdd0e4` as-is (no force-push, no revert — both destructive); file
clarification doc + Tier 1 methodology FU; revise Q7 self-check
protocol to verify against `git log -1 --name-only` POST-commit
inside an atomic chain. Recovery commit `2d8d260` published the
clarification + Tier 1 row. Terminal A's MB-T17 findings doc
(`docs/coordination/mb-t17-findings-2026-05-07.md` §II) acknowledges
the WB4-content-at-ecdd0e4 attribution anomaly.

**Forward fix [KNOWN — applied at WB2/WB3 + recovery commit].** Every
cairn-grammar commit chains `git add → diff --cached --name-only
verify → commit → push` in a SINGLE shell invocation. The `diff`
between staged paths and explicit intended-list aborts the chain if
the index has more or fewer paths than expected. Three subsequent
commits (`2d8d260`, `453100f`, `31ffee8`) each shipped under the
atomic-chain pattern with zero index-race recurrences.

**Tracking.** `MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT` (Tier 1)
encodes the failure mode + forward fix + ceiling consideration
(4-session shared-tree parallel-cairn may exceed safe ceiling; prefer
`git worktree` split per CLAUDE.md §4.3 if shared-tree work scales).

## III. Architectural insights surfaced

### Insight 1 — Render-prop slot population pattern reproducibility (3rd application)

WB3 shipped the third instance of the render-prop slot pattern
established by MB-T16 (Insight 1 in `mb-t16-findings-2026-05-07.md`):
1. `TileProps.renderFooterSlot?: (sessionName: string) => ReactNode`
2. TileGrid plumbs through (additive optional prop).
3. TileGridApp constructs the closure capturing per-session data.
4. Slot wrapper preserves testid + `data-slot` attribute by construction.

Each successive ticket (T16 picker, T17 autopilot, T18 footer) has
landed the integration WB on this pattern with zero regression to
MB-T12 WB5 contract (slot wrapper testids preserved). At 3
applications without amendment, **the pattern is mature**: future
chrome additions (e.g., MB-T19 hero/squad layout if it touches
per-tile slots) should adopt without re-deriving.

### Insight 2 — Bridge adapter pattern is OPTIONALLY skipped

MB-T16 (picker) + MB-T17 (autopilot) both use the bridge adapter
pattern: optional methods on `WorkstationBridgeShape` + adapter built
only when ALL methods exist + null-path graceful degradation.
**MB-T18 footer skips it entirely** per Q-MBT18-6=a — footer is purely
renderer-side data (cwd from extended SpawnSessionResult; uptime from
mount-time snapshot). NO bridge methods on WorkstationBridgeShape;
NO adapter; NO IPC channel; NO main.ts sentinel zone.

**Why this matters:** Insight 2 from `mb-t16-findings-2026-05-07.md`
generalizes the bridge-adapter pattern; Insight 2 here documents that
the pattern is OPTIONAL when the feature can be served by renderer-
local + spawn-result-plumbed data. Future chrome additions should
evaluate the renderer-local path FIRST; the bridge adapter is the
fallback when renderer-local is insufficient.

### Insight 3 — Lazy useState mount-time snapshot pattern for session-meta

WB2 introduced a deterministic test-injection seam pattern for
"time-since-X" semantics:

```ts
const [mountTimestamp] = useState<number>(() => mountedAt ?? Date.now());
```

Production: `mountedAt` prop is omitted; `Date.now()` runs once at
first render. Tests: `mountedAt` is provided as a fixed timestamp;
`vi.useFakeTimers + advanceTimersByTime` drives deterministic uptime
assertions. The pattern decouples test determinism from production
default — test fixtures don't need to mock global Date.now.

**Reusable for any future renderer-side time-since-X chrome** (e.g.,
last-activity, time-since-status-change). Cheaper than instrumenting
the underlying source-of-time.

## IV. Operator dispositions honored

All 12 Q-MBT18 + 8 R-MBT18 dispositions from the Phase 1 diagnose +
decisions doc landed without amendment:

| Disposition | Honored? | Where |
|---|---|---|
| Q-MBT18-1=e (cwd + uptime compound) | ✅ | WB2 TileFooter renders both lines |
| Q-MBT18-2=a (extend SpawnSessionResult cwd) | ✅ | WB2 spawn-handler.ts:198 + 382 |
| Q-MBT18-3=a (renderer mount-time snapshot) | ✅ | WB2 useState lazy-init pattern |
| Q-MBT18-4=a (render-prop on Tile) | ✅ | WB3 Tile.renderFooterSlot |
| Q-MBT18-5=a (separate file tile-footer.tsx) | ✅ | WB1+WB2 |
| Q-MBT18-6=a (NO bridge) | ✅ | TileGridApp WB3 closure passes cwd from session entry only |
| Q-MBT18-7=d (CSS truncate + title= tooltip) | ✅ | WB2 tile-footer.tsx span styles |
| Q-MBT18-8=a (auto-switch units) | ✅ | WB2 formatUptime — verified by 13 probe-01 tests |
| Q-MBT18-9=b (5s tick) | ✅ | WB2 setInterval(5000) — verified by probe-02 tick test |
| Q-MBT18-10=a (NO main.ts sentinel) | ✅ | main.ts UNCHANGED across WB1..WB4 |
| Q-MBT18-11=a (test layout) | ✅ | tile-footer/ probe-00..02 + tile-grid-tile probe-08 + tile-grid-app probe-06 |
| Q-MBT18-12=a (single cwd field) | ✅ | WB2 SpawnSessionResult adds cwd only |
| R-MBT18-1 (render-prop reuse) | PRESERVE | 3rd application; Insight 1 |
| R-MBT18-2 (slot wrapper testid preservation) | ✅ | WB3 wrapper testid + data-slot kept; verified by probe-08 |
| R-MBT18-3 (T17 territory mitigations) | ACCEPT WITH MITIGATIONS — incident occurred | See §II + Tier 1 FU |
| R-MBT18-4 (SpawnSessionResult ripples) | VERIFIED at WB2 | 4 strict-match tests updated; no test deletions |
| R-MBT18-5 (mount-time uptime reload semantics) | ACCEPT for v3.0 | Followup `MB-F-T18-FOOTER-DAEMON-AUTHORITATIVE-SPAWN-TIME` filed at WB4 |
| R-MBT18-6 (TS dual-import drift) | NONE NEEDED | tile-footer.tsx uses no dispatch-core types |
| R-MBT18-7 (tsconfig .tsx exclude) | ✅ | WB1 added entry |
| R-MBT18-8 (uptime re-render churn) | ACCEPT | ≤1.6 setState/s; React reconciliation handles |

## V. Methodology audit

| Discipline | Held? |
|---|---|
| Per-path git operations (no -A or .) | ✅ all commits |
| Pre-commit territory check via `git status --short` | Held at WB1 BUT proved insufficient (§II); replaced by atomic-chain `diff --cached --name-only` verification at WB2 onward |
| Post-commit territory verification via `git log -1 --stat` | ✅ all commits (post-commit `--name-only` integrated INSIDE atomic chain at WB2/WB3) |
| Confidence labels [KNOWN] / [MODELED] / [SPECULATIVE] | ✅ all commit bodies + diagnose + decisions + clarification + this findings doc |
| Anti-fabrication: read source, don't infer | ✅ Phase 1 surface inventory verified via direct `Read`/`grep` of spawn-handler.ts + sessions.ts + schema.ts; no inference at architectural junctions |
| Each commit body includes self-check Q1-Q9 | ✅ all 5 cairn-grammar / chore commits |
| Per-commit-push: each WB pushed + verified | ✅ all 4 commits + recovery commit; `git log origin/main..HEAD` empty after each |
| Scoped sequential test runs (WB11a discovery) | ✅ all WB2-WB3 vitest invocations |
| tsconfig .tsx exclude pattern (WB11a discovery) | ✅ tile-footer.tsx added at WB1 |
| Read-before-Write across turns (MB-T15 WB5 lesson) | ✅ preemptive Reads at WB2 + WB3; no Write errors |
| HALT-and-surface on territory anomalies (§2.9) | ✅ surfaced 3 times: pre-WB1 commit (T20 untracked file), post-recovery (T20 WIP blocking ff-pull), pre-WB1 (incident discovered). All 3 honored. |
| Atomic-chain commit pattern (MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT forward fix) | ✅ at WB2 + WB3 + recovery (3 atomic-chain commits; 0 index-race recurrences) |

**One discipline gap [KNOWN]:** WB1's pre-commit `git status --short`
was followed correctly but proved insufficient against the index
race. The gap was operator-arbitrated as load-bearing and the
forward fix (atomic-chain pattern) was applied at WB2 onward. Net
result: methodology improved by the incident; future tickets benefit.

## VI. WB4 followups filed (2 entries)

| Tier | ID | Status | Origin |
|---|---|---|---|
| 3 | `MB-F-T18-FOOTER-DAEMON-AUTHORITATIVE-SPAWN-TIME` | filed | R-MBT18-5 — mount-time uptime resets on renderer reload; v3.1 polish surfaces daemon-authoritative spawn time via three closure paths (operator-arbitrated contract amendment, workstation-internal SpawnSessionResult+persistence, hybrid) |
| 3 | `MB-F-T18-FOOTER-LAST-ACTIVITY-INSTRUMENTATION` | filed | Q-MBT18-1 — operator brief mentioned last-activity-time as alt footer signal; v3.1 polish adds true last-activity instrumentation (renderer console-output subscription, daemon SessionContextSnapshot extension, or hybrid); current uptime-only is functional |

Both Tier 3 (visual / UX polish; v3.0 ships functional with
acceptable degradation paths).

## VII. Open questions for v3.1 (out of MB-T18 scope)

1. **Daemon-authoritative spawn time vs renderer mount time.** Filed
   followup `MB-F-T18-FOOTER-DAEMON-AUTHORITATIVE-SPAWN-TIME` (Tier 3)
   — three closure paths documented; operator preference deferred.
   Currently uptime resets on renderer reload (R-MBT18-5 honest
   semantics).
2. **Last-activity instrumentation.** Filed followup `MB-F-T18-
   FOOTER-LAST-ACTIVITY-INSTRUMENTATION` (Tier 3). Operator brief
   mentioned "last-activity-time" as an alt footer signal; v3.0 ships
   uptime-only (Q-MBT18-1=e). Open: should v3.1 swap to last-activity,
   show both (uptime + last-activity), or composite ("idle 3m,
   uptime 1h")?
3. **Cwd truncation aesthetic.** Q-MBT18-7=d uses CSS-only
   truncation; long paths render as `/Users/op/Desktop/Auto…ispatch`
   browser-native. v3.1 polish: middle-ellipsis preserving basename
   (`/Users/.../foxworks-dispatch`) is a ~15-LoC formatter helper.
   Tracked here only — file followup if operator wants the cosmetic.
4. **Multi-window footer sync.** If operator opens a detached
   BrowserWindow (per MB-T11b detach flow), each window's TileFooter
   has its own mount-time snapshot. Resolved-as-out-of-scope in
   diagnose §V; defer to v3.1.
5. **Session uptime for re-mounted sessions.** Detach close re-mounts
   the tile in main grid; mountTimestamp resets. Same v3.1 territory
   as #1.

## VIII. References

- decisions doc: `docs/coordination/mb-t18-decisions-2026-05-07.md`
- Phase 1 diagnose: `docs/coordination/mb-t18-diagnose-2026-05-07.md`
  (`536e206`)
- WB1 incident clarification: `docs/coordination/mb-t18-wb1-index-
  race-clarification-2026-05-07.md` (`2d8d260`)
- Tier 1 methodology FU: `MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-
  COMMIT` (FOLLOWUPS.md, filed `2d8d260`)
- WB4 v3.1 polish followups: `MB-F-T18-FOOTER-DAEMON-AUTHORITATIVE-
  SPAWN-TIME` + `MB-F-T18-FOOTER-LAST-ACTIVITY-INSTRUMENTATION`
  (FOLLOWUPS.md, this commit)
- MB-T17 findings doc cross-reference: `docs/coordination/mb-t17-
  findings-2026-05-07.md` §II acknowledges WB4-content-at-ecdd0e4
- MB-T20 cross-referenced FU: `MB-F-T20-LOCAL-HEAD-DIVERGENCE-
  MECHANISM` (FOLLOWUPS.md:130, Tier 3) — Terminal C's downstream
  observation of the index-race incident
- WB1-WB4 commits: `ecdd0e4` `2d8d260` `453100f` `31ffee8` + this
  WB4 commit
- MB-T16 findings (render-prop pattern source): `docs/coordination/
  mb-t16-findings-2026-05-07.md` Insight 1 + 2
- CLAUDE.md sections governing: §2.1 anti-fabrication, §2.2
  confidence labels, §2.4 Q1-Q9 self-check, §2.5 halt discipline,
  §2.6 per-commit-push, §2.7 per-path git, §2.9 bidirectional
  territory fences, §2.10 frozen contracts, §3.2 flat directory,
  §3.3 sentinel discipline, §3.6 test layout, §4.1 WB ladder, §4.2
  HALT gates, §4.3 cross-session coordination.
