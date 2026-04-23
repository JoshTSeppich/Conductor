/**
 * Graceful shutdown orchestration.
 *
 * DAEMON-T01 scope: close the Fastify HTTP server. Later tickets
 * extend this to close WebSocket connections (T12) and file-system
 * watchers (T13-T15). Pattern: shutdown accepts a bag of resources
 * to close; each downstream ticket adds its resource to the bag.
 */

import type { FastifyInstance } from 'fastify';

export interface ShutdownResources {
  server: FastifyInstance;
}

export async function shutdown(resources: ShutdownResources): Promise<void> {
  await resources.server.close();
}
