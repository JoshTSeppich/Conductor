# Getting started — zero to one CC session with handoff detection

This is the 30-60 minute walkthrough from cloning the repo to watching
your first Claude Code session emit events into the live dashboard.
You'll come out with a working install of the daemon, one registered
CC session, the web UI showing it, and one round-trip prompt + handoff
verified end-to-end.

If you're looking for command reference, architecture, or
troubleshooting beyond the happy path, the root [README.md](../README.md)
goes deeper. This file is just the linear "follow these steps in
order" tutorial.

Each part has:

- the action to take
- what you should see if it worked
- a pointer to the relevant README section if it didn't

Total time budget: 30-60 minutes. Most parts are 5-10 min.

---

## Part 0 — Prerequisites (5 min)

```bash
node --version   # ≥ 20
tmux -V          # ≥ 3.0
sw_vers          # macOS (Linux is a v2.x concern)
```

If any of those are missing, install them and come back. Homebrew is
the easiest path for `tmux`:

```bash
brew install tmux
```

If you installed `tmux` (or any other tool the daemon shells out to)
via Homebrew, it lives at `/opt/homebrew/bin` (Apple Silicon) or
`/usr/local/bin` (Intel). The daemon installer covers both
automatically — no `PATH` setup needed on your end.

You'll also want `pnpm` for the workspace install:

```bash
npm install -g pnpm
pnpm --version   # any modern version is fine
```

---

## Part 1 — Clone + install (5 min)

```bash
git clone https://github.com/JoshTSeppich/Conductor.git conductor
cd conductor
pnpm install
```

You should see pnpm resolve the workspace + install all six packages
(`dispatch-core`, `dispatch-daemon`, `dispatch-web`, `dispatch-cli`,
plus dev tooling). Takes 30-60 seconds on a fresh machine.

You don't need to build anything yet — the daemon installer in Part 2
builds `dispatch-web` automatically as part of its setup.

**Verify:**

```bash
ls packages
# dispatch-cli  dispatch-core  dispatch-daemon  dispatch-web
```

---

## Part 2 — Install the daemon (5 min)

```bash
pnpm --filter dispatch-daemon install:daemon
```

This:

1. Builds `dispatch-web` (so the web UI is ready to serve).
2. Generates a launchd plist at
   `~/Library/LaunchAgents/com.foxworks.dispatch-daemon.plist`.
3. Loads the agent via `launchctl bootstrap`.
4. Prints post-install instructions for granting macOS notification
   permission.

If you see an "already loaded" message, that's fine — `install:daemon`
is idempotent.

**Verify:**

```bash
curl http://127.0.0.1:7878/v2/health
# {"status":"ok","version":"0.0.0","uptime_seconds":3,"notifications_available":true}
```

A 200 response means the daemon is alive and bound. The
`notifications_available` field tells you whether macOS notification
delivery is reachable (it's `false` until you grant permission per the
post-install instructions; the web UI fallback works either way).

If `/v2/health` doesn't respond, the daemon failed to start. Logs are
at `~/.foxworks-dispatch/logs/daemon.err.log`. The README's
[v2 troubleshooting](../README.md#v2-troubleshooting) section covers
the common failure modes.

---

## Part 3 — Start a Claude Code tmux pane (5 min)

Open a new terminal window. Start a tmux session and run Claude Code
inside it:

```bash
tmux new-session -s sherpa
# (you're now inside the tmux session)
claude
# (Claude Code starts in the foreground)
```

The session name `sherpa` is arbitrary — pick anything memorable. It
doesn't have to match the project you're working on; it's just a
handle the daemon uses to identify this CC instance.

Your tmux target is `sherpa:0.0` — that's `<session>:<window>.<pane>`.
For first-run setups (single window, single pane), it's always
`<session-name>:0.0`. Multi-pane setups are covered in the README's
[v1 install + workflow](../README.md#install) section.

**Detach without closing:** press `Ctrl+B` then `D`. The CC session
keeps running. To re-attach later: `tmux attach -t sherpa`.

---

## Part 4 — Register the session via `fd init` (3 min)

In your original terminal (not the one running tmux/claude):

```bash
./packages/dispatch-cli/dist/bin/fd.js init sherpa \
  --cwd ~/code/your-project \
  --target sherpa:0.0
# registered "sherpa" -> sherpa:0.0 (cwd /Users/you/code/your-project)
```

Replace `~/code/your-project` with whatever directory Claude Code is
working in. The daemon will watch that directory for `HANDOFF.md`
writes (Part 7).

If you symlinked `fd` onto your `$PATH` (the README's Install section
covers this), you can shorten to:

```bash
fd init sherpa --cwd ~/code/your-project --target sherpa:0.0
```

The rest of this tutorial uses `fd` for brevity.

**Verify:**

```bash
fd list
# sherpa	/Users/you/code/your-project	sherpa:0.0
```

The session is now registered in `~/.foxworks-dispatch/sessions.json`
and the daemon has attached a handoff watcher to your project
directory.

---

## Part 5 — Open the web UI (5 min)

```bash
cat ~/.foxworks-dispatch/token
# (a long random base64 string; copy it)
```

In your browser, go to `http://127.0.0.1:7878/`. The dashboard loads
and prompts for a token. Paste the value you just copied.

**Verify:**

The dashboard renders. You should see a kanban-style board with the
`sherpa` session as a card under whichever column matches its current
status (most likely "idle" or "awaiting review" depending on whether
CC has written a HANDOFF yet).

If the page doesn't load, the daemon's static-serve isn't wired —
check that Part 2's `pnpm --filter dispatch-daemon install:daemon`
ran the dispatch-web build (the script logs `✓ dispatch-web/dist
built` if it did). README's
[v2 troubleshooting](../README.md#v2-troubleshooting) has more.

---

## Part 6 — Send a prompt + watch the event flow (10 min)

Create a sample prompt file:

```bash
echo "Build feature X end-to-end with red-then-green TDD." > prompt.md
```

Send it to Claude Code:

```bash
fd send sherpa prompt.md
# sent prompt.md -> sherpa
```

The prompt is read, the frozen handoff footer is appended if not
present, and the result is delivered to the `sherpa` tmux pane via
tmux's `load-buffer` / `paste-buffer` pair. Claude Code receives the
prompt and starts working.

**Verify (CLI side):**

The archive entry should exist:

```bash
ls ~/.foxworks-dispatch/archive/sherpa/
# 20260428T142200Z.prompt.md   (or similar timestamp)
```

**Verify (web UI side):**

In your browser tab, look at the activity ticker (bottom of the
dashboard). You should see a new entry like:

```
→  prompt_sent  ·  sherpa  ·  <a few seconds ago>
```

The session card's status badge may also update (depending on whether
Claude Code is mid-response).

If no event shows up in the ticker but `fd send` exited 0, the
WebSocket connection probably failed. Reload the browser tab and
re-paste the token.

---

## Part 7 — Receive the handoff + see the banner (10 min)

Wait for Claude Code to finish responding. When it's done, ask it to
write `HANDOFF.md` in its working directory (or rely on whatever
handoff convention your project uses).

The daemon's handoff watcher detects the file write within a couple of
seconds and emits `handoff_written`. Two things should happen:

**1. A banner appears** in the top-right of the web UI:

```
Handoff written for sherpa
```

This is a toast banner (auto-dismisses after 5 seconds; T21 wiring).

**2. A ticker entry appears:**

```
H  handoff_written  ·  sherpa  ·  <a few seconds ago>
```

Pull the handoff to your clipboard:

```bash
fd pull sherpa
# <prints HANDOFF.md to stdout, copies same content to clipboard>
```

Paste anywhere to verify the clipboard contents match the file on
disk.

You've now done one full round-trip: prompt out, response in, observed
in the dashboard, retrieved via the CLI. That's the v2 workflow in its
entirety.

---

## Appendix A — Smoke tests (verification reference)

If something feels broken, the smoke tests reproduce a verified
install + workflow path end-to-end. They're handy when you want to
confirm "did I break something or is my expectation off?".

```bash
# Daemon installer/uninstaller smoke (Z-1)
pnpm --filter dispatch-daemon smoke-test

# CLI <-> daemon binding smoke (Z-4)
pnpm --filter dispatch-cli smoke-test-cli

# Cross-component composition smoke: daemon + CLI + web (Z-2)
pnpm --filter dispatch-cli smoke-test-z2 -- --skip-manual
```

The `smoke-test-z2` run installs the daemon, registers a smoke-prefix
session, sends a prompt, asserts the event arrives over WebSocket,
writes a HANDOFF.md to assert the handoff_written event arrives, then
uninstalls and cleans up. Drop `--skip-manual` if you want the
operator-checkpoint step that asks you to verify the browser banner
manually.

Each smoke uses a unique prefix (`z1-smoke-…`, `z4-smoke-…`,
`z2-smoke-…`) so it never touches your real registered sessions.

---

## Appendix B — Next steps

You're at the bottom of the happy path. From here:

- **Reference for every fd command:** the root README's
  [v2 commands](../README.md#v2-commands) section covers `fd init`,
  `list`, `send`, `pull`, `status`, `kill`, plus the daemon-down
  fallback behavior (per contract §7.2).
- **Architecture detail:** README §
  [Architecture](../README.md#architecture) shows the three-component
  diagram (daemon + CLI + web) and how events flow.
- **Troubleshooting depth:** README §
  [v2 troubleshooting](../README.md#v2-troubleshooting) lists every
  known failure mode + remediation (port conflict, schema errors,
  notifications not appearing, etc.).
- **Followups + roadmap:** [docs/FOLLOWUPS.md](FOLLOWUPS.md) lists
  v2.0.1 fast-follows (e.g., `CLI-F-cross-session-handoff` for
  coordination commands across CC sessions) and v2.1+ scope items.
- **State machine semantics:** the daemon's lifecycle states (armed,
  paused, held, killed) and their valid transitions are codified in
  [CONDUCTOR_API_CONTRACT.md §6.1](../CONDUCTOR_API_CONTRACT.md#§6.1-valid-transitions).
  The web UI's State control cluster surfaces these as buttons; only
  valid transitions are enabled.

If a step in this tutorial didn't work and you couldn't find an answer
in the README's troubleshooting section, the smoke tests in Appendix A
are your next diagnostic — they isolate which component is failing.
