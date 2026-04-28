/**
 * Token loading helper for CLI-T01.
 *
 * Reads the auth token from the daemon-shared path
 * (~/.foxworks-dispatch/token by default — same convention
 * as DAEMON-T02 writes). Returns trimmed value. ENOENT
 * surfaces a helpful operator-facing message that points
 * at daemon startup as the likely cause (the token is
 * created by the daemon on first run per §3.2).
 *
 * Pure async helper — fully unit-tested at P1.
 */

import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export function defaultTokenPath(): string {
  return join(homedir(), '.foxworks-dispatch', 'token');
}

export async function loadToken(path?: string): Promise<string> {
  const tokenPath = path ?? defaultTokenPath();
  try {
    const content = await readFile(tokenPath, 'utf8');
    return content.trim();
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `token not found at ${tokenPath}; ` +
          `start the daemon (it creates the token on first run) ` +
          `or pass --token-path to point at an existing token file`,
      );
    }
    throw err;
  }
}
