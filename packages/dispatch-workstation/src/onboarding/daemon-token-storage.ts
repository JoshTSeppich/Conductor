// MB-T-DISPATCH-WEB-AUTH-INJECTION WB3 GREEN — onboarding-side daemon-token
// storage.
//
// γ-path closure per Sub-Q-MBTDWAI-B=(γ) binding at WB1 spike (`4ba2a1d`)
// §V.3: the workstation MB-T08 onboarding step writes the daemon token at
// `~/.foxworks-dispatch/token`. This module ships the SAVE-side seam that
// pairs with the existing READ-side at `src/main/daemon-token-bootstrap.ts`
// (`readDaemonTokenForBootstrap` — Fix-92 GREEN). End-to-end roundtrip is
// pinned by WB2 probe-02 (this commit's RED→GREEN flip).
//
// Pattern mirrors `src/onboarding/api-key-storage.ts` `saveApiKey` (lines
// 39-48) WITHOUT `safeStorage` encryption: the daemon token is a
// shared-secret WITH the daemon process (daemon validates incoming
// `x-conductor-token` headers by exact-equals against its own copy), NOT a
// user-secret per `WORKSTATION_CONTRACT.md` §8.3 distinction (§8.3 mandates
// OS-keychain-backed storage for the Anthropic API key — operator's
// upstream credential — not for shared-process tokens internal to the
// foxworks-dispatch installation). Encryption is therefore not required;
// file-permission scoping to the operator's user is the analogue defense.
//
// WB4-7 wiring (deferred under T4 main.ts contention): the
// `registerOnboardingIpc` zone in `main.ts` will call `saveDaemonToken`
// after the operator's API-key submission step completes. WB3 ships the
// module-level contract only; the trigger is WB4-7 territory.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export interface DaemonTokenStorageOpts {
  /**
   * Absolute path to write the token to. Production callers default to
   * `~/.foxworks-dispatch/token` (the path
   * `readDaemonTokenForBootstrap` reads from at
   * `daemon-token-bootstrap.ts:43`). Tests pass a tmpdir path for
   * isolation (see `test/unit/onboarding/probe-mbtdwai-02-token-source-
   * handoff.spec.ts`).
   */
  tokenPath: string;
}

/**
 * Persist the daemon token to disk for the webview-side Fix-92 bootstrap
 * to read at workstation launch. Creates the parent directory recursively
 * if absent (operator's clean-install workstation has no
 * `~/.foxworks-dispatch/` directory yet — onboarding-side write must
 * tolerate the missing parent).
 *
 * File mode `0o600` matches the daemon-side write convention (operator's
 * existing daemon-written token has the same mode). Note that
 * `writeFileSync`'s `mode` option only takes effect when the file is
 * created; overwrites of an existing file preserve the existing mode. For
 * an existing-file path with a wider mode, a separate `chmodSync` would
 * be required — current scope writes only at onboarding (file does not
 * yet exist on first onboarding pass) so create-mode suffices.
 *
 * Synchronous: file I/O is bounded (single small file) and runs once at
 * onboarding completion, well before any IPC use.
 */
export function saveDaemonToken(
  token: string,
  opts: DaemonTokenStorageOpts,
): void {
  mkdirSync(dirname(opts.tokenPath), { recursive: true });
  writeFileSync(opts.tokenPath, token, { encoding: 'utf8', mode: 0o600 });
}
