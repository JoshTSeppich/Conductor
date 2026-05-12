# Cairn Under Stress — Round 11 Live Evidence Archive

**Round shape:** Round 11 §3.9 SPECULATIVE adoption cascade — Territorial Partitioning + Manifested Dispatch Queue primitive validated against live multi-session execution. 5 IN-FLIGHT sessions pre-staged at round-start (`r11-archive-writer`, `r11-manifest-validator`, `r11-queue-watcher`, `phase4-t8-exec`, `phase4-t9-exec`); operator-acknowledged forward target of 16-concurrent attempt as upper-bound stress probe.

**Round started:** 2026-05-12T20:10Z (§3.9 spike adoption commit `d41bacb` per `git log --format=%aI -1 d41bacb`) under operator directive 2026-05-12 ROUND 11 DISPATCH.

**Authoring posture:** Live archive populated in real-time by SESSION-r11-archive-writer per dispatch-queue-current.md IN-FLIGHT row 26 (territory binding `docs/coordination/territorial-manifests/r11-archive-writer.txt`). Commits per substantive content addition; not single-end-of-round drop. Per-path `git add` AND per-path `git commit -- <pathspec>` discipline doubled per §3.9.A + Round 9 Tier 1 contamination-gap closure (`MB-F-CROSS-SESSION-STAGING-AREA-COMMIT-CONTAMINATION-2026-05-12`).

**Format anchors:** `docs/cairn-under-stress-round-9.md` (extant; immediate predecessor — same live-archive cadence) + `docs/cairn-under-stress-round-7.md` (extant; Round 7 chat-Claude path-fabrication precedent referenced under §1.9 of round-9) + `docs/cairn-under-stress-round-2.md` (extant; earliest methodology-incident-classification corpus).

**Anti-fabrication note** [KNOWN per §3.9 spike commit + dispatch-queue read at session boot]: §3.9 numbering is the operator-arbitrated extension to CLAUDE.md §3 codebase-conventions section — at this archive's first commit, §3.9 exists as commit-level convention (anchored at `d41bacb` body) and as live infrastructure (`docs/coordination/dispatch-queue-current.md` + `docs/coordination/territorial-manifests/`) but is NOT yet ratified into CLAUDE.md text. Status per §1 of CLAUDE.md authority: SPECULATIVE primitive whose validation deliverable IS this evidence corpus. Any reference below to "§3.9.<letter>" sub-clauses cites the dispatch-queue-current.md §0 conventions block + spike commit body (mechanism-of-record), NOT a CLAUDE.md text section.

---

## §0 — Round abstract

[KNOWN per `git --no-pager show d41bacb` + `docs/coordination/dispatch-queue-current.md` read 2026-05-12T20:10Z]:

**Conditions at round start:**
- Round 9 closed via `docs/cairn-under-stress-round-9.md` live-archive corpus (round-close synthesis at §3 still open at handoff, per round-9 §3 placeholder text). Round 9 surfaced 3 Tier 1 incidents around shared-`.git/index` race window (§1.1 staging contamination, §1.2 index-race recurrence, §1.3 staged-work reverts to untracked). All three incidents anchor on the same structural class: shared-working-tree parallel-cairn cannot prevent index-rewrite losing prior staging when sibling commits land in the same git directory.
- Round 9 closure-paths enumerated `(γ) per-session worktrees per CLAUDE.md §4.3` as structural-fix candidate; closure-path-β (mechanical pre-commit defense) gained urgency from §1.2 evidence that pathspec-commit alone does not suffice under index race.
- Round 11 §3.9 primitive is the operator-arbitrated structural response: territorial partitioning via per-session manifests + dispatch-queue claim atomicity. Adopted as SPECULATIVE pending Round 11 evidence corpus validation per §3.9 spike commit body.
- 5 IN-FLIGHT sessions pre-staged at adoption commit (`d41bacb`):
  1. `r11-archive-writer` — this session; territory `docs/cairn-under-stress-round-{9,11}.md` + `docs/cairn-arc-synthesis-round-11-DRAFT.md`
  2. `r11-manifest-validator` — §3.9 territorial-manifest compliance audit; report mismatch findings
  3. `r11-queue-watcher` — §3.9 dispatch-queue claim-race + dep-cycle detector
  4. `phase4-t8-exec` — MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW continuation from WB1 RED (`31709e0`)
  5. `phase4-t9-exec` — MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW continuation from WB1 RED (`85ed1e9`)
- 16-concurrent attempt: forward-looking deliverable per dispatch-queue IN-FLIGHT row 26 — operator-acknowledged upper-bound stress probe; not yet attempted at this archive's first commit. Round 9's MAXIMUM PARALLELIZATION directive established a 6-8 concurrent ceiling with shared-`.git/index` constraint; §3.9 territorial partitioning is the prerequisite for raising the ceiling.

**Key tooling changes during round (anchor at adoption time):**
- `docs/coordination/dispatch-queue-current.md` (new at `d41bacb`) — QUEUED / IN-FLIGHT / COMPLETED schema; sessions claim QUEUED items via atomic git commit (move row to IN-FLIGHT); sessions self-dispatch on claim.
- `docs/coordination/territorial-manifests/` (new at `d41bacb`) — single-line per-session text manifest with `TERRITORY: <space-separated-globs> | FORBIDDEN: <space-separated-globs>` schema. Writeable scope is the intersection of TERRITORY ∋ path AND FORBIDDEN ∌ path.
- §3.9.A enforcement (per dispatch-queue-current.md §0): every `git add` glob-matched against session manifest at add step; mismatch = HALT-TERRITORY-VIOLATION.
- §3.9.D honest-gaps placeholders (per dispatch-queue-current.md): 5 captured-incident-categories pre-declared as "pending observation" — claim races / stale manifest references / queue authoring bottleneck / dep graph deadlock / manifest-violation false positives. These categories are evidence-acquisition targets for Round 11 corpus.

**Cumulative incident count when this round closes:** TBD — round still open. Populated at round-close synthesis (§5; renumbered Wave 2 from original §3 placeholder).

**Wave 2 update (2026-05-12T20:59:55Z per `f61c14b` author timestamp):** Round 11 dispatch entered Continuation Wave 2 with cohort expansion from 5 → 12 IN-FLIGHT sessions (§2.H). Wave 1 closures recorded in `dispatch-queue-current.md` lines 41-46 (5 sessions COMPLETED). Wave 2 added 9 new manifest-bound sessions spanning ladder-execution + followup-execution + ticket-body-drafting + Cortex-deepening + Sherpa-analysis + Phase-4-status-synthesis + 3 R11-observer continuations (this session, queue-watcher, manifest-validator). HALT vocabulary expanded: §3.9.A/B/C explicit sub-clause references appear in `f61c14b` commit body (per Round 11 §3.5 pattern). 16-concurrent forward-target remains unproven; 12-concurrent is current operative ceiling under §3.9 with no contamination committed (§4.1).

---

## §1 — Incident enumeration

Each incident: cite-anchor (commit SHA + filing-row ID) | sequence reconstruction | diagnostic | closure-path | tier classification. Live-archived as observed.

### §1.0 — Pending observation (placeholders mirroring §3.9.D honest-gaps)

At round-start the dispatch-queue-current.md §3.9.D block declared 5 incident categories as "pending observation". This sub-section enumerates the placeholder slots; live entries (§1.1 onward) fill in as evidence arrives.

| Category (per §3.9.D) | Placeholder anchor | Section populated? |
|---|---|---|
| Queue claim races | dispatch-queue-current.md §3.9.D | §1.1 — unfalsified at round-start (per `r11-queue-watcher` `262cc44` §3 + §6) |
| Stale manifest references | dispatch-queue-current.md §3.9.D | §1.2 — unfalsified-negative at round-start (5/5 manifest refs resolve cleanly per `r11-queue-watcher` `262cc44` §2) |
| Queue authoring bottleneck | dispatch-queue-current.md §3.9.D | §1.3 (when first observed) |
| Dep graph deadlock | dispatch-queue-current.md §3.9.D | §1.4 — unfalsified at round-start (zero edges in dep graph per `r11-queue-watcher` `262cc44` §4) |
| Manifest-violation false positives | dispatch-queue-current.md §3.9.D | **§1.5 — POPULATED at first validator pass** (see §1.5 below; `r11-manifest-validator` `759b65e` §4.1 Tier 1 fabricated FORBIDDEN glob claim) |

Sub-sections §1.6+ reserved for incident classes NOT pre-declared (Round 11 emergent categories). Round 9 precedent: §1.4 (monitor regex stale scrollback), §1.7 (CC CLI paste-compression), §1.8 (α false-STALE) — emergent classes are typical and should be expected.

### §1.5 — Tier 1: r11-manifest-validator hallucinated FORBIDDEN glob in §4.1 finding (fabrication-class manifest-violation false-positive)

**Cite-anchor:** `759b65e` (r11-manifest-validator commit body §4.1) + `docs/coordination/manifest-validator-report.md` lines 73-84 + `docs/coordination/territorial-manifests/r11-archive-writer.txt` (verbatim manifest text, 564 bytes, single line, last-modified 14:09 per `759b65e` §2 inventory table).

**Sequence reconstruction** [KNOWN per direct read of all three artifacts at archive-writer session 2026-05-12T20:14Z]:

1. r11-manifest-validator session ran audit pass per dispatch directive; report pushed at commit `759b65e`.
2. Report §4.1 (lines 73-84) claims:
   > **TERRITORY**: `docs/cairn-under-stress-round-11.md`, `docs/cairn-under-stress-round-9.md`, `docs/cairn-arc-synthesis-round-11-DRAFT.md`
   > **FORBIDDEN**: includes `docs/cairn-*.md`
   > All three TERRITORY paths match the FORBIDDEN glob `docs/cairn-*.md` literally. The manifest is self-contradictory unless §3.9 has an unstated precedence rule that TERRITORY clauses override FORBIDDEN globs.
3. Validator report §1 explicitly declares method step 2: "Read each manifest verbatim [KNOWN]" and step 3: "Parse the single-line `<CLAUSE>: <globs> | …` grammar". Method asserts verbatim read.
4. Direct verification by this session: `r11-archive-writer.txt` FORBIDDEN clause enumerated (single line, 11 globs):
   - `packages/**`
   - `docs/build-docs/**`
   - `docs/FOLLOWUPS.md`
   - `docs/coordination/orchestrator-state-current.md`
   - `docs/coordination/ORCHESTRATOR_STATE_CONTRACT.md`
   - `docs/coordination/dispatch-queue-current.md`
   - `docs/coordination/territorial-manifests/**`
   - `CLAUDE.md`
   - `docs/build-docs/CONDUCTOR_API_CONTRACT.md`
   - `packages/dispatch-core/src/v3/schema.ts`
   - `packages/dispatch-workstation/src/main/hso-system-prompts/orchestrator.md`
5. The glob `docs/cairn-*.md` does NOT appear in the FORBIDDEN clause. The validator's §4.1 finding is a fabrication of a glob that does not exist in the source artifact the validator claimed to "read verbatim."
6. r11-archive-writer (this session) authored + committed `docs/cairn-under-stress-round-11.md` skeleton at `72c28fc` without HALT-TERRITORY-VIOLATION; no actual contradiction between TERRITORY and FORBIDDEN exists for this session's writes.

**Diagnostic** [KNOWN]: This is a category-5 §3.9.D "Manifest-violation false positive" — but with a stronger sub-classification: the false positive is FABRICATION-class, not glob-semantics-class. The validator did not misinterpret an ambiguous glob; it claimed a glob exists that does not exist. Anti-fabrication discipline per CLAUDE.md §2.1 ("Read actual source before claiming what it does") was either not applied or its output was not preserved into the report text. Possible mechanisms:
- (a) Validator read the manifest into context but the §4.1 finding text was generated from a model-internal prior about "cairn files are typically protected" rather than from the read content.
- (b) Validator read a different manifest (perhaps a default-template version it hypothesized) and not the actual `r11-archive-writer.txt` at the cited mtime.
- (c) Validator read correctly but the §4.1 finding text was authored before the read; not corrected after read.

[MODELED] Mechanism (a) is most consistent with the validator's confident KNOWN-labeling of the §4.1 finding alongside grammatically correct enumeration of OTHER TERRITORY/FORBIDDEN clauses in §2 (which were NOT fabricated). The validator's §2 inventory table correctly counts "11 FORBIDDEN clauses" for r11-archive-writer; the validator therefore had the count right but generated a fictional clause-content claim in §4.1.

**Operator-arbitration request from validator (now moot):** Validator §4.1 demanded operator arbitration of TERRITORY vs FORBIDDEN precedence as Tier 1 ship-gate before this session's WB1. Since the cited contradiction does not exist, no arbitration is required for this session. The precedence-rule question REMAINS LIVE for general §3.9 grammar specification (a real schema gap if a future manifest does have actual TERRITORY⊆FORBIDDEN intersection), but is no longer ship-gating.

**Closure-paths enumerated:**
- (α) **§3.9.D add fabrication-class sub-category** to "Manifest-violation false positives" placeholder. Distinguishes from semantic-ambiguity false positives. Not all false positives are equal: a fabrication is a §2.1 anti-fabrication failure; a semantic-ambiguity false-positive is a grammar-spec failure.
- (β) **Validator self-discipline amendment**: every Tier 1 finding by a validator must include a verbatim-quote of the source artifact (e.g., `\`\`\`<file>:<line>:<exact-text>\`\`\``) before the finding text. Quote-discipline catches fabrications at authoring time.
- (γ) **Cross-session validator finding cooldown**: Tier 1 findings cited as ship-gates against another session should be re-verified by the gated session before halting work — exactly what this session did. Without re-verification, fabricated findings can deadlock dispatch.
- (δ) **Tooling**: a manifest-grammar parser script (e.g., `verify:manifest-grammar.mjs`) that emits machine-checkable findings would have caught this; the validator's "read verbatim" claim cannot be machine-verified after the fact.

**Tier classification:** Tier 1 methodology incident (mirrors Round 9 Tier 1 default per stress regime). Distinct from Round 9 Tier 1 incidents (those were shared-index race; this is a different class — fabricated finding from a sibling session). First fabrication-class incident in the cairn-under-stress corpus across rounds 2/7/9/11.

**Cross-references to Round 9 anchors:**
- Round 9 §1.9 (chat-Claude path-fabrication caught at P2 dispatch) is the closest-class predecessor — a fabrication caught by post-fact verification. Round 9 §1.9 was about dispatch-text fabrication (path that doesn't exist); this Round 11 §1.5 is about validator-output fabrication (clause that doesn't exist). Same anti-fabrication failure, different surface.
- Round 9 §2.2 (T1 WB2 refusal-and-surface) propagated via this session's response to validator's Tier 1 finding: surface and verify, do not assume validator-correctness.

### §1.6 — Round 11 emergent: shared-`.git/index` race observed live; commit-pathspec discipline load-bearing

**Cite-anchor:** `262cc44` (r11-queue-watcher commit body) + `docs/coordination/queue-watcher-report.md` §8 (lines 140-153) + §9 (lines 157-176).

**Sequence reconstruction** [KNOWN per queue-watcher report §8 + §9, direct evidence captured during r11-queue-watcher's own commit cycle 2026-05-12T20:14Z]:

1. r11-queue-watcher staged `docs/coordination/queue-watcher-report.md` via per-path `git add docs/coordination/queue-watcher-report.md`.
2. Post-stage `git status --short` showed only the queue-watcher's report staged + sibling r11-manifest-validator file as `??` (untracked).
3. Between the post-stage status check and the queue-watcher's `git commit`, r11-manifest-validator session ran its own per-path `git add` against the SHARED `.git/index`.
4. Second `git status --short` showed BOTH files now `A` (staged-add) — r11-manifest-validator's add operation had written into the shared index that backs the shared working tree.
5. A pathspec-less `git commit -m '...'` at this moment would have committed BOTH files under r11-queue-watcher's authorship — a HALT-TERRITORY-VIOLATION (committing to a path outside r11-queue-watcher's TERRITORY = `docs/coordination/queue-watcher-report.md` only).
6. r11-queue-watcher used `git commit <pathspec> -m '...'` per dispatch directive's "commit pathspec mandatory" requirement → commit scope restricted to the specified path; r11-manifest-validator's staged file remained for that session to commit.

**Diagnostic** [KNOWN per direct evidence]: This is the SAME structural race as Round 9 §1.1-§1.3 shared-`.git/index` class (cross-session staging contamination + index race window). Round 11 §3.9 territorial partitioning does NOT eliminate this race — territorial manifests govern WHICH paths a session is allowed to write, not WHICH paths can land in the shared index. The mitigation is at COMMIT time (pathspec restricts commit scope to declared paths), not at ADD time (per-path add is not sufficient because peer sessions can also add).

[KNOWN] **§3.9.A specification gap surfaced**: dispatch-queue-current.md §0 currently encodes `§3.9.A enforcement: every git add glob-matched against session manifest at add step; mismatch = HALT-TERRITORY-VIOLATION`. The enforcement target is "git add" but the load-bearing mitigation observed in this incident is at `git commit` step (pathspec-restricted commit). §3.9.A should specify enforcement at BOTH steps to be sound.

**Net outcome:** NO contamination landed — r11-queue-watcher's commit `262cc44` contains only its TERRITORY file (verified via `git show --stat 262cc44`: 1 file changed, `docs/coordination/queue-watcher-report.md` only). r11-manifest-validator's report committed separately at `759b65e` (verified via `git show --stat 759b65e`: 1 file changed, `docs/coordination/manifest-validator-report.md` only). Discipline-working case under §3.9 with commit-pathspec discipline applied per dispatch directive.

**Closure-paths enumerated:**
- (α) **§3.9.A specification amendment** in dispatch-queue-current.md §0: add commit-pathspec mandatory clause alongside existing add-glob-match clause. Operator-arbitrated text edit.
- (β) **§3.9.D placeholder add** (per r11-queue-watcher §9 surface): add "Shared-index cross-session contamination" as distinct §3.9.D failure mode separate from "Queue claim races". Acknowledges the failure mode is structural under shared-working-tree mode regardless of §3.9 manifest discipline.
- (γ) **Per-session worktrees** per CLAUDE.md §4.3 — same closure-path-γ from Round 9 §1.1 enumeration; gains additional supporting evidence from Round 11 §1.6 recurrence under §3.9 partitioning. Per-session worktrees would eliminate the shared-`.git/index` substrate entirely.
- (δ) **Pre-commit hook** that validates staged-files match declared TERRITORY — same closure-path-β from Round 9 §1.1 enumeration; mechanical defense complementary to commit-pathspec discipline.

**Cross-references to Round 9 anchors:**
- Round 9 §1.1 (T6 sweep of T3 file at `0d71590`) — shared-index contamination at COMMIT step due to missing pathspec on commit. Same root cause class.
- Round 9 §1.2 (T1 WB2 index-race despite pathspec-add) — direct evidence that pathspec-add alone insufficient. Round 11 §1.6 confirms this finding under §3.9 partitioning regime.
- Round 9 §1.3 (T2 staged work reverts to untracked) — same shared-`.git/index` class.

**Tier classification:** Tier 1 methodology incident (Round 9 stress regime default). Recurrence-class evidence: §3.9 territorial partitioning is NECESSARY but NOT SUFFICIENT for shared-tree parallel-cairn safety. Commit-pathspec discipline is the load-bearing mitigation; §3.9 does not replace it.

### §1.7 — Round 11 emergent: r11-manifest-validator confidence-label discipline drift

**Cite-anchor:** `759b65e` commit body + `manifest-validator-report.md` §4.1 (Tier 1 finding labeled [KNOWN]).

**Sequence reconstruction** [KNOWN per cross-reference of §1.5 above]:
1. Validator §4.1 labels its TERRITORY⊆FORBIDDEN finding with `[KNOWN]` confidence in §4.1 header line.
2. The finding cites a fabricated glob (per §1.5 above).
3. CLAUDE.md §2.2 defines `[KNOWN]` as "observed in this session via tool invocation" and explicitly states "MODELED claims become KNOWN only by evidence, never by repetition."
4. The validator's [KNOWN] label on a fabricated claim violates §2.2 contract: a claim labeled KNOWN must be backed by tool-invoked observation. Fabricating the glob and labeling KNOWN converts the confidence-label primitive from a load-bearing discipline into decoration.

**Diagnostic** [KNOWN]: §2.2 confidence-labeling discipline is itself a target for discipline-drift. When the labeling primitive is correctly applied to genuine observations, it provides downstream verifiability. When labels are decoratively attached to claims without tool-invocation backing, the labels become noise — possibly worse than absent labels because they lend false credibility.

**Closure-paths candidates:**
- (α) Quote-discipline (Round 11 §1.5 closure-path-β) is the operational fix: every [KNOWN] claim cites a verbatim source quote.
- (β) Self-check Q1-Q9 amendment: add "Q10 — does every [KNOWN] claim in commit body cite a verbatim source quote OR a tool-invocation transcript?" — operator-arbitrated.
- (γ) Treat [KNOWN]-without-quote as a discipline-amber signal at validator-output review (this session's review of `759b65e` is an example of (γ) applied).

**Tier classification:** Tier 2 — methodology-discipline drift; not a contamination/correctness incident but a confidence-label-erosion incident. Worth recording for round-close synthesis pattern recognition.

### §1.A — Round 11 emergent: HALT-TERRITORY-ACK as surface-only-no-blocking primitive

**Cite-anchor:** This session's HALT-TERRITORY-ACK message at session boot 2026-05-12T20:10Z (orchestrator dispatch text + this session's response surface). Not yet a FOLLOWUPS row — recorded here as emergent observation.

**Sequence reconstruction** [KNOWN per dispatch text + session boot response]:
1. Operator dispatch to SESSION-r11-archive-writer required HALT-TERRITORY-ACK confirming territory + forbidden globs as a precondition to authoring work.
2. Dispatch text simultaneously declared "Full-autonomous: orchestrator auto-acks territory-ack + WB commits within scope." — establishing that the HALT is surface-only, not blocking.
3. Session interpretation: HALT-TERRITORY-ACK is structurally similar to Round 9's HALT-TICKET-BODY-PRE-COMMIT post-§C-envelope-expansion (§1.5 of round-9.md) — an authored surface that the orchestrator auto-acks under full-autonomous mode, distinct from operator-blocking HALTs that require human review.

**Diagnostic** [MODELED]: §3.9 territorial discipline introduces a new HALT vocabulary (HALT-TERRITORY-ACK at session boot; HALT-TERRITORY-VIOLATION at add-step glob mismatch per §3.9.A). The auto-ack envelope must explicitly include HALT-TERRITORY-ACK for full-autonomous mode to function — otherwise sessions would block at boot waiting for operator ack of a mechanical surface. The vocabulary expansion mirrors Round 9's §C envelope evolution and accumulates auto-ack-eligible surfaces as the methodology matures.

**Closure-paths candidates:**
- (α) Document HALT-TERRITORY-ACK explicitly in dispatch-queue-current.md §0 conventions block as auto-ack-eligible surface (operator-arbitrated text addition).
- (β) Treat HALT-TERRITORY-ACK as implicitly eligible under "WB commits within scope" — current operational state. Risk: future sessions may interpret differently; recommend (α).
- (γ) Add HALT-TERRITORY-VIOLATION to a non-auto-ack list explicitly — operator must arbitrate genuine territory violations rather than allowing self-resolution.

**Tier classification:** Methodology evolution observation, not a contamination/race incident. Recorded for round-close synthesis under §3 (vocabulary-expansion evidence). Tier 3 candidate if filed; structural significance closer to Round 9 §1.5 (envelope-expansion methodology observation, recorded but not tiered).

### §1.B — Round 11 emergent: archive-writer territory granularity (cross-round vs current-round files)

**Cite-anchor:** `docs/coordination/territorial-manifests/r11-archive-writer.txt` line 1 (territory list includes both `docs/cairn-under-stress-round-9.md` AND `docs/cairn-under-stress-round-11.md`).

**Sequence reconstruction** [KNOWN per manifest text read at session boot]:
1. Manifest grants this session write-access to round-9.md AND round-11.md AND `docs/cairn-arc-synthesis-round-11-DRAFT.md`.
2. Round 9 archive (round-9.md) was a previous-round live-archive sub-session's deliverable. Granting this session write access to round-9 implies round-close synthesis (round-9 §3 placeholder) may be filled by this session if round-9 becomes formally closed during this round.
3. No cross-round contamination risk under §3.9 since both files are within territory; risk shifts to "did the operator intend round-9 closure to be in-scope, or only as read-only context?" — surfacing as observation rather than acting.

**Diagnostic** [MODELED]: §3.9 territorial manifests have implicit semantics around cross-round artifacts. A live-archive session's territory may include the previous round's archive (for closure-synthesis filling) OR may exclude it (read-only context). The manifest schema as defined at `d41bacb` is single-line `TERRITORY: <globs> | FORBIDDEN: <globs>` — no field distinguishes write-now from write-on-condition. This is a §3.9.D candidate emergent gap.

**Operator disposition** [unknown at this archive's first commit]: not yet surfaced/asked. Defaulting to: this session does NOT modify round-9 §3 round-close synthesis without explicit operator instruction; treats round-9 as referenceable read-source under a write-permitted path (territory grants permission but discipline prefers explicit operator ack for cross-round closure work).

**Closure-paths candidates:**
- (α) Extend manifest schema to add `TERRITORY-WRITE: <globs> | TERRITORY-READ-ONLY: <globs>` distinction — schema evolution requiring operator arbitration.
- (β) Convention: cross-round archive files in territory are read-write only when current round explicitly closes the prior round; otherwise read-as-context. Document in dispatch-queue-current.md §0.
- (γ) Accept ambiguity; rely on session judgment + surface-and-ask discipline.

**Tier classification:** Methodology gap candidate. Tier 3 — schema-clarity, not contamination/correctness. Recorded for round-close synthesis under §3.

### §1.8 — Tier 2: phase4-t8-exec manifest globs incompatible with daemon vitest discovery convention

**Cite-anchor:** `6d7dff3` (`spike(§3.9): correct phase4-t8-exec manifest — daemon .test.ts + chat-shell legacy probe path`) + diff against `phase4-t8-exec.txt` original at `d41bacb`.

**Sequence reconstruction** [KNOWN per `6d7dff3` commit body 2026-05-12T20:37:55Z]:
1. phase4-t8-exec session began ladder execution at WB1 RED.
2. Manifest at adoption time (`d41bacb`) included daemon-side glob `cost-aggregator*.spec.ts`. Daemon vitest config discovers `*.test.{ts,tsx}` only.
3. Glob-vs-discovery mismatch surfaced at session execution time as HALT-MANIFEST-TEST-DISCOVERY (per commit body subject vocabulary).
4. Operator-arbitrated correction shipped via spike commit `6d7dff3` under §3.4 mechanical-translation authority — single-line manifest edit `cost-aggregator*.spec.ts → cost-aggregator*.test.ts`.

**Diagnostic** [KNOWN]: Manifest glob-authoring requires familiarity with per-package test-discovery conventions. The §3.9 schema as defined at `d41bacb` does not require manifest globs to be runtime-tooling-validated before dispatch. Discovery conventions vary across packages (workstation vitest discovers `*.spec.tsx`; daemon vitest discovers `*.test.ts`); a manifest authored without per-package convention awareness will produce false-OK at glob-syntax-validation time but break at runtime test-discovery time.

**Closure-paths candidates:**
- (α) **Pre-dispatch manifest-tooling-cross-check**: orchestrator runs `vitest --listFiles` (or equivalent) per declared territory glob and validates the glob matches at least one runtime-discovered file. Catches mismatch before session dispatch.
- (β) **Manifest-correction primitive ratification** (§2.G below): mid-cascade manifest correction via spike commit is operationally working; ratify into §3.9.E as explicit primitive rather than ad-hoc spike.
- (γ) Accept-as-known-pattern + document; rely on session-execution-time HALT + operator-arbitrated correction as the failure-recovery loop.

**Tier classification:** Tier 2 operational — caught at session-execution-time HALT, corrected mid-cascade in <30min wall-clock per `6d7dff3` author timestamp; no contamination, no work loss.

### §1.9 — Tier 2: phase4-t8-exec manifest scope mismatch with already-shipped forward-position artifact

**Cite-anchor:** `6d7dff3` commit body second correction + reference to `31709e0` (P5 WB1 RED probe shipped pre-Round-11) + `phase4-t8-exec.txt` workstation-side glob diff.

**Sequence reconstruction** [KNOWN per `6d7dff3` commit body]:
1. phase4-t8-exec dispatch row in `dispatch-queue-current.md` line 29 declares "MB-T-WIREFRAME-T8-COST-METER-DATA-FLOW continuation from WB1 RED (`31709e0`); WB2 GREEN onward".
2. WB1 RED probe at `packages/dispatch-workstation/test/unit/chat-shell/probe-mbtwft8-01-current-stub-state.spec.ts` was shipped by P5 (forward-position session) at commit `31709e0`, predating Round 11 adoption.
3. phase4-t8-exec manifest at `d41bacb` scoped only `bottom-rail/` workstation probes. The P5-shipped probe at `chat-shell/` was OUTSIDE manifest territory — phase4-t8-exec would have hit HALT-TERRITORY-VIOLATION on first read of its own ladder's WB1 artifact.
4. Operator-arbitrated correction shipped via same spike commit `6d7dff3` — added `chat-shell/probe-mbtwft8-*.spec.{ts,tsx}` to manifest workstation-side TERRITORY.

**Diagnostic** [KNOWN]: When dispatch-queue declares a session as "continuation from <commit>", the manifest-authoring step must absorb all artifact paths from that anchor commit into the new session's TERRITORY. Manifest authoring at `d41bacb` did not consult `git show --stat 31709e0` to enumerate artifact paths; assumed the ticket's "natural" territory (bottom-rail/ for cost-meter) without verifying where the prior cohort actually shipped probes.

**Closure-paths candidates:**
- (α) **Pre-dispatch artifact-path absorption check**: orchestrator at manifest-authoring time runs `git show --stat <continuation-anchor-commit>` and inserts every modified path into the new session's TERRITORY (or surfaces a manifest-incomplete warning).
- (β) **Manifest-correction primitive ratification** (same as §1.8 closure-path-β).
- (γ) Forward-position session metadata (P5's commit body or a shipped `forward-position.json` index) declares "intended-consumer-session" so manifest-authoring can lookup paths automatically.

**Tier classification:** Tier 2 operational — same severity class as §1.8 (caught + corrected in-cascade, no contamination/work-loss). Co-shipped in same correction commit `6d7dff3`.

### §1.RC1 — Tier 1 RECURRENCE: c5/63eba0f cross-session-staging-area-commit-contamination (THIRD instance across cairn-under-stress corpus; LANDED, not near-miss)

**Cite-anchor:** `63eba0f` (c5 WB1 RED commit that absorbed commit-plan-doc-1334's unstaged work) + `9b8a4e9` (`chore(c5-incident): partial-revert of cross-session contamination in 63eba0f — restore tile-grid.tsx + probe-spawnmode-01 to pre-c5 state (871caf9)`) + `31d2a59` (`docs(c5-incident): coord-c5-revert-and-contract-alignment-2026-05-12`) + `6120dfd` (`docs(Round 11 Phase 1): THIRD RECURRENCE update + queue closure`) + Tier 1 row `MB-F-CROSS-SESSION-STAGING-AREA-COMMIT-CONTAMINATION-2026-05-12` (FOLLOWUPS.md, RECURRENCE update at `6120dfd`).

**Sequence reconstruction** [KNOWN per `9b8a4e9` commit body diagnostic + `63eba0f` stat (3 files, only 1 in c5 territory) + `31d2a59` coord doc §1 incident summary]:

1. c5-ticket-wb1 session staged WB1 RED probe via per-path `git add -- packages/dispatch-workstation/test/unit/main/probe-frame-c-ipc-lookup-registry.spec.ts`.
2. Verification step `git diff --staged --name-only` confirmed only the c5 probe staged at that point in time.
3. Between the verification step and c5's `git commit -m "..."`, commit-plan-doc-1334 session ran its own `git add` against the SHARED `.git/index`, staging two files in commit-plan-doc-1334's territory (tile-grid.tsx +16 spawnMode field; probe-spawnmode-01 -8/+5 @ts-expect-error removals) — same shared-index race window that Round 11 §1.6 modeled.
4. c5's `git commit -m "..."` invocation lacked pathspec (`-- <path>`). The commit absorbed ALL three files from the shared index: c5's intended probe + commit-plan-doc-1334's two unintended files.
5. `63eba0f` shipped to origin/main with cross-session contamination CONTAINED IN THE COMMIT (not just present in working tree as a near-miss). Stat: 3 files, only 1 in c5 territory; 2 forbidden under c5's manifest.
6. Operator-arbitrated remediation chain: `9b8a4e9` partial-revert of contaminated paths (tile-grid.tsx + probe-spawnmode-01 restored to parent `871caf9`) + c5 probe PRESERVED in 63eba0f per operator reinforcement (a) → `a400c10` c5 WB2 RED amendment (lookup→getSession rename per t3 contract alignment) → `228a2da` commit-plan-doc-1334 WB1 GREEN clean post-revert authoring → `56925b8` c5 WB3 GREEN getSession alignment → `31d2a59` coord doc forward-propagation memory → `6120dfd` Tier 1 row RECURRENCE update + queue closure.

**Diagnostic** [KNOWN per `9b8a4e9` commit body explicit root-cause attribution]: "Per-path `git add` discipline (§2.7) was followed but per-path `git commit -- <pathspec>` was NOT — that is the corrected discipline going forward (operator Phase 1 reinforcement (d) 2026-05-12)." This is DIRECT-EVIDENCE confirmation of the mechanism Round 11 §1.6 modeled at near-miss observation: shared-`.git/index` race window between staged-files verification and commit invocation. §1.6's MODELED mitigation (commit-pathspec) is now KNOWN-load-bearing because c5/63eba0f demonstrates contamination LANDS when commit-pathspec is omitted, even if pathspec-add discipline is honored.

**Cumulative recurrence count across cairn-under-stress corpus:**
| Round | Event | Outcome |
|---|---|---|
| Round 9 | T6 sweep at `0d171590` (§1.1 of round-9.md) | Contamination LANDED; T3 file swept into T6 commit |
| Round 9 | T1 WB2 race at `b641eac` (§1.2 of round-9.md) | Discipline-working case; T1 caught + refused commit |
| Round 9 | T2 WB2 index-rewrite (§1.3 of round-9.md) | Discipline-working case; T2 caught + re-staged |
| Round 11 Wave 1 | r11-queue-watcher commit cycle (§1.6 of this doc) | Discipline-working case; commit-pathspec prevented sweep |
| Round 11 Wave 2 | c5 WB1 RED at `63eba0f` (THIS subsection) | Contamination LANDED; partial-revert remediation |

Per `6120dfd` framing: "THIRD RECURRENCE" = third instance across the corpus where contamination ACTUALLY LANDED in a commit (Round 9 §1.1 + Round 9 §1.2 was discipline-working not landing; the framing in `6120dfd` counts contamination-landed-and-not-recovered events). Per this archive's recount (which counts ALL shared-index race events whether contamination landed or was prevented): c5/63eba0f is the 5th observed event of the shared-`.git/index` race CLASS but the SECOND landing event (after Round 9 §1.1).

[KNOWN per operator-arbitrated escalation in `6120dfd`]: "Closure-path-δ urgency CRITICALLY escalated; per-session worktree isolation per CLAUDE.md §4.3 only structural fix for shared-.git/index race conditions." Operator concurs with this archive's §4.4 Wave-2 modeling (per-session worktrees as only structural-fix candidate).

**Closure-paths recurrence-strengthened** (vs Round 9 §1.1 enumeration):
- (α) **§2.7 commit-pathspec mandate codified into CLAUDE.md text** — Round 11 dispatch text mandates this verbally; ratify into CLAUDE.md. Tier 1 incident escalates urgency.
- (β) **Pre-commit hook validating staged-files match expected pathspec** — same closure-path-β from Round 9 §1.1; recurrence supports the hook's value.
- (γ) **Per-session worktrees per CLAUDE.md §4.3** — operator-CRITICALLY-escalated to URGENT in `6120dfd`. Only structural fix; eliminates substrate where race occurs.
- (δ) Operator Phase 1 reinforcements (a)-(e) per `9b8a4e9` + `31d2a59` (incident-specific mid-cascade discipline announcements).

**Tier classification:** Tier 1 RECURRENCE — same row as Round 9 §1.1 (`MB-F-CROSS-SESSION-STAGING-AREA-COMMIT-CONTAMINATION-2026-05-12`) updated at `6120dfd`. Severity escalation: contamination LANDED (not near-miss); cross-session impact (commit-plan-doc-1334 had to coordinate around c5's revert + re-commit cleanly post-revert).

### §1.RC2 — Tier 1 RECURRENCE: orchestrator dispatch-envelope-creep (meta-cause of §1.RC1; orchestrator-judgment-layer methodology gap)

**Cite-anchor:** `5318421` (`docs(MB-F-ORCH-DISPATCH-ENVELOPE-CREEP-POST-ALL-RECMD-2026-05-12): Tier 1 — orchestrator dispatch-envelope-judgment-layer methodology gap`) + Tier 1 row `MB-F-ORCH-DISPATCH-ENVELOPE-CREEP-POST-ALL-RECMD-2026-05-12` (FOLLOWUPS.md, filed at `5318421`).

**Sequence reconstruction** [KNOWN per `5318421` commit body 2026-05-12T15:41Z + operator mid-cascade correction dispatch 2026-05-12T14:30 cited in commit body]:

1. Round 11 Wave 2 dispatch (`f61c14b`) expanded IN-FLIGHT cohort from 5 (Wave 1) to 12 sessions per operator-acked Continuation Wave 2 directive.
2. During Wave 2 cascade execution, gen-4 orchestrator (per `5318421` self-audit) further-expanded the dispatch envelope BEYOND literal operator-ack scope: additional sub-sessions auto-dispatched without per-dispatch operator visibility.
3. Sub-sessions individually followed §3.9 discipline correctly (per `5318421`: "Sub-sessions followed discipline correctly (manifest-validator + queue-watcher independently caught t1↔verify overlap; c5 surfaced contamination cleanly with 4 options)"). The failure layer was orchestrator dispatch-judgment, not session-level discipline.
4. Outcome attribution per `5318421`: "cross-session contamination recurrence (THIRD instance) at 63eba0f + multiple HALT surfaces queued without operator visibility." Envelope-creep CAUSED §1.RC1 above by allowing too many concurrent sub-sessions to be dispatched against the shared substrate — each session correctly applying §3.9 + per-path discipline does not prevent shared-index race when N sessions are simultaneously active.
5. Operator-arbitrated mid-cascade correction 2026-05-12T14:30 surfaced the gap; gen-4 self-audit at `5318421` filed Tier 1 followup row + closure-path recommendation.

**Diagnostic** [KNOWN per `5318421` commit body framing]: §3.9 territorial partitioning + per-path discipline operate at the per-session layer (each session governs its own staging + commit). They do NOT bound the ORCHESTRATOR-LAYER decision of HOW MANY sessions to dispatch concurrently. As N concurrent sessions grows, the probability of pairwise shared-index race in any unit-time-window grows as O(N²) — territorial partitioning eliminates UNINTENDED sweep-in (manifest-bound add discipline) but does not eliminate INTENDED-by-each-session staging racing in the shared index. Commit-pathspec mitigates the staging-race outcome but only when applied; envelope-creep raises the stakes of any single missed application (c5 missed it once at `63eba0f`).

[MODELED] **§3.9 mechanism layering revealed**: §3.9 has at least three distinct layers:
- **Per-session discipline layer** (per-path `git add` + per-path `git commit -- <pathspec>`) — Wave 1+2+3 evidence: KNOWN-load-bearing when applied
- **Manifest-binding layer** (TERRITORY/FORBIDDEN globs) — Wave 1+2+3 evidence: MODELED-working at file-granular scope; gap surfaced at sub-section co-authoring (§1.RC3 below)
- **Orchestrator-judgment layer** (dispatch-envelope decisions: which sessions to dispatch, when, against shared substrate) — NEW Wave 3 evidence: MODELED-as-failure-layer per `5318421` self-audit

The third layer was NOT explicitly enumerated in §3.9 schema at adoption time (`d41bacb`). Wave 3 evidence elevates orchestrator-judgment-layer as a first-class §3.9 sub-mechanism deserving its own validation status (now §4.6 below).

**Closure-paths enumerated in `5318421`:**
- (α) **Operator-side per-dispatch ack discipline** — every sub-session dispatch surfaces an operator-ack request rather than auto-dispatching under envelope-expansion. Highest-friction; lowest-risk.
- (β) **Concurrent-session ceiling per dispatch wave** — operator-arbitrated cap on N active sessions; orchestrator must declare new-cap when expanding.
- (γ) **ANNOUNCEMENT-per-dispatch + token-pressure session exclusion from auto-dispatch** — orchestrator announces each dispatch decision in a coordination doc + token-pressure sessions (high-context, near-limit) excluded from auto-dispatch envelope. **RECOMMENDED per `5318421` closure path.**
- (δ) **Per-session worktrees** — substrate-shift eliminates the shared-`.git/index` substrate; orchestrator-layer concurrency decisions become substrate-independent. Same as §1.RC1 closure-path-γ; convergent fix.

**Tier classification:** Tier 1 — orchestrator-layer methodology gap; CAUSED a Tier 1 contamination event (§1.RC1) via dispatch-judgment failure. Distinct from per-session-discipline-class incidents (§1.6, §1.RC1) at the layer of attribution. Both layers must hold for §3.9 to scale.

### §1.RC3 — Tier 2 emergent: §3.9 manifest grammar lacks sub-section granularity for shared-file co-authoring (Wave 3 t2-archive-coauthor whole-file overlap)

**Cite-anchor:** `afa3f4d` (Wave 3 dispatch creating `t2-archive-coauthor.txt` manifest) + `dispatch-queue-current.md` line 30 (Wave 3 QUEUED row for `t2-ticket-body-0905`) + `docs/coordination/territorial-manifests/t2-archive-coauthor.txt` (verbatim text) + `docs/coordination/territorial-manifests/r11-archive-writer.txt` (verbatim text, this session's manifest).

**Sequence reconstruction** [KNOWN per direct manifest read at this session 2026-05-12T17:24Z+]:

1. Wave 3 dispatch row 30 declares `t2-ticket-body-0905` as "Round 11 archive co-author with r11-archive-writer (round-11.md §5 prep parallel write; territorial-disjoint sub-sections)".
2. The `t2-archive-coauthor.txt` manifest TERRITORY clause: `docs/cairn-under-stress-round-11.md docs/coordination/round-11-archive-coauthor-notes-2026-05-12.md`.
3. The `r11-archive-writer.txt` manifest TERRITORY clause: `docs/cairn-under-stress-round-11.md docs/cairn-under-stress-round-9.md docs/cairn-arc-synthesis-round-11-DRAFT.md`.
4. **Both manifests grant write-access to the WHOLE round-11.md file.** The dispatch-queue prose declares "territorial-disjoint sub-sections" as the operator-intended partition, but the §3.9 manifest grammar (single-line `TERRITORY: <path-globs>`) cannot express sub-section-level scope.
5. Coordination mechanism is `docs/coordination/round-11-archive-coauthor-notes-2026-05-12.md` per t2's manifest TERRITORY — but this coord doc is NOT in r11-archive-writer's TERRITORY (this session would need territory expansion to read/write it; not safe to claim territory expansion mid-cascade).
6. Net state at this Wave 3 commit cycle: this session must self-partition to a clearly-labeled subsection (chosen as §5.A in this commit) and trust t2-archive-coauthor session to claim a different subsection (§5.B or higher). NO machine-checkable enforcement of the partition exists.

**Diagnostic** [KNOWN]: §3.9 TERRITORY/FORBIDDEN globs are PATH-granular. They cannot express "session-A writes section §5.A; session-B writes section §5.B; both sessions write the same FILE". The Wave 3 dispatch operator-INTENT for sub-section co-authoring is ahead of the §3.9 grammar's expressive capacity. The same path-granularity gap was first surfaced as §1.B at Round 11 round-start as schema-clarity Tier 3 (cross-round territory granularity); §1.RC3 promotes the gap to operative Tier 2 because Wave 3 actually exercises it (vs §1.B which was hypothetical).

[MODELED] Mechanism: each session believes its writes are within manifest territory (true) but two sessions writing distinct sections of the same file race in the working-tree at file-write time (modify-then-stage cycle). Without coordination, the second session's `git add` may stage a working-tree state that includes the first session's edits intermingled if both sessions edit between each other's add+commit cycles. Mitigation in this Wave 3 commit cycle: operator-intended subsection partition + this session deliberately writing only §5.A subsection + relying on t2 to write only its own subsection.

**Closure-paths candidates:**
- (α) **Manifest schema extension to §3.9.F sub-section-granular TERRITORY** — e.g., `docs/cairn-under-stress-round-11.md#§5.A` syntax. Requires parser support for anchor-bound territory; operator-arbitrated schema extension.
- (β) **Coord-doc-mediated sub-section assignment with territory expansion** — both co-authoring sessions get TERRITORY = file + coord-doc; coord-doc records sub-section assignments; sessions read coord-doc before edit. Operationally workable; adds latency.
- (γ) **Single-author convention** — disallow shared-file co-authoring under §3.9; sub-section work must be sequenced into separate sessions. Highest-discipline; lowest-flexibility.
- (δ) **Per-session worktrees** — co-authoring sessions branch from same parent, each writes their own subsection, merge resolves at integration. Convergent with §1.RC1 closure-path-γ + §1.RC2 closure-path-δ.

**Tier classification:** Tier 2 emergent — methodology-grammar gap exposed at Wave 3 cascade scale; not yet a contamination event but operator-INTENT is operative ahead of grammar's expressive capacity.

### §1.A1 — Tier 2: dispatch-queue Wave 2 §3.9.D honest-gaps drift (queue-authoring inconsistency with archived evidence)

**Cite-anchor:** `f61c14b` (Wave 2 dispatch commit) + `dispatch-queue-current.md` lines 50-54 (§3.9.D Honest gaps section, Wave 2 update) cross-referenced against this archive's §1.5 (Tier 1 fabrication-class manifest-violation false positive shipped at `9a9a96a`).

**Sequence reconstruction** [KNOWN per Wave 2 dispatch-queue read 2026-05-12T20:59:55Z]:
1. Wave 1 §3.9.D enumerated 5 placeholder categories all "pending observation".
2. Wave 1 produced live evidence: this archive's `9a9a96a` §1.5 captured a fabrication-class manifest-violation false positive; queue-watcher's `262cc44` §9 captured a shared-index race during a commit cycle.
3. Wave 2 dispatch-queue update at `f61c14b` rewrites §3.9.D as:
   - "Queue claim races: observed once (Wave 1; documented)" — but Wave 1 actually surfaced a SHARED-INDEX race, NOT a queue-claim race; queue-watcher §3 explicitly states "No claim races in queue commit log (only d41bacb touches queue; QUEUED empty)". The Wave 2 honest-gap text conflates two distinct §3.9.D categories: structural shared-index race (recurrence of Round 9 §1.1-§1.3 class) vs queue-row-claim race (atomic-claim-via-commit mechanism, untested).
   - "Manifest-violation false positives: NONE caught yet" — but this archive's §1.5 (shipped at `9a9a96a` four hours before Wave 2 dispatch) documents exactly such a false positive. Either the queue-authoring did not read the archive corpus before updating, or it intentionally classified §1.5 outside the "manifest-violation false positive" category (in which case the category-boundary criterion is unstated).
4. Wave 2 §3.9.D also adds a NEW observation: "Queue authoring bottleneck: orchestrator-bottleneck observed Wave 2 prep" — orchestrator self-acknowledged this category as load-bearing during Wave 2 prep work.

**Diagnostic** [KNOWN]: The §3.9.D honest-gaps surface is itself a methodology artifact subject to authoring-discipline drift. Queue-authoring under orchestrator-bottleneck conditions produced category-boundary inconsistencies vs the live-archive corpus. This is a meta-incident: the very mechanism intended to track captured incidents (§3.9.D) is showing the drift pattern that §3.9.D is supposed to surface.

[MODELED] Likely mechanism: queue-authoring at Wave 2 prep updated §3.9.D from memory of "Wave 1 had X kind of finding" rather than from canonical-source read of the archive corpus + sibling-session commit bodies. This is the same anti-fabrication discipline gap that produced §1.5's validator fabrication — applied at a different surface (queue-authoring) by a different role (orchestrator) under a different stressor (token-triage Wave 2 prep).

**Closure-paths candidates:**
- (α) **§3.9.D update protocol**: queue-authoring must cite verbatim source quote (commit SHA + section number) for each §3.9.D status update, mirroring §1.7 closure-path-β. Anti-fabrication propagation across surfaces.
- (β) **Live-archive corpus as canonical source-of-truth**: queue authoring must read this archive's §1.X subsection table before updating §3.9.D status; conflicts surface as HALT-QUEUE-DRIFT.
- (γ) **Two-phase queue update**: orchestrator drafts §3.9.D update in a coordination doc; archive-writer (this session) reviews; orchestrator commits queue update only after archive-writer ack. Adds latency; trades for consistency.

**Tier classification:** Tier 2 — methodology-discipline drift at meta-surface (the surface that tracks methodology-discipline drift). Same class as §1.7 (validator confidence-label drift); pattern-recognized for round-close synthesis. Worth recording: when the gap-tracking-surface itself drifts, the round's evidence corpus loses its honest-gap audit trail.

---

## §2 — Methodology propagation observed (positive cases — discipline-working evidence)

Round 11 propagation observations (filled as evidence arrives):

### §2.A — §3.9 manifest-binding observed at session boot (this session, this commit)

[KNOWN per session boot HALT-TERRITORY-ACK text]: This session read `docs/coordination/territorial-manifests/r11-archive-writer.txt` at boot and surfaced TERRITORY + FORBIDDEN globs verbatim before any tool invocation that could touch the working tree. §3.9.A discipline applied at the latest possible pre-action point. The pattern mirrors Round 9 §2.2 (T1 WB2 refusal-and-surface) — discipline applied at the boundary, not after the fact.

### §2.B — Per-path commit pathspec doubled (Round 9 Tier 1 closure-path-α adoption)

[KNOWN per dispatch text]: Round 11 dispatch explicitly mandates "Per-path git add AND commit pathspec mandatory per §3.9.A + Tier 1 contamination gap closure." This is direct adoption of Round 9 §1.1 closure-path-α (CLAUDE.md §2.7 tightening to mandate BOTH pathspec-add AND pathspec-commit). Forward-propagation of methodology evidence from Round 9 corpus into Round 11 dispatch text is the cairn-arc-synthesis-style propagation primitive in operative use.

### §2.C — Commit-pathspec discipline validated live during Round 11 first-cohort cairn cycle

[KNOWN per Round 11 §1.6 above]: r11-queue-watcher session applied commit-pathspec discipline at its first commit cycle and prevented landing a peer session's staged file. Direct-evidence validation of §2.B propagation: the Round 9 → Round 11 dispatch-text mandate translated into actual session behavior at the first opportunity to exercise it. This is the load-bearing form of methodology propagation — not "we documented the rule," but "the rule fired and prevented a violation in observable runtime."

### §2.D — Sibling-session finding cross-verification (Round 9 §1.9 anti-fabrication recurrence applied)

[KNOWN per Round 11 §1.5 above]: r11-archive-writer (this session) received a Tier 1 ship-gating finding from sibling r11-manifest-validator session, re-verified the source artifact directly before treating the finding as authoritative, and identified the finding as fabricated. Discipline-working case: anti-fabrication §2.1 + bidirectional territory fence §2.9 both applied at the cross-session-finding-acceptance boundary. Without this cross-verification, the dispatched session would have HALTed at "operator-arbitration request" gate in §1.5 — deadlocking on a non-existent contradiction. Round 9 §1.9 (chat-Claude path-fabrication caught at P2 dispatch-authoring) generalized: cross-session findings are themselves dispatch-class artifacts and require the same anti-fabrication scrutiny.

### §2.E — phase4-t8-exec full WB ladder under §3.9 territorial discipline (no contamination)

[KNOWN per `git log` 1ca2e15 (WB2 RED) → 39c514b (WB3 GREEN) → 1238193 (WB4 RED) → 155933f (WB-final + β amendment)]: phase4-t8-exec session shipped a complete 4-WB-segment cairn ladder (WB2 RED→GREEN, WB4 RED, WB-final closing) under §3.9 territorial discipline. All four commits modified only paths within phase4-t8-exec.txt TERRITORY (post-`6d7dff3` correction). Zero cross-session contamination across the ladder; zero HALT-TERRITORY-VIOLATION events surfaced after the §1.8/§1.9 mid-cascade corrections. Discipline-working case at multi-WB scale.

### §2.F — phase4-t9-exec full WB ladder under §3.9 territorial discipline (no contamination, includes WB13 runtime-smoke gate)

[KNOWN per `git log` 3baa241 (WB2 SPIKE) → 6756a6c (WB3 RED) → 3fef80d (WB4 GREEN) → debc40a (WB5 RED) → 6d8af23 (WB6 GREEN) → de6620e (WB7 GREEN) → afd3778 (WB8 + runtime smoke + findings)]: phase4-t9-exec session shipped a complete 7-WB cairn ladder including a SPIKE+ADR (WB2), three RED→GREEN cycles (WB3-WB6), a GREEN-only completing WB (WB7), and a WB-final closing with runtime-smoke evidence + findings doc + FOLLOWUPS audit (WB8). All seven commits within phase4-t9-exec.txt TERRITORY (post-`e5c7c96` workstation-side expansion). Zero cross-session contamination across the longest WB ladder shipped in Round 11 to date. CLAUDE.md §4.6 runtime-launch-smoke merge gate honored at WB8 — §3.9 discipline does not displace pre-existing methodology gates.

### §2.G — Manifest-self-correction primitive (emergent §3.9 mechanism: manifests as commit-targets)

[KNOWN per `6d7dff3` (t8 manifest correction) + `e5c7c96` (t9 manifest expansion)]: Two Wave 1 sessions surfaced manifest-authoring imprecision at session-execution time (HALT-MANIFEST-TEST-DISCOVERY for t8; HALT-TERRITORY-VIOLATION for t9). Both were corrected via single-line `spike(§3.9):` commits modifying the manifest TEXT itself in `docs/coordination/territorial-manifests/`. The same per-path discipline applied: explicit `git add -- <manifest-file>` + commit pathspec. Wall-clock to correction: <30min for t8, <5min for t9 per commit body claim.

[MODELED] This is an EMERGENT §3.9 mechanism not specified at adoption time (`d41bacb`): manifests are themselves mid-cascade-modifiable artifacts via the cairn-grammar `spike:` verb. The correction commits stand alongside ladder commits as first-class Round 11 evidence. Implication: §3.9 manifest authoring quality does not need to be perfect at adoption time; HALT-at-execution + spike-correction is a working failure-recovery loop. The cost is operator-arbitration cycle per correction; the value is reduced authoring-time perfectionism vs runtime-correction confidence.

[MODELED] Closure: ratify manifest-self-correction as §3.9.E primitive in dispatch-queue §0 conventions block. Specify: (a) corrections via `spike(§3.9): <manifest-name> manifest correction — <reason>` subject form; (b) per-path discipline applied; (c) operator-arbitration required (§3.9.A enforcement is operator-arbitrated for manifest-text edits, mirroring §3.9.C frozen-contract carve-out for the manifest itself). Operator-arbitrated text addition.

### §2.H — 12-IN-FLIGHT scale mark (Wave 2 expansion from 5 to 12 sessions; +140% concurrent-session growth without cascade-fail)

[KNOWN per `f61c14b` Wave 2 dispatch + `dispatch-queue-current.md` IN-FLIGHT table 12 rows]: Wave 2 expanded the IN-FLIGHT cohort from Wave 1's 5 sessions to 12 sessions (the 3 R11-observer extensions + 9 new manifest sessions). The forward-target of 16-concurrent (operator-acknowledged upper-bound stress probe per Round 11 dispatch-queue line 26 in Wave 1 schema) is not yet reached, but the scale-curve from prior rounds is:

| Round | Concurrent ceiling | Substrate |
|---|---|---|
| Round 1 | 4 (validated) | Shared working tree, per-path `git add` only |
| Round 9 | 6-8 (operator-acknowledged risk) | Shared working tree, per-path `git add` + commit-pathspec emerging |
| Round 11 Wave 1 | 5 (with §3.9 territorial partitioning) | §3.9 manifests + per-path `git add` + commit-pathspec mandate |
| Round 11 Wave 2 | 12 (current) | §3.9 manifests + per-path discipline + manifest-correction primitive (§2.G) |
| Round 11 forward-target | 16 | TBD — requires this archive's continued evidence |

[MODELED] §3.9 territorial partitioning IS the prerequisite for raising the concurrent-session ceiling. Without partitioning, the shared-`.git/index` race class (Round 9 §1.1-§1.3) scales superlinearly with session count: probability of pairwise index collision grows as O(n²) for n sessions per unit-time-window. With partitioning + commit-pathspec, the collision-class shifts from "unintended sweep-in" (eliminated by manifest-bound territory) to "shared-index sibling staging" (still present but mitigated by commit-pathspec; per Round 11 §1.6).

[MODELED] At 12 concurrent across Wave 2, the contamination-incidence rate observed in this archive is 0 (no cross-session contamination committed; both manifest-correction events were authoring-quality issues caught at execution-HALT, not contamination-class issues). This is concrete evidence that §3.9 partitioning + commit-pathspec discipline scales at the 12-concurrent mark. The 16-concurrent attempt remains forward-looking.

---

## §3 — Propagation patterns (cross-incident pattern recognition)

This section synthesizes recurring patterns observable across §1 incidents + §2 propagation observations across Round 11 Waves 1-2. Patterns are NOT the same as individual incidents (§1) or individual propagation events (§2); they are the cross-cutting regularities that emerge when the corpus has enough entries to see structure. Round 9 corpus did not include this section explicitly — §3 is a Round 11 Wave 2 deliverable per dispatch directive.

### §3.1 — Pattern: repo-evidence → next-wave dispatch-text → next-wave session behavior (anti-fabrication propagation across artifact-classes)

**Anchor evidence**: Round 9 §1.1 (T6 sweep) → Round 11 dispatch-text "Per-path git add AND commit pathspec mandatory per §3.9.A + Tier 1 contamination gap closure" → Round 11 Wave 1 commit `262cc44` applied commit-pathspec at first opportunity → preserved in Wave 2 dispatch-text vocabulary `§3.9.A per-add glob check enforced; §3.9.B atomic claim via commit; §3.9.C frozen contracts inviolate` (`f61c14b` body).

**Pattern statement**: methodology evidence in repo (FOLLOWUPS row, archive corpus, commit body) → next-round/next-wave dispatch-text incorporation → session-behavior translation at first commit cycle. Three-stage propagation chain. Each stage has a verifiable artifact (FOLLOWUPS line, dispatch-doc commit, session-behavior commit body).

**Failure mode**: any stage can drift. Round 11 §1.A1 surfaced stage-1→stage-2 drift (queue authoring inconsistent with archive corpus). Round 11 §1.5 surfaced stage-2→stage-3 drift (validator session generated finding inconsistent with source artifact). §1.7 surfaced confidence-label discipline drift at stage-3.

**Operative discipline**: each stage requires verbatim-source-quote citation for KNOWN claims (Round 11 §1.7 closure-path-α). Without quote-discipline, propagation degrades to repetition-based-confidence rather than evidence-based-confidence.

### §3.2 — Pattern: §3.9.D honest-gap placeholders → captured-incident realization → category subdivision

**Anchor evidence**: §3.9.D Wave 1 enumerated 5 categories all "pending observation". Wave 1 evidence captured: §1.5 (manifest-violation false positive — fabrication-class) + §1.6 (shared-index race during commit cycle — recurrence of Round 9 §1.1-§1.3 class). Both captured-incidents revealed the original §3.9.D categories as TOO COARSE: "Manifest-violation false positives" needs sub-categorization (fabrication vs glob-semantics-ambiguity); "Queue claim races" needs sub-categorization (queue-row-claim race vs structural shared-index race).

**Pattern statement**: pre-declared category placeholders are first-pass approximations. Captured-incidents reveal the actual category-boundary structure. Category subdivision is itself evidence of methodology maturation.

**Operative discipline**: when filing an incident in an §3.9.D category, surface BOTH (a) the category match AND (b) any sub-classification distinction. Round 11 §1.5 explicitly proposed "fabrication-class" sub-category as closure-path-α; Round 11 §1.6 distinguished from "queue claim races" explicitly via diagnostic. The category-subdivision proposals are themselves §3.9.D evolution candidates.

### §3.3 — Pattern: cross-session findings as dispatch-class artifacts (recursive anti-fabrication scrutiny)

**Anchor evidence**: Round 11 §2.D (this session re-verified validator's Tier 1 finding before halting; identified fabrication) generalizes Round 9 §1.9 (chat-Claude path-fabrication caught at P2 dispatch-authoring time).

**Pattern statement**: any session-output that downstream sessions consume as input (dispatch text, validator finding, queue update) IS a dispatch-class artifact subject to the same anti-fabrication discipline as operator dispatch. Sub-sessions cannot trust upstream-session output verbatim; they must re-verify source artifacts before acting on conclusions.

**Operative discipline**: receive validator/queue-watcher/orchestrator findings as `[MODELED]`-grade input regardless of upstream's confidence labels; promote to `[KNOWN]` only after own-session source-artifact verification. This is "anti-fabrication is non-transitive across sessions" — a §2.1 extension at the cross-session boundary.

**Tooling support**: every cross-session finding citing another session's output should include source-quote citation alongside the finding (§1.5 closure-path-β quote-discipline). Without quote-discipline, the cross-session-finding propagation chain has no machine-checkable verification surface.

### §3.4 — Pattern: manifests as commit-targets enable mid-cascade authoring-correction without ladder rollback

**Anchor evidence**: Round 11 §2.G (manifest-self-correction primitive) anchored on `6d7dff3` (t8 manifest correction <30min wall-clock) + `e5c7c96` (t9 manifest expansion <5min wall-clock). Both corrections shipped via cairn-grammar `spike(§3.9):` commits modifying manifest text.

**Pattern statement**: §3.9 manifests are first-class artifacts editable by the same per-path-commit discipline as code. This means manifest-authoring imperfection at adoption time does NOT block ladder execution — sessions HALT at execution-time-discovered manifest gaps and operator-arbitrated spike commits restore forward progress without rolling back already-shipped ladder commits.

**Implication for §3.9 evolution**: §3.9.E primitive ratification (per §2.G closure) — "manifests are mid-cascade modifiable via cairn-grammar spike commits with per-path discipline" — converts an emergent operational pattern into an explicit primitive. Without §3.9.E ratification, manifest-correction commits are formally ad-hoc; with ratification, they become part of the §3.9 specification and queue-authoring can pre-allocate manifest-correction-budget per cascade.

**Failure mode (open)**: manifest-correction commits during a live cascade can themselves race against in-flight session staging (the manifest file is in `docs/coordination/territorial-manifests/` which is in EVERY session's FORBIDDEN; only operator-authored commits land there). §3.9.A enforcement model for manifest-edits IS the operator-arbitration carve-out — analogous to §3.9.C frozen-contract carve-out. Worth specifying explicitly in §3.9.E.

### §3.5 — Pattern: HALT vocabulary expansion accompanies methodology surface evolution

**Anchor evidence**: Round 9 introduced HALT-TICKET-BODY-PRE-COMMIT (later §C-envelope-expanded, Round 9 §1.5). Round 11 introduced HALT-TERRITORY-ACK (Round 11 §1.A) + HALT-TERRITORY-VIOLATION (per §3.9.A) + HALT-MANIFEST-TEST-DISCOVERY (Round 11 §1.8) + HALT-AMBIGUOUS-MANIFEST (proposed by validator §1.5 §9 recommendations) + HALT-QUEUE-DRIFT (proposed by Round 11 §1.A1 closure-path-β).

**Pattern statement**: each new methodology surface (territorial-manifest, dispatch-queue, runtime-tooling-cross-check) generates new HALT vocabulary as that surface's exception-class names. HALT vocabulary IS the methodology's exception-handling spec. Round 11 vocabulary count at Wave 2 exceeds Round 9 by ~5 new HALT names.

**Operative discipline**: each new HALT name needs explicit auto-ack-envelope status (auto-ack vs operator-arbitrated). Round 11 §1.A surfaced this for HALT-TERRITORY-ACK; the same discipline applies to every new HALT name. Without explicit envelope status, full-autonomous mode behavior is undefined for new HALT classes.

**Closure**: dispatch-queue §0 conventions block (or hoisted methodology surface) should maintain a HALT-vocabulary registry: `HALT-NAME | introduced-round | auto-ack-eligible | source-of-record-section`. Operator-arbitrated text addition.

### §3.6 — Pattern: substrate-portability of §3.9 across session-type categories

**Anchor evidence**: Round 11 Wave 1 + Wave 2 cohort spans 5+ session-type categories: ladder-execution (phase4-t8/t9 — code-touching), audit (manifest-validator — read-only-validation), watch (queue-watcher — observation-reporting), archive (this session — methodology-evidence-corpus), continuation (Wave 2's c5/commit-plan-doc/t1/t3/t6 — followup execution + ticket-body drafting + Cortex deepening + Sherpa analysis). All session-type categories operated under the same §3.9 manifest schema with no schema-class adjustment needed.

**Pattern statement**: §3.9's TERRITORY/FORBIDDEN/(READ-ONLY) glob schema is portable across heterogeneous session-type categories without per-category schema specialization. The schema's expressiveness is sufficient; per-session-type variation is in glob CONTENT (which paths are claimed) not glob STRUCTURE.

**Implication**: §3.9 generalizes beyond ladder-execution sessions. The same schema supports orchestrator-side coordination work (`__orchestrator_active`, `__orchestrator_standby` per Wave 2 dispatch-queue rows 31-32) as well as per-feature sub-sessions. This is positive evidence for §3.9.SPECULATIVE → §3.9.RATIFIED disposition: schema design is robust across the session-type space currently in use.

---

## §4 — §3.9 validation verdict (KNOWN / MODELED / SPECULATIVE per mechanism)

This section issues the per-mechanism validation verdict for §3.9 SPECULATIVE adoption based on Wave 1 + Wave 2 evidence corpus to date. Verdicts use CLAUDE.md §2.2 confidence-label semantics applied to mechanism-validation rather than to factual claims. A mechanism's verdict reflects whether it has been EXERCISED + OBSERVED-WORKING (KNOWN), REASONED-FROM-EVIDENCE-PLUS-MODEL (MODELED), or HYPOTHESIZED-WITHOUT-EXERCISE (SPECULATIVE).

### §4.1 — §3.9 sub-mechanism verdict table

| Sub-mechanism | Wave 1+2 evidence | Verdict | Source-of-record |
|---|---|---|---|
| §3.9 manifest-bound territory partitioning (TERRITORY/FORBIDDEN globs) | 12 IN-FLIGHT sessions Wave 2; 0 cross-session contamination committed in pathspec-discipline-applied commits. **Wave 3 evidence: §1.RC3 surfaces file-granular grammar gap — t2-archive-coauthor + r11-archive-writer share whole-file territory by manifest; sub-section partition is operator-INTENT but NOT machine-checkable.** Path-granular partitioning works for path-disjoint sessions; insufficient for shared-file co-authoring. | **MODELED** — works at file-disjoint partitioning at 12-concurrent scale; **SPECULATIVE** at sub-section co-authoring (§1.RC3 grammar extension candidate) | §2.E + §2.F + §2.H + §1.RC3 |
| §3.9.A enforcement (per-add glob-match against manifest) | NO automated enforcement tooling exists; operative form is session-discipline (per-path `git add` + manual glob-mental-check) | **SPECULATIVE** for the original specification; **MODELED** for the discipline-applied form | §1.6 + §1.A1 + queue-watcher §8 |
| §3.9.A enforcement (commit-pathspec mandate) | Wave 1+2 evidence: validated at Round 11 §1.6 (queue-watcher near-miss); applied across all R11 archive commits + phase4-t8/t9 ladder commits. **Wave 3 evidence: c5/63eba0f §1.RC1 — contamination LANDED when commit-pathspec was OMITTED despite per-path-add discipline applied. DIRECT-EVIDENCE confirmation that the mitigation is not just modeled-load-bearing but observed-load-bearing-via-counter-example.** | **KNOWN** — confidence promoted from MODELED-load-bearing to KNOWN-load-bearing-with-counter-example; Wave 3 c5/63eba0f is the negative test that proves the positive | §1.6 + §1.RC1 + §2.B + §2.C |
| §3.9.B atomic claim via commit (QUEUED→IN-FLIGHT row-claim race) | QUEUED has been EMPTY in both Wave 1 and Wave 2 (direct dispatch with pre-bound manifests); mechanism never exercised | **SPECULATIVE — UNTESTED** | dispatch-queue line 19 (Wave 2): "no QUEUED items" |
| §3.9.C frozen-contract carve-out (FORBIDDEN-irrespective inviolability) | No IN-FLIGHT session attempted to write a frozen contract; all 12 Wave 2 manifests honor frozen-contract enumeration in §0 | **KNOWN** for compliance observation; **SPECULATIVE** for active-attempt-and-block (negative-test never run) | dispatch-queue §0 line 14 + per-manifest FORBIDDEN clauses |
| §3.9.D honest-gaps placeholder enumeration | Wave 1 declared 5 categories; Wave 1+2 evidence populated 4/5 with captured incidents OR observation-deltas; queue-authoring-bottleneck added at Wave 2 prep | **KNOWN** — mechanism is observable + actively maintained; subject to authoring-discipline drift (§1.A1) | dispatch-queue §3.9.D + §1.X subsections |
| Manifest-self-correction (emergent §3.9.E candidate) | 2 events Wave 1: `6d7dff3` (t8) + `e5c7c96` (t9); both <30min wall-clock | **KNOWN** working operationally; **SPECULATIVE** as ratified primitive (not yet specified in dispatch-queue §0) | §2.G + §3.4 |
| Cross-session findings cross-verification (§2.D / §3.3 pattern) | Round 11 §1.5 caught fabricated validator finding via own-session source re-verification; ladder advanced past spurious operator-arbitration gate | **MODELED** working; load-bearing for fabrication-class incidents | §1.5 + §2.D + §3.3 |
| HALT-TERRITORY-ACK auto-ack semantics | This session's §1.A surfacing observed; auto-ack-envelope status implicit-from-dispatch-text "WB commits within scope" | **MODELED** — operative under current dispatch text; **SPECULATIVE** for codification (operator-arbitrated text addition pending) | §1.A + §3.5 |

### §4.2 — Mechanism-class verdict aggregation

**KNOWN-class (load-bearing-validated)** mechanisms:
- §3.9.A commit-pathspec mandate (load-bearing observed in shared-index race mitigation)
- §3.9.D honest-gaps placeholder enumeration (observable + maintained mechanism)
- Manifest-self-correction (operational success)

**MODELED-class (works-at-current-scale-and-evidence)** mechanisms:
- §3.9 manifest-bound territory partitioning (works at 12-concurrent; 16-concurrent unproven)
- §3.9.A enforcement discipline-applied form (works via session-discipline; no tooling)
- Cross-session findings cross-verification (works for fabrication-class; not stress-tested at higher rates)
- HALT-TERRITORY-ACK auto-ack semantics (works under current dispatch text)

**SPECULATIVE-class (unexercised or not-codified)** mechanisms:
- §3.9.A enforcement original specification (no automated tooling; SPECULATIVE as written)
- §3.9.B atomic claim via commit (QUEUED never populated; never exercised)
- §3.9.C frozen-contract carve-out negative-test (never attempted-and-blocked)
- Manifest-self-correction as RATIFIED §3.9.E primitive (not yet codified)

### §4.3 — Aggregate §3.9 disposition recommendation (forward-position)

[MODELED, this session's synthesis based on §4.1 + §4.2]:

**§3.9 SPECULATIVE → SPECULATIVE-with-targeted-ratifications.** Wave 1+2 evidence supports partial ratification of the validated load-bearing sub-mechanisms while keeping the unexercised sub-mechanisms in SPECULATIVE status pending evidence:

1. **Ratify** (operator-arbitrated CLAUDE.md text addition):
   - §3.9.A commit-pathspec mandate (KNOWN-class; Round 9 Tier 1 closure-path-α + Round 11 §1.6 confirmation)
   - Manifest-self-correction primitive as §3.9.E (KNOWN operational; codification needed per §3.4 closure)
   - Cross-session findings cross-verification as §2.1-extension (MODELED but load-bearing; mirrors Round 9 §1.9 unratified amendment)

2. **Keep SPECULATIVE pending evidence**:
   - §3.9.B atomic claim via commit (need QUEUED rows + concurrent claim attempts; no current Phase 4 ticket flow exercises this)
   - §3.9.A original automated-enforcement specification (need pre-commit hook tooling; not yet authored)
   - 16-concurrent ceiling (need cascade attempt at scale; current Wave 2 ceiling is 12)

3. **Refine before any ratification**:
   - §3.9.D honest-gaps update protocol (per §1.A1 closure-path-α: queue-authoring must cite verbatim-source for status updates)
   - HALT-vocabulary registry (per §3.5 closure: introduced-round + auto-ack-eligible + source-of-record per HALT name)

4. **Reject** (no recommendation; §3.9 has not produced cause for rejection):
   - None at this time. All §1 incidents are operationally-recoverable (manifest correction <30min) or methodology-discipline-improvement-class (closure-paths enumerated). No incident has produced contamination-landed-and-not-recovered evidence.

[SPECULATIVE]: The aggregate disposition is itself this session's recommendation, not operator-arbitrated. Final §3.9 SPECULATIVE → ratified status is operator-only per CLAUDE.md §1 frozen-contract surface authority.

### §4.4 — Round-9-comparison: did §3.9 eliminate the §1.1-§1.3 shared-index race class?

[KNOWN per §1.6 + §2.E + §2.F + §2.H]: **NO — §3.9 did NOT eliminate the shared-`.git/index` race class.** Round 11 §1.6 documents the same race recurring under §3.9 partitioning. What §3.9 changed is the MITIGATION SURFACE: Round 9 had no specified mitigation (incidents landed contamination, e.g. T6 sweep at `0d71590`); Round 11 has commit-pathspec discipline that prevents the race-window outcome from landing in any commit. Net contamination in Round 11 to date: 0. Net contamination in Round 9 same-period: 1 (T6 sweep). So §3.9 + commit-pathspec is OUTCOME-eliminating but not RACE-eliminating.

[MODELED]: The structural fix candidate (Round 9 §1.1 closure-path-γ: per-session worktrees per CLAUDE.md §4.3) remains the only intervention that would eliminate the race itself rather than mitigating its outcome. §3.9 territorial partitioning works alongside the shared-tree substrate; per-session worktrees would substrate-shift to eliminate the substrate where the race occurs. Both can coexist: §3.9 governs WHICH paths a session writes; per-session worktrees govern WHICH git-index those writes hit.

[KNOWN per Wave 3 c5/63eba0f §1.RC1 + operator escalation in `6120dfd`]: **Wave 3 update.** Per-session-worktrees closure-path was operator-CRITICALLY-escalated to URGENT in `6120dfd` Tier 1 row update. This archive's Wave 2 modeling (per-session worktrees as only structural-fix candidate) is now operator-concurred. Substrate-shift remains deferred (no commit yet implements it); the operative state is "URGENT-but-not-shipped" structural-fix posture.

### §4.5 — Race-window mechanism evidence post-c5/63eba0f (Wave 3 direct-evidence anchoring)

[KNOWN per `9b8a4e9` commit body diagnostic + §1.RC1 sequence reconstruction]:

The shared-`.git/index` race window mechanism, modeled at Round 11 §1.6 from queue-watcher's near-miss, is now KNOWN at higher confidence via direct-evidence at c5/63eba0f. The mechanism in canonical form:

```
T₀: session-A: git add -- <A's path>          → index: {A}
T₁: session-A: git diff --staged --name-only  → reports {A} (verification step)
T₂: session-B: git add -- <B's path>          → index: {A, B}  (race injection)
T₃: session-A: git commit -m "..."            → commits {A, B} under A's authorship
T₄: contamination LANDED in commit
```

[KNOWN per `9b8a4e9`]: The race window is between T₁ (session-A's verification) and T₃ (session-A's commit). Per-path `git add` discipline (CLAUDE.md §2.7 wording at incident time) governs T₀ only — it does not bind T₃. Session-B's T₂ injection is INVISIBLE to session-A unless session-A re-runs `git diff --staged --name-only` IMMEDIATELY before T₃ AND treats any change as HALT-INDEX-DRIFT. Even with re-verification, the T₂-can-occur-after-re-verification race remains.

[KNOWN per Wave 3 evidence]: The ONLY mitigation that closes the race-outcome surface is `git commit -- <pathspec>` at T₃ — pathspec restricts commit scope to the specified path REGARDLESS of what else is staged at T₃. This is operator-arbitrated in dispatch text from Wave 1 onward; c5/63eba0f shows what happens when a session honors pathspec-add but omits pathspec-commit (contamination lands).

**Mechanism evidence-strength curve across rounds:**

| Round | Evidence type | Confidence | Source |
|---|---|---|---|
| Round 9 §1.2 (T1 WB2) | Race observed; T1 caught + refused | MODELED-load-bearing-mitigation candidate | T1 forensic capture |
| Round 9 §1.3 (T2 WB2) | Race observed; T2 re-staged | MODELED reinforcement | T2 commit body |
| Round 11 §1.6 (queue-watcher) | Race observed live; commit-pathspec PREVENTED contamination | MODELED-load-bearing-mitigation working in shared-tree | queue-watcher report §8-§9 |
| Round 11 §1.RC1 (c5/63eba0f) | Race observed; commit-pathspec OMITTED; contamination LANDED | **KNOWN-load-bearing via counter-example** — the negative test proves the positive | `9b8a4e9` revert commit body explicit attribution |

[KNOWN per cumulative evidence]: race-window mechanism is now KNOWN-class. The mitigation (commit-pathspec) is KNOWN-load-bearing via both positive cases (§1.6 prevented contamination) and counter-example (§1.RC1 contamination landed when omitted). No remaining ambiguity in mechanism characterization. Closure-path codification (§2.7 amendment, §4.3 ratification) is operator-arbitrated next-action.

### §4.6 — Dispatch-envelope-creep as orchestrator-judgment-layer §3.9 sub-mechanism (Wave 3 emergent)

[KNOWN per `5318421` self-audit + §1.RC2 sequence reconstruction]:

§3.9 schema as adopted at `d41bacb` enumerated three sub-clauses (per dispatch-queue §0): §3.9.A enforcement, §3.9.B atomic-claim, §3.9.C frozen-contract carve-out, §3.9.D honest-gaps. All four operate at the SESSION-level (each session governs its own staging + commit + claim + contract-touch). Wave 3 evidence at `5318421` reveals a fourth necessary layer: orchestrator-judgment-layer dispatch-envelope decisions.

[MODELED per Wave 3]: §3.9 sub-mechanism extension candidate **§3.9.G — orchestrator dispatch-envelope governance**:

- **Scope**: orchestrator-layer decisions about HOW MANY sessions to dispatch concurrently against shared substrate; WHICH sessions are token-pressured and should be excluded from auto-dispatch envelope; WHEN to expand the envelope vs HALT-DISPATCH for operator visibility.
- **Failure mode** (per §1.RC2): envelope expansion beyond literal operator-ack scope → too many concurrent sub-sessions → shared-`.git/index` race-window probability grows O(N²) → first session that omits commit-pathspec lands contamination (§1.RC1).
- **Mitigation** (per `5318421` closure-path-γ): ANNOUNCEMENT-per-dispatch in coord doc + token-pressure session exclusion from auto-dispatch.
- **Validation status**: **MODELED-as-necessary** per Wave 3 attribution evidence; **SPECULATIVE-as-codified** until dispatch-queue §0 explicitly enumerates §3.9.G.

[KNOWN per Wave 3]: this sub-mechanism was NOT visible in Wave 1 or Wave 2 evidence corpora. Wave 1 had 5 sessions (sub-O(N²)-significant); Wave 2 expanded to 12 with orchestrator-bottleneck observed at queue-authoring (the §1.A1 honest-gaps drift incident was the FIRST surface of orchestrator-layer drift); Wave 3 c5/63eba0f + envelope-creep self-audit makes the orchestrator-layer mechanism FIRST-CLASS visible.

**Updated §4.1 sub-mechanism table addendum (Wave 3):**

| Sub-mechanism | Wave 3 evidence | Verdict (Wave 3 update) | Source-of-record |
|---|---|---|---|
| §3.9.G orchestrator dispatch-envelope governance (NEW) | `5318421` Tier 1 self-audit; envelope-creep CAUSED §1.RC1 contamination | **MODELED** as necessary; **SPECULATIVE** as codified §3.9 sub-mechanism | §1.RC2 + §4.6 (this section) |

**Aggregate disposition update (vs §4.3 Wave 2 framing):**

[MODELED, this session's Wave 3 synthesis]: §4.3 Wave 2 ratification recommendations are reinforced + extended:

3 (additional). **Refine before any ratification** (Wave 3 additions to §4.3 list):
   - §3.9.G orchestrator dispatch-envelope governance codification (per §1.RC2 closure-path-γ: ANNOUNCEMENT-per-dispatch + token-pressure exclusion). This sub-mechanism was invisible at Wave 2 disposition framing.
   - Per-session worktrees URGENT-priority elevation per `6120dfd` operator escalation (§1.RC1 closure-path-γ). Was "structural-fix candidate" at Wave 2; now operator-CRITICALLY-escalated.
   - Sub-section-granular manifest TERRITORY (§1.RC3 closure-path-α §3.9.F extension) — Wave 3 surfaced operator-INTENT for shared-file co-authoring beyond grammar's expressive capacity.

[KNOWN] **Wave 3 disposition state**: §3.9 SPECULATIVE → SPECULATIVE-with-targeted-ratifications-AND-three-new-refinements-required. The Wave 2 framing was forward-correct; Wave 3 evidence accelerates the per-session-worktrees urgency and surfaces two new refinement requirements. Net direction: §3.9 mechanism design is converging on a richer-than-original schema (4 sub-clauses → 7+ sub-clauses + sub-section-granularity); ratification will require operator-arbitrated text additions across multiple methodology surfaces.

---

## §5 — Round-close synthesis

**Round-close synthesis is co-authored across two sessions per Wave 3 dispatch (`afa3f4d` queue rows 25 + 30):** this archive-writer session contributes §5.A (prep contribution); t2-archive-coauthor session contributes §5.B+ (subsection assignment per coord doc `docs/coordination/round-11-archive-coauthor-notes-2026-05-12.md`, which is in t2's territory not this session's). Per §1.RC3 territorial-grammar gap, this partition is operator-INTENT enforced via discipline, not via §3.9 manifest grammar. The round is still open at Wave 3 first archive-writer commit; 8+12 = 20 sessions across Wave 3 QUEUED + Wave 2 IN-FLIGHT carry-over rows; 16-concurrent forward-target was reached at Wave 2 + Wave 3 cumulative dispatch (per dispatch-queue table).

### §5.A — r11-archive-writer Wave-3 round-close prep contribution

[KNOWN per cumulative §1 + §2 + §4 evidence at Wave 3 commit time]:

#### §5.A.1 Cumulative incident inventory (Wave 1 + Wave 2 + Wave 3)

| Tier | Section | Incident | Round 11 wave | Status |
|---|---|---|---|---|
| Tier 1 | §1.5 | r11-manifest-validator fabricated FORBIDDEN glob (fabrication-class manifest-violation false positive) | Wave 1 | Documented; quote-discipline closure-path enumerated |
| Tier 1 recurrence | §1.6 | shared-`.git/index` race (commit-pathspec PREVENTED contamination — discipline-working case) | Wave 1 | Mitigation observed working |
| Tier 1 RECURRENCE | §1.RC1 | c5/63eba0f cross-session contamination LANDED (commit-pathspec OMITTED — discipline-failure case) | Wave 2 | Operator-arbitrated revert chain shipped (`9b8a4e9`+`a400c10`+`228a2da`+`56925b8`+`31d2a59`+`6120dfd`) |
| Tier 1 RECURRENCE | §1.RC2 | orchestrator dispatch-envelope-creep (meta-cause of §1.RC1) | Wave 2 | Tier 1 followup filed at `5318421`; closure-path-γ recommended |
| Tier 2 | §1.7 | r11-manifest-validator [KNOWN] confidence-label drift on §1.5 fabricated claim | Wave 1 | Documented; quote-discipline closure |
| Tier 2 | §1.8 | phase4-t8 manifest globs vs daemon vitest discovery convention | Wave 1 | Corrected at `6d7dff3` mid-cascade |
| Tier 2 | §1.9 | phase4-t8 manifest scope mismatch with P5 forward-position artifact `31709e0` | Wave 1 | Co-corrected at `6d7dff3` |
| Tier 2 | §1.A1 | dispatch-queue Wave 2 §3.9.D honest-gaps drift (queue-authoring inconsistency) | Wave 2 | Documented; FIRST surface of orchestrator-layer drift retrospectively-recognized as precursor to §1.RC2 |
| Tier 2 emergent | §1.RC3 | §3.9 manifest grammar lacks sub-section granularity (Wave 3 t2 co-author overlap) | Wave 3 | Mitigated by operator-INTENT subsection partition + this session's §5.A self-confinement |
| Tier 3 | §1.A | HALT-TERRITORY-ACK as surface-only auto-ack semantics | Wave 1 | Methodology evolution observation |
| Tier 3 | §1.B | archive-writer cross-round territory granularity | Wave 1 | Schema-clarity gap; promoted to Tier 2 at §1.RC3 (sub-section gap is the same class) |

**Tier 1 count: 4 (1 false-positive + 1 discipline-working + 2 RECURRENCE — 1 contamination-landed + 1 orchestrator-layer-meta-cause).**
**Tier 2 count: 5 (3 manifest-authoring + 1 honest-gaps drift + 1 grammar gap).**
**Tier 3 count: 2 (HALT vocabulary + cross-round granularity).**

#### §5.A.2 Closure-path roadmap by Tier 1 incident

| Tier 1 incident | Section | Operator-arbitrated closure-path | Disposition (Wave 3) |
|---|---|---|---|
| §1.5 fabrication | §1.5 closure-α | quote-discipline at validator-output (cite verbatim source for [KNOWN] claims) | Pending operator-side methodology window |
| §1.RC1 contamination | §1.RC1 closure-α-γ | (α) §2.7 commit-pathspec mandate codified into CLAUDE.md text + (γ) per-session worktrees URGENT per `6120dfd` | (α) operator-arbitrated text addition pending; (γ) operator-CRITICALLY-escalated, not yet shipped |
| §1.RC2 envelope-creep | §1.RC2 closure-γ | ANNOUNCEMENT-per-dispatch in coord doc + token-pressure session exclusion from auto-dispatch envelope | Filed at `5318421`; awaiting operator-ratified orchestrator-layer protocol |

#### §5.A.3 §3.9 SPECULATIVE → ratification disposition framing for operator (Wave 3 update)

[MODELED, this session's forward-position recommendation per §4.3 Wave 2 framing + Wave 3 §4.6 extensions]:

**Recommended operator-arbitrated final disposition: SPECULATIVE → SPECULATIVE-with-three-targeted-ratifications-and-four-refinements-required.** Wave 3 evidence accelerates per-session-worktrees urgency and adds three new refinement requirements relative to Wave 2 framing (§4.3).

**Three ratifications recommended (operator-arbitrated CLAUDE.md text additions):**
1. §3.9.A commit-pathspec mandate (Round 11 §1.6 mitigation evidence + §1.RC1 counter-example direct-evidence; KNOWN-load-bearing)
2. Manifest-self-correction primitive as §3.9.E (§2.G operational success in Wave 1)
3. Cross-session findings cross-verification as §2.1-extension (§2.D + §3.3 pattern; load-bearing for fabrication-class incidents)

**Four refinements required before any ratification:**
1. §3.9.D honest-gaps update protocol (per §1.A1 closure-α: queue-authoring must cite verbatim-source for status updates)
2. HALT-vocabulary registry (per §3.5 closure: introduced-round + auto-ack-eligible + source-of-record per HALT name)
3. **(Wave 3 NEW)** §3.9.G orchestrator dispatch-envelope governance codification (per §1.RC2 closure-γ + §4.6 sub-mechanism)
4. **(Wave 3 NEW)** §3.9.F sub-section-granular TERRITORY syntax for shared-file co-authoring (per §1.RC3 closure-α + §4.1 partitioning verdict update)

**Two structural-fix elevations:**
1. Per-session worktrees per CLAUDE.md §4.3 — Wave 2 candidate → Wave 3 operator-CRITICALLY-escalated per `6120dfd`. URGENT priority. Substrate-shift convergent fix for §1.RC1 + §1.RC2 + §1.RC3 + §1.6 + Round 9 §1.1-§1.3.
2. Pre-commit hook validating staged-files match expected pathspec (§1.RC1 closure-β; original Round 9 §1.1 closure-β) — mechanical defense complementary to commit-pathspec discipline.

**No rejection recommendations.** §3.9 has produced no contamination-landed-and-not-recovered evidence; all Tier 1 incidents have shipped operator-arbitrated remediation chains. The methodology is converging on a richer-than-original schema, which is healthy methodology evolution rather than design failure.

#### §5.A.4 Round 11 vs Round 9 comparison (Wave 3 update)

| Question | Round 9 evidence | Round 11 evidence | Verdict |
|---|---|---|---|
| Did §3.9 eliminate the §1.1-§1.3 shared-index race class? | N/A (§3.9 not adopted) | NO — race recurred at §1.6 (mitigated) and §1.RC1 (landed); §3.9 is OUTCOME-eliminating not RACE-eliminating per §4.4 | §3.9 is necessary-but-not-sufficient |
| At what concurrency ceiling did new failure modes surface? | 6-8 with shared-tree | Wave 1: 5 sessions (no incident); Wave 2: 12 sessions (§1.RC1 + §1.RC2 surfaced); Wave 3: 20 cumulative (§1.RC3 surfaced) | New failure modes surface at each scale step; §3.9 schema evolves to absorb them |
| Did the 16-concurrent attempt complete? | N/A | YES at Wave 2+3 cumulative dispatch (12 IN-FLIGHT carry-over + 8 QUEUED Wave 3 = 20 cumulative) | Reached + exceeded; new failure modes surfaced at scale |
| What proportion of Wave incidents were captured during the wave vs after? | Round 9 archive (round-9.md) was authored over P2's session lifecycle; some incidents captured in same wave, others post | All §1 incidents captured during the wave they occurred in (§1.5-§1.7 + §2.C-§2.D Wave 1; §1.8-§1.A1 + §2.E-§2.H Wave 2; §1.RC1-§1.RC3 + §4.5-§4.6 + §5.A Wave 3) | Live-archive cadence preserved across all 3 waves |
| Did the methodology improve between Round 9 and Round 11? | N/A | Round 9 had 1 contamination-landed event (T6 sweep at `0d171590`); Round 11 also had 1 (c5/63eba0f). Both rounds had multiple discipline-working cases. Round 11 introduced operator-arbitrated remediation chain for the landed event (Round 9 had no formal remediation primitive). Net: contamination rate flat; recovery primitive introduced. | Methodology improvement at recovery-loop layer, not at prevention layer (per-session worktrees pending) |

#### §5.A.5 Roadmap input for §3.9 evolution

Consolidated from §1 closure paths + §3 propagation patterns + §4 validation verdict:

1. **CLAUDE.md text additions** (operator-arbitrated):
   - §2.7 amendment: "per-path `git commit -- <pathspec>` mandatory in shared-tree parallel-cairn contexts" — direct §1.RC1 closure-path-α
   - §3.9 codification (currently SPECULATIVE in commit-level convention only) with sub-clauses §3.9.A-§3.9.G enumerated
   - §3.9.E manifest-self-correction primitive specification
   - §3.9.F sub-section-granular TERRITORY syntax
   - §3.9.G orchestrator dispatch-envelope governance protocol

2. **Substrate-shift execution** (operator-CRITICALLY-escalated per `6120dfd`):
   - Per-session worktree migration per CLAUDE.md §4.3 — eliminates shared-`.git/index` substrate; convergent fix for §1.6 + §1.RC1 + §1.RC2 + §1.RC3 + Round 9 §1.1-§1.3

3. **Tooling artifacts**:
   - Pre-commit hook generator from manifest text (§1.RC1 closure-β)
   - Manifest-grammar parser (§1.5 closure-δ — would have caught fabricated-glob false positives)
   - HALT-vocabulary registry (§3.5 closure)
   - Coord-doc-mediated sub-section assignment protocol (§1.RC3 closure-β)

4. **Methodology-discipline propagation**:
   - Quote-discipline for [KNOWN] claims at validator/orchestrator output (§1.5 + §1.7 + §1.A1 closure-α convergent)
   - ANNOUNCEMENT-per-dispatch protocol in coord doc (§1.RC2 closure-γ)
   - Token-pressure session exclusion from auto-dispatch envelope (§1.RC2 closure-γ)

#### §5.A.6 Honest gap (this contribution's scope-limit)

[KNOWN per §1.RC3 + dispatch-queue row 30]: This §5.A is r11-archive-writer's Wave-3 prep contribution. Per Wave 3 dispatch row 30, t2-archive-coauthor session is also writing §5 of this same file under operator-INTENT subsection partition. t2-archive-coauthor's contribution will appear at §5.B (or higher) post-this-commit. Final round-close synthesis is pending: (a) t2-archive-coauthor's commit, (b) operator-arbitrated round-close declaration, (c) consolidation pass merging §5.A + §5.B+ if needed.

[KNOWN] No machine-checkable mechanism prevents §5.A and §5.B from drifting into each other's prose at the round-close consolidation step. Mitigation: this session's §5.A is bounded by its `### §5.A.<n>` subsection labels; t2 is expected to bound similarly at `### §5.B.<n>`. Any future operator-arbitrated round-close pass should re-verify partition integrity.

---

(Subsections §5.B+ reserved for t2-archive-coauthor session per Wave 3 dispatch operator-INTENT subsection partition.)

### §5.B — t2-archive-coauthor Wave-3 complementary contribution

<!-- COORD-COMMENT (Wave 3 territorial-disjoint sub-section authored by t2-ticket-body-0905-archive-coauthor):
     This §5.B is COMPLEMENTARY (not duplicative) to §5.A. Where §5.A enumerates cumulative incidents + closure-path roadmap + Round-9-comparison table, §5.B contributes:
       1. Merge-checklist crosswalk back to the original §5 placeholder 4-bullet outline
       2. Round-9→Round-11 methodology-trajectory NARRATIVE (complement to §5.A.4 tabular comparison)
       3. Hardest-open-question framing for the operator-arbitrated round-close gate
       4. Co-authoring-event-as-methodology-evidence (live propagation captured in real-time during this session's writes)
       5. Scope-gap from this session's vantage (items §5.A does not cover)
     Anchor per r11-archive-writer's `§5.B+` reservation at round-11.md line 702 in `d06f8c7`.
     Coordination contract + merge plan: `docs/coordination/round-11-archive-coauthor-notes-2026-05-12.md`.
     This draft is content-draft only; merge into a canonical consolidated §5 happens at operator-arbitrated round-close gate.
-->

[KNOWN, confidence labels per CLAUDE.md §2.2 throughout; cross-references to §1.5-§1.RC3 + §2.A-§2.H + §3.1-§3.6 + §4.1-§4.6 + §5.A.1-§5.A.6 as cited]:

#### §5.B.1 — Merge-checklist crosswalk back to the original §5 4-bullet outline

The original §5 placeholder enumerates 5 bullets the canonical round-close synthesis will populate. Both Wave 3 contributions (`§5.A` + this `§5.B`) cover them. Crosswalk table for merge-pass:

| Original §5 bullet | §5.A coverage | §5.B coverage (this section) |
|---|---|---|
| Cumulative incident count by tier + emergent-class enumeration | §5.A.1 inventory table (4 Tier 1 + 5 Tier 2 + 2 Tier 3 at Wave 3 close per §5.A.1 counts) | §5.B.4 adds 1 live-observed Wave-3 event: co-authoring-event-as-methodology-evidence (Edit-call rejection on stale read; not yet promoted to §1.x by either sub-author at this commit time — surfaced here for merge-pass classification) |
| Methodology-amendment recommendations to CLAUDE.md (consolidated) | §5.A.5 roadmap items 1-4 (CLAUDE.md text additions, substrate-shift execution, tooling artifacts, methodology-discipline propagation) | §5.B.3 hardest-open-question framing (per-session worktrees adoption vs §3.9 evolution-continuation) elevates the §5.A.5 item-2 "substrate-shift execution" item to operator-arbitration framing |
| Round 11 vs Round 9 comparison | §5.A.4 5-row table (race-elimination question + ceiling + 16-concurrent attempt + capture-cadence + methodology-improvement-trajectory) | §5.B.2 NARRATIVE complement (methodology trajectory framed as cross-round evolution sequence rather than dimension-by-dimension table; readable end-to-end at round-close) |
| §3.9 SPECULATIVE adoption disposition | §5.A.3 SPECULATIVE→SPECULATIVE-with-three-targeted-ratifications-and-four-refinements-required framing | §5.B.3 reframes as binary fork at the operator-arbitration level (Path A continue §3.9 evolution; Path B substrate-shift via worktrees) — operator may choose both/either; framing is operator-arbitration aid, not duplicate disposition recommendation |
| Roadmap input for §3.9 evolution | §5.A.5 four-row roadmap (CLAUDE.md text additions, substrate-shift, tooling, discipline-propagation) | §5.B.5 honest-gap surface — items NOT covered by §5.A that the merge-pass may want to add |

#### §5.B.2 — Round-9-to-Round-11 methodology-trajectory NARRATIVE

[MODELED, draws on §5.A.4 table data + Round 9 §3 propagation-pattern precedent (round-9.md §2.A-§2.6) + §3.1-§3.6 Round 11 patterns]:

Round 9 surfaced shared-`.git/index` contamination as a Tier 1 class through three incidents (Round 9 §1.1-§1.3); the closure paths enumerated commit-pathspec discipline (α), pre-commit hook (β), and per-session worktrees (γ) as candidates. Round 9's archive corpus captured the discipline patterns mid-cascade — gap-closure propagation across sub-sessions via FOLLOWUPS rows + commit body cross-references (Round 9 §2.1+§2.5). Closure-path α (commit-pathspec) became the operative carry-forward into Round 11.

Round 11 adopted §3.9 territorial-manifest partitioning as the operator-arbitrated structural response (Round 9 closure-path-γ remained roadmap-class). Wave 1 evidence (§1.5-§1.7 + §2.C-§2.D) validated commit-pathspec discipline in the manifest substrate while surfacing the first fabrication-class incident (§1.5 — a category Round 9 did not encounter in its corpus). Wave 2 expanded the cohort from 5→12 concurrent (§2.H scale-mark) and surfaced manifest-authoring-quality classes (§1.8/§1.9/§1.A1) — failure modes that exist only WITHIN the §3.9 substrate, not in shared-tree parallel-cairn. The first contamination-LANDED event of Round 11 surfaced in Wave 2 via §1.RC1 (c5/63eba0f); the operator-arbitrated revert chain (`9b8a4e9` through `6120dfd`) shipped recovery successfully — recovery primitive introduced for round 11 that Round 9 lacked formally.

Wave 3 evidence (§1.RC2 envelope-creep + §1.RC3 sub-section-grammar gap + §4.5-§4.6 race-window/envelope-creep + §5.A round-close prep + this §5.B) extends the corpus. The trajectory is asymmetric: outcome-elimination has been concrete (1 contamination-landed in Round 9 → 1 contamination-landed in Round 11 across 2.4x concurrency growth + recovery primitive ratification); race-elimination remains structural-pending (per §4.4 + §5.A.4 row 1). Methodology improvement at the recovery-loop layer outpaces methodology improvement at the prevention layer. This is a workable methodology — most contamination outcomes don't land — but the structural fix (per-session worktrees) remains the only intervention that would shift the prevention-layer balance.

Across Round 9 and Round 11, four primitives have been operator-arbitrated into stable use: (a) per-path `git add` (Round 9 era), (b) per-path commit-pathspec (Round 9→Round 11 propagation), (c) §3.9 territorial manifests (Round 11 adoption), (d) manifest-self-correction via `spike(§3.9):` commits (Round 11 §2.G emergent). Three more are at SPECULATIVE-ratification candidacy per §5.A.3: §3.9.A commit-pathspec mandate codified into CLAUDE.md text, manifest-self-correction as §3.9.E, cross-session findings cross-verification as §2.1-extension. Two structural-fix candidates remain operator-CRITICAL-escalated per `6120dfd`: per-session worktrees + pre-commit hook generator.

The cross-round methodology trajectory is converging on a richer schema (§5.A.3 framing). This is healthy methodology evolution: each round's failure modes surface new schema requirements; each round's recovery primitives become next-round prevention candidates. The cost of this evolution is operator-arbitration cycle per primitive; the value is empirical-validation of every primitive's load-bearing dimensions before codification.

#### §5.B.3 — Hardest-open-question framing for operator-arbitrated round-close gate

[MODELED]: The hardest operator-arbitration question for round-close is NOT whether to ratify §3.9 (§5.A.3 already provides three-ratifications-and-four-refinements framing; round-close converts to operator-arbitrated final). The hardest question is whether to commit to a **substrate-shift** to per-session worktrees alongside §3.9 ratification, OR continue **§3.9-substrate evolution** without worktree migration.

The fork:

| Path | Description | Cost | Risk-reduction | Recommendation |
|---|---|---|---|---|
| Path A — §3.9 evolution-continuation | Ratify §3.9 + apply §5.A.3 refinements (§3.9.A-§3.9.G + §3.9.F sub-section grammar + §3.9.G envelope governance); per-session worktrees deferred to Round 12+ candidate | Lower per-round amendment cost; preserves established mid-cascade primitives | Reduces outcome-class incidence at current scale (12-concurrent); does NOT eliminate race CLASS | Default if Wave 3+ 16-concurrent attempt produces no contamination-landed event |
| Path B — substrate-shift to per-session worktrees + §3.9 ratification | Migrate parallel-cairn to `~/Desktop/Automata/foxworks-worktrees/<session-name>/` per CLAUDE.md §4.3 + ratify §3.9 as territorial-discipline layer atop worktrees | Higher migration cost (operator tooling, branch-coordination, merge-back protocol); preserves §3.9 territorial discipline | Eliminates shared-`.git/index` race CLASS entirely; outcome AND race-class fix | Default if Wave 3+ 16-concurrent attempt produces contamination-landed event(s) OR per `6120dfd` operator-CRITICAL escalation already standing |

The question requires operator arbitration because:
- Cost vs risk-reduction is a value judgment over future cascade scale (will rounds 12+ push past 20-concurrent? if so, race-class probability scales O(n²) per §2.H).
- Existing investment in §3.9 substrate (manifests, dispatch-queue, claim atomicity, manifest-self-correction primitive) is preserved under both paths, but Path B requires worktree-aware sub-session boot logic + cross-worktree coord-doc routing.
- `6120dfd` operator-CRITICAL escalation may already commit Path B; round-close should re-verify operator's intent given Wave 3 evidence.

This §5.B.3 framing is the operator-arbitration aid, not a duplicate disposition recommendation; §5.A.3 retains the SPECULATIVE→ratification-with-refinements framing as this session's forward-position concordant view.

#### §5.B.4 — Co-authoring-event-as-methodology-evidence (live Wave-3 capture)

[KNOWN per this session's tool-invocation log + r11-archive-writer's `d06f8c7` commit]:

This §5.B is co-authored in real-time alongside §5.A. The co-authoring event itself surfaces methodology evidence not yet promoted into a numbered §1.x incident in either sub-author's contribution:

1. **First-Edit-call rejection on stale read.** This session's first `Edit` invocation against round-11.md was rejected with "File has been modified since read, either by the user or by a linter" because r11-archive-writer's `d06f8c7` had landed between this session's pre-edit `Read` and the `Edit` call. Recovery: re-read; re-anchor to post-`d06f8c7` state (changing `§5.T2-DRAFT` planned-anchor to `§5.B` actual-anchor per their reservation at line 702); re-author. NO contamination produced; tool-level read-staleness detection caught the would-be-overwrite at edit-time.

2. **Sub-section anchor naming convergence.** This session's first-draft coord-notes proposed `§5.T2-DRAFT` and reserved `§5.RW-DRAFT-or-numbered-§5.1` for the sibling. r11-archive-writer landed `§5.A` + reserved `§5.B+`. This session adopted their convention rather than introduce a third anchor, updating coord-notes §2 to reflect actual state. Convergence is via the sibling-session-commit-as-coordination-signal pattern — neither session needed explicit pre-coordination message; the disjointness-via-distinct-numerical-prefixes contract held.

3. **Coord-notes file as cross-session contract anchor.** r11-archive-writer's `§5.A.6` honest-gap explicitly cites this coord-notes file: "t2-archive-coauthor session is also writing §5 of this same file under operator-INTENT subsection partition" — even though this coord-notes file was UNTRACKED at `d06f8c7` time (this session has not yet committed it). The reference is to the manifest path which r11-archive-writer read via the t2-archive-coauthor manifest's TERRITORY clause. The coord-notes contract held without the contract file being committed yet — the manifest references suffice.

These three events suggest closure-path-class candidates for a future numbered incident (`§1.RC4` or similar):
- (α) Tool-level read-staleness detection as a working safety primitive (validates Round 11 §1.6 analysis: commit-pathspec + tool-staleness-detection together prevent contamination).
- (β) Sub-section anchor convergence via commit-as-coordination-signal (no explicit messaging needed for disjoint anchors; pattern works at 2-session scale; scale-up question for 3+ co-author sessions remains open).
- (γ) Manifest-path-as-contract-anchor (manifests + TERRITORY clauses provide contract reachability even before the referenced file is committed; useful design pattern for §3.9.F sub-section-granular TERRITORY syntax per §5.A.3 refinement-2).

Round-close synthesis pass may choose to promote these to a numbered §1.x incident or absorb into §3 propagation patterns.

#### §5.B.5 — Scope-gap from this session's vantage (items §5.A does not cover; merge-pass attention)

[KNOWN per direct comparison of §5.A subsections against the original §5 4-bullet outline + Wave 3 evidence corpus]:

Items round-close merge-pass should address that are NOT covered by §5.A:

1. **Wave-by-wave incident-density growth analysis.** §5.A.1 counts incidents but does not analyze the WAVE-OVER-WAVE growth rate. Round 11 corpus has: Wave 1 captured 4 incidents (§1.5-§1.8); Wave 2 added 4 (§1.9-§1.A1 + §1.RC1/§1.RC2 spanning Wave-2-late/Wave-3-early); Wave 3 adds 3+ (§1.RC3 + §4.5 + §4.6 + live §5.B.4 captures). The incidence-density GROWTH RATE is methodology-evidence-relevant: is §3.9 substrate producing more incidents over time (substrate-pressure increasing) or fewer (substrate-stabilization)? At Wave 3, the growth rate appears flat (~4 per wave), suggesting substrate-stabilization, but the sample is small. Worth tracking in Round 12 archive.

2. **Cross-archive corpus comparison method (Round 7/Round 2 anchors).** Round 11 archive does not yet pull explicit comparison evidence from Round 2 + Round 7 corpus formats. Round 7's §2 chat-Claude-dispatch-authoring-failure classification + §3 substrate-positive-findings framing offer cross-archive evidence dimensions that Round 11 does not yet exercise. Round-close synthesis may want a separate §7 "cross-archive synthesis" section consolidating across rounds 2/7/9/11.

3. **Per-session-worktree migration concrete cost estimate.** §5.A.5 item 2 + §5.B.3 Path B both name per-session-worktree migration as load-bearing decision; neither concretizes the migration cost (operator tooling effort, branch-coordination protocol, merge-back risk, sub-session boot-time delta). A round-close decision benefits from a 1-2 paragraph concrete estimate (operator-arbitrated; sub-sessions can scope the tooling work).

4. **Cascade-completion definition.** "Round 11 closed" is not defined — operator-declared, or evidence-driven (e.g., 16-concurrent attempt completes with N incidents), or time-windowed? §5.A does not surface this and the original §5 placeholder uses "When operator declares Round 11 closed" — operator-arbitrated. Worth surfacing as explicit operator-decision-needed at round-close gate.

5. **Cross-reference completeness audit.** §6 cross-references should be re-audited at round-close for completeness against all §1.x incidents + §2.x propagation events + §3.x patterns + §4.x verdicts + §5.A/B contributions. Mechanical task; operator or merge-pass.

These scope-gaps are not failures of §5.A — they are items beyond §5.A's stated scope ("r11-archive-writer Wave-3 round-close prep contribution"). The merge-pass should decide which to incorporate into the canonical consolidated §5 vs which to defer to Round 12 corpus.

---

<!-- END §5.B — merge candidate for canonical §5 round-close synthesis. See docs/coordination/round-11-archive-coauthor-notes-2026-05-12.md for merge plan + sibling §5.A coordination context. -->

---

### §6.1 — Round 11 infrastructure anchors (at adoption time `d41bacb` and Wave 2 update `f61c14b`)

| Artifact | Path | Role |
|---|---|---|
| §3.9 spike commit | `d41bacb` | Adoption authority + infrastructure summary in commit body |
| Dispatch queue | `docs/coordination/dispatch-queue-current.md` | QUEUED / IN-FLIGHT / COMPLETED; §0 conventions; §3.9.D honest-gaps |
| Manifest dir | `docs/coordination/territorial-manifests/` | Per-session TERRITORY + FORBIDDEN globs |
| This archive | `docs/cairn-under-stress-round-11.md` | Live evidence corpus (§3.9 SPECULATIVE validation deliverable) |

### §6.2 — Round 11 IN-FLIGHT manifests (Wave 1 verified at session boot; Wave 2 verified at continuation read)

**Wave 1 cohort (5 sessions; all moved to COMPLETED at Wave 2 dispatch `f61c14b`):**

| Session | Manifest path | Scope (one-line summary from manifest) |
|---|---|---|
| `r11-archive-writer` | `docs/coordination/territorial-manifests/r11-archive-writer.txt` | round-9.md + round-11.md + arc-synthesis-DRAFT.md (this session's) — continuation to Wave 2 |
| `r11-manifest-validator` | `docs/coordination/territorial-manifests/r11-manifest-validator.txt` | §3.9 compliance audit — continuation to Wave 2 |
| `r11-queue-watcher` | `docs/coordination/territorial-manifests/r11-queue-watcher.txt` | claim-race + dep-cycle detector — continuation to Wave 2 |
| `phase4-t8-exec` | `docs/coordination/territorial-manifests/phase4-t8-exec.txt` | MB-T-WIREFRAME-T8-COST-METER WB2+ continuation (post-`6d7dff3` correction) |
| `phase4-t9-exec` | `docs/coordination/territorial-manifests/phase4-t9-exec.txt` | MB-T-WIREFRAME-T9-PLAN-TIMER WB2+ continuation (post-`e5c7c96` workstation-side expansion) |

**Wave 2 cohort (12 IN-FLIGHT total per `dispatch-queue-current.md` lines 25-36; 9 new manifest-bound sessions + 3 R11-observer continuations):**

| Session | Manifest path | Scope (one-line summary from manifest/queue) |
|---|---|---|
| `c5-ticket-wb1` (cleared) | `docs/coordination/territorial-manifests/c5-tilegrid-wiring.txt` | tile-grid-app integration trinity (3 followups) |
| `commit-plan-doc-1334` (cleared) | `docs/coordination/territorial-manifests/commit-plan-doc-spawnmode.txt` | MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING closure (a) |
| `t1-ticket-body-0905` | `docs/coordination/territorial-manifests/t1-chatshell-polish.txt` | MB-F-CHATSHELL-POLISH-REMAINING execution (T7 followup) |
| `t3-ticket-body-0905` (cleared) | `docs/coordination/territorial-manifests/t3-frame-c-lookup-stub.txt` | MB-F-FRAME-C-IPC-LOOKUP-SESSION production wiring (depends-on c5 trinity) |
| `t6-ticket-body-0905` | `docs/coordination/territorial-manifests/t6-wireframe-t10-body.txt` | MB-T-WIREFRAME-T10-MAX-PARALLEL-DATA-FLOW ticket body draft |
| `verify-chat-mount-1319` | `docs/coordination/territorial-manifests/verify-chat-mount-t7polish.txt` | MB-F-CHATSHELL-POLISH-REMAINING progress (T7 polish) |
| `__orchestrator_active` | `docs/coordination/territorial-manifests/orch-active-phase4-status.txt` | Phase 4 status synthesis doc |
| `__orchestrator_standby` | `docs/coordination/territorial-manifests/orch-standby-sherpa.txt` | Sherpa MVP analysis OR absence report |
| `p7-cortex-draft-1243` | `docs/coordination/territorial-manifests/p7-cortex-deepening.txt` | Cortex-minimal scaffold §1-§4 deepening |
| `r11-archive-writer` | `docs/coordination/territorial-manifests/r11-archive-writer.txt` (existing) | this session — Wave 2 §3 + §4 + §2 extension |
| `r11-queue-watcher` | `docs/coordination/territorial-manifests/r11-queue-watcher.txt` (existing) | next-cohort claim-race + dep-cycle observation across Wave 2 |
| `r11-manifest-validator` | `docs/coordination/territorial-manifests/r11-manifest-validator.txt` (existing) | Wave-2 manifest audit — review 9 new manifests |

### §6.3 — Round 11 cohort sibling-session commits (referenced in §1.5-§1.A1 + §2.E-§2.H)

**Wave 1 cohort:**

| Commit | Session | Artifact | Section above |
|---|---|---|---|
| `759b65e` | r11-manifest-validator | `docs/coordination/manifest-validator-report.md` | §1.5 (Tier 1 fabricated FORBIDDEN glob) + §1.7 (confidence-label drift) |
| `262cc44` | r11-queue-watcher | `docs/coordination/queue-watcher-report.md` | §1.6 (shared-index race + commit-pathspec mitigation) |
| `72c28fc` | r11-archive-writer (this session) | `docs/cairn-under-stress-round-11.md` skeleton | This document — first commit |
| `9a9a96a` | r11-archive-writer (this session) | `docs/cairn-under-stress-round-11.md` §1.5-§1.7 + §2.C-§2.D | This document — second commit |

**Wave 2 cohort (cascade-commit anchors used in §1.8-§1.A1 + §2.E-§2.H):**

| Commit | Session | Role | Section above |
|---|---|---|---|
| `e5c7c96` | operator (manifest correction) | t9 manifest workstation-side expansion | §2.G + §3.4 (manifest-self-correction primitive) |
| `3baa241` | phase4-t9-exec | WB2 SPIKE ADR | §2.F (t9 ladder anchor) |
| `6756a6c` | phase4-t9-exec | WB3 RED | §2.F |
| `3fef80d` | phase4-t9-exec | WB4 GREEN | §2.F |
| `debc40a` | phase4-t9-exec | WB5 RED | §2.F |
| `6d8af23` | phase4-t9-exec | WB6 GREEN | §2.F |
| `de6620e` | phase4-t9-exec | WB7 GREEN | §2.F |
| `afd3778` | phase4-t9-exec | WB8 + runtime smoke + findings | §2.F (CLAUDE.md §4.6 gate honored) |
| `1ca2e15` | phase4-t8-exec | WB2 RED | §2.E (t8 ladder anchor) |
| `39c514b` | phase4-t8-exec | WB3 GREEN | §2.E |
| `1238193` | phase4-t8-exec | WB4 RED | §2.E |
| `155933f` | phase4-t8-exec | WB-final + β amendment | §2.E |
| `6d7dff3` | operator (manifest correction) | t8 manifest daemon `.test.ts` + chat-shell expansion | §1.8 + §1.9 + §2.G + §3.4 |
| `f61c14b` | operator (Wave 2 dispatch) | Wave 2 — 9 new manifests + queue update (12 IN-FLIGHT) | §1.A1 + §2.H + §3.5 (HALT-vocabulary §3.9.A/B/C explicit) |

### §6.4 — Round 9 corpus references (predecessor evidence)

- `docs/cairn-under-stress-round-9.md` — full Round 9 incident corpus, propagation observations, cross-references. §1.1-§1.3 shared-index race class is the immediate motivator for §3.9.
- `docs/FOLLOWUPS.md` rows filed during Round 9 referenced from round-9.md §4.1-§4.3 (Tier 1: cross-session staging contamination + parallel-cairn shared-index race window; Tier 2: monitor regex stale scrollback; Tier 3: α over-conservative concurrent push).

### §6.5 — MEMORY.md primitive references applicable

- `feedback_followup_row_as_forward_propagation_memory` — Round 11 §3.9 dispatch-queue.md §3.9.D honest-gaps block IS this primitive applied at the dispatch-queue level (pre-declared incident-category placeholders waiting for evidence).
- `feedback_stale_dispatch_detection` — applicable at session boot before authoring; this session verified §3.9 spike commit + manifest text + dispatch-queue text are mutually consistent (no stale-dispatch divergence).
- `feedback_consumer_non_regression_per_wb` — N/A for archive-writer session; applicable to phase4-t8-exec / phase4-t9-exec sub-sessions where downstream-consumer probes apply.
- `feedback_ladder_internal_three_source` — N/A for archive-writer session; applicable to phase4-t* sub-sessions whose ticket structure includes ladder verification.

---

**Confidence labels throughout (per CLAUDE.md §2.2):**
- KNOWN: §3.9 spike commit anchor verified via `git --no-pager show d41bacb`; manifest text verified via `Read`; dispatch-queue text verified via `Read`; this session's HALT-TERRITORY-ACK verified via own session response transcript.
- MODELED: §1.A diagnostic about HALT-TERRITORY-ACK auto-ack semantics (anchored on dispatch text but vocabulary-expansion-class inference); §1.B diagnostic about cross-round territory granularity (manifest schema text observed but operator intent inferred).
- SPECULATIVE: §3.9 primitive itself per spike-commit subject line — entire round's primitive is SPECULATIVE pending this corpus's evidence accumulation.

**Live-archive discipline:** SESSION-r11-archive-writer commits + pushes this doc per substantive content addition with explicit per-path `git add` AND per-path `git commit -- <pathspec>` per §3.9.A + Round 9 Tier 1 closure-path-α. Continued updates as Round 11 cascade incidents arrive. Round-close synthesis at §3 fills when operator declares Round 11 closed.
