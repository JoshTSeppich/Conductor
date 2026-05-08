# BUILD

**Repo:** goal-multiline
**Plan rev:** 2026-05-08.A

## §1 — Multi-line goal task with Speculative false

**Goal:** First line of the goal paragraph.
Second line of the goal accumulates here.
Third line as well.

**Branch:** feat/multi-goal

**Depends on:** —

**Acceptance:**
- multiline goal joined into single paragraph

**Speculative:** false

## §2 — Goal followed directly by next field (no blank line)

**Goal:** Quick goal.
**Branch:** feat/quick
**Depends on:** §1
**Acceptance:**
- Goal flushed when entering next field
