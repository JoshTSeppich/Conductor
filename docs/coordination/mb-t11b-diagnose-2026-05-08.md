# MB-T11-B Phase 1 Diagnose — 2026-05-08

**Session:** mbt11b-worktree / Terminal 2 (Round 5)
**Base commit:** `f397ca0`
**Authored:** 2026-05-08 (Phase 1 per §8)

---

## §I — §3.22 Peer-branch cross-session check

**[KNOWN]** Commands run:

```
git fetch origin mbt11a-worktree
git fetch origin mbt13-worktree
git log --no-merges origin/mbt11a-worktree...HEAD -- packages/dispatch-core/src/v3/schema.ts
git log --no-merges origin/mbt13-worktree...HEAD -- packages/dispatch-core/src/v3/schema.ts
```

Both log commands returned **empty** — no divergent commits on `schema.ts` from either peer branch.

**Interpretation:** T1 (mbt11a-worktree) and T5 (mbt13-worktree) have already been merged to `main` at `f397ca0`. This is confirmed by reading `schema.ts` directly (see §II). The prompt's §0.1 substrate warning ("if T1 hasn't shipped action-variant schemas yet...") does NOT apply — both peers are fully merged.

---

## §II — dispatch-core/src/v3/schema.ts current state

**[KNOWN]** File read in full at HEAD `f397ca0`. Sections relevant to MB-T11-B:

### §12 — Orchestrator action tools (T1 territory — already merged)

Present. Contains:
- `SendPromptActionPayloadSchema` / `SpawnSessionActionPayloadSchema` / `KillSessionActionPayloadSchema` / `PullHandoffActionPayloadSchema` / `AssignTaskActionPayloadSchema`
- `WorkstationSessionKillRequestSchema`
- `pickPayloadSchema(actionType: ActionType): z.ZodTypeAny` helper

Action types flowing through the resolver (from `ActionTypeEnum` §1): `'send'`, `'spawn-new-session'`, `'kill'`, `'pull'`, `'assign-task'`.

### §13 — Per-session approval policy (T5 territory — already merged)

Present. Contains:
- `ApprovalPolicyEnum` = `z.enum(['tight', 'medium', 'loose'])` → `type ApprovalPolicy`
- `ApprovalActionTypeEnum` = `z.enum(['send', 'spawn-new-session', 'kill', 'pull', 'assign-task'])` → `type ApprovalActionType`
- `ApprovalPolicyRowSchema`, `ApprovalPolicyGetResponseSchema`, `ApprovalPolicyPutRequestSchema`
- `OrchestratorSwarmAuditRowSchema`, `OrchestratorSwarmAuditWriteRequestSchema`, `OrchestratorSwarmAuditQuerySchema`, `OrchestratorSwarmAuditQueryResponseSchema`

### Missing from schema.ts (MB-T11-B deliverables)

**`ApprovalDecision` type** — `{ approvalRequired: boolean; reason: string }` — does NOT exist in `schema.ts` or anywhere in dispatch-core. The equivalent type in dispatch-workstation is `ApprovalResolverResult` (see §III).

---

## §III — Existing resolver: dispatch-workstation pre-fulfillment

**[KNOWN]** `packages/dispatch-workstation/src/main/approval-policy-resolver.ts` exists. Read in full.

**Exports:**
- `type ApprovalPolicy = 'tight' | 'medium' | 'loose'` (local duplicate; §3.22 pre-merge isolation)
- `type ApprovalActionType = 'send' | 'spawn-new-session' | 'kill' | 'pull' | 'assign-task'` (local duplicate)
- `interface ApprovalResolverPredicates { willCommit?, willTouchContract?, isMultiStep? }`
- `interface ApprovalResolverInput { policy, actionType, predicates? }`
- `interface ApprovalResolverResult { approvalRequired: boolean; reason: string }`
- `function resolveApproval(input: ApprovalResolverInput): ApprovalResolverResult`

**Authored by:** sess-mbt13 / MB-T13 WB6. Per FOLLOWUPS.md, the stub (`approval-policy-resolver-stub.ts`) was closed at `MB-F-T11-T13-RESOLVER-STUB` and replaced with the real resolver. A shim (`approval-policy-resolver-shim.ts`) wraps the resolver to bridge the (actionType, sessionName) call shape from sess-mbt11's handler.

**§3.2 table coverage:** [KNOWN] Full — tight (every action required), medium (spawn/kill/isMultiStep/willCommit/willTouchContract required; pull/plain-send auto-fire), loose (willCommit/willTouchContract required; everything else auto-fires). Graceful degradation (missing predicates → false) per R3.

**Semantic match to MB-T11-B scope:** The resolver is functionally identical to what MB-T11-B was scoped to create. The function name differs (`resolveApproval` vs `resolveApprovalPolicy`) and the location differs (dispatch-workstation vs dispatch-core). Logic is identical.

---

## §IV — Existing test coverage (dispatch-workstation)

**[KNOWN]** `packages/dispatch-workstation/test/unit/approval-policy-resolver/`:

| File | Tests | Coverage |
|------|-------|----------|
| `resolver-tight.test.ts` | 8 | All 5 action types × tight; predicates; read-only override |
| `resolver-medium.test.ts` | 12 | Spawn/kill required; pull auto-fires; send with willCommit/willTouchContract/isMultiStep required; send plain auto-fires; assign-task plain auto-fires; multi-trigger precedence |
| `resolver-loose.test.ts` | 9 | willCommit/willTouchContract required; spawn/kill/pull/isMultiStep auto-fire; assign-task plain auto-fires |
| `resolver-degraded-predicates.test.ts` | 5 | Missing predicates → false; empty predicates → false; partial predicates respected |
| **Total** | **34** | **GREEN** (verified 2026-05-08) |

**Coverage against MB-T11-B acceptance criteria §2:**
- ✅ AC1: Resolver implements §3.2 table — fully covered
- ✅ AC3: Pure function / determinism — implied by unit test structure (no I/O, no state)
- ✅ AC4 (partial): Predicates concept covered via `ApprovalResolverPredicates` — but `predictCommitCreating` and `predictContractTouching` **hook stubs do NOT exist**
- ✅ AC2: Reason strings non-empty and descriptive — verified by regex matchers in tests
- ❌ AC4: `predictCommitCreating(prompt: string): boolean` stub **MISSING**
- ❌ AC4: `predictContractTouching(prompt: string, contractPatterns: string[]): boolean` stub **MISSING**
- ❌ AC5: `ApprovalDecision` type in dispatch-core **MISSING**
- ❌: MB-T11-B-attributed probes in dispatch-core **MISSING** (existing probes tagged MB-T13)

---

## §V — dispatch-core test baseline

**[KNOWN]** `pnpm --filter dispatch-core test` result: **143/143 GREEN** (20 test files, including probe-01 through probe-08 in build-doc-parser sub-directory). No pre-existing failures in dispatch-core.

**vitest glob:** `test/**/*.test.{ts,tsx}` — confirmed at `dispatch-core/vitest.config.ts`. Extension for new probes: `.test.ts`.

**Next probe number:** `probe-09` (max existing is `probe-08-validators-direct.test.ts`).

---

## §VI — ApprovalDecision type placement options

Per MB-T11-B §1 + §6 recommendations:

**Option A: `dispatch-core/src/orchestrator/approval-decision.ts` (new file)**
- Pro: Minimal §3.22 surface; does not extend schema.ts
- Pro: Recommended by §6 of prompt
- Con: Adds a new file to dispatch-core; consumers need to know the path

**Option B: Disjoint zone in `dispatch-core/src/v3/schema.ts`**
- Pro: Single-file contract spine; follows existing pattern
- Con: §3.22 surface (T1 and T5 are merged, so collision risk is zero now, but adds to schema.ts complexity)
- Con: `ApprovalDecision` is a plain TS interface, not a Zod schema — odd placement next to schema definitions

**Option C: Collocate with existing dispatch-workstation resolver (no dispatch-core addition)**
- `ApprovalResolverResult` already covers the shape; consumers can import from dispatch-workstation
- Pro: No duplication; one canonical definition
- Con: Violates MB-T11-B scope which says "defined in dispatch-core"

**Option D: Re-export from dispatch-core**
- dispatch-workstation resolver exports `ApprovalResolverResult`
- dispatch-core re-exports as `ApprovalDecision` (type alias / re-export)
- Pro: No duplication of logic; canonical in dispatch-core
- Con: dispatch-core currently does not import from dispatch-workstation (would create circular dep)

**Ruling out D:** dispatch-core → dispatch-workstation would be a circular dependency (workstation imports from core). Invalid.

**Default disposition:** Option A — new file `dispatch-core/src/orchestrator/approval-decision.ts` exporting `ApprovalDecision` type. This is exactly what §6 recommends to minimize §3.22 surface.

---

## §VII — Hook stub design

**MB-T11-B §1 scope:** "Hooks for commit-creating prompt prediction and contract-touching prompt prediction are heuristic-stubbable in MB-T11-B. MB-T11-B ships with the hook surface + a stub heuristic that returns false."

**Proposed signatures:**
```typescript
export function predictCommitCreating(prompt: string): boolean { return false; }
export function predictContractTouching(prompt: string, contractPatterns: string[]): boolean { return false; }
```

**Location question:** The stubs feed into the resolver's `predicates.willCommit` and `predicates.willTouchContract`. Two placement options:

**Hook Option A: dispatch-core/src/orchestrator/approval-decision.ts** (same file as `ApprovalDecision`)
- Per MB-T11-B original scope
- Pure functions with no deps → dispatch-core is appropriate

**Hook Option B: dispatch-workstation/src/main/ (alongside existing resolver)**
- Collocated with the resolver that consumes them
- Consistent with where the real heuristics will land in Round 6

**Default disposition:** Hook Option A — in dispatch-core, alongside `ApprovalDecision`. This satisfies the original scope and keeps the hook surface in the shared package where Round 6 can find it.

---

## §VIII — §3.2 table edge cases

Per MB-T11-B §8 step 4 mandate: interpret edge cases from the §3.2 table.

**Edge case 1: `assign-task` under medium without predicates**
Resolved: `assign-task` is NOT `spawn-new-session` or `kill`, so it falls through to predicate checks. No predicates → auto-fires. [KNOWN — confirmed by resolver logic + test coverage]

**Edge case 2: `assign-task` + `isMultiStep` under loose**
Resolved: under loose, `isMultiStep` does NOT trigger approval (only `willCommit`/`willTouchContract` do). Auto-fires. [KNOWN — confirmed by resolver logic + test `resolver-loose.test.ts`]

**Edge case 3: `pull` under tight**
Resolved: tight overrides the §3.6 read-only path — `pull` requires approval under tight. [KNOWN — confirmed by resolver logic + test]

**Edge case 4: `assign-task` under medium — is it structurally a multi-step plan?**
The prompt says "Multi-step plans where the orchestrator wants to chain >1 send-prompt in a single approval cycle." The resolver uses `isMultiStep` predicate (not action type) to gate this. An `assign-task` without `isMultiStep=true` auto-fires under medium — consistent with §3.2 ("Everything else ... fires without per-action approval but is logged").

**No ambiguities surfaced** that require §3.18 operator arbitration. The existing resolver's interpretations match §3.2 verbatim.

---

## §IX — Q-MBT11B questions for HALT 0

**Q-MBT11B-1 (SCOPE DISPOSITION):** The core §3.2 resolver already exists in dispatch-workstation, fully implemented and tested by sess-mbt13. MB-T11-B was originally scoped to create this resolver. What should MB-T11-B deliver?

Default disposition: **Option (a)** — Gap-fill only. Add `ApprovalDecision` type + hook stubs in dispatch-core (new file `approval-decision.ts`). Author MB-T11-B-attributed probes in dispatch-core for the hook stubs and the type. Reference existing dispatch-workstation resolver tests as the §3.2 semantic closure evidence. WB3 (wire real imports) collapses because no stand-ins were used.

**Q-MBT11B-2 (WBLADDER COLLAPSE):** Since T1 and T5 are already merged to main, WB3 ("replace stand-ins with real imports") has no work to do. Proposed: collapse WB1 + WB2 into a single WB (RED + GREEN in one cycle) covering hook stubs + type + probes. WB3 becomes WB4 (docs). Confirm collapse is acceptable.

**Q-MBT11B-3 (HOOK STUB LOCATION):** Hook stubs in dispatch-core (new `approval-decision.ts` alongside `ApprovalDecision`), or in dispatch-workstation alongside the resolver?

Default disposition: **dispatch-core** per original scope.

**Q-MBT11B-4 (PROBE SCOPE):** Given the resolver already has 34 tests in dispatch-workstation (MB-T13), what is the expected scope of MB-T11-B probes in dispatch-core?

Default disposition: **Stubs-only probes** — verify `predictCommitCreating(anything) === false`, `predictContractTouching(anything, anything) === false`, and type shape of `ApprovalDecision`. The full §3.2 semantic coverage is already in dispatch-workstation and need not be duplicated in dispatch-core.

**Q-MBT11B-5 (ACTION TYPE NAMES):** The MB-T11-B prompt uses §3.6 verbose action-type names (`send-prompt-to-session`, `spawn-session`, `kill-session`, etc.) in several places. The actual schema uses short names (`send`, `spawn-new-session`, `kill`, etc.). This is a prompt artifact from the pre-merge period. Probes should use the short names from `ApprovalActionTypeEnum` (§13 of schema.ts). Confirm.

---

## §X — Summary table

| Item | Status | Source |
|------|--------|--------|
| T1 action-variant schemas (§12) | **DONE — in schema.ts** | Merged at f397ca0 |
| T5 approval-policy enum (§13) | **DONE — in schema.ts** | Merged at f397ca0 |
| §3.2 resolver logic | **DONE — dispatch-workstation** | sess-mbt13 WB6 |
| Resolver tests (34 cases) | **GREEN** | dispatch-workstation |
| `ApprovalDecision` in dispatch-core | **MISSING** | MB-T11-B scope |
| `predictCommitCreating` stub | **MISSING** | MB-T11-B scope |
| `predictContractTouching` stub | **MISSING** | MB-T11-B scope |
| MB-T11-B probes in dispatch-core | **MISSING** | MB-T11-B scope |
| dispatch-core baseline | **143/143 GREEN** | Verified 2026-05-08 |
| WB3 (stand-in wiring) | **COLLAPSES** | T1+T5 already merged |
