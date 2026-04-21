# foxworks-dispatch (`fd`)

A single-purpose CLI that eliminates mechanical copy-paste between an
architect chat (Opus in Claude.ai) and Claude Code sessions running in
tmux panes. You name each CC session once with `fd init`, then drive it
with `fd send <name> <prompt.md>` and retrieve its reply with
`fd pull <name>`. `fd status` gives you a live dashboard when you're
tracking more than two or three sessions.

`fd` never calls an LLM. It is a shell between your typing and tmux.

## Install

Requirements:

- Node.js ≥ 20
- `tmux` ≥ 3.0 on `$PATH`
- macOS (`pbcopy` is used for `fd pull`'s clipboard step; Linux support
  is a v2 concern)

Clone and build:

```bash
git clone <this-repo> foxworks-dispatch
cd foxworks-dispatch
pnpm install
pnpm build
# Either symlink the binary onto your PATH…
ln -s "$PWD/dist/bin/fd.js" ~/.local/bin/fd
# …or just invoke it directly.
./dist/bin/fd.js --help
```

Registry and archive live under `~/.foxworks-dispatch/` (created on
first write).

## The one-sentence workflow

> Running `fd send sherpa prompts/tk-07.md` pipes the prompt into the
> Sherpa Claude Code pane, and when CC finishes, `fd pull sherpa` puts
> the hand-off in my clipboard.

Everything below is in service of that sentence.

### 1. `fd init <name>`

Register a session. You need the tmux target of the pane where Claude
Code is running. Find it with `tmux list-panes -a -F '#{session_name}:#{window_index}.#{pane_index}'`.

```bash
fd init sherpa --cwd ~/code/foxworks-sherpa --target sherpa:0.0
# registered "sherpa" -> sherpa:0.0 (cwd /Users/you/code/foxworks-sherpa)
```

`--cwd` is the directory where Claude Code is running. `fd pull` reads
`<cwd>/HANDOFF.md`, so the session must write its hand-off there (see
the footer convention below).

Omit the flags to be prompted interactively.

### 2. `fd send <name> <prompt-file>`

```bash
fd send sherpa prompts/tk-07.md
# sent prompts/tk-07.md → sherpa
```

The prompt file is read, the frozen hand-off footer is appended if it
isn't already present, and the result is delivered to the pane via
tmux's `load-buffer` / `paste-buffer` pair — so triple-backticks,
template literals, `$`-variables, and nested quotes all round-trip
unchanged. The assembled prompt is archived to
`~/.foxworks-dispatch/archive/<name>/<timestamp>.prompt.md`.

### 3. `fd pull <name>`

```bash
fd pull sherpa
# <prints HANDOFF.md to stdout, copies same content to clipboard>
```

Reads `<cwd>/HANDOFF.md`, prints it, pipes it through `pbcopy`, and
archives it under `archive/<name>/<timestamp>.handoff.md`. If
`HANDOFF.md`'s mtime is older than the last prompt sent to the session,
the content still prints but a staleness warning lands on stderr — the
operator decides whether the hand-off is fresh enough.

### 4. `fd status`

```bash
fd status
# live TUI, Ctrl+C to exit
```

Refreshes every 2s. Rows sort:

1. `AWAITING_REVIEW` — hand-off waiting for you (yellow)
2. `STALE` — prompt sent >30m ago, still nothing back (red)
3. `RUNNING` — prompt sent, working (cyan)
4. `IDLE` — cold, or cycle closed (gray)

The key legend at the bottom is **inert** in v1. No `r/s/w/q` handlers
are wired — Ctrl+C is the only input the TUI listens for.

### 5. `fd list`

Machine-parseable: one line per session, tab-separated
`name<TAB>cwd<TAB>tmux_target`. Meant for shell pipelines, not
humans. Use `fd status` for a humane view.

## The hand-off footer convention

`fd send` appends this exact block to every prompt it delivers (unless
the block is already present, verbatim, in which case it's not
duplicated):

```
---
At phase end, write your hand-off note to ./HANDOFF.md.
Overwrite any prior contents. One paragraph. Nothing else in that file.
```

The CC session on the other end is expected to honor it:

- Single file, always `./HANDOFF.md` relative to the session's `cwd`.
- Overwrite on every hand-off — no appending, no versioning.
- One paragraph. Short. Meant to be read.

That convention is what makes `fd pull` a single atomic action. If the
session writes somewhere else, or splits the hand-off across multiple
files, `fd pull` will not find it.

The footer string is a **frozen contract** (see
`freeze(footer)` in git log). If you edit it, every CC session you've
been running will instantly be out of convention.

## Troubleshooting

### "session … is registered but its tmux target … is not currently running"

`fd send` calls `tmux has-session -t <fq-target>` before delivering the
prompt. If the pane doesn't exist (you closed the window, rebooted, or
tmux crashed), you get that error.

Recovery:

1. Start the pane again (e.g., `tmux new-session -s sherpa` + launch
   Claude Code inside).
2. Confirm the target matches what `fd list` has for that session:
   `tmux list-panes -a -F '#{session_name}:#{window_index}.#{pane_index}'`.
3. If the target drifted (e.g., the window index changed), remove the
   stale registry entry by editing
   `~/.foxworks-dispatch/sessions.json` and re-running `fd init`.

### "expected HANDOFF.md at … — not found"

`fd pull` couldn't read `<cwd>/HANDOFF.md`. The CC session either
hasn't written it yet, or it wrote to a different path.

- Attach to the pane (`tmux attach -t <target>`) and look at what it
  said last. Most of the time, the session is still working and just
  hasn't reached "phase end" yet.
- If it claims it wrote the hand-off, check the cwd — the registry's
  `cwd` is what `fd` reads from, and it's the CC session's own working
  directory (not where you ran `fd` from).

### "hand-off at … is stale"

The `HANDOFF.md` on disk is older than the most recent prompt you sent.
The content still prints — this is a warning, not an error — but it
usually means either (a) the CC session never got around to rewriting
the hand-off for the current prompt, or (b) you sent a fresh prompt and
then called `fd pull` too early.

### Clipboard didn't update

`fd pull` uses `pbcopy`. If `pbcopy` is missing (you're not on macOS)
or failing, the pull errors out before the clipboard step returns —
you'll see the underlying error. Linux support is a v2 concern.

### Registry got into a weird state

`~/.foxworks-dispatch/sessions.json` is the only source of truth. It's
schema-validated on every read (zod, `freeze(schema)`). If something is
wrong with it, `fd` will name the file path in the error. Edit it
manually — it's small — and re-run.

## What's not here (v1 scope)

By design:

- No `fd watch` — use `tmux attach` if you want a live pane.
- No file-watcher auto-send — the "eyeball before sending" discipline is
  load-bearing.
- No LLM calls from `fd`, ever.
- No UI beyond the terminal.

Detail in `BUILD_CONTRACT.md` §7.

## Where the moving parts live

- `src/transport/tmux.ts` — the only file that talks to tmux. All calls
  go through `execFile` with an arg array (never a shell).
- `src/registry/{schema,read,write}.ts` — zod schema + atomic writes
  (write to `.tmp`, rename).
- `src/prompt/{footer,assemble}.ts` — the frozen footer + append logic.
- `src/state/derive.ts` — pure state machine for `fd status`.
- `src/commands/{init,list,send,pull,status}.ts` — one module per
  subcommand.
- `SPIKES.md` — every tmux behavior we relied on, verified against a
  real tmux server before any production code was written.
- `BUILD_CONTRACT.md` — what this repo was built to do, in full.
