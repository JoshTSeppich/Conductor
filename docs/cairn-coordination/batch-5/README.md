# Batch 5 — 2026-05-02

3-session worktree composition. Validates 3-session worktree pattern at production scale.

## Sessions

- **Session A: MB-T06** — concurrent-session-cap enforcement. Worktree: ~/Desktop/Automata/foxworks-worktrees/session-A. Branch: session-A/mb-t06. Territory: extension to packages/dispatch-workstation/src/main/spawn-handler.ts (cap check before tmux spawn) + new packages/dispatch-workstation/src/main/session-cap.ts. Coord file: batch-5/session-a-mb-t06.md.
- **Session B: MB-T07** — kanban-card surface for orchestrator proposals. Worktree: ~/Desktop/Automata/foxworks-worktrees/session-B. Branch: session-B/mb-t07. Territory: packages/dispatch-web/src/orchestrator-cards/ (new) + extension to web kanban view for proposal-card rendering. Coord file: batch-5/session-b-mb-t07.md.
- **Session C: MB-T08** — onboarding + error states + smoke harness. Worktree: ~/Desktop/Automata/foxworks-worktrees/session-C. Branch: session-C/mb-t08. Territory: packages/dispatch-workstation/src/onboarding/ (new) + packages/dispatch-workstation/test/smoke/ (new) + extension to main.ts for first-launch onboarding flow. Coord file: batch-5/session-c-mb-t08.md.

## Shared read-only references

WORKSTATION_CONTRACT.md (frozen at cf1848a), CONDUCTOR_API_CONTRACT.md (frozen at v2.2.0), v3 schema (frozen at 232fbaa), vision §10 (frozen at eac381e), MB-T05-env-allowlist-amendment.md, MB-S02 ADR.

## Discipline rules (mandatory)

- Per-path git add MANDATORY with pre-commit `git diff --cached --stat` verification before EVERY commit.
- Per-commit-push MANDATORY with branch-aware verification (git log --oneline origin/<your-branch>..HEAD empty after push).
- Per-session coord files (this batch onward) — each session writes to its own coord file (session-a-mb-t06.md, session-b-mb-t07.md, session-c-mb-t08.md). NO session writes to another session's coord file or to README.md. Avoids the Batch 4 merge-conflict pattern.
- Worktree-isolated. Each session works in its own directory. No shared-working-tree drift risk per finding #65.

## Acceptance for Batch 5

All three sessions close clean. Each branch merged separately to main. Per-session coord file approach validated as drift-free integration. 3-session worktree ratchet KNOWN-validated for production-typed work.

After Batch 5 closes: 25/25 v3.0 deliverables shipped. Only ship-gate followups + Phase 3 dogfood remain.
