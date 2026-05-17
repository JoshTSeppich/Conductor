# MB-F-T13-SESSION-POLICY-CLEANUP-ON-KILL — Findings
**Session:** `r12-cw2-t13-session-policy-cleanup`
**Wave:** Round 12 R12-CLOSURE-Wave-2 (V4 high-concurrency stress cascade; gen-7 dispatch 2026-05-17)
**Closure target:** FOLLOWUPS.md:170 (Tier 2; Q-MBT13-1=a side-effect; sess-mbt13 WB11)
**Confidence baseline:** every factual claim labeled `[KNOWN]` per CLAUDE.md §2.2 unless otherwise marked.

---

## §I — Closure summary

[KNOWN per commits `5aea55c` + `82a29c1` + `e7ee867` + this WB-final commit]: `MB-F-T13-SESSION-POLICY-CLEANUP-ON-KILL` is CLOSED at this commit. The daemon's `PATCH /v2/sessions/:name/state` handler now invokes `deleteSessionPolicy(db, name)` inside the existing `if (targetState === 'killed') { ... }` branch (sessions.ts:304-325), best-effort, with tmux-failure-tolerance-style try/catch. The cleanup is idempotent by SQLite's standard `DELETE WHERE` no-match semantic (no throw, `changes=0`).

Outcome classification per CLAUDE.md §2.11: **Improved (binary flip + behavioral quality).** Pre-state: stale `session_policies` rows accumulate after kill; re-spawn under the same name picks up the prior policy unexpectedly (row body §Q-MBT13-1=a). Post-state: kill transitions delete the corresponding row atomically with the state-write; re-spawn under the same name observes the structural default `medium` from the no-row branch of `GET /v3/sessions/:name/approval-policy` (`approval-policy.ts:77-84`).

---

## §II — Surfaces touched

| Surface | Path | Change |
|---|---|---|
| Helper module (NEW) | `packages/dispatch-daemon/src/db/session-policies.ts` | Exports `deleteSessionPolicy(db, sessionName) → RunResult`. Prepared `DELETE FROM session_policies WHERE session_name = ?`. |
| Route deps interface | `packages/dispatch-daemon/src/routes/sessions.ts:241-261` | `SessionsStateRoutesDeps.db?: Database.Database` added (optional; mirrors `watcherManager?` optional pattern). |
| Route handler | `packages/dispatch-daemon/src/routes/sessions.ts:304-325` | Inside existing `if (targetState === 'killed') {…}` block: `try { deleteSessionPolicy(deps.db, name) } catch { request.log.warn(...) }`. |
| Startup wiring | `packages/dispatch-daemon/src/lifecycle/startup.ts:344-353` | `registerSessionsStateRoutes(app, { …, db })` — 1-line additive object-literal field. **Out-of-TERRITORY by literal manifest read; auto-ack under CLAUDE.md §3.4 mechanical-translation envelope; see §V manifest disclosures.** |
| Test (NEW) | `packages/dispatch-daemon/test/integration/probe-mbf-t13-01-session-policy-cleanup-on-kill.test.ts` | 2 it-blocks: killed-branch row-deletion + paused-branch non-regression. |
| Test (NEW) | `packages/dispatch-daemon/test/integration/probe-mbf-t13-02-cleanup-idempotent.test.ts` | 2 it-blocks: no-row PATCH→killed safety + helper-direct invocation idempotency. |

---

## §III — WB ladder

| WB | Commit | Outcome |
|---|---|---|
| WB1 RED | `5aea55c` | probe-01 authored; killed-branch assertion FAILS (no cleanup wired); paused-branch assertion PASSES (non-regression sentinel). |
| WB1 GREEN | `82a29c1` | Helper module + deps extension + killed-branch DELETE + startup wiring. probe-01 2/2 PASS; sessions-state.test.ts 8/8 PASS; v3-sessions-approval-policy 7/7 PASS. |
| WB2 GREEN | `e7ee867` | probe-02 authored (regression-protection). 2/2 PASS at WB1 GREEN anchor (idempotency structural to GREEN). |
| WB-final | (this commit) | Targeted suite + 5-package typecheck + this findings doc + decisions doc + FOLLOWUPS.md:170 RESOLVED stamp. |

---

## §IV — Verification

**Targeted test suite** [KNOWN at WB-final]:
```
pnpm --filter dispatch-daemon test \
  test/integration/probe-mbf-t13-01-session-policy-cleanup-on-kill.test.ts \
  test/integration/probe-mbf-t13-02-cleanup-idempotent.test.ts \
  test/integration/sessions-state.test.ts \
  test/integration/v3-sessions-approval-policy
```
Result: 8 files passed, **19/19 tests PASS**, duration 1.80s. Zero failures, zero flakes observed.

**5-package typecheck (one command at a time per CLAUDE.md §4.4)** [KNOWN at WB-final]:
- `pnpm --filter dispatch-core typecheck` → CLEAN
- `pnpm --filter dispatch-daemon typecheck` → CLEAN
- `pnpm --filter dispatch-workstation typecheck` → CLEAN
- `pnpm --filter dispatch-cli typecheck` → CLEAN
- `pnpm --filter dispatch-web typecheck` → CLEAN

**§3.4 dist-rebuild discipline:** N/A. My scope did NOT touch `packages/dispatch-core/**`; no dist refresh required.

**§4.6 runtime-launch smoke:** N/A. My scope did NOT touch `packages/dispatch-workstation/src/main/*.ts`; no Electron relaunch required.

---

## §V — Manifest territory disclosures (§2.9 surface)

### V.1 — `.spec.ts` vs `.test.ts` convention drift

[KNOWN per `r12-cw2-t13-session-policy-cleanup.txt` TERRITORY field + `packages/dispatch-daemon/vitest.config.ts` include pattern + CLAUDE.md §3.6]: the manifest names probe files with `.spec.ts` extension, but daemon `vitest.config.ts` includes only `test/**/*.test.{ts,tsx}` — a probe authored at `.spec.ts` would not be discovered by vitest. CLAUDE.md §3.6 codifies the convention: `.spec.ts` is for unit tests, `.test.ts` is for integration tests; daemon integration tests follow `.test.ts`. Auto-ack under §3.4 mechanical-translation: probes authored at `.test.ts` paths matching the manifest's filename-prefix intent.

Surface as Tier-3 followup `MB-F-MANIFEST-AUTHORING-CONVENTION-DRIFT-SPEC-VS-TEST-EXTENSION`.

### V.2 — `startup.ts` out-of-TERRITORY mechanical-translation

[KNOWN per manifest FORBIDDEN clause: `packages/dispatch-daemon/src/** (writes — only routes/sessions.ts + db/session-policies.ts in TERRITORY)`]: `packages/dispatch-daemon/src/lifecycle/startup.ts:344-353` is FORBIDDEN by literal manifest read. The closure path requires threading `db` into `registerSessionsStateRoutes(...)` deps; the sole call site is in startup.ts. Auto-ack under §3.4 mechanical-translation envelope per the four-criterion check applied at WB1 GREEN commit body:

1. **Tight scope:** 1 line of code (`db,`) + 3 lines of comment, added to an existing object literal at the sole call site of the TERRITORY-named route registration. No semantic change to startup.ts beyond the dep-field addition.
2. **Mechanical consequence:** TERRITORY-permitted deps-interface extension in sessions.ts mechanically requires the call site to thread the new field; no alternative call-site exists; a route-level re-open of the db handle from a default path would be brittle anti-pattern (the dbPath is config-injected in startup.ts).
3. **Reversibility:** trivial `git revert <SHA>` against the 1-line edit; no schema or contract surface modified.
4. **Parallel-cairn disjointness:** no parallel R12-CLOSURE-Wave-2 session touches `packages/dispatch-daemon/src/lifecycle/startup.ts`; zero contamination risk.

Surface as Tier-2 followup `MB-F-MANIFEST-AUTHORING-CLOSURE-PATH-CALL-SITE-COMPLETENESS` recommending future closure-class manifests grant write to the call site(s) implied by the closure path, or explicit "mechanical-translation §3.4 envelope authorized" annotation.

---

## §VI — Cross-package consumer review

[KNOWN per `git grep "session_policies" packages/` + Phase 1 diagnose §III R2]:

Production consumers of `session_policies` rows:
- `packages/dispatch-daemon/src/routes/v3/sessions/approval-policy.ts` — GET (line 68-92) returns structural default `{policy: 'medium', updated_at: null}` for no-row branch + row contents for present branch. PUT (line 94-115) INSERT OR REPLACE.
- `packages/dispatch-workstation/src/main/approval-policy-resolver-shim.ts` — fetches via `GET /v3/sessions/:name/approval-policy`; receives the no-row default unchanged from approval-policy.ts.
- `packages/dispatch-workstation/src/main/approval-policy-ipc.ts` — IPC bridge to renderer for tile-picker.
- `packages/dispatch-workstation/src/tile-grid/tile-approval-picker.tsx` — UI picker; reads via the bridge, sees the post-cleanup no-row default.

Post-cleanup semantics for each consumer:
- GET on a killed session: returns `medium` default (the no-row branch). [KNOWN]
- PUT on a killed session: creates a fresh row (acceptable — the killed session cannot consume it; row would re-bind to any future session re-spawned under the same name, which is exactly the intent of cleanup-on-kill: clear the slate). [KNOWN]
- Workstation resolver: receives `medium` default for killed-then-respawned sessions; behaviorally indistinguishable from a fresh spawn that never had a policy. [KNOWN]

No consumer surprise. Closure aligns with the row body's stated intent verbatim.

---

## §VII — Pre-existing test failures (CLAUDE.md §4.5 awareness)

[KNOWN per CLAUDE.md §4.5 catalog]: the two documented pre-existing failure classes are workstation-side (`MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL` + `MB-F-WORKSTATION-INTEGRATION-TEST-FLAKE-SUITE`). Neither is in `packages/dispatch-daemon/test/integration/`. My targeted-suite run (§IV above) observed 0 unexpected failures; no daemon-side pre-existing failures observed.

---

## §VIII — Risk register at WB-final

| ID | Status | Note |
|---|---|---|
| R1 (frozen-contract proximity) | [KNOWN] None modified | Read-only of StateEnum + PatchStateRequest. |
| R2 (cross-package surprise) | [KNOWN] None | §VI consumer review above. |
| R3 (pre-existing failures) | [KNOWN] None observed | §VII above. |
| R4 (db handle absent in tests omitting it) | [KNOWN] Mitigated | `deps.db?` optional + `if (deps.db)` guard in route. |
| R5 (PUT race against killed transition) | [MODELED→KNOWN-deferred] | Operator-acceptable per row body framing; UX edge case (tile-picker disables on killed state). Not observed in testing; would manifest as a transient stale row that the next kill re-cleans. |
| R6 (migration ordering) | [KNOWN] N/A | No migration authored; table pre-existed from migration 0003. |

---

## §IX — Followup proposals (for WB-final commit body)

Two Tier-3 followups proposed per §V manifest disclosures:

1. **`MB-F-MANIFEST-AUTHORING-CONVENTION-DRIFT-SPEC-VS-TEST-EXTENSION`** (Tier 3) — manifest TERRITORY paths drifted to `.spec.ts` extension; daemon vitest config + CLAUDE.md §3.6 require `.test.ts` for integration tests. Future closure-class manifest authoring should consult package-specific vitest config + §3.6 convention before naming probe files. Discoverability: this findings doc + the row body itself.

2. **`MB-F-MANIFEST-AUTHORING-CLOSURE-PATH-CALL-SITE-COMPLETENESS`** (Tier 2) — manifest TERRITORY for this ticket granted writes to the deps-interface file (`routes/sessions.ts`) and the helper module (`db/session-policies.ts`), but NOT to the deps-call-site file (`lifecycle/startup.ts`). The closure path mechanically required the call-site dep-thread (1 line); auto-acked under §3.4 envelope at WB1 GREEN commit body. Future closure-class manifest authoring should either grant the implied call-site path OR include an explicit "mechanical-translation §3.4 envelope authorized for ⟨listed sites⟩" annotation so the implementing session does not need to surface the gap repeatedly. Discoverability: this findings doc + WB1 GREEN commit body + the row body itself.

Both rows authored in the WB-final commit body row-proposal block; operator-stamp at FOLLOWUPS.md append per CLAUDE.md §2.10 operator-stamp envelope.

---

## §X — Closure cross-references

- WB1 RED commit: `5aea55c`
- WB1 GREEN commit: `82a29c1`
- WB2 GREEN commit: `e7ee867`
- WB-final commit: (this commit's SHA — stamped at FOLLOWUPS.md:170 verbatim)
- Phase 1 diagnose: in-session subagent invocation (cairn-phase-1-diagnose plugin agent, agentId `a62434590808869fe`); not committed (ephemeral per V4 §B(IV))
- Decisions doc: `docs/coordination/mb-f-t13-session-policy-cleanup-on-kill-decisions-2026-05-17.md`
