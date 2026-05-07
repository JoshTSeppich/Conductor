# MB-T18 Phase 2 — Operator-Arbitrated Decisions

**Date:** 2026-05-07
**HEAD at decision time:** post-MB-T20-WB1 (`7782bf3`); MB-T18 Phase 1
diagnose at `536e206`.
**Source:** `docs/coordination/mb-t18-diagnose-2026-05-07.md` (Phase 1)
+ operator confirmation 2026-05-07 ("proceed with tentative
dispositions, begin Phase 2 WB1").
**Phase 2 brief:** scope-via-tentative-(a/d/e) — pure greenfield slot
population (NO chartered followup to close at integration).

This doc captures the dispositions on Q-MBT18-1..12 + R-MBT18-1..8 +
the Phase 2 ladder for MB-T18 (per-tile footer chrome). Operator
confirmed all tentative recommendations from §VII of the Phase 1
diagnose by acking "proceed with tentative dispositions" with explicit
spot-checks on Q-MBT18-1=e, Q-MBT18-6=a, Q-MBT18-9=b, Q-MBT18-10=a.

---

## I. Q-MBT18-N dispositions

| ID | Disposition | One-line rationale |
|---|---|---|
| Q-MBT18-1 | (e) cwd + uptime compound | Operator-confirmed; both renderer-derivable; no IPC; no daemon contract change |
| Q-MBT18-2 | (a) extend SpawnSessionResult with `cwd: string` | Workstation-internal; cwd available at spawn-handler.ts:361; daemon GET response is frozen surface §2.10 ruling out (b) |
| Q-MBT18-3 | (a) renderer-side mount-time snapshot | Simplest; no plumbing; honest semantics ("time since this tile was last mounted in this window"); v3.1 followup for daemon-authoritative spawn time |
| Q-MBT18-4 | (a) render-prop `Tile.renderFooterSlot?: (sessionName) => ReactNode` | Direct MB-T16/T17 precedent + Insight 1 from MB-T16 findings; preserves slot wrapper testid + data-slot attr |
| Q-MBT18-5 | (a) separate file `src/tile-grid/tile-footer.tsx` | Single-purpose; testable in isolation; mirrors tile-header.tsx, tile-approval-picker.tsx, tile-autopilot-toggle.tsx |
| Q-MBT18-6 | (a) NO bridge | Operator-confirmed; footer is purely renderer-side data per operator brief ("if footer is purely renderer-side data, skip the bridge"); cwd from SpawnSessionResult, uptime from mount-time |
| Q-MBT18-7 | (d) full cwd with CSS `text-overflow: ellipsis` + `title=` tooltip | Browser-native; tile width controls visible portion; ~0 lines of formatting code |
| Q-MBT18-8 | (a) auto-switch units (`Ns` / `Nm` / `Nh` / `Nd`) | Compact chrome-style; common UX; ~10 LoC pure-fn formatter |
| Q-MBT18-9 | (b) 5s setInterval tick | Operator-confirmed; ≤8 tiles × 0.2Hz = ≤1.6 setState/s; quieter than 1s; format-(a) unit boundaries update visibly within 5s |
| Q-MBT18-10 | (a) NO sentinel zone in main.ts | Operator-confirmed (called out as "smart architectural call"); no IPC = no wiring site; entirely sidesteps T17 main.ts contention |
| Q-MBT18-11 | (a) `test/unit/tile-footer/` + probe-08 (tile-grid-tile) + probe-06 (tile-grid-app) | Direct MB-T16/T17 precedent; named numeric probes for per-WB regression-test attribution |
| Q-MBT18-12 | (a) single `cwd: string` field add to SpawnSessionResult | Minimal contract surface; defer further fields (spawnedAt, tmuxTarget) to future tickets if needed |

## II. R-MBT18-N dispositions

| ID | Disposition | Action |
|---|---|---|
| R-MBT18-1 | PRESERVE | Render-prop pattern reuse (Insight 1) — established 2x via MB-T16 + MB-T17 in flight |
| R-MBT18-2 | PRESERVE | Slot wrapper testid + `data-slot="footer"` preserved by render-prop construction; existing tile-grid-tile probe-01..05 stay GREEN |
| R-MBT18-3 | ACCEPT WITH MITIGATIONS | Concurrent T17 territory: per-path `git add`, pre-commit `git status --short`, post-commit `git log -1 --stat`, pull-before-WB on shared-file WBs. Render-prop additivity makes auto-merge expected. T17 main.ts sentinel sidestepped by Q-MBT18-10=a |
| R-MBT18-4 | VERIFY at WB1 | SpawnSessionResult interface change ripples (≤ 5 lines across 4 files); pre-existing spawn-handler/spawn-ipc tests likely pattern-match `sessionName` only — confirmed at WB2 when the field add lands |
| R-MBT18-5 | ACCEPT for v3.0 | Mount-time uptime semantics ("time since this tile was last mounted in this window") honest but resets on renderer reload / detach close; file `MB-F-T18-FOOTER-DAEMON-AUTHORITATIVE-SPAWN-TIME` Tier 3 at WB4 for v3.1 |
| R-MBT18-6 | NONE NEEDED | tile-footer.tsx uses no dispatch-core types directly (cwd is `string`, uptime is `number`); no dual-import drift surface |
| R-MBT18-7 | ADD AT WB1 | tsconfig.json `exclude` entry for `src/tile-grid/tile-footer.tsx` lands in this WB1 commit (tsconfig clean at HEAD `7782bf3` — T20's `src/chat-shell` entry already committed at WB1) |
| R-MBT18-8 | ACCEPT | Uptime re-render churn negligible (≤1.6 setState/s on string changes; React reconciliation skips identical subtree at unit-boundary stability) |

## III. Phase 2 ladder (4 WBs, single session)

Per Phase 1 diagnose §IV + operator brief 2026-05-07:

1. **WB1 (red)** — scaffold `tile-footer.tsx` skeleton + tsconfig
   exclude entry + this decisions doc + probe-00 module-load test.
   Commit: `red(MB-T18): WB1 — scaffold tile-footer + decisions doc`.
2. **WB2 (green)** — `tile-footer.tsx` real implementation (cwd line +
   uptime line + 5s tick + auto-switch units + CSS truncate + title=
   tooltip) + `formatUptime` pure-fn helper + render tests +
   formatter unit tests + spawn-handler.ts SpawnSessionResult `cwd:
   string` field add (workstation-internal interface change) +
   spawn-handler/spawn-ipc test adjustments if pre-existing tests
   strict-match return shape.
   Commit: `green(MB-T18): WB2 — tile-footer impl + spawn-handler cwd plumb`.
3. **WB3 (green)** — Tile.tsx `renderFooterSlot?` prop + TileGrid
   plumb-through + TileGridApp constructs `renderFooterSlot` closure
   + extends `setSessions` to propagate `cwd` from SpawnSuccessReply.
   result + TileGridSessionEntry adds `cwd?: string` + integration
   tests (probe-08 tile-grid-tile + probe-06 tile-grid-app). main.ts
   UNCHANGED per Q-MBT18-10=a.
   Commit: `green(MB-T18): WB3 — slot integration + TileGridApp closure + cwd plumb`.
4. **WB4 (docs)** — findings doc + 1-2 v3.1 polish followups
   (`MB-F-T18-FOOTER-DAEMON-AUTHORITATIVE-SPAWN-TIME` Tier 3;
   optionally `MB-F-T18-FOOTER-LAST-ACTIVITY-INSTRUMENTATION` Tier 3
   for the noisy-but-cheap last_action_fired_at v3.1 alt path).
   Commit: `docs(MB-T18): WB4 — findings doc + followups`.

**Estimated total tests:** ~20-25 (probe-00 module-load 4 + probe-01
formatters + render ~10 + probe-08 tile-integration ~7 + probe-06
app-integration ~5).
**Estimated commits:** 4 + Phase 1 spike (already shipped at `536e206`).

## IV. Discipline (per CLAUDE.md + MB-T12 / MB-T15 / MB-T16 / MB-T17 ladder lessons)

- Per-path `git add <path>` only; NEVER `-A` or `.` — CLAUDE.md §2.7
- Pre-commit territory check via `git status --short` at every WB —
  CLAUDE.md §4.3 + R-MBT18-3 mitigation
- Post-commit territory verification via `git log -1 --stat`
- **Pull-before-WB at WB3** — `git pull --rebase origin main` to
  absorb T17 WB4 if it lands first (tile.tsx + tile-grid.tsx +
  tile-grid-app.tsx are shared)
- Per-commit-push: each WB pushed to origin immediately, verified via
  empty `git log --oneline origin/main..HEAD` — CLAUDE.md §2.6
- Confidence labels [KNOWN] / [MODELED] / [SPECULATIVE] on every claim
  — §2.2
- Anti-fabrication: read source, don't infer — §2.1
- Each commit body includes self-check Q1-Q9 per
  `CONDUCTOR_API_CONTRACT.md` §10.5 — §2.4
- WB11a discoveries applied:
  - Run scoped vitest dirs SEQUENTIALLY (not concurrently —
    happy-dom hang)
  - Use `act()` wrappers around async DOM-flush calls (5s setInterval
    in WB2 will need `vi.useFakeTimers()` + `act(() => vi.advanceTimers
    ByTime(...))` for deterministic uptime tick tests)
  - Add new `.tsx` files to tsconfig exclude — landed at WB1
- MB-T15 / MB-T16 lessons applied:
  - Read-before-Write tracking can lose state across turns
    (`MB-F-WRITE-TOOL-READ-TRACKING-CROSS-TURN`); preemptive 1-line
    Reads before Writes of cross-turn files at WB2-WB3
  - Slot wrapper testid preservation (Q-MBT16-3=a-equivalent
    semantics) — render-prop pattern preserves
    `tile-footer-slot-{name}` + `data-slot="footer"` by construction
  - Bridge adapter pattern is silently absent (Q-MBT18-6=a — no
    bridge); represents an intentional pattern-template skip, not a
    discipline gap

## V. Coordination (parallel-cairn awareness)

Per operator brief 2026-05-07:
- **Terminal A (MB-T17 autopilot toggle)** — at HEAD `59c7387` (WB3
  shipped) at the moment WB1 starts. SHARES tile.tsx, tile-grid.tsx,
  tile-grid-app.tsx at WB4 (T17) ↔ WB3 (T18). Render-prop additivity
  expected to auto-merge; pull-before-WB at MB-T18 WB3 absorbs T17
  WB4 if it lands first.
- **Terminal C (MB-T20 chat panel shell)** — at HEAD `7782bf3` (WB1
  shipped); territory non-overlapping with MB-T18. tsconfig.json was
  briefly shared (chat-shell exclude entry) but T20's edit committed
  before MB-T18 WB1 starts; current MB-T18 WB1 tsconfig edit is
  additive next to T20's.
- **Terminal D (docs chore)** — shipped at `2ec696a`, idle.

**Frozen-zone avoidance:** all MB-T18 surfaces are workstation-
internal; no daemon contract changes; no schema.ts §1-§13 edits;
no WORKSTATION_CONTRACT.md §6 edits; no REGISTRY.md §2 edits. The
SpawnSessionResult interface is workstation-internal (spawn-handler.
ts:91-103) — extending it is fair game per CLAUDE.md §2.10
(operator-supervised mechanical translation; does NOT cross frozen
contract surface).

## VI. References

- Phase 1 diagnose: `docs/coordination/mb-t18-diagnose-2026-05-07.md`
  (`536e206`)
- Source-of-truth followup: NONE (pure greenfield slot population —
  unlike MB-T16's MB-F-T13 closure or MB-T17's MB-F-T12 closure)
- Operator brief 2026-05-07: "Confirmed: MB-T18 — Per-tile footer
  chrome" + "Proceed with tentative dispositions, begin Phase 2 WB1"
  + spot-confirms on Q-MBT18-1=e + Q-MBT18-6=a + Q-MBT18-9=b +
  Q-MBT18-10=a
- MB-T12 architecture-flow:
  `docs/coordination/mb-t12-architecture-flow.md`
- MB-T15 findings (chrome ladder precedent):
  `docs/coordination/mb-t15-findings-2026-05-07.md`
- MB-T16 findings (render-prop + bridge-adapter pattern source):
  `docs/coordination/mb-t16-findings-2026-05-07.md`
- MB-T17 diagnose + decisions (concurrent ladder, shared-file
  partner): `docs/coordination/mb-t17-diagnose-2026-05-07.md`
  (`39e8134`) + `docs/coordination/mb-t17-decisions-2026-05-07.md`
  (`ffe0dc7`)
- Existing surfaces:
  - footer slot wrapper:
    `packages/dispatch-workstation/src/tile-grid/tile.tsx:206`
  - SpawnSessionResult: `packages/dispatch-workstation/src/main/
    spawn-handler.ts:91-103, 378-382`
  - SpawnSuccessReply: `packages/dispatch-workstation/src/main/
    spawn-ipc.ts:42-61`
  - TileGridApp.onSpawnResult: `packages/dispatch-workstation/src/
    tile-grid/tile-grid-app.tsx:117-130`
  - daemon GET (frozen-surface evidence):
    `packages/dispatch-daemon/src/routes/sessions.ts:122-148`
- Frozen-zone refs: `CLAUDE.md` §2.10 +
  `packages/dispatch-core/src/v3/schema.ts` §1-§13 + `docs/build-docs/
  CONDUCTOR_API_CONTRACT.md` + `docs/build-docs/WORKSTATION_CONTRACT.md`
  §6
