# MB-T11-B Phase 1 Decisions — 2026-05-08

**Session:** mbt11b-worktree / Terminal 2 (Round 5)
**Base commit:** `f397ca0`
**Status:** DRAFT — awaiting HALT 0 operator ack

---

## Default dispositions (operator-arbitrated at HALT 0)

### D-MBT11B-1 — Scope disposition (Q-MBT11B-1)

**Default:** Option (a) — Gap-fill only.

The core §3.2 resolver (`resolveApproval`) already exists in dispatch-workstation, fully implemented by sess-mbt13 and covered by 34 GREEN tests. MB-T11-B will NOT create a duplicate resolver. Instead, MB-T11-B delivers the remaining gaps from the acceptance criteria:

1. `ApprovalDecision` type exported from dispatch-core
2. `predictCommitCreating` + `predictContractTouching` stub functions in dispatch-core
3. MB-T11-B-attributed probes in dispatch-core (stub behavior only; §3.2 semantic closure is the dispatch-workstation tests)

**Rationale:** The resolver logic is identical in both sessions' scopes. Creating a second resolver in dispatch-core would introduce duplication without behavioral benefit. The existing resolver is the de-facto closure of the §3.2 semantic requirement.

### D-MBT11B-2 — WB ladder shape (Q-MBT11B-2)

**Default:** Collapse to 3 WBs:

- **WB1 RED+GREEN:** Author `dispatch-core/src/orchestrator/approval-decision.ts` with `ApprovalDecision` type + `predictCommitCreating` + `predictContractTouching` stubs. Author dispatch-core probes. RED → GREEN in single commit (stubs are trivially GREEN; complexity is in the test authoring).
- **WB2 docs:** Findings + decisions docs + FOLLOWUPS.md amendments + ladder closure.
- **WB3 HALT 2:** Push + surface to operator.

WB3 (stand-in wiring) from original decomposition collapses because T1 and T5 are already merged to main. No stand-ins needed.

### D-MBT11B-3 — Hook stub location (Q-MBT11B-3)

**Default:** dispatch-core, in `dispatch-core/src/orchestrator/approval-decision.ts` alongside `ApprovalDecision`.

**Rationale:** Original scope specifies dispatch-core. Stubs are pure functions with no deps. Round 6 heuristic implementors will find them at the dispatch-core surface (shared across packages).

### D-MBT11B-4 — Probe scope (Q-MBT11B-4)

**Default:** Stubs-only probes in dispatch-core. Do NOT re-implement the 34 dispatch-workstation §3.2 semantic cases in dispatch-core.

**Probe file:** `test/unit/orchestrator/approval-policy-resolver/probe-09-hook-stubs.test.ts`

**Probe content:**
- `predictCommitCreating(anyPrompt) === false` (explicit-false return)
- `predictContractTouching(anyPrompt, anyPatterns) === false` (explicit-false return)
- Both return `boolean` type
- `ApprovalDecision` type shape: `{ approvalRequired: boolean; reason: string }`
- Import `ApprovalDecision` from dispatch-core as a type-level check

**Why no §3.2 dispatch-core re-tests:** Anti-duplication discipline. The semantic coverage already exists in 34 GREEN tests in dispatch-workstation. Duplicating them in dispatch-core adds maintenance burden without behavioral coverage gain. A cross-package integration probe (if needed) belongs to the call site (dispatch-workstation), not dispatch-core itself.

### D-MBT11B-5 — Action type names in probes (Q-MBT11B-5)

**Default:** Use short names from `ApprovalActionTypeEnum` (§13 of schema.ts): `'send'`, `'spawn-new-session'`, `'kill'`, `'pull'`, `'assign-task'`. The §3.6 verbose names in the MB-T11-B prompt (`send-prompt-to-session`, `spawn-session`, etc.) are pre-merge prompt artifacts.

---

## Architectural decisions

### A-1 — `approval-decision.ts` file structure

```typescript
// dispatch-core/src/orchestrator/approval-decision.ts
//
// MB-T11-B — ApprovalDecision type + prediction hook stubs.
//
// ApprovalDecision is the resolver result shape. Defined here so dispatch-core
// is the canonical source; dispatch-workstation's ApprovalResolverResult mirrors
// this shape (post-cross-merge dedup followup MB-F-T11-T13-ACTION-TYPE-ENUM-DEDUP
// and MB-F-T11-T13-RESOLVER-CALL-SITE-REWRITE target this reconciliation).
//
// Hook stubs return false — conservative default (over-approval rather than
// under-approval). Real heuristics deferred to Round 6 per MB-T11-B scope.

export interface ApprovalDecision {
  approvalRequired: boolean;
  reason: string;
}

export function predictCommitCreating(_prompt: string): boolean {
  return false;
}

export function predictContractTouching(
  _prompt: string,
  _contractPatterns: string[],
): boolean {
  return false;
}
```

### A-2 — §3.22 post-WB-final check

Per §6 of prompt, before WB2 commit run:

```
git fetch origin mbt11a-worktree
git fetch origin mbt13-worktree
git log --no-merges origin/mbt11a-worktree...HEAD -- packages/dispatch-core/src/orchestrator/approval-decision.ts
git log --no-merges origin/mbt13-worktree...HEAD -- packages/dispatch-core/src/orchestrator/approval-decision.ts
```

Since both peers are already merged to main (no divergent commits), this check is expected to return empty. Document result in WB2 findings.

### A-3 — FOLLOWUPS.md amendments planned at WB2

1. `MB-F-MBT11B-HOOK-STUBS-ROUND6-CLOSURE` — Round 6 heuristic implementation for `predictCommitCreating` + `predictContractTouching`. Tier 2. Implementation sketch: LLM-classify prompt text for commit signals (`git commit`, `git push`, commit-creating tool patterns) + frozen-contract file pattern matching.

2. Reference `MB-F-T11-T13-ACTION-TYPE-ENUM-DEDUP` (already filed) — dispatch-workstation resolver's local `ApprovalActionType` + `ApprovalPolicy` types should consolidate with §13 enums post-merge. When that closes, dispatch-workstation resolver can import from dispatch-core schema.ts rather than maintaining local type duplicates.

3. Reference `MB-F-T11-T13-RESOLVER-CALL-SITE-REWRITE` (already filed) — eventual removal of the shim; call-site rewrite to pass predicates directly.

---

## Q table

| Q | Text | Default disposition | Operator change? |
|---|------|---------------------|-----------------|
| Q-MBT11B-1 | Scope disposition | (a) gap-fill only | ___ |
| Q-MBT11B-2 | WB ladder collapse | 3-WB ladder | ___ |
| Q-MBT11B-3 | Hook stub location | dispatch-core | ___ |
| Q-MBT11B-4 | Probe scope | stubs-only | ___ |
| Q-MBT11B-5 | Action type names | short names from §13 | ___ |
