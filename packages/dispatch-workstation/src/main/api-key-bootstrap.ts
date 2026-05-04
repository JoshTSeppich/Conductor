// MB-F-#84-A GREEN — boot-time api-key bootstrap.
//
// Cairn finding #84 Defect A: onboarding persists the operator's API key
// as safeStorage-encrypted ciphertext in userData (api-key-storage.ts), but
// no main-process boot path decrypts that ciphertext into process.env. The
// chat client (anthropic-client.ts createAnthropicClient) reads
// process.env['ANTHROPIC_API_KEY'] directly, so a production-packaged
// Electron launched from Finder — which has no shell-parent env — surfaces
// STREAM_ERROR auth_error on the first chat send despite onboarding having
// completed successfully.
//
// This module ships the missing single-site bootstrap, called early in
// main.ts's app.whenReady() before registerIpcHandlers() so the chat IPC
// handler sees a populated env on first invocation.
//
// Dev-shell parity: if process.env['ANTHROPIC_API_KEY'] is already set
// (e.g. developer ran `ANTHROPIC_API_KEY=... electron .`), the shell value
// wins and bootstrap is a no-op. This preserves the existing dev workflow
// and matches spawn-ipc.ts:200-208's readApiKey precedence semantics.
import { loadApiKey, type SafeStorageLike } from '../onboarding/api-key-storage.js';

export interface BootstrapApiKeyOpts {
  configDir: string;
  safeStorage: SafeStorageLike;
}

/**
 * If the operator completed onboarding (safeStorage-encrypted key persisted
 * in `configDir/anthropic-api-key.enc`) and process.env['ANTHROPIC_API_KEY']
 * is unset, decrypt and assign so chat IPC sees the key on first request.
 *
 * No-op when:
 *   - process.env['ANTHROPIC_API_KEY'] is already populated (shell env wins)
 *   - no persisted ciphertext exists (operator hasn't onboarded yet)
 *   - safeStorage encryption is unavailable (loadApiKey returns null)
 *   - decryption fails (loadApiKey returns null)
 *
 * Synchronous: file I/O is bounded (single small file) and runs once at
 * app boot, well before any UI is shown.
 */
export function bootstrapApiKey(opts: BootstrapApiKeyOpts): void {
  if (process.env['ANTHROPIC_API_KEY']) return;
  const plaintext = loadApiKey(opts);
  if (plaintext) {
    process.env['ANTHROPIC_API_KEY'] = plaintext;
  }
}
