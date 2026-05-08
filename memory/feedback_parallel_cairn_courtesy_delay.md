---
name: parallel-cairn courtesy-delay protocol is harness-conditional
description: In shared-tree parallel-cairn sessions, ~30s courtesy delay before atomic-chain commits mitigates index-race; but Claude Code 2.1.133 may hard-block leading `sleep` — workaround is sleep AFTER a cheap initial command.
type: feedback
---

In shared-working-tree parallel-cairn (multiple Claude Code sessions on the
same checkout), the operator's coordination protocol calls for a ~30s
**courtesy delay** before launching every atomic-chain commit. Pattern:

```
git status --short && sleep 30 && git pull --ff-only && git add ... && \
git diff --cached --name-only | sort > /tmp/staged.txt && \
diff /tmp/staged.txt <(printf "...intended paths...\n" | sort) && \
git commit -m "..." && git push origin main
```

**Why:** Per `MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT` (FOLLOWUPS.md
Tier 1), the atomic-chain `&&` boundary between `diff --cached` verify and
`git commit` is a race window — another terminal's `git add` mutating the
shared index in that window sweeps their paths into this commit (factually
wrong Q7 self-check). The ~30s delay is a probabilistic mitigation, not a
guarantee. Verified across MB-T21 WB1-WB5: 4 cairn-grammar commits + WB5
docs commit, zero subsequent index-race incidents (Q7 verified TRUE on
post-commit `git log -1 --name-only` for every commit after Phase 1
e02aa52).

**Harness-conditional caveat:** Claude Code 2.1.133's bash sandbox may
block leading `sleep` (`Long leading sleep commands are blocked`). Operator
report 2026-05-07: Terminal C and Terminal D hit this hard block during
the 4-session run; Terminal A (this session) was able to execute. Cause
unknown — possibly Claude Code version drift between sessions, possibly
per-session policy state. **Workaround:** put sleep AFTER a cheap initial
command (e.g., `git status --short && sleep 30 && git pull ...`) — the
sandbox only blocks sleep that LEADS the chain.

**How to apply:**
- Apply at every cairn-grammar commit when the session is one of N≥3
  parallel sessions sharing a working tree.
- Skip if the session is solo OR running in its own `git worktree` per
  CLAUDE.md §4.3.
- Always pair with: per-path `git add <path>` (no `-A`/`.`), atomic-chain
  diff-verify-then-commit, AND post-commit Q7 verification against
  `git log -1 --name-only` (not pre-commit `git status`).
- If the chain reports "Long leading sleep blocked," prepend a no-op cheap
  command (`git status --short`, `:`, etc.) and re-issue.
- **Third occurrence of index-race in any session triggers all-sessions
  halt + structural pivot to `git worktree`.** Two occurrences observed
  in this codebase: MB-T18 WB1 (`ecdd0e4`) and MB-T21 Phase 1 (`e02aa52`).
  Round 3 should plan worktree isolation from session start at session
  count ≥3.
