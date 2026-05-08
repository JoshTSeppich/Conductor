# BUILD

**Repo:** my-repo
**Plan rev:** 2026-05-06.A

## §1 — Add login endpoint

**Goal:** POST /v1/login that takes {email, password}, returns {token}.

**Branch:** feat/login

**Depends on:** —

**Acceptance:**
- Endpoint returns 200 + token on valid creds
- Returns 401 on invalid creds
- Unit + integration tests green
