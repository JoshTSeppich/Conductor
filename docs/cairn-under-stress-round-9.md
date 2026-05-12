# Cairn Under Stress — Round 9 Live Evidence Archive

**Round shape:** Maximum-parallel-intensity (6-8 concurrent sub-sessions) Round 9 cascade per operator directive 2026-05-12 MAXIMUM PARALLELIZATION. Multi-generation orchestrator lineage (gen-3 → gen-4). Round 9 cairn-under-stress regime per `docs/coordination/full-build-mode-dispatch.md` (`4f0bbde`) §5.4: methodology incidents file Tier 1 by default.

**Round started:** 2026-05-11T18:57:30Z (gen-3 boot) → 2026-05-12T09:54Z (gen-4 handoff at 750k threshold) → continuing under gen-4 (orchestrator-2026-05-12-0953) full-autonomous mode.

**Authoring posture:** Live archive populated in real-time by P2 sub-session (this session) per gen-4 dispatch 2026-05-12. Commits per substantive content addition; not single-end-of-round drop.

**Format anchors:** `docs/cairn-under-stress-round-7.md` (extant; latest round before this; format anchor) + `docs/cairn-under-stress-round-2.md` (extant; earlier methodology-incident-classification precedent).

**Anti-fabrication note** [KNOWN]: dispatch text cited `docs/methodology/cairn-under-stress-round-1.md` + `docs/methodology/cairn-arc-synthesis.md` as format anchors. Verified via `find docs -name "*.md"` — neither exists; the `docs/methodology/` subdir does not exist. Substituted to extant format anchors above and surfaced this drift to P2's sub-session prompt (operator-acked at P2 dispatch authoring time).

---

## §0 — Round abstract

[KNOWN per dispatch + orchestrator-state-current.md §11-§12]:

**Conditions at round start:**
- Generation-3 orchestrator (`orchestrator-2026-05-11-1257`) declared Round 9 at `c32906e` (§11.7 supplement, 2026-05-11T22:02) per dispatch §5.4 + §8 state-instance update requirement.
- Phase 0 closed at `e543494`; Phase 1 entered. 4 ticket-authoring sub-sessions dispatched in parallel (T1 / T2 / T3 / T6).
- Gen-3 handed off to gen-4 (`orchestrator-2026-05-12-0953`) at `63581e9` after operator-reported 749350-token context threshold per ORCHESTRATOR_STATE_CONTRACT INVARIANT-4.
- Gen-4 full-autonomous mode operative per operator MAXIMUM PARALLELIZATION directive 2026-05-12: §C auto-ack envelope expanded to include HALT-TICKET-BODY-PRE-COMMIT; concurrent sub-session target raised from 4 (Round 1 validated ceiling) to 6-8 (operator-acknowledged risk).
- Phase 1 second batch dispatched: T4 (Bottom rail) + T5 (BUILD.md) + T7 (Visual polish); plus P2 (this archive doc).

**Key tooling changes during round:**
- T6 sub-session (MB-T-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-α-β) shipped α `verify:build-freshness` (`e271329`) + β `verify:bundle-fingerprint` (`54d5b58`) primitives; WB5 §C envelope amendment (`0d71590`) added gates into auto-ack envelope.
- Gen-4 orchestrator background monitor `/tmp/orch-gen4-monitor.sh` introduced 3-rev HALT regex refinement (false-positives surfaced at h1 heartbeat 2026-05-12T10:01).

**Cumulative incident count when this round closes:** TBD — round still open at this archive's first commit. Populated at round-close synthesis (§3).

---

## §1 — Incident enumeration

Each incident: cite-anchor (commit SHA + filing-row ID) | sequence reconstruction | diagnostic | closure-path | tier classification. Live-archived as observed.

### §1.1 — Cross-session staging-area commit contamination (T3 file swept into T6 WB5 commit)

**Cite-anchor:** `0d71590` (T6 WB5 commit that swept T3 file) + `8d178a4` (Tier 1 followup filing) + Tier 1 row `MB-F-CROSS-SESSION-STAGING-AREA-COMMIT-CONTAMINATION-2026-05-12` (FOLLOWUPS.md:330) + sibling Tier 1 row `MB-F-METHODOLOGY-CROSS-SESSION-STAGING-CONTAMINATION` (FOLLOWUPS.md:336; same incident, T6's filing angle).

**Sequence reconstruction** [KNOWN per `git show --stat 0d71590 --name-only` + T3 forensic reconstruction at filing time]:
1. T3 sub-session ran `git add -- <T3 ticket body file>` staging single file.
2. T6 sub-session ran `git add docs/coordination/orchestrator-state-current.md` staging its own file. Staging area now contained BOTH `A <T3-file>` + `M <state-file>`.
3. T6 ran `git commit -m "..."` WITHOUT pathspec restriction on the commit command itself → captured both staged paths.
4. T6's Q7 self-check claimed "Sibling untracked T1/T3 ticket bodies + T2 working-tree files path-disjoint and not staged"; the claim was made by inspecting working-tree state at `git add` time, NOT by re-inspecting the index at `git commit` time.
5. T3's subsequent `git commit -- <pathspec>` reported "no changes added" — file already swept by T6.

**Diagnostic** [KNOWN per CLAUDE.md §2.7 wording-gap audit]: pathspec-add (`git add <path>`) is necessary but NOT sufficient. The CLAUDE.md §2.7 paragraph at filing time emphasized per-path `git add`; it did NOT explicitly mandate per-path commit pathspec (`git commit -- <pathspec>`). Orchestrator's ACK dispatch to T6 said "Pathspec-restricted to docs/coordination/orchestrator-state-current.md ONLY" — implied both add+commit pathspec, but T6 applied only add-pathspec. Repo state outcome: file CONTENT correct byte-for-byte; commit ATTRIBUTION drifted (T3 ticket body filed under T6 WB5 commit, not T3 ticket body commit).

**Closure-paths enumerated in filing:**
- (α) **Tighten CLAUDE.md §2.7** to mandate BOTH pathspec-add AND pathspec-commit in all parallel-cairn contexts with explicit verbatim primitive syntax (`git commit -m "..." -- <specific-path>` OR `git commit -o <path> -m "..."`).
- (β) **Pre-commit hook validating staged-files match expected pathspec** — mechanical defense. Conflicts with current ".git/hooks/ empty" preference.
- (γ) **Per-session worktrees** per CLAUDE.md §4.3 (`~/Desktop/Automata/foxworks-worktrees/<session-name>/`) — eliminates shared-index class. Higher overhead; partial mitigation since coordination still happens via origin/main.
- (δ) Accept-as-known-pattern + document.

**Operator disposition 2026-05-12 (A):** accept contaminated commit as-is + file Tier 1 followup + T3 proceeds WB1 RED immediately. Content shipped correctly; attribution drift = methodology artifact not content artifact.

**Tier classification:** Tier 1 methodology — Round 9 stress regime default per dispatch §5.4 + §H.

### §1.2 — T1 WB2 recurrence: index-race despite pathspec-add discipline (discipline-working case)

**Cite-anchor:** `b641eac` (T1 WB2 RED commit body INCIDENT OBSERVED section) + RECURRENCE UPDATE in `MB-F-CROSS-SESSION-STAGING-AREA-COMMIT-CONTAMINATION-2026-05-12` row body (FOLLOWUPS.md:330).

**Sequence reconstruction** [KNOWN per T1 forensic `git status --short` + `git ls-files --stage` capture]:
1. T1 ran `git add -- <T1 probe path>` staging single file. `git diff --cached --name-only` immediately confirmed ONLY T1 file staged.
2. T3 sub-session ran their own `git add -- <T3 probe path>` + `git commit -- <T3 probe path>` cycle for WB3 RED `ff09a13` in the same shared-tree workspace.
3. T1's first `git commit -- <T1 probe path>` attempt FAILED with `error: pathspec '...probe-mbtwt1-02...' did not match any file(s) known to git` — T1's index entry had been wiped DESPITE T3 using pathspec-commit correctly. Intermediate `git status --short` showed `A probe-mbtwft3-03-...` (T3 file briefly visible as staged-add) + `?? probe-mbtwt1-02-...` (T1 file regressed to untracked).
4. T1 REFUSED commit per CLAUDE.md §2.9 bidirectional territory fence + operator dispatch HALT-CROSS-SESSION directive; surfaced incident; re-added T1 probe; verified clean staging via `git diff --cached --name-only`; committed pathspec-restricted at `b641eac`.

**Diagnostic** [MODELED, T1 filing]: corruption mechanism is NOT simply "missing pathspec-commit" — even with pathspec-add AND pathspec-commit BOTH applied, the shared-`.git/index` race window between two sessions' add+commit cycles can EVICT a competing session's staged entry. Mechanism candidates: (a) `git commit -- <pathspec>` race against `git add` partial-write of `.git/index`; (b) `git update-index` invoked by T3's commit racing T1's add; (c) `.git/index.lock` contention with retry-recovery losing one party's staged delta.

**Net outcome:** NO contamination landed — discipline-working case (T1 caught + refused) vs original discipline-failed case (T6 swept T3 file at `0d71590`). T1 forward-propagated the discipline from T6's incident, applying §2.7 + §2.9 territory fence at commit-rejection point.

**Closure-paths refinement (from this recurrence):** Closure-path-β (mechanical defense via pre-commit script) gains relative urgency from this evidence — pathspec-commit alone does NOT suffice when sessions race on the index file. Closure-path-γ (per-session worktrees) becomes the structural-fix candidate.

**Tier classification:** Tier 1 (rolled into row `MB-F-CROSS-SESSION-STAGING-AREA-COMMIT-CONTAMINATION-2026-05-12` as RECURRENCE UPDATE).

### §1.3 — T2 WB2 index-rewrite incident: staged work reverts to untracked between add and commit

**Cite-anchor:** `d627096` (T2 WB2 GREEN commit body parallel-cairn incident section) + Tier 1 row `MB-F-PARALLEL-CAIRN-SHARED-INDEX-RACE-WINDOW` (FOLLOWUPS.md:348).

**Sequence reconstruction** [KNOWN per T2 WB2 commit body direct experience capture 2026-05-12]:
1. T2 ran per-path `git add` of 3 files (spike ADR + TerminalStream component + fake-console-bridge edit). `git status --short` confirmed only those 3 paths staged (A/M).
2. Between T2's stage and T2's `git commit` attempt, T6 sub-session landed two commits (`54d5b58` WB4 verifyBundleFingerprint + `0d71590` WB5 §C envelope amendment).
3. T2's `git commit -- <pathspec>` attempt failed with `error: pathspec ... did not match any file(s) known to git` for the two NEW files (spike ADR + TerminalStream) — re-validated via subsequent `git status --short` showing the files reverted to `??` (untracked).
4. T2 recovery: re-ran per-path `git add` for the same 3 files; verified post-stage `git status --short`; committed pathspec-restricted on the same 3 paths. Sibling staging (T1's untracked ticket body) preserved across re-stage; T6's commits already-landed don't appear in T2's status.

**Diagnostic** [KNOWN per T2 filing]: shared-working-tree parallel-cairn creates an index-race window between `git add` and `git commit`. Per-path discipline (CLAUDE.md §2.7) catches accidental sweep-in but does NOT prevent index-rewrite losing prior staging when sibling commits land in the same git directory.

**Closure-paths enumerated in T2 filing:**
- (α) Migrate parallel-cairn to per-session worktrees per CLAUDE.md §4.3.
- (β) Atomic stage-commit-push sequence helper.
- (γ) Accept index-race as inherent cost of shared-working-tree mode; document recovery pattern (re-stage + re-verify before commit).
- (δ) T6 methodology infrastructure may close this when build-freshness/bundle-fingerprint workflows graduate to atomic-commit support.

**Tier classification:** Tier 1 per dispatch §5.4 stress regime default. Same structural class as §1.1+§1.2 (shared-index race); operator may choose to consolidate the three Tier 1 rows when round closes.

### §1.4 — Gen-4 orchestrator monitor HALT regex matches stale scrollback

**Cite-anchor:** Tier 2 row `MB-F-ORCHESTRATOR-MONITOR-HALT-REGEX-MATCHES-STALE-SCROLLBACK-2026-05-12` (FOLLOWUPS.md:331).

**Sequence reconstruction** [KNOWN per gen-4 monitor self-arming at h1 heartbeat 2026-05-12T10:01]:
- gen-4 orchestrator background monitor `/tmp/orch-gen4-monitor.sh` first revision (task ID `bj23ky89t`) used unanchored `grep -iE 'HALT-[A-Z0-9_-]+'` against full pane capture.
- First heartbeat h1 fired 3 false-positive HALT detections:
  - (a) `t6-ticket-body-0905` matched `◼ WB5 — auto-ack §C envelope amendment (HALT-PRE-COMMIT)` — completed-task-name in task-list display.
  - (b) `commit-plan-doc-1334` matched `Per HALT-WB10-FINAL-PRE-COMMIT failure-mode triage map` — historical prose at capture line 34.
  - (c) `verify-chat-mount-1319` matched `surface sub-arbitrations as drafted and HALT-FROZEN-CONTRACT-PRE-COMMIT before commit` — posture-statement prose at capture line 39.
- Second revision (`bz51mfaok`) added `tail -15` + completed-task exclusion + prose-prefix exclusion — still false-positive on (c) (exclude list missed `surface … HALT-X before commit` mid-sentence pattern).
- Third revision (`b4a3rv5co`, current) requires `^[[:space:]]*[*⏺🛑#❯>•-]*[[:space:]]*HALT-[A-Z]` line-start anchor within `tail -8` window. Dry-run zero false-positives across all 7 watched panes.

**Diagnostic** [KNOWN per filing]: HALT-vocabulary appears in methodology-rich codebase prose (commit bodies, dispatch docs, in-flight task summaries) at non-trivial frequency. Unanchored regex over full pane capture matches this prose alongside live HALT surfaces. False-positives degrade orchestrator monitor-driven situational awareness — Round 9 cadence requires reliable HALT signal.

**Closure-paths enumerated:**
- (α) [APPLIED] line-start regex anchor + tail-8 window.
- (β) Gold-standard HALT-marker convention via dispatch directive — every genuine HALT surface authored as standalone line beginning with `⏺ HALT-X` or `🛑 HALT-X` gives grep a stable contract.
- (γ) Accept-as-known-pattern + document.

**Tier classification:** Tier 2 operational — false-positive HALTs are workflow friction not ship-gate blocker.

### §1.5 — §C envelope expansion: HALT-TICKET-BODY-PRE-COMMIT now auto-acked

**Cite-anchor:** operator directive 2026-05-12 MAXIMUM PARALLELIZATION (operator-facing message, captured in dispatch §3.2 amendment + gen-4 boot prompt §12.3 inheritance).

**Sequence reconstruction** [KNOWN per dispatch evolution]:
- Original full-build-mode dispatch (`4f0bbde`) §3.2: "Each ticket body draft requires HALT-TICKET-BODY-PRE-COMMIT for operator review before sub-session begins WB ladder execution. Operator authority over methodology surface preserved at ticket-body-authoring gate."
- 2026-05-12 directive: operator-acked push past Round 1 validated 4-session ceiling to 6-8 concurrent; explicitly authorized §C envelope expansion to include HALT-TICKET-BODY-PRE-COMMIT auto-ack under full-autonomous orchestrator mode.
- Effect: T4 + T5 + T7 + P2 (this session) ticket bodies auto-acked at ticket-body-commit time per expanded §C, with no operator HALT cycle.

**Diagnostic:** §C envelope amendment per dispatch §3.5 originally bounded auto-ack to `green:wiring` + `refactor:` + `docs:`. Extending to `docs:(ticket body)` is a category-similarity argument (ticket bodies are docs); operator-acknowledged risk per MAXIMUM PARALLELIZATION directive 2026-05-12. Bypasses the "operator authority over methodology surface preserved at ticket-body-authoring gate" wording in dispatch §3.2 — explicit operator-arbitrated override.

**Closure-paths:**
- (α) Permanent §3.2 amendment in dispatch text — operator-authored at next operator-side methodology window.
- (β) Operational-only override — current state, revisit if a ticket-body authoring incident occurs under expanded envelope.

**Tier classification:** Methodology evolution observation; not an incident filing. Recorded here for round-close synthesis.

### §1.6 — §2.7 gap-closure propagation observed (T6 WB6 deliberate pathspec-on-commit; T3 forward-propagation)

**Cite-anchor:** T6 WB6 commit (first deliberate pathspec-on-commit application post-`0d71590` incident; documented in `MB-F-METHODOLOGY-CROSS-SESSION-STAGING-CONTAMINATION` row "Immediate-action discoverable" section).

**Sequence reconstruction** [KNOWN per FOLLOWUPS.md row body + commit body inspection]:
- 2026-05-11: `orchestrator-state-current.md §4` documented `pathspec-restricted-commit` as operational primitive (lines 100-107).
- 2026-05-12 09:30: T6 WB5 commit `0d71590` applied pathspec-add only; swept T3 file. Incident filed.
- T6 WB6 docs commit applied `git commit -m "..." -- <pathspec>` form as first deliberate application of the operational primitive after the incident.
- T3 sub-session forward-propagated Q7 self-check refinement: inspect `git diff --cached --name-only` AT commit time, not just at add time.
- T1 sub-session forward-propagated discipline at WB2 recurrence (§1.2 above) — refused commit when index race detected; surfaced incident; re-staged.

**Diagnostic:** Methodology gap-closure propagation across sub-sessions via FOLLOWUPS.md + commit body cross-references operates within a single round, not just across rounds. T6's incident filing made the gap visible; subsequent sub-sessions (T1, T2, T3) absorbed the refinement at commit-cycle time.

**Closure-paths:** This is the closure path itself (propagation through repo-anchored evidence). Per CLAUDE.md §2.7 amendment is the codification step (operator-arbitrated).

**Tier classification:** Methodology-positive observation; recorded here for round-close synthesis under §2 (propagation evidence).

### §1.7 — CC CLI 2.1.138 paste-compression regression (paste-buffer-dispatch primitive impact)

**Cite-anchor:** Dispatch P2 §SCOPE notes "CC CLI 2.1.138 paste-compression regression breaking gen-3's documented paste-buffer-dispatch primitive (filed at `MB-F-ORCHESTRATOR-MONITOR-HALT-REGEX-MATCHES-STALE-SCROLLBACK-2026-05-12` sibling; this incident may merit its own row)".

**Sequence reconstruction** [MODELED, awaiting deeper investigation]:
- gen-3 orchestrator documented `paste-buffer-dispatch` primitive at `ORCHESTRATOR_STATE_CONTRACT.md §4` + `orchestrator-self-restart-protocol.md §2`. Pattern: `tmux paste-buffer -b <buf-id> -t <session>` for multi-line content with double-Enter submit. Used for T2 + T4 sub-session rotation continuation briefs (subsession-rotation-log.md entries 1+2 at 2026-05-11).
- CC CLI 2.1.138 introduced paste-compression behavior that interacts with the documented dispatch primitive. Symptom not yet captured in a dedicated FOLLOWUPS row; mentioned as sibling to monitor regex incident.

**Diagnostic** [MODELED]: The paste-buffer-dispatch primitive assumes verbatim paste delivery into the target session's input buffer. Paste-compression (CC CLI's terminal paste handling) may collapse whitespace, normalize newlines, or otherwise transform the buffered content — breaking the double-Enter-submit assumption + the verbatim-text contract.

**Closure-paths candidates:**
- (α) File own Tier 2 followup row capturing the specific symptom — operator/orchestrator decision pending whether this merits a dedicated filing.
- (β) Revise paste-buffer-dispatch primitive to handle paste-compression — e.g., use `tmux send-keys -l` for literal text + explicit Enter keypresses instead of paste-buffer.
- (γ) Workaround via file-mediated dispatch — write content to `/tmp/<dispatch-name>.txt` + orchestrator-pasted single-line `cat /tmp/<dispatch-name>.txt` invocation.

**Tier classification:** Tier 2 candidate (filing decision pending). Tracked here as a Round 9 incident observation; promote to its own FOLLOWUPS row if symptoms continue to surface.

### §1.8 — α build-freshness gate false-STALE under concurrent sibling-pushes

**Cite-anchor:** Tier 3 row `MB-F-METHODOLOGY-α-OVER-CONSERVATIVE-CONCURRENT-PUSH` (FOLLOWUPS.md:337) + α-β findings doc `docs/coordination/mbtmrvcab-findings-2026-05-12.md` §V.1 + T6 WB4 commit body `54d5b58` empirical evidence.

**Sequence reconstruction** [KNOWN per T6 WB4 observation 2026-05-12 09:20]:
- T6 rebuild finished writing `dist/main/main.js` at 09:20:28.
- T2 sub-session pushed `fcf0c652` (WB1 RED — test/probe file only, no dist build inputs) at 09:20:35.
- α `verify:build-freshness` returned STALE with delta=-7s. The gate correctly classifies dist as stale relative to overall HEAD timestamp, but is over-conservative when the new commit does not touch dist build inputs.

**Diagnostic:** α compares dist mtime against overall HEAD commit timestamp. Under Round 9 parallel-intensity (6-8 concurrent sub-sessions), small-delta false-STALE is structurally expected when a sibling session pushes a dist-irrelevant path (test/probes, docs/) while a verifier is between rebuild and commit.

**Mitigation already in place per §8.α step 4 of §C envelope amendment:** "If repeated STALE after rebuild with delta within ~10s of HEAD time: investigate for concurrent sibling-session push to dist-irrelevant paths before treating as blocker."

**Closure-paths:**
- (α) Refine α to compare dist mtime against `git log -1 --format=%at -- <dist-relevant-paths>` rather than overall HEAD timestamp. dist-relevant paths = `packages/<pkg>/src/**` + `packages/<pkg>/scripts/build-*.mjs` + workspace `pnpm-lock.yaml`.
- (β) Accept operational mitigation (manual investigation gate at small-delta) as sufficient under current parallel-intensity.

**Tier classification:** Tier 3 — false STALE causes unnecessary rebuild, not silent failure. Operational mitigation sufficient.

### §1.9 — Format-anchor fabrication caught at P2 dispatch authoring

**Cite-anchor:** This document's anti-fabrication note (above §0) + dispatch P2 ANTI-FABRICATION NOTE.

**Sequence reconstruction** [KNOWN per this session's dispatch-read]:
- Operator-side dispatch authoring (chat-Claude relay or gen-4 orchestrator) cited format anchors `docs/methodology/cairn-under-stress-round-1.md` + `docs/methodology/cairn-arc-synthesis.md` in P2 dispatch.
- Verification at P2 boot: `find docs -name "cairn*.md"` returned `docs/cairn-under-stress-round-2.md` + `docs/cairn-under-stress-round-7.md` only; no `docs/methodology/` subdir exists.
- P2 sub-session substituted to extant anchors (round-7 + round-2) and recorded the drift in dispatch text + this document.

**Diagnostic:** Direct repeat of Round 7 §2.1+§2.3 pattern (chat-Claude path fabrication for non-existent filesystem paths). The Round 7 §5.1 methodology amendment text ("Chat-Claude dispatch-authoring must probe-verify all file paths …") was authored as recommendation; not yet operator-ratified into CLAUDE.md. This Round 9 recurrence supports the amendment's operationalization.

**Closure-paths:**
- (α) Ratify Round 7 §5.1 amendment into CLAUDE.md (operator-arbitrated).
- (β) Pre-dispatch verification step: orchestrator/chat-Claude `ls` + `find` cited paths before pasting dispatch.

**Tier classification:** Round 7 §5.1 amendment candidate; this recurrence promotes urgency. Cross-references Round 7 §2.1+§2.3 path-fabrication evidence.

---

## §2 — Methodology propagation observed (positive cases — discipline-working evidence)

[MODELED, anchor in cited commit bodies + FOLLOWUPS rows]:

Round 9 has produced multiple positive discipline-working cases alongside the §1 incidents:

### §2.1 — Pathspec-on-commit primitive adoption (T6 WB6 → T1/T2/T3 forward-propagation)

T6's `0d71590` contamination filing made the §2.7 gap visible. Subsequent commits across T1, T2, T3, T6 (post-incident) consistently used `git commit -- <pathspec>` form per the documented operational primitive at `orchestrator-state-current.md §4`. This is the cairn-arc-synthesis-style propagation: methodology evidence in repo (FOLLOWUPS row + commit body) becomes architectural constraint at next sub-session commit cycle.

### §2.2 — T1 WB2 refusal-and-surface (discipline-working case)

T1's WB2 recurrence (§1.2 above) demonstrated CLAUDE.md §2.9 bidirectional territory fence + operator HALT-CROSS-SESSION directive applied at commit-rejection point. T1 refused the commit when index race detected; surfaced incident; re-staged correctly; net outcome NO contamination landed.

### §2.3 — T2 WB2 SPIKE+ADR primitive applied to internal-code (CLAUDE.md §2.8 extension)

T2 WB2 (`d627096`) treated the `console:stdout-chunk` lifecycle question as a spike-required surface even though it's INTERNAL code (not an external API). Source-trace through `console-ipc.ts:200-368` + bridge wiring + main.ts production callers produced `[KNOWN]`-labeled outcome documented in ADR `mb-t-wireframe-t2-console-stream-spike-2026-05-12.md`. Spike+ADR primitive extended beyond CLAUDE.md §2.8 strict "external API" scope.

### §2.4 — Gen-4 monitor self-iteration (3-rev refinement at first heartbeat)

The gen-4 orchestrator monitor false-positive incident (§1.4 above) was caught at first heartbeat h1, refined twice within minutes, settled at line-start-anchor third revision. Cairn discipline applied to tooling iteration: filing surfaced the false-positive class; revisions tracked closure-path progression; final revision verified via dry-run before activating.

### §2.5 — Followup-row body as forward-propagation memory (CLAUDE.md memory primitive)

CLAUDE.md memory `feedback_followup_row_as_forward_propagation_memory` (filing reusable patterns as Tier 3 followup rows with full implementation template + rationale in body) applied to T2 WB14 followups. Six rows filed by T2 each include closure paths α/β/γ enumeration + discoverability anchor + tier rationale — body-as-implementation-template pattern carried across rounds.

### §2.6 — Cross-session findings-doc cross-referencing

T2's findings doc `mb-t-wireframe-t2-findings-2026-05-12.md` §IX cross-references T1's sibling Tier 3 `MB-F-FRAME-C-UPTIME-LOST-ON-FRAME-TOGGLE-2026-05-12` (closure path overlap with T2's `MB-F-T2-HEADER-UPTIME-PLAN-DATA-PATH`). Cross-session findings-doc cross-references operate as an emergent coordination primitive — sub-sessions discover sibling work in real-time and consolidate closure paths.

---

## §3 — Round-close synthesis

(empty — round still open at P2 first-commit time; gen-4 orchestrator continues full-autonomous cascade execution.)

When operator declares Round 9 closed, this section will fill with:
- Cumulative incident count by tier (Tier 1 / Tier 2 / Tier 3).
- Methodology-amendment recommendations to CLAUDE.md (consolidated from §1 closure paths + Round 7 §5.1-§5.3 recurrence evidence).
- Round 9 vs Round 5/7 comparison (parallel-scale evidence; incident-density observation per dispatch §SCOPE deliverable framing).
- Substrate-portability findings (which discipline propagated cleanly; which had recurrence).
- Roadmap input for cairn-tooling MVP (verify-pathspec-commit primitive; pre-commit hook; per-session-worktree migration; HALT-marker convention).

---

## §4 — Cross-references

### §4.1 — FOLLOWUPS.md Tier 1 rows filed during Round 9

| Row | Filing commit | Section above |
|---|---|---|
| `MB-F-CROSS-SESSION-STAGING-AREA-COMMIT-CONTAMINATION-2026-05-12` | `8d178a4` + recurrence update `63581e9` | §1.1 + §1.2 |
| `MB-F-METHODOLOGY-CROSS-SESSION-STAGING-CONTAMINATION` | T6 WB6 docs post-`0d71590` | §1.1 (same incident, different filing angle) |
| `MB-F-PARALLEL-CAIRN-SHARED-INDEX-RACE-WINDOW` | `d627096` (T2 WB2 commit body) + T2 WB14 docs filing | §1.3 |

### §4.2 — FOLLOWUPS.md Tier 2 rows filed during Round 9

| Row | Filing | Section above |
|---|---|---|
| `MB-F-ORCHESTRATOR-MONITOR-HALT-REGEX-MATCHES-STALE-SCROLLBACK-2026-05-12` | gen-4 monitor self-arming 2026-05-12T10:01 | §1.4 |
| `MB-F-T2-TOOL-PARSE-REGEX-BRITTLE-CC-FORMAT-DRIFT` | T2 WB14 docs | (T2 ticket; not a methodology incident — content followup) |
| `MB-F-T2-HEADER-UPTIME-PLAN-DATA-PATH` | T2 WB14 docs | (T2 ticket; content followup) |
| `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` | T3 WB9 docs | (T3 ticket; content followup) |
| `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-γ-HEADLESS-SCREENSHOT` | T6 WB6 docs | (T6 closure-stamp; not incident) |

### §4.3 — FOLLOWUPS.md Tier 3 rows filed during Round 9 (selected)

`MB-F-METHODOLOGY-α-OVER-CONSERVATIVE-CONCURRENT-PUSH` (§1.8) + `MB-F-METHODOLOGY-FINGERPRINT-AUTO-EXTRACTION-CANDIDATE` + `MB-F-METHODOLOGY-RUNTIME-VERIFY-PRE-COMMIT-HOOK-CANDIDATE` + `MB-F-METHODOLOGY-β-MINIFY-COUPLING` + `MB-F-LAZY-XTERM-ADAPTER-SHARED-EXTRACTION` + `MB-F-T2-NEXT-TOOL-PREVIEW-FIXTURE-MISSING` + `MB-F-T2-PANEL-CAP-AWARE-UX` + `MB-F-FRAME-C-FILTER-STATE-NOT-PERSISTED-2026-05-12` + `MB-F-FRAME-C-UPTIME-LOST-ON-FRAME-TOGGLE-2026-05-12`. (Content-followup rows — not methodology incidents — listed here for round-close synthesis pattern recognition.)

### §4.4 — Coord-notes referenced

- `docs/coordination/full-build-mode-dispatch.md` (`4f0bbde`) §5.4 — Round 9 stress regime declaration; §H methodology-incident-reporting framing; §3.5 visual-comparison gate.
- `docs/coordination/orchestrator-state-current.md` §11 (gen-3 supplement 2026-05-11T22:02) + §12 (gen-3→gen-4 handoff 2026-05-12T09:54).
- `docs/coordination/ORCHESTRATOR_STATE_CONTRACT.md` §4 operational primitives (paste-buffer-dispatch; pathspec-restricted-commit).
- `docs/coordination/subsession-rotation-log.md` entries 1+2 (T2 + T4 gen-3 rotations 2026-05-11) — paste-buffer-dispatch primitive in production use.
- `docs/coordination/orchestrator-self-restart-protocol.md` §2 — paste-buffer-dispatch primitive ratified.

### §4.5 — Per-ticket findings docs referenced

- `docs/coordination/mb-t-wireframe-t2-findings-2026-05-12.md` §IX — T2 followups list; methodology cross-references.
- `docs/coordination/mb-t-wireframe-t2-runtime-smoke-2026-05-12.md` — T2 WB13 smoke evidence (CLAUDE.md §4.6 merge gate).
- `docs/coordination/mb-t-wireframe-t2-console-stream-spike-2026-05-12.md` — T2 WB2 SPIKE ADR (CLAUDE.md §2.8 internal-code-spike extension).
- `docs/coordination/mbtmrvcab-findings-2026-05-12.md` — T6 (α-β methodology infra) findings + γ deferral.
- `docs/coordination/mbtwt1-findings-2026-05-12.md` — T1 (Session data flow) findings.

### §4.6 — MEMORY.md primitive references applied

- `feedback_ladder_internal_three_source` — re-run Phase-1 spike at WB1 + WB-final.
- `feedback_consumer_non_regression_per_wb` — when a ticket touches code with downstream consumers, run consumer probes at every WB.
- `feedback_followup_row_as_forward_propagation_memory` — file reusable patterns as Tier 3 followup rows with full implementation template + rationale in body.
- `feedback_stale_dispatch_detection` — check git log + FOLLOWUPS + findings doc at Phase 1 before any RED scaffold.

All four memory primitives observed in operative use during Round 9 sub-sessions.

---

**Confidence labels throughout (per CLAUDE.md §2.2):**
- KNOWN: incident sequences cite commit SHAs verified via `git log` / `git show`; followup rows cite FOLLOWUPS.md line numbers verified via `grep`; coord-doc citations verified via direct read.
- MODELED: closure-path effectiveness (Round 9 still open; closure-path validation deferred to round-close synthesis); CC CLI 2.1.138 paste-compression diagnostic awaiting deeper investigation.
- SPECULATIVE: none — all §1 incidents anchor on cited filings; §2 propagation observations anchor on cited commit bodies + FOLLOWUPS rows.

**Live-archive discipline:** P2 sub-session commits + pushes this doc per substantive content addition. Continued updates as further Round 9 incidents arrive. Round-close synthesis at §3 fills when operator declares Round 9 closed.
