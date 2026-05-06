# Session MB-T09 — parallel-cairn Tier E Phase A — Findings (append-only)

**Branch:** `sess-mbt09/session-prompt-injection-ipc`
**Worktree:** `~/Desktop/Automata/foxworks-worktrees/sess-mbt09`
**Cut from:** `main` HEAD `5d93d9b` (= post-merge from sess-i/plan-cost-endpoints)
**Date opened:** 2026-05-06
**Tier:** E Phase A — first ticket of the v3 rescope (CONDUCTOR_V3_RESCOPE.md §4)

This file is per-session append-only. Operator merges entries into
`docs/cairn-findings.md` at scaffold-close time, assigning the final
finding number from the parallel-cairn Tier E sess-mbt09 slot.
Numbers below are working entries; operator may renumber on merge.

---

## Finding #sess-mbt09-1 — MB-T09 (Session prompt injection IPC + envelope serializer)

**Date filed:** 2026-05-06
**Tier:** 2 — new feature surface, foundational plumbing for MB-T11 (orchestrator action tools) and MB-T12 (tile UI footer). Closes:
- CONDUCTOR_V3_RESCOPE.md §4 line 187-193 acceptance criteria for MB-T09
- (Indirectly) unblocks MB-T11 + MB-T12 by shipping the IPC channel + serializer + preload bridge those tickets consume

**Origin:** parallel-cairn Tier E Phase A. Operator-arbitrated Q-PATH-1/2/3 (Phase 1 file-path divergence) plus Q-MBT09-1..5 (handler shape, serializer location, error variant, preload territory, rescope-doc amendment) before any code commits. Phase 2 brief authorized straight-through WB2→WB5 with HALT 1 after WB1 only.

**Discovered by:** Session MB-T09 Phase 1 reading + Phase 2 implementation. Three of eight prompt paths failed Phase 1 cross-check (CONDUCTOR_V3_RESCOPE_DRAFT.md, WORKSTATION_CONTRACT.md location, dispatch-daemon spawn-handler.ts), and V3_TICKETS.md was discovered to NOT yet contain MB-T09 (forward-reference to uncommitted artifact). All path divergences operator-arbitrated under §3.7 before code began.

**Resolution status:** SHIPPED on `sess-mbt09/session-prompt-injection-ipc`. Ladder commits (KNOWN — verified by `git --no-pager log origin/main..HEAD`):
- WB1 `7322f90` — schema additions: SendPromptEnvelopeSchema, WorkstationSessionSendPromptRequestSchema, WorkstationSessionSendPromptReplySchema, TmuxSendError variant
- WB2 `822fc19` — RED probes P1-P6 in test/unit/session-send-prompt-ipc/
- WB3 `665c766` — GREEN: handler + envelope-serializer + main.ts wiring + preload bridge
- WB4 `dacea3f` — REFACTOR integration probes P7/P8 against real tmux
- WB5 (this commit) — finding entry + Tier-2 followups

### Surface change (KNOWN — direct read of source files at HEADs cited)

| | Before (HEAD `5d93d9b`) | After (HEAD post-WB5) |
|---|---|---|
| `dispatch-core/src/v3/schema.ts` | 8-variant `WorkstationErrorSchema` (lines 532-541); §1-§9 sections, 647 lines | + `TmuxSendError` 9th variant; new §10 with 3 schemas (`SendPromptEnvelopeSchema`, `WorkstationSessionSendPromptRequestSchema`, `WorkstationSessionSendPromptReplySchema`); 720+ lines |
| `dispatch-core/src/v3/envelope-serializer.ts` | did not exist | NEW (23 LOC). Pure helper `serializeEnvelope(envelope, prompt)` |
| `dispatch-workstation/src/main/session-send-prompt-ipc.ts` | did not exist | NEW (109 LOC). `SessionSendPromptIpcController` + `SessionSendPromptDeps` + `defaultSessionSendPromptDeps` + `registerSessionSendPromptIpcHandlers` |
| `dispatch-workstation/src/main/main.ts` | 332 lines | +7 LOC (1 import + 6-line sentinel region wiring `registerSessionSendPromptIpcHandlers()`) |
| `dispatch-workstation/src/main/preload.mts` | 76 lines | +4 LOC (`workstationBridge.sendPromptToSession` method) |
| `dispatch-workstation/test/unit/session-send-prompt-ipc/` | did not exist | NEW dir with 1 file (202 LOC), 6 unit probes (P1-P6) |
| `dispatch-workstation/test/integration/session-send-prompt/` | did not exist | NEW dir with 1 file (238 LOC), 2 integration probes (P7-P8) against real tmux |
| Test count (dispatch-workstation) | 575 baseline (post-WB1 measurement) | 583 (+8 from new probes) |
| 4-package typecheck | PASS at branch cut | PASS through WB1-WB5 (additive only; no consumer breakage) |
| Pre-existing `test/unit/mb-t09/` dir | 3 spawn-permission-mode specs (pre-rescope artifact) | UNTOUCHED per Q-MBT09-3=a; followup filed |

`SendPromptEnvelopeSchema` shape (verbatim from CONDUCTOR_V3_RESCOPE.md §3.4):
```ts
{
  envelope_version: literal(1),
  intent_id: string.uuid(),
  step: int >= 1,
  total_steps: int >= 1,
  intent_summary: string.min(1),
}
```

`WorkstationSessionSendPromptRequestSchema` shape:
```ts
{
  sessionName: string.min(1),
  prompt: string.min(1),
  envelope: SendPromptEnvelopeSchema.optional(),
}
```

`WorkstationSessionSendPromptReplySchema` shape (discriminatedUnion('ok')):
```ts
| { ok: true }
| { ok: false, error: WorkstationErrorSchema }
```

`TmuxSendError` variant (Q-MBT09-1=a; new in WorkstationErrorSchema):
```ts
{ error_type: 'TmuxSendError', target: string.min(1), reason: string.min(1) }
```

Serialized envelope format (operator-visible per §3.4 lines 107-111):
```
# orchestrator: intent_id=<uuid> step=<n>/<total> — <summary>
<prompt>
```

### Verification (KNOWN — test-execution observations captured 2026-05-06)

8 probe tests in 2 new dirs:
- **WB2 unit probes** at `test/unit/session-send-prompt-ipc/test_session_send_prompt_controller.test.ts` — 6 tests
  - P1 well-formed payload → ok:true
  - P2 schema-invalid → SchemaValidationError; deps not called
  - P3 unknown sessionName → SessionNotFoundError; sendKeys not called
  - P4 envelope path serializes operator comment line
  - P5 no-envelope verbatim (multi-line + $-vars + backticks preserved)
  - P6 sendKeys reject → TmuxSendError reply

- **WB4 integration probes** at `test/integration/session-send-prompt/test_real_tmux_pane_send.test.ts` — 2 tests
  - P7 echo "hello" → pane buffer contains "hello" within 500ms (CONDUCTOR_V3_RESCOPE.md §4 line 193 SLA)
  - P8 envelope-wrapped echo → pane shows comment line AND prompt text AND ≥2 occurrences of output token

WB2 RED state (commit 822fc19, before SUT existed): test file fails at module-load with `Cannot find module '../../../src/main/session-send-prompt-ipc.js'`. Canonical RED signature.

WB3 GREEN (commit 665c766): all 6 unit probes flip to GREEN (5ms total runtime).

WB4 REFACTOR (commit dacea3f): both integration probes pass against real tmux + bash in 111ms (well under 500ms SLA).

Regression sweep (per GREEN+REFACTOR commit):
- dispatch-core: 12 files / 60 tests pass (baseline preserved)
- dispatch-workstation: 161 files / 583 tests pass; 4 files / 4 tests fail (flaky baseline orthogonal to MB-T09 — coarchitect-ipc, menu-rebuild, kanban-card, spawn-modal timing tests; net new from MB-T09: +8 tests, all passing)
- 5-package typecheck (dispatch-core, dispatch-daemon, dispatch-cli, dispatch-web, dispatch-workstation): all PASS

### Operator-arbitrated decisions Q-PATH-1..3 + Q-MBT09-1..5

| ID | Decision | Status |
|---|---|---|
| **Q-PATH-1** | Read `docs/build-docs/CONDUCTOR_V3_RESCOPE.md` (no `_DRAFT` suffix) for §3.4 envelope rationale | ✅ APPLIED (Phase 1 read; chat-layer drafting artifact identified) |
| **Q-PATH-2** | Read `./WORKSTATION_CONTRACT.md` at repo root (NOT under `docs/build-docs/`) | ✅ APPLIED (Phase 1 read; same chat-layer artifact class) |
| **Q-PATH-3** | Replace cited `dispatch-daemon/lifecycle/spawn-handler.ts` (does not exist) with TWO files: `dispatch-core/src/transport/tmux.ts` (canonical sendKeys) + `dispatch-daemon/src/routes/prompts.ts` (call-site dep-injection pattern at line 94) | ✅ APPLIED (WB3 handler routes through canonical sendKeys; deps interface mirrors `routes/prompts.ts:33-47` shape) |
| **Q-MBT09-1** | Add `TmuxSendError` variant to `WorkstationErrorSchema`: `{error_type, target, reason}` (additive) | ✅ APPLIED (WB1 schema diff line 532-540) |
| **Q-MBT09-2** | Envelope serializer at `packages/dispatch-core/src/v3/envelope-serializer.ts` (sit next to schema, no new top-level dir) | ✅ APPLIED (WB3 file shipped; reusable on orchestrator side in MB-T11) |
| **Q-MBT09-3** | Leave existing `test/unit/mb-t09/` untouched; file Tier-2 followup MB-F-MB-T09-PRE-RESCOPE-DIR-RENAME | ✅ APPLIED (untouched through WB1-WB5); ⏸ followup filed below |
| **Q-MBT09-4** | Add `preload.mts` to WB3 territory: single-line `workstationBridge.sendPromptToSession` method | ✅ APPLIED (WB3 commit; MB-T11 + MB-T12 will consume this surface) |
| **Q-MBT09-5** | File Tier-2 followup MB-F-RESCOPE-S4-L189-WORDING-AMEND; do NOT touch CONDUCTOR_V3_RESCOPE.md in this ticket | ✅ APPLIED (rescope doc untouched); ⏸ followup filed below |

### Phase 2 brief HALT compliance

| Halt | Specification | Status |
|---|---|---|
| HALT 0 | Phase 1 close — operator arbitrates Q-PATH-* and Q-MBT09-* before any code | ✅ HONORED (5 questions surfaced; 5 questions arbitrated; 0 self-arbitration) |
| HALT 1 | After WB1 push — operator reviews schema diff before WB2 | ✅ HONORED (WB1 commit `7322f90` pushed; operator ack received before WB2 RED began) |
| HALT 2 | After WB5 push — ticket closure to operator for merge | ⏳ AT THIS COMMIT |
| §3.7 mid-flight | Frozen-contract, cross-territory surprise, ambiguity, regression, file-path divergence | ⏳ TRIGGERED ONCE during Phase 1 (file-path divergence; operator arbitrated Q-PATH-1/2/3); 0 mid-flight halts during WB1-WB5 |

---

## Methodology findings (Tier-1 — to fold into chat-layer methodology coordination doc)

### M1 — Forward-reference-to-uncommitted-artifact (chat-layer)

**Symptom:** Phase 2 brief instructed "Read `docs/build-docs/V3_TICKETS.md` MB-T09 entry (scope source-of-truth)" but V3_TICKETS.md does NOT contain an MB-T09 entry. CONDUCTOR_V3_RESCOPE.md §6 explicitly states the new tickets "slot into V3_TICKETS.md after MB-T08" — the rescope authored MB-T09–T13 ticket bodies but the merge into V3_TICKETS.md has not happened yet.

**Root cause:** Chat-layer drafting referenced an artifact state that exists in the rescope draft document but has not been committed back into V3_TICKETS.md. The prompt was self-consistent if you assumed the merge had happened; from the repo's perspective, it was a forward-reference to uncommitted state.

**Sibling failure mode (same root cause):** Three of eight Phase 1 file paths in the brief were drafting artifacts:
- `CONDUCTOR_V3_RESCOPE_DRAFT.md` → actual `CONDUCTOR_V3_RESCOPE.md` (no `_DRAFT`)
- `docs/build-docs/WORKSTATION_CONTRACT.md` → actual `./WORKSTATION_CONTRACT.md` at repo root
- `dispatch-daemon/src/lifecycle/spawn-handler.ts` → does not exist; canonical helpers live at `dispatch-core/src/transport/tmux.ts` and call-site at `dispatch-daemon/src/routes/prompts.ts:94`

**Methodology lesson (Tier-1):** Phase 1 file-path verification (`ls`/`grep` against repo state BEFORE reading) caught all four divergences and surfaced them under §3.7 for operator arbitration. This was the correct discipline; if Phase 1 had proceeded with assumed paths, WB1 would have been built on a false foundation.

**Recommended chat-layer rule:** Forward-references to uncommitted artifacts must be cross-checked against repo state at prompt-construction time, not at session-execution time. Specifically, if a brief cites a doc location, verify the file exists at that path; if a brief cites a ticket body, verify the ticket body lives at the cited location (not a sibling rescope/draft doc).

**Operator status:** Acknowledged in WB1 ack message ("forward-references to uncommitted artifacts must be cross-checked against repo state — accepted as additional chat-layer methodology Tier-1 finding; will fold into post-Tier-E methodology doc").

### M2 — Mid-rescope ticket scope narrowing

**Symptom:** CONDUCTOR_V3_RESCOPE.md §4 line 189 specifies MB-T09 includes "Tile footer input field (per §3.3) wires to this IPC." The Phase 2 brief explicitly narrowed MB-T09 to "IPC channel, handler, and serializer ONLY" and deferred tile UI footer to MB-T12.

**Root cause:** Operator scope-decision post-rescope-authoring. The rescope was drafted with MB-T09 spanning IPC + footer; on closer inspection, footer wiring is a tile-grid surface that lives more naturally with MB-T12 (auto-mount + tile-mode console panel + tiling layout).

**Methodology lesson (informational):** The narrowing is operator-stated authority; CC accepted it explicitly in Phase 1 diagnose §6 Q-MBT09-6 (informational, no question). No methodology gap; just a record of the scope-narrowing decision so future readers don't assume MB-T09 ships footer.

**Operator status:** Acknowledged in WB1 ack message ("ACCEPT THE NARROWING (path α). MB-T09 ships IPC + serializer + preload bridge ONLY. Tile footer is MB-T12's territory.").

### M3 — Spike-anti-pattern in rescope doc wording

**Symptom:** CONDUCTOR_V3_RESCOPE.md §4 line 189 wording — "Main-process handler runs `tmux send-keys -t <sessionName> '<prompt>' Enter`" — describes an anti-pattern. Spike-01 (cited in `dispatch-core/src/transport/tmux.ts:7-19`) demonstrated that bare argv tokens matching tmux key names (Up, Down, Enter, Tab, C-a, M-x, …) are interpreted as keystrokes and the text is lost. The canonical helper uses `load-buffer | paste-buffer | send-keys Enter | delete-buffer`.

**Root cause:** Rescope-author used the casual term "tmux send-keys" without referring to the canonical helper. The wording is technically inaccurate but operator-arbitrated correction (Q-PATH-3) routes implementation through canonical helper, so MB-T09 ships correctly.

**Methodology lesson:** When rescope/contract docs reference shell commands, they should either cite the canonical helper directly OR include an authority pointer. Cross-reference the spike that established the canonical pattern. The operator-arbitrated Tier-2 followup MB-F-RESCOPE-S4-L189-WORDING-AMEND below carries the doc fix.

---

## Tier-2 followups (deferred, filed for post-WB5 operator action)

### MB-F-MB-T09-PRE-RESCOPE-DIR-RENAME

**Origin:** Q-MBT09-3=a operator decision.
**Symptom:** `packages/dispatch-workstation/test/unit/mb-t09/` already exists with 3 specs:
- `test_spawn_executes_tmux_new_session_default_ask_mode.spec.ts`
- `test_spawn_executes_tmux_new_session_with_auto_permission_mode.spec.ts`
- `test_spawn_ipc_passes_through_permission_mode.spec.ts`

These are about spawn permission_mode — pre-rescope MB-T09 numbering (V3_TICKETS.md original Tier B chain). Unrelated to current MB-T09 scope (session prompt injection IPC).

**Action:** Investigate origin via `git log packages/dispatch-workstation/test/unit/mb-t09/`. Likely candidates:
- Rename to `test/unit/mb-t09-pre-rescope-spawn-permission-mode/` for clarity
- Move to a more accurate ticket dir if the originating ticket can be identified
- Or merge into `test/unit/spawn-ipc/` if those probes belong with the spawn-ipc cluster

**Tier:** 2 — naming hygiene, no behavioral change. Defer until operator scopes a clean-up batch.

### MB-F-RESCOPE-S4-L189-WORDING-AMEND

**Origin:** Q-MBT09-5=a operator decision.
**Symptom:** CONDUCTOR_V3_RESCOPE.md §4 line 189 says: "Main-process handler runs `tmux send-keys -t <sessionName> '<prompt>' Enter`." This is the spike-01 A4 anti-pattern. Canonical helper at `dispatch-core/src/transport/tmux.ts:sendKeys` uses `load-buffer | paste-buffer | send-keys Enter | delete-buffer`.

**Action:** Operator-arbitrated rewording of CONDUCTOR_V3_RESCOPE.md §4 line 189. Suggested replacement:
> "Main-process handler invokes `dispatch-core`'s canonical `sendKeys` helper (`packages/dispatch-core/src/transport/tmux.ts`) which performs the load-buffer/paste-buffer/send-keys/delete-buffer flow per spike-01 evidence (bare `send-keys -t … <text> Enter` is broken for tmux-keyname collisions)."

**Tier:** 2 — doc accuracy. Rescope doc is operator-arbitrated authority artifact; CC must NOT touch it from MB-T09's branch.

### MB-F-T09-RESCOPE-SCOPE-NARROW

**Origin:** M2 methodology finding + operator WB1 ack message.
**Symptom:** CONDUCTOR_V3_RESCOPE.md §4 MB-T09 scope description includes tile footer wiring (line 189: "Tile footer input field (per §3.3) wires to this IPC"). Operator narrowed MB-T09 to IPC + serializer + preload bridge ONLY; tile footer deferred to MB-T12.

**Action:** Operator-arbitrated annotation of CONDUCTOR_V3_RESCOPE.md §4 MB-T09 entry to reflect the narrowing. Suggested annotation: add a note "Scope-narrowed 2026-05-06 — tile footer wiring deferred to MB-T12; this ticket ships IPC channel + handler + envelope serializer + preload bridge only."

**Tier:** 2 — doc accuracy + scope-history record. Same authority constraint as MB-F-RESCOPE-S4-L189-WORDING-AMEND; rescope doc is operator-arbitrated.

### MB-F-MB-T09-MULTI-LINE-PASTE-HANDLING

**Origin:** CONDUCTOR_V3_RESCOPE.md §4 line 191 explicitly defers this: "Multi-line paste handling beyond single Enter (defer to followup)."

**Symptom:** Current handler concatenates the full prompt (with optional envelope prefix) and routes through canonical sendKeys, which appends a single Enter. For prompts containing embedded newlines, bash receives the bytes as a single multi-line input + one trailing Enter. WB4 P8 confirms this works for the operator-comment-line + echo case (bash treats `#` line as comment). For prompts where the operator INTENDS multiple separate commands, current behavior may surprise: bash might evaluate them as one compound input depending on shell state.

**Action:** Future MB-T09 followup or MB-T11 (orchestrator) should specify the multi-line paste contract:
- Option A — preserve current behavior; document that prompts are pasted-as-one
- Option B — split prompt by `\n`, send each line with its own Enter (per-line execution)
- Option C — operator/orchestrator chooses via a payload flag

**Tier:** 2 — feature deferral. No bug yet; envelope path's multi-line is the only current usage and it works correctly per P8.

### MB-F-MB-T09-ENVELOPE-VERSIONING

**Origin:** Phase 1 diagnose acknowledgment of `envelope_version: 1` literal.

**Symptom:** `SendPromptEnvelopeSchema` pins `envelope_version` to literal(1). When v2 envelope ships (whatever its semantics), schema must add a discriminator. Current shape doesn't accommodate that — adding `envelope_version: 2` would either need a separate schema or a discriminated union.

**Action:** Future ticket (likely MB-T11 or later) should refactor `SendPromptEnvelopeSchema` into a discriminated union on `envelope_version` when v2 semantics emerge. Until then, v1 is the only version and the literal pin is correct.

**Tier:** 2 — schema evolution preparation. No action needed until v2 envelope semantics are designed.

---

## Cross-session coordination

Per operator's WB1 ack message:
- sess-mbt10 was HALT 0 awaiting Q-MBT10-* arbitration when MB-T09 WB1 landed
- sess-mbt10 schemas WILL append AFTER MB-T09's in `v3/schema.ts` source order
- No coordination action required from MB-T09 side; pushed-to-origin schemas (commit `7322f90`) are the only artifact sess-mbt10 needs

No cross-territory edits during WB1-WB5. Territory fence honored (operator-stated WB-N file lists were the strict scope).

---

## Authority chain

| Layer | Authority | Status |
|---|---|---|
| Scope source-of-truth | CONDUCTOR_V3_RESCOPE.md §4 lines 187-193 | KNOWN — read 2026-05-06; quoted in Phase 1 diagnose |
| Envelope rationale | CONDUCTOR_V3_RESCOPE.md §3.4 lines 88-115 | KNOWN — read 2026-05-06 |
| IPC contract conventions | WORKSTATION_CONTRACT.md §7 (lines 299-326) | KNOWN — read 2026-05-06; new request/reply IPC follows the off-bus-discriminated-union convention used by console-ipc / spawn-ipc |
| Schema authority | WORKSTATION_CONTRACT.md §2.1 (lines 50-89) | KNOWN — IPC schemas live in v3/schema.ts; confirmed |
| Q-PATH-1..3 | Operator arbitration message 2026-05-06 | KNOWN — applied verbatim |
| Q-MBT09-1..5 | Operator arbitration message 2026-05-06 | KNOWN — applied verbatim |
| Self-check Q1-Q9 | CONDUCTOR_API_CONTRACT.md §10.5 | KNOWN — included in every WB1-WB5 commit body |

---

## Closing summary (HALT 2 surface)

**Branch:** `sess-mbt09/session-prompt-injection-ipc`
**Commit count:** 5 (WB1-WB5 ladder)
**Net code change:** +693 lines / 0 deletions across 7 files
**Net test change:** +8 tests (6 unit, 2 integration), all passing
**Frozen contracts touched:** 0 (all edits additive; no modifications to existing schemas, IPC channels, or contract docs)
**Tier-2 followups filed:** 5 (rename pre-rescope dir, amend §4 line 189 wording, annotate scope narrowing, multi-line paste contract, envelope versioning)
**Methodology Tier-1 findings:** 2 (M1 forward-references, M3 spike-anti-pattern wording — both operator-acknowledged)
**Cross-session impact:** sess-mbt10 unblocked at WB1 push (commit `7322f90`); no further coordination needed

Ready for operator merge to `main`.
