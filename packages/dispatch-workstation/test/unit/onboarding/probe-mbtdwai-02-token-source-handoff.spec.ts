// MB-T-DISPATCH-WEB-AUTH-INJECTION WB2 (red) — onboarding-side daemon-token
// source handoff probe.
//
// Sub-Q-MBTDWAI-B=(γ) binding per WB1 spike (`4ba2a1d`) §V.3:
// workstation MB-T08 onboarding step writes the daemon token at
// `~/.foxworks-dispatch/token` (the same path
// `readDaemonTokenForBootstrap` reads from at
// `src/main/daemon-token-bootstrap.ts:43`). This probe asserts the
// SAVE-side contract that will pair with the existing READ-side contract
// at `test/unit/fix-92-daemon-token/test_daemon_token_bootstrap.spec.ts`.
//
// Asserts:
//   probe-01: `saveDaemonToken(token, opts)` function exists at
//             `src/onboarding/daemon-token-storage.ts` and writes the
//             supplied token to the configured path.
//   probe-02: end-to-end roundtrip — `saveDaemonToken(token, {tokenPath})`
//             followed by `readDaemonTokenForBootstrap({tokenPath})`
//             returns the same token string. Closes the loop with the
//             existing Fix-92 read-side contract.
//   probe-03: `saveDaemonToken` creates parent directories if absent
//             (mirrors `api-key-storage.ts:46` `saveApiKey` `mkdirSync`
//             pattern). Operator's clean-install workstation has no
//             `~/.foxworks-dispatch/` dir yet — onboarding-side write must
//             tolerate the missing parent.
//
// WB2 RED: `src/onboarding/daemon-token-storage.ts` does not exist at
//          HEAD `bd1af53`; module import fails → all 3 probes RED at
//          suite load.
// WB3 GREEN: `saveDaemonToken` authored mirroring the `saveApiKey`
//            pattern (without `safeStorage` encryption — daemon token is
//            a shared-secret with the daemon process, NOT a user-secret
//            per `WORKSTATION_CONTRACT.md` §8.3 distinction). 3 probes
//            flip RED → GREEN.
//
// Wiring (the onboarding-IPC trigger that CALLS `saveDaemonToken` after
// operator-entered API key) is deferred to WB4-7 per the dispatch —
// `main.ts` `registerOnboardingIpc` is currently T4 territory under
// `MB-T-POOL-SHUTDOWN-HOOK-FIX`. WB4-7 wires the trigger; WB3 ships the
// module-level contract.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readDaemonTokenForBootstrap } from '../../../src/main/daemon-token-bootstrap.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error WB2 RED: daemon-token-storage module ships in WB3 GREEN.
import { saveDaemonToken } from '../../../src/onboarding/daemon-token-storage.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'mbtdwai-wb2-'));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('MB-T-DISPATCH-WEB-AUTH-INJECTION WB2 — onboarding daemon-token source handoff', () => {
  it('probe-01: saveDaemonToken writes the token to the supplied path', () => {
    const tokenPath = join(tmpDir, 'token');
    saveDaemonToken('abc123-fixture-daemon-token', { tokenPath });
    expect(existsSync(tokenPath)).toBe(true);
  });

  it('probe-02: end-to-end roundtrip — saveDaemonToken + readDaemonTokenForBootstrap', () => {
    const tokenPath = join(tmpDir, 'token');
    const fixture = 'abc123-fixture-daemon-token-value';
    saveDaemonToken(fixture, { tokenPath });
    const read = readDaemonTokenForBootstrap({ tokenPath });
    expect(read).toBe(fixture);
  });

  it('probe-03: saveDaemonToken creates parent directory if absent (mirrors saveApiKey mkdirSync pattern)', () => {
    // Operator's clean install does not have ~/.foxworks-dispatch/ yet;
    // saveDaemonToken must mkdirSync recursive: true before writeFileSync,
    // matching api-key-storage.ts:46 saveApiKey precedent.
    const tokenPath = join(tmpDir, 'subdir', 'token');
    saveDaemonToken('fixture', { tokenPath });
    expect(existsSync(tokenPath)).toBe(true);
  });
});
