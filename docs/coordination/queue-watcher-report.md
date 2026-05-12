# Queue Watcher Report — Round 11 §3.9 SPECULATIVE

**Session**: `r11-queue-watcher`
**Manifest**: `docs/coordination/territorial-manifests/r11-queue-watcher.txt`
**TERRITORY (write)**: `docs/coordination/queue-watcher-report.md` (this file)
**READ-ONLY**: `docs/coordination/dispatch-queue-current.md`, `docs/coordination/territorial-manifests/**`
**Date**: 2026-05-12
**Scope**: detect (a) claim races, (b) stale manifest refs, (c) dep cycles in the §3.9 dispatch-queue primitive.

---

## §1 — Inventory snapshot

[KNOWN] Source of truth at watch start:

- Queue file: `docs/coordination/dispatch-queue-current.md` last-touched by commit `d41bacb` (`spike(§3.9): adopt territorial-partition + dispatch-queue primitive SPECULATIVE Round 11`, 2026-05-12).
- Only **one** commit in the repository history touches the queue or the `docs/coordination/territorial-manifests/` directory (verified via `git log -- docs/coordination/dispatch-queue-current.md` and `git log -- docs/coordination/territorial-manifests/`).
- 5 manifest files present on disk; 5 manifest refs in queue IN-FLIGHT — 1:1 correspondence.

| Manifest file | Bytes | Referenced from queue row |
|---|---|---|
| `r11-archive-writer.txt` | 564 | IN-FLIGHT |
| `r11-manifest-validator.txt` | 365 | IN-FLIGHT |
| `r11-queue-watcher.txt` | 355 | IN-FLIGHT (this session) |
| `phase4-t8-exec.txt` | 1104 | IN-FLIGHT |
| `phase4-t9-exec.txt` | 1110 | IN-FLIGHT |

QUEUED: empty. COMPLETED: empty.

---

## §2 — Stale manifest-ref check

[KNOWN] **No stale refs.** All 5 manifest paths in `dispatch-queue-current.md` (rows 26–30) resolve to existing files. Filename + extension exact match for every row.

---

## §3 — Claim-race check

[KNOWN] **No claim races observed in commit log.** Only `d41bacb` touches the queue. No competing commits attempt to move the same row from QUEUED → IN-FLIGHT (and QUEUED is empty, so the structural precondition for a row-claim race is currently absent).

### §3.1 Territory-write-path overlap matrix

[KNOWN] Pairwise write-path intersection across all 5 IN-FLIGHT manifests:

| pair | result |
|---|---|
| archive-writer ∩ manifest-validator | ∅ (cairn-*.md vs coordination/manifest-validator-report.md) |
| archive-writer ∩ queue-watcher | ∅ |
| archive-writer ∩ phase4-t8 | ∅ |
| archive-writer ∩ phase4-t9 | ∅ |
| manifest-validator ∩ queue-watcher | ∅ (distinct report filenames in same dir) |
| manifest-validator ∩ phase4-t8 | ∅ |
| manifest-validator ∩ phase4-t9 | ∅ |
| queue-watcher ∩ phase4-t8 | ∅ |
| queue-watcher ∩ phase4-t9 | ∅ |
| phase4-t8 ∩ phase4-t9 | **see §3.2** |

### §3.2 phase4-t8 ↔ phase4-t9 shared-parent-dir analysis

[MODELED] Both phase4 execs write under `packages/dispatch-workstation/test/unit/bottom-rail/` but with disjoint filename prefixes:

- t8: `probe-mbtwft8-*.spec.tsx`
- t9: `probe-mbtwft9-*.spec.tsx`

Write-path intersection at the **file** granularity = ∅. Write-path intersection at the **parent-directory** granularity = `packages/dispatch-workstation/test/unit/bottom-rail/`. Both manifests cross-list each other's *source* paths in FORBIDDEN (`plan-timer-text.tsx`, `bottom-rail-cost-meter.tsx`, aggregator source files) — that defense holds.

**Residual race surface**: if either session stages with directory-glob semantics (e.g. `git add packages/dispatch-workstation/test/unit/bottom-rail/`) instead of per-file paths, it sweeps the peer's untracked probes. Mitigation already mandated by CLAUDE.md §2.7 + queue §0 ("§3.9.A enforcement: every `git add` glob-matched against session manifest"). Mechanism is **discipline-dependent**, not git-enforced.

Both phase4 manifests also share parent dirs for adjacent surfaces:
- `packages/dispatch-daemon/src/` — t8 holds `cost-aggregator*.ts`, t9 holds `plan-timer-aggregator*.ts`. Disjoint at file level; parent-dir shared.
- `packages/dispatch-daemon/test/unit/` — same pattern as above.
- `packages/dispatch-workstation/src/chat-shell/` — t8 holds `bottom-rail-cost-meter.tsx`, t9 holds `plan-timer-text.tsx`. Disjoint at file level; parent-dir shared.

[MODELED] **All shared-parent-dir contacts are filename-prefix-disjoint AND cross-listed in peer FORBIDDEN.** Defense-in-depth is two-layer (write-prefix + explicit-FORBIDDEN). No single-failure path to collision observed.

---

## §4 — Dep-cycle check

[KNOWN] **No dep cycles possible.** All 5 IN-FLIGHT rows declare `deps: NONE`. QUEUED is empty. With zero edges in the dep graph, no cycle can exist.

[MODELED] The §3.9 schema requires deps to be expressed as upstream IDs in queue-row syntax. Current state cannot exercise the dep-graph deadlock failure mode; the §3.9.D placeholder ("Dep graph deadlock: pending observation") remains unfalsified.

---

## §5 — Frozen-contract coverage variance (MODELED concern, not a current-state breach)

[KNOWN] Queue §0 enumerates the canonical frozen-contract set:
`REGISTRY.md §2`, `CONDUCTOR_API_CONTRACT.md`, `packages/dispatch-core/src/v3/schema.ts §1-§13`, `WORKSTATION_CONTRACT.md §6`, `packages/dispatch-workstation/src/main/hso-system-prompts/orchestrator.md`, `ORCHESTRATOR_STATE_CONTRACT.md`.

[KNOWN] Per-manifest explicit FORBIDDEN line-items for each frozen contract:

| manifest | API_CONTRACT | schema.ts | orchestrator.md | ORCHESTRATOR_STATE_CONTRACT | REGISTRY §2 | WORKSTATION §6 |
|---|---|---|---|---|---|---|
| r11-archive-writer | explicit | explicit | explicit | explicit | not explicit | not explicit |
| r11-manifest-validator | not explicit (covered by `docs/build-docs/**`) | explicit | not explicit (covered by `packages/**`) | not explicit | not explicit (covered by `docs/build-docs/**`) | not explicit (covered by `docs/build-docs/**`) |
| r11-queue-watcher | not explicit (covered by `docs/build-docs/**`) | explicit | not explicit (covered by `packages/**`) | not explicit | not explicit (covered by `docs/build-docs/**`) | not explicit (covered by `docs/build-docs/**`) |
| phase4-t8-exec | explicit | explicit | explicit | explicit | not explicit | not explicit (no §6-anchor in manifest) |
| phase4-t9-exec | explicit | explicit | explicit | explicit | not explicit | not explicit (no §6-anchor in manifest) |

[MODELED] **No write-path breach is reachable in current state** because each session's TERRITORY is narrow enough that the frozen contracts sit categorically outside it. The variance is a defense-in-depth gap rather than a breach surface:

- For r11-manifest-validator and r11-queue-watcher: TERRITORY is a single coordination report file; categorical `packages/**` + `docs/build-docs/**` blanket FORBIDDEN absorbs all frozen contracts. **No gap of consequence.**
- For r11-archive-writer: TERRITORY is `docs/cairn-*.md` only; REGISTRY.md and WORKSTATION_CONTRACT.md live under `docs/build-docs/` which is **not explicitly forbidden** in this manifest. The manifest does forbid `docs/build-docs/CONDUCTOR_API_CONTRACT.md` specifically but not the whole dir. **Cairn-archive scope is unlikely to touch build-docs**, but the manifest does not categorically prevent it.
- For phase4-t8/t9: WORKSTATION_CONTRACT.md §6 is not explicitly listed. Both manifests touch `packages/dispatch-workstation/**` source under their TERRITORY allowlists; the §6 anchor sits in `docs/build-docs/`, which is not explicitly forbidden in either phase4 manifest. **Phase4 surface is `chat-shell/` and `test/unit/`, far from §6's IPC + endpoints scope**, but the categorical fence is absent.

[MODELED] **Recommendation surface (operator-arbitrated)**: future manifest-authoring template could add `docs/build-docs/**` as a blanket FORBIDDEN for sessions whose TERRITORY does not include build-docs paths, instead of relying on per-frozen-contract enumeration. Surfaced for operator awareness; **no current-state action by this session** — manifest-authoring sits outside r11-queue-watcher TERRITORY.

---

## §6 — §3.9.D honest-gap status

Updates to the queue's "Honest gaps" placeholders, scoped to this watcher's observation:

| placeholder | watcher status |
|---|---|
| Queue claim races | **unfalsified** — no QUEUED rows yet exist to be raced for; race-surface analysis (§3) finds no current overlap |
| Stale manifest references | **falsified-negative** — all 5 refs resolve cleanly at observation time |
| Queue authoring bottleneck | not in this watcher's scope |
| Dep graph deadlock | **unfalsified** — graph has zero edges (all deps=NONE) |
| Manifest-violation false positives | not in this watcher's scope (manifest-validator's territory) |

---

## §7 — Summary

[KNOWN] **No claim races, stale refs, or dep cycles observed in Round 11 §3.9 dispatch-queue state at watch-pass time `git log` head `d41bacb` + working-tree pre-commit.**

[MODELED] **Two residual race surfaces flagged** for operator awareness:
1. phase4-t8 ∩ phase4-t9 share `packages/dispatch-workstation/test/unit/bottom-rail/` parent dir; filename-prefix disjoint, peer-FORBIDDEN cross-listed — discipline-dependent (§2.7 per-path `git add`).
2. Frozen-contract FORBIDDEN coverage varies across manifests; current TERRITORYs are narrow enough that variance is non-breaching, but defense-in-depth is uneven.

[SPECULATIVE] Outcome classification per CLAUDE.md §2.11: **Observability gap closed; capture validated; criterion refinement deferred** — the §3.9 primitive's race/stale/cycle observability surfaces produce evaluable evidence; the criterion for when a "race" becomes load-bearing requires QUEUED rows to actually exist (Phase 4 ticket execution post-WB1-RED handoff).

This report will be re-run if the queue commit log advances. No further action by `r11-queue-watcher` until next observation pass.

---

## §8 — Live observation during this watch pass (§3.9.A in action)

[KNOWN] Between staging this report and the post-stage `git status --short` check, an untracked file appeared in the working tree:

```
A  docs/coordination/queue-watcher-report.md       ← this session, in TERRITORY
?? docs/coordination/manifest-validator-report.md  ← peer session r11-manifest-validator, OUT of this TERRITORY
```

`r11-manifest-validator` authored its report concurrently in the shared working tree. Because this session used per-path `git add docs/coordination/queue-watcher-report.md` (per CLAUDE.md §2.7 + queue §0 "§3.9.A enforcement"), the peer's untracked report was **not** swept into this commit. The peer file remains untracked, available to its authoring session for its own per-path stage + commit.

[KNOWN] **§3.9.A enforcement validated at runtime in a shared working tree under parallel-cairn conditions.** Had `git add -A` or `git add docs/coordination/` been used, this commit would have absorbed the peer's territory — a HALT-TERRITORY-VIOLATION. Per-path staging prevented it.

[MODELED] This is concrete (KNOWN) evidence for the §3.9 SPECULATIVE primitive's race-prevention claim — captured live within the Round 11 validation window rather than as a hypothetical.

---

## §9 — Stronger live evidence: shared-index race + commit-pathspec necessity

[KNOWN] After staging this report and before commit, a second `git status --short` returned:

```
A  docs/coordination/manifest-validator-report.md  ← peer-staged into shared index
A  docs/coordination/queue-watcher-report.md       ← this session
```

This session ran only `git add docs/coordination/queue-watcher-report.md` (per-path). The peer file appeared in the index because the peer session (`r11-manifest-validator`) concurrently ran its own per-path `git add` against the **shared git index** that backs the shared working tree. **Per-path `git add` does not prevent index-level contamination by peer sessions** — it only prevents the current session from authoring contamination.

[KNOWN] **Implication**: a pathspec-less `git commit -m '...'` at this moment would commit BOTH files into one commit under this session's authorship — a HALT-TERRITORY-VIOLATION (committing to a path outside this session's TERRITORY).

[KNOWN] **Mitigation actually load-bearing here**: `git commit <pathspec> -m '...'` — pathspec restricts commit scope to the specified path regardless of what else is staged. This matches the dispatch directive "commit pathspec mandatory" verbatim, and §3.9.A's enforcement intent.

[MODELED] **§3.9.A needs to specify both per-path `git add` AND commit-with-pathspec to be sound under shared-working-tree parallel-cairn.** Per-path `git add` alone is a half-measure; the shared git index is the racy resource. CLAUDE.md §2.7 currently emphasizes per-path `git add`; commit-pathspec is implied by territorial discipline but not made explicit in the same way. Surfaced as a candidate §2.7 amendment for operator consideration. Manifest/grammar authoring is outside this session's TERRITORY — surface only, no edit.

[KNOWN] **§3.9.D placeholder updates from this watch pass**:
- "Queue claim races" — partial-falsification-negative: no claim-race over a QUEUED row observed, but a **shared-index race over staged files** WAS observed and successfully prevented by commit-pathspec discipline. Distinct failure mode worth adding to the §3.9.D placeholder set as "Shared-index cross-session contamination".
