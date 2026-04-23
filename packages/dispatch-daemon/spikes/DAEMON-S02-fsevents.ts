/**
 * DAEMON-S02 — fs.watch / fsevents spike on macOS.
 *
 * Verifies watcher behavior for daemon's two file-watch needs per
 * CONDUCTOR_API_CONTRACT.md:
 *   - §5.3 handoff_written: detect HANDOFF.md updates
 *   - §5.3 commit_landed:   detect git HEAD ref updates
 *
 * Probes:
 *   P1  Direct write to HANDOFF.md → watcher fires for that filename
 *   P2  Atomic write (tmp + rename) → watcher fires for HANDOFF.md
 *       (production writes are atomic via writeRegistry-style pattern)
 *   P3  Rapid succession (5 writes in <100ms) → count events,
 *       document coalescing to inform debounce choice
 *   P4  fs.watch on .git/refs/heads/ → fires when `git commit`
 *       advances the HEAD ref
 *   P5  Concurrent file activity in a SIBLING dir (500 files, approx
 *       pnpm-install-tail intensity) → zero spurious fires in the
 *       watched dir. Verifies fsevents respects path scope.
 *   P6  Under the same concurrent sibling load, a real HANDOFF.md
 *       write in the watched dir still fires. Verifies watcher is
 *       not starved by nearby noise.
 *
 * Exit 0 on all-pass, 1 on any failure. All tmp dirs cleaned up.
 */

import { watch, type FSWatcher } from 'node:fs';
import {
  mkdtemp,
  mkdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

interface EventLog {
  eventType: 'rename' | 'change';
  filename: string | null;
  at: number;
}

interface ProbeResult {
  name: string;
  pass: boolean;
  detail?: string;
}

/** Attach fs.watch to dir; return a stop() that returns collected events. */
function setupWatcher(dir: string): {
  watcher: FSWatcher;
  events: EventLog[];
  stop: (drainMs?: number) => Promise<EventLog[]>;
} {
  const events: EventLog[] = [];
  const watcher = watch(dir, { persistent: true, recursive: false }, (eventType, filename) => {
    events.push({
      eventType: eventType as 'rename' | 'change',
      filename,
      at: Date.now(),
    });
  });
  const stop = async (drainMs: number = 250): Promise<EventLog[]> => {
    await new Promise((r) => setTimeout(r, drainMs));
    watcher.close();
    return events;
  };
  return { watcher, events, stop };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function probe(
  results: ProbeResult[],
  name: string,
  fn: () => Promise<{ pass: boolean; detail?: string }>,
): Promise<void> {
  try {
    const r = await fn();
    results.push({ name, ...r });
  } catch (err) {
    results.push({ name, pass: false, detail: (err as Error).message });
  }
}

async function p1_directWrite(results: ProbeResult[]): Promise<void> {
  await probe(results, 'P1 Direct write to HANDOFF.md → watcher fires for HANDOFF.md', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'fd-s02-p1-'));
    try {
      const { stop } = setupWatcher(dir);
      await sleep(50);
      await writeFile(join(dir, 'HANDOFF.md'), 'hello\n', 'utf8');
      const events = await stop();
      const sawHandoff = events.some((e) => e.filename === 'HANDOFF.md');
      return {
        pass: sawHandoff,
        detail: `events=${events.length} types=${JSON.stringify(events.map((e) => `${e.eventType}:${e.filename}`))}`,
      };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
}

async function p2_atomicWrite(results: ProbeResult[]): Promise<void> {
  await probe(
    results,
    'P2 Atomic write (tmp + rename) → watcher fires for HANDOFF.md',
    async () => {
      const dir = await mkdtemp(join(tmpdir(), 'fd-s02-p2-'));
      try {
        const { stop } = setupWatcher(dir);
        await sleep(50);
        const tmpPath = join(dir, 'HANDOFF.md.tmp');
        const finalPath = join(dir, 'HANDOFF.md');
        await writeFile(tmpPath, 'atomic content\n', 'utf8');
        await rename(tmpPath, finalPath);
        const events = await stop();
        const sawHandoff = events.some((e) => e.filename === 'HANDOFF.md');
        return {
          pass: sawHandoff,
          detail: `events=${events.length} types=${JSON.stringify(
            events.map((e) => `${e.eventType}:${e.filename}`),
          )}`,
        };
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  );
}

async function p3_coalescing(results: ProbeResult[]): Promise<void> {
  await probe(
    results,
    'P3 Rapid succession (5 writes <100ms) → count events (coalescing)',
    async () => {
      const dir = await mkdtemp(join(tmpdir(), 'fd-s02-p3-'));
      try {
        const { stop } = setupWatcher(dir);
        await sleep(50);
        const path = join(dir, 'HANDOFF.md');
        for (let i = 0; i < 5; i++) {
          await writeFile(path, `v${i}\n`, 'utf8');
          await sleep(15);
        }
        const events = await stop();
        // No PASS/FAIL — this is a characterization probe. Record observed count.
        const handoffEvents = events.filter((e) => e.filename === 'HANDOFF.md');
        return {
          pass: handoffEvents.length >= 1,
          detail: `5 writes → ${handoffEvents.length} HANDOFF.md events (coalesced or not). total events=${events.length}`,
        };
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  );
}

async function p4_gitRefWatch(results: ProbeResult[]): Promise<void> {
  await probe(
    results,
    'P4 .git/refs/heads/ watch → fires on `git commit`',
    async () => {
      const dir = await mkdtemp(join(tmpdir(), 'fd-s02-p4-'));
      try {
        await execFileP('git', ['init', '--initial-branch=main', dir]);
        await execFileP('git', ['-C', dir, 'config', 'user.email', 'spike@test.local']);
        await execFileP('git', ['-C', dir, 'config', 'user.name', 'Spike Test']);
        await execFileP('git', ['-C', dir, 'config', 'commit.gpgsign', 'false']);
        await writeFile(join(dir, 'file.txt'), 'initial\n', 'utf8');
        await execFileP('git', ['-C', dir, 'add', '.']);
        await execFileP('git', ['-C', dir, 'commit', '-m', 'initial']);

        const refsDir = join(dir, '.git', 'refs', 'heads');
        const { stop } = setupWatcher(refsDir);
        await sleep(50);

        // Second commit — advances refs/heads/main
        await writeFile(join(dir, 'file.txt'), 'updated\n', 'utf8');
        await execFileP('git', ['-C', dir, 'add', '.']);
        await execFileP('git', ['-C', dir, 'commit', '-m', 'second']);

        const events = await stop(400);
        const sawMain = events.some((e) => e.filename === 'main');
        return {
          pass: sawMain,
          detail: `events=${events.length} filenames=${JSON.stringify(events.map((e) => e.filename))}`,
        };
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  );
}

async function p5_siblingNoise_noSpurious(results: ProbeResult[]): Promise<void> {
  await probe(
    results,
    'P5 500 files created in SIBLING dir → zero spurious events in watched dir',
    async () => {
      const root = await mkdtemp(join(tmpdir(), 'fd-s02-p5-'));
      try {
        const watched = join(root, 'watched');
        const sibling = join(root, 'sibling-install');
        await mkdir(watched, { recursive: true });
        await mkdir(sibling, { recursive: true });

        const { stop } = setupWatcher(watched);
        await sleep(50);

        // Blast 500 file creations in sibling (mimics pnpm install tail).
        const creates: Array<Promise<void>> = [];
        for (let i = 0; i < 500; i++) {
          creates.push(writeFile(join(sibling, `file-${i}.txt`), `body ${i}`, 'utf8'));
        }
        await Promise.all(creates);

        const events = await stop(400);
        return {
          pass: events.length === 0,
          detail: `events in watched dir during sibling load: ${events.length} (expected 0)`,
        };
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );
}

async function p6_siblingNoise_realEditFires(results: ProbeResult[]): Promise<void> {
  await probe(
    results,
    'P6 Real HANDOFF.md edit under sibling load → still fires',
    async () => {
      const root = await mkdtemp(join(tmpdir(), 'fd-s02-p6-'));
      try {
        const watched = join(root, 'watched');
        const sibling = join(root, 'sibling-install');
        await mkdir(watched, { recursive: true });
        await mkdir(sibling, { recursive: true });

        const { stop } = setupWatcher(watched);
        await sleep(50);

        // Concurrent: sibling load + real HANDOFF.md write midway.
        const siblingPromise = (async () => {
          const creates: Array<Promise<void>> = [];
          for (let i = 0; i < 500; i++) {
            creates.push(writeFile(join(sibling, `file-${i}.txt`), `body ${i}`, 'utf8'));
          }
          await Promise.all(creates);
        })();

        const handoffPromise = (async () => {
          await sleep(30);
          await writeFile(join(watched, 'HANDOFF.md'), 'real content\n', 'utf8');
        })();

        await Promise.all([siblingPromise, handoffPromise]);

        const events = await stop(400);
        const sawHandoff = events.some((e) => e.filename === 'HANDOFF.md');
        return {
          pass: sawHandoff,
          detail: `events in watched dir=${events.length} sawHandoff=${sawHandoff}`,
        };
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );
}

async function main(): Promise<void> {
  const results: ProbeResult[] = [];
  await p1_directWrite(results);
  await p2_atomicWrite(results);
  await p3_coalescing(results);
  await p4_gitRefWatch(results);
  await p5_siblingNoise_noSpurious(results);
  await p6_siblingNoise_realEditFires(results);

  console.log('\n=== DAEMON-S02 spike results ===\n');
  let allPassed = true;
  for (const r of results) {
    const mark = r.pass ? '✓' : '✗';
    const line = r.detail ? `${mark} ${r.name}\n    ${r.detail}` : `${mark} ${r.name}`;
    console.log(line);
    if (!r.pass) allPassed = false;
  }
  console.log(`\n${allPassed ? 'ALL PROBES PASS' : 'FAILURES — see above'}`);
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('spike crashed:', err);
  process.exit(1);
});
