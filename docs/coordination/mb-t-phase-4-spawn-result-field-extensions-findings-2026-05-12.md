# MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS — Findings (2026-05-12)

**Ticket:** `docs/build-docs/CONDUCTOR_MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS_BUILD.md` (`2d938dc`)
**Session:** `phase4-t8-exec` Wave-3 redeploy (Round 11 §3.9 PHASE 2)
**Manifest:** `docs/coordination/territorial-manifests/phase4-t8-cluster-a-exec.txt`
**Coord doc:** `docs/coordination/coord-cluster-a-2026-05-12.md`
**Scope envelope:** (β)-style narrowing operator-arbitrated turn-N 4 items

Format: Wave B findings convention (I-X) — same structure as `mb-t-wireframe-t8-findings-2026-05-12.md` (`155933f`).

---

## I — What shipped

`[KNOWN]` at HEAD post-WB-final.

| WB | Verb | Commit | Surface | Lines |
|---|---|---|---|---|
| docs | docs | `2d938dc` | `CONDUCTOR_MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS_BUILD.md` (NEW; 234 lines; mechanical translation of phase-4-synthesis §2 + (β) §1.5 narrowing) | +234 |
| WB1 | red | `ce1d828` | `probe-mbtphase4-spawn-result-01-shape.spec.ts` (NEW; 4 conditions) | +165 |
| WB2 | green | `f943d21` | `dispatch-core/src/v3/spawn-result-fields.ts` (NEW; type contract + SPAWN_RESULT_FIELDS_MARKER) + dist rebuild | +62 |
| WB3 | green | `5328a97` | `dispatch-workstation/src/main/spawn-session-result-extensions.ts` (NEW; populator) — flips WB1 4/4 GREEN | +59 |
| WB-final | green (docs) | (this commit) | NEW findings + NEW coord doc | +per-file |

**Total session contribution:** 4 cairn-grammar commits + 1 WB-final docs commit; +520 lines (commits 1-4) + ~250 lines (this WB-final).

---

## II — Sub-Q disposition

`[KNOWN-OPERATOR-ARBITRATED]` per build-doc §3 (mechanical translation of synthesis §2.3 with (β) overrides):

| Sub-Q | Default (synthesis) | (β) Resolution | Status |
|---|---|---|---|
| A — model field source | (i) workstation extension | **(i) workstation populator module** | RESOLVED — WB3 ships |
| B — spawnedAtMs source | (iii) workstation extension | **(iii) populator `Date.now()` + caller injection** | RESOLVED — WB3 ships |
| C — spawnMode coord with commit-plan-doc-1334 | (i) absorb if landed first | **(ii) sibling-only** | RESOLVED — turn-N item 3; out-of-scope for t8-cluster-a |
| D — consumer non-regression scope | scoped suites | **scoped: test/unit/main + core/workstation typecheck at WB-final** | RESOLVED — see §IV |
| E — getContextWindow wiring | (α) include in-bundle | **(β) defer to sibling** | RESOLVED — wiring target `tile-header.tsx:139` FORBIDDEN per manifest; sibling-flippable |

---

## III — Architectural deltas

### III.1 — Pure-fn populator + dist-marker pattern

`[KNOWN]` `spawn-result-fields.ts` is a TypeScript type-only module compiled to runtime-empty `.js`. To make the WB1 probe Condition (2) verifiable at runtime (dispatch-core dist rebuild evidence), the module exports a `SPAWN_RESULT_FIELDS_MARKER` constant. Production code does NOT import this marker — it has zero runtime utility outside cairn-RED-shield verification.

**Why this pattern over a Zod runtime schema:**
- Type contract is sufficient for cross-package use (TypeScript catches mismatches at workstation import).
- Adding a Zod schema would introduce a new validation surface that's never invoked in production code.
- Marker-constant pattern provides minimal runtime overhead + targeted cairn evidence.

### III.2 — Workstation imports dispatch-core via `dist/v3/` (per CLAUDE.md §3.4)

`[KNOWN]` Workstation populator imports `from 'dispatch-core/dist/v3/spawn-result-fields.js'`. TypeScript path-mapping resolves both source (`.ts`) and dist (`.js`) at typecheck time, but Node ESM at runtime requires dist `.js` per `MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE`.

WB2 GREEN ran `pnpm --filter dispatch-core build` immediately post-author to ensure the dist artifact exists before WB3 GREEN (workstation populator) imports it.

### III.3 — Option (b) NEW MODULE — (β) discipline preservation

`[KNOWN]` Concurrent sibling `commit-plan-doc-1334` had `spawn-handler.ts` modified in working-tree at session start. Option (b) (operator turn-N item 4) authored t8-cluster-a ENTIRELY in a NEW module (`spawn-session-result-extensions.ts`) rather than modifying `spawn-handler.ts`. This:
- Eliminated cross-session-contamination risk (sibling-working-tree edits never visible in any t8 commit).
- Preserved sibling autonomy — `commit-plan-doc-1334` can complete its WB3 GREEN spawnMode integration without coordination with t8.
- Created a clean integration surface for FUTURE sibling-wiring sessions (recipe in coord doc §2.1).

### III.4 — Frozen-surface discipline

`[KNOWN]` Zero frozen-surface modifications:
- `dispatch-core/src/v3/schema.ts` §1-§13 UNTOUCHED — new file is SIBLING.
- `CONDUCTOR_API_CONTRACT.md` UNTOUCHED.
- `WORKSTATION_CONTRACT.md` §6 UNTOUCHED.
- `REGISTRY.md` §2 UNTOUCHED.

---

## IV — Probe distribution

`[KNOWN]` Verified at HEAD post-WB3:

| Suite | New probes (this ticket) | Conditions | Status |
|---|---|---|---|
| `dispatch-workstation/test/unit/main/` | 1 (`probe-mbtphase4-spawn-result-01-shape.spec.ts`) | 4 (file existence + dist marker + workstation file existence + populator behavior 5-sub-conditions) | 4/4 GREEN |

Typecheck status (per CLAUDE.md §4.4 partial — workstation + dispatch-core required this session):
- `pnpm --filter dispatch-core typecheck` → clean.
- `pnpm --filter dispatch-workstation typecheck` → clean.

Daemon + CLI + web typechecks not run this session (no dispatch-core export touched daemon/CLI/web consumers — extension module is workstation-internal).

---

## V — Architecture notes (post-ship state)

`[MODELED]` Composite state of spawn-result-field extensions:

```
┌─────────────────────────────────────────────────────────────┐
│ DISPATCH-CORE (in t8 territory; shipped)                    │
│                                                             │
│  src/v3/spawn-result-fields.ts                              │
│    export interface SpawnResultExtensionFields {            │
│      readonly model?: string;                               │
│      readonly spawnedAtMs: number;                          │
│    }                                                        │
│    export const SPAWN_RESULT_FIELDS_MARKER (runtime sentinel) │
│                                                             │
│  dist/v3/spawn-result-fields.{js,d.ts} (gitignored;         │
│    rebuilt at WB2 GREEN per CLAUDE.md §3.4)                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼  imported (type-only at .ts; dist-resolved at runtime)
┌─────────────────────────────────────────────────────────────┐
│ DISPATCH-WORKSTATION main (in t8 territory; shipped)        │
│                                                             │
│  src/main/spawn-session-result-extensions.ts                │
│    populateSpawnSessionResultExtensions(input):             │
│      SpawnResultExtensionFields                             │
│        - precedence: input.model > input.defaultModel >     │
│          undefined                                          │
│        - spawnedAtMs: input.now ?? Date.now()               │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ FUTURE: sibling consumer-wiring session(s)
                 │ integrates via additive spread (recipe in
                 │ coord-cluster-a §2.1)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ DISPATCH-WORKSTATION main (sibling territory; NOT in t8)    │
│                                                             │
│  src/main/spawn-handler.ts                                  │
│    SpawnSessionResult extends SpawnResultExtensionFields { … }│
│    return { ...populateSpawnSessionResultExtensions(…), … } │
│                                                             │
│  Concurrent edit hazard at session start: commit-plan-doc-  │
│  1334 mid-WB3 GREEN for spawnMode arm. (β) option (b)       │
│  preserved disjointness — no t8 commit touched this file.   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼  FUTURE: tile-grid consumer-wiring session
┌─────────────────────────────────────────────────────────────┐
│ DISPATCH-WORKSTATION tile-grid (FORBIDDEN to t8; sibling)   │
│                                                             │
│  tile-grid.tsx — TileGridSessionEntry extends with new fields│
│  tile-grid-app.tsx — SpawnSuccessReply parsing extension    │
│  tile-header.tsx:139 — getContextWindow(model) wiring       │
│    (Sub-Q-E (β-deferred); closes MB-F-C5-MODEL-CONTEXT-     │
│    WINDOW-WIRING-GAP at sibling ship)                       │
└─────────────────────────────────────────────────────────────┘
```

**Outcome classification per CLAUDE.md §2.11:** *Capability enabled with known limitations* — extension contract ship-ready; runtime end-to-end consumer rendering awaits sibling integration sessions (3-arm closure: commit-plan-doc-1334 + tile-grid + tile-header).

---

## VI — Documentation drift

`[KNOWN]` Phase-4-synthesis §2 DRAFT (`52f3d04`) was authored against the original (synthesis §2.2) construction order — referenced `spawn-handler.ts` mods + `tile-grid.tsx` mods + `tile-grid-app.tsx` mods + `tile-header.tsx` mods. Manifest narrowed scope to ship-module-only.

**Resolution:** build-doc §1.5 + §2.2 + §3 Sub-Q resolutions document the (β) narrowing explicitly. Original synthesis §2 retained verbatim per CLAUDE.md §3.4 mechanical-translation traceability.

`[KNOWN]` Probe-naming divergence (synthesis `probe-mbtwfprfe-*` vs manifest `probe-mbtphase4-spawn-result-*`) resolved by operator turn-N item 2 ack.

---

## VII — Consumer non-regression

`[KNOWN]` Per Sub-Q-D scoped-suite discipline:
- `test/unit/main/` ran clean across WB1-WB3 (only the new probe in this dir reachable for the new code path; no existing tests in `test/unit/main/` touched the populator).
- Pre-existing daemon failure (`cc-console-buffer-migration.test.ts:89` per CLAUDE.md §4.5) — not re-diagnosed; not impacted by this session's dispatch-core sibling-file extension.
- T8 (β) workstation cost-meter probes + T9 plan-timer probes UNTOUCHED — disjoint territory.

No regression observable in this session's scope.

---

## VIII — WB skip rationale

`[KNOWN]` Synthesis §2.4 specified additional WBs (WB6 spawnMode arm, WB7 getContextWindow). Both **out-of-scope under (β) narrowing**:

- **WB6 spawnMode arm** → Sub-Q-C=(ii) sibling-only (commit-plan-doc-1334 territory). Skip rationale documented in build-doc §3 + coord doc §3.2.
- **WB7 getContextWindow** → Sub-Q-E=(β) sibling-deferred (target `tile-header.tsx:139` FORBIDDEN per manifest). Skip rationale documented in build-doc §3.

**Outcome classification per CLAUDE.md §2.11:** *Capability enabled with known limitations*.

---

## IX — Deferred followups + observations

### IX.1 — NOT closed by t8-cluster-a (FORBIDDEN access)

Manifest FORBIDS `docs/FOLLOWUPS.md`. The following followups REMAIN OPEN at end of session; full closure requires sibling-session ship + operator-driven stamp pass:

- `MB-F-FRAME-C-UPTIME-LOST-ON-FRAME-TOGGLE-2026-05-12` (Tier 3) — closure-path-(iii) ship-CONTRACT delivered (extension fields); ship-IMPL requires sibling consumer wiring spawnedAtMs through TileGridSessionEntry persistence.
- `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` (Tier 2) — NOT closed; sibling `commit-plan-doc-1334` territory per Sub-Q-C=(ii).
- `MB-F-C5-MODEL-CONTEXT-WINDOW-WIRING-GAP` (Tier 3) — NOT closed; Sub-Q-E (β-deferred).
- P3 §1.1 rows MODEL-SOURCE-WIRING + UPTIME-SPAWN-TIME-SOURCE — *contract* ship; *consumer* ship pending sibling.

### IX.2 — Audit reclassification

Audit doc (`docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md`) NOT in territory. Audit §7 Dim 5 rows `model` + `time` — ship-CONTRACT delivered; row-state update is sibling/operator-driven natural cycle.

### IX.3 — Patterns surfaced for §3.9.D archive

`[KNOWN]` Three findings worth Round-11-archive capture:

1. **Per-path discipline necessary but not sufficient under live shared-territory edits.** Documented in coord doc §4 item 2. Mitigation: option (b) NEW MODULE (this session) OR pre-coord wait-for-commit (alternative untaken). Pattern applies to ANY Wave-N session with shared-territory hazard.

2. **Pre-commit `git status --short` MANDATORY gate verified working under churn.** Documented in coord doc §4 item 4. Working-tree state visible at each WB pre-commit varied (sibling files appearing/disappearing); gate caught/documented each state without false-positive intervention.

3. **Probe-naming convention mismatch between DRAFT and manifest** caught at HALT-TERRITORY-ACK; resolved by operator turn-N item 2. Pattern: manifest-encoded probe paths bind over DRAFT-authoring conventions; verify at WB1 start.

### IX.4 — Pre-existing failure (for visibility, NOT closing)

`[KNOWN]` Per CLAUDE.md §4.5 + last session findings (T8 β findings §IX.3):
- `cc-console-buffer-migration.test.ts:89` continues to deterministically fail in daemon suite. ZERO coupling to t8-cluster-a (no daemon code touched this session). Flag remains for dedicated cleanup ticket.

---

## X — Open items + forward checklist

`[KNOWN]` For full ticket DoD (build-doc §7) closure, the following sibling-session work is required:

1. **commit-plan-doc-1334 continuation** OR future session with `spawn-handler.ts` WRITE territory: integrate `populateSpawnSessionResultExtensions` call at `spawnSession()` entry; spread extension fields into `SpawnSessionResult` return. Closes WB1 condition for sibling-integration evidence.

2. **NEW sibling tile-grid consumer-wiring session**: extend `TileGridSessionEntry` type with model + spawnedAtMs; extend `SpawnSuccessReply` parsing; thread fields through entry construction at `tile-grid-app.tsx:121-141`. Closes consumer-render arm.

3. **NEW sibling tile-header context-window session**: swap `tile-header.tsx:139` hardcoded 200_000 for `getContextWindow(entry.model ?? '')`. Closes `MB-F-C5-MODEL-CONTEXT-WINDOW-WIRING-GAP`. Sub-Q-E full closure.

4. **Operator stamp pass** (FORBIDDEN to t8-cluster-a): apply 3-4 row deltas to `docs/FOLLOWUPS.md` + audit §7 Dim 5 reclassification + audit §10.6-style row updates.

5. **Runtime smoke** (post-1+2+3): launch electron; spawn ≥2 sessions; verify Frame C session rows render with populated model badge + ticking uptime + (if spawnMode='auto') bypass-perms indicator. Per CLAUDE.md §4.6 runtime-launch smoke discipline.

**Until items 1-3 complete**: extension contract is ship-ready but invisible at electron runtime — operator-visible UX still renders without model badge / with stale uptime. This is expected (β) ship semantics — contract delivery before consumer integration.

---

## XI — Round 11 PHASE 2 invariant compliance

`[KNOWN]` Operator turn-N MANDATORY discipline verified across all 4 cairn commits:

| Invariant | Compliance evidence |
|---|---|
| Per-path `git add` | 4/4 commits — explicit single-file `git add <path>` per commit |
| Per-path `git commit -- pathspec` | 4/4 commits — explicit `git commit ... -- <path>` |
| Pre-commit `git status --short` mandatory | 4/4 commits — status check pre-staging at each WB |
| Refuse-to-commit if outside-territory files in pathspec | N/A — no instance triggered; pathspec discipline preserved invariant |
| Manifest glob match | 4/4 — verified per CLAUDE.md §3.9.A at each pathspec |

Coord doc §5 documents disjointness metrics (4 files in pathspec; 0 sibling-territory files in any commit).

---

**End of MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS findings (2026-05-12).**
