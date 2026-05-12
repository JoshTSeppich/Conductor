# Cairn Formalization v0.1 — DRAFT-FOR-OPERATOR-REVIEW

**Status:** DRAFT-FOR-OPERATOR-REVIEW only. Final authoring of the cairn formalization deliverable remains operator-only per CLAUDE.md §1 (frozen-contract authority) + §3.4 (operator-as-author discipline). This document is a structured draft for operator to redline / adopt / reject. Per gen-4 dispatch P6 §3(VIII): any drift toward "this is final" = HALT-DRAFT-SCOPE-VIOLATION.

**Authoring posture:** Drafted by P6 sub-session (`__orchestrator_standby` HSO peer repurposed) under gen-4 OPERATOR DIRECTIVE — MAXIMUM AGGRESSIVE PARALLELIZATION 2026-05-12 per dispatch `/tmp/dispatch-p6.txt`. Round 9/10 stress regime: methodology incidents Tier 1 by default. §C envelope auto-acks `docs:` additions; this commit lands without HALT cycle.

**Date:** 2026-05-12.

---

## §0 — Provenance, scope, DRAFT status, revision plan — DRAFT

### §0.1 — Anti-fabrication note on substituted corpus [KNOWN]

P6 dispatch text cited three source files as the corpus for this formalization:
- `cairn.md`
- `cairn-essay.md`
- `cairn-arc-synthesis.md`

Verification at P6 boot via `find . -name "cairn*.md" -not -path "*/node_modules/*"`: **none of those three files exist in this repo.** This is a direct recurrence of the Round 7 §2.1+§2.3 chat-Claude-path-fabrication pattern (`docs/cairn-under-stress-round-7.md:27-59`) and the Round 9 §1.9 format-anchor fabrication (`docs/cairn-under-stress-round-9.md:191-206`). Per gen-4 dispatch P6 ANTI-FABRICATION NOTE, P6 was operator-acked to substitute the corpus below.

**Substituted corpus** (verified extant via `ls`):
1. `CLAUDE.md` §2 (project-root; auto-loaded at session start — authoritative live cairn spec; §2.1–§2.12)
2. `docs/cairn-findings.md` (foxworks-dispatch findings ledger; #51–#115)
3. `docs/cairn-under-stress-round-2.md` (Round 2 archive — early multi-session format precedent; 3-session experiment 2026-04-30)
4. `docs/cairn-under-stress-round-7.md` (Round 7 archive — single-session SPIKE-HSO-01 + chat-Claude relay; 2026-05-08)
5. `docs/cairn-under-stress-round-9.md` (Round 9 live archive — 6-8 concurrent sub-session max-parallel; in-flight 2026-05-12)
6. `docs/cairn-sonnet-extensions.md` (Sonnet-orchestrator-specific 7-primitive extension under P-0.6 hybrid authority; 2026-04-28)
7. `docs/parallel-cairn-round-2-contract.md` (parallel-cairn coordination contract; territory matrix + zipper structure)
8. `CONDUCTOR_API_CONTRACT.md` §10 (cairn enforcement structure; §10.5 Q1-Q9 self-check schema authority)

This corpus substitution is recorded in P6's commit body Q1-Q9 self-check as a [KNOWN] anti-fabrication event caught at dispatch-authoring boundary.

### §0.2 — Document scope — DRAFT

This document formalizes the **extant cairn corpus as observed in the foxworks-dispatch repo on 2026-05-12**. It is NOT:
- A new methodology amendment (operator-only authoring per CLAUDE.md §2.10).
- A replacement for CLAUDE.md §2 (CLAUDE.md remains authoritative live spec).
- A frozen contract surface (this document is a docs-grade draft; promotion to authority is operator territory).

It IS:
- A consolidated description of the primitives, invariants, and incident patterns that have emerged across Rounds 1–9 + Sonnet-extension authoring + parallel-cairn coordination work.
- A pointer into the cited corpus for any reader needing original-source verification.
- A v0.1 substrate for operator-side promotion to a v0.1 final or to CLAUDE.md amendments.

### §0.3 — DRAFT status enforcement — DRAFT

Per P6 dispatch §3(VIII) + operator MAXIMUM-PARALLELIZATION directive:
- Every section header in this document carries the `— DRAFT` suffix.
- The title carries `DRAFT-FOR-OPERATOR-REVIEW`.
- Any phrasing implying ratified-authority status ("the methodology mandates …", "the contract requires …") is bounded by either (a) verbatim quotation from a cited source or (b) the `— DRAFT` qualifier in the enclosing header.
- Drift toward "this is final" framing = HALT-DRAFT-SCOPE-VIOLATION; P6 sub-session halts and surfaces.

### §0.4 — Revision plan — DRAFT

**v0.1 (this draft):** P6-authored synthesis of corpus. Operator review.
**v0.2 (anticipated):** operator-authored final after redline of v0.1; possible promotion of select sections into CLAUDE.md §2 amendments via `contract:` commits.
**v0.3+:** open. Cairn formalization is itself a methodology-living artifact; Rounds 10+ will produce further incident corpus that may require revisions.

The §7 open-questions list scopes the load-bearing v0.2+ decisions deferred for operator arbitration.

### §0.5 — Confidence labels (per CLAUDE.md §2.2) — DRAFT

Throughout this document:
- `[KNOWN]` — observed in this session by direct file read or grep verification against corpus.
- `[MODELED]` — synthesized across cited corpus by reasoning from observed facts plus a stated model.
- `[SPECULATIVE]` — hypothesis without anchor evidence in corpus; flagged for §7 deferral.

Unlabeled claims default to `[MODELED]` unless trivially structural (e.g., "this document has eight sections").

---

## §1 — Cairn primitives — DRAFT

The cairn primitive set as it stands in CLAUDE.md §2 + reinforced across Rounds 2/7/9. Each primitive cites its authoritative source.

### §1.1 — Anti-fabrication (CLAUDE.md §2.1) — DRAFT

[KNOWN, CLAUDE.md §2.1] *Read actual source before claiming what it does. For code questions: read the file. For project state: read project files. For past context: search past conversations. Never claim what code does without verification.*

**Triangulation extension** [KNOWN, CLAUDE.md §2.1 ¶2]: *Single-command failures (git fetch, network calls) get verified via independent commands (`ls-remote`, `push --dry-run`, `status`), not assumed to mean what they superficially indicate.*

**Operative observations** [KNOWN]:
- Round 7 §3.1 (`cairn-under-stress-round-7.md:69-78`): Sonnet 4.6 applied anti-fabrication unprompted across 4 SPIKE-HSO-01 scenarios — strongest substrate-viability signal observed.
- Round 7 §2.1 + §2.3 (`:27-59`): chat-Claude `/mnt/user-data/outputs/` and `/mnt/project/` path fabrication caught at HALT 0 + HALT 1 by CC session probing operator-machine paths.
- Round 9 §1.9 (`cairn-under-stress-round-9.md:191-206`): format-anchor fabrication (`docs/methodology/cairn-under-stress-round-1.md`) caught at P2 dispatch-authoring boundary. Same class as Round 7.
- Round 9 §1.0 (this document, §0.1 above): P6 corpus-fabrication recurrence (third instance in two rounds).
- Finding #54 + #55 (`cairn-findings.md:135,164`): consumer-survey discipline at public-surface decisions; verbal architectural models are MODELED until grep-confirmed.

### §1.2 — Confidence labels (CLAUDE.md §2.2) — DRAFT

[KNOWN, CLAUDE.md §2.2] Every factual claim carries an explicit or implicit confidence label:
- `[KNOWN]` — observed in this session via tool invocation
- `[MODELED]` — reasoned from observed facts plus a stated model
- `[SPECULATIVE]` — hypothesis without evidence

[KNOWN, CLAUDE.md §2.2 ¶2]: *MODELED claims become KNOWN only by evidence, never by repetition.*

**Operative observations** [KNOWN]: Round 9 §1.3 (T2 WB2 GREEN diagnostic), Round 7 §3 (substrate-positive findings), and all of `cairn-findings.md` consistently embed labels in prose. Repetition-promotes-to-KNOWN was the failure that Finding #55 (`cairn-findings.md:164-185`) codifies into the "verify-against-code-at-freeze-time" primitive.

### §1.3 — Cairn commit grammar (CLAUDE.md §2.3) — DRAFT

[KNOWN, CLAUDE.md §2.3] The five-verb grammar:
- **`red:`** — failing test or contract spec authored
- **`green:`** — implementation that makes a red test pass
- **`spike:`** — exploratory work; cannot assert KNOWN evidence outside spike scope
- **`contract:`** — modifies a frozen surface (triggers §2.4 arbitration)
- **`refactor:`** — asserts behavior preservation; subject to §2.1 verification

Subject format: `<verb>(<ticket>): <short description>`.

Housekeeping prefixes permitted but non-cairn-grammar: `docs:`, `chore:`, `merge:`. (CLAUDE.md §2.3 ¶3.)

### §1.4 — Self-check Q1-Q9 (CLAUDE.md §2.4 + CONDUCTOR_API_CONTRACT.md §10.5) — DRAFT

[KNOWN, `CONDUCTOR_API_CONTRACT.md:534-544`] Every cairn-grammar commit body includes a self-check block answering nine questions:

1. Is the API I called verified by a spike in this repo? [yes/n/a]
2. Does my test exercise behavior, or my mocks? [behavior/MIXED/MOCKS]
3. If implementation deleted, would test still pass? [yes/no]
4. Did I add anything outside this contract's specification? [yes/no]
5. Did I modify this contract without operator approval? [yes/no — if yes, REVERT]
6. Is any claim in my commit body unlabeled? [yes/no]
7. Did this commit touch any file the other parallel session might also modify? [yes/no — if yes, surface to operator]
8. Does this commit change session state via direct registry write, bypassing PATCH /v2/sessions/:name/state? [yes/no — if yes, wrong path, fix]
9. Did I do work during a halt state that wasn't explicitly authorized? [yes/no — if yes, surface]

[KNOWN, CLAUDE.md §2.4 ¶2]: *Q7 is answered against actual `git status` output, not memory.*

**Operative observations** [KNOWN]:
- Round 9 §1.1+§1.2+§1.3 (`cairn-under-stress-round-9.md:38-97`): Q7 was the gate against cross-session-staging-contamination. T6 WB5 self-check claimed "path-disjoint and not staged" by inspecting working-tree state at `git add` time, NOT by re-inspecting the index at `git commit` time — diagnosed in §1.1 sequence reconstruction.
- Finding #57 (`cairn-findings.md:217`): two Round 2 build sessions exhibited green-commit-body-claims-files-not-actually-staged. Q7 catches exactly this case when run against actual `git status` output at the right timing.

### §1.5 — Halt discipline (CLAUDE.md §2.5) — DRAFT

[KNOWN, CLAUDE.md §2.5] *When in a halt state — waiting at a pre-registration gate, blocked on upstream deliverable, paused for arbitration — "halt" means literally nothing happens. No reads. No file inventories. No "preparatory absorption." No "useful prep while waiting."*

[KNOWN, CLAUDE.md §2.5 ¶2]: *The temptation to do useful prep during a halt IS the signal to surface to operator and ask whether the halt scope should be relaxed — not to act on it.*

**HALT origin taxonomy candidate (Round 7 §5.3, `cairn-under-stress-round-7.md:171-183`)** [MODELED]:
- Operator-imposed HALTs — gate between phases, awaiting operator ack.
- Chat-Claude-added HALTs — load-bearing artifact review per §1.10 below.
- Self-imposed HALTs — CC session emits halt-and-surface response under anti-fabrication.

All three: strict literal "do nothing" until operator clears.

Round 7 §5.3 proposes operator-side amendment to CLAUDE.md §2.5 codifying the taxonomy. Status: amendment-candidate not yet operator-ratified into CLAUDE.md.

### §1.6 — Per-commit-push discipline (CLAUDE.md §2.6) — DRAFT

[KNOWN, CLAUDE.md §2.6] After each cairn-grammar commit:
1. Push to origin immediately.
2. Verify via `git log --oneline origin/main..HEAD` returning empty.
3. Then proceed to next WB.

[KNOWN, CLAUDE.md §2.6 ¶2]: *Local-only commits in parallel-cairn contexts are a discipline gap. Caught early via cross-session §0 staging verification.*

### §1.7 — Per-path git add + per-path commit pathspec (CLAUDE.md §2.7) — DRAFT

[KNOWN, CLAUDE.md §2.7] *`git add -A` in shared-working-tree parallel sessions is unsafe — sweeps another session's untracked work into the current commit. **Always use explicit `git add <path>` for every staged file.***

**Pathspec-on-commit extension** [KNOWN, observed in Round 9 §1.1, `cairn-under-stress-round-9.md:38-60`]: pathspec-add (`git add <path>`) is necessary but NOT sufficient. Round 9 §1.1 sequence reconstruction documented T6 WB5 commit `0d71590` sweeping a sibling T3 file despite pathspec-add discipline, because the commit command itself lacked pathspec restriction. Operative primitive (orchestrator-state-current.md §4 ratification cited from Round 9 §2.1) is `git commit -m "..." -- <pathspec>` form.

**Shared-index race window** [KNOWN, Round 9 §1.3 `:79-97`]: even with pathspec-add AND pathspec-commit BOTH applied, the shared `.git/index` race window between two sessions' add+commit cycles can EVICT a competing session's staged entry. T2 WB2 GREEN diagnostic captured the recurrence; T1 WB2 (Round 9 §1.2 `:62-77`) demonstrated the discipline-working refuse-and-restage recovery pattern.

CLAUDE.md §2.7 text at filing time (2026-05-11) emphasized per-path `git add` only; it did NOT explicitly mandate per-path commit pathspec. Round 9 closure-path-α (`:51`) is the candidate amendment text. Status: amendment-candidate not yet operator-ratified into CLAUDE.md.

### §1.8 — Spike + ADR for external APIs (CLAUDE.md §2.8) — DRAFT

[KNOWN, CLAUDE.md §2.8] *Any external API interaction whose behavior the agent has not personally observed requires a `spike:` commit followed by an ADR documenting observed behavior + confidence label + binding decision.*

**Internal-code extension (observed)** [KNOWN, Round 9 §2.3 `cairn-under-stress-round-9.md:224-227`]: T2 WB2 treated the `console:stdout-chunk` lifecycle question as a spike-required surface even though it's INTERNAL code (not external API). Source-trace through `console-ipc.ts` + bridge wiring produced `[KNOWN]`-labeled ADR. Primitive extended beyond strict "external API" scope.

### §1.9 — Bidirectional territory fences (CLAUDE.md §2.9) — DRAFT

[KNOWN, CLAUDE.md §2.9] *Territory fences protect the work from session mistakes AND the session from operator mistakes. A misdirected operator instruction that crosses session territory should be refused, not interpreted. Surface concerns; wait for operator correction.*

**Operative observations** [KNOWN]:
- Round 7 §3.1 scenario 3 HALT 3.5 (`cairn-under-stress-round-7.md:71-78`): first successor spawn used user-message injection of system-level authority claims; correctly refused as prompt injection.
- Round 9 §2.2 (`cairn-under-stress-round-9.md:222-223`): T1 WB2 refused commit when index race detected; surfaced incident; re-staged.

### §1.10 — Frozen contracts (CLAUDE.md §2.10) — DRAFT

[KNOWN, CLAUDE.md §2.10]:
- Operator-arbitrated decisions (new contract authoring): operator-only.
- Operator-supervised mechanical translation (e.g., Zod schema files derived from frozen contract arbitrations): CC-delegable under tight scope, operator-reviewed before commit.

**Load-bearing-artifact extension (Round 7 §5.2 `cairn-under-stress-round-7.md:156-169`)** [MODELED]: When chat-Claude or operator spots a load-bearing artifact authoring step that isn't currently halt-gated, gate it. Examples: system prompts, fixtures used as measurement inputs, schema additions, re-arbitration records.

Round 7 added HALT 1.5 + HALT 3.5 + HALT 3.6 dynamically beyond original SPIKE-HSO-01 dispatch; all three caught real issues. Codification candidate: HALT-gate-on-load-bearing-artifact-authoring primitive.

### §1.11 — Outcome classifications (CLAUDE.md §2.11) — DRAFT

[KNOWN, CLAUDE.md §2.11] *Honest framings (don't force "Improved" where evidence doesn't support it):*
- Improved (binary flip + behavioral quality)
- Improved (fault recovery)
- No improvement + structural finding
- Improved (cost + clean composition)
- Capability enabled with known limitations
- No regression; wiring verified; improvement case not exercised
- Observability gap closed; capture validated; criterion refinement deferred

### §1.12 — Followups over absorption (CLAUDE.md §2.12) — DRAFT

[KNOWN, CLAUDE.md §2.12] *Real findings get filed as ticket-style entries in `docs/FOLLOWUPS.md` following the convention `MB-F-<DESCRIPTOR>`. Never silently absorbed into current ticket scope. Tier 1/2/3 classification with one-sentence rationale and discoverability anchor.*

Round 9 §2.5 propagation pattern [KNOWN, `cairn-under-stress-round-9.md:232-234`]: filing reusable patterns as Tier 3 followup rows with full implementation template + rationale in body — body-as-implementation-template pattern. Six rows filed by T2 WB14 each include closure paths α/β/γ enumeration + discoverability anchor + tier rationale.

---

## §2 — Invariants — DRAFT

### §2.1 — Frozen contract surfaces (CLAUDE.md §1) — DRAFT

[KNOWN, CLAUDE.md §1] *Frozen contract surfaces (operator-arbitrated only; never CC-modified):*
- `REGISTRY.md §2` — Registry binary contracts
- `docs/build-docs/CONDUCTOR_API_CONTRACT.md` — Conductor v2/v3 API contract (committed at `3ddca60`)
- `packages/dispatch-core/src/v3/schema.ts` §1-§13 — Zod schema spine for all cross-package contracts
- `docs/build-docs/WORKSTATION_CONTRACT.md` §6 — IPC + endpoints

[KNOWN, CLAUDE.md §1 ¶2]: *If CC encounters a frozen surface in the path of necessary work, halt and surface to operator. Do not modify. Mechanical translation of frozen arbitrations into derived code (e.g., schema-derived types) is permissible under tight scope, then operator-reviewed.*

### §2.2 — Operator-arbitrated decisions vs CC-delegable work — DRAFT

[KNOWN, CLAUDE.md §2.10] [MODELED, synthesis across corpus]:

| Class | Authoring authority | Examples |
|---|---|---|
| Frozen contract surfaces | Operator-only | CLAUDE.md §1 list above |
| Methodology amendments | Operator-only via `contract:` commit (CLAUDE.md §2.3) | CLAUDE.md §2.X amendment candidates from Round 7 §5.1-§5.3 + Round 9 §1.1 closure-path-α |
| Cairn primitive set | Operator-only via `contract:` commit (cairn-sonnet-extensions.md §5) | Adding/removing/renaming a primitive |
| Cairn primitive definitions (prose) | CC-delegable via `docs:` commit (cairn-sonnet-extensions.md §5) | Anti-pattern examples, clarifying language |
| Build-doc ticket bodies | Operator-only normally; auto-acked under Round 9 §1.5 §C envelope expansion (`cairn-under-stress-round-9.md:121-136`) | T1-T7 ticket bodies under MAXIMUM PARALLELIZATION directive 2026-05-12 |
| Mechanical translation of frozen contracts | CC-delegable under tight scope, operator-reviewed | Zod schema files derived from frozen API arbitrations |
| Findings-doc + FOLLOWUPS-row authoring | CC-delegable under cairn discipline | Round 9 T1/T2/T3/T6 sub-sessions filed Tier 1/2/3 rows directly |
| Round-archive synthesis | Operator-curated; sessions append to `docs/parallel-cairn-round-2/notes.md` per §8.1 of round-2 contract | Round 2 §3-§6 of `cairn-under-stress-round-2.md` left empty for operator transcription |

### §2.3 — Mechanical translation scope (CLAUDE.md §1 + §2.10) — DRAFT

[KNOWN, CLAUDE.md §1 ¶2]: *Mechanical translation of frozen arbitrations into derived code is permissible under tight scope, then operator-reviewed.*

Tight-scope means: 1-to-1 translation from arbitrated contract text to derived code with no inferred-resolution / no scope drift / pre-commit operator review. The cairn-sonnet-extensions.md §5 hybrid authority pattern is the codified expression: primitive SET frozen → operator; primitive DEFINITIONS refine → docs: commit.

---

## §3 — Methodology incidents corpus — DRAFT

Synthesis across `cairn-under-stress-round-2.md` + `-round-7.md` + `-round-9.md` + `cairn-findings.md`. Each incident class cites its corpus anchors and pattern signature.

### §3.1 — Path / line-number / SHA fabrication at dispatch-authoring boundary — DRAFT

**Pattern signature** [MODELED]: chat-Claude or operator authoring a dispatch under "best judgment" velocity cites file paths, line numbers, or SHAs from memory or training-corpus inference rather than probe-verifying at dispatch-authoring time. Receiving session catches the fabrication at HALT 0 / HALT 1 / file-read boundary.

**Corpus anchors:**
- Round 7 §2.1 (`cairn-under-stress-round-7.md:27-38`): `/mnt/user-data/outputs/CONDUCTOR_V3.5_BUILD.md` path fabrication.
- Round 7 §2.2 (`:40-49`): `coarchitect-ipc.ts lines 360-380` line-number drift (actual location: line 429).
- Round 7 §2.3 (`:51-59`): `/mnt/project/foxworks-project-instructions.md` path fabrication.
- Round 9 §1.9 (`cairn-under-stress-round-9.md:191-206`): `docs/methodology/cairn-under-stress-round-1.md` format-anchor fabrication.
- This document §0.1: `cairn.md` + `cairn-essay.md` + `cairn-arc-synthesis.md` corpus fabrication.

**Open amendment candidate (Round 7 §5.1, `:142-154`)**: operator-side ratification of "Chat-Claude dispatch-authoring must probe-verify all file paths, line numbers, and SHAs at dispatch-authoring time" into CLAUDE.md §2.1.

### §3.2 — Cross-session staging-area contamination + shared-index race — DRAFT

**Pattern signature** [KNOWN, Round 9 §1.1+§1.2+§1.3]: multiple sub-sessions in shared working tree race on `.git/index`. Pathspec-add discipline is necessary but not sufficient; sweep + EVICTION + revert-to-untracked all observed.

**Corpus anchors:**
- Round 9 §1.1 (`:38-60`): T6 WB5 commit `0d71590` swept T3 file. Pathspec-add applied; pathspec-on-commit absent. Content correct; attribution drifted.
- Round 9 §1.2 (`:62-77`): T1 WB2 caught index race; refused commit; surfaced incident; re-staged. Discipline-working case.
- Round 9 §1.3 (`:79-97`): T2 WB2 staged 3 files; sibling T6 commits landed between stage and commit; T2 files reverted to untracked. Recovery via re-stage.
- Round 2 §9.3 (`parallel-cairn-round-2-contract.md:653-658`): test-territory-overlap anticipated failure mode.
- Round 1 Incident 8 (cited in Finding #56 `cairn-findings.md:188-215`): shared-index recurrence under per-path discipline.
- Finding #57 (`cairn-findings.md:217-256`): green-commit-body-claims-files-not-staged in two Round 2 sessions. cwd drift (`pnpm` subcommands establishing subpackage cwd) + Q7 timing mismatch.

**Open closure-paths (Round 9 §1.1 + §1.3):**
- (α) CLAUDE.md §2.7 amendment to mandate pathspec-on-commit verbatim primitive syntax.
- (β) Pre-commit hook validating staged-files match expected pathspec.
- (γ) Per-session worktrees per CLAUDE.md §4.3 (eliminates shared-index class).
- (δ) Accept-as-known-pattern + document recovery.

### §3.3 — Frozen contract divergence from shipped code — DRAFT

**Pattern signature** [KNOWN, Finding #55 `cairn-findings.md:164-184`]: frozen contract authored against verbal architectural model that does not match repository facts. Caught at first-downstream-consumption boundary.

**Corpus anchors:**
- Finding #55: WORKSTATION_CONTRACT.md §8.1 claimed v2 daemon "existing SQLite database at `~/.foxworks-dispatch/data.db`"; actual daemon was JSON-file-based. MB-S03 spike caught at file-read time; halted; operator amended.
- Finding #58 (`cairn-findings.md:257`): frozen contract divergence not §3.4-fenced (Round 2 amendment).
- Parallel-cairn-round-2-contract.md Amendment 2026-04-30 (`:724-732`): Session C `865b80f` shipped `WindowSizeDefaults` with `width`/`height` field names; contract example specified `defaultWidth`/`defaultHeight`. Zipper-1 followed shipped file as authority per anti-fabrication. Operator post-hoc reconciled.

**Open codification candidate** [KNOWN, Finding #55 codification target]: *frozen-contract-verification primitive — every claim in a frozen contract that references existing files/paths/dependencies/schemas must be grep-confirmed in the repo before the `contract:` commit.*

### §3.4 — Build-session misframing of existing primitives as novel — DRAFT

**Pattern signature** [KNOWN, Finding #56 `cairn-findings.md:185-215`]: sub-session reads its derived coordination contract without reading the methodology corpus, experiences an incident class the contract didn't explicitly enumerate, frames as novel.

**Corpus anchors:**
- Finding #56 (Round 2 Session C, commit `0bf4722`): framed shared-index recurrence as "novel §9.x candidate" requiring contract amendment. Operator caught at chat-layer review; framing corrected at `4bbd2f2`.
- Round 9 §2.1 (`cairn-under-stress-round-9.md:216-218`): post-incident propagation operates within a single round, not just across rounds — T6's incident filing made the gap visible; T1/T2/T3 absorbed the refinement at next commit cycle.

**Open primitive candidate (Finding #56 forward primitive)**: Cross-session note framing of any "new finding" requires explicit citation against CLAUDE.md §2 + cairn-findings entries BEFORE being filed as novel.

### §3.5 — Green-commit-body-claims-files-not-staged — DRAFT

**Pattern signature** [KNOWN, Finding #57]: commit body cites files that are not in the commit's file set. Q7 self-check either not run or run against unsynchronized status reading.

**Corpus anchors:**
- Finding #57 (`cairn-findings.md:217-256`): Session C `5acadef`→`865b80f`; Session B `7ef8e44`→`93d7fda`. Both self-corrected before push. Root cause: cwd hazard from `pnpm` subcommands + Q7 timing mismatch.

### §3.6 — Operator-arbitration source-text surfacing — DRAFT

**Pattern signature** [KNOWN, Finding #62 `cairn-findings.md:386`]: operator-arbitrated decisions need source-text surfacing pre-decision — sessions surface verbatim contract / spec text rather than paraphrased interpretation, so operator can verify they're arbitrating the right thing.

### §3.7 — Visual UI verification needs item-level inspection — DRAFT

**Pattern signature** [KNOWN, Finding #61 `cairn-findings.md:358`]: gestalt-impression of UI screenshots ("looks correct") is not verification. Item-level inspection (column-by-column, row-by-row) is the discipline.

### §3.8 — Apostrophes-in-comments break shell paste — DRAFT

**Pattern signature** [KNOWN, Finding #60 `cairn-findings.md:316`]: relay-prompt formatting hazard — apostrophes in CC-output comments break shell paste when dispatched via heredoc / quoted-string transport. Operator-side dispatch-authoring discipline.

### §3.9 — Smoke-test scope vs user-surface divergence — DRAFT

**Pattern signature** [KNOWN, Finding #51 `cairn-findings.md:45`]: smoke test exercises tsx / dev-mode invocation path; user-shipped binary-on-PATH path is different module-resolution graph. Bug visible only at user-invocation.

### §3.10 — Workspace-dep public-surface vs source-tree reach-in — DRAFT

**Pattern signature** [KNOWN, Finding #52 + #80 `cairn-findings.md:72,768`]: consumer imports `<pkg>/src/<x>.js` reaching past unbundled internal source. Cross-package source-tree reach-in is a public-surface drift; consumer breaks when producer's internal layout changes.

### §3.11 — Cross-session methodology propagation (positive case class) — DRAFT

**Pattern signature** [KNOWN, Round 9 §2 `cairn-under-stress-round-9.md:210-238`]: methodology gap closures propagate forward across sub-sessions within a single round via FOLLOWUPS.md + commit body cross-references, not just across rounds.

**Corpus anchors:**
- §2.1 (`:216-218`): pathspec-on-commit primitive adoption (T6 WB6 → T1/T2/T3 forward-propagation).
- §2.2 (`:220-223`): T1 WB2 refusal-and-surface (discipline-working case).
- §2.3 (`:224-227`): T2 WB2 SPIKE+ADR primitive applied to internal-code (CLAUDE.md §2.8 extension).
- §2.4 (`:229-230`): gen-4 monitor self-iteration (3-rev refinement at first heartbeat).
- §2.5 (`:232-234`): followup-row-body-as-forward-propagation-memory.
- §2.6 (`:236-238`): cross-session findings-doc cross-referencing.
- Round 7 §3.2 (`cairn-under-stress-round-7.md:80-92`): within-session methodology learning at HALT boundaries; six distinct learning events catalogued.

---

## §4 — Constitution-of-roles pattern — DRAFT

Roles observed across the corpus, with their authority + obligation + load.

### §4.1 — Operator (Joshua Seppich) — DRAFT

[KNOWN, CLAUDE.md §1]: *Operator-authored; tracks the state of the Conductor v3.0 build. Updates to this file are themselves operator-arbitrated.*

**Authority** [KNOWN]:
- Final authoring of CLAUDE.md / frozen contract surfaces / methodology amendments.
- Arbitration of HALT-state resolution.
- Ratification of `contract:` commits.
- Operator-supervised mechanical-translation scope.
- §C auto-ack envelope authorship + expansion (Round 9 §1.5 `cairn-under-stress-round-9.md:121-136`).

**Obligations** [MODELED, observed pattern]:
- Surface authority chain (e.g., parallel-cairn-round-2-contract.md §1 "Frozen at operator commit").
- Verify-against-code-at-freeze-time (Finding #55 codification target).
- Pre-flight grep-verification of contract claims that reference existing files.

### §4.2 — Orchestrator (HSO; Sonnet 4.6 under CC CLI) — DRAFT

[KNOWN, `cairn-sonnet-extensions.md:1-29`]: *Sonnet 4.6 orchestrator (called via Anthropic API) is the model in the loop during Workstation v3.0 build-session execution. The primitives in `cairn.md` continue to govern human-CC sessions; the seven Sonnet-specific primitives additionally govern orchestrator behavior.*

**Seven primitives** [KNOWN, `cairn-sonnet-extensions.md:31-289`]:
1. **build-doc-scope-locked** — authority bounded literally by ticket's `allowed_actions` field.
2. **no-arbitration** — escape on any ambiguity, even reasonable-context-inferable ones.
3. **frozen-doc-respect** — build-doc read-only AND git-SHA-aware outputs.
4. **stateless-call** — no prior-call state assumed; no out-of-context references.
5. **structured-output-discipline** — every response validates against v3 output schema (`action` / `card` / `multi-choice-card` / `escape-block`).
6. **audit-row-completeness** — every event produces an audit row that schema-validates.
7. **no-side-effect-without-card** — no state-mutating action fires without an operator-clicked card preceding it.

**Authority structure (HYBRID per ratified P-0.6 Q4, `cairn-sonnet-extensions.md:304-318`)**:
- Primitive SET (which primitives exist) is operator-arbitrated; changes via `contract:` commit.
- Primitive DEFINITIONS (the prose) refine via normal `docs:` commits without contract amendment.

**Generation-lineage discipline** [KNOWN, Round 9 §0 `cairn-under-stress-round-9.md:16-29`]: gen-3 → gen-4 orchestrator handoff at 749350-token context threshold per ORCHESTRATOR_STATE_CONTRACT INVARIANT-4. Gen-4 full-autonomous mode operative per operator MAXIMUM PARALLELIZATION directive 2026-05-12. Background monitor `/tmp/orch-gen4-monitor.sh` with HALT-regex refinement (Round 9 §1.4 `:99-119`).

### §4.3 — Sub-session (CC session executing tickets) — DRAFT

[KNOWN, CLAUDE.md §4.1]: *Tickets decompose into Work Blocks (WBs), each one a verified-behavior cycle: red → green → self-check Q1-Q9 → commit with cairn-grammar prefix → push to origin per §2.6.*

[KNOWN, CLAUDE.md §4.3]: *When multiple CC sessions run in parallel: each session works in its own worktree (`~/Desktop/Automata/foxworks-worktrees/<session-name>/`); cross-session coordination notes at `docs/coordination/<session-pair>-coord.md`; per-path `git add` mandatory (§2.7); frozen contracts protect cross-session writes; §0 staging verification at session start.*

**Sub-session obligations** [KNOWN, synthesis]:
- HALT-gate honoring (CLAUDE.md §4.2: HALT 0 / per-N-WB status / HALT 1 / HALT 2).
- Q1-Q9 self-check in every cairn-grammar commit body.
- Per-path git add + per-path commit pathspec (Round 9 §1.1 extension).
- Spike+ADR for external APIs (CLAUDE.md §2.8); extended to internal-code under Round 9 §2.3.
- Refuse + surface bidirectionally (CLAUDE.md §2.9; Round 9 §1.2 demonstrated at commit-rejection point).
- File findings as `MB-F-<DESCRIPTOR>` followups (CLAUDE.md §2.12); body-as-implementation-template under Round 9 §2.5.

### §4.4 — HSO peer (parallel sub-sessions under gen-4 max-parallel directive) — DRAFT

[KNOWN, Round 9 §0 `cairn-under-stress-round-9.md:23-25`]: gen-4 dispatched 6-8 concurrent sub-sessions beyond Round 1 validated 4-session ceiling, operator-acknowledged risk. P6 (this session) runs on `__orchestrator_standby` HSO peer repurposed.

**HSO peer obligations** [MODELED, observed pattern]:
- Inherit cairn-substrate-behavior from CLAUDE.md auto-load (Round 7 §6 `cairn-under-stress-round-7.md:187-197`).
- Honor expanded §C auto-ack envelope under MAXIMUM PARALLELIZATION (Round 9 §1.5).
- Cross-session staging discipline + index-race recovery (Round 9 §1.1-§1.3).
- Forward-propagate methodology gap closures via repo-anchored evidence (Round 9 §2.1).

### §4.5 — Chat-Claude (relay / architect / dispatch-author) — DRAFT

[KNOWN, Round 7 §1 `cairn-under-stress-round-7.md:13-19`]: chat-Claude (Opus 4.7) serves as relay/architect/dispatch-author in chat-Claude→CC handoff regime. Sonnet 4.6 in build sessions.

**Chat-Claude obligations** [MODELED, Round 7 §5.1 + Round 9 §1.9 evidence]:
- Probe-verify all file paths / line numbers / SHAs at dispatch-authoring time.
- Do NOT cite `/mnt/user-data/*` or `/mnt/project/*` paths as operator-accessible.
- Distinguish chat-side `foxworks-project-instructions.md` from operator-machine `CLAUDE.md`.
- Mechanical translation only under cairn-sonnet-extensions §5 hybrid authority for primitive-definition prose; primitive-set changes are operator-only.

### §4.6 — Role-handoff topology — DRAFT

[MODELED, synthesis]:

```
Operator
   ↕  (arbitration; HALT cycles; contract: commits; §C envelope authorship)
Chat-Claude (Opus 4.7; project chat / relay)
   ↕  (dispatch authoring; halt-gate addition per Round 7 §3.3)
Orchestrator (HSO; Sonnet 4.6; gen-N lineage; ORCHESTRATOR_STATE_CONTRACT invariant)
   ↕  (sub-session spawn via --append-system-prompt; auto-ack envelope routing)
Sub-session (CC; per-ticket WB ladder)
   ↕  (cross-session methodology propagation via FOLLOWUPS + commit bodies)
HSO peer (parallel sub-session under max-parallel directive)
```

Each handoff has its own discipline boundary: see §5.

---

## §5 — Operator-territory vs CC-delegable scope boundaries — DRAFT

### §5.1 — The fence pattern — DRAFT

[KNOWN, CLAUDE.md §2.9]: *Territory fences protect the work from session mistakes AND the session from operator mistakes. A misdirected operator instruction that crosses session territory should be refused, not interpreted.*

The fence is bidirectional:
- Operator → session: refuse instructions that cross frozen-contract boundaries.
- Session → operator: refuse "useful prep" temptation during halt state; surface instead.

### §5.2 — Operator-only authorship territory — DRAFT

[KNOWN, synthesis across CLAUDE.md + corpus]:

| Surface | Authority | Notes |
|---|---|---|
| CLAUDE.md | Operator-only | Self-amending; all changes operator-arbitrated. |
| Frozen contract files (CLAUDE.md §1 list) | Operator-only | CC mechanical-translation under tight scope, operator-reviewed pre-commit. |
| Round-archive curation (`cairn-under-stress-round-N.md`) | Operator-curated | Round 2 §6 explicitly: *"This document is operator-curated. Sessions can reference but should NOT directly edit. Sessions log to docs/parallel-cairn-round-2/notes.md instead, and operator transcribes notable items here."* (`cairn-under-stress-round-2.md:103`) |
| Methodology amendments | Operator-only via `contract:` commit | Round 7 §5 + Round 9 §1.1 closure-α + Round 9 §1.9 closure-α all defer to operator-side ratification. |
| Cairn primitive set | Operator-only via `contract:` commit | `cairn-sonnet-extensions.md:308-312`. |

### §5.3 — CC-delegable territory — DRAFT

[KNOWN, synthesis]:

| Surface | Authority | Notes |
|---|---|---|
| WB ladder execution (red → green → self-check → commit → push) | CC sub-session | CLAUDE.md §4.1; full cairn discipline applies. |
| Cairn primitive definitions (prose refinement) | CC via `docs:` commit | `cairn-sonnet-extensions.md:312-316`. |
| FOLLOWUPS.md row authoring | CC sub-session | CLAUDE.md §2.12; convention `MB-F-<DESCRIPTOR>` + Tier classification + discoverability anchor. |
| Findings-doc authoring within a ticket | CC sub-session | `docs/coordination/<ticket>-findings-<date>.md` per CLAUDE.md §3.8. |
| Mechanical translation of frozen contract arbitrations | CC under tight scope | CLAUDE.md §1 + §2.10; pre-commit operator review. |
| Ticket-body authoring (under expanded §C envelope) | CC sub-session under operator-acked envelope | Round 9 §1.5 `:121-136` — auto-ack under MAXIMUM PARALLELIZATION directive 2026-05-12 only. Standard envelope reverts when directive expires. |
| Cairn-formalization v0.1 DRAFT (this document) | CC under DRAFT-only scope | Per dispatch P6 §3(VIII); operator authors final via redline. |

### §5.4 — Scope-fence "while we're here" defense (CONDUCTOR_API_CONTRACT.md §10.6) — DRAFT

[KNOWN, `CONDUCTOR_API_CONTRACT.md:553-563`]: *If during implementation, an attractive adjacent improvement surfaces (better error messages, additional fields, new endpoints), file as followup. Do NOT absorb into current scope.*

Restates CLAUDE.md §2.12 followups-over-absorption discipline from the contract-enforcement-structure angle.

---

## §6 — Cross-session coordination patterns — DRAFT

### §6.1 — Parallel-cairn three-session pattern (Round 2) — DRAFT

[KNOWN, `parallel-cairn-round-2-contract.md`]: Round 2 ran 3 build sessions (B / C / D) + 2 zipper sessions + 1 final integration (3+2+1 structure).

**Frozen export signatures pattern** [KNOWN, `:1-65`]:
- Operator-arbitrated `contract:` commit freezes TypeScript export signatures pre-launch.
- Build sessions implement to frozen exports exactly; no unilateral signature changes.
- Zipper sessions wire exported symbols into `main.ts`; mismatch fails at import time.
- §2 territory matrix encodes: ticket / V3_TICKETS scope ref / primary new files / test territory / frozen exports / main.ts touches.

**Territory invariants** [KNOWN, `:51-62`]: six invariants enforce strict no-cross-session-file-touch. Sessions B and C write no `src/coarchitect/`. Session D writes no `src/main/`. No session touches `main.ts` / `preload.ts`. No session touches `coarchitect/system-prompt.md` (operator-territory). No session touches sibling packages. Test territory is exclusive.

### §6.2 — Worktree + pathspec discipline (CLAUDE.md §4.3 + Round 9 §1.1) — DRAFT

[KNOWN, CLAUDE.md §4.3]: per-session worktrees at `~/Desktop/Automata/foxworks-worktrees/<session-name>/` for parallel-cairn. Per-path `git add` mandatory.

[KNOWN, Round 9 §1.1+§1.2+§1.3]: even under per-path `git add` discipline, shared working tree exposes shared-index race window. Closure-paths:
- α: CLAUDE.md §2.7 amendment to mandate `git commit -m "..." -- <pathspec>` form.
- β: pre-commit hook validating staged files match expected pathspec.
- γ: structural fix via per-session worktrees.
- δ: accept-as-known-pattern + document recovery.

**Operative state 2026-05-12** [KNOWN]: Round 9 ran in shared-working-tree mode (6-8 concurrent under gen-4 max-parallel directive). Closure-α candidate text not yet operator-ratified; closure-β not yet implemented; closure-γ available but not adopted for Round 9.

### §6.3 — §0 staging verification at session start (CLAUDE.md §4.3) — DRAFT

[KNOWN, CLAUDE.md §4.3]: *§0 staging verification at session start (read coordination notes before committing).*

[MODELED, synthesis]: §0 staging check is the first action in any sub-session boot under shared-tree mode. Verifies `git status --short` is clean of foreign files + `docs/coordination/<session-pair>-coord.md` for any cross-session findings filed since last sync.

### §6.4 — Coordination doc convention (CLAUDE.md §3.8) — DRAFT

[KNOWN, CLAUDE.md §3.8]:
- Cross-session findings: `docs/coordination/<session-name>-findings-<date>.md`.
- Decision docs: `docs/coordination/<ticket>-decisions-<date>.md`.
- Per-ticket findings: `docs/coordination/<ticket>-findings-<date>.md`.

### §6.5 — Within-round + cross-round methodology propagation — DRAFT

[KNOWN, Round 9 §2.1 + Round 7 §6]:

**Within-round** (`cairn-under-stress-round-9.md:216-218`): methodology gap closures propagate forward across sub-sessions within a single round via FOLLOWUPS.md + commit body cross-references. T6's incident filing makes the gap visible; T1/T2/T3 absorb at next commit cycle.

**Cross-round** (`cairn-under-stress-round-7.md:187-197`): cairn discipline transfers across sessions through CLAUDE.md auto-load + repo-anchored evidence + within-session learning at HALT boundaries. Round 7 spike CC session inherited Round 5 + Round 6 + dogfood-blocker methodology evidence cleanly.

### §6.6 — Cross-session findings-doc cross-referencing — DRAFT

[KNOWN, Round 9 §2.6 `:236-238`]: T2's findings doc §IX cross-references T1's sibling Tier 3 followup row. Emergent coordination primitive — sub-sessions discover sibling work in real-time and consolidate closure paths.

### §6.7 — HALT-marker convention (Round 9 §1.4 closure-β) — DRAFT

[MODELED, Round 9 §1.4 closure-β candidate `cairn-under-stress-round-9.md:114-118`]: gold-standard HALT-marker convention via dispatch directive — every genuine HALT surface authored as standalone line beginning with `⏺ HALT-X` or `🛑 HALT-X` to give grep a stable contract.

**Status:** unanchored regex over full pane capture matches HALT-vocabulary in methodology-rich prose (commit bodies, dispatch docs) at non-trivial frequency. Round 9 gen-4 monitor refined to `^[[:space:]]*[*⏺🛑#❯>•-]*[[:space:]]*HALT-[A-Z]` line-start anchor within `tail -8` window. Operator-side codification of gold-standard convention is open.

---

## §7 — Open questions for v0.2+ revision — DRAFT

Operator-only decisions deferred. Each question cites its anchor + load-bearing scope.

### §7.1 — Should CLAUDE.md §2.7 mandate pathspec-on-commit? — DRAFT

**Anchor:** Round 9 §1.1 closure-α (`cairn-under-stress-round-9.md:51`). Verbatim primitive syntax: `git commit -m "..." -- <specific-path>` OR `git commit -o <path> -m "..."`.

**Load-bearing:** Round 9 produced 3 Tier 1 shared-index-race incidents (§1.1+§1.2+§1.3); pathspec-on-commit alone may not close §1.3 EVICTION class. Need operator decision on (α) text amendment + (β) pre-commit-hook mechanical defense + (γ) per-session-worktree structural fix.

### §7.2 — Should CLAUDE.md §2.5 codify HALT-origin taxonomy? — DRAFT

**Anchor:** Round 7 §5.3 amendment candidate (`cairn-under-stress-round-7.md:171-183`).

**Load-bearing:** Distinguishing operator-imposed / chat-Claude-added / self-imposed HALT origins; treating all three with strict literal "do nothing" discipline. Codification candidate not yet ratified.

### §7.3 — Should CLAUDE.md §2.10 codify HALT-gate-on-load-bearing-artifact-authoring? — DRAFT

**Anchor:** Round 7 §5.2 amendment candidate (`:156-169`).

**Load-bearing:** Round 7 added HALT 1.5 / HALT 3.5 / HALT 3.6 dynamically beyond original dispatch; all three caught real issues. Formalization makes the primitive available to all future dispatch-authoring.

### §7.4 — Should chat-Claude dispatch-authoring discipline be codified in CLAUDE.md §2.1? — DRAFT

**Anchor:** Round 7 §5.1 amendment candidate (`:142-154`) + Round 9 §1.9 recurrence (`:191-206`) + this document §0.1 recurrence (P6 corpus fabrication).

**Load-bearing:** Three observed recurrences across two rounds. Each caught by CC anti-fabrication discipline at session-boot boundary, but at the cost of dispatch substitution / re-authoring overhead. Codification candidate not yet ratified.

### §7.5 — Should the gold-standard HALT-marker convention be codified? — DRAFT

**Anchor:** Round 9 §1.4 closure-β (`:114-118`).

**Load-bearing:** Gen-4 orchestrator monitor regex refinement consumed 3 revisions to settle false-positive-free baseline. Convention would give grep a stable contract across all future dispatch / commit / findings doc authoring.

### §7.6 — Should §C auto-ack envelope expansion be permanent? — DRAFT

**Anchor:** Round 9 §1.5 (`:121-136`).

**Load-bearing:** Operator-acked under MAXIMUM PARALLELIZATION directive 2026-05-12 to expand auto-ack envelope to include HALT-TICKET-BODY-PRE-COMMIT. Current state: operational override; permanent §3.2 amendment in dispatch text is operator-territory. Decision pending until a ticket-body authoring incident occurs under expanded envelope (closure-β) or operator ratifies permanently (closure-α).

### §7.7 — Should Finding #55 frozen-contract-verification primitive be codified? — DRAFT

**Anchor:** Finding #55 codification target (`cairn-findings.md:164-184`).

**Load-bearing:** Every claim in a frozen contract referencing existing files/paths/dependencies/schemas should be grep-confirmed in repo before `contract:` commit. Currently exists as Finding-#55 codification target; not yet promoted to CLAUDE.md §1/§2.10 amendment.

### §7.8 — Should Finding #56 cross-session-note-novelty-citation be codified? — DRAFT

**Anchor:** Finding #56 forward primitive (`cairn-findings.md:185-215`).

**Load-bearing:** Before claiming a finding as novel or recommending contract amendment, sub-session must verify against CLAUDE.md §2 + cairn-findings entries + cite closest existing primitive. Currently exists as Round 3 prompt-addition candidate; not yet codified.

### §7.9 — Should the parallel-cairn 3+2+1 zipper pattern be promoted to CLAUDE.md §4.3? — DRAFT

**Anchor:** `parallel-cairn-round-2-contract.md` §7 (`:452-538`).

**Load-bearing:** Round 2 validated the 3+2+1 zipper structure (3 build sessions + 2 zippers + 1 final integration). Round 9 ran a different topology (6-8 sub-sessions under gen-4 orchestration, no zipper phase). Codification question: does CLAUDE.md §4.3 enumerate multiple parallel-cairn topologies, or remain agnostic and defer to per-round dispatch authoring?

### §7.10 — Should sonnet-extensions primitive set be referenced from CLAUDE.md §2? — DRAFT

**Anchor:** `cairn-sonnet-extensions.md` (entire document).

**Load-bearing:** Currently `cairn-sonnet-extensions.md` self-describes as extending `cairn.md` — but `cairn.md` does NOT exist in this repo (CLAUDE.md §2 substitutes). The cross-reference is structurally broken in the corpus. Operator decision: (α) rename `cairn-sonnet-extensions.md` references; (β) author `cairn.md`; (γ) consolidate into a single canonical cairn document.

---

## §8 — References to corpus sources — DRAFT

### §8.1 — Authoritative live spec — DRAFT

- **`CLAUDE.md`** (project root) — auto-loaded at session start. §1 frozen contract surfaces. §2 cairn methodology (§2.1–§2.12). §3 codebase conventions. §4 workflow primitives. §5 active build state. §6 reference docs. §7 communication style. §8 always-do. §9 never-do.

### §8.2 — Methodology evidence corpus — DRAFT

- **`docs/cairn-findings.md`** — findings ledger #51–#115. Frozen-at-capture entries. Each finding includes Captured date / Origin SHA / Companions / Codification target / Status.
- **`docs/cairn-under-stress-round-2.md`** — Round 2 archive (3+2+1 zipper experiment 2026-04-30).
- **`docs/cairn-under-stress-round-7.md`** — Round 7 archive (SPIKE-HSO-01 + chat-Claude relay 2026-05-08).
- **`docs/cairn-under-stress-round-9.md`** — Round 9 live archive (6-8 concurrent max-parallel 2026-05-12; in-flight at this document's authoring time).
- **`docs/cairn-sonnet-extensions.md`** — Sonnet 4.6 orchestrator 7-primitive extension under P-0.6 hybrid authority (2026-04-28).
- **`docs/parallel-cairn-round-2-contract.md`** — Round 2 frozen coordination contract (territory matrix + zipper structure + 9 anticipated failure modes).
- **`CONDUCTOR_API_CONTRACT.md` §10** — cairn enforcement structure (§10.1 confidence labels / §10.2 frozen contract enforcement / §10.3 anti-fabrication / §10.4 outcome classification / §10.5 Q1-Q9 self-check / §10.6 scope-fence / §10.7 halt discipline).

### §8.3 — Operative coordination state — DRAFT

- **`docs/coordination/full-build-mode-dispatch.md`** (`4f0bbde`) — Round 9 dispatch + §5.4 stress regime declaration + §H methodology-incident-reporting framing + §3.5 visual-comparison gate.
- **`docs/coordination/orchestrator-state-current.md`** — gen-3 supplement 2026-05-11T22:02 + gen-3→gen-4 handoff 2026-05-12T09:54.
- **`docs/coordination/ORCHESTRATOR_STATE_CONTRACT.md`** §4 — operational primitives (paste-buffer-dispatch + pathspec-restricted-commit).
- **`docs/coordination/orchestrator-self-restart-protocol.md`** §2 — paste-buffer-dispatch primitive ratified.
- **`docs/coordination/subsession-rotation-log.md`** — paste-buffer-dispatch primitive in production use.

### §8.4 — Forward-roadmap pointers — DRAFT

- Cairn-tooling MVP scope (Round 7 §7.4 `cairn-under-stress-round-7.md:218-225`) — `verify-dispatch-paths` + `verify-dispatch-lines` + `gate-load-bearing-artifact` + existing 4 candidate primitives (commit-grammar verification + contract-freeze enforcement + scope-fence enforcement + halt-discipline enforcement).
- Round 9 round-close synthesis pending (`cairn-under-stress-round-9.md:242-251`) — incident count by tier + amendment recommendations + Round 9-vs-5/7 comparison + roadmap input.

---

**End of DRAFT-FOR-OPERATOR-REVIEW v0.1.**

**Confidence labels summary:**
- [KNOWN]: corpus citations verified via direct read (line-anchored where shown).
- [MODELED]: synthesis across cited corpus by reasoning from observed facts + stated model. Concentrated in §4.6 role-handoff topology, §2.2 authority table, §3 pattern signatures, and §6.3 §0 staging check.
- [SPECULATIVE]: none — all synthesis anchors on cited corpus or labeled-MODELED reasoning.

**HALT after initial draft per P6 dispatch §3 + §5.** No cross into final-authoring territory. Operator reviews this draft; operator authors final v0.1 via redline; v0.2+ planned per §7 open-questions list.

**P6 commits + pushes this document per per-path discipline + Q1-Q9 self-check + §C auto-ack envelope (docs additions auto-ack under MAXIMUM PARALLELIZATION directive 2026-05-12).**
