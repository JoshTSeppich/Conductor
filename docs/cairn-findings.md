# Cairn findings — foxworks-dispatch

Local findings ledger for the foxworks-dispatch repository. Records
methodology evidence and codification candidates surfaced during real-
environment work. Each finding is **frozen at capture time** — past
tense, dated, not retroactively edited. Subsequent learning produces
new findings, never amendments to old ones.

Findings here lift to the Cairn v0.2 portfolio-master findings file at
codification time. Until then, this file is the citation target for
commits and tickets that reference a finding number.

This ledger is **not** the followup index. `docs/FOLLOWUPS.md` owns
work-item tracking (followup IDs, priority bands). Findings are a
different genre: methodology evidence with portfolio-level half-life,
not per-cluster work items.

Numbers are assigned from the **portfolio-shared sequence** (Cairn-
wide). Gaps in this file represent findings captured in sibling repos.
The portfolio sequence is monotone; codified findings stay in place
with a `Lifted:` line added.

## Format

Each finding follows this shape:

    ### Finding #N — short title

    - **Captured:** YYYY-MM-DD
    - **Origin:** <commit-sha> · <ticket-or-scope>
    - **Companions:** #M, #K (or _none_)
    - **Codification target:** Cairn v0.2 §<section> (or _TBD_)
    - **Status:** Captured

    <body — past-tense narrative of what was observed and the
    methodology lesson it codifies>

Status values: `Captured` (default), `Codified` (after Cairn v0.2
lift), `Superseded` (if later finding refines or replaces).

---

## Findings

### Finding #51 — smoke-test scope vs. user-surface divergence

- **Captured:** 2026-04-28
- **Origin:** 80a90ec · v2.0.0 dogfood incident; CLI-Z2-1 fix-pack at 28902ca
- **Companions:** #49 (runtime-path divergence; in sibling ledger), #52, #53, #54
- **Codification target:** Cairn v0.2 §<TBD>
- **Status:** Captured

Phase Z smoke tests covered daemon-side (Z-1), web-side (Z-3), and
CLI-internal-via-tsx (Z-4) invocation paths but did not exercise the
binary-on-PATH user-invocation path that any returning user hits via
the pnpm-global shim. Result: v2.0.0 shipped with `fd init` unusable
for any pre-link operator. The smoke harness `smoke-test-cli` ran via
tsx, masking the binary-on-PATH gap entirely; tsx resolves source
imports differently than plain node, so a smoke that exercises only
the tsx path verifies a different module-resolution graph than the
production-shipped binary.

Codification target Cairn v0.2: smoke-test surface must include every
user-invocation surface the install instructions point at, not only
the test-script surfaces. The discipline is "exercise what users
exercise," not "exercise what tests are convenient to write."

Companion to #49 (runtime-path divergence; in sibling ledger). Sibling
at the binary-resolution layer rather than the module-resolution
layer.

### Finding #52 — workspace dep public surface vs. source-tree reach-in

- **Captured:** 2026-04-28
- **Origin:** 80a90ec · v2.0.0 dogfood incident; CLI-Z2-1 fix-pack at 28902ca
- **Companions:** #51, #53, #54
- **Codification target:** Cairn v0.2 §<TBD>
- **Status:** Captured

CLI source imports `dispatch-core/src/<x>.js` across 7 files (18
import lines surveyed pre-attempt; full-monorepo survey at finding
#54 capture surfaced 88 across 68 files). tsx and tsc both resolve
`.js` → `.ts` source under workspace symlinks, so unit/integration
coverage and the `smoke-test-cli` tsx harness all stay green. But the
built CLI under plain node fails to find the `.js` file — there is no
`.js` at that path in source, and `dispatch-core/package.json` had no
`exports` map at v2.0.0, so node ESM walks into the source tree and
looks for the literal file. Phase Z's build-once-then-test discipline
never executed against the built CLI; smoke harness ran via tsx.

Verification at finding capture confirmed
`packages/dispatch-core/{src,dist}/index.js` are both literal
`export {};` — the nominal package main entry has no semantic content,
and no test in the suite would have surfaced the gap. The empty
barrel was scaffolded but never wired with re-exports; the public-
surface contract was never built or tested in any layer of coverage.

Codification target Cairn v0.2: a workspace package's public surface
is whatever its package.json `main`/`exports` declares, not whatever
path resolves under tsx. Reaching into another workspace's `src/` is
a forbidden import shape — lint or grep at PR time.

Companion to #51 — same dogfood incident, but a different layer of
the cake.

### Finding #53 — type-contract emission gap parallel to runtime contract

- **Captured:** 2026-04-28
- **Origin:** 80a90ec · v2.0.0 dogfood incident; CLI-Z2-1 fix-pack at 28902ca
- **Companions:** #52
- **Codification target:** Cairn v0.2 §<TBD>
- **Status:** Captured

`dispatch-core/tsconfig.json` had no `"declaration": true`; the build
emitted `.js` without matching `.d.ts`. The reach-in import pattern
(`dispatch-core/src/<x>.js`) hid this because TypeScript NodeNext
resolution mapped `.js` → `.ts` source via workspace symlink, reading
types directly from source. After green-2 (e416da6 — subsequently
reverted at 28902ca) declared an explicit exports map pointing at
`dist/`, TypeScript expected co-located `.d.ts` files and didn't find
them; 23 typecheck errors surfaced (TS7016 "Could not find a
declaration file" plus cascading TS18046 'unknown' errors).

Codification target Cairn v0.2: a workspace package's declared public
surface is two contracts — runtime (exports pointing at `.js`) and
type (declarations pointing at `.d.ts`). Declaring one without the
other is a half-measure; either both ship or neither does. Verifiable
as a build-step invariant (every `.js` in `dist/` has a sibling
`.d.ts`).

Companion to #52 (workspace dep public surface). Same underlying gap
(public-surface contract never built or tested), different facet
(type contract vs. runtime contract).

### Finding #54 — consumer-survey discipline at public-surface decisions

- **Captured:** 2026-04-28
- **Origin:** 80a90ec · v2.0.0 dogfood incident; CLI-Z2-1 green-3 scope-underestimation halt at 23d5ed1; revert at 28902ca
- **Companions:** #52, #53
- **Codification target:** Cairn v0.2 §<TBD>
- **Status:** Captured

When a workspace package changes its public surface (implicit-via-
reach-in → explicit-via-exports-map, or any similar architectural
shift), every reach-in consumer across the monorepo is affected. The
migration scope decision (contained / portfolio-wide / back-compat-
aliased) must be informed by a consumer survey before pre-
registration, not after. CLI-Z2-1 v2.0.1 attempted exports-map
declaration scoped only to dispatch-cli (18 imports projected);
actual consumer survey at green-3 surfaced 88 imports across 68
files in 3 workspaces — 5x scope underestimation. The correct
sequence: survey → scope decision → pre-reg → red/green.

Codification target Cairn v0.2: any architectural decision that
changes a workspace package's public surface requires a consumer
survey (full monorepo grep for reach-in imports) before pre-
registration. Survey output feeds the scope decision and the
pre-reg authority chain. Skipping the survey produces fix-pack
overreach.

Companion to #52 (workspace dep public surface) and #53
(type-contract emission gap) — same incident family, third facet.

### Finding #55 — frozen contracts must be verified against code state at freeze time

- **Captured:** 2026-04-29
- **Origin:** Operator session at e7e66b4 + MB-S03 spike halt; resolved via WORKSTATION_CONTRACT.md §8.1 amendment
- **Companions:** _none_
- **Codification target:** Cairn v0.2 §<TBD> (frozen-contract-verification primitive)
- **Status:** Captured

WORKSTATION_CONTRACT.md §8.1 was authored describing v3 persistence as residing in "the existing daemon SQLite database at `~/.foxworks-dispatch/data.db`" and citing `a502c4c` as the migration precedent. Both claims were structurally false: the daemon has no SQLite database (persistence is JSON-file based), and `a502c4c` is a JSON schema amendment, not SQL DDL. The contract was authored on the assumption that v2.0.0 daemon already had SQLite — an architectural assumption that did not match repository reality.

The error survived Phase 0 ratification because the verbal architectural model in the operator+Opus design conversation was treated as KNOWN when it was actually MODELED. WORKSTATION_CONTRACT.md was committed as authority without anyone verifying the §8.1 claims against actual `~/.foxworks-dispatch/` contents or `packages/dispatch-daemon/package.json` dependencies.

MB-S03 (the first spike to consume §8.1's persistence claims) caught the contradiction at file-read time and halted per §3.7 + frozen-contract-respect rather than infer-around-it. The halt was structurally clean: spike state had no commits, no staged files, no "useful prep" past the surface point. Operator amended §8.1 to reflect actual state (data.db doesn't exist; v3 introduces it; better-sqlite3 driver chosen; init lands in COARCH-T01) and committed the amendment as a `contract:` change. MB-S03 then resumed.

**Methodology lesson:** Frozen-contract artifacts must be verified against actual code state at the moment of freeze, not at first downstream consumption. Verbal architectural models are MODELED until they're checked against repository facts. A "verify against code" pre-flight check should be added to contract-freeze procedure: every claim that references existing files, paths, dependencies, or schemas in the contract must be grep-confirmed in the repo before the `contract:` commit.

**Companion to §3.1 anti-fabrication:** anti-fabrication says "read actual sources before claiming what they say." Finding #55 extends this to authored documents: "verify actual sources before claiming what they say in operator-authored frozen artifacts."


---

## Finding #56: Build session misframing of existing primitives as novel

**Round:** Round 2 (foxworks-dispatch, 2026-04-30)
**Session:** Session C (MB-T03)
**Status:** Surfaced and corrected within round

### What happened

Round 2 Session C encountered a Round 1 Incident 8 condition: Session B's untracked test file appeared in the shared git index during Session C's per-path `git add` operation. Session C correctly applied the existing primitive (per-path add + git status check + git restore --staged unstage) and no contamination landed in C's commits.

However, Session C framed the event in commit body `0bf4722` as a "novel §9.x candidate" requiring contract amendment, and noted "anticipated failure modes don't cover shared index" — both incorrect against the existing methodology corpus.

Operator review at chat layer caught the misframing. Framing correction landed at `4bbd2f2` with explicit retraction of the contract-amendment recommendation and re-characterization as Round 1 Incident 8 (project instructions §3.8 + §8 methodology observations).

### Pattern

Build sessions that read their Round 2 contract document (a derived artifact) without reading the methodology corpus (project instructions §3.8 + §8) experience an event the contract didn't *explicitly enumerate* and frame it as novel. The contract text is treated as authoritative about the methodology rather than as one expression of it.

### Why it matters

Cross-session methodology propagation is real (§8 methodology observations). If a misframed primitive lands in cross-session coordination notes and propagates laterally to other sessions, the wrong primitive spreads. Wrong primitive propagating is worse than no primitive.

### Forward primitive

Cross-session note framing of any "new finding" requires explicit citation against project instructions and prior cairn-findings entries *before* being filed as novel. Build-session prompts in subsequent rounds should include a verify-against-existing-corpus check before any claim of novelty.

Proposed Round 3 prompt addition (operator-arbitrated, draft only):

> Before claiming a finding as novel or recommending contract amendment, verify against project instructions §3 (cairn primitives), §8 (methodology observations), and existing cairn-findings.md entries. Cite the closest existing primitive in your finding entry. If no existing primitive applies, surface to operator before framing as novel.

---

## Finding #57: Green commit body claiming files not actually staged

**Round:** Round 2 (foxworks-dispatch, 2026-04-30)
**Sessions:** Session C (MB-T03) and Session B (MB-T02) — both instances
**Status:** Both sessions self-corrected before push

### What happened

Two of three Round 2 build sessions exhibited the same primitive failure: a green commit whose body claimed shipping files that were not actually in the commit's file set.

**Session C (5acadef → 865b80f):** Commit `5acadef` titled `green(MB-T03): menu.ts + window-lifecycle.ts — native menu + window state persistence` contained only `notes.md` (1 file changed, 21 insertions). The four claimed implementation files (menu.ts, window-lifecycle.ts, lifecycle-fixture-main.mjs, FOLLOWUPS.md) were absent. Session C disclosed: `git add` ran from the packages/dispatch-workstation/ subdirectory cwd (established by the prior `pnpm build` command), paths passed included the packages/dispatch-workstation/ prefix → resolved paths were double-prefixed and nonexistent. Subsequent `git status` between add and commit appears to have showed staged state from a prior shell invocation, not the one just executed. Self-corrected at `865b80f` with files staged from repo root explicitly.

**Session B (7ef8e44 → 93d7fda):** Commit `7ef8e44` titled `green(MB-T02): webview-loader.ts — loadDispatchWeb + WEB_UI_URL frozen exports` cited FOLLOWUPS.md additions in body but did not include the file in the actual file set (only notes.md + webview-loader.ts landed). Session B did not investigate the cause. Self-corrected at `93d7fda` with FOLLOWUPS.md staged separately.

Both sessions self-corrected before push (no contaminated history landed in remote). Both green commits are functionally complete via the corrective commit immediately following.

### Pattern

The 9-question self-check (CONDUCTOR_API_CONTRACT.md §10.5) Q7 ("territory check against actual git status output") exists to catch exactly this case. In both Round 2 instances, Q7 either was not run or was run against an unsynchronized status reading captured at the wrong timing — *before* `git add`, *between* `git add` and `git commit` from a different shell context, or *after* a status output that was stale relative to the current working tree state.

The cwd hazard surfaced by Session C is also worth naming independently: `pnpm` subcommands (especially `pnpm build`, `pnpm --filter X test`) can establish a working directory in a subpackage that persists for subsequent commands in the same shell. A `git add` issued after such a command may resolve paths against the subdirectory cwd, not the repo root. Path arguments that *include* the subdirectory prefix become double-prefixed and resolve to nonexistent paths.

### Why it matters

Green commits whose body asserts shipping files that aren't in the file set are MODELED-passing-as-KNOWN failures (§3.5). Even when self-corrected immediately after, they create commit-history records where the title and body do not match the diff. Future readers (zipper sessions, final integration, post-mortem) reading the title will incorrectly believe the deliverable landed at the original commit.

Two-of-three Round 2 sessions hitting the same pattern is sufficient evidence the underlying primitive (Q7) is under-specified, not just that two sessions made independent mistakes.

### Forward primitive

Self-check Q7 must cite *specific git status --short output captured between `git add` and `git commit`*, not before either, and not from a different shell context. The captured output should be either included in the commit body or referenced by the diff verification that follows.

Additionally: build sessions must run `git rev-parse --show-toplevel` or equivalent at the start of any commit-staging sequence to confirm cwd, especially after any `pnpm` invocation that may have changed shell working directory.

Proposed Round 3 prompt addition (operator-arbitrated, draft only):

> Before any `git add`: run `pwd` and confirm you are at repo root (the directory containing the top-level `.git/`). If not at repo root, `cd` to it before staging. After `git add` and immediately before `git commit`: run `git status --short` and include the exact output in your commit body, or in chat for operator review, as evidence of Q7. The status output is your KNOWN evidence that the files you intended to stage are actually in the index.

---

## Finding #58: Frozen contract divergence not §3.4-fenced

**Round:** Round 2 (foxworks-dispatch, 2026-04-30)
**Surfaced via:** §4.7 / §7.2 width/height naming amendment
**Status:** Surfaced and amended within round; primitive gap remains

### What happened

Round 2 contract `99b68e7` §4.7 step 3 and §7.2 step 4 specified `createManagedWindow({ defaultWidth: 1024, defaultHeight: 768, ... })` as the example call site. Session C `865b80f` shipped `WindowSizeDefaults` interface with field names `width: number; height: number;` instead of the `defaultWidth`/`defaultHeight` names the contract specified. Session C did not surface the divergence at green-commit time, did not halt, did not request contract amendment.

Zipper-1 `68e6528` discovered the discrepancy when wiring main.ts and chose to follow the frozen file (anti-fabrication §3.1 — file is what compiles). Operator amended contract via `74a5a64` to reconcile contract example with shipped file (semantics identical; pure naming inconsistency).

### Pattern

Project instructions §3.4 protects frozen contracts from CC modification of the contract document itself. It does not protect against CC implementation diverging from the contract document. The protection is one-directional. Session C couldn't edit `99b68e7` (correct) but Session C could ship `width`/`height` despite the contract specifying `defaultWidth`/`defaultHeight` (gap).

### Why it matters

Contract divergence at green-commit time becomes downstream work: zipper sessions catch it during integration, operator amends post-hoc, and the implementation precedent is set before the contract authority can respond. Multiple divergences would compound into rolling reconciliation work.

### Forward primitive

Build-session prompts in subsequent rounds should include explicit verification at green-commit time: "If the implementation interface differs from the contract specification — even in naming, ordering, or shape — halt and surface for operator amendment before green-commit. Do not silently ratify the divergence by shipping the implementation."

This is bidirectional: protects the contract from silent implementation drift in the same way §3.4 protects the contract document from CC editing.

---

## Finding #59: Operator-side push-race verification discipline

**Round:** Round 2 (foxworks-dispatch, 2026-04-30)
**Surfaced via:** Cairn-findings #56/#57 push race against COARCH-T02 commits
**Status:** Surfaced; recovered without contamination

### What happened

Operator filed cairn-findings #56 and #57 (commit `8842d4a`) and attempted to push. Push rejected because remote main had moved during the operator's edit window — COARCH-T02 session had pushed at least one commit (`84bd679` red commit) that the operator's local `origin/main` ref was unaware of.

Subsequent state diagnosis (after multiple confused turns) revealed that operator's `8842d4a` had landed on remote anyway via a mechanism not visible in the diagnostic transcript — possibly a buffered earlier command, possibly a rebase + push that scrolled off, possibly other. The race resolved without contamination but the mechanism remained unclear.

### Pattern

Operator-side commits during active CC sessions are subject to the same shared-working-tree hazards as cross-session commits (project instructions §3.8) plus an additional layer at the remote-refs boundary. CC sessions doing per-commit-push discipline rapidly update remote main; an operator preparing a multi-line edit + commit + push sequence may have a stale `origin/main` ref by the time the push fires, even if the operator's local working tree was clean at edit time.

### Why it matters

Push rejection is recoverable cleanly via fetch + rebase + push, but the diagnostic process consumed multiple turns because the chat-side reasoning operated on an incomplete model of repo state. Anti-fabrication §3.1 applies at the repo-state layer, not just at the file-content layer.

### Forward primitive

Operator-side commit sequences during active CC sessions should:
- Run `git fetch origin && git log origin/main..HEAD --oneline && git log HEAD..origin/main --oneline` before any commit work begins, to verify operator's view of remote is current
- Run the same before push to catch race conditions early
- If push fails, verify *actual* repo state via `git ls-remote origin main` and `git log -10 --oneline` before reasoning about consequences — don't assume the failure shape from error-message text alone

Chat-side reasoning about repo state during operator commit sequences should explicitly request state verification rather than reasoning from inference.

---

## Finding #60: Relay-prompt formatting hazard — apostrophes-in-comments break shell paste

**Round:** Round 2 (foxworks-dispatch, 2026-04-30)
**Surfaced via:** Quote-continuation event during Option A rebase command paste; re-fired during followups command paste
**Status:** Surfaced; pattern named for forward avoidance; META: fired during own remediation drafting

### What happened

Chat-layer drafted a multi-line bash code block intended as explanation, including comment lines like `# Your 8842d4a gets replayed on top of COARCH-T02's commits`. Operator pasted the entire block into a shell expecting it to execute.

Bash interpreted the apostrophe in `COARCH-T02's` (within the comment) as the start of a single-quoted string, entered quote-continuation mode (`quote> ` prompt), and waited for closing apostrophe. The paste did not execute; commands sat in a buffered unfinished-quote state until operator escaped via Ctrl-C.

A second instance occurred when the followups-filing command (a multi-line heredoc) was pasted: the heredoc terminated mid-paste due to a special character in row 2, leaving partial content on disk. The first paste partially landed; a second paste attempt completed; result was duplicate rows in FOLLOWUPS.md requiring a separate cleanup commit (`b08fe95`).

### Pattern

Chat-layer explanation blocks containing bash commands plus prose comments are not safe for direct shell paste. Bash's tokenization of apostrophes ignores `#` comment delimiters when the apostrophe appears mid-token in a way the shell parser hasn't yet committed to as comment territory. Multi-line pastes amplify this — the shell processes line-by-line during paste, and a line beginning with `#` only becomes a comment if the shell isn't already inside a quoted region from a prior line.

Multi-line heredocs in chat-paste contexts have an additional failure mode: terminal paste latency or special-character handling can cause heredoc-terminator markers to be consumed early or partial content to land on disk before the heredoc completes.

### Why it matters

Operator confusion + shell-state confusion compound. Operator can't tell whether the paste executed, executed partially, or sat buffered. Recovery (Ctrl-C, verify state, re-attempt) consumes turns. In adversarial cases, a buffered quote could theoretically execute later input as part of a shell-injection attack vector (low-risk in this context but real). Partial heredoc landings produce duplicate state requiring cleanup commits.

### Forward primitive

Chat-layer bash code intended for operator paste must follow one of two formats:
- Single-line commands with `&&` chaining, no comments inline. Comments in chat prose around the block, not in the block.
- Multi-line scripts where every comment line uses only ASCII characters that bash's tokenizer treats as plain text — no apostrophes, no quotes, no backticks, no special characters.

For long content (commit message bodies, file content to append), prefer:
- Script-file approach: write a `.sh` file via the create_file mechanism, present it for download, operator runs `bash that-script.sh`. The script contains heredocs internally but operator never pastes them.
- Editor approach: write content to a temp file via editor, then a single-line command commits the temp file content.

Code blocks in chat that are *explanation* (not for paste) should be explicitly labeled "explanation only — do not paste; the actual command is below" so operator doesn't conflate the two.

### Meta-observation

This finding fired *during the drafting of this finding*. The original cairn-findings #58-#63 command was a multi-line heredoc — the exact hazard #60 names. The hazard fired again during the followups command. The lesson is: **drafting a primitive does not automatically make the drafter follow it; primitive enforcement requires explicit application checkpoints in the drafter's own workflow**. Forward primitive update: when chat-layer drafts a finding about a hazard, the next chat-layer action that could trigger that hazard must be checked against the finding before execution.

---

## Finding #61: Visual UI verification needs item-level inspection, not gestalt impression

**Round:** Round 2 (foxworks-dispatch, 2026-04-30)
**Surfaced via:** Menu bar misdiagnosis after Zipper-1 manual gate
**Status:** Surfaced; pattern named for forward avoidance

### What happened

Operator launched `pnpm dev` and screenshotted the Electron app showing macOS menu bar with items: Electron · File · Edit · View · Window · Help. Chat-layer reviewed the screenshot and concluded "default Electron menu, C's wiring did not take effect" — Zipper-1 exit gate failed.

Subsequent triangulation (read menu.ts, read main.ts, check package.json scripts, check dist mtimes) confirmed source and build were clean. Item-level inspection of the File menu (one item: "Close Window") confirmed C's menu WAS active. The misdiagnosis cost multiple turns of investigation against a hypothesis that wasn't supported by available evidence.

### Pattern

Modern Electron apps and macOS default menus share top-level structural shape (File / Edit / View / Window / Help). Distinguishing custom menu from default requires inspecting *menu items*, not menu titles. The chat-layer reasoned from the gestalt impression of the screenshot ("looks like defaults") without specifying the discriminating feature being checked.

### Why it matters

UI verification claims that aren't grounded in falsifiable specifics produce confident wrong diagnoses. "Looks like default" is not falsifiable; "File menu has only Close Window vs. Electron default has multiple items" is. The first leads to wrong rabbit holes; the second leads to actual answers.

### Forward primitive

Visual UI verification claims must specify the discriminating feature being checked, not the gestalt impression. Format: "I expect to see X if Y is correct, and Z if Y is broken; what do you actually see for X?" Asking operator to inspect specific items (with named expected values) rather than describe the screenshot.

This applies to all manual-gate verification work where chat-layer is reasoning from operator-supplied screenshots or descriptions.

---

## Finding #62: Operator-arbitrated decisions need source-text surfacing pre-decision

**Round:** Round 2 (foxworks-dispatch, 2026-04-30)
**Surfaced via:** OPEN-Q-ZIPPER-1 paraphrase confusion
**Status:** Surfaced; pattern named for forward avoidance

### What happened

Chat-layer surfaced OPEN-Q-ZIPPER-1 to operator using a paraphrase: "Bottom drawer (chat panel attaches to bottom of main BrowserWindow) vs Separate BrowserWindow (chat panel as its own window)." Operator chose "bottom drawer."

Subsequent reading of the actual contract text revealed OPEN-Q-ZIPPER-1 was a more substantive question with three load-bearing sub-options (a) full bottom-drawer with resize UI, (b) separate BrowserWindow with full drawer deferred, (c) implicit hybrid that wasn't on the contract menu. Chat-layer's paraphrase had collapsed the nuance. Operator's "bottom drawer" choice mapped to (a) under literal reading but had ambiguity about scope expansion (resize UI inclusion). Required re-clarification turn.

### Pattern

Chat-layer operating from prompt-stub language about contract sections rather than the actual contract text produces paraphrases that lose load-bearing detail. The operator decides based on the paraphrase, then chat-layer reads the actual text and discovers the decision was made on incomplete framing.

### Why it matters

Operator-arbitrated decisions are §3.4 territory — they cannot be re-decided by chat-layer or CC sessions. A decision made on paraphrase is durable in commit history regardless of whether the paraphrase captured the real choice. Re-clarification is a discipline gap that surfaces only post-decision.

### Forward primitive

Any operator-arbitrated decision requires source-text surfacing pre-decision, not relay-paraphrase. Chat-layer commits to:
- Reading the actual contract text or document section before formulating the operator question
- Quoting the relevant text in the question itself, not paraphrasing
- If the source is too long for inline quoting, requesting operator run a single read-only command to surface the source, then formulating the question against that source

Same primitive applies to chat-layer's recommendations: a recommendation against the actual contract text is meaningfully different from a recommendation against chat-layer's recollection of the contract text.

---

## Finding #63: Automated gates verify contract; UX gates surface what contracts don't specify

**Round:** Round 2 (foxworks-dispatch, 2026-04-30)
**Surfaced via:** Zipper-2 manual gate styling discovery
**Status:** Surfaced; structural finding for round-contract authoring

### What happened

Round 2 produced 3 build sessions + 2 zipper sessions all shipping with: tests passing, typecheck clean, build clean, frozen exports honored, contract scope respected. By every automated gate, Round 2 was complete. Zipper-2's manual exit gate (operator launches `pnpm dev`, observes window) revealed:
- Wrapper architecture functional ✓
- IPC bridge functional ✓
- Splitter functional + persistent ✓
- **Chat panel renders without styling** — text bleeds into input field, no message bubbles, no role-based visual layout, no padding

The styling absence was contract-compliant — D's COARCH-T02 ticket scope was "UI scaffold only" with styling unspecified. But the visible product was not user-presentable. "Tests pass + contract met" did not equal "shipped" in any UX sense.

### Pattern

Round contracts written at the implementation-tactical layer (frozen exports, territory matrices, integration points) do not specify UX-quality criteria. Sessions execute the implementation-tactical scope correctly and the automated gates verify that correctness. UX-quality issues surface only at manual gates because they are outside the contract specification language.

### Why it matters

Two failure modes:
1. **Premature shipping:** "Tests pass" gets read as "shipped" without manual gate verification, and UX issues land in production.
2. **Manual-gate skipping:** Operator under time pressure skips manual gates because automated gates passed, missing the same UX issues.

The §3.7 halt-discipline primitive doesn't cover this case — sessions aren't violating halt; they're executing scope correctly within scope that didn't include UX criteria.

### Forward primitive

Round-contract authoring (operator-only, §3.4) should explicitly distinguish:
- **Implementation-tactical exit gates:** test pass, typecheck clean, build clean, contract scope met. CC-verifiable.
- **UX-quality exit gates:** manual operator launch with named verification criteria (visual specs, interaction tests, accessibility checks). Operator-only verifiable, must run before round close.

Both gate types must be cleared before round close. UX-quality gates that are not named in the contract become discovered manual checks (as in Round 2), which works but is inconsistent. Naming them upfront as part of the contract makes the close criteria deterministic.

For UI-rendering tickets specifically, "looks like X" is a valid acceptance criterion that lives in the manual-gate layer and requires operator visual reference (screenshot, Figma, named comparison product) at contract-authoring time.

## #64 — Relay-drafted ticket prompts that contradicted frozen vision; halt-discipline + §3.4 caught it before any code shipped (2026-05-02)

**Context.** During Batch 2 setup, the operator-Opus relay drafted three CC session prompts (CONSOLE-T01, CONSOLE-T02, COARCH-T04) by reading vision §10, §4.7 amendment, build-doc-schema-spec, and prior ADRs. The CONSOLE-T02 prompt's RED cluster 1 specified test directions that contradicted vision §10.7 — specifically, tests asserted `shell receives console:open from webview` while vision §10.7 specifies `console:open (shell → webview) — instruct webview to open a CC-console panel`. Two of five message-type directions were inverted in the prompt; three were correct.

**Detection.** Session B (CONSOLE-T02) opened, read vision §10.7 per the prompt's "read these documents before starting" instruction, read its own RED cluster 1 specification, detected the contradiction. Halted before writing any RED test, any production code, or touching any non-coord file. Wrote a halt ADR at `docs/adr/CONSOLE-T02-direction-halt.md` enumerating three resolution options labeled (a)/(b)/(c). Closed the session under §3.7 halt discipline with honest "0 of 4 clusters" framing.

**Resolution.** Operator arbitrated (a) Vision authoritative — vision §10.7 stays as ratified, the relay redrafts the ticket prompt to align tests with vision direction. The open-trigger source (what causes shell to emit `console:open`) becomes a CONSOLE-T03 design decision, likely a native menu entry under the existing application menu shipped by MB-T03.

**Cairn primitives validated.** The §3.4 frozen-contract primitive correctly placed authority with the operator-arbitrated vision §10.7 over the relay-drafted ticket prompt. The §3.7 halt discipline correctly fired — Session B did not infer past the contradiction, did not silently pick one direction, did not do "useful prep" while halted. The §3.1 anti-fabrication primitive worked at the session boundary — Session B treated vision text as authoritative ground truth and the relay-drafted prompt as untrusted-when-contradictory.

**Key learning: bidirectional fence applies to the operator-relay layer too.** Cairn primitives have previously been documented as defending the work from session mistakes (Round 1 Incident 8 shared-working-tree drift, multiple halt violations) and from operator mistakes (Round 1 misdirected-instruction incident). This finding documents that the same primitives defend against operator-relay mistakes — drafted ticket prompts, suggested batch compositions, recommended arbitrations. The operator-relay (Claude Opus, in this case) is not infallible and is not exempt from the fence. Sessions that read frozen contracts as authoritative correctly catch relay-introduced contradictions before they propagate into code.

**Anti-fabrication self-correction by the relay.** The relay (Opus) had vision §10.7 in its context window when drafting the CONSOLE-T02 prompt and inverted the direction anyway. This is a §3.1 violation at the relay layer: the relay treated its modeled understanding of "how IPC routing should work" as if it were grounded in the cited vision text. The model was wrong; the cited text said the opposite. Future relay drafting of ticket prompts that specify test directions against frozen vision/contract surfaces should explicitly cross-reference the vision text at draft time, not rely on the relay's modeled recall of it.

**Operational implication.** The 3-session-batch ratchet (validated KNOWN at Batch 1 close) holds despite this incident. B halted cleanly without polluting any other session's territory. A and C continued working unaffected. The degraded 2-session execution for the remainder of Batch 2 is a known fallback, not a discipline failure.

**Filed:** 2026-05-02 mid-Batch-2.


## #65 — Shared-working-tree drift on Session C session-start commit; cluster 1 GREEN attribution incorrect; disclosed but not remediated (2026-05-02)

**Context.** During Batch 2 execution, Session C (COARCH-T04) ran its session-start coord commit at `d5364ce` while Session A (CONSOLE-T01) had cluster 1 GREEN files staged or untracked in the shared working tree. Session C's commit absorbed three of Session A's CONSOLE-T01 territory files: `packages/dispatch-daemon/migrations/0002-cc-console-buffer.sql` (53 lines), `packages/dispatch-daemon/src/console/buffer.ts` (212 lines), `packages/dispatch-daemon/test/unit/migration-orchestrator.test.ts` (18-line modification). All three files are now attributed to "coord: COARCH-T04 session start" in git blame, instead of to a CONSOLE-T01 cluster 1 GREEN commit.

**Mechanism.** Session C used `git add -A`, `git add .`, `git commit -a`, or equivalent broad-staging command instead of explicit `git add docs/cairn-coordination/batch-1-spikes.md` per the per-path discipline named in the Batch 2 coord file (line 13: "Per-path git add mandatory. Pre-commit territory check via `git status --short` showing only own files"). Pre-commit territory check via `git status --short` would have revealed the cross-session files; either C did not run the check, or C ran it and proceeded anyway.

**Detection.** Session A detected the drift after Session C's commit landed on origin/main. A's cluster 1 GREEN had completed locally; the GREEN files were already on HEAD via C's commit. A's commit `cf4d29c` disclosed the violation in the commit message body and added one line to the coord file noting "lines 74" — but did not remediate via the Round 1 8-step drift recovery pattern (`git rm --cached` + re-stage under correct authorship is not possible post-push without history rewrite; a forward corrective commit was an option but was not chosen).

**Resolution path chosen.** Session A unilaterally chose "no revert; proceeding" without operator arbitration. Operator subsequently arbitrated Path 1 (accept and document) on relay's recommendation: history rewrite would require force-push that breaks in-flight CC session reasoning state; forward corrective commit adds noise without changing git blame; the `cf4d29c` disclosure is in the audit trail and discoverable. Functional behavior is correct (157/157 tests pass per A's verification). Authorship is wrong but trail-able.

**Cairn primitive failures.**

The §3.8 per-path-git-add primitive failed at action — Session C used a broad-staging command in violation of explicit per-path discipline named in the active coord file. The §3.8 pre-commit territory check primitive also failed — `git status --short` would have revealed cross-session files, but the check either did not run or was overridden.

The §3.7 halt-discipline primitive failed at the cf4d29c disclosure — Session A noticed the drift but did not halt-and-surface for operator arbitration on the response. The "no revert; proceeding" call belongs to operator under §3.4 (frozen contract / authority decisions), not to the session. A's honest disclosure was good; A's unilateral path-selection was a §3.7 violation.

**Cairn primitive successes.**

The §3.1 anti-fabrication primitive succeeded — Session A surfaced the drift honestly in `cf4d29c` rather than silently absorbing it. The disclosure made Path 1 (accept and document) viable instead of forcing a more disruptive remediation.

The §3.4 frozen-contract precedence held — operator (when surfaced) made the path-selection call, even retrospectively. Once the operator review-cycle reached this incident, arbitration occurred.

**Key learning: per-path discipline does not automatically hold across sessions sharing a working tree.**

Round 1 Incident 8 first surfaced the shared-working-tree drift pattern. Session A's behavioral pre-commitment to per-path git add propagated to Session B in Round 1 via cross-session coordination notes (validated cross-session methodology propagation). Round 2 held discipline cleanly. Batch 1 of v3 work held discipline cleanly across 3 spike sessions. Batch 2 broke discipline on the FIRST commit of the third session.

The pattern is not behavioral-pre-commitment; the pattern is structural enforcement OR repeated failure. Behavioral pre-commitment from Round 1 propagated for several sessions but eventually decayed. Future parallel-cairn batches need either:

1. Pre-commit hook that rejects any staging operation other than explicit per-path `git add <specific-path>`. Mechanical enforcement.
2. Worktree-per-session via `git worktree add` so each session's working tree is structurally isolated and `git add -A` only sweeps that session's files. Mechanical isolation.
3. Continued per-path discipline + accepted residual drift risk + standardized disclosure pattern. Behavioral-only, with `cf4d29c`-style disclosure as the safety net.

The relay (Opus) recommends option (2) for future parallel-cairn batches — `git worktree` provides structural isolation that scales to N sessions without per-session behavioral drift risk. Option (1) is a fallback if `git worktree` adoption has friction. Option (3) is the current state and has now produced one drift event in v3 work.

**Operational implication for the 3-session ratchet.**

Batch 1 close ratcheted 3-session production-typed parallel cairn from MODELED to KNOWN. Batch 2 produces evidence that the ratchet was premature. The KNOWN status applied to scenarios where per-path discipline holds; Batch 2 demonstrates that discipline does not automatically hold across sessions sharing a working tree without structural enforcement. The accurate ratchet status:

- 3-session production-typed parallel cairn under structural isolation (e.g., `git worktree`) — MODELED, no evidence yet.
- 3-session production-typed parallel cairn under behavioral per-path discipline only — MODELED with one drift event recorded; sustainable for short-duration batches but discipline decay observed.
- 2-session production-typed parallel cairn — KNOWN-validated, including under behavioral discipline only.

Future Batch 3+ planning should account for this. Parallel sessions of 3 or more should use `git worktree` per session unless the operator explicitly accepts the residual drift risk and standardizes the disclosure pattern from `cf4d29c`.

**Filed:** 2026-05-02 mid-Batch-2.


## #66 — Second relay-drafted ticket prompt contradicted frozen contracts (MB-T07); pattern of escalating divergence; cascade verification failure (2026-05-02)

**Context.** During Batch 5 setup, the operator-Opus relay drafted three CC session prompts (MB-T06, MB-T07, MB-T08). The MB-T07 prompt invented a REST proposal surface (`GET /v3/orchestrator/proposals`, `POST .../accept`, `POST .../reject`), a WebSocket proposal-stream protocol (`proposal:created`, `proposal:status-changed`, `proposal:removed`), a `Proposal` data shape, an "Orchestrator Proposals" lane, "Accept/Reject" pill naming, and an optimistic `proposed → in-progress → complete` status state machine. None of these surfaces exist in the frozen contracts or the frozen runtime schema. They contradict the frozen V3_TICKETS.md MB-T07 spec across 11 of 11 axes per Session B's halt ADR.

**Detection.** Session B (MB-T07) opened, read WORKSTATION_CONTRACT.md §5/§6/§7 + dispatch-core/src/v3/schema.ts + CONDUCTOR_API_CONTRACT.md §4.6 + V3_TICKETS.md MB-T07 per the prompt's "read these documents before starting" instruction, detected the contradiction across 11 axes. Halted before writing any RED test, any production code, or touching any frozen-contract file. Wrote a halt ADR at docs/adr/MB-T07-prompt-contract-divergence-halt.md enumerating the per-axis divergence + three resolution options. Closed under §3.7 halt discipline with honest "0 of 5 clusters started" framing.

**Resolution.** Operator arbitrated (a) contract authoritative — relay redrafts the prompt to align with frozen surfaces. The actual MB-T07 surface is IPC card events (orchestrator-card-rendered/-superseded/-update shell→webview; card-approved/card-declined/multi-choice-selected webview→shell) per WC §7.1, with audit-log writes via POST /v3/orchestrator/audit per WC §6.2 when operator clicks pills. CardOutput / MultiChoiceCardOutput shapes per dispatch-core/src/v3/schema.ts. Approve/Decline naming per WC §5.3. No dedicated PROPOSALS column per WC §5.5.

**Pattern: two relay-drafted prompts in two batches contradicted frozen contracts.** Finding #64 documented the first event (CONSOLE-T02 direction error, 2 of 5 axes wrong). This finding documents the second event (MB-T07 surface error, 11 of 11 axes wrong). Failure mode is escalating: 2/5 → 11/11. The relay's modeled understanding of v3 endpoint surfaces and IPC contracts is structurally unreliable.

**Cascade observation: relay verification commands also failed.** When the operator asked the relay to verify Session B's halt analysis, the relay ran a sed command with broken regex pattern that returned empty output for §5/§6/§7. The relay almost dismissed Session B's halt as fabricated section numbers before recognizing the regex error and verifying with a corrected grep command. Three layers of relay error in one sequence: original prompt drafted from modeled recall, verification command miscalled, empty output almost interpreted as evidence Session B was wrong. Anti-fabrication discipline must hold for verification commands too — empty results from a verification command are far more likely to mean the command is wrong than that the substance being verified is wrong.

**Cairn primitives validated.** §3.4 frozen-contract precedence correctly placed authority with WC §5/§6/§7 + v3/schema.ts + V3_TICKETS.md MB-T07 over the relay-drafted prompt. §3.7 halt discipline correctly fired. §3.1 anti-fabrication held at the session boundary.

**Mitigation: relay must read frozen contract sections and schema files at draft time.** Going forward, any relay drafting of a ticket prompt that touches a frozen contract surface MUST be preceded by a cat or sed-with-correct-line-ranges read of the actual frozen text, not by modeled recall. Two events in two batches puts the failure mode at predictable enough that the verification overhead is now load-bearing.

**Operational implication.** Sessions A (MB-T06) and C (MB-T08) are in different territories and unaffected. The redrafted MB-T07 fires after A and C close as a single-session worktree run on a fresh branch (session-B/mb-t07-redraft).

**Filed:** 2026-05-02 mid-Batch-5.

## Finding #67 — MB-F-CONSOLE-T03-XTERM-DEP-MISSING

**Date filed:** 2026-05-04
**Tier:** 1 (ship-gate blocker)
**Origin:** 2026-05-03 dogfood test, attempted `pnpm dev` from `packages/dispatch-workstation/`
**Discovered by:** Operator dogfood
**Resolution status:** Diagnosed; immediate workaround applied; permanent fix folded into batch-6 wiring.

**Symptom.** Production build of `dispatch-workstation` fails with `esbuild [ERROR] Could not resolve "@xterm/xterm"` from `src/console-panel/terminal-adapter.ts:28`. The dep is declared in `packages/dispatch-workstation/package.json:30` (`"@xterm/xterm": "^5.5.0"`) but `node_modules/@xterm/` does not exist in the workspace. Vitest unit tests pass because the dep is mocked; production esbuild bundle has no such mock and fails on the import.

**Root cause.** CONSOLE-T03 added the `@xterm/xterm` dep to `package.json` but `pnpm install` was never run after the change. The lockfile entry exists; the actual package was never materialized to `node_modules`. CI test runs hit the mocked path; no production-build verification step in the CONSOLE-T03 acceptance gate.

**Workaround (2026-05-03).** `cd ~/Desktop/Automata/foxworks-dispatch && pnpm install` materialized the dep. Production build then succeeded.

**Permanent fix.** Out of batch-6 scope. Recommend adding a CI step to the workstation package that runs `pnpm build` (not just `pnpm test`) on every commit, so missing-install issues fail at commit-time rather than dogfood-time. File as Tier 2 followup `MB-F-CI-PRODUCTION-BUILD-GATE` for v3.0 ship-gate batch.

**Methodology lesson.** Unit-test green is necessary but not sufficient. Production-buildable is a distinct gate. Per cairn project instructions §3.5, "tests green ≠ production-validated under composition" — this is the same primitive at the build layer.

**Confidence:** KNOWN (reproduced + workaround validated 2026-05-03).

---

## Finding #68 — MB-F-MB-T02-WEB-UI-URL-NO-DEV-PROD-SWITCH

**Date filed:** 2026-05-04
**Tier:** 1 (operator-blocking)
**Origin:** 2026-05-03 dogfood test, attempted to launch workstation against running Vite dev server
**Discovered by:** Operator dogfood
**Resolution status:** Existing followup `MB-F-MB-T02-PRODUCTION-LOADING` documents the gap; practical impact higher than original Tier; recommend escalation.

**Symptom.** `WEB_UI_URL` in `packages/dispatch-workstation/src/main/webview-loader.ts` is hardcoded to `http://localhost:7878`. To run the workstation against a Vite dev server (which binds 5173 by default), the operator must edit the source file, rebuild, and relaunch. There is no env-var override, no dev/prod mode switch, no config fallback.

**Root cause.** MB-T02 ratified the dev-only `loadURL('http://localhost:7878')` per contract §3.4 (IMPORTANT-5 operator resolution 2026-04-30). Production-mode loading was scoped out and filed as `MB-F-MB-T02-PRODUCTION-LOADING`. The followup framing assumed the gap was about production-mode resolution; the dogfood discovered the gap is also about dev-mode developer experience.

**Practical impact.** Any operator who wants to run the workstation against `pnpm dev` (Vite on 5173) cannot do so without editing source. Yesterday's dogfood test required hand-patching `webview-loader.ts` via sed, rebuilding, relaunching — multiple full-build cycles to test one config change.

**Recommendation.** Escalate `MB-F-MB-T02-PRODUCTION-LOADING` from current tier (Tier 2 implied) to Tier 1 ship-gate. Implementation: read `WEB_UI_URL` from `process.env.FOXWORKS_WEB_UI_URL` with fallback to existing hardcoded value. Single-line change in webview-loader.ts. Document in workstation-shell launch instructions.

**Confidence:** KNOWN (reproduced 2026-05-03; workaround required source edit).

---

## Finding #69 — MB-F-WORKSTATION-DEV-ORCHESTRATION-MISSING

**Date filed:** 2026-05-04
**Tier:** 2 (operator-experience)
**Origin:** 2026-05-03 dogfood test, attempted to launch full workstation stack
**Discovered by:** Operator dogfood
**Resolution status:** New finding; defer to v3.0 ship-gate batch or v3.1.

**Symptom.** No `pnpm dev:all` script or equivalent that starts daemon + Vite + workstation in correct order with correct config. Operator must launch each component manually in three+ terminals, in the right order, with the right config. Architecture is undocumented for new operators (or new sessions of existing operators).

**Root cause.** Each package has its own `pnpm dev` that does its own thing. There is no monorepo-level orchestration. The composition is operator-tribal-knowledge.

**Practical impact.** Yesterday's dogfood spent meaningful operator time juggling: kill old processes, start daemon, verify daemon, start Vite (on the right port), verify Vite, start workstation, verify the embedded webview loaded. Each step a separate command. Each step independently failable.

**Recommendation.** Add a `pnpm dev:all` script at monorepo root that uses concurrently or similar to spin up daemon + Vite + workstation in the right order with the right env vars. Document the architecture in `docs/GETTING-STARTED.md` (file already exists per repo inspection).

**Confidence:** KNOWN.

---

## Finding #70 — MB-F-PORT-COLLISION-IPV4-IPV6

**Date filed:** 2026-05-04
**Tier:** 2 (operator-fragile state)
**Origin:** 2026-05-03 dogfood test, port-collision diagnosis
**Discovered by:** Operator dogfood
**Resolution status:** New finding; root cause documented; permanent fix deferred to v3.0 ship-gate batch.

**Symptom.** Two processes can bind `localhost:7878` simultaneously on macOS via different protocols. Daemon binds IPv4 `127.0.0.1:7878`. A second process can bind IPv6 `[::1]:7878`. macOS treats them as different sockets. Whatever a `curl` resolves first wins. Daemon `/v2/health` returns 500 or empty when this happens.

**Root cause.** macOS allows IPv4/IPv6 dual-bind when sockets are created with default flags. Node's default `server.listen()` binds to whatever is configured; daemon binds IPv4-only by default. A second Node process binding the same port name with default settings binds IPv6. Both succeed at the OS level. Operator confusion follows.

**Practical impact.** Yesterday's dogfood: rogue Vite process bound `[::1]:7878` while daemon held `127.0.0.1:7878`. Daemon health checks failed intermittently. Diagnosis required `lsof -nP -iTCP:7878 -sTCP:LISTEN` to see both PIDs. Fix required `kill -9` on both, restart from scratch.

**Recommendation.** Daemon startup should bind both IPv4 AND IPv6 on the configured port (or fail-fast if either is unavailable). This prevents another process from sneaking in on the unbound protocol. Implementation in `packages/dispatch-daemon/src/lifecycle/startup.ts`. Cross-cutting with `MB-F-WORKSTATION-DEV-ORCHESTRATION-MISSING` (a `pnpm dev:all` orchestration would catch port-already-bound at startup, surfacing the conflict immediately).

**Confidence:** KNOWN.

---

## Finding #71 — MB-F-DISPATCH-WEB-AUTH-PERSISTENCE (escalation)

**Date filed:** 2026-05-04
**Tier:** 1 (escalated from existing followup)
**Origin:** 2026-05-03 dogfood test, "Daemon unreachable" red banner in workstation
**Discovered by:** Operator dogfood (existing followup, practical impact understated)
**Resolution status:** Existing followup `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` documents the gap; recommend escalation to Tier 1.

**Symptom.** When the workstation Electron BrowserWindow loads dispatch-web in the embedded webview, dispatch-web shows "Conductor authentication" screen on every fresh launch. Workstation main process correctly reads `~/.foxworks-dispatch/token` and sends `X-Conductor-Token` header on its own daemon calls (verified via curl); but dispatch-web webview runs in a separate Electron session context with its own cookie/session-based auth scheme and no token bridge from workstation main process to webview.

**Root cause.** dispatch-web was originally designed for browser-based access where the user logs in via a cookie/session flow. Workstation embeds dispatch-web as a webview but doesn't bridge the workstation's daemon-token auth into the webview's cookie/session expectation. Two auth schemes, no bridge.

**Practical impact.** Without auth bridge: kanban literally cannot render in the workstation. Dogfood-validated: red "Daemon unreachable" banner on every fresh workstation launch until auth bridge or session-cookie persistence is implemented.

**Recommendation.** Escalate to Tier 1 ship-gate blocker. Implementation options per the existing followup: (a) IPC token-injection at workstation launch from `~/.foxworks-dispatch/token`, (b) auth-bypass for workstation context, (c) accept as workstation onboarding step. (a) is cleanest but requires daemon-side dual-auth (cookie OR token header) AND workstation-side webview-preload that injects the cookie. File scope-detail followup if (a) selected.

**Confidence:** KNOWN.

---

## Finding #72 — MB-F-MB-T05-PATH-ALLOWLIST-CLAUDE-RESOLUTION

**Date filed:** 2026-05-04
**Tier:** 1 (ship-gate blocker)
**Origin:** 2026-05-03 dogfood test, spawn-from-workstation appears successful but produces no tmux session
**Discovered by:** Operator dogfood
**Resolution status:** Diagnosed + workaround validated. Permanent fix is batch-6 Session A scope.

**Symptom.** Operator clicks "+ Spawn Session" in workstation, fills modal, clicks confirm. Daemon record created; no corresponding tmux session. Reproducible 100% for any operator with claude installed outside `/opt/homebrew/bin`. Symptom-clear-but-cause-opaque from operator perspective: spawn appears to succeed (modal closes, no error toast), kanban shows armed-but-orphaned sessions, none active.

**Root cause.** `spawn-env.ts` `ALLOWLIST_PATH` excludes `~/.local/bin` (Anthropic's official installer location). Workstation `tmux new-session -d -s <name> -c <repoPath> claude` runs with this restricted PATH. tmux successfully creates the session (returns exit-0), then forks and tries to exec `claude` — fails because `claude` not in PATH. tmux session ends asynchronously after the workstation has already received exit-0 success. Daemon registration step proceeds based on (false) success signal. Daemon record created. tmux session orphaned.

**Reproduction (validated 2026-05-03).** `env -i PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin" tmux new-session -d -s testname -c <repoPath> claude` returns exit-0; `tmux list-sessions | grep testname` returns nothing 1 second later. Same command with full PATH (including `~/.local/bin`): session alive, claude running.

**Workaround (2026-05-03).** Sed-patched `ALLOWLIST_PATH` to prepend `$HOME/.local/bin`. Rebuilt workstation. Spawn-from-modal then created live tmux sessions. Validated end-to-end.

**Permanent fix (batch-6 Session A).** Resolve `claude` to absolute path via `which claude` at workstation startup. Pass absolute path to tmux argv. Bypass PATH lookup entirely. Spec'd in `MB-F-MB-T05-PATH-ALLOWLIST-CLAUDE-RESOLUTION` followup.

**Confidence:** KNOWN. Operator-environment-dogfood-validated. Symptom + reproduction + workaround all observed in single session.

---

## Finding #73 — MB-F-MB-T05-POST-SPAWN-LIVENESS-CHECK

**Date filed:** 2026-05-04
**Tier:** 1 (defense-in-depth)
**Origin:** 2026-05-03 dogfood test, root-cause analysis of finding #72
**Discovered by:** Operator dogfood (companion to #72)
**Resolution status:** Spec'd; permanent fix is batch-6 Session A scope.

**Symptom.** Even after fixing the PATH-allowlist bug (#72), the spawn handler architecture has no mechanism to detect post-spawn child-process death. The handler trusts `tmux new-session` exit-0 as proof of spawn success. tmux returns 0 once the session is created, before its child process attempts exec. If the child dies for any future reason (corrupt binary, license refused, immediate crash, future dep gap), the session ends asynchronously with no signal to the workstation. Daemon record orphaned silently. Same symptom shape as #72, different root cause.

**Root cause.** Architectural assumption that tmux exit-0 means program-running. False assumption. tmux exit-0 means session-created, nothing about the program inside.

**Recommended fix.** Post-spawn liveness verification: after `runTmuxNewSession` returns success, sleep 500ms, run `tmux has-session -t <sessionName>`. If has-session fails, throw `SpawnFailed('claude exited immediately — check binary installation')`. Daemon registration skipped via existing throw-cleanup path.

**Implementation status.** Spec'd in `MB-F-MB-T05-POST-SPAWN-LIVENESS-CHECK` followup; batch-6 Session A scope.

**Tradeoff note.** 500ms delay is heuristic. Adds 500ms to every spawn. Operator-impact minor (spawn is already a multi-second user action). A future ticket might tune with measured data; for v3.0 ship, the heuristic is sufficient.

**Confidence:** MODELED (root-cause analysis, not separately reproduced under non-PATH-bug failure modes).

---

## Finding #74 — MB-F-MB-T05-SPIKE-ENVIRONMENT-VALIDATION

**Date filed:** 2026-05-04
**Tier:** 2 (methodology)
**Origin:** 2026-05-03 dogfood retrospective on findings #72 + #73
**Discovered by:** Operator dogfood (methodology lesson)
**Resolution status:** Spec'd as ADR amendment; batch-6 Session A scope.

**Symptom.** MB-S02 spike — the basis for `spawn-env.ts` `ALLOWLIST_PATH` — was run on a system with claude installed via Homebrew at `/opt/homebrew/bin`. Allowlist baked into production code with the assumption that claude is at `/opt/homebrew/bin`. No spike step verified the assumption holds across operator install variations. The spike was true-but-incomplete.

**Root cause.** Spike methodology focused on validating the binding decision in the spike-runner's environment. Did not enumerate the install-method variation space. Did not validate the binding decision against alternate installs.

**Methodology lesson.** Spike evidence about operator-installed binaries needs validation across at least the documented install methods (Homebrew, official installer, manual install), not the spike-runner's environment alone.

**Binding decision.** Future spikes touching operator-environment-dependent assumptions MUST enumerate the install/configuration variations covered AND explicitly call out which are not. Spike ADRs MUST note any environment dependencies that could vary across operators.

**Implementation.** ADR amendment at `docs/adr/MB-S02-spike-environment-validation-amendment.md`. No code change. Cross-references findings #72 + #73.

**Confidence:** KNOWN (methodology lesson directly grounded in #72 evidence).

---

## Finding #75 — MB-F-DAEMON-SESSION-DELETE-ROUTE

**Date filed:** 2026-05-04
**Tier:** 2 (operator-experience, blocking cleanup workflows)
**Origin:** 2026-05-03 dogfood test, attempted cleanup of orphaned sessions from #72
**Discovered by:** Operator dogfood
**Resolution status:** New finding; permanent fix deferred (likely v3.0 ship-gate batch or v3.1).

**Symptom.** `DELETE /v2/sessions/:name` returns `{"error":"Not found"}` for sessions that exist in the daemon's `GET /v2/sessions` response. Operator cannot clean up orphaned daemon records via the documented API.

**Reproduction (2026-05-03).** With session `papapapapa` visible in `GET /v2/sessions` response (state=armed): `curl -s -X DELETE -H "X-Conductor-Token: $TOKEN" http://localhost:7878/v2/sessions/papapapapa` returns `{"error":"Not found"}`. Same for `pa`, `ddd`. All three remained in daemon DB.

**Possible root causes (untriangulated).** (a) DELETE route doesn't exist (route not implemented), (b) DELETE route exists but uses different URL pattern (e.g., needs query param, different verb), (c) The sessions are in some sub-table the DELETE handler doesn't query, (d) Auth check passing but route lookup failing because "killed" state required first.

**Practical impact.** Operator cannot clean up orphaned sessions through the API. Either need to manually edit `data.db` SQLite (unsafe, undocumented), OR live with the orphaned records (clutters kanban view, confuses subsequent dogfood).

**Recommendation.** Triage the daemon route table (`packages/dispatch-daemon/src/routes/`). Either fix the existing DELETE handler or document the actual cleanup workflow. Likely small scope (single route handler). File as Tier 2 followup for v3.0 ship-gate batch.

**Confidence:** KNOWN (symptom reproduced); root cause SPECULATIVE (multiple hypotheses, not triangulated).

---

## Finding #79 — MB-F-MB-T07-ORCHESTRATOR-OUTPUT-ROUTER-IMPORT-PATH

**Date filed:** 2026-05-04 (stub); RESOLVED 2026-05-04 at green commit cc89fa2.
**Tier:** 1 (ship-gate; workstation cannot launch)
**Origin:** 2026-05-04 post-batch-6-merge launch attempt
**Discovered by:** Operator dogfood
**Resolution status:** RESOLVED at cc89fa2 (red 8551f76 → green cc89fa2, operator §3.4 arbitration on dispatch-core build config).

**Symptom.** `pnpm --filter dispatch-workstation dev` builds cleanly but Electron throws `ERR_MODULE_NOT_FOUND` at runtime: `Cannot find module 'node_modules/dispatch-core/src/v3/schema.js'` imported from `dist/main/orchestrator-output-router.js`. Workstation never reaches main loop.

**Defect class.** Build-passes-but-runtime-fails. Same anti-fabrication failure pattern as cairn findings #67 (xterm dep declared but not installed) and the relay drafting failures B caught — TypeScript compilation succeeded, unit tests mocked the import, production module-resolution at runtime exposes the gap.

**Root cause (KNOWN, post-triage).** Two coupled defects:

1. `orchestrator-output-router.ts:26` (shipped by Session B at f8c57f7 GREEN) imports `OrchestratorOutputSchema` (a runtime VALUE, not type) from `'dispatch-core/src/v3/schema.js'`. TypeScript NodeNext resolution maps `.js`→`.ts` source at compile time, so `tsc` and vitest both succeed. At Electron runtime, Node ESM resolves the path literally — looking for `node_modules/dispatch-core/src/v3/schema.js` — but the symlinked workspace package's `src/` directory contains only `.ts` files. The compiled JS lives at `dispatch-core/dist/v3/schema.js`.

2. `dispatch-core/tsconfig.json` was missing `"declaration": true`, so `tsc` emitted `.js` for every src file but `.d.ts` only for a historical subset. `dist/v2/schema.d.ts` was a stale artifact from an earlier build configuration; v3 (added later) was never accompanied by `.d.ts` emission. This is what made the obvious one-line fix (flip import to `dist/v3/schema.js`) fail with `TS7016: Could not find a declaration file for module 'dispatch-core/dist/v3/schema.js'` — the runtime-correct path had no types.

The two defects compose: the workstation main process is the only consumer in the monorepo that runs as raw `tsc` ESM output via Electron. Every other consumer (dispatch-daemon, dispatch-web, dispatch-cli) is bundled by esbuild/vite/tsx and so the `src/.../*.js` import convention worked for them only because their bundlers resolve the path at build time. See finding #80 for the systemic followup.

**Fix.** Two coupled changes in green commit cc89fa2:
- `packages/dispatch-core/tsconfig.json` — add `"declaration": true`. Operator §3.4 arbitration: tsconfig.json is build configuration, not part of the frozen API contract; enabling declaration emission is operator-supervised mechanical translation that does not change the exported API surface.
- `packages/dispatch-workstation/src/main/orchestrator-output-router.ts:26` — flip import specifier from `dispatch-core/src/v3/schema.js` to `dispatch-core/dist/v3/schema.js`.

**Verification.**
- RED smoke test (8551f76: `test/integration/orchestrator-output-router-imports.test.ts`) reproduces failure pre-fix with exact `ERR_MODULE_NOT_FOUND` error; GREEN post-fix.
- `pnpm --filter dispatch-workstation dev` launches Electron, reaches WINDOW_READY sentinel in 3.05s, exits clean (verified via existing `app-launches-clean.test.ts`).
- 4-package typecheck regression scan: dispatch-core ✓, dispatch-daemon ✓, dispatch-cli ✓; dispatch-web has 2 pre-existing baseline errors unrelated to this fix (App.tsx:48, PanelErrorBoundary.tsx:36; `@types/react` `bigint`/ReactNode drift; verified by stash-and-rerun on baseline SHA 8551f76).
- v2 .d.ts shape preserved: 47 src exports → 47 dist .d.ts exports, identical names. v3 .d.ts: 72 src exports → 72 dist .d.ts exports (was 0 pre-fix).
- MB-T07 unit suite: 28/28 passed.

**Confidence:** KNOWN (root cause reproduced + fix verified 2026-05-04 across 4 packages).

**Methodology lesson.** Compounds finding #67's lesson: tests + tsc green ≠ production-validated under composition (project instructions §3.5). The bundler/no-bundler boundary is a hidden composition gate. Latent risk: any future unbundled consumer in this monorepo (a CLI binary shipping raw `tsc` output, a server worker, etc.) will recur this defect class until the systemic fix in finding #80 lands.

---

## Finding #80 — MB-F-SYSTEMIC-MONOREPO-UNBUNDLED-CONSUMER-FRAGILITY

**Date filed:** 2026-05-04
**Tier:** 2 (latent risk; no current ship-gate impact post-#79 fix)
**Origin:** Surfaced during finding #79 triage 2026-05-04
**Discovered by:** Triage of #79 (post-batch-6 dogfood)
**Resolution status:** New finding; systemic followup deferred to v3.0 ship-gate batch or v3.1.

**Symptom.** Every package in the monorepo uses the import convention `from 'dispatch-core/src/<subpath>/<file>.js'` for *value* imports (not just type-only). At runtime, Node ESM resolves these specifiers literally — looking for `node_modules/dispatch-core/src/<subpath>/<file>.js`, which does not exist (the symlinked workspace package's `src/` directory contains `.ts` only; compiled JS lives in `dist/`).

**Why this hasn't broken everywhere yet.** Three of the four consumer packages ship through bundlers that resolve the path at build time:
- `dispatch-daemon` — esbuild bundle (or `tsx` in dev) ✓
- `dispatch-web` — Vite ✓
- `dispatch-cli` — `tsx`/esbuild ✓
- `dispatch-workstation` main process — raw `tsc` output, loaded by Node ESM via Electron ✗

Workstation main was the canary because it's the only **unbundled Node ESM entrypoint** in the monorepo. Finding #79 patched it (the orchestrator-output-router.ts site that surfaced); the convention itself remains in 30+ other call sites across daemon/web/cli, where it works only because of the bundler.

**Latent call-sites (KNOWN, enumerated 2026-05-04 via `grep -rn "from 'dispatch-core" packages/`):**
- `packages/dispatch-daemon/src/migration/schema-v2.ts:48` — value import (`from 'dispatch-core/src/v2/schema.js'`)
- `packages/dispatch-daemon/src/state/transitions.ts:31` — value (`'dispatch-core/src/transport/tmux.js'`)
- `packages/dispatch-daemon/src/routes/v3/orchestrator-history.ts:21` — value (`OrchestratorHistoryQuerySchema`)
- `packages/dispatch-daemon/src/routes/v3/orchestrator-messages.ts:16` — value
- `packages/dispatch-daemon/src/routes/prompts.ts:26-28` — three value imports
- `packages/dispatch-daemon/src/routes/sessions.ts:27,32` — two value imports
- `packages/dispatch-daemon/src/routes/v3/tickets-state.ts:28` — value
- `packages/dispatch-daemon/src/routes/violations.ts:45` — value
- `packages/dispatch-daemon/src/routes/handoff.ts:27-28` — two value imports
- `packages/dispatch-daemon/src/routes/v3/orchestrator-audit.ts:22` — value
- `packages/dispatch-daemon/src/watchers/status-json.ts:39` — value
- `packages/dispatch-web/src/query/useHealth.ts:5`, `usePatchState.ts:10`, `usePostPrompt.ts:9`, `useSession.ts:5` — value
- `packages/dispatch-cli/src/commands/init.ts:2-3`, `send.ts:3-7`, `lib/tui-state.ts:43` — value
- `packages/dispatch-workstation/src/main/card-ipc.ts:22`, `http-daemon-client.ts:3` — type-only (silently safe)
- `packages/dispatch-workstation/test/unit/mb-t07/*.spec.ts` (3 files) — value, but vitest's resolver hides the bug at test time

**Practical impact.** Zero today (post-#79 patch). Latent: any future unbundled consumer — a standalone CLI binary, a server-side worker, an Electron renderer that bypasses esbuild, a cron-triggered Node script — will recur the same defect class.

**Defect class.** Cross-package "works only because of bundler" coupling. Convention-level latent fragility, not a localized bug. Same family as cairn finding #67 (xterm dep declared but not installed; tests + bundler hid the gap until production esbuild surfaced it).

**Recommendation (deferred — operator arbitration required before proceeding).** Two viable paths, listed least-to-most invasive:

1. **Migrate the convention monorepo-wide:** rewrite all `dispatch-core/src/.../*.js` value imports to `dispatch-core/dist/.../*.js`. Mechanical sed-style change across ~30 call sites. Each change is identical in shape to the #79 fix. Makes every consumer Node-ESM-resolvable without a bundler. Doesn't address the underlying convention-encourages-fragility issue but eliminates the latent risk surface.

2. **Add an `exports` map to dispatch-core/package.json** — a proper Node-conditional-export surface (`./v3/schema` → `dist/v3/schema.js` runtime + `dist/v3/schema.d.ts` types). Then consumers import from `'dispatch-core/v3/schema'` (no `src/`/`dist/` distinction). Cleanest long-term fix; affects the package surface and so requires §3.4 frozen-contract arbitration. Higher risk of ripple effects on existing imports.

3. **Bundle workstation main with esbuild** matching the pattern already used in workstation for shell/console-panel/preload/onboarding/card-bridge (see `packages/dispatch-workstation/package.json:11` build script). Isolated to workstation — doesn't propagate the fix to daemon/web/cli (they're already bundled). Useful only if more unbundled consumers are anticipated.

**Confidence:** KNOWN (call sites enumerated; runtime divergence at unbundled consumer reproduced via #79; bundler-vs-no-bundler boundary verified by inspection of build scripts in each package).

**Cross-references:** Resolved by composition with #79 (workstation now patched). #67 is the same defect-class precedent (build-passes-but-runtime-fails; mocks/bundlers/tests hide the gap until production composition surfaces it).

---

## Finding #81 — MB-F-DISPATCH-WEB-TYPES-REACT-BIGINT-REACTNODE-DRIFT

**Date filed:** 2026-05-04 (stub; full triage deferred)
**Tier:** 3 (latent baseline; no current ship-gate impact)
**Origin:** Surfaced during #79 regression scan 2026-05-04
**Discovered by:** #79 triage — 4-package typecheck regression scan
**Resolution status:** STUB — full triage deferred.

**Symptom.** `pnpm --filter dispatch-web typecheck` reports 2 errors:

```
src/App.tsx(48,22): error TS2322: Type '({ error, resetErrorBoundary, }: { error: Error; resetErrorBoundary: () => void; }) => ReactNode' is not assignable to type 'ComponentType<FallbackProps> | undefined'.
  Type '({ error, resetErrorBoundary, }: ...) => ReactNode' is not assignable to type 'FunctionComponent<FallbackProps>'.
    Type 'React.ReactNode' is not assignable to type 'import("/.../@types+react@18.3.28/...").ReactNode'.
      Type 'bigint' is not assignable to type 'ReactNode'.

src/components/PanelErrorBoundary.tsx(36,7): error TS2322: Type 'React.ReactNode' is not assignable to type 'import("/.../@types+react@18.3.28/...").ReactNode'.
  Type 'bigint' is not assignable to type 'ReactNode'.
```

**Verified pre-existing on baseline.** During #79 triage, ran `git stash && pnpm --filter dispatch-web typecheck` on baseline SHA 8551f76 (the RED commit, before any code change in #79). Same two errors reproduced. NOT caused by the dispatch-core `"declaration": true` change shipped at cc89fa2. Confirmed by re-running typecheck post-#79 on cc89fa2 — error shape identical.

**Likely root cause (SPECULATIVE).** `@types/react` version drift introduced `bigint` into the `ReactNode` union (visible in modern @types/react 18.3.x), but at least one consumer in dispatch-web's dependency graph still pulls a narrower `ReactNode` type that doesn't accept `bigint`. The error message points to a path through `node_modules/.pnpm/@types+react@18.3.28/...`, suggesting the resolution mismatch is between the React-error-boundary package's internal `FallbackProps` and dispatch-web's local `ReactNode`. May be a single `@types/react` version pin in dispatch-web's package.json, a workspace-level peerDependency mismatch, or a tsconfig `lib`/`types` adjustment.

**Triage required.**
1. Read `packages/dispatch-web/src/App.tsx:48` and `packages/dispatch-web/src/components/PanelErrorBoundary.tsx:36` — identify the `bigint`/`ReactNode` boundary.
2. Inspect `packages/dispatch-web/package.json` for `@types/react` version pin and `react-error-boundary` (or equivalent) dep version.
3. Run `pnpm why @types/react` from `packages/dispatch-web/` to enumerate type-resolution paths and version conflicts.
4. Determine whether fix is (a) type-cast at call site, (b) `@types/react` version pin alignment, (c) `react-error-boundary` version bump, or (d) tsconfig adjustment.
5. Likely 1–5 line fix; budget triage as fast-fix once a session is allocated.

**Practical impact.** Zero today. dispatch-web ships through Vite (per #80's bundler enumeration), and Vite + esbuild do not run TypeScript type-checking as a build gate. The errors only surface to operators running `pnpm --filter dispatch-web typecheck` explicitly. Production builds and runtime are unaffected.

**Confidence:** KNOWN (errors reproduced on both baseline 8551f76 and post-#79 HEAD cc89fa2 — confirmed not caused by #79 fix). Root cause SPECULATIVE pending dependency-graph triage.

**Cross-references:** Surfaced by #79 (regression scan). Independent of #79's defect class — that was a runtime resolution gap; this is a type-system declaration mismatch. No cross-package coupling like #80.

§10.5 self-check (docs-only commit):
1. API verified by spike? n/a — documentation only; no API touched.
2. Test exercises behavior or mocks? n/a — no test added; finding cites `pnpm --filter dispatch-web typecheck` as the reproduction command.
3. Implementation deleted, test still passes? n/a — no implementation.
4. Anything outside contract? no — finding documentation; no code change, no contract surface touched.
5. Modified contract? no.
6. Unlabeled claims? no — symptom KNOWN (reproduced on two SHAs), root cause SPECULATIVE (labeled).
7. Touched a file another session may modify? Q7 territory check against `git status`:
     modified: docs/cairn-findings.md
   Single file, append-only delta in the findings section. No parallel-session shared-tree concern.
8. Pre-push protocol? this is a docs-only commit closing the #79 triage session per operator scope ("documentation-only commit. No code changes. No further work after this commit"). No build/typecheck gate required for docs.
9. Confidence labeling matches evidence? yes — KNOWN for symptom + reproduced-on-baseline claim; SPECULATIVE for root cause; n/a labels on no-code self-check questions.


---

## Finding #82 — MB-F-CONSOLE-T03-OPERATOR-TRIGGER-UNREACHABLE

**Date filed:** 2026-05-04
**Tier:** 2 (meaningful defect — blocks operator-facing v3.0 console-panel-in-shell experience; cross-reference to existing followup `MB-F-CONSOLE-T03-MENU-SUBSCRIPTION`)
**Origin:** Batch-6 dogfood T3 (console panel inside shell) at HEAD 58140bd
**Discovered by:** dogfood operator session, live menu inspection of running workstation
**Resolution status:** PARTIAL-RESOLUTION at 320f707 (Fix-C green-bridge head) — wiring shipped + unit-test-and-helper-level GREEN; visual outcome blocked by newly discovered finding #89 (originally filed as #85 before parallel-session number collision with Fix-B's #85; renumbered — see Fix-C renumber commit). See Resolution section below.

**Symptom (KNOWN — observed live).** Workstation main HEAD 58140bd ships the full console-panel-in-shell wiring chain (`console:open-panel` IPC → `controller.openConsolePanel()` → `console:open` → shell visibility toggle → ConsolePanel React mount), but no operator-reachable trigger exists to fire it. Live verification (T3 dogfood):

1. Native menu `CC Console > [session]` enumeration on a running workstation returns exactly one disabled item: `[No sessions registered enabled=false]`. Verified via AppleScript UI introspection of the active Electron process.
2. `curl -H "x-conductor-token: ..." http://localhost:7878/v2/sessions` returns dozens of registered daemon sessions in the same wall-clock window. So the daemon-side data exists; only the workstation-side wiring to consume it is missing.
3. The renderer-side `consoleBridge` exposed by `preload.mts` (factory at `console-bridge.ts:78-90`) surfaces five subscription methods (onConsoleOpen/Close/StdoutChunk/Gap/Error) and two action methods (sendStdin, signal). It does **NOT** expose an `openPanel(sessionName)` action. So no renderer-driven path can trigger `console:open-panel` either.

**Root cause (KNOWN — code-confirmed).** `main.ts:200` calls `refreshConsoleMenu([])` exactly once at app start with a hardcoded empty session list. There is no code path that invokes `refreshConsoleMenu(<non-empty list>)` anywhere else in the workstation main process. No subscription to daemon `/v2/sessions` (HTTP poll or `/v2/events/stream` push) is wired. Comments at main.ts:108-111 explicitly acknowledge the gap and cite the followup.

**Practical impact.** Operator running v3.0 batch-6 workstation cannot open a console panel for any session through any UI surface. The full console-panel renderer (xterm + WebSocket reconnect logic + 240px tile region in shell) is built, bundled, and unreachable. Specifically:
- Native menu path (CONSOLE-T03 designed surface) — unreachable, menu hardcoded empty.
- Renderer-bridge path — does not exist; `consoleBridge` has no `openPanel` action.
- Spawn-auto-mount path — comment at workstation-shell.html:380-382 cites this as "future spawn-auto-mount path (batch 7+)"; not in batch-6 scope.
- Programmatic / smoke-harness — only stdin commands present in main.ts:262-368 are spawn/splitter/onboarding/chat related; no console-open command.

**Cross-references.** `FOLLOWUPS.md:131` `MB-F-CONSOLE-T03-MENU-SUBSCRIPTION` is the same defect class, already triaged Tier 2 with two recommended remediation options (HTTP poll vs `/v2/events/stream` subscription). This finding adds the dogfood-perspective evidence that the followup is genuinely unresolved at HEAD 58140bd (not merely tracked) and that the wiring chain past the menu is otherwise complete (so resolving the menu subscription should restore the full operator path).

**Recommendation (deferred — operator arbitration).**
1. **Resolve `MB-F-CONSOLE-T03-MENU-SUBSCRIPTION`** by wiring `/v2/events/stream` (per the followup's recommended option-b) into a `refreshConsoleMenu(sessions)` invocation. Single integration point in main.ts:200 region.
2. **Optional: also expose `consoleBridge.openPanel(sessionName)`** so a renderer-driven open path exists (e.g., per-session "Open console" button next to spawn UI). Lower priority — the menu path is the originally-designed surface.

**Confidence:** KNOWN. All three observations (menu enumeration, daemon session count, renderer-bridge surface lacking openPanel) are direct live or code-confirmed checks against HEAD 58140bd.

**§10.5 self-check (docs-only commit):**
1. API verified by spike? n/a — documentation only.
2. Test exercises behavior or mocks? n/a — finding cites live AppleScript UI introspection and live curl as the reproduction commands.
3. Implementation deleted, test still passes? n/a — no implementation.
4. Anything outside contract? no — documentation; no code change, no contract surface touched.
5. Modified contract? no.
6. Unlabeled claims? no — symptom KNOWN (observed live), root cause KNOWN (code-confirmed at main.ts:200), impact KNOWN (each path enumerated against source).
7. Touched a file another session may modify? no parallel session active in this dogfood pass; modified file: docs/cairn-findings.md, single append.
8. Pre-push protocol? docs-only; per-finding-file pattern; no build/typecheck gate required for docs.
9. Confidence labeling matches evidence? yes — KNOWN labels throughout, single dogfood-arbitration recommendation explicitly deferred.

### Resolution (2026-05-04, Fix-C session)

**Status:** PARTIAL-RESOLUTION at 320f707.

Wiring layer GREEN at the unit-test-and-helper level. Visual layer
blocked by newly discovered finding #89
(`MB-F-WORKSTATION-MENU-REBUILD-NO-OP`, originally filed as #85
before parallel-session number collision; renumbered post-merge).
The menu rebuild path through `Menu.setApplicationMenu` does not
propagate to the macOS menu bar after `app.whenReady` settles, so
the operator-trigger surface remains unreachable in production
despite Fix-C's wiring.

Fix-Batch-1 Session C on branch `fix-C/console-panel-trigger`.
Operator-arbitrated three-way parallel batch; Fix-A merged first
(commit `e6698d9`), Fix-B merged second (commit `05d9636`), Fix-C
rebased onto each merge in turn and is at HEAD `320f707` (last
green commit before the renumber-and-resolution-doc commits)
awaiting operator merge per scaffold §2 order.

**Fix-1 — menu subscription, green at c6d53bb** (red at fcc88ec, post-Fix-B-rebase SHAs).

New helper `subscribeConsoleMenuToDaemon(deps)` in
`packages/dispatch-workstation/src/main/console-mount.ts`. Hybrid
pattern (operator-arbitrated): bootstrap `GET /v2/sessions` populates
the menu with active session names (state ∉ {'killed','archived'});
WS `/v2/events/stream` consumed as a "something changed → refetch"
trigger because the daemon emits no `session_created`/`session_removed`
events on the bus (filed as cairn finding #91). Refetch debounced
150ms to collapse bursts of `state_changed`/`prompt_sent`/etc events
into a single fetch.

Refinements baked in per operator arbitration:
- Bootstrap-only fallback: if WS connect fails, the bootstrap fetch
  already populated the menu; no timer-based polling falls back.
- Burst debounce as described above.

Wired in `main.ts` `app.whenReady()` inside a CONSOLE_TRIGGER
sentinel-marked region per scaffold §1 function-body sentinel pattern,
immediately after the existing `refreshConsoleMenu([])` safety-net
call. Imports also sentinel-marked at top of file.

Unit-tested: 6 probes in
`test/unit/fix-console-trigger/test_menu_subscription.spec.ts`. Cover
bootstrap fetch + active-filter, debounce-after-WS-event,
debounce-of-burst, WS-failure-bootstrap-survives, dispose-cleanup.
All 6/6 GREEN.

**Fix-2 — consoleBridge.openPanel, green at 320f707** (red at 558228d, post-Fix-B-rebase SHAs).

`ConsoleBridge` interface (`console-bridge.ts:58-67`) gains
`openPanel(sessionName: string): Promise<void>`. Factory wires it to
`ipc.invoke('console:open-panel', {sessionName})`. The IPC channel
already existed at `console-ipc.ts:429-432` and routes to
`ConsoleIpcController.openConsolePanel(sessionName)` which accepts
arbitrary sessionName — no main-side change required. `preload.mts`
exposes the bridge via existing `contextBridge.exposeInMainWorld`
call; comment block updated to enumerate the new channel with
provenance.

Unit-tested: 4 probes in
`test/unit/fix-console-trigger/test_console_bridge_open_panel.spec.ts`.
Cover surface presence, invoke channel + payload shape, Promise
resolution, error propagation. All 4/4 GREEN.

**Integration verification.** Standalone node script imported
`dist/main/console-mount.js`, ran `subscribeConsoleMenuToDaemon`
against the live daemon (19 sessions, 1 active `newTest1`); helper
correctly invoked `refreshMenu(["newTest1"])` once on bootstrap. Live
Electron launch with diagnostic stderr instrumentation confirmed full
wiring chain fires inside `app.whenReady()`: HTTP fetch returns 200,
session filter selects `["newTest1"]`, `refreshConsoleMenu(["newTest1"])`
is invoked. AppleScript enumeration of the live "CC Console" submenu,
however, still reports `1 items: No sessions registered`. Diagnostic
edits since reverted; branch HEAD `320f707` is clean (at the green-bridge
commit, before docs filings). The discovered downstream defect is filed
as finding #89.

`consoleBridge.openPanel` surface is unaffected by #89 because it
bypasses the menu entirely — a renderer-side button calling
`window.consoleBridge.openPanel('newTest1')` would work today. No such
button exists yet (vision §10 designated the menu as primary).

**Followup status.** `MB-F-CONSOLE-T03-MENU-SUBSCRIPTION`
(FOLLOWUPS.md:131) is updated to PARTIALLY CLOSED with a cross-
reference to this resolution + finding #89. Closure is not full
because the followup's stated outcome ("operator-driven menu open
path actually surfaces sessions") still does not hold in production.

**Commits on `fix-C/console-panel-trigger`** (post-rebase onto Fix-B
merge `05d9636`, which itself sits on top of Fix-A merge `e6698d9`):

```
fcc88ec red(MB-F-#82-menu): console menu subscription
c6d53bb green(MB-F-#82-menu): subscribe menu to /v2/events/stream
558228d red(MB-F-#82-bridge): consoleBridge.openPanel method
320f707 green(MB-F-#82-bridge): wire openPanel to console-mount
```

Plus docs:

```
4f28aa7 docs(cairn): file finding #85 — Menu.setApplicationMenu post-ready no-op
e63c3c5 docs(cairn): finding #82 PARTIAL-RESOLVED + findings #87, #88
<this commit> docs(cairn): renumber Fix-C findings to #89/#90/#91 + refresh stale SHAs
```

Note: the commit subject lines for the two filing commits above use
the original numbers Fix-C drafted (#85, #87, #88). Those numbers
collided with Fix-B's #85 + #86 at merge time; this branch's filings
were renumbered to #89, #90, #91 in the third docs commit. Numbers
in this resolution body (and elsewhere in the doc) reflect the
renumbered values; commit-message subjects are immutable per
operator instruction.

---

## Finding #83 — MB-F-MB-T05-SPAWN-FAILURE-SILENTLY-SWALLOWED

**Date filed:** 2026-05-04
**Tier:** 1 (ship-gate blocker — operator cannot determine spawn success/failure for the primary v3.0 workstation flow)
**Origin:** Batch-6 dogfood T4 (spawn end-to-end via UI) at HEAD 3ac350e (post-finding-#82)
**Discovered by:** dogfood operator session, repeatable observation across three FILL_AND_SUBMIT_SPAWN attempts
**Resolution status:** New finding documenting dogfood-observed UX defect that composes the existing followup `MB-F-MB-T08-SPAWN-RESULT-SENTINEL` (smoke-harness sentinel followup) into an operator-facing ship-gate concern. The sentinel followup is currently scoped only to test-fixture observability; this finding broadens it to a production UX defect.

**Symptom (KNOWN — observed live).** Submitting the spawn modal triggers `workstation:spawn-requested` IPC, the main process processes it (success or error), and the renderer **never** subscribes to `workstation:spawn-result`. The modal closes via `closeSpawnModal()` immediately on click (workstation-shell.html:367) regardless of outcome. Operator-facing result: zero feedback on success or failure. Three reproducer paths:

1. **Cap-blocked spawn** (the path I hit). Daemon `/v2/sessions` returns 5 active (state='armed') sessions. `DEFAULT_SESSION_CAP = 5` (session-cap.ts:23). `checkSpawnCapacity` throws `SessionCapExceededError` synchronously — before tmux is touched. The error envelope returns via `workstation:spawn-result`. Renderer never sees it. Modal closed, no tmux session created, no daemon entry. Operator UX: identical to a no-op — modal flashed and closed.
2. **Daemon-unreachable**: per spawn-handler.ts:240-249, throws `DaemonUnreachable`. Same envelope path. Same silent UX.
3. **claude-bin not resolvable**: per spawn-handler.ts:260-266, throws `SpawnFailed`. Same.

**Root cause.** Renderer-side gap. `workstation:spawn-result` is only `event.sender.send`'d by `spawn-ipc.ts:297` and `:308`. No consumer in `workstation-shell.html`, no consumer exposed via `preload.mts:44-48` (`workstationBridge` exposes `requestSpawn` but no `onSpawnResult` handler). The "fire-and-forget UI" pattern was never closed.

**Compounding evidence (KNOWN — direct daemon inspection during dogfood).** Of the 5 daemon-armed sessions blocking the cap during T4, **only 1 has a backing tmux session**. The other 4 are orphans — daemon registry retains state='armed' for sessions whose tmux server has long since killed the session. Enumeration from `/tmp/dogfood-t4-sessions.json` snapshot:
```
tmux sessions actually alive: ['heytest6', 'newTest1']
daemon armed:
  ddd target=ddd:0.0 ... backed=False  (orphan)
  heytest target=heytest:0.0 ... backed=False  (orphan)
  newTest1 target=newTest1:0.0 ... backed=True
  pa target=pa:0.0 ... backed=False  (orphan)
  papapapapa target=papapapapa:0.0 ... backed=False  (orphan)
```
Four orphans, one alive. Cap counts orphans toward the limit because `isActiveSession` (session-cap.ts:103) only filters `'archived'` and `'killed'` states; an orphaned 'armed' record is fully counted. Combined with the silent-failure UX above: the operator hits the cap from accumulated orphans and has no way to discover why their spawn isn't working.

**Practical impact.** Tier-1 ship-gate concern. The spawn flow is v3.0 workstation's primary creation surface. An operator running batch-6 main HEAD encounters one of:
- Modal flashes closed, no session anywhere → silent cap-block (this dogfood)
- Modal flashes closed, tmux runs but daemon registration fails → orphan tmux + no UI evidence
- Modal flashes closed, daemon registers but tmux dies on exec → cairn #72-style ghost (already documented as cleaned up via `runTmuxHasSession` liveness check, but the UX failure mode persists if anything ELSE goes wrong)

Without renderer subscription to `workstation:spawn-result`, every failure mode is invisible. Even the success case is invisible — the operator has no UI confirmation that the session was registered.

**Recommendation (deferred — operator arbitration).** Three composable fixes:

1. **Subscribe to `workstation:spawn-result` in the shell** (workstation-shell.html, after spawnConfirmButton handler, line ~370). Surface success in a toast/inline status; surface error envelope's `error_type` + message via the same channel. Single integration point. Closes the silent-UX defect for all error paths simultaneously.
2. **Add `onSpawnResult` to `workstationBridge`** in `preload.mts` so the shell can subscribe via the contextBridge surface (mirrors the consoleBridge subscription pattern at console-bridge.ts:84-88). Lower-level dependency for #1.
3. **Daemon-side orphan reaper** — separate concern, but the cap-blocking-by-orphans symptom is its own defect class. Reaper could be a periodic `tmux has-session` sweep over armed sessions, or driven by /v2/events tmux-server-died signal. Out of workstation scope; would be filed against dispatch-daemon.

**Fix-ordering note.** The followup `MB-F-MB-T08-SPAWN-RESULT-SENTINEL` (smoke-harness.ts:85-88) is the same root cause framed as a test-observability gap. Recommend resolving it by composition with #1 above: once the renderer surfaces spawn-result, the smoke harness can read the surfaced state via DOM querySelector or a dedicated test-only sentinel emit. Both followups close in one shot.

**Confidence:** KNOWN.
- Symptom: directly observed three times in dogfood T4 (CLICK_SPAWN_BUTTON → SPAWN_MODAL_OPENED → FILL_AND_SUBMIT_SPAWN → no tmux, no daemon entry, no log evidence).
- Cap-block specifically: confirmed via /v2/sessions 5-active-armed snapshot and DEFAULT_SESSION_CAP = 5 cross-reference.
- Orphan count: confirmed via tmux ls vs daemon /v2/sessions diff (snapshot at /tmp/dogfood-t4-sessions.json).
- Renderer non-subscription: confirmed via grep of `workstation-shell.html` and `preload.mts` — no consumer of `workstation:spawn-result` exists.

**Cross-references.**
- `MB-F-MB-T08-SPAWN-RESULT-SENTINEL` (smoke-harness.ts:85-88) — same defect framed as test-observability; resolve in same patch
- Cairn #72 (PATH-allowlist resolution) — partial mitigation already shipped via `runTmuxHasSession` liveness check; addresses the tmux-died-on-exec case but does not surface the SpawnFailed result to the operator
- Cairn #73 (post-spawn liveness check) — adjacent ship pattern; same UX gap
- Vision §10.x spawn flow — primary v3.0 ship-gate surface; this finding directly impacts ship-gate readiness

**Resolution (Fix-B / batch fix-batch-1, 2026-05-04).**

**Status:** RESOLVED at green commit `07fae77`.

**What shipped:**
1. New helper `packages/dispatch-workstation/src/main/spawn-result-listener.ts` — pure function `attachSpawnResultListener(ipcLike, cb): cleanup`. Mirrors the testable seam pattern used by `console-bridge.ts:makeConsoleBridge` so the listener-attach logic is unit-testable without booting Electron.
2. `preload.mts` — `workstationBridge.onSpawnResult(cb): () => void` added inline within the existing object literal; runtime contract mirrors `coarchitectBridge.onStream*` (subscribe via `ipcRenderer.on`, return cleanup-fn).
3. `main.ts` — new Fix-B SPAWN_RESULT_SUBSCRIPTION sentinel region inside `createWindow()` registers a SECOND `console-message` listener forwarding only `SPAWN_RESULT_OK <sessionName>` and `SPAWN_RESULT_ERROR <error_type> <message>` sentinels under `MB_TEST_HOOKS=1`. Existing test-hooks forwarder untouched (per coordination scaffold §1 sentinel-region discipline).
4. `workstation-shell.html` — inline result banner (top-right, asymmetric dismiss: success auto-dismisses after 3s, error persists until Dismiss). Subscribes via `window.workstationBridge.onSpawnResult`. Emits the SPAWN_RESULT_* console sentinels in addition to surfacing the visible banner.

**LOC**: 217 added across 4 files (+128 in RED test). Core subscription work (helper + IPC wiring) ~30 LOC of code; remainder is the inline-banner UX surface (operator-acked separately as the minimum-viable fallback during diagnose-phase arbitration).

**Verification.**
- Unit tests (RED→GREEN): `test/unit/fix-spawn-result/test_spawn_result_subscription.spec.ts` — 5 cases pass (channel registration, success-payload propagation, error-payload propagation, cleanup-fn returned, repeated-cycle leak-free).
- Full unit suite: 84 files, 283 tests pass; no regressions introduced.
- Existing electron-integration test `test/integration/mb-t04/spawn-modal-opens.test.ts` passes (4.87s) — confirms renderer boots cleanly with new banner DOM and subscription.
- Live integration drive (ad-hoc, headless Electron with `MB_TEST_HOOKS=1` + `FOXWORKS_DAEMON_URL=http://127.0.0.1:1` + pre-marked onboarding state to bypass keychain): observed `SPAWN_RESULT_ERROR DaemonUnreachable Daemon token not found at ~/.foxworks-dispatch/token` propagated to stdout end-to-end. KNOWN evidence that the renderer subscription, the IPC roundtrip, and the main-process forwarder are all wired correctly.
- Build artifacts contain the wiring (3× references in `dist/main/preload.cjs`, 4× in `dist/main/main.js`, 21× in `dist/main/workstation-shell.html`).

**Success-path verification:** the unit test deterministically exercises the listener-side payload propagation for both `SpawnSuccessReply` and `SpawnErrorReply` shapes; live success-path drive requires a running daemon stack and a usable `claude` binary which the Fix-B worktree cannot reproduce headlessly. Manual operator drive of the success path is the v3.0 ship-gate validation surface and is part of the next dogfood pass.

**Smoke-harness followup `MB-F-MB-T08-SPAWN-RESULT-SENTINEL` (resolution scope adjustment).** Diagnose-phase operator ack confirmed Option A: ship the *enabler primitive* (sentinels emit + main forwards) and mark the followup RESOLVED with cross-reference to `07fae77`. Extending `smoke-harness.ts:spawnSession()` to `await` the new sentinels is a trivial follow-on (smoke-harness.ts is read-only per file-ownership scaffold §1; the harness's consumer side is the appropriate site for that wait). The "resolve in same patch" wording in the original Fix-B prompt was scope-slop; Option A preserves the file-ownership boundary and ships the unblocking primitive. Followup index updated in `FOLLOWUPS.md`.

**Orphan reaper (compounding evidence in original finding) — DEFERRED to new finding #85.** Daemon-side orphan-detection sweeper crosses the workstation→daemon repo boundary, requires deeper audit of state-machine concurrent-write semantics (`packages/dispatch-daemon/src/state/transitions.ts:96-104`), and realistic LOC including tests is 80–120 — over Fix-B's scope cap. Filed as finding #85 with the diagnosis surface from the diagnose-phase arbitration (state-machine path, lifecycle hook in `startup.ts`, idempotency + no-op-on-backed requirements). Operator may spin a Fix-D session for it.

**Toast/notification UX system — DEFERRED to new finding #86.** Operator pre-authorized the inline-banner-as-minimum-viable-surfacing in diagnose-phase ack. The shell currently has no general toast/notification system — the spawn-result banner is a one-off DOM/CSS surface. A proper toast system would be reusable across spawn-result, console-panel errors (currently `console.error` only), onboarding errors, and future card-approval feedback. Filed as finding #86 for a follow-up UX pass.

**Confidence:** KNOWN. Live integration drive observed the SPAWN_RESULT_ERROR sentinel propagate end-to-end; unit tests cover the listener seam deterministically; existing integration test confirms no regression in the modal-open path.

**§10.5 self-check (resolution append):**
1. API verified by spike? yes — pure-function listener helper unit-tested.
2. Test exercises behavior or mocks? exercises (unit + electron-boot integration + ad-hoc live drive).
3. Implementation deleted, test still passes? n/a — tests directly exercise the implementation.
4. Anything outside contract? no — files owned per coordination scaffold §1.
5. Modified contract? additively (`workstationBridge.onSpawnResult` added; existing surface unchanged).
6. Unlabeled claims? no.
7. Touched a file another session may modify? `preload.mts` shared with Fix-C — confirmed independence: Fix-B touches `workstationBridge`, Fix-C touches `consoleBridge`. Merge order A→B→C per scaffold §2.
8. Pre-push protocol? per-path `git add`; pre-commit `git status --short`; post-commit `git log -1 --stat`. RED + GREEN both pushed before resolution doc.
9. Confidence labeling matches evidence? yes — KNOWN per live observation + tests.

---

**§10.5 self-check (docs-only commit):**
1. API verified by spike? n/a — documentation only.
2. Test exercises behavior or mocks? n/a — finding cites three live dogfood reproductions + grep-confirmed renderer non-subscription.
3. Implementation deleted, test still passes? n/a.
4. Anything outside contract? no — documentation only; no code change.
5. Modified contract? no.
6. Unlabeled claims? no — all KNOWN; recommendation is explicitly deferred for operator arbitration.
7. Touched a file another session may modify? no parallel session active; single append to docs/cairn-findings.md.
8. Pre-push protocol? docs-only; per-finding-file pattern.
9. Confidence labeling matches evidence? yes — all four evidence components KNOWN with reproduction paths.

---

## Finding #84 — MB-F-COARCH-CHAT-CARD-FLOW-DISCONNECTED-IN-PRODUCTION

**Date filed:** 2026-05-04
**Tier:** 1 (ship-gate blocker — orchestrator card flow non-functional in production main HEAD)
**Origin:** Batch-6 dogfood T5 (orchestrator card flow) at HEAD df1f408 (post-finding-#83)
**Discovered by:** dogfood operator session, live STREAM_ERROR auth_error reproduction + code-confirmed wiring gap
**Resolution status:** RESOLVED at 2eaa0e1 (Fix-A green-B head) — see Resolution section below.

**Summary.** Two distinct wiring defects compose to block the v3.0 orchestrator card flow end-to-end. Either alone would block; together they make even the diagnostic path opaque. Cross-references existing followup `MB-F-COARCH-T04-BUILD-DOC-SETTINGS-UI` (build-doc settings UI), but per below, that followup as written would not resolve the production block — the build-doc-state persistence layer is itself non-functional in production.

### Defect A — safeStorage-persisted ANTHROPIC_API_KEY never loaded into main-process env

**Symptom (KNOWN — observed live).** Sending `TYPE_AND_SEND <prompt>` via stdin to a running workstation (with onboarding completed, `anthropic-api-key.enc` ciphertext present in userData) produces `STREAM_ERROR auth_error` immediately. Reproduced this dogfood session.

**Root cause (KNOWN — code-confirmed).** `anthropic-client.ts:91-98` `createAnthropicClient()` reads `process.env['ANTHROPIC_API_KEY']` directly and returns `null` if absent. There is **NO** code path in the workstation main process that decrypts the `anthropic-api-key.enc` ciphertext via `safeStorage.decryptString()` and assigns the result to `process.env['ANTHROPIC_API_KEY']`. The decryption happens exactly once — at `spawn-ipc.ts:203` — solely for populating the **spawned session's** tmux env, not the main process's chat-client env.

**Operator UX.** Operator completes onboarding (encrypts + persists key), workstation launches, operator types in chat. Chat panel surfaces "Invalid API key. Check the ANTHROPIC_API_KEY environment variable." (anthropic-client.ts:72). Operator has no way to know what to do — they DID enter the key during onboarding.

**Workaround that production-shipped install would not surface.** Setting `ANTHROPIC_API_KEY=...` in the parent shell before launching Electron makes chat work — but this is dev-mode-only. A production-packaged Electron app launched from Finder/Dock has no shell parent and no way to receive env vars.

### Defect B — build-doc state directory not resolvable in production

**Symptom (KNOWN — code-confirmed).** `coarchitect:setBuildDocConfig` IPC handler is silently a no-op in production. Even if the operator constructs a payload via DevTools (per the existing followup workaround at `MB-F-COARCH-T04-BUILD-DOC-SETTINGS-UI:120`), the persistence write fails silently and the config is never readable.

**Root cause (KNOWN — code-confirmed).** `build-doc-state.ts:17-30` — `stateDir()` reads three env vars in order:
```
process.env['MB_BUILD_DOC_STATE_DIR']        // tests only
process.env['MB_WORKSTATION_USERDATA']       // not set anywhere
process.env['MB_APP_USERDATA']                // not set anywhere
```
None of these env vars is set by any production code path (verified via grep across `packages/dispatch-workstation/src/`). Result: `stateDir()` returns `''`, `statePath()` throws "Build-doc state dir not configured", `readBuildDocConfig()` catches and returns null, `writeBuildDocConfig()` catches and silently swallows.

The comment at `build-doc-state.ts:21` ("Electron sets this env before main.ts loads when running in test context") is misleading — it suggests Electron handles it in some context, but only the test fixture at `test/unit/coarch-t04/build-doc-state.spec.ts:29` ever sets `MB_BUILD_DOC_STATE_DIR`. Production has no fallback to `app.getPath('userData')`.

**Operator UX.** Even if Defect A is patched (env var manually set), `routeOrchestratorOutput` requires the orchestrator system prompt to fire on the chat stream. The system prompt is loaded only when `buildDocConfig` is non-null (coarchitect-ipc.ts:123). Since `readBuildDocConfig()` always returns null, the chat falls through to `streamMessage(content)` — plain LLM call, no orchestrator system prompt — and the model's response is text not CardOutput JSON. `routeOrchestratorOutput` parses it as `text-passthrough`. **No card is ever emitted.**

### Composed impact

End-to-end: an operator running a production-packaged v3.0 workstation will see the chat panel return "Invalid API key" (Defect A). If they overcome that via dev-mode env var, the chat will stream prose responses with **no cards** (Defect B). The orchestrator card flow ship-gate is non-functional in production.

The kanban UI itself (dispatch-web) likely still renders existing cards from the daemon's persisted state, so spawning a fresh kanban WITH PRE-EXISTING DATA is not affected. But the v3.0 vision §10 promised flow ("operator types prompt → card appears in kanban → operator approves → audit row written") is broken from chat-input forward.

### Recommendation (deferred — operator arbitration)

Three composable patches:

1. **Defect A fix** (single-site): in `main.ts` after `app.whenReady()`, decrypt `anthropic-api-key.enc` via `loadApiKey({ configDir: configDir(), safeStorage })` (api-key-storage.ts:55) and assign result to `process.env['ANTHROPIC_API_KEY']`. Mirror the spawn-ipc pattern. ~10 LOC.
2. **Defect B fix** (single-site): in `build-doc-state.ts:17-23`, add a fourth fallback after the three env vars: `app.getPath('userData')` from Electron. Requires importing Electron `app` (top-level import, no functional change to test path because env vars take precedence). Test isolation preserved by env-var-precedence-over-Electron-app pattern. ~5 LOC.
3. **Optional follow-on (out of scope here)**: ship the `MB-F-COARCH-T04-BUILD-DOC-SETTINGS-UI` renderer UI — that's a separate ticket but would only become useful AFTER #2 lands.

### Confidence

- **Defect A symptom:** KNOWN (live STREAM_ERROR auth_error reproduction this session via TYPE_AND_SEND on an onboarding-completed workstation).
- **Defect A root cause:** KNOWN (grep across `packages/dispatch-workstation/src/main/` confirmed only spawn-ipc.ts:203 decrypts; no setter on `process.env['ANTHROPIC_API_KEY']` exists).
- **Defect B symptom:** MODELED (no operator-reachable path tested due to A blocking first; defect inferred from code reading).
- **Defect B root cause:** KNOWN (build-doc-state.ts:17-30 cross-referenced with grep for the three env vars across all production code).
- **Composed impact:** MODELED — extrapolated from A KNOWN and B MODELED. Would become KNOWN once a workstation runs end-to-end with both defects in scope.

### Cross-references

- `MB-F-COARCH-T04-BUILD-DOC-SETTINGS-UI` (FOLLOWUPS.md:120) — assumes "operator calls bridge from DevTools" works as workaround. It does not (Defect B blocks the underlying persistence).
- Onboarding flow #83 cross-reference: similar disconnect-between-persistence-and-consumer pattern.
- Cairn #67 / #80 (bundler-vs-no-bundler hides defect class) — same theme: tests pass, production fails. Here: tests pass because they set MB_BUILD_DOC_STATE_DIR; production fails because nobody does.

**§10.5 self-check (docs-only commit):**
1. API verified by spike? n/a — documentation only.
2. Test exercises behavior or mocks? n/a — finding cites live TYPE_AND_SEND reproduction (Defect A) + code reading (Defect B).
3. Implementation deleted, test still passes? n/a.
4. Anything outside contract? no — documentation only.
5. Modified contract? no.
6. Unlabeled claims? no — KNOWN/MODELED labels applied per evidence quality.
7. Touched a file another session may modify? no parallel session active; single append to docs/cairn-findings.md.
8. Pre-push protocol? docs-only; per-finding-file pattern.
9. Confidence labeling matches evidence? yes — Defect A KNOWN, Defect B mostly KNOWN with MODELED on composed-impact extrapolation.

### Resolution (2026-05-04, Fix-A session)

**Status:** RESOLVED at 2eaa0e1.

Both defects fixed via Fix-Batch-1 Session A on branch
`fix-A/orchestrator-card-flow`. Operator-arbitrated three-way parallel batch;
Fix-A merged first per scaffold §2 merge order.

**Defect A — green at 668cd1b** (red at ce990d7).

New module `packages/dispatch-workstation/src/main/api-key-bootstrap.ts`
exports `bootstrapApiKey({ configDir, safeStorage })`. It calls the existing
`loadApiKey` from `api-key-storage.ts` and, when the result is a non-null
plaintext, assigns it to `process.env['ANTHROPIC_API_KEY']`. Wired in
`main.ts` `app.whenReady()` inside a sentinel-marked region per scaffold §1
function-body sentinel pattern, before `registerIpcHandlers()` so the chat
IPC handler is registered against a populated env. Dev-shell parity
preserved: when `process.env['ANTHROPIC_API_KEY']` is already set, bootstrap
is a no-op (mirrors `spawn-ipc.ts:200-208 readApiKey` precedence).

Unit-tested: 4 specs in
`test/unit/fix-orchestrator-flow/test_api_key_bootstrap.spec.ts`. Cover
present-key, absent-key, env-precedence, encryption-unavailable.

**Defect B — green at 2eaa0e1** (red at 8e1a807).

`packages/dispatch-workstation/src/coarchitect/build-doc-state.ts`
`stateDir()` now adds Electron `app.getPath('userData')` as a fourth
fallback after the three legacy env vars. Pattern mirrors `splitter-state.ts`
which has used `env-or-userData` since initial ship. Env-var precedence
preserved so `test/unit/coarch-t04/build-doc-state.spec.ts` continues
passing (verified: 4/4 still green).

Unit-tested: 3 specs in
`test/unit/fix-orchestrator-flow/test_build_doc_state_fallback.spec.ts`.
Cover write-to-userData, read-back, env-override-still-honored. Uses
`vi.mock('electron')` so the unit test stays node-only.

**Path correction (scaffold §1).** The fix-batch-1 coordination scaffold at
`docs/cairn-coordination/fix-batch-1/00_COORDINATION_SCAFFOLD.md` listed
Defect B's owned file as `packages/dispatch-workstation/src/main/build-doc-state.ts`;
the actual file lives at
`packages/dispatch-workstation/src/coarchitect/build-doc-state.ts`.
Operator-arbitrated and authorized at the diagnose-phase HALT gate. The
scaffold-§1 ownership table should be corrected in a followup edit.

**Integration verification (live, this session).**

Two live smoke runs against built `dispatch-workstation/dist/main/main.js`,
launched via the `electron-process-controller.ts` headless pattern with
`MB_TEST_HOOKS=1` and **`ANTHROPIC_API_KEY` explicitly unset** in the spawn
env (so the bootstrap is the only resolution path):

1. **Defect A runtime smoke.** Onboarding skipped (prior dogfood
   `workstation-config.json` `onboardingCompleted=true` honored, persisted
   `anthropic-api-key.enc` from `$CONDUCTOR_DOGFOOD_API_KEY` reused).
   `SHELL_READY` → `TYPE_AND_SEND` → `STREAM_START` → `STREAM_DONE` with
   real Anthropic prose response. **No STREAM_ERROR auth_error.** Bootstrap
   verified end-to-end: only safeStorage→process.env decryption could have
   produced a working chat in this configuration.

2. **Defect B runtime smoke.** Pre-seeded
   `~/Library/Application Support/Electron/build-doc-config.json` pointing
   at the spike fixture
   (`packages/dispatch-workstation/spikes/MB-S01/fixtures/build-doc.build.md`,
   `repoRoot=<worktree root>`). Same launch shape; `TYPE_AND_SEND` carrying
   the spike fixture's S-01-01 triggering event for ticket MB-T05.
   `STREAM_DONE` prefix observed:

       ```json
       {
         "output_type": "action",
         "action_type": "spawn-new-session",
         "target_repo": "/Users/josh/Desktop/Automat...

   This is unambiguously orchestrator-shaped JSON, proving the full pipeline
   resolved end-to-end: `readBuildDocConfig()` returned the seeded config
   via the **userData fallback** (no env vars set in spawn env →
   `app.getPath('userData')` was the resolving branch); `readBuildDoc()`
   loaded the fixture; `loadSystemPrompt()` returned the orchestrator
   prompt; `buildContext()` ran; the model emitted structured output.

   Strict caveat: the model selected `output_type: "action"` for the
   prompt rather than `card` / `multi-choice-card`. Per
   `orchestrator-output-router.ts`, only `card` / `multi-choice-card`
   variants emit `orchestrator-card-rendered` to the kanban webview. So
   the *kanban-card-renders* link of the chain is not directly observable
   from this run — but every preceding link (chat→orchestrator→structured
   output) is alive and working. The card-vs-action choice is
   prompt/model territory, not a defect; the spike fixture's S-01-01
   `expected_output_type: card` does not contractually bind the model on
   this prompt shape. Card emission is verifiable separately by varying
   the prompt or by inspecting the routing predicate; it is **not** what
   #84's two defects blocked.

3. **State restored.** Pre-seeded `build-doc-config.json` removed at smoke
   exit; userData returned to its pre-smoke state (only the prior
   `anthropic-api-key.enc` and `workstation-config.json` retained).

**Composed impact relief.** With both fixes applied, the v3.0 §10 promised
flow ("operator types prompt → card appears in kanban → operator approves
→ audit row written") is now persistence-layer-functional from
chat-input forward. The remaining ship-gate gap — operator-reachable UI
to seed the build-doc-config — is followup
`MB-F-COARCH-T04-BUILD-DOC-SETTINGS-UI` (FOLLOWUPS.md:120), explicitly
called out in this finding's §Recommendation 3 as out-of-scope. With
#84 fixed, the DevTools workaround that followup assumes (
`coarchitect:setBuildDocConfig` IPC) now actually persists. Until the UI
ships, operators must seed via DevTools or a direct JSON write to
userData (as this session's smoke #2 demonstrated).

**Cairn methodology delta — surfaced for codification consideration.**

The two defects share a symptom shape: persistence-layer wiring shipped
without the consumer-side bootstrap. Onboarding wrote `anthropic-api-key.enc`
but no boot-time loader. `setBuildDocConfig` IPC handler shipped but no
production-resolvable `stateDir()`. Both pass unit tests because the unit
tests inject the missing piece (env var, fake safeStorage). Production
fails silently. This pairs with cairn #67 / #80
(bundler-vs-no-bundler hides defect class). Codification candidate: a
pre-merge "production env smoke" gate that exercises the persistence
round-trip without test-only env vars set.

**Files changed by Fix-A.**

Added:
- `packages/dispatch-workstation/src/main/api-key-bootstrap.ts` (47 LOC)
- `packages/dispatch-workstation/test/unit/fix-orchestrator-flow/test_api_key_bootstrap.spec.ts` (100 LOC)
- `packages/dispatch-workstation/test/unit/fix-orchestrator-flow/test_build_doc_state_fallback.spec.ts` (116 LOC)

Modified:
- `packages/dispatch-workstation/src/main/main.ts` (+11 LOC, sentinel-bracketed import + call inside `app.whenReady()`)
- `packages/dispatch-workstation/src/coarchitect/build-doc-state.ts` (+8 / −5 LOC)

Total: ~277 LOC net additions, of which 216 LOC are unit tests.

**Confidence after fix.** Defect A: KNOWN-fixed (live smoke without
env-var bypass demonstrates bootstrap is the only path that could have
worked). Defect B: KNOWN-fixed (live smoke shows production-path
`readBuildDocConfig` resolving via userData → orchestrator system prompt
loaded → structured output emitted). Composed impact: KNOWN — chat→
orchestrator pipeline alive end-to-end, kanban-card render observable
once prompt/model emit a card variant.

---

## Finding #85 — MB-F-DAEMON-ORPHAN-REAPER

**Date filed:** 2026-05-04
**Tier:** 2 (operator-experience defect; compounds finding #83 cap-block UX, but the cap symptom is recoverable manually via `tmux kill-server` + daemon DELETE)
**Origin:** Deferred from finding #83 Fix-B diagnose-phase arbitration (operator-acked, 2026-05-04)
**Discovered by:** Fix-B / batch fix-batch-1 diagnose-phase scope assessment
**Resolution status:** OPEN — operator may spin Fix-D to close.

**Symptom (KNOWN — direct dogfood T4 inspection during finding #83).** The daemon retains `state='armed'` records for sessions whose tmux server has long since killed the underlying session. Of 5 daemon-armed sessions blocking the spawn cap during dogfood T4, only 1 had a backing tmux session — 4 were orphans (`ddd`, `heytest`, `pa`, `papapapapa`). `isActiveSession` (session-cap.ts:101-104) only filters `'archived'` and `'killed'` states, so orphaned `'armed'` records count fully toward `DEFAULT_SESSION_CAP=5`. The compounding UX with #83 (silent spawn failure) means the operator hits the cap from accumulated orphans and has no way to discover why their next spawn isn't working.

**Root cause.** No daemon-side mechanism exists to detect that a registered tmux target has died. The daemon learns about session death only through explicit DELETE on `/v2/sessions/<name>` or via state transitions driven by another component. Tmux server crashes, OS reboots, or out-of-band `tmux kill-session` invocations leave the daemon record stranded.

**Diagnosis surface for the fix (assembled during Fix-B diagnose phase).**

- **State machine path.** `armed → killed` is a valid transition per `packages/dispatch-daemon/src/state/transitions.ts:96-101`:
  ```
  armed: ['paused', 'held', 'killed']
  ```
  Synthesizing a `killed` transition for an orphan would route through the existing transition validator at `transitions.ts:143+`. No new state required.
- **Lifecycle hook location.** `packages/dispatch-daemon/src/lifecycle/startup.ts` — the reaper would register a periodic timer here on daemon startup and tear it down in `shutdown.ts`. Mirrors the pattern other lifecycle hooks already use.
- **Detection mechanism.** Per orphan candidate (each `state='armed'` session in the registry), execute `tmux has-session -t <tmux_target>`; non-zero exit indicates the tmux session is gone. `dispatch-workstation/src/main/spawn-ipc.ts:138-140` (`defaultRunTmuxHasSession`) provides a working precedent for the call shape; daemon side would likely use `node:child_process.execFile` directly.
- **Idempotency requirement.** Reaper must not double-transition: a record already in `'killed'` (or `'archived'`) skips the check. The `isActiveSession` filter at `session-cap.ts:101-104` is the right predicate to mirror.
- **No-op-on-backed requirement.** `tmux has-session` exit-0 means the session is alive — no transition. Only exit-non-zero with classifiable "session not found" stderr triggers the transition.
- **Cadence.** Suggested interval: 30–60 seconds. Faster than spawn-cap-block recovery time, slower than tmux startup latency (which is sub-second on macOS — no risk of a brief startup race classifying a just-spawned session as orphan provided cap-check + tmux `new-session` complete inside the cadence window).
- **Fault tolerance.** Per-session `tmux has-session` failures unrelated to "session not found" (e.g., tmux server crash, exec failure) must NOT trigger a transition — log and skip. The reaper fail-closed semantics: when in doubt, leave the record alone; a stale orphan is a smaller defect than an incorrectly-killed live session.
- **Realistic LOC.** 80–120 including tests covering: orphan detection on dead target, no-op on backed target, no-op on already-killed record, idempotency across cadence ticks, stderr-classification branches, integration test against a real ephemeral tmux session.

**Why deferred.**
1. **Cross-repo scope.** Finding #83 is workstation-internal IPC plumbing; the reaper is dispatch-daemon territory. Bundling them inflates Fix-B's blast radius.
2. **Concurrent-write semantics.** Daemon state mutations come from multiple sources (HTTP routes, websocket events, lifecycle hooks). Adding a third mutator (the reaper) deserves a deeper audit than a fast-fix permits — write ordering, transaction boundaries, observable race windows under concurrent spawn + reap.
3. **LOC budget.** Fix-B's 50-LOC core-fix cap precludes adding 80–120 LOC of daemon code + tests inline.

**Cross-references.**
- Finding #83 (Fix-B parent) — silent spawn UX, resolved at `07fae77`. The reaper would address the cap-blocking-by-orphans symptom that compounded #83 in dogfood T4.
- Cairn #72 (PATH-allowlist resolution) — workstation-side `runTmuxHasSession` precedent for the call shape; reaper would adopt the same exit-classification heuristic.
- `packages/dispatch-daemon/src/state/transitions.ts:96-101` — state machine path.
- `packages/dispatch-daemon/src/lifecycle/startup.ts` — lifecycle hook location.

**Recommendation.** Operator may spin a Fix-D session targeting this finding. Suggested commit grammar: `red(MB-F-#85-reaper)`, `green(MB-F-#85-reaper)`. Suggested test directory: `packages/dispatch-daemon/test/unit/orphan-reaper/` with at least an integration spec exercising a real ephemeral tmux session.

**Confidence:** KNOWN.
- Symptom: directly observed in dogfood T4 (4 orphans of 5 armed sessions).
- State-machine path: verified at `transitions.ts:96-101`.
- Lifecycle hook location: verified by file enumeration in `lifecycle/`.
- LOC estimate: MODELED — based on cohort of similar daemon features.

---

## Finding #86 — MB-F-WORKSTATION-SHELL-NO-TOAST-SYSTEM

**Date filed:** 2026-05-04
**Tier:** 2 (operator-experience defect; ergonomic gap, not a ship-gate blocker)
**Origin:** Deferred from finding #83 Fix-B diagnose-phase arbitration — operator pre-authorized the inline-spawn-result-banner fallback during Fix-B with explicit instruction to file a separate finding for proper toast UX
**Resolution status:** OPEN — UX follow-on.

**Symptom (KNOWN — observed during Fix-B diagnose phase).** The Foxworks Workstation shell (`packages/dispatch-workstation/src/main/workstation-shell.html`) has no general-purpose toast/notification surface. The existing UX patterns are limited to:
1. **Modal show/hide** — used for the spawn modal and onboarding modal. Heavy-weight; blocks operator interaction.
2. **Region display flip** — used for the console-tile region. Single-instance (one panel visible at a time).
3. **`console.log` / `console.error`** — invisible in production (only forwarded via `MB_TEST_HOOKS=1`).
4. **(post-Fix-B) Inline result banner** — single-instance, hand-rolled top-right DOM element specifically for `workstation:spawn-result`. Not generalized for other event sources.

When a fix needs to surface user-facing feedback for a non-modal event (spawn outcome, console-panel error, async card-flow status, future card-approval-completed signal), the only options are: (a) add another bespoke banner DOM, or (b) misuse the modal for non-blocking feedback. Both options accumulate one-off DOM and styling that won't compose cleanly.

**Root cause.** The shell HTML at MB-T04 was scoped narrowly (modal + kanban webview + chat panel). Notification UX was deferred and never re-scoped. Vision §10.x does not specify a notification component; the shell relies on each feature owner to surface their own UX. This works for modal-shaped flows but fails for fire-and-forget event flows like spawn-result.

**Recommendation.** Single-pass UX ticket adding a toast surface to the shell:
- DOM: a fixed-position container with stack semantics (most-recent-on-top, max ~3 visible, auto-dismiss with operator-overridable hold).
- API: a small `showToast({ kind: 'success' | 'error' | 'info', message: string, autoDismissMs?: number })` exposed on `window.shellBridge` (already exists for splitter state; this adds renderer-internal notification methods).
- Migration: replace the Fix-B inline `#spawn-result-banner` with calls to the new toast API; surface other silent failures (console-panel `console.error` paths, onboarding errors, spawn-modal validation errors that currently just `return`) via the same surface.
- Test pattern: happy-dom unit tests asserting stack ordering, auto-dismiss timing, manual-dismiss interaction. Existing console-t03 component tests provide the per-file `// @vitest-environment happy-dom` precedent.

**Realistic LOC.** ~150–200 across HTML/CSS + a renderer-side helper module + tests.

**Cross-references.**
- Finding #83 (Fix-B parent, RESOLVED at `07fae77`) — established the inline banner that this finding's toast system should replace.
- `MB-F-CONSOLE-T03-MENU-SUBSCRIPTION` (FOLLOWUPS.md:131) — once that lands, console-panel error states would benefit from the toast surface.
- Onboarding modal error paths (currently swallowed at `main.ts:339-341` with stderr-only diagnostics) would also benefit.

**Confidence:** KNOWN.
- Symptom: confirmed by enumeration of existing UX surfaces in Fix-B diagnose phase.
- Affected event sources: spawn-result (Fix-B inline-banner workaround), console-panel errors (`console.error`-only today), onboarding errors (stderr-only).
- LOC estimate: MODELED — based on similar React/HTML toast component implementations.

---

## Dogfood pass summary — batch-6 wiring end-to-end (2026-05-04)

**Operator HEAD at start:** 58140bd
**Operator HEAD at completion:** 4014c36 (this commit + summary)
**Findings filed:** #82 (Tier 2), #83 (Tier 1), #84 (Tier 1, two-defect compose)

### Per-test result

| # | Test | Result | Notes |
|---|------|--------|-------|
| T1 | Workstation launch | PASS | Electron up, WINDOW_READY, no errors. |
| T2 | First-launch onboarding | PARTIAL PASS | Modal renders (screenshot-verified, deleted for op privacy); test-hook stdin path persists encrypted key + sentinel; second launch suppresses modal. Production renderer click-through not exhaustively driven (UI-scripting blocked by AX permissions + operator-side material in screen capture). |
| T3 | Console panel inside shell | FAIL → #82 | Wiring chain built end-to-end but no operator-reachable trigger. Native menu hardcoded `[]`; `consoleBridge` exposes no `openPanel`. Cross-ref `MB-F-CONSOLE-T03-MENU-SUBSCRIPTION`. |
| T4 | Spawn end-to-end via UI | PASS-WITH-CAVEAT → #83 | Spawn works after cap was freed; tmux + daemon IDs match. UX defect: `workstation:spawn-result` not subscribed by renderer; every outcome silent. Cap was blocked by 4-of-5 orphaned 'armed' daemon sessions. |
| T5 | Orchestrator card flow | BLOCKED → #84 | Two composed defects: (A) safeStorage key never loaded into `process.env.ANTHROPIC_API_KEY` → STREAM_ERROR auth_error; (B) `build-doc-state.ts` has no `app.getPath('userData')` fallback → setBuildDocConfig silent no-op → orchestrator system prompt never loads → cards cannot be generated. |
| T6 | Daemon survives WS restart | PASS | tmux + daemon both alive after cmd-Q quit; daemon entry persisted as `armed`. |
| T7 | Spawned session survives WS SIGKILL | PASS | tmux + daemon alive after pkill -9 of all Electron procs. |
| T8 | Audit log integrity | PASS | `orchestrator_audit` table present in data.db; 0 rows (consistent — no cards approved this session, T5 blocked). No corruption. |
| T9 | cardContextCache survives session restart | DOCUMENTED | In-memory by design (per source comments); restart drops cache. Silent-no-op on post-restart approve composes with #83 — operator clicks Approve, returns silently, no audit row. Documented as defect-class continuation, not separately filed. |
| T10 | Multiple concurrent sessions | SPAWN-SIDE PASS | Two dogfood sessions spawned concurrently, both armed, both backed by tmux. Card cross-contamination test untestable per #84. |
| T11 | Kill tmux mid-spawn | PASS state-side | tmux server killed mid-spawn; no daemon registration; no orphan. UX silent per #83. |
| T12 | Kill daemon mid-flight | PASS state-side | daemon killed; spawn fails before tmux; no orphan. UX silent per #83. |
| T13 | Malformed orchestrator output | N/A live | Schema validation pure-function-tested in `test/unit/mb-t07/`. Live runtime test requires chat-card flow blocked by #84. |
| T14 | Permission-denied scenario | N/A — code missing | Prompt cites "3-category subset shipped at ff5b490". That commit is not in repo history at HEAD 4014c36. grep finds no `write_third_party` / `cost_bound` / permission-gating code anywhere in `packages/`. No production gating code to fault-inject. |
| T15 | Race two card approvals | N/A | Requires two cards in flight; blocked by #84. |

### Recommended next direction (operator arbitration)

Three findings, ordered by ship-gate impact:

1. **Resolve #84 first** — both Defect A (safeStorage → process.env bootstrap) and Defect B (`app.getPath('userData')` fallback in `build-doc-state.ts`) are single-site fixes (~10 LOC each). Without them, the v3.0 orchestrator card flow is non-functional in production. Together they unblock T5/T13/T15 dogfood territory.
2. **Resolve #83 next** — wire `workstation:spawn-result` consumer in shell + `onSpawnResult` on `workstationBridge`. Single integration point. Closes the silent-failure UX for spawn (and inherits some recovery for T9/T11/T12 silent-no-op). Optional companion: daemon orphan reaper for the cap-blocking-by-orphans symptom.
3. **Resolve #82 last** — wire `/v2/events/stream` (option-b in existing `MB-F-CONSOLE-T03-MENU-SUBSCRIPTION` followup) so the CC Console menu auto-populates. The wiring chain past the menu is otherwise complete; this single wire restores the full operator path for console-panel-in-shell.

### Pre-existing followups validated by this dogfood

- `MB-F-CONSOLE-T03-MENU-SUBSCRIPTION` (FOLLOWUPS.md:131) — confirmed unresolved at HEAD; #82 documents dogfood evidence.
- `MB-F-MB-T08-SPAWN-RESULT-SENTINEL` (smoke-harness.ts:85-88) — same root cause as #83, narrower scope; recommend resolving in same patch.
- `MB-F-COARCH-T04-BUILD-DOC-SETTINGS-UI` (FOLLOWUPS.md:120) — assumes DevTools workaround; #84 Defect B shows the assumption is invalid.

### State left after dogfood

- Tmux server killed (T11 artifact, not restarted) — operator may wish to restart for normal dev flow.
- Daemon `newTest1` session is now an orphan ('armed' but no tmux). Consistent with #83's orphan pattern.
- 4 prior orphan sessions (`ddd`, `heytest`, `pa`, `papapapapa`) marked killed during T4 to free cap; not restored.
- Workstation userData has `anthropic-api-key.enc` populated with `CONDUCTOR_DOGFOOD_API_KEY` ciphertext + `workstation-config.json` with `onboardingCompleted=true`. Pre-dogfood originals preserved at `*.dogfood-bak`. Operator may `mv ...bak ...` to restore if desired.
- No screenshots persisted on disk (deleted to avoid capturing operator-side desktop background).

---

## Finding #89 — MB-F-WORKSTATION-MENU-REBUILD-NO-OP

**Date filed:** 2026-05-04
**Tier:** 1 (ship-gate blocker — blocks Fix-C from delivering its visual outcome despite all wiring verified GREEN; any operator-facing native-menu refresh path through `rebuildApplicationMenu` is silently inert)
**Origin:** Fix-C integration verification at branch `fix-C/console-panel-trigger` HEAD `8348033` (post-rebase onto Fix-A merge `e6698d9`)
**Discovered by:** Fix-C end-to-end integration verification — diagnostic stderr instrumentation + AppleScript UI introspection of the live Electron menu bar
**Resolution status:** New finding. Discovered while attempting integration verification of Fix-C's resolution of finding #82. Fix-C's wiring is unit-test-and-helper-level GREEN but the operator-facing visual outcome remains unrealized due to this defect.

**Symptom (KNOWN — observed live).** `Menu.setApplicationMenu(menu)` invoked from inside `rebuildApplicationMenu` (menu.ts:108) after `app.whenReady().then(...)` settles does NOT propagate to the macOS menu bar. The "CC Console" submenu remains pinned to its initial-build state regardless of subsequent rebuilds.

Repro at HEAD `8348033`:

1. Launch workstation: `MB_TEST_HOOKS=1 ./node_modules/.bin/electron dist/main/main.js` with daemon running on :7878 and at least one non-killed session in `/v2/sessions`.
2. Wait for sentinel sequence: `WINDOW_STATE`, `SPLITTER_LOADED`, `SHELL_READY`, `RENDER_OK`, `WINDOW_READY`, `CONSOLE_TILE_GRID_MOUNTED`, `ONBOARDING_READY`.
3. Fix-C's `subscribeConsoleMenuToDaemon` bootstrap fetch resolves and calls `refreshConsoleMenu(activeSessionNames)` (verified via diagnostic stderr emit during this verification: `refresh names=["newTest1"]` → `refreshConsoleMenu(["newTest1"]) start` → `refreshConsoleMenu returned`).
4. AppleScript-introspect the CC Console submenu (same technique used in finding #82's discovery):
   ```
   tell process "Electron"
     set ccMenuBar to menu bar item "CC Console" of menu bar 1
     click ccMenuBar
     -- enumerate menu items of menu 1 of ccMenuBar
   end tell
   ```
   Result: `1 items: No sessions registered` — the initial empty-state menu, not the rebuilt one.

**Root cause (MODELED — three hypotheses, not yet investigated).**

1. **Electron submenu identity caching** (most plausible). macOS native menu bar items are reference-tracked by the OS menu server. Electron's `Menu.setApplicationMenu` with a freshly constructed `Menu` may not invalidate cached submenu pointers held by the OS once the menu bar has been "first-attached" by the OS during `app.activate`. Workaround pattern in published Electron projects: `Menu.setApplicationMenu(null)` then `Menu.setApplicationMenu(newMenu)` to force OS-level re-attachment.

2. **Initial-menu sticky on first activation.** `registerApplicationMenu()` runs at line 175 of main.ts BEFORE `mainWindow` exists; `rebuildApplicationMenu` from inside `app.whenReady().then(async () => ...)` may race with menu-bar-attachment. Workaround: defer initial registration until after `mainWindow.on('ready-to-show')`.

3. **`menuRegistered` gate semantic mismatch in menu.ts:92-100.** `rebuildApplicationMenu` sets `menuRegistered = true` unconditionally. The gate in `registerApplicationMenu` only short-circuits — there's no inverse path that forces a rebuild when state is desynced. Probably benign relative to (1) but worth ruling out.

Evidence pointing at hypothesis (1): the hardcoded synchronous test `setTimeout(() => refreshConsoleMenu(['DIAG-HARDCODE']), 3000)` (added during verification, since reverted) ALSO failed to update the menu, ruling out async-timing hypotheses. Both my Fix-C subscribe path and the synchronous direct-call path produce identical visible-menu-stale outcomes.

**Practical impact.**

- **Fix-C operator-trigger path:** the CC Console submenu cannot populate with daemon sessions even after Fix-C wiring is shipped. `consoleBridge.openPanel(sessionId)` (the renderer-driven secondary surface added by Fix-C) is unaffected by this defect — it bypasses the menu entirely — but no renderer-side button exists yet that calls it (vision §10 designated the menu as primary).
- **MB-F-CONSOLE-T03-MENU-SUBSCRIPTION followup:** wiring alone is insufficient. Closure of that followup now also requires resolution of this finding.
- **Any future operator-facing menu refresh** that depends on `rebuildApplicationMenu` to surface state changes: blocked by this defect. (For example, a future "Window > Recent Sessions" submenu, dynamic plugin registration, etc.)

**Recommendation (deferred — operator arbitration).** Three composable directions:

1. **Test hypothesis (1) first** by patching `rebuildApplicationMenu` to call `Menu.setApplicationMenu(null)` before `Menu.setApplicationMenu(newMenu)`. ~2 LOC. Verify with the same AppleScript repro. If the menu updates, ship as the fix.
2. **If (1) fails, test hypothesis (2)** by deferring `registerApplicationMenu()` until after `mainWindow.on('ready-to-show')` fires. Slightly larger refactor since two call sites rebuild after that point.
3. **If both fail**, fall back to a Menu-level workaround: rebuild `MenuItemConstructorOptions` with a dynamic `submenu` callback per the Electron docs' on-the-fly submenu pattern, or accept that the menu bar is initial-state-only and shift the operator-trigger primary surface to a renderer-side affordance (per-card "Open console" button using `consoleBridge.openPanel` — the surface Fix-C already exposed for exactly this contingency).

**Confidence:**

- Symptom: KNOWN. Three independent observation sequences during Fix-C integration verification, plus the prior dogfood pass at HEAD `58140bd` (finding #82) which observed identical AppleScript output albeit attributed to a different upstream cause.
- Root cause: MODELED. Three hypotheses enumerated, not narrowed by experiment. Hypothesis (1) is the most cited Electron pattern and the cheapest to verify.
- Practical impact: KNOWN for Fix-C scope; MODELED for forward-compatibility scope (future menu rebuilds).

**Cross-references.**

- **#82** — Fix-C closes the "menu hardcoded `[]`" defect at the wiring level. This finding is the downstream blocker preventing Fix-C from delivering visual closure of #82.
- **`MB-F-CONSOLE-T03-MENU-SUBSCRIPTION`** — Fix-C lands the wiring this followup recommended; closure of the followup itself depends on resolving this finding (#89).
- **#83** — UX silent-failure pattern; if a future fix wires `workstation:spawn-result` into a header-count display (header counter mentioned in `MB-F-MB-T06-HEADER-COUNT-DISPLAY`), that surface would face the same propagation question if it goes through `rebuildApplicationMenu`. Renderer-side state has no such issue.

**§10.5 self-check (docs-only commit):**

1. API verified by spike? n/a — documentation only.
2. Test exercises behavior or mocks? n/a — finding cites live Fix-C integration verification with diagnostic stderr instrumentation (since reverted from the branch HEAD) plus AppleScript reproduction.
3. Implementation deleted, test still passes? n/a.
4. Anything outside contract? No — documentation only.
5. Modified contract? No.
6. Unlabeled claims? No — KNOWN/MODELED labels per evidence quality. Symptom KNOWN, root cause MODELED with three hypotheses explicitly tagged.
7. Touched a file another session may modify? No parallel session active in this dogfood pass; modified file: `docs/cairn-findings.md`, single append. Fix-C branch HEAD `8348033` working tree was clean before this commit.
8. Pre-push protocol? Docs-only; per-finding-file pattern; no build/typecheck gate required for docs.
9. Confidence labeling matches evidence? Yes — KNOWN labels for direct observations, MODELED for inferences (root cause, forward-compat impact).

---

## Finding #90 — MB-F-FIX-BATCH-WORKTREE-PRE-SCAFFOLD-CUT

**Date filed:** 2026-05-04
**Tier:** 3 (process / methodology — preventable scaffold-ordering issue with low operator impact)
**Origin:** Fix-Batch-1 Session C (Fix-C/console-panel-trigger) at HEAD `320f707` (post-Fix-B-rebase)
**Discovered by:** Fix-C session, operator-pre-instructed to file as part of resolution surface; second-instance evidence (finding-number collision) discovered post-Fix-B-merge during Fix-C renumber pass
**Resolution status:** Methodology amendment only; no code. Operator pre-instructed.

**Defect class.** Fix-batch coordination-scaffold gaps. This finding documents two distinct instances of the same class:

1. Worktree-cut-from-pre-scaffold-commit (the original instance — operator pre-instructed during Fix-C session).
2. Finding-number range overlap between parallel sessions (discovered post-Fix-B-merge during Fix-C's renumber pass).

**Instance 1 — Symptom (KNOWN — observed live).** Fix-C worktree `fix-C/console-panel-trigger` was cut from commit `332bec1` (the dogfood summary commit). The fix-batch coordination scaffold lives at commit `626e2a9` on `main`, AFTER `332bec1`. Fix-C therefore had no visibility into the scaffold file `docs/cairn-coordination/fix-batch-1/00_COORDINATION_SCAFFOLD.md` from inside its own worktree. The operator briefed Fix-C with the file-ownership scope inline in the prompt, so this did not block Fix-C's work — but it did create an extra surface area for confusion (Fix-C noticed the missing scaffold during diagnose phase and surfaced for arbitration; operator confirmed the inline scope was canonical).

**Instance 1 — Root cause (KNOWN — git ordering).** Branch creation sequence was:

1. `626e2a9` lands on main: scaffold file added.
2. `332bec1` is `626e2a9`'s parent (or earlier) on main.
3. Fix-C branch cut: `git checkout -b fix-C/console-panel-trigger 332bec1` instead of `git checkout -b fix-C/console-panel-trigger main`.

Reading the operator's pre-instruction: the scaffold lives on main at `626e2a9` but Fix-C was cut from `332bec1` (pre-scaffold). The remedy is one-line: cut fix branches from the post-scaffold commit, not the pre-scaffold one.

**Instance 2 — Symptom (KNOWN — observed live during Fix-C renumber pass).** Fix-batch coordination scaffold did not reserve finding-number ranges per session. In fix-batch-1, Fix-B and Fix-C both filed `Finding #85` for completely different defects:

- Fix-B's #85 = `MB-F-DAEMON-ORPHAN-REAPER` (filed and merged via `a6e1e64`)
- Fix-C's #85 = `MB-F-WORKSTATION-MENU-REBUILD-NO-OP` (filed via `a99cc82` pre-rebase, now `4f28aa7`)

Fix-C also filed #87 and #88 which Fix-B did not collide on, but those numbers were arbitrary picks against the highest-numbered finding visible from Fix-C's pre-Fix-B-merge perspective. Post-Fix-B-merge, Fix-C had to renumber all three filings to #89/#90/#91 to resolve the collision. The renumber is mechanical and recoverable but preventable.

**Instance 2 — Root cause.** The scaffold's parallel-session protocol covered code-file ownership (sentinel regions in main.ts, etc.) and merge ordering (A → B → C) but did NOT reserve finding-number ranges per session. Each session, working from its own pre-batch view of `cairn-findings.md`, naturally chose the next available number — leading to the collision when two sessions both saw "#84" as the highest existing finding and both filed "#85".

**Instance 2 — Remedy.** Reserve finding-number ranges per session in the fix-batch coordination scaffold. Example: "Fix-A may file #85-89, Fix-B may file #90-94, Fix-C may file #95-99". Range size should be set per the expected upper bound of new findings per session (5 was sufficient for this batch; tune as needed).

**Practical impact.**

- Instance 1: Fix-C diagnose phase spent one extra round-trip surfacing the missing scaffold file before continuing. Mitigated by inline scope in prompt; no work lost.
- Instance 2: Fix-C renumber pass adds one docs commit at the end of the branch. Renumber is recoverable but adds churn to git log and (more importantly) creates a permanent footnote in the resolution body explaining the immutable-commit-message vs renumbered-doc-content gap.
- Both instances together: a future fix-batch with a more complex scaffold (e.g., test-isolation seams, shared mocks, or a denser finding-filing cadence) would compound these gaps and could meaningfully delay the merge.

**Recommendation (deferred — methodology-only).**

When setting up a fix-batch with parallel sessions, the coordination scaffold should:

1. Land on main BEFORE worktrees are cut, so each worktree has it from the start:

```
git checkout main
git pull
# scaffold commit lands on main first
git commit -m "scaffold: fix-batch-N coordination scaffold"
# THEN cut the fix branches:
git worktree add ../foxworks-worktrees/fix-A fix-A/<topic>
git worktree add ../foxworks-worktrees/fix-B fix-B/<topic>
git worktree add ../foxworks-worktrees/fix-C fix-C/<topic>
```

2. Reserve finding-number ranges per session inside the scaffold body. Example section:

```
## §1.5 Finding-number reservations

To prevent collisions when multiple sessions file new cairn findings,
each session is reserved a contiguous range:

  Fix-A: #85-89
  Fix-B: #90-94
  Fix-C: #95-99

Sessions MUST file within their range. If a session exceeds its
range, surface for arbitration before continuing — do not encroach
on adjacent ranges.
```

Both fixes are zero-LOC scaffold additions; together they prevent the entire defect class.

**Confidence:** KNOWN for both instances. Instance 1 operator-pre-instructed during Fix-C session; Instance 2 directly observed during Fix-C renumber pass post-Fix-B-merge. Root causes are plain git/process history; remedies are mechanical.

**Cross-references.**

- Fix-A and Fix-B worktrees may have the Instance-1 issue at this batch. Worth confirming (operator's call) whether their scaffold visibility was achieved by the same inline-prompt mechanism.
- Future fix-batch operator runbook should incorporate both the post-scaffold-cut ordering AND the finding-number reservation table.

**§10.5 self-check (docs-only commit):**

1. API verified by spike? n/a — methodology finding.
2. Test exercises behavior or mocks? n/a.
3. Implementation deleted, test passes? n/a.
4. Anything outside contract? No.
5. Modified contract? No.
6. Unlabeled claims? No — KNOWN throughout.
7. Touched a file another session may modify? Single docs append.
8. Pre-push protocol? Docs-only; per-finding pattern.
9. Confidence labeling matches evidence? Yes — KNOWN.

---

## Finding #91 — MB-F-DAEMON-SESSION-LIFECYCLE-EVENTS-MISSING

**Date filed:** 2026-05-04
**Tier:** 3 (forward-compat enhancement — does not block any current consumer; consumers work around via /v2/sessions refetch)
**Origin:** Fix-C diagnose phase, code-confirmed via grep across `packages/dispatch-daemon/src/routes/`
**Discovered by:** Fix-C session, operator-pre-instructed to file as part of resolution surface
**Resolution status:** New finding documenting a daemon-side contract gap that necessitates the hybrid pattern Fix-C ships in `subscribeConsoleMenuToDaemon`. Future enhancement; not blocking.

**Symptom (KNOWN — code-confirmed).** Daemon `/v2/events/stream` (`packages/dispatch-daemon/src/routes/ws.ts:50`) emits events of type `state_changed`, `prompt_sent`, `handoff_written`, `commit_landed`, `test_status_updated`, `cairn_violation_detected`, `gate_trip`. **No `session_created` or `session_removed` event types are emitted.** Specifically:

- `POST /v2/sessions` (`sessions.ts:134-184`) writes a new session to the registry but does NOT call `deps.emit?.(...)` afterward. The new session becomes visible only via subsequent `GET /v2/sessions`.
- `PATCH /v2/sessions/:name/state` to `state='killed'` (`sessions.ts:243-251`) emits `state_changed` with `from`/`to`/`triggered_by` but does NOT emit a separate `session_removed` event. Consumers wanting a clean "session disappeared" signal must infer it from the `state==='killed'` transition.

**Root cause (KNOWN — design).** DAEMON-T08 / DAEMON-T12 ratified the seven-event taxonomy listed above; session-lifecycle events were not in scope. The omission was deliberate at ticket scope but creates a contract gap for downstream consumers that want push-based session-list refresh.

**Practical impact.**

- **Fix-C `subscribeConsoleMenuToDaemon`:** falls back to the hybrid pattern (WS event = "something changed" trigger → REST refetch of `/v2/sessions`). Operator-arbitrated 2026-05-04 as the correct trade-off given the daemon HEAD constraint.
- **dispatch-cli `tui-state.ts:99-115`:** explicit comment at line 105 (`if (!existing) return state;`) — the TUI ignores events for sessions it doesn't already know about, deferring new-session discovery to the bootstrap fetch path. Same pattern.
- **dispatch-web `useDaemonEvents.ts:127-128`:** runs preflight (which fetches gap-fill events) on every reconnect, partially covering this via gap-fill. Less affected because it has its own resync path.

Net effect: every consumer that wants a live session list reimplements bootstrap-fetch + WS-event-trigger refetch. Code duplication risk; no behavior bug.

**Recommendation (deferred — daemon-side enhancement).**

Add two event types to the DAEMON-T12 taxonomy:

- `session_created` — emitted from `POST /v2/sessions` after `writeRegistryV2` succeeds. Data: `{ name, cwd, tmux_target, handoff_path, state }`.
- `session_removed` — emitted when a session is fully removed from the registry (not just transitioned to `killed`). Data: `{ name }`.

(Alternative: emit `session_lifecycle` with a `phase: 'created' | 'removed'` field for forward extensibility.)

Once shipped, downstream consumers can drop the bootstrap-fetch + refetch pattern in favor of pure event-driven state.

**Confidence:** KNOWN.

- Symptom: code-confirmed via grep across `packages/dispatch-daemon/src/routes/` (only 3 emit sites: `sessions.ts:243` state-changed, `prompts.ts:104` prompt-sent, `violations.ts:113` state-changed).
- Root cause: design choice traceable to DAEMON-T12 ticket prompt (event taxonomy ratified at 7 types).
- Workaround pattern: validated in 3 production consumers (Fix-C, dispatch-cli, dispatch-web).

**Cross-references.**

- **#82 / #89** — Fix-C ships the workaround in `subscribeConsoleMenuToDaemon`; this finding documents the daemon-side gap that necessitated it.
- **DAEMON-T12** — original ticket that ratified the seven-event taxonomy.
- **`MB-F-CONSOLE-T03-MENU-SUBSCRIPTION`** — followup that recommended `/v2/events/stream` subscription; #91 explains why that subscription cannot be pure event-driven without daemon-side change.

**§10.5 self-check (docs-only commit):**

1. API verified by spike? n/a — finding.
2. Test exercises behavior or mocks? n/a.
3. Implementation deleted, test passes? n/a.
4. Anything outside contract? No.
5. Modified contract? No — proposes a future contract addition.
6. Unlabeled claims? No — KNOWN throughout.
7. Touched a file another session may modify? Single docs append.
8. Pre-push protocol? Docs-only.
9. Confidence labeling matches evidence? Yes — KNOWN.

---

## Finding #92 — MB-F-DAEMON-TOKEN-NOT-BOOTSTRAPPED

**Date filed:** 2026-05-04 (stub) · **Triaged:** 2026-05-04 (this body, post-diagnose; supersedes the stub's SPECULATIVE root-cause — see "Triage delta" below)
**Tier:** 1 (ship-gate; workstation operator hits TokenPrompt on cold launch and must manually paste the daemon token)
**Origin:** 2026-05-04 operator dogfood follow-up to fix-batch-1
**Discovered by:** Operator surfaced after fix-batch-1 closed. Not caught by batch-6 dogfood because T1 (workstation launch) only verified Electron reaches main loop, and T2/T3 verified shell+console wiring but not the kanban webview's auth-bootstrap path through to a connected state — the dispatch-web AuthBootstrap path was not on the dogfood test list.
**Resolution status:** IN-PROGRESS (fix-92 session, branch `fix-92/daemon-token-bootstrap`).

**Symptom (KNOWN — code-confirmed at this triage).** On cold launch, the kanban webview (dispatch-web React app, embedded via `<webview>` in `workstation-shell.html:237`) renders the `TokenPrompt` component. `TokenPrompt.tsx:24` literally instructs the operator: *"Run `cat ~/.foxworks-dispatch/token` and paste the contents below."* The operator runs the cat, copies the value, pastes it into the input. `writeToken` in `dispatch-web/src/auth/token-storage.ts:12-18` then calls `localStorage.setItem('x-conductor-token', token)` and `useAuthBootstrap` proceeds. On every fresh webview origin (i.e. cold launch with cleared Electron user-data, or launch with no prior paste), this step is required.

**Triage delta from the stub root-cause.** The stub speculated this was the same shape as #84 Defect A: a credential persisted on disk with no boot-time loader populating a `process.env` consumer. Diagnose phase falsified that. The workstation main process **already** reads the daemon token from disk in five separate sites at module-load time — `http-daemon-client.ts:10-17`, `spawn-ipc.ts:98-104`, `console-ipc.ts:305-311`, `session-cap.ts:145-151`, `main.ts:259-262` (Fix-C block). Each has its own private `readDaemonToken()` helper that calls `readFileSync(join(homedir(), '.foxworks-dispatch', 'token'), 'utf8').trim()`. There is no `process.env` consumer for the daemon token in the workstation main process. Mirroring `api-key-bootstrap.ts` mechanically would write to a `process.env` location nothing reads from. **The defect class framing in the stub is incorrect for the operator-blocking symptom.**

The actual mismatch is **cross-context**: the workstation main process can read the token; the kanban webview cannot, because it's a separate (renderer-process) context with its own per-origin `localStorage` and no shared filesystem read path. The webview's `useAuthBootstrap.ts:26-29` calls `readToken()` which reads `localStorage.getItem('x-conductor-token')`. There is no main→webview hand-off populating that key on cold launch.

**Root cause (KNOWN).** No code path in the workstation reads `~/.foxworks-dispatch/token` from disk and writes it to the kanban webview's `localStorage['x-conductor-token']` before `dispatch-web`'s `useAuthBootstrap` runs. The kanban webview's preload (`card-bridge-preload.mts` → built to `dist/main/card-bridge.cjs`, attached via `<webview ... preload="./card-bridge.cjs">` per `workstation-shell.html:237`) currently exposes only the `cardBridge` contextBridge surface; it does not pre-populate `localStorage`. The dispatch-web bundle therefore boots into the `prompt` phase on every fresh origin.

**Operator UX.** Cold-launch the workstation. The kanban region renders the dispatch-web app. AuthBootstrap finds no token → `TokenPrompt` mounts → operator reads the on-screen instruction → `cat` + paste. Every cold launch with cleared per-origin storage repeats this.

**Defect class — revised framing.** This is **not** the same shape as #67 / #84 Defect A. Those were "persistence-layer wiring shipped without an in-process consumer-side bootstrap; consumer reads `process.env.X`; no boot-time `process.env.X` populator exists." The mechanical template for those is the bootstrap-to-process.env pattern at `api-key-bootstrap.ts`. **#92 is structurally different**: cross-context credential plumbing (workstation main → webview localStorage). The fix shape is webview-side preload injection, not main-process env-var population. A surface-similar symptom ("operator runs `cat ~/.foxworks-dispatch/token`") does not imply identical mechanics. The "third instance of pattern" framing in the stub is dropped.

**Companion finding #93** filed for the orthogonal main-process observation (5-site `readDaemonToken()` duplication), tracked separately because it is not the operator-blocking symptom and consolidating it touches files outside #92's scope.

**Triage steps (Option 1 — webview preload extension; operator-arbitrated 2026-05-04):**

1. Extend `card-bridge-preload.mts` to perform a one-shot async bootstrap at preload-load time. The preload IPC-invokes a new main-process channel, then writes the result into `localStorage['x-conductor-token']` if non-null. Preload runs before page scripts even with `contextIsolation: true`, so `useAuthBootstrap.ts:26 readToken()` sees the populated value on first read. Build output stays at `dist/main/card-bridge.cjs` (HTML attribute unchanged).
2. Add new IPC channel `workstation:get-daemon-token` (`ipcMain.handle` / `ipcRenderer.invoke`). Naming follows the workstation-internal credential precedent (`workstation:onboarding-save-api-key`, `workstation:onboarding-complete`, `workstation:open-repo-dialog`).
3. New module `packages/dispatch-workstation/src/main/daemon-token-bootstrap.ts` exporting `readDaemonTokenForBootstrap({ tokenPath? }): string | null` — single source of truth for the disk-read used by the new IPC handler. Optional `tokenPath` for test isolation. Returns null on absent / unreadable file (no throw — matches the existing 5-site `readDaemonToken()` helpers' silent-on-error semantics).
4. Wire in `main.ts` inside a new sentinel region `// === BEGIN: Fix-92 webview token bootstrap ... === / // === END: Fix-92 ===`. Handler must register before the kanban webview loads (i.e. before `createWindow()`'s `loadFile`), so the preload's IPC invoke does not race the handler's registration.
5. RED test: `test/unit/fix-92-daemon-token/test_daemon_token_bootstrap.spec.ts` — verifies `readDaemonTokenForBootstrap` against a tmp file (present / absent / whitespace-trim).
6. GREEN: implement the disk-read function, the IPC handler, the preload extension.
7. Integration verification: cold-launch workstation; verify kanban renders without `TokenPrompt`; verify daemon-touching operations succeed without operator paste step.
8. Resolution doc: append Resolution section at green SHA.

**Out-of-scope of this fix (filed separately):**
- Main-process 5-site `readDaemonToken()` duplication (finding #93)
- Browser-launched dispatch-web (i.e. when operator opens `http://localhost:7878/` directly, not through the workstation webview): TokenPrompt remains the correct fallback for that case; no change.

**Estimated scope:** 30-50 LOC across daemon-token-bootstrap.ts (new), main.ts (sentinel-bracketed addition), card-bridge-preload.mts (extension), one new test file.

**Confidence:** KNOWN (symptom operator-reported AND code-confirmed; root cause grep-confirmed across both packages).

**Cross-references:**
- Surface-symptom adjacent to #84 Defect A (both involve a credential persisted on disk + an apparent need for "bootstrap"), but **not** the same mechanical class — the consumer location differs (env-var in #84A, per-origin localStorage in a renderer process in #92), and the fix shapes are structurally different
- Companion #93 (main-process disk-read duplication; orthogonal, not operator-blocking)
- Pairs with #67 / #80 only at the methodology level: "credential or dependency persists on disk; the consumer does not see it without an explicit bootstrap step." Mechanically these three findings are different defects in different layers. Codifying them under one umbrella would conflate three distinct fix shapes.

## Finding #93 — MB-F-DAEMON-TOKEN-DISK-READ-DUPLICATION

**Date filed:** 2026-05-04
**Tier:** 3 (code-quality observation; no current ship-gate impact)
**Origin:** Surfaced during fix-92 diagnose phase
**Discovered by:** fix-92 session diagnose-phase grep across `packages/dispatch-workstation/src/main/`
**Resolution status:** Captured; deferred (no operator-blocking impact)

**Observation (KNOWN — code-confirmed).** The workstation main process currently holds five separate copies of an essentially identical `readDaemonToken()` helper:

```
packages/dispatch-workstation/src/main/http-daemon-client.ts:10-17
packages/dispatch-workstation/src/main/spawn-ipc.ts:98-104
packages/dispatch-workstation/src/main/console-ipc.ts:305-311
packages/dispatch-workstation/src/main/session-cap.ts:145-151
packages/dispatch-workstation/src/main/main.ts:259-262 (Fix-C inline block)
```

Each implements the same shape: `try { readFileSync(join(homedir(), '.foxworks-dispatch', 'token'), 'utf8').trim() } catch { return null }`. Each is module-private (no shared import). Each is called either at module-load (via constructor of the singleton client class) or per-request (`spawn-ipc.ts:155`).

**Why this isn't a ship-gate defect.** The behavior is correct: every call site reads the same file, gets the same result, fails-closed-to-null on absence. There is no race condition (token file is written by the daemon before workstation launch in any sane workflow). There is no bug that surfaces to the operator from this duplication today.

**Code-quality concerns (MODELED).**
1. **Drift risk.** Five copies of the read invariant means a future change to the path, format, or encoding has five sites to update. A new copy added in a sixth file would silently work; missing one in a refactor would silently break.
2. **No central token cache.** Each construction of `HttpDaemonClient` / `HttpConsoleDaemonClient` / `HttpSessionListClient` re-reads the file. Today this is one read per app boot per client (cheap) — but if any client is reconstructed during a session (e.g. for token-rotation handling), the read gets repeated. A consolidated cache would centralize that policy.
3. **Telemetry surface.** A single `getDaemonToken()` source-of-truth would be the natural place to add diagnostic logging, retry/backoff for slow filesystems, or future credential-rotation hooks.

**Recommendation (deferred — operator arbitration).** Single-site refactor: consolidate the five helpers into one module (likely `packages/dispatch-workstation/src/main/daemon-token-bootstrap.ts` if fix-92 adds it; otherwise a new `daemon-token-source.ts`). Each call site replaces its private helper with `import { getDaemonToken } from './daemon-token-source.js'`. Estimated 5-10 LOC removed, 5 imports added; net negative-LOC refactor.

**Confidence.** KNOWN observation; MODELED severity (code-quality / drift-risk only).

**Cross-references:**
- Companion to #92 (fix-92 ships `daemon-token-bootstrap.ts` for the webview path; consolidation could later reuse that module)
- No relation to #67 / #80 / #84A despite surface similarity (those are persistence-without-consumer-bootstrap; this is duplication-of-correct-readers)
- Pairs with the broader observation that the workstation has accumulated multiple module-private credential/path helpers as parallel sessions added new IPC paths; an audit might surface other consolidation opportunities

