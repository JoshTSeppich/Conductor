import { readFile } from 'node:fs/promises';
import { sessionsPath } from '../lib/paths.js';

/**
 * Registry stub for FD-T01. The shape is refined and validated with zod in
 * FD-T02 — this file will be rewritten at that point.
 */
export interface Registry {
  version: 1;
  sessions: Record<string, unknown>;
}

const EMPTY_REGISTRY: Registry = { version: 1, sessions: {} };

/**
 * Read the registry at `path` (defaults to ~/.foxworks-dispatch/sessions.json).
 * Returns an empty registry when the file does not exist. FD-T03 will add
 * atomic writes and malformed-JSON handling.
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
