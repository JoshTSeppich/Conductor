# MB-T20 Decisions — Conductor chat panel shell

**Date:** 2026-05-07
**Companion to:** `docs/coordination/mb-t20-diagnose-2026-05-07.md`
**Status:** Phase 1 dispositions PENDING operator markup. Operator
acks (or flips) each Q-MBT20-N + R-MBT20-N before Phase 2 WB1.

This doc is the operator-skim review surface. Full inventory + risks
+ prose live in the diagnose doc; here, each question gets one row
with the tentative disposition + the option set + a one-line
rationale.

---

## Q-MBT20-N — open questions + tentative dispositions

| ID | Question | Options | Tentative | Rationale (1 line) |
|---|---|---|---|---|
| Q-MBT20-1 | **Ticket scope: tab-host vs standalone vs parallel chat?** | (a) Family-B tab-host shell / (b) standalone chat panel polish / (c) new parallel chat | **(a)** | CLAUDE.md §5.3 lists MB-T20 = "shell" + MB-T21 = "Chat tab" — implies tab host. **WB ladder shape pivots on this answer.** |
| Q-MBT20-2 | New directory naming | (a) `chat-shell/` / (b) `chat-panel/` / (c) `conductor-chat/` | **(a)** | (b) collides with `coarchitect/chat-panel.tsx`; (c) breaks Family-B continuity. |
| Q-MBT20-3 | Existing `coarchitect/chat-panel.tsx` — wrap, replace, or coexist? | (a) wrap (Q-MBT20-1=a) / (b) replace (Q-MBT20-1=b) / (c) coexist (Q-MBT20-1=c) | **(a) wrap** | Phase-2 imports ChatPanel from coarchitect into chat-shell's Chat tab body. NO modification to coarchitect/chat-panel.tsx in MB-T20. |
| Q-MBT20-4 | Mount target inside workstation-shell.html | (a) replace line 555 script tag with chat-shell renderer / (b) two scripts in one region / (c) chat-shell wraps coarchitect mount | **(a)** | Single renderer per region; tab-host imports + renders ChatPanel inline (no nested mount). |
| Q-MBT20-5 | Bridge IPC strategy | (a) reuse `coarchitectBridge` / (b) new `chatShellBridge` / (c) WB1 stub no IPC | **(a)** | Wrap delegates IPC contract; preload.mts UNCHANGED → zero T17 collision risk on shared bridge file. |
| Q-MBT20-6 | Closes `MB-F-COARCH-T02-STYLING`? | (a) full / (b) partial (chrome only) / (c) defer | **(b)** | Panel chrome lands; inner ChatPanel styling defers to MB-T21. File `MB-F-T20-COARCH-STYLING-DEFERRED` if needed at WB5. |
| Q-MBT20-7 | Closes `MB-F-COARCH-T02-DEFAULT-LAYOUT`? | (a) yes (revisit 280px default) / (b) defer | **(a)** | Adjacent UX surface to chrome change; revisit lands naturally at WB4 + closure note in WB5. |
| Q-MBT20-8 | main.ts sentinel block | (a) NEW `=== BEGIN: MB-T20 chat panel ===` adjacent to MB-T16 / (b) reuse existing zone | **(a)** | CLAUDE.md §3.3 mandate; reserves namespace even if zero new logic lands at WB4. |
| Q-MBT20-9 | Build script | (a) new `scripts/build-chat-shell.mjs` / (b) extend `build-coarchitect.mjs` | **(a)** | Direct precedent + clean isolation per CLAUDE.md §3.7. |
| Q-MBT20-10 | Test directory layout | (a) `test/unit/chat-shell/probe-NN-*.spec.tsx` / (b) combine with `test/unit/coarchitect/` | **(a)** | Direct precedent (T15/T16/T17 each own a test/unit/<surface>/ dir). |
| Q-MBT20-11 | WB count | (a) 5 (Q-MBT20-1=a) / (b) 7 (Q-MBT20-1=b) | **(a)** | Mirror MB-T15/T16/T17 ladder shape under tab-host interpretation. |
| Q-MBT20-12 | tsconfig .tsx exclude policy | (a) add at WB1 / (b) skip | **(a)** | Direct precedent (esbuild bundles .tsx, tsc excludes it). |
| Q-MBT20-13 | Ladder shape | (a) strict mirror of MB-T15/T16 / (b) different shape if Q-MBT20-1 flips | **(a)** | Mirror precedent assuming Q-MBT20-1=a. |

---

## R-MBT20-N — risks + dispositions

| ID | Risk | Severity | Disposition |
|---|---|---|---|
| R-MBT20-1 | Naming collision with `coarchitect/chat-panel.tsx` (if Q-MBT20-2=b) | HIGH on workflow | **AVOID via Q-MBT20-2=a (`chat-shell/`).** |
| R-MBT20-2 | Cross-session main.ts sentinel proximity (T17 + T18 + T20 each adding zones) | LOW with discipline | **PER-PATH GIT ADD; pre-commit `git status --short` mandatory.** New zone non-overlapping; recommend bottom-of-file placement. |
| R-MBT20-3 | preload.mts shared-file conflict (if Q-MBT20-5=b) | ZERO/MEDIUM | **PREFER Q-MBT20-5=a → preload.mts UNCHANGED by MB-T20.** |
| R-MBT20-4 | tsconfig.json exclude array shared-file conflict | LOW | **ACCEPT** — append-only, mechanical resolution. |
| R-MBT20-5 | workstation-shell.html line 555 swap leaves chat region BLANK at intermediate WBs | HIGH intermediate / ZERO at WB4 | **SWAP ONLY AT WB4** — atomic with ChatPanel import + smoke. |
| R-MBT20-6 | dispatch-core dist rebuild discipline (if new schema exports) | ZERO / HIGH | **NO DISPATCH-CORE SCHEMA CHANGES IN SCOPE** — no schema spine ingress. |
| R-MBT20-7 | Runtime-launch smoke as merge gate (MB-F-WORKSTATION-RUNTIME-RELAUNCH-AS-MERGE-GATE) | HIGH if skipped | **WB4 RUNS SMOKE** — observe `WINDOW_READY` + `RENDER_OK` ≤10s. |
| R-MBT20-8 | Pre-existing chat-panel test suite drift (DOM tree depth change) | MEDIUM | **ACCEPT FOR INVESTIGATION AT WB4** — fix-forward extending selectors; do NOT modify ChatPanel itself. |

---

## Operator markup template

When this doc returns from operator review, expected forms:

- **Unanimous accept:** "proceed with tentative dispositions, begin
  Phase 2 WB1."
- **Disposition flips:** e.g., "Q-MBT20-1 flip to (b); Q-MBT20-3 flip
  to (b); rest accept." → triggers re-plan of WB ladder under
  Q-MBT20-1=b shape (likely 7+ WBs).
- **New question:** e.g., "Q-MBT20-14: should Chat tab be the only
  tab at MB-T20, or render placeholder tabs for Commits/Tasks?"

The diagnose's §V proposed ladder is contingent on Q-MBT20-1=a +
Q-MBT20-11=a. Any flip there means the ladder is re-drafted before
WB1 red.

---

**HALT 0 — Phase 1 decisions surface complete.**

---

## OPERATOR CONFIRMATION — 2026-05-07

All Q-MBT20-1..13 = (a) ACCEPTED.
All R-MBT20-1..8 ACCEPT/PRESERVE/AVOID dispositions ACCEPTED.

Q-MBT20-1=a confirmed with rationale: "CLAUDE.md §5.3 sequencing
(T20 shell → T21 Chat tab → T22 Commits tab → T23 Tasks tab) only
makes sense if T20 is the shell that hosts those tabs. T21 wouldn't
be a separate ticket if T20 already owned Chat content."

Phase 2 WB1..WB5 AUTHORIZED under default mode. Status surface after
WB3. HALT 0 only if cross-session contention surfaces.
