import { readFile } from 'node:fs/promises';
import { sessionsPath } from '../lib/paths.js';
import type { Registry } from './schema.js';

const EMPTY_REGISTRY: Registry = { version: 1, sessions: {} };

/**
 * Read the registry at `path` (defaults to ~/.foxworks-dispatch/sessions.json).
 * Returns an empty registry when the file does not exist. FD-T03 adds
 * atomic writes and schema-validated parsing.
 */
export async function readRegistry(path?: string): Promise<Registry> {
  const target = path ?? sessionsPath();
  try {
    const text = await readFile(target, 'utf8');
    return JSON.parse(text) as Registry;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { ...EMPTY_REGISTRY };
    }
    throw err;
  }
}
