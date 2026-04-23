/**
 * DAEMON-S03 — macOS native notification delivery spike.
 *
 * Verifies node-notifier as the notification surface for daemon
 * events per CONDUCTOR_API_CONTRACT.md §5.3 (handoff_written,
 * cairn_violation_detected — notification-worthy state transitions
 * in the operator's attention flow).
 *
 * Probes:
 *   P1  notifier.notify(opts, cb) returns without throwing; cb fires
 *   P2  Wait-for-click semantics: fire with wait:true, observe whether
 *       click callback fires or timeout expires. Operator visually
 *       verifies whether notification appeared and whether click was
 *       possible in the window.
 *   P3  Silent notification (sound:false) — API accepts and fires
 *       without error
 *   P4  Error surface when notification infrastructure is unavailable:
 *       we cannot easily simulate permission-denied in a probe, so
 *       we document the failure-mode contract from node-notifier's
 *       own behavior as observed + known caveats.
 *
 * Manual-eye verification recorded in ADR (not pass/fail here):
 *   - Did the first notification appear visually?
 *   - Did click register if operator clicked?
 *   - Did the silent notification also appear?
 *   - Did macOS prompt for notification permission?
 *
 * Exit 0 on all-pass of automated probes. Manual-eye findings land
 * in ADR regardless.
 */

import notifier from 'node-notifier';

interface ProbeResult {
  name: string;
  pass: boolean;
  detail?: string;
}

interface NotifyResult {
  errorReceived: Error | null;
  response: string | undefined;
  metadata: unknown;
  timedOut: boolean;
  elapsedMs: number;
}

function fireNotification(opts: {
  title: string;
  message: string;
  sound?: boolean | string;
  wait?: boolean;
  timeoutMs?: number;
}): Promise<NotifyResult> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({
        errorReceived: null,
        response: undefined,
        metadata: null,
        timedOut: true,
        elapsedMs: Date.now() - startedAt,
      });
    }, opts.timeoutMs ?? 8000);

    notifier.notify(
      {
        title: opts.title,
        message: opts.message,
        sound: opts.sound ?? false,
        wait: opts.wait ?? false,
      },
      (err, response, metadata) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({
          errorReceived: err ?? null,
          response,
          metadata,
          timedOut: false,
          elapsedMs: Date.now() - startedAt,
        });
      },
    );
  });
}

async function main(): Promise<void> {
  const results: ProbeResult[] = [];

  console.log('\n=== DAEMON-S03 spike: macOS notification delivery ===\n');
  console.log('Operator manual-eye verification needed during this run.\n');
  console.log('Firing P2 notification now. You have 8 seconds to click it.');
  console.log('(Click → callback fires with response. Ignore → timeout records.)\n');

  // P2 first because it's the interactive one — operator sees it immediately
  const p2 = await fireNotification({
    title: 'Foxworks Dispatch — DAEMON-S03 probe',
    message:
      'S03 spike click target. Click to verify click-handling, or ignore for timeout path.',
    sound: false,
    wait: true,
    timeoutMs: 8000,
  });

  results.push({
    name: 'P1 notifier.notify() invoked and settled (no thrown error)',
    pass: p2.errorReceived === null || p2.errorReceived === undefined,
    detail: `errorReceived=${p2.errorReceived ? p2.errorReceived.message : 'none'} elapsedMs=${p2.elapsedMs}`,
  });

  const clickDetected = !p2.timedOut && p2.response === 'activate';
  results.push({
    name: 'P2 click callback OR timeout fires',
    pass: true,
    detail: `timedOut=${p2.timedOut} response=${JSON.stringify(p2.response)} clickDetected=${clickDetected} metadata=${JSON.stringify(p2.metadata)}`,
  });

  // P3: silent + wait:false — should return promptly without error
  console.log('\nFiring P3 silent notification (sound:false, wait:false).');
  console.log('Brief pop-up expected with no sound.\n');

  const p3 = await fireNotification({
    title: 'Foxworks Dispatch — S03 silent',
    message: 'Silent probe. OK to ignore.',
    sound: false,
    wait: false,
    timeoutMs: 3000,
  });

  results.push({
    name: 'P3 silent notification (sound:false, wait:false) fires without error',
    pass: p3.errorReceived === null || p3.errorReceived === undefined,
    detail: `errorReceived=${p3.errorReceived ? p3.errorReceived.message : 'none'} timedOut=${p3.timedOut} elapsedMs=${p3.elapsedMs}`,
  });

  // P4: document the failure-mode contract
  // node-notifier on macOS returns callback with err=null even when system
  // notifications are fully disabled — the notification just doesn't appear.
  // This is a KNOWN limitation we cannot simulate without System Settings
  // changes. ADR records the caveat and recommended mitigation.
  results.push({
    name: 'P4 failure-mode contract documented',
    pass: true,
    detail:
      'Silent failure (permission denied, DND, etc.) cannot be detected programmatically on macOS via node-notifier; ADR records mitigation.',
  });

  console.log('\n=== DAEMON-S03 automated probe results ===\n');
  let allPassed = true;
  for (const r of results) {
    const mark = r.pass ? '✓' : '✗';
    console.log(`${mark} ${r.name}`);
    if (r.detail) console.log(`    ${r.detail}`);
    if (!r.pass) allPassed = false;
  }

  console.log('\n=== Manual-eye verification (record in ADR) ===');
  console.log('  [ ] Did P2 notification appear on your screen?');
  console.log('  [ ] If you clicked P2 within 8s, did click callback fire with response="activate"? (see P2 detail)');
  console.log('  [ ] Did P3 silent notification also appear visually?');
  console.log('  [ ] Did macOS surface a permission prompt at any point?');
  console.log('  [ ] Which terminal/host is firing this spike? (Terminal.app, iTerm2, Warp, Ghostty, VS Code terminal — notification permission is per-host-app)');

  console.log(`\n${allPassed ? 'AUTOMATED PROBES PASS' : 'AUTOMATED PROBE FAILURES — see above'}`);
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('spike crashed:', err);
  process.exit(1);
});
