// Fix-84 / Probe 4 — Defect B build-doc-state userData fallback wiring.
//
// Cairn finding #84 Defect B (build-doc state directory not resolvable
// in production). Fix-A shipped at 2eaa0e1 (RED 8e1a807):
// `coarchitect/build-doc-state.ts:stateDir()` now adds Electron
// `app.getPath('userData')` as a fourth fallback after the three
// legacy env vars. Pattern mirrors `splitter-state.ts`.
//
// This probe is the build-pipeline asserter for the Defect B wiring.
// Orthogonal to Probe 5 (end-to-end live with userData fallback) and
// Probe 6 (MANUAL card-emission path).
//
// KNOWN: pure-fs assertions; no Electron, no daemon.
//
// Pattern reference: probe-82-01, probe-83-01, probe-84-01.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const SRC_BUILD_DOC_STATE_TS = resolve(
  PACKAGE_ROOT,
  'src/coarchitect/build-doc-state.ts',
);
const DIST_BUILD_DOC_STATE_JS = resolve(
  PACKAGE_ROOT,
  'dist/coarchitect/build-doc-state.js',
);

function readUtf8(path: string): string {
  if (!existsSync(path)) {
    throw new Error(
      `expected ${path}; build with \`pnpm --filter dispatch-workstation build\``,
    );
  }
  return readFileSync(path, 'utf8');
}

describe('Fix-84 / Probe 4 — Defect B build-doc-state userData fallback wiring', () => {
  it('build-doc-state.ts stateDir() falls back to app.getPath(userData) after three env vars', () => {
    // KNOWN: source-tree assertion. The four-fallback chain MUST be
    // in this order — env vars first (test isolation preserves the
    // unit-test fixture path) THEN userData (production resolution).
    // Inverting the order would make the unit test fixture's MB_BUILD
    // _DOC_STATE_DIR path silently lose to userData.
    const src = readUtf8(SRC_BUILD_DOC_STATE_TS);
    expect(src).toMatch(/MB_BUILD_DOC_STATE_DIR/);
    expect(src).toMatch(/MB_WORKSTATION_USERDATA/);
    expect(src).toMatch(/MB_APP_USERDATA/);
    expect(src).toMatch(/app\.getPath\(\s*['"]userData['"]\s*\)/);
    // Order check: app.getPath is the LAST fallback in the chain.
    const stateDirIdx = src.indexOf('function stateDir(');
    const stateDirBlockEnd = src.indexOf('}', stateDirIdx);
    const block = src.slice(stateDirIdx, stateDirBlockEnd);
    const envVarsBeforeAppGetPath =
      block.indexOf('MB_BUILD_DOC_STATE_DIR') < block.indexOf('app.getPath') &&
      block.indexOf('MB_WORKSTATION_USERDATA') < block.indexOf('app.getPath') &&
      block.indexOf('MB_APP_USERDATA') < block.indexOf('app.getPath');
    expect(
      envVarsBeforeAppGetPath,
      `expected env-var fallbacks BEFORE app.getPath('userData') in stateDir() chain; block=${JSON.stringify(block)}`,
    ).toBe(true);
  });

  it('build-doc-state.ts imports app from electron (top-level import for Defect B fallback)', () => {
    // KNOWN: source-tree assertion. The Defect B fix added a top-level
    // import { app } from 'electron'. Removing that import → stateDir()
    // throws ReferenceError on first call in production (env vars
    // undefined → reaches app.getPath line). Unit test isolation
    // pattern (vi.mock('electron')) papers over the runtime hazard.
    const src = readUtf8(SRC_BUILD_DOC_STATE_TS);
    expect(src).toMatch(/import\s+\{\s*app\s*\}\s+from\s+['"]electron['"]/);
  });

  it('dist/coarchitect/build-doc-state.js carries the bundled userData fallback', () => {
    // KNOWN: build-pipeline assertion. tsc emits coarchitect/*.js
    // separately; the userData fallback string must survive bundling.
    const dist = readUtf8(DIST_BUILD_DOC_STATE_JS);
    expect(dist).toMatch(/MB_BUILD_DOC_STATE_DIR/);
    expect(dist).toMatch(/userData/);
    expect(dist).toMatch(/getPath/);
  });

  it('fail-loud cross-ref: existing unit test pins the userData-fallback seam', () => {
    // KNOWN-by-cross-reference. Fix-A resolution doc cites 3 specs:
    // write-to-userData, read-back, env-override-still-honored.
    // Unit test uses vi.mock('electron') so it stays node-only.
    const unitPath = resolve(
      PACKAGE_ROOT,
      'test/unit/fix-orchestrator-flow/test_build_doc_state_fallback.spec.ts',
    );
    expect(
      existsSync(unitPath),
      `expected unit test at ${unitPath}; if intentionally moved, update this cross-ref`,
    ).toBe(true);
    const src = readUtf8(unitPath);
    expect(src).toMatch(/userData/);
    expect(src).toMatch(/build-doc-state/);
    const itCount = (src.match(/\bit\(/g) ?? []).length +
      (src.match(/\btest\(/g) ?? []).length;
    expect(
      itCount,
      `expected ≥ 3 cases per Fix-A resolution doc; got ${itCount}`,
    ).toBeGreaterThanOrEqual(3);
  });
});
