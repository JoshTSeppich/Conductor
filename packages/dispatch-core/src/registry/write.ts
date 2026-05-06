import { writeAtomicJson } from '../persist/atomic-write.js';
import { sessionsPath } from '../lib/paths.js';
import { RegistrySchema, type Registry } from './schema.js';

/**
 * Write the registry atomically. Delegates to the shared persist
 * helper so v1 (fd CLI) and v2 (daemon) paths share ONE atomic-write
 * recipe in tree (MB-F-DISPATCH-CORE-PERSIST-UNIFIED).
 *
 * The helper guarantees: validate-first (throws before any disk
 * touch), mkdir parent, write tmp via FileHandle, fsync before
 * close, atomic rename, post-rename readback + retry on parse-fail
 * (3 retries by default).
 *
 * Behavior preserved from the pre-refactor implementation:
 *   - 2-space JSON indent + single trailing newline (locked by
 *     test/unit/registry-write-byte-stability.test.ts).
 *   - RegistrySchema.parse on input; .passthrough on SessionSchema
 *     means v2-only fields ride through v1 round-trips untouched
 *     (DAEMON-Z-4; finding #50).
 * Behavior added (additive hardening only):
 *   - fsync between write and rename (durability under power loss).
 *   - Readback + retry on transient corruption (concurrent-writer or
 *     filesystem corner cases).
 */
export async function writeRegistry(path: string | undefined, registry: Registry): Promise<void> {
  const target = path ?? sessionsPath();
  await writeAtomicJson(target, registry, {
    validate: (v) => RegistrySchema.parse(v) as Registry,
    fsync: true,
    retries: 3,
  });
}
