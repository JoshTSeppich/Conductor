# v3.5 Dogfood Validation Session — Findings

**Session type:** Dogfood validation (not build). Dispatch: `~/Downloads/V35-DOGFOOD-VALIDATION-DISPATCH.md`.
**Cairn primitives active:** anti-fabrication, halt discipline, scope fences, followup over absorption.
**No RED→GREEN cycle.** Findings only.

---

## §1 — Session Summary

| Field | Value |
|-------|-------|
| **Start** | 2026-05-09 ~15:22 (workstation build + Electron launch) |
| **Phase A complete** | 2026-05-09 ~15:30 (all 6 gates verified; HALT 0 cleared) |
| **Pause** | 2026-05-09 at Phase B observation gate (HALT-B-OBSERVATION-PENDING) |
| **Resume attempt** | 2026-05-10 12:30+ |
| **Closure** | 2026-05-10 — option (C): audit-superseded close |
| **Daemon PID 92700** | Alive throughout; uptime ~4.9 days (351 479 s at last check); `node --import tsx .../dispatch-daemon/src/index.ts` |
| **Electron PID 77297** | Launched 2026-05-09 15:22; NOT FOUND at 2026-05-10 resume. Exited overnight (cause unknown: operator close, crash, or system event). [KNOWN] |

**Base SHA:** `5704dd2` — confirmed HEAD at session start. Matches dispatch anchor. [KNOWN]
**Current HEAD at close:** `18be117` (post-audit plan, committed by operator). [KNOWN]

---

## §2 — Phase A Gate Results

All 6 gates executed concurrently after HALT 0 ack. Arbitrations received from operator at HALT 0 clearance.

### Gate 1 — pnpm install state

**Outcome: GREEN** [KNOWN]

```
Lockfile is up to date, resolution step is skipped
Already up to date
Done in 734ms using pnpm v10.33.0
```

No dep delta. Pre-existing warning: `msw@2.13.5` build scripts ignored (not new). pnpm upgrade available (10.33.0 → 11.0.9) — not a blocker. Finding #67 closed by observation: deps materialized, no stale lockfile.

### Gate 2 — WEB_UI_URL current state

**Outcome: OPERATOR ARBITRATED — Option A (7878, no modification)** [KNOWN]

`packages/dispatch-workstation/src/main/webview-loader.ts:9`:
```typescript
export const WEB_UI_URL = 'http://localhost:7878';
```

File comment describes this as "Dev-server URL for dispatch-web per UI-S03 ADR §1" — comment language is "dev-server" but value is 7878 (daemon port). Production-mode loading deferred to MB-T08 per IMPORTANT-5. Operator arbitrated: leave at 7878, webview-loader.ts NOT modified, production code frozen for validation. Vite step skipped in Phase B.

### Gate 3 — pnpm dev:all script existence

**Outcome: CONFIRMED ABSENT — manual launch order documented** [KNOWN]

Root `package.json` scripts: `test`, `typecheck`, `build` only. No `dev:all`. Workstation `dev` script = `pnpm build && electron dist/main/main.js` (full build + launch, not hot-reload).

Manual launch order (3 processes):
```
Terminal 1: pnpm --filter dispatch-daemon dev           ← skipped (daemon already live per Gate 4)
Terminal 2: pnpm --filter dispatch-web dev              ← skipped (Gate 2 Option A)
Terminal 3: pnpm --filter dispatch-workstation dev      ← full build + electron
```

### Gate 4 — Port 7878 collision check

**Outcome: PORT OCCUPIED — daemon already alive, favorable** [KNOWN]

```
lsof -nP -iTCP:7878 -sTCP:LISTEN:
node 92700 joshuatseppich  25u  IPv4 …  TCP 127.0.0.1:7878 (LISTEN)
Process: node --import tsx .../dispatch-daemon/src/index.ts
```

Daemon running since Tue 01PM (2026-05-05). Operator arbitrated Option (α): use existing daemon, do NOT kill for fresh launch. Finding #70 closed by observation: no collision for workstation launch; daemon is the intended listener.

### Gate 5 — Auth bridge state

**Outcome: OPEN FINDING — operator arbitrated Option (c), conditional** [KNOWN]

Finding #71 (MB-F-DISPATCH-WEB-AUTH-PERSISTENCE, Tier 1) active and undocumented with any workaround. Two auth schemes with no bridge: workstation main process uses `~/.foxworks-dispatch/token` via `X-Conductor-Token` header; dispatch-web webview uses cookie/session auth scheme.

Operator arbitration: proceed with Option (c) — check if accumulated Electron session cookie state sidesteps the banner before applying manual login workaround. If banner present, walk manual login flow and document. **Phase B did not execute, so Gate 5 conditional was never evaluated.** Cookie state unknown at close. [KNOWN — gap]

### Gate 6 — which claude vs ALLOWLIST_PATH

**Outcome: TRIP-WIRE ACTIVE — manual spawn path ratified** [KNOWN]

```
which claude → /Users/joshuatseppich/.local/bin/claude
ALLOWLIST_PATH → /opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/local/sbin:/usr/bin:/bin:/usr/sbin:/sbin
```

`/Users/joshuatseppich/.local/bin` is NOT in `ALLOWLIST_PATH`. Reproduces Finding #72 scenario exactly. Spawn-from-UI would silently orphan sessions.

Operator arbitration: manual spawn via absolute path. `spawn-env.ts` NOT modified. Phase C spawn command:
```bash
tmux new-session -d -s __orchestrator_active -c <repoPath> \
  "/Users/joshuatseppich/.local/bin/claude --dangerously-skip-permissions \
  --model claude-sonnet-4-6 \
  --append-system-prompt \"$(cat packages/dispatch-workstation/src/main/hso-system-prompts/orchestrator.md)\""
```
Phase C was not reached; spawn not executed in this session.

---

## §3 — Phase B Closure Rationale

Phase B (smoke test) did not execute. Three compounding factors:

**Factor 1 — Electron process exit overnight.** Electron PID 77297, launched 2026-05-09 15:22, was not found at 2026-05-10 resume. [KNOWN] No surviving dispatch-workstation Electron process by any ps pattern. Screenshot at resume showed Claude desktop app; dispatch-workstation window absent. Cause of exit: unknown — operator close, crash, or system event during the ~17-hour pause gap. A fresh launch (option A or B) was available but operator chose option C.

**Factor 2 — Audit doc supersedes Phase B scope.** `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` (commit `9e72e8f`) covers the shipped code at higher resolution than Phase B visual observation would have: 122 elements classified across 6 dimensions with file:line citations, gap analysis, and two new followups filed. Phase B's observation checklist (kanban renders / chat-shell renders / console panel renders / auth bridge / console errors) would duplicate findings already captured more precisely in the audit doc, without adding new evidence.

**Factor 3 — Evidence continuity broken.** Visual observation cannot validate the specific Electron instance whose Phase A infrastructure was traced. Any new launch would be a different Electron instance, disconnecting Phase A evidence from Phase B evidence and producing a partially-valid dogfood run rather than a continuous trace.

**Conclusion:** Closing under option (C) is the correct discipline per dispatch §7 ("If energy or context budget runs short mid-session, halt cleanly at any phase boundary… Do NOT push through a degraded run for ship-gate measurement; failed criteria from a degraded run are not ship-blocking, but they corrupt the ship-gate evidence base.").

---

## §4 — Outcome Classification

**Classification: "Capability enabled with known limitations."**

Phase A gates verified that the daemon/process infrastructure is sound: deps materialized, daemon alive and healthy, build artifacts produced in ~60s, Electron app launched. The Phase A infrastructure represents the pre-condition for HSO dogfood. Phase B through Phase D were not executed.

**NOT classified as:**
- "Improved" — no behavioral improvement was validated or measured.
- "No regression" — regression evidence not collected (Phase B did not execute).
- "No improvement + structural finding" — not applicable; this is validation, not build.

**Honest framing:** Phase A complete; Phase B deferred and superseded by audit. Phase C/D (PTY orchestration test, sustained loop) remain pending for a subsequent session. The audit doc + Phase A together cover the infrastructure readiness portion of the original session intent.

---

## §5 — New Findings

### MB-F-DOGFOOD-LONG-PAUSE-PROCESS-LIVENESS

**Tier 3 — methodology followup.**

**Symptom.** Session paused at HALT-B-OBSERVATION-PENDING on 2026-05-09. Resumed on 2026-05-10 (~17-hour gap). Operator message assumed Electron PID 77297 still alive ("confirm Electron is still running"). PID not found at resume; visual observation gate could not proceed.

**Root cause.** Dogfood dispatch and session methodology treat infrastructure as stable across halt gates within a session. For intra-session halts of minutes to hours, this is reasonable. For overnight pauses, interactive processes (Electron, dev servers) routinely exit. The resume scope ack did not include a "re-verify process liveness" step.

**Impact.** Operator and CC entered Phase B observation scope under a false assumption; finding took one ps check to surface, but the assumption cost a scope change and session closure.

**Closure path.** Amend dogfood dispatch template §3.2 Phase B preamble: when resuming after any pause ≥ 2 hours, add a mandatory "re-verify process liveness" step before Phase B scope ack:
```
lsof -nP -iTCP:7878 -sTCP:LISTEN    # daemon alive?
ps -p <electron_pid>                  # workstation alive?
```
If either is absent, re-launch before proceeding. This adds ~30 seconds and prevents false-assumption scope entry. Tier 3 — methodology quality-of-life. The observation here (PID not found) is the first instance; worth encoding as a dispatch discipline checkpoint.

**Confidence:** KNOWN (observation-driven; single instance).

**Discoverability:** this doc §5 + v3.5 dogfood validation dispatch `~/Downloads/V35-DOGFOOD-VALIDATION-DISPATCH.md` §3.2 (amend at next dispatch authoring).

---

### Phase A pre-existing session list observation

Not filed as a new followup — pre-existing state. Noted for completeness: 101 sessions in daemon at Phase A check (96 killed, 5 armed/idle: `mb-t04-test-session`, `probe-94-02-auto-movig57e-6k83`, `probe-94-03-ask-movig43z-ipdv`, `probe-mb-t05-mou5r2yl-t171`, `try it`). No `__orchestrator_active` session. State is accumulated prior dogfood / test residue; daemon running since 2026-05-05. Not a finding; documented for session completeness.

---

## §6 — Cross-References

| Document | Path | SHA | Notes |
|----------|------|-----|-------|
| Wireframe-vs-shipped audit | `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` | `9e72e8f` | Supersedes Phase B scope; 122 elements, 6 dimensions |
| Post-audit execution plan | `docs/coordination/v35-post-audit-plan-2026-05-10.md` | `18be117` | 8 sections, 4 operator-only arbitration gates, ship-gate matrix |
| HSO BUILD doc | `docs/build-docs/CONDUCTOR_V3.5_BUILD.md` | — | Phase A dogfood scope reference; §4.3 dogfood validation gate |
| Finding #71 (auth bridge) | `docs/cairn-findings.md:623` | — | MB-F-DISPATCH-WEB-AUTH-PERSISTENCE; Tier 1; gate 5 blocker |
| Finding #72 (PATH allowlist) | `docs/cairn-findings.md:643` | — | MB-F-MB-T05-PATH-ALLOWLIST-CLAUDE-RESOLUTION; Tier 1; gate 6 trip-wire |
| Dogfood dispatch | `~/Downloads/V35-DOGFOOD-VALIDATION-DISPATCH.md` | — | Operator-side; not in repo |

---

## §7 — Ship-Gate Impact

**v3.5 ship-gate Q-V35-7(a) dogfood criteria: NOT YET SATISFIED.**

This session was infrastructure dogfood (Phase A verification only). The Q-V35-7(a) criteria require:
- 60-minute continuous HSO uptime
- ≥2 handoffs measured (HANDOFF-EMITTED → standby promoted → work continues)
- ≥80% action variant fire-correctness
- Routine state transitions without operator intervention

None of these criteria were evaluated. Phases C (PTY orchestration test) and D (sustained loop) were not reached.

**HSO dogfood window per BUILD doc §4.3 remains pending.** Prerequisites for a valid HSO dogfood session:
1. MB-T41 system prompt finalized (operator-arbitrated)
2. HSO Wave 1 wiring complete
3. Dispatch re-issued with fresh Electron instance confirmed at session start
4. Session run without overnight pauses (or with explicit process-liveness re-verification at resume per §5 finding)

**v3.5 ship recommendation:** Hold. Phase A infrastructure is sound; audit + post-audit plan cover shipped code readiness. But Q-V35-7(a) HSO uptime evidence is absent. Ship decision deferred to a subsequent dogfood session that completes Phase C/D.
