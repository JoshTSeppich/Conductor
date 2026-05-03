// MB-T08 Cluster 1 GREEN — first-launch detection.
//
// Vision §8.1 (RATIFIED) requires a first-launch onboarding flow. This module
// detects whether the operator has completed onboarding by reading a JSON
// config file from the Electron userData directory.
//
// Test isolation pattern mirrors window-lifecycle.ts:26: production callers
// pass app.getPath('userData') as configDir; tests pass a fresh tmpdir. No
// Electron import in this module so unit tests don't bring up Electron.
//
// Persistence shape: a single JSON object at <configDir>/workstation-config.json
// with an `onboardingCompleted: boolean` key. Coexists with future config
// keys per WORKSTATION_CONTRACT.md §8.3 (electron-store equivalent).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CONFIG_FILENAME = 'workstation-config.json';

export interface FirstLaunchOpts {
  /** Directory containing workstation-config.json. Production: app.getPath('userData'). */
  configDir: string;
}

interface WorkstationConfig {
  onboardingCompleted?: boolean;
}

function readConfig(configDir: string): WorkstationConfig | null {
  const path = join(configDir, CONFIG_FILENAME);
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') {
      return parsed as WorkstationConfig;
    }
  } catch {
    // Malformed JSON — treat as never-onboarded so the operator gets a
    // recoverable onboarding prompt rather than a crash.
  }
  return null;
}

/**
 * True if the operator has not yet completed onboarding (config missing,
 * malformed, or onboardingCompleted !== true).
 */
export function isFirstLaunch(opts: FirstLaunchOpts): boolean {
  const cfg = readConfig(opts.configDir);
  return cfg?.onboardingCompleted !== true;
}

/**
 * Persist onboardingCompleted=true. Creates configDir if missing. Idempotent.
 */
export function markOnboardingComplete(opts: FirstLaunchOpts): void {
  mkdirSync(opts.configDir, { recursive: true });
  const path = join(opts.configDir, CONFIG_FILENAME);
  const existing = readConfig(opts.configDir) ?? {};
  const next: WorkstationConfig = { ...existing, onboardingCompleted: true };
  writeFileSync(path, JSON.stringify(next), 'utf8');
}
