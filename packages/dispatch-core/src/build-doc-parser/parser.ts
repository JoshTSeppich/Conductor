import type { ParseError, ParseResult, Preamble } from './types.js';

/**
 * Parse a BUILD.md document per the operator-arbitrated spec
 * (`~/Downloads/BUILD-md-spec.md`; spec-in-repo deferred per Q-MBT28-6).
 *
 * Pure function — no I/O, no side effects, no globals.
 *
 * Implementation lands across WB2-WB8:
 *   WB2 — §3.1 preamble parsing (THIS WB)
 *   WB3 — §3.2 task section extraction
 *   WB4 — §3.3 fields + §3.4 ref resolution + DAG construction
 *   WB5 — cycle detection
 *   WB6 — orphan + duplicate-branch + missing-preamble polish
 *   WB7 — error-surface polish
 *   WB8 — coverage closure
 */
export function parseBuildDoc(text: string): ParseResult {
  const lines = text.split(/\r?\n/);
  const preamble = parsePreamble(lines);
  if (!preamble.ok) {
    return { ok: false, errors: preamble.errors };
  }

  // Task parsing lands in WB3+. Until then, return ok=true with an empty
  // task list so probes that exercise preamble can verify it independently.
  return {
    ok: true,
    dag: {
      preamble: preamble.preamble,
      tasks: [],
      groups: [],
      edges: [],
    },
  };
}

// ---------------------------------------------------------------------------
// §3.1 preamble parsing (WB2).
// ---------------------------------------------------------------------------

const REQUIRED_PREAMBLE_FIELDS = ['Repo', 'Plan rev'] as const;
const OPTIONAL_PREAMBLE_FIELDS = ['Operator', 'Conductor profile'] as const;
const PREAMBLE_FIELDS: readonly string[] = [
  ...REQUIRED_PREAMBLE_FIELDS,
  ...OPTIONAL_PREAMBLE_FIELDS,
];

const FIELD_LINE = /^\*\*([^*:]+):\*\*\s*(.*)$/;
const H1 = /^#\s+/;
const H2 = /^##\s+/;

type PreambleParseOk = { ok: true; preamble: Preamble; errors: ParseError[] };
type PreambleParseFail = { ok: false; errors: ParseError[] };

function parsePreamble(lines: string[]): PreambleParseOk | PreambleParseFail {
  // Locate the first H1; spec §3.1 requires it to be `# BUILD`.
  let h1Index = -1;
  for (let i = 0; i < lines.length; i++) {
    if (H1.test(lines[i]!) && !H2.test(lines[i]!)) {
      h1Index = i;
      break;
    }
  }
  if (h1Index === -1) {
    return {
      ok: false,
      errors: [
        {
          code: 'preamble.missing',
          message: 'Document has no `# BUILD` header (spec §3.1)',
          line: 1,
        },
      ],
    };
  }
  const h1Title = lines[h1Index]!.replace(H1, '').trim();
  if (h1Title !== 'BUILD') {
    return {
      ok: false,
      errors: [
        {
          code: 'preamble.missing',
          message: `First H1 must be \`# BUILD\` per spec §3.1; got \`# ${h1Title}\``,
          line: h1Index + 1,
        },
      ],
    };
  }

  // Scan forward from the H1 collecting `**Field:** value` lines until the
  // next H1 or H2 heading.
  const collected = new Map<string, { value: string; line: number }>();
  const errors: ParseError[] = [];
  let cursor = h1Index + 1;
  for (; cursor < lines.length; cursor++) {
    const line = lines[cursor]!;
    if (H2.test(line) || (H1.test(line) && !H2.test(line))) break;
    const match = line.match(FIELD_LINE);
    if (!match) continue;
    const fieldName = match[1]!.trim();
    const rawValue = match[2]!.trim();
    if (!PREAMBLE_FIELDS.includes(fieldName)) {
      // Q-MBT28-9 ack=(a) strict: unknown fields are malformed.
      errors.push({
        code: 'preamble.field-malformed',
        message: `Unknown preamble field \`${fieldName}\` (spec §3.1 fields: ${PREAMBLE_FIELDS.join(', ')})`,
        line: cursor + 1,
        details: { fieldName, rawValue },
      });
      continue;
    }
    if (rawValue === '') {
      errors.push({
        code: 'preamble.field-malformed',
        message: `Preamble field \`${fieldName}\` has empty value`,
        line: cursor + 1,
        details: { fieldName, rawValue },
      });
      continue;
    }
    if (collected.has(fieldName)) {
      errors.push({
        code: 'preamble.field-malformed',
        message: `Preamble field \`${fieldName}\` appears more than once`,
        line: cursor + 1,
        details: { fieldName, rawValue },
      });
      continue;
    }
    collected.set(fieldName, { value: rawValue, line: cursor + 1 });
  }

  for (const required of REQUIRED_PREAMBLE_FIELDS) {
    if (!collected.has(required)) {
      errors.push({
        code: 'preamble.field-missing',
        message: `Preamble missing required field \`${required}\` (spec §3.1)`,
        line: h1Index + 1,
        details: { fieldName: required },
      });
    }
  }

  if (errors.some((e) => e.code === 'preamble.field-missing')) {
    return { ok: false, errors };
  }

  const preamble: Preamble = {
    repo: collected.get('Repo')!.value,
    planRev: collected.get('Plan rev')!.value,
  };
  if (collected.has('Operator')) preamble.operator = collected.get('Operator')!.value;
  if (collected.has('Conductor profile')) preamble.conductorProfile = collected.get('Conductor profile')!.value;

  return { ok: true, preamble, errors };
}
