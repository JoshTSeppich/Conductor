# Batch 6 Coordination Scaffold

**Batch:** 6 — Wiring batch (8 Tier-1 followups, 3 parallel CC sessions)

**Purpose:** Foundation work prerequisite to MB-T09–T13 (Conductor v3.0 re-scope autonomy layer). All 8 followups close production-wiring gaps surfaced by 2026-05-03 dogfood test.

**Coordination model:** Three parallel Claude Code sessions with worktree-per-session pattern (Round 1 + Batch 5 KNOWN-validated). Per-session coord file in `docs/cairn-coordination/batch-6/`. Operator-relay arbitration on cross-session coordination questions.

---

## §0 — Pre-flight

Before launching any session:

1. **Operator commit the re-scope source-of-truth doc** to `docs/build-docs/CONDUCTOR_V3_RESCOPE.md`. Single commit, operator-authorship, message body summarizes §7 arbitration outcomes.
2. **Operator file the 9 dogfood findings** from 2026-05-03 (cairn finding entries #67–#75) so the followup IDs in this batch resolve to filed-followup records, not in-conversation references.
3. **Worktree creation** for each session:
   ```
   git worktree add ~/Desktop/Automata/foxworks-worktrees/batch-6-session-A session-A/wiring-spawn
   git worktree add ~/Desktop/Automata/foxworks-worktrees/batch-6-session-B session-B/wiring-cards
   git worktree add ~/Desktop/Automata/foxworks-worktrees/batch-6-session-C session-C/wiring-mounts
   ```
4. **Coord file scaffolding** — operator creates the three per-session coord files (templated below) before sessions start, so each session's first commit can append session-start.

---

## §1 — Session split

### Session A — wiring-spawn
**Owner:** spawn pipeline production correctness.
**Followups:**
- MB-F-MB-T05-PATH-ALLOWLIST-CLAUDE-RESOLUTION (validated fix from dogfood; absolute-path resolution via `which claude` at startup)
- MB-F-MB-T05-POST-SPAWN-LIVENESS-CHECK (post-spawn `tmux has-session` verification)
- MB-F-MB-T05-SPIKE-ENVIRONMENT-VALIDATION (methodology finding; ADR amendment only, no code)

**Files owned:**
- packages/dispatch-workstation/src/main/spawn-env.ts
- packages/dispatch-workstation/src/main/spawn-handler.ts
- packages/dispatch-workstation/src/main/spawn-ipc.ts
- packages/dispatch-workstation/test/unit/wiring-spawn/* (new test directory)
- docs/adr/MB-S02-spike-environment-validation-amendment.md (new ADR amendment)

**Files explicitly NOT owned:**
- packages/dispatch-workstation/src/main/main.ts (no edits — Session A's changes are dependency-injection only, no new register-handler call needed)

### Session B — wiring-cards
**Owner:** MB-T07 orchestrator-card production wiring.
**Followups:**
- MB-F-MB-T07-CARD-BRIDGE-PRELOAD-WIRING (webview preload for card-bridge)
- MB-F-MB-T07-MAIN-IPC-WIRING (registerCardIpcHandlers in main.ts)
- MB-F-MB-T07-DAEMON-AUDIT-CLIENT (HttpDaemonClient.postAudit)
- MB-F-MB-T07-CARD-CONTEXT-CACHE (production CardContextLookup)
- MB-F-MB-T07-ORCHESTRATOR-CARD-EMITTER (parses OrchestratorOutputSchema from coarchitect stream)

**Files owned:**
- packages/dispatch-workstation/src/main/card-ipc.ts (existing, extended)
- packages/dispatch-workstation/src/main/card-bridge.ts (new — webview preload pattern)
- packages/dispatch-workstation/src/main/card-context-cache.ts (new)
- packages/dispatch-workstation/src/main/coarchitect-ipc.ts (extended — emitter integration)
- packages/dispatch-workstation/src/main/http-daemon-client.ts (extended — postAudit method)
- packages/dispatch-workstation/scripts/build-card-bridge.mjs (new)
- packages/dispatch-workstation/test/unit/wiring-cards/* (new test directory)

**Files SHARED with Session C (per main.ts coord contract §2):**
- packages/dispatch-workstation/src/main/main.ts (Session B owns the `// === MB-T07 card wiring ===` region per §2)
- packages/dispatch-workstation/src/workstation-shell.html (Session B adds `<webview preload="card-bridge.cjs">` attribute; Session C adds `#console-tile-grid` region — disjoint)

### Session C — wiring-mounts
**Owner:** Renderer mounting (onboarding modal + console panel).
**Followups:**
- MB-F-MB-T08-ONBOARDING-RENDERER-MOUNT (build-onboarding.mjs + first-launch mount)
- MB-F-CONSOLE-T03-SHELL-INTEGRATION (console panel mounted in workstation shell, not menu)

**Files owned:**
- packages/dispatch-workstation/src/onboarding/* (existing, mount integration extended)
- packages/dispatch-workstation/src/console-panel/* (existing, repurposed mount)
- packages/dispatch-workstation/scripts/build-onboarding.mjs (new)
- packages/dispatch-workstation/onboarding.html (new)
- packages/dispatch-workstation/console-tile.html (new — IF console panel needs separate HTML; otherwise inlined in shell)
- packages/dispatch-workstation/src/main/onboarding-mount.ts (new — first-launch detector + mount trigger)
- packages/dispatch-workstation/src/main/console-mount.ts (new — shell-region mount logic)
- packages/dispatch-workstation/test/unit/wiring-mounts/* (new test directory)

**Files SHARED with Session B (per main.ts coord contract §2):**
- packages/dispatch-workstation/src/main/main.ts (Session C owns the `// === Onboarding mount ===` and `// === Console mount ===` regions per §2)
- packages/dispatch-workstation/src/workstation-shell.html (Session C adds `#console-tile-grid` region; Session B adds `<webview preload>` attribute — disjoint)

---

## §2 — main.ts coord contract

### §2.1 Line-range ownership

main.ts has a known structure (per spawn-ipc.ts pattern + console-ipc.ts pattern visible in the codebase):

```typescript
// imports
// app.whenReady() handler
//   await mainWindow.loadFile(...)
//   registerIpcHandlers()        // existing — MB-T01 base
//   registerSpawnIpcHandlers()   // existing — MB-T05
//   registerConsoleIpcHandlers() // existing — CONSOLE-T01
//   refreshConsoleMenu([])       // existing — CONSOLE-T03 menu
//   ...
// app.on('window-all-closed', ...)
```

Session B adds (in this exact line region, marked by sentinel comment):
```typescript
// === MB-T07 card wiring (Session B / Batch 6 / wiring-cards) ===
registerCardIpcHandlers({ controller: ... });
// === end MB-T07 card wiring ===
```

Session C adds (in this exact line region, marked by sentinel comment):
```typescript
// === Onboarding mount (Session C / Batch 6 / wiring-mounts) ===
const onboardingNeeded = await checkFirstLaunch();
if (onboardingNeeded) await mountOnboarding(mainWindow);
// === end Onboarding mount ===

// === Console mount (Session C / Batch 6 / wiring-mounts) ===
mountConsoleTileGrid(mainWindow);
// === end Console mount ===
```

### §2.2 Commit ordering

**Session B commits its main.ts edit FIRST.** Reasoning: B's edit is a single `register*` call inside the existing register-handler block, low risk of merging contention. C's edit is two new `mount*` blocks, larger surface, lands second to merge cleanly on top of B's commit.

Operator-relay enforces commit ordering by gating Session C's `git push origin session-C/wiring-mounts` until Session B has pushed `session-B/wiring-cards` and operator has merged session-B/wiring-cards to main. Session C then rebases on the new main before pushing.

### §2.3 Per-path git add (mandatory)

Both B and C use `git add <explicit path>` for every staged file. Never `git add -A`. Per project instructions §3.4 + Round 1 Incident 8 evidence.

Pre-commit territory check: `git status --short` before staging in any commit. Post-commit territory verification: `git log -1 --stat`.

### §2.4 Conflict response

If a session detects unexpected territory in `git status --short` (file owned by another session showing as modified or staged), session HALTS, surfaces to operator-relay with `git status` output + `git log -1 --stat` of the suspect commit, awaits arbitration. Per Round 1 drift-recovery 8-step shape.

---

## §3 — Coord file template

Each session writes to `docs/cairn-coordination/batch-6/session-{A,B,C}-wiring-{spawn,cards,mounts}.md`.

Template:
```markdown
# Batch 6 — Session {X} — wiring-{name}

## §0 Staging verification (cross-session pre-flight)
- [ ] Operator confirmed re-scope doc landed in /mnt/project/CONDUCTOR_V3_RESCOPE.md
- [ ] Operator confirmed all 9 dogfood findings filed (#67–#75)
- [ ] Worktree at ~/Desktop/Automata/foxworks-worktrees/batch-6-session-{X} on branch session-{X}/wiring-{name}
- [ ] origin/main fetched, branch up-to-date with main
- [ ] Per-path git add discipline confirmed; git add -A not used in any commit

## §1 Followups owned (per coordination scaffold §1)
{list followups owned by this session}

## §2 Files owned + files NOT owned
{copy from coordination scaffold §1 entry}

## §3 main.ts coord contract status (Sessions B and C only)
{N/A for Session A; B and C confirm §2 of coordination scaffold understood}

## §4 Cross-session findings
{populated as work progresses; observations beyond scope routed here per project instructions §3.6}

## §5 Session-end summary
{populated at session end with final commit list, test counts, followups filed, halt-discipline events}
```

---

## §4 — Acceptance gates per session

Each session ships when:
- All owned followups have ticket bodies in V3_TICKETS.md or docs/build-docs/V3_TICKETS_BATCH_6.md (per operator preference)
- All RED tests fail before GREEN; commit grammar holds (`red:`, `green:`, `spike:`, `contract:`, `refactor:`)
- Self-check block in every commit body per CONDUCTOR_API_CONTRACT.md §10.5 (9 questions)
- KNOWN/MODELED/SPECULATIVE labels on every factual claim in commit bodies
- Per-commit-push discipline: commit → push → verify push succeeded (git log --oneline origin/main..HEAD returns empty)
- Coord file populated through §5 session-end summary

Operator-merge sequence:
1. Session A merges first (no main.ts contention)
2. Session B merges second (main.ts edit lands)
3. Session C merges third (rebases on session-B-landed main, then merges)

---

## §5 — Estimated wall-clock

Session A: 1 session, ~2-3 days operator wall-clock
Session B: 1 session, ~3-5 days operator wall-clock (5 followups, biggest)
Session C: 1 session, ~2-3 days operator wall-clock

Parallel execution: ~3-5 days operator wall-clock for all three (bounded by Session B + commit-ordering wait for Session C).

---

## §6 — Post-batch state

After all three sessions merge to main:
- All 8 Tier-1 wiring followups closed
- Production renderer surfaces (onboarding modal, console panel in shell, orchestrator cards in webview) operative
- Spawn pipeline robust (PATH-resolution + post-spawn liveness check)
- 0 CC-modified frozen contracts
- Audit trail of all wiring decisions in commit bodies
- Foundation ready for batch 7 (MB-T09 — first re-scope ticket)

Then operator dogfood validation: launch workstation, exercise full v3.0-as-currently-scoped flow end-to-end, confirm wiring fixes work in the running app, no new dogfood findings beyond what batch 7-11 will close.
