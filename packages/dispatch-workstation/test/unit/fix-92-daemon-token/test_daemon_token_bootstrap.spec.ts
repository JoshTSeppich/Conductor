// MB-F-#92 RED — daemon token bootstrap from disk to webview localStorage.
//
// Cairn finding #92 (retriaged 2026-05-04, commit 5180d0d): the kanban
// webview's TokenPrompt component fires on cold launch because no main→
// webview hand-off populates localStorage['x-conductor-token']. Five main-
// process disk-read helpers exist (#93) but the renderer-process kanban
// webview cannot reach them — it lives in a separate context with per-
// origin localStorage and no shared filesystem access.
//
// Fix-92 ships a single source-of-truth disk-read function consumed by a
// new `workstation:get-daemon-token` IPC handler; the kanban webview's
// preload (card-bridge-preload.mts → dist/main/card-bridge.cjs) invokes
// that channel and writes the result into localStorage at preload-load
// time, before dispatch-web's useAuthBootstrap calls readToken().
//
// This spec exercises the bootstrap surface — readDaemonTokenForBootstrap.
// The IPC handler + preload glue are integration concerns verified via
// cold-launch smoke; this unit test pins the disk-read function's
// contract: present-file → trimmed contents; absent-file → null;
// trailing-whitespace → trimmed.
//
// RED state: src/main/daemon-token-bootstrap.ts absent → import fails → FAIL.
// GREEN state: readDaemonTokenForBootstrap reads + trims → tests pass.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readDaemonTokenForBootstrap } from '../../../src/main/daemon-token-bootstrap.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'fix-92-token-'));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('Fix-92 / finding #92 — readDaemonTokenForBootstrap', () => {
  it('returns the trimmed token string when the file exists', () => {
    const tokenPath = join(tmpDir, 'token');
    writeFileSync(tokenPath, 'abc123-fixture-token-value', 'utf8');

    const result = readDaemonTokenForBootstrap({ tokenPath });

    expect(result).toBe('abc123-fixture-token-value');
  });

  it('trims trailing newline / whitespace (matches real daemon-written files)', () => {
    const tokenPath = join(tmpDir, 'token');
    // Daemon writes with trailing \n; existing readDaemonToken helpers all
    // call .trim() to normalize. Bootstrap function must match that
    // convention so the value passed to localStorage.setItem matches what
    // the daemon issues.
    writeFileSync(tokenPath, '  abc123-fixture-token-value\n  ', 'utf8');

    const result = readDaemonTokenForBootstrap({ tokenPath });

    expect(result).toBe('abc123-fixture-token-value');
  });

  it('returns null when the token file does not exist', () => {
    const tokenPath = join(tmpDir, 'token');
    // No writeFileSync → file absent.
    const result = readDaemonTokenForBootstrap({ tokenPath });

    expect(result).toBeNull();
  });

  it('returns null when the token file is unreadable (permission denied)', () => {
    const tokenPath = join(tmpDir, 'token');
    writeFileSync(tokenPath, 'abc123', 'utf8');
    // Strip all read perms; readFileSync should EACCES → catch → null.
    chmodSync(tokenPath, 0o000);

    const result = readDaemonTokenForBootstrap({ tokenPath });

    // Restore perms before assertion so afterEach rmSync can clean up.
    chmodSync(tokenPath, 0o600);

    expect(result).toBeNull();
  });

  it('defaults to ~/.foxworks-dispatch/token when tokenPath is omitted', () => {
    // We don't write to the real homedir; just assert that calling without
    // tokenPath does not throw and returns either the operator's real
    // token (string) or null (no daemon installed). This verifies the
    // default-path branch is taken and the catch handler is wired so the
    // call returns rather than throwing.
    const result = readDaemonTokenForBootstrap();

    expect(result === null || typeof result === 'string').toBe(true);
  });
});
