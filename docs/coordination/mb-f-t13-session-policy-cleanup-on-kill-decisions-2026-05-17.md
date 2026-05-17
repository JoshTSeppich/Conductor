# MB-F-T13-SESSION-POLICY-CLEANUP-ON-KILL — Decisions
**Session:** `r12-cw2-t13-session-policy-cleanup`
**Wave:** Round 12 R12-CLOSURE-Wave-2 (V4 high-concurrency stress cascade; gen-7 dispatch 2026-05-17)
**Closure target:** FOLLOWUPS.md:170
**Confidence baseline:** every factual claim labeled `[KNOWN]` per CLAUDE.md §2.2.

---

## Q1 — Which session-state transitions trigger session_policies cleanup?

**Disposition: only `state='killed'`.** Auto-ack under CLAUDE.md §3.4 mechanical-translation envelope.

[KNOWN per `packages/dispatch-core/src/v2/schema.ts:32`]: `StateEnum = z.enum(['armed', 'paused', 'held', 'killed'])`. Per CONDUCTOR_API_CONTRACT.md §6.1 + the existing `if (targetState === 'killed') { deps.watcherManager?.detach(name); }` branch in sessions.ts (the watcher detach is exclusive to killed because killed is the sole terminal state — no further session events expected): `killed` is the unique terminal state. `paused` and `held` are transient; operator may resume → policy must persist.

[KNOWN per row body FOLLOWUPS.md:170]: "When a session is killed (transitioned to `state=killed` in sessions.json)…" — verbatim specifies `killed` only.

The disposition matches FOLLOWUPS.md:170 row body verbatim AND aligns with the existing terminal-state side-effect topology already established at sessions.ts:295 (watcher detach). Mechanical-translation envelope satisfied (`killed` is structurally the only state for which a terminal cleanup is meaningful).

## Q2 — Where does the `db` handle plumb into `registerSessionsStateRoutes`?

**Disposition: extend `SessionsStateRoutesDeps` with optional `db?: Database.Database`; thread from `startup.ts:344-353` at the existing route-registration call site.** Auto-ack under §3.4.

[KNOWN per `packages/dispatch-daemon/src/routes/sessions.ts:241-261` (post-edit)]: `SessionsStateRoutesDeps` already follows an "optional-deps" pattern for cross-cutting wiring (`watcherManager?`, `emit?`). Adding `db?: Database.Database` mirrors that pattern without structural deviation. The interface lives in TERRITORY (`routes/sessions.ts`); the call site is in `lifecycle/startup.ts` (out-of-TERRITORY by literal manifest read — see §V.2 of findings doc + Q5 below).

The alternative (callback indirection `onTerminalState?: (name: string) => void`) was rejected: it shifts the I/O concern away from the route in a way that obscures the audit-trail of "what fires on killed transition" (state_changed emit + watcher detach + policy cleanup all happen at the same code site → clearer than scattered subscribers).

## Q3 — Idempotency contract

**Disposition: SQLite's `DELETE WHERE` no-match returns `changes=0` and does not throw; rely on the standard semantic.** Auto-ack under §3.4.

[KNOWN per probe-mbf-t13-02 helper-direct invocation test]: three sequential invocations of `deleteSessionPolicy(db, sessionName)` against the same / non-existent rows return `changes=1, 0, 0` respectively, no throw. The helper exposes the `RunResult` so callers may observe the changes count if they need it; the route-level handler does NOT observe it (best-effort housekeeping; the route returns 200 regardless).

## Q4 — Ordering at the killed branch

**Disposition: DELETE runs adjacent to the existing `deps.watcherManager?.detach(name)`; wrapped in try/catch that logs at `warn` and tolerates failure so a sqlite error does not 500 a successful state transition.** Auto-ack under §3.4.

[KNOWN per `packages/dispatch-daemon/src/routes/sessions.ts:278-281` comment]: the existing tmux-failure-tolerance pattern at the killSession site (`tmux side effect failures are tolerated and the transition still succeeds — emit reflects state-change success regardless of tmux outcome`) is the canonical "best-effort terminal-state side-effect" precedent. The policy-cleanup follows the same pattern: log + tolerate, do not 500. The two side-effects (watcher detach + policy cleanup) have no behavioral coupling; ordering between them is invariant under any test in the targeted suite.

## Q5 — Dedicated `db/session-policies.ts` module vs inline prepared DELETE

**Disposition: author the new module per manifest TERRITORY; helper exports `deleteSessionPolicy(db, name) → RunResult`.** Auto-ack under §3.4 (manifest IS operator arbitration on the structural decision).

[KNOWN per manifest TERRITORY field]: `packages/dispatch-daemon/src/db/session-policies.ts` is explicitly named as a write-target. No prior module exists at that path. Auto-ack: author the new module exporting the DELETE helper only; the existing approval-policy.ts prepared SELECT + INSERT OR REPLACE statements remain inline at their route file (no scope-creep refactor to extract them into the new module).

This disposition is structurally cleaner than inlining the DELETE in sessions.ts (which would couple route-handler code with prepared-statement plumbing); the new module is a natural extraction point if future cleanup operations on the same table are needed (e.g., periodic prune of orphaned rows).

## Q6 — Out-of-TERRITORY `startup.ts` mechanical-translation

**Disposition: auto-ack under §3.4; 1-line additive edit threading `db` into the existing route-registration object literal.** Documented in findings doc §V.2 + Tier-2 followup at WB-final.

[KNOWN per manifest FORBIDDEN clause + findings doc §V.2]: `lifecycle/startup.ts` is FORBIDDEN by literal manifest read. Four-criterion check at WB1 GREEN commit body satisfied: tight scope, mechanical consequence of TERRITORY-permitted deps extension, reversible, parallel-cairn disjoint.

The alternative (HALT for manifest amendment) was rejected for this single-line case because:
- The dispatch is part of a 12-cap V4 high-concurrency cascade (gen-7); halt-and-wait blocks the slot indefinitely with operator-async authorization in effect.
- The edit is genuinely 1 line of code (`db,`) with no structural decision encoded — it follows mechanically from the TERRITORY-permitted dep extension.
- Operator review at WB-final RESOLVED stamp + Tier-2 followup row provides the operator-supervised-mechanical-translation review per §3.4 envelope.

Future closure-class manifests should grant the call-site path explicitly OR include a "mechanical-translation §3.4 envelope authorized for ⟨listed sites⟩" annotation — proposed as Tier-2 followup `MB-F-MANIFEST-AUTHORING-CLOSURE-PATH-CALL-SITE-COMPLETENESS`.

## Q7 — `.spec.ts` vs `.test.ts` extension drift

**Disposition: author probes at `.test.ts` per CLAUDE.md §3.6 + daemon vitest config; manifest's `.spec.ts` is a convention-drift artifact.** Auto-ack under §3.4.

[KNOWN per `packages/dispatch-daemon/vitest.config.ts` include]: `test/**/*.test.{ts,tsx}`. A probe at `.spec.ts` would not be discovered. CLAUDE.md §3.6: "`probe-NN-<descriptor>.spec.ts` (unit) or `probe-NN-<descriptor>.test.ts` (integration)" — daemon integration probes use `.test.ts`. The manifest's `.spec.ts` naming is a manifest-authoring drift; honoring it literally would land a non-discoverable file.

Surface as Tier-3 followup `MB-F-MANIFEST-AUTHORING-CONVENTION-DRIFT-SPEC-VS-TEST-EXTENSION`.

## R5 — PUT race against killed transition (operator-acceptable per row body)

**Disposition: tolerate; not gated.** [MODELED→KNOWN-deferred]

A theoretical race exists: a workstation-side PUT (tile-picker → `PUT /v3/sessions/:name/approval-policy`) could land between the DELETE and the kill-state-write, leaving a stale row. The row would re-bind to any future session re-spawned under the same name. Operator-acceptable per the row body framing ("operationally rare; any policy mismatch is observable via the tile-header picker once MB-T16 + MB-F-T13-TILE-HEADER-PICKER-INTEGRATION ship — both shipped").

[KNOWN per MB-T16 closure 2026-05-07]: tile-picker disables when session state is `killed` (UX-side guard); the race is reachable only when the operator is actively interacting with a tile that is being killed by another action (e.g., autopilot+kill at the same moment).

No mitigation authored at this commit. If observed in dogfood, file as a separate Tier-2 followup.

---

## Dispositions summary

| Q | Outcome | Disposition class |
|---|---|---|
| Q1 only-killed-cleanup | killed only | §3.4 mechanical |
| Q2 deps-plumbing | extend SessionsStateRoutesDeps.db? | §3.4 mechanical |
| Q3 idempotency | rely on SQLite no-throw on no-match | §3.4 mechanical |
| Q4 ordering+tolerance | adjacent to detach, log+tolerate | §3.4 mechanical |
| Q5 helper module | new db/session-policies.ts | §3.4 mechanical (manifest = arbitration) |
| Q6 startup.ts edit | 1-line additive auto-ack | §3.4 mechanical (with disclosure + Tier-2 followup) |
| Q7 .test.ts extension | honor §3.6 convention | §3.4 mechanical (with Tier-3 followup) |
| R5 PUT race | tolerate per row body | operator-acceptable |

All dispositions self-resolvable under §3.4 envelope; no HALT-COARCH-CONSULTATION raised; no frozen-contract surfaces modified.
