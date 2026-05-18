# Scope arbitration — Conductor V_MVP (2026-05-17)

**Operator:** Joshua Seppich
**Subject:** Resolution of 7 open scope questions from `docs/coordination/conductor-v-mvp-design-audit-2026-05-17.md` (commit `a20d0d4`)
**Authority:** Operator-arbitrated. §5.4, §5.6, §5.7 decided under best-judgment authorization per project-instructions §2.2.

---

## §1 Locked decisions

| Q | Subject | Decision |
|---|---|---|
| §5.1 | Topbar territory | **Extend Wave-1** |
| §5.2 | OrchestratorStrip territory | **Extend Wave-1** (same owner as focus pane) |
| §5.3 | ConductorChat | **New `src/conductor-chat/` replacing `src/chat-shell/`** |
| §5.4 | TweaksPanel | **Subset — maxSlots only as production concurrency cap; strip rest** (best-judgment) |
| §5.5 | Screenshots | **Normative — pixel-perfect oracle** |
| §5.6 | W1 body styling | **Hybrid — banner+cursor+line-class in W1; paneIn/paneOut animation in follow-on** (best-judgment) |
| §5.7 | W2 mini-tile mode | **Follow-on wave W6-mini-tile when capacity story needs it** (best-judgment) |

---

## §2 Cascade implications (binding)

### §2.1 Wave-1 territory expansion

Wave-1 (orchestrator-focus-pane) territory expands to include:
- Topbar (36px brand+counts+budget+env strip)
- OrchestratorStrip (segmented progress bar + 64-slot grid + rate/ETA stats)
- TmuxPane (big) body styling — banner ASCII box (ORCH_BANNER), line-class colors (sys/ok/warn/err/banner per TMUX_COLORS in `tmux-pane.jsx:5-11`), blinking `cwd $ █` cursor when status=running

DEFERRED to W1.5 follow-on polish wave:
- paneIn/paneOut scale-in/fade-out animation keyframes (`html:458-466`)

New W1 manifest territory updates required at next session-startup or via amendment dispatch.

### §2.2 ConductorChat (Wave-3) clean cut

New directory `src/conductor-chat/**` houses:
- Three-row layout (header / scrolling thread / composer per `conductor-chat.jsx`)
- Message role rendering (assistant/user/dispatch/system + typing indicator)
- Composer (paperclip + textarea + send + BuildMdChip when attached)

Existing `src/chat-shell/**` (17 files) — disposition:
- **Re-home into Wave-1 topbar**: `cost-meter.tsx`, `bottom-rail-cost-meter.tsx`, `max-parallel-counter.tsx`, `plan-timer-text.tsx`, `plan-usage-ring.tsx`, `mix-indicator.tsx`, `bypass-perms-indicator.tsx`, `dispatch-mode-toggle.tsx`, `conductor-brand.tsx`, `max-parallel-source.ts`, `ring-helpers.ts` — these become topbar primitives owned by W1
- **Delete after Wave-3 ships**: `chat-shell.tsx`, `tab-switcher.tsx`, `commits-tab.tsx`, `commits-reader.ts`, `build-md-tab.tsx`, `mount.ts` (chat-shell version)

Deletion sweep authored as W3-final cleanup commit AFTER `conductor-chat/` ships dogfood-renderable.

### §2.3 TweaksPanel subset

Production retention:
- **maxSlots** — operator-facing concurrency cap settings control (default current 12-cap per Round 11 envelope; selectable 16/32/64 future)
- Persists to user-preferences store (location TBD; likely `~/.foxworks-workstation/preferences.json` or similar)

Production removal:
- Layout (side/bottom toggle)
- Theme (dark/light)
- Accent color
- Density (compact/normal)
- Demo actions (spawn random / burst 20 / kill oldest / re-attach sample build.md)

The Tweaks panel UI itself does not ship to production — maxSlots surfaces in a settings/preferences flow TBD (operator-arbitrated at separate gate).

### §2.4 Screenshots normative

Per §5.5, screenshots at `docs/design-handoff/conductor-v-mvp/project/screenshots/{check,check2,progress,progress2,progress3,progress4}.png` are NORMATIVE pixel-perfect oracle.

Wave-N sessions doing visual work include screenshot-comparison as WB-acceptance criterion. cairn-phase-1-diagnose for visual-fidelity WBs reads relevant screenshot(s).

Pixel-perfect match required; deviations from screenshot require operator-arbitration before merge.

### §2.5 Wave-2 closure preserved

Wave-2 (agent-grid) remains CLOSED at `ec9b847`. Mini-tile mode (`.agent-grid-mini` density switch for >10 active sessions) deferred to W6-mini-tile follow-on wave.

W6-mini-tile dispatch gate: operator-arbitrated when concurrency cap ratchets above 10 active sessions OR operator initiates 64-parallel-agent capacity story explicitly.

Current 12-cap envelope does not require mini-tile mode for MVP visibility.

---

## §3 Authorization scope

This arbitration is BINDING for Wave-1 expansion + Wave-3 dispatch + W6-mini-tile gate. Operator-arbitrated per CLAUDE.md §1; signed off as committed artifact.

Future Wave-4 (build.md attach flow) territorial fence still requires its own territorial manifest at dispatch time. Out of scope for this arbitration.

Frozen contracts NOT touched: REGISTRY.md §2, CONDUCTOR_API_CONTRACT.md, dispatch-core schema, WORKSTATION_CONTRACT.md §6.

---

## §4 Immediate next actions (cascade)

1. **Gen-7 amendment dispatch** — operator notifies gen-7 of expanded W1 territory + Wave-3 dispatch readiness + W6-mini-tile deferral
2. **Wave-1 amended manifest** — gen-7 (or W1 session) updates `r12-mvp-w1-orchestrator-focus-pane.txt` territory to include topbar + orchestrator-strip + body-styling probes
3. **Wave-3 dispatch** — gen-7 spawns r12-mvp-w3-conductor-chat with new `src/conductor-chat/**` territory + screenshot-fidelity acceptance criterion
4. **chat-shell sweep deferral** — sweep commit authored AFTER Wave-3 lands dogfood-renderable; not before
5. **Wave-4 (build.md attach) operator arbitration** — separate gate; territorial manifest needed before dispatch

---

## §5 Methodology evidence

This arbitration is itself cairn-methodology evidence:
- Operator-only arbitration on territorial questions (§5.1, §5.2, §5.3)
- Best-judgment authorization invoked correctly with reasoning surfaced inline (§5.4, §5.6, §5.7)
- Bounded scope — no implementation, no production code, no schema changes
- Single committed artifact resolves 7 questions atomically
- Pre-stage discipline + per-path commit per §2.7
- Cascade work continues in parallel; no in-flight session disruption required for arbitration to land

Round 12 §1.x candidate: "operator-arbitration single-commit-batch-mode" — resolving multiple scope questions in one atomic decision-doc rather than serial commits.

