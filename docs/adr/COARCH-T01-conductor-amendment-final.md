# COARCH-T01 — `CONDUCTOR_API_CONTRACT.md` final amendment draft

**Status:** PROPOSAL (operator-only). Final draft of the
`CONDUCTOR_API_CONTRACT.md` amendment, refined after Phase B
implementation in COARCH-T01. Per `CONDUCTOR_API_CONTRACT.md` §10.2 + §3.4
+ §12, neither this ticket nor a future one may modify the frozen
contract directly. Operator commits the amendment as a `contract:`
change with version bump.

**Date:** 2026-04-30

**Companion:** `docs/adr/MB-S03-conductor-amendment-proposal.md` carries
the original spike-time proposal text. This document supersedes it as
the post-implementation final draft. Material amendment text is identical
to the MB-S03 proposal; this document adds implementation-evidence
citations and confirms no scope drift between proposal and
implementation.

---

## §1 — Why this final draft exists

The MB-S03 proposal (2026-04-29) was authored before the production
`/v3/*` routes, the SQLite migration runner, or the auth/error-handler
must-fix patches existed in the codebase. COARCH-T01 (2026-04-30) landed
all of those. The amendment text itself does not need to change — but
several claims in the proposal that were MODELED ("daemon WILL host
`/v3/*`", "auth gate WILL extend to `/v3/*`", etc.) are now KNOWN with
specific commit citations. Promoting the proposal to a final draft that
the operator authors against the current code state closes finding #55's
loop (frozen-contracts must be verified against code state at freeze
time).

The MB-S03 proposal also surfaced three "verification before commit"
items in its §5 (cross-reference non-conflict, §4.6 framing match,
version-bump semver intent). All three are unchanged in this final
draft; none required arbitration during Phase B.

---

## §2 — Implementation evidence (Phase B grounding for each amendment claim)

Each amendment claim in the §3 text below maps to at least one Phase B
commit. KNOWN labels are operator-verifiable by reading the cited commit
or running the cited test.

| Amendment claim | Phase B evidence | Confidence |
|---|---|---|
| Daemon hosts `/v3/*` endpoints | `8f68572`, `981a5aa`, `fa8a65e`, `298d01a` register four endpoint groups (orchestrator-messages, orchestrator-history, orchestrator-audit, tickets-state). All routes pass integration tests; `pnpm vitest run` from `packages/dispatch-daemon` reports 32 test files, 153/153 tests pass. | KNOWN |
| `/v3/*` requires `X-Conductor-Token` header (no `/v2/health`-style exemption) | `8c286cd` patches `auth.ts:88` to add `&& !pathOnly.startsWith('/v3/')` to the static-serve bypass. Verified by `test/integration/auth-v3.test.ts` (3/3 pass: P1 unauthenticated → 401, P2 wrong token → 401, P3 correct token → 200). | KNOWN |
| Unmatched `/v3/*` GETs return JSON 404, not SPA `index.html` | `6ae23ff` patches `error-handler.ts:62` SPA fall-through to also exclude `/v3/*`. Verified by `test/integration/error-handling-v3.test.ts` (3/3 pass: P1 + P2 unmapped paths → 404 JSON, P3 SPA fall-through unchanged for `/`). | KNOWN |
| `/v3/*` registration order: after `/v2/*` HTTP, before `@fastify/static` | Inspect `lifecycle/startup.ts` after `298d01a`: `/v3/*` registrations (lines registering messages → history → audit → tickets-state) sit between `registerViolationsRoutes` (last `/v2/*` HTTP) and `registerWsRoutes` (WS), which is itself before `app.register(fastifyStatic, ...)`. | KNOWN |
| SQLite migration is additive-only; runs on first daemon start where `data.db` is absent | `c56b58a` lands `migrations/0001-orchestrator-tables.sql` + `lifecycle/db.ts` (openDatabase + runMigrations). Verified by `test/unit/migration-orchestrator.test.ts` (4/4 pass: P1 fresh creates 3 tables, P2 idempotent re-run, P3 PK upsert, P4 listing). | KNOWN |
| File-backed `data.db` with WAL stays well under §8.3 < 500ms p50 budget | `c56b58a` commit body cites the operator-machine bench: write p50 = 0.033ms, p95 = 0.049ms; read p50 = 0.088ms, p95 = 0.103ms. Bar 500ms ≈ 5,000-10,000× headroom. Converts ADR §5.1 MODELED → KNOWN. | KNOWN |
| `output_payload` column is nullable in production migration to match the `OrchestratorOutputSchema.nullable()` declaration in the v3 freeze-anchor schema | `fa8a65e` SQL conformance fix surfaced when implementing POST /v3/orchestrator/audit; the spike-time SQL had `NOT NULL` which conflicted with the schema's `.nullable()`. Production migration drops the constraint per WORKSTATION_CONTRACT.md §2.2 (runtime schema is source of truth). | KNOWN |

No claim in the §3 amendment text is MODELED or SPECULATIVE post-Phase B.

---

## §3 — Amendment text (verbatim from MB-S03 proposal §2.1–§2.4)

The four amendment sections below are identical to the MB-S03 proposal.
Operator copies these into `CONDUCTOR_API_CONTRACT.md` as a single
`contract:` commit per the §6 authoring checklist.

### §3.1 New paragraph in §1 (Purpose)

After the existing two paragraphs of §1 in `CONDUCTOR_API_CONTRACT.md`,
append:

> **Coordinated `/v3/*` surface (additive, governed by `WORKSTATION_CONTRACT.md`):** The daemon also serves `/v3/*` endpoints introduced by Conductor Workstation v3.0 per `WORKSTATION_CONTRACT.md` §6. The `/v3/*` shape definitions, persistence model, and authority chain live in that contract; this contract remains authoritative for `/v2/*` and for the daemon's HTTP/auth/error-handler infrastructure (§3, §10) which both surfaces share. Where the two contracts coordinate (auth header, error envelope, route-registration order), this contract's primitives govern.

### §3.2 New §4.6 — Coordinated `/v3/*` surface

Insert a new §4.6 after the existing §4.5 (Events history):

> ### §4.6 Coordinated `/v3/*` surface
>
> Per `WORKSTATION_CONTRACT.md` §1.2 + §6, the daemon hosts a coordinated `/v3/*` endpoint surface for Conductor Workstation. `/v3/*` shape definitions live in `WORKSTATION_CONTRACT.md`; this contract enumerates the cross-cutting expectations:
>
> - **Auth (§3.1).** All `/v3/*` requests require the same `X-Conductor-Token` header as `/v2/*`. There is no `/v3/*` equivalent of the `/v2/health` exemption.
> - **Error envelope (§4 + §10.4).** `/v3/*` error responses share the JSON `{"error": "..."}` shape used by `/v2/*` for HTTP-level errors. `WORKSTATION_CONTRACT.md` §6.5 specifies a richer typed `WorkstationError` discriminated-union body for application-level errors; the two coexist (HTTP-level errors stay as `{"error": "..."}`, application errors carry the typed shape with appropriate status codes).
> - **Route-registration order.** The daemon registers `/v2/*` routes BEFORE `/v3/*` routes, and both BEFORE `@fastify/static`. SPA fall-through must not match `/v3/*` paths (current 404-handler must be amended to gate the same way it gates `/v2/*`).
> - **404 shape.** Unmatched `/v3/*` paths return JSON 404 (`{"error": "Not found"}`), not the SPA fall-through bundle.
> - **WebSocket.** v3.0 ships with no `/v3/*` WS endpoints. The existing `/v2/events/stream` endpoint remains the sole real-time channel; orchestrator IPC for the embedded webview rides the existing v2 WS stream where applicable.
> - **Versioning.** Per §12, this contract bumps to v2.1.0 to reflect the additive `/v3/*` cross-reference. The `/v3/*` surface itself versions independently per `WORKSTATION_CONTRACT.md` §2.3.
>
> This contract does not duplicate `/v3/*` shape definitions. Readers wanting the request/response shapes for `/v3/orchestrator/messages`, `/v3/orchestrator/history`, `/v3/orchestrator/audit`, `/v3/tickets/state`, etc., consult `WORKSTATION_CONTRACT.md` §6 and `packages/dispatch-core/src/v3/schema.ts` (the freeze-anchor schema, operator-arbitrated at commit `232fbaa` under `WORKSTATION_CONTRACT.md` §2).

### §3.3 §10.3 anti-fabrication update

Append a new bullet to §10.3:

> - **`/v3/*` SQLite layer (per `WORKSTATION_CONTRACT.md` §8.1, amended 2026-04-29):** spike against `better-sqlite3` for migration idempotence + WAL pragma + UNIQUE constraints (already validated by `MB-S03` spike harness; production code citations should reference that harness, the `migration-orchestrator.test.ts` unit suite, or re-run the harness against `~/.foxworks-dispatch/data.db`).

### §3.4 §12 — Versioning bump

Replace the current §12 first line:

> This document is **v2.0.0**.

with:

> This document is **v2.1.0**.

And append to the Future versions list:

> - **v2.1.0 (this version):** additive cross-reference to the coordinated `/v3/*` surface introduced by `WORKSTATION_CONTRACT.md`. No `/v2/*` shape changes; no behavior changes for v2-only clients. Per §2 authority section's additive-only post-ship rule, this qualifies as a minor bump.

---

## §4 — What changed from the MB-S03 proposal

Material amendment text: nothing. The §3.1–§3.4 sections above are
character-for-character identical to MB-S03 proposal §2.1–§2.4 modulo
one update to §3.2's freeze-anchor reference (added the `232fbaa`
commit SHA now that operator has authored the v3 schema).

Implementation reality vs MB-S03 proposal claims:

- **Schema authoring**: MB-S03 proposal said "freeze-anchor schema,
  operator-arbitrated under `WORKSTATION_CONTRACT.md` §2"; SHA was
  unknown at proposal time. Now KNOWN: `232fbaa`. §3.2 final updated
  to cite it.
- **SQL conformance**: COARCH-T01 B8 (`fa8a65e`) discovered that the
  spike-time `output_payload TEXT NOT NULL` constraint conflicted with
  the v3 schema's `OrchestratorOutputSchema.nullable()` declaration.
  Production migration drops `NOT NULL`. NOT a contract amendment —
  the schema is authoritative per `WORKSTATION_CONTRACT.md` §2.2 and
  the implementation must conform. Surfaced in §2 evidence row above
  for operator awareness.
- **Auth/error-handler patches**: MB-S03 proposal said COARCH-T01 must
  patch `auth.ts:88` and `error-handler.ts:62`. Both patches landed
  per the §2 evidence rows (8c286cd, 6ae23ff). The §4.6 Route-
  registration-order line in §3.2 now reads as past-tense reality;
  the wording stays prescriptive ("must not match") so future readers
  see the constraint, not the implementation history.

No new amendments to the contract text are introduced by COARCH-T01
beyond what MB-S03 proposed.

---

## §5 — Verification before operator commit

Three items the MB-S03 proposal flagged as "surface-and-ack" remain
relevant:

1. **§3.1 cross-reference does not conflict with `WORKSTATION_CONTRACT.md` §1.2's claim that it does NOT duplicate `/v2/*` definitions.** Verified again post-Phase B: this contract's §4 still enumerates `/v2/*` shapes; `WORKSTATION_CONTRACT.md` §6 enumerates `/v3/*` shapes. No duplication.
2. **§3.2 enumeration of cross-cutting expectations matches operator intent.** Phase B implementation followed the §3.2 list verbatim (auth, error envelope, registration order, 404 shape, WebSocket scope, versioning). No surprises surfaced; the framing held.
3. **Version bump v2.0.0 → v2.1.0 matches operator's semver intent.** Phase B did not introduce any breaking change to `/v2/*`. Minor bump remains correct.

---

## §6 — Authoring checklist for operator

When ready, the `contract:` commit:

1. Edit `CONDUCTOR_API_CONTRACT.md` per §3.1, §3.2, §3.3, §3.4 above.
2. Stage with `git add CONDUCTOR_API_CONTRACT.md` (per-path discipline).
3. Pre-commit territory check: `git status --short`.
4. Commit with `contract:` verb. Suggested commit message:

   > `contract: amend CONDUCTOR_API_CONTRACT.md §1 + §4.6 + §10.3 — coordinated /v3/* surface (v2.0.0 → v2.1.0)`

5. Post-commit verification: `git log -1 --stat`.
6. Update `WORKSTATION_CONTRACT.md` §1's "Relationship to other contracts" line that cites this contract's commit SHA: append the new `contract:` commit SHA to the existing `frozen at 3ddca60, amended at a502c4c and c1bb7fe` list. (This is a documentation amendment to `WORKSTATION_CONTRACT.md` itself; per its §1.3 frozen-status rule, it needs a separate `contract:` commit. Two commits total.)

The 9-question self-check block per `CONDUCTOR_API_CONTRACT.md` §10.5
applies to both `contract:` commits. Suggested answers (carry forward
from MB-S03 proposal §6 unchanged):

1. Is the API I called verified by a spike? → n/a (documentation-only change, no API call).
2. Does my test exercise behavior, or my mocks? → n/a (no test).
3. If implementation deleted, would test still pass? → n/a (no implementation).
4. Did I add anything outside this contract's specification? → no (additive amendment only).
5. Did I modify this contract without operator approval? → no (operator IS the author).
6. Is any claim in my commit body unlabeled? → no (all claims grounded in cross-references; Phase B evidence cited in §2 of this draft).
7. Did this commit touch any file the other parallel session might also modify? → operator best-judgment.
8. Does this commit change session state via direct registry write, bypassing PATCH /v2/sessions/:name/state? → no.
9. Did I do work during a halt state that wasn't explicitly authorized? → no.

---

## §7 — Phase B summary (for the operator's commit body if useful)

COARCH-T01 ticket commits between `232fbaa` (v3 schema freeze) and
`298d01a` (final endpoint group):

| Phase | Commit | Verb | Scope |
|---|---|---|---|
| A1 red | `32a574f` | `red:` | auth-v3 regression test |
| A1 green | `8c286cd` | `green:` | auth.ts:88 patch |
| A2 red | `d38c8b5` | `red:` | error-handling-v3 regression test |
| A2 green | `6ae23ff` | `green:` | error-handler.ts:62 patch |
| B1 red | `3ffdf80` | `red:` | migration runner test |
| B2 green | `c56b58a` | `green:` | migration runner + 0001-orchestrator-tables.sql + startup wiring + file-backed bench |
| B3 red | `8737e3f` | `red:` | POST /v3/orchestrator/messages test |
| B4 green | `981a5aa` | `green:` | POST /v3/orchestrator/messages route |
| B5 red | `714ee8d` | `red:` | GET + DELETE /v3/orchestrator/history test |
| B6 green | `8f68572` | `green:` | GET + DELETE /v3/orchestrator/history routes |
| B7 red | `33a2d55` | `red:` | POST + GET /v3/orchestrator/audit test |
| B8 green | `fa8a65e` | `green:` | POST + GET /v3/orchestrator/audit + SQL nullable conformance |
| B9 red | `7878d78` | `red:` | /v3/tickets/state test |
| B10 green | `298d01a` | `green:` | /v3/tickets/state routes + auth-v3 test refactor |

13 ticket commits + 1 operator-authored contract commit (232fbaa) =
total Phase A+B footprint for COARCH-T01.

---

End of final draft. Spike halts at the proposal boundary per §3.4 +
cairn frozen-contract discipline. Operator authors the actual amendment
to `CONDUCTOR_API_CONTRACT.md` as a separate `contract:` commit per the
§6 checklist above.
