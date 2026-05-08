import type {
  ParseError,
  ParseResult,
  Preamble,
  Task,
  TaskGroup,
  TaskId,
} from './types.js';

/**
 * Parse a BUILD.md document per the operator-arbitrated spec
 * (`~/Downloads/BUILD-md-spec.md`; spec-in-repo deferred per Q-MBT28-6).
 *
 * Pure function — no I/O, no side effects, no globals.
 *
 * Implementation lands across WB2-WB8:
 *   WB2 — §3.1 preamble parsing
 *   WB3 — §3.2 task section extraction (THIS WB)
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

  const sectionScan = scanSections(lines, preamble.nextIndex);
  const taskBuild = buildTasksAndGroups(sectionScan.sections);

  const allErrors: ParseError[] = [
    ...preamble.errors,
    ...sectionScan.errors,
    ...taskBuild.errors,
  ];
  if (allErrors.length > 0) {
    return { ok: false, errors: allErrors };
  }

  return {
    ok: true,
    dag: {
      preamble: preamble.preamble,
      tasks: taskBuild.tasks,
      groups: taskBuild.groups,
      edges: [], // WB4: §3.3 dependsOn + §3.4 ref resolution + edge expansion.
    },
  };
}

// ---------------------------------------------------------------------------
// Shared regexes.
// ---------------------------------------------------------------------------

const FIELD_LINE = /^\*\*([^*:]+):\*\*\s*(.*)$/;
const H1 = /^#\s+/;
const H2 = /^##\s+/;
const H3 = /^###\s+/;
/** `## §N — Title` or `## §N.M — Title`. Permissive on dash char (—, –, -). */
const TASK_HEADING_H2 = /^##\s+§([0-9]+(?:\.[0-9]+)?)\s+[—–-]\s+(.+)$/;
/** `### §N — Title` or `### §N.M — Title`. */
const TASK_HEADING_H3 = /^###\s+§([0-9]+(?:\.[0-9]+)?)\s+[—–-]\s+(.+)$/;

// ---------------------------------------------------------------------------
// §3.1 preamble parsing (WB2).
// ---------------------------------------------------------------------------

const REQUIRED_PREAMBLE_FIELDS = ['Repo', 'Plan rev'] as const;
const OPTIONAL_PREAMBLE_FIELDS = ['Operator', 'Conductor profile'] as const;
const PREAMBLE_FIELDS: readonly string[] = [
  ...REQUIRED_PREAMBLE_FIELDS,
  ...OPTIONAL_PREAMBLE_FIELDS,
];

type PreambleParseOk = {
  ok: true;
  preamble: Preamble;
  errors: ParseError[];
  /** 0-based index of the first line AFTER the preamble block. */
  nextIndex: number;
};
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

  return { ok: true, preamble, errors, nextIndex: cursor };
}

// ---------------------------------------------------------------------------
// §3.2 task section parsing (WB3).
// ---------------------------------------------------------------------------

interface SectionRecord {
  id: TaskId;
  title: string;
  sourceLine: number;
  level: 'h2' | 'h3';
  /** Raw lines between this heading and the next H1/H2/H3 boundary, exclusive of the headings. */
  bodyLines: string[];
  /** For H3 sections, the id of the enclosing H2 (or undefined if H3 has no H2 parent). */
  parentH2Id?: TaskId;
}

interface SectionScanResult {
  sections: SectionRecord[];
  errors: ParseError[];
}

function scanSections(lines: string[], startIndex: number): SectionScanResult {
  const sections: SectionRecord[] = [];
  const errors: ParseError[] = [];
  let currentH2: SectionRecord | null = null;
  let currentSection: SectionRecord | null = null;

  const flushCurrent = () => {
    if (currentSection) {
      sections.push(currentSection);
      currentSection = null;
    }
  };

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i]!;
    if (H3.test(line)) {
      flushCurrent();
      const heading = parseTaskHeading(line, i + 1, 'h3');
      if (!heading.ok) {
        errors.push(heading.error);
        continue;
      }
      currentSection = {
        id: heading.id,
        title: heading.title,
        sourceLine: i + 1,
        level: 'h3',
        bodyLines: [],
      };
      if (currentH2) currentSection.parentH2Id = currentH2.id;
      continue;
    }
    if (H2.test(line)) {
      flushCurrent();
      const heading = parseTaskHeading(line, i + 1, 'h2');
      if (!heading.ok) {
        errors.push(heading.error);
        currentH2 = null;
        continue;
      }
      currentSection = {
        id: heading.id,
        title: heading.title,
        sourceLine: i + 1,
        level: 'h2',
        bodyLines: [],
      };
      currentH2 = currentSection;
      continue;
    }
    if (H1.test(line) && !H2.test(line)) {
      // H1 = meta-block per spec §3.5 (or stale `# BUILD` re-encounter).
      // Resets H2 context; subsequent H3s without an H2 are treated as orphan-parent.
      flushCurrent();
      currentH2 = null;
      continue;
    }
    if (currentSection) {
      currentSection.bodyLines.push(line);
    }
  }
  flushCurrent();
  return { sections, errors };
}

interface HeadingParseOk {
  ok: true;
  id: TaskId;
  title: string;
}
interface HeadingParseFail {
  ok: false;
  error: ParseError;
}

function parseTaskHeading(
  line: string,
  sourceLine: number,
  level: 'h2' | 'h3',
): HeadingParseOk | HeadingParseFail {
  const re = level === 'h2' ? TASK_HEADING_H2 : TASK_HEADING_H3;
  const m = line.match(re);
  if (!m) {
    const expectedShape = level === 'h2' ? '`## §N — Title`' : '`### §N.M — Title`';
    return {
      ok: false,
      error: {
        code: 'task.malformed-heading',
        message: `Section heading does not match ${expectedShape} (spec §3.2)`,
        line: sourceLine,
        details: { rawHeading: line.trim() },
      },
    };
  }
  return { ok: true, id: m[1]!, title: m[2]!.trim() };
}

interface TaskBuildResult {
  tasks: Task[];
  groups: TaskGroup[];
  errors: ParseError[];
}

function buildTasksAndGroups(sections: SectionRecord[]): TaskBuildResult {
  const tasks: Task[] = [];
  const groups: TaskGroup[] = [];
  const errors: ParseError[] = [];
  const taskIdToFirstLine = new Map<TaskId, number>();

  // Per spec §3.2, an H2 is a task UNLESS it has H3 children — in which case
  // the H2 is a "group" (informational, not a task) and each H3 is a task.
  const h2WithH3Children = new Set<TaskId>();
  for (const s of sections) {
    if (s.level === 'h3' && s.parentH2Id !== undefined) {
      h2WithH3Children.add(s.parentH2Id);
    }
  }

  for (const section of sections) {
    if (section.level === 'h2' && h2WithH3Children.has(section.id)) {
      // Group: collect child H3 ids in document order.
      const childIds = sections
        .filter((s) => s.level === 'h3' && s.parentH2Id === section.id)
        .map((s) => s.id);
      groups.push({
        id: section.id,
        title: section.title,
        taskIds: childIds,
        sourceLine: section.sourceLine,
      });
      // Q-MBT28-1B ack=(a): H2 with body fields AND H3 children is malformed.
      const hasBodyFields = section.bodyLines.some((l) => FIELD_LINE.test(l));
      if (hasBodyFields) {
        errors.push({
          code: 'task.malformed-heading',
          message: `H2 §${section.id} has both body fields and H3 subsections — must be either a task (no H3 children) or a group (no body fields)`,
          line: section.sourceLine,
          details: { rawHeading: `## §${section.id} — ${section.title}` },
        });
      }
      continue;
    }

    // Task: H2 without H3 children, or any H3.
    if (taskIdToFirstLine.has(section.id)) {
      errors.push({
        code: 'task.id-conflict',
        message: `Duplicate task id §${section.id}`,
        line: section.sourceLine,
        details: {
          taskId: section.id,
          firstSourceLine: taskIdToFirstLine.get(section.id)!,
        },
      });
      continue;
    }
    taskIdToFirstLine.set(section.id, section.sourceLine);
    tasks.push({
      id: section.id,
      title: section.title,
      goal: '', // WB4
      branch: '', // WB4
      dependsOn: [], // WB4
      acceptance: [], // WB4
      sourceLine: section.sourceLine,
    });
  }

  return { tasks, groups, errors };
}
