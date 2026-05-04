import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';

const STATE_FILENAME = 'build-doc-config.json';

export interface BuildDocConfig {
  repoRoot: string;
  relativePath: string;
  allowedScopes: string[];
}

/**
 * State directory resolution order:
 *   1. MB_BUILD_DOC_STATE_DIR        (per-test isolation; spec-suite default)
 *   2. MB_WORKSTATION_USERDATA       (legacy override; preserved for parity)
 *   3. MB_APP_USERDATA               (legacy override; preserved for parity)
 *   4. Electron app.getPath('userData')   (production fallback)
 *
 * Cairn finding #84 Defect B: production set none of the three env vars, so
 * stateDir() returned '' and writeBuildDocConfig silently no-op'd. The fourth
 * fallback (added 2026-05-04) makes the production path resolvable while
 * preserving env-var precedence for test isolation.
 */
function stateDir(): string {
  return (
    process.env['MB_BUILD_DOC_STATE_DIR'] ??
    process.env['MB_WORKSTATION_USERDATA'] ??
    process.env['MB_APP_USERDATA'] ??
    app.getPath('userData')
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
