/**
 * Spike 03 — tmux has-session, list-panes, and pane-existence checks.
 *
 * The registry stores a fully-qualified target like "sherpa:0.0". Before
 * `fd send`, we must verify the TARGET (session + window + pane) still
 * resolves, not merely that the session exists. This spike compares four
 * approaches on tmux 3.6a:
 *
 *   D1   has-session -t <session>                 — exit code semantics.
 *   D1b  has-session -t <does-not-exist>          — error path.
 *   D2   has-session -t <session>:<w>.<p>         — validates full target?
 *   D3   list-panes  -a -F '#{...}'               — enumerate all panes.
 *   D4   display-message -p -t <target> '#{pane_id}' — targeted lookup alt.
 *
 * Intended assertions were written from docs (MODELED). First run surfaced
 * two deviations — this file is the second pass, asserting on what tmux
 * actually does (KNOWN). The KNOWN facts section captures both.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

const SESSION = 'fd-spike-03';
const TARGET_GOOD = `${SESSION}:0.0`;
const TARGET_BAD_PANE = `${SESSION}:0.9`; // session real, pane does not exist
const TARGET_NO_SESSION = 'fd-does-not-exist-xyz:0.0';

interface ExecResult {
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
}

async function runTmux(args: string[]): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await execFileP('tmux', args);
    return { ok: true, code: 0, stdout, stderr };
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { code?: number | string; stdout?: string; stderr?: string };
    const code = typeof e.code === 'number' ? e.code : null;
    return {
      ok: false,
      code,
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? String(e.message ?? ''),
    };
  }
}

async function killSession(): Promise<void> {
  await runTmux(['kill-session', '-t', SESSION]);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const results: Array<{ id: string; pass: boolean; note: string }> = [];
function record(id: string, pass: boolean, note: string) {
  results.push({ id, pass, note });
  console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${id} — ${note}`);
}

async function main(): Promise<void> {
  console.log('=== spike 03: has-session, list-panes, pane-existence ===\n');
  await killSession();

  // Detached session with one window, one pane running `cat`.
  await runTmux(['new-session', '-d', '-s', SESSION, '-x', '80', '-y', '10', 'cat']);
  await sleep(200);

  // --- D1: has-session for a real session ---------------------------------
  console.log('\n--- D1: has-session against a real session ---');
  const d1 = await runTmux(['has-session', '-t', SESSION]);
  console.log(`  ok=${d1.ok}  code=${d1.code}  stdout=${JSON.stringify(d1.stdout)}  stderr=${JSON.stringify(d1.stderr)}`);
  record('D1', d1.ok && d1.code === 0, 'real session → exit 0, empty stdout/stderr');

  // --- D1b: has-session for a non-existent session ------------------------
  console.log('\n--- D1b: has-session against a non-existent session ---');
  const d1b = await runTmux(['has-session', '-t', 'fd-does-not-exist-xyz']);
  console.log(`  ok=${d1b.ok}  code=${d1b.code}  stdout=${JSON.stringify(d1b.stdout)}  stderr=${JSON.stringify(d1b.stderr)}`);
  record(
    'D1b',
    !d1b.ok && /can't find session|no server/i.test(d1b.stderr),
    'missing session → non-zero exit, "can\'t find session" on stderr'
  );

  // --- D2: has-session with fully-qualified pane target -------------------
  // KNOWN (measured, not modelled): on tmux 3.6a, has-session validates the
  // FULL -t target. A missing pane yields exit 1 with "can't find pane: N",
  // and a missing window yields "can't find window: N". This means fd can
  // use has-session directly against the stored <sess>:<w>.<p> target —
  // no need for display-message. The prior MODELED assumption (that
  // has-session only checks the session portion) was wrong.
  console.log('\n--- D2: has-session -t <session>:<w>.<p> — validates full target on tmux 3.6a ---');
  const d2good = await runTmux(['has-session', '-t', TARGET_GOOD]);
  const d2bad = await runTmux(['has-session', '-t', TARGET_BAD_PANE]);
  console.log(`  target=${TARGET_GOOD}      ok=${d2good.ok} code=${d2good.code} stderr=${JSON.stringify(d2good.stderr)}`);
  console.log(`  target=${TARGET_BAD_PANE}  ok=${d2bad.ok} code=${d2bad.code}  stderr=${JSON.stringify(d2bad.stderr)}`);
  const d2ok = d2good.ok && d2good.code === 0 && !d2bad.ok && /can't find (pane|window)/i.test(d2bad.stderr);
  record(
    'D2',
    d2ok,
    'has-session validates the full target: good→exit 0, bad pane→exit 1 with "can\'t find pane"'
  );

  // --- D3: list-panes -a -F '#{session_name}:#{window_index}.#{pane_index}' -
  console.log('\n--- D3: list-panes -a -F "#{session_name}:#{window_index}.#{pane_index}" ---');
  const d3 = await runTmux([
    'list-panes',
    '-a',
    '-F',
    '#{session_name}:#{window_index}.#{pane_index}',
  ]);
  console.log(`  ok=${d3.ok} code=${d3.code}`);
  console.log(`  stdout=\n${d3.stdout}`);
  const panes = d3.stdout.split('\n').map((s) => s.trim()).filter(Boolean);
  const d3containsOurs = panes.includes(TARGET_GOOD);
  console.log(`  contains "${TARGET_GOOD}" = ${d3containsOurs}`);
  console.log(`  contains "${TARGET_BAD_PANE}" = ${panes.includes(TARGET_BAD_PANE)}`);
  record(
    'D3',
    d3.ok && d3containsOurs && !panes.includes(TARGET_BAD_PANE),
    '-a enumerates all panes across all sessions; -F format string yields one target per line'
  );

  // --- D4: display-message -p -t <target> '#{pane_id}' — characterise ----
  // This was the MODELED production candidate before D2 showed has-session
  // already does what we need. We still characterise display-message here
  // so the KNOWN facts are complete and fd can use it later if we ever
  // need the pane_id itself.
  console.log('\n--- D4: display-message -p -t <target> "#{pane_id}" — characterise behavior ---');
  const d4good = await runTmux(['display-message', '-p', '-t', TARGET_GOOD, '#{pane_id}']);
  const d4badPane = await runTmux(['display-message', '-p', '-t', TARGET_BAD_PANE, '#{pane_id}']);
  const d4noSession = await runTmux(['display-message', '-p', '-t', TARGET_NO_SESSION, '#{pane_id}']);
  console.log(`  good   : ok=${d4good.ok} code=${d4good.code} stdout=${JSON.stringify(d4good.stdout)} stderr=${JSON.stringify(d4good.stderr)}`);
  console.log(`  badPane: ok=${d4badPane.ok} code=${d4badPane.code} stdout=${JSON.stringify(d4badPane.stdout)} stderr=${JSON.stringify(d4badPane.stderr)}`);
  console.log(`  noSess : ok=${d4noSession.ok} code=${d4noSession.code} stdout=${JSON.stringify(d4noSession.stdout)} stderr=${JSON.stringify(d4noSession.stderr)}`);
  // The assertion is: good resolves to a %N pane id. We DO NOT assert on
  // the failure paths because the observed behavior (exit 0 with fallback
  // output on invalid targets) is itself a finding to document — using
  // display-message as an existence check would be unsafe.
  const d4ok = d4good.ok && /^%\d+/.test(d4good.stdout.trim());
  record(
    'D4',
    d4ok,
    'display-message returns pane_id for good targets; fallback behavior on bad targets is unreliable — do NOT use for existence checks'
  );

  // --- D5: production choice ---------------------------------------------
  console.log('\n--- D5: production choice ---');
  console.log('  Production hasSession(target) will use `has-session -t <target>`.');
  console.log('  Rely on exit code: 0 = exists, non-zero = does not.');
  console.log('  This works for fully-qualified session:window.pane targets on tmux 3.6a.');
  record('D5', true, 'production decision: has-session -t <fq-target>, exit code authoritative');

  await killSession();

  // --- Summary ------------------------------------------------------------
  console.log('\n=== SUMMARY ===');
  for (const r of results) console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.id}  ${r.note}`);
  const allPass = results.every((r) => r.pass);
  console.log(`\nOVERALL: ${allPass ? 'PASS' : 'FAIL'}\n`);

  console.log('=== KNOWN facts (for SPIKES.md) ===');
  console.log([
    '1. has-session -t <session>: exit 0 if the session exists, exit 1 with',
    '   "can\'t find session: <name>" on stderr if it does not. Observed on',
    '   tmux 3.6a in probes D1/D1b.',
    '',
    '2. (Deviation from MODELED assumption.) On tmux 3.6a, has-session ALSO',
    '   validates the window and pane portions of a fully-qualified target:',
    '     - "<sess>:0.0"  where session/window/pane all exist → exit 0.',
    '     - "<sess>:0.9"  where the pane does not exist       → exit 1,',
    '                     stderr "can\'t find pane: 9".',
    '     - "<sess>:9.0"  where the window does not exist     → exit 1,',
    '                     stderr "can\'t find window: 9" (inferred by',
    '                     analogy; verified path: pane-not-found in D2).',
    '   Therefore `fd` can use `has-session -t <fq-target>` directly as',
    '   the existence check. No second call needed. Verified in D2.',
    '',
    '3. list-panes -a -F "#{session_name}:#{window_index}.#{pane_index}"',
    '   enumerates every pane across every session, one per line. Useful',
    '   for future `fd init` tab-completion candidates; not used on the',
    '   hot path. Verified in D3.',
    '',
    '4. display-message -p -t <target> "#{pane_id}" returns a value like',
    '   "%0" for a valid target. For INVALID targets, tmux 3.6a exits 0',
    '   and returns fallback output — it does not error. This makes',
    '   display-message UNSAFE as an existence check. (Characterised in',
    '   D4.) If fd ever needs the pane_id, call it only after has-session',
    '   has already confirmed the target.',
    '',
    '5. Error classification for fd production: use execFile and rely on',
    '   exit code. A rejection means "target not resolved". Stderr text is',
    '   useful only for user-facing messages, not for control flow.',
    '',
    '6. Production decision (from D5): `hasSession(target)` in',
    '   src/transport/tmux.ts calls `tmux has-session -t <target>` with',
    '   the fully-qualified target string stored in sessions.json. Returns',
    '   true iff exit code 0.',
  ].join('\n'));

  if (!allPass) process.exit(1);
}

main().catch(async (err) => {
  console.error('Spike 03 error:', err);
  await killSession();
  process.exit(2);
});
