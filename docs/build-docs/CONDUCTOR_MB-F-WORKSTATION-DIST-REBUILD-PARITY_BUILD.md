# MB-F-WORKSTATION-DIST-REBUILD-PARITY — Build doc

**Session**: r12-cw2-workstation-dist-rebuild-parity
**Wave**: R12-CLOSURE-Wave-2 (gen-7 V4 high-concurrency stress cascade)
**Closure-target**: `docs/FOLLOWUPS.md:373` (Tier 2)
**Operator authorization**: gen-7 V4 dispatch (orchestrator-state §16.10 GREEN-LIGHT 2026-05-17)

## §1 — Closure scope

Mirror the `postinstall: tsc` lifecycle hook pattern from `packages/dispatch-core/package.json` (gen-6 closure of FOLLOWUPS:172 via commit `6eaf194`) into `packages/dispatch-workstation/package.json`, so `pnpm install` (post-pull or post-clone) automatically refreshes the workstation's `dist/main/main.js` Electron entry-point.

Single-line addition to the workstation `package.json` scripts block:

```json
"postinstall": "tsc"
```

## §2 — Out-of-scope (deferred)

The workstation `build` script chains `tsc && <9 esbuild scripts>` to produce both the Node-side `dist/main/*.js` (from tsc) and the renderer-side `dist/<panel>/renderer.js` bundles (from esbuild). Per Phase-1 Q-MBFWDR-1=(a) auto-ack under CLAUDE.md §3.4 mechanical-translation envelope, postinstall mirrors the dispatch-core literal — bare `tsc` only. Renderer-bundle freshness remains operator-rebuild-gated at dogfood time and is filed as a Tier-3 sibling followup at WB-final.

## §3 — WB ladder

| WB | Commit | Status |
|----|--------|--------|
| WB1 RED | `2d3982a` | probe-mbf-workstation-dist-rebuild-01 — 3 static assertions about scripts.postinstall, RED 3/3 at HEAD |
| WB1 GREEN | `758e5e2` | `"postinstall": "tsc"` added to workstation package.json + pnpm-install smoke confirms anchor regeneration |
| WB2 GREEN | `011ac3d` | WB2 content-propagation layers consolidated into probe-01 (4 new assertions; total 7/7 PASS) |
| WB-final | _this commit_ | findings + decisions + FOLLOWUPS:373 RESOLVED stamp |

WB2 collapsed RED+GREEN into a single `green:` commit per gen-6 precedent at commit `24c7d41` — the underlying mechanism (postinstall = tsc) was already shipped at WB1 GREEN, so the WB2 probe verifies a working invariant rather than introducing a new failing test.

## §4 — Manifest deviation: probe consolidation

Manifest TERRITORY enumerates only `probe-mbf-workstation-dist-rebuild-01-postinstall-emits-dist.spec.ts` by exact path. Gen-6 dispatch-core ladder used two probe files (`probe-mbf-postpull-01-*` + `probe-mbf-postpull-02-*`).

**Chose CONSOLIDATION into probe-01** rather than authoring a probe-02 outside TERRITORY. Rationale:

1. File name "postinstall-emits-dist" semantically covers content-propagation verification (the "emits" verb naturally includes "emits faithfully").
2. Stays within manifest letter without requiring operator-mediated TERRITORY expansion.
3. Gen-6 precedent at FOLLOWUPS:172 closure §5 establishes that probe-naming is CC-arbitrable when preserving probe executability (`.spec.ts` vs `.test.ts`) — the same arbitration principle applies here to file count, preserving territory boundary.

## §5 — Verification matrix

| Check | Result | Evidence |
|---|---|---|
| WB1 RED state — `scripts.postinstall` undefined | 3/3 probe assertions FAIL | `2d3982a` commit body |
| WB1 GREEN state — hook added | 3/3 probe assertions PASS | `758e5e2` commit body |
| WB1 GREEN smoke — `rm dist/main/main.js && pnpm install` | "postinstall$ tsc" observed; dist/main/main.js regenerated (74291 bytes) | `758e5e2` commit body §"Empirical smoke" |
| WB2 GREEN state — content-propagation layers | 7/7 total PASS | `011ac3d` commit body |
| dispatch-core typecheck | CLEAN | WB-final session |
| dispatch-daemon typecheck | CLEAN | WB-final session |
| dispatch-workstation typecheck | CLEAN | WB-final session |
| dispatch-cli typecheck | CLEAN | WB-final session |
| dispatch-web typecheck | CLEAN | WB-final session |
| §4.6 runtime-launch smoke | N/A — scope did not touch src/main/*.ts; only package.json | Implicit via WB1 GREEN smoke regenerating dist/main/main.js |

## §6 — Operator-stamp envelope items

Operator-only territory items to apply post-session:

- `docs/FOLLOWUPS.md` row 373 RESOLVED stamp — text in findings doc §VII (applied at WB-final commit as operator-stamp-envelope exception per §F shared bootstrap).
- Optional: CLAUDE.md §3.4 amendment to note workstation postinstall parity (operator-only territory; proposed text in decisions doc §IV).
- Optional: 1 NEW Tier-3 followup row `MB-F-WORKSTATION-RENDERER-BUNDLE-POSTINSTALL-PARITY` — proposed text in decisions doc §V.

## §7 — Discoverability

- Build doc: this file
- Findings doc: `docs/coordination/mb-f-workstation-dist-rebuild-parity-findings-2026-05-17.md`
- Decisions doc: `docs/coordination/mb-f-workstation-dist-rebuild-parity-decisions-2026-05-17.md`
- Probe: `packages/dispatch-workstation/test/build/probe-mbf-workstation-dist-rebuild-01-postinstall-emits-dist.spec.ts`
- Reference gen-6 closure: commit `6eaf194` + `docs/coordination/mb-f-dispatch-core-post-pull-rebuild-discipline-findings-2026-05-16.md`
