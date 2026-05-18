# Conductor V_MVP — design audit (2026-05-17)

**Author:** main-session research-and-coordination CC (operator-authorized 2026-05-17 ~19:00 MDT)
**Subject:** map the operator-authored `Conductor V_MVP.html` design bundle to current waves + codebase state; surface scope questions for operator arbitration.
**Method:** read-only audit. No `src/` writes. No tmux coordination. Single audit doc + design-bundle landing only.
**State snapshot:** taken immediately before commit; W1 + W2 sessions are advancing in parallel, so commit/probe counts may already have moved forward at read-time. Verify against `git log` for live state.

---

## §1 Design source

Canonical reference: `docs/design-handoff/conductor-v-mvp/` (15 files; landed in same commit as this audit).

Layout (preserves source bundle structure so README links resolve):

```
docs/design-handoff/conductor-v-mvp/
├── README.md                                  ← bundle README (verbatim from Claude Design)
├── chats/
│   └── chat1.md                               ← operator ↔ design-assistant transcript (intent log)
└── project/
    ├── Conductor V_MVP.html                   ← primary file the operator had open at handoff
    ├── app.jsx                                ← top-level App + sample build.md + lifecycle loops
    ├── orchestrator-strip.jsx                 ← progress bar + 64-slot grid + rate/ETA stats
    ├── tmux-pane.jsx                          ← TmuxPane (big + small) + TmuxMiniTile + StatusDot
    ├── tmux-content.jsx                       ← AGENT_TEMPLATES (fake terminal output per agent type)
    ├── conductor-chat.jsx                     ← ConductorChat + ConductorMessage + BuildMdChip + composer
    ├── tweaks-panel.jsx                       ← TweaksPanel host (referenced; design-time UI for layout/theme/density/maxSlots/demo)
    └── screenshots/check.png, check2.png, progress.png, progress2.png, progress3.png, progress4.png
```

### README excerpt (verbatim, lines 7-19 of bundle README)

> **Read the chat transcripts first.** There are 1 chat transcript(s) in `conductor-v-mvp/chats/`. The transcripts show the full back-and-forth between the user and the design assistant — they tell you **what the user actually wants** and **where they landed** after iterating. [...]
>
> **Read `conductor-v-mvp/project/Conductor V_MVP.html` in full.** The user had this file open when they triggered the handoff, so it's almost certainly the primary design they want built. [...]
>
> The design medium is **HTML/CSS/JS** — these are prototypes, not production code. Your job is to **recreate them pixel-perfectly** in whatever technology makes sense for the target codebase (React, Vue, native, whatever fits). Match the visual output; don't copy the prototype's internal structure unless it happens to fit.

### Operator intent (from `chats/chat1.md` line 9-13, verbatim)

> "I dont see what is so hard about a screen that has a bunch of live tmux screen a bigger more focused orchestrator screen thats running all of them as they start and stop they pop up and go away. then below that a chat VERY MUCH SO LIKE THE CLAUDE CHAT INTERFACE IM USING NOW that is my Conductor that takes build.md files and passes them piece by piece to the Orch."

Late-chat refinement (chat1.md line 107): support up to **64 parallel agents** — orchestrator "should be showing progress in some way." This produced the OrchestratorStrip + slot-grid + density-aware tile rail (≤10 active = full tmux tiles, >10 = mini-tile mode).

---

## §2 Five-region decomposition (six surfaces total)

Walked by reading `project/Conductor V_MVP.html` line 79-732 (CSS) + `project/app.jsx` line 282-368 (render tree). Six visible surfaces:

| # | Region                  | DOM root class                                | Source module           |
|---|-------------------------|-----------------------------------------------|-------------------------|
| 1 | **Topbar**              | `.topbar` (h=36px)                            | inline in `app.jsx:284-309` |
| 2 | **OrchestratorStrip**   | `.ostrip` (segmented bar + 64-slot grid + stats) | `orchestrator-strip.jsx` |
| 3 | **TmuxPane (big)**      | `.tmux-pane.tmux-big` (orchestrator focus log) | `tmux-pane.jsx`         |
| 4 | **Agent grid (small)**  | `.agent-grid` (full tiles or `.agent-grid-mini`) | `tmux-pane.jsx` (TmuxPane + TmuxMiniTile) |
| 5 | **ConductorChat**       | `.conductor` (h=36px header / thread / composer) | `conductor-chat.jsx`    |
| 6 | **TweaksPanel**         | toolbar-toggled overlay                       | `tweaks-panel.jsx` (host, referenced) |

Plus one **non-visible loop**: build.md parse + auto-dispatch (`app.jsx:197-254` — `attach()` parses 10 ordered steps from `SAMPLE_BUILD_MD`; `dispatchNext()` pops one step, emits a `dispatch`-role message + an orchestrator log line + spawns/reuses the target agent; effect at `app.jsx:250-254` fires every 4.2 s while attached and unpaused).

### Region 1 — Topbar (`app.jsx:284-309`)

Brand glyph `◐` + name "Conductor" + version pill `v_mvp` · `N panes` · `M running` · (when build attached) `queue: K · done: J` · `staging · us-east` · `$4.21 / $10.00`. IBM Plex Mono for tabular metas; Geist for brand name. 36 px tall, border-bottom, `--bg-elev` background.

### Region 2 — OrchestratorStrip (`orchestrator-strip.jsx`)

- Header row: title (▦ + build.md filename + `done+running/total` count pill) on left; stats grid on right (running, queued, done, [failed if >0], rate `N.N/min`, [ETA `mm:ss` if queued+rate>0]).
- Progress bar: 5 px tall, three segments — `--ok` done, animated `--accent` running with shimmer keyframe, `--border` queued (`html line 246-268`).
- Slot grid: 10×10 px squares, gap 3 px, `auto-fill` columns, **max 3 rows × ~50 cols = caps display ≈150 but design intent caps at 64 slots** per `maxSlots ∈ {16,32,64}`. Each slot: button (clickable, focus session), color by status (`empty|starting|running|done|error`), running slots get an opacity-pulsing inner span.
- Throughput: rolling 30 s window (`orchestrator-strip.jsx:70-85`) emits `N.N/min` rate; ETA = `queue.length / (rate/60)`.

### Region 3 — TmuxPane (big) — orchestrator focus log (`tmux-pane.jsx`)

24 px titlebar (status dot + name + cmd, right side pid + elapsed + cpu) + body with `IBM Plex Mono` 13 px, line-height 1.55, scrollbar 6 px. Body lines colored by class (`sys/ok/warn/err/banner`). Trailing blinking-cursor prompt line `cwd $ █` when status=running. Border `--accent` 35 % mixed with `--border` when `tmux-big`. Scale-in/fade-out animation (`paneIn`/`paneOut` keyframes, `html line 458-466`).

### Region 4 — Agent grid (`app.jsx:329-344` + `tmux-pane.jsx`)

Two layout modes via tweak:
- `app-layout-side` → 2-col grid right of orchestrator (1.7fr / 1fr split).
- `app-layout-bottom` → 4-col grid below orchestrator (1.5fr / 1fr rows).

Two density modes via session count:
- `sessions.length ≤ 10` → full `TmuxPane` per session (`tmux-small` class; 10.5 px mono, no cmd shown, only elapsed).
- `sessions.length > 10` → switch to `.agent-grid-mini` with `TmuxMiniTile` (8 px status dot + agent name + elapsed; height 36 px; min-width 120 px auto-fill).

Empty state: dashed-border `no agents · waiting` (`html line 172-183`).

### Region 5 — ConductorChat (`conductor-chat.jsx`)

Three-row grid: 36 px header (C-mark + "Conductor" + when attached: filename + done/total pill; right side pause/resume + cancel) / scrolling thread / composer.

Message roles (`ConductorMessage`):
- `user` — right-justified bubble, top-right radius 4 px.
- `assistant` — orange C-mark + prose, 780 px max-width column.
- `dispatch` — accent vertical rule + `DISPATCH step N/M → agent-x` heading + task line in IBM Plex Mono.
- `system` — centered grey monospace with leading dot.
- Typing indicator: 3 animated dots + `watching N agents…` when `running > 0`.

Composer: rounded 16 px row, paperclip icon (attach build.md) + textarea (placeholder shifts when attached) + accent send button. When attached, shows `BuildMdChip` + `dispatch next →` dashed-button. Hint row: `↵ send · ⇧↵ newline · build.md is parsed into ordered steps and piped one at a time to the Orchestrator`.

### Region 6 — TweaksPanel (`app.jsx:370-430` + referenced `tweaks-panel.jsx`)

Design-time tweaks: Layout (side/bottom + compact/normal density) · Theme (dark/light + accent ∈ {`#f0a062,#6ad4b8,#8aa6f0,#d97a9c,#c4c4c8`}) · Capacity (maxSlots ∈ {16,32,64}) · Demo (spawn random / burst 20 / kill oldest / re-attach sample build.md). The `TweaksPanel` host component itself is referenced but its file (`tweaks-panel.jsx`) is present in the bundle as a design-tool host.

### Non-visible — build.md parse + auto-dispatch loop (`app.jsx:15-29 + 197-254`)

Sample build.md is hardcoded as `SAMPLE_BUILD_MD` (10 ordered steps, each `{target, task}`). `attach()` snapshots the steps into `queue` state, emits a 📎 attachment message + an assistant "Parsed N steps across M agents" reply, and writes a banner line into the orchestrator log. `dispatchNext()` pops the head step, emits a `dispatch`-role message, and either re-uses a live agent of that type or spawns one (`spawnSession`). Auto-dispatch effect fires every 4200 ms while `attached && !paused && queue.length`.

---

## §3 Region-to-wave mapping

Mapping uses the **current dispatched wave numbering** (manifest filenames `r12-mvp-w1-…` and `r12-mvp-w2-…`), which differs from the wave numbering in operator-vision `2026-05-17.md` because the original Wave-1 ("live-tmux-streaming foundation") was discovered NO-OP per discovery `a201e80429bfe5757` and the remaining waves slid up.

| Region                       | Component (vision doc)        | Wave (dispatched #)   | Manifest                                             | Status                                                                 |
|------------------------------|-------------------------------|-----------------------|------------------------------------------------------|------------------------------------------------------------------------|
| Topbar                       | "Top chrome" (no component #) | **unassigned**        | (none — no manifest exists)                          | open scope question §5                                                 |
| OrchestratorStrip            | Component 1 (extension)       | **W1 — adjacent**     | `r12-mvp-w1-orchestrator-focus-pane.txt`             | not in current W1 TERRITORY list; needs scope decision §5              |
| TmuxPane (big) — orch focus  | Component 1                   | **W1 — live**         | `r12-mvp-w1-orchestrator-focus-pane.txt`             | [KNOWN] WB1+WB2+WB3 GREEN at `a904bdb` / `ec0b6a2` / `94aea81`; WB3 added `focus-pane-header.tsx`; probes 01-03 in tree |
| Agent grid (small + mini)    | Component 2                   | **W2 — CLOSED**       | `r12-mvp-w2-agent-grid.txt`                          | [KNOWN] WB-final GREEN at `ec9b847` (closure docs + 2 probes: spawn-exit + cross-tile isolation); all 4 probes (01-04) shipped |
| ConductorChat                | Component 3                   | **W3 — queued**       | (no manifest yet; chat-shell exists with tab-strip)  | [KNOWN] `src/chat-shell/` has 17 files (tab-switcher + 3 tabs + meters); design REPLACES this surface per vision §142 |
| TweaksPanel                  | (not in vision doc)           | **unassigned**        | (none)                                               | open scope question §5 — design-time only vs production toggle?         |
| build.md parse + auto-dispatch | Component 4                | **W4 — queued (partial existing)** | (no manifest yet; build-md territory partly implemented) | [KNOWN] `src/build-md/{dispatch-loop,index,service,types}.ts` exists; `frame-c/build-md-status-line.tsx` shipped at `c235be2`; full attach-flow per design is significant extension |

---

## §4 What's shipped vs what's left

### Topbar (region 1)

**Shipped:** [KNOWN] None of the design's topbar exists as a unified row. Brand-and-budget primitives exist scattered: `chat-shell/conductor-brand.tsx`, `chat-shell/cost-meter.tsx`, `chat-shell/bottom-rail-cost-meter.tsx`, `chat-shell/max-parallel-counter.tsx` — but these live inside chat-shell, not in a 36 px shell-top bar.
**Left:** entire topbar surface as a new layout shell, plus territorial fence decision (who owns it).

### OrchestratorStrip (region 2)

**Shipped:** [KNOWN] None. No `ostrip*`, `slot-grid*`, or progress-bar-segmented module in `src/`.
**Left:** entire strip surface — segmented progress bar, slot grid (sized for 64), rate/ETA stats, throughput rolling window. Per current W1 manifest TERRITORY list this is NOT in W1's TERRITORY — would need expansion or new wave assignment.

### TmuxPane (big) — orchestrator focus (region 3)

**Shipped:** [KNOWN] W1 advanced through WB3:
- `packages/dispatch-workstation/src/orchestrator-focus-pane/{focus-pane.tsx, focus-pane-ipc.ts, focus-pane-header.tsx, index.ts}` — 4 files.
- WB1 GREEN at `a904bdb` (focus-pane.tsx mount + adapter-bridge).
- WB2 GREEN at `ec0b6a2` (focus-pane-ipc.ts renderer-side consumer; subscribes to `coarchitect:ptyChunk`).
- WB3 GREEN at `94aea81` (focus-pane-header.tsx chrome with uptime + placeholders).
- Probes shipped: `probe-mbt-mvp-w1-01-focus-pane-mounts`, `…-02-ipc-consumer-pty-chunk`, `…-03-header-pid-uptime-cpu-budget`.
**Left:** [MODELED, based on W1 manifest probe list at `r12-mvp-w1-…txt:1`] probes 04-06 still ahead: layout 60 %-width + step counters + e2e. Body styling per design (IBM Plex Mono 13 px, line colors by `t` class, banner ASCII box, blinking `cwd $ █` cursor when running, accent border) and animation polish are not yet covered by probe list — see §5.6.

### Agent grid (region 4)

**Shipped:** [KNOWN] **Wave-2 is CLOSED.** Full ladder:
- `agent-grid-layout.ts` (computeAgentGridLayout) at `186e401` green WB1.
- `tile-grid.tsx` `agentGridMode` prop + restyle wiring at `8742117` green WB2.
- Per-tile chrome (status dot + agent label + uptime + spawnedAtMs prop-drill) — green at `95103b6` WB3.
- WB-final closure at `ec9b847` (closure docs + 2 additional probes: spawn-exit reactivity + cross-tile isolation).
- All 4 W2 probes (01 layout / 02 status-dot-uptime-agent-label / 03 spawn-exit / 04 live-stream-per-tile) shipped.
- Existing primitives still consumed: `status-indicator.tsx`, `tile-header.tsx`, `tile-footer.tsx`, `tile.tsx` (mounts ConsolePanel per session per discovery `a201e80429bfe5757`), `console-panel/*` (xterm.js adapter, `consoleBridge.onStdoutChunk` filter).
**Left:** mini-tile mode (`.agent-grid-mini` when `sessions.length > 10`) is **not** in the closed W2 probe list — see §5.7. Any follow-on (mini-tile mode, max-parallel density switch up to 64) is extension territory.

### ConductorChat (region 5)

**Shipped:** [KNOWN] None of the design's surface. Current `src/chat-shell/` has 17 files representing the **tab-strip** approach the operator vision §142 explicitly says is OUT OF SCOPE for MVP and the design REPLACES:
- `chat-shell.tsx`, `tab-switcher.tsx`, `commits-tab.tsx`, `build-md-tab.tsx` (tab-strip)
- `bottom-rail-cost-meter.tsx`, `cost-meter.tsx`, `max-parallel-counter.tsx`, `plan-timer-text.tsx`, `plan-usage-ring.tsx`, `mix-indicator.tsx`, `bypass-perms-indicator.tsx`, `dispatch-mode-toggle.tsx`, `conductor-brand.tsx` (meters/indicators that may need re-homing into the topbar or composer)
**Left:** entire Claude.ai-style chat surface — assistant/user/dispatch/system message rendering, composer with paperclip + textarea + send, BuildMdChip, typing indicator, header pause/resume/cancel controls. Open question: is this an in-place restyle of `chat-shell/` or a new `conductor-chat/` directory replacing `chat-shell/`? §5 surfaces this.

### TweaksPanel (region 6)

**Shipped:** [KNOWN] None.
**Left:** open scope decision §5 — design-time host only (used by Claude Design for prototyping), or production toggle for layout/theme/density/maxSlots?

### build.md parse + auto-dispatch loop (non-visible)

**Shipped:** [KNOWN] Partial:
- `src/build-md/{dispatch-loop,index,service,types}.ts` — files exist but content not audited line-by-line for this doc.
- `src/main/build-md-ipc.ts` + `src/main/build-md-dispatch-trigger-ipc.ts` — IPC handlers exist.
- `src/frame-c/build-md-status-line.tsx` — status-line wired at `c235be2` green WB-final and `6acf1f2` green WB2.
**Left:** full attach flow per design — paperclip → file picker → parse → BuildMdChip in composer → enqueue → auto-dispatch every N s → per-step dispatch-role chat message → orchestrator log line. [SPECULATIVE] some of `dispatch-loop.ts` may already cover the queue mechanics; needs read-and-cite pass before any wave dispatches.

---

## §5 Open scope questions (operator arbitration needed)

### §5.1 Topbar territory

The design's 36 px topbar is unified — brand + counts + budget + env in one row. **No wave manifest owns it.** Possibilities:
- (a) Extend W1 (orchestrator-focus-pane) territory to include the topbar (it sits above orchestrator).
- (b) Author a new top-level layout shell (`src/app-shell/`) and assign new Wave-0 to it.
- (c) Defer — topbar is decorative; lay it last after Components 1-4 ship.

### §5.2 OrchestratorStrip territory

The strip sits *above* the orchestrator log, *not* inside it. Current W1 manifest lists only `focus-pane.tsx` / `focus-pane-ipc.ts` / `focus-pane.tsx` / `index.ts` / `mount.ts` (per manifest `r12-mvp-w1-…txt:1`). Strip is not in W1's TERRITORY. Possibilities:
- (a) Extend W1 to include `orchestrator-strip.tsx` (logical owner — above the focus pane).
- (b) Author new Wave (sub-component of W1) — `src/orchestrator-strip/`.
- (c) Combine strip + focus-pane into one renamed wave (`src/orchestrator/`).

### §5.3 ConductorChat — in-place restyle or replacement?

Design REPLACES the tab-strip (vision §142: "Tab-strip refinement (tabs are out of scope; conductor-chat REPLACES them)"). Current `chat-shell/` has 17 files. Possibilities:
- (a) In-place rewrite of `chat-shell/` files (high churn; existing meters either re-homed into topbar/composer or deleted).
- (b) New `src/conductor-chat/` directory replacing `chat-shell/` (cleaner; chat-shell entries become dead code until removed in a sweep).
- (c) Hybrid — keep chat-shell files that house cost/budget/parallel meters (re-purposed into topbar) + new `conductor-chat/` for the chat surface itself.

### §5.4 TweaksPanel — production or design-time only?

Design includes a Tweaks panel toggle (`html line 5-12` `TWEAK_DEFAULTS`: layout, theme, accent, density, maxSlots, showWatermark). Possibilities:
- (a) Production toggle (settings menu) — operator can switch side-rail vs bottom-strip layout, dark/light, accent color, max parallel, density.
- (b) Design-time only — strip from production build; constants pinned to defaults.
- (c) Subset — keep maxSlots (16/32/64) as a production setting (operator-controlled concurrency cap), strip the rest.

### §5.5 Screenshots — normative or aspirational?

`docs/design-handoff/conductor-v-mvp/project/screenshots/{check,check2,progress,progress2,progress3,progress4}.png` were saved by the design assistant during iteration. README §19 says "**Don't render these files in a browser or take screenshots unless the user asks you to.** Everything you need — dimensions, colors, layout rules — is spelled out in the source." Possibilities:
- (a) Normative — pixel-perfect match expected, treat as the visual oracle.
- (b) Aspirational — directional only; source HTML/CSS is the canonical spec.
- (c) Reference for QA only — Wave-N sessions don't open them; final verification compares against them.

### §5.6 Wave-1 (orchestrator-focus-pane) scope re-arbitration given design specifics

Design's orchestrator focus pane body includes (not yet covered by W1 probes 01-03 GREEN):
- Banner-style log content (`tmux-content.jsx:163-170` — `ORCH_BANNER` with build.md filename, total/queued/running/done, budget, wall clock as a 5-line ASCII box, rendered with `--accent` color).
- Streaming `{t: 'sys'|'ok'|'warn'|'err'|'banner', s: '...'}` line stream colored per class (`tmux-pane.jsx:5-11` `TMUX_COLORS`).
- `cwd $ █` blinking cursor line when status=running (`tmux-pane.jsx:92-97`).
- Scale-in/fade-out animation on mount/exit (`html:458-466` `paneIn`/`paneOut` keyframes).

Current W1 manifest covers probes 04-06 (60 %-width layout + step counters + e2e). The banner format + line-class colors + cursor + animation are not explicit probes. **Question:** expand W1 probe list (e.g. probe-07 body line-class rendering, probe-08 cursor + banner) before WB-final, or defer to a follow-on polish wave?

### §5.7 Wave-2 (agent-grid) — mini-tile mode follow-on

Wave-2 is CLOSED at `ec9b847` with probes 01-04 + 2 closure probes shipped. Design's mini-tile mode (`.agent-grid-mini`: compact `name+dot+elapsed` tiles when `sessions.length > 10`, `app.jsx:331`) is **not** covered. **Question:** author a follow-on wave (W2.5 or W6-mini-tile) to add the density switch + `TmuxMiniTile` component, or accept the current full-tile-only behavior as MVP-complete? The 64-parallel-agent capacity claim in chat transcript line 107-184 ("at 64 parallel agents you can't read 64 tmux panes anyway") makes the mini-tile mode load-bearing for the upper-capacity story; without it, the agent-grid degrades visually past 10 active sessions.

---

## §6 Wave session Phase-1 reading requirements

Recommendation (for operator to authorize before any forward wave dispatch): each Wave-N session's **Phase-1 diagnose** should read:

1. `docs/coordination/operator-vision-three-pane-conductor-2026-05-17.md` (vision)
2. `docs/coordination/conductor-v-mvp-design-audit-2026-05-17.md` (this doc)
3. `docs/design-handoff/conductor-v-mvp/README.md` (handoff README)
4. `docs/design-handoff/conductor-v-mvp/chats/chat1.md` (operator intent log)
5. `docs/design-handoff/conductor-v-mvp/project/Conductor V_MVP.html` (full file; primary visual spec)
6. The `.jsx` file(s) relevant to that wave's component (per §3 mapping):
   - W1 → `project/orchestrator-strip.jsx` + `project/tmux-pane.jsx` + `project/tmux-content.jsx` (`ORCH_BANNER`)
   - W2 → `project/tmux-pane.jsx` (TmuxPane + TmuxMiniTile + StatusDot) + `project/app.jsx` lines 329-344 (grid + density switch)
   - W3 (conductor-chat) → `project/conductor-chat.jsx` + `project/app.jsx` lines 183-262 (chat actions)
   - W4 (build.md attach) → `project/app.jsx` lines 197-262 (attach/detach/dispatchNext) + `project/conductor-chat.jsx` (`BuildMdChip`)

Phase-1 token budget: design-bundle reads alone are bounded (`Conductor V_MVP.html` 748 lines; longest `.jsx` is `app.jsx` 435 lines; total ≈2200 lines across HTML+5 JSX). Fits comfortably in a Phase-1 budget.

---

## §7 Scope discipline

**This audit does not commit src/.** This audit does not author production code. This audit does not spawn sub-sessions. This audit does not send tmux messages to gen-7. Implementation will be dispatched separately via Wave-N sessions after the §5 scope questions are arbitrated by operator.

**Frozen contracts not touched** (per CLAUDE.md §2.10): REGISTRY.md §2, CONDUCTOR_API_CONTRACT.md, `dispatch-core/src/v3/schema.ts` §1-§13, WORKSTATION_CONTRACT.md §6 — design implementation may eventually require schema additions (e.g., orchestrator-active session type, build.md attach state), but those are operator-arbitrated and not in scope for this audit.

**Halt state:** main session halts here. Standing by for operator review and Wave dispatch authorization.
