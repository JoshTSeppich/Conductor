// MB-F-#84-A RED — boot-time api-key bootstrap from safeStorage to process.env.
//
// Cairn finding #84 Defect A: anthropic-client.ts:91 reads
// process.env['ANTHROPIC_API_KEY'] directly. Onboarding writes a safeStorage-
// encrypted ciphertext to userData (api-key-storage.ts saveApiKey) but no
// main-process boot code decrypts that ciphertext into process.env. Result:
// production-packaged Electron launched from Finder gets STREAM_ERROR
// auth_error on the first chat send.
//
// This test asserts the contract for the missing piece: a `bootstrapApiKey`
// helper that runs early in app.whenReady() (before the chat IPC handler is
// invoked) and populates process.env['ANTHROPIC_API_KEY'] from the encrypted
// file when present. It mirrors the api-key-storage SafeStorageLike DI pattern
// so the test stays node-only (no Electron boot required).
//
// RED state: src/main/api-key-bootstrap.ts absent → import fails → FAIL.
// GREEN state: bootstrapApiKey decrypts and assigns → assertion passes.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { saveApiKey, type SafeStorageLike } from '../../../src/onboarding/api-key-storage.js';
import { bootstrapApiKey } from '../../../src/main/api-key-bootstrap.js';

/**
 * Deterministic in-memory cipher (no real keychain). Mirrors the fake
 * pattern used by api-key-storage tests; "encryption" is a buffer
 * round-trip with a sentinel prefix so we can verify decrypt was called.
 */
function makeFakeSafeStorage(): SafeStorageLike {
  return {
    isEncryptionAvailable: () => true,
    encryptString: (plaintext: string) => Buffer.from('ENC:' + plaintext, 'utf8'),
    decryptString: (ciphertext: Buffer) => {
      const s = ciphertext.toString('utf8');
      if (!s.startsWith('ENC:')) throw new Error('fake decrypt: bad ciphertext');
      return s.slice(4);
    },
  };
}

let configDir: string;
const SAVED_ENV: string | undefined = process.env['ANTHROPIC_API_KEY'];

beforeEach(() => {
  configDir = mkdtempSync(join(tmpdir(), 'fix-A-bootstrap-'));
  delete process.env['ANTHROPIC_API_KEY'];
});

afterEach(() => {
  rmSync(configDir, { recursive: true, force: true });
  if (SAVED_ENV === undefined) {
    delete process.env['ANTHROPIC_API_KEY'];
  } else {
    process.env['ANTHROPIC_API_KEY'] = SAVED_ENV;
  }
});

describe('Fix-A / finding #84 Defect A — bootstrapApiKey', () => {
  it('decrypts the persisted key and assigns it to process.env.ANTHROPIC_API_KEY', () => {
    const safeStorage = makeFakeSafeStorage();
    saveApiKey('sk-ant-fixture-secret', { configDir, safeStorage });
    expect(process.env['ANTHROPIC_API_KEY']).toBeUndefined();

    bootstrapApiKey({ configDir, safeStorage });

    expect(process.env['ANTHROPIC_API_KEY']).toBe('sk-ant-fixture-secret');
  });

  it('is a no-op when no persisted key file exists', () => {
    const safeStorage = makeFakeSafeStorage();
    // configDir freshly created, no .enc file present.
    bootstrapApiKey({ configDir, safeStorage });
    expect(process.env['ANTHROPIC_API_KEY']).toBeUndefined();
  });

  it('preserves an existing process.env value (dev-shell parity)', () => {
    const safeStorage = makeFakeSafeStorage();
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant-from-shell-env';
    saveApiKey('sk-ant-from-keychain', { configDir, safeStorage });

    bootstrapApiKey({ configDir, safeStorage });

    // Shell env wins so a developer running `ANTHROPIC_API_KEY=... electron .`
    // gets their override even after the keychain bootstrap fires.
    expect(process.env['ANTHROPIC_API_KEY']).toBe('sk-ant-from-shell-env');
  });

  it('is a no-op when safeStorage encryption is unavailable', () => {
    const safeStorage: SafeStorageLike = {
      isEncryptionAvailable: () => false,
      encryptString: () => Buffer.from(''),
      decryptString: () => '',
    };
    // No saveApiKey call (would throw on unavailable encryption); just verify
    // bootstrap doesn't blow up or contaminate env when keychain is absent.
    bootstrapApiKey({ configDir, safeStorage });
    expect(process.env['ANTHROPIC_API_KEY']).toBeUndefined();
  });
});
