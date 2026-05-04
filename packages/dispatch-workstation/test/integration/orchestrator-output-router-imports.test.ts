// MB-F-MB-T07-ORCHESTRATOR-OUTPUT-ROUTER-IMPORT-PATH (cairn finding #79).
//
// Runtime-import smoke test. The TypeScript source compiles cleanly and
// every unit test passes because TS NodeNext + vitest both resolve `.js`
// import specifiers against `.ts` sources via their own resolver
// pipelines. Production failure surfaces only when Node ESM loads the
// *compiled* dist artifact and resolves import specifiers literally —
// which is what Electron does at startup.
//
// In-process `await import()` from a vitest test does NOT reproduce the
// failure (vitest's resolver intercepts). To reproduce, we spawn a raw
// Node subprocess in ESM mode and dynamic-import the dist artifact from
// there. Pre-fix: subprocess exits with ERR_MODULE_NOT_FOUND for
// `dispatch-core/src/v3/schema.js`. Post-fix: subprocess exits clean.
import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../..');
const COMPILED_MODULE = resolve(
  PACKAGE_ROOT,
  'dist/main/orchestrator-output-router.js',
);

interface NodeRunResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

function runNodeImport(modulePath: string, timeoutMs: number): Promise<NodeRunResult> {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import(${JSON.stringify(modulePath)}).then(m => { console.log('IMPORT_OK keys=' + Object.keys(m).join(',')); }).catch(e => { console.error('IMPORT_ERR ' + (e.code || 'NO_CODE') + ' ' + e.message); process.exit(1); });`,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'], cwd: PACKAGE_ROOT },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      rejectP(new Error(`timeout after ${timeoutMs}ms; stdout="${stdout}", stderr="${stderr}"`));
    }, timeoutMs);
    child.on('exit', (code, signal) => {
      clearTimeout(timer);
      resolveP({ code, signal, stdout, stderr });
    });
  });
}

describe('MB-F-MB-T07: orchestrator-output-router runtime import resolves', () => {
  it('imports cleanly under raw Node ESM (the resolution path Electron uses)', async () => {
    expect(
      existsSync(COMPILED_MODULE),
      `expected built module at ${COMPILED_MODULE}; run \`pnpm --filter dispatch-workstation build\` first`,
    ).toBe(true);

    const result = await runNodeImport(COMPILED_MODULE, 15_000);

    expect(
      result.code,
      `node subprocess failed: code=${result.code}, signal=${result.signal}\nstdout="${result.stdout}"\nstderr="${result.stderr}"`,
    ).toBe(0);
    expect(result.stdout).toContain('IMPORT_OK');
    expect(result.stdout).toContain('routeOrchestratorOutput');
    expect(result.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
  }, 30_000);
});
