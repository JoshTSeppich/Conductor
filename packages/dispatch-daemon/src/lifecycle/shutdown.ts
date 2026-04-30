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

import type Database from 'better-sqlite3';
import type { FastifyInstance } from 'fastify';
import type { WatcherManager } from '../watchers/manager.js';
import type { NotificationsConsumerHandle } from '../notifications/index.js';

export interface ShutdownResources {
  server: FastifyInstance;
  watcherManager?: WatcherManager;
  /** T16 notifications consumer; stop unsubscribes from
   *  the bus before the server tears WS clients down so no
   *  in-flight notify dispatches run against a closing
   *  process. */
  notifications?: NotificationsConsumerHandle;
  /** v3 SQLite database. Closed last, after the HTTP server has
   *  drained, so any in-flight route handler can finish a write
   *  before the file handle releases. Added in COARCH-T01 B2. */
  db?: Database.Database;
}

export async function shutdown(resources: ShutdownResources): Promise<void> {
  resources.notifications?.stop();
  resources.watcherManager?.closeAll();
  await resources.server.close();
  resources.db?.close();
}
