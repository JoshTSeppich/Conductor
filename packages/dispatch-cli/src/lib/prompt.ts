/**
 * Confirmation prompt helpers per CLI-T03.
 *
 * parseConfirmAnswer is the pure helper unit-tested at P2:
 * Y/y/yes/YES/Yes (case-insensitive after trim) → true;
 * everything else → false. Default-N semantic per X2 line
 * 334 verbatim ("prompts for confirmation (Y/N)").
 *
 * confirmAction is a thin OS-boundary wrapper around
 * readline/promises — smoke-tested by operator at command
 * invocation time per finding #36 framework. TTY check
 * mirrors the existing fd.ts:18-32 pattern from v1 init's
 * prompt() helper; throws on non-TTY stdin so automated
 * pipelines don't accidentally trigger destructive
 * confirmations without --yes.
 */

import { createInterface } from 'node:readline/promises';

export function parseConfirmAnswer(answer: string): boolean {
  return /^y(es)?$/i.test(answer.trim());
}

/** OS boundary: smoke-tested at T06 (finding #36). */
export async function confirmAction(question: string): Promise<boolean> {
  if (!process.stdin.isTTY) {
    throw new Error(
      `cannot prompt for confirmation; stdin is not a TTY. ` +
        `Pass --yes to bypass the prompt for: "${question}"`,
    );
  }
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const answer = await rl.question(`${question} `);
    return parseConfirmAnswer(answer);
  } finally {
    rl.close();
  }
}
