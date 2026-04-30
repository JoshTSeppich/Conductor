/**
 * Token auth primitives.
 *
 * Consolidated onRequest hook per DAEMON-S05 (HTTP header) + S01
 * (WS query string) spike findings. Contract §3.1 dictates the
 * `X-Conductor-Token` header; §5.1 dictates the `?token=` query
 * string for the WebSocket endpoint; §4.1 says `/v2/health` has
 * no auth.
 *
 * Rotations mutate tokenRef.value in-place so the hook reads the
 * current value on every request without re-reading the file.
 */

import { randomBytes } from 'node:crypto';
import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { FastifyReply, FastifyRequest } from 'fastify';

/** Mutable token holder. Single source of truth for the live token. */
export interface TokenRef {
  value: string;
}

/**
 * Read the token at `path`, or create a new one (mode 0600, 256-bit
 * random, base64-encoded per contract §3.2) if the file does not
 * exist. Idempotent: re-running on an existing valid file returns the
 * same value without rewriting.
 */
export async function getOrCreateToken(path: string): Promise<string> {
  try {
    const content = await readFile(path, 'utf8');
    return content.trim();
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    await mkdir(dirname(path), { recursive: true });
    const token = randomBytes(32).toString('base64');
    const tmp = `${path}.tmp`;
    await writeFile(tmp, token, 'utf8');
    await chmod(tmp, 0o600);
    await rename(tmp, path);
    return token;
  }
}

/**
 * Generate a fresh token, atomically replace the file at `path`
 * (tmp + rename, mode 0600), and return the new value. Caller is
 * responsible for updating the live TokenRef.
 */
export async function rotateToken(path: string): Promise<string> {
  const newToken = randomBytes(32).toString('base64');
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  await writeFile(tmp, newToken, 'utf8');
  await chmod(tmp, 0o600);
  await rename(tmp, path);
  return newToken;
}

/**
 * Create the Fastify onRequest hook. Path branching:
 *   /v2/health            → bypass (§4.1)
 *   non-/v2/* paths       → bypass (Z-3 static-serve: SPA assets at
 *                          / + /assets/* + SPA client routes are
 *                          public on same origin per §3.4-arbitrated
 *                          static-serve addition; daemon binds
 *                          127.0.0.1 only, so localhost-scope is
 *                          the trust boundary)
 *   /v2/events/stream     → ?token= query string (§5.1, WS)
 *   any other /v2/* path  → X-Conductor-Token header (§3.1)
 * Mismatch → 401 + {"error": "Invalid or missing token"}.
 */
export function createAuthHook(
  tokenRef: TokenRef,
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async (request, reply) => {
    const pathOnly = request.url.split('?')[0];

    if (pathOnly === '/v2/health') {
      return;
    }

    // Z-3 §3.4-arbitrated static-serve: bypass auth for non-API
    // paths only. Static SPA assets (index.html + /assets/*) + SPA
    // client-routed paths are served on the same origin with
    // localhost-only trust scope. /v2/* + /v3/* API stays gated
    // per CONDUCTOR_API_CONTRACT.md §3.1 (and amended §4.6 once
    // the contract amendment lands; coordinated /v3/* surface per
    // WORKSTATION_CONTRACT.md §6).
    if (!pathOnly.startsWith('/v2/') && !pathOnly.startsWith('/v3/')) {
      return;
    }

    let presented: string | undefined;
    if (pathOnly === '/v2/events/stream') {
      const url = new URL(request.url, 'http://localhost');
      presented = url.searchParams.get('token') ?? undefined;
    } else {
      const header = request.headers['x-conductor-token'];
      if (typeof header === 'string') {
        presented = header;
      } else if (Array.isArray(header) && header.length > 0) {
        presented = header[0];
      }
    }

    if (presented !== tokenRef.value) {
      reply.code(401).send({ error: 'Invalid or missing token' });
    }
  };
}
