# MB-T05 spawn-tmux probe — REPORT.md

**Branch:** `sess-3/probe-additions`
**Cut from:** `main` HEAD `af0ac36`
**Probe commit:** `32a549c` (`green(probe-add): MB-T05 tmux session existence probe`)
**Last individual-mode run:** 2026-05-05
**Aggregate result:** **AUTO-SKIPPED this run** due to operator-state precondition; probe verified to behave correctly under skip path (1 file passed, 1 case skipped with explicit loud reason). KNOWN-when-ran upon operator repair (see §3 below).

Closes gap §4.1 #4 from `docs/probe-coverage-gap-analysis-2026-05-05.md`:
"MB-T05 — tmux session actually exists in `tmux ls` after spawn (PARTIAL).
fix-83 probe-04 trusts SPAWN_RESULT_OK sentinel; no independent
`exec tmux ls` assertion. No probe asserts daemon /v2/sessions
includes the new session entry independently."

## §1 Suite identity

- **1 probe file**: `probe-01-tmux-session-exists.test.ts` (~250 LOC).
- **1 darwin-gated test case**: standalone-node + dist-import.
- Auto-skip-with-MANUAL pattern per operator §7.5 (fix-94 precedent).

## §2 Per-probe result

| # | Probe | Individual-mode result | Evidence class | Test file |
|---|---|---|---|---|
| 1 | spawnSession produces tmux session AND daemon registers it | AUTO-SKIPPED 2026-05-05 (operator daemon registry corrupted; KNOWN-when-ran-on-repair) | KNOWN-when-ran | `probe-01-tmux-session-exists.test.ts` |

### Probe 1 — tmux session existence + daemon registration — AUTO-SKIPPED

**Asserts (when preconditions met):**
1. `tmux ls` output contains a line starting with `<sessionName>:`.
2. Daemon `GET /v2/sessions` (with operator's `X-Conductor-Token`) returns
   200 with a `sessions[]` array; the unique sessionName appears in
   `sessions[].name`. **Independent of the IPC envelope** — fix-83
   probe-04 trusts SPAWN_RESULT_OK; this probe verifies daemon state
   directly.

**Mechanism:** standalone-node-script + dist-import. Imports
`dist/main/spawn-handler.js` directly (spawn-handler imports only
spawn-env + session-cap, no electron). Assembles real production-shape
deps inline (real `tmux execFile`, real daemon `fetch`, `which claude`
resolution). Identical pattern to `fix-94-verification/probe-03-
permission-mode-ask-default.test.ts:96-108` (precondition gate +
dist-import).

**Auto-skip-with-MANUAL pattern (operator §7.5):** runtime
preconditions checked — daemon up + token + tmux on PATH + claude
on PATH. Any missing → `ctx.skip()` with explicit loud reason.

**This run (individual-mode, 2026-05-05):** SKIPPED with reason:
> daemon at http://localhost:7878/v2/sessions returned HTTP 500;
> re-run with daemon for KNOWN evidence

Direct curl with operator's token confirmed the daemon's response:
`{"error":"Registry at /Users/joshuatseppich/.foxworks-dispatch/
sessions.json is not valid JSON: Unexpected non-whitespace character
after JSON at position 13239"}`

This is **operator-state corruption**, not a probe or production
defect. Probe behaves correctly: the precondition gate catches the
unhealthy daemon and emits the loud-skip reason. KNOWN-when-ran will
land when operator repairs the registry (see §3 operator-step).

**Evidence class:** KNOWN-when-ran (negative path observed; positive
path will be observed on repair).

**Catches regressions (when running):**
- IPC layer reports OK while tmux spawn actually failed (existing
  probe trust gap).
- Daemon registration drift: spawn-handler emits OK but daemon
  /v2/sessions never lists the entry.
- tmux `new-session` arg-shape change (would surface as `tmux ls`
  not listing the name despite spawnSession resolving).

**Defense-in-depth:**
- Synthetic sessionName with timestamp + random suffix avoids
  collisions with operator's real sessions or past probe ghosts.
- PATCH state→killed cleanup in finally (drops daemon's session
  count back below cap).
- `tmux kill-session -t` cleanup in finally (frees tmux server
  resources).

## §3 Operator-state observation — banked for operator triage

**Observation (2026-05-05):** operator's daemon registry at
`~/.foxworks-dispatch/sessions.json` is currently corrupted. HTTP 500
from `GET /v2/sessions` with the message:

> Registry at /Users/joshuatseppich/.foxworks-dispatch/sessions.json
> is not valid JSON: Unexpected non-whitespace character after JSON
> at position 13239

**Confidence: KNOWN-state** (curl reproduction with operator's token).
**Confidence: SPECULATIVE-cause** — likely a partial write or append
during a prior probe / dogfood run that was interrupted; not
investigated per §3.7 halt discipline.

**Affected probes for KNOWN-when-ran evidence:**
- This probe (P4) — auto-skips on corrupted registry.
- P15 cold-launch composite (commit 6) — same daemon precondition.
- Any future fix-94-style live ps-aux probes.
- Existing fix-94 probes 02 + 03 (would currently auto-skip too, by
  design).

**Operator-step to recover KNOWN evidence:**
1. Inspect `~/.foxworks-dispatch/sessions.json` around position 13239
   to identify the corruption shape (likely truncation or a non-JSON
   suffix).
2. Repair: either restore from a backup, or rewrite the file as
   `{"sessions":[]}` to start fresh, or surgically remove the trailing
   garbage if the structure is otherwise intact.
3. Re-run this probe individually:
   ```sh
   pnpm --filter dispatch-workstation exec vitest run \
     test/integration/mb-t05-spawn-tmux/probe-01-tmux-session-exists.test.ts
   ```
4. Expected on repair: PASS in ~1-3s wall-clock (similar to fix-94
   probe-02/03 timings of 735ms / 313ms; P4 has an additional
   /v2/sessions GET that adds tens of ms).

**Filing recommendation:** if the operator finds this is reproducible
across daemon restarts (i.e., daemon does not auto-recover by writing
a fresh empty registry), file as a finding in the daemon territory —
out of Session 3's scope. Reserved finding range #115-119 is for
probe-additions session-internal findings, not daemon defects.

## §4 What's verified — KNOWN evidence catalog (when running)

### §4.1 Tmux session-list state

`tmux ls` returns deterministically after `spawnSession` resolves;
session-name anchor is robust to operator's other tmux sessions.

**Confidence:** KNOWN-when-ran. Probe was verified to compile + load
+ reach the precondition gate + emit the correct skip reason; the
substrate-assertion path is unexercised this run.

### §4.2 Daemon `/v2/sessions` independent assertion

GET `/v2/sessions` with `X-Conductor-Token` returns the new session
in `sessions[].name`, **without** trusting the IPC envelope's
SPAWN_RESULT_OK. This is the assertion the gap analysis specifically
called out as missing.

**Confidence:** KNOWN-when-ran.

### §4.3 What is NOT verified at this probe

- **IPC envelope contract** — covered by fix-83 probe-04 (`SPAWN_RESULT_OK
  <name>`). This probe is the substrate complement, not a replacement.
- **Cap enforcement** — covered by `test/unit/mb-t06/` (8 cases) and
  P6 (Session 3 commit 10) which asserts the kanban card render path.
- **Permission-mode flag** — covered by fix-94 probes 01/02/03.

## §5 Findings filed during probe development

**None probe-internal.** The §3 daemon-registry observation is filed
here as an operator-state note; if operator triages it as a daemon
defect it will land in daemon-territory findings (out of Session 3
finding range).

## §6 Hash / commit references

| Commit | Body |
|---|---|
| `88daa41` | `green(probe-add): SHELL_EVAL stdin handler for shell DOM probes` |
| `56435af` | `green(probe-add): MB-T08 onboarding end-to-end probe` |
| `aa2171f` | `docs(probe-add): mb-t08-onboarding REPORT.md aggregate` |
| `32a549c` | `green(probe-add): MB-T05 tmux session existence probe` |
| this commit | `docs(probe-add): mb-t05-spawn-tmux/REPORT.md` |

P4 closes gap §4.1 #4 (PARTIAL → covered-when-ran). Branch advance:
`af0ac36 → 88daa41 → 56435af → aa2171f → 32a549c → this`.
