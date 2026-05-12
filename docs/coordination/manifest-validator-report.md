# Manifest Validator Report — Round 11 §3.9 SPECULATIVE

**Session:** SESSION-r11-manifest-validator
**Date:** 2026-05-12
**Confidence labeling:** §2.2 KNOWN / MODELED / SPECULATIVE applied per claim.
**Territory:** `docs/coordination/manifest-validator-report.md` (write); `docs/coordination/territorial-manifests/**` + `docs/coordination/dispatch-queue-current.md` (read-only).

---

## §1 — Scope & method

Audit deliverable per Round 11 dispatch: parse every manifest at `docs/coordination/territorial-manifests/`, verify TERRITORY/FORBIDDEN/READ-ONLY glob syntax, cross-check against recent commit log for any session touching files OUTSIDE its territory.

Method:
1. `ls` enumerate manifest files [KNOWN]
2. Read each manifest verbatim [KNOWN]
3. Parse the single-line `<CLAUSE>: <globs> | …` grammar; classify each glob (exact-file, single-segment `*`, recursive `**`)
4. Cross-check pairwise TERRITORY overlap + per-manifest TERRITORY↔FORBIDDEN internal consistency
5. Identify post-§3.9-adoption commits via `git log` and validate any modified path against committing session's manifest
6. File findings + honest gaps below

Authority basis: dispatch-queue-current.md §0 (Conventions) + CLAUDE.md §2.10 (frozen contracts) + Round 11 directive.

---

## §2 — Manifest inventory [KNOWN]

| Manifest | TERRITORY clauses | READ-ONLY clause | FORBIDDEN clauses | mtime |
|---|---|---|---|---|
| `phase4-t8-exec.txt` | 9 (src + test + 4 doc) | absent | 11 (incl. cross-fence to T9 territory) | 14:09 |
| `phase4-t9-exec.txt` | 9 (mirror of t8) | absent | 11 (incl. cross-fence to T8 territory) | 14:09 |
| `r11-archive-writer.txt` | 3 (cairn-under-stress + arc-synthesis) | absent | 11 | 14:09 |
| `r11-manifest-validator.txt` | 1 (this report) | 2 (territorial-manifests/**, dispatch-queue) | 7 | 14:09 |
| `r11-queue-watcher.txt` | 1 (queue-watcher-report.md) | 2 (same as validator) | 6 | 14:09 |

All five manifests were authored as part of `d41bacb spike(§3.9)` (2026-05-12 14:10 -0600) [KNOWN — confirmed by `git show --stat d41bacb`].

---

## §3 — Glob syntax findings

### §3.1 Syntactic forms observed [KNOWN]

Three glob shapes are present across the corpus:

- **Exact-file**: `docs/coordination/manifest-validator-report.md` — exact path match
- **Single-segment `*`**: `packages/dispatch-daemon/src/cost-aggregator*.ts` — matches sibling files, NOT subdirectories
- **Recursive `**`**: `packages/**`, `docs/coordination/territorial-manifests/**` — full subtree

Grammar appears tractable. No malformed globs observed [KNOWN].

### §3.2 Single-segment `*` ambiguity [MODELED]

`packages/dispatch-daemon/src/cost-aggregator*.ts` in `phase4-t8-exec.txt` matches:
- `cost-aggregator.ts` ✓
- `cost-aggregator-types.ts` ✓
- `cost-aggregator/index.ts` ✗ (single-segment `*` does not cross `/`)

If session-t8 produces `cost-aggregator/index.ts` (directory split), enforcement would HALT-TERRITORY-VIOLATION on a path the operator-spec authoring intended to permit. Probability low (file currently single-module) but not zero. **Tier 3 honest gap** — flagged for §3.9.D capture if observed.

### §3.3 Glob-style asymmetry within phase4-t8/t9 [MODELED]

Both phase4 manifests mix:
- recursive `test/unit/cost-meter/**` (t8) and `test/unit/plan-timer/**` (t9) — accepting any future test under the dir
- single-segment `test/unit/bottom-rail/probe-mbtwft8-*.spec.tsx` (t8) and `…probe-mbtwft9-*.spec.tsx` (t9) — restricting bottom-rail/ to session-scoped probes only

This is intentional asymmetry: bottom-rail/ is shared with prior MB-T-WIREFRAME-T4/T7 commits, so the manifest fences session-t8 to only the ticket-specific probe-prefix. cost-meter/ and plan-timer/ are net-new dirs with no prior tenants, so `**` is safe. Coherent design — no finding.

---

## §4 — Internal-consistency findings (per-manifest)

### §4.1 [Tier 1] r11-archive-writer.txt — TERRITORY ⊆ FORBIDDEN glob [KNOWN]

**TERRITORY**: `docs/cairn-under-stress-round-11.md`, `docs/cairn-under-stress-round-9.md`, `docs/cairn-arc-synthesis-round-11-DRAFT.md`
**FORBIDDEN**: includes `docs/cairn-*.md`

All three TERRITORY paths match the FORBIDDEN glob `docs/cairn-*.md` literally. The manifest is self-contradictory unless §3.9 has an unstated precedence rule that TERRITORY clauses override FORBIDDEN globs.

dispatch-queue-current.md §0 does not encode such a precedence rule. The §3.9.A enforcement hook "every `git add` glob-matched against session manifest at add step; mismatch = HALT-TERRITORY-VIOLATION" is silent on simultaneous TERRITORY hit + FORBIDDEN hit.

**Operator-arbitration request:** Confirm precedence — *TERRITORY beats FORBIDDEN* (assertion-by-listing) OR *FORBIDDEN beats TERRITORY* (deny-by-listing). The first interpretation is the only one consistent with the manifest's apparent intent (allow r11-archive-writer to write the cairn-stress + arc-synthesis files); under the second interpretation r11-archive-writer cannot write any of its own TERRITORY.

**Recommended remediation:** Either (a) tighten FORBIDDEN to exclude the three TERRITORY files explicitly (`docs/cairn-*.md` → enumerated list minus TERRITORY), or (b) encode precedence rule in dispatch-queue §0.

### §4.2 [Tier 2] FORBIDDEN-clause asymmetry — missing ORCHESTRATOR_STATE_CONTRACT.md [KNOWN]

Three of five manifests (`r11-archive-writer`, `phase4-t8-exec`, `phase4-t9-exec`) list `docs/coordination/ORCHESTRATOR_STATE_CONTRACT.md` in FORBIDDEN. Two manifests (`r11-manifest-validator`, `r11-queue-watcher`) omit it.

Per dispatch-queue §0 line 14, `ORCHESTRATOR_STATE_CONTRACT.md` is a frozen contract outside any territory and is **never claimable** regardless of FORBIDDEN clause. So the omission is non-load-bearing under correct §3.9 semantics — but it is an authoring inconsistency and would silently miss enforcement if §3.9 ever degrades to FORBIDDEN-only checking.

**Recommended remediation:** Add `docs/coordination/ORCHESTRATOR_STATE_CONTRACT.md` to both FORBIDDEN clauses for parity; or (preferred) lift the frozen-contract list to dispatch-queue §0 only and stop replicating it per-manifest. The current replication-with-drift is the bug pattern.

### §4.3 [Tier 3] READ-ONLY clause inconsistency [KNOWN]

Two of five manifests (`r11-manifest-validator`, `r11-queue-watcher`) emit a `READ-ONLY:` clause. Three (`r11-archive-writer`, `phase4-t8-exec`, `phase4-t9-exec`) omit it.

The §3.9 grammar does not specify whether absent READ-ONLY means (a) **implicit-all** (session may read anything not in FORBIDDEN), or (b) **opt-in** (session may read nothing outside TERRITORY). Interpretation (a) is operationally intuitive but unstated. Interpretation (b) would block phase4-t8-exec from reading dispatch-core schema at typecheck time — clearly not intended.

**Recommended remediation:** Encode default in dispatch-queue §0 ("absent READ-ONLY clause = implicit read-all-except-FORBIDDEN"). No per-manifest edits required if the default is encoded.

---

## §5 — Pairwise overlap findings [KNOWN]

TERRITORY pairs were checked for path overlap. Result: **no overlaps**.

Notable disjointness mechanisms:
- `phase4-t8-exec` ↔ `phase4-t9-exec`: bidirectional explicit fences (each lists the other's primary src files in FORBIDDEN). Shared `bottom-rail/` test dir is partitioned via probe-prefix glob (`probe-mbtwft8-*` vs `probe-mbtwft9-*`). Clean.
- `r11-manifest-validator` ↔ `r11-queue-watcher`: separate report files (`manifest-validator-report.md` vs `queue-watcher-report.md`). No overlap.
- `r11-archive-writer`: own three .md files; no overlap with others.

§2.9 bidirectional-territory-fence discipline is satisfied for phase4-t8/t9 pair specifically; archive-writer/validator/queue-watcher trio has natural disjointness without needing explicit fences.

---

## §6 — Commit-log cross-check [KNOWN]

Method: enumerate commits with author time ≥ `d41bacb` author time (2026-05-12 14:10:00 -0600); for each, list paths and validate against the committing session's manifest.

Result: **only one post-adoption commit exists** — `d41bacb` itself, which is the §3.9 adoption spike. It modified the dispatch-queue file and the five manifest files. Authoring session for `d41bacb` is the operator (cairn-grammar `spike:` prefix; pre-§3.9 commit by definition since it AUTHORS §3.9).

Pre-adoption commits are explicitly out-of-scope per `dispatch-queue-current.md` line 34: *"existing T1-T7 + P1-P3 + P5-P7 cascade pre-dates §3.9 adoption — not retroactively manifested"*.

**Finding:** zero post-adoption session commits to validate. Cross-check window is empty by construction. The five IN-FLIGHT sessions per dispatch-queue line 26-30 are "(post-spawn)" — none have committed yet. This is the expected state for a validator session running as part of the very first post-adoption cohort.

**No territory violations observed.** [KNOWN — within the empty validation window]

**Confidence escalation note:** This finding becomes load-bearing only once IN-FLIGHT sessions begin committing. A subsequent validator pass (after r11-archive-writer, phase4-t8-exec, phase4-t9-exec ship cairn-grammar commits) is required to exercise the real enforcement surface. The current pass validates **grammar**, not **enforcement**.

---

## §7 — Outcome classification (per §2.11)

**Capability enabled with known limitations.**

§3.9 manifest grammar is well-formed except for §4.1 (Tier 1 internal contradiction in `r11-archive-writer.txt`) and the precedence/default gaps surfaced in §4.1, §4.3, §3.2. Manifests are dispatchable but the precedence rule must be operator-arbitrated before r11-archive-writer's first cairn-grammar commit, or the §3.9.A enforcement hook will reject every write that session attempts.

Cross-check evidence: empty validation window. No enforcement event observed. Mechanism status remains **SPECULATIVE** per Round 11 framing.

---

## §8 — Honest gaps (per §3.9.D)

| Category | Gap | Closure path |
|---|---|---|
| Manifest authoring | TERRITORY ⊆ FORBIDDEN glob in r11-archive-writer (§4.1) | Operator-arbitrate precedence rule + remediate manifest |
| §3.9 grammar | READ-ONLY default unspecified (§4.3) | Encode default in dispatch-queue §0 |
| §3.9 grammar | Single-segment `*` doesn't cross `/` — operator-spec intent ambiguous (§3.2) | Operator-arbitrate or use `**` consistently |
| §3.9 enforcement | Enforcement hook location unspecified ("git add glob-match at add step" — by what tool? pre-commit? wrapper script?) | Round 11 spike: prototype enforcement; surface as §3.9.A finding |
| Validator coverage | Empty cross-check window — grammar validated, enforcement NOT validated | Re-run validator after first IN-FLIGHT cairn-grammar commit cohort |
| Manifest drift | Frozen-contract list replicated per-manifest with drift (§4.2) | Lift frozen-contract list to dispatch-queue §0 only; deprecate per-manifest replication |

---

## §9 — Recommendations (forward-position)

**For operator (Round 11 close-out):**
1. Arbitrate §4.1 precedence rule before r11-archive-writer ships WB1.
2. Encode READ-ONLY default + TERRITORY/FORBIDDEN precedence + glob semantics (`*` vs `**` at directory boundary) into `dispatch-queue-current.md §0` (or hoist to a dedicated `docs/coordination/territorial-manifest-grammar.md`).
3. Schedule a second validator pass after the first IN-FLIGHT cohort produces cairn-grammar commits — current pass cannot speak to enforcement, only grammar.

**For r11-archive-writer (incoming):**
- Block at first write attempt until §4.1 precedence is arbitrated. Surface as HALT-AMBIGUOUS-MANIFEST, not HALT-TERRITORY-VIOLATION.

**For phase4-t8-exec / phase4-t9-exec (incoming):**
- Grammar permits clean dispatch. Bidirectional fences are tight. Proceed.

---

## §10 — Self-check (validator-scoped)

- Read every manifest file? ✓ (5/5 read)
- Cross-checked commit log? ✓ (empty window confirmed via independent `git show --stat d41bacb`)
- Stayed within TERRITORY? ✓ (only this file written; manifest files read-only)
- Per-path `git add` planned for commit? ✓ (single pathspec: `docs/coordination/manifest-validator-report.md`)
- Any unlabeled factual claim? ✓ (all claims carry [KNOWN] / [MODELED] / [SPECULATIVE])
- Touched files another parallel session might modify? ✓ checked — TERRITORY file is validator-exclusive; no overlap risk.
