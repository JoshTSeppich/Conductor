// MB-T-PHASE-4-METHODOLOGY-EPSILON-VISUAL-DIFF WB2 GREEN —
// visual-diff-config.mjs
//
// Round 11 §3.9 Wave 4 — operator-arbitrated (β)-style narrowing per
// build-doc §1.5 at `7e623a3`.
//
// Config primitive for the visual-diff runner. Pure-fn module; zero
// I/O outside `loadVisualDiffConfigFromFile` reading optional JSON
// config. Defines the VisualDiffTarget descriptor + two loader paths:
// programmatic (test-injectable) + file-backed (CLI ergonomics).
//
// Anti-fabrication §2.3 contract inherited from γ
// (`phase-3-visual-smoke.mjs:268-286` diffImages TARGET-ABSENT
// graceful-degradation): missing config file → empty-targets config,
// not throw. Caller can detect empty config + skip runner cycle.

import { readFileSync, existsSync } from 'node:fs';

const DEFAULT_THRESHOLD_PERCENT = 1.0;

/**
 * @typedef {Object} VisualDiffTargetInput
 * @property {string} name              — target identifier (e.g., 'frame-c-default')
 * @property {string} screenshotPath    — where to write captured PNG
 * @property {string} targetImagePath   — canonical wireframe target PNG to diff against
 * @property {number} [thresholdPercent] — default 1.0 (mirrors γ default)
 * @property {(page: unknown) => Promise<void>} [capturePreFn] — optional
 *                                          per-target pre-capture hook
 *                                          (state mutation between
 *                                          targets in shared-launch mode)
 */

/**
 * @typedef {Object} VisualDiffTarget
 * @property {string} name
 * @property {string} screenshotPath
 * @property {string} targetImagePath
 * @property {number} thresholdPercent
 * @property {((page: unknown) => Promise<void>) | undefined} capturePreFn
 */

/**
 * @typedef {Object} VisualDiffConfig
 * @property {ReadonlyArray<VisualDiffTarget>} targets
 */

/**
 * Type-checked + defaulted VisualDiffTarget constructor.
 *
 * Throws on missing required fields (name, screenshotPath, targetImagePath)
 * — fail-fast at config authoring time, NOT silently at runner time.
 *
 * Returns a frozen descriptor with thresholdPercent defaulted to 1.0
 * (mirrors γ default at phase-3-visual-smoke.mjs runPhase3Smoke
 * `thresholdPercent ?? 1.0`).
 *
 * @param {VisualDiffTargetInput} input
 * @returns {Readonly<VisualDiffTarget>}
 */
export function defineVisualDiffTarget(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('defineVisualDiffTarget: input object required');
  }
  if (typeof input.name !== 'string' || input.name.length === 0) {
    throw new Error('defineVisualDiffTarget: name required (non-empty string)');
  }
  if (typeof input.screenshotPath !== 'string' || input.screenshotPath.length === 0) {
    throw new Error('defineVisualDiffTarget: screenshotPath required');
  }
  if (typeof input.targetImagePath !== 'string' || input.targetImagePath.length === 0) {
    throw new Error('defineVisualDiffTarget: targetImagePath required');
  }
  const thresholdPercent =
    typeof input.thresholdPercent === 'number' && !Number.isNaN(input.thresholdPercent)
      ? input.thresholdPercent
      : DEFAULT_THRESHOLD_PERCENT;
  return Object.freeze({
    name: input.name,
    screenshotPath: input.screenshotPath,
    targetImagePath: input.targetImagePath,
    thresholdPercent,
    capturePreFn: input.capturePreFn,
  });
}

/**
 * Normalize a config object → { targets: VisualDiffTarget[] }.
 *
 * Graceful handling:
 *   - missing `targets` key → { targets: [] }
 *   - non-array `targets`  → { targets: [] }
 *   - per-target entries with missing required fields throw via
 *     defineVisualDiffTarget (fail-fast)
 *
 * Pure-fn; no I/O. Caller-injectable for unit tests.
 *
 * @param {unknown} obj
 * @returns {VisualDiffConfig}
 */
export function loadVisualDiffConfigFromObject(obj) {
  if (!obj || typeof obj !== 'object') {
    return { targets: [] };
  }
  const raw = /** @type {{ targets?: unknown }} */ (obj).targets;
  if (!Array.isArray(raw)) {
    return { targets: [] };
  }
  const targets = raw.map((entry) =>
    defineVisualDiffTarget(/** @type {VisualDiffTargetInput} */ (entry)),
  );
  return { targets: Object.freeze(targets) };
}

/**
 * File-backed config loader. Reads JSON at `path`; gracefully degrades
 * to empty config on absent / unreadable / unparseable input per
 * anti-fabrication §2.3 (target-absent contract inheritance from γ).
 *
 * @param {string} path
 * @returns {VisualDiffConfig}
 */
export function loadVisualDiffConfigFromFile(path) {
  if (typeof path !== 'string' || !existsSync(path)) {
    return { targets: [] };
  }
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return { targets: [] };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { targets: [] };
  }
  return loadVisualDiffConfigFromObject(parsed);
}
