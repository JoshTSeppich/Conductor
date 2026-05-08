# BUILD

**Repo:** group-test
**Plan rev:** 2026-05-08.A

## §1 — Group with H3 children

### §1.1 — First sub-task

**Goal:** Sub-task A.

**Branch:** feat/sub-a

**Depends on:** —

**Acceptance:**
- Stub

### §1.2 — Second sub-task

**Goal:** Sub-task B.

**Branch:** feat/sub-b

**Depends on:** §1.1

**Acceptance:**
- Stub

## §2 — Task depending on group

**Goal:** Depends on entire §1 group; per Q-MBT28-1C, edges expand into per-child edges to §1.1 + §1.2.

**Branch:** feat/depends-on-group

**Depends on:** §1

**Acceptance:**
- Stub
