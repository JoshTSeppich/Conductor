#!/usr/bin/env node
/**
 * Seeds a 5-session demo registry at ~/.foxworks-dispatch/sessions.json
 * and creates the minimum on-disk state needed for each session to
 * derive its expected status:
 *
 *   sherpa    -> awaiting_review  (HANDOFF.md mtime newer than send)
 *   lantern   -> stale            (prompt sent 60m ago, no handoff)
 *   beacon    -> running          (prompt sent 3m ago)
 *   dispatch  -> running          (prompt sent 15m ago)
 *   cairn     -> idle             (never prompted)
 *
 * Operator workflow for the §6 / FD-T11 screenshot:
 *   node scripts/seed-status-demo.js
 *   ./dist/bin/fd.js status     # visual smoke, Ctrl+C to exit
 *   node scripts/seed-status-demo.js --clear
 *
 * The --clear flag restores an empty registry and removes /tmp/fd-demo.
 */

import { writeFileSync, mkdirSync, rmSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const DEMO_ROOT = '/tmp/fd-demo';
const FD_HOME = join(homedir(), '.foxworks-dispatch');
const REGISTRY_PATH = join(FD_HOME, 'sessions.json');

function clear() {
  rmSync(DEMO_ROOT, { recursive: true, force: true });
  mkdirSync(FD_HOME, { recursive: true });
  writeFileSync(
    REGISTRY_PATH,
    JSON.stringify({ version: 1, sessions: {} }, null, 2) + '\n',
    'utf8',
  );
  console.log('cleared demo state and reset registry.');
}

function seed() {
  mkdirSync(FD_HOME, { recursive: true });
  rmSync(DEMO_ROOT, { recursive: true, force: true });

  const now = Date.now();
  const iso = (msAgo) => new Date(now - msAgo).toISOString();

  for (const name of ['sherpa', 'lantern', 'beacon', 'dispatch', 'cairn']) {
    mkdirSync(join(DEMO_ROOT, name), { recursive: true });
  }

  // Only sherpa actually has a HANDOFF.md on disk — its mtime is fresher
  // than last_prompt_sent_at so deriveState yields awaiting_review.
  const sherpaHandoff = join(DEMO_ROOT, 'sherpa', 'HANDOFF.md');
  writeFileSync(sherpaHandoff, 'dummy handoff note — demo only\n', 'utf8');
  const handoffMtime = new Date(now - 2 * 60 * 1000);
  utimesSync(sherpaHandoff, handoffMtime, handoffMtime);

  const registry = {
    version: 1,
    sessions: {
      sherpa: {
        cwd: join(DEMO_ROOT, 'sherpa'),
        tmux_target: 'sherpa:0.0',
        handoff_path: sherpaHandoff,
        last_prompt_sent_at: iso(5 * 60 * 1000),
        last_handoff_pulled_at: null,
      },
      lantern: {
        cwd: join(DEMO_ROOT, 'lantern'),
        tmux_target: 'lantern:0.0',
        handoff_path: join(DEMO_ROOT, 'lantern', 'HANDOFF.md'),
        last_prompt_sent_at: iso(60 * 60 * 1000),
        last_handoff_pulled_at: null,
      },
      beacon: {
        cwd: join(DEMO_ROOT, 'beacon'),
        tmux_target: 'beacon:0.0',
        handoff_path: join(DEMO_ROOT, 'beacon', 'HANDOFF.md'),
        last_prompt_sent_at: iso(3 * 60 * 1000),
        last_handoff_pulled_at: null,
      },
      dispatch: {
        cwd: join(DEMO_ROOT, 'dispatch'),
        tmux_target: 'dispatch:0.0',
        handoff_path: join(DEMO_ROOT, 'dispatch', 'HANDOFF.md'),
        last_prompt_sent_at: iso(15 * 60 * 1000),
        last_handoff_pulled_at: null,
      },
      cairn: {
        cwd: join(DEMO_ROOT, 'cairn'),
        tmux_target: 'cairn:0.0',
        handoff_path: join(DEMO_ROOT, 'cairn', 'HANDOFF.md'),
        last_prompt_sent_at: null,
        last_handoff_pulled_at: null,
      },
    },
  };

  writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n', 'utf8');
  console.log(`seeded 5 fake sessions at ${REGISTRY_PATH}.`);
  console.log('run: ./dist/bin/fd.js status    (Ctrl+C to exit)');
  console.log('then: node scripts/seed-status-demo.js --clear');
}

if (process.argv.includes('--clear')) clear();
else seed();
