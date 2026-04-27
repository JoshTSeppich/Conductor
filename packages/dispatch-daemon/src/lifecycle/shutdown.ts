/**
 * Graceful shutdown orchestration.
 *
 * DAEMON-T01 scope: close the Fastify HTTP server. Later tickets
 * extend this to close WebSocket connections (T12) and file-system
 * watchers (T13-T15). Pattern: shutdown accepts a bag of resources
 * to close; each downstream ticket adds its resource to the bag.
 *
 * Order: close watchers BEFORE the server so a watcher fire that
 * is already in-flight can still emit through the bus to any
 * connected WS clients before those connections terminate.
 */

import type { FastifyInstance } from 'fastify';
import type { WatcherManager } from '../watchers/manager.js';

export interface ShutdownResources {
  server: FastifyInstance;
  watcherManager?: WatcherManager;
}

export async function shutdown(resources: ShutdownResources): Promise<void> {
  resources.watcherManager?.closeAll();
  await resources.server.close();
}
