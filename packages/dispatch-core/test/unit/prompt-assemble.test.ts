import { describe, it, expect } from 'vitest';
import { assemble } from '../../src/prompt/assemble.js';
import { HANDOFF_FOOTER } from '../../src/prompt/footer.js';

describe('assemble', () => {
  it('appends the footer with a \\n\\n separator when the prompt does not already contain it', () => {
    const body = 'Write unit tests for the helper.';
    const result = assemble(body);
    expect(result).toBe(`${body}\n\n${HANDOFF_FOOTER}`);
    // The resulting separator between body and the visible "---" line of the
    // footer is the promised \n\n---\n pattern.
    expect(result).toContain('\n\n---\n');
  });

  it('returns the prompt unchanged when the footer is already present', () => {
    const body = `Write unit tests.\n\n${HANDOFF_FOOTER}`;
    expect(assemble(body)).toBe(body);
  });

  it('detects the footer via exact-string match, not fuzzily', () => {
    // Near-miss: one word different.
    const nearMiss = HANDOFF_FOOTER.replace('HANDOFF.md', 'HANDOFF.markdown');
    expect(nearMiss).not.toBe(HANDOFF_FOOTER);
    const body = `Write unit tests.\n\n${nearMiss}`;
    const result = assemble(body);
    // Since nearMiss !== HANDOFF_FOOTER, the real footer must still be appended.
    expect(result).toBe(`${body}\n\n${HANDOFF_FOOTER}`);
  });

  it('appends the footer — never prepends it', () => {
    const body = 'Write unit tests.';
    const result = assemble(body);
    expect(result.startsWith(body)).toBe(true);
    expect(result.indexOf(HANDOFF_FOOTER)).toBeGreaterThan(0);
  });
});
