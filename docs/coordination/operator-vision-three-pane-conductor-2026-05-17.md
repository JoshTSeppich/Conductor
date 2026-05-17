# Operator vision — three-pane Conductor

**Operator:** Joshua Seppich
**Date:** 2026-05-17
**Subject:** Conductor v2 MVP shape — what "built" actually means

---

## The vision

Conductor is a single Electron app window with three panes:

### Top pane — Sub-session grid

Live mirror of every active tmux sub-session as a tile. Tiles appear when sessions spawn. Tiles disappear when sessions exit. Real-time output visible per tile (scrollback per session). Operator sees all parallel work at a glance.

### Center pane — Orchestrator focus

Larger, more prominent live mirror of the orchestrator's own tmux pane. The "brain view." Operator sees what gen-N is thinking, dispatching, and arbitrating in real-time. This is the always-visible focus.

### Bottom pane — Conductor chat

Looks and feels like the Claude.ai chat interface. Operator types into it. Pasting a build.md file gets fed piece-by-piece to the orchestrator (center pane) which dispatches to sub-sessions (top pane tiles). This IS the conducting — operator drives the cascade through this chat.

---

## What MVP-shippable means

MVP = these three panes work in dogfood. Operator launches Conductor app, types a build.md into bottom pane, watches orchestrator dispatch in center pane, watches sub-session tiles spawn/work/exit in top pane. Done.

## What is OUT OF SCOPE for MVP

- Refinements to existing followup rows that don't block the three-pane vision
- New IPC channels unless required for the three-pane vision
- New schema work unless required for the three-pane vision
- New methodology work unless required for the three-pane vision
- Polishing what's already visible if the three-pane vision isn't yet visible

## Cascade work prioritization (effective immediately)

All cascade closure dispatches judged against: "Does this make the three-pane vision more visible?"
- YES → dispatch
- NO → defer to post-MVP

---

## Why this matters

The build-docs (REGISTRY.md, WORKSTATION_CONTRACT, conductor-api-contract, dispatch-core schema) have grown architecturally elaborate. Cascade has been closing followup debt that's real but tangential. The operator vision is concrete: three panes that work. Everything else is architecture that supports it or distraction from it. This doc is the north-star spec.

---

## Action items

1. Operator verifies current app state via pnpm build + launch
2. Operator + cascade identify gap between current state and three-pane vision
3. Cascade dispatched to bridge that gap, deferring tangential debt
4. Operator-launch dogfood when gap closes
5. MVP-shippable stamp when dogfood succeeds

---

## Canonical decomposition (cascade-ready)

The three-pane vision decomposes into five components. Cascade dispatches prioritized by which component each closure advances.

### Top chrome
- Conductor brand + version tag (e.g., `v_mvp`)
- Live "N panes · M running" count
- Environment label (e.g., `staging · us-east`)
- Live budget indicator (e.g., `$4.21 / $10.00`)

### Component 1 — orchestrator-focus-pane
- Large bordered live tmux mirror of `__orchestrator_active`
- Primary view, top-left of main area, ~60% width
- Header: pid + uptime + cpu indicator
- Body: streaming orchestrator output (spawn events, finished events, exited events)
- Visual frame around build.md filename, total/queued/running/done step counters, budget, wall clock

### Component 2 — agent-grid
- Top-right of main area, ~40% width
- 2x2 or 2x3 grid of live tmux mirror tiles for active sub-sessions
- Per-tile: status dot (green=running), agent label, uptime, live tmux output stream
- Tiles appear on session spawn, disappear on exit
- Should handle 1-12 concurrent tiles gracefully

### Component 3 — conductor-chat
- Bottom of window, primary interaction surface
- Claude.ai-style chat with C-avatar bubbles
- Conductor authoring messages ("Conductor ready. Attach a build.md...")
- Live status indicator ("watching N agents...")
- Input box: paperclip icon + placeholder "Drop a build.md or ask the Conductor to do something..."
- Send hint below: "build.md is parsed into ordered steps and piped one at a time to the Orchestrator"
- REPLACES current tab-strip (Chat | Commits | BUILD.md). Tabs are out of scope for MVP.

### Component 4 — build.md attach flow
- File picker triggered by paperclip icon in conductor-chat input
- Parses attached build.md into ordered steps
- Feeds steps to orchestrator-focus-pane one-at-a-time as each previous step completes
- Updates step counters in orchestrator-focus-pane header in real-time

### Component 5 — live tmux output streaming primitive
- Foundation for components 1 and 2 (both need actual pane content streaming)
- Current statusListClient = metadata only (status, uptime); insufficient for mockup
- Need: actual pane content via `tmux capture-pane -p` polling OR pty-bridge
- Single shared primitive consumed by orchestrator-focus-pane AND agent-grid tiles

---

## Dependency-sequenced cascade waves

Component 5 (live tmux output streaming) is the foundation. Build it first.

- **Wave R12-MVP-Wave-1:** Component 5 — live tmux output streaming primitive
- **Wave R12-MVP-Wave-2:** Component 1 — orchestrator-focus-pane (consumes Wave 1)
- **Wave R12-MVP-Wave-3:** Component 2 — agent-grid (consumes Wave 1, parallel to Wave 2)
- **Wave R12-MVP-Wave-4:** Component 3 — conductor-chat (independent, can parallel any wave)
- **Wave R12-MVP-Wave-5:** Component 4 — build.md attach flow (consumes Wave 3 + Wave 2)

Waves 2 and 3 can run concurrently after Wave 1. Wave 4 can run concurrently with Waves 1-3. Wave 5 is the integration wave.

---

## Discovery phase requirement

Before any Wave R12-MVP-Wave-N dispatch, cascade must run a discovery subagent that inventories which of components 1-5 already have partial implementation in `packages/dispatch-workstation/src/` vs which are net-new. Token budget for discovery: 50k max. Output: per-component status table (NOT-STARTED / PARTIAL-with-file-list / PARTIAL-with-gap-list / EXISTS-but-misnamed).

Implementation cascade gates on discovery inventory completion.

---

## Scope gate (binding)

Every cascade closure dispatch judged: "Does this advance mockup-renderable MVP visibility?"
- YES → dispatch
- NO → defer to post-MVP

**Explicitly deferred to post-MVP:**
- POOL-C Tier-2 followup work
- Kanban-column work
- Tab-strip refinement (tabs are out of scope; conductor-chat REPLACES them)
- Status-filter dropdown work ("All status" / "All repos" filters)
- Any closure work that doesn't advance components 1-5

In-flight closures at the time of this dispatch may complete; no new non-three-pane dispatches authorized.
