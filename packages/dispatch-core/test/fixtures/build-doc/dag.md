# BUILD

**Repo:** dispatch-workstation
**Plan rev:** 2026-05-06.A

## §1 — Schema for new feature

**Goal:** Add Zod schema for FeatureRequest.

**Branch:** feat/feature-schema

**Depends on:** —

**Acceptance:**
- Schema lives in dispatch-core/src/v3/schema.ts §N
- Type exports + tests
- 5-package typecheck clean

## §2 — Daemon endpoint

**Goal:** POST /v3/feature consumes the §1 schema.

**Branch:** feat/feature-endpoint

**Depends on:** §1

**Acceptance:**
- Endpoint validates body via Zod
- Integration tests green

## §3 — Workstation IPC

**Goal:** Workstation IPC handler that calls the §2 endpoint.

**Branch:** feat/feature-ipc

**Depends on:** §2

**Acceptance:**
- IPC handler shipped with unit + integration tests
- Runtime-relaunch smoke test passes
