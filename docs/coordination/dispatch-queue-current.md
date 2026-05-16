# Dispatch Queue — Current Round (Round 12 §3.9 KNOWN-load-bearing — Wave 1 cascade init)

Authored under §3.4 mechanical translation per OPERATOR DIRECTIVE — MAX-AUTONOMY-WITHIN-FENCES DISPATCH (2026-05-13). Round 11 closed at operator `TERMINATE-ROUND-11` ack 2026-05-13. §3.9 verdict promoted from SPECULATIVE → KNOWN-load-bearing for primitive set per Round 11 §5.C.3 final synthesis. foxworks-cairn plugin retrofit operative for ALL Round 12 NEW sub-session spawns per dispatch §11(II).

## Schema

Each row format: `[SESSION-N] <scope> | territory: <manifest-ref> | deps: <upstream-ids or NONE>`

Sessions claim QUEUED items via atomic git commit (move row to IN-FLIGHT). Sessions self-dispatch on claim.

## §0 — Conventions

- **Manifest-ref**: `docs/coordination/territorial-manifests/<session-name>.txt` OR `<descriptive-name>.txt`
- **Frozen contracts** (per CLAUDE.md §1) — NEVER claimable; outside any territory
- **§3.9.A enforcement**: every `git add` glob-matched against session manifest at add step

## QUEUED — Round 12 Wave 1 (plugin-loaded cohort; cascade init)

(orchestrator-mediated direct dispatch per dispatch §11(II); ALL Wave 1 sessions spawn with `--plugin-dir /Users/joshuatseppich/Desktop/Automata/foxworks-tooling` per §11(II); sessions begin IN-FLIGHT on first commit)

| session | scope | territory | deps |
|---|---|---|---|
| `r12-archive-writer` | Round 12 live evidence corpus + §5 round-close synthesis when round closes | [r12-archive-writer.txt](territorial-manifests/r12-archive-writer.txt) | NONE |
| `r12-manifest-validator` | §3.9.A manifest grammar + glob audit (Round 11 §1.5 precedent inherited) | [r12-manifest-validator.txt](territorial-manifests/r12-manifest-validator.txt) | NONE |
| `r12-queue-watcher` | Race-window proximity + §3.9.B claim atomicity exercise observer | [r12-queue-watcher.txt](territorial-manifests/r12-queue-watcher.txt) | NONE |
| `r12-phase4-bottom-rail-integration-body` | DRAFT MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION ticket body (closes `MB-F-BOTTOM-RAIL-MOUNT-WIRING-FINAL-INTEGRATION` Tier 2 from `28b0086` BYPASS-PERMS WB7 findings) | [r12-phase4-bottom-rail-integration-body.txt](territorial-manifests/r12-phase4-bottom-rail-integration-body.txt) | NONE — body-drafting only |
| `r12-phase5-tile-header-integration-body` | DRAFT MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION ticket body (closes `MB-F-STATUS-INDICATOR-TILE-HEADER-INTEGRATION` Tier 2 from `30e4aa8`) | [r12-phase5-tile-header-integration-body.txt](territorial-manifests/r12-phase5-tile-header-integration-body.txt) | NONE — body-drafting only |

## COMPLETED — Round 12 Wave 2 (saturation-stamped post WB-final landings 2026-05-16)

| session | scope | completion-commit |
|---|---|---|
| `r12-phase5-tile-header-impl` | MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION Path B 3-WB ladder + WB-final amendment + WB-final docs | `b2af065` (WB-final docs; closed `MB-F-STATUS-INDICATOR-TILE-HEADER-INTEGRATION` Tier 2; 2 new followups at `66ff96d`) |
| `r12-phase4-bottom-rail-impl` | MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION 6-WB ladder + WB8 smoke + WB-final docs (BR-IMPL-1=(b) DEFER scope per operator 2026-05-16) | `b378127` (WB-final docs; Capability-enabled-with-known-limitations; 3 new followups at `acb6bda`) |

## QUEUED — Round 12 Wave T1-CLOSURE-Wave-1 (retarget cascade per RESUME §2(III); gen-6 cohort; expanded per operator amendment 2026-05-16 quota-restoration + 6-concurrent-cap)

(orchestrator-mediated direct dispatch per dispatch §11(II); ALL T1-CLOSURE sessions spawn plugin-loaded per §11(II); sessions begin IN-FLIGHT on first commit. Wave-naming per RESUME §2(IV). Operator amendment 2026-05-16: quota-restoration; §7 cadence restored to standard (5 incidents / 60 min); concurrent-session cap up to 6; substrate ceiling preserved.)

Selection criteria per §14.6 (dogfood-blocking > family-closure > Tier-1-reclass-from-deferred > other-Tier-1-prod-wiring). MB-T07 family already RESOLVED at batch-6 Session B (`7217e66`/`28f55c5`/`fc1d57c`/`e933498`/`f8c57f7`) — removed from priority list.

| session | scope | territory | deps | status |
|---|---|---|---|---|
| `r12-t1c-w1-phase5-mount-wiring` | **MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP** ticket — closes `MB-F-MOUNT-WIRING-HTTPSESSIONLISTCLIENT-PROD-WIRING-DEFERRED` (Tier 1; FOLLOWUPS:367; dogfood-blocking-class-instance-1). Per OPT-β arbitration 2026-05-16 (gen-6): 2-WB ladder + WB-final. WB1 RED+GREEN preload bridge `getDaemonToken` (preload.mts manifest-expanded to TERRITORY). WB2 RED+GREEN mount.ts renderer-safe StatusListClient adapter using fetch + token + statusListClient prop pass to `<TileGridApp>`. Divergence-from-HttpSessionListClient tracked as Tier-2 followup at WB-final. | [r12-t1c-w1-phase5-mount-wiring.txt](territorial-manifests/r12-t1c-w1-phase5-mount-wiring.txt) (EXPANSION-1 2026-05-16 grants preload.mts WRITE) | NONE | IN-FLIGHT (HALT 0 done; awaiting OPT-β arbitration ack) |
| `r12-t1c-w1-t08-onboarding-renderer-mount` | **STALE-DISPATCH-RESOLVED 2026-05-16** — phase-1-diagnose discovered MB-F-MB-T08-ONBOARDING-RENDERER-MOUNT already shipped at batch-6 Session-C wiring-mounts (merge `9cc238b`; red `93c474b`; green `a89e52a`; main.ts sentinel `60058a1`). All 4 NEW artifacts confirmed at HEAD. Session HALTED at HALT-STALE-DISPATCH-0 before any code authored. FOLLOWUPS row 74 RESOLVED at gen-6 commit `d6b4107` + new Tier-3 `MB-F-FOLLOWUPS-RESOLVED-SWEEP-DISCIPLINE` filed same commit. | [r12-t1c-w1-t08-onboarding-renderer-mount.txt](territorial-manifests/r12-t1c-w1-t08-onboarding-renderer-mount.txt) | N/A | STALE-DISPATCH-RESOLVED → release to idle-standby OR /clear-and-reuse for T1-CLOSURE-Wave-2 work |
| `r12-t1c-w1-kanban-empty-state-ux` | **MB-F-WORKSTATION-KANBAN-EMPTY-STATE-UX** closure ticket (Tier 1; FOLLOWUPS:173; operator-visible perceived-broken-UI ship-gate). NEW `packages/dispatch-web/src/kanban/empty-state.tsx` component + `kanban-region.tsx` conditional-render edit + 2 probes. Target: render "No active sessions — click + Spawn Session to start" placeholder when zero non-killed sessions in `sessions.json`. 2-3 WBs + WB-final. **PATH-DISJOINT** from all sibling expansion sessions. **Pre-flight CLEAN** [KNOWN per gen-6 `git --no-pager log --all --grep` 2026-05-16; only hit = filing `a94fecb`]. | [r12-t1c-w1-kanban-empty-state-ux.txt](territorial-manifests/r12-t1c-w1-kanban-empty-state-ux.txt) | NONE | QUEUED (spawning) |
| `r12-t1c-w1-dispatch-core-post-pull-rebuild` | **MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE** closure ticket (Tier 1; FOLLOWUPS:172; build-infrastructure / typecheck-stability). Per row scope, 3 closure paths: (a) postinstall hook in dispatch-core/package.json (auto-ack candidate), (b) merge-gate script, (c) docs-only CLAUDE.md addition (operator-only). Session arbitrates Q-POSTPULL-1/2 at HALT 0. 2-3 WBs + WB-final. **PATH-DISJOINT** (root + dispatch-core package.json + scripts/post-pull-rebuild.sh) from all sibling sessions. **Pre-flight CLEAN** [KNOWN per gen-6 `git --no-pager log --all --grep` 2026-05-16; hits = filing `185057a` + 3 commit-body references but ZERO closure-keyed]. | [r12-t1c-w1-dispatch-core-post-pull-rebuild.txt](territorial-manifests/r12-t1c-w1-dispatch-core-post-pull-rebuild.txt) | NONE | QUEUED (spawning) |
| `r12-t1c-w1-parallel-cairn-atomic-commit` | **MB-F-PARALLEL-CAIRN-SHARED-INDEX-RACE-WINDOW** closure ticket path-(β) (Tier 1; FOLLOWUPS:348; methodology-affecting all parallel-cairn sub-sessions). NEW `scripts/cairn-atomic-commit.sh` tooling — single-command atomic `git add` + `git commit` + `git push` with index-race detection (pre-commit `git status --short` comparison vs pre-add baseline). Closure path-(α) per-session worktree migration + path-(γ) docs are operator-only and NOT in scope. 2-3 WBs + WB-final. **PATH-DISJOINT** from siblings (different scripts/ subpath from dispatch-core-post-pull-rebuild). **Pre-flight CLEAN** [KNOWN per gen-6 `git --no-pager log --all --grep` 2026-05-16; 2 hits = originating commits `e6b5dd9` + `d627096`; ZERO closure-keyed]. | [r12-t1c-w1-parallel-cairn-atomic-commit.txt](territorial-manifests/r12-t1c-w1-parallel-cairn-atomic-commit.txt) | NONE | QUEUED (spawning) |

**Active concurrent session count** [KNOWN per gen-6 monitor `/tmp/orch-gen6-monitor.log` heartbeat at this commit time]: 1 active impl (phase5) + 3 about-to-spawn (kanban + post-pull + atomic-commit) = 4. Operator cap = 6. Headroom for 2 additional in Wave T1-CLOSURE-Wave-1 if operator authorizes CONSOLE-T03 (FOLLOWUPS:138; STALE-DISPATCH-RISK requires operator review) or HSO-01 (FOLLOWUPS:249; MB-T37 scope clarification needed).

## CLOSURE-PENDING-OPERATOR-ARBITRATION (Tier-1 rows requiring operator-only territory per §5(XII); skip-and-surface per RESUME §5(XII))

These Tier-1 rows are recognized as closure-cascade candidates but require operator-arbitration of frozen contracts or path-of-closure decisions BEFORE a closure-impl session can be dispatched. Each row remains OPEN in `docs/FOLLOWUPS.md`; orchestrator skips dispatch + ANNOUNCES the blockage.

| row | tier | arbitration required | rationale |
|---|---|---|---|
| `MB-F-BOTTOM-RAIL-IMPL-PROD-WIRING-DEFERRED-WORKSTATION-CONTRACT-66-AMENDMENT-2026-05-16` | Tier 1 | `WORKSTATION_CONTRACT.md §6.6` amendment (add `coarchitect:bypass-perms-update` IPC channel) — operator-only per CLAUDE.md §1 frozen-contract scope | Items 3+4 of the 7-item closure path require channel addition; cannot proceed without operator authoring the §6.6 amendment first. Operator may either (i) author §6.6 amendment in advance + then orchestrator dispatches single-impl closure session, or (ii) split into a contract-authoring HALT + a subsequent impl-WB ladder. |
| `MB-F-MB-T08-VISION-PROJECT-LIST-CONFIG` | Tier 1 | Operator path-(a)-vs-(b) choice: (a) defer project-list config as v3.0.x followup; (b) extend MB-T08 onboarding with project-picker step before completion | Vision §8.1 ratification expects both API-key entry AND project-list config in first-launch flow. Path (a) ships MB-T08 satisfying API-key only; Path (b) extends onboarding. Choice is operator-arbitrated. |
| `MB-F-HSO-02-PROTOCOL-DRIFT-TEMPLATE-ENFORCEMENT` | Tier 1 | `packages/dispatch-workstation/src/main/hso-system-prompts/orchestrator.md` is operator-only frozen contract per CLAUDE.md §1 + ORCHESTRATOR_STATE_CONTRACT.md §2 | Closure requires audit + amend of MB-T41 HSO system prompt §H protocol references — operator-arbitrated content authoring; NOT CC-delegable. Surfaced as Wave T1-CLOSURE-Wave-1 candidate per subagent scan 2026-05-16; routed here per §5(XII). |
| `MB-F-CONSOLE-T03-SHELL-INTEGRATION` (Tier-1; FOLLOWUPS:138) | Tier 1 | STALE-DISPATCH-RISK — substantial code shipped at HEAD (`console-mount.ts:1-31` + `workstation-shell.html:752-755` sentinel zone "Session C / Batch 6 / wiring-mounts") may indicate row is PARTIALLY-CLOSED or FULLY-CLOSED-UNSTAMPED | Operator should verify row OPEN status via `git --no-pager log --all --grep "MB-F-CONSOLE-T03-SHELL-INTEGRATION"` before authorizing dispatch. If RESOLVED at batch-6 Session-C, file as RESOLVED stamp + skip dispatch (mirror MB-F-MB-T08-ONBOARDING-RENDERER-MOUNT precedent at `d6b4107`). |
| `MB-F-HSO-01-TURN-DISPATCH-SYNCHRONOUS` (Tier-1; FOLLOWUPS:249) | Tier 1 | Scope ambiguity — closure target = MB-T37 (OrchestratorPoolManager) which may not have a ticket body yet | Operator should clarify: (i) is MB-T37 ticket body authored? (`ls docs/build-docs/CONDUCTOR_MB-T37*.md`); (ii) is the closure single-session WB-ladder scope or full MB-T37 ticket scope? (iii) is HSO-01-TURN-DISPATCH part of an active workstream or deferred to v3.5? Defer dispatch pending operator scope decision. |

## COMPLETED — Round 11 Wave 5 (closure-stamped post `TERMINATE-ROUND-11` 2026-05-13)

8 work units shipped under gen-5 tenure 2026-05-13. Closure commits:

| session | scope | completion-commit |
|---|---|---|
| `t3-ticket-body-0905` | MB-T-PHASE-4-T8-SIBLING-EXEC ladder | `4507b49` (WB-final DONE-WITH-DEFERRED-LEG) |
| `c5-ticket-wb1` (continued) | MB-T-PHASE-4-T9-RATE-LIMIT-SOURCE-PLUG ladder | `de8022b` (WB-final docs + ADR-MBTPHASE4-T9PLUG-A) |
| `__orchestrator_standby` | P3 roadmap rev-3 | `b7e6dfe` (rev-3 + update-notes) |
| `t6-ticket-body-0905` | MB-T-PHASE-5-CTX-PERCENT-ACCURACY-DATA-FLOW ticket body | `1b66bc6` (SPECULATIVE Phase 5 forward-position) |
| `commit-plan-doc-1334` | MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW ticket body + WB ladder | `832c03b` (body) → `bf99f9d` (WB-final) + W4A `ff530b1` tsconfig amendment |
| `phase4-t8-exec` | MB-T-PHASE-4-METHODOLOGY-EPSILON-VISUAL-DIFF ladder | `8b48c10` (WB-final; 11/11 ε probes GREEN; ladder COMPLETE) |
| `phase4-t9-exec` | MB-T-PHASE-4-BYPASS-PERMS-INDICATOR-DATA-FLOW ladder | `28b0086` (WB7b coord; FINAL ARM CLOSED at component layer) |
| `gen-5 orchestrator` | 6 new Tier 2/3 followup filings | `30e4aa8` (FOLLOWUPS.md) |

---

## QUEUED — Wave 5 (Round 11 — superseded by Round 12 Wave 1 above; retained for archival)

(orchestrator-mediated direct dispatch; sessions begin IN-FLIGHT immediately on first commit)

| session | scope | territory | deps |
|---|---|---|---|
| `t3-ticket-body-0905` | **MB-T-PHASE-4-T8-SIBLING-EXEC** (Cluster F per P3-rev-2; consumer-side spawn-handler integration of Cluster A extensions) — ticket body + WB1+ | [t3-t8-sibling-exec.txt](territorial-manifests/t3-t8-sibling-exec.txt) | depends-on Cluster A done at `3e9a203` ✓ |
| `c5-ticket-wb1` | **MB-T-PHASE-4-T9-RATE-LIMIT-SOURCE-PLUG** (Cluster F per P3-rev-2; coarchitect-rate-limit-source production wiring) — ticket body + WB1+ | [c5-t9-rate-limit-source.txt](territorial-manifests/c5-t9-rate-limit-source.txt) | depends-on T9 plan-timer ladder done at `afd3778` ✓ |
| `commit-plan-doc-1334` | **MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW** (wireframe gap; tile status colors green/amber/red/grey production source) — ticket body + WB1+ | [commit-plan-doc-status-indicator.txt](territorial-manifests/commit-plan-doc-status-indicator.txt) | NONE |
| `t6-ticket-body-0905` | **MB-T-PHASE-5-CTX-PERCENT-ACCURACY-DATA-FLOW** ticket body forward-position (anticipated Phase 5 gap; per-tile ctx% accuracy) | [t6-phase5-ctx-percent.txt](territorial-manifests/t6-phase5-ctx-percent.txt) | NONE |
| `t1-ticket-body-0905` | MB-F-T7-CHATSHELL-POLISH-REMAINING-DOGFOOD-DRIVEN execution (light scope; close T7 row 357) | [t1-chatshell-polish.txt](territorial-manifests/t1-chatshell-polish.txt) | NONE (existing manifest) |
| `t2-ticket-body-0905` | round-11.md §5.C-§5.D coauthor continuation | [t2-archive-coauthor.txt](territorial-manifests/t2-archive-coauthor.txt) | coordinate-with r11-archive-writer (territorial-disjoint sub-sections) |
| `verify-chat-mount-1319` | MB-F-T7-TAB-SWITCHER-POLISH (T4-closure-dependent row 358 — T4 done; can execute now) | [verify-chat-mount-t7polish.txt](territorial-manifests/verify-chat-mount-t7polish.txt) | NONE (existing manifest) |
| `r11-manifest-validator` | Wave-4/5 manifest audit — 4 new Wave-4 manifests + 4 new Wave-5 manifests | [r11-manifest-validator.txt](territorial-manifests/r11-manifest-validator.txt) | NONE (continuation) |
| `r11-queue-watcher` | Wave-4/5 race-window proximity evidence continuation | [r11-queue-watcher.txt](territorial-manifests/r11-queue-watcher.txt) | NONE (continuation) |

## QUEUED — Wave 4 (Phase 3 trigger + Cluster F continuation) [in-flight]

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
