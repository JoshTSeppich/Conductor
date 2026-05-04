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
