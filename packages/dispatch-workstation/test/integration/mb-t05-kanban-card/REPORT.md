# MB-T05 kanban-card probe — REPORT.md

**Branch:** `sess-3/probe-additions`
**Cut from:** `main` HEAD `af0ac36`
**Probe commit:** `78e5e15` (`green(probe-add): MB-T05 kanban shows new spawn card (P6, replaces P5)`)
**Last individual-mode run:** 2026-05-05
**Aggregate result:** **AUTO-SKIPPED this run** (same operator-state daemon registry corruption as P4 / P15); KNOWN-when-ran upon operator repair.

Closes gap §4.2 #6 (P6) from `docs/probe-coverage-gap-analysis-2026-05-05.md`:
"MB-T05 — kanban shows new spawn card (GAP). KNOWN: no probe drives
kanban refresh after spawn and asserts new card mounts."

This probe is the **operator arbitration B1 swap for P5**. P5 (MB-T06
cap UI) was deferred at Phase 1 §7-Q1 because `data-testid="session-
count"` doesn't exist; adding it would land outside Session 3's
test-only territory.

## §1 Suite identity

- **1 probe file**: `probe-01-spawn-card-renders.test.ts` (~450 LOC).
- **1 darwin-gated test case**: single-spawn end-to-end through the
  CLICK_SPAWN_BUTTON → FILL_AND_SUBMIT_SPAWN → SPAWN_RESULT_OK
  sentinel chain plus KANBAN_EVAL DOM polling.
- Real-daemon precondition (auto-skip-with-loud-reason per fix-94/
  fix-92).

## §2 Per-probe result

| # | Probe | Individual-mode result | Evidence class | Test file |
|---|---|---|---|---|
| 1 | kanban renders SessionCard for new spawn | AUTO-SKIPPED 2026-05-05 (daemon /v2/sessions HTTP 500; KNOWN-when-ran-on-repair) | KNOWN-when-ran | `probe-01-spawn-card-renders.test.ts` |

### Probe 1 — kanban renders SessionCard for new spawn — AUTO-SKIPPED

**Asserts (when preconditions met):**

Sentinel chain:
- `WINDOW_READY` → `SHELL_READY` → `BOOTSTRAP_TOKEN_WRITTEN`.

Spawn driver:
- `CLICK_SPAWN_BUTTON` stdin → `SPAWN_MODAL_OPENED` sentinel.
- `FILL_AND_SUBMIT_SPAWN <repoPath>|<sessionName>` stdin →
  `SPAWN_RESULT_OK <sessionName>` sentinel (fix-83 probe-04 path).

KANBAN_EVAL polling (up to 10s):
- `document.querySelector('[role="button"][aria-label="<sessionName>"]')`
  exists (SessionCard.tsx:80-82 — role + aria-label).
- The card is inside a `[data-testid^="kanban-column-"]` element
  (KanbanColumn.tsx:35; routing-correct).
- The card's `textContent` contains the session name (defense-in-
  depth against aria-label mismatch on a different card).

Clean QUIT with exit code 0.

**Mechanism:** drives the production spawn path end-to-end through
existing test-hooks (CLICK_SPAWN_BUTTON, FILL_AND_SUBMIT_SPAWN,
SPAWN_RESULT_OK from fix-83) and asserts the kanban-side render
through the existing KANBAN_EVAL seam. No new source-side seam.
Real daemon is required because spawn-handler queries
`/v2/sessions` for the cap-check (failure → SPAWN_RESULT_ERROR).

**This run (individual-mode, 2026-05-05):** SKIPPED in 287ms with
reason:
> daemon at http://localhost:7878/v2/sessions returned HTTP 500;
> body="{\"error\":\"Registry at /Users/joshuatseppich/.foxworks-
> dispatch/sessions.json is not valid JSON: Unexpected non-whitespace
> character after JSON at position 13239\"}"

Same operator-state corruption surfaced by P4 (`mb-t05-spawn-tmux/
REPORT.md` §3) and P15 (`t1-cold-launch-composite/REPORT.md` §3).
KNOWN-when-ran lands on operator repair.

**Evidence class:** KNOWN-when-ran. Probe was verified to compile,
load, reach the precondition gate, and emit the daemon error body
in the loud-skip reason.

**Catches regressions (when running):**
- Spawn IPC layer reports OK while the kanban-side card never
  surfaces (the gap analysis's specific concern).
- Daemon WS event → dispatch-web refetch chain breaks; new
  sessions don't appear in /v2/sessions snapshot the kanban consumes.
- SessionCard render condition skips operator's new spawn (e.g.,
  computed_status mapping change leaves it in no column).
- KanbanColumn routing regression places the card outside
  `[data-testid^="kanban-column-"]`.

**Defense-in-depth:**
- Synthetic sessionName with timestamp + random suffix.
- Cleanup PATCH state→killed + tmux kill-session in finally.
- Cold-launch envelope: tmpdir userData isolated.
- Onboarding completed seeded so the first-launch gate short-
  circuits without smoke-path stdin handlers (P3 covers that).

## §3 Replacement-for-P5 note (operator arbitration B1)

This probe replaces the originally-planned P5 (MB-T06 spawn cap
enforcement UI) which was HALT-WORTHY at Phase 1 §7-Q1:

- `data-testid="session-count"` does NOT exist anywhere in the
  codebase (verified via grep across `packages/dispatch-web/src` and
  `packages/dispatch-workstation/src`).
- Override-modal testid not present either.
- Adding the cap UI elements would land in
  `packages/dispatch-web/src/components/header/` (Session 1
  territory per scaffold §2.1) OR
  `packages/dispatch-workstation/src/main/workstation-shell.html`
  (production source — Session 3 forbidden territory per scaffold
  §2.3).

Per operator arbitration B1: defer P5, replace with this Tier-2 P6
which is test-only, KANBAN_EVAL-reachable, and the kanban-card
surface already exists. P5 can be revisited in a follow-up batch
after Session 1 (or another batch) ships the cap UI.

## §4 What's verified — KNOWN evidence catalog (when running)

### §4.1 Spawn-IPC → daemon registration → kanban refresh chain

CLICK → modal → fill-and-submit → spawn-handler runs → tmux session
created → daemon /v2/sessions register → daemon emits WS event →
dispatch-web kanban refresh → SessionCard renders. Closes the loop
that fix-83 probe-04 leaves open at the IPC boundary.

**Confidence:** KNOWN-when-ran.

### §4.2 SessionCard mount-and-content contract

`<div role="button" aria-label={name}>` with `<span>{name}</span>`
nested inside (SessionCard.tsx:79-99). Aria-label is the stable
selector; data-testid is not currently on the card.

**Confidence:** KNOWN.

### §4.3 KanbanColumn routing

The card lives inside `[data-testid="kanban-column-<status>"]`
where `<status>` is the computed_status mapping. Probe asserts
column-prefix match without prejudice to which column.

**Confidence:** KNOWN.

### §4.4 What is NOT verified at this probe

- **Cap enforcement UI** (P5): deferred per operator B1.
- **Per-card State Control Cluster** (kill / pull buttons): covered
  by component-level unit tests in `packages/dispatch-web/test/`.
- **MB-T07 orchestrator-card mount** (Approve / Decline buttons,
  audit row): separate Tier-3 gap (P16); Session 2 territory.
- **Stale → STALE column transition**: separate gap; out of P6 scope.

## §5 Findings filed during probe development

**None probe-internal.** Cross-references the operator-state
observation banked in P4 / P15 REPORTs.

## §6 Hash / commit references

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
| this commit | `docs(probe-add): mb-t05-kanban-card/REPORT.md` |

P6 closes gap §4.2 #6 (GAP → covered-when-ran). Branch advance:
`af0ac36 → 88daa41 → 56435af → aa2171f → 32a549c → fcfe4b6 → f1df785 → 8ee0bb1 → 4151d78 → da16957 → 78e5e15 → this`.
