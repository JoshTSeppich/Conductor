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
