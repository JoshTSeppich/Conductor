---
schema_version: 1
schema_contract: docs/coordination/ORCHESTRATOR_STATE_CONTRACT.md
---

# Orchestrator Self-Restart Protocol v1

Boot a fresh orchestrator session from the live state INSTANCE. Mirrors HSO peer cold-standby-with-trigger architecture: predecessor writes final state at context-pressure threshold → operator invokes spawn → successor boots from state file → predecessor deep-halts.

## §1 — Trigger threshold

**Predecessor invokes self-restart when:**

- Context token count crosses **~750k of 1M** (75% of Opus 4.7 1M context window), OR
- Predecessor surfaces explicit `HALT-CONTEXT-PRESSURE-RESTART` per anti-fabrication discipline, OR
- Operator explicitly invokes restart per operational decision

**Why 750k**: leaves ~250k headroom for:
- Final state-snapshot authoring (~50k for INSTANCE re-write)
- Closing dispatch surfaces in flight
- §INVARIANT-4 final-state commit + push
- Safety margin against unexpected response-token consumption

**Anti-pattern**: waiting until >950k. Authoring the state-snapshot ITSELF consumes tokens; running out of context mid-snapshot leaves successor with an incomplete INSTANCE.

## §2 — Spawn command

Per operational primitive `paste-buffer-dispatch` precedent in `ORCHESTRATOR_STATE_CONTRACT §4`:

```bash
# Generate successor name (increment counter)
NEW_ORCHESTRATOR="orchestrator-$(date +%Y-%m-%d-%H:%M)"

# Spawn fresh tmux session with Opus 4.7 claude CLI
tmux new-session -d -s "$NEW_ORCHESTRATOR" -x 220 -y 50 \
  -c /Users/joshuatseppich/Desktop/Automata/foxworks-dispatch \
  "/Users/joshuatseppich/.local/bin/claude --dangerously-skip-permissions --model claude-opus-4-7"

# Verify successor spawned
tmux has-session -t "$NEW_ORCHESTRATOR" 2>&1 && echo "spawned ok"
```

## §3 — First-message prompt for successor

Operator pastes the following as the successor's FIRST user message via `tmux paste-buffer` + double-Enter:

```text
You are the successor orchestrator. Predecessor session reached context-pressure threshold and wrote a final state snapshot. Boot per the following protocol — strictly no autonomous work until you complete this checklist.

BOOT CHECKLIST (do all in order before any dispatch):

1. READ — in this order:
   - CLAUDE.md (project methodology + frozen-contract awareness)
   - docs/coordination/ORCHESTRATOR_STATE_CONTRACT.md (the schema you operate from)
   - docs/coordination/orchestrator-state-current.md (the live state instance)

2. VERIFY (per INVARIANT-5 — read before dispatch):
   - tmux list-sessions  (must match §5 sessions list; flag drift)
   - git --no-pager log --oneline -5  (must include §7 gate-commit-references)
   - git --no-pager log --oneline origin/main..HEAD  (expect empty per §2.6)
   - git status --short  (expect clean unless predecessor noted in-flight state)
   - For each session in §5: tmux capture-pane -p -t <session> | tail -10  (verify status enum matches actual pane state)

3. RECONCILE:
   - Per INVARIANT-1: actual gate state vs §7 recorded state — if drift, flag at HALT
   - Per INVARIANT-6: if you read §5 claiming session X is `idle-standby` but capture-pane shows X is mid-active-work, this is a load-bearing invariant violation — HALT and surface

4. SURFACE HALT-ORCHESTRATOR-N-LOADED to operator with:
   - boot timestamp
   - your session ID (matches NEW_ORCHESTRATOR name from spawn command)
   - predecessor session ID (from §header.session_id)
   - any drift detected during VERIFY step
   - your understanding of §9 next_actions (paraphrase to demonstrate read)
   - any open arbitration questions you have for operator

5. WAIT for operator ack of HALT-ORCHESTRATOR-N-LOADED before any dispatch, commit, or sub-session interaction.

CRITICAL CONSTRAINTS:

- DO NOT modify CLAUDE.md, ORCHESTRATOR_STATE_CONTRACT.md, or any frozen contract without operator arbitration
- DO NOT dispatch to sub-sessions before operator ack
- DO NOT assume §5 sub-session states without capture-pane verification
- DO NOT process §9 next_actions in your boot turn — that's post-ack work

After operator acks HALT-ORCHESTRATOR-N-LOADED, you operate per ORCHESTRATOR_STATE_CONTRACT §8 discipline (strict_mode + auto_ack_scope + hard_escalation_triggers).

The predecessor session is at deep-halt awaiting operator confirmation of successful handoff. After operator confirms via chat, operator will:
- tmux kill-session -t <predecessor-name> (deprecation cleanup)
- Update §header.session_ended_at of orchestrator-state-current.md to mark deprecated
- All subsequent coordination flows through you

START BOOT CHECKLIST.
```

## §4 — Cleanup command (post-successor-confirmed)

Operator runs AFTER successor surfaces HALT-ORCHESTRATOR-N-LOADED + operator validates handoff:

```bash
# Deprecate predecessor (final state-snapshot already written; this just frees tmux + kills idle Claude)
PREDECESSOR=orchestrator-2026-05-10-21:07
tmux kill-session -t "$PREDECESSOR"

# Verify cleanup
tmux list-sessions 2>&1 | grep -v "$PREDECESSOR" || echo "predecessor cleared"
```

## §5 — Deprecation commit (predecessor's final commit)

Predecessor's LAST act before deep-halt is committing a §header update marking deprecated. Pattern:

```bash
# In predecessor's bash (last action before HALT-DEPRECATED):
# Update orchestrator-state-current.md §header:
#   session_ended_at: <ISO-8601 timestamp>
#   status: deprecated

git add docs/coordination/orchestrator-state-current.md
git commit -m "$(cat <<'EOF'
docs(orchestrator-state-current): predecessor session deprecated at handoff

Final state-snapshot per ORCHESTRATOR_STATE_CONTRACT §INVARIANT-4. Successor
session <NEW_ORCHESTRATOR> confirmed operational via HALT-ORCHESTRATOR-N-LOADED.
No further dispatches from this predecessor.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)" -- docs/coordination/orchestrator-state-current.md
git push origin main
```

## §6 — Drift-handling at successor side

Per INVARIANT-1 + INVARIANT-6, if successor's VERIFY step finds drift between §state-instance and actual repo/tmux state:

1. **Capture drift**: list the specific divergences (e.g., "§5 says T2 status=idle-standby; capture-pane shows T2 active mid-WB7-PRE-COMMIT")
2. **Surface to operator**: HALT-ORCHESTRATOR-N-LOADED with drift block named
3. **Do NOT auto-resolve**: operator decides whether to reconcile state-instance OR proceed with actual state OR halt for diagnosis
4. **NEVER assume predecessor's snapshot is more authoritative than current observation**: per INVARIANT-6, gaps surface; current is canonical for sub-session states

## §7 — Invariants enforced by this protocol

- **INV-RP-1**: One predecessor + one successor at a time. No overlapping orchestrators issuing dispatches.
- **INV-RP-2**: Successor's first action is boot-checklist; second action is HALT-ORCHESTRATOR-N-LOADED; third action awaits operator.
- **INV-RP-3**: Predecessor's last action is deprecation-commit + deep-halt surface. After deprecation, predecessor processes no further dispatches.
- **INV-RP-4**: Operator owns the spawn/kill cycle. Orchestrators do not self-spawn or self-kill (they may write the state-snapshot that triggers operator's spawn, but the spawn command itself is operator-initiated).
- **INV-RP-5**: State file is the canonical handoff medium. Chat-based handoff briefs are anti-pattern (motivation for this protocol).

## §8 — Anti-patterns

- ❌ Predecessor authors the state file then immediately starts using its content as if it were the successor (the predecessor IS the predecessor; the file is for the successor)
- ❌ Successor skips VERIFY step and trusts §5 sub-session states (INVARIANT-5 violation)
- ❌ Successor dispatches before HALT-ORCHESTRATOR-N-LOADED operator-ack
- ❌ Predecessor continues processing dispatches after deprecation commit (INV-RP-3 violation)
- ❌ Multiple successors spawned simultaneously (INV-RP-1 violation; collision risk)
- ❌ Operator pastes a partial/modified first-message prompt that omits VERIFY (degrades INVARIANT-5)

## §9 — Future enhancements (not in scope for v1)

- Automated trigger: predecessor invokes spawn directly when crossing 750k threshold (currently operator-mediated; v2 may automate)
- Multi-successor warm-standby: like HSO active/standby pool — useful if predecessor crash is catastrophic
- State-instance schema versioning: track migrations as schema evolves

---

**End of self-restart protocol v1.**

Authored under §3.4 mechanical translation; ratification pending operator HALT-FROZEN-CONTRACT-PRE-COMMIT review.
