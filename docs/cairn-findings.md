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
