import { readFile } from 'node:fs/promises';
import { sessionsPath } from '../lib/paths.js';
import { RegistrySchema, type Registry } from './schema.js';

/**
 * Read the registry at `path` (defaults to ~/.foxworks-dispatch/sessions.json).
 * Returns an empty registry when the file does not exist. Throws with the
 * file path included in the error message when the file is present but
 * unparseable or fails schema validation.
 */
export async function readRegistry(path?: string): Promise<Registry> {
  const target = path ?? sessionsPath();
  let text: string;
  try {
    text = await readFile(target, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      // Fresh object each call: previous impl returned a shallow clone of
      // a module-level constant, which aliased the inner `sessions` object
      // across calls and let callers pollute it via reference mutation.
      return { version: 1, sessions: {} };
    }
    throw err;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(
      `Registry at ${target} is not valid JSON: ${(err as Error).message}`,
    );
  }

  const result = RegistrySchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Registry at ${target} failed schema validation: ${result.error.message}`,
    );
  }
  return result.data;
}
