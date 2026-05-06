# Session I — parallel-batch-6-2026-05-06 — Findings (append-only)

**Branch:** `sess-i/plan-cost-endpoints`
**Worktree:** `~/Desktop/Automata/foxworks-worktrees/sess-i-plan-cost-endpoints`
**Cut from:** `main` HEAD `f972a03` (post-rebase from initial `78bc817`)
**Date opened:** 2026-05-06

This file is per-session append-only. Operator merges entries into
`docs/cairn-findings.md` at scaffold-close time, assigning the final
finding number from the parallel-batch-6 sess-i slot. Numbers below
are working entries; operator may renumber on merge.

---

## Finding #sess-i-1 — MB-F-DAEMON-PLAN-COST-ENDPOINTS

**Date filed:** 2026-05-06
**Tier:** 3 — architectural symmetry. Closes two pre-existing followups:
- sess-b finding #140 §Followups #1 — daemon plan/cost/model/stdout endpoints (PlanInfo daemon surface)
- sess-e finding #155 §Followups #1 — real fields auto-flip data-mock markers (CostInfo daemon surface)

**Origin:** parallel-batch-6 Session I scope. Operator arbitration locked I-Q1 through I-Q11 in Phase 1 diagnose `/tmp/sess-i-plan-cost-endpoints-diagnose.md`. β-path authorship: CC drafted schema text on branch; operator approved diff post-WB1 push; CC continued with WB2 → WB5 without halts between (per Phase 2 brief HALT POINTS).

**Discovered by:** Session I (this batch) Phase 1 reading + Phase 2 implementation. The two predecessor finding §Followups had been carried forward across batches 4/5 awaiting daemon work; sess-i is the first batch to ship the schema + daemon surface.

**Resolution status:** SHIPPED on `sess-i/plan-cost-endpoints`. Ladder commits:
- WB-A0 `f59cb3e` — cross-territory typecheck hot-fix (filed under separate finding name MB-F-DAEMON-CONCURRENT-RACE-FIX-TYPECHECK-FIX, see Methodology Tier-1 #3 below)
- WB1 `659600d` — schema additions (PlanInfo + CostInfo + SessionSchemaV2/SessionResponseV2 extensions)
- WB2 `d29534c` — RED probes P7/P8/P9
- WB3 `0880d4e` — GREEN: routes/sessions.ts attach plan_info passthrough + computed cost_info
- WB4 `57ae353` — REPORT.md aggregate
- WB5 (this commit) — finding entry + cross-session coordination

### Surface change (KNOWN — direct read of source files at HEADs cited)

| | Before (HEAD `f972a03` post-rebase) | After (HEAD post-WB5) |
|---|---|---|
| `dispatch-core/src/v2/schema.ts` | 8-field `SessionSchemaV2` (lines 86-98); 3-field `SessionResponseV2` (264-268) | + §1.5 PlanInfoSchema + CostInfoSchema; `SessionSchemaV2.plan_info?` (optional); `SessionResponseV2.cost_info?` (optional) |
| `dispatch-daemon/src/routes/sessions.ts` | List handler returns `{name, ...session, computed_status}`; detail handler adds `status_json: null, recent_events: []` | Both handlers add `cost_info: MOCK_COST_INFO`; plan_info propagates via existing `...session` spread |
| `dispatch-daemon/test/integration/plan-cost-endpoints/` | directory did not exist | 3 probe files (450 lines) + REPORT.md (179 lines) |
| Test count (dispatch-daemon) | 197/197 baseline | 203/203 (+6 from new probes) |
| 4-package typecheck | FAIL pre-WB-A0 (TS2322); PASS post-WB-A0 | PASS through WB1-5 |
| Migration logic | unchanged (Q-I3=a `.optional()` keeps it untouched) | unchanged |
| Web UI consumption | mock fallback constants in Layout.tsx render PlanRing/CostPill | unchanged (Q-I8=d defers to followup) |

`PlanInfoSchema` shape (Q-I1=a):
```ts
{ tier: string, usage_pct: int(0..100), reset_ms: int(>=0), plan_id: string }
```

`CostInfoSchema` shape (Q-I2=a):
```ts
{ usd_today: number(>=0), usd_this_month: number(>=0), token_count: int(>=0) }
```

`MOCK_COST_INFO` daemon constant (Q-I5=a):
```ts
{ usd_today: 0.42, usd_this_month: 8.17, token_count: 124_500 }
```

Drift between this constant and probe-08/-09 `EXPECTED_MOCK_COST_INFO` literals would fail those tests immediately — they are the regression shield for the contract.

### Verification (KNOWN — test-execution observations captured 2026-05-06)

3 probe files at `packages/dispatch-daemon/test/integration/plan-cost-endpoints/`:
- **probe-07** plan_info passthrough — 2 tests
  - main contract test (RED at WB2, GREEN at WB3): assert plan_info equals seeded value AND cost_info defined
  - regression shield (GREEN by structure both batches): assert plan_info absent → undefined
- **probe-08** cost_info computed — 2 tests
  - main contract test (RED at WB2, GREEN at WB3): assert cost_info equals operator-arbitrated mock literals
  - cross-check (RED at WB2, GREEN at WB3): cost_info independent of plan_info presence
- **probe-09** end-to-end full shape — 2 tests
  - main contract test (RED at WB2, GREEN at WB3): full LIST shape: alphabetic sort + per-session cost_info + plan_info passthrough where seeded
  - regression shield (GREEN by structure both batches): empty registry → `{sessions: []}`

WB2 RED: 4 fail + 2 GREEN-by-design (3 RED files; brief literal "all 3 probes RED" honored at file level).
WB3 GREEN: 6/6 pass; all 4 RED-at-WB2 contract tests flipped; regression shields stay GREEN.

Regression sweep (WB3 + WB4 commits):
- dispatch-core: 12 files / 60 tests pass (baseline preserved)
- dispatch-daemon: 44 files / 203 tests pass (was 197 + 6 new probes)
- dispatch-daemon test:race: 13 passed + 2 expected fail = 15 (baseline preserved)
- 4-package typecheck (dispatch-core, dispatch-daemon, dispatch-cli, dispatch-web): all PASS

### Operator-arbitrated decisions Q-I1 through Q-I11

| ID | Decision | Status |
|---|---|---|
| **Q-I1** | PlanInfo field shape (a): `{tier, usage_pct, reset_ms, plan_id}` | ✅ APPLIED (WB1 schema.ts §1.5) |
| **Q-I2** | CostInfo field shape (a): `{usd_today, usd_this_month, token_count}` | ✅ APPLIED (WB1 schema.ts §1.5) |
| **Q-I3** | `plan_info: PlanInfoSchema.optional()` on SessionSchemaV2 | ✅ APPLIED (WB1; zero migration churn — migration logic untouched) |
| **Q-I4** | (moot — Q-I3=a means no migration default needed) | N/A |
| **Q-I5** | Mock cost values: `usd_today: 0.42` matches Layout fallback; remainder per Phase 1 §3.2 "etc." | ✅ APPLIED (WB2 test literals + WB3 daemon constant; locked in lock-step) |
| **Q-I6** | REPORT.md location: `test/integration/plan-cost-endpoints/REPORT.md` (under integration/, not unit/) | ✅ APPLIED (WB4) |
| **Q-I7** | KEEP existing MOCK_* fallback constants in Layout.tsx | ⏸ DEFERRED to UI followup (Q-I8=d cluster) |
| **Q-I8** | DEFER UI consumption; daemon ships sub-objects only this batch | ⏸ DEFERRED — Tier-2 followup MB-F-LAYOUT-PLAN-COST-CONSUMPTION (see below) |
| **Q-I9** | NO update to default MSW mockSession | ⏸ DEFERRED to UI followup (Q-I8=d cluster) |
| **Q-I10** | File pre-existing SessionsListResponse divergence as Tier-2 followup | ⏸ DEFERRED — Tier-2 followup MB-F-DAEMON-SESSIONS-LIST-RESPONSE-SHAPE (see below) |
| **Q-I11** | Already rebased to `f972a03`; ahead via WB-A0 at `f59cb3e` | ✅ APPLIED (pre-WB1) |
| **WB1 authorship** | β-path: CC drafts on branch, operator approves before WB2 | ✅ APPLIED (HALT 1 honored) |

The Q-I3=a invariant is load-bearing. The migration test P2 at `packages/dispatch-daemon/test/unit/migration-schema-v2.test.ts:73-84` uses `toEqual` against an 8-field literal; `PlanInfoSchema.optional()` keeps that test green because Vitest treats absent vs `undefined` keys as structurally equal under `toEqual`. **If P2 fails post-merge, there's a bug in the optional path** — surface immediately.

### Methodology lessons (Tier-1 findings)

Three Tier-1 methodology findings surfaced during sess-i. Each warrants a separate finding entry on operator merge to `docs/cairn-findings.md`.

**Tier-1 #1 — regression sweeps must include `pnpm typecheck`** (cross-ref WB-A0 commit `f59cb3e`):

sess-g WB3 (commit `23517d7`, merged into main at `f972a03`) introduced a TS2322 type-system contract violation in `packages/dispatch-core/src/persist/atomic-write.ts:123` (`resolveLockOpts` assigned `overrides.retries ?? DEFAULT_LOCK_OPTS.retries` where the input variant had optional inner fields but the target required all three). Test sweeps did NOT catch this because Vitest strips types via esbuild/swc — `pnpm test` is type-blind. The bug only surfaces under `tsc --noEmit`.

Runtime impact: latent. None of the three `writeAtomicJson` call sites (registry/write.ts:28-32, persist/read-with-recovery.ts:86, daemon/migration/schema-v2.ts:98-102) pass an object-form `retries` override, so the broken branch was never invoked. But the contract was violated and would have surfaced on the next caller that exercised the branch.

WB-A0 fix: extracted `resolveRetries` helper that explicitly merges user partial onto defaults; one file changed (atomic-write.ts +24/-1).

**Lesson:** every per-package regression sweep must include `pnpm --filter <pkg> typecheck` alongside `pnpm --filter <pkg> test`. sess-i ran the 4-package sweep at WB1, WB3, and WB4 to enforce this.

**Tier-1 #2 — brief-path verification gap (v3/schema.ts vs v2/schema.ts)**:

Phase 2 brief listed `packages/dispatch-core/src/v3/schema.ts` as the WB1 territory file; the actual home of `SessionSchemaV2` and `SessionResponseV2` is `v2/schema.ts`. `v3/schema.ts` is the orchestrator/build-doc/ticket domain — unrelated to HTTP /v2/sessions.

CC surfaced the divergence via §3.7 halt before any commit, citing Phase 1 diagnose §2 which explicitly named `v2/schema.ts`. Operator confirmed α-path resolution: WB1 territory is `v2/schema.ts`; `v3/schema.ts` is OUT OF SCOPE.

**Lesson:** chat-layer brief drafts must verify file paths against repo structure before issuing CC prompts. The §3.7 halt surfaced this without requiring a recommit, but the lesson is that the verification should happen earlier (at brief-draft time, not CC-execution time).

**Tier-1 #3 — chat-layer arbitration-summary paraphrase error (Q-I5 mis-cited)**:

Chat-layer takeover summary mis-paraphrased Q-I5's question and answer. The summary said Q-I5=a means "mock cost matches Layout fallback"; the actual Phase 1 diagnose Q-I5 asked about persistence semantics and locked Q-I5=c "PlanInfo persisted on SessionSchemaV2, CostInfo computed on SessionResponseV2".

The mis-paraphrase caused the chat-layer to incorrectly flag CC's accurate WB1 commit-body citation of Q-I5=c as anomalous in pre-WB2 review. Operator caught and reverted in real-time, confirming CC's citations were structurally correct.

**Lesson:** chat-layer summaries of CC's Phase 1 arbitrations must be reconstructed from the diagnose document at handoff, not summarized from condensed memory. This protects against paraphrase drift across multi-turn conversations where the diagnose is the single source of truth.

### Followup decision points (Tier-2 followups)

Three Tier-2 followups surface from sess-i for future batches. Each is its own MB-F-* finding when scheduled.

**Tier-2 #1 — MB-F-LAYOUT-PLAN-COST-CONSUMPTION** (closes Q-I8 deferral):

Daemon ships PlanInfo + CostInfo sub-objects on /v2/sessions{,/:name} responses; UI Layout.tsx + PlanRing.tsx + CostPill.tsx still render mock fallback constants from Layout.tsx:23-25. The header is GLOBAL (one PlanRing + one CostPill); but plan_info + cost_info are PER-SESSION. Whose values does the header render?

Phase 1 diagnose §6 Gap 1 surfaced four candidate strategies:
- (a) First-session-with-plan_info — simple but arbitrary
- (b) Focused session via `useUIStore.focusedSession` — meaningful but more behavior to test
- (c) Aggregate across all sessions — requires daemon top-level aggregate field, contradicts I-Q2=b sub-objects
- (d) DEFER — daemon ships sub-objects, UI consumption is a separate followup [SELECTED]

Future batch should pick from (a)/(b)/(c) and ship the consumption layer. UI auto-flip data-mock="true" off when real data present (per the original sess-e finding #155 §Followups #1 spec).

**Tier-2 #2 — MB-F-DAEMON-SESSIONS-LIST-RESPONSE-SHAPE** (closes Q-I10):

Pre-existing schema-vs-route shape divergence in `SessionsListResponse`: schema declares `sessions: z.record(z.string().min(1), SessionResponseV2)` (object/record), but the route at `routes/sessions.ts:75-86` returns `sessions: [...]` (array). MSW handlers in `packages/dispatch-web/test/msw/handlers.ts:43-45` match the schema (`{ sessions: { sherpa: ... } }`), so the test path doesn't exercise the divergence. Production daemon ↔ UI integration would fail at parse time.

Pre-existing; out of scope for sess-i. Resolution requires either:
- Schema → array shape (more invasive; affects record-shaped tests)
- Route → record shape (changes alphabetic sort semantics; UI consumers like SessionListPanel.tsx:69-74 already use `Object.entries(data.sessions)` which would prefer record)

Recommend route → record fix in a future batch since the UI already consumes record shape; `Object.entries({...})` works on records, not arrays.

**Tier-2 #3 — MB-F-DAEMON-PLAN-COST-REAL-INTEGRATION** (closes I-Q3=a deferral):

Daemon currently returns hardcoded `MOCK_COST_INFO` constant on every read. Real integration requires:
- Anthropic API client integration (token usage, plan tier introspection)
- Per-session cost aggregation (token count → USD via plan-tier rate table)
- Caching strategy (don't hit Anthropic API on every /v2/sessions read)
- Plan info propagation: where does `plan_info` get set on a session? Daemon-side init? Operator-set via PATCH /v2/sessions/:name/plan? Auto-detected from API key?

Each sub-question is itself an arbitration. Future batch is non-trivial; recommend Phase 1 diagnose pass to scope it before committing to a brief.

When this batch ships, `MOCK_COST_INFO` constant in routes/sessions.ts becomes a function call to a real cost-aggregation service; probe-08 + probe-09 EXPECTED_MOCK_COST_INFO literals get replaced by computed-vs-real-service comparisons (or are left as the mock-mode regression shield depending on test architecture).

---

## End of session findings (sess-i closed)

HALT 2 per Phase 2 brief: full sess-i closure summary + acceptance criteria + ready-for-merge declaration on commit-push of WB5 (this commit).
