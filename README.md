# foxworks-dispatch (`fd`)

A single-purpose CLI that eliminates mechanical copy-paste between an
architect chat (Opus in Claude.ai) and Claude Code sessions running in
tmux panes. You name each CC session once with `fd init`, then drive it
with `fd send <name> <prompt.md>` and retrieve its reply with
`fd pull <name>`. `fd status` gives you a live dashboard when you're
tracking more than two or three sessions.

`fd` never calls an LLM. It is a shell between your typing and tmux.

> **v2 adds a daemon and a web UI.** When the daemon is running, `fd`
> commands route through HTTP; when it isn't, they fall back to the v1
> behavior described below. See [Conductor v2 (daemon mode)](#conductor-v2-daemon-mode) for install + architecture.

> **New to fd?** See [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md)
> for a step-by-step zero-to-one walkthrough (~30-60 min from clone to
> watching CC events in the dashboard).

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

> `fd` assumes basic tmux fluency (sessions, panes, attach/detach). If
> you're not familiar, the `tmux` man page or any short primer is
> worth ~15 minutes before going further.

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

---

## Conductor v2 (daemon mode)

v2 adds three components on top of the v1 CLI:

- **dispatch-daemon** — Fastify HTTP + WebSocket server bound to
  `127.0.0.1:7878` that manages session state, watches HANDOFF.md /
  git refs / STATUS.json, and emits real-time events.
- **dispatch-web** — React + Tailwind dashboard that consumes the
  daemon's HTTP+WS surface (Session B territory).
- **dispatch-cli (v2)** — the `fd` CLI you already use, refactored to
  route commands through the daemon when it's running and fall back
  to the v1 behavior when it isn't.

The daemon is optional: every v1 command still works without it. v2
adds visibility-and-control surface (web UI, lifecycle commands,
push events), not new responsibilities for the CLI itself.

### Install the daemon

Prerequisites: completed the v1 `Install` section above (so
`pnpm install` has been run at the repo root).

```bash
pnpm --filter dispatch-daemon install:daemon
```

This:

1. Resolves the absolute path to `node` and to
   `packages/dispatch-daemon/src/index.ts` from this repo.
2. Generates a launchd plist at
   `~/Library/LaunchAgents/com.foxworks.dispatch-daemon.plist` that
   runs `node --import tsx <repo>/packages/dispatch-daemon/src/index.ts`
   with `WorkingDirectory` set to the repo root.
3. Bootstraps the agent: `launchctl bootstrap gui/$(id -u) <plist>`.
4. Prints post-install instructions for granting macOS notification
   permission (System Settings → Notifications → "Foxworks Dispatch
   Daemon" / "terminal-notifier" → Allow). See `docs/adr/DAEMON-S03-notifications.md`
   for why this is per-launchd-parent-process.

Re-running `install:daemon` against an already-loaded daemon is a
safe no-op (prints "already loaded; idempotent re-run").

### Verify

```bash
curl http://127.0.0.1:7878/v2/health
# {"status":"ok","version":"0.0.0","uptime_seconds":3,"notifications_available":true}
```

`/v2/health` is **auth-exempt by design** (per contract §4.1 + the
daemon's `auth.ts` path bypass). A 200 here means the daemon process
is alive and bound. A 401 instead would mean route registration is
broken — check daemon logs at `~/.foxworks-dispatch/logs/daemon.err.log`.

```bash
launchctl list | grep foxworks
# -    0    com.foxworks.dispatch-daemon
```

### Uninstall

```bash
pnpm --filter dispatch-daemon uninstall:daemon
# default: preserves ~/.foxworks-dispatch/ state (sessions, archive, token)

pnpm --filter dispatch-daemon uninstall:daemon -- --clean
# with --clean: prompts to also remove ~/.foxworks-dispatch/ entirely
```

`uninstall:daemon` is tolerant of "not currently loaded" — running
it twice is safe.

## v2 commands

The v1 commands (`fd init`, `fd list`, `fd send`, `fd pull`,
`fd status`) all still work; with the daemon up they go through
HTTP, with it down they fall back to v1 behavior automatically and
print a one-line warning on stderr.

v2 adds four lifecycle commands. These **require the daemon** —
they touch the v2 state machine that v1 doesn't know about:

| Command            | Effect                                              |
|--------------------|-----------------------------------------------------|
| `fd kill <name>`   | Transition session to `killed` (terminal). Prompts for confirmation; pass `--yes` to skip. |
| `fd pause <name>`  | Transition `armed` → `paused` (no side effect).      |
| `fd hold <name>`   | Transition `armed` → `held` (daemon sends Ctrl-C to the tmux pane). |
| `fd arm <name>`    | Transition `paused`/`held` → `armed` (resume).       |

If the daemon is down when you run one of these, you'll see:

> `This command requires the Conductor daemon. Start it with `launchctl ...`.`

That's by design — v1 has no concept of paused/held, so falling back
silently would lie about what happened.

The state machine itself is contract §6.1; valid transitions are
enumerated there. `fd status` shows the current state of every
session.

## Architecture

High level:

```
┌─────────────────────────────────────────────────────────────┐
│                        fd CLI                               │
│  init  list  send  pull  status  kill  pause  hold  arm     │
└────────────────────┬─────────────────┬──────────────────────┘
                     │ HTTP /v2/*       │ direct sessions.json
                     │ (daemon up)      │ (daemon down — fallback)
                     ▼                  │
┌─────────────────────────────────────┐ │
│      dispatch-daemon (Fastify)      │ │
│  /v2/sessions  /v2/events  /v2/health│ │
│  WS /v2/events/stream                │ │
└────┬──────────────┬─────────────┬────┘ │
     │ tmux         │ FSEvents    │     │
     ▼              ▼             ▼     ▼
   tmux pane    HANDOFF.md /     ~/.foxworks-dispatch/
   (CC session) .git/refs /      sessions.json (shared
                STATUS.json       v1 + v2 state)
```

Same `~/.foxworks-dispatch/sessions.json` is read and written by
both the daemon (v2 schema) and the CLI v1 fallback (transparent
v2-aware reader; see `packages/dispatch-core/src/registry/schema.ts`).

dispatch-web (Session B's territory) consumes the same daemon HTTP
+ WS surface; it isn't installed by `install:daemon`. See
`docs/adr/UI-S01-websocket-client.md`.

For deeper detail:

- **API contract** — `CONDUCTOR_API_CONTRACT.md` (auth, endpoints,
  events, state machine, fd v1 backward compat)
- **launchd integration** — `docs/adr/DAEMON-S04-launchd.md`
- **WebSocket** — `docs/adr/DAEMON-S01-websocket.md`
- **FSEvents watching** — `docs/adr/DAEMON-S02-fsevents.md`
- **Notifications** — `docs/adr/DAEMON-S03-notifications.md`
- **HTTP server** — `docs/adr/DAEMON-S05-http-server.md`

## v2 troubleshooting

### Daemon installed but `/v2/health` not reachable

Most common cause: daemon process is launching under launchd but
exiting immediately. Check the error log:

```bash
tail -30 ~/.foxworks-dispatch/logs/daemon.err.log
```

If you see `ERR_MODULE_NOT_FOUND` referencing
`dispatch-core/src/lib/...`, your install ran an outdated build path.
Re-run `pnpm --filter dispatch-daemon install:daemon` against a
current checkout (this was Z-1's Path B fix).

If you see `Cannot find package 'tsx'`, the daemon's plist is
missing `WorkingDirectory` — same Z-1 fix; re-run `install:daemon`.

If you see something else, capture the stack and check daemon
imports against the package being requested.

### `fd init` fails with schema validation errors after daemon was running

If you see something like `path: ["version"], message: "Invalid input: expected 1"`,
your `~/.foxworks-dispatch/sessions.json` was migrated by the
daemon to v2 schema, and you're hitting an older CLI build whose
v1 fallback can't read v2. Resolved at Z-4 — pull the latest
checkout and rebuild.

### Notifications not appearing

macOS sandboxes notification permissions per parent process. The
daemon running under launchd has a different parent than the
daemon running from your terminal during dev — granting permission
to `Terminal.app` doesn't transfer.

Open System Settings → Notifications, find "Foxworks Dispatch
Daemon" or "terminal-notifier", and enable Allow. If you granted
permission after the daemon was already running, restart it:

```bash
launchctl kickstart -k gui/$(id -u)/com.foxworks.dispatch-daemon
```

Daemon's `notifications_available` flag on `/v2/health` reflects
its own probe at startup; if it's `false` the web UI falls back to
in-banner display automatically.

### Port 7878 already in use

```bash
lsof -ti :7878
```

Find what's holding it. Most likely another instance of the daemon
or a stale process. Kill it (`kill <pid>`), wait a second, then
re-run `install:daemon`. Configurable port is a v2.1 followup
(`CLI-F-probe-timeout-env` covers the related probe-timeout knob).

### Smoke-testing the install end-to-end

```bash
pnpm --filter dispatch-daemon smoke-test       # daemon install/uninstall
pnpm --filter dispatch-cli smoke-test-cli      # CLI ↔ daemon binding
```

Both scripts ship in this repo. They install + verify + uninstall
in a single run. They preserve `~/.foxworks-dispatch/` operator
state (sessions, token, archive) — only entries with the
`z4-smoke-` prefix are removed at cleanup.
