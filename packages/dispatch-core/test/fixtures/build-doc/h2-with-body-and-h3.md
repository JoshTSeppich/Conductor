# BUILD

**Repo:** h2-body-and-h3
**Plan rev:** 2026-05-08.A

## §1 — H2 with both body fields and H3 children

**Goal:** This H2 has body fields AND H3 children, which is malformed per Q-MBT28-1B (H2 must be either a task without H3s OR a group without body fields, not both).

**Branch:** feat/h2-mixed

**Depends on:** —

**Acceptance:**
- Surfaces task.malformed-heading

### §1.1 — Child of malformed H2

**Goal:** Child task.

**Branch:** feat/h2-child

**Depends on:** —

**Acceptance:**
- Stub
