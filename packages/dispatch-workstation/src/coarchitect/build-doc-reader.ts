import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface BuildDocReadResult {
  content: string;
  sha: string;
  repoRoot: string;
  relativePath: string;
}

export class BuildDocReadError extends Error {
  readonly repoRoot: string;
  readonly relativePath: string;
  readonly reason: string;

  constructor(repoRoot: string, relativePath: string, reason: string) {
    super(`BuildDocReadError at ${repoRoot}/${relativePath}: ${reason}`);
    this.name = 'BuildDocReadError';
    this.repoRoot = repoRoot;
    this.relativePath = relativePath;
    this.reason = reason;
  }
}

/**
 * Read a build doc at HEAD of the given repo.
 * Per ratified P-0.5-Q8.1.c: Workstation-local git reads; daemon never sees build doc.
 */
export async function readBuildDoc(
  repoRoot: string,
  relativePath: string,
): Promise<BuildDocReadResult> {
  let sha: string;
  try {
    sha = execSync('git rev-parse HEAD', {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    throw new BuildDocReadError(repoRoot, relativePath, 'repo_root is not a valid git repository');
  }

  const fullPath = join(repoRoot, relativePath);
  if (!existsSync(fullPath)) {
    throw new BuildDocReadError(repoRoot, relativePath, `file not found: ${relativePath}`);
  }

  let content: string;
  try {
    content = readFileSync(fullPath, 'utf8');
  } catch (err) {
    throw new BuildDocReadError(repoRoot, relativePath, `failed to read file: ${String(err)}`);
  }

  return { content, sha, repoRoot, relativePath };
}
