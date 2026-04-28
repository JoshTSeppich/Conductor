/**
 * fd pause <name> — transition session to paused.
 *
 * Per X2 lines 333-343 + line 351 ("NOT faded back"): HTTP-
 * only command; no v1 fallback. Per §6.1 verbatim:
 * "armed → paused (operator-initiated; no side effect on
 * CC)" — only valid source is armed; daemon returns 422
 * with verbatim error body for invalid transitions.
 */

import { runStateTransitionV2 } from '../lib/daemon-client.js';
import { loadToken } from '../lib/token.js';

export interface PauseArgs {
  name: string;
  baseUrl?: string;
  tokenPath?: string;
}

export async function runPause(args: PauseArgs): Promise<void> {
  const token = await loadToken(args.tokenPath);
  await runStateTransitionV2(args.name, 'paused', {
    token,
    baseUrl: args.baseUrl,
  });
}
