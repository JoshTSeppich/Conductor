# MB-T-MVP-W1-ORCHESTRATOR-FOCUS-PANE — implementation coordination

**Session:** r12-mvp-w1-orchestrator-focus-pane
**Date:** 2026-05-17
**Purpose:** Cross-wave coordination notes — what this session touched, what parallel sessions touched, where the boundaries held.

---

## §I — Wave-1 commit ladder

| Commit | WB | Subject |
|--------|----|---------|
| `701a1dc` | WB1 RED | probe-01 focus-pane mounts |
| `a904bdb` | WB1 GREEN | focus-pane.tsx mount + adapter-bridge |
| `8697d09` | WB2 RED | probe-02 IPC consumer |
| `ec0b6a2` | WB2 GREEN | focus-pane-ipc.ts renderer-side consumer |
| `dbac379` | WB3 RED | probe-03 header pid/uptime/cpu/budget |
| `94aea81` | WB3 GREEN | focus-pane-header.tsx chrome |
| `0ba31a3` | WB4 RED | probe-04 layout 60vw overlay + header integration |
| `da80420` | WB4 GREEN | overlay layout + FocusPaneHeader integration |
| `79e2cd2` | WB5 RED | probe-05 build.md step counters |
| `1c9e183` | WB5 GREEN | focus-pane-header step counters |
| `483dd64` | WB6 | probe-06 e2e broadcast pipeline integration |
| `deeddf9` | WB7 | production wiring (mount.ts + esbuild script + main.ts sentinel) |
| _(this commit)_ | WB-final | amendments + closure docs + FOLLOWUPS rows |

---

## §II — Parallel Wave-2 coordination

Wave-2 (`r12-mvp-w2-agent-grid`) ran in parallel and closed at `ec9b847` per design-audit §3. Wave-2's territory was `packages/dispatch-workstation/src/tile-grid/**` + `test/unit/tile-grid/**` + their own docs.

### §II.1 Cross-wave finding raised by Wave-2

Wave-2 surfaced `MB-F-WAVE-1-FOCUS-PANE-TSCONFIG-EXCLUDE-MISSING` at their WB-final findings — they observed that my WB1 GREEN `a904bdb` introduced `.tsx` files into `src/orchestrator-focus-pane/` without amending `tsconfig.json` to exclude them, breaking workstation typecheck.

**Wave-1 response:** confirmed reproducible via `pnpm --filter dispatch-workstation typecheck` at 19:30 MDT. Surfaced HALT-1 to operator with proposed remediation. Operator + gen-7 GRANTED tsconfig amendment (CLAUDE.md §3.4 mechanical-translation envelope ack 19:50 MDT). Amendment applied at this WB-final commit; cross-wave row closes here.

### §II.2 Per-path discipline outcomes

`git status --short` was checked before every Wave-1 commit. Wave-2's untracked artifacts (probe-03 + probe-04 + decisions + findings docs in tile-grid territory) appeared in the working tree at various points but never leaked into Wave-1 commits because per-path `git add <pathspec>` + `git commit -o <pathspec>` was used uniformly.

Re-validates memory `feedback_per_path_discipline_catches_cross_session_staging_leak.md`.

### §II.3 Territory partitioning held

Final audit at WB-final:
- Wave-1 touched: `src/orchestrator-focus-pane/**`, `src/main/main.ts` (sentinel-bracketed insert only), `scripts/build-orchestrator-focus-pane.mjs`, `test/unit/orchestrator-focus-pane/**`, `test/integration/probe-mbt-mvp-w1-06-*.test.ts`, `tsconfig.json` (HALT-1 amendment), `workstation-shell.html` (HALT-1 amendment), `docs/coordination/mb-t-mvp-wave-1-*.md`, `docs/build-docs/CONDUCTOR_MB-T-MVP-W1-*.md`, `docs/FOLLOWUPS.md` (operator-stamp envelope).
- Wave-2 touched: `src/tile-grid/**`, `test/unit/tile-grid/**`, `docs/coordination/mb-t-mvp-wave-2-*.md`, `docs/build-docs/CONDUCTOR_MB-T-MVP-W2-*.md`.
- main.ts has TWO sentinel-bracketed touch zones (Wave-2 may have edited within their existing tile-grid mount zone; my Wave-1 zone is at lines 1152-1180). Per CLAUDE.md §3.3 sentinel-zone partitioning, no overlap conflict.

---

## §III — Design-bundle reads (post-WB5)

Per operator-amendment 19:20 MDT, design-bundle reads landed BEFORE WB6 implementation:

| File | Purpose |
|------|---------|
| `docs/design-handoff/conductor-v-mvp/project/orchestrator-strip.jsx` | OrchestratorStrip design (NOT Wave-1 territory; deferred to EXPANSION-1) |
| `docs/design-handoff/conductor-v-mvp/project/tmux-pane.jsx` | TmuxPane (big) reference — guides EXPANSION-1 design-conformance work |
| `docs/coordination/conductor-v-mvp-design-audit-2026-05-17.md` | Full audit identifying §V design-conformance gaps |

Design-conformance gaps catalogued in findings §V; deferred to operator-acked next-cycle EXPANSION-1 (operator 19:50 MDT).

---

## §IV — HALT cycles

| HALT | Time (MDT) | Subject | Resolution |
|------|------------|---------|------------|
| HALT-0 | 17:50 → 17:55 | Phase-1 arbitration (7 Qs + 7 Rs) | Single-line ack: Q3=(a) Q4=(a) Q6=(c) Q7=(a) R1=defer R3=unblocked-by-Q6 + gen-7 V4 §C(VIII) coarch authority for non-blocking auto-acks Q1/Q2/Q5 |
| Operator-amendment | 19:20 | Design-bundle read requirement + tsconfig blocker notice + EXPANSION-1 grant for next cycle | Acked + read design bundle + filed HALT-1 for tsconfig |
| HALT-1 | 19:30 → 19:50 | tsconfig.json + workstation-shell.html territory amendment | gen-7 V4 §C(VIII) GRANT BOTH per CLAUDE.md §3.4 mechanical-translation |

---

## §V — Next-cycle EXPANSION-1 territory (operator 19:50 MDT)

Operator GRANTED next-cycle territory expansion for this session (recyclable at next-startup):
- Topbar (`app.jsx:284-309`-equivalent surface; brand + version pill + N panes · M running counts + budget meter)
- OrchestratorStrip (`orchestrator-strip.jsx`-equivalent; segmented progress bar + 64-slot grid + rate/ETA stats)
- TmuxPane body styling design-conformance (ASCII banner, line-class colors, blinking cursor, paneIn/paneOut animations, IBM Plex Mono body)

**Current Wave-1 scope is unchanged — finish at this WB-final commit + STANDBY-ACK. EXPANSION-1 work happens at next-startup if/when the operator authorizes.**

---

## §VI — Standing recommendations for parallel-cairn sessions

### §VI.1 Always verify `tsconfig.json` exclude after introducing new `.tsx` files

Pattern: when adding a NEW renderer-side directory with `.tsx` files, the directory needs to be appended to `tsconfig.json` exclude (because tsconfig.json does NOT enable jsx at compiler-options level — it excludes every .tsx file individually or by directory).

This is a Tier-1-class trap that breaks workstation typecheck. Wave-1 hit it; Wave-2 hit it (separately, then surfaced as a finding against Wave-1). Future sessions should add the exclude entry in the same commit as their first .tsx file. See CLAUDE.md §3.3 amendment scope.

### §VI.2 Build-script chain wiring needs explicit operator territory grant

`package.json` is READ-ONLY by default. Adding a new `node scripts/build-<surface>.mjs` to the `build` script chain requires explicit territory amendment. Sessions introducing a new renderer bundle should surface this at HALT-1 alongside any other amendments (tsconfig, shell.html), so one round-trip covers all three.

### §VI.3 Integration probes can verify composition without booting Electron

Pattern from WB6 (probe-06): fake only the ipcMain.send → ipcRenderer.on seam; import everything else REAL (pty-stream-relay.ts, focus-pane-ipc.ts). Tests run in vitest happy-dom-less context (no environment annotation needed) in ~70ms. Verifies the full composition path is intact. Worth codifying as a probe-authoring pattern recommendation.
