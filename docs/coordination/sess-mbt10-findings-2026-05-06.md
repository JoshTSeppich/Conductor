# Session MB-T10 — Findings (append-only)

**Branch:** `sess-mbt10/spawned-session-context-tier4`
**Worktree:** `~/Desktop/Automata/foxworks-worktrees/sess-mbt10`
**Cut from:** `main` HEAD `5d93d9b` (post-sess-i merge, pre-sess-mbt09 merge)
**Date opened:** 2026-05-06

This file is per-session append-only. Operator merges entries into
`docs/cairn-findings.md` at scaffold-close time, assigning the final
finding number from the parallel-batch sess-mbt10 slot. Numbers below
are working entries; operator may renumber on merge.

---

## Finding #sess-mbt10-1 — MB-T10 — Spawned-session context tier (Tier 4)

**Date filed:** 2026-05-06
**Tier:** 3 — feature ticket. Implements `CONDUCTOR_V3_RESCOPE.md §3.5 + §4 lines 195-201`.

**Origin:** Phase 2 brief MB-T10 (Tier 4 = spawnedSessions). Phase 1 diagnose at `/tmp/mb-t10-diagnose.md` surfaced Q-MBT10-{1..7} for HALT 0; operator landed all seven ahead of WB1 RED. WB6 cost-validation surfaced an additional decision point (HALT 2) which operator resolved via Option A 2026-05-06.

**Discovered by:** Session MB-T10 (this batch) Phase 1 reading + Phase 2 implementation. Builds on COARCH-T04 context-builder + sess-mbt09 IPC envelope conventions.

**Resolution status:** SHIPPED on `sess-mbt10/spawned-session-context-tier4`. Ladder commits:

- WB1 `55ee8cf` — contract: schema additions (PendingIntentSchema + SessionContextSnapshotSchema + Tier4PayloadSchema under §11)
- WB2 `4dec4d0` — red: daemon RED probes P1–P9 for `GET /v3/sessions/:name/context-snapshot`
- WB3 `982e914` — green: daemon endpoint `GET /v3/sessions/:name/context-snapshot` registered + probes flip GREEN
- WB4 `d310a78` — red: workstation Tier 4 RED probes P10–P14 (tier4-builder + context-builder integration)
- WB5 `c19a009` — green: tier4-builder.ts + context-builder.ts integration + tier renumber (Tier 4=spawnedSessions, 5=chat history, 6=triggering event)
- WB6 `6245245` — refactor: cost-validation acceptance probe P15+P16 + ceiling reconcile (HALT 2 closed via Option A)
- WB7 (this commit) — docs: finding entry + cross-session coordination

### Surface change (KNOWN — direct file diff `5d93d9b..HEAD`)

| | Before (HEAD `5d93d9b`) | After (HEAD post-WB7) |
|---|---|---|
| `dispatch-core/src/v3/schema.ts` | through §10 (envelope variants) | + §11: `PendingIntentSchema`, `SessionContextSnapshotSchema`, `Tier4PayloadSchema` (all `.strict()`) |
| `dispatch-daemon/src/lifecycle/startup.ts` | did not register v3 context-snapshot route | registers `GET /v3/sessions/:name/context-snapshot` route |
| `dispatch-daemon/src/routes/v3/context-snapshot.ts` | did not exist | new route handler (173 lines): file-stat for HANDOFF tail freshness (Q-MBT10-6=a slice + 60s mtime gate), whole-line console-tail accumulation (Q-MBT10-5=a), pending_intents `[]` + timestamps null in v3.0, 404 on unknown-session |
| `dispatch-daemon/test/integration/v3-context-snapshot/` | did not exist | 9 probe files (P1–P9, ~880 lines) |
| `dispatch-workstation/src/coarchitect/context-builder.ts` | 5-tier pipeline (system/build doc/daemon state/chat history/triggering event) | 6-tier pipeline; new Tier 4 = spawnedSessions; chat history → Tier 5; triggering event → Tier 6 |
| `dispatch-workstation/src/coarchitect/tier4-builder.ts` | did not exist | new pure helper (69 lines): `assembleTier4Payload({sessionNames, fetchSnapshot}) → Promise<Tier4Payload>` with per-session try/catch stub injection (Q-MBT10-7=a) |
| `dispatch-workstation/src/main/coarchitect-ipc.ts` | `buildContext({...})` call site (line 133) | + `spawnedSessions: null` + inline followup pointer `MB-F-T10-COARCHITECT-IPC-WIRE-TIER4` |
| `dispatch-workstation/test/unit/coarch-t04/context-builder.spec.ts` | 6 buildContext calls (5 fields) | 6 calls updated to pass `spawnedSessions: null` |
| `dispatch-workstation/test/unit/coarchitect-context-tier4/` | did not exist | 5 probe files (P10–P14, ~360 lines) |
| `dispatch-workstation/test/integration/coarchitect-tier4-cost/` | did not exist | 1 probe file (P15+P16, 126 lines) |
| `dispatch-workstation/spikes/MB-T10-COST/` | did not exist | new spike doc capturing HALT 2 finding + decision matrix + Option A resolution |
| `docs/build-docs/CONDUCTOR_V3_RESCOPE.md §3.5 line 136` | "~24KB max" estimate | "~60KB max" reconciled to measured 54.40 KB at schema maxima |

Cumulative diff: 24 files / +1,752 / −6 lines.

### Schema additions (Q-MBT10-1..7 applied at WB1)

```ts
// §11
PendingIntentSchema = z.object({
  intent_id: z.string().uuid(),
  step: z.number().int().min(1),
  total_steps: z.number().int().min(1),
  intent_summary: z.string().min(1),
}).strict();

SessionContextSnapshotSchema = z.object({
  recent_handoff: z.string().nullable(),         // 4KB tail when fresh; null otherwise
  recent_console_tail: z.string().nullable(),    // ≤2KB whole-line accumulation
  pending_intents: z.array(PendingIntentSchema), // [] in v3.0; MB-T11 populates
  last_action_fired_at: z.string().datetime().nullable(), // null in v3.0
  last_operator_typed_at: z.string().datetime().nullable(), // always null in v3.0
}).strict();

Tier4PayloadSchema = z.object({
  sessions_context: z.record(z.string(), SessionContextSnapshotSchema),
}).strict();
```

`assembleTier4Payload` semantics (Q-MBT10-7=a load-bearing): per-session try/catch + stub injection on fetch failure means the failed session is **still keyed** in `sessions_context` with stub fields (`recent_handoff: null`, `recent_console_tail: null`, `pending_intents: []`, timestamps null). The orchestrator sees attempted session names rather than silent omissions.

### Verification (KNOWN — test-execution observations 2026-05-06)

**Daemon (WB3):** 9 probe files at `packages/dispatch-daemon/test/integration/v3-context-snapshot/`:
- P1 (success shape), P2 (404 unknown session), P3 (handoff fresh), P4 (handoff stale → null), P5 (handoff absent → null), P6 (console tail), P7 (pending_intents [] in v3.0), P8 (last_action_fired_at null in v3.0), P9 (last_operator_typed_at null in v3.0).
- WB2 RED → WB3 GREEN: full 9/9 flip.

**Workstation pure-helper + integration (WB5):** 5 probe files at `packages/dispatch-workstation/test/unit/coarchitect-context-tier4/`:
- P10 (per-name fetchSnapshot + name-keyed record), P11 (Tier4PayloadSchema parse at N=1/4/8), P12 (empty sessionNames → empty record + zero fetcher calls), P13 (per-session graceful degradation + Q-MBT10-7=a stub shape), P14 (pipeline ordering: tier3 < tier4 < tier5 + null-omit + empty-record-emit).
- WB4 RED (file-load-failed for P10–P13 + 2/3 fail for P14) → WB5 GREEN: 11/11 PASS.
- COARCH-T04 existing 6 specs: still GREEN post-renumber + post-`spawnedSessions: null` wiring.

**Cost-validation (WB6):** 1 probe file at `packages/dispatch-workstation/test/integration/coarchitect-tier4-cost/`:
- P15 fixture sanity (8 sessions × 4KB handoff + 2KB tail + 3 pending_intents).
- P16 byte-budget assertion (`Buffer.byteLength(JSON.stringify(payload), 'utf8') < 60 * 1024`).
- Initial run at 30KB ceiling FAILED (measured 55,702 bytes / 54.40 KB).
- Post-Option-A reconcile at 60KB ceiling: 1/1 PASS.

**Combined sweep (post-WB6):**
```
pnpm exec vitest run --passWithNoTests \
  test/integration/coarchitect-tier4-cost \
  test/unit/coarchitect-context-tier4 \
  test/unit/coarch-t04
→ 12 files / 38 tests GREEN
```

**5-package typecheck sweep:** clean at WB1, WB3, WB5, WB6 (KNOWN — confirmed each WB).

### Operator-arbitrated decisions Q-MBT10-1 through Q-MBT10-7 + Option A

| ID | Decision | Status |
|---|---|---|
| **Q-MBT10-1** | Tier numbering renumber: Tier 4 = spawnedSessions; chat history → Tier 5; triggering event → Tier 6 (a) | ✅ APPLIED (WB5 context-builder.ts comments + spec) |
| **Q-MBT10-2** | Authority for MB-T10 = `CONDUCTOR_V3_RESCOPE.md §3.5 + §4`; `V3_TICKETS.md` does not yet contain MB-T10 (b) | ✅ APPLIED (cited in WB1 schema header + every WB body) |
| **Q-MBT10-3** | Schema home: `dispatch-core/src/v3/schema.ts` §11 (additive); not a new file | ✅ APPLIED (WB1) |
| **Q-MBT10-4** | All Tier-4 schemas `.strict()` per existing v3 convention (a) | ✅ APPLIED (WB1) |
| **Q-MBT10-5** | `recent_console_tail` = whole-line accumulation, not byte-slice (a) | ✅ APPLIED (WB3 daemon route + documented in schema doc-comment) |
| **Q-MBT10-6** | `recent_handoff` = string-char slice (last 4096 chars) when mtime within 60s (a) | ✅ APPLIED (WB3 daemon route + documented in schema doc-comment) |
| **Q-MBT10-7** | Per-session try/catch with stub injection on fetch failure; failed session keyed in record with null/empty fields (a) | ✅ APPLIED (WB5 tier4-builder.ts + WB1 Tier4Payload doc-comment) |
| **HALT 2 / Option A** | Raise Tier 4 cost-validation ceiling 30KB → 60KB; reconcile rescope §3.5 line 136 to ~60KB max at schema-permitted maxima | ✅ APPLIED (WB6 probe + rescope edit + spike doc resolved) |

### Phase 2 brief HALT compliance ledger

| HALT | Trigger | Surface | Outcome |
|---|---|---|---|
| HALT 0 | Phase 1 diagnose surfaces Q-MBT10-{1..7} | Pre-WB1 | Operator landed all seven 2026-05-06; unblocked WB1 RED |
| HALT 1 | (Phase 2 brief did not gate WB1; sess-mbt10 used α-path: CC drafted schema + operator approved diff post-push) | WB1 close | No halt required (α-path) |
| HALT 2 | WB6 cost-validation gate: P16 fails OR succeeds | WB6 close | P16 FAILED at 30KB ceiling (55,702 bytes measured); decision matrix surfaced; operator picked Option A 2026-05-06; reconcile shipped in same WB6 commit `6245245` |
| HALT 3 | WB7 close: ticket closure | This commit | Closure summary ready for operator merge |
| **Recovery halt R1** | Phase 1 diagnose found a recovery condition (uncommitted `tier4-builder.ts` from pre-timeout WB5 GREEN session) | Pre-WB5 recovery | Recovery prompt instructed Step-1 verify-existing-file path; tier4-builder.ts satisfied P10–P13 expectations on read; no repair needed; proceeded to integration |

### Methodology lessons (Tier-1 findings)

Two Tier-1 methodology findings surfaced during sess-mbt10. Each warrants a separate finding entry on operator merge to `docs/cairn-findings.md`.

**Tier-1 #1 — pre-WB6 cost estimate vs schema-permitted maxima divergence**

`CONDUCTOR_V3_RESCOPE.md §3.5 line 136` quoted *"capped at 8 sessions = ~24KB max"* before WB6 measurement. The 24KB number was a typical-content estimate that did NOT account for the schema's permitted maxima (4KB `recent_handoff` per Q-MBT10-6=a, schema-uncapped `recent_console_tail`, populated `pending_intents`). At schema maxima the measured payload is **54.40 KB at N=8 sessions** — over 2× the original estimate.

**Lesson:** rescope-doc cost estimates that touch a tier capped at schema maxima must back-calculate from the schema's permitted maxima, not from the modeled-typical content distribution. A two-line back-calculation at brief time would have caught this before the cost-validation probe surfaced it. Future cost-validation sections in `CONDUCTOR_V3_RESCOPE.md` should cite the schema field caps + a "≈ N × max-field-bytes" arithmetic alongside the typical estimate.

This finding closed without code change to the schema or builder — operator picked Option A (raise the ceiling to match the schema-maxima reality). Options B (cap fields in schema), C (truncate in builder), and D (defer measurement) remain available if v3.1 wants tighter budgeting.

**Tier-1 #2 — recovery-after-stream-timeout: verify, don't regenerate**

Mid-WB5 GREEN session was interrupted by an API stream timeout AFTER the workstation `tier4-builder.ts` was written but BEFORE commit. Recovery prompt directed an explicit *"verify existing file against probe expectations, repair only if it has gaps, do not regenerate"* path.

The recovered file satisfied P10–P13 expectations on read (probe-10/11/12/13 went GREEN immediately on first run; only probe-14 stayed RED, which was correctly attributed to the pending context-builder integration step rather than a tier4-builder gap). Total recovery cost: one Read tool call + one targeted vitest invocation.

**Lesson:** recovery prompts that surface uncommitted artifacts should default to **verify-existing** rather than **regenerate**, because (a) the artifact represents committed-but-not-pushed thinking from the prior session, and (b) regeneration risks divergence under non-deterministic decoding. Recovery prompts should structure Step-1 as "read the file → enumerate probe expectations → list gaps if any" before any Edit/Write call. The MB-T10 recovery prompt did this correctly and serves as the template.

### Followup decision points (Tier-2 followups)

One Tier-2 followup surfaces from sess-mbt10 for future batches. Each is its own MB-F-* finding when scheduled.

**Tier-2 #1 — MB-F-T10-COARCHITECT-IPC-WIRE-TIER4** (closes WB5 deferred wiring)

`packages/dispatch-workstation/src/main/coarchitect-ipc.ts:137` currently passes `spawnedSessions: null` to `buildContext`. The Tier 4 message is therefore omitted from real orchestrator calls until this followup ships. Wiring requires:

1. A daemon HTTP fan-out helper (workstation main process) that fetches `GET /v3/sessions/:name/context-snapshot` for every registered non-killed session via the existing `dispatch-daemon` HTTP client.
2. A session-name source: `useSessionRegistry` (or equivalent) — workstation needs to know which sessions exist before fanning out.
3. Calling `assembleTier4Payload({sessionNames, fetchSnapshot})` with the helper as `fetchSnapshot`.
4. Replacing the `spawnedSessions: null` literal with the resolved `Tier4Payload | null` (null if registry is empty OR if the registry helper itself fails — distinguish from a successful empty-record case).

Scoping note: this followup pairs naturally with **MB-T11** which lands the orchestrator-side `pending_intents` + `last_action_fired_at` populator. Wiring the daemon fetch ahead of MB-T11 ships an *empty* Tier 4 (all null/empty fields) — usable but not differentiated from the `null` skip case for orchestrator behavior. Recommend scheduling **after** MB-T11 so the wiring lands with real per-session context to surface, OR scheduling now with an inline note that v3.0-pre-MB-T11 Tier 4 is structurally-correct-but-content-empty.

The `// MB-F-T10-COARCHITECT-IPC-WIRE-TIER4` inline pointer at the call site is the discoverability hook.

### Cross-session coordination ledger

| Session | Branch | Territory | Overlap with sess-mbt10 |
|---|---|---|---|
| sess-mbt09 | `sess-mbt09/session-prompt-injection-ipc` | Workstation IPC channel + envelope serializer + preload bridge for MB-T07 send-prompt | **None.** Verified at every WB body. Merged to main at `7a9e564` 2026-05-06; sess-mbt10 cut from `5d93d9b` (pre-merge); the post-merge integration step is operator-driven and outside sess-mbt10's WB ladder. |
| sess-i | `sess-i/plan-cost-endpoints` | Daemon `/v2/sessions{,/:name}` PlanInfo + CostInfo extensions | **None.** sess-i merged to main at `5d93d9b` (sess-mbt10's branch-cut). The daemon route hierarchy is unrelated (`/v2/` vs `/v3/`). |
| (future) sess-mbt11 | (TBD) | Orchestrator action tools + autopilot loop | **Forward dependency.** MB-T11 populates `pending_intents` + `last_action_fired_at` on the schema sess-mbt10 shipped. The followup `MB-F-T10-COARCHITECT-IPC-WIRE-TIER4` is best scheduled in coordination with MB-T11. |

### Authority chain

| Layer | Source |
|---|---|
| Scope (what to build) | `CONDUCTOR_V3_RESCOPE.md §3.5` (Tier 4 schema) + `§4 lines 195-201` (MB-T10 ticket text) |
| Schema additions | `dispatch-core/src/v3/schema.ts §11` (operator-arbitrated 2026-05-06 per Q-MBT10-{1..7}) |
| Daemon endpoint contract | `dispatch-core/src/v3/schema.ts SessionContextSnapshotSchema` consumed by `dispatch-daemon/src/routes/v3/context-snapshot.ts` |
| Workstation context-builder | `WORKSTATION_CONTRACT.md §4.3` (tier-injection convention) + `system-prompt.md` runtime injection (frozen at `e6e83f9`) |
| Cost ceiling | `CONDUCTOR_V3_RESCOPE.md §3.5 line 136` (operator-revised 2026-05-06 to 60KB per Option A) + `packages/dispatch-workstation/spikes/MB-T10-COST/README.md` |
| Self-check format | `CONDUCTOR_API_CONTRACT.md §10.5` Q1–Q9 grammar |

### HALT 3 closing summary

**MB-T10 ticket scope (per `CONDUCTOR_V3_RESCOPE.md §4 lines 195-201`):**

> Extend COARCH-T04 context builder with Tier 4 (`spawnedSessions` per §3.5). New daemon endpoint `GET /v3/sessions/:name/context-snapshot`. Workstation context-builder loops registered sessions, fetches snapshots, assembles Tier 4 payload. Threaded into orchestrator chat context per existing COARCH-T04 pattern.

**Acceptance criteria from rescope §4 line 201:**

| Criterion | Status |
|---|---|
| Unit tests for context-builder Tier 4 assembly | ✅ P10–P14 GREEN (5 files / 11 tests) |
| Daemon endpoint contract tests | ✅ P1–P9 GREEN (9 files) |
| Cost-validation: 8 sessions with realistic HANDOFF + console → measured input token count per chat turn → assert under [60KB] total | ✅ P15+P16 GREEN at the operator-revised 60KB ceiling (54.40 KB measured, 5.6 KB headroom). The original "30KB" assertion ceiling came from the rescope's pre-measurement 24KB estimate; reconciled to 60KB per HALT 2 Option A. |

**Out-of-scope deferrals (per rescope §4 line 199):**

- `pending_intents` orchestrator-side state population → MB-T11 (schema field is `[]` at v3.0 ship)
- `last_operator_typed_at` operator-typed timestamp tracking → deferred to followup; v3.0 always returns `null`

**Followups filed:**

- MB-F-T10-COARCHITECT-IPC-WIRE-TIER4 (Tier-2; pairs with MB-T11)

**Branch state at WB7 close:**

```
HEAD = (this commit)
git log 5d93d9b..HEAD --oneline:
  WB7 docs(MB-T10): finding entry + Tier-1/Tier-2 followups
  6245245 refactor(MB-T10): WB6 — Tier 4 cost-validation acceptance probe + ceiling reconcile (HALT 2 closed via Option A)
  c19a009 green(MB-T10): WB5 — workstation Tier 4 GREEN: tier4-builder + context-builder integration + renumber
  d310a78 red(MB-T10): WB4 — workstation Tier 4 RED probes P10–P14
  982e914 green(MB-T10): WB3 — daemon /v3/sessions/:name/context-snapshot endpoint
  4dec4d0 red(MB-T10): WB2 — daemon RED probes P1–P9 for /v3/sessions/:name/context-snapshot
  55ee8cf contract(MB-T10): WB1 — schema additions for spawned-session context snapshot (Tier 4)
```

**Ready-for-merge declaration:**

- 5-package typecheck clean at every WB (KNOWN).
- All MB-T10 unit + integration probes GREEN at HEAD (KNOWN).
- coarch-t04 existing context-builder spec GREEN post-renumber + post-`spawnedSessions: null` wiring (KNOWN).
- No territory overlap with sess-mbt09 (KNOWN — verified at every WB body and confirmed at WB7).
- Spike doc `spikes/MB-T10-COST/README.md` marked RESOLVED (KNOWN).
- One Tier-2 followup filed (MB-F-T10-COARCHITECT-IPC-WIRE-TIER4); operator scheduling at MB-T11 boundary (MODELED — recommendation; non-binding).

---

## End of session findings (sess-mbt10 closed)

HALT 3 per Phase 2 brief: full sess-mbt10 closure summary + acceptance criteria + ready-for-merge declaration on commit-push of WB7 (this commit).
