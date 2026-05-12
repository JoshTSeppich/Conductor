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

| Category (per §3.9.D) | Placeholder anchor | Section to populate |
|---|---|---|
| Queue claim races | dispatch-queue-current.md §3.9.D | §1.1 (when first observed) |
| Stale manifest references | dispatch-queue-current.md §3.9.D | §1.2 (when first observed) |
| Queue authoring bottleneck | dispatch-queue-current.md §3.9.D | §1.3 (when first observed) |
| Dep graph deadlock | dispatch-queue-current.md §3.9.D | §1.4 (when first observed) |
| Manifest-violation false positives | dispatch-queue-current.md §3.9.D | §1.5 (when first observed) |

Sub-sections §1.6+ reserved for incident classes NOT pre-declared (Round 11 emergent categories). Round 9 precedent: §1.4 (monitor regex stale scrollback), §1.7 (CC CLI paste-compression), §1.8 (α false-STALE) — emergent classes are typical and should be expected.

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
