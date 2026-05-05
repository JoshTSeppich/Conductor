// Fix-84 / Probe 1 — Defect A wiring grep.
//
// Cairn finding #84 Defect A (safeStorage-persisted ANTHROPIC_API_KEY
// never loaded into main-process env). Fix-A shipped at 668cd1b
// (RED ce990d7): new module `api-key-bootstrap.ts` exports
// `bootstrapApiKey({ configDir, safeStorage })` which calls
// `loadApiKey` and assigns plaintext to `process.env.ANTHROPIC_API_KEY`
// when set. Wired in `main.ts` `app.whenReady()` inside Fix-A
// sentinel region BEFORE `registerIpcHandlers()` so chat IPC sees a
// populated env on first invocation.
//
// This probe is the build-pipeline asserter for the Defect A wiring
// chain. Orthogonal to Probe 2 (no-op-when-env-set behavioral) and
// Probe 3 (end-to-end live with safeStorage seed).
//
// KNOWN: pure-fs assertions; no Electron, no daemon.
//
// Pattern reference: probe-82-01, probe-83-01.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const SRC_BOOTSTRAP_TS = resolve(PACKAGE_ROOT, 'src/main/api-key-bootstrap.ts');
const SRC_MAIN_TS = resolve(PACKAGE_ROOT, 'src/main/main.ts');
const DIST_BOOTSTRAP_JS = resolve(PACKAGE_ROOT, 'dist/main/api-key-bootstrap.js');
const DIST_MAIN_JS = resolve(PACKAGE_ROOT, 'dist/main/main.js');

function readUtf8(path: string): string {
  if (!existsSync(path)) {
    throw new Error(
      `expected ${path}; build with \`pnpm --filter dispatch-workstation build\``,
    );
  }
  return readFileSync(path, 'utf8');
}

describe('Fix-84 / Probe 1 — Defect A api-key bootstrap wiring', () => {
  it('api-key-bootstrap.ts exports bootstrapApiKey + assigns process.env.ANTHROPIC_API_KEY', () => {
    // KNOWN: helper presence + the load-bearing assignment site.
    // Without the assignment, the helper would be a no-op.
    const src = readUtf8(SRC_BOOTSTRAP_TS);
    expect(src).toMatch(/export function bootstrapApiKey/);
    expect(src).toMatch(/process\.env\['ANTHROPIC_API_KEY'\]\s*=/);
    // KNOWN: env-precedence (shell value wins over safeStorage).
    // Required by resolution doc — preserves dev workflow.
    expect(src).toMatch(/if \(process\.env\['ANTHROPIC_API_KEY'\]\)\s*return/);
    expect(src).toMatch(/loadApiKey\(opts\)/);
  });

  it('main.ts wires bootstrapApiKey inside Fix-A sentinel region BEFORE registerIpcHandlers', () => {
    // KNOWN: sentinel region intact + ordering invariant (bootstrap
    // must run before chat IPC handler registration so the handler
    // sees populated env on first call). Resolution doc explicitly
    // cites this ordering.
    const src = readUtf8(SRC_MAIN_TS);
    expect(src).toMatch(/=== BEGIN: Fix-A api-key bootstrap/);
    expect(src).toMatch(/=== END: Fix-A ===/);
    expect(src).toMatch(/bootstrapApiKey\(\{\s*configDir:\s*configDir\(\),\s*safeStorage\s*\}\)/);
    // Ordering: bootstrap call appears before registerIpcHandlers().
    // Scope the search to the app.whenReady() body — the file also has
    // a comment at line 263 ("...registerIpcHandlers() so the chat...")
    // and the import at line 14 which a naive indexOf would hit first.
    const whenReadyIdx = src.indexOf('app.whenReady()');
    expect(whenReadyIdx, 'expected app.whenReady()').toBeGreaterThanOrEqual(0);
    const bodyAfterWhenReady = src.slice(whenReadyIdx);
    const bootstrapIdxRel = bodyAfterWhenReady.indexOf('bootstrapApiKey({');
    // Anchor on a leading newline + indentation to skip comment text.
    const registerIdxRel = bodyAfterWhenReady.search(/\n\s*registerIpcHandlers\(\)/);
    expect(bootstrapIdxRel, 'expected bootstrapApiKey({ call').toBeGreaterThanOrEqual(0);
    expect(registerIdxRel, 'expected registerIpcHandlers() call').toBeGreaterThanOrEqual(0);
    expect(
      bootstrapIdxRel,
      `bootstrapApiKey (rel=${bootstrapIdxRel}) must precede registerIpcHandlers (rel=${registerIdxRel}) inside app.whenReady() body`,
    ).toBeLessThan(registerIdxRel);
  });

  it('dist artifacts carry the bundled bootstrap', () => {
    // KNOWN: build-pipeline assertion. tsc emits api-key-bootstrap.js
    // separately and main.js imports it; both must survive.
    const distHelper = readUtf8(DIST_BOOTSTRAP_JS);
    expect(distHelper).toMatch(/bootstrapApiKey/);
    expect(distHelper).toMatch(/ANTHROPIC_API_KEY/);
    expect(distHelper).toMatch(/loadApiKey/);
    const distMain = readUtf8(DIST_MAIN_JS);
    expect(distMain).toMatch(/bootstrapApiKey/);
  });

  it('fail-loud cross-ref: existing unit test pins bootstrap behavioral seam', () => {
    // KNOWN-by-cross-reference. test_api_key_bootstrap.spec.ts (Fix-A
    // resolution doc cites 4 specs: present-key, absent-key, env-
    // precedence, encryption-unavailable). Probe-84 leans on these
    // seam-level assertions; renaming the unit test would silently
    // lose probe coverage.
    const unitPath = resolve(
      PACKAGE_ROOT,
      'test/unit/fix-orchestrator-flow/test_api_key_bootstrap.spec.ts',
    );
    expect(
      existsSync(unitPath),
      `expected unit test at ${unitPath}; if intentionally moved, update this cross-ref`,
    ).toBe(true);
    const src = readUtf8(unitPath);
    expect(src).toMatch(/bootstrapApiKey/);
    expect(src).toMatch(/ANTHROPIC_API_KEY/);
    const itCount = (src.match(/\bit\(/g) ?? []).length +
      (src.match(/\btest\(/g) ?? []).length;
    expect(
      itCount,
      `expected ≥ 4 cases per Fix-A resolution doc; got ${itCount}`,
    ).toBeGreaterThanOrEqual(4);
  });
});
