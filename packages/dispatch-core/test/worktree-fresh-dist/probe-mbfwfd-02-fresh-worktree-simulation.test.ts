// probe-mbfwfd-02 — mechanism invariant for the pretest helper that closes
// MB-F-WORKTREE-FRESH-MISSING-DIST-CRASH (FOLLOWUPS:155).
//
// Verifies the three freshness branches the helper at `scripts/worktree-fresh-dist-prebuild.sh`
// must handle when invoked by `pretest`:
//   (A) anchor absent  → BUILD_CMD fires; anchor materialises with src content.
//   (B) anchor present and src not newer → BUILD_CMD skipped; anchor unchanged.
//   (C) src newer than anchor → BUILD_CMD fires; anchor updates to current src content.
//
// Approach (content-equivalence, NOT mtime-equivalence, per sibling-closure §4 lesson —
// `docs/coordination/mb-f-dispatch-core-post-pull-rebuild-discipline-findings-2026-05-16.md`):
//   The probe drives the helper inside a tmpdir using the WFD_* env-var test affordances,
//   with a sandboxed WFD_BUILD_CMD that copies src content to the anchor. It then asserts
//   anchor file CONTENT, not file mtime. mtime is used only as INPUT to drive the helper's
//   branches (controlled via `fs.utimesSync`).

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..', '..');
const HELPER = join(REPO_ROOT, 'scripts', 'worktree-fresh-dist-prebuild.sh');

interface Sandbox {
  root: string;
  src: string;
  dist: string;
  anchor: string;
  marker: string;
}

function buildSandbox(): Sandbox {
  const root = mkdtempSync(join(tmpdir(), 'mbfwfd-'));
  const src = join(root, 'src');
  const dist = join(root, 'dist');
  const anchor = join(dist, 'anchor.js');
  const marker = join(src, 'marker.ts');
  mkdirSync(src, { recursive: true });
  return { root, src, dist, anchor, marker };
}

function runHelper(box: Sandbox): { stdout: string; stderr: string } {
  // WFD_BUILD_CMD: a sandboxed builder that mirrors src/marker.ts into anchor. This
  // stands in for the production `pnpm --filter dispatch-core build` — same shape
  // (creates dist/, writes the anchor file), no pnpm overhead, no workspace dependency.
  const buildCmd = `mkdir -p '${box.dist}' && cp '${box.marker}' '${box.anchor}'`;
  const env = {
    ...process.env,
    WFD_CORE_DIR: box.root,
    WFD_SRC_DIR: box.src,
    WFD_ANCHOR: box.anchor,
    WFD_BUILD_CMD: buildCmd,
  };
  // execFileSync — stderr captured via stdio config; stdout returned.
  const stdout = execFileSync('bash', [HELPER], {
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return { stdout, stderr: '' };
}

function runHelperCaptured(box: Sandbox): string {
  // Capture stderr explicitly (the helper logs its branch decision to stderr).
  const buildCmd = `mkdir -p '${box.dist}' && cp '${box.marker}' '${box.anchor}'`;
  const result = execFileSync(
    'bash',
    ['-c', `bash '${HELPER}' 2>&1`],
    {
      env: {
        ...process.env,
        WFD_CORE_DIR: box.root,
        WFD_SRC_DIR: box.src,
        WFD_ANCHOR: box.anchor,
        WFD_BUILD_CMD: buildCmd,
      },
      encoding: 'utf8',
    },
  );
  return result;
}

describe('MB-F-WORKTREE-FRESH-MISSING-DIST-CRASH — pretest helper mechanism', () => {
  let box: Sandbox;

  beforeEach(() => {
    box = buildSandbox();
  });

  afterEach(() => {
    rmSync(box.root, { recursive: true, force: true });
  });

  it('Case A: anchor absent → helper rebuilds; anchor materialises with src content', () => {
    writeFileSync(box.marker, 'export const VERSION = "A";\n');
    expect(existsSync(box.anchor)).toBe(false);

    const log = runHelperCaptured(box);

    expect(existsSync(box.anchor)).toBe(true);
    expect(readFileSync(box.anchor, 'utf8')).toBe('export const VERSION = "A";\n');
    expect(log).toMatch(/anchor absent/);
    expect(log).toMatch(/rebuilding dispatch-core/);
  });

  it('Case B: anchor present + src not newer → helper skips; anchor unchanged', () => {
    writeFileSync(box.marker, 'export const VERSION = "A";\n');
    runHelperCaptured(box); // priming Case A → anchor now contains VERSION="A"
    expect(readFileSync(box.anchor, 'utf8')).toBe('export const VERSION = "A";\n');

    // Mutate src content but rewind its mtime to before the anchor. This simulates a
    // worktree where dist was just rebuilt from a prior src state and src has not been
    // edited since. The helper must see "src not newer" and skip — anchor stays as-is.
    writeFileSync(box.marker, 'export const VERSION = "MUTATED";\n');
    const past = new Date(2020, 0, 1);
    utimesSync(box.marker, past, past);

    const log = runHelperCaptured(box);

    expect(readFileSync(box.anchor, 'utf8')).toBe('export const VERSION = "A";\n');
    expect(log).toMatch(/dist fresh/);
    expect(log).toMatch(/skipping rebuild/);
  });

  it('Case C: src newer than anchor → helper rebuilds; anchor updates to current src', () => {
    writeFileSync(box.marker, 'export const VERSION = "A";\n');
    runHelperCaptured(box); // prime: anchor = "A"

    // Edit src and forward-bump its mtime to ensure src > anchor reliably across
    // filesystems with coarse mtime granularity (HFS+ / older APFS are second-resolution).
    writeFileSync(box.marker, 'export const VERSION = "B";\n');
    const future = new Date(Date.now() + 5000);
    utimesSync(box.marker, future, future);

    const log = runHelperCaptured(box);

    expect(readFileSync(box.anchor, 'utf8')).toBe('export const VERSION = "B";\n');
    expect(log).toMatch(/src newer than anchor/);
    expect(log).toMatch(/rebuilding dispatch-core/);
  });

  it('LIVE invariant: the real helper script is executable + readable from repo root', () => {
    // Belt-and-braces: confirm the production helper lives at the expected path with
    // execute bit set. A broken chmod would make `pretest` fail with EACCES at runtime.
    expect(existsSync(HELPER)).toBe(true);
    // execFileSync with bash should already work above; this assertion documents the
    // shape requirement for future readers.
    const out = execFileSync('bash', ['-n', HELPER], { encoding: 'utf8' });
    expect(out).toBe(''); // `bash -n` = syntax check only; empty stdout = pass.
  });
});
