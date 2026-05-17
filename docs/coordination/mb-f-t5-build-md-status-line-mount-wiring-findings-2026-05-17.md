# MB-F-T5-BUILD-MD-STATUS-LINE-MOUNT-WIRING — Findings

**Session**: r12-cw2-t5-build-md-status-line-mount
**Closure-target row**: docs/FOLLOWUPS.md:353 (Tier 2)
**Cascade window**: Round 12 V4 R12-CLOSURE-Wave-2 (gen-7 GREEN-LIGHTED 2026-05-17)
**Date**: 2026-05-17
**Outcome classification (per CLAUDE.md §2.11)**: **Capability enabled with known limitations** — BuildMdStatusLine is now mounted + visible in FrameCRoot with operator-clickable spawn-trigger; production-runtime smoke deferred to broader integration cycle (no `src/main/*.ts` touch, so §4.6 runtime-launch smoke not strictly required by manifest).

---

## §I — Phase-1 diagnose

| Q | Answer | Confidence | Evidence |
|---|---|---|---|
| Q1: Does `build-md-status-line.tsx` exist? | YES — 84-line component exports `BuildMdStatusLine({result, onSpawnTriggerClick?})` | [KNOWN] | Direct Read at HEAD; component shipped at `5c53b04` per `git log -- packages/dispatch-workstation/src/frame-c/build-md-status-line.tsx`. |
| Q2: Mounted in `frame-c-root.tsx`? | NO at session start | [KNOWN] | `grep BuildMdStatusLine packages/dispatch-workstation/src/frame-c/frame-c-root.tsx` returned empty pre-WB1. Row NOT stale. |
| Q3: IPC bridge for readBuildMd + triggerBuildMdDispatch? | YES — already shipped at `preload.mts:275, 288` within T5 sentinel zones | [KNOWN] | `grep` confirms; `WORKSTATION_CONTRACT.md:402-405,498-515` documents `Promise<BuildMdDispatchTriggerResult>` shape; no new IPC channel needed. |

**Stale-dispatch check**: `git --no-pager log --all --grep "MB-F-T5-BUILD-MD-STATUS-LINE-MOUNT-WIRING"` returned only the WB12 filing commit (`87c04b6`, "WB12 — findings doc + 7 new FOLLOWUPS rows"). No CLOSED/RESOLVED/SHIPPED prior commits. **NOT STALE — proceed.**

---

## §II — WB ladder summary

| WB | Verb | Subject | SHA | Probe |
|---|---|---|---|---|
| WB1 RED | `red` | probe-mbf-t5-01 asserts FrameCRoot mounts BuildMdStatusLine + invokes readBuildMd on mount | `23370c5` | 3 conditions failing |
| WB1 GREEN | `green` | mount BuildMdStatusLine in FrameCRoot + useEffect readBuildMd on mount | `c03d32d` | 3/3 GREEN |
| WB2 RED | `red` | probe-mbf-t5-02 asserts spawn-trigger click invokes triggerBuildMdDispatch + re-fetches status | `f90eb7f` | 2/3 RED (Cond 1 pre-passing via WB1) |
| WB2 GREEN | `green` | wire onSpawnTriggerClick → triggerBuildMdDispatch + re-fetch readBuildMd | `6acf1f2` | 3/3 GREEN; full frame-c suite 30/30 files, 157/157 tests GREEN |
| WB-final | `green` | targeted suite + 5-package typecheck + findings + decisions + FOLLOWUPS stamp | _(this commit)_ | All gates pass |

---

## §III — Verification matrix

### §III.1 — Targeted probe verification

- **probe-mbf-t5-01-build-md-status-line-mounted.spec.tsx**: 3/3 GREEN at WB1 GREEN landing. [KNOWN per `pnpm --filter dispatch-workstation exec vitest run` output 08:55:30]
- **probe-mbf-t5-02-spawn-trigger-click-wires.spec.tsx**: 3/3 GREEN at WB2 GREEN landing. [KNOWN per same tool 08:58:29]

### §III.2 — Adjacent regression (frame-c suite full)

| Suite | Count | Status |
|---|---|---|
| All frame-c probes (30 files) | 157 tests | **30/30 files GREEN, 157/157 tests pass** |

[KNOWN per `pnpm --filter dispatch-workstation exec vitest run test/unit/frame-c/` output 08:58:33].

### §III.3 — 5-package typecheck (per CLAUDE.md §4.4, one command at a time)

| Package | Status | Output |
|---|---|---|
| dispatch-core | PASS | clean tsc exit |
| dispatch-daemon | PASS | clean tsc exit |
| dispatch-workstation | PASS | clean tsc exit |
| dispatch-cli | PASS | clean tsc exit |
| dispatch-web | PASS | clean tsc exit |

[KNOWN per per-package `pnpm --filter <pkg> typecheck` invocations 08:58:50–08:59:10].

### §III.4 — Runtime-launch smoke (per CLAUDE.md §4.6)

**N/A** — scope did not touch `packages/dispatch-workstation/src/main/*.ts`. Only frame-c renderer touched.

### §III.5 — dispatch-core dist rebuild (per CLAUDE.md §3.4)

**N/A** — scope did not touch dispatch-core.

---

## §IV — Implementation summary

### §IV.1 — `packages/dispatch-workstation/src/frame-c/frame-c-root.tsx` changes

1. **Imports added**:
   - `BuildMdStatusLine` from `./build-md-status-line.js`
   - `type BuildMdLoadResult` from `../build-md/types.js`
2. **Narrow bridge interface added** (`BuildMdWindowBridge` + `WindowWithBuildMdBridge`) — mirrors `detail-pane.tsx:543-547` `WindowWithBridge` pattern for typing globalThis-window access without coupling FrameCRoot to the full `WorkstationBridgeShape`.
3. **Layout restructure**: outer `frame-c-root` flipped `flexDirection: 'row'` → `'column'`; introduced unlabeled `BODY_ROW_STYLE` div wrapping the existing SessionList + DetailPane two-column layout; appended `BOTTOM_STATUS_ROW_STYLE` div containing the BuildMdStatusLine. Preserves descendant testid query semantics (verified via WB1+WB2 GREEN + frame-c suite regression).
4. **WB1 state**: `useState<BuildMdLoadResult | null>(null)` + `useEffect` on mount → `bridge.readBuildMd?.()` with cancellation flag (mirrors `detail-pane.tsx:572-597` pattern). Bridge / method absence is no-op.
5. **WB2 handler**: `handleSpawnTriggerClick` invokes `bridge.triggerBuildMdDispatch?.()` then chains `bridge.readBuildMd?.()` to refresh state. Passed as `onSpawnTriggerClick` prop to `BuildMdStatusLine`.

### §IV.2 — No other files changed

No `preload.mts`, no `main.ts`, no `WORKSTATION_CONTRACT.md`, no `dispatch-core` schema, no new IPC. **All required surfaces existed at HEAD.**

---

## §V — Known limitations

1. **Re-fetch is best-effort silent**: errors thrown by `bridge.triggerBuildMdDispatch` or the re-fetch `bridge.readBuildMd` chain are swallowed in `handleSpawnTriggerClick`. The prior `buildMdResult` persists on UI; operator sees no visual signal of trigger failure beyond the absent count-refresh. Filing as **Tier 3 followup `MB-F-T5-SPAWN-TRIGGER-CLICK-FAILURE-VISIBILITY`** at WB-final.
2. **No initial-load failure indicator**: when initial `bridge.readBuildMd()` rejects, `buildMdResult` stays `null` and the entire status line stays hidden. Renderer cannot distinguish "no bridge / non-Electron env" from "load failed silently". Filing as **Tier 3 followup `MB-F-T5-INITIAL-LOAD-FAILURE-INDICATOR-HIDDEN`** at WB-final.
3. **Runtime-launch smoke deferred**: per CLAUDE.md §4.6, smoke is mandatory only for `src/main/*.ts` touches. Renderer-only mounts inherit no §4.6 obligation, but the production-runtime visual check (operator observes the status line + clickable Spawn button in a live Electron window) is implicitly load-bearing for "operator-visual bottom-status-line is the wireframe-parity acceptance bar" per the closure row body Tier 2 rationale. Deferred to broader integration cycle (separate operator-driven Electron launch).
4. **Layout restructure side-effect risk**: the `frame-c-root` outer flex direction flipped from `row` to `column`. If any future probe queries computed-style on the root assuming row layout, it would break. Full frame-c suite (30 files / 157 tests) passes at WB-final, so no _current_ regression — but the assumption is now load-bearing on column layout. Filing as **Tier 3 followup `MB-F-FRAME-C-ROOT-FLEX-DIRECTION-LAYOUT-ASSUMPTION`** at WB-final.

---

## §VI — Discipline events

| Event | Disposition | Source |
|---|---|---|
| Initial `git commit -o <new-file>` failed with "pathspec did not match" | Resolved per `feedback_git_commit_pathspec_for_new_files` memory: `git add` first, then `git commit -o <pathspec>` | MEMORY.md feedback-git-commit-pathspec-for-new-files |
| Out-of-territory dispatch-daemon test file `probe-mbf-t13-01-session-policy-cleanup-on-kill.test.ts` staged at WB1 RED time (artifact from prior session) | Reset via `git reset HEAD <path>` per §2.7 | CLAUDE.md §2.7 |
| Out-of-territory parallel-session changes (`packages/dispatch-daemon/src/lifecycle/startup.ts`, `routes/sessions.ts`, new `db/` dir, `workstation/test/build/probe-mbf-workstation-dist-rebuild-01-postinstall-emits-dist.spec.ts`) present pre-WB2-GREEN-commit | Not staged; per-path `git commit -o frame-c-root.tsx` ensures isolation | CLAUDE.md §2.7 + manifest TERRITORY |
| `pnpm vitest run` artifact added `postinstall: "tsc"` to `packages/dispatch-workstation/package.json` post-test-run | Not staged; preserved as working-tree artifact | Side-effect of out-of-territory work — not in scope |

---

## §VII — Closure stamp

Stamp appended to `docs/FOLLOWUPS.md:353` at WB-final commit per shared-bootstrap §F item 7 operator-stamp envelope.

Closure SHA: _(populated at WB-final commit)_
