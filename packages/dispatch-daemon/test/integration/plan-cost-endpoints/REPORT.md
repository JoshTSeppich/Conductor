# MB-F-DAEMON-PLAN-COST-ENDPOINTS — Session I REPORT

**Branch:** `sess-i/plan-cost-endpoints` (cut from `main` HEAD `f972a03`)
**Batch:** parallel-batch-6
**Date:** 2026-05-06
**Closes:** sess-b finding #140 §Followups #1 (PlanInfo daemon surface) + sess-e finding #155 §Followups #1 (CostInfo daemon surface)

---

## §1 What was shipped

Daemon surface for PlanInfo (per-session, persisted) and CostInfo (per-session, request-time computed) on the existing GET /v2/sessions and GET /v2/sessions/:name endpoints. The schema additions are operator-arbitrated mechanical translation per project instructions §3.4; the daemon surface attaches mock cost values per operator-arbitrated I-Q5=a until real Anthropic API integration lands in a future batch.

Specifically:

- **`PlanInfoSchema`** — new Zod schema in `packages/dispatch-core/src/v2/schema.ts` §1.5: `{ tier, usage_pct (0-100 int), reset_ms (int>=0), plan_id }`. Operator-arbitrated I-Q1=a.
- **`CostInfoSchema`** — new Zod schema in same §1.5: `{ usd_today (>=0), usd_this_month (>=0), token_count (int>=0) }`. Operator-arbitrated I-Q2=a.
- **`SessionSchemaV2`** — extended with `plan_info: PlanInfoSchema.optional()` (Q-I3=a; zero migration churn — existing v1→v2 migration logic at `packages/dispatch-daemon/src/migration/schema-v2.ts:130-139` does NOT inject plan_info, and the optional path keeps test P2's `toEqual` literal green).
- **`SessionResponseV2`** — extended with `cost_info: CostInfoSchema.optional()` (Q-I5=a; computed not persisted; plan_info inherits as optional via the existing `SessionSchemaV2.extend({...})` chain).
- **Daemon route handlers** (`packages/dispatch-daemon/src/routes/sessions.ts`) — both GET /v2/sessions list and GET /v2/sessions/:name detail handlers now attach a `cost_info: MOCK_COST_INFO` field on every read; plan_info propagates from the registry via the existing `...session` spread (becomes a no-op when registry session has no plan_info).
- **Three new integration probe files** under `packages/dispatch-daemon/test/integration/plan-cost-endpoints/`: probe-07 (plan_info passthrough), probe-08 (cost_info computed), probe-09 (end-to-end full shape).

UI consumption deferred to a separate Tier-2 followup per Q-I8=d — daemon ships sub-objects this batch; web continues to render mock fallback constants from Layout.tsx until the followup lands.

**Confidence:** KNOWN — all changes verified by passing test suites + 4-package typecheck sweep.

---

## §2 Operator arbitrations applied

| ID | Question | Decision | WB applied |
|---|---|---|---|
| Q-I1 | PlanInfo field shape | (a) `{tier, usage_pct, reset_ms, plan_id}` | WB1 |
| Q-I2 | CostInfo field shape | (a) `{usd_today, usd_this_month, token_count}` | WB1 |
| Q-I3 | plan_info nullability on SessionSchemaV2 | (a) `.optional()` — zero migration churn | WB1 |
| Q-I5 | Mock cost values daemon-side | (a) Match Layout fallback (`usd_today: 0.42`); other values per Phase 1 §3.2 "etc." | WB2 + WB3 |
| Q-I6 | REPORT.md location | (b) `test/integration/plan-cost-endpoints/REPORT.md` (this file) | WB4 |
| Q-I7 | MOCK_* constants in Layout.tsx | (a) KEEP — fallback path for `??` chain | DEFERRED to UI followup |
| Q-I8 | UI header consumption strategy | (d) DEFER — daemon ships sub-objects, UI consumption is a separate followup | TIER-2 followup |
| Q-I9 | Default MSW mockSession update | (a) NO update — keep current fallback-visible state | DEFERRED to UI followup |
| Q-I10 | Pre-existing schema-vs-route divergence | File as Tier-2 followup | TIER-2 followup |
| Q-I11 | Rebase posture | Worktree rebased to `f972a03`; ahead via WB-A0 (`f59cb3e`) | done pre-WB1 |
| WB1 authorship | β-path: CC drafts on branch, operator approves before WB2 | applied | WB1 |

**Confidence:** KNOWN — every arbitration's outcome is traceable to the WB commit body where it was applied.

---

## §3 Probes ran (before/after)

### Before (main HEAD `f972a03`)

- `packages/dispatch-daemon/test/integration/plan-cost-endpoints/` — directory did not exist
- dispatch-daemon test suite: 41 files / 197 tests pass (baseline; pre-WB-A0)
- dispatch-core test suite: 12 files / 60 tests pass
- dispatch-daemon test:race: 13 passed + 2 expected fail (15)
- 4-package typecheck: ALL FAIL (TS2322 in `packages/dispatch-core/src/persist/atomic-write.ts:123` — addressed by WB-A0 hot-fix)

### After WB-A0 (`f59cb3e`)

- 4-package typecheck: ALL PASS
- All test suites unchanged (baselines preserved)

### After WB1 (`659600d`)

- `packages/dispatch-core/src/v2/schema.ts`: +72 lines (PlanInfoSchema, CostInfoSchema, SessionSchemaV2 extension, SessionResponseV2 extension)
- 4-package typecheck: PASS
- Test baselines preserved (60/60 + 197/197)

### After WB2 (`d29534c`)

- 3 new probe files created: probe-07 (146 lines), probe-08 (141 lines), probe-09 (163 lines)
- dispatch-daemon test count: 197 → 203 (+6 from new probes)
- Probe state: 3 RED files / 4 RED tests + 2 GREEN-by-design regression shields
- 4-package typecheck: PASS

### After WB3 (`0880d4e`)

- `packages/dispatch-daemon/src/routes/sessions.ts`: +40 / -1 lines
- All 6 probe tests GREEN (RED-at-WB2 contract tests flipped; regression shields stay GREEN)
- dispatch-daemon test: 44 files / 203 tests pass
- dispatch-core test: 12 files / 60 tests pass (baseline)
- dispatch-daemon test:race: 13 + 2 expected fail (baseline)
- 4-package typecheck: PASS

### Per-probe RED → GREEN transition

| Probe | WB2 (RED) state | WB3 (GREEN) state |
|---|---|---|
| probe-07 main test (plan_info passthrough + cost_info presence) | FAIL — cost_info undefined | PASS — both populated |
| probe-07 regression shield (plan_info absent → undefined) | PASS by structure | PASS by structure (unchanged) |
| probe-08 main test (cost_info matches mock literals) | FAIL — cost_info undefined | PASS — values match |
| probe-08 cross-check (cost_info independent of plan_info) | FAIL — cost_info undefined | PASS — values match |
| probe-09 main test (full enriched LIST shape) | FAIL — cost_info undefined per session | PASS — sort + plan_info passthrough + cost_info all assert |
| probe-09 regression shield (empty registry) | PASS by structure | PASS by structure (unchanged) |

**Confidence:** KNOWN — all transitions verified by direct test runs captured in the WB2 + WB3 commit bodies.

---

## §4 Ladder commits

| WB | Hash | Type | Subject |
|---|---|---|---|
| WB-A0 | `f59cb3e` | green (cross-territory hot-fix) | `green(MB-F-DAEMON-CONCURRENT-RACE-FIX-TYPECHECK-FIX): WB-A0 — resolveLockOpts inner-field defaults` |
| WB1 | `659600d` | contract | `contract(MB-F-DAEMON-PLAN-COST-ENDPOINTS): WB1 — PlanInfo + CostInfo schema additions` |
| WB2 | `d29534c` | red | `red(MB-F-DAEMON-PLAN-COST-ENDPOINTS): WB2 — daemon sessions-read RED probes P7/P8/P9` |
| WB3 | `0880d4e` | green | `green(MB-F-DAEMON-PLAN-COST-ENDPOINTS): WB3 — sessions read handlers attach plan_info passthrough + computed cost_info` |
| WB4 | (this commit) | refactor | `refactor(MB-F-DAEMON-PLAN-COST-ENDPOINTS): WB4 — REPORT.md aggregate` |
| WB5 | (pending) | docs | `docs(MB-F-DAEMON-PLAN-COST-ENDPOINTS): WB5 — sess-i finding entry + Tier-1/Tier-2 followups` |

Per-commit-push: every commit pushed to `origin sess-i/plan-cost-endpoints` immediately after creation. Per-path `git add`: explicit paths only (NEVER `git add -A`). Pre/post-commit discipline: `git status --short` pre, `git log -1 --stat` post — captured for every commit.

Halt discipline: HALT 1 honored after WB1 push (operator schema review); WB2 → WB3 → WB4 → WB5 flows without halts per operator directive ("WB2 is RED-only, no halt between WB2 and WB3"); HALT 2 (full closure) lands after WB5 push.

**Confidence:** KNOWN — hashes verified via `git log --oneline f972a03..HEAD`.

---

## §5 What this defends against

- **Schema/data drift** — plan_info passthrough + cost_info presence are now contract-tested at the integration level. Probe-07 catches any future implementation that drops plan_info from the response shape (e.g., a switch from `...session` spread to explicit-field selection that omits plan_info). Probe-08 catches drift between WB3's `MOCK_COST_INFO` constant and the Q-I5=a-arbitrated literals. Probe-09 catches both invariants across the LIST endpoint specifically. (KNOWN.)
- **Migration regression** — the .optional() decision for plan_info preserves the existing v1→v2 migration test P2's `toEqual` literal at `packages/dispatch-daemon/test/unit/migration-schema-v2.test.ts:73-84` without modification. Future schema-mutation work that breaks this invariant fails P2 immediately. (KNOWN.)
- **Type contract enforcement** — WB-A0 methodology finding requires `pnpm typecheck` in every regression sweep. WB1, WB3 ran the 4-package sweep pre-commit. The schema additions and route handler enrichment are both type-system-verified, not just test-system-verified. (KNOWN.)
- **Cross-test consistency** — the WB3 daemon's `MOCK_COST_INFO` constant is value-equivalent to the WB2 probes' `EXPECTED_MOCK_COST_INFO`. Drift between the two would fail probe-08 + probe-09 immediately. The literals are documented in both files with cross-references. (KNOWN.)

**Confidence:** KNOWN.

---

## §6 What this does NOT do

- **Does NOT modify packages/dispatch-web/*** — UI consumption deferred per Q-I8=d. Header PlanRing + CostPill continue to render Layout.tsx mock fallback constants until the separate UI consumption followup lands (filed as Tier-2 in WB5 docs). (KNOWN.)
- **Does NOT modify the existing `sessions-read.test.ts`** — P1-P6 probes there are unchanged. The `...session` spread in the WB3 handler doesn't alter their assertions; verified by the 197 → 203 test count math (+6 from new probes only) and full-suite GREEN. (KNOWN.)
- **Does NOT add ENV-driven mock toggles or real-API integration** — the daemon ships hardcoded mock values for cost_info per Q-I5=a; real Anthropic API integration is a separate future batch (Tier-2 followup MB-F-DAEMON-PLAN-COST-REAL-INTEGRATION, surfaced in WB5). (KNOWN.)
- **Does NOT modify migration logic** at `packages/dispatch-daemon/src/migration/schema-v2.ts` — Q-I3=a optional path keeps migration untouched. v1→v2 migration tests still pass with their pre-edit expected literals. (KNOWN.)
- **Does NOT touch v3/schema.ts** — the orchestrator/build-doc/ticket domain is unrelated to /v2/sessions HTTP shape. WB1 brief originally listed v3/schema.ts as the target but operator confirmed α-path resolution (v2/schema.ts). (KNOWN — surfaced as Tier-1 finding in WB5.)
- **Does NOT touch sess-g territory beyond WB-A0** — `packages/dispatch-core/src/persist/atomic-write.ts` was modified ONLY in WB-A0 under operator-authorized §3.4 cross-territory hot-fix scope. WB1-5 do not touch sess-g territory. (KNOWN.)
- **Does NOT address pre-existing `SessionsListResponse` schema-vs-route shape divergence** — schema declares `sessions: z.record(...)` but route returns `sessions: [...]` array. MSW handlers match schema; production daemon ↔ UI parse would fail. Pre-existing; out of scope. Filed as Tier-2 followup MB-F-DAEMON-SESSIONS-LIST-RESPONSE-SHAPE in WB5. (KNOWN.)

**Confidence:** KNOWN.

---

## §7 §G gaps surfaced

1. **Pre-existing `SessionsListResponse` schema-vs-route shape divergence** — discovered during Phase 1 reading. The Zod schema declares `sessions: z.record(...)` (object/record) but the daemon route at `routes/sessions.ts:75-86` returns `sessions: [...]` (array). MSW handlers in `packages/dispatch-web/test/msw/handlers.ts:43-45` match the schema (`{ sessions: { sherpa: ... } }`), so the test path doesn't exercise the divergence; production daemon ↔ UI integration would fail at parse time. Pre-existing. Filed as Tier-2 followup `MB-F-DAEMON-SESSIONS-LIST-RESPONSE-SHAPE` in WB5 docs. (KNOWN.)

2. **UI header consumption ambiguity** — header PlanRing + CostPill in Layout.tsx are GLOBAL (one of each, not per-session); but Q-I5=c places PlanInfo + CostInfo per-session. Whose values does the header render? Operator deferred this to a separate followup (Q-I8=d). Filed as Tier-2 followup `MB-F-LAYOUT-PLAN-COST-CONSUMPTION` in WB5 docs. (KNOWN — Phase 1 diagnose §6 Gap 1.)

3. **Mock value drift risk** — daemon's `MOCK_COST_INFO` and probe-08/-09 `EXPECTED_MOCK_COST_INFO` are independent literals that must stay in lock step. A future revision to one without the other will fail tests. Documented in both files with cross-references; failure mode is loud not silent. (KNOWN.)

4. **`usd_this_month` and `token_count` mock values** — Phase 1 §3.2 SPECULATIVE recommendations (8.17 and 124500) accepted via Q-I5=a "etc." Operator may revise these in a future batch with no schema impact (the schema bounds are: `>=0` for both, integer for token_count). (KNOWN — surfaced for explicit operator awareness.)

5. **Brief-path verification gap** — Phase 2 brief drafted `packages/dispatch-core/src/v3/schema.ts` for WB1 when the actual target is `v2/schema.ts`. CC surfaced via §3.7 halt rather than self-arbitrating. Operator confirmed α-path. Filed as Tier-1 methodology finding in WB5 docs. (KNOWN.)

6. **Chat-layer arbitration-summary paraphrase error** — chat-layer takeover summary mis-paraphrased Q-I5's question/answer (claimed Q-I5=a means "mock cost matches Layout fallback"; actual Phase 1 diagnose Q-I5=c is "PlanInfo persisted, CostInfo computed"). Caused chat-layer to incorrectly flag CC's accurate citation as anomalous in pre-WB2 review. Operator caught and reverted in real time. Filed as Tier-1 methodology finding in WB5 docs. (KNOWN — operator-confirmed.)

7. **WB-A0 cross-territory typecheck regression** — sess-g WB3 (commit `23517d7`, merged at `f972a03`) introduced a TS2322 in `packages/dispatch-core/src/persist/atomic-write.ts:123` that test sweeps did NOT catch (Vitest strips types via esbuild/swc). WB-A0 hot-fix (`f59cb3e`) addressed it under operator-authorized §3.4 cross-territory scope. Methodology lesson filed as Tier-1 in WB5 docs. (KNOWN.)

**Confidence:** KNOWN for items 1-7; the followups themselves are SPECULATIVE in scope (operator may pick which to schedule and when) but the surfaced *facts* are KNOWN.

---

## §8 Operator next steps

1. Review WB4 + the upcoming WB5 finding entry on `sess-i/plan-cost-endpoints`.
2. Optionally seed a real registry with a session containing `plan_info` populated and run `curl <daemon>/v2/sessions/<name>` to visually confirm the response shape includes both fields.
3. Run `pnpm --filter dispatch-daemon test test/integration/plan-cost-endpoints` to confirm 6/6 GREEN at any point post-merge.
4. Merge `sess-i/plan-cost-endpoints` → `main` (sess-i does NOT self-merge).
5. After merge, schedule the three Tier-2 followups (UI consumption, sessions-list shape divergence, real Anthropic API integration) and the three Tier-1 methodology findings per the WB5 docs entry.

**Confidence:** KNOWN for steps 1-5.

---

## End of report

HALT for operator merge after WB5 push (HALT 2 per Phase 2 brief).
