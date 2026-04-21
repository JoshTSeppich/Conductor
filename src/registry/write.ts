import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { sessionsPath } from '../lib/paths.js';
import { RegistrySchema, type Registry } from './schema.js';

/**
 * Write the registry atomically: validate, write to `<path>.tmp`, rename
 * over the target. Creates the parent directory if it is missing.
 */
export async function writeRegistry(path: string | undefined, registry: Registry): Promise<void> {
  const target = path ?? sessionsPath();
  RegistrySchema.parse(registry);

  await mkdir(dirname(target), { recursive: true });

  const tmp = `${target}.tmp`;
  const body = `${JSON.stringify(registry, null, 2)}\n`;
  await writeFile(tmp, body, 'utf8');
  await rename(tmp, target);
}
