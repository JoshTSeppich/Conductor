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

## §10 — Self-check (validator-scoped, Wave 1)

- Read every manifest file? ✓ (5/5 read)
- Cross-checked commit log? ✓ (empty window confirmed via independent `git show --stat d41bacb`)
- Stayed within TERRITORY? ✓ (only this file written; manifest files read-only)
- Per-path `git add` planned for commit? ✓ (single pathspec: `docs/coordination/manifest-validator-report.md`)
- Any unlabeled factual claim? ✓ (all claims carry [KNOWN] / [MODELED] / [SPECULATIVE])
- Touched files another parallel session might modify? ✓ checked — TERRITORY file is validator-exclusive; no overlap risk.

---

# §11 — Wave 2 extension (2026-05-12)

Round 11 §3.9 SPECULATIVE Wave-2 dispatch (`f61c14b`) added 9 new manifests to `docs/coordination/territorial-manifests/`. This extension audits Wave-2 grammar, overlap, and validates §3.9 enforcement against the now-non-empty post-adoption commit log.

## §11.1 — Wave 2 manifest inventory [KNOWN]

| Manifest | TERRITORY count | READ-ONLY clause | FORBIDDEN count |
|---|---|---|---|
| `c5-tilegrid-wiring.txt` | 9 (4 src + 3 test + 2 doc) | absent | 11 |
| `commit-plan-doc-spawnmode.txt` | 7 (3 src + 2 test + 2 doc) | absent | 11 |
| `t1-chatshell-polish.txt` | 5 (3 src globs + 1 test + 1 doc) | absent | 12 |
| `t3-frame-c-lookup-stub.txt` | 4 (2 src + 1 test + 1 doc) | **3** | 12 |
| `t6-wireframe-t10-body.txt` | 2 docs | **5** | 8 |
| `verify-chat-mount-t7polish.txt` | 5 (3 src + 1 test + 1 doc) | absent | 13 |
| `orch-active-phase4-status.txt` | 2 docs | **5** | 8 |
| `orch-standby-sherpa.txt` | 2 docs | **1 (prose)** | 11 (3 pseudo-paths) |
| `p7-cortex-deepening.txt` | 1 (`/tmp/**`) | **3** (1 ∩ FORBIDDEN) | 7 (3 pseudo-paths) |

READ-ONLY adoption: 5/9 in Wave 2 (56%) vs 2/5 in Wave 1 (40%) — increasing. This makes the Wave-1 §4.3 "READ-ONLY default unspecified" gap more load-bearing.

## §11.2 — Grammar findings (Wave 2)

### §11.2.1 [Tier 1] — t1↔verify-chat-mount TERRITORY overlap [KNOWN]

`t1-chatshell-polish.txt` TERRITORY contains the broad glob `packages/dispatch-workstation/src/chat-shell/*.tsx` and `…/chat-shell/*.ts` and `…/chat-shell/styles.css`. `verify-chat-mount-t7polish.txt` TERRITORY explicitly enumerates `…/chat-shell/conductor-brand.tsx`, `…/chat-shell/tab-switcher.tsx`, and `…/chat-shell/styles.css`.

**Three files are simultaneously claimed as TERRITORY by both sessions:**
- `packages/dispatch-workstation/src/chat-shell/conductor-brand.tsx`
- `packages/dispatch-workstation/src/chat-shell/tab-switcher.tsx`
- `packages/dispatch-workstation/src/chat-shell/styles.css`

t1's FORBIDDEN carve-outs (`bottom-rail-cost-meter.tsx`, `plan-timer-text.tsx`, `mount.ts`) do NOT include the three verify-chat-mount files. Bidirectional fences (§2.9) are MISSING for this pair. If both sessions commit concurrently, last-writer-wins with no §3.9 detection.

**Independently corroborated** by `8d35c93 spike(§3.9): r11-queue-watcher Wave-2 extension — 12 IN-FLIGHT scan + HIGH-CONFIDENCE t1↔verify-chat-mount overlap surfaced` — the parallel queue-watcher session reached the same conclusion. Two validators converging on the same finding raises confidence from [MODELED] to [KNOWN].

**Recommended remediation:** Operator-arbitrate one of:
- (a) Add `conductor-brand.tsx`, `tab-switcher.tsx`, `styles.css` to t1 FORBIDDEN (narrow t1 to true polish-pivot scope)
- (b) Reverse: narrow verify-chat-mount TERRITORY to specific styles-block selectors or specific component sub-trees
- (c) Tighten t1 TERRITORY glob from `*.tsx` to a probe-prefix-style enumeration similar to phase4-t8/t9 pattern

### §11.2.2 [Tier 1] — t3 READ-ONLY ∩ FORBIDDEN ≠ ∅ [KNOWN]

`t3-frame-c-lookup-stub.txt` lists three files in **both** READ-ONLY and FORBIDDEN clauses:
- `packages/dispatch-workstation/src/main/frame-c-ipc.ts`
- `packages/dispatch-workstation/src/tile-grid/tile-grid-app.tsx`
- `packages/dispatch-workstation/src/tile-grid/tile-grid.tsx`

Semantically incoherent: READ-ONLY conventionally means "may read, may not write" while FORBIDDEN means "may not touch at all." A file cannot simultaneously be both. The §3.9 grammar in dispatch-queue §0 doesn't define resolution. Plausible operator intent: "may read for context, may not write" — i.e., READ-ONLY is the correct clause and FORBIDDEN duplication is an authoring artifact.

**Recommended remediation:** Strip the three files from FORBIDDEN clause. Or encode dispatch-queue §0 rule "READ-ONLY takes precedence over FORBIDDEN when same path appears in both."

### §11.2.3 [Tier 1] — p7 READ-ONLY ∩ FORBIDDEN on CLAUDE.md [KNOWN]

`p7-cortex-deepening.txt` lists `CLAUDE.md` in both READ-ONLY and FORBIDDEN. Same defect class as §11.2.2. Operator intent presumably READ-ONLY (read for context; never write).

### §11.2.4 [Tier 2] — p7 TERRITORY is outside the git repository [KNOWN]

`p7-cortex-deepening.txt` TERRITORY is `/tmp/cortex-minimal-draft/**` — a path the git working tree does not contain and `git add` cannot match. §3.9.A enforcement at `git add` glob-match is structurally inapplicable. The manifest grammar is internally consistent but is **outside the §3.9 enforcement perimeter entirely**.

This raises a meta-question for dispatch-queue §0: should manifests be permitted to declare TERRITORY outside the repository? If yes, §3.9.A enforcement must be acknowledged as "no-op for extra-repo TERRITORY"; if no, the manifest should be rejected at queue-authoring time.

### §11.2.5 [Tier 2] — orch-standby READ-ONLY contains prose, not a glob [KNOWN]

`orch-standby-sherpa.txt` READ-ONLY clause reads `any operator-supplied .sherpa-build/** path if available`. The substring `any operator-supplied … if available` is natural language conditional, not a glob. A strict §3.9.A enforcement engine consuming this clause would fail to parse or would treat the whole string as a literal path (which it isn't).

**Recommended remediation:** Replace with literal glob `.sherpa-build/**` (no qualifier) and let the operator's at-launch decision determine whether the directory exists. Glob-matching against a non-existent path is a no-op, so the conditional is redundant.

### §11.2.6 [Tier 2] — Pseudo-path sentinels in FORBIDDEN [KNOWN]

`orch-standby-sherpa.txt` and `p7-cortex-deepening.txt` use uppercase sentinel strings in FORBIDDEN:
- `ANY-WRITE-TO-SHERPA-REPO`, `ANY-WRITE-TO-REGISTRY-REPO`, `ANY-WRITE-TO-CORTEX-REPO`, `ANY-WRITE-TO-REPO-OUTSIDE-/tmp`

These are intent-declarative meta-paths, not git path globs. A strict glob-matcher will never match a real file against these strings; they communicate semantic intent to a human reader but have **zero §3.9.A enforcement value**.

**Recommended remediation:** Move these to a separate `INTENT:` clause in dispatch-queue §0, or encode the equivalent literal FORBIDDEN globs (e.g., `.sherpa/**`, `../sherpa-repo/**`, every directory outside the workspace root) — though the latter is operationally fragile.

### §11.2.7 [Tier 3] — Glob-style asymmetry: t1 vs phase4 pattern [KNOWN]

`t1-chatshell-polish.txt` uses broad `chat-shell/*.tsx` glob with explicit FORBIDDEN carve-outs (3 files). The phase4-t8/t9 pattern uses **narrow probe-prefix globs** like `probe-mbtwft8-*.spec.tsx` with bidirectional explicit FORBIDDEN fences. The latter is more robust (additive scoping; new sibling files don't auto-claim) and avoids the t1↔verify-chat-mount overlap class entirely.

**Recommended convention (forward-positioning):** Future manifests in shared-directory contexts should use **narrow probe-prefix globs**, not broad subdirectory globs with carve-outs.

## §11.3 — Cross-manifest overlap matrix (Wave 1 ∪ Wave 2) [KNOWN]

Pairwise TERRITORY-vs-TERRITORY checks across all 14 active manifests (5 Wave 1 + 9 Wave 2):

| Pair | Overlap | Severity |
|---|---|---|
| t1-chatshell-polish ↔ verify-chat-mount-t7polish | conductor-brand.tsx, tab-switcher.tsx, styles.css | **Tier 1** (§11.2.1) |
| c5-tilegrid-wiring ↔ commit-plan-doc-spawnmode | none (bidirectional fences clean) | OK |
| c5-tilegrid-wiring ↔ t3-frame-c-lookup-stub | none on WRITE (t3 READ-ONLY covers c5's `frame-c-ipc.ts`) | coordination-only |
| commit-plan-doc-spawnmode ↔ t3-frame-c-lookup-stub | none on WRITE (t3 READ-ONLY covers `tile-grid.tsx`) | coordination-only |
| t1-chatshell-polish ↔ phase4-t8-exec | none (t1 FORBIDDEN carves out `bottom-rail-cost-meter.tsx`) | OK |
| t1-chatshell-polish ↔ phase4-t9-exec | none (t1 FORBIDDEN carves out `plan-timer-text.tsx` + `mount.ts`) | OK |
| verify-chat-mount ↔ phase4-t8-exec | none (verify-chat-mount FORBIDDEN carves out `bottom-rail-cost-meter.tsx`) | OK |
| verify-chat-mount ↔ phase4-t9-exec | none (verify-chat-mount FORBIDDEN carves out `plan-timer-text.tsx` + `mount.ts`) | OK |
| t6-wireframe-t10-body ↔ orch-active-phase4-status | none (different doc paths; t6 writes T10 build-doc, orch writes phase-4-status) | OK |
| orch-active ↔ orch-standby | none (phase-4 docs vs sherpa docs) | OK |
| p7-cortex-deepening ↔ anything-in-repo | none (TERRITORY is /tmp/**) | OK (out-of-perimeter — §11.2.4) |
| Wave 1 phase4-t8/t9 ↔ each other | clean (Wave-1 §5 finding preserved) | OK |
| Wave 1 r11-* ↔ Wave 2 anything | none (Wave-1 docs are validator-exclusive report files) | OK |

**One Tier 1 overlap detected. All other pairs clean.**

## §11.4 — Wave-1 manifest amendment workflow exercised [KNOWN]

Two operator-arbitrated §3.9 manifest amendments shipped between Wave-1 audit (`759b65e`) and Wave-2 dispatch:
- `6d7dff3 spike(§3.9): correct phase4-t8-exec manifest — daemon .test.ts + chat-shell legacy probe path` — corrected `cost-aggregator*.spec.ts` → `cost-aggregator*.test.ts` (wrong test-file extension) AND added 2 chat-shell probe glob variants (`.spec.ts` + `.spec.tsx`)
- `e5c7c96 spike(§3.9): expand phase4-t9-exec manifest to workstation-side per operator arbitration` — expanded TERRITORY to include `coarchitect-ipc.ts`, `rate-limit-aggregator*.ts`, `mount.ts` (workstation-side scope discovery)

**Significance:** These amendments empirically validate the manifest-as-living-artifact pattern. Sessions discover scope misspec mid-flight; operator arbitrates an amendment commit; session resumes against corrected manifest. This is the §3.9.D "stale manifest references" honest-gap category being exercised as a *feature* rather than a *failure mode* — the manifest can be amended cleanly via spike-grammar commit.

**Implication for §3.9.A enforcement design:** Any in-process enforcement hook (pre-commit, pre-add wrapper, IDE plugin) must re-read the manifest file fresh at each enforcement event — caching the parsed manifest at session start would silently bypass operator amendments.

## §11.5 — Empirical resolution of Wave-1 §4.1 (archive-writer TERRITORY ⊆ FORBIDDEN glob) [KNOWN]

Wave-1 §4.1 surfaced that `r11-archive-writer.txt` TERRITORY (3 `docs/cairn-*.md` files) is fully shadowed by its own FORBIDDEN glob `docs/cairn-*.md`. The Wave-1 ambiguity: which clause wins?

Post-Wave-1 commits `72c28fc spike(§3.9): SESSION-r11-archive-writer first commit — round-11.md skeleton authored` and `9a9a96a spike(§3.9): SESSION-r11-archive-writer §1.5-§1.7 + §2.C-§2.D — first-cohort live evidence captured` both wrote `docs/cairn-under-stress-round-11.md` successfully without raising HALT-TERRITORY-VIOLATION.

**Empirical conclusion:** Either (a) the de-facto precedence is TERRITORY-beats-FORBIDDEN, or (b) §3.9.A enforcement is unimplemented (Wave-1 §8 honest gap confirmed). The two hypotheses are observationally indistinguishable at this commit cohort. Both resolve to "archive-writer is functioning"; neither resolves to "§3.9.A is actively gating writes."

This **does NOT close** the Wave-1 operator-arbitration request — explicit codification of precedence in dispatch-queue §0 is still needed because the same ambiguity will affect future manifests and any actual §3.9.A enforcement implementation.

## §11.6 — Cross-check commit-log validation (now non-empty) [KNOWN]

18 commits exist between `759b65e` (Wave-1 audit) and HEAD at Wave-2 entry. Sampled four cairn-grammar / spike commits via `git show --stat`:

| Commit | Session inferred | Files touched | Manifest match |
|---|---|---|---|
| `afd3778` | phase4-t9-exec (subject MB-T-WIREFRAME-T9) | `docs/coordination/mb-t-wireframe-t9-findings-2026-05-12.md` | ✓ in TERRITORY |
| `155933f` | phase4-t8-exec (subject MB-T-WIREFRAME-T8) | T8 build-doc + 3 T8 coord docs (4 files) | ✓ all 4 in TERRITORY |
| `8d35c93` | r11-queue-watcher | `docs/coordination/queue-watcher-report.md` | ✓ exact TERRITORY match |
| `9a9a96a` | r11-archive-writer | `docs/cairn-under-stress-round-11.md` | ✓ in TERRITORY (per §11.5 resolution) |

**Sample size:** 4 of 18 cairn/spike commits. Sampled-set compliance rate: 100%. Full-set compliance rate: [MODELED, not measured] high — no contradictory evidence observed at commit-subject scan.

**Note:** No HALT-TERRITORY-VIOLATION events were reported by any session. This is consistent with either (a) sessions self-disciplining well + per-path-add convention, or (b) §3.9.A enforcement unimplemented (Wave-1 §8). The two hypotheses cannot be distinguished without observing a session ATTEMPTING an out-of-territory write.

## §11.7 — Outcome classification (Wave 2)

**Capability enabled with known limitations** (unchanged from Wave 1, with two material updates):

1. **Tier 1 t1↔verify-chat-mount overlap (§11.2.1)** is the most concrete operational risk currently in the §3.9 ledger. Two concurrent sessions, three shared TERRITORY files, no fence. Operator must arbitrate one of remediations (a/b/c) before either session commits to those files.
2. **Empirically, §3.9 is functioning as a discipline framework, not yet as an enforced contract** (§11.5 + §11.6). Manifests are being authored, amended, and respected by sessions, but no enforcement event has been observed. This is consistent with SPECULATIVE primitive status — validation is performative + post-hoc, not preventive.

## §11.8 — Honest gaps update (per §3.9.D)

| Category | Wave-1 status | Wave-2 update |
|---|---|---|
| Manifest authoring contradictions | 1 case (archive-writer) | **+3 cases** (t1 broad-glob, t3 dual-clause, p7 dual-clause) |
| §3.9 grammar — precedence rule | Unspecified | **Empirically resolved as TERRITORY-beats-FORBIDDEN-or-no-enforcement** (§11.5); explicit codification still required |
| §3.9 grammar — READ-ONLY default | Unspecified | **More load-bearing** as adoption rises 40%→56% |
| §3.9 grammar — extra-repo TERRITORY | Not exercised | **Now exercised** (p7, §11.2.4); meta-rule needed |
| §3.9 grammar — non-glob clause content | Not exercised | **Now exercised** (orch-standby prose + 4 pseudo-path sentinels, §11.2.5–6) |
| §3.9 enforcement | Unimplemented hypothesis | **Consistent with all observations** — no enforcement event, no halt event, no out-of-territory commit observed; status remains [SPECULATIVE] |
| Manifest amendment workflow | Not exercised | **Exercised cleanly** (§11.4) — manifest-as-living-artifact validated; design implication: enforcement engine must re-read manifest at each event |
| Validator coverage — grammar | Validated | Re-validated for 9 more manifests |
| Validator coverage — overlap | Zero overlaps | **1 Tier-1 overlap** found (§11.2.1) — independently corroborated by r11-queue-watcher |
| Validator coverage — enforcement | Empty window | Non-empty window; 100% sample compliance; no enforcement event observable |

## §11.9 — Recommendations (Wave 2 forward-position)

**Tier 1 — operator-immediate:**
1. Resolve t1↔verify-chat-mount overlap (§11.2.1) before either session commits to the three shared TERRITORY files. Recommend remediation (a) — add carve-outs to t1 FORBIDDEN — as least-invasive.
2. Codify §3.9 precedence rule in dispatch-queue §0: "TERRITORY clauses claim files; FORBIDDEN clauses deny files; if a path matches BOTH within a single manifest, FORBIDDEN wins (deny). Operator-amend the manifest to resolve." This is the only interpretation under which authored manifests are unambiguous.
3. Strip duplicate paths from t3 and p7 READ-ONLY ∩ FORBIDDEN clauses (§11.2.2, §11.2.3).

**Tier 2 — manifest grammar formalization:**
4. Encode READ-ONLY clause default ("implicit read-all-except-FORBIDDEN") in dispatch-queue §0.
5. Lift frozen-contract list to dispatch-queue §0 only; deprecate per-manifest replication (carry forward from Wave-1 §4.2).
6. Define manifest semantics for extra-repo TERRITORY (§11.2.4) — accept-as-out-of-perimeter or reject-at-queue-authoring.
7. Replace prose READ-ONLY qualifiers and pseudo-path FORBIDDEN sentinels with literal globs or move to a separate INTENT: clause (§11.2.5–6).

**Tier 3 — convention nudges:**
8. Future manifests should prefer **narrow probe-prefix globs** over **broad subdirectory globs + carve-outs** for shared-dir contexts (§11.2.7).
9. Schedule §3.9.A enforcement-hook prototype spike. Current evidence shows sessions self-discipline well, but a malicious or distracted session would not be caught.

## §11.10 — Self-check (validator-scoped, Wave 2)

- Read every Wave-2 manifest file? ✓ (9/9 read)
- Re-read Wave-1 amended manifests (phase4-t8 + phase4-t9)? ✓
- Cross-checked commit log? ✓ (18 commits 759b65e..HEAD; 4 spot-checks 100% compliant; no contradictory evidence in remaining 14 commit subjects)
- Stayed within TERRITORY? ✓ (only this file edited; manifest files read-only; commit will be pathspec-scoped)
- Per-path `git add` planned for commit? ✓ (single pathspec: `docs/coordination/manifest-validator-report.md`)
- Any unlabeled factual claim? ✓ ([KNOWN] / [MODELED] / [SPECULATIVE] labels applied per §2.2)
- Touched files another parallel session might modify? ✓ — TERRITORY file is validator-exclusive; pathspec mitigation already proven effective in Wave-1 commit (§6 of this report)
- Findings cross-corroborated where possible? ✓ — §11.2.1 (t1↔verify-chat-mount) independently observed by `r11-queue-watcher` per `8d35c93`
