/**
 * Spike 01 — tmux send-keys.
 *
 * Verifies how to feed prompt content into a tmux pane. Exercises:
 *   A1  baseline hello world
 *   A2  multi-word text containing the sub-word "Enter"
 *   A3  send-keys -l (literal) then separate Enter submit
 *   A4  pathological: text arg that is EXACTLY a key-name token
 *   B1  realistic multi-line payload via load-buffer + paste-buffer
 *   B2  realistic multi-line payload via send-keys -l with embedded newlines
 *
 * Target: a detached tmux session named fd-spike-01 running `cat`. `cat`
 * echoes each completed line back, which lets us verify both that the
 * keystrokes reached the pty and that Enter was (or was not) interpreted as
 * a submit.
 *
 * Exits 0 on PASS. Non-zero on any assertion failure — that is the signal to
 * stop and reassess before §4.
 */

import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

const SESSION = 'fd-spike-01';
const TARGET = `${SESSION}:0.0`;
const BUF = 'fd-spike-01-buf';

async function tmux(...args: string[]): Promise<string> {
  const { stdout } = await execFileP('tmux', args);
  return stdout;
}

async function capture(): Promise<string> {
  return tmux('capture-pane', '-t', TARGET, '-p', '-S', '-500');
}

async function killSession(): Promise<void> {
  try {
    await tmux('kill-session', '-t', SESSION);
  } catch {
    /* not running */
  }
  try {
    await tmux('delete-buffer', '-b', BUF);
  } catch {
    /* not present */
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadBufferFromString(name: string, content: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = execFile('tmux', ['load-buffer', '-b', name, '-'], (err) => {
      if (err) reject(err);
      else resolve();
    });
    child.stdin!.end(content);
  });
}

const results: Array<{ id: string; pass: boolean; note: string }> = [];
function record(id: string, pass: boolean, note: string) {
  results.push({ id, pass, note });
  const mark = pass ? 'PASS' : 'FAIL';
  console.log(`  [${mark}] ${id} — ${note}`);
}

async function main(): Promise<void> {
  console.log('=== spike 01: tmux send-keys ===\n');

  await killSession();

  // Detached session, pane running `cat` so we can observe what arrived at stdin.
  await tmux('new-session', '-d', '-s', SESSION, '-x', '240', '-y', '60', 'cat');
  await sleep(250);

  // --- A1: baseline --------------------------------------------------------
  console.log('\n--- A1: baseline "hello world" + Enter ---');
  await tmux('send-keys', '-t', TARGET, 'hello world', 'Enter');
  await sleep(200);
  const a1 = await capture();
  console.log(a1.trimEnd());
  // cat echoes the line, so "hello world" appears twice (once as typed-echo,
  // once as cat's output). Either way, presence confirms delivery.
  record('A1', a1.includes('hello world'), 'literal hello-world delivered and echoed');

  // --- A2: multi-word text that CONTAINS the sub-word "Enter" --------------
  console.log('\n--- A2: "press Enter now" as single argv + Enter ---');
  await tmux('send-keys', '-t', TARGET, 'press Enter now', 'Enter');
  await sleep(200);
  const a2 = await capture();
  console.log(a2.trimEnd());
  // When the text "press Enter now" is passed as ONE argv element, tmux does
  // not parse its tokens — it's either a key name (it isn't) or typed
  // literally. We expect the literal string to appear.
  record(
    'A2',
    a2.includes('press Enter now'),
    'multi-word string with sub-word "Enter" typed literally (not split)'
  );

  // --- A3: -l literal mode then separate Enter -----------------------------
  console.log('\n--- A3: send-keys -l "literal mode works" then Enter ---');
  await tmux('send-keys', '-t', TARGET, '-l', 'literal mode works');
  await tmux('send-keys', '-t', TARGET, 'Enter');
  await sleep(200);
  const a3 = await capture();
  console.log(a3.trimEnd());
  record('A3', a3.includes('literal mode works'), '-l forces literal typing; Enter submits');

  // --- A4: pathological — text is EXACTLY the key-name token "Up" ----------
  // Without -l, passing the single-token text "Up" is interpreted as the Up
  // arrow key. For `cat` (in canonical mode, no readline), Up produces the
  // ANSI escape bytes in the input, which cat will echo back as the literal
  // control sequence on the next line. The prompt substring "Up" would be
  // LOST — it never reaches the program as text.
  console.log('\n--- A4: send-keys "Up" (without -l) — DANGER CASE ---');
  await tmux('send-keys', '-t', TARGET, 'Up', 'Enter');
  await sleep(200);
  const a4 = await capture();
  console.log(a4.trimEnd());
  // We record this as PASS if "Up" does NOT appear as a typed word, because
  // that confirms the risk exists and the spike found it.
  const a4LostText = !/\bUp\b/.test(a4);
  record(
    'A4',
    a4LostText,
    a4LostText
      ? 'confirmed: bare "Up" token was interpreted as a key, text LOST — must use -l or paste-buffer'
      : 'UNEXPECTED: "Up" survived as text; re-check tmux key-name table'
  );

  // --- B1: multi-line realistic payload via load-buffer + paste-buffer -----
  console.log('\n--- B1: multi-line payload via load-buffer + paste-buffer + Enter ---');
  const payload = [
    'Here is a prompt with:',
    '- a list',
    '- code blocks',
    '- inline backticks like `grep -r`',
    '',
    '```ts',
    'const x: string = "hello";',
    'const y = `template ${x}`;',
    "console.log('single quotes');",
    '```',
    '',
    'And nested "quotes", plus a $dollar sign, and the word Up and Enter embedded.',
    'Final line.',
  ].join('\n');

  await loadBufferFromString(BUF, payload);
  await tmux('paste-buffer', '-b', BUF, '-t', TARGET);
  await tmux('send-keys', '-t', TARGET, 'Enter');
  await sleep(300);
  const b1 = await capture();
  console.log(b1.trimEnd());

  const b1Checks = {
    tripleBacktickTs: b1.includes('```ts'),
    dollarSign: b1.includes('$dollar'),
    templateLiteral: b1.includes('`template ${x}`'),
    nestedQuotes: b1.includes('"quotes"'),
    wordUp: / Up /.test(b1),
    wordEnter: / Enter /.test(b1),
    inlineBacktick: b1.includes('`grep -r`'),
  };
  const b1Pass = Object.values(b1Checks).every(Boolean);
  record(
    'B1',
    b1Pass,
    `paste-buffer preserved: ${Object.entries(b1Checks)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')}`
  );
  try { await tmux('delete-buffer', '-b', BUF); } catch {}

  // --- B2: multi-line via send-keys -l with embedded newlines --------------
  console.log('\n--- B2: send-keys -l with embedded \\n, then Enter ---');
  const payload2 = 'alpha line\nbeta line\ngamma line';
  await tmux('send-keys', '-t', TARGET, '-l', payload2);
  await tmux('send-keys', '-t', TARGET, 'Enter');
  await sleep(250);
  const b2 = await capture();
  console.log(b2.trimEnd());
  const b2Pass =
    b2.includes('alpha line') && b2.includes('beta line') && b2.includes('gamma line');
  record('B2', b2Pass, '-l with embedded newlines: all three lines reached the pty');

  await killSession();

  // --- Summary -------------------------------------------------------------
  console.log('\n=== SUMMARY ===');
  for (const r of results) {
    console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.id}  ${r.note}`);
  }
  const allPass = results.every((r) => r.pass);
  console.log(`\nOVERALL: ${allPass ? 'PASS' : 'FAIL'}\n`);

  if (!allPass) {
    process.exit(1);
  }

  // --- KNOWN facts, emitted verbatim for SPIKES.md -------------------------
  console.log('=== KNOWN facts (for SPIKES.md) ===');
  console.log([
    '1. tmux invocation: execFile("tmux", [...args]) with an arg array. No shell,',
    '   no interpolation — safe for prompt content containing $, `, quotes, etc.',
    '',
    '2. Arg structure for a send-keys call: ["send-keys", "-t", target, text, "Enter"].',
    '   The target form is "<session>:<window>.<pane>", e.g. "fd-spike-01:0.0".',
    '',
    '3. DANGER: without -l, each argv element passed to send-keys is FIRST looked up',
    '   as a tmux key name (Enter, Up, Down, Tab, C-a, M-x, etc.). If the whole',
    '   element matches a key name, it is sent as that key, not as characters.',
    '   A prompt whose text is exactly one of those tokens would be silently lost.',
    '   Verified: A4 sent "Up" and the text never reached the pty as characters.',
    '',
    '4. Safe production pattern for prompt content: load-buffer + paste-buffer.',
    '   - `execFile("tmux", ["load-buffer", "-b", <name>, "-"])` with content on stdin.',
    '   - `execFile("tmux", ["paste-buffer", "-b", <name>, "-t", <target>])`.',
    '   - `execFile("tmux", ["send-keys", "-t", <target>, "Enter"])` to submit.',
    '   - `execFile("tmux", ["delete-buffer", "-b", <name>])` to clean up.',
    '   Verified in B1: triple-backticks, template-literal `${x}`, $ sign, nested',
    '   "quotes", and the words "Up"/"Enter" all survived verbatim.',
    '',
    '5. Alternate pattern (acceptable fallback, not production default): send-keys -l.',
    '   - `send-keys -t <target> -l <text>` types every codepoint literally,',
    '     including embedded \\n. Then a separate `send-keys -t <target> Enter`',
    '     submits. Verified in A3 and B2.',
    '   - Reason for not choosing this as primary: paste-buffer is one atomic',
    '     paste from tmux\'s POV, which matches how TUIs (incl. Claude Code)',
    '     distinguish paste from typing. Typing very long content char-by-char',
    '     risks intermediate processing in target TUIs.',
    '',
    '6. Production sendKeys in `src/transport/tmux.ts` will therefore:',
    '   - Generate a unique buffer name per call (uuid or pid+ts).',
    '   - load-buffer -b <name> - (content on stdin).',
    '   - paste-buffer -b <name> -t <target>.',
    '   - send-keys -t <target> Enter.',
    '   - delete-buffer -b <name>.',
    '   A small helper `sendEnter(target)` wraps the bare Enter for callers',
    '   that only need to submit (e.g. tests).',
    '',
    '7. Session creation for tests: `new-session -d -s <name> -x <W> -y <H> <cmd>`.',
    '   -d detaches so the spike is not blocked waiting for a client.',
    '',
    '8. capture-pane -t <target> -p -S -<N>: prints last N lines of scrollback to',
    '   stdout. Trailing whitespace per line is stripped by default.',
  ].join('\n'));
}

main().catch(async (err) => {
  console.error('Spike 01 error:', err);
  await killSession();
  process.exit(2);
});
