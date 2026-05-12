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

**Cumulative incident count when this round closes:** TBD — round still open at this archive's first commit. Populated at round-close synthesis (§3).

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

---

## §3 — Round-close synthesis

(empty — round still open at this archive's first commit; 5 IN-FLIGHT sessions in cascade execution.)

When operator declares Round 11 closed, this section will fill with:
- Cumulative incident count by tier (Tier 1 / Tier 2 / Tier 3) + emergent-class enumeration.
- Methodology-amendment recommendations to CLAUDE.md (consolidated from §1 closure paths + §3.9 SPECULATIVE → ratified status decision).
- Round 11 vs Round 9 comparison: did §3.9 territorial partitioning eliminate the §1.1-§1.3 shared-index race class? At what concurrency ceiling did new failure modes surface? Did the 16-concurrent attempt complete?
- §3.9 SPECULATIVE adoption disposition: ratify into CLAUDE.md §3.9 / refine + re-validate / reject + revert to shared-tree per-path-commit-only model.
- Roadmap input for §3.9 evolution: TERRITORY-WRITE/READ-ONLY schema extension (§1.B closure-path-α); HALT-TERRITORY-ACK auto-ack-envelope codification (§1.A closure-path-α); pre-commit territory-glob hook generator from manifest text.

---

## §4 — Cross-references

### §4.1 — Round 11 infrastructure anchors (at adoption time `d41bacb`)

| Artifact | Path | Role |
|---|---|---|
| §3.9 spike commit | `d41bacb` | Adoption authority + infrastructure summary in commit body |
| Dispatch queue | `docs/coordination/dispatch-queue-current.md` | QUEUED / IN-FLIGHT / COMPLETED; §0 conventions; §3.9.D honest-gaps |
| Manifest dir | `docs/coordination/territorial-manifests/` | Per-session TERRITORY + FORBIDDEN globs |
| This archive | `docs/cairn-under-stress-round-11.md` | Live evidence corpus (§3.9 SPECULATIVE validation deliverable) |

### §4.2 — Round 11 IN-FLIGHT manifests (verified at session boot)

| Session | Manifest path | Scope (one-line summary from manifest) |
|---|---|---|
| `r11-archive-writer` | `docs/coordination/territorial-manifests/r11-archive-writer.txt` | round-9.md + round-11.md + arc-synthesis-DRAFT.md (this session's) |
| `r11-manifest-validator` | `docs/coordination/territorial-manifests/r11-manifest-validator.txt` | §3.9 compliance audit |
| `r11-queue-watcher` | `docs/coordination/territorial-manifests/r11-queue-watcher.txt` | claim-race + dep-cycle detector |
| `phase4-t8-exec` | `docs/coordination/territorial-manifests/phase4-t8-exec.txt` | MB-T-WIREFRAME-T8-COST-METER WB2+ continuation |
| `phase4-t9-exec` | `docs/coordination/territorial-manifests/phase4-t9-exec.txt` | MB-T-WIREFRAME-T9-PLAN-TIMER WB2+ continuation |

### §4.2.1 — Round 11 first-cohort sibling-session commits (referenced in §1.5-§1.7)

| Commit | Session | Artifact | Section above |
|---|---|---|---|
| `759b65e` | r11-manifest-validator | `docs/coordination/manifest-validator-report.md` | §1.5 (Tier 1 fabricated FORBIDDEN glob) + §1.7 (confidence-label drift) |
| `262cc44` | r11-queue-watcher | `docs/coordination/queue-watcher-report.md` | §1.6 (shared-index race + commit-pathspec mitigation) |
| `72c28fc` | r11-archive-writer (this session) | `docs/cairn-under-stress-round-11.md` | This document |

### §4.3 — Round 9 corpus references (predecessor evidence)

- `docs/cairn-under-stress-round-9.md` — full Round 9 incident corpus, propagation observations, cross-references. §1.1-§1.3 shared-index race class is the immediate motivator for §3.9.
- `docs/FOLLOWUPS.md` rows filed during Round 9 referenced from round-9.md §4.1-§4.3 (Tier 1: cross-session staging contamination + parallel-cairn shared-index race window; Tier 2: monitor regex stale scrollback; Tier 3: α over-conservative concurrent push).

### §4.4 — MEMORY.md primitive references applicable

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
