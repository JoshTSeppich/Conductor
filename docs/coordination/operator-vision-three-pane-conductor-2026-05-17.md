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
