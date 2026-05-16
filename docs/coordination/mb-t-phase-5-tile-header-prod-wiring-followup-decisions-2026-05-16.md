# MB-T-PHASE-5-TILE-HEADER-PROD-WIRING-FOLLOWUP — Decisions

Mid-ladder operator/orchestrator arbitrations, ratified Sub-Q binding outcomes, and rationale anchors. Companion to the findings doc.

---

## §1 — Q-PHASE5PW-1: renderer-safe HttpSessionListClient pathway

**Disposition**: OPT-β (preload bridge + mount.ts fetch + token) — operator-arbitrated by gen-6 2026-05-16 post HALT 0 ANNOUNCEMENT.

**Refinement at HALT 0 phase-1 diagnose**: Discovered pre-existing `workstation:get-daemon-token` IPC handler at `main.ts:466` (Fix-92 sentinel zone, cairn finding #92). Reuse eliminates main.ts amendment originally anticipated under OPT-α; reduces ladder cost from "preload + main.ts + WORKSTATION_CONTRACT.md amendment" to "preload-method-addition only".

**Rejected alternatives**:
- **(a) Direct `new HttpSessionListClient(...)` in mount.ts**: Structurally unsafe. session-cap.ts:138-140 top-level imports `node:fs / node:path / node:os`; build-tile-grid.mjs:30 targets `platform:'browser'`. Confirmed at commit `4a9633c` Option A amendment. Re-creating the same failure mode in mount.ts inevitable.
- **(c) OPT-α**: New IPC channel + main.ts handler + preload.mts bridge + WORKSTATION_CONTRACT.md §6 amendment. Operator-arbitration cost higher; supersded by Fix-92 reuse during HALT 0.

**Confidence**: [KNOWN] — full Q-PHASE5PW-1 disposition arbitrated, manifest expansion granted, ladder shipped.

---

## §2 — Bridge method shape: getDaemonToken (not listSessions)

**Disposition**: Expose `workstationBridge.getDaemonToken()` returning `Promise<string | null>`; mount.ts uses fetch directly with the returned token.

**Rejected alternative**: Wrap full `listSessions()` HTTP call in preload (preload runs fetch internally; renderer only receives the JSON response).

**Rationale**:
- Gen-6 OPT-β ack 2026-05-16 explicitly specified "mount.ts uses fetch + token" — operator-arbitrated bridge shape.
- Token exposure to renderer is consistent with kanban-webview precedent at `card-bridge-preload.mts:53-66` (writes token to localStorage). No new attack surface beyond what Fix-92 established.
- `getDaemonToken` shape is smaller (1 method, no params, no return shape variance) than `listSessions` (would need pagination/filtering parameters mirroring HttpSessionListClient).
- Future flexibility: any renderer-side endpoint can reuse `getDaemonToken` + fetch pattern without new preload methods per endpoint.

**Confidence**: [KNOWN] — implementation shipped at WB1 GREEN `2a93e00`.

---

## §3 — Sync-then-async render pattern in tryAutoMountTileGrid

**Disposition**: First-render synchronously WITHOUT `statusListClient`; resolve via `buildRendererStatusListClient().then(...)`; second-render WITH the client.

**Rejected alternatives**:
- **Async-only render**: Block first paint on token IPC. Risk: TILE_GRID_MOUNTED sentinel timing changes; visual regression (delayed initial paint).
- **Sync-only render with cached token**: Renderer can't read token from disk; would require synchronous IPC (deprecated by Electron security model under contextIsolation:true).

**Rationale**:
- Preserves the existing immediate-mount ordering (operator sees tile-grid surface immediately on bundle load).
- The existing `useEffect` at `tile-grid-app.tsx:357-370` already guards against `statusListClient=undefined` (skip subscription) and handles transition to defined (subscribe). No React state-update warning, no re-mount.
- Fallback chain at `tile-grid-app.tsx:509` (`snapshot.get ?? s.status ?? 'idle'`) handles both phases gracefully.

**Confidence**: [KNOWN] — implementation shipped at WB2 GREEN `6d106dc`; 51/51 tile-grid suite passes.

---

## §4 — Type-only import as bundle-safety hatch

**Disposition**: Use `import type { StatusListClient } from '../main/session-status-source.js'` in mount.ts (renderer-bundled file).

**Rejected alternative**: Define a local `StatusListClient` interface in mount.ts to avoid the cross-package type import.

**Rationale**:
- `import type` is fully erased by both TypeScript and esbuild — no runtime bundle pull.
- Confirmed by successful renderer build at WB2 GREEN (no `Could not resolve "node:fs|path|os"` errors).
- Single source of truth for `StatusListClient` interface (lives at `session-status-source-poll.ts:47-55`) — local duplication would invite future drift.
- Reusable pattern for any future renderer→main type sharing crossing the node/browser bundle boundary.

**Confidence**: [KNOWN] — bundle CLEAN at WB2 GREEN; tracked as methodology observation §IV in findings doc.

---

## §5 — Daemon URL hardcoding

**Disposition**: Hardcode `http://localhost:7878` in the renderer-side StatusListClient (matches `DEFAULT_DAEMON_URL` in `session-cap.ts:143`).

**Rejected alternatives**:
- **Expose `getDaemonUrl()` bridge method**: Doable but expanded WB2 scope.
- **Read process.env in renderer**: Not contextBridged; would require additional preload method.

**Rationale**:
- Pragmatic: 99%+ of operator deployments run the daemon at localhost:7878 (the default).
- `FOXWORKS_DAEMON_URL` env-override is honored by `HttpSessionListClient` (used by spawn-ipc) but not by the renderer-side adapter. **Documented divergence** filed as `MB-F-PHASE5PW-RENDERER-DAEMON-URL-ENV-OVERRIDE-DIVERGENCE` (Tier 2) at findings §VIII.1.
- Defers complexity until a concrete deployment needs it.

**Confidence**: [KNOWN] — implementation shipped + divergence documented.

---

## §6 — Probe-02 (mount-integration) not authored

**Disposition**: 2-WB ladder satisfied by probe-01 (mount.ts text-pattern) + probe-03 (preload.mts text-pattern). probe-02 (full JSX mount integration) deferred.

**Rejected alternative**: Author probe-02 as additional ratification at WB2.

**Rationale**:
- Manifest listed probe-02 as available but did not require it.
- Static probes (probe-01 + probe-03) + renderer build CLEAN + tile-grid suite non-regression (51/51) + runtime smoke (BOOTSTRAP_TOKEN_WRITTEN) provide multi-source evidence the wiring is live.
- Full-mount integration probe would mock window.workstationBridge + fetch + setTimeout — high-mock-density test with limited additional confidence over the existing layered evidence.
- Defer until concrete regression risk surfaces (e.g., future refactor of tryAutoMountTileGrid breaks sync-then-async semantics).

**Confidence**: [KNOWN] — scope decision; mitigations documented.

---

## §7 — RESOLVED stamp at FOLLOWUPS.md:367

**Disposition**: Propose stamp body for operator-stamp envelope (gen-6 files per dispatch §66). Body composed at findings doc §VI.

**Rejected alternative**: Direct edit of FOLLOWUPS.md from this session.

**Rationale**:
- FOLLOWUPS.md is READ-ONLY for this session per manifest (write reserved for operator-arbitrated stamping).
- Operator dogfood (visual Frame B status dots) is the final verification step; orchestrator-filed stamp closes the loop after that verification.

**Confidence**: [KNOWN] — stamp body composed; awaiting gen-6 file action.

---

## §8 — Open arbitration questions (none)

No open arbitrations at WB-final. All Sub-Q dispositions binding per gen-6 OPT-β ack + mid-ladder refinements documented above.

---

## §9 — Cross-session coordination summary

**Path-disjoint sibling sessions during this ladder**:
- `r12-t1c-w1-t08-onboarding-renderer-mount` — writes `src/onboarding/**` (resolved STALE per gen-6 dispatch_queue_current `735703f`; closure already shipped at `9cc238b`).
- `r12-archive-writer` — writes `docs/cairn-under-stress-round-12.md` only.
- `r12-t1c-w1-postpull-discipline` (or equivalent at `23f7c88`) — writes `packages/dispatch-core/**`.
- `r12-t1c-w1-pcacc` (parallel-cairn-atomic-commit work; new closure session per gen-6 expansion) — writes `packages/dispatch-cli/test/cairn-atomic-commit/**` + `docs/build-docs/CONDUCTOR_MB-F-PARALLEL-CAIRN-SHARED-INDEX-RACE-WINDOW_BUILD.md` + companion docs.

**Cross-session contamination events observed**:
- 2 staging-leak events (WB2 RED + WB2 GREEN pre-commit) where sibling-session-staged files appeared in shared index. Resolved via `git reset HEAD` + per-path re-stage + per-path `git commit -o <pathspec>` per memory pattern `feedback_per_path_discipline_catches_cross_session_staging_leak.md`. Each commit verified via `git log -1 --stat` post-commit; ONLY my pathspec landed in each.

**Methodology observation**: parallel-cairn shared-working-tree contexts continue to exhibit transient staging-leak windows. The per-path discipline (CLAUDE.md §2.7) is load-bearing — every commit must use `git commit -o <pathspec>` to restrict the commit to the named path regardless of what's in the shared index. Already-tracked at `MB-F-PARALLEL-CAIRN-SHARED-INDEX-RACE-WINDOW` (Tier 1 per Round 12 §1.1 NEW EMERGENT CLASS; this session contributes another data point).

---

**End decisions doc.**
