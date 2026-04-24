/**
 * GET /v2/sessions/:name/handoff per contract §4.4.
 *
 * Reads the session's HANDOFF.md, archives a timestamped copy,
 * best-effort copies content to the clipboard, updates the
 * session's last_handoff_pulled_at, and returns
 * {content, written_at, archived_to} per PullHandoffResponse
 * (operator-published schema; all 3 fields required).
 *
 * Failure modes:
 *   - Session unknown        → 404 + {"error": "no session registered as \"<name>\""}
 *   - Handoff file missing   → 404 + {"error": "handoff file not found at <path>"}
 *                              (path included for operator debuggability;
 *                              MODELED at T10 pre-reg, single-user
 *                              localhost daemon trades info hygiene
 *                              for diagnostic value)
 *   - Clipboard failure      → tolerated; warn-logged; response still 200
 *                              (parallel to T08 tmux-failure tolerance)
 *
 * Archive filename pattern: <iso-ts-with-colons-replaced>.handoff.md
 * (mirrors T09's `.prompt.md` and fd v1 runPull convention).
 */

import type { FastifyInstance } from 'fastify';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { archiveRoot as defaultArchiveRoot } from 'dispatch-core/src/lib/paths.js';
import { copyToClipboard as defaultCopyToClipboard } from 'dispatch-core/src/lib/clipboard.js';
import { readRegistryV2, writeRegistryV2 } from '../migration/schema-v2.js';

export interface HandoffRoutesDeps {
  registryPath?: string;
  archiveRoot?: string;
  clipboardCopy?: (content: string) => Promise<void>;
}

export async function registerHandoffRoutes(
  app: FastifyInstance,
  deps: HandoffRoutesDeps,
): Promise<void> {
  const archiveBase = deps.archiveRoot ?? defaultArchiveRoot();
  const clipboardCopy = deps.clipboardCopy ?? defaultCopyToClipboard;

  app.get<{ Params: { name: string } }>(
    '/v2/sessions/:name/handoff',
    async (request, reply) => {
      const { name } = request.params;

      const registry = await readRegistryV2(deps.registryPath);
      const session = registry.sessions[name];
      if (!session) {
        reply.code(404).send({ error: `no session registered as "${name}"` });
        return;
      }

      let content: string;
      let mtime: Date;
      try {
        content = await readFile(session.handoff_path, 'utf8');
        const s = await stat(session.handoff_path);
        mtime = s.mtime;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          reply.code(404).send({
            error: `handoff file not found at ${session.handoff_path}`,
          });
          return;
        }
        throw err;
      }

      const now = new Date();
      const pulledAtIso = now.toISOString();
      const archiveFilename = `${pulledAtIso.replace(/:/g, '-')}.handoff.md`;
      const archivePath = join(archiveBase, name, archiveFilename);
      await mkdir(dirname(archivePath), { recursive: true });
      await writeFile(archivePath, content, 'utf8');

      try {
        await clipboardCopy(content);
      } catch (err) {
        request.log.warn(
          { err: (err as Error).message },
          'clipboardCopy failed; tolerating per T10 MODELED decision',
        );
      }

      session.last_handoff_pulled_at = pulledAtIso;
      await writeRegistryV2(deps.registryPath, registry);

      return {
        content,
        written_at: mtime.toISOString(),
        archived_to: archivePath,
      };
    },
  );
}
