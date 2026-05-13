# MB-T-PHASE-4-METHODOLOGY-EPSILON-VISUAL-DIFF — Automated wireframe-vs-shipped image diff (Cluster D-ε)

**Status:** EXECUTABLE under (β)-style scope narrowing per manifest `phase4-t8-methodology-epsilon.txt`.
**Authoring date:** 2026-05-13
**Session:** `phase4-t8-exec-methodology-epsilon` (Round 11 §3.9 Wave 4).
**Source DRAFT:** `docs/coordination/phase-4-tier-1-roadmap-draft.md:217-229` (PROVISIONAL `d009e6f`). Mechanical translation per CLAUDE.md §3.4.
**Promotion path:** rev-2 `docs/coordination/phase-4-tier-1-roadmap-rev-2-2026-05-12.md` §3.3 — γ shipped at `a8e9a76`, ε DISPATCH-READY.
**γ anchor:** `packages/dispatch-workstation/scripts/phase-3-visual-smoke.mjs` (`a8e9a76`) — exports `launchHeadless`, `captureScreenshot`, `diffImages`, `classifyResult`, `formatSummary`, `runPhase3Smoke`, `resolveScreenshotPath`.

**Closes / advances:**
- P3 §1.2 row `MB-T-PHASE-4-METHODOLOGY-ε-VISUAL-DIFF` — ship CONTRACT.
- `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-GAP` closure-path-ε — operationalized.
- Audit row "visual-diff automation" (if present) — advance from PENDING → SHIPPED-MODULE-LEVEL.

**Depends on (all shipped):**
- γ tooling at `phase-3-visual-smoke.mjs` (`a8e9a76`) — READ-ONLY in this session; imported by ε runner.
- @playwright/test + pixelmatch + pngjs deps (operator-acked at γ ship; reused).

---

## §0 — Reading protocol

1. §1 (scope) + §1.5 ((β) narrowing) — ship-envelope.
2. §2 (arbitration anchor + construction order).
3. §3 (Sub-Q resolutions).
4. §4 (WB ladder).
5. §5-§9 operational supports.

Confidence labels per CLAUDE.md §2.2: `[KNOWN]` direct-read at HEAD `178b994`; `[MODELED]` reasoned; `[KNOWN-OPERATOR-ARBITRATED]` operator-acked this dispatch.

---

## §1 — Scope

### §1.1 — What this ticket DOES

`[KNOWN-OPERATOR-ARBITRATED]` per manifest territory + Round 11 §3.9 Wave 4 dispatch:

1. **NEW `packages/dispatch-workstation/scripts/visual-diff-config.mjs`** — config primitive module:
   - `defineVisualDiffTarget(input): VisualDiffTarget` — type-checked target descriptor
   - `loadVisualDiffConfigFromObject(obj): VisualDiffConfig` — programmatic config loader (pure-fn)
   - `loadVisualDiffConfigFromFile(path): VisualDiffConfig` — file-backed JSON loader (graceful-degradation if absent → empty-config)
   - default target manifest matching γ's existing single-target convention

2. **NEW `packages/dispatch-workstation/scripts/visual-diff-runner.mjs`** — orchestrator module:
   - `runVisualDiff(config, opts): Promise<VisualDiffAggregate>` — orchestrates per-target diff cycles using γ's exported `launchHeadless` + `captureScreenshot` + `diffImages` + `classifyResult`
   - Per-target result: `{ name, state, screenshotPath?, mismatchPercent?, targetImagePath?, durationMs }`
   - Aggregate: `{ targets: TargetResult[], allPassed: boolean, anyFailed: boolean, anyTargetAbsent: boolean }`
   - Reuses γ launch (single electron launch shared across multiple target captures when targets share render-state; configurable)

3. **NEW `packages/dispatch-workstation/scripts/methodology-visual-diff-cli.mjs`** — CI-friendly CLI entry:
   - Argument parsing: `--config <path>`, `--json` (emit structured JSON only), `--threshold <percent>`, `--skip-rebuild`
   - Config loading via §1.1.1
   - Runner invocation via §1.1.2
   - Stdout: human-readable summary OR JSON (with `--json`)
   - Exit codes: 0 = all-PASS or all-TARGET-ABSENT (graceful); 1 = any FAIL; 2 = BUILD-FAILED or LAUNCH-FAILED

4. **NEW probes at `packages/dispatch-workstation/test/unit/scripts/probe-mbtphase4-epsilon-*.spec.ts`** — 3 probes (config shape, runner orchestration, CLI shape).

5. **Documentation:** this build-doc + WB-final findings doc + coord doc.

### §1.2 — What this ticket DOES NOT (under (β) narrowing)

`[KNOWN-OPERATOR-ARBITRATED]` constraints from manifest FORBIDDEN list:

- Does NOT modify γ tooling at `packages/dispatch-workstation/scripts/phase-3-visual-smoke.mjs` (READ-ONLY per manifest). ε IMPORTS γ exports; doesn't change them.
- Does NOT modify `packages/dispatch-workstation/scripts/methodology-runtime-verify.mjs` (READ-ONLY).
- Does NOT modify `package.json` `scripts:` entries (`package.json` not in WRITE territory; sibling/operator-driven wiring for `pnpm verify:visual-diff`).
- Does NOT add CI workflow files (`.github/workflows/` not in territory).
- Does NOT commit the canonical wireframe target PNG `docs/coordination/wireframe-target-2026-05-11.png` (path not in WRITE territory; operator-driven).
- Does NOT modify `packages/dispatch-workstation/src/**` (FORBIDDEN).
- Does NOT modify `packages/dispatch-daemon/**` (FORBIDDEN).
- Does NOT modify `WORKSTATION_CONTRACT.md` / `CONDUCTOR_API_CONTRACT.md` / `schema.ts` (FROZEN / FORBIDDEN).
- Does NOT stamp `docs/FOLLOWUPS.md` (FORBIDDEN; operator-driven natural cycle).

### §1.5 — (β)-style scope narrowing (manifest-driven)

`[KNOWN-OPERATOR-ARBITRATED]` 2026-05-13 dispatch — manifest territory restricts ε ship to **module-level + probes + docs**:

- **Operationalized**: config + runner + CLI; importable + invokable; CI-pipeline-shaped.
- **Sibling-flippable**: package.json scripts entry; CI workflow file; canonical target PNG commit.

**Rationale:** ε's stated goal (per draft §1.2 + rev-2 §3.3) is "automated wireframe-vs-shipped image diff so visual regressions are caught in CI rather than operator screenshots." The module-level ship under (β) delivers the IMPLEMENTATION; the CI-integration arm is a thin wiring layer that sibling/operator commits when ready (e.g., when canonical target PNG lands and operator chooses to gate CI on visual diff).

---

## §2 — Arbitration anchor

### §2.1 — Provenance

`[KNOWN]` Mechanical translation of `phase-4-tier-1-roadmap-draft.md:217-229` per CLAUDE.md §3.4. Promotion authorized by rev-2 §3.3 "γ SHIPPED at `a8e9a76` — ε is DISPATCH-READY."

### §2.2 — Construction order

`[KNOWN-OPERATOR-ARBITRATED]`:

- NEW `packages/dispatch-workstation/scripts/visual-diff-config.mjs`
- NEW `packages/dispatch-workstation/scripts/visual-diff-runner.mjs` (imports γ exports + config module)
- NEW `packages/dispatch-workstation/scripts/methodology-visual-diff-cli.mjs` (imports config + runner)
- NEW probes at `test/unit/scripts/probe-mbtphase4-epsilon-{01,02,03}-*.spec.ts`
- NEW build-doc + findings + coord docs

Path-disjoint from co-active Wave-4 sessions (per dispatch-queue at HEAD `178b994`).

### §2.3 — Frozen-contract amendment scoping

`[KNOWN]` ZERO frozen-surface touch:
- γ tooling READ-ONLY (imports only).
- No daemon / core / src changes.
- No package.json scripts entry (sibling territory).
- No CI workflow files.

---

## §3 — Sub-Q resolutions

Default per draft §1.2 + this session's manifest narrowing. All resolved at authoring time.

### §3.1 — Sub-Q-A: Module surface granularity

| Option | Mechanism | Selected |
|---|---|---|
| (i) Single module | One `methodology-visual-diff.mjs` combining config + runner + CLI | NO |
| (ii) 3-module separation (config / runner / CLI) | Cleaner unit-test boundaries; matches γ pattern (smoke + cli) | **YES** |
| (iii) Embedded extension of γ | Modify `phase-3-visual-smoke.mjs` directly | NO — γ is READ-ONLY |

`[MODELED]` (ii) — matches γ's existing split between core fns + CLI entry; supports unit-testable config + runner; CLI is a thin shell.

### §3.2 — Sub-Q-B: Config format

| Option | Mechanism | Selected |
|---|---|---|
| (i) JSON file | `docs/coordination/visual-diff-config.json` | NO — config dir not in territory |
| (ii) Programmatic-only (no file loader) | Caller passes config object | NO — degrades CI ergonomics |
| (iii) Hybrid: programmatic + optional file loader | Both paths exported; CLI uses file loader; tests use programmatic | **YES** |

`[MODELED]` (iii) — preserves CLI-from-config-file ergonomics while keeping unit tests deterministic via programmatic injection. File loader gracefully degrades to default-single-target config when file absent (matches γ TARGET-ABSENT philosophy).

### §3.3 — Sub-Q-C: Per-target launch strategy

| Option | Mechanism | Selected |
|---|---|---|
| (i) Per-target electron launch | Each target spawns a fresh electron; isolation but slow | NO |
| (ii) Single launch + multi-screenshot | Share electron across targets; configurable pre-capture hook for state-mutation | **YES** |
| (iii) Operator-injected page | Caller supplies page handle | NO — incompatible with CLI use |

`[MODELED]` (ii) — γ already launches once; ε reuses that for the default single-target path. Multi-target with per-target pre-capture hook supports future expansion (e.g., switch frame mode between captures).

### §3.4 — Sub-Q-D: Exit-code semantics

| Option | Mapping | Selected |
|---|---|---|
| (i) Strict: any non-PASS → exit 1 | TARGET-ABSENT counts as fail | NO — defeats γ graceful-degradation contract |
| (ii) γ-aligned: TARGET-ABSENT graceful (exit 0); FAIL → 1; BUILD/LAUNCH → 2 | Inherits γ semantics | **YES** |
| (iii) Configurable via `--strict` flag | Operator chooses per-invocation | DEFER to v2 |

`[MODELED]` (ii) default; `--strict` deferred to follow-on if needed. Preserves γ's anti-fabrication §2.3 graceful-degradation contract.

### §3.5 — Sub-Q-E: package.json `scripts:` wiring

| Option | Path | Selected |
|---|---|---|
| (i) In-bundle: add `verify:visual-diff` to workstation `package.json` scripts | `pnpm --filter dispatch-workstation verify:visual-diff` | NO — `package.json` not in territory |
| (ii) Defer to sibling/operator | Standalone CLI invokable via `node scripts/methodology-visual-diff-cli.mjs` | **YES** |

`[KNOWN-OPERATOR-ARBITRATED]` per manifest FORBIDDEN scope: (ii). CLI is invokable directly; sibling adds `package.json` entry when wiring CI.

---

## §4 — WB ladder

8 commits total: 1 docs (build-doc) + 3 RED + 3 GREEN + 1 WB-final.

| WB | Verb | Surface | Acceptance |
|---|---|---|---|
| (this) | docs | `CONDUCTOR_MB-T-PHASE-4-METHODOLOGY-EPSILON-VISUAL-DIFF_BUILD.md` (NEW) | build-doc lands |
| WB1 | red | `probe-mbtphase4-epsilon-01-config-shape.spec.ts` (NEW) | 4 conditions; module + exports + behavior |
| WB2 | green | `visual-diff-config.mjs` (NEW) | flips WB1 |
| WB3 | red | `probe-mbtphase4-epsilon-02-runner-orchestration.spec.ts` (NEW) | 4 conditions; module + runVisualDiff signature + per-target dispatch + aggregate |
| WB4 | green | `visual-diff-runner.mjs` (NEW) | flips WB3 |
| WB5 | red | `probe-mbtphase4-epsilon-03-cli-shape.spec.ts` (NEW) | 3 conditions; CLI module + parseArgs + exit-code mapping |
| WB6 | green | `methodology-visual-diff-cli.mjs` (NEW) | flips WB5 |
| WB-final | green (docs) | findings + coord docs | summary + (β)-scope-final stamp |

---

## §5 — Cross-references

**Followups CLOSED / ADVANCED:**

| Followup / Row | Tier | Path |
|---|---|---|
| `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-GAP` closure-path-ε | — | ADVANCED — module-level operationalized; CI integration sibling-flippable |
| P3 §1.2 row `MB-T-PHASE-4-METHODOLOGY-ε-VISUAL-DIFF` | (roadmap) | RESOLVED (β-narrowed ship) |

**Related shipped tickets:**
- `MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING` (γ; `a8e9a76`) — direct dependency; ε imports its exports.

**Co-active Wave-4 sessions (per dispatch queue `178b994`):**
- Path-disjoint from all in-flight (manifest territory confined to `scripts/` + `test/unit/scripts/` + 3 doc files).

---

## §6 — Self-check Q1-Q9 expectations per WB commit

| WB | Q1 (spike?) | Q2 (mocks?) | Q3 (impl-deleted-passes?) | Q4 (outside contract?) | Q5 (frozen mod?) | Q6 (labels?) | Q7 (parallel territory?) | Q8 (bypass PATCH?) | Q9 (halt-unauth?) |
|---|---|---|---|---|---|---|---|---|---|
| docs | N/A | N/A | N/A | No | No | KNOWN | new build-doc | N/A | No |
| WB1 | N/A | BEHAVIOR (dynamic-import) | No | No | No | KNOWN | new probe | N/A | No |
| WB2 | N/A | BEHAVIOR (real config fns) | No | No | No | KNOWN | new scripts module | N/A | No |
| WB3 | N/A | BEHAVIOR (mock electron page; real γ imports if non-launch path) | No | No | No | KNOWN | new probe | N/A | No |
| WB4 | N/A | BEHAVIOR (real runner; γ imports) | No | No | No | KNOWN | new scripts module | N/A | No |
| WB5 | N/A | BEHAVIOR (CLI parse fn unit-test) | No | No | No | KNOWN | new probe | N/A | No |
| WB6 | N/A | BEHAVIOR (real CLI module) | No | No | No | KNOWN | new scripts module | N/A | No |
| WB-final | N/A | N/A | N/A | No | No | KNOWN | 2 doc paths | N/A | No |

---

## §7 — Definition of done (under (β))

1. WB1-WB-final cairn ladder lands; pushed per CLAUDE.md §2.6.
2. `visual-diff-config.mjs` exports `defineVisualDiffTarget` + `loadVisualDiffConfigFromObject` + `loadVisualDiffConfigFromFile`.
3. `visual-diff-runner.mjs` exports `runVisualDiff(config, opts)` returning `VisualDiffAggregate`.
4. `methodology-visual-diff-cli.mjs` exports a CLI entry-point with parseable args + correct exit-code mapping.
5. All 3 WB probes (~11 conditions) GREEN.
6. `pnpm --filter dispatch-workstation typecheck` clean (`.mjs` modules are JSDoc-typed; tsc validates).
7. No regression in γ probes — γ READ-ONLY this session.
8. WB-final findings doc + coord doc land.
9. **Sibling continuity:** CLI is invokable via `node packages/dispatch-workstation/scripts/methodology-visual-diff-cli.mjs --config <path>`; sibling adds `package.json` scripts entry + CI workflow when ready.

**DONE-UNDER-(β)** is partial relative to "ε fully CI-integrated" — CI workflow + package.json wiring + canonical target PNG commit are sibling/operator-driven.

---

## §8 — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| γ import path resolves to wrong module under different cwd | `[MODELED-LOW]` (γ uses `__dirname` resolution; ε mirrors) | `[MODELED-MEDIUM]` (runner fails to launch) | WB4 imports γ via relative path `./phase-3-visual-smoke.mjs`; mirror γ's resolution logic |
| Canonical wireframe target PNG absent at ε ship | `[KNOWN]` per `ls docs/coordination/wireframe-target-*.png` | `[MODELED-LOW]` (graceful TARGET-ABSENT) | γ + ε inherit graceful-degradation contract; CLI exits 0 on all-TARGET-ABSENT |
| Multiple target diff runs share electron page state (config-induced bleed) | `[MODELED-MEDIUM]` if multi-target config used | `[MODELED-MEDIUM]` (false PASS/FAIL) | Sub-Q-C=(ii) provides per-target pre-capture hook for state-reset; default single-target = no bleed |
| CLI arg parsing brittle on edge inputs | `[MODELED-LOW]` | `[MODELED-LOW]` | WB5 probe covers core arg shapes; exhaustive parsing deferred |
| Operator adds package.json scripts entry incorrectly (e.g., wrong path) | `[MODELED-LOW]` (sibling deliverable; not in scope) | `[MODELED-LOW]` | Findings doc §X documents recommended `verify:visual-diff` entry script body |

---

## §9 — §6.6 amendment outline

`[KNOWN]` ZERO `WORKSTATION_CONTRACT.md` §6 amendment. No new IPC channels; no protocol changes. Module-level addition only.

---

**End of MB-T-PHASE-4-METHODOLOGY-EPSILON-VISUAL-DIFF build-doc.**

Status: EXECUTABLE under (β)-narrowed envelope. Manifest WRITE scope = `scripts/` + `test/unit/scripts/` + 3 doc files.
