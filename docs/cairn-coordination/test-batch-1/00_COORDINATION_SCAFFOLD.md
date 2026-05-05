# Test-batch-1 coordination scaffold

**Date:** 2026-05-05
**Operator:** Joshua Seppich
**Goal:** Permanent regression coverage for fix-batch-1 (Sessions A) + coverage audit and Tier 1 unit-test gap closure for workstation main process (Session B)

## §1 Sessions

### Session A — probe suites for fix-batch-1 findings

- Branch: `test-A/probe-suites-fix-batch-1`
- Cut from: `main` HEAD `bb4d82b`
- Worktree: `~/Desktop/Automata/foxworks-worktrees/test-A`
- Test territory: `packages/dispatch-workstation/test/integration/`
  - `fix-82-verification/` (new — probes for finding #82 console panel trigger wiring)
  - `fix-83-verification/` (new — probes for finding #83 spawn result subscription)
  - `fix-84-verification/` (new — probes for finding #84 orchestrator card flow + build-doc-state userData fallback)
- Source territory: NONE (test additions only). May extend MB_TEST_HOOKS observability if needed; sentinel-region edits to main.ts authorized inside Fix-82/83/84 sentinel regions only.
- Pattern reference: `packages/dispatch-workstation/test/integration/fix-92-verification/` and `fix-89-menu-rebuild/`
- Findings range: #95–#99 reserved (per §90 instance 2 recommendation: reserve numbering ranges)

### Session B — coverage audit + Tier 1 unit-test gaps

- Branch: `test-B/workstation-main-coverage`
- Cut from: `main` HEAD `bb4d82b`
- Worktree: `~/Desktop/Automata/foxworks-worktrees/test-B`
- Test territory: `packages/dispatch-workstation/test/unit/`
  - new directories per file under audit
- Source territory: NONE (test additions only). If a coverage gap reveals a defect, file as separate finding, do NOT fix in this session.
- Audit deliverable: `packages/dispatch-workstation/test/unit/coverage-audit-test-batch-1.md` listing files by coverage % and prioritization rationale
- Coverage tooling: vitest --coverage (already in repo, used by other tests)
- Findings range: #100–#104 reserved

## §2 Merge order

Session A merges first (probe suites are additive, no contract surface).
Session B merges second (coverage audit + unit tests, also additive).

If both ship green, merges are independent and order is operator preference. If either surfaces a defect that needs cross-session coordination, halt and arbitrate.

## §3 Frozen surfaces

Both sessions:
- REGISTRY.md §2 contracts (operator-arbitrated only)
- v2 shared schema at `packages/dispatch-core/src/v2/schema.ts`
- All production source files in `packages/dispatch-workstation/src/main/` EXCEPT MB_TEST_HOOKS sentinel regions per session-specific authorization above

Frozen for Session B specifically:
- All test files Session A is creating (territory exclusion)

Frozen for Session A specifically:
- All test files Session B is creating (territory exclusion)

## §4 Shared-working-tree discipline

Sessions run in separate worktrees. Per-path `git add <path>` only. NEVER `git add -A`. Pre-commit territory check via `git status --short`. Post-commit verification via `git log -1 --stat`.

## §5 Halt conditions

- Either session reveals a defect requiring source-code fix → file finding in reserved range, HALT, surface to operator
- Either session needs MB_TEST_HOOKS observability extension beyond the existing pattern → HALT, surface
- Cross-session coordination need (e.g., one session's tests would conflict with the other's) → HALT, surface
- Coverage tooling fails or produces unreliable results → HALT, surface

## §6 Definition of done

Session A:
- 5–10 probes per finding (#82, #83, #84) under respective `fix-NN-verification/` directories
- One REPORT.md per finding aggregating results
- All probes PASS or have explicit MANUAL designation with operator-step documented

Session B:
- Coverage audit document
- Tier 1 unit test gaps closed (target ≥80% coverage for workstation main process files)
- Per-file commit log showing coverage delta

## §7 Methodology

Both sessions: cairn-strict. Five-verb commit grammar. KNOWN/MODELED/SPECULATIVE labels. §10.5 9-question self-check on every commit. Per-commit-push. Per-path git add only.

Operator-relay drafting failures (4 in batch fix-batch-1 + #92) banked for cairn formalization. Both sessions should pre-edit-verify any prompt-claimed file paths or commit references against actual repo state before acting.
