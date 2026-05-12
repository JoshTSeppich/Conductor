# MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS — SpawnSessionResult model + spawnedAtMs extension fields

**Status:** EXECUTABLE — formal build-doc landed under (β)-style scope-narrowed envelope (Round 11 §3.9 Wave 3).
**Authoring date:** 2026-05-12
**Authoring delegate:** `phase4-t8-exec` (cluster-a manifest at `docs/coordination/territorial-manifests/phase4-t8-cluster-a-exec.txt`).
**Authoring source:** mechanical translation per CLAUDE.md §3.4 of `docs/coordination/phase-4-synthesis-2026-05-12.md` §2 (DRAFT at `52f3d04`, authored by `__orchestrator_active` Wave-2). Translation map per synthesis §4.2.
**(β)-style scope narrowing:** operator-arbitrated 2026-05-12 turn-N (this dispatch); manifest WRITE territory excludes `tile-grid/tile-grid.tsx` + `tile-grid/tile-grid-app.tsx` + `tile-header.tsx` paths cited in synthesis §2.2. Scope narrows to **module-ship only**; consumer-side wiring is sibling-flippable.
**Authoring anchor commit (HEAD at authoring time):** `1402e15`

**Closes / advances:**
- P3 §1.1 row `MB-T-PHASE-4-MODEL-SOURCE-WIRING` — *source-of-truth contract shipped*; sibling closes when consumers wire.
- P3 §1.1 row `MB-T-PHASE-4-UPTIME-SPAWN-TIME-SOURCE` — *source-of-truth contract shipped*; sibling closes when consumers wire.
- `MB-F-FRAME-C-UPTIME-LOST-ON-FRAME-TOGGLE-2026-05-12` (Tier 3) — closure-path-(iii) progressed (extension fields ship); full closure on sibling consumer wiring.
- Audit §7 Dim 5 rows `model` + `time` — advance from STUB → "extension contract shipped"; full SHIPPED-VIA-WORKSTATION-EXTENSION on sibling wiring.

**Out of (β)-narrowed scope (sibling-flippable):**
- `SpawnSessionResult.spawnMode` arm — owned by Wave-2 sibling `commit-plan-doc-1334` (mid-WB3 GREEN at HEAD `1402e15`).
- Consumer-side wiring at `tile-grid/tile-grid.tsx`, `tile-grid/tile-grid-app.tsx`, `tile-header.tsx`.
- `getContextWindow(model)` wiring (Sub-Q-E=(α) from synthesis §2.3.5) at `tile-header.tsx:139`.
- Audit reclassification + FOLLOWUPS closure stamps (FORBIDDEN paths per manifest).

**Depends on (all merged):**
- `SpawnSessionResult` shape at `packages/dispatch-workstation/src/main/spawn-handler.ts` (MB-T05 + MB-T18 `cwd` field) — current SpawnSessionResult exposes `sessionName, sessionId, panelMounted, cwd`; this ticket ships the **extension contract** that sibling integrates additively.
- `SpawnSessionRequest` shape at same path — exposes `repoPath, sessionName, permissionMode?` — populator consumes via type compatibility, not direct import.
- `dispatch-core/src/v3/schema.ts` §1-§13 (FROZEN) — extension module is sibling file, NOT a §1-§13 modification.

---

## §0 — Reading protocol

1. Read §1 (scope) + §1.5 ((β) narrowing) first to bind ship-envelope.
2. Read §2 (arbitration anchor + construction order) for file ownership under (β).
3. Read §3 (Sub-Q resolutions) — all five Sub-Q gates resolved at authoring time per synthesis §2.3 + this session's operator turn-N.
4. Read §4 (WB ladder) for execution order.
5. §5-§9 are operational supports.

Confidence labels per CLAUDE.md §2.2: `[KNOWN]` observed at HEAD `1402e15` direct-read; `[MODELED]` reasoned from observed facts + stated model; `[KNOWN-OPERATOR-ARBITRATED]` operator-acked this dispatch turn.

---

## §1 — Scope

### §1.1 — What this ticket DOES (under (β) narrowing)

`[KNOWN-OPERATOR-ARBITRATED]` per operator turn-N ack of items 1-4 (β-style reshape; see §1.5):

1. **NEW `packages/dispatch-core/src/v3/spawn-result-fields.ts`** — type-only module exporting `SpawnResultExtensionFields` interface with `model?: string` + `spawnedAtMs: number` field shape. ADDITIVE under CLAUDE.md §1 frozen-surface discipline (sibling file to `schema.ts §1-§13`; not part of §1-§13).

2. **NEW `packages/dispatch-workstation/src/main/spawn-session-result-extensions.ts`** — pure-fn populator module exporting `populateSpawnSessionResultExtensions(input): SpawnResultExtensionFields` that derives:
   - `model` from explicit input OR env-var fallback (`CLAUDE_DEFAULT_MODEL` / similar) OR `undefined`.
   - `spawnedAtMs` from explicit `now` input OR `Date.now()` at invocation time.

3. **NEW probes at `packages/dispatch-workstation/test/unit/main/probe-mbtphase4-spawn-result-*.spec.ts`** — multi-condition contract probe for the extension module + dispatch-core type.

4. **Documentation:** this build-doc, WB-final findings doc, cluster-a coord doc.

### §1.2 — What this ticket DOES NOT (under (β) narrowing)

`[KNOWN-OPERATOR-ARBITRATED]` constraints from manifest FORBIDDEN list + operator turn-N items 1+3:

- Does NOT modify `packages/dispatch-workstation/src/main/spawn-handler.ts` (live concurrent-edit hazard at HEAD `1402e15`; sibling `commit-plan-doc-1334` mid-WB3 GREEN; operator item 4 = option (b) NEW MODULE preserves zero-sweep guarantee).
- Does NOT modify `tile-grid/tile-grid.tsx` (FORBIDDEN; sibling integration territory).
- Does NOT modify `tile-grid/tile-grid-app.tsx` (FORBIDDEN; sibling integration territory).
- Does NOT modify `tile-grid/tile-header.tsx` (out of territory; Sub-Q-E=(α) `getContextWindow` wiring is sibling-flippable).
- Does NOT modify `dispatch-core/src/v3/schema.ts` §1-§13 (FROZEN per CLAUDE.md §1; extension module is SIBLING file).
- Does NOT modify `WORKSTATION_CONTRACT.md` §6 (FROZEN).
- Does NOT close `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` — sibling-owned per Sub-Q-C=(ii) (operator turn-N item 3).
- Does NOT close `MB-F-C5-MODEL-CONTEXT-WINDOW-WIRING-GAP` — Sub-Q-E (β-deferred to sibling).
- Does NOT stamp `docs/FOLLOWUPS.md` or audit doc (FORBIDDEN per manifest).
- Does NOT introduce electron-store; pure-fn extension contract has no persistence.
- Does NOT touch tile-grid, frame-c-ipc, or chat-shell components.

### §1.5 — (β)-style scope narrowing (operator-arbitrated turn-N 2026-05-12)

`[KNOWN-OPERATOR-ARBITRATED]` 2026-05-12 turn-N dispatch — operator acked 4 items at HALT-TERRITORY-MISMATCH-CLUSTER-A surface:

| Item | Operator ack |
|---|---|
| 1 | Cluster A scope narrowing per manifest — *consumer-side wiring (tile-grid/*, tile-header) is sibling-flippable*. |
| 2 | Probe-naming canonical pattern = `probe-mbtphase4-spawn-result-*.spec.ts` (NOT synthesis §2.2's `probe-mbtwfprfe-*` prefix). |
| 3 | Sub-Q-C = (ii) sibling-only for spawnMode arm; T8-cluster-a scope = **model + spawnedAtMs ONLY**. |
| 4 | Option (b) NEW MODULE approach — author entirely in `spawn-session-result-extensions.ts` (manifest pattern `spawn-session-result*.ts` ✓); zero risk of sweeping sibling `commit-plan-doc-1334` working-tree edits; matches T8-(β) "ship the module, let sibling wire" pattern. |

**Ship-envelope summary:** module + type + probes + docs. **Sibling integrates** via additive spread into `SpawnSessionResult` interface + populator call from `spawnSession()`.

---

## §2 — Arbitration anchor

### §2.1 — Synthesis-doc translation provenance

`[KNOWN]` Mechanical translation of `docs/coordination/phase-4-synthesis-2026-05-12.md` §2 (`52f3d04`) per CLAUDE.md §3.4 + synthesis §4.2 translation map. Original DRAFT §2 sections preserved verbatim where compatible with (β) narrowing; §2.2 construction order REDUCED to (β) ship-envelope.

### §2.2 — Construction order under (β) (file ownership)

`[KNOWN-OPERATOR-ARBITRATED]`:

- **NEW** `packages/dispatch-core/src/v3/spawn-result-fields.ts` — type-only module.
- **NEW** `packages/dispatch-workstation/src/main/spawn-session-result-extensions.ts` — populator module.
- **NEW** `packages/dispatch-workstation/test/unit/main/probe-mbtphase4-spawn-result-01-shape.spec.ts` — contract probe.
- **NEW** `docs/coordination/mb-t-phase-4-spawn-result-field-extensions-findings-2026-05-12.md` — WB-final findings.
- **NEW** `docs/coordination/coord-cluster-a-2026-05-12.md` — sibling coord notes.
- **NEW** this file (`CONDUCTOR_MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS_BUILD.md`).

Path-disjoint from co-active sub-sessions per manifest + dispatch-queue:
- `commit-plan-doc-1334`: TOUCHES `spawn-handler.ts` (mid-WB3); option (b) NEW MODULE keeps this session disjoint by NOT touching spawn-handler.
- `c5-ticket-wb1`: TOUCHES `tile-grid-app.tsx`; FORBIDDEN to this session.
- `t6-ticket-body-0905` (Wave-3 sibling): `phase4-t9-exec` working on `MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW`; path-disjoint.

### §2.3 — Frozen-contract amendment scoping

`[KNOWN]` Per CLAUDE.md §1 + §3.4 + this session's (β) narrowing:
- ZERO frozen-surface touch.
- NEW `dispatch-core/src/v3/spawn-result-fields.ts` is a SIBLING file to FROZEN `schema.ts §1-§13`; the FROZEN file is unmodified.
- No `WORKSTATION_CONTRACT.md` §6 amendment; no new IPC channels.

---

## §3 — Sub-Q resolutions (operator-acked at authoring time)

All five Sub-Q gates from synthesis §2.3 resolved at authoring time (no HALT cycles required).

| Sub-Q | Default (synthesis) | (β) Resolution this session | Rationale |
|---|---|---|---|
| §2.3.1 A — model field source | (i) workstation spawn-handler extension | **(i) workstation extension module** | Populator accepts `model` from caller input + `CLAUDE_DEFAULT_MODEL` env fallback; sibling threads through `SpawnSessionRequest`. Workstation-internal; zero frozen-surface touch. |
| §2.3.2 B — spawnedAtMs source | (iii) workstation spawn-handler extension | **(iii) populator `Date.now()` at invocation** | True-session-uptime via populator + caller injection (`now?: number` for testability); sibling integrates into `spawnSession()` request-handler entry. |
| §2.3.3 C — spawnMode coord | (i) absorb if landed first; impl directly otherwise | **(ii) sibling-only** | commit-plan-doc-1334 has WB1+WB2-RED shipped + mid-WB3-GREEN live (`228a2da`, `227bd2e`, working-tree-modified). Sub-Q-C=(ii) per operator turn-N item 3. T8-cluster-a scope excludes spawnMode arm. |
| §2.3.4 D — consumer non-regression scope | scoped consumer suites | **scoped: `test/unit/main/` per WB; daemon+core typecheck at WB-final** | Per CLAUDE.md §4.4 + §9. No full workstation suite per WB. |
| §2.3.5 E — getContextWindow wiring | (α) include in-bundle | **(β) defer to sibling** | Wiring target is `tile-header.tsx:139` — FORBIDDEN per manifest. Sibling-flippable; `MB-F-C5-MODEL-CONTEXT-WINDOW-WIRING-GAP` stays OPEN at end of this session. |

---

## §4 — WB ladder (operative under (β))

5 commits baseline (1 docs + 3 cairn + 1 WB-final). Construction order: build-doc (this commit) → RED probe → GREEN dispatch-core type → GREEN workstation populator → WB-final docs.

| WB | Verb | Surface | Acceptance | Frozen contracts |
|---|---|---|---|---|
| (this) | docs | `CONDUCTOR_MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS_BUILD.md` (NEW) | build-doc lands; ticket-body anchor for §4 cairn ladder | none |
| WB1 | red | NEW `probe-mbtphase4-spawn-result-01-shape.spec.ts` (4 conditions; dispatch-core type + workstation populator) | probe RED at HEAD (both modules absent); flips at WB2+WB3 | none |
| WB2 | green | NEW `packages/dispatch-core/src/v3/spawn-result-fields.ts` (type-only) + `pnpm --filter dispatch-core build` | probe Condition (1) + (2) GREEN; dispatch-core dist rebuilt per CLAUDE.md §3.4 | none |
| WB3 | green | NEW `packages/dispatch-workstation/src/main/spawn-session-result-extensions.ts` (populator) | probe Condition (3) + (4) GREEN; WB1 fully GREEN | none |
| WB-final | green (docs) | NEW findings doc + NEW coord doc + scope-final stamp here | findings doc lands; coord doc lands; ticket §X marked CLOSED-UNDER-(β) | none |

---

## §5 — Cross-references

**Followups CLOSED / ADVANCED by this ticket:**

| Followup / Row | Tier | Closure path | Closing WB |
|---|---|---|---|
| `MB-F-FRAME-C-UPTIME-LOST-ON-FRAME-TOGGLE-2026-05-12` (T1 findings) | 3 | WB3 ships populator for closure-path-(iii) extension fields; sibling consumer wiring completes full closure | WB3 (advance) |
| `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` | 2 | NOT closed here — sibling commit-plan-doc-1334 territory per Sub-Q-C=(ii) | n/a (sibling) |
| `MB-F-C5-MODEL-CONTEXT-WINDOW-WIRING-GAP` | 3 | NOT closed here — Sub-Q-E=(β) defer to sibling consumer ticket | n/a (sibling) |
| P3 §1.1 row `MB-T-PHASE-4-MODEL-SOURCE-WIRING` | (roadmap) | WB3 ships populator (model source contract); sibling consumer wires render | WB3 (advance) |
| P3 §1.1 row `MB-T-PHASE-4-UPTIME-SPAWN-TIME-SOURCE` | (roadmap) | WB3 ships populator (spawnedAtMs source contract); sibling consumer wires render | WB3 (advance) |
| P3 §1.1 row `MB-T-PHASE-4-SPAWN-MODE-FIELD` | (roadmap) | NOT closed — sibling commit-plan-doc-1334 territory | n/a (sibling) |
| Audit §7 Dim 5 rows `model` + `time` | (audit) | EXTENSION-CONTRACT-SHIPPED; SHIPPED-VIA-WORKSTATION-EXTENSION pending sibling | WB-final (advance) |

**Related shipped tickets (read-required at WB1 start):**

| Ticket | Anchor | Read scope |
|---|---|---|
| MB-T05 spawn-handler | (current HEAD) | `SpawnSessionRequest` + `SpawnSessionResult` shapes |
| MB-T18 tile-footer | (history) | `cwd` propagation precedent on SpawnSessionResult |
| MB-T-WIREFRAME-T1 | `8eab991` body | model badge + uptime renderer (downstream consumer; sibling integrates with extension fields) |
| MB-T-WIREFRAME-T8 | `155933f` (β) | (β)-style "ship module, let sibling wire" pattern precedent |
| MB-T-WIREFRAME-T9 | `afd3778` | skeleton-with-deferred-source pattern precedent |

**Dispatch + roadmap anchors:**
- `docs/coordination/phase-4-synthesis-2026-05-12.md` (`52f3d04`) §2 (DRAFT translation source)
- `docs/coordination/phase-4-status-2026-05-12.md` (`1e936a0`) §3.1 cluster status + §6 operator-acked defaults
- `docs/coordination/phase-4-tier-1-roadmap-draft.md` (`d009e6f`) §1.1 + §4 Cluster A bundling rationale

**Co-active session coordination (Wave-3):**
- `commit-plan-doc-1334` — TOUCHES `spawn-handler.ts` (mid-WB3 GREEN); option (b) NEW MODULE preserves disjointness. Coord doc: `docs/coordination/coord-cluster-a-2026-05-12.md`.
- `phase4-t9-exec` — Wave-3 sibling on `MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW`; path-disjoint.
- `c5-ticket-wb1`, `t3-ticket-body-0905`, `t6-ticket-body-0905`: path-disjoint.

---

## §6 — Self-check Q1-Q9 expectations per WB commit (CONDUCTOR_API_CONTRACT.md §10.5)

| WB | Q1 (spike?) | Q2 (mocks?) | Q3 (impl-deleted-passes?) | Q4 (outside contract?) | Q5 (frozen mod?) | Q6 (labels?) | Q7 (parallel territory?) | Q8 (bypass PATCH?) | Q9 (halt-unauth?) |
|---|---|---|---|---|---|---|---|---|---|
| docs | N/A | N/A | N/A | No | No | KNOWN/MODELED | new build-doc path-disjoint | N/A | No |
| WB1 RED | N/A | BEHAVIOR (fs-read sentinels + dynamic import) | No — modules absent | No | No | KNOWN | new probe path-disjoint; sibling `spawn-handler.ts` working-tree-modified — NOT in pathspec | N/A | No |
| WB2 GREEN | N/A | BEHAVIOR (type contract via import) | No — flip-target | No | No (additive sibling file) | KNOWN | new core file path-disjoint | N/A | No |
| WB3 GREEN | N/A | BEHAVIOR (real populator unit) | No — flip-target | No | No | KNOWN | new workstation file path-disjoint; sibling `spawn-handler.ts` still working-tree-modified — NOT in pathspec | N/A | No |
| WB-final | N/A | N/A — docs | N/A | No | No | KNOWN | 3 doc paths in pathspec | N/A | No |

---

## §7 — Definition of done (under (β))

The ticket is DONE-UNDER-(β) when ALL of the following hold:

1. WB1-WB-final cairn ladder lands; commit chain pushed to origin/main per CLAUDE.md §2.6.
2. `SpawnResultExtensionFields` interface exported from dispatch-core `v3/spawn-result-fields.ts` with `model?: string` + `spawnedAtMs: number`.
3. `populateSpawnSessionResultExtensions(input)` exported from workstation `spawn-session-result-extensions.ts`; pure-fn; testable.
4. WB1 probe 4/4 GREEN post-WB3.
5. `pnpm --filter dispatch-core build` clean (dist artifacts updated per CLAUDE.md §3.4).
6. `pnpm --filter dispatch-core typecheck` clean.
7. `pnpm --filter dispatch-workstation typecheck` clean.
8. No regression in shipped probes (scoped daemon + core + workstation `test/unit/main/`).
9. WB-final findings doc + coord doc land at manifest paths.
10. **Sibling continuity:** ship-envelope provides clean integration surface for sibling consumer-wiring session (clear type signature; pure-fn populator).

**DONE-UNDER-(β)** is partial closure relative to synthesis §2.7 DoD items 4-6, 10-12 (consumer render evidence) — those require sibling consumer-wiring ship.

---

## §8 — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `commit-plan-doc-1334` working-tree-modifications to `spawn-handler.ts` swept into a t8-cluster-a commit | `[KNOWN-OPERATOR-DOCUMENTED]` | `[KNOWN-HIGH]` (cross-session contamination) | Option (b) NEW MODULE eliminates this — `spawn-handler.ts` NEVER appears in any pathspec this session. Pre-commit `git status --short` MANDATORY refuse-to-commit gate. |
| Sibling consumer-wiring session imports populator with mismatched signature | `[MODELED-LOW]` | `[MODELED-MEDIUM]` (typecheck failure) | Populator signature stable per dispatch-core type contract; sibling typecheck catches mismatch |
| `CLAUDE_DEFAULT_MODEL` env var name conflicts with existing env semantics | `[MODELED-LOW]` (env-namespace fresh) | `[MODELED-LOW]` (cosmetic) | Verify at WB3 by env-grep; document fallback semantics in module header |
| `Date.now()` non-determinism in tests | `[MODELED-MEDIUM]` per cairn discipline | `[MODELED-LOW]` (tests inject `now`) | Populator accepts optional `now: number` parameter; tests inject deterministic value |
| dispatch-core build out-of-sync with workstation imports | `[KNOWN]` per CLAUDE.md §3.4 + `MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE` | `[MODELED-MEDIUM]` (ERR_MODULE_NOT_FOUND at runtime) | WB2 runs `pnpm --filter dispatch-core build` before WB3 GREEN |

---

## §9 — §6.6 amendment outline

`[KNOWN]` Default Sub-Q resolutions produce ZERO frozen-surface touch. No `WORKSTATION_CONTRACT.md` §6 amendment. No new IPC channels.

---

**End of MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS build-doc.**

Status: EXECUTABLE under (β) narrowing. Operator turn-N items 1-4 acked. Sibling continuity via NEW module pattern; commit-plan-doc-1334 working-tree disjointness preserved.
