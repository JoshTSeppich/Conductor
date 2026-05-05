# Coverage audit — test-batch-1 Session B

**Date:** 2026-05-05
**Operator:** Joshua Seppich
**Branch:** `test-B/workstation-main-coverage`
**Cut from:** `main` HEAD `f5c0a8b`
**Coordination scaffold:** `docs/cairn-coordination/test-batch-1/00_COORDINATION_SCAFFOLD.md`
**Tooling commit:** `7ea398d docs(cairn): wire vitest coverage tooling for test-batch-1 Session B`

## §1 Scope and methodology

### Goal

Audit unit-test coverage of workstation main-process source files, document Tier 1 ship-gate-proximate gaps, close those gaps via per-file unit-test additions targeting ≥80% coverage on all four axes (statements, branches, functions, lines).

### Tier 1 definition (per session prompt)

A file is Tier 1 ship-gate-proximate if any of:

- regression on it would block operator-experiential paths;
- recently touched by fix-batch-1 / fix-92 / fix-89 (high-churn surface);
- cross-context plumbing (IPC handlers, preload bridges, daemon clients);
- authentication, persistence, or credential surface.

### Out of scope (filed separately if surfaces)

- onboarding flow components (deferred to onboarding triage);
- coarchitect renderer components (deferred to coarchitect triage);
- console panel renderer components (deferred to console-panel triage);
- new fix-92 / fix-89 files (already have probe coverage).

### Source-territory rule

NO source-code edits in this session. If a test reveals a defect, file a finding in the reserved range #100–#104, HALT, surface to operator. Test additions only.

### Tooling

- Provider: `@vitest/coverage-v8@4.1.5` (matches `vitest@4.1.5` repo pin).
- Run: `pnpm --filter dispatch-workstation test:coverage` after `pnpm --filter dispatch-core build`.
- Scope: unit tests only (`vitest run --coverage test/unit`). Integration tests spawn subprocess Electron and do not contribute to in-process v8 coverage; measuring them would conflate two different surfaces.
- Reporters: `text`, `json-summary`, `json`.
- Include glob: `src/main/**/*.ts` plus `src/coarchitect/build-doc-state.ts`.

## §2 Pre-state coverage

Captured 2026-05-05 against branch HEAD `7ea398d` (post-tooling, pre-test-additions). Source for these numbers: `packages/dispatch-workstation/coverage/coverage-summary.json` (gitignored).

| File | Source LOC | Stmt% | Branch% | Func% | Line% | Tier 1 status |
|---|---:|---:|---:|---:|---:|---|
| `src/coarchitect/build-doc-state.ts` | 78 | 91.30 | 82.35 | 100.00 | 95.00 | already ≥80% all-axes |
| `src/main/console-mount.ts` | 241 | 86.07 | 71.42 | 92.85 | 100.00 | branch-only gap |
| `src/main/console-ipc.ts` | 440 | 54.54 | 45.16 | 42.10 | 56.58 | gap |
| `src/main/session-cap.ts` | 186 | 45.16 | 47.05 | 50.00 | 45.16 | gap |
| `src/main/http-daemon-client.ts` | 116 | 39.39 | 33.33 | 50.00 | 44.82 | gap |
| `src/main/spawn-ipc.ts` | 314 | 15.15 | 14.28 | 17.64 | 15.38 | critical gap |
| `src/main/coarchitect-ipc.ts` | 183 | 3.03 | 0.00 | 0.00 | 3.17 | critical gap |
| `src/main/menu.ts` | 120 | 0.00 | 0.00 | 0.00 | 0.00 | critical gap |

KNOWN: `menu.ts` has 0% unit-test coverage despite being the file finding #89 just shipped a fix into. Existing menu specs all import `console-menu.ts` (the CC Console submenu builder) — the application-menu factory itself has never had a unit test. The file is exercised only by the `test/integration/fix-89-menu-rebuild/` probe suite, which spawns subprocess Electron.

## §3 Methodology lesson — bank

**Observation (2026-05-05, banked from operator arbitration):** `menu.ts` shipped a Tier 1 fix (finding #89, the macOS `setApplicationMenu(null)` precursor at line 118) without any unit tests landing alongside the fix. Only integration-probe coverage exists. A unit test that mocks the Electron `Menu` API and asserts `setApplicationMenu(null)` is invoked before `setApplicationMenu(menu)` would have caught the propagation-defect class earlier and cheaper than the integration-probe loop.

**Lesson:** files that ship Tier 1 fixes should have unit tests landed alongside the fix, not just integration probes. Integration probes are slow, environment-sensitive, and exercise the compiled `dist/` rather than source — they're high-fidelity ship-gates but expensive feedback loops. Unit tests for IPC factories, menu builders, and other in-process surfaces should be the first line of regression coverage; integration probes should backstop them, not replace them.

**Application going forward:** when a fix-* commit lands, the same session (or an immediately-following test session) should land a unit-test commit covering the fix's invariants. Probe-92's obs-infra → probe-content commit boundary is a good shape; coverage tooling shipped separately from probe content (commit `7ea398d`) follows the same discipline.

## §4 Operator-arbitrated scope decisions (2026-05-05)

### Per-file scope decisions

- **build-doc-state.ts**: SKIP. Already ≥80% all axes.
- **console-mount.ts**: branch-only top-up to ≥80% branch coverage.
- **console-ipc.ts**: SCOPE-REDUCED. Target ship-gate-proximate paths only. Do not pursue ≥80% all-axes. In-scope: error paths in IPC handlers, happy-path IPC flows. Out-of-scope (document gap): WebSocket reconnection edge cases (lower-priority gap), panel cap edge cases (already covered in `console-t02`/`console-t03`).
- **session-cap.ts**: full ≥80%.
- **http-daemon-client.ts**: full ≥80%.
- **spawn-ipc.ts**: full ≥80%. 200-LOC test-additions ceiling LIFTED because scout verified clean factory injection points already exist (existing `mb-t06` tests use the same pattern). LOC reflects honest API-surface density, not refactor signal.
- **coarchitect-ipc.ts**: full ≥80%. Same 200-LOC lift on the same rationale.
- **menu.ts**: full ≥80%. Greenfield (0% pre-state).

### Halt conditions in effect

- Defect in production code → file finding #100–#104, HALT, do NOT fix.
- File genuinely resists testing without injection refactor → HALT, surface (the 200-LOC lift is conditional on injection points existing).
- Cross-session conflict with Session A → HALT, surface.
- Anything surprising → HALT, surface.

## §5 Work order (ROI-sequenced)

1. `menu.ts` — 0% → ≥80%, greenfield, ~80-120 test LOC.
2. `coarchitect-ipc.ts` — 3% → ≥80%, greenfield-ish, ~180-260 test LOC (over old 200 ceiling, lifted per §4).
3. `http-daemon-client.ts` — 39% → ≥80%, ~100-150 test LOC.
4. `session-cap.ts` — 45% → ≥80%, ~100-150 test LOC.
5. `console-ipc.ts` — 55% → 60-70% (scope-reduced per §4), ~150 test LOC.
6. `spawn-ipc.ts` — 15% → ≥80%, ~180-280 test LOC (over old 200 ceiling, lifted per §4).
7. `console-mount.ts` — branch-only top-up, ~50-80 test LOC.
8. `build-doc-state.ts` — SKIPPED (§4).

Estimated total: ~840-1,260 test LOC across 7 files.

## §6 Per-file commit log

Populated incrementally as test additions land. Each entry: pre/post coverage delta, brief rationale, commit SHA.

### menu.ts

- Pre:  stmt   0.00 / branch   0.00 / func   0.00 / line   0.00
- Post: stmt 100.00 / branch 100.00 / func 100.00 / line 100.00
- Delta: +100.00 pp on every axis (greenfield → fully covered)
- Commit: `36e029e green(test-batch-1): close menu.ts coverage gap (0% → 100% all axes)`

### coarchitect-ipc.ts

- Pre:  stmt  3.03 / branch  0.00 / func  0.00 / line  3.17
- Post: stmt 95.45 / branch 81.81 / func 82.35 / line 95.23
- Delta: +92.42 / +81.81 / +82.35 / +92.06 pp
- Commit: `9275fe5 green(test-batch-1): close coarchitect-ipc.ts coverage gap (3% → 95% stmt)`
- Notes: 200-LOC ceiling lifted; spec is 21 tests, ~430 LOC (single file, single source of truth for shared mock surface).

### http-daemon-client.ts

- Pre:  stmt  39.39 / branch  33.33 / func  50.00 / line  44.82
- Post: stmt 100.00 / branch 100.00 / func 100.00 / line 100.00
- Delta: +60.61 / +66.67 / +50.00 / +55.18 pp
- Commit: `628edb8 green(test-batch-1): close http-daemon-client.ts coverage gap (39% → 100%)`
- Notes: 19 tests across 2 specs (postAuditViaFetch + HttpDaemonClient class).

### session-cap.ts

- Pre:  stmt  45.16 / branch 47.05 / func  50.00 / line  45.16
- Post: stmt 100.00 / branch 94.11 / func 100.00 / line 100.00
- Delta: +54.84 / +47.06 / +50.00 / +54.84 pp
- Commit: `c7a79a9 green(test-batch-1): close session-cap.ts coverage gap (45% → 100% stmt)`
- Notes: HttpSessionListClient previously uncovered; existing mb-t06 tests covered isAtCap and checkSpawnCapacity (pure surfaces). Branch axis at 94.11% (one nullish-coalesce edge accepted in scope, well above 80% target).

### console-ipc.ts (scope-reduced)

- Pre:  stmt 54.54 / branch 45.16 / func 42.10 / line 56.58
- Post: stmt 77.62 / branch 63.44 / func 71.05 / line 81.39
- Delta: +23.08 / +18.28 / +28.95 / +24.81 pp
- Commit: `20efea6 green(test-batch-1): close console-ipc.ts ship-gate-proximate gaps (54% → 78% stmt)`
- Out-of-scope intentional gap (operator §4 decision): WebSocket reconnection edge cases (lines 248-249); `defaultWebSocketFactory` global-WebSocket adapter (lines 374-396, requires WS env to test); panel cap edge cases (already covered in `console-t02`/`console-t03`).
- Coverage lands within the §4 60-70% target band on stmt/branch/func; line axis exceeds 80%.

### spawn-ipc.ts

- Pre:  stmt 15.15 / branch  14.28 / func 17.64 / line 15.38
- Post: stmt 95.45 / branch 100.00 / func 94.11 / line 95.38
- Delta: +80.30 / +85.72 / +76.47 / +80.00 pp
- Commit: `1f917eb green(test-batch-1): close spawn-ipc.ts coverage gap (15% → 95% stmt, 100% branch)`
- Notes: 200-LOC ceiling lifted; spec is 27 tests, ~520 LOC. Branch axis at 100% (defense-in-depth catch at lines 306-308 is structurally unreachable without deps-factory throw growth).

### console-mount.ts (branch-only top-up)

- Pre:  stmt 86.07 / branch 71.42 / func 92.85 / line 100.00
- Post: stmt 94.93 / branch 90.47 / func 92.85 / line 100.00
- Delta: +8.86 / +19.05 / +0.00 / +0.00 pp
- Commit: `37a9a4f green(test-batch-1): close console-mount.ts branch coverage gap (71% → 90%)`
- Notes: branch axis was the only sub-80% target; lifted from 71.42 to 90.47.

### build-doc-state.ts (skipped)

- Pre:  stmt 91.30 / branch 82.35 / func 100.00 / line 95.00 — already ≥80% all axes.
- Post: unchanged (no test additions)
- Commit: n/a

## §7 Findings filed

Populated if test additions reveal production defects. Reserved range: #100-#104.

**None.** All 7 priority files closed without surfacing a production defect. Test additions are pure coverage closure; no source-code changes required.

## §8 Final audit summary

### Branch state

- Branch: `test-B/workstation-main-coverage`
- Final HEAD: `37a9a4f green(test-batch-1): close console-mount.ts branch coverage gap (71% → 90%)`
- Cut from: `main` HEAD `f5c0a8b`
- Total commits added: 9 (2 docs + 7 green)

### Per-file coverage closure summary

All 7 in-scope priority files reached the operator-arbitrated coverage target:

- **6 files at ≥80% all four axes**: menu.ts (100%/100%/100%/100%), coarchitect-ipc.ts (95/82/82/95), http-daemon-client.ts (100/100/100/100), session-cap.ts (100/94/100/100), spawn-ipc.ts (95/100/94/95), console-mount.ts (95/90/93/100).
- **1 file scope-reduced per §4**: console-ipc.ts at 78/63/71/81 — within the §4 60-70% target band on three axes, line axis exceeds 80%. Documented out-of-scope gap stands.
- **1 file pre-state pass**: build-doc-state.ts at 91/82/100/95, no work needed.

### Total project coverage

| Axis | Pre-state | Post-state | Delta |
|---|---:|---:|---:|
| Statements | 43.46% (439/1010) | 63.96% (646/1010) | +20.50 pp |
| Branches | 41.11% (229/557) | 58.34% (325/557) | +17.23 pp |
| Functions | 40.90% (99/242) | 61.15% (148/242) | +20.25 pp |
| Lines | 43.99% (410/932) | 64.37% (600/932) | +20.38 pp |

Suite size: 317 → 432 tests (+115 tests across 7 priority files).

### Findings filed

None. Reserved range #100-#104 unused.

### Methodology lessons banked

1. **Files that ship Tier 1 fixes should have unit tests landed alongside the fix, not just integration probes.** menu.ts shipped finding #89 fix without unit-test coverage; this audit caught the gap at 0% pre-state and closed it at 100% post-state. The unit test (`test_register_and_rebuild_application_menu.spec.ts`) asserts the load-bearing `setApplicationMenu(null)` precursor invariant — removing menu.ts:118 reintroduces finding #89, the unit test catches it before integration probes do.

2. **Coverage tooling commit shipped separately from probe content.** `7ea398d docs(cairn): wire vitest coverage tooling` is the same commit shape as probe-92's obs-infra → probe-content boundary. Honest tooling work, not bundled into the test additions.

3. **vi.hoisted + vi.mock pattern is portable across Electron-mocking unit tests.** First reached for in menu.ts tests; reused unchanged for coarchitect-ipc.ts, spawn-ipc.ts. Pattern: declare spies in `vi.hoisted` block, reference them from `vi.mock` factory, capture handlers in maps for replay.

4. **`new Mock` requires regular function declarations, not vi.fn arrow impls.** Discovered in coarchitect-ipc.ts spec when HttpDaemonClient was constructed via `new`; `vi.fn(() => ({...}))` is not a constructor target. Solution: plain `function HttpDaemonClient(this: unknown) { Object.assign(this, ...) }`. Banked for future Electron-class mocking.

5. **v8 coverage measures in-process imports only.** Integration tests in this repo spawn subprocess Electron and do not contribute to src/main/ coverage. Unit-test coverage IS the audit baseline; integration probes are a separate ship-gate tier.

### Recommended next steps

1. **Merge order per scaffold §2**: Session A merges first (probe suites for fix-batch-1 #82/#83/#84). Session B merges second (this branch).
2. **Both branches are additive** — coverage tooling additions (devDep + script + vitest config block) are scaffolding, not source-fix; test files are pure additions. No territory conflict expected.
3. **For followups**: the methodology lesson #1 ("unit tests alongside Tier 1 fixes") should be promoted to a coordination scaffold §7 standing rule for future fix-* sessions.
4. **Out-of-scope gaps preserved**:
   - console-ipc.ts WebSocket reconnection edge cases (lines 248-249)
   - console-ipc.ts `defaultWebSocketFactory` (lines 374-396)
   - main.ts (lines 65-619, 0% — entry point, integration-only territory)
   - window-lifecycle.ts (lines 15-103, 0% — Electron lifecycle, integration-only)
   - electron-process-controller.ts (lines 21-125, 0% — daemon spawn process controller)
   These remain ship-gated by integration probes; future audit cycles can close them as Tier 2 work.


