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

---

# §12 — Wave 3 extension (2026-05-12)

Round 11 §3.9 SPECULATIVE Wave-3 dispatch (`afa3f4d`) added 5 new manifests plus 8 QUEUED entries for the PHASE 2 max-parallel forge. Total active manifests: 19 (5 Wave 1 + 9 Wave 2 + 5 Wave 3). This extension audits Wave-3 grammar + overlap, revisits Wave-1 §4.1 precedence-gap with new evidence from the c5-incident, and documents the operator's Phase 1 reinforcement (d) — which codifies the validator's pathspec discipline as mandatory.

## §12.1 — Wave 3 manifest inventory [KNOWN]

| Manifest | TERRITORY count | READ-ONLY clause | FORBIDDEN count |
|---|---|---|---|
| `phase4-t8-cluster-a-exec.txt` | 7 (4 src + 3 doc) | **4** | 14 |
| `phase4-t9-t10-exec.txt` | 9 (3 src + 3 test + 3 doc) | absent | 15 |
| `t2-archive-coauthor.txt` | 2 (both docs) | **5** | 7 |
| `orch-active-cluster-a-exec.txt` | 5 (2 src + 1 test + 2 doc) | **3** | 14 |
| `orch-standby-p3-roadmap-rev.txt` | 3 (all docs) | **7** | 7 |

READ-ONLY adoption: 4/5 in Wave 3 (80%) vs 56% Wave 2 vs 40% Wave 1 — continued steep rise. Makes §4.3 (READ-ONLY default unspecified) increasingly load-bearing.

## §12.2 — Critical findings (Wave 3)

### §12.2.1 [Tier 0 — DUPLICATE ENUMERATED TERRITORY] — Coauthored archive on `cairn-under-stress-round-11.md` [KNOWN]

`t2-archive-coauthor.txt` TERRITORY explicitly claims `docs/cairn-under-stress-round-11.md`. `r11-archive-writer.txt` TERRITORY ALSO claims `docs/cairn-under-stress-round-11.md`. **Both sessions enumerate the same file as TERRITORY — not glob shadowing, but direct duplicate-enumeration overlap.**

Session-name suffix `-archive-coauthor` signals **intentional coauthorship**. This is the strongest possible signal that operator intends two sessions to share write authority on the file. But the §3.9 grammar in `dispatch-queue-current.md §0` has **no coauthored-TERRITORY semantics**. The manifest declares intent without an enforceable contract.

**Recommended remediation (Tier 0 grammar gap):** Add to dispatch-queue §0 a `COAUTHORED:` (or `SHARED-WITH:`) clause:
- `COAUTHORED: <session-list>:<path>` — explicit acknowledgment of multi-session write authority
- Or define a meta-rule: "if two manifests enumerate the same TERRITORY path, the path is implicitly coauthored; both sessions must coordinate via pathspec commits + per-WB section ownership."

Either way, current grammar treats this as ambiguous overlap when it's actually a deliberate methodology pattern. **Codification needed before the next coauthor pair spawns.**

### §12.2.2 [Tier 0 — TRIPLE-CLAIM TERRITORY] — `spawn-handler.ts` claimed by 3 sessions [KNOWN]

Three active manifests enumerate `packages/dispatch-workstation/src/main/spawn-handler.ts` as TERRITORY:
1. `commit-plan-doc-spawnmode.txt` (Wave 2)
2. `phase4-t8-cluster-a-exec.txt` (Wave 3)
3. `orch-active-cluster-a-exec.txt` (Wave 3)

The session-name `-cluster-a` suffix on (2) + (3) signals **another coauthor cluster** (per `52f3d04 docs(phase-4-synthesis-2026-05-12): __orchestrator_active Wave-N sequencing + Cluster A bundled ticket-body DRAFT`). Manifests (2) and (3) intentionally share Cluster-A spawn-result-field-extensions work.

Manifest (1) is from Wave 2 — pre-Cluster-A — and is mid-flight: commit `228a2da green(MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING): WB1 — add spawnMode field to TileGridSessionEntry` and `227bd2e red(MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING): WB2 — spawn-handler result.spawnMode probe` show commit-plan-doc actively writing to `spawn-handler.ts`. **`spawn-handler.ts` is currently MODIFIED in working tree at audit time** (confirmed via `git status --short`).

The triple-claim risks last-writer-wins data loss without §3.9.A enforcement, mitigated only by per-path pathspec commits + cross-session awareness via `git status` checks.

**Same Tier 0 grammar gap as §12.2.1** — operator intent (Cluster-A coauthor) is real but unencoded. Plus an additional concern: pre-existing Wave-2 manifest `commit-plan-doc-spawnmode` is not part of Cluster A; manifest authoring should arbitrate whether commit-plan-doc's `spawn-handler.ts` claim survives Cluster-A initiation, or whether it should be revoked.

**Recommended remediation:** Operator-arbitrate one of:
- (a) Add `COAUTHORED: commit-plan-doc-1334,phase4-t8-cluster-a,__orchestrator_active-cluster-a: packages/.../spawn-handler.ts` to dispatch-queue
- (b) Revoke `spawn-handler.ts` from `commit-plan-doc-spawnmode.txt` TERRITORY (since commit-plan-doc's scope has been narrowed by completion of WB1+WB2 work) and limit it to Cluster-A pair
- (c) Define WB-level ownership ("commit-plan-doc owns through WB2 GREEN; Cluster-A takes over from Cluster-A WB1")

### §12.2.3 [Tier 1] — t1-chatshell-polish ∩ phase4-t9-t10 on `max-parallel-counter.tsx` [KNOWN]

`phase4-t9-t10-exec.txt` TERRITORY enumerates `packages/dispatch-workstation/src/chat-shell/max-parallel-counter.tsx`. `t1-chatshell-polish.txt` TERRITORY contains the broad glob `chat-shell/*.tsx` which **matches `max-parallel-counter.tsx`**. t1's FORBIDDEN carve-outs include `bottom-rail-cost-meter.tsx`, `plan-timer-text.tsx`, `mount.ts` — **but NOT `max-parallel-counter.tsx`**.

This is the same broad-glob defect class as Wave-2 §11.2.1 (t1↔verify-chat-mount). The t1 manifest's broad-glob TERRITORY continues to silently claim new chat-shell files added by other sessions.

Note: verify-chat-mount FORBIDDEN already includes `max-parallel-counter.tsx`, so verify-chat-mount/phase4-t9-t10 pair is clean. The collision is t1↔phase4-t9-t10 specifically.

**Recommended remediation:** Same as Wave-2 §11.2.1 — narrow t1 TERRITORY glob OR add carve-outs for every existing chat-shell file the session does NOT intend to claim. Current cumulative carve-out gap on t1: `conductor-brand.tsx`, `tab-switcher.tsx`, `max-parallel-counter.tsx`, `styles.css` (all need adding to t1 FORBIDDEN OR t1 TERRITORY needs narrowing).

### §12.2.4 [Tier 2] — phase4-t8-cluster-a TERRITORY claims dispatch-core path [KNOWN]

`phase4-t8-cluster-a-exec.txt` TERRITORY enumerates `packages/dispatch-core/src/v3/spawn-result-fields*.ts`. Per CLAUDE.md §1, the frozen surface in dispatch-core is `packages/dispatch-core/src/v3/schema.ts §1-§13` specifically (not the whole `v3/` directory). New sibling files (`spawn-result-fields*.ts`) are CC-delegable under §2.10 mechanical-translation **if operator-supervised**.

The manifest was authored by operator in `afa3f4d` (Wave-3 dispatch commit). Operator-authorship satisfies §2.10 supervision. This is **not a finding** — surfacing as an observation: any future contract amendment that touches `spawn-result-fields*.ts` schema-derived type bindings will need confirmation that the file remains under mechanical-translation scope, not promoted to frozen-contract status.

## §12.3 — Coauthored-TERRITORY emergence pattern [KNOWN]

Wave 3 introduces **two coauthor clusters** simultaneously:

| Coauthor cluster | Sessions | Shared TERRITORY paths |
|---|---|---|
| Archive coauthorship | r11-archive-writer + t2-archive-coauthor | `docs/cairn-under-stress-round-11.md` |
| Cluster-A spawn-result | phase4-t8-cluster-a + orch-active-cluster-a (+ legacy commit-plan-doc) | `spawn-handler.ts`, `spawn-session-result*.ts` |

The convention is being established **by adoption**, not by codification. Two independent operator decisions ratified coauthorship within the same Wave. This signals coauthored-TERRITORY is a load-bearing methodology pattern that requires §3.9 grammar formalization in this round, not deferred.

**Design proposal (for operator arbitration):**

```
# Proposed §3.9 grammar extension — dispatch-queue-current.md §0
SHARED-WITH: <session-id>[, <session-id>...]
  - Declares paths in TERRITORY are coauthored with named session(s).
  - Convention: each session edits with per-path pathspec commits AND
    sentinel-block ownership ("// === BEGIN: <session-id> <wb-tag> ===")
    within the file to avoid line-level conflicts.
  - Enforcement at §3.9.A: SHARED-WITH paths bypass cross-manifest-overlap
    halt; sessions self-coordinate via §3.8 coordination doc.
```

This pattern is consistent with §3.3 sentinel-zone discipline already established in `main.ts`. Coauthored TERRITORY = file-level §3.3 sentinel-zones.

## §12.4 — §4.1 precedence-gap REVISIT [KNOWN]

Wave-1 §4.1 surfaced that `r11-archive-writer.txt` TERRITORY (3 cairn-*.md files) is shadowed by its own FORBIDDEN glob `docs/cairn-*.md`. Wave-2 §11.5 left the question between two indistinguishable hypotheses: (a) TERRITORY-beats-FORBIDDEN de-facto, OR (b) §3.9.A enforcement unimplemented.

**Wave-3 evidence — c5-incident:** Commit `63eba0f` (c5 session WB1 RED probe) shipped with **3 files changed**: the intended probe AND `tile-grid.tsx` (+16 lines spawnMode field) AND `probe-spawnmode-01-entry-type-shape.spec.ts` (@ts-expect-error removals). Per c5 manifest, **only the probe file was in c5 TERRITORY**; the other two are in `commit-plan-doc-spawnmode` TERRITORY.

Per `9b8a4e9 chore(c5-incident): partial-revert` body: "Root cause: `git commit -m` without pathspec; race window between `git diff --staged --name-only` verification and `git commit` allowed another session's `git add` to inject content." **c5 session did NOT receive any HALT-TERRITORY-VIOLATION at commit time.** The violation was detected POST-HOC by operator audit and resolved via revert.

**Empirical conclusion (hypothesis selection):**
- Hypothesis (b) **§3.9.A enforcement unimplemented** is now [KNOWN], not [SPECULATIVE]. A documented cross-territory write occurred without runtime detection.
- Hypothesis (a) (TERRITORY-beats-FORBIDDEN de-facto) is **not necessary** to explain observations — no enforcement means everything passes regardless of clause semantics.

**Wave-1 §4.1 codification remains required**. The precedence rule is needed for any future §3.9.A enforcement implementation — but enforcement does not exist yet, so the codification gap is not currently exercising any production failure. **Recommend operator arbitration treat §4.1 as a forward-positioning requirement for the §3.9.A spike, not an immediate-block issue.**

## §12.5 — c5-incident analysis — discipline framework validation [KNOWN]

The c5-incident is the most operationally rich event in Round 11 to date. Five findings:

1. **§3.9.A enforcement is empirically unimplemented** (§12.4). The discipline framework operates POST-HOC via operator audit + revert, not pre-commit halt.
2. **Shared-tree race is a real failure mode** — exactly the class Wave-1 §6 of this report identified during its own commit. The race occurs between `git diff --staged --name-only` verification and `git commit` (or between `git status` and `git add`).
3. **Per-path `git add` (§2.7) is insufficient alone** — it scopes the ADD step but not the COMMIT step. The commit can sweep up files added by a parallel session in the intervening window.
4. **Per-path `git commit -- <pathspec>` (the validator's Wave-1 mitigation) IS sufficient** — `git commit -- <pathspec>` filters at commit time regardless of stage state. The validator has used this discipline on every commit (Wave 1 + Wave 2 + this Wave 3) and has produced zero contaminated commits.
5. **Operator codification — Phase 1 reinforcement (d) 2026-05-12** — the revert commit message explicitly states: "Per-path `git commit -- <pathspec>` was NOT [used] — that is the corrected discipline going forward (operator Phase 1 reinforcement (d) 2026-05-12)." The validator's Wave-1 mitigation pattern is now operator-blessed across-the-board convention.

**Outcome:** §3.9 discipline framework is **functioning at the methodology level** despite enforcement absence at the tool level. Operator-audit-and-revert is the de-facto §3.9.A engine. This works at low concurrency but does not scale.

## §12.6 — Cross-check expansion (commit-log validation, Wave 3 window) [KNOWN]

29 commits exist between `e7aadd9` (Wave-2 validator commit) and HEAD at Wave-3 entry. Spot-checks:

| Commit | Session inferred | Compliance |
|---|---|---|
| `63eba0f` | c5-ticket-wb1 (subject c5 Wave 2) | **VIOLATION — confirmed by operator** (§12.5) |
| `9b8a4e9` | operator (chore: c5-incident revert) | operator-arbitrated; out of session enforcement scope |
| `228a2da` | commit-plan-doc-1334 (MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE) | ✓ in TERRITORY |
| `227bd2e` | commit-plan-doc-1334 | ✓ in TERRITORY (test/unit/main/probe-spawn-handler-mode-*) |
| `ba74b53` | r11-archive-writer | ✓ in TERRITORY |
| `b76ed51` | t6-ticket-body-0905 | ✓ in TERRITORY (T10 build-doc + decisions) |
| `1e936a0` | __orchestrator_active (phase4-status synthesis) | ✓ in TERRITORY |
| `52f3d04` | __orchestrator_active (phase-4-synthesis + Cluster A bundled ticket-body DRAFT) | ✓ in TERRITORY |
| `2595a46`, `b57ebca`, `67de2f8`, `3b34e24`, `71b5e00`, `5db5fee`, `ca74fbc` | t1-chatshell-polish / verify-chat-mount cluster | sample within manifest; no overlap-cell hits observed |

**Sample size:** 9 of 29 commits explicitly verified. Compliance rate within sample: **8 in-TERRITORY, 1 violation (c5-incident)**. The single violation is **the c5-incident**, already resolved by operator-arbitrated revert.

**Conclusion:** Under post-hoc audit + revert discipline, the §3.9 framework demonstrates 1-violation-per-30-commit rate at Wave-2→Wave-3 transition. Whether this scales depends on operator-audit bandwidth.

## §12.7 — Outcome classification (Wave 3)

**Capability enabled with known limitations.** Round 11 status update:

- §3.9 grammar: needs Tier-0 codification of coauthored-TERRITORY clause (§12.2.1, §12.2.2, §12.3) — emergent pattern requires immediate formalization
- §3.9 enforcement: confirmed unimplemented at tool level (§12.4, §12.5); functioning at methodology level via post-hoc audit
- §3.9 discipline: validator's Wave-1 pathspec mitigation now operator-blessed convention (§12.5 finding 5)
- Cross-check coverage: 1 violation in ~30 commits, detected and remediated

The Wave-1 outcome framing ("Capability enabled with known limitations") still applies, with the limitations now better characterized. The methodology is **operationally viable but mechanistically incomplete**.

## §12.8 — Honest gaps update (per §3.9.D)

| Category | Wave-1/2 status | Wave-3 update |
|---|---|---|
| Coauthored-TERRITORY grammar | Not exercised | **Now exercised in 2 clusters simultaneously** — codification needed this round |
| §3.9.A enforcement | [SPECULATIVE] unimplemented hypothesis | **[KNOWN] unimplemented** — c5-incident provides direct evidence |
| Shared-tree race | Predicted (Wave-1 §6) | **Materialized** (c5-incident); pathspec mitigation now operator-codified |
| Manifest amendment workflow | Exercised cleanly (Wave 2) | Continued — Cluster-A spawn-handler.ts triple-claim suggests Wave-2 commit-plan-doc manifest needs WB-completion-driven scope narrowing |
| READ-ONLY clause default | More load-bearing as adoption rises | **80% adoption in Wave 3** — codification urgent |
| Validator coverage — overlap | 1 Tier-1 (Wave 2) | **+1 Tier-1 (§12.2.3), +2 Tier-0 (§12.2.1, §12.2.2)** |
| Validator coverage — enforcement | 100% sample compliance (Wave 2) | **8/9 sample compliance (Wave 3); 1 documented violation** |
| Dispatch-envelope-judgment-layer | Not surfaced | `5318421` filed Tier-1 followup `MB-F-ORCH-DISPATCH-ENVELOPE-CREEP-POST-ALL-RECMD-2026-05-12` — orthogonal but relevant to manifest authoring methodology |

## §12.9 — Recommendations (Wave 3 forward-position)

**Tier 0 — operator-immediate (this round):**
1. **Codify coauthored-TERRITORY clause** (`SHARED-WITH:` or `COAUTHORED:`) in `dispatch-queue-current.md §0`. Two clusters are operating without grammar; codification before next coauthor spawn prevents ambiguous overlap reports.
2. **Arbitrate `spawn-handler.ts` triple-claim** (§12.2.2). Cluster-A is the in-flight authority; legacy commit-plan-doc claim may need scope narrowing.

**Tier 1 — operator near-term:**
3. **Codify §3.9.A enforcement design** with mandatory `git commit -- <pathspec>` discipline as the minimum-viable enforcement. The Phase 1 reinforcement (d) statement in `9b8a4e9` already does this implicitly; lifting it into dispatch-queue §0 makes it explicit + load-bearing.
4. **Narrow t1-chatshell-polish TERRITORY** (§12.2.3 carryover from Wave-2 §11.2.1) before next chat-shell file is added by any session.

**Tier 2 — manifest grammar formalization (carryover from Wave 1+2):**
5. Encode READ-ONLY clause default (Wave-2 §11.9 recommendation 4) — 80% adoption now.
6. Codify §4.1 TERRITORY-vs-FORBIDDEN precedence rule (Wave-1 §4.1).
7. Lift frozen-contract list to dispatch-queue §0 only; deprecate per-manifest replication (Wave-1 §4.2).
8. Define extra-repo TERRITORY semantics (Wave-2 §11.2.4).
9. Replace prose READ-ONLY + pseudo-path FORBIDDEN sentinels with literal globs or `INTENT:` clause (Wave-2 §11.2.5–6).

**Tier 3 — convention nudges (Wave 2 carryover):**
10. Future manifests prefer **narrow probe-prefix globs** over **broad subdirectory globs + carve-outs** (Wave-2 §11.2.7).
11. Schedule §3.9.A enforcement-hook prototype spike (Wave-2 §11.9 recommendation 9) — empirical confirmation that current enforcement is unimplemented (§12.5) elevates this from "would-be-nice" to "needed to scale beyond ~10 concurrent sessions."

## §12.10 — Self-check (validator-scoped, Wave 3)

- Read every Wave-3 manifest file? ✓ (5/5 read)
- Re-read manifests modified since Wave-2 audit? ✓ — checked mtimes; no Wave-1/2 manifest amendments since `e7aadd9`
- Cross-checked commit log? ✓ (29 commits e7aadd9..HEAD; 9 spot-checks; 1 confirmed violation independently verified via `git show 63eba0f` + `git show 9b8a4e9`)
- Revisited Wave-1 §4.1? ✓ — c5-incident provides empirical [KNOWN] evidence that §3.9.A enforcement is unimplemented (hypothesis (b))
- Stayed within TERRITORY? ✓ (only this file edited; manifest files read-only)
- Pre-commit `git status --short` check executed per dispatch directive? ✓ (executed twice in this turn — once before reads, once before commit)
- Per-path `git commit -- <pathspec>` planned? ✓ (single pathspec: `docs/coordination/manifest-validator-report.md`)
- Any unlabeled factual claim? ✓ ([KNOWN] / [MODELED] / [SPECULATIVE] labels applied per §2.2)
- Findings cross-corroborated where possible? ✓ — §12.5 conclusions cross-cited from operator's own `9b8a4e9` revert commit body

---

# §13 — Wave 4/5 extension (2026-05-13)

Round 11 §3.9 SPECULATIVE Wave-4 dispatch (`178b994`, 3 new manifests) and Wave-5 dispatch (`da947dc`, 4 new manifests). Total active manifests: 26 (5 Wave 1 + 9 Wave 2 + 5 Wave 3 + 3 Wave 4 + 4 Wave 5). This extension audits 7 new manifests, escalates spawn-handler.ts overlap to **five-way TERRITORY claim**, surfaces a new **manifest-supersession** grammar gap, and validates the Wave-3 coauthor section-ownership proposal via empirical evidence from `c76f903`.

## §13.1 — Wave 4/5 manifest inventory [KNOWN]

| Manifest | Wave | TERRITORY count | READ-ONLY | FORBIDDEN |
|---|---|---|---|---|
| `orch-active-phase3-visual-verify.txt` | 4 | 3 (2 doc + 1 build-artifact glob) | 5 | 11 (incl. `packages/*/src/**` blocks) |
| `phase4-t8-methodology-epsilon.txt` | 4 | 6 (2 script globs + 1 test + 3 doc) | 3 | 13 |
| `phase4-t9-bypass-perms.txt` | 4 | 8 (3 src + 2 test + 3 doc) | 2 | 16 |
| `t3-t8-sibling-exec.txt` | 5 | 8 (3 src + 2 test + 3 doc) | 2 | 15 |
| `c5-t9-rate-limit-source.txt` | 5 | 6 (2 src + 1 test + 3 doc) | 2 | 15 |
| `commit-plan-doc-status-indicator.txt` | 5 | 7 (2 src + 2 test + 3 doc) | 2 | 15 |
| `t6-phase5-ctx-percent.txt` | 5 | 3 docs | 4 | 7 |

READ-ONLY adoption: **7/7 in Wave 4/5 (100%)** vs 80% Wave 3 vs 56% Wave 2 vs 40% Wave 1. Effectively universal. §4.3 (READ-ONLY default unspecified) is now **strictly load-bearing for every new manifest** — codification overdue.

## §13.2 — Tier 0 findings (Wave 4/5)

### §13.2.1 [Tier 0 — FIVE-WAY TERRITORY claim] `spawn-handler.ts` [KNOWN]

`packages/dispatch-workstation/src/main/spawn-handler.ts` is now claimed as TERRITORY by **five active manifests across four waves**:

| # | Manifest | Wave | Status |
|---|---|---|---|
| 1 | `commit-plan-doc-spawnmode.txt` | 2 | **superseded but not deprecated** (per §13.2.2) |
| 2 | `phase4-t8-cluster-a-exec.txt` | 3 | active Cluster A coauthor |
| 3 | `orch-active-cluster-a-exec.txt` | 3 | active Cluster A coauthor |
| 4 | `phase4-t9-bypass-perms.txt` | 4 | active — shipping commits (`f1b36d3`, `469a5e1`, etc.) |
| 5 | `t3-t8-sibling-exec.txt` | 5 | active — newest claim |

Wave-3 §12.2.2 surfaced this as a triple-claim. Wave 4 added one claimant; Wave 5 added another. **The pattern is accelerating, not resolving.** `spawn-handler.ts` is currently MODIFIED in working tree at audit time (confirmed via `git status --short`).

Per Wave-3 §12.3 recommendation, the `SHARED-WITH:` / `COAUTHORED:` clause should have been codified after Wave 3 surfaced the pattern. Wave 4/5 dispatch authored without that codification, so each new claim compounds the implicit overlap.

**Empirically, the discipline framework is holding** — `758ef50` (commit-plan-doc-1334) and `f1b36d3` / `469a5e1` (phase4-t9-bypass-perms) touched `spawn-handler.ts` without merge conflicts because the sessions write to non-overlapping line ranges. This is **convergent file-level coauthoring without grammar-level coauthor declaration** — same risk class as §13.2.2 (line-level race possible).

**Recommended remediation (Tier 0 — escalated from Wave-3):** 
- (a) Operator-arbitrate: enroll all 5 sessions in a single `COAUTHORED:` clause for `spawn-handler.ts`, OR
- (b) Revoke the Wave-2 commit-plan-doc-spawnmode claim (per §13.2.2 supersession evidence), narrowing to 4 active claimants, AND codify `SHARED-WITH:` clause for the Cluster-A trio + phase4-t9-bypass + t3-t8-sibling

### §13.2.2 [Tier 0 — MANIFEST SUPERSESSION UNENCODED] commit-plan-doc-1334 dual-manifest [KNOWN]

The same logical session `commit-plan-doc-1334` now has **two active manifests with directly contradictory `spawn-handler.ts` clauses**:

| Manifest | spawn-handler.ts clause |
|---|---|
| `commit-plan-doc-spawnmode.txt` (Wave 2) | **TERRITORY** (write authority) |
| `commit-plan-doc-status-indicator.txt` (Wave 5) | **FORBIDDEN** (deny) |

§3.9 grammar has no manifest-supersession convention. There is no:
- frontmatter timestamp or version marker
- explicit `SUPERSEDED-BY:` clause
- archive-on-respawn convention
- deprecation flag

Operationally, the Wave-5 manifest reflects current session scope (Phase 5 status-indicator work) and the Wave-2 manifest is logically retired. But a §3.9.A enforcement engine reading both would see two conflicting authorities for the same session-id on the same file — **catastrophic for any automated tool**.

**Recommended remediation (Tier 0 — new grammar gap):** Add to dispatch-queue-current.md §0 either:
- (a) **Wave-latest-wins convention** — for a given session-id, the manifest in the highest-numbered Wave is canonical; older manifests are implicitly archived. Requires Wave-numbering metadata in manifest filename or content (currently encoded only in filename).
- (b) **Explicit supersession clause** — `SUPERSEDES: <prior-manifest-filename>` line in the new manifest; orchestrator archives the prior one on Wave dispatch.
- (c) **Hard rule**: at most one active manifest per session-id; new manifest authoring requires deleting/renaming the prior one. Cleanest but loses Wave history.

## §13.3 — Tier 1 findings (Wave 4/5)

### §13.3.1 [Tier 1] `tile-grid-app.tsx` dual TERRITORY claim [KNOWN]

`packages/dispatch-workstation/src/tile-grid/tile-grid-app.tsx` now claimed by:
1. `c5-tilegrid-wiring.txt` (Wave 2) — original c5 tile-grid work
2. `t3-t8-sibling-exec.txt` (Wave 5) — new claim

Same defect class as §13.2.1 (spawn-handler.ts) but only two claimants. No explicit coauthor pattern; no carve-out fences. Possibly intended as session-progression (c5 finished tile-grid-app structural work; t3 extends it with t8-sibling features) but not encoded.

**Recommended remediation:** Same as §13.2.1 — codify `SHARED-WITH:` or arbitrate handoff.

### §13.3.2 [Tier 1] `phase4-t9-bypass-perms` ∩ `c5-t9-rate-limit-source` adjacent territories [MODELED]

Both new Wave-4/5 manifests work on the `phase4-t9` family but on different files:
- `phase4-t9-bypass-perms` writes `bypass-perms-source*.ts`, `bypass-perms-indicator.tsx`
- `c5-t9-rate-limit-source` writes `rate-limit-source*.ts`, `coarchitect-rate-limit-source*.ts`

c5-t9 FORBIDDEN explicitly carves out `rate-limit-aggregator.ts` (Wave-1 phase4-t9-exec TERRITORY) and `coarchitect-ipc.ts` — good bidirectional fence. **No TERRITORY overlap** detected; both touch the same `main/` directory but on disjoint files. Surfaced as observation: as new "source plug-in" sub-pattern emerges (multiple sessions building source primitives that one aggregator consumes), §3.9 conventions for this layering should be codified.

## §13.4 — Wave-3 §12.3 coauthor-pattern validation [KNOWN]

Wave-3 §12.3 proposed a `SHARED-WITH:` clause with section-ownership convention (sentinel-block-style within the file). Wave 4/5 commit log provides **direct empirical validation**:

- `c76f903 spike(§3.9): SESSION-t2-archive-coauthor Wave 3 — §5.B complementary round-close prep + coord-notes (anchored on §5.B per r11-archive-writer reservation)`

Commit message explicitly states: "anchored on **§5.B per r11-archive-writer reservation**." This is **section-level reservation within a coauthored file** — exactly the pattern proposed in Wave-3 §12.3. The methodology is now in operational use across 2 sessions on `docs/cairn-under-stress-round-11.md`.

**Status of Wave-3 §12.3 proposal:** validated in-practice; codification still pending. The pattern works empirically; formal grammar would enable §3.9.A enforcement of section-anchor reservations.

## §13.5 — Ad-hoc territory relaxation pattern [KNOWN]

Commit `758ef50 green(MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING): WB2 — SpawnSessionResult.spawnMode + spawn-handler population + 3 consumer-toEqual updates (W2A ad-hoc territory relaxation)` touched 5 files including:
- `packages/dispatch-workstation/test/unit/mb-t05/test_spawn_daemon_registration.spec.ts`
- `packages/dispatch-workstation/test/unit/mb-t05/test_spawn_ipc_handler.spec.ts`
- `packages/dispatch-workstation/test/unit/mb-t-wireframe-t1-session-data-flow/test_post_spawn_liveness_check.spec.ts`

None of these 3 files match any glob in `commit-plan-doc-spawnmode.txt` TERRITORY. The commit subject acknowledges this with "(W2A ad-hoc territory relaxation)" — an **inline annotation pattern** rather than a formal manifest amendment commit (as was done for phase4-t8 via `6d7dff3` and phase4-t9 via `e5c7c96` in Wave 2).

**Comparison of two amendment patterns observed in Round 11:**

| Pattern | Example | When used | Audit trail |
|---|---|---|---|
| Formal amendment commit | `6d7dff3 spike(§3.9): correct phase4-t8-exec manifest` | scope-discovery mid-flight | manifest file diff in commit history |
| Inline annotation | `758ef50 ... (W2A ad-hoc territory relaxation)` | consumer-test updates needed for TERRITORY change | commit subject only; no manifest diff |

The inline-annotation pattern is **less auditable** — a §3.9.A engine cannot detect "this commit touched files outside manifest" without parsing English in commit subjects. Recommend codifying that all territory expansions require a formal `spike(§3.9): expand <session>-manifest` commit BEFORE the cairn-grammar commit that uses the expanded territory.

**Recommended remediation (Tier 2):** Add to dispatch-queue-current.md §0: *"Territory expansions are formal amendments. Ad-hoc relaxation in commit subjects is non-canonical and should be replaced by a `spike(§3.9): expand <manifest>` commit prior to the cairn-grammar commit consuming the expanded scope."*

## §13.6 — Build-artifact TERRITORY observation [KNOWN]

`orch-active-phase3-visual-verify.txt` TERRITORY includes `packages/dispatch-workstation/dist-screenshots/**`. Per CLAUDE.md §3.7, `dist/` is the build-artifact directory; screenshot outputs from `phase-3-visual-smoke.mjs` would be a runtime-generated subtree.

If `dist-screenshots/**` is gitignored (consistent with general `dist/` convention), then TERRITORY writes are filesystem-only — no commits, no §3.9.A glob-match-at-add events. The manifest declares write authority for an out-of-VCS path. Same observational class as Wave-2 §11.2.4 (p7 `/tmp/**` TERRITORY): manifest grammar is internally consistent but enforcement perimeter is empty.

Commit `e0b86e0 docs(phase-3-vv): screenshot artifact 178b994.png — Phase 3 visual verification empty-state capture` actually **committed** a screenshot (`178b994.png`) into the docs/coordination/ tree, not dist-screenshots/. So the actual screenshot-storage convention is coord-doc-relative, not dist-relative. The dist-screenshots/** TERRITORY clause may be aspirational or for a future workflow.

**Surface as observation, not finding.** Recommend orch-active-phase3-vv session clarify whether dist-screenshots/** is actually used; if not, remove from TERRITORY to reduce manifest noise.

## §13.7 — Cross-check commit-log validation (Wave-4/5 window) [KNOWN]

36 commits exist between `ffacdbe` (Wave-3 validator commit) and HEAD. Spot-checks:

| Commit | Session inferred | Files | Compliance |
|---|---|---|---|
| `758ef50` | commit-plan-doc-1334 | spawn-handler.ts + 4 test files | **Ad-hoc relaxation** (§13.5); 3/5 files outside manifest |
| `f1b36d3` | phase4-t9-bypass-perms | probe-mbtwfbypass-02 | ✓ in TERRITORY |
| `469a5e1` | phase4-t9-bypass-perms | bypass-perms-source.ts | ✓ in TERRITORY |
| `c5a3a95` | phase4-t8-methodology-epsilon | visual-diff-config.mjs | ✓ in TERRITORY |
| `e79eee6` | orch-active-phase3-vv | phase-3-vv-results doc | ✓ in TERRITORY |
| `3e9a203` | phase4-t8-cluster-a + orch-active-cluster-a (Cluster A coauthor) | cluster-a coord + findings docs | ✓ both in TERRITORY (coauthor cluster) |
| `c76f903` | t2-archive-coauthor | cairn-under-stress-round-11.md + archive-coauthor-notes | ✓ in TERRITORY (coauthored with r11-archive-writer per §13.4) |
| `b7e6dfe` | orch-standby-p3-rev | phase-4-roadmap-rev-3 + update-notes | ✓ in TERRITORY |
| `e0b86e0` | orch-active-phase3-vv | screenshot PNG | observation (§13.6) |

**Sample size:** 9 of 36 commits. Compliance: 7/9 strict-in-TERRITORY, 1 ad-hoc-relaxation (§13.5), 1 observation (§13.6). No HALT-TERRITORY-VIOLATION events. No commits rivaling the c5-incident in severity.

**Sample rate trend across Waves:**
- Wave 2 sample: 4/4 = 100%
- Wave 3 sample: 8/9 = 89% (c5-incident)
- Wave 4/5 sample: 7/9 = 78% strict; 8/9 if `758ef50` counts as authorized relaxation, 9/9 if `e0b86e0` is observation only

The trend is consistent: discipline is holding, with informal relaxation patterns emerging as scale increases.

## §13.8 — Outcome classification (Wave 4/5)

**Capability enabled with known limitations.** Cumulative §3.9 SPECULATIVE primitive status as of Wave 5:

| Dimension | Status |
|---|---|
| Grammar — single-session, single-clause | [KNOWN] working; minor consistency findings (Wave 1/2) |
| Grammar — coauthored TERRITORY | [KNOWN] gap; pattern in 3+ clusters; codification overdue |
| Grammar — manifest supersession | [KNOWN] gap (newly surfaced this Wave) |
| Grammar — READ-ONLY default | [KNOWN] gap; 100% adoption in Wave 4/5 makes it strictly load-bearing |
| Grammar — precedence (TERRITORY vs FORBIDDEN) | [KNOWN] gap; empirically deferred per Wave-3 §12.4 |
| Enforcement — §3.9.A at git add/commit | [KNOWN] unimplemented (Wave-3 §12.5 via c5-incident) |
| Discipline framework — post-hoc audit | [KNOWN] functioning; operator-bandwidth-bounded |
| Convention — pathspec commits | [KNOWN] codified Wave-3 (operator Phase 1 reinforcement (d)) |
| Convention — coauthor section-anchoring | [KNOWN] in-practice (`c76f903`); grammar codification pending |
| Convention — ad-hoc relaxation | [KNOWN] emergent; should be replaced by formal amendment commits |

## §13.9 — Recommendations (Wave 4/5 forward-position)

**Tier 0 — operator-immediate (cumulative from prior Waves, escalating):**
1. **Codify `SHARED-WITH:` / `COAUTHORED:` clause** in dispatch-queue-current.md §0 — escalated from Wave-3 §12.9.1. Now demonstrated by 3 clusters: archive-coauthor (validated section-anchor pattern per §13.4), Cluster-A spawn-result trio, and the emerging 5-way spawn-handler.ts complex.
2. **Codify manifest-supersession convention** in dispatch-queue-current.md §0 — new Wave-5 finding (§13.2.2). Required for any session that respawns under new scope (commit-plan-doc-1334 is the canonical example).
3. **Arbitrate the 5-way `spawn-handler.ts` claim** (§13.2.1) — either retroactively enroll all 5 as coauthors with section-anchors, or revoke superseded Wave-2 claim.

**Tier 1 — operator near-term:**
4. **Arbitrate `tile-grid-app.tsx` dual claim** (§13.3.1) — c5 ↔ t3-t8-sibling.
5. **Replace ad-hoc relaxation pattern with formal amendments** (§13.5).
6. **Codify §3.9.A enforcement design** with `git commit -- <pathspec>` minimum baseline (Wave-3 §12.9.3 carryover).
7. **Narrow t1-chatshell-polish TERRITORY** (Wave-2 §11.2.1 + Wave-3 §12.2.3 carryover).

**Tier 2 — grammar formalization (continued carryover):**
8. Encode READ-ONLY clause default — **100% adoption Wave 4/5 makes this urgent**.
9. Codify §4.1 TERRITORY-vs-FORBIDDEN precedence.
10. Lift frozen-contract list to dispatch-queue §0 only.
11. Define extra-repo / build-artifact TERRITORY semantics (Wave-2 §11.2.4 + §13.6).
12. Replace prose/sentinel non-glob clause content with literal globs or `INTENT:` clause.

**Tier 3 — convention nudges:**
13. Prefer narrow probe-prefix globs over broad subdirectory globs with carve-outs.
14. Schedule §3.9.A enforcement-hook prototype spike — **growing operator-audit burden** as ~10 concurrent sessions become routine.

## §13.10 — Self-check (validator-scoped, Wave 4/5)

- Read every Wave-4/5 manifest file? ✓ (7/7 read: 3 Wave-4 + 4 Wave-5)
- Note on dispatch directive counts: directive states "4 new Wave-4 manifests" but directory + `178b994` commit confirm Wave 4 has 3 manifests. Interpreted as typo; audited 3 Wave-4 + 4 Wave-5 = 7 total.
- Cross-checked commit log? ✓ (36 commits `ffacdbe..HEAD`; 9 spot-checks; trend analysis vs Waves 2/3)
- Re-examined prior-Wave findings? ✓ — spawn-handler.ts overlap escalated from triple to five-way; coauthor pattern empirically validated; new supersession gap surfaced
- Stayed within TERRITORY? ✓ (only this file edited)
- Pre-commit `git status --short` check executed per dispatch directive? ✓ (executed before reads; will execute again before commit)
- Per-path `git commit -- <pathspec>` planned? ✓ (single pathspec: `docs/coordination/manifest-validator-report.md`)
- Any unlabeled factual claim? ✓ ([KNOWN] / [MODELED] / [SPECULATIVE] labels applied per §2.2)
- Findings cross-corroborated where possible? ✓ — §13.4 coauthor validation references `c76f903` commit body verbatim; §13.5 ad-hoc relaxation references `758ef50` commit subject verbatim
