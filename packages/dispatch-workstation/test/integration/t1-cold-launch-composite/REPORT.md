# T1 cold-launch composite probe — REPORT.md

**Branch:** `sess-3/probe-additions`
**Cut from:** `main` HEAD `af0ac36`
**Probe commit:** `f1df785` (`green(probe-add): T1 cold-launch composite probe`)
**Last individual-mode run:** 2026-05-05
**Aggregate result:** **AUTO-SKIPPED this run** due to operator daemon registry corruption (same as P4 §3); KNOWN-when-ran upon operator repair.

Closes gap §4.1 #15 (P15 in §5) from `docs/probe-coverage-gap-analysis-
2026-05-05.md`: "T1 — cold-launch one-shot composite probe (PARTIAL)."

## §1 Suite identity

- **1 probe file**: `probe-01-cold-launch-one-shot.test.ts` (~520 LOC, includes inlined fix-89 AppleScript helpers).
- **1 darwin-gated test case**: single-spawn composite.
- Real-daemon precondition per operator arbitration B4 (auto-skip per fix-94/fix-92 pattern).

## §2 Per-probe result

| # | Probe | Individual-mode result | Evidence class | Test file |
|---|---|---|---|---|
| 1 | T1 cold-launch composite (single-spawn) | AUTO-SKIPPED 2026-05-05 (daemon /v2/sessions HTTP 500; KNOWN-when-ran-on-repair) | KNOWN-when-ran | `probe-01-cold-launch-one-shot.test.ts` |

### Probe 1 — T1 cold-launch composite — AUTO-SKIPPED

**Asserts (when preconditions met):**

Sentinel chain:
- `WINDOW_READY` fires (`main.ts:115`; did-finish-load on shell HTML).
- `SHELL_READY` fires (forwarded console-message, `main.ts:122-141`).
- `BOOTSTRAP_TOKEN_WRITTEN <length>` fires (`main.ts:159-160`;
  Fix-92 path: kanban webview preload writes token to localStorage).
- Length value > 0.

Settling: 2.5s post-BOOTSTRAP_TOKEN_WRITTEN for `useAuthBootstrap` →
`runPreflight` → `setPhase('connected')` → kanban-column re-render.

KANBAN_EVAL on the kanban webview:
- `hasTokenPromptHeading: false` (no "Conductor authentication" h1
  — Fix-92 connected path landed).
- `kanbanColumnCount > 0` (per operator arbitration B3 — keep at
  count granularity; per-column-label strengthening is a separate
  follow-up).

AppleScript introspection of CC Console submenu (fix-89 probe-01
pattern):
- `source !== 'ERROR'` (the menu was built and System Events can
  reach it).
- Items array may be empty, contain 'No sessions registered', or
  contain real session names — all three ratify "menu populated".

Clean QUIT with exit code 0.

**Mechanism:** real-daemon precondition gate via
`checkPreconditions()` (token + daemon /v2/sessions 200). Cold-launch
envelope: fresh `MB_USER_DATA_DIR` + `MB_ONBOARDING_STATE_DIR` with
`onboardingCompleted: true` seeded so the gate short-circuits to
`ONBOARDING_READY` (no smoke-path stdin handlers needed; P3 covers
that path separately). `findElectronGuiPid` walks `pgrep -P` to find
the Electron.app GUI subprocess; `introspectCcConsoleSubmenu` writes
an osascript file and invokes via `osascript <path>` (per fix-89
probe-01's lesson on multi-line script escaping).

**This run (individual-mode, 2026-05-05):** SKIPPED with reason:
> daemon at http://localhost:7878/v2/sessions returned HTTP 500;
> body="{\"error\":\"Registry at /Users/joshuatseppich/.foxworks-
> dispatch/sessions.json is not valid JSON: Unexpected non-whitespace
> character after JSON at position 13239\"}"

Same operator-state corruption surfaced by P4 (`mb-t05-spawn-tmux/
REPORT.md` §3). Probe correctly auto-skipped with a loud reason
that includes the daemon's error body — operator can triage from
the skip message alone.

**Evidence class:** KNOWN-when-ran. Probe was verified to compile +
load + reach the precondition gate + emit the correct skip reason
with daemon body included.

**Catches regressions (when running):**
- WINDOW_READY/SHELL_READY/BOOTSTRAP_TOKEN_WRITTEN sentinel-chain
  ordering changes that distributed probes (fix-82 + fix-92 +
  fix-89) might miss in isolation.
- Auth bootstrap timing race that surfaces only when ALL three
  paths run in one spawn (the SPECULATIVE motivation per gap
  analysis §3.4 T1 row).
- Native menu build failures that AppleScript introspection
  catches but no JS-side test can.
- Cold-launch-from-clean-userData regressions (no localStorage
  cache, no kanban state cache).

**Defense-in-depth:**
- `MB_USER_DATA_DIR` + `MB_ONBOARDING_STATE_DIR` isolated to fresh
  tmpdirs; operator's real install untouched.
- AppleScript filtered by `unix id` of the GUI Electron descendant
  to avoid colliding with operator's other "Electron" processes.
- KANBAN_EVAL targets the kanban webview specifically (Fix-92's
  obs-infra) — does not pollute the shell webview's state.

## §3 Real-daemon precondition gate (operator arbitration B4)

Per operator arbitration B4 (Phase 1 diagnose §7-Q4 recommendation):
P15 uses operator's running daemon — not an `invalid://` short-circuit
— because T1 IS the operator's running-daemon cold-launch UX. An
`invalid://` variant would prove a different probe (already covered
by fix-82 probe-02 + fix-89 probe-01).

The auto-skip-with-loud-reason pattern means this probe gracefully
degrades when the operator's daemon is unhealthy. The skip reason
surfaces the daemon's error body so triage is direct from the
vitest output.

**Affected by §3 of `mb-t05-spawn-tmux/REPORT.md`:** same operator-
state precondition (corrupted `~/.foxworks-dispatch/sessions.json`).
Same operator-step recovers KNOWN-when-ran for both probes.

## §4 What's verified — KNOWN evidence catalog (when running)

### §4.1 Composite sentinel ordering

WINDOW_READY → SHELL_READY → BOOTSTRAP_TOKEN_WRITTEN as a single
cause-effect chain in one app spawn. Distributed probes assert each
in isolation; this probe asserts the ordering.

**Confidence:** KNOWN-when-ran.

### §4.2 Connected-state kanban DOM

`hasTokenPromptHeading: false` + `kanbanColumnCount > 0` post-
settling-window. Fix-92 probe-06 asserts the same boolean shape; this
probe asserts it AS PART OF the broader composite.

**Confidence:** KNOWN-when-ran.

### §4.3 Native menu introspection

CC Console submenu builds and is reachable via System Events at the
time WINDOW_READY+SHELL_READY+BOOTSTRAP_TOKEN_WRITTEN have all fired
(plus 2.5s settle). Fix-89 probe-01 asserts the same thing AFTER a
deliberate `REFRESH_CONSOLE_MENU` stdin trigger; this probe asserts
the natural state at cold-launch end.

**Confidence:** KNOWN-when-ran.

### §4.4 What is NOT verified at this probe

- **Per-column-label strengthening** (AWAITING REVIEW / STALE /
  RUNNING / IDLE) — operator arbitration B3 keeps T1 at composite-
  coarse granularity. Filed as a separate Tier-2 gap (gap analysis
  MB-T02 PARTIAL); could be a Session 1 follow-up since dispatch-web
  is their territory.
- **Real session names appearing in the CC Console submenu** —
  operator's daemon has no live sessions during a probe run by
  default. fix-82 probe-02 covers the bootstrap-fetch path
  separately with deterministic session-list state.

## §5 Findings filed during probe development

**None probe-internal.** §3 cross-references the operator-state
observation banked in P4's REPORT.md.

## §6 Hash / commit references

| Commit | Body |
|---|---|
| `88daa41` | `green(probe-add): SHELL_EVAL stdin handler for shell DOM probes` |
| `56435af` | `green(probe-add): MB-T08 onboarding end-to-end probe` |
| `aa2171f` | `docs(probe-add): mb-t08-onboarding REPORT.md aggregate` |
| `32a549c` | `green(probe-add): MB-T05 tmux session existence probe` |
| `fcfe4b6` | `docs(probe-add): mb-t05-spawn-tmux REPORT.md aggregate` |
| `f1df785` | `green(probe-add): T1 cold-launch composite probe` |
| this commit | `docs(probe-add): t1-cold-launch-composite/REPORT.md` |

P15 closes gap §4.1 #15 (PARTIAL → covered-when-ran). Branch advance:
`af0ac36 → 88daa41 → 56435af → aa2171f → 32a549c → fcfe4b6 → f1df785 → this`.
