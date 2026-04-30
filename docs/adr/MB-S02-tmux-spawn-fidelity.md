# MB-S02 — tmux spawn fidelity (CLI vs Electron)

**Status:** ACCEPTED. Spike-only ADR; informs MB-T05 spawn handler design and
flags an ambiguity in the §8.1 ship-gate "bit-identical" claim.

**Date:** 2026-04-29

**Authors:** Operator-supervised CC session; harness scaffold at commit
`5f21de6 spike: MB-S02 harness scaffold — tmux spawn fidelity`,
fix at `27e04dd spike: MB-S02 fix compare-sessions MUST_BE_NULL field names`.

**Related contracts:**
- `docs/vision.md` §8.1 (P-0.2 Q2 ratified bit-identical spawn parity bar)
- `CONDUCTOR_API_CONTRACT.md` §4.3 (`POST /v2/sessions`), §10.1 (confidence labels), §10.5 (self-check)
- `WORKSTATION_CONTRACT.md` §3.1 (orchestrator role), §5 (card UI)

**Confidence labels per claim:** KNOWN (measured in this spike), MODELED
(reasoned from contract + measured-adjacent data, not directly measured),
SPECULATIVE (best-guess; calls out the gap).

---

## §1 — Context and question

P-0.2 Q2 (vision §8.1) ratified that v3.0 ships only when an
Electron-spawned tmux session produces a session record **bit-identical**
to a CLI-spawned session — every env var, every PTY behavior matches,
spike-validated. MB-S02 is the spike that produces the validation
evidence.

**The question this spike answers:** under what spawn-context conditions,
if any, does an Electron-spawned tmux pane produce identical (a) env
vars, (b) PTY behavior, (c) registered session record, and (d) failure
modes versus a CLI-spawned pane? And if it doesn't, what's the gap and
what does MB-T05 need to do?

**What was specifically NOT in scope:** spawning `claude` itself,
end-to-end CC execution, persistence-side validation (MB-S03 territory).
The spike measures the spawn-fidelity surface only.

## §2 — Method

Two spawn contexts measured under isolated-tmux-server conditions
(`tmux -L <unique-socket> -f /dev/null`) so an already-running tmux
server's environment does not contaminate results:

- **CLI baseline** (`a-cli-baseline.sh`): operator runs from a login
  shell (Terminal.app with full dotfile sourcing). Probe scripts spawn
  inside isolated tmux panes. Session registered via `POST /v2/sessions`
  through the running daemon. Result files: `env-cli.txt`, `pty-cli.txt`,
  `session-cli.json`.

- **Electron probes** (`b-electron-main.mjs`): `npx electron` from the
  same login shell, app-ready spawns four tmux probes — two with
  inherited `process.env` (B1) and two with a minimal launchd-style env
  (B2: `HOME`, `USER`, `LOGNAME`, `PATH=/usr/bin:/bin:/usr/sbin:/sbin`,
  `TMPDIR` only). Single registration probe in B1 mode (B2 not separately
  scoped — see §5 caveat). Result files: `env-electron-process.txt`,
  `env-electron-b1.txt`, `pty-electron-b1.txt`, `env-electron-b2.txt`,
  `pty-electron-b2.txt`, `session-electron.json`.

- **Comparison passes**: `compare-envs.mjs` produces structured diff with
  five-bucket classification (PATH_CRITICAL, CC_BEHAVIORAL,
  TERMINAL_SPECIFIC, SPAWN_METADATA, UNCLASSIFIED) → `env-diff.json`.
  `compare-sessions.mjs` does field-level parity check on registration
  bodies → `session-comparison.json`. `failure-modes.mjs` exercises five
  scenarios → `failure-modes.json`.

All measurements were taken in a single harness run on operator's
primary macOS workstation (Darwin 25.3.0, arm64), 2026-04-30T04:56Z.
Source artifacts in `packages/dispatch-menubar/spikes/MB-S02/results/`.

## §3 — Environment variable parity

**Source:** `results/env-diff.json` (lines cited inline below). CLI
baseline carried 32 vars (line 3, `cli_var_count: 32`).

### §3.1 B1 — inherited `process.env` (npx-electron-from-terminal)

**Verdict: 27 divergences from CLI baseline. NOT bit-identical.**
Confidence: KNOWN.

By bucket (`env-diff.json` line 199-208):

| Bucket             | Count | Examples                                                                  |
|--------------------|-------|---------------------------------------------------------------------------|
| CC_BEHAVIORAL      | 19    | `npm_command`, `npm_config_*` (12 vars), `npm_lifecycle_*`, `NODE_PATH`   |
| UNCLASSIFIED       | 4     | `COLOR`, `EDITOR`, `INIT_CWD`, `NODE`                                     |
| PATH_CRITICAL      | 2     | `PATH` (value differs), `npm_config_prefix` (only in electron)            |
| SPAWN_METADATA     | 1     | `TMUX` (different socket — expected per probe isolation)                  |
| TERMINAL_SPECIFIC  | 1     | `__CF_USER_TEXT_ENCODING`                                                 |

**Critical observation on `PATH` (env-diff.json line 47-48):** B1's PATH
is a **functional superset** of CLI PATH, not a disjoint divergence. B1
prepends node_modules/.bin walk-up entries (npm-injected) and
node-gyp-bin, then appends the operator's full CLI PATH verbatim. The
CLI PATH segments — `/Users/joshuatseppich/Library/pnpm`,
`/Users/joshuatseppich/.local/bin`,
`/Users/joshuatseppich/.nvm/versions/node/v20.19.6/bin`,
`/opt/homebrew/bin`, `/opt/homebrew/sbin`, `/usr/local/bin`, system
paths, `/Users/joshuatseppich/.cargo/bin` — are all present in B1's PATH
in the same relative order. So `tmux` and `claude` at `/opt/homebrew/bin`
DO resolve via PATH lookup in B1 mode. (KNOWN.)

**The 19 `npm_*` and `INIT_CWD` / `NODE` / `npm_config_prefix`
divergences are an artifact of `npx electron` itself**, not of Electron's
runtime. `npx` injects a sandboxed npm execution context (process.env
NODE, npm_lifecycle_event=npx, etc.) which Electron then inherits. A
shipped `.app` bundle launched via Finder/Spotlight would NOT carry
these vars — its env is closer to B2 (see §3.2). MODELED. The B1
measurement therefore overstates "what dev-mode dispatch-menubar looks
like" relative to what `.app`-launch would look like. The B2 measurement
understates it (no dotfile-sourced vars at all). Truth is between the
two; MB-T05 must explicitly choose where on that spectrum to land.

### §3.2 B2 — minimal launchd env (Finder/Spotlight launch context)

**Verdict: 20 divergences from CLI baseline. NOT bit-identical, with
PATH-resolution-breaking gaps.** Confidence: KNOWN.

By bucket (`env-diff.json` line 354-364):

| Bucket             | Count | Examples                                                              |
|--------------------|-------|-----------------------------------------------------------------------|
| UNCLASSIFIED       | 12    | `FPATH`, `HOMEBREW_*`, `INFOPATH`, `OSLogRateLimit`, `XPC_*`, etc.    |
| TERMINAL_SPECIFIC  | 3     | `LANG`, `SHLVL`, `TERM_SESSION_ID`                                    |
| PATH_CRITICAL      | 3     | `PATH` (value differs), `NVM_BIN` (only_in_cli), `NVM_DIR` (only_in_cli) |
| CC_BEHAVIORAL      | 1     | `PNPM_HOME` (only_in_cli)                                             |
| SPAWN_METADATA     | 1     | `TMUX`                                                                |

**Critical PATH gap (env-diff.json line 292-297):** B2's PATH is
literally `/usr/bin:/bin:/usr/sbin:/sbin` — the macOS launchd default
plist PATH. It contains **no `/opt/homebrew/bin`, no
`~/.nvm/versions/node/.../bin`, no `~/Library/pnpm`**. Direct
consequence: a child process spawned in this env that does `which tmux`
or `which claude` will return non-zero. The Workstation cannot rely on
PATH-resolution for these binaries when launched via Finder. This is
DAEMON-Z-2 confirmed in the v3 context. Confidence: KNOWN.

The harness itself sidesteps this by passing `TMUX_BIN=/opt/homebrew/bin/tmux`
as an absolute path to `execFile` (per `b-electron-main.mjs` line 32),
which is why the B2 spawn succeeds. But the pane process inside that
session inherits the broken PATH — anything it spawns (e.g., `claude`,
`git`, `node` for npx-style invocations) will fail PATH lookup unless
also called by absolute path. (KNOWN — measured by inspecting B2 PATH
value vs which binaries operator's setup places where.)

### §3.3 Electron `process.env` vs CLI tmux pane

**Verdict: 33 divergences (`env-diff.json` line 601-611).** This compares
what Electron's main process sees at `app.whenReady()` against what the
CLI-spawned tmux pane sees. Largest single bucket is CC_BEHAVIORAL (19
`npm_*` vars again). TERMINAL_SPECIFIC bucket here (5 vars) reflects
that Electron's process.env carries `TERM=xterm-256color`,
`TERM_PROGRAM=Apple_Terminal` (per env-diff.json line 419-438) — the
parent-shell-of-Electron values, not the tmux-pane values. tmux rewrites
`TERM` to `tmux-256color` at pane creation regardless of source env, so
this only matters for non-tmux-mediated children of Electron (none in
v3.0 scope, but worth flagging if MB-T05 adds direct-spawn paths
later). Confidence: KNOWN.

### §3.4 Env-parity grade

| Mode                     | Grade               | Confidence  |
|--------------------------|---------------------|-------------|
| B1 (npx electron)        | NOT bit-identical, functionally compatible (PATH superset, tmux+claude resolve) | KNOWN |
| B2 (launchd minimal)     | NOT bit-identical, FUNCTIONALLY BREAKING (PATH cannot resolve tmux/claude) | KNOWN |
| Shipped `.app` (Finder)  | Not measured; expected close to B2                                  | MODELED |

The §8.1 P-0.2 Q2 "bit-identical" claim, taken literally at the env
layer, is FALSE in both measured modes. See §7 for grade discussion.

## §4 — PTY behavior parity

**Source:** `results/pty-cli.txt`, `results/pty-electron-b1.txt`,
`results/pty-electron-b2.txt`. All three files are 1179 bytes each
(verified via `ls -la`).

**Verdict: byte-identical across all three contexts. PTY parity holds.**
Confidence: KNOWN.

Concretely, every static PTY-state probe yielded the same output:

- `TERM=tmux-256color` (tmux rewrites at pane creation)
- `COLORTERM=truecolor`
- `tty device = /dev/ttys010` (kernel reused the same PTY slot across
  sequential isolated-server probes — coincidental but consistent)
- `isatty(stdin) = yes`
- `COLUMNS=<unset>  LINES=<unset>` (not set in non-interactive bash;
  tmux pane size known via `stty`, separate channel)
- `stty -a`: `speed 9600 baud; 50 rows; 220 columns;` plus identical
  flag sets across `lflags`, `iflags`, `oflags`, `cflags`, `cchars`,
  including `icanon isig iexten echo echoe -echok echoke -echonl
  echoctl` and the standard control chars
- `input echo discipline`: identical seven-line list

**Why this holds:** tmux mediates PTY allocation. The tmux server
allocates a kernel PTY for each pane and configures termios via its own
defaults; the spawning process's env does not influence the resulting
PTY device's termios state, baud, or flag set. The `TERM` value tmux
sets in the pane is `tmux-256color` regardless of what `TERM` looked like
in the spawning env (B2 had no `TERM` set; B1 inherited from operator's
tmux-wrapped shell; both panes still got `tmux-256color`).

**SIGWINCH delivery is not exercised here** — `probe-pty.sh` documents
this explicitly: "static measurement; SIGWINCH delivery requires an
attached client and window resize." For the spike's purpose this is
acceptable because tmux's SIGWINCH propagation is not spawn-context
dependent (the signal is sent by tmux to pane-leader on attached-client
resize, no env interaction). Confidence on SIGWINCH parity: MODELED
(based on tmux source-code behavior + the static-state KNOWN parity;
not a runtime measurement).

### §4.1 PTY-parity grade

| Dimension                  | Grade                | Confidence |
|----------------------------|----------------------|------------|
| Static PTY state (termios) | bit-identical        | KNOWN      |
| TERM value in pane         | bit-identical        | KNOWN      |
| isatty / tty device        | bit-identical        | KNOWN      |
| SIGWINCH propagation       | bit-identical        | MODELED    |

## §5 — Session registration parity

**Source:** `results/session-cli.json`, `results/session-electron.json`,
`results/session-comparison.json`.

**Verdict: B1 PASS — all non-provenance fields structurally identical.
B2 not separately measured.** Confidence: KNOWN-for-B1, MODELED-for-B2.

Both registrations returned HTTP 201 (`session-comparison.json` line 3-4:
`cli_http_code: 201`, `electron_http_code: 201`). The 201 body shape
matches per-field across the two contexts (`session-comparison.json`
line 5-74):

| Field                   | CLI value                | Electron value           | Verdict                |
|-------------------------|--------------------------|--------------------------|------------------------|
| `name`                  | mb-s02-cli-reg-91484     | mb-s02-electron-reg-91552 | EXPECTED_DIFFERENCE (provenance) |
| `cwd`                   | /var/folders/.../tmp.RifbUfnann | (results dir)     | EXPECTED_DIFFERENCE (provenance) |
| `tmux_target`           | mb-s02-cli:0.0           | mb-s02-electron:0.0      | EXPECTED_DIFFERENCE (provenance) |
| `handoff_path`          | (provenance path)        | (provenance path)        | EXPECTED_DIFFERENCE (provenance) |
| `last_prompt_sent_at`   | null                     | null                     | PASS                   |
| `last_handoff_pulled_at`| null                     | null                     | PASS                   |
| `last_commit_sha`       | null                     | null                     | PASS                   |
| `last_status_json_at`   | null                     | null                     | PASS                   |
| `state`                 | armed                    | armed                    | PASS                   |
| `computed_status`       | idle                     | idle                     | PASS                   |

**Aggregate verdict (`session-comparison.json` line 75-78):** `PASS —
All non-provenance fields structurally identical. §8.1 registration
parity: KNOWN.`

### §5.1 B2 caveat

The single `session-electron.json` was registered under B1
(inherited-env) mode only. The harness does NOT separately re-register
under B2 launchd-minimal env. **Justification:** the registration HTTP
layer is content-only — `b-electron-main.mjs` line 128-141 issues a
plain `fetch` against `http://127.0.0.1:7878/v2/sessions` from
Electron's main process using `process.env` (not LAUNCHD_MIN_ENV). The
daemon-side handler validates request body against `CreateSessionRequest`
and writes to `sessions.json` — neither side reads any env that B2's
restricted PATH would gate. Registration parity in B2 mode is therefore
expected to be identical to B1 by construction. Confidence:
MODELED-identical (high confidence; not directly measured).

**MB-T05 implication:** if the spawn handler invokes registration via
the same fetch-from-Electron-main pattern, no additional B2 measurement
is required. If MB-T05 instead routes registration through a child
process (e.g., a CLI subprocess), MB-T05 must add a B2-mode registration
probe of its own.

### §5.2 Registration-parity grade

| Mode | Grade                                  | Confidence       |
|------|----------------------------------------|------------------|
| B1   | structurally identical (non-provenance) | KNOWN            |
| B2   | structurally identical                  | MODELED          |

## §6 — Failure mode coverage

**Source:** `results/failure-modes.json`.

| ID    | Description                                       | Verdict       | Confidence |
|-------|---------------------------------------------------|---------------|------------|
| FM-1  | tmux binary not found (ENOENT)                    | PASS          | KNOWN      |
| FM-2  | command in pane exits 127 (claude-not-found sim)  | PASS          | KNOWN      |
| FM-3  | daemon unreachable (connection refused)           | PASS          | KNOWN      |
| FM-4  | name collision — killed record (HTTP 409)         | PASS          | KNOWN      |
| FM-5  | max-sessions cap                                  | NOT_ENFORCED  | KNOWN gap  |

### §6.1 FM-1 — tmux binary not found

`failure-modes.json` line 33-38: spawning `/nonexistent/bin/tmux-does-not-exist`
via `execFile` produces `error_code: "ENOENT"` with message
`spawn /nonexistent/bin/tmux-does-not-exist ENOENT`. **MB-T05 must catch
ENOENT specifically and surface a user-facing error explaining tmux is
missing or PATH-unreachable** (especially relevant in B2-launchd mode
where `/opt/homebrew/bin/tmux` is not PATH-discoverable).

### §6.2 FM-2 — claude binary not found inside pane

`failure-modes.json` line 39-46: `tmux new-session -d ... -- bash -c
'exit 127'` — the pane is created successfully (tmux is found and
spawns) but the inner command exits 127 immediately. `pane_exited_promptly:
true`. The note captures the v3 implication: **"tmux does not retry on
non-zero exit; pane is destroyed immediately. Workstation v3 must detect
short-lived sessions and surface error to user."**

The MB-T05 spawn handler must therefore add a post-spawn liveness
check: poll `tmux has-session` for a brief window after creation; if
the session vanishes within (say) 2 seconds, treat as failed-launch and
surface an error with the inner command's exit code if obtainable. The
daemon's existing watcher infrastructure does not cover this case
because the session never reached the registered state.

### §6.3 FM-3 — daemon unreachable

`failure-modes.json` line 47-53: `fetch` to `http://127.0.0.1:19999`
fails with `TypeError: fetch failed` (Node's fetch wraps ECONNREFUSED).
**MB-T05 must catch this distinctly from FM-1/FM-2** and offer the
operator a "daemon not running — start it?" path.

### §6.4 FM-4 — name collision (killed record)

`failure-modes.json` line 54-65: register a session, kill it, attempt
to re-register with the same name. Daemon returns HTTP 409 with body
`{"error": "Session name in use (killed record exists). Pick a new
name."}` — verbatim match to the contract §4.3 expected message and to
the Blocker 3 operator-arbitrated wording in `routes/sessions.ts:147`.
**MB-T05's spawn UI must parse this 409 and prompt the operator to
choose a new name**, not retry blindly.

### §6.5 FM-5 — max-sessions cap (NOT_ENFORCED, v3 gap)

`failure-modes.json` line 66-72: v2.0.1 `POST /v2/sessions` has no
max-sessions cap. The spike documents this as a KNOWN gap that must be
addressed before a "FM-5 PASS" is achievable. **Recommended v3
followup:** add `max_sessions` cap check in the POST handler; return
either HTTP 429 (Too Many Requests) or HTTP 503 (Service Unavailable)
with a descriptive error body. Cap value should be operator-configurable
per `vision §7.5` cap-with-override flow (currently locked at "many" in
v2.0.1).

**Followup ticket name suggestion:** `MB-F-FM5-cap` — file in
`docs/FOLLOWUPS.md` as v3-blocking per ratified §8.1 (capability
checklist requires "Session count cap enforcement works with override
flow per locked §0.6"). Without this ticket, §8.1's spawn-from-UI bullet
cannot be checked off.

## §7 — Bit-identical claim grade

P-0.2 Q2 ratified §8.1 as: "Tmux session spawned by Workstation under
user context produces a registered session **bit-identical** to
CLI-spawned (every env var, every PTY behavior matches; spike-validated
per MB-S02 ADR)."

### §7.1 Per-dimension grade

| Dimension                 | Bit-identical? | Confidence  | Source                                   |
|---------------------------|----------------|-------------|------------------------------------------|
| Env vars (B1 inherited)   | NO             | KNOWN       | env-diff.json: 27 divergences, B1 mode   |
| Env vars (B2 launchd)     | NO (breaking)  | KNOWN       | env-diff.json: 20 divergences, B2 mode   |
| PTY static state          | YES            | KNOWN       | pty-*.txt all 1179 bytes, byte-identical |
| TERM value in pane        | YES            | KNOWN       | tmux rewrites; identical across contexts |
| SIGWINCH propagation      | YES            | MODELED     | tmux mediates; not directly exercised    |
| Registration body (B1)    | YES (non-prov) | KNOWN       | session-comparison.json: PASS            |
| Registration body (B2)    | YES (non-prov) | MODELED     | not separately probed                    |
| Failure modes 1-4         | reproducible   | KNOWN       | failure-modes.json                       |
| Failure mode 5 (cap)      | n/a (gap)      | KNOWN gap   | failure-modes.json: NOT_ENFORCED         |

### §7.2 Overall grade

**The §8.1 "bit-identical" claim is FALSE as currently stated**, because
env vars do not match in either measured mode. PTY parity and
registration parity hold. The literal claim cannot be graded KNOWN
without an env-handling decision in MB-T05 that closes the env gap (or a
contract amendment that narrows the bar).

The honest grade reads: **structurally-identical-at-the-registration-layer
(KNOWN), PTY-identical (KNOWN + one MODELED facet), env-divergent
(KNOWN; functionally-compatible in B1, functionally-breaking in B2),
failure-modes-reproducible-except-cap (KNOWN; FM-5 is a v3 gap).**

The path forward is one of the two §8 recommendations.

## §8 — Recommendations for MB-T05 spawn handler

The env-divergence finding forces an architectural choice that operator
must make before MB-T05 implementation. Two paths surfaced:

### §8.1 Path A — Restore login-shell env in spawn handler

**Mechanism:** MB-T05 spawns a login-shell subprocess (e.g., `zsh -l -c
'env -0'`) at Workstation startup OR per spawn, captures the resulting
env, and passes that env to `tmux new-session` via the `env` option of
`execFile`. Variants: cache once at app start (cheap; misses dotfile
edits during session) vs capture per spawn (expensive; always current).

**Pros:** B1 and B2 spawn contexts both produce panes whose env equals
the operator's CLI env. The §8.1 "bit-identical" claim becomes
KNOWN-true at the env layer (modulo SPAWN_METADATA, which is expected
divergence). `claude`, `tmux`, `git`, `node` all resolve via PATH the
same way they do from operator's terminal.

**Cons:** Adds dependency on an external shell binary (`/bin/zsh` or
operator's `$SHELL`) and on the operator's dotfile correctness. If the
operator's `.zshrc` writes to stdout, the captured env is corrupted
(`env -0` after a `source ~/.zshrc` that prints would yield mixed
output). Requires defensive parsing. Adds startup latency (potentially
hundreds of ms — measure against §8.3 launch-budget).

**Architectural fit:** matches the user's mental model — Workstation is
"the same as my terminal, just a UI on top." Implementation cost
moderate.

### §8.2 Path B — Accept env divergence + augment with explicit allowlist

**Mechanism:** MB-T05 spawns with launchd-minimal-style env plus an
explicit augmentation set: `PATH` constructed from a known-good list
(`$HOME/.nvm/versions/node/<v>/bin`, `/opt/homebrew/bin`,
`/opt/homebrew/sbin`, `/usr/local/bin`, then system paths), `HOME`,
`USER`, `LOGNAME`, `TMPDIR`, `LANG=en_US.UTF-8`, plus any v3-required
vars (`ANTHROPIC_API_KEY` is Workstation-injected anyway, etc.). No
shell subprocess, no dotfile dependency.

**Pros:** Deterministic env (no operator-config skew). No external
process spawn at startup. Faster launch path. Easier to test against in
CI (env is constructable from a fixed config).

**Cons:** Requires a `WORKSTATION_CONTRACT.md` amendment (probably to
§4 or a new §10) specifying the allowlist. Ratifies the divergence as
intentional. Operators who customize their CLI env (custom PATH entries
for project-specific tooling, custom `LANG` for non-English locales,
etc.) will see different behavior in Workstation panes vs CLI panes —
potential dogfood-friction signal. P-0.2 Q2 must be re-arbitrated; the
"bit-identical" wording becomes
"functionally-equivalent-via-explicit-allowlist."

**Architectural fit:** matches the contract-discipline mental model —
Workstation behavior is specified, not inherited from operator's
machine. Implementation cost lower; specification cost higher (operator
arbitration + contract amendment).

### §8.3 Recommended next step

Operator picks A or B before MB-T05 implementation. The pick is a
multi-choice arbitration question; the spike does not pre-arbitrate it.

If A: file MB-T05 with the login-shell env-capture approach and add a
spike for measuring captured-env correctness against operator's CLI env
(should be "bit-identical at the env layer" and re-runs the comparison
this spike performed).

If B: file `contract:` amendment to `WORKSTATION_CONTRACT.md` (probably
§4 or a new §10) specifying the allowlist and amending §8.1's
"bit-identical" wording. Then file MB-T05 with the allowlist-based
spawn.

### §8.4 Subordinate MB-T05 requirements (independent of A/B choice)

Regardless of the A/B decision, MB-T05 must:

- Catch `ENOENT` from `execFile` distinctly and surface
  "tmux not found" with PATH context (FM-1 finding §6.1)
- Add a post-spawn liveness check (poll `tmux has-session` for ~2s)
  to detect FM-2 short-lived panes; surface inner exit code if
  obtainable (FM-2 finding §6.2)
- Catch `ECONNREFUSED` / `fetch failed` from registration POST
  distinctly and offer a "daemon not running — start it?" path (FM-3
  finding §6.3)
- Parse HTTP 409 with the verbatim "killed record exists" message and
  prompt operator for a new name (FM-4 finding §6.4)
- Block on a missing FM-5 cap implementation; either MB-T05 includes
  the cap implementation as part of its scope, or a separate followup
  (`MB-F-FM5-cap`) ships before MB-T05 marks done. Without the cap,
  §8.1 capability-checklist's "Session count cap enforcement works
  with override flow" cannot be satisfied (§6.5 finding).

## §9 — Self-check (per CONDUCTOR_API_CONTRACT.md §10.5)

1. **Is the API I called verified by a spike in this repo?** n/a — this
   ADR makes no API calls itself; the harness scaffold (`5f21de6`) made
   the calls and produced the cited result files. Harness behavior
   verified by the result-file contents (POST returned 201 with
   contract-shaped body; PATCH state-killed cleanup succeeded).
2. **Does my test exercise behavior, or my mocks?** behavior — every
   measurement was against real daemon (running locally, port 7878),
   real tmux (`/opt/homebrew/bin/tmux 3.6a`), real Electron
   (`electron@41.3.0` per env-electron-process.txt:14), real macOS
   kernel PTY allocator. No mocks.
3. **If implementation deleted, would test still pass?** no — the
   harness measures real spawn behavior; deleting the daemon, tmux, or
   Electron would break the harness output and fail this ADR's claims.
   The result files are evidence, not assertions.
4. **Did I add anything outside this contract's specification?** no —
   the ADR observes the §8.1 bit-identical claim against measured
   evidence and recommends two paths to operator. It does not modify
   any contract.
5. **Did I modify this contract without operator approval?** no — the
   ADR FLAGS that §8.1's "bit-identical" wording is not satisfied at
   the env layer and recommends operator decide between Path A
   (close the gap in MB-T05) or Path B (`contract:` amendment to narrow
   the bar). No contract file is modified by this commit.
6. **Is any claim in my commit body unlabeled?** no — every quantitative
   claim in this ADR is labeled KNOWN, MODELED, or SPECULATIVE per
   §10.1, with citations to specific result-file paths and line numbers
   where the data lives.
7. **Did this commit touch any file the other parallel session might
   also modify?** Surfaced — the `docs/adr/` directory is also being
   written to by session B (untracked
   `docs/adr/MB-S03-daemon-v3-amendment.md` visible in `git status`).
   No content collision (different filename); per-path `git add` for
   each MB-S02 file ensures session B's files are not staged. The
   `packages/dispatch-menubar/spikes/MB-S02/` tree is exclusive to this
   spike.
8. **Does this commit change session state via direct registry write,
   bypassing PATCH /v2/sessions/:name/state?** no — all probe-session
   cleanups in the harness use PATCH state=killed
   (`a-cli-baseline.sh:97-100`, `b-electron-main.mjs:154-161`).
9. **Did I do work during a halt state that wasn't explicitly
   authorized?** no — Phase 3 (write the ADR) is operator-authorized
   per the previous turn's "Proceed to Phase 3" instruction.
