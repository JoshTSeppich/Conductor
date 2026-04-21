import { HANDOFF_FOOTER } from './footer.js';

/**
 * Ensure the prompt ends with the frozen hand-off footer.
 *
 * If the body already contains HANDOFF_FOOTER as a literal substring, the
 * body is returned unchanged (no duplication). Otherwise the footer is
 * appended with a blank-line separator: `<body>\n\n<HANDOFF_FOOTER>`.
 * HANDOFF_FOOTER itself begins with `---\n`, so the visible boundary is
 * the `\n\n---\n` sequence the red tests assert.
 */
export function assemble(promptBody: string): string {
  if (promptBody.includes(HANDOFF_FOOTER)) {
    return promptBody;
  }
  return `${promptBody}\n\n${HANDOFF_FOOTER}`;
}
