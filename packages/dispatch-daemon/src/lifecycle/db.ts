/**
 * SQLite layer for v3 orchestrator persistence.
 *
 * Per WORKSTATION_CONTRACT.md §8.1 (amended at 7fd48e4): chat history,
 * audit log, and ticket state persist in a daemon-owned SQLite database
 * at `~/.foxworks-dispatch/data.db`. The database does not exist as of
 * v2.0.1; v3.0 introduces it as part of the daemon's persistence layer.
 *
 * Driver: better-sqlite3 (synchronous Node SQLite). The daemon opens
 * the database with WAL journal mode at startup and closes on shutdown
 * via lifecycle/shutdown.ts hooks.
 *
 * Migrations are additive only per §8.1: each `migrations/<NNNN>-*.sql`
 * file uses `CREATE TABLE IF NOT EXISTS` so re-running on an existing
 * database is a no-op. Migration files are applied in alphabetical
 * order by filename; the numeric prefix (`0001-`, `0002-`, ...)
 * provides deterministic ordering as new migrations are added.
 *
 * Coexistence with sessions.json (§8.1): the daemon retains JSON-file
 * persistence for the v2 session registry. The two persistence layers
 * are independent; no synchronization is required.
 */

import Database from 'better-sqlite3';
import { readdirSync, readFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Default migrations directory: `packages/dispatch-daemon/migrations/`.
 * Resolution traverses `..` twice from `src/lifecycle/db.ts` (or
 * `dist/lifecycle/db.js` after build) to land at the package root.
 */
function defaultMigrationsDir(): string {
  return resolve(__dirname, '../../migrations');
}

/**
 * Default production database path: `~/.foxworks-dispatch/data.db`.
 * Tests override via SpawnTestServerOpts.dbPath to land on a mkdtemp-
 * isolated tempdir per the existing tokenPath / registryPath / archiveRoot
 * defense-in-depth pattern.
 */
export function defaultDataDbPath(): string {
  return join(homedir(), '.foxworks-dispatch', 'data.db');
}

/**
 * Open a SQLite database at `path`, ensuring the parent directory exists.
 * WAL journal mode enables concurrent reads during writes; on `:memory:`
 * the pragma is silently ignored (database reports `journal_mode=memory`)
 * which is fine for tests.
 */
export function openDatabase(path: string): Database.Database {
  // mkdir -p parent dir for file-backed databases. Skipped for `:memory:`
  // (which has no filesystem footprint). The check is path-based rather
  // than introspecting better-sqlite3 internals.
  if (path !== ':memory:' && !path.startsWith(':')) {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  return db;
}

export interface RunMigrationsOpts {
  /**
   * Directory containing `*.sql` migration files. Defaults to the
   * package's `migrations/` directory. Tests may override to point at
   * a fixture dir.
   */
  migrationsDir?: string;
}

export interface MigrationRunResult {
  /** Filenames applied in alphabetical order. */
  applied: string[];
}

/**
 * Apply all `*.sql` migrations in `migrationsDir` to `db` in alphabetical
 * order by filename. Migrations use `CREATE TABLE IF NOT EXISTS` so
 * re-running on an existing database is a no-op (additive-only model
 * per §8.1).
 */
export function runMigrations(
  db: Database.Database,
  opts: RunMigrationsOpts = {},
): MigrationRunResult {
  const dir = opts.migrationsDir ?? defaultMigrationsDir();
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const applied: string[] = [];
  for (const f of files) {
    const sql = readFileSync(join(dir, f), 'utf8');
    db.exec(sql);
    applied.push(f);
  }
  return { applied };
}
