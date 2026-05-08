# BUILD

**Repo:** my-repo
**Plan rev:** 2026-05-08.A

## §1 — Cycle node A

**Goal:** First node in a 3-task cycle (§1 → §3 → §2 → §1).

**Branch:** feat/cycle-a

**Depends on:** §3

**Acceptance:**
- Behavior asserted by probe-03

## §2 — Cycle node B

**Goal:** Second node in the cycle.

**Branch:** feat/cycle-b

**Depends on:** §1

**Acceptance:**
- Behavior asserted by probe-03

## §3 — Cycle node C

**Goal:** Third node in the cycle.

**Branch:** feat/cycle-c

**Depends on:** §2

**Acceptance:**
- Behavior asserted by probe-03
