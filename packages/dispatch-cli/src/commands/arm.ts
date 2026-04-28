/**
 * fd arm <name> — transition session to armed (resume).
 *
 * Per X2 lines 333-343 + line 351 ("NOT faded back"): HTTP-
 * only command; no v1 fallback. Per §6.1 verbatim:
 *   "paused → armed (operator-initiated; handoff watcher
 *    resumes)"
 *   "held → armed (operator-initiated; no side effect —
 *    operator sends new prompt manually)"
 * Two valid sources (paused or held); daemon returns 422
 * with verbatim error body for invalid transitions (e.g.,
 * armed→armed self-transition or killed→armed).
 */

import {
  assertDaemonRunning,
  runStateTransitionV2,
} from '../lib/daemon-client.js';
import { loadToken } from '../lib/token.js';

export interface ArmArgs {
  name: string;
  baseUrl?: string;
  tokenPath?: string;
}

export async function runArm(args: ArmArgs): Promise<void> {
  // CLI-T04 guard per Arbitration 3A.
  await assertDaemonRunning({ baseUrl: args.baseUrl });
  const token = await loadToken(args.tokenPath);
  await runStateTransitionV2(args.name, 'armed', {
    token,
    baseUrl: args.baseUrl,
  });
}
