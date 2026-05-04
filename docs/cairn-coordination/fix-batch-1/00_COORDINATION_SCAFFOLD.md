# Fix-Batch-1 Coordination Scaffold

**Base:** main @ 332bec1
**Branches:** fix-A/orchestrator-card-flow, fix-B/spawn-result-subscription, fix-C/console-panel-trigger
**Targets:** #84 (Fix-A), #83 (Fix-B), #82 (Fix-C)

## §1 File ownership

| Session | Owns (write) | Reads (no write) |
|---------|--------------|------------------|
| Fix-A   | `packages/dispatch-workstation/src/main/main.ts` (BOOTSTRAP_API_KEY sentinel region only), `packages/dispatch-workstation/src/main/build-doc-state.ts`, new file `packages/dispatch-workstation/src/main/api-key-bootstrap.ts`, new tests in `test/unit/fix-orchestrator-flow/` | onboarding-mount.ts, card-bridge.ts, orchestrator-output-router.ts |
| Fix-B   | `packages/dispatch-workstation/src/main/main.ts` (SPAWN_RESULT_SUBSCRIPTION sentinel region only), `packages/dispatch-workstation/src/main/preload.mts` (workstationBridge.onSpawnResult), shell renderer file, new tests in `test/unit/fix-spawn-result/`, optionally daemon orphan-reaper file | smoke-harness.ts, spawn-pipeline.ts |
| Fix-C   | `packages/dispatch-workstation/src/main/main.ts` (CONSOLE_TRIGGER sentinel region only), `packages/dispatch-workstation/src/main/console-mount.ts`, `packages/dispatch-workstation/src/main/preload.mts` (consoleBridge.openPanel), new tests in `test/unit/fix-console-trigger/` | daemon /v2/events/stream client |

**Shared file (main.ts) discipline:** function-body sentinel regions per the batch-6 pattern. Each session adds a clearly-marked region:

```ts
// === BEGIN: Fix-A api-key bootstrap (do not modify outside this block) ===
// ...
// === END: Fix-A ===
```

If a session needs to modify code outside its sentinel region, HALT and surface to operator.

**Shared file (preload.mts) discipline:** Fix-B adds `workstationBridge.onSpawnResult`. Fix-C adds `consoleBridge.openPanel`. Different bridge objects, no conflict expected. If both sessions need to modify the same bridge object, HALT and surface.

## §2 Merge order

1. Fix-A merges first (orchestrator card flow is the highest-impact unblock)
2. Fix-B merges second (spawn UX)
3. Fix-C merges last (console trigger)

Each merge: operator-arbitrated, fast-forward if possible, no-ff merge commit if conflicts. Rebase on main before merge if main has advanced.

## §3 Halt-and-surface conditions

Per project instructions §3.7 strict halt:

- Operator pre-registration gates between phases
- Cross-session contract conflict
- Fix scope exceeds expected (>50 LOC any single defect, or touches frozen contract)
- Verification reveals deeper issue requiring §3.4 arbitration

## §4 Per-commit-push discipline

Per project instructions §3.8: every commit pushed before next work. Per-path `git add <path>` only, never `git add -A`. Pre-commit `git status --short`. Post-commit `git log -1 --stat` verification.
