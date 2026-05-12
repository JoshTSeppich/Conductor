# Dispatch Queue — Current Round (Round 11 §3.9 SPECULATIVE)

Authored under §3.4 mechanical translation per OPERATOR DIRECTIVE — ROUND 11 DISPATCH (2026-05-12). Adopts §3.9 Territorial Partitioning + Manifested Dispatch Queue as SPECULATIVE primitive for Round 11 validation.

## Schema

Each row format: `[SESSION-N] <scope> | territory: <manifest-ref> | deps: <upstream-ids or NONE>`

Sessions claim QUEUED items via atomic git commit (move row to IN-FLIGHT). Sessions self-dispatch on claim.

## §0 — Conventions

- **Manifest-ref**: `docs/coordination/territorial-manifests/<session-name>.txt`
- **Frozen contracts** (per CLAUDE.md §1) — NEVER claimable; outside any territory: `REGISTRY.md §2`, `CONDUCTOR_API_CONTRACT.md`, `packages/dispatch-core/src/v3/schema.ts §1-§13`, `WORKSTATION_CONTRACT.md §6`, `packages/dispatch-workstation/src/main/hso-system-prompts/orchestrator.md`, `ORCHESTRATOR_STATE_CONTRACT.md`
- **Dep cycle detection**: orchestrator pre-commit check before adding QUEUED items
- **§3.9.A enforcement**: every `git add` glob-matched against session manifest at add step; mismatch = HALT-TERRITORY-VIOLATION

## QUEUED

(no items currently queued — Round 11 cascade is via direct dispatch with manifest binding; queue used for future Phase 4 ticket execution post-WB1-RED handoff)

## IN-FLIGHT

| session | scope | territory | deps | started |
|---|---|---|---|---|
| `r11-archive-writer` | Round 11 methodology archive — extend round-9.md OR author round-11.md; capture §3.9 mechanism evidence + 16-concurrent attempt evidence | [r11-archive-writer.txt](territorial-manifests/r11-archive-writer.txt) | NONE | (post-spawn) |
| `r11-manifest-validator` | §3.9 territorial-manifest compliance audit; report mismatch findings | [r11-manifest-validator.txt](territorial-manifests/r11-manifest-validator.txt) | NONE | (post-spawn) |
| `r11-queue-watcher` | §3.9 dispatch-queue claim-race + dep-cycle detector | [r11-queue-watcher.txt](territorial-manifests/r11-queue-watcher.txt) | NONE | (post-spawn) |
| `phase4-t8-exec` | MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW continuation from WB1 RED (`31709e0`); WB2 GREEN onward | [phase4-t8-exec.txt](territorial-manifests/phase4-t8-exec.txt) | NONE (P5 forward-position consumed) | (post-spawn) |
| `phase4-t9-exec` | MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW continuation from WB1 RED (`85ed1e9`); WB2 GREEN onward | [phase4-t9-exec.txt](territorial-manifests/phase4-t9-exec.txt) | NONE (P5 forward-position consumed) | (post-spawn) |

## COMPLETED

(none yet for Round 11; existing T1-T7 + P1-P3 + P5-P7 cascade pre-dates §3.9 adoption — not retroactively manifested)

## Honest gaps (per §3.9.D — captured-incident-category placeholders)

- Queue claim races: pending observation
- Stale manifest references: pending observation
- Queue authoring bottleneck: pending observation
- Dep graph deadlock: pending observation
- Manifest-violation false positives: pending observation
