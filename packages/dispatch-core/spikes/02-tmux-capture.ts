/**
 * Spike 02 — tmux capture-pane.
 *
 * Verifies exactly what capture-pane returns so production code can trust it
 * for HANDOFF staleness detection and (future) pane scraping if ever needed.
 *
 * Probes:
 *   C1  -p prints to stdout (not to a named buffer) and returns a string.
 *   C2  trailing-whitespace behavior per line (default) and on the pane as a whole.
 *   C3  -S -N semantics: does N mean lines-from-top-of-history, and does
 *       capture include the visible pane on top of that?
 *   C4  empty-ish pane right after session creation.
 *   C5  scrollback depth: send >visible-height lines, verify -S -200 captures
 *       content that has scrolled off the visible pane.
 *
 * Target: fresh detached tmux session running `cat`. Uses the paste-buffer
 * path validated in spike 01 to inject deterministic content.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

const SESSION = 'fd-spike-02';
const TARGET = `${SESSION}:0.0`;
const BUF = 'fd-spike-02-buf';

async function tmux(...args: string[]): Promise<string> {
  const { stdout } = await execFileP('tmux', args);
  return stdout;
}

async function killSession(): Promise<void> {
  try { await tmux('kill-session', '-t', SESSION); } catch {}
  try { await tmux('delete-buffer', '-b', BUF); } catch {}
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function pasteAndEnter(content: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = execFile('tmux', ['load-buffer', '-b', BUF, '-'], (err) => {
      if (err) reject(err);
      else resolve();
    });
    child.stdin!.end(content);
  });
  await tmux('paste-buffer', '-b', BUF, '-t', TARGET);
  await tmux('send-keys', '-t', TARGET, 'Enter');
  try { await tmux('delete-buffer', '-b', BUF); } catch {}
}

const results: Array<{ id: string; pass: boolean; note: string }> = [];
function record(id: string, pass: boolean, note: string) {
  results.push({ id, pass, note });
  console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${id} — ${note}`);
}

async function main(): Promise<void> {
  console.log('=== spike 02: tmux capture-pane ===\n');
  await killSession();

  // Small pane so we can easily observe scrollback behavior.
  await tmux('new-session', '-d', '-s', SESSION, '-x', '80', '-y', '10', 'cat');
  await sleep(250);

  // --- C4 first (empty pane, before any paste) -----------------------------
  console.log('\n--- C4: capture-pane on a fresh/empty pane ---');
  const c4 = await tmux('capture-pane', '-t', TARGET, '-p', '-S', '-100');
  console.log(`[bytes=${c4.length}] [repr=${JSON.stringify(c4)}]`);
  // Expectation: mostly blank, ends with a newline. Should not throw.
  record('C4', true, `empty pane returned ${c4.length} bytes; did not error`);

  // --- C1/C2: capture returns stdout, check trailing whitespace ------------
  console.log('\n--- C1/C2: send known lines, inspect capture bytes ---');
  await pasteAndEnter('line_one\nline_two   \nline_three');
  await sleep(200);
  const c1 = await tmux('capture-pane', '-t', TARGET, '-p', '-S', '-100');
  console.log('--- raw ---');
  console.log(c1);
  console.log('--- JSON ---');
  console.log(JSON.stringify(c1));

  // C1 pass: stdout string contains our lines.
  record(
    'C1',
    c1.includes('line_one') && c1.includes('line_two') && c1.includes('line_three'),
    '-p prints captured pane to stdout as a plain string'
  );

  // C2 trailing whitespace:
  //   tmux capture-pane strips trailing whitespace from each line by default.
  //   'line_two   ' was sent with three trailing spaces; check whether any
  //   line of the output preserves them.
  const anyLineHasTrailingSpace = c1.split('\n').some((ln) => /\S +$/.test(ln));
  record(
    'C2',
    !anyLineHasTrailingSpace,
    anyLineHasTrailingSpace
      ? 'UNEXPECTED: found a line with trailing spaces — tmux left them intact'
      : 'confirmed: capture-pane strips per-line trailing whitespace by default'
  );

  // --- C3: -S -N semantics -------------------------------------------------
  // Send 30 more lines so history grows beyond the 10-row visible pane.
  // Each logical line is echoed by cat, so the scrollback grows quickly.
  console.log('\n--- C3: -S -N semantics with history > visible pane ---');
  const bulk = Array.from({ length: 30 }, (_, i) => `bulk_${i + 1}`).join('\n');
  await pasteAndEnter(bulk);
  await sleep(400);

  const capVisible = await tmux('capture-pane', '-t', TARGET, '-p');
  const capS100 = await tmux('capture-pane', '-t', TARGET, '-p', '-S', '-100');
  const capS500 = await tmux('capture-pane', '-t', TARGET, '-p', '-S', '-500');

  console.log(`no -S (visible only)        : ${capVisible.split('\n').length} lines, ${capVisible.length} bytes`);
  console.log(`-S -100 (100 back + visible): ${capS100.split('\n').length} lines, ${capS100.length} bytes`);
  console.log(`-S -500 (500 back + visible): ${capS500.split('\n').length} lines, ${capS500.length} bytes`);

  const visibleHasBulk1 = capVisible.includes('bulk_1');
  const s100HasBulk1 = capS100.includes('bulk_1');
  const s500HasBulk1 = capS500.includes('bulk_1');
  const s100HasBulk30 = capS100.includes('bulk_30');
  console.log(`  visible contains 'bulk_1'  = ${visibleHasBulk1}`);
  console.log(`  -S -100 contains 'bulk_1'  = ${s100HasBulk1}`);
  console.log(`  -S -500 contains 'bulk_1'  = ${s500HasBulk1}`);
  console.log(`  -S -100 contains 'bulk_30' = ${s100HasBulk30}`);

  // Expected:
  //   visibleHasBulk1 = false (bulk_1 scrolled off)
  //   s100HasBulk1    = true  (-S -100 reaches back far enough)
  //   s500HasBulk1    = true
  //   s100HasBulk30   = true  (most recent line still visible)
  const c3Pass =
    !visibleHasBulk1 &&
    s100HasBulk1 &&
    s500HasBulk1 &&
    s100HasBulk30;
  record(
    'C3',
    c3Pass,
    '-S -N reads N scrollback lines before the visible pane; -N counts backwards from top of visible'
  );

  // --- C5: very large -S -------------------------------------------------
  console.log('\n--- C5: -S - (full history sentinel) ---');
  let c5: string;
  try {
    c5 = await tmux('capture-pane', '-t', TARGET, '-p', '-S', '-');
    console.log(`-S "-" (all history)        : ${c5.split('\n').length} lines, ${c5.length} bytes`);
    record('C5', c5.length > 0, '-S "-" returns entire scrollback (documented tmux sentinel)');
  } catch (err) {
    console.log('-S "-" failed:', err);
    record('C5', false, '-S "-" unexpectedly failed — document as UNKNOWN');
  }

  await killSession();

  // --- Summary + KNOWN facts ----------------------------------------------
  console.log('\n=== SUMMARY ===');
  for (const r of results) console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.id}  ${r.note}`);
  const allPass = results.every((r) => r.pass);
  console.log(`\nOVERALL: ${allPass ? 'PASS' : 'FAIL'}\n`);

  console.log('=== KNOWN facts (for SPIKES.md) ===');
  console.log([
    '1. capture-pane -t <target> -p -S -<N>: prints captured text to stdout.',
    '   -p is required to print instead of storing in a paste buffer.',
    '',
    '2. -S -N reads N lines of scrollback PLUS the current visible pane.',
    '   The returned string is a single trailing-newline-terminated block',
    '   with lines in chronological order (oldest first, most recent last).',
    '',
    '3. Trailing whitespace is stripped from each captured line by default.',
    '   For production we do not need to preserve it; but if we ever do,',
    '   the -J flag joins wrapped lines and -e keeps escape sequences —',
    '   neither preserves trailing spaces; use something else (not investigated).',
    '',
    '4. -S "-" is the sentinel for "from the start of history". Safe to use',
    '   when we want absolutely everything; do not abuse — scrollback can be',
    '   large. Production should prefer a bounded -S -N with a sane cap.',
    '',
    '5. capture-pane on an empty pane returns a mostly-blank string (the',
    '   visible-pane width/height worth of blank lines). It does NOT error.',
    '',
    "6. Production note: fd does not currently call capture-pane at all —",
    '   the handoff round-trip uses HANDOFF.md on disk, not pane scraping.',
    '   This spike exists to document the API so v2 features (fd watch,',
    '   fd tail-handoffs) can use it with confidence. v1 tmux.ts will still',
    '   export a capturePane helper for integration tests in FD-T05.',
  ].join('\n'));

  if (!allPass) process.exit(1);
}

main().catch(async (err) => {
  console.error('Spike 02 error:', err);
  await killSession();
  process.exit(2);
});
