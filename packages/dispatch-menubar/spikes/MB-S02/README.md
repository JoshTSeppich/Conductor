# MB-S02 — tmux spawn fidelity spike

Validates whether an Electron-spawned tmux session produces a session record
bit-identical to a CLI-spawned session, per P-0.2 Q2 ship-gate (§8.1,
docs/vision.md).

## Prerequisites

- Dispatch daemon running: `pnpm --filter dispatch-daemon dev` (or installed)
- Auth token at `~/.foxworks-dispatch/token`
- tmux at `/opt/homebrew/bin/tmux` (override with `TMUX_BIN=...`)
- Run from a **login shell** (Terminal.app or iTerm2 with dotfiles sourced)
- `packages/dispatch-menubar` must have electron installed (`pnpm install`)

## Run sequence

All commands run from `packages/dispatch-menubar/`.

### Step A — CLI baseline (run from login shell)
```
bash spikes/MB-S02/a-cli-baseline.sh
```
Writes: `results/env-cli.txt`, `results/pty-cli.txt`, `results/session-cli.json`

### Step B — Electron probes
```
npx electron spikes/MB-S02/b-electron-main.mjs
```
Writes: `results/env-electron-process.txt`, `results/env-electron-b1.txt`,
`results/pty-electron-b1.txt`, `results/env-electron-b2.txt`,
`results/pty-electron-b2.txt`, `results/session-electron.json`

### Step C — env diff
```
node spikes/MB-S02/compare-envs.mjs
```
Writes: `results/env-diff.json`

### Step D — session comparison
```
node spikes/MB-S02/compare-sessions.mjs
```
Writes: `results/session-comparison.json`

### Step E — failure mode coverage
```
node spikes/MB-S02/failure-modes.mjs
```
Writes: `results/failure-modes.json`

## Result files

| File | Produced by | Contents |
|---|---|---|
| `env-cli.txt` | step A | sorted env vars, CLI tmux pane |
| `pty-cli.txt` | step A | PTY state, CLI tmux pane |
| `session-cli.json` | step A | POST /v2/sessions HTTP code + body |
| `env-electron-process.txt` | step B | process.env at Electron startup |
| `env-electron-b1.txt` | step B | env vars, Electron B1 pane (inherited env) |
| `pty-electron-b1.txt` | step B | PTY state, Electron B1 pane |
| `env-electron-b2.txt` | step B | env vars, Electron B2 pane (minimal launchd env) |
| `pty-electron-b2.txt` | step B | PTY state, Electron B2 pane |
| `session-electron.json` | step B | POST /v2/sessions HTTP code + body (Electron B1) |
| `env-diff.json` | step C | structured divergence analysis with classification |
| `session-comparison.json` | step D | field-level session record comparison + verdict |
| `failure-modes.json` | step E | FM-1 through FM-5 verdicts |

## Divergence classification

`env-diff.json` classifies each divergence into one of:

- **PATH_CRITICAL** — vars that affect binary/module resolution (PATH, HOME, NVM_DIR, etc.)
- **CC_BEHAVIORAL** — vars that affect claude or AI tooling behavior
- **TERMINAL_SPECIFIC** — cosmetic terminal vars (TERM, COLORTERM, ITERM_*, etc.)
- **SPAWN_METADATA** — expected: injected by tmux pane context (TMUX_PANE, etc.)
- **UNCLASSIFIED** — everything else

## Key findings summary

See `docs/adr/MB-S02-tmux-spawn-fidelity.md` for the full ADR with actual
measurements, divergence table, PTY comparison, and failure-mode coverage.

## Known gaps going into the spike

- **DAEMON-Z-2**: launchd default PATH is `/usr/bin:/bin:/usr/sbin:/sbin`.
  Electron launched from Finder/Spotlight (B2 context) will not find
  `/opt/homebrew/bin/tmux` or `/opt/homebrew/bin/claude` without PATH injection.
- **FM-5**: max-sessions cap is NOT enforced in v2.0.1. FM-5 is recorded as
  NOT_ENFORCED; v3 must add cap enforcement.
- **`fd spawn` does not exist** in v2.0.1. CLI baseline is manual
  `tmux new-session` + `POST /v2/sessions`, not an `fd` subcommand.
