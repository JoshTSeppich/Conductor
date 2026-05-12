# OPERATOR DIRECTIVE — FULL BUILD MODE TOWARD WIREFRAME PARITY

**Issued:** 2026-05-11
**Target:** orchestrator-2026-05-11-1257 (gen-3) or successor
**Operator:** Joshua Seppich
**Authorization scope:** Strict-cairn methodology at maximum parallel intensity, autonomous wireframe-reconciliation execution

---

## §0 — REFRAMING

The canonical wireframe target is the operator-screenshot reference uploaded 2026-05-11T21:00 (operator-side; persist to `docs/coordination/wireframe-target-2026-05-11.png` if not already in repo).

The target shows a fully-populated session orchestration workspace. Today's audit-named ticket set (Wave B + Wave C #3 + Wave C #5) shipped structural surface scaffolding (~15-25% wireframe-parity estimate). Substantial additional work is needed to reach the wireframe target.

This dispatch authorizes scope expansion for **autonomous wireframe-reconciliation execution** under strict-cairn methodology. The substrate has been validated through ~9 hours of Round 8 cairn-under-stress evidence today. Time to use it at full intensity.

---

## §1 — WIREFRAME ELEMENT INVENTORY (canonical reference)

### Left rail — Session tile list

Per tile:
- Branch name (e.g., `feat/spawn-pool`)
- Model badge: `S4.6` / `04.6` / `04.7·1M` / `H` (Haiku) / etc.
- Ctx N% (token consumption)
- Uptime (`07:14`, `23:41`, etc.)
- Status indicator: green (active/healthy), amber (warning), red (error/failure), grey (paused/idle)
- Selected tile visually highlighted

Filter bar:
- `All status` dropdown
- `All repos` dropdown
- `Clear` button

### Right pane — Focused session terminal stream

Header bar:
- `<branch> @ <branch>` (session name + branch)
- `ctx N%` token consumption
- Uptime
- Plan name (e.g., `max-plan`)

Body:
- Live terminal output from focused CC session (tail of stdout/stderr)
- Tool invocation indicators: `Cooking 12m 04s · 4 tools queued`, `Bash: pnpm tsc --noEmit`, `Read: packages/.../session.ts`, `Edit packages/.../spawn-pool.ts (+142 -8)`
- Auto-scroll with operator-pause support
- "next tool" preview line

Bottom action bar (right):
- `kill · diff · merge · focus`
- `bypass-perms` indicator (red triangle warning)
- `dispatch-workstation` source label

### Bottom rail — Conductor controls

- `Conductor` brand
- Tab switcher: `Chat` (dark/active) / `Commits` / `BUILD.md`
- `Auto` / `Ask` mode toggle (Auto highlighted = autonomous, Ask = operator-in-loop)
- `bypass perms` indicator
- `max-parallel · 16/16` counter
- `conductor api · $0.42 today` cost meter
- `Max plan resets in 2h 47m` plan tracker (with ~38% progress ring)

### Bottom status line

- Avatar `C` (Claude indicator)
- BUILD.md status: `Loaded BUILD.md (rev <sha>) — parsed N tasks, M blocked, K ready. Spawning K sessions now, max-parallel.`

---

## §2 — WORKSTREAM ENUMERATION

The remaining wireframe-parity work decomposes into approximately the following workstreams. Each likely produces 1-3 Tier 1 tickets under audit-style scoping.

### T1 — Session data flow (left rail population)

- Real `TileGridSessionEntry[]` stream from daemon → SessionList (currently empty-stub per Q-WB10-B=α)
- Per-tile model badge population
- Per-tile status indicator wiring (green/amber/red/grey based on session-state.md or daemon signal)
- Per-tile uptime + ctx% real-data wiring (partially shipped Wave C #5)
- Filter dropdowns → actual filter logic
- Tile selection persistence across re-renders

### T2 — Focused session terminal stream (right pane)

- Live PTY stream rendering in DetailPane (currently empty no-selection placeholder)
- Header text with branch/ctx/uptime/plan
- Tool invocation indicators (Cooking, Bash, Read, Edit) — likely parse from CC stdout
- Cooking timer + tool-queue counter
- Auto-scroll with operator-pause

### T3 — Action bar (kill/diff/merge/focus)

- `kill` action wiring (new IPC: `workstation:kill-session` — requires contract amendment per §3.4)
- `diff` action wiring (`frame-c:diff` shipped in 0f0e762; needs UI button + result rendering)
- `merge` action wiring (`frame-c:merge` shipped; needs UI button + conflict UX inline-banner per Sub-Q-MBTWBDPFA-C=α)
- `focus` action wiring (`frame-c:focus` shipped; needs UI button + writeFrameMode('A') + scroll)

### T4 — Bottom rail (Conductor controls)

- Tab switcher (Chat/Commits/BUILD.md)
- Tab content panes (Chat exists; Commits + BUILD.md need new surfaces)
- Auto/Ask mode toggle
- bypass-perms indicator
- max-parallel counter
- Cost meter ($/day tracker)
- Plan timer (reset countdown)

### T5 — BUILD.md driven dispatch

- BUILD.md parser
- Auto-dispatch logic ("Spawning K sessions now")
- Loaded-status indicator
- Task-count display
- Blocked/Ready breakdown

### T6 — Methodology infrastructure (per MB-F-METHODOLOGY-RUNTIME-VERIFICATION-GAP)

- Build-freshness gate (auto-rebuild before auto-ack §C)
- Bundle-inclusion verification (grep fingerprint)
- Headless electron + screenshot pipeline
- DOM-based runtime probes
- Visual-diff against wireframe target

### T7 — Visual polish

- CSS for tile-grid layout matching wireframe (sticky-note paper aesthetic per screenshot)
- Tile status indicator colors + dot rendering
- Model badge color coding
- Filter dropdown styling
- Bottom rail layout precision

---

## §3 — DISPATCH AUTHORITY (operator-arbitrated, effective immediately)

### §3.1 — Strict-cairn methodology preserved

All §A-H from prior scope-expansion 2026-05-11T13:00 remains operative:
- Sub-session spawn/kill autonomous (§A)
- 90% auto-rotation with pre-kill checklist (§B)
- Auto-ack envelope §C verification-gated, not relaxed
- 4-6 concurrent sub-sessions target (§D)
- State-instance update cadence 60min (§E)
- Async operator interaction (§F)
- Unchanged safety rails (§G)
- Methodology-incident reporting (§H)

**This is NOT speed over correctness.** This is rigor at maximum parallel intensity. Strict-cairn discipline holds at every commit, every dispatch, every kill, every spawn.

### §3.2 — Operator-arbitrated authorization to author tickets autonomously

Per CLAUDE.md §3.4 mechanical-translation framing: operator pre-arbitrates that the T1-T7 workstreams above are the canonical wireframe-parity scope. Sub-sessions may draft ticket bodies as operator-supervised mechanical translation from this dispatch document.

**Each ticket body draft requires:** HALT-TICKET-BODY-PRE-COMMIT for operator review before sub-session begins WB ladder execution. Operator authority over methodology surface preserved at ticket-body-authoring gate.

After operator ack of ticket body: sub-session proceeds WB ladder autonomously under §C auto-ack envelope.

### §3.3 — Frozen contracts unchanged

WORKSTATION_CONTRACT.md §6 amendments require operator arbitration. New IPC methods needed:
- `workstation:kill-session` (T3 workstream) — requires arbitration
- `workstation:read-build-md` (T5 workstream) — requires arbitration
- `workstation:cost-meter` (T4 workstream) — requires arbitration
- Potentially others as workstreams develop

Each new IPC method = new contract-amendment cycle. Pattern established 2026-05-11: sub-session drafts amendment text under §3.4; operator HALT-PRE-COMMIT review of exact language; commit lands with operator-supervised authorship.

### §3.4 — Methodology infrastructure parallel execution

T6 workstream (methodology runtime-verification) runs in PARALLEL with T1-T5 (wireframe surface work).

Rationale: Building visible UI without runtime-verification gates means continuing the pattern that produced today's runtime-staleness discovery. Methodology infrastructure closes that gap concurrently with the surface work it would otherwise hide.

Specifically:
- T6 build-freshness gate ships → next ticket cycle includes auto-rebuild
- T6 bundle-inclusion verification ships → catches future esbuild-auto-discovery failure modes
- T6 headless screenshot pipeline ships → CC includes screenshot path in commit body; operator can scroll through visual history without launching electron
- T6 DOM-based runtime probes ship → CI catches "shipped but doesn't render" in tests, not in operator screenshots

### §3.5 — Visual-comparison gate addition to auto-ack envelope §C

Per closure-path-γ of MB-F-WIREFRAME-PARITY-SCOPE-UNDERESTIMATED filing, add to auto-ack §C:

`green:wiring` AUTO-ACK if all current §C conditions pass AND ONE of:
- Ticket body explicitly notes "structural-only, no visual diff" (e.g., T6 methodology work, non-UI tickets)
- Headless screenshot generated; commit body cites screenshot path; visual-diff against prior commit shows expected change

`refactor:` and `docs:` unchanged.

Until T6 headless screenshot pipeline ships, this gate uses operator-manual-screenshot as the fallback. Operator may request screenshot at any HALT-PRE-COMMIT gate.

---

## §4 — EXECUTION ORDER

### Phase 0 — Immediate (current waves complete)

1. **Wave B WB10 lands** (T4-successor; if not yet committed)
2. **Wave C #3 closes** (T3 WB5+ through WB-final)
3. **Wave C #5 WB7 docs lands** (T2-successor; if not yet committed)
4. **Tier 1 filing: MB-F-WIREFRAME-PARITY-SCOPE-UNDERESTIMATED** (orchestrator-mediated, atomic-chain commit)
5. **Manual rebuild + relaunch + screenshot verification of current state** (operator)
6. **State-instance update** reflecting Phase 0 close

### Phase 1 — Ticket authoring (sub-sessions draft, operator acks)

Spawn ticket-authoring sub-sessions per workstream. Each session:
- Reads §1 wireframe element inventory + §2 workstream enumeration
- Reads relevant audit doc sections + existing source
- Drafts ticket body following BUILD-md-spec.md schema
- Surfaces HALT-TICKET-BODY-PRE-COMMIT with draft for operator review

**Parallel dispatch:**
- Sub-session 1: T1 ticket body draft (Session data flow)
- Sub-session 2: T2 ticket body draft (Terminal stream)
- Sub-session 3: T3 ticket body draft (Action bar — note: requires kill-session IPC amendment scoping)
- Sub-session 4: T6-α + T6-β ticket body draft (Build-freshness + bundle-inclusion — methodology infra)

T4 (Bottom rail), T5 (BUILD.md), T7 (Visual polish) queued for Phase 1 second batch after first batch lands.

### Phase 2 — Ticket execution (sub-sessions execute, auto-ack landing)

After each ticket body acked: sub-session begins WB ladder. Auto-ack envelope §C operative. HALT only on:
- Contract amendments (new IPC methods)
- Tier 1 arbitrations
- Anti-fabrication concerns
- Test failures outside baseline
- Cross-session conflicts
- Visual-diff anomalies (operator-screenshot gate)

### Phase 3 — Integration + verification

After T1-T7 first batch lands:
- Operator rebuild + relaunch + screenshot
- Compare to wireframe target image
- Identify residual gaps
- Phase 4 ticket scoping if needed

### Phase 4 — Iteration

Repeat Phase 1-3 until wireframe-parity verified against canonical target image.

---

## §5 — SUB-SESSION COORDINATION

### §5.1 — Concurrent session target

4-6 sub-sessions running in parallel. Path-disjoint workstream allocation:
- T1 + T2 path-overlap on tile-grid-app.tsx state stream → coordinate via coord notes
- T3 + T4 path-overlap on bottom rail / action bar layout → coordinate
- T6 methodology infra is path-disjoint from T1-T5 → fully parallel

### §5.2 — Rotation pattern

Per §B: rotate sub-sessions at 90% context. T3-successor pattern established. Each rotation:
- Pre-kill checklist (5 conditions)
- Self-prepared continuation brief (pattern from T4 rotation)
- subsession-rotation-log.md entry
- Cross-session methodology propagation via coord notes

### §5.3 — Operator interaction cadence

Per §F: ASYNC.

**HALT (operator-required):**
- Contract amendments (new IPC, frozen contract changes)
- Tier 1 arbitrations
- Hard-escalation triggers (auto-ack envelope conditions fail)
- Anti-fabrication concerns
- Test failures outside baseline
- Cross-session conflicts
- Ticket body authoring review (per §3.2)
- Visual-diff anomalies post-WB10-style commits

**ANNOUNCEMENT (operator-aware, no pause):**
- Spawns / kills / rotations
- Gate completions
- Commit landings (with §C verification summary)
- Tier 2/3 followup filings
- Methodology incidents observed

### §5.4 — Methodology incident reporting

Per §H: stress regime makes new findings Tier 1 by default. Round 8 of cairn-under-stress continues. Round 9 begins when this dispatch executes.

Document incidents in real-time. File as Tier 1 in current cycle. Cross-session methodology propagation via coord notes.

---

## §6 — TIER 1 FILING REQUIRED NOW

Before sub-session dispatch begins: file MB-F-WIREFRAME-PARITY-SCOPE-UNDERESTIMATED Tier 1.

Content:

```
MB-F-WIREFRAME-PARITY-SCOPE-UNDERESTIMATED — Tier 1

Description: 2026-05-09 audit dimensional taxonomy identified 3 named architectural gaps (Dim 1 layout, Dim 5 data-model, Dim 2 visual-separation) and produced 5 Tier 1 reconciliation tickets. Operator visual-verification 2026-05-11T21:00 against canonical wireframe target image revealed scope significantly under-estimated:

- Audit-named ticket set targets structural-surface-existence (mount factories, component scaffolding, IPC contracts)
- Wireframe target requires data-flow integration (real session data flowing into SessionList; live terminal stream rendering; cost tracking; plan tracking; BUILD.md driven dispatch; mode toggles wired through)
- Estimated remaining work: 7+ workstreams (T1-T7 per dispatch §2); each producing 1-3 Tier 1 tickets
- Estimated calendar: 2-4 weeks at current cadence under maximum parallel intensity

Implication: The 5-ticket set authored 2026-05-11 morning was scoped against audit gaps, NOT against direct wireframe visual comparison. Post-current-waves, second-order ticket roadmap needs authoring with wireframe-image as the canonical reference, not the audit dimensions alone.

Closure paths:
(α) Author second-order Tier 1 ticket roadmap with wireframe.jsx (or canonical image) as direct source-of-truth; one ticket per major UI feature visible in wireframe (T1-T7 workstreams enumerated in full-build-mode dispatch)
(β) Update 2026-05-09 audit doc with wireframe-image-comparison evidence; reclassify completion percentages
(γ) Add visual-comparison gate to methodology — every ticket-completion requires wireframe-vs-shipped screenshot diff (or headless equivalent post-T6)

Discoverability: This row + the wireframe canonical image (operator's screenshot session 2026-05-11) + cross-references to:
- MB-F-WIREFRAME-VISUAL-VERIFICATION-GAP (64d9249)
- MB-F-RUNTIME-BUILD-STALENESS-INVISIBLE-PROGRESS (11f6f29)
- MB-F-METHODOLOGY-RUNTIME-VERIFICATION-GAP (230cb6c)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

Atomic-chain commit. Pathspec-restricted to docs/FOLLOWUPS.md.

---

## §7 — UNCHANGED SAFETY RAILS

- Frozen contracts: CONDUCTOR_API_CONTRACT, REGISTRY.md §2, MB-T41 content, v3 schema, ORCHESTRATOR_STATE_CONTRACT, WORKSTATION_CONTRACT.md §6 — operator-territory authoring
- Tier 1 followup filings: always file
- Cross-session conflicts: ALWAYS surface
- Anti-fabrication discipline: ALWAYS enforce
- Self-invocation trust gate: operator acks HALT-ORCHESTRATOR-N-LOADED on successor
- Q-V35-7(a) + MB-T41 revision: operator-only
- Spike-before-production-code per §3.5
- Per-commit-push discipline + per-path git add
- Per-WB Q1-Q9 self-check in commit body
- Halt discipline (§3.7) at every HALT

---

## §8 — STATE-INSTANCE UPDATE REQUIRED

Update `docs/coordination/orchestrator-state-current.md` reflecting:

- §1 active workstream: "Full build mode toward wireframe parity (T1-T7 workstreams)"
- §2 frozen surfaces unchanged
- §5 sub-session table: update with all currently-alive sub-sessions
- §6 open_tier1: add MB-F-WIREFRAME-PARITY-SCOPE-UNDERESTIMATED row
- §7 W-gates: add W6 (Phase 1 ticket-bodies acked) + W7 (Phase 2 first-batch land) + W8 (Phase 3 integration verify) + W9 (wireframe-parity achieved)
- §9 next_actions: prioritized list per §4 execution order

Commit + push pathspec-restricted. §C self-check.

---

## §9 — PROCEED

Execute Phase 0 first (current waves complete + Tier 1 filing). Then Phase 1 ticket authoring with parallel sub-session dispatch.

Surface ANNOUNCEMENT after each Phase 0 step. Surface HALT-TICKET-BODY-PRE-COMMIT for each Phase 1 draft.

Operator is async-available. Methodology incidents file as Tier 1 in current cycle.

Round 9 of cairn-under-stress begins now.

PROCEED.
