// MB-T-PHASE-4-METHODOLOGY-EPSILON-VISUAL-DIFF WB4 GREEN —
// visual-diff-runner.mjs
//
// Round 11 §3.9 Wave 4 — operator-arbitrated (β)-style narrowing per
// build-doc §1.5 at `7e623a3`. Sub-Q-C=(ii) single launch + multi-
// screenshot; Sub-Q-D=(ii) γ-aligned state classification.
//
// Orchestrates per-target visual-diff cycles by composing γ tooling
// exports (`launchHeadless`, `captureScreenshot`, `diffImages`,
// `classifyResult`) against a VisualDiffConfig. Deps-injectable for
// unit-test determinism (probe-mbtphase4-epsilon-02 injects mocks
// without launching electron).
//
// Default (production) deps resolve to the γ-module imports.
// Test deps replace any subset with mocks.

import {
  launchHeadless as defaultLaunchHeadless,
  captureScreenshot as defaultCaptureScreenshot,
  diffImages as defaultDiffImages,
  classifyResult as defaultClassifyResult,
} from './phase-3-visual-smoke.mjs';

/**
 * @typedef {Object} VisualDiffTargetResult
 * @property {string} name
 * @property {'PASS' | 'FAIL' | 'TARGET-ABSENT' | 'LAUNCH-FAILED'} state
 * @property {string}  [screenshotPath]
 * @property {string}  [targetImagePath]
 * @property {number}  [mismatchPercent]
 * @property {number}  durationMs
 */

/**
 * @typedef {Object} VisualDiffAggregate
 * @property {ReadonlyArray<VisualDiffTargetResult>} targets
 * @property {boolean} allPassed         — all PASS (vacuously true on empty)
 * @property {boolean} anyFailed         — any FAIL
 * @property {boolean} anyTargetAbsent   — any TARGET-ABSENT
 * @property {number}  durationMs        — total runner duration
 */

/**
 * Orchestrate visual-diff cycles per target. Per Sub-Q-C=(ii): single
 * shared electron launch across all targets; per-target screenshot +
 * diff + classify. Per-target capturePreFn optionally mutates page
 * state between captures (e.g., switch frame mode).
 *
 * Empty-config short-circuits without launching electron (vacuous
 * allPassed=true, no electron cost).
 *
 * Deps-injectable: production callers pass nothing → defaults resolve
 * to γ module exports. Tests pass mock deps for determinism.
 *
 * @param {{ targets: ReadonlyArray<import('./visual-diff-config.mjs').VisualDiffTarget> }} config
 * @param {Object} [deps]
 * @param {typeof defaultLaunchHeadless} [deps.launchHeadless]
 * @param {typeof defaultCaptureScreenshot} [deps.captureScreenshot]
 * @param {typeof defaultDiffImages} [deps.diffImages]
 * @param {typeof defaultClassifyResult} [deps.classifyResult]
 * @returns {Promise<VisualDiffAggregate>}
 */
export async function runVisualDiff(config, deps = {}) {
  const startedAt = Date.now();
  const targets = config?.targets ?? [];

  if (targets.length === 0) {
    return {
      targets: [],
      allPassed: true,
      anyFailed: false,
      anyTargetAbsent: false,
      durationMs: Date.now() - startedAt,
    };
  }

  const launchHeadless = deps.launchHeadless ?? defaultLaunchHeadless;
  const captureScreenshot = deps.captureScreenshot ?? defaultCaptureScreenshot;
  const diffImages = deps.diffImages ?? defaultDiffImages;
  const classifyResult = deps.classifyResult ?? defaultClassifyResult;

  // Sub-Q-C=(ii): single launch shared across targets.
  let launchHandle;
  try {
    launchHandle = await launchHeadless();
  } catch {
    // Launch-failed: report per-target LAUNCH-FAILED for visibility.
    const failResults = targets.map((t) => ({
      name: t.name,
      state: /** @type {'LAUNCH-FAILED'} */ ('LAUNCH-FAILED'),
      durationMs: 0,
    }));
    return {
      targets: failResults,
      allPassed: false,
      anyFailed: true,
      anyTargetAbsent: false,
      durationMs: Date.now() - startedAt,
    };
  }

  const results = [];
  for (const target of targets) {
    const targetStartedAt = Date.now();

    // Optional per-target pre-capture hook (state mutation).
    if (target.capturePreFn) {
      try {
        await target.capturePreFn(launchHandle.page);
      } catch {
        // Pre-fn failure → treat as LAUNCH-FAILED for this target;
        // proceed to next target.
        results.push({
          name: target.name,
          state: 'LAUNCH-FAILED',
          durationMs: Date.now() - targetStartedAt,
        });
        continue;
      }
    }

    let screenshotPath;
    try {
      screenshotPath = await captureScreenshot({
        page: launchHandle.page,
        outPath: target.screenshotPath,
      });
    } catch {
      results.push({
        name: target.name,
        state: 'LAUNCH-FAILED',
        durationMs: Date.now() - targetStartedAt,
      });
      continue;
    }

    const outDiffPath = `${target.screenshotPath}.diff.png`;
    const diffResult = await diffImages({
      leftPath: screenshotPath,
      rightPath: target.targetImagePath,
      outDiffPath,
    });

    const state = classifyResult({
      buildOk: true,
      launchOk: true,
      diffResult,
      thresholdPercent: target.thresholdPercent,
    });

    const mismatchPercent =
      typeof diffResult.ratio === 'number' && !Number.isNaN(diffResult.ratio)
        ? diffResult.ratio * 100
        : undefined;

    results.push({
      name: target.name,
      state,
      screenshotPath,
      targetImagePath:
        diffResult.error === 'TARGET-ABSENT' ? undefined : target.targetImagePath,
      mismatchPercent,
      durationMs: Date.now() - targetStartedAt,
    });
  }

  await launchHandle.dispose();

  const allPassed = results.every((r) => r.state === 'PASS');
  const anyFailed = results.some((r) => r.state === 'FAIL');
  const anyTargetAbsent = results.some((r) => r.state === 'TARGET-ABSENT');

  return {
    targets: results,
    allPassed,
    anyFailed,
    anyTargetAbsent,
    durationMs: Date.now() - startedAt,
  };
}
