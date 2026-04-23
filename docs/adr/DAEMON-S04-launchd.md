# DAEMON-S04 — launchd LaunchAgent integration

**Status:** KNOWN (spike passed 2026-04-23)
**Scope:** Phase 2 daemon deployment / lifecycle story — auto-start at login, KeepAlive on crash, log destinations
**Spike script:** `packages/dispatch-daemon/spikes/DAEMON-S04-launchd.ts`

## Decision

**Use a user-level LaunchAgent plist installed at `~/Library/LaunchAgents/com.foxworks.dispatch-daemon.plist`**, bootstrapped into the current GUI session via `launchctl bootstrap gui/<uid> <plist>` and unloaded via `launchctl bootout gui/<uid>/com.foxworks.dispatch-daemon`.

No deployment library needed — `launchctl` is native and the plist is a plain XML template.

## Rationale

LaunchAgents (user domain) are the correct fit for the daemon's requirements:
- Runs under the operator's uid (needed for `~/.foxworks-dispatch/` state access and tmux/pbcopy interaction)
- Starts at login automatically via `RunAtLoad`
- Restarts on crash via `KeepAlive`
- Logs capture via `StandardOutPath` / `StandardErrorPath`

LaunchDaemons (system domain) were rejected: require root, run as root or an arbitrary uid, wrong scope for a user-facing dev tool. The daemon explicitly does NOT want to be a system service — per contract §9 it coordinates the operator's own CC sessions, not a shared service.

`bootstrap`/`bootout` is the current command pair; `load`/`unload` is deprecated on macOS 11+. Spike verifies bootstrap; production installer uses the same commands.

## Probes and results

All 6 probes pass on macOS / darwin arm64 after accounting for launchd's default `ThrottleInterval`:

| ID | Probe | Result |
|---|---|---|
| P1 | `launchctl bootstrap gui/<uid> <plist>` loads a user LaunchAgent | ✓ |
| P2 | `RunAtLoad` fires — toy daemon starts and writes its PID | ✓ pid=88409 |
| P3 | `KeepAlive` restarts after SIGKILL (post-throttle-window) | ✓ original=88409 restarted=88410 |
| P4 | `StandardOutPath` captures stdout (logBytes=874, `started at` + `alive at` both present) | ✓ |
| P5 | `launchctl bootout gui/<uid>/<label>` unloads cleanly | ✓ |
| P6 | Re-bootout is idempotent (errors with known "No such process" pattern; not a wedged state) | ✓ |

## KNOWN facts produced by this spike

### 1. plist template that works on current macOS

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.foxworks.dispatch-daemon</string>
  <key>ProgramArguments</key>
  <array>
    <string>/ABSOLUTE/PATH/TO/node</string>
    <string>/ABSOLUTE/PATH/TO/packages/dispatch-daemon/dist/index.js</string>
  </array>
  <key>KeepAlive</key>
  <true/>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/Users/OPERATOR/.foxworks-dispatch/logs/daemon.out.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/OPERATOR/.foxworks-dispatch/logs/daemon.err.log</string>
</dict>
</plist>
```

### 2. Install / uninstall commands

```bash
# Install (run at end of daemon first-time setup)
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.foxworks.dispatch-daemon.plist

# Uninstall
launchctl bootout gui/$(id -u)/com.foxworks.dispatch-daemon
rm ~/Library/LaunchAgents/com.foxworks.dispatch-daemon.plist
```

Both are idempotent in practice — bootstrap on an already-loaded label errors with a clear message; bootout on an already-unloaded label errors with "No such process" (caught by the installer if needed).

### 3. `KeepAlive: true` is subject to `ThrottleInterval` (default 10s)

Observed during P3: if the daemon exits within 10 seconds of starting, launchd throttles the restart until the 10-second window elapses. For real-world daemon use this is invisible — a production daemon runs for minutes-to-hours before a crash, so each restart clears the throttle window on its own clock.

**Implication for daemon impl:** crash-loop detection can rely on the ThrottleInterval as a natural rate limit. If you want tighter restart behavior for specific exit codes, use `KeepAlive` as a dict with `SuccessfulExit`/`Crashed` sub-keys. Not needed for v2 — default `KeepAlive: true` is the right ergonomics.

### 4. `StandardOutPath` / `StandardErrorPath` capture child stdout/stderr reliably

Verified in P4: the toy daemon's `console.log` output lands in the `StandardOutPath` file within ~1s. For production, logs go to `~/.foxworks-dispatch/logs/daemon.out.log` and `...err.log`.

Files grow unboundedly — **log rotation is a followup** (either daemon-internal rotation using `node:fs` size checks, or operator-side via a separate `logrotate` config; operator preference at ticket time).

### 5. Bootstrap requires absolute paths

Both `ProgramArguments[0]` (node binary) and `ProgramArguments[1]` (daemon entry script) must be absolute. launchd does not inherit the caller's PATH. The installer must resolve the node binary at install time (via `which node` or equivalent) and embed the absolute path in the plist.

**Gotcha for pnpm-installed binaries:** the daemon's built entry is `packages/dispatch-daemon/dist/index.js`. Resolving to this path requires knowing the repo root at install time. The installer will either:
- Ask the operator for the repo path during install, OR
- Detect by walking up from a known marker file (`CONDUCTOR_API_CONTRACT.md` at repo root)

Either works; ticket time decides. Flagged as followup.

### 6. Re-bootout error pattern (idempotency check)

Expected error on double-bootout:

```
Boot-out failed: 3: No such process
```

Installer can safely pattern-match this string (or the exit code 3) and treat it as success. Regex used in spike: `/No such process|not loaded|Could not find (service|specified service)|No such file|Boot-out failed/i` covers observed plus plausible variants.

## Cross-session impacts

**None for Session A↔Session B.** Launchd is daemon-deployment territory; Session B's UI doesn't interact with launchd directly. Session B consumes the daemon via HTTP/WS — how the daemon process came to exist is opaque to the UI.

**One implicit implication from the launchd parent-process story (ties to DAEMON-S03 ADR):** native notifications fired by a daemon running under launchd have a DIFFERENT parent process identity than notifications fired from a terminal. Notification permission granted to Terminal.app does NOT transfer to the launchd-launched daemon. Production installer must surface this to the operator as part of post-install instructions (System Settings → Notifications → Foxworks Dispatch Daemon → grant). This interaction is called out in the DAEMON-S03 ADR and becomes concrete here.

## Followups (non-blocking, filed for ticket phase)

1. **Installer script (`packages/dispatch-daemon/install.sh` or equivalent).**
   - Resolve absolute node path via `command -v node`
   - Resolve repo root (walk up from a marker)
   - Write plist to `~/Library/LaunchAgents/com.foxworks.dispatch-daemon.plist`
   - `launchctl bootstrap` the plist
   - Print post-install instructions including the notification-permission grant step
   - Ticket: DAEMON-T13 or new deployment ticket
2. **Uninstaller** — `bootout` + plist removal + optional state cleanup (the `~/.foxworks-dispatch/` dir). Operator-chosen whether state is preserved on uninstall.
3. **Log rotation.** Daemon-internal rotation on size threshold, OR operator-side `newsyslog.d` / `logrotate` config. Pick at ticket time.
4. **Crash-loop visibility.** If daemon keeps crashing, launchd keeps restarting. Operator won't notice unless something surfaces the loop. Followup: daemon logs consecutive-crash count on startup; after N failures, writes to a prominent location (`~/.foxworks-dispatch/CRASH.md`) so `fd status` or Session B's UI can display a health warning.
5. **Production plist uses a dict `KeepAlive`?** Default `true` is fine for v2. If specific exit codes should NOT trigger restart (e.g., operator-initiated clean shutdown via SIGTERM), migrate to `KeepAlive: { SuccessfulExit: false }` at ticket time.
6. **`launchctl kickstart`** as a force-restart verb. Not needed for v2 flow; useful if daemon gets wedged without crashing.

## Tradeoffs and gotchas

- **ThrottleInterval delays rapid restart.** Already covered above. Non-issue for real daemon use; matters only for stress-testing.
- **Absolute paths in plist become stale if the repo moves.** Operator who relocates the checkout must re-run the installer. Acceptable — not a daily-use scenario.
- **launchd logs its own errors to the system log.** If bootstrap fails with an unclear error, check `log show --predicate 'process == "launchd"' --last 5m` for launchd's side of the story.
- **Spike cleanup is non-destructive but uses unique labels per-run** (`com.foxworks.dispatch-daemon.spike.<pid>`) so repeated failed cleanups don't accumulate — each run uses a fresh label.

## Provenance

- No direct contract section — launchd is implementation/deployment, not API surface
- Contract §6.3 — "State persists to sessions.json (durable across daemon restarts)" invariant depends on reliable daemon restart, which is what this spike verifies
- DAEMON-S03 ADR — notification permission story has a launchd-parent-process interaction, surfaced here
- Operator arbitration 2026-04-23 — `bootstrap`/`bootout` chosen over legacy `load`/`unload`; throttle-window discovery documented as a spike finding, not contract-impacting
