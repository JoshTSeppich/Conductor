import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const STATE_FILENAME = 'build-doc-config.json';

export interface BuildDocConfig {
  repoRoot: string;
  relativePath: string;
  allowedScopes: string[];
}

/**
 * State directory: MB_BUILD_DOC_STATE_DIR env var overrides for test isolation,
 * otherwise uses app.getPath('userData') (set at runtime by Electron).
 * Follows the same pattern as splitter-state.ts.
 */
function stateDir(): string {
  return (
    process.env['MB_BUILD_DOC_STATE_DIR'] ??
    process.env['MB_WORKSTATION_USERDATA'] ??
    // Electron sets this env before main.ts loads when running in test context
    (typeof process !== 'undefined' ? process.env['MB_APP_USERDATA'] ?? '' : '')
  );
}

function statePath(): string {
  const dir = stateDir();
  if (!dir) throw new Error('Build-doc state dir not configured');
  return join(dir, STATE_FILENAME);
}

export function readBuildDocConfig(): BuildDocConfig | null {
  try {
    const path = statePath();
    if (!existsSync(path)) return null;
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'repoRoot' in parsed &&
      'relativePath' in parsed &&
      'allowedScopes' in parsed
    ) {
      return parsed as BuildDocConfig;
    }
  } catch {
    // Non-fatal: missing file or parse error
  }
  return null;
}

export function writeBuildDocConfig(config: BuildDocConfig): void {
  try {
    const dir = stateDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, STATE_FILENAME), JSON.stringify(config, null, 2), 'utf8');
  } catch {
    // Non-fatal: best-effort persistence
  }
}

export function clearBuildDocConfig(): void {
  try {
    const path = statePath();
    if (existsSync(path)) unlinkSync(path);
  } catch {
    // Non-fatal
  }
}
