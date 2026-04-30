# MB-S03 — `CONDUCTOR_API_CONTRACT.md` amendment proposal

**Status:** PROPOSAL (operator-only). This document carries the proposed amendment text for `CONDUCTOR_API_CONTRACT.md`. Per `CONDUCTOR_API_CONTRACT.md` §10.2 + §3.4 + §12, neither this spike nor a future ticket may modify the frozen contract directly. Operator commits the amendment as a `contract:` change with version bump.

**Date:** 2026-04-29

**Companion:** `docs/adr/MB-S03-daemon-v3-amendment.md` carries the full validation evidence. This document carries only the amendment text + rationale.

---

## §1 — Why an amendment is needed

`CONDUCTOR_API_CONTRACT.md` is currently authority for `/v2/*` only. `WORKSTATION_CONTRACT.md` §1.2 + §6 introduce `/v3/*` endpoints owned by Workstation. The two contracts are coordinated but not cross-linked: a reader of `CONDUCTOR_API_CONTRACT.md` today sees no mention of `/v3/*` and would reasonably assume the daemon only handles `/v2/*`.

The amendment is small: a cross-reference pointer in §1, a §4.6 entry that states the daemon ALSO routes `/v3/*` (governed by `WORKSTATION_CONTRACT.md`), and a §12 version bump to v2.1.0 (additive — `/v3/*` is purely additive routing).

The amendment does NOT:

- Move any `/v2/*` endpoint shape out of `CONDUCTOR_API_CONTRACT.md` (the v2 surface remains frozen and authoritative here).
- Duplicate `/v3/*` shape definitions in this contract (those live in `WORKSTATION_CONTRACT.md` per §1.2).
- Loosen the §10 cairn-enforcement structure (every primitive applies equally to `/v3/*` route implementation).

---

## §2 — Proposed amendment text

### §2.1 New paragraph in §1 (Purpose)

After the existing two paragraphs of §1, append:

> **Coordinated `/v3/*` surface (additive, governed by `WORKSTATION_CONTRACT.md`):** The daemon also serves `/v3/*` endpoints introduced by Foxworks Workstation v3.0 per `WORKSTATION_CONTRACT.md` §6. The `/v3/*` shape definitions, persistence model, and authority chain live in that contract; this contract remains authoritative for `/v2/*` and for the daemon's HTTP/auth/error-handler infrastructure (§3, §10) which both surfaces share. Where the two contracts coordinate (auth header, error envelope, route-registration order), this contract's primitives govern.

### §2.2 New §4.6 — Coordinated `/v3/*` surface

Insert a new §4.6 after the existing §4.5 (Events history):

> ### §4.6 Coordinated `/v3/*` surface
>
> Per `WORKSTATION_CONTRACT.md` §1.2 + §6, the daemon hosts a coordinated `/v3/*` endpoint surface for Foxworks Workstation. `/v3/*` shape definitions live in `WORKSTATION_CONTRACT.md`; this contract enumerates the cross-cutting expectations:
>
> - **Auth (§3.1).** All `/v3/*` requests require the same `X-Conductor-Token` header as `/v2/*`. There is no `/v3/*` equivalent of the `/v2/health` exemption.
> - **Error envelope (§4 + §10.4).** `/v3/*` error responses share the JSON `{"error": "..."}` shape used by `/v2/*` for HTTP-level errors. `WORKSTATION_CONTRACT.md` §6.5 specifies a richer typed `WorkstationError` discriminated-union body for application-level errors; the two coexist (HTTP-level errors stay as `{"error": "..."}`, application errors carry the typed shape with appropriate status codes).
> - **Route-registration order.** The daemon registers `/v2/*` routes BEFORE `/v3/*` routes, and both BEFORE `@fastify/static`. SPA fall-through must not match `/v3/*` paths (current 404-handler must be amended to gate the same way it gates `/v2/*`).
> - **404 shape.** Unmatched `/v3/*` paths return JSON 404 (`{"error": "Not found"}`), not the SPA fall-through bundle.
> - **WebSocket.** v3.0 ships with no `/v3/*` WS endpoints. The existing `/v2/events/stream` endpoint remains the sole real-time channel; orchestrator IPC for the embedded webview rides the existing v2 WS stream where applicable.
> - **Versioning.** Per §12, this contract bumps to v2.1.0 to reflect the additive `/v3/*` cross-reference. The `/v3/*` surface itself versions independently per `WORKSTATION_CONTRACT.md` §2.3.
>
> This contract does not duplicate `/v3/*` shape definitions. Readers wanting the request/response shapes for `/v3/orchestrator/messages`, `/v3/orchestrator/history`, `/v3/orchestrator/audit`, `/v3/tickets/state`, etc., consult `WORKSTATION_CONTRACT.md` §6 and `packages/dispatch-core/src/v3/schema.ts` (the freeze-anchor schema, operator-arbitrated under `WORKSTATION_CONTRACT.md` §2).

### §2.3 §10.3 anti-fabrication update

Append a new bullet to §10.3:

> - **`/v3/*` SQLite layer (per `WORKSTATION_CONTRACT.md` §8.1, amended 2026-04-29):** spike against `better-sqlite3` for migration idempotence + WAL pragma + UNIQUE constraints (already validated by `MB-S03` spike harness; production code citations should reference that harness or re-run it).

### §2.4 §12 — Versioning bump

Replace the current §12 first line:

> This document is **v2.0.0**.

with:

> This document is **v2.1.0**.

And append to the Future versions list:

> - **v2.1.0 (this version):** additive cross-reference to the coordinated `/v3/*` surface introduced by `WORKSTATION_CONTRACT.md`. No `/v2/*` shape changes; no behavior changes for v2-only clients. Per §2 authority section's additive-only post-ship rule, this qualifies as a minor bump.

---

## §3 — Rationale per amended section

### §3.1 Why §1 needs the cross-reference

A reader landing on `CONDUCTOR_API_CONTRACT.md` today sees an authoritative claim that this is the "single source of truth for the daemon-UI interface" (§1). Once `/v3/*` ships, that claim becomes structurally incomplete without the cross-reference. The amendment scopes this contract to `/v2/*` + cross-cutting concerns, and points readers at `WORKSTATION_CONTRACT.md` for the `/v3/*` surface.

### §3.2 Why §4.6 enumerates cross-cutting expectations

The MB-S03 spike harness surfaced two production-daemon files that need amendment for `/v3/*` to integrate safely (`auth.ts` and `error-handler.ts`). Naming the cross-cutting expectations in this contract — auth header, error envelope, route-registration order, 404 shape — gives COARCH-T01 a single anchor for the integration patches and makes the bypass-by-default behavior of the current carveouts explicit rather than implicit.

### §3.3 Why §10.3 needs a SQLite bullet

Existing §10.3 enumerates anti-fabrication-required spikes for WS, fsevents, notifications, and launchd. SQLite is a comparable load-bearing external dependency for `/v3/*` and deserves the same anti-fabrication discipline. MB-S03 has already done this spike; the bullet anchors the precedent for any future v3.x SQLite changes.

### §3.4 Why a minor bump (v2.0.0 → v2.1.0) is the right semver step

Per §2: additive endpoints under `/v2/...` are a minor bump; non-additive change is a major bump requiring migration. `/v3/*` is additive routing — no `/v2/*` client breaks. The cross-reference change in §1 is documentation-only. Therefore minor.

A reader might argue the bump should be v3.0 since the `/v3/*` surface itself is "v3". Counter: this contract is authority for `/v2/*` only; the `/v3/*` versioning lives in `WORKSTATION_CONTRACT.md` §2.3 (independent semver). Bumping this contract to v3 would imply a `/v2/*` breaking change, which there isn't.

---

## §4 — What this proposal does NOT include

- An amendment of `WORKSTATION_CONTRACT.md` itself. That contract is already authority for `/v3/*` and the §8.1 amendment (commit `7fd48e4`) covers the persistence-layer correction. No further amendment is needed for MB-S03 scope.
- A version bump of `WORKSTATION_CONTRACT.md`. Its first authoring is the freeze anchor per §1.3; future amendments are `contract:` commits. The §8.1 amendment was the first such; MB-S03 does not introduce a second.
- Endpoint-shape detail beyond the cross-reference. Per §2.2 above, this contract intentionally does NOT duplicate `/v3/*` shape definitions — those live in `WORKSTATION_CONTRACT.md` §6.

---

## §5 — Verification before operator commit

Operator should confirm before authoring the `contract:` commit:

1. The §1 cross-reference does not conflict with `WORKSTATION_CONTRACT.md` §1.2's claim that it does NOT duplicate `/v2/*` definitions. Spike read both — they are complementary, not contradictory.
2. The §4.6 enumeration of cross-cutting expectations matches operator intent for `/v3/*` integration patterns. Spike inferred from the §3 + §10 structure of this contract; operator may want different framing.
3. The version bump path (v2.0.0 → v2.1.0) matches operator's semver intent for additive cross-references. Spike chose minor per §2 additive-only rule; operator may prefer patch (v2.0.0 → v2.0.1) if reading the cross-reference as a documentation clarification.

Items 1-3 are the surface-and-ack points before commit. Spike did NOT infer-around them.

---

## §6 — Authoring checklist for operator

When ready, the `contract:` commit:

1. Edit `CONDUCTOR_API_CONTRACT.md` per §2.1, §2.2, §2.3, §2.4 above.
2. Stage with `git add CONDUCTOR_API_CONTRACT.md` (per-path discipline).
3. Pre-commit territory check: `git status --short`.
4. Commit with `contract:` verb. Suggested commit message:

   > `contract: amend CONDUCTOR_API_CONTRACT.md §1 + §4.6 + §10.3 — coordinated /v3/* surface (v2.0.0 → v2.1.0)`
5. Post-commit verification: `git log -1 --stat`.
6. Update `WORKSTATION_CONTRACT.md` §1's "Relationship to other contracts" line that cites this contract's commit SHA, replacing the current `3ddca60, amended at a502c4c and c1bb7fe` with the addition of this commit's SHA.

The 9-question self-check block per §10.5 applies to the `contract:` commit. Suggested answers:

1. Is the API I called verified by a spike? → n/a (documentation-only change, no API call).
2. Does my test exercise behavior, or my mocks? → n/a (no test).
3. If implementation deleted, would test still pass? → n/a (no implementation).
4. Did I add anything outside this contract's specification? → no (additive amendment only).
5. Did I modify this contract without operator approval? → no (operator IS the author).
6. Is any claim in my commit body unlabeled? → no (all claims grounded in cross-references).
7. Did this commit touch any file the other parallel session might also modify? → operator best-judgment.
8. Does this commit change session state via direct registry write, bypassing PATCH /v2/sessions/:name/state? → no.
9. Did I do work during a halt state that wasn't explicitly authorized? → no.

---

End of proposal. Spike halts at the proposal boundary per §3.4 + cairn frozen-contract discipline.
