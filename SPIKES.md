# SPIKES.md — KNOWN facts for foxworks-dispatch v1

The tmux surface is the highest-risk part of this build (§1.1). Before any
production code touches tmux, three spikes (§3.3) ran against a real tmux
3.6a server on macOS (Node 20.19.6, darwin arm64, Homebrew tmux). Every
fact below is **KNOWN** — measured in this repo, not inferred from docs.
Any MODELED-vs-KNOWN deviations are called out explicitly.

Rerun any spike at any time with:

```bash
pnpm spike:01   # tmux send-keys
pnpm spike:02   # tmux capture-pane
pnpm spike:03   # has-session / list-panes / display-message
```

Each spike creates and tears down its own detached tmux session (names:
`fd-spike-01`, `fd-spike-02`, `fd-spike-03`). They do not touch any other
session on the server.

---

## Spike 01 — tmux send-keys (prompt delivery)

**Probes, all PASS**:

| ID | What it checks |
| --- | --- |
| A1 | Baseline `send-keys 'hello world' Enter` delivers text and submits. |
| A2 | Multi-word text containing the sub-word `Enter` is typed literally (single argv element is looked up as a key name, not tokenised). |
| A3 | `send-keys -l <text>` forces literal typing, followed by separate `send-keys Enter` to submit. |
| A4 | **Danger case, confirmed.** `send-keys 'Up' Enter` interprets the argv element `Up` as the Up-arrow key. The literal string `Up` never reaches the pty. |
| B1 | `load-buffer` + `paste-buffer` preserves triple-backticks, template-literal ``` `${x}` ```, `$` signs, nested `"quotes"`, inline `` `backticks` ``, and the bare words `Up`/`Enter` embedded in text. |
| B2 | `send-keys -l` with embedded `\n` delivers every line to the pty. |

### KNOWN

1. **Transport.** `execFile('tmux', [...args])` is the correct entry point.
   No shell, no interpolation — prompt content with `$`, `` ` ``, quotes,
   embedded newlines is safe.

2. **Target form.** `<session>:<window>.<pane>`, e.g. `sherpa:0.0`. Stored
   in `sessions.json` exactly like that. Validated by the §4.2 schema
   regex `^[^:]+:\d+\.\d+$`.

3. **Key-name hazard (A4).** Each argv element passed to `send-keys`
   *without* `-l` is first looked up as a tmux key name (`Enter`, `Up`,
   `Down`, `Tab`, `C-a`, `M-x`, etc.). If the whole element matches, it is
   sent as that key, not as characters. A prompt whose text is exactly a
   key-name token (single word) would be silently dropped. **Never pass
   prompt content as a bare argv element.**

4. **Production pattern (decided).** For any prompt content, use
   `load-buffer` + `paste-buffer` + bare Enter:

   ```
   tmux load-buffer  -b <unique-name> -      (stdin: prompt bytes)
   tmux paste-buffer -b <unique-name> -t <target>
   tmux send-keys    -t <target> Enter
   tmux delete-buffer -b <unique-name>
   ```

   Preserves every character literally; one atomic paste from the target
   TUI's perspective (important for Claude Code, which distinguishes
   paste from typing).

5. **Alternate pattern (fallback only).** `send-keys -l <text>` types each
   codepoint literally (embedded `\n` included), then a separate
   `send-keys Enter` submits. Works (A3, B2) but is not the default —
   char-by-char typing risks intermediate interpretation in rich TUIs.

6. **Production `sendKeys` in `src/transport/tmux.ts` (FD-T05)** will use
   the pattern in point 4. A helper `sendEnter(target)` wraps the bare
   Enter for callers that only need to submit.

7. **Session creation for tests.** `tmux new-session -d -s <name> -x <W>
   -y <H> <cmd>`. `-d` detaches; otherwise the spike would hang waiting
   for a client.

---

## Spike 02 — tmux capture-pane (scrollback read)

**Probes, all PASS**:

| ID | What it checks |
| --- | --- |
| C4 | Fresh empty pane returns a blank string (one newline per visible row); does not error. |
| C1 | `-p` prints the captured content to stdout as a plain string. |
| C2 | Per-line trailing whitespace is stripped by default. |
| C3 | `-S -N` returns N scrollback lines *plus* the current visible pane, oldest first. Lines that scrolled off the visible pane are recoverable. |
| C5 | `-S -` (the sentinel) returns the entire available scrollback. |

### KNOWN

1. **Invocation.** `capture-pane -t <target> -p -S -<N>` prints N lines of
   history + the visible pane to stdout. `-p` is mandatory to print;
   without it tmux stores the content in a paste buffer instead.

2. **Ordering.** Lines are chronological: oldest first, most recent last.
   A single trailing newline terminates the block.

3. **Whitespace stripping.** Each captured line has trailing whitespace
   removed by default. Acceptable for fd — v1 has no byte-preserving use
   case for capture-pane.

4. **Full-history sentinel.** `-S -` returns everything. Safe but
   unbounded; production callers should prefer a bounded `-S -N`.

5. **Empty pane.** Returns a blank string of (visible-rows) newlines. No
   error, no special case needed.

6. **Production note.** **fd v1 does not use `capture-pane` in production
   code.** The hand-off round-trip goes through `HANDOFF.md` on disk, not
   pane scraping. The `capturePane` export in `src/transport/tmux.ts`
   exists so FD-T05 integration tests can observe what `sendKeys`
   delivered. Keeping it documented and correct makes v2 features
   (`fd watch`, `fd tail-handoffs`) cheaper.

---

## Spike 03 — has-session / list-panes / display-message (target existence)

**Probes, all PASS**:

| ID | What it checks |
| --- | --- |
| D1  | `has-session -t <real>` exits 0 with empty stdout/stderr. |
| D1b | `has-session -t <fake>` exits 1 with `can't find session: <name>` on stderr. |
| D2  | `has-session -t <sess>:<w>.<p>` validates the FULL target on tmux 3.6a. |
| D3  | `list-panes -a -F '#{session_name}:#{window_index}.#{pane_index}'` yields one fully-qualified target per line. |
| D4  | `display-message -p -t <target> '#{pane_id}'` returns `%N` for a good target; fallback (and no error) on a bad target. |
| D5  | Records the production decision. |

### MODELED-vs-KNOWN deviation (flagged)

- **MODELED** (going in): `has-session` only checks the session portion of
  a `-t <sess>:<w>.<p>` target. Production would therefore need
  `display-message` to validate the full target.
- **KNOWN** (from D2 on tmux 3.6a): `has-session` validates the *full*
  target. A missing pane yields exit 1 with `can't find pane: N`. So
  production can use `has-session -t <fq-target>` directly.

The first run of spike 03 asserted the MODELED expectation and failed.
The current spike asserts the KNOWN behavior. Deviation is noted both in
the spike source (at the D2 probe) and in this document.

### KNOWN

1. **`has-session` semantics on tmux 3.6a.**
   - `has-session -t <sess>` → exit 0 if session exists, exit 1 with
     `can't find session: <sess>` on stderr otherwise.
   - `has-session -t <sess>:<w>.<p>` (fully qualified) also validates the
     window and pane: bad pane → exit 1 `can't find pane: N`; bad window
     → exit 1 `can't find window: N` (inferred from the pane-path
     verification; same code path).
   - Exit code is authoritative. Do not parse stderr for control flow.

2. **Production `hasSession(target)` decision.**
   `src/transport/tmux.ts` (FD-T05) will call `execFile('tmux',
   ['has-session', '-t', target])` with the fully-qualified target stored
   in `sessions.json`, and return `true` iff exit code 0. No
   `display-message`. No `list-panes`.

3. **`list-panes -a -F '...'`.** Useful for a future `fd init`
   tab-completion path. Not on the v1 hot path; exported only for
   possible later use.

4. **`display-message` caveat (from D4).** On tmux 3.6a, `display-message
   -p -t <invalid-target> '#{pane_id}'` returns exit 0 with a fallback
   `#{pane_id}` (the caller's "current" pane, or empty for a fully-
   missing session). It does **not** signal the invalid target. Therefore
   `display-message` is unsafe as an existence check. If fd ever needs
   the `pane_id` for a target, only call `display-message` AFTER
   `has-session` has already returned 0.

---

## Summary of production choices locked in by these spikes

- **FD-T05 `sendKeys(target, text)`**: `load-buffer` + `paste-buffer` +
  bare `Enter` + `delete-buffer`. Unique buffer name per call. Rationale
  in Spike 01 §4.
- **FD-T05 `capturePane(target, lines?)`**: `capture-pane -p -S -<N>`;
  exposed for integration tests and future v2 features.
- **FD-T05 `hasSession(target)`**: `has-session -t <fq-target>`; exit 0
  ⇒ `true`, else `false`. Works for fully-qualified targets per D2.
- **FD-T05 `listPanes()`**: `list-panes -a -F '#{session_name}:#{window_index}.#{pane_index}'`;
  returns `string[]`, one target per element. Out of v1 hot path but
  exported.

No MODELED or UNKNOWN items remain. Phase 0 exit gate (§3.3) is met;
proceed to §4 once the operator confirms.
