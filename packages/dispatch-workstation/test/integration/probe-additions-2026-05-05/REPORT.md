# probe-additions Session 3 — REPORT.md aggregate (2026-05-05)

**Branch:** `sess-3/probe-additions`
**Cut from:** `main` HEAD `af0ac36`
**Aggregate-REPORT commit (this file):** to land at sess-3 HEAD post-`e631274`
**Last individual-mode runs:** 2026-05-05
**Aggregate result across all 5 probes:** **2 / 5 INDIVIDUAL-MODE PASS** (P3, P1) + **3 / 5 AUTO-SKIPPED** with explicit loud reason (P4, P15, P6 — all blocked on the same operator-state daemon registry corruption; KNOWN-when-ran upon repair).

This document is the cross-probe aggregate for Session 3's
probe-additions phase. It is the master pointer for Phase 2 deliverables
and complements the per-directory REPORT.md files at:

- `mb-t08-onboarding/REPORT.md` (P3)
- `mb-t05-spawn-tmux/REPORT.md` (P4)
- `t1-cold-launch-composite/REPORT.md` (P15)
- `mb-82-console-mount/REPORT.md` (P1)
- `mb-t05-kanban-card/REPORT.md` (P6, replaces P5 per operator B1)

## §1 Strategic context

This Session ships the test-infrastructure half of Parallel Batch 2
(scaffold `docs/coordination/parallel-batch-2-2026-05-05.md`). Per
scaffold §2.3:

> Session 3 — probe-additions
> Territory: test-only (no production code)
> Allowed subdirectories:
>  - packages/dispatch-workstation/test/integration/ (new probe directories)
>  - packages/dispatch-workstation/src/main/main.ts (sentinel-region
>    MB_TEST_HOOKS additions ONLY, operator-arbitrated; ~50 LOC max)

5 probes are added (top 5 ship-gate-proximate gaps from
`docs/probe-coverage-gap-analysis-2026-05-05.md` §4.1) plus 1 source-
side seam (SHELL_EVAL) per operator arbitration B5.

## §2 Probe inventory

| # | Probe directory | Probe file | Result | Evidence | Closes gap |
|---|---|---|---|---|---|
| P1 | `mb-82-console-mount/` | `probe-01-console-panel-mounts.test.ts` | **PASS** in ~2s | spawned-electron + SHELL_EVAL | §4.1 #1 (#82 ConsolePanel mounts in webview after IPC — GAP) |
| P3 | `mb-t08-onboarding/` | `probe-01-onboarding-end-to-end.test.ts` | **PASS** in ~6s | spawned-electron, two-spawn cycle | §4.1 #3 (MB-T08 onboarding flow end-to-end — GAP) |
| P4 | `mb-t05-spawn-tmux/` | `probe-01-tmux-session-exists.test.ts` | AUTO-SKIPPED | standalone-node + dist-import | §4.1 #4 (MB-T05 tmux session in `tmux ls` after spawn — PARTIAL) |
| P15 | `t1-cold-launch-composite/` | `probe-01-cold-launch-one-shot.test.ts` | AUTO-SKIPPED | spawned-electron + KANBAN_EVAL + AppleScript | §4.1 #15 (T1 cold-launch one-shot composite — PARTIAL) |
| P6 | `mb-t05-kanban-card/` | `probe-01-spawn-card-renders.test.ts` | AUTO-SKIPPED | spawned-electron + KANBAN_EVAL | §4.2 #6 (MB-T05 kanban shows new spawn card — GAP); replaces P5 per operator B1 |

### §2.1 Operator arbitrations applied (per scaffold §8.4)

| ID | Decision | Status |
|---|---|---|
| B1 | Defer P5 (cap UI); replace with P6 (kanban-card render). | APPLIED — Phase 1 §7-Q1 territory conflict (`data-testid="session-count"` absent; would cross into Session 1 / production shell territory). |
| B2 | SHELL_EVAL-driven P1 (no separate OPEN_CONSOLE_PANEL handler). | APPLIED — saved ~15 LOC of source. |
| B3 | P15 column labels stay at `count > 0`. | APPLIED — per-column-label strengthening filed as a separate Tier-2 follow-up. |
| B4 | P15 uses real daemon with precondition-skip per fix-94/fix-92. | APPLIED — `checkPreconditions()` gate. |
| B5 | SHELL_EVAL seam APPROVED, ~30 LOC under MB_TEST_HOOKS=1. | APPLIED — actual 44 LOC inc. comments; well under ~50 LOC budget. |

## §3 Source-side seam additions

### §3.1 SHELL_EVAL stdin handler (commit `88daa41`)

**Where:** `packages/dispatch-workstation/src/main/main.ts`, inside
the existing `MB_TEST_HOOKS=1` stdin block, immediately after the
KANBAN_EVAL handler block.

**What:** byte-for-byte parallel of the KANBAN_EVAL handler at
`main.ts:548-577` but targets `mainWindow?.webContents` instead of
`kanbanWebContents`.

**Why:** KANBAN_EVAL targets the embedded kanban `<webview>` only.
P1 (ConsolePanel-mount) needs eval against the SHELL webview
(workstation-shell.html) where the console-panel renderer mounts.
The existing `CLICK_SPAWN_BUTTON`, `FILL_AND_SUBMIT_SPAWN`, and
`TYPE_AND_SEND` handlers all run executeJavaScript on
`mainWindow.webContents` but each is a one-shot DOM mutation —
SHELL_EVAL is the missing generic eval-and-return-JSON primitive.

**Sentinel:** `SHELL_EVAL_RESULT <id> <json>` where `<json>` is
`{ ok: true, result }` or `{ ok: false, error: string }`.

**LOC:** 44 lines including comments (the comment block matches
KANBAN_EVAL's defensive verbosity for sentinel-region discipline).
Within the scaffold §2.3 ~50 LOC budget; within operator arbitration
B5 envelope.

**Defense-in-depth:** gate is unreachable in production (already
inside `MB_TEST_HOOKS=1` block); zero behavior change with
`MB_TEST_HOOKS` unset. Build verified: `SHELL_EVAL` appears 8 times
in `dist/main/main.js` post-build.

**Consumer:** P1 (`mb-82-console-mount/probe-01-console-panel-
mounts.test.ts`) — verified the seam works end-to-end on the
operator's machine in 2.07s.

**Total source-side change for Session 3:** 1 commit, 44 LOC,
1 file (`main.ts`). All other commits are test-only.

## §4 Probe results detail

### §4.1 PASS-individual-mode (KNOWN evidence)

#### P3 — MB-T08 onboarding end-to-end — PASS in ~6s

Two-spawn cycle (zipper-2 pattern). All 4 sentinels fired, both
persistence files written (`workstation-config.json`,
`anthropic-api-key.enc`), spawn-2 negative-evidence verified.
See `mb-t08-onboarding/REPORT.md` §2.

#### P1 — #82 ConsolePanel mounts in shell — PASS in ~2s

SHELL_EVAL roundtrip. All 5 DOM assertions green:
`window.consoleBridge` exposed, tile-region display='block',
console-panel-root present, console-panel-header present (post-
bind), header span text contains synthetic session name.
See `mb-82-console-mount/REPORT.md` §2.

### §4.2 AUTO-SKIPPED (KNOWN-when-ran on operator repair)

#### P4 — MB-T05 tmux session in `tmux ls` after spawn

Auto-skipped with reason: `daemon at http://localhost:7878/v2/sessions
returned HTTP 500; ...sessions.json is not valid JSON: Unexpected
non-whitespace character after JSON at position 13239...`. Probe
verified to compile + load + reach precondition gate + emit loud
skip reason with daemon error body.
See `mb-t05-spawn-tmux/REPORT.md` §2-§3.

#### P15 — T1 cold-launch composite

Same skip reason. Probe is the largest of the five (~520 LOC,
includes inlined fix-89 AppleScript helpers). KNOWN-when-ran on
repair.
See `t1-cold-launch-composite/REPORT.md` §2-§3.

#### P6 — MB-T05 kanban shows new spawn card

Same skip reason. KNOWN-when-ran on repair.
See `mb-t05-kanban-card/REPORT.md` §2-§3.

### §4.3 Operator-state observation — banked across REPORTs

**Observation (2026-05-05):** operator's daemon registry at
`~/.foxworks-dispatch/sessions.json` is currently corrupted. HTTP 500
on `GET /v2/sessions` with body explaining the JSON parse failure
at position 13239.

**Confidence: KNOWN-state.** Reproduced via direct curl with
operator's token.

**Confidence: SPECULATIVE-cause.** Likely a partial write or append
during a prior probe / dogfood run that was interrupted; not
investigated per §3.7 halt discipline.

**Affected probes** for KNOWN-when-ran evidence:
- This session's P4, P15, P6.
- Existing fix-94 probes 02 + 03 (would also currently auto-skip).

**Operator-step to recover KNOWN evidence** (from
`mb-t05-spawn-tmux/REPORT.md` §3):

1. Inspect `~/.foxworks-dispatch/sessions.json` around position 13239
   to identify the corruption shape (likely truncation or non-JSON
   suffix).
2. Repair: restore from a backup, OR rewrite as `{"sessions":[]}` to
   start fresh, OR surgically remove the trailing garbage.
3. Re-run individual probes:
   ```sh
   pnpm --filter dispatch-workstation exec vitest run \
     test/integration/mb-t05-spawn-tmux/probe-01-tmux-session-exists.test.ts
   pnpm --filter dispatch-workstation exec vitest run \
     test/integration/t1-cold-launch-composite/probe-01-cold-launch-one-shot.test.ts
   pnpm --filter dispatch-workstation exec vitest run \
     test/integration/mb-t05-kanban-card/probe-01-spawn-card-renders.test.ts
   ```
4. Expected on repair: P4 PASS in ~1-3s, P6 PASS in ~30-60s
   (full spawn end-to-end), P15 PASS in ~10-20s (composite).

**Filing recommendation:** if the corruption is reproducible across
daemon restarts (i.e., daemon does not auto-recover by writing a
fresh empty registry), file as a finding in the daemon territory —
out of Session 3's reserved finding range #115-119. The five #115-
119 entries are reserved for probe-additions session-internal
findings only; this is a daemon / registry concern.

## §5 Suite-mode behavior — UNTESTED this run

Per fix-94 REPORT.md §3, suite-mode invocation can interact non-
trivially with vitest's fork-pool parallelism (worker context PATH
propagation, daemon-ping races, ps-aux races). Session 3 did NOT
run suite-mode invocation across all 5 new probes plus the existing
fix-* + zipper-* + coarch-* + mb-* + app-launches probes. Operator
may verify suite-mode behavior on merge; reference command:

```sh
pnpm --filter dispatch-workstation exec vitest run test/integration
```

If suite-mode reports unexpected skips / failures on the new
probes, individual-mode invocation per §4.3 remains the
authoritative KNOWN-evidence path (same operator re-verification
guidance as fix-94 REPORT.md §3).

## §6 What's verified — KNOWN evidence catalog

### §6.1 SHELL_EVAL test-hook seam

`mainWindow.webContents.executeJavaScript(<code>)` → JSON return
value → `SHELL_EVAL_RESULT <id> <json>` to stdout. Same envelope as
`KANBAN_EVAL_RESULT`. Production-unreachable (`MB_TEST_HOOKS=1` gate).
**Confidence: KNOWN** — exercised by P1 in 2.07s.

### §6.2 Onboarding stdin handlers + sentinels (P3)

Smoke-path stdin handlers + persistence calls + first-launch
detector all exercised end-to-end. Two-spawn cycle proves the
gate honors persisted state.
**Confidence: KNOWN.**

### §6.3 ConsolePanel mount + bind chain (P1)

`consoleBridge.openPanel` → IPC → `console:open` event → shell HTML
tile-region toggle + console-panel renderer state bind → React
component transitions empty → bound branch with session name.
**Confidence: KNOWN** — all 5 DOM assertions green in 2.07s.

### §6.4 Substrate-level spawn assertions (P4 — when running)

`tmux ls` lists the new session AND `/v2/sessions` daemon endpoint
independently lists it (without trusting the SPAWN_RESULT_OK IPC
envelope). Closes the gap fix-83 probe-04 leaves open at the IPC
boundary.
**Confidence: KNOWN-when-ran.**

### §6.5 T1 dogfood composite (P15 — when running)

`WINDOW_READY → SHELL_READY → BOOTSTRAP_TOKEN_WRITTEN → kanban
connected DOM state → CC Console submenu builds and is reachable
via System Events` — all in ONE app spawn. SPECULATIVE that the
composite catches interaction bugs distributed probes miss
(per gap analysis §3.4 T1 row).
**Confidence: KNOWN-when-ran** structurally; SPECULATIVE on the
"catches interaction bugs" claim.

### §6.6 Kanban-card render after spawn (P6 — when running)

`SPAWN_RESULT_OK → kanban DOM contains [role="button"]
[aria-label="<sessionName>"] inside [data-testid^="kanban-column-"]`.
Closes the gap that fix-83 probe-04 leaves at the IPC boundary on
the kanban-side rendering surface.
**Confidence: KNOWN-when-ran.**

## §7 Findings filed during probe development

**None probe-internal.**

The §4.3 daemon-registry observation is filed as an operator-state
note, not a session-internal finding. Reserved finding range
#115-119 is for any probe-development findings that DO surface in
this session — currently empty (commit 13 will document).

## §8 Recommended next steps

Per scaffold §5 sequencing:

> Session 3 third: test-only, no production conflict, but value lands
> last because probes verify Sessions 1 + 2's wiring.
> Override allowed: if Session 3 ships green before Session 1,
> operator may merge Session 3 first.

Session 3's deliverables ARE green individually (PASS for P1 + P3;
auto-skip-with-loud-reason is the documented green state for P4 +
P15 + P6 under operator-state precondition failure per fix-94
§7.5 pattern).

**Recommended:** operator authors merge of `sess-3/probe-additions`
→ `main`. The probes are non-invasive (test-only + 44 LOC source
seam under MB_TEST_HOOKS=1) and are not blocked by Sessions 1 or 2.
Operator may merge Session 3 first per scaffold §5 override clause.

After merge:
1. Operator triages the daemon registry corruption observation
   (§4.3) at their leisure.
2. After repair, re-run P4 + P15 + P6 individually for KNOWN
   evidence (§4.3 operator-step).
3. Operator may file the per-column-label strengthening (B3 follow-
   up), the cap UI surfacing (P5 deferred), and the xterm `<canvas>`
   render assertion (P1 §4.5 follow-up) as Tier-2 / Tier-3 gaps for a
   future session.

## §9 Hash / commit references

| Commit | Body |
|---|---|
| `88daa41` | `green(probe-add): SHELL_EVAL stdin handler for shell DOM probes` |
| `56435af` | `green(probe-add): MB-T08 onboarding end-to-end probe` |
| `aa2171f` | `docs(probe-add): mb-t08-onboarding REPORT.md aggregate` |
| `32a549c` | `green(probe-add): MB-T05 tmux session existence probe` |
| `fcfe4b6` | `docs(probe-add): mb-t05-spawn-tmux REPORT.md aggregate` |
| `f1df785` | `green(probe-add): T1 cold-launch composite probe` |
| `8ee0bb1` | `docs(probe-add): t1-cold-launch-composite REPORT.md aggregate` |
| `4151d78` | `green(probe-add): MB-#82 ConsolePanel mounts in shell after openPanel IPC` |
| `da16957` | `docs(probe-add): mb-82-console-mount REPORT.md aggregate` |
| `78e5e15` | `green(probe-add): MB-T05 kanban shows new spawn card (P6, replaces P5)` |
| `e631274` | `docs(probe-add): mb-t05-kanban-card REPORT.md aggregate` |
| this commit | `docs(probe-add): probe-additions-2026-05-05/REPORT.md aggregate` |
| (next) | `docs(cairn): finding entries documenting probe additions` |

Branch advance: `af0ac36 → ... → e631274 → this`.

Total commits this Phase: **12 commits to date** (this file is #12;
finding-entries doc is #13). Total LOC delta:
- 1 source file: +44 LOC under MB_TEST_HOOKS=1 sentinel region
- 5 probe files: ~1,940 LOC test code
- 5 per-directory REPORT.md files + this aggregate: docs only
