# MB-F-TILEGRIDAPP-WIRING-TRINITY findings (2026-05-12)

**Session**: `c5-ticket-wb1` (Round 11 §3.9 Wave 2 SPECULATIVE)
**Companion**: `docs/coordination/coord-c5-tilegrid-wiring-2026-05-12.md`

This doc captures patterns + insights worth propagating forward from the c5 trinity work. The companion coord doc has the WB-by-WB ledger + handoff contracts; this doc focuses on **what generalized**.

---

## §I — §2.11 outcome classifications validated

c5 work demonstrates **"Capability enabled with known limitations"** as the honest framing when:
- The trinity scope spans renderer + main process + preload, but session territory is renderer-only.
- The renderer-side surface is a complete contract handoff (modules + bridge-shape extensions + wiring).
- Downstream consumers (preload + main + sibling territory) are needed for end-to-end behavior.

**Not** "Improved" (no behavioral change at HEAD until downstream lands). **Not** "No improvement + structural finding" (the structural anchors ARE the improvement). **Capability enabled** is the right framing.

This is the **third** ticket in 2026-05-12 cluster to use this framing (T5 stub-deps posture at `mbtwft5-findings-2026-05-12.md` §I; t3 lookup-stub original posture at `mb-t-wireframe-t3-action-bar-wiring-findings-2026-05-12.md` §I). Pattern is stabilizing.

## §II — Cross-session contract alignment under speculative dispatch

c5 + t3 ran concurrently under Round 11 §3.9 SPECULATIVE adoption with a declared dep (queue row 28: "c5 trinity for tile-grid-app integration anchor"). Two patterns emerged:

### §II.A — Architectural divergence detection

t3's d18353b introduced `SessionRegistrySource` interface BEFORE c5 reached its GREEN WB. c5 originally designed a `lookup(name)` method; t3's interface used `getSession(name)`. Detection mechanism: c5's WB3 GREEN reading-scope review of t3's deps shipped at d18353b surfaced the naming divergence.

**Pattern**: When a cross-session dep ships earlier than expected, do a recon-read of the published contract BEFORE writing the consumer-side green. Don't assume your pre-dispatch design survives a parallel-session ship.

### §II.B — Mechanical-translation alignment under operator arbitration

Operator Phase 1 reinforcement (c) 2026-05-12 directed renaming `lookup` → `getSession` to align with t3's interface. The amendment shipped as a WB2 RED commit (a400c10) — re-RED of the same gap, with the GREEN at WB3 (56925b8) matching the renamed contract.

**Pattern**: A speculative cross-session dep's architectural assumptions get re-aligned via probe amendments, NOT via accepting interface divergence. The alignment commit is a RED commit (probe spec change), not a chore.

## §III — Per-path commit pathspec discipline (Tier 3 forward-propagation memory)

### §III.A — Incident root cause (63eba0f)

§2.7 per-path `git add` discipline was followed. `git diff --staged --name-only` verification passed. Then `git commit -m "..."` (no pathspec) was invoked. In the millisecond window between staged-verify and commit, another session's `git add` injected content into the shared `.git/index`. The bare `git commit` captured ALL staged content.

### §III.B — The fix

`git commit -- <pathspec>` ALWAYS, regardless of how clean the pre-commit `git diff --staged` looks. The index is mutable; the pathspec on commit is the only race-proof scope mechanism in shared working trees.

### §III.C — Forward propagation (proposed §2.7 amendment)

```markdown
### §2.7 Per-path git add AND commit pathspec (shared-working-tree contexts)

`git add -A` / `git add .` in shared-working-tree parallel sessions is unsafe.
ALSO: `git commit -m` without pathspec in shared-working-tree parallel sessions
is unsafe — the index can be mutated by another session between `git add` and
`git commit`.

**Always use explicit `git add -- <path>` for every staged file. Then use
`git commit -- <pathspec> -m "..."` with the same pathspec on commit.**

Pre-commit territory check via `git status --short` — paths outside your
territory STAGED on your index were put there by another session's `git add`
and must be unstaged (`git reset HEAD <paths>`) BEFORE commit. Per-path
`git commit -- <pathspec>` provides defense-in-depth if a foreign `git add`
races between your unstage and your commit.

Post-commit verification via `git log -1 --stat` to confirm scope.
```

Operator-arbitrated whether this lands in CLAUDE.md or stays as forward-propagation memory in this doc.

### §III.D — Memory candidate

```
- [Per-path commit pathspec mandatory in shared trees](feedback_per_path_commit_pathspec.md) — git add discipline alone is insufficient; the .git/index is mutable between add and commit in parallel-cairn contexts
```

(Memory file authoring is operator-arbitrated; this row drafts the candidate.)

## §IV — Renderer-side anchor-only posture (architectural pattern)

The trinity gap closure decomposition mirrors the WB4 lookupSession stub posture from t3 (and the WB10 stub-deps posture from T5 / MB-T36-style dep-injected factories):

| Posture stage | Examples | When applicable |
|---|---|---|
| (i) Stub deps (`() => null`) | t3 WB4 lookupSession; T5 WB10 getCompletedTaskIds | Initial ship; UX surfaces honest failure banner |
| (ii) Contract handoff (interface + factory) | t3 d18353b (factory factor-out); c5 56925b8 (registry helper) | Architectural anchor for downstream wiring |
| (iii) Renderer-side anchor (module + state + wiring) | c5 a833b94 + 1402e15 (frame-mode + scroll-to-session subscriptions) | Renderer territory portion of cross-process wiring |
| (iv) Cross-process wiring (preload + main extensions) | downstream from c5 | Production-wiring ticket(s) |
| (v) End-to-end visual closure | downstream consumer (e.g., tile-grid.tsx prop drill) | Tier-N final closure |

This 5-stage decomposition makes it easy to break cross-cutting work into right-sized session scopes under §3.9 SPECULATIVE dispatch. c5 shipped stages (ii) + (iii) for one gap each; (iv) and (v) remain for downstream sessions.

## §V — Honest framing of c5 deliverable to non-c5 audience

For an operator reviewing main at HEAD post-1402e15 and asking "what does c5 do for the user?":

> **Nothing visible to the user yet.** The three followups have anchor closure — the code that subscribes/registers exists, but the bridges that connect renderer to main process don't expose those subscribe-style APIs yet, and the inner tile components don't yet consume the anchor state. The next 2-3 downstream tickets (preload + main + tile-grid prop drill) will flip these to operator-visible behavior.

This is the right framing for a Tier-2 partial closure. Don't oversell anchor-only work.

## §VI — Test pattern: subscribe + cleanup probes

The c5 trinity uses a consistent fake-bridge + spy-the-method probe pattern for renderer-side subscription modules:

```typescript
function makeFakeBridge(): FakeBridge {
  const handlers = new Set<Callback>();
  return {
    onSomething: (cb) => { handlers.add(cb); return () => handlers.delete(cb); },
    emitSomething: (payload) => { handlers.forEach((h) => h(payload)); },
  };
}

// Tests:
//   - module pure-fn tests: invoke subscribeToX on fake bridge, verify
//     handler attached + cleanup works
//   - TileGridApp integration tests:
//     - spy on bridge.onSomething → assert called once on mount
//     - replace bridge.onSomething with vi.fn returning cleanup spy →
//       assert cleanup called on unmount
//     - render with bridge missing onSomething → assert no throw
//     - capture callback via property assignment → emit payload via
//       captured handler → assert no throw in callback
```

This 5-test pattern (variant: 4-5 conditions per integration suite) covers all the subscription-anchor checks needed without requiring testing internal React state.

## §VII — Open questions for downstream tickets

These are NOT followups (no Tier label); they are forward-direction questions for the next round of cluster-style tickets to consider:

1. Should `workstation:register-session` IPC + `registry.register/unregister` wiring be in main.ts post-c5 (matching the `frame-mode:set` invocation pattern), or in a new state module mirroring `frame-mode-state.ts`?
2. Should the renderer publish session registry incrementally (1 IPC per spawn/kill) or as a snapshot (1 IPC with full session list on every change)?
3. Should the `_frameMode` state in TileGridApp be hoisted to context for inner-component consumption, or kept locally with prop drill via TileGrid?
4. Should `_lastScrollTargetSessionName` trigger a DOM-scroll directly (imperative via ref) or set a className that CSS handles?

These are downstream-session arbitration points. c5 anchor design is agnostic to them.
