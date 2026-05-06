import { sessionsPath } from '../lib/paths.js';
import { readJsonWithRecovery } from '../persist/read-with-recovery.js';
import { RegistrySchema, type Registry } from './schema.js';

/**
 * Caller-controlled recovery semantics for v1 readRegistry.
 *
 * MB-F-CORE-READ-RECOVERY-OPT-IN (closes sess-a finding #135
 * §Followups #2). Default 'rethrow' preserves pre-refactor fd CLI
 * behavior (FACT-F3: 5 call sites pass no opts). Opt-in 'quarantine'
 * mirrors v2 daemon's pattern at
 * dispatch-daemon/src/migration/schema-v2.ts:readRegistryV2.
 */
export interface ReadRegistryOpts {
  /**
   * What to do when the file exists but does not parse + validate.
   *
   * - 'rethrow' (default): throw a diagnostic Error naming the path.
   *   Preserves the pre-refactor behavior so existing fd CLI callers
   *   continue surfacing the same error class on programmer-error /
   *   hand-edit corruption.
   * - 'quarantine': rename the corrupt file to
   *   `<path>.corrupt-<ISO-timestamp>`, write a fresh empty registry
   *   via writeAtomicJson, log at ERROR level (when a logger is
   *   provided), and return the empty registry. Mirrors v2 daemon's
   *   startup recovery so a corrupt-on-load registry does not
   *   error-storm every subsequent call.
   */
  onCorrupt?: 'rethrow' | 'quarantine';
  /** Optional ERROR-level logger. Used only on the quarantine path. */
  logger?: { error: (...args: unknown[]) => void };
}

/**
 * Read the registry at `path` (defaults to ~/.foxworks-dispatch/sessions.json).
 *
 * Returns a fresh empty registry when the file does not exist. Default
 * behavior on corrupt/invalid file is to throw with the file path
 * included in the error message; pass `{ onCorrupt: 'quarantine' }` to
 * recover into an empty registry while preserving the corrupt bytes
 * in a `.corrupt-<ISO>` sidecar for forensics.
 *
 * Design invariant (FACT-F7; Q-F1 operator-arbitrated): the empty-
 * registry value is constructed as an inline literal per call (NOT a
 * shared module-level constant). Previous bare-implementation history
 * showed callers mutating the returned `sessions` object in place
 * (e.g. dispatch-cli/src/commands/init.ts:36); a shared constant would
 * have aliased the inner `sessions` object across calls and let one
 * caller's mutations leak into a subsequent caller's view. The inline
 * literal here defeats that aliasing. registry-read-recovery.test.ts
 * R2 probe pins this invariant.
 */
export async function readRegistry(
  path?: string,
  opts: ReadRegistryOpts = {},
): Promise<Registry> {
  const target = path ?? sessionsPath();
  return readJsonWithRecovery<Registry>(target, {
    validate: (parsed) => RegistrySchema.parse(parsed) as Registry,
    onCorrupt: opts.onCorrupt ?? 'rethrow',
    emptyValue: { version: 1, sessions: {} },
    logger: opts.logger,
    writeOpts: {
      validate: (v) => RegistrySchema.parse(v) as Registry,
      fsync: true,
      retries: 3,
    },
  });
}
