# Parallel Batch 2 — coordination scaffold

**Date:** 2026-05-05
**Cut from:** main HEAD `a99d79e`
**Operator:** Joshua Seppich
**Sessions:** 3 parallel (dispatch-web-UI + MB-T07 kanban-cards + probe-additions)
**CC plan:** Opus 4.7 1M context, --dangerously-skip-permissions baseline

---

## §1 — Strategic context

First batch since gap analysis banked at `0216326` and finding #94 RESOLVED at `a99d79e`. Three sessions selected from the wireframe-roadmap queue per operator best-judgment arbitration.

Wireframe variant C is the v3.0 destination per project instructions §1.5 + earlier conversation. This batch advances both visual fidelity (Sessions 1 and 2) and substrate strength (Session 3).

---

## §2 — Per-session scope

### Session 1 — dispatch-web-UI
**Branch:** `sess-1/dispatch-web-ui`
**Worktree:** `~/Desktop/Automata/foxworks-worktrees/sess-1-dispatch-web-ui/`
**Territory:** `packages/dispatch-web/src/` (kanban renderer + header)
**Allowed subdirectories:**
- `packages/dispatch-web/src/components/kanban/` (Category A: session list enrichment)
- `packages/dispatch-web/src/components/header/` (Category D: plan ring + cost pill)
- `packages/dispatch-web/src/store/` (state management for new UI features)
- `packages/dispatch-web/test/` (test coverage for new components)

**Forbidden territory:**
- `packages/dispatch-workstation/` (Session 2 + 3 own)
- `packages/dispatch-daemon/` (no session writes; daemon is read-only this batch)
- `packages/dispatch-web/src/components/cards/` (Session 2 owns)

**Ships:**
- Model chip per session card (S4.6, O4.6, O4.7·1M, H labels)
- Context % meter per session card
- Elapsed time per session card
- Branch + repo sub-line per session card
- Activity grouping (Active / Done / Idle headers with counts)
- Filter chips (All / Running / Trouble)
- Plan ring component (token usage % + reset countdown)
- Cost pill component ($ today)
- Header layout integration

**Finding range reserved:** #105-109

**Estimated:** ~400-600 LOC

### Session 2 — MB-T07 kanban-card surface
**Branch:** `sess-2/mb-t07-kanban-cards`
**Worktree:** `~/Desktop/Automata/foxworks-worktrees/sess-2-mb-t07-kanban-cards/`
**Territory:** dispatch-web cards + workstation card-ipc + daemon orchestrator audit
**Allowed subdirectories:**
- `packages/dispatch-web/src/components/cards/` (orchestrator-card React components)
- `packages/dispatch-workstation/src/main/card-ipc.ts` (IPC wiring; existing file)
- `packages/dispatch-workstation/src/main/card-bridge.ts` (existing file)
- `packages/dispatch-workstation/src/main/orchestrator-output-router.ts` (existing routing)
- `packages/dispatch-daemon/src/routes/v3/orchestrator/` (audit endpoint additions if needed)
- `packages/dispatch-workstation/test/unit/` and `test/integration/` (test coverage)

**Forbidden territory:**
- `packages/dispatch-web/src/components/kanban/` (Session 1 owns)
- `packages/dispatch-web/src/components/header/` (Session 1 owns)
- `packages/dispatch-web/src/store/` (Session 1 owns; if Session 2 needs store changes, HALT and surface for cross-session arbitration)

**Ships:**
- Orchestrator-card React component with distinct visual (color/badge/icon per V3_TICKETS MB-T07)
- Approve / Decline buttons + free-form text input
- Multi-choice card variant (A/B/C/D buttons)
- Audit row writes per #84-B routing (already wired)
- STALE-PROPOSALS column for stale cards
- IPC roundtrip from card-ipc.ts to dispatch-web

**Finding range reserved:** #110-114

**Estimated:** ~400-600 LOC

### Session 3 — probe-additions
**Branch:** `sess-3/probe-additions`
**Worktree:** `~/Desktop/Automata/foxworks-worktrees/sess-3-probe-additions/`
**Territory:** test-only (no production code)
**Allowed subdirectories:**
- `packages/dispatch-workstation/test/integration/` (new probe directories)
- `packages/dispatch-workstation/src/main/main.ts` (sentinel-region MB_TEST_HOOKS additions ONLY, operator-arbitrated; ~50 LOC max)

**Forbidden territory:**
- All production source code outside MB_TEST_HOOKS sentinel regions
- `packages/dispatch-web/` (Sessions 1 + 2 own)
- `packages/dispatch-daemon/` (no session writes)

**Ships (top 5 from gap analysis):**
- P1: probe for #82 ConsolePanel mounts in webview after IPC
- P3: probe for MB-T08 onboarding flow end-to-end
- P4: probe for MB-T05 tmux session actually exists in `tmux ls` after spawn
- P5: probe for MB-T06 cap enforcement UI
- P15: T1 cold-launch one-shot composite probe

**Finding range reserved:** #115-119

**Estimated:** ~600-800 LOC test code + ~50 LOC source-side test-hook seams (if needed)

---

## §3 — Cross-session coordination

**Frozen contracts (no session may modify):**
- REGISTRY.md §2 contracts
- CONDUCTOR_API_CONTRACT.md
- v2 shared schema at `packages/dispatch-core/src/v2/schema.ts`
- All existing IPC channel names already in main
- All existing test sentinel regions already in main.ts

**Cross-session communication:** filesystem-only via per-session coordination notes if needed. No live cross-session signaling.

**Per-commit-push discipline:** required for all sessions. After each commit: `git push origin <branch>`. Verify `git log --oneline origin/main..HEAD` shows expected commits before next work.

**Per-path git add discipline:** required for all sessions. NEVER `git add -A`. Always explicit `git add <path>`. Pre-commit `git status --short` to verify territory.

---

## §4 — Halt conditions (apply to all sessions)

A session HALTS and surfaces to operator if:
- Cross-session territory conflict detected (writing to another session's allowed territory)
- Frozen contract modification needed (per §3)
- Production-code edit needed beyond stated scope (Session 3 only — ~50 LOC sentinel exception)
- Real defect found in production code that's outside session scope (file in reserved finding range, HALT)
- Test failure unexpected mid-RED-GREEN cycle (HALT, do not retry)
- Unforeseen architectural decision required (state management approach, schema change, etc.)
- Anything surprising in scout phase

After HALT: surface to operator with:
- What was discovered
- Why it triggered halt
- Three options for resolution (or fewer if obvious)
- Recommendation

Do NOT retry. Do NOT investigate further. Do NOT patch.

---

## §5 — Pre-merge sequencing

**Order:** 1 → 2 → 3, OR operator-arbitrated based on which sessions ship green first.

**Default sequencing rationale:**
- Session 1 first: pure dispatch-web work, lowest cross-package risk
- Session 2 second: depends on dispatch-web infra stability (Session 1's store changes)
- Session 3 third: test-only, no production conflict, but value lands last because probes verify Sessions 1 + 2's wiring

**Override allowed:** if Session 3 ships green before Session 1, operator may merge Session 3 first (test-only territory, no production conflict possible).

---

## §6 — Operator review burden

3 sessions × per-commit review = ~3× normal commit-stream. Estimated commits per session:
- Session 1: ~8-15 commits (RED + GREEN per feature)
- Session 2: ~10-18 commits (cross-package work, more discrete pieces)
- Session 3: ~7-12 commits (probe per gap, REPORT.md per probe-suite)

Total estimated: ~25-45 commits across all 3 sessions. Operator review bandwidth IS the ceiling.

If session count exceeds reasonable bandwidth: operator may halt one or more sessions mid-flight via direct stop signal. Sessions that get halted mid-flight surface what's done, what's pending, where they paused.

---

## §7 — Cairn discipline reminders

- Pre-edit-verify before any file write (read actual file before drafting changes)
- Strict-cairn: KNOWN/MODELED/SPECULATIVE labels on all factual claims
- Five-verb commit grammar: red/green/spike/contract/refactor
- §10.5 self-check on every commit
- Bidirectional territory fences (refuse misdirected operator instructions per Round 1 evidence)
- Anti-fabrication: read sources before claiming what they say (this run produced 9 drafting failures all caught by methodology — see project memory)

---

**Scaffold authored by:** operator
**Cut from:** main HEAD `a99d79e`
**Worktrees cut after:** this scaffold commit lands on main

---

## §8 — AMENDMENT 2026-05-05 (post-Phase-1-scout)

**Authored after:** Sessions 2 + 3 surfaced Phase 1 diagnose at `/tmp/sess-2-mb-t07-kanban-cards-diagnose.md` and `/tmp/sess-3-probe-additions-diagnose.md`. Session 1 still mid-scout.

**Drafting failures in §2 corrected here (KNOWN):**

The original §2 referenced subdirectories that do not exist in the repo:
- `packages/dispatch-web/src/components/kanban/` does not exist; KanbanColumn.tsx + KanbanPanel.tsx are flat under `packages/dispatch-web/src/components/`
- `packages/dispatch-web/src/components/header/` does not exist; header lives elsewhere TBD by Session 1's scout
- `packages/dispatch-web/src/components/cards/` does not exist; ~650 LOC of substantive card work lives at `packages/dispatch-web/src/orchestrator-cards/` (verified by Session 2 reading 5 files end-to-end)

These were drafted from memory of typical React project layouts rather than verified against repo. Banked as drafting failure pattern instance.

### §8.1 Corrected Session 1 territory

**Allowed:**
- `packages/dispatch-web/src/components/` — all files matching kanban + header concerns (KanbanColumn.tsx, KanbanPanel.tsx, SessionCard.tsx, any header components Session 1 identifies in scout)
- `packages/dispatch-web/src/store/` — Zustand store changes for new UI features
- `packages/dispatch-web/test/` — test coverage for new components

**Forbidden:**
- `packages/dispatch-web/src/orchestrator-cards/` — Session 2 territory (per §8.2)
- `packages/dispatch-workstation/src/` — Session 3 owns minor MB_TEST_HOOKS additions
- `packages/dispatch-daemon/src/` — read-only this batch

### §8.2 Corrected Session 2 territory

**Allowed:**
- `packages/dispatch-web/src/orchestrator-cards/` — existing 5-file ~650 LOC implementation; Session 2 operates here in-place
- `packages/dispatch-workstation/src/main/card-ipc.ts` (existing)
- `packages/dispatch-workstation/src/main/card-bridge.ts` (existing — interface alignment per A7)
- `packages/dispatch-workstation/src/main/card-bridge-preload.mts` (existing — subscribe-side wiring per G2; preserve Fix-92 sentinel region)
- `packages/dispatch-workstation/src/main/coarchitect-ipc.ts` F5 region — supersede emission per G5
- `packages/dispatch-workstation/scripts/build-card-bridge.mjs` (if subscribe wiring requires bundling changes)
- `packages/dispatch-daemon/src/routes/v3/orchestrator-audit.ts` (read-only this batch — no daemon changes needed per Session 2 §4)
- `packages/dispatch-workstation/test/unit/wiring-cards/` and `test/integration/`

**Forbidden:**
- `packages/dispatch-web/src/components/` (all files) — Session 1 territory
- `packages/dispatch-web/src/store/` — Session 1 territory; Session 2 confirmed no store dependency
- `packages/dispatch-core/src/v3/schema.ts` — frozen contract per §3; design uses existing types

**Cooperative coordination required:** Session 1 must add a per-status `extras` slot prop to `KanbanColumn` (~5 LOC). This is a Session-1-arbitrated mechanical change directed by operator. Session 2 fills the slot from its own territory. Session 1 commits the slot-prop change as part of its Phase 2 work; Session 2 waits for that commit before mounting the orchestrator-cards lane.

### §8.3 Corrected Session 3 territory

**Allowed:**
- `packages/dispatch-workstation/test/integration/` — new probe directories
- `packages/dispatch-workstation/src/main/main.ts` — MB_TEST_HOOKS sentinel-region additions only:
  - `SHELL_EVAL <id>|<code>` stdin handler (~30 LOC parallel of KANBAN_EVAL targeting mainWindow.webContents)
  - All additions inside the existing `MB_TEST_HOOKS=1` stdin block

**Forbidden:**
- All production source code outside MB_TEST_HOOKS sentinel regions
- All dispatch-web territory (Sessions 1 + 2)
- Daemon territory

### §8.4 Operator arbitrations (KNOWN-decision per chat-side §7 collapse)

**For Session 2 (MB-T07):**
- A1 G7 territory: operate in `orchestrator-cards/` (option c, no move)
- A2 G3 mount: Session 1 adds `extras` slot prop to KanbanColumn (~5 LOC); Session 2 fills it
- A3 G6 STALE: shared with existing Stale column; visual disambiguation via blue tint
- A4 G4 dismiss: local optimistic dispatch on click handlers
- A5 G8 action-fire: audit row written; execution deferred to MB-T11
- A6 G5 supersede order: emit `orchestrator-card-superseded` BEFORE `orchestrator-card-rendered` for new card
- A7 G1 bridge interface: undocumented gap pre-dating session; fix as part of MB-T07 GREEN — align shell + web `CardBridge` interfaces; add `onCardRendered/onCardSuperseded/onCardUpdate` to shell side; rename emit methods OR add aliases

**For Session 3 (probe-additions):**
- B1 Q1 P5: defer P5 (cap UI doesn't ship yet); replace with P6 (MB-T05 kanban shows new spawn card from Tier 2)
- B2 Q2 P1 driver: SHELL_EVAL-driven (no separate OPEN_CONSOLE_PANEL handler); saves 15 LOC source
- B3 Q3 P15 column labels: keep at `count > 0` granularity; column-label strength is a follow-up
- B4 Q4 P15 daemon: real daemon with precondition-skip per fix-94/fix-92 probe-02 pattern
- B5 SHELL_EVAL seam: APPROVED, ~30 LOC under existing MB_TEST_HOOKS=1 block

**For Session 1:**
- TBD pending Phase 1 surface return. The cooperative `extras` slot prop ask (per A2) will be bundled into Session 1's Phase 2 prompt after its scout returns.

### §8.5 Drafting failure bank

This run produces the 10th instance of a recurring drafting failure pattern: drafting paths/APIs/schemas from memory rather than reading actual definitions before writing. Specifically here, scaffold §2 referenced React project subdirectories (`components/kanban/`, `components/header/`, `components/cards/`) that don't exist in the repo. Caught by Sessions 2 + 3 at scout phase before any Phase 2 LOC was written.

Methodology bank for cairn formalization:
- **Pre-edit-verify before scaffold authoring.** When drafting territory boundaries that reference filesystem paths, verify each path exists via `ls` before committing the scaffold. Same discipline applies to scaffold authoring as to source-edit drafting.
- **Phase-1-scout catches scaffold drafting failures before they cost LOC.** This is the methodology working as designed; the cost is one amendment commit and operator clarification, not actual code rework.

§10.5 self-check (docs-only amendment):
1-9. Standard append-only docs amendment. No source edits. Per-path git add of single .md file. Q7 territory: only docs/coordination/...md modified; no parallel-session conflict possible (sessions have no commits yet). Confidence: KNOWN for all corrected paths via Session 2 + 3 scout reads. KNOWN for all arbitrations via operator best-judgment grant on chat side.
