# MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING — headless electron + screenshot + image-diff pipeline for Phase 3 visual-comparison gate

**Status:** DRAFT-AUTO-ACKED-PER-EXPANDED-§C-ENVELOPE
**Date authored:** 2026-05-12
**Authored under:** Full-autonomous mode per operator directive 2026-05-12 OPERATOR DIRECTIVE — MAXIMUM PARALLELIZATION + dispatch §3.5 closure-path-γ framing. Auto-ack §C envelope expanded to include HALT-TICKET-BODY-PRE-COMMIT per P1 dispatch authority (gen-4 orchestrator).
**Authoring delegate:** P1 sub-session (gen-4 orchestrator dispatch, Round 9+ cairn-under-stress)
**Authoring anchor commit (HEAD at authoring time):** `526dd51` (T1 WB-final landing)
**Workstream:** P1 (Max-parallel Round 9 cascade) per `/tmp/dispatch-p1.txt`
**Closes:**
- `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-γ-HEADLESS-SCREENSHOT` (Tier 2, FOLLOWUPS.md:335, filed at T6 `0d71590`) — **primary closure target.** Pointer row's enumerated γ scope (5 sub-items) maps directly to this ticket's WB ladder.
- `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-GAP` (`230cb6c`) closure path γ — completes the α/β/γ triple. α + β shipped at `MB-T-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-α-β` (`0d71590`); this ticket closes γ.
- `MB-F-WIREFRAME-VISUAL-VERIFICATION-GAP` (`64d9249`) closure path — reduces single-point-of-failure operator visual inspection by replacing it with mechanical headless+diff.
- `MB-F-WIREFRAME-PARITY-SCOPE-UNDERESTIMATED` (`c2abb28`) closure-path-γ "visual-comparison gate" — depends on this ticket's tooling.
- Full-build-mode-dispatch §3.5 visual-comparison gate addition to auto-ack §C — currently uses operator-manual fallback; this ticket implements the mechanical path.

**Depends on (all merged):**
- `MB-T-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-α-β` (final at `0d71590`) — α build-freshness gate + β bundle-inclusion verification operative; γ extends the same envelope.
- `pnpm verify:build-freshness` + `pnpm verify:bundle-fingerprint` CLI primitives shipped at `methodology-runtime-verify.mjs` (referenced + extended by Phase 3 smoke harness).
- Existing build pipeline at `packages/dispatch-workstation/scripts/build-*.mjs` (renderer surface bundling per CLAUDE.md §3.7) — Phase 3 smoke launches the built artifacts.
- CLAUDE.md §4.6 runtime-launch smoke convention — Phase 3 generalizes this to headless + automated.

**Downstream gates:**
- All future workstation-touching tickets (T2-WB-final smoke, T3-WB-final smoke, T7-WB-final smoke, future Phase 3 smokes from the wireframe-parity cascade) inherit γ via auto-ack §C amendment.
- Operator-manual-screenshot fallback per dispatch §3.5 retires (or becomes opt-out at HALT-PRE-COMMIT).

**Estimated WB count:** 9-12 baseline (10 WBs default path; ±2 swing per Sub-Q resolutions; +1 if dep-add HALT triggers re-arbitration).

---

## §0 — Reading protocol

1. Read §1 (scope) + §2 (arbitration anchor) first to understand binding vs deferred.
2. Read §3 (Sub-Q gate arbitrations) — six operator decisions parameterize WB scope. Operator-acked default-path Sub-Q resolutions enable §C auto-ack throughout; non-default selections introduce HALT cycles.
3. Read §4 (WB ladder) for execution order. WB1-WB3 do not require new dev deps; WB4 + WB5 are the dep-add HALT zone; WB6+ executes only after operator HALT-PRE-INSTALL clearance.
4. §5-§9 are operational supports — cross-references, self-check expectations, definition of done, risk register, dep-arbitration scoping outline.

Confidence labels per CLAUDE.md §2.2 apply throughout: `[KNOWN]` observed via direct source/file/command read; `[MODELED]` reasoned from observed facts + stated model; `[SPECULATIVE]` hypothesis without evidence; `[KNOWN-OPERATOR-ARBITRATED]` operator-frozen-envelope outcome binding for ticket scope.

---

## §1 — Scope

### §1.1 — What this ticket DOES

`[KNOWN-OPERATOR-ARBITRATED]` per P1 dispatch `/tmp/dispatch-p1.txt` + FOLLOWUPS row 335 γ enumeration + dispatch §3.5 visual-comparison gate γ framing:

1. **Selects a headless electron launch mechanism** via Sub-Q-MBTMP3VVT-A operator-arbitrated test-runner choice (playwright-electron vs electron-mocha vs custom `electron --remote-debugging-port=N` with CDP automation). Author SPIKE per CLAUDE.md §2.8 before production wiring — electron headless API + virtual framebuffer behavior on macOS Darwin 25.3 is non-locally-verifiable until directly observed.

2. **Selects an image-diff library** via Sub-Q-MBTMP3VVT-B (pixelmatch vs sharp vs odiff vs visual-regression-suite). Both Sub-Q-A and Sub-Q-B trigger HALT-PRE-INSTALL operator approval per dispatch §C envelope dep-add rule.

3. **Authors `packages/dispatch-workstation/scripts/phase-3-visual-smoke.mjs`** orchestrating: rebuild (`pnpm --filter dispatch-workstation build`) → launch headless electron → wait for WINDOW_READY sentinel → capture screenshot → compare against target image (configurable path; default `docs/coordination/wireframe-target-2026-05-11.png` per dispatch but with graceful-degradation if absent) → emit summary line for commit body inclusion.

4. **Authors screenshot path convention** `docs/coordination/screenshots/<commit-sha>.png` per dispatch §SCOPE bullet 1. SHA computed at smoke-run time via `git rev-parse HEAD`. Storage strategy: commit screenshots OR `.gitignore` them per Sub-Q-MBTMP3VVT-D operator arbitration.

5. **Authors graceful-degradation logic** for absent wireframe target image per dispatch ANTI-FABRICATION note. When `wireframe-target-2026-05-11.png` (or operator-configured path) is absent OR unreadable: smoke captures + saves the workstation screenshot, emits a summary noting "TARGET-ABSENT — captured screenshot only", exits 0 (does NOT abort). Operator supplies target image asynchronously; subsequent runs upgrade to full diff.

6. **Integrates Phase 3 smoke as closure-path-γ for auto-ack §C envelope** per dispatch §3.5 + §1.1 P1 dispatch:
   - `green:wiring` AUTO-ACK requires (existing §C conditions) AND ONE of: (a) ticket body notes "structural-only, no visual diff" (T6 methodology, non-UI tickets); (b) Phase 3 smoke generated; commit body cites screenshot path; diff result emitted (or TARGET-ABSENT noted).
   - Until this ticket lands, operator-manual-screenshot remains the fallback.

7. **Authors `pnpm verify:phase-3-smoke` CLI primitive** mirroring α-β `verify:build-freshness` + `verify:bundle-fingerprint` pattern. Sub-Q-MBTMP3VVT-A=ii (per-package package.json scripts) operative.

8. **Files audit-doc reclassification candidates** at WB-final docs: dispatch §3.5 closure-path-γ status flips from "operator-manual fallback" → "headless mechanical primary"; auto-ack §C envelope amendment language ratified.

### §1.2 — What this ticket DOES NOT

`[KNOWN-OPERATOR-ARBITRATED]` constraints:

- Does NOT modify the α (`verifyBuildFreshness`) or β (`verifyBundleFingerprint`) primitives at `methodology-runtime-verify.mjs`. γ is additive; α + β preserved verbatim.
- Does NOT modify frozen surfaces: `REGISTRY.md` §2, `CONDUCTOR_API_CONTRACT.md`, `dispatch-core/src/v3/schema.ts` §1-§13, `WORKSTATION_CONTRACT.md` §6. No IPC additions (smoke harness is CI/CLI tooling, not workstation runtime).
- Does NOT modify `CLAUDE.md` §4.6 (existing runtime-launch smoke text) — operator-territory amendment. This ticket's WB-final findings doc surfaces §4.6 ratchet candidates as documentation only.
- Does NOT add E2E test coverage for individual ticket WBs — Phase 3 smoke runs at WB-final boundaries per dispatch §4 Phase 3, not per-WB.
- Does NOT implement δ (DOM-based runtime probes via JSDOM) or ε (wireframes.jsx render → image compare) from `230cb6c` row. Those remain Tier 2 followups; this ticket implements only γ.
- Does NOT close `MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION` (Tier 2 row 271) — unrelated subsystem.
- Does NOT install new dev dependencies WITHOUT operator HALT-PRE-INSTALL clearance per dispatch §5.3 dep-arbitration rule. Two operator-arbitration cycles expected (Sub-Q-A test runner + Sub-Q-B image-diff library).
- Does NOT supply the operator's canonical wireframe target image. Target image is operator-supplied out-of-band; this ticket's tooling handles absence gracefully.

---

## §2 — Arbitration anchor (operator-frozen via P1 dispatch 2026-05-12)

### §2.1 — Dispatch §3.5 visual-comparison gate γ enumeration (binding)

`[KNOWN-OPERATOR-ARBITRATED]`

Per `docs/coordination/full-build-mode-dispatch.md` §3.5: visual-comparison gate addition to auto-ack §C envelope requires (existing §C conditions) AND ONE of (a) structural-only flag OR (b) headless screenshot + diff. Per `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-γ-HEADLESS-SCREENSHOT` row 335 γ scope: (1) dev dep arbitration; (2) headless launch test-harness; (3) screenshot capture point + path; (4) commit-body integration; (5) optional visual-diff against canonical wireframe target.

This ticket SHIPS γ functionally; auto-ack §C envelope ratifies γ as primary visual-verification gate (with operator-manual fallback retained as opt-out).

### §2.2 — P1 dispatch authority (binding)

`[KNOWN-OPERATOR-ARBITRATED]` per `/tmp/dispatch-p1.txt`:

- Full-autonomous mode operative; §C envelope expanded to include HALT-TICKET-BODY-PRE-COMMIT auto-ack
- Surface only on hard-escalation triggers: contract amendments + anti-fabrication + cross-session conflicts + test failures outside baseline + NEW arbitration
- NEW dev dep additions are explicit HALT-PRE-INSTALL (operator approves package.json modification BEFORE add)
- Spike-before-production-code per CLAUDE.md §2.8 for non-locally-verifiable behavior (electron headless launch API)

### §2.3 — Anti-fabrication on wireframe target image (binding)

`[KNOWN per P1 dispatch ANTI-FABRICATION NOTE + orchestrator-gen-4 verified missing via direct find/ls]`:
`docs/coordination/wireframe-target-2026-05-11.png` does NOT exist in repo at HEAD `526dd51`. Tooling treats the target-image path as a configurable string (default to a placeholder); diff tooling fails gracefully if target image absent rather than abort. Operator supplies target image out-of-band.

### §2.4 — Construction order (file ownership for parallel-CC discipline)

`[KNOWN per CLAUDE.md §3.7 + α-β ticket §2.4 precedent]`

P1 primary territory:
- NEW: `packages/dispatch-workstation/scripts/phase-3-visual-smoke.mjs` (smoke orchestrator)
- NEW: `packages/dispatch-workstation/scripts/screenshot-helper.mjs` (extract headless-launch + capture)
- NEW: `packages/dispatch-workstation/scripts/image-diff-helper.mjs` (extract diff library invocation)
- NEW: `packages/dispatch-workstation/test/unit/methodology/phase-3-smoke/probe-mbtmp3vvt-{01..N}.spec.{ts,mjs}` (vitest probes for graceful-degradation logic, path computation, summary formatting)
- MOD: `packages/dispatch-workstation/package.json` scripts section — add `verify:phase-3-smoke` + dev deps (Sub-Q-A + Sub-Q-B selections)
- MOD: `packages/dispatch-workstation/package.json` devDependencies — HALT-PRE-INSTALL operator gate
- CONDITIONAL NEW: `docs/coordination/screenshots/.gitkeep` (Sub-Q-D=(α) commit screenshots path) OR `docs/coordination/screenshots/` entry in repo-root `.gitignore` (Sub-Q-D=(β) ignore path)
- NEW: `docs/coordination/mbtmp3vvt-findings-2026-05-12.md` (WB-final findings doc)
- MOD: `docs/FOLLOWUPS.md` — closure stamp on row 335 + any new Tier 3 filings

Path-disjoint from co-active sub-sessions per dispatch §5.1:
- T1 sub-session: COMPLETE at `526dd51` (this ticket's anchor HEAD)
- T2 sub-session: `src/frame-c/detail-pane.tsx` + `src/frame-c/terminal-stream*.tsx` — path-disjoint from `scripts/` + `test/unit/methodology/`
- T3 sub-session: `src/frame-c/action-bar.tsx` — path-disjoint
- T6 sub-session: `scripts/methodology-runtime-verify.mjs` (α + β; shipped) — P1 adds NEW sibling scripts, does NOT modify methodology-runtime-verify.mjs
- T7 sub-session: visual polish — path-disjoint at file level

No file-level conflicts identified at authoring time.

---

## §3 — Sub-Q gate arbitrations REQUIRED before specific WBs

Six operator decisions parameterize WB scope. Per expanded §C envelope, ticket body auto-acks; Sub-Qs surface at HALT-PRE-INSTALL gates for dep additions OR HALT-PRE-COMMIT for non-default selections. Defaults if unresolved are `[MODELED]` recommendations.

### §3.1 — Sub-Q-MBTMP3VVT-A: headless electron launch mechanism

Required before **WB2** (spike) + **WB4** (production wiring). Default if unresolved: **(i) playwright-electron** (HALT-PRE-INSTALL at WB4).

| Option | Mechanism | Dev-dep cost | Failure-mode | Spike-feasibility |
|---|---|---|---|---|
| (i) playwright-electron | NPM `playwright` + `_electron` API from `@playwright/test`; launches packaged electron with `playwright.electron.launch(...)`; CDP-based control + screenshot via page.screenshot() | NEW dep `@playwright/test` (~100MB install); well-maintained; broad CI support | API may not match electron 28+ packaging; macOS gatekeeper may interfere | `[MODELED-HIGH]` — well-documented; many community examples |
| (ii) electron-mocha | NPM `electron-mocha`; runs mocha tests inside electron renderer; capture via `webContents.capturePage()` | NEW dep `electron-mocha` (~20MB); smaller scope; mocha-style test harness | Test-runner-not-screenshot-tool — screenshot is secondary use case; harness coupling to vitest may conflict | `[MODELED-MEDIUM]` — feasible but less ergonomic for screenshot-as-primary-output |
| (iii) Custom electron --remote-debugging-port + CDP client | Launch `electron` directly with `--remote-debugging-port=N`; control via `chrome-remote-interface` NPM (small dep) | NEW dep `chrome-remote-interface` (~5MB); lightest; most control | More integration boilerplate; brittle to electron version bumps; minimal community examples | `[MODELED-MEDIUM]` — viable but bespoke |
| (iv) electron only, no test runner | Spawn `electron dist/main/main.js`; observe via custom IPC + capture via webContents.capturePage() via NEW IPC channel | NO new dep; reuses existing electron | Adds new IPC channel (touches `WORKSTATION_CONTRACT.md` §6 — operator-arbitrated amendment); higher methodology cost than test-runner option | `[MODELED-MEDIUM]` — possible but couples runtime to test harness |

`[MODELED]` Recommend **(i) playwright-electron** for breadth + maintenance + community ecosystem. Sub-Q-A=(iii) chrome-remote-interface is a viable lighter-weight fallback if operator wants minimal-dep footprint. Sub-Q-A=(iv) is the "no new dep" option but introduces frozen-surface §6 amendment risk — not worth the trade-off vs adding a test-runner dep.

Operator decision pending at HALT-PRE-INSTALL (WB4 gate). Per dispatch §C ticket-body auto-ack, this Sub-Q is stated here but actual install is HALT-gated.

### §3.2 — Sub-Q-MBTMP3VVT-B: image-diff library

Required before **WB6** (image-diff probe) + **WB7** (production wiring). Default if unresolved: **(i) pixelmatch + pngjs** (HALT-PRE-INSTALL at WB6/WB7).

| Option | Mechanism | Dev-dep cost | Output | Spike-feasibility |
|---|---|---|---|---|
| (i) pixelmatch + pngjs | Pure-JS pixel-by-pixel diff with anti-aliasing tolerance; outputs diff image + mismatch count | NEW dep `pixelmatch` + `pngjs` (~1MB total); zero-binary; pure-JS portability | Pixel-mismatch count → percentage; diff PNG saved adjacent | `[MODELED-HIGH]` — battle-tested; clear API |
| (ii) sharp | Image processing library with diff capability via image arithmetic; native deps | NEW dep `sharp` (~30MB; native libvips bindings); heavier; macOS arm64 prebuilt available | More flexible (resize, format conversion, perceptual metrics); larger API surface | `[MODELED-MEDIUM]` — feasible but overkill for binary-pixel-diff use case |
| (iii) odiff | Native binary diff (Rust-based); fastest for large images; precompiled | NEW dep `odiff-bin` (~10MB); native binary; macOS arm64 supported | Faster than pixelmatch for high-res; structured output | `[MODELED-LOW-MEDIUM]` — newer; smaller community |
| (iv) custom Buffer comparison | Direct Buffer compare of PNG bytes (post-decode) | NO new dep; reuses `pngjs` if existing OR raw fs.readFileSync | NO anti-aliasing tolerance; pixel-exact only; brittle | `[MODELED-MEDIUM]` — usable for "is identical" but not "is similar within threshold" |

`[MODELED]` Recommend **(i) pixelmatch + pngjs** — battle-tested, pure-JS (no native build deps), small footprint, clear threshold semantics. Sub-Q-B=(iv) custom-buffer is the no-new-dep option but loses anti-aliasing tolerance — false-positive failures on font rendering and sub-pixel layout differences.

Operator decision pending at HALT-PRE-INSTALL.

### §3.3 — Sub-Q-MBTMP3VVT-C: diff threshold semantics

Required before **WB7** (image-diff probe). Default if unresolved: **(i) mismatch-pixel-percentage ≤ 1%**.

| Option | Threshold semantics | Tunability |
|---|---|---|
| (i) Pixel-percentage ≤ 1% (recommended) | `mismatched_pixels / total_pixels ≤ 0.01`. Simple, deterministic, well-understood. Configurable via env var `MB_PHASE_3_DIFF_THRESHOLD` (default 0.01). | High — operator tunes via env at runtime; reasonable starting point per pixelmatch docs |
| (ii) Perceptual distance | Use perceptual hashing (pHash) or SSIM (structural similarity index) — measures perceived similarity not pixel-exactness | Less tunable; harder to debug; requires more sophisticated tooling |
| (iii) Region-of-interest masks | Defined regions (e.g., "session list region only") compared individually; chrome ignored | More precise but requires authoring + maintaining region masks; couples diff to wireframe-layout assumptions |

`[MODELED]` Recommend **(i)** for ship-velocity + tunability. Sub-Q-C=(iii) region masks are the canonically-correct path for visual-completeness diffing (avoids false positives on dynamic content) but introduce mask-authoring overhead; defer to Tier 3 ratchet if Sub-Q-C=(i) proves noisy.

Operator decision pending; default acceptable for §C auto-ack.

### §3.4 — Sub-Q-MBTMP3VVT-D: screenshot storage path + git tracking

Required before **WB5** (storage convention). Default if unresolved: **(β) `.gitignore` `docs/coordination/screenshots/`** (do NOT commit binary artifacts).

| Option | Path | Git tracking |
|---|---|---|
| (α) Commit screenshots | `docs/coordination/screenshots/<sha>.png` per dispatch §SCOPE bullet 1 | Tracked — every commit's screenshot lands; repo grows ~1MB/commit (PNG compression) |
| (β) Gitignore screenshots (recommended) | Same path; `docs/coordination/screenshots/<sha>.png` | NOT tracked; smoke regenerates on demand; commit-body cites path but artifact lives only in CI / local dev caches |
| (γ) Hybrid: ratchet commits only target-image-aware diffs | Same path; gitignore by default; commit ONLY when diff-PASS lands (golden screenshot) | Selective; preserves milestone golden snapshots |

`[MODELED]` Recommend **(β) gitignore** to prevent binary-bloat in git history. Phase 3 smoke regenerates at every WB-final cycle; commit body cites SHA-derived path; operators retrieve from CI artifacts OR re-run smoke locally. Sub-Q-D=(α) preserves dispatch §SCOPE wording literally but at git-bloat cost; trade-off operator-arbitrated.

Operator decision pending; default acceptable for §C auto-ack (does NOT require HALT-PRE-INSTALL).

### §3.5 — Sub-Q-MBTMP3VVT-E: auto-ack §C envelope amendment scope

Required before **WB8** (envelope amendment). Default if unresolved: **(ii) Phase 3 smoke optional with explicit opt-out flag**.

| Option | Amendment semantics |
|---|---|
| (i) Required for all green:wiring | Every workstation-touching `green:` commit MUST run Phase 3 smoke + cite screenshot/diff result. No opt-out. |
| (ii) Optional with explicit opt-out (recommended) | Workstation-touching `green:` commits MAY run Phase 3 smoke; if they do, cite results. Opt-out via ticket body "structural-only, no visual diff" note (e.g., methodology tickets, test-fixture changes). Per dispatch §3.5 existing wording — this is the established pattern. |
| (iii) Required for ticket-level WB-final only | Per-WB commits skip smoke; WB-final smoke is mandatory. Reduces overhead. |

`[MODELED]` Recommend **(ii)** matching dispatch §3.5 already-amended language. Sub-Q-E=(iii) is a viable compromise reducing CI/dev-cycle time at per-WB granularity; defer to operator preference based on dogfood.

Operator decision pending; default acceptable for §C auto-ack.

### §3.6 — Sub-Q-MBTMP3VVT-F: WINDOW_READY sentinel signaling

Required before **WB4** (production launch). Default if unresolved: **(i) data-attribute sentinel via DOM polling**.

| Option | Sentinel mechanism | Headless-launcher coupling |
|---|---|---|
| (i) data-attribute sentinel via DOM polling (recommended) | Smoke harness polls for `[data-app-ready="true"]` attribute on `#shell` (or equivalent) which workstation main.ts sets after WINDOW_READY emit. Add attribute setter at main.ts if absent (workstation-internal change; not contract). | Pure DOM polling via headless test runner; no IPC needed |
| (ii) Console-log sentinel | main.ts emits `console.log('WINDOW_READY')` (already does per CLAUDE.md §4.6); smoke harness greps stdout from electron process | Couples to stdout capture from launcher; less portable across runners |
| (iii) NEW IPC `phase-3:ready` channel | main.ts emits to renderer on WINDOW_READY; renderer surfaces via webContents | Requires `WORKSTATION_CONTRACT.md` §6 amendment — operator-arbitrated; over-scope |

`[MODELED]` Recommend **(i)** for renderer-side observability without contract touch. Sub-Q-F=(ii) reuses existing console-log emit (zero workstation change) but couples diff harness to stdout capture; portability trade-off. Sub-Q-F=(iii) is canonical IPC route but operator-arbitrated frozen-surface amendment.

Operator decision pending; default acceptable for §C auto-ack.

---

## §4 — WB ladder

10 WBs baseline (defaults: A=(i), B=(i), C=(i), D=(β), E=(ii), F=(i)). 9-12 WB swing per Sub-Q resolutions + dep-add HALT outcomes.

Each WB follows cairn methodology: red authors failing probe; green implements minimum; commit body carries Q1-Q9 self-check per CLAUDE.md §10.5 + CONDUCTOR_API_CONTRACT.md §10.5; per-path `git add` per CLAUDE.md §2.7; pathspec-commit per `MB-F-CROSS-SESSION-STAGING-AREA-COMMIT-CONTAMINATION-2026-05-12` discipline; push after each cairn-grammar commit per CLAUDE.md §2.6.

### WB1 — `red(MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING): probe-mbtmp3vvt-01-smoke-script-contract`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/unit/methodology/phase-3-smoke/probe-mbtmp3vvt-01-smoke-script-contract.spec.ts` (NEW). Source-text inspection of `packages/dispatch-workstation/scripts/phase-3-visual-smoke.mjs`: asserts file exists + exports a top-level `runPhase3Smoke(opts)` function. Probe fails RED — file absent.
**Acceptance:** RED on import-resolve failure. Commit body Q1-Q9.
**Frozen contracts touched:** none — probe-only.

### WB2 — `spike(MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING): playwright-electron headless launch + screenshot capture`

**Type:** spike (per CLAUDE.md §2.8 — electron headless API is non-locally-verifiable until directly observed on macOS Darwin 25.3)
**Scope:** Author SPIKE script at `/tmp/spike-mbtmp3vvt-playwright-electron.mjs` (NOT committed; scratch). Verify: (a) playwright-electron can launch `dist/main/main.js`; (b) WINDOW_READY sentinel observable; (c) `page.screenshot({ path })` produces a non-empty PNG. ADR landed inline in commit body: confirmed behavior + observed limitations. NO production code, NO dep install at this WB.
**Acceptance:** Spike script runs to completion OR documented failure mode; commit body records [KNOWN] observations. Commit body Q1-Q9.
**Frozen contracts touched:** none — observational spike.

### WB3 — `green(MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING): phase-3-visual-smoke.mjs skeleton + WB1 probe flip`

**Type:** green
**Scope:** GREEN at NEW `packages/dispatch-workstation/scripts/phase-3-visual-smoke.mjs`. Skeleton implementation: exports `runPhase3Smoke(opts: { targetImagePath?: string, screenshotDir?: string, sha?: string }): Promise<SmokeResult>`. Function returns a structured result object (state: 'PASS' | 'FAIL' | 'TARGET-ABSENT' | 'BUILD-FAILED' | 'LAUNCH-FAILED'; screenshotPath?: string; mismatchPercent?: number; summary: string). Implementation body at WB3 is stub: launches build via execFileSync, calls TODO-marked launch/screenshot/diff steps (filled in WB5/WB7/WB9). Flips WB1 probe RED→GREEN on import-resolve.
**Acceptance:** WB1 probe RED→GREEN. Commit body Q1-Q9.
**Frozen contracts touched:** none.

### WB4 — `green(MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING): HALT-PRE-INSTALL Sub-Q-A dep-add + headless launch wiring`

**Type:** green (HALT-PRE-INSTALL gate)
**Scope:** **HALT-WB4-PRE-INSTALL** for operator approval of Sub-Q-A dep-add (default: `pnpm add -D -F dispatch-workstation @playwright/test`). After ack, install dep + extend phase-3-visual-smoke.mjs with `launchHeadless(opts): Promise<{ page, dispose }>` invoking playwright-electron's `_electron.launch({ args: ['dist/main/main.js'], headless: true })` (or runner-specific equivalent). Wait for WINDOW_READY sentinel per Sub-Q-F (default: poll for `[data-app-ready="true"]` attribute). May require small workstation main.ts edit to SET that attribute post-WINDOW_READY emit — confirm at SPIKE; sentinel-zone'd change if needed.
**Acceptance:** Headless launch succeeds; WINDOW_READY observable; smoke harness returns within timeout. Commit body Q1-Q9.
**Frozen contracts touched:** package.json (workstation-internal; not §6); CONDITIONAL workstation main.ts data-attribute setter (workstation-internal; not §6).

### WB5 — `red(MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING): probe-mbtmp3vvt-02-screenshot-capture`

**Type:** red
**Scope:** RED probe at `probe-mbtmp3vvt-02-screenshot-capture.spec.ts`. Asserts: phase-3-visual-smoke.mjs exports `captureScreenshot(opts: { page, outPath }): Promise<void>` that writes a non-empty PNG to outPath. Probe fails RED — function absent. Mocked playwright page passed in.
**Acceptance:** RED. Commit body Q1-Q9.

### WB6 — `green(MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING): screenshot capture + path computation + Sub-Q-D storage`

**Type:** green
**Scope:** GREEN at phase-3-visual-smoke.mjs + NEW `screenshot-helper.mjs`:
- `captureScreenshot({ page, outPath })` calls `page.screenshot({ path: outPath, type: 'png' })`.
- Path computation: SHA from `git rev-parse HEAD` → `docs/coordination/screenshots/<sha>.png` per dispatch §SCOPE.
- mkdirSync(dir, { recursive: true }) for dir creation.
- Sub-Q-D=(β) default: add `docs/coordination/screenshots/` to repo-root `.gitignore` IF not already present.
- WB5 probe RED→GREEN.
**Acceptance:** WB5 probe flips. Commit body Q1-Q9.
**Frozen contracts touched:** repo `.gitignore` if Sub-Q-D=(β).

### WB7 — `red+green(MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING): HALT-PRE-INSTALL Sub-Q-B dep-add + image-diff probe + impl`

**Type:** red+green paired (probe RED before dep-add; flips after)
**Scope:** **HALT-WB7-PRE-INSTALL** for Sub-Q-B dep-add (default: `pnpm add -D -F dispatch-workstation pixelmatch pngjs`). After ack:
- Author RED probe `probe-mbtmp3vvt-03-image-diff.spec.ts` — asserts NEW `image-diff-helper.mjs` exports `diffImages({ leftPath, rightPath, outDiffPath }): Promise<{ mismatchedPixels, totalPixels, ratio }>`.
- GREEN: `image-diff-helper.mjs` reads both PNGs via pngjs, runs pixelmatch with default options (threshold 0.1), writes diff PNG to outDiffPath, returns structured result.
- Graceful-degradation: when leftPath OR rightPath absent OR unreadable → return `{ mismatchedPixels: -1, totalPixels: 0, ratio: NaN, error: 'TARGET-ABSENT' | 'READ-FAILED' }` (NOT throw).
**Acceptance:** Probe flips RED→GREEN within WB. Commit body Q1-Q9.

### WB8 — `red(MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING): probe-mbtmp3vvt-04-graceful-degradation`

**Type:** red
**Scope:** RED probe at `probe-mbtmp3vvt-04-graceful-degradation.spec.ts`. Asserts: when `wireframe-target-2026-05-11.png` does NOT exist (anti-fabrication note per ticket §2.3), `runPhase3Smoke({ targetImagePath: '<absent path>' })` returns `{ state: 'TARGET-ABSENT', screenshotPath, summary }` (does NOT throw or exit non-zero). Probe fails RED — orchestration logic absent.
**Acceptance:** RED. Commit body Q1-Q9.

### WB9 — `green(MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING): orchestration + graceful-degradation + summary formatting`

**Type:** green
**Scope:** GREEN at phase-3-visual-smoke.mjs `runPhase3Smoke` orchestration: rebuild → launch → screenshot → diff → emit summary. Branches:
- BUILD-FAILED if `pnpm --filter dispatch-workstation build` exit ≠ 0
- LAUNCH-FAILED if headless launch timeout (default 30s)
- TARGET-ABSENT if target image not readable (per WB8 probe)
- PASS if mismatchPercent ≤ threshold (Sub-Q-C=(i) default 1%)
- FAIL otherwise

Summary format (single line for commit body inclusion):
```
Phase 3 smoke: <STATE> screenshot=<path> [mismatch=<percent>%] [target=<path>] [duration=<s>s]
```

Flips WB8 probe RED→GREEN.
**Acceptance:** All branches verifiable via unit tests. Commit body Q1-Q9.

### WB10 — `green(MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING): verify:phase-3-smoke CLI primitive + auto-ack §C amendment + WB-final docs`

**Type:** green (CLI + envelope + docs)
**Scope:**
- MOD `packages/dispatch-workstation/package.json` scripts: add `"verify:phase-3-smoke": "node scripts/phase-3-visual-smoke.mjs"` mirroring α-β `verify:build-freshness` + `verify:bundle-fingerprint` pattern.
- Author auto-ack §C envelope amendment per Sub-Q-E=(ii) recommendation — text drafted at `docs/coordination/auto-ack-c-amendment-mbtmp3vvt-2026-05-12.md` (separate file from ticket body; orchestrator-arbitrated landing per §3.5 visual-comparison-gate addition wording).
- Author findings doc at `docs/coordination/mbtmp3vvt-findings-2026-05-12.md` per α-β findings doc format anchor (I What shipped / II Sub-Q disposition / III architectural deltas / IV probe distribution / V architecture notes / VI documentation drift / VII consumer non-regression / VIII WB skip rationale / IX new followups / X open items).
- Stamp closure on FOLLOWUPS row 335 `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-γ-HEADLESS-SCREENSHOT` with closure SHA reference.
- File any Tier 3 followups: e.g., `MB-F-PHASE-3-SMOKE-THRESHOLD-TUNING` if Sub-Q-C=(i) defaults prove noisy at dogfood; deferred to operator-driven escalation.
**Acceptance:** package.json scripts CLI primitive shipped; auto-ack §C amendment text staged; findings doc + FOLLOWUPS updates land. Commit body Q1-Q9.
**Frozen contracts touched:** package.json scripts (workstation-internal); auto-ack §C envelope (orchestrator-arbitrated; separate operator landing per §3.5 visual-comparison-gate addition).

---

## §5 — Cross-references

### §5.1 — Followups CLOSED by this ticket

| Followup / Row | Tier | Closure path | Closing WB |
|---|---|---|---|
| `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-γ-HEADLESS-SCREENSHOT` (FOLLOWUPS.md:335) | Tier 2 | All 5 sub-items per row body: dev-dep arb (WB4 + WB7); headless launch (WB4); screenshot capture + path (WB6); commit-body integration (WB10 + §C amendment); diff against wireframe target (WB7 + WB9 graceful-degradation) | WB10 |
| `MB-F-METHODOLOGY-RUNTIME-VERIFICATION-GAP` (`230cb6c`) closure path γ | Tier 1 | Completes α+β+γ triple per `230cb6c` row body | WB10 |
| `MB-F-WIREFRAME-VISUAL-VERIFICATION-GAP` (`64d9249`) closure path (partial) | Tier 1 | Replaces operator-visual single-point-of-failure with mechanical primary path | WB10 |
| Full-build-mode-dispatch §3.5 visual-comparison gate (operator-manual fallback portion) | (dispatch row) | §C envelope amendment per Sub-Q-E=(ii) operationalizes mechanical primary path | WB10 |

### §5.2 — Followups likely to surface during this ticket

`[MODELED-SPECULATIVE]`:

- WB2 SPIKE may surface: playwright-electron's `_electron.launch` API behavior on macOS Darwin 25.3 against electron-packaged `dist/main/main.js`. If launch fails (e.g., electron version mismatch, gatekeeper interference), file Tier 2 `MB-F-PHASE-3-SMOKE-MACOS-GATEKEEPER` and fall back to Sub-Q-A=(iii) chrome-remote-interface.
- WB7 image-diff may surface: false-positive failures on font-rendering / anti-aliasing differences. Tune pixelmatch's `threshold` option OR file Tier 3 `MB-F-PHASE-3-SMOKE-AA-TOLERANCE`.
- WB10 §C envelope amendment may surface: orchestrator-arbitration scope (per §3.5 visual-comparison-gate addition wording). File Tier 2 if mid-ticket scope changes.
- Target image asynchronous arrival: when operator uploads `wireframe-target-2026-05-11.png`, subsequent smoke runs will perform full diff; any false-positives at first-true-diff fire Tier 3 tuning followups.

### §5.3 — Related shipped tickets (read-required at WB1 start)

| Ticket | Anchor | Read scope at WB1 |
|---|---|---|
| `MB-T-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-α-β` | `0d71590` (final WB6 docs) | `scripts/methodology-runtime-verify.mjs` (α + β primitives); ticket body §1.2 γ-deferral language; findings doc `docs/coordination/mbtmrvcab-findings-2026-05-12.md` §IX γ pointer |
| Full-build-mode dispatch | `4f0bbde` (committed) | §3.5 visual-comparison gate + §4 Phase 3 + §5.3 ANNOUNCEMENT pattern |

### §5.4 — Dispatch + audit doc anchors

- `docs/coordination/full-build-mode-dispatch.md` §3.5 (closure-path-γ + §C visual-comparison-gate amendment) + §4 Phase 3 (integration step)
- `/tmp/dispatch-p1.txt` (P1 dispatch authority)
- `docs/build-docs/CONDUCTOR_MB-T-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-α-β_BUILD.md` (T6 format anchor + α-β shipping precedent)

---

## §6 — Self-check Q1-Q9 expectations per WB commit (CONDUCTOR_API_CONTRACT.md §10.5)

| WB | Q1 (spike?) | Q2 (mocks?) | Q3 (impl-deleted-passes?) | Q4 (outside contract?) | Q5 (frozen mod?) | Q6 (labels?) | Q7 (parallel territory?) | Q8 (bypass PATCH?) | Q9 (halt-unauth?) |
|---|---|---|---|---|---|---|---|---|---|
| WB1 RED | N/A — source-text inspection | BEHAVIOR (fs.readFileSync) | No — file absent | No | No | KNOWN/MODELED | new scripts/ + test/ path-disjoint | N/A | No |
| WB2 SPIKE | YES — spike-before-prod per §2.8 | N/A — observational; not committed | N/A | No | No | KNOWN per direct observation | scratch /tmp; no repo file touched | N/A | No |
| WB3 GREEN | (see WB2) | BEHAVIOR (real import + function call) | No — skeleton load-bearing | No | No | KNOWN/MODELED | scripts/ new | N/A | No |
| WB4 GREEN | (see WB2) | BEHAVIOR (real headless launch) | No — launch impl load-bearing | No | No (workstation-internal data-attribute) | KNOWN/MODELED + HALT-PRE-INSTALL | scripts/ + workstation main.ts sentinel-zone'd | N/A | HALT-PRE-INSTALL fired + cleared |
| WB5 RED | N/A | BEHAVIOR | No | No | No | KNOWN/MODELED | new probe path-disjoint | N/A | No |
| WB6 GREEN | N/A | BEHAVIOR (real PNG write) | No | No | No (.gitignore is repo-tracked but not §6) | KNOWN/MODELED | scripts/ + .gitignore | N/A | No |
| WB7 RED+GREEN | N/A | BEHAVIOR (real pixelmatch invocation) | No | No | No | KNOWN/MODELED | scripts/ + new probe + HALT-PRE-INSTALL | N/A | HALT-PRE-INSTALL fired + cleared |
| WB8 RED | N/A | BEHAVIOR (mocked target absence) | No | No | No | KNOWN/MODELED | new probe | N/A | No |
| WB9 GREEN | N/A | BEHAVIOR (orchestration chain) | No | No | No | KNOWN/MODELED | scripts/ | N/A | No |
| WB10 GREEN | N/A | N/A (docs + CLI primitive) | N/A | No | No | KNOWN/MODELED | package.json + docs/coordination/ + FOLLOWUPS.md | N/A | No |

---

## §7 — Definition of done

The ticket is DONE when ALL of the following hold:

1. **WB1-WB10 cairn ladder lands**: each RED probe flips RED → GREEN at the corresponding GREEN WB; commit chain pushed.
2. **`pnpm verify:phase-3-smoke` CLI primitive** exists in workstation package.json scripts; invocable per α-β `verify:build-freshness` precedent.
3. **`phase-3-visual-smoke.mjs` orchestrates** rebuild → launch → screenshot → diff → summary across all 5 branches (BUILD-FAILED / LAUNCH-FAILED / TARGET-ABSENT / PASS / FAIL).
4. **Graceful-degradation verified**: when target image absent, smoke returns TARGET-ABSENT + exit 0, NOT abort. Per anti-fabrication note §2.3.
5. **Auto-ack §C envelope amendment text drafted** at `docs/coordination/auto-ack-c-amendment-mbtmp3vvt-2026-05-12.md` per Sub-Q-E recommendation; ratification deferred to orchestrator landing per §3.5 amendment wording.
6. **FOLLOWUPS row 335 closure stamped** with closure SHA reference; γ scope items 1-5 mapped to landing WBs.
7. **5-package typecheck CLEAN** per CLAUDE.md §4.4 — workstation typecheck shipped at WB-final cycle (other packages untouched).
8. **WB-final findings doc** at `docs/coordination/mbtmp3vvt-findings-2026-05-12.md` per α-β format anchor.
9. **No consumer regression**: α-β probes (build-freshness + bundle-fingerprint) continue to pass; T1 + T2 + T3 + T6 + T7 probes unaffected by package.json + .gitignore + scripts/ additions.
10. **Phase 3 smoke self-runs against this ticket's WB-final commit** as the inaugural γ closure demonstration. Result captured in WB-final commit body + findings doc.

---

## §8 — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| WB2 SPIKE reveals playwright-electron incompatibility with electron 28+ packaged via dist/main/main.js | `[MODELED-MEDIUM]` (electron + playwright-electron version-matrix volatile) | `[MODELED-MEDIUM]` (fall back to Sub-Q-A=(iii) chrome-remote-interface; +1-2 WBs) | WB2 SPIKE explicit per §2.8; surface ADR at HALT-WB2-PRE-COMMIT if non-default fallback selected |
| HALT-PRE-INSTALL at WB4 + WB7 delays ladder cadence | `[KNOWN]` (operator-arbitrated dep additions per dispatch §5.3) | `[MODELED-LOW]` (each HALT is single ack cycle; cumulative ≤ 2 cycles) | Surface HALT-PRE-INSTALL with dep details inline (name + version + size + alternatives) so operator has all info upfront |
| Image-diff false-positives on font rendering / anti-aliasing | `[MODELED-MEDIUM]` (pixelmatch tolerates AA via threshold; tunable) | `[MODELED-LOW]` (operator-tunable via env var; Tier 3 ratchet path) | Sub-Q-C=(i) default 1% pixel-percent + `MB_PHASE_3_DIFF_THRESHOLD` env override; file Tier 3 if noisy |
| Target image not supplied by operator before first WB-final smoke run | `[KNOWN per §2.3]` | `[MODELED-LOW]` (graceful-degradation per WB8/WB9; smoke captures screenshot + reports TARGET-ABSENT) | Per WB8 probe Condition 1 + WB9 graceful-degradation branch; ship works even with absent target |
| macOS gatekeeper / SIP interferes with headless electron launch | `[MODELED-MEDIUM]` (codesigning + sandbox issues on macOS) | `[MODELED-MEDIUM]` (delays + may require xattr trickery) | WB2 SPIKE surfaces this; falls back to Sub-Q-A=(iii) CDP or Sub-Q-A=(iv) IPC-based capture if blocking |
| §C envelope amendment landing requires separate orchestrator commit cycle | `[KNOWN per §3.5 wording]` | `[MODELED-LOW]` (parallel-trackable; not blocking γ tooling ship) | WB10 drafts amendment text only; orchestrator-arbitrated landing at separate commit cycle |
| Cross-session contamination during multi-WB cycle | `[KNOWN per row 335 + Tier 1 ratchet 63581e9]` | `[MODELED-MEDIUM]` (refused commit + clean re-stage cycle per T1 WB2 precedent) | Pre-commit `git status --short` audit at every WB; pathspec-add + pathspec-commit both applied; HALT-CROSS-SESSION if contamination detected |
| `pnpm add` adds dep to workstation package.json that conflicts with monorepo root deps | `[MODELED-LOW]` (pnpm workspace handles per-package deps) | `[MODELED-LOW]` (monorepo resolution catches at install) | `pnpm install` post-add to verify; surface at HALT-PRE-INSTALL if non-trivial conflict |
| Test runner choice locks future Phase 3 evolution | `[MODELED-LOW]` (`runPhase3Smoke` abstraction insulates) | `[MODELED-LOW]` (test runner is internal impl; CLI/API surface stable) | Sub-Q-A=(i) playwright-electron has broadest community; switching to (iii) CDP later is internal refactor not API change |

---

## §9 — Dependency arbitration outline (HALT-PRE-INSTALL details)

`[MODELED]` Dep additions surface at WB4 (Sub-Q-A test runner) + WB7 (Sub-Q-B image-diff). Each is a separate operator-arbitrated cycle per dispatch §5.3 dep-add rule.

### §9.1 — Sub-Q-A (WB4) test runner dep-add HALT-PRE-INSTALL

Default proposal:
```
pnpm add -D -F dispatch-workstation @playwright/test
```

Surfaces at HALT-WB4-PRE-INSTALL with:
- Selected option: (i) `@playwright/test` ~100MB install (latest stable; macOS arm64 supported)
- Alternatives: (ii) `electron-mocha` ~20MB; (iii) `chrome-remote-interface` ~5MB
- Operator selects + acks; install proceeds with chosen variant.

### §9.2 — Sub-Q-B (WB7) image-diff dep-add HALT-PRE-INSTALL

Default proposal:
```
pnpm add -D -F dispatch-workstation pixelmatch pngjs
```

Surfaces at HALT-WB7-PRE-INSTALL with:
- Selected option: (i) `pixelmatch` + `pngjs` ~1MB total; pure-JS; broad compatibility
- Alternatives: (ii) `sharp` ~30MB native; (iii) `odiff-bin` ~10MB native
- Operator selects + acks; install proceeds.

### §9.3 — Default-path total scope

If both Sub-Q defaults acked:
- 2 new dev deps (`@playwright/test`, `pixelmatch + pngjs`)
- ~101MB install footprint (dev-only; not shipped to production bundles)
- Both pure-JS or well-maintained native binaries; no exotic dep graph
- 5 new files: `phase-3-visual-smoke.mjs`, `screenshot-helper.mjs`, `image-diff-helper.mjs`, 4 probes, findings doc
- 2 modified files: `package.json` (scripts + devDeps), `.gitignore` (Sub-Q-D=(β))

Non-default Sub-Q selections may shift dep selections + add 1-3 WBs.

---

**End of MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING ticket body.**

Pending operator decisions:
- Sub-Q-MBTMP3VVT-A (§3.1) — headless launch mechanism (default i playwright-electron; HALT-WB4-PRE-INSTALL)
- Sub-Q-MBTMP3VVT-B (§3.2) — image-diff library (default i pixelmatch+pngjs; HALT-WB7-PRE-INSTALL)
- Sub-Q-MBTMP3VVT-C (§3.3) — diff threshold (default i 1%; non-HALT — env-tunable)
- Sub-Q-MBTMP3VVT-D (§3.4) — screenshot storage (default β gitignore; non-HALT)
- Sub-Q-MBTMP3VVT-E (§3.5) — §C envelope amendment scope (default ii optional+opt-out; non-HALT)
- Sub-Q-MBTMP3VVT-F (§3.6) — WINDOW_READY sentinel (default i data-attribute polling; non-HALT)

Per expanded §C envelope (P1 dispatch authority), this ticket body auto-acks; WB ladder execution proceeds. HALT-PRE-INSTALL gates fire at WB4 + WB7 for dep additions.
