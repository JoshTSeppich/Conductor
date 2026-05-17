# MB-F-WORKSTATION-DIST-REBUILD-PARITY — closure decisions

**Session**: r12-cw2-workstation-dist-rebuild-parity
**Date**: 2026-05-17
**Wave**: R12-CLOSURE-Wave-2 (gen-7 V4 high-concurrency stress cascade)

---

## §I — Decisions log

| ID | Question | Resolution | Anchor |
|----|----------|------------|--------|
| Q-MBFWDR-1 | Closure scope: `tsc` only vs `pnpm build` vs subset? | (a) Bare `"postinstall": "tsc"` — literal mirror of dispatch-core gen-6 `6eaf194` | Phase-1 diagnose §A; auto-ack §3.4 envelope |
| Q-MBFWDR-2 | WB2 probe shape: content-propagation LIVE+MECHANISM vs static-only? | (a) Content-propagation LIVE+MECHANISM (mirrors gen-6 probe-02 at `24c7d41`) | Phase-1 diagnose §D |
| Q-MBFWDR-3 | `scripts/post-pull-rebuild.sh` named READ-ONLY but absent — manifest deviation? | (a) Note in findings §IV; do not block. Manifest carryover from earlier closure-path universe draft. | Phase-1 diagnose §F |
| Q-MBFWDR-4 | WB2 probe file: separate probe-02 path vs consolidation into probe-01? | (b) Consolidation into probe-01 — stays within manifest TERRITORY letter; gen-6 §5 precedent ratifies probe-naming arbitration | Findings §IV |
| Q-MBFWDR-5 | WB2 commit grammar: separate RED + GREEN or single GREEN? | (b) Single GREEN (mirrors gen-6 `24c7d41` — underlying mechanism shipped at WB1 GREEN; WB2 verifies a working invariant) | Findings §III |

## §II — Risk dispositions

| ID | Risk | Disposition | Notes |
|----|------|-------------|-------|
| R1 | tsc-alone leaves dist/<panel>/renderer.js stale | DEFER via sibling followup | Renderer bundles remain operator-rebuild-gated at dogfood time as today; Tier 3 row proposed §V |
| R2 | Install-cycle slowdown if `pnpm build` chosen | MITIGATED by Q-MBFWDR-1=(a) | Empirical filter-install duration 2.6s; row 373 Tier-2 concern (2) theoretical at this scope |
| R3 | Pre-existing test failures (CLAUDE.md §4.5) | MITIGATED by WB-scoped test invocation | Only ran `test/build/probe-mbf-workstation-dist-rebuild-01-*.spec.ts`; did NOT run full workstation suite per §9 prohibition |
| R4 | Cold install order — workstation tsc imports dispatch-core/dist | DEFER to operator-dogfood post-cascade verification | pnpm workspace topology orders dispatch-core postinstall BEFORE workstation postinstall (modeled-safe per workspace dependency declaration); not explicitly verified from `rm -rf node_modules/.pnpm` clean state |

## §III — Operator-stamp envelope proposals

### §III.1 — FOLLOWUPS.md row 373 RESOLVED stamp

Applied at WB-final commit per shared bootstrap §F step 7 (operator-stamp envelope exception). Text as proposed in findings §VII.

### §III.2 — CLAUDE.md §3.4 amendment (optional)

CLAUDE.md is operator-only territory per CLAUDE.md §1 frozen contracts list. Proposing this §3.4 amendment for operator stamping:

```markdown
### §3.4 dispatch-core dist build discipline

Workstation imports use `dispatch-core/dist/v3/schema.js` paths (compiled artifacts), NOT `dispatch-core/src/v3/schema.ts` (source). TypeScript path-mapping resolves both at typecheck time, but Node ESM at runtime requires the actual `.js` artifact in `dist/`.

**Automated via `packages/dispatch-core/package.json` `postinstall: tsc`** (closed via `MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE` 2026-05-16, commit `6eaf194`) — every `pnpm install` refreshes dispatch-core/dist/* automatically.

**Workstation parity**: `packages/dispatch-workstation/package.json` carries the same `postinstall: tsc` hook (closed via `MB-F-WORKSTATION-DIST-REBUILD-PARITY` 2026-05-17) — every `pnpm install` refreshes `dispatch-workstation/dist/main/main.js` Electron entry-point automatically. Renderer-bundle freshness (`dist/<panel>/renderer.js`) remains operator-rebuild-gated via `pnpm build`; see `MB-F-WORKSTATION-RENDERER-BUNDLE-POSTINSTALL-PARITY` for future parity if/when dogfood surfaces friction.

If CC suspects stale dist after an unusual install state (e.g., `pnpm install --filter` excluding the package), run `pnpm --filter <pkg> build` to force-refresh. Guarded by `probe-mbf-postpull-01-postinstall-or-merge-gate.test.ts` (dispatch-core) and `probe-mbf-workstation-dist-rebuild-01-postinstall-emits-dist.spec.ts` (workstation).
```

### §III.3 — Round 12 archive §1.2 closure-cascade-dispatch-state entry (optional)

Append to `docs/cairn-under-stress-round-12.md` §1.2 closure-cascade-dispatch-state table:

```
| MB-F-WORKSTATION-DIST-REBUILD-PARITY | r12-cw2-workstation-dist-rebuild-parity | 2026-05-17 | Tier 2 → RESOLVED via mechanical-translation §3.4 envelope; literal mirror of gen-6 6eaf194; closes operator-dogfood-stale-workstation-dist class for `dist/main/main.js` entry-point. Renderer bundles deferred to sibling Tier-3 followup. |
```

## §IV — Lessons + cross-session findings

- **§3.4 mechanical-translation envelope is broadly reusable for postinstall-pattern propagation**: both dispatch-core (FOLLOWUPS:172) and dispatch-workstation (this row) closed via the same envelope: gen-6 ratified the pattern; gen-7 mirrored it. The envelope is documented as a load-bearing CC-arbitrable decision class for future post-pull-rebuild parity work (e.g., dispatch-daemon, dispatch-cli if they grow ESM-resolution-critical dist artifacts).
- **Probe-naming arbitration recurrence**: gen-6 arbitrated `.test.ts` vs `.spec.ts` naming; this session arbitrated probe file-count (consolidation vs two-file split). Both arbitrations preserved manifest discipline + probe executability under the same principle ("CC-arbitrable when preserving probe executability + manifest constraints"). Filed as Tier-3 followup row §V.2.

## §V — New Tier-3 followup rows (operator-stamp envelope, optional)

### §V.1 — `MB-F-WORKSTATION-RENDERER-BUNDLE-POSTINSTALL-PARITY`

Proposed text for FOLLOWUPS.md append:

```
| `MB-F-WORKSTATION-RENDERER-BUNDLE-POSTINSTALL-PARITY` | **Tier 3 — extension of `MB-F-WORKSTATION-DIST-REBUILD-PARITY` (RESOLVED 2026-05-17).** Workstation `postinstall: tsc` (this session's closure) covers `dist/main/*.js` (Node-side main process emit) but NOT `dist/<panel>/renderer.js` bundles (tile-grid, chat-shell, coarchitect, console-panel, audit-modal, onboarding, error-display, card-bridge, shell-preload). Renderer bundles require the 9 esbuild scripts chained after `tsc &&` in the `build` script; they remain operator-rebuild-gated at dogfood time. **Closure paths**: (α) replace workstation `postinstall: tsc` with `postinstall: pnpm build` — covers all artifacts but adds ~30-60s to every `pnpm install` (operator already flagged this concern in `MB-F-WORKSTATION-DIST-REBUILD-PARITY` row body Tier-2 reasoning); (β) author a leaner `postinstall:bundles` script that runs only the esbuild scripts (skips tsc since postinstall already does that) and chain via `postinstall: tsc && pnpm postinstall:bundles`; (γ) accept operator-rebuild-gated dogfood discipline + document in CLAUDE.md §3.7 build-pipeline section. **Tier 3** because (1) main process dist is now auto-refreshed (most impactful artifact); (2) operator dogfood reliably re-runs `pnpm build` before sessions touching renderer surfaces; (3) closure-α slows install cycle; closure-β adds new script-naming surface. **Discoverability**: this row + `docs/coordination/mb-f-workstation-dist-rebuild-parity-decisions-2026-05-17.md` §V.1 + parent row 373 RESOLVED stamp 2026-05-17. | r12-cw2-workstation-dist-rebuild-parity findings §IX caveat 2026-05-17 |
```

### §V.2 — `MB-F-MANIFEST-PROBE-NAMING-ARBITRATION-RECURRENCE-CLASS`

Proposed text for FOLLOWUPS.md append (Tier 3 — methodology codification):

```
| `MB-F-MANIFEST-PROBE-NAMING-ARBITRATION-RECURRENCE-CLASS` | **Tier 3 — methodology codification.** Two precedents now exist for CC-arbitrating probe naming / file count when preserving manifest discipline + probe executability: (1) gen-6 dispatch-core post-pull-rebuild — manifest specified `.spec.ts` but vitest.config.ts include glob required `.test.ts` (commit `23f7c88`; FOLLOWUPS:172 findings §5); (2) gen-7 workstation dist-rebuild-parity — manifest enumerated only probe-01 path but gen-6-precedent ladder used two probe files (commit `011ac3d`; FOLLOWUPS:373 closure; consolidation into probe-01 to preserve manifest letter). Same arbitration principle: CC may deviate from manifest naming when (a) the deviation preserves probe executability, (b) the deviation preserves manifest TERRITORY boundary, and (c) the deviation is documented at WB-final findings. **Closure paths**: (α) codify in CLAUDE.md §2.7 or §3.6 as "manifest probe-naming arbitration"; (β) extend territorial-manifest authoring discipline to specify probe-naming with extension-class regex (e.g., `probe-X-*.{spec,test}.ts`) rather than exact filename. **Tier 3** because (1) two-precedent class; (2) closure is documentation-only; (3) recurrence is predictable for future post-pull-rebuild-parity work (e.g., dispatch-daemon, dispatch-cli equivalents). **Discoverability**: this row + gen-6 findings `docs/coordination/mb-f-dispatch-core-post-pull-rebuild-discipline-findings-2026-05-16.md` §5 + gen-7 findings `docs/coordination/mb-f-workstation-dist-rebuild-parity-findings-2026-05-17.md` §IV. | r12-cw2-workstation-dist-rebuild-parity decisions §IV 2026-05-17 |
```

## §VI — Cascade context

- Gen-7 V4 high-concurrency stress cascade (12-cap producing-slot ceiling per V4 §B(II))
- Operator GREEN-LIGHTED 2026-05-17 per orchestrator-state §16.10
- Sibling cohort observed during this session: at least 3 path-disjoint R12-CLOSURE-Wave-2 sessions concurrent (frame-c-root.tsx writer in `packages/dispatch-workstation/src/frame-c/`; dispatch-daemon lifecycle/sessions writer; daemon test/integration probe writer)
- Per-path discipline + `git commit -o <pathspec>` held across all 3 ladder commits — no cross-session contamination

## §VII — Outcome classification (§2.11)

**Improved (binary flip + behavioral quality)** — postinstall hook absent at HEAD pre-session → present at session end; verified by both static probe (3 assertions) AND live mechanism probe (4 assertions including isolated tmpdir tsc subprocess) AND empirical pnpm-install smoke. 5-package typecheck CLEAN. Renderer-bundle parity explicitly out of scope and filed as Tier-3 followup.
