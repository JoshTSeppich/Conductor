// MB-T08 Cluster 2 GREEN — Anthropic API key storage.
//
// Wraps Electron safeStorage (per WORKSTATION_CONTRACT.md §8.3) and persists
// the encrypted ciphertext to a file in the userData directory. Reads/writes
// are decoupled from Electron via an injected SafeStorageLike interface so
// unit tests can supply a deterministic in-memory cipher (mirrors the
// runTmuxNewSession dep-injection pattern at spawn-handler.ts:96).
//
// Closes MB-F-MB-T05-API-KEY-SETTINGS-UI for the initial-entry path: spawn-ipc
// already reads safeStorage-encrypted ciphertext via defaultSpawnHandlerDeps;
// onboarding now writes that ciphertext from operator-entered plaintext.
// Replacement-key UI remains MB-T11/W-T19 settings-UI scope.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const STORAGE_FILENAME = 'anthropic-api-key.enc';

/**
 * The subset of Electron safeStorage the storage layer needs. Production wires
 * the real Electron module; tests inject a deterministic cipher.
 */
export interface SafeStorageLike {
  isEncryptionAvailable(): boolean;
  encryptString(plaintext: string): Buffer;
  decryptString(ciphertext: Buffer): string;
}

export interface ApiKeyStorageOpts {
  configDir: string;
  safeStorage: SafeStorageLike;
}

/**
 * Encrypt the plaintext API key and persist it. Throws if encryption is
 * unavailable on this platform (vision §8.3 requires OS-keychain-backed
 * storage; falling back to plaintext on disk would silently violate the
 * contract).
 */
export function saveApiKey(plaintextKey: string, opts: ApiKeyStorageOpts): void {
  if (!opts.safeStorage.isEncryptionAvailable()) {
    throw new Error(
      'safeStorage encryption unavailable; refusing to persist API key in plaintext',
    );
  }
  const ciphertext = opts.safeStorage.encryptString(plaintextKey);
  mkdirSync(opts.configDir, { recursive: true });
  writeFileSync(join(opts.configDir, STORAGE_FILENAME), ciphertext);
}

/**
 * Load and decrypt the persisted API key. Returns null if no key has been
 * persisted yet, or if decryption fails (e.g. keychain unavailable, file
 * corrupted) — caller (onboarding flow / spawn-ipc fallback) handles absence.
 */
export function loadApiKey(opts: ApiKeyStorageOpts): string | null {
  const path = join(opts.configDir, STORAGE_FILENAME);
  if (!existsSync(path)) return null;
  if (!opts.safeStorage.isEncryptionAvailable()) return null;
  try {
    const ciphertext = readFileSync(path);
    return opts.safeStorage.decryptString(ciphertext);
  } catch {
    return null;
  }
}

/**
 * Read the raw encrypted buffer for callers that already hold a SafeStorageLike
 * (or want to forward to spawn-ipc.defaultSpawnHandlerDeps which decrypts itself).
 */
export function loadEncryptedApiKey(configDir: string): Buffer | null {
  const path = join(configDir, STORAGE_FILENAME);
  if (!existsSync(path)) return null;
  try {
    return readFileSync(path);
  } catch {
    return null;
  }
}
