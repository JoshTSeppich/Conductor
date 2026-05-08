# BUILD

**Repo:** my-repo
**Plan rev:** 2026-05-08.A

## §1 — Task A on shared branch

**Goal:** First parallel task. Neither §1 nor §2 depends on the other; both share the branch `feat/parallel-branch`.

**Branch:** feat/parallel-branch

**Depends on:** —

**Acceptance:**
- Behavior asserted by probe-05

## §2 — Task B on same branch

**Goal:** Second parallel task on same branch as §1; no sequential chain via Depends on.

**Branch:** feat/parallel-branch

**Depends on:** —

**Acceptance:**
- Behavior asserted by probe-05
