/**
 * POST /v2/sessions/:name/prompts per contract §4.4.
 *
 * Operator arbitrations from T09 pre-reg (best-judgment delegated):
 *   - Request shape: SendPromptRequest schema's `{body: string}`
 *     wins over contract example's `{prompt: ...}`. Contract example
 *     is drifted documentation pending operator-authored doc fix.
 *   - Response shape: SendPromptResponse schema (`{sent_at,
 *     archived_to?}`); v2.0 production always populates archived_to.
 *
 * Flow:
 *   1. Validate request body via SendPromptRequest.safeParse
 *   2. Read registry; 404 if session unknown
 *   3. State precondition: must be 'armed' else 422
 *   4. Pre-flight tmux: hasSession(target); 503 if pane dead
 *   5. assemble(body) via dispatch-core (idempotent footer append)
 *   6. Archive assembled prompt to <archiveRoot>/<name>/<iso-ts>.prompt.md
 *   7. tmuxOps.sendKeys(target, assembled)
 *   8. Update session.last_prompt_sent_at; writeRegistryV2
 *   9. Return 200 + {sent_at, archived_to}
 */

import type { FastifyInstance } from 'fastify';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { SendPromptRequest } from 'dispatch-core/src/v2/schema.js';
import { assemble } from 'dispatch-core/src/prompt/assemble.js';
import { archiveRoot as defaultArchiveRoot } from 'dispatch-core/src/lib/paths.js';
import { readRegistryV2, writeRegistryV2 } from '../migration/schema-v2.js';
import { defaultTmuxOps, type TmuxOps } from '../state/transitions.js';
import type { EmitFn } from '../events/bus.js';

export interface PromptRoutesDeps {
  registryPath?: string;
  archiveRoot?: string;
  tmuxOps?: TmuxOps;
  /** T12 emit-wiring: bus.emit fires prompt_sent after
   *  successful registry write. Optional so tests that don't
   *  observe events can omit it. */
  emit?: EmitFn;
}

export async function registerPromptRoutes(
  app: FastifyInstance,
  deps: PromptRoutesDeps,
): Promise<void> {
  const tmuxOps = deps.tmuxOps ?? defaultTmuxOps;
  const archiveBase = deps.archiveRoot ?? defaultArchiveRoot();

  app.post<{ Params: { name: string } }>(
    '/v2/sessions/:name/prompts',
    async (request, reply) => {
      const { name } = request.params;

      const parsed = SendPromptRequest.safeParse(request.body);
      if (!parsed.success) {
        reply.code(422).send({ error: parsed.error.message });
        return;
      }
      const { body } = parsed.data;

      const registry = await readRegistryV2(deps.registryPath);
      const session = registry.sessions[name];
      if (!session) {
        reply.code(404).send({ error: `no session registered as "${name}"` });
        return;
      }
      if (session.state !== 'armed') {
        reply.code(422).send({
          error: `Session "${name}" not in armed state (current: ${session.state})`,
        });
        return;
      }

      const alive = await tmuxOps.hasSession(session.tmux_target);
      if (!alive) {
        reply.code(503).send({
          error: `tmux pane ${session.tmux_target} not running`,
        });
        return;
      }

      const assembled = assemble(body);

      const now = new Date();
      const sentAtIso = now.toISOString();
      // Filename pattern matches fd v1 runSend convention: ISO with
      // colons replaced for filesystem safety.
      const archiveFilename = `${sentAtIso.replace(/:/g, '-')}.prompt.md`;
      const archivePath = join(archiveBase, name, archiveFilename);
      await mkdir(dirname(archivePath), { recursive: true });
      await writeFile(archivePath, assembled, 'utf8');

      await tmuxOps.sendKeys(session.tmux_target, assembled);

      session.last_prompt_sent_at = sentAtIso;
      await writeRegistryV2(deps.registryPath, registry);

      // T12 emit-wiring: prompt_sent fires AFTER successful
      // registry write. Per §5.3 prompt_sent data shape:
      // {archived_to, size_chars}.
      deps.emit?.({
        session: name,
        type: 'prompt_sent',
        data: {
          archived_to: archivePath,
          size_chars: assembled.length,
        },
      });

      return {
        sent_at: sentAtIso,
        archived_to: archivePath,
      };
    },
  );
}
