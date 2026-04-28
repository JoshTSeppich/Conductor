/**
 * fd hold <name> — transition session to held.
 *
 * Per X2 lines 333-343 + line 351 ("NOT faded back"): HTTP-
 * only command; no v1 fallback. Per §6.1 verbatim:
 * "armed → held (operator-initiated; daemon sends Ctrl-C
 * to tmux pane)" — only valid source is armed; daemon's
 * T08 helper fires sendCtrlC side effect on the transition.
 */

import { runStateTransitionV2 } from '../lib/daemon-client.js';
import { loadToken } from '../lib/token.js';

export interface HoldArgs {
  name: string;
  baseUrl?: string;
  tokenPath?: string;
}

export async function runHold(args: HoldArgs): Promise<void> {
  const token = await loadToken(args.tokenPath);
  await runStateTransitionV2(args.name, 'held', {
    token,
    baseUrl: args.baseUrl,
  });
}
