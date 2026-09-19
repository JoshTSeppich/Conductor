# Conductor — Build Contract

Claude Opus 4.7 in Claude Code, 1M context. You are building **`foxworks-dispatch`** (binary name: `fd`), a single-purpose CLI that eliminates mechanical copy-paste between Opus-in-chat (architect role) and Claude Code sessions (builder role) across multiple concurrent projects.

This is a **Tier 1 build**. Internal tool, solo-maintained, low external stakes. Cairn discipline still applies — this tool will sit in the critical path of every future build, so it must be trustworthy. But ceremony is calibrated to Tier 1: no verification dashboards, no ADR process for internal decisions, commit messages can be brief.

Full Cairn primitives in §C0. Stop when the §8 exit gate is met. Do not build beyond v1 scope in §2.

---

## §C0 — Cairn primitives invoked

Tier 1 build. Primitives apply with Tier 1 calibration:

| Primitive | Enforcement |
|---|---|
| Anti-fabrication | §1.1, every `tmux` / `node:` API call verified via spike before green |
| Confidence labels | §1.2, KNOWN / MODELED / UNKNOWN in commit bodies |
| TDD literal | §1.3, red before green per logical unit; e2e loop test gates v1 exit |
| Frozen contracts | §1.4, after §4 lands, `sessions.json` schema and the handoff footer string are frozen for v1 |
| Flag-don't-improvise | §A6, if a tmux behavior deviates from the spike, stop and flag |
| Self-checks before commit | §1.5, six questions in every commit body |
| Stop when done | §1.6, v1 scope only — §6 ships it, §7 is explicitly deferred |

### Self-check block (paste into every commit body)

```
Self-check:
1. Is the API I called verified by a spike in this repo? [yes/n/a]
2. Does my test exercise behavior, or my mocks? [behavior/MIXED/MOCKS]
3. If implementation deleted, would test still pass? [yes/no]
4. Did I add anything outside the ticket's acceptance criteria? [yes/no]
5. Did a contract drift without a freeze commit? [yes/no]
6. Is any claim in my commit body unlabeled? [yes/no]
```

---

## §1 — Invariants

### 1.1 — Anti-fabrication

The following are the only load-bearing external APIs. Verify each via a dedicated spike (§3) before writing any green code that uses it:

- `tmux send-keys -t <target> <text> Enter` — sends text to a tmux pane
- `tmux capture-pane -t <target> -p -S <n>` — reads scrollback
- `tmux has-session -t <target>` — checks existence
- `tmux list-panes -a -F '#{session_name}:#{window_index}.#{pane_index}'` — enumerates targets
- Node.js `fs.promises` (readFile, writeFile, stat, mkdir)
- Node.js `child_process.execFile` with tmux

Do **not** use `spawn` / shell interpolation for tmux calls. `execFile` with arg array. This is a hard rule — prompt content will contain shell metacharacters and you will create an injection bug if you interpolate.

If any tmux behavior deviates from what the spike showed, **stop and flag in the commit body with an UNKNOWN label**. Do not paper over.

### 1.2 — Confidence labels

In commit bodies, label every non-trivial claim:

- **KNOWN** — you verified by running code in this repo
- **MODELED** — you reasoned from docs but didn't run it
- **UNKNOWN** — you don't know and you're naming it

### 1.3 — TDD literal

For every logical unit in §4–§6:

1. Red commit: test that fails, with failure message in the commit body
2. Green commit: smallest change that makes the red test pass
3. Refactor commit (only if needed): no behavior change, tests still green

No green-before-red. No test-and-impl in the same commit.

### 1.4 — Frozen contracts

After §4 ships, two things are frozen for v1:

1. **`sessions.json` schema** (see §4.2). Migrations need a freeze commit with a version bump.
2. **The handoff footer string** (see §5.3). Changing it invalidates the convention all your Claude Code sessions are expected to follow.

Freezing means: any PR touching these emits a commit titled `freeze(N): <reason>` and nothing else in that commit.

### 1.5 — Self-checks before commit

Every commit body ends with the §C0 self-check block, filled in honestly.

### 1.6 — Stop when done

v1 scope is in §2. The §7 "explicitly deferred" list is not v1. Do not build it even if it seems easy. If a deferred item becomes load-bearing, stop, flag it, and wait for operator input.

---

## §2 — v1 scope

**In scope (v1 must ship all of these):**

1. `fd init <name>` — register a session in `~/.foxworks-dispatch/sessions.json`
2. `fd list` — print registered sessions, one per line, machine-parseable
3. `fd send <name> <prompt-file>` — assemble prompt (append footer if absent), archive it, send via tmux
4. `fd pull <name>` — read `<cwd>/HANDOFF.md`, archive it, copy to clipboard, print to stdout
5. `fd status` — live TUI showing all sessions, their state, last action, age
6. The handoff footer convention (§5.3)
7. The archive format (§4.3)

**Everything else is v2.** See §7.

### 2.1 — The one-sentence test

> "Running `fd send sherpa prompts/tk-07.md` pipes the prompt into the Sherpa Claude Code pane, and when CC finishes, `fd pull sherpa` puts the hand-off in my clipboard."

If a feature doesn't serve that sentence, it's out of v1.

---

## §3 — Stack and layout

### 3.1 — Stack

- **Runtime:** Node.js 20+ (operator confirms version before T01)
- **Language:** TypeScript strict mode
- **Package manager:** pnpm
- **CLI framework:** `commander` (mature, small)
- **TUI framework:** `ink` (React-for-terminal) — only used in `status` command
- **Schema:** `zod` for `sessions.json` validation
- **Tests:** `vitest`
- **Clipboard:** `pbcopy` via execFile on macOS; operator is on macOS per context

No other runtime dependencies. If you reach for a library that isn't on this list, stop and flag.

### 3.2 — Repo layout

```
foxworks-dispatch/
├── src/
│   ├── bin/
│   │   └── fd.ts                 # entry point, commander wiring
│   ├── commands/
│   │   ├── init.ts
│   │   ├── list.ts
│   │   ├── send.ts
│   │   ├── pull.ts
│   │   └── status.ts             # ink TUI
│   ├── registry/
│   │   ├── schema.ts             # zod schema, frozen after §4
│   │   ├── read.ts
│   │   └── write.ts
│   ├── transport/
│   │   ├── tmux.ts               # send-keys, capture-pane, has-session
│   │   └── fs.ts                 # HANDOFF.md read, archive write
│   ├── prompt/
│   │   ├── footer.ts             # the handoff footer string, frozen
│   │   └── assemble.ts           # prepend/append logic
│   ├── state/
│   │   └── derive.ts             # compute session state from mtimes
│   └── lib/
│       ├── clipboard.ts
│       └── paths.ts              # ~/.foxworks-dispatch resolver
├── test/
│   ├── unit/
│   │   ├── registry.test.ts
│   │   ├── prompt-assemble.test.ts
│   │   ├── state-derive.test.ts
│   │   └── tmux-command-building.test.ts
│   ├── integration/
│   │   ├── tmux-spike.test.ts    # real tmux, real pane
│   │   └── pull-roundtrip.test.ts
│   └── e2e/
│       └── full-loop.test.ts     # init → send → pull, real tmux pane
├── spikes/
│   ├── 01-tmux-send-keys.ts      # §3.3 below
│   ├── 02-tmux-capture.ts
│   └── 03-tmux-has-session.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

### 3.3 — Spikes (gate §4)

Before writing any production code, write and run three spikes. Commit each with a `spike(NN):` prefix. Each spike is a runnable `tsx` file under `spikes/` that prints results to stdout.

**spike 01 — tmux send-keys:**
- Creates a detached tmux session, a window, a pane running `cat`.
- Uses `execFile('tmux', ['send-keys', '-t', target, 'hello world', 'Enter'])`.
- Captures pane output.
- Verifies `hello world\n` appears.
- Prints KNOWN facts: exact arg structure, whether multi-line text works, whether special chars need escaping.

**spike 02 — tmux capture-pane:**
- Attaches to the spike-01 pane.
- Runs `capture-pane -p -S -100`.
- Verifies stdout contains the full scrollback.
- Prints KNOWN facts: format of output, trailing whitespace behavior, how many lines `-S -100` actually returns.

**spike 03 — tmux has-session / list-panes:**
- Runs `has-session -t <real>` and `has-session -t <fake>`, verifies exit codes.
- Runs `list-panes -a -F '#{session_name}:#{window_index}.#{pane_index}'`, verifies output format.
- Prints KNOWN facts: exit code semantics, `-F` format string support.

**Spike exit gate:** all three spikes run clean. `SPIKES.md` file committed with the KNOWN facts from each. Any MODELED or UNKNOWN item in the spike output means you stop and ask the operator before proceeding to §4.

---

## §4 — Phase 1: Registry + prompt assembly

Ticket range: FD-T01 → FD-T04. No tmux code in this phase. Pure filesystem + logic.

### FD-T01 — Repo skeleton + health

**Red:** `test/unit/registry.test.ts` — "readRegistry returns empty object when sessions.json does not exist."

**Green:** Scaffold. `pnpm init`, TypeScript config, vitest config, commander in `src/bin/fd.ts`. `fd --version` works. Registry read returns `{ version: 1, sessions: {} }` when file absent.

**Accept:** `pnpm test` green. `pnpm build && ./dist/bin/fd.js --version` prints version.

### FD-T02 — Registry schema (frozen after this ticket)

**Red:** Five tests:
1. Valid registry parses cleanly.
2. Missing `version` fails validation.
3. Session with missing `cwd` fails.
4. Session with missing `tmux_target` fails.
5. Session with empty-string name key fails.

**Green:** `src/registry/schema.ts` with zod schema:

```ts
const SessionSchema = z.object({
  cwd: z.string().min(1),
  tmux_target: z.string().regex(/^[^:]+:\d+\.\d+$/),  // e.g. sherpa:0.0
  handoff_path: z.string().min(1),
  last_prompt_sent_at: z.string().datetime().nullable(),
  last_handoff_pulled_at: z.string().datetime().nullable(),
});

const RegistrySchema = z.object({
  version: z.literal(1),
  sessions: z.record(z.string().min(1), SessionSchema),
});
```

**Refactor:** Export inferred types. `Session`, `Registry`.

**Accept:** All five tests pass. Schema is exported and importable.

**Freeze commit after this ticket:** `freeze(schema): sessions.json v1 schema`. No body beyond the self-check block.

### FD-T03 — Registry read/write

**Red:** Three tests:
1. Write then read round-trips losslessly.
2. Read of malformed JSON throws a clear error naming the file path.
3. Write creates `~/.foxworks-dispatch/` if missing.

**Green:** `src/registry/read.ts` and `write.ts`. Atomic writes (write to `.tmp`, rename). Validate on read.

**Accept:** Tests use a temp dir, not the real `~/.foxworks-dispatch/`.

### FD-T04 — Prompt footer + assembly (frozen footer string after this)

**Red:** Four tests in `test/unit/prompt-assemble.test.ts`:
1. A prompt without the footer gets the footer appended with `\n\n---\n` separator.
2. A prompt that already contains the footer is returned unchanged.
3. Footer detection is exact-string match on the full footer block, not fuzzy.
4. Footer is appended, never prepended.

**Green:** `src/prompt/footer.ts` exports the frozen footer constant:

```ts
export const HANDOFF_FOOTER = `---
At phase end, write your hand-off note to ./HANDOFF.md.
Overwrite any prior contents. One paragraph. Nothing else in that file.`;
```

`src/prompt/assemble.ts` exports `assemble(promptBody: string): string`.

**Accept:** Tests pass. Footer string matches the constant in §5.3 exactly.

**Freeze commit after this ticket:** `freeze(footer): handoff footer string v1`.

---

## §5 — Phase 2: Transport + the three workhorse commands

Ticket range: FD-T05 → FD-T09. This is where tmux enters.

### FD-T05 — tmux transport module

**Red:** `test/integration/tmux-spike.test.ts`:
- `beforeAll`: create a tmux session `fd-test:0.0` with `cat` as the pane process.
- Test 1: `sendKeys('fd-test:0.0', 'hello\n')` → `capturePane('fd-test:0.0')` contains `hello`.
- Test 2: `sendKeys` with multi-line input (embedded newlines) → capture shows all lines.
- Test 3: `hasSession('fd-test:0.0')` returns true; `hasSession('does-not-exist:0.0')` returns false.
- `afterAll`: kill the session.

**Green:** `src/transport/tmux.ts`:

```ts
export async function sendKeys(target: string, text: string): Promise<void>
export async function capturePane(target: string, lines?: number): Promise<string>
export async function hasSession(target: string): Promise<boolean>
export async function listPanes(): Promise<string[]>
```

All use `execFile`. Never `spawn`. Never string interpolation into a shell.

**UNKNOWN check:** if multi-line send-keys behavior differs from your spike-01 finding, stop, update SPIKES.md, and flag in commit body.

**Accept:** Integration tests pass against a real tmux. CI may need to install tmux — note this in README.

### FD-T06 — `fd init <name>`

**Red:** `test/unit/command-init.test.ts`:
1. Running `init sherpa --cwd /tmp --target sherpa:0.0` with empty registry writes the expected session entry.
2. Running init with a name that already exists errors, does not overwrite.
3. Running init with an invalid tmux_target format errors cleanly.

**Green:** `src/commands/init.ts`. Uses commander. Interactive if flags absent (prompt for cwd, target). Writes to registry.

**Accept:** Tests pass. `fd init --help` shows usage.

### FD-T07 — `fd list`

**Red:** Two tests:
1. Empty registry → `fd list` prints nothing (exit 0).
2. Registry with two sessions → prints two lines, tab-separated: `name\tcwd\ttmux_target`.

**Green:** `src/commands/list.ts`. Machine-parseable output. No pretty formatting (that's `fd status`'s job).

**Accept:** `fd list | awk '{print $1}'` is a valid pattern.

### FD-T08 — `fd send <name> <prompt-file>`

**Red:** `test/integration/command-send.test.ts`:
1. Given a registered session pointing at a real tmux pane, `fd send foo prompts/x.md` results in the file contents (with footer appended) appearing in the pane's scrollback.
2. Prompt file that already has the footer is sent without duplicating it.
3. Sending to a name not in the registry errors cleanly.
4. Sending to a registered session whose tmux target no longer exists errors with a clear "session not running" message, does not silently succeed.
5. After a successful send, `last_prompt_sent_at` is updated in the registry.
6. After a successful send, the prompt is archived to `~/.foxworks-dispatch/archive/<name>/<timestamp>.prompt.md`.

**Green:** `src/commands/send.ts`. Composes read → assemble → hasSession check → sendKeys → archive → registry update.

**Accept:** All six tests pass. The e2e flow is observable: you see the prompt appear in the pane.

### FD-T09 — `fd pull <name>`

**Red:** `test/integration/pull-roundtrip.test.ts`:
1. Given a registered session whose `handoff_path` has fresh content, `fd pull foo` prints that content to stdout.
2. After pull, the content is archived to `~/.foxworks-dispatch/archive/<name>/<timestamp>.handoff.md`.
3. After pull, `last_handoff_pulled_at` is updated.
4. If `HANDOFF.md` does not exist, error cleanly with the expected path in the message.
5. If `HANDOFF.md` mtime is older than `last_prompt_sent_at`, warn on stderr that the handoff may be stale (but still print it — operator decides).
6. Clipboard copy happens via `pbcopy`; test verifies `pbcopy` was invoked with the handoff content (mock execFile for this assertion).

**Green:** `src/commands/pull.ts`.

**Accept:** All six tests pass. The round-trip — you can `echo "done" > HANDOFF.md` in the session's cwd and `fd pull` returns "done" — works.

---

## §6 — Phase 3: `fd status` TUI

Ticket range: FD-T10 → FD-T11. This is the "tracking 5+ sessions" pain.

### FD-T10 — State derivation

**Red:** `test/unit/state-derive.test.ts`. Pure function, no I/O:

```ts
export type SessionState = 'idle' | 'running' | 'awaiting_review' | 'stale';

export function deriveState(input: {
  last_prompt_sent_at: string | null;
  last_handoff_pulled_at: string | null;
  handoff_mtime: Date | null;
  now: Date;
  stale_threshold_ms: number;
}): SessionState;
```

Six table-driven tests covering:
1. No prompt ever sent, no handoff file → `idle`.
2. Prompt sent, handoff file absent → `running`.
3. Prompt sent, handoff mtime newer than last_prompt_sent_at, handoff not pulled since → `awaiting_review`.
4. Prompt sent, handoff pulled more recently than prompt sent → `idle`.
5. Prompt sent >stale_threshold ago, no handoff → `stale`.
6. Prompt sent, handoff pulled, then new prompt sent, old handoff file still on disk with old mtime → `running` (mtime must be newer than last_prompt_sent_at to count).

**Green:** `src/state/derive.ts`. Pure function. No file reads inside.

**Accept:** All six tests pass. Function is side-effect-free and testable without mocks.

### FD-T11 — `fd status` TUI

**Red:** Two tests via ink's test renderer:
1. Given three sessions in different states, the rendered output contains each name, its state in caps, and age text.
2. `awaiting_review` sessions sort above `running` above `stale` above `idle`. (Actually: awaiting_review first, stale second, running third, idle last — see rationale in §6.1.)

**Green:** `src/commands/status.ts`. Ink component. Refresh every 2s via `useEffect`. Reads registry + stats each `handoff_path` for mtime. No keyboard shortcuts in v1 — the legend at the bottom is aspirational, just display it as inert text.

### 6.1 — Why that sort order

`awaiting_review` first: these are sessions begging for your attention; reviewing drains the queue.
`stale` second: these are stuck; you need to decide whether to nudge or kill.
`running` third: in-flight, no action needed yet.
`idle` last: cold, out of your way.

**Accept:** Visual smoke test by running `fd status` against a registry with 5 fake sessions. Screenshot committed to `docs/screenshots/fd-status.png`.

---

## §7 — Explicitly deferred (NOT v1)

Do not build these. Each is deferred deliberately.

- `fd watch <name>` — live tail of a pane. Nice-to-have. You already have tmux for this.
- `fd seal <name>` — archive prompt+handoff pair with a label. Add when archive grows unwieldy.
- `fd tail-handoffs` — fsevents watcher on all HANDOFF.md paths with desktop notifications. Add when you want push-vs-pull.
- `fd send --file-watch prompts/` — auto-send on save. Premature; breaks the "eyeball before sending" discipline.
- Batch commands, cross-session intelligence, scheduling. This is Shape B (Conductor) territory; build it as a separate project if you want it.
- LLM calls of any kind. `fd` never calls Anthropic. Ever. If you feel pressure to add this, you wanted Shape B.
- Web UI, desktop app, Tauri, React-on-desktop. Terminal only.
- Integration with the architect chat (project knowledge writes, auto-pull into Claude.ai). Keep the final copy-paste loop; it's the human review gate.

If any of these start feeling load-bearing during v1, stop and flag. Do not sneak them in.

---

## §8 — v1 exit gate

v1 is done when **all** of these hold:

1. All tickets FD-T01 through FD-T11 committed, tests green.
2. Both freeze commits landed (`freeze(schema)`, `freeze(footer)`).
3. `SPIKES.md` committed with KNOWN facts from all three spikes.
4. Full loop demonstrated end-to-end on the operator's actual Sherpa tmux pane:
   - `fd init sherpa --cwd ~/code/foxworks-sherpa --target <real target>`
   - `fd send sherpa some-test-prompt.md` — prompt appears in the pane
   - Operator writes a dummy HANDOFF.md in the sherpa cwd
   - `fd pull sherpa` — prints the content, copies to clipboard
   - `fd status` — shows sherpa with correct state
5. README.md covers: install, `fd init` flow, the handoff footer convention, and the "if tmux isn't running my session, what do I do" troubleshooting path.
6. Hand-off note written to `HANDOFF.md` per the footer convention — the dispatcher's first real use is reporting its own completion.

After §8 is met, stop. Do not start v2. Do not optimize. Do not polish past README-complete.

---

## §9 — Hand-off note format

At phase end (i.e., v1 exit gate met), write `HANDOFF.md` in the dispatcher's own repo root. One paragraph. Include:

- What shipped (tickets FD-T01 through FD-T11 landed, freeze commits, spikes done).
- What deviated from this contract and why (every deviation named).
- Any UNKNOWN items still outstanding.
- Any tmux behavior that surprised you mid-build.
- The exact commands the operator should run to register their first real session.

That paragraph is what the architect chat will read to decide whether v1 is real or whether you need to go back. Be honest about deviations. "Mostly done" is not done.
