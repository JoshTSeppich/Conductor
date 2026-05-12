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
