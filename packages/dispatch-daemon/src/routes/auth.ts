/**
 * POST /v2/auth/rotate — generates a new token, atomically rewrites
 * the token file, and updates the live TokenRef so subsequent requests
 * accept the new value. Per contract §3.3.
 *
 * Auth: this route is itself auth-gated via the consolidated onRequest
 * hook registered by startup(). A caller presenting the CURRENT token
 * passes the hook and reaches this handler; a caller presenting an
 * invalid token gets 401 from the hook before ever hitting here.
 */

import type { FastifyInstance } from 'fastify';
import { rotateToken, type TokenRef } from '../lifecycle/auth.js';

export interface AuthRoutesDeps {
  tokenRef: TokenRef;
  tokenPath: string;
}

export async function registerAuthRoutes(
  app: FastifyInstance,
  deps: AuthRoutesDeps,
): Promise<void> {
  app.post('/v2/auth/rotate', async () => {
    const newToken = await rotateToken(deps.tokenPath);
    deps.tokenRef.value = newToken;
    return { token: newToken };
  });
}
