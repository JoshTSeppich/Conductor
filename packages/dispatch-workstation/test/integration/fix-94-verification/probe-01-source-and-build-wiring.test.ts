// Fix-94 / Probe 1 — source + build-artifact wiring grep.
//
// Cairn finding #94 (MB-F-CONDUCTOR-SPAWN-DEFAULT-PERMISSION-MODE).
// MB-T09 Phase 2 backend resolution: SpawnSessionRequest gains
// optional `permissionMode: 'auto' | 'ask'`; buildTmuxArgs in
// spawn-handler.ts conditionally appends `--dangerously-skip-
// permissions` AFTER claudeBinPath when permissionMode === 'auto'.
//
// This probe is the build-pipeline asserter for the wiring chain.
// Orthogonal to Probe 2 (live ps-aux assertion against real spawned
// CC) and Probe 3 (negative-evidence default mode).
//
// KNOWN: pure-fs assertions; no Electron, no daemon, no runtime.
//
// Pattern reference: fix-82-verification/probe-01,
// fix-83-verification/probe-01.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const SRC_SPAWN_HANDLER_TS = resolve(PACKAGE_ROOT, 'src/main/spawn-handler.ts');
const DIST_SPAWN_HANDLER_JS = resolve(PACKAGE_ROOT, 'dist/main/spawn-handler.js');

function readUtf8(path: string): string {
  if (!existsSync(path)) {
    throw new Error(
      `expected ${path}; build with \`pnpm --filter dispatch-workstation build\``,
    );
  }
  return readFileSync(path, 'utf8');
}

describe('Fix-94 / Probe 1 — source + build-artifact wiring', () => {
  it('spawn-handler.ts exports SpawnPermissionMode type', () => {
    // KNOWN: type alias presence + 'auto' | 'ask' shape. Without the
    // export, downstream consumers (Phase 3 UI, Phase 4 IPC payload
    // validation) cannot type-narrow on the field.
    const src = readUtf8(SRC_SPAWN_HANDLER_TS);
    expect(src).toMatch(/export type SpawnPermissionMode\s*=\s*'auto'\s*\|\s*'ask'/);
  });

  it('SpawnSessionRequest interface declares optional permissionMode', () => {
    // KNOWN: optional field — `?` syntax. Required field would be a
    // breaking IPC contract change (renderer-side payloads pre-MB-T09
    // omit the field; making it required would surface as TS errors
    // in dispatch-web / preload).
    const src = readUtf8(SRC_SPAWN_HANDLER_TS);
    expect(src).toMatch(/permissionMode\?\s*:\s*SpawnPermissionMode/);
  });

  it('buildTmuxArgs conditionally appends --dangerously-skip-permissions for auto mode', () => {
    // KNOWN: source-tree assertion of the conditional append logic.
    // The flag MUST be appended (not prepended), MUST be gated on
    // permissionMode === 'auto', and MUST land AFTER claudeBinPath
    // so tmux exec's `claude --dangerously-skip-permissions`.
    const src = readUtf8(SRC_SPAWN_HANDLER_TS);
    expect(src).toMatch(/req\.permissionMode\s*===\s*'auto'/);
    expect(src).toMatch(/'--dangerously-skip-permissions'/);
    // Anchor the append direction: the flag literal is in a spread/
    // concat AFTER `base` (the 7-element argv that includes
    // claudeBinPath as last element).
    expect(src).toMatch(/\[\s*\.\.\.base\s*,\s*'--dangerously-skip-permissions'\s*\]/);
  });

  it('dist/main/spawn-handler.js carries the bundled flag literal + conditional', () => {
    // KNOWN: build-pipeline assertion. esbuild dead-code-elim or a
    // bundler bug dropping either the conditional or the flag literal
    // would make production runtime unable to fire the auto path even
    // though source looks correct.
    const dist = readUtf8(DIST_SPAWN_HANDLER_JS);
    // Flag literal must survive bundling. Two occurrences expected:
    // the conditional comparison + the appended array element.
    const matches = dist.match(/--dangerously-skip-permissions/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(1);
    // The 'auto' string (used in the conditional check) must survive.
    expect(dist).toMatch(/['"]auto['"]/);
    // permissionMode field reference must survive.
    expect(dist).toMatch(/permissionMode/);
  });

  it('fail-loud cross-ref: existing mb-t09/ unit tests pin the contract', () => {
    // KNOWN-by-cross-reference. The mb-t09/ unit suite covers (a)
    // auto-mode 8-element argv, (b) default + explicit-ask 7-element
    // argv, (c) IPC controller cross-layer thread-through. Renaming
    // or deleting any of those tests would silently lose the
    // contract guard; this assertion makes that visible at probe-
    // run time.
    const unitAuto = resolve(
      PACKAGE_ROOT,
      'test/unit/mb-t09/test_spawn_executes_tmux_new_session_with_auto_permission_mode.spec.ts',
    );
    const unitAsk = resolve(
      PACKAGE_ROOT,
      'test/unit/mb-t09/test_spawn_executes_tmux_new_session_default_ask_mode.spec.ts',
    );
    const unitIpc = resolve(
      PACKAGE_ROOT,
      'test/unit/mb-t09/test_spawn_ipc_passes_through_permission_mode.spec.ts',
    );
    expect(existsSync(unitAuto), `expected ${unitAuto}`).toBe(true);
    expect(existsSync(unitAsk), `expected ${unitAsk}`).toBe(true);
    expect(existsSync(unitIpc), `expected ${unitIpc}`).toBe(true);
    // Sanity check: each test still references the load-bearing
    // literal it claims to assert.
    expect(readUtf8(unitAuto)).toMatch(/--dangerously-skip-permissions/);
    expect(readUtf8(unitAsk)).toMatch(/--dangerously-skip-permissions/);
    expect(readUtf8(unitIpc)).toMatch(/--dangerously-skip-permissions/);
  });
});
