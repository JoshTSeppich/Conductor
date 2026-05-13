# Dispatch Queue — Current Round (Round 11 §3.9 SPECULATIVE — Continuation Wave 2)

Authored under §3.4 mechanical translation per OPERATOR DIRECTIVE — ROUND 11 CONTINUATION DISPATCH (2026-05-12). §3.9 SPECULATIVE adoption preserved.

## Schema

Each row format: `[SESSION-N] <scope> | territory: <manifest-ref> | deps: <upstream-ids or NONE>`

Sessions claim QUEUED items via atomic git commit (move row to IN-FLIGHT). Sessions self-dispatch on claim.

## §0 — Conventions

- **Manifest-ref**: `docs/coordination/territorial-manifests/<session-name>.txt` OR `<descriptive-name>.txt`
- **Frozen contracts** (per CLAUDE.md §1) — NEVER claimable; outside any territory
- **§3.9.A enforcement**: every `git add` glob-matched against session manifest at add step

## QUEUED — Wave 4 (sustained forge forward; Phase 3 trigger + Cluster F continuation)

(orchestrator-mediated direct dispatch; sessions begin IN-FLIGHT immediately on first commit)

| session | scope | territory | deps |
|---|---|---|---|
| `__orchestrator_active` | **Phase 3 visual verification execution** — run packages/dispatch-workstation/scripts/phase-3-visual-smoke.mjs end-to-end; capture screenshots; report visual gaps for Phase 5 scoping | [orch-active-phase3-visual-verify.txt](territorial-manifests/orch-active-phase3-visual-verify.txt) | NONE (γ tooling shipped at `a8e9a76`) |
| `phase4-t9-exec` | **MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW** (Cluster F per P3-rev-2 §3.2) — ticket body + WB1+ ladder | [phase4-t9-bypass-perms.txt](territorial-manifests/phase4-t9-bypass-perms.txt) | NONE |
| `phase4-t8-exec` | **MB-T-PHASE-4-METHODOLOGY-EPSILON-VISUAL-DIFF** (Cluster D-ε per P3-rev-2 §3.3 — dispatch-ready) — ticket body + WB1+ ladder | [phase4-t8-methodology-epsilon.txt](territorial-manifests/phase4-t8-methodology-epsilon.txt) | NONE |
| `r11-archive-writer` | **§5 round-close synthesis FINAL draft** — Round 11 archive close-out preparation | [r11-archive-writer.txt](territorial-manifests/r11-archive-writer.txt) | NONE |
| `__orchestrator_standby` | P3 roadmap rev-3 — incorporate Wave 3 closures + Phase 3 results when available | [orch-standby-p3-roadmap-rev.txt](territorial-manifests/orch-standby-p3-roadmap-rev.txt) | depends-on __orchestrator_active Phase 3 results |

## QUEUED — Wave 3 (PHASE 2 — operator-acked max-parallel forge forward) [retained for archival]

(orchestrator-mediated direct dispatch; sessions begin IN-FLIGHT immediately on first commit)

| session | scope | territory | deps |
|---|---|---|---|
| `phase4-t8-exec` | MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS (Cluster A bundled ticket; body at `52f3d04`) WB1+ execution | [phase4-t8-cluster-a-exec.txt](territorial-manifests/phase4-t8-cluster-a-exec.txt) | NONE |
| `phase4-t9-exec` | MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW (body at `b76ed51`) WB1+ execution | [phase4-t9-t10-exec.txt](territorial-manifests/phase4-t9-t10-exec.txt) | NONE |
| `r11-archive-writer` | Round 11 archive §5 round-close prep + §1 RECURRENCE captures + §4 §3.9 verdict update (race-window mechanism evidence post-c5/63eba0f) | [r11-archive-writer.txt](territorial-manifests/r11-archive-writer.txt) | NONE |
| `r11-queue-watcher` | Wave-3 claim-race + race-window proximity evidence (12+ concurrent IN-FLIGHT scan; defined as 2-session-stage-within-2s) | [r11-queue-watcher.txt](territorial-manifests/r11-queue-watcher.txt) | NONE |
| `r11-manifest-validator` | Wave-3 manifest audit (5 new manifests this dispatch + grammar/glob review post-§4.1 resolution) | [r11-manifest-validator.txt](territorial-manifests/r11-manifest-validator.txt) | NONE |
| `__orchestrator_active` | Cluster A bundled ticket WB1 RED execution (probe authoring per body §2) | [orch-active-cluster-a-exec.txt](territorial-manifests/orch-active-cluster-a-exec.txt) | depends-on phase4-t8-exec coord for path-disjoint scope |
| `__orchestrator_standby` | P3 Phase 4 roadmap rev-2 — incorporate T8+T9 closure evidence + Cluster A scope + Phase 3 trigger readiness | [orch-standby-p3-roadmap-rev.txt](territorial-manifests/orch-standby-p3-roadmap-rev.txt) | NONE |
| `t2-ticket-body-0905` | Round 11 archive co-author with r11-archive-writer (round-11.md §5 prep parallel write; territorial-disjoint sub-sections) | [t2-archive-coauthor.txt](territorial-manifests/t2-archive-coauthor.txt) | coordinate-with r11-archive-writer (territorial-disjoint sub-sections) |

## IN-FLIGHT (Continuation Wave 2)

| session | scope | territory | deps | started |
|---|---|---|---|---|
| `c5-ticket-wb1` (cleared) | MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-GAP + FRAME-C-FOCUS-EVENT-CONSUMER-MISSING + FRAME-C-IPC-LOOKUP-SESSION tile-grid-app integration trinity | [c5-tilegrid-wiring.txt](territorial-manifests/c5-tilegrid-wiring.txt) | NONE | (post-dispatch) |
| `commit-plan-doc-1334` (cleared) | MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING closure (a): add spawnMode field + spawn-handler plumbing + FrameCRoot pass-through | [commit-plan-doc-spawnmode.txt](territorial-manifests/commit-plan-doc-spawnmode.txt) | NONE | (post-dispatch) |
| `t1-ticket-body-0905` | MB-F-CHATSHELL-POLISH-REMAINING execution (T7 followup) | [t1-chatshell-polish.txt](territorial-manifests/t1-chatshell-polish.txt) | NONE | (post-dispatch) |
| `t3-ticket-body-0905` (cleared) | MB-F-FRAME-C-IPC-LOOKUP-SESSION production wiring (deps factory + frame-c-ipc-deps-production.ts) | [t3-frame-c-lookup-stub.txt](territorial-manifests/t3-frame-c-lookup-stub.txt) | depends-on c5 trinity for tile-grid-app integration anchor | (post-dispatch) |
| `t6-ticket-body-0905` | MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW ticket body draft (forward-position Phase 4 ticket) | [t6-wireframe-t10-body.txt](territorial-manifests/t6-wireframe-t10-body.txt) | NONE | (post-dispatch) |
| `verify-chat-mount-1319` | MB-F-CHATSHELL-POLISH-REMAINING progress (T7 polish — conductor-brand + tab-switcher + chat-shell styles) | [verify-chat-mount-t7polish.txt](territorial-manifests/verify-chat-mount-t7polish.txt) | NONE | (post-dispatch) |
| `__orchestrator_active` | Phase 4 status synthesis doc — T8 + T9 closures + Phase 4 forward planning | [orch-active-phase4-status.txt](territorial-manifests/orch-active-phase4-status.txt) | NONE | (post-dispatch) |
| `__orchestrator_standby` | Sherpa MVP analysis — verify path availability + read-only analysis OR author absence report | [orch-standby-sherpa.txt](territorial-manifests/orch-standby-sherpa.txt) | NONE | (post-dispatch) |
| `r11-archive-writer` | Round 11 archive §3 propagation patterns + §4 §3.9 validation verdict drafting + §2 remaining scale evidence | [r11-archive-writer.txt](territorial-manifests/r11-archive-writer.txt) | NONE | (continuation; existing manifest) |
| `r11-queue-watcher` | Round-11-extension queue-watcher-report — next-cohort claim-race + dep-cycle observation across Wave 2 | [r11-queue-watcher.txt](territorial-manifests/r11-queue-watcher.txt) | NONE | (continuation; existing manifest) |
| `r11-manifest-validator` | Round-11-extension manifest audit — review Wave-2 manifests (9 new) + report grammar/glob/overlap findings | [r11-manifest-validator.txt](territorial-manifests/r11-manifest-validator.txt) | NONE | (continuation; existing manifest) |

## COMPLETED (Round 11 Wave 1)

| session | scope | completion-commit |
|---|---|---|
| `phase4-t8-exec` | MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW WB2+ ladder | `155933f` (WB-final + β amendment) |
| `phase4-t9-exec` | MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW WB2+ ladder | `afd3778` (WB8 + runtime smoke) |
| `r11-archive-writer` (Wave 1) | round-11.md skeleton + §1.5-§1.7 + §2.C-§2.D | `72c28fc` + `9a9a96a` |
| `r11-manifest-validator` (Wave 1) | first audit (§4.1 TERRITORY⊆FORBIDDEN precedence-gap surfaced) | `759b65e` |
| `r11-queue-watcher` (Wave 1) | first report (shared-index-race evidence) | `262cc44` |
| `p7-cortex-draft-1243` | Cortex-minimal scaffold §1-§4 + G1-G22 deepening | `228b995` (initial DRAFT) + 2nd-iter deepening — DRAFT-COMPLETE; awaiting operator REGISTRY.md §2 authoring |
| `c5-ticket-wb1` (Wave 2 Phase 1) | tile-grid-app wiring trinity — partial-revert remediation per Round 11 Phase 1 option 4 | `9b8a4e9` (revert) + `a400c10` (WB2 amendment) + `31d2a59` (coord doc) + `56925b8` (WB3 GREEN getSession alignment) + `24045ab` (WB4 RED) — in progress (post-revert continuation) |
| `commit-plan-doc-1334` (Wave 2 Phase 1) | TileGridSessionEntry.spawnMode closure (a) | `228a2da` (WB1 GREEN post-revert clean) + `227bd2e` (WB2 RED) — in progress |

## Honest gaps (per §3.9.D — captured-incident-category placeholders)

- Queue claim races: observed once (Wave 1; documented)
- Stale manifest references: NONE caught yet
- Manifest-violation false positives: NONE caught yet
- Queue authoring bottleneck: orchestrator-bottleneck observed Wave 2 prep
- Dep graph deadlock: NONE caught (Wave 2 has minor c5↔t3 dep on tile-grid-app integration anchor; sequential not deadlock)

## Phase4-t8-exec + phase4-t9-exec — reserved as overflow capacity

Both ladder-COMPLETE; available if Wave 2 generates overflow work (followup probes / WB closure stamps / cross-package wiring tasks).
