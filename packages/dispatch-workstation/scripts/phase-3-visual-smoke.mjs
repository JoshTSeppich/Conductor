// MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING · WB3 GREEN ·
// phase-3-visual-smoke.mjs
//
// Closure-path-γ "headless electron + screenshot + image-diff pipeline"
// per FOLLOWUPS row 335 + ticket body `030c2d6`. Ratifies WB2 SPIKE
// (`9f58359`) Sub-Q-A=(i) playwright-electron + Sub-Q-B=(i) pixelmatch +
// pngjs operator-acked dep selections.
//
// Orchestrates the Phase 3 visual-comparison gate per dispatch §3.5:
// rebuild → launch headless electron → screenshot → diff (if target
// image present) → emit summary line for commit-body inclusion.
//
// WB3 ships the SKELETON: signature + result-shape + TODO-marked
// branches that subsequent WBs fill in:
//   - WB4 launch() integration (playwright-electron _electron.launch
//     + firstWindow + Sub-Q-F=(i) data-attribute polling)
//   - WB6 captureScreenshot() integration (page.screenshot + path)
//   - WB7 diffImages() integration (pixelmatch + pngjs)
//   - WB9 orchestration branches (BUILD-FAILED / LAUNCH-FAILED /
//     TARGET-ABSENT / PASS / FAIL) + graceful-degradation
//   - WB10 verify:phase-3-smoke CLI primitive (package.json scripts)
//
// Invocation per Sub-Q-A=(ii) per-package package.json scripts pattern:
//   pnpm --filter dispatch-workstation verify:phase-3-smoke
//   pnpm --filter dispatch-workstation exec node scripts/phase-3-visual-smoke.mjs
//
// Direct `node packages/.../scripts/phase-3-visual-smoke.mjs` from repo
// root FAILS per WB2 SPIKE §4 risk (pnpm workspace @playwright/test
// resolution requires per-package dir).

/**
 * @typedef {'PASS' | 'FAIL' | 'TARGET-ABSENT' | 'BUILD-FAILED' | 'LAUNCH-FAILED'} SmokeState
 *
 * Five terminal states per ticket body §4 WB9 orchestration enumeration:
 *   BUILD-FAILED   — pnpm build exited non-zero (rebuild step before launch)
 *   LAUNCH-FAILED  — _electron.launch OR firstWindow timed out / threw
 *   TARGET-ABSENT  — wireframe target image missing/unreadable (graceful;
 *                    smoke still captured screenshot; exits 0)
 *   PASS           — mismatchPercent ≤ threshold (Sub-Q-C=(i) default 1%)
 *   FAIL           — mismatchPercent > threshold
 */

/**
 * @typedef {Object} SmokeResult
 * @property {SmokeState} state
 * @property {string} [screenshotPath]   — path to captured screenshot (PNG)
 * @property {number}  [mismatchPercent] — pixel mismatch ratio × 100 (when
 *                                          state ∈ PASS/FAIL); undefined
 *                                          otherwise
 * @property {string}  [targetImagePath] — path operator-supplied / default
 *                                          checked during run
 * @property {number}  [durationMs]      — total smoke runtime
 * @property {string}  summary           — single-line summary for commit-
 *                                          body inclusion per ticket body
 *                                          §4 WB9 format
 */

/**
 * @typedef {Object} SmokeOpts
 * @property {string} [targetImagePath]  — default
 *   `docs/coordination/wireframe-target-2026-05-11.png` per dispatch
 *   §SCOPE. Configurable string per anti-fabrication §2.3 (target image
 *   may not yet exist at run time).
 * @property {string} [screenshotDir]    — default
 *   `docs/coordination/screenshots/` per dispatch §SCOPE bullet 1.
 * @property {string} [sha]              — default `git rev-parse HEAD`.
 *   Filename `<sha>.png` per dispatch §SCOPE.
 * @property {number} [thresholdPercent] — default 1.0 (1% mismatch).
 *   Tunable via env `MB_PHASE_3_DIFF_THRESHOLD` per Sub-Q-C=(i).
 * @property {boolean} [skipRebuild]     — default false. Set true to
 *   reuse existing `dist/` artifacts (useful for repeated runs during
 *   ticket development).
 */

/**
 * Run a Phase 3 visual-comparison smoke cycle.
 *
 * WB3 SKELETON: returns LAUNCH-FAILED with a TODO-marked summary;
 * subsequent WBs replace TODO branches with real impl.
 *
 * @param {SmokeOpts} [_opts]
 * @returns {Promise<SmokeResult>}
 */
export async function runPhase3Smoke(_opts = {}) {
  const startedAt = Date.now();

  // WB4 — TODO: rebuild via execFileSync('pnpm', ['--filter',
  // 'dispatch-workstation', 'build']). Branch BUILD-FAILED if exit != 0.
  // Honor _opts.skipRebuild to bypass for dev iteration.

  // WB4 — TODO: launchHeadless({ opts }) returns { page, dispose }.
  // _electron.launch({ args: [resolvedMainPath], timeout: 10000 })
  // + page = await electronApp.firstWindow({ timeout: 8000 })
  // + Sub-Q-F=(i) polling for [data-app-ready="true"] when wired.

  // WB6 — TODO: captureScreenshot({ page, outPath }) writes PNG via
  // page.screenshot({ path: outPath, type: 'png' }). outPath resolved
  // from screenshotDir + sha + '.png'.

  // WB7 — TODO: when target image readable, diffImages({ leftPath,
  // rightPath, outDiffPath }) returns { mismatchedPixels, totalPixels,
  // ratio, error? }. Pixelmatch threshold 0.1 (per-pixel AA tolerance);
  // state ∈ PASS/FAIL determined by ratio*100 vs thresholdPercent.

  // WB8 + WB9 — TODO: graceful-degradation branch
  //   if (!fs.existsSync(targetImagePath) || fs.statSync(...).size === 0):
  //     state = 'TARGET-ABSENT'; capture screenshot only; summary
  //     'Phase 3 smoke: TARGET-ABSENT screenshot=<path>'.
  // Exit 0 per anti-fabrication §2.3.

  const durationMs = Date.now() - startedAt;
  return {
    state: 'LAUNCH-FAILED',
    summary: `Phase 3 smoke: LAUNCH-FAILED (WB3 skeleton stub; WB4-WB9 fill orchestration) duration=${durationMs}ms`,
    durationMs,
  };
}

// WB10 will wire CLI entry point per Sub-Q-A=(ii). Skeleton has no
// CLI-entry side effect; importing this module is safe.
