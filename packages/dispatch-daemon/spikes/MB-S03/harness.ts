/**
 * MB-S03 spike harness — daemon v3 amendment validation.
 *
 * Pending operator-arbitrated commit; not production code.
 *
 * Probes (run in sequence; exit 0 on all-pass, 1 on any failure):
 *
 *   P1  better-sqlite3 :memory: opens with WAL pragma per §8.1 init plan
 *   P2  migration.sql executes cleanly on fresh :memory: instance
 *   P3  re-running migration.sql on the same instance is a no-op (idempotent
 *       per §8.1 "CREATE TABLE IF NOT EXISTS" model)
 *   P4  orchestrator_ticket_state UNIQUE (ticket_id, build_doc_id) enforced;
 *       INSERT OR REPLACE upsert produces exactly one row per pair
 *       (acked decision: upsert via INSERT OR REPLACE)
 *   P5  100-row audit-log write/read latency benchmark; report p50 + p95
 *       and validate against §8.3 dashboard-refresh < 500ms ratified bar
 *   P6  Fastify routing — /v3/* coexists with /v2/* without conflict
 *       (separate prefixes; auth hook + 404 handler need amendment per the
 *       ADR's flagged conflicts)
 *   P7  Auth-hook conflict check: current daemon auth.ts (lifecycle/auth.ts)
 *       bypasses non-/v2/* paths via Z-3 static-serve carveout. Demonstrates
 *       /v3/* would currently bypass auth — surfaces required COARCH-T01 fix.
 *   P8  404-handler conflict check: current daemon error-handler.ts SPA
 *       fall-through fires for non-/v2/* GETs. Demonstrates unmatched /v3/*
 *       would serve index.html instead of JSON 404 — surfaces required
 *       COARCH-T01 fix.
 *
 * Authority chain (cited so each ADR claim is grounded):
 *   - WORKSTATION_CONTRACT.md (frozen at ade584b, amended at 7fd48e4 §8.1)
 *   - CONDUCTOR_API_CONTRACT.md §4 + §5 + §10 (frozen at 3ddca60)
 *   - vision.md §7.8, §8.3 (frozen at 9d751f8)
 *   - operator-acked decisions in MB-S03 spike prompt
 *
 * Run: cd packages/dispatch-daemon && pnpm tsx spikes/MB-S03/harness.ts
 */

import Database from 'better-sqlite3';
import Fastify from 'fastify';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_SQL_PATH = resolve(__dirname, 'migration.sql');

interface ProbeResult {
  name: string;
  pass: boolean;
  detail: string;
}

const results: ProbeResult[] = [];

function record(name: string, pass: boolean, detail: string): void {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}: ${detail}`);
}

// ───────────────────────────────────────────────────────────────────
// P1 — open :memory: + WAL pragma
// ───────────────────────────────────────────────────────────────────
function p1OpenWithWAL(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  // :memory: databases ignore WAL pragma (returns 'memory'), but the
  // pragma call itself must succeed — production daemon will hit
  // file-backed data.db where WAL is honored.
  const mode = db.pragma('journal_mode', { simple: true });
  record(
    'P1 open :memory: + WAL pragma',
    typeof mode === 'string',
    `journal_mode reports "${String(mode)}" (in-memory ignores WAL; file-backed honors it)`,
  );
  return db;
}

// ───────────────────────────────────────────────────────────────────
// P2 — execute migration.sql cleanly
// ───────────────────────────────────────────────────────────────────
function p2RunMigration(db: Database.Database): void {
  const sql = readFileSync(MIGRATION_SQL_PATH, 'utf8');
  try {
    db.exec(sql);
    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`,
      )
      .all() as { name: string }[];
    const expected = [
      'orchestrator_audit',
      'orchestrator_messages',
      'orchestrator_ticket_state',
    ];
    const found = tables.map((t) => t.name).filter((n) => !n.startsWith('sqlite_'));
    const ok = expected.every((e) => found.includes(e));
    record(
      'P2 migration.sql creates 3 tables',
      ok,
      `found: [${found.join(', ')}]`,
    );
  } catch (err) {
    record('P2 migration.sql creates 3 tables', false, (err as Error).message);
  }
}

// ───────────────────────────────────────────────────────────────────
// P3 — re-run is idempotent (CREATE TABLE IF NOT EXISTS per §8.1)
// ───────────────────────────────────────────────────────────────────
function p3MigrationIdempotent(db: Database.Database): void {
  const sql = readFileSync(MIGRATION_SQL_PATH, 'utf8');
  try {
    db.exec(sql);
    record('P3 migration.sql idempotent re-run', true, 'no error on re-execute');
  } catch (err) {
    record('P3 migration.sql idempotent re-run', false, (err as Error).message);
  }
}

// ───────────────────────────────────────────────────────────────────
// P4 — UNIQUE (ticket_id, build_doc_id) + upsert via INSERT OR REPLACE
// ───────────────────────────────────────────────────────────────────
function p4TicketStateUpsert(db: Database.Database): void {
  // Verify acked decision: one row per (ticket_id, build_doc_id) via upsert.
  const upsert = db.prepare(
    `INSERT OR REPLACE INTO orchestrator_ticket_state
       (ticket_id, build_doc_id, state, state_updated_at, superseded_by_ticket_id)
     VALUES (?, ?, ?, ?, ?)`,
  );

  upsert.run('MB-T05', 'v3-tickets-2026-04-28', 'pending', '2026-04-29T10:00:00Z', null);
  upsert.run('MB-T05', 'v3-tickets-2026-04-28', 'in-progress', '2026-04-29T10:05:00Z', null);
  upsert.run('MB-T05', 'v3-tickets-2026-04-28', 'complete', '2026-04-29T10:30:00Z', null);
  // Different build_doc_id — should NOT collapse with the above.
  upsert.run('MB-T05', 'v3-tickets-2026-05-01', 'pending', '2026-05-01T08:00:00Z', null);

  const rows = db
    .prepare(
      `SELECT ticket_id, build_doc_id, state FROM orchestrator_ticket_state
       ORDER BY build_doc_id`,
    )
    .all() as { ticket_id: string; build_doc_id: string; state: string }[];

  const okCount = rows.length === 2;
  const okFirstState = rows[0]?.state === 'complete';
  const okSecondBuild = rows[1]?.build_doc_id === 'v3-tickets-2026-05-01';
  const ok = okCount && okFirstState && okSecondBuild;
  record(
    'P4 ticket_state upsert (one row per ticket_id+build_doc_id)',
    ok,
    `rows=${rows.length}, first.state="${rows[0]?.state}", second.build_doc="${rows[1]?.build_doc_id}"`,
  );
}

// ───────────────────────────────────────────────────────────────────
// P5 — 100-row audit-log latency benchmark vs §8.3 < 500ms bar
// ───────────────────────────────────────────────────────────────────
function p5AuditLatency(db: Database.Database): void {
  // Per §8.3 dashboard-refresh hard ship gate: < 500ms p50.
  // Target: 100 audit-row write+read p50/p95 well under bar.
  const insert = db.prepare(
    `INSERT INTO orchestrator_audit
      (id, timestamp, trigger_event, build_doc_id, build_doc_commit_sha,
       output_type, output_payload, operator_response, final_fired_payload,
       execution_outcome, free_form_text, staleness_status, superseded_card_ids)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const writeNanos: bigint[] = [];
  const readNanos: bigint[] = [];
  const buildDocId = 'v3-tickets-2026-04-28';

  for (let i = 0; i < 100; i += 1) {
    const id = `01900000-0000-7000-8000-${i.toString(16).padStart(12, '0')}`;
    const payload = JSON.stringify({
      type: 'card',
      action: 'send',
      target: `clit-${i}`,
      payload: 'Run the red commit for MB-T05.',
    });
    const wStart = process.hrtime.bigint();
    insert.run(
      id,
      `2026-04-29T10:${(i % 60).toString().padStart(2, '0')}:00Z`,
      'cc-session-output',
      buildDocId,
      'abc123def456',
      'card',
      payload,
      'pending',
      null,
      'n/a',
      null,
      'current',
      null,
    );
    writeNanos.push(process.hrtime.bigint() - wStart);
  }

  const readStmt = db.prepare(
    `SELECT id, timestamp, output_type, output_payload, operator_response
     FROM orchestrator_audit
     WHERE build_doc_id = ?
     ORDER BY timestamp DESC
     LIMIT 100`,
  );
  for (let i = 0; i < 100; i += 1) {
    const rStart = process.hrtime.bigint();
    const rows = readStmt.all(buildDocId);
    if (rows.length !== 100) {
      record(
        'P5 100-row audit latency',
        false,
        `unexpected row count ${rows.length}`,
      );
      return;
    }
    readNanos.push(process.hrtime.bigint() - rStart);
  }

  const writeMs = writeNanos.map((n) => Number(n) / 1e6).sort((a, b) => a - b);
  const readMs = readNanos.map((n) => Number(n) / 1e6).sort((a, b) => a - b);
  const writeP50 = writeMs[Math.floor(writeMs.length * 0.5)];
  const writeP95 = writeMs[Math.floor(writeMs.length * 0.95)];
  const readP50 = readMs[Math.floor(readMs.length * 0.5)];
  const readP95 = readMs[Math.floor(readMs.length * 0.95)];

  // The §8.3 < 500ms bar is for end-to-end dashboard-refresh latency
  // (event emit → UI repaint), not for SQLite write alone. Validate
  // SQLite is well under the budget so it doesn't dominate the path.
  const ok = writeP95 < 500 && readP95 < 500;
  record(
    'P5 audit-log latency (100 rows)',
    ok,
    `write p50=${writeP50.toFixed(3)}ms p95=${writeP95.toFixed(3)}ms ; read p50=${readP50.toFixed(3)}ms p95=${readP95.toFixed(3)}ms ; bar=500ms`,
  );
}

// ───────────────────────────────────────────────────────────────────
// P6 — Fastify /v3/* + /v2/* coexistence (no path-prefix collision)
// ───────────────────────────────────────────────────────────────────
async function p6FastifyRouting(): Promise<void> {
  const app = Fastify({ logger: false });
  app.get('/v2/health', async () => ({ status: 'ok', version: 'spike' }));
  app.get('/v2/sessions', async () => ({ sessions: {} }));
  app.post('/v3/orchestrator/messages', async (req) => ({ id: 'msg-1', echo: req.body }));
  app.get('/v3/orchestrator/history', async (req) => ({
    messages: [],
    next_before_id: null,
    query: req.query,
  }));
  app.delete('/v3/orchestrator/history', async () => ({ deleted: 0 }));
  app.post('/v3/orchestrator/audit', async () => ({ id: 'audit-1' }));
  app.get('/v3/orchestrator/audit', async () => ({ rows: [] }));
  app.post('/v3/tickets/state', async (req) => ({ upserted: req.body }));
  app.get('/v3/tickets/state', async () => ({ rows: [] }));
  app.get('/v3/tickets/state/:ticket_id', async (req) => ({
    ticket_id: (req.params as { ticket_id: string }).ticket_id,
    query: req.query,
  }));

  await app.ready();

  // Probe each path in sequence (Fastify .inject avoids a real socket).
  const probes: { method: 'GET' | 'POST' | 'DELETE'; path: string; body?: unknown; expect: number }[] = [
    { method: 'GET', path: '/v2/health', expect: 200 },
    { method: 'GET', path: '/v2/sessions', expect: 200 },
    { method: 'POST', path: '/v3/orchestrator/messages', body: { role: 'user', content: 'hi' }, expect: 200 },
    { method: 'GET', path: '/v3/orchestrator/history?limit=10&build_doc_id=v3-tickets', expect: 200 },
    { method: 'DELETE', path: '/v3/orchestrator/history', expect: 200 },
    { method: 'POST', path: '/v3/orchestrator/audit', body: {}, expect: 200 },
    { method: 'GET', path: '/v3/orchestrator/audit', expect: 200 },
    { method: 'POST', path: '/v3/tickets/state', body: { ticket_id: 'MB-T05', build_doc_id: 'b1', state: 'pending' }, expect: 200 },
    { method: 'GET', path: '/v3/tickets/state?build_doc_id=b1', expect: 200 },
    { method: 'GET', path: '/v3/tickets/state/MB-T05?build_doc_id=b1', expect: 200 },
  ];

  let allPass = true;
  for (const p of probes) {
    const res = await app.inject({
      method: p.method,
      url: p.path,
      payload: p.body as object | undefined,
    });
    if (res.statusCode !== p.expect) {
      allPass = false;
      record(`P6 routing ${p.method} ${p.path}`, false, `got ${res.statusCode}, expected ${p.expect}`);
    }
  }
  if (allPass) {
    record(
      'P6 Fastify /v3/* + /v2/* coexist',
      true,
      `${probes.length} probes pass on isolated Fastify instance`,
    );
  }
  await app.close();
}

// ───────────────────────────────────────────────────────────────────
// P7 — auth-hook conflict (current bypass on non-/v2/* paths)
// ───────────────────────────────────────────────────────────────────
async function p7AuthHookConflict(): Promise<void> {
  // Replicate lifecycle/auth.ts createAuthHook behavior verbatim and
  // demonstrate the bypass for /v3/*. ADR cites this probe as the
  // "must-fix" item for COARCH-T01: the production hook needs to
  // gate /v3/* same as /v2/* (X-Conductor-Token header required).
  const TOKEN = 'spike-token';
  const app = Fastify({ logger: false });
  app.addHook('onRequest', async (request, reply) => {
    const pathOnly = request.url.split('?')[0];
    if (pathOnly === '/v2/health') return;
    if (!pathOnly.startsWith('/v2/')) return; // ← current bypass
    const header = request.headers['x-conductor-token'];
    if (header !== TOKEN) {
      reply.code(401).send({ error: 'Invalid or missing token' });
    }
  });
  app.get('/v2/sessions', async () => ({ sessions: {} }));
  app.get('/v3/orchestrator/history', async () => ({ messages: [] }));
  await app.ready();

  const noAuth_v2 = await app.inject({ method: 'GET', url: '/v2/sessions' });
  const noAuth_v3 = await app.inject({ method: 'GET', url: '/v3/orchestrator/history' });

  // Current behavior: /v2/* requires auth (401), /v3/* bypasses (200).
  // The probe FAILS-AS-EXPECTED to surface the conflict; we record
  // it as a finding rather than an exit-code fail.
  const conflictPresent = noAuth_v2.statusCode === 401 && noAuth_v3.statusCode === 200;
  record(
    'P7 auth-hook conflict (current daemon would bypass /v3/*)',
    conflictPresent,
    `verified: /v2/sessions→${noAuth_v2.statusCode} (auth-required) vs /v3/orchestrator/history→${noAuth_v3.statusCode} (BYPASSED). COARCH-T01 must extend the gate to /v3/*.`,
  );
  await app.close();
}

// ───────────────────────────────────────────────────────────────────
// P8 — 404-handler conflict (current SPA fall-through on non-/v2/*)
// ───────────────────────────────────────────────────────────────────
async function p8NotFoundHandlerConflict(): Promise<void> {
  // Replicate lifecycle/error-handler.ts SPA fall-through path-check.
  // Current handler: `!pathOnly.startsWith('/v2/')` triggers SPA fall-through.
  // /v3/* unmatched would currently serve index.html instead of JSON 404.
  // ADR cites this probe to justify extending the path-check.
  const app = Fastify({ logger: false });
  let notFoundShape: 'spa-fallthrough' | 'json' | 'unknown' = 'unknown';
  app.setNotFoundHandler((request, reply) => {
    const pathOnly = request.url.split('?')[0];
    // Mock SPA fall-through condition. Real handler calls reply.sendFile
    // when staticRoot is set; harness records the branch chosen.
    const staticRoot = '/mock/dist';
    if (staticRoot && request.method === 'GET' && !pathOnly.startsWith('/v2/')) {
      notFoundShape = 'spa-fallthrough';
      reply.code(200).send('<html>SPA</html>');
      return;
    }
    notFoundShape = 'json';
    reply.code(404).send({ error: 'Not found' });
  });
  await app.ready();

  // Probe an unknown /v3/* path (no handler registered).
  const r = await app.inject({ method: 'GET', url: '/v3/unmapped/path' });
  const conflictPresent = notFoundShape === 'spa-fallthrough' && r.statusCode === 200;
  record(
    'P8 404-handler conflict (current daemon would SPA-fall-through /v3/*)',
    conflictPresent,
    `verified: /v3/unmapped→${r.statusCode} via "${notFoundShape}". COARCH-T01 must extend the path-check to also exclude /v3/*.`,
  );
  await app.close();
}

// ───────────────────────────────────────────────────────────────────
// Runner
// ───────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const db = p1OpenWithWAL();
  p2RunMigration(db);
  p3MigrationIdempotent(db);
  p4TicketStateUpsert(db);
  p5AuditLatency(db);
  db.close();

  await p6FastifyRouting();
  await p7AuthHookConflict();
  await p8NotFoundHandlerConflict();

  const failed = results.filter((r) => !r.pass);
  console.log('');
  console.log(`MB-S03 harness: ${results.length - failed.length}/${results.length} probes passed`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('harness crashed:', err);
  process.exit(1);
});
