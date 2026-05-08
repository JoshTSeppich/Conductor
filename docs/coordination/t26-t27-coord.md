# T26 / T27 Cross-Session Coordination — chat-shell-header-bar slots

**Authored:** 2026-05-07 (Terminal C, MB-T26 WB1 red)
**Operator-confirmed:** Q-MBT26-6=a (Terminal C goes first; cross-session
coord doc at WB1) 2026-05-07.

---

## Owner sessions

- **Terminal C — MB-T26 (cost meter)**
- **Terminal D — MB-T27 (model mix)**

Both sessions land render-prop slots inside a NEW `chat-shell-header-bar`
element above the existing tab-strip in
`packages/dispatch-workstation/src/chat-shell/chat-shell.tsx`.

---

## Sequencing (operator-arbitrated)

Q-MBT26-6=a + Q-MBT26-1=a (header-bar slot model) operator-confirmed
2026-05-07 (in MB-T26 WB1 ack):

1. **Terminal C lands FIRST at MB-T26 WB3** (green-integration):
   - Creates `chat-shell-header-bar` element above the tab-strip in
     `chat-shell.tsx`.
   - Adds `renderCostMeter?: () => ReactNode` slot prop on `ChatShellProps`.
   - Wraps the new element + cost-meter slot in a sentinel zone:
     ```tsx
     // === BEGIN: MB-T26 cost-meter slot ===
     // ... header-bar element + cost-meter slot wrapper ...
     // === END: MB-T26 ===
     ```
     per CLAUDE.md §3.3.
   - Plumbs `renderCostMeter` through `mount.ts` so the closure can read
     today's cost via the coarchitect bridge polling handler (Q-MBT26-5=c).

2. **Terminal D lands SECOND at MB-T27** (model-mix integration):
   - Adds `renderModelMix?: () => ReactNode` slot prop to the existing
     `ChatShellProps` (do NOT touch Terminal C's slot prop).
   - Renders the model-mix slot INSIDE Terminal C's `chat-shell-header-bar`
     element.
   - Adds a NEW non-overlapping sentinel zone:
     ```tsx
     // === BEGIN: MB-T27 model-mix slot ===
     // ... model-mix slot wrapper ...
     // === END: MB-T27 ===
     ```
     placed immediately after Terminal C's `=== END: MB-T26 ===` marker
     (or before it — both are non-overlapping). Do NOT modify Terminal C's
     sentinel zone or its inner code.

---

## Reserved data-testid contract

These data-testids are reserved for the chat-shell header-bar surface;
each session owns its own:

| data-testid | Owner ticket | Owner session | Status |
|---|---|---|---|
| `chat-shell-header-bar` | MB-T26 | Terminal C | LANDS at MB-T26 WB3 |
| `chat-shell-cost-meter-slot` | MB-T26 | Terminal C | LANDS at MB-T26 WB3 |
| `chat-shell-model-mix-slot` | MB-T27 | Terminal D | reserved here for forward compatibility |
| `chat-shell-plan-usage-slot` | MB-T25 (future) | TBD | reserved here for forward compatibility |

If Terminal D's MB-T27 lands BEFORE MB-T26 WB3 (e.g., MB-T26 stalls), the
`chat-shell-header-bar` element ownership transfers to whichever session
lands first — coordinate via operator arbitration in that case rather
than assuming this sequence.

---

## Slot ordering inside chat-shell-header-bar (left → right per wireframe)

```
[ plan-usage ring ]   [ cost-meter ]   [ model-mix ]
   MB-T25 (future)      MB-T26 (this)    MB-T27 (Terminal D)
```

Render order in `chat-shell.tsx` JSX should match left-to-right visual
order. CSS layout (flexbox or grid) is at Terminal C's discretion at WB3
but should leave the rightmost slot trivially appendable for Terminal D.

---

## Methodology invariants (parallel-cairn)

1. **Per-path `git add` only** per CLAUDE.md §2.7 — never `-A` / `.` /
   `git add docs/`. Each commit names every file explicitly.
2. **Atomic-chain commit pattern** per `MB-F-PARALLEL-CAIRN-INDEX-RACE-
   ATOMIC-COMMIT` (Tier 1):
   ```
   git pull --ff-only && \
   git add <explicit paths> && \
   git diff --cached --name-only | sort > /tmp/<ticket>-<wb>-staged.txt && \
   diff /tmp/<ticket>-<wb>-staged.txt <(printf "<paths>\n" | sort) && \
   git commit -m "..." && \
   git push origin main && \
   git log --oneline origin/main..HEAD
   ```
3. **Halt ~30s before atomic-chain** per operator coordination update
   2026-05-07 (in MB-T26 WB1 ack) to reduce cross-session race
   probability. Not a guarantee.
4. **If a third index-race incident occurs across the 4-session run**,
   operator pivots all sessions to git worktree isolation per CLAUDE.md
   §4.3.

---

## Known prior incidents in this session run (T26/T27 territory)

- `e02aa52 spike(MB-T21):` swept Terminal C's `mb-t26-diagnose-2026-05-07.md`
  into Terminal A's commit (per-path discipline failure at Terminal A). My
  atomic-chain caught the contamination at the diff step (commit aborted);
  no double-commit. Disposition Q-MBT26-METHO-1=c (accept-as-is + file
  finding at WB4 docs).

- **MB-T22 (Terminal B) shares chat-shell.tsx + mount.ts** — discovered
  mid-WB3. Sequence is now T22 → T26 → T27 (each session adds its own
  sentinel zone in landing order):
    1. T22 WB2 (`a08b406`) — multi-tab API + reserved
       `// === BEGIN: MB-T22 header-bar extension point (MB-T26/MB-T27 territory) ===`
       sentinel zone in chat-shell.tsx and mount.ts migration to tabs[].
    2. T26 WB3 (`09b38ce`) — Terminal C's MB-T26 cost-meter sentinel
       zone is NESTED INSIDE Terminal B's reserved zone. Terminal C
       added `chat-shell-header-bar` element + `renderCostMeter?` slot
       prop. mount.ts gains `resolveRenderCostMeter()` + optional
       `CoarchitectBridge.onCostUpdate?`.
    3. T27 (Terminal D, future) — adds `renderModelMix?` slot prop to
       ChatShellProps via own non-overlapping sentinel zone, renders
       model-mix slot inside Terminal C's `chat-shell-header-bar`
       element. Do NOT modify Terminal C's MB-T26 zone or Terminal B's
       outer MB-T22 zone.

- **`09b38ce` content-sweep at preload.mts** — my WB3 atomic-chain
  commit captured Terminal B's uncommitted MB-T22 commits-bridge
  content (lines 158-179) along with my MB-T26 cost-meter bridge zone
  (lines 32-55) in the same file. Atomic-chain diff-verify confirmed
  the path was expected (preload.mts is mine to edit) but did NOT
  verify content provenance within the path. My WB3 commit body Q7
  claim of "Zero T22 territory bleed" was [INACCURATE] in retrospect.
  Terminal B's `427c6a3 green(MB-T22): WB3 — ...` commit body
  explicitly cites the `09b38ce content-sweep`. Tier 1 methodology
  followup: `MB-F-PARALLEL-CAIRN-SHARED-TREE-CONTENT-SWEEP`. Forward
  fix: git worktree-per-session per CLAUDE.md §4.3 — atomic-chain
  diff-verify CANNOT prevent this failure mode in shared-tree
  contexts.
