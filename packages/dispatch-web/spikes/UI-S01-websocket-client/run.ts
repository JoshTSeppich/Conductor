/**
 * UI-S01 scenario runner. Executes S1/S2/S3'/S4a/S4b/S5/S6a/S6b/S6c
 * against a throwaway fixture and emits observations to stdout.
 *
 * Not a vitest test. Intentional — the runner wants a single process
 * that brings up / tears down the fixture between scenarios with
 * real timing. vitest's per-test isolation fights that pattern.
 *
 *   pnpm --filter dispatch-web spike:S01
 *
 * Scenarios write structured observation lines to stdout and also
 * return `{pass, note, observations}`. `scenarios.md` gets overwritten
 * with the final log at end of run.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import {
  SpikeClient,
  DEFAULT_BACKOFF,
  computeBackoff,
  type EventShape,
  type ClientStatus,
} from './client.js';
import { startFixture, type FixtureEvent, type FixtureHandle } from './server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scenariosPath = join(__dirname, 'scenarios.md');

interface Outcome {
  name: string;
  pass: boolean;
  note: string;
  observations: string[];
}

const outcomes: Outcome[] = [];
const log = (...args: unknown[]) => console.log('[UI-S01]', ...args);

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 5_000,
  intervalMs = 20,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await sleep(intervalMs);
  }
  return predicate();
}

function makeEvent(n: number, session = 'spike'): FixtureEvent {
  return {
    type: 'handoff_written',
    timestamp: new Date(Date.now() + n).toISOString(),
    session,
    data: { path: `/tmp/fixture/${n}/HANDOFF.md`, size_bytes: n * 10 },
  };
}

async function withFixture<T>(
  opts: Parameters<typeof startFixture>[0],
  fn: (fx: FixtureHandle) => Promise<T>,
): Promise<T> {
  const fx = await startFixture(opts);
  try {
    return await fn(fx);
  } finally {
    await fx.stop();
  }
}

function makeClient(
  httpBase: string,
  wsUrl: string,
  token: string,
  received: EventShape[],
  statuses: ClientStatus[],
  backoff = DEFAULT_BACKOFF,
) {
  return new SpikeClient({
    httpBase,
    wsUrl,
    token,
    onEvent: (e) => received.push(e),
    onStatus: (s) => statuses.push(s),
    backoff,
  });
}

// ---- S1 ----
async function S1(): Promise<Outcome> {
  const obs: string[] = [];
  return withFixture({}, async (fx) => {
    const base = `http://127.0.0.1:${fx.port}`;
    const ws = `ws://127.0.0.1:${fx.port}/v2/events/stream`;
    const received: EventShape[] = [];
    const statuses: ClientStatus[] = [];
    const client = makeClient(base, ws, 'test-token', received, statuses);
    await client.connect();
    fx.emit(makeEvent(1));
    const gotFirst = await waitFor(() => received.length === 1, 2_000);
    obs.push(`after emit e1: received=${received.length} status=${client.getStatus()}`);
    if (!gotFirst) {
      client.disconnect();
      return { name: 'S1', pass: false, note: 'did not receive e1', observations: obs };
    }
    fx.closeAllWs();
    const dropped = await waitFor(() => client.getStatus() !== 'connected', 2_000);
    obs.push(`after closeAllWs: status=${client.getStatus()} dropped=${dropped}`);
    const reconnected = await waitFor(() => client.getStatus() === 'connected', 4_000);
    obs.push(`after reconnect wait: status=${client.getStatus()} reconnected=${reconnected}`);
    fx.emit(makeEvent(2));
    const gotSecond = await waitFor(() => received.length === 2, 2_000);
    obs.push(`after emit e2: received=${received.length}`);
    client.disconnect();
    const pass = gotFirst && reconnected && gotSecond && received.length === 2;
    return {
      name: 'S1',
      pass,
      note: pass ? 'transient WS drop recovered, both events delivered' : 'failed recovery',
      observations: obs,
    };
  });
}

// ---- S2 ----
async function S2(): Promise<Outcome> {
  const obs: string[] = [];
  return withFixture({}, async (fx) => {
    const base = `http://127.0.0.1:${fx.port}`;
    const ws = `ws://127.0.0.1:${fx.port}/v2/events/stream`;
    const received: EventShape[] = [];
    const statuses: ClientStatus[] = [];
    const client = makeClient(base, ws, 'test-token', received, statuses);
    await client.connect();
    fx.emit(makeEvent(1));
    await waitFor(() => received.length === 1, 2_000);
    obs.push(`initial: received=${received.length} lastTs=${client.getLastTs()}`);
    fx.closeAllWs();
    await waitFor(() => client.getStatus() !== 'connected', 2_000);
    for (let i = 2; i <= 6; i++) fx.emit(makeEvent(i));
    obs.push(`emitted e2..e6 while disconnected: fixtureLog=${fx.getLog().length}`);
    const gotAll = await waitFor(() => received.length === 6, 6_000);
    obs.push(
      `after reconnect+gapfill: received=${received.length} status=${client.getStatus()}`,
    );
    const uniqueTimestamps = new Set(received.map((e) => e.timestamp)).size;
    obs.push(`unique timestamps in received: ${uniqueTimestamps}`);
    client.disconnect();
    const pass = gotAll && received.length === 6 && uniqueTimestamps === 6;
    return {
      name: 'S2',
      pass,
      note: pass
        ? 'gap-fill delivered all 5 missed events, no duplicates'
        : `expected 6 unique, got ${received.length} (${uniqueTimestamps} unique)`,
      observations: obs,
    };
  });
}

// ---- S3′ programmatic long-disconnect proxy ----
async function S3prime(): Promise<Outcome> {
  const obs: string[] = [];
  return withFixture({}, async (fx) => {
    const base = `http://127.0.0.1:${fx.port}`;
    const ws = `ws://127.0.0.1:${fx.port}/v2/events/stream`;
    const received: EventShape[] = [];
    const statuses: ClientStatus[] = [];
    const client = makeClient(base, ws, 'test-token', received, statuses);
    await client.connect();
    fx.emit(makeEvent(1));
    await waitFor(() => received.length === 1, 2_000);
    obs.push(`initial: received=${received.length}`);
    client.disconnect();
    obs.push(`after disconnect: status=${client.getStatus()}`);
    for (let i = 2; i <= 5; i++) fx.emit(makeEvent(i));
    obs.push(`emitted e2..e5 while client disconnected`);
    await sleep(200);
    await client.connect();
    const gotAll = await waitFor(() => received.length === 5, 4_000);
    obs.push(
      `after reconnect: received=${received.length} status=${client.getStatus()}`,
    );
    const uniqueTimestamps = new Set(received.map((e) => e.timestamp)).size;
    client.disconnect();
    const pass = gotAll && received.length === 5 && uniqueTimestamps === 5;
    return {
      name: "S3'",
      pass,
      note: pass
        ? 'programmatic-disconnect proxy: gap-fill reconciled 4 missed events'
        : `expected 5 unique, got ${received.length} (${uniqueTimestamps} unique)`,
      observations: obs,
    };
  });
}

// ---- S4a: offline backoff distribution ----
async function S4a(): Promise<Outcome> {
  const obs: string[] = [];
  const samplesPerAttempt = 1000;
  let pass = true;
  for (let attempt = 0; attempt < 8; attempt++) {
    const target = Math.min(DEFAULT_BACKOFF.baseMs * Math.pow(DEFAULT_BACKOFF.multiplier, attempt), DEFAULT_BACKOFF.capMs);
    const lo = target * (1 - DEFAULT_BACKOFF.jitter);
    const hi = target * (1 + DEFAULT_BACKOFF.jitter);
    let minObs = Infinity;
    let maxObs = -Infinity;
    let sum = 0;
    for (let i = 0; i < samplesPerAttempt; i++) {
      const v = computeBackoff(attempt, DEFAULT_BACKOFF);
      if (v < minObs) minObs = v;
      if (v > maxObs) maxObs = v;
      sum += v;
    }
    const mean = sum / samplesPerAttempt;
    const inBounds = minObs >= lo - 1 && maxObs <= hi + 1;
    obs.push(
      `attempt=${attempt} target=${target}ms bounds=[${lo}..${hi}] observed=[${minObs.toFixed(0)}..${maxObs.toFixed(0)}] mean=${mean.toFixed(0)}`,
    );
    if (!inBounds) pass = false;
  }
  return {
    name: 'S4a',
    pass,
    note: pass
      ? 'backoff curve shape matches operator-acked numbers across 8 attempt levels'
      : 'observed samples fell outside jitter bounds',
    observations: obs,
  };
}

// ---- S4b: online backoff scheduling ----
async function S4b(): Promise<Outcome> {
  const obs: string[] = [];
  // Use scaled backoff for runtime; report scaling in note.
  const scaled = { baseMs: 200, multiplier: 2, capMs: 1_000, jitter: 0.25 };
  const fx = await startFixture({});
  const base = `http://127.0.0.1:${fx.port}`;
  const ws = `ws://127.0.0.1:${fx.port}/v2/events/stream`;
  const received: EventShape[] = [];
  const statuses: ClientStatus[] = [];
  const client = makeClient(base, ws, 'test-token', received, statuses, scaled);
  await client.connect();
  await waitFor(() => client.getStatus() === 'connected', 2_000);
  // Kill fixture entirely.
  await fx.stop();
  // Observe backoff behavior for a fixed window.
  await sleep(3_500);
  client.disconnect();
  // Expected: attempts at base * 2^n, capped at 1000ms, each ±25%.
  const expectedTargets = [200, 400, 800, 1000, 1000, 1000];
  // Filter: real backoff schedule entries have delayMs > 0. The
  // 'ws_opened' observability entry has delayMs=0 and is not a backoff.
  const seen = client.attemptLog.filter((r) => r.delayMs > 0);
  obs.push(`observed ${seen.length} backoff attempts:`);
  let pass = seen.length >= 4;
  for (let i = 0; i < Math.min(seen.length, expectedTargets.length); i++) {
    const target = expectedTargets[i];
    const lo = target * 0.75;
    const hi = target * 1.25;
    const got = seen[i].delayMs;
    const ok = got >= lo - 1 && got <= hi + 1;
    obs.push(`  attempt=${i} target=${target}ms bounds=[${lo}..${hi}] got=${got.toFixed(0)}ms ${ok ? 'OK' : 'OUT'}`);
    if (!ok) pass = false;
  }
  obs.push(
    `scaling note: spike used base=200/cap=1000 for runtime; production 1000/30000 has identical shape`,
  );
  return {
    name: 'S4b',
    pass,
    note: pass
      ? 'online scheduler observed delays match compute() within jitter'
      : 'scheduler delays diverged from compute()',
    observations: obs,
  };
}

// ---- S5: dedupe under worst-case replay ----
async function S5(): Promise<Outcome> {
  const obs: string[] = [];
  return withFixture({ replayAllOnConnect: true }, async (fx) => {
    const base = `http://127.0.0.1:${fx.port}`;
    const ws = `ws://127.0.0.1:${fx.port}/v2/events/stream`;
    const received: EventShape[] = [];
    const statuses: ClientStatus[] = [];
    const client = makeClient(base, ws, 'test-token', received, statuses);
    await client.connect();
    fx.emit(makeEvent(1));
    fx.emit(makeEvent(2));
    await waitFor(() => received.length === 2, 2_000);
    obs.push(`initial: received=${received.length}`);
    fx.closeAllWs();
    await waitFor(() => client.getStatus() !== 'connected', 2_000);
    const reconnected = await waitFor(() => client.getStatus() === 'connected', 4_000);
    // Fixture with replayAllOnConnect=true sends e1, e2 again via WS on
    // reconnect AND the gap-fill fetch also returns them (since=<pre-e1>,
    // or since=<e2> returns nothing). Dedupe must catch both paths.
    await sleep(200);
    obs.push(
      `after reconnect+replay: received=${received.length} reconnected=${reconnected}`,
    );
    client.disconnect();
    const uniqueTimestamps = new Set(received.map((e) => e.timestamp)).size;
    const pass = received.length === 2 && uniqueTimestamps === 2;
    return {
      name: 'S5',
      pass,
      note: pass
        ? 'dedupe caught both since= and replayAllOnConnect redeliveries'
        : `expected 2 unique, got ${received.length} (${uniqueTimestamps} unique)`,
      observations: obs,
    };
  });
}

// ---- S6a: daemon down ----
async function S6a(): Promise<Outcome> {
  const obs: string[] = [];
  // Don't start fixture. Use a reserved port.
  const deadPort = 1; // connect will fail fast
  const base = `http://127.0.0.1:${deadPort}`;
  const ws = `ws://127.0.0.1:${deadPort}/v2/events/stream`;
  const received: EventShape[] = [];
  const statuses: ClientStatus[] = [];
  const client = makeClient(base, ws, 'test-token', received, statuses);
  await client.connect();
  const reachedDaemonDown = await waitFor(
    () => client.getStatus() === 'daemon_down',
    3_000,
  );
  obs.push(
    `status=${client.getStatus()} attempts=${client.attemptLog.length} statuses=${statuses.join(',')}`,
  );
  client.disconnect();
  const pass = reachedDaemonDown && client.attemptLog.some((a) => a.outcome === 'health_fail');
  return {
    name: 'S6a',
    pass,
    note: pass
      ? 'preflight-step-1 failure surfaced as daemon_down, no WS opened'
      : 'did not reach daemon_down state',
    observations: obs,
  };
}

// ---- S6b: token invalid ----
async function S6b(): Promise<Outcome> {
  const obs: string[] = [];
  return withFixture({ initialToken: 'correct' }, async (fx) => {
    const base = `http://127.0.0.1:${fx.port}`;
    const ws = `ws://127.0.0.1:${fx.port}/v2/events/stream`;
    const received: EventShape[] = [];
    const statuses: ClientStatus[] = [];
    const client = makeClient(base, ws, 'wrong-token', received, statuses);
    await client.connect();
    const reachedAuthFail = await waitFor(
      () => client.getStatus() === 'auth_failed',
      3_000,
    );
    obs.push(
      `status=${client.getStatus()} attempts=${client.attemptLog.length} statuses=${statuses.join(',')}`,
    );
    // Important: verify no further attempts queued.
    const attemptsAtFreeze = client.attemptLog.length;
    await sleep(1_500);
    obs.push(
      `after 1.5s wait: attempts=${client.attemptLog.length} (expect unchanged at ${attemptsAtFreeze})`,
    );
    client.disconnect();
    const pass =
      reachedAuthFail &&
      client.attemptLog.length === attemptsAtFreeze &&
      received.length === 0 &&
      !client.attemptLog.some((a) => a.outcome === 'ws_opened');
    return {
      name: 'S6b',
      pass,
      note: pass
        ? 'preflight-step-2 401 stopped retries; no WS opened'
        : 'auth_failed state did not halt retry loop',
      observations: obs,
    };
  });
}

// ---- S6c: both preflight pass, WS opens cleanly ----
async function S6c(): Promise<Outcome> {
  const obs: string[] = [];
  return withFixture({ initialToken: 'happy-path' }, async (fx) => {
    const base = `http://127.0.0.1:${fx.port}`;
    const ws = `ws://127.0.0.1:${fx.port}/v2/events/stream`;
    const received: EventShape[] = [];
    const statuses: ClientStatus[] = [];
    const client = makeClient(base, ws, 'happy-path', received, statuses);
    await client.connect();
    const connected = await waitFor(() => client.getStatus() === 'connected', 2_000);
    obs.push(`status=${client.getStatus()} connected=${connected}`);
    fx.emit(makeEvent(42));
    const got = await waitFor(() => received.length === 1, 2_000);
    client.disconnect();
    return {
      name: 'S6c',
      pass: connected && got,
      note: connected && got ? 'preflight passed, WS opened, event delivered' : 'happy path broken',
      observations: obs,
    };
  });
}

async function main() {
  log('spike runner start');
  const runners = [S1, S2, S3prime, S4a, S4b, S5, S6a, S6b, S6c];
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
  // Write scenarios.md
  const lines: string[] = [];
  lines.push('# UI-S01 scenario log', '');
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
