import { execFile } from 'node:child_process';

/**
 * Send `content` to the macOS system clipboard via `pbcopy`. No shell,
 * no interpolation — execFile with arg array. Stdin carries the payload
 * so content with newlines / shell metachars is safe.
 *
 * Rejects if pbcopy is missing or exits non-zero. The caller surfaces
 * the error to the operator.
 */
export async function copyToClipboard(content: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = execFile('pbcopy', [], (err) => {
      if (err) reject(err);
      else resolve();
    });
    child.stdin!.end(content);
  });
}
