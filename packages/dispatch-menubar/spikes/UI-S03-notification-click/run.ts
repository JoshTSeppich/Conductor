/**
 * UI-S03 runnable scenarios. Verifies the Node→osascript pipeline that
 * the Electron menu bar's Notification click handler will use for
 * cross-app focus.
 *
 * Intrusiveness boundary: exercises osascript with benign payloads
 * only ('return 42', invalid-syntax error path, `which open`). Does
 * NOT execute production focus commands (those would activate/launch
 * browsers on the operator's desktop). Production incantations live
 * in docs/adr/UI-S03-notification-click.md as text.
 *
 *   pnpm --filter dispatch-menubar spike:S03   (once package.json wires it)
 *   -- or manually --
 *   cd packages/dispatch-menubar/spikes/UI-S03-notification-click && npx tsx run.ts
 */
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFile = promisify(execFileCb);
const __dirname = dirname(fileURLToPath(import.meta.url));
const scenariosPath = join(__dirname, 'scenarios.md');

interface Outcome {
  name: string;
  pass: boolean;
  note: string;
  observations: string[];
}

const log = (...args: unknown[]) => console.log('[UI-S03]', ...args);

// ---- S1 ----
async function S1(): Promise<Outcome> {
  const obs: string[] = [];
  const { stdout, stderr } = await execFile('osascript', ['-e', 'return 42']);
  const trimmed = stdout.trim();
  obs.push(`osascript -e 'return 42' → stdout "${trimmed}", stderr "${stderr.trim()}"`);
  return {
    name: 'S1',
    pass: trimmed === '42',
    note:
      trimmed === '42'
        ? 'Node child_process → osascript pipeline works; stdout round-trips'
        : `unexpected stdout "${trimmed}"`,
    observations: obs,
  };
}

// ---- S2 ----
async function S2(): Promise<Outcome> {
  const obs: string[] = [];
  // Intentionally invalid AppleScript; expect non-zero exit.
  try {
    await execFile('osascript', ['-e', 'this is not valid applescript syntax']);
    // If it somehow succeeded, that's unexpected.
    return {
      name: 'S2',
      pass: false,
      note: 'invalid AppleScript did not error — unexpected',
      observations: ['osascript returned success for invalid syntax'],
    };
  } catch (e) {
    const err = e as NodeJS.ErrnoException & { code?: number; stderr?: string };
    obs.push(`exit code: ${err.code ?? 'unknown'}`);
    const stderr = (err.stderr ?? '').trim();
    obs.push(`stderr: "${stderr.slice(0, 200)}${stderr.length > 200 ? '…' : ''}"`);
    const hasDiagnostic = stderr.length > 0 && /syntax|error|expected/i.test(stderr);
    return {
      name: 'S2',
      pass: hasDiagnostic,
      note: hasDiagnostic
        ? 'osascript surfaces syntax errors to stderr; production click handler can log + fall back to open(URL)'
        : 'osascript errored but stderr diagnostic was not captured',
      observations: obs,
    };
  }
}

// ---- S3 ----
async function S3(): Promise<Outcome> {
  const obs: string[] = [];
  // Verify `open` command available without actually opening anything.
  try {
    const { stdout } = await execFile('which', ['open']);
    const path = stdout.trim();
    obs.push(`which open → "${path}"`);
    const pass = path.length > 0 && path.endsWith('/open');
    return {
      name: 'S3',
      pass,
      note: pass
        ? 'macOS `open` command resolvable; fallback path (production-recommended) viable'
        : `unexpected path "${path}"`,
      observations: obs,
    };
  } catch (e) {
    return {
      name: 'S3',
      pass: false,
      note: `which open failed: ${(e as Error).message}`,
      observations: obs,
    };
  }
}

async function main() {
  log('spike runner start');
  const runners = [S1, S2, S3];
  const outcomes: Outcome[] = [];
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

  const lines: string[] = [];
  lines.push('# UI-S03 scenario log', '');
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
  lines.push('## Scope note', '');
  lines.push(
    'Runnable scenarios above verify the Node→osascript pipeline and',
    'the macOS `open` command availability. The production click-handler',
    'pattern, per-browser AppleScript incantations, fallback behavior,',
    'and failure-mode taxonomy live in `docs/adr/UI-S03-notification-click.md`',
    'as text — these are not executed here because running them would',
    "launch browsers on the operator's desktop without consent.",
  );
  lines.push('', '## Summary');
  const pass = outcomes.filter((o) => o.pass).length;
  const total = outcomes.length;
  lines.push(`${pass}/${total} runnable scenarios passed`);
  writeFileSync(scenariosPath, lines.join('\n'));
  log(`wrote scenarios.md (${pass}/${total} passed)`);
  process.exit(pass === total ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
