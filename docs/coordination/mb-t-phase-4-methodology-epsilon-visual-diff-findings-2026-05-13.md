# MB-T-PHASE-4-METHODOLOGY-EPSILON-VISUAL-DIFF — Findings (2026-05-13)

**Ticket:** `docs/build-docs/CONDUCTOR_MB-T-PHASE-4-METHODOLOGY-EPSILON-VISUAL-DIFF_BUILD.md` (`7e623a3`)
**Session:** `phase4-t8-exec-methodology-epsilon` (Round 11 §3.9 Wave 4-5)
**Manifest:** `docs/coordination/territorial-manifests/phase4-t8-methodology-epsilon.txt`
**Coord doc:** `docs/coordination/coord-phase4-epsilon-2026-05-13.md`
**Scope envelope:** (β)-style manifest-narrowed; consumer-CI-wiring sibling-flippable.

Format: Wave B I-XI per ε build-doc §4 + Cluster A findings precedent (`mb-t-phase-4-spawn-result-field-extensions-findings-2026-05-12.md`).

---

## I — What shipped

`[KNOWN]` at HEAD post-WB6 ship.

| WB | Verb | Commit | Surface | Lines |
|---|---|---|---|---|
| docs | docs | `7e623a3` | `CONDUCTOR_MB-T-PHASE-4-METHODOLOGY-EPSILON-VISUAL-DIFF_BUILD.md` (NEW; 255 lines; mechanical translation of draft §1.2 + (β) narrowing) | +255 |
| WB1 | red | `89809cd` | `probe-mbtphase4-epsilon-01-config-shape.spec.ts` (NEW; 4 conditions) | +155 |
| WB2 | green | `c5a3a95` | `visual-diff-config.mjs` (NEW; defineVisualDiffTarget + 2 loaders) | +139 |
| WB3 | red | `2d1f549` | `probe-mbtphase4-epsilon-02-runner-orchestration.spec.ts` (NEW; 4 conditions) | +217 |
| WB4 | green | `16b288d` | `visual-diff-runner.mjs` (NEW; runVisualDiff + γ composition) | +180 |
| WB5 | red | `7d4da48` | `probe-mbtphase4-epsilon-03-cli-shape.spec.ts` (NEW; 3 conditions) | +191 |
| WB6 | green | `e8c4f77` | `methodology-visual-diff-cli.mjs` (NEW; parseArgs + mapAggregateToExitCode + runCli) | +174 |
| WB-final | green (docs) | (this commit) | findings + coord docs | +per-file |

**Session total:** 8 commits; 11/11 ε probes GREEN; typecheck CLEAN.

---

## II — Sub-Q disposition

All 5 Sub-Q gates resolved at authoring time per build-doc §3 (no HALT cycles required).

| Sub-Q | Default | (β) Resolution | Status |
|---|---|---|---|
| A — Module surface granularity | (ii) 3-module split | **(ii)** config / runner / CLI (matches γ split) | RESOLVED |
| B — Config format | (iii) hybrid programmatic + file | **(iii)** | RESOLVED |
| C — Per-target launch strategy | (ii) single launch + multi-screenshot | **(ii)** with per-target capturePreFn for state mutation | RESOLVED |
| D — Exit-code semantics | (ii) γ-aligned | **(ii)** | RESOLVED |
| E — package.json scripts entry | (ii) defer to sibling/operator | **(ii)** — package.json not in WRITE territory | RESOLVED — sibling deferral |

---

## III — Architectural deltas

### III.1 — γ composition pattern (READ-ONLY import; zero modification)

`[KNOWN]` ε imports 4 of γ's 7 exports (`launchHeadless`, `captureScreenshot`, `diffImages`, `classifyResult`) as production default deps in `visual-diff-runner.mjs`. γ remains untouched per manifest READ-ONLY constraint.

The composition pattern preserves cairn-discipline: γ probes (shipped at `a8e9a76` + earlier) continue to govern γ's contract; ε probes govern ε's contract; the composition contract emerges from the type-level + runtime-deps-injection surface.

### III.2 — Deps-injection for unit-test determinism

`[KNOWN]` All 3 ε modules (config / runner / CLI) accept optional `deps` parameters; defaults resolve to the next-layer-up's production exports. Tests inject mocks. This enables:
- WB1 probe: dynamic-imports real config module; assertions on real pure-fn output.
- WB3 probe: dynamic-imports real runner; injects mock launch/capture/diff to verify orchestration WITHOUT launching electron.
- WB5 probe: dynamic-imports real CLI helpers (parseArgs + mapAggregateToExitCode); pure-fn unit verification.
- Future end-to-end smoke (sibling/operator): invoke `runCli([])` with all defaults; real electron + real diff.

### III.3 — γ-aligned graceful-degradation contract preserved

`[KNOWN]` Anti-fabrication §2.3 (per γ at `phase-3-visual-smoke.mjs:268-286`) — TARGET-ABSENT does NOT throw; classifies as a terminal state that exit codes map to graceful 0 (not failure). ε inherits this throughout:
- `loadVisualDiffConfigFromFile(absent-path)` → `{ targets: [] }` (no throw)
- `runVisualDiff({ targets: [] })` → vacuous-PASS aggregate
- `mapAggregateToExitCode(all-TARGET-ABSENT)` → 0 (CI does not fail when canonical wireframe target PNG not yet committed)

### III.4 — Frozen-surface discipline

`[KNOWN]` ZERO frozen-surface modifications:
- γ tooling (`phase-3-visual-smoke.mjs`) READ-ONLY (imports only).
- `dispatch-core/src/v3/schema.ts` UNTOUCHED.
- `WORKSTATION_CONTRACT.md` UNTOUCHED.
- `CONDUCTOR_API_CONTRACT.md` UNTOUCHED.
- `REGISTRY.md` UNTOUCHED.
- `package.json` UNTOUCHED (Sub-Q-E=(ii)).
- `packages/dispatch-workstation/src/**` UNTOUCHED (FORBIDDEN).
- `packages/dispatch-daemon/**` UNTOUCHED (FORBIDDEN).

---

## IV — Probe distribution

`[KNOWN]` at HEAD post-WB6:

| Suite | New probes (this ticket) | Conditions | Status |
|---|---|---|---|
| `test/unit/scripts/` | 3 | 4 + 4 + 3 = 11 | 11/11 GREEN |

Typecheck status:
- `pnpm --filter dispatch-workstation typecheck` → CLEAN at WB6.

Other packages not touched this session:
- dispatch-core / dispatch-daemon / dispatch-cli / dispatch-web — no changes; typecheck not re-run.

---

## V — Architecture notes (post-ship state)

See `coord-phase4-epsilon-2026-05-13.md` §3.1 for full ASCII state diagram.

**Operative summary:**
- γ tooling = visual-comparison primitives (single-target smoke pipeline).
- ε tooling = CI-friendly orchestration over γ (multi-target config + runner + CLI).
- Sibling-deferred = the wiring that connects ε CLI to `package.json verify:visual-diff` + a CI workflow file + the canonical target PNG.

**Outcome classification per CLAUDE.md §2.11:** *Capability enabled with known limitations* — ε CLI is invokable today (`node packages/dispatch-workstation/scripts/methodology-visual-diff-cli.mjs --config <path>`) but yields TARGET-ABSENT for all targets until canonical wireframe target PNG lands.

---

## VI — Documentation drift

`[KNOWN]` Draft §1.2 (`phase-4-tier-1-roadmap-draft.md:217-229`) specifies "5-8 WBs" including "1 spike on image-diff library." ε did NOT ship a spike — γ already arbitrated pixelmatch + pngjs at `9f58359` WB2 SPIKE. ε reuses γ's dep selections; no new dep introduction.

**Resolution:** build-doc §1.5 documents the spike-skip rationale (γ already ratified image-diff library at γ's WB2 SPIKE; ε inherits).

`[KNOWN]` Draft §1.2 also says "2 RED/GREEN tolerance calibration" WBs. ε defers tolerance calibration to sibling/operator — the existing default 1.0% mismatch threshold (mirroring γ) is sufficient for module-ship; per-region tolerance would require canonical wireframe target PNG calibration data which doesn't exist yet.

---

## VII — Consumer non-regression

`[KNOWN]`:
- γ probes UNTOUCHED — γ READ-ONLY this session.
- Pre-existing daemon failure (`cc-console-buffer-migration.test.ts:89` per CLAUDE.md §4.5) — not impacted; ε is workstation-scripts territory only.
- T8 (β) cost-meter probes + T9 plan-timer probes + Cluster A spawn-result probes — all UNTOUCHED.

No regression observable in this session's scope.

---

## VIII — WB skip rationale

`[KNOWN]` Draft §1.2 estimated "5-8 WBs (1 spike + 2 RED/GREEN diff pipeline + 2 RED/GREEN tolerance calibration + 1 docs)". ε shipped 6 cairn WBs (3 RED + 3 GREEN pairs) + 1 docs (build-doc) + 1 WB-final.

**Skipped:**
- **Image-diff library spike** — γ ratified at `9f58359`; ε inherits.
- **Tolerance calibration WBs** — deferred to sibling/operator (requires canonical wireframe target PNG calibration data; not available this session).

**Adjusted ladder remains within draft estimate** (5-8 WBs).

---

## IX — Deferred followups + observations

### IX.1 — NOT closed by this session (FORBIDDEN access OR sibling-flippable)

- `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-GAP` closure-path-ε — **ADVANCED** (module ship); full closure on sibling CI integration.
- P3 §1.2 row `MB-T-PHASE-4-METHODOLOGY-ε-VISUAL-DIFF` — **RESOLVED (β-narrowed)**.
- `docs/FOLLOWUPS.md` row updates — FORBIDDEN; operator natural-cycle.
- Audit row "visual-diff automation" reclassification — FORBIDDEN (audit path).
- Canonical wireframe target PNG commit at `docs/coordination/wireframe-target-2026-05-11.png` — NOT in WRITE territory.

### IX.2 — Patterns surfaced for Round 11 §3.9.D archive

`[KNOWN]` 2 new captured-incident-categories:

1. **Byte-identical-untracked push-race subspecies** (this session, §2 in coord doc) — sibling pushes content identical to current session's untracked file; git refuses fast-forward despite content equivalence. Mitigation: `diff <local-untracked> <(git show <remote>:<path>)` exit-0 → safe to delete + retry.

2. **Manifest territory narrowing forcing deps-injection** — ε's prohibition on src/ + package.json forces a clean deps-injection module surface for testability. Side-benefit: enables unit-test determinism without electron launch. Pattern: tight territory ⇒ better-decoupled module designs ⇒ better testability.

### IX.3 — Pre-existing failure (NOT closing; for visibility)

`[KNOWN]` Per CLAUDE.md §4.5: `cc-console-buffer-migration.test.ts:89` daemon flake continues. Not impacted by this session.

---

## X — Open items + forward checklist

`[KNOWN]` Sibling/operator actions for full ε DoD closure:

1. **Commit canonical wireframe target PNG** at `docs/coordination/wireframe-target-2026-05-11.png` (operator territory; not in this session manifest). Until landed, ε CLI exits 0 with TARGET-ABSENT for all targets.

2. **Author visual-diff target manifest config JSON** (operator-curated, at e.g., `docs/coordination/visual-diff-config.json`):
   ```json
   {
     "targets": [
       {
         "name": "frame-c-default",
         "screenshotPath": "docs/coordination/screenshots/frame-c-default.png",
         "targetImagePath": "docs/coordination/wireframe-target-2026-05-11.png",
         "thresholdPercent": 1.0
       }
     ]
   }
   ```

3. **Add `package.json` scripts entry** in `packages/dispatch-workstation/package.json`:
   ```json
   "verify:visual-diff": "node scripts/methodology-visual-diff-cli.mjs --config ../../docs/coordination/visual-diff-config.json"
   ```
   (sibling/operator session with workstation package.json WRITE territory).

4. **CI workflow file** at `.github/workflows/visual-diff.yml` (optional; can run locally without CI gate). Sample structure:
   ```yaml
   - run: pnpm --filter dispatch-workstation build
   - run: pnpm --filter dispatch-workstation verify:visual-diff
   ```

5. **Tolerance calibration ladder** (post-canonical-target-PNG-land): operator runs initial visual-diff against fresh wireframe target; tunes per-region thresholds; commits tuned config. Future Phase 4 follow-on if needed.

6. **Operator stamp pass** (FORBIDDEN to this session): apply audit + FOLLOWUPS row deltas for "visual-diff automation" advancement.

**Until items 1-3 complete:** ε infrastructure is shipped but invisible at CI runtime — no automated visual-regression gating yet. Operator-manual screenshot diff continues to be the operative Phase 3 gate.

---

## XI — Round 11 PHASE 2 invariant compliance

`[KNOWN]` Operator MANDATORY discipline verified across all 8 commits:

| Invariant | Compliance evidence |
|---|---|
| Per-path `git add` | 8/8 commits — single-file `git add <path>` per commit |
| Per-path `git commit -- <pathspec>` | 8/8 commits — explicit pathspec restriction |
| Pre-commit `git status --short` mandatory | 8/8 commits — status check pre-staging at each WB |
| Refuse-to-commit if outside-territory files in pathspec | N/A — no instance triggered; pathspec discipline preserved invariant |
| Manifest glob match | 8/8 — §3.9.A verified at each pathspec |
| FORBIDDEN files in any commit | **0** |
| Sibling-territory files in any commit | **0** (despite 9+ sibling files visible in working tree across the session) |

See coord doc §5 for detailed metrics table.

---

**End of MB-T-PHASE-4-METHODOLOGY-EPSILON-VISUAL-DIFF findings (2026-05-13).**
