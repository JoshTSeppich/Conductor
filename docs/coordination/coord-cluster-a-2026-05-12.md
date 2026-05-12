# Coord: Cluster A Wave-3 cross-session coordination (2026-05-12)

**Scope:** Coordination notes for `phase4-t8-exec` (Cluster A bundled-ticket exec, this session) ↔ Wave-2 in-flight `commit-plan-doc-1334` (spawnMode arm) ↔ Wave-3 sibling `phase4-t9-exec` (T10) under Round 11 §3.9 PHASE 2 dispatch.

**Sessions:**
- `phase4-t8-exec` (this session, Wave-3 redeploy) — Cluster A bundled-ticket exec under (β) narrowing. Manifest: `phase4-t8-cluster-a-exec.txt`.
- `commit-plan-doc-1334` (Wave-2 in-flight) — `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` closure-(a): spawnMode field + spawn-handler plumbing + FrameCRoot pass-through. Manifest: `commit-plan-doc-spawnmode.txt`.
- `phase4-t9-exec` (Wave-3) — `MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW`. Manifest: `phase4-t9-t10-exec.txt`. Path-disjoint from Cluster A.

---

## §1 — Shared-edit hazard at spawn-handler.ts (resolved via (β) option (b))

### §1.1 — Observed state at session start

`[KNOWN]` Per `git status --short` at HEAD `1402e15` immediately following manifest-spawn of this session:

```
 M packages/dispatch-workstation/src/main/spawn-handler.ts
 M packages/dispatch-workstation/test/unit/main/probe-spawn-handler-mode-01-result-emits-spawnmode.spec.ts
```

`[KNOWN]` Both modifications were uncommitted, live-in-working-tree. `commit-plan-doc-1334` had shipped WB1 GREEN (`228a2da`) + WB2 RED (`227bd2e`); the WORKING-TREE modifications represented its mid-WB3-GREEN work (spawn-handler.ts modification adding spawnMode to result emission).

### §1.2 — Operator arbitration (turn-N items 1-4)

`[KNOWN-OPERATOR-ARBITRATED]` 2026-05-12 turn-N — operator selected option (b) NEW MODULE after this session surfaced HALT-TERRITORY-MISMATCH-CLUSTER-A with hazard documented:

> "(4) [MODELED] option (b) NEW MODULE — author packages/dispatch-workstation/src/main/spawn-session-result-extensions.ts (manifest pattern spawn-session-result*.ts ✓); zero risk of sweeping sibling commit-plan-doc-1334 edits; matches T8-(β) 'ship the module, let sibling wire' pattern."

### §1.3 — Disjointness preservation evidence

`[KNOWN]` Verified at each cluster-A commit per CLAUDE.md §2.7 + Round 11 PHASE 2 invariant:

| Commit | Pathspec | Sibling staged/modified files visible | Sibling files in commit? |
|---|---|---|---|
| `2d938dc` (build-doc) | `docs/build-docs/CONDUCTOR_...BUILD.md` | round-11-archive-coauthor-notes (untracked, sibling); max-parallel-aggregator.test.ts (untracked, sibling) | NO — single-file commit verified |
| `ce1d828` (WB1 RED) | `test/unit/main/probe-mbtphase4-spawn-result-01-shape.spec.ts` | (same sibling untracked) | NO — single-file commit verified |
| `f943d21` (WB2 GREEN) | `dispatch-core/src/v3/spawn-result-fields.ts` | `frame-c-root.tsx` STAGED pre-session by another sibling; cairn-under-stress-round-11.md modified-unstaged; round-11-archive-coauthor-notes untracked | NO — single-file commit verified via post-commit `git log -1 --stat` showing 62 lines / 1 file |
| `5328a97` (WB3 GREEN) | `src/main/spawn-session-result-extensions.ts` | working tree clean at commit time except this new path | NO — single-file commit verified |

`[KNOWN]` `spawn-handler.ts` **never** appeared in any t8-cluster-a pathspec across all 4 commits. Option (b) NEW MODULE discipline fully preserved.

---

## §2 — Sibling continuity surface for commit-plan-doc-1334

### §2.1 — Integration recipe

`[MODELED]` Future `commit-plan-doc-1334` continuation (or any session with `spawn-handler.ts` WRITE territory) integrates t8-cluster-a extensions via additive spread:

```ts
// at spawn-handler.ts near SpawnSessionResult interface:
import type { SpawnResultExtensionFields } from 'dispatch-core/dist/v3/spawn-result-fields.js';

export interface SpawnSessionResult extends SpawnResultExtensionFields {
  sessionName: string;
  sessionId: string;
  panelMounted: false;
  cwd: string;
  // ADDITIVE — model?, spawnedAtMs from SpawnResultExtensionFields
  // (spawnMode arm separate: from commit-plan-doc-1334 WB3 GREEN)
}

// at spawnSession() entry:
import { populateSpawnSessionResultExtensions } from './spawn-session-result-extensions.js';

const extensions = populateSpawnSessionResultExtensions({
  model: req.model,                                  // future: add to SpawnSessionRequest
  defaultModel: process.env.CLAUDE_DEFAULT_MODEL,
});

// at return statement (after successful daemon registration):
return {
  ...extensions,
  sessionName: req.sessionName,
  sessionId: registered.name,
  panelMounted: false,
  cwd: req.repoPath,
  // ...spawnMode arm (from commit-plan-doc-1334)
};
```

### §2.2 — Type-shape composability

`[KNOWN]` `SpawnResultExtensionFields` interface designed for additive composition:
- `model?: string` — optional; safe to omit even when union-spread.
- `spawnedAtMs: number` — required (non-optional); sibling must populate via populator call.

This forces sibling integration to **call the populator** rather than leave the field unpopulated — preventing the silent "spawnedAtMs=undefined" bug that would defeat closure-path-(iii) of `MB-F-FRAME-C-UPTIME-LOST-ON-FRAME-TOGGLE-2026-05-12`.

---

## §3 — Cluster-A scope-boundary discipline

### §3.1 — In-scope (shipped this session)

`[KNOWN]` t8-cluster-a ships:
- `dispatch-core/src/v3/spawn-result-fields.ts` (NEW; type-only contract + dist marker).
- `dispatch-workstation/src/main/spawn-session-result-extensions.ts` (NEW; pure-fn populator).
- `test/unit/main/probe-mbtphase4-spawn-result-01-shape.spec.ts` (NEW; 4-condition contract probe).
- 3 doc files: build-doc + findings + this coord doc.

### §3.2 — Out-of-scope (sibling-deferred or FORBIDDEN)

`[KNOWN-OPERATOR-ARBITRATED]` per manifest + operator turn-N items 1-4:
- `spawn-handler.ts` integration → **sibling** (`commit-plan-doc-1334` for spawnMode arm AND a future session for model+spawnedAtMs spread).
- `tile-grid.tsx` TileGridSessionEntry extension → **FORBIDDEN** to t8-cluster-a (manifest); sibling closure required.
- `tile-grid-app.tsx` SpawnSuccessReply parsing → **FORBIDDEN**; sibling.
- `tile-header.tsx` `getContextWindow(model)` wiring (Sub-Q-E from synthesis §2.3.5) → out-of-territory; sibling.
- `FOLLOWUPS.md` closure stamps + audit row reclassification → **FORBIDDEN**; operator-driven natural cycle.

### §3.3 — Closure path for each follow-up

`[MODELED]` Required follow-up sessions for full DoD per build-doc §7 items 4-6, 10-12:

1. **commit-plan-doc-1334 continuation** (or new session): spawn-handler.ts spread + spawnMode arm. Closes `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING`.
2. **NEW sibling: tile-grid consumer extension** — `tile-grid.tsx` + `tile-grid-app.tsx`. Closes P3 §1.1 rows MODEL-SOURCE-WIRING + UPTIME-SPAWN-TIME-SOURCE consumer arms.
3. **NEW sibling: tile-header context-window wiring** — `tile-header.tsx:139` swap to `getContextWindow(entry.model ?? '')`. Closes `MB-F-C5-MODEL-CONTEXT-WINDOW-WIRING-GAP`.
4. **Operator stamp pass** (manifest-FORBIDDEN to t8-cluster-a): FOLLOWUPS + audit row deltas.
5. **Runtime smoke** (multi-session ship-validation): post-#1-#3 land, runtime-launch verifies model badge + uptime + bypass-perms indicator visible.

---

## §4 — Honest gaps observed in this session

`[KNOWN]`:

1. **Phase-4-synthesis §2.2 vs manifest scope divergence**: DRAFT cited `test/unit/spawn-handler/probe-mbtwfprfe-*` + `test/unit/tile-grid/probe-mbtwfprfe-*` probe paths; manifest grants only `test/unit/main/probe-mbtphase4-spawn-result-*.spec.ts`. Operator turn-N item 2 confirmed manifest path as canonical. Documented in build-doc §1.5 + §3 Sub-Q resolutions.

2. **Live concurrent-edit hazard at spawn-handler.ts** (resolved via option (b)): had option (b) NOT been adopted, per-path `git add` discipline alone would NOT have prevented sweep — `git add packages/dispatch-workstation/src/main/spawn-handler.ts` would have included sibling's working-tree modifications. Per-path discipline is necessary but not sufficient when shared territory has uncommitted sibling edits. Pattern surfaced; documented for §3.9.D incident-category in Round 11 archive.

3. **Sibling-staged file `frame-c-root.tsx`** persisted in index across multiple t8-cluster-a commits (visible at pre-commit `git status --short` for `f943d21`). Per-path commit pathspec `-- <my-path>` correctly excluded it from each of my commits. Confirms pathspec restriction works for shared-index hazards beyond just untracked files.

4. **Wave-3 churn rate**: working-tree state visible at pre-commit check varied across each WB (sibling files appearing/disappearing as parallel sessions commit). Pre-commit `git status --short` MANDATORY discipline (per operator turn-N) caught/documented each instance without intervention.

---

## §5 — Disjointness verification metrics

| Metric | Value |
|---|---|
| t8-cluster-a commits | 4 (docs + WB1 + WB2 + WB3) |
| t8-cluster-a commit lines (this session) | +234 + 165 + 62 + 59 = +520 |
| Files in t8-cluster-a pathspecs | 4 unique (build-doc, probe, dispatch-core type, workstation populator) |
| Sibling-territory files in any t8 commit | **0** |
| spawn-handler.ts modifications by t8 | **0** |
| FORBIDDEN-list files touched | **0** |
| Per-path `git add` invocations | 4 |
| Per-path `git commit -- <pathspec>` invocations | 4 |
| Refuse-to-commit gate triggered | **0** (all pre-commit checks revealed safe disjointness) |

`[KNOWN]` All metrics verified via post-commit `git log -N --stat` review per Round 11 PHASE 2 invariant.

---

**End of cluster-a coord doc (2026-05-12).**
