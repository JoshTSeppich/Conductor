/**
 * fd kill <name> — terminate a session (transition to killed).
 *
 * Per X2 lines 333-343 + line 351 ("NOT faded back"): HTTP-
 * only command; no v1 fallback. Per §6.3 verbatim "killed is
 * terminal — re-init creates new session entry, does not
 * resurrect" — operator confirmation required by default
 * (X2 line 334) since this is destructive.
 *
 * --yes flag bypasses the confirmation prompt for scripted
 * use. Aborts with non-zero exit if operator answers N
 * (default) at the prompt.
 */

import { runStateTransitionV2 } from '../lib/daemon-client.js';
import { confirmAction } from '../lib/prompt.js';
import { loadToken } from '../lib/token.js';

export interface KillArgs {
  name: string;
  yes?: boolean;
  baseUrl?: string;
  tokenPath?: string;
}

export async function runKill(args: KillArgs): Promise<void> {
  if (!args.yes) {
    const confirmed = await confirmAction(
      `kill "${args.name}"? this is terminal per §6.3. [y/N]`,
    );
    if (!confirmed) {
      throw new Error(`aborted: kill "${args.name}" not confirmed`);
    }
  }
  const token = await loadToken(args.tokenPath);
  await runStateTransitionV2(args.name, 'killed', {
    token,
    baseUrl: args.baseUrl,
  });
}
