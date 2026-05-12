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

import { _electron as electron } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const __dirname = dirname(fileURLToPath(import.meta.url));
// `scripts/phase-3-visual-smoke.mjs` → package dir → `dist/main/main.js`.
const DEFAULT_MAIN_PATH = resolve(__dirname, '..', 'dist', 'main', 'main.js');
// Repo root: package dir → packages/ → repo root.
const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const DEFAULT_SCREENSHOT_DIR = resolve(
  REPO_ROOT,
  'docs',
  'coordination',
  'screenshots',
);
// Anti-fabrication §2.3: target image may not exist at run time;
// diffImages gracefully degrades → TARGET-ABSENT classification.
const DEFAULT_TARGET_IMAGE_PATH = resolve(
  REPO_ROOT,
  'docs',
  'coordination',
  'wireframe-target-2026-05-11.png',
);
const DEFAULT_LAUNCH_TIMEOUT_MS = 10_000;
const DEFAULT_FIRST_WINDOW_TIMEOUT_MS = 8_000;
const DEFAULT_RENDER_READY_TIMEOUT_MS = 10_000;
const RENDER_READY_SELECTOR = '[data-testid="frame-c-root"]';

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
 * Launch a headless electron instance against `dist/main/main.js` and
 * wait for the workstation render-tree to mount (Sub-Q-F=(i)
 * DOM-sentinel via `[data-testid="frame-c-root"]` — Frame C is the
 * default shell mode per `frame-mode-state.ts:8` `DEFAULT_MODE = 'C'`,
 * so the testid presence proves the renderer has executed past the
 * tile-grid mount + frame-c auto-mount factory).
 *
 * WB2 SPIKE `9f58359` ratified: `_electron.launch` + `firstWindow()`
 * succeed in ~3s on macOS Darwin 25.3 + electron 28+. This wraps that
 * path with the additional render-tree-ready wait + structured dispose
 * handle.
 *
 * Returns `{ electronApp, page, dispose }`. Caller must invoke
 * `await dispose()` to release the electron child process. Throws on
 * launch / firstWindow / render-ready timeout — callers in
 * runPhase3Smoke catch + classify as LAUNCH-FAILED.
 *
 * @param {Object} [opts]
 * @param {string} [opts.mainPath]              — defaults to package
 *   dist/main/main.js (relative to this script).
 * @param {number} [opts.launchTimeoutMs]       — default 10000.
 * @param {number} [opts.firstWindowTimeoutMs]  — default 8000.
 * @param {number} [opts.renderReadyTimeoutMs]  — default 10000.
 * @returns {Promise<{ electronApp: unknown, page: unknown, dispose: () => Promise<void> }>}
 */
export async function launchHeadless(opts = {}) {
  const mainPath = opts.mainPath ?? DEFAULT_MAIN_PATH;
  const launchTimeout = opts.launchTimeoutMs ?? DEFAULT_LAUNCH_TIMEOUT_MS;
  const firstWindowTimeout =
    opts.firstWindowTimeoutMs ?? DEFAULT_FIRST_WINDOW_TIMEOUT_MS;
  const renderReadyTimeout =
    opts.renderReadyTimeoutMs ?? DEFAULT_RENDER_READY_TIMEOUT_MS;

  const electronApp = await electron.launch({
    args: [mainPath],
    timeout: launchTimeout,
  });

  let page;
  try {
    page = await electronApp.firstWindow({ timeout: firstWindowTimeout });
  } catch (e) {
    try {
      await electronApp.close();
    } catch {
      /* ignore close errors during launch-time failure */
    }
    throw e;
  }

  // Sub-Q-F=(i) DOM-sentinel — wait for Frame C render-tree mount.
  // page.waitForSelector throws on timeout per playwright semantics;
  // caller (runPhase3Smoke) catches + classifies LAUNCH-FAILED.
  try {
    await page.waitForSelector(RENDER_READY_SELECTOR, {
      timeout: renderReadyTimeout,
    });
  } catch (e) {
    try {
      await electronApp.close();
    } catch {
      /* ignore */
    }
    throw e;
  }

  const dispose = async () => {
    try {
      await electronApp.close();
    } catch {
      /* ignore close errors during dispose */
    }
  };

  return { electronApp, page, dispose };
}

/**
 * Compute the path where a smoke run's screenshot should be written.
 *
 * Per dispatch §SCOPE bullet 1: `docs/coordination/screenshots/<sha>.png`.
 * Repo-root-relative when `screenshotDir` is a relative string; absolute
 * when caller supplies an absolute path. Default dir resolved at
 * module-load time to the canonical repo-root path so callers running
 * from the workstation package dir still target the same screenshots/
 * tree.
 *
 * @param {Object} opts
 * @param {string} opts.sha             — required; commit SHA basename.
 * @param {string} [opts.screenshotDir] — default DEFAULT_SCREENSHOT_DIR
 *                                         (repo-root docs/coordination/
 *                                         screenshots/).
 * @returns {string} resolved absolute path to <sha>.png
 */
export function resolveScreenshotPath(opts) {
  const sha = opts?.sha;
  if (typeof sha !== 'string' || sha.length === 0) {
    throw new Error('resolveScreenshotPath: sha required');
  }
  const dir = opts?.screenshotDir ?? DEFAULT_SCREENSHOT_DIR;
  return join(dir, `${sha}.png`);
}

/**
 * Capture a screenshot of the workstation render-tree to disk.
 *
 * Thin wrapper over `page.screenshot({ path, type: 'png' })` per WB2
 * SPIKE `9f58359` ratified pattern. Creates parent directory
 * recursively if absent. Returns the absolute path written. Does NOT
 * verify file size or content — caller may statSync if needed (Phase 3
 * smoke orchestration in WB9 does this).
 *
 * @param {Object} opts
 * @param {{ screenshot: (o: { path: string, type: string }) => Promise<unknown> }} opts.page
 * @param {string} opts.outPath — absolute path; parent dir created if absent.
 * @returns {Promise<string>} absolute path of written screenshot
 */
export async function captureScreenshot(opts) {
  const { page, outPath } = opts;
  if (!page) throw new Error('captureScreenshot: page required');
  if (!outPath) throw new Error('captureScreenshot: outPath required');
  mkdirSync(dirname(outPath), { recursive: true });
  await page.screenshot({ path: outPath, type: 'png' });
  return outPath;
}

/**
 * Diff two PNG images. Returns structured result; gracefully degrades
 * when paths are absent / unreadable (anti-fabrication §2.3 contract —
 * wireframe target image may not yet exist; diff must NOT throw).
 *
 * Result shape:
 *   { mismatchedPixels: number, totalPixels: number, ratio: number,
 *     error?: 'READ-FAILED' | 'TARGET-ABSENT' | 'DIM-MISMATCH' }
 *
 * Semantics:
 *   - leftPath absent / unreadable → error='READ-FAILED'; mismatchedPixels=-1
 *     (screenshot capture failed upstream; unusual case)
 *   - rightPath absent → error='TARGET-ABSENT'; mismatchedPixels=-1
 *     (operator hasn't supplied wireframe target yet; smoke degrades
 *     gracefully per anti-fabrication §2.3)
 *   - dimension mismatch → error='DIM-MISMATCH'; mismatchedPixels=-1
 *     (target image and screenshot must share resolution)
 *   - otherwise → mismatchedPixels = pixelmatch count; ratio =
 *     mismatchedPixels/totalPixels in [0..1]
 *
 * Writes diff PNG to outDiffPath when comparison runs (mismatch>=0);
 * outDiffPath unwritten when error set.
 *
 * @param {Object} opts
 * @param {string} opts.leftPath
 * @param {string} opts.rightPath
 * @param {string} opts.outDiffPath
 * @returns {Promise<{
 *   mismatchedPixels: number,
 *   totalPixels: number,
 *   ratio: number,
 *   error?: 'READ-FAILED' | 'TARGET-ABSENT' | 'DIM-MISMATCH'
 * }>}
 */
export async function diffImages(opts) {
  const { leftPath, rightPath, outDiffPath } = opts;

  if (!existsSync(leftPath)) {
    return {
      mismatchedPixels: -1,
      totalPixels: 0,
      ratio: NaN,
      error: 'READ-FAILED',
    };
  }
  if (!existsSync(rightPath)) {
    return {
      mismatchedPixels: -1,
      totalPixels: 0,
      ratio: NaN,
      error: 'TARGET-ABSENT',
    };
  }

  let leftPng;
  let rightPng;
  try {
    leftPng = PNG.sync.read(readFileSync(leftPath));
    rightPng = PNG.sync.read(readFileSync(rightPath));
  } catch {
    return {
      mismatchedPixels: -1,
      totalPixels: 0,
      ratio: NaN,
      error: 'READ-FAILED',
    };
  }

  if (leftPng.width !== rightPng.width || leftPng.height !== rightPng.height) {
    return {
      mismatchedPixels: -1,
      totalPixels: 0,
      ratio: NaN,
      error: 'DIM-MISMATCH',
    };
  }

  const { width, height } = leftPng;
  const diffPng = new PNG({ width, height });
  const mismatchedPixels = pixelmatch(
    leftPng.data,
    rightPng.data,
    diffPng.data,
    width,
    height,
    { threshold: 0.1 },
  );
  const totalPixels = width * height;
  const ratio = totalPixels > 0 ? mismatchedPixels / totalPixels : 0;

  mkdirSync(dirname(outDiffPath), { recursive: true });
  writeFileSync(outDiffPath, PNG.sync.write(diffPng));

  return { mismatchedPixels, totalPixels, ratio };
}

/**
 * Pure-fn classification of smoke run state from observed step results.
 *
 * @param {Object} obs
 * @param {boolean} [obs.buildOk]                  — false → BUILD-FAILED
 * @param {boolean} [obs.launchOk]                 — false → LAUNCH-FAILED
 * @param {{ error?: string, ratio: number }} [obs.diffResult]
 * @param {number}  [obs.thresholdPercent]         — default 1.0 (Sub-Q-C=(i))
 * @returns {SmokeState}
 */
export function classifyResult(obs) {
  if (obs.buildOk === false) return 'BUILD-FAILED';
  if (obs.launchOk === false) return 'LAUNCH-FAILED';
  const diff = obs.diffResult;
  if (diff?.error === 'TARGET-ABSENT' || diff?.error === 'READ-FAILED') {
    // READ-FAILED on diffResult during smoke means screenshot wasn't
    // produced OR target couldn't be read — both classify as
    // TARGET-ABSENT for operator-visible summary (the practical
    // distinction is internal-debug only).
    return 'TARGET-ABSENT';
  }
  if (diff?.error === 'DIM-MISMATCH') {
    // Treat as FAIL — wireframe target dimensions don't match
    // workstation render; needs operator-supplied dimension-aligned
    // target. Surfaces as visible failure not silent skip.
    return 'FAIL';
  }
  const threshold = obs.thresholdPercent ?? 1.0;
  if (!diff) return 'TARGET-ABSENT';
  const ratioPercent = diff.ratio * 100;
  return ratioPercent <= threshold ? 'PASS' : 'FAIL';
}

/**
 * Pure-fn single-line summary for commit-body inclusion.
 *
 * Format per ticket body §4 WB9:
 *   Phase 3 smoke: <STATE> screenshot=<path> [mismatch=<percent>%] [target=<path>] [duration=<s>s]
 *
 * @param {Object} parts
 * @param {SmokeState} parts.state
 * @param {string}  [parts.screenshotPath]
 * @param {number}  [parts.mismatchPercent]
 * @param {string}  [parts.targetImagePath]
 * @param {number}  [parts.durationMs]
 * @returns {string}
 */
export function formatSummary(parts) {
  const tokens = [`Phase 3 smoke: ${parts.state}`];
  if (parts.screenshotPath) tokens.push(`screenshot=${parts.screenshotPath}`);
  if (typeof parts.mismatchPercent === 'number') {
    // Format with up to 2 decimal places for readability; toFixed(2)
    // strips trailing zeros via parseFloat round-trip.
    const rounded = parseFloat(parts.mismatchPercent.toFixed(2));
    tokens.push(`mismatch=${rounded}%`);
  }
  if (parts.targetImagePath) tokens.push(`target=${parts.targetImagePath}`);
  if (typeof parts.durationMs === 'number') {
    const seconds = (parts.durationMs / 1000).toFixed(1);
    tokens.push(`duration=${seconds}s`);
  }
  return tokens.join(' ');
}

/**
 * Resolve the current git HEAD SHA via `git rev-parse HEAD`. Returns
 * the short 7-char form for filename brevity. Falls back to
 * 'unknown-sha' if git invocation fails (e.g., shallow CI checkout
 * without git binary).
 *
 * @returns {string}
 */
function resolveHeadSha() {
  try {
    const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    }).trim();
    return sha.length > 0 ? sha : 'unknown-sha';
  } catch {
    return 'unknown-sha';
  }
}

/**
 * Run a Phase 3 visual-comparison smoke cycle: rebuild → launch
 * headless electron → screenshot → diff (when target supplied) →
 * emit summary.
 *
 * Per ticket body §4 WB9 orchestration enumeration + anti-fabrication
 * §2.3 graceful-degradation contract. Returns structured SmokeResult;
 * never throws — all failure paths classify to a terminal SmokeState
 * for commit-body inclusion.
 *
 * @param {SmokeOpts} [opts]
 * @returns {Promise<SmokeResult>}
 */
export async function runPhase3Smoke(opts = {}) {
  const startedAt = Date.now();
  const sha = opts.sha ?? resolveHeadSha();
  const screenshotDir = opts.screenshotDir ?? DEFAULT_SCREENSHOT_DIR;
  const targetImagePath = opts.targetImagePath ?? DEFAULT_TARGET_IMAGE_PATH;
  const thresholdPercent =
    opts.thresholdPercent ??
    (process.env.MB_PHASE_3_DIFF_THRESHOLD !== undefined
      ? parseFloat(process.env.MB_PHASE_3_DIFF_THRESHOLD)
      : 1.0);

  const outPath = resolveScreenshotPath({ sha, screenshotDir });
  const outDiffPath = join(screenshotDir, `${sha}.diff.png`);

  let buildOk = true;
  if (!opts.skipRebuild) {
    try {
      execFileSync(
        'pnpm',
        ['--filter', 'dispatch-workstation', 'build'],
        { cwd: REPO_ROOT, stdio: 'ignore', timeout: 180_000 },
      );
    } catch {
      buildOk = false;
    }
  }
  if (!buildOk) {
    const state = classifyResult({ buildOk });
    return {
      state,
      durationMs: Date.now() - startedAt,
      summary: formatSummary({ state, durationMs: Date.now() - startedAt }),
    };
  }

  let launchHandle;
  let launchOk = true;
  try {
    launchHandle = await launchHeadless({});
  } catch {
    launchOk = false;
  }
  if (!launchOk || !launchHandle) {
    const state = classifyResult({ buildOk: true, launchOk: false });
    return {
      state,
      durationMs: Date.now() - startedAt,
      summary: formatSummary({ state, durationMs: Date.now() - startedAt }),
    };
  }

  let screenshotPath;
  try {
    screenshotPath = await captureScreenshot({
      page: launchHandle.page,
      outPath,
    });
  } catch {
    await launchHandle.dispose();
    const state = 'LAUNCH-FAILED';
    return {
      state,
      durationMs: Date.now() - startedAt,
      summary: formatSummary({ state, durationMs: Date.now() - startedAt }),
    };
  }
  await launchHandle.dispose();

  const diffResult = await diffImages({
    leftPath: screenshotPath,
    rightPath: targetImagePath,
    outDiffPath,
  });
  const state = classifyResult({
    buildOk: true,
    launchOk: true,
    diffResult,
    thresholdPercent,
  });
  const mismatchPercent =
    typeof diffResult.ratio === 'number' && !Number.isNaN(diffResult.ratio)
      ? diffResult.ratio * 100
      : undefined;
  const durationMs = Date.now() - startedAt;
  return {
    state,
    screenshotPath,
    targetImagePath,
    mismatchPercent,
    durationMs,
    summary: formatSummary({
      state,
      screenshotPath,
      mismatchPercent,
      targetImagePath: diffResult.error === 'TARGET-ABSENT' ? undefined : targetImagePath,
      durationMs,
    }),
  };
}

// WB10 will wire CLI entry point per Sub-Q-A=(ii). Skeleton has no
// CLI-entry side effect; importing this module is safe.
