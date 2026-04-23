/**
 * UI-S04 scenario runner. Characterizes pbcopy/pbpaste semantics on
 * macOS — the shared pasteboard accessed by both the daemon (via
 * pbcopy execFile per contract §4.4) and the web UI (via
 * navigator.clipboard.writeText, browser-side).
 *
 * Not production code. Node-only. Browser-side behavior (Permissions
 * API, user-gesture requirement) is cited in the ADR, not executed.
 *
 * WARNING: This spike mutates the macOS clipboard. It saves the text
 * contents at start via pbpaste and restores at end, but this is
 * best-effort — if the operator had rich content (image, HTML,
 * custom paste types), only the plain-text projection is preserved.
 * Do not run while an important rich-content clipboard is active.
 *
 *   pnpm --filter dispatch-web spike:S04
 */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scenariosPath = join(__dirname, 'scenarios.md');

interface Outcome {
  name: string;
  pass: boolean;
  note: string;
  observations: string[];
}

const log = (...args: unknown[]) => console.log('[UI-S04]', ...args);
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function pbcopy(content: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('pbcopy');
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`pbcopy exited ${code}`)),
    );
    child.stdin.end(content);
  });
}

function pbpaste(): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('pbpaste');
    const chunks: Buffer[] = [];
    child.stdout.on('data', (b: Buffer) => chunks.push(b));
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0
        ? resolve(Buffer.concat(chunks).toString('utf8'))
        : reject(new Error(`pbpaste exited ${code}`)),
    );
  });
}

// ---- S1 ----
async function S1(): Promise<Outcome> {
  const obs: string[] = [];
  await pbcopy('foo');
  const got = await pbpaste();
  obs.push(`wrote "foo", read "${got}"`);
  return {
    name: 'S1',
    pass: got === 'foo',
    note: got === 'foo' ? 'pbcopy/pbpaste round-trip works' : 'round-trip broken',
    observations: obs,
  };
}

// ---- S2 ----
async function S2(): Promise<Outcome> {
  const obs: string[] = [];
  await pbcopy('daemon-handoff-v1');
  const afterFirst = await pbpaste();
  obs.push(`after daemon write: "${afterFirst}"`);
  await sleep(50);
  await pbcopy('webui-handoff-v1');
  const afterSecond = await pbpaste();
  obs.push(`after web-ui write 50ms later: "${afterSecond}"`);
  return {
    name: 'S2',
    pass: afterFirst === 'daemon-handoff-v1' && afterSecond === 'webui-handoff-v1',
    note:
      afterSecond === 'webui-handoff-v1'
        ? 'last-writer-wins confirmed; no coordination between writers'
        : 'unexpected clipboard state',
    observations: obs,
  };
}

// ---- S3 ----
async function S3(): Promise<Outcome> {
  const obs: string[] = [];
  const seed = 'precondition-empty';
  await pbcopy(seed);
  // Fire both writes without awaiting between them. OS scheduler
  // decides which lands last.
  const contentA = 'concurrent-A';
  const contentB = 'concurrent-B';
  const pa = pbcopy(contentA);
  const pb = pbcopy(contentB);
  await Promise.all([pa, pb]);
  const winner = await pbpaste();
  obs.push(`two pbcopy processes spawned simultaneously: "${contentA}" and "${contentB}"`);
  obs.push(`clipboard after both complete: "${winner}"`);
  const deterministic = winner === contentA || winner === contentB;
  return {
    name: 'S3',
    pass: deterministic,
    note: deterministic
      ? `race result = one of {A, B}; result this run = ${winner}. Not predictable across runs.`
      : `unexpected value: "${winner}"`,
    observations: obs,
  };
}

// ---- S4 ----
async function S4(): Promise<Outcome> {
  const obs: string[] = [];
  const hazard = [
    '```',
    'const x = `template literal with ${vars} and $HOME`;',
    '// nested "quotes" and \'quotes\' and `backticks`',
    'unicode: café — résumé — 你好 — 🔬',
    'multi',
    'line',
    '```',
  ].join('\n');
  await pbcopy(hazard);
  const got = await pbpaste();
  const match = got === hazard;
  obs.push(`wrote ${hazard.length} bytes of hazard content`);
  obs.push(`read back ${got.length} bytes`);
  if (!match) {
    obs.push(`first diff at byte ${[...got].findIndex((c, i) => c !== hazard[i])}`);
  }
  return {
    name: 'S4',
    pass: match,
    note: match
      ? 'hazard chars round-trip byte-identical (triple-backticks, $vars, nested quotes, unicode, newlines)'
      : 'pbcopy/pbpaste lost content fidelity',
    observations: obs,
  };
}

async function main() {
  log('spike runner start');
  log('saving current clipboard for restore...');
  let original: string | null = null;
  try {
    original = await pbpaste();
    log(`saved ${original.length} bytes of clipboard text (rich content if any will be clobbered)`);
  } catch (e) {
    log(`could not read clipboard to save: ${(e as Error).message}`);
  }

  const outcomes: Outcome[] = [];
  const runners = [S1, S2, S3, S4];
  for (const r of runners) {
    try {
      const o = await r();
      outcomes.push(o);
      log(`${o.name}: ${o.pass ? 'PASS' : 'FAIL'} — ${o.note}`);
    } catch (e) {
      outcomes.push({
        name: r.name,
        pass: false,
        note: `threw: ${(e as Error).message}`,
        observations: [],
      });
      log(`${r.name}: THROW — ${(e as Error).message}`);
    }
  }

  // Restore best-effort.
  if (original !== null) {
    try {
      await pbcopy(original);
      log('restored clipboard text');
    } catch (e) {
      log(`could not restore clipboard: ${(e as Error).message}`);
    }
  }

  // Write scenarios.md
  const lines: string[] = [];
  lines.push('# UI-S04 scenario log', '');
  lines.push(`Run at: ${new Date().toISOString()}`, '');
  for (const o of outcomes) {
    lines.push(`## ${o.name} — ${o.pass ? 'PASS' : 'FAIL'}`);
    lines.push('', o.note, '');
    if (o.observations.length > 0) {
      lines.push('```');
      for (const line of o.observations) lines.push(line);
      lines.push('```', '');
    }
  }
  lines.push('## Summary');
  const pass = outcomes.filter((o) => o.pass).length;
  const total = outcomes.length;
  lines.push(`${pass}/${total} scenarios passed`);
  writeFileSync(scenariosPath, lines.join('\n'));
  log(`wrote scenarios.md (${pass}/${total} passed)`);
  process.exit(pass === total ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
