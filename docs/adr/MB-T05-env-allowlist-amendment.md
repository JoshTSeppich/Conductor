# MB-T05 — env allowlist + WORKSTATION_CONTRACT §8.1 amendment proposal

**Status:** DRAFT for operator review. This is a `docs:` proposal, not a
contract amendment. Operator authors the actual `WORKSTATION_CONTRACT.md`
§8.1 amendment under §3.4 / §10.2 (frozen-contract) discipline once
this proposal is reviewed.

**Date:** 2026-04-29

**Authors:** Operator-supervised CC session executing MB-T05 sub-task 1.
Halt-and-narrow-scope decision per Path 2 of the prior turn; sub-tasks
2–7 explicitly deferred until MB-T01–MB-T04 land + a `V3_TICKETS.md`
spec is committed.

**Authority chain:**
- Operator-ratified Path B decision (this session, 2026-04-29) — see §2
- Spike evidence: `docs/adr/MB-S02-tmux-spawn-fidelity.md` (committed at `14ddf36`)
- Contract under amendment: `WORKSTATION_CONTRACT.md` §8.1 (frozen at `ade584b`, amended at `7fd48e4`)
- Ratified vision: `docs/vision.md` §8.1 (frozen at `9d751f8`, P-0.2 Q2 ratified)

**Confidence labels per CONDUCTOR_API_CONTRACT.md §10.1:** KNOWN
(measured/verified), MODELED (reasoned from KNOWN-adjacent evidence),
SPECULATIVE (best-guess; calls out the gap).

---

## §1 — Context

### §1.1 What the spike found

`MB-S02-tmux-spawn-fidelity.md` validated the §8.1 "bit-identical"
spawn-parity claim against measured evidence and graded it FALSE at the
env-var layer (KNOWN). Specifically (cited from
`packages/dispatch-menubar/spikes/MB-S02/results/env-diff.json`):

- **B1 mode (npx-electron-from-terminal):** 27 env-var divergences vs
  CLI baseline. PATH is a functional superset (CLI PATH appended after
  npm-injected entries), so claude/tmux still resolve. 19 of 27 divs
  are `npm_*` artifacts injected by `npx`.
- **B2 mode (launchd-minimal, simulating Finder/Spotlight launch of a
  shipped `.app`):** 20 divergences. PATH=`/usr/bin:/bin:/usr/sbin:/sbin`
  only — `claude` and `tmux` at `/opt/homebrew/bin` are NOT
  PATH-discoverable. NVM env absent. The shipped app cannot rely on
  inherited PATH.

PTY parity holds (KNOWN; all three pty-*.txt result files are
byte-identical at 1179 bytes). Registration parity holds in B1 mode
(KNOWN per `session-comparison.json` PASS). Failure modes 1–4 reproduce
cleanly; FM-5 (max-sessions cap) is a separate v3 gap (not in this
proposal's scope).

### §1.2 Why an amendment is needed

The literal §8.1 wording — "every env var, every PTY behavior matches"
— is unreachable. Every measured spawn context diverges from CLI
baseline at the env layer. The bar is structurally wrong: tmux's job is
to mediate PTY (which it does, perfectly) and the daemon's job is to
register (which it does, identically); env handling is a separate
concern that requires a separate decision.

Two paths were surfaced in MB-S02 ADR §8 for closing this gap:

- **Path A** — restore login-shell env in spawn handler (e.g.,
  `zsh -l -c 'env -0'` capture)
- **Path B** — explicit allowlist + amend §8.1

Operator ratified **Path B** (this session, 2026-04-29). Rationale per
operator: deterministic env, no dotfile dependency, faster launch,
auditable scope. Trade-off accepted: operators with custom CLI env
beyond the allowlist will see different behavior in Workstation panes
vs CLI panes; this is documented divergence rather than ratified
identity.

---

## §2 — Operator-ratified decision (Path B)

**Decision text** (from operator turn, 2026-04-29, this session):

> MB-T05 spawn handler does NOT capture operator's full login-shell env.
> Instead:
> - Spawns tmux with explicit allowlist: PATH (with /opt/homebrew/bin
>   and /usr/local/bin prepended), HOME, USER, SHELL, LANG, LC_ALL,
>   TERM (= xterm-256color), and any other vars empirically required
>   for `claude` to run correctly.
> - Documents the divergence + allowlist in WORKSTATION_CONTRACT.md
>   §8.1 amendment proposal at
>   docs/adr/MB-T05-env-allowlist-amendment.md (operator authors and
>   commits the actual amendment per §3.4).
> - Bit-identical claim from §8.1 is graded MODELED-with-allowlist
>   (NOT KNOWN, NOT FALSE — explicitly bounded by allowlist).
>
> The allowlist gets refined empirically: start with the above set,
> run claude in spawned session, observe failures, add vars
> one-at-a-time with rationale documented. This is the explicit,
> auditable approach.

This proposal codifies that decision into a per-var allowlist with
rationale + an empirical refinement process + the proposed amendment
text for operator authorship.

---

## §3 — The allowlist (initial set)

Each row: variable name, source (where the spawn handler obtains the
value), rationale, confidence label per `CONDUCTOR_API_CONTRACT.md`
§10.1.

| Var               | Source                                          | Rationale                                                                                                          | Confidence |
|-------------------|-------------------------------------------------|--------------------------------------------------------------------------------------------------------------------|------------|
| `PATH`            | constructed (see §3.1)                          | Without `/opt/homebrew/bin` prepended, `claude` and `tmux` are not PATH-discoverable in B2 launch context (MB-S02 §3.2, env-diff.json:292-297) | KNOWN      |
| `HOME`            | `process.env.HOME` (passthrough)                | Required by claude config dir (`~/.config/claude/`), git config (`~/.gitconfig`), ssh (`~/.ssh/`). Universally needed. | KNOWN      |
| `USER`            | `process.env.USER` (passthrough)                | tmux uses `$USER` for socket dir naming (`/private/tmp/tmux-<UID>/`); some tools default identity from `$USER`     | KNOWN      |
| `LOGNAME`         | `process.env.LOGNAME ?? process.env.USER`       | Synonym for `USER` on macOS; some tools prefer one or the other; cheap to forward                                  | MODELED    |
| `SHELL`           | `process.env.SHELL ?? '/bin/zsh'`               | tmux falls back to `$SHELL` for pane process if no explicit command. MB-T05 will pass explicit `claude` command, but `$SHELL` is still inspected for default-shell behavior | MODELED    |
| `LANG`            | `process.env.LANG ?? 'en_US.UTF-8'`             | UTF-8 locale required for claude's TUI output (emoji, non-ASCII, box-drawing). MB-S02 confirms `LANG=en_US.UTF-8` in CLI baseline (env-cli.txt:10); B2 mode dropped it (env-diff.json:250-255) | KNOWN      |
| `LC_ALL`          | `process.env.LC_ALL` (passthrough if set)       | If operator overrides locale, LC_ALL takes precedence over LANG. Forward if present; do NOT inject default — absence is operator's choice | MODELED    |
| `TERM`            | `'xterm-256color'` (constant)                   | claude TUI requires 256-color-capable terminal. tmux rewrites to `tmux-256color` inside the pane regardless of input TERM (MB-S02 §4: all three pty-*.txt show `tmux-256color`); `xterm-256color` is the standard "rich terminal" hint to pass tmux | KNOWN      |
| `TMPDIR`          | `process.env.TMPDIR` (passthrough)              | macOS per-user scratch dir (`/var/folders/<x>/T/`). MB-S02 confirms in CLI baseline (env-cli.txt:27); LAUNCHD_MIN_ENV explicitly preserved it | KNOWN      |
| `ANTHROPIC_API_KEY` | Electron `safeStorage` decryption (per WORKSTATION_CONTRACT.md §8.3) | claude requires API key. NOT inherited from `process.env`; Workstation injects from OS keychain. **MUST be present in spawn env** or claude fails at startup | KNOWN      |

### §3.1 PATH construction

The PATH passed to `tmux` should be constructed deterministically, not
inherited from `process.env.PATH`. The recommended construction:

```
/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/local/sbin:/usr/bin:/bin:/usr/sbin:/sbin
```

**Rationale per segment:**

- `/opt/homebrew/bin`, `/opt/homebrew/sbin` — Homebrew default install
  prefix on Apple Silicon. KNOWN required for `claude`, `tmux`, `git`,
  modern `node` (when Homebrew-installed) per MB-S02 evidence.
- `/usr/local/bin`, `/usr/local/sbin` — Intel Mac Homebrew prefix +
  manual installs (e.g., `/usr/local/bin/python3` from python.org
  installer). MODELED required for cross-Mac portability.
- `/usr/bin`, `/bin`, `/usr/sbin`, `/sbin` — macOS system tools
  (`env`, `bash`, `tty`, `stty`). KNOWN required (matches the launchd
  baseline PATH from MB-S02 B2 mode env-diff.json:295).

**Explicitly NOT prepended in initial allowlist:**

- `~/.local/bin` (XDG-style user-local) — operator-specific; SPECULATIVE.
  Add via refinement if claude grows a dep on this.
- `~/Library/pnpm`, `~/.nvm/versions/node/<v>/bin` — operator-config
  paths; not load-bearing for claude binary itself (claude is a
  pre-built binary at `/opt/homebrew/bin/claude`, not an npm package).
  If MB-T05 shipping reveals claude is actually a Node script that
  requires a specific Node version on PATH, refine the allowlist.

---

## §4 — Explicitly excluded (with rationale)

Variables present in the operator's CLI baseline (per
`env-cli.txt`) but deliberately NOT forwarded by the spawn handler:

| Excluded var(s)                                      | Rationale                                                                                                          | Confidence |
|------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------|------------|
| `NVM_DIR`, `NVM_BIN`, `NVM_INC`, `NVM_CD_FLAGS`     | claude is a binary at `/opt/homebrew/bin/claude` (KNOWN per MB-S02 PATH evidence), not an nvm-managed Node script. nvm env is operator-config noise from `.nvm/nvm.sh` sourcing, not load-bearing for claude | MODELED    |
| All `npm_*` (19 vars per MB-S02 §3.1)               | These are `npx electron`-injected artifacts (env-diff.json B1 bucket CC_BEHAVIORAL); not used by claude. They were absent in B2 mode and would be absent in any shipped `.app` launch | KNOWN      |
| `HOMEBREW_CELLAR`, `HOMEBREW_PREFIX`, `HOMEBREW_REPOSITORY`, `INFOPATH`, `FPATH` | Convenience env from `.zshrc`'s Homebrew shellenv. claude does not depend on these; they affect interactive zsh prompt behavior | MODELED    |
| `PNPM_HOME`                                          | Operator's pnpm prefix. Not needed by claude binary                                                                | MODELED    |
| `TMUX`, `TMUX_PANE`                                  | tmux server SETS these in the pane on its own. Pre-setting them in spawn env confuses tmux about whether we're already inside a tmux session (would cause "sessions should be nested with care" error) | KNOWN      |
| `__CFBundleIdentifier`, `__CF_USER_TEXT_ENCODING`, `OSLogRateLimit`, `XPC_FLAGS`, `XPC_SERVICE_NAME` | macOS launchd / Terminal.app metadata. Not portable, not load-bearing for claude TUI                                | KNOWN      |
| `TERM_SESSION_ID`, `TERM_PROGRAM`, `TERM_PROGRAM_VERSION` | Terminal-app-specific identification. tmux sets its own `TERM_PROGRAM=tmux` inside the pane regardless                | KNOWN      |
| `SSH_AUTH_SOCK`                                      | Required for SSH-based git push from inside a spawned claude session. **Defer to refinement.** Initial allowlist excludes; first observed dogfood failure (e.g., `git push` over SSH fails inside Workstation-spawned claude) triggers addition with rationale `MB-F-ENV-SSH_AUTH_SOCK` | SPECULATIVE |
| `EDITOR`, `VISUAL`                                   | Only matters if operator opens an editor from inside claude (e.g., `git commit` without `-m`). Probably useful eventually; initial allowlist excludes to keep set narrow | SPECULATIVE |
| `SHLVL`                                              | Shell nesting depth. tmux/bash compute their own; pre-setting causes off-by-one in scripts that key off it          | KNOWN      |
| `PWD`, `OLDPWD`                                      | tmux sets PWD per pane based on `cwd` at session create. Pre-setting overrides tmux's cwd handling                  | KNOWN      |
| `_`                                                  | "Last command" — set per-process by shell. Meaningless to forward                                                  | KNOWN      |

**Pattern:** if a var was demonstrated load-bearing in MB-S02 (PATH,
HOME, LANG, TMPDIR), it's in §3. If it was operator-config noise or
tmux-managed metadata, it's in §4. If its load-bearing-ness is unknown
(SSH_AUTH_SOCK, EDITOR, ~/.local/bin), it's deferred to empirical
refinement (§6).

---

## §5 — Confidence grading

### §5.1 Per-dimension grade under the proposed amendment

| Dimension                          | Grade under allowlist                                  | Confidence  |
|------------------------------------|--------------------------------------------------------|-------------|
| PATH-resolution of claude/tmux/git | KNOWN-true (Homebrew prefix prepended)                 | KNOWN       |
| HOME-dependent tools (config, git, ssh) | KNOWN-true (HOME forwarded)                       | KNOWN       |
| Locale handling for claude TUI     | KNOWN-true (`LANG=en_US.UTF-8` default; LC_ALL passthrough) | KNOWN       |
| Terminal capability detection      | KNOWN-true (`TERM=xterm-256color` → tmux-256color in pane per MB-S02 §4) | KNOWN       |
| API key delivery                   | KNOWN-true (Workstation safeStorage → spawn env injection per §8.3) | KNOWN       |
| nvm-managed Node availability      | NOT GUARANTEED (excluded from allowlist)               | KNOWN-excluded |
| SSH-based git push from claude     | NOT GUARANTEED (SSH_AUTH_SOCK excluded)                | KNOWN-excluded; refinement candidate |
| Editor invocation from claude      | NOT GUARANTEED (EDITOR excluded)                       | KNOWN-excluded; refinement candidate |
| Operator-custom env (e.g., project-specific PATH entries) | NOT FORWARDED (allowlist is closed set) | KNOWN — accepted divergence per Path B |

### §5.2 Replacement for §8.1 "bit-identical"

The proposed amendment text (§7) replaces:

> Tmux session spawned by Workstation under user context produces a
> registered session **bit-identical** to CLI-spawned (every env var,
> every PTY behavior matches; spike-validated per MB-S02 ADR)

with:

> Tmux session spawned by Workstation under user context produces a
> registered session that is:
> (a) **structurally identical at the registration layer** (KNOWN per
>     MB-S02 ADR §5: all non-provenance fields in `POST /v2/sessions`
>     201 body match);
> (b) **PTY-identical** (KNOWN per MB-S02 ADR §4: byte-identical static
>     PTY state including TERM rewrite, termios flags, control chars);
> (c) **environmentally compatible within the allowlist documented at
>     `docs/adr/MB-T05-env-allowlist-amendment.md`** (MODELED per Path B
>     operator-ratified arbitration 2026-04-29; KNOWN per-var as
>     dogfood evidence accumulates).
>
> Bit-identical env-var parity is explicitly NOT a v3.0 ship requirement.
> Allowlist scope IS. Vars outside the allowlist do not propagate to
> spawned sessions; behavioral differences relative to CLI-spawned
> sessions for operators relying on excluded vars are documented
> divergence, not bug.

### §5.3 Why MODELED, not KNOWN

The initial allowlist is a reasoned synthesis of (a) MB-S02 measured
evidence about which vars are present in CLI baseline and which are
load-bearing, (b) ecosystem knowledge about claude/tmux/macOS
expectations, and (c) the operator-ratified scope-narrowing decision.
It has NOT been runtime-validated by spawning claude under the proposed
allowlist and observing it work end-to-end. That validation lands with
MB-T05 itself (sub-tasks 2–7, deferred).

A var graduates from MODELED to KNOWN once MB-T05 implementation
demonstrates claude operates correctly under the allowlist (or once a
refinement-driven addition lands with documented evidence).

The allowlist as a whole becomes KNOWN when: (1) at least one full
dogfood cycle (vision §8.4 — Sherpa or Conductor or Lantern) executes
with a Workstation-spawned claude session producing the same observable
behavior as a CLI-spawned claude session, and (2) any refinement-driven
additions have stabilized for at least one subsequent dogfood cycle
without further additions.

---

## §6 — Empirical refinement process

The allowlist is itself a `contract:` artifact in spirit (it bounds
spawn behavior in a way that v3.0 ship-gate depends on). Additions
follow a deliberate process; ad-hoc widening is forbidden.

### §6.1 Refinement trigger

A refinement candidate surfaces when ANY of:

1. claude misbehaves in a Workstation-spawned session in a way that
   does NOT reproduce in a CLI-spawned session (e.g., a CLI test passes
   but the Workstation-spawned equivalent fails)
2. Operator observes a feature gap during dogfood (e.g., `git push`
   over SSH fails inside Workstation but works in CLI)
3. A new claude version adds a dependency on an env var not in the
   current allowlist
4. A subordinate tool claude invokes (`git`, `ssh`, an editor) fails
   for env-related reasons

### §6.2 Refinement workflow

1. **Capture failure** — minimal repro: exact command, observed
   behavior in Workstation-spawned session vs CLI-spawned session,
   error output verbatim
2. **Hypothesize var** — name the env var believed to be load-bearing,
   cite where the dependency originates (claude source, tool docs,
   MB-S02 evidence, etc.)
3. **File followup** — `MB-F-ENV-<VARNAME>` in `docs/FOLLOWUPS.md` with
   the capture + hypothesis
4. **Verify** — temporary local addition of the var to the allowlist;
   re-run repro; confirm Workstation-spawned behavior now matches
   CLI-spawned. If it does NOT, the hypothesis was wrong; do NOT add;
   keep investigating
5. **Operator arbitration** — operator approves or rejects the
   addition. Approval rationale becomes the new row's "rationale"
   column in §3 of this ADR (or a follow-on ADR if the change is large
   enough)
6. **Land via amendment** — addition is committed via a `docs:` commit
   to this ADR + a corresponding `feat:` commit to MB-T05's
   `spawn-env.ts` allowlist source. The two commits should reference
   each other in their bodies

### §6.3 Removal workflow

If a previously-added var is found to be unnecessary (e.g., claude
upgrade removes the dependency), removal follows the same workflow in
reverse: capture evidence that the var is no longer needed, file
`MB-F-ENV-<VARNAME>-removal`, verify in test, operator arbitrates,
land via paired `docs:` + `feat:` commits.

### §6.4 What is NOT a valid refinement signal

- "It would be nice to have X env var" without a concrete failure
- "My CLI has Y, so Workstation should too" without demonstrating
  that claude depends on Y
- "The MB-S02 spike showed Z divergence" — divergence alone is not
  load-bearing; only failures rooted in absence are

The allowlist is closed-by-default. Burden of proof for additions is
on the proposer.

---

## §7 — Proposed `WORKSTATION_CONTRACT.md` §8.1 amendment text

**Operator action required:** copy the text below into a new
`contract:` commit amending `WORKSTATION_CONTRACT.md` §8.1. Per §3.4
operator-territory, this session does not commit the amendment itself.

**Note:** `WORKSTATION_CONTRACT.md` §8.1 was already amended once (at
`7fd48e4`, daemon SQLite persistence amendment per finding #55). This
second amendment lands as a separate `contract:` commit; the §8.1
"Amended" line gains a second date stamp.

### §7.1 Amendment text (operator copies)

Insert into `WORKSTATION_CONTRACT.md` §8.1 (or a new §8.1.1 sub-section)
after the existing "Amended 2026-04-29 per MB-S03 spike halt evidence"
paragraph:

```
**Amended 2026-04-29 per MB-T05 sub-task 1 evidence + Path B operator
arbitration.** The pre-amendment vision §8.1 wording for the spawn
parity capability bar — "every env var, every PTY behavior matches" —
was demonstrated unreachable by MB-S02 spike evidence at
`docs/adr/MB-S02-tmux-spawn-fidelity.md`: env vars diverge in every
measured spawn context, including the realistic shipped-`.app`-from-
Finder context (B2 launchd-minimal mode, 20 divergences with
PATH-resolution-breaking gaps for `claude` and `tmux`). PTY parity DOES
hold (byte-identical in spike) and registration parity DOES hold
(structurally identical in spike). Only env handling required a
ratification decision.

Per Path B operator arbitration (2026-04-29, parallel cairn round 2),
the spawn capability bar is amended to:

The Workstation spawn handler (MB-T05) MUST construct the env passed
to `tmux new-session` from a documented closed allowlist at
`docs/adr/MB-T05-env-allowlist-amendment.md`. The spawn handler MUST
NOT inherit `process.env` indiscriminately. The allowlist comprises:
PATH (constructed with /opt/homebrew/bin and /usr/local/bin prepended
ahead of system paths), HOME, USER, LOGNAME, SHELL, LANG, LC_ALL
(passthrough if set), TERM (= xterm-256color), TMPDIR, and
ANTHROPIC_API_KEY (injected from Electron safeStorage per §8.3).

The capability bar for §8.1 "spawn-from-UI bit-identical" is hereby
replaced with the three-clause bar:

(a) Tmux session spawned by Workstation registers a session
    structurally identical at the registration layer (KNOWN per MB-S02
    ADR §5);
(b) Tmux session spawned by Workstation has PTY behavior identical
    to CLI-spawned (KNOWN per MB-S02 ADR §4);
(c) Tmux session spawned by Workstation has env compatible within the
    documented allowlist (MODELED-with-allowlist per MB-S02 ADR + this
    amendment; refines to KNOWN per-var as dogfood evidence
    accumulates per allowlist ADR §6).

Bit-identical env-var parity is NOT a v3.0 ship requirement.
Allowlist scope IS. Vars outside the allowlist do not propagate to
spawned sessions; behavioral differences relative to CLI-spawned
sessions for operators relying on excluded vars are documented
divergence per Path B, not bug.

Refinement of the allowlist follows the process at allowlist ADR §6;
each addition is operator-arbitrated and lands via paired docs: +
feat: commits.
```

### §7.2 Proposed sentence to update in `docs/vision.md` §8.1

The vision document is also frozen (`9d751f8`). The "Spawn-from-UI"
bullet under §8.1 currently reads:

```
- Tmux session spawned by Workstation under user context produces a
  registered session **bit-identical** to CLI-spawned (every env var,
  every PTY behavior matches; spike-validated per MB-S02 ADR)
```

Operator may choose to amend this in the same `contract:` commit (or a
sibling commit) to:

```
- Tmux session spawned by Workstation under user context produces a
  registered session per the three-clause spawn-parity bar at
  WORKSTATION_CONTRACT.md §8.1 (structural-at-registration KNOWN +
  PTY KNOWN + env-allowlist-bounded MODELED, all spike-validated per
  MB-S02 ADR + Path B per MB-T05 env-allowlist amendment)
```

This is an operator decision; either keeping vision §8.1 verbatim
(deferring to WORKSTATION_CONTRACT.md as authority) or restating the
amended bar in vision is acceptable per the §1.2-style cross-reference
discipline.

---

## §8 — Out of scope for this proposal

This proposal deliberately does NOT cover:

- The MB-T05 spawn handler implementation itself (sub-tasks 2–7,
  deferred until MB-T01–MB-T04 land + `V3_TICKETS.md` commits)
- The MB-T05 Red/Green test specification (depends on V3_TICKETS.md
  ticket spec, which doesn't exist in repo as of `14ddf36`)
- FM-5 max-sessions cap implementation (separate v3 followup
  `MB-F-FM5-cap`; MB-S02 ADR §6.5 surfaced this as v3-blocking)
- Path A (login-shell env capture) implementation details — Path B was
  ratified, Path A is not pursued
- Whether Workstation should support operator-configurable allowlist
  extension (e.g., a settings-UI pane to add custom vars) — defer to
  v3.x; v3.0 ships with the allowlist as fixed code
- Cross-platform env handling (Linux/Windows) — out of v3.0 scope per
  vision §8.7

---

## §9 — Pending operator actions

After this proposal commits and operator reviews:

1. **Author the `contract:` amendment** to `WORKSTATION_CONTRACT.md`
   §8.1 using the text in §7.1 above (or operator-edited variant)
2. **Decide on `docs/vision.md` §8.1 update** per §7.2 — amend in
   sibling `contract:` commit or defer to cross-reference
3. **Decide MB-T01–MB-T04 sequencing** — these tickets must land
   before MB-T05 sub-tasks 2–7 can execute. A `V3_TICKETS.md` with
   per-ticket Red/Green/Acceptance specs needs to be authored and
   committed first
4. **File `MB-F-FM5-cap`** in `docs/FOLLOWUPS.md` per MB-S02 ADR §6.5
   if not already filed (separate housekeeping; not in this session's
   scope)

This session ends gracefully after this proposal commits. MB-T05
sub-tasks 2–7 are formally deferred to a future session that runs
after the prerequisites land.
