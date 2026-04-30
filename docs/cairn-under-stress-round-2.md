# Cairn Under Stress — Round 2

**Status:** Active experiment. Methodology research artifact, written during the experiment per Round 1 precedent.

**Round 1 reference:** docs/cairn-under-stress-round-1.md

**Authority chain:** docs/parallel-cairn-round-2-contract.md (frozen at 99b68e7) defines the experimental setup. This document tracks what actually happens during execution.

---

## §1 — Experimental setup

**Date:** 2026-04-30 onward
**Operator:** Joshua Seppich
**Billing:** Claude Max 20x plan (post-API-key-billing-leak migration; see prior session transcript)
**Model:** Sonnet 4.6 in all build sessions; Opus 4.7 in operator/architect role (this chat)
**Repo:** ~/Desktop/Automata/foxworks-dispatch (GitHub: JoshTSeppich/Conductor)

**Session count:** 3 build sessions + 2 zipper sessions + 1 final integration (3+2+1 structure).

Build sessions:
- B: MB-T02 (dispatch-web embedded in BrowserWindow)
- C: MB-T03 (native macOS menu + window lifecycle)
- D: COARCH-T02 (chat panel UI scaffold + mocked daemon stubs; SDK + real daemon wiring deferred)

Session E (originally MB-T05 sub-tasks 2-7) dropped pre-launch due to missing V3_TICKETS.md sub-task enumeration. Session E reserved for future round per contract §6.

**Pre-flight commits before any session launch:**
1. 99b68e7 — contract: parallel-cairn-round-2 export signatures + 3+2+1 zipper structure
2. 0bde92e — docs(round-2): scaffold cross-session coordination notes file
3. (this commit) — docs: cairn-under-stress-round-2 initial setup
4. (pending) — chore(round-2): test directory scaffolding for B/C/D
5. (pending) — chore(round-2): React + react-dom + renderer build tooling pre-installation per RESOLUTION-1

**Hypotheses being tested:**

1. **Frozen export contracts prevent drift across 3 simultaneous sessions** under cairn discipline. Round 1 validated this for 2 sessions; Round 2 is the first 3-session validation.

2. **The zipper pattern scales** to multi-zipper structures (Zipper-1 main-process domain + Zipper-2 renderer-process domain running in parallel post-build).

3. **Cross-session methodology propagation** (Round 1 §6 finding) replicates at 3-session scale via the coordination notes file.

4. **Per-path git add discipline** holds when 3 sessions touch overlapping subtrees (packages/dispatch-workstation/) but disjoint files. Lockfile thrashing is the expected pressure point — RESOLUTION-1 (operator pre-installs deps) is the chosen mitigation.

5. **Anti-fabrication holds at sub-contract level** — sessions don't invent signatures for unspecified ticket scope (validated pre-launch via E-session drop after CRITICAL-2 surfaced).

**Out of scope for Round 2:**
- Real daemon /v3/* wiring (Session D uses mocked stubs)
- MB-T05 spawn execution (Session E dropped)
- Production-mode webview loading (deferred to MB-T08)
- Dock badge (out of MB-T03 scope per RESOLUTION-2)

---

## §2 — Pre-launch decisions log

Each operator decision captured here in the order made. Citations to chat session timestamps where relevant.

**Decision 1: Drop Session E.** Pre-launch. Source: drafting-session CRITICAL-2 surfaced that MB-T05 sub-tasks 2-7 are not enumerated in any committed artifact. Operator chose to skip E rather than fabricate sub-tasks. Methodology integrity preserved.

**Decision 2: D scope = UI scaffold + mocked daemon stubs.** Pre-launch. Source: drafting-session CRITICAL-1 surfaced that V3_TICKETS.md COARCH-T02 green criterion includes daemon wiring; operator scoped D down to UI-only with stubs. Real daemon wiring deferred to future ticket (COARCH-T02b or rolled into COARCH-T03).

**Decision 3: RESOLUTION-1 Path A — operator pre-installs React deps.** Pre-launch. Avoids Session D first-commit lockfile thrash. All 3 sessions can launch in parallel from t=0.

**Decision 4: RESOLUTION-2 — dock badge out of scope.** Pre-launch. Strips "if relevant" permissive language from MB-T03 scope. MB-F-MB-T03-DOCK-BADGE filed by Session C at docs sub-task time.

**Decision 5: RESOLUTION-3 Pattern B — contextBridge/IPC for renderer.** Pre-launch. Standard Electron security posture, single integration point for Zipper-2.

---

## §3 — Incidents (populated during execution)

_Each incident: timestamp | session | description | discipline reaction | outcome | finding-N if codified._

(empty — populated as sessions execute)

---

## §4 — Cross-session propagation events (populated during execution)

_Each event: timestamp | originating session | propagated to | discipline change | trigger note in notes.md._

(empty)

---

## §5 — Methodology violations and remediations (populated during execution)

_Each violation: timestamp | session | violation type | discipline reaction | remediation commit._

(empty)

---

## §6 — Final assessment (populated post-experiment)

_Written after final-integration session closes. Captures hypothesis evaluation, novel findings, methodology updates required, comparison to Round 1._

(empty)

---

*This document is operator-curated. Sessions can reference but should NOT directly edit. Sessions log to docs/parallel-cairn-round-2/notes.md instead, and operator transcribes notable items here.*
